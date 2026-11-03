// chat/dialog/useCreateDialog.ts

import { useAppDispatch } from "app/store";
import { useState } from "react";
import { useNavigate } from "app/routing";
import { markRecentlyCreated } from "chat/web/sidebar/recentlyCreatedStore";
import type { DialogRuntimeBinding } from "app/types";
import { createDialog } from "./dialogSlice";
import { buildDialogUrl } from "./dialogUrl";

export interface CreateDialogCreatedPayload {
  dbKey: string;
  spaceId?: string | null;
}

export interface UseCreateDialogOptions {
  onCreated?: (dialog: CreateDialogCreatedPayload) => void | Promise<void>;
}

export interface CreateDialogParams {
  agents?: string[];
  agentMode?: "auto" | "fixed";
  spaceId?: string;
  preferredServerOrigin?: string | null;
  category?: string;
  runtimeBinding?: DialogRuntimeBinding;
  onCreated?: (dialog: CreateDialogCreatedPayload) => void | Promise<void>;
}

interface UseCreateDialogResult {
  createNewDialog: (params: CreateDialogParams) => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
}

export const useCreateDialog = (options?: UseCreateDialogOptions): UseCreateDialogResult => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const createNewDialog = async ({
    agents = [],
    agentMode,
    spaceId,
    preferredServerOrigin,
    category,
    runtimeBinding,
    onCreated,
  }: CreateDialogParams) => {
    setIsLoading(true);
    setIsSuccess(false);

    const resolvedAgentMode =
      agentMode ?? (agents.length > 0 ? "fixed" : "auto");

    try {
      const result = await dispatch(
        createDialog({
          agentMode: resolvedAgentMode,
          cybots: resolvedAgentMode === "auto" ? [] : agents,
          spaceId,
          preferredServerOrigin,
          category,
          runtimeBinding,
        })
      ).unwrap();

      if (!result?.dbKey || typeof result.dbKey !== "string" || !result.dbKey.trim()) {
        throw new Error("Dialog creation failed: invalid or missing dbKey");
      }

      markRecentlyCreated(result.dbKey);

      const createdPayload: CreateDialogCreatedPayload = {
        dbKey: result.dbKey,
        spaceId: result.spaceId ?? null,
      };
      await onCreated?.(createdPayload);
      await options?.onCreated?.(createdPayload);
      navigate(buildDialogUrl(result.dbKey, result.spaceId), {
        state: { isNew: true },
      });
      setIsSuccess(true);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { createNewDialog, isLoading, isSuccess };
};
