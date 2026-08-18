import {
  formatProviderModelLine
} from "/public/assets/chunks/chunk-WVPNWA2V.js";
import {
  resolveDialogLaunchSpaceId,
  useAgentDialog
} from "/public/assets/chunks/chunk-UFYPTJWC.js";
import {
  Avatar_default
} from "/public/assets/chunks/chunk-EOM4G5HF.js";
import {
  resolvePreferredAppRuntimeUrl
} from "/public/assets/chunks/chunk-II3ADNT6.js";
import {
  foldHomePath
} from "/public/assets/chunks/chunk-DBB6IKZV.js";
import {
  FileItem
} from "/public/assets/chunks/chunk-5UVYUAHU.js";
import {
  Editor_default,
  List,
  SafeLink,
  TextBlockRenderer
} from "/public/assets/chunks/chunk-GJISU6WO.js";
import {
  ImagePreviewModal_default
} from "/public/assets/chunks/chunk-ZDGJ4DJD.js";
import {
  GUIDED_AGENT_CAPABILITIES
} from "/public/assets/chunks/chunk-CJFHNPRU.js";
import {
  resolveAppRouteKey
} from "/public/assets/chunks/chunk-G4VE62AJ.js";
import {
  markdownToSlate
} from "/public/assets/chunks/chunk-AWGGOX2H.js";
import {
  createDocState
} from "/public/assets/chunks/chunk-VPSYWRNH.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import {
  useLocation,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useStore
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  TOOL_OUTPUT_PREVIEW_CHARS,
  TOOL_OUTPUT_PREVIEW_LINES,
  buildActivityTimeline,
  createAgentKey,
  createToolNameTranslator,
  formatToolGroupHeaderSummary,
  handleSendMessage,
  previewToolText,
  readFileContent,
  selectCurrentDialogConfig,
  selectCurrentSpaceId,
  selectShowThinking,
  shouldPreviewToolText,
  toTrimmedString,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  LuArrowRight,
  LuBot,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuChevronUp,
  LuCircle,
  LuCircleAlert,
  LuCopy,
  LuCpu,
  LuDatabase,
  LuDownload,
  LuExternalLink,
  LuFileDiff,
  LuFileText,
  LuFileWarning,
  LuHistory,
  LuImage,
  LuLoaderCircle,
  LuMonitor,
  LuSave,
  LuShieldAlert,
  LuShieldCheck,
  LuSparkles,
  LuTable,
  LuTerminal,
  LuTrash2,
  LuTriangle,
  LuUsers,
  LuVideo,
  LuWrench
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  buildAppEditorPath
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  asOptionalFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/hooks/useMessageInteraction.ts
var import_react = __toESM(require_react());
var isTouchDevice = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const canHover = typeof window.matchMedia === "function" ? window.matchMedia("(hover: hover) and (pointer: fine)").matches : false;
  if (canHover) return false;
  const coarsePointer = typeof window.matchMedia === "function" ? window.matchMedia("(pointer: coarse)").matches : false;
  if (coarsePointer) return true;
  return navigator.maxTouchPoints > 0;
};
var triggerHapticFeedback = (duration = 50) => {
  if (navigator.vibrate) {
    navigator.vibrate(duration);
  }
};
var isInteractiveElement = (target) => {
  const isOriginalInteractive = target.closest(".actions") || target.closest(".actions-overlay") || target.closest("button") || target.closest(".thinking-toggle") || target.closest(".msg-image") || target.closest("a") || target.closest("input") || target.closest("textarea") || target.closest("[contenteditable]");
  if (isOriginalInteractive) return true;
  const isTextContent = target.closest(".message-text") || target.closest(".simple-text") || target.closest(".thinking-editor") || target.matches(".message-text") || target.matches(".simple-text") || target.matches(".thinking-editor");
  if (isTextContent) {
    return "text-content";
  }
  return false;
};
var INTERACTION_CONFIG = {
  LONG_PRESS_DELAY: 500,
  INTENT_CHECK_DELAY: 100,
  SELECTION_THRESHOLD: 10,
  DRAG_THRESHOLD: 30,
  MENU_HEIGHT: 200,
  RESET_DELAY: 100
};
var useMessageInteraction = ({
  messageId,
  onToggleActions
}) => {
  const [showActions, setShowActions] = (0, import_react.useState)(false);
  const timersRef = (0, import_react.useRef)({
    longPress: null,
    intentCheck: null,
    reset: null
  });
  const touchStateRef = (0, import_react.useRef)(null);
  const interactionStateRef = (0, import_react.useRef)({
    isTextSelectionMode: false,
    selectionStarted: false,
    isDragging: false
  });
  const cleanupFnsRef = (0, import_react.useRef)(/* @__PURE__ */ new Map());
  const isTouch = isTouchDevice();
  const ensureOptimalViewPosition = (0, import_react.useCallback)(
    (messageElement, touchY) => {
      const rect = messageElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isBottomObscured = rect.bottom > viewportHeight - INTERACTION_CONFIG.MENU_HEIGHT;
      const isTouchInLowerHalf = touchY > viewportHeight / 2;
      if (isBottomObscured || isTouchInLowerHalf) {
        const scrollTarget = Math.max(
          0,
          window.scrollY + rect.bottom - viewportHeight + INTERACTION_CONFIG.MENU_HEIGHT + 20
        );
        setTimeout(() => {
          window.scrollTo({
            top: scrollTarget,
            behavior: "smooth"
          });
        }, INTERACTION_CONFIG.INTENT_CHECK_DELAY);
      }
    },
    []
  );
  const clearAllTimers = (0, import_react.useCallback)(() => {
    Object.values(timersRef.current).forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
    timersRef.current = {
      longPress: null,
      intentCheck: null,
      reset: null
    };
  }, []);
  const clearTextSelection = (0, import_react.useCallback)(() => {
    const textElements = document.querySelectorAll(
      ".message-text, .simple-text, .thinking-editor"
    );
    textElements.forEach((el) => {
      const htmlEl = el;
      htmlEl.style.userSelect = "";
      htmlEl.style.webkitUserSelect = "";
      const cleanup = cleanupFnsRef.current.get(el);
      if (cleanup) {
        cleanup();
        cleanupFnsRef.current.delete(el);
      }
    });
  }, []);
  const resetInteractionState = (0, import_react.useCallback)(() => {
    interactionStateRef.current = {
      isTextSelectionMode: false,
      selectionStarted: false,
      isDragging: false
    };
    touchStateRef.current = null;
  }, []);
  const handleClick = (0, import_react.useCallback)(
    (e) => {
      if (isTouch) return;
      if (isInteractiveElement(e.target)) return;
      onToggleActions();
    },
    [isTouch, onToggleActions]
  );
  const handleTouchStart = (0, import_react.useCallback)(
    (e) => {
      if (!isTouch) return;
      const interactiveCheck = isInteractiveElement(e.target);
      if (interactiveCheck === true) return;
      const touch = e.touches[0];
      touchStateRef.current = { x: touch.clientX, y: touch.clientY };
      resetInteractionState();
      clearAllTimers();
      const targetElement = e.target;
      if (interactiveCheck === "text-content") {
        const textElement = targetElement.closest(
          ".message-text, .simple-text, .thinking-editor"
        );
        timersRef.current.intentCheck = window.setTimeout(() => {
          if (!interactionStateRef.current.isDragging && !interactionStateRef.current.selectionStarted) {
            e.preventDefault();
            if (textElement) {
              const htmlEl = textElement;
              htmlEl.style.userSelect = "none";
              htmlEl.style.webkitUserSelect = "none";
            }
          }
        }, INTERACTION_CONFIG.INTENT_CHECK_DELAY);
        timersRef.current.longPress = window.setTimeout(() => {
          if (!interactionStateRef.current.isDragging && !interactionStateRef.current.isTextSelectionMode) {
            const messageElement = targetElement.closest(".msg");
            if (messageElement) {
              ensureOptimalViewPosition(messageElement, touch.clientY);
            }
            setShowActions(true);
            triggerHapticFeedback();
          }
        }, INTERACTION_CONFIG.LONG_PRESS_DELAY);
        const handleSelectionStart = () => {
          interactionStateRef.current.selectionStarted = true;
          interactionStateRef.current.isTextSelectionMode = true;
          clearAllTimers();
        };
        const abortController = new AbortController();
        document.addEventListener("selectionchange", handleSelectionStart, {
          once: true,
          signal: abortController.signal
        });
        const cleanup = () => {
          abortController.abort();
          clearAllTimers();
        };
        cleanupFnsRef.current.set(targetElement, cleanup);
      } else {
        timersRef.current.longPress = window.setTimeout(() => {
          if (!interactionStateRef.current.isDragging) {
            const messageElement = targetElement.closest(".msg");
            if (messageElement) {
              ensureOptimalViewPosition(messageElement, touch.clientY);
            }
            setShowActions(true);
            triggerHapticFeedback();
          }
        }, INTERACTION_CONFIG.LONG_PRESS_DELAY);
      }
    },
    [isTouch, ensureOptimalViewPosition, clearAllTimers, resetInteractionState]
  );
  const handleTouchMove = (0, import_react.useCallback)(
    (e) => {
      if (!isTouch || !touchStateRef.current) return;
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStateRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStateRef.current.y);
      const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (moveDistance > INTERACTION_CONFIG.SELECTION_THRESHOLD && !interactionStateRef.current.isTextSelectionMode) {
        if (moveDistance > INTERACTION_CONFIG.DRAG_THRESHOLD) {
          interactionStateRef.current.isDragging = true;
          clearAllTimers();
        } else {
          const interactiveCheck = isInteractiveElement(e.target);
          if (interactiveCheck === "text-content") {
            interactionStateRef.current.isTextSelectionMode = true;
          }
        }
      }
    },
    [isTouch, clearAllTimers]
  );
  const handleTouchEnd = (0, import_react.useCallback)(() => {
    if (!isTouch) return;
    clearAllTimers();
    clearTextSelection();
    timersRef.current.reset = window.setTimeout(() => {
      resetInteractionState();
    }, INTERACTION_CONFIG.RESET_DELAY);
  }, [isTouch, clearAllTimers, clearTextSelection, resetInteractionState]);
  (0, import_react.useEffect)(() => {
    let timeoutId;
    const handleSelectionChange = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          setShowActions(false);
        }
      }, 50);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      clearTimeout(timeoutId);
    };
  }, []);
  (0, import_react.useEffect)(() => {
    if (!showActions) return;
    const handleOutsideClick = (e) => {
      const target = e.target;
      if (target.closest(".actions-overlay")) return;
      const msgElement = target.closest(".msg");
      const currentMsg = target.closest(`[data-message-id="${messageId}"]`);
      if (msgElement && !currentMsg || !msgElement) {
        setShowActions(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("click", handleOutsideClick, true);
      document.addEventListener("touchend", handleOutsideClick, true);
    }, INTERACTION_CONFIG.INTENT_CHECK_DELAY);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleOutsideClick, true);
      document.removeEventListener("touchend", handleOutsideClick, true);
    };
  }, [showActions, messageId]);
  (0, import_react.useEffect)(() => {
    return () => {
      clearAllTimers();
      clearTextSelection();
      resetInteractionState();
    };
  }, [clearAllTimers, clearTextSelection, resetInteractionState]);
  return {
    isTouch,
    showActions,
    setShowActions,
    handleClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};

// packages/chat/messages/web/ToolMessageGroup.tsx
var import_react9 = __toESM(require_react());

// packages/chat/messages/web/toolMessageShared.tsx
var import_react2 = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var safeParse = (content) => {
  if (typeof content === "object" && content !== null) return content;
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
};
var StatusIcon = ({
  status,
  toolName
}) => {
  if (status === "running") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircle, { className: "icon-primary", "aria-hidden": "true" });
  if (status === "repairing") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircle, { className: "icon-warning", "aria-hidden": "true" });
  if (status === "failed") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleAlert, { className: "icon-error", "aria-hidden": "true" });
  if (status === "pending") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircle, { className: "icon-muted", "aria-hidden": "true" });
  if (toolName === "createWorkflow") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTerminal, { className: "icon-info", "aria-hidden": "true" });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { className: "icon-success", "aria-hidden": "true" });
};
var CollapsibleToolText = ({
  text,
  className,
  charLimit = TOOL_OUTPUT_PREVIEW_CHARS,
  lineLimit = TOOL_OUTPUT_PREVIEW_LINES,
  expandLabel,
  collapseLabel = "\u6536\u8D77"
}) => {
  const [expanded, setExpanded] = (0, import_react2.useState)(false);
  const meta = (0, import_react2.useMemo)(
    () => previewToolText(text ?? "", charLimit, lineLimit),
    [text, charLimit, lineLimit]
  );
  const display = expanded || !meta.truncated ? text : meta.preview;
  const defaultExpandLabel = `\u5C55\u5F00\u5168\u90E8 (${meta.totalChars.toLocaleString()} \u5B57\u7B26)`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "tool-text-collapse", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "pre",
      {
        className,
        style: !expanded && meta.truncated ? { maxHeight: 280, overflow: "hidden", margin: 0 } : { margin: 0 },
        children: [
          display,
          !expanded && meta.truncated ? "\n\u2026" : null
        ]
      }
    ),
    meta.truncated ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "btn-tiny",
        style: { marginTop: 8 },
        onClick: (event) => {
          event.stopPropagation();
          setExpanded((v) => !v);
        },
        children: expanded ? collapseLabel : expandLabel || defaultExpandLabel
      }
    ) : null
  ] });
};

// packages/chat/messages/web/ToolMessageContent.tsx
var import_react8 = __toESM(require_react());

// packages/chat/messages/web/resolveAgentCardDialogKey.ts
var resolveAgentCardDialogKey = (agent) => {
  const rawDbKey = toTrimmedString(agent?.dbKey);
  if (rawDbKey) {
    if (rawDbKey.startsWith("cybot-")) return "";
    return rawDbKey;
  }
  const agentId = toTrimmedString(agent?.id);
  const ownerUserId = toTrimmedString(agent?.ownerUserId ?? agent?.userId ?? agent?.creatorId);
  const isPublic = !!agent?.isPublic;
  if (!agentId) return "";
  if (toTrimmedString(agent?.type) === "cybot") return "";
  if (isPublic) {
    return createAgentKey.public(agentId);
  }
  if (!ownerUserId) return "";
  return createAgentKey.private(ownerUserId, agentId);
};

// packages/chat/messages/web/CreateAgentToolCard.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var CreateAgentToolCard = ({ rawData, isError }) => {
  const { t } = useTranslation("ai");
  const agent = rawData && typeof rawData === "object" ? rawData : null;
  const agentKey = agent ? resolveAgentCardDialogKey(agent) : null;
  const currentDialogSpaceId = useAppSelector(
    (state) => selectCurrentDialogConfig(state)?.spaceId
  );
  const dialogSpaceId = resolveDialogLaunchSpaceId({
    recordSpaceId: currentDialogSpaceId
  });
  const { isStarting, startDialog } = useAgentDialog(agentKey || "", {
    spaceId: dialogSpaceId
  });
  if (isError || !agent || !agentKey) return null;
  const displayName = toTrimmedString(agent.name) || t("createAgent.untitled") || "Untitled Agent";
  const model = toTrimmedString(agent.model) || "Default Model";
  const introduction = toTrimmedString(agent.introduction);
  const isPublic = !!agent.isPublic;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "premium-agent-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "pa-glow" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pa-content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pa-left", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pa-avatar-wrap", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "pa-avatar", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuBot, { size: 22, "aria-hidden": "true" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "pa-status-dot" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pa-info", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pa-name-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "pa-name", children: displayName }),
            isPublic && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "div",
              {
                className: "pa-public-badge",
                title: t("createAgent.public") || "Public",
                "aria-label": t("createAgent.public") || "Public",
                children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuShieldCheck, { size: 10, "aria-hidden": "true" })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pa-meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "pa-meta-item", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCpu, { size: 10, "aria-hidden": "true" }),
              model
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "pa-meta-sep", children: "\u2022" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "pa-meta-item", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSparkles, { size: 10, "aria-hidden": "true" }),
              agent.temperature ?? 0.7
            ] })
          ] }),
          introduction && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "pa-intro u-truncate-2", children: introduction })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "pa-right", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "pa-action-btn",
          onClick: () => startDialog(),
          disabled: isStarting,
          children: isStarting ? "..." : t("createAgent.chat") || "\u5F00\u59CB\u5BF9\u8BDD"
        }
      ) })
    ] })
  ] });
};
var CreateAgentToolCard_default = CreateAgentToolCard;

// packages/ai/agent/guidedCreation/capabilityPresentation.ts
var TOOL_CAPABILITY_LABELS = {
  "workspace-read": "\u8BFB\u53D6\u5DE5\u4F5C\u533A",
  "dialog-continuation": "\u5EF6\u7EED\u5F53\u524D\u5BF9\u8BDD",
  "markdown-output": "Markdown \u8F93\u51FA",
  read: "\u8BFB\u53D6\u5185\u5BB9",
  createDoc: "\u521B\u5EFA\u6587\u6863",
  updateDoc: "\u66F4\u65B0\u6587\u6863",
  exa_search: "\u8054\u7F51\u641C\u7D22",
  firecrawl_search: "Firecrawl \u641C\u7D22",
  firecrawl_scrape: "Firecrawl \u6293\u53D6",
  fetchWebpage: "\u8BFB\u53D6\u7F51\u9875"
};
var getGuidedCapabilityLabel = (id) => {
  const guidedDefinition = GUIDED_AGENT_CAPABILITIES[id];
  if (guidedDefinition) return guidedDefinition.label.zhCN;
  return TOOL_CAPABILITY_LABELS[id] ?? id;
};
var getGuidedCapabilityLabels = (ids) => Array.from(
  new Set((ids ?? []).map((id) => getGuidedCapabilityLabel(id)).filter(Boolean))
);

// packages/chat/messages/web/PrepareAgentDraftToolCard.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var asDraft = (rawData) => {
  const draft = rawData?.draft;
  if (!isRecord(draft)) return null;
  return draft;
};
var PrepareAgentDraftToolCard = ({
  rawData,
  isError
}) => {
  const { t } = useTranslation("ai");
  const navigate = useNavigate();
  const location = useLocation();
  if (isError) return null;
  const draft = asDraft(rawData);
  if (!draft) return null;
  const unresolved = Array.isArray(draft.unresolved) ? draft.unresolved : [];
  const capabilityIds = Array.isArray(draft.capabilityIds) ? draft.capabilityIds : [];
  const capabilityLabels = getGuidedCapabilityLabels(capabilityIds);
  const secondaryAction = rawData?.secondaryAction?.kind === "advancedEdit" ? rawData.secondaryAction : {
    kind: "advancedEdit",
    label: t("guidedCreate.advanced", "\u9AD8\u7EA7\u7F16\u8F91"),
    url: rawData?.createUrl || "/create/agent"
  };
  const version = asOptionalFiniteNumber(rawData?.version) ?? null;
  const isPanelOpen = new URLSearchParams(location.search).get("draftPanel") === "true";
  const openPanel = () => {
    const next = new URLSearchParams(location.search);
    next.set("draftPanel", "true");
    navigate(`${location.pathname}?${next.toString()}${location.hash || ""}`);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "agent-draft-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "agent-draft-card__icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuBot, { size: 20 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "agent-draft-card__body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "agent-draft-card__header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "agent-draft-card__eyebrow", children: version ? t("guidedCreate.draftCardVersion", "Agent \u8349\u7A3F \u7B2C {{version}} \u7248", { version }) : t("guidedCreate.draftCardEyebrow", "Agent \u8349\u7A3F") }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { children: draft.name || t("guidedCreate.untitled", "\u672A\u547D\u540D AI") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "agent-draft-card__status", children: isPanelOpen ? t("guidedCreate.draftPanelOpen", "\u53F3\u4FA7\u7F16\u8F91\u533A") : unresolved.length ? t("guidedCreate.draftCardNeedsReview", "\u5F85\u786E\u8BA4") : t("guidedCreate.draftCardReady", "\u53EF\u9884\u89C8") })
      ] }),
      draft.promptSummary && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "agent-draft-card__summary", children: draft.promptSummary }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "agent-draft-card__meta", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuSparkles, { size: 13, "aria-hidden": "true" }),
          capabilityLabels.length ? capabilityLabels.join("\u3001") : t("guidedCreate.noCapabilities", "\u8FD8\u6CA1\u6709\u9009\u62E9\u80FD\u529B")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuFileText, { size: 13, "aria-hidden": "true" }),
          draft.isPublic ? t("guidedCreate.public", "\u516C\u5F00") : t("guidedCreate.private", "\u79C1\u6709")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuCheck, { size: 13, "aria-hidden": "true" }),
          formatProviderModelLine(draft.provider, draft.model)
        ] })
      ] }),
      unresolved.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "agent-draft-card__missing", children: [
        t("guidedCreate.missing", "\u8FD8\u9700\u8981\u8865\u5145\uFF1A"),
        " ",
        unresolved.join(", ")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "agent-draft-card__hint", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuSparkles, { size: 13, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: isPanelOpen ? t(
          "guidedCreate.draftCardPanelOpenHint",
          "\u53F3\u4FA7\u662F\u5F53\u524D\u7248\u672C\u7F16\u8F91\u533A\uFF1B\u8FD9\u5F20\u5361\u7247\u4FDD\u7559\u672C\u7248\u8BB0\u5F55\uFF0C\u4F60\u4E5F\u53EF\u4EE5\u7EE7\u7EED\u5728\u5BF9\u8BDD\u91CC\u8981\u6C42\u4FEE\u6539\u3002"
        ) : t(
          "guidedCreate.draftCardHint",
          "\u8349\u7A3F\u5DF2\u51C6\u5907\uFF1B\u6253\u5F00\u53F3\u4FA7\u9762\u677F\u7F16\u8F91\uFF0C\u6216\u7EE7\u7EED\u5728\u5BF9\u8BDD\u91CC\u8981\u6C42\u4FEE\u6539\u3002"
        ) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "agent-draft-card__actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          className: `agent-draft-card__action agent-draft-card__action--panel ${isPanelOpen ? "is-active" : ""}`,
          onClick: openPanel,
          "aria-pressed": isPanelOpen,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuSparkles, { size: 14, "aria-hidden": "true" }),
            isPanelOpen ? t("guidedCreate.panelOpen", "\u53F3\u4FA7\u5DF2\u6253\u5F00") : t("guidedCreate.previewAndEdit", "\u9884\u89C8\u4E0E\u4FEE\u6539")
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          className: "agent-draft-card__action agent-draft-card__action--secondary",
          onClick: () => navigate(secondaryAction.url || "/create/agent", {
            state: { initialDraft: draft }
          }),
          children: [
            secondaryAction.label,
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuArrowRight, { size: 14, "aria-hidden": "true" })
          ]
        }
      )
    ] })
  ] });
};
var PrepareAgentDraftToolCard_default = PrepareAgentDraftToolCard;

