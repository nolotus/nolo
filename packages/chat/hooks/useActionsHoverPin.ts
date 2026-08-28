import { useCallback, useEffect, useRef, useState } from "react";

/** Keep toolbar visible briefly after leave so bubble→buttons stays stable. */
export const ACTIONS_HOVER_LEAVE_DELAY_MS = 200;

/**
 * Pins message-action visibility across the bubble→toolbar gap.
 * Returns class flag + mouse handlers for the shared hover parent.
 */
export function useActionsHoverPin(
  enabled: boolean,
  leaveDelayMs: number = ACTIONS_HOVER_LEAVE_DELAY_MS
) {
  const [pinned, setPinned] = useState(false);
  const leaveTimerRef = useRef<number | null>(null);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current != null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearLeaveTimer(), [clearLeaveTimer]);

  const onMouseEnter = useCallback(() => {
    if (!enabled) return;
    clearLeaveTimer();
    setPinned(true);
  }, [enabled, clearLeaveTimer]);

  const onMouseLeave = useCallback(() => {
    if (!enabled) return;
    clearLeaveTimer();
    leaveTimerRef.current = window.setTimeout(() => {
      setPinned(false);
      leaveTimerRef.current = null;
    }, leaveDelayMs);
  }, [enabled, clearLeaveTimer, leaveDelayMs]);

  return {
    isActionsHover: enabled && pinned,
    onMouseEnter: enabled ? onMouseEnter : undefined,
    onMouseLeave: enabled ? onMouseLeave : undefined,
  } as const;
}
