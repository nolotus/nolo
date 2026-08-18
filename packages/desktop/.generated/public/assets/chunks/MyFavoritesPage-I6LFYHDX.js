import {
  useAgentCardNavigation
} from "/public/assets/chunks/chunk-7W3NEOUM.js";
import {
  RequireSignedIn_default
} from "/public/assets/chunks/chunk-PPNEHUJN.js";
import {
  AgentBlock_default
} from "/public/assets/chunks/chunk-VR5RNFCD.js";
import "/public/assets/chunks/chunk-U6SGTC52.js";
import {
  isInteractiveAgentCardTarget
} from "/public/assets/chunks/chunk-JJGKUQA3.js";
import "/public/assets/chunks/chunk-D2IAHGBR.js";
import {
  CONTENT_TYPE_META
} from "/public/assets/chunks/chunk-VGCTNZHU.js";
import "/public/assets/chunks/chunk-WOLEEY5H.js";
import "/public/assets/chunks/chunk-JQ6XROM5.js";
import "/public/assets/chunks/chunk-CA74EWBF.js";
import "/public/assets/chunks/chunk-FYMUXPF2.js";
import "/public/assets/chunks/chunk-UFYPTJWC.js";
import "/public/assets/chunks/chunk-EOM4G5HF.js";
import "/public/assets/chunks/chunk-ZCACUALD.js";
import "/public/assets/chunks/chunk-7HVHEMQ3.js";
import "/public/assets/chunks/chunk-NLX7YQL6.js";
import {
  useFetchData
} from "/public/assets/chunks/chunk-EA4SLPRB.js";
import {
  Tab,
  TabList,
  Tabs
} from "/public/assets/chunks/chunk-ZY3QGHFY.js";
import "/public/assets/chunks/chunk-7HTHEFUV.js";
import "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import {
  $1f7649abe3ae3599$export$a7bfbda1311ca015,
  $1f7649abe3ae3599$export$e96fc9a8407faa6b
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-5IJJ57JD.js";
import "/public/assets/chunks/chunk-VCSNZD3S.js";
import {
  useIsLoggedIn
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useNavigate,
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  read,
  selectById,
  toast,
  useFavoriteAgentIds,
  useFavoriteContentIds,
  useFavoriteFavoritedAtById,
  useFavoritesError,
  useFavoritesInitialized,
  useFavoritesLoading
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuArrowRight,
  LuBot,
  LuClock3,
  LuFile,
  LuFileText,
  LuImage,
  LuMessageSquare,
  LuTable
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  buildRoutableContentPath
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

// packages/ai/agent/web/FavoritesCollection.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var EmptyState = (0, import_react.memo)(({ message, actionText, onAction }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "empty-state", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "empty-state__icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 40, "aria-hidden": "true" }) }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty-state__text", children: message }),
  actionText && onAction && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "empty-state__btn", onClick: onAction, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 16, "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: actionText })
  ] })
] }));
var FavoriteAgentItem = (0, import_react.memo)(
  ({
    agentKey,
    openAgent,
    prefetchAgent
  }) => {
    const { data: fetchedAgent, isLoading, error, reload } = useFetchData(agentKey);
    const localAgent = useAppSelector((s) => selectById(s, agentKey));
    const agent = fetchedAgent || localAgent;
    if (!agent && isLoading) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($1f7649abe3ae3599$export$e96fc9a8407faa6b, { id: agentKey, textValue: agentKey, isDisabled: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-card", "aria-hidden": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-avatar public-agents__shimmer" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-header-text", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--title public-agents__shimmer" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--subtitle public-agents__shimmer" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__shimmer" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__shimmer" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--short public-agents__shimmer" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-footer", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-pill public-agents__shimmer" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-pill public-agents__skeleton-pill--small public-agents__shimmer" })
        ] })
      ] }) });
    }
    if (error || !agent) return null;
    const agentPath = `/${agent.dbKey || agent.id}`;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      $1f7649abe3ae3599$export$e96fc9a8407faa6b,
      {
        id: agentKey,
        textValue: agent.name || "",
        onAction: () => openAgent(agent),
        onHoverStart: () => prefetchAgent(agent),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "div",
          {
            onPointerEnter: () => prefetchAgent(agent),
            "data-agent-path": agentPath,
            onAuxClick: (e) => {
              if (e.button !== 1) return;
              if (isInteractiveAgentCardTarget(e.target)) return;
              e.preventDefault();
              openAgent(agent, { newTab: true });
            },
            onClickCapture: (e) => {
              if (!(e.metaKey || e.ctrlKey)) return;
              if (isInteractiveAgentCardTarget(e.target)) return;
              e.preventDefault();
              e.stopPropagation();
              openAgent(agent, { newTab: true });
            },
            onKeyDownCapture: (e) => {
              if (!(e.metaKey || e.ctrlKey)) return;
              if (e.key !== "Enter") return;
              if (isInteractiveAgentCardTarget(e.target)) return;
              e.preventDefault();
              e.stopPropagation();
              openAgent(agent, { newTab: true });
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentBlock_default, { item: agent, reload, preferCurrentSpaceLaunch: true })
          }
        )
      }
    );
  }
);
function formatContentDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}
function getContentKind(contentKey) {
  if (contentKey.startsWith("dialog-")) return "dialog";
  if (contentKey.startsWith("meta-")) return "table";
  if (contentKey.startsWith("image-")) return "image";
  if (contentKey.startsWith("file-")) return "file";
  return "page";
}
function getContentKindLabel(kind) {
  if (kind === "table") return "\u8868\u683C";
  if (kind === "image") return "\u56FE\u7247";
  if (kind === "file") return "\u6587\u4EF6";
  if (kind === "dialog") return "\u5BF9\u8BDD";
  return "\u9875\u9762";
}
var FavoriteContentItem = (0, import_react.memo)(
  ({
    contentKey,
    openContent
  }) => {
    const { data: fetchedContent, isLoading, error } = useFetchData(contentKey);
    const localContent = useAppSelector((s) => selectById(s, contentKey));
    const content = fetchedContent || localContent;
    if (!content && isLoading) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($1f7649abe3ae3599$export$e96fc9a8407faa6b, { id: contentKey, textValue: contentKey, isDisabled: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "favorite-content-card favorite-content-card--skeleton", "aria-hidden": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "favorite-content-card__header", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "favorite-content-card__icon public-agents__shimmer" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "favorite-content-card__content", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "public-agents__skeleton-line public-agents__skeleton-line--title public-agents__shimmer" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "favorite-content-card__meta", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "public-agents__skeleton-line public-agents__skeleton-line--short public-agents__shimmer" }) })
      ] }) });
    }
    if (error || !content) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($1f7649abe3ae3599$export$e96fc9a8407faa6b, { id: contentKey, textValue: contentKey, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "favorite-content-card favorite-content-card--dead-link", role: "status", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "favorite-content-card__content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "favorite-content-card__title", children: "\u6536\u85CF\u9879\u6682\u65F6\u4E0D\u53EF\u7528" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "favorite-content-card__dead-link-desc", children: "\u53EF\u80FD\u5DF2\u5220\u9664\u6216\u4F60\u5931\u53BB\u4E86\u8BFB\u53D6\u6743\u9650\u3002\u6536\u85CF\u4E0D\u7B49\u4E8E\u6388\u6743\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "favorite-content-card__dead-link-key", children: contentKey })
      ] }) }) });
    }
    const title = content.title || contentKey;
    const kind = getContentKind(contentKey);
    const kindLabel = getContentKindLabel(kind);
    const updatedAt = formatContentDate(content.updatedAt) || formatContentDate(content.updated_at) || formatContentDate(content.createdAt) || formatContentDate(content.created);
    const ContentIcon = kind === "table" ? LuTable : kind === "image" ? LuImage : kind === "file" ? LuFile : kind === "dialog" ? LuMessageSquare : LuFileText;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      $1f7649abe3ae3599$export$e96fc9a8407faa6b,
      {
        id: contentKey,
        textValue: title,
        onAction: () => openContent(contentKey),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "favorite-content-card",
            title,
            onAuxClick: (e) => {
              if (e.button !== 1) return;
              e.preventDefault();
              openContent(contentKey, { newTab: true });
            },
            onClickCapture: (e) => {
              if (!(e.metaKey || e.ctrlKey)) return;
              e.preventDefault();
              e.stopPropagation();
              openContent(contentKey, { newTab: true });
            },
            onKeyDownCapture: (e) => {
              if (!(e.metaKey || e.ctrlKey)) return;
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.stopPropagation();
              openContent(contentKey, { newTab: true });
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "favorite-content-card__header", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "favorite-content-card__icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContentIcon, { size: 20, "aria-hidden": "true" }) }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "favorite-content-card__content", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "favorite-content-card__title", children: title }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "favorite-content-card__meta", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock3, { size: 12, "aria-hidden": "true" }),
                updatedAt || kindLabel
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "favorite-content-card__open", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowRight, { size: 16, "aria-hidden": "true" }) })
            ]
          }
        )
      }
    );
  }
);
function matchesFavoriteFilter(entry, filter) {
  if (filter === "all") return true;
  if (filter === "agent") return entry.type === "agent";
  return entry.type === "content" && entry.kind === filter;
}
var FAVORITE_EMPTY_COPY = {
  all: {
    title: "\u8FD8\u6CA1\u6709\u6536\u85CF\u4EFB\u4F55\u5185\u5BB9",
    hint: "\u5728 AI \u5E7F\u573A\u6216\u4EFB\u610F\u5185\u5BB9\u8BE6\u60C5\u9875\u70B9\u661F\u6807\uFF0C\u5373\u53EF\u52A0\u5165\u6536\u85CF\u3002",
    cta: "\u53BB AI \u5E7F\u573A\u901B\u901B",
    ctaTarget: "/explore"
  },
  agent: {
    title: "\u8FD8\u6CA1\u6709\u6536\u85CF AI",
    hint: "\u5728 AI \u5E7F\u573A\u6216 AI \u8BE6\u60C5\u9875\u70B9\u661F\u6807\uFF0C\u5373\u53EF\u52A0\u5165\u6536\u85CF\u3002",
    cta: "\u53BB AI \u5E7F\u573A\u901B\u901B",
    ctaTarget: "/explore"
  },
  page: {
    title: "\u8FD8\u6CA1\u6709\u6536\u85CF\u9875\u9762",
    hint: "\u5728\u4EFB\u610F\u9875\u9762\u70B9\u661F\u6807\uFF0C\u5373\u53EF\u52A0\u5165\u6536\u85CF\u3002",
    cta: "\u53BB\u6211\u7684\u5185\u5BB9",
    ctaTarget: "/my/content"
  },
  table: {
    title: "\u8FD8\u6CA1\u6709\u6536\u85CF\u8868\u683C",
    hint: "\u5728\u4EFB\u610F\u8868\u683C\u70B9\u661F\u6807\uFF0C\u5373\u53EF\u52A0\u5165\u6536\u85CF\u3002",
    cta: "\u53BB\u6211\u7684\u5185\u5BB9",
    ctaTarget: "/my/content"
  },
  image: {
    title: "\u8FD8\u6CA1\u6709\u6536\u85CF\u56FE\u7247",
    hint: "\u5728\u4EFB\u610F\u56FE\u7247\u70B9\u661F\u6807\uFF0C\u5373\u53EF\u52A0\u5165\u6536\u85CF\u3002",
    cta: "\u53BB\u6211\u7684\u5185\u5BB9",
    ctaTarget: "/my/content"
  },
  file: {
    title: "\u8FD8\u6CA1\u6709\u6536\u85CF\u6587\u4EF6",
    hint: "\u5728\u4EFB\u610F\u6587\u4EF6\u70B9\u661F\u6807\uFF0C\u5373\u53EF\u52A0\u5165\u6536\u85CF\u3002",
    cta: "\u53BB\u6211\u7684\u5185\u5BB9",
    ctaTarget: "/my/content"
  },
  dialog: {
    title: "\u8FD8\u6CA1\u6709\u6536\u85CF\u5BF9\u8BDD",
    hint: "\u5728\u5BF9\u8BDD\u884C\u7684\u66F4\u591A\u83DC\u5355\u91CC\u70B9\u6536\u85CF\uFF0C\u5373\u53EF\u52A0\u5165\u6536\u85CF\u3002",
    cta: "\u53BB\u6211\u7684\u5185\u5BB9",
    ctaTarget: "/my/content"
  }
};
var FavoriteEmptyCard = (0, import_react.memo)(
  ({
    filter,
    onNavigate
  }) => {
    const { t } = useTranslation();
    const copy = FAVORITE_EMPTY_COPY[filter] ?? FAVORITE_EMPTY_COPY.all;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      $1f7649abe3ae3599$export$e96fc9a8407faa6b,
      {
        id: "favorite-empty",
        textValue: copy.title,
        className: "favorites-empty-item",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "favorites-empty-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "favorites-empty-card__icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 32, "aria-hidden": "true" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "favorites-empty-card__title", children: copy.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "favorites-empty-card__hint", children: copy.hint }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "favorites-empty-card__actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "favorites-empty-card__cta",
                onClick: () => onNavigate(copy.ctaTarget),
                children: copy.cta
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "favorites-empty-card__link",
                onClick: () => onNavigate("/guide"),
                children: t("homeActions.guideTitle", "\u4F7F\u7528\u6307\u5357")
              }
            )
          ] })
        ] })
      }
    );
  }
);
var SKELETON_CARD_COUNT = 6;
var FavoriteLoadingSkeleton = (0, import_react.memo)(() => {
  const cards = (0, import_react.useMemo)(
    () => Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => i),
    []
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: cards.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    $1f7649abe3ae3599$export$e96fc9a8407faa6b,
    {
      id: `favorite-skeleton-${i}`,
      textValue: "",
      isDisabled: true,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-card", "aria-hidden": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-avatar public-agents__shimmer" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-header-text", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--title public-agents__shimmer" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--subtitle public-agents__shimmer" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__shimmer" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__shimmer" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--short public-agents__shimmer" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-footer", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-pill public-agents__shimmer" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-pill public-agents__skeleton-pill--small public-agents__shimmer" })
        ] })
      ] })
    },
    `skeleton-${i}`
  )) });
});
var FavoritesCollection = (0, import_react.memo)(() => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get("tab") || "all";
  const prewarmedFiltersRef = (0, import_react.useRef)(/* @__PURE__ */ new Set(["all"]));
  const isLoggedIn = useIsLoggedIn();
  const agentKeys = useFavoriteAgentIds();
  const contentKeys = useFavoriteContentIds();
  const favoritedAtById = useFavoriteFavoritedAtById();
  const loading = useFavoritesLoading();
  const initialized = useFavoritesInitialized();
  const error = useFavoritesError();
  (0, import_react.useEffect)(() => {
    if (isLoggedIn && error) {
      toast.error(t("loadFavoriteError", "\u52A0\u8F7D\u6536\u85CF\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"));
    }
  }, [isLoggedIn, error, t]);
  const isLoading = isLoggedIn && (!initialized || loading);
  const totalFavorites = agentKeys.length + contentKeys.length;
  const contentKindCounts = (0, import_react.useMemo)(
    () => contentKeys.reduce(
      (acc, id) => {
        acc[getContentKind(id)] += 1;
        return acc;
      },
      { page: 0, table: 0, image: 0, file: 0, dialog: 0 }
    ),
    [contentKeys]
  );
  const allEntries = (0, import_react.useMemo)(
    () => [
      ...agentKeys.map((id) => ({
        id,
        type: "agent",
        kind: "agent",
        favoritedAt: favoritedAtById[id] || 0
      })),
      ...contentKeys.map((id) => ({
        id,
        type: "content",
        kind: getContentKind(id),
        favoritedAt: favoritedAtById[id] || 0
      }))
    ].sort((a, b) => b.favoritedAt - a.favoritedAt),
    [agentKeys, contentKeys, favoritedAtById]
  );
  const visibleEntries = (0, import_react.useMemo)(
    () => allEntries.filter((entry) => matchesFavoriteFilter(entry, activeFilter)),
    [allEntries, activeFilter]
  );
  (0, import_react.useEffect)(() => {
    if (!initialized || allEntries.length === 0) return;
    allEntries.forEach((entry) => {
      void dispatch(read({ dbKey: entry.id }));
    });
  }, [initialized]);
  const prewarmFilter = (0, import_react.useCallback)(
    (filter) => {
      if (filter === "all" || prewarmedFiltersRef.current.has(filter)) {
        return;
      }
      prewarmedFiltersRef.current.add(filter);
      const warmKeys = allEntries.flatMap(
        (entry) => matchesFavoriteFilter(entry, filter) ? [entry.id] : []
      );
      warmKeys.forEach((dbKey) => {
        void dispatch(read({ dbKey }));
      });
    },
    [allEntries, dispatch]
  );
  const handleFilterChange = (0, import_react.useCallback)(
    (filter) => {
      prewarmFilter(filter);
      if (filter === "all") {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab: filter }, { replace: true });
      }
    },
    [prewarmFilter, setSearchParams]
  );
  const filterOptions = (0, import_react.useMemo)(
    () => [
      {
        id: "all",
        label: t("favoriteFilterAll", "\u5168\u90E8"),
        count: totalFavorites,
        icon: CONTENT_TYPE_META.all.icon
      },
      {
        id: "agent",
        label: t("favoriteFilterAgents", "AI"),
        count: agentKeys.length,
        icon: CONTENT_TYPE_META.agent.icon
      },
      {
        id: "page",
        label: t("favoriteFilterPages", "\u9875\u9762"),
        count: contentKindCounts.page,
        icon: CONTENT_TYPE_META.page.icon
      },
      {
        id: "table",
        label: t("favoriteFilterTables", "\u8868\u683C"),
        count: contentKindCounts.table,
        icon: CONTENT_TYPE_META.table.icon
      },
      {
        id: "image",
        label: t("favoriteFilterImages", "\u56FE\u7247"),
        count: contentKindCounts.image,
        icon: CONTENT_TYPE_META.image.icon
      },
      {
        id: "file",
        label: t("favoriteFilterFiles", "\u6587\u4EF6"),
        count: contentKindCounts.file,
        icon: CONTENT_TYPE_META.file.icon
      },
      {
        id: "dialog",
        label: t("favoriteFilterDialogs", "\u5BF9\u8BDD"),
        count: contentKindCounts.dialog,
        icon: LuMessageSquare
      }
    ],
    [t, totalFavorites, agentKeys.length, contentKindCounts]
  );
  const { openAgent, prefetchAgent } = useAgentCardNavigation();
  const openContent = (0, import_react.useCallback)(
    (contentKey, opts) => {
      const kind = getContentKind(contentKey);
      const path = kind === "dialog" ? buildRoutableContentPath({ contentKey, type: "dialog" }) : `/${contentKey}`;
      if (opts?.newTab) {
        window.open(path, "_blank", "noopener,noreferrer");
        return;
      }
      navigate(path);
    },
    [navigate]
  );
  const renderContent = () => {
    if (!isLoggedIn) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "\u767B\u5F55\u540E\u53EF\u4EE5\u6536\u85CF\u4F60\u5E38\u7528\u7684 AI \u548C\u5185\u5BB9" });
    }
    const showEmptyCard = !isLoading && visibleEntries.length === 0;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "favorites-sections", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Tabs,
        {
          selectedKey: activeFilter,
          onSelectionChange: (key) => handleFilterChange(key),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            TabList,
            {
              "aria-label": t("favoriteFilter", "\u6536\u85CF\u7B5B\u9009"),
              className: "react-aria-TabList favorites-filter__tabs",
              children: filterOptions.map((option) => {
                const TabIcon = option.icon;
                return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  Tab,
                  {
                    id: option.id,
                    className: `react-aria-Tab favorites-filter__tab${activeFilter === option.id ? " is-active" : ""}`,
                    onHoverStart: () => prewarmFilter(option.id),
                    onFocus: () => prewarmFilter(option.id),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabIcon, { size: 14, "aria-hidden": "true" }),
                      option.label
                    ]
                  },
                  option.id
                );
              })
            }
          )
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        $1f7649abe3ae3599$export$a7bfbda1311ca015,
        {
          className: "agents-grid public-agents__grid",
          "aria-label": t("favoriteFilter", "\u6536\u85CF\u7B5B\u9009"),
          layout: "grid",
          selectionMode: "none",
          children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FavoriteLoadingSkeleton, {}) : showEmptyCard ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FavoriteEmptyCard, { filter: activeFilter, onNavigate: navigate }) : visibleEntries.map(
            (entry) => entry.type === "agent" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              FavoriteAgentItem,
              {
                agentKey: entry.id,
                openAgent,
                prefetchAgent
              },
              `agent-${entry.id}`
            ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              FavoriteContentItem,
              {
                contentKey: entry.id,
                openContent
              },
              `content-${entry.id}`
            )
          )
        }
      )
    ] });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: renderContent() });
});
var FavoritesCollection_default = FavoritesCollection;

// packages/app/pages/MyFavoritesPage.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var MyFavoritesPage = () => {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(RequireSignedIn_default, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "MyFavoritesPage", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "MyFavoritesPage__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { children: t("homeTabs.myFavorites", "\u6211\u7684\u6536\u85CF") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t(
        "homeTabs.myFavoritesPageSubtitle",
        "\u628A\u4F60\u6536\u85CF\u7684 AI \u548C\u5185\u5BB9\u96C6\u4E2D\u653E\u5728\u4E00\u4E2A\u9875\u9762\uFF0C\u65B9\u4FBF\u7EE7\u7EED\u4F7F\u7528\u3002"
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(FavoritesCollection_default, {})
  ] }) });
};
var MyFavoritesPage_default = MyFavoritesPage;
export {
  MyFavoritesPage_default as default
};
