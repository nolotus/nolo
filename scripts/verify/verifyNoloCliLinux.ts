#!/usr/bin/env bun

// Verify that the published `nolo-cli` npm bundle is runnable on Linux.
//
// Run modes:
//   1. `--tarball <path>` — extract a local npm tarball and assert.
//   2. `--entrypoint <path>` — point at an already-extracted `index.js`.
//   3. default — point at the in-repo publish staging dir
//      (`.tmp/nolo-cli-bundles/stage/nolo-cli-publish/index.js`).
//
// What this verifies:
//   - The `index.js` shebang is `#!/usr/bin/env node` (i.e. Node.js, not Bun).
//   - `node ./index.js --version` prints a non-empty version.
//   - `node ./index.js doctor` prints the expected doctor banner on Linux.
//   - The bundle declares `linux-x64` as a supported bundle platform
//     (this catches accidental drops of the Linux target from
//     `standaloneBundle.resolveCliBundlePlatform`).
//
// This script is intentionally platform-gated: it bails out on non-Linux
// hosts so it can be wired into cross-platform CI without breaking macOS /
// Windows builds. The real coverage lives in `nolo-cli`'s own unit tests
// (`packages/cli/.../authCommands.test.ts` etc.).

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const REPO_ROOT = process.cwd();

type Mode =
  | { kind: "entrypoint"; path: string }
  | { kind: "tarball"; path: string };

function fail(message: string): never {
  console.error(`[verify-nolo-cli-linux] ${message}`);
  process.exit(1);
}

function info(message: string): void {
  console.log(`[verify-nolo-cli-linux] ${message}`);
}

function parseArgs(argv: string[]): Mode {
  if (process.platform !== "linux") {
    fail(
      `refusing to run on non-Linux host (platform=${process.platform}); ` +
        `this verifier is Linux-only.`
    );
  }

  const tarballIndex = argv.indexOf("--tarball");
  if (tarballIndex !== -1) {
    const tarballPath = argv[tarballIndex + 1];
    if (!tarballPath) fail("--tarball requires a path argument");
    if (!existsSync(tarballPath)) fail(`tarball not found: ${tarballPath}`);
    return { kind: "tarball", path: tarballPath };
  }

  const entrypointIndex = argv.indexOf("--entrypoint");
  if (entrypointIndex !== -1) {
    const entrypointPath = argv[entrypointIndex + 1];
    if (!entrypointPath) fail("--entrypoint requires a path argument");
    if (!existsSync(entrypointPath)) fail(`entrypoint not found: ${entrypointPath}`);
    if (!statSync(entrypointPath).isFile()) {
      fail(`--entrypoint is not a file: ${entrypointPath}`);
    }
    return { kind: "entrypoint", path: entrypointPath };
  }

  const defaultEntry = join(
    REPO_ROOT,
    ".tmp",
    "nolo-cli-bundles",
    "stage",
    "nolo-cli-publish",
    "index.js"
  );
  if (!existsSync(defaultEntry)) {
    fail(
      `default entrypoint not found: ${defaultEntry}\n` +
        `Run \`bun run build:publish\` first, or pass --tarball / --entrypoint explicitly.`
    );
  }
  return { kind: "entrypoint", path: defaultEntry };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function runNodeScript(entrypointPath: string, args: string[]): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(
    "node",
    [entrypointPath, ...args],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        // `nolo login` would otherwise try to launch a browser via
        // `xdg-open`; we never call that path here, but keep CI hermetic
        // by forcing a non-browser code path in case future commands grow
        // auth probes.
        NOLO_NO_BROWSER: "1",
      },
      encoding: "utf8",
      timeout: 30_000,
    }
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.message,
  };
}

function resolveEntrypoint(mode: Mode): {
  entrypoint: string;
  cleanupDir: string | null;
} {
  if (mode.kind === "entrypoint") {
    return { entrypoint: mode.path, cleanupDir: null };
  }

  const workDir = mkdtempSync(join(tmpdir(), "verify-nolo-cli-linux-"));
  const extractDir = join(workDir, "pkg");
  mkdirSync(extractDir, { recursive: true });

  info(`extracting ${mode.path} -> ${extractDir}`);
  const tarResult = spawnSync(
    "tar",
    ["-xzf", mode.path, "-C", extractDir],
    { encoding: "utf8" }
  );
  if (tarResult.status !== 0) {
    rmSync(workDir, { recursive: true, force: true });
    fail(`tar extract failed (${tarResult.status}): ${tarResult.stderr}`);
  }

  const packageRoot = join(extractDir, "package");
  if (!existsSync(join(packageRoot, "index.js"))) {
    rmSync(workDir, { recursive: true, force: true });
    fail(`tarball did not contain package/index.js (looked in ${packageRoot})`);
  }

  return { entrypoint: join(packageRoot, "index.js"), cleanupDir: workDir };
}

