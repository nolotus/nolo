// packages/agent-runtime/processOutput.ts
//
// Live stdout/stderr capture, cursor-based incremental reading, and
// event-driven pattern waiting for tracked background processes.
//
// Two independent components, each with a single job:
//
// 1. `createLaunchProcessStreamCapture()` — the P1 backpressure capture. It
//    drains both pipes into a bounded tail ring plus a bounded full capture for
//    the close-time result capsule + spill. It knows nothing about secrecy or
//    line structure.
//
// 2. `createProcessLiveOutput()` — the **sanitizing line ring**. Output is
//    sanitized exactly once, at enqueue time, on whole lines:
//
//      raw chunk → split on \r\n|\n|\r → per line:
//        strip control sequences → scrub secrets → PEM single-boolean state
//      machine → one entry `{ seq, text }` in a bounded ring.
//
//    Consequences (each one is a former review finding):
//    - A secret/private-key body can never leak half-way: redaction happens
//      before a line enters the ring, so no read, no maxChars tail trim and no
//      cursor can cut through a secret.
//    - An unterminated private-key body never accumulates state: one boolean
//      (`inPrivateKey`) tracks it, so 3,000 repeated BEGIN markers cost O(1).
//    - Eviction removes whole lines only, so a read never starts mid-line and
//      never fabricates a shorter line ("NOT" + "READY" can never become
//      "READY").
//    - A cursor is a LINE number (`"<stdoutLines>:<stderrLines>"`), so it can
//      never land inside an ANSI sequence or inside a partial chunk.
//
// Design invariants:
// - Does NOT store output in ProcessTaskEventLog (processTask.ts §1.2 keeps
//   lifecycle events strictly started/promoted/exited/killed).
// - Event-driven waits: subscribes to stream chunks, terminal transitions and
//   AbortSignal with zero polling loops.
//
// 安全须知：本模块是全仓唯一对**进程输出**做按行脱敏入队的位置。任何新增的
// 读取路径都必须走 `SanitizedLineRing`（或 `splitSanitizedLines`），绝不直接
// 暴露 raw chunk。

import { isProcessTaskTerminalStatus, type ProcessTaskStatus } from "./processTask";
import type { ProcessTerminalListener, RegisteredProcess } from "./processRegistry";
import { scrubSecrets } from "./secretScrubber";
import {
  MAX_CONTROL_SEQUENCE_CHARS,
  SANITIZE_REPLACEMENT_CHAR,
  sanitizeToolOutputText,
} from "./toolOutputSanitizer";
import { compileLinearRegex, type LinearRegex } from "./linearRegex";

export type { LinearRegex };

export const LAUNCH_PROCESS_STREAM_RING_CHARS = 65_536;
/**
 * 长驻进程流捕获上限。
 * 实测依据：4M 字符 = 4MB 常驻/路（bun 对 ASCII 用 latin1）。多路长驻进程线性叠加。
 * 改为 1_000_000（4MB → 1MB/路）。保持 ring 65536 不变。
 */
export const LAUNCH_PROCESS_STREAM_CAPTURE_MAX_CHARS = 1_000_000;

/** 入队行环最多保留的完整行数。 */
export const PROCESS_LIVE_MAX_LINES = 500;
/** 入队行环最多保留的字符数（含行尾换行）。 */
export const PROCESS_LIVE_MAX_CHARS = LAUNCH_PROCESS_STREAM_RING_CHARS;
/**
 * 未换行暂存区上限。
 *
 * 超过上限的未换行行**绝不分段入队**：半截残片既可能让跨边界的 `PASSWORD=`
 * 漏脱，也可能被当成一条独立行匹配 `^READY$`。改为丢弃到真正的换行符，只入队
 * 一条不可匹配的占位条目（见 `OVERFLOW_LINE_PLACEHOLDER`）。
 */
export const PROCESS_PENDING_LINE_MAX_CHARS = 16_384;

/** 超长未换行行被丢弃后入队的占位条目文本（不可参与匹配）。 */
export const OVERFLOW_LINE_PLACEHOLDER = `[line omitted: exceeded ${PROCESS_PENDING_LINE_MAX_CHARS} chars before newline]`;

export const PROCESS_OUTPUT_DEFAULT_MAX_CHARS = 8_000;
export const PROCESS_OUTPUT_MIN_MAX_CHARS = 256;
export const PROCESS_OUTPUT_MAX_MAX_CHARS = 32_000;

export const PROCESS_OUTPUT_DEFAULT_WAIT_MS = 30_000;
export const PROCESS_OUTPUT_MIN_READY_WAIT_MS = 100;
export const PROCESS_OUTPUT_MAX_WAIT_MS = 120_000;

export const PROCESS_OUTPUT_MAX_PATTERN_LENGTH = 512;

export type ProcessOutputStreamSelection = "both" | "stdout" | "stderr";
export type ProcessOutputStreamName = "stdout" | "stderr";

// ---------------------------------------------------------------------------
// ANSI stripping
// ---------------------------------------------------------------------------

// CSI / OSC / single-char ANSI escape sequences commonly emitted by dev servers.
const ANSI_ESCAPE_RE =
  /\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[@-Z\\-_])/g;

export function stripAnsi(text: string): string {
  if (!text.includes("\x1b")) return text;
  return text.replace(ANSI_ESCAPE_RE, "");
}

// ---------------------------------------------------------------------------
// 1. P1 capture (spill + inline tail). No secrecy state, no line structure.
// ---------------------------------------------------------------------------

export type LaunchProcessStreamCapture = {
  push(chunk: string | Buffer): void;
  /** SPILL source — the full captured text while it fit, else the bounded
   *  head-preserving prefix once the capture bound was reached. Equals the
   *  ring text when nothing evicted (or after releaseFullCapture()). */
  text(): string;
  /** INLINE-TAIL source — the live ring's current text (the process's actual
   *  last LAUNCH_PROCESS_STREAM_RING_CHARS chars), always current. */
  tailText(): string;
  /** True when the tail ring evicted earlier data (stream > ring size). */
  evicted(): boolean;
  /** Chars in the original stream (never capped by the capture). */
  totalChars(): number;
  /** Lines in the original stream (`countLines` convention, never capped). */
  totalLines(): number;
  /** Drop the up-to-1MB full capture array once close-time spilling is done,
   *  retaining only the 64KB ring so post-exit reads remain bounded. */
  releaseFullCapture(): void;
};

