import { getAccountChatDisplayOwner } from "./accountChatDisplayOwner";
// packages/app/settings/settingsWriteRetry.ts
//
// 单一职责:settings 写云失败后的**有界重试**与**显式对账**的判定逻辑。
// 不含任何 UI，也不做隐式状态修复；由 settingThunks.setSettings 调用。
//
// 规则(与 docs 中的 P1 口径一致):
//  1. 世代守卫：每次写都带上「本次意图」的 localIntentEpoch。失败后发现 epoch
//     已经推进 → 说明用户在此期间又改过设置，更新的意图拥有真相，
//     于是**放弃重试**（旧值绝不覆盖新编辑），也不记录失败状态
//     （新意图自己的写会决定成功与否）。
//  2. 未推进 → 短暂退避后重试一次。
//  3. 重试仍失败 → **按账号权威服务器远端读**该账号 settings record，与当前
//     本地值逐键比较：
//       matched      权威副本已含本次意图（例如写已落地但响应失败），无需再动
//       mismatched   权威副本仍是别的值，差异键进 unresolvedKeys
//       unavailable  拿不到权威证据（无权威来源 / 请求失败 / 超出对账预算）
//     对账**绝不自动把远端值写回本地**：那正是「用旧的云端值回滚更新的本地
//     编辑」这一类缺陷。差异只作为状态交给后续 UI 显式处置。
//  4. 对账只在 epoch 未变时进行；读取返回后要再判一次（读期间用户可能又改）。
//  5. 收敛：某次写**成功**后，若它是同一账号、且覆盖了失败状态里剩下的全部键，
//     清空状态；只覆盖了一部分 → 保留状态并剔除已覆盖的键（见
//     resolveSettingsWriteFailureAfterSuccess）；其它账号的成功写不动它。
//
// 为什么对账既不能复用 `readAndWait`、也不能遍历多台服务器：
//  (a) `readAndWait` 不是远端权威读——它先 `fetchFromClientDb` 取本地
//      (`packages/database/actions/readAndWait.ts:172`)，无可用远程服务器时直接
//      返回本地数据 (`:194-200`)，远端分支拿到数据后还会 `db.put` 回写本地。乐观
//      写可能已经落在本地，于是「写失败 → 读 → 与本地比较 → 相等」完全可能是
//      同一个本地值自比，产出**假阳性 matched**，比没有状态更危险。
//  (b) settings 记录是 **authority-scoped** 的：只有该账号的权威服务器副本可采信，
//      任意副本（本机家服务器、当前连接服务器、跟随读取的其它 sync 服务器）都可能
//      陈旧，会给出假 mismatched / 假 matched。因此这里**只**认
//      `state.settings.userAuthorityRegistry[accountId]`（hydrate 时由 authorityHome
//      派生，见 settingPersistence.ts 的 hydrateStoredSettings）；不拿
//      currentServer 冒充权威，也绝不因为权威未知而改读别的副本。
//  (c) 对账发生在同账号写队列里，必须整体有界：单请求 5s 超时
//      (common.ts:142,178) + transient retry(300/1000ms) 叠加会长时间占住队列，
//      所以整个对账过程有一个总预算 SETTINGS_RECONCILE_DEADLINE_MS。

import { fetchFromServer } from "database/actions/common";
import { getRuntimeServerContext } from "database/runtimeServerContext";
import { createUserKey } from "database/keys";

import { sanitizeStoredSettingsRecord } from "./settingPersistence";
import type {
  SettingsWriteFailure,
  SettingsWriteReconciliation,
} from "./settingTypes";

/**
 * 一次失败重试前的退避时长。取「足够让瞬时网络抖动过去、又不让用户感到卡顿」
 * 的量级；导出常量便于测试与后续按产品口径调整。
 */
export const SETTINGS_WRITE_RETRY_BACKOFF_MS = 200;

/**
 * 整个对账过程的预算上界。超出即放弃对账（unavailable）并让同账号写队列继续。
 * 取值参考：单请求超时 5s + transient retry 300/1000ms ⇒ 必须短于单请求超时，
 * 否则预算形同虚设。
 */
export const SETTINGS_RECONCILE_DEADLINE_MS = 3_000;

export const delaySettingsWriteRetry = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * 单调本地意图世代。字段缺失/非数值一律读作 0，使早期 store 行为与旧代码一致。
 */
