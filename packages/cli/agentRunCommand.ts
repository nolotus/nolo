// Orchestration entry for `nolo agent run` and the related run/chat
// shorthands. Pure CLI arg parsing lives in `./agentRunArgs`; prompt
// construction helpers live in `./agentRunPrompts`; local workspace
// inspection helpers live in `./agentRunLocalWorkspace`. This file keeps
// the dependency-injected orchestration and re-exports the public surface
// for back-compat with existing callers.

import { runAgentTurn, type RunAgentTurnOptions, type RunAgentTurnResult } from "./client/agentRun";
import * as nodeFs from "node:fs";
import { CLI_AUTO_ROUTE_AGENT_KEY } from "./client/autoModelRouter";
import {
  buildModelLayerOverride,
  type ModelLayerOverride,
} from "../agent-runtime/modelLayerOverride";
import type { ContextBlockScope } from "../agent-runtime/contextBlockScope";
import { buildSkillDiscoveryContextLayer } from "../agent-runtime/skillDiscovery";
import { readAgentsMdLayerFromDisk } from "../agent-runtime/agentsMd";
import { CliProviderQuotaError } from "ai/agent/cliExecutor";
import type { AgentRuntimeHostAdapter } from "./agentRuntimeLocal";
import { resolveAgentRecordFromHybridStore, readDbRecord } from "./agentRecordHelpers";
import { resolveAuthToken } from "./cliEnvHelpers";
import { getReadableCliDb } from "./agentCommandSupport";
import { toErrorMessage } from "core/errorMessage";
import { parsePositiveFiniteNumberOrFallback } from "core/positiveFiniteNumberOrFallback";

import {
  buildLocalRunEnv,
  isLocalCliAgentKey,
  isFullstackCodingAgentRef,
  parseAgentRunArgs,
  readFlagValue,
  resolveRawAgentInput,
  resolveServerUrl,
  writeUsage,
  type ParseAgentRunArgsOptions,
  type ParsedAgentRunArgs,
} from "./agentRunArgs";
import {
  createRunActivityTracker,
  finalizeRunRecord,
  popQueueMessages,
  popSingleQueueMessage,
  readRunRecord,
  resolveRunQueuePath,
  spawnLocalBackgroundRun,
  type AgentRunControlDeps,
} from "./agentRunControl";
import { runDoDCommands, type DoDCommandResult } from "./agentRunDoD";
import {
  normalizeCliImageInput,
  prependFeatureWorktreeInstruction,
  prependOutputFormatGuidance,
  prependSubjectDialogMarker,
  prependWorkflowReferencePrompt,
  resolveWorkflowReference,
  type ResolvedWorkflowReference,
  resolveSkillReference,
  type ResolvedSkillReference,
  buildSkillContextBlocks,
} from "./agentRunPrompts";
import {
  formatLocalRunSummary,
  inspectLocalRunWorkspace,
  shouldPrintLocalRunSummary,
  type LocalRunWorkspaceInspection,
} from "./agentRunLocalWorkspace";
import {
  buildMemoryOverlayLayer,
  buildMemoryUseGuidanceLayer,
  partitionScopedBlocks,
  renderTurnContextBlocksWithScope,
  type TurnContextLayer,
} from "../agent-runtime/turnContext";
import { resolveCliMemory } from "./memoryRecall";
import { isSubtaskRun } from "../agent-runtime/agentRunIsolation";

// Re-export the public surface so existing callers that import from
// `./agentRunCommand` keep working without changes.
export {
  parseAgentRunArgs,
  type ParsedAgentRunArgs,
  type ParseAgentRunArgsOptions,
} from "./agentRunArgs";
export {
  prependSubjectDialogMarker,
  resolveWorkflowReference,
  type ResolvedWorkflowReference,
} from "./agentRunPrompts";
export {
  inspectLocalRunWorkspace,
  type LocalRunWorkspaceInspection,
} from "./agentRunLocalWorkspace";
// `normalizeCliImageInput` is internal-only but kept exported here for
// back-compat with any external caller that pulled it from this file.
export { normalizeCliImageInput } from "./agentRunPrompts";

type EnvLike = Record<string, string | undefined>;

type OutputLike = {
  write(chunk: string): unknown;
};

export type AgentRunCommandDeps = {
  env?: EnvLike;
  scriptDir: string;
  output?: OutputLike;
  commandPath?: string[];
  cliEntrypointPath?: string;
  runner?: typeof runAgentTurn;
  localRuntimeAdapterFactory?: (env: EnvLike, options?: { cwd?: string }) => AgentRuntimeHostAdapter;
  inspectLocalRunWorkspace?: typeof inspectLocalRunWorkspace;
  resolveWorkflowReference?: typeof resolveWorkflowReference;
  resolveAgentRunAgentKey?: typeof resolveAgentRunAgentKey;
  spawnLocalBackgroundRun?: typeof spawnLocalBackgroundRun;
  finalizeRunRecord?: typeof finalizeRunRecord;
  readRunRecord?: typeof readRunRecord;
  runDoDCommands?: typeof runDoDCommands;
  popQueueMessages?: typeof popQueueMessages;
  popSingleQueueMessage?: typeof popSingleQueueMessage;
  /** Override for tests; defaults to `process.exit`. */
  processExit?: (code: number) => never;
  /** Override for tests; defaults to `NOLO_LOCAL_RUN_STALL_TIMEOUT_MS` env or 5 min. */
  stallTimeoutMs?: number;
  /**
   * Skip the memory recall route (T3456). Tests with tight watchdog budgets
   * inject `true` to avoid the async overhead of opening the local LevelDB /
   * HTTP fetch before the runner is invoked. Production callers leave this
   * unset (defaults to false).
   */
  memoryRecallDisabled?: boolean;
} & Pick<AgentRunControlDeps, "homedir" | "spawn" | "fs" | "now" | "generateRunId">;

