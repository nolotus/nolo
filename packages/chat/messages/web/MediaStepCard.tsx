import React, { useState, useEffect, useContext, useRef } from "react";
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
  getMediaStepReadiness,
  mediaJobStep,
  authorizeMediaStep,
  roundUpToFriendlyCredits,
  getMediaTranscript,
  deriveMediaStepPhase,
  deriveStepUpperCredits,
  exportMediaJob,
  normalizeMediaTargetLang,
  normalizeMediaConfirmExecutionRevision,
  type MediaStepReadinessState,
} from "chat/web/mediaJobs";
import type { MediaStepOutcome, TranscriptSegment } from "chat/web/mediaJobs";
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

/**
 * 用服务端返回的 downloadUrl 触发浏览器下载：临时 `<a download>` 点击后移除。
 * 无 DOM（SSR）时静默跳过——调用方已拿到 downloadUrl，不因此丢掉导出结果。
 */
function triggerBrowserDownload(url: string, filename?: string): void {
  if (typeof document === "undefined") return;
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    if (filename) anchor.download = filename;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch {
    // 触发下载失败不影响导出本身：文件已生成，downloadUrl 仍可手动打开。
  }
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

type StepPhase = "idle" | "awaiting" | "running" | "done" | "failed";

const POLL_MS = 3000;
const isStepKey = (k: string): k is "transcribe" | "translate" => k === "transcribe" || k === "translate";

/** 服务端单步真值 → 卡片阶段。unknown 不映射为任何状态（由调用方保持等待/不确认）。 */
function derivePhase(
  stepKey: string,
  job: MediaJob | null | undefined,
  requestedTargetLang?: string,
): StepPhase | null {
  if (!isStepKey(stepKey)) return null;
  const p = deriveMediaStepPhase(job, stepKey, requestedTargetLang);
  if (p === "unknown") return null;
  return p === "awaiting" ? "awaiting" : p;
}

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

/**
 * 仅当结果本身就是 MediaJob 对象时，用它的 id 兜底当 jobId。
 *
 * 真实持久化的 transcribe 结果（/tmp/m4a-worktree-preview/conv.json 第 4 条 tool message，字节稳定）content
 * 就是 job 对象本身：{ id, userId, fileId, fileName, status, stageArtifacts, ... }，没有 jobId 字段；而模型
 * args 里常常只有 fileId。此时若不认这套形状，卡片拿不到 jobId → 无法核对状态、也不渲染「下载 TXT」。
 *
 * 判别形状（与 ai/lecture/types 的 MediaJob 一致）：字符串 id + 字符串 fileId，且带 status 或 stageArtifacts。
 * 其它工具结果（exportDocument 的 {fileId, downloadUrl}、readArtifact 的分页结果、报价体等）不满足该形状，
 * 一律返回 null —— 绝不把产物 fileId 当任务 ID 去核对一个不存在的任务。
 */
export function resolveJobIdFromMediaJobResult(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.id !== "string" || rec.id.length === 0) return null;
  if (typeof rec.fileId !== "string" || rec.fileId.length === 0) return null;
  const hasStatus = typeof rec.status === "string";
  const hasStageArtifacts = !!rec.stageArtifacts && typeof rec.stageArtifacts === "object";
  if (!hasStatus && !hasStageArtifacts) return null;
  return rec.id;
}

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

  // jobId 兜底：显式 jobId（顶层 / 嵌套 rawData / 模型 args）优先；三者都没有时，仅当结果本身是持久化的
  // MediaJob 对象（transcribe 真实落库形状，无 jobId 字段）才取其 id。导出/读取等结果形状不满足该契约，
  // 不会把它们的 id/fileId 误当 jobId 去核对不存在的任务。
  const jobId =
    data.jobId ||
    innerData.jobId ||
    toolArgs?.jobId ||
    resolveJobIdFromMediaJobResult(data) ||
    resolveJobIdFromMediaJobResult(innerData);

  // 导出结果真值：真实工具结果（exportDocumentTool.ts / mediaJobServerTool.ts）把 downloadUrl/filename
  // 放在顶层；客户端工具另把原始 body 放进 rawData。两条路径都兜底，链接不会因形状差异消失。
  const exportDownloadUrl = data.downloadUrl || innerData.downloadUrl;
  const exportFileName = data.filename || innerData.filename;
  const [job, setJob] = useState<MediaJob | null>(() => data.job ?? innerData.job ?? null);
  const [starting, setStarting] = useState(false);
  // 服务端真值（GET 或 step 结果）；idle 表示尚未取得真值，沿用 rawData 旧状态。
  // remote：服务端真值（GET 或执行接口结果）。idle = 尚未取得真值，只显示核对中、不给任何操作。
  const [remote, setRemote] = useState<{ phase: StepPhase; error?: string }>({ phase: "idle" });
  // 转写产物分页状态：完整性由服务端 hasMore/truncated 决定，展示「已显示/总段数」。
  const [transcript, setTranscript] = useState<{
    segments: TranscriptSegment[];
    total: number;
    hasMore: boolean;
    nextOffset: number | null;
    truncated: boolean;
    loading: boolean;
    error: string | null;
    loaded: boolean;
  }>({ segments: [], total: 0, hasMore: false, nextOffset: null, truncated: false, loading: false, error: null, loaded: false });
  const [error, setError] = useState<string | null>(null);
  // 转写完成后的主入口「下载 TXT」：走既有 POST /:id/export（服务端 export 分支不计费），
  // 成功即用返回的 downloadUrl 触发下载；失败可见并可直接重试。
  const [txtExport, setTxtExport] = useState<{
    status: "idle" | "running" | "done";
    error: string | null;
    filename: string | null;
  }>({ status: "idle", error: null, filename: null });
  const mountedRef = useRef(true);
  const genRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      genRef.current += 1;
    };
  }, []);

  const reduxContext = useContext(ReactReduxContext) as { store?: { dispatch?: (action: any) => any } } | null;
  const storeDispatch = reduxContext?.store?.dispatch;

  // 状态判定：服务端步骤真值是唯一依据。未取得真值（idle）时不采信 rawData 的确认/完成态，
  // 否则旧 tool result 的 requires_confirmation 会在已完成的步骤上再次出现「确认」按钮。
  // 无 jobId（导出/读取等纯工具结果）没有服务端步骤可核对，rawData 即为其全部真值：直接按工具结果定型。
  // 有 jobId 时必须等服务端步骤真值，不采信旧卡的确认态。
  const rawNeedsConfirm =
    data.status === "requires_confirmation" ||
    data.status === "awaiting_confirmation" ||
    data.reason === "unauthorized" ||
    data.reason === "budget_overrun";
  const rawPhase: StepPhase =
    isError || data.status === "failed" || Boolean(data.error)
      ? "failed"
      : data.status === "running"
        ? "running"
        : rawNeedsConfirm
          ? "idle" // 确认类旧卡无 jobId：无法核对也无法授权，保持核对中，不当作完成。
          : "done";
  // exportDocument / readArtifact 不是 MediaJob 的原子步骤（无 stageArtifacts 可核对），按工具结果定型。
  const isAtomicStep = stepKey === "transcribe" || stepKey === "translate";
  const phase: StepPhase =
    remote.phase !== "idle" ? remote.phase : jobId && isAtomicStep ? "idle" : rawPhase;
  const isChecking = phase === "idle";
  const isRequiresConfirmation = phase === "awaiting";
  const isFailed = phase === "failed";
  const isRunning = phase === "running";
  const isDone = phase === "done";

  // 翻译确认安全判定与字段预检
  const isTranslateStep = stepKey === "translate";
  const isUnauthorizedConfirm =
    data.reason === "unauthorized" || innerData.reason === "unauthorized";
  const isTranslateConfirmation = isTranslateStep && isUnauthorizedConfirm;

  const rawConfirmJobId = data.jobId || innerData.jobId;
  const rawConfirmTargetLang = data.targetLang ?? innerData.targetLang;
  const normConfirmLang = normalizeMediaTargetLang(rawConfirmTargetLang);
  const normArgLang = toolArgs?.targetLang !== undefined ? normalizeMediaTargetLang(toolArgs.targetLang) : undefined;
  const targetRevision = normalizeMediaConfirmExecutionRevision(
    data.executionRevision ?? innerData.executionRevision,
  );
  const cardUpperCredits = data.upperCredits ?? innerData.upperCredits;
  const hasValidCardUpper =
    typeof cardUpperCredits === "number" && Number.isFinite(cardUpperCredits) && cardUpperCredits >= 0;

  // 目标翻译typed确认结果job/step/lang/revision与toolArgs一致性预检
  let preCheckError: { type: "conflict" | "missing_revision" | "invalid_quote"; message: string } | null = null;
  if (isTranslateConfirmation) {
    if (!rawConfirmJobId) {
      preCheckError = { type: "conflict", message: "缺少任务 ID，无法授权，请重新发起" };
    } else if (toolArgs?.jobId && toolArgs.jobId !== rawConfirmJobId) {
      preCheckError = { type: "conflict", message: "任务 ID 与确认结果冲突，无法授权，请重新发起" };
    } else if (toolArgs?.step && toolArgs.step !== "translate") {
      preCheckError = { type: "conflict", message: "步骤类型与确认结果冲突，无法授权，请重新发起" };
    } else if (!normConfirmLang) {
      preCheckError = { type: "conflict", message: "目标语言缺失或不受支持，无法授权，请重新发起" };
    } else if (toolArgs?.targetLang !== undefined && normArgLang === null) {
      preCheckError = { type: "conflict", message: "工具目标语言不受支持，无法授权，请重新发起" };
    } else if (normArgLang !== undefined && normArgLang !== normConfirmLang) {
      preCheckError = { type: "conflict", message: "目标语言与确认结果冲突，无法授权，请重新发起" };
    } else if (targetRevision === undefined) {
      preCheckError = { type: "missing_revision", message: "待确认结果已过期，请重新发起" };
    } else if (!hasValidCardUpper) {
      preCheckError = { type: "invalid_quote", message: "缺少授权金额（upperCredits），无法授权，请重新发起" };
    }
  }

  const [translateReadiness, setTranslateReadiness] = useState<{
    checked: boolean;
    state: MediaStepReadinessState | "conflict" | "missing_revision" | "invalid_quote" | "error" | null;
    upperCredits?: number;
    error?: string;
  }>({ checked: false, state: null });

  // 按 POST step 的真实 MediaStepResult（server pipeline.ts）映射本卡状态。
  const applyStepOutcome = (outcome: MediaStepOutcome | undefined) => {
    if (!outcome) {
      setRemote({ phase: "failed", error: "服务端未返回步骤状态，请刷新后查看" });
      return;
    }
    switch (outcome.status) {
      case "done":
        setRemote({ phase: "done" });
        return;
      case "running":
        setRemote({ phase: "running" });
        return;
      case "awaiting_confirmation":
        setRemote({ phase: "awaiting" });
        setError(`预算超额，需追加约 ${outcome.overrunCredits} 积分，请重新确认`);
        return;
      case "confirmation_required":
        setRemote({ phase: "awaiting" });
        setError("需要用户确认");
        return;
      case "failed":
        setRemote({ phase: "failed", error: outcome.error });
        return;
      default:
        setRemote({ phase: "failed", error: "服务端返回未知步骤状态" });
    }
  };

  // 耗时计算
  const durationMs = data.durationMs ?? innerData.durationMs ?? data.stepResult?.durationMs ?? innerData.stepResult?.durationMs;
  const durationSec =
    data.durationSec ?? innerData.durationSec ?? data.duration ?? job?.durationSec;
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

  // 翻译步骤专用 readiness 查询与失效控制
  useEffect(() => {
    if (!isTranslateConfirmation) return;

    if (preCheckError) {
      setTranslateReadiness({
        checked: true,
        state: preCheckError.type,
        error: preCheckError.message,
      });
      setRemote({ phase: "awaiting" });
      return;
    }

    let cancelled = false;
    const currentGen = ++genRef.current;

    getMediaStepReadiness(rawConfirmJobId!, {
      step: "translate",
      targetLang: normConfirmLang!,
      expectedExecutionRevision: targetRevision!,
    })
      .then((res) => {
        if (cancelled || !mountedRef.current || currentGen !== genRef.current) return;
        // 严格核对响应字段：jobId/step/targetLang，不能值优先级掩盖冲突
        if (
          res.jobId !== rawConfirmJobId ||
          res.step !== "translate" ||
          normalizeMediaTargetLang(res.targetLang) !== normConfirmLang
        ) {
          setTranslateReadiness({
            checked: true,
            state: "conflict",
            error: "服务端核对信息不一致，无法授权，请重新发起",
          });
          setRemote({ phase: "awaiting" });
          return;
        }

        if (res.state === "stale" || res.executionRevision !== targetRevision) {
          // 代次不符 → stale，过期提示，禁授权
          setTranslateReadiness({
            checked: true,
            state: "stale",
            error: "待确认结果已过期，任务代次已变更，请重新发起",
          });
          setRemote({ phase: "awaiting" });
          return;
        }

        if (res.state === "ready") {
          // 金额核对：必须有限非负，且与本卡报价匹配，不历史 quote fallback
          const readyUpper = res.upperCredits;
          const isValidUpper = typeof readyUpper === "number" && Number.isFinite(readyUpper) && readyUpper >= 0;
          const matchesCard =
            isValidUpper && typeof cardUpperCredits === "number" && Math.abs(readyUpper - cardUpperCredits) < 1e-4;
          if (!isValidUpper || !matchesCard) {
            setTranslateReadiness({
              checked: true,
              state: "invalid_quote",
              error: "授权金额与当前任务报价不一致（或已失效），无法授权，请重新发起",
            });
            setRemote({ phase: "awaiting" });
            return;
          }
          setTranslateReadiness({
            checked: true,
            state: "ready",
            upperCredits: readyUpper,
          });
          setRemote({ phase: "awaiting" });
          return;
        }

        if (res.state === "done") {
          // 同语言已完整覆盖 → done，不确认、不重放
          setTranslateReadiness({ checked: true, state: "done" });
          setRemote({ phase: "done" });
          return;
        }

        if (res.state === "busy") {
          setTranslateReadiness({ checked: true, state: "busy", error: "任务正在执行中，请稍候" });
          setRemote({ phase: "running" });
          return;
        }

        if (res.state === "blocked") {
          setTranslateReadiness({
            checked: true,
            state: "blocked",
            error: "任务当前状态不可授权执行翻译，请重新发起或检查转写产物",
          });
          setRemote({ phase: "awaiting" });
          return;
        }
      })
      .catch((err: any) => {
        if (cancelled || !mountedRef.current || currentGen !== genRef.current) return;
        setTranslateReadiness({
          checked: true,
          state: "error",
          error: `核对步骤就绪状态失败：${err?.message || "网络错误"}，无法授权`,
        });
        setRemote({ phase: "awaiting" });
      });

    return () => {
      cancelled = true;
    };
  }, [
    rawConfirmJobId,
    stepKey,
    normConfirmLang,
    targetRevision,
    isTranslateConfirmation,
    cardUpperCredits,
    preCheckError?.type,
    preCheckError?.message,
  ]);

  // 只读核对：读取服务端真值，绝不授权、不执行、不改变收费状态。失败可见，并可由用户只读重试。
  const verifyStepState = (onSettled?: () => void) => {
    if (!jobId) return;
    const gen = genRef.current;
    getMediaJob(jobId)
      .then((res) => {
        if (gen !== genRef.current || !mountedRef.current) return;
        if (!res?.job) {
          setRemote((prev) => ({ ...prev, error: "服务端未返回任务状态，可点击重新核对" }));
          return;
        }
        setJob(res.job);
        const p = derivePhase(stepKey, res.job, normConfirmLang ?? undefined);
        if (p) setRemote({ phase: p });
        else setRemote({ phase: "idle", error: "无法判定本步状态，可点击重新核对" });
        onSettled?.();
      })
      .catch((err: any) => {
        if (gen !== genRef.current || !mountedRef.current) return;
        // 失败保留当前阶段（running 不误判为完成，idle 不误判为待确认），仅暴露错误与重试入口。
        setRemote((prev) => ({ ...prev, error: `核对失败：${err?.message || "网络错误"}，可点击重新核对` }));
      });
  };

  // 挂载时读一次服务端真值（含旧 requires_confirmation 卡）：已完成则呈现完成，不触发授权或重跑。
  useEffect(() => {
    if (!jobId) return;
    if (isTranslateConfirmation) return;
    verifyStepState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, stepKey, isTranslateConfirmation]);

  // 仅服务端真实执行中（running）才轮询；离开 running 或卸载即清理定时器，过期响应丢弃。
  useEffect(() => {
    if (!jobId || remote.phase !== "running") return;
    let cancelled = false;
    const timer = setInterval(() => {
      const gen = genRef.current;
      getMediaJob(jobId)
        .then((res) => {
          if (cancelled || gen !== genRef.current || !mountedRef.current) return;
          if (!res?.job) {
            setRemote((prev) => ({ ...prev, error: "轮询未返回任务状态，仍在执行中，可点击重新核对" }));
            return;
          }
          setJob(res.job);
          const p = derivePhase(stepKey, res.job, normConfirmLang ?? undefined);
          if (p && p !== "running") setRemote({ phase: p });
        })
        .catch((err: any) => {
          if (cancelled || gen !== genRef.current || !mountedRef.current) return;
          // 轮询失败：保持 running（不误判完成、不误判待确认），错误可见，由用户只读重新核对。
          setRemote((prev) => ({ ...prev, error: `轮询失败：${err?.message || "网络错误"}，仍在执行中，可点击重新核对` }));
        });
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId, stepKey, phase]);

  // 转写完成后读取首页产物（只读，不改变状态）。失败可见并可重试，绝不静默。
  const loadTranscriptPage = (offset: number, append: boolean) => {
    if (!jobId) return;
    const gen = genRef.current;
    setTranscript((prev) => ({ ...prev, loading: true, error: null }));
    getMediaTranscript(jobId, offset)
      .then((page) => {
        if (gen !== genRef.current || !mountedRef.current) return;
        setTranscript((prev) => ({
          segments: append ? [...prev.segments, ...page.segments] : page.segments,
          total: page.totalSegments,
          hasMore: page.hasMore,
          nextOffset: page.nextOffset,
          truncated: page.truncated,
          loading: false,
          error: null,
          loaded: true,
        }));
      })
      .catch((err: any) => {
        if (gen !== genRef.current || !mountedRef.current) return;
        setTranscript((prev) => ({ ...prev, loading: false, error: err?.message || "转写加载失败" }));
      });
  };
  // 自动首页只尝试一次（autoLoadedRef）：失败后由用户点击「重试」触发，避免失败→自动重取的死循环。
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (remote.phase !== "done" || stepKey !== "transcribe" || !jobId || autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    loadTranscriptPage(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote.phase, stepKey, jobId]);

  // 转写完成后导出 TXT 原文并触发浏览器下载。只调用导出接口，不改授权/执行/sttProvider 逻辑。
  const handleExportTxt = async () => {
    if (!jobId || txtExport.status === "running") return;
    setTxtExport({ status: "running", error: null, filename: null });
    try {
      const res = await exportMediaJob(jobId, { format: "txt", lang: "src" });
      if (!res?.downloadUrl) throw new Error("导出结果缺少下载链接");
      triggerBrowserDownload(res.downloadUrl, res.filename);
      if (!mountedRef.current) return;
      setTxtExport({ status: "done", error: null, filename: res.filename ?? null });
    } catch (err: any) {
      if (!mountedRef.current) return;
      setTxtExport({
        status: "idle",
        error: `导出失败：${err?.message || "网络错误"}`,
        filename: null,
      });
    }
  };

  // 处理确认
  const handleConfirmAction = async (autoApproveCredits?: number) => {
    // 只有服务端真值明确为「待确认」才允许授权；idle/done/running/failed 一律不发起授权。
    if (starting || phase !== "awaiting") return;
    const targetId = jobId || data.jobId || innerData.jobId;
    if (!targetId) {
      setError("缺少任务 ID");
      return;
    }

    const actionStep = (data.step || stepKey) as "transcribe" | "translate";
    const explicitTargetLang: string | undefined =
      actionStep === "translate"
        ? (normConfirmLang ?? normalizeMediaTargetLang(data.targetLang ?? toolArgs?.targetLang)) ?? undefined
        : undefined;

    // 针对 translate 步骤的首次 unauthorized typed 确认：点击前复核 readiness，不能回落 job.targetLang
    // budget_overrun 为追加预算，不走首次授权 readiness/revision 检查
    if (isTranslateConfirmation) {
      if (!explicitTargetLang) {
        setError("缺少有效目标语言，无法授权");
        return;
      }
      if (targetRevision === undefined) {
        setError("待确认结果缺少执行代次，无法授权，请重新发起");
        return;
      }

      try {
        const recheck = await getMediaStepReadiness(targetId, {
          step: "translate",
          targetLang: explicitTargetLang,
          expectedExecutionRevision: targetRevision,
        });

        if (
          recheck.jobId !== targetId ||
          recheck.step !== "translate" ||
          normalizeMediaTargetLang(recheck.targetLang) !== explicitTargetLang ||
          recheck.executionRevision !== targetRevision ||
          recheck.state !== "ready"
        ) {
          setError("步骤就绪状态已变更，无法执行授权，请重新发起");
          return;
        }

        const readyUpper = recheck.upperCredits;
        const isValidUpper = typeof readyUpper === "number" && Number.isFinite(readyUpper) && readyUpper >= 0;
        const matchesCard =
          isValidUpper && typeof cardUpperCredits === "number" && Math.abs(readyUpper - cardUpperCredits) < 1e-4;
        if (!isValidUpper || !matchesCard) {
          setError("授权金额与当前任务报价不一致，无法执行授权，请重新发起");
          return;
        }
      } catch (checkErr: any) {
        setError(`复核就绪状态失败：${checkErr?.message || "网络错误"}，请稍后重试`);
        return;
      }
    }

    const checkUpper =
      actionStep === "translate"
        ? (translateReadiness.state === "ready" ? translateReadiness.upperCredits ?? cardUpperCredits : cardUpperCredits)
        : (data.upperCredits ?? innerData.upperCredits ?? (actionStep ? deriveStepUpperCredits(job, actionStep) : null));
    const checkValid = typeof checkUpper === "number" && Number.isFinite(checkUpper) && checkUpper >= 0;
    if (!checkValid) {
      setError("缺少授权金额，无法授权，请重新发起或刷新查看");
      return;
    }

    const gen = ++genRef.current;
    const isLatest = () => mountedRef.current && gen === genRef.current;
    setStarting(true);
    setError(null);

    // 单步 STT 供应商：唯一来源是模型 args（tool-run 重放时 run.input 由同一 args 派生，仅作兜底）。
    // 仅 transcribe 透传；未指定则两处都不带键 —— 授权与执行的 selection 必须字节一致，否则服务端票据核销 409。
    const run = toolRunId ? getToolRunById(toolRunId) : undefined;
    const rawSttProvider: unknown = toolArgs?.sttProvider ?? run?.input?.sttProvider;
    const sttProviderArg =
      actionStep === "transcribe" && typeof rawSttProvider === "string" ? { sttProvider: rawSttProvider } : {};

    const authPayload: {
      step: "transcribe" | "translate";
      targetLang?: string;
      sttProvider?: string;
      expectedExecutionRevision?: number;
    } = {
      step: actionStep,
      ...(actionStep === "translate" && explicitTargetLang ? { targetLang: explicitTargetLang } : {}),
      ...(targetRevision !== undefined ? { expectedExecutionRevision: targetRevision } : {}),
      ...sttProviderArg,
    };

    // 授权阶段失败：尚未发起执行，状态保持 awaiting，明确可重试，不会产生扣费。
    let authorization: Awaited<ReturnType<typeof authorizeMediaStep>>;
    try {
      authorization = await authorizeMediaStep(targetId, authPayload, autoApproveCredits);
    } catch (err: any) {
      if (isLatest()) setError(`授权失败，可重试：${err?.message || "请稍后重试"}`);
      if (isLatest()) setStarting(false);
      return;
    }

    try {
      if (
        run &&
        storeDispatch &&
        run.interaction === "confirm" &&
        (run.status === "pending" || run.status === "failed")
      ) {
        await storeDispatch(
          executeToolRun({
            id: run.id,
            // 重放原参数：provider 与授权 payload 同一取值，未指定时不加键。
            inputOverride: {
              ...run.input,
              ...sttProviderArg,
              ...(actionStep === "translate" && explicitTargetLang ? { targetLang: explicitTargetLang } : {}),
              ...(targetRevision !== undefined ? { expectedExecutionRevision: targetRevision } : {}),
              confirmationToken: authorization.confirmationToken,
            },
          }),
        ).unwrap();
      } else {
        let res: Awaited<ReturnType<typeof mediaJobStep>> | null = null;
        try {
          res = await mediaJobStep(targetId, {
            step: actionStep,
            ...(actionStep === "translate" && explicitTargetLang ? { targetLang: explicitTargetLang } : {}),
            ...(targetRevision !== undefined ? { expectedExecutionRevision: targetRevision } : {}),
            ...sttProviderArg,
            confirmationToken: authorization.confirmationToken,
          });
        } catch (execErr: any) {
          // 执行请求出错不等于未启动：服务端可能已开始执行。必须重新读取真值核实后才允许再次授权。
          const verify = await getMediaJob(targetId).catch(() => null);
          if (!isLatest()) return;
          if (verify?.job) {
            setJob(verify.job);
            const p = derivePhase(stepKey, verify.job, explicitTargetLang);
            if (p) {
              setRemote({ phase: p });
              if (p === "awaiting") setError(`执行请求未确认，服务端仍待确认，可重试：${execErr?.message || ""}`);
              return;
            }
          }
          setRemote({ phase: "idle", error: "执行结果无法核实，请刷新后查看（未重复扣费）" });
          setError(execErr?.message || "执行结果未知");
          return;
        }
        if (isLatest()) applyStepOutcome(res?.stepResult);
        return;
      }
      // tool-run 路径：结果由 run 回填，状态以服务端 GET 真值为准（不假定成功）。
      if (isLatest()) {
        const latest = await getMediaJob(targetId).catch(() => null);
        if (isLatest() && latest?.job) {
          setJob(latest.job);
          const p = derivePhase(stepKey, latest.job, explicitTargetLang);
          // 真值无法判定时保持 idle（核对中），绝不编造 running/done。
          if (p) setRemote({ phase: p });
          else setRemote({ phase: "idle", error: "无法核对步骤状态，请刷新后查看" });
        }
      }
    } catch (err: any) {
      if (isLatest()) setError(err?.message || "确认步骤失败，请稍后重试");
    } finally {
      if (isLatest()) setStarting(false);
    }
  };

  // 待确认卡渲染
  if (isRequiresConfirmation) {
    // await 到本卡时 stepKey 必为原子步骤（derivePhase 只对 transcribe/translate 返回 awaiting）；
    // 仍显式判定一次，避免把未知步骤当成可授权步骤。
    const confirmStepKey: "transcribe" | "translate" | null = isStepKey(data.step || stepKey)
      ? ((data.step || stepKey) as "transcribe" | "translate")
      : null;
    // 金额真值优先级：
    // - translate 步骤必须来自卡片本次报价（经 readiness 校验），不历史 quote fallback；
    // - transcribe 步骤沿用既有优先级：工具结果 > 服务端报价 > 不可授权。
    const rawUpper =
      confirmStepKey === "translate"
        ? (translateReadiness.state === "ready" ? translateReadiness.upperCredits ?? cardUpperCredits : cardUpperCredits)
        : (data.upperCredits ?? innerData.upperCredits ?? (confirmStepKey ? deriveStepUpperCredits(job, confirmStepKey) : null));
    const hasValidAmount = typeof rawUpper === "number" && Number.isFinite(rawUpper) && rawUpper >= 0;
    const creditsLabel = hasValidAmount ? `${rawUpper} 积分` : "—";
    // 文件名/时长同样只取真值（工具结果或 GET job），缺失就不显示该段，不编造。
    const awaitingFileName = job?.fileName ?? data.fileName ?? innerData.fileName ?? null;
    // 金额为 0（或非法）时不给出免问阈值：roundUp(0)=1 会渲染成「0 积分」配「≤1 不用问」的错位。
    const autoApproveN = hasValidAmount && rawUpper > 0 ? roundUpToFriendlyCredits(rawUpper) : null;

    const canConfirm =
      confirmStepKey === "translate"
        ? (isTranslateConfirmation ? translateReadiness.state === "ready" : true) && hasValidAmount && Boolean(jobId)
        : hasValidAmount && Boolean(jobId);

    // 不可授权原因必须明确可见：
    const blockReason = !jobId
      ? "缺少任务 ID，无法授权，请刷新或重新发起"
      : confirmStepKey === "translate" && translateReadiness.error
        ? translateReadiness.error
        : preCheckError
          ? preCheckError.message
          : !hasValidAmount
            ? "缺少授权金额（upperCredits），无法授权，请重新发起或刷新查看"
            : null;

    const confirmDisabled = starting || !canConfirm || Boolean(blockReason);

    // 仅当翻译确认且 readiness 明确未就绪时，完全隐藏授权按钮（提示过期/冲突/阻断等原因）；
    // 其余待确认状态（如转写、预算超额、缺少金额）保留两个按钮结构但严格置为 disabled，不可点击授权。
    const hideConfirmButtons =
      confirmStepKey === "translate" &&
      isTranslateConfirmation &&
      translateReadiness.state !== "ready";

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
            {stepLabel} · 待确认
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

        <div data-testid="media-step-awaiting-body" style={{ fontSize: "12px", color: "var(--textMuted, #6b7280)", marginBottom: 10 }}>
          {[awaitingFileName, formattedDuration, `预计最多 ${creditsLabel}`]
            .filter((part): part is string => Boolean(part))
            .join(" · ")}
        </div>

        {data.reason === "budget_overrun" && (
          <div style={{ fontSize: "12px", color: "var(--warning, #b45309)", marginBottom: 10 }}>
            预算超额：需按上限定追加授权后才能继续
          </div>
        )}

        {confirmStepKey === "transcribe" && (
          <div data-testid="media-step-awaiting-note" style={{ fontSize: "12px", color: "var(--textMuted, #6b7280)", marginBottom: 10 }}>
            只转原文，不翻译、不总结
          </div>
        )}

        {blockReason && (
          <div data-testid="media-step-block-reason" style={{ fontSize: "12px", color: "var(--danger, #ef4444)", marginBottom: 8 }}>
            {blockReason}
          </div>
        )}

        {!hideConfirmButtons && (
          <>
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
                {starting ? "执行中…" : `开始${stepLabel}`}
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
          </>
        )}

        {error && (
          <div role="alert" style={{ marginTop: 8, fontSize: "12px", color: "var(--danger, #ef4444)" }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // 进行中 / 完成 / 失败 卡片渲染
  // data-status 必须与真实阶段一致：核对中/判不出绝不当成 done —— 否则卡片头部会误显示「完成」。
  const checkingUnknown = isChecking && Boolean(remote.error);
  const statusKey = isChecking
    ? checkingUnknown
      ? "unknown"
      : "checking"
    : isFailed
      ? "failed"
      : isRunning
        ? "running"
        : "done";
  const statusLabel = isChecking
    ? checkingUnknown
      ? "状态未知"
      : "正在核对状态…"
    : isFailed
      ? "失败"
      : isRunning
        ? "进行中"
        : "完成";
  const statusColor = isFailed
    ? "#ef4444"
    : isRunning
      ? "#2563eb"
      : isChecking
        ? checkingUnknown
          ? "#d97706"
          : "#64748b"
        : "#10b981";
  const statusBg = isFailed
    ? "rgba(239, 68, 68, 0.1)"
    : isRunning
      ? "rgba(37, 99, 235, 0.1)"
      : isChecking
        ? checkingUnknown
          ? "rgba(217, 119, 6, 0.12)"
          : "rgba(100, 116, 139, 0.12)"
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

      {/* 核对中：尚未取得服务端真值，不展示确认/完成/失败 */}
      {isChecking && jobId && (
        <div data-testid="media-step-checking" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--textMuted, #6b7280)", fontSize: "12px" }}>
          {!remote.error && <LoadingSpinner size={14} />}
          <span data-testid="media-step-checking-text">
            {checkingUnknown ? `状态未知：${remote.error}` : "正在核对状态…"}
          </span>
          {remote.error && (
            <button type="button" data-testid="media-step-verify-retry" onClick={() => verifyStepState()} style={{ fontSize: "12px" }}>
              重新核对
            </button>
          )}
        </div>
      )}
      {!isChecking && remote.error && isRunning && (
        <div data-testid="media-step-poll-error" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12px", color: "var(--danger, #ef4444)" }}>
          <span>{remote.error}</span>
          <button type="button" data-testid="media-step-verify-retry-running" onClick={() => verifyStepState()} style={{ fontSize: "12px" }}>
            重新核对
          </button>
        </div>
      )}
      {isChecking && !jobId && (
        <div data-testid="media-step-no-job" style={{ fontSize: "12px", color: "var(--danger, #ef4444)" }}>
          缺少任务 ID，无法核对步骤状态，请刷新或重新发起
        </div>
      )}

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
          {remote.error || data.error || data.message || "执行失败，请检查参数后重试"}
        </div>
      )}

      {/* 完成状态信息 */}
      {isDone && (
        <div>
          {stepKey === "transcribe" && transcript.error && (
            <div data-testid="media-step-transcript-error" style={{ marginBottom: 8, fontSize: "12px", color: "var(--danger, #ef4444)" }}>
              转写加载失败：{transcript.error}
              <button
                type="button"
                data-testid="media-step-transcript-retry"
                onClick={() => loadTranscriptPage(transcript.segments.length, transcript.segments.length > 0)}
                style={{ marginLeft: 8, fontSize: "12px" }}
              >
                重试
              </button>
            </div>
          )}
          {stepKey === "transcribe" && transcript.segments.length > 0 && (
            <div data-testid="media-step-transcript-status" style={{ marginBottom: 4, fontSize: "11px", color: "var(--textMuted, #6b7280)" }}>
              已显示 {transcript.segments.length} / {transcript.total} 段
              {transcript.truncated ? "（服务端按字数截断，可加载更多）" : ""}
            </div>
          )}
          {stepKey === "transcribe" && transcript.segments.length > 0 && (
            <div data-testid="media-step-transcript" style={{ marginBottom: 8, maxHeight: 240, overflow: "auto", fontSize: "12px", color: "var(--text, #111827)", whiteSpace: "pre-wrap" }}>
              {transcript.segments.map((seg) => (
                <div key={seg.id} style={{ marginBottom: 4 }}>
                  <span style={{ color: "var(--textMuted, #6b7280)", marginRight: 6 }}>
                    [{Math.floor(seg.startSec)}s]
                  </span>
                  {seg.text}
                </div>
              ))}
            </div>
          )}
          {stepKey === "transcribe" && transcript.hasMore && transcript.nextOffset !== null && (
            <button
              type="button"
              data-testid="media-step-transcript-more"
              disabled={transcript.loading}
              onClick={() => loadTranscriptPage(transcript.nextOffset as number, true)}
              style={{ marginBottom: 8, fontSize: "12px" }}
            >
              {transcript.loading ? "加载中…" : "加载更多"}
            </button>
          )}
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

          {/* 转写完成后的主入口：一键导出 TXT 原文并下载（服务端 export 不计费，无确认闸门） */}
          {stepKey === "transcribe" && jobId && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
              <button
                type="button"
                data-testid="media-step-download-txt"
                disabled={txtExport.status === "running"}
                onClick={() => void handleExportTxt()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#ffffff",
                  backgroundColor: "var(--primary, #2563eb)",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  cursor: txtExport.status === "running" ? "not-allowed" : "pointer",
                  opacity: txtExport.status === "running" ? 0.6 : 1,
                }}
              >
                <LuDownload />
                {txtExport.status === "running"
                  ? "正在生成…"
                  : txtExport.error
                    ? "重试下载 TXT"
                    : "下载 TXT"}
              </button>
              {txtExport.error && (
                <div
                  role="alert"
                  data-testid="media-step-download-txt-error"
                  style={{ fontSize: "12px", color: "var(--danger, #ef4444)" }}
                >
                  {txtExport.error}
                </div>
              )}
              {txtExport.status === "done" && (
                <div
                  data-testid="media-step-download-txt-done"
                  style={{ fontSize: "12px", color: "var(--textMuted, #6b7280)" }}
                >
                  已开始下载 {txtExport.filename || "TXT 文档"}
                </div>
              )}
            </div>
          )}

          {/* 导出完成时的下载链接 */}
          {stepKey === "exportDocument" && exportDownloadUrl && (
            <div style={{ marginTop: 8 }}>
              <a
                href={exportDownloadUrl}
                download={exportFileName || true}
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
                <LuDownload /> 下载 {exportFileName || "文档"}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaStepCard;
