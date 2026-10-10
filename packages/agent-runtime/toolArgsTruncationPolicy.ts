// packages/agent-runtime/toolArgsTruncationPolicy.ts
//
// tool_call arguments 被上游截断时的「按风险分档」降级 + 诊断指纹。
//
// 与 outboundHistorySanitize.repairTruncatedToolArguments 并列（不改其语义）：
// 那个函数只做「内容零损失」补全（截断点在字符串外）；本模块处理它修不了的
// 一类——截断点落在字符串内部，只能靠**丢弃未闭合的尾部数组元素**才能得到合法 JSON。
// 这是有损修补，因此只允许对白名单内的交互/只读工具启用。

import { createHash } from "node:crypto";
import { hasParsableObjectArguments } from "./outboundHistorySanitize";

/**
 * 允许「丢弃未闭合尾部数组元素」降级的工具白名单（exact name）。
 *
 * 入选条件（三条都要满足）：
 * 1. 无持久副作用：执行不写文件/不跑命令/不改远端数据；
 * 2. 参数的数组成员是「并列备选项」，丢掉最后一个只会让选项变少，
 *    不会改变其余成员的语义；
 * 3. 降级结果对人类/模型可见（调用方追加 [tool-args-repair] 提示）。
 *
 * - `ask_user`：纯交互面板（让用户在 2～5 个选项里点选），choices/questions
 *   是并列选项，丢掉被截断的最后一项后面板仍可用，用户可见且可再追问。
 *
 * 刻意**不收录**：writeFile / editFile（content/edits 被截断=写坏文件）、
 * execShell/exec_command（命令被截短=执行错误命令）及任何有持久副作用的工具。
 * 只读工具（readFile/grep 等）的数组参数（paths 等）丢尾会静默缩小查询范围且
 * 模型不一定察觉，收益小于误导风险，暂不收录；需要时在此显式加入并补测试。
 */
export const TRUNCATION_TAIL_DROP_ALLOWED_TOOLS: ReadonlySet<string> = new Set([
  "ask_user",
]);

export function isTailDropRepairAllowed(toolName: unknown): boolean {
  return typeof toolName === "string" && TRUNCATION_TAIL_DROP_ALLOWED_TOOLS.has(toolName);
}

export type TruncationScan = {
  /** EOF 是否落在字符串字面量内部。 */
  inString: boolean;
  /** 结构本身已坏（括号不匹配）。 */
  malformed: boolean;
  /**
   * 仍处于打开状态的数组中、最深的一个「元素分隔逗号」位置及其闭合符。
   * 该逗号之后的全部内容都属于同一个未闭合的尾部元素。
   */
  tailArrayComma: { index: number; closers: string } | null;
};

/** 单次扫描：跟踪字符串/转义与容器栈，定位最深的仍打开数组的元素逗号。 */
export function scanTruncation(input: string): TruncationScan {
  const stack: string[] = [];
  // commaAtDepth[d] = 深度 d（栈长度 d）的容器里最后一个数组元素逗号；容器关闭即作废。
  const commaAtDepth: Array<{ index: number; closers: string } | undefined> = [];
  let inString = false;
  let escaped = false;

  const closersOf = () =>
    stack
      .slice()
      .reverse()
      .map((ch) => (ch === "{" ? "}" : "]"))
      .join("");

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch);
      commaAtDepth[stack.length] = undefined;
    } else if (ch === "}" || ch === "]") {
      const open = stack.pop();
      if (open !== (ch === "}" ? "{" : "[")) {
        return { inString, malformed: true, tailArrayComma: null };
      }
      commaAtDepth[stack.length + 1] = undefined;
    } else if (ch === "," && stack[stack.length - 1] === "[") {
      commaAtDepth[stack.length] = { index: i, closers: closersOf() };
    }
  }

  let tailArrayComma: TruncationScan["tailArrayComma"] = null;
  for (let d = stack.length; d >= 1; d -= 1) {
    const c = commaAtDepth[d];
    if (c && stack[d - 1] === "[") {
      tailArrayComma = c;
      break;
    }
  }
  return { inString, malformed: false, tailArrayComma };
}

