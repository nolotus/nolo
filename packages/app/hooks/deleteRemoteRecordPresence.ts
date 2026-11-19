import { googleSessionRequestToken, isGoogleAuthoritySession } from "core/googleSessionScope";
import { API_ENDPOINTS } from "database/config";

/**
 * 服务端「这条记录到底还在不在」的权威探测。
 *
 * 为什么需要：删除前的归属复核（`deleteDbKey` 的 requireOwnership 分支）只能读到
 * 记录里的 owner。当记录读不到时，无法区分两件事：
 *   1. 实体已经不存在了，本地只剩一条残留投影（应该允许清理）；
 *   2. 网络失败/超时，实体可能还在（此时放行删除会先写本地 tombstone，服务端 403
 *      也回滚不了这些本地副作用）。
 * 本地 read 的失败对两者是同一个异常，所以这里回到服务端要一个明确答复。
 *
 * 结果语义（聚合多个服务器）：
 * - `present`：任一服务器返回了记录正文（附带该记录，用作 owner 复核依据）；
 * - `absent`：**所有**探测服务器都明确回答「没有这条记录」（404 / 410 / 204）；
 * - `unknown`：其它一切情况（网络错误、超时、鉴权失败、200 空体、无服务器可探）——
 *   调用方必须按「未核实」处理，不能当成不存在。
 */
export type RemoteRecordPresence =
  | { status: "present"; record: unknown }
  | { status: "absent" }
  | { status: "unknown"; reason: string };

const DEFAULT_TIMEOUT_MS = 5000;

const trimOrigin = (server: string): string => server.trim().replace(/\/+$/, "");

const buildReadUrl = (server: string, dbKey: string): string =>
  `${trimOrigin(server)}${API_ENDPOINTS.DATABASE}/read/${encodeURIComponent(dbKey)}`;

type ServerProbe = "present" | "absent" | "unknown";

async function probeServer(input: {
  server: string;
  dbKey: string;
  token?: string | null;
  timeoutMs: number;
  fetchImpl: typeof fetch;
}): Promise<{ result: ServerProbe; record?: unknown }> {
  const { server, dbKey, token, timeoutMs, fetchImpl } = input;
  if (!trimOrigin(server)) return { result: "unknown" };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const requestToken = googleSessionRequestToken(token ?? undefined, server, false);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (requestToken) headers.Authorization = `Bearer ${requestToken}`;
    const res = await fetchImpl(buildReadUrl(server, dbKey), {
      method: "GET",
      headers,
      signal: controller.signal as any,
      // 权威探测必须拒绝重定向：登录跳转/维护页/代理路由的 302 会落到一个与数据库
      // 端点无关的页面，那个页面的 404 不代表记录不存在。与 read.ts 的
      // `redirect: "error"` 策略保持一致，任何重定向都按未核实处理。
      redirect: "error" as const,
      ...(isGoogleAuthoritySession(token) ? { credentials: "omit" as const } : {}),
    });
    if (res.status === 404 || res.status === 410 || res.status === 204) {
      return { result: "absent" };
    }
    if (res.status !== 200) return { result: "unknown" };
    const body = await res.json().catch(() => null);
    if (body && typeof body === "object" && Object.keys(body as object).length > 0) {
      return { result: "present", record: body };
    }
    // 200 + 空体：服务端语义不明确，按未核实处理。
    return { result: "unknown" };
  } catch {
    return { result: "unknown" };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function probeRemoteRecordPresence(input: {
  dbKey: string;
  servers: readonly string[];
  token?: string | null;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<RemoteRecordPresence> {
  const dbKey = typeof input.dbKey === "string" ? input.dbKey.trim() : "";
  if (!dbKey) return { status: "unknown", reason: "empty dbKey" };

  const servers: string[] = [];
  for (const candidate of input.servers ?? []) {
    const origin = trimOrigin(candidate ?? "");
    if (!origin || servers.includes(origin)) continue;
    servers.push(origin);
  }
  if (servers.length === 0) {
    return { status: "unknown", reason: "no server to probe" };
  }

  const timeoutMs =
    typeof input.timeoutMs === "number" && input.timeoutMs > 0
      ? input.timeoutMs
      : DEFAULT_TIMEOUT_MS;
  const fetchImpl = input.fetchImpl ?? fetch;

  const probes: Array<{ server: string; result: ServerProbe; record?: unknown }> = await Promise.all(
    servers.map((server) =>
      probeServer({ server, dbKey, token: input.token, timeoutMs, fetchImpl })
        .then((value) => ({ server, ...value }))
        .catch(() => ({ server, result: "unknown" as ServerProbe })),
    ),
  );

  // 任一服务器给了正文 → 实体还在，交给 owner 复核。
  const present = probes.find((probe) => probe.result === "present");
  if (present) return { status: "present", record: present.record };

  // 有服务器说不清（网络/鉴权/超时）→ 不能判定为不存在。
  if (probes.some((probe) => probe.result !== "absent")) {
    return { status: "unknown", reason: "probe inconclusive" };
  }

  return { status: "absent" };
}