function resolvePositiveMs(value: unknown, fallback: number): number {
  return parsePositiveFiniteNumberOrFallback(value, fallback);
}

// ── Single settlement outcome resolver ──────────────────────────────────
// All three places that finalize a run record (normal completion, stall
// watchdog, timeout watchdog) MUST derive {status, exitCode} from this one
// pure function instead of hand-rolling their own pair. This is the fix for
// three same-root bugs: status:"failed" written next to exitCode:0 (normal
// completion didn't fold isStalledOrTruncated into exitCode), and watchdog
// settlements that omitted exitCode entirely. Contract (unit-tested):
//   status === "done"  <=>  exitCode === 0
//   status !== "done"  =>   exitCode !== 0 (and the field is always present)
export type RunOutcome = { readonly status: "done" | "failed" | "timeout"; readonly exitCode: number };

export type ResolveRunOutcomeInput =
  | { kind: "result"; exitCode: number; isStalledOrTruncated: boolean }
  | { kind: "stall" }
  | { kind: "timeout" };

export function resolveRunOutcome(input: ResolveRunOutcomeInput): RunOutcome {
  switch (input.kind) {
    case "stall":
      // Process exits 1 from the stall watchdog (see exitFromWatchdog below);
      // the registry exitCode must match so `nolo agent status` is truthful.
      return { status: "failed", exitCode: 1 };
    case "timeout":
      // Process exits 124 (conventional timeout exit code) from the timeout
      // watchdog; keep the registry exitCode in lockstep.
      return { status: "timeout", exitCode: 124 };
    case "result": {
      const failed = input.isStalledOrTruncated || input.exitCode !== 0;
      if (!failed) {
        return { status: "done", exitCode: 0 };
      }
      // A stalled/truncated turn can still report result.exitCode === 0 (the
      // runner didn't throw); the contract requires a non-zero exitCode
      // whenever status isn't "done", so fall back to 1 in that case.
      return { status: "failed", exitCode: input.exitCode !== 0 ? input.exitCode : 1 };
    }
  }
}

// ── Empty-assistant settlement semantics ─────────────────────────────────
// ok_with_warning（有完整正文、只缺 finish_reason 收尾帧）与 fallback（真没
// 拿到输出）共用 reason 值，结算只能靠 emptyAssistantOutputUsable 区分。
// 判定与 note 的构造收敛到下面两个纯函数，导出供测试直接断言。
const FAILED_EMPTY_ASSISTANT_REASONS: ReadonlySet<string> = new Set([
  "length_truncated",
  "stream_truncated",
  "repetition_loop",
  "stagnant_tool_calls",
]);

export const isRunResultStalledOrTruncated = (result: {
  emptyAssistantFallbackReason?: string;
  emptyAssistantOutputUsable?: boolean;
}): boolean =>
  !result.emptyAssistantOutputUsable &&
  FAILED_EMPTY_ASSISTANT_REASONS.has(result.emptyAssistantFallbackReason ?? "");

export const resolveRunSettlementNote = (result: {
  emptyAssistantFallbackReason?: string;
  emptyAssistantOutputUsable?: boolean;
}): { note: string } | {} => {
  const reason = result.emptyAssistantFallbackReason;
  if (!reason || !FAILED_EMPTY_ASSISTANT_REASONS.has(reason)) return {};
  // 正文可用：不构成故障，note 只记录「上游缺收尾帧」这个现象本身。
  if (result.emptyAssistantOutputUsable) {
    return { note: `output complete but stream lacked finish frame: ${reason}` };
  }
  return { note: `empty assistant output: ${reason}` };
};

async function resolveAgentRunAgentKey(args: {
  agentInput: string;
  cliArgs: string[];
  env: EnvLike;
  output: OutputLike;
}) {
  if (!args.agentInput.trim() || args.agentInput.startsWith("agent-")) {
    return undefined;
  }
  const db = await getReadableCliDb(args.output);
  const resolved = await resolveAgentRecordFromHybridStore({
    agentInput: args.agentInput,
    cliArgs: args.cliArgs,
    env: args.env,
    db,
    fetchImpl: fetch,
  });
  return resolved?.agentKey;
}

