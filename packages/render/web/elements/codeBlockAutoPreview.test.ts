import { describe, expect, it } from "bun:test";

import { canPreviewJson } from "./codeBlockAutoPreview";

describe("code block auto preview rules", () => {
  it("auto previews valid json", () => {
    expect(canPreviewJson('{"ok":true}')).toBe(true);
  });

  it("does not auto preview invalid json", () => {
    expect(canPreviewJson('{"ok":}')).toBe(false);
  });
});
