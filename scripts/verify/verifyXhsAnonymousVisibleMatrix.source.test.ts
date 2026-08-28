import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const scriptPath = join(import.meta.dir, "verifyXhsAnonymousVisibleMatrix.ts");
const packageJson = readFileSync(
  join(import.meta.dir, "..", "..", "package.json"),
  "utf8",
);

describe("verifyXhsAnonymousVisibleMatrix source contract", () => {
  it("is a registered verify script with dry-run safety", () => {
    expect(existsSync(scriptPath)).toBe(true);
    const source = readFileSync(scriptPath, "utf8");
    expect(packageJson).toContain("verify:xhs-anonymous-visible-matrix");
    expect(packageJson).toContain("scripts/verify/verifyXhsAnonymousVisibleMatrix.ts");
    expect(source).toContain("--run");
    expect(source).toContain("--attempts");
    expect(source).toContain("--routes");
    expect(source).toContain("dryRun");
  });

  it("uses the anonymous desktop bridge instead of login, cookies, or internal API routes", () => {
    expect(existsSync(scriptPath)).toBe(true);
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain("readXhsProfileWithBridge");
    expect(source).toContain("NOLO_XHS_READER_DESKTOP_CHANNEL");
    expect(source).toContain("assertNoSensitiveText");
    expect(source).toContain("匿名公开");
    expect(source).not.toMatch(/cookie\s*[:=]/i);
    expect(source).not.toMatch(/web_session\s*[:=]/i);
    expect(source).not.toContain("NOLO_XHS_READER_PROFILE_DIR");
    expect(source).not.toMatch(/--disable-blink-features/i);
    expect(source).not.toMatch(/AutomationControlled/i);
  });

  it("reports the anonymous-visible data matrix instead of requiring comment collection", () => {
    expect(existsSync(scriptPath)).toBe(true);
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain("visibleCoverage");
    expect(source).toContain("pageDiagnostics");
    expect(source).toContain("bodyTextLength");
    expect(source).toContain("visibleNoteLinkCount");
    expect(source).toContain("directProfile");
    expect(source).toContain("homepageWarmupThenProfile");
    expect(source).toContain("persistentAnonymousWarmupThenProfile");
    expect(source).toContain("accessPattern");
    expect(source).toContain("anonymousSessionMode");
    expect(source).toContain("attempts");
    expect(source).toContain("bestAttempt");
    expect(source).toContain("noteCount");
    expect(source).toContain("coverCount");
    expect(source).toContain("highestLikedTitle");
    expect(source).toContain("commentSummary");
    expect(source).toContain("未采集");
    expect(source).not.toContain("read_visible_details");
    expect(source).not.toContain("includeComments: true");
  });

  it("redacts pasted profile xsec_token values from dry-run and result JSON", () => {
    expect(existsSync(scriptPath)).toBe(true);
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain("redactXhsSensitiveValue");
    expect(source).toContain("redactProfileUrl");
    expect(source).toContain("profileUrls.map(redactProfileUrl)");
    expect(source).toContain("profileUrl: redactProfileUrl(profileUrl)");
  });
});
