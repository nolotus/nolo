/**
 * diagnostics/normalizeError.ts — Error 统一规范化。
 *
 * 要求（plan Slice 1）：
 * - name + message + code + 有界 cause 链（深度/数量/长度上限）
 * - AggregateError 截断
 * - getter / Proxy / toJSON 副作用防护（任何读取都可能抛 → 全 try/catch）
 * - 循环检测
 * - 路径与 token 脱敏
 * - 永远单行输出（换行 → 空格转义），永不抛出
 */

const MAX_CAUSE_DEPTH = 4;
const MAX_AGGREGATE_ERRORS = 8;
const MAX_MESSAGE_LENGTH = 400;
const MAX_OUTPUT_LENGTH = 2000;

// —— 脱敏 ———————————————————————————————————————————————————————

/** Bearer / token 形态：长串 base64url/hex 视为 secret */
const SECRET_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\b(?:token|secret|password|passwd|apikey|api[_-]?key|authorization|auth)\s*[:=]\s*["']?[^\s"']{6,}/gi,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*\b/g, // JWT
  /\b[A-Fa-f0-9]{32,}\b/g, // 长 hex（session key / hash token）
  /\b(?:sk|pk|ak|xox[baprs]|ghp|gho|ghu|ghs|ghr|glpat|nolo)[-_][A-Za-z0-9_-]{8,}\b/g, // 常见 key 前缀
];

/**
 * 路径脱敏：home 目录与 NOLO_HOME 折叠为 ~ 前缀。
 * 诊断里保留相对结构便于排查，但去掉用户名。
 */
const PATH_PREFIXES: RegExp[] = [];

