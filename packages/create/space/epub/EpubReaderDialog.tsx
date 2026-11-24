// create/space/epub/EpubReaderDialog.tsx
//
// 空间内 EPUB 阅读器 v1：取字节 → parseEpub → 章节渲染进零脚本 sandbox iframe。
//
// 进度精度是「章级」：宿主页 CSP 没有 unsafe-inline，srcdoc 继承它，章节里的内联桥接脚本
// 会被拦；我们不放宽整站 CSP，也不加 allow-same-origin，所以不再依赖 iframe 上报。
// 章节由父组件控制（上一章/下一章/目录），进度只存章节序号。
import "./EpubReaderDialog.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "react-redux";
import { useTranslation } from "react-i18next";
import { LuChevronLeft, LuChevronRight, LuList, LuTriangleAlert } from "react-icons/lu";
import { useAppDispatch, useAppSelector } from "app/store";
import { useUserId } from "identity";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import { readAndWait, readFileContent, write } from "database/dbSlice";
import { noloReadFileRequest } from "database/requests";
import { Dialog } from "render/web/ui/modal/Dialog";
import {
  EPUB_READER_SANDBOX,
  EpubError,
  buildChapterDocument,
  computeChapterPercent,
  getChapterTitle,
  parseEpub,
  type EpubBook,
} from "./epubParser";
import {
  buildEpubProgressKey,
  buildEpubProgressRecord,
  loadEpubProgressRecord,
  type EpubProgress,
} from "./epubProgress";

const PROGRESS_SAVE_DELAY_MS = 500;

interface EpubReaderDialogProps {
  contentKey: string;
  title: string;
  onClose: () => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; code: string }
  | {
      status: "ready";
      book: EpubBook;
      start: EpubProgress;
      /** 已有进度记录的 createdAt，保存时回传，避免首次保存覆盖它。 */
      previousRecord: { createdAt: number } | null;
    };

const EpubReaderDialog: React.FC<EpubReaderDialogProps> = ({ contentKey, title, onClose }) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const store = useStore();
  const userId = useUserId();
  const currentServer = useAppSelector(selectRuntimeCurrentServer);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  // 1) 取字节 + 解析 + 读回上次进度。本地缓存优先；缺失再带登录态向服务器取。
  useEffect(() => {
    let active = true;
    setLoad({ status: "loading" });
    const run = async () => {
      let blob: Blob | null = null;
      try {
        blob = (await dispatch(readFileContent({ fileId: contentKey, useServerFallback: false })).unwrap()).blob;
      } catch {
        /* 本地没有，走服务器 */
      }
      if (!blob && currentServer) {
        const result = await noloReadFileRequest(
          currentServer,
          encodeURIComponent(contentKey),
          { type: "content" },
          store.getState()
        );
        if (result.success && result.data instanceof Blob) blob = result.data;
      }
      if (!active) return;
      if (!blob) {
        setLoad({ status: "error", code: "fetch" });
        return;
      }
      let book: EpubBook;
      try {
        book = parseEpub(new Uint8Array(await blob.arrayBuffer()));
      } catch (error) {
        if (active) {
          setLoad({ status: "error", code: error instanceof EpubError ? error.code : "invalid-zip" });
        }
        return;
      }
      let start: EpubProgress = { chapterIndex: 0 };
      let previousRecord: { createdAt: number } | null = null;
      if (userId) {
        try {
          const record = await dispatch(readAndWait(buildEpubProgressKey(userId, contentKey))).unwrap();
          const loaded = loadEpubProgressRecord(record, book.spine.length);
          if (loaded) {
            start = loaded.progress;
            previousRecord = loaded.previousRecord;
          }
        } catch {
          /* 没有进度记录就从头读 */
        }
      }
      if (active) setLoad({ status: "ready", book, start, previousRecord });
    };
    void run().catch(() => {
      if (active) setLoad({ status: "error", code: "fetch" });
    });
    return () => {
      active = false;
    };
  }, [contentKey, currentServer, dispatch, store, userId]);

  const errorMessage = (code: string): string => t(`epub_error_${code.replace(/-/g, "_")}`);

  return (
    <Dialog
      isOpen
      onClose={onClose}
      size="xlarge"
      noPadding
      title={title}
      aria-label={t("epub_reader_label", { name: title })}
    >
      <div className="epub-reader">
        {load.status === "loading" && (
          <div className="epub-reader__state" role="status">
            {t("epub_loading")}
          </div>
        )}
        {load.status === "error" && (
          <div className="epub-reader__state epub-reader__state--error" role="alert">
            <LuTriangleAlert size={28} aria-hidden="true" />
            <strong>{t("epub_error_title")}</strong>
            <span>{errorMessage(load.code)}</span>
          </div>
        )}
        {load.status === "ready" && (
          <EpubReaderBody
            key={contentKey}
            book={load.book}
            start={load.start}
            initialRecord={load.previousRecord}
            contentKey={contentKey}
            userId={userId}
          />
        )}
      </div>
    </Dialog>
  );
};

