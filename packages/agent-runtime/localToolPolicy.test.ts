import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  executeLocalToolWithPolicy,
  resolveLocalToolPolicy,
} from "./localToolPolicy";
import { createLocalWorkspaceToolExecutors } from "./localWorkspaceTools";

describe("local tool policy", () => {
  test("rejects internal workspace primitives from generic policy", () => {
    for (const name of ["internalSearchWorkspace", "internalListWorkspaceEntries"]) {
      const decision = resolveLocalToolPolicy({
        env: {},
        agentToolNames: [],
        toolName: name,
      });
      expect(decision.allowed).toBe(false);
    }
  });

  test("allows execShell when enabled for local runtime", () => {
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["execShell"],
      toolName: "execShell",
    })).toEqual({ allowed: true, toolName: "execShell" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted", NOLO_LOCAL_ALLOWED_TOOLS: "execShell" },
      agentToolNames: ["execShell"],
      toolName: "execShell",
    })).toEqual({ allowed: true, toolName: "execShell" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
      agentToolNames: [],
      toolName: "execShell",
    })).toMatchObject({ allowed: false, toolName: "execShell" });
  });

  test("allows declared local tools by default so agents can work first", () => {
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["globFiles"],
      toolName: "globFiles",
    })).toEqual({ allowed: true, toolName: "globFiles" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
      agentToolNames: ["globFiles"],
      toolName: "globFiles",
    })).toEqual({ allowed: true, toolName: "globFiles" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
      agentToolNames: ["someFutureTool"],
      toolName: "someFutureTool",
    })).toMatchObject({
      allowed: false,
    });
  });

  test("blocks dangerous self-mutating tools in local runtimes", () => {
    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_ALLOWED_TOOLS: "updateSelf" },
      agentToolNames: ["updateSelf"],
      toolName: "updateSelf",
    })).toEqual({
      allowed: false,
      toolName: "updateSelf",
      reason: "updateSelf is blocked by the local runtime safety policy.",
    });
  });

  test("requires env allowlist and agent declaration for ordinary tools", () => {
    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_ALLOWED_TOOLS: "readFile" },
      agentToolNames: ["readFile"],
      toolName: "readFile",
    })).toEqual({ allowed: true, toolName: "readFile" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_ALLOWED_TOOLS: "readFile" },
      agentToolNames: [],
      toolName: "readFile",
    })).toMatchObject({ allowed: false });
  });

  test("allows controlled workspace file tools when the agent declares them", () => {
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["writeFile"],
      toolName: "writeFile",
    })).toEqual({ allowed: true, toolName: "writeFile" });

    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["editFile"],
      toolName: "editFile",
    })).toEqual({ allowed: true, toolName: "editFile" });

    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: [],
      toolName: "writeFile",
    })).toMatchObject({ allowed: false });
  });

  test("allows sub-agent scheduling tools by default so local sub-agent tasks work out of the box", () => {
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["startAgentRun"],
      toolName: "startAgentRun",
    })).toEqual({ allowed: true, toolName: "startAgentRun" });
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["controlAgentRun"],
      toolName: "controlAgentRun",
    })).toEqual({ allowed: true, toolName: "controlAgentRun" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
      agentToolNames: ["startAgentRun"],
      toolName: "startAgentRun",
    })).toEqual({ allowed: true, toolName: "startAgentRun" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
      agentToolNames: ["someFutureTool"],
      toolName: "someFutureTool",
    })).toMatchObject({ allowed: false });

    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: [],
      toolName: "startAgentRun",
    })).toMatchObject({ allowed: false });
  });

  test("blocks removed semantic git workflow tools even when declared", () => {
    for (const toolName of ["gitCreateBranch", "gitAdd", "gitCommit", "commitWorkspace"]) {
      expect(resolveLocalToolPolicy({
        env: {},
        agentToolNames: [toolName],
        toolName,
      })).toMatchObject({
        allowed: false,
        toolName,
      });
    }
  });

  test("executes registered tools only after policy allows them", async () => {
    const result = await executeLocalToolWithPolicy({
      env: { NOLO_LOCAL_ALLOWED_TOOLS: "readFile" },
      agentToolNames: ["readFile"],
      call: { id: "call-1", name: "readFile", arguments: "{\"path\":\"README.md\"}" },
      executors: {
        readFile: async (call) => ({ content: `read:${call.arguments}` }),
      },
    });

    expect(result.content).toContain("README.md");
  });

  test("canonicalizes local runtime tool aliases before policy checks", () => {
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["execShell"],
      toolName: "runCommand",
    })).toEqual({ allowed: true, toolName: "execShell" });
  });

  test("executes canonical local tool executors for aliased tool calls", async () => {
    const result = await executeLocalToolWithPolicy({
      env: {},
      agentToolNames: ["execShell"],
      call: { id: "call-1", name: "runCommand", arguments: "{\"cmd\":\"pwd\"}" },
      executors: {
        execShell: async (call) => ({
          content: `${call.name}:${call.arguments}`,
        }),
      },
    });

    expect(result.content).toContain("execShell");
    expect(result.content).toContain("\"cmd\":\"pwd\"");
  });

  test("forwards executor options including confirmation and guard flags without evaluating destructive policy", async () => {
    let receivedOpts: Record<string, unknown> | undefined;
    const confirmCallback = async () => true;
    const abortCtrl = new AbortController();

    const result = await executeLocalToolWithPolicy({
      env: {},
      agentToolNames: ["execShell"],
      call: { id: "call-opt", name: "execShell", arguments: "{\"command\":\"rm -rf /\"}" },
      executors: {
        execShell: async (_call, opts) => {
          receivedOpts = opts;
          return { content: "delegated to executor" };
        },
      },
      confirmed: false,
      enableDestructiveShellGuard: true,
      confirmDestructiveAction: confirmCallback,
      blockDestructiveWithoutConfirmation: true,
      abortSignal: abortCtrl.signal,
      detachMs: 5000,
    });

    expect(result.content).toBe("delegated to executor");
    expect(receivedOpts).toEqual({
      abortSignal: abortCtrl.signal,
      detachMs: 5000,
      confirmed: true,
      enableDestructiveShellGuard: true,
      confirmDestructiveAction: confirmCallback,
      blockDestructiveWithoutConfirmation: true,
    });
  });

  test("runs destructive execShell commands without a confirm callback (no stall path)", async () => {
    const root = mkdtempSync(join(tmpdir(), "nolo-policy-test-"));
    try {
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      const result = await executeLocalToolWithPolicy({
        env: {},
        agentToolNames: ["execShell"],
        call: {
          id: "call-1",
          name: "execShell",
          arguments: "{\"cmd\":\"rm -rf ./tmp\"}",
          userInput: "Keep debugging, but don't delete files.",
        },
        executors,
      });
      expect(result.metadata?.exitCode).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("prompts before destructive execShell when a confirm callback is wired", async () => {
    const root = mkdtempSync(join(tmpdir(), "nolo-policy-test-"));
    try {
      let confirmCalls = 0;
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      const result = await executeLocalToolWithPolicy({
        env: {},
        agentToolNames: ["execShell"],
        call: {
          id: "call-1",
          name: "execShell",
          arguments: "{\"cmd\":\"rm -rf ./tmp\"}",
        },
        executors,
        enableDestructiveShellGuard: true,
        confirmDestructiveAction: async () => {
          confirmCalls += 1;
          return true;
        },
      });
      expect(confirmCalls).toBe(1);
      expect(result.metadata?.exitCode).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("blocks destructive execShell when the confirm callback returns false", async () => {
    const root = mkdtempSync(join(tmpdir(), "nolo-policy-test-"));
    try {
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      await expect(
        executeLocalToolWithPolicy({
          env: {},
          agentToolNames: ["execShell"],
          call: {
            id: "call-1",
            name: "execShell",
            arguments: "{\"cmd\":\"rm -rf ./tmp\"}",
          },
          executors,
          enableDestructiveShellGuard: true,
          confirmDestructiveAction: async () => false,
        }),
      ).rejects.toMatchObject({
        code: "destructive_action_requires_confirmation",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("destructive shell guard bypasses", () => {
  const runWithArgs = async (rawArguments: string, extra: Record<string, unknown> = {}) => {
    const root = mkdtempSync(join(tmpdir(), "nolo-policy-bypass-"));
    try {
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      let executed = false;
      const result = await executeLocalToolWithPolicy({
        env: {},
        agentToolNames: ["execShell"],
        call: { id: "call-1", name: "execShell", arguments: rawArguments, userInput: "别删东西" },
        executors,
        enableDestructiveShellGuard: true,
        ...extra,
      } as any);
      executed = true;
      return { executed, result };
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };

  for (const key of ["cmd", "bash", "runCommand", "execute_command", "terminalCommand"]) {
    test(`treats a destructive command passed as \`${key}\` as destructive`, async () => {
      let asked = false;
      const { executed } = await runWithArgs(
        JSON.stringify({ [key]: "rm -rf ./tmp" }),
        {
          confirmDestructiveAction: async () => {
            asked = true;
            return false;
          },
        },
      ).catch((error: any) => {
        expect(error.code).toBe("destructive_action_requires_confirmation");
        return { executed: false, result: null };
      });
      expect(asked).toBe(true);
      expect(executed).toBe(false);
    });
  }

  test("blocks when the caller declares no confirmation channel means deny", async () => {
    await expect(
      runWithArgs(JSON.stringify({ cmd: "rm -rf ./tmp" }), {
        blockDestructiveWithoutConfirmation: true,
      }),
    ).rejects.toThrow("no confirmation channel");
  });

  test("still runs a harmless command passed under an alias", async () => {
    const { executed } = await runWithArgs(JSON.stringify({ bash: "pwd" }));
    expect(executed).toBe(true);
  });
});
