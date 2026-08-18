import {
  MessageContent,
  MessageLayout,
  StatusIcon,
  ToolMessageContent_default,
  ToolMessageGroup,
  isTouchDevice,
  safeParse
} from "/public/assets/chunks/chunk-W5JSORLZ.js";
import "/public/assets/chunks/chunk-TO7RQOSF.js";
import "/public/assets/chunks/chunk-WVPNWA2V.js";
import "/public/assets/chunks/chunk-UFYPTJWC.js";
import "/public/assets/chunks/chunk-EOM4G5HF.js";
import "/public/assets/chunks/chunk-II3ADNT6.js";
import "/public/assets/chunks/chunk-ZCACUALD.js";
import "/public/assets/chunks/chunk-7HVHEMQ3.js";
import "/public/assets/chunks/chunk-DBB6IKZV.js";
import "/public/assets/chunks/chunk-5UVYUAHU.js";
import "/public/assets/chunks/chunk-GJISU6WO.js";
import "/public/assets/chunks/chunk-KLA2PJT7.js";
import "/public/assets/chunks/chunk-J4DSDXNB.js";
import "/public/assets/chunks/chunk-6Q7JCK5Q.js";
import "/public/assets/chunks/chunk-PE2BCPTN.js";
import "/public/assets/chunks/chunk-QJUZO4YG.js";
import "/public/assets/chunks/chunk-VPAVB2J5.js";
import "/public/assets/chunks/chunk-ZDGJ4DJD.js";
import "/public/assets/chunks/chunk-7HTHEFUV.js";
import "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import "/public/assets/chunks/chunk-CJFHNPRU.js";
import "/public/assets/chunks/chunk-52ICTTPO.js";
import "/public/assets/chunks/chunk-Y3JDDU5C.js";
import "/public/assets/chunks/chunk-DMDFFSG6.js";
import "/public/assets/chunks/chunk-2XKWBRFO.js";
import "/public/assets/chunks/chunk-G4VE62AJ.js";
import "/public/assets/chunks/chunk-7PX5UKK4.js";
import "/public/assets/chunks/chunk-LWXWW4DE.js";
import "/public/assets/chunks/chunk-RI4COCAN.js";
import "/public/assets/chunks/chunk-NJHFOS5M.js";
import "/public/assets/chunks/chunk-FCIRSLPG.js";
import "/public/assets/chunks/chunk-SSBU25HK.js";
import "/public/assets/chunks/chunk-AWGGOX2H.js";
import "/public/assets/chunks/chunk-DFTLAEUX.js";
import "/public/assets/chunks/chunk-ZV2RZQG3.js";
import "/public/assets/chunks/chunk-GIMH23VB.js";
import "/public/assets/chunks/chunk-PTH5G2FS.js";
import "/public/assets/chunks/chunk-FXT35AYA.js";
import "/public/assets/chunks/chunk-VPSYWRNH.js";
import "/public/assets/chunks/chunk-5E4522JS.js";
import "/public/assets/chunks/chunk-WT5G4HGZ.js";
import "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import "/public/assets/chunks/chunk-V2ALUAJU.js";
import {
  buildRunStreamingAgentHandoffPresentation,
  extractToolCallArgs,
  formatToolRowHeaderSummary,
  isAssistantToolStub,
  normalizeToolDisplaySummary,
  resolveToolDisplayName,
  shouldToolMessageRowStartCollapsed
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuChevronDown,
  LuChevronRight
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  buildDialogUrl
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

// packages/app/pages/share/ShareDialogRichView.tsx
var import_react3 = __toESM(require_react());

// packages/chat/messages/web/ReadOnlyMessageItem.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var ReadOnlyMessageItem = (0, import_react.memo)(
  ({ message, isTouch = false }) => {
    const { content, thinkContent, role } = message || {};
    const isRobot = role !== "user";
    const type = isRobot ? "robot" : "self";
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      MessageLayout,
      {
        isRobot,
        type,
        displayName: isRobot ? "AI Assistant" : "User",
        isTouch,
        isStreaming: false,
        content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          MessageContent,
          {
            content: content || "",
            thinkContent: thinkContent || "",
            role: isRobot ? "other" : "self",
            isStreaming: false,
            messageId: message?.id
          }
        )
      }
    );
  }
);

