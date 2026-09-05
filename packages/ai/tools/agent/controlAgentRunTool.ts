// packages/ai/tools/agent/controlAgentRunTool.ts
//
// controlAgentRun tool — observe and control background agent runs.
//
// Unix analogy: wait + signal + /proc + write. One tool, five actions:
// - list: list runs → POST /api/agent/runs/control { action: "list" }
// - status: single run + log tail → POST /api/agent/runs/control { action: "status" }
// - stop: cancel a run → POST /api/agent/runs/control { action: "stop" }
// - append: send an instruction to a run (enqueue onto running, continue onto terminal)
//   → POST /api/agent/runs/control { action: "append", dialogKey, userInput, mode }
// - wait: block until the run reaches a terminal state and return its result.
//   The server control plane has no wait endpoint, so wait is implemented
//   client-side: subscribe the dialog SSE stream at /api/events/dialog-<runId>
//   until done/failed (same endpoint runAgentBackground uses), after a quick
//   status pre-check that returns immediately for already-terminal runs.

import { callToolApi, getToolRequestContext } from "../toolApiClient";
import { listenToDialogEvents } from "ai/agent/runAgentBackground";
import { isAbortError } from "core/abortError";
import { toErrorMessage } from "core/errorMessage";
import { formatListRunsCard, formatNotFoundRunCard, formatStatusRunCard, formatStopRunCard, resolveRunLabel } from "./agentRunDisplayHelpers";

/**
 * 可用 action 的全集。`wait` 是唯一一个「观察者阻塞」动作，也是唯一一个能
 * 被环境裁掉的：见 buildControlAgentRunFunctionSchema 的注释。
 */
export const CONTROL_AGENT_RUN_ACTIONS = [
    "list",
    "status",
    "stop",
    "todo",
    "wait",
    "append",
] as const;

export type ControlAgentRunAction = (typeof CONTROL_AGENT_RUN_ACTIONS)[number];

/** 每个 action 在 `action` 参数描述里的那一句（顺序由调用方给的 actions 决定）。 */
const ACTION_DESCRIPTIONS: Record<ControlAgentRunAction, string> = {
    list: "list=列出 run（省略 runId）",
    status: "status=查单条 run 状态 + 可选日志",
    stop: "stop=取消 run",
    append: "append=向任务追加指令（运行中入队，终态 continuation）",
    wait: "wait=终态阻塞等待：订阅该 dialog 的 SSE 事件流等 done/failed，已终态立即返回，不是轮询",
    todo: "todo=列出 runtime todo（由 startAgentRun 的 batchId/trackTodo 产生）",
};

/**
 * wake-enabled 环境的 `status` 句：诊断语义，不是进度 API。running 进度由宿主
 * 观察（registry poller → dock；终态 → wake），status 只回答「是不是卡住了 /
 * 失败详情是什么」，不承担等待完成或常规进度跟踪。
 */
const WAKE_STATUS_ACTION_DESCRIPTION =
    "status=按需诊断单条 run：仅在怀疑卡死、失败后看详情/日志（tailLines>0）、或用户明确询问执行细节时调用；正常运行的进度由宿主观察，禁止连续 status 查询等待完成";

/**
 * 按环境裁剪后的 controlAgentRun schema。
 *
 * 为什么 `wait` 可以被裁掉：它是「观察者阻塞」——冻结当前对话去等一条 run 到
 * 终态。有终态唤醒通道的宿主（交互式 TUI）根本不需要它：run 结束时唤醒会把
 * 对话接回来。把它留在工具表里的代价不是零——模型会用连续的 `wait` 当轮询使，
 * 每一次超时都要在 transcript 上解释「我等超时了 ≠ 它失败了」，而这两件事在
 * 返回载荷里共用同一个 `status` 字段。删掉动作，那道解释题就不存在了。
 *
 * 契约：`actions` 只做减法，且必须是 CONTROL_AGENT_RUN_ACTIONS 的子集；缺省
 * 给全集（服务端 / 无唤醒宿主原样保留 wait）。`wakeEnabled` 声明宿主有终态
 * 唤醒通道；缺省按「有没有 wait」推导（历史上唯一裁掉 wait 的场景就是有唤醒），
 * 显式传入用于「没有 wait 但也没有唤醒」的宿主——此时不承诺 wake，status 也
 * 保持宽松语义（它可能是那里唯一的观察手段）。
 */
