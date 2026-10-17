/**
 * Browser Consent Authority (Host-Neutral Authorization State Machine)
 *
 * SAFETY & ARCHITECTURAL CONTRACT:
 * 1. Host Interface is NOT a Security Sandbox:
 *    This authority maintains in-memory capability state inside the trusted host process.
 *    Same-process / same-UID execution is not memory-isolated. If untrusted code runs
 *    in the same host process, it can access process memory.
 * 2. No Authentic User Identity Verification Claim:
 *    This module does NOT authenticate human identity. Private method invocations
 *    (e.g., recordTrustedUserTurn) cannot verify that caller is biologically human;
 *    true host integration (OS IPC, interactive terminal ingress, attested session)
 *    is an external responsibility deferred to outer layers.
 * 3. Model Arguments are Untrusted:
 *    Model tool call parameters or prompts MUST NEVER be passed as user turns or
 *    approval grants. External code cannot call grant(true), and no grant tickets
 *    are returned to the model.
 * 4. Fail-Closed Default:
 *    Auto-approval is disabled by default (enableAutoApproval: false).
 *    Evaluators marked uncalibrated (such as Jev with calibrated: false) CANNOT
 *    issue approvals unless explicit host calibration certification is provided.
 * 5. Single Scope & No Platform Proliferation:
 *    This authority is strictly host-neutral and domain-scoped; it does not introduce
 *    new external approval platforms, UI, CLI, or browser extension couplings.
 */

export const DEFAULT_CHALLENGE_TTL_MS = 60_000;
export const DEFAULT_MAX_CHALLENGES = 256;

export const BROWSER_CONSENT_BINDING_KEYS = [
  "owner",
  "dialog",
  "browser",
  "tab",
  "document",
  "url",
  "pageRevision",
  "target",
  "action",
  "argsDigest",
  "formDigest",
] as const;

export type BrowserConsentBindingKey = (typeof BROWSER_CONSENT_BINDING_KEYS)[number];

/**
 * Browser action binding identity.
 * Strictly frozen, deep-cloned immutable representation of the target browser context.
 */
export type BrowserConsentBinding = Readonly<{
  owner: string;
  dialog: string;
  browser: string;
  tab: string;
  document: string;
  url: string;
  pageRevision: string;
  target: string;
  action: string;
  argsDigest: string;
  formDigest: string;
}>;

/**
 * Permissive input format accepting aliases (e.g. dialogId, tabId, targetId).
 */
export type BrowserConsentBindingInput = {
  owner: string;
  dialog?: string;
  dialogId?: string;
  browser?: string;
  browserId?: string;
  tab?: string;
  tabId?: string;
  document?: string;
  documentId?: string;
  url: string;
  pageRevision: string;
  target?: string;
  targetId?: string;
  action: string;
  argsDigest: string;
  formDigest: string;
};

export type BrowserConsentState =
  | "pending"
  | "approved"
  | "denied"
  | "revoked"
  | "expired"
  | "consumed";

/**
 * Public snapshot of a challenge.
 * CRITICAL: This snapshot NEVER contains a grant ticket or private capability secret.
 */
export type BrowserConsentSnapshot = Readonly<{
  challengeId: string;
  binding: BrowserConsentBinding;
  summary: string;
  state: BrowserConsentState;
  createdAt: number;
  expiresAt: number;
  decidedAt?: number;
  consumedAt?: number;
  userTurnSequence?: number;
  failureReason?: string;
}>;

/**
 * Trusted user ingress payload provided exclusively by the trusted host.
 */
export type TrustedUserTurn = Readonly<{
  messageId: string;
  sequence: number;
  text: string;
}>;

export type BrowserConsentDecisionKind = "approve" | "deny" | "modify" | "unclear";

export type ConsentIntentEvaluationInput = Readonly<{
  challengeId: string;
  binding: BrowserConsentBinding;
  summary: string;
  userTurn: TrustedUserTurn;
}>;

export type ConsentIntentEvaluationResult = Readonly<{
  decision: BrowserConsentDecisionKind;
  allowCandidate?: boolean;
  calibrated?: boolean;
  confidence?: number;
  reasons?: readonly string[];
  evidenceOnly?: boolean;
}>;

