import { DataType } from "create/types";
import { write } from "database/dbSlice";
import { addUserMessage } from "chat/messages/messageSlice";
import type { Message } from "chat/messages/types";

/**
 * `Message` has no `dialogId` field, but callers may pass one explicitly: the
 * local Redux write resolves identity from `dialogId` first, and only falls back
 * to reverse-parsing `dbKey` otherwise — that parse is ambiguous once a message
 * id itself contains "-msg-".
 */
export async function persistMessageWithFixedId(
  dispatch: any,
  message: Message & { dialogId?: string }
): Promise<void> {
  dispatch(addUserMessage(message));

  const { controller, ...messageToWrite } = message;

  try {
    const writeRequest = dispatch(
      write({
        data: {
          ...messageToWrite,
          type: DataType.MSG,
        },
        customKey: message.dbKey,
      })
    );

    if (writeRequest && typeof writeRequest.unwrap === "function") {
      await writeRequest.unwrap();
      return;
    }

    await writeRequest;
  } catch (error) {
    console.error(
      "[persistMessageWithFixedId] Failed to persist fixed-id message:",
      error
    );
  }
}
