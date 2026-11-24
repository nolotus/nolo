import { traceRunWake } from "./runWakeDiagnostics";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { scrubSecrets } from "agent-runtime/secretScrubber";
import { sanitizeToolOutputText } from "agent-runtime/toolOutputSanitizer";
/**
 * run 终态唤醒观察器——「run 干完后对话自动继续」的检测半边。
 *
 * 它解决的问题：编排 agent 派发后台 run 后，run 到达终态的那一刻模型通常
 * 不在 turn 里，没有任何机制把「它干完了」送进对话——用户只能干等，或者
 * 模型在派发后反复查状态等结果（每次查状态在 transcript 印一张状态卡片，刷屏）。
 *
 * runRegistryPoller 每秒都在读 `~/.nolo/runs/<runId>.json` 喂 dock 面板，
 * 记录里就有终态。这个模块挂在 poller 的 `onRecordsPolled` 出口上，对每
 * tick 读到的记录做「活跃→终态」转变检测，把同一次 tick 里的所有转变合并
 * 成一条结构化 child completion 内部事件（批量派 10 个 review 同时结束不该刷 10 条），
 * 交给调用方/调度器投递。
 *
 * 取舍与规则：
 * - 每个 runId 至多唤醒一次（once-per-run）。
 * - 已经被 wait:true 消费或 marked ack 的 runId 绝不重复唤醒。
 * - 首次见到即终态的 run，只有 startedAt >= watcher 创建时刻才唤醒。
 * - dialog 切换时跳过并不污染状态，恢复当前 dialog 后可正确 drain 唤醒。
 * - ephemeral 或结果缺失的 run 明确标为无结果，不回读日志。
 */

import {
  isRunRecordClaimed,
  readRunRecord,
  resolveRunsDir,
  type AgentRunControlDeps,
  type RunRecord,
} from "../agentRunControl";
import { readTimestamp } from "../client/agentRunSnapshot";
import {
  clipText,
  formatRunAge,
  isAgentRunTerminalStatus,
  resolveRunLabel,
} from "../../ai/tools/agent/agentRunDisplayHelpers";
import { estimateTokenCount } from "../../ai/context/tokenUtils";
import {
  normalizeRunCompletionShape,
  type AgentRunCompletionShape,
  type ChildRunCompletedTurnEvent,
  type InternalTurnEvent,
} from "core/chat/internalTurnEvent";
export type { AgentRunCompletionShape };
import {
  buildCliNoticeText,
  resolveNoticeTitle,
  type CliNoticeTask,
} from "./completionNoticeDisplay";

/** 每条 run 的 note 摘要在唤醒消息里的截断长度。 */
const WAKE_NOTE_MAX_CHARS = 300;
/** `title` / `agent` 属性的展示上限（WAKE-004）：超长标题不得把骨架撑破总预算。 */
export const WAKE_TITLE_MAX_CHARS = 120;
export const WAKE_AGENT_MAX_CHARS = 80;

export function runDuration(
  record: RunRecord | AgentRunCompletionShape,
  nowMs: number = Date.now()
): string {
  return (
    formatRunAge(
      {
        startedAt: readTimestamp(record.startedAt as any),
        finishedAt: readTimestamp((record as any).endedAt ?? (record as any).finishedAt),
      },
      nowMs
    ) ?? ""
  );
}

export function isFailureStatus(status: unknown): boolean {
  return typeof status === "string" && status !== "done";
}

export function describeRun(
  record: RunRecord | AgentRunCompletionShape,
  nowMs: number = Date.now()
): string[] {
  const lines = [
    `runId: ${record.runId}`,
    // Machine label, not a display name: title stays out so the key keeps its
    // correlation value — the model greps agentKey across logs and tool args.
    `agent: ${resolveRunLabel({
      agentName: (record as any).agentName,
      agentKey: (record as any).agentKey,
      runId: record.runId,
    })}`,
    `status: ${record.status}`,
  ];
  // 正常完成的 run 不报 exitCode / 活动计数；只给完整结果的唯一读取入口。
  const verbose = isFailureStatus(record.status);
  if (verbose && typeof record.exitCode === "number") {
    lines.push(`exitCode: ${record.exitCode}`);
  }
  if (record.continuedFrom) lines.push(`continuedFrom: ${record.continuedFrom}`);
  if (record.resultFile) {
    lines.push(`resultFile: ${record.resultFile} (优先用 readFile lines:"1-60" 读头部结论，按需续读)`);
  } else {
    lines.push(`result: unavailable (no resultFile; do not read logs)`);
  }
  if (record.ephemeral) {
    lines.push(`ephemeral: true (no persisted child dialog)`);
  } else if (record.dialogId) {
    lines.push(`childDialogId: ${record.dialogId}`);
  } else {
    lines.push(`childDialogId: missing (result unpersisted)`);
  }
  const duration = runDuration(record, nowMs);
  if (duration) lines.push(`duration: ${duration}`);
  const recordError =
    "error" in record && typeof record.error === "string" ? record.error : undefined;
  const note =
    typeof record.note === "string"
      ? clipText(record.note, WAKE_NOTE_MAX_CHARS)
      : typeof recordError === "string"
      ? clipText(recordError, WAKE_NOTE_MAX_CHARS)
      : "";
  if (note) lines.push(`note: ${note}`);
  const counters = verbose ? record.activity?.counters : undefined;
  if (
    counters &&
    typeof counters.toolCalls === "number" &&
    typeof counters.llmCalls === "number" &&
    typeof counters.fileEdits === "number"
  ) {
    lines.push(
      `activity: ${counters.toolCalls} tool calls · ${counters.llmCalls} llm calls · ${counters.fileEdits} edits`
    );
  }
  return lines;
}

/** 失败 run 错误负载的单条 token 预算（plan：500 token 近似）。 */
export const WAKE_ERROR_PAYLOAD_TOKEN_BUDGET = 500;
/**
 * 失败 run 必须保住的最小错误诊断预算（token，WAKE-004）。
 *
 * 骨架把单条错误预算挤到这个值以下时，`error:` 已经没有信息量（0 预算是整行消失）。
 * 此时宁可省略尾部的成功 run，也不让失败诊断被成功条目挤没。
 */
export const WAKE_ERROR_MIN_PAYLOAD_TOKEN_BUDGET = 120;
/** 整条唤醒消息的 token 上限：多条失败时均摊，防失控日志刷爆上下文。 */
export const WAKE_TOTAL_TOKEN_BUDGET = 2000;