export function createLaunchProcessStreamCapture(): LaunchProcessStreamCapture {
  let ring = "";
  let full: string[] | null = [];
  let hasEvicted = false;
  let capturedChars = 0;
  let totalChars = 0;
  let totalNewlines = 0;

  return {
    push(chunk: string | Buffer): void {
      const str = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      if (!str) return;
      totalChars += str.length;
      for (let i = 0; i < str.length; i += 1) {
        if (str.charCodeAt(i) === 10) totalNewlines += 1;
      }
      const combined = ring + str;
      if (combined.length > LAUNCH_PROCESS_STREAM_RING_CHARS) hasEvicted = true;
      ring = combined.slice(-LAUNCH_PROCESS_STREAM_RING_CHARS);
      if (full !== null && capturedChars < LAUNCH_PROCESS_STREAM_CAPTURE_MAX_CHARS) {
        const room = LAUNCH_PROCESS_STREAM_CAPTURE_MAX_CHARS - capturedChars;
        if (str.length <= room) {
          full.push(str);
          capturedChars += str.length;
        } else {
          full.push(str.slice(0, room));
          capturedChars = LAUNCH_PROCESS_STREAM_CAPTURE_MAX_CHARS;
        }
      }
    },
    text(): string {
      return full === null ? ring : full.join("");
    },
    tailText(): string {
      return ring;
    },
    evicted(): boolean {
      return hasEvicted;
    },
    totalChars(): number {
      return totalChars;
    },
    totalLines(): number {
      return totalChars > 0 ? totalNewlines + 1 : 0;
    },
    releaseFullCapture(): void {
      full = null;
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Line-level sanitization (shared by the live ring and capsule fallback)
// ---------------------------------------------------------------------------

const PRIVATE_KEY_PLACEHOLDER = "[REDACTED:PRIVATE_KEY]";
const PEM_BEGIN_RE = /-----BEGIN (?:[A-Z0-9 ]+)?PRIVATE KEY-----/;
const PEM_END_RE = /-----END (?:[A-Z0-9 ]+)?PRIVATE KEY-----/;
/**
 * 同行标记**序列**：`BEGIN` / `END` 按出现顺序逐个消费，而不是只看第一处。
 * 同一行里 `END ... BEGIN` 的重开、`BEGIN ... END ... BEGIN` 的连环都靠它。
 */
const PEM_MARKER_SOURCE =
  "-----BEGIN (?:[A-Z0-9 ]+)?PRIVATE KEY-----|-----END (?:[A-Z0-9 ]+)?PRIVATE KEY-----";
/**
 * 超长行丢弃时用于跨窗口识别 PEM 标记 / 跨行凭据的尾部重叠窗口。
 * 64 超过最长 PEM 标记（35 字符），于是任何落在窗口里的标记都能被完整看到。
 */
const OVERFLOW_SECRET_WINDOW = 64;

/**
 * 空白判定：JS `\s`（` \t\n\v\f\r\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff`）。
 * 与 `secretScrubber.ts` 的 `Bearer\s+…` / `…\s*=\s*…` 同一口径；`[ \t]` 会把
 * 不换行空格和全角空格当成可见文本，让跨行凭据上下文在超长行尾部丢失。
 */
const OVERFLOW_WHITESPACE_RE = /\s/;

/** 跨行 PEM 状态机：整条流只需要一个布尔值。 */
export type ProcessOutputStreamSanitizerState = { inPrivateKey: boolean };

export function createProcessOutputStreamSanitizerState(): ProcessOutputStreamSanitizerState {
  return { inPrivateKey: false };
}

function scrubLine(text: string): string {
  if (!text) return text;
  return scrubSecrets(text).cleaned;
}

/**
 * 把一条**原始**行（不含行尾换行）转成可入环的可见行。
 *
 * 返回 `null` 表示该行必须整行丢弃（未闭合私钥正文）。
 *
 * 顺序很重要：先 `sanitizeToolOutputText` 去掉控制序列，再识别 PEM 标记——于是
 * 插在 `-----BEGIN` 内部的 ANSI 颜色码不会让标记漏检。
 */
export function sanitizeStreamLine(
  rawLine: string,
  state: ProcessOutputStreamSanitizerState,
): string | null {
  const visible = stripAnsi(sanitizeToolOutputText(rawLine));
  const startedInsidePrivateKey = state.inPrivateKey;
  let out = "";
  let cursor = 0;
  // 本行出现过"私钥正文被整段丢弃且没有任何可见残余"。
  let droppedBodyOnly = false;

  // 顺序消费同行所有 BEGIN / END：闭合一个区块后继续看剩余尾部，
  // 于是 `END ... BEGIN` 能在**同一个循环**里重新开启私钥状态。
  while (cursor < visible.length) {
    const rest = visible.slice(cursor);
    if (state.inPrivateKey) {
      // 私钥正文一律不输出；只有 END 能闭合状态。
      const end = PEM_END_RE.exec(rest);
      if (!end) {
        droppedBodyOnly = true;
        cursor = visible.length;
        break;
      }
      state.inPrivateKey = false;
      cursor += end.index + end[0].length;
      continue;
    }
    const begin = PEM_BEGIN_RE.exec(rest);
    const end = PEM_END_RE.exec(rest);
    if (end && (!begin || end.index < begin.index)) {
      // 孤立 END（BEGIN 已离开环或从未出现），或 END 排在同行 BEGIN 之前：
      // 两者都按**出现顺序**消费——先把 END 之前（含 END）整段替换为占位符，
      // 再让外层 while 继续处理剩余文本里的下一个 BEGIN。若只看 `!begin`，
      // `body + END + BEGIN` 里的前导正文会被当普通文本放出去。
      out += PRIVATE_KEY_PLACEHOLDER;
      cursor += end.index + end[0].length;
      continue;
    }
    if (!begin) {
      out += scrubLine(rest);
      cursor = visible.length;
      break;
    }
    out += scrubLine(rest.slice(0, begin.index));
    out += PRIVATE_KEY_PLACEHOLDER;
    const afterBegin = rest.slice(begin.index + begin[0].length);
    const closingEnd = PEM_END_RE.exec(afterBegin);
    if (!closingEnd) {
      // 未闭合 BEGIN：只翻转布尔值，绝不追加正文（O(1) 内存）。
      state.inPrivateKey = true;
      cursor = visible.length;
      break;
    }
    // 同行既有 BEGIN 也有 END：区间整体替换，尾部留到下一轮循环继续判定。
    state.inPrivateKey = false;
    cursor += begin.index + begin[0].length + closingEnd.index + closingEnd[0].length;
  }

  if (out.trim().length === 0) {
    // 从私钥正文里开始、且本行没有可见残余 → 整行不入环。
    if (droppedBodyOnly || (startedInsidePrivateKey && out.length === 0)) return null;
    return out;
  }
  return startedInsidePrivateKey ? `${PRIVATE_KEY_PLACEHOLDER}${out}` : out;
}

// ---------------------------------------------------------------------------
// 3. The sanitizing line ring
// ---------------------------------------------------------------------------

export type ProcessOutputRingLine = {
  seq: number;
  text: string;
  /** `false` 表示这是不可匹配的占位条目（超长行被丢弃），内容不是真实行。 */
  matchable?: false;
};

/**
 * 单字段的跨行密钥上下文（有界，无列表）：
 * - 某行以 `Bearer` 结尾 → 下一行行首是凭证明文；
 * - 某行以 `PASSWORD=` / `PASSWD=` / `SECRET_KEY=` 结尾 → 下一行行首是密码值。
 *
 * 按行脱敏看不到跨行结构，但整段 capsule 清洗（`scrubSecrets`）能看到，所以
 * 行环必须自己把这份上下文带过行边界。
 */
export type PendingSecretContext = "bearer" | "password" | null;

/**
 * 空白口径与 `secretScrubber.ts`（`\bBearer\s+…` / `SECRET_KEY\s*=\s*…`）**完全一致**：
 * 用 JS `\s` 而不是 `[ \t]`，于是不换行空格 `\u00a0`、全角空格 `\u3000`、`\v`、`\f`
 * 这些都能充当分隔符——只认 `[ \t]` 时 `Bearer` + 80 个 `\u00a0` 会被当成普通
 * 可见文本，凭据上下文丢失，下一行的合成凭据就当普通行漏进 transcript。
 */
const SECRET_CONTEXT_BEARER_TAIL_RE = /\bBearer\s*$/i;
const SECRET_CONTEXT_PASSWORD_TAIL_RE =
  /\b(?:(?:DB_|DATABASE_|ADMIN_|ROOT_|MYSQL_|POSTGRES_)?(?:PASSWORD|PASSWD|SECRET_KEY))\s*=\s*['"]?$/i;
const SECRET_CONTEXT_BEARER_HEAD_RE = /^(\s*)([a-zA-Z0-9_\-\.]{25,})\b/;
/**
 * 跨行密码值行首（有界）：允许取值被单引号/双引号包裹，与
 * `secretScrubber.ts` 里同行密码赋值的正则口径一致——引号落在赋值行尾或
 * 下一行行首的两种形态都能被覆盖。
 */
const SECRET_CONTEXT_PASSWORD_HEAD_RE = /^(\s*)(['"]?)([^\s'"]{4,})(['"]?)/;

/** 用上一行的上下文脱掉本行行首的凭证明文（已脱敏的占位符不含凭证明文）。 */
export function applyPendingSecretContext(context: PendingSecretContext, line: string): string {
  if (context === null || line.length === 0) return line;
  if (context === "bearer") {
    return line.replace(SECRET_CONTEXT_BEARER_HEAD_RE, "$1[REDACTED:BEARER_TOKEN]");
  }
  return line.replace(SECRET_CONTEXT_PASSWORD_HEAD_RE, "$1[REDACTED:PASSWORD]");
}

/** 由一条**已脱敏**可见行推断下一行需要的上下文。 */
export function nextPendingSecretContext(line: string): PendingSecretContext {
  if (line.length === 0) return null;
  if (SECRET_CONTEXT_BEARER_TAIL_RE.test(line)) return "bearer";
  if (SECRET_CONTEXT_PASSWORD_TAIL_RE.test(line)) return "password";
  return null;
}

/** 找到行终止符（`\r\n` / `\n` / `\r`）之后的偏移；没有终止符返回 -1。 */
function skipToAfterLineTerminator(text: string): number {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code !== 10 && code !== 13) continue;
    return code === 13 && text.charCodeAt(i + 1) === 10 ? i + 2 : i + 1;
  }
  return -1;
}

/**
 * 超长行溢出期间的控制序列剥离器：**逐字符确定性有限状态机**。
 *
 * 为什么不是「整块清洗 + 尾部半条序列修补」（已删除的 `splitTrailingEscapePrefix` /
 * `isIncompleteEscapeSequence` 那一套）：chunk 边界可以落在控制序列的任意位置
 * ——C1 CSI 的引入字节之后、OSC 正文第 70 个字符处、ST 的 `ESC` 与 `\` 之间——
 * 每一处都是独立的分歧点。修补式实现必须逐一枚举这些形态，漏一处就让
 * `-----BEGIN ... PRIVATE KEY-----` 识别不出来，后续私钥正文当普通行入环泄进
 * transcript（review finding: `process-output-overflow-split-loses-secret-state`）。
 *
 * 状态机只保存 `state` + `seqLen` + 有界序列体，可见字符在进入状态机的那一刻就
 * 决定去留，不看它落在哪个 chunk：于是**任意 chunk 划分**产出的可见字符流逐字节
 * 一致。语义与 `sanitizeToolOutputText` 对齐——同一批引入符（ESC CSI、C1 CSI、
 * `ESC ]PX^_` OSC/DCS/SOS/PM/APC 与其 C1 形态）、同一批终止符（CSI 终止字节、
 * `BEL` / `ESC \` / C1 ST）、同一个 `MAX_CONTROL_SEQUENCE_CHARS` 上限、同一条
 * 「超限/畸形只丢引入控制器、序列体按普通文本回放」的契约（否则未终止序列会变成
 * 吃可见文本的删除型伪造）。
 */
export type OverflowControlStripper = {
  /** 消费一块原始 chunk，返回其中剥离控制序列后的可见字符。 */
  push(chunk: string): string;
  /** 行结束（换行 / 收束）：回放未终止序列的序列体，返回剩余可见字符。 */
  end(): string;
};

type OverflowStripperState = "normal" | "esc" | "csi" | "st_str" | "st_esc";

const STRIPPER_ESC = 0x1b;
const STRIPPER_BEL = 0x07;
const STRIPPER_LINE_FEED = 0x0a;
const STRIPPER_TAB = 0x09;
const STRIPPER_DEL = 0x7f;
const STRIPPER_C1_DCS = 0x90;
const STRIPPER_C1_SOS = 0x98;
const STRIPPER_C1_CSI = 0x9b;
const STRIPPER_C1_ST = 0x9c;
const STRIPPER_C1_OSC = 0x9d;
const STRIPPER_C1_PM = 0x9e;
const STRIPPER_C1_APC = 0x9f;
const STRIPPER_HIGH_SURROGATE_MIN = 0xd800;
const STRIPPER_HIGH_SURROGATE_MAX = 0xdbff;
const STRIPPER_LOW_SURROGATE_MIN = 0xdc00;
const STRIPPER_LOW_SURROGATE_MAX = 0xdfff;

export function createOverflowControlStripper(): OverflowControlStripper {
  let state: OverflowStripperState = "normal";
  /** 自引入控制器起已消费的码元数（含控制器本身），用于长度上限判定。 */
  let seqLen = 0;
  /** 引入控制器之后已消费的码元：超限/畸形时按清洗器契约回放为普通文本。 */
  let seqBody = "";
  /** 落在 chunk 末尾的高代理项：等下一个码元才能判断是代理对还是孤立代理项。 */
  let pendingHighSurrogate = "";
  let out: string[] = [];

  const reset = (): void => {
    state = "normal";
    seqLen = 0;
    seqBody = "";
  };

  /** 只丢引入控制器、把已确认的序列体回放为普通文本（清洗器契约）。 */
  const replayBody = (): string => {
    const body = seqBody;
    reset();
    return body;
  };

  /**
   * 单个码元的转移。返回**需要紧跟当前字符之后重新处理**的文本（序列体回放），
   * 没有回放时返回空串；可见字符直接推进 `out`。
   */
  const step = (code: number, ch: string): string => {
    // 上一个 chunk 末尾的高代理项先定型：紧跟低代理项才算合法码点。
    if (pendingHighSurrogate) {
      const held = pendingHighSurrogate;
      pendingHighSurrogate = "";
      if (code >= STRIPPER_LOW_SURROGATE_MIN && code <= STRIPPER_LOW_SURROGATE_MAX) {
        out.push(held + ch);
        return "";
      }
      // 落空的高代理项 = 孤立代理项，按清洗器契约替换成 U+FFFD。
      out.push(SANITIZE_REPLACEMENT_CHAR);
    }

    switch (state) {
      case "normal": {
        if (code === STRIPPER_LINE_FEED || code === STRIPPER_TAB) {
          out.push(ch);
          return "";
        }
        if (code === STRIPPER_ESC) {
          state = "esc";
          seqLen = 1;
          seqBody = "";
          return "";
        }
        if (code === STRIPPER_C1_CSI) {
          state = "csi";
          seqLen = 1;
          seqBody = "";
          return "";
        }
        if (
          code === STRIPPER_C1_OSC ||
          code === STRIPPER_C1_DCS ||
          code === STRIPPER_C1_SOS ||
          code === STRIPPER_C1_PM ||
          code === STRIPPER_C1_APC
        ) {
          state = "st_str";
          seqLen = 1;
          seqBody = "";
          return "";
        }
        if (code < 0x20 || code === STRIPPER_DEL || (code >= 0x80 && code <= 0x9f)) {
          return "";
        }
        if (code >= STRIPPER_HIGH_SURROGATE_MIN && code <= STRIPPER_HIGH_SURROGATE_MAX) {
          pendingHighSurrogate = ch;
          return "";
        }
        if (code >= STRIPPER_LOW_SURROGATE_MIN && code <= STRIPPER_LOW_SURROGATE_MAX) {
          out.push(SANITIZE_REPLACEMENT_CHAR);
          return "";
        }
        out.push(ch);
        return "";
      }

      case "esc": {
        seqLen += 1;
        if (code === 0x5b /* [ */) {
          state = "csi";
          seqBody = ch;
          return "";
        }
        if (
          code === 0x5d /* ] OSC */ ||
          code === 0x50 /* P DCS */ ||
          code === 0x58 /* X SOS */ ||
          code === 0x5e /* ^ PM */ ||
          code === 0x5f /* _ APC */
        ) {
          state = "st_str";
          seqBody = ch;
          return "";
        }
        if (code >= 0x20 && code <= 0x2f) {
          seqBody += ch;
          // 中间字节一直没等到终止字节：按未终止序列回放整段序列体。
          return seqLen >= MAX_CONTROL_SEQUENCE_CHARS ? replayBody() : "";
        }
        if (code >= 0x30 && code <= 0x7e) {
          reset();
          return "";
        }
        // 畸形（控制字符 / 另一个 ESC / 代理项…）：只丢 ESC，其后字节重新判定。
        const rescued = seqBody + ch;
        reset();
        return rescued;
      }

      case "csi": {
        seqLen += 1;
        if (code >= 0x40 && code <= 0x7e) {
          // 终止字节到了：整段 CSI 删除。
          reset();
          return "";
        }
        if (code >= 0x20 && code <= 0x3f) {
          seqBody += ch;
          return seqLen >= MAX_CONTROL_SEQUENCE_CHARS ? replayBody() : "";
        }
        // 非 CSI 合法字节：已确认的参数段丢弃，当前字节按普通文本重新判定。
        reset();
        return ch;
      }

      case "st_str": {
        seqLen += 1;
        if (code === STRIPPER_BEL || code === STRIPPER_C1_ST) {
          reset();
          return "";
        }
        if (code === STRIPPER_ESC) {
          // 落在上限**最后一个槽位**上的 `ESC` 还不能判定去留：`ESC \` 双字符 ST
          // 仍算合法终止，所以要先进 `st_esc` 只等下一个码元（超限回放留到那里）。
          // 与 `toolOutputSanitizer.ts` 的 `skipControlStringBody` 逐字节一致：
          // 该实现在 `i === limit - 1` 处仍会检查后一个字节是否为 `\`。
          seqBody += ch;
          state = "st_esc";
          return "";
        }
        seqBody += ch;
        return seqLen >= MAX_CONTROL_SEQUENCE_CHARS ? replayBody() : "";
      }

      case "st_esc": {
        seqLen += 1;
        // 上限判定与 `sanitizeToolOutputText` 一致：**每个**消费掉的码元都要先记长度。
        const exceedsLimit = seqLen > MAX_CONTROL_SEQUENCE_CHARS;
        if (code === 0x5c /* \ ST */) {
          // `ESC \` 双字符 ST：即便 `ESC` 恰好落在上限最后一个槽位上，终止依然成立，
          // 整段控制序列（含合成 PEM END）全部删除。唯一例外是这颗 `\` 本身已经越过
          // 上限（`seqLen === MAX + 1`）——清洗器把终止位置 `min(i + 2, limit)`
          // clamp 回 `limit`，那颗 `\` 会被下一轮当普通文本扫描输出，这里同样回放它
          // 才能逐字节一致。
          const strayBackslash = exceedsLimit ? ch : "";
          reset();
          return strayBackslash;
        }
        if (exceedsLimit) {
          // 越过上限后 ST 已不可能成立（清洗器的 `limit` 已耗尽 → `UNTERMINATED`）：
          // 只丢引入控制器，回放已确认的序列体（含引入 ST 的 `ESC`），当前码元按
          // 普通文本重新判定——`BEL` / C1 ST / 连续 `ESC` / 普通字符一律走这条，
          // 绝不因为「看起来像终止」就把超限的控制串整段吃掉（可见文本凭空消失）。
          return `${replayBody()}${ch}`;
        }
        if (code === STRIPPER_BEL || code === STRIPPER_C1_ST) {
          reset();
          return "";
        }
        if (code === STRIPPER_ESC) {
          // `ESC ESC`：前一个 ESC 属于序列体，后一个重新开启 ST 判定。
          seqBody += "\x1b";
          return "";
        }
        seqBody += ch;
        state = "st_str";
        return "";
      }
    }

    return "";
  };

  /** 按序消费文本；回放的序列体插回当前位置之后，先于剩余 chunk 处理。 */
  const processText = (text: string): void => {
    let rest = text;
    let index = 0;
    while (index < rest.length) {
      const code = rest.charCodeAt(index);
      const replay = step(code, rest[index]!);
      index += 1;
      if (replay) rest = `${rest.slice(0, index)}${replay}${rest.slice(index)}`;
    }
  };

  return {
    push(chunk: string): string {
      if (!chunk) return "";
      out = [];
      processText(chunk);
      const visible = out.join("");
      out = [];
      return visible;
    },
    end(): string {
      out = [];
      if (pendingHighSurrogate) {
        pendingHighSurrogate = "";
        out.push(SANITIZE_REPLACEMENT_CHAR);
      }
      // 行在序列中间结束：只丢引入控制器，序列体回放（可能再开一条序列，故循环）。
      for (let guard = 0; state !== "normal" && guard <= MAX_CONTROL_SEQUENCE_CHARS; guard += 1) {
        const body = seqBody;
        reset();
        if (body) processText(body);
      }
      reset();
      const visible = out.join("");
      out = [];
      return visible;
    },
  };
}

export type SanitizedLineRing = {
  push(chunk: string | Buffer): void;
  /** 冲刷未换行暂存区（stream closed / terminal）：末尾残行成为完整行。 */
  flush(): void;
  entries(): readonly ProcessOutputRingLine[];
  /** 返回 `seq > afterSeq` 的入环行（按 seq 升序）。 */
  linesAfter(afterSeq: number): readonly ProcessOutputRingLine[];
  /** 最近一次入环的行号（0 表示环内还没有任何行）。 */
  latestSeq(): number;
  /** 是否发生过整行驱逐。 */
  evicted(): boolean;
  /** 是否发生过超长行丢弃（占位条目）——匹配/扫描结果可能不完整。 */
  scanIncomplete(): boolean;
  /** 未换行暂存区当前字符数（诊断用）。 */
  pendingChars(): number;
};

export function createSanitizedLineRing(): SanitizedLineRing {
  const lines: ProcessOutputRingLine[] = [];
  let totalCharsInRing = 0;
  let nextSeq = 1;
  let inPrivateKey = false;
  let pendingRaw = "";
  /** 超长未换行行：true 时后续字符一律丢弃，直到真正的换行符或 Close。 */
  let pendingOverflowed = false;
  let evictedLines = 0;
  let omittedLines = 0;
  let secretContext: PendingSecretContext = null;
  /**
   * 超长行丢弃时的有界脱敏窗口：只保留最后 OVERFLOW_SECRET_WINDOW 个可见字符，
   * 于是 `BEGIN` / `END` 标记与跨行凭据上下文都不会因为内容被省略而丢失。
   */
  let overflowVisibleTail = "";
  /**
   * 超长行溢出期间**单独**维护的凭据尾部窗口（≤ OVERFLOW_SECRET_WINDOW 字符）。
   * 连续空白被折叠成单个 `" "`，且只有后面真的出现可见字符时才写进去：于是
   * `Bearer` / `PASSWORD=` 后面跟 80 个（或 80,000 个）尾随空格都不会把关键字
   * 挤出窗口，`closeOverflow()` 仍能推断出下一行需要的跨行凭据上下文。
   */
  let overflowCredTail = "";
  /** `overflowCredTail` 之后是否已经出现过空白（行收束时复位）。 */
  let overflowSawTrailingSpace = false;
  /**
   * 超长行丢弃期间的逐字符控制序列剥离器（跨 chunk 保持状态）。
   * 任意 chunk 划分下产出的可见字符流逐字节一致，标记不会因为边界而漏检；
   * 只保留状态与有界序列体，不保留行内容。
   */
  let overflowStripper = createOverflowControlStripper();

  /** 行边界：清空所有有界的溢出期状态（内容窗口 + 凭据窗口 + 剥离器）。 */
  const resetOverflowWindows = (): void => {
    overflowVisibleTail = "";
    overflowCredTail = "";
    overflowSawTrailingSpace = false;
    overflowStripper = createOverflowControlStripper();
  };

  const enqueue = (text: string, matchable = true): void => {
    lines.push(matchable ? { seq: nextSeq, text } : { seq: nextSeq, text, matchable: false });
    nextSeq += 1;
    totalCharsInRing += text.length + 1;
    while (
      lines.length > PROCESS_LIVE_MAX_LINES ||
      (totalCharsInRing > PROCESS_LIVE_MAX_CHARS && lines.length > 1)
    ) {
      const dropped = lines.shift()!;
      totalCharsInRing -= dropped.text.length + 1;
      evictedLines += 1;
    }
  };

  const enqueueRawLine = (rawLine: string): void => {
    // 统一行长上限：换行符是落在同一个 chunk 还是后续 chunk，都走这一条判定。
    if (rawLine.length > PROCESS_PENDING_LINE_MAX_CHARS) {
      resetOverflowWindows();
      scanOverflowVisible(rawLine);
      closeOverflow(true);
      return;
    }
    const state: ProcessOutputStreamSanitizerState = { inPrivateKey };
    const sanitized = sanitizeStreamLine(rawLine, state);
    inPrivateKey = state.inPrivateKey;
    // 私钥正文整行被丢弃时上下文保持不变：那一行没有任何可见内容。
    if (sanitized === null) return;
    // 跨行凭据上下文（Bearer 或密码赋值）：消费上一行尾部设置的待脱敏状态。
    const visible = applyPendingSecretContext(secretContext, sanitized);
    enqueue(visible);
    // 纯空白行**保留**上下文：`Bearer` / `PASSWORD=` 与值之间可能隔着空行。
    if (visible.trim() === "") return;
    secretContext = nextPendingSecretContext(visible);
  };

  /**
   * 把可见字符并进凭据尾部窗口：空白**只置标记、不入窗口**（重复空白因此不会把
   * `Bearer` / `PASSWORD=` 挤出窗口）；空白之后的下一个可见字符前补一个 `" "`，
   * 保证 `Bearer` 与 `PASSWORD=` 的行尾锚点仍然成立。
   */
  const absorbOverflowCredTail = (visible: string): void => {
    let next = overflowCredTail;
    let sawSpace = overflowSawTrailingSpace;
    for (const ch of visible) {
      // 空白判定用 JS `\s`（与 `secretScrubber.ts` 的 `\s+` / `\s*` 同口径）：
      // 不换行空格 `\u00a0`、全角空格 `\u3000`、`\v`、`\f` 都必须折叠成标记，
      // 否则它们会把 `Bearer` / `PASSWORD=` 挤出窗口，跨行凭据上下文就丢了。
      if (OVERFLOW_WHITESPACE_RE.test(ch)) {
        sawSpace = true;
        continue;
      }
      if (sawSpace) {
        next += " ";
        sawSpace = false;
      }
      next += ch;
      // 只保留尾部窗口：中途裁剪与末尾裁剪等价（窗口之后的内容不会再被读）。
      if (next.length >= OVERFLOW_SECRET_WINDOW * 4) next = next.slice(-OVERFLOW_SECRET_WINDOW);
    }
    overflowCredTail =
      next.length > OVERFLOW_SECRET_WINDOW ? next.slice(-OVERFLOW_SECRET_WINDOW) : next;
    overflowSawTrailingSpace = sawSpace;
  };

  /**
   * 把一段**已剥离控制序列**的可见字符并进 64 字符尾部重叠窗口，并顺序消费
   * `BEGIN` / `END` 标记。窗口保证跨 chunk 的标记仍能被完整看到。
   */
  const absorbOverflowVisible = (visible: string): void => {
    if (!visible) return;
    absorbOverflowCredTail(visible);
    const window = `${overflowVisibleTail}${visible}`;
    const markerRe = new RegExp(PEM_MARKER_SOURCE, "g");
    let matched: RegExpExecArray | null;
    while ((matched = markerRe.exec(window)) !== null) {
      // 顺序消费：BEGIN 开启、END 关闭，同行/跨窗口重开都按出现顺序落到同一个布尔值。
      inPrivateKey = matched[0].startsWith("-----BEGIN");
    }
    overflowVisibleTail =
      window.length > OVERFLOW_SECRET_WINDOW
        ? window.slice(-OVERFLOW_SECRET_WINDOW)
        : window;
  };

  /**
   * 超长行内容被丢弃时仍然必须跟踪脱敏状态：把原始 chunk 交给逐字符状态机剥离
   * 控制序列，只把可见字符喂进 64 字符尾部窗口顺序消费 `BEGIN` / `END` 标记，
   * 绝不因为行内容省略而把后续私钥正文放出去。
   * 只保留有界状态（O(1) 内存），内容本身不入环。
   */
  const scanOverflowVisible = (raw: string): void => {
    if (!raw) return;
    absorbOverflowVisible(overflowStripper.push(raw));
  };

  /**
   * 收束一条超长未换行行：只入队**一条不可匹配的占位条目**。
   * 半截残片既不能当独立行发布（会漏脱跨边界的密码赋值），也不能参与
   * `^READY$` 之类的整行匹配（会伪造出一条根本不存在的行）。
   */
  const closeOverflow = (force = false): void => {
    if (!pendingOverflowed && !force) return;
    // 换行收束：用同一 64 字符尾部窗口推断下一行需要的跨行凭据上下文。
    // 窗口里**不含**行终止符（见 pushText），否则 `Bearer ` / `PASSWORD=` 之后
    // 多了一个 `\n` 会让行尾锚点失配，下一行凭证明文就漏出去了。
    // 行结束时先把状态机里仍未终止的序列体回放出来，再据此推断跨行凭据上下文。
    // 凭据上下文只认专门的 `overflowCredTail`（空白已折叠）：尾随空白把 64 字符
    // 内容窗口挤满时，`Bearer ` / `PASSWORD=` 仍然留在凭据窗口里。
    absorbOverflowVisible(overflowStripper.end());
    secretContext = nextPendingSecretContext(
      overflowSawTrailingSpace ? `${overflowCredTail} ` : overflowCredTail,
    );
    resetOverflowWindows();
    pendingOverflowed = false;
    pendingRaw = "";
    omittedLines += 1;
    enqueue(OVERFLOW_LINE_PLACEHOLDER, false);
  };

  const pushText = (raw: string): void => {
    if (!raw) return;
    let rest = raw;
    if (pendingOverflowed) {
      const afterTerminator = skipToAfterLineTerminator(rest);
      // 整块仍属于那条超长行：全部丢弃（暂存区保持为空，不再增长）。
      if (afterTerminator < 0) {
        scanOverflowVisible(rest);
        return;
      }
      // 只把换行符**之前**的残段喂进尾部窗口：`\r` / `\n` 一旦进窗口，
      // `Bearer ` / `PASSWORD=` 的行尾锚点就失配，跨行上下文与"另起一块"不一致。
      const beforeTerminator = rest.slice(0, afterTerminator);
      let scanEnd = beforeTerminator.length;
      while (scanEnd > 0) {
        const code = beforeTerminator.charCodeAt(scanEnd - 1);
        if (code !== 10 && code !== 13) break;
        scanEnd -= 1;
      }
      if (scanEnd > 0) scanOverflowVisible(beforeTerminator.slice(0, scanEnd));
      closeOverflow();
      rest = rest.slice(afterTerminator);
      if (rest.length === 0) return;
    }
    const buffer = pendingRaw + rest;
    pendingRaw = "";
    let start = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const code = buffer.charCodeAt(i);
      if (code !== 10 && code !== 13) continue;
      const line = buffer.slice(start, i);
      const terminator = code === 13 && buffer.charCodeAt(i + 1) === 10 ? 2 : 1;
      i += terminator - 1;
      start = i + 1;
      enqueueRawLine(line);
    }
    pendingRaw = buffer.slice(start);
    if (pendingRaw.length > PROCESS_PENDING_LINE_MAX_CHARS) {
      // 超长无换行行：不再按上限切片段入队，改为丢弃到真正的换行符。
      pendingRaw = "";
      pendingOverflowed = true;
      resetOverflowWindows();
      scanOverflowVisible(buffer.slice(start));
    }
  };

  return {
    push(chunk: string | Buffer): void {
      pushText(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
    },
    flush(): void {
      // 超长行被 Close 截断：收束成一条占位条目，恢复后续正常接收。
      if (pendingOverflowed) {
        closeOverflow();
        return;
      }
      if (pendingRaw.length === 0) return;
      const rest = pendingRaw;
      pendingRaw = "";
      enqueueRawLine(rest);
    },
    entries(): readonly ProcessOutputRingLine[] {
      return lines;
    },
    linesAfter(afterSeq: number): readonly ProcessOutputRingLine[] {
      if (lines.length === 0) return [];
      const first = lines[0]!;
      if (afterSeq < first.seq - 1) return lines;
      const offset = Math.max(0, afterSeq + 1 - first.seq);
      if (offset >= lines.length) return [];
      return lines.slice(offset);
    },
    latestSeq(): number {
      return lines.length === 0 ? 0 : lines[lines.length - 1]!.seq;
    },
    evicted(): boolean {
      return evictedLines > 0;
    },
    scanIncomplete(): boolean {
      // 正在丢弃的那条超长行同样算"扫描不完整"：此刻它的内容还没进占位条目。
      return omittedLines > 0 || pendingOverflowed;
    },
    pendingChars(): number {
      return pendingOverflowed ? 0 : pendingRaw.length;
    },
  };
}

/**
 * 用**同一套**按行脱敏流水线把一段完整文本切成逻辑行（capsule fallback 用）。
 * 与行环的区别：不设容量上限，也不整行驱逐。
 */
export function splitSanitizedLines(raw: string): {
  lines: ProcessOutputRingLine[];
  endsWithNewline: boolean;
} {
  const lines: ProcessOutputRingLine[] = [];
  const state = createProcessOutputStreamSanitizerState();
  let seq = 1;
  const pushLine = (rawLine: string): void => {
    const sanitized = sanitizeStreamLine(rawLine, state);
    if (sanitized === null) return;
    lines.push({ seq, text: sanitized });
    seq += 1;
  };
  let start = 0;
  let endsWithNewline = false;
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    if (code !== 10 && code !== 13) continue;
    const line = raw.slice(start, i);
    const terminator = code === 13 && raw.charCodeAt(i + 1) === 10 ? 2 : 1;
    i += terminator - 1;
    start = i + 1;
    endsWithNewline = true;
    pushLine(line);
  }
  const rest = raw.slice(start);
  if (rest.length > 0) {
    pushLine(rest);
    endsWithNewline = false;
  }
  return { lines, endsWithNewline };
}

function joinRingLines(
  entries: readonly ProcessOutputRingLine[],
  endsWithNewline: boolean,
): string {
  if (entries.length === 0) return "";
  const body = entries.map((entry) => entry.text).join("\n");
  return endsWithNewline || entries.length > 1 ? `${body}\n` : body;
}

// ---------------------------------------------------------------------------
// 4. Cursor
// ---------------------------------------------------------------------------

export function formatProcessOutputCursor(stdoutSeq: number, stderrSeq: number): string {
  return `${Math.max(0, Math.floor(stdoutSeq))}:${Math.max(0, Math.floor(stderrSeq))}`;
}

export function parseProcessOutputCursor(
  raw: unknown,
): { ok: true; stdoutSeq: number; stderrSeq: number } | { ok: false; detail: string } {
  if (typeof raw !== "string") {
    return {
      ok: false,
      detail:
        'cursor must be a string in "<stdoutLines>:<stderrLines>" format (as returned by readProcessOutput or launchProcess).',
    };
  }
  const trimmed = raw.trim();
  const match = /^(\d+):(\d+)$/.exec(trimmed);
  if (!match) {
    return {
      ok: false,
      detail: `Invalid cursor "${trimmed.slice(0, 64)}": expected "<stdoutLines>:<stderrLines>" (e.g. "0:0").`,
    };
  }
  const stdoutSeq = Number(match[1]);
  const stderrSeq = Number(match[2]);
  if (!Number.isSafeInteger(stdoutSeq) || !Number.isSafeInteger(stderrSeq)) {
    return {
      ok: false,
      detail: "Invalid cursor: line number exceeds safe integer range.",
    };
  }
  return { ok: true, stdoutSeq, stderrSeq };
}

// ---------------------------------------------------------------------------
// 5. Live output
// ---------------------------------------------------------------------------

export type ProcessLiveOutputSnapshot = {
  cursor: string;
  stdout: string;
  stderr: string;
  truncated: boolean;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  cursorEvicted: boolean;
  stdoutTotalLines: number;
  stderrTotalLines: number;
};

export type ProcessLiveOutputReadArgs = {
  stream: ProcessOutputStreamSelection;
  stdoutSeq?: number;
  stderrSeq?: number;
  maxChars: number;
};

export type ProcessLiveOutput = {
  /** P1 capture for the close-time capsule/spill (raw, bounded). */
  readonly stdout: LaunchProcessStreamCapture;
  readonly stderr: LaunchProcessStreamCapture;
  pushStdout(chunk: string | Buffer): void;
  pushStderr(chunk: string | Buffer): void;
  subscribe(listener: () => void): () => void;
  markClosed(): void;
  isClosed(): boolean;
  releaseFullCapture(): void;
  cursor(): string;
  readSnapshot(opts: ProcessLiveOutputReadArgs): ProcessLiveOutputSnapshot;
  /** The sanitizing line ring for a stream (reads / waits go through it). */
  ring(stream: ProcessOutputStreamName): SanitizedLineRing;
};

type SingleRingRead = {
  text: string;
  truncated: boolean;
  cursorEvicted: boolean;
  totalLines: number;
};

function readRing(
  ring: SanitizedLineRing,
  sinceSeq: number | undefined,
  maxChars: number,
): SingleRingRead {
  const entries = ring.entries();
  const latestSeq = ring.latestSeq();
  let selected: readonly ProcessOutputRingLine[] = entries;
  let cursorEvicted = false;
  if (sinceSeq !== undefined) {
    if (entries.length > 0) {
      const oldest = entries[0]!.seq;
      if (sinceSeq < oldest - 1) cursorEvicted = true;
    } else if (sinceSeq < latestSeq) {
      cursorEvicted = true;
    }
    selected = ring.linesAfter(sinceSeq);
  }
  const full = joinRingLines(selected, true);
  const tailTrimmed = full.length > maxChars;
  const text = tailTrimmed ? full.slice(-maxChars) : full;
  return {
    text,
    // 内容本身已脱敏，截尾只影响完整性，不可能破坏脱敏。
    truncated: tailTrimmed || cursorEvicted || (sinceSeq === undefined && ring.evicted()),
    cursorEvicted,
    totalLines: latestSeq,
  };
}

export function createProcessLiveOutput(args?: {
  stdout?: LaunchProcessStreamCapture;
  stderr?: LaunchProcessStreamCapture;
}): ProcessLiveOutput {
  const stdoutCapture = args?.stdout ?? createLaunchProcessStreamCapture();
  const stderrCapture = args?.stderr ?? createLaunchProcessStreamCapture();
  const stdoutRing = createSanitizedLineRing();
  const stderrRing = createSanitizedLineRing();
  const listeners = new Set<() => void>();
  let closed = false;

  const notify = () => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Subscriber errors must never disrupt pipe draining or process exit.
      }
    }
  };

  return {
    stdout: stdoutCapture,
    stderr: stderrCapture,
    pushStdout(chunk: string | Buffer): void {
      stdoutCapture.push(chunk);
      stdoutRing.push(chunk);
      notify();
    },
    pushStderr(chunk: string | Buffer): void {
      stderrCapture.push(chunk);
      stderrRing.push(chunk);
      notify();
    },
    subscribe(listener: () => void): () => void {
      if (closed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    markClosed(): void {
      if (closed) return;
      closed = true;
      // 残行成为完整行后再唤醒，终态扫描才能看到它。
      stdoutRing.flush();
      stderrRing.flush();
      notify();
      listeners.clear();
    },
    isClosed(): boolean {
      return closed;
    },
    releaseFullCapture(): void {
      stdoutCapture.releaseFullCapture();
      stderrCapture.releaseFullCapture();
    },
    cursor(): string {
      return formatProcessOutputCursor(stdoutRing.latestSeq(), stderrRing.latestSeq());
    },
    readSnapshot(opts: ProcessLiveOutputReadArgs): ProcessLiveOutputSnapshot {
      const includeStdout = opts.stream === "both" || opts.stream === "stdout";
      const includeStderr = opts.stream === "both" || opts.stream === "stderr";
      const stdoutRead = includeStdout
        ? readRing(stdoutRing, opts.stdoutSeq, opts.maxChars)
        : { text: "", truncated: false, cursorEvicted: false, totalLines: stdoutRing.latestSeq() };
      const stderrRead = includeStderr
        ? readRing(stderrRing, opts.stderrSeq, opts.maxChars)
        : { text: "", truncated: false, cursorEvicted: false, totalLines: stderrRing.latestSeq() };
      return {
        cursor: formatProcessOutputCursor(stdoutRing.latestSeq(), stderrRing.latestSeq()),
        stdout: stdoutRead.text,
        stderr: stderrRead.text,
        truncated: stdoutRead.truncated || stderrRead.truncated,
        stdoutTruncated: stdoutRead.truncated,
        stderrTruncated: stderrRead.truncated,
        cursorEvicted: stdoutRead.cursorEvicted || stderrRead.cursorEvicted,
        stdoutTotalLines: stdoutRead.totalLines,
        stderrTotalLines: stderrRead.totalLines,
      };
    },
    ring(stream: ProcessOutputStreamName): SanitizedLineRing {
      return stream === "stdout" ? stdoutRing : stderrRing;
    },
  };
}

// ---------------------------------------------------------------------------
// 6. Pattern compilation / argument resolution
// ---------------------------------------------------------------------------

export function compileProcessOutputPattern(
  pattern: unknown,
  fieldName = "waitForPattern",
): { ok: true; regex: LinearRegex; pattern: string } | { ok: false; detail: string } {
  if (typeof pattern !== "string" || pattern.length === 0) {
    return {
      ok: false,
      detail: `${fieldName} must be a non-empty regular expression string.`,
    };
  }
  if (pattern.length > PROCESS_OUTPUT_MAX_PATTERN_LENGTH) {
    return {
      ok: false,
      detail: `${fieldName} exceeds maximum length of ${PROCESS_OUTPUT_MAX_PATTERN_LENGTH} characters.`,
    };
  }
  // Compiled into a Thompson NFA (linear time), never into a backtracking
  // `RegExp`: a pathological pattern on a long log line would otherwise block
  // the event loop and take timeout / abort / pipe draining down with it.
  const compiled = compileLinearRegex(pattern);
  if (!compiled.ok) {
    return { ok: false, detail: `Invalid ${fieldName} regex: ${compiled.detail}` };
  }
  return { ok: true, regex: compiled.matcher, pattern };
}

export function resolveProcessOutputStream(
  raw: unknown,
): { ok: true; stream: ProcessOutputStreamSelection } | { ok: false; detail: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, stream: "both" };
  }
  if (raw === "both" || raw === "stdout" || raw === "stderr") {
    return { ok: true, stream: raw };
  }
  return {
    ok: false,
    detail: 'stream must be one of "both", "stdout", or "stderr".',
  };
}

