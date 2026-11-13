/** Omission starts a fresh dialog; an explicit invalid value must never do so. */
export function normalizeContinueDialogId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("startAgentRun: continueDialogId 必须是非空 dialogId");
  }
  return value.trim();
}

/** Facts from an owned, resolved dialog record, never the caller's agent labels. */
export interface RunContextFacts {
  contextMode: "new" | "continued";
  agentChanged: boolean;
  contextNote?: string;
}
export function resolveRunContextFacts(record: { primaryAgentKey?: unknown } | null | undefined, effectiveAgentKey: string): RunContextFacts {
  const previous = typeof record?.primaryAgentKey === "string" ? record.primaryAgentKey.trim() : "";
  const agentChanged = !!record && !!previous && previous !== effectiveAgentKey;
  return { contextMode: record ? "continued" : "new", agentChanged,
    ...(agentChanged ? { contextNote: "续跑已切换 Agent，模型提示词缓存可能失效。" } : {}),
  };
}
