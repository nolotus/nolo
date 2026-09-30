import serverDb from "database-engine/db";
import {
  mergeAvailabilityDeadline,
  resolveAvailabilityAction,
  resolveCredentialKeyWithFallback,
} from "ai/agent/agentAvailabilityShared";
import {
  clearCredentialAvailability,
  markCredentialUnavailable,
} from "agent-runtime/credentialAvailability";

type AgentRecord = Record<string, unknown> | null | undefined;

export type AgentAvailabilityResponse = {
  agent: AgentRecord;
  status: number;
  body?: unknown;
  headers?: Headers | Record<string, string> | null;
  now?: number;
  /**
   * 冷却文件（`~/.nolo/credential-availability.json`）解析用的环境变量。
   * 缺省 `process.env`；测试注入 `NOLO_HOME` 指向临时目录。
   */
  env?: NodeJS.ProcessEnv;
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
 *
 * 与 CLI `recordLocalAvailabilityForAgent` 对齐的 credential 级落盘：429 mark /
 * 2xx clear 时，用同一把 key（`resolveCredentialKeyWithFallback`）把冷却写进
 * `~/.nolo/credential-availability.json`（读写实现在
 * `agent-runtime/credentialAvailability`，desktop / CLI 共用）。没有这一步，
 * 桌面宿主撞出的 429 只留在本机 agent 记录上，共用同一凭证的兄弟 agent 与
 * CLI 列表 / 派发 gate 都看不到，会继续逐个撞墙。
 */
export async function recordAgentAvailabilityFromResponse({
  agent,
  status,
  body,
  headers,
  now = Date.now(),
  env = process.env,
}: AgentAvailabilityResponse): Promise<void> {
  const action = resolveAvailabilityAction(status, body, now, headers);
  if (action.kind === "noop") return;

  // Credential 层优先（与 CLI recordLocalAvailabilityForAgent 同语义）：限流是
  // provider 凭证的属性，不是 agent 的属性。写盘失败不阻断派发结果——冷却文件
  // 读不到最多退化为旧行为，不能让一次成功/失败响应因为落盘问题而抛错。
  const credentialKey = resolveCredentialKeyWithFallback(agent);
  if (credentialKey) {
    if (action.kind === "mark") {
      await markCredentialUnavailable(
        credentialKey,
        action.nextAvailableAt,
        env,
        now,
      ).catch(() => undefined);
    } else {
      await clearCredentialAvailability(credentialKey, env, now).catch(
        () => undefined,
      );
    }
  }

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
