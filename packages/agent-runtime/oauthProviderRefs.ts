/**
 * OAuth provider ref 的**单一真值**：闭集常量 + 纯判定函数。
 *
 * ## 为什么单独一个叶子模块
 *
 * 这张判定表有三类消费者，依赖面各不相同：
 *   1. `oauthProviders.ts` 的 `OAUTH_PROVIDER_KEYS`（`parseOAuthProviderKey`）——
 *      它所在的模块拖着整条 OAuth 刷新栈（openaiCodexOAuth / antigravityOAuth /
 *      devinOAuth / oauthRefreshError …）；
 *   2. 写入路由（`database/server/routes/write.ts` 的 `handleWrite` 与 CLI 的
 *      `writeAgentRecord`）——它们只需要「合法取值有哪些」这一个事实；
 *   3. 用户面错误文案（`server/oauth/oauthUserFacingErrors.ts`）与审计 detail
 *      （`server/chatCallPlan.ts` / `chatHandler.ts`）。
 *
 * 把表放在这里有实际后果：2/3 若从 `oauthProviders.ts` 取，等于让写入路由和
 * 一条 401 文案 import 整个刷新栈（crypto、上游 HTTP、rate-limit 单例）。
 * 所以本模块**刻意零依赖**：不 import oauthProviders / oauthTokenStore / 任何
 * OAuth 实现，只放常量与纯函数。
 *
 * ## 背景缺陷（本模块存在的原因）
 *
 * `parseOAuthProviderKey` 遇到闭集外的值就抛 `Unsupported OAuth provider key`。
 * 调用链把它当成「凭据没同步」处理：ref 解析失败 → catch → 输出
 * 「该 Agent 作者尚未把 <ref> OAuth 凭据同步到服务器 …… nolo auth <ref>」。
 * 配置写错（`apiKeyRef: "openai"`）被误报成作者没同步，用户照着文案跑
 * `nolo auth openai --sync-only` 永远好不了。判据必须是「ref 在不在闭集里」，
 * 而闭集只能有一份。
 */

/** 受支持的 OAuth provider ref（闭集）。新增 provider 必须同时改这里。 */
export const OAUTH_PROVIDER_REFS = [
  "chatgpt",
  "xai",
  "antigravity",
  "claude",
  "cursor",
  "devin",
] as const;

export type OAuthProviderRef = (typeof OAUTH_PROVIDER_REFS)[number];

/**
 * 计量/设备 broker ref 前缀。`apiKeyRef` **合法地**还会是这种形态
 * （`api-key:<owner>-<id>`），见 `agent-runtime/migrateAgentSecrets.ts`、
 * `server/handlers/agentRun/loopUpstream.ts`、`server/handlers/agentCredentialSyncHandler.ts`
 * 的正则，以及 `database/sync/stripAgentForAccountSync.ts`。写入校验必须放行它，
 * 否则会把「自带计量 key」的 agent 全部拒掉。
 */
export const METERED_API_KEY_REF_PREFIX = "api-key:";

/** ref 的比对口径：与 `agentCallPlan` / `loopUpstream` 一致（trim + 小写）。 */
const normalizeRef = (ref: unknown): string =>
  typeof ref === "string" ? ref.trim().toLowerCase() : "";

/** ref 是否是受支持的 OAuth provider（trim + 大小写不敏感，精确匹配闭集）。 */
export const isKnownOAuthProviderRef = (
  ref: unknown,
): ref is OAuthProviderRef =>
  (OAUTH_PROVIDER_REFS as readonly string[]).includes(normalizeRef(ref));

/** ref 是否是 `api-key:` 计量/设备 broker 形态（前缀大小写不敏感，且须有 id 段）。 */
export const isMeteredApiKeyRef = (ref: unknown): boolean => {
  const trimmed = typeof ref === "string" ? ref.trim() : "";
  return (
    trimmed.length > METERED_API_KEY_REF_PREFIX.length &&
    trimmed.slice(0, METERED_API_KEY_REF_PREFIX.length).toLowerCase() ===
      METERED_API_KEY_REF_PREFIX
  );
};

export const UNSUPPORTED_OAUTH_PROVIDER_CODE = "UNSUPPORTED_OAUTH_PROVIDER";

