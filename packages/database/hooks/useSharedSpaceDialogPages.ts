import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSharedSpaceDialogPage, type SharedSpaceDialogSummary } from "database/client/sharedSpaceDialogPage";

export interface SharedSpaceDialogPagesState {
  identityKey: string;
  records: SharedSpaceDialogSummary[];
  recordsBySpace: Record<string, SharedSpaceDialogSummary[]>;
  errorsBySpace: Record<string, string | null>;
  loadingSpaces: string[];
  hasMoreSpaces: string[];
  loadMore: (spaceId?: string) => Promise<void>;
}
export type SharedSpaceDialogPagesOptions = { enabled: boolean; spaceIds: string[]; account: string; token: string; origins: string[] };
const statusOf = (error: unknown) => (error as Error & { status?: number } | null)?.status;

export function useSharedSpaceDialogPages({ enabled, spaceIds, account, token, origins }: SharedSpaceDialogPagesOptions): SharedSpaceDialogPagesState {
  const sortedSpaces = [...new Set(spaceIds)].sort();
  const sortedOrigins = [...new Set(origins)].sort();
  const identityKey = JSON.stringify([enabled, account, token, sortedOrigins, sortedSpaces]);
  const generation = useRef(0);
  const busy = useRef(new Set<string>());
  const failed = useRef(new Set<string>());
  const cursors = useRef(new Map<string, string | null | undefined>());
  const [state, setState] = useState<{ key: string; sources: Record<string, SharedSpaceDialogSummary[]>; errors: Record<string, string | null>; loading: string[] }>({ key: identityKey, sources: {}, errors: {}, loading: [] });

  useEffect(() => {
    generation.current++;
    const ownGeneration = generation.current;
    busy.current.clear();
    failed.current.clear();
    cursors.current = new Map(sortedSpaces.flatMap((space) => sortedOrigins.map((origin) => [`${space}\n${origin}`, undefined] as const)));
    setState({ key: identityKey, sources: {}, errors: {}, loading: [] });
    return () => { if (generation.current === ownGeneration) generation.current++; busy.current.clear(); };
  }, [identityKey]);

  const loadMore = useCallback(async (requested?: string) => {
    if (!enabled || !account || !token || sortedOrigins.length === 0) return;
    const run = generation.current;
    const retrying = [...failed.current].some((key) => !requested || key.startsWith(`${requested}\n`));
    const targets = sortedSpaces.filter((space) => (!requested || requested === space) && !busy.current.has(space) && sortedOrigins.some((origin) => cursors.current.get(`${space}\n${origin}`) !== null && (!retrying || failed.current.has(`${space}\n${origin}`))));
    if (!targets.length) return;
    for (const space of targets) busy.current.add(space);
    setState((current) => current.key === identityKey ? { ...current, loading: [...new Set([...current.loading, ...targets])] } : current);
    const settled = await Promise.all(targets.map(async (spaceId) => {
      const pages = await Promise.all(sortedOrigins.map(async (server) => {
        const key = `${spaceId}\n${server}`;
        const cursor = cursors.current.get(key);
        if (cursor === null || (retrying && !failed.current.has(`${spaceId}\n${server}`))) return { server, skipped: true as const };
        try { return { server, page: await fetchSharedSpaceDialogPage({ server, spaceId, authToken: token, cursor: cursor ?? null, limit: 100 }) }; }
        catch (error) { return { server, error }; }
      }));
      return { spaceId, pages };
    }));
    if (run !== generation.current) return;
    const unauthorized = settled.some(({ pages }) => pages.some((item) => "error" in item && statusOf(item.error) === 401));
    setState((current) => {
      if (current.key !== identityKey) return current;
      const sources = { ...current.sources }, errors = { ...current.errors };
      if (unauthorized) {
        failed.current.clear();
        for (const key of Object.keys(sources)) delete sources[key];
        for (const key of cursors.current.keys()) cursors.current.set(key, null);
        for (const space of sortedSpaces) delete errors[space];
      } else for (const { spaceId, pages } of settled) {
        let failure: string | null = null;
        for (const item of pages) {
          if ("skipped" in item) continue;
          const key = `${spaceId}\n${item.server}`;
          if ("error" in item) {
            if (statusOf(item.error) === 403) { failed.current.delete(key); cursors.current.set(key, null); delete sources[key]; }
            else { failed.current.add(key); failure = item.error instanceof Error ? item.error.message : "历史查询失败"; }
          } else {
            failed.current.delete(key);
            cursors.current.set(key, item.page.nextCursor);
            sources[key] = [...(sources[key] ?? []), ...item.page.records];
          }
        }
        if (failure !== null) errors[spaceId] = failure;
        else delete errors[spaceId];
      }
      return { key: identityKey, sources, errors, loading: current.loading.filter((space) => !targets.includes(space)) };
    });
    for (const space of targets) busy.current.delete(space);
  }, [enabled, account, token, identityKey]);
  useEffect(() => { if (enabled) void loadMore(); }, [loadMore, enabled, identityKey]);
  const valid = state.key === identityKey;
  const recordsBySpace: Record<string, SharedSpaceDialogSummary[]> = valid
    ? Object.fromEntries(sortedSpaces.map((space) => [space, sortedOrigins.flatMap((origin) => state.sources[`${space}\n${origin}`] ?? [])]))
    : {};
  return { identityKey, recordsBySpace, records: Object.values(recordsBySpace).flat(), errorsBySpace: valid ? state.errors : {}, loadingSpaces: valid ? state.loading : [], hasMoreSpaces: valid ? sortedSpaces.filter((space) => sortedOrigins.some((origin) => cursors.current.get(`${space}\n${origin}`) !== null)) : [], loadMore };
}
