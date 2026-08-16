import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const isMacReleaseBuild =
  process.platform === "darwin" &&
  process.env.ELECTROBUN_OS === "macos" &&
  process.env.ELECTROBUN_BUILD_ENV !== "dev";

const shouldSkipLocalAdhocCodesign =
  !isMacReleaseBuild || Boolean(process.env.ELECTROBUN_DEVELOPER_ID);

export const shouldRunLocalAdhocCodesign = !shouldSkipLocalAdhocCodesign;

export const findAppBundleInDir = (dir: string) => {
  const appBundles = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"))
    .map((entry) => join(dir, entry.name));

  if (appBundles.length !== 1) {
    throw new Error(
      `Expected exactly one .app bundle in ${dir}, found ${appBundles.length}`
    );
  }

  return appBundles[0];
};

export const adhocCodesignAppBundle = async (appBundlePath: string) => {
  console.log(`[desktop] ad-hoc codesigning ${basename(appBundlePath)}`);

  const proc = Bun.spawn(
    ["codesign", "--force", "--deep", "--sign", "-", appBundlePath],
    {
      stdout: "inherit",
      stderr: "inherit",
    }
  );

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`codesign failed for ${appBundlePath} with exit code ${exitCode}`);
  }
};

export const rewriteTarballFromDir = async (
  tarballPath: string,
  cwdDir: string,
  entryName: string
) => {
  const repackProc = Bun.spawn(
    ["tar", "--zstd", "-cf", tarballPath, "-C", cwdDir, entryName],
    {
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        // Keep macOS AppleDouble (._*) files out of published archives.
        COPYFILE_DISABLE: "1",
      },
    }
  );

  const repackExitCode = await repackProc.exited;
  if (repackExitCode !== 0) {
    throw new Error(`failed to repack ${tarballPath} with exit code ${repackExitCode}`);
  }
};

export const withTempDir = async <T>(prefix: string, fn: (dir: string) => Promise<T>) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
