/** Shared, platform-neutral contracts. No storage, scheduling, history mutation or authorization.
 * Hosts must resolve original user text, its revision, delivery standards and original evidence.
 * Resolved evidence is a TRUST boundary: never cast assistant text / run status / persisted
 * `closed` into an observation. Each kind means the host has verified its actual outcome:
 * artifact = readable delivered artifact; research = supported research result;
 * user-acceptance = original explicit user acceptance for this version;
 * repository-commit/push = verified repository/ref/OID and (for push) remote observation.
 * Reference existence alone does not establish any of those outcomes.
 */
export type WorkRef = { userMessageKey: string; localId: string };
export type WorkAnchor = { localId: string; source: { quote: string; occurrence: number } };
export type WorkAnchorsV1 = { version: 1; items: WorkAnchor[] };
export type WorkEvidenceRef = { dialogKey: string; messageId: string; toolCallId?: string };
export type WorkEvidenceKind = "artifact" | "research" | "user-acceptance" | "repository-commit" | "repository-push";
export type WorkDeliveryCriterion = { id: string; evidenceKinds: readonly WorkEvidenceKind[] };
export type WorkVersionRef = {
  work: WorkRef;
  /** Host-supplied original work revision, never inferred from run status or titles. */
  workVersion: string;
  /** Changes whenever the agreed delivery criteria change. Not a permission grant. */
  deliveryStandardVersion: string;
};
export type ResolvedWorkEvidence = WorkVersionRef & {
  criterionId: string;
  kind: WorkEvidenceKind;
  outcome: "satisfied" | "failed" | "blocked";
  ref: WorkEvidenceRef;
};
export type WorkClosureCandidate = WorkVersionRef & { evidence: readonly WorkEvidenceRef[] };
export type WorkClosureDecision =
  | { kind: "open" }
  | { kind: "unknown"; reason: string }
  | { kind: "blocked" | "failed"; reason: string; evidence: readonly WorkEvidenceRef[] }
  | { kind: "closed"; proof: WorkClosureCandidate };
export type WorkContinuityV1 = {
  version: 1;
  revision: number;
  items: readonly (WorkVersionRef & { disposition: WorkClosureDecision })[];
};
/** Input only; C owns summary sidecar storage and anchor/version binding. */
export type WorkSummarySource = WorkVersionRef;
export type WorkContinuation = "allowed" | "stopped" | "unknown";
export type WorkClosureInput = WorkVersionRef & {
  originalUserMessage: string;
  anchors: unknown;
  criteria: readonly WorkDeliveryCriterion[];
  candidate: unknown;
  resolvedEvidence: readonly unknown[];
  /** All currently unresolved issues for this work version, supplied by the host. */
  unresolved: readonly { kind: "unknown" | "blocked" | "failed"; reason: string }[];
};

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const evidenceKinds: readonly string[] = ["artifact", "research", "user-acceptance", "repository-commit", "repository-push"];
function isWorkRef(v: unknown): v is WorkRef {
  return record(v) && text(v.userMessageKey) && text(v.localId);
}
function isVersion(v: unknown): v is WorkVersionRef {
  return record(v) && isWorkRef(v.work) && text(v.workVersion) && text(v.deliveryStandardVersion);
}
function sameWork(a: WorkRef, b: WorkRef): boolean {
  return a.userMessageKey === b.userMessageKey && a.localId === b.localId;
}
function sameVersion(a: WorkVersionRef, b: WorkVersionRef): boolean {
  return sameWork(a.work, b.work) && a.workVersion === b.workVersion && a.deliveryStandardVersion === b.deliveryStandardVersion;
}
function isEvidenceRef(v: unknown): v is WorkEvidenceRef {
  return record(v) && text(v.dialogKey) && text(v.messageId) && (v.toolCallId === undefined || text(v.toolCallId));
}
function sameEvidenceRef(a: WorkEvidenceRef, b: WorkEvidenceRef): boolean {
  return a.dialogKey === b.dialogKey && a.messageId === b.messageId && a.toolCallId === b.toolCallId;
}
function isCandidate(v: unknown): v is WorkClosureCandidate {
  return record(v) && Array.isArray(v.evidence) && v.evidence.length > 0 && v.evidence.every(isEvidenceRef) && isVersion(v);
}
function isResolvedEvidence(v: unknown): v is ResolvedWorkEvidence {
  return record(v) && text(v.criterionId) && typeof v.kind === "string" && evidenceKinds.includes(v.kind)
    && ["satisfied", "failed", "blocked"].includes(v.outcome as string) && isEvidenceRef(v.ref) && isVersion(v);
}

/** Canonical JSON tuple encoding avoids delimiter collisions; usable unchanged in subjectRefs. */
export function encodeWorkRef(work: WorkRef): string {
  if (!isWorkRef(work)) throw new TypeError("Invalid WorkRef");
  return `work:v1:${JSON.stringify([work.userMessageKey, work.localId])}`;
}
export function decodeWorkRef(value: unknown): WorkRef | null {
  if (typeof value !== "string" || !value.startsWith("work:v1:")) return null;
  try {
    const tuple: unknown = JSON.parse(value.slice(8));
    if (!Array.isArray(tuple) || tuple.length !== 2) return null;
    const work = { userMessageKey: tuple[0], localId: tuple[1] };
    return isWorkRef(work) && encodeWorkRef(work) === value ? work : null;
  } catch { return null; }
}

/** Exact, zero-based, overlapping occurrences. Preserves IDs/order; never invents or reanchors.
 * A match verifies attribution, NOT task semantics or unchanged surrounding message content.
 * The host must invalidate workVersion on relevant edits; a missing match is always unknown.
 */
