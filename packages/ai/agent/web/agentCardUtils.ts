/**
 * Block card-level navigation when the user is interacting with a nested
 * control (chat button, more menu, links). Shared by PublicAgentsList,
 * FavoritesCollection, and AgentCard click handlers.
 *
 * NOTE: AgentCard renders as `<a class="agent">`, so `closest("a")` would
 * match the card root itself. We exclude `.agent` to avoid self-matching.
 */
export const isInteractiveAgentCardTarget = (
  target: EventTarget | null
): boolean => {
  if (!(target instanceof Element)) return false;
  // Check for nested interactive controls, but skip the card root (.agent).
  if (target.closest("button") || target.closest("[role='menu']") || target.closest(".agent__actions-top")) {
    return true;
  }
  // Only treat <a> as interactive if it's NOT the card root itself.
  const anchor = target.closest("a");
  return anchor !== null && !anchor.classList.contains("agent");
};