export function resolveProcessOutputMaxChars(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return PROCESS_OUTPUT_DEFAULT_MAX_CHARS;
  return Math.min(
    PROCESS_OUTPUT_MAX_MAX_CHARS,
    Math.max(PROCESS_OUTPUT_MIN_MAX_CHARS, Math.floor(n)),
  );
}

export function resolveProcessOutputWaitTimeoutMs(
  raw: unknown,
  opts?: { minMs?: number; defaultMs?: number; maxMs?: number },
): { timeoutMs: number; clamped: boolean } {
  const minMs = opts?.minMs ?? 0;
  const defaultMs = opts?.defaultMs ?? PROCESS_OUTPUT_DEFAULT_WAIT_MS;
  const maxMs = opts?.maxMs ?? PROCESS_OUTPUT_MAX_WAIT_MS;
  if (raw === undefined || raw === null || raw === "") {
    return { timeoutMs: defaultMs, clamped: false };
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    return { timeoutMs: defaultMs, clamped: false };
  }
  const floored = Math.floor(n);
  if (floored < minMs) return { timeoutMs: minMs, clamped: true };
  if (floored > maxMs) return { timeoutMs: maxMs, clamped: true };
  return { timeoutMs: floored, clamped: false };
}

// ---------------------------------------------------------------------------
// 7. Line scanning / event-driven wait
// ---------------------------------------------------------------------------

