// packages/ai/agent/web/pluginPresentation.tsx
//
// 插件展示层的唯一映射表：把契约值翻成用户能读的词。
// 零 I/O、零状态，广场（PluginExplore）与配置页（PluginConfigPage）共用同一份，
// 避免两处各写一套标签导致同一插件在不同页面显示不同状态。

import React from "react";
import {
  LuBox,
  LuCloud,
  LuContainer,
  LuDroplet,
  LuGlobe,
  LuHardDrive,
  LuServer,
} from "react-icons/lu";

/** 6 个云厂商 + Instabox 的图标。 */
export const PLUGIN_ICONS: Record<string, React.ReactNode> = {
  docker: <LuContainer aria-hidden="true" />,
  cloudflare: <LuGlobe aria-hidden="true" />,
  gcp: <LuCloud aria-hidden="true" />,
  vultr: <LuServer aria-hidden="true" />,
  hetzner: <LuHardDrive aria-hidden="true" />,
  digitalocean: <LuDroplet aria-hidden="true" />,
  instabox: <LuBox aria-hidden="true" />,
};

/**
 * 凭据方式的人话。Instabox 走 API Key，与 api-token 同义（见 PluginExplore 的
 * INSTABOX_CREDENTIAL_MODE）。
 */
export const CREDENTIAL_MODE_LABEL: Record<string, string> = {
  "operator-binding": "由运营方绑定",
  "api-token": "使用 API Token",
  "oauth-adc": "使用服务账号凭据 (ADC)",
  oauth: "使用 OAuth 授权",
};

export const credentialModeLabel = (mode: string): string =>
  CREDENTIAL_MODE_LABEL[mode] ?? mode;

/** Instabox 用 API Key 绑定凭据，与云厂商的 api-token 同一句人话。 */
export const INSTABOX_CREDENTIAL_MODE = "api-token";

/**
 * 一句话定位：广场卡与配置页的标题下方共用同一句。
 * 技术字段（runtimeKey / 字段名 / capabilities）只出现在配置页的技术细节里。
 */
export const PLUGIN_POSITIONING: Record<string, { key: string; fallback: string }> = {
  instabox: {
    key: "explorePage.plugin.instaboxDesc",
    fallback:
      "提供隔离的云端容器与沙盒运行环境，支持安全的代码执行、动态调试与验证。",
  },
  docker: {
    key: "explorePage.plugin.positioningDocker",
    fallback: "在本机或远程 Docker 上部署与探活容器。",
  },
  cloudflare: {
    key: "explorePage.plugin.positioningCloudflare",
    fallback: "用 Cloudflare 账户把服务部署到边缘网络。",
  },
  gcp: {
    key: "explorePage.plugin.positioningGcp",
    fallback: "用 Google Cloud 服务账号部署与探活实例。",
  },
  vultr: {
    key: "explorePage.plugin.positioningVultr",
    fallback: "在 Vultr 开通与探活云主机。",
  },
  hetzner: {
    key: "explorePage.plugin.positioningHetzner",
    fallback: "在 Hetzner 开通与探活服务器。",
  },
  digitalocean: {
    key: "explorePage.plugin.positioningDigitalOcean",
    fallback: "在 DigitalOcean 开通与探活云主机。",
  },
};

export type PluginCardState = "connected" | "unconfigured" | "unavailable";

export const PLUGIN_STATE_BADGE: Record<PluginCardState, string> = {
  connected: "plugin-badge--configured",
  unconfigured: "plugin-badge--unconfigured",
  unavailable: "plugin-badge--unavailable",
};

export const PLUGIN_STATE_LABEL: Record<PluginCardState, string> = {
  connected: "已连接",
  unconfigured: "未配置",
  unavailable: "不可用",
};

/** 状态标签的 i18n key（广场与配置页都用同一组）。 */
export const PLUGIN_STATE_LABEL_KEY: Record<PluginCardState, string> = {
  connected: "explorePage.plugin.statusConnected",
  unconfigured: "explorePage.plugin.statusUnconfigured",
  unavailable: "explorePage.plugin.statusUnavailable",
};
