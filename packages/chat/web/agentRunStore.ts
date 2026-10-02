import type {
  AgentRunLifecyclePhase,
  AgentRunLifecycleRun,
  AgentRunStreamAgentRunEvent,
} from "core/agentRunStreamEvents";

export type { AgentRunLifecyclePhase, AgentRunLifecycleRun, AgentRunStreamAgentRunEvent };

export type AgentRunScope = {
  userId: string;
  dialogId?: string;
  workspaceId?: string;
};

export type AgentRunEvent = AgentRunStreamAgentRunEvent;
export const AGENT_RUN_LINGER_MS = 5_000;
type Listener = () => void;
type RunRecord = { run: AgentRunLifecycleRun; phase: AgentRunLifecyclePhase };
type TerminalRecord = { startedAt: number; finishedAt: number; scope: AgentRunScope };
type LingerRecord = { run: AgentRunLifecycleRun; scope: AgentRunScope };

const runs = new Map<string, RunRecord>();
// Tombstones are deliberately retained: replayed events must not revive a run
// after its finished snapshot has been observed.
const terminals = new Map<string, TerminalRecord>();
// Linger is presentation-only and intentionally separate from tombstones.
const linger = new Map<string, LingerRecord>();
const runScopes = new Map<string, AgentRunScope>();
const listeners = new Set<Listener>();
let version = 0;
let clock = () => Date.now();

function matchesScope(event: AgentRunEvent, scope: AgentRunScope): boolean {
  const wanted = event.scope;
  return wanted.userId === scope.userId &&
    (wanted.dialogId === undefined || wanted.dialogId === scope.dialogId) &&
    (wanted.workspaceId === undefined || wanted.workspaceId === scope.workspaceId);
}

function matchesStoredScope(stored: AgentRunScope, scope: AgentRunScope): boolean {
  return stored.userId === scope.userId &&
    (scope.dialogId === undefined || stored.dialogId === scope.dialogId) &&
    (scope.workspaceId === undefined || stored.workspaceId === scope.workspaceId);
}

function isTerminal(run: AgentRunLifecycleRun) {
  return run.status === "done" || run.status === "failed" || run.status === "cancelled";
}

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function removeExpiredLinger(now: number): boolean {
  let changed = false;
  for (const [runId, record] of linger) {
    if (now >= (record.run.finishedAt ?? record.run.startedAt) + AGENT_RUN_LINGER_MS) {
      linger.delete(runId);
      changed = true;
    }
  }
  return changed;
}

/** Narrow event adapter: all SSE wiring should call this function. */
export function applyAgentRunEvent(event: AgentRunEvent, scope?: AgentRunScope): boolean {
  if (event.type !== "agent_run" || (scope && !matchesScope(event, scope))) return false;

  const { run, phase } = event;
  const existing = runs.get(run.runId);
  const terminal = terminals.get(run.runId);

  // A newer startedAt explicitly begins a new generation for the same id.
  if (phase === "started" && terminal && run.startedAt > terminal.startedAt) {
    terminals.delete(run.runId);
    linger.delete(run.runId);
  } else if (terminal && run.startedAt <= terminal.startedAt) {
    return false;
  }

  if (existing) {
    if (run.startedAt < existing.run.startedAt) return false;
    if (run.startedAt === existing.run.startedAt && phase === "started" && existing.phase !== "started") return false;
  }

  if (isTerminal(run)) {
    const current = existing?.run;
    const finishedAt = Math.max(run.finishedAt ?? run.startedAt, current?.finishedAt ?? 0);
    const finishedRun = { ...current, ...run, finishedAt };
    terminals.set(run.runId, { startedAt: run.startedAt, finishedAt, scope: event.scope });
    linger.set(run.runId, { run: finishedRun, scope: event.scope });
    runs.delete(run.runId);
    runScopes.delete(run.runId);
    notify();
    return true;
  }

  const isNewGeneration = phase === "started" && !!existing && run.startedAt > existing.run.startedAt;
  const previous = isNewGeneration ? undefined : existing?.run;
  const folded: AgentRunLifecycleRun = { ...previous, ...run };
  const toolCallCount = Math.max(previous?.toolCallCount ?? 0, run.toolCallCount ?? 0);
  if (toolCallCount > 0) folded.toolCallCount = toolCallCount;
  else delete folded.toolCallCount;
  runs.set(run.runId, { run: folded, phase });
  runScopes.set(run.runId, event.scope);
  notify();
  return true;
}

export function getAgentRunsVersion(): number { return version; }
export function tickAgentRuns(now = clock()): void {
  if (runs.size > 0 || removeExpiredLinger(now)) notify();
}

/** Returns active runs plus terminal snapshots still inside the presentation linger window. */
export function getAgentRuns(scope?: AgentRunScope, now = clock()): AgentRunLifecycleRun[] {
  if (!scope || !scope.userId) return [];
  removeExpiredLinger(now);
  const active = [...runs.entries()]
    .filter(([runId]) => {
      const runScope = runScopes.get(runId);
      return !!runScope && matchesStoredScope(runScope, scope);
    })
    .map(([, record]) => record.run);
  const terminal = [...linger.values()]
    .filter((record) => matchesStoredScope(record.scope, scope))
    .map((record) => record.run);
  return [...active, ...terminal].sort(
    (a, b) =>
      a.startedAt - b.startedAt ||
      // 同毫秒 startedAt 时用 runId 兜底，保证顺序稳定（review LOW）。
      (a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0),
  );
}

export function subscribeAgentRuns(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearAgentRunsForTests(): void {
  runs.clear();
  terminals.clear();
  linger.clear();
  runScopes.clear();
  clock = () => Date.now();
  notify();
}

/** Test seam for deterministic expiry; production uses Date.now. */
export function setAgentRunsClockForTests(nextClock: (() => number) | undefined): void {
  clock = nextClock ?? (() => Date.now());
}

export function getAgentRunElapsedMs(run: AgentRunLifecycleRun, now = clock()): number {
  return Math.max(0, (run.finishedAt ?? now) - run.startedAt);
}

export function formatAgentRunElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}