export type PatternMatch = {
  stream: ProcessOutputStreamName;
  matchedLine: string;
};

export type ProcessOutputRegistry = {
  getByTaskId(taskId: string): RegisteredProcess | undefined;
  getLiveOutput(taskId: string): ProcessLiveOutput | undefined;
  onProcessTerminal?: (listener: ProcessTerminalListener) => () => void;
};

type InternalWaitOutcome =
  | { kind: "matched"; match: PatternMatch; waitedMs: number; scanIncomplete?: true }
  | { kind: "exited"; waitedMs: number; scanIncomplete?: true }
  | { kind: "timeout"; waitedMs: number; scanIncomplete?: true }
  | { kind: "aborted"; waitedMs: number };

async function waitForLivePattern(args: {
  taskId: string;
  liveOutput: ProcessLiveOutput;
  registry: ProcessOutputRegistry;
  regex: LinearRegex;
  stream: ProcessOutputStreamSelection;
  stdoutSeq?: number;
  stderrSeq?: number;
  timeoutMs: number;
  abortSignal?: AbortSignal;
  now: () => number;
}): Promise<InternalWaitOutcome> {
  const {
    taskId,
    liveOutput,
    registry,
    regex,
    stream,
    stdoutSeq,
    stderrSeq,
    timeoutMs,
    abortSignal,
    now,
  } = args;
  const startedAt = now();
  const elapsed = () => Math.max(0, now() - startedAt);
  const deadlineMs = startedAt + Math.max(0, timeoutMs);
  const streams: ProcessOutputStreamName[] =
    stream === "both" ? ["stdout", "stderr"] : [stream];
  // 逐流记录「已扫描到的行号」：每次唤醒只跑新入环的完整行。
  const scanned = new Map<ProcessOutputStreamName, number>();
  for (const name of streams) {
    scanned.set(name, (name === "stdout" ? stdoutSeq : stderrSeq) ?? 0);
  }
  let scanIncomplete = false;

  const isTerminal = (): boolean => {
    if (liveOutput.isClosed()) return true;
    const record = registry.getByTaskId(taskId);
    return !record || isProcessTaskTerminalStatus(record.status);
  };

  const scan = (): { match: PatternMatch | null; deadline: boolean } => {
    const terminal = isTerminal();
    for (const name of streams) {
      const ring = liveOutput.ring(name);
      // 终态时未换行残行已经是真实输出，先冲刷入环再扫描。
      if (terminal) ring.flush();
      // 曾经丢弃过超长行：任何"没有匹配"的结论都不完整，必须如实透出。
      if (ring.scanIncomplete()) scanIncomplete = true;
      let lastScanned = scanned.get(name) ?? 0;
      for (const entry of ring.linesAfter(lastScanned)) {
        if (entry.matchable === false) {
          // 超长行的占位条目不是真实行：绝不用它做整行匹配。
          scanIncomplete = true;
          lastScanned = entry.seq;
          continue;
        }
        const result = regex.testBounded(entry.text, { deadlineMs, now });
        if (result.lineTruncated) scanIncomplete = true;
        if (result.status === "deadline-exceeded") {
          scanned.set(name, lastScanned);
          return { match: null, deadline: true };
        }
        if (result.status === "line-budget-exceeded") {
          // 单行步数上限用尽：跳过该行继续扫描，绝不冒充整次等待超时。
          scanIncomplete = true;
          lastScanned = entry.seq;
          continue;
        }
        if (result.status === "matched") {
          scanned.set(name, entry.seq);
          return { match: { stream: name, matchedLine: entry.text }, deadline: false };
        }
        lastScanned = entry.seq;
      }
      scanned.set(name, lastScanned);
    }
    return { match: null, deadline: false };
  };

  // Abort wins over buffered output: a caller that already cancelled must not
  // receive a "matched" from data it no longer wants.
  if (abortSignal?.aborted) {
    return { kind: "aborted", waitedMs: elapsed() };
  }

  const terminalAtEntry = isTerminal();
  const immediate = scan();
  if (immediate.deadline) {
    return {
      kind: abortSignal?.aborted ? "aborted" : "timeout",
      waitedMs: elapsed(),
      ...(scanIncomplete ? { scanIncomplete: true as const } : {}),
    };
  }
  if (immediate.match) {
    return {
      kind: "matched",
      match: immediate.match,
      waitedMs: elapsed(),
      ...(scanIncomplete ? { scanIncomplete: true as const } : {}),
    };
  }
  if (terminalAtEntry) {
    return {
      kind: "exited",
      waitedMs: elapsed(),
      ...(scanIncomplete ? { scanIncomplete: true as const } : {}),
    };
  }
  if (timeoutMs <= 0) {
    return {
      kind: "timeout",
      waitedMs: elapsed(),
      ...(scanIncomplete ? { scanIncomplete: true as const } : {}),
    };
  }

  return await new Promise<InternalWaitOutcome>((resolve) => {
    let settled = false;
    let unsubOutput: (() => void) | undefined;
    let unsubTerminal: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      unsubOutput?.();
      unsubTerminal?.();
      if (timer !== undefined) clearTimeout(timer);
      abortSignal?.removeEventListener("abort", onAbort);
    };

    const finish = (outcome: InternalWaitOutcome) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(outcome);
    };

    const incomplete = () =>
      scanIncomplete ? { scanIncomplete: true as const } : {};

    const check = () => {
      if (settled) return;
      const result = scan();
      if (result.match) {
        finish({ kind: "matched", match: result.match, waitedMs: elapsed(), ...incomplete() });
        return;
      }
      if (result.deadline) {
        finish({
          kind: abortSignal?.aborted ? "aborted" : "timeout",
          waitedMs: elapsed(),
          ...incomplete(),
        });
        return;
      }
      if (isTerminal()) {
        finish({ kind: "exited", waitedMs: elapsed(), ...incomplete() });
      }
    };

    function onAbort() {
      finish({ kind: "aborted", waitedMs: elapsed() });
    }

    const onTimeout = () => {
      // Do one last scan before declaring timeout (the trailing fragment only
      // counts when the stream is already terminal).
      const result = scan();
      if (result.match) {
        finish({ kind: "matched", match: result.match, waitedMs: elapsed(), ...incomplete() });
      } else {
        finish({ kind: "timeout", waitedMs: elapsed(), ...incomplete() });
      }
    };

    unsubOutput = liveOutput.subscribe(check);
    unsubTerminal = registry.onProcessTerminal?.((notice) => {
      if (notice.taskId === taskId) check();
    });
    abortSignal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(onTimeout, timeoutMs);

    // Close the window between pre-check and subscription.
    check();
  });
}

