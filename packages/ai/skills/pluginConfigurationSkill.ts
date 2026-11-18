import { PLUGIN_MANAGEMENT_TOOL_NAMES } from "../../agent-runtime/pluginManagementSpecs";
import { buildSkillDocMarkdown, type SkillDocConfig } from "./skillDocProtocol";

export const PLUGIN_CONFIGURATION_SKILL_SLUGS = ["plugin-configuration"] as const;
export const buildPluginConfigurationSkillId = (_slug: string) => "builtin-plugin-config-v1";
export const buildPluginConfigurationSkillPageKey = (userId: string, slug: string) =>
  `page-${userId}-${buildPluginConfigurationSkillId(slug)}`;

export function buildPluginConfigurationSkillConfig(_slug: string): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: buildPluginConfigurationSkillId(_slug),
    name: "插件配置助手（plugin-configuration）",
    description:
      "通过实际管理工具发现、启停、受控配置和诊断插件；按当前执行面与真实注册表判断可用性。",
    triggerMode: "explicit",
    toolNames: [...PLUGIN_MANAGEMENT_TOOL_NAMES],
  };
}

export function buildPluginConfigurationSkillContent(_slug: string): string {
  return buildSkillDocMarkdown({
    skillConfig: buildPluginConfigurationSkillConfig(_slug),
    body: `# 插件配置助手

先确认本轮实际提供了哪些管理工具；Skill 被加载不代表工具已接线或各端已支持。

- 用 listPlugins 读取真实注册表、账号状态及可用动作，不按预设名称猜字段，不为每个预设复制流程。
- 用 setPluginEnabled 修改已存在的开关；MCP 使用读取到的 connectionId 与 revision，冲突时重读，不覆盖未知状态。
- 用 configurePlugin 进入现有认证配置页面，凭据由用户在受控入口输入。返回 pending 只表示仍待交互，不能说保存完成；没有真实入口则报告 unavailable。
- diagnosePlugin 的 configuration 仅描述配置事实；connectivity 当前须交审批/执行桥，不能为诊断自行联网或启动程序。配置可用不等于连接可用或执行已获授权。
- 仅消费管理工具的脱敏结果；不要索取或输出 secret、endpoint、credentialRef、envRefs。local/machine 不可用时如实报告，不改成 server 或上传本机资源。

产品与权限原则引用 docs/product-foundation.md §5、docs/product/skill-model.md；当前管理契约见 packages/agent-runtime/pluginManagementSpecs.ts。Skill 不保存配置状态。`,
  });
}
