// desktopActionGateRegistry：桌面 local runtime 进程内的待决 action gate 表。
//
// 职责：turn 的 `onActionGate` 把 gate 挂到这里并等待用户决定；HTTP 路由
// `POST /api/desktop/agent-runtime/action-gate/:gateId` 把决定交回。turn 结束 /
// abort / TTL 超时都会把 pending 决议成 cancelled，不让 turn 挂死。
//
// 安全边界：本模块只搬运 gate 与决定，**永不接触凭据明文**——value 只在
// 路由层作为 `setSecret` 的实参出现，不进入本表、不进入日志。

import type { AgentRuntimeToolResult } from "agent-runtime/hostAdapter";
import type { LocalAgentActionGate } from "agent-runtime/localLoop";

export type DesktopActionGateTurnScope = string;

export type DesktopActionGateDecision = "approve" | "cancel";

/** 默认 TTL：5 分钟。超时自动决议为 cancelled，防止 turn 无限等待。 */
export const DESKTOP_ACTION_GATE_DEFAULT_TTL_MS = 5 * 60 * 1000;

type PendingEntry = {
  gate: LocalAgentActionGate;
  turnScope: DesktopActionGateTurnScope;
  complete: (result: AgentRuntimeToolResult) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * `resolve` 的结果：成功时拿到 gate 与一次性的 `complete`（由调用方在执行完
 * 宿主侧副作用——例如 setSecret——之后用它回填最终工具结果）；失败时给出明确
 * 错误，绝不静默成功。
 */
export type DesktopActionGateResolveOutcome =
  | {
      ok: true;
      gate: LocalAgentActionGate;
      complete: (result: AgentRuntimeToolResult) => void;
    }
  | { ok: false; error: string };

export type DesktopActionGateRegistryDeps = {
  ttlMs?: number;
  setTimeoutImpl?: typeof setTimeout;
  clearTimeoutImpl?: typeof clearTimeout;
};

export type DesktopActionGateRegistry = {
  register: (
    gate: LocalAgentActionGate,
    turnScope: DesktopActionGateTurnScope,
  ) => Promise<AgentRuntimeToolResult>;
  resolve: (
    gateId: string,
    decision: DesktopActionGateDecision,
  ) => DesktopActionGateResolveOutcome;
  cancelAllForTurn: (
    turnScope: DesktopActionGateTurnScope,
    reason: string,
  ) => number;
  pendingCount: (turnScope?: DesktopActionGateTurnScope) => number;
};

function cancelledGateResult(
  gate: LocalAgentActionGate,
  reason: string,
): AgentRuntimeToolResult {
  return {
    content: `操作已被取消：${reason}`,
    metadata: {
      cancelled: true,
      actionGateResult: { gateId: gate.id, status: "cancelled" as const },
    },
  };
}

export function createDesktopActionGateRegistry(
  deps: DesktopActionGateRegistryDeps = {},
): DesktopActionGateRegistry {
  const ttlMs = deps.ttlMs ?? DESKTOP_ACTION_GATE_DEFAULT_TTL_MS;
  const setTimeoutImpl = deps.setTimeoutImpl ?? setTimeout;
  const clearTimeoutImpl = deps.clearTimeoutImpl ?? clearTimeout;
  const pending = new Map<string, PendingEntry>();
  // 生命周期内见过的 gateId：同一 id 重复登记一律拒绝，防止后到的登记覆盖
  // 前一个还在等待的决定。id 数量与 gate 数量同阶，进程内集合可接受。
  const seenGateIds = new Set<string>();

  function dropEntry(entry: PendingEntry): void {
    clearTimeoutImpl(entry.timer);
    pending.delete(entry.gate.id);
  }

  function register(
    gate: LocalAgentActionGate,
    turnScope: DesktopActionGateTurnScope,
  ): Promise<AgentRuntimeToolResult> {
    if (seenGateIds.has(gate.id) || pending.has(gate.id)) {
      return Promise.reject(
        new Error(`duplicate action gate id: ${gate.id}`),
      );
    }
    seenGateIds.add(gate.id);
    return new Promise<AgentRuntimeToolResult>((resolvePromise) => {
      const entry: PendingEntry = {
        gate,
        turnScope,
        complete: resolvePromise,
        timer: setTimeoutImpl(() => {
          // TTL 超时：决议为 cancelled 并说明超时，宿主（turn）不挂死。
          if (pending.get(gate.id) !== entry) return;
          dropEntry(entry);
          entry.complete(cancelledGateResult(gate, "等待超时，已自动取消"));
        }, ttlMs),
      };
      // 不让 TTL 计时器阻止进程退出（测试与桌面空闲时都受益）。
      (entry.timer as { unref?: () => void }).unref?.();
      pending.set(gate.id, entry);
    });
  }

  function resolve(
    gateId: string,
    _decision: DesktopActionGateDecision,
  ): DesktopActionGateResolveOutcome {
    const entry = pending.get(gateId);
    if (!entry) {
      return { ok: false, error: "unknown_or_resolved_action_gate" };
    }
    // 原子摘除：同一次决定只可能被消费一次；之后重复 resolve 走 unknown 分支。
    dropEntry(entry);
    let completed = false;
    return {
      ok: true,
      gate: entry.gate,
      complete: (result: AgentRuntimeToolResult) => {
        if (completed) return;
        completed = true;
        entry.complete(result);
      },
    };
  }

  function cancelAllForTurn(
    turnScope: DesktopActionGateTurnScope,
    reason: string,
  ): number {
    let cancelled = 0;
    for (const entry of [...pending.values()]) {
      if (entry.turnScope !== turnScope) continue;
      dropEntry(entry);
      cancelled += 1;
      entry.complete(cancelledGateResult(entry.gate, reason));
    }
    return cancelled;
  }

  function pendingCount(
    turnScope?: DesktopActionGateTurnScope,
  ): number {
    if (!turnScope) return pending.size;
    let count = 0;
    for (const entry of pending.values()) {
      if (entry.turnScope === turnScope) count += 1;
    }
    return count;
  }

  return { register, resolve, cancelAllForTurn, pendingCount };
}

/** 进程内单例：turn handler 与 action-gate 路由共享同一张待决表。 */
export const desktopActionGateRegistry = createDesktopActionGateRegistry();
