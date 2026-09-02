import * as stylex from "@stylexjs/stylex";
import React from "react";
import {
  LuCopy,
  LuBookmark,
  LuCheck,
  LuGitBranch,
  LuPencilLine,
  LuTrash2,
} from "react-icons/lu";
import copyToClipboard from "app/utils/clipboard";
import { runLlm } from "ai/agent/agentSlice";
import { BUILTIN_TITLE_LLM_CONFIG } from "chat/dialog/actions/builtinDialogLlm";
import { Link, useNavigate } from "app/routing";
import { useCurrentUser } from "identity";
import { useAppDispatch, useAppSelector } from "app/store";
import { useStore } from "react-redux";
import { useTranslation } from "react-i18next";
import { Tooltip } from "render/web/ui/Tooltip";
import { toast } from "app/utils/toast";
import { createDocState } from "render/page/docStore";
import { publishChatInputSeed } from "chat/hooks/useChatInputSeed";
import { compactDialogAndForkAction } from "chat/dialog/actions/compactDialogAndForkAction";
import { useCurrentDialogKey } from "chat/dialog/dialogSlice";
import { buildDialogUrl } from "chat/dialog/dialogUrl";
import { TFunction } from "i18next";
import { useMessageDelete } from "../hooks/useMessageDelete";
import { messageActionsStyles as styles } from "./messageActionsStyles";
import { withLiteralClass } from "./toolMessageShared";
import "./messagesStylexEscapeHatch.css";

const SAVE_TITLE_TIMEOUT_MS = 1500;

type ContentPart = {
  type?: string;
  text?: string;
  image_url?: { url?: string };
  name?: string;
  pageKey?: string;
};

const isTextPart = (item: unknown): item is { type: "text"; text: string } => {
  if (
    !item ||
    typeof item !== "object" ||
    !("type" in item) ||
    !("text" in item)
  ) {
    return false;
  }
  return item.type === "text" && typeof item.text === "string";
};

const serializePart = (item: ContentPart): string => {
  if (item.type === "text" && typeof item.text === "string") return item.text;
  if (item.type === "image_url" && typeof item.image_url?.url === "string") {
    return `[Image: ${item.image_url.url}]`;
  }
  if (typeof item.pageKey === "string") {
    return `[File: ${item.name || "未知文件"}]`;
  }
  return "";
};

const getContentString = (
  content: unknown,
  thinkContent = "",
  showThinking = false,
  t: TFunction,
): string => {
  const baseContent =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map(serializePart).join("\n")
        : content == null
          ? ""
          : JSON.stringify(content);

  return showThinking && thinkContent
    ? `**${t("thinkingContent")}**:\n${thinkContent}\n\n**${t("answerContent")}**:\n${baseContent}`
    : baseContent;
};

