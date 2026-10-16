/**
 * packages/core/redactLogLines.ts
 *
 * 契约 §9 日志脱敏单一实现（双侧共用：worker 落盘前调用=卫生，server 读取侧
 * 调用=唯一契约保证点，§9.1）。纯函数、无 IO、无环境依赖。
 *
 * 禁入清单（§9.3，逐条写进 redactLogLines.test.ts）：
 * 1. token / 密钥 / 凭据（`Bearer <t>`、`ghp_*`、`token=`/`secret=`/`password=`、
 *    `NOLO_WORKER_TOKEN=` 这类 env 前缀名、`x-nolo-machine-lease` / `x-worker-token` 头）
 * 2. 绝对本地路径（`/home/...`、`/Users/...`、`C:\...`）与 `~/.nolo/...`
 * 3. `bunPath` / `process.execPath`（worker 环境变量）
 * 4. stage-start JSONL 的 `command` + `args`（§9.4；真实形态见
 *    `scripts/ci/verificationTask.ts` 的 `{type:"stage-start", ..., command, args}`）
 *
 * 把整个 token 捕进捕获组、命中后又原样输出（`<token>[REDACTED]`），等于没脱敏。
 * 因此本版所有规则都是 `RedactionRule { re, replacement }` 形态，替换串自带完整
 * 标记，捕获组只保留「可读的非密文上下文」（key 名 / 引号 / 前导分隔符）。
 */

import { isRecord } from "./isRecord";

/** `tailLines` 上限（§9.2）：超出即钳制，新增行为，非「逻辑不变」。 */
export const TAIL_LINES_MAX = 500;

export interface RemoteTaskLogTail {
  lines: string[];
  truncated: boolean;
  redacted: number;
  lastUpdatedAt: number;
}

export const REDACTED_TOKEN = "[REDACTED_TOKEN]";
export const REDACTED_CREDENTIAL = "[REDACTED_CREDENTIAL]";
export const REDACTED_COMMAND = "[REDACTED_COMMAND]";
export const REDACTED_ARGS = "[REDACTED_ARGS]";
export const REDACTED_PATH = "[REDACTED_PATH]";

interface RedactionRule {
  re: RegExp;
  /** 替换串。只允许引用非密文上下文组（key 名 / 引号 / 前导分隔符）。 */
  replacement: string;
}

