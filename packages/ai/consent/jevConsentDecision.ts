/**
 * Jev Consent Intent Decision Adapter
 *
 * Host-neutral adapter mapping explicit user consent messages and challenge
 * descriptors into TypeSafe Jev System One questions and structured verdict evidence.
 *
 * SAFETY CONTRACT:
 * - High model confidence is evidence, not authority.
 * - This adapter NEVER signs grants or executes actions.
 * - Production use is disabled by default; confidence is marked uncalibrated.
 * - allowCandidate is true ONLY when the response is complete, valid, and positive
 *   approval is consistent across all negative and boundary dimensions.
 * - Any anomaly, missing key, bounds violation, timeout, or contradiction fails closed.
 */

export const DEFAULT_JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
export const DEFAULT_JEV_MODEL = "jev-latest";

export const DEFAULT_MAX_USER_MESSAGE_CHARS = 4_000;
export const DEFAULT_MAX_SUMMARY_CHARS = 1_000;
export const DEFAULT_MAX_REFERENT_CONTEXT_CHARS = 4_000;

export type ConsentDecisionKind = "approve" | "deny" | "modify" | "unclear";

export const REQUIRED_INTENT_KEYS: readonly ConsentDecisionKind[] = [
  "approve",
  "deny",
  "modify",
  "unclear",
] as const;

export type ConsentChallenge = {
  id: string;
  summary: string;
  action?: string;
  resource?: string;
  details?: Record<string, unknown>;
};

export type ConsentDecisionInput = {
  challenge: ConsentChallenge;
  userMessage: string;
  referentContext?: Record<string, unknown>;
};

export type JevConsentThresholds = {
  /** Minimum direct approval confidence required to consider approve candidate (default: 0.90) */
  minApproveConfidence?: number;
  /** Maximum allowable denial confidence (default: 0.10) */
  maxDenyConfidence?: number;
  /** Maximum allowable conditional modification confidence (default: 0.10) */
  maxModifyConfidence?: number;
  /** Maximum allowable hypothetical/referential confidence (default: 0.10) */
  maxHypotheticalConfidence?: number;
  /** Maximum allowable object mismatch confidence (default: 0.10) */
  maxMismatchConfidence?: number;
};

export const DEFAULT_THRESHOLDS: Required<JevConsentThresholds> = {
  minApproveConfidence: 0.9,
  maxDenyConfidence: 0.1,
  maxModifyConfidence: 0.1,
  maxHypotheticalConfidence: 0.1,
  maxMismatchConfidence: 0.1,
};

export type JevConsentDecisionOptions = {
  apiKey: string;
  endpoint?: string;
  model?: string;
  fetchFn?: typeof fetch;
  requestTimeoutMs?: number;
  signal?: AbortSignal;
  thresholds?: JevConsentThresholds;
  maxUserMessageChars?: number;
  maxSummaryChars?: number;
  maxReferentContextChars?: number;
  failClosedMode?: "verdict" | "throw";
};

export type JevConsentProbabilities = {
  directApproval: number;
  directDenial: number;
  conditionalModification: number;
  hypotheticalOrReferential: number;
  objectMismatch: number;
  intentProbabilities: Record<ConsentDecisionKind, number>;
  intentConfidence: number;
};

export type ConsentDecisionResult = {
  decision: ConsentDecisionKind;
  /**
   * Only true when the response is complete, valid, and positive approval matches
   * all negative checks with conservative thresholds.
   */
  allowCandidate: boolean;
  /** Adapter output is strictly evidence; it cannot authorize execution. */
  evidenceOnly: true;
  /** Model judgments are not assumed to be calibrated for production grant issuance. */
  calibrated: false;
  probabilities: JevConsentProbabilities;
  reasons: string[];
  failClosed?: boolean;
  failClosedReason?: string;
  model: string;
};

