import {
  PublicAgentsList_default
} from "/public/assets/chunks/chunk-HBS3PDZZ.js";
import "/public/assets/chunks/chunk-7W3NEOUM.js";
import "/public/assets/chunks/chunk-VR5RNFCD.js";
import {
  buildStaticPageMeta,
  usePageMeta
} from "/public/assets/chunks/chunk-M4PBN5X7.js";
import "/public/assets/chunks/chunk-5GGTP5ZM.js";
import "/public/assets/chunks/chunk-U6SGTC52.js";
import "/public/assets/chunks/chunk-JJGKUQA3.js";
import "/public/assets/chunks/chunk-D2IAHGBR.js";
import {
  ShareCommunityPreview_default
} from "/public/assets/chunks/chunk-7W7GHETY.js";
import "/public/assets/chunks/chunk-TCYK5LBJ.js";
import "/public/assets/chunks/chunk-XCKMPAB4.js";
import "/public/assets/chunks/chunk-ZSRWC4Y4.js";
import "/public/assets/chunks/chunk-WOLEEY5H.js";
import "/public/assets/chunks/chunk-JQ6XROM5.js";
import "/public/assets/chunks/chunk-CA74EWBF.js";
import "/public/assets/chunks/chunk-FYMUXPF2.js";
import "/public/assets/chunks/chunk-UFYPTJWC.js";
import "/public/assets/chunks/chunk-EOM4G5HF.js";
import {
  SearchInput_default
} from "/public/assets/chunks/chunk-6RIRH2EC.js";
import "/public/assets/chunks/chunk-ZCACUALD.js";
import "/public/assets/chunks/chunk-7HVHEMQ3.js";
import "/public/assets/chunks/chunk-NLX7YQL6.js";
import {
  usePublicAgents
} from "/public/assets/chunks/chunk-5SG4AG33.js";
import "/public/assets/chunks/chunk-GYU2TA6X.js";
import "/public/assets/chunks/chunk-4JMBIZX5.js";
import {
  Tab,
  TabList,
  Tabs
} from "/public/assets/chunks/chunk-ZY3QGHFY.js";
import "/public/assets/chunks/chunk-2CATDSNY.js";
import "/public/assets/chunks/chunk-7HTHEFUV.js";
import "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-M5DXP5RW.js";
import "/public/assets/chunks/chunk-5IJJ57JD.js";
import "/public/assets/chunks/chunk-VCSNZD3S.js";
import "/public/assets/chunks/chunk-MFOH33JJ.js";
import "/public/assets/chunks/chunk-IHMA4QTO.js";
import "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  NavLink,
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuArrowDown,
  LuArrowUp,
  LuChevronRight,
  LuImage,
  LuSparkles,
  LuStar
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

// packages/ai/agent/web/AgentExplore.tsx
var import_react2 = __toESM(require_react());

