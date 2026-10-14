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
 * Trusted-only input keys stripped for EVERY tool: `confirmationToken` is the one-time
 * "owner approved this run" credential, and `expectedExecutionRevision` is the execution
 * generation it is exchanged for. Both are injected only by the trusted UI confirmation
 * path (executeToolRun's inputOverride), so any model-supplied value must be removed.
 * Keep them in one filter so the ordering never matters; new tools are protected by default.
 */
const TRUSTED_ONLY_MODEL_INPUT_KEYS = new Set(["confirmationToken", "expectedExecutionRevision"]);

/**
 * Model-entry sanitizer: trusted-only keys (see above) for every tool, plus `dialogId` for
 * tools that bind dialogs from trusted context only. Apply to the model's first-time input;
 * UI-side inputOverride (executeToolRun) is applied later and is not affected.
 */
export function stripModelToolArgs<T>(canonicalToolName: string, value: T): T {
  const base = stripModelConfirmationFlags(value);
  if (!base || typeof base !== "object" || Array.isArray(base)) return base;

  // `confirmationToken`/`expectedExecutionRevision` 只能由受信任的 UI 确认路径
  // （executeToolRun 的 inputOverride）注入：模型给出的任何取值都必须剥掉，因此对
  // 所有工具生效而不只限于下面的集合（新增工具自动受保护，不会漏加）。
  const withoutTrustedOnlyKeys = Object.fromEntries(
    Object.entries(base as Record<string, unknown>).filter(
      ([key]) => !TRUSTED_ONLY_MODEL_INPUT_KEYS.has(key)
    )
  ) as T;

  if (!MODEL_DIALOG_BINDING_STRIPPED_TOOLS.has(canonicalToolName)) {
    return withoutTrustedOnlyKeys;
  }
  if (
    !withoutTrustedOnlyKeys ||
    typeof withoutTrustedOnlyKeys !== "object" ||
    Array.isArray(withoutTrustedOnlyKeys)
  ) {
    return withoutTrustedOnlyKeys;
  }

  return Object.fromEntries(
    Object.entries(withoutTrustedOnlyKeys as Record<string, unknown>).filter(
      ([key]) => key !== "dialogId" && key !== "autoApproveCredits"
    )
  ) as T;
}
