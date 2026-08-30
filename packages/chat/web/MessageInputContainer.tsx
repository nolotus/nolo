// 文件路径: packages/chat/web/MessageInputContainer.tsx
// Assembly / permission gate. Composer lives in MessageInputCore.

import * as stylex from "@stylexjs/stylex";
import { messageInputStyles } from "./messageInputStyles";
import "./chatStylexEscapeHatch.css";
import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  forwardRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "app/routing";
import { useSendPermission } from "../hooks/useSendPermission";
import { useAppSelector, useAppDispatch } from "app/store";
import { fetchUserProfile } from "identity/actions";
import { useCurrentUser, useUserId } from "identity";
import { selectIdentityUserBalance } from "identity/selectors";
import { GPT_PRO_BLOCKED_MESSAGE, shouldBlockForGptPro } from "core/gptProTier";
import { buildNoloDefaultAgentOption } from "./noloDefaultAgentOption";
import { toast } from "app/utils/toast";
import { setPrimaryDialogAgent } from "../dialog/dialogSlice";
import { useCurrentDialogConfig } from "../dialog/useCurrentDialogConfig";
import { read, selectById } from "database/dbSlice";
import type { AgentRuntimeOptions } from "ai/agent/types";
import type { Agent } from "app/types";
import { getActiveDialogAgentId } from "chat/dialog/dialogAgents";
import {
  isAutoDialog,
  resolveDialogAutoAgentConfig,
} from "chat/dialog/dialogAgentPolicy";
import { useAgentPickerCandidates } from "../hooks/useAgentPickerCandidates";
import { resolveMessageInputAgentUi } from "./messageInputAgentUi";
import {
  ErrorMessage,
  LoadingPlaceholder,
} from "./MessageInputShell";
import {
  MessageInput,
  type MessageInputHandle,
} from "./MessageInputCore";
import type { AgentPickerControlProps } from "./AgentPickerControl";

export type { MessageInputHandle };

interface MessageInputContainerProps {
  runtimeOptions?: AgentRuntimeOptions;
  /**
   * 可选：显式传入的 composer agent 切换器；不传时 Container 会基于当前
   * dialog 的 primary agent + 用户收藏列表自动构造一个默认切换器。
   */
  agentPicker?: AgentPickerControlProps;
}

const MessageInputContainer = forwardRef<
  MessageInputHandle,
  MessageInputContainerProps
