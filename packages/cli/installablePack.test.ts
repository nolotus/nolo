import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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
  // Keep the install root outside the repository. Otherwise Node can walk up
  // to the monorepo node_modules and hide missing publish dependencies.
  const TEST_ROOT = mkdtempSync(join(tmpdir(), "nolo-cli-installable-pack-"));
  const DIST_DIR = join(TEST_ROOT, "dist-installable");
  const TEST_PREFIX = join(TEST_ROOT, "install-prefix");
  const NPM_INSTALL_ROOT = join(TEST_ROOT, "npm-install");
  const NPM_CACHE_DIR = join(TEST_ROOT, "npm-cache");
  let packedTarball: string;
  let buildDistPromise: Promise<void> | null = null;
  let packPromise: Promise<string> | null = null;
  let extractPromise: Promise<void> | null = null;

  afterAll(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

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

  const ensurePackedTarball = () => {
    if (!packPromise) {
      packPromise = (async () => {
        await ensureBuiltDist();
        const output = execFileSync("npm", ["pack", "--silent"], {
          cwd: DIST_DIR,
          env: { ...process.env, npm_config_cache: NPM_CACHE_DIR },
          encoding: "utf8",
          stdio: ["inherit", "pipe", "pipe"],
        });
        const filename =
          output
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .find((line) => /^nolo-cli-\d+\.\d+\.\d+(-[\w.]+)?\.tgz$/.test(line)) ??
          readdirSync(DIST_DIR).find((entry) =>
            /^nolo-cli-\d+\.\d+\.\d+(-[\w.]+)?\.tgz$/.test(entry)
          );
        if (!filename) {
          throw new Error(`npm pack did not report a tarball filename: ${output}`);
        }
        packedTarball = join(DIST_DIR, filename);
        return packedTarball;
      })();
    }
    return packPromise;
  };

  const ensureExtractedPackage = () => {
    if (!extractPromise) {
      extractPromise = (async () => {
        await ensurePackedTarball();
        rmSync(TEST_PREFIX, { recursive: true, force: true });
        mkdirSync(TEST_PREFIX, { recursive: true });
        execFileSync(
          "tar",
          ["-xzf", packedTarball, "--strip-components=1", "-C", TEST_PREFIX, "package"],
          { stdio: "inherit" }
        );
      })();
    }
    return extractPromise;
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
    await ensurePackedTarball();
    
    expect(existsSync(packedTarball)).toBe(true);
    expect(packedTarball).toMatch(/nolo-cli-\d+\.\d+\.\d+(-[\w.]+)?\.tgz$/);
  });

  test("packed tarball contains no workspace: protocols in package.json", async () => {
    await ensurePackedTarball();

    // Extract and check package.json from tarball
    execFileSync(
      "tar",
      ["-xzf", packedTarball, "--strip-components=1", "-C", TEST_PREFIX, "package/package.json"],
      { stdio: "inherit" }
    );
    
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

  test("extract packed tarball into temp prefix", async () => {
    await ensureExtractedPackage();

    expect(existsSync(join(TEST_PREFIX, "package.json"))).toBe(true);
  });

  test("extracted CLI has executable bin", async () => {
    await ensureExtractedPackage();
    const binPath = join(TEST_PREFIX, "index.js");

    expect(existsSync(binPath)).toBe(true);
  });

  test("invoke extracted CLI with --help flag", async () => {
    await ensureExtractedPackage();
    const cliIndexPath = join(TEST_PREFIX, "index.js");
    const output = execFileSync("node", [cliIndexPath, "--help"], {
      encoding: "utf8",
      timeout: 15_000, // 兜底：native binding 异常时不卡死 CI
    });

    // Basic smoke check: output should contain something CLI-related
    expect(output.length).toBeGreaterThan(0);
  });

  test("installed tarball runs dialog read help without repository dependencies", async () => {
    await ensurePackedTarball();
    mkdirSync(NPM_INSTALL_ROOT, { recursive: true });
    execFileSync(
      "npm",
      [
        "install",
        "--prefix",
        NPM_INSTALL_ROOT,
        "--cache",
        NPM_CACHE_DIR,
        "--no-audit",
        "--no-fund",
        packedTarball,
      ],
      { encoding: "utf8", timeout: 90_000 }
    );

    const installedCliPath = join(
      NPM_INSTALL_ROOT,
      "node_modules",
      "nolo-cli",
      "index.js"
    );
    const output = execFileSync(
      "node",
      [installedCliPath, "dialog", "read", "--help"],
      { cwd: NPM_INSTALL_ROOT, encoding: "utf8", timeout: 30_000 }
    );

    expect(output).toContain("Usage:\n  nolo dialog read");
    expect(output).not.toContain("Dynamic require");
  }, 120_000);

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
