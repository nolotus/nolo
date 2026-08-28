import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dialogPageSource = readFileSync(
  join(import.meta.dir, "DialogPage.tsx"),
  "utf-8"
);
const dialogPageRenderModeSource = readFileSync(
  join(import.meta.dir, "dialogPageRenderMode.ts"),
  "utf-8"
);

describe("dialog page title source contract", () => {
  it("uses a fixed streaming title prefix instead of an animated symbol hook", () => {
    expect(dialogPageRenderModeSource).toContain('const STREAMING_TITLE_PREFIX = "●";');
    expect(dialogPageRenderModeSource).toContain(
      "? `${STREAMING_TITLE_PREFIX} ${baseTitle}`"
    );
    expect(dialogPageSource).toContain("getDialogPageTitle({");
    expect(dialogPageSource).toContain("document.title = pageTitle;");
    expect(dialogPageSource).not.toContain("useStreamingSymbol");
    expect(dialogPageSource).not.toContain("{pageTitle && <title>{pageTitle}</title>}");
  });
});
