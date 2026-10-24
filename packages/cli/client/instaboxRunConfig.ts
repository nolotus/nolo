// packages/cli/client/instaboxRunConfig.ts
//
// CLI 本地 run 的 Instabox 受控配置解析器：
// 调用方（可信宿主）通过环境变量传入 run 级路径，指向 runs 目录下的 JSON 配置。
// 严格 fail-closed：缺失、越界、软链接、超大、未知字段或校验失败一律拒绝。

import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, normalize, resolve } from "node:path";
import { resolveRunsDir } from "../agentRunControl";
import {
  hashInstaboxDeliveryManifest,
  validateInstaboxWorkspaceSelection,
  type InstaboxDeliveryManifest,
  type InstaboxWorkspaceSelection,
} from "./localInstaboxWorkspaceDelivery";
import type { InstaboxRecoveryPolicy } from "./localInstaboxWorkspaceRecovery";

export const INSTABOX_RUN_CONFIG_ENV = "NOLO_INSTABOX_RUN_CONFIG";
export const INSTABOX_RUN_CONFIG_MAX_BYTES = 1024 * 1024; // 1 MB 上限

export class InstaboxRunConfigError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`instabox_run_config:${code}: ${message}`);
    this.name = "InstaboxRunConfigError";
    this.code = `instabox_run_config:${code}`;
  }
}

function fail(code: string, msg: string): never {
  throw new InstaboxRunConfigError(code, msg);
}

function isWorkspaceMode(mode: unknown): mode is "empty" | "approved-snapshot" {
  return mode === "empty" || mode === "approved-snapshot";
}

export const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "bindingId",
  "freeCreateEvidenceId",
  "workspaceAuthorizationId",
  "recoverySupportId",
  "workspaceMode",
  "billingPolicy",
  "manifest",
  "manifestSha256",
  "manifestHash",
  "approvalId",
  "artifactRoot",
  "artifactDir",
  "allowedPaths",
  "allowRemoteRelease",
]);

export type InstaboxBillingPolicy = "free-only" | "allow-paid";

export function isInstaboxBillingPolicy(mode: unknown): mode is InstaboxBillingPolicy {
  return mode === "free-only" || mode === "allow-paid";
}

export function assertInstaboxBillingPolicy(
  billingPolicy: InstaboxBillingPolicy,
  account?: { isPaid?: boolean; kind?: string; accountKind?: string }
): void {
  const isPaid =
    account?.isPaid === true ||
    account?.kind === "paid" ||
    account?.accountKind === "paid";
  if (isPaid && billingPolicy !== "allow-paid") {
    fail("paid_account_disallowed", "付费 Instabox 账号需显式 --instabox-allow-paid");
  }
}

export type ParsedInstaboxRunConfig = {
  bindingId: string;
  freeCreateEvidenceId: string;
  workspaceAuthorizationId: string;
  recoverySupportId: string;
  workspaceMode: "empty" | "approved-snapshot";
  billingPolicy: InstaboxBillingPolicy;
  manifest: InstaboxDeliveryManifest | null;
  manifestSha256: string | null;
  approvalId: string;
  artifactRoot: string;
  allowedPaths: string[];
  allowRemoteRelease: boolean;
  workspaceSelection?: InstaboxWorkspaceSelection;
  workspaceRecovery: InstaboxRecoveryPolicy;
};

