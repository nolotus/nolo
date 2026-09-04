#!/usr/bin/env bun
// scripts/release/assertProjectionReleaseMetadata.ts
// 公开仓（nolotus/nolo）workflow 使用的 projection release metadata 校验入口。
//
// 设计契约（release projection P0）：
// - metadata 由 bun-nolo 生成并随投影 commit 同步（bun-nolo owns release intent）；
//   本脚本只在公开仓侧 fail-closed 校验（nolo owns release execution）。
// - channel/version 只来自 metadata（channel 在生成侧已由 SemVer 解析），
//   绝不从 branch 推断，也绝不重新生成版本。
// - workflow_dispatch（repair/rebuild）必须用 --expect-version 绑定目标版本。
//
// 用法：
//   bun ./scripts/release/assertProjectionReleaseMetadata.ts \
//     [--expect-intent release] [--expect-version <semver>] \
//     [--print-version] [--set-outputs channel,version,tag]
//
// 机器输出契约：人读日志一律走 stderr；stdout 只承载机器可读值（--print-version
// 的单行 SemVer）。--set-outputs 把纯字段值写入 $GITHUB_OUTPUT（无日志、无多余
// 换行）——workflow 必须消费 GITHUB_OUTPUT / --print-version，不得捕获 stdout
// 混入日志（version-bump 与 desktop-build 均按此契约消费）。
//
// 退出码（fail-closed 分类，供 workflow 分支处理）：
//   0  metadata 合法且全部期望满足
//   1  metadata 合法但未声明 desktop release intent（--expect-intent release 时）
//      —— 普通投影变化的正常“跳过 desktop”信号
//   2  metadata 缺失 / JSON 非法 / 结构或 channel 非法 / 与 package.json 漂移
//      —— 投影自身损坏，必须硬失败
//   3  --expect-version 与 metadata.version 不一致 —— repair 绑定错误，硬失败
//   4  packages/desktop/package.json 缺失或不可解析 —— 投影损坏，硬失败
import { existsSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DESKTOP_PACKAGE_MANIFEST_PATH,
  PROJECTION_RELEASE_METADATA_FILENAME,
  buildReleaseTag,
  evaluateProjectionReleaseExpectations,
  parseProjectionReleaseMetadata,
  readDesktopVersion,
} from "./projectionReleaseMetadata";

interface CliOptions {
  expectIntent: boolean;
  expectVersion?: string;
  printVersion: boolean;
  setOutputs: string[];
}

function parseArguments(args: string[]): CliOptions {
  const options: CliOptions = { expectIntent: false, printVersion: false, setOutputs: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--expect-intent") {
      const value = args[++index];
      if (value !== "release") {
        throw new Error(`unsupported --expect-intent value: ${JSON.stringify(value)} (only "release" is meaningful here)`);
      }
      options.expectIntent = true;
    } else if (arg === "--expect-version") {
      options.expectVersion = args[++index];
      if (!options.expectVersion) throw new Error("--expect-version requires a value");
    } else if (arg === "--print-version") {
      options.printVersion = true;
    } else if (arg === "--set-outputs") {
      const raw = args[++index];
      if (!raw) throw new Error("--set-outputs requires a comma-separated field list");
      options.setOutputs = raw.split(",").map((field) => field.trim()).filter(Boolean);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function writeGithubOutputs(fields: Record<string, string>): void {
  const outputPath = process.env.GITHUB_OUTPUT;
  const lines = Object.entries(fields).map(([key, value]) => `${key}=${value}`);
  if (!outputPath) {
    if (lines.length) console.log(lines.join("\n"));
    return;
  }
  appendFileSync(outputPath, `${lines.join("\n")}\n`);
}

export function runAssertProjectionReleaseMetadata(
  argv: string[],
  repoRoot: string = process.cwd(),
): { exitCode: number; version?: string } {
  let options: CliOptions;
  try {
    options = parseArguments(argv);
  } catch (error) {
    console.error(`[projection-release-metadata] ${error instanceof Error ? error.message : String(error)}`);
    return { exitCode: 2 };
  }

  const metadataPath = join(repoRoot, PROJECTION_RELEASE_METADATA_FILENAME);
  if (!existsSync(metadataPath)) {
    console.error(
      `[projection-release-metadata] ${PROJECTION_RELEASE_METADATA_FILENAME} missing at ${repoRoot} — projection is incomplete; refusing to infer release intent (fail closed)`,
    );
    return { exitCode: 2 };
  }
  let metadata;
  try {
    metadata = parseProjectionReleaseMetadata(readFileSync(metadataPath, "utf8"));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return { exitCode: 2 };
  }

  let projectedDesktopVersion: string;
  try {
    projectedDesktopVersion = readDesktopVersion(repoRoot);
  } catch (error) {
    console.error(`[projection-release-metadata] cannot read ${DESKTOP_PACKAGE_MANIFEST_PATH}: ${error instanceof Error ? error.message : String(error)}`);
    return { exitCode: 4 };
  }

  let status;
  try {
    status = evaluateProjectionReleaseExpectations({
      metadata,
      projectedDesktopVersion,
      expectIntent: options.expectIntent,
      expectVersion: options.expectVersion,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return { exitCode: 2 };
  }

  if (status === "no-declared-intent") {
    console.error(
      `[projection-release-metadata] desktop ${metadata.version} (${metadata.channel}) has releaseIntent=none — no declared desktop release in this projection`,
    );
    return { exitCode: 1 };
  }
  if (status === "version-binding-mismatch") {
    console.error(
      `[projection-release-metadata] requested version ${JSON.stringify(options.expectVersion)} does not match declared metadata version ${metadata.version} — repair must target the declared version (fail closed)`,
    );
    return { exitCode: 3 };
  }

  console.error(
    `[projection-release-metadata] ok: desktop ${metadata.version} channel=${metadata.channel} intent=${metadata.releaseIntent} source=${metadata.provenance.sourceSha}${metadata.provenance.sourceBranch ? `@${metadata.provenance.sourceBranch}` : ""}`,
  );
  if (options.setOutputs.length) {
    const fields: Record<string, string> = {
      channel: metadata.channel,
      version: metadata.version,
      tag: buildReleaseTag(metadata),
    };
    const selected: Record<string, string> = {};
    for (const field of options.setOutputs) {
      if (!(field in fields)) throw new Error(`unknown --set-outputs field: ${field} (available: channel, version, tag)`);
      selected[field] = fields[field];
    }
    writeGithubOutputs(selected);
  }
  if (options.printVersion) console.log(metadata.version);
  return { exitCode: 0, version: metadata.version };
}

// 退出码语义见文件头注释；脚本可被测试直接 import（runAssertProjectionReleaseMetadata）。
if (import.meta.main) {
  process.exit(runAssertProjectionReleaseMetadata(process.argv.slice(2)).exitCode);
}
