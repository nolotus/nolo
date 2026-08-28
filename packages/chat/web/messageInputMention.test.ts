import { describe, expect, it } from "bun:test";

import {
  buildAgentMentionInsertion,
  createInactiveMentionState,
  moveMentionHighlightIndex,
  resolveAgentMentionState,
} from "./messageInputMention";

describe("messageInputMention", () => {
  it("detects an active agent mention near the cursor", () => {
    expect(resolveAgentMentionState("hello @wri", 10)).toEqual({
      active: true,
      kind: "agent",
      query: "wri",
      startIndex: 6,
    });
  });

  it("ignores email-like at-signs and whitespace-broken mentions", () => {
    expect(resolveAgentMentionState("a@b.com", 7)).toEqual(
      createInactiveMentionState()
    );
    expect(resolveAgentMentionState("hello @wr ite", 13)).toEqual(
      createInactiveMentionState()
    );
  });

  it("builds the next text and clears mention state after insertion", () => {
    expect(
      buildAgentMentionInsertion({
        currentValue: "hello @wr there",
        cursorPos: 9,
        mentionState: {
          active: true,
          kind: "agent",
          query: "wr",
          startIndex: 6,
        },
        agent: {
          agentKey: "agent-1",
          name: "Writer",
        },
      })
    ).toEqual({
      nextText: "hello @Writer  there",
      nextMentionState: createInactiveMentionState(),
      nextMentionHighlightIndex: 0,
      targetAgentKey: "agent-1",
    });
  });

  it("moves the mention highlight index within bounds", () => {
    expect(
      moveMentionHighlightIndex({
        previousIndex: 0,
        optionCount: 3,
        direction: "next",
      })
    ).toBe(1);
    expect(
      moveMentionHighlightIndex({
        previousIndex: 0,
        optionCount: 3,
        direction: "prev",
      })
    ).toBe(0);
    expect(
      moveMentionHighlightIndex({
        previousIndex: 2,
        optionCount: 3,
        direction: "next",
      })
    ).toBe(2);
  });
});