export function buildControlAgentRunFunctionSchema(opts?: {
    actions?: readonly ControlAgentRunAction[];
    wakeEnabled?: boolean;
}) {
    const actions = opts?.actions ?? CONTROL_AGENT_RUN_ACTIONS;
    const hasWait = actions.includes("wait");
    const wake = opts?.wakeEnabled ?? !hasWait;
    const actionList = actions.filter((a) => a !== "todo").join("/");
    return {
        name: "controlAgentRun",
        description:
            `观察和控制后台 agent run（action：${actionList}，另有 todo 查询）。` +
            (wake
                ? "本环境有终态唤醒（terminal wake）：正常后台 run 派发后直接收尾，宿主会持续观察生命周期并在 run 到终态时自动把父对话接回来。"
                : hasWait
                    ? "用 startAgentRun 拿到 runId 后跟进度、等结果、追加指令或叫停。"
                    : "用 startAgentRun 拿到 runId 后跟进度、追加指令或叫停。") +
            "盯梢/轮询纪律见 system prompt「多 Agent 编排」段：异步派发后等终态通知、不要轮询；" +
            (hasWait
                ? "阻塞等待（wait action）会冻结对话，仅限 ① 预计 <100s 且马上要用结果 ② 用户明确要求同步等待或正在与该子任务对话 ③ 无并行工作可做。"
                : wake
                    ? "本工具没有阻塞等待动作，只用于控制、异常诊断和必要的一次性状态检查，不用于等待完成或持续跟踪进度，不要用连续查状态代替等待。"
                    : "") +
            "本工具供你自己做决策用：用户界面已实时显示每条 run 的状态，不必为「让用户看到状态」而调用，返回值也不要复述给用户。",
        parameters: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: [...actions],
                    description: actions
                        .map((a) =>
                            a === "status" && wake
                                ? WAKE_STATUS_ACTION_DESCRIPTION
                                : ACTION_DESCRIPTIONS[a],
                        )
                        .join("；"),
                },
                runId: {
                    type: "string",
                    description:
                        "目标 run 的 ID（startAgentRun 返回的 runId）。action=list 时省略。",
                },
                dialogKey: {
                    type: "string",
                    description:
                        "可选。action=append 时目标 dialog 的 dbKey（如 dialog-user-xxx）。缺省时由 runId 推导。",
                },
                userInput: {
                    type: "string",
                    description:
                        "action=append 时追加给该任务的新指令或纠偏文本。",
                },
                mode: {
                    type: "string",
                    enum: ["enqueue", "continue"],
                    description:
                        "可选。action=append 时的追加模式：enqueue=加入队列供下一轮消费；continue=终态续跑。缺省时自动根据 run 状态适配。",
                },
                ...(hasWait
                    ? {
                          timeoutMs: {
                              type: "number",
                              description:
                                  "可选。action=wait 的等待上限（毫秒），默认 100000。超时返回 status=\"timeout\"（不是失败），可稍后再 wait 或改用 status/stop。",
                              default: 100000,
                          },
                      }
                    : {}),
                tailLines: {
                    type: "number",
                    description:
                        "可选。action=status 时：0=只返回状态摘要，>0=同时返回最近 N 行日志（默认 0）。" +
                        (wake
                            ? "状态摘要含 progress（inFlight=此刻在执行什么、idleMs），用于一次性判断「它是不是卡住了」；正常运行的进度由宿主观察，不要反复调用 status 盯 progress。"
                            : "状态摘要已含 progress（工具调用/LLM 调用/inFlight=此刻在执行什么、idleMs），先看它判断「在干活」还是「卡住」，确实可疑或已失败才拉日志。"),
                    default: 0,
                },
                batchId: {
                    type: "string",
                    description:
                        "可选。action=list 时只返回该批次的 run（startAgentRun 返回值或入参中的 batchId）。",
                },
                status: {
                    type: "string",
                    description:
                        "可选。action=list 时按状态过滤，单值或逗号分隔多值（如 'running,orphaned'）。" +
                        "与 statusFilter 同义，status 优先；orphaned=pid 已死但记录仍 running 的孤儿 run。默认 all。",
                },
                statusFilter: {
                    type: "string",
                    enum: ["running", "done", "failed", "cancelled", "orphaned", "all"],
                    description:
                        "可选。action=list 时按状态过滤，默认 all。与 status 同义（status 优先，且 status 支持多值）。",
                },
                limit: {
                    type: "number",
                    description:
                        "可选。action=list 时限制返回数量，默认 20，上限 200。不带任何参数不会返回全量。",
                },
                offset: {
                    type: "number",
                    description:
                        "可选。action=list 时跳过前 N 条，配合 limit 翻页。默认 0。",
                },
            },
            required: ["action"],
        },
    };
}

