import type { AgentRuntimeOptions } from "ai/agent/types";

// Compatibility exports for historical dialogs; no questionnaire or writes.
export type PersonalizationDialogSource = "signup" | "home";
export const PERSONALIZATION_DIALOG_CATEGORY = "user-overlay-profile";
export const PERSONALIZATION_DIALOG_EXTRA_TOOLS = [] as const;
export const buildPersonalizationDialogTitle = (
  language?: string | null, _source?: PersonalizationDialogSource,
): string => language?.startsWith("zh") ? "偏好" : "Preferences";
export const buildPersonalizationStarterPrompt = (
  _language?: string | null, _source?: PersonalizationDialogSource,
): string => "";
export const buildPersonalizationRuntimeOptions = (
  options: AgentRuntimeOptions = {},
): AgentRuntimeOptions => ({ ...options });
export const buildPersonalizationDialogPolicyContext = (): string => "";
export interface StartPersonalizationDialogParams {
  dispatch: any;
  navigate: (to: string, options?: { state?: Record<string, unknown> }) => void;
  language?: string | null;
  source?: PersonalizationDialogSource;
}
export const startPersonalizationDialog = async (
  _params: StartPersonalizationDialogParams,
): Promise<string> => {
  throw new Error("Dedicated personalization questionnaires are retired; use ordinary conversation or globalPrompt settings.");
};
