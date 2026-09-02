// 文件: render/web/ui/searchInput.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * SearchInput 样式 —— StyleX 迁移
 * （自原 ui.css「SearchInput」分区 + 「SearchInput 扩展」小节 1:1 迁出，
 * 迁出后已删除）
 *
 * 原 data-* 后代选择器（.search-form[data-x] .child）由 TSX 按状态
 * props 显式组合等价实现：
 * - size → fieldSmall / searchBtnSmall
 * - data-invalid → fieldInvalid（:focus-within 光晕变红随附）
 * - data-disabled → wrapperDisabled / fieldDisabled
 * - data-empty / data-dismissible → clear 可见性由 showClearControl
 *   一个 React 值驱动（原 CSS 兜底规则的语义已在 TSX 内聚）
 * - .input-field-wrapper:focus-within 用 StyleX 自身伪类表达；
 *   focus-within .search-icon-left 后代改由 input 的 onFocus/onBlur
 *   state 驱动 iconFocused。
 * - @media (max-width: 600px) 内嵌 media 变体。
 */
export const searchInputStyles = stylex.create({
  // .search-form（两处定义合并：宽度 + 布局）
  form: {
    width: "100%",
    minWidth: 240,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  // .search-container
  container: {
    display: "flex",
    gap: 8,
    width: "100%",
    alignItems: "center",
  },
  // .input-field-wrapper（拟物凹槽 + 胶囊）
  fieldWrapper: {
    position: "relative",
    flex: 1,
    display: "flex",
    alignItems: "center",
    height: "var(--control-lg)",
    backgroundColor: "var(--backgroundSecondary)",
    border: "1px solid var(--border)",
    borderRadius: 21,
    transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
    ":hover": {
      borderColor: "var(--borderHover)",
      backgroundColor: "var(--backgroundHover)",
    },
    ":focus-within": {
      backgroundColor: "var(--background)",
      borderColor: "var(--primary)",
      boxShadow:
        "0 0 0 3px var(--primary-alpha-10), inset 0 1px 1px rgba(0,0,0,0.02)",
    },
  },
  // .search-form--small .input-field-wrapper
  fieldWrapperSmall: {
    height: "var(--control-md)",
  },
  // .search-form[data-invalid] .input-field-wrapper
  fieldWrapperInvalid: {
    borderColor: "var(--danger, #d92d20)",
    ":focus-within": {
      boxShadow:
        "0 0 0 3px var(--danger-alpha-10, rgba(217, 45, 32, 0.15)), inset 0 1px 1px rgba(0,0,0,0.02)",
    },
  },
  // .search-form[data-disabled] .input-field-wrapper
  fieldWrapperDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  // .search-icon-left
  iconLeft: {
    position: "absolute",
    left: 12,
    color: "var(--textTertiary)",
    pointerEvents: "none",
    transition: "color 0.2s",
  },
  // .input-field-wrapper:focus-within .search-icon-left（state 驱动）
  iconLeftFocused: {
    color: "var(--primary)",
  },
  // .search-input-field
  field: {
    width: "100%",
    height: "100%",
    paddingBlock: 0,
    paddingInline: "38px 36px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--text)",
    fontSize: "var(--fontSize-md)",
    fontWeight: 450,
    lineHeight: "var(--leading-normal)",
    outline: "none",
    borderRadius: 21,
    "::placeholder": {
      color: "var(--placeholder)",
      fontWeight: 400,
      opacity: 0.8,
    },
    "@media (max-width: 600px)": {
      fontSize: "var(--fontSize-lg)",
    },
  },
  // .search-form[data-disabled] .search-input-field
  fieldDisabled: {
    cursor: "not-allowed",
  },
  // .clear-btn-wrapper（隐藏态为默认；visible 类由 showClearControl 驱动）
  clearWrapper: {
    position: "absolute",
    right: 8,
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  // .clear-btn-wrapper.visible
  clearWrapperVisible: {
    opacity: 1,
    transform: "scale(1)",
    pointerEvents: "auto",
  },
  // .clear-btn-wrapper 隐藏态
  clearWrapperHidden: {
    opacity: 0,
    transform: "scale(0.8)",
    pointerEvents: "none",
  },
  // .clear-icon-button
  clearButton: {
    width: 20,
    height: 20,
    border: "none",
    backgroundColor: "var(--backgroundSecondary)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--textTertiary)",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "var(--textTertiary)",
      color: "var(--background)",
    },
  },
  // .search-btn（作用于内层 Button，覆盖其高度/圆角/阴影）
  searchBtn: {
    height: "var(--control-lg)",
    borderRadius: 21,
    paddingInline: 20,
    boxShadow: "0 2px 6px rgba(var(--primary-rgb), 0.25)",
  },
  // .search-form--small .search-btn
  searchBtnSmall: {
    height: "var(--control-md)",
  },
  // .search-action（移动端隐藏）
  action: {
    display: {
      default: "flex",
      "@media (max-width: 600px)": "none",
    },
  },
  // .search-input-label
  label: {
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    fontWeight: 500,
    lineHeight: "var(--leading-normal)",
  },
  // .search-input-description
  description: {
    fontSize: "var(--fontSize-xs)",
    color: "var(--textTertiary)",
    lineHeight: "var(--leading-normal)",
  },
  // .search-input-error
  error: {
    fontSize: "var(--fontSize-xs)",
    color: "var(--danger, #d92d20)",
    lineHeight: "var(--leading-normal)",
  },
});
