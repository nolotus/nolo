/**
 * An explicit placement decision, separate from the legacy machine-tool router's
 * string|null return value. Pure: does not select a machine, authorize a user,
 * inspect the registry, or execute a tool.
 *
 * STRICT is opt-in only. Existing callers must retain their historical fallback
 * until individually migrated with owner approval.
 */
export type MachinePlacementDecision =
  | { kind: "routed"; machineId: string }
  | { kind: "not-applicable"; reason: "tool-not-supported" | "legacy-unbound" }
  | { kind: "denied"; reason: "machine-permission-denied" }
  | { kind: "target-unavailable"; machineId: string };

export type MachinePlacementEvidence =
  | { kind: "routed"; machineId: string }
  | { kind: "unsupported-tool" }
  | { kind: "machine-unavailable"; requestedMachineId?: string | null }
  | { kind: "permission-denied" };

export function decideMachinePlacement(
  evidence: MachinePlacementEvidence,
  mode: "legacy" | "strict",
): MachinePlacementDecision {
  switch (evidence.kind) {
    case "routed":
      if (!evidence.machineId.trim()) throw new Error("Routed machine requires a machineId");
      return { kind: "routed", machineId: evidence.machineId };
    case "unsupported-tool":
      return { kind: "not-applicable", reason: "tool-not-supported" };
    case "permission-denied":
      return { kind: "denied", reason: "machine-permission-denied" };
    case "machine-unavailable": {
      const machineId = evidence.requestedMachineId?.trim();
      return mode === "strict" && machineId
        ? { kind: "target-unavailable", machineId }
        : { kind: "not-applicable", reason: "legacy-unbound" };
    }
  }
}

/** Only the legacy adapter may continue server dispatch on a non-route. */
export function mayFallbackToServer(
  decision: MachinePlacementDecision,
  mode: "legacy" | "strict",
): boolean {
  return mode === "legacy" && decision.kind !== "routed";
}
