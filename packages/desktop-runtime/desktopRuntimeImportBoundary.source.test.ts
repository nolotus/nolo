import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

describe("desktop runtime import boundary", () => {
  test("uses resolvable relative paths for unpackaged sibling sources", () => {
    const handlersDir = join(import.meta.dir, "handlers");
    const violations: string[] = [];

    for (const name of readdirSync(handlersDir).filter(
      (entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts")
    )) {
      const sourcePath = join(handlersDir, name);
      const source = readFileSync(sourcePath, "utf8");
      if (/["'](?:cli|desktop-chrome-connector)\//.test(source)) violations.push(`${name}:bare`);

      for (const match of source.matchAll(
        /["'](\.\.\/\.\.\/(?:cli|desktop-chrome-connector)\/[^"']+)["']/g
      )) {
        const target = resolve(dirname(sourcePath), match[1]);
        if (![target, `${target}.ts`, `${target}.tsx`, `${target}.mjs`].some(existsSync)) {
          violations.push(`${name}:${match[1]}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