// packages/chat/messages/web/UpdateAgentToolCard.tsx
var import_react3 = __toESM(require_react());
var import_jsx_runtime4 = __toESM(require_jsx_runtime());
var UpdateAgentToolCard = ({ rawData, isError }) => {
  const { t } = useTranslation("ai");
  const [showChanges, setShowChanges] = import_react3.default.useState(true);
  const agent = rawData && typeof rawData === "object" ? rawData : null;
  const agentKey = agent ? resolveAgentCardDialogKey(agent) : null;
  const currentDialogSpaceId = useAppSelector(
    (state) => selectCurrentDialogConfig(state)?.spaceId
  );
  const dialogSpaceId = resolveDialogLaunchSpaceId({
    recordSpaceId: currentDialogSpaceId
  });
  const { isStarting, startDialog } = useAgentDialog(agentKey || "", {
    spaceId: dialogSpaceId
  });
  if (isError || !agent || !agentKey) return null;
  const displayName = toTrimmedString(agent.name) || t("createAgent.untitled") || "Untitled Agent";
  const model = toTrimmedString(agent.model) || "Default Model";
  const introduction = toTrimmedString(agent.introduction);
  const isPublic = !!agent.isPublic;
  const changes = agent._changes;
  const renderChangeValue = (val) => {
    if (val === void 0 || val === null || val === "") return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "u-dim-more", children: "none" });
    if (typeof val === "boolean") return val ? "True" : "False";
    if (Array.isArray(val)) {
      if (val.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "u-dim-more", children: "empty" });
      return val.map((v) => typeof v === "object" ? v.label || v.title || JSON.stringify(v) : String(v)).join(", ");
    }
    if (typeof val === "object") {
      if (val.text) return val.text;
      return JSON.stringify(val);
    }
    return String(val);
  };
  const fieldLabels = {
    name: t("agentFields.name") || "\u540D\u79F0",
    model: t("agentFields.model") || "\u6A21\u578B",
    provider: t("agentFields.provider") || "\u63D0\u4F9B\u5546",
    prompt: t("agentFields.prompt") || "\u7CFB\u7EDF\u63D0\u793A\u8BCD",
    introduction: t("agentFields.introduction") || "\u7B80\u4ECB",
    greeting: t("agentFields.greeting") || "\u6B22\u8FCE\u8BED",
    temperature: t("agentFields.temperature") || "\u6E29\u5EA6",
    isPublic: t("agentFields.isPublic") || "\u516C\u5F00\u72B6\u6001",
    tags: t("agentFields.tags") || "\u6807\u7B7E",
    tools: t("agentFields.tools") || "\u5DE5\u5177",
    references: t("agentFields.references") || "\u77E5\u8BC6\u5F15\u7528",
    reasoning_effort: t("agentFields.reasoning_effort") || "\u63A8\u7406\u5F3A\u5EA6"
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "premium-agent-card update-style", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pa-glow" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "pa-content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "pa-left", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "pa-avatar-wrap", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pa-avatar", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuWrench, { size: 22, "aria-hidden": "true" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pa-status-dot" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "pa-info", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "pa-name-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "pa-name", children: displayName }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pa-update-badge", children: t("updateAgent.badge") || "\u5DF2\u66F4\u65B0" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "pa-meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "pa-meta-item", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuCpu, { size: 10, "aria-hidden": "true" }),
              model
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "pa-meta-sep", children: "\u2022" }),
            isPublic && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "pa-meta-item", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuShieldCheck, { size: 10, "aria-hidden": "true" }),
              t("createAgent.public") || "Public"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pa-right", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "button",
          className: "pa-action-btn",
          onClick: () => startDialog(),
          disabled: isStarting,
          children: isStarting ? "..." : t("createAgent.chat") || "\u5F00\u59CB\u5BF9\u8BDD"
        }
      ) })
    ] }),
    changes && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "pa-update-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "button",
        {
          type: "button",
          className: "pa-expand-btn",
          onClick: () => setShowChanges(!showChanges),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuHistory, { size: 12, "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: showChanges ? t("updateAgent.hideChanges") || "\u6536\u8D77\u53D8\u66F4\u8BE6\u60C5" : t("updateAgent.viewChanges") || "\u67E5\u770B\u66F4\u65B0\u5185\u5BB9" }),
            showChanges ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuChevronUp, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuChevronDown, { size: 14, "aria-hidden": "true" })
          ]
        }
      ),
      showChanges && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pa-changes-list", children: Object.entries(changes).map(([key, diff]) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "pa-change-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pa-change-header", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "pa-change-label", children: fieldLabels[key] || key }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "pa-change-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pa-change-old", children: renderChangeValue(diff.o) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuArrowRight, { size: 12, className: "pa-change-arrow", "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pa-change-new", children: renderChangeValue(diff.n) })
        ] })
      ] }, key)) })
    ] })
  ] });
};
var UpdateAgentToolCard_default = UpdateAgentToolCard;

// packages/chat/messages/web/AppDeployCard.tsx
var import_react5 = __toESM(require_react());

// packages/chat/messages/web/ChatDisplayContext.ts
var import_react4 = __toESM(require_react());
var ChatDisplayContext = (0, import_react4.createContext)({
  compactDeployCards: false
});
function useChatDisplayContext() {
  return (0, import_react4.useContext)(ChatDisplayContext);
}

// packages/chat/messages/web/AppDeployCard.tsx
var import_jsx_runtime5 = __toESM(require_jsx_runtime());
var AppDeployCard = ({ rawData, isError }) => {
  const { t } = useTranslation("chat");
  const navigate = useNavigate();
  const { compactDeployCards } = useChatDisplayContext();
  const [iframeOpen, setIframeOpen] = (0, import_react5.useState)(() => !isError && !compactDeployCards);
  const [frameState, setFrameState] = (0, import_react5.useState)("loading");
  const [isSlow, setIsSlow] = (0, import_react5.useState)(false);
  const hasRenderableData = !isError && !!rawData && typeof rawData === "object";
  const appUrl = hasRenderableData ? resolvePreferredAppRuntimeUrl({
    appId: typeof rawData?.appId === "string" ? rawData.appId : void 0,
    customUrl: typeof rawData?.customUrl === "string" ? rawData.customUrl : void 0,
    url: typeof rawData?.appUrl === "string" ? rawData.appUrl : typeof rawData?.url === "string" ? rawData.url : void 0
  }) || void 0 : void 0;
  const appServerOrigin = (0, import_react5.useMemo)(() => {
    const serverOrigin = asOptionalTrimmedString(rawData?.serverOrigin);
    if (serverOrigin) {
      return serverOrigin;
    }
    const originUrl = typeof rawData?.appUrl === "string" ? rawData.appUrl : typeof rawData?.url === "string" ? rawData.url : appUrl;
    if (!originUrl) return void 0;
    try {
      return new URL(originUrl).origin;
    } catch {
      return void 0;
    }
  }, [appUrl, rawData?.appUrl, rawData?.serverOrigin, rawData?.url]);
  const appName = hasRenderableData ? rawData.userFriendlyName ?? rawData.name ?? "App" : "App";
  const appRouteKey = hasRenderableData ? resolveAppRouteKey(rawData.appKey, rawData.appId) : void 0;
  const previewCheck = hasRenderableData ? rawData.previewCheck : void 0;
  (0, import_react5.useEffect)(() => {
    if (!iframeOpen || !appUrl) return;
    setFrameState("loading");
    setIsSlow(false);
    const timer = window.setTimeout(() => {
      setIsSlow(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [iframeOpen, appUrl]);
  const loadingMessage = (0, import_react5.useMemo)(() => {
    if (frameState === "loaded") {
      return null;
    }
    if (previewCheck?.attempted && previewCheck.ready) {
      return "\u7AD9\u70B9\u8BBF\u95EE\u5DF2\u7ECF\u9A8C\u8BC1\u901A\u8FC7\uFF0C\u6B63\u5728\u52A0\u8F7D\u804A\u5929\u5185\u9884\u89C8\u2026";
    }
    if (previewCheck?.attempted && !previewCheck.ready) {
      return "\u7AD9\u70B9\u5DF2\u53D1\u5E03\uFF0C\u4F46\u9996\u6B21\u51B7\u542F\u52A8\u53EF\u80FD\u7A0D\u6162\uFF0C\u6B63\u5728\u7B49\u5F85\u9884\u89C8\u53EF\u89C1\u2026";
    }
    if (previewCheck?.attempted === false) {
      return "\u7AD9\u70B9\u5DF2\u53D1\u5E03\uFF0C\u5F53\u524D\u5730\u5740\u4E3A\u8DE8\u57DF\u9884\u89C8\uFF0C\u6B63\u5728\u7B49\u5F85 iframe \u81EA\u5DF1\u5B8C\u6210\u52A0\u8F7D\u2026";
    }
    return "\u6B63\u5728\u52A0\u8F7D\u9884\u89C8\u2026";
  }, [frameState, previewCheck]);
  if (!hasRenderableData || !appUrl) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "app-deploy-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "adc-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "adc-info", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuMonitor, { size: 15, className: "adc-icon", "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "adc-name", children: appName })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "adc-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
          "a",
          {
            className: "adc-btn adc-btn--link",
            href: appUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            title: t("app.openInTab", "\u5728\u65B0\u6807\u7B7E\u9875\u6253\u5F00"),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuExternalLink, { size: 13, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: t("app.open", "\u6253\u5F00") })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
          "button",
          {
            className: `adc-btn adc-btn--preview ${iframeOpen ? "is-active" : ""}`,
            onClick: () => setIframeOpen((v) => !v),
            title: t("app.togglePreview", "\u5207\u6362\u9884\u89C8"),
            type: "button",
            children: [
              iframeOpen ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuChevronUp, { size: 13, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuChevronDown, { size: 13, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: t("app.preview", "\u9884\u89C8") })
            ]
          }
        ),
        appRouteKey && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
          "button",
          {
            className: "adc-btn adc-btn--editor",
            onClick: () => navigate(buildAppEditorPath(appRouteKey, void 0, appServerOrigin)),
            title: t("appEditor_chatMode_title", "\u5BF9\u8BDD\u7F16\u8F91"),
            type: "button",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuBot, { size: 13, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: t("appEditor_chatMode_title", "\u5BF9\u8BDD\u7F16\u8F91") })
            ]
          }
        )
      ] })
    ] }),
    iframeOpen && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "adc-frame-wrap", children: [
      loadingMessage && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: `adc-loading ${isSlow ? "is-slow" : ""}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuLoaderCircle, { size: 14, className: "adc-loading-icon", "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "adc-loading-text", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { children: loadingMessage }),
          isSlow && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "adc-loading-sub", children: "\u90E8\u7F72\u6162\u65F6\u901A\u5E38\u4E0D\u662F\u5931\u8D25\uFF0C\u800C\u662F\u8FD8\u5728\u9996\u8F6E\u6784\u5EFA / \u51B7\u542F\u52A8\u3002" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "iframe",
        {
          src: appUrl,
          className: "adc-frame",
          title: appName,
          sandbox: "allow-scripts allow-forms allow-same-origin allow-popups",
          onLoad: () => setFrameState("loaded")
        }
      )
    ] })
  ] });
};
var AppDeployCard_default = AppDeployCard;

// packages/chat/messages/web/ApplyLineEditsPreviewViewer.tsx
var import_react6 = __toESM(require_react());

// packages/chat/messages/web/ToolMessageTypes.ts
function guessLanguageFromPath(path) {
  if (!path) return void 0;
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css") || path.endsWith(".scss") || path.endsWith(".less"))
    return "css";
  if (path.endsWith(".md")) return "markdown";
  return void 0;
}

// packages/chat/messages/web/ApplyLineEditsPreviewViewer.tsx
var import_jsx_runtime6 = __toESM(require_jsx_runtime());
var ApplyLineEditsPreviewViewer = ({
  rawData,
  isError,
  t
}) => {
  const filePath = rawData?.filePath ?? "Unknown";
  const language = (0, import_react6.useMemo)(() => guessLanguageFromPath(filePath), [filePath]);
  if (isError || !rawData) return null;
  if (!rawData.previewOnly || !Array.isArray(rawData.edits)) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "t-content-block ale-preview-block", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "t-block-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "t-badge warning", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuTriangle, { size: 14, "aria-hidden": "true" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "u-flex-col u-flex-1 u-min-w-0", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "u-font-mono u-text-xs u-dim", children: filePath }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ale-items-container", children: rawData.edits.map((edit, idx) => {
      let label = "";
      if (edit.type === "replaceRange") {
        label = t(
          "ale.preview.replace",
          `\u66FF\u6362\u7B2C ${edit.startLine}-${edit.endLine} \u884C`
        );
      } else if (edit.type === "insertBefore") {
        label = t(
          "ale.preview.insertBefore",
          `\u5728\u7B2C ${edit.line} \u884C\u4E4B\u524D\u63D2\u5165`
        );
      } else if (edit.type === "insertAfter") {
        label = t(
          "ale.preview.insertAfter",
          `\u5728\u7B2C ${edit.line} \u884C\u4E4B\u540E\u63D2\u5165`
        );
      } else if (edit.type === "deleteRange") {
        label = t(
          "ale.preview.deleteRange",
          `\u5220\u9664\u7B2C ${edit.startLine}-${edit.endLine} \u884C`
        );
      } else {
        label = `${edit.type || "unknown"}`;
      }
      const isInsertOrReplace = edit.type === "replaceRange" || edit.type === "insertBefore" || edit.type === "insertAfter";
      const text = isInsertOrReplace ? edit.replacement ?? edit.content ?? "" : "";
      const slateValue = [
        {
          type: "code-block",
          language,
          children: [{ text }]
        }
      ];
      const editKey = [
        edit.type || "edit",
        edit.startLine ?? edit.line ?? "",
        edit.endLine ?? "",
        idx
      ].join("-");
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ale-edit-block", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ale-edit-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: `ale-badge ale-badge--${edit.type}`, children: edit.type }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "ale-lines u-text-xs u-font-mono", children: label })
        ] }),
        isInsertOrReplace && text && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ale-code-full", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Editor_default, { initialValue: slateValue, readOnly: true }) }),
        edit.type === "deleteRange" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ale-delete-hint u-text-xs", children: t(
          "ale.preview.deleteHint",
          "\u6B64\u64CD\u4F5C\u5C06\u5220\u9664\u4E0A\u8FF0\u884C\u533A\u95F4\u7684\u539F\u6709\u5185\u5BB9\uFF08\u9884\u89C8\u9636\u6BB5\u65E0\u6CD5\u5C55\u793A\u539F\u5185\u5BB9\uFF0C\u6267\u884C\u540E\u4F1A\u63D0\u4F9B\u5B8C\u6574 diff\uFF09\u3002"
        ) })
      ] }, editKey);
    }) })
  ] });
};
var ApplyLineEditsPreviewViewer_default = ApplyLineEditsPreviewViewer;

// packages/chat/messages/web/DiffViewer.tsx
var import_react7 = __toESM(require_react());

// packages/chat/messages/web/diffViewerModel.ts
function buildDiffRows(parts) {
  const rows = [];
  let oldLine = 1;
  let newLine = 1;
  parts.forEach((part, partIndex) => {
    const kind = part.added ? "added" : part.removed ? "removed" : "context";
    const lines = part.value.split("\n");
    lines.forEach((line, lineIndex) => {
      if (lineIndex === lines.length - 1 && line === "") return;
      const row = {
        id: `${partIndex}-${lineIndex}`,
        kind,
        content: line,
        oldLine: kind === "added" ? null : oldLine,
        newLine: kind === "removed" ? null : newLine
      };
      rows.push(row);
      if (kind !== "added") oldLine += 1;
      if (kind !== "removed") newLine += 1;
    });
  });
  return rows;
}
function summarizeDiffRows(rows) {
  let added = 0;
  let removed = 0;
  for (const row of rows) {
    if (row.kind === "added") added += 1;
    if (row.kind === "removed") removed += 1;
  }
  return { added, removed };
}

// packages/chat/messages/web/DiffViewer.tsx
var import_jsx_runtime7 = __toESM(require_jsx_runtime());
var DiffViewer = ({ parts, filePath }) => {
  const rows = (0, import_react7.useMemo)(() => buildDiffRows(parts), [parts]);
  const summary = (0, import_react7.useMemo)(() => summarizeDiffRows(rows), [rows]);
  if (rows.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "diff-viewer diff-viewer--empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuFileDiff, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: "No diff available" })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "diff-viewer", role: "region", "aria-label": `Diff for ${filePath}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "diff-viewer__summary", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "diff-viewer__summary-file", children: filePath }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "diff-viewer__stat diff-viewer__stat--add", children: [
        "+",
        summary.added
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "diff-viewer__stat diff-viewer__stat--remove", children: [
        "-",
        summary.removed
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "diff-viewer__body", children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      "div",
      {
        className: `diff-viewer__row diff-viewer__row--${row.kind}`,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "diff-viewer__line diff-viewer__line--old", children: row.oldLine ?? "" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "diff-viewer__line diff-viewer__line--new", children: row.newLine ?? "" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "diff-viewer__marker", children: row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " " }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("code", { className: "diff-viewer__code", children: row.content || " " })
        ]
      },
      row.id
    )) })
  ] });
};