// ---------------------------------------------------------------------------
// 8. launchProcess readyPattern wait
// ---------------------------------------------------------------------------

export type ProcessReadyWaitResult = {
  ready: boolean;
  readyOutcome: "matched" | "exited" | "timeout" | "aborted";
  status: ProcessTaskStatus;
  exitCode?: number;
  matchedStream?: ProcessOutputStreamName;
  matchedLine?: string;
  waitedMs: number;
  timeoutMs?: number;
  timeoutClamped?: true;
  scanIncomplete?: true;
  cursor: string;
  stdoutTail: string;
  stderrTail: string;
  truncated: boolean;
};

export async function waitForProcessReady(args: {
  taskId: string;
  liveOutput: ProcessLiveOutput;
  registry: ProcessOutputRegistry;
  regex: LinearRegex;
  timeoutMs?: unknown;
  abortSignal?: AbortSignal;
  now?: () => number;
  tailMaxChars?: number;
}): Promise<ProcessReadyWaitResult> {
  const now = args.now ?? Date.now;
  const tailMaxChars = args.tailMaxChars ?? 4_000;
  const { timeoutMs, clamped } = resolveProcessOutputWaitTimeoutMs(args.timeoutMs, {
    minMs: PROCESS_OUTPUT_MIN_READY_WAIT_MS,
    defaultMs: PROCESS_OUTPUT_DEFAULT_WAIT_MS,
    maxMs: PROCESS_OUTPUT_MAX_WAIT_MS,
  });

  const outcome = await waitForLivePattern({
    taskId: args.taskId,
    liveOutput: args.liveOutput,
    registry: args.registry,
    regex: args.regex,
    stream: "both",
    timeoutMs,
    abortSignal: args.abortSignal,
    now,
  });

  const record = args.registry.getByTaskId(args.taskId);
  const status: ProcessTaskStatus = record?.status ?? "exited";
  const snapshot = args.liveOutput.readSnapshot({ stream: "both", maxChars: tailMaxChars });

  return {
    ready: outcome.kind === "matched",
    readyOutcome: outcome.kind,
    status,
    ...(record?.exitCode !== undefined ? { exitCode: record.exitCode } : {}),
    ...(outcome.kind === "matched"
      ? {
          matchedStream: outcome.match.stream,
          matchedLine: outcome.match.matchedLine,
        }
      : {}),
    waitedMs: outcome.waitedMs,
    ...(outcome.kind === "timeout"
      ? { timeoutMs, ...(clamped ? { timeoutClamped: true as const } : {}) }
      : {}),
    ...(outcome.kind !== "aborted" && outcome.scanIncomplete ? { scanIncomplete: true as const } : {}),
    cursor: snapshot.cursor,
    stdoutTail: snapshot.stdout,
    stderrTail: snapshot.stderr,
    truncated: snapshot.truncated,
  };
}

