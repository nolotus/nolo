import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";

const testDb = new MemoryDB();
let now = 1_700_000_000_000;
let moduleVersion = 0;
let keysVersion = 0;
let currentKeysModule: typeof import("../../../database/keys");

async function setupModuleMocks() {
  currentKeysModule = await import(
    new URL(`../../../database/keys.ts?test=${keysVersion++}`, import.meta.url).href
  );
  mock.module("database/client/db", () => ({
    getDb: () => testDb,
  }));
  mock.module("database/keys", () => currentKeysModule);
}

async function setupNullDbModuleMocks() {
  currentKeysModule = await import(
    new URL(`../../../database/keys.ts?test=${keysVersion++}`, import.meta.url).href
  );
  mock.module("database/client/db", () => ({
    getDb: () => null,
  }));
  mock.module("database/keys", () => currentKeysModule);
}

const loadModule = async () => {
  await setupModuleMocks();
  const mod = await import(`./fetchPublicAgents.ts`);
  mock.restore();
  return mod;
};

const loadModuleWithoutDb = async () => {
  await setupNullDbModuleMocks();
  const mod = await import(`./fetchPublicAgents.ts`);
  mock.restore();
  return mod;
};

async function seedAgent(id: string, overrides: Record<string, any> = {}) {
  await testDb.put(currentKeysModule.pubAgentKeys.single(id), {
    id,
    name: `Agent ${id}`,
    isPublic: true,
    createdAt: new Date((now += 1_000)).toISOString(),
    tools: [],
    ...overrides,
  });
}

describe("client fetchPublicAgents", () => {
  beforeEach(() => {
    testDb.clear();
    now += 6_000;
  });

  afterEach(() => {
    mock.restore();
  });

  it("filters local public agents by userId", async () => {
    const { fetchPublicAgents } = await loadModule();
    await seedAgent("agent-a", { userId: "user-a" });
    await seedAgent("agent-b", { userId: "user-b" });

    const result = await fetchPublicAgents({
      userId: "user-a",
      sortBy: "newest",
      limit: 20,
    });

    expect(result.total).toBe(1);
    expect(result.data.map((agent: any) => agent.id)).toEqual(["agent-a"]);
  });

  it("returns the full declared empty shape when no local DB is available", async () => {
    const { fetchPublicAgents } = await loadModuleWithoutDb();

    await expect(fetchPublicAgents({ sortBy: "newest", limit: 20 })).resolves.toEqual({
      data: [],
      total: 0,
      hasMore: false,
      tombstones: [],
    });
  });

  it("includes public builtin platform agents in the local public plaza cache", async () => {
    const { fetchPublicAgents } = await loadModule();
    await seedAgent("01NOLOAGENTCRT000000000001", {
      dbKey: "agent-pub-01NOLOAGENTCRT000000000001",
      name: "AI 创建助手",
      userId: "builtin",
      provider: "openai",
      model: "gpt-5.1",
    });
    await seedAgent("agent-live", {
      name: "Visible Agent",
      userId: "user-a",
    });

    const result = await fetchPublicAgents({ sortBy: "newest", limit: 20 });

    expect(result.total).toBe(2);
    expect(result.data.map((agent: any) => agent.id)).toEqual([
      "agent-live",
      "01NOLOAGENTCRT000000000001",
    ]);
  });
});
