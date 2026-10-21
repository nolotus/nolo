/**
 * 通用 OAuth 线（OAuth 来源凭据 + `chat.completions` wire）允许出站的官方 host。
 *
 * ## 范围刻意最小
 *
 * 只覆盖**真正会外泄的那一类形态**：
 * `authKind === "oauth"` **且** 目标来自客户端 `request.url` / 记录
 * `customProviderUrl` **且** wire 不是那五条专用线
 * （`gemini-cca` / codex-responses / `anthropic-messages` / `cursor-connect` /
 * `devin-connect`）。
 *
 * ## 为什么不能写成「全部 OAuth provider 的全局白名单」（会误伤真实 agent）
 *
 * - 五条专用线各自由翻译器写死端点，并已有自己的 host 校验，本轮不动；
 * - antigravity **合法地**从记录取端点：
 *   `antigravityCloudCodeProvider.ts:224`
 *   `` `${resolveAntigravityCloudCodeBaseUrl(agentConfig.customProviderUrl)}${STREAM_PATH}` ``
 *   而 `antigravityOAuth.ts` 的 `ANTIGRAVITY_CLOUD_CODE_HOSTS` + `isAntigravityCloudCodeBaseUrl`
 *   用**解析后的 hostname 精确比对**（2026-10-16 前的整串 `includes` 已被后缀 host 绕过，
 *   见该文件同名注释），所以 `daily-cloudcode-pa.googleapis.com` 与 legacy 泛域都是合法形态。
 *   一张全局白名单会把「`apiKeyRef=antigravity` + `customProviderUrl=Cloud Code 域`」
 *   这些**正在使用**的 agent 全部 400 —— 那是误伤，不是修复。
 *
 * ## 通用线：xAI SuperGrok
 *
 * `GENERIC_OAUTH_UPSTREAM_HOSTS.xai` 必须与 `XAI_CHAT_COMPLETIONS_URL`
 * （`agentCallPlan.ts:156`）的 host 保持 lockstep；`chatCallPlan.test.ts` 有用例
 * 断言两者一致，并断言覆盖「通用线 ∪ 专用线 = 全部 OAuth ref」——将来若新增一条
 * 通用 OAuth 线而忘了归类，那条用例会红。
 *
 * 本模块刻意零依赖（不 import agentCallPlan）：它挂在出站路径上
 * （`chatProxyRouting` 最后一跳），不能因此把 catalog / crypto 的重依赖图拖进来。
 */

/** 通用 OAuth 线：provider ref → 官方 host（本层守卫唯一放行的 host）。 */
export const GENERIC_OAUTH_UPSTREAM_HOSTS = {
  xai: "api.x.ai",
} as const;

export type GenericOAuthRef = keyof typeof GENERIC_OAUTH_UPSTREAM_HOSTS;

/**
 * 五条专用线：端点由翻译器写死、各有自己的 host 校验 —— **本轮改动范围之外**。
 * 列在这里只为一件事：让守卫明确「这些 ref 不进入本层」，以及让覆盖性测试能断言
 * 「每个 OAuth ref 要么属通用线、要么属专用线」。
 */
export const DEDICATED_OAUTH_REFS = [
  "antigravity",
  "chatgpt",
  "claude",
  "cursor",
  "devin",
] as const;

export type DedicatedOAuthRef = (typeof DEDICATED_OAUTH_REFS)[number];

const normalizeRef = (ref: unknown): string =>
  typeof ref === "string" ? ref.trim().toLowerCase() : "";

export const isGenericOAuthRef = (ref: unknown): ref is GenericOAuthRef =>
  Object.prototype.hasOwnProperty.call(
    GENERIC_OAUTH_UPSTREAM_HOSTS,
    normalizeRef(ref),
  );

export const isDedicatedOAuthRef = (ref: unknown): ref is DedicatedOAuthRef =>
  (DEDICATED_OAUTH_REFS as readonly string[]).includes(normalizeRef(ref));

/** 通用线 provider 的官方 host；不是通用线（含五条专用线、未知 ref）返回 null。 */
export const resolveGenericOAuthHost = (ref: unknown): string | null => {
  const normalized = normalizeRef(ref);
  const host = (GENERIC_OAUTH_UPSTREAM_HOSTS as Record<string, string>)[
    normalized
  ];
  return host ?? null;
};

/**
 * 出站 URL 是否命中该通用线 provider 的官方 host。
 *
 * 口径与仓库既有的 provider host 校验同构（见 `antigravityOAuth.ts` 的
 * `ANTIGRAVITY_CLOUD_CODE_HOST` + includes 判定）：**按 provider 判、只看 host**，
 * xAI 不把整条 URL 钉死。
 * https 之外、不可解析、非通用线 ref
 * 一律返回 false；调用方必须先判定「是否通用线」再决定放行策略（见 chatProxyRouting
 * 里的 `assertOAuthUpstreamAllowed`：非通用线直接放行，属本轮范围外）。
 */
export const isGenericOAuthUpstreamUrlAllowed = (
  ref: unknown,
  url: unknown,
): boolean => {
  const allowedHost = resolveGenericOAuthHost(ref);
  if (!allowedHost) return false;
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return (
      parsed.protocol === "https:" && parsed.host.toLowerCase() === allowedHost &&
      !parsed.username && !parsed.password
    );
  } catch {
    return false;
  }
};
