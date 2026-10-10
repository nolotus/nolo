import { buildLectureMediaUrl } from "./mediaLectureMediaUrl";
import * as stylex from "@stylexjs/stylex";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "app/routing";
import { mediaLectureStyles as styles } from "./MediaLecturePageStyles";
import type { MediaJob, MediaJobDepth, MediaQuote } from "ai/lecture/types";
import { LectureOverview } from "render/web/lecture/LectureOverview";
import {
  ApiError,
  canOpenNotes,
  downloadExport,
  fetchJob,
  fetchResult,
  formatQuote,
  quoteExtend,
  seekAndPlay,
  startExtend,
  type ExportLang,
  type ExtendBody,
  type LectureView,
  type SubtitleFormat,
} from "./mediaLectureApi";

type Tab = "overview" | "bilingual" | "translation" | "glossary";
type Pending = { body: ExtendBody; quote: MediaQuote; label: string };
const errText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : "网络异常，请重试");
const hms = (sec: number) => new Date(Math.max(0, sec) * 1000).toISOString().slice(11, 19);
/** 积分区间文案：上下界相同时只写一个数（恢复报价常为精确值）。 */
const creditRange = (c: [number, number]) => (c[0] === c[1] ? `${c[0]}` : `${c[0]}–${c[1]}`);

