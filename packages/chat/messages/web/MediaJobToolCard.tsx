import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  MediaJob,
  MediaJobDepth,
  MediaJobStage,
  MediaQuote,
  MediaScope,
} from "ai/lecture/types";
import { getMediaJob, mediaJobAction, startMediaJob } from "chat/web/mediaJobs";
import type { ToolProps } from "./ToolMessageTypes";

export interface MediaJobTier {
  depth: MediaJobDepth;
  label: string;
  quote: MediaQuote;
}

export interface MediaJobToolCardProps extends Partial<ToolProps> {
  readOnly?: boolean;
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
  isError,
  readOnly = false,
  navigateToPage,
}) => {
  const data = typeof rawData === "object" && rawData !== null ? rawData : {};
  const innerData =
    typeof data.rawData === "object" && data.rawData !== null
      ? data.rawData
      : {};

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
  }, [jobId, job?.id, job?.status, hasStarted]);

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

  // 既无 job 也无 quote：没有任何可渲染信息，返回空（不渲染空卡）
  if (!isError && !initialJob && !initialQuote) {
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
        <div data-testid="tier-selection-section">
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
