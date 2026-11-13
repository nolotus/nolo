// 文件路径: app/components/desktopActionGateActions.ts
//
// Block 3b：桌面 action gate 面板的「提交/取消」纯函数。
//
// 设计动机（环境约束）：当前 jsdom + React 组合下受控 input 的 onChange
// 无法被测试驱动（IE 分支 attachEvent 抛错），因此把「提交」从组件里抽成
// 不碰 DOM、不读 React state 的纯函数，组件只负责渲染与调用；逻辑由对
// 这些函数的直接测试覆盖，组件测试只断言渲染结构。
//
// 安全不变量：`value`（可能含凭据明文）只作为 resolveGate 的实参存在；
// 这些函数返回 void、不把 value 放进任何可序列化的返回值/导出状态。

import {
  type DesktopActionGate,
  type DesktopGateDecision,
  type DesktopActionGateResolveOptions,
} from "../utils/desktopActionGateChannel";

/** Pure predicate: gate asks for a secret value (masked input). */
export function isSecretRequestGate(
  gate: Pick<DesktopActionGate, "kind" | "payload"> | null,
): boolean {
  if (!gate || gate.kind !== "input") return false;
  const payload = gate.payload;
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { action?: unknown }).action === "secret_request"
  );
}

/** Pure: whether the confirm action must be disabled (empty secret value). */
export function isConfirmDisabled(
  gate: Pick<DesktopActionGate, "kind" | "payload"> | null,
  value: string,
): boolean {
  return isSecretRequestGate(gate) && value.trim().length === 0;
}

export type DesktopActionGateResolver = (
  gateId: string,
  options: DesktopActionGateResolveOptions,
) => Promise<boolean>;

export type DesktopActionGateActionArgs = {
  gate: Pick<DesktopActionGate, "id" | "kind" | "payload">;
  /** Injectable for tests; defaults omitted — caller always supplies. */
  resolveGate: DesktopActionGateResolver;
  /** Called only on success (gate resolved): clear value / close panel. */
  onSettled?: () => void;
  /** Called on failure (gate kept for retry): receives the error. */
  onError?: (error: Error) => void;
};

export type DesktopActionGateSubmitArgs = DesktopActionGateActionArgs & {
  /** Current input value; only forwarded to resolveGate for secret gates. */
  value: string;
};

/** Approve the gate. Secret gates require a non-empty value (guarded by isConfirmDisabled). */
export async function submitDesktopActionGate(
  args: DesktopActionGateSubmitArgs,
): Promise<void> {
  const { gate, value, resolveGate, onSettled, onError } = args;
  // 空 secret 值：不允许提交，也不算错误（按钮本应禁用，这里兜底）。
  if (isConfirmDisabled(gate, value)) return;
  const submittedValue = isSecretRequestGate(gate) ? value : undefined;
  let ok: boolean;
  try {
    ok = await resolveGate(gate.id, { decision: "approve", value: submittedValue });
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return;
  }
  if (!ok) {
    // resolveGate 返回 false：可能是可重试失败（网络/5xx/不带匹配 gateId 的
    // 4xx，gate 仍保留），也可能是终态失败（4xx 且响应带匹配 gateId，gate 已
    // 从通道移除、由面板短暂显示错误）。两种情况都不再自动重试。
    onError?.(new Error("resolve failed"));
    return;
  }
  onSettled?.();
}

/** Cancel the gate. Never carries a value. */
export async function cancelDesktopActionGate(
  args: DesktopActionGateActionArgs,
): Promise<void> {
  const { gate, resolveGate, onSettled, onError } = args;
  let ok: boolean;
  try {
    ok = await resolveGate(gate.id, { decision: "cancel" });
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return;
  }
  if (!ok) {
    onError?.(new Error("resolve failed"));
    return;
  }
  onSettled?.();
}

export type { DesktopGateDecision };
