import { describe, expect, test } from "bun:test";

import {
  runAgentEmailBindCommand,
  runAgentEmailProvisionCommand,
} from "./agentEmailCommands";

function createMemoryDb() {
  const values = new Map<string, any>();
  return {
    values,
    async get(key: string) {
      return values.get(key);
    },
    async put(key: string, value: any) {
      values.set(key, value);
    },
    async del(key: string) {
      values.delete(key);
    },
    async batch(ops: Array<{ type: "put"; key: string; value: any }>) {
      for (const op of ops) values.set(op.key, op.value);
    },
    async *iterator() {},
  };
}

const TEST_TOKEN = `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`;

describe("cli agent email commands", () => {
  test("agent email provision posts provisionAgentEmailIdentity RPC", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; body?: string }> = [];
    const db = createMemoryDb();

    const exitCode = await runAgentEmailProvisionCommand(
      [
        "agent-user-1-pay-mgmt",
        "--purpose",
        "payment",
        "--local-part",
        "pay",
      ],
      {
        env: {
          AUTH_TOKEN: TEST_TOKEN,
          NOLO_SERVER: "https://env.nolo.chat",
        },
        output: { write(chunk) { chunks.push(String(chunk)); } },
        db: db as any,
        fetchImpl: async (url, init) => {
          requests.push({
            url: String(url),
            body: typeof init?.body === "string" ? init.body : undefined,
          });
          return Response.json({
            agentId: "agent-user-1-pay-mgmt",
            emailAddress: "pay@nolo.chat",
            localPart: "pay",
            domain: "nolo.chat",
            provider: "cloudflare",
            purpose: "payment",
            readinessStatus: "pending",
            ingressReadyAt: null,
            lastWarmupAt: null,
            lastWarmupError: null,
            agent: {
              dbKey: "agent-user-1-pay-mgmt",
              meta: { emailAddress: "pay@nolo.chat" },
            },
          });
        },
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(
      "https://env.nolo.chat/rpc/provisionAgentEmailIdentity"
    );
    const body = JSON.parse(requests[0]?.body ?? "{}");
    expect(body.agentId).toBe("agent-user-1-pay-mgmt");
    expect(body.purpose).toBe("payment");
    expect(body.localPart).toBe("pay");
    expect(body.makePrimary).toBe(true);

    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.ok).toBe(true);
    expect(parsed.emailAddress).toBe("pay@nolo.chat");
    expect(db.values.get("agent-user-1-pay-mgmt")?.meta?.emailAddress).toBe(
      "pay@nolo.chat"
    );
  });

  test("agent email bind requires --email", async () => {
    const chunks: string[] = [];
    const exitCode = await runAgentEmailBindCommand(["agent-user-1-a"], {
      env: { AUTH_TOKEN: TEST_TOKEN },
      output: { write(chunk) { chunks.push(String(chunk)); } },
    });
    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("Usage:");
  });

  test("agent email bind posts bindAgentEmailIdentity RPC", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; body?: string }> = [];

    const exitCode = await runAgentEmailBindCommand(
      ["agent-user-1-a", "--email", "pay@nolo.chat", "--provider", "cloudflare"],
      {
        env: {
          AUTH_TOKEN: TEST_TOKEN,
          NOLO_SERVER: "https://env.nolo.chat",
        },
        output: { write(chunk) { chunks.push(String(chunk)); } },
        db: createMemoryDb() as any,
        fetchImpl: async (url, init) => {
          requests.push({
            url: String(url),
            body: typeof init?.body === "string" ? init.body : undefined,
          });
          return Response.json({
            agentId: "agent-user-1-a",
            emailAddress: "pay@nolo.chat",
            readinessStatus: "ready",
            ingressReadyAt: "2026-01-01T00:00:00.000Z",
            lastWarmupAt: null,
            lastWarmupError: null,
            agent: { dbKey: "agent-user-1-a" },
          });
        },
      }
    );

    expect(exitCode).toBe(0);
    expect(requests[0]?.url).toBe(
      "https://env.nolo.chat/rpc/bindAgentEmailIdentity"
    );
    const body = JSON.parse(requests[0]?.body ?? "{}");
    expect(body.emailAddress).toBe("pay@nolo.chat");
    expect(body.provider).toBe("cloudflare");

    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.action).toBe("bind");
  });
});