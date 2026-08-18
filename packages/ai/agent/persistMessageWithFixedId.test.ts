import { describe, expect, it, mock } from "bun:test";
import { DataType } from "create/types";
import type { Message } from "chat/messages/types";

const addUserMessageMock = mock((message: Message) => ({
  type: "message/addUserMessage",
  payload: message,
}));
const writeMock = mock((payload: any) => ({
  type: "db/write",
  payload,
}));

let moduleVersion = 0;

async function loadPersistMessageWithFixedId() {
  const realMessageSlice = await import("chat/messages/messageSlice");
  const realDbSlice = await import("database/dbSlice");
  mock.module("chat/messages/messageSlice", () => ({
    ...realMessageSlice,
    addUserMessage: addUserMessageMock,
  }));

  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    write: writeMock,
  }));

  const mod = await import(`./persistMessageWithFixedId`);
  mock.restore();
  return mod;
}

describe("persistMessageWithFixedId", () => {
  it("upserts the visible message and awaits persistence without controller data", async () => {
    const { persistMessageWithFixedId } = await loadPersistMessageWithFixedId();
    addUserMessageMock.mockClear();
    writeMock.mockClear();

    let unwrapCalled = false;
    const dispatch = mock((action: any) => {
      if (action?.type === "message/addUserMessage") {
        return action;
      }

      if (action?.type === "db/write") {
        return {
          unwrap: async () => {
            unwrapCalled = true;
            return undefined;
          },
        };
      }

      return action;
    });

    const message: Message = {
      id: "msg-1",
      dbKey: "dialog-demo-msg-msg-1",
      role: "assistant",
      content: "partial output",
      cybotKey: "agent-demo",
      userId: "user-a",
      controller: new AbortController(),
    };

    await persistMessageWithFixedId(dispatch, message);

    expect(addUserMessageMock).toHaveBeenCalledTimes(1);
    expect(addUserMessageMock).toHaveBeenCalledWith(message);
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(writeMock).toHaveBeenCalledWith({
      data: {
        id: "msg-1",
        dbKey: "dialog-demo-msg-msg-1",
        role: "assistant",
        content: "partial output",
        cybotKey: "agent-demo",
        userId: "user-a",
        type: DataType.MSG,
      },
      customKey: "dialog-demo-msg-msg-1",
    });
    expect(unwrapCalled).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});