/** XML 属性转义（agent 名/runId 理论上可能带引号或尖括号）。 */
const escapeXmlAttribute = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * 按中文感知 token 估算把文本截断到预算内（二分前缀长度）。
 * 估算沿用 estimateContextTokens 的唯一实现 ai/context/tokenUtils。
 */
export function clipTextToTokenBudget(
  text: string,
  budgetTokens: number
): string {
  if (!text || budgetTokens <= 0) return "";
  if (estimateTokenCount(text) <= budgetTokens) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (estimateTokenCount(text.slice(0, mid)) <= budgetTokens) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return text.slice(0, lo);
}

/** 失败 run 的错误/备注负载，截断到给定 token 预算。 */
function failureErrorPayload(
  record: RunRecord | AgentRunCompletionShape,
  budgetTokens: number
): string {
  if (budgetTokens <= 0) return "";
  const recordError =
    "error" in record && typeof record.error === "string" ? record.error : undefined;
  const raw =
    typeof record.note === "string" && record.note.trim()
      ? record.note
      : typeof recordError === "string" && recordError.trim()
        ? recordError
        : "";
  // 先按字符粗剪封顶，避免超长输入拖慢二分。
  return clipTextToTokenBudget(clipText(raw, 2000), budgetTokens);
}

// —— 头部结论胶囊（wake 消息内联 <summary>） ——

/**
 * 单次只读文件开头的有界字节数。结果文件可能是几 MB 的完整报告，
 * 唤醒时机（每秒轮询的出口）绝不允许整文件 readFileSync 进内存。
 */
const RESULT_HEAD_MAX_BYTES = 16 * 1024;
/** 单条 run 内联正文的最大行数。 */
export const WAKE_SUMMARY_MAX_LINES = 25;
/** 单条 run 内联正文的字符硬上限。 */
export const WAKE_SUMMARY_MAX_CHARS = 1000;
/** 一批并发完成的总 summary 字符预算：按条数均摊，防止大批量完成撑爆主上下文。 */
export const WAKE_TOTAL_SUMMARY_CHAR_BUDGET = 2400;

/** 一条内联进 `<run>` 的头部结论胶囊。 */
export type WakeSummary = {
  /** 已剥离 front matter、已中和闭合标签的正文片段。 */
  text: string;
  /**
   * 内联正文在结果文件里的物理行区间（1-based，闭区间，含 front matter 偏移）。
   * 脱敏改变了换行数（多行凭据折叠、跨行控制串被删）时**省略**——绝不输出
   * 会误导 `readFile` 的错误行号（WAKE-007）。
   */
  startLine?: number;
  endLine?: number;
  /** 是否因行数 / 字符 / 文件长度上限被截断。 */
  truncated: boolean;
};

/** 结果文件名后缀：规范结果文件是 `<runsDir>/<runId>.result.md`。 */
export const RESULT_FILE_SUFFIX = ".result.md";

/** 内联胶囊读取的只读测试接缝（生产默认严格走规范 runs 目录）。 */
export type WakeSummaryReadOptions = {
  /** 受信任的结果文件父目录；缺省为该宿主规范 runs 目录。 */
  trustedResultDirs?: string[];
  /** 期待的 runId：给了就要求文件名严格等于 `${runId}.result.md`。 */
  runId?: string;
};

/** runId 必须是单段文件名，含路径分隔符 / `..` / NUL 一律拒绝。 */
function isSafeRunId(runId: string): boolean {
  if (!runId) return false;
  if (runId.includes("/") || runId.includes("\\") || runId.includes("\0")) return false;
  if (runId === "." || runId === ".." || runId.includes("..")) return false;
  return true;
}

/** 目录规范化：能 realpath 就 realpath（消掉符号链接与 `..`），否则退回 resolve。 */
function canonicalDir(dir: string): string {
  try {
    return realpathSync(dir);
  } catch {
    return resolve(dir);
  }
}

/** `path` 的规范父目录是否落在 `dir` 内（同一目录或子目录）。 */
function isUnderTrustedDir(path: string, dir: string): boolean {
  const parent = canonicalDir(dirname(path));
  const root = canonicalDir(dir);
  return parent === root || parent.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
}

/** 生产默认受信任目录：该宿主规范 runs 目录（跟随进程 env 的 NOLO_HOME）。 */
function resolveTrustedResultDirs(explicit?: string[]): string[] {
  if (Array.isArray(explicit) && explicit.length > 0) return explicit;
  return [resolveRunsDir(process.env)];
}

/**
 * 结果文件身份校验（WAKE-003）：文件名必须属于该 run，父目录必须在受信任
 * runs 目录内。任何一项不成立都返回 null，调用方退回 `<run … />`。
 */
function resolveTrustedResultPath(
  resultFile: string,
  options: WakeSummaryReadOptions = {}
): string | null {
  const raw = typeof resultFile === "string" ? resultFile.trim() : "";
  if (!raw) return null;
  if (options.runId !== undefined) {
    if (!isSafeRunId(options.runId)) return null;
    if (basename(raw) !== `${options.runId}${RESULT_FILE_SUFFIX}`) return null;
  }
  const dirs = resolveTrustedResultDirs(options.trustedResultDirs);
  const trusted = dirs.some(
    (dir) => typeof dir === "string" && dir.length > 0 && isUnderTrustedDir(raw, dir)
  );
  if (!trusted) return null;
  return raw;
}

/**
 * 剥掉末尾可能被 16 KiB 窗口切断的不完整 UTF-8 多字节序列。
 *
 * 窗口按字节截断，最后一个码点可能只读到首字节或部分续字节；直接
 * `toString("utf8")` 会把它变成 U+FFFD 并污染正文首行结论。
 */
function trimIncompleteUtf8Tail(buf: Buffer): Buffer {
  if (buf.length === 0) return buf;
  let start = buf.length - 1;
  while (start >= 0 && (buf[start]! & 0xc0) === 0x80) start -= 1;
  if (start < 0) return buf;
  const lead = buf[start]!;
  let need = 1;
  if (lead < 0x80) need = 1;
  else if ((lead & 0xe0) === 0xc0) need = 2;
  else if ((lead & 0xf0) === 0xe0) need = 3;
  else if ((lead & 0xf8) === 0xf0) need = 4;
  const have = buf.length - start;
  if (have >= need) return buf;
  return buf.subarray(0, start);
}

/**
 * 有界读取文件开头；任何异常（不存在 / 无权限 / 目录 / 符号链接 / FIFO / 空文件）返回 null。
 *
 * 打开方式遵 WAKE-003：O_NOFOLLOW 拒绝符号链接，O_NONBLOCK 让 FIFO 不阻塞
 * open，随后 fstat 必须是普通文件。fd 全程 try/finally 关闭。
 */
