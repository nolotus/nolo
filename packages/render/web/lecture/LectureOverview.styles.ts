import * as stylex from "@stylexjs/stylex";

/** 概览页容器：撑满父级、允许收缩，避免 iframe artifact 撑出横向溢出。 */
export const lectureOverviewStyles = stylex.create({
  wrap: {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
});
