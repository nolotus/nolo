// chat/dialog/useCreateDialog.ts

import { useAppDispatch } from "app/store";
import { useState } from "react";
import { useNavigate } from "app/routing";
import { markRecentlyCreated } from "chat/web/sidebar/recentlyCreatedStore";
import { createDialog } from "./dialogSlice";
import { buildDialogUrl } from "./dialogUrl";

export interface CreateDialogParams {
  agents?: string[];
  agentMode?: "auto" | "fixed";
  spaceId?: string;
  preferredServerOrigin?: string | null;
  category?: string;
}

interface UseCreateDialogResult {
  createNewDialog: (params: CreateDialogParams) => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
}

export const useCreateDialog = (): UseCreateDialogResult => {
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
        })
      ).unwrap();
      if (result?.dbKey) {
        markRecentlyCreated(result.dbKey);
      }
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
