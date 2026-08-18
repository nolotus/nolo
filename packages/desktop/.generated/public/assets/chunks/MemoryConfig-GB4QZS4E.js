import {
  TextArea
} from "/public/assets/chunks/chunk-MDRAKVMH.js";
import {
  SettingSection_default
} from "/public/assets/chunks/chunk-32RQLKID.js";
import "/public/assets/chunks/chunk-IOQKDOEC.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  Select,
  SelectItem
} from "/public/assets/chunks/chunk-5LT6KM4O.js";
import "/public/assets/chunks/chunk-AL5TXIK3.js";
import "/public/assets/chunks/chunk-CXTRCW5J.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  useToken
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
  selectCurrentServer,
  selectGlobalPrompt,
  selectKnowledgeCaptureLevel,
  selectSpaceContextLevel,
  selectUserTonePreset,
  setGlobalPrompt,
  setKnowledgeCaptureLevel,
  setSpaceContextLevel,
  setUserTonePreset,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuBrain,
  LuCircleUserRound,
  LuMessageSquareMore,
  LuPlus,
  LuRefreshCw,
  LuScanSearch,
  LuSearch,
  LuSparkles,
  LuTrash2,
  LuX
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

// packages/app/settings/web/MemoryConfig.tsx
var import_react2 = __toESM(require_react());

