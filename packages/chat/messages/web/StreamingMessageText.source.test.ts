import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const streamingTextSource = readFileSync(
  join(import.meta.dir, "StreamingMessageText.tsx"),
  "utf-8"
);
const messageLayoutCssSource = readFileSync(
  join(import.meta.dir, "MessageLayout.css"),
  "utf-8"
);
const streamingRevealSource = readFileSync(
  join(import.meta.dir, "useStreamingReveal.ts"),
  "utf-8"
);
const streamingModelSource = readFileSync(
  join(import.meta.dir, "streamingMarkdownModel.ts"),
  "utf-8"
);
const streamingStructuredSource = readFileSync(
  join(import.meta.dir, "StreamingStructuredMarkdown.tsx"),
  "utf-8"
);

describe("StreamingMessageText source contract", () => {
  it("renders assistant streaming text as character-level fade spans", () => {
    expect(streamingRevealSource).toContain("Intl.Segmenter");
    expect(streamingTextSource).toContain("streaming-message-text__char");
    expect(streamingTextSource).toContain("streaming-message-text__cursor");
    expect(messageLayoutCssSource).toContain("white-space: pre-wrap");
  });

  it("renders structured markdown during streaming instead of leaving raw markers until completion", () => {
    expect(streamingModelSource).toContain("markdownToSlate");
    expect(streamingModelSource).toContain("buildStreamingMarkdownModel");
    expect(streamingStructuredSource).toContain("ReadOnlyMarkdownContent__body");
    expect(streamingStructuredSource).toContain("renderTable");
    expect(streamingStructuredSource).toContain("streaming-markdown-table");
  });

  it("keeps reveal, markdown modeling, and link behavior delegated to shared helpers", () => {
    expect(streamingTextSource).toContain("useStreamingReveal");
    expect(streamingTextSource).toContain("buildStreamingMarkdownModel");
    expect(streamingTextSource).toContain("StreamingStructuredMarkdown");
    expect(streamingStructuredSource).toContain("SafeLink");
  });
});
