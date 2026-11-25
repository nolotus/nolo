// packages/ai/agent/toolErrorReport.ts
//
// Web 端工具执行抛异常的上报（best-effort，浏览器专用）。
//
// 边界（有意收窄）：
// - 只由 executeToolCall 的 catch 调用：仅「执行器抛异常」这一明确范围。工具正常
//   返回（含结构化 rawData 里的失败描述）一律不上报。
// - 只在浏览器里发：非 Web（node / RN / SSR）直接跳过；本模块不引用 process 或任何
//   node: 内置模块。
// - 缺 dialogId / callId / toolName / 认证 token / 已配置的目标 server 一律不发。
// - 目标 server 不盲信 settings.currentServer：优先用该账号的权威 server
//   （userAuthorityRegistry），否则用 currentServer，且必须是「已配置集合」里的
//   origin、无 userinfo、https（http 仅限 loopback）。认证身份与目标 server 不匹配
//   时不发。
// - 固定 body，只含 TOOL_ERROR_REPORT_ALLOWED_FIELDS 里的字段；绝不上传 raw
//   arguments、工具输出、聊天正文、userId、source、token。source 由服务端固定为
//   client-reported，客户端不参与也不可传。
// - 文本脱敏同时剥离 ASCII 控制字符与任意协议的 URL userinfo
//   （`scheme://user:pass@host`）；body 在发送前用 TextEncoder 按真实 UTF-8 字节
//   拟合到 16 KiB（超限先舍弃 stack，再缩减 message，最后回退 errorClass）。
// - clientVersion 省略：web 侧目前没有可靠的构建期客户端版本注入
//   （`__NOLO_CLI_VERSION__` 是 CLI 包版本，不是本客户端版本），不拿它冒充。
// - 失败绝不改变工具结果：调用点不 await、不重试、不打新日志；任何异常在这里吞掉。
//   请求有 3s 上限（AbortController + timer，不依赖 AbortSignal.timeout）、并发上限、
//   去重缓存上限；拿不到 AbortController 时直接跳过上报，绝不发无界请求。
//
// 客户端上报的是「浏览器侧观察到的失败」，不等于 server 执行事实。

import { selectCurrentServer } from "app/settings/serverSelectors";
import { getSessionSnapshotForState } from "identity/sessionSource";
import { normalizeKnownServerOrigin } from "database/config";
import { resolveUserAuthorityServer } from "database/authority/userAuthorityRegistry";
import { isLoopbackHostname } from "core/localOrigins";
import { redactUrlQueryAndFragment, redactUrlUserinfo } from "core/redactUrlUserinfo";
import {
  googleSessionRequestToken,
  googleSessionServer,
  isGoogleAuthoritySession,
} from "core/googleSessionScope";

/** 服务端固定路由（另一条线实现；本模块只按契约发请求）。 */
export const TOOL_ERROR_REPORT_PATH = "/api/diagnostics/tool-errors";

/** 单次请求上限。超时就放弃，不排队、不重试。 */
const REPORT_TIMEOUT_MS = 3000;
/**
 * 同时在飞的请求上限，防止异常风暴打满网络。
 * 与服务端每用户 ingest 并发槽（`TOOL_ERROR_REPORT_MAX_INFLIGHT_PER_USER = 1`）对齐：
 * 客户端允许 2 条并发时，第二条必然落在服务端槽位之外被 429 静默丢弃（服务端按
 * principal user 计槽，同一账号的两条并发上报就是同一用户）。这里只对齐上限——
 * 不加队列、不加重试（失败仍是 best-effort 丢弃，行为不变）。
 */
const MAX_INFLIGHT_REPORTS = 1;
/** 去重缓存条目上限（FIFO 淘汰），防无界增长。 */
const MAX_DEDUPE_ENTRIES = 100;

const MESSAGE_MAX_CHARS = 1000;
const STACK_MAX_CHARS = 4000;
const ERROR_CLASS_MAX_CHARS = 120;
const IDENTIFIER_MAX_CHARS = 200;