export type JevConsentErrorCode =
  | "MISSING_API_KEY"
  | "INPUT_BOUNDS_EXCEEDED"
  | "INVALID_INPUT"
  | "TIMEOUT"
  | "ABORTED"
  | "HTTP_ERROR"
  | "MALFORMED_RESPONSE"
  | "CONTRADICTORY_DISTRIBUTION";

export class JevConsentError extends Error {
  readonly code: JevConsentErrorCode;

  constructor(code: JevConsentErrorCode, message: string) {
    super(message);
    this.name = "JevConsentError";
    this.code = code;
  }
}

const clamp01 = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function buildJevConsentRequest(
  input: ConsentDecisionInput,
  model = DEFAULT_JEV_MODEL,
) {
  return {
    model,
    state: JSON.stringify({
      userMessage: input.userMessage,
      challenge: {
        id: input.challenge.id,
        summary: input.challenge.summary,
        ...(input.challenge.action ? { action: input.challenge.action } : {}),
        ...(input.challenge.resource ? { resource: input.challenge.resource } : {}),
      },
      ...(input.referentContext ? { referentContext: input.referentContext } : {}),
    }),
    questions: {
      primary_intent: {
        type: "choice",
        instructions:
          "Classify the user's explicit intent regarding the pending challenge into one of the four categories.",
        criteria: {
          approve:
            "The user explicitly and unconditionally authorizes or confirms the pending challenge.",
          deny:
            "The user explicitly rejects, denies, cancels, or refuses the pending challenge.",
          modify:
            "The user requests changes, conditions, limitations, or alternative actions before proceeding.",
          unclear:
            "The user message is ambiguous, hypothetical, asking questions, referencing past/future events, addressing a different object, or cannot be confidently classified.",
        },
      },
      direct_approval: {
        type: "noul",
        instructions:
          "The user directly, unambiguously, and unconditionally approves or confirms the pending challenge right now.",
      },
      direct_denial: {
        type: "noul",
        instructions:
          "The user directly and explicitly rejects, cancels, or refuses the pending challenge.",
      },
      conditional_modification: {
        type: "noul",
        instructions:
          "The user proposes a condition, parameter change, scope limitation, or alternative before the challenge should proceed.",
      },
      hypothetical_or_referential: {
        type: "noul",
        instructions:
          "The user is speaking hypothetically, inquiring about consequences, or referring to past/future actions without giving authorization now.",
      },
      object_mismatch: {
        type: "noul",
        instructions:
          "The user's response refers to a different operation, different entity, or unrelated topic rather than the pending challenge.",
      },
    },
  } as const;
}

function combineSignals(signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => !!s);
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(active);
  }
  const controller = new AbortController();
  for (const sig of active) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener("abort", () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}

export class JevConsentDecisionModel {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;
  private readonly requestTimeoutMs: number;
  private readonly signal?: AbortSignal;
  private readonly thresholds: Required<JevConsentThresholds>;
  private readonly maxUserMessageChars: number;
  private readonly maxSummaryChars: number;
  private readonly maxReferentContextChars: number;
  private readonly failClosedMode: "verdict" | "throw";

  constructor(options: JevConsentDecisionOptions) {
    this.apiKey = options.apiKey;
    this.endpoint = options.endpoint ?? DEFAULT_JEV_ENDPOINT;
    this.model = options.model ?? DEFAULT_JEV_MODEL;
    this.fetchFn = options.fetchFn ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 8_000;
    this.signal = options.signal;
    this.thresholds = this.validateAndNormalizeThresholds(options.thresholds);
    this.maxUserMessageChars = options.maxUserMessageChars ?? DEFAULT_MAX_USER_MESSAGE_CHARS;
    this.maxSummaryChars = options.maxSummaryChars ?? DEFAULT_MAX_SUMMARY_CHARS;
    this.maxReferentContextChars = options.maxReferentContextChars ?? DEFAULT_MAX_REFERENT_CONTEXT_CHARS;
    this.failClosedMode = options.failClosedMode ?? "verdict";
  }

