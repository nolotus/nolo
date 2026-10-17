import {
  BrowserConsentAuthority,
  type BrowserConsentAuthorityOptions,
  type BrowserConsentBinding,
  type BrowserConsentBindingInput,
  type BrowserConsentSnapshot,
  type ConsentIntentEvaluationInput,
  type ConsentIntentEvaluationResult,
  type ConsentIntentEvaluator,
  type TrustedUserTurn,
  validateAndCloneBinding,
} from "./browserConsentAuthority";
import type {
  ConsentDecisionInput,
  ConsentDecisionResult,
} from "../ai/consent/jevConsentDecision";

export type PrepareBrowserActionResult = {
  prepareId: string;
  summary: string;
  origin?: string;
  fingerprint?: string;
  argsDigest?: string;
  formDigest?: string;
  binding?: BrowserConsentBindingInput;
};

export type PrepareActionCallback = (
  target: unknown,
  args: unknown
) => Promise<PrepareBrowserActionResult>;

export type ReadTrustedBindingCallback = (
  prepareId: string
) => Promise<BrowserConsentBindingInput | BrowserConsentBinding>;

export type ExecuteActionCallback<T = unknown> = (
  binding: BrowserConsentBinding,
  prepareId: string
) => Promise<T>;

export type JevConsentEvaluatorFn = (
  input: ConsentDecisionInput,
  signal?: AbortSignal
) => Promise<ConsentDecisionResult>;

export type BrowserConsentSessionOptions = {
  prepareCallback: PrepareActionCallback;
  readTrustedBindingCallback: ReadTrustedBindingCallback;
  executeCallback: ExecuteActionCallback;
  jevEvaluator?: JevConsentEvaluatorFn;
  authorityOptions?: BrowserConsentAuthorityOptions;
  enableAutoApproval?: boolean;
  calibrated?: boolean;
  now?: () => number;
};

export type PrepareSessionActionResult = {
  ok: boolean;
  prepareId?: string;
  challengeId?: string;
  summary?: string;
  error?: string;
};

export type ExecuteSessionActionResult<T = unknown> = {
  ok: boolean;
  executed: boolean;
  result?: T;
  error?: string;
  reason?: string;
};

/**
 * Strips URL to origin + path without search query or hash to prevent secret leak.
 */
function sanitizeUrlForEvaluator(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return rawUrl.split("?")[0].split("#")[0];
  }
}

/**
 * Host Session Orchestrator connecting Chrome Connector, BrowserConsentAuthority, and Jev Adapter.
 */
export class BrowserConsentSession {
  private readonly authority: BrowserConsentAuthority;
  private readonly prepareCallback: PrepareActionCallback;
  private readonly readTrustedBindingCallback: ReadTrustedBindingCallback;
  private readonly executeCallback: ExecuteActionCallback;
  private readonly jevEvaluator?: JevConsentEvaluatorFn;
  private readonly activePrepared = new Map<
    string,
    {
      prepareId: string;
      challengeId: string;
      summary: string;
    }
  >();

  constructor(options: BrowserConsentSessionOptions) {
    if (typeof options.prepareCallback !== "function") {
      throw new Error("prepareCallback must be a function");
    }
    if (typeof options.readTrustedBindingCallback !== "function") {
      throw new Error("readTrustedBindingCallback must be a function");
    }
    if (typeof options.executeCallback !== "function") {
      throw new Error("executeCallback must be a function");
    }

    this.prepareCallback = options.prepareCallback;
    this.readTrustedBindingCallback = options.readTrustedBindingCallback;
    this.executeCallback = options.executeCallback;
    this.jevEvaluator = options.jevEvaluator;

    const enableAutoApproval = options.enableAutoApproval === true;
    const calibrated = options.calibrated === true;

    // Build intent evaluator adapting Jev if provided
    let intentEvaluator: ConsentIntentEvaluator | undefined;
    if (this.jevEvaluator) {
      const jev = this.jevEvaluator;
      intentEvaluator = async (
        input: ConsentIntentEvaluationInput,
        signal?: AbortSignal
      ): Promise<ConsentIntentEvaluationResult> => {
        // Redact binding to only safe public summary, action, and clean resource URL
        const safeResource = sanitizeUrlForEvaluator(input.binding.url);
        const jevInput: ConsentDecisionInput = {
          challenge: {
            id: input.challengeId,
            summary: input.summary,
            action: input.binding.action,
            resource: safeResource,
            details: {
              target: input.binding.target,
              argsDigest: input.binding.argsDigest,
              formDigest: input.binding.formDigest,
            },
          },
          userMessage: input.userTurn.text,
        };

        const result = await jev(jevInput, signal);
        return {
          decision: result.decision,
          allowCandidate: result.allowCandidate,
          calibrated: result.calibrated,
          confidence: result.confidence,
          reasons: result.reasons,
          evidenceOnly: result.evidenceOnly,
        };
      };
    }

    this.authority = new BrowserConsentAuthority({
      enableAutoApproval,
      calibrated,
      intentEvaluator,
      now: options.now,
      ...(options.authorityOptions || {}),
    });
  }