// packages/chat/messages/ziweiChartDoc.ts
function getZiweiChartResult(rawData) {
  const candidate = rawData;
  const result = candidate?.chart ? candidate : candidate?.rawData;
  if (!result?.chart || !result?.summary || !result?.displayData) return null;
  return result;
}
function buildZiweiChartDocTitle(rawData) {
  const result = getZiweiChartResult(rawData);
  if (!result) return "\u7D2B\u5FAE\u547D\u76D8";
  const calendarLabel = result.input.calendarType === "lunar" ? "\u519C\u5386" : "\u9633\u5386";
  return `\u7D2B\u5FAE\u547D\u76D8 \xB7 ${calendarLabel} ${result.input.dateStr} \xB7 ${result.chart.timeRange} \xB7 ${result.input.gender}`;
}
function buildZiweiChartDocMarkdown(rawData) {
  const result = getZiweiChartResult(rawData);
  if (!result) return "# \u7D2B\u5FAE\u547D\u76D8\n\n\u65E0\u6CD5\u751F\u6210\u547D\u76D8\u5185\u5BB9\u3002";
  const mutagenSummary = result.chart.mutagenByYear.length > 0 ? result.chart.mutagenByYear.map((item) => `${item.name}\u5316${item.mutagen}`).join("\u3001") : "\u65E0";
  const quickFacts = [
    `- \u65E5\u671F\u7C7B\u578B\uFF1A${result.input.calendarType === "lunar" ? "\u519C\u5386" : "\u9633\u5386"}`,
    `- \u51FA\u751F\u65E5\u671F\uFF1A${result.input.dateStr}`,
    `- \u65F6\u8FB0\uFF1A${result.chart.timeRange}`,
    `- \u6027\u522B\uFF1A${result.input.gender}`,
    `- \u9633\u5386\uFF1A${result.chart.solarDate}`,
    `- \u519C\u5386\uFF1A${result.chart.lunarDate}`,
    `- \u5E72\u652F\uFF1A${result.chart.chineseDate}`,
    `- \u751F\u8096 / \u661F\u5EA7\uFF1A${result.chart.zodiac} / ${result.chart.sign}`,
    `- \u4E94\u884C\u5C40\uFF1A${result.summary.fiveElementsClass}`,
    `- \u547D\u5BAB\uFF1A${result.summary.mingGong}`,
    `- \u8EAB\u5BAB\uFF1A${result.summary.shenGong}`,
    `- \u547D\u4E3B / \u8EAB\u4E3B\uFF1A${result.summary.mingZhu} / ${result.summary.shenZhu}`,
    `- \u751F\u5E74\u56DB\u5316\uFF1A${mutagenSummary}`
  ].join("\n");
  const analysisLines = [
    `- \u547D\u5BAB\u4E3B\u661F\uFF1A${result.analysisContext.mingPalace.majorStars.map((item) => item.name).join("\u3001") || "\u65E0"}`,
    `- \u8EAB\u5BAB\u4E3B\u661F\uFF1A${result.analysisContext.bodyPalace.majorStars.map((item) => item.name).join("\u3001") || "\u65E0"}`,
    `- \u7A7A\u5BAB\uFF1A${result.analysisContext.emptyPalaces.length > 0 ? result.analysisContext.emptyPalaces.join("\u3001") : "\u65E0"}`
  ].join("\n");
  return [
    `# ${buildZiweiChartDocTitle(result)}`,
    "",
    "## \u547D\u76D8\u6458\u8981",
    "",
    result.summaryText,
    "",
    "## \u57FA\u672C\u4FE1\u606F",
    "",
    quickFacts,
    "",
    "## \u5173\u952E\u89C2\u5BDF",
    "",
    analysisLines,
    "",
    "## ASCII \u76D8\u9762\u5FEB\u7167",
    "",
    "```text",
    result.gridText,
    "```",
    "",
    "## \u5341\u4E8C\u5BAB\u8BE6\u76D8",
    "",
    "```text",
    result.displayData,
    "```"
  ].join("\n");
}

