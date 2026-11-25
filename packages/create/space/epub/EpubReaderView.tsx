// create/space/epub/EpubReaderView.tsx
//
// 空间内 EPUB 阅读器：可嵌入主区域的阅读视图（满占容器高度，无 Modal 遮罩）。
// 由 FilePage 在 /space/:spaceId/file-... 主区域页里渲染；字节由 FilePage 已取到的
// object URL 提供，这里只负责 解析 → 按章渲染进零权限 sandbox iframe → 进度 / 外观偏好 / AI 上下文。
//
// 进度精度是「章级」：宿主页 CSP 没有 unsafe-inline，srcdoc 继承它，章节里的桥接脚本会被拦；
// 我们不放宽整站 CSP，也不给 allow-scripts / allow-same-origin，所以不再依赖 iframe 上报。
// 章节由父组件控制（上一章/下一章/目录/键盘），进度只存章节序号。
import "./EpubReaderView.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuChevronLeft,
  LuChevronRight,
  LuList,
  LuTriangleAlert,
  LuTypeOutline,
} from "react-icons/lu";
import { useAppDispatch } from "app/store";
import { useUserId } from "identity";
import { useIsDark } from "app/theme";
import { readAndWait, write } from "database/dbSlice";
import {
  EPUB_READER_SANDBOX,
  EpubError,
  buildChapterDocument,
  buildEpubAssistantContext,
  buildTocView,
  computeChapterPercent,
  getChapterTitle,
  parseEpub,
  resolveEpubTheme,
  type EpubBook,
  type EpubFontFamily,
  type EpubFontSize,
  type EpubThemePreference,
} from "./epubParser";
import {
  buildEpubProgressKey,
  buildEpubProgressRecord,
  loadEpubProgressRecord,
  type EpubProgress,
} from "./epubProgress";
import {
  DEFAULT_EPUB_READER_PREFERENCES,
  EPUB_FONT_SIZE_STEPS,
  buildEpubReaderPreferenceKey,
  buildEpubReaderPreferenceRecord,
  loadEpubReaderPreferences,
  type EpubReaderPreferences,
} from "./epubPreferences";
import { resolveChapterKeyTarget } from "./epubKeyboard";
import { clearEpubAssistantContext, publishEpubAssistantContext } from "./epubAssistantStore";

const PROGRESS_SAVE_DELAY_MS = 500;
/** 宽屏默认展开目录抽屉；窄屏默认收起，选中章节后自动收起。 */
const WIDE_VIEWPORT_PX = 900;

export interface EpubReaderViewProps {
  contentKey: string;
  title: string;
  /** FilePage 已读到的文件字节的 object URL。 */
  fileUrl: string;
  /** 顶栏右侧插槽（FilePage 的对象动作：文件助手 / 详情等）。 */
  trailing?: React.ReactNode;
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
      preferences: EpubReaderPreferences;
      preferencesRecord: { createdAt: number } | null;
    };

const isNarrowViewport = (): boolean =>
  typeof window !== "undefined" && window.innerWidth < WIDE_VIEWPORT_PX;

const EpubReaderView: React.FC<EpubReaderViewProps> = ({ contentKey, title, fileUrl, trailing }) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const userId = useUserId();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  // 取字节（FilePage 的 object URL）+ 解析 + 读回上次进度与外观偏好。
  useEffect(() => {
    let active = true;
    setLoad({ status: "loading" });
    const readRecord = async (key: string): Promise<unknown> => {
      try {
        return await dispatch(readAndWait(key)).unwrap();
      } catch {
        return null; // 没有记录就用默认值
      }
    };
    const run = async () => {
      let bytes: Uint8Array;
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        bytes = new Uint8Array(await response.arrayBuffer());
      } catch {
        if (active) setLoad({ status: "error", code: "fetch" });
        return;
      }
      let book: EpubBook;
      try {
        book = parseEpub(bytes);
      } catch (error) {
        if (active) {
          setLoad({
            status: "error",
            code: error instanceof EpubError ? error.code : "invalid_zip",
          });
        }
        return;
      }
      let start: EpubProgress = { chapterIndex: 0 };
      let previousRecord: { createdAt: number } | null = null;
      let preferences = DEFAULT_EPUB_READER_PREFERENCES;
      let preferencesRecord: { createdAt: number } | null = null;
      if (userId) {
        const [progressRecord, prefsRecord] = await Promise.all([
          readRecord(buildEpubProgressKey(userId, contentKey)),
          readRecord(buildEpubReaderPreferenceKey(userId)),
        ]);
        const loaded = loadEpubProgressRecord(progressRecord, book.spine.length);
        if (loaded) {
          start = loaded.progress;
          previousRecord = loaded.previousRecord;
        }
        const prefs = loadEpubReaderPreferences(prefsRecord);
        preferences = prefs.preferences;
        preferencesRecord = prefs.previousRecord;
      }
      if (active) {
        setLoad({ status: "ready", book, start, previousRecord, preferences, preferencesRecord });
      }
    };
    void run().catch(() => {
      if (active) setLoad({ status: "error", code: "fetch" });
    });
    return () => {
      active = false;
    };
  }, [contentKey, dispatch, fileUrl, userId]);

  return (
    <div className="epub-reader" data-testid="epub-reader" aria-label={t("epub_reader_label", { name: title })}>
      {load.status === "loading" && (
        <>
          <div className="epub-reader__bar">
            <span className="epub-reader__chapter">{title}</span>
            {trailing}
          </div>
          <div className="epub-reader__state" role="status">
            {t("epub_loading")}
          </div>
        </>
      )}
      {load.status === "error" && (
        <>
          <div className="epub-reader__bar">
            <span className="epub-reader__chapter">{title}</span>
            {trailing}
          </div>
          <div className="epub-reader__state epub-reader__state--error" role="alert">
            <LuTriangleAlert size={28} aria-hidden="true" />
            <strong>{t("epub_error_title")}</strong>
            <span>{t(`epub_error_${load.code.replace(/-/g, "_")}`)}</span>
          </div>
        </>
      )}
      {load.status === "ready" && (
        <EpubReaderBody
          key={contentKey}
          book={load.book}
          start={load.start}
          initialRecord={load.previousRecord}
          initialPreferences={load.preferences}
          initialPreferencesRecord={load.preferencesRecord}
          contentKey={contentKey}
          title={title}
          userId={userId}
          trailing={trailing}
        />
      )}
    </div>
  );
};

