/**
 * 凭据使用授权（Credential Use Grant）——最小可信 grant 服务。
 *
 * 要解决的边界：模型能自填 `--custom-provider-url`、`--confirmed` 这类参数，
 * 但**参数不是授权**。本模块只接受宿主可信确认通道的产物：
 * `ActionGate`（由宿主构造）+ `ActionGateResult`（由宿主 gate handler 返回，
 * 见 `packages/cli/tui/tuiTurnRunner.ts` 的 `{gateId, status:"completed", output:"confirmed"}`）。
 *
 * 真实性的边界（如实）：宿主确认是**流程内的事实**，不是密码学保证。任何能读
 * 宿主内存/调试宿主/以同 UID 跑任意 shell 的本地进程都无法被这里的字段校验挡住。
 * 本模块只保证「没有宿主确认对象就无法通过字段校验」，别把这句话读成不可伪造。
 *
 * 本轮范围（owner 已确认）：**固定 BigModel 官方目标**，不允许自定义 origin；
 * 模型既不能提供 URL 来改变允许目标，也无法自己产出宿主确认对象。
 *
 * 纯函数、零依赖，便于在 CLI / 宿主两侧共用同一份判定。
 */

import type { ActionGate, ActionGateResult } from "./actionGate";

/** 固定 BigModel 官方目标（本轮唯一允许的凭据去向）。 */
export const BIGMODEL_PROVIDER_TARGET = {
  providerId: "bigmodel",
  /** 规范化 origin：协议 + 主机 + 端口，不含路径。 */
  allowedOrigin: "https://open.bigmodel.cn",
} as const;

export type CredentialUseOperation = "verify" | "model-inference";

export type CredentialUseGrant = {
  credentialRef: string;
  deviceId: string;
  agentKey: string;
  providerId: string;
  allowedOrigin: string;
  operations: CredentialUseOperation[];
  persistence: "session" | "os-store";
  /** 宿主确认事件的 id（ActionGate.id）——审计锚点，由宿主产生、不来自工具参数。 */
  userAuthorizationEventId: string;
};

export type GrantBuildInput = {
  gate: ActionGate;
  result: ActionGateResult;
  credentialRef: string;
  agentKey: string;
  deviceId: string;
  providerId: string;
  /** 用户在看板上看到的目标 URL；只用于取 origin 比对固定目标。 */
  providerUrl: string;
  operations: CredentialUseOperation[];
  persistence: "session" | "os-store";
};

export type GrantVerdict =
  | { ok: true; grant: CredentialUseGrant }
  | { ok: false; reason: string };

/**
 * 规范化 origin：只保留 `scheme://host[:port]`，拒绝带凭据、非 http(s)、不可解析的值。
 * 返回 null 表示不可用于比对（调用方必须 fail closed）。
 */
export function normalizeOrigin(url: string): string | null {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (parsed.username || parsed.password) return null;
  return parsed.origin;
}

/**
 * 从宿主确认产物构造 grant。任何一项不满足即返回 null（fail closed）：
 * - 必须是 `confirm` 类 gate；
 * - result 必须属于同一个 gate、`status === "completed"` 且 `output === "confirmed"`；
 * - providerId 必须是固定的 BigModel，且目标 origin 与固定官方 origin 完全一致。
 */
export function buildCredentialUseGrant(input: GrantBuildInput): GrantVerdict {
  const { gate, result } = input;
  if (gate.kind !== "confirm") {
    return { ok: false, reason: "grant-requires-confirm-gate" };
  }
  if (!result || result.gateId !== gate.id) {
    return { ok: false, reason: "grant-result-does-not-match-gate" };
  }
  if (result.status !== "completed" || result.output !== "confirmed") {
    return { ok: false, reason: "grant-not-confirmed-by-host" };
  }
  const providerId = (input.providerId ?? "").trim();
  if (providerId !== BIGMODEL_PROVIDER_TARGET.providerId) {
    return { ok: false, reason: "grant-provider-not-allowed" };
  }
  const origin = normalizeOrigin(input.providerUrl);
  if (!origin || origin !== BIGMODEL_PROVIDER_TARGET.allowedOrigin) {
    return { ok: false, reason: "grant-target-origin-not-allowed" };
  }
  const credentialRef = (input.credentialRef ?? "").trim();
  const agentKey = (input.agentKey ?? "").trim();
  const deviceId = (input.deviceId ?? "").trim();
  if (!credentialRef || !agentKey || !deviceId) {
    return { ok: false, reason: "grant-missing-identity" };
  }
  if (!input.operations.includes("verify")) {
    return { ok: false, reason: "grant-missing-verify-operation" };
  }
  return {
    ok: true,
    grant: {
      credentialRef,
      deviceId,
      agentKey,
      providerId,
      allowedOrigin: origin,
      operations: [...input.operations],
      persistence: input.persistence,
      userAuthorizationEventId: gate.id,
    },
  };
}

/**
 * 使用点校验：凭证/agent 必须与 grant 一致、操作被授权、且**实际请求目标**
 * 与 grant 的 allowedOrigin 完全相同（跨 origin 一律拒绝，重定向由请求层再挡一次）。
 */
export function verifyCredentialUseGrant(args: {
  grant: CredentialUseGrant | null | undefined;
  credentialRef: string;
  agentKey: string;
  requestUrl: string;
  operation: CredentialUseOperation;
}): { ok: true } | { ok: false; reason: string } {
  const { grant } = args;
  if (!grant) return { ok: false, reason: "no-grant" };
  if (grant.providerId !== BIGMODEL_PROVIDER_TARGET.providerId) {
    return { ok: false, reason: "grant-provider-not-allowed" };
  }
  if (grant.allowedOrigin !== BIGMODEL_PROVIDER_TARGET.allowedOrigin) {
    return { ok: false, reason: "grant-target-origin-not-allowed" };
  }
  if (grant.credentialRef !== args.credentialRef) {
    return { ok: false, reason: "grant-credential-mismatch" };
  }
  if (grant.agentKey !== args.agentKey) {
    return { ok: false, reason: "grant-agent-mismatch" };
  }
  if (!grant.operations.includes(args.operation)) {
    return { ok: false, reason: "grant-operation-not-allowed" };
  }
  const requestOrigin = normalizeOrigin(args.requestUrl);
  if (!requestOrigin || requestOrigin !== grant.allowedOrigin) {
    return { ok: false, reason: "request-origin-not-allowed" };
  }
  return { ok: true };
}
