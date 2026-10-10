import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ReactReduxContext } from "react-redux";
import { useNavigate } from "app/routing";
import { downloadExport } from "app/pages/mediaLectureApi";
import type {
  ExportFormat,
  MediaJob,
  MediaJobDepth,
  MediaJobStage,
  MediaQuote,
  MediaScope,
} from "ai/lecture/types";
import {
  executeToolRun,
  getToolRunById,
  useToolRunById,
} from "ai/tools/toolRunStore";
import {
  getMediaJob,
  mediaJobAction,
  startMediaJob,
  updateMediaQuote,
} from "chat/web/mediaJobs";
import LoadingSpinner from "render/web/ui/LoadingSpinner";
import { isMediaJobPendingConfirmation } from "../toolPresentation";
import type { ToolProps } from "./ToolMessageTypes";

/** 与 mediaJobTool TIER_LABELS 同措辞；仅用于旧载荷（无 pendingStart.label）回退。 */
const PENDING_TIER_LABELS: Record<MediaJobDepth, string> = {
  outline: "只要大纲重点",
  translate: "原文+译文对照",
  full: "全套（对照+大纲+重点+术语，可导出文档）",
};

/**
 * 卡内译文语言可选项（点选才生效，不默认选中）。codes 必须是 server languages.ts 的 TARGET_LANGUAGES 子集，
 * 由 MediaJobToolCard.test.tsx 守护；chat 包不直接 import server 代码。
 */
export const TARGET_LANG_CHOICES: Array<{ code: string; label: string }> = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

const isDepth = (value: unknown): value is MediaJobDepth =>
  value === "outline" || value === "translate" || value === "full";

const asRecord = (value: unknown): Record<string, any> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;

/**
 * pendingStart.quote（工具层随本次待确认一起传来的报价）→ 可展示的结构。
 * 逐字段校验 + 重新拼装，绝不整包透传：一个字段没校验过就够渲染出垃圾文案
 * （`etaSec:["a","b"]` → `formatEta` 出「NaN:NaN」，且卡片是计费面）。
 * 两个数字对都不合法时返回 undefined，让调用方回退 job.quote / 兜底提示。
 */
const asQuote = (value: unknown): MediaQuote | undefined => {
  const rec = asRecord(value);
  if (!rec) return undefined;
  const isPair = (input: unknown): input is [number, number] =>
    Array.isArray(input) &&
    input.length >= 2 &&
    input.every((n) => typeof n === "number" && Number.isFinite(n));
  const totalCredits = isPair(rec.totalCredits)
    ? ([rec.totalCredits[0], rec.totalCredits[1]] as [number, number])
    : undefined;
  const etaSec = isPair(rec.etaSec)
    ? ([rec.etaSec[0], rec.etaSec[1]] as [number, number])
    : undefined;
  if (!totalCredits && !etaSec) return undefined;
  // 只搬运非数字对字段（balanceCredits 等），数字对一律用上面校验过的值覆盖，
  // 非法值就地丢弃而不是原样带下去。
  const safe: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(rec)) {
    if (key === "totalCredits" || key === "etaSec") continue;
    safe[key] = val;
  }
  if (totalCredits) safe.totalCredits = totalCredits;
  if (etaSec) safe.etaSec = etaSec;
  return safe as unknown as MediaQuote;
};

/**
 * 回退展示 job.quote 前的一致性校验：depth 之外，scope 也必须与本次待确认的一致。
 * 报价是计费面，范围不一致时那个旧数字与本次实际启动/计费无关（全片报价贴到
 * 「范围 0:00–1:00」上），宁可不给数字，也不能展示一个看似精确的金额。
 * 任一侧缺失（undefined / 缺 scope / NaN·Infinity）一律视为不一致。
 */
const sameScope = (a: unknown, b: unknown): boolean => {
  const ra = asRecord(a);
  const rb = asRecord(b);
  if (!ra || !rb) return false;
  const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);
  return (
    isFiniteNumber(ra.fromSec) &&
    isFiniteNumber(rb.fromSec) &&
    ra.fromSec === rb.fromSec &&
    isFiniteNumber(ra.toSec) &&
    isFiniteNumber(rb.toSec) &&
    ra.toSec === rb.toSec
  );
};

export interface MediaJobTier {
  depth: MediaJobDepth;
  label: string;
  quote: MediaQuote;
}

export interface MediaJobToolCardProps extends Partial<ToolProps> {
  readOnly?: boolean;
  /** 该 tool 消息的 toolRunId（待确认启动卡用它推进同一个 confirm run）。 */
  toolRunId?: string;
}

const STAGES: Array<{ key: MediaJobStage; label: string }> = [
  { key: "preprocess", label: "预处理" },
  { key: "transcribe", label: "转写" },
  { key: "label", label: "标注" },
  { key: "translate", label: "翻译" },
  { key: "summarize", label: "总结" },
];

/** 阶段文案单一真相源：STAGE_LABELS 由 STAGES 派生，避免两处漂移。 */
const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  STAGES.map((stage) => [stage.key, stage.label]),
);

/**
 * 本 job 实际会跑的阶段。规则必须与服务端真值
 * `packages/server/handlers/mediaJobs/quote.ts` 的 `stagesForDepth` 保持一致
 * （chat 包不直接 import server 代码，这里镜像一份小纯函数）：
 * 预处理/转写/标注恒有；outline|full 加总结；translate|full 且有译文语言才加翻译。
 */
export function stagesForJob(
  depth: MediaJobDepth | undefined,
  hasTarget: boolean,
): Array<{ key: MediaJobStage; label: string }> {
  const want = new Set<MediaJobStage>(["preprocess", "transcribe", "label"]);
  if (depth === "outline" || depth === "full") want.add("summarize");
  if ((depth === "translate" || depth === "full") && hasTarget) {
    want.add("translate");
  }
  return STAGES.filter((stage) => want.has(stage.key));
}