export type TailDropRepair = {
  repaired: string;
  /** 被丢弃的尾部字符数（用于提示/诊断）。 */
  droppedChars: number;
};

/**
 * 有损降级：丢弃最深的仍打开数组里「未闭合的尾部元素」，原样保留其之前的
 * 全部完整元素与所有前缀成员，再补闭合符。
 *
 * 仅当同时满足才返回结果（否则 null，调用方保持原报错路径）：
 * - 工具在白名单内（本函数自己校验，调用方无法绕过）；
 * - 结构未损坏、确实存在一个仍打开的数组且其中至少有一个完整元素（逗号证明）；
 * - 被丢弃的内容全部位于该逗号之后（即确实是尾部未闭合元素）；
 * - 结果能解析为非空对象。
 */
export function repairTruncatedToolArgumentsDroppingTail(
  toolName: unknown,
  raw: unknown,
): TailDropRepair | null {
  if (!isTailDropRepairAllowed(toolName)) return null;
  if (typeof raw !== "string") return null;
  const scan = scanTruncation(raw);
  if (scan.malformed || !scan.tailArrayComma) return null;
  const { index, closers } = scan.tailArrayComma;
  const head = raw.slice(0, index).replace(/\s+$/, "");
  if (head === "") return null;
  const candidate = head + closers;
  try {
    const parsed: unknown = JSON.parse(candidate);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length > 0
    ) {
      return { repaired: candidate, droppedChars: raw.length - index };
    }
  } catch {
    // 不可解析 → 拒绝
  }
  return null;
}

export type ToolArgsDiagnosticContext = {
  provider?: string;
  model?: string;
  finishReason?: string;
};

export const TOOL_ARGS_DEBUG_ENV = "NOLO_CLI_DEBUG_TOOL_ARGS";
const DEBUG_TAIL_MAX = 200;

/**
 * 构造一行诊断（CLI 宿主下走 console.warn → consoleBridge → ring buffer / 滚动日志；
 * 非 CLI 宿主是否安装该桥未核实，届时 warn 落到 stderr 亦为合理默认）。
 * 默认只含长度 / sha256 前缀 / inString / provider·model·finish_reason；
 * 仅 NOLO_CLI_DEBUG_TOOL_ARGS=1 时附带 raw 尾部 ≤200 字符。
 */
export function buildToolArgsDiagnosticLine(args: {
  toolName: string;
  raw: string;
  outcome: "rejected" | "tail-dropped";
  context?: ToolArgsDiagnosticContext;
  env?: Record<string, string | undefined>;
}): string {
  const { toolName, raw, outcome, context } = args;
  const env = args.env ?? process.env;
  const scan = scanTruncation(raw);
  const sha = createHash("sha256").update(raw).digest("hex").slice(0, 12);
  const parts = [
    `[tool-args-diag] ${toolName} ${outcome}`,
    `len=${raw.length}`,
    `sha256=${sha}`,
    `inString=${scan.inString}`,
    `provider=${context?.provider ?? "unknown"}`,
    `model=${context?.model ?? "unknown"}`,
    `finish_reason=${context?.finishReason ?? "unknown"}`,
  ];
  if (env[TOOL_ARGS_DEBUG_ENV] === "1") {
    parts.push(`tail=${JSON.stringify(raw.slice(-DEBUG_TAIL_MAX))}`);
  }
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// 不可解析参数的类别判定（只判类 + 只改措辞，不参与任何容错分支）
//
// 历史证据（本地 LevelDB 只读扫描：444,662 keys / 127,325 条带 tool_calls 的
// assistant 记录）：坏参数 29 条（0.023%），其中未转义控制字符（多为 ask_user
// 多行参数）19 条、数值区间未加引号（`"lines": 300-400`）5 条——这两类尾部
// 完整，是产出的 JSON 语法非法，不是传输层丢字节；真截断形态（`{`、
// `{"endLine": 700`）只有 1–3 条。旧文案一律写「疑似上游流式截断」，把约
// 24/29 的语法错误误归因成传输层故障，会污染后续排查与决策，故在此把判定与
// 措辞按类别分开。以下函数全为纯函数：只读入参、不改消息、不参与任何
// 修复/拒绝/重试判定。
// ---------------------------------------------------------------------------

export type UnparsableToolArgsKind = "truncated" | "malformed";

/**
 * 与 {@link scanTruncation} 同一套字符串/转义规则的轻量扫描：只回答
 * 「容器是否全部正常闭合」（EOF 时仍有未闭合容器，或出现括号错配）。
 * 独立成函数而不复用 scanTruncation 的返回值，是为了不动后者的既有语义与
 * 字段（它是行为代码）。
 */
function hasUnclosedOrMismatchedContainers(input: string): boolean {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      if (stack.pop() !== (ch === "}" ? "{" : "[")) return true;
    }
  }
  return stack.length > 0;
}

