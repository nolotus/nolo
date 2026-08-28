import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("streamAgentChatTurn live audio guard (source)", () => {
  const source = readFileSync(
    join(import.meta.dir, "streamAgentChatTurn.ts"),
    "utf8",
  );

  it("imports isLiveAudioOnlyAgent", () => {
    expect(source).toContain("isLiveAudioOnlyAgent");
  });

  it("blocks live-audio-only agents before model request", () => {
    expect(source).toContain("isLiveAudioOnlyAgent(rawAgentConfig)");
  });

  it("returns an error message for live-only agents", () => {
    expect(source).toContain("仅支持实时语音模式");
  });
});
