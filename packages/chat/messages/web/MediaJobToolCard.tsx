import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ReactReduxContext } from "react-redux";
import type {
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
import { getMediaJob, mediaJobAction, startMediaJob } from "chat/web/mediaJobs";
import { isMediaJobPendingConfirmation } from "../toolPresentation";
import type { ToolProps } from "./ToolMessageTypes";

/** 与 mediaJobTool TIER_LABELS 同措辞；仅用于旧载荷（无 pendingStart.label）回退。 */
const PENDING_TIER_LABELS: Record<MediaJobDepth, string> = {
  outline: "只要大纲重点",
  translate: "原文+译文对照",
  full: "全套（对照+大纲+重点+术语，可导出文档）",
};

const isDepth = (value: unknown): value is MediaJobDepth =>
  value === "outline" || value === "translate" || value === "full";

const asRecord = (value: unknown): Record<string, any> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;

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

const TERMINAL_STATUSES = new Set(["done", "failed", "cancelled"]);

function fmtMinutes(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} 秒`;
  const mins = sec / 60;
  return Number.isInteger(mins) ? `${mins} 分钟` : `${mins.toFixed(1)} 分钟`;
}

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

function formatCredits(credits?: [number, number]): string {
  if (!credits || credits.length < 2) return "";
  const [min, max] = credits;
  if (min === max) {
    return `${Number(min.toFixed(2))} 积分`;
  }
  return `${Number(min.toFixed(2))} ~ ${Number(max.toFixed(2))} 积分`;
}

function formatSingleCredits(credits?: number): string {
  const val = credits ?? 0;
  return `${Number(val.toFixed(2))} 积分`;
}

function formatEta(etaSec?: [number, number]): string {
  if (!etaSec || !Array.isArray(etaSec) || etaSec.length < 2) return "";
  const [min, max] = etaSec;
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

export const MediaJobToolCard: React.FC<MediaJobToolCardProps> = ({
  rawData,
  isError: isErrorProp,
  readOnly = false,
  navigateToPage,
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

  useEffect(() => {
    if (initialJob) {
      setJob(initialJob);
    }
  }, [initialJob]);

  // translate 档必须有目标语言（请求已持久到 job 或 job 原有）。缺失时置灰该档并给出提示，
  // 避免展示一个「可启动」的廉价「原文+译文对照」价格（服务端 start 也会 400）。
  const knownTargetLang = job?.targetLang ?? initialJob?.targetLang;

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

  const handleStartTier = async (tier: MediaJobTier) => {
    if (readOnly || startingRef.current) return;
    if (tier.depth === "translate" && !knownTargetLang) {
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
        job?.targetLang,
      );
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
   * - pendingJobId 有值：只接受 data-job-id 的精确命中；匹配不到（旧 DOM / 缺 data-job-id /
   *   选择器非法）直接提示 missing，绝不退回「最后一个」——否则会聚焦到别的媒体任务上。
   * - pendingJobId 缺失（旧载荷）：没有可精确比对的目标，才退回「页面上最后一个报价卡」。
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
    if (pendingJobId) {
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
    // 积分/耗时取自 job 现有报价，仅当其档位与待启动档位一致时展示（多档报价后
    // job.quote 停在最后一次报价的档位，档位不一致时不展示错误数字）。
    const pendingQuote: MediaQuote | undefined =
      job?.quote && job.depth === pendingDepth ? job.quote : undefined;
    const detail = [formatCredits(pendingQuote?.totalCredits), formatEta(pendingQuote?.etaSec)]
      .filter(Boolean)
      .join("，");
    // 实际将发送的处理范围与译文语言：让用户在点按钮前看到 depth/scope/targetLang。
    const scopeText =
      pendingScope &&
      (typeof pendingScope.fromSec === "number" || typeof pendingScope.toSec === "number")
        ? `范围 ${fmtClock(pendingScope.fromSec ?? 0)}–${fmtClock(pendingScope.toSec ?? 0)}`
        : "全片";
    const langText = pendingTargetLang ? `译文：${pendingTargetLang}` : "";
    const busy = starting || pendingRun?.status === "running";
    // run 仍在 store（含 running/succeeded）：保留按钮（点击刷新进度或推进同一个 run）。
    // run 已不在 store（页面刷新后）：确认已失效，不再渲染「确认启动」，改为引导回报价卡。
    const runInStore = Boolean(pendingRun);
    // succeeded：确认已生效，按钮点了只会刷新，标签误导 → 不渲染按钮，只提示正在载入。
    const runSucceeded = pendingRun?.status === "succeeded";
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
        {!pendingQuote && (
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
              : runInStore
                ? "确认后按该档位开始处理并计费"
                : "确认已失效（页面刷新过），请在上方报价卡重新选择档位"}
        </div>
        {!readOnly && runInStore && !runSucceeded && (
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
        {!readOnly && !runInStore && (
          <button
            type="button"
            data-testid="media-job-back-to-quote"
            onClick={handleBackToQuote}
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 16px",
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
              {job.trimSuggestions.map((suggestion, index) => (
                <div key={index}>
                  截取建议：{suggestion.reason}
                  {suggestion.fromSec !== undefined &&
                    suggestion.toSec !== undefined && (
                      <span>
                        （{fmtClock(suggestion.fromSec)} ~{" "}
                        {fmtClock(suggestion.toSec)}）
                      </span>
                    )}
                </div>
              ))}
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

          {/* 档位列表 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {tiers.map((tier) => {
              const quote = tier.quote;
              const needsLang = tier.depth === "translate" && !knownTargetLang;
              const affordableToSec = quote?.affordableToSec;
              const balance = quote?.balanceCredits;
              const minCredits = quote?.totalCredits?.[0] ?? 0;
              const isInsufficient =
                affordableToSec !== undefined ||
                (typeof balance === "number" && balance < minCredits);

              const affordableMins =
                affordableToSec !== undefined
                  ? Math.floor(affordableToSec / 60)
                  : 0;
              const insufficientText = `当前余额可处理前 ${affordableMins} 分钟`;
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
                      {creditsText}
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
                  aria-label={`开始处理：${tier.label}${creditsText ? `（${creditsText}）` : ""}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md, 6px)",
                    border:
                      isInsufficient || needsLang
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
          {/* 阶段指示器：预处理→转写→标注→翻译→总结 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 4,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {STAGES.map((s, idx) => {
              const stageIndex = STAGES.findIndex(
                (item) => item.key === job?.stage,
              );
              const isPast =
                stageIndex > idx || job?.status === "done";
              const isCurrent =
                stageIndex === idx && job?.status !== "done";
              return (
                <div
                  key={s.key}
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
                  <span>{s.label}</span>
                  {idx < STAGES.length - 1 && (
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
                      : `${STAGE_LABELS[job?.stage ?? "preprocess"] ?? "预处理"} ${
                          job?.progress?.done ?? 0
                        }/${job?.progress?.total ?? 0}`}
            </span>
            {job?.status !== "done" &&
              job?.status !== "failed" &&
              job?.status !== "cancelled" &&
              job?.status !== "awaiting_confirmation" &&
              (job?.progress?.total ?? 0) > 0 && (
                <span
                  style={{
                    color: "var(--textMuted, #6b7280)",
                    fontSize: "12px",
                  }}
                >
                  {Math.min(
                    100,
                    Math.round(
                      ((job?.progress?.done ?? 0) /
                        (job?.progress?.total ?? 1)) *
                        100,
                    ),
                  )}
                  %
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
                    width: `${
                      (job?.progress?.total ?? 0) > 0
                        ? Math.min(
                            100,
                            Math.round(
                              ((job?.progress?.done ?? 0) /
                                (job?.progress?.total ?? 1)) *
                                100,
                            ),
                          )
                        : 0
                    }%`,
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
              已扣 {formatSingleCredits(spentCredits)}，已完成部分可查看
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
                超出金额：{formatSingleCredits(job?.overrunCredits)}
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
                  <a
                    data-testid="open-note-link"
                    href={`/media-jobs/${jobId || job?.id}`}
                    onClick={(e) => {
                      if (navigateToPage && (jobId || job?.id)) {
                        e.preventDefault();
                        navigateToPage(`media-jobs/${jobId || job?.id}`);
                      }
                    }}
                    style={{
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
                    }}
                  >
                    打开笔记
                  </a>
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

          {/* done 时显示「打开笔记」链接到 /media-jobs/<jobId> 与「处理剩余部分」 */}
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
                  <a
                    data-testid="open-note-link"
                    href={`/media-jobs/${jobId || job?.id}`}
                    onClick={(e) => {
                      if (navigateToPage && (jobId || job?.id)) {
                        e.preventDefault();
                        navigateToPage(`media-jobs/${jobId || job?.id}`);
                      }
                    }}
                    style={{
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
                    }}
                  >
                    打开笔记
                  </a>
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