export const readLocalIntentEpoch = (getState: () => unknown): number => {
  const value = (getState() as { settings?: { localIntentEpoch?: unknown } })
    ?.settings?.localIntentEpoch;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

/**
 * 「本次写已被更新的本地意图取代」的哨兵错误：这不是失败。写前的世代复查发现
 * epoch 已推进时抛出它，thunk 捕获后正常 resolve —— 新意图自己的写正在正常
 * 进行，调用方不该收到 rejection（否则 UI 会误报「保存失败」）。
 */
export class SettingsWriteSupersededError extends Error {
  constructor(
    message = "Settings write superseded by a newer local intent.",
  ) {
    super(message);
    this.name = "SettingsWriteSupersededError";
  }
}

export const isSettingsWriteSupersededError = (error: unknown): boolean =>
  error instanceof SettingsWriteSupersededError;

/**
 * 读取「账号权威服务器」上的 settings record。返回 null 表示拿不到权威证据
 * （没有权威来源 / 请求失败 / 响应为空）。
 * 绝不读本地库、绝不回写本地库、绝不改读非权威副本。
 */
export type SettingsAuthorityReader = (
  dbKey: string,
  getState: () => unknown,
  accountId: string,
) => Promise<Record<string, unknown> | null>;

let reconcileDeadlineOverride: number | null = null;

/** 测试用注入点：覆盖对账总预算（传 null 还原常量）。 */
export const setSettingsReconcileDeadlineForTests = (
  ms: number | null,
): void => {
  reconcileDeadlineOverride = ms ?? null;
};

const reconcileDeadlineMs = (): number =>
  reconcileDeadlineOverride ?? SETTINGS_RECONCILE_DEADLINE_MS;

/**
 * 该账号的权威服务器来源。只认 settings.userAuthorityRegistry[accountId]：
 * 那是 hydrate 时由 register-backed authorityHome 派生的记录权威。
 * 不用 currentServer（本机家服务器 ≠ 记录权威）。
 */
export const readSettingsAuthorityServer = (
  getState: () => unknown,
  accountId: string,
): string | null => {
  const registry = (getState() as {
    settings?: { userAuthorityRegistry?: Record<string, unknown> };
  })?.settings?.userAuthorityRegistry;
  if (!registry || typeof registry !== "object") return null;
  const value = registry[accountId];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const readAuthoritativeSettingsRecord: SettingsAuthorityReader = async (
  dbKey,
  getState,
  accountId,
) => {
  const authorityServer = readSettingsAuthorityServer(getState, accountId);
  // 权威未知 ⇒ 不读任何副本（任意副本不可采信），直接报告无证据。
  if (!authorityServer) return null;

  let token: string | undefined;
  try {
    token = getRuntimeServerContext(getState() as any).currentToken || undefined;
  } catch {
    token = undefined;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), reconcileDeadlineMs());
  try {
    const remote = await fetchFromServer(
      authorityServer,
      dbKey,
      token,
      controller.signal,
    );
    if (remote && typeof remote === "object" && Object.keys(remote).length > 0) {
      return remote as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

let authorityReaderOverride: SettingsAuthorityReader | null = null;

/** 测试用注入点（与 setSettingDbActionThunksForTests 同风格）；传 null 还原真实远端读。 */
export const setSettingsAuthorityReaderForTests = (
  reader: SettingsAuthorityReader | null,
): void => {
  authorityReaderOverride = reader ?? null;
};

/**
 * 在总预算内取权威记录。超时即返回 null，让写队列继续：
 * Promise.race 只负责**释放队列**；若底层请求不支持 AbortSignal（测试注入的读、
 * 或实现被替换），它仍会自己跑完——但那没有副作用，因为对账全程不写库。
 */
const readSettingsAuthorityRecord = async (
  dbKey: string,
  getState: () => unknown,
  accountId: string,
): Promise<Record<string, unknown> | null> => {
  const reader = authorityReaderOverride ?? readAuthoritativeSettingsRecord;
  const read = Promise.resolve()
    .then(() => reader(dbKey, getState, accountId))
    .catch(() => null);
  const deadline = delaySettingsWriteRetry(reconcileDeadlineMs()).then(
    () => null,
  );
  return await Promise.race([read, deadline]);
};

/** 稳定序列化：对象键排序后再比较，避免记录键序差异造成假「不一致」。 */
const stableValueKey = (value: unknown): string => {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableValueKey).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableValueKey(record[key])}`);
  return `{${entries.join(",")}}`;
};

/** 设置值比较（受控的浅层结构，稳定序列化足够）。 */
export const isSameSettingValue = (a: unknown, b: unknown): boolean =>
  stableValueKey(a) === stableValueKey(b);

/**
 * 写**成功**后如何收敛已有的失败状态：
 *  - 无状态 → null（不 dispatch）；
 *  - 其它账号的状态 → 原样返回（跨账号隔离，引用不变以便调用方跳过 dispatch）；
 *  - 同账号且本次成功覆盖了 `keys` 的全部键 → null（清空）；
 *  - 同账号但只覆盖一部分 → 返回剔除已覆盖键后的新状态（剩下的继续可见）。
 *
 * 「本次成功覆盖的键」= 本次意图键 ∪ 本次落到云端的键（本地专有键不落云，
 * 但本次成功就意味着它们已被本地接受，同样算覆盖）。
 */
export const resolveSettingsWriteFailureAfterSuccess = ({
  failure,
  accountId,
  intentKeys,
  persistedKeys,
}: {
  failure: SettingsWriteFailure | null | undefined;
  accountId: string;
  intentKeys: string[];
  persistedKeys: string[];
}): SettingsWriteFailure | null => {
  if (!failure) return null;
  if (failure.accountId !== accountId) return failure;
  const covered = new Set([...intentKeys, ...persistedKeys]);
  const remainingKeys = failure.keys.filter((key) => !covered.has(key));
  if (remainingKeys.length === 0) return null;
  return {
    ...failure,
    keys: remainingKeys,
    unresolvedKeys: failure.unresolvedKeys.filter((key) => !covered.has(key)),
  };
};

/**
 * 重试仍失败后构造可读的失败状态（含对账结论）。
 *
 * matched / mismatched 只在**拿到账号权威服务器的记录**时产生；其余一律
 * unavailable / not-attempted，绝不因为「本地读到的值和本地值相等」就报一致。
 *
 * @param intentKeys   本次用户意图涉及的键（写入副作用：defaultAgentId 等）
 * @param persistedKeys 本次真正落到云端 settings record 的键（对账对象）
 */
export const describeSettingsWriteFailure = async ({
  getState,
  accountId,
  intentEpoch,
  intentKeys,
  persistedKeys,
  at,
}: {
  getState: () => unknown;
  accountId: string;
  intentEpoch: number;
  intentKeys: string[];
  persistedKeys: string[];
  at: number;
}): Promise<SettingsWriteFailure> => {
  const base: SettingsWriteFailure = {
    accountId,
    keys: [...intentKeys].sort(),
    at,
    reconciliation: "not-attempted",
    unresolvedKeys: [...persistedKeys].sort(),
  };

  // 已被更新的本地意图取代：不做任何远端比对（旧意图的差异没有决策价值）。
  if (readLocalIntentEpoch(getState) !== intentEpoch) return base;

  const remoteRecord = await readSettingsAuthorityRecord(
    createUserKey.settings(accountId),
    getState,
    accountId,
  );

  // 读期间用户可能又改了设置：同样放弃对账结论。
  if (readLocalIntentEpoch(getState) !== intentEpoch) return base;

  const serverRecord = sanitizeStoredSettingsRecord(remoteRecord);
  if (!serverRecord) {
    // 没有权威证据（含「权威未知」「请求失败」「超出对账预算」）：不允许给出一致结论。
    return {
      ...base,
      reconciliation: "unavailable" satisfies SettingsWriteReconciliation,
    };
  }

  const localSettings = ((getState() as { settings?: Record<string, unknown> })
    ?.settings ?? {}) as Record<string, unknown>;
  const owner = getAccountChatDisplayOwner(getState);
  const localValues = owner.getAccountId() === accountId
    ? { ...localSettings, ...owner.getSnapshot() }
    : localSettings;
  const unresolvedKeys = persistedKeys
    .filter((key) => !isSameSettingValue(localValues[key], serverRecord[key]))
    .sort();

  return {
    ...base,
    reconciliation: unresolvedKeys.length === 0 ? "matched" : "mismatched",
    unresolvedKeys,
  };
};
