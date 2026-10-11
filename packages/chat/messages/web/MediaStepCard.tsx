import React, { useState, useEffect, useContext } from "react";
import { ReactReduxContext } from "react-redux";
import {
  LuFileText,
  LuCheck,
  LuDownload,
  LuLanguages,
  LuMic,
  LuBookOpen,
  LuTriangleAlert,
  LuClock,
  LuCoins,
} from "react-icons/lu";
import LoadingSpinner from "render/web/ui/LoadingSpinner";
import {
  executeToolRun,
  getToolRunById,
} from "ai/tools/toolRunStore";
import {
  getMediaJob,
  mediaJobAction,
  authorizeMediaStep,
  roundUpToFriendlyCredits,
} from "chat/web/mediaJobs";
import type { MediaJob } from "ai/lecture/types";
import type { ToolProps } from "./ToolMessageTypes";

function formatBytes(bytes?: number): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDuration(ms?: number, sec?: number): string | null {
  if (typeof ms === "number" && Number.isFinite(ms) && ms > 0) {
    return ms >= 10_000 ? `${Math.round(ms / 1000)} 秒` : `${(ms / 1000).toFixed(1)} 秒`;
  }
  if (typeof sec === "number" && Number.isFinite(sec) && sec > 0) {
    return sec >= 60 ? `${Math.round(sec)} 秒` : `${sec.toFixed(1)} 秒`;
  }
  return null;
}

const STEP_LABELS: Record<string, string> = {
  transcribe: "转写",
  translate: "翻译",
  exportDocument: "导出",
  readArtifact: "读取",
};

const NEXT_STEP_HINTS: Record<string, string> = {
  transcribe: "可执行：翻译译文、导出文档或总结大纲",
  translate: "可执行：导出双语对照文档或总结分析",
  exportDocument: "文档已生成，可直接下载",
  readArtifact: "产物内容已读取，可继续分析或处理",
};

export interface MediaStepCardProps extends ToolProps {
  toolName?: string;
}

const safeJsonParse = (val: unknown): any => {
  if (typeof val !== "string") return val ?? {};
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
};

