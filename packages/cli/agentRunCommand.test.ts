// @ts-nocheck — mock-heavy agent run command suite; spawn/fs/runner stubs are incomplete vs production deps.
import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  isBalanceExhaustedError,
  isQuotaExhaustedError,
  parseAgentRunArgs,
  prependSubjectDialogMarker,
  resolveWorkflowReference,
  runAgentRunCommand,
} from "./agentRunCommand";
import { readRunRecord, writeRunRecord } from "./agentRunControl";
import {
  LOCAL_CODEX_AGENT_KEY,
  NOLO_DEFAULT_AGENT_KEY,
  NOLO_FRONTEND_AGENT_KEY,
} from "./agentAliases";
import { CliProviderQuotaError } from "ai/agent/cliExecutor";
import {
  CLI_AUTO_ROUTE_AGENT_KEY,
} from "./client/autoModelRouter";

/** Test-only loose deps so incomplete runner/fs stubs typecheck. */
function runCommand(args: string[], deps: any) {
  return runAgentRunCommand(args, deps);
}

describe("cli agent run command", () => {
  let tempNoloHome: string;
  let originalNoloHome: string | undefined;

  beforeAll(() => {
    originalNoloHome = process.env.NOLO_HOME;
    tempNoloHome = mkdtempSync(join(tmpdir(), "nolo-test-home-"));
    process.env.NOLO_HOME = tempNoloHome;
  });

  afterAll(() => {
    if (originalNoloHome === undefined) {
      delete process.env.NOLO_HOME;
    } else {
      process.env.NOLO_HOME = originalNoloHome;
    }
    try {
      rmSync(tempNoloHome, { recursive: true, force: true });
    } catch {}
  });
  test("parses no-login run shorthand as local Codex in the current workspace", () => {
    expect(parseAgentRunArgs([
      "review this repository",
    ], {
      commandPath: ["run"],
    })).toMatchObject({
      agentKey: LOCAL_CODEX_AGENT_KEY,
      message: "review this repository",
      allowShell: true,
      runtimeMode: "local",
      injectFeatureWorktreeInstruction: false,
    });
  });

  test("parses nolo alias as the default nolo agent", () => {
    expect(parseAgentRunArgs([
      "nolo",
      "帮我总结最近 1 个对话",
      "--no-stream",
    ])?.agentKey).toBe(NOLO_DEFAULT_AGENT_KEY);
  });

  test("defaults fullstack runs to local shell in current cwd", () => {
    expect(parseAgentRunArgs([
      "fullstack",
      "--msg",
      "fix backend tests",
    ])).toMatchObject({
      agentKey: "fullstack",
      message: "fix backend tests",
      allowShell: true,
      runtimeMode: "local",
      injectFeatureWorktreeInstruction: true,
    });
  });


  test("parses explicit local Codex agent to local shell runtime", () => {
    expect(parseAgentRunArgs([
      "local-codex",
      "--msg",
      "review the implementation evidence",
    ])).toMatchObject({
      agentKey: LOCAL_CODEX_AGENT_KEY,
      message: "review the implementation evidence",
      allowShell: true,
      runtimeMode: "local",
      injectFeatureWorktreeInstruction: false,
    });
  });

  test("parses skill references correctly", () => {
    expect(parseAgentRunArgs([
      "frontend-implementer",
      "fix style",
      "--skill",
      "page-123-abc",
      "--skill",
      "docs/skills/test.md",
    ])).toMatchObject({
      agentKey: NOLO_FRONTEND_AGENT_KEY,
      message: "fix style",
      skillRefs: ["page-123-abc", "docs/skills/test.md"],
    });
  });

  test("parses positional agent and message with local runtime flag", () => {
    expect(parseAgentRunArgs([
      "frontend-implementer",
      "fix",
      "the",
      "notification",
      "--local",
      "--continue",
      "dialog-1",
      "--cwd",
      "/repo/project",
      "--trace-tools",
      "--events",
      "jsonl",
    ])).toEqual({
      agentKey: NOLO_FRONTEND_AGENT_KEY,
      message: "fix the notification",
      imageUrls: [],
      allowShell: false,
      runtimeMode: "local",
      continueDialogId: "dialog-1",
      cwd: "/repo/project",
      traceTools: true,
      eventsMode: "jsonl",
      injectFeatureWorktreeInstruction: false,
      background: false,
      noStream: false,
      ephemeral: false,
    });
  });

  test("parses --agent and --msg with server runtime flag", () => {
    expect(parseAgentRunArgs([
      "--agent",
      "agent-pub-test",
      "--msg",
      "hello",
      "--server",
    ])).toEqual({
      agentKey: "agent-pub-test",
      message: "hello",
      imageUrls: [],
      allowShell: false,
      runtimeMode: "server",
      traceTools: false,
      injectFeatureWorktreeInstruction: false,
      background: false,
      noStream: false,
      ephemeral: false,
    });
  });

  test("parses long messages from --msg-file", () => {
    expect(parseAgentRunArgs([
      "--agent",
      "frontend-implementer",
      "--msg-file",
      "/tmp/frontend-task.md",
      "--local",
    ], {
      readTextFile: (path) => `task from ${path}`,
    })).toEqual({
      agentKey: NOLO_FRONTEND_AGENT_KEY,
      message: "task from /tmp/frontend-task.md",
      imageUrls: [],
      allowShell: false,
      runtimeMode: "local",
      traceTools: false,
      background: false,
      noStream: false,
      injectFeatureWorktreeInstruction: false,
      ephemeral: false,
    });
  });

  test("parses repeated image inputs for multimodal runs", () => {
    expect(parseAgentRunArgs([
      "--agent",
      "agent-pub-test",
      "--msg",
      "describe this",
      "--image",
      "https://example.com/a.png",
      "--image-url",
      "data:image/png;base64,QUJD",
    ])).toEqual({
      agentKey: "agent-pub-test",
      message: "describe this",
      imageUrls: ["https://example.com/a.png", "data:image/png;base64,QUJD"],
      allowShell: false,
      traceTools: false,
      injectFeatureWorktreeInstruction: false,
      background: false,
      noStream: false,
      ephemeral: false,
    });
  });

  test("parses CLI persistence flags", () => {
    const parsed = parseAgentRunArgs([
      "agent-pub-test",
      "--msg",
      "hello",
      "--space",
      "space-1",
      "--category",
      "manual-checks",
      "--inherit-from-dialog",
      "dialog-user-1-dialog-2",
      "--bg",
      "--no-stream",
    ]);
    expect(parsed).toMatchObject({
      agentKey: "agent-pub-test",
      message: "hello",
      spaceId: "space-1",
      category: "manual-checks",
      inheritedFromDialogKey: "dialog-user-1-dialog-2",
      parentDialogId: "2",
      background: true,
      noStream: true,
    });
    expect(parsed?.parentWakeOnTerminal).toBeUndefined();
  });

  test("parses --ephemeral / --memory-only as memory-only run (no persistence)", () => {
    expect(parseAgentRunArgs([
      "agent-pub-test",
      "--msg",
      "ping",
      "--local",
      "--ephemeral",
    ])?.ephemeral).toBe(true);
    expect(parseAgentRunArgs([
      "agent-pub-test",
      "--msg",
      "ping",
      "--local",
      "--memory-only",
    ])?.ephemeral).toBe(true);
    expect(parseAgentRunArgs([
      "agent-pub-test",
      "--msg",
      "ping",
      "--local",
    ])?.ephemeral).toBe(false);
  });

  test("parses --parent-dialog as explicit terminal wake intent", () => {
    expect(parseAgentRunArgs([
      "fullstack",
      "--msg",
      "implement the task",
      "--parent-dialog",
      "dialog-user-1-parent-1",
      "--task-row-dbkey",
      "row-user-1-board-task",
    ])).toMatchObject({
      parentDialogId: "1",
      parentWakeOnTerminal: true,
      taskEvidence: {
        rowDbKey: "row-user-1-board-task",
      },
    });
  });

  test("parses --subject-dialog without changing inherited dialog lineage", () => {
    const parsed = parseAgentRunArgs([
      "agent-pub-test",
      "--msg",
      "eval 一下",
      "--inherit-from-dialog",
      "dialog-user-1-parent-dialog",
      "--subject-dialog",
      "01SUBJECTDIALOG",
    ]);

    expect(parsed).toMatchObject({
      agentKey: "agent-pub-test",
      message: "eval 一下",
      inheritedFromDialogKey: "dialog-user-1-parent-dialog",
      parentDialogId: "dialog",
      subjectDialogKey: "01SUBJECTDIALOG",
    });
  });

  test("parses --reference-dialog as an alias for --subject-dialog", () => {
    expect(parseAgentRunArgs([
      "agent-pub-test",
      "--msg",
      "eval 一下",
      "--reference-dialog",
      "dialog-user-1-target-dialog",
    ])?.subjectDialogKey).toBe("dialog-user-1-target-dialog");
  });

  test("parses repeated generic subject refs for evidence-bearing agent runs", () => {
    expect(parseAgentRunArgs([
      "reviewer",
      "--msg",
      "review implementation",
      "--subject-ref",
      "table-row:row-user-board-task:subject",
      "--subject-ref",
      "dialog:dialog-impl:review-target",
      "--subject-ref",
      "external:commit:abc123:commit",
    ])).toMatchObject({
      subjectRefs: [
        { kind: "table-row", id: "row-user-board-task", role: "subject" },
        { kind: "dialog", id: "dialog-impl", role: "review-target" },
        { kind: "external", id: "commit:abc123", role: "commit" },
      ],
    });
  });

  test("parses allowed child agent guard keys for supervised server runs", () => {
    expect(parseAgentRunArgs([
      "nolo",
      "--msg",
      "supervise dispatch",
      "--allowed-child-agent",
      "fullstack",
      "--allowed-child-agent",
      "agent-explicit-child",
    ])).toMatchObject({
      allowedChildAgentKeys: [
        "fullstack",
        "agent-explicit-child",
      ],
    });
  });

  test("parses allowed tool guard names for bounded server runs", () => {
    expect(parseAgentRunArgs([
      "nolo",
      "--msg",
      "supervise dispatch",
      "--allowed-tool",
      "startAgentRun",
      "--allowed-tool",
      " updateTableRow ",
    ])).toMatchObject({
      allowedToolNames: ["startAgentRun", "updateTableRow"],
    });
  });

  test("parses blocked tool guard names for bounded runs", () => {
    expect(parseAgentRunArgs([
      "nolo",
      "--msg",
      "review the diff",
      "--blocked-tool",
      "writeFile",
      "--blocked-tool",
      " editFile ",
    ])).toMatchObject({
      blockedToolNames: ["writeFile", "editFile"],
    });
  });
  test("prepends a visible subject dialog marker to the user message", () => {
    expect(prependSubjectDialogMarker("eval 一下", "01SUBJECTDIALOG")).toContain(
      "Subject dialog for this run: 01SUBJECTDIALOG"
    );
    expect(prependSubjectDialogMarker("eval 一下", undefined)).toBe("eval 一下");
  });

  test("threads --subject-dialog through to the runner", async () => {
    const calls: any[] = [];
    const exitCode = await runCommand([
      "agent-pub-test",
      "--msg",
      "eval 一下",
      "--subject-dialog",
      "01SUBJECTDIALOG",
      "--server",
    ], {
      env: { AUTH_TOKEN: "token" },
      scriptDir: "/repo/scripts",
      output: { write() {} },
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0, dialogId: "dialog-1" };
      },
    });

    expect(exitCode).toBe(0);
    expect(calls[0].subjectDialogKey).toBe("01SUBJECTDIALOG");
    expect(calls[0].message).toContain("Subject dialog for this run: 01SUBJECTDIALOG");
    expect(calls[0].message).toContain("eval 一下");
  });

  test("parses background timeout for long-running remote agent runs", () => {
    expect(parseAgentRunArgs([
      "reviewer",
      "--msg",
      "review the diff",
      "--bg",
      "--timeout-ms",
      "600000",
    ])).toMatchObject({
      message: "review the diff",
      background: true,
      timeoutMs: 600000,
    });
  });

  test("parses task evidence flags for agent handoff", () => {
    expect(parseAgentRunArgs([
      "frontend-implementer",
      "--msg",
      "fix ui",
      "--task-row-dbkey",
      "row-user-1-01TASK",
      "--artifact-ids",
      "artifact-1,artifact-2",
    ])).toMatchObject({
      taskEvidence: {
        rowDbKey: "row-user-1-01TASK",
        artifactIds: ["artifact-1", "artifact-2"],
      },
    });
  });

  test("parses workflow reference flags without treating them as message text", () => {
    expect(parseAgentRunArgs([
      "frontend-implementer",
      "--workflow",
      "bun-nolo/frontend-implementation",
      "--msg",
      "fix ui",
    ])).toMatchObject({
      agentKey: NOLO_FRONTEND_AGENT_KEY,
      message: "fix ui",
      workflowRef: "bun-nolo/frontend-implementation",
    });
  });

  test("injects workflow reference context into agent runs", async () => {
    const calls: any[] = [];
    const exitCode = await runCommand([
      "frontend-implementer",
      "--workflow",
      "bun-nolo/frontend-implementation",
      "--msg",
      "fix ui",
      "--server",
    ], {
      env: { AUTH_TOKEN: "token" },
      memoryRecallDisabled: true,
      scriptDir: "/repo/scripts",
      output: { write() {} },
      resolveWorkflowReference: async (ref) => ({
        ref,
        content: "Use this reference when an agent needs reviewable UI changes.",
        config: {
          id: "bun-nolo/frontend-implementation",
          name: "Bun Nolo Frontend Implementation",
          defaultAgent: "frontend-implementer",
          inputs: ["msg", "taskRowDbKey"],
          gates: ["reviewableChange", "visualEvidence"],
          requiredOutputs: ["dialogId", "verification"],
        },
      }),
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0, dialogId: "dialog-1" };
      },
    });

    expect(exitCode).toBe(0);
    expect(calls[0].message).toContain("AI-native workflow reference:");
    expect(calls[0].message).toContain("- ref: bun-nolo/frontend-implementation");
    expect(calls[0].message).toContain("- name: Bun Nolo Frontend Implementation");
    expect(calls[0].message).toContain("- gates: reviewableChange, visualEvidence");
    expect(calls[0].message).toContain("User task:\nOutput format guidance:");
    expect(calls[0].message).toContain("\nfix ui");
  });

  test("resolves server run handles before calling the shared runner", async () => {
    const calls: any[] = [];
    const exitCode = await runCommand([
      "pm",
      "--msg",
      "classify this task",
      "--server",
      "--no-stream",
    ], {
      env: { AUTH_TOKEN: "token", NOLO_SERVER: "https://us.nolo.chat" },
      memoryRecallDisabled: true,
      scriptDir: "/repo/scripts",
      output: { write() {} },
      resolveAgentRunAgentKey: async ({ agentInput }) => {
        expect(agentInput).toBe("pm");
        return "agent-user-1-pm";
      },
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0, dialogId: "dialog-1" };
      },
    });

    expect(exitCode).toBe(0);
    expect(calls[0].agentKey).toBe("agent-user-1-pm");
    expect(calls[0].agentName).toBe("agent-user-1-pm");
  });

  test("resolves local workflow references from docs/workflows", async () => {
    const workflow = await resolveWorkflowReference("bun-nolo/frontend-implementation", process.cwd());

    expect(workflow.config).toMatchObject({
      id: "bun-nolo/frontend-implementation",
      kind: "workflow",
      defaultAgent: "frontend-implementer",
    });
    expect(workflow.content).toContain("# Bun Nolo Frontend Implementation");
  });

  test("keeps dangerously allow shell flag as a local-runtime compatibility flag", async () => {
    const calls: any[] = [];
    const chunks: string[] = [];
    const summaryCwds: string[] = [];
    const exitCode = await runCommand([
      "frontend-implementer",
      "--msg",
      "fix ui",
      "--local",
      "--dangerously-allow-shell",
    ], {
      env: {},
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      inspectLocalRunWorkspace: async (cwd) => {
        summaryCwds.push(cwd);
        return {
          cwd,
          clean: true,
          status: "",
        };
      },
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0 };
      },
    } as any);

    expect(exitCode).toBe(0);
    expect(calls[0]?.localRuntimeCwd).toBe(process.cwd());
    expect(summaryCwds).toEqual([process.cwd()]);
    expect(chunks.join("")).not.toContain("implicit workspace:");
  });

  test("does not create an isolated workspace by default for local runtime", async () => {
    const calls: any[] = [];
    const exitCode = await runCommand([
      "frontend-implementer",
      "--msg",
      "fix ui",
      "--local",
      "--dangerously-allow-shell",
    ], {
      env: {},
      scriptDir: "/repo/scripts",
      output: { write() {} },
      inspectLocalRunWorkspace: async (cwd) => ({
        cwd,
        clean: true,
        status: "",
      }),
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0 };
      },
    } as any);

    expect(exitCode).toBe(0);
    expect(calls[0]?.localRuntimeCwd).toBe(process.cwd());
  });

  test("runs fullstack through current-computer local shell cwd by default", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const chunks: string[] = [];
    const exitCode = await runCommand([
      "fullstack",
      "--msg",
      "fix api tests and commit",
    ], {
      env: { NOLO_SERVER: "https://us.nolo.chat" },
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      inspectLocalRunWorkspace: async (cwd) => ({
        cwd,
        clean: true,
        status: "",
      }),
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0, dialogId: "dialog-fullstack-local" };
      },
    });

    expect(exitCode).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      agentName: "fullstack",
      agentKey: "fullstack",
      serverUrl: "https://us.nolo.chat",
      runtimeMode: "local",
      localRuntimeCwd: process.cwd(),
    });
    expect(calls[0]?.message).toContain("Before developing a new feature");
    expect(calls[0]?.message).toContain("create a separate git worktree yourself");
    expect(chunks.join("")).not.toContain("implicit workspace:");
    expect(chunks.join("")).toContain("dialog-fullstack-local");
  });

  test("uses an explicit cwd for local shell runs", async () => {
    const calls: any[] = [];
    const chunks: string[] = [];
    const exitCode = await runCommand([
      "frontend-implementer",
      "--msg",
      "continue ui fix",
      "--local",
      "--cwd",
      "/repo/.worktrees/existing-agent-task",
      "--dangerously-allow-shell",
    ], {
      env: {},
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0 };
      },
    } as any);

    expect(exitCode).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.localRuntimeCwd).toBe("/repo/.worktrees/existing-agent-task");
    expect(chunks.join("")).not.toContain("implicit workspace:");
  });

  test("requires an agent and message", async () => {
    const chunks: string[] = [];
    const exitCode = await runCommand([], {
      env: {},
      scriptDir: "/missing/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      runner: async () => {
        throw new Error("runner should not be called");
      },
    });

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("Usage: nolo agent run <agent>");
  });

  test("prints usage and exits 0 for --help", async () => {
    const chunks: string[] = [];
    const exitCode = await runCommand(["--help"], {
      env: {},
      scriptDir: "/missing/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      runner: async () => {
        throw new Error("runner should not be called");
      },
    });

    expect(exitCode).toBe(0);
    expect(chunks.join("")).toContain("Usage: nolo agent run <agent>");
  });

  test("prints no-login run usage for empty shorthand input", async () => {
    const chunks: string[] = [];
    const exitCode = await runCommand([], {
      env: {},
      scriptDir: "/missing/scripts",
      commandPath: ["run"],
      output: { write(chunk) { chunks.push(chunk); } },
      runner: async () => {
        throw new Error("runner should not be called");
      },
    });

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("Usage: nolo run <message>");
    expect(chunks.join("")).toContain("no Nolo login required");
  });

  test("runs no-login shorthand through local Codex without an auth token", async () => {
    const calls: any[] = [];
    const chunks: string[] = [];

    const exitCode = await runCommand([
      "review this repo",
    ], {
      commandPath: ["run"],
      env: {},
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0, dialogId: "dialog-local-codex" };
      },
    } as any);

    expect(exitCode).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      agentName: LOCAL_CODEX_AGENT_KEY,
      agentKey: LOCAL_CODEX_AGENT_KEY,
      runtimeMode: "local",
      localRuntimeCwd: process.cwd(),
    });
    expect(String(calls[0].message)).toContain("Output format guidance:");
    expect(String(calls[0].message)).toContain("review this repo");
    expect(calls[0].env.AUTH_TOKEN).toBeUndefined();
    expect(chunks.join("")).toContain("dialog-local-codex");
  });

  test("runs through the shared agent turn runner", async () => {
    const calls: any[] = [];
    const chunks: string[] = [];

    const exitCode = await runCommand([
      "frontend-implementer",
      "--msg",
      "polish notifications",
      "--local",
      "--cwd",
      "/repo/project",
    ], {
      env: { NOLO_SERVER: "https://us.nolo.chat" },
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0, dialogId: "dialog-local" };
      },
    });

    expect(exitCode).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      agentName: NOLO_FRONTEND_AGENT_KEY,
      agentKey: NOLO_FRONTEND_AGENT_KEY,
      serverUrl: "https://us.nolo.chat",
      message: expect.stringContaining("Output format guidance:"),
      localRuntimeCwd: "/repo/project",
      imageUrls: [],
      scriptDir: "/repo/scripts",
      runtimeMode: "local",
      traceTools: false,
    });
    expect(calls[0].output).toBeDefined();
    expect(chunks.join("")).toContain("dialog-local");
  });

  test("prints a local run summary with workspace, dialog, commit, and dirty state", async () => {
    const chunks: string[] = [];
    const exitCode = await runCommand([
      "frontend-implementer",
      "--msg",
      "polish notifications",
      "--local",
      "--cwd",
      "/repo/project",
    ], {
      env: { NOLO_SERVER: "https://us.nolo.chat" },
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      inspectLocalRunWorkspace: async (cwd) => ({
        cwd,
        clean: true,
        status: "",
        commit: { hash: "abc1234", subject: "polish notification footer" },
      }),
      runner: async () => ({ exitCode: 0, dialogId: "dialog-local" }),
    } as any);

    const output = chunks.join("");
    expect(exitCode).toBe(0);
    expect(output).toContain("[nolo] local run summary");
    expect(output).toContain("workspace: /repo/project");
    expect(output).toContain("dialog: dialog-local");
    expect(output).toContain("commit: abc1234 polish notification footer");
    expect(output).toContain("dirty: clean");
  });

  test("runs forced local command through the real agent turn runner with cwd", async () => {
    const chunks: string[] = [];
    const factoryCwds: Array<string | undefined> = [];
    const exitCode = await runCommand([
      "frontend-implementer",
      "--msg",
      "polish notifications",
      "--local",
      "--cwd",
      "/repo/project",
    ], {
      env: {},
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      localRuntimeAdapterFactory: (_env, options) => {
        factoryCwds.push(options?.cwd);
        return ({
        host: "cli",
        capabilities: ["local-provider", "local-persistence"],
        loadAgentConfig: async (agentRef) => ({
          key: agentRef,
          name: "Frontend",
          prompt: "Fix UI",
          model: "fake-local",
        }),
        loadDialogHistory: async () => [],
        saveTurn: async () => ({ dialogId: "dialog-command-local" }),
        resolveProvider: async () => ({
          model: "fake-local",
          complete: async (messages) => ({
            content: `local:${messages.at(-1)?.content}`,
            model: "fake-local",
            trace: messages,
          }),
        }),
        executeTool: async () => {
          throw new Error("no tools expected");
        },
      });
      },
    });

    expect(exitCode).toBe(0);
    expect(factoryCwds).toEqual(["/repo/project"]);
    expect(chunks.join("")).toContain("working locally");
    expect(chunks.join("")).toContain("polish notifications");
    expect(chunks.join("")).toContain("local:Output format guidance:");
    expect(chunks.join("")).toContain("dialog-command-local");
  });

  test("real command path retries local once when agent config appears after refresh in auto mode", async () => {
    const chunks: string[] = [];
    let loadAgentConfigCalls = 0;
    let providerCalls = 0;

    const exitCode = await runCommand([
      "agent-user-1-local-retry",
      "--msg",
      "polish notifications",
      "--auto",
    ], {
      env: {
        AUTH_TOKEN: "token-123",
        NOLO_SERVER: "http://127.0.0.1:38123",
      },
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      localRuntimeAdapterFactory: () => ({
        host: "cli",
        capabilities: ["leveldb-agent-config", "local-provider", "leveldb-persistence"],
        loadAgentConfig: async (agentRef) => {
          loadAgentConfigCalls += 1;
          if (loadAgentConfigCalls < 3) return null;
          return {
            key: agentRef,
            name: "Frontend",
            prompt: "Fix UI",
            model: "fake-local",
          };
        },
        loadDialogHistory: async () => [],
        saveTurn: async () => ({ dialogId: "dialog-command-auto-refresh" }),
        resolveProvider: async () => ({
          model: "fake-local",
          complete: async (messages) => {
            providerCalls += 1;
            return {
              content: `local:${messages.at(-1)?.content}`,
              model: "fake-local",
              trace: messages,
            };
          },
        }),
        executeTool: async () => {
          throw new Error("no tools expected");
        },
      }),
    });

    expect(exitCode).toBe(0);
    expect(loadAgentConfigCalls).toBe(4);
    expect(providerCalls).toBe(1);
    expect(chunks.join("")).toContain("refreshing local config and retrying local once");
    expect(chunks.join("")).toContain("working locally");
    expect(chunks.join("")).toContain("dialog-command-auto-refresh");
    expect(chunks.join("")).toContain("polish notifications");
    expect(chunks.join("")).toContain("local:Output format guidance:");
  });

  test("switches to --fallback-agent once when a local run hits a quota (CliProviderQuotaError)", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const chunks: string[] = [];
    let callIndex = 0;
    const exitCode = await runCommand([
      "frontend-implementer",
      "--msg",
      "fix ui",
      "--local",
      "--fallback-agent",
      "local-codex",
    ], {
      env: {},
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      runner: async (options) => {
        callIndex += 1;
        calls.push(options);
        // First call (primary agent) fails with a quota error — and already
        // persisted a dialog (as localLoop does on provider failure).
        if (callIndex === 1) {
          return {
            exitCode: 1,
            dialogId: "dialog-from-primary-failure",
            localError: new CliProviderQuotaError("codex", "quota exceeded"),
          };
        }
        // Second call (fallback agent) succeeds.
        return { exitCode: 0, dialogId: "dialog-from-primary-failure" };
      },
    });

    const output = chunks.join("");
    expect(exitCode).toBe(0);
    expect(calls).toHaveLength(2);
    // Primary run used the original agent key.
    expect(calls[0]?.agentKey).toBe(NOLO_FRONTEND_AGENT_KEY);
    // Fallback run used the resolved fallback agent key with identical params.
    expect(calls[1]?.agentKey).toBe(LOCAL_CODEX_AGENT_KEY);
    expect(calls[1]?.message).toBe(calls[0]?.message);
    expect(calls[1]?.localRuntimeCwd).toBe(calls[0]?.localRuntimeCwd);
    expect(calls[1]?.runtimeMode).toBe("local");
    // Critical UX: fallback continues the dialog created by the failed primary
    // run, instead of forking a second conversation.
    expect(calls[1]?.continueDialogId).toBe("dialog-from-primary-failure");
    // The quota switch message is printed exactly once.
    expect(output).toContain(`[nolo] quota exhausted on ${NOLO_FRONTEND_AGENT_KEY}, falling back to ${LOCAL_CODEX_AGENT_KEY}`);
    // Only retried once: the fallback succeeded, so no second retry attempt.
    expect(output).toContain("dialog-from-primary-failure");
  });

  test("switches to --fallback-agent once when a local run error message indicates HTTP 429", async () => {
    const calls: Array<Record<string, unknown>> = [];
    let callIndex = 0;
    const exitCode = await runCommand([
      "frontend-implementer",
      "--msg",
      "fix ui",
      "--local",
      "--fallback-agent",
      "local-codex",
    ], {
      env: {},
      scriptDir: "/repo/scripts",
      output: { write() {} },
      runner: async (options) => {
        callIndex += 1;
        calls.push(options);
        if (callIndex === 1) {
          return { exitCode: 1, localError: new Error("HTTP 429 Too Many Requests: 额度已用尽") };
        }
        return { exitCode: 0, dialogId: "dialog-fallback-429" };
      },
    });

    expect(exitCode).toBe(0);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.agentKey).toBe(LOCAL_CODEX_AGENT_KEY);
  });

  test("does not trigger fallback switch for non-quota local run errors", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const chunks: string[] = [];
    const exitCode = await runCommand([
      "frontend-implementer",
      "--msg",
      "fix ui",
      "--local",
      "--fallback-agent",
      "local-codex",
    ], {
      env: {},
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      runner: async (options) => {
        calls.push(options);
        // A generic runtime error is NOT a quota error and must not switch.
        return { exitCode: 1, localError: new Error("provider crashed unexpectedly") };
      },
    });

    const output = chunks.join("");
    expect(exitCode).toBe(1);
    // Only the primary agent ran; no fallback retry.
    expect(calls).toHaveLength(1);
    expect(calls[0]?.agentKey).toBe(NOLO_FRONTEND_AGENT_KEY);
    expect(output).not.toContain("quota exhausted");
    expect(output).not.toContain("falling back to");
    // The generic failure must not surface a quota hint.
    expect(output).not.toContain("Quota limit hit");
  });

  test("reports the fallback failure normally when the fallback agent also fails", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const chunks: string[] = [];
    let callIndex = 0;
    const exitCode = await runCommand([
      "frontend-implementer",
      "--msg",
      "fix ui",
      "--local",
      "--fallback-agent",
      "local-codex",
    ], {
      env: {},
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      runner: async (options) => {
        callIndex += 1;
        calls.push(options);
        if (callIndex === 1) {
          return { exitCode: 1, localError: new CliProviderQuotaError("codex", "quota exceeded") };
        }
        return { exitCode: 1, localError: new Error("fallback provider crashed") };
      },
    });

    const output = chunks.join("");
    expect(exitCode).toBe(1);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.agentKey).toBe(LOCAL_CODEX_AGENT_KEY);
    expect(output).toContain(`[nolo] quota exhausted on ${NOLO_FRONTEND_AGENT_KEY}, falling back to ${LOCAL_CODEX_AGENT_KEY}`);
    expect(output).toContain("fallback to ");
    expect(output).toContain("also failed");
  });

  test("isBalanceExhaustedError detects UPSTREAM_402 / 余额不足, not plain 429", () => {
    expect(isBalanceExhaustedError(new Error("Insufficient Balance (UPSTREAM_402)"))).toBe(true);
    expect(isBalanceExhaustedError("余额不足")).toBe(true);
    expect(isBalanceExhaustedError(new Error("HTTP 429 Too Many Requests"))).toBe(false);
    expect(isQuotaExhaustedError(new Error("HTTP 429 Too Many Requests"))).toBe(true);
  });

  test("detaches local --bg runs via spawn and does not invoke runner", async () => {
    const runnerCalls: Array<Record<string, unknown>> = [];
    const spawnCalls: Array<{
      command: string;
      args: readonly string[];
      options: { cwd?: string; env?: Record<string, string | undefined>; detached?: boolean };
    }> = [];
    const chunks: string[] = [];

    const exitCode = await runCommand(
      [
        "frontend-implementer",
        "--msg",
        "fix ui",
        "--local",
        "--bg",
        "--timeout-ms",
        "120000",
      ],
      {
        env: {},
        scriptDir: "/repo/scripts",
        commandPath: ["agent", "run"],
        cliEntrypointPath: "/repo/packages/cli/index.ts",
        output: { write(chunk) { chunks.push(chunk); } },
        runner: async (options) => {
          runnerCalls.push(options);
          return { exitCode: 0, dialogId: "dialog-local-bg" };
        },
        spawn: (command, args, options) => {
          spawnCalls.push({ command, args, options });
          return {
            pid: 12345,
            unref() {},
            on() {},
            once() {},
            off() {},
          } as any;
        },
        fs: {
          mkdirSync() {},
          writeFileSync() {},
          readFileSync() {
            throw new Error("ENOENT");
          },
          readdirSync() {
            return [];
          },
          existsSync(path: string) {
            // 入口必须真实存在（commit 53b0b11b7 引入 existsSync 校验）：无效
            // cliEntrypointPath 会被判为坏入口并回退 resolveCliEntrypointPath()
            // 默认解析，导致 args[0] 变成默认结果而非宿主传入的入口。测试注入的
            // /repo/packages/cli/index.ts 是虚构路径，因此这里按路径放行，守护
            // "宿主传入的合法入口被原样使用" 这一行为。
            return path === "/repo/packages/cli/index.ts";
          },
          openSync() {
            return 42;
          },
          unlinkSync() {},
        },
        generateRunId: () => "run-test-123",
        homedir: () => "/home/test",
      }
    );

    const output = chunks.join("");
    expect(exitCode).toBe(0);
    expect(runnerCalls).toHaveLength(0);
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0].command).toBe(process.execPath);
    expect(spawnCalls[0].args).toEqual([
      "/repo/packages/cli/index.ts",
      "agent",
      "run",
      "frontend-implementer",
      "--msg",
      "fix ui",
      "--local",
      "--timeout-ms",
      "120000",
    ]);
    expect(spawnCalls[0].options.detached).toBe(true);
    expect(spawnCalls[0].options.cwd).toBe(process.cwd());
    expect(spawnCalls[0].options.env?.NOLO_AGENT_RUN_CHILD).toBe("1");
    expect(spawnCalls[0].options.env?.NOLO_AGENT_RUN_ID).toBe("run-test-123");
    expect(output).toContain("[nolo] runId=run-test-123");
    expect(output).toContain("[nolo] pid=12345");
    expect(output).toContain("[nolo] stop: nolo agent stop run-test-123");
  });

  test("finalizes registry record when running as a background child", async () => {
    const finalized: Array<{ runId: string; status: string; exitCode?: number; dialogId?: string }> = [];
    const chunks: string[] = [];
    const exitCode = await runCommand(
      [
        "frontend-implementer",
        "--msg",
        "fix ui",
        "--local",
      ],
      {
        env: { NOLO_AGENT_RUN_CHILD: "1", NOLO_AGENT_RUN_ID: "run-child-1" },
        scriptDir: "/repo/scripts",
        output: { write(chunk) { chunks.push(chunk); } },
        runner: async () => ({ exitCode: 0, dialogId: "dialog-child-1" }),
        finalizeRunRecord: (runId, update) => {
          finalized.push({ runId, ...update });
        },
      }
    );

    expect(exitCode).toBe(0);
    expect(finalized).toEqual([
      { runId: "run-child-1", status: "done", exitCode: 0, dialogId: "dialog-child-1" },
    ]);
  });

  test("background run: length-truncated empty assistant output is finalized as failed with a reason note", async () => {
    const finalized: Array<{ runId: string; status: string; note?: string; exitCode?: number }> = [];
    const exitCode = await runCommand(
      [
        "frontend-implementer",
        "--msg",
        "fix ui",
        "--local",
      ],
      {
        env: { NOLO_AGENT_RUN_CHILD: "1", NOLO_AGENT_RUN_ID: "run-child-trunc" },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        runner: async () => ({
          exitCode: 0,
          dialogId: "dialog-trunc-1",
          emptyAssistantFallbackReason: "length_truncated",
        }),
        finalizeRunRecord: (runId, update) => {
          finalized.push({ runId, ...update });
        },
      }
    );

    // 后台 run：虽然 exitCode 仍 0（fallback 不抛错），截断型兜底必须结算为 failed。
    expect(exitCode).toBe(0);
    expect(finalized).toEqual([
      {
        runId: "run-child-trunc",
        status: "failed",
        exitCode: 0,
        dialogId: "dialog-trunc-1",
        note: "empty assistant output: length_truncated",
      },
    ]);
  });

  test("background run: stream-truncated empty assistant output is finalized as failed with a reason note", async () => {
    const finalized: Array<{ runId: string; status: string; note?: string }> = [];
    await runCommand(
      [
        "frontend-implementer",
        "--msg",
        "fix ui",
        "--local",
      ],
      {
        env: { NOLO_AGENT_RUN_CHILD: "1", NOLO_AGENT_RUN_ID: "run-child-stream" },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        runner: async () => ({
          exitCode: 0,
          dialogId: "dialog-stream-1",
          emptyAssistantFallbackReason: "stream_truncated",
        }),
        finalizeRunRecord: (runId, update) => {
          finalized.push({ runId, ...update });
        },
      }
    );
    expect(finalized[0]).toMatchObject({
      status: "failed",
      note: "empty assistant output: stream_truncated",
    });
  });

  test("background run: ordinary empty reply stays done (not a truncation)", async () => {
    const finalized: Array<{ runId: string; status: string; note?: string }> = [];
    await runCommand(
      [
        "frontend-implementer",
        "--msg",
        "fix ui",
        "--local",
      ],
      {
        env: { NOLO_AGENT_RUN_CHILD: "1", NOLO_AGENT_RUN_ID: "run-child-empty" },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        runner: async () => ({
          exitCode: 0,
          dialogId: "dialog-empty-1",
          emptyAssistantFallbackReason: "empty_completion",
        }),
        finalizeRunRecord: (runId, update) => {
          finalized.push({ runId, ...update });
        },
      }
    );
    // 普通空回复不算故障：仍按 exitCode 判定为 done，且不带 note。
    expect(finalized[0]).toEqual({
      runId: "run-child-empty",
      status: "done",
      exitCode: 0,
      dialogId: "dialog-empty-1",
    });
  });

  test("interactive (non-background) truncation: behavior unchanged, exitCode 0, no registry finalize", async () => {
    const finalized: string[] = [];
    const exitCode = await runCommand(
      [
        "frontend-implementer",
        "--msg",
        "fix ui",
        "--local",
      ],
      {
        // 无 NOLO_AGENT_RUN_ID → 不是后台 run，不进 finalize 分支。
        env: {},
        scriptDir: "/repo/scripts",
        output: { write() {} },
        runner: async () => ({
          exitCode: 0,
          dialogId: "dialog-interactive-1",
          emptyAssistantFallbackReason: "length_truncated",
        }),
        finalizeRunRecord: (_runId, _update) => {
          finalized.push("should not be called");
        },
      }
    );
    expect(exitCode).toBe(0);
    expect(finalized).toEqual([]);
  });

  test("does not print the --bg local hint for server runs (where --bg is supported)", async () => {
    const chunks: string[] = [];
    const exitCode = await runCommand([
      "agent-pub-test",
      "--msg",
      "review the diff",
      "--server",
      "--bg",
    ], {
      env: { AUTH_TOKEN: "token" },
      scriptDir: "/repo/scripts",
      output: { write(chunk) { chunks.push(chunk); } },
      runner: async () => ({ exitCode: 0, dialogId: "dialog-server-bg" }),
    });

    const output = chunks.join("");
    expect(exitCode).toBe(0);
    expect(output).not.toContain("[nolo] --bg is not supported for local runs");
    expect(output).toContain("background dialog dialog-server-bg");
  });

  test("times out a stalled local background child and marks registry as timeout", async () => {
    const finalized: Array<{ runId: string; status: string; note?: string }> = [];
    let exitCode: number | undefined;
    const promise = runCommand(
      [
        "frontend-implementer",
        "--msg",
        "hang forever",
        "--local",
        "--timeout-ms",
        "50",
      ],
      {
        env: { NOLO_AGENT_RUN_CHILD: "1", NOLO_AGENT_RUN_ID: "run-timeout-1" },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        memoryRecallDisabled: true,
        runner: async () => new Promise(() => {}) as any,
        finalizeRunRecord: (runId, update) => {
          finalized.push({ runId, ...update });
        },
        processExit: (code) => {
          exitCode = code;
          throw new Error(`exit:${code}`);
        },
      },
    );

    await expect(promise).rejects.toThrow("timed out after 50ms");
    expect(exitCode).toBe(124);
    expect(finalized).toEqual([
      {
        runId: "run-timeout-1",
        status: "timeout",
        note: expect.stringContaining("timed out after 50ms"),
      },
    ]);
  });

  test("kills a local background child when no progress is made", async () => {
    const finalized: Array<{ runId: string; status: string; note?: string }> = [];
    let exitCode: number | undefined;
    const promise = runCommand(
      [
        "frontend-implementer",
        "--msg",
        "hang quietly",
        "--local",
      ],
      {
        env: { NOLO_AGENT_RUN_CHILD: "1", NOLO_AGENT_RUN_ID: "run-stall-1" },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        memoryRecallDisabled: true,
        runner: async () => new Promise(() => {}) as any,
        stallTimeoutMs: 50,
        finalizeRunRecord: (runId, update) => {
          finalized.push({ runId, ...update });
        },
        processExit: (code) => {
          exitCode = code;
          throw new Error(`exit:${code}`);
        },
      },
    );

    await expect(promise).rejects.toThrow("stalled: no progress for 50ms");
    expect(exitCode).toBe(1);
    expect(finalized).toEqual([
      {
        runId: "run-stall-1",
        status: "failed",
        note: expect.stringContaining("stalled: no progress for 50ms"),
      },
    ]);
  });

  test("does not kill a local background child while a tool is in flight", async () => {
    const finalized: Array<{ runId: string; status: string; note?: string }> = [];
    const promise = runCommand(
      [
        "frontend-implementer",
        "--msg",
        "compile for a long time",
        "--local",
      ],
      {
        env: { NOLO_AGENT_RUN_CHILD: "1", NOLO_AGENT_RUN_ID: "run-tool-inflight-1" },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        memoryRecallDisabled: true,
        runner: async (options) => {
          options.onLoopEvent?.({ kind: "tool-start", name: "execShell", atMs: Date.now() });
          await new Promise((resolve) => setTimeout(resolve, 150));
          options.onLoopEvent?.({ kind: "tool-end", name: "execShell", atMs: Date.now(), ok: true });
          return { exitCode: 0, dialogId: "dialog-tool-inflight-1" };
        },
        stallTimeoutMs: 50,
        finalizeRunRecord: (runId, update) => {
          finalized.push({ runId, ...update });
        },
        processExit: (code) => {
          throw new Error(`exit:${code}`);
        },
      },
    );

    const exitCode = await promise;
    expect(exitCode).toBe(0);
    expect(finalized).toEqual([
      {
        runId: "run-tool-inflight-1",
        status: "done",
        exitCode: 0,
        dialogId: "dialog-tool-inflight-1",
      },
    ]);
  });

  test("kills a local background child when an llm stays in flight", async () => {
    const finalized: Array<{ runId: string; status: string; note?: string }> = [];
    let exitCode: number | undefined;
    const promise = runCommand(
      [
        "frontend-implementer",
        "--msg",
        "llm hang",
        "--local",
      ],
      {
        env: { NOLO_AGENT_RUN_CHILD: "1", NOLO_AGENT_RUN_ID: "run-llm-inflight-1" },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        memoryRecallDisabled: true,
        runner: async (options) => {
          options.onLoopEvent?.({ kind: "llm-start", round: 0, atMs: Date.now() });
          await new Promise(() => {}) as any;
          return { exitCode: 0 };
        },
        stallTimeoutMs: 50,
        finalizeRunRecord: (runId, update) => {
          finalized.push({ runId, ...update });
        },
        processExit: (code) => {
          exitCode = code;
          throw new Error(`exit:${code}`);
        },
      },
    );

    await expect(promise).rejects.toThrow("stalled: no progress for 50ms");
    expect(exitCode).toBe(1);
    expect(finalized).toEqual([
      {
        runId: "run-llm-inflight-1",
        status: "failed",
        note: expect.stringContaining("stalled: no progress for 50ms"),
      },
    ]);
  });

  test("writes heartbeat activity to the registry from loop events", async () => {
    const runId = "run-heartbeat-1";
    writeRunRecord(
      {
        runId,
        agentKey: "frontend-implementer",
        startedAt: new Date().toISOString(),
        status: "running",
        logPath: join(tempNoloHome, ".nolo", "runs", `${runId}.log`),
      },
      { env: { NOLO_HOME: tempNoloHome } }
    );

    const exitCode = await runCommand(
      [
        "frontend-implementer",
        "--msg",
        "do some work",
        "--local",
      ],
      {
        env: { NOLO_AGENT_RUN_CHILD: "1", NOLO_AGENT_RUN_ID: runId, NOLO_HOME: tempNoloHome },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        runner: async (options) => {
          const at = Date.now();
          options.onLoopEvent?.({ kind: "llm-start", round: 0, atMs: at });
          options.onLoopEvent?.({ kind: "llm-end", round: 0, atMs: at + 100, ok: true });
          options.onLoopEvent?.({ kind: "tool-start", name: "writeFile", atMs: at + 200 });
          options.onLoopEvent?.({ kind: "tool-end", name: "writeFile", atMs: at + 300, ok: true });
          return { exitCode: 0, dialogId: "dialog-heartbeat-1" };
        },
      },
    );

    expect(exitCode).toBe(0);
    const record = readRunRecord(runId, { env: { NOLO_HOME: tempNoloHome } });
    expect(record?.activity).toMatchObject({
      inFlight: null,
      counters: { llmCalls: 1, toolCalls: 1, fileEdits: 1 },
    });
  });

  // --- auto-route 集成：非 TUI chat 入口，有图无图都走 flash 档 ---
  test("auto-route with an image routes the run to the flash agent (preprocessing handles images)", async () => {
    const calls: any[] = [];
    const exitCode = await runCommand([
      "agent-pub-test",
      "--msg",
      "describe this image",
      "--image-url",
      "https://example.com/a.png",
      "--auto-route",
    ], {
      commandPath: ["chat"],
      env: { AUTH_TOKEN: "token" },
      scriptDir: "/repo/scripts",
      output: { write() {} },
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0, dialogId: "dialog-img-1" };
      },
    });

    expect(exitCode).toBe(0);
    expect(calls[0].agentKey).toBe(CLI_AUTO_ROUTE_AGENT_KEY);
    expect(calls[0].imageUrls).toEqual(["https://example.com/a.png"]);
  });

  test("auto-route without an image routes the run to the flash agent", async () => {
    const calls: any[] = [];
    const exitCode = await runCommand([
      "agent-pub-test",
      "--msg",
      "summarize this",
      "--auto-route",
    ], {
      commandPath: ["chat"],
      env: { AUTH_TOKEN: "token" },
      scriptDir: "/repo/scripts",
      output: { write() {} },
      runner: async (options) => {
        calls.push(options);
        return { exitCode: 0, dialogId: "dialog-flash-1" };
      },
    });

    expect(exitCode).toBe(0);
    expect(calls[0].agentKey).toBe(CLI_AUTO_ROUTE_AGENT_KEY);
    expect(calls[0].imageUrls).toEqual([]);
  });
});