function readResultFileHead(
  path: string,
  maxBytes: number = RESULT_HEAD_MAX_BYTES
): { head: string; bytesRead: number; bytesTotal: number } | null {
  let fd: number | null = null;
  try {
    // 便携兜底：O_NOFOLLOW 在部分平台（win32）缺失，此时用 lstat 显式拒绝链接。
    const flags =
      fsConstants.O_RDONLY |
      (fsConstants.O_NOFOLLOW ?? 0) |
      (fsConstants.O_NONBLOCK ?? 0);
    if (!fsConstants.O_NOFOLLOW) {
      let lst: ReturnType<typeof lstatSync>;
      try {
        lst = lstatSync(path);
      } catch {
        return null;
      }
      if (!lst.isFile()) return null;
    }
    fd = openSync(path, flags);
    const stat = fstatSync(fd);
    if (!stat.isFile()) return null;
    const want = Math.min(stat.size, maxBytes);
    if (want <= 0) return null;
    const buf = Buffer.alloc(want);
    let read = 0;
    while (read < want) {
      const n = readSync(fd, buf, read, want - read, read);
      if (n <= 0) break;
      read += n;
    }
    if (read <= 0) return null;
    const sliced = buf.subarray(0, read);
    // 命中字节上限时末尾可能落在多字节字符中间，先剥掉不完整尾序列。
    const safe = stat.size > read ? trimIncompleteUtf8Tail(sliced) : sliced;
    return {
      head: safe.toString("utf8"),
      bytesRead: safe.length,
      bytesTotal: stat.size,
    };
  } catch {
    // fail-open：读不到就当没有胶囊，保持旧输出格式。
    return null;
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {}
    }
  }
}

/**
 * 剥离首部 YAML front matter（`---\n…\n---\n`，兼容 CRLF）。
 * 规则与 agent-runtime/runResultReadProjection 一致：只认文件第一行起的区块。
 * 未闭合时原样返回，由调用方按 WAKE-005 放弃内联。
 */
export function stripLeadingFrontMatter(text: string): string {
  const open = /^---\r?\n/.exec(text);
  if (!open) return text;
  const rest = text.slice(open[0].length);
  const immediate = /^---\r?\n/.exec(rest);
  if (immediate) return rest.slice(immediate[0].length);
  const close = /\r?\n---\r?\n/.exec(rest);
  if (!close) return text;
  return rest.slice(close.index + close[0].length);
}

/**
 * 窗口内是否有「开头 front matter 但读不到闭合 `---` 行」（WAKE-005）。
 *
 * 16 KiB 窗口被超长 `acceptance` 撑满时，闭合分隔符落在窗口外；此时窗口内容
 * 是 YAML 机器头而不是正文，内联它会把 schemaVersion / acceptance 灌进上下文。
 */
export function hasUnclosedFrontMatter(text: string): boolean {
  const open = /^---\r?\n/.exec(text);
  if (!open) return false;
  const rest = text.slice(open[0].length);
  if (/^---\r?\n/.test(rest)) return false;
  return !/\r?\n---\r?(\n|$)/.test(rest);
}

/**
 * XML 文本转义：正文里任何裸 `<` / `>` / `&` 都会破坏外层标记结构，
 * 甚至让正文中的 `<run … />` 被解析成伪造任务（WAKE-001）。
 */
export function escapeXmlText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 单个 PEM 边界标记（BEGIN / END 各算一个）。 */
const PEM_PRIVATE_KEY_MARKER =
  /-----(BEGIN|END) (?:[A-Z0-9 ]+)?PRIVATE KEY-----/g;
/** 多行私钥块脱敏后占用的单行占位符（与 scrubSecrets 的 placeholder 一致）。 */
export const REDACTED_PRIVATE_KEY = "[REDACTED:PRIVATE_KEY]";

/**
 * 窗口内是否有「配不成对」的 PEM 私钥边界标记（WAKE-002）。
 *
 * 16 KiB 窗口可能把私钥块的闭合 `-----END … PRIVATE KEY-----` 切在窗口外：
 * 此时 scrubSecrets 的整块正则匹配不上，私钥正文就会被原样内联进上下文。
 * 未闭合的 `BEGIN` 或孤立的 `END` 都说明窗口里的私钥块不完整 → 整条胶囊
 * 放弃内联，调用方退回 `<run … />` 让模型按需用 readFile 读。
 */
export function hasUnpairedPrivateKeyMarker(text: string): boolean {
  if (typeof text !== "string" || !text.includes("PRIVATE KEY")) return false;
  let open = 0;
  for (const marker of text.matchAll(PEM_PRIVATE_KEY_MARKER)) {
    if (marker[1] === "BEGIN") open += 1;
    else if (open === 0) return true; // 孤立 END：它的 BEGIN 在窗口之外
    else open -= 1;
  }
  return open > 0;
}

/** 尾随单个换行不算一行正文（25 行带结尾换行不该算成第 26 行）。 */
function trimTrailingNewline(text: string): string {
  return text.replace(/(?:\r?\n)$/, "");
}

/** 归一化换行（CRLF → LF）：控制序列清洗会删掉裸 `\r`，计数前两边必须同形。 */
function normalizeNewlines(text: string): string {
  return text.includes("\r") ? text.replace(/\r\n/g, "\n") : text;
}

/** 换行符个数（= 物理行数 - 1）。 */
function newlineCount(text: string): number {
  let count = 0;
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) count += 1;
  return count;
}

/** 正文脱敏结果：渲染行 + 物理行号是否仍与源文件 1:1。 */
type ScrubbedWakeBody = {
  lines: string[];
  /** false = 脱敏改变了换行数，调用方必须省略 `lines` 属性（WAKE-007）。 */
  lineAligned: boolean;
};

/**
 * 正文脱敏（WAKE-002 / WAKE-007）：清洗控制序列 → PEM 配对检查 → 标准整段脱敏。
 *
 * 全部复用既有整段实现，**不做任何行级重写**：跨行 `Bearer` / `PASSWORD=`、
 * 共用边界行的相邻两个 PEM 块、带 ANSI 的颜色码标记，都由 `scrubSecrets`
 * 在一次整段替换里正确处理；行级拼接重实现恰恰是 WAKE-002 泄露的根因。
 */
