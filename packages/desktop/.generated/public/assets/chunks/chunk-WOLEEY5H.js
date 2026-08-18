import {
  cardIconViewTransitionName,
  cardSurfaceViewTransitionName,
  cardTitleViewTransitionName,
  enableNextRouteViewTransition,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/viewTransitionCoordinator.ts
var import_react = __toESM(require_react());
var getAgentCardVTNames = (agentId) => ({
  icon: cardIconViewTransitionName(agentId),
  title: cardTitleViewTransitionName(agentId),
  surface: cardSurfaceViewTransitionName(agentId)
});
function useViewTransitionNavigate() {
  const navigate = useNavigate();
  return (0, import_react.useCallback)(
    (to, options) => {
      enableNextRouteViewTransition();
      navigate(to, options);
    },
    [navigate]
  );
}

// packages/ai/agent/web/agentNavigationPreview.ts
var AGENT_NAV_PREVIEW_STATE_KEY = "agentPreview";
var buildAgentNavPreview = (item) => {
  const key = item.dbKey || item.id;
  return {
    id: item.id,
    dbKey: typeof key === "string" ? key : void 0,
    name: item.name,
    introduction: item.introduction,
    hasVision: item.hasVision,
    model: item.model,
    provider: item.provider,
    cliProvider: item.cliProvider,
    apiSource: item.apiSource,
    outputPrice: item.outputPrice,
    inputPrice: item.inputPrice,
    userId: item.userId,
    spaceId: item.spaceId,
    avatarFileId: item.avatarFileId,
    authorityServer: item.authorityServer,
    originServer: item.originServer,
    customProviderUrl: item.customProviderUrl,
    runtimeBinding: item.runtimeBinding,
    isPublic: item.isPublic,
    useServerProxy: item.useServerProxy,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt
  };
};
var buildAgentNavLocationState = (item) => ({
  [AGENT_NAV_PREVIEW_STATE_KEY]: buildAgentNavPreview(item)
});
var resolveAgentNavPreview = (state, agentKey) => {
  if (!state || typeof state !== "object") return void 0;
  const preview = state[AGENT_NAV_PREVIEW_STATE_KEY];
  if (!preview || typeof preview !== "object") return void 0;
  const record = preview;
  const key = typeof record.dbKey === "string" && record.dbKey || typeof record.id === "string" && record.id || "";
  if (!key) return void 0;
  if (key !== agentKey) return void 0;
  return record;
};

export {
  getAgentCardVTNames,
  useViewTransitionNavigate,
  buildAgentNavPreview,
  buildAgentNavLocationState,
  resolveAgentNavPreview
};
