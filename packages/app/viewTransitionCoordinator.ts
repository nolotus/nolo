import { useCallback } from "react";
import {
  useNavigate,
  type NavigateOptions,
  type To,
} from "app/routing";
import {
  cardIconViewTransitionName,
  cardSurfaceViewTransitionName,
  cardTitleViewTransitionName,
  enableNextRouteViewTransition,
} from "app/viewTransitions";

// Re-export existing no-arg flag setter (implementation stays in viewTransitions.ts)
export { enableNextRouteViewTransition };

export type AgentCardVTNames = {
  icon: string;
  title: string;
  surface: string;
};

/** Shared-element names for AgentCard list ↔ AgentPage detail morph. */
export const getAgentCardVTNames = (agentId: string): AgentCardVTNames => ({
  icon: cardIconViewTransitionName(agentId),
  title: cardTitleViewTransitionName(agentId),
  surface: cardSurfaceViewTransitionName(agentId),
});

/**
 * Returns navigateWithVT: enable route VT flag then SPA navigate.
 * Use for programmatic navigations that should morph shared elements.
 */
export function useViewTransitionNavigate(): (
  to: To,
  options?: NavigateOptions
) => void {
  const navigate = useNavigate();
  return useCallback(
    (to: To, options?: NavigateOptions) => {
      enableNextRouteViewTransition();
      navigate(to, options);
    },
    [navigate]
  );
}
