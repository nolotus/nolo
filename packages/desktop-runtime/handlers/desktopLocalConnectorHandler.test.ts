import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  __resetDesktopLocalConnectorStartForTest,
  handleDesktopLocalConnectorStart,
} from "./desktopLocalConnectorHandler";

const originalDesktopEnv = process.env.NOLO_DESKTOP;

function request(body: Record<string, unknown>) {
  return new Request("http://127.0.0.1:3233/api/desktop/local-connector/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("desktop local connector handler", () => {
  afterEach(() => {
    process.env.NOLO_DESKTOP = originalDesktopEnv;
    __resetDesktopLocalConnectorStartForTest();
    mock.restore();
  });

  test("is unavailable outside the desktop runtime", async () => {
    delete process.env.NOLO_DESKTOP;
    const response = await handleDesktopLocalConnectorStart(request({
      serverUrl: "https://us.nolo.chat",
      authToken: "token-abc",
    }));

    expect(response.status).toBe(404);
  });

  test("starts an in-process websocket connector with the signed-in desktop server and token", async () => {
    process.env.NOLO_DESKTOP = "1";
    const runConnect = mock(async () => {
      await new Promise(() => undefined);
      return 0;
    });
    const response = await handleDesktopLocalConnectorStart(request({
      serverUrl: "https://us.nolo.chat/",
      authToken: "token-abc",
    }), {
      runConnect,
      machineInfo: () => ({ machineId: "machine-mac" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      started: true,
      machineId: "machine-mac",
    });
    expect(runConnect).toHaveBeenCalledTimes(1);
    const calls = runConnect.mock.calls as any[];
    expect(calls[0]?.[0]).toEqual(["--ws"]);
    expect(calls[0]?.[1]?.env.NOLO_SERVER).toBe("https://us.nolo.chat");
    expect(calls[0]?.[1]?.env.AUTH_TOKEN).toBe("token-abc");
    expect(calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  test("deduplicates repeated starts for the same server and token", async () => {
    process.env.NOLO_DESKTOP = "1";
    const runConnect = mock(async () => {
      await new Promise(() => undefined);
      return 0;
    });
    await handleDesktopLocalConnectorStart(request({
      serverUrl: "https://us.nolo.chat",
      authToken: "token-abc",
    }), {
      runConnect,
      machineInfo: () => ({ machineId: "machine-mac" }),
    });
    const response = await handleDesktopLocalConnectorStart(request({
      serverUrl: "https://us.nolo.chat",
      authToken: "token-abc",
    }), {
      runConnect,
      machineInfo: () => ({ machineId: "machine-mac" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      started: false,
      reason: "already-started",
      machineId: "machine-mac",
    });
    expect(runConnect).toHaveBeenCalledTimes(1);
  });

  test("aborts the previous websocket connector when a new session starts", async () => {
    process.env.NOLO_DESKTOP = "1";
    const signals: AbortSignal[] = [];
    const runConnect = mock(async (_args, deps) => {
      if (deps.signal) signals.push(deps.signal);
      await new Promise(() => undefined);
      return 0;
    });

    await handleDesktopLocalConnectorStart(request({
      serverUrl: "https://us.nolo.chat",
      authToken: "token-abc",
    }), {
      runConnect,
      machineInfo: () => ({ machineId: "machine-mac" }),
    });
    await handleDesktopLocalConnectorStart(request({
      serverUrl: "https://us.nolo.chat",
      authToken: "token-def",
    }), {
      runConnect,
      machineInfo: () => ({ machineId: "machine-mac" }),
    });

    expect(runConnect).toHaveBeenCalledTimes(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  test("does not mark a connector started when the websocket exits immediately", async () => {
    process.env.NOLO_DESKTOP = "1";
    const runConnect = mock(async () => 0);

    const response = await handleDesktopLocalConnectorStart(request({
      serverUrl: "https://us.nolo.chat",
      authToken: "token-abc",
    }), {
      runConnect,
      machineInfo: () => ({ machineId: "machine-mac" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Connector exited before staying online with code 0",
    });
  });
});
