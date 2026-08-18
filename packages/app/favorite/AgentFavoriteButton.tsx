import { LuStar } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useAgentFavorite } from "./useAgentFavorite";
import "./AgentFavoriteButton.css";

interface AgentFavoriteButtonProps {
  agentKey: string;
  className?: string;
  iconSize?: number;
}

const AgentFavoriteButton = ({
  agentKey,
  className,
  iconSize = 18,
}: AgentFavoriteButtonProps) => {
  const { t } = useTranslation("ai");
  const { isFavorited, toggleFavorite } = useAgentFavorite(agentKey);

  return (
    <button
      type="button"
      className={`agent-fav-btn-optimized ${isFavorited ? "is-favorited" : ""} ${className || ""}`}
      onClick={toggleFavorite}
      aria-label={isFavorited ? t("unfavorite", "取消收藏") : t("favorite", "收藏")}
      aria-pressed={isFavorited}
    >
      <LuStar
        size={iconSize}
        className="fav-icon"
        aria-hidden="true"
        style={{
          fill: isFavorited ? "var(--primary)" : "transparent",
          strokeWidth: isFavorited ? 1.5 : 2,
        }}
      />
    </button>
  );
};

export default AgentFavoriteButton;
