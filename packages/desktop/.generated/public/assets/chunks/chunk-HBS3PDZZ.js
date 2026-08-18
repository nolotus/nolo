import {
  useAgentCardNavigation
} from "/public/assets/chunks/chunk-7W3NEOUM.js";
import {
  AgentBlock_default
} from "/public/assets/chunks/chunk-VR5RNFCD.js";
import {
  AgentGrid_default
} from "/public/assets/chunks/chunk-5GGTP5ZM.js";
import {
  isInteractiveAgentCardTarget,
  seedAgentPreviewsInStore
} from "/public/assets/chunks/chunk-JJGKUQA3.js";
import {
  $1f7649abe3ae3599$export$392b9a0bbc7c7e43,
  $1f7649abe3ae3599$export$a7bfbda1311ca015,
  $1f7649abe3ae3599$export$e96fc9a8407faa6b
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useStore
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  LuLayoutGrid,
  LuRefreshCw
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/web/EmptyState.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var EmptyState = ({
  icon,
  title,
  subtitle,
  action,
  className
}) => {
  const rootClass = className ? `empty-state ${className}` : "empty-state";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: rootClass, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "empty-state__icon-wrapper", "aria-hidden": "true", children: icon }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty-state__text", children: title }),
    subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "empty-state__subtext", children: subtitle }),
    action ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "empty-state__action", children: action }) : null
  ] });
};
var EmptyState_default = EmptyState;

// packages/ai/agent/web/PublicAgentsList.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var SKELETON_COUNT = 6;
var PublicAgentsSkeleton = (0, import_react.memo)(() => {
  const items = (0, import_react.useMemo)(() => Array.from({ length: SKELETON_COUNT }), []);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(AgentGrid_default, { children: items.map((_, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "public-agents__skeleton-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "public-agents__skeleton-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "public-agents__skeleton-avatar public-agents__shimmer" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "public-agents__skeleton-header-text", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--title public-agents__shimmer" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--subtitle public-agents__shimmer" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "public-agents__skeleton-body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "public-agents__skeleton-line public-agents__shimmer" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "public-agents__skeleton-line public-agents__shimmer" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--short public-agents__shimmer" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "public-agents__skeleton-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "public-agents__skeleton-pill public-agents__shimmer" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "public-agents__skeleton-pill public-agents__skeleton-pill--small public-agents__shimmer" })
    ] })
  ] }, index)) });
});
PublicAgentsSkeleton.displayName = "PublicAgentsSkeleton";
var PublicAgentsList = (0, import_react.memo)(
  ({
    loading,
    error = null,
    data,
    reload,
    keepGridHeight = false
  }) => {
    const { t } = useTranslation(["ai"]);
    const dispatch = useAppDispatch();
    const store = useStore();
    const hasData = !!data && data.length > 0;
    const { openAgent, prefetchAgent } = useAgentCardNavigation();
    (0, import_react.useEffect)(() => {
      if (!data?.length) return;
      seedAgentPreviewsInStore(dispatch, store.getState, data);
    }, [data, dispatch, store]);
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "div",
      {
        className: "public-agents__list-wrapper",
        style: keepGridHeight && hasData ? { minHeight: "350px" } : void 0,
        children: [
          loading && !hasData && !error && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PublicAgentsSkeleton, {}),
          hasData && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            $1f7649abe3ae3599$export$a7bfbda1311ca015,
            {
              className: "agents-grid public-agents__grid",
              "aria-label": t("aiPlaza", "AI \u5E7F\u573A"),
              layout: "grid",
              selectionMode: "none",
              children: [
                data.map((item) => {
                  const agentPath = `/${item.dbKey || item.id}`;
                  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    $1f7649abe3ae3599$export$e96fc9a8407faa6b,
                    {
                      id: item.id,
                      textValue: item.name || "",
                      onAction: () => openAgent(item),
                      onHoverStart: () => prefetchAgent(item),
                      onKeyDown: (e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isInteractiveAgentCardTarget(e.target)) {
                          e.preventDefault();
                          openAgent(item, { newTab: true });
                        }
                      },
                      ...{
                        onAuxClick: (e) => {
                          if (e.button !== 1) return;
                          if (isInteractiveAgentCardTarget(e.target)) return;
                          e.preventDefault();
                          openAgent(item, { newTab: true });
                        }
                      },
                      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        "div",
                        {
                          onPointerEnter: () => prefetchAgent(item),
                          "data-agent-path": agentPath,
                          onClickCapture: (e) => {
                            if (!(e.metaKey || e.ctrlKey)) return;
                            if (isInteractiveAgentCardTarget(e.target)) return;
                            e.preventDefault();
                            e.stopPropagation();
                            openAgent(item, { newTab: true });
                          },
                          onKeyDownCapture: (e) => {
                            if (!(e.metaKey || e.ctrlKey)) return;
                            if (e.key !== "Enter") return;
                            if (isInteractiveAgentCardTarget(e.target)) return;
                            e.preventDefault();
                            e.stopPropagation();
                            openAgent(item, { newTab: true });
                          },
                          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(AgentBlock_default, { item, reload })
                        }
                      )
                    },
                    item.id
                  );
                }),
                loading && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)($1f7649abe3ae3599$export$392b9a0bbc7c7e43, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "public-agents__loading-more", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuRefreshCw, { className: "public-agents__icon--spin", size: 16, "aria-hidden": "true" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u52A0\u8F7D\u4E2D..." })
                ] }) })
              ]
            }
          ),
          !loading && !hasData && error && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            EmptyState_default,
            {
              icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLayoutGrid, { size: 32 }),
              title: t("aiPlazaLoadError", "\u52A0\u8F7D\u5931\u8D25"),
              subtitle: error.message || t("aiPlazaLoadErrorHint", "\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5"),
              action: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  type: "button",
                  className: "public-agents__retry-btn",
                  onClick: () => void reload(),
                  children: t("retry", "\u91CD\u8BD5")
                }
              )
            }
          ),
          !loading && !hasData && !error && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            EmptyState_default,
            {
              icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLayoutGrid, { size: 32 }),
              title: "\u6682\u65E0\u53EF\u5C55\u793A\u7684\u667A\u80FD\u4F53",
              subtitle: "\u521B\u4F5C\u8005\u8FD8\u6CA1\u6709\u53D1\u5E03\u667A\u80FD\u4F53\uFF0C\u656C\u8BF7\u671F\u5F85"
            }
          )
        ]
      }
    );
  }
);
PublicAgentsList.displayName = "PublicAgentsList";
var PublicAgentsList_default = PublicAgentsList;

export {
  EmptyState_default,
  PublicAgentsList_default
};
