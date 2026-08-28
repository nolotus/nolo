import serverDb from "database-engine/db";
import {
  mergeAvailabilityDeadline,
  resolveAvailabilityAction,
} from "ai/agent/agentAvailabilityShared";

type AgentRecord = Record<string, unknown> | null | undefined;

export type AgentAvailabilityResponse = {
  agent: AgentRecord;
  status: number;
  body?: unknown;
  headers?: Headers | Record<string, string> | null;
  now?: number;
};

/**
 * Record provider availability from one completed upstream response on the
 * desktop runtime.
 *
 * This mirrors the server-side adaptation in
 * `server/agentAvailability/agentAvailability.ts` but lives in the desktop
 * runtime (a public package). We intentionally depend only on the shared pure
 * logic (`ai/agent/agentAvailabilityShared`) and the public `database-engine/db`
 * store — never on the private `server` package, which is excluded from the
 * open-source mirror projection. Persistence is the desktop runtime's own
 * responsibility; decision logic stays in the shared layer.
 */
export async function recordAgentAvailabilityFromResponse({
  agent,
  status,
  body,
  headers,
  now = Date.now(),
}: AgentAvailabilityResponse): Promise<void> {
  const action = resolveAvailabilityAction(status, body, now, headers);
  if (action.kind === "clear") {
    await clearAgentTemporarilyUnavailable(agent);
  } else if (action.kind === "mark") {
    await markAgentTemporarilyUnavailable(agent, action.nextAvailableAt);
  }
}

export async function markAgentTemporarilyUnavailable(
  agent: AgentRecord,
  nextAvailableAt: number,
): Promise<void> {
  const dbKey = typeof agent?.dbKey === "string" ? agent.dbKey : undefined;
  if (!dbKey || !Number.isFinite(nextAvailableAt)) return;
  const current = await serverDb.get(dbKey).catch(() => null);
  if (!current || typeof current !== "object") return;
  await serverDb.put(dbKey, {
    ...(current as Record<string, unknown>),
    nextAvailableAt: mergeAvailabilityDeadline(
      (current as Record<string, unknown>).nextAvailableAt,
      nextAvailableAt,
    ),
  });
}

/** Clear a recovered availability deadline after a successful upstream call. */
export async function clearAgentTemporarilyUnavailable(
  agent: AgentRecord,
): Promise<void> {
  const dbKey = typeof agent?.dbKey === "string" ? agent.dbKey : undefined;
  if (!dbKey) return;
  const current = await serverDb.get(dbKey).catch(() => null);
  if (!current || typeof current !== "object") return;
  // 无 deadline 时不写（避免每次成功响应都触发一次 put）。
  if (!("nextAvailableAt" in (current as Record<string, unknown>))) return;
  const { nextAvailableAt: _ignored, ...rest } = current as Record<string, unknown>;
  await serverDb.put(dbKey, rest);
}
