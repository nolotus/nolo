import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "app/store";
import { selectRuntimeRemoteServers, selectRuntimeSnapshot } from "app/stateViews/runtime";
import { fetchOwnedDialogPage, type OwnedDialogSummary } from "database/client/ownedDialogPage";

export interface OwnedDialogPagesState {
  records: OwnedDialogSummary[];
  identityKey: string;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  pendingSourceCount: number;
  loadMore: (opts?: { retryFailed?: boolean }) => Promise<void>;
}
/** Owned-account remote history only. Never treat this as a complete Work listing. */
export function useOwnedDialogPages(enabled: boolean): OwnedDialogPagesState {
  const { currentUserId, currentToken } = useAppSelector(selectRuntimeSnapshot);
  const servers = useAppSelector(selectRuntimeRemoteServers);
  const originsKey = [...servers].sort().join("\n");
  const identityKey = JSON.stringify([enabled, currentUserId, currentToken, originsKey]);
  const [pageState, setPageState] = useState<{ identityKey: string; records: OwnedDialogSummary[] }>({ identityKey, records: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pendingSourceCount, setPendingSourceCount] = useState(0);
  const generation = useRef(0);
  const inFlight = useRef(new Set<string>());
  const failed = useRef(new Set<string>());
  const cursors = useRef<Map<string, string | null>>(new Map());
  const attempts = useRef(new Map<string, number>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    generation.current += 1;
    inFlight.current = new Set();
    cursors.current = new Map();
    failed.current = new Set();
    attempts.current = new Map();
    timers.current = new Map();
    setPageState({ identityKey, records: [] });
    setError(null);
    const count = enabled && currentUserId && currentToken ? servers.length : 0;
    setPendingSourceCount(count);
    setHasMore(count > 0);
    setLoading(false);
    const effectGeneration = generation.current;
    return () => {
      if (generation.current === effectGeneration) generation.current += 1;
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    };
  }, [enabled, currentUserId, currentToken, originsKey]);

  const loadMore = useCallback(async (opts?: { retryFailed?: boolean }) => {
    if (!enabled || !currentUserId || !currentToken || servers.length === 0) return;
    const run = generation.current;
    const updateStatus = () => {
      const count = servers.filter((server) => !failed.current.has(server) && cursors.current.get(server) !== null).length;
      setPendingSourceCount(count);
      setHasMore(count > 0 || failed.current.size > 0);
      setError(failed.current.size ? `${failed.current.size} 个服务器的历史查询失败，可点击下方加载按钮重试。` : null);
      setLoading(inFlight.current.size > 0);
    };
    const fetchSource = async (server: string): Promise<void> => {
      if (run !== generation.current || inFlight.current.has(server)) return;
      inFlight.current.add(server);
      updateStatus();
      try {
        const page = await fetchOwnedDialogPage({
          server, userId: currentUserId, authToken: currentToken, cursor: cursors.current.get(server) ?? null, limit: 100,
        });
        if (run !== generation.current) return;
        failed.current.delete(server);
        attempts.current.delete(server);
        const timer = timers.current.get(server);
        if (timer !== undefined) clearTimeout(timer);
        timers.current.delete(server);
        cursors.current.set(server, page.nextCursor);
        setPageState((previousState) => previousState.identityKey !== identityKey ? previousState :
          { identityKey, records: [...previousState.records, ...page.records] });
      } catch {
        if (run !== generation.current) return;
        failed.current.add(server);
        const count = attempts.current.get(server) ?? 0;
        if (count < 2 && !timers.current.has(server)) {
          const timer = setTimeout(() => {
            timers.current.delete(server);
            if (run !== generation.current || !failed.current.has(server)) return;
            attempts.current.set(server, count + 1);
            void fetchSource(server);
          }, count === 0 ? 2000 : 4000);
          timers.current.set(server, timer);
        }
      } finally {
        if (run === generation.current) {
          inFlight.current.delete(server);
          updateStatus();
        }
      }
    };
    const origins = [...servers].sort().filter((server) =>
      !inFlight.current.has(server) && (failed.current.has(server) ? opts?.retryFailed !== false : cursors.current.get(server) !== null));
    for (const server of origins) {
      if (failed.current.has(server)) {
        const timer = timers.current.get(server);
        if (timer !== undefined) clearTimeout(timer);
        timers.current.delete(server);
        attempts.current.delete(server);
      }
    }
    await Promise.all(origins.map(fetchSource));
  }, [enabled, currentUserId, currentToken, originsKey]);
  useEffect(() => {
    if (enabled && currentUserId && currentToken) void loadMore();
  }, [enabled, currentUserId, currentToken, originsKey, loadMore]);
  const sameIdentity = pageState.identityKey === identityKey;
  return { identityKey, records: sameIdentity ? pageState.records : [], error: sameIdentity ? error : null,
    loading: sameIdentity && loading, hasMore: sameIdentity && hasMore,
    pendingSourceCount: sameIdentity ? pendingSourceCount : 0, loadMore };
}
