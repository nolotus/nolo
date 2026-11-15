import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * macOS DMG 安装包的 `Resources/version.json` 补齐。
 *
 * 为什么需要这一步：electrobun 的 `Updater.getLocalInfo()` 硬编码只读
 * `../Resources/version.json`（2.0.4 与 2.0.6 都一样），读不到就返回全空对象，
 * 于是 `isBuildEnvironment("")` 为 false，设置页检查更新报
 * `Unsupported update channel: `，点更新永远失败。
 *
 * 而 hutch 只在打**更新包**（`*.app.tar.zst`）时写入该文件；`createBrandedMacosDmg`
 * 从 `.app` 或 electrobun 自打 DMG 里取源重新打包，那条路径不保证带上它。实测
 * 0.236.0 的 DMG：`Resources/` 里有 `metadata.json`（identifier/channel/hash）与
 * `app/`，但**没有 version.json** —— 全新安装的用户一装就报「不支持的更新通道」，
 * 而走更新流程的老用户反而正常（更新包里有）。
 *
 * 已有的构建闸门发现不了这个分叉：post-package.ts 的注释自己写明「dmg 无法在
 * 构建机上稳定解包比对，被扫描的是 .app.tar.zst」。
 *
 * 因此这里按更新包同源的元数据补写，且 **fail-closed**：源信息缺失或与期望不符
 * 时抛错，绝不让一个「装完不能更新」的 DMG 静默发出去。
 */

export type DmgVersionMetadata = {
  version: string;
  hash: string;
  channel: string;
  baseUrl: string;
  name: string;
  displayName?: string;
  identifier: string;
};

export type EnsureDmgVersionMetadataOptions = {
  /** 已就位到 staging 的 .app 路径。 */
  appBundlePath: string;
  /** 权威元数据：应与同一构建产出的更新包 version.json 完全一致。 */
  expected: DmgVersionMetadata;
  log?: (message: string) => void;
};

const readJsonIfPresent = (path: string): Record<string, unknown> | null => {
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const asTrimmed = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * 确保 staging 里的 .app 带正确的 Resources/version.json。
 * 返回是否发生了写入（便于日志与测试断言）。
 */
export const ensureDmgVersionMetadata = ({
  appBundlePath,
  expected,
  log = (message) => console.log(message),
}: EnsureDmgVersionMetadataOptions): boolean => {
  const resourcesDir = join(appBundlePath, "Contents", "Resources");
  if (!existsSync(resourcesDir)) {
    throw new Error(
      `[desktop] DMG staging app has no Contents/Resources: ${resourcesDir}`,
    );
  }

  const versionJsonPath = join(resourcesDir, "version.json");
  const metadataJsonPath = join(resourcesDir, "metadata.json");
  const existing = readJsonIfPresent(versionJsonPath);
  const fallback = readJsonIfPresent(metadataJsonPath);

  const pick = (key: keyof DmgVersionMetadata): string => {
    const fromExpected = asTrimmed(expected[key]);
    if (fromExpected) return fromExpected;
    // 兜底只在 expected 明确为空时使用（不应发生，但避免写出半截文件）。
    return asTrimmed(fallback?.[key as string]);
  };

  const merged: DmgVersionMetadata = {
    version: pick("version"),
    hash: pick("hash"),
    channel: pick("channel"),
    baseUrl: pick("baseUrl"),
    name: pick("name"),
    identifier: pick("identifier"),
    ...(asTrimmed(expected.displayName)
      ? { displayName: asTrimmed(expected.displayName) }
      : {}),
  };

  // fail-closed：缺任何一项都会让运行时报「不支持的更新通道」，不如在构建期响亮失败。
  const missing = (
    ["version", "hash", "channel", "baseUrl", "name", "identifier"] as const
  ).filter((key) => !merged[key]);
  if (missing.length > 0) {
    throw new Error(
      `[desktop] cannot build DMG version.json, missing ${missing.join(", ")} ` +
        `(expected from update payload, app: ${appBundlePath})`,
    );
  }

  // 与已有文件逐字段比对：一致就不重写，避免无谓地改动产物与签名输入。
  // displayName 也要比：它是可选字段，但它属于同一份元数据，漏掉会让
  // 「只改了 displayName」的漂移被误判为无变化而跳过。
  if (
    existing &&
    asTrimmed(existing.version) === merged.version &&
    asTrimmed(existing.hash) === merged.hash &&
    asTrimmed(existing.channel) === merged.channel &&
    asTrimmed(existing.baseUrl) === merged.baseUrl &&
    asTrimmed(existing.name) === merged.name &&
    asTrimmed(existing.identifier) === merged.identifier &&
    asTrimmed(existing.displayName) === (merged.displayName ?? "")
  ) {
    return false;
  }

  writeFileSync(versionJsonPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  log(
    `[desktop] wrote DMG Resources/version.json (channel=${merged.channel} version=${merged.version})`,
  );
  return true;
};
