import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, lstatSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { evaluateVerdict, parseStructuredReview, structuredReviewVerdict } from "./reviewVerdict";
import { stripResultFrontMatter } from "../agentRunResultFile";
import { readRunRecord, resolveRunsDir } from "../agentRunControl";
import { collectTaskRevisionEvidence } from "./taskRevisionEvidence";
import { taskContentRevision } from "./taskProgressEvidence";
import { createHostTaskController, hostTaskEventsRoot, readHostTask, type HostTaskReference } from "./hostTaskEvents";

/** Trusted host input ONLY. Ordinary startAgentRun has no context and never
 * produces review evidence. Each host intent authorizes exactly one matching tool invocation. */
export type HostReviewDispatchContext = {
  scope: HostTaskReference; baseline: string; taskPaths: string[];
  revision: string; authorExecutionId: string;
  dispatchId: string; toolCallId: string; target: { agentKey: string; task: string };
};
type Intent = HostReviewDispatchContext & { reviewerRunId: string; resultSha256?: string };
const context = new AsyncLocalStorage<HostReviewDispatchContext | undefined>();
export const currentHostReviewDispatch = () => context.getStore();
export function withHostReviewDispatch<T>(value: HostReviewDispatchContext | undefined, action: () => T): T {
  return context.run(value ? structuredClone(value) : undefined, action);
}
export type HostReviewContentAcceptance = (review: { runId: string; dispatchId: string; revision: string; sha256: string; text: string }) => Promise<boolean>;
export function matchesHostReviewDispatch(c: HostReviewDispatchContext | undefined, call: { id?: string }, args: Record<string, unknown>): c is HostReviewDispatchContext {
  return !!c?.target && call.id === c.toolCallId && args.agentKey === c.target.agentKey && args.task === c.target.task;
}
/** Exclusive durable slot is acquired before any await/spawn, including retries. */
export function consumeHostReviewDispatch(c: HostReviewDispatchContext, env: Record<string, string | undefined>): void {
  if (!safe(c.dispatchId) || !c.toolCallId || !c.target.agentKey || !c.target.task) throw new Error("Invalid review dispatch identity");
  mkdirSync(dir(env), { recursive: true, mode: 0o700 });
  writeFileSync(join(dir(env), `dispatch-${c.dispatchId}.consumed`), JSON.stringify(c), { flag: "wx", mode: 0o600 });
}
export async function settleHostReviewsForScope(scope: HostTaskReference, env: Record<string, string | undefined>, accept?: HostReviewContentAcceptance): Promise<void> {
  let names: string[];
  try { names = readdirSync(dir(env)); } catch { return; }
  for (const name of names.filter(n => n.endsWith(".json") && !n.startsWith("author-"))) {
    try {
      const intent: Intent = JSON.parse(readFileSync(join(dir(env), name), "utf8"));
      if (intent.scope.taskId === scope.taskId && intent.scope.dialogId === scope.dialogId && resolve(intent.scope.workspace) === resolve(scope.workspace)) {
        await settleHostReviewDispatch(intent.reviewerRunId, env, accept);
      }
    } catch { /* malformed or incomplete host record cannot certify review */ }
  }
}
const safe = (id: string) => /^[A-Za-z0-9._-]{1,128}$/.test(id);
function dir(env: Record<string, string | undefined>) {
  const path = join(resolveRunsDir(env), "host-review-dispatch");
  try { if (lstatSync(path).isSymbolicLink() || realpathSync(path) !== resolve(path)) throw new Error("Unsafe review dispatch directory"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  return path;
}
function file(env: Record<string, string | undefined>, id: string) {
  if (!safe(id)) throw new Error("Invalid review run id");
  return join(dir(env), `${id}.json`);
}
export function createHostAuthorExecution(env: Record<string, string | undefined>, scope: HostTaskReference, turnId: string): string {
  const task = readHostTask(hostTaskEventsRoot(env), scope);
  const executionId = task.authorization !== "unknown" && task.contract.authorInstanceId || randomUUID();
  if (!safe(executionId)) throw new Error("Invalid author execution identity");
  mkdirSync(dir(env), { recursive: true, mode: 0o700 });
  try { writeFileSync(join(dir(env), `author-${executionId}.json`), JSON.stringify({ executionId, scope, turnId }), { flag: "wx", mode: 0o600 }); }
  catch (error) { const existing = JSON.parse(readFileSync(join(dir(env), `author-${executionId}.json`), "utf8")); if (existing.executionId !== executionId || JSON.stringify(existing.scope) !== JSON.stringify(scope)) throw error; }
  return executionId;
}
export async function validateHostReviewDispatch(c: HostReviewDispatchContext, env: Record<string, string | undefined>, cwd: string): Promise<void> {
  if (resolve(c.scope.workspace) !== resolve(cwd) || !safe(c.authorExecutionId) || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(c.baseline) || !c.taskPaths.length) throw new Error("Invalid trusted review context");
  const task = readHostTask(hostTaskEventsRoot(env), c.scope);
  if (task.authorization !== "active") throw new Error("Review task is not active");
  if (task.contract.authorInstanceId && task.contract.authorInstanceId !== c.authorExecutionId) throw new Error("Author execution identity mismatch");
  const author = JSON.parse(readFileSync(join(dir(env), `author-${c.authorExecutionId}.json`), "utf8"));
  if (author.executionId !== c.authorExecutionId || JSON.stringify(author.scope) !== JSON.stringify(c.scope) || !author.turnId) throw new Error("Author turn binding missing");
  const revision = await collectTaskRevisionEvidence({ cwd, baseline: c.baseline, taskPaths: c.taskPaths });
  if (!revision.complete || taskContentRevision(revision) !== c.revision) throw new Error("Review revision changed or incomplete");
}
export async function bindHostReviewRun(c: HostReviewDispatchContext, runId: string, env: Record<string, string | undefined>): Promise<void> {
  if (runId === c.authorExecutionId) throw new Error("Self review rejected");
  await validateHostReviewDispatch(c, env, c.scope.workspace);
  mkdirSync(dir(env), { recursive: true, mode: 0o700 });
  const consumed = JSON.parse(readFileSync(join(dir(env), `dispatch-${c.dispatchId}.consumed`), "utf8"));
  if (JSON.stringify(consumed) !== JSON.stringify(c)) throw new Error("Review dispatch not consumed by this invocation");
  writeFileSync(join(dir(env), `dispatch-${c.dispatchId}.bound`), runId, { flag: "wx", mode: 0o600 });
  const intent: Intent = { ...structuredClone(c), reviewerRunId: runId };
  writeFileSync(file(env, runId), JSON.stringify(intent), { flag: "wx", mode: 0o600 });
}
/** Called at the actual host save boundary, after child registry settlement.
 * No intent => unknown, including ordinary APPROVE-producing child runs.
 * Stores a full progress snapshot: implementation is not inferred from prose.
 */
export async function settleHostReviewDispatch(runId: string, env: Record<string, string | undefined>, accept?: HostReviewContentAcceptance, options?: { allowPending?: boolean }): Promise<{ status: "verified" | "validated" | "unknown"; reason?: string }> {
  try {
    const intentPath = file(env, runId);
    if (lstatSync(intentPath).isSymbolicLink() || realpathSync(intentPath) !== resolve(intentPath)) throw new Error("Unsafe intent path");
    const intent: Intent = JSON.parse(readFileSync(intentPath, "utf8"));
    if (intent.reviewerRunId !== runId || intent.authorExecutionId === runId || readFileSync(join(dir(env), `dispatch-${intent.dispatchId}.bound`), "utf8") !== runId) throw new Error("Review identity mismatch");
    await validateHostReviewDispatch(intent, env, intent.scope.workspace);
    const storedDecision = readDecisionRecord(`${intentPath}.decision`);
    if (!storedDecision) throw new Error("review_decision_missing");
    if (storedDecision.state !== "committed" && !(storedDecision.state === "pending" && options?.allowPending)) throw new Error(`review_decision_${storedDecision.state === "pending" ? "pending" : "failed"}`);
    if (storedDecision.action !== "continue") throw new Error("review_decision_does_not_continue");
    if (storedDecision.dispatchId !== intent.dispatchId || storedDecision.runId !== runId || storedDecision.revision !== intent.revision) throw new Error("review_decision_binding_mismatch");
    const run = readRunRecord(runId, { env });
    const expected = join(resolveRunsDir(env), `${runId}.result.md`);
    if (!run || run.runId !== runId || run.status !== "done" || run.exitCode !== 0 || !run.resultFile || resolve(run.resultFile) !== resolve(expected)) throw new Error("Review not a successful canonical terminal");
    if (lstatSync(expected).isSymbolicLink() || !lstatSync(expected).isFile() || lstatSync(expected).size > 2 * 1024 * 1024 || realpathSync(expected) !== resolve(expected)) throw new Error("Unsafe result path");
    const bytes = readFileSync(expected);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (storedDecision.resultSha256 !== digest) throw new Error("review_decision_result_changed");
    if (intent.resultSha256 && intent.resultSha256 !== digest) throw new Error("Review result changed");
    const text = stripResultFrontMatter(bytes.toString("utf8"));
    const verdict = evaluateVerdict(text, intent.revision);
    if (verdict.status !== "OK APPROVE") throw new Error("Review is not strict APPROVE");
    const summary = summarizeReview(text);
    await validateHostReviewDispatch(intent, env, intent.scope.workspace);
    // Fixed once: never overwrite a terminal digest with newly supplied text.
    const pin = `${intentPath}.result-sha256`;
    try { writeFileSync(pin, digest, { flag: "wx", mode: 0o600 }); }
    catch { if (readFileSync(pin, "utf8") !== digest) throw new Error("Review result changed"); }
    const acknowledgement = `${intentPath}.content-accepted`;
    let accepted = false;
    try { accepted = readFileSync(acknowledgement, "utf8") === digest; } catch { /* explicit host acknowledgement still required */ }
    if (!accepted) {
      if (!accept || !await accept({ runId, dispatchId: intent.dispatchId, revision: intent.revision, sha256: digest, text })) throw new Error("Review content not acknowledged by host orchestration");
      // Callback may await: re-authenticate both revision and exact bytes afterwards.
      await validateHostReviewDispatch(intent, env, intent.scope.workspace);
      if (createHash("sha256").update(readFileSync(expected)).digest("hex") !== digest) throw new Error("Review result changed during acknowledgement");
      try { writeFileSync(acknowledgement, digest, { flag: "wx", mode: 0o600 }); }
      catch { if (readFileSync(acknowledgement, "utf8") !== digest) throw new Error("Review acknowledgement mismatch"); }
    }
    await validateHostReviewDispatch(intent, env, intent.scope.workspace);
    // Validation may acknowledge content, but pending can never publish approval.
    if (options?.allowPending) return { status: "validated" };
    const committed = readDecisionRecord(`${intentPath}.decision`);
    if (!committed || committed.state !== "committed" || committed.action !== "continue" || committed.resultSha256 !== digest || committed.dispatchId !== intent.dispatchId || committed.runId !== runId || committed.revision !== intent.revision) throw new Error("review_decision_not_committed");
    const latest = readHostTask(hostTaskEventsRoot(env), intent.scope);
    if (latest.authorization !== "active") throw new Error("Task no longer active");
    if (latest.contract.review?.evidenceRef === `run:${runId}:sha256:${digest}` && latest.contract.review.revision === intent.revision) return { status: "verified" };
    createHostTaskController(hostTaskEventsRoot(env), { kind: "trusted-host", actorId: "review-settlement", sourceId: intent.dispatchId }).append(intent.scope, latest.sequence, {
      type: "progress", value: { ...preservedProgress(latest.contract, intent.revision), revision: intent.revision,
        authorInstanceId: latest.contract.revision === intent.revision ? latest.contract.authorInstanceId ?? intent.authorExecutionId : intent.authorExecutionId,
        review: { revision: intent.revision, reviewerInstanceId: runId, verdict: summary.verdict, hasCriticalOrHigh: summary.counts.critical > 0 || summary.counts.high > 0, evidenceRef: `run:${runId}:sha256:${digest}` } },
    });
    return { status: "verified" };
  } catch (e) {
    // A prior approval must not survive replacement/truncation/revision drift.
    // Only invalidate the exact review this host intent previously supplied.
    try {
      const intent: Intent = JSON.parse(readFileSync(file(env, runId), "utf8"));
      const latest = readHostTask(hostTaskEventsRoot(env), intent.scope);
      if (latest.authorization === "active" && latest.contract.review?.reviewerInstanceId === runId) {
        const current = await collectTaskRevisionEvidence({ cwd: intent.scope.workspace, baseline: intent.baseline, taskPaths: intent.taskPaths });
        createHostTaskController(hostTaskEventsRoot(env), { kind: "trusted-host", actorId: "review-settlement", sourceId: `invalidate-${intent.dispatchId}` }).append(intent.scope, latest.sequence, {
          type: "progress", value: { ...preservedProgress(latest.contract, current.complete ? taskContentRevision(current) : ""), review: undefined },
        });
      }
    } catch { /* no valid host intent/history => no authority to modify state */ }
    return { status: "unknown", reason: e instanceof Error ? e.message : "host binding missing" };
  }
}

function preservedProgress(contract: import("../../agent-runtime/taskExecutionContract").TaskExecutionContract, revision: string) {
  if (contract.revision !== revision) return { implementation: "unknown" as const, changes: "unknown" as const, revision: undefined, authorInstanceId: undefined, review: undefined, commit: undefined, localMerge: undefined };
  const { implementation, changes, authorInstanceId, review, commit, localMerge } = contract;
  return { implementation, changes, revision, authorInstanceId, review, commit, localMerge };
}

/** Explicit orchestrator decision. No approval is inferred from a terminal wake. */
export async function recordHostTaskReviewDecision(scope: HostTaskReference, decision: import("./taskReviewTools").TaskReviewDecision, env: Record<string, string | undefined>): Promise<void> {
  const intentPath = file(env, decision.runId);
  if (lstatSync(intentPath).isSymbolicLink() || realpathSync(intentPath) !== resolve(intentPath)) throw new Error("Unsafe intent path");
  const intent: Intent = JSON.parse(readFileSync(intentPath, "utf8"));
  if (JSON.stringify(intent.scope) !== JSON.stringify(scope) || intent.dispatchId !== decision.dispatchId || intent.reviewerRunId !== decision.runId || intent.revision !== decision.revision ||
      readFileSync(join(dir(env), `dispatch-${intent.dispatchId}.bound`), "utf8") !== decision.runId) throw new Error("review_decision_binding_mismatch");
  const run = readRunRecord(decision.runId, { env });
  const resultPath = join(resolveRunsDir(env), `${decision.runId}.result.md`);
  if (!run || run.status !== "done" || run.exitCode !== 0 || resolve(run.resultFile ?? "") !== resolve(resultPath) ||
      lstatSync(resultPath).isSymbolicLink() || realpathSync(resultPath) !== resolve(resultPath) || !lstatSync(resultPath).isFile() || lstatSync(resultPath).size > 2 * 1024 * 1024) throw new Error("review_decision_result_unavailable");
  const bytes = readFileSync(resultPath);
  if (createHash("sha256").update(bytes).digest("hex") !== decision.resultSha256) throw new Error("review_decision_result_changed");
  const decisionPath = `${intentPath}.decision`;
  const auditPath = `${decisionPath}.audit`;
  const pending: StoredDecision = { ...structuredClone(decision), state: "pending" };
  // The durable exclusive slot is never removed: crashes and failed attempts
  // cannot be replayed as new decisions, including by another process.
  try { writeFileSync(decisionPath, JSON.stringify(pending), { flag: "wx", mode: 0o600 }); }
  catch (error) {
    appendFileSync(auditPath, `${JSON.stringify({ ...pending, state: "failed", reason: "review_decision_already_claimed", at: new Date().toISOString() })}\n`, { mode: 0o600 });
    throw new Error("review_decision_already_claimed", { cause: error });
  }
  try {
    appendFileSync(auditPath, `${JSON.stringify(pending)}\n`, { mode: 0o600 });
    await validateHostReviewDispatch(intent, env, scope.workspace);
    const text = stripResultFrontMatter(bytes.toString("utf8"));
    const summary = summarizeReview(text);
    pending.counts = summary.counts;
    if (decision.action === "continue") {
      if (evaluateVerdict(text, intent.revision).status !== "OK APPROVE") throw new Error("review_decision_not_approved");
      if (decision.findings.some(f => f.disposition === "fix")) throw new Error("review_decision_unresolved_findings");
      assertFindingCoverage(decision.findings, summary);
    }
    if (decision.action === "continue") {
      const validated = await settleHostReviewDispatch(decision.runId, env, review => Promise.resolve(review.dispatchId === decision.dispatchId && review.revision === decision.revision && review.sha256 === decision.resultSha256), { allowPending: true });
      if (validated.status !== "validated") throw new Error(validated.reason ?? "review_decision_not_approved");
    } else {
      const latest = readHostTask(hostTaskEventsRoot(env), scope);
      if (latest.authorization === "unknown") throw new Error("review_decision_task_unresolved");
      createHostTaskController(hostTaskEventsRoot(env), { kind: "trusted-host", actorId: "review-decision", sourceId: intent.dispatchId }).append(scope, latest.sequence, {
        type: "progress", value: { ...preservedProgress(latest.contract, intent.revision), review: undefined },
      });
    }
    // Commit before publishing. A crash here can only omit approval, never
    // expose approval backed by an uncommitted decision.
    writeDecisionRecord(decisionPath, auditPath, { ...pending, state: "committed" }, "committed");
    if (decision.action === "continue") {
      const published = await settleHostReviewDispatch(decision.runId, env);
      if (published.status !== "verified") throw new Error(published.reason ?? "review_decision_not_published");
    }
  } catch (error) {
    writeDecisionRecord(decisionPath, auditPath, { ...pending, state: "failed", reason: error instanceof Error ? error.message : String(error) }, "failed");
    // Revoke this dispatch's approval if publication partially succeeded.
    await settleHostReviewDispatch(decision.runId, env);
    throw error;
  }
}

export type ReviewSeverityCounts = { critical: number; high: number; medium: number; low: number };
export type ReviewSummary = { verdict: "APPROVE" | "WARNING" | "BLOCK"; counts: ReviewSeverityCounts; findingIds: string[]; unlabelled: number };
/** Reserved finding id: a disposition statement that covers the whole review text. */
export const FULL_TEXT_COVERAGE_ID = "full-text";
type DecisionState = "pending" | "committed" | "failed";
type StoredDecision = import("./taskReviewTools").TaskReviewDecision & { state: DecisionState; reason?: string; counts?: ReviewSeverityCounts };

const SEVERITY_HEADING_RE = /^#{1,2}\s*[*`_\s]*(CRITICAL|HIGH|MEDIUM|LOW)\b/i;
const ANY_HEADING_RE = /^#{1,6}\s/;
const EMPTY_DECLARATION_RE = /^(?:无。?|None|0)$/i;
const BULLET_RE = /^[-*+]\s+(.*)$/;

/** Mechanical extraction only: prose is never interpreted, every finding needs an explicit id. */
export function summarizeReview(text: string): ReviewSummary {
  const parsed = parseStructuredReview(text);
  if (parsed.kind === "invalid") throw new Error(parsed.reason);
  if (parsed.kind === "structured") {
    const counts: ReviewSeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const finding of parsed.review.findings)
      counts[finding.severity.toLowerCase() as keyof ReviewSeverityCounts]++;
    return { verdict: structuredReviewVerdict(parsed.review), counts,
      findingIds: parsed.review.findings.map(f => f.id), unlabelled: 0 };
  }

  const counts: ReviewSeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const findingIds: string[] = [];
  let unlabelled = 0;
  let section: keyof ReviewSeverityCounts | null = null;
  let declared: "APPROVE" | "BLOCK" | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const verdict = line.match(/^VERDICT\s*[:：]\s*(APPROVE|BLOCK)\b/);
    if (verdict) { declared = verdict[1] as "APPROVE" | "BLOCK"; continue; }
    const severity = line.match(SEVERITY_HEADING_RE);
    if (severity) { section = severity[1].toLowerCase() as keyof ReviewSeverityCounts; continue; }
    if (ANY_HEADING_RE.test(line)) { section = null; continue; }
    if (!section) continue;
    if (line.startsWith("|") || line.startsWith("```") || /^[-=]{3,}$/.test(line)) continue;
    if (EMPTY_DECLARATION_RE.test(line.replace(/[*`_]/g, "").trim())) continue;
    const bullet = line.match(BULLET_RE);
    const body = bullet ? bullet[1] : line;
    counts[section]++;
    const id = bullet ? extractFindingId(body) : null;
    if (id) findingIds.push(id); else unlabelled++;
  }
  const verdict = declared === "APPROVE" ? "APPROVE" : declared === "BLOCK" ? "BLOCK" : "WARNING";
  return { verdict, counts, findingIds, unlabelled };
}

/** A bracket label that only names a severity describes a section, not one finding: taking it
 * as an id would let a single disposition cover every finding in that section. */
const SEVERITY_LABEL_RE = /^(?:CRITICAL|HIGH|MEDIUM|LOW)$/i;
/** Labelled two-line report form (`File: path:line`, including bold/backticked variants).
 * Accepted only when the value is one path:line token, so prose after the label is never
 * mined for an id; anything else stays unlabelled and needs the full-text disposition. */
const LABELLED_FILE_LINE_RE = /(?:^|[\s*`])File\*{0,2}\s*[:：]\s*`?([^\s`*:]+?\.[A-Za-z0-9]{1,8}):(\d+(?:-\d+)?)`?(?=$|[\s,;.)])/;

function extractFindingId(body: string): string | null {
  const bracket = body.match(/^\[([^\]]{1,64})\]/);
  if (bracket && !SEVERITY_LABEL_RE.test(bracket[1].trim())) return bracket[1].trim();
  const prefixed = body.match(/\b((?:CRITICAL|HIGH|MEDIUM|LOW|F)-[A-Za-z0-9._-]{1,32})\b/i);
  if (prefixed) return prefixed[1];
  const labelled = body.match(LABELLED_FILE_LINE_RE);
  if (labelled) return `${labelled[1]}:${labelled[2]}`;
  const reference = body.match(/`([^`\n]+?):(\d+(?:-\d+)?)`/);
  if (reference) return `${reference[1]}:${reference[2]}`;
  return null;
}

/** Normalizes a finding id before the exact comparison below: trims whitespace, strips
 * markdown quoting (backticks, quotes, brackets), collapses inner spaces, drops trailing
 * punctuation and lowercases severity-prefixed ids (report text matches them case
 * insensitively). Coverage stays exact: no prefix, substring or line-range rules. */
export function normalizeFindingId(raw: string): string {
  let id = raw.trim();
  id = id.replace(/^[`"'\u201c\u201d\u2018\u2019]+|[`"'\u201c\u201d\u2018\u2019]+$/g, "").trim();
  id = id.replace(/^\[|\]$/g, "").trim();
  id = id.replace(/\s+/g, " ");
  id = id.replace(/[.,;]+$/, "").trim();
  if (/^(?:critical|high|medium|low|f)-/i.test(id)) id = id.toLowerCase();
  return id;
}

/** Every finding the report enumerates with an explicit id must carry a disposition. */
export function assertFindingCoverage(findings: Array<{ id: string; disposition: string; rationale: string }>, summary: ReviewSummary): void {
  const declared = findings.map(f => normalizeFindingId(f.id)).filter(id => id.length > 0);
  const uncovered = summary.findingIds.filter(id => !declared.includes(normalizeFindingId(id)));
  if (uncovered.length > 0) throw new Error(`review_decision_findings_incomplete: ${uncovered.join(", ")}`);
  if (summary.unlabelled > 0 && !declared.includes(FULL_TEXT_COVERAGE_ID)) throw new Error("review_decision_findings_incomplete: full-text disposition required");
}

function readDecisionRecord(path: string): StoredDecision | null {
  try { return JSON.parse(readFileSync(path, "utf8")) as StoredDecision; }
  catch { return null; }
}

/** Only the exclusive slot owner transitions state; every transition stays in audit. */
function writeDecisionRecord(decisionPath: string, auditPath: string, record: StoredDecision, transition: DecisionState): void {
  const tmp = `${decisionPath}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify(record), { mode: 0o600 });
  renameSync(tmp, decisionPath);
  appendFileSync(auditPath, `${JSON.stringify({ state: transition, action: record.action, reason: record.reason, counts: record.counts, at: new Date().toISOString() })}\n`, { mode: 0o600 });
}
