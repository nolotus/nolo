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
