import * as stylex from "@stylexjs/stylex";

/**
 * Styles for SpaceContextBadge.tsx. Kept in a dedicated *Styles.ts per
 * packages/chat/dialog convention: stylex.create lives only in *Styles.ts
 * files so the component tsx stays compilable in test environments that do
 * not run @stylexjs/babel-plugin over component files.
 *
 * The badge is a passive context label, not a control: muted surface, no
 * pointer affordance, and it truncates long names with a title tooltip
 * instead of pushing the layout around.
 */
export const spaceContextBadgeStyles = stylex.create({
  badge: {
    alignSelf: "flex-start",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    maxWidth: "100%",
    marginTop: 4,
    marginBottom: 4,
    paddingTop: 2,
    paddingRight: 8,
    paddingBottom: 2,
    paddingLeft: 8,
    borderRadius: "var(--radius-xs, 6px)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight, #e5e7eb))",
    backgroundColor:
      "var(--surfaceInset, var(--backgroundSecondary, #f9fafb))",
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-xs, 11px)",
    lineHeight: 1.4,
  },
  spaceName: {
    flexShrink: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
    color: "var(--textPrimary, inherit)",
  },
  segment: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  segmentText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cwdSegment: {
    color: "var(--textTertiary, var(--textSecondary))",
  },
});
