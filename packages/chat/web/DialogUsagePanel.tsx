import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCredits } from "app/utils/credits";
import type { TokenStats } from "chat/dialog/dialogSlice";
import {
  formatCompactTokenCount,
  getContextWindowUsagePercent,
  getDialogTokenTotal,
} from "chat/dialog/dialogUsageFormat";
import { Meter } from "render/web/ui/Meter";

export type DialogUsagePanelProps = {
  tokenStats: TokenStats;
  contextWindow?: number;
  contextTokens?: number;
  estimated?: boolean;
  compressionCount?: number;
  className?: string;
};

const formatExactTokens = (count: number): string =>
  Math.max(0, count).toLocaleString();

export const DialogUsagePanel: React.FC<DialogUsagePanelProps> = ({
  tokenStats,
  contextWindow = 0,
  contextTokens = 0,
  estimated = true,
  compressionCount = 0,
  className = "",
}) => {
  const { t } = useTranslation(["common", "chat"]);

  const inputTokens = tokenStats?.inputTokens ?? 0;
  const outputTokens = tokenStats?.outputTokens ?? 0;
  const totalTokens = getDialogTokenTotal(inputTokens, outputTokens);
  const totalCost = tokenStats?.totalCost ?? 0;
  const creditsUnit = t("chat:creditsUnit", "积分");
  const contextWindowLabel = t("chat:contextWindow", "上下文窗口");

  const contextUsage = useMemo(() => {
    if (!contextWindow || contextWindow <= 0) return null;
    const percent = getContextWindowUsagePercent(contextTokens, contextWindow);
    return {
      percent,
      usedExact: formatExactTokens(contextTokens),
      windowLabel: formatCompactTokenCount(contextWindow),
    };
  }, [contextWindow, contextTokens]);

  return (
    <div
      className={`dialog-usage-panel ${className}`.trim()}
      aria-label={contextWindowLabel}
    >
      {/* Flat layout: no nested card inside the popover shell. */}
      <div className="dialog-usage-panel__row dialog-usage-panel__row--main">
        <p className="dialog-usage-panel__headline">
          {t("chat:contextOccupancy", "上下文占用")}{estimated ? t("chat:contextOccupancyEstimated", "（估算）") : ""} · {contextUsage ? (
            <>
              {contextUsage.usedExact}
              <span className="dialog-usage-panel__headline-muted">
                {" "}
                / {contextUsage.windowLabel} · {contextUsage.percent}%
              </span>
            </>
          ) : (
            `${formatExactTokens(contextTokens)} / ${t("chat:contextWindowUnknown", "上下文窗口未知")}`
          )}
        </p>
        <span className="dialog-usage-panel__billing-value">
          {formatCredits(totalCost, creditsUnit, 4)}
        </span>
      </div>

      <p>{t("chat:dialogCumulative", "本对话累计")} · {formatExactTokens(totalTokens)}</p>
      <p className="dialog-usage-panel__io">
        ↑{formatExactTokens(inputTokens)}
        <span className="dialog-usage-panel__io-sep" aria-hidden="true">
          ·
        </span>
        ↓{formatExactTokens(outputTokens)}
      </p>

      {contextUsage && (
        <Meter
          className="dialog-usage-panel__meter"
          label={contextWindowLabel}
          hideLabel
          value={contextUsage.percent}
          maxValue={100}
          aria-label={contextWindowLabel}
        />
      )}

      {compressionCount > 0 && (
        <p className="dialog-usage-panel__compression">
          {t("compressedTimes", "已压缩 {{count}} 次", { count: compressionCount })}
        </p>
      )}
    </div>
  );
};