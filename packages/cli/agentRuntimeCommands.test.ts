import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runAgentListCommand } from "./agentListCommands";
import {
  runAgentBindCurrentCommand,
  runAgentRuntimeDoctorCommand,
  runAgentSmokeCurrentCommand,
} from "./agentMachineCommands";
import {
  runAgentReadCommand,
  runAgentUpdateCommand,
} from "./agentRecordCommands";
import { runDoctorRuntimeCommand } from "./runtimeDoctorCommands";

const makeFetch = (
  impl: (...args: Parameters<typeof fetch>) => Promise<Response>
): typeof fetch => impl as typeof fetch;

describe("cli agent runtime commands", () => {
  let tempNoloHome: string;
  let originalNoloHome: string | undefined;

  beforeAll(() => {
    originalNoloHome = process.env.NOLO_HOME;
    tempNoloHome = mkdtempSync(join(tmpdir(), "nolo-test-home-"));
    process.env.NOLO_HOME = tempNoloHome;
  });

  afterAll(() => {
    if (originalNoloHome === undefined) {
      delete process.env.NOLO_HOME;
    } else {
      process.env.NOLO_HOME = originalNoloHome;
    }
    try {
      rmSync(tempNoloHome, { recursive: true, force: true });
    } catch {}
  });

  test("agent list resolves from the local cache without the script bridge", async () => {
    const chunks: string[] = [];
    const db = {
      get: async () => {
        throw new Error("not needed");
      },
      put: async () => undefined,
      batch: async () => undefined,
      iterator: () => (async function* () {
        yield ["agent-user-1-frontend", {
          dbKey: "agent-user-1-frontend",
          id: "frontend",
          userId: "user-1",
          name: "Frontend",
          model: "gemini-3.1-pro",
          tools: ["readFile", "applyEdit"],
          updatedAt: 200,
          isPublic: true,
        }];
        yield ["agent-pub-frontend", { dbKey: "agent-pub-frontend", name: "Frontend Public" }];
        yield ["agent-user-1-reviewer", {
          dbKey: "agent-user-1-reviewer",
          id: "reviewer",
          userId: "user-1",
          name: "Reviewer",
          model: "gpt-5.4",
          tools: ["readFile"],
          updatedAt: 100,
          isPublic: false,
        }];
      })(),
    };

    const exitCode = await runAgentListCommand(
      ["--json"],
      {
        env: {
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        db: db as any,
        output: { write(chunk) { chunks.push(chunk); } },
        fetchImpl: makeFetch(async () => {
          throw new Error("remote fetch should not be used");
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed).toMatchObject({
      userId: "user-1",
      total: 2,
      publicCount: 1,
      source: "local-cache",
    });
    expect(parsed.agents).toEqual([
      expect.objectContaining({
        privateKey: "agent-user-1-frontend",
        publicRecordExists: true,
        isPublicFlag: true,
        model: "gemini-3.1-pro",
      }),
      expect.objectContaining({
        privateKey: "agent-user-1-reviewer",
        publicRecordExists: false,
        isPublicFlag: false,
        model: "gpt-5.4",
      }),
    ]);
  });

  test("agent list falls back to remote query when the local cache is unavailable", async () => {
    const chunks: string[] = [];
    const calls: string[] = [];
    const db = {
      get: async () => {
        throw new Error("missing");
      },
      put: async () => undefined,
      batch: async () => undefined,
      iterator: () => {
        throw new Error("db locked");
      },
    };

    const exitCode = await runAgentListCommand(
      ["--json", "--public-only"],
      {
        env: {
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
          NOLO_SERVER: "https://us.nolo.chat",
        },
        db: db as any,
        output: { write(chunk) { chunks.push(chunk); } },
        fetchImpl: makeFetch(async () => {
          calls.push("fetch");
          throw new TypeError("Unable to connect. Was there a typo in the url or port?");
        }),
        fallbackFetchImpl: makeFetch(async (url) => {
          calls.push(String(url));
          const target = String(url);
          if (target.includes("/api/v1/db/query/user-1")) {
            return new Response(
              JSON.stringify({
                data: {
                  data: [
                    {
                      dbKey: "agent-user-1-frontend",
                      id: "frontend",
                      userId: "user-1",
                      name: "Frontend",
                      model: "gemini-3.1-pro",
                      tools: ["readFile"],
                      updatedAt: 100,
                      isPublic: true,
                    },
                    {
                      dbKey: "agent-user-1-reviewer",
                      id: "reviewer",
                      userId: "user-1",
                      name: "Reviewer",
                      model: "gpt-5.4",
                      tools: ["readFile"],
                      updatedAt: 90,
                      isPublic: false,
                    },
                  ],
                },
              }),
              { status: 200 }
            );
          }
          if (target.endsWith("/api/v1/db/read/agent-pub-frontend?includeDeleted=true")) {
            return new Response(JSON.stringify({ data: { dbKey: "agent-pub-frontend", isPublic: true } }), { status: 200 });
          }
          if (target.endsWith("/api/v1/db/read/agent-pub-reviewer?includeDeleted=true")) {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          return new Response("not found", { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(calls).toContain("https://us.nolo.chat/api/v1/db/query/user-1");
    expect(calls).toContain("https://us.nolo.chat/api/v1/db/read/agent-pub-frontend?includeDeleted=true");
    expect(calls).toContain("https://us.nolo.chat/api/v1/db/read/agent-pub-reviewer?includeDeleted=true");
    const parsed = JSON.parse(chunks.join("").split("\n").filter((line) => !line.startsWith("[nolo]")).join("\n"));
    expect(parsed).toMatchObject({
      userId: "user-1",
      total: 1,
      publicCount: 1,
      source: "global-cache",
      targetServers: ["https://us.nolo.chat", "https://nolo.chat"],
    });
    expect(parsed.agents).toEqual([
      expect.objectContaining({
        privateKey: "agent-user-1-frontend",
        publicRecordExists: true,
      }),
    ]);
  });

  test("agent read resolves handles and reads records without script bridge", async () => {
    const chunks: string[] = [];
    const readUrls: string[] = [];
    const db = {
      get: async () => {
        throw new Error("missing");
      },
      put: async () => undefined,
      batch: async () => undefined,
      iterator: () => (async function* () {})(),
    };

    const exitCode = await runAgentReadCommand(
      ["frontend-implementer"],
      {
        env: {
          NOLO_SERVER: "https://agent.nolo.chat",
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        db: db as any,
        output: { write(chunk) { chunks.push(chunk); } },
        fetchImpl: makeFetch(async (url, init) => {
          readUrls.push(String(url));
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          expect(String(url)).toBe("https://agent.nolo.chat/api/v1/db/query/user-1?limit=200");
          expect(JSON.parse(String(init?.body ?? "{}"))).toMatchObject({ type: "agent" });
          return new Response(
            JSON.stringify({
              data: {
                data: [{
                  dbKey: "agent-0e95801d90-01FRONTENDAG0000000115N4E1",
                  handle: "frontend-implementer",
                  name: "前端",
                  apiSource: "platform",
                  provider: "fireworks",
                  model: "accounts/fireworks/models/kimi-k2p6",
                  tools: ["readFile", "codeSearch"],
                  isPublic: false,
                }],
              },
            }),
            { status: 200 }
          );
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(readUrls.some((url) => url.includes("/api/v1/db/query/user-1?limit=200"))).toBe(true);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed).toMatchObject({
      agentKey: "agent-0e95801d90-01FRONTENDAG0000000115N4E1",
      baseUrl: "https://agent.nolo.chat",
      name: "前端",
      provider: "fireworks",
      tools: ["readFile", "codeSearch"],
      isPublic: false,
      authUserId: "user-1",
    });
  });

  test("agent read falls back when the runtime fetch cannot reach a remote server", async () => {
    const chunks: string[] = [];
    const calls: string[] = [];
    const db = {
      get: async () => {
        throw new Error("missing");
      },
      put: async () => undefined,
      batch: async () => undefined,
      iterator: () => (async function* () {})(),
    };

    const exitCode = await runAgentReadCommand(
      ["agent-pub-01PAGEBUILDX00000001HUCMVO"],
      {
        env: {
          BASE_URL: "https://us.nolo.chat",
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        db: db as any,
        output: { write(chunk) { chunks.push(chunk); } },
        fetchImpl: makeFetch(async () => {
          calls.push("fetch");
          throw new TypeError("Unable to connect. Was there a typo in the url or port?");
        }),
        fallbackFetchImpl: makeFetch(async (url, init) => {
          calls.push(`fallback:${String(url)}:${init?.method ?? "GET"}`);
          return new Response(
            JSON.stringify({
              data: {
                dbKey: "agent-pub-01PAGEBUILDX00000001HUCMVO",
                name: "应用画布助手",
                apiSource: "platform",
                model: "gpt-5.1",
                tools: [],
                isPublic: true,
              },
            }),
            { status: 200 }
          );
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(calls).toEqual([
      "fetch",
      "fallback:https://us.nolo.chat/api/v1/db/read/agent-pub-01PAGEBUILDX00000001HUCMVO:GET",
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed).toMatchObject({
      agentKey: "agent-pub-01PAGEBUILDX00000001HUCMVO",
      baseUrl: "https://us.nolo.chat",
      name: "应用画布助手",
      tools: [],
      isPublic: true,
    });
  });

  test("agent read prefers the local cache before remote fetch", async () => {
    const chunks: string[] = [];
    const db = {
      get: async (key: string) => {
        throw new Error(`missing ${key}`);
      },
      put: async () => undefined,
      batch: async () => undefined,
      iterator: () => (async function* () {
        yield ["agent-0e95801d90-01FRONTENDAG0000000115N4E1", {
          dbKey: "agent-0e95801d90-01FRONTENDAG0000000115N4E1",
          handle: "frontend-implementer",
          name: "本地前端缓存",
          apiSource: "cli",
          cliProvider: "agy",
          model: "gemini-3.1-pro",
        }];
      })(),
    };

    const exitCode = await runAgentReadCommand(
      ["frontend-implementer"],
      {
        env: {
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        db: db as any,
        output: { write(chunk) { chunks.push(chunk); } },
        fetchImpl: makeFetch(async () => {
          throw new Error("remote fetch should not be used");
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed).toMatchObject({
      agentKey: "agent-0e95801d90-01FRONTENDAG0000000115N4E1",
      name: "本地前端缓存",
      cliProvider: "agy",
      model: "gemini-3.1-pro",
      source: "local-cache",
    });
  });

  test("agent update writes remote record and refreshes local cache", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string; body: any }> = [];
    const cache = new Map<string, any>([
      ["agent-user-1-01CLIAGENTUPDATE000000001", {
        dbKey: "agent-user-1-01CLIAGENTUPDATE000000001",
        name: "Reviewer",
        apiSource: "cli",
        cliProvider: "codex",
        model: "gpt-5.4-mini",
        serverOrigin: "https://us.nolo.chat",
      }],
    ]);
    const db = {
      get: async (key: string) => {
        if (!cache.has(key)) throw new Error(`missing ${key}`);
        return cache.get(key);
      },
      put: async (key: string, value: any) => {
        cache.set(key, value);
      },
      batch: async () => undefined,
      iterator: () => (async function* () {})(),
    };

    const exitCode = await runAgentUpdateCommand(
      [
        "agent-user-1-01CLIAGENTUPDATE000000001",
        "--model",
        "gpt-5.4",
        "--cli-provider",
        "codex",
        "--api-source",
        "cli",
      ],
      {
        env: {
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        db: db as any,
        output: { write(chunk) { chunks.push(chunk); } },
        fetchImpl: makeFetch(async (url, init) => {
          const method = init?.method ?? "GET";
          const body = init?.body ? JSON.parse(String(init.body)) : null;
          requests.push({ url: String(url), method, body });
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(
              JSON.stringify({
                data: {
                  dbKey: "agent-user-1-01CLIAGENTUPDATE000000001",
                  name: "Reviewer",
                  apiSource: "cli",
                  cliProvider: "codex",
                  model: "gpt-5.4-mini",
                },
              }),
              { status: 200 }
            );
          }
          if (String(url).includes("/api/v1/db/write/")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          return new Response("not found", { status: 404 });
        }),
      }
    );
    expect(exitCode).toBe(0);
    expect(requests.map((entry) => entry.url)).toEqual([
      "https://us.nolo.chat/api/v1/db/read/agent-user-1-01CLIAGENTUPDATE000000001",
      "https://us.nolo.chat/api/v1/db/read/agent-user-1-01CLIAGENTUPDATE000000001",
      "https://us.nolo.chat/api/v1/db/write/",
    ]);
    expect(requests[2]?.body).toMatchObject({
      customKey: "agent-user-1-01CLIAGENTUPDATE000000001",
      userId: "user-1",
      data: {
        dbKey: "agent-user-1-01CLIAGENTUPDATE000000001",
        apiSource: "cli",
        cliProvider: "codex",
        model: "gpt-5.4",
      },
    });
    expect(cache.get("agent-user-1-01CLIAGENTUPDATE000000001")).toMatchObject({
      model: "gpt-5.4",
      cliProvider: "codex",
      serverOrigin: "https://us.nolo.chat",
    });
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed).toMatchObject({
      ok: true,
      agentKey: "agent-user-1-01CLIAGENTUPDATE000000001",
      baseUrl: "https://us.nolo.chat",
      updates: {
        apiSource: "cli",
        cliProvider: "codex",
        model: "gpt-5.4",
      },
    });
  });

  test("agent update persists credentials but never echoes raw values", async () => {
    const chunks: string[] = [];
    const secret = "secret-update-value";
    const cache = new Map<string, any>([
      ["agent-user-1-secret", {
        dbKey: "agent-user-1-secret",
        name: "Secret Agent",
        model: "custom-model",
        apiSource: "custom",
        apiKey: "old-secret",
        serverOrigin: "https://nolo.chat",
      }],
    ]);
    const db = {
      get: async (key: string) => {
        if (!cache.has(key)) throw new Error(`missing ${key}`);
        return cache.get(key);
      },
      put: async (key: string, value: any) => {
        cache.set(key, value);
      },
      batch: async () => undefined,
      iterator: () => (async function* () {})(),
    };

    const exitCode = await runAgentUpdateCommand(
      ["agent-user-1-secret", "--field", `apiKey=${JSON.stringify(secret)}`],
      {
        env: {
          AUTH_TOKEN:
            Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") +
            ".sig",
        },
        db: db as any,
        output: { write(chunk) { chunks.push(chunk); } },
        fetchImpl: makeFetch(async (url) => {
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(JSON.stringify({ data: cache.get("agent-user-1-secret") }));
          }
          if (String(url).includes("/api/v1/db/write/")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          return new Response("not found", { status: 404 });
        }),
      },
    );

    expect(exitCode).toBe(0);
    expect(cache.get("agent-user-1-secret")?.apiKey).toBe(secret);
    const rawOutput = chunks.join("");
    expect(rawOutput).not.toContain(secret);
    expect(rawOutput).not.toContain("old-secret");
    const parsed = JSON.parse(rawOutput);
    expect(parsed.updates).not.toHaveProperty("apiKey");
    expect(parsed.record).not.toHaveProperty("apiKey");
  });

  test("agent update honors explicit server env over cached server origin", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string }> = [];
    const cache = new Map<string, any>([
      ["agent-user-1-eval", {
        dbKey: "agent-user-1-eval",
        name: "Eval",
        model: "deepseek-v4-pro",
        serverOrigin: "https://us.nolo.chat",
      }],
    ]);
    const db = {
      get: async (key: string) => {
        if (!cache.has(key)) throw new Error(`missing ${key}`);
        return cache.get(key);
      },
      put: async (key: string, value: any) => {
        cache.set(key, value);
      },
      batch: async () => undefined,
      iterator: () => (async function* () {})(),
    };

    const exitCode = await runAgentUpdateCommand(
      [
        "agent-user-1-eval",
        "--field",
        'provider="deepseek"',
      ],
      {
        env: {
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
          NOLO_SERVER: "https://nolo.chat",
        },
        db: db as any,
        output: { write(chunk) { chunks.push(chunk); } },
        fetchImpl: makeFetch(async (url, init) => {
          requests.push({ url: String(url), method: init?.method ?? "GET" });
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(
              JSON.stringify({
                data: {
                  dbKey: "agent-user-1-eval",
                  name: "Eval",
                  model: "deepseek-v4-pro",
                },
              }),
              { status: 200 }
            );
          }
          if (String(url).includes("/api/v1/db/write/")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          return new Response("not found", { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.map((entry) => entry.url)).toEqual([
      "https://us.nolo.chat/api/v1/db/read/agent-user-1-eval",
      "https://nolo.chat/api/v1/db/read/agent-user-1-eval",
      "https://nolo.chat/api/v1/db/write/",
    ]);
    expect(JSON.parse(chunks.join(""))).toMatchObject({
      ok: true,
      baseUrl: "https://nolo.chat",
      updates: {
        provider: "deepseek",
      },
    });
  });

  test("agent update writes dispatch metadata for concurrency and expiry (cli agents use runtime quota signals)", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string; body: any }> = [];
    const cache = new Map<string, any>([
      ["agent-0e95801d90-01QODERCLIAGENT00000000NEW", {
        dbKey: "agent-0e95801d90-01QODERCLIAGENT00000000NEW",
        handle: "qoder",
        name: "Qoder",
        apiSource: "cli",
        cliProvider: "qoder",
        model: "auto",
        serverOrigin: "https://nolo.chat",
      }],
    ]);
    const db = {
      get: async (key: string) => {
        if (!cache.has(key)) throw new Error(`missing ${key}`);
        return cache.get(key);
      },
      put: async (key: string, value: any) => {
        cache.set(key, value);
      },
      batch: async () => undefined,
      iterator: () => (async function* () {
        yield ["agent-0e95801d90-01QODERCLIAGENT00000000NEW", cache.get("agent-0e95801d90-01QODERCLIAGENT00000000NEW")];
      })(),
    };

    const exitCode = await runAgentUpdateCommand(
      [
        "qoder",
        "--max-concurrent",
        "1",
        "--expires-at",
        "2026-06-17T05:32:12.910Z",
      ],
      {
        env: {
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        db: db as any,
        output: { write(chunk) { chunks.push(chunk); } },
        fetchImpl: makeFetch(async (url, init) => {
          const method = init?.method ?? "GET";
          const body = init?.body ? JSON.parse(String(init.body)) : null;
          requests.push({ url: String(url), method, body });
          if (String(url).includes("/api/v1/db/read/")) {
            if (String(url).includes("agent-0e95801d90-01QODERCLIAGENT00000000NEW")) {
              return new Response(JSON.stringify({ data: cache.get("agent-0e95801d90-01QODERCLIAGENT00000000NEW") }), { status: 200 });
            }
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          if (String(url).includes("/api/v1/db/write/")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          return new Response("not found", { status: 404 });
        }),
      },
    );

    expect(exitCode).toBe(0);
    expect(requests.at(-1)?.body.data).toMatchObject({
      admission: { maxConcurrent: 1 },
      scheduling: {
        expiresAt: "2026-06-17T05:32:12.910Z",
      },
    });
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.updates).toMatchObject({
      admission: { maxConcurrent: 1 },
      scheduling: {
        expiresAt: "2026-06-17T05:32:12.910Z",
      },
    });
  });

  test("agent update supports prompt-doc, provider copy, and tools on the CLI path", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string; body: any }> = [];
    const cache = new Map<string, any>([
      ["agent-0e95801d90-01FRONTENDAG0000000115N4E1", {
        dbKey: "agent-0e95801d90-01FRONTENDAG0000000115N4E1",
        handle: "frontend-implementer",
        name: "Frontend",
        apiSource: "cli",
        cliProvider: "agy",
        model: "gemini-3-flash-preview",
        serverOrigin: "https://nolo.chat",
      }],
      ["agent-source-provider", {
        dbKey: "agent-source-provider",
        apiSource: "cli",
        cliProvider: "codex",
        model: "gpt-5.4",
        provider: "cli",
        customProviderUrl: "https://provider.example/v1",
      }],
    ]);
    const db = {
      get: async (key: string) => {
        if (!cache.has(key)) throw new Error(`missing ${key}`);
        return cache.get(key);
      },
      put: async (key: string, value: any) => {
        cache.set(key, value);
      },
      batch: async () => undefined,
      iterator: () => (async function* () {
        yield ["agent-0e95801d90-01FRONTENDAG0000000115N4E1", {
          dbKey: "agent-0e95801d90-01FRONTENDAG0000000115N4E1",
          handle: "frontend-implementer",
          name: "Frontend",
          apiSource: "cli",
          cliProvider: "agy",
          model: "gemini-3-flash-preview",
        }];
      })(),
    };

    const exitCode = await runAgentUpdateCommand(
      [
        "frontend-implementer",
        "--prompt-doc", "page-prompt-doc",
        "--copy-provider-from", "agent-source-provider",
        "--tools", '["readFile","applyEdit"]',
      ],
      {
        env: {
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
          NOLO_SERVER: "https://nolo.chat",
        },
        db: db as any,
        output: { write(chunk) { chunks.push(chunk); } },
        fetchImpl: makeFetch(async (url, init) => {
          const method = init?.method ?? "GET";
          const body = init?.body ? JSON.parse(String(init.body)) : null;
          requests.push({ url: String(url), method, body });
          if (String(url).includes("/api/v1/db/read/page-prompt-doc")) {
            return new Response(
              JSON.stringify({ data: { dbKey: "page-prompt-doc", content: "Prompt from doc" } }),
              { status: 200 }
            );
          }
          if (String(url).includes("/api/v1/db/read/agent-0e95801d90-01FRONTENDAG0000000115N4E1")) {
            return new Response(
              JSON.stringify({
                data: {
                  dbKey: "agent-0e95801d90-01FRONTENDAG0000000115N4E1",
                  name: "Frontend",
                  apiSource: "cli",
                  cliProvider: "agy",
                  model: "gemini-3-flash-preview",
                },
              }),
              { status: 200 }
            );
          }
          if (String(url).includes("/api/v1/db/write/")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          return new Response("not found", { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.at(-1)?.body?.data).toMatchObject({
      apiSource: "cli",
      cliProvider: "codex",
      model: "gpt-5.4",
      customProviderUrl: "https://provider.example/v1",
      prompt: "Prompt from doc",
      tools: ["readFile", "applyEdit"],
    });
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed).toMatchObject({
      ok: true,
      updates: {
        prompt: "Prompt from doc",
        tools: ["readFile", "applyEdit"],
        cliProvider: "codex",
        model: "gpt-5.4",
      },
    });
  });

  test("bind-current heartbeats the current machine and writes runtimeBinding.machineId to the agent", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string; body: any }> = [];

    const exitCode = await runAgentBindCurrentCommand(
      ["agent-user-1-agent-1"],
      {
        env: {
          NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        output: { write(chunk) { chunks.push(chunk); } },
        db: {
          get: async () => {
            throw new Error("missing");
          },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => (async function* () {})(),
        } as any,
        machineInfo: () => ({
          machineId: "machine-current",
          name: "Windows",
          platform: "win32",
          arch: "x64",
          capabilities: ["codex-cli"],
        }),
        fetchImpl: makeFetch(async (url, init) => {
          const method = init?.method ?? "GET";
          const body = init?.body ? JSON.parse(String(init.body)) : null;
          requests.push({ url: String(url), method, body });

          if (String(url).includes("/api/machines/heartbeat")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (String(url).includes("/api/connector/ws")) {
            return new Response(
              JSON.stringify({
                wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-current",
                decision: "fallback",
              }),
              { status: 200 }
            );
          }
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(
              JSON.stringify({
                data: {
                  dbKey: "agent-user-1-agent-1",
                  id: "agent-1",
                  name: "windows-codex",
                  apiSource: "cli",
                  cliProvider: "codex",
                  prompt: "base",
                },
              }),
              { status: 200 }
            );
          }
          if (String(url).includes("/api/v1/db/write/")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          return new Response("not found", { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.map((request) => request.url)).toEqual([
      "https://alpha-agent-a.nolo.chat/api/machines/heartbeat",
      "https://alpha-agent-a.nolo.chat/api/v1/db/read/agent-user-1-agent-1",
      "https://alpha-agent-a.nolo.chat/api/v1/db/write/",
    ]);
    expect(requests[2].body).toMatchObject({
      customKey: "agent-user-1-agent-1",
      userId: "user-1",
      data: {
        dbKey: "agent-user-1-agent-1",
        name: "windows-codex",
        runtimeBinding: {
          machineId: "machine-current",
          ownerUserId: "user-1",
        },
      },
    });
    expect(chunks.join("")).toContain("Bound agent agent-user-1-agent-1 to this machine");
  });

  test("bind-current requires an agent key", async () => {
    const chunks: string[] = [];
    const exitCode = await runAgentBindCurrentCommand([], {
      env: { AUTH_TOKEN: "token" },
      output: { write(chunk) { chunks.push(chunk); } },
    });

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("Usage: nolo agent bind-current <agentKey|handle>");
  });

  test("smoke-current binds, opens connector websocket, and calls agent run", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string; body: any }> = [];
    const websocketMessages: string[] = [];
    const cliExecutions: Array<{ provider: string; prompt: string; options: any }> = [];

    const exitCode = await runAgentSmokeCurrentCommand(
      ["agent-user-1-agent-1", "--msg", "ping from smoke"],
      {
        env: {
          NOLO_SERVER: "https://alpha-agent-a.nolo.chat",
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        output: { write(chunk) { chunks.push(chunk); } },
        machineInfo: () => ({
          machineId: "machine-current",
          name: "Windows",
          platform: "win32",
          arch: "x64",
          capabilities: ["codex-cli"],
        }),
        fetchImpl: makeFetch(async (url, init) => {
          const method = init?.method ?? "GET";
          const body = init?.body ? JSON.parse(String(init.body)) : null;
          requests.push({ url: String(url), method, body });

          if (String(url).includes("/api/machines/heartbeat")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (String(url).includes("/api/connector/ws")) {
            return new Response(
              JSON.stringify({
                wsUrl: "wss://alpha.nolo.chat/api/connector/ws?machineId=machine-current",
                decision: "fallback",
              }),
              { status: 200 }
            );
          }
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(
              JSON.stringify({
                data: {
                  dbKey: "agent-user-1-agent-1",
                  id: "agent-1",
                  name: "windows-codex",
                  apiSource: "cli",
                  cliProvider: "codex",
                  prompt: "base",
                },
              }),
              { status: 200 }
            );
          }
          if (String(url).includes("/api/v1/db/write/")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (String(url).includes("/api/agent/run")) {
            return new Response(
              JSON.stringify({
                content: "smoke ok",
                model: "codex",
                dialogId: "dialog-smoke",
              }),
              { status: 200 }
            );
          }
          return new Response("not found", { status: 404 });
        }),
        connectWebSocket: async (url, options) => {
          websocketMessages.push(url);
          await options.onOpen();
          await options.onMessage(JSON.stringify({
            type: "agent.run",
            requestId: "request-1",
            payload: {
              userInput: "ping from smoke",
              timeoutMs: 600000,
              agentConfig: {
                apiSource: "cli",
                cliProvider: "codex",
                prompt: "base",
              },
            },
          }));
          websocketMessages.push(...options.sentMessages);
        },
        executeCli: async (provider, prompt, options) => {
          cliExecutions.push({ provider, prompt, options });
          return { text: "local cli ok", raw: "local cli ok", elapsed: 1 };
        },
        connectorRunMessageHandler: async (_machine, message, pushMessage, executeCli, env) => {
          const payload = JSON.parse(message);
          await executeCli("codex", payload.payload?.userInput ?? "", {
            timeout: payload.payload?.timeoutMs,
            cwd: env.NOLO_SERVER ? "/repo/worktree" : undefined,
            yolo: true,
          });
          pushMessage(JSON.stringify({
            type: "agent.run.result",
            requestId: payload.requestId,
            result: {
              artifacts: {
                exitStatus: "completed",
                cwd: "/repo/worktree",
              },
            },
          }));
        },
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.map((request) => request.url)).toContain(
      "https://alpha-agent-a.nolo.chat/api/connector/ws?machineId=machine-current"
    );
    expect(requests.map((request) => request.url)).toContain("https://alpha-agent-a.nolo.chat/api/agent/run");
    expect(requests.find((request) => request.url.endsWith("/api/agent/run"))?.body).toMatchObject({
      agentKey: "agent-user-1-agent-1",
      userInput: "ping from smoke",
    });
    expect(websocketMessages[0]).toBe("wss://alpha.nolo.chat/api/connector/ws?machineId=machine-current");
    const connectorResponses = websocketMessages.slice(1).map((message) => JSON.parse(message));
    expect(connectorResponses.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-1",
      result: {
        artifacts: {
          exitStatus: "completed",
          cwd: expect.any(String),
        },
      },
    });
    expect(cliExecutions[0]).toMatchObject({
      provider: "codex",
      options: { timeout: 600000, cwd: expect.any(String), yolo: true },
    });
    expect(chunks.join("")).toContain("Smoke OK");
    expect(chunks.join("")).toContain("dialog-smoke");
  });

  test("smoke-current rejects non-cli agents before binding", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string; body: any }> = [];

    const exitCode = await runAgentSmokeCurrentCommand(
      ["agent-user-1-agent-1"],
      {
        env: {
          NOLO_SERVER: "https://agent.nolo.chat",
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        output: { write(chunk) { chunks.push(chunk); } },
        machineInfo: () => ({
          machineId: "machine-current",
          name: "Windows",
          platform: "win32",
          arch: "x64",
          capabilities: ["codex-cli"],
        }),
        fetchImpl: makeFetch(async (url, init) => {
          const method = init?.method ?? "GET";
          const body = init?.body ? JSON.parse(String(init.body)) : null;
          requests.push({ url: String(url), method, body });
          if (String(url).includes("/api/machines/heartbeat")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(
              JSON.stringify({
                data: {
                  dbKey: "agent-user-1-agent-1",
                  name: "regular-agent",
                  apiSource: "custom",
                  prompt: "base",
                },
              }),
              { status: 200 }
            );
          }
          return new Response("unexpected", { status: 500 });
        }),
      }
    );

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("agent smoke-current failed");
    expect(chunks.join("")).toContain("is not a CLI agent");
    expect(requests.some((request) => request.url.includes("/api/v1/db/write/"))).toBe(false);
    expect(requests.some((request) => request.url.includes("/api/agent/run"))).toBe(false);
  });

  test("smoke-current rejects cli agents when the current machine lacks that cli capability", async () => {
    const chunks: string[] = [];

    const exitCode = await runAgentSmokeCurrentCommand(
      ["agent-user-1-agent-1"],
      {
        env: {
          NOLO_SERVER: "https://agent.nolo.chat",
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        output: { write(chunk) { chunks.push(chunk); } },
        machineInfo: () => ({
          machineId: "machine-current",
          name: "Windows",
          platform: "win32",
          arch: "x64",
          capabilities: ["claude-code"],
        }),
        fetchImpl: makeFetch(async (url) => {
          if (String(url).includes("/api/machines/heartbeat")) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(
              JSON.stringify({
                data: {
                  dbKey: "agent-user-1-agent-1",
                  name: "windows-codex",
                  apiSource: "cli",
                  cliProvider: "codex",
                  prompt: "base",
                },
              }),
              { status: 200 }
            );
          }
          return new Response("unexpected", { status: 500 });
        }),
      }
    );

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("requires codex-cli");
    expect(chunks.join("")).toContain("current machine capabilities: claude-code");
  });

  test("runtime-doctor reports agent cli compatibility and current machine binding", async () => {
    const chunks: string[] = [];

    const exitCode = await runAgentRuntimeDoctorCommand(
      ["agent-user-1-agent-1"],
      {
        env: {
          NOLO_SERVER: "https://agent.nolo.chat",
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        output: { write(chunk) { chunks.push(chunk); } },
        machineInfo: () => ({
          machineId: "machine-current",
          name: "Windows",
          platform: "win32",
          arch: "x64",
          capabilities: ["codex-cli"],
        }),
        fetchImpl: makeFetch(async (url) => {
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(
              JSON.stringify({
                data: {
                  dbKey: "agent-user-1-agent-1",
                  name: "windows-codex",
                  apiSource: "cli",
                  cliProvider: "codex",
                  runtimeBinding: { machineId: "machine-current" },
                },
              }),
              { status: 200 }
            );
          }
          return new Response("unexpected", { status: 500 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(chunks.join("")).toContain("Agent runtime doctor: windows-codex");
    expect(chunks.join("")).toContain("CLI provider: codex");
    expect(chunks.join("")).toContain("Required capability: codex-cli");
    expect(chunks.join("")).toContain("Current machine binding: yes");
  });

  test("runtime-doctor accepts provider-only CLI agent records", async () => {
    const chunks: string[] = [];

    const exitCode = await runAgentRuntimeDoctorCommand(
      ["agent-user-1-qoder"],
      {
        env: {
          NOLO_SERVER: "https://agent.nolo.chat",
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        output: { write(chunk) { chunks.push(chunk); } },
        machineInfo: () => ({
          machineId: "machine-current",
          name: "Mac",
          platform: "darwin",
          arch: "arm64",
          capabilities: ["qoder-cli"],
        }),
        fetchImpl: makeFetch(async (url) => {
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(
              JSON.stringify({
                data: {
                  dbKey: "agent-user-1-qoder",
                  name: "mac-qoder",
                  apiSource: "cli",
                  provider: "qoder",
                  runtimeBinding: { machineId: "machine-current" },
                },
              }),
              { status: 200 }
            );
          }
          return new Response("unexpected", { status: 500 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(chunks.join("")).toContain("CLI provider: qoder");
    expect(chunks.join("")).toContain("Required capability: qoder-cli");
    expect(chunks.join("")).toContain("Current machine binding: yes");
  });

  test("runtime-doctor resolves stable agent handles before reading records", async () => {
    const readUrls: string[] = [];
    const chunks: string[] = [];

    const exitCode = await runAgentRuntimeDoctorCommand(
      ["frontend-implementer"],
      {
        env: {
          NOLO_SERVER: "https://agent.nolo.chat",
          AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64") + ".sig",
        },
        db: {
          get: async () => {
            throw new Error("missing");
          },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => (async function* () {})(),
        } as any,
        output: { write(chunk) { chunks.push(chunk); } },
        machineInfo: () => ({
          machineId: "machine-current",
          name: "Mac",
          platform: "darwin",
          arch: "arm64",
          capabilities: ["codex-cli"],
        }),
        fetchImpl: makeFetch(async (url, init) => {
          readUrls.push(String(url));
          if (String(url).includes("/api/v1/db/read/")) {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          expect(String(url)).toBe("https://agent.nolo.chat/api/v1/db/query/user-1?limit=200");
          expect(JSON.parse(String(init?.body ?? "{}"))).toMatchObject({ type: "agent" });
          return new Response(
            JSON.stringify({
              data: {
                data: [{
                  dbKey: "agent-0e95801d90-01FRONTENDAG0000000115N4E1",
                  handle: "frontend-implementer",
                  name: "前端实现员",
                  apiSource: "platform",
                  provider: "fireworks",
                  useServerProxy: true,
                }],
              },
            }),
            { status: 200 }
          );
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(readUrls.some((url) => url.includes("/api/v1/db/query/user-1?limit=200"))).toBe(true);
    expect(chunks.join("")).toContain("Agent input: frontend-implementer");
    expect(chunks.join("")).toContain("Agent key: agent-0e95801d90-01FRONTENDAG0000000115N4E1");
    expect(chunks.join("")).toContain("Runtime class: platform-local-loop");
  });

  test("doctor runtime reports local mode when local runtime facts are complete", async () => {
    const chunks: string[] = [];

    const exitCode = await runDoctorRuntimeCommand([], {
      env: {
        AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "platform-demo" })).toString("base64") + ".sig",
        NOLO_LOCAL_AGENT_KEY: "agent-user-1-frontend",
        OPENAI_API_KEY: "sk-local",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      localRuntimeProbe: async () => ({
        ok: true,
        dbPath: "/Users/demo/.nolo/data/leveldb",
        agentFound: true,
        agentKey: "agent-user-1-frontend",
      }),
    });

    const output = chunks.join("");
    expect(exitCode).toBe(0);
    expect(output).toContain("Runtime: local");
    expect(output).toContain("Reason:");
    expect(output).toContain("Provider: available");
    expect(output).toContain("LevelDB: ok");
    expect(output).toContain("DB path: /Users/demo/.nolo/data/leveldb");
    expect(output).toContain("Authority driver:");
    expect(output).toContain("Agent config: found (agent-user-1-frontend)");
    expect(output).toContain("Sync: available");
  });

  test("doctor runtime reports missing LevelDB agent config", async () => {
    const chunks: string[] = [];

    const exitCode = await runDoctorRuntimeCommand([], {
      env: {
        NOLO_LOCAL_AGENT_KEY: "agent-user-1-missing",
        OPENAI_API_KEY: "sk-local",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      localRuntimeProbe: async () => ({
        ok: true,
        dbPath: "/Users/demo/.nolo/data/leveldb",
        agentFound: false,
        agentKey: "agent-user-1-missing",
      }),
    });

    const output = chunks.join("");
    expect(exitCode).toBe(1);
    expect(output).toContain("LevelDB: ok");
    expect(output).toContain("Agent config: missing (agent-user-1-missing)");
    expect(output).toContain("- agent-config");
  });

  test("doctor runtime reports LevelDB open failures", async () => {
    const chunks: string[] = [];

    const exitCode = await runDoctorRuntimeCommand([], {
      env: {
        NOLO_LOCAL_AGENT_KEY: "agent-user-1-frontend",
        OPENAI_API_KEY: "sk-local",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      localRuntimeProbe: async () => ({
        ok: false,
        dbPath: "/Users/demo/.nolo/data/leveldb",
        agentFound: false,
        agentKey: "agent-user-1-frontend",
        error: "LEVEL_LOCKED",
      }),
    });

    const output = chunks.join("");
    expect(exitCode).toBe(1);
    expect(output).toContain("LevelDB: failed");
    expect(output).toContain("LEVEL_LOCKED");
    expect(output).toContain("- leveldb");
  });

  test("doctor runtime reports an actively unhealthy authority broker", async () => {
    const chunks: string[] = [];

    const exitCode = await runDoctorRuntimeCommand([], {
      env: {
        NOLO_LOCAL_AGENT_KEY: "agent-user-1-frontend",
        OPENAI_API_KEY: "sk-local",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      localRuntimeProbe: async () => ({
        ok: true,
        dbPath: "/Users/demo/.nolo/data/leveldb",
        authorityHealthy: false,
        authorityError: "authority broker endpoint is unreachable",
        agentFound: false,
        agentKey: "agent-user-1-frontend",
      }),
    });

    const output = chunks.join("");
    expect(exitCode).toBe(1);
    expect(output).toContain("LevelDB: ok");
    expect(output).toContain("Authority broker: unhealthy");
    expect(output).toContain(
      "Authority error: authority broker endpoint is unreachable"
    );
    expect(output).toContain("- authority-broker");
    expect(output).not.toContain("- leveldb");
    expect(output).not.toContain("DB error:");
  });

  test("doctor runtime reports server fallback when local provider is missing", async () => {
    const chunks: string[] = [];

    const exitCode = await runDoctorRuntimeCommand([], {
      env: {
        AUTH_TOKEN: Buffer.from(JSON.stringify({ userId: "platform-demo" })).toString("base64") + ".sig",
        NOLO_LOCAL_AGENT_KEY: "agent-user-1-frontend",
        NOLO_SERVER: "https://us.nolo.chat",
      },
      output: { write(chunk) { chunks.push(chunk); } },
    });

    const output = chunks.join("");
    expect(exitCode).toBe(0);
    expect(output).toContain("Runtime: server");
    expect(output).toContain("Missing local capabilities:");
    expect(output).toContain("- provider");
    expect(output).toContain("Server fallback: https://us.nolo.chat");
  });
});