// ---------------------------------------------------------------------------
// 9. readProcessOutput
// ---------------------------------------------------------------------------

type ReadOutputSnapshotFields = {
  cursor: string;
  stdout: string;
  stderr: string;
  truncated: boolean;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  cursorEvicted: boolean;
  stdoutTotalLines: number;
  stderrTotalLines: number;
};

export type ReadProcessOutputResult =
  | ({
      outcome: "ok";
      taskId: string;
      status: ProcessTaskStatus;
      exitCode?: number;
      outputRef?: string;
      fromCapsule?: true;
    } & ReadOutputSnapshotFields)
  | ({
      outcome: "matched";
      taskId: string;
      status: ProcessTaskStatus;
      exitCode?: number;
      matchedStream: ProcessOutputStreamName;
      matchedLine: string;
      waitedMs: number;
      scanIncomplete?: true;
      outputRef?: string;
      fromCapsule?: true;
    } & ReadOutputSnapshotFields)
  | ({
      outcome: "exited";
      taskId: string;
      status: ProcessTaskStatus;
      exitCode?: number;
      waitedMs: number;
      scanIncomplete?: true;
      outputRef?: string;
      fromCapsule?: true;
    } & ReadOutputSnapshotFields)
  | ({
      outcome: "timeout";
      taskId: string;
      status: ProcessTaskStatus;
      waitedMs: number;
      timeoutMs: number;
      timeoutClamped?: true;
      scanIncomplete?: true;
    } & ReadOutputSnapshotFields)
  | ({
      outcome: "aborted";
      taskId: string;
      status: ProcessTaskStatus;
      waitedMs: number;
    } & ReadOutputSnapshotFields)
  | { outcome: "not-found"; taskId: string; detail: string }
  | {
      outcome: "no-live-stream";
      taskId: string;
      status: ProcessTaskStatus;
      exitCode?: number;
      outputRef?: string;
      detail: string;
    }
  | { outcome: "invalid-arguments"; taskId?: string; detail: string };

