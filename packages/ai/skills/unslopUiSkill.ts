import { buildSkillDocMarkdown, type SkillDocConfig } from "./skillDocProtocol";

export const UNSLOP_UI_SKILL_SLUG = "unslop-ui";
export const UNSLOP_UI_SKILL_ID = "builtin-unslop-ui-skill-v1";

export function buildUnslopUiSkillConfig(): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: UNSLOP_UI_SKILL_ID,
    name: "界面去冗余（unslop-ui）",
    description: "按需审查现有页面、表单、仪表盘和图表：精简重复说明、装饰标签和图表噪音；默认不改视觉风格。",
    triggerMode: "explicit",
  };
}

const BODY = `# 界面去冗余（unslop-ui）

Nolo 独立编写的适配版。参考 Felipe Basurto 的 [unslop-ui（MIT）](https://github.com/felipebasurto/unslop-ui/blob/cd891160453f26aaacc569bad96a8d10d595076d/skills/unslop-ui/SKILL.md)；不执行上游脚本，不安装依赖，不授予工具权限。

## 审查做法

1. 明确当前页面的任务和用户要做的决定。读真实渲染和相关代码；看不到页面时，说明结论仅基于代码。
2. 找出不改变理解或操作的信息：标题上重复分类的短标签、无顺序含义的编号、复述标题的副标题、解释眼前可见内容的说明、误留的设计备注、只用于装饰的徽章/图标/状态点。逐项问：删掉会让用户少知道什么，或更难完成哪一步？没有具体问题才建议移除。
3. 图表保留单位、时间范围、尺度、基准及关键状态；能清楚直标时才考虑去掉重复图例。不要删掉多序列辨识、非颜色区分、历史对比或正确解读数据所必需的信息。
4. 默认只审查文案和装饰信息。渐变、发光、过重字重、过大间距、装饰动效，仅在用户明确要求审查视觉表面时处理；优先使用项目现有组件和设计 token，不重做布局或流程。
5. 保留表单可见标签、图标按钮的可读名称、空态行动指引、必要的权限/风险提示、真实状态和无障碍线索。不能用“去冗余”替代项目对缩减用户可见能力的确认要求。没有值得删的就不改，不以命中数为目标。
6. 获准修改后核对真实渲染：没有空容器、残留间距或丢失的交互。按位置报告建议或改动、保留的必要信息，以及未验证的范围。`;

export function buildUnslopUiSkillContent(): string {
  return buildSkillDocMarkdown({ body: BODY, skillConfig: buildUnslopUiSkillConfig() });
}
