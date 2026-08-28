/**
 * Credential 级可用性（429 冷却）。
 *
 * 为什么是 credential 而不是 agent：限流是 **provider 凭证**的属性，不是 agent
 * 的属性。多个 agent 共用同一个 OAuth（`chatgpt` / `claude` / `antigravity`）时，
 * 其中一个撞上配额耗尽，其余共用同一凭证的 agent 一定也打不通——冷却记在
 * agent 上会让它们逐个重复撞墙。方向见
 * `docs/plans/2026-08-13-agent-availability-followups.md` P2：
 * 「把 availability 提升到 credential 层；Agent list 读取 credential 状态，
 * 不复制多份真相」。
 *
 * 顺带修掉一个真实缺陷：此前冷却写在 agent 记录上，而落盘前要求本地已存在
 * 该 agent 的记录（`if (!current) return`）。agent 定义来自远端 global-cache
 * 时本地并无副本，于是 429 结论被静默丢弃，`nextAvailableAt` 永远是 now，
 * 每次派发都重新撞同一堵墙。credential 存储不依赖 agent 记录是否存在。
 *
 * 与已归档的旧 `breakers.json` 的区别：那是与 `nextAvailableAt` 并存的**第二套
 * 真相**；这里只是把同一套真相的存储维度从 agent 换成 credential，读写都走
 * 共享的 `agentAvailabilityShared` 决策函数，不新增判定逻辑。
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

import { mergeAvailabilityDeadline } from "ai/agent/agentAvailabilityShared";

export type CredentialAvailabilityEntry = {
  nextAvailableAt: number;
  /**
   * 最近一次「冷却期自动重试探测」发生的时间（epoch-ms），用于共享层的
   * `resolveCooldownGate` 判定是否到了再放行一次真实请求的间隔。
   * 可选：旧格式文件缺该字段仍能正常读（视为从未探测），不因结构变化让现存文件失效。
   */
  lastProbeAt?: number;
};
export type CredentialAvailabilityFile = {
  entries: Record<string, CredentialAvailabilityEntry>;
};

const FILE_NAME = "credential-availability.json";

export function resolveNoloHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.NOLO_HOME?.trim() || join(homedir(), ".nolo");
}

export function resolveCredentialAvailabilityPath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return join(resolveNoloHome(env), FILE_NAME);
}

/**
 * 从 agent 记录推导冷却应记在哪个 credential 上。
 *
 * `apiKeyRef` 是权威来源：OAuth agent 上是 `chatgpt` / `claude` / `antigravity`
 * 这类**跨 agent 共享**的标识；托管 API key 上是 `api-key:agent-<owner>-<id>`
 * 这类 agent 专属标识——后者天然退化成一 agent 一 key，语义仍然正确。
 *
 * 返回 undefined 表示这个 agent 没有可归属的凭证（例如未配置凭证的公共
 * agent），调用方应回退到 agent 级行为，不要臆造 key。
 */
export function resolveCredentialKey(
  agent: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!agent || typeof agent !== "object") return undefined;
  for (const field of ["apiKeyRef", "credentialRef"] as const) {
    const value = agent[field];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

function parseFile(raw: string): CredentialAvailabilityFile {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") return { entries: {} };
  const entries = (parsed as CredentialAvailabilityFile).entries;
  if (!entries || typeof entries !== "object") return { entries: {} };
  return { entries };
}

/**
 * 内部：读取全部未过期条目（含 lastProbeAt）。过期条目在读取时即被丢弃，写回时
 * 自然消失——这正是旧 `breakers.json` 缺的那一步：它只增不减，最后堆了一批 2288 年
 * 的坏条目还没人清理。这里过期即失效，文件不会无限增长。
 */
async function readCredentialEntries(
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): Promise<Record<string, CredentialAvailabilityEntry>> {
  const path = resolveCredentialAvailabilityPath(env);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return {};
  }
  let file: CredentialAvailabilityFile;
  try {
    file = parseFile(raw);
  } catch {
    // 文件损坏不应让派发失败：当作「无冷却」处理，下次写入会覆盖成合法内容。
    return {};
  }
  const live: Record<string, CredentialAvailabilityEntry> = {};
  for (const [key, entry] of Object.entries(file.entries)) {
    const normalized = normalizeEntry(entry);
    if (normalized && normalized.nextAvailableAt > now) {
      live[key] = normalized;
    }
  }
  return live;
}

/**
 * 把一条持久化记录规范化成 entry 对象。
 *
 * 历史格式是裸 number（`{"chatgpt": 1234567890}`），object 形态是加入
 * `lastProbeAt` 后才引入的。不做这层转换的话，升级后旧文件里的冷却会被静默
 * 丢弃、当作「无冷却」——用户刚撞出来的限流转眼就被忘掉，下一个请求立刻再撞
 * 一次 429。返回 undefined 表示该条目无法识别，调用方按无冷却处理。
 */
