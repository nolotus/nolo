// packages/agent-runtime/toolArgsShape.ts
//
// tool_call arguments 的**唯一**纯形态扫描/归类：只读入参、不改消息、无 IO、
// 无 crypto、不依赖 sanitizer。
//
// 为什么单独成模块：toolArgsTruncationPolicy 导入 outboundHistorySanitize
// 的 hasParsableObjectArguments，而投影统计（outboundHistorySanitize 的毒丸降级
// 结果）也需要这份分类判定——若后者反向导入 policy 就会成环。把「扫描 + 分类」
// 放在这里，两边都能依赖它而不成环。
//
// 单源契约（独立复核 2026-10-10 裁定 §1「推荐最终形态」）：字符/转义/容器栈的
// 状态机**只有一份**，即下面的 scanRawToolArgs。它一次给出四类事实：
//   - EOF 是否落在字符串字面量内部（inString）；
//   - 括号是否错配（mismatched，结构本身已坏）；
//   - EOF 时是否仍有未闭合容器（unclosed）；
//   - 最深仍打开数组的最后一个元素逗号坐标（tailArrayComma，丢尾修复用）。
// 两个出口都读这一份事实，不再各留一套扫描：
//   - 分类（本模块 classifyUnparsableToolArgs）读 mismatched / unclosed；
//   - policy 的公开 scanTruncation 是它的**同义投影**：返回里 `malformed` 仍只表示
//     括号错配，「EOF 仍有未闭合容器」不出现在公开返回（迁移前语义，一字不改）。
// 注意：扫描本体自身是纯函数，放进这个零依赖模块不需要任何反向依赖。
//
// 边界：只分类形状，不改坏参数判定/修复/降级/配对政策，也不把 `truncated`
// 形态标签升级成「已证实上游截断」。

export type UnparsableToolArgsKind = "truncated" | "malformed";

/**
 * 公开扫描结果（与 toolArgsTruncationPolicy.scanTruncation 迁移前逐字一致；
 * 该类型定义随扫描本体一起移入本模块，policy 侧仍按同名 re-export）。
 */
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

/**
 * 唯一状态机的内部结果：比公开 {@link TruncationScan} 多一个「EOF 是否仍有未闭合
 * 容器」事实（分类需要，公开返回刻意不含它），并把它与「括号错配」区分开——
 * 二者都意味着尾部不完整，但只有错配表示结构已坏。
 */
type RawToolArgsScan = {
  inString: boolean;
  /** 括号错配：闭合符与栈顶不匹配。 */
  mismatched: boolean;
  /** EOF 时栈内仍有未闭合容器。 */
  unclosed: boolean;
  tailArrayComma: TruncationScan["tailArrayComma"];
};

/**
 * 单遍状态机：跟踪字符串字面量边界（含 `\` 转义、「转义把引号吃掉」的情形）、
 * 容器栈（含括号错配）与最深仍打开数组的元素逗号。
 *
 * 括号错配即刻返回（后续 token 已不可信，因此不再跟踪逗号、也不再看未闭合），
 * 与迁移前的 scanTruncation 行为一致。
 */
function scanRawToolArgs(input: string): RawToolArgsScan {
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
        return {
          inString,
          mismatched: true,
          unclosed: false,
          // 结构已坏：与迁移前一致，不再给出尾部数组逗号坐标。
          tailArrayComma: null,
        };
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
  return {
    inString,
    mismatched: false,
    unclosed: stack.length > 0,
    tailArrayComma,
  };
}

/**
 * 公开扫描：{@link scanRawToolArgs} 的同义投影。
 *
 * 签名与返回语义与迁移到本模块前**逐字一致**：`malformed` 仍只表示「括号错配」，
 * 「EOF 仍有未闭合容器」**不会**被解释成公开返回里的 `malformed`（它只影响
 * {@link classifyUnparsableToolArgs} 的归类；丢尾修复依赖的正是这一区别）。
 */
export function scanTruncation(input: string): TruncationScan {
  const scan = scanRawToolArgs(input);
  return {
    inString: scan.inString,
    malformed: scan.mismatched,
    tailArrayComma: scan.tailArrayComma,
  };
}

/**
 * 纯判定：对「JSON.parse 失败的 raw 参数」归类。
 * - `truncated`：EOF 落在字符串字面量内，或容器未闭合 / 括号错配 —— 上游流式丢尾
 *   的形态（`{"endLine": 700`、`{"command": "ls`、`{`、`{"a": [1, 2}`）；
 * - `malformed`：结构完整闭合、却仍不是合法 JSON —— 语法非法但没丢字节
 *   （`"lines": 300-400` 未加引号、字符串里未转义的控制字符）。
 * 非字符串（undefined/null/数字）不属于截断形态 → `malformed`。
 */
export function classifyUnparsableToolArgs(
  raw: unknown,
): UnparsableToolArgsKind {
  if (typeof raw !== "string") return "malformed";
  const scan = scanRawToolArgs(raw);
  // EOF 落在字符串内：尾部不完整（字符串状态信号）。
  if (scan.inString) return "truncated";
  // 容器未闭合或括号错配：尾部不完整。
  return scan.mismatched || scan.unclosed ? "truncated" : "malformed";
}
