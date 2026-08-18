import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, cpSync, openSync, readSync, closeSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPublishArtifactCompiled } from "../../packages/cli/buildPublish";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "../..");
const CLI_SOURCE_DIR = join(REPO_ROOT, "packages/cli");

export type CliNativePlatform = {
  os: string;
  cpu: string;
  binaryName: string;
};

export const SUPPORTED_NATIVE_PLATFORMS: CliNativePlatform[] = [
  { os: "darwin", cpu: "arm64", binaryName: "nolo" },
  { os: "linux", cpu: "x64", binaryName: "nolo" },
];

export function resolveCurrentNativePlatform(): CliNativePlatform | null {
  const platform = process.platform;
  const arch = process.arch;
  return (
    SUPPORTED_NATIVE_PLATFORMS.find((p) => p.os === platform && p.cpu === arch) ||
    null
  );
}

export function buildNativePackageName(platform: CliNativePlatform): string {
  return `nolo-cli-${platform.os}-${platform.cpu}`;
}

/**
 * classic-level 的 JS 已全量 bundle 进编译二进制，shim (nodeGypBuildShim.ts)
 * 从随包的 prebuilds 目录定位 .node 原生文件。因此只需分发 classic-level 的
 * package.json + prebuilds/<目标平台>/，不再需要 abstract-level、node-gyp-build
 * 等其他 JS 依赖。
 */

/**
 * prebuilds 子目录名前缀 → 目标平台匹配。
 * classic-level v3 的 prebuilds 目录用 `<os>-<arch>` 或 `<os>-<arch>+<arch>` 命名。
 */
function prebuildDirMatchesTarget(dirName: string, os: string, cpu: string): boolean {
  const [osPart, archPartRaw] = dirName.split("-");
  if (osPart !== os) return false;
  if (!archPartRaw) return false;
  const archParts = archPartRaw.split("+");
  return archParts.includes(cpu);
}

/**
 * 校验编译产物 magic bytes，确保平台标签与实际二进制一致。
 * darwin-arm64: Mach-O 64-bit little-endian (`cf fa ed fe`) 或 fat binary (`ca fe ba be`)
 * linux-x64:    ELF (`7f 45 4c 46`), e_machine offset 18 低字节 `0x3e` = EM_X86_64
 */
export function assertBinaryMagicBytes(
  binaryPath: string,
  platform: CliNativePlatform,
): void {
  // 只读文件头 24 字节（二进制可达 ~100MB，全量 readFileSync 浪费内存）
  const fd = openSync(binaryPath, "r");
  let header: Buffer;
  try {
    header = Buffer.alloc(24);
    const bytesRead = readSync(fd, header, 0, 24, 0);
    header = header.subarray(0, bytesRead);
  } finally {
    closeSync(fd);
  }
  if (header.length < 20) {
    throw new Error(
      `Binary too small (${header.length} bytes) for magic-byte validation: ${binaryPath}`,
    );
  }

  const hex = (offset: number) => header[offset].toString(16).padStart(2, "0");

  if (platform.os === "darwin") {
    const magic = `${hex(0)} ${hex(1)} ${hex(2)} ${hex(3)}`;
    const isMachO64LE = magic === "cf fa ed fe";
    const isFat = magic === "ca fe ba be";
    if (!isMachO64LE && !isFat) {
      throw new Error(
        `darwin binary magic-byte mismatch: expected Mach-O (cf fa ed fe) or fat (ca fe ba be), got ${magic} at ${binaryPath}`,
      );
    }
    // fat binary header cputype at offset 4; Mach-O 64-bit cputype at offset 4
    if (isMachO64LE) {
      // cputype is a 4-byte LE int at offset 4; 0x0100000c = CPU_TYPE_ARM64
      const cputype = header.readUInt32LE(4);
      if (cputype !== 0x0100000c) {
        throw new Error(
          `darwin binary is Mach-O but not arm64 (cputype=0x${cputype.toString(16)}) at ${binaryPath}`,
        );
      }
    }
    // fat binary arch detection is more complex; skip cputype check for fat
  } else if (platform.os === "linux") {
    const magic = `${hex(0)} ${hex(1)} ${hex(2)} ${hex(3)}`;
    if (magic !== "7f 45 4c 46") {
      throw new Error(
        `linux binary magic-byte mismatch: expected ELF (7f 45 4c 46), got ${magic} at ${binaryPath}`,
      );
    }
    // offset 18 = e_machine (2 bytes, LE); 0x3e = EM_X86_64
    const eMachine = header.readUInt16LE(18);
    if (eMachine !== 0x3e) {
      throw new Error(
        `linux binary is ELF but not x86-64 (e_machine=0x${eMachine.toString(16)}) at ${binaryPath}`,
      );
    }
  }
}

/**
 * 把 classic-level 的 package.json + prebuilds（目标平台）复制进
 * packageDir/node_modules/classic-level/，并裁剪 prebuilds 仅保留目标平台。
 * classic-level 的 JS 已 bundle 进二进制，shim 只需要 prebuilds 里的 .node。
 */
