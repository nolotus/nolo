import { describe, expect, test } from "bun:test";

import {
  buildDesktopAgentRuntimeDecisionInput,
  describeDesktopAgentRuntimeHostFacts,
} from "./desktopAgentRuntimeHostFacts";

describe("desktop agent runtime host facts", () => {
  test("describes local agent loop facts from desktop persistence and provider environment", () => {
    const facts = describeDesktopAgentRuntimeHostFacts({
      NOLO_SERVER_DB_PATH: "/Users/example/Nolo/data/leveldb",
      NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
    });

    expect(facts).toEqual({
      host: "desktop",
      capabilities: ["leveldb-agent-config", "local-provider", "leveldb-persistence"],
      serverFallbackAvailable: true,
    });
  });

  test("builds the shared runtime decision input without hiding missing provider capability", () => {
    expect(buildDesktopAgentRuntimeDecisionInput({
      NOLO_SERVER_DB_PATH: "/Users/example/Nolo/data/leveldb",
    })).toEqual({
      host: "desktop",
      syncRequested: false,
      hasLocalAgentConfig: true,
      hasLocalProvider: false,
      hasLocalPersistence: true,
      missingLocalCapabilities: ["provider"],
      requiresServer: false,
      serverFallbackAvailable: true,
    });
  });

  test("treats an authenticated platform chat proxy as a provider endpoint", () => {
    expect(describeDesktopAgentRuntimeHostFacts({
      NOLO_SERVER_DB_PATH: "/Users/example/Nolo/data/leveldb",
      AUTH_TOKEN: "token-1",
    })).toEqual({
      host: "desktop",
      capabilities: ["leveldb-agent-config", "local-provider", "leveldb-persistence"],
      serverFallbackAvailable: true,
    });
  });
});