>(({ runtimeOptions, agentPicker }, ref) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation("chat");
  // 默认档描述的四语言资源在主 namespace（interface.locale.ts）里，
  // "chat" namespace 没有注册资源——用 chat 的 t 取只会永远拿到中文兜底。
  const { t: tRoot } = useTranslation();
  const balance = useAppSelector(selectIdentityUserBalance);
  const userId = useUserId();
  const {
    sendPermission,
    getErrorMessage,
    isLoading: isSendPermissionLoading,
  } = useSendPermission(balance ?? 0);

  // CLI/custom agents don't need balance; skip loading wait if already allowed
  const isLoading =
    isSendPermissionLoading ||
    (typeof balance !== "number" && !sendPermission.allowed);

  const dialogConfig = useCurrentDialogConfig();
  const autoDialog = isAutoDialog(dialogConfig);
  const activeAgentId = autoDialog ? null : getActiveDialogAgentId(dialogConfig);
  const activeAgent = useAppSelector((state) => {
    if (!activeAgentId) return null;
    try {
      return (selectById(state, activeAgentId) as Agent | null) ?? null;
    } catch {
      return null;
    }
  });
  const [loadedActiveAgent, setLoadedActiveAgent] = useState<Agent | null>(
    null
  );

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserProfile());
    }
  }, [userId, dispatch]);

  useEffect(() => {
    if (!activeAgentId) {
      setLoadedActiveAgent(null);
      return;
    }

    if (activeAgent) {
      setLoadedActiveAgent(activeAgent);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const agent = (await dispatch(
          read({ dbKey: activeAgentId })
        ).unwrap()) as Agent;
        if (cancelled) return;
        setLoadedActiveAgent(agent ?? null);
      } catch (error) {
        if (cancelled) return;
        console.warn(
          "[MessageInputContainer] Failed to load agent/model config:",
          error
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeAgent, activeAgentId, dispatch]);

  const resolvedActiveAgent = activeAgent ?? loadedActiveAgent;

  // agent 还没加载出来时传 null 即可：resolveMessageInputAgentUi 自己会退化成
  // 无 modelConfig 的 custom 能力集。
  const resolvedAgentUi = useMemo(
    () =>
      resolveMessageInputAgentUi({
        agent: resolvedActiveAgent ?? resolveDialogAutoAgentConfig(dialogConfig),
        userId: userId ?? null,
      }),
    [resolvedActiveAgent, dialogConfig, userId]
  );

  const imageUiConfig = resolvedAgentUi.imageUiConfig;

  // 默认 agent 切换器：调用方未显式传入 agentPicker 时，聚合三层 agent
  // （收藏 → 自己创建 → AI 广场）构造候选列表。主对话页 / quick-chat 落地页
  // composer 都默认具备切换能力，切换后经 setPrimaryDialogAgent 更新对话 agent 配置。
  const handleSwitchAgent = useCallback(
    async (agentKey: string) => {
      // 空 key 表示切回 auto；setPrimaryDialogAgent 会清除 fixed Agent 字段。
      // 无激活对话（草稿/新对话态）：setPrimaryDialogAgent 会抛错，这里给出
      // 明确提示而非静默丢弃，避免点击无反馈。
      if (!dialogConfig) {
        toast.success(
          t("switchModelNoDialog", "当前还没有对话，发送一条消息后再切换模型")
        );
        return;
      }
      try {
        await dispatch(setPrimaryDialogAgent(agentKey)).unwrap();
        toast.success(
          t("switchModelContinueSuccess", "已切换模型，并继续当前对话")
        );
      } catch (error) {
        console.error(
          "[MessageInputContainer] Failed to switch composer agent:",
          error
        );
        toast.error(t("switchModelContinueFailed", "切换模型失败，请重试"));
      }
    },
    [dialogConfig, dispatch, t]
  );

  const { candidates: pickerCandidates } = useAgentPickerCandidates({
    activeAgentId,
    limit: 30,
  });
  const defaultAgentPicker = useMemo<AgentPickerControlProps | undefined>(() => {
    return {
      candidates: pickerCandidates,
      activeAgentKey: activeAgentId,
      onSelect: handleSwitchAgent,
      // 与首页 QuickChat 共用同一个默认档定义（见 noloDefaultAgentOption）。
      defaultOption: buildNoloDefaultAgentOption(tRoot),
    };
  }, [pickerCandidates, activeAgentId, handleSwitchAgent, tRoot]);

  const resolvedAgentPicker = agentPicker ?? defaultAgentPicker;

  const currentUser = useCurrentUser();

  const isProBlocked = useMemo(() => {
    return shouldBlockForGptPro(
      resolvedActiveAgent,
      currentUser?.gptProAccess?.status
    ).blocked;
  }, [resolvedActiveAgent, currentUser]);

  if (isLoading) return <LoadingPlaceholder />;

  if (isProBlocked) {
    return (
      <ErrorMessage
        message={GPT_PRO_BLOCKED_MESSAGE}
        showRecharge={true}
        onRecharge={() => navigate("/recharge")}
        agentPicker={resolvedAgentPicker}
      />
    );
  }

  if (!sendPermission.allowed) {
    return (
      <ErrorMessage
        message={getErrorMessage(
          sendPermission.reason,
          sendPermission.pricing
        )}
        showRecharge={sendPermission.reason === "INSUFFICIENT_BALANCE"}
        onRecharge={() => navigate("/recharge")}
        agentPicker={resolvedAgentPicker}
      />
    );
  }

  return (
    <MessageInput
      ref={ref}
      runtimeOptions={runtimeOptions}
      imageUiConfig={imageUiConfig}
      agentPicker={resolvedAgentPicker}
    />
  );
});

export default MessageInputContainer;
