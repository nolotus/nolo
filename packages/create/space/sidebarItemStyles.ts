import * as stylex from "@stylexjs/stylex";

/**
 * Sidebar item styles migrated 1:1 to StyleX.
 *
 * 三个 keyframes（原 SidebarItem.css 的 SidebarItem__spin /
 * SidebarItem__flash、SidebarMoveToPanel.css 的 SidebarItemMovePanelSpin）
 * 随 CSS 删除后在全仓无定义，这里用 stylex.keyframes() 1:1 恢复，
 * animationName 直接引用返回值（不能用字符串名——编译期无法解析）。
 *
 * prefers-reduced-motion 块：原 CSS 只禁了 5 个元素（.SidebarItem /
 * .SidebarItem__icon-wrapper / .SidebarItem__drag-handle /
 * .SidebarItem__actions / .SidebarItem__menu-item）的 transition/transform
 * 与 .SidebarItem--flash 的 animation + 静态底色。spinning(运行图标) 与
 * spinner(move 面板) 原块未禁，1:1 保留。
 */
const spinKeyframes = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const flashKeyframes = stylex.keyframes({
  "0%": {
    backgroundColor: "color-mix(in srgb, var(--primary) 16%, transparent)",
    boxShadow: "inset 3px 0 0 color-mix(in srgb, var(--primary) 55%, transparent)",
    transform: "translateX(-3px)",
  },
  "35%": {
    backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
    boxShadow: "inset 2px 0 0 color-mix(in srgb, var(--primary) 35%, transparent)",
    transform: "translateX(0)",
  },
  "100%": {
    backgroundColor: "transparent",
    boxShadow: "none",
    transform: "translateX(0)",
  },
});

const movePanelSpinKeyframes = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

