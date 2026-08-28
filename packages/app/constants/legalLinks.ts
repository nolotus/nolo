// 法务文件入口的单一真值。
//
// Waffo 进件审核要求《服务条款》《隐私政策》《AIGC 可接受使用规范》
// 必须能从站内导航直达。站点页脚（render/layout/SiteFooter）与工作区
// 侧栏菜单（chat/web/sidebar/SidebarUserSection）共用本清单，避免两处漂移。
//
// i18nKey 复用各法务页自身的标题 key，五种语言均已存在，无需额外翻译。

export const LEGAL_LINKS = [
  { to: "/terms", i18nKey: "terms.title", fallback: "服务条款" },
  { to: "/privacy", i18nKey: "privacy.title", fallback: "隐私政策" },
  { to: "/aup", i18nKey: "aup.title", fallback: "AIGC 可接受使用规范" },
] as const;
