import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  __resetDesktopLocalConnectorClientForTest,
  startDesktopLocalConnectorFromSession,
} from "./desktopLocalConnectorClient";

beforeEach(() => {
  __resetDesktopLocalConnectorClientForTest();
  delete (globalThis as any).window;
});

describe("desktop local connector client", () => {
  it("posts the signed-in server and token to the desktop runtime endpoint", async () => {
    const fetchImpl = mock(async () =>
      new Response(JSON.stringify({ ok: true, started: true, machineId: "machine-mac" }))
    );
    (globalThis as any).window = {};

    const result = await startDesktopLocalConnectorFromSession({
      serverUrl: "https://us.nolo.chat/",
      authToken: "token-123",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ ok: true, status: "started", machineId: "machine-mac" });
    expect((globalThis as any).window.__NOLO_CURRENT_MACHINE_ID__).toBe("machine-mac");
    expect((globalThis as any).window.__NOLO_MACHINE_ID__).toBe("machine-mac");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const calls = fetchImpl.mock.calls as any[];
    expect(calls[0][0]).toBe("/api/desktop/local-connector/start");
    expect(JSON.parse(String(calls[0][1]?.body))).toEqual({
      serverUrl: "https://us.nolo.chat",
      authToken: "token-123",
    });
  });

  it("deduplicates repeated starts for the same signed-in session", async () => {
    const fetchImpl = mock(async () =>
      new Response(JSON.stringify({ ok: true, started: true, machineId: "machine-mac" }))
    );
    const args = {
      serverUrl: "https://us.nolo.chat",
      authToken: "token-123",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    };

    await startDesktopLocalConnectorFromSession(args);
    const second = await startDesktopLocalConnectorFromSession(args);

    expect(second).toEqual({ ok: true, status: "already-started", machineId: "machine-mac" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns an error result when the desktop runtime rejects the start", async () => {
    const fetchImpl = mock(async () =>
      new Response(JSON.stringify({ error: "Desktop runtime only" }), { status: 404 })
    );

    const result = await startDesktopLocalConnectorFromSession({
      serverUrl: "https://us.nolo.chat",
      authToken: "token-123",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({
      ok: false,
      status: "skipped",
      error: "Desktop runtime only",
    });
  });
});