/** Sidebar item styles migrated 1:1 to StyleX. */
export const sidebarItemStyles = stylex.create({
  item: { position: "relative", display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", alignItems: "center", columnGap: "var(--sidebar-gap-x, 8px)", paddingTop: 0, paddingRight: "var(--sidebar-row-pad, 12px)", paddingBottom: 0, paddingLeft: "var(--sidebar-row-pad, 12px)", borderRadius: "var(--radius-sm, 6px)", color: "var(--text)", minHeight: "var(--sidebar-row-height, 32px)", height: "var(--sidebar-row-height, 32px)", cursor: "pointer", fontSize: "var(--fontSize-base)", transitionProperty: { default: "background-color", "@media (prefers-reduced-motion: reduce)": "none" }, transitionDuration: "0.15s", transitionTimingFunction: "ease", outline: "none", ":focus-visible": { outline: "2px solid var(--primary)", outlineOffset: "2px" }, ":hover": { backgroundColor: "color-mix(in srgb, var(--text) 6%, transparent)" } },
  open: { backgroundColor: "color-mix(in srgb, var(--text) 6%, transparent)" },
  active: { backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)", fontWeight: 500 },
  dragging: { opacity: 0.5, transform: { default: "scale(0.96)", "@media (prefers-reduced-motion: reduce)": "none" }, boxShadow: "0 6px 20px var(--shadowMedium)" },
  flash: { animationName: { default: flashKeyframes, "@media (prefers-reduced-motion: reduce)": "none" }, animationDuration: "2s", animationTimingFunction: "ease-out", animationIterationCount: 1, backgroundColor: { default: "transparent", "@media (prefers-reduced-motion: reduce)": "color-mix(in srgb, var(--primary) 10%, transparent)" }, boxShadow: { default: "none", "@media (prefers-reduced-motion: reduce)": "inset 2px 0 0 color-mix(in srgb, var(--primary) 40%, transparent)" } },
  selected: { backgroundColor: "var(--primaryGhost)", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--primary) 25%, transparent)" },
  iconWrapper: { display: "flex", alignItems: "center", justifyContent: "center", width: "var(--sidebar-icon-size, 20px)", height: "var(--sidebar-icon-size, 20px)", flexShrink: 0, position: "relative", borderRadius: "var(--radius-sm)", cursor: "grab", transitionProperty: { default: "background-color, transform", "@media (prefers-reduced-motion: reduce)": "none" }, transitionDuration: "0.15s", transitionTimingFunction: "ease", ":hover": { backgroundColor: "color-mix(in srgb, var(--text) 8%, transparent)" }, ":active": { cursor: "grabbing", transform: { default: "scale(0.95)", "@media (prefers-reduced-motion: reduce)": "none" } } },
  dragDisabled: { cursor: "default", ":active": { cursor: "default", transform: "none" } },
  icon: { color: "var(--textSecondary)", transitionProperty: "color, transform", transitionDuration: "0.15s", transitionTimingFunction: "ease" },
  iconActive: { color: "var(--primary)" },
  avatar: { borderRadius: "var(--radius-sm, 4px)", objectFit: "cover", flexShrink: 0 },
  spinning: { animationName: spinKeyframes, animationDuration: "0.9s", animationTimingFunction: "linear", animationIterationCount: "infinite", color: "var(--primary)" },
  unreadDot: { position: "absolute", top: "-1px", right: "-1px", width: "7px", height: "7px", borderRadius: 999, backgroundColor: "var(--primary)", boxShadow: "0 0 0 2px var(--background)" },
  statusMark: { display: "block", width: "8px", height: "8px", borderRadius: 999, backgroundColor: "var(--primary)" },
  statusFailed: { backgroundColor: "var(--error)" },
  dragHandle: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, display: "grid", alignItems: "center", justifyContent: "center", color: "var(--textTertiary)", opacity: 0, transitionProperty: { default: "opacity", "@media (prefers-reduced-motion: reduce)": "none" }, transitionDuration: "0.2s", transitionTimingFunction: "ease", backgroundColor: "color-mix(in srgb, var(--background) 82%, transparent)", borderRadius: "var(--radius-sm)", borderWidth: "1px", borderStyle: "solid", borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" },
  dragHidden: { opacity: 0, pointerEvents: "none" },
  dragVisible: { opacity: 0.9 },
  selection: { display: "grid", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, borderWidth: 0, borderStyle: "none", backgroundColor: "transparent", color: "var(--textSecondary)", flexShrink: 0, borderRadius: "var(--radius-sm)", fontFamily: "inherit", fontSize: "inherit", fontStyle: "inherit", fontWeight: "inherit", lineHeight: "inherit", appearance: "none", cursor: "pointer", transitionProperty: "background-color", transitionDuration: "0.15s", transitionTimingFunction: "ease", ":hover": { backgroundColor: "color-mix(in srgb, var(--text) 8%, transparent)" } },
  selectionIcon: { color: "var(--primary)" },
  link: { minWidth: 0, textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", transitionProperty: "padding-right", transitionDuration: "0.15s", transitionTimingFunction: "ease", ":hover": { textDecoration: "none" }, ":focus-visible": { textDecoration: "none" } },
  linkActions: { paddingRight: "92px" },
  title: { display: "block", minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", letterSpacing: "0.005em" },
  titleActive: { fontWeight: 600 },
  actions: { position: "absolute", right: "var(--space-2)", top: "50%", display: "grid", gridAutoFlow: "column", alignItems: "center", columnGap: "2px", paddingTop: "2px", paddingRight: "2px", paddingBottom: "2px", paddingLeft: "2px", borderWidth: "1px", borderStyle: "solid", borderColor: "color-mix(in srgb, var(--border) 30%, transparent)", borderRadius: "var(--radius-md)", backgroundColor: "color-mix(in srgb, var(--surfaceRaised, var(--background)) 40%, transparent)", boxShadow: "0 10px 22px -18px var(--shadowHeavy), 0 1px 2px color-mix(in srgb, var(--shadowLight) 70%, transparent)", backdropFilter: "blur(16px)", opacity: 0, pointerEvents: "none", transform: { default: "translateY(-50%) translateX(4px)", "@media (prefers-reduced-motion: reduce)": "none" }, transitionProperty: { default: "opacity, transform", "@media (prefers-reduced-motion: reduce)": "none" }, transitionDuration: "0.15s", transitionTimingFunction: "ease" },
  actionsVisible: { opacity: 1, pointerEvents: "auto", transform: "translateY(-50%) translateX(0)" },
  actionsDragging: { opacity: 0, pointerEvents: "none" },
  actionButton: { display: "grid", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", color: "var(--textSecondary)", backgroundColor: "transparent", borderWidth: 0, borderStyle: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", transitionProperty: "background-color, color, transform", transitionDuration: "0.1s", transitionTimingFunction: "ease", ":hover": { backgroundColor: "var(--primaryGhost)", color: "var(--primary)", transform: "translateY(-1px)" }, ":active": { opacity: 0.7 } },
  menuItem: { display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", width: "100%", paddingTop: "var(--space-2)", paddingRight: "var(--space-3)", paddingBottom: "var(--space-2)", paddingLeft: "var(--space-3)", color: "var(--text)", backgroundColor: "transparent", borderWidth: 0, borderStyle: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", textAlign: "left", transitionProperty: { default: "background-color", "@media (prefers-reduced-motion: reduce)": "none" }, transitionDuration: "0.1s", transitionTimingFunction: "ease", marginBottom: "1px", ":hover": { backgroundColor: "var(--backgroundHover)" } },
  menuIcon: { marginRight: "var(--space-2)", color: "var(--textSecondary)", transitionProperty: "color", transitionDuration: "0.15s", transitionTimingFunction: "ease" },
  submenuIndicator: { marginLeft: "auto", color: "var(--textTertiary)" },
  childToggle: { display: "inline-flex", alignItems: "center", gap: "1px", flexGrow: 0, flexShrink: 0, flexBasis: "auto", paddingTop: 0, paddingRight: "2px", paddingBottom: 0, paddingLeft: "2px", marginRight: "2px", backgroundColor: "transparent", borderWidth: 0, borderStyle: "none", borderRadius: "3px", color: "var(--textSecondary, inherit)", cursor: "pointer", fontSize: "10px", lineHeight: 1, ":hover": { backgroundColor: "var(--backgroundHover, rgba(0,0,0,0.05))" } },
  childCount: { fontSize: "10px", opacity: 0.7 },
  moveBody: { display: "flex", flexDirection: "column", maxHeight: "min(60vh, 420px)", minHeight: 0, minWidth: "240px" },
  moveSearch: { display: "block", margin: 0, paddingTop: "var(--space-1)", paddingRight: "var(--space-2)", paddingBottom: "var(--space-1)", paddingLeft: "var(--space-2)", borderBottomWidth: "1px", borderBottomStyle: "solid", borderBottomColor: "var(--borderLight, var(--border))" },
  moveInput: { width: "100%", boxSizing: "border-box", height: "32px", paddingTop: 0, paddingRight: "var(--space-2)", paddingBottom: 0, paddingLeft: "var(--space-2)", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--border)", borderRadius: "var(--radius-xs)", backgroundColor: "var(--backgroundSecondary, var(--background))", color: "var(--text)", fontSize: "var(--fontSize-sm, 13px)", outline: "none", ":focus": { borderColor: "var(--primary)" } },
  moveList: { flexGrow: 1, flexShrink: 1, flexBasis: "auto", minHeight: 0, maxHeight: "min(50vh, 360px)", overflowY: "auto", overscrollBehavior: "contain" },
  moveLabel: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  spinner: { width: "12px", height: "12px", borderWidth: "1.5px", borderStyle: "solid", borderColor: "var(--textQuaternary)", borderTopColor: "var(--primary)", borderRadius: "50%", animationName: movePanelSpinKeyframes, animationDuration: "1s", animationTimingFunction: "linear", animationIterationCount: "infinite", flexShrink: 0 },
});
