// ai/context/calculateContextUsage.ts

/**
 * 计算 Agent 的 Context 使用情况。
 * 
 * 用于：
 * 1. Agent 编辑页面的 Token 预算可视化
 * 2. 运行时的 Context 监控
 * 3. 超标警告
 */

import { estimateTokenCount, CONTEXT_BUDGET, calcTokenUsagePercent } from "./tokenUtils";
import { getModelContextWindow } from "../llm/getModelContextWindow";
import type { ReferenceItem } from "app/types";

export interface ContextUsageBreakdown {
    // 各部分 Token 使用
    referencesTokens: number;
    spaceContextTokens: number;
    systemPromptTokens: number;
    historyTokens: number;

    // 总计
    totalUsed: number;
    modelContextWindow: number;
    availableTokens: number;

    // 百分比
    usedPercent: number;
    referencesPercent: number;

    // 状态
    isWarning: boolean;
    isCritical: boolean;
    warningMessage?: string;
}

export interface ContextUsageInput {
    modelName: string;
    references?: ReferenceItem[];
    referencesContent?: string; // 如果已经拼接好的内容
    spaceContext?: string | null;
    systemPrompt?: string;
    historyContext?: string | null;
}

/**
 * 计算 Context 使用情况
 */
export const calculateContextUsage = (input: ContextUsageInput): ContextUsageBreakdown => {
    const {
        modelName,
        references,
        referencesContent,
        spaceContext,
        systemPrompt,
        historyContext,
    } = input;

    // 获取模型的 Context Window
    const modelContextWindow = getModelContextWindow(modelName);

    // 估算各部分 Token 数
    // References: 如果提供了 content 直接用，否则根据数量估算
    let referencesTokens = 0;
    if (referencesContent) {
        referencesTokens = estimateTokenCount(referencesContent);
    } else if (references && references.length > 0) {
        // 粗略估算：每个 reference 平均 2000 tokens（需要实际获取内容才能精确）
        referencesTokens = references.length * 2000;
    }

    const spaceContextTokens = estimateTokenCount(spaceContext || "");
    const systemPromptTokens = estimateTokenCount(systemPrompt || "");
    const historyTokens = estimateTokenCount(historyContext || "");

    // 计算总使用量（References + Space 是预分配的，其他是动态的）
    const preAllocatedTokens = referencesTokens + spaceContextTokens;
    const totalUsed = preAllocatedTokens + systemPromptTokens + historyTokens;
    const availableTokens = modelContextWindow - totalUsed;

    // 计算百分比
    const usedPercent = calcTokenUsagePercent(totalUsed, modelContextWindow);
    const referencesPercent = calcTokenUsagePercent(preAllocatedTokens, modelContextWindow);

    // 判断状态
    const isWarning = referencesPercent > CONTEXT_BUDGET.REFERENCES_MAX_PERCENT;
    const isCritical = usedPercent > 80;

    // 生成警告消息
    let warningMessage: string | undefined;
    if (isCritical) {
        warningMessage = `⚠️ 上下文已使用 ${usedPercent}%，可能影响对话质量。建议减少 References 或 Space 内容。`;
    } else if (isWarning) {
        warningMessage = `⚡ References 和 Space 已占用 ${referencesPercent}% 上下文，建议控制在 ${CONTEXT_BUDGET.REFERENCES_MAX_PERCENT}% 以内。`;
    }

    return {
        referencesTokens,
        spaceContextTokens,
        systemPromptTokens,
        historyTokens,
        totalUsed,
        modelContextWindow,
        availableTokens,
        usedPercent,
        referencesPercent,
        isWarning,
        isCritical,
        warningMessage,
    };
};

/**
 * 快速检查 References 是否超标
 * 用于 Agent 编辑页面的实时反馈
 */
export const checkReferencesOverBudget = (
    modelName: string,
    referencesTokens: number
): { isOver: boolean; percent: number; message?: string } => {
    const modelContextWindow = getModelContextWindow(modelName);
    const percent = calcTokenUsagePercent(referencesTokens, modelContextWindow);
    const isOver = percent > CONTEXT_BUDGET.REFERENCES_MAX_PERCENT;

    return {
        isOver,
        percent,
        message: isOver
            ? `References 占用 ${percent}%，超过建议上限 ${CONTEXT_BUDGET.REFERENCES_MAX_PERCENT}%`
            : undefined,
    };
};