/** 文案里给用户看的「合法取值」清单（唯一出处，避免两处文案漂移）。 */
export const OAUTH_PROVIDER_REF_LIST_COPY = OAUTH_PROVIDER_REFS.join(" / ");

export type AgentApiKeyRefVerdict =
  | { ok: true; kind: "empty" }
  | { ok: true; kind: "oauth-provider"; provider: OAuthProviderRef }
  | { ok: true; kind: "metered-api-key" }
  | { ok: false; kind: "unsupported-oauth-provider"; ref: string };

/**
 * agent 记录 `apiKeyRef` 的唯一判定（写入校验与运行时分流共用）。
 *
 * 空/空白 = 没写 ref（合法，走 apiKey / platform 链）；闭集内的 provider ref
 * 合法；`api-key:` 前缀合法；其余一律非法 —— 它们既不是可用 provider，也不会
 * 在运行时被解析，只会在解析失败处被误报成「凭据缺失」。
 */
export function classifyAgentApiKeyRef(raw: unknown): AgentApiKeyRefVerdict {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return { ok: true, kind: "empty" };
  if (isKnownOAuthProviderRef(trimmed)) {
    return {
      ok: true,
      kind: "oauth-provider",
      provider: normalizeRef(trimmed) as OAuthProviderRef,
    };
  }
  if (isMeteredApiKeyRef(trimmed)) return { ok: true, kind: "metered-api-key" };
  return { ok: false, kind: "unsupported-oauth-provider", ref: trimmed };
}

/**
 * 凭据解析失败时的分类 code：闭集内 → 既有 `MISSING_<PROVIDER>_OAUTH`（逐字不变）；
 * 闭集外（含空）→ `UNSUPPORTED_OAUTH_PROVIDER`。用户面 401 code 与审计 detail
 * 都由这一个函数给出，口径不可能分叉。
 */
export function resolveOAuthProviderRefErrorCode(ref: unknown): string {
  const normalized = normalizeRef(ref);
  return isKnownOAuthProviderRef(normalized)
    ? `MISSING_${normalized.toUpperCase()}_OAUTH`
    : UNSUPPORTED_OAUTH_PROVIDER_CODE;
}

/**
 * 运行时（401 文案）用：配置非法时告诉用户「写错了」+ 合法取值 + 怎么改。
 *
 * 刻意不出现「尚未把…同步到服务器」与 `nolo auth <ref>`：那两句只在 ref 合法、
 * 真的缺凭据时才对，用在这里会把人引向永远无效的操作。
 */
export function formatUnsupportedOAuthProviderRefMessage(ref: unknown): string {
  const shown =
    typeof ref === "string" && ref.trim() ? ref.trim() : "（空）";
  return (
    `OAuth provider ref "${shown}" 不是受支持的取值——这是 Agent 配置写错了，不是作者没同步凭据。` +
    `合法取值：${OAUTH_PROVIDER_REF_LIST_COPY}；或计量/设备 broker ref（以 "${METERED_API_KEY_REF_PREFIX}" 开头，如 ${METERED_API_KEY_REF_PREFIX}agent-...）。` +
    `改法：把该 Agent 记录的 apiKeyRef 改成上面某个受支持的取值；若本想用自己的 API key，清空 apiKeyRef 并改填 apiKey（custom 模式还需填 customProviderUrl）。`
  );
}

/**
 * 写入侧（落库收口）用：与运行时同一说的判据、同一份合法取值，文案面向写记录的人。
 */
export function formatUnsupportedAgentApiKeyRefMessage(raw: unknown): string {
  const shown = typeof raw === "string" ? raw.trim() : "";
  return (
    `apiKeyRef "${shown}" 不是受支持的取值，记录未写入。` +
    `合法取值：OAuth provider ref（${OAUTH_PROVIDER_REF_LIST_COPY}），或计量/设备 broker ref（以 "${METERED_API_KEY_REF_PREFIX}" 开头，如 ${METERED_API_KEY_REF_PREFIX}agent-...）。` +
    `改法：把 apiKeyRef 改成上面某个受支持的取值，或改用 ${METERED_API_KEY_REF_PREFIX}<id>；若要用自带 API key，请清空 apiKeyRef 并填写 apiKey。`
  );
}
