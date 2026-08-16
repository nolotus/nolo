import { describe, expect, it } from "bun:test";

import { resolveDeletedFavoriteProjectionRemoval } from "./deletedFavoriteProjection";

describe("deleted favorite projection", () => {
  it("maps deleted agent keys to agent favorites", () => {
    expect(
      resolveDeletedFavoriteProjectionRemoval("agent-user-1-agent-1")
    ).toEqual({
      targetType: "agent",
      id: "agent-user-1-agent-1",
    });
  });

  it("maps deleted page-like content keys to content favorites", () => {
    expect(
      resolveDeletedFavoriteProjectionRemoval("page-user-1-page-1")
    ).toEqual({
      targetType: "content",
      id: "page-user-1-page-1",
    });
    expect(
      resolveDeletedFavoriteProjectionRemoval("meta-user-1-table-1")
    ).toEqual({
      targetType: "content",
      id: "meta-user-1-table-1",
    });
    expect(
      resolveDeletedFavoriteProjectionRemoval("image-user-1-image-1")
    ).toEqual({
      targetType: "content",
      id: "image-user-1-image-1",
    });
    expect(
      resolveDeletedFavoriteProjectionRemoval("file-user-1-file-1")
    ).toEqual({
      targetType: "content",
      id: "file-user-1-file-1",
    });
  });

  it("ignores keys that are not represented in favorites", () => {
    expect(resolveDeletedFavoriteProjectionRemoval("dialog-user-1-dialog-1")).toBeNull();
    expect(resolveDeletedFavoriteProjectionRemoval("app-user-1-app-1")).toBeNull();
    expect(resolveDeletedFavoriteProjectionRemoval("")).toBeNull();
  });
});