// packages/chat/messages/web/ToolMessageContent.tsx
var import_jsx_runtime8 = __toESM(require_jsx_runtime());
function formatHomePath(path) {
  if (!path) return "";
  return foldHomePath(path);
}
var ReadToolTreeViewer = ({ items }) => {
  if (!items || items.length === 0) return null;
  const count = items.length;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "read-tool-tree-widget", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "rtt-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-bullet", children: "\u2022" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-title", children: "Read" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "rtt-count", children: [
        "(",
        count,
        ")"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "rtt-list", children: items.map((item, index) => {
      const isLast = index === count - 1;
      const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
      const formattedPath = formatHomePath(item.path);
      let pathWithRange = formattedPath;
      if (/(:[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*)$/.test(pathWithRange)) {
      } else if (item.rangeLabel) {
        pathWithRange = item.rangeLabel.startsWith(":") ? `${pathWithRange}${item.rangeLabel}` : `${pathWithRange}:${item.rangeLabel}`;
      }
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "rtt-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-connector", children: connector }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-path", children: pathWithRange })
      ] }, index);
    }) })
  ] });
};
var SearchToolTreeViewer = ({ items }) => {
  if (!items || items.length === 0) return null;
  const count = items.length;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "read-tool-tree-widget", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "rtt-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-bullet", children: "\u2022" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-title", children: "Search" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "rtt-count", children: [
        "(",
        count,
        ")"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "rtt-list", children: items.map((item, index) => {
      const isLast = index === count - 1;
      const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
      let queryText = (item.query || "").trim();
      if (item.path) {
        const formattedPath = formatHomePath(item.path);
        if (formattedPath) queryText = queryText ? `${queryText} in ${formattedPath}` : formattedPath;
      }
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "rtt-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-connector", children: connector }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-path", children: queryText })
      ] }, index);
    }) })
  ] });
};
var FetchToolTreeViewer = ({
  items
}) => {
  if (!items || items.length === 0) return null;
  const count = items.length;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "read-tool-tree-widget", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "rtt-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-bullet", children: "\u2022" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-title", children: "Fetch" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "rtt-count", children: [
        "(",
        count,
        ")"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "rtt-list", children: items.map((item, index) => {
      const isLast = index === count - 1;
      const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
      const urlText = (item.url || "").trim() || "webpage";
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "rtt-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-connector", children: connector }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "rtt-path", children: urlText })
      ] }, index);
    }) })
  ] });
};
var FetchViewer = ({ rawData, isError, toolArgs }) => {
  if (isError || rawData == null) return null;
  let url = "";
  if (typeof rawData === "string") {
    const resolved = rawData.match(/\[Resolved URL\]\s*(\S+)/);
    const inline = rawData.match(/\(URL:\s*([^)\s]+)\)/);
    url = (resolved?.[1] || inline?.[1] || "").trim();
  }
  if (!url) {
    url = asOptionalTrimmedString(toolArgs?.url) ?? "";
  }
  if (!url) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(FetchToolTreeViewer, { items: [{ url }] });
};
var SearchViewer = ({ rawData, isError }) => {
  if (isError || rawData == null) return null;
  const data = typeof rawData === "object" ? rawData : {};
  const query = asOptionalTrimmedString(data.query) || asOptionalTrimmedString(data.pattern) || asOptionalTrimmedString(data.glob) || (typeof rawData === "string" ? rawData : "");
  const path = asOptionalTrimmedString(data.path) || asOptionalTrimmedString(data.filePath);
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SearchToolTreeViewer, { items: [{ query, path }] });
};
function normalizeCodePreviewRawData(rawData) {
  const countLines = (text) => {
    if (!text) return 0;
    let lines = 1;
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) lines += 1;
    }
    return lines;
  };
  if (typeof rawData === "string") {
    const lines = countLines(rawData);
    return {
      path: "",
      rangeLabel: lines > 0 ? `${lines} lines` : "",
      hasPayload: rawData.length > 0
    };
  }
  if (!rawData || typeof rawData !== "object") {
    return { path: "", rangeLabel: "", hasPayload: false };
  }
  const data = rawData;
  const path = asOptionalTrimmedString(data.filePath) || asOptionalTrimmedString(data.path) || asOptionalTrimmedString(data.response?.filePath) || asOptionalTrimmedString(data.request?.filePath) || asOptionalTrimmedString(data.request?.path) || "";
  let content = "";
  if (typeof data.content === "string") content = data.content;
  else if (Array.isArray(data.lines)) content = data.lines.join("\n");
  else if (typeof data.response?.content === "string") content = data.response.content;
  else if (typeof data.response?.newContent === "string") content = data.response.newContent;
  else if (typeof data.text === "string") content = data.text;
  const start = data.startLine ?? data.response?.startLine;
  const end = data.endLine ?? data.response?.endLine;
  const total = data.totalLines ?? data.response?.totalLines;
  const rangeParts = [];
  if (typeof start === "number" && typeof end === "number") {
    rangeParts.push(`L${start}\u2013${end}`);
    if (typeof total === "number" && total > 0) {
      rangeParts.push(`${total} lines`);
    }
  } else if (typeof total === "number" && total > 0) {
    rangeParts.push(`${total} lines`);
  } else if (content) {
    rangeParts.push(`${countLines(content)} lines`);
  }
  if (data.truncated === true) rangeParts.push("truncated");
  return {
    path,
    rangeLabel: rangeParts.join(" \xB7 "),
    hasPayload: Boolean(path || content || rangeParts.length)
  };
}
var CodePreviewViewer = ({ rawData, isError, t }) => {
  if (isError || rawData == null || rawData === "") return null;
  const { path, rangeLabel, hasPayload } = normalizeCodePreviewRawData(rawData);
  if (!hasPayload) return null;
  const formattedPath = formatHomePath(path) || t("codeEdit.unnamedFile", "file");
  if (path) {
    let rangeSpec = "";
    if (rawData && typeof rawData === "object") {
      const data = rawData;
      const start = data.startLine ?? data.response?.startLine;
      const end = data.endLine ?? data.response?.endLine;
      if (typeof start === "number" && typeof end === "number") {
        rangeSpec = `${start}-${end}`;
      }
    }
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      ReadToolTreeViewer,
      {
        items: [{ path, rangeLabel: rangeSpec }]
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "div",
    {
      className: "code-preview-widget code-preview-widget--meta",
      title: path || void 0,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuFileText, { size: 13, className: "u-dim", "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "cp-path", children: formattedPath }),
        rangeLabel ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "cp-meta u-dim u-text-xs", children: rangeLabel }) : null
      ]
    }
  );
};
var CodeChangeViewer = ({ rawData, isError, t }) => {
  const [view, setView] = (0, import_react8.useState)("final");
  const path = rawData?.filePath || rawData?.request?.filePath || rawData?.response?.filePath || "Unknown";
  const language = (0, import_react8.useMemo)(() => guessLanguageFromPath(path), [path]);
  const newContent = rawData?.response?.newContent ?? rawData?.newContent ?? rawData?.content ?? rawData?.request?.content ?? "";
  const finalSlateValue = (0, import_react8.useMemo)(
    () => [
      {
        type: "code-block",
        language,
        children: [{ text: newContent }]
      }
    ],
    [newContent, language]
  );
  if (isError || !rawData) return null;
  const diffPieces = Array.isArray(rawData.response?.diff) ? rawData.response.diff : Array.isArray(rawData.diff) ? rawData.diff : [];
  const isLong = shouldPreviewToolText(newContent);
  const hasDiff = diffPieces.length > 0;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block code-change-widget", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "cp-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "u-flex u-items-center u-gap-2 u-flex-1 u-min-w-0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuFileText, { size: 14, className: "u-dim", "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "cp-path", children: path })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "cc-toggle", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "button",
          {
            type: "button",
            className: view === "final" ? "on" : "",
            onClick: () => setView("final"),
            children: t("codeEdit.viewFinal") || "Final"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "button",
          {
            type: "button",
            className: view === "diff" ? "on" : "",
            onClick: () => setView("diff"),
            disabled: !hasDiff,
            children: t("codeEdit.viewDiff") || "Diff"
          }
        )
      ] })
    ] }),
    view === "diff" ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(DiffViewer, { parts: diffPieces, filePath: path }) : isLong ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "editor-scroller compact", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(CollapsibleToolText, { text: newContent, className: "code-dump" }) }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "editor-scroller compact", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Editor_default, { initialValue: finalSlateValue, readOnly: true }) })
  ] });
};
var ExecShellViewer = ({
  rawData,
  isError,
  t,
  presentation = "default"
}) => {
  const dispatch = useAppDispatch();
  if (isError || !rawData) return null;
  const normalized = typeof rawData === "string" ? { command: "", cwd: "", stdout: rawData, stderr: "", exitCode: void 0, blocked: false, requireUnsafe: false } : rawData;
  const command = normalized.command || "";
  const cwd = normalized.cwd || "";
  const blocked = !!normalized.blocked;
  const requireUnsafe = !!normalized.requireUnsafe;
  const stdout = normalized.stdout || "";
  const stderr = normalized.stderr || "";
  const exitCode = normalized.exitCode;
  const contentOnly = presentation === "groupDetail";
  const handleUnsafeRun = () => {
    if (!command) return;
    const prefix = cwd ? `\u5728\u76EE\u5F55 ${cwd} \u4E0B\uFF0C` : "";
    const userInput = prefix + "\u8BF7\u4F7F\u7528 unsafe:true \u518D\u6B21\u6267\u884C\u521A\u624D\u7684 shell \u547D\u4EE4\uFF1A\n" + command;
    dispatch(
      handleSendMessage({
        userInput
      })
    );
  };
  if (blocked) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block code-change-block", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-block-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "t-badge warning", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuShieldAlert, { size: 14, "aria-hidden": "true" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "u-flex-col u-flex-1 u-min-w-0", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "u-font-bold u-text-sm u-error-text", children: t("bash.blockedTitle", "\u5371\u9669\u547D\u4EE4\u5DF2\u88AB\u62E6\u622A") }),
          command && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "u-font-mono u-text-xs u-dim", children: cwd ? `${cwd} $ ${command}` : command })
        ] })
      ] }),
      requireUnsafe && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "t-block-desc", children: t("bash.blockedDesc", "\u8BE5\u547D\u4EE4\u88AB\u68C0\u6D4B\u4E3A\u9AD8\u5371\u64CD\u4F5C\uFF0C\u9ED8\u8BA4\u672A\u6267\u884C\u3002\u5982\u786E\u6709\u5FC5\u8981\uFF0C\u8BF7\u786E\u8BA4\u98CE\u9669\u540E\u7EE7\u7EED\u3002") }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "t-btn-row", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { type: "button", className: "btn-primary-sm", onClick: handleUnsafeRun, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuTerminal, { size: 14, style: { marginRight: 4 }, "aria-hidden": "true" }),
          t("bash.runUnsafe", "\u4ECD\u8981\u6267\u884C\uFF08unsafe\uFF09")
        ] }) })
      ] })
    ] });
  }
  const statusColor = exitCode === 0 ? "var(--success)" : exitCode === void 0 ? "var(--textQuaternary)" : "var(--error)";
  const outputBody = /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
    stdout ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(CollapsibleToolText, { text: String(stdout), className: "term-out" }) : null,
    stderr ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(CollapsibleToolText, { text: String(stderr), className: "term-err" }) : null,
    !stdout && !stderr && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "u-dim u-text-xs u-flex u-items-center u-justify-center", style: { padding: "20px 0", fontStyle: "italic" }, children: t("bash.noOutput") || "(No output)" })
  ] });
  if (contentOnly) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block bash-viewer bash-viewer--group-detail", children: [
      exitCode !== void 0 && exitCode !== 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "bash-result-meta", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "shell-exit-code", children: t("bash.exitCode", { code: exitCode }) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuCircle, { size: 8, fill: statusColor, color: statusColor, "aria-hidden": "true" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "bash-output-area bash-output-area--group-detail", children: outputBody })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "t-content-block bash-viewer professional", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "bash-terminal-window", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "bash-prompt-line", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "bash-prompt-char", children: ">_" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("code", { className: "shell-cmd", children: cwd ? `${cwd} $ ${command}` : command }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "shell-meta-inline", children: [
        exitCode !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "shell-exit-code", children: t("bash.exitCode", { code: exitCode }) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuCircle, { size: 8, fill: statusColor, color: statusColor, "aria-hidden": "true" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "bash-output-area", style: { maxHeight: 360 }, children: outputBody })
  ] }) });
};
var WriteFileConflictViewer = ({ rawData, isError, t }) => {
  const dispatch = useAppDispatch();
  if (isError || !rawData) return null;
  const filePath = rawData.filePath || rawData.response?.filePath || rawData.request?.filePath || "Unknown";
  const msg = rawData.serverMessage || "\u76EE\u6807\u6587\u4EF6\u5DF2\u5B58\u5728\uFF0C\u4E14\u672C\u6B21\u8C03\u7528\u672A\u5141\u8BB8\u8986\u76D6\uFF0C\u56E0\u6B64\u6CA1\u6709\u8FDB\u884C\u5199\u5165\u3002";
  const handleConfirmOverwrite = () => {
    const userInput = t("codeEdit.confirmOverwritePrompt", {
      defaultValue: `\u521A\u624D\u5C1D\u8BD5\u5199\u5165\u6587\u4EF6 ${filePath} \u65F6\u53D1\u73B0\u6587\u4EF6\u5DF2\u5B58\u5728\uFF0C\u4E14\u672A\u8986\u76D6\u3002\u8BF7\u786E\u8BA4\u8986\u76D6\u8BE5\u6587\u4EF6\uFF0C\u5E76\u4F7F\u7528\u4F60\u521A\u624D\u751F\u6210\u7684\u6700\u65B0\u5185\u5BB9\u3002`,
      path: filePath
    });
    dispatch(
      handleSendMessage({
        userInput
      })
    );
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block code-change-block", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-block-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "t-badge warning", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuFileWarning, { size: 14, "aria-hidden": "true" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "u-flex-col u-flex-1 u-min-w-0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "u-font-bold u-text-sm u-error-text", children: t("codeEdit.conflictTitle") || "File Conflict" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "u-font-mono u-text-xs u-dim", children: filePath })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "t-block-desc", children: t("codeEdit.conflictMsg") || msg }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "t-btn-row", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "btn-primary-sm", onClick: handleConfirmOverwrite, children: t("codeEdit.overwrite") || "Overwrite" }) })
  ] });
};
var GeminiImageItem = ({ file, index, onPreview, t }) => {
  const dispatch = useAppDispatch();
  const [url, setUrl] = (0, import_react8.useState)(null);
  const [status, setStatus] = (0, import_react8.useState)(
    "loading"
  );
  (0, import_react8.useEffect)(() => {
    if (!file?.fileId) {
      setUrl(null);
      setStatus("loading");
      return;
    }
    let active = true;
    let objectUrl = null;
    setUrl(null);
    setStatus("loading");
    dispatch(readFileContent({ fileId: file.fileId })).unwrap().then(({ blob }) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      setStatus("loaded");
    }).catch(() => {
      if (active) setStatus("error");
    });
    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [dispatch, file?.fileId]);
  const name = file?.metadata?.originalName || t("imgOpts.defaultName", `Image ${index + 1}`);
  const cardStyle = {
    margin: 0,
    padding: 0,
    font: "inherit",
    color: "inherit",
    textAlign: "left",
    width: "100%",
    appearance: "none"
  };
  if (status === "loaded" && url) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
      "button",
      {
        type: "button",
        className: "g-img-card loaded",
        style: cardStyle,
        onClick: () => onPreview(url, name),
        "aria-label": name,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("img", { src: url, alt: "", loading: "lazy" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "g-img-overlay", "aria-hidden": "true", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "u-truncate", children: name }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuExternalLink, { size: 14, "aria-hidden": "true" })
          ] })
        ]
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: `g-img-card ${status}`, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "g-img-skeleton" }) });
};
var GeminiGallery = ({ rawData, isError, t }) => {
  const [preview, setPreview] = (0, import_react8.useState)(
    null
  );
  if (isError || !rawData) return null;
  const files = Array.isArray(rawData.files) ? rawData.files : [];
  const count = rawData.imageCount ?? files.length;
  const countLabel = t("gemini.count", `${count} images generated`).replace(
    "{{count}}",
    String(count)
  );
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-block-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "t-badge info", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuImage, { size: 14, "aria-hidden": "true" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "u-min-w-0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "u-font-bold u-text-sm", children: t("gemini.title", "Image Generation") }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "u-text-xs u-dim", style: { marginLeft: 8 }, children: countLabel })
      ] })
    ] }),
    rawData.text && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "t-block-desc", children: rawData.text }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: `g-grid ${files.length === 1 ? "cols-1" : "cols-fill"}`, children: files.map((f, i) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      GeminiImageItem,
      {
        file: f,
        index: i,
        t,
        onPreview: (url, alt) => setPreview({ url, alt })
      },
      f.fileId || i
    )) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      ImagePreviewModal_default,
      {
        imageUrl: preview?.url ?? null,
        alt: preview?.alt,
        onClose: () => setPreview(null)
      }
    )
  ] });
};
var RemotionVideoCard = ({ rawData, isError, t }) => {
  if (isError || !rawData) return null;
  const metadata = rawData.metadata || {};
  const title = metadata.originalName || rawData.outputName || t("video.generatedTitle", "Remotion video.mp4");
  const url = rawData.url || rawData.contentUrl || rawData.downloadUrl || "";
  const template = rawData.template || metadata.template;
  const size = typeof metadata.size === "number" ? metadata.size : void 0;
  const sizeLabel = size === void 0 ? "" : size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(size / 1024)} KB`;
  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("common.copied", "\u5DF2\u590D\u5236"));
    } catch {
      toast.error(t("common.copyFailed", "\u590D\u5236\u5931\u8D25"));
    }
  };
  const handleOpen = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block remotion-video-card", children: [
    url ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      "video",
      {
        className: "rvc-player",
        src: url,
        controls: true,
        preload: "metadata",
        playsInline: true
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "rvc-empty", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuVideo, { size: 24, "aria-hidden": "true" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "rvc-body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "rvc-main", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "icon-badge info", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuVideo, { size: 18, "aria-hidden": "true" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "u-flex-1 u-min-w-0", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "u-font-bold u-truncate u-text-sm", children: title }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "rvc-meta", children: [
            template ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: template }) : null,
            sizeLabel ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: sizeLabel }) : null,
            rawData.fileId ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "u-font-mono", children: rawData.fileId }) : null
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "rvc-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { type: "button", className: "btn-tiny", onClick: handleOpen, disabled: !url, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuExternalLink, { size: 13, "aria-hidden": "true" }),
          t("common.open", "Open")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { type: "button", className: "btn-tiny", onClick: handleCopy, disabled: !url, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuCopy, { size: 13, "aria-hidden": "true" }),
          t("common.copy", "Copy")
        ] }),
        url ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("a", { className: "btn-tiny rvc-download", href: url, download: title, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuDownload, { size: 13, "aria-hidden": "true" }),
          t("common.download", "Download")
        ] }) : null
      ] })
    ] })
  ] });
};
var ZiweiChartCard = ({
  rawData,
  isError,
  t,
  navigateToPage
}) => {
  const dispatch = useAppDispatch();
  const store = useStore();
  const { user } = useAuth();
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const [isSaving, setIsSaving] = (0, import_react8.useState)(false);
  const [savedKey, setSavedKey] = (0, import_react8.useState)(null);
  if (isError || !rawData?.chart || !rawData?.summary) return null;
  const { chart, summary, input } = rawData;
  const palaces = Array.isArray(chart.palaces) ? chart.palaces : [];
  const palaceAliasMap = {
    \u4EC6\u5F79: "\u4EA4\u53CB",
    \u5B98\u7984: "\u4E8B\u4E1A"
  };
  const palaceSlotOrder = [
    "\u5B50\u5973",
    "\u592B\u59BB",
    "\u5144\u5F1F",
    "\u547D\u5BAB",
    "\u8D22\u5E1B",
    "\u7236\u6BCD",
    "\u75BE\u5384",
    "\u798F\u5FB7",
    "\u8FC1\u79FB",
    "\u4EC6\u5F79",
    "\u5B98\u7984",
    "\u7530\u5B85"
  ];
  const palacesByName = Object.fromEntries(
    palaces.map((palace) => [palace.name, palace])
  );
  const mutagenSummary = Array.isArray(chart.mutagenByYear) ? chart.mutagenByYear.map((item) => `${item.name}\u5316${item.mutagen}`).join("\u3001") : "";
  const centerFacts = [
    `\u9633\u5386\uFF1A${chart.solarDate} ${chart.time}`,
    `\u519C\u5386\uFF1A${chart.lunarDate}`,
    `\u5E72\u652F\uFF1A${chart.chineseDate}`,
    `\u4E94\u884C\u5C40\uFF1A${chart.fiveElementsClass}`,
    `\u547D\u4E3B\uFF1A${chart.soul} \u8EAB\u4E3B\uFF1A${chart.body}`
  ];
  const saveTitle = buildZiweiChartDocTitle(rawData);
  const formatMajorStar = (star) => {
    const suffix = [star.brightness, star.mutagen ? `\u5316${star.mutagen}` : ""].filter(Boolean).join("/");
    return {
      text: suffix ? `${star.name}/${suffix}` : star.name,
      hasMutagen: Boolean(star.mutagen)
    };
  };
  const renderPalaceCard = (name, extraClass = "") => {
    const palace = palacesByName[name];
    if (!palace) return null;
    const classes = [
      "ziwei-card__palace",
      extraClass,
      palace.name === "\u547D\u5BAB" ? "is-ming" : "",
      palace.isBodyPalace ? "is-body" : "",
      palace.isOriginalPalace ? "is-origin" : ""
    ].filter(Boolean).join(" ");
    const major = Array.isArray(palace.majorStars) ? palace.majorStars : [];
    const minor = Array.isArray(palace.minorStars) ? palace.minorStars : [];
    const adjective = Array.isArray(palace.adjectiveStars) ? palace.adjectiveStars : [];
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: classes, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__palace-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("strong", { children: [
          palace.heavenlyStem,
          palace.earthlyBranch
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
          "[",
          palaceAliasMap[palace.name] || palace.name,
          "\u5BAB]"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__palace-limit", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "\u5927\u9650" }),
        palace.decadal.range[0],
        "-",
        palace.decadal.range[1]
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__palace-limit", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "\u5C0F\u9650" }),
        palace.ages.join(" ")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__palace-stars", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ziwei-card__star-row is-major", children: major.length > 0 ? major.map((star) => {
          const formatted = formatMajorStar(star);
          return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            "span",
            {
              className: formatted.hasMutagen ? "is-mutagen" : "",
              children: formatted.text
            },
            `${palace.name}-${star.name}`
          );
        }) : "\u7A7A\u5BAB" }),
        minor.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ziwei-card__star-row is-minor", children: minor.map((star) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: star }, `${palace.name}-${star}`)) }),
        adjective.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ziwei-card__star-row is-adj", children: adjective.map((star) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: star }, `${palace.name}-${star}`)) })
      ] })
    ] }, name);
  };
  const handleSave = async () => {
    if (!user?.userId) {
      toast.error(t("userNotAuthenticated", "\u7528\u6237\u672A\u767B\u5F55"));
      return;
    }
    setIsSaving(true);
    try {
      const content = buildZiweiChartDocMarkdown(rawData);
      const key = await createDocState(
        {
          title: saveTitle,
          content,
          ...currentSpaceId ? { spaceId: currentSpaceId } : {}
        },
        { dispatch, getState: store.getState }
      );
      setSavedKey(key);
      toast.success(t("saveSuccess", "\u4FDD\u5B58\u6210\u529F"));
    } catch {
      toast.error(t("saveFailed", "\u4FDD\u5B58\u5931\u8D25"));
    } finally {
      setIsSaving(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block ziwei-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "u-flex-1 u-min-w-0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ziwei-card__title", children: "\u7D2B\u5FAE\u6597\u6570\u672C\u547D\u76D8" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__meta", children: [
          chart.zodiac,
          " \xB7 ",
          chart.sign,
          " \xB7 ",
          mutagenSummary || "\u65E0"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "button",
        {
          type: "button",
          className: "ziwei-card__save-button-minimal",
          disabled: isSaving,
          onClick: handleSave,
          title: t("ziwei.savePrompt", "\u4FDD\u5B58\u8FD9\u5F20\u547D\u76D8"),
          children: [
            savedKey ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuCheck, { size: 11, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuSave, { size: 12, "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: savedKey ? t("ziwei.saved", "\u5DF2\u4FDD\u5B58") : t("ziwei.saveDoc", "\u4FDD\u5B58") })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__toolbar-left", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ziwei-card__pill", children: summary.fiveElementsClass }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__meta", children: [
          input?.calendarType === "lunar" ? "\u519C\u5386" : "\u9633\u5386",
          " ",
          input?.dateStr,
          " ",
          chart.timeRange
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ziwei-card__toolbar-right", children: savedKey && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "button",
        {
          type: "button",
          className: "ziwei-card__open-button",
          onClick: () => navigateToPage(savedKey),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuExternalLink, { size: 11, "aria-hidden": "true" }),
            t("ziwei.openDoc", "\u6253\u5F00\u6587\u6863")
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ziwei-card__board-scroll", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__board", children: [
      palaceSlotOrder.slice(0, 4).map((name) => renderPalaceCard(name)),
      palaceSlotOrder.slice(4, 6).map((name) => renderPalaceCard(name, "is-side")),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ziwei-card__center-title", children: "\u547D\u76D8\u603B\u89C8" }),
        centerFacts.map((line) => {
          const [label, value = ""] = line.split("\uFF1A");
          return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__center-line", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
              label,
              "\uFF1A"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: value })
          ] }, line);
        }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ziwei-card__center-facts", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
            "\u547D\u5BAB ",
            summary.mingGong
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
            "\u8EAB\u5BAB ",
            summary.shenGong
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: input?.gender })
        ] })
      ] }),
      palaceSlotOrder.slice(6, 8).map((name) => renderPalaceCard(name, "is-side")),
      palaceSlotOrder.slice(8).map((name) => renderPalaceCard(name))
    ] }) })
  ] });
};
var unwrapXhsResult = (rawData) => {
  if (!rawData) return null;
  if (typeof rawData.ok === "boolean") return rawData;
  if (rawData.rawData && typeof rawData.rawData.ok === "boolean") {
    return rawData.rawData;
  }
  return null;
};
var formatXhsTopNote = (note) => {
  if (!note) return "";
  const title = note.title || note.noteId || "";
  const count = typeof note.count === "number" ? note.count.toLocaleString() : "";
  return title ? `${title} (${count})` : count;
};
var ReadXhsProfileCard = ({ rawData, isError, t }) => {
  const dispatch = useAppDispatch();
  const result = unwrapXhsResult(rawData);
  const failed = isError || result?.ok === false;
  const data = result?.data;
  const profile = data?.profile || {};
  const notes = Array.isArray(data?.notes) ? data.notes : [];
  const noteDetails = Array.isArray(data?.noteDetails) ? data.noteDetails : [];
  const analysis = data?.analysis || {};
  const interactionCounts = profile.interactionCounts || {};
  const commentBuckets = Array.isArray(analysis.commentBuckets) ? analysis.commentBuckets : [];
  const topLikedComments = Array.isArray(analysis.topLikedComments) ? analysis.topLikedComments : [];
  const collectionStatus = result?.collectionStatus || data?.collectionStatus || rawData?.collectionStatus || rawData?.data?.collectionStatus;
  const nextSuggestedAction = collectionStatus?.nextSuggestedAction || result?.nextSuggestedAction || data?.nextSuggestedAction || rawData?.nextSuggestedAction || rawData?.data?.nextSuggestedAction;
  const diagnostic = result?.diagnostic || data?.diagnostic || rawData?.diagnostic || rawData?.data?.diagnostic;
  const formatNum = (n) => typeof n === "number" ? n.toLocaleString() : String(n ?? "\u2014");
  const handleSuggestedActionClick = (action, label) => {
    let cmd = "";
    if (action === "read_more_notes") {
      cmd = "\u8BF7\u591A\u8BFB\u53D6 1 \u6B65\u66F4\u591A\u7B14\u8BB0";
    } else if (action === "read_visible_details") {
      cmd = "\u8BF7\u8BFB\u53D6\u516C\u5F00\u7B14\u8BB0\u8BE6\u60C5\u548C\u9996\u5C4F\u8BC4\u8BBA";
    } else if (action === "save_to_table") {
      cmd = "\u8BF7\u4FDD\u5B58\u5230\u8868\u683C";
    } else if (action === "stop_anonymous_unavailable" || action === "manual_login") {
      cmd = "\u8BF7\u8BF4\u660E\u533F\u540D\u516C\u5F00\u8BBF\u95EE\u4E0D\u53EF\u89C1\u7684\u539F\u56E0";
    } else if (action === "read_comments") {
      cmd = "\u8BF7\u57FA\u4E8E\u5F53\u524D\u533F\u540D\u516C\u5F00\u5FEB\u7167\u5206\u6790\uFF0C\u8BF4\u660E\u8BC4\u8BBA\u672A\u91C7\u96C6";
    } else {
      cmd = label || "\u6267\u884C\u4E0B\u4E00\u6B65\u64CD\u4F5C";
    }
    dispatch(
      handleSendMessage({
        userInput: cmd
      })
    );
  };
  const renderCollectionStatus = () => {
    if (!collectionStatus) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: {
      marginTop: 12,
      padding: 10,
      borderRadius: 6,
      background: "var(--bgSecondary, #f5f5f5)",
      border: "1px solid var(--borderSubtle, #e5e5e5)",
      fontSize: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuDatabase, { size: 13, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "\u91C7\u96C6\u72B6\u6001" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "6px 12px", opacity: 0.8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
          "\u6A21\u5F0F\uFF1A",
          collectionStatus.mode === "assisted" ? "\u8F85\u52A9\u81EA\u52A8\u5316" : "\u4FDD\u5B88\u8BFB\u53D6"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
          "\u5F53\u524D\u64CD\u4F5C\uFF1A",
          collectionStatus.action === "snapshot" ? "\u5355\u9875\u5FEB\u7167" : collectionStatus.action === "read_more_notes" ? "\u8BFB\u53D6\u66F4\u591A\u7B14\u8BB0" : collectionStatus.action === "read_visible_details" ? "\u8BFB\u53D6\u516C\u5F00\u8BE6\u60C5\u4E0E\u9996\u5C4F\u8BC4\u8BBA" : collectionStatus.action === "read_comments" ? "\u8BC4\u8BBA\u672A\u91C7\u96C6" : collectionStatus.action === "stop_anonymous_unavailable" ? "\u533F\u540D\u4E0D\u53EF\u89C1" : collectionStatus.action || "\u2014"
        ] }),
        collectionStatus.assistedStepCount !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
          "\u5DF2\u6267\u884C\u6B65\u6570\uFF1A",
          collectionStatus.assistedStepCount
        ] }),
        collectionStatus.limits && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
          collectionStatus.limits.maxAssistedSteps !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
            "\u6700\u5927\u6B65\u6570\u9650\u5236\uFF1A",
            collectionStatus.limits.maxAssistedSteps
          ] }),
          collectionStatus.limits.maxScrollPages !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
            "\u6EDA\u52A8\u4E0A\u9650\uFF1A",
            collectionStatus.limits.maxScrollPages,
            " \u9875"
          ] }),
          collectionStatus.limits.maxCommentPagesPerNote !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
            "\u8BC4\u8BBA\u4E0A\u9650\uFF1A",
            collectionStatus.limits.maxCommentPagesPerNote,
            " \u9875/\u7BC7"
          ] })
        ] })
      ] })
    ] });
  };
  const renderDiagnostic = () => {
    if (!diagnostic || typeof diagnostic !== "object") return null;
    const isErrorDiagnostic = diagnostic.captchaDetected || diagnostic.loginDetected || diagnostic.code === "risk_limit" || diagnostic.code === "login_required";
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: {
      marginTop: 10,
      padding: 8,
      borderRadius: 6,
      background: isErrorDiagnostic ? "rgba(255, 77, 79, 0.08)" : "rgba(250, 173, 20, 0.08)",
      border: isErrorDiagnostic ? "1px solid rgba(255, 77, 79, 0.2)" : "1px solid rgba(250, 173, 20, 0.2)",
      color: isErrorDiagnostic ? "var(--error, #ff4d4f)" : "var(--warning, #faad14)",
      fontSize: 11,
      display: "flex",
      alignItems: "flex-start",
      gap: 6
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuShieldAlert, { size: 14, style: { marginTop: 1, flexShrink: 0 }, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { fontWeight: 600 }, children: [
          "\u8BCA\u65AD\u63D0\u793A\uFF1A",
          [diagnostic.code, diagnostic.message].filter(Boolean).join(" - ") || "\u68C0\u6D4B\u5230\u5F02\u5E38\u72B6\u6001"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { opacity: 0.8, marginTop: 2 }, children: [
          diagnostic.loginDetected ? "\u68C0\u6D4B\u5230\u672A\u767B\u5F55\u6216\u9700\u91CD\u65B0\u767B\u5F55" : null,
          diagnostic.captchaDetected ? "\u68C0\u6D4B\u5230\u6ED1\u52A8\u9A8C\u8BC1\u7801" : null,
          diagnostic.pageTitle ? `\u9875\u9762\u6807\u9898: ${diagnostic.pageTitle}` : null
        ].filter(Boolean).join(" \xB7 ") })
      ] })
    ] });
  };
  const renderNextSuggestedAction = () => {
    if (!nextSuggestedAction) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: {
      marginTop: 12,
      padding: 10,
      borderRadius: 6,
      background: "var(--accentLight, rgba(24, 144, 255, 0.08))",
      border: "1px solid var(--accent, rgba(24, 144, 255, 0.2))",
      fontSize: 12
    }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { flex: 1 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontWeight: 600, color: "var(--accent, #1890ff)" }, children: "\u5EFA\u8BAE\u4E0B\u4E00\u6B65\uFF1A" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { opacity: 0.85 }, children: nextSuggestedAction.reason || "\u53EF\u4EE5\u6267\u884C\u5EFA\u8BAE\u7684\u64CD\u4F5C" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "button",
        {
          type: "button",
          className: "btn-primary-sm",
          style: {
            background: "var(--accent, #1890ff)",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 4
          },
          onClick: () => handleSuggestedActionClick(nextSuggestedAction.action, nextSuggestedAction.label),
          children: [
            nextSuggestedAction.action === "save_to_table" ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuSave, { size: 12, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuDatabase, { size: 12, "aria-hidden": "true" }),
            nextSuggestedAction.label || "\u6267\u884C"
          ]
        }
      )
    ] }) });
  };
  if (failed) {
    const code = result?.code || "";
    const message = result?.message || rawData?.displayData || t("xhs.failed", "\u8BFB\u53D6\u5C0F\u7EA2\u4E66\u8D26\u53F7\u5931\u8D25");
    const needsLogin = code === "login_required" || code === "not_logged_in";
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block x-post-card is-error", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__badge is-error", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuTriangle, { size: 15, "aria-hidden": "true" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__identity", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__title", children: t("xhs.failedTitle", "\u5C0F\u7EA2\u4E66\u8D26\u53F7\u8BFB\u53D6\u5931\u8D25") }),
          code ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__meta", children: code }) : null
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__text", children: String(message) }),
      needsLogin && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__hint", children: t(
        "xhs.loginRequired",
        "\u533F\u540D\u516C\u5F00\u8BBF\u95EE\u4E0D\u53EF\u89C1\u6216\u6682\u4E0D\u53EF\u7528\u3002\u5F53\u524D\u8BFB\u53D6\u5668\u4E0D\u4F1A\u767B\u5F55\u3001\u590D\u7528\u8D26\u53F7\u6216\u4F7F\u7528 cookie\u3002"
      ) }),
      renderCollectionStatus(),
      renderDiagnostic(),
      renderNextSuggestedAction()
    ] });
  }
  if (!result?.ok || !result.data) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block x-post-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__avatar", children: (profile.nickname || "\u4E66").slice(0, 1) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__identity", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__title", children: profile.nickname || "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__meta", children: profile.redId ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
          "\u5C0F\u7EA2\u4E66\u53F7 ",
          profile.redId
        ] }) : null })
      ] })
    ] }),
    profile.desc ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__text", children: profile.desc }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 12, padding: "4px 0 8px", fontSize: 12 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        "\u7B14\u8BB0 ",
        formatNum(notes.length)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        "\u8BE6\u60C5 ",
        formatNum(noteDetails.length)
      ] }),
      interactionCounts.follows != null && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        "\u5173\u6CE8 ",
        formatNum(interactionCounts.follows)
      ] }),
      interactionCounts.fans != null && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        "\u7C89\u4E1D ",
        formatNum(interactionCounts.fans)
      ] }),
      interactionCounts.likesAndCollects != null && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        "\u8D5E\u85CF ",
        formatNum(interactionCounts.likesAndCollects)
      ] })
    ] }),
    analysis.totalNotes != null && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 12, padding: "0 0 8px", fontSize: 12, opacity: 0.8 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        "\u5206\u6790\u7B14\u8BB0 ",
        formatNum(analysis.totalNotes)
      ] }),
      analysis.highestLikedNote && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        "\u6700\u9AD8\u8D5E ",
        formatXhsTopNote(analysis.highestLikedNote)
      ] }),
      analysis.highestCommentedNote && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        "\u6700\u591A\u8BC4\u8BBA ",
        formatXhsTopNote(analysis.highestCommentedNote)
      ] }),
      analysis.highestCollectedNote && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        "\u6700\u591A\u6536\u85CF ",
        formatXhsTopNote(analysis.highestCollectedNote)
      ] }),
      analysis.highestSharedNote && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        "\u6700\u591A\u5206\u4EAB ",
        formatXhsTopNote(analysis.highestSharedNote)
      ] })
    ] }),
    commentBuckets.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { padding: "0 0 6px", fontSize: 12 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { fontWeight: 600, marginBottom: 4 }, children: t("xhs.commentTopics", "\u8BC4\u8BBA\u4E3B\u9898") }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: commentBuckets.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "span",
        {
          style: {
            background: "var(--bgSecondary, #f0f0f0)",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 11
          },
          children: [
            b.label,
            b.count != null ? ` (${b.count})` : ""
          ]
        },
        b.label ?? `bucket-${i}`
      )) })
    ] }),
    topLikedComments.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { padding: "0 0 6px", fontSize: 12 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { fontWeight: 600, marginBottom: 4 }, children: t("xhs.topComments", "\u70ED\u95E8\u8BC4\u8BBA") }),
      topLikedComments.slice(0, 3).map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "div",
        {
          style: {
            padding: "2px 0",
            opacity: 0.85,
            fontSize: 11
          },
          children: [
            "\u2764 ",
            formatNum(c.likeCount),
            " \u2014 ",
            c.content || ""
          ]
        },
        c.commentId ?? `comment-${i}`
      ))
    ] }),
    renderCollectionStatus(),
    renderDiagnostic(),
    renderNextSuggestedAction()
  ] });
};
var unwrapXPostResult = (rawData) => {
  if (!rawData) return null;
  if (typeof rawData.ok === "boolean") return rawData;
  if (rawData.rawData && typeof rawData.rawData.ok === "boolean") {
    return rawData.rawData;
  }
  return null;
};
var ReadXPostCard = ({ rawData, isError, t }) => {
  const result = unwrapXPostResult(rawData);
  const failed = isError || result?.ok === false;
  const handleCopy = async () => {
    const text = result?.ok && result.data?.text ? result.data.text : typeof rawData?.displayData === "string" ? rawData.displayData : "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("common.copied", "\u5DF2\u590D\u5236"));
    } catch {
      toast.error(t("common.copyFailed", "\u590D\u5236\u5931\u8D25"));
    }
  };
  if (failed) {
    const message = result?.message || rawData?.error || rawData?.displayData || t("xPost.failed", "\u8BFB\u53D6 X \u5E16\u5B50\u5931\u8D25");
    const code = result?.code;
    const nextStep = result?.nextStep;
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block x-post-card is-error", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__badge is-error", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuTriangle, { size: 15, "aria-hidden": "true" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__identity", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__title", children: t("xPost.failedTitle", "X \u5E16\u5B50\u8BFB\u53D6\u5931\u8D25") }),
          code ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__meta", children: code }) : null
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__text", children: String(message) }),
      nextStep ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__hint", children: nextStep }) : null
    ] });
  }
  if (!result?.ok || !result.data) return null;
  const post = result.data;
  const author = post.author || {};
  const handle = author.handle ? `@${author.handle}` : "";
  const displayName = author.displayName || handle || t("xPost.author", "X \u7528\u6237");
  const backend = result.backend || post.sourceBackend;
  const url = post.url || rawData?.url || "";
  const handleOpen = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-content-block x-post-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__avatar", children: (displayName || handle || "X").slice(0, 1).toUpperCase() }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__identity", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__title", children: displayName }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__meta", children: [
          handle,
          backend ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: backend }) : null
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "button",
          {
            type: "button",
            className: "btn-tiny",
            onClick: handleCopy,
            title: t("common.copy", "Copy"),
            "aria-label": t("common.copy", "Copy"),
            children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuCopy, { size: 13, "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "button",
          {
            type: "button",
            className: "btn-tiny",
            onClick: handleOpen,
            disabled: !url,
            title: t("common.open", "Open"),
            "aria-label": t("common.open", "Open"),
            children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuExternalLink, { size: 13, "aria-hidden": "true" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "x-post-card__text", children: post.text }),
    url ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "x-post-card__footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuFileText, { size: 12, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: url })
    ] }) : null
  ] });
};
var DeleteSpacesCard = ({ rawData, isError, t }) => {
  if (isError || !rawData) return null;
  const deletable = Array.isArray(rawData.deletable) ? rawData.deletable : [];
  const skipped = Array.isArray(rawData.skipped) ? rawData.skipped : [];
  const deletedSpaceIds = Array.isArray(rawData.deletedSpaceIds) ? rawData.deletedSpaceIds : [];
  const failures = Array.isArray(rawData.failures) ? rawData.failures : [];
  const isExecuted = deletedSpaceIds.length > 0 || failures.length > 0;
  const title = isExecuted ? `\u5DF2\u5220\u9664 ${deletedSpaceIds.length} \u4E2A Space` : `\u5F85\u786E\u8BA4\u5220\u9664 ${deletable.length} \u4E2A Space`;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: `t-content-block delete-spaces-card ${isExecuted ? "is-done" : "is-preview"}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "delete-spaces-card__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: `delete-spaces-card__badge ${isExecuted ? "is-done" : "is-warning"}`, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuTrash2, { size: 16, "aria-hidden": "true" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "delete-spaces-card__title-wrap", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "delete-spaces-card__title", children: title }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "delete-spaces-card__subtitle", children: "\u53EA\u5220\u9664 Space \u58F3\u548C\u6210\u5458\u5173\u7CFB\uFF0C\u4E0D\u5220\u9664\u5176\u4E2D doc/dialog/file" })
      ] })
    ] }),
    !isExecuted && deletable.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "delete-spaces-list", children: deletable.map((item) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "delete-spaces-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "delete-spaces-row__main", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "delete-spaces-row__name", children: item.name || item.spaceId }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "delete-spaces-row__id", children: item.spaceId })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "delete-spaces-row__meta", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuUsers, { size: 13, "aria-hidden": "true" }),
          item.memberCount ?? 0
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuDatabase, { size: 13, "aria-hidden": "true" }),
          item.contentCount ?? 0
        ] })
      ] })
    ] }, item.spaceId)) }) : null,
    isExecuted && deletedSpaceIds.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "delete-spaces-result-list", children: deletedSpaceIds.map((spaceId) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "delete-spaces-result", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuCheck, { size: 14, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: spaceId })
    ] }, spaceId)) }) : null,
    skipped.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "delete-spaces-skipped", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "delete-spaces-skipped__title", children: [
        "\u5DF2\u8DF3\u8FC7 ",
        skipped.length,
        " \u4E2A"
      ] }),
      skipped.map((item) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "delete-spaces-skipped__item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: item.name || item.spaceId || "\u672A\u77E5 Space" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("code", { children: item.reason })
      ] }, `${item.spaceId}-${item.reason}`))
    ] }) : null,
    failures.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "delete-spaces-failures", children: failures.map((item) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
      item.dbKey,
      ": HTTP ",
      item.status
    ] }, item.dbKey)) }) : null
  ] });
};
function extractLoadSkillBody(content) {
  const trimmed = content.trim();
  const prefix = /^Skill\s+"[^"]*"\s+loaded inline\.?\s*Follow its instructions\.?\s*/;
  return trimmed.replace(prefix, "").trim();
}
var RENDERERS = {
  createPage: ({ rawData, t, openPreview, navigateToPage }) => {
    const title = asOptionalTrimmedString(rawData.title) ?? t("page.untitled", "Untitled Page");
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-inline-link", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => openPreview(rawData.id, title),
          "aria-label": title,
          style: {
            margin: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            font: "inherit",
            color: "inherit",
            textAlign: "left",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
            cursor: "pointer",
            appearance: "none"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuFileText, { size: 14, className: "icon-success", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "u-font-bold u-truncate u-text-sm u-flex-1", children: title })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "button",
        {
          type: "button",
          className: "btn-tiny",
          onClick: () => navigateToPage(rawData.id),
          children: t("common.open", "Open")
        }
      )
    ] });
  },
  createDoc: ({ rawData, t, openPreview, navigateToPage }) => {
    const pageId = rawData.dbKey || rawData.id;
    const title = asOptionalTrimmedString(rawData.title) ?? t("page.untitled", "Untitled Page");
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-inline-link", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => pageId && openPreview(pageId, title),
          "aria-label": title,
          disabled: !pageId,
          style: {
            margin: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            font: "inherit",
            color: "inherit",
            textAlign: "left",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
            cursor: pageId ? "pointer" : "default",
            appearance: "none"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuFileText, { size: 14, className: "icon-success", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "u-font-bold u-truncate u-text-sm u-flex-1", children: title })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "button",
        {
          type: "button",
          className: "btn-tiny",
          onClick: () => pageId && navigateToPage(pageId),
          disabled: !pageId,
          children: t("common.open", "Open")
        }
      )
    ] });
  },
  createTable: ({ rawData, t, navigateToPage }) => {
    const title = rawData.displayName || t("table.untitled", "Untitled Table");
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
      "button",
      {
        type: "button",
        className: "t-card-link",
        onClick: () => rawData.dbKey && navigateToPage(rawData.dbKey),
        disabled: !rawData.dbKey,
        style: {
          width: "100%",
          margin: 0,
          font: "inherit",
          color: "inherit",
          textAlign: "left",
          appearance: "none"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "icon-badge info", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuTable, { size: 18, "aria-hidden": "true" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "u-flex-1 u-min-w-0", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "u-font-bold u-truncate u-text-sm", children: title }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "u-text-xs u-dim u-font-mono", children: [
              "ID: ",
              rawData.tableId
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuExternalLink, { size: 16, className: "u-dim", "aria-hidden": "true" })
        ]
      }
    );
  },
  addTableRow: ({ rawData, isError, t }) => {
    if (isError || !rawData) return null;
    const rowId = rawData.rowId || rawData.dbKey?.split("-").pop() || "";
    const values = rawData.values || {};
    const hasValues = Object.keys(values).length > 0;
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "t-row-added", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuTable, { size: 13, className: "u-dim", "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "u-text-xs u-dim", children: [
        t("table.rowAdded", "\u5DF2\u6DFB\u52A0\u4E00\u884C"),
        rowId && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "u-font-mono", style: { marginLeft: 6, opacity: 0.5 }, children: [
          "#",
          rowId.slice(-6)
        ] })
      ] }),
      hasValues && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "u-text-xs u-dim", style: { marginLeft: 4 }, children: [
        "\u2014 ",
        Object.entries(values).map(([k, v]) => `${k}: ${v}`).join(", ")
      ] })
    ] });
  },
  prepareAgentDraft: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PrepareAgentDraftToolCard_default, { ...props }),
  createAgent: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(CreateAgentToolCard_default, { ...props }),
  updateSelf: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(UpdateAgentToolCard_default, { ...props }),
  updateAgent: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(UpdateAgentToolCard_default, { ...props }),
  appDeploy: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(AppDeployCard_default, { ...props }),
  geminiFlashImage: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(GeminiGallery, { ...props }),
  openAIGptImage: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(GeminiGallery, { ...props }),
  openAIGptImageGenerate: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(GeminiGallery, { ...props }),
  chatgptWebImageGenerate: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(GeminiGallery, { ...props }),
  openAIGptImageEdit: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(GeminiGallery, { ...props }),
  remotionRenderVideo: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(RemotionVideoCard, { ...props }),
  ziweiChart: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ZiweiChartCard, { ...props }),
  read_x_post: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ReadXPostCard, { ...props }),
  read_xhs_profile: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ReadXhsProfileCard, { ...props }),
  deleteSpaces: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(DeleteSpacesCard, { ...props }),
  loadSkill: ({ rawData, toolArgs }) => {
    const content = typeof rawData === "string" ? rawData : "";
    const notFoundMatch = content.match(/^Skill\s+"([^"]*)"\s+not found/);
    const isNotFound = Boolean(notFoundMatch);
    if (isNotFound) {
      const failedName = notFoundMatch?.[1] ?? "";
      const lines = content.split(/\n+/).filter(Boolean);
      const availableLine = lines.find(
        (line) => line.startsWith("Available skills:")
      );
      const noneLine = lines.find(
        (line) => line.startsWith("No skills were discovered")
      );
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "load-skill-card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "load-skill-line", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuShieldAlert, { size: 13, className: "icon-error", "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: failedName ? `Skill "${failedName}" not found` : "Skill not found" })
        ] }),
        availableLine ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "u-text-xs u-dim", children: availableLine }) : noneLine ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "u-text-xs u-dim", children: noneLine }) : null
      ] });
    }
    const name = asOptionalTrimmedString(toolArgs?.name) ?? content.match(/^Skill\s+"([^"]*)"\s+loaded inline/)?.[1] ?? "";
    const body = extractLoadSkillBody(content);
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "load-skill-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "load-skill-line", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuCheck, { size: 13, className: "icon-success", "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: name ? `Skill "${name}" loaded inline` : "Skill loaded inline" })
      ] }),
      body ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(CollapsibleToolText, { text: body, className: "code-dump" }) : null
    ] });
  },
  // 代码相关工具
  searchFiles: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SearchViewer, { ...props }),
  search_files: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SearchViewer, { ...props }),
  globFiles: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SearchViewer, { ...props }),
  glob_files: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SearchViewer, { ...props }),
  grep: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SearchViewer, { ...props }),
  searchWorkspace: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SearchViewer, { ...props }),
  readFile: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(CodePreviewViewer, { ...props }),
  applyLineEdits: (props) => props.rawData?.previewOnly ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ApplyLineEditsPreviewViewer_default, { ...props }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(CodeChangeViewer, { ...props }),
  writeFile: (props) => props.rawData?.applied === false && props.rawData?.conflict ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(WriteFileConflictViewer, { ...props }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(CodeChangeViewer, { ...props }),
  exec_shell: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ExecShellViewer, { ...props }),
  execShell: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ExecShellViewer, { ...props }),
  fetchWebpage: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(FetchViewer, { ...props }),
  fetch_webpage: (props) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(FetchViewer, { ...props })
};
var parseToolRawData = (rawData) => {
  if (typeof rawData !== "string") return rawData;
  try {
    return JSON.parse(rawData);
  } catch {
    return rawData;
  }
};
var LazyJsonDump = ({ data }) => {
  const json = (0, import_react8.useMemo)(() => {
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(CollapsibleToolText, { text: json, className: "code-dump" });
};
var ToolMessageContent = (props) => {
  const Component = props.toolName ? RENDERERS[props.toolName] : null;
  const normalizedRawData = (0, import_react8.useMemo)(
    () => parseToolRawData(props.rawData),
    [props.rawData]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "t-content-root", children: Component ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Component, { ...props, rawData: normalizedRawData }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LazyJsonDump, { data: normalizedRawData }) });
};
var ToolMessageContent_default = ToolMessageContent;

