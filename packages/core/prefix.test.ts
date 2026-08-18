import { describe, expect, it } from "bun:test";

import {
  extractCustomId,
  extractUserId,
  publicAgentKey,
  systemAgentKey,
  parsePublicAgentId,
  PUBLIC_AGENT_KEY_PREFIX,
  isOwnedAgentKey,
  ownedAgentKey,
  parseOwnedAgentId,
} from "./prefix";

describe("extractUserId", () => {
  it("returns the first segment for two-part user settings keys", () => {
    expect(extractUserId("user123-settings")).toBe("user123");
  });

  it("returns the embedded user id for user preference register keys", () => {
    expect(extractUserId("user-pref-user123-space_default")).toBe("user123");
  });

  it("returns the second segment for standard content keys", () => {
    expect(extractUserId("dialog-user123-01ABC")).toBe("user123");
  });
});

describe("extractCustomId pure seam", () => {
  it("returns the dialogId for a plain userId dialog record key", () => {
    expect(extractCustomId("dialog-user123-01ABC")).toBe("01ABC");
  });

  it("returns the dialogId for a hyphenated userId dialog record key", () => {
    expect(extractCustomId("dialog-user-a-01DIALOGID000000000000001")).toBe(
      "01DIALOGID000000000000001",
    );
  });

  it("returns the dialogId for the local owner dialog record key", () => {
    expect(extractCustomId("dialog-local-01DIALOG")).toBe("01DIALOG");
  });

  it("keeps legacy slice-from-2 behavior for three-segment non-dialog keys", () => {
    expect(extractCustomId("agent-user123-agentId")).toBe("agentId");
  });

  it("keeps legacy slice-from-2 behavior for four-segment non-dialog keys", () => {
    // slice from index 2 must join remaining segments, NOT return just the last.
    expect(extractCustomId("row-tenant-tableId-rowId")).toBe("tableId-rowId");
  });

  it("uses the legacy extractKeyPart path for dialog message keys", () => {
    // Message key form: dialog-{dialogId}-msg-{messageId}
    // extractKeyPart(key, 2) => parts.slice(2).join("-") on
    // ["dialog", "01D", "msg", "01M"] yields "msg-01M".
    expect(extractCustomId("dialog-01D-msg-01M")).toBe("msg-01M");
  });
});

describe("agent key prefix helpers", () => {
  it("builds public and system agent keys from an id", () => {
    expect(publicAgentKey("01AGENTID")).toBe("agent-pub-01AGENTID");
    expect(systemAgentKey("01AGENTID")).toBe("agent-system-01AGENTID");
  });

  it("parses the id back out of a public agent key", () => {
    expect(parsePublicAgentId("agent-pub-01AGENTID")).toBe("01AGENTID");
    expect(parsePublicAgentId("agent-system-01AGENTID")).toBeNull();
    expect(parsePublicAgentId("dialog-user-01D")).toBeNull();
    expect(parsePublicAgentId(PUBLIC_AGENT_KEY_PREFIX)).toBe("");
  });

  it("builds owned agent keys and stays idempotent when the id already has the prefix", () => {
    // 真实数据里 record.id 有时就是整条 dbKey；重拼会产出
    // agent-u1-agent-u1-<id> 这种必然 404 的 key。
    expect(ownedAgentKey("u1", "01AGENTID")).toBe("agent-u1-01AGENTID");
    expect(ownedAgentKey("u1", "agent-u1-01AGENTID")).toBe("agent-u1-01AGENTID");
  });

  it("matches owned agent keys by full prefix so hyphenated user ids still resolve", () => {
    // 按 "-" 分段解析会把 userId "user-1" 截成 "user" 而漏判自建；
    // 整体前缀比较才能让含连字符的 userId 正确匹配。
    expect(isOwnedAgentKey("agent-user-1-01AGENTID", "user-1")).toBe(true);
    expect(isOwnedAgentKey("agent-u2-01AGENTID", "u1")).toBe(false);
    expect(isOwnedAgentKey("agent-pub-01AGENTID", "u1")).toBe(false);
    expect(isOwnedAgentKey(undefined, "u1")).toBe(false);
  });

  it("parses the id back out of an owned agent key", () => {
    expect(parseOwnedAgentId("agent-user-1-01AGENTID", "user-1")).toBe("01AGENTID");
    expect(parseOwnedAgentId("agent-u2-01AGENTID", "u1")).toBeNull();
    expect(parseOwnedAgentId("agent-u1-", "u1")).toBeNull();
  });
});
