import { describe, expect, test } from "bun:test";
import {
  buildPublicAliasRecord,
  findPublicAliasMismatches,
  hasInvalidPublicAliasShape,
  isCurrentAgentPublicAlias,
} from "./agentWorkspacePublicAliases";
import type { ListedAgent } from "./agentWorkspace";

const agent = (overrides: Partial<ListedAgent>): ListedAgent => ({
  id: "01AGENT",
  privateKey: "agent-user-1-01AGENT",
  publicKey: "agent-pub-01AGENT",
  name: "Agent",
  model: "model",
  updatedAt: null,
  isPublicFlag: false,
  publicRecordExists: false,
  type: "agent",
  tools: [],
  ...overrides,
});

describe("agent workspace public alias helpers", () => {
  test("classifies only public alias visibility mismatches", () => {
    const mismatches = findPublicAliasMismatches([
      agent({
        id: "01MISSING",
        privateKey: "agent-user-1-01MISSING",
        publicKey: "agent-pub-01MISSING",
        name: "Missing Alias",
        isPublicFlag: true,
        publicRecordExists: false,
      }),
      agent({
        id: "01STALE",
        privateKey: "agent-user-1-01STALE",
        publicKey: "agent-pub-01STALE",
        name: "Stale Alias",
        isPublicFlag: false,
        publicRecordExists: true,
      }),
      agent({
        id: "01OK",
        privateKey: "agent-user-1-01OK",
        publicKey: "agent-pub-01OK",
        isPublicFlag: true,
        publicRecordExists: true,
      }),
    ]);

    expect(mismatches).toEqual([
      {
        id: "01MISSING",
        name: "Missing Alias",
        privateKey: "agent-user-1-01MISSING",
        publicKey: "agent-pub-01MISSING",
        kind: "missing-public-alias",
        isPublicFlag: true,
        publicRecordExists: false,
      },
      {
        id: "01STALE",
        name: "Stale Alias",
        privateKey: "agent-user-1-01STALE",
        publicKey: "agent-pub-01STALE",
        kind: "stale-public-alias",
        isPublicFlag: false,
        publicRecordExists: true,
      },
    ]);
  });

  test("classifies malformed agent-derived aliases separately", () => {
    const mismatches = findPublicAliasMismatches([
      agent({
        id: "agent-user-1-01BAD",
        privateKey: "agent-user-1-01BAD",
        publicKey: "agent-pub-agent-user-1-01BAD",
        name: "Bad Agent",
        isPublicFlag: true,
        publicRecordExists: false,
      }),
    ]);

    expect(mismatches).toEqual([
      {
        id: "agent-user-1-01BAD",
        name: "Bad Agent",
        privateKey: "agent-user-1-01BAD",
        publicKey: "agent-pub-agent-user-1-01BAD",
        kind: "invalid-public-key-shape",
        isPublicFlag: true,
        publicRecordExists: false,
      },
    ]);
  });

  test("identifies current public alias family and invalid shapes", () => {
    expect(isCurrentAgentPublicAlias("agent-pub-01AGENT")).toBe(true);
    expect(isCurrentAgentPublicAlias("cybot-pub-01CYBOT")).toBe(false);
    expect(hasInvalidPublicAliasShape("agent-pub-agent-user-1-01BAD")).toBe(true);
    expect(hasInvalidPublicAliasShape("agent-pub-01AGENT")).toBe(false);
  });

  test("builds a public alias record without changing the private source record", () => {
    const privateRecord = {
      dbKey: "agent-user-1-01AGENT",
      id: "01AGENT",
      isPublic: true,
      name: "Agent",
      updatedAt: 1,
    };

    const publicRecord = buildPublicAliasRecord(privateRecord, "agent-pub-01AGENT");

    expect(publicRecord).toMatchObject({
      dbKey: "agent-pub-01AGENT",
      id: "01AGENT",
      isPublic: true,
      name: "Agent",
    });
    expect(privateRecord.dbKey).toBe("agent-user-1-01AGENT");
    expect(publicRecord.updatedAt).toBeGreaterThan(1);
  });

  test("builds a public alias record without copying secret-bearing fields", () => {
    const privateRecord = {
      dbKey: "agent-user-1-01AGENT",
      id: "01AGENT",
      isPublic: true,
      name: "Custom Agent",
      apiSource: "custom",
      customProviderUrl: "https://provider.example/v1",
      apiKey: "private-api-key",
      apiKeyFromAgentKey: "agent-user-1-01SECRET",
      secret: "private-secret",
      password: "private-password",
    };

    const publicRecord = buildPublicAliasRecord(privateRecord, "agent-pub-01AGENT");

    expect(publicRecord).toMatchObject({
      dbKey: "agent-pub-01AGENT",
      id: "01AGENT",
      isPublic: true,
      name: "Custom Agent",
      apiSource: "custom",
      customProviderUrl: "https://provider.example/v1",
    });
    expect(publicRecord).not.toHaveProperty("apiKey");
    expect(publicRecord).not.toHaveProperty("apiKeyFromAgentKey");
    expect(publicRecord).not.toHaveProperty("secret");
    expect(publicRecord).not.toHaveProperty("password");
    expect(privateRecord).toHaveProperty("apiKey", "private-api-key");
  });
});