/** 全集 schema：服务端与无终态唤醒的宿主（裸 CLI / headless）用它。 */
export const controlAgentRunFunctionSchema = buildControlAgentRunFunctionSchema();

interface ControlAgentRunArgs {
    action: "list" | "status" | "stop" | "todo" | "wait" | "append";
    runId?: string;
    dialogKey?: string;
    userInput?: string;
    mode?: "enqueue" | "continue";
    tailLines?: number;
    timeoutMs?: number;
    batchId?: string;
    status?: string;
    statusFilter?: string;
    limit?: number;
    offset?: number;
}

/**
 * controlAgentRun executor.
 */
export async function controlAgentRunFunc(
    args: ControlAgentRunArgs,
    thunkApi: any,
    _context?: { parentMessageId?: string; signal?: AbortSignal; toolRunId?: string }
): Promise<{ rawData: any; displayData: string }> {
    const { action, runId, dialogKey, userInput, mode, tailLines, timeoutMs, batchId, status, statusFilter, limit, offset } = args;

    if (action === "list") {
        return handleList(thunkApi, { batchId, status, statusFilter, limit, offset });
    }

    if (action === "todo") {
        return handleTodo(thunkApi, { status });
    }

    if (action === "append") {
        if (!userInput) {
            throw new Error("controlAgentRun(append): userInput is required");
        }
        return handleAppend(thunkApi, { runId, dialogKey, userInput, mode });
    }

    if (action === "status") {
        if (!runId) {
            throw new Error("controlAgentRun(status): runId is required");
        }
        return handleStatus(thunkApi, { runId, tailLines: tailLines ?? 0 });
    }

    if (action === "stop") {
        if (!runId) {
            throw new Error("controlAgentRun(stop): runId is required");
        }
        return handleStop(thunkApi, { runId });
    }

    if (action === "wait") {
        if (!runId) {
            throw new Error("controlAgentRun(wait): runId is required");
        }
        return handleWait(thunkApi, { runId, timeoutMs }, _context);
    }

    throw new Error(`controlAgentRun: 未知 action "${action}"`);
}

// ── list ───────────────────────────────────────────────────────────────────

async function handleList(
    thunkApi: any,
    opts: {
        batchId?: string;
        status?: string;
        statusFilter?: string;
        limit?: number;
        offset?: number;
    }
): Promise<{ rawData: any; displayData: string }> {
    try {
        const data = await callToolApi(
            thunkApi,
            "/api/agent/runs/control",
            {
                action: "list",
                batchId: opts.batchId,
                status: opts.status,
                statusFilter: opts.statusFilter,
                limit: opts.limit,
                offset: opts.offset,
            },
            { withAuth: true }
        );

        const runs = data?.data?.runs ?? data?.runs ?? [];
        const count = data?.data?.count ?? data?.count ?? runs.length;
        const total = data?.data?.total ?? data?.total ?? count;
        const hasMore = data?.data?.hasMore ?? data?.hasMore ?? false;
        const batchSummary = data?.data?.batchSummary ?? data?.batchSummary;

        return {
            rawData: {
                runs,
                count,
                total,
                hasMore,
                ...(batchSummary ? { batchSummary } : {}),
            },
            displayData: formatListRunsCard(runs),
        };
    } catch (e: any) {
        throw new Error(`controlAgentRun(list) 失败: ${toErrorMessage(e)}`);
    }
}

// ── todo ───────────────────────────────────────────────────────────────────

async function handleTodo(
    thunkApi: any,
    opts: { status?: string }
): Promise<{ rawData: any; displayData: string }> {
    try {
        const data = await callToolApi(
            thunkApi,
            "/api/agent/runs/control",
            { action: "todo", status: opts.status },
            { withAuth: true }
        );
        const todos = data?.data?.todos ?? data?.todos ?? [];
        return {
            rawData: { todos },
            displayData: `Runtime Todo (${todos.length}):\n${JSON.stringify(todos, null, 2)}`,
        };
    } catch (e: any) {
        throw new Error(`controlAgentRun(todo) 失败: ${toErrorMessage(e)}`);
    }
}