export type ConsentIntentEvaluator = (
  input: ConsentIntentEvaluationInput,
  signal?: AbortSignal
) => Promise<ConsentIntentEvaluationResult>;

export type BrowserConsentFailureReason =
  | "invalid_binding"
  | "missing_binding_field"
  | "invalid_user_turn"
  | "out_of_order_sequence"
  | "capacity_exceeded"
  | "unknown_challenge"
  | "binding_mismatch"
  | "expired"
  | "aborted"
  | "denied"
  | "revoked"
  | "pending"
  | "already_consumed"
  | "not_approved"
  | "auto_approval_disabled"
  | "uncalibrated_evaluator"
  | "candidate_rejected"
  | "concurrent_turn_conflict"
  | "stale_evaluation"
  | "ambiguous_multiple_pending_scope"
  | "invalid_clock"
  | "evaluator_error";

export type RecordUserTurnOptions = {
  signal?: AbortSignal;
  /**
   * Host-provided explicit challenge target. Must NOT be populated from model tool arguments.
   */
  targetChallengeId?: string;
  /**
   * Host-provided explicit list of challenge targets. Must NOT be populated from model tool arguments.
   */
  challengeScope?: readonly string[];
};

export type BrowserConsentConsumeResult =
  | {
      ok: true;
      challengeId: string;
      binding: BrowserConsentBinding;
      consumedAt: number;
    }
  | {
      ok: false;
      reason: BrowserConsentFailureReason;
      error?: string;
    };

export type BrowserConsentCreateResult =
  | {
      ok: true;
      challenge: BrowserConsentSnapshot;
    }
  | {
      ok: false;
      reason: BrowserConsentFailureReason;
      error?: string;
    };

export type RecordUserTurnResult =
  | {
      ok: true;
      sequence: number;
      evaluatedChallenges: readonly {
        challengeId: string;
        decision: BrowserConsentDecisionKind;
        state: BrowserConsentState;
        reason?: string;
      }[];
    }
  | {
      ok: false;
      reason: BrowserConsentFailureReason;
      error?: string;
    };

export type BrowserConsentAuthorityOptions = {
  /**
   * Default false. When false, evaluator approval verdicts cannot transition
   * challenge state to approved.
   */
  enableAutoApproval?: boolean;
  /**
   * Calibration assertion. Evaluators with calibrated: false (e.g. JevConsentDecision)
   * cannot transition challenges to approved unless calibrated: true is asserted.
   */
  calibrated?: boolean;
  /**
   * Injected intent evaluator function.
   */
  intentEvaluator?: ConsentIntentEvaluator;
  /**
   * Default TTL for challenges in milliseconds (default: 60,000ms).
   */
  defaultTtlMs?: number;
  /**
   * Maximum capacity of stored challenges (default: 256).
   */
  maxCapacity?: number;
  /**
   * Injectable clock provider for deterministic testing.
   */
  now?: () => number;
  /**
   * Injectable ID generator for deterministic testing.
   */
  createId?: () => string;
};

type InternalChallengeEntry = {
  challengeId: string;
  binding: BrowserConsentBinding;
  summary: string;
  createdAt: number;
  expiresAt: number;
  state: BrowserConsentState;
  decidedAt?: number;
  consumedAt?: number;
  userTurnSequence?: number;
  failureReason?: string;
  evaluationCount: number;
};

/**
 * Validates and deep clones raw binding data into an immutable BrowserConsentBinding.
 * Fails closed if any required field is missing, empty, or non-string.
 */
export function validateAndCloneBinding(raw: unknown): BrowserConsentBinding {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Binding must be a non-null object");
  }
  const obj = raw as Record<string, unknown>;

  const resolveField = (primary: string, alias?: string): string => {
    const val = obj[primary] !== undefined ? obj[primary] : alias ? obj[alias] : undefined;
    if (typeof val !== "string") {
      throw new Error(`Binding field '${primary}' must be a non-empty string`);
    }
    const trimmed = val.trim();
    if (trimmed.length === 0) {
      throw new Error(`Binding field '${primary}' must be a non-empty string`);
    }
    return trimmed;
  };

  const canonical: BrowserConsentBinding = {
    owner: resolveField("owner"),
    dialog: resolveField("dialog", "dialogId"),
    browser: resolveField("browser", "browserId"),
    tab: resolveField("tab", "tabId"),
    document: resolveField("document", "documentId"),
    url: resolveField("url"),
    pageRevision: resolveField("pageRevision"),
    target: resolveField("target", "targetId"),
    action: resolveField("action"),
    argsDigest: resolveField("argsDigest"),
    formDigest: resolveField("formDigest"),
  };

  return Object.freeze(canonical);
}

