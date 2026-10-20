#!/usr/bin/env bun
/**
 * CLI 版本真值链路的唯一守卫。
 *
 * 背景（2026-10-19）：`NOLO_CLI_VERSION` 曾是 cliDownloads.ts 里的硬编码字面量，
 * 发布链上有 4 处各自用正则 `/NOLO_CLI_VERSION = "x.y.z"/` 去解析它并比对
 * `packages/cli/package.json`——同一段逻辑被复制了 4 份：
 *   scripts/release/publishNoloCli.sh
 *   scripts/release/applyCliVersion.ts（写方）
 *   scripts/ci/runCliPublishPublic.sh
 *   scripts/ci/runCliPublishCi.sh
 *
 * 当 cliDownloads.ts 改为构建期注入（`__NOLO_CLI_VERSION__`）后，这 4 份正则
 * 全部失配：前两处已让发布链直接抛错。逐份修等于把同样的错误再犯三次，
 * 所以收敛成这一个守卫。
 *
 * 现在要守的东西变了：
 *   - 旧语义「两个源里的版本号必须相等」——在版本只剩 package.json 一处真值后
 *     已不可能违反，守它没有意义。
 *   - 新语义「web 版本必须来自构建期注入，不得退回硬编码」——这才是仍会发生的
 *     退化：有人把字面量写回来，官网就会显示一个与真实发布版本无关的数字，
 *     而且没有任何检查能发现。
 *
 * 用法：
 *   bun scripts/release/validateCliVersionSource.ts [--repo-root <dir>]
 * 退出码：0 = 链路完好；1 = 链路被改回硬编码（附具体原因）。
 */

import * as fs from "node:fs";
import * as path from "node:path";

const CLI_DOWNLOADS_REL = "packages/app/constants/cliDownloads.ts";
const INJECTION_MARKER = "__NOLO_CLI_VERSION__";
/** 任何形态的硬编码赋值都会覆盖注入值：`= "1.2.3"`、`: string = "1.2.3"`、单引号。 */
const HARDCODED_RE = /NOLO_CLI_VERSION\s*(:\s*string)?\s*=\s*['"]\d+\.\d+\.\d+/;

export type CliVersionSourceCheck =
  | { ok: true }
  | { ok: false; reason: string };

/** 纯函数：只检查文件内容，便于其它校验脚本复用同一套判据（避免再次复制）。 */
export function checkCliDownloadsSource(source: string): CliVersionSourceCheck {
  if (!source.includes(INJECTION_MARKER)) {
    return {
      ok: false,
      reason:
        `${CLI_DOWNLOADS_REL} 不再消费构建期注入的 ${INJECTION_MARKER}：` +
        `web 版本号会退回硬编码并与 packages/cli/package.json 脱钩`,
    };
  }
  if (HARDCODED_RE.test(source)) {
    return {
      ok: false,
      reason:
        `${CLI_DOWNLOADS_REL} 出现了硬编码的 NOLO_CLI_VERSION 字面量：` +
        `它会覆盖构建期注入值，导致官网显示过期版本`,
    };
  }
  return { ok: true };
}

export function validateCliVersionSource(repoRoot: string): CliVersionSourceCheck {
  const file = path.join(repoRoot, CLI_DOWNLOADS_REL);
  let source: string;
  try {
    source = fs.readFileSync(file, "utf8");
  } catch (error) {
    return { ok: false, reason: `无法读取 ${CLI_DOWNLOADS_REL}: ${String(error)}` };
  }
  return checkCliDownloadsSource(source);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf("--repo-root");
  const repoRoot =
    rootIdx >= 0 && rootIdx + 1 < args.length
      ? path.resolve(args[rootIdx + 1])
      : path.resolve(import.meta.dir, "../..");
  const result = validateCliVersionSource(repoRoot);
  if (!result.ok) {
    console.error(`[cli-version-source] ${result.reason}`);
    process.exit(1);
  }
  console.log("[cli-version-source] OK: web 版本来自构建期注入，无硬编码回退");
}
