import { describe, expect, it } from "bun:test";
import {
  planEditUserMessageAndReplay,
  type EditReplayPlan,
} from "./messageEditReplayPlan";
import type { Message } from "./types";

function makeMessage(
  partial: Partial<Message> & Pick<Message, "id" | "role">
): Message {
  return {
    content: "",
    dbKey: `db:${partial.id}`,
    ...partial,
  } as Message;
}

describe("planEditUserMessageAndReplay", () => {
  it("returns target_not_found when the message id is absent", () => {
    const messages: Message[] = [
      makeMessage({ id: "u1", role: "user", content: "hi" }),
    ];
    const plan = planEditUserMessageAndReplay({
      messages,
      messageId: "missing",
      nextText: "bye",
    }) as Extract<EditReplayPlan, { ok: false }>;

    expect(plan.ok).toBe(false);
    expect(plan.error).toBe("target_not_found");
    expect(plan.message).toBe(
      "editUserMessageAndReplay: target message not found."
    );
  });

  it("returns not_user_message when the target is an assistant message", () => {
    const messages: Message[] = [
      makeMessage({ id: "u1", role: "user", content: "hi" }),
      makeMessage({ id: "a1", role: "assistant", content: "hello" }),
    ];
    const plan = planEditUserMessageAndReplay({
      messages,
      messageId: "a1",
      nextText: "edited",
    }) as Extract<EditReplayPlan, { ok: false }>;

    expect(plan.ok).toBe(false);
    expect(plan.error).toBe("not_user_message");
    expect(plan.message).toBe("只能编辑用户消息。");
  });

  it("blocks replay while any message is still streaming", () => {
    const messages: Message[] = [
      makeMessage({ id: "u1", role: "user", content: "hi" }),
      makeMessage({
        id: "a1",
        role: "assistant",
        content: "hello",
        isStreaming: true,
      }),
    ];
    const plan = planEditUserMessageAndReplay({
      messages,
      messageId: "u1",
      nextText: "edited",
    }) as Extract<EditReplayPlan, { ok: false }>;

    expect(plan.ok).toBe(false);
    expect(plan.error).toBe("streaming_in_progress");
    expect(plan.message).toBe("请等待当前回复完成后再编辑历史消息。");
  });

  it("happy path: builds nextContent from original and reports trailing ids", () => {
    const messages: Message[] = [
      makeMessage({ id: "u1", role: "user", content: "hi" }),
      makeMessage({ id: "a1", role: "assistant", content: "hello" }),
      makeMessage({ id: "t1", role: "tool", content: "result" }),
    ];
    const plan = planEditUserMessageAndReplay({
      messages,
      messageId: "u1",
      originalContent: "hi",
      nextText: "edited",
    }) as Extract<EditReplayPlan, { ok: true }>;

    expect(plan.ok).toBe(true);
    expect(plan.targetMessage.id).toBe("u1");
    expect(plan.nextContent).toBe("edited");
    expect(plan.trailingMessages.map((m) => m.id)).toEqual(["a1", "t1"]);
  });

  it("happy path: falls back to target.content when originalContent is omitted", () => {
    const messages: Message[] = [
      makeMessage({ id: "u1", role: "user", content: "fallback" }),
    ];
    const plan = planEditUserMessageAndReplay({
      messages,
      messageId: "u1",
      nextText: "new text",
    }) as Extract<EditReplayPlan, { ok: true }>;

    expect(plan.ok).toBe(true);
    expect(plan.nextContent).toBe("new text");
    expect(plan.trailingMessages).toEqual([]);
  });

  it("happy path: array content keeps non-text parts and prepends new text", () => {
    const original: Message["content"] = [
      { type: "text", text: "before" } as any,
      { type: "image_url", image_url: { url: "https://example.com/a.png" } } as any,
    ];
    const messages: Message[] = [
      makeMessage({ id: "u1", role: "user", content: original }),
    ];
    const plan = planEditUserMessageAndReplay({
      messages,
      messageId: "u1",
      nextText: "after",
    }) as Extract<EditReplayPlan, { ok: true }>;

    expect(plan.ok).toBe(true);
    expect(plan.nextContent).toEqual([
      { type: "text", text: "after" },
      { type: "image_url", image_url: { url: "https://example.com/a.png" } },
    ]);
  });
});