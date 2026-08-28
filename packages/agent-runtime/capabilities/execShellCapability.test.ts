import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import {
  buildExecShellToolDefinition,
  normalizeExecShellInput,
  invokeCapability,
} from "./index";
import { execShellCapability } from "./execShellCapability";
import {
  buildWorkspaceToolDefinition,
} from "../localWorkspaceToolDefs";
import {
  createLocalWorkspaceToolExecutors,
} from "../localWorkspaceTools";
import {
  executeLocalToolWithPolicy,
} from "../localToolPolicy";
import {
  createResponsesToolAccumulator,
  applyResponsesToolEvent,
  finalizeResponsesToolCalls,
} from "../responsesToolCallAccumulator";
import { isDestructiveShellCommand } from "../shellCommandPolicy";

describe("execShellCapability", () => {
  // Test 1 — Native schema
  describe("Test 1 — Native schema", () => {
    it("exports canonical execShell tool definition matching buildWorkspaceToolDefinition", () => {
      const capabilityDef = execShellCapability.getToolDefinition();
      const workspaceDef = buildWorkspaceToolDefinition("execShell")!;

      expect(capabilityDef).toEqual(workspaceDef);

      const fn = (capabilityDef as any).function;
      expect(fn.name).toBe("execShell");
      expect(fn.description).toContain("Execute a shell command from the workspace root.");
      expect(fn.parameters.type).toBe("object");
      expect(fn.parameters.properties.command).toBeDefined();
      expect(fn.parameters.properties.command.type).toBe("string");
      expect(fn.parameters.properties.cmd).toBeDefined();
      expect(fn.parameters.properties.cmd.type).toBe("string");
    });

    it("allows custom toolName in buildExecShellToolDefinition", () => {
      const customDef = buildExecShellToolDefinition("customShell");
      expect((customDef as any).function.name).toBe("customShell");
    });
  });

  // Test 2 — command normalization
  describe("Test 2 — command normalization", () => {
    it("normalizes { command: 'echo hello' } object", () => {
      const normalized = normalizeExecShellInput({ command: "echo hello" });
      expect(normalized.command).toBe("echo hello");
    });

    it("normalizes JSON string arguments '{\"command\": \"echo hello\"}'", () => {
      const normalized = normalizeExecShellInput(JSON.stringify({ command: "echo hello" }));
      expect(normalized.command).toBe("echo hello");
    });

    it("normalizes bare command string 'echo hello'", () => {
      const normalized = normalizeExecShellInput("echo hello");
      expect(normalized.command).toBe("echo hello");
    });
  });

  // Test 3 — cmd compatibility
  describe("Test 3 — cmd compatibility", () => {
    it("normalizes { cmd: 'echo hello' } identically to { command: 'echo hello' }", () => {
      const normalizedFromCmd = normalizeExecShellInput({ cmd: "echo hello" });
      const normalizedFromCommand = normalizeExecShellInput({ command: "echo hello" });
      expect(normalizedFromCmd.command).toBe(normalizedFromCommand.command);
      expect(normalizedFromCmd.command).toBe("echo hello");
    });

    it("normalizes JSON string arguments '{\"cmd\": \"echo hello\"}'", () => {
      const normalized = normalizeExecShellInput(JSON.stringify({ cmd: "echo hello" }));
      expect(normalized.command).toBe("echo hello");
    });
  });

  // Test 4 — missing command
  describe("Test 4 — missing command validation", () => {
    it("throws explicit validation error on empty object", () => {
      expect(() => normalizeExecShellInput({})).toThrow("execShell requires a non-empty command.");
    });

    it("throws explicit validation error on empty string", () => {
      expect(() => normalizeExecShellInput("")).toThrow("execShell requires a non-empty command.");
      expect(() => normalizeExecShellInput("   ")).toThrow("execShell requires a non-empty command.");
    });

    it("throws explicit validation error on empty command or cmd values", () => {
      expect(() => normalizeExecShellInput({ command: "" })).toThrow("execShell requires a non-empty command.");
      expect(() => normalizeExecShellInput({ command: "   " })).toThrow("execShell requires a non-empty command.");
      expect(() => normalizeExecShellInput({ cmd: "" })).toThrow("execShell requires a non-empty command.");
      expect(() => normalizeExecShellInput({ cmd: "   " })).toThrow("execShell requires a non-empty command.");
    });

    it("throws explicit validation error on null or undefined", () => {
      expect(() => normalizeExecShellInput(null)).toThrow("execShell requires a non-empty command.");
      expect(() => normalizeExecShellInput(undefined)).toThrow("execShell requires a non-empty command.");
    });
  });

  // Test 5 & Subprocess Execution Parity
  describe("Test 5 — Subprocess Execution Parity (subprocess probe)", () => {
    it("executes subprocess probe validating end-to-end native, SDK, and parity semantics", () => {
      const proc = Bun.spawnSync(["bun", "packages/agent-runtime/capabilities/execShellCapability.subprocessProbe.ts"], {
        stdout: "inherit",
        stderr: "inherit",
      });
      expect(proc.exitCode).toBe(0);
    });
  });

  // Test 6 — Responses accumulation regression
  describe("Test 6 — Responses tool-call accumulation regression", () => {
    it("accumulates streaming execShell tool calls with object arguments", () => {
      const accumulator = createResponsesToolAccumulator();

      applyResponsesToolEvent(accumulator, {
        item_id: "call_exec_1",
        item: {
          id: "call_exec_1",
          name: "execShell",
          arguments: { command: "git status" },
        },
      });

      const finalized = finalizeResponsesToolCalls(accumulator);
      expect(finalized.length).toBe(1);
      expect(finalized[0].function.name).toBe("execShell");
      expect(finalized[0].function.arguments).toBe(JSON.stringify({ command: "git status" }));
    });

    it("accumulates streaming execShell tool calls with argument delta chunks", () => {
      const accumulator = createResponsesToolAccumulator();

      applyResponsesToolEvent(accumulator, {
        item_id: "call_exec_2",
        item: {
          id: "call_exec_2",
          name: "execShell",
        },
      });

      applyResponsesToolEvent(accumulator, {
        item_id: "call_exec_2",
        delta: '{"command": "',
      });
      applyResponsesToolEvent(accumulator, {
        item_id: "call_exec_2",
        delta: 'pwd && ls"}',
      });

      const finalized = finalizeResponsesToolCalls(accumulator);
      expect(finalized.length).toBe(1);
      expect(finalized[0].function.name).toBe("execShell");
      expect(finalized[0].function.arguments).toBe('{"command": "pwd && ls"}');

      // Verify normalization of the accumulated result
      const parsed = JSON.parse(finalized[0].function.arguments);
      const normalized = normalizeExecShellInput(parsed);
      expect(normalized.command).toBe("pwd && ls");
    });
  });

  // Test 7 — Policy regression
  describe("Test 7 — Policy regression", () => {
    it("blocks workspace shell escape attempts when restrictToWorkspace is true", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        const result = await execShellCapability.invoke(
          {
            workspaceRoot: root,
            restrictToWorkspace: true,
          },
          { command: "cat ../../../etc/passwd" },
        );

        expect(result.content).toContain("workspace_shell_escape_blocked");
        expect(result.metadata?.exitCode).toBe(126);
        expect(result.metadata?.workspaceShellEscapeBlocked).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("blocks interactive gh auth login commands", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        const result = await execShellCapability.invoke(
          { workspaceRoot: root },
          { command: "gh auth login" },
        );

        expect(result.content).toContain("action_gate: handoff");
        expect(result.content).toContain("Run this in the current TUI terminal");
        expect(result.metadata?.exitCode).toBe(130);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("preserves destructive shell command detection for localToolPolicy across all argument shapes", async () => {
      expect(isDestructiveShellCommand({ command: "rm -rf /" })).toBe(true);
      expect(isDestructiveShellCommand({ command: "git reset --hard HEAD~1" })).toBe(true);
      expect(isDestructiveShellCommand({ command: "echo harmless" })).toBe(false);

      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

        // 1. JSON command object
        await expect(
          executeLocalToolWithPolicy({
            env: {},
            agentToolNames: ["execShell"],
            call: {
              id: "call-dest-1",
              name: "execShell",
              arguments: JSON.stringify({ command: "rm -rf ./*" }),
            },
            executors,
            enableDestructiveShellGuard: true,
            blockDestructiveWithoutConfirmation: true,
            confirmed: false,
          }),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });

        // 2. Raw string argument
        await expect(
          executeLocalToolWithPolicy({
            env: {},
            agentToolNames: ["execShell"],
            call: {
              id: "call-dest-2",
              name: "execShell",
              arguments: "rm -rf /tmp/test",
            },
            executors,
            enableDestructiveShellGuard: true,
            blockDestructiveWithoutConfirmation: true,
            confirmed: false,
          }),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });

        // 3. cmd alias object
        await expect(
          executeLocalToolWithPolicy({
            env: {},
            agentToolNames: ["execShell"],
            call: {
              id: "call-dest-3",
              name: "execShell",
              arguments: JSON.stringify({ cmd: "rm -rf ./*" }),
            },
            executors,
            enableDestructiveShellGuard: true,
            blockDestructiveWithoutConfirmation: true,
            confirmed: false,
          }),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("triggers onInvoke hook for capability before execution", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      const auditTrail: Array<{ capability: string; input: unknown }> = [];
      try {
        // Test invokeCapability standalone trigger
        await invokeCapability(
          "execShell",
          { command: "echo 'audited standalone invoke'" },
          {
            workspaceRoot: root,
            onInvoke: (capability, input) => {
              auditTrail.push({ capability, input });
            },
          },
        );
        expect(auditTrail.length).toBe(1);
        expect(auditTrail[0].capability).toBe("execShell");
        expect((auditTrail[0].input as any).command).toBe("echo 'audited standalone invoke'");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });

  // Test 8 — Unified Capability Invocation & Destructive Policy Parity
  describe("Test 8 — Unified Capability Invocation & Destructive Policy Parity", () => {
    it("proves standalone invokeCapability cannot bypass destructive policy when confirmation is unavailable", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        await expect(
          invokeCapability(
            "execShell",
            { command: "rm -rf ./some-dir" },
            {
              workspaceRoot: root,
              enableDestructiveShellGuard: true,
              blockDestructiveWithoutConfirmation: true,
              confirmed: false,
            },
          ),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
          policy: {
            capability: "destructive_action",
            target: "shell_command",
          },
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("ensures audit hook (onInvoke) is NOT called when destructive policy rejects", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      let auditCalled = false;
      try {
        await expect(
          invokeCapability(
            "execShell",
            { command: "rm -rf ./some-dir" },
            {
              workspaceRoot: root,
              enableDestructiveShellGuard: true,
              blockDestructiveWithoutConfirmation: true,
              onInvoke: () => {
                auditCalled = true;
              },
            },
          ),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });

        expect(auditCalled).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("prompts confirmDestructiveAction callback and blocks when user declines (Native, Standalone)", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
        let nativeConfirmCalls = 0;
        let standaloneConfirmCalls = 0;

        // 1. Native invocation
        await expect(
          executeLocalToolWithPolicy({
            env: {},
            agentToolNames: ["execShell"],
            call: {
              id: "call-native-declined",
              name: "execShell",
              arguments: JSON.stringify({ command: "rm -rf ./tmp" }),
            },
            executors,
            enableDestructiveShellGuard: true,
            confirmDestructiveAction: async () => {
              nativeConfirmCalls += 1;
              return false;
            },
          }),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });
        expect(nativeConfirmCalls).toBe(1);

        // 2. Standalone invokeCapability
        await expect(
          invokeCapability(
            "execShell",
            { command: "rm -rf ./tmp" },
            {
              workspaceRoot: root,
              enableDestructiveShellGuard: true,
              confirmDestructiveAction: async () => {
                standaloneConfirmCalls += 1;
                return false;
              },
            },
          ),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });
        expect(standaloneConfirmCalls).toBe(1);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("allows execution when confirmDestructiveAction approves (Native, Standalone)", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
        let nativeConfirmCalls = 0;
        let standaloneConfirmCalls = 0;

        // 1. Native invocation
        const nativeResult = await executeLocalToolWithPolicy({
          env: {},
          agentToolNames: ["execShell"],
          call: {
            id: "call-native-approved",
            name: "execShell",
            arguments: JSON.stringify({ command: "echo 'approved native'" }),
          },
          executors,
          enableDestructiveShellGuard: true,
          confirmDestructiveAction: async () => {
            nativeConfirmCalls += 1;
            return true;
          },
        });
        expect(nativeResult.content).toContain("approved native");

        // 2. Standalone invokeCapability
        const standaloneResult = await invokeCapability(
          "execShell",
          { command: "rm -rf ./nonexistent-approve-dir" },
          {
            workspaceRoot: root,
            enableDestructiveShellGuard: true,
            confirmDestructiveAction: async () => {
              standaloneConfirmCalls += 1;
              return true;
            },
          },
        );
        expect(standaloneResult.metadata?.exitCode).toBe(0);
        expect(standaloneConfirmCalls).toBe(1);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("evaluates compound / piped destructive commands equivalently across Native and Standalone", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
        const destructiveArgs = { command: "echo ok && rm -rf ./data" };

        // 1. Native
        await expect(
          executeLocalToolWithPolicy({
            env: {},
            agentToolNames: ["execShell"],
            call: {
              id: "call-compound",
              name: "execShell",
              arguments: JSON.stringify(destructiveArgs),
            },
            executors,
            enableDestructiveShellGuard: true,
            blockDestructiveWithoutConfirmation: true,
            confirmed: false,
          }),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });

        // 2. Standalone
        await expect(
          invokeCapability("execShell", destructiveArgs, {
            workspaceRoot: root,
            enableDestructiveShellGuard: true,
            blockDestructiveWithoutConfirmation: true,
            confirmed: false,
          }),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("evaluates env assignments before commands (Native, Standalone)", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
        const destructiveArgs = { command: "FOO=bar rm -rf ./data" };

        // 1. Native
        await expect(
          executeLocalToolWithPolicy({
            env: {},
            agentToolNames: ["execShell"],
            call: {
              id: "call-env-cmd",
              name: "execShell",
              arguments: JSON.stringify(destructiveArgs),
            },
            executors,
            enableDestructiveShellGuard: true,
            blockDestructiveWithoutConfirmation: true,
            confirmed: false,
          }),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });

        // 2. Standalone
        await expect(
          invokeCapability("execShell", destructiveArgs, {
            workspaceRoot: root,
            enableDestructiveShellGuard: true,
            blockDestructiveWithoutConfirmation: true,
            confirmed: false,
          }),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("ensures audit ordering: onInvoke called once on approve, not called on reject", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        const auditLog: string[] = [];
        const destructiveCmd = "rm -rf ./nonexistent-target";

        // Approve case
        const result = await invokeCapability(
          "execShell",
          { command: destructiveCmd },
          {
            workspaceRoot: root,
            enableDestructiveShellGuard: true,
            confirmDestructiveAction: async () => true,
            onInvoke: (cap) => {
              auditLog.push(`approved:${cap}`);
            },
          },
        );
        expect(result.metadata?.exitCode).toBe(0);
        expect(auditLog).toEqual(["approved:execShell"]);

        // Reject case
        await expect(
          invokeCapability(
            "execShell",
            { command: destructiveCmd },
            {
              workspaceRoot: root,
              enableDestructiveShellGuard: true,
              confirmDestructiveAction: async () => false,
              onInvoke: (cap) => {
                auditLog.push(`rejected:${cap}`);
              },
            },
          ),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });
        expect(auditLog).toEqual(["approved:execShell"]);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("preserves host eligibility separation (localToolPolicy blocks before capability invocation)", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        let confirmCalled = false;
        let onInvokeCalled = false;
        const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

        // Agent does NOT declare execShell in restricted mode
        await expect(
          executeLocalToolWithPolicy({
            env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
            agentToolNames: ["readFile"], // execShell NOT declared
            call: {
              id: "call-unauthorized",
              name: "execShell",
              arguments: JSON.stringify({ command: "rm -rf ./tmp" }),
            },
            executors,
            enableDestructiveShellGuard: true,
            confirmDestructiveAction: async () => {
              confirmCalled = true;
              return true;
            },
          }),
        ).rejects.toThrow("execShell is not enabled for local runtime runs");

        expect(confirmCalled).toBe(false);
        expect(onInvokeCalled).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("verifies no production callers bypass invocation policy with raw capability.invoke", async () => {
      const repoRoot = resolve(__dirname, "../../..");
      const { readdirSync, readFileSync, statSync } = await import("node:fs");

      function findPatternInDir(dir: string, pattern: string): string[] {
        const results: string[] = [];
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist") {
              results.push(...findPatternInDir(fullPath, pattern));
            }
          } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".js"))) {
            const content = readFileSync(fullPath, "utf8");
            if (content.includes(pattern)) {
              results.push(fullPath);
            }
          }
        }
        return results;
      }

      const matchingFiles = findPatternInDir(join(repoRoot, "packages"), "execShellCapability.invoke");
      expect(matchingFiles.length).toBeGreaterThan(0);

      // Allowed callers: capabilitySdk.ts (the internal invoke pipeline), tests, and internal probe
      for (const file of matchingFiles) {
        const isAllowed =
          file.includes("execShellCapability.test.ts") ||
          file.includes("execShellCapability.subprocessProbe.ts") ||
          file.includes("capabilitySdk.ts") ||
          file.includes("execShellCapability.ts");
        expect(isAllowed).toBe(true);
      }
    });

    it("evaluates destructive commands provided via stdin input payload", async () => {
      const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-"));
      try {
        await expect(
          invokeCapability(
            "execShell",
            { command: "bash", input: "rm -rf ./tmp" },
            {
              workspaceRoot: root,
              enableDestructiveShellGuard: true,
              blockDestructiveWithoutConfirmation: true,
              confirmed: false,
            },
          ),
        ).rejects.toMatchObject({
          code: "destructive_action_requires_confirmation",
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
});
