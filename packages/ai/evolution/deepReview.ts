import type { EvolutionCandidate } from "./candidate";
import type { EvolutionReviewEvidence } from "./evidence";
import {
  claimEvolutionCandidates,
  completeEvolutionCandidateReview,
  releaseEvolutionCandidateClaim,
  type EvolutionQueueStore,
} from "./queue";

/**
 * Deep Review Agent v0.
 *
 * Reads one claimed candidate's bounded evidence bundle and decides whether
 * the run exposes a *reusable, changeable* optimization. This is explicitly
 * NOT a fault-finding pass: the only valuable output is a change to a
 * durable surface (prompt / tool surface / context / routing / runtime /
 * decomposition) that would improve many future runs.
 *
 * The model is injected — no default external call is wired here. Hosts
 * supply an `EvolutionDeepReviewModel`; tests supply a canned one.
 */

export type EvolutionDeepReviewVerdict =
  | "actionable"
  | "not_actionable"
  | "external_noise"
  | "insufficient_evidence";

export type EvolutionDeepReviewSurface =
  | "prompt"
  | "tool_description"
  | "tool_schema"
  | "tool_implementation"
  | "tool_exposure"
  | "context"
  | "routing"
  | "retry"
  | "memory"
  | "agent_decomposition"
  | "runtime"
  | "other";

export type EvolutionDeepReviewResult = {
  verdict: EvolutionDeepReviewVerdict;
  /** What actually went wrong / was wasteful, in one line. */
  symptom?: string;
  /** Best-supported root cause; prefix uncertainty with "likely". */
  likelyRootCause?: string;
  surface?: EvolutionDeepReviewSurface;
  /** The concrete change being proposed (only when actionable). */
  proposedChange?: string;
  expectedBenefit?: string;
  /** Evidence pointers actually relied on (message ids, signal kinds, fields). */
  evidence: string[];
  /** How to validate the proposed change (eval / replay / canary). */
  validationPlan?: string;
};

export type EvolutionDeepReviewModel = (prompt: string) => Promise<string>;

const SURFACES: readonly EvolutionDeepReviewSurface[] = [
  "prompt",
  "tool_description",
  "tool_schema",
  "tool_implementation",
  "tool_exposure",
  "context",
  "routing",
  "retry",
  "memory",
  "agent_decomposition",
  "runtime",
  "other",
];

const VERDICTS: readonly EvolutionDeepReviewVerdict[] = [
  "actionable",
  "not_actionable",
  "external_noise",
  "insufficient_evidence",
];

/**
 * Build the review prompt for one evidence bundle. Pure + testable.
 */