  private validateAndNormalizeThresholds(
    thresholds?: JevConsentThresholds,
  ): Required<JevConsentThresholds> {
    if (!thresholds) return { ...DEFAULT_THRESHOLDS };

    const validateOne = (name: keyof JevConsentThresholds, fallback: number): number => {
      const val = thresholds[name];
      if (val === undefined) return fallback;
      if (typeof val !== "number" || Number.isNaN(val) || !Number.isFinite(val) || val < 0 || val > 1) {
        throw new JevConsentError(
          "INVALID_INPUT",
          `Threshold "${name}" must be a finite number between 0 and 1.`,
        );
      }
      return val;
    };

    return {
      minApproveConfidence: validateOne("minApproveConfidence", DEFAULT_THRESHOLDS.minApproveConfidence),
      maxDenyConfidence: validateOne("maxDenyConfidence", DEFAULT_THRESHOLDS.maxDenyConfidence),
      maxModifyConfidence: validateOne("maxModifyConfidence", DEFAULT_THRESHOLDS.maxModifyConfidence),
      maxHypotheticalConfidence: validateOne(
        "maxHypotheticalConfidence",
        DEFAULT_THRESHOLDS.maxHypotheticalConfidence,
      ),
      maxMismatchConfidence: validateOne("maxMismatchConfidence", DEFAULT_THRESHOLDS.maxMismatchConfidence),
    };
  }

  private validateInput(input: ConsentDecisionInput): void {
    if (!input || !isPlainObject(input)) {
      throw new JevConsentError("INVALID_INPUT", "Input must be an object.");
    }
    if (typeof input.userMessage !== "string" || input.userMessage.trim().length === 0) {
      throw new JevConsentError("INVALID_INPUT", "userMessage must be a non-empty string.");
    }
    if (input.userMessage.length > this.maxUserMessageChars) {
      throw new JevConsentError(
        "INPUT_BOUNDS_EXCEEDED",
        `userMessage length (${input.userMessage.length}) exceeds bound of ${this.maxUserMessageChars} chars. Silent truncation prohibited.`,
      );
    }
    if (!input.challenge || !isPlainObject(input.challenge)) {
      throw new JevConsentError("INVALID_INPUT", "challenge must be provided as an object.");
    }
    if (typeof input.challenge.id !== "string" || input.challenge.id.trim().length === 0) {
      throw new JevConsentError("INVALID_INPUT", "challenge.id must be a non-empty string.");
    }
    if (typeof input.challenge.summary !== "string" || input.challenge.summary.trim().length === 0) {
      throw new JevConsentError("INVALID_INPUT", "challenge.summary must be a non-empty string.");
    }
    if (input.challenge.summary.length > this.maxSummaryChars) {
      throw new JevConsentError(
        "INPUT_BOUNDS_EXCEEDED",
        `challenge.summary length (${input.challenge.summary.length}) exceeds bound of ${this.maxSummaryChars} chars. Silent truncation prohibited.`,
      );
    }
    if (input.referentContext !== undefined) {
      if (!isPlainObject(input.referentContext)) {
        throw new JevConsentError("INVALID_INPUT", "referentContext must be an object.");
      }
      const contextString = JSON.stringify(input.referentContext);
      if (contextString.length > this.maxReferentContextChars) {
        throw new JevConsentError(
          "INPUT_BOUNDS_EXCEEDED",
          `referentContext serialized size (${contextString.length}) exceeds bound of ${this.maxReferentContextChars} chars. Silent truncation prohibited.`,
        );
      }
    }
  }

  async decide(
    input: ConsentDecisionInput,
    callOptions?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<ConsentDecisionResult> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      throw new JevConsentError("MISSING_API_KEY", "TypeSafe API key is required for Jev consent decision.");
    }

    this.validateInput(input);

    const timeoutMs = callOptions?.timeoutMs ?? this.requestTimeoutMs;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const effectiveSignal = combineSignals([this.signal, callOptions?.signal, timeoutSignal]);

