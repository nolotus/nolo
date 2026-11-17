// 文件路径: app/utils/desktopActionGateChannel.ts
//
// Block 3b：桌面 action gate 的 webview 侧内存通道。
//
// 职责边界：
// - 持有「待决 gate」的内存态并通知订阅者（面板组件）。
// - resolveGate 把用户决定 POST 回提交目标（Block 2c 起支持两种，按运行模式
//   由 pushGate 登记 / resolveGate 覆盖注入）：
//   · 桌面（默认）：同源 `/api/desktop/agent-runtime/action-gate/:gateId`，无 Authorization；
//   · web：`<server>/api/agent/secret-request/:gateId`，带 `Authorization: Bearer <token>`。
// - HTTP 4xx 失败且响应 JSON 带 `gateId` 等于本次提交的 gateId，表示服务端
//   已决议（gate 已被 `outcome.complete` 消费）：重试必然 404，因此从内存态
//   移除 gate，错误交给面板短暂显示，不提供重试。
// - 其余失败（不带 gateId 的 4xx——如宿主同源校验 403、`NOLO_DESKTOP !== "1"`
//   的 404，它们发生在 `registry.resolve` 之前、gate 仍在待决表；以及网络异常、
//   5xx、响应无法解析）gate 保留在内存态，错误暴露给面板重试。
//
// 安全不变量（docs/plans/2026-11-04-secret-request-panel.md §4）：
// - `value`（可能含凭据明文）只出现在 resolveGate 的 POST body 里；
//   不写日志、不进 redux、不进任何可序列化的导出状态、不持久化。
// - gate 本身只有 id/kind/title/body/payload，与 SSE 帧一致。

export type DesktopActionGate = {
  id: string;
  kind: "confirm" | "handoff" | "input";
  title: string;
  body?: string;
  payload?: unknown;
};

/** Trusted stream context, never accepted from tool/model payloads. */
export type ActionGateMeta = {
  dialogId: string;
  turnId: string;
  messageId: string;
  storage: "web" | "desktop";
};

export type DesktopGateDecision = "approve" | "cancel";

export type DesktopActionGateResolveOptions = {
  decision: DesktopGateDecision;
  /** May contain credential plaintext. Only ever placed in the POST body. */
  value?: string;
};

export type DesktopActionGateListener = () => void;

/**
 * Block 2c: where a gate's user decision is submitted.
 * - "desktop": same-origin desktop host route (no Authorization header).
 * - "web": server route with Bearer auth (token lives only in memory here and
 *   in the POST header; it never enters the serializable snapshot).
 */
export type ActionGateSubmitTarget =
  | { kind: "desktop" }
  | { kind: "web"; server: string; token: string | null }
  | {
      kind: "local";
      resolve?: (
        options: DesktopActionGateResolveOptions,
      ) => Promise<boolean> | boolean;
    };

export type ActionGateRunKind = "desktop-local" | "server-run";

/**
 * Block 2c: pick the submit target from the run kind. Mirrors the existing
 * stream branching in streamAgentChatTurn (desktop local runtime vs server
 * SSE run) — no new global switch.
 */
export function targetForRunKind(
  kind: ActionGateRunKind,
  ctx: { server?: string | null; token?: string | null } = {},
): ActionGateSubmitTarget {
  if (
    kind === "server-run" &&
    typeof ctx.server === "string" &&
    ctx.server.length > 0
  ) {
    return { kind: "web", server: ctx.server, token: ctx.token ?? null };
  }
  return { kind: "desktop" };
}

/** Terminal failure message when no token is available for the web target. */
export const NEEDS_LOGIN_MESSAGE = "需要登录后才能处理该授权请求";

/** Serializable snapshot handed to the UI: gates without any resolved value. */
export type DesktopActionGateSnapshot = {
  gates: DesktopActionGate[];
  /** Safe terminal failures linked to transient anchors; never contains gate payload/value. */
  failures: Array<{ gateId: string; meta: ActionGateMeta; message: string }>;
  /** Last resolve error keyed by gateId, for panel display / retry. */
  errors: Record<string, string>;
};

const gates = new Map<string, DesktopActionGate>();
// Submit target per pending gate (memory only; never part of the snapshot).
const targets = new Map<string, ActionGateSubmitTarget>();
const failures = new Map<string, { gateId: string; meta: ActionGateMeta; message: string }>();
const metadata = new Map<string, ActionGateMeta>();
const errors = new Map<string, string>();
const listeners = new Set<DesktopActionGateListener>();
// 缓存快照：useSyncExternalStore 要求 getSnapshot 在无变化时返回同一引用，
// 否则每次渲染都判定「store 变了」→ 无限重渲染。
let cachedSnapshot: DesktopActionGateSnapshot | null = null;

function invalidateSnapshot() {
  cachedSnapshot = null;
}

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // 订阅者异常不拖垮通道本身。
    }
  }
}

