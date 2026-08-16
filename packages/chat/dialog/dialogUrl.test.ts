import { describe, expect, it } from "bun:test";

import { buildDialogUrl } from "./dialogUrl";

describe("buildDialogUrl", () => {
  it("returns a plain dialog path", () => {
    expect(buildDialogUrl("dialog-user-1")).toBe("/dialog-user-1");
  });

  it("returns a space-scoped dialog path when spaceId exists", () => {
    expect(buildDialogUrl("dialog-user-1", "space-demo")).toBe(
      "/space/demo/dialog-user-1"
    );
    expect(buildDialogUrl("dialog-user-1", "demo")).toBe(
      "/space/demo/dialog-user-1"
    );
  });
});
