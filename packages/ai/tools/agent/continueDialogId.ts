/** Omission starts a fresh dialog; an explicit invalid value must never do so. */
export function normalizeContinueDialogId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("startAgentRun: continueDialogId 必须是非空 dialogId");
  }
  return value.trim();
}
