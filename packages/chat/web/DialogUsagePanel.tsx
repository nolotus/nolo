import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCredits } from "app/utils/credits";
import type { ContextWindowState } from "chat/dialog/useDialogContextUsage";
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
  windowState?: ContextWindowState;
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
  estimated = false,
  windowState = contextWindow > 0 ? "known" : "unknown",
  compressionCount = 0,
  className = "",
}) => {
  const { t } = useTranslation(["common", "chat"]);

  const inputTokens = tokenStats?.inputTokens ?? 0;
  const outputTokens = tokenStats?.outputTokens ?? 0;
  const totalTokens = getDialogTokenTotal(inputTokens, outputTokens);
  const totalCost = tokenStats?.totalCost ?? 0;
  const creditsUnit = t("chat:creditsUnit");
  const contextWindowLabel = t("chat:contextWindow");

  const contextUsage = useMemo(() => {
    if (windowState !== "known" || !contextWindow || contextWindow <= 0) return null;
    const percent = getContextWindowUsagePercent(contextTokens, contextWindow);
    return {
      percent,
      usedExact: formatExactTokens(contextTokens),
      windowLabel: formatCompactTokenCount(contextWindow),
    };
  }, [contextWindow, contextTokens, windowState]);

  return (
    <div
      className={`dialog-usage-panel ${className}`.trim()}
      aria-label={contextWindowLabel}
    >
      {/* Flat layout: no nested card inside the popover shell. */}
      <div className="dialog-usage-panel__row dialog-usage-panel__row--main">
        <p className="dialog-usage-panel__headline">
          {windowState === "loading"
            ? t("chat:contextUsageLoading")
            : contextUsage
              ? t("chat:contextUsageKnownPanel", {
                  tokens: contextUsage.usedExact,
                  window: contextUsage.windowLabel,
                  percent: contextUsage.percent,
                })
              : t(estimated ? "chat:contextUsageUnknownPanelEstimated" : "chat:contextUsageUnknownPanel", { tokens: formatExactTokens(contextTokens) })}
          {windowState === "known" && estimated && t("chat:contextOccupancyEstimated")}
        </p>
        <span className="dialog-usage-panel__billing-value">
          {formatCredits(totalCost, creditsUnit, 4)}
        </span>
      </div>

      {windowState === "unknown" && (
        <p className="dialog-usage-panel__hint">{t("chat:contextUsageUnknownHint")}</p>
      )}

      <p>{t("chat:dialogCumulative")} · {formatExactTokens(totalTokens)}</p>
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
          {t("common:compressedTimes", { count: compressionCount })}
        </p>
      )}
    </div>
  );
};