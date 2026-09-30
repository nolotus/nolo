// packages/chat/dialog/actions/compactDialogAndRetryAction.ts
//
// 错误卡「压缩并重试」动作（ctx-overflow-feedback review 修复 2）。
//
// 为什么单独一个动作：需要 (a) 就地压缩历史（updateDialogSummaryAction 是
// 普通 async 函数，要 thunkApi 才能跑）和 (b) 重发失败的那条用户消息
// （handleSendMessage）。组件（MessageItem）只 dispatch 一个 action，不自己去
// 拼 getState / 分支逻辑。
//
// 与 compactDialogAndForkAction 的区别：那个是「压缩后开分支对话并跳走」，
// 面向用户主动发起的分叉；本动作面向「上下文超窗导致本轮失败」，要在**同一个
// 对话**里把上下文压回窗口内并重发，不丢用户输入、不改对话归属。
//
// 实现形态（Redux 冻结边界）：不引入新的 createAsyncThunk，直接返回 thunk 函数
// 让 Redux thunk middleware 跑——`dispatch(compactDialogAndRetryAction(args))`
// 等价于 `dispatch(async (dispatch, getState, extra) => ...)`，调用点零改动。

import { handleSendMessage } from "../dialogSlice";
import { updateDialogSummaryAction } from "./updateDialogSummaryAction";

export interface CompactDialogAndRetryArgs {
  dialogKey: string;
  /** 失败轮次的 assistant 消息 id（重发锚点）。 */
  retryMessageId?: string;
  /** 失败轮次的 agent（省略则用 dialog 当前主 agent）。 */
  targetAgentKey?: string;
}

/**
 * 返回一个 thunk：交给 `dispatch(...)` 由 thunk middleware 以
 * (dispatch, getState, extra) 运行。与旧 createAsyncThunk 版本行为等价——
 * 压缩失败不阻断重发，重发失败抛给调用方 .catch。
 */
export const compactDialogAndRetryAction = (
  args: CompactDialogAndRetryArgs
) => {
  return async (
    dispatch: (action: unknown) => Promise<unknown>,
    getState: () => unknown,
    extra: unknown
  ) => {
    const thunkApi = { dispatch, getState, extra };
    let compactionFailed: unknown = null;
    try {
      // force: 手动触发——超窗时估算阈值可能还没到线，但用户已经明确要压缩。
      await updateDialogSummaryAction(
        { dialogKey: args.dialogKey, force: true, reason: "manual" },
        thunkApi
      );
    } catch (error) {
      // 压缩失败不阻断重试：上下文可能只是略超，重发仍有机会成功。
      compactionFailed = error;
      console.warn("[compactDialogAndRetry] compaction failed:", error);
    }

    await dispatch(
      handleSendMessage({
        isRetry: true,
        ...(args.retryMessageId ? { retryMessageId: args.retryMessageId } : {}),
        dialogKey: args.dialogKey,
        ...(args.targetAgentKey ? { targetAgentKey: args.targetAgentKey } : {}),
      })
    );

    return { compactionFailed };
  };
};
