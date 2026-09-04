/**
 * Deterministic execution-boundary check for agent economics (Phase 2B-0).
 *
 * This checks only the next boundary exposed by the start snapshot. It does not
 * forecast policy activation during a no-policy gap or build a full timeline.
 */
import {
  type EconomicsPolicy,
  type EconomicsSourceInput,
  ECONOMICS_POLICIES,
} from "./economicsPolicy";
import {
  type AgentEconomicsSnapshot,
  resolveEconomicsSnapshot,
} from "./economicsSnapshot";

export interface ExecutionBoundaryCheckInput {
  source: EconomicsSourceInput;
  expectedStartAt: number;
  durationMs: number;
}

export interface ExecutionBoundaryCheck {
  expectedStartAt: number;
  expectedEndAt: number;
  startSnapshot: AgentEconomicsSnapshot | null;
  crossesBoundary: boolean;
  boundaryAt?: number;
  afterBoundarySnapshot?: AgentEconomicsSnapshot | null;
}

function assertValidInput({ expectedStartAt, durationMs }: ExecutionBoundaryCheckInput): number {
  if (!Number.isFinite(expectedStartAt)) {
    throw new Error("expectedStartAt must be finite");
  }
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error("durationMs must be finite and non-negative");
  }
  const expectedEndAt = expectedStartAt + durationMs;
  if (!Number.isFinite(expectedEndAt)) {
    throw new Error("expectedEndAt must remain finite");
  }
  return expectedEndAt;
}

export function checkExecutionEconomicsBoundary(
  input: ExecutionBoundaryCheckInput,
  policies: readonly EconomicsPolicy[] = ECONOMICS_POLICIES
): ExecutionBoundaryCheck {
  const expectedEndAt = assertValidInput(input);
  const { source, expectedStartAt } = input;
  const startSnapshot = resolveEconomicsSnapshot(source, expectedStartAt, policies);
  const boundaryAt = startSnapshot?.changesAt;
  // Half-open [start, end): a boundary exactly at end does not count.
  const crossesBoundary = boundaryAt !== undefined && boundaryAt < expectedEndAt;

  return {
    expectedStartAt,
    expectedEndAt,
    startSnapshot,
    crossesBoundary,
    ...(crossesBoundary
      ? {
          boundaryAt,
          afterBoundarySnapshot: resolveEconomicsSnapshot(source, boundaryAt, policies),
        }
      : {}),
  };
}