export const MediaStepCard: React.FC<MediaStepCardProps> = (props) => {
  const { rawData, isError, toolArgs, toolRunId, toolName: propToolName } = props;

  const data = typeof rawData === "string" ? safeJsonParse(rawData) : (rawData ?? {});
  const innerData = data.rawData && typeof data.rawData === "object" ? data.rawData : {};

  const stepKey =
    propToolName ||
    data.step ||
    data.toolName ||
    toolArgs?.step ||
    (data.format || data.downloadUrl ? "exportDocument" : undefined) ||
    (data.totalSegments !== undefined || data.returnedSegments !== undefined ? "readArtifact" : undefined) ||
    (toolArgs?.targetLang ? "translate" : undefined) ||
    "transcribe";

  const stepLabel = STEP_LABELS[stepKey] || stepKey;

  const jobId = data.jobId || innerData.jobId || toolArgs?.jobId;
  const [job, setJob] = useState<MediaJob | null>(() => data.job ?? innerData.job ?? null);
  const [starting, setStarting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reduxContext = useContext(ReactReduxContext) as { store?: { dispatch?: (action: any) => any } } | null;
  const storeDispatch = reduxContext?.store?.dispatch;

  // 状态判定
  const isRequiresConfirmation =
    !hasStarted &&
    (data.status === "requires_confirmation" ||
      data.status === "awaiting_confirmation" ||
      data.reason === "unauthorized" ||
      data.reason === "budget_overrun");

  const isFailed =
    !isRequiresConfirmation &&
    (isError || data.status === "failed" || Boolean(data.error));

  const isRunning =
    !isRequiresConfirmation &&
    !isFailed &&
    (hasStarted || data.status === "running");

  const isDone = !isRequiresConfirmation && !isFailed && !isRunning;

  // 耗时计算
  const durationMs = data.durationMs ?? innerData.durationMs ?? data.stepResult?.durationMs ?? innerData.stepResult?.durationMs;
  const durationSec = data.durationSec ?? innerData.durationSec ?? data.duration;
  const formattedDuration = formatDuration(durationMs, durationSec);

  // 实际积分计算
  const computeSpent = (): string => {
    const directSpent =
      data.spentCredits ??
      data.credits ??
      data.cost ??
      data.spent ??
      innerData.spentCredits ??
      innerData.spent;

    if (typeof directSpent === "number" && Number.isFinite(directSpent)) {
      return `${directSpent} 积分`;
    }

    const currentJob = job ?? data.job ?? innerData.job;
    if (currentJob?.spent) {
      if (stepKey === "transcribe") {
        const spentVal = (currentJob.spent.preprocess ?? 0) + (currentJob.spent.transcribe ?? 0);
        if (spentVal > 0 || currentJob.spent.transcribe !== undefined) return `${spentVal} 积分`;
      } else if (stepKey === "translate") {
        if (currentJob.spent.translate !== undefined) return `${currentJob.spent.translate} 积分`;
      } else if (stepKey === "exportDocument" || stepKey === "readArtifact") {
        return "0 积分";
      }
    }

    if (stepKey === "exportDocument" || stepKey === "readArtifact") {
      return "0 积分";
    }

    return "—";
  };

  const spentDisplay = computeSpent();

  // 产物摘要
  const getProductSummary = (): string => {
    if (stepKey === "transcribe") {
      const count = data.segmentCount ?? innerData.stepResult?.artifacts?.transcribe?.segments?.length;
      if (typeof count === "number") return `${count} 个片段`;
      if (data.summary) return data.summary;
      return "转写文本已生成";
    }
    if (stepKey === "translate") {
      const targetLang = data.targetLang ?? toolArgs?.targetLang ?? job?.targetLang ?? "";
      const count = data.segmentCount;
      const countSuffix = typeof count === "number" ? ` · ${count} 个片段` : "";
      if (targetLang) return `${targetLang} 译文${countSuffix}`;
      if (data.summary) return data.summary;
      return "译文已生成";
    }
    if (stepKey === "exportDocument") {
      const fmt = (data.format || toolArgs?.format || "docx").toLowerCase();
      const sizeStr = formatBytes(data.sizeBytes);
      return `${fmt} · ${sizeStr}`;
    }
    if (stepKey === "readArtifact") {
      const count = data.returnedSegments ?? data.segments?.length ?? 0;
      const total = data.totalSegments;
      if (typeof total === "number" && total > 0) {
        return `已读 ${count} / ${total} 个片段`;
      }
      return `${count} 个片段`;
    }
    return data.summary || "处理完成";
  };

  const productSummary = getProductSummary();

  // 若 job 状态未终结且缺 spent，挂载时静默获取真值
  useEffect(() => {
    if (!jobId || isRequiresConfirmation || job) return;
    let active = true;
    getMediaJob(jobId)
      .then((res) => {
        if (active && res?.job) setJob(res.job);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [jobId, isRequiresConfirmation, job]);

  // 处理确认
  const handleConfirmAction = async (autoApproveCredits?: number) => {
    if (starting) return;
    const targetId = jobId || data.jobId || innerData.jobId;
    if (!targetId) {
      setError("缺少任务 ID");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const authorization = await authorizeMediaStep(
        targetId,
        {
          step: (data.step || stepKey) as "transcribe" | "translate",
          targetLang: data.targetLang ?? toolArgs?.targetLang,
        },
        autoApproveCredits,
      );

      const run = toolRunId ? getToolRunById(toolRunId) : undefined;
      if (
        run &&
        storeDispatch &&
        run.interaction === "confirm" &&
        (run.status === "pending" || run.status === "failed")
      ) {
        await storeDispatch(
          executeToolRun({
            id: run.id,
            inputOverride: { ...run.input, confirmationToken: authorization.confirmationToken },
          }),
        ).unwrap();
      } else {
        const res = await mediaJobAction(targetId, "step", {
          step: data.step || stepKey,
          targetLang: data.targetLang ?? toolArgs?.targetLang,
          confirmationToken: authorization.confirmationToken,
        });
        if (res?.job) setJob(res.job);
      }
      setHasStarted(true);
    } catch (err: any) {
      setError(err?.message || "确认步骤失败，请稍后重试");
    } finally {
      setStarting(false);
    }
  };

  // 待确认卡渲染
  if (isRequiresConfirmation) {
    const rawUpper = data.upperCredits ?? innerData.upperCredits;
    const hasValidAmount = typeof rawUpper === "number" && Number.isFinite(rawUpper) && rawUpper >= 0;
    const creditsLabel = hasValidAmount ? `${rawUpper} 积分` : "—";
    // 金额为 0（或非法）时不给出免问阈值：roundUp(0)=1 会渲染成「0 积分」配「≤1 不用问」的错位。
    const autoApproveN = hasValidAmount && rawUpper > 0 ? roundUpToFriendlyCredits(rawUpper) : null;
    const confirmDisabled = starting || !hasValidAmount;

    return (
      <div
        data-testid="media-step-card"
        data-step={stepKey}
        data-status="requires_confirmation"
        style={{
          marginTop: 8,
          marginBottom: 8,
          border: "1px solid var(--borderWarning, rgba(234, 179, 8, 0.35))",
          borderRadius: "var(--radius-md, 8px)",
          backgroundColor: "var(--surfaceWarning, rgba(234, 179, 8, 0.08))",
          padding: "12px 16px",
          fontSize: "13px",
          color: "var(--text, #111827)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <LuTriangleAlert style={{ color: "var(--warning, #d97706)" }} />
            待确认执行：{stepLabel}步骤
            {data.targetLang ? `（目标语言：${data.targetLang}）` : ""}
          </div>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "rgba(234, 179, 8, 0.2)",
              color: "var(--warning, #b45309)",
              fontWeight: 500,
            }}
          >
            待确认
          </span>
        </div>

        <div style={{ fontSize: "12px", color: "var(--textMuted, #6b7280)", marginBottom: 10 }}>
          {data.reason === "budget_overrun"
            ? `预算超额，预计需追加 ${creditsLabel}`
            : `需授权后执行，预计消耗 ${creditsLabel}`}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            data-testid="media-job-confirm-step"
            disabled={confirmDisabled}
            onClick={() => void handleConfirmAction()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: "var(--primary, #2563eb)",
              border: "none",
              borderRadius: "6px",
              cursor: confirmDisabled ? "not-allowed" : "pointer",
              opacity: confirmDisabled && !starting ? 0.6 : 1,
            }}
          >
            {starting ? "执行中…" : `确认执行${stepLabel}`}
          </button>

          <button
            type="button"
            data-testid="media-job-auto-approve-step"
            disabled={confirmDisabled || autoApproveN === null}
            onClick={() => autoApproveN !== null && void handleConfirmAction(autoApproveN)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text, #111827)",
              backgroundColor: "var(--surface, #ffffff)",
              border: "1px solid var(--border, #d1d5db)",
              borderRadius: "6px",
              cursor: confirmDisabled || autoApproveN === null ? "not-allowed" : "pointer",
              opacity: confirmDisabled || autoApproveN === null ? 0.6 : 1,
            }}
          >
            {starting
              ? "执行中…"
              : autoApproveN !== null
                ? `以后 ≤${autoApproveN} 不用问`
                : hasValidAmount
                  ? "额度为 0，不可免问"
                  : "额度未知，不可免问"}
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: "11px", color: "var(--textMuted, #6b7280)" }}>
          免问额度对以后所有媒体任务生效，可在设置页「媒体额度」中关闭或调整
        </div>

        {error && (
          <div role="alert" style={{ marginTop: 8, fontSize: "12px", color: "var(--danger, #ef4444)" }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // 进行中 / 完成 / 失败 卡片渲染
  const statusKey = isFailed ? "failed" : isRunning ? "running" : "done";
  const statusLabel = isFailed ? "失败" : isRunning ? "进行中" : "完成";
  const statusColor = isFailed ? "#ef4444" : isRunning ? "#2563eb" : "#10b981";
  const statusBg = isFailed
    ? "rgba(239, 68, 68, 0.1)"
    : isRunning
      ? "rgba(37, 99, 235, 0.1)"
      : "rgba(16, 185, 129, 0.1)";

  const StepIcon =
    stepKey === "transcribe"
      ? LuMic
      : stepKey === "translate"
        ? LuLanguages
        : stepKey === "exportDocument"
          ? LuDownload
          : LuBookOpen;

  return (
    <div
      data-testid="media-step-card"
      data-step={stepKey}
      data-status={statusKey}
      style={{
        marginTop: 6,
        marginBottom: 6,
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "8px",
        backgroundColor: "var(--surface, #ffffff)",
        padding: "12px 14px",
        fontSize: "13px",
        color: "var(--text, #111827)",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* 头部：步骤名 + 状态徽标 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <StepIcon style={{ color: "var(--primary, #2563eb)", fontSize: "16px" }} />
          <span>{stepLabel}步骤</span>
        </div>
        <span
          data-testid="media-step-status-badge"
          style={{
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "12px",
            backgroundColor: statusBg,
            color: statusColor,
            fontWeight: 600,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* 进行中状态 */}
      {isRunning && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--textMuted, #6b7280)", fontSize: "12px" }}>
          <LoadingSpinner size={14} />
          <span>{stepLabel}任务正在执行中，完成后将自动刷新...</span>
        </div>
      )}

      {/* 失败状态 */}
      {isFailed && (
        <div data-testid="media-step-error" style={{ color: "var(--danger, #ef4444)", fontSize: "12px" }}>
          {data.error || data.message || "执行失败，请检查参数后重试"}
        </div>
      )}

      {/* 完成状态信息 */}
      {isDone && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 8 }}>
            {formattedDuration && (
              <div data-testid="media-step-duration" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "var(--textMuted, #6b7280)" }}>
                <LuClock style={{ flexShrink: 0 }} />
                <span>耗时：{formattedDuration}</span>
              </div>
            )}
            <div data-testid="media-step-spent" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "var(--textMuted, #6b7280)" }}>
              <LuCoins style={{ flexShrink: 0 }} />
              <span>花费：{spentDisplay}</span>
            </div>
            <div data-testid="media-step-summary" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "var(--text, #111827)" }}>
              <LuCheck style={{ color: "#10b981", flexShrink: 0 }} />
              <span>产物：{productSummary}</span>
            </div>
          </div>

          {/* 下一步提示 */}
          <div
            data-testid="media-step-next-hint"
            style={{
              fontSize: "12px",
              color: "var(--textMuted, #4b5563)",
              backgroundColor: "var(--surfaceMuted, #f9fafb)",
              padding: "6px 10px",
              borderRadius: "4px",
              marginTop: 6,
            }}
          >
            提示：{NEXT_STEP_HINTS[stepKey] || "步骤已完成"}
          </div>

          {/* 导出完成时的下载链接 */}
          {stepKey === "exportDocument" && data.downloadUrl && (
            <div style={{ marginTop: 8 }}>
              <a
                href={data.downloadUrl}
                download={data.filename || true}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="media-step-download-link"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#ffffff",
                  backgroundColor: "var(--primary, #2563eb)",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  textDecoration: "none",
                }}
              >
                <LuDownload /> 下载文档
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaStepCard;