export async function runAgentRunCommand(args: string[], deps: AgentRunCommandDeps) {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;
  if (args.includes("--help") || args.includes("-h")) {
    writeUsage(output, deps.commandPath);
    return 0;
  }
  const parsed = parseAgentRunArgs(args, { commandPath: deps.commandPath });
  if (!parsed) {
    writeUsage(output, deps.commandPath);
    return 1;
  }

  const runner = deps.runner ?? runAgentTurn;

  // Watchdogs: an overall --timeout-ms and a "no progress" stall timeout.
  //
  // --timeout-ms must work whenever the user passes it, foreground or
  // background — a CLI flag that's silently ignored is the worst kind of
  // failure. The stall watchdog stays opt-in in the foreground (interactive
  // users can see a hang themselves; an unconditional 5-minute auto-kill
  // would cut off legitimate long thinking), so it only arms in the
  // foreground when NOLO_LOCAL_RUN_STALL_TIMEOUT_MS is explicitly set.
  // Background child runs (NOLO_AGENT_RUN_ID present) keep the existing
  // always-on stall watchdog — that default is unchanged.
  const nowMs = () => (deps.now ? deps.now().getTime() : Date.now());
  const childRunId = env.NOLO_AGENT_RUN_ID;
  const hasRegistry = typeof childRunId === "string" && childRunId.length > 0;
  const processExit = deps.processExit ?? ((code: number) => process.exit(code));
  const stallTimeoutMs = resolvePositiveMs(
    deps.stallTimeoutMs ?? env.NOLO_LOCAL_RUN_STALL_TIMEOUT_MS,
    5 * 60_000,
  );
  const stallEnvExplicitlySet =
    typeof env.NOLO_LOCAL_RUN_STALL_TIMEOUT_MS === "string" &&
    env.NOLO_LOCAL_RUN_STALL_TIMEOUT_MS.trim().length > 0;
  const armStallWatchdog = hasRegistry || stallEnvExplicitlySet;
  const armTimeoutWatchdog = typeof parsed.timeoutMs === "number" && parsed.timeoutMs > 0;
  let timedOut = false;
  let stalled = false;
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  let stallTimer: ReturnType<typeof setInterval> | undefined;
  // Safe without a registry record too: createRunActivityTracker's writes are
  // a no-op when readRunRecord(runId) finds nothing (foreground runs have no
  // registry record), so a synthetic id is fine — it only ever governs the
  // in-memory getActivity() the stall check below reads.
  const activityTracker = armStallWatchdog
    ? createRunActivityTracker(childRunId ?? "__foreground__", {
        env,
        homedir: deps.homedir,
        fs: deps.fs,
        now: deps.now,
      })
    : undefined;
  const clearWatchdogs = () => {
    if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
    if (stallTimer !== undefined) clearInterval(stallTimer);
    activityTracker?.flush();
    activityTracker?.dispose();
  };
  // Watchdog failures also reject this deferred so the command promise settles
  // even when process.exit is stubbed (tests). In production process.exit
  // terminates first and the rejection is moot.
  let rejectOnWatchdogFailure: ((error: Error) => void) | undefined;
  const watchdogFailure: Promise<never> | undefined =
    armStallWatchdog || armTimeoutWatchdog
      ? new Promise<never>((_, reject) => {
          rejectOnWatchdogFailure = reject;
        })
      : undefined;
  const raceWithWatchdog = <T>(work: Promise<T>): Promise<T> =>
    watchdogFailure ? Promise.race([work, watchdogFailure]) : work;
  const exitFromWatchdog = (code: number) => {
    try {
      processExit(code);
    } catch {
      // Test stubs may throw instead of exiting; the watchdogFailure rejection
      // already carries the outcome, so swallow it here (a real process.exit
      // never returns).
    }
  };
  // Foreground runs have no registry record to finalize (no childRunId); the
  // watchdog can still write a truthful process exit code, it just skips the
  // finalizeRunRecord call in that case.
  const finalizeWatchdogOutcome = (
    outcome: RunOutcome,
    note: string,
  ) => {
    if (!hasRegistry) return;
    (deps.finalizeRunRecord ?? finalizeRunRecord)(
      childRunId as string,
      { status: outcome.status, exitCode: outcome.exitCode, note },
      { env, homedir: deps.homedir, fs: deps.fs, now: deps.now },
    );
  };
  if (armStallWatchdog) {
    stallTimer = setInterval(() => {
      if (timedOut || stalled) return;
      const activity = activityTracker?.getActivity();
      const lastEventAtMs = activity
        ? new Date(activity.lastEventAt).getTime()
        : nowMs();
      const elapsedSinceEvent = nowMs() - lastEventAtMs;
      // Long-running tools (e.g. compilation) are allowed to exceed the stall
      // timeout; only declare a stall when nothing is in flight.
      if (activity?.inFlight?.kind === "tool") {
        return;
      }
      // An LLM request that hangs without completing is the stall scenario we
      // want to catch, even though it is technically "in flight".
      if (activity?.inFlight?.kind === "llm" && elapsedSinceEvent < stallTimeoutMs) {
        return;
      }
      if (elapsedSinceEvent >= stallTimeoutMs) {
        stalled = true;
        clearWatchdogs();
        const note = `stalled: no progress for ${stallTimeoutMs}ms`;
        output.write(`[nolo] local run ${note}\n`);
        const outcome = resolveRunOutcome({ kind: "stall" });
        finalizeWatchdogOutcome(outcome, note);
        rejectOnWatchdogFailure?.(new Error(`[nolo] local run ${note}`));
        exitFromWatchdog(outcome.exitCode);
      }
    }, Math.min(stallTimeoutMs, 10_000));
  }
  if (armTimeoutWatchdog) {
    timeoutTimer = setTimeout(() => {
      timedOut = true;
      clearWatchdogs();
      const note = `timed out after ${parsed.timeoutMs}ms`;
      output.write(`[nolo] local run ${note}\n`);
      const outcome = resolveRunOutcome({ kind: "timeout" });
      finalizeWatchdogOutcome(outcome, note);
      rejectOnWatchdogFailure?.(new Error(`[nolo] local run ${note}`));
      exitFromWatchdog(outcome.exitCode);
    }, parsed.timeoutMs);
  }

  // Support providing fallback suggestions for the orchestrating agent to decide.
  // No automatic switching here: the agent (via its prompt) decides if/which next to use
  // based on task, results, agent strengths, etc. This gives full control to the agent
  // for "下一个 下下个" sequencing.
  const wantsFallbackSuggestions = parsed.fallbackAgentKeys && parsed.fallbackAgentKeys.length > 0;
  const rawAgentInput = resolveRawAgentInput(args, deps.commandPath) ?? parsed.agentKey;
  const fullstackLocal = isFullstackCodingAgentRef(rawAgentInput, parsed.agentKey);
  const explicitLocalCli = isLocalCliAgentKey(parsed.agentKey);
  const isLocalRun = parsed.runtimeMode === "local" || (!parsed.runtimeMode && (fullstackLocal || explicitLocalCli || args.includes("--dangerously-allow-shell")));

  if (wantsFallbackSuggestions && !isLocalRun) {
    output.write("[nolo] --fallback-agent (suggestions) is only supported for local CLI runs (use --local)\n");
    return 1;
  }

  // If fallbacks suggested, augment the message so the agent sees the options and is instructed to decide.
  let effectiveMessage = parsed.message;
  if (wantsFallbackSuggestions) {
    effectiveMessage = `${parsed.message}\n\n[Quota fallback context for agent decision: If this execution for ${parsed.agentKey} hits subscription quota, YOU (the agent) must decide the next agent to use. Do not rely on automatic wrapper. Reason based on the specific task (complexity, length, domain), agent strengths, cost, previous attempt results. Suggested alternatives: ${parsed.fallbackAgentKeys!.join(', ')}. Update the task row with attempt history and dispatch the chosen next (via startAgentRun 异步派发)).]`;
  }

  // Resolve handle/name -> agent key for any run that may reach the server
  // (default/auto/server). Only an explicit local CLI run skips this, since the
  // local adapter resolves its own way. Without this, a bare handle like
  // "agy-pro" is sent to the server verbatim and 404s.
  const resolvedAgentKey =
    parsed.runtimeMode !== "local"
      ? await (deps.resolveAgentRunAgentKey ?? resolveAgentRunAgentKey)({
          agentInput: resolveRawAgentInput(args, deps.commandPath) ?? parsed.agentKey,
          cliArgs: args,
          env,
          output,
        }).catch(() => undefined)
      : undefined;
  const agentKey = resolvedAgentKey ?? parsed.agentKey;
  // quick-chat 式自动路由（仅 chat 入口，需显式开启：--auto-route 或
  // NOLO_AUTO_ROUTE=1；默认保持「无 --agent = 免登录 local codex」契约）。
  // 仅在新对话首轮分类（--continue 续跑不分类，与 web「建对话前分类一次」对齐）。
  // 显式 --agent 作为「模型层覆盖」源：分类照跑，
  // 仅用所选 agent 的 model 层替换档位 agent 的 model 层。
  let effectiveAgentKey = agentKey;
  let modelOverride: ModelLayerOverride | null = null;
  const autoRouteRequested =
    deps.commandPath?.join(" ") === "chat" &&
    !parsed.continueDialogId &&
    (args.includes("--auto-route") || env.NOLO_AUTO_ROUTE === "1") &&
    env.NOLO_AUTO_ROUTE !== "0";
  if (autoRouteRequested) {
    const hasExplicitAgent = Boolean(readFlagValue(args, "--agent"));
    if (hasExplicitAgent) {
      // 只有读「覆盖源 agent」才需要凭证；无 --agent 时不必解析。
      modelOverride = buildModelLayerOverride(
        await readDbRecord({
          dbKey: agentKey,
          authToken: resolveAuthToken(args, env),
          serverUrl: resolveServerUrl(env),
          fetchImpl: fetch,
        }).catch(() => null),
      );
    }
    if (hasExplicitAgent && !modelOverride) {
      output.write(
        "[nolo] auto-route: 覆盖源 agent 读取失败，按原样直跑所选 agent。\n",
      );
    } else {
      effectiveAgentKey = CLI_AUTO_ROUTE_AGENT_KEY;
      // 自动路由只剩默认档一个目标，不再打印档位提示；显式 --agent 的 model
      // 层覆盖仍值得提示（否则用户会疑惑跑的模型为何不是所选 agent 的）。
      if (modelOverride) {
        output.write(`[nolo] auto-route: model 层覆盖为 ${agentKey}\n`);
      }
    }
  }
  let workflowReference: ResolvedWorkflowReference | undefined;
  if (parsed.workflowRef) {
    try {
      workflowReference = await (deps.resolveWorkflowReference ?? resolveWorkflowReference)(
        parsed.workflowRef
      );
    } catch (error) {
      output.write(`[nolo] ${toErrorMessage(error)}\n`);
      return 1;
    }
  }

  let skillReferences: ResolvedSkillReference[] | undefined;
  let skillAllowedToolOverride: string[] | undefined;
  if (parsed.skillRefs?.length) {
    const skills: ResolvedSkillReference[] = [];
    const authToken = resolveAuthToken(args, env);
    const serverUrl = resolveServerUrl(env);
    for (const ref of parsed.skillRefs) {
      try {
        const resolved = await resolveSkillReference(ref, {
          cwd: parsed.cwd,
          readDbRecord: async (dbKey: string) => {
            return readDbRecord({
              dbKey,
              authToken,
              serverUrl,
              fetchImpl: fetch,
            });
          },
        });
        skills.push(resolved);
      } catch (error) {
        output.write(`[nolo] ${toErrorMessage(error)}\n`);
        return 1;
      }
    }
    skillReferences = skills;
    // P3: intersect allowed-tools from all skills with any CLI --allowed-tool
    const skillToolLists = skills
      .map((s) => s.allowedTools)
      .filter((t): t is string[] => !!t && t.length > 0);
    if (skillToolLists.length > 0) {
      const skillAllowed = skillToolLists.reduce((acc, tools) =>
        acc.filter((t) => tools.includes(t))
      );
      if (skillAllowed.length === 0) {
        output.write(`[nolo] warning: attached skills declare incompatible allowed-tools; no tool restriction enforced\n`);
      }
      // Intersect with user-provided --allowed-tool (if any), else use skill set
      skillAllowedToolOverride = parsed.allowedToolNames?.length
        ? parsed.allowedToolNames.filter((t) => skillAllowed.includes(t))
        : skillAllowed;
    }
  }
  let localRuntimeCwd = parsed.cwd;
  if (!localRuntimeCwd && parsed.runtimeMode === "local") {
    localRuntimeCwd = process.cwd();
  }
  const runEnv = buildLocalRunEnv({
    env,
    allowShell: parsed.allowShell,
  });

  // Local background runs: detach a child process, write a registry record,
  // and return immediately. The child re-invokes this same CLI without --bg
  // and finalizes the registry record on exit.
  if (parsed.background && isLocalRun) {
    const { runId, pid, logPath } = await (deps.spawnLocalBackgroundRun ?? spawnLocalBackgroundRun)(
      {
        rawArgs: args,
        commandPath: deps.commandPath,
        cliEntrypointPath: deps.cliEntrypointPath,
        agentKey,
        cwd: localRuntimeCwd,
        msgFile: readFlagValue(args, "--msg-file"),
        message: parsed.message,
        timeoutMs: parsed.timeoutMs,
        ...(parsed.dodCommands?.length ? { dodCommands: parsed.dodCommands } : {}),
        output,
      },
      {
        env,
        homedir: deps.homedir,
        spawn: deps.spawn,
        fs: deps.fs,
        now: deps.now,
        generateRunId: deps.generateRunId,
      }
    );
    output.write(`[nolo] runId=${runId}\n`);
    output.write(`[nolo] pid=${pid ?? "-"}\n`);
    output.write(`[nolo] log=${logPath}\n`);
    output.write(`[nolo] status: nolo agent status ${runId}\n`);
    output.write(`[nolo] stop: nolo agent stop ${runId}\n`);
    return 0;
  }

  // Build cache-friendly context blocks: AGENTS.md (session-scope) + skill
  // content (turn-scope). Placed in the system message via contextBlockScopes
 // instead of prepending to the user message, preserving LLM prefix-cache.
  const cliCwd = parsed.cwd ?? process.cwd();
  // Agent-run isolation: a dispatched subtask (NOLO_AGENT_RUN_CHILD=1, set by
  // agentRunControl.spawnLocalBackgroundRun) gets ZERO project context — no
  // AGENTS.md, no skill-discovery, no skill content, no memory-overlay, no
  // memory-use-guidance. Its context comes entirely from the caller's task/input
  // payload. Interactive foreground `nolo agent run` keeps the full stack.
  // See packages/agent-runtime/agentRunIsolation.ts for the runKind contract.
  const isSubtask = isSubtaskRun(env);
  // Layers stamp their own cacheScope; plain skill-content blocks stay turn-scope.
  // `extraContextBlocks` below is derived from both, purely for the legacy
  // string-block fallback still accepted by the runner.
  const scopedLayers: Array<TurnContextLayer | null> = [];
  const skillContentBlocks: string[] = [];
  const extraContextBlocks: string[] = [];
  const contextBlockScopes: ContextBlockScope[] = [];
  let memoryPromptBlock: string | null = null;
  let memoryOverlayLayer: ReturnType<typeof buildMemoryOverlayLayer> = null;
  let memoryUseGuidanceLayer: ReturnType<typeof buildMemoryUseGuidanceLayer> = null;
  if (!isSubtask) {
  // AGENTS.md project instructions（共享实现：agent-runtime/agentsMd，
  // 含 8KB 截断与 CLAUDE.md 回退，三 host 同源）
  const agentsMdLayer = readAgentsMdLayerFromDisk(cliCwd);
  if (agentsMdLayer) scopedLayers.push(agentsMdLayer);
  // Skill content blocks
  skillContentBlocks.push(...buildSkillContextBlocks(skillReferences));

  // Skill discovery: scan conventional skill dir (.agents/skills)
  // for SKILL.md files and inject an index layer so the model knows what skills
  // are available and can readFile them on-demand. Without this, skills like
  // nolo-commit/nolo-cli are invisible to CLI agents even though their SKILL.md
  // files exist in the workspace.
  scopedLayers.push(buildSkillDiscoveryContextLayer(cliCwd));

  // T3456 — Memory injection route (CLI analogue of desktop T14).
  // Remote-first recall with local fallback. See memoryRecall.ts for details.
  if (!deps.memoryRecallDisabled) {
    try {
      memoryPromptBlock = await resolveCliMemory({
        serverUrl: resolveServerUrl(env),
        authToken: resolveAuthToken(args, env),
        agentKey: effectiveAgentKey,
        userInput: effectiveMessage,
        ...(parsed.spaceId ? { spaceId: parsed.spaceId } : {}),
        env,
      });
    } catch (memoryError) {
      console.warn("[cli-memory] memory recall failed, omitting memory layer:", memoryError);
    }
  }

  memoryOverlayLayer = buildMemoryOverlayLayer({ promptBlock: memoryPromptBlock });
  memoryUseGuidanceLayer = buildMemoryUseGuidanceLayer({ promptBlock: memoryPromptBlock });

  // T3456 — Assemble contextBlockScopes. Every builder stamps its own
  // cacheScope, so nothing here has to infer scope from a block's marker text:
  //   session — AGENTS.md, skill discovery index, memory-use-guidance
  //   turn    — attached skill content, memory-overlay
  // partitionScopedBlocks then orders session ahead of turn so the cacheable
  // prefix stays contiguous.
  contextBlockScopes.push(
    ...partitionScopedBlocks([
      ...renderTurnContextBlocksWithScope([
        ...scopedLayers,
        memoryUseGuidanceLayer,
      ]),
      ...skillContentBlocks
        .map((content) => content.trim())
        .filter((content) => content.length > 0)
        .map((content) => ({ content, cacheScope: "turn" as const })),
      ...renderTurnContextBlocksWithScope([memoryOverlayLayer]),
    ]),
  );
  // Legacy string-block fallback for runners that don't take scoped blocks.
  // Derived from the scoped list so the two can never disagree.
  extraContextBlocks.push(...contextBlockScopes.map((block) => block.content));
  } // end if (!isSubtask) — subtask keeps extraContextBlocks/contextBlockScopes empty

  // Build the runner options once; the same options (message, cwd,
  // subjectRefs, runtime mode, etc.) are reused for any quota fallback retry
  // and subsequent queued turn drains so turns execute against an identical request surface.
  const formatTurnMessage = (msg: string) =>
    prependWorkflowReferencePrompt(
      prependSubjectDialogMarker(
        prependFeatureWorktreeInstruction(
          prependOutputFormatGuidance(msg),
          parsed.injectFeatureWorktreeInstruction
        ),
        parsed.subjectDialogKey
      ),
      workflowReference
    );

  const buildRunOptions = (
    targetAgentKey: string,
    turnMessage: string = effectiveMessage
  ): RunAgentTurnOptions => ({
    agentName: targetAgentKey,
    agentKey: targetAgentKey,
    serverUrl: resolveServerUrl(env),
    message: formatTurnMessage(turnMessage),
    imageUrls: parsed.imageUrls.map(normalizeCliImageInput),
    scriptDir: deps.scriptDir,
    env: runEnv,
    output,
    ...(deps.localRuntimeAdapterFactory
      ? { localRuntimeAdapterFactory: deps.localRuntimeAdapterFactory }
      : {}),
    ...(localRuntimeCwd ? { localRuntimeCwd } : {}),
    ...(parsed.runtimeMode ? { runtimeMode: parsed.runtimeMode } : {}),
    ...(parsed.continueDialogId ? { continueDialogId: parsed.continueDialogId } : {}),
    ...(parsed.spaceId ? { spaceId: parsed.spaceId } : {}),
    ...(parsed.category ? { category: parsed.category } : {}),
    ...(parsed.inheritedFromDialogKey ? { inheritedFromDialogKey: parsed.inheritedFromDialogKey } : {}),
    ...(parsed.parentDialogId ? { parentDialogId: parsed.parentDialogId } : {}),
    ...(parsed.parentWakeOnTerminal ? { parentWakeOnTerminal: true } : {}),
    ...(parsed.subjectDialogKey ? { subjectDialogKey: parsed.subjectDialogKey } : {}),
    ...(parsed.subjectRefs?.length ? { subjectRefs: parsed.subjectRefs } : {}),
    ...(parsed.allowedChildAgentKeys?.length ? { allowedChildAgentKeys: parsed.allowedChildAgentKeys } : {}),
    ...(skillAllowedToolOverride !== undefined
      ? { allowedToolNames: skillAllowedToolOverride }
      : parsed.allowedToolNames?.length
        ? { allowedToolNames: parsed.allowedToolNames }
        : {}),
    ...(parsed.blockedToolNames?.length ? { blockedToolNames: parsed.blockedToolNames } : {}),
    ...(activityTracker ? { onLoopEvent: activityTracker.onLoopEvent } : {}),
    background: parsed.background,
    noStream: parsed.noStream,
    ephemeral: parsed.ephemeral,
    ...(typeof parsed.timeoutMs === "number" ? { timeoutMs: parsed.timeoutMs } : {}),
    traceTools: parsed.traceTools,
    ...(parsed.eventsMode ? { eventsMode: parsed.eventsMode } : {}),
    ...(parsed.taskEvidence ? { taskEvidence: parsed.taskEvidence } : {}),
    ...(contextBlockScopes.length > 0
      ? { contextBlockScopes }
      : extraContextBlocks.length > 0
        ? { extraContextBlocks }
        : {}),
  });

  let result: RunAgentTurnResult = await raceWithWatchdog(
    runner({
      ...buildRunOptions(effectiveAgentKey),
      ...(modelOverride ? { modelOverride } : {}),
    }),
  );
  clearWatchdogs();
  // run 级积分累计：quota fallback 与队列 drain 都会整体替换 result，只看
  // 最终 result.turnCredits 会少记前面各轮。turnCredits undefined = 该轮无
  // 平台计费（自有 API），跳过不造 0。
  let runCreditsTotal: number | undefined = result.turnCredits;

  // Quota auto-fallback: when a run fails because the provider reports a
  // quota/limit (HTTP 429 or CliProviderQuotaError, or an error message that
  // mentions quota/额度/上限), and the command line supplied --fallback-agent,
  // retry the SAME request exactly once with the first fallback agent. This
  // is a run-level switch only; it does not touch server-side scheduling.
  if (result.exitCode !== 0 && isQuotaExhaustedError(result.localError) && isLocalRun && parsed.fallbackAgentKeys && parsed.fallbackAgentKeys.length > 0) {
    const fallbackAgentKey = parsed.fallbackAgentKeys[0];
    output.write(
      `[nolo] quota exhausted on ${agentKey}, falling back to ${fallbackAgentKey}\n`
    );
    // First failure may already have saveTurn()'d a dialog — continue THAT
    // dialog so the fallback retry stays in one conversation instead of
    // forking a second dialog and looking like amnesia.
    const fallbackResult: RunAgentTurnResult = await raceWithWatchdog(
      runner({
        ...buildRunOptions(fallbackAgentKey),
        ...(result.dialogId ? { continueDialogId: result.dialogId } : {}),
      }),
    );
    clearWatchdogs();
    if (fallbackResult.exitCode === 0) {
      result = fallbackResult;
    }
    // fallback 轮的平台积分同样进 run 级累计（成功/失败都可能已扣费）。
    if (fallbackResult.turnCredits !== undefined) {
      runCreditsTotal = (runCreditsTotal ?? 0) + fallbackResult.turnCredits;
    }
    if (fallbackResult.exitCode !== 0) {
      // Fallback also failed: report the fallback failure normally and keep
      // the fallback's error for downstream surfacing. Prefer whichever
      // dialogId we have so the caller can still --continue.
      result = {
        ...fallbackResult,
        ...(fallbackResult.dialogId || result.dialogId
          ? { dialogId: fallbackResult.dialogId ?? result.dialogId }
          : {}),
      };
      output.write(
        `[nolo] fallback to ${fallbackAgentKey} also failed: ${
          fallbackResult.localError instanceof Error
            ? fallbackResult.localError.message
            : String(fallbackResult.localError ?? "unknown error")
        }\n`
      );
    }
  } else if (result.localError instanceof CliProviderQuotaError) {
    // Surface quota error clearly when no automatic fallback is available
    // (no --fallback-agent given, or run was not local). The agent still gets
    // the prompt-level suggestions for self-dispatch.
    output.write(`\n[nolo] Quota limit hit for ${parsed.agentKey} (CliProviderQuotaError).\n`);
    if (parsed.fallbackAgentKeys && parsed.fallbackAgentKeys.length > 0) {
      output.write(`Suggested alternatives for your decision: ${parsed.fallbackAgentKeys.join(', ')}\n`);
    }
    output.write(`As the orchestrating agent, decide next based on task and re-dispatch (update task state with this attempt).\n`);
  }

  // ── Queue drain loop (运行中入队消费：通过 --queue-file 接收队列文件) ─────
  const queueFilePath = parsed.queueFile ?? (childRunId ? resolveRunQueuePath(childRunId, env, deps.homedir) : undefined);
  const queueFs = deps.fs ?? nodeFs;
  if (queueFilePath && queueFs.existsSync(queueFilePath) && result.dialogId && result.exitCode === 0) {
    const MAX_DRAIN_TURNS = 200;
    let drainTurns = 0;
    const popSingle = deps.popSingleQueueMessage ?? popSingleQueueMessage;

    while (drainTurns < MAX_DRAIN_TURNS && queueFs.existsSync(queueFilePath)) {
      const nextEntry = await popSingle(queueFilePath, deps);
      if (!nextEntry) {
        break;
      }
      drainTurns += 1;
      try {
        const turnResult: RunAgentTurnResult = await raceWithWatchdog(
          runner({
            ...buildRunOptions(effectiveAgentKey, nextEntry.text),
            continueDialogId: result.dialogId,
            ...(modelOverride ? { modelOverride } : {}),
          })
        );
        clearWatchdogs();
        result = turnResult;
        // drain 轮积分进 run 级累计（result 被整体替换，不累计就丢）。
        if (turnResult.turnCredits !== undefined) {
          runCreditsTotal = (runCreditsTotal ?? 0) + turnResult.turnCredits;
        }
        if (result.exitCode !== 0) {
          break;
        }
      } catch (drainError) {
        clearWatchdogs();
        console.error(`[nolo] queue turn failed with exception: ${toErrorMessage(drainError)}`);
        result = {
          ...result,
          exitCode: 1,
          localError: drainError,
        };
        break;
      }
    }
    if (drainTurns >= MAX_DRAIN_TURNS) {
      console.error(
        `[nolo] Warning: queue drain loop reached defensive limit of ${MAX_DRAIN_TURNS} turns, stopping.`
      );
    }
  }

  if (result.dialogId) {
    if (parsed.background) {
      output.write(`\n[nolo] background dialog ${result.dialogId}\n`);
      output.write(`[nolo] read: nolo dialog read ${result.dialogId}\n`);
    } else {
      output.write(`\n[nolo] dialog ${result.dialogId}\n`);
    }
  }
  if (shouldPrintLocalRunSummary({ parsed, localRuntimeCwd })) {
    try {
      const inspect = deps.inspectLocalRunWorkspace ?? inspectLocalRunWorkspace;
      const inspection = await inspect(localRuntimeCwd!);
      output.write(formatLocalRunSummary({
        dialogId: result.dialogId,
        inspection,
      }));
    } catch (error) {
      output.write(
        `\n[nolo] local run summary unavailable: ${toErrorMessage(error)}\n`
      );
    }
  }

  // If this process was spawned as a local background child, finalize the
  // registry record so the parent `nolo agent ps/status` sees the outcome.
  if (typeof childRunId === "string" && childRunId.length > 0) {
    const childRecordForDoD = (deps.readRunRecord ?? readRunRecord)(childRunId, {
      env,
      homedir: deps.homedir,
      fs: deps.fs,
    });
    // 空 assistant 兜底（不抛错、exitCode 仍 0）：截断型（length/stream）
    // 与死循环/空转熔断型（repetition_loop/stagnant_tool_calls）
    // 说明编排者拿不到完整结论，须结算为 failed 以便父级接力重派；
    // 普通空回复（empty_completion）不算故障，仍按 exitCode 判定。
    // saveTurn 已保留对话内容（见 localLoop），failed 结算不删改对话。
    // emptyAssistantOutputUsable：localLoop 的 ok_with_warning 分支——本轮有
    // 完整可见正文，只是缺 finish_reason 收尾帧（部分上游从不发该帧）。它与
    // 真正没拿到输出的 fallback 共用 reason="stream_truncated"，若只看 reason
    // 就会把正常完成的轮次判成 failed：实测 review 子任务完整输出结论并给出
    // Verdict 后仍被结算为 failed/exitCode=1，导致「run 是否成功」对 CI 与
    // 自动化闸门失去意义（本仓 pre-push 有 review 证据闸门）。
    // 正文可用时不算故障——编排者拿得到结论，无需重派。
    const isStalledOrTruncated = isRunResultStalledOrTruncated(result);
    // 正文可用的告警轮次不结算为 failed，但仍留 note 保持可观测
    // （上游缺收尾帧是真实现象，只是不构成故障）。
    const truncationNote = resolveRunSettlementNote(result);
    const outcome = resolveRunOutcome({
      kind: "result",
      exitCode: result.exitCode,
      isStalledOrTruncated,
    });
    // DoD 验收在结算之前跑，结果与终态同一次写入。
    //
    // 顺序是有意的：先结算再验收会让唤醒通道抢在结论之前把「done」送到编排者
    // 手上，而「进程退出码 0」不等于「活干对了」——nolo-plan 的原话是「无数字
    // 的『测试通过』按未验证处理」。终态因此晚出现几秒，换的是它出现时带着结论。
    //
    // 声明了才跑：没有 dodCommands 的 run 一条命令都不会被执行。
    let dodResults: DoDCommandResult[] | undefined;
    try {
      dodResults = (deps.runDoDCommands ?? runDoDCommands)(
        childRecordForDoD?.dodCommands,
        childRecordForDoD?.cwd,
      );
    } catch (dodError) {
      console.warn(`[nolo] DoD verification failed to run for ${childRunId}:`, dodError);
    }

    await (deps.finalizeRunRecord ?? finalizeRunRecord)(childRunId, {
      status: outcome.status,
      exitCode: outcome.exitCode,
      dialogId: result.dialogId,
      ...(dodResults ? { dodResults } : {}),
      // run 级累计的平台积分（主轮 + fallback + drain 轮）：dock 行据此显示
      // 「⚡ x.xx」，让派发任务的消耗可见。undefined = 全程无平台计费。
      ...(runCreditsTotal !== undefined ? { credits: runCreditsTotal } : {}),
      ...truncationNote,
    },
    {
      env,
      homedir: deps.homedir,
      fs: deps.fs,
      now: deps.now,
    });

  }

  return result.exitCode;
}

const BALANCE_ERROR_PATTERNS: ReadonlyArray<RegExp> = [
  /UPSTREAM_402/i,
  /Insufficient Balance/i,
  /insufficient\s+balance/i,
  /余额不足/,
];

/** Balance/402 — distinct from quota/429; UX should say "top up", not "switch agent". */
export function isBalanceExhaustedError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String((error as { message?: unknown })?.message ?? "");
  return BALANCE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

// ── Quota 识别已下沉共享层（packages/ai/tools/agent/quotaCircuitBreaker）──
// import 供本文件内部调用（fallback 判定）；export 保持既有调用方
// （tui/readlineWorkspace、本文件测试）的 import 路径不变。
// 不再保留第二份 QUOTA_ERROR_PATTERNS / isQuotaExhaustedError。
import { isQuotaExhaustedError, QUOTA_ERROR_PATTERNS } from "ai/tools/agent/quotaCircuitBreaker";
export { isQuotaExhaustedError, QUOTA_ERROR_PATTERNS };

export type { RunAgentTurnOptions, RunAgentTurnResult };