// packages/chat/messages/web/ToolMessageGroup.tsx
var import_jsx_runtime9 = __toESM(require_jsx_runtime());
var TR_HEADER_BUTTON_STYLE = {
  width: "100%",
  margin: 0,
  font: "inherit",
  color: "inherit",
  textAlign: "left",
  background: "transparent",
  appearance: "none"
};
var GENERIC_PHASE_TITLES = /* @__PURE__ */ new Set(["\u6267\u884C\u5DE5\u5177\u6B65\u9AA4", "\u5DE5\u5177"]);
var BODY_STICK_BOTTOM_PX = 56;
function isGenericPhaseTitle(title) {
  const t = (title || "").trim();
  return !t || GENERIC_PHASE_TITLES.has(t);
}
function isNearBodyBottom(el) {
  return el.scrollHeight - el.clientHeight - el.scrollTop <= BODY_STICK_BOTTOM_PX;
}
function pinBodyToBottom(el, stickToBottomRef, ignoreScrollRef) {
  if (!stickToBottomRef.current) return;
  const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
  if (el.scrollTop >= maxTop - 1) return;
  ignoreScrollRef.current += 2;
  el.scrollTop = el.scrollHeight;
  requestAnimationFrame(() => {
    if (ignoreScrollRef.current > 0) ignoreScrollRef.current -= 1;
  });
}
var ToolMessageGroup = (0, import_react9.memo)(
  ({
    messages,
    activityMessages,
    canCollapse = false
  }) => {
    const { t } = useTranslation("chat");
    const [expandedActions, setExpandedActions] = (0, import_react9.useState)(
      () => /* @__PURE__ */ new Set()
    );
    const [expandedPhases, setExpandedPhases] = (0, import_react9.useState)(
      () => /* @__PURE__ */ new Set()
    );
    const userOverrideRef = (0, import_react9.useRef)(false);
    const sawOpenTurnRef = (0, import_react9.useRef)(!canCollapse);
    const bodyRef = (0, import_react9.useRef)(null);
    const bodyContentRef = (0, import_react9.useRef)(null);
    const stickToBottomRef = (0, import_react9.useRef)(true);
    const ignoreBodyScrollRef = (0, import_react9.useRef)(0);
    const summary = (0, import_react9.useMemo)(() => {
      return formatToolGroupHeaderSummary(
        messages,
        createToolNameTranslator((key, options) => String(t(key, options)))
      );
    }, [messages, t]);
    const timeline = (0, import_react9.useMemo)(() => {
      return buildActivityTimeline(activityMessages ?? messages);
    }, [activityMessages, messages]);
    const messageStatus = (0, import_react9.useMemo)(() => {
      let hasRunning = false;
      let lastSettledStatus = null;
      for (const msg of messages) {
        const rawData = safeParse(msg.content);
        const isError = msg.toolPayload?.status === "failed" || !!msg.toolPayload?.error || !!rawData?.error;
        if (msg.isStreaming && !canCollapse) hasRunning = true;
        else lastSettledStatus = isError ? "failed" : "success";
      }
      if (hasRunning) return "running";
      return lastSettledStatus ?? "success";
    }, [messages, canCollapse]);
    const hasTimeline = timeline.phases.length > 0;
    const useFlatActions = hasTimeline && timeline.phases.every((phase) => isGenericPhaseTitle(phase.title));
    const flatActions = (0, import_react9.useMemo)(
      () => timeline.phases.flatMap((phase) => phase.actions),
      [timeline.phases]
    );
    const namedPhases = (0, import_react9.useMemo)(
      () => timeline.phases.filter((phase) => !isGenericPhaseTitle(phase.title)),
      [timeline.phases]
    );
    const overallStatus = (0, import_react9.useMemo)(() => {
      if (canCollapse && messageStatus !== "running") {
        if (messageStatus === "failed") return "failed";
        return "success";
      }
      if (!hasTimeline) return messageStatus;
      if (!canCollapse && timeline.phases.some((phase) => phase.status === "running"))
        return "running";
      const allActions = timeline.phases.flatMap((phase) => phase.actions);
      const hasFailedAction = allActions.some((action) => action.status === "failed");
      const hasSuccessAction = allActions.some((action) => action.status === "success");
      if (hasFailedAction && hasSuccessAction) return messageStatus;
      if (messageStatus === "failed") return "failed";
      if (timeline.phases.some((phase) => phase.status === "success"))
        return "success";
      if (timeline.phases.some((phase) => phase.status === "failed"))
        return "failed";
      if (timeline.completedPhases < timeline.totalPhases) return "pending";
      return "success";
    }, [hasTimeline, messageStatus, timeline]);
    const [expanded, setExpanded] = (0, import_react9.useState)(() => !canCollapse);
    (0, import_react9.useEffect)(() => {
      if (!canCollapse) {
        userOverrideRef.current = false;
        setExpanded(true);
        sawOpenTurnRef.current = true;
        stickToBottomRef.current = true;
        return;
      }
      if (!userOverrideRef.current) {
        setExpanded(false);
      }
    }, [canCollapse]);
    const actionCount = useFlatActions ? flatActions.length : namedPhases.reduce((n, phase) => n + phase.actions.length, 0);
    (0, import_react9.useLayoutEffect)(() => {
      if (!expanded) return;
      const el = bodyRef.current;
      if (!el) return;
      pinBodyToBottom(el, stickToBottomRef, ignoreBodyScrollRef);
      const raf = requestAnimationFrame(() => {
        pinBodyToBottom(el, stickToBottomRef, ignoreBodyScrollRef);
      });
      return () => cancelAnimationFrame(raf);
    }, [
      expanded,
      messages,
      activityMessages,
      timeline,
      expandedActions,
      expandedPhases,
      useFlatActions,
      actionCount,
      namedPhases.length,
      overallStatus
    ]);
    (0, import_react9.useEffect)(() => {
      if (!expanded) return;
      const el = bodyRef.current;
      const content = bodyContentRef.current;
      if (!el || !content) return;
      const ResizeObserverImpl = globalThis.ResizeObserver;
      if (!ResizeObserverImpl) return;
      let ro;
      try {
        ro = new ResizeObserverImpl(() => {
          pinBodyToBottom(el, stickToBottomRef, ignoreBodyScrollRef);
        });
      } catch {
        return;
      }
      ro.observe(content);
      return () => ro.disconnect();
    }, [expanded, useFlatActions, actionCount]);
    const handleBodyScroll = () => {
      if (ignoreBodyScrollRef.current > 0) {
        ignoreBodyScrollRef.current -= 1;
        return;
      }
      const el = bodyRef.current;
      if (!el) return;
      stickToBottomRef.current = isNearBodyBottom(el);
    };
    const handleHeaderToggle = () => {
      userOverrideRef.current = true;
      const next = !expanded;
      if (next) {
        stickToBottomRef.current = true;
      }
      setExpanded(next);
    };
    const toggleAction = (actionId) => {
      setExpandedActions((prev) => {
        const next = new Set(prev);
        if (next.has(actionId)) next.delete(actionId);
        else next.add(actionId);
        return next;
      });
    };
    const togglePhase = (phaseId) => {
      setExpandedPhases((prev) => {
        const next = new Set(prev);
        if (next.has(phaseId)) next.delete(phaseId);
        else next.add(phaseId);
        return next;
      });
    };
    const renderAction = (action) => {
      const isActionExpanded = expandedActions.has(action.id) || action.status === "running";
      const rawData = safeParse(action.message?.content);
      const isError = action.message?.toolPayload?.status === "failed" || !!action.message?.toolPayload?.error || !!rawData?.error;
      return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
        "div",
        {
          className: `tr-action tr-action--${action.status}`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
              "button",
              {
                type: "button",
                className: "tr-action-row",
                onClick: (event) => {
                  event.stopPropagation();
                  toggleAction(action.id);
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: `tr-action-dot tr-action-dot--${action.status}` }),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "tr-action-label u-truncate", children: action.label }),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "tr-action-chevron", "aria-hidden": "true", children: isActionExpanded ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuChevronDown, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuChevronRight, { size: 13 }) })
                ]
              }
            ),
            isActionExpanded && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "tr-action-detail", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              ToolMessageContent_default,
              {
                toolName: action.message?.toolName,
                rawData,
                isError,
                t,
                openPreview: () => {
                },
                navigateToPage: () => {
                },
                presentation: "groupDetail"
              }
            ) })
          ]
        },
        action.id
      );
    };
    const renderPhase = (phase) => {
      const canExpand = phase.actions.length > 0;
      const isPhaseExpanded = expandedPhases.has(phase.id) || phase.status === "running";
      return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
        "div",
        {
          className: `tr-phase tr-phase--${phase.status}${isPhaseExpanded ? " tr-phase--expanded" : ""}`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
              "button",
              {
                type: "button",
                className: "tr-phase-row",
                onClick: (event) => {
                  event.stopPropagation();
                  if (canExpand) togglePhase(phase.id);
                },
                "aria-expanded": canExpand ? isPhaseExpanded : void 0,
                disabled: !canExpand,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: `tr-phase-status tr-phase-status--${phase.status}`, children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(StatusIcon, { status: phase.status, toolName: "" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "tr-phase-main", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "tr-phase-title u-truncate", children: phase.title }),
                    phase.actions.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "tr-phase-meta", children: [
                      phase.actions.length,
                      " \u4E2A\u52A8\u4F5C"
                    ] })
                  ] }),
                  canExpand && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "tr-phase-chevron", "aria-hidden": "true", children: isPhaseExpanded ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuChevronDown, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuChevronRight, { size: 13 }) })
                ]
              }
            ),
            isPhaseExpanded && canExpand && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "tr-action-list", children: phase.actions.map(renderAction) })
          ]
        },
        phase.id
      );
    };
    const showBody = expanded;
    const headerMain = /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "tr-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: `tr-icon ${overallStatus}`, children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(StatusIcon, { status: overallStatus, toolName: "" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "tr-summary u-truncate", children: summary })
    ] });
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
      "div",
      {
        className: `tool-msg-row ${overallStatus} ${expanded ? "" : "is-collapsed"}`,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
            "button",
            {
              type: "button",
              className: "tr-header",
              style: TR_HEADER_BUTTON_STYLE,
              onClick: handleHeaderToggle,
              "aria-expanded": expanded,
              "aria-label": expanded ? "\u6536\u8D77\u6D3B\u52A8\u8BE6\u60C5" : "\u5C55\u5F00\u6D3B\u52A8\u8BE6\u60C5",
              children: [
                headerMain,
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "tr-chevron", "aria-hidden": "true", children: expanded ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuChevronDown, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuChevronRight, { size: 14 }) })
              ]
            }
          ),
          showBody && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
            "div",
            {
              ref: bodyRef,
              className: "tr-body tool-group__body",
              onScroll: handleBodyScroll,
              children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { ref: bodyContentRef, className: "tr-body-content", children: useFlatActions && flatActions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "tr-action-list", children: flatActions.map(renderAction) }) : namedPhases.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "tr-phase-list", children: namedPhases.map(renderPhase) }) : messages.map((msg) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                "div",
                {
                  className: "tool-group__item",
                  children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                    ToolMessageContent_default,
                    {
                      toolName: msg.toolName,
                      rawData: safeParse(msg.content),
                      isError: msg.toolPayload?.status === "failed" || !!msg.toolPayload?.error || !!safeParse(msg.content)?.error,
                      t,
                      openPreview: () => {
                      },
                      navigateToPage: () => {
                      },
                      presentation: "groupDetail"
                    }
                  )
                },
                msg.id ?? msg.dbKey ?? msg.tool_call_id
              )) })
            }
          )
        ]
      }
    );
  }
);
var ToolMessageGroup_default = ToolMessageGroup;

