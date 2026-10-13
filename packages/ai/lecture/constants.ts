import type { MediaJobDepth } from "./types";

/** 档位文案单一真相源（quote 三档与后续渲染共用同一份措辞）。 */
export const MEDIA_JOB_TIER_LABELS: Record<MediaJobDepth, string> = {
  outline: "只要大纲重点",
  translate: "原文+译文对照",
  full: "全套（对照+大纲+重点+术语，可导出文档）",
};

/** 档位文案别名 */
export const TIER_LABELS = MEDIA_JOB_TIER_LABELS;

/** 报价超时预算（毫秒） */
export const MEDIA_JOB_QUOTE_TIMEOUT_MS = 5_000;
