// cf-builder 路径安全工具（纯函数，可在宿主 bun test 中直接单测）。
//
// 职责：对构建产物 public/latest-assets.json 解析出的 basePath 做白名单与 containment 校验，
// 确保它只会以「安全相对子路径」的形态被使用（路径存在性判断 + realpath containment + tar -C 参数），
// 绝不裸拼进任何 shell 命令字符串。详见 builder-server.ts 的防御注释。

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

// 单段安全相对路径白名单：非空、不含 ".."、不含 shell 元字符/引号/空白，
// 不绝对、不以 ./ 开头。仅允许 [A-Za-z0-9_./-]。
export const isSafeRelativePath = (p: string): boolean =>
  !!p &&
  !p.includes("..") &&
  /^[A-Za-z0-9_./-]+$/.test(p) &&
  !p.startsWith("/") &&
  !p.startsWith("./");

// 校验 targetPath 是否安全包含在 rootDir 内部（经 realpath 解析所有符号链接，杜绝符号链接逃逸）。
export const isPathContained = (rootDir: string, targetPath: string): boolean => {
  try {
    if (!existsSync(rootDir) || !existsSync(targetPath)) return false;
    const realRoot = realpathSync(rootDir);
    const realTarget = realpathSync(targetPath);
    if (realTarget === realRoot) return true;
    const prefix = realRoot.endsWith("/") ? realRoot : realRoot + "/";
    return realTarget.startsWith(prefix);
  } catch {
    return false;
  }
};

// 从 manifest 的 basePath 提取安全资产子目录：剥掉首尾斜杠与空白，做白名单与 URL 编码安全校验。
// 空值 / 非法值 / 逃逸值一律返回 null（宁可拒绝打包，也不放行注入）。
export const sanitizeBasePath = (basePath: unknown): string | null => {
  if (typeof basePath !== "string") return null;
  let str = basePath.trim();
  if (!str) return null;

  // 若含 % 尝试 URL 解码并校验是否隐藏 .. / \0 / 非法字符
  if (str.includes("%")) {
    try {
      str = decodeURIComponent(str).trim();
    } catch {
      return null;
    }
  }

  if (str.includes("..") || str.includes("\0")) return null;

  const assetDir = str.replace(/^\/+|\/+$/g, "");
  if (!assetDir) return null; // 空 basePath 没有资产目录
  if (!isSafeRelativePath(assetDir)) return null;
  return assetDir;
};

// 从构建产物读取 basePath（同步，node:fs），经 sanitizeBasePath 归一化与 realpath containment 校验后返回
// 安全相对子路径；校验失败返回 null。
export const readAssetBasePath = (root: string): string | null => {
  const manifest = resolve(root, "public/latest-assets.json");
  if (!existsSync(manifest)) return null;
  try {
    const raw = JSON.parse(readFileSync(manifest, "utf8")) as { basePath?: unknown };
    const assetDir = sanitizeBasePath(raw.basePath ?? "");
    if (assetDir === null) return null;

    const fullPath = resolve(root, assetDir);
    // 白名单通过后仍要做「位于 root 下且 realpath 无逃逸」的校验，双保险。
    if (!existsSync(fullPath)) return null;
    if (!isPathContained(root, fullPath)) return null;
    return assetDir;
  } catch {
    return null;
  }
};

// 与 CI package_web_artifact 对齐的产物相对路径清单（相对于仓库根）。
export const artifactRelPaths = (root: string): string[] | null => {
  const manifest = resolve(root, "public/latest-assets.json");
  if (!existsSync(manifest)) return null;
  const assetDir = readAssetBasePath(root);
  if (assetDir === null) return null;
  const entries = [
    "public/latest-assets.json",
    "public/meta.json",
    assetDir,
    "public/locales",
    "public/route-styles",
  ];
  // 全部存在且 realpath 不逃逸才算可打包；缺任何一个或逃逸都视为产物不完整/不合法。
  for (const rel of entries) {
    const full = resolve(root, rel);
    if (!existsSync(full) || !isPathContained(root, full)) return null;
  }
  return entries;
};
