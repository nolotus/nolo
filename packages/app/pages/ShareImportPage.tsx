import "./ShareImportPage.css";
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useParams } from "app/routing";
import Avatar from "render/web/ui/Avatar";
import { LuLayoutDashboard, LuTrash2 } from "react-icons/lu";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { useToken, useUserId } from "identity";
import { isRecord } from "core/isRecord";
import { read as dbRead, remove, selectById } from "database/dbSlice";
import { shareKey } from "share/keys";
import { DataType } from "create/types";
import { isSystemAdmin } from "core/init";
import {
  formatShareTime,
  extractAgentInfo,
  normalizeAuthorName,
  toPublicAgentKey,
  toSafeTimestamp,
} from "share/helpers";
import {
  buildShareReadServerCandidates,
  fetchSharedRecordFromServers,
  normalizeShareReadServerOrigin,
} from "share/shareReadResolver";
import { getShareTypeLabel } from "share/types";
import type { SharedObject } from "share/types";
import PageLoading from "render/web/ui/PageLoading";
import ShareDialogPreview from "./share/ShareDialogPreview";
import { toast } from "app/utils/toast"
import type { TableMeta } from "render/table/types";

// ─────────────────────────────────────────────────────────────────────

const ShareDocView = lazy(() => import("./share/ShareDocView"));
const ShareDialogRichView = lazy(() => import("./share/ShareDialogRichView"));

const AppShareLanding: React.FC<{ shared: SharedObject }> = ({ shared }) => {
  const url: string | undefined = (shared.data as any)?.url;
  const title = shared.meta?.title || "应用";
  const description = shared.meta?.description || "";
  const coverImage: string | undefined = shared.meta?.coverImage || (shared.data as any)?.coverImage;
  const authorName = normalizeAuthorName(shared.meta?.authorName);
  const authorAvatar: string | undefined = shared.meta?.authorAvatar;
  const shareDate =
    toSafeTimestamp(shared.meta?.createdAt) ||
    toSafeTimestamp(shared.updatedAt) ||
    toSafeTimestamp(shared.createdAt);

  useEffect(() => {
    if (url) {
      const timer = setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 1200);
      return () => clearTimeout(timer);
    }
  }, [url]);

  return (
    <div className="AppShareLanding-root">
      <div className="AppShareLanding-card">
        {coverImage ? (
          <img src={coverImage} alt={title} className="AppShareLanding-cover" />
        ) : (
          <div className="AppShareLanding-coverFallback" aria-hidden="true">
            <LuLayoutDashboard size={48} aria-hidden="true" />
          </div>
        )}
        <div className="AppShareLanding-body">
          <div className="AppShareLanding-meta">
            {authorName && (
              <div className="AppShareLanding-author">
                <Avatar name={authorName} src={authorAvatar} size="small" />
                <span className="AppShareLanding-authorName">{authorName}</span>
                <span className="AppShareLanding-date">{formatShareTime(shareDate)}</span>
              </div>
            )}
          </div>
          <h1 className="AppShareLanding-title">{title}</h1>
          {description && <p className="AppShareLanding-desc">{description}</p>}
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="AppShareLanding-openBtn"
            >
              打开应用
            </a>
          ) : (
            <p className="AppShareLanding-noUrl">该应用分享缺少访问地址。</p>
          )}
          {url && <p className="AppShareLanding-hint">正在自动打开…</p>}
        </div>
      </div>


    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────

const isValidSharedObject = (value: unknown): value is SharedObject => {
  return isRecord(value) && !!value.type;
};

const isPreviewOnlySharedObject = (value: unknown): boolean =>
  isRecord(value) && value.__ssrPreviewOnly === true;

const readLocalShareByKey =
  (dbKey: string) =>
  async (_dispatch: any, _getState: any, extra: any): Promise<SharedObject | null> => {
    const db = extra?.db;
    if (!db || typeof db.get !== "function") return null;
    try {
      const localData = await db.get(dbKey);
      return isValidSharedObject(localData) ? localData : null;
    } catch {
      return null;
    }
  };

const isLocalOnlyOrigin = (value: unknown): boolean => {
  const origin = normalizeShareReadServerOrigin(value);
  if (!origin) return false;
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
};

const tryReadFromFallbackServers = async (
  dbKey: string,
  candidates: string[],
  token?: string | null
): Promise<SharedObject | null> => {
  const result = await fetchSharedRecordFromServers({
    dbKey,
    servers: candidates,
    token,
  });
  return result && isValidSharedObject(result.record) ? (result.record as SharedObject) : null;
};

