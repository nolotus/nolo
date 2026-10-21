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
  loadMore: () => Promise<void>;
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
  const generation = useRef(0);
  const inFlight = useRef(false);
  const failed = useRef(new Set<string>());
  const cursors = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    generation.current += 1;
    inFlight.current = false;
    cursors.current = new Map();
    failed.current.clear();
    setPageState({ identityKey, records: [] });
    setError(null);
    setHasMore(enabled && !!currentUserId && !!currentToken && servers.length > 0);
    setLoading(false);
    const effectGeneration = generation.current;
    return () => {
      if (generation.current === effectGeneration) generation.current += 1;
      inFlight.current = false;
    };
  }, [enabled, currentUserId, currentToken, originsKey]);

  const loadMore = useCallback(async () => {
    if (!enabled || !currentUserId || !currentToken || servers.length === 0 || inFlight.current) return;
    const run = generation.current;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      // A retry round never advances a healthy source.
      const origins = [...servers].sort().filter((server) => failed.current.size ? failed.current.has(server) : cursors.current.get(server) !== null);
      const settled = await Promise.allSettled(origins.map(async (server) => {
        const cursor = cursors.current.get(server);
        if (cursor === null) return { server, records: [] as OwnedDialogSummary[], nextCursor: null };
        const page = await fetchOwnedDialogPage({
          server, userId: currentUserId, authToken: currentToken, cursor: cursor ?? null, limit: 100,
        });
        return { server, ...page };
      }));
      if (run !== generation.current) return;
      settled.forEach((outcome, index) => {
        if (outcome.status === "rejected") failed.current.add(origins[index]!);
        else failed.current.delete(origins[index]!);
      });
      const pages = settled.flatMap((outcome) => outcome.status === "fulfilled" ? [outcome.value] : []);
      // Failed origins keep their existing cursor. Never advance them past missing history.
      for (const page of pages) cursors.current.set(page.server, page.nextCursor);
      if (pages.length > 0) {
        setPageState((previousState) => {
          if (previousState.identityKey !== identityKey) return previousState;
          // Preserve every source/page candidate, including deletion and restore evidence.
          return { identityKey, records: [...previousState.records, ...pages.flatMap((p) => p.records)] };
        });
      }
      const failures = settled.filter((outcome) => outcome.status === "rejected").length;
      setError(failures > 0 ? `${failures} 个服务器的历史查询失败，点击下方加载按钮仅重试失败来源；成功后可继续加载下一页。` : null);
      setHasMore(failures > 0 || servers.some((server) => cursors.current.get(server) !== null));

    } catch (cause) {
      if (run === generation.current) setError(cause instanceof Error ? cause.message : "历史查询失败");
    } finally {
      if (run === generation.current) { inFlight.current = false; setLoading(false); }
    }
  }, [enabled, currentUserId, currentToken, originsKey]);
  useEffect(() => {
    if (enabled && currentUserId && currentToken) void loadMore();
  }, [enabled, currentUserId, currentToken, originsKey, loadMore]);
  const sameIdentity = pageState.identityKey === identityKey;
  return { identityKey, records: sameIdentity ? pageState.records : [], error: sameIdentity ? error : null,
    loading: sameIdentity && loading, hasMore: sameIdentity && hasMore, loadMore };
}