function initPathPrefixes(): void {
  try {
    const home = process.env.HOME ?? process.env.USERPROFILE;
    const noloHome = process.env.NOLO_HOME;
    if (noloHome && noloHome.length > 4) {
      PATH_PREFIXES.push(new RegExp(escapeRe(noloHome), "g"));
    }
    if (home && home.length > 4) {
      // 长的在前，先匹配 NOLO_HOME（通常在 home 下）
      PATH_PREFIXES.push(new RegExp(escapeRe(home), "g"));
    }
  } catch {
    /* env 读取失败也能继续 */
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

initPathPrefixes();

export function sanitizeText(input: unknown): string {
  let s: string;
  try {
    s = typeof input === "string" ? input : String(input);
  } catch {
    return "[unstringifiable]";
  }
  for (const re of SECRET_PATTERNS) {
    re.lastIndex = 0;
    s = s.replace(re, (m) => {
      // 保留 "key=" / "key:" / "Bearer " 前缀（若有），其余整体替换
      const sepIdx = m.search(/[:=\s]/);
      const head = sepIdx >= 0 && sepIdx < 12 ? m.slice(0, sepIdx + 1) : "";
      return `${head}[redacted]`;
    });
  }
  for (const re of PATH_PREFIXES) {
    re.lastIndex = 0;
    s = s.replace(re, "~");
  }
  // 单行：所有换行/回车/控制字符转义
  s = s.replace(/[\r\n]+/g, "⏎").replace(/[\u0000-\u001f\u007f-\u009f]/g, "");
  if (s.length > MAX_MESSAGE_LENGTH) {
    s = `${s.slice(0, MAX_MESSAGE_LENGTH)}…(+${s.length - MAX_MESSAGE_LENGTH}ch)`;
  }
  return s;
}

// —— 安全读取 ————————————————————————————————————————————————————

function safeGet(obj: unknown, key: string): unknown {
  try {
    if (obj === null || obj === undefined) return undefined;
    return (obj as Record<string, unknown>)[key];
  } catch {
    return `[throwing-getter:${key}]`;
  }
}

function safeString(v: unknown, maxLen = MAX_MESSAGE_LENGTH): string | undefined {
  if (v === undefined || v === null) return undefined;
  try {
    const s = typeof v === "string" ? v : String(v);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return "[unstringifiable]";
  }
}

// —— 主入口 ————————————————————————————————————————————————————

/**
 * normalizeError: 任意 thrown 值 → 单行诊断字符串，永不抛出。
 * 输出形如：
 *   TimeoutError: timed out after 5000ms (code=ETIMEDOUT) <- caused by <-
 *   AggregateError: 3 errors [first: X] <- caused by <- ...
 */
export function normalizeError(err: unknown): string {
  try {
    if (err === null) return "null";
    if (err === undefined) return "undefined";
    const seen = new Set<object>();
    const parts: string[] = [];
    let current: unknown = err;
    let depth = 0;

    while (current !== undefined && current !== null && depth < MAX_CAUSE_DEPTH) {
      if (typeof current === "object") {
        if (seen.has(current as object)) {
          parts.push("[circular-cause]");
          break;
        }
        seen.add(current as object);
      }
      const { text, cause } = describeOne(current, seen);
      parts.push(text);
      if (cause === undefined) break;
      current = cause;
      depth += 1;
    }
    if (depth >= MAX_CAUSE_DEPTH && current !== undefined && current !== null) {
      parts.push(`[cause-chain-truncated@depth=${MAX_CAUSE_DEPTH}]`);
    }

    let out = parts.join(" <-caused by<- ");
    if (out.length > MAX_OUTPUT_LENGTH) {
      out = `${out.slice(0, MAX_OUTPUT_LENGTH)}…[truncated]`;
    }
    return out || "[empty-error]";
  } catch (inner) {
    try {
      return `[normalizeError-failed: ${String(inner)}]`;
    } catch {
      return "[normalizeError-failed]";
    }
  }
}

function describeOne(
  v: unknown,
  seen: Set<object>,
): { text: string; cause: unknown } {
  if (v === null) return { text: "null", cause: undefined };
  if (v === undefined) return { text: "undefined", cause: undefined };
  const t = typeof v;
  if (t === "string") return { text: sanitizeText(v), cause: undefined };
  if (t === "number" || t === "boolean" || t === "bigint" || t === "symbol") {
    return { text: safeString(v) ?? String(t), cause: undefined };
  }
  if (t === "function") {
    return { text: `[function ${safeString(safeGet(v, "name"), 60) ?? "anonymous"}]`, cause: undefined };
  }

  // object / Proxy：所有读取都包 try
  const name =
    safeString(safeGet(v, "name"), 80) ??
    safeString(safeGet(v, "constructor") && safeGet(safeGet(v, "constructor"), "name"), 80);
  const message = safeString(safeGet(v, "message"));
  const code = safeString(safeGet(v, "code"), 60);
  const status = safeGet(v, "status") ?? safeGet(v, "statusCode");
  const cause = safeGet(v, "cause");

  let head: string;
  if (name && message) head = `${name}: ${message}`;
  else if (message) head = message;
  else if (name) head = name;
  else head = safeString(v, 160) ?? "[object-error]";

  head = sanitizeText(head);

  const extras: string[] = [];
  if (code) extras.push(`code=${sanitizeText(code)}`);
  if (typeof status === "number") extras.push(`status=${status}`);

  // AggregateError.errors — 有界截断，循环安全
  if (isAggregateErrorLike(v)) {
    const agg = describeAggregate(v, seen);
    if (agg) extras.push(agg);
  }

  const suffix = extras.length > 0 ? ` (${extras.join(", ")})` : "";
  return { text: `${head}${suffix}`, cause };
}

function isAggregateErrorLike(v: unknown): boolean {
  try {
    if (v instanceof AggregateError) return true;
  } catch {
    /* instanceof 对 Proxy 也可能抛 */
  }
  const name = safeGet(v, "name");
  const errors = safeGet(v, "errors");
  return name === "AggregateError" && Array.isArray(errors);
}

function describeAggregate(v: unknown, seen: Set<object>): string | undefined {
  const errors = safeGet(v, "errors");
  if (!Array.isArray(errors)) return undefined;
  const total = errors.length;
  const first: string[] = [];
  for (let i = 0; i < Math.min(total, MAX_AGGREGATE_ERRORS); i += 1) {
    const e = errors[i];
    if (e !== null && typeof e === "object" && seen.has(e as object)) {
      first.push("[circular]");
      continue;
    }
    // 单层 describe（不递归 cause，避免 aggregate×cause 爆炸）
    first.push(describeOne(e, seen).text);
  }
  const more = total > MAX_AGGREGATE_ERRORS ? `, +${total - MAX_AGGREGATE_ERRORS} more` : "";
  return `${total} aggregated [${first.join(" | ")}${more}]`;
}
