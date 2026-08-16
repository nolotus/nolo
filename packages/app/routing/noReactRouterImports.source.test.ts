import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "bun:test";

const root = join(import.meta.dir, "../../..");
const allowed = new Set([
  "packages/app/routing/index.tsx",
  "packages/app/routing/server.tsx",
  "packages/app/routing/noReactRouterImports.source.test.ts",
]);

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "build")
        return [];
      return collectFiles(full);
    }
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

describe("react router import boundary", () => {
  it("keeps react-router-dom imports inside app/routing", () => {
    const offenders = collectFiles(join(root, "packages"))
      .map((file) => ({
        rel: file.slice(root.length + 1),
        source: readFileSync(file, "utf8"),
      }))
      .filter(({ rel }) => !allowed.has(rel))
      .filter(
        ({ source }) =>
          source.includes('"react-router-dom"') ||
          source.includes("'react-router-dom'") ||
          source.includes('"react-router-dom/server"') ||
          source.includes("'react-router-dom/server'"),
      )
      .map(({ rel }) => rel);

    expect(offenders).toEqual([]);
  });
});
