import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const runnerSource = () => readFileSync("scripts/test/runDefaultSuite.ts", "utf8");

test("package test delegates to the default suite runner", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.scripts.test).toBe("bun ./scripts/test/runDefaultSuite.ts");
});

test("default suite excludes generated outputs from source test truth", () => {
  const source = runnerSource();
  expect(source).toContain('"packages/cli/dist/**"');
  expect(source).toContain('"packages/desktop/build/**"');
  expect(source).toContain('"packages/leveldb/android/.cxx/**"');
  expect(source).not.toContain("packages/cli/dist/client/agentCommands.test.ts");
});

test("default suite isolates valuable stateful tests instead of dropping them", () => {
  const source = runnerSource();
  expect(source).toContain('"packages/ai/agent/server/fetchPublicAgents.test.ts"');
  expect(source).toContain('"packages/ai/agent/hooks/usePublicAgents.test.ts"');
  expect(source).toContain('"packages/create/space/member/fetchUserSpaceMembershipsAction.test.ts"');
  expect(source).toContain("stateful tests in a fresh Bun process");
});
