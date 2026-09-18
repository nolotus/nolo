// packages/agent-runtime/processOwnership.ts
//
// 进程任务的「归属」读取层：从 host 注入的 turn runtimeContext 里取出**派发时刻**
// 的真实 parent dialog / turn 身份。
//
// 为什么必须在这里读、而不是在终态时读「当前 dialog」：
// 后台任务可能比它所属的那一轮 turn / 那个 dialog 活得久（用户可能已经 /switch 到
// 别的对话，或本对话已经空闲）。终态发生时看到的「当前 dialog」只是当时的 UI 状态，
// 不是这条任务的归属；把它当归属会导致「在 A 对话派发、任务在 B 对话终态时把 B 对话
// 唤醒」这类错误续跑。所以归属只在 launch / detach 那一刻从 runtimeContext 抓取，
// 之后随 registry 记录一起存放，终态路径只读记录。
//
// runtimeContext 的字段约定（host 注入，模型永远拿不到）：
//   - dialogId:      本 turn 所属 dialog（本地运行时在 turn 开始前就定好，含新对话首轮）
//   - parentThreadId: TUI 传给子 run 的 parent dialog（既有 run 归属用的键）
//   - turnId:        本 turn 的一次性身份（可选；缺失不影响归属成立）
//   - ownerId:       用户维度（可选，多账号隔离用）
//
// 读取优先级见 readProcessOwner。两个 dialog 键都没有 → 无归属（owner = null），
// 上层会退回「只提示」，绝不猜。

export type ProcessOwner = {
  /** 派发该任务的 turn 所属 dialog。 */
  dialogId: string;
  /** 该 turn 的一次性身份；host 未提供时缺省。 */
  turnId?: string;
  /** 可选：用户维度。 */
  ownerId?: string;
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

/**
 * 从 host 注入的 runtimeContext 提取归属。
 *
 * 优先级：`dialogId`（本 turn 自己的 dialog）> `parentThreadId`（TUI 传下来的
 * parent dialog）。两个都没有时返回 null —— 「读不到归属」必须显式表示成 null，
 * 由上层决定只提示，而不是在此处编一个 id。
 */
export function readProcessOwner(
  runtimeContext: Record<string, unknown> | null | undefined,
): ProcessOwner | null {
  if (!runtimeContext || typeof runtimeContext !== "object") return null;
  const dialogId =
    asNonEmptyString(runtimeContext.dialogId)
    ?? asNonEmptyString(runtimeContext.parentThreadId);
  if (!dialogId) return null;
  const turnId = asNonEmptyString(runtimeContext.turnId);
  const ownerId = asNonEmptyString(runtimeContext.ownerId);
  return {
    dialogId,
    ...(turnId ? { turnId } : {}),
    ...(ownerId ? { ownerId } : {}),
  };
}
