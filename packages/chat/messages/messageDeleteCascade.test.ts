import { describe, expect, test } from "bun:test";

import { planDeleteMessageCascade } from "./messageDeleteCascade";
import type { Message } from "./types";

describe("planDeleteMessageCascade", () => {
  test("only returns the tool message id when parent is not a stub", () => {
    const tool = {
      id: "tool-1",
      role: "tool",
      dbKey: "db-tool-1",
      parentMessageId: "asst-1",
      content: "result",
    } as Message;
    const parent = {
      id: "asst-1",
      role: "assistant",
      content: "final answer",
      tool_calls: [{ id: "c1" }],
    } as Message;

    expect(
      planDeleteMessageCascade(tool, {
        "tool-1": tool,
        "asst-1": parent,
      })
    ).toEqual({ id: "tool-1" });
  });

  test("cascades orphan assistant tool stub when deleting the only tool child", () => {
    const tool = {
      id: "tool-1",
      role: "tool",
      dbKey: "db-tool-1",
      parentMessageId: "asst-1",
      content: "result",
    } as Message;
    const stub = {
      id: "asst-1",
      role: "assistant",
      content: "",
      dbKey: "db-asst-1",
      tool_calls: [{ id: "c1" }],
    } as Message;

    expect(
      planDeleteMessageCascade(tool, {
        "tool-1": tool,
        "asst-1": stub,
      })
    ).toEqual({
      id: "tool-1",
      extraRemoveId: "asst-1",
      extraRemoveDbKey: "db-asst-1",
    });
  });

  test("keeps stub when another tool sibling remains", () => {
    const toolA = {
      id: "tool-a",
      role: "tool",
      dbKey: "db-a",
      parentMessageId: "asst-1",
      content: "a",
    } as Message;
    const toolB = {
      id: "tool-b",
      role: "tool",
      dbKey: "db-b",
      parentMessageId: "asst-1",
      content: "b",
    } as Message;
    const stub = {
      id: "asst-1",
      role: "assistant",
      content: "",
      dbKey: "db-asst-1",
      tool_calls: [{ id: "c1" }, { id: "c2" }],
    } as Message;

    expect(
      planDeleteMessageCascade(toolA, {
        "tool-a": toolA,
        "tool-b": toolB,
        "asst-1": stub,
      })
    ).toEqual({ id: "tool-a" });
  });

  test("user message delete has no cascade", () => {
    const user = {
      id: "u1",
      role: "user",
      dbKey: "db-u1",
      content: "hi",
    } as Message;
    expect(planDeleteMessageCascade(user, { u1: user })).toEqual({ id: "u1" });
  });
});
