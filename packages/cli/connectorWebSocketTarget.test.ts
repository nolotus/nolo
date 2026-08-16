import { describe, expect, it, mock } from "bun:test";

import { resolveConnectorWebSocketTarget } from "./connectorWebSocketTarget";

describe("resolveConnectorWebSocketTarget", () => {
  it("uses preview-discovered fallback websocket targets", async () => {
    const fetchImpl = mock(async () =>
      Response.json({
        wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-1",
        decision: "fallback",
      })
    );

    const target = await resolveConnectorWebSocketTarget({
      serverUrl: "https://alpha-agent-a.nolo.chat",
      machineId: "machine-1",
      headers: { Authorization: "Bearer token-abc" },
      fetchImpl,
    });

    expect(target).toBe(
      "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-1"
    );
  });

  it("falls back to the direct websocket url against legacy servers", async () => {
    const fetchImpl = mock(async () => new Response("Not found", { status: 404 }));

    const target = await resolveConnectorWebSocketTarget({
      serverUrl: "https://alpha-agent-a.nolo.chat",
      machineId: "machine-1",
      headers: { Authorization: "Bearer token-abc" },
      fetchImpl,
    });

    expect(target).toBe(
      "wss://alpha-agent-a.nolo.chat/api/connector/ws?machineId=machine-1"
    );
  });

  it("passes connector surface through discovery and direct websocket urls", async () => {
    const fetchImpl = mock(async () => new Response("Not found", { status: 404 }));

    const target = await resolveConnectorWebSocketTarget({
      serverUrl: "https://alpha-agent-a.nolo.chat",
      machineId: "machine-1",
      connectorSurface: "CLI",
      headers: { Authorization: "Bearer token-abc" },
      fetchImpl,
    });

    expect(String((fetchImpl.mock.calls as any[])[0]?.[0])).toContain("connectorSurface=cli");
    expect(target).toBe(
      "wss://alpha-agent-a.nolo.chat/api/connector/ws?machineId=machine-1&connectorSurface=cli"
    );
  });

  it("treats auth failures as terminal connector errors", async () => {
    const fetchImpl = mock(async () =>
      Response.json(
        { error: "Machine token has been revoked.", code: "AUTH_MACHINE_TOKEN_REVOKED" },
        { status: 401 }
      )
    );

    await expect(resolveConnectorWebSocketTarget({
      serverUrl: "https://alpha-agent-a.nolo.chat",
      machineId: "machine-1",
      headers: { Authorization: "Bearer token-abc" },
      fetchImpl,
    })).rejects.toThrow("AUTH_MACHINE_TOKEN_REVOKED");
  });

  it("surfaces core draining probe responses as retryable connector errors", async () => {
    const fetchImpl = mock(async () =>
      Response.json(
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
      )
    );

    await expect(
      resolveConnectorWebSocketTarget({
        serverUrl: "https://alpha-agent-a.nolo.chat",
        machineId: "machine-1",
        headers: { Authorization: "Bearer token-abc" },
        fetchImpl,
      })
    ).rejects.toMatchObject({
      name: "ConnectorWebSocketRetryableError",
      retryAfterMs: 2000,
      reason: "core_draining",
    });
  });
});
