// 文件路径: chat/messages/web/UpdateAgentToolCard.tsx

import * as stylex from "@stylexjs/stylex";
import React from "react";
import { useAppSelector } from "app/store";
import { useTranslation } from "react-i18next";
import { LuBot, LuSparkles, LuCpu, LuShieldCheck, LuHistory, LuArrowRight, LuChevronDown, LuChevronUp, LuWrench } from "react-icons/lu";
import { useAgentDialog } from "ai/agent/hooks/useAgentDialog";
import { resolveDialogLaunchSpaceId } from "chat/dialog/dialogLaunchScope";
import type { Agent } from "app/types";
import { selectCurrentDialogConfig } from "chat/dialog/dialogSlice";
import { toTrimmedString } from "core/toTrimmedString";
import { resolveAgentCardDialogKey } from "./resolveAgentCardDialogKey";
import { messagesStyles as mStyles } from "./messagesStyles";
import { createAgentToolCardStyles as cStyles } from "./createAgentToolCardStyles";
import { withLiteralClass } from "./toolMessageShared";
import "./messagesStylexEscapeHatch.css";

interface UpdateAgentToolCardProps {
    rawData: any;
    isError: boolean;
}

const UpdateAgentToolCard: React.FC<UpdateAgentToolCardProps> = ({ rawData, isError }) => {
    const { t } = useTranslation("ai");
    const [showChanges, setShowChanges] = React.useState(true); // 更新卡片默认展开变更

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
    const changes = (agent as any)._changes;

    const renderChangeValue = (val: any) => {
        if (val === undefined || val === null || val === "") return <span className="u-dim-more">none</span>;
        if (typeof val === 'boolean') return val ? 'True' : 'False';
        if (Array.isArray(val)) {
            if (val.length === 0) return <span className="u-dim-more">empty</span>;
            return val.map(v => typeof v === 'object' ? (v.label || v.title || JSON.stringify(v)) : String(v)).join(', ');
        }
        if (typeof val === 'object') {
            if (val.text) return val.text;
            return JSON.stringify(val);
        }
        return String(val);
    };

    const fieldLabels: Record<string, string> = {
        name: t("agentFields.name") || "名称",
        model: t("agentFields.model") || "模型",
        provider: t("agentFields.provider") || "提供商",
        prompt: t("agentFields.prompt") || "系统提示词",
        introduction: t("agentFields.introduction") || "简介",
        greeting: t("agentFields.greeting") || "欢迎语",
        temperature: t("agentFields.temperature") || "温度",
        isPublic: t("agentFields.isPublic") || "公开状态",
        tags: t("agentFields.tags") || "标签",
        tools: t("agentFields.tools") || "工具",
        references: t("agentFields.references") || "知识引用",
        reasoning_effort: t("agentFields.reasoning_effort") || "推理强度",
    };

    return (
        <div {...stylex.props(cStyles.card, mStyles.uatcCard)}>
            <div {...stylex.props(mStyles.uatcGlow)} />
            <div
                data-hook="messages-esc-pa-content"
                {...withLiteralClass("pa-content", cStyles.content, mStyles.uatcContent)}
            >
                <div {...stylex.props(cStyles.left)}>
                    <div {...stylex.props(cStyles.avatarWrap)}>
                        <div {...stylex.props(cStyles.avatar)}>
                            <LuWrench size={22} aria-hidden="true" />
                        </div>
                        <div {...stylex.props(cStyles.statusDot)} />
                    </div>
                    <div {...stylex.props(cStyles.info)}>
                        <div {...stylex.props(cStyles.titleRow)}>
                            <span {...stylex.props(cStyles.name)}>{displayName}</span>
                            <div {...stylex.props(mStyles.uatcUpdatedBadge)}>
                                {t("updateAgent.badge") || "已更新"}
                            </div>
                        </div>
                        <div {...stylex.props(cStyles.meta)}>
                            <span {...stylex.props(cStyles.metaItem)}>
                                <LuCpu size={10} aria-hidden="true" />
                                {model}
                            </span>
                            <span {...stylex.props(cStyles.metaSep)}>•</span>
                            {isPublic && (
                                <span {...stylex.props(cStyles.metaItem)}>
                                    <LuShieldCheck size={10} aria-hidden="true" />
                                    {t("createAgent.public") || "Public"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div
                    data-hook="messages-esc-pa-right"
                    {...withLiteralClass("pa-right", cStyles.right)}
                >
                    <button
                        type="button"
                        data-hook="messages-esc-pa-action-btn"
                        {...withLiteralClass("pa-action-btn", cStyles.actionBtn, isStarting && cStyles.actionBtnDisabled)}
                        onClick={() => startDialog()}
                        disabled={isStarting}
                    >
                        {isStarting ? "..." : t("createAgent.chat") || "开始对话"}
                    </button>
                </div>
            </div>

            {changes && (
                <div className="pa-update-footer">
                    <button
                        type="button"
                        className="pa-expand-btn"
                        onClick={() => setShowChanges(!showChanges)}
                    >
                        <LuHistory size={12} aria-hidden="true" />
                        <span>{showChanges ? (t("updateAgent.hideChanges") || "收起变更详情") : (t("updateAgent.viewChanges") || "查看更新内容")}</span>
                        {showChanges ? (
                            <LuChevronUp size={14} aria-hidden="true" />
                        ) : (
                            <LuChevronDown size={14} aria-hidden="true" />
                        )}
                    </button>

                    {showChanges && (
                        <div className="pa-changes-list">
                            {Object.entries(changes).map(([key, diff]: [string, any]) => (
                                <div key={key} className="pa-change-item">
                                    <div className="pa-change-header">
                                        <span className="pa-change-label">{fieldLabels[key] || key}</span>
                                    </div>
                                    <div className="pa-change-body">
                                        <div className="pa-change-old">{renderChangeValue(diff.o)}</div>
                                        <LuArrowRight size={12} className="pa-change-arrow" aria-hidden="true" />
                                        <div className="pa-change-new">{renderChangeValue(diff.n)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UpdateAgentToolCard;
