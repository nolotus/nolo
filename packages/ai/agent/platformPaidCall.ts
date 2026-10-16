// 「199 充值档位门槛」的**唯一**「谁出钱」判据：只有平台垫付（platform_credits）的
// 调用才可能被门槛拦。
//
// 门槛拦的是「平台替调用者付钱去跑高阶模型」，所以判据必须是**这次调用的计费归属**，
// 不是 provider 名字，也不是 agent 记录里自声明的字段。客户端（chat 输入区 / quick
// chat）与服务端（agentRun / chatCallPlan）共用本文件，禁止再各自实现一份。
//
// 归属真值来自两条既有生产规则：
// - resolveBillingSource（./agentBilling）：运行时 / 计费归属的同一出处；
// - isOwnedAgentRecord（./safeAgentSummary）：记录属主规则。
// 刻意不读记录自声明的 isOwned / isOAuth：非自有记录自称 custom / isOAuth /
// billingSource 不构成凭据归属证明，否则等于给「自声明即免门槛」开口子。
//
// isOAuth 同理必须**重算**，不接受记录里的布尔声明（W1 收紧）：记录体由客户端经
// 通用写库路由落库（packages/database/server/routes/write.ts 直存 req.body.data，
// 无 agent 字段白名单），服务端没有任何一处写入 isOAuth，所以 `isOAuth: true` 只是
// 自声明。通道归属改由**形态证明**给出，口径与 safeAgentSummary（其 isOAuth 亦由
// isOAuthApiKeyRef 重算）及 agentBilling 非自有分支一致：apiKeyRef 是已知 OAuth 订阅
// id，或记录本身是 Antigravity OAuth agent。真实 OAuth 记录（含 sshare 形状：
// provider=openai / model=gpt-6.1-sol / isOAuth=true / userId=owner-1 /
// apiKeyRef=chatgpt）仍如实归属 owner_subscription，不受影响。
import { isGptProModel } from "core/gptProTier";
import { isOAuthApiKeyRef } from "agent-runtime/serverProxyPolicy";
import { isAntigravityOAuthAgent } from "agent-runtime/antigravityOAuth";
import { resolveBillingSource } from "./agentBilling";
import { isOwnedAgentRecord } from "./safeAgentSummary";

const asTrimmed = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * OAuth 通道的**形态证明**：不接受记录自声明的 `isOAuth` 布尔（客户端可自declare），
 * 要求 apiKeyRef 是已知 OAuth 订阅 id，或记录本身是 Antigravity OAuth agent。
 * 谓词与 agentBilling 非自有分支 / safeAgentSummary 同口径，避免「闸门说一套、计费
 * 说另一套」。
 */
const hasOAuthCredentialShape = (agentConfig: Record<string, any>): boolean =>
  isOAuthApiKeyRef(agentConfig?.apiKeyRef) ||
  isAntigravityOAuthAgent({
    key: "platform-paid-call-probe",
    apiKeyRef: agentConfig?.apiKeyRef ?? undefined,
    provider: agentConfig?.provider ?? undefined,
    customProviderUrl: agentConfig?.customProviderUrl ?? undefined,
  });

/** 判定「谁出钱」所需的最小输入。 */
export interface PlatformPaidCallProbe {
  /** agent 记录（可含自声明字段，一律不作为通道归属证明）。 */
  agentConfig?: Record<string, any> | null;
  /** 调用者 userId：用于属主比对（isOwnedAgentRecord）。 */
  callerUserId?: string | null;
  /**
   * 请求级凭据真值（chat call-plan 的 plan.credentials.authKind）。有值时优先：
   * 请求已经算明「这次用平台 key」，比从记录反推更可信。
   */
  authKind?: string | null;
}

/**
 * 这次调用是否由平台垫付（platform_credits）——**唯一实现**（多调用点共用）。
 * 只有它为 true，199 档位门槛才可能触发。
 */
export function isPlatformPaidAgentCall(probe: PlatformPaidCallProbe): boolean {
  const agentConfig = probe?.agentConfig ?? {};
  const authKind = asTrimmed(probe?.authKind);
  // 请求级真值优先：请求已经算明这次用的就是平台 key / 非平台 key。
  // 真值短路：authKind 非空且 ≠ "platform-key" 即判「非平台垫付」，档位闸随之跳过。
  // **显式假设**：authKind === "none"（请求未解析出任何可用凭据）也走这条短路——
  // 没有凭据就没有平台垫付可拦，该请求随后会在凭据层（缺 key）失败，不会因为跳过
  // 闸门而白跑一次高阶模型。这条假设由测试钉住，不要改成「未知即拦」：那会把 none
  // 误报成平台垫付，把本该由凭据层报错的请求变成 402 档位错误。
  if (authKind) return authKind === "platform-key";

  // cli：密钥来自用户本机环境（agentSourceDescriptors 的 cli 通道），不是平台凭据。
  // resolveBillingSource 的 local 分支覆盖不到 apiSource === "cli"，故显式短路。
  if (asTrimmed(agentConfig.apiSource) === "cli") return false;

  return (
    resolveBillingSource({
      local: agentConfig.local,
      isLocal: agentConfig.isLocal,
      cliProvider: agentConfig.cliProvider,
      apiSource: agentConfig.apiSource,
      provider: agentConfig.provider,
      billingSource: agentConfig.billingSource,
      // 形态证明而非记录自声明（见文件头）：自声明 isOAuth 不足以证明 OAuth 通道归属。
      isOAuth: hasOAuthCredentialShape(agentConfig),
      apiKeyRef: agentConfig.apiKeyRef,
      customProviderUrl: agentConfig.customProviderUrl,
      isOwned: isOwnedAgentRecord(
        agentConfig,
        asTrimmed(probe?.callerUserId) || undefined,
      ),
      userId: agentConfig.userId,
      ownerId: agentConfig.ownerId,
    }) === "platform_credits"
  );
}

export type GptProTierGateOutcome =
  | { gated: false }
  | {
      gated: true;
      /** 档位查询本身失败（fail-closed 拒绝）——与「确实没档位」可区分。 */
      tierCheckUnavailable: boolean;
    };

/**
 * 服务端共享闸门：premium ∧ platformPaid → 查档位（失败 fail-closed）→ 是否必须 402。
 * 402 响应体字段由 core 的 buildGptProTierRequiredFields 统一拼装，两个 handler 只套
 * 各自的状态码 / 信封，不再各自判定「谁出钱」或各自拼 reason / message。
 */
export async function evaluateGptProTierGate(input: {
  provider?: unknown;
  model?: unknown;
  probe: PlatformPaidCallProbe;
  checkTierAllowed: () => Promise<{ allowed: boolean }>;
}): Promise<GptProTierGateOutcome> {
  if (!isGptProModel(input.provider, input.model)) return { gated: false };
  if (!isPlatformPaidAgentCall(input.probe)) return { gated: false };

  let allowed = false;
  let tierCheckUnavailable = false;
  try {
    allowed = (await input.checkTierAllowed())?.allowed === true;
  } catch {
    // fail-closed：无法确认档位时宁可拒绝，也不放行平台垫付的高阶模型。
    tierCheckUnavailable = true;
  }
  if (allowed) return { gated: false };
  return { gated: true, tierCheckUnavailable };
}