/** 已用时间 m:ss（非有限/负数按 0 处理，绝不渲染 NaN）。 */
function formatElapsed(ms: number): string {
  const totalSec = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 进度区「预计 a–b 分钟」；etaSec 非法（NaN/负/倒挂）时返回空串，调用方省略该段。 */
function formatEtaMinutesRange(etaSec?: [number, number]): string {
  if (!etaSec || !Array.isArray(etaSec) || etaSec.length < 2) return "";
  const [min, max] = etaSec;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
  if (min < 0 || max < 0 || min > max) return "";
  const a = Math.max(1, Math.round(min / 60));
  const b = Math.max(a, Math.ceil(max / 60));
  return a === b ? `预计 ${a} 分钟` : `预计 ${a}–${b} 分钟`;
}

const TERMINAL_STATUSES = new Set(["done", "failed", "cancelled"]);

function fmtMinutes(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} 秒`;
  const mins = sec / 60;
  return Number.isInteger(mins) ? `${mins} 分钟` : `${mins.toFixed(1)} 分钟`;
}

// 秒数 → "m:ss"。非有限数（NaN/Infinity/undefined）绝不进文案：Math.floor(NaN / 60)
// 会拼出「NaN:NaN」这种读起来像真实时间戳的垃圾。这里统一回落 "0:00"（= 媒体起点/
// 未指定），调用方若需要别的语义应自行兜底——比渲染 NaN 要么更准确、要么至少明显恒等。
function fmtClock(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * 用户可见文案里的数字统一入口：NaN/Infinity/非 number 一律返回 undefined。
 * 调用方据此「不给数字」（绝不拿 0 冒充一个看起来真实的读数），也不让它进任何算式
 * （`Math.floor(NaN / 60)`、`NaN % 100` 这类算式的结果都会拼进文案）。
 */
function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * 截取建议的时间区间 → 可显示文案（含括号）。不可用即返回 undefined：非有限数/负数
 * （不是「从头开始」，钳成 0 会把损坏数据伪装成真实区间）、倒挂与零长（倒挂区间
 * `to - from < 1` 在服务端不可执行，渲染反向区间会让用户误判要截哪一段）。
 */
function formatRangePair(fromSec: unknown, toSec: unknown): string | undefined {
  const from = finiteNumber(fromSec);
  const to = finiteNumber(toSec);
  if (from === undefined || to === undefined) return undefined;
  if (from < 0 || to < 0) return undefined;
  if (to - from < 1) return undefined;
  return `（${fmtClock(from)} ~ ${fmtClock(to)}）`;
}

function formatCredits(credits?: [number, number]): string {
  if (!credits || !Array.isArray(credits) || credits.length < 2) return "";
  const [min, max] = credits;
  // 非有限数（NaN/Infinity/undefined）绝不进计费文案：宁可什么都不显示。
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
  // 负值（不存在「倒赚积分」的报价）与倒挂区间（min > max）同属坏数据：
  // 渲染「-5 ~ 10 积分」「20 ~ 10 积分」会让用户照着一个不存在的价格预估花费。
  if (min < 0 || max < 0 || min > max) return "";
  if (min === max) {
    return `${Number(min.toFixed(2))} 积分`;
  }
  return `${Number(min.toFixed(2))} ~ ${Number(max.toFixed(2))} 积分`;
}

// 单值积分（已扣 / 超出金额）。与 formatCredits/formatEta 同一守卫：非有限数
// （NaN/Infinity/undefined）绝不进计费文案 —— `Number(NaN.toFixed(2))` 会拼出
// 「NaN 积分」这种读起来像真实金额的垃圾，且这是计费面。非法值返回空串，
// 调用方据此回退到不含数字的文案（绝不拿 0 冒充一个「真实」金额）。
// 负数同样非法：「已扣 -5 积分」「超出金额：-5 积分」不存在，只会读成退款/返现。
function formatSingleCredits(credits?: number): string {
  if (typeof credits !== "number" || !Number.isFinite(credits)) return "";
  if (credits < 0) return "";
  return `${Number(credits.toFixed(2))} 积分`;
}

function formatEta(etaSec?: [number, number]): string {
  if (!etaSec || !Array.isArray(etaSec) || etaSec.length < 2) return "";
  const [min, max] = etaSec;
  // 非有限数绝不进「预计耗时约 …」：Math.floor(NaN) 会渲染出「NaN:NaN」。
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
  // 负耗时与倒挂区间（「约 -10 秒」「约 2 分钟 ~ 1 分钟」）同样是坏数据，
  // 会让用户按一个不存在的时长判断要不要等 / 要不要换档。
  if (min < 0 || max < 0 || min > max) return "";
  if (min === max) {
    return `预计耗时约 ${fmtMinutes(min)}`;
  }
  return `预计耗时约 ${fmtMinutes(min)} ~ ${fmtMinutes(max)}`;
}

function userFacingError(raw?: string): string {
  const firstLine = (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine ?? "处理失败，请稍后重试";
}

const OPEN_NOTE_LINK_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "6px 14px",
  fontSize: "13px",
  fontWeight: 500,
  color: "#ffffff",
  backgroundColor: "var(--primary, #2563eb)",
  borderRadius: "var(--radius-md, 6px)",
  textDecoration: "none",
  cursor: "pointer",
  border: "none",
};

/**
 * 「打开笔记」链接。站内跳转由卡片自己的 router navigate 完成，不依赖外部 navigateToPage：
 * 工具行（ToolCallRow / ToolMessageGroup）传的是空函数，依赖它会把点击吞掉。
 * href 保留给中键 / 新标签页；修饰键点击不拦截，交还浏览器原生行为。
 */
const OpenNoteLink: React.FC<{ jobId?: string }> = ({ jobId }) => {
  const navigate = useNavigate();
  const href = `/media-jobs/${jobId}`;
  return (
    <a
      data-testid="open-note-link"
      href={href}
      onClick={(e) => {
        if (!jobId) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          return;
        }
        e.preventDefault();
        navigate(href);
      }}
      style={OPEN_NOTE_LINK_STYLE}
    >
      打开笔记
    </a>
  );
};

type ExportFormatKey = Exclude<ExportFormat, "vtt">;

/** 卡片内导出格式（顺序即展示顺序；DOCX 为默认主按钮）。 */
const EXPORT_FORMAT_OPTIONS: Array<{ format: ExportFormatKey; label: string }> = [
  { format: "docx", label: "DOCX" },
  { format: "md", label: "Markdown" },
  { format: "srt", label: "SRT 字幕" },
  { format: "txt", label: "TXT" },
];

const EXPORT_BTN_BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 14px",
  fontSize: "13px",
  fontWeight: 500,
  borderRadius: "var(--radius-md, 6px)",
  cursor: "pointer",
};

/**
 * done 卡片内的导出格式选择：点击即下载，不跳转笔记页。
 * lang 策略：docx/md 不传 lang，由服务端按是否真有译文决定（双语或原文）；srt/txt 显式传 src。
 * 任一导出进行中禁用全部按钮，防止重复点击；失败或超时只显示错误文案并恢复按钮，不触发下载。
 */
const MediaJobExportMenu: React.FC<{ jobId: string }> = ({ jobId }) => {
  const [busyFormat, setBusyFormat] = useState<ExportFormatKey | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const handleExport = async (format: ExportFormatKey) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyFormat(format);
    setExportError(null);
    try {
      await downloadExport(jobId, format, format === "srt" || format === "txt" ? "src" : undefined);
    } catch (e) {
      setExportError(
        e instanceof Error && e.message ? e.message : "导出失败，请重试",
      );
    } finally {
      busyRef.current = false;
      setBusyFormat(null);
    }
  };

  return (
    <div
      data-testid="export-format-group"
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "13px", color: "var(--textMuted, #6b7280)" }}>
        导出：
      </span>
      {EXPORT_FORMAT_OPTIONS.map(({ format, label }) => {
        const isPrimary = format === "docx";
        const loading = busyFormat === format;
        return (
          <button
            key={format}
            type="button"
            data-testid={`export-btn-${format}`}
            data-variant={isPrimary ? "primary" : "secondary"}
            disabled={busyFormat !== null}
            onClick={() => void handleExport(format)}
            style={{
              ...EXPORT_BTN_BASE,
              color: isPrimary ? "#ffffff" : "var(--text, #111827)",
              backgroundColor: isPrimary
                ? "var(--primary, #2563eb)"
                : "transparent",
              border: isPrimary
                ? "none"
                : "1px solid var(--borderMuted, #d1d5db)",
              cursor: busyFormat !== null ? "not-allowed" : "pointer",
              opacity: busyFormat !== null && !loading ? 0.6 : 1,
            }}
          >
            {loading ? "导出中…" : label}
          </button>
        );
      })}
      {exportError && (
        <span
          role="alert"
          data-testid="export-error"
          style={{ fontSize: "13px", color: "var(--danger, #dc2626)" }}
        >
          {exportError}
        </span>
      )}
    </div>
  );
};

export const MediaJobToolCard: React.FC<MediaJobToolCardProps> = ({
  rawData,
  isError: isErrorProp,
  readOnly = false,
  toolArgs,
  toolRunId: toolRunIdProp,
}) => {
  const data = typeof rawData === "object" && rawData !== null ? rawData : {};
  const innerData =
    typeof data.rawData === "object" && data.rawData !== null
      ? data.rawData
      : {};

  // ===== 模型调 start 被确认闸门拦下：待确认启动态（不是失败） =====
  const pendingStart =
    asRecord(data.pendingStart) ?? asRecord(innerData.pendingStart);
  const isPendingStart = isMediaJobPendingConfirmation({
    toolName: "mediaJobTool",
    rawData: pendingStart ? { pendingStart } : data,
  });
  // 待确认 ≠ 失败：即便调用方按旧载荷（error 字段）传了 isError，也不渲染红色失败。
  const isError = Boolean(isErrorProp) && !isPendingStart;
  const args = asRecord(toolArgs) ?? {};
  const pendingDepth: MediaJobDepth | undefined = isDepth(pendingStart?.depth)
    ? pendingStart.depth
    : isDepth(args.depth)
      ? args.depth
      : undefined;
  const pendingJobId: string | undefined =
    pendingStart?.jobId ?? (typeof args.jobId === "string" ? args.jobId : undefined) ?? data.jobId;
  const pendingTargetLang: string | undefined =
    pendingStart?.targetLang ??
    (typeof args.targetLang === "string" ? args.targetLang : undefined);
  const pendingScope: Partial<MediaScope> | undefined =
    asRecord(pendingStart?.scope) ??
    (typeof args.fromSec === "number" || typeof args.toSec === "number"
      ? {
          ...(typeof args.fromSec === "number" ? { fromSec: args.fromSec } : {}),
          ...(typeof args.toSec === "number" ? { toSec: args.toSec } : {}),
        }
      : undefined);
  const pendingToolRunId: string | undefined =
    toolRunIdProp ?? (typeof pendingStart?.toolRunId === "string" ? pendingStart.toolRunId : undefined);
  const pendingRun = useToolRunById(pendingToolRunId ?? "");
  // 待确认卡能否就地确认：run 仍在 store 且处于可确认态（confirm + pending/failed）。
  // run 不在 store（页面刷新后）时确认已失效 —— 绝不回退直连 startMediaJob 计费，
  // 改为引导用户回到上方报价卡重新选档位（点档位本身就是确认）。
  const canConfirmInPlace =
    !!pendingRun &&
    pendingRun.interaction === "confirm" &&
    (pendingRun.status === "pending" || pendingRun.status === "failed");
  // Provider-less 安全（分享页/单测无 Redux store）：拿不到 dispatch 时不做就地确认推进。
  const reduxContext = useContext(ReactReduxContext) as
    | { store?: { dispatch?: (action: any) => any } }
    | null
    | undefined;
  const storeDispatch = reduxContext?.store?.dispatch;

  const jobId: string | undefined =
    data.jobId || data.job?.id || innerData.job?.id || innerData.jobId;
  const initialJob: MediaJob | undefined = data.job || innerData.job;
  const initialQuote: MediaQuote | undefined =
    data.quote || innerData.quote || initialJob?.quote;

  const [job, setJob] = useState<MediaJob | null>(initialJob ?? null);
  const [hasStarted, setHasStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  // 同步互斥：React 的 starting state 是异步的，光看 state 挡不住双击
  const startingRef = useRef(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const actionBusyRef = useRef(false);
  // 「确认已失效」时点「回到报价卡」但页面里找不到报价卡 → 提示重新估价
  const [backToQuoteMissing, setBackToQuoteMissing] = useState(false);
  // 卡内点选的译文语言（job 上尚无 targetLang 时）；选中后以它重新报价 translate/full。
  const [chosenTargetLang, setChosenTargetLang] = useState<string | undefined>(
    undefined,
  );
  // 以选中语言重新报价得到的 translate/full 报价，覆盖 tiers 里不含译文的旧报价。
  const [requotes, setRequotes] = useState<
    Partial<Record<MediaJobDepth, MediaQuote>>
  >({});
  const [requoting, setRequoting] = useState(false);
  // hover/focus 时临时高亮的档位（可点击档位默认中性边框）。
  const [emphasizedDepth, setEmphasizedDepth] = useState<MediaJobDepth | null>(
    null,
  );

  useEffect(() => {
    if (initialJob) {
      setJob(initialJob);
    }
  }, [initialJob]);

  // translate 档必须有目标语言（请求已持久到 job 或 job 原有）。缺失时置灰该档并给出提示，
  // 避免展示一个「可启动」的廉价「原文+译文对照」价格（服务端 start 也会 400）。
  const knownTargetLang = job?.targetLang ?? initialJob?.targetLang;
  // 实际生效的译文语言：job 已记录的优先，否则用卡内点选且已重新报价成功的语言。
  const effectiveTargetLang = knownTargetLang ?? chosenTargetLang;

  // tiers 缺失时用单个 quote 渲染一档
  const tiers: MediaJobTier[] = useMemo(() => {
    if (Array.isArray(data.tiers) && data.tiers.length > 0) {
      return data.tiers;
    }
    if (initialQuote) {
      const depth: MediaJobDepth = job?.depth || "full";
      const label =
        depth === "outline"
          ? "只要大纲重点"
          : depth === "translate"
            ? "原文+译文对照"
            : "全套处理";
      return [{ depth, label, quote: initialQuote }];
    }
    return [];
  }, [data.tiers, initialQuote, job?.depth]);

  const currentStatus = job?.status ?? (hasStarted ? "running" : undefined);
  // 已启动/非 quoted 状态的 job 不再显示可点档位
  const isQuoted = currentStatus === "quoted" && !hasStarted;
  const isProgress = !isQuoted && (currentStatus !== undefined || hasStarted);

  // ===== 挂载对账（事故 2026-10-10 R1/R2）=====
  // 消息里的 job 只是报价时的历史快照（常为 quoted）；离开页面再回来组件重挂载，
  // 内存态全丢。所以挂载即向服务端取一次真值，以服务端状态为准：quoted 才显示档位、
  // running 由下方轮询接管、终态直接显示（done 有产物即「打开笔记」）。
  // 只读取，绝不触发 start、不绕过确认闸门；失败静默保留快照。
  // 跳过：待确认启动卡（由下方 pendingStart 挂载查询负责，避免重复请求）；
  // 快照已是终态（终态不再变化，且守护「终态后不再调用 getMediaJob」）。
  const reconcileTargetId = jobId || initialJob?.id;
  const snapshotStatus = initialJob?.status;
  useEffect(() => {
    if (!reconcileTargetId || isPendingStart) return;
    if (snapshotStatus && TERMINAL_STATUSES.has(snapshotStatus)) return;
    let active = true;
    getMediaJob(reconcileTargetId)
      .then((res) => {
        // 用户在请求返回前已点档位启动：以启动接口返回的 job 为准，不回退成旧状态。
        if (
          active &&
          res?.job &&
          !startingRef.current &&
          startedAtRef.current === null
        ) {
          setJob(res.job);
        }
      })
      .catch(() => {
        // 对账失败静默保留快照，不打扰用户
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconcileTargetId, isPendingStart]);

  // ===== 已用时间 =====
  // MediaJob 上没有「启动时间」字段，按可信度降级：
  // 1) 本卡内点档位启动的时刻；2) charges 里最早的扣费时刻 at（≈ 第一阶段开始）；
  // 3) 本卡首次看到运行中的时刻（重挂载后会低估，但不会像 updatedAt 那样每次进度更新就归零）。
  const startedAtRef = useRef<number | null>(null);
  const firstSeenRunningRef = useRef<number | null>(null);
  const isRunningNow = currentStatus === "running";
  if (isRunningNow && firstSeenRunningRef.current === null) {
    firstSeenRunningRef.current = Date.now();
  }
  const earliestChargeAt = (job?.charges ?? [])
    .map((c) => c?.at)
    .filter((at): at is number => typeof at === "number" && Number.isFinite(at))
    .reduce<number | undefined>((min, at) => (min === undefined || at < min ? at : min), undefined);
  const runStartedAt =
    startedAtRef.current ?? earliestChargeAt ?? firstSeenRunningRef.current;
  const [nowTick, setNowTick] = useState(() => Date.now());
  // 运行中每秒刷新已用时间。用 setTimeout 链而不是 setInterval：不与轮询 interval 混淆。
  useEffect(() => {
    if (!isRunningNow) return;
    const timer = setTimeout(() => setNowTick(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [isRunningNow, nowTick]);

  // 轮询运行中的任务（运行中每 3s，终态停）
  useEffect(() => {
    const targetId = jobId || job?.id;
    if (!targetId) return;
    if (job?.status && TERMINAL_STATUSES.has(job.status)) return;
    if (job?.status === "quoted" && !hasStarted) return;
    // 待确认启动态由挂载时的单次查询定态，不轮询（用户点击确认后 hasStarted 再开启）
    if (isPendingStart && !hasStarted) return;

    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      try {
        const res = await getMediaJob(targetId);
        if (active && res?.job) {
          setJob(res.job);
          if (TERMINAL_STATUSES.has(res.job.status)) {
            clearInterval(interval);
          }
        }
      } catch {
        // 网络异常静默忽略，下次轮询重试
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId, job?.id, job?.status, hasStarted, isPendingStart]);

  // 卡内选译文语言：以该语言对 translate/full 各重新报价（报价必须含翻译），全部成功后才解锁。
  // 失败时不改 chosen/job/报价，档位保持置灰，避免展示与所选语言不一致的价格。
  const handleChooseTargetLang = async (code: string) => {
    if (readOnly || requoting || startingRef.current) return;
    const targetId = jobId || job?.id;
    if (!targetId) {
      setStartError("缺少任务 ID");
      return;
    }
    setRequoting(true);
    setStartError(null);
    try {
      const scope: MediaScope = job?.scope || {
        fromSec: 0,
        toSec: job?.durationSec || 0,
      };
      const nextQuotes: Partial<Record<MediaJobDepth, MediaQuote>> = {};
      let latestJob: MediaJob | undefined;
      for (const depth of ["translate", "full"] as const) {
        const res = await updateMediaQuote(
          targetId,
          scope,
          depth,
          job?.sourceLang,
          code,
        );
        if (res?.quote) nextQuotes[depth] = res.quote;
        if (res?.job) latestJob = res.job;
      }
      setRequotes(nextQuotes);
      setChosenTargetLang(code);
      if (latestJob) setJob(latestJob);
    } catch (err: any) {
      setStartError(err?.message || "重新报价失败，请稍后重试");
    } finally {
      setRequoting(false);
    }
  };

  const handleStartTier = async (tier: MediaJobTier) => {
    if (readOnly || startingRef.current) return;
    // translate 与 full 都需要译文语言：无语言时 full 只会产出原文+大纲，不能以「全套（对照…）」启动。
    const requiresLang = tier.depth === "translate" || tier.depth === "full";
    if (requiresLang && !effectiveTargetLang) {
      setStartError("请先指定译文语言（如中文、英文）后再启动翻译");
      return;
    }
    const targetId = jobId || job?.id;
    if (!targetId) {
      setStartError("缺少任务 ID");
      return;
    }
    startingRef.current = true;
    setStarting(true);
    setStartError(null);
    try {
      const scope: MediaScope = job?.scope || {
        fromSec: 0,
        toSec: job?.durationSec || 0,
      };
      const res = await startMediaJob(
        targetId,
        scope,
        tier.depth,
        job?.sourceLang,
        requiresLang ? effectiveTargetLang : job?.targetLang,
      );
      startedAtRef.current = Date.now();
      setJob(res.job);
      setHasStarted(true);
    } catch (err: any) {
      setStartError(err?.message || "启动失败，请稍后重试");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  const handleConfirmOverrun = async (accept: boolean) => {
    if (readOnly || actionBusyRef.current) return;
    const targetId = jobId || job?.id;
    if (!targetId) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await mediaJobAction(targetId, "confirm-overrun", { accept });
      if (res?.job) {
        setJob(res.job);
      }
    } catch (err: any) {
      setActionError(err?.message || "操作失败，请稍后重试");
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleCancel = async () => {
    if (readOnly || actionBusyRef.current) return;
    const targetId = jobId || job?.id;
    if (!targetId) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await mediaJobAction(targetId, "cancel");
      if (res?.job) {
        setJob(res.job);
      }
    } catch (err: any) {
      setActionError(err?.message || "取消失败，请稍后重试");
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleExtendRemaining = async () => {
    if (readOnly || actionBusyRef.current || !job) return;
    const targetId = jobId || job.id;
    if (!targetId) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    setActionError(null);
    try {
      const from = job.scope?.toSec ?? 0;
      const to = job.durationSec;
      const res = await mediaJobAction(targetId, "extend", {
        scope: { fromSec: from, toSec: to },
        depth: job.depth,
      });
      if (res?.job) {
        setJob(res.job);
      }
    } catch (err: any) {
      setActionError(err?.message || "追加处理失败，请稍后重试");
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleResume = async () => {
    if (readOnly || actionBusyRef.current || !job) return;
    const targetId = jobId || job.id;
    if (!targetId) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await mediaJobAction(targetId, "extend", {
        scope: job.scope,
        depth: job.depth,
      });
      if (res?.job) {
        setJob(res.job);
      }
    } catch (err: any) {
      setActionError(err?.message || "继续处理失败，请稍后重试");
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  // 待确认卡挂载时查一次 job：刷新后若任务已被启动（或在别处启动），直接切进度态，
  // 不再给出一个必然 409 的「确认启动」按钮。
  useEffect(() => {
    if (!isPendingStart || !pendingJobId || hasStarted) return;
    let active = true;
    getMediaJob(pendingJobId)
      .then((res) => {
        if (active && res?.job) setJob(res.job);
      })
      .catch(() => {
        // 查询失败保持待确认态，用户点击时再由启动接口给出明确错误
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPendingStart, pendingJobId]);

  // run 已确认成功：确认已生效，不该再渲染「确认启动」（点了只会刷新的按钮会误导用户），
  // 改为自动刷新一次任务状态进入进度态（与下面分支 (b) 同一刷新路径）。
  const pendingRunSucceeded = pendingRun?.status === "succeeded";
  useEffect(() => {
    if (!isPendingStart || !pendingRunSucceeded || !pendingJobId || hasStarted) return;
    let active = true;
    getMediaJob(pendingJobId)
      .then((res) => {
        if (active && res?.job) setJob(res.job);
      })
      .catch(() => {
        // 刷新失败保持现状，不弹错误：确认已生效，进度以既有查询/轮询为准
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPendingStart, pendingRunSucceeded, pendingJobId]);

  const handleConfirmPendingStart = async () => {
    if (readOnly || startingRef.current || !pendingDepth) return;
    startingRef.current = true;
    setStarting(true);
    setStartError(null);
    try {
      const run = pendingToolRunId ? getToolRunById(pendingToolRunId) : undefined;
      if (
        run &&
        storeDispatch &&
        run.interaction === "confirm" &&
        (run.status === "pending" || run.status === "failed")
      ) {
        // (a) run 仍在待确认态：与 MessageToolConfirmBar 同一路径，推进同一个 confirm run
        // （其 input 里的 __confirmedMediaJobStart 由 toolThunks 确认分支注入，绝不来自模型）。
        const result = await storeDispatch(executeToolRun({ id: run.id })).unwrap();
        const nextJob = result?.rawData?.job;
        if (nextJob) setJob(nextJob);
      } else if (run) {
        // (b) run 仍在 store 但不处于可确认态（running / succeeded / 其他）：绝不直连启动
        // （会触发 409、重复计费，或绕过 confirm run 用未经确认的参数启动），
        // 仅刷新任务状态进入进度态后返回。直连回退只属于下面「run 已不在 store」一支。
        if (pendingJobId) {
          const res = await getMediaJob(pendingJobId);
          if (res?.job) setJob(res.job);
        }
        return;
      } else {
        // (c) run 已不在内存 store（页面刷新后）：确认已失效，这里绝不回退直连 startMediaJob——
        // 那等于用持久化（可能由模型给出）的 depth/scope/targetLang 绕过确认闸门直接计费。
        // UI 此时不渲染「确认启动」，而是引导用户回到上方报价卡重新选档位（点档位即确认）。
        return;
      }
      setHasStarted(true);
    } catch (err: any) {
      setStartError(userFacingError(err?.message) || "启动失败，请稍后重试");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  /**
   * 确认已失效（页面刷新后 run 丢失）→ 滚到报价卡并聚焦其第一个档位按钮。
   * 同一对话可能有多个媒体任务，本卡只能定位自己那张报价卡：
   * - pendingJobId 有值（含空串等无效 id）：只接受 data-job-id 的精确命中；匹配不到
   *   （空串 / 旧 DOM / 缺 data-job-id / 选择器非法）直接提示 missing，绝不退回
   *   「最后一个」——否则会聚焦到别的媒体任务上。
   * - pendingJobId 字段缺失（旧载荷，undefined）：没有可精确比对的目标，才退回
   *   「页面上最后一个报价卡」。
   */
  const handleBackToQuote = () => {
    if (typeof document === "undefined") {
      setBackToQuoteMissing(true);
      return;
    }
    // CSS.escape 不可用时手工转义会破坏选择器字符串字面量的 \ 与 "
    // （否则 querySelector 抛 SyntaxError，点击会静默失败，既无定位也无提示）。
    const escapeId = (value: string): string => {
      const cssApi = (globalThis as { CSS?: { escape?: (input: string) => string } })
        .CSS;
      if (typeof cssApi?.escape === "function") return cssApi.escape(value);
      return value.replace(/["\\]/g, "\\$&");
    };
    let target: HTMLElement | null = null;
    // 空串同样是「有 id」：它无从精确命中，只能走到下方的 missing 提示。
    if (typeof pendingJobId === "string") {
      // 有 jobId 时只认精确命中：匹配不到就提示 missing，绝不退回「最后一个报价卡」。
      try {
        target = document.querySelector(
          `[data-testid="tier-selection-section"][data-job-id="${escapeId(pendingJobId)}"]`,
        ) as HTMLElement | null;
      } catch {
        target = null; // 选择器非法（转义覆盖不到的字符）：按未命中处理，下方给提示
      }
    } else {
      // 旧载荷没有 jobId，无从精确比对，此时才允许退回「最后一个报价卡」。
      const nodes = document.querySelectorAll(
        '[data-testid="tier-selection-section"]',
      );
      target = nodes.length > 0 ? (nodes[nodes.length - 1] as HTMLElement) : null;
    }
    if (!target) {
      setBackToQuoteMissing(true);
      return;
    }
    setBackToQuoteMissing(false);
    target.scrollIntoView?.({ behavior: "smooth", block: "center" });
    const firstButton = target.querySelector("button") as HTMLButtonElement | null;
    firstButton?.focus?.();
  };

  const showPendingStart =
    isPendingStart && !hasStarted && (!job || job.status === "quoted");

  if (showPendingStart) {
    const label =
      (typeof pendingStart?.label === "string" && pendingStart.label) ||
      (pendingDepth ? PENDING_TIER_LABELS[pendingDepth] : "所选档位");
    // 积分/耗时优先取随本次待确认一起传来的 pendingStart.quote（就是这次要确认的报价），
    // 它就是本次的报价，不受下面的一致性约束。
    // 旧载荷没有它时，才回退 job.quote，但 depth 与 scope 必须同时一致：多档报价后
    // job.quote 停在最后一次报价的档位；范围更致命 —— 全片报价（20 积分）贴到
    // 「范围 0:00–1:00」上，用户看到的金额与实际计费完全脱节。任一字段缺失/不等都算
    // 不一致，此时不给数字，只提示「以启动时服务端报价为准」。
    const pendingQuote: MediaQuote | undefined =
      asQuote(pendingStart?.quote) ??
      (job?.quote && job.depth === pendingDepth && sameScope(job.scope, pendingScope)
        ? job.quote
        : undefined);
    const creditsText = formatCredits(pendingQuote?.totalCredits);
    const etaText = formatEta(pendingQuote?.etaSec);
    const detail = [creditsText, etaText].filter(Boolean).join("，");
    // 兜底文案的判据是「有没有可显示的价格数字」，不是「pendingQuote 对象在不在」：
    // 对象在、但 totalCredits 非法时 formatCredits 返回空串，金额位置会整块留白 ——
    // 计费面上留白比明说「以服务端报价为准」危险得多（读起来像不花钱）。
    const hasPrice = Boolean(creditsText);
    // 实际将发送的处理范围与译文语言：让用户在点按钮前看到 depth/scope/targetLang。
    // 规则与后端 normalizeScope（packages/server/handlers/mediaJobs/ranges.ts）对齐，不自创判定：
    //   · fromSec/toSec 先 Math.max(0, …) 截断（负值是服务端截断的输入，不是合法小区间，
    //     也绝不能渲染出「范围 -1:-10–1:00」这种畸形时间戳）；
    //   · 服务端 `to - from < 1` 返回 null → handler 回 400 INVALID_INPUT，因此倒挂与零长
    //     都不可执行，绝不能包装成「范围 X 起」或某个正常区间去暗示能按它计费。
    // 半合法/损坏 scope（一侧 NaN/Infinity/undefined）绝不渲染垃圾：缺失的一侧不兜 0，
    // 否则会拼出「范围 1:00–0:00」这种反向读数。分档渲染：
    //   可执行区间 → 「范围 X–Y」
    //   to - from < 1（倒挂 / 零长 / 负值钳到 0 后不足 1 秒）→ 「范围异常（X–Y）」如实警示
    //   仅起点有限 → 「范围 X 起」（终点未知，服务端补全片时长）
    //   仅终点有限 → 「范围 至 Y」（起点未知：绝不脑补成 0:00，那会把「到 5:00 结束」
    //     伪装成「从 0:00 处理到 5:00」的看似精确区间）
    //   两端都非有限 → 「全片」
    // 用 typeof + Number.isFinite（而非 as 断言）收窄，避免上一轮 TS2352 那类转换报错。
    const rawScopeFrom = pendingScope?.fromSec;
    const rawScopeTo = pendingScope?.toSec;
    const scopeFromSec =
      typeof rawScopeFrom === "number" && Number.isFinite(rawScopeFrom)
        ? rawScopeFrom
        : undefined;
    const scopeToSec =
      typeof rawScopeTo === "number" && Number.isFinite(rawScopeTo)
        ? rawScopeTo
        : undefined;
    const shownFromSec =
      scopeFromSec !== undefined ? Math.max(0, scopeFromSec) : undefined;
    const shownToSec =
      scopeToSec !== undefined ? Math.max(0, scopeToSec) : undefined;
    // 服务端起点默认 0（normalizeScope 的 `r.fromSec ?? 0`）；终点未知时服务端补全片时长，
    // 客户端无从判断，此时不做异常断言。
    const execFromSec = shownFromSec ?? 0;
    const invalidToSec =
      shownToSec !== undefined && shownToSec - execFromSec < 1
        ? shownToSec
        : undefined;
    const scopeText =
      invalidToSec !== undefined
        ? `范围异常（${fmtClock(execFromSec)}–${fmtClock(invalidToSec)}）`
        : shownFromSec !== undefined && shownToSec !== undefined
          ? `范围 ${fmtClock(shownFromSec)}–${fmtClock(shownToSec)}`
          : shownFromSec !== undefined
            ? `范围 ${fmtClock(shownFromSec)} 起`
            : shownToSec !== undefined
              ? `范围 至 ${fmtClock(shownToSec)}`
              : "全片";
    const langText = pendingTargetLang ? `译文：${pendingTargetLang}` : "";
    const busy = starting || pendingRun?.status === "running";
    // run 仍在 store（含 running/succeeded）：保留按钮（点击刷新进度或推进同一个 run）。
    // run 已不在 store（页面刷新后）：确认已失效，不再渲染「确认启动」，改为引导回报价卡。
    const runInStore = Boolean(pendingRun);
    // succeeded：确认已生效，按钮点了只会刷新，标签误导 → 不渲染按钮，只提示正在载入。
    const runSucceeded = pendingRun?.status === "succeeded";

    // 确认已失效（页面刷新后 run 已不在 store）：整卡铺开的信息都没用了，收成一行
    // 「确认已失效 · 档位名」+ 一条回报价卡的出口。绝不在这里渲染「确认启动」——
    // 那会让持久化的 depth/scope/targetLang 绕过确认闸门直接计费。
    if (!runInStore) {
      return (
        <div
          data-testid="media-job-pending-start"
          data-pending-confirm="true"
          data-confirm-in-place={canConfirmInPlace ? "true" : "false"}
          data-pending-invalid="true"
          style={{
            marginTop: 8,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            border: "1px solid var(--borderWarning, rgba(234, 179, 8, 0.35))",
            borderRadius: "var(--radius-md, 8px)",
            backgroundColor: "var(--surfaceWarning, rgba(234, 179, 8, 0.08))",
            padding: "8px 12px",
            fontSize: "var(--fontSize-sm, 13px)",
            color: "var(--text, #111827)",
          }}
        >
          <span
            data-testid="media-job-pending-start-invalid"
            style={{ fontWeight: 600 }}
          >
            确认已失效 · {label}
          </span>
          {!readOnly && (
            <button
              type="button"
              data-testid="media-job-back-to-quote"
              onClick={handleBackToQuote}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px 12px",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text, #111827)",
                backgroundColor: "transparent",
                border: "1px solid var(--borderMuted, #d1d5db)",
                borderRadius: "var(--radius-md, 6px)",
                cursor: "pointer",
              }}
            >
              回到报价卡
            </button>
          )}
          {readOnly && (
            <span style={{ fontSize: "12px", color: "var(--textMuted, #6b7280)" }}>
              等待确认启动
            </span>
          )}
          {backToQuoteMissing && (
            <span
              data-testid="media-job-back-to-quote-missing"
              style={{ fontSize: "12px", color: "var(--textMuted, #6b7280)" }}
            >
              请重新让助手估价
            </span>
          )}
          {startError && (
            <span
              role="alert"
              style={{ fontSize: "12px", color: "var(--danger, #ef4444)" }}
            >
              {startError}
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        data-testid="media-job-pending-start"
        data-pending-confirm="true"
        data-confirm-in-place={canConfirmInPlace ? "true" : "false"}
        style={{
          marginTop: 8,
          marginBottom: 8,
          border: "1px solid var(--borderWarning, rgba(234, 179, 8, 0.35))",
          borderRadius: "var(--radius-md, 8px)",
          backgroundColor: "var(--surfaceWarning, rgba(234, 179, 8, 0.08))",
          padding: "12px 16px",
          fontSize: "var(--fontSize-sm, 13px)",
          color: "var(--text, #111827)",
        }}
      >
        <div style={{ fontWeight: 600 }}>
          将启动：{label}
          {detail ? `（${detail}）` : ""}
        </div>
        <div
          data-testid="media-job-pending-start-params"
          style={{
            marginTop: 4,
            fontSize: "12px",
            color: "var(--textMuted, #6b7280)",
          }}
        >
          {langText ? `${scopeText} · ${langText}` : scopeText}
        </div>
        {!hasPrice && (
          <div
            style={{
              marginTop: 2,
              fontSize: "12px",
              color: "var(--textMuted, #6b7280)",
            }}
          >
            费用以启动时服务端报价为准
          </div>
        )}
        <div
          style={{
            marginTop: 4,
            fontSize: "12px",
            color: "var(--textMuted, #6b7280)",
          }}
        >
          {readOnly
            ? "等待确认启动"
            : runSucceeded
              ? "已启动，正在载入进度…"
              : "确认后按该档位开始处理并计费"}
        </div>
        {!readOnly && !runSucceeded && (
          <button
            type="button"
            data-testid="media-job-confirm-start"
            disabled={busy || !pendingDepth}
            onClick={() => void handleConfirmPendingStart()}
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: "var(--primary, #2563eb)",
              border: "none",
              borderRadius: "var(--radius-md, 6px)",
              cursor: busy || !pendingDepth ? "not-allowed" : "pointer",
              opacity: busy || !pendingDepth ? 0.6 : 1,
            }}
          >
            {busy ? "启动中…" : "确认启动"}
          </button>
        )}
        {backToQuoteMissing && (
          <div
            data-testid="media-job-back-to-quote-missing"
            style={{
              marginTop: 4,
              fontSize: "12px",
              color: "var(--textMuted, #6b7280)",
            }}
          >
            请重新让助手估价
          </div>
        )}
        {startError && (
          <div
            role="alert"
            style={{
              marginTop: 8,
              fontSize: "12px",
              color: "var(--danger, #ef4444)",
            }}
          >
            {startError}
          </div>
        )}
      </div>
    );
  }

  // 既无 job 也无 quote：没有任何可渲染信息，返回空（不渲染空卡）
  // （待确认卡确认启动后 initialJob 为空，但本地 job 已有值，须继续渲染进度态）
  if (!isError && !initialJob && !initialQuote && !job) {
    return null;
  }

  if (isError) {
    return (
      <div
        role="alert"
        style={{
          marginTop: 8,
          marginBottom: 8,
          border: "1px solid var(--borderError, rgba(239, 68, 68, 0.3))",
          borderRadius: "var(--radius-md, 8px)",
          backgroundColor: "var(--surfaceError, rgba(239, 68, 68, 0.05))",
          padding: "12px 16px",
          fontSize: "var(--fontSize-sm, 13px)",
          color: "var(--danger, #ef4444)",
        }}
      >
        {userFacingError(job?.error || data.summary || "媒体任务处理失败")}
      </div>
    );
  }

  const spentCredits = job
    ? Object.values(job.spent ?? {}).reduce((a, b) => a + (b ?? 0), 0)
    : 0;
  // 非有限数（spent 里有 NaN/Infinity）绝不进文案：宁可只说「已取消」，也不输出
  // 「已扣 NaN 积分」这种像真实金额的垃圾（计费面）。
  const spentCreditsText = formatSingleCredits(spentCredits);
  const overrunCreditsText = formatSingleCredits(job?.overrunCredits);

  // 进度数字同样是用户可见文案：done/total 由外部写入，任一非有限数就会渲染出
  // 「转写 NaN/10」「NaN%」这类读起来像真实进度的垃圾。集中在这里做一次有限数守卫。
  const progressDone = finiteNumber(job?.progress?.done);
  const progressTotal = finiteNumber(job?.progress?.total);
  const progressPercent =
    progressDone !== undefined && progressTotal !== undefined && progressTotal > 0
      ? // 上下限都要钳：只钳 100 时，done < 0 会渲染「-10%」并把进度条宽度设成负值。
        Math.max(
          0,
          Math.min(100, Math.round((progressDone / progressTotal) * 100)),
        )
      : undefined;

  const hasRemainingRange = Boolean(
    job &&
      job.status === "done" &&
      typeof job.durationSec === "number" &&
      job.durationSec > 0 &&
      job.scope &&
      job.scope.toSec < job.durationSec,
  );

  const hasArtifacts = Boolean(
    job &&
      ((job.spent &&
        Object.values(job.spent).some((v) => typeof v === "number" && v > 0)) ||
        (job.stageArtifacts &&
          Object.values(job.stageArtifacts).some(Boolean))),
  );

  // ===== 确认后冻结：只读摘要（从 job.depth/targetLang/quote 还原，刷新后也能还原）=====
  const confirmedDepth: MediaJobDepth | undefined = isDepth(job?.depth)
    ? job?.depth
    : undefined;
  const confirmedTier = confirmedDepth
    ? tiers.find((tier) => tier.depth === confirmedDepth)
    : undefined;
  const confirmedLabel = confirmedDepth
    ? (confirmedTier?.label ?? PENDING_TIER_LABELS[confirmedDepth])
    : undefined;
  const confirmedLangCode = job?.targetLang;
  const confirmedLangName = confirmedLangCode
    ? (TARGET_LANG_CHOICES.find((c) => c.code === confirmedLangCode)?.label ??
      confirmedLangCode)
    : undefined;
  // 报价区间：服务端 job.quote 为准，其次同档位的报价快照；非法数字由 formatCredits 拦成空串。
  const confirmedCreditsText = formatCredits(
    job?.quote?.totalCredits ?? confirmedTier?.quote?.totalCredits,
  );
  const confirmedSummary = confirmedLabel
    ? [
        confirmedLabel,
        // 只有本档会翻译时才显示译文语言（outline 不翻译，显示语言会误导）
        confirmedDepth !== "outline" ? confirmedLangName : undefined,
        confirmedCreditsText || undefined,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  // ===== 进度区：只列本 job 实际会跑的阶段 =====
  const jobStages = stagesForJob(job?.depth, Boolean(job?.targetLang));
  const currentStageIdx = jobStages.findIndex((s) => s.key === job?.stage);
  const etaRange: [number, number] | undefined = job?.quote?.etaSec;
  const elapsedMs =
    isRunningNow && runStartedAt !== null && runStartedAt !== undefined
      ? Math.max(0, nowTick - runStartedAt)
      : undefined;
  const etaText = formatEtaMinutesRange(etaRange);
  const overEta =
    elapsedMs !== undefined &&
    etaText !== "" &&
    Array.isArray(etaRange) &&
    elapsedMs / 1000 > etaRange[1];
  const runningDetail = [
    elapsedMs !== undefined ? `已用 ${formatElapsed(elapsedMs)}` : "",
    overEta ? "比预计慢，仍在处理" : etaText,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      data-testid="media-job-tool-card"
      style={{
        marginTop: 8,
        marginBottom: 8,
        border: "1px solid var(--borderMuted, var(--border, #e5e7eb))",
        borderRadius: "var(--radius-md, 8px)",
        backgroundColor: "var(--surfaceInset, var(--background, #ffffff))",
        padding: "14px 16px",
        fontSize: "var(--fontSize-sm, 13px)",
        color: "var(--text, #111827)",
        boxShadow: "0 2px 8px -2px var(--shadowMedium, rgba(0, 0, 0, 0.05))",
      }}
    >
      {/* 档位卡模式：quoted 且未启动 */}
      {isQuoted && (
        <div
          data-testid="tier-selection-section"
          data-job-id={jobId || job?.id}
        >
          {/* 截取建议 */}
          {job?.trimSuggestions && job.trimSuggestions.length > 0 && (
            <div
              data-testid="trim-suggestions"
              style={{
                marginBottom: 12,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm, 6px)",
                backgroundColor:
                  "var(--surfaceSecondary, rgba(234, 179, 8, 0.08))",
                border:
                  "1px solid var(--borderWarning, rgba(234, 179, 8, 0.25))",
                color: "var(--textWarning, #b45309)",
                fontSize: "var(--fontSize-xs, 12px)",
                lineHeight: 1.5,
              }}
            >
              {job.trimSuggestions.map((suggestion, index) => {
                // 截取建议的时间区间来自外部/模型产出，最容易损坏：`!== undefined` 这种守卫
                // 会放行 { fromSec: NaN, toSec: 300 } → 兜到 0 后渲染成「（0:00 ~ 5:00）」，
                // 把损坏数据伪装成「从头开始」，用户会据此误判计费区间。
                // 因此收紧为「两端都是有限数」才渲染区间，否则整段括号不渲染（不用 0 兜底）。
                const fromSec = suggestion.fromSec;
                const toSec = suggestion.toSec;
                // 区间文案统一走 formatRangePair（非有限数/负数/倒挂/零长一律不给括号），
                // 与 pendingScope「不可执行的区间绝不展示成正常区间」同一口径。
                const rangeText = formatRangePair(fromSec, toSec);
                return (
                  <div key={index}>
                    截取建议：{suggestion.reason}
                    {rangeText && <span>{rangeText}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {!readOnly && (
            <div
              data-testid="tier-selection-hint"
              style={{
                marginBottom: 8,
                fontSize: "12px",
                color: "var(--textMuted, #6b7280)",
              }}
            >
              点选一个档位即开始处理（点击即确认，无需再回复）
            </div>
          )}

          {/* 已点选的译文语言：选择后收起选择器，只保留一行说明，便于用户确认所选语言 */}
          {!readOnly && knownTargetLang && chosenTargetLang && (
            <div
              data-testid="target-lang-chosen"
              style={{
                marginBottom: 8,
                fontSize: "12px",
                color: "var(--textMuted, #6b7280)",
              }}
            >
              译文语言：
              {TARGET_LANG_CHOICES.find((c) => c.code === chosenTargetLang)?.label ??
                chosenTargetLang}
            </div>
          )}

          {/* 译文语言选择：job 未记录 targetLang 时才出现；不默认选中，点选即为显式选择 */}
          {!readOnly && !knownTargetLang && (
            <div
              data-testid="target-lang-picker"
              style={{
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                fontSize: "12px",
                color: "var(--textMuted, #6b7280)",
              }}
            >
              <span>译文语言：</span>
              {TARGET_LANG_CHOICES.map((choice) => {
                const selected = chosenTargetLang === choice.code;
                return (
                  <button
                    key={choice.code}
                    type="button"
                    data-testid={`target-lang-${choice.code}`}
                    aria-pressed={selected}
                    disabled={requoting || starting}
                    onClick={() => void handleChooseTargetLang(choice.code)}
                    style={{
                      padding: "2px 10px",
                      fontSize: "12px",
                      borderRadius: "var(--radius-sm, 4px)",
                      border: selected
                        ? "1px solid var(--primary, #2563eb)"
                        : "1px solid var(--borderMuted, var(--border, #e5e7eb))",
                      backgroundColor: selected
                        ? "var(--primary, #2563eb)"
                        : "var(--surfaceDefault, var(--background, #ffffff))",
                      color: selected ? "#ffffff" : "var(--text, #111827)",
                      cursor: requoting || starting ? "not-allowed" : "pointer",
                    }}
                  >
                    {choice.label}
                  </button>
                );
              })}
              {requoting && <span>正在按该语言重新报价…</span>}
            </div>
          )}

          {/* 档位列表 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {tiers.map((tier) => {
              // 选语言后 translate/full 用该语言重新报价的结果，覆盖 tiers 里不含译文的旧价格。
              // 注意：选语言后 job.targetLang 会随重新报价落库（knownTargetLang 变真），所以这里必须优先取 requotes，
              // 不能用 knownTargetLang 判断，否则会回退到不含译文的旧报价。
              const quote = requotes[tier.depth] ?? tier.quote;
              // translate 与 full 都依赖译文语言：缺失时 full 会静默不含翻译，必须同样置灰。
              const needsLang =
                (tier.depth === "translate" || tier.depth === "full") &&
                !effectiveTargetLang;
              // AI 推荐档（工具入参 depth）才给主色边框 + 「推荐」标签；其余档位保持中性边框。
              // 同一时刻只允许一个主色边框：悬停/聚焦的档位优先，无悬停时才回落到推荐档。
              const isRecommended = pendingDepth === tier.depth;
              const isEmphasized = emphasizedDepth
                ? emphasizedDepth === tier.depth
                : isRecommended;
              const affordableToSec = quote?.affordableToSec;
              const balance = quote?.balanceCredits;
              const minCredits = quote?.totalCredits?.[0] ?? 0;
              const isInsufficient =
                affordableToSec !== undefined ||
                (typeof balance === "number" && balance < minCredits);

              // 只有「至少能跑满 1 分钟」（affordableToSec >= 60）才有可展示的时长：
              // [0,59] 秒时 Math.floor(.../60) 得 0，会拼出「当前余额可处理前 0 分钟」，
              // 负数则拼出「前 -1 分钟」—— 两者都读起来像可用时长，比「余额不足」更容易误判。
              const affordableMins =
                typeof affordableToSec === "number" &&
                Number.isFinite(affordableToSec) &&
                affordableToSec >= 60
                  ? Math.floor(affordableToSec / 60)
                  : undefined;
              // 无有效可处理时长时绝不拼「当前余额可处理前 NaN 分钟/0 分钟」：
              // 用不含数字的提示回落（余额不足的事实仍成立，只是时长未知）。
              const insufficientText =
                affordableMins !== undefined
                  ? `当前余额可处理前 ${affordableMins} 分钟`
                  : "当前余额不足";
              const creditsText = formatCredits(quote?.totalCredits);
              const etaText = formatEta(quote?.etaSec);

              const content = (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: isInsufficient
                          ? "var(--textMuted, #6b7280)"
                          : "var(--text, #111827)",
                      }}
                    >
                      {tier.label}
                      {isRecommended && (
                        <span
                          data-testid={`tier-recommended-${tier.depth}`}
                          style={{
                            marginLeft: 8,
                            padding: "1px 6px",
                            fontSize: "11px",
                            fontWeight: 500,
                            borderRadius: "var(--radius-sm, 4px)",
                            color: "var(--primary, #2563eb)",
                            border: "1px solid var(--primary, #2563eb)",
                          }}
                        >
                          推荐
                        </span>
                      )}
                    </span>
                    <span
                      data-testid={`tier-credits-${tier.depth}`}
                      style={{
                        fontWeight: 600,
                        fontSize: "13px",
                        color: isInsufficient
                          ? "var(--textMuted, #6b7280)"
                          : "var(--primary, #2563eb)",
                      }}
                    >
                      {/* 可交互卡缺译文语言时，full/translate 的价格不可信（full 实为不含翻译）：不展示数字，等用户点选语言后重新报价。
                          只读卡无选择器，保留原报价以反映当时的估价。 */}
                      {needsLang && !readOnly
                        ? "选择译文语言后显示报价"
                        : creditsText || "费用待服务端报价"}
                    </span>
                  </div>
                  {etaText && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--textMuted, #6b7280)",
                        marginTop: 2,
                      }}
                    >
                      {etaText}
                    </div>
                  )}
                  {isInsufficient && (
                    <div
                      data-testid="insufficient-hint"
                      style={{
                        fontSize: "12px",
                        color: "var(--danger, #ef4444)",
                        marginTop: 4,
                        fontWeight: 500,
                      }}
                    >
                      {insufficientText}
                    </div>
                  )}
                  {needsLang && (
                    <div
                      data-testid="missing-target-lang-hint"
                      style={{
                        fontSize: "12px",
                        color: "var(--textMuted, #6b7280)",
                        marginTop: 4,
                        fontWeight: 500,
                      }}
                    >
                      请先指定译文语言（如中文、英文）后再启动翻译
                    </div>
                  )}
                  {!readOnly && !isInsufficient && !needsLang && (
                    <div
                      data-testid={`tier-cta-${tier.depth}`}
                      style={{
                        alignSelf: "flex-end",
                        marginTop: 4,
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--primary, #2563eb)",
                      }}
                    >
                      {starting ? "启动中…" : "开始处理 →"}
                    </div>
                  )}
                </>
              );

              // readOnly 模式不渲染可点按钮
              if (readOnly) {
                return (
                  <div
                    key={tier.depth}
                    data-testid={`tier-${tier.depth}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md, 6px)",
                      border:
                        "1px solid var(--borderMuted, var(--border, #e5e7eb))",
                      backgroundColor:
                        "var(--surfaceDefault, var(--background, #ffffff))",
                      opacity: isInsufficient ? 0.6 : 1,
                      boxSizing: "border-box",
                    }}
                  >
                    {content}
                  </div>
                );
              }

              return (
                <button
                  key={tier.depth}
                  type="button"
                  data-testid={`tier-btn-${tier.depth}`}
                  disabled={isInsufficient || starting || needsLang}
                  onClick={() => handleStartTier(tier)}
                  onMouseEnter={() => setEmphasizedDepth(tier.depth)}
                  onMouseLeave={() => setEmphasizedDepth(null)}
                  onFocus={() => setEmphasizedDepth(tier.depth)}
                  onBlur={() => setEmphasizedDepth(null)}
                  aria-label={`开始处理：${tier.label}${creditsText ? `（${creditsText}）` : ""}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md, 6px)",
                    // 中性边框为默认；仅 hover/focus 或推荐档用主色，同一时刻不会多个档位同时主色。
                    border:
                      isInsufficient || needsLang || !isEmphasized
                        ? "1px solid var(--borderMuted, var(--border, #e5e7eb))"
                        : "1px solid var(--primary, #2563eb)",
                    backgroundColor:
                      "var(--surfaceDefault, var(--background, #ffffff))",
                    cursor:
                      isInsufficient || starting || needsLang
                        ? "not-allowed"
                        : "pointer",
                    opacity: isInsufficient || needsLang ? 0.6 : 1,
                    textAlign: "left",
                    width: "100%",
                    boxSizing: "border-box",
                    transition: "all 0.15s ease",
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>

          {startError && (
            <div
              role="alert"
              style={{
                marginTop: 8,
                fontSize: "12px",
                color: "var(--danger, #ef4444)",
              }}
            >
              {startError}
            </div>
          )}
        </div>
      )}

      {/* 进度卡模式：非 quoted 或已启动 */}
      {isProgress && (
        <div data-testid="job-progress-section">
          {/* 确认后冻结：档位不再可点，只留一行只读摘要 */}
          {confirmedSummary && (
            <div
              data-testid="job-confirmed-summary"
              style={{
                fontSize: "12px",
                color: "var(--textMuted, #6b7280)",
                marginBottom: 10,
              }}
            >
              ✓ 已确认：{confirmedSummary}
            </div>
          )}
          {/* 阶段指示器：只列本 job 实际会跑的阶段（同服务端 stagesForDepth） */}
          <div
            data-testid="job-stage-list"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 4,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {jobStages.map((s, idx) => {
              const isPast =
                job?.status === "done" ||
                (currentStageIdx >= 0 && currentStageIdx > idx) ||
                Boolean(job?.stageArtifacts?.[s.key]);
              const isCurrent =
                !isPast &&
                currentStageIdx === idx &&
                job?.status !== "done";
              const isActive = isCurrent && isRunningNow;
              return (
                <div
                  key={s.key}
                  data-testid={`job-stage-${s.key}`}
                  data-stage-state={
                    isPast ? "done" : isCurrent ? "current" : "pending"
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "12px",
                    color: isCurrent
                      ? "var(--primary, #2563eb)"
                      : isPast
                        ? "var(--text, #111827)"
                        : "var(--textMuted, #9ca3af)",
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {isPast && <span aria-hidden="true">✓</span>}
                  {isActive && (
                    <span
                      data-testid="job-stage-active-spinner"
                      style={{ display: "inline-flex" }}
                    >
                      <LoadingSpinner size={11} thickness={2} />
                    </span>
                  )}
                  <span>{s.label}</span>
                  {idx < jobStages.length - 1 && (
                    <span
                      style={{
                        color: "var(--borderMuted, #d1d5db)",
                        userSelect: "none",
                      }}
                    >
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 当前状态与进度文字 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "13px",
              marginBottom: 6,
            }}
          >
            <span
              data-testid="job-stage-status"
              style={{ fontWeight: 500 }}
            >
              {job?.status === "done"
                ? "处理完成"
                : job?.status === "failed"
                  ? "处理失败"
                  : job?.status === "cancelled"
                    ? "已取消"
                    : job?.status === "awaiting_confirmation"
                      ? "等待超额确认"
                      : // 「<阶段>中 · 已用 m:ss · 预计 a–b 分钟」。不再拼裸「done/total」：
                        // 那是内部分块计数，用户读成「4 步只走了 0 步」（事故现象 2）。
                        // 百分比仍由右侧 progressPercent 给出（同一有限数守卫）。
                        `${STAGE_LABELS[job?.stage ?? "preprocess"] ?? "预处理"}中${
                          runningDetail ? ` · ${runningDetail}` : ""
                        }`}
            </span>
            {job?.status !== "done" &&
              job?.status !== "failed" &&
              job?.status !== "cancelled" &&
              job?.status !== "awaiting_confirmation" &&
              progressPercent !== undefined && (
                <span
                  style={{
                    color: "var(--textMuted, #6b7280)",
                    fontSize: "12px",
                  }}
                >
                  {progressPercent}%
                </span>
              )}
          </div>

          {/* 自定义进度条 */}
          {job?.status !== "done" &&
            job?.status !== "failed" &&
            job?.status !== "cancelled" &&
            job?.status !== "awaiting_confirmation" && (
              <div
                style={{
                  width: "100%",
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    "var(--surfaceSecondary, var(--borderMuted, #e5e7eb))",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressPercent ?? 0}%`,
                    height: "100%",
                    backgroundColor: "var(--primary, #2563eb)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            )}

          {/* 运行中显示「取消」 */}
          {currentStatus === "running" && !readOnly && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                data-testid="job-cancel-btn"
                disabled={actionBusy}
                onClick={() => void handleCancel()}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  borderRadius: "var(--radius-sm, 4px)",
                  border: "1px solid var(--borderMuted, #d1d5db)",
                  backgroundColor: "transparent",
                  color: "var(--textMuted, #6b7280)",
                  cursor: actionBusy ? "not-allowed" : "pointer",
                }}
              >
                取消
              </button>
            </div>
          )}

          {/* 取消后显示「已扣 X 积分，已完成部分可查看」 */}
          {job?.status === "cancelled" && (
            <div
              data-testid="job-cancelled-hint"
              style={{
                marginTop: 8,
                fontSize: "12px",
                color: "var(--textMuted, #6b7280)",
              }}
            >
              {spentCreditsText
                ? `已扣 ${spentCreditsText}，已完成部分可查看`
                : "任务已取消，已完成部分可查看"}
            </div>
          )}

          {/* W8：awaiting_confirmation 时显示超出金额与「继续处理」「只要已完成部分」 */}
          {job?.status === "awaiting_confirmation" && (
            <div
              data-testid="job-overrun-section"
              style={{
                marginTop: 8,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm, 6px)",
                backgroundColor:
                  "var(--surfaceSecondary, rgba(234, 179, 8, 0.08))",
                border:
                  "1px solid var(--borderWarning, rgba(234, 179, 8, 0.25))",
                fontSize: "12px",
              }}
            >
              <div
                data-testid="job-overrun-amount"
                style={{
                  color: "var(--textWarning, #b45309)",
                  fontWeight: 500,
                }}
              >
                {overrunCreditsText
                  ? `超出金额：${overrunCreditsText}`
                  : "超出金额待服务端确认"}
              </div>
              {!readOnly && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    data-testid="job-confirm-overrun-btn"
                    disabled={actionBusy}
                    onClick={() => void handleConfirmOverrun(true)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      fontWeight: 500,
                      borderRadius: "var(--radius-sm, 4px)",
                      backgroundColor: "var(--primary, #2563eb)",
                      color: "#ffffff",
                      border: "none",
                      cursor: actionBusy ? "not-allowed" : "pointer",
                    }}
                  >
                    继续处理
                  </button>
                  <button
                    type="button"
                    data-testid="job-reject-overrun-btn"
                    disabled={actionBusy}
                    onClick={() => void handleConfirmOverrun(false)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      borderRadius: "var(--radius-sm, 4px)",
                      backgroundColor: "transparent",
                      border: "1px solid var(--borderMuted, #d1d5db)",
                      color: "var(--text, #111827)",
                      cursor: actionBusy ? "not-allowed" : "pointer",
                    }}
                  >
                    只要已完成部分
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 失败信息 */}
          {job?.status === "failed" && (
            <div
              role="alert"
              data-testid="job-error"
              style={{
                color: "var(--danger, #ef4444)",
                fontSize: "12px",
                marginTop: 8,
              }}
            >
              {userFacingError(job?.error)}
            </div>
          )}

          {/* cancelled / failed 状态下的操作区域 */}
          {(job?.status === "failed" || job?.status === "cancelled") &&
            (hasArtifacts || !readOnly) && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {hasArtifacts && (
                  <OpenNoteLink jobId={jobId || job?.id} />
                )}
                {!readOnly && (
                  <button
                    type="button"
                    data-testid="job-resume-btn"
                    disabled={actionBusy}
                    onClick={() => void handleResume()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "6px 14px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--text, #111827)",
                      backgroundColor: "transparent",
                      border: "1px solid var(--borderMuted, #d1d5db)",
                      borderRadius: "var(--radius-md, 6px)",
                      cursor: actionBusy ? "not-allowed" : "pointer",
                    }}
                  >
                    继续处理（已完成部分不重复计费）
                  </button>
                )}
              </div>
            )}

          {/* done 时显示格式导出（点击即下载，不再跳转笔记页）与「处理剩余部分」 */}
          {job?.status === "done" && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {readOnly ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 14px",
                    fontSize: "13px",
                    color: "var(--textMuted, #6b7280)",
                  }}
                >
                  处理完成
                </span>
              ) : (
                <>
                  {(jobId || job?.id) && (
                    <MediaJobExportMenu jobId={(jobId || job?.id) as string} />
                  )}
                  {hasRemainingRange && (
                    <button
                      type="button"
                      data-testid="job-extend-btn"
                      disabled={actionBusy}
                      onClick={() => void handleExtendRemaining()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "6px 14px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--text, #111827)",
                        backgroundColor: "transparent",
                        border: "1px solid var(--borderMuted, #d1d5db)",
                        borderRadius: "var(--radius-md, 6px)",
                        cursor: actionBusy ? "not-allowed" : "pointer",
                      }}
                    >
                      处理剩余部分
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              data-testid="job-action-error"
              style={{
                marginTop: 8,
                fontSize: "12px",
                color: "var(--danger, #ef4444)",
              }}
            >
              {userFacingError(actionError)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaJobToolCard;