/**
 * Checks whether two bindings match exactly across all 11 required identity keys.
 */
export function bindingsMatch(a: BrowserConsentBinding, b: BrowserConsentBinding): boolean {
  for (const key of BROWSER_CONSENT_BINDING_KEYS) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

/**
 * Validates trusted user turn payload strictly.
 */
export function validateTrustedUserTurn(raw: unknown): TrustedUserTurn {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("User turn must be a non-null object");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.messageId !== "string" || obj.messageId.trim().length === 0) {
    throw new Error("User turn messageId must be a non-empty string");
  }
  if (typeof obj.sequence !== "number" || !Number.isSafeInteger(obj.sequence) || obj.sequence < 0) {
    throw new Error("User turn sequence must be a non-negative integer");
  }
  if (typeof obj.text !== "string") {
    throw new Error("User turn text must be a string");
  }
  return Object.freeze({
    messageId: obj.messageId.trim(),
    sequence: obj.sequence,
    text: obj.text,
  });
}

function createPublicSnapshot(entry: InternalChallengeEntry): BrowserConsentSnapshot {
  return Object.freeze({
    challengeId: entry.challengeId,
    binding: entry.binding,
    summary: entry.summary,
    state: entry.state,
    createdAt: entry.createdAt,
    expiresAt: entry.expiresAt,
    ...(entry.decidedAt !== undefined ? { decidedAt: entry.decidedAt } : {}),
    ...(entry.consumedAt !== undefined ? { consumedAt: entry.consumedAt } : {}),
    ...(entry.userTurnSequence !== undefined ? { userTurnSequence: entry.userTurnSequence } : {}),
    ...(entry.failureReason !== undefined ? { failureReason: entry.failureReason } : {}),
  });
}

/**
 * Host-neutral browser consent authority state machine.
 */
export class BrowserConsentAuthority {
  private readonly challenges = new Map<string, InternalChallengeEntry>();
  private readonly enableAutoApproval: boolean;
  private readonly calibrated: boolean;
  private readonly intentEvaluator?: ConsentIntentEvaluator;
  private readonly defaultTtlMs: number;
  private readonly maxCapacity: number;
  private readonly now: () => number;
  private readonly createId: () => string;
  private lastUserTurnSequence?: number;