interface EpubReaderBodyProps {
  book: EpubBook;
  start: EpubProgress;
  initialRecord: { createdAt: number } | null;
  contentKey: string;
  userId: string | undefined;
}

const EpubReaderBody: React.FC<EpubReaderBodyProps> = ({
  book,
  start,
  initialRecord,
  contentKey,
  userId,
}) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const [index, setIndex] = useState(start.chapterIndex);
  const [tocOpen, setTocOpen] = useState(false);

  const total = book.spine.length;

  // 渲染失败（章节缺失 / 超限）落成明确错误态，而不是让异常冒到 React 白屏。
  const rendered = useMemo<{ html: string } | { error: string }>(() => {
    try {
      return { html: buildChapterDocument(book, index) };
    } catch (error) {
      return { error: error instanceof EpubError ? error.code : "missing-chapter" };
    }
  }, [book, index]);

  // 进度保存：章节切换后防抖写入，卸载时补写；记录里只有 chapterIndex。
  const latestIndex = useRef(start.chapterIndex);
  const previousRecord = useRef<{ createdAt?: unknown } | null>(initialRecord);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const flushProgress = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (!userId || !dirty.current) return;
    dirty.current = false;
    const record = buildEpubProgressRecord({
      userId,
      contentKey,
      progress: { chapterIndex: latestIndex.current },
      previousRecord: previousRecord.current,
    });
    previousRecord.current = record;
    void dispatch(write({ data: record, customKey: buildEpubProgressKey(userId, contentKey) }))
      .unwrap()
      .catch((error: unknown) => {
        dirty.current = true;
        console.warn("[epub-reader] failed to save progress", error);
      });
  }, [contentKey, dispatch, userId]);

  useEffect(() => flushProgress, [flushProgress]);

  const goTo = useCallback(
    (target: number) => {
      if (target < 0 || target >= total) return;
      setIndex(target);
      latestIndex.current = target;
      dirty.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushProgress, PROGRESS_SAVE_DELAY_MS);
    },
    [flushProgress, total]
  );

  const chapterTitle = getChapterTitle(book, index) ?? t("epub_chapter_fallback", { n: index + 1 });
  const percent = computeChapterPercent(index, total);

  return (
    <>
      <div className="epub-reader__bar">
        <button
          type="button"
          className="epub-reader__iconBtn"
          aria-label={t("epub_toc")}
          aria-expanded={tocOpen}
          onClick={() => setTocOpen((open) => !open)}
        >
          <LuList size={18} aria-hidden="true" />
        </button>
        <span className="epub-reader__chapter" title={chapterTitle}>
          {chapterTitle}
        </span>
        <span className="epub-reader__progress" aria-label={t("epub_progress_label")}>
          {t("epub_chapter_of", { current: index + 1, total })} · {percent}%
        </span>
      </div>
      <div className="epub-reader__main">
        {tocOpen && (
          <nav className="epub-reader__toc" aria-label={t("epub_toc")}>
            {(book.toc.length > 0
              ? book.toc
              : book.spine.map((item, position) => ({
                  title: t("epub_chapter_fallback", { n: position + 1 }),
                  path: item.path,
                  fragment: "",
                  spineIndex: position,
                }))
            ).map((entry, position) => (
              <button
                key={`${entry.path}#${entry.fragment}-${position}`}
                type="button"
                disabled={entry.spineIndex < 0}
                className={
                  entry.spineIndex === index
                    ? "epub-reader__tocItem epub-reader__tocItem--active"
                    : "epub-reader__tocItem"
                }
                onClick={() => {
                  goTo(entry.spineIndex);
                  setTocOpen(false);
                }}
              >
                {entry.title || t("epub_chapter_fallback", { n: entry.spineIndex + 1 })}
              </button>
            ))}
          </nav>
        )}
        <div className="epub-reader__page">
          {"error" in rendered ? (
            <div className="epub-reader__state epub-reader__state--error" role="alert">
              <LuTriangleAlert size={28} aria-hidden="true" />
              <strong>{t("epub_error_title")}</strong>
              <span>{t(`epub_error_${rendered.error.replace(/-/g, "_")}`)}</span>
            </div>
          ) : (
            <iframe
              key={index}
              className="epub-reader__frame"
              title={chapterTitle}
              sandbox={EPUB_READER_SANDBOX}
              srcDoc={rendered.html}
            />
          )}
        </div>
      </div>
      <div className="epub-reader__footer">
        <button
          type="button"
          className="epub-reader__navBtn"
          disabled={index <= 0}
          onClick={() => goTo(index - 1)}
        >
          <LuChevronLeft size={16} aria-hidden="true" />
          {t("epub_prev")}
        </button>
        <span className="epub-reader__hint">{t("epub_links_hint")}</span>
        <button
          type="button"
          className="epub-reader__navBtn"
          disabled={index >= total - 1}
          onClick={() => goTo(index + 1)}
        >
          {t("epub_next")}
          <LuChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </>
  );
};

export default EpubReaderDialog;
