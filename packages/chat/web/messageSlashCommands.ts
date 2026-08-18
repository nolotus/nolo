export const FRESH_DIALOG_SLASH_COMMAND = "/new";
export const COMPACT_DIALOG_SLASH_COMMAND = "/compact";

export function isFreshDialogSlashCommand(input: string): boolean {
  return input.trim() === FRESH_DIALOG_SLASH_COMMAND;
}

export function isCompactDialogSlashCommand(input: string): boolean {
  return input.trim() === COMPACT_DIALOG_SLASH_COMMAND;
}
