/** Explicit conversation ownership shared by discovery and restart guards.
 * No current dialog means no ownership, never permission to scan all dialogs.
 */
export function runBelongsToDialog(
  record: { parentDialogId?: string; dialogId?: string },
  dialogId: string | null | undefined,
): boolean {
  return !!dialogId && (record.parentDialogId === dialogId || record.dialogId === dialogId);
}
