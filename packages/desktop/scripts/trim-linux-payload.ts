import { mkdir, readdir, rm, symlink } from "node:fs/promises";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { withTempDir } from "./codesign-local";

/**
 * Linux 打包载荷裁剪（postPackage 阶段，在 applyLinuxLauncherPreflight 之前
 * 对 artifacts/ 里的 *.tar.zst 成品归档做 extract → trim → repack）。
 *
 * 针对 canary Linux 载荷的四项实测冗余（installed ~731MB / 下载 ~244MB）：
 *
 * 1. CEF 资源双份：tar 内 bin/cef/ 与 bin/ 顶层各有一套 locales/pak/dat，
 *    CEF 进程只消费 bin/ 顶层（--locales-dir-path=bin/locales），cef/ 内约
 *    75MB 是死重。自解压器支持符号链接（'2'），用相对软链 cef/x → ../x
 *    指回顶层：既去重又保住按 cef/ 路径查找资源的兼容性。
 * 2. locales 全量 220 语言 ×（FEMININE/MASCULINE/NEUTER 变体）：产品只支持
 *    en/zh-CN/zh-TW/ja/ko（packages/app/i18n/types.ts），裁剪后省 ~95MB。
 * 3. updater 工具链 bspatch/zig-zstd：Linux 上 generatePatch 默认关闭
 *    （electrobun.config.ts — self-hosted runner 增量打包 OOM），没有运行时
 *    装机引用，~12.5MB。
 * 4. 名画资源：packages/app/pages/usePageArt.ts 无生产引用（Home 页
 *    source test 断言其不再使用），~6MB。
 *
 * fail closed：任何一步失败都让构建报错中止，宁可不发布也不要发出一个
 * 去重错误的包。
 */

export interface LinuxTrimReport {
  artifact: string;
  cefDedup: string[];
  localesRemoved: number;
  toolsRemoved: string[];
  publicArtRemoved: string[];
  bytesBefore: number;
  bytesAfter: number;
}

/** bin/cef/ 内与 bin/ 顶层重复的 CEF 资源（删后软链回顶层）。 */
export const CEF_DUPLICATE_NAMES = [
  "locales",
  "resources.pak",
  "icudtl.dat",
  "chrome_100_percent.pak",
  "chrome_200_percent.pak",
] as const;

/** 应用 i18n 支持语言（packages/app/i18n/types.ts）。 */
export const DESKTOP_SUPPORTED_LANGUAGES = ["en-US", "zh-CN", "zh-TW", "ja", "ko"] as const;

