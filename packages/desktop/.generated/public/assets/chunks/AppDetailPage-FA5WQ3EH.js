import {
  useMyAppActions
} from "/public/assets/chunks/chunk-ICDTUM5O.js";
import {
  useAppDetail
} from "/public/assets/chunks/chunk-C5WMP2NT.js";
import {
  resolvePreferredAppRuntimeUrl
} from "/public/assets/chunks/chunk-II3ADNT6.js";
import {
  fetchAppVersionsCurrentServerFirst
} from "/public/assets/chunks/chunk-CJPHN6JB.js";
import "/public/assets/chunks/chunk-SDMAWFBN.js";
import "/public/assets/chunks/chunk-2XKWBRFO.js";
import "/public/assets/chunks/chunk-G4VE62AJ.js";
import {
  useToken,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import {
  useNavigate,
  useParams,
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectRemoteServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuEllipsisVertical,
  LuHistory,
  LuMessagesSquare,
  LuTrash2
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  buildAppChatEditorPath,
  buildAppDetailPath,
  readAppServerOrigin
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/AppDetailPage.tsx
var import_react2 = __toESM(require_react());

// packages/app/hooks/useAppVersions.ts
var import_react = __toESM(require_react());
function useAppVersions(appId, sourceServerOrigin) {
  const server = useAppSelector(selectRemoteServer);
  const token = useToken();
  const [versions, setVersions] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const fetchVersions = (0, import_react.useCallback)(async () => {
    if (!appId || !token) {
      setVersions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppVersionsCurrentServerFirst({
        currentServer: server,
        sourceServer: sourceServerOrigin,
        token,
        appId
      });
      setVersions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message ?? "\u52A0\u8F7D\u7248\u672C\u5931\u8D25");
    } finally {
      setLoading(false);
    }
  }, [appId, server, sourceServerOrigin, token]);
  (0, import_react.useEffect)(() => {
    void fetchVersions();
  }, [fetchVersions]);
  return { versions, loading, error, refetch: fetchVersions };
}

// packages/app/pages/AppDetailPage.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var AppDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    pageKey,
    appKey: legacyAppKey,
    spaceId
  } = useParams();
  const previewViewportRef = (0, import_react2.useRef)(null);
  const routeAppKey = pageKey?.startsWith("app-") ? pageKey : legacyAppKey;
  const routeServerOrigin = readAppServerOrigin(searchParams);
  const { app, loading, error, refetch } = useAppDetail(routeAppKey, {
    serverOrigin: routeServerOrigin
  });
  const [frameLoaded, setFrameLoaded] = (0, import_react2.useState)(false);
  const [menuOpen, setMenuOpen] = (0, import_react2.useState)(false);
  const [confirmDelete, setConfirmDelete] = (0, import_react2.useState)(false);
  const [deleting, setDeleting] = (0, import_react2.useState)(false);
  const [showVersions, setShowVersions] = (0, import_react2.useState)(false);
  const menuRef = (0, import_react2.useRef)(null);
  const { deleteApp } = useMyAppActions({ setApps: () => {
  } });
  const searchParamsString = searchParams.toString();
  const buildDetailTarget = (0, import_react2.useCallback)((appKey) => {
    if (!searchParamsString) {
      return buildAppDetailPath(appKey, spaceId, routeServerOrigin);
    }
    const url = new URL(
      buildAppDetailPath(appKey, spaceId, routeServerOrigin),
      typeof window !== "undefined" ? window.location.origin : "https://nolo.local"
    );
    const params = new URLSearchParams(searchParamsString);
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }, [routeServerOrigin, searchParamsString, spaceId]);
  const primaryUrl = (0, import_react2.useMemo)(
    () => app ? resolvePreferredAppRuntimeUrl({
      appId: app.appId,
      customUrl: app.customUrl,
      url: app.url
    }) : "",
    [app]
  );
  const previewUrlLabel = (0, import_react2.useMemo)(() => {
    if (!primaryUrl) return "";
    try {
      const parsedUrl = new URL(primaryUrl);
      return `${parsedUrl.host}${parsedUrl.pathname}`.replace(/\/$/, "") || parsedUrl.host;
    } catch {
      return primaryUrl.replace(/^https?:\/\//, "");
    }
  }, [primaryUrl]);
  (0, import_react2.useEffect)(() => {
    if (legacyAppKey && !pageKey) {
      navigate(buildDetailTarget(legacyAppKey), { replace: true });
      return;
    }
    if (!app?.appKey || !routeAppKey || app.appKey === routeAppKey) return;
    navigate(buildDetailTarget(app.appKey), { replace: true });
  }, [app?.appKey, buildDetailTarget, legacyAppKey, navigate, pageKey, routeAppKey]);
  (0, import_react2.useEffect)(() => {
    const handler = () => void refetch();
    window.addEventListener("app-editor-refresh", handler);
    return () => window.removeEventListener("app-editor-refresh", handler);
  }, [refetch]);
  (0, import_react2.useEffect)(() => {
    setFrameLoaded(false);
  }, [primaryUrl]);
  (0, import_react2.useEffect)(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);
  const handleDelete = (0, import_react2.useCallback)(async () => {
    if (!app) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3e3);
      return;
    }
    setDeleting(true);
    await deleteApp({
      name: app.userFriendlyName,
      appId: app.appId,
      appKey: app.appKey ?? "",
      serverOrigin: routeServerOrigin ?? void 0
    });
    setDeleting(false);
    setConfirmDelete(false);
    navigate("/");
  }, [app, confirmDelete, deleteApp, navigate, routeServerOrigin]);
  const currentUserId = useUserId();
  const couldEdit = !!currentUserId && !!app;
  if (!routeAppKey) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__status", children: t("appDetail_missingId") });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "AppDetailPage", children: [
    loading && !app ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__status", children: t("loading", "\u52A0\u8F7D\u4E2D...") }) : error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__status AppDetailPage__status--error", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "AppDetailPage__previewSection", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__previewCard", children: primaryUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        ref: previewViewportRef,
        className: "AppDetailPage__frameWrap",
        children: [
          !frameLoaded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__loadingOverlay", children: t("loading", "\u52A0\u8F7D\u4E2D...") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              className: "AppDetailPage__browserShell",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "AppDetailPage__browserBar", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "AppDetailPage__browserDots", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__browserUrl", children: previewUrlLabel }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__browserBadge", children: app?.framework ?? "app" }),
                  couldEdit && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "AppDetailPage__topbarActions", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "AppDetailPage__topbarBtn",
                        title: t("edit", "\u7F16\u8F91"),
                        onClick: () => {
                          navigate(buildAppChatEditorPath(routeAppKey, spaceId, routeServerOrigin));
                        },
                        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMessagesSquare, { size: 18, "aria-hidden": "true" })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "AppDetailPage__menuWrap", ref: menuRef, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "AppDetailPage__topbarBtn",
                          title: t("moreActions", "\u66F4\u591A\u64CD\u4F5C"),
                          onClick: () => setMenuOpen((v) => !v),
                          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuEllipsisVertical, { size: 18, "aria-hidden": "true" })
                        }
                      ),
                      menuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "AppDetailPage__menu", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "AppDetailPage__menuItem",
                            onClick: () => {
                              setMenuOpen(false);
                              setShowVersions(true);
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuHistory, { size: 16, "aria-hidden": "true" }),
                              t("versionManagement", "\u7248\u672C\u7BA1\u7406")
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "AppDetailPage__menuItem AppDetailPage__menuItem--danger",
                            onClick: handleDelete,
                            disabled: deleting,
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 16, "aria-hidden": "true" }),
                              confirmDelete ? t("confirmDelete", "\u518D\u6B21\u70B9\u51FB\u786E\u8BA4\u5220\u9664") : t("delete", "\u5220\u9664")
                            ]
                          }
                        )
                      ] })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "iframe",
                  {
                    title: app?.userFriendlyName ?? "App Preview",
                    src: primaryUrl,
                    className: "AppDetailPage__frame",
                    sandbox: "allow-scripts allow-forms allow-same-origin allow-popups",
                    onLoad: () => setFrameLoaded(true)
                  }
                )
              ]
            }
          )
        ]
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__status", children: t("appDetail_preview_unavailable") }) }) }),
    couldEdit && showVersions && app && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__modalOverlay", onClick: () => setShowVersions(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "AppDetailPage__modal", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "AppDetailPage__modalHeader", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("versionManagement", "\u7248\u672C\u7BA1\u7406") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "AppDetailPage__modalClose",
            onClick: () => setShowVersions(false),
            children: "\u2715"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppVersionList, { appId: app.appId, serverOrigin: routeServerOrigin })
    ] }) })
  ] });
};
var AppDetailPage_default = AppDetailPage;
var AppVersionList = ({
  appId,
  serverOrigin
}) => {
  const { t } = useTranslation();
  const { versions, loading, error } = useAppVersions(appId, serverOrigin);
  if (loading) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__versionStatus", children: t("loading", "\u52A0\u8F7D\u4E2D...") });
  }
  if (error) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__versionStatus AppDetailPage__versionStatus--error", children: error });
  }
  if (!versions.length) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__versionStatus", children: t("noVersions", "\u6682\u65E0\u7248\u672C") });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__versionList", children: versions.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "AppDetailPage__versionItem", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "AppDetailPage__versionInfo", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "AppDetailPage__versionId", children: v.versionId.slice(-12) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "AppDetailPage__versionDate", children: v.createdAt ? new Date(v.createdAt).toLocaleString() : "" }),
    v.pinned && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "AppDetailPage__versionPinned", children: "\u{1F4CC}" })
  ] }) }, v.versionId)) });
};
export {
  AppDetailPage_default as default
};