// ── status ─────────────────────────────────────────────────────────────────

async function handleStatus(
    thunkApi: any,
    opts: { runId: string; tailLines: number }
): Promise<{ rawData: any; displayData: string }> {
    try {
        const data = await callToolApi(
            thunkApi,
            "/api/agent/runs/control",
            { action: "status", runId: opts.runId, tailLines: opts.tailLines },
            { withAuth: true }
        );

        const resData = data?.data ?? data;
        if (!resData || resData.found === false) {
            return {
                rawData: { found: false, runId: opts.runId },
                displayData: formatNotFoundRunCard(),
            };
        }

        const run = resData.run;
        const logLines: string[] | undefined = resData.logLines;
        const name = resolveRunLabel(run);

        return {
            rawData: { found: true, ...run, ...(logLines ? { logLines } : {}) },
            displayData: formatStatusRunCard(name, run.status, {
                runId: opts.runId,
                lastToolNames: run.lastToolNames,
                toolCallCount: run.toolCallCount,
                lastAssistantText: run.lastAssistantText,
                errorMessage: run.errorMessage,
                timing: { startedAt: run.startedAt, finishedAt: run.finishedAt },
                logLines,
            }),
        };
    } catch (e: any) {
        throw new Error(`controlAgentRun(status) 失败: ${toErrorMessage(e)}`);
    }
}

// ── stop ───────────────────────────────────────────────────────────────────

async function handleStop(
    thunkApi: any,
    opts: { runId: string }
): Promise<{ rawData: any; displayData: string }> {
    try {
        const data = await callToolApi(
            thunkApi,
            "/api/agent/runs/control",
            { action: "stop", runId: opts.runId },
            { withAuth: true }
        );

        const result = data?.data ?? data;
        const status = result?.status ?? "cancelled";

        return {
            rawData: { runId: opts.runId, status, wasActive: result?.wasActive ?? false },
            displayData: formatStopRunCard(status),
        };
    } catch (e: any) {
        throw new Error(`controlAgentRun(stop) 失败: ${toErrorMessage(e)}`);
    }
}

// ── append ─────────────────────────────────────────────────────────────────

async function handleAppend(
    thunkApi: any,
    opts: { runId?: string; dialogKey?: string; userInput: string; mode?: "enqueue" | "continue" }
): Promise<{ rawData: any; displayData: string }> {
    try {
        const state = thunkApi.getState?.() ?? {};
        const userId = (state as any)?.identity?.currentUser?.userId ?? (state as any)?.auth?.currentUser?.userId;
        const resolvedKey =
            opts.dialogKey ||
            (opts.runId?.startsWith("dialog-")
                ? opts.runId
                : opts.runId && userId
                  ? `dialog-${userId}-${opts.runId}`
                  : opts.runId);

        if (!resolvedKey) {
            throw new Error("dialogKey or runId is required to append an instruction");
        }

        const data = await callToolApi(
            thunkApi,
            "/api/agent/runs/control",
            {
                action: "append",
                dialogKey: resolvedKey,
                userInput: opts.userInput,
                ...(opts.mode ? { mode: opts.mode } : {}),
            },
            { withAuth: true }
        );

        const resData = data?.data ?? data;
        return {
            rawData: resData,
            displayData: `追加指令成功 [${resData.mode ?? "append"}]: ${resData.message ?? "已提交"}${
                typeof resData.queued === "number" ? ` (排队数: ${resData.queued})` : ""
            }`,
        };
    } catch (e: any) {
        throw new Error(`controlAgentRun(append) 失败: ${toErrorMessage(e)}`);
    }
}

// ── wait ───────────────────────────────────────────────────────────────────

