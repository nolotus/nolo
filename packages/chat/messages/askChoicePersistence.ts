/**
 * ask_user 提交后的持久化载荷（Web / RN 共用，纯数据组装）。
 *
 * Stage 4 契约（docs/plans/2026-09-15-ask-user-unified-interaction.md）：
 * 提交 = 先把 answers/selected 写回 tool-message（updateToolMessage +
 * write(dbKey)），再发送下一轮 user turn。本模块只负责把提交结果
 * 组装成可持久化的形状；dispatch 由宿主组件完成，方便单测。
 *
 * 结构（不直接 import 共享 state 模块，保持纯结构类型）：
 * - `answers` 与 `ai/tools/askChoiceState` 的 `QuestionAnswer[]` 对齐；
 * - 单题表单额外补 legacy `selected`，老代码以 `rawData.selected` 判定已解决；
 * - `phase: "submitted"` 让 `createInitialAskChoiceState` 重载后直接落到
 *   只读 submitted 状态，防止重复提交。
 */

/**
 * 统一的 resolved 判定（Web / RN 宿主 + 面板共用）。
 *
 * 修复 Luna MEDIUM finding「truthiness 判定把 `answers: []` 误判为已解决」：
 * JS 中 `[]` 为 truthy，旧实现 `!!rawData?.answers` 会把含空 answers 的
 * 旧 payload / 中间态直接锁成只读，用户无法继续作答。
 * 这里改为明确谓词，兼容三种历史形态：
 * - 新 payload：`phase: "submitted"`（即使 answers 为空也视为已提交）；
 * - 多题 payload：非空 `answers` 数组；
 * - 单题 legacy payload：非空 `selected`（字符串或对象均可）。
 */
export function isAskChoiceResolved(rawData: any): boolean {
  if (!rawData || typeof rawData !== "object") return false;
  if (rawData.phase === "submitted") return true;
  if (rawData.cancelled === true) return true;
  // selected 兼容对象/字符串 legacy 形态；空串/null 视为未作答。
  if (rawData.selected != null && rawData.selected !== "") return true;
  return Array.isArray(rawData.answers) && rawData.answers.length > 0;
}

export type AskChoiceResolution = {
  /** 提交时刻的题目列表（归一化后），随答案一起落库以便重载对齐。 */
  questions: unknown[];
  answers: Array<{
    questionId: string;
    selectedIds: string[];
    otherText: string;
    userMessage: string;
  }>;
  /** 单题遗留字段：老代码用 rawData.selected 判断已解决。 */
  selected?: { label: string; userMessage: string };
  phase: "submitted";
};

type AskChoiceResultLike =
  | { kind: "submitted"; answers: AskChoiceResolution["answers"] }
  | { kind: "cancelled" };

/** 从提交结果构建持久化 resolution；多题不带 selected，单题补 legacy 字段。 */
export function buildAskChoiceResolution(
  result: AskChoiceResultLike,
  questions: unknown[],
): AskChoiceResolution | null {
  if (result.kind !== "submitted") return null;
  const answers = result.answers;
  if (!answers.length) return null;
  const single = answers.length === 1 ? answers[0] : undefined;
  return {
    questions,
    answers,
    ...(single?.userMessage
      ? {
          selected: {
            label: single.userMessage,
            userMessage: single.userMessage,
          },
        }
      : {}),
    phase: "submitted",
  };
}

/**
 * 组装 tool-message 更新内容：rawData 落 answers/selected/phase/questions
 * （供重载恢复），toolPayload 标记 succeeded（结束确认态）。
 * 宿主拿到后 dispatch(updateToolMessage({ id, changes }))，再按需
 * dispatch(write({ data: { ...message, ...changes }, customKey: dbKey }))。
 */
export function buildAskChoicePersistChanges(
  rawData: any,
  toolPayload: any,
  resolution: AskChoiceResolution,
): { nextRawData: Record<string, unknown>; nextToolPayload: Record<string, unknown> } {
  const { cancelled: _cancelled, ...restRawData } = rawData ?? {};
  void _cancelled;
  const nextRawData: Record<string, unknown> = {
    ...restRawData,
    ...resolution,
    type: "ask_user",
  };
  const nextToolPayload: Record<string, unknown> = {
    ...(toolPayload ?? {}),
    status: "succeeded",
  };
  return { nextRawData, nextToolPayload };
}
