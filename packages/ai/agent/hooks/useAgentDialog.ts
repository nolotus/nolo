// ai/agent/hooks/useAgentDialog.ts
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"
import { useNavigate } from "app/routing";
import { useAppDispatch } from "app/store";

interface UseAgentDialogOptions {
  spaceId?: string | null;
  preferredServerOrigin?: string | null;
}

export function useAgentDialog(
  agentKey: string,
  options: UseAgentDialogOptions = {}
) {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { spaceId, preferredServerOrigin } = options;

  // initialPrompt: 预填到新对话输入框的问题（示例提问一键开聊）。
  // 调用方必须显式传入字符串；不传表示普通开聊。不要直接当作
  // onClick 回调透传，否则事件对象会被当字符串误判。
  const startDialog = useCallback(async (initialPrompt?: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const [{ createDialog }, { buildDialogUrl }] = await Promise.all([
        import("chat/dialog/dialogSlice"),
        import("chat/dialog/dialogUrl"),
      ]);
      const result = await dispatch(
        createDialog({
          cybots: [agentKey],
          ...(spaceId ? { spaceId } : {}),
          ...(preferredServerOrigin ? { preferredServerOrigin } : {}),
        }) as any
      ).unwrap();
      if (initialPrompt && initialPrompt.trim()) {
        const { publishChatInputSeed } = await import(
          "chat/hooks/useChatInputSeed"
        );
        publishChatInputSeed({
          text: initialPrompt.trim(),
          mode: "replace",
          focus: true,
        });
      }
      navigate(buildDialogUrl(result.dbKey, result.spaceId), {
        state: { isNew: true },
      });
    } catch (err: any) {
      const msg = err?.message
        ? `${t("createDialogError")}: ${err.message}`
        : t("createDialogError");
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [agentKey, dispatch, isLoading, navigate, preferredServerOrigin, spaceId, t]);

  return { isStarting: isLoading, startDialog };
}
