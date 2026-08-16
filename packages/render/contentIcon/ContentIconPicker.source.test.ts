import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("ContentIconPicker source contract", () => {
  test("uses shared form/button components and localized copy", () => {
    const source = readFileSync(
      join(import.meta.dir, "ContentIconPicker.tsx"),
      "utf8"
    );

    expect(source).toContain('from "render/web/form/Input"');
    expect(source).toContain('from "render/web/ui/Button"');
    expect(source).toContain("useTranslation()");
    expect(source).toContain("contentIcon.searchPlaceholder");
    expect(source).toContain("contentIcon.clear");
  });
});
