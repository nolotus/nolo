import { createShellApprovalChild } from "./client/originShellApprovalTransport";
// Orchestration entry for `nolo agent run` and the related run/chat
// shorthands. Pure CLI arg parsing lives in `./agentRunArgs`; prompt
// construction helpers live in `./agentRunPrompts`; local workspace
// inspection helpers live in `./agentRunLocalWorkspace`. This file keeps
// the dependency-injected orchestration and re-exports the public surface
// for back-compat with existing callers.

import {
  writeInstaboxRunConfig,
} from "./client/instaboxRunConfigWrite";
import {
  runAgentTurn,
  MACHINE_SHELL_LOCAL_REFUSAL_MESSAGE,
  type RunAgentTurnOptions,
  type RunAgentTurnResult,
} from "./client/agentRun";
import { createOneShotTerminalStatus } from "./client/oneShotTerminalStatus";
import {
  FAILED_EMPTY_ASSISTANT_REASONS,
  isRunResultStalledOrTruncated,
} from "./client/terminalRunStatus";
import * as nodeFs from "node:fs";
import { CLI_AUTO_ROUTE_AGENT_KEY } from "./client/autoModelRouter";
import { t } from "./tui/i18n";
import {
  buildModelLayerOverride,
  type ModelLayerOverride,
} from "../agent-runtime/modelLayerOverride";
import type { ContextBlockScope } from "../agent-runtime/contextBlockScope";
import { buildSkillDiscoveryContextLayer } from "../agent-runtime/skillDiscovery";
import { buildHostEnvironmentLayer } from "../agent-runtime/hostEnvironment";
import { readAgentsMdLayerFromDisk } from "../agent-runtime/agentsMd";
import { CliProviderQuotaError } from "ai/agent/cliExecutor";
import type { AgentRuntimeHostAdapter } from "./agentRuntimeLocal";
import { resolveAgentRecordFromHybridStore, readDbRecord } from "./agentRecordHelpers";
import { resolveBoundMachineId } from "./client/agentRunTypes";
import { normalizeRuntimeToolPolicyOverride, resolveEffectiveRuntimeToolPolicy } from "../agent-runtime/runtimeToolPolicy";
import { resolveAuthToken } from "./cliEnvHelpers";
import { getReadableCliDb } from "./agentCommandSupport";
import { toErrorMessage } from "core/errorMessage";
import { asOptionalTrimmedString } from "core/optionalString";
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
  settleRunTerminalAuthoritatively,
  transitionRunToTerminal,
  popQueueMessages,
  popSingleQueueMessage,
  readRunRecord,
  resolveRunQueuePath,
  spawnLocalBackgroundRun,
  type AgentRunControlDeps,
  type RunFailureReason,
} from "./agentRunControl";
import { getRunResultHeaderMeta } from "./agentRunResultFile";
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
  /**
   * Optional error stream for non-interactive runs (batch 3). When present,
   * deadline / actionable failure lines are routed here instead of stdout.
   * Mirrors `OutputLike.writeErr` in client/agentRunTypes.
   */
  writeErr?(chunk: string): unknown;
  /** 真实 TTY 输出才会收到 OSC 7501 状态上报（严格 === true）。 */
  isTTY?: boolean;
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
  /**
   * `--machine-shell` 的绑定机器解析。默认读 agent 记录（runtimeBinding.machineId）；
   * 测试注入桩以避开 LevelDB/网络。
   */
  resolveAgentBoundMachineId?: (args: {
    agentKey: string;
    cliArgs: string[];
    env: EnvLike;
    output: OutputLike;
  }) => Promise<string | undefined>;
  spawnLocalBackgroundRun?: typeof spawnLocalBackgroundRun;
  transitionRunToTerminal?: typeof transitionRunToTerminal;
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
} & Pick<AgentRunControlDeps, "homedir" | "spawn" | "fs" | "now" | "sleep" | "generateRunId" | "shellApprovalHost">;

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
// 停滞/截断的判定与原因集合在 client/terminalRunStatus.ts（唯一真值：后台结算
// 与 TUI 的 OSC 7501 终态共用同一份判定）。这里按原路径 re-export 同名符号，
// 既有消费者（含测试）的 import 不用改；本文件只留 note 的构造。
export { FAILED_EMPTY_ASSISTANT_REASONS, isRunResultStalledOrTruncated };

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