export function resolveInstaboxRunConfigPath(options?: {
  env?: Record<string, string | undefined>;
  configPath?: string;
  runsDir?: string;
}): { resolvedPath: string; runsDir: string } {
  const env = options?.env ?? (process.env as Record<string, string | undefined>);
  const explicitPath =
    options?.configPath?.trim() ||
    env[INSTABOX_RUN_CONFIG_ENV]?.trim() ||
    env.INSTABOX_RUN_CONFIG?.trim();

  if (!explicitPath) {
    fail("missing_path", `环境变量 ${INSTABOX_RUN_CONFIG_ENV} 未设置或为空`);
  }

  const runsDir = options?.runsDir ?? resolveRunsDir(env);
  const normalizedRunsDir = normalize(resolve(runsDir));

  // 必须严格在 runs 目录下，不跟随外部符号链接
  const resolvedTarget = isAbsolute(explicitPath)
    ? normalize(explicitPath)
    : normalize(resolve(normalizedRunsDir, explicitPath));

  if (
    resolvedTarget !== normalizedRunsDir &&
    !resolvedTarget.startsWith(normalizedRunsDir.endsWith("/") ? normalizedRunsDir : `${normalizedRunsDir}/`)
  ) {
    fail("path_traversal", `配置路径 "${explicitPath}" 越出了限定的 runs 目录 "${normalizedRunsDir}"`);
  }

  // 路径必须是常规文件，且本身不得是符号链接
  let stats;
  try {
    stats = lstatSync(resolvedTarget);
  } catch (err) {
    fail("file_unreadable", `配置文件不可读或不存在: ${resolvedTarget}`);
  }

  if (stats.isSymbolicLink()) {
    fail("symlink_rejected", `配置文件不能是符号链接: ${resolvedTarget}`);
  }
  if (!stats.isFile()) {
    fail("not_regular_file", `配置路径不是常规文件: ${resolvedTarget}`);
  }
  if (stats.size > INSTABOX_RUN_CONFIG_MAX_BYTES) {
    fail("file_too_large", `配置文件大小 (${stats.size} 字节) 超过上限 (${INSTABOX_RUN_CONFIG_MAX_BYTES} 字节)`);
  }

  // 校验 realpath 仍不越出 runs 目录
  try {
    const realTarget = realpathSync(resolvedTarget);
    const realRuns = realpathSync(normalizedRunsDir);
    if (
      realTarget !== realRuns &&
      !realTarget.startsWith(realRuns.endsWith("/") ? realRuns : `${realRuns}/`)
    ) {
      fail("symlink_traversal", `配置真实路径 "${realTarget}" 越出 runs 真实目录 "${realRuns}"`);
    }
  } catch {
    // realpath fails if components unresolvable
  }

  return { resolvedPath: resolvedTarget, runsDir: normalizedRunsDir };
}