// ── 禁入清单 1/3：token / 密钥 / 凭据 ────────────────────────────────────────
const SECRET_RULES: RedactionRule[] = [
  // Authorization: Bearer <token>
  {
    re: /\bBearer\s+[A-Za-z0-9_\-.\~+/=]{8,}/gi,
    replacement: `Bearer ${REDACTED_TOKEN}`,
  },
  // GitHub 家族前缀 token（ghp_/gho_/ghu_/ghs_/ghr_）
  {
    re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g,
    replacement: REDACTED_TOKEN,
  },
  // key=value / key: value。key 名自带凭据关键词才脱敏，避免把普通日志打花。
  // key 字符类含 `-`/`_`，故 `NOLO_WORKER_TOKEN=`（env 前缀）、
  // `x-nolo-machine-lease:`、`x-worker-token:` 都在命中面内。
  // 同时支持带闭合双/单引号的 JSON 键，如 {"apiKey":"..."} 或 {"token": "..."}。
  {
    re: /(["']?)\b([A-Za-z0-9_-]*(?:token|secret|password|passwd|credential|api[_-]?key|machine[_-]lease|workspace[_-]lease)[A-Za-z0-9_-]*)\1(\s*[:=]\s*)(["']?)[^\s"',;}{]{4,}\4/gi,
    replacement: `$1$2$1$3$4${REDACTED_CREDENTIAL}$4`,
  },
];

// ── 禁入清单 2/3：本地路径与 worker 环境变量 ────────────────────────────────
// 只认「明确的本地前缀」，不用通用 `/xxx/yyy` 形态：那会把 URL 路径
// （`https://host/api/x`）一起打碎，属于不可接受的误伤。
const PATH_RULES: RedactionRule[] = [
  {
    re: /(^|[\s"'`(=:])\/(?:home|Users|var|tmp|app|etc|root|usr|opt|mnt|srv|private|storage|workspace)\/[^\s"'`),;:]+/g,
    replacement: `$1${REDACTED_PATH}`,
  },
  {
    re: /(^|[\s"'`(=:])[A-Za-z]:\\[^\s"'`),;:]+/g,
    replacement: `$1${REDACTED_PATH}`,
  },
  // `~/.nolo` / `/home/x/.nolo`（凭据与机器身份落点）
  {
    re: /~?\/\.nolo(\/[^\s"'`),;:]*)?/g,
    replacement: REDACTED_PATH,
  },
  // process.execPath / bunPath / BUN_PATH
  {
    re: /\b((?:process\.execPath|bunPath|execPath|BUN_PATH)\s*[:=]\s*)(["']?)[^\s"']+\2/gi,
    replacement: `$1$2${REDACTED_PATH}$2`,
  },
];

/**
 * 禁入清单 4：stage-start JSONL 的 `command` + `args`（§9.4）。
 * 真实形态（`scripts/ci/verificationTask.ts`）：
 *   {"type":"stage-start","stage":"test","command":"bun","args":["run","test"]}
 * 兜底：任何同时含 `command` 与 `args` 的 JSON 行也按 stage-start 处理。
 */
function redactStageStartJson(line: string): { line: string; hit: boolean } {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return { line, hit: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { line, hit: false };
  }
  if (!isRecord(parsed)) return { line, hit: false };

  const isStageStart =
    parsed.type === "stage-start" ||
    parsed.event === "stage_start" ||
    parsed.phase === "stage_start" ||
    ("command" in parsed && "args" in parsed);
  if (!isStageStart) return { line, hit: false };

  let hits = 0;
  if ("command" in parsed) {
    parsed.command = REDACTED_COMMAND;
    hits += 1;
  }
  if ("args" in parsed) {
    parsed.args = [REDACTED_ARGS];
    hits += 1;
  }
  if (hits === 0) return { line, hit: false };

  return { line: JSON.stringify(parsed), hit: true };
}

function applyRules(line: string, rules: RedactionRule[]): { line: string; hit: boolean } {
  let out = line;
  let hit = false;
  for (const rule of rules) {
    rule.re.lastIndex = 0;
    if (!rule.re.test(out)) continue;
    rule.re.lastIndex = 0;
    out = out.replace(rule.re, rule.replacement);
    hit = true;
  }
  return { line: out, hit };
}

/** 单行脱敏。命中返回 `hit: true`（用于 `redacted` 计数）。 */
export function redactLogLine(rawLine: string): { line: string; hit: boolean } {
  if (typeof rawLine !== "string") return { line: "", hit: false };

  // 1. stage-start JSONL（结构化优先，避免 JSON 被正则打碎）
  const jsonCheck = redactStageStartJson(rawLine);
  let line = jsonCheck.hit ? jsonCheck.line : rawLine;
  let hit = jsonCheck.hit;

  // 2. 凭据 / token
  const secrets = applyRules(line, SECRET_RULES);
  line = secrets.line;
  hit = hit || secrets.hit;

  // 3. 绝对路径 / ~/.nolo / bunPath
  const paths = applyRules(line, PATH_RULES);
  line = paths.line;
  hit = hit || paths.hit;

  return { line, hit };
}

/**
 * 契约 §9 日志切片 + 脱敏（纯函数，保证点在读取侧）。
 *
 * - `tailLines` 钳制到 `[1, TAIL_LINES_MAX]`（§9.2）；未提供时取上限；
 * - `truncated` = 传入行数超过实际返回行数（切片发生）；
 * - `redacted` = 命中脱敏的行数（不是替换次数）。
 */
export function redactLogLines(
  lines: string[],
  options: {
    tailLines?: number;
    now?: number;
  } = {},
): RemoteTaskLogTail {
  const input = Array.isArray(lines) ? lines : [];
  const requested =
    options.tailLines !== undefined && Number.isFinite(options.tailLines) && options.tailLines > 0
      ? Math.floor(options.tailLines)
      : TAIL_LINES_MAX;
  const clampedTail = Math.min(Math.max(1, requested), TAIL_LINES_MAX);
  const truncated = input.length > clampedTail;

  const sliced = input.slice(-clampedTail);
  let redactedCount = 0;

  const redactedLines = sliced.map((raw) => {
    const { line, hit } = redactLogLine(typeof raw === "string" ? raw : String(raw));
    if (hit) redactedCount += 1;
    return line;
  });

  return {
    lines: redactedLines,
    truncated,
    redacted: redactedCount,
    lastUpdatedAt: options.now ?? Date.now(),
  };
}
