import { extractCustomId } from "core/prefix";
import { useMemo, useRef } from "react";
import { useAppSelector } from "app/store";
import type { Agent } from "app/types";
import { selectAllMsgs } from "chat/messages/messageSlice";
import { useCurrentDialogKey, useDialogProviderInput } from "./dialogRuntimeStore";
import { advanceContextOccupancy, estimateCachedHistory, resolveKnownContextWindow, type HistoryCache, type OccupancyBaseline } from "./dialogContextUsage";

/** Subscribes to message entity updates, including streamed content updates. */
export function useDialogContextUsage(agent?: Agent | null, summary?: string) {
  const key = useCurrentDialogKey();
  const usage = useDialogProviderInput(key);
  const messages = useAppSelector((state: any) => selectAllMsgs(state, key ? extractCustomId(key) : null));
  const historyCache = useRef<{ key: typeof key; entries: HistoryCache }>({ key, entries: new Map() });
  const history = estimateCachedHistory(messages, historyCache.current.key === key ? historyCache.current.entries : new Map());
  historyCache.current = { key, entries: history.cache };
  const systemAndTools = useMemo(() => JSON.stringify({ prompt: agent?.prompt, tools: agent?.tools, summary }), [agent?.prompt, agent?.tools, summary]);
  const baseline = useRef<OccupancyBaseline | undefined>(undefined);
  const next = advanceContextOccupancy(baseline.current, { key, authority: usage, history: history.tokens, messages, systemAndTools });
  baseline.current = next.baseline;
  return { ...next.occupancy, contextWindow: resolveKnownContextWindow(agent ?? {}) };
}
