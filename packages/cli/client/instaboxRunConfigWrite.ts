// packages/cli/client/instaboxRunConfigWrite.ts
//
// CLI 显式授权参数生成 Instabox 受控配置：
// 将用户通过 --instabox-* 传入的授权落盘至 ~/.nolo/runs/（或 NOLO_RUNS_DIR），
// 并注入 NOLO_INSTABOX_RUN_CONFIG 环境变量。
//
// 严格安全边界：
// 1. approvalId/bindingId 等授权凭据一律由本进程生成，不接受外部/模型透传；
// 2. 独占创建（flag: "wx"），非符号链接，避免覆盖与符号链接劫持；
// 3. snapshot 模式下 manifest 只读解析并校验 hash 与路径安全，不复制用户数据；
// 4. 禁止在日志/终端中输出 manifest 内容与鉴权信息。

import { randomUUID } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, normalize, resolve } from "node:path";
import { resolveRunsDir } from "../agentRunControl";
import {
  INSTABOX_RUN_CONFIG_ENV,
  isInstaboxBillingPolicy,
  type InstaboxBillingPolicy,
} from "./instaboxRunConfig";
import {
  hashInstaboxDeliveryManifest,
  validateInstaboxWorkspaceSelection,
  type InstaboxDeliveryManifest,
} from "./localInstaboxWorkspaceDelivery";

export class InstaboxRunConfigWriteError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`instabox_run_config_write:${code}: ${message}`);
    this.name = "InstaboxRunConfigWriteError";
    this.code = `instabox_run_config_write:${code}`;
  }
}

const fail = (code: string, msg: string): never => {
  throw new InstaboxRunConfigWriteError(code, msg);
};

export type WriteInstaboxRunConfigOptions = {
  workspaceMode: "empty" | "snapshot";
  artifactDir: string;
  manifestPath?: string;
  allowRemoteRelease?: boolean;
  allowPaid?: boolean;
  billingPolicy?: InstaboxBillingPolicy;
  account?: { isPaid?: boolean; kind?: string; accountKind?: string };
  isPaidAccount?: boolean;
  env?: Record<string, string | undefined>;
  runsDir?: string;
  readTextFile?: (path: string) => string;
};

export type WriteInstaboxRunConfigResult = {
  configPath: string;
  config: Record<string, unknown>;
};

