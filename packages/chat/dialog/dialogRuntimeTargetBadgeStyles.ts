import * as stylex from "@stylexjs/stylex";

/**
 * Styles for DialogRuntimeTargetBadge.tsx (F1 dialog-level runtime-target
 * intent badge). Kept in a dedicated *Styles.ts per packages/chat/dialog
 * convention: stylex.create lives only in *Styles.ts files so the component
 * tsx stays compilable in test environments that do not run
 * @stylexjs/babel-plugin over component files.
 */
export const dialogRuntimeTargetBadgeStyles = stylex.create({
  badge: {
    alignSelf: "flex-start",
    fontFamily: "var(--font-mono, monospace)",
    fontSize: 11,
    lineHeight: 1.4,
    color: "var(--textQuaternary, var(--textTertiary, #6b7280))",
    backgroundColor:
      "var(--surfaceInset, var(--backgroundSecondary, #f9fafb))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight, #e5e7eb))",
    borderRadius: "var(--radius-xs, 6px)",
    paddingTop: 2,
    paddingRight: 8,
    paddingBottom: 2,
    paddingLeft: 8,
    marginTop: 4,
    marginBottom: 4,
    maxWidth: "100%",
    overflowWrap: "anywhere",
  },
});