function scrubWakeBody(body: string): ScrubbedWakeBody | null {
  const sanitized = trimTrailingNewline(sanitizeToolOutputText(body));
  // 窗口内 PEM 块不完整（END 在 16 KiB 之外）时脱敏必然漏 → 整条胶囊放弃内联。
  if (hasUnpairedPrivateKeyMarker(sanitized)) return null;
  const scrubbed = scrubSecrets(sanitized).cleaned;
  return {
    lines: scrubbed.split("\n"),
    // 99.9% 的报告换行数不变 → 物理行 1:1，行号可信；折叠/跨行控制串被删就没法保证。
    lineAligned:
      newlineCount(normalizeNewlines(trimTrailingNewline(body))) ===
      newlineCount(scrubbed),
  };
}

/** 一个码点在转义后的渲染长度：`&`→`&amp;`(5)、`<`/`>`(4)、其余按 UTF-16 长度。 */
function escapedCharCost(ch: string): number {
  if (ch === "&") return "&amp;".length;
  if (ch === "<" || ch === ">") return "&lt;".length;
  return ch.length;
}

/**
 * 按「转义后的最终渲染长度」截断到预算内（WAKE-004 / WAKE-007）。
 *
 * 逐码点累加，天然停在完整 Unicode 码点边界上（不会劈开 surrogate pair），
 * 也不会把 `&amp;` 之类的实体切成半个。
 */
function cutToEscapedBudget(
  text: string,
  budget: number
): { text: string; truncated: boolean } {
  if (budget <= 0) return { text: "", truncated: text.length > 0 };
  let used = 0;
  let i = 0;
  while (i < text.length) {
    const cp = text.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const cost = escapedCharCost(ch);
    if (used + cost > budget) return { text: text.slice(0, i), truncated: true };
    used += cost;
    i += ch.length;
  }
  return { text, truncated: false };
}

/**
 * 从结果文件提取头部结论胶囊。
 *
 * fail-open 契约：文件不存在 / 读取抛错 / front matter 后无正文 / front matter
 * 在窗口内未闭合时返回 null，调用方因此产出与旧版完全一致的 `<run … />`。
 *
 * 处理顺序（不可交换）：
 * 1. 身份与路径校验（WAKE-003）；
 * 2. 有界读取 16 KiB + 剥掉被切断的 UTF-8 尾序列（WAKE-007）；
 * 3. front matter 未闭合则放弃内联（WAKE-005）；窗口内 PEM 私钥边界配不成对
 *    也放弃内联（WAKE-002：END 在窗口外时脱敏必然漏）；
 * 4. 先脱敏再截断（WAKE-002），预算按脱敏 + 转义后的最终渲染文本计算（WAKE-004），
 *    行号只在脱敏没改变换行数时才标（WAKE-007，否则省略 `lines` 免误导 `readFile`）；
 * 5. 全量 XML 文本转义（WAKE-001）。
 */
export function extractWakeSummary(
  resultFile: string,
  maxChars: number = WAKE_SUMMARY_MAX_CHARS,
  options: WakeSummaryReadOptions = {}
): WakeSummary | null {
  if (typeof resultFile !== "string" || !resultFile.trim() || maxChars <= 0) {
    return null;
  }
  const trustedPath = resolveTrustedResultPath(resultFile, options);
  if (!trustedPath) return null;
  const read = readResultFileHead(trustedPath);
  if (!read) return null;
  if (hasUnclosedFrontMatter(read.head)) return null;
  // WAKE-002：窗口内私钥块不完整（END 在 16 KiB 之外）时不脱敏就必然漏，
  // 直接放弃内联，退回 `<run … />`。
  if (hasUnpairedPrivateKeyMarker(read.head)) return null;

  const body = stripLeadingFrontMatter(read.head);
  const frontMatterChars = read.head.length - body.length;
  // front matter 占用的物理行数（"---\nA\n---\n" → 3 行）。
  const frontMatterLines = frontMatterChars > 0
    ? read.head.slice(0, frontMatterChars).split("\n").length - 1
    : 0;

  // 脱敏必须先于任何截断：跨边界的凭据被切断后就匹配不上模式了。
  // 窗口内 PEM 边界配不成对（含被 ANSI 颜色码包裹的标记）→ null，退回 `<run … />`。
  const sourceLines = scrubWakeBody(body);
  if (!sourceLines) return null;
  const lines = sourceLines.lines;
  let start = 0;
  while (start < lines.length && lines[start]!.trim() === "") start++;
  if (start >= lines.length) return null;

  const lineLimited = lines.length - start > WAKE_SUMMARY_MAX_LINES;
  const picked = lines.slice(start, start + WAKE_SUMMARY_MAX_LINES);
  while (picked.length > 1 && picked[picked.length - 1]!.trim() === "") picked.pop();
  const joined = picked.join("\n").replace(/\s+$/, "");
  if (!joined.trim()) return null;

  // 预算约束的是最终渲染文本：截断与行号都基于这一份。
  const cut = cutToEscapedBudget(joined, maxChars);
  const finalText = cut.text.replace(/\s+$/, "");
  if (!finalText.trim()) return null;

  // 只保留了几行就取第几行；物理行号只有在换行数没被脱敏改变时才敢标（WAKE-007）。
  const retainedLines = Math.min(finalText.split("\n").length, picked.length);
  const firstSourceLine = frontMatterLines + 1 + start;
  return {
    text: escapeXmlText(finalText),
    ...(sourceLines.lineAligned
      ? { startLine: firstSourceLine, endLine: firstSourceLine + retainedLines - 1 }
      : {}),
    truncated: lineLimited || cut.truncated || read.bytesTotal > read.bytesRead,
  };
}

function renderSummaryBlock(summary: WakeSummary): string {
  // 物理行号可信才渲染 `lines`：脱敏折叠了行数时省略，避免把 `readFile` 指到错行。
  const linesAttr =
    typeof summary.startLine === "number" && typeof summary.endLine === "number"
      ? ` lines="${summary.startLine}-${summary.endLine}"`
      : "";
  return [
    `<summary${linesAttr} truncated="${summary.truncated ? "true" : "false"}">`,
    summary.text,
    `</summary>`,
  ].join("\n");
}

/** 单条摘要的最小可用长度：低于此值的摘要没有信息量，整批省略。 */
export const WAKE_SUMMARY_MIN_CHARS = 24;

/**
 * 为本批终态规划内联胶囊：只对非失败终态、且 resultFile 真实可读的 run 提取。
 *
 * 预算两层收敛（WAKE-004）：单条 ≤ WAKE_SUMMARY_MAX_CHARS，批次总量
 * ≤ 调用方给的 totalCharBudget（默认 WAKE_TOTAL_SUMMARY_CHAR_BUDGET），
 * 都按「转义后的最终渲染文本」计。剩余预算不足一条最小摘要时整批省略，
 * 绝不让摘要挤掉失败 run 的错误诊断。
 */
