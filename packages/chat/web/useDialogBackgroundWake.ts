import { useEffect, useRef, useState } from "react";
import { subscribeSharedSse } from "app/realtime/sharedSse";

export type DialogBackgroundWakeOptions = {
  dialogId: string | null;
  server: string | null;
  token: string | null;
  /** Local streaming or the foreground recovery session owns this channel. */
  foregroundActive: boolean;
  reloadMessages: () => Promise<unknown>;
  subscribe?: typeof subscribeSharedSse;
};

export function useDialogBackgroundWake({
  dialogId,
  server,
  token,
  foregroundActive,
  reloadMessages,
  subscribe = subscribeSharedSse,
}: DialogBackgroundWakeOptions): boolean {
  const [followingDialog, setFollowingDialog] = useState<string | null>(null);
  const latest = useRef({ foregroundActive, reloadMessages });
  latest.current = { foregroundActive, reloadMessages };

  useEffect(() => {
    setFollowingDialog(null);
    if (!dialogId || !server || !token || foregroundActive) return;
    let disposed = false;
    let terminalSeen = false;
    const channel = `dialog-${dialogId}`;
    const unsubscribe = subscribe({
      key: `${server}:${channel}`,
      url: `${server}/api/events/${channel}`,
      headers: { Authorization: `Bearer ${token}` },
      onEvent: (event) => {
        if (disposed || latest.current.foregroundActive) return;
        if (event.type === "status" && event.status === "running") {
          terminalSeen = false;
          setFollowingDialog(dialogId);
        } else if (
          event.type === "done" || event.type === "failed" || event.type === "cancelled"
        ) {
          setFollowingDialog(null);
          if (terminalSeen) return;
          terminalSeen = true;
          // The normal dialog bootstrap/error surface remains authoritative.
          void latest.current
            .reloadMessages()
            .catch(() => {})
            .finally(() => {
              terminalSeen = false;
            });
        }
      },
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [dialogId, server, token, foregroundActive, subscribe]);

  return !foregroundActive && followingDialog === dialogId && dialogId !== null;
}