export function pushGate(
  gate: DesktopActionGate,
  target: ActionGateSubmitTarget = { kind: "desktop" },
  meta?: Omit<ActionGateMeta, "storage">,
): void {
  if (!gate || typeof gate.id !== "string" || gate.id.length === 0) return;
  failures.delete(gate.id);
  if (target.kind === "web" && !target.token) {
    if (meta) failures.set(gate.id, { gateId: gate.id, meta: { ...meta, storage: "web" }, message: NEEDS_LOGIN_MESSAGE });
    // 登录缺失：该 gate 直接按终态失败处理——不进入待决表（面板不会卡住），
    // 错误信息留给面板短暂显示。
    gates.delete(gate.id);
    targets.delete(gate.id);
    metadata.delete(gate.id);
    errors.set(gate.id, NEEDS_LOGIN_MESSAGE);
    invalidateSnapshot();
    notify();
    return;
  }
  metadata.delete(gate.id);
  if (meta && target.kind !== "local") metadata.set(gate.id, { ...meta, storage: target.kind });
  errors.delete(gate.id);
  targets.set(gate.id, target);
  gates.set(gate.id, gate);
  invalidateSnapshot();
  notify();
}

export function getGateMeta(gateId: string): ActionGateMeta | undefined {
  return metadata.get(gateId);
}

export function clearGateTurn(turnId: string): void {
  for (const [id, failure] of failures) {
    if (failure.meta.turnId === turnId) failures.delete(id);
  }
  for (const [id, meta] of metadata) {
    if (meta.turnId !== turnId) continue;
    gates.delete(id);
    targets.delete(id);
    metadata.delete(id);
    errors.delete(id);
  }
  invalidateSnapshot();
  notify();
}

export function subscribe(listener: DesktopActionGateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Serializable view for React `useSyncExternalStore` — never contains `value`. */
export function getSnapshot(): DesktopActionGateSnapshot {
  if (!cachedSnapshot) {
    cachedSnapshot = {
      gates: [...gates.values()],
      failures: [...failures.values()],
      errors: Object.fromEntries(errors),
    };
  }
  return cachedSnapshot;
}

/** Test / teardown helper: drops all in-memory state. */
export function resetDesktopActionGateChannel(): void {
  gates.clear();
  targets.clear();
  metadata.clear();
  failures.clear();
  errors.clear();
  invalidateSnapshot();
  notify();
}

export async function resolveGate(
  gateId: string,
  options: DesktopActionGateResolveOptions,
  fetchImpl: typeof fetch = fetch,
  targetOverride?: ActionGateSubmitTarget,
): Promise<boolean> {
  // A terminal anchor is informational, never a pending approval or a fallback desktop POST.
  if (failures.has(gateId)) return false;
  const target = targetOverride ?? targets.get(gateId) ?? { kind: "desktop" };

  if (target.kind === "local") {
    try {
      const ok = target.resolve ? await target.resolve(options) : true;
      if (!ok) {
        return false;
      }
      errors.delete(gateId);
      gates.delete(gateId);
      targets.delete(gateId);
      metadata.delete(gateId);
      invalidateSnapshot();
      notify();
      return true;
    } catch (error) {
      errors.set(
        gateId,
        "授权请求提交失败，请重试",
      );
      invalidateSnapshot();
      notify();
      return false;
    }
  }

  const isWeb = target.kind === "web";
  const url = isWeb
    ? `${target.server.replace(/\/+$/, "")}/api/agent/secret-request/${encodeURIComponent(gateId)}`
    : `/api/desktop/agent-runtime/action-gate/${encodeURIComponent(gateId)}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Authorization 头只出现在 web 目标的请求上（桌面目标走同源无鉴权通道）。
  if (isWeb) headers.Authorization = `Bearer ${target.token}`;
  // 终态失败：移除 gate（及目标登记），错误透出给面板，不提供重试。
  const failTerminal = (message: string): boolean => {
    gates.delete(gateId);
    targets.delete(gateId);
    metadata.delete(gateId);
    errors.set(gateId, message);
    invalidateSnapshot();
    notify();
    return false;
  };
  if (isWeb && !target.token) {
    return failTerminal(NEEDS_LOGIN_MESSAGE);
  }
  try {
    const response = await fetchImpl(
      url,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ decision: options.decision, value: options.value }),
      },
    );
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: unknown;
        gateId?: unknown;
      } | null;
      // Never surface response bodies: upstream errors may echo submitted secrets.
      const message = `授权请求提交失败（HTTP ${response.status}），请重试`;
      const isTerminal =
        response.status >= 400 &&
        response.status < 500 &&
        data?.gateId === gateId;
      if (isTerminal) {
        // 终态失败：4xx 且响应 gateId 与本次提交一致，表示服务端已决议并
        // 消费掉 gate（400 非法参数、404 unknown_or_resolved_action_gate），
        // 重试必然再次 404。从内存态移除该 gate，把服务端错误文案交给面板
        // 显示，不再提供重试。
        gates.delete(gateId);
        targets.delete(gateId);
        metadata.delete(gateId);
        errors.set(gateId, message);
        invalidateSnapshot();
        notify();
        return false;
      }
      // 不带匹配 gateId 的 4xx（如同源校验 403、env 404，均发生在
      // registry.resolve 之前）、5xx / 无法解析响应：gate 仍在待决表，保留供重试。
      throw new Error(message);
    }
    errors.delete(gateId);
    gates.delete(gateId);
    targets.delete(gateId);
    metadata.delete(gateId);
    invalidateSnapshot();
    notify();
    return true;
  } catch (error) {
    // 失败：gate 保留在内存态，错误暴露给面板重试。
    errors.set(
      gateId,
      "授权请求提交失败，请重试",
    );
    invalidateSnapshot();
    notify();
    return false;
  }
}
