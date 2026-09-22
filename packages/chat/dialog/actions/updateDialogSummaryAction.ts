// 文件路径: packages/chat/dialog/actions/updateDialogSummaryAction.ts

import type { RootState } from "app/store";
import { runLlm } from "ai/agent/agentSlice";
import { BUILTIN_SUMMARY_LLM_CONFIG } from "./builtinDialogLlm";
import { patch, selectById } from "database/dbSlice";
import { DialogConfig, Agent } from "app/types";
import { getModelContextWindow, DEFAULT_CONTEXT_WINDOW } from "ai/llm/getModelContextWindow";
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
    formatMessagesForSummaryWithTruncation,
    formatFileOperationsFromMessages,
    buildCompactionUserContent,
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


const summarizingDialogs = new Set<string>();

export const updateDialogSummaryAction = async (
    args: {
        dialogKey: string;
        preFetchedMessages?: Message[];
        force?: boolean;
        reason?: "task_completed" | "context_budget" | "manual";
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
    if (summarizingDialogs.has(dialogKey)) return;
    summarizingDialogs.add(dialogKey);

    const { dispatch, getState } = thunkApi;

    try {
        const state = getState() as RootState;
        const dialogId = extractCustomId(dialogKey);

        const dialogConfig = selectById(state, dialogKey) as DialogConfig;
        if (!dialogConfig) return;

        let contextWindow = DEFAULT_CONTEXT_WINDOW;
        if (dialogConfig.cybots && dialogConfig.cybots.length > 0) {
            const agentId = dialogConfig.cybots[0];
            const agent = selectById(state, agentId) as Agent;
            if (agent?.model) {
                contextWindow = getModelContextWindow(agent.model);
            }
        }

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

        if (!plan.shouldCompress) return;

        const { msgsToCompress, newSummarizedBeforeId } = plan;

        // 4. 提取引用 Keys 并保存
        // 这一步非常重要：因为这些消息即将从 context 中消失，必须把 key 留下来。
        // 统一用 extractReferenceKeysFromMessage 覆盖 content / tool_calls / toolPayload
        // 三个来源，避免 tool 调用参数里引用的 page/dialog/table key 在压缩后永久丢失。
        const extractedKeys = new Set(dialogConfig.referenceKeys || []);
        for (const msg of msgsToCompress) {
            for (const key of extractReferenceKeysFromMessage(msg)) {
                extractedKeys.add(key);
            }
        }

        // 5. 生成新 Summary（统一用共享模块的三段式 prompt + 截断 + 文件操作清单）
        const previousSummary = dialogConfig.summary || "";
        const messagesText = formatMessagesForSummaryWithTruncation(msgsToCompress);
        const fileOpsText = formatFileOperationsFromMessages(
            msgsToCompress,
            identityCanonicalName,
        );
        const promptContent = buildCompactionUserContent({
            previousSummary,
            messagesText,
            fileOpsText,
        });

        try {
            // 调用内置 Summary LLM，用统一的 system prompt 覆盖原 BUILTIN_SUMMARY_LLM_CONFIG.prompt
            const newSummary = await dispatch(
                runLlm({
                    llmConfig: {
                        ...BUILTIN_SUMMARY_LLM_CONFIG,
                        prompt: COMPACTION_SUMMARY_SYSTEM_PROMPT,
                    },
                    content: promptContent,
                    billingDialogKey: dialogKey,
                })
            ).unwrap();

            if (newSummary && typeof newSummary === "string" && newSummary.trim()) {
                const currentCount = dialogConfig.compressionCount || 0;

                await dispatch(
                    patch({
                        dbKey: dialogKey,
                        changes: {
                            summary: newSummary.trim(),
                            summarizedBeforeId: newSummarizedBeforeId,
                            referenceKeys: Array.from(extractedKeys),
                            compressionCount: currentCount + 1,
                        },
                    })
                ).unwrap();

                // P1-8 压缩埋点
                const metrics = buildCompactionMetricsFromPlan({
                    reason: args.reason || "context_budget",
                    previousSummary: dialogConfig.summary || "",
                    plan,
                    newSummary: newSummary.trim(),
                    // web 端 runLlm 只返回摘要字符串，不含 usage。
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
            console.error("[ContextCompression] Failed:", err);
            // 失败也要可见：此前只打 console，用户侧表现为
            // 「超限了也没自动压缩」且没有任何线索。
            notifyCompressionFailure(err);
        }
    } finally {
        summarizingDialogs.delete(dialogKey);
    }
};