    let response: Response;
    try {
      response = await this.fetchFn(this.endpoint, {
        method: "POST",
        signal: effectiveSignal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildJevConsentRequest(input, this.model)),
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "TimeoutError" || effectiveSignal?.aborted && effectiveSignal.reason?.name === "TimeoutError") {
          throw new JevConsentError("TIMEOUT", "Jev consent request timed out.");
        }
        if (err.name === "AbortError" || effectiveSignal?.aborted) {
          throw new JevConsentError("ABORTED", "Jev consent request was aborted.");
        }
      }
      throw err;
    }

    if (!response.ok) {
      // Discard response body without echoing response body or API key
      await response.text().catch(() => "");
      throw new JevConsentError(
        "HTTP_ERROR",
        `Jev consent decision request failed with HTTP ${response.status}.`,
      );
    }

    let rawPayload: unknown;
    try {
      rawPayload = await response.json();
    } catch {
      throw new JevConsentError("MALFORMED_RESPONSE", "Jev endpoint returned invalid JSON.");
    }

    return this.parseAndEvaluate(rawPayload);
  }

  private parseAndEvaluate(rawPayload: unknown): ConsentDecisionResult {
    const defaultFailClosed = (code: JevConsentErrorCode, message: string): ConsentDecisionResult => {
      if (this.failClosedMode === "throw") {
        throw new JevConsentError(code, message);
      }
      return {
        decision: "unclear",
        allowCandidate: false,
        evidenceOnly: true,
        calibrated: false,
        probabilities: {
          directApproval: 0,
          directDenial: 0,
          conditionalModification: 0,
          hypotheticalOrReferential: 0,
          objectMismatch: 0,
          intentProbabilities: {
            approve: 0,
            deny: 0,
            modify: 0,
            unclear: 0,
          },
          intentConfidence: 0,
        },
        reasons: [message],
        failClosed: true,
        failClosedReason: message,
        model: isPlainObject(rawPayload) && typeof rawPayload.model === "string" ? rawPayload.model : this.model,
      };
    };

    // Explicit check for null, array, primitive, non-object root
    if (!isPlainObject(rawPayload)) {
      return defaultFailClosed("MALFORMED_RESPONSE", "Jev response root must be a non-null JSON object.");
    }

    // Explicit check for non-object answers
    if (!isPlainObject(rawPayload.answers)) {
      return defaultFailClosed("MALFORMED_RESPONSE", "Missing or invalid answers object in Jev response.");
    }

    const answers = rawPayload.answers as Record<string, unknown>;

    // 1. Validate primary_intent choice
    const primaryAnswer = answers.primary_intent;
    if (!isPlainObject(primaryAnswer) || primaryAnswer.type !== "choice") {
      return defaultFailClosed("MALFORMED_RESPONSE", "Missing or invalid primary_intent choice answer.");
    }

    const intentChoice = primaryAnswer.choice;
    if (typeof intentChoice !== "string" || !REQUIRED_INTENT_KEYS.includes(intentChoice as ConsentDecisionKind)) {
      return defaultFailClosed("MALFORMED_RESPONSE", `Unknown or missing choice label "${String(intentChoice)}" in primary_intent.`);
    }

    // Validate confidence on primary_intent (must be a valid number 0..1)
    const confidence = primaryAnswer.confidence;
    if (typeof confidence !== "number" || Number.isNaN(confidence) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      return defaultFailClosed("MALFORMED_RESPONSE", "Missing or invalid confidence in primary_intent.");
    }

    // Validate all 4 probabilities on primary_intent
    if (!isPlainObject(primaryAnswer.probabilities)) {
      return defaultFailClosed("MALFORMED_RESPONSE", "Missing probabilities object in primary_intent.");
    }

    const rawProbabilities = primaryAnswer.probabilities as Record<string, unknown>;
    const intentProbabilities: Record<ConsentDecisionKind, number> = {
      approve: 0,
      deny: 0,
      modify: 0,
      unclear: 0,
    };

    for (const key of REQUIRED_INTENT_KEYS) {
      const val = rawProbabilities[key];
      if (typeof val !== "number" || Number.isNaN(val) || !Number.isFinite(val) || val < 0 || val > 1) {
        return defaultFailClosed("MALFORMED_RESPONSE", `Missing or invalid probability for primary_intent key "${key}".`);
      }
      intentProbabilities[key] = clamp01(val);
    }

    // 2. Validate atomic noul answers
    const atomicKeys = [
      "direct_approval",
      "direct_denial",
      "conditional_modification",
      "hypothetical_or_referential",
      "object_mismatch",
    ] as const;

    const noulValues: Record<typeof atomicKeys[number], number> = {} as any;

    for (const key of atomicKeys) {
      const ans = answers[key];
      if (!isPlainObject(ans) || ans.type !== "noul") {
        return defaultFailClosed("MALFORMED_RESPONSE", `Missing or non-noul answer for question "${key}".`);
      }
      const val = ans.noul;
      if (typeof val !== "number" || Number.isNaN(val) || !Number.isFinite(val)) {
        return defaultFailClosed("MALFORMED_RESPONSE", `Invalid or NaN noul probability for question "${key}".`);
      }
      if (val < 0 || val > 1) {
        return defaultFailClosed("MALFORMED_RESPONSE", `Out-of-range noul probability (${val}) for question "${key}".`);
      }
      noulValues[key] = clamp01(val);
    }

    const probabilities: JevConsentProbabilities = {
      directApproval: noulValues.direct_approval,
      directDenial: noulValues.direct_denial,
      conditionalModification: noulValues.conditional_modification,
      hypotheticalOrReferential: noulValues.hypothetical_or_referential,
      objectMismatch: noulValues.object_mismatch,
      intentProbabilities,
      intentConfidence: clamp01(confidence),
    };

    // 3. Contradictory distribution detection
    const isContradictory =
      // Direct approve vs direct deny conflict
      (probabilities.directApproval >= 0.5 && probabilities.directDenial >= 0.3) ||
      (probabilities.directApproval >= 0.5 && probabilities.objectMismatch >= 0.5) ||
      // Choice vs choice probabilities contradiction
      (intentChoice === "approve" && (
        intentProbabilities.approve < intentProbabilities.deny ||
        intentProbabilities.approve < intentProbabilities.modify ||
        intentProbabilities.approve < intentProbabilities.unclear ||
        intentProbabilities.approve < 0.5
      )) ||
      (intentChoice === "deny" && (
        intentProbabilities.deny < intentProbabilities.approve ||
        intentProbabilities.deny < intentProbabilities.modify ||
        intentProbabilities.deny < intentProbabilities.unclear ||
        intentProbabilities.deny < 0.5
      )) ||
      // Choice vs atomic noul contradiction
      (intentChoice === "approve" && probabilities.directApproval < 0.4) ||
      (intentChoice === "deny" && probabilities.directDenial < 0.4);

    if (isContradictory) {
      return defaultFailClosed(
        "CONTRADICTORY_DISTRIBUTION",
        "Contradictory probability distribution detected across atomic questions and primary intent.",
      );
    }

    // 4. Safety checks for allowCandidate
    const reasons: string[] = [];

    const isApproveIntent = intentChoice === "approve";
    const choiceConfidencePassed = probabilities.intentConfidence >= this.thresholds.minApproveConfidence;
    const choiceApproveProbPassed = probabilities.intentProbabilities.approve >= this.thresholds.minApproveConfidence;
    const choiceDenyProbPassed = probabilities.intentProbabilities.deny <= this.thresholds.maxDenyConfidence;
    const choiceModifyProbPassed = probabilities.intentProbabilities.modify <= this.thresholds.maxModifyConfidence;
    const choiceUnclearProbPassed = probabilities.intentProbabilities.unclear <= this.thresholds.maxMismatchConfidence;

    const directApprovalPassed = probabilities.directApproval >= this.thresholds.minApproveConfidence;
    const directDenialPassed = probabilities.directDenial <= this.thresholds.maxDenyConfidence;
    const modificationPassed = probabilities.conditionalModification <= this.thresholds.maxModifyConfidence;
    const hypotheticalPassed = probabilities.hypotheticalOrReferential <= this.thresholds.maxHypotheticalConfidence;
    const mismatchPassed = probabilities.objectMismatch <= this.thresholds.maxMismatchConfidence;

    if (!isApproveIntent) {
      reasons.push(`Primary intent is "${intentChoice}" instead of "approve".`);
    }
    if (!choiceConfidencePassed) {
      reasons.push(
        `Primary intent confidence (${probabilities.intentConfidence.toFixed(3)}) below threshold (${this.thresholds.minApproveConfidence}).`,
      );
    }
    if (!choiceApproveProbPassed) {
      reasons.push(
        `Primary intent approve probability (${probabilities.intentProbabilities.approve.toFixed(3)}) below threshold (${this.thresholds.minApproveConfidence}).`,
      );
    }
    if (!choiceDenyProbPassed) {
      reasons.push(
        `Primary intent deny probability (${probabilities.intentProbabilities.deny.toFixed(3)}) exceeds threshold (${this.thresholds.maxDenyConfidence}).`,
      );
    }
    if (!choiceModifyProbPassed) {
      reasons.push(
        `Primary intent modify probability (${probabilities.intentProbabilities.modify.toFixed(3)}) exceeds threshold (${this.thresholds.maxModifyConfidence}).`,
      );
    }
    if (!directApprovalPassed) {
      reasons.push(
        `Direct approval confidence (${probabilities.directApproval.toFixed(3)}) below threshold (${this.thresholds.minApproveConfidence}).`,
      );
    }
    if (!directDenialPassed) {
      reasons.push(
        `Direct denial confidence (${probabilities.directDenial.toFixed(3)}) exceeds threshold (${this.thresholds.maxDenyConfidence}).`,
      );
    }
    if (!modificationPassed) {
      reasons.push(
        `Conditional modification confidence (${probabilities.conditionalModification.toFixed(3)}) exceeds threshold (${this.thresholds.maxModifyConfidence}).`,
      );
    }
    if (!hypotheticalPassed) {
      reasons.push(
        `Hypothetical or referential confidence (${probabilities.hypotheticalOrReferential.toFixed(3)}) exceeds threshold (${this.thresholds.maxHypotheticalConfidence}).`,
      );
    }
    if (!mismatchPassed) {
      reasons.push(
        `Object mismatch confidence (${probabilities.objectMismatch.toFixed(3)}) exceeds threshold (${this.thresholds.maxMismatchConfidence}).`,
      );
    }

    const allowCandidate =
      isApproveIntent &&
      choiceConfidencePassed &&
      choiceApproveProbPassed &&
      choiceDenyProbPassed &&
      choiceModifyProbPassed &&
      choiceUnclearProbPassed &&
      directApprovalPassed &&
      directDenialPassed &&
      modificationPassed &&
      hypotheticalPassed &&
      mismatchPassed;

    let decision: ConsentDecisionKind;
    if (allowCandidate) {
      decision = "approve";
      reasons.push("Explicit approval satisfies all positive and negative threshold consistency checks.");
    } else if (intentChoice === "deny" || probabilities.directDenial >= 0.5) {
      decision = "deny";
    } else if (intentChoice === "modify" || probabilities.conditionalModification >= 0.5) {
      decision = "modify";
    } else {
      decision = "unclear";
    }

    return {
      decision,
      allowCandidate,
      evidenceOnly: true,
      calibrated: false,
      probabilities,
      reasons,
      model: typeof rawPayload.model === "string" ? rawPayload.model : this.model,
    };
  }
}
