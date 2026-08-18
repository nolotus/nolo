import {
  seedAgentPreviewInStore
} from "/public/assets/chunks/chunk-JJGKUQA3.js";
import {
  buildAgentNavLocationState,
  useViewTransitionNavigate
} from "/public/assets/chunks/chunk-WOLEEY5H.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useStore
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/web/useAgentCardNavigation.ts
var import_react = __toESM(require_react());
function useAgentCardNavigation() {
  const navigateWithVT = useViewTransitionNavigate();
  const dispatch = useAppDispatch();
  const store = useStore();
  const openAgent = (0, import_react.useCallback)(
    (agent, opts) => {
      const agentPath = `/${agent.dbKey || agent.id}`;
      seedAgentPreviewInStore(dispatch, store.getState, agent);
      if (opts?.newTab) {
        window.open(agentPath, "_blank", "noopener,noreferrer");
        return;
      }
      navigateWithVT(agentPath, { state: buildAgentNavLocationState(agent) });
    },
    [dispatch, navigateWithVT, store]
  );
  const prefetchAgent = (0, import_react.useCallback)(
    (agent) => {
      seedAgentPreviewInStore(dispatch, store.getState, agent);
    },
    [dispatch, store]
  );
  return { openAgent, prefetchAgent };
}

export {
  useAgentCardNavigation
};
