import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "CreateDialogButton.tsx"),
  "utf8",
);

describe("CreateDialogButton a11y source contract", () => {
  it("labels the icon-only new-chat trigger for assistive tech", () => {
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-label={t("newchat")}');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain("LuMessageCirclePlus");
  });
});
