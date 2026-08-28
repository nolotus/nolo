import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("QuickChatRuntime live audio guard (source)", () => {
  const source = readFileSync(
    join(import.meta.dir, "QuickChatRuntime.tsx"),
    "utf8",
  );

  it("imports isLiveAudioOnlyAgent", () => {
    expect(source).toContain("isLiveAudioOnlyAgent");
  });

  it("computes isLiveAudioOnly based on agent config", () => {
    expect(source).toContain("isLiveAudioOnly");
  });

  it("disables send for live-audio-only agents", () => {
    expect(source).toContain("isLiveAudioOnly");
    // The isSendDisabled memo should reference isLiveAudioOnly
    expect(source).toMatch(/isSendDisabled[\s\S]*isLiveAudioOnly/);
  });

  it("uses the shared message-input file pipeline for non-image uploads", () => {
    expect(source).toContain('import { useMessageInputFiles } from "chat/web/useMessageInputFiles"');
    expect(source).toContain("useMessageInputFiles(processImages");
    expect(source).toContain("processFiles");
    expect(source).toContain("pendingFilesWithStatus");
    expect(source).not.toContain('accept="image/*"');
    expect(source).not.toContain("filterImageFiles");
  });
});
