import { describe, expect, it } from "bun:test";
import { assemblePersistedUserMessage } from "./messageUserPersistAssemble";
import type { Message } from "./types";

const baseInput = (overrides: Partial<Parameters<typeof assemblePersistedUserMessage>[0]> = {}) => ({
  message: { role: "user", content: "hello" } as Omit<Message, "id" | "dbKey" | "userId">,
  dialogId: "dialog-abc",
  dialogKey: "dialog-user-1-dialog-abc",
  currentAccountUserId: "user-1",
  dialogConfigUserId: null,
  ...overrides,
});

describe("assemblePersistedUserMessage", () => {
  it("writes a non-empty userId resolved from the dialog config", () => {
    const { fullMessage } = assemblePersistedUserMessage(
      baseInput({ dialogConfigUserId: "user-42" })
    );
    expect(fullMessage.userId).toBe("user-42");
    expect(typeof fullMessage.userId).toBe("string");
    expect(fullMessage.userId?.length).toBeGreaterThan(0);
  });

  it("falls back to the current account userId when dialogConfigUserId is null", () => {
    const { fullMessage } = assemblePersistedUserMessage(
      baseInput({ dialogConfigUserId: null, currentAccountUserId: "user-1" })
    );
    expect(fullMessage.userId).toBe("user-1");
  });

  it("derives a non-empty id and dbKey from the dialogId", () => {
    const { fullMessage, dialogId, dialogKey } = assemblePersistedUserMessage(
      baseInput()
    );
    expect(typeof fullMessage.id).toBe("string");
    expect(fullMessage.id.length).toBeGreaterThan(0);
    expect(typeof fullMessage.dbKey).toBe("string");
    expect(fullMessage.dbKey.length).toBeGreaterThan(0);
    // dbKey is scoped under the dialogId
    expect(fullMessage.dbKey).toContain(dialogId);
    // echoed back
    expect(dialogId).toBe("dialog-abc");
    expect(dialogKey).toBe("dialog-user-1-dialog-abc");
  });

  it("preserves the caller's message role and content verbatim", () => {
    const message = {
      role: "user",
      content: [{ type: "text", text: "hi there" }],
    } as Omit<Message, "id" | "dbKey" | "userId">;

    const { fullMessage } = assemblePersistedUserMessage(
      baseInput({ message })
    );

    expect(fullMessage.role).toBe("user");
    expect(fullMessage.content).toEqual([{ type: "text", text: "hi there" }]);
  });

  it("does not mutate the caller's message object", () => {
    const message = {
      role: "user",
      content: "original",
    } as Omit<Message, "id" | "dbKey" | "userId">;
    const snapshot = { ...message };

    assemblePersistedUserMessage(baseInput({ message }));

    expect(message).toEqual(snapshot);
    expect((message as any).id).toBeUndefined();
    expect((message as any).dbKey).toBeUndefined();
    expect((message as any).userId).toBeUndefined();
  });
});