import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const messageContentSource = readFileSync(
  join(import.meta.dir, "MessageContent.tsx"),
  "utf-8"
);

describe("MessageContent canvas snapshot source contract", () => {
  it("renders assistant canvas_snapshot NDJSON through the canvas renderer instead of raw text", () => {
    expect(messageContentSource).toContain("parseCanvasSnapshotMessage");
    expect(messageContentSource).toContain("extractCanvasSnapshotText");
    expect(messageContentSource).toContain("CanvasSnapshotMessage");
    expect(messageContentSource).toContain('role !== "self"');
    expect(messageContentSource).toContain("isCanvasSnapshotContent");
  });
});

describe("OPT-FE-01 MessageContent memo boundary", () => {
  it("uses an explicit props equality comparator so unchanged content skips re-render", () => {
    expect(messageContentSource).toContain("areMessageContentPropsEqual");
    expect(messageContentSource).toContain("export const MessageContent = memo(");
    expect(messageContentSource).toContain("prev.content === next.content");
    expect(messageContentSource).toContain("prev.isStreaming === next.isStreaming");
  });
});
