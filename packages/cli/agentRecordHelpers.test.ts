import { expect, test } from "bun:test";

import { resolveAgentRecordFromHybridStore, writeAgentRecord } from "./agentRecordHelpers";

test("writeAgentRecord posts the provided agentKey as customKey", async () => {
  const calls: Array<{ url: string; body: any }> = [];
  await writeAgentRecord({
    agentKey: "agent-pub-demo",
    authToken: "token-123",
    fetchImpl: (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? "{}")),
      });
      return Response.json({ ok: true });
    }) as any,
    serverUrl: "https://nolo.chat",
    userId: "user-1",
    record: { name: "Demo Agent" },
  });

  expect(calls).toEqual([
    {
      url: "https://nolo.chat/api/v1/db/write/",
      body: {
        customKey: "agent-pub-demo",
        userId: "user-1",
        data: {
          name: "Demo Agent",
          dbKey: "agent-pub-demo",
        },
      },
    },
  ]);
});

test("resolveAgentRecordFromHybridStore honors cliArgs token and server overrides", async () => {
  const calls: string[] = [];
  const dbValues = new Map<string, any>();
  const db = {
    async get() {
      throw new Error("missing");
    },
    async put(key: string, value: any) {
      dbValues.set(key, value);
    },
  };

  const result = await resolveAgentRecordFromHybridStore({
    agentInput: "agent-pub-demo",
    cliArgs: [
      "--token",
      `${Buffer.from(JSON.stringify({ userId: "user-2" })).toString("base64")}.sig`,
      "--server",
      "https://arg.nolo.chat",
    ],
    env: {
      AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
      NOLO_SERVER: "https://env.nolo.chat",
    },
    db: db as any,
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(`${new Headers(init?.headers).get("Authorization")} ${String(input)}`);
      return Response.json({
        data: {
          dbKey: "agent-pub-demo",
          id: "demo",
          name: "Demo Agent",
        },
      });
    }) as any,
  });

  expect(result).toMatchObject({
    agentKey: "agent-pub-demo",
    source: "remote-cache",
  });
  expect(calls).toEqual([
    "Bearer eyJ1c2VySWQiOiJ1c2VyLTIifQ==.sig https://arg.nolo.chat/api/v1/db/read/agent-pub-demo",
  ]);
  expect(dbValues.get("agent-pub-demo")).toMatchObject({
    dbKey: "agent-pub-demo",
    serverOrigin: "https://arg.nolo.chat",
  });
});

test("resolveAgentRecordFromHybridStore resolves handles from agent records", async () => {
  const calls: string[] = [];
  const dbValues = new Map<string, any>();
  const db = {
    async get() {
      throw new Error("missing");
    },
    async put(key: string, value: any) {
      dbValues.set(key, value);
    },
  };

  const result = await resolveAgentRecordFromHybridStore({
    agentInput: "frontend-implementer",
    env: {
      AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.sig`,
      NOLO_SERVER: "https://env.nolo.chat",
    },
    db: db as any,
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/api/v1/db/read/")) {
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      }
      expect(url).toBe("https://env.nolo.chat/api/v1/db/query/user-1?limit=200");
      expect(JSON.parse(String(init?.body ?? "{}"))).toMatchObject({ type: "agent" });
      return Response.json({
        data: {
          data: [
            {
              dbKey: "agent-user-1-frontend",
              type: "agent",
              name: "Frontend",
              handle: "frontend-implementer",
            },
          ],
        },
      });
    }) as any,
  });

  expect(result).toMatchObject({
    agentKey: "agent-user-1-frontend",
    source: "remote-cache",
    record: {
      handle: "frontend-implementer",
      serverOrigin: "https://env.nolo.chat",
    },
  });
  expect(calls).toContain("https://env.nolo.chat/api/v1/db/query/user-1?limit=200");
  expect(dbValues.get("agent-user-1-frontend")).toMatchObject({
    dbKey: "agent-user-1-frontend",
    serverOrigin: "https://env.nolo.chat",
  });
});
