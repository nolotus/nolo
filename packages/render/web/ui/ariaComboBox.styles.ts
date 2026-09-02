// 文件: render/web/ui/ariaComboBox.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * AriaComboBox 样式 —— StyleX 迁移（自 AriaComboBox.css 1:1 迁出，迁出后该文件已删除）
 *
 * 原样式挂在 react-aria 自动类名（.react-aria-ComboBox/.react-aria-Label/
 * .react-aria-Input）上并以后代选择器组合；迁移后由 TSX 直接给各元素传
 * stylex 类。原 react-aria-Input 的 !important reset 是防全局 CSS 干扰——
 * StyleX 原子类 specificity 不劣于全局元素选择器，去 !important。
 * trigger 的 data-hovered/pressed/focus-visible 由 react-aria 自动设置，
 * 用属性变体键承接。popover 的宽度变量 --trigger-width 由 react-aria
 * 在 popover 元素上注入（Popover 组件保留 data-trigger 属性）。
 */
export const comboBoxStyles = stylex.create({
  // .react-aria-ComboBox
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)",
    width: "100%",
  },
  // .react-aria-ComboBox .react-aria-Label
  label: {
    fontSize: "var(--fontSize-sm, 14px)",
    fontWeight: 550,
    color: "var(--textSecondary, #4b5563)",
  },
  // .react-aria-ComboBox .combobox-field
  field: {
    display: "flex",
    alignItems: "center",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border, #d1d5db)",
    borderRadius: "var(--radius-sm, 6px)",
    backgroundColor: "var(--background, #ffffff)",
    overflow: "hidden",
    position: "relative",
    transition: "border-color 0.12s ease, box-shadow 0.12s ease",
    minHeight: "var(--control-lg, 40px)",
    boxSizing: "border-box",
    ":focus-within": {
      borderColor: "var(--primary, #3b82f6)",
      boxShadow: "0 0 0 3px var(--primaryGhost, rgba(59, 130, 246, 0.15))",
    },
  },
  // .react-aria-ComboBox .react-aria-Input（reset；Input 是 TSX 渲染的元素）
  input: {
    borderWidth: 0,
    borderStyle: "none",
    outline: "none",
    backgroundColor: "transparent",
    flex: 1,
    height: "100%",
    paddingInline: "var(--space-3)",
    fontSize: "var(--fontSize-sm, 14px)",
    color: "var(--text, #111827)",
    boxShadow: "none",
  },
  // .react-aria-ComboBox .combobox-trigger
  trigger: {
    borderWidth: 0,
    borderStyle: "none",
    borderRadius: 0,
    margin: 0,
    backgroundColor: "transparent",
    color: "var(--textTertiary, #9ca3af)",
    width: 36,
    // flex 容器里 height:100% 会塌成图标高度，改用 stretch 撑满整个输入框
    alignSelf: "stretch",
    height: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    outline: "none",
    padding: 0,
    transition: "color 0.1s ease, background-color 0.1s ease",
    "[data-hovered]": {
      color: "var(--textSecondary, #4b5563)",
      backgroundColor: "var(--backgroundHover, var(--backgroundSecondary))",
    },
    "[data-pressed]": {
      color: "var(--textSecondary, #4b5563)",
      backgroundColor: "var(--backgroundHover, var(--backgroundSecondary))",
    },
    "[data-focus-visible]": {
      boxShadow: "inset 0 0 0 2px var(--primary)",
    },
  },
  // .combobox-popover[data-trigger="ComboBox"]（data-trigger 由 Popover 组件设置）
  popover: {
    width: "var(--trigger-width)",
    padding: "var(--space-1, 4px)",
    boxSizing: "border-box",
  },
});