export const buildEvolutionDeepReviewPrompt = (
  evidence: EvolutionReviewEvidence,
): string => {
  const conversation = evidence.conversation.messages
    .map((m) => {
      const content =
        typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      return `[${m.id}] ${m.role}: ${content}`;
    })
    .join("\n");

  return `You are the Evolution Deep Reviewer. You review ONE completed agent run that was flagged as interesting and decide whether it reveals a REUSABLE, CHANGEABLE optimization.

This is not a fault-finding exercise. Most interesting runs do NOT imply a system change. Only mark "actionable" when the evidence supports a concrete change that would improve MULTIPLE future runs — a prompt revision, a tool description/schema/implementation fix, a tool-exposure change, a context/routing/retry/memory/agent-decomposition change, or a runtime fix.

Do NOT propose changes for:
- a task that was simply hard or genuinely required many steps,
- transient provider/network failures, or
- one-off external failures (third-party API down, user quota, flaky remote host).

Keep these four things distinct in your answer: symptom (what was observed), evidence (which facts support it — cite message ids / signal kinds / snapshot fields), hypothesis (likely root cause), and proposed intervention (the change). When the root cause is uncertain, mark it "likely ..." in likelyRootCause or return verdict "insufficient_evidence". "Nothing worth changing" is a legitimate, valuable outcome — use "not_actionable" or "external_noise" rather than inventing a change.

EVIDENCE
--------
candidateId: ${evidence.candidateId}
runId: ${evidence.runId ?? "(none)"}
dialogId: ${evidence.dialogId ?? "(none)"}
task (${evidence.task.userMessageId ?? "unresolved"}): ${evidence.task.text ?? "(unresolved)"}
taskClass: ${evidence.task.taskClass ?? "(unclassified)"}

signals: ${JSON.stringify(evidence.signals)}

run.snapshot: ${JSON.stringify(evidence.run.snapshot ?? null)}
run.toolCalls: ${JSON.stringify(evidence.run.toolCalls ?? null)}
run.traceAvailable: ${evidence.run.traceAvailable} (v1 stores no raw trace — reason from the conversation window + snapshot + signals only)

baseline (comparable historical runs, self-excluded by runId): ${JSON.stringify(evidence.baseline ?? null)}

conversation (selected turn only${evidence.conversation.truncated ? ", TRUNCATED by bounds" : ""}; earlier tasks and later turns are excluded):
${conversation || "(no conversation messages available)"}

Respond with ONLY a JSON object:
{
  "verdict": "actionable" | "not_actionable" | "external_noise" | "insufficient_evidence",
  "symptom": "...",                  // optional
  "likelyRootCause": "...",          // optional; prefix "likely" when uncertain
  "surface": ${SURFACES.map((s) => `"${s}"`).join(" | ")},  // optional
  "proposedChange": "...",           // required when actionable
  "expectedBenefit": "...",          // optional
  "evidence": ["..."],               // required; cite concrete evidence items
  "validationPlan": "..."            // optional
}`;
};

const stripCodeFence = (raw: string): string => {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fence ? fence[1]!.trim() : trimmed;
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/**
 * Fault-tolerant parse of the model's JSON output. Unknown/missing fields are
 * dropped; an unparseable body becomes insufficient_evidence so the caller
 * keeps the candidate accepted instead of resolving on garbage.
 */
export const parseEvolutionDeepReviewResult = (
  raw: string,
): EvolutionDeepReviewResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return {
      verdict: "insufficient_evidence",
      evidence: ["model output was not parseable JSON"],
    };
  }
  if (!parsed || typeof parsed !== "object") {
    return {
      verdict: "insufficient_evidence",
      evidence: ["model output was not a JSON object"],
    };
  }
  const record = parsed as Record<string, unknown>;
  const verdict = VERDICTS.includes(record.verdict as EvolutionDeepReviewVerdict)
    ? (record.verdict as EvolutionDeepReviewVerdict)
    : "insufficient_evidence";
  const surface = SURFACES.includes(record.surface as EvolutionDeepReviewSurface)
    ? (record.surface as EvolutionDeepReviewSurface)
    : undefined;
  const evidenceList = Array.isArray(record.evidence)
    ? record.evidence.filter((e): e is string => typeof e === "string" && !!e.trim())
    : [];

  return {
    verdict,
    ...(asString(record.symptom) ? { symptom: asString(record.symptom) } : {}),
    ...(asString(record.likelyRootCause)
      ? { likelyRootCause: asString(record.likelyRootCause) }
      : {}),
    ...(surface ? { surface } : {}),
    ...(asString(record.proposedChange)
      ? { proposedChange: asString(record.proposedChange) }
      : {}),
    ...(asString(record.expectedBenefit)
      ? { expectedBenefit: asString(record.expectedBenefit) }
      : {}),
    evidence: evidenceList,
    ...(asString(record.validationPlan)
      ? { validationPlan: asString(record.validationPlan) }
      : {}),
  };
};

/**
 * Run the injected model over one evidence bundle.
 */
export const reviewEvolutionCandidateEvidence = async ({
  model,
  evidence,
}: {
  model: EvolutionDeepReviewModel;
  evidence: EvolutionReviewEvidence;
}): Promise<EvolutionDeepReviewResult> =>
  parseEvolutionDeepReviewResult(await model(buildEvolutionDeepReviewPrompt(evidence)));