const getPlainText = (content: unknown): string => {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => (isTextPart(item) ? item.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
};

export const MessageActions = ({
  message,
  isRobot,
  isSelf,
  isStreaming = false,
  canBranch = false,
  showActions,
  showThinking = false,
  isTouch = false,
  onDismissActions,
}: {
  message: any;
  isRobot?: boolean;
  isSelf?: boolean;
  isStreaming?: boolean;
  canBranch?: boolean;
  showActions?: boolean;
  showThinking?: boolean;
  isTouch?: boolean;
  onDismissActions?: () => void;
}) => {
  const user = useCurrentUser();
  const dispatch = useAppDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const { t } = useTranslation("chat");
  const currentDialogKey = useCurrentDialogKey();

  const { content, thinkContent, dbKey } = message || {};
  const currentSpaceId = useCurrentSpaceId();
  const [copied, setCopied] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isBranching, setIsBranching] = React.useState(false);
  const isSavingRef = React.useRef(false);
  const isBranchingRef = React.useRef(false);

  // 1. 复制功能（带状态反馈）
  const handleCopy = (e: React.MouseEvent) => {
    e?.stopPropagation?.();
    const text = content
      ? getContentString(content, thinkContent, showThinking, t)
      : "";
    if (!text) return toast.error(t("copyFailed"));

    copyToClipboard(text, {
      onSuccess: () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success(t("copySuccess"));
      },
      onError: () => toast.error(t("copyFailed")),
    });
  };

  // 2. 保存功能
  const handleSave = async (e: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (isSavingRef.current) return;
    if (!user?.userId) return toast.error(t("userNotAuthenticated"));

    const str = content
      ? getContentString(content, thinkContent, showThinking, t)
      : "";
    if (!str) return toast.error(t("contentIsEmpty"));

    isSavingRef.current = true;
    setIsSaving(true);
    let title: string | undefined;

    // 尝试生成标题
    try {
      title =
        (await Promise.race([
          (dispatch as any)(
            (runLlm as any)({
              llmConfig: BUILTIN_TITLE_LLM_CONFIG,
              content: str.substring(0, 8000),
            }),
          ).unwrap(),
          new Promise<undefined>((resolve) =>
            setTimeout(() => resolve(undefined), SAVE_TITLE_TIMEOUT_MS),
          ),
        ])) || undefined;
    } catch {
      // 忽略标题生成失败，交给 createDoc 使用默认标题
    }

    // 写入数据库
    try {
      const savedKey = await createDocState(
        {
          title,
          content: str,
          ...(currentSpaceId ? { spaceId: currentSpaceId } : {}),
        },
        { dispatch, getState: store.getState },
      );

      toast.success(
        <div>
          {t("saveSuccess")}
          {savedKey && (
            <Link
              to={`/${savedKey}`}
              target="_blank"
              style={{ marginLeft: "8px", color: "var(--primary)" }}
            >
              {t("clickHere")}
            </Link>
          )}
        </div>,
      );
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // 4. 编辑功能：回填输入框，发送时从这条用户消息继续并丢弃后续消息
  const handleEdit = (e: React.MouseEvent) => {
    e?.stopPropagation?.();
    const seed = getPlainText(content);
    if (!seed) {
      toast.error(t("editEmptyContent", "消息没有可编辑的文本"));
      return;
    }
    publishChatInputSeed({
      text: seed,
      mode: "replace",
      focus: true,
      editMessageId: message?.id,
      originalContent: content,
    });
    toast.success(t("editSeeded", "已进入编辑模式"), { duration: 2000 });
  };

  const { openConfirm: handleDeleteClick, modal: deleteConfirmModal } =
    useMessageDelete({ dbKey, confirmMessageKey: "delConfirmMessage", t });

  const handleBranch = React.useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation?.();
      if (isBranchingRef.current) return;
      if (!currentDialogKey) {
        toast.error(t("branchFailed", "当前对话不可分叉"));
        return;
      }

      isBranchingRef.current = true;
      setIsBranching(true);
      try {
        const result = await dispatch(
          compactDialogAndForkAction({ dialogKey: currentDialogKey }),
        ).unwrap();

        navigate(buildDialogUrl(result.dbKey, result.spaceId), {
          state: { isNew: true },
        });
        toast.success(t("branchCreated", "已创建分支对话"));
      } catch (error) {
        console.error("[MessageActions] branch failed:", error);
        toast.error(t("branchFailed", "创建分支失败"));
      } finally {
        isBranchingRef.current = false;
        setIsBranching(false);
      }
    },
    [currentDialogKey, dispatch, navigate, t],
  );

  type ActionItem = {
    key: string;
    icon: React.ComponentType<{ size?: number }>;
    handler: (e?: React.MouseEvent) => unknown;
    label: string;
    active?: boolean;
    disabled?: boolean;
    busy?: boolean;
  };

  const actions: ActionItem[] = (
    [
      {
        key: "copy",
        icon: copied ? LuCheck : LuCopy,
        handler: handleCopy,
        label: t("copyContent"),
        active: copied,
      },
      !isSelf && !isStreaming
        ? {
            key: "save",
            icon: LuBookmark,
            handler: handleSave,
            label: isSaving ? t("savingContent", "保存中…") : t("saveContent"),
            disabled: isSaving,
            busy: isSaving,
            active: isSaving,
          }
        : null,
      canBranch && isRobot && !isStreaming
        ? {
            key: "branch",
            icon: LuGitBranch,
            handler: handleBranch,
            label: isBranching
              ? t("branchingMessage", "分叉中…")
              : t("branchMessage", "Branch"),
            disabled: isBranching,
            busy: isBranching,
            active: isBranching,
          }
        : null,
      isSelf
        ? {
            key: "edit",
            icon: LuPencilLine,
            handler: handleEdit,
            label: t("editMessage", "编辑消息"),
          }
        : null,
      !isStreaming && dbKey
        ? {
            key: "delete",
            icon: LuTrash2,
            handler: handleDeleteClick,
            label: t("deleteMessage", "删除消息"),
          }
        : null,
    ] as Array<ActionItem | null | false>
  ).filter((a): a is ActionItem => Boolean(a));

  if (!isTouch) {
    if (actions.length === 0) return null;
    return (
      <>
        <div
          data-hook={["messages-esc-actions-desktop", showActions ? "messages-esc-show" : ""].filter(Boolean).join(" ")}
          {...withLiteralClass(`actions desktop ${showActions ? "show" : ""}`, styles.actionsDesktop)}
          data-message-actions="desktop"
        >
          {actions.map(
            ({ key, icon: Icon, handler, label, active, disabled, busy }) => (
              <Tooltip key={key} content={label} placement="top">
                <button
                  type="button"
                  data-hook="messages-esc-action-btn"
                  {...withLiteralClass(
                    `action-btn ${active ? "active" : ""} ${busy ? "busy" : ""}`,
                    styles.actionBtn,
                    active && styles.actionBtnActive,
                    disabled && styles.actionBtnDisabled,
                    busy && styles.actionBtnBusy
                  )}
                  onClick={handler}
                  aria-label={label}
                  aria-busy={busy || undefined}
                  disabled={disabled || undefined}
                >
                  {busy ? (
                    <span
                      data-hook="messages-esc-action-spinner"
                      {...withLiteralClass("action-spinner", styles.actionSpinner)}
                      aria-hidden="true"
                    />
                  ) : (
                    <Icon size={14} />
                  )}
                </button>
              </Tooltip>
            ),
          )}
        </div>
        {deleteConfirmModal}
      </>
    );
  }

  if (!showActions) return null;
  return (
    <>
      <div
        data-hook="messages-esc-actions-overlay-mobile"
        {...withLiteralClass("actions-overlay mobile", styles.actionsOverlayMobile)}
        data-message-actions="mobile"
      >
        <button
          type="button"
          data-hook="messages-esc-overlay-backdrop"
          {...withLiteralClass("overlay-backdrop", styles.overlayBackdrop)}
          aria-label={t("closeActions", "关闭操作")}
          onClick={(e) => {
            e.stopPropagation();
            onDismissActions?.();
          }}
          style={{
            margin: 0,
            padding: 0,
            border: "none",
            cursor: "pointer",
            font: "inherit",
          }}
        />
        <dialog
          data-hook="messages-esc-actions-panel"
          {...withLiteralClass("actions-panel", styles.actionsPanel)}
          open
          aria-label={t("messageActions", "消息操作")}
        >
          <div {...stylex.props(styles.panelHeader)}>
            <div {...stylex.props(styles.panelIndicator)} />
          </div>
          <div {...stylex.props(styles.actionsGrid)}>
            {actions.map(
              ({ key, icon: Icon, handler, label, active, disabled, busy }) => (
                <button
                  type="button"
                  key={key}
                  {...withLiteralClass(
                    `action-item ${active ? "active" : ""} ${busy ? "busy" : ""}`,
                    styles.actionItem,
                    active && styles.actionItemActive,
                    disabled && styles.actionBtnDisabled,
                    busy && styles.actionBtnBusy
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (disabled) return;
                    handler(e);
                  }}
                  aria-label={label}
                  aria-busy={busy || undefined}
                  disabled={disabled || undefined}
                >
                  <div
                    {...stylex.props(
                      styles.actionIcon,
                      active && styles.actionIconActive
                    )}
                  >
                    {busy ? (
                      <span
                        data-hook="messages-esc-action-spinner"
                        {...withLiteralClass("action-spinner", styles.actionSpinner, styles.actionSpinnerLarge)}
                        aria-hidden="true"
                      />
                    ) : (
                      <Icon size={20} />
                    )}
                  </div>
                  <span {...stylex.props(styles.actionLabel)}>{label}</span>
                </button>
              ),
            )}
          </div>
        </dialog>
      </div>
      {deleteConfirmModal}
    </>
  );
};

import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
