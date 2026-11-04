// packages/agent-runtime/capabilities/capabilityPolicy.ts
//
// Canonical policy evaluation for capabilities before execution.
// Ensures consistent policy enforcement across native tool calls, programmatic SDK, and standalone invocations.

import type { PermissionRequest } from "../actionGate";
import { isDestructiveShellCommand, resolveShellCommandArg } from "../shellCommandPolicy";
import type { CapabilityExecutionContext, ExecutableCapability } from "./capability";

export function toDisplayCommand(command: unknown): string | undefined {
  if (typeof command === "string") {
    const trimmed = command.trim();
    return trimmed ? trimmed : undefined;
  }
  if (Array.isArray(command)) {
    const joined = command
      .map((item) => (typeof item === "string" ? item : String(item)))
      .filter((item) => item.length > 0)
      .join(" ")
      .trim();
    return joined ? joined : undefined;
  }
  return undefined;
}

export function buildDestructiveShellPermissionRequest(command?: string): PermissionRequest {
  return {
    id: "permission-shell-destructive-action",
    tool: "execShell",
    action: "destructive_shell_command",
    title: "确认执行破坏性 shell 命令",
    body: "该命令可能删除或重置用户内容，需要用户明确确认后才能执行。",
    ...(command ? { command } : {}),
    suggestedRule: {
      scope: "once",
      pattern: { capability: "destructive_action", target: "shell_command" },
    },
  };
}

export function buildDestructiveShellBlockedError(
  reason: string,
  request: PermissionRequest,
): Error & {
  code: string;
  policy: Record<string, unknown>;
  permissionRequest: PermissionRequest;
} {
  const error = new Error(reason) as Error & {
    code: string;
    policy: Record<string, unknown>;
    permissionRequest: PermissionRequest;
  };
  error.code = "destructive_action_requires_confirmation";
  error.policy = {
    capability: "destructive_action",
    target: "shell_command",
    detail: "execShell destructive command",
  };
  error.permissionRequest = request;
  return error;
}

/** 与公共契约同一份类型（别名而非再定义一份，避免漂移）。 */
export type DestructiveConfirmDecision = import("../actionGate").HostConfirmDecision;

