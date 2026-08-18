import {
  buildStaticPageMeta,
  usePageMeta
} from "/public/assets/chunks/chunk-M4PBN5X7.js";
import {
  ShareCard
} from "/public/assets/chunks/chunk-TCYK5LBJ.js";
import "/public/assets/chunks/chunk-XCKMPAB4.js";
import {
  createWebSharePath,
  shareApi
} from "/public/assets/chunks/chunk-ZSRWC4Y4.js";
import "/public/assets/chunks/chunk-EOM4G5HF.js";
import {
  useSSRCommunityShares
} from "/public/assets/chunks/chunk-MFOH33JJ.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectRuntimeSnapshot
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
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

// packages/app/pages/ShareCommunityPage.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var SHARE_COMMUNITY_FILTER_CATALOG = {
  all: { labelKey: "community_filter_all" },
  app: { labelKey: "community_filter_app" },
  doc: { labelKey: "community_filter_doc" },
  table: { labelKey: "community_filter_table" },
  chat: { labelKey: "community_filter_chat" }
};
var FILTERS = Object.entries(SHARE_COMMUNITY_FILTER_CATALOG).map(
  ([key, value]) => ({
    key,
    labelKey: value.labelKey
  })
);
var isFilterType = (value) => value in SHARE_COMMUNITY_FILTER_CATALOG;
var matchesFilter = (share, filter) => {
  if (filter === "all") return true;
  if (filter === "app") return share.type === "app" /* APP */;
  if (filter === "doc") return share.type === "page" /* DOC */;
  if (filter === "table") return share.type === "table" /* TABLE */;
  if (filter === "chat") return share.type === "dialog" /* DIALOG */ || share.type === "cybot";
  return true;
};
var buildCommunityServerCandidates = (localRuntimeOrigin, currentServer, syncServers) => {
  const configured = [currentServer, ...Array.isArray(syncServers) ? syncServers : []].filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => value.replace(/\/+$/, ""));
  return Array.from(
    /* @__PURE__ */ new Set([
      ...localRuntimeOrigin ? [localRuntimeOrigin] : [],
      ...configured
    ])
  );
};
var mapSummaryToItem = (s) => ({
  ...s,
  dbKey: `share-${s.token}`,
  path: createWebSharePath(s.token),
  ...s.authorId ? { authorPath: `/profile/${encodeURIComponent(s.authorId)}` } : {},
  ...s.agentKey ? { agentPath: `/${encodeURIComponent(s.agentKey)}` } : {}
});
var ShareCommunityPage = () => {
  const { t } = useTranslation();
  const pageMeta = (0, import_react.useMemo)(() => buildStaticPageMeta(t, "shareCommunity"), [t]);
  usePageMeta(pageMeta);
  const ssrData = useSSRCommunityShares();
  const hasSSRData = ssrData.data.length > 0;
  const [allShares, setAllShares] = (0, import_react.useState)(
    () => hasSSRData ? ssrData.data.map(mapSummaryToItem) : []
  );
  const [activeFilter, setActiveFilter] = (0, import_react.useState)("all");
  const [loading, setLoading] = (0, import_react.useState)(!hasSSRData);
  const [loadingMore, setLoadingMore] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [nextCursor, setNextCursor] = (0, import_react.useState)(ssrData.nextCursor);
  const { currentServer, syncServers, localRuntimeOrigin } = useAppSelector(selectRuntimeSnapshot);
  const serverCandidates = (0, import_react.useMemo)(
    () => buildCommunityServerCandidates(localRuntimeOrigin, currentServer, syncServers),
    [localRuntimeOrigin, currentServer, syncServers]
  );
  const filteredShares = (0, import_react.useMemo)(
    () => allShares.filter((s) => matchesFilter(s, activeFilter)),
    [allShares, activeFilter]
  );
  const fetchShares = (0, import_react.useCallback)(async (cursor) => {
    const isInitial = !cursor;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (cursor) params.set("cursor", cursor);
      let res = null;
      let lastError = null;
      for (const candidate of serverCandidates) {
        try {
          const nextRes = await fetch(shareApi.community(candidate, params));
          if (nextRes.ok) {
            res = nextRes;
            break;
          }
          lastError = new Error(`Server responded ${nextRes.status}`);
        } catch (err) {
          lastError = err;
        }
      }
      if (!res) throw lastError instanceof Error ? lastError : new Error("Failed to load shares");
      const json = await res.json();
      const items = (json.data || []).map(mapSummaryToItem);
      setAllShares((prev) => isInitial ? items : [...prev, ...items]);
      setNextCursor(json.nextCursor || void 0);
    } catch (err) {
      setError(err?.message || t("community_load_error"));
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, [serverCandidates, t]);
  (0, import_react.useEffect)(() => {
    if (hasSSRData) return;
    void fetchShares();
  }, [fetchShares, hasSSRData]);
  const handleFilterClick = (0, import_react.useCallback)(
    (event) => {
      const nextFilter = event.currentTarget.dataset.filter;
      if (nextFilter && isFilterType(nextFilter)) {
        setActiveFilter(nextFilter);
      }
    },
    []
  );
  const filterCounts = (0, import_react.useMemo)(() => {
    const counts = {
      all: allShares.length,
      app: 0,
      doc: 0,
      table: 0,
      chat: 0
    };
    for (const s of allShares) {
      if (s.type === "app" /* APP */) counts.app++;
      else if (s.type === "page" /* DOC */) counts.doc++;
      else if (s.type === "table" /* TABLE */) counts.table++;
      else if (s.type === "dialog" /* DIALOG */ || s.type === "cybot") counts.chat++;
    }
    return counts;
  }, [allShares]);
  const handleLoadMore = (0, import_react.useCallback)(() => {
    if (nextCursor) {
      void fetchShares(nextCursor);
    }
  }, [fetchShares, nextCursor]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ShareCommunityPage", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "ShareCommunityPage__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "ShareCommunityPage__title", children: t("community_title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ShareCommunityPage__subtitle", children: t("community_subtitle") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { className: "ShareCommunityPage__tabs", children: FILTERS.map(({ key, labelKey }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        className: `ShareCommunityPage__tab ${activeFilter === key ? "is-active" : ""}`,
        "data-filter": key,
        onClick: handleFilterClick,
        children: [
          t(labelKey),
          !loading && filterCounts[key] > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ShareCommunityPage__tab-count", children: filterCounts[key] }) : null
        ]
      },
      key
    )) }),
    loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCommunityPage__status", children: t("community_loading") }) : null,
    error && !loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCommunityPage__status is-error", children: error }) : null,
    !loading && !error && filteredShares.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCommunityPage__empty", children: t("community_empty") }) : null,
    filteredShares.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "ShareCommunityPage__masonry", children: filteredShares.map((share) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShareCard, { share }, share.dbKey)) }) : null,
    nextCursor && !loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCommunityPage__loadMore", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "ShareCommunityPage__loadMoreBtn",
        disabled: loadingMore,
        onClick: handleLoadMore,
        children: loadingMore ? t("community_loading_more") : t("community_load_more")
      }
    ) }) : null
  ] });
};
var ShareCommunityPage_default = ShareCommunityPage;
export {
  ShareCommunityPage_default as default
};
