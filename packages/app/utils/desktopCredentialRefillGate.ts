// 文件路径: packages/app/utils/desktopCredentialRefillGate.ts
//
// 桌面端凭据缺失重填门禁：
// 当 DirectApiKeyResolutionError / kind: "credential_missing" 穿透 Redux 边界后，
// 在桌面端挂起请求并弹出重填面板，写入本地凭据存储后通知调用方自动重试。
//
// 安全不变量：
// - 凭据明文只存在于面板 state 和 POST body 中，绝不进入 Redux、日志、URL、localStorage 或 transcript。
// - 同一 ref 在一次会话内绝不重复弹窗超过一次（内存 Set 记录，不进 Redux / 不持久化）。
// - 非桌面环境（getIsDesktopApp() 为 false）绝不弹窗。

import { getIsDesktopApp } from "./env";
import {
  pushGate,
  type DesktopActionGate,
  type DesktopActionGateResolveOptions,
} from "./desktopActionGateChannel";

/** 内存 Set：记录当前会话已弹过重填面板的 credentialRef，防止重复弹窗循环。 */
const promptedCredentialRefs = new Set<string>();

/** 测试辅助：清空已弹过的 ref 记录。 */
export function resetPromptedCredentialRefsForTest(): void {
  promptedCredentialRefs.clear();
}

/**
 * 用户主动发起新一轮消息时调用：清空「已弹过」记录。
 *
 * 为什么需要：`promptedCredentialRefs` 是模块级 Set，桌面端进程常驻，
 * 若不重置，用户误点一次取消后，同一个 ref 在本进程生命周期内再也不会
 * 弹出重填面板——界面没有任何入口让他重试，只能重启应用。用户主动发
 * 新消息是明确的「我要再试一次」信号，此时重置才不会把可恢复状态变成
 * 不可恢复状态。
 */
export function resetPromptedCredentialRefsOnUserSend(): void {
  promptedCredentialRefs.clear();
}

/** 从 credentialRef 派生用户可读的凭据展示名。例：'api-key:agent-123' -> 'agent-123' */
export function deriveSecretNameFromCredentialRef(credentialRef?: string): string {
  if (!credentialRef || typeof credentialRef !== "string") return "API Key";
  const trimmed = credentialRef.trim();
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex >= 0 && colonIndex < trimmed.length - 1) {
    return trimmed.slice(colonIndex + 1);
  }
  return trimmed || "API Key";
}

/** 识别错误是否为「凭据缺失」结构化错误。 */
export function isCredentialMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { kind?: unknown }).kind === "credential_missing";
}

export type PromptDesktopCredentialRefillOptions = {
  credentialRef?: string;
  fetchImpl?: typeof fetch;
  isDesktopOverride?: boolean;
};

/**
 * 桌面端凭据重填门禁核心：
 * 1. 守卫环境：非桌面（getIsDesktopApp() === false）直接跳过；
 * 2. 守卫频次：同一 credentialRef 一次会话内仅弹一次；
 * 3. 构造 input / secret_request gate 推入 desktopActionGateChannel；
 * 4. 用户填写确认 -> 通过 POST /api/desktop/credentials (op: "put") 覆盖写入本地凭据；
 * 5. 用户取消 -> 关闭面板，返回 false；
 * 6. 返回 Promise<boolean>，true 表示重填并写入成功（可自动重试一次），false 表示取消或跳过。
 */
export async function promptDesktopCredentialRefill(
  errorOrRef: unknown,
  options: PromptDesktopCredentialRefillOptions = {},
): Promise<boolean> {
  const isDesktop =
    typeof options.isDesktopOverride === "boolean"
      ? options.isDesktopOverride
      : getIsDesktopApp();

  // 非真桌面环境：绝对不弹面板，由调用方展示文案。
  if (!isDesktop) {
    return false;
  }

  const credentialRef =
    typeof errorOrRef === "string"
      ? errorOrRef
      : typeof (errorOrRef as any)?.credentialRef === "string"
        ? (errorOrRef as any).credentialRef
        : options.credentialRef;

  if (!credentialRef) {
    return false;
  }

  // 同一 ref 在一次会话内不要重复弹超过一次。
  if (promptedCredentialRefs.has(credentialRef)) {
    return false;
  }
  promptedCredentialRefs.add(credentialRef);

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const gateId = `credential-refill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const secretName = deriveSecretNameFromCredentialRef(credentialRef);

  const gate: DesktopActionGate = {
    id: gateId,
    kind: "input",
    title: "重新提供密钥",
    body: "这一步需要重新提供密钥",
    payload: {
      action: "secret_request",
      name: secretName,
    },
  };

  return new Promise<boolean>((resolve) => {
    let settled = false;

    const handleLocalResolve = async (
      resolveOpts: DesktopActionGateResolveOptions,
    ): Promise<boolean> => {
      if (resolveOpts.decision === "cancel") {
        if (!settled) {
          settled = true;
          resolve(false);
        }
        return true;
      }

      // decision === "approve"
      const secret = resolveOpts.value ?? "";
      if (!secret.trim()) {
        throw new Error("密钥不能为空");
      }

      // 通过桌面凭据桥 handleDesktopCredentialsPost 写入存储（op: "put"）
      const response = await fetchImpl("/api/desktop/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          op: "put",
          ref: credentialRef,
          secret,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `写入凭据失败 (HTTP ${response.status})`);
      }

      if (!settled) {
        settled = true;
        resolve(true);
      }
      return true;
    };

    pushGate(gate, {
      kind: "local",
      resolve: handleLocalResolve,
    });
  });
}
