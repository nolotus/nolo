import {
  getSpaceContentTypeLabel
} from "/public/assets/chunks/chunk-DIIGCR3J.js";
import {
  ATTACHMENT_SUB_FILTERS,
  ATTACHMENT_SUB_TAB_IDS,
  PRIMARY_CONTENT_FILTERS
} from "/public/assets/chunks/chunk-WULKCFMZ.js";
import "/public/assets/chunks/chunk-VGCTNZHU.js";
import {
  useUserData
} from "/public/assets/chunks/chunk-QADHV2NS.js";
import "/public/assets/chunks/chunk-APUNFOYF.js";
import "/public/assets/chunks/chunk-GYU2TA6X.js";
import "/public/assets/chunks/chunk-SDMAWFBN.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  MY_CONTENT_USER_DATA_TYPES,
  buildMyContentItemsFromUserData,
  buildMyContentPreviewItems,
  resolveMyContentTab
} from "/public/assets/chunks/chunk-Y3JDDU5C.js";
import "/public/assets/chunks/chunk-G4VE62AJ.js";
import "/public/assets/chunks/chunk-7PX5UKK4.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  buildRestorePatch,
  getDeleteErrorMessage,
  isDialogKey,
  patch,
  purge,
  selectAllMemberSpaces,
  selectRemoteServer,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuFile,
  LuRotateCcw,
  LuSearch,
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
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
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

// packages/life/web/RecycleBin.tsx
var import_react2 = __toESM(require_react(), 1);

// packages/app/hooks/useTrashedContentItems.ts
var import_react = __toESM(require_react());
function useTrashedContentItems() {
  const currentServer = useAppSelector(selectRemoteServer);
  const userId = useUserId() ?? "";
  const hasUser = userId.trim().length > 0;
  const memberSpaces = useAppSelector(selectAllMemberSpaces);
  const { data: records, loading } = useUserData(
    MY_CONTENT_USER_DATA_TYPES,
    userId,
    500,
    {
      trashOnly: true,
      partialDataStrategy: "hydrated-cache",
      remoteSummary: true
    }
  );
  const spaceNameById = (0, import_react.useMemo)(
    () => new Map(
      memberSpaces.map((space) => [
        space.spaceId,
        space.spaceName || space.spaceId
      ])
    ),
    [memberSpaces]
  );
  const items = (0, import_react.useMemo)(
    () => buildMyContentItemsFromUserData(
      records,
      currentServer,
      spaceNameById,
      "\u6211\u7684\u5E94\u7528",
      "\u6211\u7684\u5185\u5BB9"
    ),
    [records, currentServer, spaceNameById]
  );
  return {
    items,
    loading: hasUser && loading
  };
}

