const timeoutMs = "15000";
const maxConcurrency = "1";

const generatedOrBuildOutputs = [
  "packages/desktop/build/**",
  "packages/cli/dist/**",
  "packages/leveldb/android/.cxx/**",
  "packages/leveldb/android/build/**",
  // Intentional broken hashline-edit fixtures are agent-eval inputs, not suite tests.
  "scripts/benchmarks/fixtures/**",
];

const isolatedStatefulTests = [
  "packages/ai/agent/server/fetchPublicAgents.test.ts",
  "packages/ai/agent/hooks/usePublicAgents.test.ts",
  "packages/create/space/member/fetchUserSpaceMembershipsAction.test.ts",
];

const run = async (label: string, cmd: string[]) => {
  console.log(`\n[test] ${label}`);
  const proc = Bun.spawn({
    cmd,
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error(`[test] ${label} failed with exit code ${exitCode}`);
    process.exit(exitCode);
  }
};

await run("workspace link guard", ["bun", "./scripts/dev/workspaceLinkGuard.ts"]);

await run("source suite", [
  "bun",
  "test",
  "packages",
  "scripts",
  "--timeout",
  timeoutMs,
  "--max-concurrency",
  maxConcurrency,
  "--isolate",
  ...generatedOrBuildOutputs.flatMap((pattern) => ["--path-ignore-patterns", pattern]),
  ...isolatedStatefulTests.flatMap((pattern) => ["--path-ignore-patterns", pattern]),
]);

await run("stateful tests in a fresh Bun process", [
  "bun",
  "test",
  ...isolatedStatefulTests,
  "--timeout",
  timeoutMs,
  "--max-concurrency",
  maxConcurrency,
]);

