import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "app/routing";
import type { MediaJob, MediaJobDepth, MediaQuote } from "ai/lecture/types";
import { LectureOverview } from "render/web/lecture/LectureOverview";
import {
  ApiError,
  canOpenNotes,
  fetchExport,
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

  const exportFile = async (format: string, lang: ExportLang = exportLang) => {
    setExportError("");
    try {
      const { blob, filename } = await fetchExport(id, format, lang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      <main>
        <p role="alert">{error}</p>
        <button onClick={() => void load()}>重试</button>
      </main>
    );
  }
  if (!result || !job) {
    return (
      <main>
        <p>正在加载课程笔记…</p>
      </main>
    );
  }
  const Player = result.source.kind === "video" ? "video" : "audio";
  const mediaUrl = `/api/db/file/content/${encodeURIComponent(result.source.fileId)}`;
  const running = job.status === "running";
  const canExtend = ["done", "cancelled", "failed"].includes(job.status) && !running;
  const excludedSegments = result.segments.filter((s) => s.excluded);
  const restoreBtn = (segId: string) => (
    <button
      disabled={busy || !canExtend}
      onClick={() => void askQuote({ segmentIds: [segId] }, "恢复为讲课并补翻译")}
    >
      恢复为讲课
    </button>
  );
  const timeBtn = (sec: number) => (
    <button onClick={() => void seek(sec)}>{hms(sec)}</button>
  );

  return (
    <main>
      <h1>{result.source.name}</h1>
      {job.status === "cancelled" && <p role="status">任务已取消，以下为已完成部分的笔记</p>}
      {running && <p role="status">处理中…</p>}
      <Player
        ref={player as never}
        controls
        src={mediaUrl}
        style={{ width: "100%", maxHeight: 420 }}
      />
      {notice && <p role="status" data-testid="notice">{notice}</p>}

      <nav aria-label="课程笔记标签">
        <button onClick={() => setTab("overview")}>概览</button>
        <button onClick={() => setTab("bilingual")}>双语对照</button>
        <button onClick={() => setTab("translation")}>译文全文</button>
        <button onClick={() => setTab("glossary")}>术语表</button>
      </nav>

      <details>
        <summary>导出</summary>
        <label>
          字幕格式
          <select
            aria-label="字幕格式"
            value={subFormat}
            onChange={(e) => setSubFormat(e.target.value as SubtitleFormat)}
          >
            <option value="srt">SRT</option>
            <option value="vtt">VTT</option>
          </select>
        </label>
        <label>
          语言
          <select
            aria-label="导出语言"
            value={exportLang}
            onChange={(e) => setExportLang(e.target.value as ExportLang)}
          >
            <option value="both">双语</option>
            <option value="tgt">仅译文</option>
            <option value="src">仅原文</option>
          </select>
        </label>
        <button onClick={() => void exportFile(subFormat)}>导出字幕</button>
        <button onClick={() => void exportFile("docx")}>DOCX</button>
        <button onClick={() => void exportFile("md")}>Markdown</button>
        <button onClick={() => void exportFile("txt", "src")}>TXT 原文</button>
        {exportError && <p role="alert" data-testid="export-error">{exportError}</p>}
      </details>

      {job.status === "done" && (
        <details data-testid="extend-panel">
          <summary>追加范围/深度</summary>
          <label>
            深度
            <select
              aria-label="追加深度"
              value={extendDepth}
              onChange={(e) => setExtendDepth(e.target.value as MediaJobDepth)}
            >
              <option value="outline">大纲</option>
              <option value="translate">翻译</option>
              <option value="full">完整</option>
            </select>
          </label>
          <label>
            处理到（秒，留空=不变）
            <input aria-label="追加结束秒数" ref={extendToRef} defaultValue="" inputMode="numeric" />
          </label>
          <button disabled={busy} onClick={askScopeDepth}>获取报价</button>
        </details>
      )}

      {pending && (
        <section role="dialog" aria-label="确认扣费">
          <p>
            {pending.label}：<span data-testid="quote-text">{formatQuote(pending.quote)}</span>
          </p>
          <button disabled={busy} onClick={() => void confirmExtend()}>确认并扣费</button>
          <button onClick={() => setPending(null)}>取消</button>
        </section>
      )}
      {actionError && <p role="alert" data-testid="action-error">{actionError}</p>}

      <button onClick={() => window.location.assign(`/chat?mediaJobId=${encodeURIComponent(id)}`)}>
        把笔记挂进对话
      </button>

      {excludedSegments.length > 0 && (
        <details>
          <summary>排除的片段</summary>
          <p>灰色片段为排除内容。</p>
          <ul>
            {excludedSegments.map((s) => (
              <li key={s.id} data-segment-id={s.id}>
                <span>{s.text}</span> — 已排除 {restoreBtn(s.id)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {tab === "overview" && <LectureOverview result={result} onSeek={(sec) => void seek(sec)} />}
      {tab === "bilingual" && (
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>原文</th>
              <th>译文</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {result.segments.map((s) => (
              <tr key={s.id} data-row-id={s.id}>
                <td>{timeBtn(s.startSec)}</td>
                <td>{s.text}</td>
                <td>{s.translation}</td>
                <td>{s.excluded ? restoreBtn(s.id) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === "translation" && (
        <section>
          {result.segments
            .filter((s) => !s.excluded)
            .map((s) => (
              <p key={s.id}>
                {timeBtn(s.startSec)} {s.translation}
              </p>
            ))}
        </section>
      )}
      {tab === "glossary" && (
        <ul>
          {result.glossary.map((t, i) => (
            <li key={i}>
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
