// packages/render/web/ui/combobox.styles.ts
//
// Combobox 样式 —— StyleX 迁移（自 Combobox.tsx 内联 <style>{COMBOBOX_STYLES}</style> 1:1 迁出）
// 状态与变体（size/variant/open/error/disabled/placeholder/selected/highlighted）全部通过
// props 显式挂载原子类，消除组件挂载时的运行时 <style> 注入。
import * as stylex from "@stylexjs/stylex";

const comboboxPanelEnter = stylex.keyframes({
  from: {
    opacity: 0,
    transform: "translateY(-4px) scale(0.97)",
  },
  to: {
    opacity: 1,
    transform: "translateY(0) scale(1)",
  },
});

export const comboboxStyles = stylex.create({
  root: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)",
    width: "100%",
    fontFamily: "inherit",
  },
  label: {
    fontSize: "var(--fontSize-sm, 0.875rem)",
    fontWeight: 500,
    color: "var(--text)",
    marginBottom: "var(--space-1, 4px)",
  },
  trigger: {
    position: "relative",
    width: "100%",
    borderRadius: "var(--radius-sm)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: "var(--border)",
      ":hover": "var(--borderHover, var(--textTertiary))",
      ":focus-visible": "var(--primary)",
    },
    backgroundColor: "var(--background)",
    color: "var(--text)",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: {
      default:
        "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    outline: "none",
    boxShadow: {
      default: "var(--shadow1, 0 1px 2px rgba(0, 0, 0, 0.05))",
      ":focus-visible":
        "0 0 0 3px var(--focus, var(--primaryGhost, color-mix(in srgb, var(--primary) 18%, transparent)))",
    },
    zIndex: {
      default: null,
      ":focus-visible": 2,
    },
  },
  triggerVariantGhost: {
    backgroundColor: {
      default: "transparent",
      ":hover": "var(--backgroundHover)",
    },
    borderColor: {
      default: "transparent",
      ":hover": "transparent",
      ":focus-visible": "var(--primary)",
    },
    boxShadow: {
      default: "none",
      ":focus-visible":
        "0 0 0 3px var(--focus, var(--primaryGhost, color-mix(in srgb, var(--primary) 18%, transparent)))",
    },
  },
  triggerVariantGhostOpen: {
    backgroundColor: {
      default: "transparent",
      ":hover": "transparent",
    },
  },
  triggerVariantFilled: {
    backgroundColor: "var(--backgroundSecondary)",
    borderColor: {
      default: "transparent",
      ":hover": "var(--borderHover, var(--textTertiary))",
      ":focus-visible": "var(--primary)",
    },
  },
  triggerSizeSmall: {
    minHeight: "var(--control-sm)",
    fontSize: "var(--fontSize-sm)",
    paddingTop: 0,
    paddingRight: "30px",
    paddingBottom: 0,
    paddingLeft: "var(--space-2)",
  },
  triggerSizeMedium: {
    minHeight: "var(--control-md)",
    fontSize: "var(--fontSize-base)",
    paddingTop: 0,
    paddingRight: "36px",
    paddingBottom: 0,
    paddingLeft: "var(--space-3)",
  },
  triggerSizeLarge: {
    minHeight: "var(--control-xl)",
    fontSize: "var(--fontSize-lg)",
    paddingTop: 0,
    paddingRight: "var(--space-10)",
    paddingBottom: 0,
    paddingLeft: "var(--space-4)",
  },
  triggerOpen: {
    borderColor: "var(--primary)",
    boxShadow:
      "0 0 0 3px var(--focus, var(--primaryGhost, color-mix(in srgb, var(--primary) 18%, transparent)))",
    zIndex: 2,
  },
  triggerInvalid: {
    borderColor: {
      default: "var(--danger, var(--error))",
      ":hover": "var(--danger, var(--error))",
      ":focus-visible": "var(--danger, var(--error))",
    },
    boxShadow: {
      default: "var(--shadow1, 0 1px 2px rgba(0, 0, 0, 0.05))",
      ":focus-visible":
        "0 0 0 3px var(--danger-alpha-10, color-mix(in srgb, var(--danger, var(--error)) 15%, transparent))",
    },
  },
  triggerInvalidOpen: {
    borderColor: "var(--danger, var(--error))",
    boxShadow:
      "0 0 0 3px var(--danger-alpha-10, color-mix(in srgb, var(--danger, var(--error)) 15%, transparent))",
    zIndex: 2,
  },
  triggerDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
    backgroundColor: {
      default: "var(--backgroundSecondary)",
      ":hover": "var(--backgroundSecondary)",
    },
    borderColor: {
      default: "var(--border)",
      ":hover": "var(--border)",
    },
    boxShadow: "none",
    color: "var(--textTertiary)",
  },
  text: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    minWidth: 0,
  },
  textPlaceholder: {
    color: "var(--textTertiary)",
  },
  iconPrefix: {
    marginRight: "var(--space-2, 8px)",
    color: "var(--textSecondary)",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  ctrl: {
    position: "absolute",
    right: "var(--space-2, 8px)",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1, 4px)",
    color: "var(--textTertiary)",
  },
  clear: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px",
    borderRadius: "var(--radius-xs, var(--radius-sm))",
    cursor: "pointer",
    backgroundColor: {
      default: "transparent",
      ":hover": "var(--backgroundHover)",
      ":focus-visible": "var(--backgroundHover)",
    },
    borderWidth: 0,
    borderStyle: "none",
    color: {
      default: "inherit",
      ":hover": "var(--text)",
      ":focus-visible": "var(--text)",
    },
    outline: "none",
    boxShadow: {
      default: "none",
      ":focus-visible":
        "0 0 0 2px var(--focus, var(--primaryGhost, color-mix(in srgb, var(--primary) 18%, transparent)))",
    },
    transition: {
      default: "background-color 0.15s ease, color 0.15s ease",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
  },
  chevron: {
    display: "flex",
    flexShrink: 0,
    transition: {
      default: "transform 0.2s ease",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
  },
  chevronOpen: {
    transform: "rotate(180deg)",
  },
  panel: {
    position: "absolute",
    top: "calc(100% + var(--space-1, 4px))",
    left: 0,
    width: "100%",
    backgroundColor: "var(--background)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-sm)",
    overflow: "hidden",
    boxShadow:
      "var(--shadowMedium, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1))",
    display: "flex",
    flexDirection: "column",
    transformOrigin: "top center",
    animationName: {
      default: comboboxPanelEnter,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "var(--popover-duration, 0.16s)",
    animationTimingFunction: "var(--popover-ease, ease-out)",
    animationFillMode: "both",
    zIndex: "var(--z-dropdown, 1000)",
  },
  searchWrap: {
    position: "relative",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--borderLight)",
    paddingBlock: "var(--space-1, 4px)",
    paddingInline: "var(--space-2, 8px)",
    flexShrink: 0,
  },
  searchIcon: {
    position: "absolute",
    left: "var(--space-3, 12px)",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--textTertiary)",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    height: "var(--control-md)",
    paddingTop: 0,
    paddingRight: "var(--space-2, 8px)",
    paddingBottom: 0,
    paddingLeft: "28px",
    borderWidth: 0,
    borderStyle: "none",
    outline: "none",
    backgroundColor: "transparent",
    color: "var(--text)",
    fontSize: "var(--fontSize-base)",
  },
  list: {
    maxHeight: "220px",
    overflowY: "auto",
    padding: "var(--space-1, 4px)",
    scrollBehavior: "auto",
    scrollbarWidth: "thin",
  },
  item: {
    paddingTop: "6px",
    paddingRight: "var(--space-3, 12px)",
    paddingBottom: "6px",
    paddingLeft: "var(--space-2, 8px)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontSize: "var(--fontSize-base)",
    color: "var(--text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-2, 8px)",
    transition: {
      default: "background-color 0.1s ease",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    userSelect: "none",
    scrollMargin: "40px",
  },
  itemHighlighted: {
    backgroundColor: "var(--backgroundHover)",
  },
  itemSelected: {
    backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
    color: "var(--primary)",
    fontWeight: 500,
  },
  itemSelectedHighlighted: {
    backgroundColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
  },
  itemCheck: {
    color: "var(--primary)",
    marginLeft: "var(--space-2, 8px)",
    flexShrink: 0,
  },
  status: {
    padding: "var(--space-3, 12px)",
    textAlign: "center",
    fontSize: "var(--fontSize-base)",
  },
  statusLoading: {
    color: "var(--textSecondary)",
  },
  statusEmpty: {
    color: "var(--textTertiary)",
  },
  helper: {
    marginTop: "var(--space-1, 4px)",
    fontSize: "var(--fontSize-xs)",
    color: "var(--textSecondary)",
  },
  helperError: {
    color: "var(--danger, var(--error))",
  },
});
