import { describe, expect, it } from "bun:test";

import { DataType } from "create/types";
import {
  extractAgentInfo,
  formatShareTime,
  resolveShareAuthorIdentity,
  toPublicAgentKey,
  toSafeTimestamp,
} from "./helpers";

describe("share helpers", () => {
  it("formats share time with a fixed locale and timezone", () => {
    expect(formatShareTime(1772990985390)).toBe("2026/03/09 01:29:45");
  });

  it("normalizes invalid timestamps to zero", () => {
    expect(toSafeTimestamp(undefined)).toBe(0);
    expect(toSafeTimestamp("")).toBe(0);
    expect(toSafeTimestamp("not-a-number")).toBe(0);
    expect(toSafeTimestamp("1772990985390")).toBe(1772990985390);
  });

  it("prefers profile nickname and avatar for share author identity", () => {
    expect(
      resolveShareAuthorIdentity({
        user: { username: "platform-demo", name: "Platform Demo" },
        profile: { nickname: "nolo", avatar: "https://example.com/avatar.png" },
      })
    ).toEqual({
      authorName: "nolo",
      authorAvatar: "https://example.com/avatar.png",
    });
  });

  it("falls back to user name and username when profile nickname is absent", () => {
    expect(
      resolveShareAuthorIdentity({
        user: { username: "platform-demo", name: "Nolo Public" },
      })
    ).toEqual({
      authorName: "Nolo Public",
    });

    expect(
      resolveShareAuthorIdentity({
        user: { username: "platform-demo" },
        fallbackName: "fallback-name",
      })
    ).toEqual({
      authorName: "platform-demo",
    });
  });

  it("normalizes private agent keys into public route keys", () => {
    expect(toPublicAgentKey("agent-0e95801d90-01IMGAGENT2A000000006NYUPN")).toBe(
      "agent-pub-01IMGAGENT2A000000006NYUPN"
    );
    expect(toPublicAgentKey("cybot-0e95801d90-01JYRSTM0MPPGQC9S25S3Y9J20")).toBe(
      ""
    );
    expect(toPublicAgentKey("agent-pub-01IMGAGENT2A000000006NYUPN")).toBe(
      "agent-pub-01IMGAGENT2A000000006NYUPN"
    );
  });

  it("preserves hyphenated handles when normalizing to public keys", () => {
    expect(toPublicAgentKey("agent-0e95801d90-kimi-code")).toBe(
      "agent-pub-kimi-code"
    );
    expect(toPublicAgentKey("cybot-0e95801d90-my-cool-bot")).toBe("");
  });

  it("reads dialog agent names from message snapshots", () => {
    expect(
      extractAgentInfo(DataType.DIALOG, {
        messages: [
          { role: "user", content: "hello" },
          {
            role: "assistant",
            cybotKey: "agent-user-1-agentA",
            agentName: "Research Agent",
            content: "hi",
          },
        ],
      })
    ).toEqual({
      sourceAgentKey: "agent-user-1-agentA",
      sourceAgentName: "Research Agent",
    });
  });

  it("reads dialog agent names from cybots array snapshots", () => {
    expect(
      extractAgentInfo(DataType.DIALOG, {
        cybots: [
          {
            dbKey: "agent-user-1-agentB",
            name: "Writer Agent",
          },
        ],
      })
    ).toEqual({
      sourceAgentKey: "agent-user-1-agentB",
      sourceAgentName: "Writer Agent",
    });
  });
});