// packages/ai/agent/web/PublicAgents.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var DEBOUNCE_DELAY = 300;
var PublicAgents = (0, import_react.memo)(
  ({
    limit = 20,
    initialData,
    reloadMode = "catalog",
    summary = false
  }) => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const sortBy = searchParams.get("sort") || "recommended";
    const visualOutputOnly = searchParams.get("visualOutput") === "1";
    const urlSearch = searchParams.get("q") || "";
    const [searchTerm, setSearchTerm] = (0, import_react.useState)(urlSearch);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = (0, import_react.useState)(urlSearch);
    (0, import_react.useEffect)(() => {
      if (urlSearch !== searchTerm) {
        setSearchTerm(urlSearch);
        setDebouncedSearchTerm(urlSearch);
      }
    }, [urlSearch]);
    (0, import_react.useEffect)(() => {
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (searchTerm) next.set("q", searchTerm);
          else next.delete("q");
          return next;
        });
      }, DEBOUNCE_DELAY);
      return () => clearTimeout(timer);
    }, [searchTerm, setSearchParams]);
    const { loading, error, data, retry } = usePublicAgents({
      limit,
      sortBy,
      searchName: debouncedSearchTerm,
      imageOutputOnly: visualOutputOnly,
      summary,
      initialData,
      reloadMode
    });
    const handleRecommendedSortClick = () => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("sort");
        return next;
      });
    };
    const handleNewestSortClick = () => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("sort", "newest");
        return next;
      });
    };
    const handlePriceSortClick = () => {
      const nextSort = sortBy === "outputPriceAsc" ? "outputPriceDesc" : "outputPriceAsc";
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("sort", nextSort);
        return next;
      });
    };
    const handleFavoriteSortClick = () => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (sortBy === "favorite") {
          next.delete("sort");
        } else {
          next.set("sort", "favorite");
        }
        return next;
      });
    };
    const handleVisualOutputFilterClick = () => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (visualOutputOnly) {
          next.delete("visualOutput");
        } else {
          next.set("visualOutput", "1");
        }
        return next;
      });
    };
    const handleSearchClear = () => {
      setSearchTerm("");
      setDebouncedSearchTerm("");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("q");
        return next;
      });
    };
    const handleSearchSubmit = () => {
      setDebouncedSearchTerm(searchTerm);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchTerm) next.set("q", searchTerm);
        else next.delete("q");
        return next;
      });
    };
    if (error) {
      toast.error(t("publicAgents.loadFailed", "\u52A0\u8F7D\u5217\u8868\u5931\u8D25"));
      return null;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__controls", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__left", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__search", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            SearchInput_default,
            {
              value: searchTerm,
              onChange: setSearchTerm,
              onSearch: handleSearchSubmit,
              onClear: handleSearchClear,
              placeholder: t("publicAgents.searchPlaceholder", "\u641C\u7D22 AI \u52A9\u624B..."),
              className: "public-agents__search-input"
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: "public-agents__filter-chip" + (visualOutputOnly ? " public-agents__filter-chip--active" : ""),
              onClick: handleVisualOutputFilterClick,
              "aria-pressed": visualOutputOnly,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuImage, { size: 14, "aria-hidden": "true" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("publicAgents.filterImageGeneration", "\u53EF\u751F\u6210\u56FE\u7247") })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__sort", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "public-agents__sort-label", children: t("publicAgents.sortLabel", "\u6392\u5E8F:") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: "public-agents__sort-pill" + (sortBy === "recommended" ? " public-agents__sort-pill--active" : ""),
              onClick: handleRecommendedSortClick,
              "aria-pressed": sortBy === "recommended",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("publicAgents.sortRecommended", "\u63A8\u8350") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "public-agents__sort-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSparkles, { size: 14 }) })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "public-agents__sort-pill" + (sortBy === "newest" ? " public-agents__sort-pill--active" : ""),
              onClick: handleNewestSortClick,
              "aria-pressed": sortBy === "newest",
              children: t("publicAgents.sortNewest", "\u6700\u65B0\u53D1\u5E03")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: "public-agents__sort-pill" + (sortBy?.includes("Price") ? " public-agents__sort-pill--active" : ""),
              onClick: handlePriceSortClick,
              "aria-pressed": Boolean(sortBy?.includes("Price")),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("publicAgents.sortPrice", "\u4EF7\u683C") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "public-agents__sort-icon", "aria-hidden": "true", children: [
                  sortBy === "outputPriceAsc" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowUp, { size: 14 }),
                  sortBy === "outputPriceDesc" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowDown, { size: 14 }),
                  !sortBy?.includes("Price") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowUp, { size: 14, style: { opacity: 0.3 } })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: "public-agents__sort-pill" + (sortBy === "favorite" ? " public-agents__sort-pill--active" : ""),
              onClick: handleFavoriteSortClick,
              "aria-pressed": sortBy === "favorite",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("publicAgents.sortFavorite", "\u6536\u85CF") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "public-agents__sort-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuStar, { size: 14, style: { fill: sortBy === "favorite" ? "currentColor" : "none" } }) })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        PublicAgentsList_default,
        {
          loading,
          error,
          data,
          reload: retry
        }
      )
    ] });
  }
);
PublicAgents.displayName = "PublicAgents";
var PublicAgents_default = PublicAgents;

// packages/ai/agent/web/AgentExplore.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var AgentExplore = () => {
  const { t } = useTranslation();
  const pageMeta = (0, import_react2.useMemo)(() => buildStaticPageMeta(t, "explore"), [t]);
  usePageMeta(pageMeta);
  const [activeTab, setActiveTab] = (0, import_react2.useState)("aiPlaza");
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "agent-explore", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "agent-explore__inner", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "agent-explore-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { className: "agent-explore-title", children: t("explorePage.title", "\u63A2\u7D22") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "agent-explore-subtitle", children: t("explorePage.subtitle", "\u53D1\u73B0\u5E76\u63A2\u7D22\u66F4\u591A AI") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Tabs,
      {
        selectedKey: activeTab,
        onSelectionChange: (key) => setActiveTab(key),
        className: "agent-explore-tabs",
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(TabList, { "aria-label": t("explorePage.title", "\u63A2\u7D22"), className: "agent-explore-tablist", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Tab, { id: "aiPlaza", className: "agent-explore-tab", children: t("homeTabs.aiPlaza", "AI \u5E7F\u573A") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Tab, { id: "shareCommunity", className: "agent-explore-tab", children: t("homeTabs.shareCommunity", "\u793E\u533A\u5206\u4EAB") })
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "agent-explore-content", children: activeTab === "aiPlaza" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PublicAgents_default, { limit: 200, reloadMode: "catalog", summary: true }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "agent-explore-community", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ShareCommunityPreview_default, { active: activeTab === "shareCommunity" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "agent-explore-community-footer", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(NavLink, { to: "/share/community", className: "agent-explore-community-link", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("homeTabs.enterCommunity", "\u8FDB\u5165\u793E\u533A") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuChevronRight, { size: 16, "aria-hidden": "true" })
      ] }) })
    ] }) })
  ] }) });
};
var AgentExplore_default = AgentExplore;
export {
  AgentExplore_default as default
};
