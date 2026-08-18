import { afterEach, describe, expect, it } from "bun:test";
import {
  runAgentGrantCommand,
  runAgentGrantsListCommand,
  runAgentRevokeGrantCommand,
} from "./agentGrantCommands";

describe("agentGrantCommands", () => {
  const calls: Array<{ url: string; method?: string; body?: any }> = [];

  afterEach(() => {
    calls.length = 0;
  });

  const fetchImpl = (async (url: any, init?: any) => {
    const method = init?.method || "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    if (method === "GET") {
      return new Response(
        JSON.stringify({
          ok: true,
          grants: [{ granteeUserId: "user-B", createdAt: 1 }],
        }),
        { status: 200 },
      );
    }
    if (method === "DELETE") {
      return new Response(
        JSON.stringify({
          ok: true,
          grant: { granteeUserId: "user-B", revokedAt: 2 },
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        ok: true,
        grant: {
          ownerUserId: "user-A",
          granteeUserId: "user-B",
          agentKey: "agent-user-A-agent-1",
        },
      }),
      { status: 200 },
    );
  }) as any;

  // Minimal JWT-ish payload with userId for parseUserIdFromAuthToken
  const token = `hdr.${Buffer.from(JSON.stringify({ userId: "user-A" })).toString("base64")}.sig`;

  it("grants via POST /api/agent-grants", async () => {
    const logs: string[] = [];
    const code = await runAgentGrantCommand(
      ["agent-user-A-agent-1", "--to", "user-B"],
      {
        env: {
          AUTH_TOKEN: token,
          NOLO_SERVER: "https://nolo.example.com",
        },
        output: { write: (chunk) => logs.push(String(chunk)) },
        fetchImpl,
      },
    );
    expect(code).toBe(0);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toContain("/api/agent-grants");
    expect(calls[0]?.body).toEqual({
      agentKey: "agent-user-A-agent-1",
      granteeUserId: "user-B",
    });
    expect(logs.join("")).toContain("Granted");
  });

  it("lists grants", async () => {
    const logs: string[] = [];
    const code = await runAgentGrantsListCommand(["agent-user-A-agent-1"], {
      env: {
        AUTH_TOKEN: token,
        NOLO_SERVER: "https://nolo.example.com",
      },
      output: { write: (chunk) => logs.push(String(chunk)) },
      fetchImpl,
    });
    expect(code).toBe(0);
    expect(calls[0]?.method).toBe("GET");
    expect(logs.join("")).toContain("user-B");
  });

  it("revokes grants", async () => {
    const logs: string[] = [];
    const code = await runAgentRevokeGrantCommand(
      ["agent-user-A-agent-1", "--from", "user-B"],
      {
        env: {
          AUTH_TOKEN: token,
          NOLO_SERVER: "https://nolo.example.com",
        },
        output: { write: (chunk) => logs.push(String(chunk)) },
        fetchImpl,
      },
    );
    expect(code).toBe(0);
    expect(calls[0]?.method).toBe("DELETE");
    expect(logs.join("")).toContain("Revoked");
  });
});
