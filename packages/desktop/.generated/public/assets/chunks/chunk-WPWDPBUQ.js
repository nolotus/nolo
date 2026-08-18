import {
  isInteractiveAgentCardTarget,
  seedAgentPreviewInStore
} from "/public/assets/chunks/chunk-JJGKUQA3.js";
import {
  AgentCardActions_default,
  AgentCardMeta_default
} from "/public/assets/chunks/chunk-D2IAHGBR.js";
import {
  buildAgentNavLocationState,
  getAgentCardVTNames,
  useViewTransitionNavigate
} from "/public/assets/chunks/chunk-WOLEEY5H.js";
import {
  AgentAvatar_default
} from "/public/assets/chunks/chunk-FYMUXPF2.js";
import {
  Link,
  viewTransitionStyle
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useStore
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectCurrentServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
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

// packages/ai/agent/web/AgentCard.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var AgentMoreActionsLazy = (0, import_react.lazy)(() => import("/public/assets/chunks/AgentMoreActions-I7NZMAJA.js"));
var AgentCardComponent = ({ item }) => {
  const { t } = useTranslation(["ai"]);
  const dispatch = useAppDispatch();
  const store = useStore();
  const agentKey = item.dbKey || item.id;
  const agentPath = `/${agentKey}`;
  const currentServer = useAppSelector(selectCurrentServer);
  const server = item.authorityServer || item.originServer || currentServer;
  const navigateWithVT = useViewTransitionNavigate();
  const vtNames = getAgentCardVTNames(agentKey);
  const surfaceVt = viewTransitionStyle(vtNames.surface);
  const avatarVt = viewTransitionStyle(vtNames.icon);
  const titleVt = viewTransitionStyle(vtNames.title);
  const prefetchAgent = (0, import_react.useCallback)(() => {
    seedAgentPreviewInStore(dispatch, store.getState, item);
  }, [dispatch, item, store]);
  const handleCardClick = (0, import_react.useCallback)(
    (e) => {
      if (isInteractiveAgentCardTarget(e.target)) {
        e.preventDefault();
        return;
      }
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      seedAgentPreviewInStore(dispatch, store.getState, item);
      e.preventDefault();
      navigateWithVT(agentPath, { state: buildAgentNavLocationState(item) });
    },
    [agentPath, dispatch, item, navigateWithVT, store]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    Link,
    {
      to: agentPath,
      state: buildAgentNavLocationState(item),
      className: "agent",
      style: surfaceVt,
      onClick: handleCardClick,
      onPointerEnter: prefetchAgent,
      onFocus: prefetchAgent,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent__header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__avatar", style: avatarVt, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentAvatar_default, { agent: item, size: 40, avatarSize: "large" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent__info", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__title-link", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "agent__title", style: titleVt, children: item.name || t("unnamed") }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentCardMeta_default, { item })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__actions-top", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__more-placeholder" }), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentMoreActionsLazy, { agentKey }) }) })
        ] }),
        item.introduction && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__desc", children: item.introduction }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentCardActions_default, { item, server })
      ]
    }
  );
};
var AgentCard = (0, import_react.memo)(AgentCardComponent);
AgentCard.displayName = "AgentCard";
var AgentCard_default = AgentCard;

export {
  AgentCard_default
};
