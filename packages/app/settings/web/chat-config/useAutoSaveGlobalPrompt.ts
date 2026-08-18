import { useEffect, useRef, useState } from "react";
import { toast } from "app/utils/toast"
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectGlobalPrompt, setGlobalPrompt } from "app/settings/settingSlice";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export const useAutoSaveGlobalPrompt = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const globalPrompt = useAppSelector(selectGlobalPrompt);

  const [draftPrompt, setDraftPrompt] = useState(globalPrompt);
  const [status, setStatus] = useState<SaveStatus>("idle");
  // 防止自己触发的 store 更新回写正在编辑的草稿
  const isSavingOwnUpdate = useRef(false);

  useEffect(() => {
    // 若是自己发起的保存，跳过同步，避免覆盖用户正在输入的内容
    if (isSavingOwnUpdate.current) {
      isSavingOwnUpdate.current = false;
      return;
    }
    setDraftPrompt(globalPrompt);
  }, [globalPrompt]);

  useEffect(() => {
    if (draftPrompt === globalPrompt) return;

    setStatus("idle");

    const timer = setTimeout(() => {
      setStatus("saving");
      isSavingOwnUpdate.current = true;
      dispatch(setGlobalPrompt(draftPrompt))
        .unwrap()
        .then(() => {
          setStatus("saved");
          toast.success(t("chat.globalPrompt.autoSave.toastSuccess", "通用提示词已自动保存"));
        })
        .catch((err: any) => {
          console.error("Failed to save global prompt", err);
          isSavingOwnUpdate.current = false;
          setStatus("error");
          toast.error(t("chat.globalPrompt.autoSave.toastError", "保存失败，请稍后重试"));
        });
    }, 800);

    return () => clearTimeout(timer);
  }, [draftPrompt, globalPrompt, dispatch, t]);

  return {
    draftPrompt,
    setDraftPrompt,
    status,
  };
};
