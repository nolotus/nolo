// packages/agent-runtime/toolOutputSanitizer.ts
// 工具输出控制序列清洗器（Tool output control-sequence sanitizer）。
//
// 威胁模型：沙盒内进程（execShell / launchProcess / 任何宿主命令）可以把任意字节
// 写进 stdout/stderr，而这些文本最终会进入 provider 可见 transcript、UI 日志与
// 人审报告。不加清洗时至少有三类攻击成立：
//   1. OSC 52（`ESC ] 52 ; c ; <base64> BEL`）—— 读写宿主剪贴板，把数据带出沙盒
//      或往用户的剪贴板里塞内容；
//   2. CSI 覆写（`ESC [ 2K` / 光标移动 / `\r`）—— 在终端里抹掉上一行再打一行，
//      让「FAIL」显示成「PASS」，同时欺骗人类与审核模型；
//   3. 畸形 UTF-8 —— 未解码的非法字节可能炸掉下游流式分词器（provider 侧
//      tokenizer 或 JSON 编码）。
//
// 契约（本模块的对外不变量）：
// - **只删不可见控制序列，不改可见字符**：除 `\n`(0x0A) `\t`(0x09) 外的 C0、DEL(0x7F)、
//   全部 C1(0x80–0x9F) 与 ESC 引导的转义序列一律删除；可见文本逐码点原样保留。
// - **幂等**：`sanitize(sanitize(x)) === sanitize(x)`，重复投影不会让字节漂移
//   （provider 前缀缓存依赖这一点，见 docs/plans/2026-09-05-tool-output-cache-stability.md）。
// - **不吞掉任何可见字符**：序列必须在 `MAX_CONTROL_SEQUENCE_CHARS` 码元内找到终止符
//   才算「已确认的序列」，整段删除；找不到终止符（未终止/超长/畸形）就只丢引入控制器
//   本身，序列体按普通文本保留。否则 `ESC ] 52 ;` + 超长载荷能把紧随其后的可见文本
//   （例如 `FAIL`）一起吃掉——那是比 `ESC[2K\r` 覆写更隐蔽的「删除型伪造」。
// - **纯函数、零依赖、微秒级**：绝大多数输出不含控制字符，`NEEDS_SANITIZE_RE`
//   预检直接原样返回同一个字符串引用。
//
// ANSI 颜色码（SGR，`ESC [ 3 1 m` 等）**同样被剥离**，理由不是「颜色不安全」而是：
//   1. provider 可见文本是给语言模型的字节流，颜色在文本/Markdown 渲染里不可见，
//      只贡献 token 噪声，并让同一段内容的字节随终端差异漂移（前缀缓存不稳）；
//   2. 「只放行安全 SGR 子集」需要一个参数白名单解析器：`4:3`、`38;5;n`、`38;2;…`、
//      中间字节、`ESC ( B` 之类字符集切换都能把「看起来安全」的正则绕过，白名单
//      的维护成本远高于收益；
//   3. UI 真正需要着色时应当按结构渲染（tool 名 / 成功失败 / stdout vs stderr），
//      那是 UI 侧的语义信息，不需要从子进程输出里解析颜色。
// 因此：**provider 可见版本全部剥离；原始字节要留存就只留在审计侧（进程 spill 文件、
// 任务日志），不进 transcript。**
//
// 本模块不做的事：不做 HTML 转义、不剥零宽字符/双向控制符（那条规则属于用户文案的
// `balanceErrorPatterns.stripControlChars`），也不改写空白——`\r` 只删除，不模拟
// 覆盖语义，于是 `FAIL\rPASS` 清洗后是 `FAILPASS`：两段文本都还在，无法伪造单一结论。

/** 被替换掉的非法 UTF-8 / 孤立代理项使用的替换字符（U+FFFD）。 */
export const SANITIZE_REPLACEMENT_CHAR = "\uFFFD";

/**
 * 判定「一个控制序列算不算已确认序列」时最多向前看的码元数。超过上限仍没看到终止符
 * 就按畸形/未终止处理：只丢引入控制器，序列体一个可见字符都不删。
 */
export const MAX_CONTROL_SEQUENCE_CHARS = 256;

const ESC = 0x1b;
const BEL = 0x07;
const LINE_FEED = 0x0a;
const TAB = 0x09;
const DEL = 0x7f;

// 8-bit C1 引入符（等价于 7-bit 的 `ESC <final>` 形式）。裸 C1 字节在 UTF-8 里本应
// 非法，但 latin1 解码、`\u009b` 转义、JSON 里的 `\u009b` 都能把它们送进来。
const C1_DCS = 0x90;
const C1_SOS = 0x98;
const C1_CSI = 0x9b;
const C1_ST = 0x9c;
const C1_OSC = 0x9d;
const C1_PM = 0x9e;
const C1_APC = 0x9f;

