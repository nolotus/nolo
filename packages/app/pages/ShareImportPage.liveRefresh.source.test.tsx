import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "ShareImportPage.tsx"), "utf8");

describe("ShareImportPage live refresh source contract", () => {
  const liveRefreshEffect = source.match(
    /useEffect\(\(\) => \{\s+if \(!token \|\| !shared \|\| shared\.type !== DataType\.TABLE\) return;[\s\S]*?\n  \}, \[currentServer, serverCandidatesKey, shared, token\]\);/,
  )?.[0];

  it("skips the immediate preview refetch when SSR already hydrated table preview data", () => {
    expect(liveRefreshEffect).toBeTruthy();
    expect(liveRefreshEffect).toContain(
      '(shared.data as unknown as Record<string, unknown> | undefined)?.mode === "live"',
    );
    expect(liveRefreshEffect).toContain("const hasInitialTablePreview = Boolean(getTablePreviewFromShared(shared));");
    expect(liveRefreshEffect).toContain("if (!hasInitialTablePreview) {");
    expect(liveRefreshEffect).toContain("void loadTablePreview();");
    expect(source).toContain('const serverCandidatesKey = serverCandidates.join("\\n");');
  });

  it("still short-circuits refresh lifecycle for non-live table shares", () => {
    expect(liveRefreshEffect).toContain("if (!liveMode) return;");
  });

  it("wires refreshes to visibility, focus, and interval lifecycle", () => {
    expect(source).toContain("void loadTablePreview();");
    expect(source).toContain('document.visibilityState === "visible"');
    expect(source).toContain('window.addEventListener("focus"');
    expect(source).toContain('document.addEventListener("visibilitychange"');
    expect(source).toContain("window.setInterval(");
    expect(source).toContain("window.clearInterval(");
  });

  it("preserves the last preview when refresh fails", () => {
    expect(source).toContain("setTableView((current) => ({");
    expect(source).toContain("preview: current.preview");
    expect(source).toContain('error: "暂时无法读取表格内容。"');
  });
});