export type EvolutionDeepReviewOutcome = {
  candidate: EvolutionCandidate;
  evidence: EvolutionReviewEvidence;
  result: EvolutionDeepReviewResult;
  /** The lifecycle transition actually applied (or skipped). */
  transition:
    | "resolved" // actionable / not_actionable / external_noise
    | "kept_accepted" // insufficient_evidence — stays claimable later
    | "released_to_open"; // reviewer threw — claim released for retry
  error?: string;
};

export type ReviewNextEvolutionCandidatesInput = {
  store: EvolutionQueueStore;
  limit?: number;
  /** Load bounded evidence for a claimed candidate. */
  loadEvidence: (
    candidate: EvolutionCandidate,
  ) => Promise<EvolutionReviewEvidence>;
  /** Review one evidence bundle. */
  runReview: (
    evidence: EvolutionReviewEvidence,
  ) => Promise<EvolutionDeepReviewResult>;
  /** Reserved for future audit stamping; accepted for forward-compat. */
  nowIso?: () => string;
};

/**
 * Empty bundle used only when evidence loading itself failed — the review
 * outcome must stay structurally valid (and honestly empty) for the operator.
 */
const emptyEvolutionReviewEvidence = (
  candidateId: string,
): EvolutionReviewEvidence => ({
  candidateId,
  task: {},
  conversation: { messages: [], truncated: false },
  run: { traceAvailable: false },
  signals: [],
});

/**
 * Claim up to `limit` open candidates, load evidence, run deep review, and
 * apply the lifecycle mapping:
 *
 *  - actionable | not_actionable | external_noise → `resolved`
 *  - insufficient_evidence → stays `accepted` (status enum is NOT extended;
 *    an accepted-but-unresolved candidate is visible to operators and can be
 *    re-reviewed or released explicitly)
 *  - reviewer threw → claim released back to `open` via
 *    releaseEvolutionCandidateClaim so a retry can re-claim it.
 */
export const reviewNextEvolutionCandidates = async ({
  store,
  limit = 1,
  loadEvidence,
  runReview,
}: ReviewNextEvolutionCandidatesInput): Promise<EvolutionDeepReviewOutcome[]> => {
  const claimed = await claimEvolutionCandidates({ store, limit });
  const outcomes: EvolutionDeepReviewOutcome[] = [];

  for (const candidate of claimed) {
    // `evidence` stays undefined until the loader succeeds: a loader failure
    // releases the claim with an empty bundle, a review failure releases it
    // while still carrying the loaded evidence for post-mortem.
    let evidence: EvolutionReviewEvidence | undefined;
    let result: EvolutionDeepReviewResult;
    try {
      // Evidence loading is inside the try on purpose: a loader failure must
      // release the claim, never strand the candidate in `accepted`.
      const loaded = await loadEvidence(candidate);
      evidence = loaded;
      result = await runReview(loaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const carried = evidence ?? emptyEvolutionReviewEvidence(candidate.id);
      try {
        await releaseEvolutionCandidateClaim({ store, candidateId: candidate.id });
      } catch (releaseError) {
        // Release itself failing must not re-throw into the loop: record both
        // errors so the operator sees a possibly stranded candidate.
        outcomes.push({
          candidate,
          evidence: carried,
          result: { verdict: "insufficient_evidence", evidence: [] },
          transition: "released_to_open",
          error: `${message}; release failed: ${
            releaseError instanceof Error ? releaseError.message : String(releaseError)
          }`,
        });
        continue;
      }
      outcomes.push({
        candidate,
        evidence: carried,
        result: { verdict: "insufficient_evidence", evidence: [] },
        transition: "released_to_open",
        error: message,
      });
      continue;
    }

    if (result.verdict === "insufficient_evidence") {
      outcomes.push({ candidate, evidence, result, transition: "kept_accepted" });
      continue;
    }

    const updated = await completeEvolutionCandidateReview({
      store,
      candidateId: candidate.id,
      outcome: "resolved",
    });
    outcomes.push({
      candidate: updated,
      evidence,
      result,
      transition: "resolved",
    });
  }

  return outcomes;
};
