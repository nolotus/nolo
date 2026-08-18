import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "verifyXhsProfileTableSmoke.ts"),
  "utf8",
);
const packageJson = readFileSync(
  join(import.meta.dir, "..", "..", "package.json"),
  "utf8",
);

describe("verifyXhsProfileTableSmoke source contract", () => {
  it("uses the desktop/local CLI route for the full XHS table smoke", () => {
    expect(source).toContain('"agent"');
    expect(source).toContain('"run"');
    expect(source).toContain('"--local"');
    expect(source).toContain('"table"');
    expect(source).toContain('"query"');
    expect(source).toContain("read_xhs_profile -> createTable -> addTableRow -> table query");
  });

  it("requires explicit execution before creating remote table data", () => {
    expect(source).toContain("--run");
    expect(source).toContain("dryRun");
  });

  it("keeps the XHS collector anonymous-only plus explicit table writes", () => {
    expect(source).toContain("匿名公开模式");
    expect(source).toContain("不要登录、不要使用 cookie");
    expect(source).toContain("不要补采详情或评论");
    expect(source).toContain("评论未采集是正常结果");
    expect(source).toContain("anonymousUnavailable");
    expect(source).not.toContain("read_comments");
    expect(source).not.toContain("read_visible_details");
    expect(source).not.toContain("extendedCollectionConsent=true");
    expect(source).not.toContain("NOLO_XHS_READER_PROFILE_DIR");
    expect(source).toContain("createTable");
    expect(source).toContain("addTableRow");
  });

  it("rejects hidden platform automation shortcuts", () => {
    expect(source).toContain("assertNoSensitiveText");
    expect(source).toContain("stealth|bypass");
    expect(source).toContain("contains a disallowed automation route");
    expect(source).not.toMatch(/cookie\s*[:=]/i);
    expect(source).not.toMatch(/--server",/);
    expect(source).not.toMatch(/--disable-blink-features/i);
    expect(source).not.toMatch(/AutomationControlled/i);
  });

  it("is registered as the package verify entrypoint", () => {
    expect(packageJson).toContain("verify:xhs-profile-table-smoke");
    expect(packageJson).toContain("scripts/verify/verifyXhsProfileTableSmoke.ts");
  });
});
