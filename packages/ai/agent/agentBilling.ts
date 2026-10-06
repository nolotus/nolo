import { isAntigravityOAuthAgent } from "agent-runtime/antigravityOAuth";
import { isOAuthApiKeyRef } from "agent-runtime/serverProxyPolicy";

export type BillingSource =
  | "user_subscription"
  | "user_api"
  /**
   * 非自有 Agent，跑其 owner 的 OAuth 订阅通道：调用者与平台都不出钱。
   * 因此它既不受「平台积分扣费告知/授权」门约束，也不占用调用者的额度。
   * 与 user_subscription 的区别是**付款人不是当前用户**，不要合并成同一档。
   */
  | "owner_subscription"
  | "platform_credits"
  | "local";

export interface AgentBillingCandidate {
  local?: boolean;
  isLocal?: boolean;
  cliProvider?: string | null;
  apiSource?: string | null;
  provider?: string | null;
  billingSource?: BillingSource | string | null;
  isOAuth?: boolean;
  apiKeyRef?: string | null;
  customProviderUrl?: string | null;
  isOwned?: boolean;
  isPublic?: boolean;
  /**
   * 记录里的属主标识。运行时判定「跑 owner 通道」时要求 owner 字段**存在**且不等于本机
   * 用户（缺省时它不跳过本地运行时），这里同样要求存在，避免比运行时多报一层。
   */
  userId?: string | null;
  ownerId?: string | null;
}

export function resolveBillingSource(candidate: AgentBillingCandidate): BillingSource {
  if (
    candidate?.local === true || candidate?.isLocal === true ||
    candidate?.cliProvider === "local" || candidate?.apiSource === "local" ||
    candidate?.provider === "local" || candidate?.billingSource === "local"
  ) return "local";

  // Public/non-owned records may self-declare OAuth/custom fields; those fields
  // do not prove that the current user owns the credential. 封顶规则：无法证明通道
  // 归属的非自有 agent 一律按 platform_credits 计（宁可高报，不让调用者被意外
  // 收费）。这条对「自声明 custom / api-key」形态仍然成立，勿放宽。
  if (candidate?.isOwned !== true) {
    // 例外：非自有 + OAuth 形态 + owner 字段存在。此时运行时自己就会跳过调用者的
    // 本地 runtime、改走 owner 的订阅通道，调用者与平台都不出钱。旧行为一律报
    // platform_credits，会让模型误判成「需要平台积分扣费授权」（2026-09-18 实际
    // 发生过一次误判，代价是一次多余的授权请求）。这里如实归属 owner。
    // 谓词刻意镜像 runtime 自己的判定（packages/cli/client/agentRun.ts ~350-371）：
    //   owner 字段存在 && owner !== 本机用户 && (isOAuthApiKeyRef(apiKeyRef) || isAntigravity)
    // 因而标签描述的就是运行时会真做的事，不会「说一套做一套」。
    const ownerUserId =
      typeof candidate?.userId === "string" && candidate.userId.trim()
        ? candidate.userId.trim()
        : typeof candidate?.ownerId === "string" && candidate.ownerId.trim()
          ? candidate.ownerId.trim()
          : "";
    if (
      ownerUserId &&
      (candidate?.isOAuth === true ||
        isOAuthApiKeyRef(candidate?.apiKeyRef) ||
        isAntigravityOAuthAgent({
          key: "billing-source-probe",
          apiKeyRef: candidate?.apiKeyRef ?? undefined,
          provider: candidate?.provider ?? undefined,
          customProviderUrl: candidate?.customProviderUrl ?? undefined,
        }))
    ) {
      return "owner_subscription";
    }
    return "platform_credits";
  }

  if (
    candidate?.isOAuth === true || candidate?.billingSource === "user_subscription" ||
    candidate?.apiSource === "oauth" || isOAuthApiKeyRef(candidate?.apiKeyRef)
  ) return "user_subscription";
  if (candidate?.apiSource === "custom" || candidate?.billingSource === "user_api") {
    return "user_api";
  }
  return "platform_credits";
}