/**
 * Contract byte cap for the request body
 * (`docs/plans/2026-11-12-tool-error-reports.md` §2: 16 KiB, rejected with
 * `413 body_too_large` *before* JSON parse). Character limits alone do not
 * bound bytes: CJK is 3 bytes per UTF-16 unit and an unescaped control
 * character becomes six ASCII bytes (`\u0000`) once JSON-serialized, so the
 * client must measure the serialized body and fit it to this cap itself.
 */
export const TOOL_ERROR_REPORT_MAX_BODY_BYTES = 16 * 1024;

/** ASCII control characters (keeping `\t`, `\n`, `\r`): they only bloat JSON. */
const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/**
 * URL userinfo 脱敏由 `core/redactUrlUserinfo` 统一实现（服务端 sanitizer 用的是
 * 同一个函数）：`scheme://user:pass@host` → `scheme://[REDACTED]@host`。
 *
 * 为什么不再是本文件里的正则：WHATWG `new URL()` 允许 userinfo 内含未编码的 `'`
 * （`https://alice:pa'ss@host` 的密码就是 `pa'ss`），把 `'` 当边界会留下 `ss@host`
 * 泄密；共享实现按 authority + `new URL` 判定，`/?#` 之外的 @handle、query 邮箱
 * 仍不误伤。
 */

const REDACTED = "[REDACTED]";

/** 上报 body 的唯一字段白名单（顺序无关；其余键一律丢弃）。 */
export const TOOL_ERROR_REPORT_ALLOWED_FIELDS = [
  "dialogId",
  "callId",
  "toolName",
  "errorClass",
  "message",
  "stack",
  "clientVersion",
] as const;

export type ToolErrorReportPayload = {
  dialogId: string;
  callId: string;
  toolName: string;
  errorClass: string;
  message: string;
  stack?: string;
};

const dedupeKeys = new Map<string, true>();
let inflightReports = 0;

/** 仅供测试：清空模块级状态。 */
export function __resetToolErrorReportState(): void {
  dedupeKeys.clear();
  inflightReports = 0;
}

/** 仅供测试：观察有界状态。 */
export function __getToolErrorReportState(): {
  dedupeSize: number;
  inflight: number;
} {
  return { dedupeSize: dedupeKeys.size, inflight: inflightReports };
}

/**
 * 先脱敏，再截断（顺序不能反）。
 *
 * 截断在脱敏之前时，只要凭据的 `@` 落在截断点之后，前半段（`https://user:pass…`）
 * 就会原样进入上报 body——服务端再脱敏也补不回来（design note 隐患 3）。
 * `resolveErrorMessage` / `resolveStack` 一直是「先脱敏后截断」，标识字段与
 * `errorClass` 现在对齐同一顺序。
 */
const sanitizedBoundedString = (value: unknown, maxChars: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const cleaned = sanitizeToolErrorText(value).trim();
  if (!cleaned) return undefined;
  return cleaned.length > maxChars ? cleaned.slice(0, maxChars) : cleaned;
};

/**
 * 文本脱敏（幂等）：ASCII 控制字符、任意协议的 URL userinfo
 * （`scheme://user:pass@host`）、URL query / hash、Authorization Bearer、JWT、
 * 带键的 apiKey / token / password / secret，以及裸 sk- 形态密钥。
 * 只处理投影后的字符串，不序列化异常对象。
 */
