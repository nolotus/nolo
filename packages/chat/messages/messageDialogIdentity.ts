import { DataType } from "create/types";

/**
 * Message keys are `dialog-{dialogId}-msg-{messageId}`. Dialog IDs may
 * contain dashes, so their identity cannot be read from a fixed split index.
 * Message IDs are generated as ULIDs and do not contain "-msg-".
 */
export function inferMessageDialogIdFromDbKey(dbKey?: string): string | null {
  const prefix = `${DataType.DIALOG}-`;
  if (!dbKey?.startsWith(prefix)) return null;
  const marker = "-msg-";
  const separatorAt = dbKey.lastIndexOf(marker);
  if (separatorAt <= prefix.length || separatorAt + marker.length >= dbKey.length) {
    return null;
  }
  return dbKey.slice(prefix.length, separatorAt);
}
