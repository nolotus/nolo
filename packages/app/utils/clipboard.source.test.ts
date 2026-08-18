import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("clipboard utility", () => {
  test("exports a promise API with execCommand fallback for desktop webviews", () => {
    const source = readSource("packages/app/utils/clipboard.ts");

    expect(source).toContain("export const copyTextToClipboard = async");
    expect(source).toContain("await navigator.clipboard.writeText(text)");
    expect(source).toContain('document.execCommand("copy")');
    expect(source).toContain("fallbackCopyTextToClipboard(text)");
    expect(source).toContain("copyTextWithDesktopBridge(text)");
    expect(source).toContain('"/api/desktop/clipboard"');
  });
});