export function sanitizeToolErrorText(input: unknown): string {
  if (typeof input !== "string" || !input) return "";

  let text = input;

  // 0) ASCII 控制字符（保留 \t \n \r）：JSON 序列化会把它们膨胀成 6 字节转义，
  //    且服务端契约里控制字符本身不属于可接受内容。
  text = text.replace(CONTROL_CHARS_PATTERN, "");

  // 1) 任意协议的 URL userinfo（scheme://user:pass@host）：必须在 query / hash
  //    规则之前剥离，否则 `https://user:pass@host` 会把账密原样留在正文里。
  text = redactUrlUserinfo(text);

  // 2) 绝对 URL 的 query 与 hash（fragment 里也可能带 token）。scheme 不限于
  //    http(s)：`ws://`、`wss://`、`postgres://`、`redis://` 的 query/fragment
  //    同样会带凭据（design note 隐患 4）。
  //    起点判定与 userinfo 完全一致（同一个 `:`-锚点函数），因此省略斜杠的
  //    `https:host/cb#code=…`、被 `\n`/`\r`/`\t` 折开的 URL 同样覆盖；
  //    旧的 `://` 字面量规则对这些形态整段漏脱敏。
  text = redactUrlQueryAndFragment(text);

  // 3) 相对路径上的敏感查询参数。
  text = text.replace(
    /([?&](?:access[_-]?token|refresh[_-]?token|api[_-]?key|apikey|token|secret|password|sig|signature|key)=)[^&\s"'<>[\]]+/gi,
    (_match, prefix: string) => `${prefix}${REDACTED}`,
  );

  // 4) Authorization 方案 + 凭据。
  text = text.replace(
    /\b(bearer)\s+[A-Za-z0-9._~+/=-]{4,}/gi,
    (_match, scheme: string) => `${scheme} ${REDACTED}`,
  );

  // 5) JWT（三段 base64url）。
  text = text.replace(
    /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g,
    REDACTED,
  );

  // 6) 带键的凭据（apiKey: xxx / "token":"xxx" / password=xxx）。
  text = text.replace(
    /((?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|token|password|secret|authorization)["']?\s*[:=]\s*)("?)([^\s"',;}\][]+)/gi,
    (_match, prefix: string, quote: string) => `${prefix}${quote}${REDACTED}`,
  );

  // 7) 裸 sk- 密钥。
  text = text.replace(/\bsk-[A-Za-z0-9_-]{12,}/g, REDACTED);

  return text;
}

const resolveErrorClass = (error: unknown): string => {
  if (error && typeof error === "object") {
    const record = error as { name?: unknown; constructor?: { name?: unknown } };
    const name =
      sanitizedBoundedString(record.name, ERROR_CLASS_MAX_CHARS) ??
      sanitizedBoundedString(record.constructor?.name, ERROR_CLASS_MAX_CHARS);
    if (name) return name;
    return "Error";
  }
  return "Error";
};

const resolveErrorMessage = (error: unknown, errorClass: string): string => {
  const raw =
    error && typeof error === "object"
      ? (error as { message?: unknown }).message
      : error;
  const text =
    typeof raw === "string" ? raw : raw === undefined || raw === null ? "" : String(raw);
  const sanitized = sanitizeToolErrorText(text).trim();
  const bounded =
    sanitized.length > MESSAGE_MAX_CHARS ? sanitized.slice(0, MESSAGE_MAX_CHARS) : sanitized;
  return bounded || errorClass;
};

const resolveStack = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const stack = (error as { stack?: unknown }).stack;
  if (typeof stack !== "string") return undefined;
  const sanitized = sanitizeToolErrorText(stack).trim();
  if (!sanitized) return undefined;
  return sanitized.length > STACK_MAX_CHARS ? sanitized.slice(0, STACK_MAX_CHARS) : sanitized;
};

/**
 * 构造上报 body。缺 dialogId / callId / toolName 返回 null：宁可少报，
 * 也不发形状不全的记录。
 */
export function buildToolErrorReportPayload(input: {
  dialogId?: string | null;
  callId?: string | null;
  toolName?: string | null;
  error: unknown;
}): ToolErrorReportPayload | null {
  // 标识字段同样「先脱敏，再截断」：`@` 落在 200 字符之后时，先截断的旧顺序会把
  // 前半段凭据原样发出去（design note 隐患 3）。脱敏后为空即视为缺失（宁可少报），
  // 不再回退到未脱敏的截断值。
  const dialogId = sanitizedBoundedString(input.dialogId, IDENTIFIER_MAX_CHARS);
  const callId = sanitizedBoundedString(input.callId, IDENTIFIER_MAX_CHARS);
  const toolName = sanitizedBoundedString(input.toolName, IDENTIFIER_MAX_CHARS);
  if (!dialogId || !callId || !toolName) return null;

  const errorClass = resolveErrorClass(input.error);
  // 前后双脱敏：投影时脱一次，截断后再脱一次（防截断把凭据切成不可识别形态）。
  const message =
    sanitizeToolErrorText(resolveErrorMessage(input.error, errorClass)) || errorClass;
  const stack = resolveStack(input.error);

  return {
    dialogId,
    callId,
    toolName,
    errorClass,
    message,
    ...(stack ? { stack } : {}),
  };
}

/** 只保留白名单字段；调用方夹带的任何多余键在这里丢弃。 */
const pickAllowedFields = (
  payload: Record<string, unknown>,
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const field of TOOL_ERROR_REPORT_ALLOWED_FIELDS) {
    const value = payload[field];
    if (typeof value === "string" && value) out[field] = value;
  }
  return out;
};

/**
 * 逐字符（按 UTF-16 code unit 迭代不拆代理对，改用 for..of 遍历 code point）
 * 截到不超过 `maxBytes` 个 UTF-8 字节。
 */
const truncateToUtf8Bytes = (value: string, maxBytes: number): string => {
  if (maxBytes <= 0) return "";
  const encoder = new TextEncoder();
  if (encoder.encode(value).length <= maxBytes) return value;
  let used = 0;
  let out = "";
  for (const char of value) {
    const size = encoder.encode(char).length;
    if (used + size > maxBytes) break;
    used += size;
    out += char;
  }
  return out;
};

const utf8ByteLength = (value: string): number => new TextEncoder().encode(value).length;

/**
 * 把白名单字段序列化成 ≤ `TOOL_ERROR_REPORT_MAX_BODY_BYTES` 的请求体字符串。
 *
 * 顺序（契约要求客户端按字节预算发送，而不是按字符）：
 * 1. 原样能放下就直接用；
 * 2. 超限先舍弃 `stack`（它对排查有用但不是必需）；
 * 3. 仍超限再按字节缩减 `message`；
 * 4. 缩减后为空则回退 `errorClass`（极短、必然放得下）；
 * 5. 仍然超限才返回 null（宁可少报，也不发一个必然被 413 拒掉的 body）。
 */
const buildBoundedBody = (fields: Record<string, string>): string | null => {
  const withoutStack: Record<string, string> = { ...fields };
  delete withoutStack.stack;

  const attempts = fields.stack ? [fields, withoutStack] : [withoutStack];
  for (const attempt of attempts) {
    const serialized = JSON.stringify(attempt);
    if (utf8ByteLength(serialized) <= TOOL_ERROR_REPORT_MAX_BODY_BYTES) return serialized;
  }

  const base = { ...withoutStack, message: "" };
  const budgetForMessage =
    TOOL_ERROR_REPORT_MAX_BODY_BYTES - utf8ByteLength(JSON.stringify(base));
  if (budgetForMessage > 0) {
    // 这一步只在 message 已经过 `sanitizeToolErrorText` 之后运行（`resolveErrorMessage`
    // 先脱敏再按字符截断，`buildToolErrorReportPayload` 再脱一次），所以按字节切
    // 已经脱敏的文本只会切掉 `[REDACTED]` 之类占位符自身，不会「切回」凭据；而
    // message ≤ 1000 字符 ≤ 4 KB，实际先超预算的是 stack（整段丢弃，不做半截切割）。
    const shrunk = truncateToUtf8Bytes(withoutStack.message ?? "", budgetForMessage);
    if (shrunk) {
      const serialized = JSON.stringify({ ...withoutStack, message: shrunk });
      if (utf8ByteLength(serialized) <= TOOL_ERROR_REPORT_MAX_BODY_BYTES) return serialized;
    }
  }

  const fallback = JSON.stringify({
    ...withoutStack,
    message: withoutStack.errorClass ?? "",
  });
  return utf8ByteLength(fallback) <= TOOL_ERROR_REPORT_MAX_BODY_BYTES ? fallback : null;
};

/**
 * 目标 origin 安全判据：只接受裸 origin（无 path/query/hash/userinfo），
 * https 一律允许，http 仅限 loopback（本机开发服务器）。
 * 返回规范化 origin，不合格返回 null。
 */
export function resolveSafeReportOrigin(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  // 带 userinfo 的 URL 会把凭据拼进请求行/日志，直接拒绝。
  if (url.username || url.password) return null;
  if (url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;
  // 明文 HTTP 只允许本机 loopback（127.0.0.1 / localhost / ::1）。
  if (url.protocol === "http:" && !isLoopbackHostname(url.hostname)) return null;
  return url.origin;
}

/** state 里所有「已配置」的 server origin（currentServer / syncServers / 权威登记）。 */
const collectConfiguredOrigins = (state: any): Set<string> => {
  const origins = new Set<string>();
  const push = (value: unknown) => {
    const normalized = normalizeKnownServerOrigin(value);
    if (normalized) origins.add(normalized);
  };
  push(state?.settings?.currentServer);
  const syncServers = state?.settings?.syncServers;
  if (Array.isArray(syncServers)) syncServers.forEach(push);
  const registry = state?.settings?.userAuthorityRegistry;
  if (registry && typeof registry === "object") {
    for (const entry of Object.values(registry)) {
      if (typeof entry === "string") {
        push(entry);
        continue;
      }
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        push(record.authorityServer);
        push(record.homeServer);
        push(record.primaryServer);
      }
    }
  }
  return origins;
};

export type ToolErrorReportTarget = { baseUrl: string; token: string };

/**
 * 选出上报目标：先按账号权威 server，再退回 currentServer；两者都必须落在
 * 「已配置集合」内并通过 origin 安全判据。任何不确定都返回 null（不发）。
 */
export function resolveToolErrorReportTarget(state: any): ToolErrorReportTarget | null {
  if (!state || typeof state !== "object") return null;

  // 身份与 token 必须来自同一份会话快照（不能一次读 userId、一次读 token，
  // 两者可能跨账号切换错配），且 token 必须属于当前 active account。
  const snapshot = getSessionSnapshotForState(state);
  const activeAccountId =
    typeof snapshot?.activeAccountId === "string" ? snapshot.activeAccountId.trim() : "";
  const rawToken = typeof snapshot?.activeToken === "string" ? snapshot.activeToken.trim() : "";
  if (!activeAccountId || !rawToken) return null;

  const configuredOrigins = collectConfiguredOrigins(state);

  // Web OAuth 会话（Google / GitHub）：Bearer 只能回到它自己的浏览器同源节点。
  // `userAuthorityRegistry` 里的 authorityServer 属于密码账号的权威映射，可能指向
  // 另一个集群节点——把这条会话 token 送去那里就是跨源泄露。拿不到同源（非浏览器、
  // 无 location，或页面是明文非 loopback）时直接放弃上报：没有可退的目标。
  if (isGoogleAuthoritySession(rawToken)) {
    const sameOrigin = resolveSafeReportOrigin(googleSessionServer(rawToken));
    if (!sameOrigin) return null;
    return { baseUrl: sameOrigin, token: rawToken };
  }

  const authorityServer = resolveUserAuthorityServer({
    ownerUserId: activeAccountId,
    registry: state?.settings?.userAuthorityRegistry ?? null,
  });
  const authorityOrigin = resolveSafeReportOrigin(authorityServer);
  const currentOrigin = resolveSafeReportOrigin(selectCurrentServer(state));

  // 只信该账号的权威 server：权威已知（非空字符串）时，即使它的 origin 不合格
  // 也绝不退回 currentServer —— currentServer 可能指向另一个已配置节点，把 token
  // 送过去就是跨 authority 泄露。只有权威完全未知时才退回 currentServer，且仍须
  // 落在已配置集合内、通过 origin 安全判据。
  const authorityKnown =
    typeof authorityServer === "string" && authorityServer.trim().length > 0;
  const candidate = authorityKnown ? authorityOrigin : currentOrigin;
  if (!candidate) return null;
  if (!configuredOrigins.has(candidate)) return null;

  return { baseUrl: candidate, token: rawToken };
}

/**
 * 客户端去重身份必须与服务端幂等键同构（`toolErrorReportsHandler` 的
 * `idempotencyKeyOf` 是 `userId|dialogId|callId|toolName|errorClass`）：
 * 同一个 call 先后以不同 `errorClass` 失败是两条真实不同的失败，缺了
 * `errorClass` 会把第二条在客户端就悄悄丢掉。
 */
const dedupeKeyOf = (payload: ToolErrorReportPayload): string =>
  `${payload.dialogId}|${payload.callId}|${payload.toolName}|${payload.errorClass}`;

const rememberDedupeKey = (key: string): void => {
  dedupeKeys.set(key, true);
  while (dedupeKeys.size > MAX_DEDUPE_ENTRIES) {
    const oldest = dedupeKeys.keys().next();
    if (oldest.done) break;
    dedupeKeys.delete(oldest.value);
  }
};

/**
 * 发送一条上报。返回值表示「是否真的发送成功（2xx）」：绝不抛错、绝不重试、
 * 不读响应体（既不回显服务端文案，也避免无界 response.text()）。
 */
export async function reportToolError(args: {
  baseUrl: string;
  token: string;
  payload: ToolErrorReportPayload;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<boolean> {
  const key = dedupeKeyOf(args.payload);
  if (dedupeKeys.has(key)) return false;
  if (inflightReports >= MAX_INFLIGHT_REPORTS) return false;

  const baseUrl = resolveSafeReportOrigin(args.baseUrl);
  if (!baseUrl) return false;

  // OAuth 会话的网络边界闸门：必须在动去重键 / 并发槽**之前**判定，被拦下时既
  // 不发请求，也不把这条上报记成「已处理」而污染模块状态。非 OAuth 会话原样返回
  // 传入的 token；OAuth 会话跨源或没有浏览器同源时抛错 / 返回 undefined → 放弃。
  const requestUrl = `${baseUrl}${TOOL_ERROR_REPORT_PATH}`;
  let requestToken: string | undefined;
  try {
    requestToken = googleSessionRequestToken(args.token, requestUrl);
  } catch {
    return false;
  }
  if (!requestToken) return false;

  // 没有 AbortController 就无法给出有界取消：宁可少报，也不发无界请求。
  if (typeof AbortController !== "function") return false;

  const timeoutMs =
    typeof args.timeoutMs === "number" && args.timeoutMs > 0
      ? args.timeoutMs
      : REPORT_TIMEOUT_MS;

  rememberDedupeKey(key);
  inflightReports += 1;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch {
      // 忽略：abort 失败也只是让本次请求自然超时结束。
    }
  }, timeoutMs);

  try {
    const fetchImpl = args.fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
    if (!fetchImpl) return false;

    // 先按字节预算拟合 body：超限就在本地舍弃 stack / 缩减 message，绝不发一个
    // 必然被服务端 413 拒掉（因而完全丢弃）的载荷。
    const body = buildBoundedBody(pickAllowedFields(args.payload as Record<string, unknown>));
    if (!body) return false;

    const response = await fetchImpl(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requestToken}`,
      },
      body,
      // 不跟随重定向：避免把 Authorization 带到别处。
      redirect: "error",
      credentials: "omit",
      signal: controller.signal,
    });
    // 只认 response.ok，且有意不读响应体（不解析、不回显服务端错误文案）。
    return response?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    inflightReports -= 1;
  }
}

/** 浏览器判据：与仓库其它 web 专属分支同口径（window + document）。 */
const isBrowserRuntime = (): boolean =>
  typeof window !== "undefined" && typeof document !== "undefined";

/**
 * executeToolCall catch 的接线点：同步返回、不阻塞工具结果。
 * 任何内部失败（非浏览器、字段不全、缺认证、目标不可信、网络错误）都静默跳过。
 */
export function reportToolExecutionErrorInBackground(args: {
  thunkApi: any;
  dialogId?: string | null;
  callId?: string | null;
  toolName?: string | null;
  error: unknown;
}): void {
  try {
    if (!isBrowserRuntime()) return;
    const payload = buildToolErrorReportPayload(args);
    if (!payload) return;
    const target = resolveToolErrorReportTarget(args.thunkApi?.getState?.());
    if (!target) return;
    void reportToolError({ ...target, payload }).catch(() => {});
  } catch {
    // best-effort：上报永不改变工具结果，也不制造新的异常。
  }
}
