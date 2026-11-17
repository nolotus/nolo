import * as stylex from "@stylexjs/stylex";

export const dialogAgentSummaryStyles = stylex.create({
  identity: { display: "flex", alignItems: "center", gap: "10px", minWidth: 0 },
  text: { minWidth: 0, overflowWrap: "anywhere" },
  name: { color: "var(--text)", fontSize: "13px", fontWeight: 650 },
  meta: { color: "var(--textSecondary)", fontSize: "11px", marginTop: "3px" },
});