function scanCapsuleStream(
  raw: string,
  sinceSeq: number | undefined,
  regex: LinearRegex | null,
  maxChars: number,
): {
  matchedLine: string | null;
  text: string;
  truncated: boolean;
  cursorEvicted: boolean;
  totalLines: number;
  scanIncomplete: boolean;
} {
  const clean = stripAnsi(sanitizeToolOutputText(raw));
  // 整段清洗：跨行 `Bearer` / 跨行 `PASSWORD=` / 多行 PEM 在全文上一次识别。
  const scrubbed = scrubSecrets(clean).cleaned;
  const { lines, endsWithNewline } = splitSanitizedLines(scrubbed);
  const totalLines = lines.length === 0 ? 0 : lines[lines.length - 1]!.seq;
  const selected =
    sinceSeq === undefined ? lines : lines.filter((line) => line.seq > sinceSeq);
  const cursorEvicted =
    sinceSeq !== undefined && lines.length > 0 && sinceSeq < lines[0]!.seq - 1;

  let matchedLine: string | null = null;
  let scanIncomplete = false;
  if (regex) {
    for (const line of selected) {
      const result = regex.testBounded(line.text);
      // 「没有匹配」只有在整行都被扫过时才成立。
      if (result.lineTruncated) scanIncomplete = true;
      if (result.status === "line-budget-exceeded") {
        scanIncomplete = true;
        continue;
      }
      if (result.status === "matched") {
        matchedLine = line.text;
        break;
      }
    }
  }

  const full = joinRingLines(selected, endsWithNewline);
  const trimmed = full.length > maxChars;
  return {
    matchedLine,
    text: trimmed ? full.slice(-maxChars) : full,
    truncated: trimmed || cursorEvicted,
    cursorEvicted,
    totalLines,
    scanIncomplete,
  };
}

