import { isAbortError } from "core/abortError";
// 文件路径: packages/chat/dialog/actions/updateDialogSummaryAction.ts

import type { RootState } from "app/store";
import { runLlm } from "ai/agent/agentSlice";
import { BUILTIN_SUMMARY_LLM_CONFIG } from "./builtinDialogLlm";
import { selectSummaryRoute, createSummaryBudget, runSummaryWithContract, classifySummaryError, type SummaryAttemptContext, type SummaryCompletion } from "ai/context/summaryRouting";
import { PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL } from "ai/llm/platformHostedRoutingTable";
import { patch, selectById } from "database/dbSlice";
import { DialogConfig, Agent } from "app/types";
import { DEFAULT_CONTEXT_WINDOW } from "ai/llm/getModelContextWindow";
import { resolveAgentContextWindow } from "ai/context/agentContextWindow";
import { applyBuiltinAgentRuntimeOverride } from "agent-runtime/builtinPlatformAgentConfigs";
import { getActiveDialogAgentId } from "../dialogAgents";
import { extractCustomId } from "core/prefix";
import {
    notifyCompressionFailure,
    notifyCompressionSuccess,
} from "./compressionNotice";
import type { Message } from "chat/messages/types";
import { planCompression } from "../../../ai/context/planCompression";
import { extractReferenceKeysFromMessage } from "./extractReferenceKeys";
import {
    COMPACTION_SUMMARY_SYSTEM_PROMPT,
    computeSummarySourceMetadata,
    buildHistoricalCompactionRequest,
    buildCompactionMetricsFromPlan,
    formatCompactionMetricsLog,
} from "../../../ai/context/compactionShared";

// --- 辅助函数 ---

const getMessagesForDialogFromState = (
    state: RootState,
    dialogId: string
): Message[] => {
    const msgsState = state.message.dialogStateById[dialogId]?.msgs;
    if (!msgsState || !msgsState.ids) return [];

    return (msgsState.ids as string[]).flatMap((id) => {
        const msg = msgsState.entities[id];
        return msg ? [msg as Message] : [];
    });
};

/**
 * Web 端没有 tool name alias 系统，直接用原始 tool name。
 * readFile/writeFile/editFile 是 bun-nolo 的标准工具名，无需 canonicalize。
 */
const identityCanonicalName = (name: string): string => name;

/**
 * Web 状态与落库记录把「工具结果属于哪条声明」存成 `toolCallId`（camelCase，
 * 见 agent-runtime/dialogWritePlan 的写侧），而运行时消息与共享 compaction 构建器
 * 按 `tool_call_id` 配对声明与结果。这里只做字段归一：不修改存储对象，已经是
 * 运行时形态（或不是工具结果行）的消息原样透传。
 */
const toCompactionRequestMessage = (
    msg: Message
): Message & { tool_call_id?: string } => {
    if (msg.role !== "tool" || typeof msg.toolCallId !== "string" || !msg.toolCallId) {
        return msg;
    }
    const { toolCallId, ...rest } = msg;
    return { ...rest, tool_call_id: toolCallId };
};


const summarizingDialogs = new Set<string>();

export class BudgetRescueError extends Error {
    constructor(readonly code: "busy" | "missing-dialog" | "no-compressible-history" | "no-summary-input" | "failed", detail: string) {
        super(`budget_rescue ${code}: ${detail}; request not sent`);
        this.name = "BudgetRescueError";
    }
}