export function MediaLectureView({ id, pollMs = 1500 }: { id: string; pollMs?: number }) {
  const player = useRef<HTMLMediaElement>(null);
  const [job, setJob] = useState<MediaJob | null>(null);
  const [result, setResult] = useState<LectureView | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportLang, setExportLang] = useState<ExportLang>("both");
  const [subFormat, setSubFormat] = useState<SubtitleFormat>("srt");
  const [pending, setPending] = useState<Pending | null>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [extendDepth, setExtendDepth] = useState<MediaJobDepth>("full");
  const extendToRef = useRef<HTMLInputElement>(null);
  /** 当前播放时间所在的 segment id（timeupdate 驱动，驱动行高亮跟随）。 */
  const [activeSegId, setActiveSegId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const j = await fetchJob(id);
      setJob(j);
      if (!canOpenNotes(j) && j.status !== "running") throw new Error(`任务状态为 ${j.status}，暂无可查看的笔记`);
      setResult(await fetchResult(id));
    } catch (e) {
      setResult(null);
      setError(errText(e));
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  // extend 后轮询到终态再刷新结果（恢复段的译文由此出现）
  useEffect(() => {
    if (job?.status !== "running") return;
    const t = setTimeout(() => {
      fetchJob(id).then(async (j) => {
        setJob(j);
        if (j.status !== "running") {
          setResult(await fetchResult(id));
          setNotice(j.status === "done" ? "已更新" : `任务结束：${j.error ?? j.status}`);
        }
      }).catch((e) => setActionError(errText(e)));
    }, pollMs);
    return () => clearTimeout(t);
  }, [job, id, pollMs]);

  const seek = async (sec: number) => setNotice(await seekAndPlay(player.current, sec));

  /** 播放高亮跟随：timeupdate 时按 currentTime 找出所在 segment（无元素或无结果时清除高亮）。 */
  const onTimeUpdate = useCallback(() => {
    const el = player.current;
    if (!el || !result) {
      setActiveSegId(null);
      return;
    }
    const t = el.currentTime;
    const current = result.segments.find((s) => t >= s.startSec && t < s.endSec);
    setActiveSegId(current?.id ?? null);
  }, [result]);

  const exportFile = async (format: string, lang: ExportLang = exportLang) => {
    setExportError("");
    try {
      await downloadExport(id, format, lang);
    } catch (e) {
      setExportError(errText(e));
    }
  };

  /** 两步：先报价（不扣费）展示给用户 → 确认后才调 extend（开始扣费）。 */
  const askQuote = async (body: ExtendBody, label: string) => {
    setActionError("");
    setBusy(true);
    try {
      setPending({ body, quote: await quoteExtend(id, body), label });
    } catch (e) {
      setActionError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const confirmExtend = async () => {
    if (!pending) return;
    setActionError("");
    setBusy(true);
    try {
      setJob(await startExtend(id, pending.body));
      setPending(null);
      setNotice("已开始处理，完成后自动刷新");
    } catch (e) {
      setActionError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const askScopeDepth = () => {
    if (!result) return;
    const extendTo = extendToRef.current?.value.trim() ?? "";
    const to = Number(extendTo);
    const body: ExtendBody = { depth: extendDepth };
    if (extendTo !== "") {
      if (!(to > 0)) {
        setActionError("请输入有效的结束秒数");
        return;
      }
      body.scope = { fromSec: result.scope.fromSec, toSec: Math.min(to, result.source.durationSec) };
    }
    void askQuote(body, "追加范围/深度");
  };

  if (error) {
    return (
      <main {...stylex.props(styles.page)}>
        <p role="alert" {...stylex.props(styles.statusAlert)}>{error}</p>
        <div>
          <button {...stylex.props(styles.btn)} onClick={() => void load()}>重试</button>
        </div>
      </main>
    );
  }
  if (!result || !job) {
    return (
      <main {...stylex.props(styles.page)}>
        <p {...stylex.props(styles.hint)}>正在加载课程笔记…</p>
      </main>
    );
  }
  const Player = result.source.kind === "video" ? "video" : "audio";
  const mediaUrl = buildLectureMediaUrl(result.source.fileId);
  const running = job.status === "running";
  const canExtend = ["done", "cancelled", "failed"].includes(job.status) && !running;
  const excludedSegments = result.segments.filter((s) => s.excluded);
  const restoreBtn = (segId: string) => (
    <button
      {...stylex.props(styles.btn)}
      disabled={busy || !canExtend}
      onClick={() => void askQuote({ segmentIds: [segId] }, "恢复为讲课并补翻译")}
    >
      恢复为讲课
    </button>
  );
  const timeBtn = (sec: number) => (
    <button {...stylex.props(styles.timeBtn)} onClick={() => void seek(sec)}>{hms(sec)}</button>
  );
  const tabs: [Tab, string][] = [
    ["overview", "概览"],
    ["bilingual", "双语对照"],
    ["translation", "译文全文"],
    ["glossary", "术语表"],
  ];

  return (
    <main {...stylex.props(styles.page)}>
      <h1 {...stylex.props(styles.title)}>{result.source.name}</h1>
      {job.status === "cancelled" && (
        <p role="status" {...stylex.props(styles.statusNotice)}>任务已取消，以下为已完成部分的笔记</p>
      )}
      {running && <p role="status" {...stylex.props(styles.statusNotice)}>处理中…</p>}
      <Player
        ref={player as never}
        controls
        src={mediaUrl}
        data-testid="media-player"
        onTimeUpdate={onTimeUpdate}
        {...stylex.props(styles.player)}
      />
      {notice && (
        <p role="status" data-testid="notice" {...stylex.props(styles.statusNotice)}>{notice}</p>
      )}

      <nav aria-label="课程笔记标签" {...stylex.props(styles.tabBar)}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            {...stylex.props(styles.tab, tab === key && styles.tabActive)}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <details {...stylex.props(styles.panel)}>
        <summary {...stylex.props(styles.panelSummary)}>导出</summary>
        <div {...stylex.props(styles.actions, styles.formRow)}>
        <label {...stylex.props(styles.fieldLabel)}>
          字幕格式
          <select
            {...stylex.props(styles.select)}
            aria-label="字幕格式"
            value={subFormat}
            onChange={(e) => setSubFormat(e.target.value as SubtitleFormat)}
          >
            <option value="srt">SRT</option>
            <option value="vtt">VTT</option>
          </select>
        </label>
        <label {...stylex.props(styles.fieldLabel)}>
          语言
          <select
            {...stylex.props(styles.select)}
            aria-label="导出语言"
            value={exportLang}
            onChange={(e) => setExportLang(e.target.value as ExportLang)}
          >
            <option value="both">双语</option>
            <option value="tgt">仅译文</option>
            <option value="src">仅原文</option>
          </select>
        </label>
        <button {...stylex.props(styles.btn)} onClick={() => void exportFile(subFormat)}>导出字幕</button>
        <button {...stylex.props(styles.btn)} onClick={() => void exportFile("docx")}>DOCX</button>
        <button {...stylex.props(styles.btn)} onClick={() => void exportFile("md")}>Markdown</button>
        <button {...stylex.props(styles.btn)} onClick={() => void exportFile("txt", "src")}>TXT 原文</button>
        {exportError && <p role="alert" data-testid="export-error" {...stylex.props(styles.statusAlert)}>{exportError}</p>}
        </div>
      </details>

      {job.status === "done" && (
        <details data-testid="extend-panel" {...stylex.props(styles.panel)}>
          <summary {...stylex.props(styles.panelSummary)}>追加范围/深度</summary>
          <div {...stylex.props(styles.actions, styles.formRow)}>
          <label {...stylex.props(styles.fieldLabel)}>
            深度
            <select
              {...stylex.props(styles.select)}
              aria-label="追加深度"
              value={extendDepth}
              onChange={(e) => setExtendDepth(e.target.value as MediaJobDepth)}
            >
              <option value="outline">大纲</option>
              <option value="translate">翻译</option>
              <option value="full">完整</option>
            </select>
          </label>
          <label {...stylex.props(styles.fieldLabel)}>
            处理到（秒，留空=不变）
            <input
              {...stylex.props(styles.input)}
              aria-label="追加结束秒数"
              ref={extendToRef}
              defaultValue=""
              inputMode="numeric"
            />
          </label>
          <button {...stylex.props(styles.btn)} disabled={busy} onClick={askScopeDepth}>获取报价</button>
          </div>
        </details>
      )}

      {pending && (
        <section role="dialog" aria-label="确认扣费" {...stylex.props(styles.dialog)}>
          {pending.body.segmentIds && (
            <p data-testid="restore-confirm" {...stylex.props(styles.dialogText)}>
              恢复此段并补翻译预计需消耗 {creditRange(pending.quote.totalCredits)} 积分，确认继续？
            </p>
          )}
          <p {...stylex.props(styles.dialogText)}>
            {pending.label}：<span data-testid="quote-text">{formatQuote(pending.quote)}</span>
          </p>
          <div {...stylex.props(styles.actions)}>
            <button {...stylex.props(styles.btn, styles.btnPrimary)} disabled={busy} onClick={() => void confirmExtend()}>确认并扣费</button>
            <button {...stylex.props(styles.btn)} onClick={() => setPending(null)}>取消</button>
          </div>
        </section>
      )}
      {actionError && (
        <p role="alert" data-testid="action-error" {...stylex.props(styles.statusAlert)}>{actionError}</p>
      )}

      <div>
        <button
          {...stylex.props(styles.btn)}
          onClick={() => window.location.assign(`/chat?mediaJobId=${encodeURIComponent(id)}`)}
        >
          把笔记挂进对话
        </button>
      </div>

      {excludedSegments.length > 0 && (
        <details {...stylex.props(styles.panel)}>
          <summary {...stylex.props(styles.panelSummary)}>排除的片段</summary>
          <p {...stylex.props(styles.hint)}>灰色片段为排除内容。</p>
          <ul {...stylex.props(styles.list)}>
            {excludedSegments.map((s) => (
              <li key={s.id} data-segment-id={s.id} {...stylex.props(styles.glossaryItem)}>
                <span>{s.text}</span> — 已排除 {restoreBtn(s.id)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {tab === "overview" && <LectureOverview result={result} onSeek={(sec) => void seek(sec)} />}
      {tab === "bilingual" && (
        <div {...stylex.props(styles.tableWrap)}>
          <table {...stylex.props(styles.table)}>
            <thead>
              <tr>
                <th {...stylex.props(styles.th)}>时间</th>
                <th {...stylex.props(styles.th)}>原文</th>
                <th {...stylex.props(styles.th)}>译文</th>
                <th {...stylex.props(styles.th)}>操作</th>
              </tr>
            </thead>
            <tbody>
              {result.segments.map((s) => {
                const playing = activeSegId === s.id;
                const rowSx = stylex.props(playing && styles.rowActive);
                return (
                  <tr
                    key={s.id}
                    data-row-id={s.id}
                    className={[rowSx.className, playing ? "seg-row is-active" : "seg-row"].filter(Boolean).join(" ")}
                    data-active={playing ? "true" : undefined}
                    aria-current={playing ? "true" : undefined}
                  >
                    <td {...stylex.props(styles.td)}>{timeBtn(s.startSec)}</td>
                    <td {...stylex.props(styles.td)}>{s.text}</td>
                    <td {...stylex.props(styles.td)}>{s.translation}</td>
                    <td {...stylex.props(styles.td)}>{s.excluded ? restoreBtn(s.id) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {tab === "translation" && (
        <section {...stylex.props(styles.panel)}>
          {result.segments
            .filter((s) => !s.excluded)
            .map((s) => (
              <p key={s.id} {...stylex.props(styles.translationItem)}>
                {timeBtn(s.startSec)} {s.translation}
              </p>
            ))}
        </section>
      )}
      {tab === "glossary" && (
        <ul {...stylex.props(styles.list)}>
          {result.glossary.map((t, i) => (
            <li key={i} {...stylex.props(styles.glossaryItem)}>
              {t.source} → {t.target}
              {t.note ? ` — ${t.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function MediaLecturePage() {
  const { id = "" } = useParams();
  return <MediaLectureView id={id} />;
}
