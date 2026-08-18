import { describe, expect, it } from "bun:test";

import { getSpaceContentTypeLabel } from "./contentLabels";

const t = (_key: string, fallback?: string) => fallback ?? _key;

describe("contentLabels", () => {
  it("labels file categories with user-facing attachment names", () => {
    expect(
      getSpaceContentTypeLabel(
        {
          type: "file" as any,
          contentKey: "file-u1-doc",
          fileCategory: "document",
        },
        t as any
      )
    ).toBe("文档附件");

    expect(
      getSpaceContentTypeLabel(
        {
          type: "file" as any,
          contentKey: "file-u1-video",
          fileCategory: "video",
        },
        t as any
      )
    ).toBe("视频");
  });

  it("keeps page-like content labeled as documents", () => {
    expect(
      getSpaceContentTypeLabel(
        {
          type: "page" as any,
          contentKey: "page-u1-note",
        },
        t as any
      )
    ).toBe("文档");
  });
});
