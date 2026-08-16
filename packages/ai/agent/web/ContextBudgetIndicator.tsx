// ai/agent/web/ContextBudgetIndicator.tsx

/**
 * Context Budget Indicator
 * 
 * 显示 Agent 的上下文使用情况，包括：
 * - References Token 消耗
 * - Space Context Token 消耗
 * - 总使用百分比
 * - 超标警告
 */

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LuTriangle, LuInfo } from "react-icons/lu";
import { estimateTokenCount, formatTokenCount, CONTEXT_BUDGET } from "../../context/tokenUtils";
import { getModelContextWindow } from "../../llm/getModelContextWindow";

interface ContextBudgetIndicatorProps {
  modelName: string;
  referencesCount?: number;
  estimatedReferencesTokens?: number;
  linkedSpacesCount?: number;
}

const styles = `
  .context-budget {
    padding: 12px 16px;
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--borderLight);
    margin-top: 16px;
  }
  
  .context-budget__header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: var(--fontSize-base);
    color: var(--textSecondary);
  }
  
  .context-budget__progress-container {
    position: relative;
    height: 8px;
    background: var(--backgroundSecondary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  
  .context-budget__progress-bar {
    height: 100%;
    border-radius: var(--radius-sm);
    transition: width 0.3s ease, background-color 0.3s ease;
  }
  
  .context-budget__progress-bar--normal {
    background: var(--primary);
  }
  
  .context-budget__progress-bar--warning {
    background: var(--warning, #f59e0b);
  }
  
  .context-budget__progress-bar--critical {
    background: var(--danger, #ef4444);
  }
  
  .context-budget__stats {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: var(--fontSize-xs);
    color: var(--textSecondary);
  }
  
  .context-budget__stat {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .context-budget__warning {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px 12px;
    background: var(--warningBackground, #fef3c7);
    border-radius: var(--radius-md);
    font-size: var(--fontSize-base);
    color: var(--warningText, #92400e);
  }
  
  .context-budget__warning-icon {
    flex-shrink: 0;
  }
`;

const ContextBudgetIndicator: React.FC<ContextBudgetIndicatorProps> = ({
  modelName,
  referencesCount = 0,
  estimatedReferencesTokens = 0,
  linkedSpacesCount = 0,
}) => {
  const { t } = useTranslation("ai");

  const budget = useMemo(() => {
    const contextWindow = getModelContextWindow(modelName);
    // 估算：每个 reference 平均 2000 tokens，每个 linked space 平均 500 tokens
    const refsTokens = estimatedReferencesTokens || referencesCount * 2000;
    const spacesTokens = linkedSpacesCount * 500;
    const totalPreAllocated = refsTokens + spacesTokens;

    const usedPercent = Math.min(100, Math.round((totalPreAllocated / contextWindow) * 100));
    const isWarning = usedPercent > CONTEXT_BUDGET.REFERENCES_MAX_PERCENT;
    const isCritical = usedPercent > 60;

    return {
      contextWindow,
      refsTokens,
      spacesTokens,
      totalPreAllocated,
      usedPercent,
      isWarning,
      isCritical,
    };
  }, [modelName, referencesCount, estimatedReferencesTokens, linkedSpacesCount]);

  const progressClass = budget.isCritical
    ? "context-budget__progress-bar--critical"
    : budget.isWarning
      ? "context-budget__progress-bar--warning"
      : "context-budget__progress-bar--normal";

  return (
    <div className="context-budget">
      <style>{styles}</style>
      <div className="context-budget__header">
        <LuInfo size={14} aria-hidden="true" />
        <span>{t("references.contextBudget", "Context Budget (Pre-allocated)")}</span>
      </div>

      <div className="context-budget__progress-container">
        <div
          className={`context-budget__progress-bar ${progressClass}`}
          style={{ width: `${budget.usedPercent}%` }}
        />
      </div>

      <div className="context-budget__stats">
        <div className="context-budget__stat">
          <span>{t("references.refsTokens", "Refs: ~{{val}} tokens", { val: formatTokenCount(budget.refsTokens) })}</span>
        </div>
        <div className="context-budget__stat">
          <span>{t("references.spacesTokens", "Spaces: ~{{val}} tokens", { val: formatTokenCount(budget.spacesTokens) })}</span>
        </div>
        <div className="context-budget__stat">
          <span>
            {budget.usedPercent}% / {formatTokenCount(budget.contextWindow)}
          </span>
        </div>
      </div>

      {budget.isWarning && (
        <div className="context-budget__warning">
          <LuTriangle size={16} className="context-budget__warning-icon" aria-hidden="true" />
          <span>
            {t("references.budgetWarning", "Pre-allocated context uses {{percent}}%. Recommended to keep under {{max}}% for conversation history.", {
              percent: budget.usedPercent,
              max: CONTEXT_BUDGET.REFERENCES_MAX_PERCENT
            })}
          </span>
        </div>
      )}
    </div>
  );
};

export default ContextBudgetIndicator;