export function planWakeSummaries(
  runs: (RunRecord | AgentRunCompletionShape)[],
  readSummary: (
    resultFile: string,
    maxChars: number,
    options?: WakeSummaryReadOptions
  ) => WakeSummary | null = extractWakeSummary,
  options: { totalCharBudget?: number; trustedResultDirs?: string[] } = {}
): Map<string, WakeSummary> {
  const out = new Map<string, WakeSummary>();
  const eligible = runs.filter(
    (r) => !isFailureStatus(r.status) && typeof r.resultFile === "string" && r.resultFile.trim()
  );
  if (!eligible.length) return out;
  const totalBudget = Math.max(
    0,
    options.totalCharBudget ?? WAKE_TOTAL_SUMMARY_CHAR_BUDGET
  );
  const perRunChars = Math.min(
    WAKE_SUMMARY_MAX_CHARS,
    Math.floor(totalBudget / eligible.length)
  );
  if (perRunChars < WAKE_SUMMARY_MIN_CHARS) return out;
  for (const r of eligible) {
    try {
      const summary = readSummary(r.resultFile!.trim(), perRunChars, {
        runId: r.runId,
        trustedResultDirs: options.trustedResultDirs,
      });
      if (summary && summary.text.trim()) out.set(r.runId, summary);
    } catch {
      // 任何提取异常都退回旧格式，不阻塞唤醒。
    }
  }
  return out;
}

function buildRunElement(
  record: RunRecord | AgentRunCompletionShape,
  nowMs: number,
  errorBudgetTokens: number,
  summary?: WakeSummary | null
): string {
  const attrs = [
    `runId="${escapeXmlAttribute(String(record.runId))}"`,
    // Same rule as describeRun: this attribute is parsed by the model, so the
    // label keeps the agentKey correlation — title never substitutes for it.
    `agent="${escapeXmlAttribute(
      clipText(
        resolveRunLabel({
          agentName: (record as any).agentName,
          agentKey: (record as any).agentKey,
          runId: record.runId,
        }),
        WAKE_AGENT_MAX_CHARS
      )
    )}"`,
    `status="${escapeXmlAttribute(String(record.status))}"`,
  ];
  // 完整任务标题（展示用）：通知模型文本新增字段——解析端按 title 优先取
  // 真实任务标题，agent 属性仍保留 agentKey 关联，两者不互相替代。
  // 旧数据没有该属性时按缺省处理（legacy 兼容）。
  // WAKE-004：标题在这里做有界投影（`clipText` 折叠空白 + 硬截断），
  // 否则 3 条 800 字符中文标题的骨架就能吃掉 3975 token，突破总预算。
  const rawTitle = (record as { title?: unknown }).title;
  if (typeof rawTitle === "string" && rawTitle.trim()) {
    attrs.push(
      `title="${escapeXmlAttribute(clipText(rawTitle.trim(), WAKE_TITLE_MAX_CHARS))}"`
    );
  }
  if (record.continuedFrom) attrs.push(`continuedFrom="${escapeXmlAttribute(record.continuedFrom)}"`);
  const verbose = isFailureStatus(record.status);
  if (verbose && typeof record.exitCode === "number") {
    attrs.push(`exitCode="${record.exitCode}"`);
  }
  // 本地缺失 resultFile 表示无结论；childDialogId 仅作为实际存在的远端证据入口。
  if (record.resultFile) {
    attrs.push(`resultFile="${escapeXmlAttribute(record.resultFile)}"`);
  } else {
    attrs.push(`result="unavailable"`);
  }
  if (record.ephemeral) {
    attrs.push(`ephemeral="true"`);
  } else if (record.dialogId) {
    attrs.push(`childDialogId="${escapeXmlAttribute(record.dialogId)}"`);
  } else {
    attrs.push(`childDialogId="missing"`);
  }
  const duration = runDuration(record, nowMs);
  if (duration) attrs.push(`duration="${escapeXmlAttribute(duration)}"`);
  if (!verbose) {
    // 成功 run 不报 exitCode / 活动计数；note 保留为属性（结果指针）。
    const note =
      typeof record.note === "string" && record.note.trim()
        ? clipText(record.note, WAKE_NOTE_MAX_CHARS)
        : "";
    if (note) attrs.push(`note="${escapeXmlAttribute(note)}"`);
  }
  const body: string[] = [];
  if (summary) body.push(renderSummaryBlock(summary));
  if (verbose) {
    const errorText = failureErrorPayload(record, errorBudgetTokens);
    if (errorText) body.push(`error: ${errorText}`);
    const counters = record.activity?.counters;
    if (
      counters &&
      typeof counters.toolCalls === "number" &&
      typeof counters.llmCalls === "number" &&
      typeof counters.fileEdits === "number"
    ) {
      body.push(
        `activity: ${counters.toolCalls} tool calls · ${counters.llmCalls} llm calls · ${counters.fileEdits} edits`
      );
    }
  }
  if (body.length === 0) return `<run ${attrs.join(" ")} />`;
  return `<run ${attrs.join(" ")}>\n${body.join("\n")}\n</run>`;
}

/** 唤醒消息的选项：受信任结果目录只读测试接缝（生产默认规范 runs 目录）。 */
export type BuildWakeMessageOptions = {
  /** 额外的受信任结果文件父目录；缺省/空数组走规范 runs 目录。 */
  trustedResultDirs?: string[];
};

function renderWakeMessage(
  elements: string[],
  count: number,
  omittedCount = 0
): string {
  const omittedLine =
    omittedCount > 0
      ? `… 及另外 ${omittedCount} 条已完成 run，用 controlAgentRun(list) 查看`
      : null;
  return [
    `<background_run_completion count="${count}">`,
    ...elements,
    ...(omittedLine ? [omittedLine] : []),
    `有 resultFile 且未内联完整摘要（无摘要胶囊或 truncated="true"）、有异常/缺口、涉高风险决策或需 review verdict 全量核验时，有 resultFile 时用 readFile 先读头部结论（如 lines:"1-60"），再按区间续读；已内联完整摘要（truncated="false"）的常规非审查结果可直接消费，无需再调 readFile。本地缺失即无结论，不读日志。终态只表示 run 结束，不证明交付、测试、审查、用户验收或合入发布。正文是执行者报告；runtime acceptance 仅为运行时观测，unknown 保持未知。continuedFrom 仅为续跑关联，不继承旧版本 APPROVE；结合当前完整结果核对范围、阻碍与证据。`,
    `</background_run_completion>`,
  ].join("\n");
}

