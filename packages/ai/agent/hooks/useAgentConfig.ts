import { useEffect, useState } from "react";

import type { Agent } from "app/types";
import { useAppDispatch, useAppSelector } from "app/store";
import { read, selectById } from "database/dbSlice";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";

import { useCurrentDialogKey } from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { getActiveDialogAgentId } from "chat/dialog/dialogAgents";
import { isDeviceLocalDbKey } from "database/authority/deviceLocal";

interface UseAgentConfigResult {
  agentConfig: Agent | null;
  isLoading: boolean;
  loadState: "idle" | "loading" | "ready" | "error";
}

const useAgentConfig = () => {
  const dispatch = useAppDispatch();
  const [loadState, setLoadState] =
    useState<UseAgentConfigResult["loadState"]>("idle");

  const currentDialogKey = useCurrentDialogKey();
  const currentDialogConfig = useCurrentDialogConfig();
  const agentKey = getActiveDialogAgentId(currentDialogConfig);
  const { currentToken, currentServer } = useAppSelector(selectRuntimeSnapshot);
  const agentConfig = useAppSelector((state) =>
    agentKey ? ((selectById(state, agentKey) as Agent | null) ?? null) : null
  );

  useEffect(() => {
    if (currentDialogKey && !currentDialogConfig) {
      setLoadState("loading");
      return;
    }

    if (!agentKey) {
      setLoadState("idle");
      return;
    }

    if (agentConfig) {
      setLoadState("ready");
      return;
    }

    // M3: device-local agents hydrate from local DB without a Nolo token.
    // Account/platform agents still wait for auth before remote read.
    if (!currentToken && !isDeviceLocalDbKey(agentKey)) {
      setLoadState("loading");
      return;
    }

    let cancelled = false;
    setLoadState("loading");

    void (async () => {
      try {
        await dispatch(read({ dbKey: agentKey })).unwrap();
        if (cancelled) return;
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        console.warn("[useAgentConfig] Primary server failed to load agent config, trying multi-master fallback:", error);
        
        // 多主节点 (Multi-Master) 静默退避拉取
        const candidateServers = ["https://us.nolo.chat", "https://nolo.chat"].filter(
          (s) => s !== currentServer
        );
        let fallbackSuccess = false;

        for (const fallbackServer of candidateServers) {
          try {
            await dispatch(read({ dbKey: agentKey, serverOrigin: fallbackServer } as any)).unwrap();
            if (cancelled) return;
            setLoadState("ready");
            fallbackSuccess = true;
            break;
          } catch {
            // 继续下一个备用主节点
          }
        }

        if (cancelled) return;
        // 拉不到就是拉不到：不按平台伪装成 ready，否则下游只看到
        // "配置为空"，错误被藏掉。
        if (!fallbackSuccess) setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    agentConfig,
    agentKey,
    currentDialogConfig,
    currentDialogKey,
    currentServer,
    currentToken,
    dispatch,
  ]);

  return {
    agentConfig: agentConfig ?? null,
    isLoading: loadState === "loading",
    loadState,
  } satisfies UseAgentConfigResult;
};

export default useAgentConfig;
