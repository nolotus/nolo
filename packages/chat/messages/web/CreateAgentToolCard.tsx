// 文件路径: chat/messages/web/CreateAgentToolCard.tsx

import * as stylex from "@stylexjs/stylex";
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
import { createAgentToolCardStyles as styles } from "./createAgentToolCardStyles";
import "./messagesStylexEscapeHatch.css";

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
    <div className="premium-agent-card" {...stylex.props(styles.card)}>
      <div className="pa-glow" {...stylex.props(styles.glow)} />
      <div
        className="pa-content"
        {...stylex.props(styles.content)}
        data-hook="messages-esc-pa-content"
      >
        <div className="pa-left" {...stylex.props(styles.left)}>
          <div className="pa-avatar-wrap" {...stylex.props(styles.avatarWrap)}>
            <div className="pa-avatar" {...stylex.props(styles.avatar)}>
              <LuBot size={22} aria-hidden="true" />
            </div>
            <div className="pa-status-dot" {...stylex.props(styles.statusDot)} />
          </div>
          <div className="pa-info" {...stylex.props(styles.info)}>
            <div className="pa-name-row" {...stylex.props(styles.titleRow)}>
              <span className="pa-name" {...stylex.props(styles.name)}>{displayName}</span>
              {isPublic && (
                <div
                  className="pa-public-badge"
                  {...stylex.props(styles.publicBadge)}
                  title={t("createAgent.public") || "Public"}
                  aria-label={t("createAgent.public") || "Public"}
                >
                  <LuShieldCheck size={10} aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="pa-meta" {...stylex.props(styles.meta)}>
              <span className="pa-meta-item" {...stylex.props(styles.metaItem)}>
                <LuCpu size={10} aria-hidden="true" />
                {model}
              </span>
              <span className="pa-meta-sep" {...stylex.props(styles.metaSep)}>•</span>
              <span className="pa-meta-item" {...stylex.props(styles.metaItem)}>
                <LuSparkles size={10} aria-hidden="true" />
                {agent.temperature ?? 0.7}
              </span>
            </div>
            {introduction && (
              <p
                className="pa-intro u-truncate-2"
                {...stylex.props(styles.intro, styles.truncate2)}
                data-hook="messages-esc-pa-intro"
              >
                {introduction}
              </p>
            )}
          </div>
        </div>
        <div
          className="pa-right"
          {...stylex.props(styles.right)}
          data-hook="messages-esc-pa-right"
        >
          <button
            type="button"
            className="pa-action-btn"
            {...stylex.props(styles.actionBtn, isStarting && styles.actionBtnDisabled)}
            data-hook="messages-esc-pa-action-btn"
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
