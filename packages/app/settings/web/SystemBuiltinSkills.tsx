import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  setSettings,
  selectSystemBuiltinSkills,
} from "app/settings/settingSlice";
import ToggleSwitch from "render/web/ui/ToggleSwitch";
import { SYSTEM_AGENT_CAPABILITIES } from "ai/tools/agentCapabilities";

const SettingSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="setting-section">
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      <p className="section-description">{description}</p>
    </div>
    <div className="section-content">{children}</div>
  </section>
);

/**
 * Agent 能力全局开关设置页。
 *
 * 每个 Nolo 自带的 Agent 能力（首个为「联网搜索」/web-search）在这里有一个开关，
 * 状态存入 `SettingState.systemBuiltinSkills`，默认全开。关闭后三端运行时
 * （Web / CLI / 桌面）统一从工具面过滤掉该能力包含的工具——agent 不再注入
 * 对应工具，也无法调用。这是全局层开关，与每个 agent 的 `enabledPacks`
 * （单个 agent 的能力勾选）正交：全局关 = 所有 agent 都失去该能力。
 */
const SystemBuiltinSkills: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const systemBuiltinSkills = useAppSelector(selectSystemBuiltinSkills);

  // Agent 能力展示元数据直接来自统一注册表；仅覆盖可翻译文案。
  // 新增全局能力时只需修改 agentCapabilities.ts。
  const capabilityMeta = useMemo(
    () =>
      SYSTEM_AGENT_CAPABILITIES.map((capability) => ({
        ...capability,
        label:
          capability.id === "web-search"
            ? t("settings.systemSkills.webSearch.label", capability.label)
            : capability.id === "conversation-todo"
              ? t("settings.systemSkills.conversationTodo.label", capability.label)
              : capability.label,
        description:
          capability.id === "web-search"
            ? t(
                "settings.systemSkills.webSearch.description",
                "允许 agent 搜索互联网、抓取网页内容，获取最新信息。关闭后所有 agent 不再具备联网搜索能力。",
              )
            : capability.id === "conversation-todo"
              ? t(
                  "settings.systemSkills.conversationTodo.description",
                  "允许 agent 在多步骤对话中显示和更新任务进度。关闭后不再显示或调用对话 Todo。",
                )
              : capability.description,
      })),
    [t],
  );

  const handleToggle = useCallback(
    (packId: string, enabled: boolean) => {
      void dispatch(
        setSettings({
          systemBuiltinSkills: {
            ...systemBuiltinSkills,
            [packId]: enabled,
          },
        }),
      );
    },
    [dispatch, systemBuiltinSkills],
  );

  return (
    <div className="productivity-page system-skills-page">
      <h1 className="page-title">
        {t("settings.systemSkills.title", "Agent 能力")}
      </h1>

      <SettingSection
        title={t(
          "settings.systemSkills.builtinSkills.title",
          "Agent 能力开关",
        )}
        description={t(
          "settings.systemSkills.builtinSkills.description",
          "Nolo 自带的 Agent 能力，默认开启。关闭后所有 agent（Web / CLI / 桌面）都不再注入对应工具。每个 agent 的能力勾选不受影响。",
        )}
      >
        <ul className="agent-capability-list">
          {capabilityMeta.map((skill) => {
            // 缺失 key 视为开启（与默认语义一致）。
            const enabled = systemBuiltinSkills[skill.id] !== false;
            return (
              <li key={skill.id} className="agent-capability-item">
                <div className="agent-capability-item__copy">
                  <div className="agent-capability-item__title">{skill.label}</div>
                  <div className="agent-capability-item__description">
                    {skill.description}
                  </div>
                </div>
                <div className="agent-capability-item__control">
                  <ToggleSwitch
                    checked={enabled}
                    onChange={(next) => handleToggle(skill.id, next)}
                    label={skill.label}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </SettingSection>
    </div>
  );
};

export default SystemBuiltinSkills;