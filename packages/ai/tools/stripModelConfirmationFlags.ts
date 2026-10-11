/**
 * Confirmation code to trusted input-key mapping.
 * All confirmation keys must use the __confirmed prefix or model-entry stripping will not remove them.
 */
export const CONFIRMATION_INPUT_KEYS: Record<string, string> = {
  self_evolution_requires_confirmation: "__confirmedSelfEvolution",
  agent_update_requires_confirmation: "__confirmedSelfEvolution",
  media_job_start_requires_confirmation: "__confirmedMediaJobStart",
};

/** Remove internal confirmation flags from untrusted model-supplied tool input. */
export function stripModelConfirmationFlags<T>(value: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([key]) => !key.startsWith("__confirmed")
    )
  ) as T;
}

/**
 * Canonical tools whose `dialogId` is NOT a model-schema field: the binding is only
 * injected from trusted context (e.g. the confirm card's inputOverride), so model args
 * must not carry it. Other tools (e.g. searchDialogMessagesTool) take a model-supplied
 * dialogId legitimately and are untouched.
 */
const MODEL_DIALOG_BINDING_STRIPPED_TOOLS = new Set([
  "mediaJobTool",
  "transcribe",
  "translate",
  "exportDocument",
  "readArtifact",
]);

/**
 * Model-entry sanitizer: confirmation flags for every tool, plus `dialogId` for tools
 * that bind dialogs from trusted context only. Apply to the model's first-time input;
 * UI-side inputOverride (executeToolRun) is applied later and is not affected.
 */
export function stripModelToolArgs<T>(canonicalToolName: string, value: T): T {
  const base = stripModelConfirmationFlags(value);
  if (!MODEL_DIALOG_BINDING_STRIPPED_TOOLS.has(canonicalToolName)) return base;
  if (!base || typeof base !== "object" || Array.isArray(base)) return base;

  return Object.fromEntries(
    Object.entries(base as Record<string, unknown>).filter(([key]) => key !== "dialogId" && key !== "confirmationToken" && key !== "autoApproveCredits")
  ) as T;
}
