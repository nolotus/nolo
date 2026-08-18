import {
  getPublicAgentDbKey
} from "/public/assets/chunks/chunk-4JMBIZX5.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useSelector
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  addContentToSpace,
  createAgent,
  createAgentKey,
  read,
  selectAllMemberSpaces,
  selectCurrentServer,
  toast
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

// packages/ai/agent/web/AgentForkDialog.tsx
var import_react = __toESM(require_react());

// packages/ai/agent/forkAgent.ts
var COPY_KEYS = [
  "prompt",
  "provider",
  "model",
  "introduction",
  "greeting",
  "tools",
  "hasVision",
  "hasImageOutput",
  "imageModel",
  "imageConfig",
  "imageWorkflow",
  "defaultInteractionMode",
  "enableThinking"
];
var OPTIONAL_NUMERIC_KEYS = [
  "temperature",
  "top_p",
  "max_tokens",
  "frequency_penalty",
  "presence_penalty",
  "reasoning_effort"
];
var FORCED_DEFAULTS = {
  isPublic: false,
  allowFork: false,
  whitelist: [],
  references: [],
  inputPrice: 0,
  outputPrice: 0,
  apiSource: "platform",
  useServerProxy: true,
  customProviderUrl: "",
  apiKey: "",
  apiKeyRef: "",
  apiKeyHeader: "",
  cliProvider: "",
  machineId: ""
};
var NAME_MAX_LENGTH = 50;
function buildForkAgentFormData(source, options) {
  if (!source || source.allowFork !== true) return null;
  if (source.apiSource && source.apiSource !== "platform") return null;
  const result = {};
  for (const key of COPY_KEYS) {
    if (source[key] !== void 0) {
      result[key] = source[key];
    }
  }
  for (const key of OPTIONAL_NUMERIC_KEYS) {
    if (source[key] !== void 0) {
      result[key] = source[key];
    }
  }
  const suffix = options?.nameSuffix ?? " \u526F\u672C";
  const rawSourceName = source.name ?? "";
  const sourceNameTrimmed = String(rawSourceName).trim();
  const baseName = sourceNameTrimmed.length > 0 ? `${sourceNameTrimmed}${suffix}`.trim() : "\u65B0 AI";
  result.name = baseName.slice(0, NAME_MAX_LENGTH);
  const rawTags = source.tags;
  if (Array.isArray(rawTags)) {
    result.tags = rawTags.map((t) => String(t ?? "").trim()).filter(Boolean).join(",");
  } else if (typeof rawTags === "string") {
    result.tags = rawTags.trim();
  } else {
    result.tags = "";
  }
  for (const [key, value] of Object.entries(FORCED_DEFAULTS)) {
    result[key] = value;
  }
  return result;
}