const HIGH_SURROGATE_MIN = 0xd800;
const HIGH_SURROGATE_MAX = 0xdbff;
const LOW_SURROGATE_MIN = 0xdc00;
const LOW_SURROGATE_MAX = 0xdfff;

/**
 * 预检：文本里是否真的存在需要清洗的码元。
 * - `\u0000-\u0008` / `\u000b-\u001f`：除 `\t`(09) `\n`(0a) 外的 C0（含 `\r`）
 * - `\u007f`：DEL
 * - `\u0080-\u009f`：C1
 * - `\p{Cs}`：孤立代理项（`/u` 下合法代理对合成一个码点，不会命中，故 emoji 不受影响）
 */
const NEEDS_SANITIZE_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]|\p{Cs}/u;

function isC1Introducer(code: number): boolean {
  return (
    code === C1_CSI ||
    code === C1_OSC ||
    code === C1_DCS ||
    code === C1_SOS ||
    code === C1_PM ||
    code === C1_APC
  );
}

/**
 * 扫描结果标记：在码元上限内没找到终止符。
 *
 * 命中这个标记时**不能**把已扫描的字节当作「已确认的序列体」删除：序列体里可以有
 * 任意可见字符，删掉它们等于给攻击者一个更隐蔽的伪造手段——把 `FAIL` 藏在一个
 * 超长未终止的引导符后面，让它从 transcript 里消失（比 `ESC[2K\r` 覆写更难发现，
 * 且违反「只删控制序列、不改可见文本」的契约）。调用方看到该标记时只丢引入控制器
 * 本身，其余字节按普通文本原样保留。
 */
const UNTERMINATED_SEQUENCE = -1;

/** CSI 体：`0x20–0x3F` 参数/中间字节序列 + `0x40–0x7E` 终止字节。 */
function skipCsiBody(text: string, start: number, limit: number): number {
  let i = start;
  while (i < limit) {
    const code = text.charCodeAt(i);
    if (code >= 0x40 && code <= 0x7e) return i + 1;
    if (code >= 0x20 && code <= 0x3f) {
      i += 1;
      continue;
    }
    // 非 CSI 合法字节（换行、ESC、C0…）：序列在此中断。丢掉已消费的引导符，
    // 当前字节留给主循环按普通规则处理。
    return i;
  }
  return UNTERMINATED_SEQUENCE;
}

/** OSC / DCS / SOS / PM / APC 体：`BEL`、`ESC \`（ST）或 C1 ST 终止。 */
function skipControlStringBody(
  text: string,
  start: number,
  limit: number,
): number {
  const length = text.length;
  let i = start;
  while (i < limit) {
    const code = text.charCodeAt(i);
    if (code === BEL || code === C1_ST) return i + 1;
    if (code === ESC && i + 1 < length && text.charCodeAt(i + 1) === 0x5c) {
      return Math.min(i + 2, limit);
    }
    i += 1;
  }
  // 控制串的体可以合法包含任意可见文本，没看到终止符就不能把它当成序列体删掉。
  return UNTERMINATED_SEQUENCE;
}

/**
 * 从 `ESC` 处开始跳过整个转义序列，返回下一个待扫描的下标。
 * 任何畸形/超长形态都至少消费掉 `ESC` 本体（不返回原下标），保证不残留裸 ESC；
 * 但**只丢控制器本身**，绝不为了「看起来像序列」而删掉后面的可见文本（见
 * `UNTERMINATED_SEQUENCE`）。
 */
function skipEscapeSequence(text: string, escIndex: number): number {
  const length = text.length;
  const limit = Math.min(length, escIndex + MAX_CONTROL_SEQUENCE_CHARS);
  const leadIndex = escIndex + 1;
  if (leadIndex >= length) return leadIndex;
  const lead = text.charCodeAt(leadIndex);
  if (lead === 0x5b /* [ */) {
    const csiEnd = skipCsiBody(text, leadIndex + 1, limit);
    return csiEnd === UNTERMINATED_SEQUENCE ? escIndex + 1 : csiEnd;
  }
  if (
    lead === 0x5d /* ] OSC */ ||
    lead === 0x50 /* P DCS */ ||
    lead === 0x58 /* X SOS */ ||
    lead === 0x5e /* ^ PM */ ||
    lead === 0x5f /* _ APC */
  ) {
    const stringEnd = skipControlStringBody(text, leadIndex + 1, limit);
    return stringEnd === UNTERMINATED_SEQUENCE ? escIndex + 1 : stringEnd;
  }
  // 其余：`ESC` + 中间字节(0x20–0x2F)* + 终止字节(0x30–0x7E)。
  let j = leadIndex;
  while (j < limit && text.charCodeAt(j) >= 0x20 && text.charCodeAt(j) <= 0x2f) {
    j += 1;
  }
  if (j < limit) {
    const final = text.charCodeAt(j);
    if (final >= 0x30 && final <= 0x7e) return j + 1;
  }
  // 退化为「孤立的 ESC（后面是控制字符/另一个 ESC）」：只丢 ESC，后续字节重新判定。
  return escIndex + 1;
}

