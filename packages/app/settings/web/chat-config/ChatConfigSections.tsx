import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuChevronDown,
  LuChevronUp,
  LuFolderOpen,
} from "react-icons/lu";

import { NumberInput } from "render/web/form/Input";
import ToggleSwitch from "render/web/ui/ToggleSwitch";

import SettingSection from "./SettingSection";
import {
  HIGH_IMPACT_SELF_UPDATE_FIELDS,
  PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS,
  type AgentUpdateField,
} from "ai/policy/selfUpdateFields";

interface ChatConfigSectionsProps {
  autoApproveSelfUpdateFields: AgentUpdateField[];
  onToggleAutoApproveSelfUpdateField: (field: AgentUpdateField) => void;
  aiRecentContentLimit: number;
  onAiRecentContentLimitChange: (value: number) => void;
  showScrollToTopButton: boolean;
  onShowScrollToTopButtonChange: (value: boolean) => void;
  showScrollToBottomButton: boolean;
  onShowScrollToBottomButtonChange: (value: boolean) => void;
}

const PRIMARY_FIELD_SET = new Set<AgentUpdateField>(
  PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS,
);
const HIGH_IMPACT_FIELD_SET = new Set<AgentUpdateField>(
  HIGH_IMPACT_SELF_UPDATE_FIELDS,
);