/** `--machine-shell` 申请的 runtime tool policy（白名单会把它裁到只剩 execShell）。 */
const MACHINE_SHELL_REQUESTED_POLICY = { runtimeTools: ["execShell"] };

/**
 * `--machine-shell` 的默认绑定机器解析：读 agent 记录取 runtimeBinding.machineId。
 * 找不到记录 / 未绑定都返回 undefined，由调用方给出可操作报错（绝不静默降级成本机执行）。
 */
async function resolveAgentBoundMachineIdFromRecord(args: {
  agentKey: string;
  cliArgs: string[];
  env: EnvLike;
  output: OutputLike;
}): Promise<string | undefined> {
  const db = await getReadableCliDb(args.output);
  const record = await resolveAgentRecordFromHybridStore({
    agentInput: args.agentKey,
    cliArgs: args.cliArgs,
    env: args.env,
    db,
    fetchImpl: fetch,
  }).catch(() => null);
  return resolveBoundMachineId(record) || undefined;
}

export async function runAgentRunCommand(args: string[], deps: AgentRunCommandDeps) {
  const env = deps.env ?? process.env;
  // 非交互一次性运行（无注入 output）：失败行（deadline 等可操作错误）走
  // stderr，stdout 只承载回合输出，管道/脚本可安全解析（batch 3）。
  // 注入 output（TUI / 测试）保持单流行为——runLocalAgentTurnForCli 在
  // writeErr 缺失时回退 output.write。
  const output: OutputLike = deps.output ?? {
    write: (chunk: string) => process.stdout.write(chunk),
    writeErr: (chunk: string) => process.stderr.write(chunk),
  };
  if (args.includes("--help") || args.includes("-h")) {
    writeUsage(output, deps.commandPath);
    return 0;
  }
  let parsed: ParsedAgentRunArgs | null;
  try {
    parsed = parseAgentRunArgs(args, { commandPath: deps.commandPath });
  } catch (error) {
    output.write(`[nolo] ${toErrorMessage(error)}\n`);
    return 1;
  }
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
  // OSC 7501：仅前台、非 events(JSON)、真实 TTY 才上报；后台子进程（有 registry
  // 记录）的输出进日志文件，不是终端。终态 done/error 保留不清除。
  // 写入目标跟着 deps.output 走：注入 output（TUI / 测试）时经它的 write 出去；
  // 没注入时用包装器写 process.stdout，isTTY 也取自 process.stdout（不给 runner
  // 的 output 加字段）。真正的防线是 isTTY 闸门（emitTerminalProgramStatus 内）：
  // 管道 / 日志 / JSON / 后台下 isTTY !== true，一条状态都不写，所以 transcript
  // 与 result file 不会被控制序列污染。
  const terminalStatus = createOneShotTerminalStatus(
    parsed.eventsMode || parsed.background || hasRegistry
      ? null
      : deps.output
        ? deps.output
        : {
            write: (chunk: string) => process.stdout.write(chunk),
            isTTY: process.stdout.isTTY === true,
          },
  );
  const raceWithWatchdog = <T>(work: Promise<T>): Promise<T> => {
    const raced = watchdogFailure ? Promise.race([work, watchdogFailure]) : work;
    // runner 抛错 / watchdog 失败是整体失败；工具级临时失败不会走到这里。
    return raced.catch((error) => {
      terminalStatus.fail();
      throw error;
    });
  };
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
  const finalizeWatchdogOutcome = async (
    outcome: RunOutcome,
    note: string,
    extra?: {
      failureReason?: RunFailureReason;
      toolCallCount?: number;
      lastAssistantText?: string;
    },
  ): Promise<void> => {
    if (!hasRegistry) return;
    // Watchdog settlement carries the child's *real* process exit code
    // (contract: done ⇔ exit 0), so it counts as authoritative settlement,
    // same as the post-exit settlement below. The caller awaits this before
    // exitFromWatchdog: once the process is gone nothing can repair a
    // dropped terminal write, so brief lock contention is retried (bounded)
    // instead of silently leaving the record running → false orphan.
    const currentActivity = activityTracker?.getActivity();
    const rawToolCount =
      extra?.toolCallCount ?? currentActivity?.counters?.toolCalls;
    const toolCallCount =
      typeof rawToolCount === "number" && rawToolCount > 0
        ? rawToolCount
        : undefined;
    await settleRunTerminalAuthoritatively(
      childRunId as string,
      {
        status: outcome.status,
        exitCode: outcome.exitCode,
        note,
        ...(extra?.failureReason ? { failureReason: extra.failureReason } : {}),
        ...(toolCallCount !== undefined ? { toolCallCount } : {}),
        ...(extra?.lastAssistantText ? { lastAssistantText: extra.lastAssistantText } : {}),
      },
      { env, homedir: deps.homedir, fs: deps.fs, now: deps.now, sleep: deps.sleep },
      // Test seam: stubbed transitions keep their single-attempt semantics.
      deps.transitionRunToTerminal,
    );
  };
  if (armStallWatchdog) {
    stallTimer = setInterval(async () => {
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
        terminalStatus.fail();
        const outcome = resolveRunOutcome({ kind: "stall" });
        // The bounded retry must finish before the process exits — after
        // exitFromWatchdog nothing in this process can repair a dropped
        // terminal write.
        const currentActivity = activityTracker?.getActivity();
        await finalizeWatchdogOutcome(outcome, note, {
          failureReason: "stalled",
          toolCallCount: currentActivity?.counters?.toolCalls,
        });
        rejectOnWatchdogFailure?.(new Error(`[nolo] local run ${note}`));
        exitFromWatchdog(outcome.exitCode);
      }
    }, Math.min(stallTimeoutMs, 10_000));
  }
  if (armTimeoutWatchdog) {
    timeoutTimer = setTimeout(async () => {
      timedOut = true;
      clearWatchdogs();
      const note = `timed out after ${parsed.timeoutMs}ms`;
      output.write(`[nolo] local run ${note}\n`);
      terminalStatus.fail();
      const outcome = resolveRunOutcome({ kind: "timeout" });
      await finalizeWatchdogOutcome(outcome, note);
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
  // runtimeKey 指向 docker（docker / docker:<id>）时本机通道可以真正兑现 sbx 云
  // 沙盒：只在本 run 本来就会落在本机执行时把它交给本地通道（见 isLocalRun），
  // 并在那里 fail-closed（无绑定/未授权 → 开跑前显式失败，绝不静默落宿主）。
  const dockerRuntimeLocal =
    typeof parsed.runtimeKey === "string" &&
    /^docker(:.+)?$/.test(parsed.runtimeKey.trim());
  const instaboxRuntimeLocal =
    typeof parsed.runtimeKey === "string" &&
    parsed.runtimeKey.trim() === "instabox";
  // F1：`--runtime-key local` = 「在**本进程所在宿主**上执行」。本机就是那台机器，
  // 所以它必须走本地 runtime（父进程内），**绝不发给服务端**：服务端兑现不了 local
  // （`local_target_unsupported`，见 server/handlers/agentRun/runtimeTarget.ts），
  // 历史上「点名宿主执行 → 服务端 409 → 成果搁浅在 docker 副本」正是这条路。
  const hostRuntimeLocal =
    typeof parsed.runtimeKey === "string" && parsed.runtimeKey.trim() === "local";
  // 安全硬门（RV-F1 HIGH）：直接 CLI 入口也必须显式确认宿主写入。
  // 上层派发工具有 allowHostWrites 守卫，但 `nolo agent run --runtime-key local`
  // 绕过了那层；这里不校验就等于"任意 shell 都能在宿主改文件"。
  if (hostRuntimeLocal && !args.includes("--allow-host-writes")) {
    output.write(
      "[nolo] runtimeKey=local 会在**宿主文件系统**上执行并写入，必须显式加 --allow-host-writes 确认；" +
        "要隔离执行请省略 --runtime-key（默认进 docker 沙盒）。\n",
    );
    return 1;
  }
  const isLocalRun =
    (dockerRuntimeLocal || instaboxRuntimeLocal || hostRuntimeLocal || !parsed.runtimeKey) &&
    (parsed.runtimeMode === "local" ||
      hostRuntimeLocal ||
      (!parsed.runtimeMode && (fullstackLocal || explicitLocalCli || args.includes("--dangerously-allow-shell"))));

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
    parsed.runtimeMode !== "local" && !hostRuntimeLocal
      ? await (deps.resolveAgentRunAgentKey ?? resolveAgentRunAgentKey)({
          agentInput: resolveRawAgentInput(args, deps.commandPath) ?? parsed.agentKey,
          cliArgs: args,
          env,
          output,
        }).catch(() => undefined)
      : undefined;
  const agentKey = resolvedAgentKey ?? parsed.agentKey;
  // `--machine-shell`：显式入口 —— 申请把本 run 派到绑定机器，并在那里执行 shell。
  // 与 `--allowed-tool execShell`（只影响模型可见工具面）不同，本开关把申请作为
  // 请求级字段 runtimeContext.runtimeToolPolicyOverride 上行，服务端白名单取值后
  // 并入 runtime tool policy —— 申请到的是能力，sandbox/审批/审计的实际边界由
  // 绑定机器侧的基线给出，不是 CLI 打印保证。
  // 缺一即显式报错，不做静默降级：
  //   1) 解析成 local（--local / 隐式 local / NOLO_RUNTIME_MODE=local）→ 报错退出，
  //      本开关只能在绑定机器执行；
  //   2) agent 记录必须有 runtimeBinding.machineId；
  //   3) 派发一律锁定 server（runtimeMode: "server" + requireRemoteDispatch），
  //      既不走 auto→local 早退，也不受 NOLO_RUNTIME_MODE=local 覆盖；
  //   4) 派发前回显机器 id、派发路径、申请的 runtimeTools、sandbox/审批策略来源。
  // 申请的是 execShell 一项：机器侧 runtimeWorkspacePermissionPolicy 以
  // runtimeTools 含 execShell 判定 allowShell，lease 只作为白名单允许项保留。
  let machineShellOverride: RunAgentTurnOptions["runtimeToolPolicyOverride"];
  if (parsed.machineShell) {
    // 与 client `resolveRequestedRuntimeMode` 同序：显式 flag 优先于 env。parsed.runtimeMode
    // 已在解析期把 --local 与隐式 local（local CLI agent / fullstack / --dangerously-allow-shell）
    // 都归一成 "local"，这里补上 env 这条路径。
    const envRuntimeMode = env.NOLO_RUNTIME_MODE;
    const requestedRuntimeMode = parsed.runtimeMode
      ? parsed.runtimeMode
      : envRuntimeMode === "local" || envRuntimeMode === "server" || envRuntimeMode === "auto"
        ? envRuntimeMode
        : undefined;
    if (requestedRuntimeMode === "local") {
      output.write(MACHINE_SHELL_LOCAL_REFUSAL_MESSAGE);
      return 1;
    }
    const machineId = await (
      deps.resolveAgentBoundMachineId ?? resolveAgentBoundMachineIdFromRecord
    )({
      agentKey,
      cliArgs: args,
      env,
      output,
    }).catch(() => undefined);
    if (!machineId) {
      output.write(
        `[nolo] --machine-shell requires ${agentKey} to be bound to a machine (runtimeBinding.machineId); none found.\n` +
          `[nolo] bind it with \`nolo agent bind-current ${agentKey}\` on the target computer, then retry.\n`,
      );
      return 1;
    }
    machineShellOverride = normalizeRuntimeToolPolicyOverride(
      MACHINE_SHELL_REQUESTED_POLICY,
    );
    // 用服务端同一函数（host:"web"）读基线取值：回显的 sandbox / 审批 / 网络策略
    // 就是服务端将要叠加的那一份，不另抄常量（不会漂移）。这些值是「服务端在绑定
    // 机器上生效的策略」，不是本机执行的保证 —— 执行位置由 dispatch=server 决定。
    const baselinePolicy = resolveEffectiveRuntimeToolPolicy({
      agentConfig: { runtimeToolPolicy: machineShellOverride },
      host: "web",
    });
    output.write(
      `[nolo] machine-shell: dispatch=server(required) machine=${machineId}` +
        ` runtimeTools=${(machineShellOverride?.runtimeTools ?? []).join(",") || "-"}` +
        ` sandbox=${baselinePolicy?.isolation?.mode ?? "-"}` +
        ` approval=${baselinePolicy?.shell?.commandPolicy ?? "-"}` +
        ` networkPolicy=${baselinePolicy?.shell?.networkPolicy ?? "-"}` +
        ` policySource=web-runtime-safety-baseline\n`,
    );
  }
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
        t("agentRun.autoRouteOverrideFailed"),
      );
    } else {
      effectiveAgentKey = CLI_AUTO_ROUTE_AGENT_KEY;
      // 自动路由只剩默认档一个目标，不再打印档位提示；显式 --agent 的 model
      // 层覆盖仍值得提示（否则用户会疑惑跑的模型为何不是所选 agent 的）。
      if (modelOverride) {
        output.write(t("agentRun.autoRouteModelOverride", agentKey));
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
        output.write(`[nolo] warning: attached skills declare incompatible allowed-tools; this run has no tools\n`);
      }
      // Intersect with user-provided --allowed-tool (if any), else use skill set
      skillAllowedToolOverride = parsed.allowedToolNames?.length
        ? parsed.allowedToolNames.filter((t) => skillAllowed.includes(t))
        : skillAllowed;
    }
  }
  let localRuntimeCwd = parsed.cwd;
  if (!localRuntimeCwd && (parsed.runtimeMode === "local" || hostRuntimeLocal)) {
    localRuntimeCwd = process.cwd();
  }

  if (parsed.runtimeKey === "instabox") {
    try {
      writeInstaboxRunConfig({
        workspaceMode: parsed.instaboxWorkspace!,
        artifactDir: parsed.instaboxArtifactDir!,
        manifestPath: parsed.instaboxManifestPath,
        allowRemoteRelease: parsed.instaboxAllowRemoteRelease,
        allowPaid: parsed.instaboxAllowPaid,
        env,
      });
    } catch (err) {
      output.write(`[nolo] instabox 配置生成失败: ${toErrorMessage(err)}\n`);
      return 1;
    }
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
        shellApprovalHost: deps.shellApprovalHost,
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
  scopedLayers.push(buildHostEnvironmentLayer());

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

  // 后台子 run 的父对话引用：spawn 时只写进本机 run 记录（rawArgs 不含
  // --parent-dialog，那会连带打开 parentWakeOnTerminal，改变唤醒行为），子进程
  // 必须从 run 记录回读，否则子对话 turn 落库时 parentDialogId 丢失。
  // 仅在显式参数缺失时回退，不覆盖调用方给出的值。
  //
  // 副作用（预期行为，勿误判为 bug）：带上 parentDialogId 后，服务端
  // packages/server/handlers/agentRun/saveDialog.ts 的 notificationPolicy
  // （notifyOnDone/notifyOnFailed/channels = !parentDialogId && triggerType !== "localhost"）
  // 会关闭该子对话自身的独立推送通知。这与「子对话由父会话 surfaced、不单独通知」
  // 的既有语义一致：完成/失败信号经父会话呈现，子对话不再单发通知。
  // 回读失败（记录缺失/损坏）时 readRunRecord 返回 null，这里得到 undefined，
  // 即退化为不写父引用，命令本身不受影响。
  const runRecordParentDialogId =
    !parsed.parentDialogId && typeof childRunId === "string" && childRunId.length > 0
      ? asOptionalTrimmedString(
          (deps.readRunRecord ?? readRunRecord)(childRunId, {
            env,
            homedir: deps.homedir,
            fs: deps.fs,
          })?.parentDialogId,
        )
      : undefined;
  const effectiveParentDialogId = parsed.parentDialogId ?? runRecordParentDialogId;

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

  // IPC is inherited only by the bound spawned child; never trust env approval flags.
  const shellApprovalChild = process.connected && typeof process.send === "function"
    ? createShellApprovalChild(process) : undefined;
  try {
  const buildRunOptions = (
    targetAgentKey: string,
    turnMessage: string = effectiveMessage
  ): RunAgentTurnOptions => ({
    ...(shellApprovalChild ? { execShellApproval: targetAgentKey === agentKey
      ? shellApprovalChild.authority
      : { request: async () => { throw new Error("Shell approval agent binding mismatch"); },
          consume: () => { throw new Error("Shell approval agent binding mismatch"); } } } : {}),
    agentName: targetAgentKey,
    agentKey: targetAgentKey,
    // 当前执行链未提供可靠的最终展示能力，按约定使用 unknown（只注入行为段，不猜
    // 宽/窄屏；`stdout.isTTY` 只说明是不是终端，说明不了宽度）。这不表示宿主永远
    // 无法获得尺寸：将来接入时应传展示能力，不应由调用方拼接准则文本。
    // 放在 buildRunOptions 这个唯一构造点上，首轮 / quota fallback / 队列 drain
    // 三处 runner(...) 调用自动一致；远端分支走 server 线，不读该字段。
    responseViewport: "unknown" as const,
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
    // `--machine-shell` 强制锁定 server 派发：绑定校验通过后 runtimeMode 一律为
    // "server"（+ requireRemoteDispatch 在派发层再兜一次），既不给 auto→local 早退
    // 留口子，也不受 NOLO_RUNTIME_MODE=local 覆盖（resolveRequestedRuntimeMode 以
    // options.runtimeMode 优先）。这是在唯一构造 runner 参数的入口做的，quota
    // fallback / 重试等复用 buildRunOptions 的路径同样被锁住。
    // 非 machine-shell 时保留本地通道判定：显式 runtimeMode 优先，其次
    // docker/host 本地目标在本地 run 上回落 runtimeMode=local。
    ...(parsed.machineShell
      ? { runtimeMode: "server" as const, requireRemoteDispatch: true }
      : parsed.runtimeMode
        ? { runtimeMode: parsed.runtimeMode }
        : (dockerRuntimeLocal || instaboxRuntimeLocal || hostRuntimeLocal) && isLocalRun
          ? { runtimeMode: "local" as const }
          : {}),
    // runtimeKey 与 machine-shell 的组合已在 parseAgentRunArgs 入口显式拒绝，
    // 这里直接透传即可（不再静默丢弃参数）。
    ...(parsed.runtimeKey ? { runtimeKey: parsed.runtimeKey } : {}),
    ...(parsed.dockerWorkspaceMode ? { dockerWorkspaceMode: parsed.dockerWorkspaceMode } : {}),
    ...(parsed.continueDialogId ? { continueDialogId: parsed.continueDialogId } : {}),
    ...(parsed.strictContinueHistory ? { strictContinueHistory: true } : {}),
    ...(parsed.spaceId ? { spaceId: parsed.spaceId } : {}),
    ...(parsed.category ? { category: parsed.category } : {}),
    ...(parsed.inheritedFromDialogKey ? { inheritedFromDialogKey: parsed.inheritedFromDialogKey } : {}),
    ...(effectiveParentDialogId ? { parentDialogId: effectiveParentDialogId } : {}),
    ...(parsed.parentWakeOnTerminal ? { parentWakeOnTerminal: true } : {}),
    ...(parsed.subjectDialogKey ? { subjectDialogKey: parsed.subjectDialogKey } : {}),
    ...(parsed.subjectRefs?.length ? { subjectRefs: parsed.subjectRefs } : {}),
    ...(skillAllowedToolOverride !== undefined
      ? { allowedToolNames: skillAllowedToolOverride }
      : parsed.allowedToolNames?.length
        ? { allowedToolNames: parsed.allowedToolNames }
        : {}),
    ...(parsed.blockedToolNames?.length ? { blockedToolNames: parsed.blockedToolNames } : {}),
    ...(machineShellOverride ? { runtimeToolPolicyOverride: machineShellOverride } : {}),
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

  terminalStatus.working();
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

  // 整次 run 的最终结果（quota fallback / queue drain 之后）：只在这里报终态。
  terminalStatus.settle({
    exitCode: result.exitCode,
    streamInterrupted: result.streamInterrupted,
    stalledOrTruncated: isRunResultStalledOrTruncated(result),
  });

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

    let failureReason: RunFailureReason | undefined;
    let toolCallCount: number | undefined;
    if (outcome.status === "failed") {
      if (
        result.emptyAssistantFallbackReason === "repetition_loop" ||
        result.emptyAssistantFallbackReason === "stagnant_tool_calls"
      ) {
        failureReason = "stalled";
      } else if (result.localError && isQuotaExhaustedError(result.localError)) {
        failureReason = "provider_rate_limited";
      } else if (result.localError) {
        const errMsg = toErrorMessage(result.localError).toLowerCase();
        if (errMsg.includes("config_unresolved") || errMsg.includes("unresolved config")) {
          failureReason = "config_unresolved";
        } else {
          failureReason = "provider_error";
        }
      }
      const currentActivity = activityTracker?.getActivity();
      const rawToolCount =
        currentActivity?.counters?.toolCalls ??
        childRecordForDoD?.activity?.counters?.toolCalls;
      if (typeof rawToolCount === "number" && rawToolCount > 0) {
        toolCallCount = rawToolCount;
      }
    }

    // Authoritative child settlement: this process owns the real outcome
    // (exitCode / dialogId / credits / DoD / failure note) and exits right
    // after, so a contended strict lock is retried (bounded) instead of
    // silently dropped. Orphan-correction authority preserved: only
    // orphaned → done/failed may pass; every other terminal stays put.
    await settleRunTerminalAuthoritatively(childRunId, {
      status: outcome.status,
      exitCode: outcome.exitCode,
      dialogId: result.dialogId,
      ...(dodResults ? { dodResults } : {}),
      // run 级累计的平台积分（主轮 + fallback + drain 轮）：dock 行据此显示
      // 「⚡ x.xx」，让派发任务的消耗可见。undefined = 全程无平台计费。
      ...(runCreditsTotal !== undefined ? { credits: runCreditsTotal } : {}),
      ...(failureReason ? { failureReason } : {}),
      ...(toolCallCount !== undefined ? { toolCallCount } : {}),
      ...(result.finalText ? { lastAssistantText: result.finalText } : {}),
      // 仅用于 .result.md 头（front matter）：旁路读取，不改 result 形状。
      ...getRunResultHeaderMeta(result),
      ...truncationNote,
    },
    {
      env,
      homedir: deps.homedir,
      fs: deps.fs,
      now: deps.now,
      sleep: deps.sleep,
    }, deps.transitionRunToTerminal);

  }

  return result.exitCode;
  } finally {
    shellApprovalChild?.close();
    if (shellApprovalChild && process.connected) process.disconnect();
  }
}

// ── 余额/402 识别已下沉共享层（packages/cli/client/balanceErrorPatterns）──
// 词表与 client/agentRun 的 402 分支共用同一份：此前两处各一套，且都只认
// UPSTREAM_402 / Insufficient Balance / 余额不足 / insufficient balance，
// 漏掉 insufficient_balance（下划线）、wallet balance is insufficient、
// coding_plan_exhausted、payment_required。放在 client/ 下是为了避免
// agentRunCommand ↔ agentRun 的循环依赖。
// 不再保留第二份 BALANCE_ERROR_PATTERNS / isBalanceExhaustedError。
export { isBalanceExhaustedError } from "./client/balanceErrorPatterns";

// ── Quota 识别已下沉共享层（packages/ai/tools/agent/quotaCircuitBreaker）──
// import 供本文件内部调用（fallback 判定）；export 保持既有调用方
// （tui/readlineWorkspace、本文件测试）的 import 路径不变。
// 不再保留第二份 QUOTA_ERROR_PATTERNS / isQuotaExhaustedError。
import { isQuotaExhaustedError, QUOTA_ERROR_PATTERNS } from "ai/tools/agent/quotaCircuitBreaker";
export { isQuotaExhaustedError, QUOTA_ERROR_PATTERNS };

export type { RunAgentTurnOptions, RunAgentTurnResult };
