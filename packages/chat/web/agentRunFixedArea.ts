// packages/chat/web/agentRunFixedArea.ts
// 固定运行区（web `AgentRunsPanel`）的「挂载登记」。
//
// 为什么需要它：`startAgentRun` 成功回执与 composer 上方的固定运行区展示的是
// **同一个 run**，两处同时可见即重复反馈。去重只能发生在「该 run 确实有固定区
// 逐行覆盖」时：store 里有数据 ≠ 固定区已挂载（未登录 / 非对话页 / 没有渲染
// 固定区的宿主），仅凭 store 数据过滤会把反馈整块抹掉。因此由真正渲染固定区的
// 组件登记自己，读侧再据此判定覆盖。

import type { AgentRunScope } from "./agentRunStore";

/** 固定运行区一次最多逐行展示的条数；超出的只以 `+N` 汇总行出现，
 * 逐行区域**不覆盖**这些 run（去重时不得把它们当已覆盖）。 */
export const AGENT_RUN_FIXED_AREA_VISIBLE_ROWS = 3;

type Listener = () => void;

const mountedScopes: AgentRunScope[] = [];
const listeners = new Set<Listener>();
let version = 0;

function notify(): void {
  version += 1;
  for (const listener of [...listeners]) listener();
}

function isSameScope(a: AgentRunScope, b: AgentRunScope): boolean {
  return (
    a.userId === b.userId &&
    a.dialogId === b.dialogId &&
    a.workspaceId === b.workspaceId
  );
}

/** 固定运行区挂载期间为其 scope 登记；返回值用作卸载清理。 */
export function registerAgentRunFixedArea(scope: AgentRunScope): () => void {
  mountedScopes.push(scope);
  notify();
  return () => {
    const exact = mountedScopes.findIndex((entry) => entry === scope);
    const index =
      exact >= 0
        ? exact
        : mountedScopes.findIndex((entry) => isSameScope(entry, scope));
    if (index >= 0) mountedScopes.splice(index, 1);
    notify();
  };
}

/** 当前是否有固定运行区为同一 scope 挂载（同 userId + 同 dialogId）。 */
export function isAgentRunFixedAreaMountedFor(
  scope?: AgentRunScope,
): boolean {
  if (!scope || !scope.userId) return false;
  return mountedScopes.some((entry) => isSameScope(entry, scope));
}

export function getAgentRunFixedAreaVersion(): number {
  return version;
}

export function subscribeAgentRunFixedArea(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearAgentRunFixedAreaForTests(): void {
  mountedScopes.length = 0;
  listeners.clear();
  version += 1;
}
