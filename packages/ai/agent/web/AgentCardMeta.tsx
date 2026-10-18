import { useTranslation } from "react-i18next";
import { LuEye, LuImage, LuTerminal, LuLaptop, LuGauge } from "react-icons/lu";
import type { Agent } from "app/types";
import { formatPriceAmount, formatModelCostPerMillion, resolveAgentTokenPriceBreakdown } from "ai/llm/getPricing";
import { resolveAgentBadgeMeta } from "./agentBadges";

interface AgentCardMetaProps {
  item: Agent;
}

/**
 * Shared meta-flow badges: token cost, image price, CLI / runtime / vision tags.
 * Used by both AgentCard and AgentBlock so badge rendering stays in sync.
 */
/** 只取数字：单位在徽标里只出现一次（1M 与积分），逐项重复单位是纯噪音。 */
const fmtTokenPrice = (value: number): string =>
  formatModelCostPerMillion(value, "").trim();

const AgentCardMeta = ({ item }: AgentCardMetaProps) => {
  const { t } = useTranslation(["ai"]);
  const badgeMeta = resolveAgentBadgeMeta(item);
  // 展示口径与计费一致：平台自营只认目录价；创作者 agent 取 max(创作者价, 目录价)。
  const priceBreakdown = resolveAgentTokenPriceBreakdown(
    item,
    item.apiSource === "platform"
  );
  const {
    priceHint,
    shouldShowTokenCost,
    showImagePrice,
    showCliBadge,
    showVisionBadge,
    showRuntimeBadge,
    runtimeLabel,
    runtimeMachineId,
    quotaText,
    quotaTooltip,
  } = badgeMeta;

  return (
    <div className="agent__meta-flow">
      {shouldShowTokenCost && priceBreakdown && (
        <div
          className="agent__model-cost"
          aria-label={`${t("price", "价格")} (${t("modelCost", "模型成本")}) ${t("priceShortInput", "入")} ${fmtTokenPrice(priceBreakdown.inputPrice)}${
            priceBreakdown.cacheReadPrice !== undefined
              ? ` · ${t("priceShortCache", "缓")} ${fmtTokenPrice(priceBreakdown.cacheReadPrice)}`
              : ""
          } · ${t("priceShortOutput", "出")} ${fmtTokenPrice(priceBreakdown.outputPrice)} ${t("credits", "积分")} / 1M`}
        >
          <span>
            <span className="agent__price-unit">1M</span>{" "}
            {t("priceShortInput", "入")} <strong>{fmtTokenPrice(priceBreakdown.inputPrice)}</strong>
            {priceBreakdown.cacheReadPrice !== undefined && (
              <>
                {" · "}
                {t("priceShortCache", "缓")}{" "}
                <strong>{fmtTokenPrice(priceBreakdown.cacheReadPrice)}</strong>
              </>
            )}
            {" · "}
            {t("priceShortOutput", "出")}{" "}
            <strong>{fmtTokenPrice(priceBreakdown.outputPrice)}</strong>{" "}
            {t("credits", "积分")}
          </span>
        </div>
      )}

      {showImagePrice && priceHint && priceHint.type === "per_image" && (
        <div
          className="agent__price"
          aria-label={`${t("price", "价格")} (${priceHint.labelKey ? t(priceHint.labelKey, "默认档参考价") : t("price")})：${formatPriceAmount(priceHint.amount)} / ${t("perImage")}`}
        >
          <LuImage size={12} aria-hidden="true" />
          <span className="agent__price-label">
            {priceHint.labelKey ? t(priceHint.labelKey, "默认档参考价") : t("price")}
          </span>
          <span>{formatPriceAmount(priceHint.amount)}</span>
          <span className="agent__price-unit">
            / {t("perImage")}
          </span>
          {priceHint.profileLabel && (
            <span className="agent__price-profile">({priceHint.profileLabel})</span>
          )}
        </div>
      )}

      {showCliBadge && (
        <span className="agent__tag agent__cli">
          <LuTerminal size={12} aria-hidden="true" />
          <span>CLI</span>
        </span>
      )}
      {showRuntimeBadge && (
        <span
          className="agent__tag agent__runtime"
          title={runtimeMachineId || ""}
        >
          <LuLaptop size={12} aria-hidden="true" />
          <span>{runtimeLabel}</span>
        </span>
      )}
      {showVisionBadge && (
        <span className="agent__tag agent__vision">
          <LuEye size={12} aria-hidden="true" />
          <span>{t("vision")}</span>
        </span>
      )}
      {quotaText && (
        <span
          className="agent__tag agent__quota"
          title={quotaTooltip || quotaText}
        >
          <LuGauge size={12} aria-hidden="true" />
          <span>{quotaText}</span>
        </span>
      )}
    </div>
  );
};

export default AgentCardMeta;