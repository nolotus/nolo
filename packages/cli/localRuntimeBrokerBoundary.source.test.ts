import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function collectTypeScriptFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (entry === "dist") continue;
      files.push(...collectTypeScriptFiles(fullPath));
      continue;
    }
    if (!entry.endsWith(".ts")) continue;
    if (entry.endsWith(".test.ts")) continue;
    files.push(fullPath);
  }
  return files;
}

describe("CLI broker boundary", () => {
  it("does not import the server direct-level db module from CLI implementation files", () => {
    const cliDir = import.meta.dir;
    const directDbImportPattern = /(?:from\s+|import\(\s*)["'](?:\.\.\/)+database\/server\/db["']|(?:from\s+|import\(\s*)["']database\/server\/db["']/;
    const offenders = collectTypeScriptFiles(cliDir)
      .filter((filePath) => {
        const source = readFileSync(filePath, "utf8");
        return directDbImportPattern.test(source);
      })
      .map((filePath) => filePath.replace(`${cliDir}/`, ""));

    expect(offenders).toEqual([]);
  });
});
