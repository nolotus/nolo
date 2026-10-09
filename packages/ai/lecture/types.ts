/**
 * 音视频课程处理链路的共享契约。真值文档：
 * docs/plans/2026-10-08-media-lecture-pipeline.md（§3 数据契约、§4 Media Job API）。
 * 改这里先改文档；服务端 job、导出器、Web 笔记页、JSX 组件都只依赖本文件。
 */

export type SegmentLabel = "lecture" | "chatter" | "break" | "noise";

export interface LectureSegment {
  /** 稳定 id，翻译 / 引用 / 编辑均按此对齐。 */
  id: string;
  startSec: number;
  endSec: number;
  /** 原文 */
  text: string;
  translation?: string;
  label: SegmentLabel;
  /** label≠lecture 时默认 true；用户可恢复。 */
  excluded: boolean;
}

/**
 * 字幕级短句（STT 原生断句，约 ≤7s / ≤84 字符）。LectureResult.segments 是「阅读段」
 * （8–30s，翻译/标注/对照的单位）；字幕导出优先用这里的短句。
 * translation 缺省时由导出器按所属阅读段译文按比例切分（见 export/common.ts）。
 */
export interface SubtitleCue {
  /** 阅读段关联 id；旧结果可缺省，由时间区间推断。 */
  segmentId?: string;
  startSec: number;
  endSec: number;
  text: string;
  translation?: string;
}

export interface TrimSuggestion {
  fromSec: number;
  toSec: number;
  reason: string;
  signal: "silence" | "density" | "semantic";
  confidence: number;
}

export interface OutlineNode {
  title: string;
  startSec: number;
  endSec: number;
  children?: OutlineNode[];
}

export interface LectureResult {
  version: 1;
  jobId: string;
  source: {
    fileId: string;
    name: string;
    mimeType: string;
    durationSec: number;
    kind: "audio" | "video";
  };
  scope: MediaScope;
  /** BCP-47，如 "ru" */
  sourceLang: string;
  /** 如 "zh"；缺省表示不翻译 */
  targetLang?: string;
  /** 阅读段（翻译 / 标注 / 双语对照单位） */
  segments: LectureSegment[];
  /** STT 短句 cue；SRT/VTT 优先用其时间轴，双语译文仅在所属段首条 cue 显示，避免按时间机械切分译文。 */
  subtitleCues?: SubtitleCue[];
  trimSuggestions: TrimSuggestion[];
  outline: OutlineNode[];
  keyPoints: Array<{ text: string; segmentIds: string[] }>;
  glossary: Array<{ source: string; target: string; note?: string }>;
  edits?: { updatedAt: number };
}

export type MediaJobStatus =
  | "quoted"
  | "running"
  | "awaiting_confirmation"
  | "done"
  | "failed"
  | "cancelled";

export type MediaJobStage =
  | "preprocess"
  | "transcribe"
  | "label"
  | "translate"
  | "summarize";

/** outline=只要大纲重点；translate=转写+翻译；full=全套 */
export type MediaJobDepth = "outline" | "translate" | "full";

export interface MediaScope {
  fromSec: number;
  toSec: number;
}

export interface QuoteItem {
  stage: MediaJobStage;
  /** [下限, 上限] 积分 */
  credits: [number, number];
  exact: boolean;
}

export interface MediaQuote {
  items: QuoteItem[];
  totalCredits: [number, number];
  etaSec: [number, number];
  balanceCredits: number;
  /** 余额不足时：当前余额最多可处理到的秒数 */
  affordableToSec?: number;
}

/**
 * 扣费账本条目。pending = 已记录意图、扣费结果未确认；
 * charged 才计入 spent；skipped = 预期内未扣（余额不足/零费用/中断后结果未知）；
 * failed = 平台/存储故障导致应扣未扣（需告警与对账，绝不当作正常跳过）。
 */
export interface MediaJobCharge {
  id: string;
  stage: MediaJobStage;
  toolId: string;
  credits: number;
  status: "pending" | "charged" | "skipped" | "failed";
  reason?: string;
  durationMinutes?: number;
  inputTokens?: number;
  outputTokens?: number;
  at?: number;
}

export interface MediaJob {
  id: string;
  userId: string;
  dialogId?: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  kind: "audio" | "video";
  durationSec: number;
  sourceLang?: string;
  targetLang?: string;
  /** 课程名 / 主题（翻译、总结 prompt 上下文；也作 STT keyterm） */
  topic?: string;
  /** 专有名词 / 关键词（Grok STT keyterm + 翻译、总结 prompt 上下文） */
  keyterms?: string[];
  status: MediaJobStatus;
  stage?: MediaJobStage;
  progress: { done: number; total: number };
  scope: MediaScope;
  depth: MediaJobDepth;
  quote: MediaQuote;
  trimSuggestions: TrimSuggestion[];
  /** 报价上限 × 1.1；超过则进入 awaiting_confirmation */
  budgetCeiling: number;
  /** 由 charges 推导（status=charged 之和），只读视图；不要单独累加 */
  spent: Partial<Record<MediaJobStage, number>>;
  /** 扣费账本（幂等：同 id 只扣一次）；旧 job 无此字段时由 spent 迁移 */
  charges?: MediaJobCharge[];
  /** 各阶段产物的 KV key，已存在即视为该阶段完成（续跑依据） */
  stageArtifacts: Partial<Record<MediaJobStage, string>>;
  /** awaiting_confirmation 时：继续所需的额外积分 */
  overrunCredits?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export type ExportFormat = "docx" | "md" | "srt" | "vtt" | "txt";
export type ExportPart = "outline" | "keyPoints" | "glossary" | "bilingual" | "fulltext";

export interface ExportOptions {
  format: ExportFormat;
  /** 缺省 = 全部适用部分 */
  parts?: ExportPart[];
  /** src=只原文，tgt=只译文，both=双语 */
  lang?: "src" | "tgt" | "both";
  /** 双语对照布局：表格三列 / 上下交替 */
  layout?: "table" | "interleave";
  timestamps?: boolean;
  /** 是否包含 excluded 段（默认 false） */
  includeExcluded?: boolean;
}
