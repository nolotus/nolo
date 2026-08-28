import "./PrepareAgentDraftToolCard.css";
import React from "react";
import { useLocation, useNavigate } from "app/routing";
import { useTranslation } from "react-i18next";
import {
  LuArrowRight,
  LuBot,
  LuCheck,
  LuFileText,
  LuSparkles,
} from "react-icons/lu";
import type { GuidedAgentDraft } from "ai/agent/guidedCreation/types";
import { getGuidedCapabilityLabels } from "ai/agent/guidedCreation/capabilityPresentation";
import { formatProviderModelLine } from "ai/llm/providerDisplay";
import { isRecord } from "core/isRecord";
import { asOptionalFiniteNumber } from "core/optionalNumber";

interface PrepareAgentDraftToolCardProps {
  rawData: any;
  isError: boolean;
}

const asDraft = (rawData: any): GuidedAgentDraft | null => {
  const draft = rawData?.draft;
  if (!isRecord(draft)) return null;
  return draft as GuidedAgentDraft;
};

const PrepareAgentDraftToolCard: React.FC<PrepareAgentDraftToolCardProps> = ({
  rawData,
  isError,
}) => {
  const { t } = useTranslation("ai");
  const navigate = useNavigate();
  const location = useLocation();
  if (isError) return null;

  const draft = asDraft(rawData);
  if (!draft) return null;

  const unresolved = Array.isArray(draft.unresolved) ? draft.unresolved : [];
  const capabilityIds = Array.isArray(draft.capabilityIds)
    ? draft.capabilityIds
    : [];
  const capabilityLabels = getGuidedCapabilityLabels(capabilityIds);
  const secondaryAction =
    rawData?.secondaryAction?.kind === "advancedEdit"
      ? rawData.secondaryAction
      : {
          kind: "advancedEdit",
          label: t("guidedCreate.advanced", "高级编辑"),
          url: rawData?.createUrl || "/create/agent",
        };
  const version = asOptionalFiniteNumber(rawData?.version) ?? null;
  const isPanelOpen = new URLSearchParams(location.search).get("draftPanel") === "true";
  const openPanel = () => {
    const next = new URLSearchParams(location.search);
    next.set("draftPanel", "true");
    navigate(`${location.pathname}?${next.toString()}${location.hash || ""}`);
  };

  return (
    <div className="agent-draft-card">
      <div className="agent-draft-card__icon" aria-hidden="true">
        <LuBot size={20} />
      </div>
      <div className="agent-draft-card__body">
        <div className="agent-draft-card__header">
          <div>
            <div className="agent-draft-card__eyebrow">
              {version
                ? t("guidedCreate.draftCardVersion", "Agent 草稿 第 {{version}} 版", { version })
                : t("guidedCreate.draftCardEyebrow", "Agent 草稿")}
            </div>
            <h3>{draft.name || t("guidedCreate.untitled", "未命名 AI")}</h3>
          </div>
          <span className="agent-draft-card__status">
            {isPanelOpen
              ? t("guidedCreate.draftPanelOpen", "右侧编辑区")
              : unresolved.length
              ? t("guidedCreate.draftCardNeedsReview", "待确认")
              : t("guidedCreate.draftCardReady", "可预览")}
          </span>
        </div>

        {draft.promptSummary && (
          <p className="agent-draft-card__summary">{draft.promptSummary}</p>
        )}

        <div className="agent-draft-card__meta">
          <span>
            <LuSparkles size={13} aria-hidden="true" />
            {capabilityLabels.length
              ? capabilityLabels.join("、")
              : t("guidedCreate.noCapabilities", "还没有选择能力")}
          </span>
          <span>
            <LuFileText size={13} aria-hidden="true" />
            {draft.isPublic
              ? t("guidedCreate.public", "公开")
              : t("guidedCreate.private", "私有")}
          </span>
          <span>
            <LuCheck size={13} aria-hidden="true" />
            {formatProviderModelLine(draft.provider, draft.model)}
          </span>
        </div>

        {unresolved.length > 0 && (
          <div className="agent-draft-card__missing">
            {t("guidedCreate.missing", "还需要补充：")} {unresolved.join(", ")}
          </div>
        )}

        <div className="agent-draft-card__hint">
          <LuSparkles size={13} aria-hidden="true" />
          <span>
            {isPanelOpen
              ? t(
                  "guidedCreate.draftCardPanelOpenHint",
                  "右侧是当前版本编辑区；这张卡片保留本版记录，你也可以继续在对话里要求修改。"
                )
              : t(
                  "guidedCreate.draftCardHint",
                  "草稿已准备；打开右侧面板编辑，或继续在对话里要求修改。"
                )}
          </span>
        </div>
      </div>
      <div className="agent-draft-card__actions">
        <button
          type="button"
          className={`agent-draft-card__action agent-draft-card__action--panel ${
            isPanelOpen ? "is-active" : ""
          }`}
          onClick={openPanel}
          aria-pressed={isPanelOpen}
        >
          <LuSparkles size={14} aria-hidden="true" />
          {isPanelOpen
            ? t("guidedCreate.panelOpen", "右侧已打开")
            : t("guidedCreate.previewAndEdit", "预览与修改")}
        </button>
        <button
          type="button"
          className="agent-draft-card__action agent-draft-card__action--secondary"
          onClick={() =>
            navigate(secondaryAction.url || "/create/agent", {
              state: { initialDraft: draft },
            })
          }
        >
          {secondaryAction.label}
          <LuArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default PrepareAgentDraftToolCard;