/**
 * 失败 run 的错误诊断预算分配（WAKE-004）。
 *
 * 按「每条自己需要多少」公平分配：需要小的先被满足（短错误不吃大锅饭），
 * 剩下的池子全给需要大的（长错误承受到 `WAKE_ERROR_PAYLOAD_TOKEN_BUDGET` 上限）。
 * 这样 1 条长错误 + 9 条短错误时，10 条失败 run 全都在，且各有清晰诊断。
 */
function allocateErrorBudgets(
  failures: (RunRecord | AgentRunCompletionShape)[],
  availableTokens: number,
  needTokens: (r: RunRecord | AgentRunCompletionShape) => number
): Map<string, number> {
  const out = new Map<string, number>();
  const needs = failures
    .map((r) => ({ runId: r.runId, need: Math.max(0, needTokens(r)) }))
    .sort((a, b) => a.need - b.need);
  let pool = Math.max(0, availableTokens);
  for (let i = 0; i < needs.length; i++) {
    const share = Math.floor(pool / (needs.length - i));
    const granted = Math.min(needs[i]!.need, share);
    out.set(needs[i]!.runId, granted);
    pool -= granted;
  }
  return out;
}

/**
 * 送进模型的 wake 摘要：ContextualFragment 标记格式（识别契约见
 * chat/messages/contextualFragment.ts）。旧版尾部那段自辩教学文案已删——
 * 处理纪律在 system prompt「多 Agent 编排」段，标记内只留一行取日志提示。
 */
export function buildWakeMessage(
  finished: (RunRecord | AgentRunCompletionShape)[],
  nowMs: number = Date.now(),
  options: BuildWakeMessageOptions = {}
): string {
  const ordered = [
    ...finished.filter((r) => isFailureStatus(r.status)),
    ...finished.filter((r) => !isFailureStatus(r.status)),
  ];

  /**
   * 渲染一批 run；超出总预算时返回 null（由调用方决定丢哪条）。
   *
   * 预算两阶段（WAKE-004）：失败诊断先按「每条实际需要」公平分配（短错误只拿
   * 自己那份，剩余池给长错误截断到上限），再用剩下来的预算按原顺序给成功 run
   * 的 `<summary>` 胶囊。单条长诊断绝不充当所有失败 run 的共同门槛；纯失败批次
   * （没有成功 run 可省）不做诊断下限淘汰，只按骨架容量决定保留几条。
   */
  const attempt = (
    subset: (RunRecord | AgentRunCompletionShape)[],
    omittedCount: number
  ): string | null => {
    /** 单条失败 run 的错误诊断所需 token（有界，最多 WAKE_ERROR_PAYLOAD_TOKEN_BUDGET）。 */
    const errorNeed = (r: RunRecord | AgentRunCompletionShape): number =>
      Math.min(
        WAKE_ERROR_PAYLOAD_TOKEN_BUDGET,
        estimateTokenCount(failureErrorPayload(r, WAKE_ERROR_PAYLOAD_TOKEN_BUDGET)) + 1
      );

    const render = (
      errorBudgets: Map<string, number>,
      summaries: Map<string, WakeSummary>
    ): string =>
      renderWakeMessage(
        subset.map((r) =>
          buildRunElement(
            r,
            nowMs,
            isFailureStatus(r.status) ? (errorBudgets.get(r.runId) ?? 0) : 0,
            summaries.get(r.runId) ?? null
          )
        ),
        finished.length,
        omittedCount
      );

    // 第 1 步：量零负载骨架（无 error、无摘要），据此把预算分给失败诊断。
    const bareTokens = estimateTokenCount(render(new Map(), new Map()));
    if (bareTokens > WAKE_TOTAL_TOKEN_BUDGET) return null;
    const failures = subset.filter((r) => isFailureStatus(r.status));
    const errorBudgets = allocateErrorBudgets(
      failures,
      WAKE_TOTAL_TOKEN_BUDGET - bareTokens,
      errorNeed
    );
    // 骨架 + 最小诊断都装不下（1 条失败 + 9 条成功的骨架 ~1995 就是这种）：
    // 返回 null，让调用方按「先保诊断」丢掉尾部的成功 run，绝不让 `error:` 归零。
    //
    // 这个门槛只在「本批还有成功 run 可省」时成立：一旦进入纯失败回退
    // （includedSuccessCount === 0），删掉尾部失败 run 换不到任何诊断改善——
    // 省的只是另一条失败 run。此时只要求每条失败都留得下非空诊断，长短由
    // allocateErrorBudgets 的 water-filling 决定（短诊断先保住，长诊断按余量
    // 有界截断），绝不因单条长诊断未达下限就整条丢弃尾部失败 run。
    const includedSuccessCount = subset.length - failures.length;
    for (const r of failures) {
      const granted = errorBudgets.get(r.runId) ?? 0;
      if (includedSuccessCount > 0) {
        const floor = Math.min(errorNeed(r), WAKE_ERROR_MIN_PAYLOAD_TOKEN_BUDGET);
        if (granted < floor) return null;
      } else if (granted <= 0) {
        // 纯失败批次：连一行的诊断空间都没有，说明这一版子集装不下，交给调用方收缩。
        return null;
      }
    }

    // 第 2 步：失败诊断先占预算——先把含 error 的消息渲染出来量占用，
    // 剩余 token 才轮到成功 run 的摘要（WAKE-004：摘要绝不允许挤掉诊断）。
    let withErrors = render(errorBudgets, new Map());
    let withErrorsTokens = estimateTokenCount(withErrors);
    // 纯失败批次：water-filling 会把剩余池全给最长的诊断，加上 `error: ` 前缀与
    // 换行的渲染开销后可能刚好越界。此时从「预算最大的那条」逐轮回收集超出量，
    // 而不是返回 null 去删掉整条失败 run（WAKE-004：长诊断先变短，run 不许消失）。
    if (includedSuccessCount === 0) {
      for (let round = 0; round < 6 && withErrorsTokens > WAKE_TOTAL_TOKEN_BUDGET; round++) {
        const excess = withErrorsTokens - WAKE_TOTAL_TOKEN_BUDGET;
        let victim: (RunRecord | AgentRunCompletionShape) | null = null;
        for (const r of failures) {
          if (!victim || (errorBudgets.get(r.runId) ?? 0) > (errorBudgets.get(victim.runId) ?? 0)) {
            victim = r;
          }
        }
        const current = victim ? (errorBudgets.get(victim.runId) ?? 0) : 0;
        if (!victim || current <= 0) break;
        errorBudgets.set(victim.runId, Math.max(0, current - Math.max(1, excess + 2)));
        withErrors = render(errorBudgets, new Map());
        withErrorsTokens = estimateTokenCount(withErrors);
      }
    }
    if (withErrorsTokens > WAKE_TOTAL_TOKEN_BUDGET) return null;
    let summaryCharBudget = Math.min(
      WAKE_TOTAL_SUMMARY_CHAR_BUDGET,
      // 最坏情况 1.5 token/字符（中文），据此把剩余 token 折成摘要字符预算。
      Math.floor(Math.max(0, WAKE_TOTAL_TOKEN_BUDGET - withErrorsTokens) / 1.5)
    );

    // 第 3 步：摘要按剩余预算分配；万一整条消息仍超总预算就逐步缩减直至省略。
    let message = withErrors;
    for (let round = 0; round < 8; round++) {
      const summaries =
        summaryCharBudget >= WAKE_SUMMARY_MIN_CHARS
          ? planWakeSummaries(subset, extractWakeSummary, {
              totalCharBudget: summaryCharBudget,
              trustedResultDirs: options.trustedResultDirs,
            })
          : new Map<string, WakeSummary>();
      message = render(errorBudgets, summaries);
      if (summaries.size === 0) break;
      if (estimateTokenCount(message) <= WAKE_TOTAL_TOKEN_BUDGET) break;
      summaryCharBudget = Math.floor(summaryCharBudget / 2);
      if (summaryCharBudget < WAKE_SUMMARY_MIN_CHARS) {
        summaryCharBudget = 0;
      }
    }
    return estimateTokenCount(message) <= WAKE_TOTAL_TOKEN_BUDGET ? message : null;
  };

  // 原始顺序能装下就原样输出（不因预算逻辑改动既有消息顺序）。
  const direct = attempt(finished, 0);
  if (direct) return direct;

  // 装不下：按「先保失败诊断、再按原顺序保成功 run」截断，末尾用一行提示
  // 剩余条数——安全声明与失败诊断都不许被骨架挤没（WAKE-004）。
  for (let keep = ordered.length - 1; keep >= 0; keep--) {
    const trimmed = attempt(ordered.slice(0, keep), ordered.length - keep);
    if (trimmed) return trimmed;
  }
  return renderWakeMessage([], finished.length, ordered.length);
}

