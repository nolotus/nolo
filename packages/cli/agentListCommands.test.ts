import { describe, expect, test } from "bun:test";

import { runAgentListCommand } from "./agentListCommands";

function authEnv(userId: string, extra: Record<string, string> = {}) {
  return {
    AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId })).toString("base64")}.sig`,
    ...extra,
  };
}

type TestFetch = (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => Promise<Response>;

function testFetch(fn: TestFetch): typeof fetch {
  return fn as unknown as typeof fetch;
}

describe("cli agent list commands", () => {
  test("agent list honors explicit token and server args before env defaults", async () => {
    const chunks: string[] = [];
    const calls: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-2" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("user-1", {
          NOLO_SERVER: "https://env.nolo.chat",
        }),
        db: {
          get: async () => {
            throw new Error("unused");
          },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => {
            throw new Error("locked");
          },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          calls.push(String(url));
          expect(JSON.parse(String(init?.body ?? "{}")).includeDeleted).toBe(true);
          const target = String(url);
          if (
            target === "https://arg.nolo.chat/api/v1/db/query/user-2" ||
            target === "https://env.nolo.chat/api/v1/db/query/user-2" ||
            target === "https://nolo.chat/api/v1/db/query/user-2" ||
            target === "https://us.nolo.chat/api/v1/db/query/user-2"
          ) {
            return new Response(JSON.stringify({ data: { data: [] } }), { status: 200 });
          }
          throw new Error(`unexpected ${target}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(calls).toEqual([
      "https://arg.nolo.chat/api/v1/db/query/user-2",
      "https://env.nolo.chat/api/v1/db/query/user-2",
      "https://nolo.chat/api/v1/db/query/user-2",
      "https://us.nolo.chat/api/v1/db/query/user-2",
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.userId).toBe("user-2");
    expect(parsed.targetServers).toEqual([
      "https://arg.nolo.chat",
      "https://env.nolo.chat",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });

  test("agent list json redacts raw credentials but keeps refs and reports configured status", async () => {
    const chunks: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => {
            throw new Error("unused");
          },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => {
            throw new Error("locked");
          },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          const target = String(url);
          if (target === "https://arg.nolo.chat/api/v1/db/query/user-1") {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: "agent-user-1-cred-agent",
                    id: "cred-agent",
                    type: "agent",
                    userId: "user-1",
                    name: "Cred Agent",
                    model: "gpt-test",
                    updatedAt: "2026-05-30T10:00:00.000Z",
                    apiKey: "sk-list-secret",
                    token: "ghp_list_token",
                    password: "list-password",
                    secret: "list-secret",
                    credentialRef: "api-key:agent-local-cred-agent",
                    apiKeyRef: "xai",
                  },
                ],
              },
            }), { status: 200 });
          }
          if (target.includes("/api/v1/db/read/agent-pub-")) {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          throw new Error(`unexpected ${target}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    const output = chunks.join("");
    expect(output).not.toContain("sk-list-secret");
    expect(output).not.toContain("ghp_list_token");
    expect(output).not.toContain("list-password");
    expect(output).not.toContain("list-secret");

    const parsed = JSON.parse(output);
    expect(parsed.agents).toHaveLength(1);
    const agent = parsed.agents[0];
    expect(agent.credentialConfigured).toBe(true);
    expect(agent.credentialRef).toBe("api-key:agent-local-cred-agent");
    expect(agent.apiKeyRef).toBe("xai");
    expect(agent.apiKey).toBeUndefined();
    expect(agent.token).toBeUndefined();
    expect(agent.password).toBeUndefined();
    expect(agent.secret).toBeUndefined();
  });

  test("agent list plain output redacts raw credentials", async () => {
    const chunks: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => {
            throw new Error("unused");
          },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => {
            throw new Error("locked");
          },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          const target = String(url);
          if (target === "https://arg.nolo.chat/api/v1/db/query/user-1") {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: "agent-user-1-cred-agent",
                    id: "cred-agent",
                    type: "agent",
                    userId: "user-1",
                    name: "Cred Agent",
                    model: "gpt-test",
                    updatedAt: "2026-05-30T10:00:00.000Z",
                    apiKey: "sk-plain-secret",
                    credentialRef: "api-key:agent-local-cred-agent",
                  },
                ],
              },
            }), { status: 200 });
          }
          if (target.includes("/api/v1/db/read/agent-pub-")) {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          throw new Error(`unexpected ${target}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    const output = chunks.join("");
    expect(output).not.toContain("sk-plain-secret");
    expect(output).not.toContain("privateKey=");
    expect(output).toContain("id=cred-agent");
    expect(output).toContain("credentialConfigured=true");
    expect(output).toContain("credentialRef=api-key:agent-local-cred-agent");
  });

  test("agent list merges owned agents across server candidates", async () => {
    const chunks: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => {
            throw new Error("unused");
          },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => {
            throw new Error("locked");
          },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          const target = String(url);
          if (target === "https://arg.nolo.chat/api/v1/db/query/user-1") {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: "agent-user-1-deleted-agent",
                    id: "deleted-agent",
                    type: "agent",
                    userId: "user-1",
                    name: "Deleted elsewhere",
                    model: "gpt-test",
                    updatedAt: "2026-05-30T10:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          if (target === "https://nolo.chat/api/v1/db/query/user-1") {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: "agent-user-1-live-agent",
                    id: "live-agent",
                    type: "agent",
                    userId: "user-1",
                    name: "Live global agent",
                    model: "gpt-test",
                    updatedAt: "2026-05-31T10:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          if (target === "https://us.nolo.chat/api/v1/db/query/user-1") {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: "agent-user-1-deleted-agent",
                    id: "deleted-agent",
                    type: "agent",
                    userId: "user-1",
                    name: "Deleted elsewhere",
                    deletedAt: "2026-05-31T11:00:00.000Z",
                    updatedAt: "2026-05-31T11:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          if (target.includes("/api/v1/db/read/agent-pub-")) {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          throw new Error(`unexpected ${target} ${init?.method ?? "GET"}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.total).toBe(1);
    expect(parsed.agents.map((agent: any) => agent.id)).toEqual(["live-agent"]);
  });

  test("agent list treats newer public tombstones as not public", async () => {
    const chunks: string[] = [];
    const requests: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => {
            throw new Error("unused");
          },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => {
            throw new Error("locked");
          },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          const target = String(url);
          requests.push(target);
          if (target.endsWith("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({
              data: {
                data: target.startsWith("https://arg.nolo.chat")
                  ? [
                      {
                        dbKey: "agent-user-1-live-agent",
                        id: "live-agent",
                        type: "agent",
                        userId: "user-1",
                        name: "Unpublished elsewhere",
                        model: "gpt-test",
                        isPublic: true,
                        updatedAt: "2026-05-30T10:00:00.000Z",
                      },
                    ]
                  : [],
              },
            }), { status: 200 });
          }
          if (target === "https://arg.nolo.chat/api/v1/db/read/agent-pub-live-agent?includeDeleted=true") {
            return new Response(JSON.stringify({
              data: {
                dbKey: "agent-pub-live-agent",
                id: "live-agent",
                type: "agent",
                userId: "user-1",
                isPublic: true,
                updatedAt: "2026-05-30T10:00:00.000Z",
              },
            }), { status: 200 });
          }
          if (target === "https://us.nolo.chat/api/v1/db/read/agent-pub-live-agent?includeDeleted=true") {
            return new Response(JSON.stringify({
              data: {
                dbKey: "agent-pub-live-agent",
                id: "live-agent",
                type: "agent",
                userId: "user-1",
                isPublic: true,
                deletedAt: "2026-05-31T10:00:00.000Z",
                updatedAt: "2026-05-31T10:00:00.000Z",
              },
            }), { status: 200 });
          }
          return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.total).toBe(1);
    expect(parsed.publicCount).toBe(0);
    expect(parsed.agents[0].publicRecordExists).toBe(false);
    expect(requests).toContain("https://us.nolo.chat/api/v1/db/read/agent-pub-live-agent?includeDeleted=true");
  });

  test("agent list treats live public companion with isPublic false as not public", async () => {
    const chunks: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--public-only",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => {
            throw new Error("unused");
          },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => {
            throw new Error("locked");
          },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          const target = String(url);
          if (target.endsWith("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({
              data: {
                data: target.startsWith("https://arg.nolo.chat")
                  ? [
                      {
                        dbKey: "agent-user-1-private-agent",
                        id: "private-agent",
                        type: "agent",
                        userId: "user-1",
                        name: "Private again",
                        model: "gpt-test",
                        isPublic: true,
                        updatedAt: "2026-05-30T10:00:00.000Z",
                      },
                    ]
                  : [],
              },
            }), { status: 200 });
          }
          if (target === "https://arg.nolo.chat/api/v1/db/read/agent-pub-private-agent?includeDeleted=true") {
            return new Response(JSON.stringify({
              data: {
                dbKey: "agent-pub-private-agent",
                id: "private-agent",
                type: "agent",
                userId: "user-1",
                isPublic: false,
                updatedAt: "2026-05-31T10:00:00.000Z",
              },
            }), { status: 200 });
          }
          return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.total).toBe(0);
    expect(parsed.publicCount).toBe(0);
    expect(parsed.agents).toEqual([]);
  });

  test("agent list can filter owned agents by a space content list", async () => {
    const chunks: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--space",
        "01SPACE",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => {
            throw new Error("unused");
          },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => {
            throw new Error("locked");
          },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          const target = String(url);
          if (target === "https://arg.nolo.chat/api/v1/db/query/user-1") {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: "agent-user-1-agent-a",
                    id: "agent-a",
                    type: "agent",
                    userId: "user-1",
                    name: "Agent A",
                    model: "gpt-test",
                    updatedAt: "2026-05-30T10:00:00.000Z",
                  },
                  {
                    dbKey: "agent-user-1-agent-b",
                    id: "agent-b",
                    type: "agent",
                    userId: "user-1",
                    name: "Agent B",
                    model: "gpt-test",
                    updatedAt: "2026-05-30T11:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          if (target === "https://arg.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true") {
            return new Response(JSON.stringify({
              data: {
                dbKey: "space-01SPACE",
                contents: {
                  "agent-user-1-agent-a": {
                    contentKey: "agent-user-1-agent-a",
                    type: "agent",
                  },
                },
              },
            }), { status: 200 });
          }
          if (target.startsWith("https://arg.nolo.chat/api/v1/db/read/agent-pub-")) {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          throw new Error(`unexpected ${target} ${init?.method ?? "GET"}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.spaceId).toBe("01SPACE");
    expect(parsed.total).toBe(1);
    expect(parsed.agents.map((agent: any) => agent.privateKey)).toEqual([
      "agent-user-1-agent-a",
    ]);
  });

  test("agent list with space uses the newest global space contents before public reads", async () => {
    const chunks: string[] = [];
    const publicReads: string[] = [];

    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--space",
        "01SPACE",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => {
            throw new Error("unused");
          },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => {
            throw new Error("locked");
          },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          const target = String(url);
          if (target.endsWith("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({
              data: {
                data: target.startsWith("https://arg.nolo.chat")
                  ? [
                      {
                        dbKey: "agent-user-1-agent-a",
                        id: "agent-a",
                        type: "agent",
                        userId: "user-1",
                        name: "Agent A",
                        model: "gpt-test",
                        updatedAt: "2026-05-30T10:00:00.000Z",
                      },
                      {
                        dbKey: "agent-user-1-agent-b",
                        id: "agent-b",
                        type: "agent",
                        userId: "user-1",
                        name: "Agent B",
                        model: "gpt-test",
                        updatedAt: "2026-05-30T11:00:00.000Z",
                      },
                    ]
                  : [],
              },
            }), { status: 200 });
          }
          if (
            target === "https://arg.nolo.chat/api/v1/db/read/space-01SPACE" ||
            target === "https://arg.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true"
          ) {
            return new Response(JSON.stringify({
              data: {
                dbKey: "space-01SPACE",
                contents: {
                  "agent-user-1-agent-a": {
                    contentKey: "agent-user-1-agent-a",
                    type: "agent",
                  },
                },
                updatedAt: "2026-05-30T10:00:00.000Z",
              },
            }), { status: 200 });
          }
          if (target === "https://nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true") {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          if (target === "https://us.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true") {
            return new Response(JSON.stringify({
              data: {
                dbKey: "space-01SPACE",
                contents: {
                  "agent-user-1-agent-b": {
                    contentKey: "agent-user-1-agent-b",
                    type: "agent",
                  },
                },
                updatedAt: "2026-05-31T10:00:00.000Z",
              },
            }), { status: 200 });
          }
          if (target.includes("/api/v1/db/read/agent-pub-")) {
            publicReads.push(target);
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          throw new Error(`unexpected ${target}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.spaceId).toBe("01SPACE");
    expect(parsed.total).toBe(1);
    expect(parsed.agents.map((agent: any) => agent.privateKey)).toEqual([
      "agent-user-1-agent-b",
    ]);
    expect(publicReads.every((url) => !url.includes("agent-pub-agent-a"))).toBe(true);
  });

  test("agent list --json --safe returns a secret-free favorite-first summary", async () => {
    const chunks: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--safe",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => { throw new Error("unused"); },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => { throw new Error("locked"); },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          const target = String(url);
          if (target.endsWith("/rpc/listFavorites")) {
            return new Response(JSON.stringify({
              targetType: "agent",
              items: [
                { id: "agent-user-1-fav-bot", favoritedAt: 1700000005000 },
                { id: "agent-pub-public-bot", favoritedAt: 1700000006000 },
              ],
              ids: ["agent-user-1-fav-bot", "agent-pub-public-bot"],
            }), { status: 200 });
          }
          if (target.includes("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({ data: { data: [
              {
                dbKey: "agent-user-1-normal-bot",
                id: "normal-bot",
                userId: "user-1",
                name: "Normal Bot",
                model: "gpt-5.6-sol",
                introduction: "General helper",
                inputPrice: 1,
                outputPrice: 2,
                updatedAt: 1700000009000,
                prompt: "SECRET PROMPT",
              },
              {
                dbKey: "agent-user-1-fav-bot",
                id: "fav-bot",
                userId: "user-1",
                name: "Favorite Bot",
                model: "claude-sonnet-5",
                introduction: "Coding helper",
                inputPrice: 3,
                outputPrice: 4,
                updatedAt: 1700000001000,
              },
            ] } }), { status: 200 });
          }
          if (target.includes("/api/v1/db/read/agent-pub-public-bot")) {
            return new Response(JSON.stringify({ data: {
              dbKey: "agent-pub-public-bot",
              id: "public-bot",
              name: "Public Favorite Bot",
              model: "gpt-5.6-sol",
              isPublic: true,
            } }), { status: 200 });
          }
          if (target.includes("/api/v1/db/read/")) {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          throw new Error(`unexpected ${target}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.success).toBe(true);
    // 默认精简投影：用 agentKey 断言收藏优先排序（public-bot 收藏时间更新在前）。
    // public-bot 的公开记录存在性在本 mock 中未被确认（publicRecordExists=false），
    // 按既有 --safe 契约省略 publicKey/agentKey，绝不给模型一个 404 key。
    expect(parsed.agents.map((agent: any) => agent.agentKey)).toEqual([
      undefined,
      "agent-user-1-fav-bot",
      "agent-user-1-normal-bot",
    ]);
    expect(parsed.agents[0].name).toBe("Public Favorite Bot");
    for (const agent of parsed.agents) {
      expect(agent).not.toHaveProperty("privateKey");
      expect(agent).not.toHaveProperty("dbKey");
      expect(agent).not.toHaveProperty("prompt");
      expect(agent).not.toHaveProperty("credentialRef");
      // 精简投影剔除的噪音字段不得出现。
      expect(agent).not.toHaveProperty("id");
      expect(agent).not.toHaveProperty("introduction");
      expect(agent).not.toHaveProperty("inputPrice");
      expect(agent).not.toHaveProperty("outputPrice");
      expect(agent).not.toHaveProperty("modelAbility");
    }
  });

  test("agent list --json --safe --verbose restores the full field set (still no null-valued keys)", async () => {
    const chunks: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--safe",
        "--verbose",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => { throw new Error("unused"); },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => { throw new Error("locked"); },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          const target = String(url);
          if (target.endsWith("/rpc/listFavorites")) {
            return new Response(JSON.stringify({ targetType: "agent", items: [], ids: [] }), { status: 200 });
          }
          if (target.includes("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({ data: { data: [
              {
                dbKey: "agent-user-1-bot",
                id: "bot",
                userId: "user-1",
                name: "Verbose Bot",
                model: "gpt-5.6-sol",
                introduction: "Verbose helper",
                inputPrice: 1,
                outputPrice: 2,
                updatedAt: "2026-06-01T00:00:00.000Z",
              },
            ] } }), { status: 200 });
          }
          return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    const agent = parsed.agents.find((a: any) => a.agentKey === "agent-user-1-bot");
    expect(agent.id).toBe("bot");
    expect(agent.introduction).toBe("Verbose helper");
    expect(agent.inputPrice).toBe(1);
    expect(agent.outputPrice).toBe(2);
    expect(agent.updatedAt).toBe("2026-06-01T00:00:00.000Z");
    // fixture 无 handle/cliProvider 等字段 → null 值键被省略而非输出 null。
    expect(agent).not.toHaveProperty("handle");
    expect(agent).not.toHaveProperty("cliProvider");
    expect(chunks.join("")).not.toContain("null");
  });

  test("agent list hides rate-limited (429) agents by default and --show-unavailable shows them", async () => {
    const mkFetch = (chunks: string[]) =>
      testFetch(async (url) => {
        const target = String(url);
        if (target === "https://arg.nolo.chat/api/v1/db/query/user-1") {
          return new Response(JSON.stringify({
            data: {
              data: [
                { dbKey: "agent-user-1-ok", id: "ok", type: "agent", userId: "user-1", name: "OK agent", model: "glm-5.3", provider: "zai", updatedAt: "2026-06-01T10:00:00.000Z" },
                { dbKey: "agent-user-1-limited", id: "limited", type: "agent", userId: "user-1", name: "Limited agent", model: "glm-5.3", provider: "zai", nextAvailableAt: Date.now() + 3_600_000, updatedAt: "2026-06-01T10:00:00.000Z" },
              ],
            },
          }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      });

    const runList = (showUnavailable: boolean) => {
      const chunks: string[] = [];
      const args = [
        "--json",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ];
      if (showUnavailable) args.push("--show-unavailable");
      return runAgentListCommand(args, {
        env: authEnv("env-user"),
        db: {
          get: async () => { throw new Error("unused"); },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => { throw new Error("locked"); },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: mkFetch(chunks as any),
      }).then((code) => ({ code, chunks }));
    };

    // 默认：限流 agent 被隐藏，unavailableCount=1。
    const hidden = await runList(false);
    expect(hidden.code).toBe(0);
    const hiddenParsed = JSON.parse(hidden.chunks.join(""));
    expect(hiddenParsed.agents.map((a: any) => a.id)).toEqual(["ok"]);
    expect(hiddenParsed.unavailableCount).toBe(1);

    // --show-unavailable：两个都列出。
    const shown = await runList(true);
    expect(shown.code).toBe(0);
    const shownParsed = JSON.parse(shown.chunks.join(""));
    expect(shownParsed.agents.map((a: any) => a.id).sort()).toEqual(["limited", "ok"]);
  });

  test("agent list --safe hides rate-limited agents (incl. favorite-hydration leak)", async () => {
    const chunks: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--safe",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => { throw new Error("unused"); },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => { throw new Error("locked"); },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          const target = String(url);
          // 限流 agent 同时是 favorite → 过去会通过 favorite-hydration 绕过过滤。
          if (target.endsWith("/rpc/listFavorites")) {
            return new Response(JSON.stringify({
              targetType: "agent",
              items: [{ id: "agent-user-1-limited", favoritedAt: 1700000005000 }],
              ids: ["agent-user-1-limited"],
            }), { status: 200 });
          }
          if (target.includes("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({ data: { data: [
              { dbKey: "agent-user-1-ok", id: "ok", userId: "user-1", name: "OK", model: "gpt-test", updatedAt: 1700000009000 },
              { dbKey: "agent-user-1-limited", id: "limited", userId: "user-1", name: "Limited", model: "glm-5.3", nextAvailableAt: Date.now() + 3_600_000, updatedAt: 1700000001000 },
            ] } }), { status: 200 });
          }
          return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.success).toBe(true);
    // --safe 输出同样不得包含限流中的 favorite agent。
    expect(parsed.agents.map((a: any) => a.agentKey)).toEqual(["agent-user-1-ok"]);
    expect(parsed.unavailableCount).toBe(1);
  });

  test("agent list --safe counts favorite-only unavailable agents in unavailableCount", async () => {
    // favorite 的 agent 不在 query 返回（只存在于 extraFavoriteRecords），且 429 冷却中。
    const chunks: string[] = [];
    const exitCode = await runAgentListCommand(
      [
        "--json",
        "--safe",
        "--token",
        `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        db: {
          get: async () => { throw new Error("unused"); },
          put: async () => undefined,
          batch: async () => undefined,
          iterator: () => { throw new Error("locked"); },
        } as any,
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          const target = String(url);
          if (target.endsWith("/rpc/listFavorites")) {
            return new Response(JSON.stringify({
              targetType: "agent",
              items: [{ id: "agent-user-1-only-fav", favoritedAt: 1700000005000 }],
              ids: ["agent-user-1-only-fav"],
            }), { status: 200 });
          }
          // query 返回的是正常 agent，不含 favorite-only agent。
          if (target.includes("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({ data: { data: [
              { dbKey: "agent-user-1-ok", id: "ok", userId: "user-1", name: "OK", model: "gpt-test", updatedAt: 1700000009000 },
            ] } }), { status: 200 });
          }
          // favorite-only agent 通过 read 补入（不在 agents 数组 → extraFavoriteRecords），且 unavailable。
          if (target.includes("/api/v1/db/read/agent-user-1-only-fav")) {
            return new Response(JSON.stringify({ data: {
              dbKey: "agent-user-1-only-fav",
              id: "only-fav",
              userId: "user-1",
              name: "Only Fav Limited",
              model: "glm-5.3",
              nextAvailableAt: Date.now() + 3_600_000,
            } }), { status: 200 });
          }
          return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.success).toBe(true);
    // favorite-only unavailable agent 被隐藏，且计入 unavailableCount（口径一致）。
    expect(parsed.agents.map((a: any) => a.agentKey)).toEqual(["agent-user-1-ok"]);
    expect(parsed.unavailableCount).toBe(1);
  });
});
