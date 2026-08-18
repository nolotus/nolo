import {
  AgentCardActions_default,
  AgentCardMeta_default
} from "/public/assets/chunks/chunk-D2IAHGBR.js";
import {
  resolveAgentBadgeMeta
} from "/public/assets/chunks/chunk-JQ6XROM5.js";
import {
  AgentAvatar_default
} from "/public/assets/chunks/chunk-FYMUXPF2.js";
import {
  resolveDialogLaunchSpaceId
} from "/public/assets/chunks/chunk-UFYPTJWC.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  useCouldEdit,
  useIsLoggedIn,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  useHasMounted
} from "/public/assets/chunks/chunk-OOUNP25R.js";
import {
  cardIconViewTransitionName,
  cardSurfaceViewTransitionName,
  cardTitleViewTransitionName,
  useParams,
  viewTransitionStyle
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  deleteDbKey,
  isSystemAdmin,
  selectCurrentServer,
  selectCurrentSpaceId,
  selectViewMode,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  normalizeSpaceId
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/web/AgentBlock.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var AgentMoreActionsLazy = (0, import_react.lazy)(() => import("/public/assets/chunks/AgentMoreActions-I7NZMAJA.js"));
var AgentForkDialogLazy = (0, import_react.lazy)(() => import("/public/assets/chunks/AgentForkDialog-ORKTFFWP.js"));
var loadAgentForm = () => import("/public/assets/chunks/AgentForm-GO3YH5PE.js");
var AgentFormLazy = (0, import_react.lazy)(loadAgentForm);
var preloadEditBundle = () => {
  loadAgentForm();
};
var AgentBlockComponent = ({
  item,
  reload,
  showCover = false,
  preferCurrentSpaceLaunch = false
}) => {
  const { t } = useTranslation(["ai"]);
  const dispatch = useAppDispatch();
  const { spaceId: routeSpaceId } = useParams();
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const viewMode = useAppSelector(selectViewMode);
  const hasMounted = useHasMounted();
  const agentKey = item.dbKey || item.id;
  const recordSpaceId = item.spaceId || routeSpaceId;
  const deleteSpaceId = routeSpaceId ? normalizeSpaceId(routeSpaceId) : recordSpaceId ? normalizeSpaceId(recordSpaceId) : void 0;
  const dialogSpaceId = resolveDialogLaunchSpaceId({
    allowSidebarSpaceFallback: true,
    currentSpaceId,
    recordSpaceId,
    viewMode,
    preferCurrentSpaceOverRecord: preferCurrentSpaceLaunch
  });
  const badgeMeta = resolveAgentBadgeMeta(item);
  const [editVisible, setEditVisible] = (0, import_react.useState)(false);
  const cardRef = (0, import_react.useRef)(null);
  const openEdit = (0, import_react.useCallback)(() => setEditVisible(true), []);
  const closeEdit = (0, import_react.useCallback)(() => setEditVisible(false), []);
  const currentUserId = useUserId();
  const currentServer = useAppSelector(selectCurrentServer);
  const server = item.authorityServer || item.originServer || currentServer;
  const allowEditFromKey = useCouldEdit(agentKey);
  const allowEdit = hasMounted && (allowEditFromKey || currentUserId && (item.userId === currentUserId || isSystemAdmin(currentUserId)));
  const isLoggedIn = useIsLoggedIn();
  const canFork = hasMounted && item.allowFork === true && isLoggedIn && item.userId !== currentUserId && (!item.apiSource || item.apiSource === "platform");
  const [forkVisible, setForkVisible] = (0, import_react.useState)(false);
  const openFork = (0, import_react.useCallback)(() => setForkVisible(true), []);
  const closeFork = (0, import_react.useCallback)(() => setForkVisible(false), []);
  const handleDelete = (0, import_react.useCallback)(async () => {
    try {
      cardRef.current?.classList.add("agent-exit");
      await dispatch(
        deleteDbKey({
          contentKey: agentKey,
          preferredServerOrigin: server,
          spaceId: deleteSpaceId
        })
      );
      toast.success(t("deleteSuccess"));
      void Promise.resolve(reload?.([String(agentKey), String(item.id)])).catch(
        (error) => {
          console.warn("[AgentBlock] Reload after delete failed:", error);
        }
      );
    } catch {
      toast.error(t("deleteError"));
    }
  }, [deleteSpaceId, agentKey, dispatch, item.id, reload, server, t]);
  const handleEdit = (0, import_react.useCallback)(() => {
    preloadEditBundle();
    openEdit();
  }, [openEdit]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        ref: cardRef,
        className: `agent${showCover ? " agent--with-cover" : ""}`,
        style: viewTransitionStyle(cardSurfaceViewTransitionName(agentKey)),
        children: [
          showCover && item.cover && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__cover", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: item.cover, alt: "", loading: "lazy" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent__header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                className: "agent__avatar",
                style: viewTransitionStyle(cardIconViewTransitionName(agentKey)),
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentAvatar_default, { agent: item, size: 40, avatarSize: "large" })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent__info", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__title-link", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "h3",
                {
                  className: "agent__title",
                  style: viewTransitionStyle(cardTitleViewTransitionName(agentKey)),
                  children: item.name || t("unnamed")
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentCardMeta_default, { item })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__actions-top", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__more-placeholder" }), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              AgentMoreActionsLazy,
              {
                agentKey,
                preloadEditBundle: allowEdit ? preloadEditBundle : void 0,
                onEdit: allowEdit ? handleEdit : void 0,
                onDelete: allowEdit ? handleDelete : void 0,
                onFork: canFork ? openFork : void 0
              }
            ) }) })
          ] }),
          item.introduction && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__desc", children: item.introduction }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            AgentCardActions_default,
            {
              item,
              dialogSpaceId,
              server
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Dialog,
      {
        isOpen: editVisible,
        onClose: closeEdit,
        title: `${t("edit")} ${item.name || t("agent")}`,
        size: "large",
        children: editVisible && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_react.Suspense,
          {
            fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent__dialog-body-fallback", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__dialog-spinner" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__dialog-text", children: t("loading") })
            ] }),
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentFormLazy, { mode: "edit", initialValues: item, onClose: closeEdit })
          }
        )
      }
    ),
    canFork && forkVisible && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_react.Suspense,
      {
        fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent__dialog-body-fallback", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__dialog-spinner" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent__dialog-text", children: t("loading") })
        ] }),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          AgentForkDialogLazy,
          {
            isOpen: forkVisible,
            onClose: closeFork,
            agent: item
          }
        )
      }
    )
  ] });
};
var AgentBlock = (0, import_react.memo)(AgentBlockComponent);
AgentBlock.displayName = "AgentBlock";
var AgentBlock_default = AgentBlock;

export {
  AgentBlock_default
};