// packages/life/web/RecycleBin.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var TABS = [
  ...PRIMARY_CONTENT_FILTERS.filter((tab) => tab.id !== "all"),
  ...ATTACHMENT_SUB_FILTERS
];
var RecycleBin = () => {
  const { t } = useTranslation();
  const { t: tSpace } = useTranslation("space");
  const dispatch = useAppDispatch();
  const { items, loading } = useTrashedContentItems();
  const [activeTab, setActiveTab] = (0, import_react2.useState)("all");
  const [searchQuery, setSearchQuery] = (0, import_react2.useState)("");
  const [busyKeys, setBusyKeys] = (0, import_react2.useState)({});
  const filtered = (0, import_react2.useMemo)(() => {
    const query = asTrimmedLowercaseString(searchQuery);
    return items.filter((item) => {
      const itemTab = resolveMyContentTab(item);
      if (activeTab !== "all") {
        if (activeTab === "attachment") {
          if (!ATTACHMENT_SUB_TAB_IDS.has(itemTab)) return false;
        } else if (itemTab !== activeTab) {
          return false;
        }
      }
      if (!query) return true;
      return item.title?.toLowerCase().includes(query) || item.spaceName?.toLowerCase().includes(query);
    });
  }, [activeTab, items, searchQuery]);
  const visibleItems = (0, import_react2.useMemo)(
    () => buildMyContentPreviewItems(filtered, void 0, activeTab),
    [filtered, activeTab]
  );
  const setBusy = (0, import_react2.useCallback)((key, value) => {
    setBusyKeys((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleRestore = (0, import_react2.useCallback)(
    async (item) => {
      const key = item.contentKey;
      if (busyKeys[key]) return;
      setBusy(key, true);
      try {
        await dispatch(
          patch({
            dbKey: key,
            changes: buildRestorePatch((/* @__PURE__ */ new Date()).toISOString()),
            preferredServerOrigin: item.serverOrigin ?? null
          })
        ).unwrap();
        toast.success(t("recycleBin.restored", "\u5DF2\u6062\u590D"));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("nolo-user-data-updated"));
        }
      } catch (err) {
        toast.error(
          getDeleteErrorMessage(err, t("recycleBin.restoreFailed", "\u6062\u590D\u5931\u8D25"))
        );
      } finally {
        setBusy(key, false);
      }
    },
    [busyKeys, dispatch, setBusy, t]
  );
  const handlePurge = (0, import_react2.useCallback)(
    async (item) => {
      const key = item.contentKey;
      if (busyKeys[key]) return;
      if (!window.confirm(t("recycleBin.purgeConfirm", "\u6C38\u4E45\u5220\u9664\u540E\u65E0\u6CD5\u6062\u590D\uFF0C\u786E\u5B9A\u7EE7\u7EED\uFF1F"))) {
        return;
      }
      setBusy(key, true);
      try {
        await dispatch(
          purge({
            dbKey: key,
            preferredServerOrigin: item.serverOrigin ?? null
          })
        ).unwrap();
        toast.success(t("recycleBin.purged", "\u5DF2\u6C38\u4E45\u5220\u9664"));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("nolo-user-data-updated"));
        }
      } catch (err) {
        toast.error(
          getDeleteErrorMessage(err, t("recycleBin.purgeFailed", "\u6C38\u4E45\u5220\u9664\u5931\u8D25"))
        );
      } finally {
        setBusy(key, false);
      }
    },
    [busyKeys, dispatch, setBusy, t]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "MyContentPage", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "MyContentPage__header", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "MyContentPage__header-row", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: t("recycleBin.title", "\u56DE\u6536\u7AD9") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t(
        "recycleBin.subtitle",
        "\u5DF2\u5220\u9664\u7684\u5BF9\u8BDD\u3001\u6587\u6863\u3001\u8868\u683C\u3001\u5E94\u7528\u3001\u56FE\u7247\u548C\u9644\u4EF6\u4F1A\u6682\u5B58\u8FD9\u91CC\uFF0C\u53EF\u4EE5\u6062\u590D\u6216\u6C38\u4E45\u5220\u9664\u3002"
      ) })
    ] }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "RecycleBin__toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "MyContentCollection__search", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSearch, { size: 15, className: "MyContentCollection__search-icon", "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "search",
            value: searchQuery,
            onChange: (event) => setSearchQuery(event.target.value),
            placeholder: tSpace("search_placeholder", "\u641C\u7D22\u5185\u5BB9..."),
            className: "MyContentCollection__search-input"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "RecycleBin__tabs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            size: "small",
            variant: activeTab === "all" ? "secondary" : "ghost",
            onClick: () => setActiveTab("all"),
            "aria-pressed": activeTab === "all",
            children: tSpace("all", "\u5168\u90E8")
          }
        ),
        TABS.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            size: "small",
            variant: activeTab === tab.id ? "secondary" : "ghost",
            onClick: () => setActiveTab(tab.id),
            "aria-pressed": activeTab === tab.id,
            children: tSpace(tab.shortLabelKey, tab.shortDefaultLabel)
          },
          tab.id
        ))
      ] })
    ] }),
    loading && visibleItems.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "RecycleBin__status", children: t("loading", "\u52A0\u8F7D\u4E2D...") }) : visibleItems.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "RecycleBin__empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "RecycleBin__empty-title", children: t("recycleBin.empty", "\u56DE\u6536\u7AD9\u662F\u7A7A\u7684") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "RecycleBin__empty-hint", children: t(
        "recycleBin.emptyHint",
        "\u5220\u9664\u7684\u5185\u5BB9\u4F1A\u81EA\u52A8\u8FDB\u5165\u56DE\u6536\u7AD9\uFF0C\u5230\u671F\u6E05\u7406\u4E4B\u524D\u90FD\u53EF\u4EE5\u6062\u590D\u3002"
      ) })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "RecycleBin__grid", children: visibleItems.map((item) => {
      const itemTab = resolveMyContentTab(item);
      const typeLabel = getSpaceContentTypeLabel(
        {
          type: item.type,
          contentKey: item.contentKey,
          fileCategory: "fileCategory" in item ? item.fileCategory : void 0
        },
        tSpace
      );
      const isDialog = isDialogKey(item.contentKey);
      const busy = Boolean(busyKeys[item.contentKey]);
      const updatedAt = new Date(item.updatedAt).toLocaleString();
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "RecycleBin__card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "RecycleBin__card-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "MyContentCollection__icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuFile, { size: 16 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "MyContentCollection__type", children: typeLabel })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "RecycleBin__title", title: item.title, children: item.title || tSpace("unnamed", "\u672A\u547D\u540D") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "RecycleBin__meta", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.spaceName }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: updatedAt })
        ] }),
        isDialog ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "RecycleBin__hint", children: t(
          "recycleBin.dialogMessageLoss",
          "\u6062\u590D\u540E\u53EA\u4FDD\u7559\u5BF9\u8BDD\u914D\u7F6E\uFF0C\u6D88\u606F\u8BB0\u5F55\u65E0\u6CD5\u627E\u56DE\u3002"
        ) }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "RecycleBin__actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              size: "small",
              variant: "secondary",
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRotateCcw, { size: 14 }),
              disabled: busy,
              onClick: () => handleRestore(item),
              children: t("recycleBin.restore", "\u6062\u590D")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              size: "small",
              variant: "ghost",
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 14 }),
              disabled: busy,
              onClick: () => handlePurge(item),
              children: t("recycleBin.purge", "\u6C38\u4E45\u5220\u9664")
            }
          )
        ] })
      ] }, item.contentKey);
    }) })
  ] });
};
var RecycleBin_default = RecycleBin;
export {
  RecycleBin_default as default
};
