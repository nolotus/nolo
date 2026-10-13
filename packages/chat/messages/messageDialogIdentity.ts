import { DataType } from "create/types";

/**
 * Message keys are `dialog-{dialogId}-msg-{messageId}` (see
 * `database/dialogKey.dialogMessageKey`). Dialog IDs may contain dashes —
 * including the literal `-msg-` — so identity cannot be read from a fixed
 * split index; the *last* `-msg-` is the separator.
 *
 * That parse is only valid while message IDs stay free of `-msg-`. Message IDs
 * are NOT always ULIDs: the agent runtime writes `${timestamp}-${index}`
 * (agent-runtime/dialogWritePlan) and tool rows use `${messageId}-tNNN`
 * (ai/chat/sendOpenAI*Request). Those shapes are dash-bearing but `-msg-`-free,
 * which is the invariant this parser depends on. Producers must pass `dialogId`
 * explicitly; reverse-parsing a `dbKey` is only a compatibility fallback and
 * cannot guarantee a correct identity once the message id is ambiguous — see
 * "cannot disambiguate message ids that contain '-msg-'" in the tests.
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
