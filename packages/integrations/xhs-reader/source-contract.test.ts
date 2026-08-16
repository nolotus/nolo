import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Source-contract tests: verify that the xhs-reader module does not
 * expose or reference write endpoints.
 */

const WRITE_PATTERNS = [
  // Write API endpoints (exclude comment/page which is a read endpoint)
  /\/api\/sns\/web\/.*\/(like|unlike|collect|uncollect|delete|upload|post|create|follow|unfollow)/i,
  /\/api\/sns\/web\/.*\/comment(?!\/page)/i,
  // Function names that suggest write actions
  /\b(likeNote|unlikeNote|collectNote|uncollectNote|postComment|deleteNote|uploadMedia|createPost|followUser|unfollowUser)\b/,
];

const SOURCE_DIR = join(__dirname);

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath));
    } else if (
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("source contract: no write endpoints", () => {
  const sourceFiles = getAllSourceFiles(SOURCE_DIR);

  test(`checking ${sourceFiles.length} source files for write patterns`, () => {
    const violations: Array<{ file: string; pattern: string; line: string }> = [];

    for (const file of sourceFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        for (const pattern of WRITE_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: file.replace(SOURCE_DIR, "."),
              pattern: pattern.source,
              line: line.trim().slice(0, 100),
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `${v.file}: "${v.line}" matched ${v.pattern}`)
        .join("\n");
      expect(`Found write patterns:\n${msg}`).toBe("");
    }
  });
});

describe("source contract: conservative browser automation defaults", () => {
  const sourceFiles = getAllSourceFiles(SOURCE_DIR);

  test("does not include stealth automation-control browser flags anywhere in xhs-reader", () => {
    for (const file of sourceFiles) {
      const source = readFileSync(file, "utf-8");
      expect(source).not.toContain("AutomationControlled");
      expect(source).not.toContain("--disable-blink-features");
    }
  });


  test("does not route profile reads through the direct XHS web API client", () => {
    const orchestratorSource = readFileSync(
      join(SOURCE_DIR, "orchestrator.ts"),
      "utf-8",
    );
    const bridgeSource = readFileSync(
      join(SOURCE_DIR, "bridge", "readXhsProfileWithBridge.ts"),
      "utf-8",
    );

    expect(orchestratorSource).not.toContain("createXhsApiClient");
    expect(orchestratorSource).not.toContain("getNoteDetail");
    expect(orchestratorSource).not.toContain("getAllCommentPages");
    expect(bridgeSource).toContain("context.cookies");
    expect(bridgeSource).toContain("hasAuthCookie && looksLoggedIn");
    expect(bridgeSource).toContain("refusing to read");
  });

  test("does not expose comment-collection or cookie-injection helper APIs", () => {
    for (const file of sourceFiles) {
      const source = readFileSync(file, "utf-8");
      expect(source).not.toContain("read_comments");
      expect(source).not.toContain("createXhsBrowserContext");
      expect(source).not.toContain("addCookies");
      expect(source).not.toContain("NOLO_XHS_READER_PROFILE_DIR");
    }
  });

  test("keeps the human-observed textless SVG login close path", () => {
    const collectorSource = readFileSync(
      join(SOURCE_DIR, "backends", "playwrightProfileCollector.ts"),
      "utf-8",
    );

    expect(collectorSource).toContain("textlessTopRightLoginIcon");
    expect(collectorSource).toContain("pageLooksLikeLogin");
    expect(collectorSource).toContain("const tagName = el.tagName.toLowerCase()");
    expect(collectorSource).toContain("tagName === \"svg\"");
  });
});