// packages/app/settings/web/chat-config/useAutoSaveGlobalPrompt.ts
var import_react = __toESM(require_react());
var useAutoSaveGlobalPrompt = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const globalPrompt = useAppSelector(selectGlobalPrompt);
  const [draftPrompt, setDraftPrompt] = (0, import_react.useState)(globalPrompt);
  const [status, setStatus] = (0, import_react.useState)("idle");
  const isSavingOwnUpdate = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (isSavingOwnUpdate.current) {
      isSavingOwnUpdate.current = false;
      return;
    }
    setDraftPrompt(globalPrompt);
  }, [globalPrompt]);
  (0, import_react.useEffect)(() => {
    if (draftPrompt === globalPrompt) return;
    setStatus("idle");
    const timer = setTimeout(() => {
      setStatus("saving");
      isSavingOwnUpdate.current = true;
      dispatch(setGlobalPrompt(draftPrompt)).unwrap().then(() => {
        setStatus("saved");
        toast.success(t("chat.globalPrompt.autoSave.toastSuccess", "\u901A\u7528\u63D0\u793A\u8BCD\u5DF2\u81EA\u52A8\u4FDD\u5B58"));
      }).catch((err) => {
        console.error("Failed to save global prompt", err);
        isSavingOwnUpdate.current = false;
        setStatus("error");
        toast.error(t("chat.globalPrompt.autoSave.toastError", "\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"));
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [draftPrompt, globalPrompt, dispatch, t]);
  return {
    draftPrompt,
    setDraftPrompt,
    status
  };
};

// packages/app/settings/web/MemoryConfig.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var MEMORY_KINDS = ["episodic", "semantic", "procedural"];
var MEMORY_SUBJECT_TYPES = [
  "user",
  "agent",
  "space",
  "project",
  "system"
];
var isMemoryKind = (value) => MEMORY_KINDS.some((kind) => kind === value);
var isMemorySubjectType = (value) => MEMORY_SUBJECT_TYPES.some((subjectType) => subjectType === value);
var isMemoryItem = (value) => {
  if (!value || typeof value !== "object") return false;
  const item = value;
  return typeof item.id === "string" && typeof item.ownerType === "string" && typeof item.ownerId === "string" && typeof item.visibility === "string" && typeof item.content === "string" && typeof item.createdAt === "string" && typeof item.lastActivatedAt === "string" && typeof item.subjectId === "string" && typeof item.activationCount === "number" && typeof item.importance === "number" && typeof item.confidence === "number" && typeof item.kind === "string" && isMemoryKind(item.kind) && typeof item.subjectType === "string" && isMemorySubjectType(item.subjectType);
};
var parseListResponse = (data) => {
  if (!data || typeof data !== "object") return { items: [] };
  const payload = data;
  const rawItems = "items" in payload && Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems.filter(isMemoryItem);
  const nextCursor = "nextCursor" in payload && typeof payload.nextCursor === "string" ? payload.nextCursor : void 0;
  return { items, nextCursor };
};
var formatDateTime = (value) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};
function MemoryConfig() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentToken = useToken();
  const currentServer = useAppSelector(selectCurrentServer);
  const userTonePreset = useAppSelector(selectUserTonePreset);
  const knowledgeCaptureLevel = useAppSelector(selectKnowledgeCaptureLevel);
  const spaceContextLevel = useAppSelector(selectSpaceContextLevel);
  const { draftPrompt, setDraftPrompt, status: promptSaveStatus } = useAutoSaveGlobalPrompt();
  const [items, setItems] = (0, import_react2.useState)([]);
  const [loading, setLoading] = (0, import_react2.useState)(false);
  const [adding, setAdding] = (0, import_react2.useState)(false);
  const [nextCursor, setNextCursor] = (0, import_react2.useState)();
  const [kindFilter, setKindFilter] = (0, import_react2.useState)("");
  const [subjectTypeFilter, setSubjectTypeFilter] = (0, import_react2.useState)("");
  const [searchQuery, setSearchQuery] = (0, import_react2.useState)("");
  const [isAddOpen, setIsAddOpen] = (0, import_react2.useState)(false);
  const hasFilters = kindFilter || subjectTypeFilter || searchQuery;
  const promptSaveHint = (() => {
    if (promptSaveStatus === "saving") {
      return t("chat.globalPrompt.autoSave.saving", "\u6B63\u5728\u4FDD\u5B58\u2026");
    }
    if (promptSaveStatus === "saved") {
      return t("chat.globalPrompt.autoSave.saved", "\u5DF2\u81EA\u52A8\u4FDD\u5B58");
    }
    if (promptSaveStatus === "error") {
      return t(
        "chat.globalPrompt.autoSave.error",
        "\u4FDD\u5B58\u5931\u8D25\uFF0C\u5C06\u5728\u4F60\u7EE7\u7EED\u7F16\u8F91\u540E\u91CD\u8BD5"
      );
    }
    return t(
      "chat.globalPrompt.autoSave.idle",
      "\u5185\u5BB9\u4F1A\u81EA\u52A8\u4FDD\u5B58\uFF0C\u65E0\u9700\u624B\u52A8\u63D0\u4EA4"
    );
  })();
  const clearFilters = (0, import_react2.useCallback)(() => {
    setKindFilter("");
    setSubjectTypeFilter("");
    setSearchQuery("");
  }, []);
  const [newContent, setNewContent] = (0, import_react2.useState)("");
  const [newKind, setNewKind] = (0, import_react2.useState)("semantic");
  const serverBase = (0, import_react2.useMemo)(() => {
    if (!currentServer) return null;
    return currentServer.replace(/\/$/, "");
  }, [currentServer]);
  const authHeaders = (0, import_react2.useMemo)(() => {
    if (!currentToken) return null;
    return { Authorization: `Bearer ${currentToken}` };
  }, [currentToken]);
  const loadItems = (0, import_react2.useCallback)(
    async (cursor) => {
      if (!currentToken || !serverBase) return;
      setLoading(true);
      try {
        const body = { limit: 50 };
        if (cursor) body.cursor = cursor;
        if (kindFilter) body.kind = kindFilter;
        if (subjectTypeFilter) body.subjectType = subjectTypeFilter;
        const res = await fetch(`${serverBase}/api/memory/list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders
          },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error("Failed to load memories");
        const data = await res.json();
        const { items: fetched, nextCursor: nextCursor2 } = parseListResponse(data);
        setItems((prev) => cursor ? [...prev, ...fetched] : fetched);
        setNextCursor(nextCursor2);
      } catch {
        toast.error(t("settings.memory.loadError", "Failed to load memories"));
      } finally {
        setLoading(false);
      }
    },
    [currentToken, serverBase, authHeaders, kindFilter, subjectTypeFilter, t]
  );
  (0, import_react2.useEffect)(() => {
    loadItems();
  }, [loadItems]);
  const handleAdd = async () => {
    if (!currentToken || !serverBase || !newContent.trim()) return;
    setAdding(true);
    try {
      const body = {
        content: newContent.trim(),
        kind: newKind
      };
      const res = await fetch(`${serverBase}/api/memory/remember`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Failed to add memory");
      toast.success(t("settings.memory.addSuccess", "Memory added"));
      setNewContent("");
      await loadItems();
    } catch {
      toast.error(t("settings.memory.addError", "Failed to add memory"));
    } finally {
      setAdding(false);
    }
  };
  const handleDelete = async (id) => {
    if (!currentToken || !serverBase) return;
    if (!window.confirm(t("settings.memory.deleteConfirm", "\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u6761\u8BB0\u5FC6\u5417\uFF1F"))) {
      return;
    }
    try {
      const res = await fetch(`${serverBase}/api/memory/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({ ids: [id], yes: true })
      });
      if (!res.ok) throw new Error("Failed to delete memory");
      toast.success(t("settings.memory.deleteSuccess", "Memory deleted"));
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error(t("settings.memory.deleteError", "Failed to delete memory"));
    }
  };
  const handleKindFilterChange = (value) => {
    setKindFilter(isMemoryKind(value) ? value : "");
  };
  const handleSubjectTypeFilterChange = (value) => {
    setSubjectTypeFilter(isMemorySubjectType(value) ? value : "");
  };
  const handleKindChange = (value) => {
    setNewKind(isMemoryKind(value) ? value : "semantic");
  };
  const filteredItems = (0, import_react2.useMemo)(() => {
    const query = asTrimmedLowercaseString(searchQuery);
    if (!query) return items;
    return items.filter(
      (item) => item.content.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);
  const canManageMemory = Boolean(currentToken && serverBase);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-config-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-config__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-config__header-text", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("settings.memory.title", "\u4E2A\u6027\u5316\u8BBE\u7F6E") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "page-description", children: t(
          "settings.memory.description",
          "\u901A\u7528\u63D0\u793A\u8BCD\u3001\u52A9\u624B\u884C\u4E3A\u504F\u597D\u4E0E\u957F\u671F\u8BB0\u5FC6\uFF0C\u5E2E\u52A9 Nolo \u66F4\u61C2\u4F60\u3002"
        ) })
      ] }),
      canManageMemory && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          variant: "ghost",
          size: "small",
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            LuRefreshCw,
            {
              size: 14,
              className: loading ? "memory-spin" : "",
              "aria-hidden": "true"
            }
          ),
          onClick: () => loadItems(),
          disabled: loading,
          title: t("settings.memory.refresh", "Refresh")
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      SettingSection_default,
      {
        title: t("chat.globalPrompt.title", "\u901A\u7528\u63D0\u793A\u8BCD"),
        description: t(
          "chat.globalPrompt.description",
          "\u7528\u4E8E\u5411\u4E0D\u540C\u7684 AI \u7EDF\u4E00\u4ECB\u7ECD\u4F60\u81EA\u5DF1\u3001\u4F60\u7684\u504F\u597D\u548C\u6C9F\u901A\u98CE\u683C\uFF0C\u8BA9\u6240\u6709 AI \u5728\u7406\u89E3\u4F60\u65F6\u4FDD\u6301\u4E00\u81F4\u3002"
        ),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            TextArea,
            {
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleUserRound, { size: 16, "aria-hidden": "true" }),
              autoResize: true,
              value: draftPrompt,
              onChange: (e) => setDraftPrompt(e.target.value),
              placeholder: t(
                "chat.globalPrompt.placeholder",
                "\u4F8B\u5982\uFF1A\u6211\u662F\u4E00\u540D\u5F00\u53D1\u8005\uFF0C\u559C\u6B22\u7ED3\u6784\u6E05\u6670\u3001\u6761\u7406\u5206\u660E\u7684\u56DE\u7B54\uFF1B\u4EE3\u7801\u90E8\u5206\u8BF7\u5C3D\u91CF\u4F7F\u7528 TypeScript\uFF0C\u5E76\u9644\u7B80\u77ED\u8BF4\u660E\uFF1B\u5F53\u6709\u4E0D\u786E\u5B9A\u7684\u5730\u65B9\u8BF7\u5148\u8BF4\u660E\u5047\u8BBE\u518D\u7ED9\u51FA\u7B54\u6848\u3002"
              )
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "memory-config__save-hint", children: promptSaveHint })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection_default,
      {
        title: t("chat.agentBehavior.title", "Agent \u81EA\u52A8\u5316\u8FB9\u754C"),
        description: t(
          "chat.agentBehavior.description",
          "\u63A7\u5236\u9ED8\u8BA4\u52A9\u624B\u7684\u8868\u8FBE\u98CE\u683C\uFF0C\u4EE5\u53CA\u5B83\u5728\u77E5\u8BC6\u6C89\u6DC0\u548C\u5F53\u524D\u7A7A\u95F4\u8BFB\u53D6\u4E0A\u7684\u4E3B\u52A8\u7A0B\u5EA6\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ChatConfigSections__stack", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ChatConfigSections__subSetting", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ChatConfigSections__subSettingHeader", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ChatConfigSections__subSettingLabel", children: t("chat.agentBehavior.tone.label", "\u504F\u597D\u8BED\u6C14") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ChatConfigSections__subSettingDescription", children: t(
                "chat.agentBehavior.tone.description",
                "\u5F71\u54CD\u52A9\u624B\u9ED8\u8BA4\u600E\u4E48\u548C\u4F60\u8BF4\u8BDD\uFF0C\u4E0D\u4F1A\u8986\u76D6 agent \u81EA\u5DF1\u7684\u6838\u5FC3\u89D2\u8272\u3002"
              ) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ChatConfigSections__inputWithIcon", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMessageSquareMore, { size: 16, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                Select,
                {
                  selectedKey: userTonePreset,
                  onSelectionChange: (key) => {
                    if (key == null) return;
                    dispatch(setUserTonePreset(String(key)));
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "default", textValue: t("chat.agentBehavior.tone.default", "\u9ED8\u8BA4"), children: t("chat.agentBehavior.tone.default", "\u9ED8\u8BA4") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "direct", textValue: t("chat.agentBehavior.tone.direct", "\u76F4\u63A5"), children: t("chat.agentBehavior.tone.direct", "\u76F4\u63A5") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "pragmatic", textValue: t("chat.agentBehavior.tone.pragmatic", "\u52A1\u5B9E"), children: t("chat.agentBehavior.tone.pragmatic", "\u52A1\u5B9E") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "friendly", textValue: t("chat.agentBehavior.tone.friendly", "\u53CB\u597D"), children: t("chat.agentBehavior.tone.friendly", "\u53CB\u597D") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "professional", textValue: t("chat.agentBehavior.tone.professional", "\u4E13\u4E1A"), children: t("chat.agentBehavior.tone.professional", "\u4E13\u4E1A") })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ChatConfigSections__subSetting", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ChatConfigSections__subSettingHeader", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ChatConfigSections__subSettingLabel", children: t("chat.agentBehavior.knowledge.label", "\u77E5\u8BC6\u6C89\u6DC0") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ChatConfigSections__subSettingDescription", children: t(
                "chat.agentBehavior.knowledge.description",
                "\u51B3\u5B9A\u52A9\u624B\u4EC0\u4E48\u65F6\u5019\u53EF\u4EE5\u628A\u7ED3\u679C\u6C89\u6DC0\u6210\u6587\u6863\u6216\u8868\u683C\u3002"
              ) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ChatConfigSections__inputWithIcon", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSparkles, { size: 16, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                Select,
                {
                  selectedKey: knowledgeCaptureLevel,
                  onSelectionChange: (key) => {
                    if (key == null) return;
                    const next = Number(key);
                    if (!Number.isInteger(next) || next < 1) return;
                    dispatch(
                      setKnowledgeCaptureLevel(next)
                    );
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: 1, textValue: t("chat.agentBehavior.knowledge.level1", "1: \u4E0D\u4E3B\u52A8\u521B\u5EFA"), children: t("chat.agentBehavior.knowledge.level1", "1: \u4E0D\u4E3B\u52A8\u521B\u5EFA") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: 2, textValue: t("chat.agentBehavior.knowledge.level2", "2: \u5148\u95EE\u6211\u518D\u521B\u5EFA"), children: t("chat.agentBehavior.knowledge.level2", "2: \u5148\u95EE\u6211\u518D\u521B\u5EFA") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: 3, textValue: t("chat.agentBehavior.knowledge.level3", "3: \u56DE\u7B54\u540E\u5EFA\u8BAE\u521B\u5EFA"), children: t("chat.agentBehavior.knowledge.level3", "3: \u56DE\u7B54\u540E\u5EFA\u8BAE\u521B\u5EFA") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: 4, textValue: t("chat.agentBehavior.knowledge.level4", "4: \u9AD8\u4EF7\u503C\u7ED3\u679C\u53EF\u81EA\u52A8\u521B\u5EFA"), children: t("chat.agentBehavior.knowledge.level4", "4: \u9AD8\u4EF7\u503C\u7ED3\u679C\u53EF\u81EA\u52A8\u521B\u5EFA") })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ChatConfigSections__subSetting", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ChatConfigSections__subSettingHeader", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ChatConfigSections__subSettingLabel", children: t("chat.agentBehavior.space.label", "\u5F53\u524D\u7A7A\u95F4\u8BFB\u53D6") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ChatConfigSections__subSettingDescription", children: t(
                "chat.agentBehavior.space.description",
                "\u51B3\u5B9A\u52A9\u624B\u662F\u5426\u4EE5\u53CA\u5728\u591A\u5927\u7A0B\u5EA6\u4E0A\u81EA\u52A8\u8BFB\u53D6\u5F53\u524D\u7A7A\u95F4\u5185\u5BB9\u3002"
              ) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ChatConfigSections__inputWithIcon", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuScanSearch, { size: 16, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                Select,
                {
                  selectedKey: spaceContextLevel,
                  onSelectionChange: (key) => {
                    if (key == null) return;
                    const next = Number(key);
                    if (!Number.isInteger(next) || next < 1) return;
                    dispatch(setSpaceContextLevel(next));
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: 1, textValue: t("chat.agentBehavior.space.level1", "1: \u4E0D\u81EA\u52A8\u8BFB\u53D6"), children: t("chat.agentBehavior.space.level1", "1: \u4E0D\u81EA\u52A8\u8BFB\u53D6") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: 2, textValue: t("chat.agentBehavior.space.level2", "2: \u53EA\u770B\u7ED3\u6784\u548C\u6807\u9898"), children: t("chat.agentBehavior.space.level2", "2: \u53EA\u770B\u7ED3\u6784\u548C\u6807\u9898") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: 3, textValue: t("chat.agentBehavior.space.level3", "3: \u8F7B\u91CF\u8BFB\u53D6"), children: t("chat.agentBehavior.space.level3", "3: \u8F7B\u91CF\u8BFB\u53D6") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: 4, textValue: t("chat.agentBehavior.space.level4", "4: \u81EA\u9002\u5E94\u8BFB\u53D6"), children: t("chat.agentBehavior.space.level4", "4: \u81EA\u9002\u5E94\u8BFB\u53D6") })
                  ]
                }
              )
            ] })
          ] })
        ] })
      }
    ),
    !canManageMemory ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-config__empty-state", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        LuBrain,
        {
          size: 40,
          className: "memory-config__empty-icon",
          "aria-hidden": "true"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "memory-config__empty-title", children: t("settings.memory.empty", "No memories yet") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "memory-config__empty-description", children: t(
        "settings.memory.loginRequired",
        "Please sign in to manage your memories."
      ) })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        SettingSection_default,
        {
          title: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "memory-config__section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSearch, { size: 14, "aria-hidden": "true" }),
            t("settings.memory.search", "Search memories")
          ] }),
          description: t(
            "settings.memory.searchDescription",
            "Filter your memories by kind, subject type, or content."
          ),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-toolbar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-toolbar__field memory-toolbar__field--grow", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSearch, { size: 14, className: "memory-toolbar__icon", "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "search",
                  placeholder: t("settings.memory.search", "Search memories"),
                  value: searchQuery,
                  onChange: (e) => setSearchQuery(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              Select,
              {
                selectedKey: kindFilter,
                onSelectionChange: (key) => handleKindFilterChange(String(key ?? "")),
                "aria-label": t("settings.memory.kind", "Kind"),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "", textValue: t("settings.memory.allKinds", "All kinds"), children: t("settings.memory.allKinds", "All kinds") }),
                  MEMORY_KINDS.map((kind) => {
                    const label = t(
                      `settings.memory.kind${kind.charAt(0).toUpperCase() + kind.slice(1)}`,
                      kind
                    );
                    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: kind, textValue: label, children: label }, kind);
                  })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              Select,
              {
                selectedKey: subjectTypeFilter,
                onSelectionChange: (key) => handleSubjectTypeFilterChange(String(key ?? "")),
                "aria-label": t("settings.memory.subjectType", "Subject type"),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "", textValue: t("settings.memory.allSubjectTypes", "All subject types"), children: t("settings.memory.allSubjectTypes", "All subject types") }),
                  MEMORY_SUBJECT_TYPES.map((subjectType) => {
                    const label = t(
                      `settings.memory.subjectType${subjectType.charAt(0).toUpperCase() + subjectType.slice(1)}`,
                      subjectType
                    );
                    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: subjectType, textValue: label, children: label }, subjectType);
                  })
                ]
              }
            ),
            hasFilters && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Button_default,
              {
                variant: "ghost",
                size: "small",
                icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 14, "aria-hidden": "true" }),
                onClick: clearFilters,
                title: t("settings.memory.clearFilters", "Clear filters"),
                children: t("settings.memory.clearFilters", "Clear")
              }
            )
          ] })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `memory-add-card ${isAddOpen ? "memory-add-card--open" : ""}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "memory-add-card__toggle",
            onClick: () => setIsAddOpen((prev) => !prev),
            "aria-expanded": isAddOpen,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "memory-add-card__toggle-title", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPlus, { size: 16, "aria-hidden": "true" }),
                t("settings.memory.add", "Add memory")
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "memory-add-card__toggle-hint", children: t("settings.memory.addDescription", "Write a new memory directly to your profile.") })
            ]
          }
        ),
        isAddOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-add-form", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "textarea",
            {
              placeholder: t("settings.memory.content", "Content"),
              value: newContent,
              onChange: (e) => setNewContent(e.target.value),
              rows: 3
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-add-form__row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Select,
              {
                selectedKey: newKind,
                onSelectionChange: (key) => handleKindChange(String(key ?? "")),
                "aria-label": t("settings.memory.kind", "Kind"),
                children: MEMORY_KINDS.map((kind) => {
                  const label = t(
                    `settings.memory.kind${kind.charAt(0).toUpperCase() + kind.slice(1)}`,
                    kind
                  );
                  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: kind, textValue: label, children: label }, kind);
                })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Button_default,
              {
                variant: "primary",
                size: "small",
                icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPlus, { size: 14, "aria-hidden": "true" }),
                onClick: handleAdd,
                disabled: adding || !newContent.trim(),
                loading: adding,
                children: t("settings.memory.submit", "Add")
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "memory-list", children: filteredItems.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBrain, { size: 40, className: "memory-empty__icon", "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "memory-empty__title", children: t("settings.memory.empty", "No memories yet") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "memory-empty__hint", children: t("settings.memory.emptyHint", "Add a memory to help Nolo personalize your experience.") })
      ] }) : filteredItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-card__header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-card__badges", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `memory-kind memory-kind--${item.kind}`, children: t(
              `settings.memory.kind${item.kind.charAt(0).toUpperCase() + item.kind.slice(1)}`,
              item.kind
            ) }),
            item.facet && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "memory-facet", children: item.facet }),
            item.tags && item.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "memory-tags", children: item.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "memory-tag", children: tag }, tag)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              variant: "ghost",
              size: "small",
              className: "memory-card__delete",
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 14, "aria-hidden": "true" }),
              onClick: () => handleDelete(item.id),
              title: t("settings.memory.delete", "Delete memory")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "memory-card__content", children: item.content }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "memory-card__meta", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "memory-card__meta-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "memory-card__meta-label", children: t("settings.memory.subjectType", "Subject") }),
            t(
              `settings.memory.subjectType${item.subjectType.charAt(0).toUpperCase() + item.subjectType.slice(1)}`,
              item.subjectType
            ),
            "/",
            item.subjectId
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "memory-card__meta-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "memory-card__meta-label", children: t("settings.memory.createdAt", "Created") }),
            formatDateTime(item.createdAt)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "memory-card__meta-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "memory-card__meta-label", children: t("settings.memory.importance", "Importance") }),
            item.importance.toFixed(2)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "memory-card__meta-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "memory-card__meta-label", children: t("settings.memory.confidence", "Confidence") }),
            item.confidence.toFixed(2)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "memory-card__meta-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "memory-card__meta-label", children: t("settings.memory.activations", "Activations") }),
            item.activationCount
          ] })
        ] })
      ] }, item.id)) }),
      nextCursor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          variant: "secondary",
          size: "small",
          onClick: () => loadItems(nextCursor),
          disabled: loading,
          block: true,
          children: t("settings.memory.more", "Load more")
        }
      )
    ] })
  ] });
}
export {
  MemoryConfig as default,
  parseListResponse
};
