import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "ShareCard.tsx"), "utf8");

describe("ShareCard source contract", () => {
  it("can render cover images from embedded data or lightweight cover URLs", () => {
    expect(source).toContain("const coverImage = share.coverImage || share.coverImageUrl;");
    expect(source).toContain("<img src={coverImage} alt=\"\" loading=\"lazy\" />");
  });
});
