/**
 * ask_user 显式提交 command（Web / RN 共用的事务式发送闸门）。
 *
 * 修复 Luna HIGH finding「持久化未完成时就发送」：
 * - `persist` 必须 await（宿主 await write(dbKey).unwrap()）；pending 期间绝不 send；
 * - persist resolve 后才调用 send（真正的「持久化成功 → 发送」）；
 * - persist reject → 不 send，返回 `persist-failed` 供面板展示错误并保持可重试；
 * - in-flight 去重：提交进行中重复调用 submit 返回同一 Promise（双击只算一次）；
 *   完成后闸门重开，失败重试是合法的新一趟。
 *
 * 纯依赖注入（persist/send 均由面板提供），可用 mock Promise gate 做真实
 * 异步行为测试（见 askChoiceSubmitCommand.test.ts），不依赖 DOM/RN 环境。
 */

import {
  type AskChoiceResolution,
  buildAskChoiceResolution,
} from "./askChoicePersistence";

/** 与 `ai/tools/askChoiceState` 的 AskChoiceResult 结构对齐（保持本模块无跨包类型依赖）。 */
export type AskChoiceSubmittedResult =
  | { kind: "submitted"; answers: AskChoiceResolution["answers"] }
  | { kind: "cancelled" };

export type AskChoiceSubmitOutcome =
  | { status: "sent" }
  | { status: "persist-failed"; error: unknown }
  | { status: "skipped"; reason: "already-in-flight" | "invalid" | "cancelled" };

export interface AskChoiceSubmitDeps {
  /** 持久化 resolution（宿主：await write(dbKey).unwrap() + updateToolMessage）。 */
  persist: (resolution: AskChoiceResolution) => Promise<void>;
  /** 持久化成功后调用一次：发送下一轮 user turn。 */
  send: (userMessage: string) => void;
}

export interface AskChoiceSubmitCommand {
  /**
   * 提交一趟「持久化 → 发送」。in-flight 期间重复调用返回同一 Promise（去重）。
   * 返回 outcome 供面板决定冻结为只读（sent）还是展示错误并可重试（persist-failed）。
   */
  submit<TResult extends AskChoiceSubmittedResult, TQuestions>(input: {
    result: TResult;
    questions: TQuestions[];
    buildUserMessage: (result: TResult, questions: TQuestions[]) => string | null;
  }): Promise<AskChoiceSubmitOutcome>;
  /** 是否有未完成的提交（面板据此禁用重复点击）。 */
  isSubmitting(): boolean;
}

export function createAskChoiceSubmitCommand(
  deps: AskChoiceSubmitDeps,
): AskChoiceSubmitCommand {
  let inFlight: Promise<AskChoiceSubmitOutcome> | null = null;

  const run = async <TResult extends AskChoiceSubmittedResult, TQuestions>(
    input: {
      result: TResult;
      questions: TQuestions[];
      buildUserMessage: (result: TResult, questions: TQuestions[]) => string | null;
    },
  ): Promise<AskChoiceSubmitOutcome> => {
    if (input.result.kind !== "submitted") {
      return { status: "skipped", reason: "cancelled" };
    }
    const resolution = buildAskChoiceResolution(input.result, input.questions);
    const userMessage = input.buildUserMessage(input.result, input.questions);
    if (!resolution || !userMessage) {
      return { status: "skipped", reason: "invalid" };
    }
    try {
      // 关键 gate：persist pending/reject 期间绝不 send。
      await deps.persist(resolution);
    } catch (error) {
      return { status: "persist-failed", error };
    }
    deps.send(userMessage);
    return { status: "sent" };
  };

  return {
    submit(input) {
      if (inFlight) return inFlight;
      const current = run(input);
      inFlight = current.finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    isSubmitting: () => inFlight !== null,
  };
}
