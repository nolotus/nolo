import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { ROUTE_STYLE_OUTPUT_NAMES } from "./routeStyles.js";

// 契约：源码里引用的每个 /public/route-styles/*.css 都必须由
// scripts/dev/routeStyles.js 的权威清单生成；否则构建绿灯但线上 404。
const REFERENCE_PATTERN = /\/public\/route-styles\/([a-z0-9-]+\.css)/gi;

const collectReferencedRouteStyles = () => {
  const glob = new Bun.Glob("packages/**/*.{ts,tsx,js,jsx}");
  const referenced = new Map<string, Set<string>>();
  for (const path of glob.scanSync({ onlyFiles: true })) {
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(REFERENCE_PATTERN)) {
      const name = match[1].toLowerCase();
      const referrers = referenced.get(name) ?? new Set<string>();
      referrers.add(path);
      referenced.set(name, referrers);
    }
  }
  return referenced;
};

describe("route-styles reference contract", () => {
  it("every referenced route-style is produced by the authoritative generator map", () => {
    const referenced = collectReferencedRouteStyles();
    expect(referenced.size).toBeGreaterThan(0);
    const missing = [...referenced.entries()].filter(
      ([name]) => !ROUTE_STYLE_OUTPUT_NAMES.includes(name)
    );
    expect(
      missing.map(
        ([name, referrers]) =>
          `${name} referenced by ${[...referrers].join(", ")}`
      )
    ).toEqual([]);
  });
});
