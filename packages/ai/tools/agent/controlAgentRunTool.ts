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

export const controlAgentRunFunctionSchema = {
    name: "controlAgentRun",
    description:
        "观察和控制后台 agent run（五 action：list/status/stop/append/wait，另有 todo 查询）。" +
        "用 startAgentRun 拿到 runId 后跟进度、等结果、追加指令或叫停。" +
        "盯梢/轮询/阻塞纪律见 system prompt「多 Agent 编排」段：异步派发后等终态通知、不要轮询；" +
        "阻塞等待（wait action 或 startAgentRun wait:true）会冻结对话，仅限 ① 预计 <100s 且马上要用结果 ② 用户明确要求同步等待或正在与该子任务对话 ③ 环境不支持终态唤醒且无并行工作。" +
        "本工具供你自己做决策用：用户界面已实时显示每条 run 的状态，不必为「让用户看到状态」而调用，返回值也不要复述给用户。",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["list", "status", "stop", "todo", "wait", "append"],
                description:
                    "list=列出 run（省略 runId）；status=查单条 run 状态 + 可选日志；stop=取消 run；" +
                    "append=向任务追加指令（运行中入队，终态 continuation）；" +
                    "wait=终态阻塞等待：订阅该 dialog 的 SSE 事件流等 done/failed，已终态立即返回，不是轮询；" +
                    "todo=列出 runtime todo（由 startAgentRun 的 batchId/trackTodo 产生）。",
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
            timeoutMs: {
                type: "number",
                description:
                    "可选。action=wait 的等待上限（毫秒），默认 100000。超时返回 status=\"timeout\"（不是失败），可稍后再 wait 或改用 status/stop。",
                default: 100000,
            },
            tailLines: {
                type: "number",
                description:
                    "可选。action=status 时：0=只返回状态摘要，>0=同时返回最近 N 行日志（默认 0）。" +
                    "状态摘要已含 progress（工具调用/LLM 调用/inFlight=此刻在执行什么、idleMs），先看它判断「在干活」还是「卡住」，确实可疑或已失败才拉日志。",
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