  constructor(options: BrowserConsentAuthorityOptions = {}) {
    this.enableAutoApproval = options.enableAutoApproval === true;
    this.calibrated = options.calibrated === true;
    this.intentEvaluator = options.intentEvaluator;
    this.defaultTtlMs =
      typeof options.defaultTtlMs === "number" &&
      Number.isFinite(options.defaultTtlMs) &&
      options.defaultTtlMs > 0
        ? options.defaultTtlMs
        : DEFAULT_CHALLENGE_TTL_MS;
    this.maxCapacity =
      typeof options.maxCapacity === "number" &&
      Number.isFinite(options.maxCapacity) &&
      options.maxCapacity > 0
        ? Math.floor(options.maxCapacity)
        : DEFAULT_MAX_CHALLENGES;
    this.now = options.now ?? (() => Date.now());
    this.createId =
      options.createId ??
      (() =>
        `challenge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  }

  private getSafeNow(): number {
    try {
      const t = this.now();
      if (typeof t !== "number" || !Number.isFinite(t)) {
        return NaN;
      }
      return t;
    } catch {
      return NaN;
    }
  }

  /**
   * Synchronously creates a new pending challenge with strict binding validation.
   */
  createChallenge(input: {
    binding: BrowserConsentBindingInput;
    summary: string;
    ttlMs?: number;
  }): BrowserConsentCreateResult {
    this.timeout();

    if (this.challenges.size >= this.maxCapacity) {
      this.cleanupExpired();
      if (this.challenges.size >= this.maxCapacity) {
        return { ok: false, reason: "capacity_exceeded", error: "Challenge storage full" };
      }
    }

    let binding: BrowserConsentBinding;
    try {
      binding = validateAndCloneBinding(input.binding);
    } catch (err) {
      return {
        ok: false,
        reason: "invalid_binding",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    if (typeof input.summary !== "string" || input.summary.trim().length === 0) {
      return {
        ok: false,
        reason: "missing_binding_field",
        error: "Summary must be a non-empty string",
      };
    }

    if (input.ttlMs !== undefined) {
      if (typeof input.ttlMs !== "number" || !Number.isFinite(input.ttlMs) || input.ttlMs <= 0) {
        return {
          ok: false,
          reason: "invalid_binding",
          error: "TTL must be a positive finite number",
        };
      }
    }

    const ttl =
      typeof input.ttlMs === "number" && Number.isFinite(input.ttlMs) && input.ttlMs > 0
        ? input.ttlMs
        : this.defaultTtlMs;

    const createdAt = this.getSafeNow();
    if (!Number.isFinite(createdAt)) {
      return { ok: false, reason: "invalid_clock", error: "Clock returned non-finite timestamp" };
    }
    const expiresAt = createdAt + ttl;
    if (!Number.isFinite(expiresAt)) {
      return { ok: false, reason: "invalid_clock", error: "Expiration timestamp overflowed" };
    }
    const challengeId = this.createId();

    if (typeof challengeId !== "string" || !challengeId.trim() || this.challenges.has(challengeId)) {
      return { ok: false, reason: "unknown_challenge", error: "Failed to generate unique challengeId" };
    }

    const entry: InternalChallengeEntry = {
      challengeId,
      binding,
      summary: input.summary.trim(),
      createdAt,
      expiresAt,
      state: "pending",
      evaluationCount: 0,
    };

    this.challenges.set(challengeId, entry);
    return { ok: true, challenge: createPublicSnapshot(entry) };
  }

  /**
   * Alias for createChallenge to align with request-based bridges.
   */
  requestChallenge(input: {
    binding: BrowserConsentBindingInput;
    summary: string;
    ttlMs?: number;
  }): BrowserConsentCreateResult {
    return this.createChallenge(input);
  }

  /**
   * Ingests a trusted user turn strictly provided by the host.
   * Model arguments are NOT accepted.
   * Evaluates pending challenges against the user turn via injected intentEvaluator.
   *
   * Asynchronous Pre/Post Verification Contract:
   * - Invariant baseline recorded before awaiting evaluator.
   * - Post-await checks ensure:
   *   1. Challenge still exists and is not deleted.
   *   2. Challenge state is still pending (no concurrent modification).
   *   3. Binding is strictly unchanged.
   *   4. Evaluation token is identical (no preemptive evaluation started).
   *   5. User turn sequence matches startTurnSequence (rejects late results if user sent new turn).
   *   6. Expiration deadline not exceeded.
   */
  async recordTrustedUserTurn(
    rawTurn: TrustedUserTurn,
    options?: RecordUserTurnOptions
  ): Promise<RecordUserTurnResult> {
    let turn: TrustedUserTurn;
    try {
      turn = validateTrustedUserTurn(rawTurn);
    } catch (err) {
      return {
        ok: false,
        reason: "invalid_user_turn",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    if (this.lastUserTurnSequence !== undefined && turn.sequence <= this.lastUserTurnSequence) {
      return {
        ok: false,
        reason: "out_of_order_sequence",
        error: `Sequence ${turn.sequence} must be strictly greater than last sequence ${this.lastUserTurnSequence}`,
      };
    }

    this.lastUserTurnSequence = turn.sequence;

    // CRITICAL SAFETY INVARIANT:
    // Any newly arriving trusted user turn IMMEDIATELY revokes all unconsumed approved challenges.
    // If user previously approved an action and now speaks again (whether "wait", "change",
    // unclear, or even when no evaluator is configured), the previous grant is revoked
    // synchronously BEFORE entering any new determination. We NEVER carry over stale grants!
    for (const entry of this.challenges.values()) {
      if (entry.state === "approved") {
        entry.state = "revoked";
        entry.failureReason = "superseded_by_new_user_turn";
      }
    }

    this.timeout();

    const pendingEntries: InternalChallengeEntry[] = [];
    for (const entry of this.challenges.values()) {
      if (entry.state === "pending") {
        pendingEntries.push(entry);
      }
    }

    if (!this.intentEvaluator || pendingEntries.length === 0) {
      return {
        ok: true,
        sequence: turn.sequence,
        evaluatedChallenges: pendingEntries.map((c) => ({
          challengeId: c.challengeId,
          decision: "unclear",
          state: c.state,
          reason: "no_evaluator_or_no_action",
        })),
      };
    }

    const startTurnSequence = turn.sequence;
    const evaluatedResults: {
      challengeId: string;
      decision: BrowserConsentDecisionKind;
      state: BrowserConsentState;
      reason?: string;
    }[] = [];

    for (const entry of pendingEntries) {
      const challengeId = entry.challengeId;
      const bindingBefore = entry.binding;
      const expiresAtBefore = entry.expiresAt;

      entry.evaluationCount += 1;
      const currentEvalCount = entry.evaluationCount;

      try {
        const evalResult = await this.intentEvaluator(
          {
            challengeId,
            binding: bindingBefore,
            summary: entry.summary,
            userTurn: turn,
          },
          options?.signal
        );

        // POST-EVALUATION INVARIANT VERIFICATION
        const current = this.challenges.get(challengeId);
        if (!current) {
          evaluatedResults.push({
            challengeId,
            decision: evalResult?.decision ?? "unclear",
            state: "revoked",
            reason: "challenge_removed_during_evaluation",
          });
          continue;
        }

        // Recheck sequence: if another user turn arrived during evaluation, reject late result
        if (this.lastUserTurnSequence !== startTurnSequence) {
          evaluatedResults.push({
            challengeId,
            decision: evalResult?.decision ?? "unclear",
            state: current.state,
            reason: "concurrent_turn_conflict",
          });
          continue;
        }

        // Recheck concurrent evaluation counter
        if (current.evaluationCount !== currentEvalCount) {
          evaluatedResults.push({
            challengeId,
            decision: evalResult?.decision ?? "unclear",
            state: current.state,
            reason: "stale_evaluation",
          });
          continue;
        }

        // Recheck TTL expiration
        const currentTime = this.getSafeNow();
        if (!Number.isFinite(currentTime) || currentTime >= expiresAtBefore || currentTime >= current.expiresAt) {
          current.state = "expired";
          current.failureReason = !Number.isFinite(currentTime) ? "invalid_clock" : "expired_during_evaluation";
          evaluatedResults.push({
            challengeId,
            decision: evalResult?.decision ?? "unclear",
            state: "expired",
            reason: current.failureReason,
          });
          continue;
        }

        // Recheck binding identity
        if (!bindingsMatch(current.binding, bindingBefore)) {
          current.state = "revoked";
          current.failureReason = "binding_mismatch";
          evaluatedResults.push({
            challengeId,
            decision: evalResult?.decision ?? "unclear",
            state: "revoked",
            reason: "binding_mismatch",
          });
          continue;
        }

        // Recheck state: must still be pending
        if (current.state !== "pending") {
          evaluatedResults.push({
            challengeId,
            decision: evalResult?.decision ?? "unclear",
            state: current.state,
            reason: "state_changed_during_evaluation",
          });
          continue;
        }

        // State machine transition
        const decision = evalResult?.decision;
        if (decision === "deny") {
          current.state = "denied";
          current.decidedAt = currentTime;
          current.userTurnSequence = startTurnSequence;
          current.failureReason = evalResult.reasons?.[0] || "user_denied";
          evaluatedResults.push({
            challengeId,
            decision: "deny",
            state: "denied",
            reason: current.failureReason,
          });
        } else if (decision === "modify") {
          // modify revokes the challenge because requirements changed
          current.state = "revoked";
          current.decidedAt = currentTime;
          current.userTurnSequence = startTurnSequence;
          current.failureReason = evalResult.reasons?.[0] || "user_modified";
          evaluatedResults.push({
            challengeId,
            decision: "modify",
            state: "revoked",
            reason: current.failureReason,
          });
        } else if (decision === "unclear") {
          // unclear maintains pending status, no grant
          evaluatedResults.push({
            challengeId,
            decision: "unclear",
            state: "pending",
            reason: evalResult.reasons?.[0] || "unclear_intent",
          });
        } else if (decision === "approve") {
          // MULTI-PENDING SCOPE CHECK:
          // When multiple pending challenges exist, a generalized agreement cannot bulk-approve all of them.
          // Host must explicitly provide challenge scope via options (not from model arguments).
          const isScoped = (() => {
            if (options?.targetChallengeId !== undefined) {
              return options.targetChallengeId === challengeId;
            }
            if (options?.challengeScope !== undefined && options.challengeScope.length > 0) {
              return options.challengeScope.includes(challengeId);
            }
            return pendingEntries.length === 1;
          })();

          if (!isScoped) {
            current.failureReason = "ambiguous_multiple_pending_scope";
            evaluatedResults.push({
              challengeId,
              decision: "unclear",
              state: "pending",
              reason: "ambiguous_multiple_pending_scope",
            });
            continue;
          }

          // Check safety requirements for approval
          if (!this.enableAutoApproval) {
            current.failureReason = "auto_approval_disabled";
            evaluatedResults.push({
              challengeId,
              decision: "approve",
              state: "pending",
              reason: "auto_approval_disabled",
            });
          } else if (this.calibrated !== true && evalResult.calibrated !== true) {
            // Uncalibrated evaluator (such as default Jev) cannot auto-grant production approval
            current.failureReason = "uncalibrated_evaluator";
            evaluatedResults.push({
              challengeId,
              decision: "approve",
              state: "pending",
              reason: "uncalibrated_evaluator",
            });
          } else if (evalResult.allowCandidate === false) {
            current.failureReason = "candidate_rejected";
            evaluatedResults.push({
              challengeId,
              decision: "approve",
              state: "pending",
              reason: "candidate_rejected",
            });
          } else {
            // Approved!
            current.state = "approved";
            current.decidedAt = currentTime;
            current.userTurnSequence = startTurnSequence;
            current.failureReason = undefined;
            evaluatedResults.push({
              challengeId,
              decision: "approve",
              state: "approved",
            });
          }
        } else {
          // Unknown verdict fails closed
          evaluatedResults.push({
            challengeId,
            decision: "unclear",
            state: "pending",
            reason: "unknown_decision_verdict",
          });
        }
      } catch (err) {
        evaluatedResults.push({
          challengeId,
          decision: "unclear",
          state: entry.state,
          reason: err instanceof Error ? err.message : "evaluator_error",
        });
      }
    }

    return {
      ok: true,
      sequence: turn.sequence,
      evaluatedChallenges: evaluatedResults,
    };
  }

  /**
   * Synchronously consumes an approved challenge with strictly matching binding.
   * One-time use only. External callers cannot grant(true) or forge tickets.
   */
  consume(
    challengeIdOrBinding: string | (BrowserConsentBindingInput & { challengeId?: string }),
    maybeBinding?: BrowserConsentBindingInput
  ): BrowserConsentConsumeResult {
    this.timeout();

    let targetChallengeId: string | undefined;
    let rawBinding: unknown;

    if (typeof challengeIdOrBinding === "string") {
      targetChallengeId = challengeIdOrBinding;
      rawBinding = maybeBinding;
    } else if (typeof challengeIdOrBinding === "object" && challengeIdOrBinding !== null) {
      targetChallengeId = challengeIdOrBinding.challengeId;
      rawBinding = challengeIdOrBinding;
    } else {
      return { ok: false, reason: "invalid_binding", error: "Invalid consume arguments" };
    }

    let inputBinding: BrowserConsentBinding;
    try {
      inputBinding = validateAndCloneBinding(rawBinding);
    } catch (err) {
      return {
        ok: false,
        reason: "invalid_binding",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    let targetEntry: InternalChallengeEntry | undefined;

    if (targetChallengeId) {
      targetEntry = this.challenges.get(targetChallengeId);
      if (!targetEntry) {
        return { ok: false, reason: "unknown_challenge", error: "Challenge ID not found" };
      }
    } else {
      // Find matching approved challenge
      for (const entry of this.challenges.values()) {
        if (entry.state === "approved" && bindingsMatch(entry.binding, inputBinding)) {
          targetEntry = entry;
          break;
        }
      }
      if (!targetEntry) {
        return { ok: false, reason: "unknown_challenge", error: "No matching approved challenge found" };
      }
    }

    // Strict binding equality check
    if (!bindingsMatch(targetEntry.binding, inputBinding)) {
      return { ok: false, reason: "binding_mismatch", error: "Action binding mismatch" };
    }

    // TTL check
    const currentTime = this.getSafeNow();
    if (!Number.isFinite(currentTime)) {
      targetEntry.state = "expired";
      targetEntry.failureReason = "invalid_clock";
      return { ok: false, reason: "expired", error: "Clock returned non-finite timestamp; failing closed" };
    }
    if (currentTime >= targetEntry.expiresAt) {
      targetEntry.state = "expired";
      return { ok: false, reason: "expired", error: "Challenge has expired" };
    }

    // State check
    if (targetEntry.state === "consumed") {
      return { ok: false, reason: "already_consumed", error: "Challenge already consumed" };
    }
    if (targetEntry.state === "pending") {
      return { ok: false, reason: "pending", error: "Challenge is still pending approval" };
    }
    if (targetEntry.state === "denied") {
      return { ok: false, reason: "denied", error: "Challenge was denied" };
    }
    if (targetEntry.state === "revoked") {
      return { ok: false, reason: "revoked", error: "Challenge was revoked or modified" };
    }
    if (targetEntry.state === "expired") {
      return { ok: false, reason: "expired", error: "Challenge has expired" };
    }
    if (targetEntry.state !== "approved") {
      return { ok: false, reason: "not_approved", error: `Challenge state is ${targetEntry.state}` };
    }

    // Synchronously consume
    targetEntry.state = "consumed";
    targetEntry.consumedAt = currentTime;

    return {
      ok: true,
      challengeId: targetEntry.challengeId,
      binding: targetEntry.binding,
      consumedAt: targetEntry.consumedAt,
    };
  }

  /**
   * Aborts an active challenge synchronously.
   */
  abort(challengeId: string, reason = "aborted"): boolean {
    const entry = this.challenges.get(challengeId);
    if (!entry) return false;
    if (entry.state === "pending" || entry.state === "approved") {
      entry.state = "revoked";
      entry.failureReason = reason;
      return true;
    }
    return false;
  }

  /**
   * Revokes all active pending or approved challenges synchronously.
   */
  revokeAll(reason = "run_revoked"): number {
    let count = 0;
    for (const entry of this.challenges.values()) {
      if (entry.state === "pending" || entry.state === "approved") {
        entry.state = "revoked";
        entry.failureReason = reason;
        count += 1;
      }
    }
    return count;
  }

  /**
   * Scans and marks expired challenges lazily.
   */
  timeout(): number {
    const currentTime = this.getSafeNow();
    let count = 0;
    for (const entry of this.challenges.values()) {
      if (
        (entry.state === "pending" || entry.state === "approved") &&
        (!Number.isFinite(currentTime) || currentTime >= entry.expiresAt)
      ) {
        entry.state = "expired";
        entry.failureReason = !Number.isFinite(currentTime) ? "invalid_clock" : "expired";
        count += 1;
      }
    }
    return count;
  }

  /**
   * Removes terminal expired entries to free capacity.
   */
  cleanupExpired(): number {
    let removed = 0;
    for (const [id, entry] of this.challenges.entries()) {
      if (entry.state === "expired") {
        this.challenges.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  /**
   * Retrieves an immutable public snapshot of a challenge without grant ticket.
   */
  getSnapshot(challengeId: string): BrowserConsentSnapshot | undefined {
    this.timeout();
    const entry = this.challenges.get(challengeId);
    return entry ? createPublicSnapshot(entry) : undefined;
  }

  /**
   * Lists immutable public snapshots of all tracked challenges.
   */
  listSnapshots(): readonly BrowserConsentSnapshot[] {
    this.timeout();
    return Array.from(this.challenges.values()).map(createPublicSnapshot);
  }

  /**
   * Returns current count of stored challenges.
   */
  get size(): number {
    return this.challenges.size;
  }

  /**
   * Returns the last recorded trusted user turn sequence.
   */
  get lastSequence(): number | undefined {
    return this.lastUserTurnSequence;
  }
}

/**
 * Factory helper for creating BrowserConsentAuthority.
 */
export function createBrowserConsentAuthority(
  options?: BrowserConsentAuthorityOptions
): BrowserConsentAuthority {
  return new BrowserConsentAuthority(options);
}