// packages/chat/messages/web/ReadOnlyToolMessageItem.tsx
var import_react2 = __toESM(require_react());
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var TR_HEADER_BUTTON_STYLE = {
  width: "100%",
  margin: 0,
  font: "inherit",
  color: "inherit",
  textAlign: "left",
  background: "transparent",
  appearance: "none"
};
var ReadOnlyToolMessageItem = (0, import_react2.memo)(({ message }) => {
  const { content, toolName, isStreaming, toolPayload } = message;
  const rawData = (0, import_react2.useMemo)(() => safeParse(content), [content]);
  const isError = toolPayload?.status === "failed" || !!toolPayload?.error || !!rawData?.error;
  const statusStr = isStreaming ? "running" : isError ? "failed" : "success";
  const displaySummary = (0, import_react2.useMemo)(() => {
    return formatToolRowHeaderSummary({
      toolName,
      toolArgs: extractToolCallArgs(toolPayload),
      existingSummary: normalizeToolDisplaySummary(
        toolPayload?.summary || rawData?.summary || toolName || "",
        toolName
      ),
      // Share pages may lack i18n; still resolve via Chinese defaults.
      translate: (key, fallback) => key.startsWith("toolNames.") ? resolveToolDisplayName(key.slice("toolNames.".length)) : fallback
    });
  }, [toolPayload, rawData, toolName]);
  const [collapsed, setCollapsed] = (0, import_react2.useState)(
    () => shouldToolMessageRowStartCollapsed({
      toolName,
      content,
      isError
    })
  );
  if (toolName === "runStreamingAgent") {
    const handoff = buildRunStreamingAgentHandoffPresentation({
      rawData,
      toolPayload,
      isStreaming,
      isError
    });
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: `tool-msg-row tool-msg-row--handoff ${statusStr} ${collapsed ? "is-collapsed" : ""}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: "tr-header",
          style: TR_HEADER_BUTTON_STYLE,
          onClick: () => setCollapsed((p) => !p),
          "aria-expanded": !collapsed,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tr-main", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `tr-icon ${statusStr}`, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StatusIcon, { status: statusStr, toolName }) }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "tr-summary u-truncate", children: handoff.summary })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "tr-chevron", "aria-hidden": "true", children: collapsed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuChevronRight, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuChevronDown, { size: 14, "aria-hidden": "true" }) })
          ]
        }
      ),
      !collapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tr-body handoff-tool__body", children: [
        !handoff.inline && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "handoff-tool__detail-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "handoff-tool__label", children: "\u5B50 dialog" }),
          handoff.targetDialogKey ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "a",
            {
              className: "handoff-tool__link",
              href: buildDialogUrl(
                handoff.targetDialogKey,
                handoff.targetSpaceId
              ),
              children: "\u6253\u5F00\u5BF9\u8BDD"
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "handoff-tool__value", children: "\u672A\u5355\u72EC\u521B\u5EFA" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "handoff-tool__detail-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "handoff-tool__label", children: "\u76EE\u6807 Agent" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "span",
            {
              className: "handoff-tool__value",
              title: handoff.agentKey || void 0,
              children: handoff.targetLabel
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "handoff-tool__detail-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "handoff-tool__label", children: "\u8F93\u5165\u6458\u8981" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "handoff-tool__value", children: handoff.inputSummary })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "handoff-tool__detail-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "handoff-tool__label", children: "\u72B6\u6001" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "handoff-tool__value", children: handoff.statusLabel })
        ] })
      ] })
    ] });
  }
  if (toolName === "ask_user" || rawData?.type === "ask_user") return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: `tool-msg-row ${statusStr} ${collapsed ? "is-collapsed" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "button",
      {
        type: "button",
        className: "tr-header",
        style: TR_HEADER_BUTTON_STYLE,
        onClick: () => setCollapsed((p) => !p),
        "aria-expanded": !collapsed,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tr-main", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `tr-icon ${statusStr}`, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StatusIcon, { status: statusStr, toolName }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "tr-summary u-truncate", children: displaySummary })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "tr-chevron", "aria-hidden": "true", children: collapsed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuChevronRight, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuChevronDown, { size: 14, "aria-hidden": "true" }) })
        ]
      }
    ),
    !collapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "tr-body", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ToolMessageContent_default,
      {
        toolName,
        rawData,
        isError,
        t: (_key, fallback) => typeof fallback === "string" ? fallback : fallback?.defaultValue || _key,
        openPreview: () => {
        },
        navigateToPage: () => {
        }
      }
    ) })
  ] });
});

// packages/chat/messages/web/groupToolMessages.ts
function groupConsecutiveToolMessages(messages) {
  const result = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length === 0) return;
    if (buffer.length === 1) {
      result.push({ type: "message", message: buffer[0] });
    } else {
      const key = buffer.map((m) => m.id ?? m.dbKey ?? m.tool_call_id ?? "").join("-");
      result.push({ type: "tool-group", messages: buffer, key });
    }
    buffer = [];
  };
  for (const msg of messages) {
    if (msg && msg.role === "tool") {
      buffer.push(msg);
    } else {
      flush();
      result.push({ type: "message", message: msg });
    }
  }
  flush();
  return result;
}

// packages/app/pages/share/ShareDialogRichView.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var ShareDialogRichView = ({ messages }) => {
  const [isTouch, setIsTouch] = (0, import_react3.useState)(false);
  (0, import_react3.useEffect)(() => {
    setIsTouch(isTouchDevice());
  }, []);
  const groupedMessages = (0, import_react3.useMemo)(() => {
    const visible = messages.filter((message) => {
      if (message?.role === "system") return false;
      return !isAssistantToolStub(message);
    });
    return groupConsecutiveToolMessages(visible);
  }, [messages]);
  if (groupedMessages.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "ShareImportPage-emptyMsg", children: "\u6B64\u5BF9\u8BDD\u6682\u65E0\u53EF\u663E\u793A\u7684\u6D88\u606F\u3002" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ShareImportPage-dialog", "data-renderer": "rich", children: groupedMessages.map((entry, index) => {
    if (entry.type === "tool-group") {
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ShareImportPage-msgWrapper", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ToolMessageGroup, { messages: entry.messages, readOnly: true }) }, entry.key);
    }
    const message = entry.message;
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        className: "ShareImportPage-msgWrapper",
        children: message.role === "tool" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ReadOnlyToolMessageItem, { message }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ReadOnlyMessageItem, { message, isTouch })
      },
      message.id ?? index
    );
  }) });
};
var ShareDialogRichView_default = ShareDialogRichView;
export {
  ShareDialogRichView_default as default
};
