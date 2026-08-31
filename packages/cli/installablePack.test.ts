import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { prepareCliPublishPackage } from "../../scripts/release/prepareCliPublishPackage";

setDefaultTimeout(30_000);

/**
 * Smoke test: verify that the CLI can be packed and installed locally
 * without workspace protocol errors.
 * 
 * This test:
 * 1. Packs the dist artifact using npm pack
 * 2. Extracts the packed tarball into a temporary prefix
 * 3. Verifies the packaged CLI can be invoked
 */
describe("CLI installable pack smoke test", () => {
  const TEST_ROOT = join(process.cwd(), ".tmp", "cli-installable-pack");
  const DIST_DIR = join(TEST_ROOT, "dist-installable");
  const TEST_PREFIX = join(TEST_ROOT, "install-prefix");
  const NPM_CACHE_DIR = join(TEST_ROOT, "npm-cache");
  let packedTarball: string;
  let buildDistPromise: Promise<void> | null = null;

  const ensureBuiltDist = () => {
    if (!buildDistPromise) {
      buildDistPromise = (async () => {
        rmSync(DIST_DIR, { recursive: true, force: true });
        if (existsSync(TEST_PREFIX)) {
          rmSync(TEST_PREFIX, { recursive: true, force: true });
        }
        mkdirSync(TEST_PREFIX, { recursive: true });
        await prepareCliPublishPackage({
          repoRoot: process.cwd(),
          outDir: DIST_DIR,
        });
      })();
    }
    return buildDistPromise;
  };

  test("dist directory exists and has package.json", async () => {
    await ensureBuiltDist();
    expect(existsSync(DIST_DIR)).toBe(true);
    
    const pkgJsonPath = join(DIST_DIR, "package.json");
    expect(existsSync(pkgJsonPath)).toBe(true);
    
    const pkg = require(pkgJsonPath);
    expect(pkg.name).toBe("nolo-cli");
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin.nolo).toBe("index.js");
  });

  test("pack dist directory produces tarball", async () => {
    await ensureBuiltDist();
    // Run npm pack in the dist directory
    const cwd = DIST_DIR;
    const output = execSync("npm pack --silent", {
      cwd, 
      env: { ...process.env, npm_config_cache: NPM_CACHE_DIR },
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"]
    });
    
    const filename =
      output
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .find((line) => /^nolo-cli-\d+\.\d+\.\d+(-[\w.]+)?\.tgz$/.test(line)) ??
      readdirSync(DIST_DIR).find((entry) => /^nolo-cli-\d+\.\d+\.\d+(-[\w.]+)?\.tgz$/.test(entry));
    if (!filename) {
      throw new Error(`npm pack did not report a tarball filename: ${output}`);
    }
    packedTarball = join(DIST_DIR, filename);
    
    expect(existsSync(packedTarball)).toBe(true);
    expect(packedTarball).toMatch(/nolo-cli-\d+\.\d+\.\d+(-[\w.]+)?\.tgz$/);
  });

  test("packed tarball contains no workspace: protocols in package.json", async () => {
    if (!packedTarball) {
      throw new Error("Tarball not created in previous test");
    }

    // Extract and check package.json from tarball
    const extractCmd = `tar -xzf ${packedTarball} --strip-components=1 -C ${TEST_PREFIX} package/package.json`;
    execSync(extractCmd, { stdio: "inherit" });
    
    const extractedPkgPath = join(TEST_PREFIX, "package.json");
    expect(existsSync(extractedPkgPath)).toBe(true);
    
    const pkg = require(extractedPkgPath);
    
    // Verify no workspace: protocols in any dependency fields
    const depFields = ["dependencies", "devDependencies", "peerDependencies"];
    for (const field of depFields) {
      if (pkg[field]) {
        for (const [name, version] of Object.entries(pkg[field])) {
          expect(version).not.toContain("workspace:");
        }
      }
    }
  });

  test("extract packed tarball into temp prefix", () => {
    if (!packedTarball) {
      throw new Error("Tarball not created in previous test");
    }

    // Clean the test prefix for fresh extraction
    if (existsSync(TEST_PREFIX)) {
      rmSync(TEST_PREFIX, { recursive: true, force: true });
    }
    mkdirSync(TEST_PREFIX, { recursive: true });

    const extractCmd = `tar -xzf ${packedTarball} --strip-components=1 -C ${TEST_PREFIX} package`;
    execSync(extractCmd, { stdio: "inherit" });

    expect(existsSync(join(TEST_PREFIX, "package.json"))).toBe(true);
  });

  test("extracted CLI has executable bin", () => {
    const binPath = join(TEST_PREFIX, "index.js");

    expect(existsSync(binPath)).toBe(true);
  });

  test("invoke extracted CLI with --help flag", () => {
    const cliIndexPath = join(TEST_PREFIX, "index.js");
    const helpOutputPath = join(TEST_ROOT, "help-output.txt");

    execSync(`node ${cliIndexPath} --help > ${helpOutputPath}`, {
      stdio: "inherit",
      timeout: 15_000, // 兜底：native binding 异常时不卡死 CI
    });
    const output = readFileSync(helpOutputPath, "utf8");

    // Basic smoke check: output should contain something CLI-related
    expect(output.length).toBeGreaterThan(0);
  });

  test("published bundle has no createRequire lazy .ts paths (P0 MODULE_NOT_FOUND guard)", async () => {
    await ensureBuiltDist();
    const indexPath = join(DIST_DIR, "index.js");
    expect(existsSync(indexPath)).toBe(true);
    const source = readFileSync(indexPath, "utf8");

    // (a) createRequire indirection must be gone — esbuild cannot bundle it.
    expect(source).not.toContain("requireFromAdapter");

    // (b) No residual require("...ts") / requireFromAdapter("...ts") literals.
    const tsRequirePattern = /require(?:FromAdapter)?\(\s*["'][^"']*\.ts["']/;
    expect(tsRequirePattern.test(source)).toBe(false);
  });
});
