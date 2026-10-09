import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "app/routing";
import type { MediaJob, MediaJobDepth, MediaScope } from "ai/lecture/types";
import { mediaJobAction, startMediaJob, updateMediaQuote } from "./mediaJobs";
import { useTranslation } from "react-i18next";

type Props = {
  jobId: string;
  fileName: string;
  sourceText: string;
  sourceLang?: string;
  targetLang?: string;
  topic?: string;
  onSourceLangChange?: (value: string) => void;
  onTargetLangChange?: (value: string) => void;
  onTopicChange?: (value: string) => void;
  onLanguageHints?: (hints: {
    sourceLang?: string;
    targetLang?: string;
  }) => void;
  /** 轮询拿到 404（后端已无此 job）时回调，调用方静默摘除该卡片，不打扰用户。 */
  onJobMissing?: () => void;
  /** cancelled 且无产物（未计费、无阶段产物）时回调，调用方丢弃这条无价值条目。 */
  onJobDiscard?: () => void;
};
const langHints = (text: string) => ({
  sourceLang: /俄语|俄文|russian/i.test(text) ? "ru" : undefined,
  targetLang: /中文|翻译成中文|chinese/i.test(text) ? "zh" : undefined,
});
const money = (v: number) => `${v.toFixed(2)} 积分`;
/** 秒 → M:SS 时钟（报价区间展示） */
const fmtClock = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
/** 秒 → 分钟（不足 1 分钟按秒显示；整数不带小数，避免把 36.5 分钟显示成 37） */
const fmtMinutes = (sec: number) => {
  if (sec < 60) return `${Math.round(sec)} 秒`;
  return Number.isInteger(sec / 60)
    ? `${sec / 60} 分钟`
    : `${(sec / 60).toFixed(1)} 分钟`;
};
/** 范围相等判断（范围按钮选中态 aria-pressed 用）。 */
const sameScope = (a: MediaScope, b: MediaScope) =>
  a.fromSec === b.fromSec && a.toSec === b.toSec;
