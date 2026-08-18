import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const scriptPath = join(import.meta.dir, "verifyXhsHumanDiff.ts");
const packageJson = readFileSync(
  join(import.meta.dir, "..", "..", "package.json"),
  "utf8",
);

describe("verifyXhsHumanDiff source contract", () => {
  it("is a registered dry-run verify script for manual anonymous desktop diffs", () => {
    expect(existsSync(scriptPath)).toBe(true);
    const source = readFileSync(scriptPath, "utf8");
    expect(packageJson).toContain("verify:xhs-human-diff");
    expect(packageJson).toContain("scripts/verify/verifyXhsHumanDiff.ts");
    expect(source).toContain("--run");
    expect(source).toContain("--manual-ms");
    expect(source).toContain("--start=<explore|profile>");
    expect(source).toContain("startMode");
    expect(source).toContain("dryRun");
    expect(source).toContain("xhs-human-diff");
  });

  it("captures before/after/events/diff artifacts instead of writing tables or using login state", () => {
    expect(existsSync(scriptPath)).toBe(true);
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain("before.json");
    expect(source).toContain("after.json");
    expect(source).toContain("events.json");
    expect(source).toContain("diff.json");
    expect(source).toContain("before.png");
    expect(source).toContain("after.png");
    expect(source).toContain('context.on("page"');
    expect(source).toContain("activePage");
    expect(source).toContain("visibleCloseCandidates");
    expect(source).toContain("visibleNoteLinks");
    expect(source).toContain("visibleCards");
    expect(source).toContain("initialStateNoteCount");
    expect(source).not.toContain("createTable");
    expect(source).not.toContain("addTableRow");
  });

  it("keeps the probe anonymous and forbids risky automation shortcuts", () => {
    expect(existsSync(scriptPath)).toBe(true);
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain("resolveXhsAnonymousUserDataDir");
    expect(source).toContain("resolveXhsDesktopBrowserChannel");
    expect(source).toContain("匿名");
    expect(source).not.toMatch(/cookie\s*[:=]/i);
    expect(source).not.toMatch(/web_session\s*[:=]/i);
    expect(source).not.toContain("NOLO_XHS_READER_PROFILE_DIR");
    expect(source).not.toMatch(/--disable-blink-features/i);
    expect(source).not.toMatch(/AutomationControlled/i);
    expect(source).not.toMatch(/stealth/i);
  });
});