interface EpubReaderBodyProps {
  book: EpubBook;
  start: EpubProgress;
  initialRecord: { createdAt: number } | null;
  initialPreferences: EpubReaderPreferences;
  initialPreferencesRecord: { createdAt: number } | null;
  contentKey: string;
  title: string;
  userId: string | undefined;
  trailing?: React.ReactNode;
}

const THEME_OPTIONS: Array<{ value: EpubThemePreference; labelKey: string }> = [
  { value: "system", labelKey: "epub_theme_system" },
  { value: "light", labelKey: "epub_theme_light" },
  { value: "paper", labelKey: "epub_theme_paper" },
  { value: "dark", labelKey: "epub_theme_dark" },
];
const FONT_FAMILY_OPTIONS: Array<{ value: EpubFontFamily; labelKey: string }> = [
  { value: "sans", labelKey: "epub_font_sans" },
  { value: "serif", labelKey: "epub_font_serif" },
];
const FONT_SIZE_LABEL_KEYS: Record<EpubFontSize, string> = {
  sm: "epub_size_sm",
  md: "epub_size_md",
  lg: "epub_size_lg",
  xl: "epub_size_xl",
};

const EpubReaderBody: React.FC<EpubReaderBodyProps> = ({
  book,
  start,
  initialRecord,
  initialPreferences,
  initialPreferencesRecord,
  contentKey,
  title,
  userId,
  trailing,
}) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const systemIsDark = useIsDark();
  const [index, setIndex] = useState(start.chapterIndex);
  const [tocOpen, setTocOpen] = useState(() => !isNarrowViewport());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(initialPreferences);

  const total = book.spine.length;
  const theme = resolveEpubTheme(preferences.theme, systemIsDark);

  // 渲染失败（章节缺失 / 超限）落成明确错误态，而不是让异常冒到 React 白屏。
  const rendered = useMemo<{ html: string } | { error: string }>(() => {
    try {
      return {
        html: buildChapterDocument(book, index, {
          appearance: { theme, fontSize: preferences.fontSize, fontFamily: preferences.fontFamily },
        }),
      };
    } catch (error) {
      return { error: error instanceof EpubError ? error.code : "missing-chapter" };
    }
  }, [book, index, theme, preferences.fontSize, preferences.fontFamily]);

  const tocView = useMemo(
    () => buildTocView(book, (n) => t("epub_chapter_fallback", { n })),
    [book, t]
  );

  const chapterError = "error" in rendered ? rendered.error : null;

  // 把「书名 + 目录 + 当前章标题 + 当前章正文」发布给右侧文件助手（ObjectAssistantPanel 读取）。
  // 章节渲染失败或当前章无效时，不调用提取并直接清空该文件的助手上下文。
  useEffect(() => {
    if (chapterError || !book.spine[index]) {
      clearEpubAssistantContext(contentKey);
      return;
    }
    publishEpubAssistantContext(contentKey, buildEpubAssistantContext(book, index));
    return () => clearEpubAssistantContext(contentKey);
  }, [book, chapterError, contentKey, index]);

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

  // 键盘翻章：仅绑定在阅读器根容器上，避免焦点在左侧边栏或右侧助手栏时误触翻章。
  // 注意：焦点在沙箱 iframe 内时键盘事件不会冒泡到宿主（无脚本、跨源），点一下阅读器外壳即可恢复。
  const onShellKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const target = resolveChapterKeyTarget(event, index, total);
      if (target === null) return;
      event.preventDefault();
      goTo(target);
    },
    [goTo, index, total]
  );

  // 外观偏好：改动即写入用户偏好（所有书共用）。
  const preferencesRecord = useRef<{ createdAt?: unknown } | null>(initialPreferencesRecord);
  const updatePreferences = useCallback(
    (patch: Partial<EpubReaderPreferences>) => {
      setPreferences((current) => {
        const next = { ...current, ...patch };
        if (userId) {
          const record = buildEpubReaderPreferenceRecord({
            userId,
            preferences: next,
            previousRecord: preferencesRecord.current,
          });
          preferencesRecord.current = record;
          void dispatch(write({ data: record, customKey: buildEpubReaderPreferenceKey(userId) }))
            .unwrap()
            .catch((error: unknown) => console.warn("[epub-reader] failed to save preferences", error));
        }
        return next;
      });
    },
    [dispatch, userId]
  );

  const chapterTitle = getChapterTitle(book, index) ?? t("epub_chapter_fallback", { n: index + 1 });
  const percent = computeChapterPercent(index, total);
  const sizeStep = EPUB_FONT_SIZE_STEPS.indexOf(preferences.fontSize);

  return (
    <div
      className={`epub-reader__shell epub-reader--${theme}`}
      tabIndex={0}
      onKeyDown={onShellKeyDown}
    >
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
        <span className="epub-reader__chapter" title={`${title} · ${chapterTitle}`}>
          {chapterTitle}
        </span>
        <span className="epub-reader__progress" aria-label={t("epub_progress_label")}>
          {t("epub_chapter_of", { current: index + 1, total })} · {percent}%
        </span>
        <div className="epub-reader__settingsWrap">
          <button
            type="button"
            className="epub-reader__iconBtn"
            aria-label={t("epub_settings")}
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <LuTypeOutline size={18} aria-hidden="true" />
          </button>
          {settingsOpen && (
            <div className="epub-reader__settings" role="group" aria-label={t("epub_settings")}>
              <div className="epub-reader__settingsRow">
                <span>{t("epub_font_size")}</span>
                <div className="epub-reader__segmented">
                  <button
                    type="button"
                    className="epub-reader__segBtn"
                    aria-label={t("epub_font_smaller")}
                    disabled={sizeStep <= 0}
                    onClick={() => updatePreferences({ fontSize: EPUB_FONT_SIZE_STEPS[sizeStep - 1] })}
                  >
                    A−
                  </button>
                  <span className="epub-reader__segLabel">
                    {t(FONT_SIZE_LABEL_KEYS[preferences.fontSize])}
                  </span>
                  <button
                    type="button"
                    className="epub-reader__segBtn"
                    aria-label={t("epub_font_larger")}
                    disabled={sizeStep >= EPUB_FONT_SIZE_STEPS.length - 1}
                    onClick={() => updatePreferences({ fontSize: EPUB_FONT_SIZE_STEPS[sizeStep + 1] })}
                  >
                    A+
                  </button>
                </div>
              </div>
              <div className="epub-reader__settingsRow">
                <span>{t("epub_font_family")}</span>
                <div className="epub-reader__segmented">
                  {FONT_FAMILY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        preferences.fontFamily === option.value
                          ? "epub-reader__segBtn epub-reader__segBtn--active"
                          : "epub-reader__segBtn"
                      }
                      aria-pressed={preferences.fontFamily === option.value}
                      onClick={() => updatePreferences({ fontFamily: option.value })}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="epub-reader__settingsRow">
                <span>{t("epub_theme")}</span>
                <div className="epub-reader__segmented">
                  {THEME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        preferences.theme === option.value
                          ? "epub-reader__segBtn epub-reader__segBtn--active"
                          : "epub-reader__segBtn"
                      }
                      aria-pressed={preferences.theme === option.value}
                      onClick={() => updatePreferences({ theme: option.value })}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {trailing}
      </div>
      <div className="epub-reader__main">
        {tocOpen && (
          <nav className="epub-reader__toc" aria-label={t("epub_toc")}>
            {tocView.map((entry) => (
              <button
                key={entry.spineIndex}
                type="button"
                style={{ paddingInlineStart: 10 + Math.min(entry.level, 4) * 14 }}
                aria-current={entry.spineIndex === index ? "true" : undefined}
                className={
                  entry.spineIndex === index
                    ? "epub-reader__tocItem epub-reader__tocItem--active"
                    : "epub-reader__tocItem"
                }
                onClick={() => {
                  goTo(entry.spineIndex);
                  if (isNarrowViewport()) setTocOpen(false);
                }}
              >
                {entry.title}
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
    </div>
  );
};

export default EpubReaderView;