export function writeInstaboxRunConfig(
  options: WriteInstaboxRunConfigOptions
): WriteInstaboxRunConfigResult {
  const { workspaceMode, artifactDir, manifestPath, allowRemoteRelease } = options;

  if (workspaceMode !== "empty" && workspaceMode !== "snapshot") {
    fail("invalid_workspace_mode", 'workspaceMode 必须是 "empty" 或 "snapshot"');
  }

  const trimmedArtifactDir = artifactDir?.trim();
  if (!trimmedArtifactDir) {
    fail("missing_artifact_dir", "artifactDir 必须是非空绝对路径，未配置或默认均被拒绝");
  }
  if (!isAbsolute(trimmedArtifactDir) || trimmedArtifactDir.includes("\0") || trimmedArtifactDir.split("/").includes("..")) {
    fail("invalid_artifact_dir", `artifactDir 必须为合法的绝对路径且不能包含 .. 或空字符: "${trimmedArtifactDir}"`);
  }

  const approvalId = `appr-${randomUUID()}`;
  const bindingId = `bind-${randomUUID()}`;
  const freeCreateEvidenceId = `fce-${randomUUID()}`;
  const workspaceAuthorizationId = `wauth-${randomUUID()}`;
  const recoverySupportId = `rcv-${randomUUID()}`;

  let manifest: InstaboxDeliveryManifest | null = null;
  let manifestSha256: string | null = null;
  let allowedPaths: string[] = [];

  if (workspaceMode === "snapshot") {
    const rawPath = manifestPath ? manifestPath.trim() : "";
    if (!rawPath) {
      fail("missing_manifest_path", 'workspaceMode 为 "snapshot" 时必须提供 manifest 文件路径');
    }
    const resolvedManifestPath = resolve(rawPath);
    let rawText = "";
    try {
      const reader = options.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
      rawText = reader(resolvedManifestPath);
    } catch (err) {
      fail(
        "manifest_read_failed",
        `读取 manifest 文件失败: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    let parsedManifest!: InstaboxDeliveryManifest;
    try {
      parsedManifest = JSON.parse(rawText) as InstaboxDeliveryManifest;
    } catch (err) {
      fail(
        "invalid_manifest_json",
        `manifest 文件 JSON 解析失败: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    try {
      manifestSha256 = hashInstaboxDeliveryManifest(parsedManifest);
      validateInstaboxWorkspaceSelection({
        workspaceMode: "approved-snapshot",
        manifest: parsedManifest,
        approval: {
          id: approvalId,
          manifestSha256,
        },
      });
    } catch (err) {
      fail(
        "invalid_manifest_selection",
        `manifest 校验未通过: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    manifest = parsedManifest;
    allowedPaths = parsedManifest.files.map((f) => f.path);
  } else {
    // empty 模式严禁提供 manifest
    if (manifestPath && manifestPath.trim()) {
      fail("unexpected_manifest", 'workspaceMode 为 "empty" 时不得提供 manifest');
    }
  }

  const rawBillingPolicy = options.billingPolicy ?? (options.allowPaid ? "allow-paid" : "free-only");
  if (!isInstaboxBillingPolicy(rawBillingPolicy)) {
    fail("invalid_billing_policy", `billingPolicy 必须为 "free-only" 或 "allow-paid"，收到 "${rawBillingPolicy}"`);
  }
  const billingPolicy: InstaboxBillingPolicy = rawBillingPolicy;

  const env = options.env ?? (process.env as Record<string, string | undefined>);
  const isPaid =
    options.isPaidAccount === true ||
    options.account?.isPaid === true ||
    options.account?.kind === "paid" ||
    options.account?.accountKind === "paid" ||
    env?.INSTABOX_ACCOUNT_KIND === "paid" ||
    env?.INSTABOX_ACCOUNT_TYPE === "paid" ||
    env?.INSTABOX_PAID_ACCOUNT === "true" ||
    env?.INSTABOX_PAID_ACCOUNT === "1";
  if (isPaid && billingPolicy !== "allow-paid") {
    fail("paid_account_disallowed", "付费 Instabox 账号需显式 --instabox-allow-paid");
  }

  const config: Record<string, unknown> = {
    bindingId,
    freeCreateEvidenceId,
    workspaceAuthorizationId,
    recoverySupportId,
    workspaceMode: workspaceMode === "snapshot" ? "approved-snapshot" : "empty",
    billingPolicy,
    approvalId,
    artifactRoot: trimmedArtifactDir,
    allowRemoteRelease: Boolean(allowRemoteRelease),
    allowedPaths,
  };

  if (workspaceMode === "snapshot" && manifest && manifestSha256) {
    config.manifest = manifest;
    config.manifestSha256 = manifestSha256;
  }

  const runsDir = options.runsDir ?? resolveRunsDir(env);
  const normalizedRunsDir = normalize(resolve(runsDir));

  try {
    mkdirSync(normalizedRunsDir, { recursive: true, mode: 0o700 });
  } catch (err) {
    fail("mkdir_failed", `创建 runs 目录失败: ${err instanceof Error ? err.message : String(err)}`);
  }

  const fileName = `instabox-run-${randomUUID()}.json`;
  const targetPath = join(normalizedRunsDir, fileName);

  try {
    // 独占创建（flag: "wx"），非符号链接，避免任何覆盖与路径替换
    writeFileSync(targetPath, JSON.stringify(config, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
  } catch (err) {
    fail("file_write_failed", `独占创建受控配置文件失败: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 写入后二次检验文件状态（严格非符号链接）
  try {
    const stats = lstatSync(targetPath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      fail("symlink_rejected", `配置文件不能是符号链接或非常规文件: ${targetPath}`);
    }
  } catch (err) {
    if (err instanceof InstaboxRunConfigWriteError) throw err;
    fail("file_stat_failed", `检验配置文件状态失败: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 注入当前进程环境与传入的 env 字典
  process.env[INSTABOX_RUN_CONFIG_ENV] = targetPath;
  if (options.env) {
    options.env[INSTABOX_RUN_CONFIG_ENV] = targetPath;
  }

  return { configPath: targetPath, config };
}
