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

export const MEDIA_STEP_STARTABLE_STATUSES = new Set<MediaJobStatus>([
  "quoted",
  "done",
  "failed",
  "cancelled",
]);

export type MediaJobStage =
  | "preprocess"
  | "transcribe"
  | "label"
  | "translate"
  | "summarize";

/** outline=只要大纲重点；translate=转写+翻译；full=全套 */
export type MediaJobDepth = "outline" | "translate" | "full";

/**
 * 显式 STT 供应商的**公共**枚举（API/JSON 层取值）：`nolo` = 自部署端点
 * （服务端内部 id 为 `local`，返回值与计费 id 仍用内部值），其余与各商业端点同名。
 * 后两项用**真实名字**（厂商 + 模型）：`elevenlabs-scribe-v2`（内部 id `scribe`）、
 * `cloudflare-whisper`（内部 id `cloudflare`）。服务端也接受内部短名作兼容别名，但落库/回传一律是这里的取值。
 * 显式给出时必须走 STT 兜底链并使用该供应商（兜底链门控关闭也一样）；
 * 未指定（undefined）时由服务端按「用户偏好 → 系统默认策略」解析（见 mediaJobs/sttModels），
 * 两者都无可用模型时维持既有门控/直连行为。
 */
export type SttProviderSelection =
  | "nolo"
  | "modal"
  | "groq"
  | "together"
  | "grok"
  | "deepgram"
  | "elevenlabs-scribe-v2"
  | "cloudflare-whisper";

/**
 * 本次生效的 STT 供应商是**怎么定下来的**（只作解释/审计，不影响转写行为）：
 * - explicit   = 用户在本次请求里显式指定（必须被尊重，跑不通就明确失败）；
 * - preference = 服务端读到该用户最近一次显式选择的偏好；
 * - default    = 服务端默认策略（见 mediaJobs/sttModels.DEFAULT_STT_MODEL_PRIORITY）。
 * 旧 job 无此字段 = 该值不是这套解析写进去的（历史行为），不要反推成 explicit。
 */
export type SttModelSource = "explicit" | "preference" | "default";

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

/** 通知阶段；transcribe 仅预留，当前只投递 started / done。 */
export type MediaJobNotificationStage = "started" | "transcribe" | "translate" | "done" | "awaiting_confirmation";
export type MediaJobNotificationKey = `${number}:${MediaJobNotificationStage}`;

/** 原子步骤（preprocess 是 transcribe 的内部子步骤；label/summarize 不在原子步骤内）。 */
export type MediaJobStepName = "transcribe" | "translate";
export type MediaJobExecution =
  | { mode: "pipeline" }
  | { mode: "step"; step: MediaJobStepName; revision: number };

/** start 时固化；后续重新报价/扩展范围不得改写此快照。 */
export interface MediaJobConfirmation {
  depth: MediaJobDepth;
  sourceLang?: string;
  targetLang?: string;
  totalCredits: [number, number];
  confirmedAt: number;
}

export interface MediaJobNotification {
  /** 同 revision:stage 固定此 id，未 delivered 时也使用此 id 重试。 */
  messageId: string;
  /** 未设置表示通知义务尚未完成；时间戳沿用 job 的毫秒时间。 */
  deliveredAt?: number;
}

export interface MediaJob {
  id: string;
  userId: string;
  dialogId?: string;
  /**
   * 发起本任务的 agent key，由服务端可信工具执行上下文写入（模型/HTTP 入参无法指定）。
   * 会随 job 原样返回给属主浏览器；它只是属主自己的 agent key（或公开平台 key），不敏感。
   */
  agentKey?: string;
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
  /**
   * 显式 STT 供应商（见 SttProviderSelection）。给出时 transcribe 必须走兜底链并用该供应商；
   * null / 未知值在运行期被拒绝，绝不静默回落旧直连路径。
   * 未显式指定的 job 上，本字段也会被服务端写进「解析出来的模型真实名字」（用户偏好或系统默认策略，
   * 见 mediaJobs/sttModels），来源记在 sttModelSource；两者都无可用模型时本字段保持缺省。
   */
  sttProvider?: SttProviderSelection;
  /**
   * 显式 STT 供应商有序候选列表。多选按数组顺序尝试；
   * 单个 sttProvider 保持兼容（等价于长度 1 的数组）。
   */
  sttProviders?: SttProviderSelection[];
  /**
   * 当前 sttProvider/sttProviders 是**怎么定下来的**（explicit / preference / default，见 SttModelSource）。
   * 由服务端与选择本身同批写入；旧 job 无此字段 = 历史写入，不能反推成 explicit。
   */
  sttModelSource?: SttModelSource;
  status: MediaJobStatus;
  stage?: MediaJobStage;
  progress: { done: number; total: number };
  scope: MediaScope;
  depth: MediaJobDepth;
  quote: MediaQuote;
  confirmation?: MediaJobConfirmation;
  /** 每次成功 start / resume 递增；旧任务缺省视为 0。 */
  executionRevision?: number;
  /** 按 revision:stage 保留通知义务与投递凭据，不跨 revision 去重。 */
  notifications?: Partial<Record<MediaJobNotificationKey, MediaJobNotification>>;
  /**
   * 执行模式。单步（agent 逐步调用）记录当前步骤与所属 revision；缺省或 revision 不匹配
   * （start/extend/确认超额会推进 revision）一律视为旧的全量流水线。崩溃恢复据此派发。
   */
  execution?: MediaJobExecution;
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
