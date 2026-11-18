const AGENT_AUTOMATION_KEY_PREFIX = "agent-automation-";
const AGENT_AUTOMATION_OWNER_INDEX_PREFIX = "agent-automation-owner-idx-";

export type AutomationRecordChangeListener = (key: string) => void;

const listeners = new Set<AutomationRecordChangeListener>();

export function isAgentAutomationRecordKey(key: unknown): key is string {
  return (
    typeof key === "string" &&
    key.startsWith(AGENT_AUTOMATION_KEY_PREFIX) &&
    !key.startsWith(AGENT_AUTOMATION_OWNER_INDEX_PREFIX)
  );
}

export type AutomationOwnerAgentValidationResult =
  | { ok: true; ownerAgentKey: string }
  | {
      ok: false;
      code: "AUTOMATION_OWNER_AGENT_REQUIRED" | "AUTOMATION_OWNER_AGENT_FORBIDDEN";
      message: string;
    };

/**
 * 校验自动化记录的 `ownerAgentKey` 是否非空且归属 `ownerUserId`（必须匹配 `agent-${ownerUserId}-<nonEmpty>`）。
 * 写入、patch、tool 创建与运行时执行入口共用同一口径。
 */
export function validateAutomationOwnerAgentKey(args: {
  ownerAgentKey: unknown;
  ownerUserId: string | null | undefined;
}): AutomationOwnerAgentValidationResult {
  if (typeof args.ownerAgentKey !== "string" || !args.ownerAgentKey.trim()) {
    return {
      ok: false,
      code: "AUTOMATION_OWNER_AGENT_REQUIRED",
      message: "ownerAgentKey is required for agent-automation records",
    };
  }
  const ownerAgentKey = args.ownerAgentKey;
  const ownerUserId =
    typeof args.ownerUserId === "string" ? args.ownerUserId.trim() : "";
  const expectedAgentPrefix = ownerUserId ? `agent-${ownerUserId}-` : "";
  if (
    !ownerUserId ||
    !ownerAgentKey.startsWith(expectedAgentPrefix) ||
    ownerAgentKey.slice(expectedAgentPrefix.length).trim().length === 0
  ) {
    return {
      ok: false,
      code: "AUTOMATION_OWNER_AGENT_FORBIDDEN",
      message: "Forbidden: ownerAgentKey must belong to the authenticated user",
    };
  }
  return { ok: true, ownerAgentKey };
}

/**
 * 注册 `agent-automation-*` 记录变更监听器（写 / 改 / 删时触发）。
 * 返回取消注册函数，用于生命周期停止或测试清理。
 */
export function registerAutomationRecordChangedListener(
  listener: AutomationRecordChangeListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 通知调度器某条 `agent-automation-*` 记录可能已创建、修改或删除。
 * 非 `agent-automation-` 前缀 key O(1) 返回；未注册监听时安全空操作。
 */
export function notifyAutomationRecordChanged(key: string): void {
  if (!isAgentAutomationRecordKey(key) || listeners.size === 0) return;
  for (const listener of listeners) {
    try {
      listener(key);
    } catch {
      // 失效通知为 best-effort，不得中断主存储写/改/删请求。
    }
  }
}

export function __clearAutomationRecordChangedListenersForTest(): void {
  listeners.clear();
}
