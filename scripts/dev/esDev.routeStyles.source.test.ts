import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "esDev.js"), "utf8");

describe("esDev route-style sync source contract", () => {
  it("imports the shared route-style generator", () => {
    expect(source).toContain('from "./routeStyles.js"');
    expect(source).toContain("copyRouteStyles");
  });

  it("synchronizes route styles before publishing the dev build manifest", () => {
    expect(source).toContain(
      "await copyRouteStyles({ skipUnchanged: true })"
    );
    // Within the onEnd handler, the route-style sync call must come before the manifest publish call.
    const onEndIndex = source.indexOf('build.onEnd(async (result) => {');
    expect(onEndIndex).toBeGreaterThan(-1);
    const onEndBlock = source.slice(onEndIndex);
    const copyIndex = onEndBlock.indexOf(
      "await copyRouteStyles({ skipUnchanged: true })"
    );
    const publishIndex = onEndBlock.indexOf("publishDevWebBuildSignal");
    expect(copyIndex).toBeGreaterThan(-1);
    expect(publishIndex).toBeGreaterThan(copyIndex);
  });

  it("does not silently publish a partially refreshed build when route-style sync fails", () => {
    // On failure the onEnd handler must return before reaching publishDevWebBuildSignal.
    const tryBlock = source.match(
      /try\s*\{[\s\S]*?await copyRouteStyles\(\{ skipUnchanged: true \}\);[\s\S]*?\}\s*catch[\s\S]*?return;/
    );
    expect(tryBlock).not.toBeNull();
    expect(source).toContain("路由级样式同步失败");
  });
});
