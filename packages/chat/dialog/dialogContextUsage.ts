export {
  resolveOccupancy as calculateContextOccupancy,
  estimateMessagesTokens as estimateDialogHistory,
  resolveOccupancyWindow as resolveKnownContextWindow,
} from "ai/context/contextOccupancy";

import { estimateTokenCount } from "ai/context/tokenUtils";
import { estimateMessagesTokens, historyTokensBeforeLatestAssistant, resolveOccupancy } from "ai/context/contextOccupancy";

type Message = { id: string; role?: string; content?: unknown };
type Entry = { message: Message; tokens: number };
export type HistoryCache = Map<string, Entry>;

/** Redux entities retain identity until changed; only changed messages are serialized. */
export function estimateCachedHistory(messages: readonly Message[], previous: HistoryCache) {
  const cache: HistoryCache = new Map();
  let tokens = 0;
  let recalculated = 0;
  for (const message of messages) {
    let entry = previous.get(message.id);
    if (!entry || entry.message !== message) {
      entry = { message, tokens: estimateMessagesTokens([message]) };
      recalculated++;
    }
    cache.set(message.id, entry);
    tokens += entry.tokens;
  }
  return { cache, tokens, recalculated };
}

type Authority = { inputTokens: number; observedAt: number } | null;
export type OccupancyBaseline = {
  key: string | null | undefined;
  authority: Authority;
  history: number;
  generated: number;
};

/** Provider input precedes its answer; retain that answer and subsequent content as increments. */
export function advanceContextOccupancy(previous: OccupancyBaseline | undefined, input: {
  key: string | null | undefined;
  authority: Authority;
  history: number;
  messages: readonly { role?: string; content?: unknown }[];
  systemAndTools: string;
}) {
  const changed = !previous || previous.key !== input.key ||
    previous.authority?.observedAt !== input.authority?.observedAt ||
    previous.authority?.inputTokens !== input.authority?.inputTokens;
  const baselineHistory = changed && input.authority
    ? historyTokensBeforeLatestAssistant(input.messages)
    : input.history;
  const baseline: OccupancyBaseline = changed
    ? {
      key: input.key,
      authority: input.authority,
      history: baselineHistory,
      generated: Math.max(0, input.history - baselineHistory),
    }
    : { ...previous, generated: Math.max(previous.generated, input.history - previous.history) };
  return {
    baseline,
    occupancy: resolveOccupancy({
      authoritativeInput: input.authority?.inputTokens,
      baselineEstimate: estimateTokenCount(input.systemAndTools) + input.history,
      generatedSinceAuthority: baseline.generated,
    }),
  };
}