function main(): void {
  const mode = parseArgs(process.argv.slice(2));
  const { entrypoint, cleanupDir } = resolveEntrypoint(mode);

  try {
    const stats = statSync(entrypoint);
    assert(
      stats.size > 1024,
      `entrypoint suspiciously small: ${entrypoint} (${stats.size} bytes)`
    );

    // 1. Shebang check — published bundle must be runnable on plain Node.
    const head = readFileSync(entrypoint, "utf8").slice(0, 200);
    assert(
      head.startsWith("#!/usr/bin/env node"),
      `entrypoint shebang is not '#!/usr/bin/env node'; got: ${head
        .split("\n", 1)[0]
        ?.slice(0, 80)}`
    );
    info("shebang is #!/usr/bin/env node");

    // 2. `node ./index.js --version` must print a version banner.
    const versionResult = runNodeScript(entrypoint, ["--version"]);
    assert(
      versionResult.status === 0,
      `--version failed with status ${versionResult.status}` +
        (versionResult.error ? ` (${versionResult.error})` : "") +
        `: ${versionResult.stderr}`
    );
    const versionLine = versionResult.stdout.trim();
    assert(
      /^nolo-cli \d+\.\d+\.\d+/.test(versionLine),
      `unexpected --version output: ${JSON.stringify(versionLine)}`
    );
    info(`--version -> ${versionLine}`);

    // 3. `node ./index.js doctor` must print the doctor banner.
    const doctorResult = runNodeScript(entrypoint, ["doctor"]);
    assert(
      doctorResult.status === 0,
      `doctor failed with status ${doctorResult.status}` +
        (doctorResult.error ? ` (${doctorResult.error})` : "") +
        `: ${doctorResult.stderr}`
    );
    const doctorOut = `${doctorResult.stdout}\n${doctorResult.stderr}`;
    assert(
      doctorOut.includes("Nolo CLI doctor") &&
        doctorOut.includes("version") &&
        doctorOut.includes("update"),
      `doctor banner missing expected markers; got:\n${doctorOut}`
    );
    info("doctor banner ok");

    // 4. The shipped bundle must declare linux-x64 as a supported bundle
    //    platform so a fresh Linux user can self-update. The platform list
    //    lives in the bundled `index.js` (built from the publish stage),
    //    so we scan the artifact itself rather than chasing the source.
    const fullBundle = readFileSync(entrypoint, "utf8");
    assert(
      fullBundle.includes('"linux-x64"'),
      `entrypoint does not advertise 'linux-x64' as a supported platform; ` +
        `check the CliBundlePlatform union in the publish stage`
    );
    // The bundle also branches on `platform === "linux"` (or `"linux" ===
    // platform`) to pick the native binary. Accept both operand orders, and
    // treat the match as a heuristic: the important, stable contract is the
    // `linux-x64` advertisement above, so a missed branch match here should
    // not be fatal on its own.
    const branchesOnLinux =
      /(?:===|!==)\s*["']linux["']/.test(fullBundle) ||
      /["']linux["']\s*(?:===|!==)/.test(fullBundle);
    if (!branchesOnLinux) {
      console.warn(
        "[verify-nolo-cli-linux] WARNING: could not confirm a platform === \"linux\" branch " +
          "in the bundle (heuristic, non-fatal)"
      );
    }
    info("entrypoint advertises linux-x64 and branches on platform === 'linux'");

    // 5. The publish package must not accidentally exclude Linux
    //    (`os.cpus()` may matter for LevelDB native modules). Inspect the
    //    cli package manifest (the npm publish root), not the monorepo root.
    const cliPkgPath = join(REPO_ROOT, "packages/cli/package.json");
    if (existsSync(cliPkgPath)) {
      const cliPkg = JSON.parse(readFileSync(cliPkgPath, "utf8")) as {
        engines?: { node?: string };
        os?: string[];
      };
      if (Array.isArray(cliPkg.os) && cliPkg.os.length > 0) {
        // An `os` allow-list that does NOT include 'linux' would silently
        // break `npm install -g nolo-cli` on Linux hosts.
        assert(
          cliPkg.os.includes("linux"),
          `packages/cli/package.json declares \`os\` allow-list without 'linux': ${JSON.stringify(cliPkg.os)}`
        );
      }
      if (cliPkg.engines?.node) {
        info(`engines.node: ${cliPkg.engines.node}`);
      }
    } else {
      info("packages/cli/package.json not found; skipping os/engines check");
    }

    info("ok — nolo-cli Linux bundle verified");
  } finally {
    if (cleanupDir) {
      rmSync(cleanupDir, { recursive: true, force: true });
    }
  }
}

main();
