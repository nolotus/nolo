import { useCallback } from "react";
import { useStore } from "react-redux";
import type { Agent } from "app/types";
import { useAppDispatch, type RootState } from "app/store";
import { useViewTransitionNavigate } from "app/viewTransitionCoordinator";
import { buildAgentNavLocationState } from "./agentNavigationPreview";
import { seedAgentPreviewInStore } from "./seedAgentPreview";

/**
 * Shared navigation + prefetch logic for agent list cards.
 * Used by PublicAgentsList, FavoritesCollection, and AgentCard.
 */
export function useAgentCardNavigation() {
  const navigateWithVT = useViewTransitionNavigate();
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();

  const openAgent = useCallback(
    (agent: Agent, opts?: { newTab?: boolean }) => {
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

  const prefetchAgent = useCallback(
    (agent: Agent) => {
      seedAgentPreviewInStore(dispatch, store.getState, agent);
    },
    [dispatch, store]
  );

  return { openAgent, prefetchAgent };
}