import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const messageTextSource = readFileSync(
  join(import.meta.dir, "MessageText.tsx"),
  "utf-8"
);

describe("MessageText streaming source contract", () => {
  it("uses the inline artifact renderer while assistant text is streaming", () => {
    expect(messageTextSource).toContain("StreamingInlineReactArtifact");
    expect(messageTextSource).toContain("isStreaming || hasInlineArtifact");
    expect(messageTextSource).toContain("visibleText={inlineArtifact?.visibleText");
    expect(messageTextSource).toContain("artifact={inlineArtifact?.artifact");
  });

  it("does not remount the Slate editor on every streamed content update", () => {
    expect(messageTextSource).not.toContain("key={content}");
  });
});
