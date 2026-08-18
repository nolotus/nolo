import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expectNoRetiredTaskOrchestrationTerms } from "../../scripts/helpers/retiredTaskOrchestrationTerms";
import {
  runMachineConnectCommand,
} from "./machineCommands";

function runGit(args: string[], cwd: string) {
  const proc = Bun.spawnSync(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (proc.exitCode !== 0) {
    throw new Error(proc.stderr.toString() || proc.stdout.toString());
  }
}

function createAbortBoundHeartbeatLoop() {
  return ({ signal }: { signal?: AbortSignal }) =>
    new Promise<void>((resolve) => {
      signal?.addEventListener("abort", () => resolve(), { once: true });
    });
}

describe("cli machine commands", () => {
  test("connect posts a heartbeat to the selected server", async () => {
    const exitCode = await runMachineConnectCommand([], {
      env: {
        NOLO_SERVER: "https://agent.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write() {} },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        connectorVersion: "0.1.0",
        capabilities: ["shell-readonly"],
      }),
      fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    });

    expect(exitCode).toBe(0);
  });

  test("connect --watch keeps sending heartbeats through the connector loop", async () => {
    const exitCode = await runMachineConnectCommand(["--watch"], {
      env: {
        NOLO_SERVER: "https://agent.nolo.chat",
        AUTH_TOKEN: "token-abc",
        NOLO_CONNECT_HEARTBEAT_MS: "1234",
      },
      output: { write() {} },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: [],
      }),
      fetchImpl: async () => {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
      runHeartbeatLoop: async ({ sendHeartbeat }) => {
        await sendHeartbeat();
      },
    });

    expect(exitCode).toBe(0);
  });

  test("connect --daemon starts a silent background connector process", async () => {
    const exitCode = await runMachineConnectCommand(["--daemon"], {
      env: {
        NOLO_SERVER: "https://agent.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write() {} },
      fetchImpl: async () => {
        throw new Error("daemon start should not heartbeat in the parent process");
      },
      validateWorkspaceLinks: async () => [],
      spawnDaemon: () => ({ pid: 1234 }),
    });

    expect(exitCode).toBe(0);
  });

  test("connect --daemon refuses unsafe workspace package links before spawning", async () => {
    const exitCode = await runMachineConnectCommand(["--daemon"], {
      env: {
        NOLO_SERVER: "https://agent.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write() {} },
      validateWorkspaceLinks: async () => [
        "/repo/node_modules/ai points outside this checkout: /other/packages/ai. Run bun install in /repo.",
      ],
      spawnDaemon: () => ({ pid: 1234 }),
    });

    expect(exitCode).toBe(1);
  });

  test("connect --ws prefers explicit bootstrap args over profile env", async () => {
    const requestedUrls: string[] = [];
    const authHeaders: Array<string | null> = [];

    const exitCode = await runMachineConnectCommand(["--ws", "--server-url", "https://us.nolo.chat", "--machine-key", "sk_machine_bootstrap"], {
      maxConnectorAttempts: 1,
      env: {
        NOLO_SERVER: "https://api.nolo.chat",
        AUTH_TOKEN: "sk_machine_test",
      },
      output: { write() {} },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: ["codex-cli"],
      }),
      fetchImpl: async (url, init) => {
        requestedUrls.push(String(url));
        authHeaders.push(new Headers(init?.headers).get("authorization"));
        if (String(url).includes("/api/connector/ws")) {
          return new Response(
            JSON.stringify({
              wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
              decision: "fallback",
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      connectWebSocket: async () => undefined,
    });

    expect(exitCode).toBe(0);
    expect(requestedUrls).toEqual([
      "https://us.nolo.chat/api/machines/heartbeat",
      "https://us.nolo.chat/api/connector/ws?machineId=machine-test&connectorSurface=cli",
    ]);
    expect(authHeaders).toEqual([
      "Bearer sk_machine_bootstrap",
      "Bearer sk_machine_bootstrap",
    ]);
  });

  test("connect --ws accepts server url and api key from daemon-style env", async () => {
    const requestedUrls: string[] = [];
    const authHeaders: Array<string | null> = [];

    const exitCode = await runMachineConnectCommand(["--ws"], {
      maxConnectorAttempts: 1,
      env: {
        NOLO_SERVER: "https://api.nolo.chat",
        AUTH_TOKEN: "sk_machine_test",
      },
      output: { write() {} },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: ["codex-cli"],
      }),
      fetchImpl: async (url, init) => {
        requestedUrls.push(String(url));
        authHeaders.push(new Headers(init?.headers).get("authorization"));
        if (String(url).includes("/api/connector/ws")) {
          return new Response(
            JSON.stringify({
              wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
              decision: "fallback",
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      connectWebSocket: async () => undefined,
    });

    expect(exitCode).toBe(0);
    expect(requestedUrls).toEqual([
      "https://api.nolo.chat/api/machines/heartbeat",
      "https://api.nolo.chat/api/connector/ws?machineId=machine-test&connectorSurface=cli",
    ]);
    expect(authHeaders).toEqual([
      "Bearer sk_machine_test",
      "Bearer sk_machine_test",
    ]);
  });

  test("connect --ws heartbeats and opens the connector websocket", async () => {
    const chunks: string[] = [];
    let wsUrl = "";
    let wsHeaders: Record<string, string> = {};
    const sentMessages: string[] = [];
    const executed: any[] = [];

    const exitCode = await runMachineConnectCommand(["--ws"], {
      maxConnectorAttempts: 1,
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: ["codex-cli"],
      }),
      fetchImpl: async (url) => {
        if (String(url).includes("/api/machines/heartbeat")) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (String(url).includes("/api/connector/ws")) {
          return new Response(
            JSON.stringify({
              wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
              decision: "fallback",
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      },
      executeCli: async (provider, prompt, options) => {
        executed.push({ provider, prompt, options });
        return { text: "real cli ok", raw: "real cli ok", elapsed: 10 };
      },
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      connectWebSocket: async (url, options) => {
        wsUrl = url;
        wsHeaders = options.headers;
        await options.onMessage(JSON.stringify({
          type: "agent.run",
          requestId: "request-1",
          payload: {
            agentKey: "agent-a",
            userInput: "hello",
            timeoutMs: 600000,
            runtimeContext: {
              subjectRefs: [
                { kind: "table-row", id: "row-user-table-row", role: "task" },
                { kind: "table-row", id: "frontend-assignment", role: "assignment" },
              ],
            },
            agentConfig: {
              apiSource: "cli",
              cliProvider: "codex",
              model: "gpt-5.4",
              prompt: "system prompt",
            },
          },
        }));
        sentMessages.push(...options.sentMessages);
      },
    });

    expect(exitCode).toBe(0);
    expect(wsUrl).toBe("wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test");
    expect(wsHeaders).toEqual({ Authorization: "Bearer token-abc" });
    const parsedMessages = sentMessages.map((message) => JSON.parse(message));
    expect(parsedMessages[0]).toMatchObject({
      type: "agent.run.progress",
      requestId: "request-1",
      progress: {
        provider: "codex",
        requestId: "request-1",
        promptBytes: expect.any(Number),
        promptHash: expect.any(String),
        message: "cli-started",
      },
    });
    expect(parsedMessages.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-1",
      result: {
        content: "real cli ok",
        model: "gpt-5.4",
        trace: [{ role: "assistant", content: "real cli ok" }],
        artifacts: expect.objectContaining({
          exitStatus: "completed",
          cwd: expect.any(String),
        }),
      },
    });
    expect(executed).toHaveLength(1);
    expect(executed[0]).toMatchObject({
      provider: "codex",
      options: {
        model: "gpt-5.4",
        timeout: 600000,
        cwd: expect.any(String),
        yolo: true,
        env: {
          AUTH_TOKEN: "token-abc",
          NOLO_MACHINE_API_KEY: "token-abc",
          NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
          NOLO_SERVER_URL: "https://alpha-agent-a.nolo.chat",
          BASE_URL: "https://alpha-agent-a.nolo.chat",
        },
      },
    });
    expect(executed[0].prompt).toContain("system prompt");
    expect(executed[0].prompt).toContain("--- Nolo task evidence context ---");
    expect(executed[0].prompt).toContain("bun packages/cli/index.ts table query --table meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ --row \"row-user-table-row\" --include-activity --output json");
    expect(executed[0].prompt).toContain("bun packages/cli/index.ts dialog query --row-dbkey \"row-user-table-row\" --json");
    expect(executed[0].prompt).toContain("bun packages/cli/index.ts dialog read <dialogId>");
    expect(executed[0].prompt).not.toContain("request-review");
    expect(executed[0].prompt).not.toContain("durable task context");
    expect(executed[0].prompt).not.toContain("current task context");
    expect(executed[0].prompt).toContain("durable task evidence");
    expect(executed[0].prompt).toContain("Handoff context: query dialog.subjectRefs first");
    expect(executed[0].prompt).toContain("Treat row activityRefs/latestActivityRef as cache hints, not state truth");
    expect(executed[0].prompt).toContain("Reviewer autonomy");
    expect(executed[0].prompt).toContain("directly dispatch the rework agent/dialog");
    expect(executed[0].prompt).toContain("--exclude-dialog <currentDialogId>");
    expect(executed[0].prompt).toContain("Review decision: approved | needs_changes | blocked");
    expectNoRetiredTaskOrchestrationTerms(executed[0].prompt);
    expect(executed[0].prompt).toContain("--- Machine permission policy ---");
    expect(executed[0].prompt).toContain("File writes are not allowed.");
    expect(executed[0].prompt).toContain("--- User task ---\nhello");
    expect(chunks.join("")).toContain("Connector websocket connected");
  });

  test("connect --ws materializes large CLI prompts before execution", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-machine-large-prompt-"));
    const sentMessages: string[] = [];
    const executed: any[] = [];
    try {
      await Bun.write(join(workspaceRoot, "README.md"), "base workspace\n");
      runGit(["init"], workspaceRoot);
      runGit(["add", "README.md"], workspaceRoot);
      runGit(["-c", "user.email=test@example.com", "-c", "user.name=Nolo Test", "commit", "-m", "init"], workspaceRoot);

      const exitCode = await runMachineConnectCommand(["--ws"], {
        maxConnectorAttempts: 1,
        env: {
          NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
          AUTH_TOKEN: "token-abc",
          NOLO_AGENT_WORKDIR: workspaceRoot,
          NOLO_CONNECTOR_PROMPT_INLINE_MAX_BYTES: "1024",
        },
        output: { write() {} },
        machineInfo: () => ({
          machineId: "machine-test",
          name: "Test Machine",
          platform: "linux",
          arch: "x64",
          capabilities: ["agy-cli"],
        }),
        fetchImpl: async (url) => {
          if (String(url).includes("/api/machines/heartbeat")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (String(url).includes("/api/connector/ws")) {
            return new Response(
              JSON.stringify({
                wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
                decision: "fallback",
              }),
              { status: 200 }
            );
          }
          return new Response("not found", { status: 404 });
        },
        executeCli: async (provider, prompt, options) => {
          executed.push({ provider, prompt, options });
          return { text: "large prompt ok", raw: "large prompt ok", elapsed: 10 };
        },
        runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
        connectWebSocket: async (_url, options) => {
          await options.onMessage(JSON.stringify({
            type: "agent.run",
            requestId: "request-large",
            payload: {
              agentKey: "agent-agy",
              userInput: "do work",
              meta: {
                runtimePromptPage: {
                  dbKey: "page-user-runtime-prompt",
                  promptHash: "cloudhash123",
                  contentBytes: 6000,
                },
              },
              agentConfig: {
                apiSource: "cli",
                cliProvider: "agy",
                prompt: `system prompt\n${"x".repeat(5000)}`,
              },
            },
          }));
          sentMessages.push(...options.sentMessages);
        },
      });

      expect(exitCode).toBe(0);
      expect(executed).toHaveLength(1);
      expect(executed[0].provider).toBe("agy");
      expect(executed[0].prompt).toContain("large Nolo runtime prompt");
      expect(executed[0].prompt).toContain("Cloud prompt page: page-user-runtime-prompt");
      expect(executed[0].prompt).toContain("doc read");
      expect(executed[0].prompt).not.toContain("x".repeat(200));
      const parsed = sentMessages.map((message) => JSON.parse(message));
      const progress = parsed.find((message) => message.type === "agent.run.progress")?.progress;
      expect(progress?.promptRef).toContain(join(".nolo", "agent-prompts", "request-large-"));
      expect(progress?.promptPageKey).toBe("page-user-runtime-prompt");
      expect(progress?.promptPageHash).toBe("cloudhash123");
      expect(existsSync(progress.promptRef)).toBe(true);
      expect(readFileSync(progress.promptRef, "utf8")).toContain("system prompt");
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("connect --ws keeps heartbeating while the websocket is open", async () => {
    let heartbeatCalls = 0;
    let heartbeatLoopCalls = 0;

    const exitCode = await runMachineConnectCommand(["--ws"], {
      maxConnectorAttempts: 1,
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
        NOLO_CONNECT_HEARTBEAT_MS: "2345",
      },
      output: { write() {} },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: ["codex-cli"],
      }),
      fetchImpl: async (url) => {
        if (String(url).includes("/api/machines/heartbeat")) {
          heartbeatCalls += 1;
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (String(url).includes("/api/connector/ws")) {
          return new Response(
            JSON.stringify({
              wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
              decision: "fallback",
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      },
      connectWebSocket: async () => undefined,
      runHeartbeatLoop: async ({ intervalMs, sendHeartbeat, signal }) => {
        heartbeatLoopCalls += 1;
        expect(intervalMs).toBe(2345);
        expect(signal?.aborted).toBe(false);
        await sendHeartbeat();
        await sendHeartbeat();
      },
    });

    expect(exitCode).toBe(0);
    expect(heartbeatLoopCalls).toBe(1);
    expect(heartbeatCalls).toBe(3);
  });

  test("connect --ws reconnects after a websocket closes", async () => {
    const chunks: string[] = [];
    const slept: number[] = [];
    let heartbeatCalls = 0;
    let wsCalls = 0;

    const exitCode = await runMachineConnectCommand(["--ws"], {
      maxConnectorAttempts: 2,
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
        NOLO_CONNECT_RECONNECT_MS: "7",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: ["codex-cli"],
      }),
      fetchImpl: async (url) => {
        if (String(url).includes("/api/machines/heartbeat")) {
          heartbeatCalls += 1;
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (String(url).includes("/api/connector/ws")) {
          return new Response(
            JSON.stringify({
              wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
              decision: "fallback",
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      },
      connectWebSocket: async () => {
        wsCalls += 1;
      },
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      sleep: async (ms) => {
        slept.push(ms);
      },
    });

    expect(exitCode).toBe(0);
    expect(wsCalls).toBe(2);
    expect(heartbeatCalls).toBe(2);
    expect(slept).toEqual([7]);
    expect(chunks.join("")).toContain("Reconnecting in 7ms");
  });

  test("connect --ws honors Retry-After when the connector probe reports core draining", async () => {
    const chunks: string[] = [];
    const slept: number[] = [];
    let heartbeatCalls = 0;
    let wsCalls = 0;
    let probeCalls = 0;

    const exitCode = await runMachineConnectCommand(["--ws"], {
      maxConnectorAttempts: 2,
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
        NOLO_CONNECT_RECONNECT_MS: "7",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: ["codex-cli"],
      }),
      fetchImpl: async (url) => {
        if (String(url).includes("/api/machines/heartbeat")) {
          heartbeatCalls += 1;
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (String(url).includes("/api/connector/ws")) {
          probeCalls += 1;
          if (probeCalls === 1) {
            return Response.json(
              {
                error: "Server draining",
                reason: "core_draining",
                retryable: true,
                retryAfterMs: 2000,
              },
              {
                status: 503,
                headers: { "Retry-After": "2" },
              }
            );
          }
          return new Response(
            JSON.stringify({
              wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
              decision: "fallback",
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      },
      connectWebSocket: async () => {
        wsCalls += 1;
      },
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      sleep: async (ms) => {
        slept.push(ms);
      },
    });

    expect(exitCode).toBe(0);
    expect(probeCalls).toBe(2);
    expect(wsCalls).toBe(1);
    expect(heartbeatCalls).toBe(2);
    expect(slept).toEqual([2000]);
    expect(chunks.join("")).toContain("core draining");
    expect(chunks.join("")).toContain("Reconnecting in 2000ms");
  });

  test("connect --ws stops instead of reconnecting when the machine token is rejected", async () => {
    const chunks: string[] = [];
    const slept: number[] = [];

    const exitCode = await runMachineConnectCommand(["--ws"], {
      maxConnectorAttempts: 2,
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
        NOLO_CONNECT_RECONNECT_MS: "7",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: ["codex-cli"],
      }),
      fetchImpl: async (url) => {
        if (String(url).includes("/api/machines/heartbeat")) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (String(url).includes("/api/connector/ws")) {
          return Response.json(
            { error: "Machine token has been revoked.", code: "AUTH_MACHINE_TOKEN_REVOKED" },
            { status: 401 }
          );
        }
        return new Response("not found", { status: 404 });
      },
      connectWebSocket: async () => {
        throw new Error("should not open websocket after auth rejection");
      },
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      sleep: async (ms) => {
        slept.push(ms);
      },
    });

    expect(exitCode).toBe(1);
    expect(slept).toEqual([]);
    expect(chunks.join("")).toContain("AUTH_MACHINE_TOKEN_REVOKED");
    expect(chunks.join("")).not.toContain("Reconnecting in 7ms");
  });

  test("connect --ws returns a clear error result for non-cli payloads without workspace runtime policy", async () => {
    const sentMessages: string[] = [];

    const exitCode = await runMachineConnectCommand(["--ws"], {
      maxConnectorAttempts: 1,
      env: {
        NOLO_SERVER: "https://agent.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write() {} },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: ["codex-cli"],
      }),
      fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      connectWebSocket: async (_url, options) => {
        await options.onMessage(JSON.stringify({
          type: "agent.run",
          requestId: "request-1",
          payload: {
            agentKey: "agent-a",
            userInput: "hello",
            agentConfig: {
              apiSource: "custom",
              prompt: "system prompt",
            },
          },
        }));
        sentMessages.push(...options.sentMessages);
      },
    });

    expect(exitCode).toBe(0);
    expect(sentMessages.map((message) => JSON.parse(message))).toEqual([
      {
        type: "agent.run.result",
        requestId: "request-1",
        error: "Connector can only execute non-CLI agents when runtimeToolPolicySnapshot requests a local workspace runtime.",
      },
    ]);
  });

  test("connect --ws runs non-cli agents through local workspace runtime when policy requests it", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-machine-local-runtime-"));
    const sentMessages: string[] = [];
    const requests: any[] = [];
    let completeCount = 0;
    try {
      const exitCode = await runMachineConnectCommand(["--ws"], {
        maxConnectorAttempts: 1,
        env: {
          NOLO_SERVER: "https://agent.nolo.chat",
          AUTH_TOKEN: "token-abc",
          NOLO_AGENT_WORKDIR: workspaceRoot,
          NOLO_USER_ID: "user-1",
        },
        output: { write() {} },
        machineInfo: () => ({
          machineId: "machine-test",
          name: "Test Machine",
          platform: "linux",
          arch: "x64",
          capabilities: ["shell-readonly"],
        }),
        fetchImpl: async (url, init) => {
          if (String(url).includes("/api/machines/heartbeat")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (String(url).includes("/api/connector/ws")) {
            return new Response(
              JSON.stringify({
                wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
                decision: "fallback",
              }),
              { status: 200 }
            );
          }
          completeCount += 1;
          requests.push(JSON.parse(String(init?.body)));
          if (completeCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-shell",
                    type: "function",
                    function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "workspace runtime done" } }],
          });
        },
        runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
        connectWebSocket: async (_url, options) => {
          await options.onMessage(JSON.stringify({
            type: "agent.run",
            requestId: "request-1",
            payload: {
              agentKey: "agent-local-platform",
              userInput: "run pwd",
              agentConfig: {
                apiSource: "platform",
                provider: "openai",
                model: "qwen-coder",
                prompt: "Use local workspace tools.",
              },
              meta: {
                runtimeToolPolicySnapshot: {
                  version: 1,
                  runtimeTools: ["execShell"],
                  workspace: { mode: "current" },
                  shell: { enabled: true, mode: "worktree" },
                },
              },
            },
          }));
          sentMessages.push(...options.sentMessages);
        },
      });

      expect(exitCode).toBe(0);
      const providerRequest = requests.find((body) => Array.isArray(body.tools));
      expect(providerRequest?.tools.map((tool: any) => tool.function.name)).toContain("execShell");
      const parsed = sentMessages.map((message) => JSON.parse(message));
      expect(parsed.some((message) => message.type === "agent.run.progress")).toBe(true);
      const resultMessage = parsed.find((message) => message.type === "agent.run.result");
      expect(resultMessage).toMatchObject({
        type: "agent.run.result",
        requestId: "request-1",
        result: {
          content: "workspace runtime done",
          artifacts: {
            cwd: workspaceRoot,
            exitStatus: "completed",
          },
        },
      });
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("connect --ws runs non-cli agents in the configured cwd when policy requests local runtime", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-machine-workspace-"));
    const sentMessages: string[] = [];
    const requests: any[] = [];
    let completeCount = 0;
    try {
      await Bun.write(join(workspaceRoot, "README.md"), "base workspace\n");
      runGit(["init"], workspaceRoot);
      runGit(["add", "README.md"], workspaceRoot);
      runGit(["-c", "user.email=test@example.com", "-c", "user.name=Nolo Test", "commit", "-m", "init"], workspaceRoot);

      const exitCode = await runMachineConnectCommand(["--ws"], {
        maxConnectorAttempts: 1,
        env: {
          NOLO_SERVER: "https://agent.nolo.chat",
          AUTH_TOKEN: "token-abc",
          NOLO_AGENT_WORKDIR: workspaceRoot,
          NOLO_USER_ID: "user-1",
        },
        output: { write() {} },
        machineInfo: () => ({
          machineId: "machine-test",
          name: "Test Machine",
          platform: "linux",
          arch: "x64",
          capabilities: ["shell-readonly"],
        }),
        fetchImpl: async (url, init) => {
          if (String(url).includes("/api/machines/heartbeat")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (String(url).includes("/api/connector/ws")) {
            return new Response(
              JSON.stringify({
                wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
                decision: "fallback",
              }),
              { status: 200 }
            );
          }
          completeCount += 1;
          requests.push(JSON.parse(String(init?.body)));
          if (completeCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-shell",
                    type: "function",
                    function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "workspace run done" } }],
          });
        },
        runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
        connectWebSocket: async (_url, options) => {
          await options.onMessage(JSON.stringify({
            type: "agent.run",
            requestId: "request-1",
            payload: {
              agentKey: "agent-local-platform",
              userInput: "run pwd",
              agentConfig: {
                apiSource: "platform",
                provider: "openai",
                model: "qwen-coder",
                prompt: "Use local workspace tools.",
              },
              meta: {
                runtimeToolPolicySnapshot: {
                  version: 1,
                  runtimeTools: ["execShell"],
                  workspace: { mode: "current" },
                  shell: { enabled: true, mode: "worktree" },
                },
              },
            },
          }));
          sentMessages.push(...options.sentMessages);
        },
      });

      expect(exitCode).toBe(0);
      expect(requests.some((body) => Array.isArray(body.tools))).toBe(true);
      const parsed = sentMessages.map((message) => JSON.parse(message));
      expect(parsed.some((message) => message.type === "agent.run.progress")).toBe(true);
      const resultMessage = parsed.find((message) => message.type === "agent.run.result");
      const cwd = resultMessage?.result?.artifacts?.cwd;
      expect(cwd).toBe(workspaceRoot);
      expect(resultMessage?.result?.trace?.some((message: any) =>
        message?.tool_result_metadata?.workspaceKind === "current"
      )).toBe(true);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("connect --ws runs cli agents in the configured cwd when runtime policy requests local runtime", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-machine-cli-workspace-"));
    const sentMessages: string[] = [];
    const executed: any[] = [];
    try {
      await Bun.write(join(workspaceRoot, "README.md"), "base workspace\n");
      runGit(["init"], workspaceRoot);
      runGit(["add", "README.md"], workspaceRoot);
      runGit(["-c", "user.email=test@example.com", "-c", "user.name=Nolo Test", "commit", "-m", "init"], workspaceRoot);

      const exitCode = await runMachineConnectCommand(["--ws"], {
        maxConnectorAttempts: 1,
        env: {
          NOLO_SERVER: "https://agent.nolo.chat",
          AUTH_TOKEN: "token-abc",
          NOLO_AGENT_WORKDIR: workspaceRoot,
        },
        output: { write() {} },
        machineInfo: () => ({
          machineId: "machine-test",
          name: "Test Machine",
          platform: "linux",
          arch: "x64",
          capabilities: ["codex-cli"],
        }),
        fetchImpl: async (url) => {
          if (String(url).includes("/api/machines/heartbeat")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (String(url).includes("/api/connector/ws")) {
            return new Response(
              JSON.stringify({
                wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
                decision: "fallback",
              }),
              { status: 200 }
            );
          }
          return new Response("not found", { status: 404 });
        },
        executeCli: async (provider, prompt, options) => {
          executed.push({ provider, prompt, options });
          return { text: "cli workspace ok", raw: "cli workspace ok", elapsed: 10 };
        },
        runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
        connectWebSocket: async (_url, options) => {
          await options.onMessage(JSON.stringify({
            type: "agent.run",
            requestId: "request-1",
            payload: {
              agentKey: "agent-codex",
              userInput: "edit README.md",
              agentConfig: {
                apiSource: "cli",
                cliProvider: "codex",
                model: "",
                prompt: "system prompt",
                runtimeToolPolicy: {
                  version: 1,
                  runtimeTools: ["execShell"],
                  workspace: { mode: "current" },
                  shell: { enabled: true, mode: "worktree" },
                },
              },
            },
          }));
          sentMessages.push(...options.sentMessages);
        },
      });

      expect(exitCode).toBe(0);
      expect(executed).toHaveLength(1);
      expect(executed[0].options.cwd).toBe(workspaceRoot);
      expect(executed[0].prompt).toContain("File writes are allowed.");
      expect(executed[0].prompt).toContain("Arbitrary shell commands are allowed.");
      const parsed = sentMessages.map((message) => JSON.parse(message));
      expect(parsed.at(-1)).toMatchObject({
        type: "agent.run.result",
        requestId: "request-1",
        result: {
          content: "cli workspace ok",
          model: "codex",
          artifacts: {
            cwd: executed[0].options.cwd,
            exitStatus: "completed",
          },
        },
      });
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("connect --ws scopes explicit cli machine permissions to the configured cwd", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-machine-cli-workspace-"));
    const sentMessages: string[] = [];
    const executed: any[] = [];
    try {
      await Bun.write(join(workspaceRoot, "README.md"), "base workspace\n");
      runGit(["init"], workspaceRoot);
      runGit(["add", "README.md"], workspaceRoot);
      runGit(["-c", "user.email=test@example.com", "-c", "user.name=Nolo Test", "commit", "-m", "init"], workspaceRoot);

      const exitCode = await runMachineConnectCommand(["--ws"], {
        maxConnectorAttempts: 1,
        env: {
          NOLO_SERVER: "https://agent.nolo.chat",
          AUTH_TOKEN: "token-abc",
          NOLO_AGENT_WORKDIR: workspaceRoot,
        },
        output: { write() {} },
        machineInfo: () => ({
          machineId: "machine-test",
          name: "Test Machine",
          platform: "linux",
          arch: "x64",
          capabilities: ["codex-cli"],
        }),
        fetchImpl: async (url) => {
          if (String(url).includes("/api/machines/heartbeat")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (String(url).includes("/api/connector/ws")) {
            return new Response(
              JSON.stringify({
                wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
                decision: "fallback",
              }),
              { status: 200 }
            );
          }
          return new Response("not found", { status: 404 });
        },
        executeCli: async (provider, prompt, options) => {
          executed.push({ provider, prompt, options });
          return { text: "cli workspace ok", raw: "cli workspace ok", elapsed: 10 };
        },
        runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
        connectWebSocket: async (_url, options) => {
          await options.onMessage(JSON.stringify({
            type: "agent.run",
            requestId: "request-1",
            payload: {
              agentKey: "agent-reviewer",
              userInput: "review commit",
              agentConfig: {
                apiSource: "cli",
                cliProvider: "codex",
                prompt: "reviewer prompt",
                machinePermissions: {
                  mode: "full_access",
                  allowFilesystemRead: true,
                  allowFilesystemWrite: true,
                  allowShell: true,
                  writableRoots: ["/root/bun-nolo", "/tmp"],
                },
                runtimeToolPolicy: {
                  version: 1,
                  runtimeTools: ["execShell"],
                  workspace: { mode: "current" },
                  shell: { enabled: true, mode: "worktree" },
                },
              },
            },
          }));
          sentMessages.push(...options.sentMessages);
        },
      });

      expect(exitCode).toBe(0);
      expect(executed).toHaveLength(1);
      expect(executed[0].options.cwd).toBe(workspaceRoot);
      expect(executed[0].prompt).toContain(`Writable roots: ${executed[0].options.cwd}`);
      expect(executed[0].prompt).not.toContain("Writable roots: /root/bun-nolo, /tmp");
      const parsed = sentMessages.map((message) => JSON.parse(message));
      expect(parsed.at(-1)?.result?.artifacts?.cwd).toBe(executed[0].options.cwd);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("connect --ws blocks dangerous machine tasks before invoking a local cli", async () => {
    const sentMessages: string[] = [];
    const executed: any[] = [];

    const exitCode = await runMachineConnectCommand(["--ws"], {
      maxConnectorAttempts: 1,
      env: {
        NOLO_SERVER: "https://agent.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write() {} },
      machineInfo: () => ({
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: ["copilot-cli"],
      }),
      fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      executeCli: async (provider, prompt, options) => {
        executed.push({ provider, prompt, options });
        return { text: "should not execute" };
      },
      connectWebSocket: async (_url, options) => {
        await options.onMessage(JSON.stringify({
          type: "agent.run",
          requestId: "request-1",
          payload: {
            agentKey: "agent-a",
            userInput: "delete ~/.ssh/config",
            agentConfig: {
              apiSource: "cli",
              cliProvider: "copilot",
              machinePermissions: {
                mode: "read_only",
                allowFilesystemRead: true,
                allowFilesystemWrite: false,
                allowShell: false,
                writableRoots: [],
              },
            },
          },
        }));
        sentMessages.push(...options.sentMessages);
      },
    });

    expect(exitCode).toBe(0);
    expect(executed).toEqual([]);
    expect(sentMessages.map((message) => JSON.parse(message))).toEqual([
      {
        type: "agent.run.result",
        requestId: "request-1",
        error: "Machine permission denied: this bound machine agent is read-only for filesystem writes. Enable machine write permission for this agent before asking it to modify files.",
      },
    ]);
  });

});