export function loadInstaboxRunConfig(options?: {
  env?: Record<string, string | undefined>;
  configPath?: string;
  runsDir?: string;
  quiesce?: () => Promise<void>;
  isPaidAccount?: boolean;
  account?: { isPaid?: boolean; kind?: string; accountKind?: string };
}): ParsedInstaboxRunConfig {
  const { resolvedPath } = resolveInstaboxRunConfigPath(options);

  let rawText: string;
  try {
    rawText = readFileSync(resolvedPath, "utf8");
  } catch (err) {
    fail("file_read_failed", `读取配置文件失败: ${err instanceof Error ? err.message : String(err)}`);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    fail("invalid_json", `配置文件 JSON 解析失败: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("invalid_shape", "配置文件顶层必须为非空 JSON 对象");
  }

  // 严格未知字段拒绝
  for (const key of Object.keys(parsed)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) {
      fail("unknown_field", `未知的配置字段 "${key}"，拒绝解析`);
    }
  }

  // 必填 ID 校验
  const bindingId = typeof parsed.bindingId === "string" ? parsed.bindingId.trim() : "";
  if (!bindingId) fail("missing_binding_id", "bindingId 必须为非空字符串");

  const freeCreateEvidenceId =
    typeof parsed.freeCreateEvidenceId === "string" ? parsed.freeCreateEvidenceId.trim() : "";
  if (!freeCreateEvidenceId) fail("missing_free_create_evidence_id", "freeCreateEvidenceId 必须为非空字符串");

  const workspaceAuthorizationId =
    typeof parsed.workspaceAuthorizationId === "string" ? parsed.workspaceAuthorizationId.trim() : "";
  if (!workspaceAuthorizationId) fail("missing_workspace_auth_id", "workspaceAuthorizationId 必须为非空字符串");

  const recoverySupportId =
    typeof parsed.recoverySupportId === "string" ? parsed.recoverySupportId.trim() : "";
  if (!recoverySupportId) fail("missing_recovery_support_id", "recoverySupportId 必须为非空字符串");

  const approvalId = typeof parsed.approvalId === "string" ? parsed.approvalId.trim() : "";
  if (!approvalId) fail("missing_approval_id", "approvalId 必须为非空字符串");

  const rawAllowRemoteRelease = parsed.allowRemoteRelease;
  if (typeof rawAllowRemoteRelease !== "boolean") {
    fail("invalid_allow_remote_release", "allowRemoteRelease 必须为布尔值");
  }
  const allowRemoteRelease = rawAllowRemoteRelease;

  let billingPolicy: InstaboxBillingPolicy = "free-only";
  if (parsed.billingPolicy !== undefined) {
    if (!isInstaboxBillingPolicy(parsed.billingPolicy)) {
      fail("invalid_billing_policy", `billingPolicy 必须为 "free-only" 或 "allow-paid"，收到 "${parsed.billingPolicy}"`);
    }
    billingPolicy = parsed.billingPolicy;
  }

  const env = options?.env ?? (process.env as Record<string, string | undefined>);
  const isPaid =
    options?.isPaidAccount === true ||
    options?.account?.isPaid === true ||
    options?.account?.kind === "paid" ||
    options?.account?.accountKind === "paid" ||
    env?.INSTABOX_ACCOUNT_KIND === "paid" ||
    env?.INSTABOX_ACCOUNT_TYPE === "paid" ||
    env?.INSTABOX_PAID_ACCOUNT === "true" ||
    env?.INSTABOX_PAID_ACCOUNT === "1";
  if (isPaid && billingPolicy !== "allow-paid") {
    fail("paid_account_disallowed", "付费 Instabox 账号需显式 --instabox-allow-paid");
  }

  // artifact目的目录：严格必需且不可为空，empty 工作区无配置任务也需显式回收目的地
  const artifactRootRaw =
    (typeof parsed.artifactRoot === "string" ? parsed.artifactRoot.trim() : "") ||
    (typeof parsed.artifactDir === "string" ? parsed.artifactDir.trim() : "");
  if (!artifactRootRaw) {
    fail("missing_artifact_root", "artifactRoot (artifact目的目录) 必须为非空字符串，未配置或默认均被拒绝");
  }
  if (!isAbsolute(artifactRootRaw) || artifactRootRaw.includes("\0") || artifactRootRaw.split("/").includes("..")) {
    fail("invalid_artifact_root", `artifactRoot 必须为合法绝对路径: "${artifactRootRaw}"`);
  }
  const artifactRoot = normalize(artifactRootRaw);

  const rawWorkspaceMode = parsed.workspaceMode;
  if (!isWorkspaceMode(rawWorkspaceMode)) {
    fail("invalid_workspace_mode", `workspaceMode 必须为 "empty" 或 "approved-snapshot"，收到 "${rawWorkspaceMode}"`);
  }
  const workspaceMode = rawWorkspaceMode;

  let manifest: InstaboxDeliveryManifest | null = null;
  let manifestSha256: string | null = null;
  let workspaceSelection: InstaboxWorkspaceSelection | undefined;

  const rawHash =
    (typeof parsed.manifestSha256 === "string" ? parsed.manifestSha256.trim() : "") ||
    (typeof parsed.manifestHash === "string" ? parsed.manifestHash.trim() : "");

  if (workspaceMode === "approved-snapshot") {
    if (!parsed.manifest || typeof parsed.manifest !== "object" || Array.isArray(parsed.manifest)) {
      fail("missing_manifest", 'workspaceMode 为 "approved-snapshot" 时 manifest 必须为非空对象');
    }
    manifest = parsed.manifest as InstaboxDeliveryManifest;
    const computedHash = hashInstaboxDeliveryManifest(manifest);
    if (!rawHash) {
      fail("missing_manifest_hash", "manifestSha256 / manifestHash 校验字段缺失");
    }
    if (rawHash !== computedHash) {
      fail("manifest_hash_mismatch", `manifest hash 不匹配: expected ${computedHash}, got ${rawHash}`);
    }
    manifestSha256 = computedHash;
    workspaceSelection = {
      workspaceMode: "approved-snapshot",
      manifest,
      approval: {
        id: approvalId,
        manifestSha256: computedHash,
      },
    };
    validateInstaboxWorkspaceSelection(workspaceSelection);
  } else {
    // empty 模式
    if (parsed.manifest !== undefined && parsed.manifest !== null) {
      fail("unexpected_manifest", 'workspaceMode 为 "empty" 时不得提供 manifest');
    }
    if (rawHash) {
      fail("unexpected_manifest_hash", 'workspaceMode 为 "empty" 时不得提供 manifestSha256');
    }
  }

  // allowedPaths 校验
  let allowedPaths: string[];
  if (parsed.allowedPaths !== undefined) {
    if (!Array.isArray(parsed.allowedPaths) || parsed.allowedPaths.some(p => typeof p !== "string")) {
      fail("invalid_allowed_paths", "allowedPaths 必须为字符串数组");
    }
    allowedPaths = (parsed.allowedPaths as string[]).map(p => p.trim()).filter(Boolean);
  } else {
    allowedPaths = manifest ? manifest.files.map(f => f.path) : [];
  }

  const quiesce = options?.quiesce ?? (async () => {});

  const workspaceRecovery: InstaboxRecoveryPolicy = {
    artifactRoot,
    approvalId,
    allowedPaths,
    quiesce,
  };

  return {
    bindingId,
    freeCreateEvidenceId,
    workspaceAuthorizationId,
    recoverySupportId,
    workspaceMode,
    billingPolicy,
    manifest,
    manifestSha256,
    approvalId,
    artifactRoot,
    allowedPaths,
    allowRemoteRelease,
    workspaceSelection,
    workspaceRecovery,
  };
}
