import { describe, expect, test } from "bun:test";

import {
  createChromeConnectorClient,
  createNativeHostRouter,
  createVerifiedChromeConnectorClient,
  executeChromeConnectorTool,
  NOLO_CHROME_CONNECTOR_EXTENSION_ID,
} from "./chromeConnector";

describe("Nolo desktop Chrome connector", () => {
  test("routes native host messages by request id", async () => {
    const router = createNativeHostRouter({
      sendToExtension: async (message) => ({
        id: message.id,
        ok: true,
        result: { pong: true, action: message.action },
      }),
    });

    await expect(router.request("ping", {})).resolves.toEqual({
      pong: true,
      action: "ping",
    });
  });

  test("normalizes unknown native host actions into structured errors", async () => {
    const router = createNativeHostRouter({
      sendToExtension: async (message) => ({
        id: message.id,
        ok: false,
        error: {
          code: "UNKNOWN_ACTION",
          message: `Unknown Chrome connector action: ${message.action}`,
        },
      }),
    });

    await expect(router.request("missing_action", {})).rejects.toMatchObject({
      code: "UNKNOWN_ACTION",
      message: "Unknown Chrome connector action: missing_action",
    });
  });

  test("returns structured unavailable errors from desktop tool execution", async () => {
    const client = createChromeConnectorClient({
      request: async () => {
        const error = new Error("Chrome extension is not connected.") as Error & { code?: string };
        error.code = "CHROME_CONNECTOR_UNAVAILABLE";
        throw error;
      },
    });

    await expect(executeChromeConnectorTool({
      client,
      call: {
        id: "tool-1",
        name: "chrome_list_tabs",
        arguments: "{}",
      },
    })).resolves.toEqual({
      content: JSON.stringify({
        ok: false,
        error: {
          code: "CHROME_CONNECTOR_UNAVAILABLE",
          message: "Chrome extension is not connected.",
        },
      }),
      metadata: {
        chromeConnector: true,
        error: true,
        code: "CHROME_CONNECTOR_UNAVAILABLE",
      },
    });
  });

  test("normalizes RPC transport failures as connector unavailable", async () => {
    const client = createChromeConnectorClient({
      fetchImpl: async () => {
        throw new Error("connection refused");
      },
    });

    await expect(executeChromeConnectorTool({
      client,
      call: {
        id: "tool-1",
        name: "chrome_list_tabs",
        arguments: "{}",
      },
    })).resolves.toMatchObject({
      metadata: {
        chromeConnector: true,
        error: true,
        code: "CHROME_CONNECTOR_UNAVAILABLE",
      },
    });
  });

  test("sends the connector token header to the local RPC endpoint", async () => {
    const requests: Array<{ headers: Headers; body: unknown }> = [];
    const client = createChromeConnectorClient({
      token: "secret-token",
      fetchImpl: async (_input, init) => {
        requests.push({
          headers: new Headers(init?.headers),
          body: JSON.parse(String(init?.body)),
        });
        return new Response(JSON.stringify({ ok: true, result: { tabs: [] } }));
      },
    });

    await expect(client.request("list_tabs", {})).resolves.toEqual({ tabs: [] });
    expect(requests[0].headers.get("x-nolo-chrome-connector-token")).toBe("secret-token");
    expect(requests[0].headers.get("content-type")).toBe("application/json");
    expect(requests[0].body).toEqual({ action: "list_tabs", payload: {} });
  });

  test("verified client refuses to execute tools before connector_info matches", async () => {
    const calls: string[] = [];
    const client = createVerifiedChromeConnectorClient({
      client: {
        request: async (action) => {
          calls.push(action);
          if (action === "connector_info") return { extensionId: "old-extension" };
          return { tabs: [{ id: 1 }] };
        },
      },
    });

    await expect(client.request("list_tabs", {})).rejects.toMatchObject({
      code: "CHROME_CONNECTOR_EXTENSION_MISMATCH",
    });
    expect(calls).toEqual(["connector_info"]);
  });

  test("verified client executes the requested action after a matching connector_info handshake", async () => {
    const calls: string[] = [];
    const client = createVerifiedChromeConnectorClient({
      client: {
        request: async (action) => {
          calls.push(action);
          if (action === "connector_info") {
            return { extensionId: NOLO_CHROME_CONNECTOR_EXTENSION_ID };
          }
          return { tabs: [{ id: 1 }] };
        },
      },
    });

    await expect(client.request("list_tabs", {})).resolves.toEqual({ tabs: [{ id: 1 }] });
    await expect(client.request("list_tabs", {})).resolves.toEqual({ tabs: [{ id: 1 }] });
    expect(calls).toEqual(["connector_info", "list_tabs", "list_tabs"]);
  });
});
