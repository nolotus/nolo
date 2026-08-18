import {
  getShareTypeLabel
} from "/public/assets/chunks/chunk-XCKMPAB4.js";
import {
  loadOwnerSharesAcrossServers
} from "/public/assets/chunks/chunk-J7A2Y5XW.js";
import {
  createWebSharePath
} from "/public/assets/chunks/chunk-ZSRWC4Y4.js";
import {
  useToken,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import {
  NavLink
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  formatShareTime,
  remove,
  selectRemoteServers,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuBot,
  LuFileText,
  LuImage,
  LuLayoutDashboard,
  LuMessageSquare,
  LuTable,
  LuTrash2
} from "/public/assets/chunks/chunk-GQPLRP65.js";
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

// packages/app/pages/MySharesPage.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var PAGE_SIZE = 30;
var getShareTypeIcon = (type) => {
  if (type === "page" /* DOC */) return LuFileText;
  if (type === "dialog" /* DIALOG */) return LuMessageSquare;
  if (type === "cybot") return LuBot;
  if (type === "image" /* IMAGE */) return LuImage;
  if (type === "app" /* APP */) return LuLayoutDashboard;
  if (type === "table" /* TABLE */) return LuTable;
  return LuFileText;
};
var MySharesPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const userId = useUserId();
  const currentToken = useToken();
  const servers = useAppSelector(selectRemoteServers);
  const [shares, setShares] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  const [visibleCount, setVisibleCount] = (0, import_react.useState)(PAGE_SIZE);
  const [deletingTokens, setDeletingTokens] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const fetchShares = (0, import_react.useCallback)(
    async () => {
      if (!userId || !currentToken) return;
      setLoading(true);
      setError(null);
      try {
        const items = await loadOwnerSharesAcrossServers({
          servers,
          userId,
          token: currentToken,
          pageSize: 200
        });
        setShares(items);
        setVisibleCount(PAGE_SIZE);
      } catch (err) {
        setError(err?.message || t("myShares.loadError", "\u52A0\u8F7D\u5206\u4EAB\u5217\u8868\u5931\u8D25"));
      } finally {
        setLoading(false);
      }
    },
    [currentToken, servers, t, userId]
  );
  (0, import_react.useEffect)(() => {
    void fetchShares();
  }, [fetchShares]);
  const handleDelete = (0, import_react.useCallback)(
    async (token) => {
      const dbKey = `share-${token}`;
      setDeletingTokens((prev) => new Set(prev).add(token));
      try {
        await dispatch(remove({ dbKey })).unwrap();
        setShares((prev) => prev.filter((s) => s.token !== token));
        setVisibleCount((prev) => Math.max(PAGE_SIZE, prev - 1));
        toast.success(t("myShares.deleted", "\u5206\u4EAB\u5DF2\u5220\u9664"));
      } catch (err) {
        toast.error(t("myShares.deleteFailed", "\u5220\u9664\u5931\u8D25\uFF1A{{error}}", { error: err?.message || t("unknown") }));
      } finally {
        setDeletingTokens((prev) => {
          const next = new Set(prev);
          next.delete(token);
          return next;
        });
      }
    },
    [dispatch, t]
  );
  if (!userId) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "MySharesPage", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "MySharesPage__empty", children: t("myShares.requireLogin", "\u8BF7\u5148\u767B\u5F55\u540E\u67E5\u770B\u4F60\u7684\u5206\u4EAB\u3002") }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "MySharesPage", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "MySharesPage__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: t("myShares.title", "\u6211\u7684\u5206\u4EAB") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("myShares.subtitle", "\u4F60\u53D1\u5E03\u548C\u5206\u4EAB\u51FA\u53BB\u7684\u9875\u9762\u3001\u5BF9\u8BDD\u3001\u8868\u683C\u4E0E\u5E94\u7528\u3002") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, { to: "/share/community", className: "MySharesPage__communityLink", children: t("myShares.browseCommunity", "\u6D4F\u89C8\u793E\u533A") })
    ] }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "MySharesPage__status", children: t("myShares.loading", "\u6B63\u5728\u52A0\u8F7D...") }),
    error && !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "MySharesPage__status", children: error }),
    !loading && !error && shares.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "MySharesPage__empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("myShares.empty", "\u8FD8\u6CA1\u6709\u4EFB\u4F55\u5206\u4EAB\u3002") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("myShares.emptyHint", "\u5728\u6587\u7AE0\u3001\u5BF9\u8BDD\u6216\u8868\u683C\u9875\u9762\u70B9\u51FB\u5206\u4EAB\u6309\u94AE\u5373\u53EF\u521B\u5EFA\u3002") })
    ] }),
    !loading && shares.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "MySharesPage__list", children: shares.slice(0, visibleCount).map((share) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "MySharesPage__item", children: [
      share.coverImage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        NavLink,
        {
          to: createWebSharePath(share.token),
          className: "MySharesPage__cover",
          "aria-label": share.title || t("unknown", "\u672A\u547D\u540D"),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: share.coverImage, alt: "" })
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        NavLink,
        {
          to: createWebSharePath(share.token),
          className: `MySharesPage__cover MySharesPage__cover--${share.type}`,
          "aria-label": share.title || t("unknown", "\u672A\u547D\u540D"),
          children: import_react.default.createElement(getShareTypeIcon(share.type), {
            size: 26,
            "aria-hidden": true
          })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "MySharesPage__deleteBtn",
          disabled: deletingTokens.has(share.token),
          onClick: () => void handleDelete(share.token),
          "aria-label": t("delete", "\u5220\u9664"),
          title: t("delete", "\u5220\u9664"),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 16, "aria-hidden": "true" })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "MySharesPage__itemMain", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          NavLink,
          {
            to: createWebSharePath(share.token),
            className: "MySharesPage__itemTitle",
            children: share.title || t("unknown", "\u672A\u547D\u540D")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "MySharesPage__itemMeta", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "MySharesPage__badge", children: getShareTypeLabel(share.type) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "MySharesPage__visibility", children: share.visibility === "community" ? t("share_visibility_public", "\u516C\u5F00") : t("share_visibility_private", "\u79C1\u4EBA") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "MySharesPage__time", children: formatShareTime(
            share.updatedAt && share.updatedAt > share.createdAt ? share.updatedAt : share.createdAt
          ) })
        ] }),
        (share.agentName || share.description) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "MySharesPage__itemDescription", children: share.agentName || share.description })
      ] })
    ] }, share.token)) }),
    visibleCount < shares.length && !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "MySharesPage__loadMore", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "MySharesPage__loadMoreBtn",
        onClick: () => setVisibleCount((prev) => prev + PAGE_SIZE),
        children: t("myShares.loadMore", "\u52A0\u8F7D\u66F4\u591A")
      }
    ) })
  ] });
};
var MySharesPage_default = MySharesPage;
export {
  MySharesPage_default as default
};
