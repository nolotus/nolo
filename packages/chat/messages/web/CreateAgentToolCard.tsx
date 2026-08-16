// 文件路径: chat/messages/web/CreateAgentToolCard.tsx

import "./CreateAgentToolCard.css";
import React from "react";
import { useAppSelector } from "app/store";
import { useTranslation } from "react-i18next";
import { LuBot, LuSparkles, LuCpu, LuShieldCheck } from "react-icons/lu";
import { useAgentDialog } from "ai/agent/hooks/useAgentDialog";
import { resolveDialogLaunchSpaceId } from "chat/dialog/dialogLaunchScope";
import type { Agent } from "app/types";
import { selectCurrentDialogConfig } from "chat/dialog/dialogSlice";
import { toTrimmedString } from "core/toTrimmedString";
import { resolveAgentCardDialogKey } from "./resolveAgentCardDialogKey";

interface CreateAgentToolCardProps {
  rawData: any;
  isError: boolean;
}

const CreateAgentToolCard: React.FC<CreateAgentToolCardProps> = ({ rawData, isError }) => {
  const { t } = useTranslation("ai");

  const agent = (rawData && typeof rawData === "object") ? (rawData as Agent) : null;
  const agentKey = agent ? resolveAgentCardDialogKey(agent) : null;

  const currentDialogSpaceId = useAppSelector(
    (state) => selectCurrentDialogConfig(state)?.spaceId
  );
  const dialogSpaceId = resolveDialogLaunchSpaceId({
    recordSpaceId: currentDialogSpaceId,
  });
  const { isStarting, startDialog } = useAgentDialog(agentKey || "", {
    spaceId: dialogSpaceId,
  });

  if (isError || !agent || !agentKey) return null;

  const displayName = toTrimmedString(agent.name) || t("createAgent.untitled") || "Untitled Agent";
  const model = toTrimmedString(agent.model) || "Default Model";
  const introduction = toTrimmedString(agent.introduction);
  const isPublic = !!(agent as any).isPublic;

  return (
    <div className="premium-agent-card">
      <div className="pa-glow" />
      <div className="pa-content">
        <div className="pa-left">
          <div className="pa-avatar-wrap">
            <div className="pa-avatar">
              <LuBot size={22} aria-hidden="true" />
            </div>
            <div className="pa-status-dot" />
          </div>
          <div className="pa-info">
            <div className="pa-name-row">
              <span className="pa-name">{displayName}</span>
              {isPublic && (
                <div
                  className="pa-public-badge"
                  title={t("createAgent.public") || "Public"}
                  aria-label={t("createAgent.public") || "Public"}
                >
                  <LuShieldCheck size={10} aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="pa-meta">
              <span className="pa-meta-item">
                <LuCpu size={10} aria-hidden="true" />
                {model}
              </span>
              <span className="pa-meta-sep">•</span>
              <span className="pa-meta-item">
                <LuSparkles size={10} aria-hidden="true" />
                {agent.temperature ?? 0.7}
              </span>
            </div>
            {introduction && <p className="pa-intro u-truncate-2">{introduction}</p>}
          </div>
        </div>
        <div className="pa-right">
          <button
            type="button"
            className="pa-action-btn"
            onClick={() => startDialog()}
            disabled={isStarting}
          >
            {isStarting ? "..." : t("createAgent.chat") || "开始对话"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAgentToolCard;
