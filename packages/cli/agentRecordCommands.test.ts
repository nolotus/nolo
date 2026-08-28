import { describe, expect, test } from "bun:test";

import { LOCAL_CODEX_AGENT_KEY } from "./agentAliases";
import { runAgentReadCommand, runAgentCreateCommand } from "./agentRecordCommands";

function createMemoryDb() {
  const values = new Map<string, any>();
  return {
    values,
    async get(key: string) {
      if (!values.has(key)) throw new Error(`not found: ${key}`);
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

describe("cli agent record commands", () => {
  test("agent read honors explicit token and server args before env defaults", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; auth: string | null }> = [];
    const db = createMemoryDb();

    const exitCode = await runAgentReadCommand(
      [
        "agent-pub-demo",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-2" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: {
          AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
          NOLO_SERVER: "https://env.nolo.chat",
        },
        output: { write(chunk) { chunks.push(String(chunk)); } },
        db: db as any,
        fetchImpl: async (url, init) => {
          requests.push({
            url: String(url),
            auth: new Headers(init?.headers).get("Authorization"),
          });
          return Response.json({
            data: {
              dbKey: "agent-pub-demo",
              id: "demo",
              name: "Demo Agent",
            },
          });
        },
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        url: "https://arg.nolo.chat/api/v1/db/read/agent-pub-demo",
        auth: "Bearer eyJ1c2VySWQiOiJ1c2VyLTIifQ==.sig",
      },
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.authUserId).toBe("user-2");
    expect(parsed.baseUrl).toBe("https://arg.nolo.chat");
  });

  test("agent read redacts raw credentials but keeps refs and reports configured status", async () => {
    const chunks: string[] = [];
    const db = createMemoryDb();

    const exitCode = await runAgentReadCommand(
      [
        "agent-pub-cred",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: {
          AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
          NOLO_SERVER: "https://env.nolo.chat",
        },
        output: { write(chunk) { chunks.push(String(chunk)); } },
        db: db as any,
        fetchImpl: async () =>
          Response.json({
            data: {
              dbKey: "agent-pub-cred",
              id: "cred",
              name: "Credential Agent",
              model: "gpt-test",
              apiKey: "sk-raw-secret-key",
              token: "ghp_raw_token_value",
              password: "hunter2-raw",
              secret: "my-raw-secret",
              nestedProviders: [
                {
                  ACCESS_TOKEN: "nested-access-token",
                  client_secret: "nested-client-secret",
                },
              ],
              credentialRef: "api-key:agent-local-cred",
              apiKeyRef: "openai",
            },
          }),
      }
    );

    expect(exitCode).toBe(0);
    const output = chunks.join("");
    expect(output).not.toContain("sk-raw-secret-key");
    expect(output).not.toContain("ghp_raw_token_value");
    expect(output).not.toContain("hunter2-raw");
    expect(output).not.toContain("my-raw-secret");
    expect(output).not.toContain("nested-access-token");
    expect(output).not.toContain("nested-client-secret");

    const parsed = JSON.parse(output);
    expect(parsed.credentialConfigured).toBe(true);
    expect(parsed.credentialRef).toBe("api-key:agent-local-cred");
    expect(parsed.apiKeyRef).toBe("openai");
    expect(parsed.record).toBeDefined();
    expect(parsed.record.apiKey).toBeUndefined();
    expect(parsed.record.token).toBeUndefined();
    expect(parsed.record.password).toBeUndefined();
    expect(parsed.record.secret).toBeUndefined();
    expect(parsed.record.credentialRef).toBe("api-key:agent-local-cred");
    expect(parsed.record.apiKeyRef).toBe("openai");
  });

  test("agent read reports credentialConfigured false when no credentials exist", async () => {
    const chunks: string[] = [];
    const db = createMemoryDb();

    const exitCode = await runAgentReadCommand(
      [
        "agent-pub-no-cred",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: {
          AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
          NOLO_SERVER: "https://env.nolo.chat",
        },
        output: { write(chunk) { chunks.push(String(chunk)); } },
        db: db as any,
        fetchImpl: async () =>
          Response.json({
            data: {
              dbKey: "agent-pub-no-cred",
              id: "no-cred",
              name: "No Credential Agent",
              model: "gpt-test",
            },
          }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.credentialConfigured).toBe(false);
    expect(parsed.record).toBeDefined();
    expect(parsed.record.apiKey).toBeUndefined();
  });

  test("agent create builds and writes new record with custom url and key", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string; body?: string }> = [];
    const db = createMemoryDb();

    const exitCode = await runAgentCreateCommand(
      [
        "new-custom-agent",
        "--model",
        "my-model",
        "--api-source",
        "custom",
        "--custom-provider-url",
        "https://api.my-custom-llm.com/v1",
        "--api-key",
        "sk-12345",
      ],
      {
        env: {
          AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
          NOLO_SERVER: "https://env.nolo.chat",
        },
        output: { write(chunk) { chunks.push(String(chunk)); } },
        db: db as any,
        fetchImpl: async (url, init) => {
          requests.push({
            url: String(url),
            method: init?.method ?? "GET",
            body: typeof init?.body === "string" ? init.body : undefined,
          });
          return Response.json({ ok: true });
        },
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(requests[0].url).toBe("https://env.nolo.chat/api/v1/db/write/");
    
    const body = JSON.parse(requests[0].body!);
    expect(body.customKey).toBe("agent-user-1-new-custom-agent");
    expect(body.data.type).toBe("agent");
    expect(body.data.model).toBe("my-model");
    expect(body.data.apiSource).toBe("custom");
    expect(body.data.customProviderUrl).toBe("https://api.my-custom-llm.com/v1");
    expect(body.data.apiKey).toBe("sk-12345");
    const rawOutput = chunks.join("");
    expect(rawOutput).not.toContain("sk-12345");
    const output = JSON.parse(rawOutput);
    expect(output.updates).not.toHaveProperty("apiKey");
    expect(output.record).not.toHaveProperty("apiKey");
  });

  test("agent create can persist a local Codex CLI agent as a normal private agent record", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string; body?: string }> = [];
    const db = createMemoryDb();

    const exitCode = await runAgentCreateCommand(
      [
        "local-codex",
        "--api-source",
        "cli",
        "--provider",
        "cli",
        "--cli-provider",
        "codex",
        "--model",
        "codex",
        "--name",
        "Local Codex",
      ],
      {
        env: {
          AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId: "0e95801d90" })).toString("base64")}.sig`,
          NOLO_SERVER: "https://env.nolo.chat",
        },
        output: { write(chunk) { chunks.push(String(chunk)); } },
        db: db as any,
        fetchImpl: async (url, init) => {
          requests.push({
            url: String(url),
            method: init?.method ?? "GET",
            body: typeof init?.body === "string" ? init.body : undefined,
          });
          return Response.json({ ok: true });
        },
      }
    );

    expect(exitCode).toBe(0);
    const body = JSON.parse(requests[0].body!);
    expect(body.customKey).toBe(LOCAL_CODEX_AGENT_KEY);
    expect(body.data).toMatchObject({
      dbKey: LOCAL_CODEX_AGENT_KEY,
      key: LOCAL_CODEX_AGENT_KEY,
      type: "agent",
      name: "Local Codex",
      apiSource: "cli",
      provider: "cli",
      cliProvider: "codex",
      model: "codex",
      userId: "0e95801d90",
    });
    expect(body.data.runtimeBinding).toBeUndefined();
  });

  test("agent create accepts a stable handle", async () => {
    const requests: Array<{ body?: string }> = [];
    const db = createMemoryDb();

    const exitCode = await runAgentCreateCommand(
      [
        "frontend-role",
        "--api-source",
        "cli",
        "--cli-provider",
        "agy",
        "--handle",
        "frontend-implementer",
      ],
      {
        env: {
          AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
          NOLO_SERVER: "https://env.nolo.chat",
        },
        output: { write() {} },
        db: db as any,
        fetchImpl: async (_url, init) => {
          requests.push({
            body: typeof init?.body === "string" ? init.body : undefined,
          });
          return Response.json({ ok: true });
        },
      }
    );

    expect(exitCode).toBe(0);
    const body = JSON.parse(requests[0].body!);
    expect(body.data.handle).toBe("frontend-implementer");
  });

  test("agent read falls back to the bare id when the agent-pub-<id> record is missing", async () => {
    const chunks: string[] = [];
    const readUrls: string[] = [];
    const db = createMemoryDb();
    const token = `${Buffer.from(JSON.stringify({ userId: "user1" })).toString("base64")}.sig`;

    const exitCode = await runAgentReadCommand(
      ["agent-pub-xyz", "--token", token, "--server", "https://s.test"],
      {
        env: {},
        output: { write(chunk) { chunks.push(String(chunk)); } },
        db: db as any,
        fetchImpl: async (url) => {
          const u = String(url);
          readUrls.push(u);
          // 公开记录不存在
          if (u.includes("/db/read/agent-pub-xyz")) {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          // 私有记录存在
          if (u.includes("/db/read/agent-user1-xyz")) {
            return Response.json({
              data: {
                dbKey: "agent-user1-xyz",
                id: "xyz",
                userId: "user1",
                name: "Private Xyz",
                model: "m",
              },
            });
          }
          return Response.json({ data: [] });
        },
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.agentKey).toBe("agent-user1-xyz");
    expect(parsed.name).toBe("Private Xyz");
    // 先试公开键（404），再剥前缀走双候选命中私有键
    expect(readUrls.some((u) => u.includes("/db/read/agent-pub-xyz"))).toBe(true);
    expect(readUrls.some((u) => u.includes("/db/read/agent-user1-xyz"))).toBe(true);
  });

  test("agent read still fails for a genuinely missing agent", async () => {
    const chunks: string[] = [];
    const db = createMemoryDb();
    const token = `${Buffer.from(JSON.stringify({ userId: "user1" })).toString("base64")}.sig`;

    const exitCode = await runAgentReadCommand(
      ["agent-pub-ghost", "--token", token, "--server", "https://s.test"],
      {
        env: {},
        output: { write(chunk) { chunks.push(String(chunk)); } },
        db: db as any,
        fetchImpl: async () =>
          new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
      }
    );

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("agent not found: agent-pub-ghost");
  });
});