export const updateDialogSummaryAction = async (
    args: {
        dialogKey: string;
        preFetchedMessages?: Message[];
        force?: boolean;
        reason?: "task_completed" | "context_budget" | "manual" | "budget_rescue";
        availableHistoryTokens?: number;
        contextWindow?: number;
        preserveLatestUserByProjection?: boolean;
        deadlineMs?: number;
        /**
         * 本轮最后一次 provider 调用的真实 input_tokens。
         * 压缩触发只认这个真实遥测；缺失时 planCompression 落估算兜底。
         * 传原始 token 数而非比例：与 contextWindow 的换算在这里完成，
         * 保证分子分母同源。
         */
        lastRealInputTokens?: number;
    },
    thunkApi: any
) => {
    const { dialogKey, preFetchedMessages, force = false } = args;

    // 0. 并发锁：避免同一个 Dialog 同时进行多个摘要任务
    if (summarizingDialogs.has(dialogKey)) {
        if (args.reason === "budget_rescue") throw new BudgetRescueError("busy", "another summary is in progress");
        return;
    }
    summarizingDialogs.add(dialogKey);

    const { dispatch, getState, signal } = thunkApi;

    const budget = createSummaryBudget({ mode: args.reason === "manual" ? "manual" : "automatic", signal, deadlineMs: args.deadlineMs });
    try {
        const state = getState() as RootState;
        const dialogId = extractCustomId(dialogKey);

        const dialogConfig = selectById(state, dialogKey) as DialogConfig;
        if (!dialogConfig) {
            if (args.reason === "budget_rescue") throw new BudgetRescueError("missing-dialog", "dialog record unavailable");
            return;
        }

        const agentId = getActiveDialogAgentId(dialogConfig);
        const currentAgent = agentId ? applyBuiltinAgentRuntimeOverride(
            agentId, (selectById(state, agentId) as Agent | undefined) ?? { dbKey: agentId },
        ) as Agent : undefined;
        const session = thunkApi.extra?.accountSession?.getSnapshot();
        const account = session?.accounts?.find((entry: { userId: string }) => entry.userId === session.activeAccountId);
        const eligibility = { userId: session?.activeAccountId,
            authenticated: !!session?.activeToken, platformAvailable: !!session?.activeToken,
            credits: account?.balance };
        const route = selectSummaryRoute(eligibility);
        const currentAvailable = !!currentAgent?.model && !!currentAgent?.provider && currentAgent.apiSource !== "cli";
        let contextWindow = DEFAULT_CONTEXT_WINDOW;
        {
            // 选人必须与展示侧同一入口：activeAgentKey → primaryAgentKey → cybots[0]
            //（历史数据里 primaryAgentKey 可能不等于 cybots[0]，硬编码 cybots[0] 会让
            //   chip 算出的 ≥70% 与真正的压缩阈值用了两个 agent 的窗口）。
            const agentId = getActiveDialogAgentId(dialogConfig);
            const agent = agentId
                ? (selectById(state, agentId) as Agent | undefined)
                : undefined;
            // agent 记录可能尚未进 entity adapter（内置 key 场景），override 对 undefined
            // record 会抛 TypeError，所以必须先用 agent && 收口——旧代码的 agent?.model
            // 就是这个防御，改窗口解析时不能丢。
            const resolvedAgent =
                agent && agentId
                    ? applyBuiltinAgentRuntimeOverride(agentId, agent)
                    : agent;
            // 执行侧保守兜底；展示层不套默认值，未知窗口保持 unknown。
            contextWindow = resolveAgentContextWindow({
                model: resolvedAgent?.model,
                provider: resolvedAgent?.provider,
                agentKey: agentId,
                agentName: resolvedAgent?.name,
            }) ?? DEFAULT_CONTEXT_WINDOW;
        }

        contextWindow = args.contextWindow ?? contextWindow;

        // 2. 获取消息
        const allMsgs =
            preFetchedMessages || getMessagesForDialogFromState(state, dialogId);

        // 3. 纯函数决策：是否压缩 / 压缩多少 / 压缩哪些
        const plan = planCompression({
            allMsgs,
            summarizedBeforeId: dialogConfig.summarizedBeforeId,
            summary: dialogConfig.summary || "",
            contextWindow,
            force,
            reason: args.reason,
            availableHistoryTokens: args.availableHistoryTokens,
            preserveLatestUserByProjection: args.preserveLatestUserByProjection,
            ...(typeof args.lastRealInputTokens === "number" &&
            args.lastRealInputTokens > 0 &&
            contextWindow > 0
                ? {
                    realContextUsagePercent: Math.min(
                        1,
                        args.lastRealInputTokens / contextWindow,
                    ),
                }
                : {}),
        });

        if (!plan.shouldCompress) {
            if (args.reason === "budget_rescue") throw new BudgetRescueError("no-compressible-history", "summary plan cannot cover more history");
            return;
        }

        const previousSummary = dialogConfig.summary || "";
        // Bound both reachable models; unknown current windows remain conservative.
        const summaryWindow = Math.min(
            route.kind === "platform" ? resolveAgentContextWindow({ model: route.model, provider: "nolo" }) ?? 32_768 : Infinity,
            currentAvailable ? resolveAgentContextWindow(currentAgent!) ?? 32_768 : route.kind === "platform" ? Infinity : 32_768,
        );
        const request = buildHistoricalCompactionRequest({
            // 存储形态（toolCallId）先归一到运行时契约（tool_call_id），否则历史里
            // 半批工具调用的声明与结果无法配对，整段摘要请求会被严格阻塞。
            msgsToCompress: plan.msgsToCompress.map(toCompactionRequestMessage),
            previousSummary,
            contextWindow: summaryWindow,
            canonicalizeToolName: identityCanonicalName,
        });
        if (request.status === "blocked") {
            notifyCompressionFailure(new Error(`摘要请求无法安全构建（${request.reason}），原历史保持不变`));
            if (args.reason === "budget_rescue") throw new BudgetRescueError("no-summary-input", `bounded summary request blocked: ${request.reason}`);
            return;
        }
        // 共享构建器只对「输入的有序 1:1 全量前缀」返回覆盖（否则抛错），因此覆盖区间
        // 可按条数映回计划里的原始记录：引用抽取与埋点必须看到存储形态的消息。
        const coveredMessages = plan.msgsToCompress.slice(0, request.coveredMessages.length);
        const { summarizedBeforeId: newSummarizedBeforeId, promptContent, outputTokenBudget } = request;
        const extractedKeys = new Set(dialogConfig.referenceKeys || []);
        for (const msg of coveredMessages) {
            for (const key of extractReferenceKeysFromMessage(msg)) extractedKeys.add(key);
        }

        try {
            const runSummaryLlm = async (platform: boolean, context: SummaryAttemptContext): Promise<SummaryCompletion> => {
                if (context.signal.aborted) throw context.signal.reason;
                if (!platform && !currentAvailable) throw new Error("Current model textOnly summary channel unavailable");
                const pending = dispatch(runLlm({
                    llmConfig: {
                        ...(platform ? { ...BUILTIN_SUMMARY_LLM_CONFIG, model: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL } : currentAgent!),
                        prompt: COMPACTION_SUMMARY_SYSTEM_PROMPT,
                        max_tokens: outputTokenBudget, tools: [],
                    },
                    toolsOverride: [], isStreaming: false, summaryCompletion: true,
                    systemPromptOverride: COMPACTION_SUMMARY_SYSTEM_PROMPT,
                    content: promptContent, billingDialogKey: dialogKey,
                }));
                const onAbort = () => pending.abort?.();
                context.signal.addEventListener("abort", onAbort, { once: true });
                if (context.signal.aborted) onAbort();
                try { return await pending.unwrap(); }
                finally { context.signal.removeEventListener("abort", onAbort); }
            };
            const result = await runSummaryWithContract({
                eligibility, budget,
                platform: { model: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL, provider: "nolo", run: context => runSummaryLlm(true, context) },
                current: { model: currentAgent?.model, provider: currentAgent?.provider, run: context => runSummaryLlm(false, context) },
            });
            if (result.kind !== "success") {
                if (args.reason === "budget_rescue" && result.kind === "cancelled") {
                    const error = new Error("budget_rescue cancelled");
                    error.name = "AbortError";
                    throw error;
                }
                if (result.kind !== "cancelled") {
                    notifyCompressionFailure(result.kind === "error" ? result.error : new Error(`Summary ${result.kind}`));
                }
                if (args.reason === "budget_rescue") throw new BudgetRescueError("failed", `summary outcome ${result.kind}`);
                return result;
            }
            const newSummary = result.text;
            await budget.run(async () => undefined);
            if (newSummary && typeof newSummary === "string" && newSummary.trim()) {
                const currentCount = dialogConfig.compressionCount || 0;
                const sourceMeta = await budget.run(async () => computeSummarySourceMetadata(
                    allMsgs,
                    newSummarizedBeforeId,
                ));
                // Hashing is asynchronous: cancellation can win after model completion.
                // Never persist any part of that discarded candidate.
                if (budget.signal.aborted) throw budget.signal.reason;

                await dispatch(
                    patch({
                        dbKey: dialogKey,
                        changes: {
                            summary: newSummary.trim(),
                            summarizedBeforeId: newSummarizedBeforeId,
                            referenceKeys: Array.from(extractedKeys),
                            compressionCount: currentCount + 1,
                            ...(sourceMeta ? {
                                sourceHash: sourceMeta.sourceHash,
                                sourceCount: sourceMeta.sourceCount,
                                schemaVersion: sourceMeta.schemaVersion,
                            } : {}),
                        },
                    })
                ).unwrap();

                // P1-8 压缩埋点
                const metrics = buildCompactionMetricsFromPlan({
                    reason: args.reason || "context_budget",
                    previousSummary: dialogConfig.summary || "",
                    plan: {
                        msgsToCompress: coveredMessages,
                        msgsToKeep: [...plan.msgsToCompress.slice(coveredMessages.length), ...plan.msgsToKeep],
                    },
                    newSummary: newSummary.trim(),
                    summaryInput: {
                        inputTokens: request.inputTokens,
                        capTokens: request.capTokens,
                        expandedMessages: request.expandedMessages,
                        omittedMessages: request.omittedMessages,
                    },
                    planCounts: {
                        pendingMessageCount: plan.diagnostics?.pendingMsgCount,
                        plannedCompressCount: plan.diagnostics?.compressCount,
                    },
                    // Compact completion retains finish metadata but does not return usage.
                    // summaryUsage 需要 runLlm 改造才能获取，当前留空。
                });
                console.log(formatCompactionMetricsLog(metrics));

                // 压缩可见性：自动压缩成功必须让用户无成本感知，
                // 否则「有没有生效」只能靠猜。手动 /compact 已有自己的
                // 进度反馈，这里只对非 manual 的自动触发通知。
                if (args.reason !== "manual") {
                    notifyCompressionSuccess();
                }
            }
        } catch (err) {
            if (signal?.aborted || isAbortError(err)) {
                if (args.reason === "budget_rescue") throw err;
                return;
            }
            if (args.reason === "budget_rescue") {
                if (!(err instanceof BudgetRescueError)) notifyCompressionFailure(classifySummaryError(err));
                throw err instanceof BudgetRescueError ? err : new BudgetRescueError("failed", "summary operation failed");
            }
            console.error("[ContextCompression] Failed:", classifySummaryError(err));
            // 失败也要可见：此前只打 console，用户侧表现为
            // 「超限了也没自动压缩」且没有任何线索。
            notifyCompressionFailure(classifySummaryError(err));
        }
    } finally {
        budget.dispose();
        summarizingDialogs.delete(dialogKey);
    }
};
