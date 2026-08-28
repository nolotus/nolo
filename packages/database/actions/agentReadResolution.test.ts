import { describe, expect, it } from "bun:test";

import {
  BUILTIN_PLATFORM_AGENT_KEYS,
  isBuiltinPlatformAgentKey,
  resolveAgentReadServers,
} from "./agentReadResolution";

describe("agent read resolution", () => {
  it("recognizes builtin platform agent keys", () => {
    expect(BUILTIN_PLATFORM_AGENT_KEYS).toContain(
      "agent-pub-01NOLOAPPBLD000000019KCKT0"
    );
    expect(
      isBuiltinPlatformAgentKey("agent-pub-01NOLOAPPBLD000000019KCKT0")
    ).toBe(true);
    expect(isBuiltinPlatformAgentKey("agent-user-123")).toBe(false);
  });

  it("adds the public nolo cluster when reading builtin platform agents", () => {
    expect(
      resolveAgentReadServers({
        dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
        configuredServers: ["http://127.0.0.1:3233"],
      })
    ).toEqual([
      "http://127.0.0.1:3233",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });

  it("keeps ordinary agent reads on configured servers only", () => {
    expect(
      resolveAgentReadServers({
        dbKey: "agent-user-123",
        configuredServers: ["http://127.0.0.1:3233"],
      })
    ).toEqual(["http://127.0.0.1:3233"]);
  });
});
