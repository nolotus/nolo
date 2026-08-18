import {
  isPublicCatalogSpace
} from "/public/assets/chunks/chunk-ZCACUALD.js";
import {
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/hooks/useAgentDialog.ts
var import_react = __toESM(require_react());
function useAgentDialog(agentKey, options = {}) {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = (0, import_react.useState)(false);
  const { spaceId, preferredServerOrigin } = options;
  const startDialog = (0, import_react.useCallback)(async (initialPrompt) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const [{ createDialog }, { buildDialogUrl }] = await Promise.all([
        import("/public/assets/chunks/dialogSlice-5YLHPK2U.js"),
        import("/public/assets/chunks/dialogUrl-7FEM363S.js")
      ]);
      const result = await dispatch(
        createDialog({
          cybots: [agentKey],
          ...spaceId ? { spaceId } : {},
          ...preferredServerOrigin ? { preferredServerOrigin } : {}
        })
      ).unwrap();
      if (initialPrompt && initialPrompt.trim()) {
        const { publishChatInputSeed } = await import("/public/assets/chunks/useChatInputSeed-W5VAPBXN.js");
        publishChatInputSeed({
          text: initialPrompt.trim(),
          mode: "replace",
          focus: true
        });
      }
      navigate(buildDialogUrl(result.dbKey, result.spaceId), {
        state: { isNew: true }
      });
    } catch (err) {
      const msg = err?.message ? `${t("createDialogError")}: ${err.message}` : t("createDialogError");
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [agentKey, dispatch, isLoading, navigate, preferredServerOrigin, spaceId, t]);
  return { isStarting: isLoading, startDialog };
}

// packages/chat/dialog/dialogLaunchScope.ts
var trimSpaceId = (spaceId) => asOptionalTrimmedString(spaceId) ?? null;
var resolveDialogLaunchSpaceId = ({
  routeSpaceId,
  recordSpaceId,
  currentSpaceId,
  viewMode,
  allowSidebarSpaceFallback = false,
  preferCurrentSpaceOverRecord = false
}) => {
  const routeSid = trimSpaceId(routeSpaceId);
  const recordSid = trimSpaceId(recordSpaceId);
  if (preferCurrentSpaceOverRecord && allowSidebarSpaceFallback && viewMode === "categories" && !routeSid) {
    const currentSid = trimSpaceId(currentSpaceId);
    if (currentSid && !isPublicCatalogSpace(currentSid)) {
      return currentSid;
    }
  }
  const explicitSpaceId = routeSid ?? recordSid;
  if (explicitSpaceId && !isPublicCatalogSpace(explicitSpaceId)) {
    return explicitSpaceId;
  }
  if (!allowSidebarSpaceFallback || viewMode !== "categories") {
    return null;
  }
  return trimSpaceId(currentSpaceId);
};

export {
  useAgentDialog,
  resolveDialogLaunchSpaceId
};