// packages/chat/messages/web/MessageLayout.tsx
var import_react12 = __toESM(require_react());

// packages/chat/messages/web/StreamingPendingIndicator.tsx
var import_react10 = __toESM(require_react());
var import_jsx_runtime10 = __toESM(require_jsx_runtime());
var StreamingPendingIndicator = (0, import_react10.memo)(function StreamingPendingIndicator2({
  className,
  size = "md"
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
    "span",
    {
      className: `streaming-pending-indicator streaming-pending-indicator--${size}${className ? ` ${className}` : ""}`,
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "streaming-pending-indicator__dot" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "streaming-pending-indicator__dot" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "streaming-pending-indicator__dot" })
      ]
    }
  );
});

// packages/chat/hooks/useActionsHoverPin.ts
var import_react11 = __toESM(require_react());
var ACTIONS_HOVER_LEAVE_DELAY_MS = 200;
function useActionsHoverPin(enabled, leaveDelayMs = ACTIONS_HOVER_LEAVE_DELAY_MS) {
  const [pinned, setPinned] = (0, import_react11.useState)(false);
  const leaveTimerRef = (0, import_react11.useRef)(null);
  const clearLeaveTimer = (0, import_react11.useCallback)(() => {
    if (leaveTimerRef.current != null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);
  (0, import_react11.useEffect)(() => () => clearLeaveTimer(), [clearLeaveTimer]);
  const onMouseEnter = (0, import_react11.useCallback)(() => {
    if (!enabled) return;
    clearLeaveTimer();
    setPinned(true);
  }, [enabled, clearLeaveTimer]);
  const onMouseLeave = (0, import_react11.useCallback)(() => {
    if (!enabled) return;
    clearLeaveTimer();
    leaveTimerRef.current = window.setTimeout(() => {
      setPinned(false);
      leaveTimerRef.current = null;
    }, leaveDelayMs);
  }, [enabled, clearLeaveTimer, leaveDelayMs]);
  return {
    isActionsHover: enabled && pinned,
    onMouseEnter: enabled ? onMouseEnter : void 0,
    onMouseLeave: enabled ? onMouseLeave : void 0
  };
}

// packages/chat/messages/web/MessageLayout.tsx
var import_jsx_runtime11 = __toESM(require_jsx_runtime());
function areMessageLayoutPropsEqual(prev, next) {
  return prev.isRobot === next.isRobot && prev.type === next.type && prev.displayName === next.displayName && prev.isTouch === next.isTouch && prev.isStreaming === next.isStreaming && prev.hasVisibleContent === next.hasVisibleContent && prev.isCliAgent === next.isCliAgent && prev.collapsed === next.collapsed && prev.showActions === next.showActions && prev.messageId === next.messageId && prev.avatarSrc === next.avatarSrc && prev.content === next.content && prev.actions === next.actions && prev.confirmBar === next.confirmBar && prev.onClick === next.onClick && prev.onTouchStart === next.onTouchStart && prev.onTouchMove === next.onTouchMove && prev.onTouchEnd === next.onTouchEnd && prev.onAvatarClick === next.onAvatarClick;
}
var MessageLayout = (0, import_react12.memo)(
  ({
    isRobot,
    type,
    displayName,
    isTouch,
    isStreaming = false,
    hasVisibleContent = false,
    isCliAgent = false,
    collapsed = false,
    showActions = false,
    messageId,
    content,
    actions,
    confirmBar,
    onClick,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    avatarSrc,
    onAvatarClick
  }) => {
    const {
      isActionsHover,
      onMouseEnter: onActionsEnter,
      onMouseLeave: onActionsLeave
    } = useActionsHoverPin(Boolean(actions) && !isTouch);
    const avatarDesktop = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "avatar-area", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "avatar-wrapper", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        Avatar_default,
        {
          name: displayName,
          type: isRobot ? "agent" : "user",
          size: "small",
          shape: "full",
          src: avatarSrc,
          onClick: isRobot ? onAvatarClick : void 0
        }
      ),
      isRobot && isStreaming && !hasVisibleContent && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "avatar-indicator-pos", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(StreamingPendingIndicator, { size: "sm" }) })
    ] }) });
    const robotName = isRobot && displayName && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: `robot-name${isTouch ? " mobile" : ""}`, children: [
      displayName,
      isCliAgent && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { className: "cli-badge", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(LuTerminal, { size: isTouch ? 10 : 11, "aria-hidden": "true" }),
        "CLI"
      ] })
    ] });
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_jsx_runtime11.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
      "div",
      {
        className: [
          "msg",
          type,
          collapsed ? "collapsed" : "",
          showActions ? "actions-visible" : ""
        ].filter(Boolean).join(" "),
        "data-message-id": messageId,
        onClick,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        children: [
          !isTouch && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
            "div",
            {
              className: [
                "msg-inner",
                "desktop",
                "msg-hover-target",
                isActionsHover ? "is-actions-hover" : ""
              ].filter(Boolean).join(" "),
              onMouseEnter: onActionsEnter,
              onMouseLeave: onActionsLeave,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "msg-bubble-row", children: [
                  avatarDesktop,
                  /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "content-area", children: [
                    robotName,
                    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: `msg-body ${type}`, children: [
                      content,
                      confirmBar
                    ] })
                  ] })
                ] }),
                actions && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "msg-actions-below", children: actions })
              ]
            }
          ),
          isTouch && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "msg-inner mobile", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "msg-header", children: [
              /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "avatar-wrapper", children: [
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                  Avatar_default,
                  {
                    name: displayName,
                    type: isRobot ? "agent" : "user",
                    size: "small",
                    shape: "full",
                    src: avatarSrc,
                    onClick: isRobot ? onAvatarClick : void 0
                  }
                ),
                isRobot && isStreaming && !hasVisibleContent && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "avatar-indicator-pos mobile", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(StreamingPendingIndicator, { size: "sm" }) })
              ] }),
              robotName
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "content-area mobile", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: `msg-body ${type} mobile`, children: [
              content,
              confirmBar
            ] }) })
          ] }),
          isTouch && actions
        ]
      }
    ) });
  },
  areMessageLayoutPropsEqual
);

// packages/chat/messages/web/MessageContent.tsx
var import_react24 = __toESM(require_react());

// packages/chat/messages/web/MessageText.tsx
var import_react17 = __toESM(require_react());

// packages/chat/messages/web/StreamingInlineReactArtifact.tsx
var import_react16 = __toESM(require_react());

// packages/chat/messages/web/StreamingMessageText.tsx
var import_react15 = __toESM(require_react());

// packages/chat/messages/web/StreamingStructuredMarkdown.tsx
var import_react13 = __toESM(require_react());
var import_jsx_runtime12 = __toESM(require_jsx_runtime());
function isTextNode(node) {
  return typeof node?.text === "string";
}
function getNodeText(node) {
  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }
  if (isTextNode(node)) {
    return node.text;
  }
  if (Array.isArray(node?.children)) {
    const text = node.type === "code-line" ? `${getNodeText(node.children)}
` : getNodeText(node.children);
    return text;
  }
  return "";
}
function renderTextLeaf(node, key, renderText) {
  let content = renderText(node.text);
  if (node.code) {
    content = /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("code", { className: "inline-code", children: content });
  }
  if (node.bold) {
    content = /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("strong", { children: content });
  }
  if (node.italic) {
    content = /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("em", { children: content });
  }
  if (node.underline) {
    content = /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("u", { children: content });
  }
  if (node.strikethrough) {
    content = /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("del", { children: content });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_react13.default.Fragment, { children: content }, key);
}
function renderNodes(nodes, path, renderText) {
  return nodes.map(
    (node, index) => renderNode(node, `${path}-${index}`, renderText)
  );
}
function renderListItem(node, key, renderText) {
  const isTaskItem = node.checked !== void 0;
  const isCompleted = node.checked === true;
  const className = [
    "custom-list-item",
    isTaskItem && "task-list-item",
    isCompleted && "task-completed"
  ].filter(Boolean).join(" ");
  const content = renderNodes(node.children || [], key, renderText);
  if (!isTaskItem) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("li", { className, children: content }, key);
  }
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("li", { className, children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
      "input",
      {
        type: "checkbox",
        checked: isCompleted,
        readOnly: true,
        className: "list-checkbox",
        contentEditable: false,
        "aria-label": isCompleted ? "Completed task" : "Incomplete task"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: `task-content${isCompleted ? " task-completed" : ""}`, children: content })
  ] }, key);
}
function renderCodeBlock(node, key) {
  const language = node.language || "plaintext";
  const content = getNodeText(node.children || []).replace(/\n$/, "");
  const languageClass = `language-${language}`;
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("pre", { className: `streaming-markdown-code ${languageClass}`, children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("code", { className: languageClass, children: content }) }, key);
}
function renderTable(node, key, renderText) {
  const rows = Array.isArray(node.children) ? node.children : [];
  const headerRow = rows[0];
  const hasHeader = Array.isArray(headerRow?.children) ? headerRow.children.every((cell) => cell?.header) : false;
  const bodyRows = hasHeader ? rows.slice(1) : rows;
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "table-container streaming-markdown-table", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("table", { className: "data-table", children: [
    hasHeader ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("tr", { children: headerRow.children.map((cell, index) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("th", { children: renderNodes(
      cell.children || [],
      `${key}-head-${index}`,
      renderText
    ) }, `${key}-head-${index}`)) }) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("tbody", { children: bodyRows.map((row, rowIndex) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("tr", { children: (row.children || []).map((cell, cellIndex) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("td", { children: renderNodes(
      cell.children || [],
      `${key}-cell-${rowIndex}-${cellIndex}`,
      renderText
    ) }, `${key}-cell-${rowIndex}-${cellIndex}`)) }, `${key}-row-${rowIndex}`)) })
  ] }) }, key);
}
function renderNode(node, key, renderText) {
  if (isTextNode(node)) {
    return renderTextLeaf(node, key, renderText);
  }
  switch (node?.type) {
    case "paragraph":
    case "heading-one":
    case "heading-two":
    case "heading-three":
    case "heading-four":
    case "heading-five":
    case "heading-six":
    case "quote":
    case "thematic-break":
      return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(TextBlockRenderer, { attributes: {}, element: node, children: renderNodes(node.children || [], key, renderText) }, key);
    case "link":
      return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(SafeLink, { href: node.url, className: "streaming-markdown-link", children: renderNodes(node.children || [], key, renderText) }, key);
    case "code-inline":
      return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("code", { className: "inline-code", children: renderNodes(node.children || [], key, renderText) }, key);
    case "list":
      return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(List, { attributes: {}, element: node, children: (node.children || []).map(
        (child, index) => renderListItem(child, `${key}-${index}`, renderText)
      ) }, key);
    case "list-item":
      return renderListItem(node, key, renderText);
    case "code-block":
      return renderCodeBlock(node, key);
    case "table":
      return renderTable(node, key, renderText);
    case "table-row":
    case "table-cell":
    case "code-line":
      return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_react13.default.Fragment, { children: renderNodes(node.children || [], key, renderText) }, key);
    default:
      return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { children: renderNodes(node.children || [], key, renderText) }, key);
  }
}
var StreamingStructuredMarkdown = (0, import_react13.memo)(
  ({ nodes, renderText, cursor }) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "streaming-markdown-body ReadOnlyMarkdownContent__body", children: [
    renderNodes(nodes, "root", renderText),
    cursor
  ] })
);

// packages/chat/messages/web/streamingMarkdownModel.ts
function isPlainTextLeaf(node) {
  return typeof node?.text === "string" && Object.keys(node).every((key) => key === "text");
}
function isPlainTextParagraph(node) {
  return node?.type === "paragraph" && Array.isArray(node.children) && node.children.every(isPlainTextLeaf);
}
function buildStreamingMarkdownModel(content) {
  if (!content) {
    return { kind: "plain-text", content };
  }
  try {
    const nodes = markdownToSlate(content) || [];
    if (nodes.length === 1 && isPlainTextParagraph(nodes[0])) {
      return { kind: "plain-text", content };
    }
    if (nodes.length > 0) {
      return { kind: "structured", nodes };
    }
  } catch {
  }
  return { kind: "plain-text", content };
}

// packages/chat/messages/web/useStreamingReveal.ts
var import_react14 = __toESM(require_react());
var STREAMING_REVEAL_DELAY_MS = 12;
function splitVisibleCharacters(content) {
  const Segmenter = Intl.Segmenter;
  if (typeof Segmenter === "function") {
    const segmenter = new Segmenter(void 0, { granularity: "grapheme" });
    return Array.from(segmenter.segment(content), (part) => part.segment);
  }
  return Array.from(content);
}
function useStreamingReveal(content) {
  const [visibleContent, setVisibleContent] = (0, import_react14.useState)("");
  const visibleContentRef = (0, import_react14.useRef)("");
  const revealTimerRef = (0, import_react14.useRef)(null);
  (0, import_react14.useEffect)(() => {
    visibleContentRef.current = visibleContent;
  }, [visibleContent]);
  (0, import_react14.useEffect)(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    const currentVisible = visibleContentRef.current;
    if (currentVisible === content) return;
    if (currentVisible && !content.startsWith(currentVisible)) {
      visibleContentRef.current = content;
      setVisibleContent(content);
      return;
    }
    const revealNext = () => {
      const targetCharacters = splitVisibleCharacters(content);
      const visibleCharacters = splitVisibleCharacters(visibleContentRef.current);
      const nextCount = visibleCharacters.length + 1;
      const partialContent = targetCharacters.slice(0, nextCount).join("");
      visibleContentRef.current = partialContent;
      setVisibleContent(partialContent);
      if (nextCount >= targetCharacters.length) return;
      revealTimerRef.current = setTimeout(revealNext, STREAMING_REVEAL_DELAY_MS);
    };
    revealTimerRef.current = setTimeout(() => {
      revealTimerRef.current = null;
      revealNext();
    }, STREAMING_REVEAL_DELAY_MS);
    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, [content]);
  return visibleContent;
}

// packages/chat/messages/web/StreamingMessageText.tsx
var import_jsx_runtime13 = __toESM(require_jsx_runtime());
var FADE_CHAR_COUNT = 20;
var StreamingTextSpan = (0, import_react15.memo)(({ content }) => {
  const characters = (0, import_react15.useMemo)(() => splitVisibleCharacters(content), [content]);
  const fadeStartIndex = Math.max(0, characters.length - FADE_CHAR_COUNT);
  const stablePrefix = characters.slice(0, fadeStartIndex).join("");
  const fadingCharacters = characters.slice(fadeStartIndex);
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "streaming-message-text", children: [
    stablePrefix,
    fadingCharacters.map((char, index) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      "span",
      {
        className: "streaming-message-text__char",
        children: char
      },
      fadeStartIndex + index
    ))
  ] });
});
var StreamingMessageText = (0, import_react15.memo)(
  ({ content, isStreaming = true }) => {
    const visibleContent = useStreamingReveal(content);
    const model = (0, import_react15.useMemo)(
      () => buildStreamingMarkdownModel(visibleContent),
      [visibleContent]
    );
    const isActivelyRevealing = visibleContent.length < content.length;
    const cursorElement = isStreaming && isActivelyRevealing ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "streaming-message-text__cursor", "aria-hidden": "true" }) : null;
    if (model.kind === "plain-text") {
      return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "streaming-message-text-wrapper", children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StreamingTextSpan, { content: model.content }),
        cursorElement
      ] });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      StreamingStructuredMarkdown,
      {
        nodes: model.nodes,
        renderText: (text) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StreamingTextSpan, { content: text }),
        cursor: cursorElement
      }
    );
  }
);

