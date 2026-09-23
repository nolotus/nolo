import type { AgentExecutionObservationEvent } from "./executionObservation";

export type ExecutionObservationCollector = {
  /** Record one canonical runtime observation in arrival order. */
  observe: (event: AgentExecutionObservationEvent) => void;
  /** Return a detached array snapshot. Mutating it cannot mutate collector state. */
  snapshot: () => AgentExecutionObservationEvent[];
  /** Number of observations currently retained for this run. */
  size: () => number;
  /** Explicit lifecycle reset for hosts that reuse a collector instance. */
  clear: () => void;
};

/**
 * Minimal host-side accumulator for one Agent Runtime execution.
 *
 * This primitive deliberately knows nothing about Evolution, persistence,
 * signals, triage, or run outcomes. Hosts own its lifecycle and decide what to
 * do with the detached snapshot after a run completes.
 */
export function createExecutionObservationCollector(): ExecutionObservationCollector {
  const events: AgentExecutionObservationEvent[] = [];

  return {
    observe(event) {
      events.push(event);
    },
    snapshot() {
      return events.slice();
    },
    size() {
      return events.length;
    },
    clear() {
      events.length = 0;
    },
  };
}
