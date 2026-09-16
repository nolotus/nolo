import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Electrobun 的 `Updater.getLocalInfo` 以 `../Resources/version.json`（相对
 * `process.cwd()`）解析安装元数据，并在首次读取后缓存整个进程（失败也缓存空值）。
 * 打包版启动时把 cwd 切到用户工作目录（$HOME），该相对路径必然 ENOENT：更新器拿到
 * 空 channel，检查更新在联网前就报 "Unsupported update channel"，点更新永远失败
 * （真实复现见 desktopUpdaterRepro.test.ts）。
 *
 * 修复：在第一次读取之前，临时把 cwd 切回安装目录（dirname(process.execPath)）预热
 * 一次，此后进程内所有 Updater 读取（check / download / apply 与设置页快照）都命中
 * 同一份正确缓存。失败时 fail-soft —— 不阻塞启动，更新器行为与修复前一致。
 */

/** prime 需要的最小 Updater 表面（测试可注入替身）。 */
type ElectrobunInstallMetadataReader = {
  localInfo: {
    channel: () => Promise<string>;
  };
};

export type PrimeElectrobunInstallMetadataOptions = {
  /** dirname(process.execPath)：electrobun 的 `../Resources` 相对它解析。 */
  executableDir: string;
  /** 打包资源目录；存在 version.json 才算已安装（dev 构建没有该文件）。 */
  packagedResourcesDir: string;
  updater: ElectrobunInstallMetadataReader;
  pathExists?: (path: string) => boolean;
  cwd?: () => string;
  chdir?: (dir: string) => void;
  warn?: (message: string, error?: unknown) => void;
};

type PrimeElectrobunInstallMetadataResult =
  | { primed: true; channel: string }
  | { primed: false; reason: "not-packaged" | "read-failed" };

export const primeElectrobunInstallMetadata = async (
  options: PrimeElectrobunInstallMetadataOptions,
): Promise<PrimeElectrobunInstallMetadataResult> => {
  const {
    executableDir,
    packagedResourcesDir,
    updater,
    pathExists = existsSync,
    cwd = () => process.cwd(),
    chdir = (dir: string) => process.chdir(dir),
    warn = (message: string, error?: unknown) => console.warn(message, error),
  } = options;

  if (!pathExists(join(packagedResourcesDir, "version.json"))) {
    // dev / 未打包安装没有可读的元数据（更新也被设计为禁用），保持既有行为。
    return { primed: false, reason: "not-packaged" };
  }

  const previousCwd = cwd();
  const needsChdir = previousCwd !== executableDir;
  try {
    if (needsChdir) chdir(executableDir);
    const channel = await updater.localInfo.channel();
    return { primed: true, channel };
  } catch (error) {
    warn("[desktop] failed to prime electrobun install metadata", error);
    return { primed: false, reason: "read-failed" };
  } finally {
    if (needsChdir) {
      try {
        chdir(previousCwd);
      } catch (error) {
        warn("[desktop] failed to restore cwd after priming install metadata", error);
      }
    }
  }
};
