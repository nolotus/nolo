/**
 * node-gyp-build shim for compiled CLI binaries (bun --compile).
 *
 * 为什么存在：classic-level 通过 node-gyp-build 加载原生 .node prebuild。
 * 当 bun 把 classic-level 的 JS（含 node-gyp-build 的 binding.js）bundle 进
 * 编译二进制后，__dirname 被烘焙成构建机绝对路径，在 bunfs（只读虚拟 FS）
 * 里无法 readdirSync；node-gyp-build 读取 package.json 的 try/catch 也会
 * 失败，导致 CLASSIC_LEVEL_PREBUILD env override 被跳过。运行时补
 * NODE_PATH/Module.globalPaths 也无效——bun compiled binary 只在启动时读
 * 一次 NODE_PATH。唯一的活路是 build 时把 node-gyp-build 替换成这个 shim，
 * 让二进制自带定位逻辑，从随包分发的 prebuilds 目录找到 .node 文件。
 *
 * 只被 compiled 构建 alias 进来（buildPublish.ts 的 Bun.build plugin 把
 * specifier `node-gyp-build` 重定向到本文件）。source/npm 链路永远不经过它。
 *
 * 签名兼容 node-gyp-build 的 callable：`load(dir: string): unknown`。
 * 使用 module.exports（非 export default）确保 require() 返回可直接调用的
 * 函数，与 node-gyp-build 的 CJS 导出方式一致。
 */

import { existsSync, readdirSync, realpathSync } from "node:fs";
import { arch } from "node:os";
import { basename, dirname, join } from "node:path";

/**
 * 判断 prebuilds 子目录名是否匹配当前运行平台。
 * 目录名格式：`<os>-<archs>`，archs 用 `+` 分隔多架构。
 * 例：`darwin-x64+arm64`、`linux-x64`、`linux-arm64`。
 */
function prebuildDirMatchesPlatform(dirName: string): boolean {
  const dashIndex = dirName.indexOf("-");
  if (dashIndex < 0) return false;
  const osPart = dirName.slice(0, dashIndex);
  const archPartRaw = dirName.slice(dashIndex + 1);
  if (!archPartRaw) return false;
  if (osPart !== process.platform) return false;
  const archs = archPartRaw.split("+");
  return archs.includes(process.arch);
}

/**
 * 在给定候选目录下查找匹配平台的 .node 文件。
 * 返回找到的 .node 文件绝对路径，或 null。
 */
function findNativeBuild(cand: string): string | null {
  const prebuildsDir = join(cand, "prebuilds");
  if (!existsSync(prebuildsDir)) return null;

  let entries: string[];
  try {
    entries = readdirSync(prebuildsDir);
  } catch {
    return null;
  }

  for (const tuple of entries) {
    if (!prebuildDirMatchesPlatform(tuple)) continue;
    const tupleDir = join(prebuildsDir, tuple);
    if (!existsSync(tupleDir)) continue;

    // linux musl 检测：Alpine（/etc/alpine-release）或其他 musl 发行版
    // （musl 动态链接器存在）时优先 .musl.node，避免在 musl 系统上 dlopen
    // glibc 构建导致段错误。
    if (process.platform === "linux") {
      const muslNode = join(tupleDir, "classic-level.musl.node");
      const isMusl =
        existsSync("/etc/alpine-release") ||
        existsSync(`/lib/ld-musl-${arch() === "arm64" ? "aarch64" : "x86_64"}.so.1`);
      if (isMusl && existsSync(muslNode)) {
        return muslNode;
      }
    }

    const defaultNode = join(tupleDir, "classic-level.node");
    if (existsSync(defaultNode)) {
      return defaultNode;
    }
  }

  return null;
}

function load(dir: string): unknown {
  // 候选目录，取第一个命中：
  // 1. dir 原样（构建机上开发/探针时仍可用）
  // 2. join(dirname(process.execPath), "node_modules", basename(dir))
  //    （tarball 安装布局：二进制与 node_modules/classic-level/ 同级）
  // 3. 同 2，但基于 realpath 后的 execPath——install-nolo.sh 把
  //    ~/.local/bin/nolo symlink 到 ~/.nolo/<subdir>/nolo，部分 POSIX
  //    环境下 process.execPath 是 symlink 路径而非真实目标。
  let realExecPath = process.execPath;
  try {
    realExecPath = realpathSync(process.execPath);
  } catch {
    // realpath 失败则沿用 execPath
  }
  const candidates = [
    dir,
    join(dirname(process.execPath), "node_modules", basename(dir)),
    join(dirname(realExecPath), "node_modules", basename(dir)),
  ];

  for (const cand of candidates) {
    const found = findNativeBuild(cand);
    if (found) {
      // bun compiled binary 可直接 require .node
      return require(found);
    }
  }

  throw new Error(
    `No native build was found for platform=${process.platform} arch=${process.arch} ... loaded from: ${dir}`,
  );
}

// CJS export: module.exports = function, matching node-gyp-build's pattern.
// Bun's bundler wraps ESM `export default` as { default: fn }, which breaks
// `require('node-gyp-build')(dir)` calls in classic-level's binding.js.
module.exports = load;