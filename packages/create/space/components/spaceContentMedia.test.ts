import { describe, expect, it } from "bun:test";
import { ContentType } from "app/types";
import {
  buildSpaceContentImageUrl,
  getSpaceContentImageFallbackFileIds,
  isSpaceContentImage,
  type MinimalContentMediaItem,
} from "./spaceContentMedia";

const baseContent = (overrides: Partial<MinimalContentMediaItem>): MinimalContentMediaItem => ({
  title: "sample.png",
  type: ContentType.FILE,
  contentKey: "file-123",
  ...overrides,
});

describe("Space content media helpers", () => {
  it("recognizes image content from category, type, filename, and legacy image keys", () => {
    expect(isSpaceContentImage(baseContent({ fileCategory: "image" }))).toBe(true);
    expect(isSpaceContentImage(baseContent({ type: ContentType.IMAGE }))).toBe(true);
    expect(isSpaceContentImage(baseContent({ title: "avatar.webp" }))).toBe(true);
    expect(isSpaceContentImage(baseContent({ contentKey: "image-abc", title: "Untitled" }))).toBe(true);
    expect(isSpaceContentImage(baseContent({ fileCategory: "document", title: "brief.pdf" }))).toBe(false);
  });

  it("builds encoded image urls only for image content", () => {
    expect(
      buildSpaceContentImageUrl(
        "https://nolo.chat/",
        baseContent({ contentKey: "image-abc 123" })
      )
    ).toBe("https://nolo.chat/api/v1/db/file/content/image-abc%20123");
    expect(
      buildSpaceContentImageUrl(
        "https://nolo.chat/",
        baseContent({ fileCategory: "document", title: "brief.pdf" })
      )
    ).toBeNull();
  });

  it("preserves image-to-file fallback ids for legacy image keys", () => {
    expect(
      getSpaceContentImageFallbackFileIds(baseContent({ contentKey: "image-abc" }))
    ).toEqual(["image-abc", "file-abc"]);
    expect(
      getSpaceContentImageFallbackFileIds(baseContent({ contentKey: "file-abc" }))
    ).toEqual(["file-abc"]);
  });
});