interface SharedTablePreview {
  tableMeta: TableMeta;
  rows: Array<Record<string, unknown>>;
}

const isSharedTablePreview = (value: unknown): value is SharedTablePreview => {
  if (!value || typeof value !== "object") return false;
  const preview = value as Record<string, unknown>;
  return !!preview.tableMeta && Array.isArray(preview.rows);
};

const getTablePreviewFromShared = (shared: SharedObject | null): SharedTablePreview | null => {
  const preview = shared?.data?.tablePreview;
  return isSharedTablePreview(preview) ? preview : null;
};

const readSharedTablePreviewFromServers = async (
  token: string,
  candidates: string[]
): Promise<SharedTablePreview | null> => {
  for (const server of candidates) {
    try {
      const response = await fetch(`${server}/api/v1/share/${encodeURIComponent(token)}/table`, {
        cache: "no-store",
      });
      if (response.status !== 200) continue;
      const payload = await response.json();
      if (isSharedTablePreview(payload)) return payload;
    } catch {
      // try next server
    }
  }
  return null;
};

const ShareImportPage: React.FC = () => {
  const { token } = useParams<"token">();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const systemBuiltinSkills = useAppSelector((state) => (state as any).settings?.systemBuiltinSkills);
  const conversationTodoEnabled = systemBuiltinSkills?.["conversation-todo"] !== false;
  const currentToken = useToken();
  const currentUserId = useUserId();
  const { currentServer, syncServers, localRuntimeOrigin } =
    useAppSelector(selectRuntimeSnapshot);

  const dbKey = token ? shareKey.create(token) : "";
  const ssrShared = useAppSelector((state) =>
    dbKey ? (selectById(state, dbKey) as SharedObject | undefined) : undefined
  );

  const [shared, setShared] = useState<SharedObject | null>(ssrShared ?? null);
  const [loading, setLoading] = useState(!ssrShared);
  const [error, setError] = useState<string | null>(null);
  const [retrySeed, setRetrySeed] = useState(0);
  const [canUseRichDialog, setCanUseRichDialog] = useState(false);
  const [isDeletingShare, setIsDeletingShare] = useState(false);
  // Preview + error share one bag so success/clear paths are a single update.
  const [tableView, setTableView] = useState<{
    preview: SharedTablePreview | null;
    error: string | null;
  }>({
    preview: getTablePreviewFromShared(ssrShared ?? null),
    error: null,
  });
  const tablePreview = tableView.preview;
  const tablePreviewError = tableView.error;
  const [tablePreviewLoading, setTablePreviewLoading] = useState(false);

  const serverCandidates = useMemo(
    () =>
      buildShareReadServerCandidates({
        currentOrigin: localRuntimeOrigin,
        currentServer,
        syncServers,
      }),
    [localRuntimeOrigin, currentServer, syncServers]
  );
  const serverCandidatesKey = serverCandidates.join("\n");

  const normalizeShareError = (message: string): string => {
    if (message.includes("Failed to fetch data for key")) {
      return "无法读取该分享，可能是链接无效、未发布成功，或内容已被删除。";
    }
    return message || "加载分享内容失败。";
  };

  useEffect(() => {
    const shouldHydrateFullShare = isPreviewOnlySharedObject(ssrShared);
    if (ssrShared && !shouldHydrateFullShare && retrySeed === 0) return;

    let cancelled = false;
    const loadSharedData = async () => {
      if (!token) {
        setError("Invalid share token.");
        setLoading(false);
        return;
      }
      if (!ssrShared && !shouldHydrateFullShare && retrySeed === 0) {
        console.info("[share-page] SSR share miss, loading client-side", {
          dbKey,
          serverCandidates,
        });
      }
      if (!shouldHydrateFullShare) {
        setLoading(true);
      }
      setError(null);

      try {
        const remoteFirst = await tryReadFromFallbackServers(dbKey, serverCandidates, currentToken);
        if (cancelled) return;
        if (remoteFirst) {
          if (!ssrShared && !shouldHydrateFullShare && retrySeed === 0) {
            console.info("[share-page] resolved share from remote fallback", {
              dbKey,
              serverCandidates,
            });
          }
          setShared(remoteFirst);
          void dispatch(
            dbRead({ dbKey, preferredServerOrigin: localRuntimeOrigin ?? currentServer })
          ).catch(() => null);
          return;
        }

        const result = await dispatch(
          dbRead({ dbKey, preferredServerOrigin: localRuntimeOrigin ?? currentServer })
        ).unwrap();
        if (cancelled) return;
        if (!isValidSharedObject(result)) {
          setError("Share not found or invalid.");
          return;
        }
        setShared(result);
      } catch (e: any) {
        if (cancelled) return;
        try {
          const localFallback = await (dispatch as any)(readLocalShareByKey(dbKey));
          if (!cancelled && localFallback) { setShared(localFallback); return; }
          const remoteFallback = await tryReadFromFallbackServers(dbKey, serverCandidates, currentToken);
          if (!cancelled && remoteFallback) { setShared(remoteFallback); return; }
        } catch (fallbackError: any) {
          if (!cancelled) setError(normalizeShareError(String(fallbackError?.message || "")));
          return;
        }
        setError(normalizeShareError(String(e?.message || "")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSharedData();
    return () => { cancelled = true; };
  }, [currentServer, currentToken, dbKey, dispatch, localRuntimeOrigin, retrySeed, serverCandidates, ssrShared, token]);

  useEffect(() => {
    setCanUseRichDialog(
      shared?.type === DataType.DIALOG && !isPreviewOnlySharedObject(shared)
    );
  }, [shared]);

  useEffect(() => {
    const nextPreview = getTablePreviewFromShared(shared);
    if (nextPreview) {
      setTableView({ preview: nextPreview, error: null });
    }
  }, [shared]);

  useEffect(() => {
    if (!token || !shared || shared.type !== DataType.TABLE) return;
    const liveMode =
      (shared.data as unknown as Record<string, unknown> | undefined)?.mode === "live" ||
      (shared.meta as unknown as Record<string, unknown> | undefined)?.mode === "live";
    if (!liveMode) return;
    const hasInitialTablePreview = Boolean(getTablePreviewFromShared(shared));

    const originServer = normalizeShareReadServerOrigin(
      (shared.data as unknown as Record<string, unknown> | undefined)?.originServer ??
        (shared.meta as unknown as Record<string, unknown> | undefined)?.originServer
    );
    const currentOrigin =
      typeof window === "undefined" ? null : normalizeShareReadServerOrigin(window.location.origin);

    // Rebuild from stable key so the effect depends on content, not array identity.
    const tableServers = buildShareReadServerCandidates({
      currentOrigin,
      currentServer,
      syncServers: serverCandidatesKey ? serverCandidatesKey.split("\n") : [],
      originServer,
    });

    let cancelled = false;
    let intervalId: number | null = null;
    let latestRequestId = 0;

    const clearRefreshInterval = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const loadTablePreview = async () => {
      const requestId = ++latestRequestId;
      setTablePreviewLoading(true);
      const preview = await readSharedTablePreviewFromServers(token, tableServers);
      if (cancelled || requestId !== latestRequestId) return;
      if (preview) {
        setTableView({ preview, error: null });
      } else {
        setTableView((current) => ({
          preview: current.preview,
          error: "暂时无法读取表格内容。",
        }));
      }
      setTablePreviewLoading(false);
    };

    if (!hasInitialTablePreview) {
      void loadTablePreview();
    }
    const startRefreshInterval = () => {
      clearRefreshInterval();
      if (document.visibilityState !== "visible") return;
      intervalId = window.setInterval(() => {
        if (document.visibilityState !== "visible") {
          clearRefreshInterval();
          return;
        }
        void loadTablePreview();
      }, 15_000);
    };

    const handleWindowFocus = () => {
      if (document.visibilityState !== "visible") return;
      void loadTablePreview();
      startRefreshInterval();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadTablePreview();
        startRefreshInterval();
        return;
      }
      clearRefreshInterval();
    };

    if (document.visibilityState === "visible") {
      startRefreshInterval();
    }
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearRefreshInterval();
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentServer, serverCandidatesKey, shared, token]);

  const dialogMessages = useMemo<any[]>(() => {
    if (shared?.type !== DataType.DIALOG) return [];
    const d = shared.data;
    return Array.isArray(d?.messages) ? d.messages
      : Array.isArray(d?.history) ? d.history
      : [];
  }, [shared]);
  const tableColumns = useMemo(() => tablePreview?.tableMeta?.columns ?? [], [tablePreview]);
  const tableRows = useMemo(() => tablePreview?.rows ?? [], [tablePreview]);
  const tableOriginServer =
    (shared?.data as Record<string, unknown> | undefined)?.originServer ??
    (shared?.meta as Record<string, unknown> | undefined)?.originServer;
  const tableUnavailableMessage = isLocalOnlyOrigin(tableOriginServer)
    ? "这个 live table 分享来自本地开发环境，线上节点无法实时读取。请从公开节点重新分享，或改用 snapshot 分享。"
    : "此表暂无可显示的数据。";

  const title = shared?.meta?.title || "Shared Content";
  const description = shared?.meta?.description || "";
  const authorName = normalizeAuthorName(shared?.meta?.authorName);
  const authorId = shared?.meta?.authorId;
  const authorAvatar = shared?.meta?.authorAvatar;
  const inferredAgentInfo = useMemo(
    () => shared ? extractAgentInfo(shared.type, shared.data ?? {}) : {},
    [shared]
  );
  const agentName =
    shared?.meta?.sourceAgentName ||
    inferredAgentInfo.sourceAgentName ||
    "";
  const agentPath = useMemo(() => {
    const publicAgentKey = toPublicAgentKey(
      shared?.meta?.sourceAgentKey || inferredAgentInfo.sourceAgentKey
    );
    return publicAgentKey ? `/${encodeURIComponent(publicAgentKey)}` : null;
  }, [inferredAgentInfo.sourceAgentKey, shared?.meta?.sourceAgentKey]);
  const topBarTitle = title;
  const shouldShowAuthor = Boolean(authorName);
  const authorPath = authorId ? `/profile/${encodeURIComponent(authorId)}` : null;
  const shareDate =
    toSafeTimestamp(shared?.meta?.createdAt) ||
    toSafeTimestamp(shared?.updatedAt) ||
    toSafeTimestamp(shared?.createdAt);
  const canDeleteShare = Boolean(
    shared &&
    dbKey &&
    currentToken &&
    (
      (currentUserId && authorId === currentUserId) ||
      (
        shared.meta?.visibility === "community" &&
        isSystemAdmin(currentUserId)
      )
    )
  );

  const handleDeleteShare = useCallback(async () => {
    if (!dbKey || isDeletingShare) return;
    setIsDeletingShare(true);
    try {
      await (dispatch as any)(remove({ dbKey })).unwrap();
      toast.success("分享已删除");
      navigate("/life/shares", { replace: true });
    } catch (err: any) {
      toast.error(`删除失败：${err?.message || "未知错误"}`);
    } finally {
      setIsDeletingShare(false);
    }
  }, [dbKey, dispatch, isDeletingShare, navigate]);

  const handleTableWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    event.preventDefault();
    scroller.scrollLeft += event.deltaY;
  }, []);

  if (loading) {
    return <PageLoading message="正在加载分享内容..." />;
  }

  if (error || !shared) {
    return (
      <div className="ShareImportPage-root">
        <div className="ShareImportPage-errorCard">
          <h1>无法打开分享</h1>
          <p>{error || "分享内容暂不可用。"}</p>
          <div className="ShareImportPage-errorActions">
            <button
              type="button"
              className="ShareImportPage-retryBtn"
              onClick={() => setRetrySeed((seed) => seed + 1)}
            >
              重试
            </button>
            <NavLink to="/" className="ShareImportPage-homeLink">
              返回首页
            </NavLink>
          </div>
        </div>

      </div>
    );
  }

  if (shared.type === DataType.IMAGE) {
    const imageUrl = shared.data?.url || shared.meta?.coverImage;
    return (
      <div className="ShareImportPage-root">
        <header className="ShareImportPage-header">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </header>
        <div className="ShareImportPage-imageContainer">
          {imageUrl ? (
            <img src={String(imageUrl)} alt={title} className="ShareImportPage-image" />
          ) : (
            <div className="ShareImportPage-error">图片链接无效</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ShareImportPage-root">
      <header className={`ShareImportPage-topBar${shared.type === DataType.DOC ? " ShareImportPage-topBar--doc" : ""}`}>
        <div className="ShareImportPage-topBarMain">
          <div className="ShareImportPage-titleBlock">
            {shared.type === DataType.DOC ? (
              <div className="ShareImportPage-breadcrumb">
                <NavLink to="/explore" className="ShareImportPage-breadcrumbLink">发现</NavLink>
                <span className="ShareImportPage-breadcrumbSeparator">/</span>
                <span className="ShareImportPage-breadcrumbCurrent">社区分享</span>
              </div>
            ) : (
              <h1 className="ShareImportPage-pageTitle">{topBarTitle}</h1>
            )}
            {shared.type !== DataType.DOC && description && (
              <p className="ShareImportPage-pageDescription">{description}</p>
            )}
          </div>
          {agentName && (
            agentPath ? (
              <NavLink to={agentPath} className="ShareImportPage-agentCta">
                <span className="ShareImportPage-agentCtaEyebrow">相关 Agent</span>
                <span className="ShareImportPage-agentCtaTitle">与 {agentName} 对话</span>
              </NavLink>
            ) : (
              <div className="ShareImportPage-agentCard">
                <span className="ShareImportPage-agentCtaEyebrow">相关 Agent</span>
                <span className="ShareImportPage-agentCtaTitle">{agentName}</span>
              </div>
            )
          )}
        </div>
      </header>

      <div className={`ShareImportPage-metaHeader${shared.type === DataType.DOC ? " ShareImportPage-metaHeader--doc" : ""}`}>
        <div className="ShareImportPage-author">
          {shouldShowAuthor && authorPath ? (
            <NavLink to={authorPath} className="ShareImportPage-authorLink">
              <Avatar name={authorName} src={authorAvatar} size="medium" />
              <div className="ShareImportPage-authorInfo">
                <span className="ShareImportPage-authorName">{authorName}</span>
                <span className="ShareImportPage-date">{formatShareTime(shareDate)}</span>
              </div>
            </NavLink>
          ) : (
            <>
              {shouldShowAuthor && <Avatar name={authorName} src={authorAvatar} size="medium" />}
              <div className="ShareImportPage-authorInfo">
                {shouldShowAuthor && <span className="ShareImportPage-authorName">{authorName}</span>}
                <span className="ShareImportPage-date">{formatShareTime(shareDate)}</span>
              </div>
            </>
          )}
        </div>
        {canDeleteShare && (
          <button
            type="button"
            className="ShareImportPage-deleteBtn"
            onClick={handleDeleteShare}
            disabled={isDeletingShare}
            aria-label="删除分享"
            title="删除分享"
          >
            <LuTrash2 size={16} aria-hidden="true" />
            <span>{isDeletingShare ? "删除中..." : "删除"}</span>
          </button>
        )}
      </div>

      {shared.type === DataType.DOC ? (
        <Suspense fallback={<PageLoading message="正在渲染分享内容..." fullHeight={false} />}>
          <ShareDocView
            shared={shared}
            token={token!}
            fallbackTitle={title}
          />
        </Suspense>
      ) : shared.type === DataType.DIALOG ? (
        canUseRichDialog ? (
          <Suspense fallback={<ShareDialogPreview messages={dialogMessages} />}>
            <ShareDialogRichView messages={dialogMessages} conversationTodoEnabled={conversationTodoEnabled} />
          </Suspense>
        ) : (
          <ShareDialogPreview messages={dialogMessages} />
        )
      ) : shared.type === DataType.APP ? (
        <AppShareLanding shared={shared} />
      ) : shared.type === DataType.TABLE ? (
        <div className="ShareImportPage-table">
          <div className="ShareImportPage-tableCard">
            {tablePreviewLoading && !tablePreview ? (
              <p className="ShareImportPage-tableHint">正在加载表格内容...</p>
            ) : tableColumns.length === 0 ? (
              <p className="ShareImportPage-tableHint">{tableUnavailableMessage}</p>
            ) : (
              <>
                {tablePreviewError && (
                  <p className="ShareImportPage-tableHint">{tablePreviewError}</p>
                )}
                <p className="ShareImportPage-tableScrollHint">左右滚动查看更多列</p>
                <div className="ShareImportPage-tableScroller" onWheel={handleTableWheel}>
                <table className="ShareImportPage-tableGrid">
                  <thead>
                    <tr>
                      {tableColumns.map((column) => (
                        <th key={column.id}>{column.label || column.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.length > 0 ? (
                      tableRows.map((row, rowIndex) => (
                        <tr key={String(row.dbKey ?? row.rowId ?? rowIndex)}>
                          {tableColumns.map((column) => (
                            <td key={column.id}>{String(row[column.name] ?? "")}</td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={Math.max(tableColumns.length, 1)} className="ShareImportPage-tableEmptyCell">
                          {tableUnavailableMessage}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="ShareImportPage-unsupported">
          <p className="ShareImportPage-typeLabel">{getShareTypeLabel(shared.type)} 分享暂不支持预览。</p>
        </div>
      )}


    </div>
  );
};

export default ShareImportPage;
