import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { read, selectEntities } from "database/dbSlice";
import { SpaceContent, Agent, ContentType } from "app/types";
import { calculateRetryDelayMs } from "./agentFetchRetry";
import { isTombstoneRecord } from "database/tombstones";

const FETCH_CONCURRENCY = 6;

type RetryState = {
  attempt: number;
  nextRetryAt: number;
};

const isAgentItem = (item: SpaceContent) => {
  const type = item.type?.toLowerCase();
  const key = item.contentKey;
  return type === ContentType.AGENT || key.startsWith("agent-");
};

export const useAgentFetcher = (items: SpaceContent[] | undefined | null) => {
  const dispatch = useAppDispatch();
  const dbEntities = useAppSelector(selectEntities);
  const inFlightKeysRef = useRef<Set<string>>(new Set());
  const retryStateRef = useRef<Map<string, RetryState>>(new Map());
  const visibleAgentKeysRef = useRef<string[]>([]);
  const dbEntitiesRef = useRef(dbEntities);

  const markReadFailure = useCallback((key: string) => {
    const previous = retryStateRef.current.get(key);
    const attempt = Math.min((previous?.attempt ?? 0) + 1, 6);
    retryStateRef.current.set(key, {
      attempt,
      nextRetryAt: Date.now() + calculateRetryDelayMs(attempt, Math.random()),
    });
  }, []);

  const visibleAgentKeys = useMemo(() => {
    if (!items || items.length === 0) return [];
    const keys: string[] = [];
    const seen = new Set<string>();
    items.forEach((item) => {
      if (!item || !isAgentItem(item)) return;
      const key = item.contentKey;
      if (seen.has(key)) return;
      seen.add(key);
      keys.push(key);
    });
    return keys;
  }, [items]);

  const agentsMap = useMemo(() => {
    const next = new Map<string, Agent>();
    visibleAgentKeys.forEach((key) => {
      const agent = dbEntities[key] as Agent | undefined;
      if (agent && !isTombstoneRecord(agent)) next.set(key, agent);
    });
    return next;
  }, [visibleAgentKeys, dbEntities]);

  useEffect(() => {
    visibleAgentKeysRef.current = visibleAgentKeys;
  }, [visibleAgentKeys]);

  useEffect(() => {
    dbEntitiesRef.current = dbEntities;
  }, [dbEntities]);

  useEffect(() => {
    const visible = new Set(visibleAgentKeys);
    for (const key of Array.from(inFlightKeysRef.current)) {
      if (!visible.has(key)) inFlightKeysRef.current.delete(key);
    }
    for (const [key] of Array.from(retryStateRef.current.entries())) {
      if (!visible.has(key)) {
        retryStateRef.current.delete(key);
      }
    }
  }, [visibleAgentKeys]);

  const fetchAgents = useCallback(async () => {
    const currentVisibleAgentKeys = visibleAgentKeysRef.current;
    const currentDbEntities = dbEntitiesRef.current;

    if (currentVisibleAgentKeys.length === 0) return;

    const now = Date.now();
    const queue: string[] = [];
    currentVisibleAgentKeys.forEach((key) => {
      if (currentDbEntities[key]) {
        retryStateRef.current.delete(key);
        return;
      }
      if (inFlightKeysRef.current.has(key)) return;
      const retryState = retryStateRef.current.get(key);
      if (
        retryState &&
        typeof retryState.nextRetryAt === "number" &&
        now < retryState.nextRetryAt
      ) {
        return;
      }
      queue.push(key);
    });

    if (queue.length === 0) return;

    const workers = Array.from(
      { length: Math.min(FETCH_CONCURRENCY, queue.length) },
      async () => {
        while (queue.length > 0) {
          const key = queue.shift();
          if (!key) continue;

          inFlightKeysRef.current.add(key);
          try {
            const agentData = await (dispatch as any)(
              read({ dbKey: key })
            ).unwrap();
            if (agentData) {
              retryStateRef.current.delete(key);
            } else {
              markReadFailure(key);
            }
          } catch {
            markReadFailure(key);
          } finally {
            inFlightKeysRef.current.delete(key);
          }
        }
      }
    );

    await Promise.all(workers);
  }, [dispatch, markReadFailure]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents, visibleAgentKeys, dbEntities]);

  return {
    agentsMap,
    fetchAgents,
  };
};
