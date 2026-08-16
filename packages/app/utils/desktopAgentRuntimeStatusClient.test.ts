import { afterEach, describe, expect, test } from "bun:test";

import { fetchDesktopAgentRuntimeStatus } from "./desktopAgentRuntimeStatusClient";

describe("desktop agent runtime status client", () => {
  const previousFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = previousFetch;
  });

  test("fetches the desktop agent runtime status endpoint", async () => {
    const requests: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requests.push(String(input));
      return new Response(JSON.stringify({
        ok: true,
        host: "desktop",
        providerRuntimeState: "running",
        localCapabilities: ["agent-config", "provider", "persistence"],
        decision: {
          mode: "local",
          runnable: true,
          reason: "local runtime capabilities are available",
          missingLocalCapabilities: [],
          syncAfterRun: false,
        },
        missingLocalCapabilities: [],
      }));
    }) as unknown as typeof fetch;

    const status = await fetchDesktopAgentRuntimeStatus();

    expect(requests).toEqual(["/api/desktop/agent-runtime/status"]);
    expect(status).toMatchObject({
      ok: true,
      host: "desktop",
      decision: { mode: "local" },
    });
  });
});
