// packages/ai/agent/web/PluginExplore.tsx
//
// 插件广场：只做介绍与入口。
// 凭据表单、就绪检查、技术明细折叠全部迁到 /plugins/:pluginId（PluginConfigPage），
// 这里的卡片上没有任何输入控件——点「配置」进独立页面再填。

import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "app/routing";
import { useAppSelector } from "app/store";
import { useToken } from "identity";
import { selectRemoteServer } from "app/settings/settingSlice";
import { CLOUD_PLUGIN_SPECS } from "../../../agent-runtime/cloudPluginSpecs";
import {
  INSTABOX_CREDENTIAL_MODE,
  PLUGIN_ICONS,
  PLUGIN_POSITIONING,
  PLUGIN_STATE_BADGE,
  PLUGIN_STATE_LABEL,
  PLUGIN_STATE_LABEL_KEY,
  credentialModeLabel,
  type PluginCardState,
} from "./pluginPresentation";
import { usePluginCardStates } from "./pluginStatus";
import "./PluginExplore.css";
import { UI_PLUGIN_SPECS } from "app/plugins/uiPlugins";
import { useUiPlugins } from "app/hooks/index";

const INSTABOX_ID = "instabox";

type PluginIntro = {
  id: string;
  name: string;
  credentialMode: string;
};

const PluginIntroCard: React.FC<{
  plugin: PluginIntro;
  state: PluginCardState;
  fullWidth?: boolean;
}> = ({ plugin, state, fullWidth }) => {
  const { t } = useTranslation();
  const classes = fullWidth ? "plugin-card plugin-card--full" : "plugin-card";
  const positioning = PLUGIN_POSITIONING[plugin.id];

  return (
    <section className={classes} data-testid={`plugin-card-${plugin.id}`}>
      <header className="plugin-card__header">
        <div className="plugin-card__header-left">
          <div className="plugin-card__icon">{PLUGIN_ICONS[plugin.id]}</div>
          <div className="plugin-card__title-row">
            <h3 className="plugin-card__title">{plugin.name}</h3>
          </div>
        </div>
        <div className="plugin-card__header-right">
          <span className={`plugin-badge ${PLUGIN_STATE_BADGE[state]}`}>
            {t(PLUGIN_STATE_LABEL_KEY[state], PLUGIN_STATE_LABEL[state])}
          </span>
        </div>
      </header>

      <p className="plugin-card__desc">
        {t(positioning.key, positioning.fallback)}
      </p>

      <p className="plugin-card__method">
        <span className="plugin-card__method-label">
          {t("explorePage.plugin.credentialMethod", "凭据方式")}
        </span>
        <span className="plugin-card__method-value">
          {credentialModeLabel(plugin.credentialMode)}
        </span>
      </p>

      <div className="plugin-card__actions">
        <Link to={`/plugins/${plugin.id}`} className="plugin-card__configure">
          {t("explorePage.plugin.configure", "配置")}
        </Link>
      </div>
    </section>
  );
};

export const PluginExplore: React.FC = () => {
  const { t } = useTranslation();
  // 同上：广场卡片的状态标签也只能来自当前归属账号的快照。
  const uiPlugins = useUiPlugins();
  const currentToken = useToken();
  const configuredServer = useAppSelector(selectRemoteServer);
  const currentServer =
    typeof window !== "undefined" && /^https?:\/\//.test(window.location.origin)
      ? window.location.origin.replace(/\/+$/, "")
      : configuredServer;

  // 登录与否都能看介绍；状态标签只是“服务端是否记录过凭据”的只读映射。
  const states = usePluginCardStates(currentToken || "", currentServer || "");

  return (
    <div className="plugin-explore" data-testid="plugin-explore">
      <div className="plugin-explore__grid">
        <section className="plugin-card" data-testid="plugin-card-agent-capabilities">
          <header className="plugin-card__header"><h3 className="plugin-card__title">Agent 能力</h3></header>
          <p className="plugin-card__desc">管理 Agent 内置能力开关，沿用已有配置与生效规则。</p>
          <Link className="plugin-config-page__empty-link" to="/plugins/agent-capabilities">配置</Link>
        </section>
        <section className="plugin-card" data-testid="plugin-card-data-sources">
          <header className="plugin-card__header"><h3 className="plugin-card__title">数据源</h3></header>
          <p className="plugin-card__desc">查看已注册数据源并配置启用偏好，保留现有权限与凭据。</p>
          <Link className="plugin-config-page__empty-link" to="/plugins/data-sources">配置</Link>
        </section>
        <div className="plugin-explore__section-head"><h2 className="plugin-explore__section-title">应用插件</h2></div>
        {UI_PLUGIN_SPECS.map(spec => <section key={spec.id} className="plugin-card" data-testid={`plugin-card-${spec.id}`}>
          <header className="plugin-card__header"><h3 className="plugin-card__title">{spec.title}</h3></header>
          <p className="plugin-card__desc">{spec.id === "music" ? "播放、搜索及管理本地音乐库。" : "独立日历面板占位，日程、提醒与同步尚未实现。"}</p>
          <p>{uiPlugins[spec.id] === "enabled" ? "已开启" : uiPlugins[spec.id] === "disabled" ? "已关闭" : "尚未创建"}</p>
          <Link className="plugin-config-page__empty-link" to={`/plugins/${spec.id}`}>{uiPlugins[spec.id] === "absent" ? "创建并开启" : "配置"}</Link>
        </section>)}

        <div className="plugin-explore__section-head">
          <h2 className="plugin-explore__section-title">
            {t("explorePage.plugin.sectionSandbox", "沙盒运行时")}
          </h2>
          <p className="plugin-explore__section-desc">
            {t("explorePage.plugin.sectionSandboxDesc", "配置后即可在隔离沙盒中运行、调试与验证代码。")}
          </p>
        </div>
        <PluginIntroCard
          plugin={{ id: INSTABOX_ID, name: "Instabox", credentialMode: INSTABOX_CREDENTIAL_MODE }}
          state={states[INSTABOX_ID] ?? "unconfigured"}
          fullWidth
        />

        <div className="plugin-explore__section-head">
          <h2 className="plugin-explore__section-title">
            {t("explorePage.plugin.sectionCloud", "云服务连接")}
          </h2>
          <p className="plugin-explore__section-desc">
            {t("explorePage.plugin.sectionCloudDesc", "为各云厂商保存个人凭据，用于部署与探活。")}
          </p>
        </div>
        {CLOUD_PLUGIN_SPECS.map((spec) => (
          <PluginIntroCard
            key={spec.id}
            plugin={{
              id: spec.id,
              name: spec.displayName,
              credentialMode: spec.credentialMode,
            }}
            state={states[spec.id] ?? "unconfigured"}
          />
        ))}
      </div>
    </div>
  );
};

export default PluginExplore;