const ChatConfigSections: React.FC<ChatConfigSectionsProps> = ({
  autoApproveSelfUpdateFields,
  onToggleAutoApproveSelfUpdateField,
  aiRecentContentLimit,
  onAiRecentContentLimitChange,
  showScrollToTopButton,
  onShowScrollToTopButtonChange,
  showScrollToBottomButton,
  onShowScrollToBottomButtonChange,
}) => {
  const { t } = useTranslation();
  const [showAdvancedSelfUpdateFields, setShowAdvancedSelfUpdateFields] =
    useState(false);

  const selfUpdateFieldOptions: Array<{
    field: AgentUpdateField;
    label: string;
    description: string;
  }> = [
    {
      field: "greeting",
      label: t("chat.agentBehavior.selfUpdate.greeting", "欢迎语"),
      description: t(
        "chat.agentBehavior.selfUpdate.greetingDesc",
        "调整开场文案或快捷菜单。",
      ),
    },
    {
      field: "introduction",
      label: t("chat.agentBehavior.selfUpdate.introduction", "简介"),
      description: t(
        "chat.agentBehavior.selfUpdate.introductionDesc",
        "更新 Agent 对外展示的简介。",
      ),
    },
    {
      field: "tags",
      label: t("chat.agentBehavior.selfUpdate.tags", "标签"),
      description: t(
        "chat.agentBehavior.selfUpdate.tagsDesc",
        "更新标签和轻量分类信息。",
      ),
    },
    {
      field: "prompt",
      label: t("chat.agentBehavior.selfUpdate.prompt", "系统提示词"),
      description: t(
        "chat.agentBehavior.selfUpdate.promptDesc",
        "高影响字段，默认建议保持询问。",
      ),
    },
    {
      field: "references",
      label: t("chat.agentBehavior.selfUpdate.references", "知识引用"),
      description: t(
        "chat.agentBehavior.selfUpdate.referencesDesc",
        "会改变 Agent 默认参考的文档和页面。",
      ),
    },
    {
      field: "tools",
      label: t("chat.agentBehavior.selfUpdate.tools", "工具"),
      description: t(
        "chat.agentBehavior.selfUpdate.toolsDesc",
        "会改变 Agent 可调用的工具能力。",
      ),
    },
    {
      field: "model",
      label: t("chat.agentBehavior.selfUpdate.model", "模型"),
      description: t(
        "chat.agentBehavior.selfUpdate.modelDesc",
        "更换底层模型。",
      ),
    },
    {
      field: "provider",
      label: t("chat.agentBehavior.selfUpdate.provider", "提供商"),
      description: t(
        "chat.agentBehavior.selfUpdate.providerDesc",
        "更换模型提供方。",
      ),
    },
    {
      field: "isPublic",
      label: t("chat.agentBehavior.selfUpdate.public", "公开状态"),
      description: t(
        "chat.agentBehavior.selfUpdate.publicDesc",
        "切换是否公开展示。",
      ),
    },
    {
      field: "temperature",
      label: t("chat.agentBehavior.selfUpdate.temperature", "Temperature"),
      description: t(
        "chat.agentBehavior.selfUpdate.temperatureDesc",
        "调整生成随机性。",
      ),
    },
    {
      field: "top_p",
      label: t("chat.agentBehavior.selfUpdate.topP", "Top P"),
      description: t(
        "chat.agentBehavior.selfUpdate.topPDesc",
        "调整 nucleus sampling。",
      ),
    },
    {
      field: "frequency_penalty",
      label: t(
        "chat.agentBehavior.selfUpdate.frequencyPenalty",
        "Frequency penalty",
      ),
      description: t(
        "chat.agentBehavior.selfUpdate.frequencyPenaltyDesc",
        "调整重复惩罚。",
      ),
    },
    {
      field: "presence_penalty",
      label: t(
        "chat.agentBehavior.selfUpdate.presencePenalty",
        "Presence penalty",
      ),
      description: t(
        "chat.agentBehavior.selfUpdate.presencePenaltyDesc",
        "调整新话题激励。",
      ),
    },
    {
      field: "max_tokens",
      label: t("chat.agentBehavior.selfUpdate.maxTokens", "Max tokens"),
      description: t(
        "chat.agentBehavior.selfUpdate.maxTokensDesc",
        "调整单次回复最大 token 数。",
      ),
    },
    {
      field: "reasoning_effort",
      label: t("chat.agentBehavior.selfUpdate.reasoningEffort", "推理强度"),
      description: t(
        "chat.agentBehavior.selfUpdate.reasoningEffortDesc",
        "调整 reasoning effort。",
      ),
    },
    {
      field: "name",
      label: t("chat.agentBehavior.selfUpdate.name", "名称"),
      description: t(
        "chat.agentBehavior.selfUpdate.nameDesc",
        "修改 Agent 名称。",
      ),
    },
  ];

  const primarySelfUpdateFieldOptions = selfUpdateFieldOptions.filter(
    (option) => PRIMARY_FIELD_SET.has(option.field),
  );
  const advancedSelfUpdateFieldOptions = selfUpdateFieldOptions.filter(
    (option) => !PRIMARY_FIELD_SET.has(option.field),
  );

  const renderSelfUpdateFieldOption = (option: {
    field: AgentUpdateField;
    label: string;
    description: string;
  }) => (
    <label key={option.field} className="ChatConfigSections__subSetting">
      <span className="ChatConfigSections__subSettingHeader">
        <span className="ChatConfigSections__subSettingLabel">
          {option.label}
        </span>
        <span className="ChatConfigSections__subSettingDescription">
          {option.description}
        </span>
      </span>
      <ToggleSwitch
        checked={autoApproveSelfUpdateFields.includes(option.field)}
        onChange={() => onToggleAutoApproveSelfUpdateField(option.field)}
      />
    </label>
  );

  return (
    <>
      <SettingSection
        title={t("chat.agentBehavior.selfUpdate.title", "updateSelf 免询问字段")}
        description={t(
          "chat.agentBehavior.selfUpdate.description",
          "仅建议对低风险字段（欢迎语、简介、标签）默认免询问；其他字段请按需在高级列表中开启。高影响字段建议保持关闭。",
        )}
      >
        <div className="ChatConfigSections__stack">
          {primarySelfUpdateFieldOptions.map(renderSelfUpdateFieldOption)}

          <div className="ChatConfigSections__advanced">
            <button
              type="button"
              className="ChatConfigSections__advancedToggle"
              aria-expanded={showAdvancedSelfUpdateFields}
              onClick={() =>
                setShowAdvancedSelfUpdateFields((open) => !open)
              }
            >
              {showAdvancedSelfUpdateFields ? (
                <LuChevronUp size={14} aria-hidden="true" />
              ) : (
                <LuChevronDown size={14} aria-hidden="true" />
              )}
              {t("chat.agentBehavior.selfUpdate.advanced", "高级字段")}
            </button>

            {showAdvancedSelfUpdateFields ? (
              <div className="ChatConfigSections__stack">
                {advancedSelfUpdateFieldOptions.some((option) =>
                  HIGH_IMPACT_FIELD_SET.has(option.field),
                ) ? (
                  <p className="ChatConfigSections__advancedNote">
                    {t(
                      "chat.agentBehavior.selfUpdate.advancedNote",
                      "高影响字段建议保持关闭。",
                    )}
                  </p>
                ) : null}
                {advancedSelfUpdateFieldOptions.map(renderSelfUpdateFieldOption)}
              </div>
            ) : null}
          </div>
        </div>
      </SettingSection>

      <SettingSection
        title={t("chat.recentContentLimit.title", "最近内容数量")}
        description={t(
          "chat.recentContentLimit.description",
          "设置 AI 上下文中包含的最近文件数量。主要在“轻量读取 / 自适应读取”级别下生效。",
        )}
      >
        <div className="ChatConfigSections__inputWithIcon">
          <LuFolderOpen size={16} aria-hidden="true" />
          <NumberInput
            value={aiRecentContentLimit}
            onChange={onAiRecentContentLimitChange}
            min={10}
            max={200}
          />
        </div>
      </SettingSection>

      <SettingSection
        title={t("chat.scrollButtons.title", "快捷滚动按钮")}
        description={t(
          "chat.scrollButtons.description",
          "在对话页面右侧显示快捷滚动按钮，方便快速跳转到顶部或底部。",
        )}
      >
        <div className="ChatConfigSections__stack">
          <label className="ChatConfigSections__subSetting">
            <span className="ChatConfigSections__subSettingHeader">
              <span className="ChatConfigSections__subSettingLabel">
                <LuChevronUp
                  size={14}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 4,
                  }}
                  aria-hidden="true"
                />
                {t("chat.scrollButtons.top", "滚动到顶部")}
              </span>
            </span>
            <ToggleSwitch
              checked={showScrollToTopButton}
              onChange={() =>
                onShowScrollToTopButtonChange(!showScrollToTopButton)
              }
            />
          </label>
          <label className="ChatConfigSections__subSetting">
            <span className="ChatConfigSections__subSettingHeader">
              <span className="ChatConfigSections__subSettingLabel">
                <LuChevronDown
                  size={14}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 4,
                  }}
                  aria-hidden="true"
                />
                {t("chat.scrollButtons.bottom", "滚动到底部")}
              </span>
            </span>
            <ToggleSwitch
              checked={showScrollToBottomButton}
              onChange={() =>
                onShowScrollToBottomButtonChange(!showScrollToBottomButton)
              }
            />
          </label>
        </div>
      </SettingSection>
    </>
  );
};

export default ChatConfigSections;