// packages/ai/agent/web/AgentForkDialog.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var hasPrompt = (record) => !!record && typeof record === "object" && typeof record.prompt === "string" && record.prompt.trim().length > 0;
var AgentForkDialog = ({
  isOpen,
  onClose,
  agent
}) => {
  const { t } = useTranslation(["ai"]);
  const dispatch = useAppDispatch();
  const currentUserId = useUserId();
  const memberSpaces = useSelector(selectAllMemberSpaces);
  const currentServer = useSelector(selectCurrentServer);
  const [target, setTarget] = (0, import_react.useState)(void 0);
  const [submitting, setSubmitting] = (0, import_react.useState)(false);
  const inFlightRef = (0, import_react.useRef)(false);
  const spaceOptions = (0, import_react.useMemo)(
    () => memberSpaces.map((ms) => ({
      id: ms.spaceId,
      name: ms.spaceName || ms.spaceId
    })),
    [memberSpaces]
  );
  const handleClose = () => {
    if (submitting) return;
    setTarget(void 0);
    onClose();
  };
  const handleConfirm = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      let full = agent;
      if (!hasPrompt(agent)) {
        const lookupKey = agent.dbKey && agent.dbKey.trim() ? agent.dbKey : getPublicAgentDbKey(agent);
        if (!lookupKey) {
          toast.error(t("fork.failed", "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"));
          return;
        }
        const preferredServerOrigin = agent.authorityServer || agent.originServer || currentServer;
        let fetched;
        try {
          fetched = await dispatch(
            read({ dbKey: lookupKey, preferredServerOrigin })
          ).unwrap();
        } catch (err) {
          console.warn("[AgentForkDialog] read full agent record failed:", err);
          toast.error(t("fork.failed", "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"));
          return;
        }
        if (!hasPrompt(fetched)) {
          console.warn(
            "[AgentForkDialog] fetched record has no prompt:",
            lookupKey
          );
          toast.error(t("fork.failed", "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"));
          return;
        }
        full = fetched;
      }
      const formData = buildForkAgentFormData(full);
      if (!formData) {
        toast.error(t("fork.notAllowed", "\u8FD9\u4E2A AI \u4E0D\u5141\u8BB8\u590D\u5236"));
        onClose();
        return;
      }
      if (!currentUserId) {
        toast.error(t("fork.failed", "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"));
        return;
      }
      const createdAgent = await dispatch(
        createAgent({
          userId: currentUserId,
          // fork 产出的是「已裁剪的表单数据」，字段是 AgentFormData 的子集
          // （高级参数缺省时按约定不出现），故此处放宽类型。
          formData,
          spaceId: target
        })
      ).unwrap();
      if (target) {
        const agentDbKey = createdAgent.isPublic ? createAgentKey.public(createdAgent.id) : createAgentKey.private(currentUserId, createdAgent.id);
        try {
          await dispatch(
            addContentToSpace({
              spaceId: target,
              title: createdAgent.name || "\u672A\u547D\u540D\u667A\u80FD\u4F53",
              type: "agent" /* AGENT */,
              contentKey: agentDbKey
            })
          ).unwrap();
        } catch (err) {
          console.error("Failed to add agent to space sidebar:", err);
          toast.error(
            t(
              "fork.addToSpaceFailed",
              "\u5DF2\u590D\u5236\uFF0C\u4F46\u52A0\u5165\u7A7A\u95F4\u5931\u8D25\uFF0C\u53EF\u5728\u300C\u5168\u90E8\u300D\u91CC\u627E\u5230\u5B83"
            )
          );
        }
      }
      toast.success(t("fork.success", "\u5DF2\u590D\u5236\u5230\u4F60\u7684 AI \u5217\u8868"));
      onClose();
    } catch (err) {
      const message = err instanceof Error && err.message.trim() ? err.message : t("fork.failed", "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
      toast.error(message);
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Dialog,
    {
      isOpen,
      onClose: handleClose,
      title: t("fork.title", "\u590D\u5236\u8FD9\u4E2A AI"),
      size: "small",
      isActionDisabled: submitting,
      actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "secondary",
            size: "medium",
            onClick: handleClose,
            disabled: submitting,
            children: t("cancel", "\u53D6\u6D88")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "primary",
            size: "medium",
            onClick: () => {
              void handleConfirm();
            },
            loading: submitting,
            disabled: submitting,
            children: t("fork.confirm", "\u590D\u5236")
          }
        )
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent-fork-dialog__body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-fork-dialog__target-label", children: t("fork.targetSpaceLabel", "\u653E\u5165\u7A7A\u95F4") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { className: "agent-fork-dialog__options", role: "radiogroup", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { className: "agent-fork-dialog__option", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "radio",
                name: "fork-target",
                value: "",
                checked: target === void 0,
                onChange: () => setTarget(void 0),
                disabled: submitting
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("fork.targetAll", "\u5168\u90E8\uFF08\u4E0D\u653E\u5165\u7A7A\u95F4\uFF09") })
          ] }) }),
          spaceOptions.map((space) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { className: "agent-fork-dialog__option", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "radio",
                name: "fork-target",
                value: space.id,
                checked: target === space.id,
                onChange: () => setTarget(space.id),
                disabled: submitting
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: space.name })
          ] }) }, space.id))
        ] })
      ] })
    }
  );
};
var AgentForkDialog_default = AgentForkDialog;
export {
  AgentForkDialog_default as default
};