// packages/chat/messages/web/StreamingInlineReactArtifact.tsx
var import_jsx_runtime14 = __toESM(require_jsx_runtime());
var IframeArtifactBlock = (0, import_react16.lazy)(() => import("/public/assets/chunks/IframeArtifactBlock-2AVRCMAT.js"));
function InlineArtifactFallback() {
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "streaming-inline-artifact__placeholder", children: "\u6B63\u5728\u751F\u6210\u9884\u89C8\u2026" });
}
var InlineArtifactVisibleText = (0, import_react16.memo)(
  ({ visibleText, isStreaming }) => {
    const staticModel = (0, import_react16.useMemo)(
      () => isStreaming ? null : buildStreamingMarkdownModel(visibleText),
      [visibleText, isStreaming]
    );
    if (!visibleText) return null;
    if (isStreaming) {
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(StreamingMessageText, { content: visibleText, isStreaming });
    }
    if (staticModel?.kind === "structured") {
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
        StreamingStructuredMarkdown,
        {
          nodes: staticModel.nodes,
          renderText: (text) => text,
          cursor: null
        }
      );
    }
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "simple-text", children: visibleText });
  }
);
var StreamingInlineReactArtifact = (0, import_react16.memo)(
  ({ visibleText, artifact, isStreaming = true }) => {
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "streaming-inline-artifact", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(InlineArtifactVisibleText, { visibleText, isStreaming }),
      artifact && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "streaming-inline-artifact__preview", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(import_react16.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(InlineArtifactFallback, {}), children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
        IframeArtifactBlock,
        {
          rawCode: artifact.code,
          className: "streaming-inline-artifact__frame"
        }
      ) }) })
    ] });
  }
);

// packages/chat/messages/web/inlineReactArtifactParser.ts
var REACT_FENCE_START_RE = /```(jsx|tsx)(?:[^\n`]*)?\n/gi;
function isPreviewCandidate(code) {
  return /function\s+Example\s*\(/.test(code);
}
function compactVisibleText(text) {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function extractStreamingInlineReactArtifact(content) {
  let visibleText = "";
  let cursor = 0;
  let artifact = null;
  REACT_FENCE_START_RE.lastIndex = 0;
  while (true) {
    const match = REACT_FENCE_START_RE.exec(content);
    if (!match) break;
    const language = match[1].toLowerCase();
    const fenceStart = match.index;
    const codeStart = REACT_FENCE_START_RE.lastIndex;
    const closingFenceIndex = content.indexOf("```", codeStart);
    const complete = closingFenceIndex >= 0;
    const codeEnd = complete ? closingFenceIndex : content.length;
    const code = content.slice(codeStart, codeEnd).trim();
    visibleText += content.slice(cursor, fenceStart);
    cursor = complete ? closingFenceIndex + 3 : content.length;
    if (code && isPreviewCandidate(code)) {
      artifact = { language, code, complete };
    }
    if (!complete) break;
    REACT_FENCE_START_RE.lastIndex = cursor;
  }
  visibleText += content.slice(cursor);
  return {
    visibleText: compactVisibleText(visibleText),
    artifact
  };
}

// packages/chat/messages/web/MessageText.tsx
var import_jsx_runtime15 = __toESM(require_jsx_runtime());
function normalizeMessageMarkdownLinks(content) {
  return content.replace(
    /(^|[\s（])((?:\/setting\/secrets|\/settings\/secrets)\?key=[A-Z0-9_]+&source=[a-z0-9_-]+)/g,
    (_match, prefix, url) => `${prefix}[${url}](${url.replace("/settings/", "/setting/")})`
  );
}
var MessageText = (0, import_react17.memo)(
  ({
    content,
    role,
    isStreaming = false
  }) => {
    const normalizedContent = (0, import_react17.useMemo)(
      () => role === "self" ? content : normalizeMessageMarkdownLinks(content),
      [content, role]
    );
    const inlineArtifact = (0, import_react17.useMemo)(
      () => role === "self" ? null : extractStreamingInlineReactArtifact(normalizedContent),
      [normalizedContent, role]
    );
    if (role === "self") {
      return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "message-text", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "simple-text", children: content }) });
    }
    const hasInlineArtifact = !!inlineArtifact?.artifact;
    if (isStreaming || hasInlineArtifact) {
      return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "message-text", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
        StreamingInlineReactArtifact,
        {
          visibleText: inlineArtifact?.visibleText ?? normalizedContent,
          artifact: inlineArtifact?.artifact ?? null,
          isStreaming
        }
      ) });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "message-text", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(InlineArtifactVisibleText, { visibleText: normalizedContent, isStreaming: false }) });
  }
);

// packages/chat/messages/web/ImagePreview.tsx
var import_react18 = __toESM(require_react());
var import_jsx_runtime16 = __toESM(require_jsx_runtime());
var ImagePreview = (0, import_react18.memo)(
  ({
    src,
    alt,
    onPreview
  }) => {
    const handleClick = (0, import_react18.useCallback)(() => onPreview(src), [src, onPreview]);
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "msg-image-wrap", children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      "img",
      {
        src,
        alt: alt || "\u6D88\u606F\u56FE\u7247",
        className: "msg-image",
        onClick: handleClick,
        role: "button",
        tabIndex: 0,
        loading: "lazy",
        decoding: "async",
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }
      }
    ) });
  }
);

// packages/chat/messages/web/ThinkingSection.tsx
var import_react20 = __toESM(require_react());

// packages/chat/hooks/useThinkingVisibility.ts
var import_react19 = __toESM(require_react());
var useThinkingVisibility = (showThinking, content, thinkContent) => {
  const init = showThinking && !!thinkContent && !content;
  const [isExpanded, setIsExpanded] = (0, import_react19.useState)(init);
  const [manual, setManual] = (0, import_react19.useState)(false);
  const toggle = (0, import_react19.useCallback)(() => {
    setManual(true);
    setIsExpanded((v) => !v);
  }, []);
  (0, import_react19.useEffect)(() => {
    if (content && isExpanded && !manual) {
      const t = setTimeout(() => setIsExpanded(false), 300);
      return () => clearTimeout(t);
    }
  }, [content, isExpanded, manual]);
  return [isExpanded, toggle];
};

// packages/chat/messages/web/ThinkingSection.tsx
var import_jsx_runtime17 = __toESM(require_jsx_runtime());
var ThinkingSection = (0, import_react20.memo)(
  ({
    thinkContent,
    messageContent,
    role,
    isStreaming = false
  }) => {
    const showThinking = useAppSelector(selectShowThinking);
    const { t } = useTranslation("chat");
    const shouldRender = role !== "self" && thinkContent && showThinking;
    const [isExpanded, toggleThinking] = useThinkingVisibility(
      showThinking,
      messageContent,
      thinkContent || ""
    );
    const slate = (0, import_react20.useMemo)(
      () => thinkContent ? markdownToSlate(thinkContent) : [],
      [thinkContent]
    );
    if (!shouldRender) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(import_jsx_runtime17.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "thinking-container", children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
        "button",
        {
          className: "thinking-toggle",
          onClick: toggleThinking,
          "aria-expanded": isExpanded,
          type: "button",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "thinking-icon", "aria-hidden": "true", children: isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(LuChevronDown, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(LuChevronRight, { size: 14 }) }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "thinking-label", children: t("thinkingProcess") })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        "div",
        {
          className: `thinking-content ${isExpanded ? "expanded" : "collapsed"}`,
          children: isExpanded && slate && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "thinking-inner", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "thinking-editor-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            Editor_default,
            {
              initialValue: slate,
              readOnly: true
            }
          ) }) })
        }
      )
    ] }) });
  }
);

// packages/render/canvas/canvasTree.ts
var ALLOWED_NODE_TYPES = /* @__PURE__ */ new Set([
  "Canvas",
  "Stack",
  "Grid",
  "Section",
  "Text",
  "Button",
  "Card",
  "MetricCard",
  "Chart",
  "List",
  "Table",
  "Toolbar"
]);
var ALLOWED_STYLE_KEYS = /* @__PURE__ */ new Set([
  "alignItems",
  "background",
  "backgroundColor",
  "border",
  "borderColor",
  "borderRadius",
  "color",
  "display",
  "fontSize",
  "fontWeight",
  "gap",
  "gridTemplateColumns",
  "height",
  "justifyContent",
  "margin",
  "maxWidth",
  "minHeight",
  "padding",
  "textAlign",
  "width"
]);
function createCanvasDocument(rootId = "root") {
  return {
    version: 1,
    root: {
      id: rootId,
      type: "Canvas",
      children: []
    },
    selectedNodeId: null
  };
}
function isSafeId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}
function isSafePrimitive(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function isSafeRuntimeValue(value) {
  return isSafePrimitive(value) || Array.isArray(value) && value.every((item) => isSafePrimitive(item));
}
function sanitizeRuntimeAction(value) {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "toggle" && isSafeId(value.key)) {
    return { type: "toggle", key: value.key };
  }
  if (value.type === "setState" && isSafeId(value.key) && isSafeRuntimeValue(value.value)) {
    return { type: "setState", key: value.key, value: value.value };
  }
  if (value.type === "scrollTo" && isSafeId(value.targetId)) {
    return { type: "scrollTo", targetId: value.targetId };
  }
  return null;
}
function sanitizeProps(props) {
  if (!isRecord(props)) return void 0;
  const safeProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on") || key === "dangerouslySetInnerHTML") continue;
    if (key === "action" || key === "runtimeAction") {
      const action = sanitizeRuntimeAction(value);
      if (action) safeProps[key] = action;
      continue;
    }
    if (isSafePrimitive(value)) {
      safeProps[key] = value;
      continue;
    }
    if (Array.isArray(value) && value.every((item) => isSafePrimitive(item))) {
      safeProps[key] = value;
      continue;
    }
    if (key === "rows" && Array.isArray(value) && value.every((row) => Array.isArray(row) && row.every(isSafePrimitive))) {
      safeProps[key] = value;
    }
  }
  return Object.keys(safeProps).length ? safeProps : void 0;
}
function sanitizeStyle(style) {
  if (!isRecord(style)) return void 0;
  const safeStyle = {};
  for (const [key, value] of Object.entries(style)) {
    if (!ALLOWED_STYLE_KEYS.has(key)) continue;
    if (typeof value !== "string" && typeof value !== "number") continue;
    if (typeof value === "string" && /url\s*\(|expression\s*\(/i.test(value)) continue;
    safeStyle[key] = value;
  }
  return Object.keys(safeStyle).length ? safeStyle : void 0;
}
function sanitizeCanvasNode(node) {
  if (!isRecord(node) || !isSafeId(node.id) || typeof node.type !== "string") {
    return null;
  }
  if (!ALLOWED_NODE_TYPES.has(node.type)) return null;
  const children = Array.isArray(node.children) ? node.children.map((child) => sanitizeCanvasNode(child)).filter((child) => !!child) : void 0;
  const props = sanitizeProps(node.props);
  const style = sanitizeStyle(node.style);
  return {
    id: node.id,
    type: node.type,
    ...props ? { props } : {},
    ...style ? { style } : {},
    ...children?.length ? { children } : {}
  };
}
function normalizeCanvasEvent(event) {
  if (event.type === "selectNode") {
    return event.id === null || isSafeId(event.id) ? event : null;
  }
  if (event.type === "appendNode") {
    if (!isSafeId(event.parentId)) return null;
    const node = sanitizeCanvasNode(event.node);
    return node ? { type: "appendNode", parentId: event.parentId, node } : null;
  }
  if (!isSafeId(event.id) || !isRecord(event.patch)) return null;
  const props = sanitizeProps(event.patch.props);
  const style = sanitizeStyle(event.patch.style);
  if (!props && !style) return null;
  return {
    type: "updateNode",
    id: event.id,
    patch: {
      ...props ? { props } : {},
      ...style ? { style } : {}
    }
  };
}
function findCanvasNodePath(node, targetId, path = []) {
  const nextPath = [...path, node];
  if (node.id === targetId) return nextPath;
  for (const child of node.children ?? []) {
    const result = findCanvasNodePath(child, targetId, nextPath);
    if (result) return result;
  }
  return null;
}
function updateNodeTree(node, targetId, updater) {
  if (node.id === targetId) {
    return { node: updater(node), changed: true };
  }
  let changed = false;
  const children = (node.children ?? []).map((child) => {
    const result = updateNodeTree(child, targetId, updater);
    changed || (changed = result.changed);
    return result.node;
  });
  if (!changed) return { node, changed: false };
  return {
    node: {
      ...node,
      children
    },
    changed: true
  };
}
function applyCanvasEvent(document2, event) {
  const normalizedEvent = normalizeCanvasEvent(event);
  if (!normalizedEvent) return document2;
  event = normalizedEvent;
  if (event.type === "selectNode") {
    return {
      ...document2,
      selectedNodeId: event.id
    };
  }
  if (event.type === "appendNode") {
    if (findCanvasNodePath(document2.root, event.node.id)) {
      const updated = updateNodeTree(document2.root, event.node.id, (node) => ({
        ...node,
        type: event.node.type,
        props: { ...node.props ?? {}, ...event.node.props ?? {} },
        style: { ...node.style ?? {}, ...event.node.style ?? {} },
        children: event.node.children ?? node.children
      }));
      return updated.changed ? { ...document2, root: updated.node } : document2;
    }
    const result2 = updateNodeTree(document2.root, event.parentId, (node) => ({
      ...node,
      children: [...node.children ?? [], event.node]
    }));
    if (!result2.changed) return document2;
    return {
      ...document2,
      root: result2.node
    };
  }
  const result = updateNodeTree(document2.root, event.id, (node) => ({
    ...node,
    props: event.patch.props ? { ...node.props ?? {}, ...event.patch.props } : node.props,
    style: event.patch.style ? { ...node.style ?? {}, ...event.patch.style } : node.style
  }));
  if (!result.changed) return document2;
  return {
    ...document2,
    root: result.node
  };
}

// packages/render/canvas/canvasSnapshotParser.ts
function hasCanvasSnapshotSignal(content) {
  return content.includes("canvas_snapshot");
}
function extractCanvasSnapshotText(content) {
  if (typeof content === "string") {
    return hasCanvasSnapshotSignal(content) ? content : null;
  }
  if (!Array.isArray(content)) return null;
  const text = content.map(
    (item) => item?.type === "text" && typeof item.text === "string" ? item.text : ""
  ).filter(Boolean).join("\n");
  return hasCanvasSnapshotSignal(text) ? text : null;
}
function isCanvasEvent(value) {
  if (!value || typeof value !== "object") return false;
  const event = value;
  return event.type === "appendNode" || event.type === "updateNode" || event.type === "selectNode";
}
function parseCanvasSnapshotMessage(content) {
  if (!hasCanvasSnapshotSignal(content)) return null;
  let document2 = createCanvasDocument("root");
  const events = [];
  let eventCount = 0;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.includes("canvas_snapshot")) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.type !== "canvas_snapshot" || !isCanvasEvent(parsed.event)) {
        continue;
      }
      const event = normalizeCanvasEvent(parsed.event);
      if (!event) continue;
      document2 = applyCanvasEvent(document2, event);
      events.push(event);
      eventCount += 1;
    } catch {
    }
  }
  return eventCount > 0 ? { document: document2, events, eventCount } : null;
}

// packages/render/canvas/CanvasSnapshotMessage.tsx
var import_react23 = __toESM(require_react(), 1);

// packages/render/canvas/CanvasRenderer.tsx
var import_react21 = __toESM(require_react(), 1);

// packages/render/canvas/canvasRuntime.ts
function parseCanvasRuntimeAction(action) {
  if (!action || typeof action !== "object") return null;
  const candidate = action;
  const type = candidate.type;
  if (type === "toggle" && typeof candidate.key === "string" && candidate.key.trim()) {
    return { type, key: candidate.key };
  }
  if (type === "setState" && typeof candidate.key === "string" && candidate.key.trim()) {
    return { type, key: candidate.key, value: candidate.value };
  }
  if (type === "scrollTo" && typeof candidate.targetId === "string" && candidate.targetId.trim()) {
    return { type, targetId: candidate.targetId };
  }
  return null;
}
function reduceCanvasRuntimeAction(state, action) {
  if (action.type === "toggle") {
    return {
      ...state,
      [action.key]: !state[action.key]
    };
  }
  if (action.type === "setState") {
    return {
      ...state,
      [action.key]: action.value
    };
  }
  return state;
}

