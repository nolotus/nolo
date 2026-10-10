// packages/ai/tools/agent/runTitle.ts
//
// subagent run 的「标题」：派发时由调用方给出的一行短描述，用来在 TUI 运行区
// 和 controlAgentRun 里一眼区分并发的 run（同一个 agent 的多个 run 名字完全
// 相同，任务正文的开头又常常是同样的套话）。
//
// 只做归一化，不做猜测：没填就是没有，绝不从任务正文里生成一个看起来像标题的
// 句子。零依赖，供工具层 / CLI / TUI 共用同一份规则。

export const RUN_TITLE_MAX = 60;

/** 折叠空白与控制字符、截断；空结果返回 undefined。 */
export function normalizeRunTitle(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > RUN_TITLE_MAX ? `${cleaned.slice(0, RUN_TITLE_MAX - 1)}…` : cleaned;
}