/**
 * 纯判定：对「JSON.parse 失败的 raw 参数」归类。
 * - `truncated`：EOF 落在字符串字面量内，或括号不平衡 —— 上游流式丢尾的形态
 *   （`{"endLine": 700`、`{"command": "ls`、`{`、`{"a": [1, 2}`）；
 * - `malformed`：结构完整闭合、却仍不是合法 JSON —— 语法非法但没丢字节
 *   （`"lines": 300-400` 未加引号、字符串里未转义的控制字符）。
 * 非字符串（undefined/null/数字）不属于截断形态 → `malformed`。
 */
export function classifyUnparsableToolArgs(
  raw: unknown,
): UnparsableToolArgsKind {
  if (typeof raw !== "string") return "malformed";
  // EOF 落在字符串内：复用既有扫描的字符串状态信号（语义与返回值不变）。
  if (scanTruncation(raw).inString) return "truncated";
  return hasUnclosedOrMismatchedContainers(raw) ? "truncated" : "malformed";
}

export type UnparsableToolArgsBreakdown = {
  truncated: number;
  malformed: number;
};

/**
 * 纯诊断计数：统计一组出站消息里 arguments 不可解析的 tool_call 各归哪一类。
 * 只读、不改消息内容；「不可解析」的口径与降级判定同源
 * （{@link hasParsableObjectArguments}），因此健康调用不会被算进来。
 */
export function countUnparsableToolArgKinds(
  messages: readonly unknown[],
): UnparsableToolArgsBreakdown {
  const breakdown: UnparsableToolArgsBreakdown = { truncated: 0, malformed: 0 };
  if (!Array.isArray(messages)) return breakdown;
  for (const message of messages) {
    const entry = message as
      | { role?: unknown; tool_calls?: unknown }
      | null
      | undefined;
    if (entry?.role !== "assistant" || !Array.isArray(entry.tool_calls)) continue;
    for (const call of entry.tool_calls) {
      const raw = (
        call as { function?: { arguments?: unknown } } | null | undefined
      )?.function?.arguments;
      if (typeof raw !== "string" || hasParsableObjectArguments(raw)) continue;
      breakdown[classifyUnparsableToolArgs(raw)] += 1;
    }
  }
  return breakdown;
}

/**
 * 纯展示：把分类计数压成告警里的括注内容（不含括号本身）。
 * 两类同时出现时都报；只有一类时报该类别；一条都没统计到（坏参数来自被降级
 * 的 tool 结果等非 arguments 位置）时给中性措辞，不猜成因。
 */
export function describeUnparsableToolArgs(
  breakdown: UnparsableToolArgsBreakdown,
): string {
  const { truncated, malformed } = breakdown;
  if (truncated > 0 && malformed > 0) {
    return `${truncated} suspected upstream stream truncation / ${malformed} malformed JSON arguments, not truncation`;
  }
  if (truncated > 0) return "suspected upstream stream truncation";
  if (malformed > 0) return "malformed JSON arguments, not truncation";
  return "cause unclassified";
}