// packages/render/canvas/CanvasRenderer.tsx
var import_jsx_runtime18 = __toESM(require_jsx_runtime(), 1);
var toneColors = {
  neutral: { bg: "#f8fafc", border: "#e2e8f0", text: "#334155", solid: "#64748b" },
  success: { bg: "#ecfdf5", border: "#bbf7d0", text: "#047857", solid: "#16a34a" },
  warning: { bg: "#fffbeb", border: "#fde68a", text: "#b45309", solid: "#f59e0b" },
  danger: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", solid: "#dc2626" },
  info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", solid: "#2563eb" }
};
var getTone = (tone) => toneColors[String(tone || "neutral")] ?? toneColors.neutral;
function getNodeToneStyle(node) {
  const tone = toneColors[String(node.props?.tone || "")];
  if (!tone || node.type === "MetricCard") return node.style ?? {};
  return {
    background: tone.bg,
    borderColor: tone.border,
    color: tone.text,
    ...node.style ?? {}
  };
}
function renderChildren(props) {
  return (props.node.children ?? []).map((child) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
    CanvasRenderer,
    {
      node: child,
      selectedNodeId: props.selectedNodeId,
      onSelectNode: props.onSelectNode,
      runtimeState: props.runtimeState,
      onRuntimeStateChange: props.onRuntimeStateChange
    },
    child.id
  ));
}
function isNodeVisible(node, runtimeState) {
  const stateKey = node.props?.stateKey;
  if (typeof stateKey !== "string") return true;
  if (!("visibleWhen" in (node.props ?? {}))) return true;
  return runtimeState[stateKey] === node.props?.visibleWhen;
}
function CanvasRenderer({
  node,
  selectedNodeId,
  onSelectNode,
  runtimeState,
  onRuntimeStateChange
}) {
  const [localRuntimeState, setLocalRuntimeState] = (0, import_react21.useState)(
    runtimeState ?? {}
  );
  const effectiveRuntimeState = runtimeState ?? localRuntimeState;
  const updateRuntimeState = (nextState) => {
    setLocalRuntimeState(nextState);
    onRuntimeStateChange?.(nextState);
  };
  const runRuntimeAction = (actionValue) => {
    if (onSelectNode) return false;
    const action = parseCanvasRuntimeAction(actionValue);
    if (!action) return false;
    if (action.type === "scrollTo") {
      const escapedTargetId = typeof globalThis.CSS?.escape === "function" ? CSS.escape(action.targetId) : action.targetId.replace(/"/g, '\\"');
      document.querySelector(`[data-canvas-node-id="${escapedTargetId}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }
    updateRuntimeState(reduceCanvasRuntimeAction(effectiveRuntimeState, action));
    return true;
  };
  if (!isNodeVisible(node, effectiveRuntimeState)) {
    return null;
  }
  const selected = selectedNodeId === node.id;
  const commonProps = {
    "data-canvas-node-id": node.id,
    "data-canvas-part": String(node.props?.part ?? node.id),
    className: `canvas-node canvas-node--${node.type.toLowerCase()}${selected ? " is-selected" : ""}`,
    style: getNodeToneStyle(node),
    onClick: (event) => {
      if (!onSelectNode) return;
      event.stopPropagation();
      onSelectNode(node, event);
    }
  };
  const childProps = {
    node,
    selectedNodeId,
    onSelectNode,
    runtimeState: effectiveRuntimeState,
    onRuntimeStateChange: updateRuntimeState
  };
  const interactiveAction = node.props?.runtimeAction ?? node.props?.action;
  switch (node.type) {
    case "Canvas":
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { ...commonProps, children: renderChildren(childProps) });
    case "Stack":
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { ...commonProps, children: renderChildren(childProps) });
    case "Grid":
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { ...commonProps, children: renderChildren(childProps) });
    case "Section":
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { ...commonProps, children: [
        node.props?.eyebrow != null && node.props.eyebrow !== "" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "canvas-eyebrow", children: String(node.props.eyebrow) }) : null,
        node.props?.title != null && node.props.title !== "" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h2", { children: String(node.props.title) }) : null,
        node.props?.description != null && node.props.description !== "" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { children: String(node.props.description) }) : null,
        renderChildren(childProps)
      ] });
    case "Toolbar":
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("header", { ...commonProps, children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("strong", { children: String(node.props?.title ?? "Canvas") }),
          node.props?.subtitle != null && node.props.subtitle !== "" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { children: String(node.props.subtitle) }) : null
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "button",
          {
            type: "button",
            onClick: (event) => {
              if (runRuntimeAction(interactiveAction)) {
                event.stopPropagation();
              }
            },
            children: String(
              typeof node.props?.action === "string" ? node.props.action : "\u5BFC\u51FA"
            )
          }
        )
      ] });
    case "Text":
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { ...commonProps, children: String(node.props?.text ?? "") });
    case "Button":
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "button",
        {
          ...commonProps,
          type: "button",
          onClick: (event) => {
            if (runRuntimeAction(interactiveAction)) {
              event.stopPropagation();
              return;
            }
            commonProps.onClick(event);
          },
          children: String(node.props?.label ?? "Button")
        }
      );
    case "Card":
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("article", { ...commonProps, children: [
        node.props?.title != null && node.props.title !== "" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h3", { children: String(node.props.title) }) : null,
        node.props?.body != null || node.props?.value != null || node.props?.text != null ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { children: String(node.props.body ?? node.props.value ?? node.props.text) }) : null,
        renderChildren(childProps)
      ] });
    case "MetricCard": {
      const tone = getTone(node.props?.tone);
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
        "article",
        {
          ...commonProps,
          style: {
            background: tone.bg,
            borderColor: tone.border,
            ...node.style ?? {}
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { color: tone.text }, children: String(node.props?.title ?? "Metric") }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("strong", { children: String(node.props?.value ?? "-") }),
            node.props?.delta != null && node.props.delta !== "" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("em", { children: String(node.props.delta) }) : null
          ]
        }
      );
    }
    case "Chart": {
      const values = Array.isArray(node.props?.values) ? node.props?.values : [24, 38, 34, 48, 44, 58, 62];
      const max = Math.max(...values, 1);
      const tone = getTone(node.props?.tone);
      const barBackground = String(
        node.props?.barColor ?? node.style?.color ?? tone.solid
      );
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { ...commonProps, children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "canvas-chart__header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h3", { children: String(node.props?.title ?? "\u8D8B\u52BF\u56FE") }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { children: String(node.props?.caption ?? "\u6700\u8FD1 7 \u5929") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "canvas-chart__bars", children: values.map((value, index) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "div",
          {
            style: {
              background: barBackground,
              height: `${Math.max(12, value / max * 100)}%`
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { children: value })
          },
          `${index}-${value}`
        )) })
      ] });
    }
    case "List": {
      const items = Array.isArray(node.props?.items) ? node.props.items : [];
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { ...commonProps, children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h3", { children: String(node.props?.title ?? "\u5217\u8868") }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("ul", { children: items.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("li", { children: String(item) }, `${String(item)}-${index}`)) })
      ] });
    }
    case "Table": {
      const columns = Array.isArray(node.props?.columns) ? node.props.columns : [];
      const rows = Array.isArray(node.props?.rows) ? node.props.rows : [];
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { ...commonProps, children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h3", { children: String(node.props?.title ?? "\u8868\u683C") }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "canvas-table", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("table", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("tr", { children: columns.map((column, index) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("th", { children: String(column) }, `${String(column)}-${index}`)) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("tbody", { children: rows.map((row, rowIndex) => {
            const cells = Array.isArray(row) ? row : columns.map(
              (column) => typeof row === "object" && row !== null ? row[String(column)] : ""
            );
            const rowKey = typeof row === "object" && row !== null && "id" in row ? String(row.id) : `row-${rowIndex}-${cells.map((c) => String(c ?? "")).join("|").slice(0, 48)}`;
            return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("tr", { children: cells.map((cell, cellIndex) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("td", { children: String(cell ?? "") }, `${String(cell ?? "")}-${cellIndex}`)) }, rowKey);
          }) })
        ] }) })
      ] });
    }
    default:
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { ...commonProps, children: renderChildren(childProps) });
  }
}

// packages/render/canvas/canvasEditContext.ts
var import_react22 = __toESM(require_react(), 1);
var CANVAS_EDIT_SELECTION_EVENT = "nolo:canvas-edit-selection";
var currentSelection = null;
var pendingSelection = null;
var listeners = /* @__PURE__ */ new Set();
var patchListeners = /* @__PURE__ */ new Map();
var queuedPatches = /* @__PURE__ */ new Map();
function publishCanvasEditSelection(selection) {
  currentSelection = selection;
  listeners.forEach((listener) => listener(selection));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CANVAS_EDIT_SELECTION_EVENT, { detail: selection })
    );
  }
}
function subscribeCanvasEditSelection(listener) {
  listeners.add(listener);
  listener(currentSelection);
  return () => {
    listeners.delete(listener);
  };
}
function useCanvasEditSelection() {
  const [selection, setSelection] = import_react22.default.useState(currentSelection);
  import_react22.default.useEffect(
    () => subscribeCanvasEditSelection(setSelection),
    []
  );
  return selection;
}
function markPendingCanvasEditSelection(selection) {
  pendingSelection = selection;
}
function consumePendingCanvasEditSelection() {
  const selection = pendingSelection;
  pendingSelection = null;
  return selection;
}
function publishCanvasMessagePatch(sourceMessageId, events) {
  if (!events.length) return;
  const queued = queuedPatches.get(sourceMessageId) ?? [];
  queued.push(events);
  queuedPatches.set(sourceMessageId, queued);
  patchListeners.get(sourceMessageId)?.forEach((listener) => listener(events));
}
function subscribeCanvasMessagePatches(sourceMessageId, listener) {
  const listenersForMessage = patchListeners.get(sourceMessageId) ?? /* @__PURE__ */ new Set();
  listenersForMessage.add(listener);
  patchListeners.set(sourceMessageId, listenersForMessage);
  queuedPatches.get(sourceMessageId)?.forEach((events) => listener(events));
  return () => {
    listenersForMessage.delete(listener);
    if (!listenersForMessage.size) {
      patchListeners.delete(sourceMessageId);
    }
  };
}
function buildCanvasNodeEditingTarget(selection) {
  return {
    kind: "canvas_node",
    key: selection.selectedNodeId,
    title: selection.part,
    summary: [
      "\u7528\u6237\u6B63\u5728\u7F16\u8F91 Canvas Tree \u753B\u5E03\u4E2D\u7684\u4E00\u4E2A\u5DF2\u9009\u4E2D\u8282\u70B9\u3002",
      "\u53EA\u8F93\u51FA\u9488\u5BF9\u9009\u4E2D\u8282\u70B9\u7684 canvas_snapshot updateNode \u4E8B\u4EF6\uFF0C\u9664\u975E\u7528\u6237\u660E\u786E\u8981\u6C42\u65B0\u589E\u5185\u5BB9\u3002",
      "\u4E0D\u8981\u91CD\u5EFA\u6574\u68F5\u6811\uFF0C\u4E0D\u8981\u8F93\u51FA Markdown\u3001\u89E3\u91CA\u3001React\u3001HTML\u3001CSS \u6216 JS \u6E90\u7801\u3002"
    ].join("\n"),
    metadata: {
      sourceMessageId: selection.sourceMessageId,
      selectedNodeId: selection.selectedNodeId,
      part: selection.part,
      path: selection.path,
      type: selection.type,
      props: selection.props,
      style: selection.style
    }
  };
}

// packages/render/canvas/CanvasSnapshotMessage.tsx
var import_jsx_runtime19 = __toESM(require_jsx_runtime(), 1);
var CanvasSnapshotMessage = (0, import_react23.memo)(({
  content,
  messageId
}) => {
  const parsed = (0, import_react23.useMemo)(() => parseCanvasSnapshotMessage(content), [content]);
  const [visibleEventCount, setVisibleEventCount] = (0, import_react23.useState)(0);
  const countRef = (0, import_react23.useRef)(visibleEventCount);
  (0, import_react23.useEffect)(() => {
    countRef.current = visibleEventCount;
  }, [visibleEventCount]);
  const [patchState, setPatchState] = (0, import_react23.useState)({ events: [], appliedSourceMessageId: null });
  const messagePatchEvents = patchState.events;
  const appliedPatchSourceMessageId = patchState.appliedSourceMessageId;
  const isPatchOnlyMessage = !!parsed && parsed.events.every(
    (event) => event.type !== "appendNode"
  );
  (0, import_react23.useEffect)(() => {
    if (!parsed) {
      setVisibleEventCount(0);
      return;
    }
    if (isPatchOnlyMessage) {
      setVisibleEventCount(parsed.eventCount);
      return;
    }
    setVisibleEventCount(
      (count) => Math.min(Math.max(count, 1), parsed.eventCount)
    );
    const timer = window.setInterval(() => {
      if (countRef.current >= parsed.eventCount) {
        window.clearInterval(timer);
        return;
      }
      setVisibleEventCount((count) => count + 1);
    }, 140);
    return () => window.clearInterval(timer);
  }, [isPatchOnlyMessage, parsed]);
  (0, import_react23.useEffect)(() => {
    setPatchState({ events: [], appliedSourceMessageId: null });
    if (!messageId) return;
    return subscribeCanvasMessagePatches(messageId, (events) => {
      setPatchState((current) => ({
        ...current,
        events: [...current.events, ...events]
      }));
    });
  }, [messageId]);
  (0, import_react23.useEffect)(() => {
    if (!parsed || !isPatchOnlyMessage || appliedPatchSourceMessageId) return;
    const selection = consumePendingCanvasEditSelection();
    if (!selection?.sourceMessageId) return;
    publishCanvasMessagePatch(selection.sourceMessageId, parsed.events);
    setPatchState((current) => ({
      ...current,
      appliedSourceMessageId: selection.sourceMessageId ?? null
    }));
  }, [appliedPatchSourceMessageId, isPatchOnlyMessage, parsed]);
  const document2 = (0, import_react23.useMemo)(() => {
    if (!parsed) return null;
    const visibleDocument = parsed.events.slice(0, visibleEventCount).reduce(
      (currentDocument, event) => applyCanvasEvent(currentDocument, event),
      createCanvasDocument("root")
    );
    const patchedDocument = messagePatchEvents.reduce(
      (currentDocument, event) => applyCanvasEvent(currentDocument, event),
      visibleDocument
    );
    return patchedDocument;
  }, [messagePatchEvents, parsed, visibleEventCount]);
  if (!document2 || !parsed) {
    return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("section", { className: "canvas-message", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "canvas-message__stage canvas-message__stage--pending", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "canvas-message__pending", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", {}),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("strong", { children: "\u6B63\u5728\u751F\u6210\u753B\u5E03" })
    ] }) }) });
  }
  if (isPatchOnlyMessage) {
    return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("section", { className: "canvas-message canvas-message--applied", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "canvas-message__applied", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("strong", { children: "\u5DF2\u5E94\u7528\u5230\u539F\u753B\u5E03" }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { children: [
        parsed.eventCount,
        " \u4E2A\u4FEE\u6539"
      ] })
    ] }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("section", { className: "canvas-message", children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "canvas-message__stage", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(CanvasRenderer, { node: document2.root }) }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("footer", { className: "canvas-message__footer", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { children: [
      visibleEventCount,
      "/",
      parsed.eventCount,
      " \u4E2A\u753B\u5E03\u4E8B\u4EF6"
    ] }) })
  ] });
});
var CanvasSnapshotMessage_default = CanvasSnapshotMessage;

// packages/chat/messages/web/MessageContent.tsx
var import_jsx_runtime20 = __toESM(require_jsx_runtime());
var DocxPreviewDialog = import_react24.default.lazy(() => import("/public/assets/chunks/DocxPreviewDialog-VWSLGERM.js"));
var TablePreviewDialog = import_react24.default.lazy(() => import("/public/assets/chunks/TablePreviewDialog-F7JHHE7K.js"));
var ImagePreviewModal = import_react24.default.lazy(() => import("/public/assets/chunks/ImagePreviewModal-X5IZQ7J2.js"));
function areMessageContentPropsEqual(prev, next) {
  return prev.content === next.content && prev.thinkContent === next.thinkContent && prev.imageGenerationState === next.imageGenerationState && prev.role === next.role && prev.isStreaming === next.isStreaming && prev.messageId === next.messageId && prev.finishReason === next.finishReason && prev.retryProgress === next.retryProgress;
}
var MessageContent = (0, import_react24.memo)(
  ({
    content,
    thinkContent,
    imageGenerationState,
    role,
    isStreaming = false,
    messageId,
    finishReason,
    retryProgress
  }) => {
    const { t } = useTranslation("chat");
    const [filePreview, setFilePreview] = (0, import_react24.useState)(null);
    const [imgPreview, setImgPreview] = (0, import_react24.useState)(null);
    const onFile = (0, import_react24.useCallback)((fd) => setFilePreview(fd), []);
    const onImg = (0, import_react24.useCallback)((src) => setImgPreview(src), []);
    const closeFile = (0, import_react24.useCallback)(() => setFilePreview(null), []);
    const closeImg = (0, import_react24.useCallback)(() => setImgPreview(null), []);
    const [elapsedSeconds, setElapsedSeconds] = (0, import_react24.useState)(
      () => imageGenerationState?.startedAt ? Math.max(0, Math.floor((Date.now() - imageGenerationState.startedAt) / 1e3)) : 0
    );
    const isContentEmpty = !content || typeof content === "string" && content.trim().length === 0 || Array.isArray(content) && content.length === 0;
    const isEmptyStreaming = isStreaming && isContentEmpty;
    const isImageWaitingState = isEmptyStreaming && role !== "self" && imageGenerationState?.kind === "image_generation";
    const isEmptyFinishedAssistant = !isStreaming && role !== "self" && isContentEmpty && !isImageWaitingState;
    const canvasSnapshotText = (0, import_react24.useMemo)(
      () => role !== "self" ? extractCanvasSnapshotText(content) : null,
      [content, role]
    );
    const canvasSnapshot = (0, import_react24.useMemo)(
      () => canvasSnapshotText ? parseCanvasSnapshotMessage(canvasSnapshotText) : null,
      [canvasSnapshotText]
    );
    const isCanvasSnapshotContent = !!canvasSnapshot;
    (0, import_react24.useEffect)(() => {
      if (!isImageWaitingState || !imageGenerationState?.startedAt) {
        setElapsedSeconds(0);
        return;
      }
      const updateElapsed = () => {
        setElapsedSeconds(
          Math.max(0, Math.floor((Date.now() - imageGenerationState.startedAt) / 1e3))
        );
      };
      updateElapsed();
      const timer = window.setInterval(updateElapsed, 1e3);
      return () => window.clearInterval(timer);
    }, [imageGenerationState?.startedAt, isImageWaitingState]);
    const imageGenerationStageLabel = (0, import_react24.useMemo)(() => {
      switch (imageGenerationState?.stage) {
        case "saving":
          return "\u6B63\u5728\u4FDD\u5B58\u7ED3\u679C";
        case "submitted":
          return "\u8BF7\u6C42\u5DF2\u63D0\u4EA4";
        case "generating":
        default:
          return "\u6B63\u5728\u751F\u6210\u4E2D";
      }
    }, [imageGenerationState?.stage]);
    const segments = (0, import_react24.useMemo)(() => {
      if (!Array.isArray(content)) return [];
      const segs = [];
      let cur = null;
      content.forEach((it) => {
        const isImg = it.type === "image_url" && it.image_url?.url;
        if (isImg) {
          if (cur?.type === "images") {
            cur.items.push(it);
          } else {
            cur = { type: "images", items: [it] };
            segs.push(cur);
          }
        } else {
          if (cur?.type === "normal") {
            cur.items.push(it);
          } else {
            cur = { type: "normal", items: [it] };
            segs.push(cur);
          }
        }
      });
      return segs;
    }, [content]);
    const renderContent = (0, import_react24.useMemo)(() => {
      if (isContentEmpty) {
        return null;
      }
      if (isCanvasSnapshotContent && canvasSnapshotText) {
        return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(CanvasSnapshotMessage_default, { content: canvasSnapshotText, messageId });
      }
      if (typeof content === "string") {
        return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(MessageText, { content, role, isStreaming });
      }
      return segments.map((seg, i) => {
        if (seg.type === "images") {
          if (seg.items.length > 1) {
            const groupKey = seg.items.map((it2) => it2.image_url?.url).filter(Boolean).join("|") || `imgs-${i}`;
            return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "msg-images", children: seg.items.map((it2, idx) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
              ImagePreview,
              {
                src: it2.image_url.url,
                alt: it2.alt_text,
                onPreview: onImg
              },
              it2.image_url?.url ? `${it2.image_url.url}-${idx}` : `img-${idx}`
            )) }, groupKey);
          }
          const it = seg.items[0];
          return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
            ImagePreview,
            {
              src: it.image_url.url,
              alt: it.alt_text,
              onPreview: onImg
            },
            it.image_url?.url ?? `img-${i}`
          );
        }
        return seg.items.map((it, idx) => {
          if (it.type === "text" && it.text) {
            return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
              MessageText,
              {
                content: it.text,
                role,
                isStreaming
              },
              `text-${i}-${idx}-${String(it.text).slice(0, 48)}`
            );
          }
          if (it.pageKey && it.type) {
            return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
              FileItem,
              {
                file: it,
                variant: "message",
                onPreview: () => onFile({ item: it, type: it.type })
              },
              it.pageKey
            );
          }
          return null;
        });
      });
    }, [content, role, segments, onImg, onFile, isStreaming, isContentEmpty, isCanvasSnapshotContent, canvasSnapshotText, messageId]);
    return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_jsx_runtime20.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "msg-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          ThinkingSection,
          {
            thinkContent,
            messageContent: content,
            role,
            isStreaming,
            messageId
          }
        ),
        retryProgress && isStreaming && role !== "self" && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "msg-retry-progress", role: "status", "aria-live": "polite", children: t("retryProgress", {
          attempt: retryProgress.attempt,
          maxAttempts: retryProgress.maxAttempts,
          seconds: Math.ceil(retryProgress.delayMs / 1e3)
        }) }),
        isImageWaitingState && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "image-generation-wait-card", "aria-live": "polite", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "image-generation-wait-card__title", children: "\u6B63\u5728\u751F\u6210\u56FE\u7247" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "image-generation-wait-card__meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { children: imageGenerationStageLabel }),
            /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("span", { children: [
              "\u5DF2\u7B49\u5F85 ",
              elapsedSeconds,
              " \u79D2"
            ] })
          ] }),
          imageGenerationState?.waitHint && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "image-generation-wait-card__hint", children: imageGenerationState.waitHint }),
          imageGenerationState?.profileLabel && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "image-generation-wait-card__hint", children: [
            "\u5F53\u524D\u6A21\u5F0F\uFF1A",
            imageGenerationState.profileLabel
          ] })
        ] }),
        isEmptyStreaming && !isImageWaitingState && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "empty-content", "aria-hidden": "true", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "empty-content__line empty-content__line--short" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "empty-content__line" })
        ] }),
        isEmptyFinishedAssistant && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "empty-assistant-fallback", role: "status", children: "\u672A\u6536\u5230\u56DE\u590D\u5185\u5BB9\uFF0C\u8BF7\u91CD\u8BD5\u3002" }),
        renderContent
      ] }),
      role !== "self" && finishReason === "length" && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "msg-finish-reason-length", role: "status", children: t("finishReasonLengthNotice") }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_react24.Suspense, { fallback: null, children: [
        filePreview && filePreview.type === "table" ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          TablePreviewDialog,
          {
            isOpen: true,
            onClose: closeFile,
            tableKey: filePreview.item.pageKey || "",
            tableName: filePreview.item.name || ""
          }
        ) : filePreview && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          DocxPreviewDialog,
          {
            isOpen: true,
            onClose: closeFile,
            pageKey: filePreview.item.pageKey || "",
            fileName: filePreview.item.name || ""
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(ImagePreviewModal, { imageUrl: imgPreview, onClose: closeImg, alt: "\u9884\u89C8\u56FE\u7247" })
      ] })
    ] });
  },
  areMessageContentPropsEqual
);

export {
  isTouchDevice,
  useMessageInteraction,
  StreamingPendingIndicator,
  MessageLayout,
  publishCanvasEditSelection,
  useCanvasEditSelection,
  markPendingCanvasEditSelection,
  buildCanvasNodeEditingTarget,
  MessageContent,
  resolveAgentCardDialogKey,
  getGuidedCapabilityLabels,
  ChatDisplayContext,
  safeParse,
  StatusIcon,
  ToolMessageContent_default,
  ToolMessageGroup,
  ToolMessageGroup_default
};
