import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("package scripts no longer expose a standalone tool-worker runtime", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.scripts["dev:tool-worker"]).toBeUndefined();
  // dev is the single dev entry (api + web watch); api-only entries like
  // dev:api are gone so stale-bundle traps can't happen.
  expect(pkg.scripts["dev:api"]).toBeUndefined();
  expect(pkg.scripts["dev"]).toContain("bun ./scripts/dev/devRunner.ts");
});
