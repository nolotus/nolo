import { currentAutoReviewTask } from "./autoReviewControl";
import { hostTaskEventsRoot, readHostTask } from "../client/hostTaskEvents";
import type { TuiState } from "./sessionTypes";

/** Account opt-in alone creates no task. Only an existing host task adds gates. */
export function canConsumeChildCompletion(state: TuiState, env: Record<string, string | undefined>): boolean {
  const scope = currentAutoReviewTask(state, env);
  if (!scope) return true;
  const task = readHostTask(hostTaskEventsRoot(env), scope);
  return task.authorization === "active" && task.contract.acceptance !== "pending" && task.contract.acceptance !== "unknown";
}

import type { ChildRunCompletedTurnEvent } from "core/chat/internalTurnEvent";
import { filterUnclaimedChildRuns, buildWakeMessage, buildWakeDisplayText } from "./runCompletionWatcher";
import { traceChildRunWake } from "./runWakeDiagnostics";

/** One consumption boundary for standalone and mid-turn child completions.
 * Disk claims are authoritative; retain the surviving structured identity for
 * receipt settlement rather than filtering rendered text.
 */
export function prepareChildRunConsumption(event: ChildRunCompletedTurnEvent, host: {
  env: Record<string, string | undefined>;
  currentDialogId: string | null;
  markAcknowledged: (runId: string) => void;
}): ChildRunCompletedTurnEvent | null {
  const now = Date.now();
  const { remainingRuns, claimedRunIds } = filterUnclaimedChildRuns(event.runs, { env: host.env, now: () => now });
  traceChildRunWake("consume-claim-filter", event, host.currentDialogId,
    { remainingCount: remainingRuns.length, claimedCount: claimedRunIds.length });
  for (const run of event.runs) host.markAcknowledged(run.runId);
  if (!remainingRuns.length) return null;
  if (remainingRuns.length === event.runs.length) return event;
  return { ...event, runs: remainingRuns, text: buildWakeMessage(remainingRuns, now),
    displayText: buildWakeDisplayText(remainingRuns, now) };
}