/**
 * 屏幕上那段通知（不再是原始字段）。
 *
 * 完整摘要只进模型上下文，屏幕上给的是这一段：多任务时一行组标题 +
 * 每个任务一行，标题取完整 title，耗时与退出码是次要信息。文案与图标
 * 由 completionNoticeDisplay（共享展示模型）给出。
 *
 * 纯展示 helper 的实现在 completionNoticeDisplay.ts：那里不 import 控制 /
 * 存储链，client 侧也能用同一份措辞。
 */
export function buildWakeDisplayText(
  finished: (RunRecord | AgentRunCompletionShape)[],
  nowMs: number = Date.now()
): string {
  const tasks: CliNoticeTask[] = finished.map((record) => ({
    title: resolveNoticeTitle({
      runId: record.runId,
      agentKey: (record as any).agentKey,
      agentName: (record as any).agentName,
      title: (record as any).title,
    }),
    status: String(record.status),
    duration: runDuration(record, nowMs),
  }));
  return buildCliNoticeText(tasks);
}

// 兼容再导出：这些 helper 上一轮在 watcher 上，调用方保持不变。
export {
  buildCliNoticeText,
  resolveNoticeTitle,
  type CliNoticeTask,
} from "./completionNoticeDisplay";

/**
 * 投递时刻唤醒事件 ack 复核。
 *
 * 唤醒事件在 watcher observe 时入队，到 readlineWorkspace 真正消费成 turn 之间，
 * 编排者可能已经通过 wait 同步消费了其中的 run（并落盘 ack:true 或持有有效租约）。
 * 此函数在 turn 真正开始前重读磁盘记录，剔除所有已被 claim/ack 的 run。
 */
export function filterUnclaimedChildRuns(
  runs: (RunRecord | AgentRunCompletionShape)[],
  deps: Omit<AgentRunControlDeps, "now"> & { now?: () => number | Date } = {}
): {
  remainingRuns: AgentRunCompletionShape[];
  claimedRunIds: string[];
} {
  const rawNow = deps.now ? deps.now() : Date.now();
  const nowMs = typeof rawNow === "number" ? rawNow : rawNow.getTime();
  const remainingRuns: AgentRunCompletionShape[] = [];
  const claimedRunIds: string[] = [];

  for (const r of runs) {
    const record = readRunRecord(r.runId, deps as AgentRunControlDeps);
    const target = record ?? (r as any);
    if (isRunRecordClaimed(target, nowMs)) {
      claimedRunIds.push(r.runId);
    } else {
      remainingRuns.push(normalizeRunCompletionShape(r));
    }
  }

  return { remainingRuns, claimedRunIds };
}

export type RunCompletionWatcherDeps = {
  /** 当前打开的 dialogId；只有属于当前对话的 run 才唤醒（用户切走了就跳过）。 */
  getCurrentDialogId: () => string | null;
  /** 投递唤醒事件。支持结构化 InternalTurnEvent 或文本 fallback。 */
  onWake: (event: InternalTurnEvent | string) => boolean;
  now?: () => number;
  env?: Record<string, string | undefined>;
};

export type RunCompletionWatcher = {
  /** 喂入本 tick 读到的全部记录；对任何单条坏记录免疫。 */
  observe(records: (RunRecord | AgentRunCompletionShape | Record<string, any>)[]): void;
  /** Explicit user/authority recovery reactivates retained, unacknowledged delivery. */
  resumePendingDelivery(): void;
  /** Return accepted but undelivered runs to the dialog-scoped delivery queue. */
  deferRuns(runs: AgentRunCompletionShape[]): void;
  /** 标记 runId 已被消费（如 wait:true），防重复唤醒。 */
  markAcknowledged(runId: string): void;
  /** 查询 runId 是否已 ack。 */
  isAcknowledged(runId: string): boolean;
  /** 清空观测与已通知状态。 */
  dispose(): void;
};

