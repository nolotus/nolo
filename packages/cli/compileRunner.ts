/**
 * Standalone Bun.build compile runner for the compiled CLI binary.
 *
 * This script is invoked as a separate bun process (via spawnSync) to
 * avoid module-resolution flakiness when Bun.build is called from within
 * `bun test`. Running in a fresh process gives Bun.build the same module
 * resolution environment as `bun build --compile` CLI.
 *
 * The node-gyp-build → nodeGypBuildShim alias is applied via a BunPlugin.
 *
 * Args (passed via env NOLO_COMPILE_* to avoid CLI arg parsing issues):
 *   NOLO_COMPILE_ENTRY   - source entry path (index.ts)
 *   NOLO_COMPILE_OUTFILE - output binary path
 *   NOLO_COMPILE_TARGET  - optional target (e.g. "bun-linux-x64")
 *   NOLO_COMPILE_EXTERNAL - JSON array of external specifiers
 *   NOLO_COMPILE_SHIM    - absolute path to nodeGypBuildShim.ts
 *   NOLO_COMPILE_TSCONFIG - absolute path to tsconfig.json
 */

async function main() {
  const entry = process.env.NOLO_COMPILE_ENTRY;
  const outfile = process.env.NOLO_COMPILE_OUTFILE;
  const target = process.env.NOLO_COMPILE_TARGET;
  const externalJson = process.env.NOLO_COMPILE_EXTERNAL;
  const shimPath = process.env.NOLO_COMPILE_SHIM;
  const tsconfig = process.env.NOLO_COMPILE_TSCONFIG;

  if (!entry || !outfile || !shimPath) {
    console.error("Missing required NOLO_COMPILE_* env vars");
    process.exit(1);
  }

  const external = externalJson ? JSON.parse(externalJson) : [];

  const plugin: BunPlugin = {
    name: "node-gyp-build-shim",
    setup(build) {
      build.onResolve({ filter: /^node-gyp-build$/ }, () => ({
        path: shimPath,
      }));
    },
  };

  const compileOption = target
    ? { target: target as Bun.Build.CompileTarget, outfile }
    : { outfile };

  const result = await Bun.build({
    entryPoints: [entry],
    tsconfig: tsconfig,
    compile: compileOption,
    external,
    plugins: [plugin],
  });

  if (!result.success) {
    for (const log of result.logs) {
      // 输出完整 BuildMessage（含 position 文件/行/列），便于定位编译失败
      console.error(log);
    }
    process.exit(1);
  }
}

await main();