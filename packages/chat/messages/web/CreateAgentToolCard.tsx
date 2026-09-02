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
import { withLiteralClass } from "./toolMessageShared";
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
    <div {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.glow)} />
      <div
        data-hook="messages-esc-pa-content"
        {...withLiteralClass("pa-content", styles.content)}
      >
        <div {...stylex.props(styles.left)}>
          <div {...stylex.props(styles.avatarWrap)}>
            <div {...stylex.props(styles.avatar)}>
              <LuBot size={22} aria-hidden="true" />
            </div>
            <div {...stylex.props(styles.statusDot)} />
          </div>
          <div {...stylex.props(styles.info)}>
            <div {...stylex.props(styles.titleRow)}>
              <span {...stylex.props(styles.name)}>{displayName}</span>
              {isPublic && (
                <div
                  {...stylex.props(styles.publicBadge)}
                  title={t("createAgent.public") || "Public"}
                  aria-label={t("createAgent.public") || "Public"}
                >
                  <LuShieldCheck size={10} aria-hidden="true" />
                </div>
              )}
            </div>
            <div {...stylex.props(styles.meta)}>
              <span {...stylex.props(styles.metaItem)}>
                <LuCpu size={10} aria-hidden="true" />
                {model}
              </span>
              <span {...stylex.props(styles.metaSep)}>•</span>
              <span {...stylex.props(styles.metaItem)}>
                <LuSparkles size={10} aria-hidden="true" />
                {agent.temperature ?? 0.7}
              </span>
            </div>
            {introduction && (
              <p
                data-hook="messages-esc-pa-intro"
                {...withLiteralClass("pa-intro u-truncate-2", styles.intro, styles.truncate2)}
              >
                {introduction}
              </p>
            )}
          </div>
        </div>
        <div
          data-hook="messages-esc-pa-right"
          {...withLiteralClass("pa-right", styles.right)}
        >
          <button
            type="button"
            data-hook="messages-esc-pa-action-btn"
            {...withLiteralClass("pa-action-btn", styles.actionBtn, isStarting && styles.actionBtnDisabled)}
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
