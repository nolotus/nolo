import { useCallback, useEffect, useRef, useState } from "react";
import { read } from "database/dbSlice";

/**
 * 读取「实际实体记录」里的 owner，给侧栏行判定归属用。
 *
 * 为什么需要：目录投影出来的行可能不在已加载条目窗口里（`!cached`），也可能来自
 * 远端空间目录页；此时既不能假定「没有权限」，也不能假定「已授权」。这里只读实体
 * 记录（userId / ownerId），读到之前行的权限保持「未知」，并且**不会**把读失败
 * 变成永久的「无 owner」：
 * - 每次触发内每个 key 最多尝试 `MAX_ATTEMPTS_PER_KEY` 次，超过后标记 failed（不再自动重试），
 *   由 `retry()` / 浏览器 online / keys 变化重新开启核实；
 * - 证据按 `scope`（用户 + 服务器）分区，切账号立即失效；
 * - 一批最多 `batchSize` 个 key，未完成时用 pass 计数推进下一批；卸载后不再 setState。
 */
const MAX_ATTEMPTS_PER_KEY = 2;

export type ContentOwnershipEntry = {
  owner: string | null;
  attempts: number;
  settled: boolean;
};

export type ContentOwnershipEvidenceState = {
  scope: string;
  entries: ReadonlyMap<string, ContentOwnershipEntry>;
};

const EMPTY_OWNERS: ReadonlyMap<string, string | null> = new Map();

export function createEvidenceState(scope: string): ContentOwnershipEvidenceState {
  return { scope, entries: new Map() };
}

/** 记录一次读取结果：成功即 settled；失败只累加尝试次数，不落成永久无 owner。 */
export function recordEvidenceResult(
  state: ContentOwnershipEvidenceState,
  scope: string,
  key: string,
  owner: string | null,
  failed: boolean
): ContentOwnershipEvidenceState {
  const base = state.scope === scope ? state : createEvidenceState(scope);
  const previous = base.entries.get(key);
  if (previous?.settled) return base;
  const entries = new Map(base.entries);
  entries.set(key, {
    owner: failed ? null : owner,
    attempts: (previous?.attempts ?? 0) + 1,
    settled: !failed,
  });
  return { scope, entries };
}

/** settled 的 owner（`null` = 读过但没有 owner 字段/记录，仍算未知归属）。 */
export function selectSettledOwners(
  state: ContentOwnershipEvidenceState,
  scope: string
): ReadonlyMap<string, string | null> {
  if (state.scope !== scope) return EMPTY_OWNERS;
  const owners = new Map<string, string | null>();
  for (const [key, entry] of state.entries) {
    if (entry.settled) owners.set(key, entry.owner);
  }
  return owners;
}

/** 还可以自动重试的 key（未 settled 且未到尝试上限）。 */
export function selectUnsettledKeys(
  state: ContentOwnershipEvidenceState,
  scope: string,
  keys: readonly string[]
): string[] {
  const entries = state.scope === scope ? state.entries : undefined;
  return keys.filter((key) => {
    const entry = entries?.get(key);
    if (entry?.settled) return false;
    return (entry?.attempts ?? 0) < MAX_ATTEMPTS_PER_KEY;
  });
}

/** 自动重试已耗尽、需要用户/online 触发的 key。 */
export function selectFailedKeys(
  state: ContentOwnershipEvidenceState,
  scope: string,
  keys: readonly string[]
): string[] {
  if (state.scope !== scope) return [];
  return keys.filter((key) => {
    const entry = state.entries.get(key);
    return Boolean(entry) && !entry!.settled && entry!.attempts >= MAX_ATTEMPTS_PER_KEY;
  });
}

/** 重试时清掉未 settled 的条目（失败计数归零），已 settled 的证据保留。 */
export function resetUnsettledEvidence(
  state: ContentOwnershipEvidenceState
): ContentOwnershipEvidenceState {
  const entries = new Map<string, ContentOwnershipEntry>();
  for (const [key, entry] of state.entries) {
    if (entry.settled) entries.set(key, entry);
  }
  return { scope: state.scope, entries };
}

export function useContentOwnershipEvidence(input: {
  /** 由调用方注入的 store dispatch（本模块不得直接依赖 app/store）。 */
  dispatch: (action: any) => any;
  keys: readonly string[];
  enabled: boolean;
  /** 证据作用域：切用户/服务器必须换 scope，否则旧证据会污染判定。 */
  scope: string;
  /** 单批最多读取多少个 key，避免大空间一次打满。 */
  batchSize?: number;
}): {
  owners: ReadonlyMap<string, string | null>;
  failedKeys: ReadonlySet<string>;
  retry: () => void;
} {
  const { dispatch, keys, enabled, scope, batchSize = 32 } = input;
  const [state, setState] = useState<ContentOwnershipEvidenceState>(() =>
    createEvidenceState(scope)
  );
  const [pass, setPass] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const inFlightRef = useRef<Set<string>>(new Set());
  const keysKey = keys.join("\u0001");

  const retry = useCallback(() => {
    setState((previous) => resetUnsettledEvidence(previous));
    setPass((previous) => previous + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return;
    }
    // 网络恢复时自动重新核实一次（最小明确的恢复触发点）。
    window.addEventListener("online", retry);
    return () => {
      window.removeEventListener("online", retry);
    };
  }, [retry]);

  useEffect(() => {
    if (!enabled || !keysKey) return;
    const allKeys = keysKey.split("\u0001").filter(Boolean);
    const current = stateRef.current.scope === scope ? stateRef.current : createEvidenceState(scope);
    if (stateRef.current.scope !== scope) {
      stateRef.current = current;
      setState(current);
    }
    const targets = selectUnsettledKeys(current, scope, allKeys)
      .filter((key) => !inFlightRef.current.has(key))
      .slice(0, batchSize);
    if (!targets.length) return;

    let active = true;
    const readOwner = async (key: string): Promise<void> => {
      inFlightRef.current.add(key);
      let owner: string | null = null;
      let failed = false;
      try {
        const action = dispatch(read({ dbKey: key }) as any) as any;
        const record =
          action && typeof action.unwrap === "function"
            ? await action.unwrap()
            : null;
        const candidate =
          record && typeof record === "object"
            ? typeof (record as any).userId === "string"
              ? (record as any).userId
              : typeof (record as any).ownerId === "string"
                ? (record as any).ownerId
                : null
            : null;
        owner =
          typeof candidate === "string" && candidate.trim()
            ? candidate.trim()
            : null;
      } catch {
        failed = true;
      } finally {
        inFlightRef.current.delete(key);
      }
      if (!active) return;
      setState((previous) => recordEvidenceResult(previous, scope, key, owner, failed));
    };

    void (async () => {
      for (let index = 0; index < targets.length && active; index += 4) {
        await Promise.all(
          targets.slice(index, index + 4).map((key) => readOwner(key))
        );
      }
      if (!active) return;
      // 还有未 settled 且未到上限的 key（超出本批或待重试）时推进下一批。
      if (selectUnsettledKeys(stateRef.current, scope, allKeys).length > 0) {
        setPass((previous) => previous + 1);
      }
    })();

    return () => {
      active = false;
    };
  }, [keysKey, enabled, scope, batchSize, dispatch, pass]);

  const owners = selectSettledOwners(state, scope);
  const failedKeys = new Set(selectFailedKeys(state, scope, keys));
  return { owners, failedKeys, retry };
}