function copyClassicLevelRuntimeDeps(
  packageDir: string,
  repoRoot: string,
  platform: CliNativePlatform,
): void {
  const srcClassicLevel = join(repoRoot, "node_modules", "classic-level");
  const destClassicLevel = join(packageDir, "node_modules", "classic-level");
  if (!existsSync(srcClassicLevel)) {
    throw new Error(
      `Cannot copy classic-level: ${srcClassicLevel} not found in repo node_modules`,
    );
  }

  mkdirSync(destClassicLevel, { recursive: true });

  // 复制 package.json（shim 候选1 可能需要它做 basename 定位）
  cpSync(
    join(srcClassicLevel, "package.json"),
    join(destClassicLevel, "package.json"),
    { force: true },
  );

  // 复制 prebuilds 并裁剪仅保留目标平台目录
  const srcPrebuilds = join(srcClassicLevel, "prebuilds");
  const destPrebuilds = join(destClassicLevel, "prebuilds");
  if (existsSync(srcPrebuilds)) {
    mkdirSync(destPrebuilds, { recursive: true });
    for (const entry of readdirSync(srcPrebuilds)) {
      if (prebuildDirMatchesTarget(entry, platform.os, platform.cpu)) {
        cpSync(join(srcPrebuilds, entry), join(destPrebuilds, entry), {
          force: true,
          recursive: true,
        });
      }
    }
  }
}

export async function prepareCliNativePackage(input: {
  repoRoot: string;
  outDir: string;
  platform?: CliNativePlatform;
  version?: string;
}): Promise<{ packageDir: string; binaryPath: string }> {
  const { repoRoot, outDir, platform, version } = input;
  const resolvedPlatform = platform ?? resolveCurrentNativePlatform();
  if (!resolvedPlatform) {
    throw new Error(
      `Unsupported native platform: ${process.platform}-${process.arch}. ` +
        `Supported: ${SUPPORTED_NATIVE_PLATFORMS.map((p) => `${p.os}-${p.cpu}`).join(", ")}`,
    );
  }

  const sourceDir = join(repoRoot, "packages/cli");
  const distDir = join(outDir, ".build-dist");
  mkdirSync(distDir, { recursive: true });

  const needsCrossCompile =
    resolvedPlatform.os !== process.platform ||
    resolvedPlatform.cpu !== process.arch;
  const target = needsCrossCompile
    ? `bun-${resolvedPlatform.os}-${resolvedPlatform.cpu}`
    : undefined;
  await buildPublishArtifactCompiled(sourceDir, distDir, target);

  const packageName = buildNativePackageName(resolvedPlatform);
  const packageDir = join(outDir, packageName);
  mkdirSync(packageDir, { recursive: true });

  const binarySource = join(distDir, "nolo");
  const binaryDest = join(packageDir, resolvedPlatform.binaryName);
  if (!existsSync(binarySource)) {
    throw new Error(`Compiled binary not found at ${binarySource}`);
  }
  cpSync(binarySource, binaryDest, { force: true });

  // Bug B guard: verify the binary matches the requested platform before
  // it leaves the staging pipeline. Fail fast rather than ship a mislabeled
  // ELF inside a darwin tarball (or vice versa).
  assertBinaryMagicBytes(binaryDest, resolvedPlatform);

  // Ship classic-level's native .node prebuilds alongside the compiled
  // binary. classic-level's JS is bundled into the binary; the shim
  // (nodeGypBuildShim.ts, aliased in at build time) resolves the .node
  // from this sibling node_modules/classic-level/prebuilds at runtime.
  copyClassicLevelRuntimeDeps(packageDir, repoRoot, resolvedPlatform);

  const sourceManifest = JSON.parse(
    readFileSync(join(sourceDir, "package.json"), "utf8"),
  );
  const nativeManifest = {
    name: packageName,
    version: version ?? sourceManifest.version,
    description: `Native ${resolvedPlatform.os}-${resolvedPlatform.cpu} binary for nolo-cli`,
    os: [resolvedPlatform.os],
    cpu: [resolvedPlatform.cpu],
    bin: { nolo: resolvedPlatform.binaryName },
    files: [resolvedPlatform.binaryName, "package.json", "node_modules/**"],
    publishConfig: { access: "public" },
    license: sourceManifest.license,
  };
  writeFileSync(
    join(packageDir, "package.json"),
    JSON.stringify(nativeManifest, null, 2) + "\n",
  );

  return { packageDir, binaryPath: binaryDest };
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const outDirIndex = args.indexOf("--out-dir");
  const outDir =
    outDirIndex >= 0 && outDirIndex + 1 < args.length
      ? args[outDirIndex + 1]
      : ".tmp/nolo-cli-native";

  const versionIndex = args.indexOf("--version");
  const version =
    versionIndex >= 0 && versionIndex + 1 < args.length
      ? args[versionIndex + 1]
      : undefined;

  const repoRoot = join(import.meta.dir, "../..");

  const { packageDir } = await prepareCliNativePackage({
    repoRoot,
    outDir,
    version,
  });
  console.log(`Staged native CLI package prepared at ${packageDir}`);
}