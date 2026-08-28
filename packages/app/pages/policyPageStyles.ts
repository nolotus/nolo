import * as stylex from "@stylexjs/stylex";

/**
 * 静态政策页（隐私政策 / 服务条款 / AUP）共享样式 —— StyleX 试点迁移
 * （2026-08-28，自原 PrivacyPolicyPage.css 1:1 迁出）。
 *
 * 与原 BEM CSS 保持 1:1：同一元素、同一声明、同值；
 * 载体从原 CSS 文件中的 .PrivacyPolicyPage__* 类名替换为 StyleX 静态样式对象，
 * 由构建期 @stylexjs/unplugin 编译为原子类名并聚合进 entry CSS（见 scripts/dev/esbuild.config.js 的 stylex 管线）。
 */
export const policyPageStyles = stylex.create({
  page: {
    padding: "40px 20px",
    maxWidth: "800px",
    margin: "0 auto",
    color: "var(--nolo-color-text)",
    lineHeight: 1.6,
  },
  title: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "8px",
  },
  lastUpdated: {
    fontSize: "14px",
    color: "var(--nolo-color-text-tertiary)",
    marginBottom: "32px",
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: 600,
    marginBottom: "12px",
  },
  list: {
    paddingLeft: "20px",
    listStyleType: "disc",
  },
  listItem: {
    marginBottom: "8px",
  },
});
