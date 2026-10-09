/** Remove internal confirmation flags from untrusted model-supplied tool input. */
export function stripModelConfirmationFlags<T>(value: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([key]) => !key.startsWith("__confirmed")
    )
  ) as T;
}