/** 8-bit C1 引入符：与 `ESC <final>` 形式同构，只是没有 ESC 前缀。 */
function skipC1Sequence(text: string, index: number): number {
  const limit = Math.min(text.length, index + MAX_CONTROL_SEQUENCE_CHARS);
  const code = text.charCodeAt(index);
  const bodyEnd =
    code === C1_CSI
      ? skipCsiBody(text, index + 1, limit)
      : skipControlStringBody(text, index + 1, limit);
  // 与 7-bit `ESC` 形式同一契约：没找到终止符就只丢这个 C1 控制器本身，
  // 后面的可见字节按普通文本保留（否则同样的删除型伪造从这里复活）。
  return bodyEnd === UNTERMINATED_SEQUENCE ? index + 1 : bodyEnd;
}

/**
 * 清洗工具输出文本：删除 ANSI/VT 控制序列、C0（保留 `\n` `\t`）、DEL、C1，
 * 并把孤立代理项替换为 U+FFFD。可见字符逐码点原样保留。
 *
 * 幂等、无副作用；不含需清洗码元时返回**同一个字符串引用**（调用方可用 `===` 判等）。
 */
export function sanitizeToolOutputText(text: string): string {
  if (typeof text !== "string" || text.length === 0) return text;
  if (!NEEDS_SANITIZE_RE.test(text)) return text;

  const out: string[] = [];
  const length = text.length;
  let plainStart = 0;
  let i = 0;

  /** 丢掉 [i, end) 这一段，并让下一段普通文本从 end 开始。 */
  const dropRange = (end: number) => {
    if (plainStart < i) out.push(text.slice(plainStart, i));
    i = end;
    plainStart = end;
  };

  while (i < length) {
    const code = text.charCodeAt(i);

    if (code === LINE_FEED || code === TAB) {
      i += 1;
      continue;
    }

    if (code === ESC) {
      dropRange(skipEscapeSequence(text, i));
      continue;
    }

    if (isC1Introducer(code)) {
      dropRange(skipC1Sequence(text, i));
      continue;
    }

    if (code < 0x20 || code === DEL || (code >= 0x80 && code <= 0x9f)) {
      // 其余 C0（含 `\r` 复写）、DEL、以及没有合法引入语义的裸 C1 字节。
      dropRange(i + 1);
      continue;
    }

    if (code >= HIGH_SURROGATE_MIN && code <= HIGH_SURROGATE_MAX) {
      const low = text.charCodeAt(i + 1);
      if (low >= LOW_SURROGATE_MIN && low <= LOW_SURROGATE_MAX) {
        i += 2; // 合法代理对（astral 码点，如 emoji）原样保留
        continue;
      }
      if (plainStart < i) out.push(text.slice(plainStart, i));
      out.push(SANITIZE_REPLACEMENT_CHAR);
      i += 1;
      plainStart = i;
      continue;
    }

    if (code >= LOW_SURROGATE_MIN && code <= LOW_SURROGATE_MAX) {
      if (plainStart < i) out.push(text.slice(plainStart, i));
      out.push(SANITIZE_REPLACEMENT_CHAR);
      i += 1;
      plainStart = i;
      continue;
    }

    i += 1;
  }

  if (plainStart < length) out.push(text.slice(plainStart));
  return out.join("");
}

/**
 * 字节入口：先按 UTF-8 宽松解码（非法字节 → U+FFFD，等价于「非法 UTF-8 → U+FFFD」），
 * 再走文本清洗。给仍然持有原始 Buffer 的调用方（进程流、spill 回读）使用。
 */
export function decodeAndSanitizeToolOutputBytes(bytes: Uint8Array): string {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return sanitizeToolOutputText(decoder.decode(bytes));
}

/** 非字符串内容（图片块、结构化内容）原样透传：本模块只清洗文本。 */
export function sanitizeToolOutputContent<T>(content: T): T {
  return typeof content === "string"
    ? (sanitizeToolOutputText(content) as unknown as T)
    : content;
}