/** locales 文件命名：<lang>.pak 与 <lang>_<GENDER>.pak 语法性别变体。 */
export function isSupportedLocalePak(fileName: string): boolean {
  if (!fileName.endsWith(".pak")) return false;
  const lang = fileName.slice(0, -".pak".length).split("_")[0];
  return (DESKTOP_SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

/** Linux 无增量补丁链路（generatePatch off），这两个二进制无装机引用。 */
export const UNUSED_UPDATER_BINARIES = ["bspatch", "zig-zstd"] as const;

/** 已无生产引用的页面名画（usePageArt.ts 是死代码）。hiroshige-rain.jpg 也
 * 是孤儿（usePageArt 未引用、无其他生产引用），一并收录。-900.jpg 响应式
 * 变体在源树存在（public/*-900.jpg），并非构建期生成。 */
export const UNUSED_PUBLIC_ART_FILES = [
  "fankuan-mountains.jpg",
  "friedrich-wanderer.jpg",
  "guoxi-spring.jpg",
  "hiroshige-plum.jpg",
  "hiroshige-rain.jpg",
  "hiroshige-snow.jpg",
  "hokusai-fuji.jpg",
  "hokusai-thunder.jpg",
  "hokusai-wave.jpg",
  "millais-ophelia.jpg",
  "monet-waterlilies.jpg",
  "nizan-gentlemen.jpg",
  "tangyin-landscape.jpg",
  "turner-temeraire.jpg",
  "vermeer-milkmaid.jpg",
  "wangximeng-rivers.jpg",
] as const;

/** 与 UNUSED_PUBLIC_ART_FILES 配套的响应式 -900 变体。 */
export const UNUSED_PUBLIC_ART_900_VARIANTS = UNUSED_PUBLIC_ART_FILES
  .filter((n) => n !== "hiroshige-rain.jpg") // rain 无 -900 变体
  .map((n) => n.replace(/\.jpg$/, "-900.jpg")) as readonly string[];

/** 在已展开的应用根（tar 内唯一顶层目录，含 bin/Resources/）上执行裁剪。 */
export const trimLinuxAppRoot = async (
  appRoot: string,
  report: Omit<LinuxTrimReport, "artifact" | "bytesBefore" | "bytesAfter">,
): Promise<void> => {
  const binDir = join(appRoot, "bin");
  const cefDir = join(binDir, "cef");

  // 1. cef/ 重复资源 → 相对软链回 bin/ 顶层（cef/x → ../x）
  for (const name of CEF_DUPLICATE_NAMES) {
    const cefPath = join(cefDir, name);
    const topPath = join(binDir, name);
    if (!existsSync(cefPath) || !existsSync(topPath)) continue;
    await rm(cefPath, { recursive: true, force: true });
    await symlink(`../${name}`, cefPath);
    report.cefDedup.push(`bin/cef/${name}`);
  }

  // 2. locales 裁剪（只收 bin/locales；cef/locales 已是软链）
  const localesDir = join(binDir, "locales");
  if (existsSync(localesDir) && statSync(localesDir).isDirectory()) {
    for (const name of await readdir(localesDir)) {
      if (!isSupportedLocalePak(name)) {
        await rm(join(localesDir, name), { force: true });
        report.localesRemoved += 1;
      }
    }
  }

  // 3. updater 工具链
  for (const name of UNUSED_UPDATER_BINARIES) {
    const p = join(binDir, name);
    if (existsSync(p)) {
      await rm(p, { force: true });
      report.toolsRemoved.push(`bin/${name}`);
    }
  }

  // 4. 名画（含 -900 响应式变体）
  const publicDir = join(appRoot, "Resources", "app", "public");
  for (const name of [...UNUSED_PUBLIC_ART_FILES, ...UNUSED_PUBLIC_ART_900_VARIANTS]) {
    const p = join(publicDir, name);
    if (existsSync(p)) {
      await rm(p, { force: true });
      report.publicArtRemoved.push(name);
    }
  }

  // 5. chromiumFlags 透传断言（fail closed）：electrobun.config.ts 的
  // linux.chromiumFlags 必须写进 Resources/build.json。若上游 2.x 改了 schema
  // 导致静默不透传，这里直接让构建失败——而不是发一个退回软件光栅化的包。
  const buildJsonPath = join(appRoot, "Resources", "build.json");
  const buildJson = existsSync(buildJsonPath)
    ? (JSON.parse(readFileSync(buildJsonPath, "utf8")) as Record<string, unknown>)
    : {};
  const flags = buildJson.chromiumFlags as Record<string, unknown> | undefined;
  if (!flags || flags["disable-gpu-compositing"] !== false) {
    throw new Error(
      `[trim] Resources/build.json missing chromiumFlags.disable-gpu-compositing=false ` +
        `(got ${JSON.stringify(flags ?? null)}); electrobun config schema may have changed`,
    );
  }
};

const extractTarZst = async (archivePath: string, destDir: string): Promise<void> => {
  const proc = Bun.spawn(["tar", "--zstd", "-xf", archivePath, "-C", destDir], {
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await proc.exited) !== 0) {
    throw new Error(`tar extract failed for ${archivePath}`);
  }
};

const repackTarZst = async (appRootDirName: string, srcDir: string, archivePath: string): Promise<void> => {
  // --format=posix：强制 POSIX.2001 pax 格式。路径 >100 字符时写 PAX 扩展头
  // （'x'/'g'，自解压器支持）而不是 GNU longname 'L'/'K'（不支持，会触发
  // TarUnsupportedFileType 中止——2026-09-16 事故的同一类条目）。
  // --sort=name 固定条目序（可复现）；--numeric-owner --owner=0 --group=0
  // 抹平构建机 uid/gid。
  const proc = Bun.spawn(
    [
      "tar", "--zstd",
      "--format=posix", "--sort=name", "--numeric-owner", "--owner=0", "--group=0",
      "-cf", archivePath, "-C", srcDir, appRootDirName,
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  if ((await proc.exited) !== 0) {
    throw new Error(`tar repack failed for ${archivePath}`);
  }
};

/**
 * 裁剪 artifacts/ 下所有 Linux tar.zst 成品归档。
 * 返回每份归档的报告；artifactDir 里没有 Linux tar 时返回空数组。
 */
export const trimLinuxPayloadArtifacts = async (
  artifactDir: string,
): Promise<LinuxTrimReport[]> => {
  const tarballs = (await readdir(artifactDir))
    .filter((name) => name.includes("linux") && name.endsWith(".tar.zst"));

  // fail closed：Linux 构建必然应产出 tar.zst；零匹配说明产物缺失或路径漂移，
  // 必须报错而不是静默不裁剪。
  if (tarballs.length === 0) {
    throw new Error(`[trim] no linux *.tar.zst artifacts found under ${artifactDir}`);
  }

  const reports: LinuxTrimReport[] = [];
  for (const name of tarballs) {
    const archivePath = join(artifactDir, name);
    const bytesBefore = statSync(archivePath).size;

    await withTempDir("nolo-desktop-trim-", async (tempDir) => {
      await extractTarZst(archivePath, tempDir);

      // tar 内唯一顶层目录即应用根（NoloDesktop-<channel>/）
      const entries = (await readdir(tempDir)).filter(
        (e) => statSync(join(tempDir, e)).isDirectory(),
      );
      if (entries.length !== 1) {
        throw new Error(
          `Expected exactly one top-level dir in ${name}, found ${entries.length}: ${entries.join(", ")}`,
        );
      }
      const appRootName = entries[0];
      const appRoot = join(tempDir, appRootName);

      const report: LinuxTrimReport = {
        artifact: name,
        cefDedup: [],
        localesRemoved: 0,
        toolsRemoved: [],
        publicArtRemoved: [],
        bytesBefore,
        bytesAfter: 0,
      };
      await trimLinuxAppRoot(appRoot, report);
      await repackTarZst(appRootName, tempDir, archivePath);
      report.bytesAfter = statSync(archivePath).size;
      reports.push(report);
    });
  }
  return reports;
};
