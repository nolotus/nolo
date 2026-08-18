import {
  resolveAgentBadgeMeta
} from "/public/assets/chunks/chunk-JQ6XROM5.js";
import {
  formatAgentOutputPrice
} from "/public/assets/chunks/chunk-CA74EWBF.js";
import {
  resolveDialogLaunchSpaceId,
  useAgentDialog
} from "/public/assets/chunks/chunk-UFYPTJWC.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  formatPriceAmount
} from "/public/assets/chunks/chunk-5IJJ57JD.js";
import {
  LuEye,
  LuImage,
  LuLaptop,
  LuMessageSquare,
  LuTerminal
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

// packages/ai/agent/web/AgentCardMeta.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var AgentCardMeta = ({ item }) => {
  const { t } = useTranslation(["ai"]);
  const badgeMeta = resolveAgentBadgeMeta(item);
  const {
    priceHint,
    shouldShowTokenCost,
    showImagePrice,
    showCliBadge,
    showVisionBadge,
    showRuntimeBadge,
    runtimeLabel,
    runtimeMachineId
  } = badgeMeta;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent__meta-flow", children: [
    shouldShowTokenCost && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__model-cost", "aria-label": t("modelCost", "\u6A21\u578B\u6210\u672C"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
      t("outputCostPerMillionTokens", "\u8F93\u51FA"),
      "\uFF1A",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatAgentOutputPrice(item.outputPrice) })
    ] }) }),
    showImagePrice && priceHint && priceHint.type === "per_image" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent__price", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuImage, { size: 12, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agent__price-label", children: priceHint.labelKey ? t(priceHint.labelKey, "\u9ED8\u8BA4\u6863\u53C2\u8003\u4EF7") : t("price") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatPriceAmount(priceHint.amount) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "agent__price-unit", children: [
        "/ ",
        t("perImage")
      ] }),
      priceHint.profileLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "agent__price-profile", children: [
        "(",
        priceHint.profileLabel,
        ")"
      ] })
    ] }),
    showCliBadge && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "agent__tag agent__cli", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTerminal, { size: 11, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "CLI" })
    ] }),
    showRuntimeBadge && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "span",
      {
        className: "agent__tag agent__runtime",
        title: runtimeMachineId || "",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLaptop, { size: 11, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: runtimeLabel })
        ]
      }
    ),
    showVisionBadge && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "agent__tag agent__vision", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuEye, { size: 11, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("vision") })
    ] })
  ] });
};
var AgentCardMeta_default = AgentCardMeta;

// packages/ai/agent/web/AgentCardActions.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var AgentCardActions = (0, import_react.memo)(
  ({ item, dialogSpaceId: explicitSpaceId, server }) => {
    const { t } = useTranslation(["ai"]);
    const agentKey = item.dbKey || item.id;
    const resolvedSpaceId = explicitSpaceId ?? resolveDialogLaunchSpaceId({ recordSpaceId: item.spaceId });
    const { isStarting, startDialog } = useAgentDialog(agentKey, {
      spaceId: resolvedSpaceId,
      preferredServerOrigin: server
    });
    const handleStartDialog = (0, import_react.useCallback)(
      (e) => {
        e.stopPropagation();
        e.preventDefault();
        startDialog();
      },
      [startDialog]
    );
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "agent__actions", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Button_default,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuMessageSquare, { size: 16, "aria-hidden": "true" }),
        onClick: handleStartDialog,
        disabled: isStarting,
        loading: isStarting,
        size: "medium",
        className: "agent__primary",
        children: isStarting ? t("starting") : t("quickStart", "\u5F00\u804A")
      }
    ) });
  }
);
AgentCardActions.displayName = "AgentCardActions";
var AgentCardActions_default = AgentCardActions;

export {
  AgentCardMeta_default,
  AgentCardActions_default
};