export function createRunCompletionWatcher(
  deps: RunCompletionWatcherDeps
): RunCompletionWatcher {
  const now = deps.now ?? (() => Date.now());
  const createdAt = now();
  const lastStatusByRunId = new Map<string, string>();
  const notifiedRunIds = new Set<string>();
  const acknowledgedRunIds = new Set<string>();
  const pendingDelivery = new Map<string, RunRecord | AgentRunCompletionShape>();
  let retryAt = 0;
  let retryDelay = 1000;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let retryAttempts = 0;
  let retryParked = false;
  let idleRetryTicks = 0;
  // One entry per run, log only decision transitions, never each poll tick.
  const diagnosticDecisions = new Map<string, string>();
  const traceDecision = (record: RunRecord, currentDialogId: string | null, reason: string) => {
    const key = JSON.stringify([record.status, record.parentDialogId ?? null, currentDialogId, reason]);
    if (diagnosticDecisions.get(record.runId) === key) return;
    diagnosticDecisions.set(record.runId, key);
    traceRunWake("watcher-decision", { runId: record.runId, status: record.status,
      parentDialogId: record.parentDialogId ?? null, currentDialogId, reason });
  };

  const scheduleRetry = () => {
    if (disposed || retryParked || retryTimer || !pendingDelivery.size) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      const records = [...pendingDelivery.values()].map(run => {
        try { return readRunRecord(run.runId, { env: deps.env }) ?? run; } catch { return run; }
      });
      watcher.observe(records);
      if (!retryParked && ++idleRetryTicks >= 6) {
        retryParked = true;
        traceRunWake("delivery-parked", { count: pendingDelivery.size });
      }
      scheduleRetry();
    }, Math.max(1, retryAt - now(), retryDelay));
    retryTimer.unref?.();
  };
  const watcher: RunCompletionWatcher = {
    observe(records: (RunRecord | AgentRunCompletionShape | Record<string, any>)[]): void {
      if (disposed) return;
      if (retryParked) {
        // Retain new terminal facts without restarting IO/timers or acknowledging.
        for (const run of records) {
          if (run && typeof run.runId === "string" && isAgentRunTerminalStatus(run.status)
              && !notifiedRunIds.has(run.runId)) pendingDelivery.set(run.runId, run as RunRecord);
        }
        return;
      }
      const finished: (RunRecord | AgentRunCompletionShape)[] = [];
      const currentDialogId = deps.getCurrentDialogId();
      const candidates = new Map([...pendingDelivery.values(), ...records].filter(run => run && typeof run.runId === "string").map(run => [run.runId, run]));
      for (const rawRecord of candidates.values()) {
        try {
          if (!rawRecord || typeof rawRecord.runId !== "string" || !rawRecord.runId) continue;
          const record = rawRecord as RunRecord;
          if (notifiedRunIds.has(record.runId)) { traceDecision(record, currentDialogId, "already-notified"); continue; }
          const status = record.status;
          if (typeof status !== "string") continue;
          // Unowned runs remain discoverable in the persisted registry via `nolo agent ps`;
          // never infer ownership from whichever dialog is currently open.
          if (!record.parentDialogId || record.parentDialogId !== currentDialogId) { traceDecision(record, currentDialogId, "other-dialog"); continue; }
          if (isRunRecordClaimed(record, now())) {
            traceDecision(record, currentDialogId, "claimed");
            // A claimed terminal remains eligible when its lease expires.
            if (!isAgentRunTerminalStatus(status)) {
              lastStatusByRunId.set(record.runId, status);
            }
            continue;
          }
          const previous = lastStatusByRunId.get(record.runId);
          if (!isAgentRunTerminalStatus(status)) lastStatusByRunId.set(record.runId, status);
          if (!isAgentRunTerminalStatus(status)) { traceDecision(record, currentDialogId, "nonterminal"); continue; }
          if (previous === undefined) {
            const startedMs = readTimestamp(record.startedAt as any);
            if (startedMs === undefined || startedMs < createdAt) { traceDecision(record, currentDialogId, "predates-watcher"); continue; }
          }
          traceDecision(record, currentDialogId, "wake");
          pendingDelivery.set(record.runId, record);
          if (!finished.some(run => run.runId === record.runId)) finished.push(record);
        } catch {
          continue;
        }
      }
      if (finished.length === 0 || now() < retryAt) return;

      const shapes = finished.map((r) => normalizeRunCompletionShape(r));
      // WAKE-003-CONFIG：摘要内联必须与 run 注册表用同一个有效 runs 目录，
      // 否则自定义 NOLO_HOME 下的 `.result.md` 永远被判成越界、胶囊全丢。
      const summaryText = buildWakeMessage(finished, now(), {
        trustedResultDirs: [resolveRunsDir(deps.env)],
      });
      const event: ChildRunCompletedTurnEvent = {
        kind: "child-run-completed",
        runs: shapes,
        text: summaryText,
        displayText: buildWakeDisplayText(finished, now()),
      };

      if (++retryAttempts > 6) {
        retryParked = true;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = null;
        traceRunWake("delivery-parked", { count: pendingDelivery.size, attempts: retryAttempts - 1 });
        return;
      }
      let accepted = false;
      try { accepted = deps.onWake(event) === true; } catch { /* Receiver unavailable: retain for retry. */ }
      if (accepted) {
        for (const run of finished) { notifiedRunIds.add(run.runId); pendingDelivery.delete(run.runId); }
        retryAt = 0;
        retryAttempts = 0;
        idleRetryTicks = 0;
        retryDelay = 1000;
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        scheduleRetry();
      } else {
        retryAt = now() + retryDelay;
        traceRunWake("delivery-rejected", { count: finished.length });
        scheduleRetry();
        retryDelay = Math.min(retryDelay * 2, 30000);
      }
    },
    resumePendingDelivery(): void {
      retryParked = false;
      idleRetryTicks = 0;
      retryAttempts = 0;
      retryAt = 0;
      retryDelay = 1000;
      watcher.observe([]);
    },
    deferRuns(runs): void {
      for (const run of runs) {
        if (acknowledgedRunIds.has(run.runId)) continue;
        notifiedRunIds.delete(run.runId);
        pendingDelivery.set(run.runId, run);
      }
    },
    markAcknowledged(runId: string): void {
      if (runId) { acknowledgedRunIds.add(runId); notifiedRunIds.add(runId); pendingDelivery.delete(runId); }
    },
    isAcknowledged(runId: string): boolean {
      return Boolean(runId && acknowledgedRunIds.has(runId));
    },
    dispose(): void {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      lastStatusByRunId.clear();
      notifiedRunIds.clear();
      acknowledgedRunIds.clear();
      diagnosticDecisions.clear();
      pendingDelivery.clear();
    },
  };
  return watcher;
}
