export type ToolOutputProjectionProfile = {
  maxChars: number;
  headRatio: number;
  /**
   * Optional historical-retention cap. Read-family tools set it so small read
   * results survive historical compression intact: the model keeps the content
   * in context and does not pay another tool step to re-read the same range.
   * Tools without it keep the caller-provided historicalMaxChars. The read
   * executors reuse the same cap (resolveHistoricalToolContentCap) as their
   * dedup-ledger retention gate, so "not resending" and "still in history"
   * can never disagree.
   */
  historicalMaxChars?: number;
};

// Aligns with server read_file upstream compaction so multi-round tool loops do
// not resend huge tool payloads on every LLM call within the same turn.
// In-turn, cross-turn and first-appearance budgets are all the per-tool profile
// `maxChars` below (single stable projection); MAX_IN_TURN_TOOL_CONTENT_CHARS is
// retained as the default profile value.
export const MAX_IN_TURN_TOOL_CONTENT_CHARS = 4000;

export const DEFAULT_TOOL_OUTPUT_PROFILE: ToolOutputProjectionProfile = {
  maxChars: MAX_IN_TURN_TOOL_CONTENT_CHARS,
  headRatio: 0.5,
};

export const TOOL_OUTPUT_PROFILES: Record<string, ToolOutputProjectionProfile> = {
  readFile: { maxChars: 4800, headRatio: 0.68, historicalMaxChars: 4800 },
  read_file: { maxChars: 4800, headRatio: 0.68, historicalMaxChars: 4800 },
  readWorkspaceFile: { maxChars: 4800, headRatio: 0.68, historicalMaxChars: 4800 },
  globFiles: { maxChars: 2800, headRatio: 0.85 },
  execShell: { maxChars: 4000, headRatio: 0.35 },
  runCommand: { maxChars: 4000, headRatio: 0.35 },
  launchProcess: { maxChars: 2800, headRatio: 0.35 },
  editFile: { maxChars: 2800, headRatio: 0.62 },
  writeFile: { maxChars: 2400, headRatio: 0.62 },
  readPastedText: { maxChars: 4800, headRatio: 0.5, historicalMaxChars: 4800 },
};

export function resolveToolOutputProfile(
  toolName?: string,
): ToolOutputProjectionProfile {
  return (toolName ? TOOL_OUTPUT_PROFILES[toolName] : undefined) ?? DEFAULT_TOOL_OUTPUT_PROFILE;
}

/**
 * Historical-retention cap for one tool message. Tools with a profile
 * historicalMaxChars keep that many characters in history (read results stay
 * reusable, so the model does not re-read unchanged content just because the
 * flat historical budget compressed it away); every other tool falls back to
 * the caller-provided historicalMaxChars.
 */
export function resolveHistoricalToolContentCap(
  toolName: string | undefined,
  historicalMaxChars: number,
): number {
  const profile = toolName ? TOOL_OUTPUT_PROFILES[toolName] : undefined;
  return profile?.historicalMaxChars !== undefined
    ? Math.max(historicalMaxChars, profile.historicalMaxChars)
    : historicalMaxChars;
}

/** Web/server 路径下单条 tool 消息的投影决策（纯函数）。
 *
 * 抽成纯函数而非内联在 `compressOldToolResults` 里，是因为
 * `streamAgentChatTurn.test.ts` 用 `mock.module("./streamAgentChatTurnUtils")`
 * 把 `compressOldToolResults` 换成了恒等桩，而 Bun 的 `mock.module` 是全局的、
 * `mock.restore()` 清不掉（见该文件顶部注释）。任何针对包装函数的断言都会被那个
 * 桩静默架空。此处的纯函数不在被 mock 的模块里，覆盖率 mock 不掉。
 */
export function projectToolMessageContent(input: {
  content: string;
  toolName?: string;
}): string {
  const { content, toolName } = input;

  // 单一稳定预算（stable provider-visible projection）：同一条 tool 消息从第一
  // 次进入 provider transcript 起，fresh / 同 turn 更早轮 / 跨 turn 历史
  // 全部使用同一个 per-tool profile 预算，投影是 (content, toolName) 的纯函数
  // → 后续轮次 byte-identical，prompt 前缀缓存不在旧 tool 消息处断裂。
  // 旧「fresh 32k 宽窗口 vs 历史 800/1600 紧上限」的双档会让同一执行在不同轮
  // 被改写成不同字节（cache-prefix break，见 2026-08-25 事故与
  // docs/plans/2026-09-05-tool-output-cache-stability.md）。
  const maxChars = resolveToolOutputProfile(toolName).maxChars;
  if (content.length <= maxChars) return content;
  return clipToolText(
    content,
    maxChars,
    resolveToolOutputProfile(toolName).headRatio,
    `\n…[截断，原始长度 ${content.length} 字符]`,
  );
}

export function clipToolText(
  content: string,
  maxChars: number,
  headRatio: number,
  marker: string = "\n\n[... tool output middle omitted; head/tail preserved ...]\n\n",
): string {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxChars) return normalized;
  if (maxChars <= marker.length + 2) return normalized.slice(0, maxChars);
  const available = maxChars - marker.length;
  const headChars = Math.max(1, Math.floor(available * headRatio));
  const tailChars = Math.max(1, available - headChars);
  return `${normalized.slice(0, headChars)}${marker}${normalized.slice(-tailChars)}`;
}
