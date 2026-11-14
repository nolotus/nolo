/** Resolve produced run identity; configuration name is the same field listAgents uses. */
export async function resolveAgentRunName(
  agentKey: string,
  candidates: unknown[],
  readAgent?: (agentKey: string) => Promise<unknown>,
): Promise<string> {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  try {
    const record = await readAgent?.(agentKey) as { name?: unknown; deleted?: unknown; isDeleted?: unknown; deletedAt?: unknown } | undefined;
    if (!record?.deletedAt && !record?.deleted && !record?.isDeleted && typeof record?.name === "string" && record.name.trim()) {
      return record.name.trim();
    }
  } catch {
    // Naming must not prevent a run when the agent was removed or cannot be read.
  }
  return shortAgentKey(agentKey);
}

export function shortAgentKey(agentKey: string): string {
  return agentKey.trim().slice(-24) || "unknown-agent";
}