  getAuthority(): BrowserConsentAuthority {
    return this.authority;
  }

  /**
   * Prepares a browser action and creates an authoritative pending challenge.
   */
  async prepare(
    target: unknown,
    args: unknown
  ): Promise<PrepareSessionActionResult> {
    try {
      const prepRes = await this.prepareCallback(target, args);
      if (!prepRes || !prepRes.prepareId) {
        return { ok: false, error: "Prepare callback returned empty result" };
      }

      // Read authoritative tamper-proof binding from trusted host source
      const rawBinding = await this.readTrustedBindingCallback(prepRes.prepareId);
      const binding = validateAndCloneBinding(rawBinding);

      const challengeRes = this.authority.createChallenge({
        binding,
        summary: prepRes.summary || "Browser Action",
      });

      if (!challengeRes.ok) {
        return { ok: false, error: challengeRes.error || challengeRes.reason };
      }

      this.activePrepared.set(prepRes.prepareId, {
        prepareId: prepRes.prepareId,
        challengeId: challengeRes.challenge.challengeId,
        summary: prepRes.summary,
      });

      return {
        ok: true,
        prepareId: prepRes.prepareId,
        challengeId: challengeRes.challenge.challengeId,
        summary: prepRes.summary,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Ingests a trusted user turn directly from host ingress.
   * Model arguments are STRICTLY forbidden.
   */
  async recordTrustedUserTurn(
    turn: TrustedUserTurn,
    options?: { signal?: AbortSignal; targetPrepareId?: string }
  ) {
    if (!turn || typeof turn !== "object") {
      throw new Error("recordTrustedUserTurn requires a valid TrustedUserTurn object");
    }

    let targetChallengeId: string | undefined;
    if (options?.targetPrepareId) {
      targetChallengeId = this.activePrepared.get(options.targetPrepareId)?.challengeId;
    }

    return await this.authority.recordTrustedUserTurn(turn, {
      signal: options?.signal,
      targetChallengeId,
    });
  }

  /**
   * Consumes an approved challenge and triggers the action callback strictly once.
   * Never retries on mismatch or failure.
   */
  async execute(prepareId: string): Promise<ExecuteSessionActionResult> {
    const item = this.activePrepared.get(prepareId);
    if (!item) {
      return {
        ok: false,
        executed: false,
        reason: "unknown_prepare_id",
        error: "No active prepared action found for ID",
      };
    }

    // Step 1: Re-fetch current binding from trusted authority to check for drift
    let currentBinding: BrowserConsentBinding;
    try {
      const raw = await this.readTrustedBindingCallback(prepareId);
      currentBinding = validateAndCloneBinding(raw);
    } catch (err) {
      return {
        ok: false,
        executed: false,
        reason: "binding_read_failed",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Step 2: Attempt strictly one-time atomic consumption in authority
    const consumeRes = this.authority.consume(item.challengeId, currentBinding);
    if (!consumeRes.ok) {
      return {
        ok: false,
        executed: false,
        reason: consumeRes.reason,
        error: consumeRes.error,
      };
    }

    // Step 3: Trigger execution callback
    try {
      const result = await this.executeCallback(consumeRes.binding, prepareId);
      // Once consumed and executed, clean local prepare map
      this.activePrepared.delete(prepareId);
      return {
        ok: true,
        executed: true,
        result,
      };
    } catch (err) {
      // Clean local state - fail closed, never retried
      this.activePrepared.delete(prepareId);
      return {
        ok: false,
        executed: false,
        reason: "execution_error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