/** 「本次处理范围」文案：范围与全片时长并列，避免把局部报价误读成全片价格。 */
const scopeLabel = (scope: MediaScope, durationSec: number) => {
  const coversAll = scope.fromSec <= 0 && scope.toSec >= durationSec;
  if (coversAll) return `全部 ${fmtMinutes(durationSec)}`;
  if (scope.fromSec <= 0) {
    return `前 ${fmtMinutes(scope.toSec)}（全片 ${fmtMinutes(durationSec)}）`;
  }
  if (scope.toSec >= durationSec) {
    return `${fmtClock(scope.fromSec)} 至结尾（${fmtMinutes(
      scope.toSec - scope.fromSec,
    )} · 全片 ${fmtMinutes(durationSec)}）`;
  }
  return `${fmtClock(scope.fromSec)}–${fmtClock(scope.toSec)}（${fmtMinutes(
    scope.toSec - scope.fromSec,
  )} · 全片 ${fmtMinutes(durationSec)}）`;
};
/** 后端原始 error 只取首行可读文案，避免把内部细节/堆栈裸露给用户。 */
const userFacingError = (raw?: string) => {
  const firstLine = (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine ?? "处理失败，请稍后重试";
};
/** 终态：到达后卡片不再轮询后端（P3）。 */
const TERMINAL_STATUSES = new Set(["done", "failed", "cancelled"]);
const stageLabel: Record<string, string> = {
  preprocess: "预处理",
  transcribe: "转写",
  label: "标注",
  translate: "翻译",
  summarize: "总结",
};

export function MediaJobCard({
  jobId,
  fileName,
  sourceText,
  sourceLang: sourceLangProp,
  targetLang: targetLangProp,
  topic: topicProp,
  onSourceLangChange,
  onTargetLangChange,
  onTopicChange,
  onLanguageHints,
  onJobMissing,
  onJobDiscard,
}: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation("chat");
  const [job, setJob] = useState<MediaJob | null>(null);
  const [quoteResult, setQuoteResult] = useState<MediaJob["quote"] | null>(null);
  const [scope, setScope] = useState<MediaScope>({ fromSec: 0, toSec: 300 });
  const [depth, setDepth] = useState<MediaJobDepth>("outline");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [error, setError] = useState("");
  const [localSourceLang, setSourceLang] = useState("");
  const [localTargetLang, setTargetLang] = useState("");
  const [languageInitialized, setLanguageInitialized] = useState(false);
  const [topic, setTopic] = useState("");
  const [customFrom, setCustomFrom] = useState("0");
  const [customTo, setCustomTo] = useState("300");
  const [resuming, setResuming] = useState(false);
  const [extending, setExtending] = useState(false);
  /** W10：done 之后「追加区间」的起止秒输入（默认取已处理结束 → 全片结尾）。 */
  const extendFromRef = useRef<HTMLInputElement>(null);
  const extendToRef = useRef<HTMLInputElement>(null);
  const [quoteOutdated, setQuoteOutdated] = useState(false);
  const [starting, setStarting] = useState(false);
  /**
   * 当前展示的报价是否「对应当前选项且成功返回」（复审 HIGH-1 修复）。
   * 选项一变立即置 false；只有本次选项的报价 200 落地后才置 true。报价失败时
   * 保持 false：quote 收敛为 null、「开始处理」禁用——绝不回退成上一次选项的
   * 旧报价启动新任务（那会让用户在不知情下直接超预算）。
   */
  const [quoteValid, setQuoteValid] = useState(false);
  /** 最近一次报价失败的可读文案（空 = 无失败）；与重试按钮配套展示。 */
  const [quoteError, setQuoteError] = useState("");
  /** 重试 nonce：点「重新报价」自增，触发报价 effect 重跑（再次改动选项同样会重跑）。 */
  const [retryNonce, setRetryNonce] = useState(0);
  /** 报价请求序号：选项每次变化自增，用于丢弃滞后的旧报价响应（P1 竞态）。 */
  const quoteReqSeqRef = useRef(0);
  /** 本地操作序号：start/cancel/confirm/extend 自增，令轮询丢弃被操作捷先
   *  落地的过期 GET，避免旧状态覆盖操作结果（P3）。 */
  const mutationSeqRef = useRef(0);
  /** 防止「开始处理」连点造成重复 start（P1）。 */
  const startingRef = useRef(false);
  const hints = useMemo(() => langHints(sourceText), [sourceText]);
  const sourceLang =
    localSourceLang || sourceLangProp || hints.sourceLang || job?.sourceLang;
  const targetLang =
    localTargetLang || targetLangProp || hints.targetLang || job?.targetLang || "zh";

  useEffect(() => {
    // 终态（done/failed/cancelled）停止轮询；未加载（job=null）与报价中/运行中继续。
    // extend 续跑后 status 回到 running，本 effect 依赖 job?.status 自动重启轮询。
    if (job && TERMINAL_STATUSES.has(job.status)) return;
    let active = true;
    let inFlight = false;
    const poll = async () => {
      if (!active || inFlight) return; // 避免 interval 请求重叠
      const seqAtReq = mutationSeqRef.current;
      inFlight = true;
      try {
        const response = await fetch(`/api/media-jobs/${jobId}`);
        if (!active) return;
        // 404 = 后端已无此任务；403 = 已无访问权（换账号/权限回收）：都静默摘除卡片。
        if (response.status === 404 || response.status === 403) {
          onJobMissing?.();
          return;
        }
        if (!response.ok) return;
        const data = await response.json();
        // 丢弃过期 GET：请求期间若有本地操作（start/cancel/confirm/extend）抢先
        // 落地，其结果更新鲜，不让这条旧 GET 覆盖回去。
        if (active && mutationSeqRef.current === seqAtReq) setJob(data.job);
      } catch {
        /* transient network error */
      } finally {
        if (active) inFlight = false;
      }
    };
    // 仅在首次未加载（job=null）时立即取一次状态；状态切换（含 extend 续跑 → running）
    // 交给 interval 重启，避免刚被 extend 写成 running 就被一次立即 GET 用旧数据覆盖。
    if (!job) void poll();
    const timer = window.setInterval(() => void poll(), 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [jobId, job?.status, onJobMissing]);

  useEffect(() => {
    if (!languageInitialized && job && job.status === "quoted") {
      if (hints.sourceLang) onSourceLangChange?.(hints.sourceLang);
      onTargetLangChange?.(hints.targetLang ?? targetLang);
      onLanguageHints?.({ ...hints, targetLang: hints.targetLang ?? targetLang });
      setLanguageInitialized(true);
    }
  }, [job, languageInitialized, hints, onLanguageHints]);

  useEffect(() => {
    if (!job || job.status !== "quoted") return;
    // 选项变化立刻自增序号并置脏/置忙：哪怕还在 350ms 防抖窗口内，也不让「开始
    // 处理」用旧报价启动；序号用于丢弃此时已在飞的旧报价响应（P1）。
    const myReqId = ++quoteReqSeqRef.current;
    setQuoteOutdated(true);
    setQuoteBusy(true);
    // 选项一变，旧报价立即失效：失败时也不得回退成上一次选项的报价。
    setQuoteValid(false);
    const timer = window.setTimeout(async () => {
      try {
        const value = await updateMediaQuote(
          jobId,
          scope,
          depth,
          sourceLang,
          targetLang,
        );
        if (quoteReqSeqRef.current !== myReqId) return; // 过期响应，丢弃
        setJob(value.job);
        setQuoteResult(value.quote);
        setQuoteError("");
        setQuoteValid(true);
        setQuoteOutdated(false);
      } catch (cause) {
        if (quoteReqSeqRef.current !== myReqId) return;
        // 失败路径（复审 HIGH-1）：作废旧报价、禁用开始、给可读错误 + 重试。
        setQuoteResult(null);
        setQuoteValid(false);
        setQuoteError(cause instanceof Error ? cause.message : String(cause));
        setQuoteOutdated(false);
      } finally {
        if (quoteReqSeqRef.current === myReqId) setQuoteBusy(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [jobId, job?.status, scope, depth, sourceLang, targetLang, retryNonce]);

  /**
   * cancelled 且无产物（未计费、无阶段产物）= 既没有笔记可看、也没有可续跑
   * 的进度，留着只是噪音：自动丢弃这一条（含持久化引用）。
   */
  useEffect(() => {
    if (!job || job.status !== "cancelled") return;
    const spent = Object.values(job.spent).reduce((a, b) => a + (b ?? 0), 0);
    const hasArtifacts = Object.keys(job.stageArtifacts).length > 0;
    if (spent <= 0 && !hasArtifacts) onJobDiscard?.();
  }, [job, onJobDiscard]);

  const choose = (next: MediaScope) => setScope(next);
  const start = async () => {
    // 只有当前版本报价完成后才允许启动；连点/报价在途一律拦截（P1）。
    if (startingRef.current) return;
    if (job?.status !== "quoted") return;
    if (quoteBusy || quoteOutdated || !quote) return;
    if (quote.balanceCredits < quote.totalCredits[0]) return;
    startingRef.current = true;
    setStarting(true);
    try {
      const result = await startMediaJob(
        jobId,
        scope,
        depth,
        sourceLang,
        targetLang,
      );
      mutationSeqRef.current += 1;
      setJob(result.job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };
  const confirmOverrun = async (accept: boolean) => {
    const result = await mediaJobAction(jobId, "confirm-overrun", { accept });
    mutationSeqRef.current += 1;
    setJob(result.job);
  };
  const cancel = async () => {
    const result = await mediaJobAction(jobId, "cancel");
    mutationSeqRef.current += 1;
    setJob(result.job);
  };
  /** failed/cancelled 后续跑：scope 取并集、depth 合并，已完成阶段不重复计费。 */
  const resume = async () => {
    if (!job) return;
    setResuming(true);
    try {
      const result = await mediaJobAction(jobId, "extend", {
        scope: job.scope,
        depth: job.depth,
      });
      setError("");
      setJob(result.job);
      mutationSeqRef.current += 1;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setResuming(false);
    }
  };
  /**
   * W10：done 之后追加尚未处理的时间区间。scope 与已处理范围取并集交给后端
   * （后端合并、已完成阶段不重复计费），depth 沿用原任务深度；成功后 job 回到
   * running，轮询 effect 依赖 job?.status 自动重启。
   */
  const extendRange = async () => {
    if (!job) return;
    const rawFrom = extendFromRef.current?.value.trim() ?? "";
    const rawTo = extendToRef.current?.value.trim() ?? "";
    const from = Number(rawFrom === "" ? job.scope.toSec : rawFrom);
    const to = Number(rawTo === "" ? job.durationSec : rawTo);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
      setError("请输入有效的追加区间：结束秒数需大于起始秒数");
      return;
    }
    if (from < 0 || to > job.durationSec) {
      setError(`追加区间需在 0–${Math.round(job.durationSec)} 秒（全片时长）之内`);
      return;
    }
    setExtending(true);
    try {
      const result = await mediaJobAction(jobId, "extend", {
        scope: { fromSec: from, toSec: to },
        depth: job.depth,
      });
      setError("");
      setJob(result.job);
      mutationSeqRef.current += 1;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setExtending(false);
    }
  };
  // quoteValid = 当前报价对应「当前选项」且成功返回；否则一律视为未报价
  // （失败/防抖在途都不拿旧报价充数——复审 HIGH-1）。
  const quote = quoteValid ? quoteResult ?? job?.quote : null;
  /** 防抖/在途/旧选项：金额区域进入加载态，不展示与当前选项无关的旧金额。 */
  const quoteStale = quoteBusy || quoteOutdated;
  const terminal = job && ["done", "failed", "cancelled"].includes(job.status);
  const spentCredits = job
    ? Object.values(job.spent).reduce((a, b) => a + (b ?? 0), 0)
    : 0;
  const resumable =
    !!job &&
    (job.status === "failed" || job.status === "cancelled") &&
    (Object.keys(job.spent).length > 0 ||
      Object.keys(job.stageArtifacts).length > 0);

  return (
    <section className="media-job-card" aria-label={`Media job ${fileName}`}>
      <strong>{fileName}</strong>
      <output data-testid="job-quote-target">{targetLang ?? "无"}</output>
      {!job ? (
        <p>正在准备媒体任务…</p>
      ) : (
        <>
          {job.status === "quoted" && (
            <>
              <p>全片时长：{fmtMinutes(job.durationSec)}</p>
              <p data-testid="job-scope" aria-label="本次处理范围">
                本次处理：{scopeLabel(scope, job.durationSec)}
              </p>
              {quoteStale || !quote ? (
                // 防抖/在途/失败/未完成：金额区域一律加载态，不展示旧金额，
                // 避免用户把上一个选项的报价读成当前选项的价格（复审 LOW）。
                <p data-testid="job-quote-pending" aria-busy="true">
                  {quoteStale
                    ? "报价更新中…"
                    : quoteError
                      ? `报价失败：${userFacingError(quoteError)}`
                      : "报价中…"}
                </p>
              ) : (
                <>
                  <p>
                    预计 {Math.ceil(quote.etaSec[0] / 60)}–
                    {Math.ceil(quote.etaSec[1] / 60)} 分钟
                  </p>
                  {depth !== "outline" &&
                    targetLang &&
                    !quote.items.some((item) => item.stage === "translate") && (
                      <p>翻译：报价中</p>
                    )}
                  {quote.items.map((item) => (
                    <p key={item.stage}>
                      {stageLabel[item.stage]}：
                      {item.credits[0] === item.credits[1]
                        ? money(item.credits[0])
                        : `${money(item.credits[0])}–${money(item.credits[1])}`}
                    </p>
                  ))}
                  <p data-testid="job-quote-total">
                    合计：
                    {money(quote.totalCredits[0])}–{money(quote.totalCredits[1])}{" "}
                    · 余额：{money(quote.balanceCredits)}
                  </p>
                </>
              )}
              <div>
                <button
                  aria-pressed={sameScope(
                    { fromSec: 0, toSec: job.durationSec },
                    scope,
                  )}
                  onClick={() => choose({ fromSec: 0, toSec: job.durationSec })}
                >
                  全部
                </button>
                <button
                  aria-pressed={sameScope(
                    { fromSec: 0, toSec: job.durationSec / 2 },
                    scope,
                  )}
                  onClick={() =>
                    choose({ fromSec: 0, toSec: job.durationSec / 2 })
                  }
                >
                  前一半
                </button>
                <button
                  aria-pressed={sameScope(
                    { fromSec: 0, toSec: Math.min(300, job.durationSec) },
                    scope,
                  )}
                  onClick={() =>
                    choose({
                      fromSec: 0,
                      toSec: Math.min(300, job.durationSec),
                    })
                  }
                >
                  先试 5 分钟
                </button>
                <label>
                  自定义起止秒{" "}
                  <input
                    aria-label="起始秒"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                  <input
                    aria-label="结束秒"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                  <button
                    aria-pressed={sameScope(
                      {
                        fromSec: Math.max(0, Number(customFrom)),
                        toSec: Math.min(job.durationSec, Number(customTo)),
                      },
                      scope,
                    )}
                    onClick={() =>
                      choose({
                        fromSec: Math.max(0, Number(customFrom)),
                        toSec: Math.min(job.durationSec, Number(customTo)),
                      })
                    }
                  >
                    应用区间
                  </button>
                </label>
              </div>
              <label>
                深度{" "}
                <select
                  value={depth}
                  onChange={(e) => setDepth(e.target.value as MediaJobDepth)}
                >
                  <option value="outline">只要大纲重点</option>
                  <option value="translate">转写+翻译</option>
                  <option value="full">全套</option>
                </select>
              </label>
              <p>
                {t("mediaJob.languageLine", "语言：{{source}} → {{target}}", {
                  source: sourceLang ?? t("mediaJob.auto", "自动"),
                  target: targetLang ?? t("mediaJob.none", "无"),
                })}
              </p>
              <label>
                {t("mediaJob.sourceLanguage", "源语言")}{" "}
                <input
                  value={sourceLang ?? ""}
                  onChange={(e) => {
                    setSourceLang(e.target.value);
                    onSourceLangChange?.(e.target.value);
                  }}
                  placeholder={t("mediaJob.autoDetect", "自动检测")}
                />
              </label>
              <label>
                {t("mediaJob.targetLanguage", "目标语言")}{" "}
                <input
                  value={targetLang ?? "zh"}
                  onChange={(e) => {
                    setTargetLang(e.target.value);
                    onTargetLangChange?.(e.target.value);
                  }}
                  placeholder={t("mediaJob.noTranslate", "不翻译")}
                />
              </label>
              <label>
                课程主题/关键词{" "}
                <input
                  value={topicProp ?? topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    onTopicChange?.(e.target.value);
                  }}
                  placeholder="可选"
                />
              </label>
              {job.trimSuggestions.map((suggestion, i) => (
                <p key={i}>
                  截取建议：{suggestion.reason}{" "}
                  <button
                    aria-pressed={sameScope(
                      { fromSec: suggestion.fromSec, toSec: suggestion.toSec },
                      scope,
                    )}
                    onClick={() =>
                      choose({
                        fromSec: suggestion.fromSec,
                        toSec: suggestion.toSec,
                      })
                    }
                  >
                    接受建议
                  </button>
                </p>
              ))}
              {quote?.affordableToSec !== undefined && (
                <p>
                  余额不足，可处理前 {Math.floor(quote.affordableToSec / 60)}{" "}
                  分钟{" "}
                  <button
                    aria-pressed={sameScope(
                      { fromSec: 0, toSec: quote.affordableToSec! },
                      scope,
                    )}
                    onClick={() =>
                      choose({ fromSec: 0, toSec: quote.affordableToSec! })
                    }
                  >
                    选择可处理范围
                  </button>
                </p>
              )}
              {quoteError && !quoteStale && (
                <button
                  data-testid="job-quote-retry"
                  onClick={() => {
                    setQuoteError("");
                    setRetryNonce((n) => n + 1);
                  }}
                >
                  重新报价
                </button>
              )}
              {error && <p role="alert">{error}</p>}
              <button
                data-testid="job-start"
                disabled={
                  quoteBusy ||
                  quoteOutdated ||
                  starting ||
                  !quote ||
                  quote.balanceCredits < quote.totalCredits[0]
                }
                onClick={start}
              >
                开始处理
              </button>
            </>
          )}
          {job.status !== "quoted" && (
            <>
              <p>
                {job.status === "running"
                  ? `${stageLabel[job.stage ?? "preprocess"]} ${job.progress.done}/${job.progress.total}`
                  : job.status}
              </p>
              <progress
                value={job.progress.done}
                max={Math.max(1, job.progress.total)}
              />
              <p>已花费：{money(spentCredits)}</p>
              {job.status === "awaiting_confirmation" && (
                <p>
                  超额 {money(job.overrunCredits ?? 0)}{" "}
                  <button onClick={() => void confirmOverrun(true)}>
                    继续
                  </button>
                  <button onClick={() => void confirmOverrun(false)}>
                    停止
                  </button>
                </p>
              )}
              {!terminal && job.status !== "awaiting_confirmation" && (
                <button onClick={() => void cancel()}>取消</button>
              )}
              {job.status === "done" && (
                <button onClick={() => navigate(`/media-jobs/${jobId}`)}>
                  打开笔记
                </button>
              )}
              {job.status === "done" && (
                <details data-testid="extend-range-panel">
                  <summary>追加区间</summary>
                  <p>
                    已处理 {scopeLabel(job.scope, job.durationSec)}；尚未处理{" "}
                    {scopeLabel(
                      { fromSec: job.scope.toSec, toSec: job.durationSec },
                      job.durationSec,
                    )}
                    （已处理部分不会重复计费）
                  </p>
                  <label>
                    起始秒（已处理到 {Math.round(job.scope.toSec)}）
                    <input
                      aria-label="追加起始秒"
                      ref={extendFromRef}
                      key={`from-${job.scope.toSec}`}
                      defaultValue={String(Math.round(job.scope.toSec))}
                      inputMode="numeric"
                    />
                  </label>
                  <label>
                    结束秒（全片 {Math.round(job.durationSec)}）
                    <input
                      aria-label="追加结束秒"
                      ref={extendToRef}
                      key={`to-${job.durationSec}`}
                      defaultValue={String(Math.round(job.durationSec))}
                      inputMode="numeric"
                    />
                  </label>
                  <button
                    data-testid="job-extend-range"
                    disabled={extending}
                    onClick={() => void extendRange()}
                  >
                    {extending ? "提交中…" : "追加处理"}
                  </button>
                </details>
              )}
              {job.status === "failed" && (
                <div role="alert" data-testid="job-error">
                  <p>处理失败：{userFacingError(job.error)}</p>
                  {resumable && (
                    <button
                      data-testid="job-resume"
                      disabled={resuming}
                      onClick={() => void resume()}
                    >
                      继续处理（已完成部分不重复计费）
                    </button>
                  )}
                </div>
              )}
              {job.status === "cancelled" && resumable && (
                <div data-testid="job-resume-area">
                  <p>
                    已取消（已花费 {money(spentCredits)}
                    ，已完成阶段不会重复计费）
                  </p>
                  <button
                    data-testid="job-resume"
                    disabled={resuming}
                    onClick={() => void resume()}
                  >
                    继续处理（已完成部分不重复计费）
                  </button>
                </div>
              )}
              {error && (
                <p role="alert" data-testid="job-action-error">
                  {userFacingError(error)}
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