/** 「密钥形态的值」——只看值形态，不做 PASSWORD/TOKEN 之类子串探测（那会误伤普通命令）。 */
const KEY_SHAPED_VALUE =
  /(?:^|[\s"'=])(?:sk-ant-[A-Za-z0-9_\-]{20,}|sk-[A-Za-z0-9_\-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|[0-9a-fA-F]{32}\.[A-Za-z0-9]{16})(?=$|[\s"'])/;

const CREDENTIAL_REF_IN_TEXT = /(?:vault-cred-[A-Za-z0-9]+|\$nolo_cred:)/;

export type CommandCredentialUse = {
  /** 命令里出现凭据引用或密钥形态的值。 */
  hasCredential: boolean;
  /** 出现的是**明文密钥**形态（不是 vault 引用）。 */
  hasRawSecret: boolean;
};

/**
 * 精确判据：只认「vault 引用 / `$nolo_cred:` 令牌 / 密钥形态的值」。
 * 刻意不用 `hasPotentialSecrets` 的 PASSWORD/TOKEN/SECRET_KEY 子串探针——
 * 否则 `--prompt "解释下 TOKEN 是什么"` 这种命令也会弹确认。
 */
export function inspectCommandCredentialUse(command: string | undefined): CommandCredentialUse {
  const text = typeof command === "string" ? command : "";
  if (!text) return { hasCredential: false, hasRawSecret: false };
  const hasRef = CREDENTIAL_REF_IN_TEXT.test(text);
  const hasRawSecret = KEY_SHAPED_VALUE.test(text);
  return { hasCredential: hasRef || hasRawSecret, hasRawSecret };
}

/** 兼容旧调用点：只要「是否涉及凭据」这一个布尔。 */
export function commandCarriesCredentialRef(command: unknown): boolean {
  return inspectCommandCredentialUse(typeof command === "string" ? command : "").hasCredential;
}

/**
 * 凭据命中的确认请求：**不复用**「破坏性命令」的文案/类型——用户看到的是
 * 「命令要用凭据」，而不是「可能删除你的内容」，两类风险分开表达。
 */
export function buildCredentialUsePermissionRequest(command?: string): PermissionRequest {
  return {
    id: "permission-shell-credential-use",
    tool: "execShell",
    action: "shell_command_credential_use",
    title: "确认在命令中使用凭据",
    body: "该命令引用了凭据（API key 或 vault 引用）。确认后由本机受控通道取用；明文不会写进命令历史或记录。",
    ...(command ? { command } : {}),
    suggestedRule: {
      scope: "once",
      pattern: { capability: "credential_use", target: "shell_command" },
    },
  };
}

/** 无确认通道时的凭据命令拒绝错误（fail closed）。 */
function buildCredentialUseBlockedError(
  reason: string,
  command?: string,
): Error & { code: string } {
  const error = buildDestructiveShellBlockedError(
    reason,
    buildCredentialUsePermissionRequest(command),
  ) as Error & { code: string };
  error.code = "credential_use_requires_confirmation";
  return error;
}

export async function evaluateExecShellDestructiveGuard(
  input: unknown,
  ctx: CapabilityExecutionContext,
): Promise<import("../hostAdapter").AgentRuntimeToolResult | null> {
  const guardEnabled = ctx.enableDestructiveShellGuard !== false;
  if (!guardEnabled || ctx.confirmed) {
    // 注意（既有行为，未改动）：`confirmed === true` 会跳过**凭据**确认。
    // 这条捷径是否安全完全取决于调用方如何推导 confirmed——若某处能从模型入参
    // 拿到 confirmed，凭据确认就会被绕过。本文件不改变该语义。
    return null;
  }

  const rawCommand = resolveShellCommandArg(
    typeof input === "object" && input !== null ? (input as Record<string, unknown>) : { command: input },
  );
  const extraInput =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>).input : undefined;

  const destructive = isDestructiveShellCommand({ command: rawCommand, input: extraInput });
  const displayCommand = toDisplayCommand(rawCommand);
  // 精确判据：vault 引用 / $nolo_cred 令牌 / 密钥形态的值（不看 PASSWORD 之类子串）。
  const credentialUse =
    inspectCommandCredentialUse(displayCommand).hasCredential ||
    (typeof extraInput === "string" && inspectCommandCredentialUse(extraInput).hasCredential);
  if (!destructive && !credentialUse) {
    return null;
  }

  // 两类风险分开表达：破坏性命令 → 原文案；仅凭据相关 → 独立的凭据确认请求。
  const request = destructive
    ? buildDestructiveShellPermissionRequest(displayCommand)
    : buildCredentialUsePermissionRequest(displayCommand);

  if (!ctx.confirmDestructiveAction) {
    if (credentialUse) {
      // 凭据命令在没有确认通道时**必须拒绝**（fail closed）：否则凭据会无声进 argv。
      throw buildCredentialUseBlockedError(
        "shell command carrying credentials blocked: no confirmation channel available",
        displayCommand,
      );
    }
    if (ctx.blockDestructiveWithoutConfirmation) {
      throw buildDestructiveShellBlockedError(
        "destructive shell command blocked: no confirmation channel available",
        request,
      );
    }
    return null;
  }

  // 确认回调除布尔外还可返回 { approved, hostResult }：宿主已代为执行时，
  // 这里把真实工具结果交回调用方，由调用方跳过 spawn（原命令不再执行一次）。
  const decision: DestructiveConfirmDecision = await ctx.confirmDestructiveAction(request);
  const approved = typeof decision === "boolean" ? decision : decision?.approved === true;
  if (!approved) {
    throw buildDestructiveShellBlockedError(
      "destructive shell command blocked: user declined confirmation",
      request,
    );
  }
  if (typeof decision === "object" && decision?.hostResult) {
    return decision.hostResult;
  }
  return null;
}

export async function evaluateCapabilityPolicy(
  capability: ExecutableCapability<any, any>,
  normalizedInput: unknown,
  ctx: CapabilityExecutionContext,
): Promise<import("../hostAdapter").AgentRuntimeToolResult | null> {
  if (capability.name === "execShell") {
    return await evaluateExecShellDestructiveGuard(normalizedInput, ctx);
  }
  return null;
}