export async function runReadProcessOutput(args: {
  taskId: string;
  cursor?: unknown;
  stream?: unknown;
  maxChars?: unknown;
  waitForPattern?: unknown;
  timeoutMs?: unknown;
  registry: ProcessOutputRegistry;
  abortSignal?: AbortSignal;
  now?: () => number;
}): Promise<ReadProcessOutputResult> {
  const now = args.now ?? Date.now;
  const { taskId, registry } = args;

  const streamParsed = resolveProcessOutputStream(args.stream);
  if (!streamParsed.ok) {
    return { outcome: "invalid-arguments", taskId, detail: streamParsed.detail };
  }
  const stream = streamParsed.stream;

  let stdoutSeq: number | undefined;
  let stderrSeq: number | undefined;
  if (args.cursor !== undefined && args.cursor !== null && args.cursor !== "") {
    const parsedCursor = parseProcessOutputCursor(args.cursor);
    if (!parsedCursor.ok) {
      return { outcome: "invalid-arguments", taskId, detail: parsedCursor.detail };
    }
    stdoutSeq = parsedCursor.stdoutSeq;
    stderrSeq = parsedCursor.stderrSeq;
  }

  let compiledPattern: { regex: LinearRegex; pattern: string } | undefined;
  if (args.waitForPattern !== undefined && args.waitForPattern !== null && args.waitForPattern !== "") {
    const compiled = compileProcessOutputPattern(args.waitForPattern, "waitForPattern");
    if (!compiled.ok) {
      return { outcome: "invalid-arguments", taskId, detail: compiled.detail };
    }
    compiledPattern = { regex: compiled.regex, pattern: compiled.pattern };
  }

  const maxChars = resolveProcessOutputMaxChars(args.maxChars);
  const record = registry.getByTaskId(taskId);
  if (!record) {
    return {
      outcome: "not-found",
      taskId,
      detail: `No task ${taskId} is known: it was never started or its record was dropped. Call listProcesses to inspect active handles.`,
    };
  }

  const liveOutput = registry.getLiveOutput(taskId);
  if (!liveOutput) {
    const capsule = record.resultCapsule;
    if (!capsule) {
      return {
        outcome: "no-live-stream",
        taskId,
        status: record.status,
        detail: record.promoted
          ? `Task ${taskId} is a promoted execShell job without live output streaming; its final output is delivered automatically when it finishes.`
          : `Task ${taskId} does not have a live output stream attached.`,
      };
    }

    const includeStdout = stream === "both" || stream === "stdout";
    const includeStderr = stream === "both" || stream === "stderr";
    const hasCursor = stdoutSeq !== undefined || stderrSeq !== undefined;

    // A truncated capsule kept only a tail of each stream: its lines are no
    // longer at the offsets the cursor speaks about, so honouring the cursor
    // would silently re-deliver (or mis-align) already-consumed output.
    if (capsule.truncated && hasCursor) {
      return {
        outcome: "invalid-arguments",
        taskId,
        ...(capsule.spill ? { outputRef: capsule.spill.displayPath } : {}),
        detail: capsule.spill
          ? "Cannot align an incremental cursor against a truncated completed-task capsule because exact stream offsets are unavailable, and a truncated capsule tail is never published (pre-truncation context is unknown); read outputRef with readFile instead."
          : "Cannot align an incremental cursor against a truncated completed-task capsule because exact stream offsets are unavailable, and a truncated capsule tail is never published (pre-truncation context is unknown); no outputRef exists for this task, so no saved tail can be read.",
      };
    }

    // 截断的 capsule 只剩各流的尾部：截断前的头部上下文不可用，无法证明尾部
    // 不含被剥掉 `BEGIN` / `END` 的私钥正文（无标记的正文行看起来就是普通文本）。
    // 因此绝不把上下文缺失的截断尾部当作"已脱敏日志"发布。
    if (capsule.truncated) {
      return {
        outcome: "no-live-stream",
        taskId,
        status: record.status,
        ...(record.exitCode !== undefined ? { exitCode: record.exitCode } : {}),
        ...(capsule.spill ? { outputRef: capsule.spill.displayPath } : {}),
        detail: capsule.spill
          ? "Task output was truncated before capture; read outputRef with readFile instead of truncated capsule fallback."
          : "Task output was truncated before capture and no saved tail exists for this task, so the truncated capsule cannot be published or recovered.",
      };
    }

    const stdoutView = includeStdout
      ? scanCapsuleStream(
          capsule.stdout,
          stdoutSeq,
          compiledPattern?.regex ?? null,
          maxChars,
        )
      : null;
    const stderrView = includeStderr
      ? scanCapsuleStream(
          capsule.stderr,
          stderrSeq,
          compiledPattern?.regex ?? null,
          maxChars,
        )
      : null;
    const capsuleScanIncomplete = Boolean(stdoutView?.scanIncomplete) ||
      Boolean(stderrView?.scanIncomplete);

    const base: ReadOutputSnapshotFields & {
      taskId: string;
      status: ProcessTaskStatus;
      exitCode?: number;
      outputRef?: string;
      fromCapsule?: true;
    } = {
      taskId,
      status: record.status,
      ...(record.exitCode !== undefined ? { exitCode: record.exitCode } : {}),
      cursor: formatProcessOutputCursor(
        splitSanitizedLines(capsule.stdout).lines.length,
        splitSanitizedLines(capsule.stderr).lines.length,
      ),
      stdout: stdoutView?.text ?? "",
      stderr: stderrView?.text ?? "",
      truncated: capsule.truncated || Boolean(stdoutView?.truncated) || Boolean(stderrView?.truncated),
      stdoutTruncated: capsule.truncated || Boolean(stdoutView?.truncated),
      stderrTruncated: capsule.truncated || Boolean(stderrView?.truncated),
      cursorEvicted: Boolean(stdoutView?.cursorEvicted) || Boolean(stderrView?.cursorEvicted),
      stdoutTotalLines: stdoutView?.totalLines ?? 0,
      stderrTotalLines: stderrView?.totalLines ?? 0,
      ...(capsule.spill ? { outputRef: capsule.spill.displayPath } : {}),
      fromCapsule: true as const,
    };

    if (!compiledPattern) return { outcome: "ok", ...base };
    if (stdoutView?.matchedLine != null) {
      return {
        outcome: "matched",
        ...base,
        matchedStream: "stdout",
        matchedLine: stdoutView.matchedLine,
        waitedMs: 0,
        ...(capsuleScanIncomplete ? { scanIncomplete: true as const } : {}),
      };
    }
    if (stderrView?.matchedLine != null) {
      return {
        outcome: "matched",
        ...base,
        matchedStream: "stderr",
        matchedLine: stderrView.matchedLine,
        waitedMs: 0,
        ...(capsuleScanIncomplete ? { scanIncomplete: true as const } : {}),
      };
    }
    return {
      outcome: "exited",
      ...base,
      waitedMs: 0,
      ...(capsuleScanIncomplete ? { scanIncomplete: true as const } : {}),
    };
  }

  if (!compiledPattern) {
    const snapshot = liveOutput.readSnapshot({ stream, stdoutSeq, stderrSeq, maxChars });
    const outputRef = record.resultCapsule?.spill?.displayPath;
    return {
      outcome: "ok",
      taskId,
      status: record.status,
      ...(record.exitCode !== undefined ? { exitCode: record.exitCode } : {}),
      ...snapshot,
      ...(outputRef ? { outputRef } : {}),
    };
  }

  const { timeoutMs, clamped } = resolveProcessOutputWaitTimeoutMs(args.timeoutMs);
  const waitResult = await waitForLivePattern({
    taskId,
    liveOutput,
    registry,
    regex: compiledPattern.regex,
    stream,
    stdoutSeq,
    stderrSeq,
    timeoutMs,
    abortSignal: args.abortSignal,
    now,
  });

  const latestRecord = registry.getByTaskId(taskId) ?? record;
  const snapshot = liveOutput.readSnapshot({ stream, stdoutSeq, stderrSeq, maxChars });
  const outputRef = latestRecord.resultCapsule?.spill?.displayPath;

  if (waitResult.kind === "matched") {
    return {
      outcome: "matched",
      taskId,
      status: latestRecord.status,
      ...(latestRecord.exitCode !== undefined ? { exitCode: latestRecord.exitCode } : {}),
      matchedStream: waitResult.match.stream,
      matchedLine: waitResult.match.matchedLine,
      waitedMs: waitResult.waitedMs,
      ...(waitResult.scanIncomplete ? { scanIncomplete: true as const } : {}),
      ...snapshot,
      ...(outputRef ? { outputRef } : {}),
    };
  }
  if (waitResult.kind === "exited") {
    return {
      outcome: "exited",
      taskId,
      status: latestRecord.status,
      ...(latestRecord.exitCode !== undefined ? { exitCode: latestRecord.exitCode } : {}),
      waitedMs: waitResult.waitedMs,
      ...(waitResult.scanIncomplete ? { scanIncomplete: true as const } : {}),
      ...snapshot,
      ...(outputRef ? { outputRef } : {}),
    };
  }
  if (waitResult.kind === "aborted") {
    return {
      outcome: "aborted",
      taskId,
      status: latestRecord.status,
      waitedMs: waitResult.waitedMs,
      ...snapshot,
    };
  }
  return {
    outcome: "timeout",
    taskId,
    status: latestRecord.status,
    waitedMs: waitResult.waitedMs,
    timeoutMs,
    ...(clamped ? { timeoutClamped: true as const } : {}),
    ...(waitResult.scanIncomplete ? { scanIncomplete: true as const } : {}),
    ...snapshot,
  };
}
