import { useEffect } from "react";
import { useToken } from "identity";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppSelector } from "app/store";
import { getIsDesktopApp } from "app/utils/env";
import {
  startDesktopLocalConnectorFromSession,
  type DesktopLocalConnectorStartResult,
} from "app/utils/desktopLocalConnectorClient";
import { normalizeServerOrigin } from "core/serverOrigin";

type UseDesktopLocalConnectorAutostartOptions = {
  onResult?: (result: DesktopLocalConnectorStartResult) => void;
};

export function useDesktopLocalConnectorAutostart(
  options: UseDesktopLocalConnectorAutostartOptions = {}
) {
  const onResult = options.onResult;
  const currentToken = useToken();
  const currentServer = useAppSelector(selectCurrentServer);
  const serverBase =
    normalizeServerOrigin(currentServer) ||
    (typeof window !== "undefined" ? window.location.origin : "");

  useEffect(() => {
    if (!getIsDesktopApp() || !currentToken || !serverBase) return;
    let cancelled = false;
    void startDesktopLocalConnectorFromSession({
      serverUrl: serverBase,
      authToken: currentToken,
    }).then((result) => {
      if (!cancelled) onResult?.(result);
    });
    return () => {
      cancelled = true;
    };
  }, [currentToken, onResult, serverBase]);
}