function normalizeEntry(entry: unknown): CredentialAvailabilityEntry | undefined {
  if (typeof entry === "number") {
    return Number.isFinite(entry) ? { nextAvailableAt: entry } : undefined;
  }
  if (!entry || typeof entry !== "object") return undefined;
  const at = (entry as { nextAvailableAt?: unknown }).nextAvailableAt;
  if (typeof at !== "number" || !Number.isFinite(at)) return undefined;
  // 区分「字段缺失」与「字段存在但非法」：缺失是合法的旧格式（视为从未探测），
  // 而 lastProbeAt 存在却不是有限数说明记录已损坏——此时连同 deadline 一起丢弃，
  // 否则会把损坏记录解释成「从未探测」而放行一次 probe，与字段校验约定不符。
  if ("lastProbeAt" in entry) {
    const probe = (entry as { lastProbeAt?: unknown }).lastProbeAt;
    if (typeof probe !== "number" || !Number.isFinite(probe)) return undefined;
    return { nextAvailableAt: at, lastProbeAt: probe };
  }
  return { nextAvailableAt: at };
}

/**
 * 读取全部未过期冷却（凭证 → 截止时刻）。
 * 等价于 readCredentialEntries 后去掉 lastProbeAt，仅暴露 deadline。
 */
export async function readCredentialAvailability(
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): Promise<Record<string, number>> {
  const entries = await readCredentialEntries(env, now);
  return Object.fromEntries(
    Object.entries(entries).map(([key, entry]) => [key, entry.nextAvailableAt]),
  );
}

/**
 * 读取单个凭证的冷却 entry（含 lastProbeAt）。无冷却/已过期返回 undefined。
 * 供派发 gate 读取探测时间；旧格式文件缺 lastProbeAt 字段时该值为 undefined，
 * 由共享层 `resolveCooldownGate` 按「从未探测」处理（立即 probe）。
 */
export async function readCredentialEntry(
  credentialKey: string,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): Promise<CredentialAvailabilityEntry | undefined> {
  if (!credentialKey) return undefined;
  const entries = await readCredentialEntries(env, now);
  return entries[credentialKey];
}

async function writeCredentialAvailability(
  live: Record<string, CredentialAvailabilityEntry>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const path = resolveCredentialAvailabilityPath(env);
  await mkdir(resolveNoloHome(env), { recursive: true }).catch(() => undefined);
  const file: CredentialAvailabilityFile = {
    entries: live,
  };
  // 先写临时文件再 rename：并发的两次冷却写入不会把文件截断成半截 JSON。
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}

/**
 * 标记某凭证冷却到 `nextAvailableAt`。取更晚者：短冷却（如 5xx 的 5 分钟）
 * 不得抹掉已落盘的长冷却（如周额度耗尽）。冷却更新时保留既有 lastProbeAt。
 */
export async function markCredentialUnavailable(
  credentialKey: string,
  nextAvailableAt: number,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): Promise<void> {
  if (!credentialKey) return;
  const live = await readCredentialEntries(env, now);
  const existing = live[credentialKey];
  const merged = mergeAvailabilityDeadline(existing?.nextAvailableAt, nextAvailableAt);
  if (typeof merged !== "number" || !Number.isFinite(merged)) return;
  live[credentialKey] = {
    nextAvailableAt: merged,
    ...(existing?.lastProbeAt !== undefined ? { lastProbeAt: existing.lastProbeAt } : {}),
  };
  await writeCredentialAvailability(live, env);
}

/** 凭证恢复可用（收到 200）时清除冷却。无冷却时是空操作，不写盘。 */
export async function clearCredentialAvailability(
  credentialKey: string,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): Promise<void> {
  if (!credentialKey) return;
  const live = await readCredentialEntries(env, now);
  if (!(credentialKey in live)) return;
  delete live[credentialKey];
  await writeCredentialAvailability(live, env);
}

/**
 * 记录一次「冷却期自动重试探测」：把 lastProbeAt 更新为 `now`。
 * 由派发点在做 probe 放行时调用，供下次 `resolveCooldownGate` 判断是否又到间隔。
 * 无冷却 / 冷却已过期时是空操作，不写盘。
 */
export async function recordCredentialProbe(
  credentialKey: string,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): Promise<void> {
  if (!credentialKey) return;
  const live = await readCredentialEntries(env, now);
  const existing = live[credentialKey];
  if (!existing) return;
  live[credentialKey] = { ...existing, lastProbeAt: now };
  await writeCredentialAvailability(live, env);
}

/**
 * 把 credential 冷却合并进 agent 列表：agent 自身的 `nextAvailableAt`
 * （旧数据 / agent 级冷却）与其凭证冷却取更晚者，保证升级后旧记录不失效。
 */
export function applyCredentialAvailability<
  T extends Record<string, unknown>,
>(agents: T[], credentialAvailability: Record<string, number>): T[] {
  if (Object.keys(credentialAvailability).length === 0) return agents;
  return agents.map((agent) => {
    const key = resolveCredentialKey(agent);
    if (!key) return agent;
    const at = credentialAvailability[key];
    if (typeof at !== "number") return agent;
    const merged = mergeAvailabilityDeadline(
      agent.nextAvailableAt as number | undefined,
      at,
    );
    if (typeof merged !== "number" || merged === agent.nextAvailableAt) {
      return agent;
    }
    return { ...agent, nextAvailableAt: merged };
  });
}