export function validateWorkAnchors(value: unknown, originalUserMessage: string): WorkAnchorsV1 | null {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.items) || value.items.length === 0
    || typeof originalUserMessage !== "string") return null;
  const items: WorkAnchor[] = [];
  const ids = new Set<string>();
  for (const item of value.items) {
    if (!record(item) || !text(item.localId) || ids.has(item.localId) || !record(item.source)
      || !text(item.source.quote) || !Number.isSafeInteger(item.source.occurrence) || (item.source.occurrence as number) < 0) return null;
    const { quote } = item.source;
    const occurrence = item.source.occurrence as number;
    // There cannot be more matches than source code units. Bounds avoid hostile huge loops.
    if (occurrence >= originalUserMessage.length) return null;
    let position = -1;
    for (let n = 0; n <= occurrence; n++) {
      position = originalUserMessage.indexOf(quote, position + 1);
      if (position === -1) return null;
    }
    ids.add(item.localId);
    items.push({ localId: item.localId, source: { quote, occurrence } });
  }
  return { version: 1, items };
}

/** Re-evaluate persisted candidates with fresh host-resolved observations; never trust closed.
 * All agreed criteria must be met. No mandatory push, no run-done or assistant-claim kind.
 * Unknown and unresolved failure/blockers remain active, even beside successful observations.
 */
export function evaluateWorkClosure(input: WorkClosureInput): WorkClosureDecision {
  const unknown = (reason: string): WorkClosureDecision => ({ kind: "unknown", reason });
  if (!isVersion(input)) return unknown("invalid-work-version");
  const anchors = validateWorkAnchors(input.anchors, input.originalUserMessage);
  if (!anchors?.items.some(a => a.localId === input.work.localId)) return unknown("unverified-source-anchor");
  if (!Array.isArray(input.unresolved)) return unknown("unresolved-state-unavailable");
  if (input.unresolved.some(i => !record(i) || !(typeof i.kind === "string" && ["unknown", "failed", "blocked"].includes(i.kind)) || !text(i.reason))) return unknown("invalid-unresolved-state");
  for (const kind of ["failed", "blocked", "unknown"] as const) {
    const issue = input.unresolved.find(i => i.kind === kind);
    if (issue) return kind === "unknown" ? unknown(issue.reason) : { kind, reason: issue.reason, evidence: [] };
  }
  if (!Array.isArray(input.criteria) || input.criteria.length === 0) return unknown("delivery-criteria-unavailable");
  const ids = new Set<string>();
  for (const c of input.criteria) {
    if (!record(c) || !text(c.id) || ids.has(c.id) || !Array.isArray(c.evidenceKinds) || c.evidenceKinds.length === 0
      || !c.evidenceKinds.every(k => typeof k === "string" && evidenceKinds.includes(k))) return unknown("invalid-delivery-criteria");
    ids.add(c.id);
  }
  if (!isCandidate(input.candidate) || !sameVersion(input, input.candidate)) return unknown("candidate-version-mismatch");
  if (!Array.isArray(input.resolvedEvidence) || !input.resolvedEvidence.every(isResolvedEvidence)) return unknown("invalid-resolved-evidence");
  const current = input.resolvedEvidence.filter(e => sameVersion(input, e));
  const selected: ResolvedWorkEvidence[] = [];
  for (const ref of input.candidate.evidence) {
    const matches = current.filter(e => sameEvidenceRef(e.ref, ref));
    if (matches.length === 0) return unknown("evidence-unavailable");
    selected.push(...matches);
  }
  // Conflicting observations for the same criterion/ref cannot establish a final outcome.
  if (current.some(a => current.some(b => a.criterionId === b.criterionId && sameEvidenceRef(a.ref, b.ref)
    && (a.outcome !== b.outcome || a.kind !== b.kind)))) return unknown("conflicting-evidence");
  for (const kind of ["failed", "blocked"] as const) {
    const issues = current.filter(e => e.outcome === kind);
    if (issues.length) return { kind, reason: "unresolved-evidence", evidence: issues.map(e => ({ ...e.ref })) };
  }
  if (!input.criteria.every(c => selected.some(e => e.criterionId === c.id && e.outcome === "satisfied" && c.evidenceKinds.includes(e.kind)))) {
    return unknown("delivery-criteria-not-proven");
  }
  return { kind: "closed", proof: {
    work: { ...input.work }, workVersion: input.workVersion, deliveryStandardVersion: input.deliveryStandardVersion,
    evidence: input.candidate.evidence.map(ref => ({ ...ref })),
  } };
}

/** Re-evaluate full host-resolved closure inputs; persisted closed dispositions never suffice.
 * Mixed/unattributed legacy text stays. Does not edit history or create a summary sidecar.
 */
export function evaluateSummaryWorkAttribution(
  sources: readonly WorkSummarySource[],
  evaluations: readonly WorkClosureInput[],
): "retain" | "exclude" {
  if (!sources.length) return "retain";
  return sources.every(source => {
    if (!isVersion(source)) return false;
    const matches = evaluations.filter(item => isVersion(item) && sameVersion(source, item));
    return matches.length > 0 && matches.every(item => evaluateWorkClosure(item).kind === "closed");
  }) ? "exclude" : "retain";
}

/** Host supplies current work-scoped control observations, not unrelated messages/run status.
 * allowed means no continuity stop is known, NOT authorization. Missing state is unknown.
 * Explicit resume must be resolved by the host against the stop generation before calling.
 */
export function evaluateWorkContinuation(observations: readonly unknown[]): WorkContinuation {
  if (observations.includes("stopped")) return "stopped";
  return observations.length > 0 && observations.every(o => o === "allowed") ? "allowed" : "unknown";
}
