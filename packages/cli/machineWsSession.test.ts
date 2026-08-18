import { describe, expect, test } from "bun:test";

import { runMachineWsSession } from "./machineWsSession";
import { ConnectorWebSocketRetryableError } from "./connectorWebSocketTarget";

const MACHINE = {
  machineId: "machine-test",
  name: "Test Machine",
  platform: "linux",
  arch: "x64",
  capabilities: ["codex-cli"],
};

function createAbortBoundHeartbeatLoop(onTick?: () => Promise<void> | void) {
  return ({ intervalMs, sendHeartbeat, signal }: {
    intervalMs?: number;
    sendHeartbeat: () => Promise<void>;
    signal?: AbortSignal;
  }) =>
    new Promise<void>((resolve, reject) => {
      void intervalMs;
      const handleAbort = () => {
        signal?.removeEventListener("abort", handleAbort);
        resolve();
      };
      signal?.addEventListener("abort", handleAbort, { once: true });
      Promise.resolve(onTick?.())
        .then(() => sendHeartbeat())
        .catch(reject);
    });
}

describe("cli machine ws session", () => {
  test("heartbeats and opens the connector websocket", async () => {
    const events: string[] = [];
    let wsUrl = "";
    let wsHeaders: Record<string, string> = {};

    const exitCode = await runMachineWsSession({
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write(chunk) { events.push(String(chunk)); } },
      machine: MACHINE as any,
      serverUrl: "https://alpha-agent-a.nolo.chat",
      authToken: "token-abc",
      sendHeartbeat: async () => {
        events.push("heartbeat");
      },
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      resolveConnectorWebSocketTarget: async () =>
        "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
      connectWebSocket: async (url, options) => {
        wsUrl = url;
        wsHeaders = options.headers;
      },
      onMessage: async () => undefined,
    });

    expect(exitCode).toEqual({ exitCode: 0 });
    expect(events[0]).toBe("heartbeat");
    expect(events[1]).toContain("Connector websocket connected");
    expect(wsUrl).toBe("wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test");
    expect(wsHeaders).toEqual({ Authorization: "Bearer token-abc" });
  });

  test("keeps heartbeating while the websocket is open", async () => {
    let heartbeatCalls = 0;
    let heartbeatLoopCalls = 0;
    let releaseWebsocket!: () => void;
    const websocketDone = new Promise<void>((resolve) => {
      releaseWebsocket = resolve;
    });

    const exitCode = await runMachineWsSession({
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
        NOLO_CONNECT_HEARTBEAT_MS: "2345",
      },
      output: { write() {} },
      machine: MACHINE as any,
      serverUrl: "https://alpha-agent-a.nolo.chat",
      authToken: "token-abc",
      sendHeartbeat: async () => {
        heartbeatCalls += 1;
      },
      runHeartbeatLoop: ({ intervalMs, sendHeartbeat, signal }) =>
        new Promise<void>((resolve, reject) => {
          const finish = () => {
            signal?.removeEventListener("abort", finish);
            resolve();
          };
          signal?.addEventListener("abort", finish, { once: true });
          Promise.resolve()
            .then(async () => {
              heartbeatLoopCalls += 1;
              expect(intervalMs).toBe(2345);
              expect(signal?.aborted).toBe(false);
              await sendHeartbeat();
              await sendHeartbeat();
              releaseWebsocket();
            })
            .catch(reject);
        }),
      resolveConnectorWebSocketTarget: async () =>
        "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
      connectWebSocket: async () => {
        await websocketDone;
      },
      onMessage: async () => undefined,
    });

    expect(exitCode).toEqual({ exitCode: 0 });
    expect(heartbeatLoopCalls).toBe(1);
    expect(heartbeatCalls).toBe(3);
  });

  test("flushes sent messages through the websocket onMessage callback", async () => {
    const sentMessages: string[] = [];

    const exitCode = await runMachineWsSession({
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write() {} },
      machine: MACHINE as any,
      serverUrl: "https://alpha-agent-a.nolo.chat",
      authToken: "token-abc",
      sendHeartbeat: async () => undefined,
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      resolveConnectorWebSocketTarget: async () =>
        "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
      connectWebSocket: async (_url, options) => {
        await options.onMessage(JSON.stringify({ type: "agent.run", requestId: "request-1" }));
        sentMessages.push(...options.sentMessages);
      },
      onMessage: async (_message, send) => {
        send(JSON.stringify({ type: "agent.run.result", requestId: "request-1", result: { ok: true } }));
      },
    });

    expect(exitCode).toEqual({ exitCode: 0 });
    expect(sentMessages).toEqual([
      JSON.stringify({ type: "agent.run.result", requestId: "request-1", result: { ok: true } }),
    ]);
  });

  test("waits for heartbeat cleanup before returning a websocket failure", async () => {
    const events: string[] = [];
    let heartbeatCleanedUp = false;

    const exitCode = await runMachineWsSession({
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write(chunk) { events.push(String(chunk)); } },
      machine: MACHINE as any,
      serverUrl: "https://alpha-agent-a.nolo.chat",
      authToken: "token-abc",
      sendHeartbeat: async () => undefined,
      runHeartbeatLoop: ({ signal }) =>
        new Promise<void>((resolve) => {
          signal?.addEventListener(
            "abort",
            () => {
              heartbeatCleanedUp = true;
              resolve();
            },
            { once: true },
          );
        }),
      resolveConnectorWebSocketTarget: async () =>
        "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
      connectWebSocket: async () => {
        throw new Error("connector websocket failed");
      },
      onMessage: async () => undefined,
    });

    expect(exitCode).toEqual({ exitCode: 1 });
    expect(heartbeatCleanedUp).toBe(true);
    expect(events.at(-1)).toContain("connector websocket failed");
  });

  test("returns retryAfter metadata when the connector target is temporarily draining", async () => {
    const events: string[] = [];

    const result = await runMachineWsSession({
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write(chunk) { events.push(String(chunk)); } },
      machine: MACHINE as any,
      serverUrl: "https://alpha-agent-a.nolo.chat",
      authToken: "token-abc",
      sendHeartbeat: async () => undefined,
      runHeartbeatLoop: createAbortBoundHeartbeatLoop(),
      resolveConnectorWebSocketTarget: async () => {
        throw new ConnectorWebSocketRetryableError("Server draining", {
          reason: "core_draining",
          retryAfterMs: 2_000,
        });
      },
      connectWebSocket: async () => {
        throw new Error("should not connect websocket while draining");
      },
      onMessage: async () => undefined,
    });

    expect(result).toEqual({
      exitCode: 1,
      reconnectReason: "core_draining",
      retryAfterMs: 2_000,
    });
    expect(events.at(-1)).toContain("core draining");
  });

  test("stops the connector websocket cleanly when an external signal aborts", async () => {
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    let heartbeatCleanedUp = false;

    const exitCode = await runMachineWsSession({
      env: {
        NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write() {} },
      machine: MACHINE as any,
      serverUrl: "https://alpha-agent-a.nolo.chat",
      authToken: "token-abc",
      signal: controller.signal,
      sendHeartbeat: async () => undefined,
      runHeartbeatLoop: ({ signal }) =>
        new Promise<void>((resolve) => {
          signal?.addEventListener(
            "abort",
            () => {
              heartbeatCleanedUp = true;
              resolve();
            },
            { once: true },
          );
        }),
      resolveConnectorWebSocketTarget: async () =>
        "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-test",
      connectWebSocket: async (_url, options) => {
        receivedSignal = options.signal;
        await new Promise<void>((resolve) => {
          options.signal?.addEventListener("abort", () => resolve(), { once: true });
          controller.abort("desktop-close");
        });
      },
      onMessage: async () => undefined,
    });

    expect(exitCode).toEqual({ exitCode: 0 });
    expect(receivedSignal).toBe(controller.signal);
    expect(heartbeatCleanedUp).toBe(true);
  });
});
