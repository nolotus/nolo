import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "FilePage.tsx"), "utf-8");

describe("FilePage source contract", () => {
  it("renders dedicated preview blocks for pdf, video, and audio files", () => {
    expect(source).toContain("const isPdf = isPdfMimeType(page.mimeType);");
    expect(source).toContain("const isVideo = isVideoMimeType(page.mimeType);");
    expect(source).toContain("const isAudio = isAudioMimeType(page.mimeType);");
    expect(source).toContain("className=\"FilePage__document-frame\"");
    expect(source).toContain("<video");
    expect(source).toContain("<audio");
  });
});