async function handleWait(
    thunkApi: any,
    opts: { runId: string; timeoutMs?: number },
    contextOpts?: { signal?: AbortSignal }
): Promise<{ rawData: any; displayData: string }> {
    const timeoutMs = opts.timeoutMs ?? 100000;
    const requestContext = getToolRequestContext(thunkApi);
    const serverBase = requestContext.baseUrl || requestContext.currentServer;
    const authHeader = requestContext.token ? `Bearer ${requestContext.token}` : "";

    let cleanupSignal: (() => void) | null = null;

    try {
        const initial = await callToolApi(
            thunkApi,
            "/api/agent/runs/control",
            { action: "status", runId: opts.runId },
            { withAuth: true }
        );
        const resData = initial?.data ?? initial;
        const initialRun = resData?.run;
        if (!resData || resData.found === false || !initialRun) {
            throw new Error(`等待失败：runId ${opts.runId} 不存在`);
        }
        const terminalStatuses = ["done", "failed", "cancelled", "orphaned"];
        if (terminalStatuses.includes(initialRun.status)) {
            const name = resolveRunLabel(initialRun);
            return {
                rawData: { runId: opts.runId, status: initialRun.status, content: initialRun.lastAssistantText, found: true, ...initialRun },
                displayData: formatStatusRunCard(name, initialRun.status, {
                    runId: opts.runId,
                    lastToolNames: initialRun.lastToolNames,
                    toolCallCount: initialRun.toolCallCount,
                    lastAssistantText: initialRun.lastAssistantText,
                    errorMessage: initialRun.errorMessage,
                    timing: { startedAt: initialRun.startedAt, finishedAt: initialRun.finishedAt },
                }),
            };
        }

        const abortController = new AbortController();
        if (contextOpts?.signal) {
            if (contextOpts.signal.aborted) {
                const err = new Error("SSE 订阅被外部中止");
                err.name = "AgentWaitInterruptedError";
                throw err;
            }
            const onAbort = () => abortController.abort();
            contextOpts.signal.addEventListener("abort", onAbort, { once: true });
            cleanupSignal = () => {
                contextOpts.signal?.removeEventListener("abort", onAbort);
            };
        }

        let timer: ReturnType<typeof setTimeout> | null = null;
        const timeoutPromise = new Promise<{ isTimeout: true }>((resolve) => {
            timer = setTimeout(() => {
                abortController.abort();
                resolve({ isTimeout: true });
            }, timeoutMs);
        });

        const listenPromise = listenToDialogEvents(
            opts.runId,
            serverBase,
            authHeader,
            abortController.signal,
        );

        let raceResult: any;
        try {
            raceResult = await Promise.race([listenPromise, timeoutPromise]);
        } catch (e: any) {
            if (e?.name === "AgentRunFailedError") {
                const errMsg = e.message || "未知错误";
                const name = resolveRunLabel(initialRun);
                return {
                    rawData: {
                        runId: opts.runId,
                        found: true,
                        status: "failed",
                        errorMessage: errMsg,
                    },
                    displayData: formatStatusRunCard(name, "failed", {
                        runId: opts.runId,
                        errorMessage: errMsg,
                    }),
                };
            }
            throw e;
        } finally {
            if (timer) clearTimeout(timer);
        }

        if (raceResult && typeof raceResult === "object" && "isTimeout" in raceResult && raceResult.isTimeout) {
            const rawData = {
                runId: opts.runId,
                found: true,
                status: "timeout",
                waitedMs: timeoutMs,
            };
            return {
                rawData,
                displayData: `已等待 ${timeoutMs}ms，runId: ${opts.runId} 仍在运行中（未达终态）。可稍后再次 wait 或改用 status/stop。`,
            };
        }

        if (contextOpts?.signal?.aborted || (abortController.signal.aborted && !("isTimeout" in (raceResult ?? {})))) {
            const err = new Error("SSE 订阅被外部中止");
            err.name = "AgentWaitInterruptedError";
            throw err;
        }

        const res = raceResult as { content?: string; usage?: unknown; status?: string; errorMessage?: string };
        const status = res?.status ?? "done";
        const rawData: Record<string, unknown> = {
            runId: opts.runId,
            found: true,
            status,
            content: res?.content,
            usage: res?.usage,
            ...(res?.errorMessage && { errorMessage: res.errorMessage }),
        };

        const name = resolveRunLabel(initialRun);
        return {
            rawData,
            displayData: formatStatusRunCard(name, status, {
                runId: opts.runId,
                lastAssistantText: res?.content,
                errorMessage: res?.errorMessage,
            }),
        };
    } catch (e: any) {
        if (isAbortError(e) || e?.name === "AgentWaitInterruptedError") {
            throw e;
        }
        throw new Error(`controlAgentRun(wait) 失败: ${toErrorMessage(e)}`);
    } finally {
        cleanupSignal?.();
    }
}
