import { useTranslation } from "react-i18next";
import { LuEye, LuImage, LuTerminal, LuLaptop } from "react-icons/lu";
import type { Agent } from "app/types";
import { formatPriceAmount } from "ai/llm/getPricing";
import { formatAgentOutputPrice } from "./agentDisplayUtils";
import { resolveAgentBadgeMeta } from "./agentBadges";

interface AgentCardMetaProps {
  item: Agent;
}

/**
 * Shared meta-flow badges: token cost, image price, CLI / runtime / vision tags.
 * Used by both AgentCard and AgentBlock so badge rendering stays in sync.
 */
const AgentCardMeta = ({ item }: AgentCardMetaProps) => {
  const { t } = useTranslation(["ai"]);
  const badgeMeta = resolveAgentBadgeMeta(item);
  const {
    priceHint,
    shouldShowTokenCost,
    showImagePrice,
    showCliBadge,
    showVisionBadge,
    showRuntimeBadge,
    runtimeLabel,
    runtimeMachineId,
  } = badgeMeta;

  return (
    <div className="agent__meta-flow">
      {shouldShowTokenCost && (
        <div
          className="agent__model-cost"
          aria-label={`${t("price", "价格")} (${t("modelCost", "模型成本")})：${t("outputCostPerMillionTokens", "输出")} ${formatAgentOutputPrice(item.outputPrice)}`}
        >
          <span className="agent__price-label">{t("price", "价格")}：</span>
          <span>
            {t("outputCostPerMillionTokens", "输出")}：
            <strong>{formatAgentOutputPrice(item.outputPrice)}</strong>
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
          <LuTerminal size={11} aria-hidden="true" />
          <span>CLI</span>
        </span>
      )}
      {showRuntimeBadge && (
        <span
          className="agent__tag agent__runtime"
          title={runtimeMachineId || ""}
        >
          <LuLaptop size={11} aria-hidden="true" />
          <span>{runtimeLabel}</span>
        </span>
      )}
      {showVisionBadge && (
        <span className="agent__tag agent__vision">
          <LuEye size={11} aria-hidden="true" />
          <span>{t("vision")}</span>
        </span>
      )}
    </div>
  );
};

export default AgentCardMeta;