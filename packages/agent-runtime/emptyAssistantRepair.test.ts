import { describe, expect, it } from "bun:test";
import {
  EMPTY_ASSISTANT_FALLBACK_MESSAGE,
  EMPTY_ASSISTANT_REPAIR_PROMPT,
  LENGTH_TRUNCATED_FALLBACK_MESSAGE,
  LENGTH_TRUNCATED_REASONING_MARKER,
  MAX_REASONING_ONLY_REPAIRS,
  MAX_TRUNCATED_REASONING_CHARS,
  STREAM_TRUNCATED_FALLBACK_MESSAGE,
  formatLengthTruncatedReasoningTail,
  hasAssistantVisibleOutput,
  resolveEmptyAssistantFallbackMessage,
  resolveEmptyAssistantOutcome,
} from "./emptyAssistantRepair";

describe("emptyAssistantRepair standalone boundary", () => {
  it("resolves empty assistant outcome states accurately without pulling node modules", () => {
    // Visible output short-circuits
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: false,
        hasVisibleOutput: true,
        repairUsed: false,
      }),
    ).toEqual({ kind: "ok" });

    // Tool calls short-circuit
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: true,
        hasVisibleOutput: false,
        repairUsed: false,
      }),
    ).toEqual({ kind: "ok" });

    // Unused repair triggers repair
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: false,
        hasVisibleOutput: false,
        repairUsed: false,
      }),
    ).toEqual({ kind: "repair" });

    // Length finish_reason yields length_truncated fallback
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: false,
        hasVisibleOutput: false,
        repairUsed: false,
        finishReason: "length",
      }),
    ).toEqual({ kind: "fallback", reason: "length_truncated" });

    // Used repair without finish reason yields stream_truncated fallback
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: false,
        hasVisibleOutput: false,
        repairUsed: true,
      }),
    ).toEqual({ kind: "fallback", reason: "stream_truncated" });

    // Used repair with streamComplete yields empty_completion fallback
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: false,
        hasVisibleOutput: false,
        repairUsed: true,
        streamComplete: true,
      }),
    ).toEqual({ kind: "fallback", reason: "empty_completion" });
  });

  it("maps fallback reasons to exact human-readable diagnostics", () => {
    expect(resolveEmptyAssistantFallbackMessage("length_truncated")).toBe(
      LENGTH_TRUNCATED_FALLBACK_MESSAGE,
    );
    expect(resolveEmptyAssistantFallbackMessage("stream_truncated")).toBe(
      STREAM_TRUNCATED_FALLBACK_MESSAGE,
    );
    expect(resolveEmptyAssistantFallbackMessage("empty_completion")).toBe(
      EMPTY_ASSISTANT_FALLBACK_MESSAGE,
    );
  });

  it("evaluates visible output for string and array parts", () => {
    expect(hasAssistantVisibleOutput("")).toBe(false);
    expect(hasAssistantVisibleOutput("   ")).toBe(false);
    expect(hasAssistantVisibleOutput("hello")).toBe(true);
    expect(hasAssistantVisibleOutput([])).toBe(false);
    expect(
      hasAssistantVisibleOutput([{ type: "text", text: "   " }]),
    ).toBe(false);
    expect(
      hasAssistantVisibleOutput([{ type: "text", text: "valid text" }]),
    ).toBe(true);
    expect(
      hasAssistantVisibleOutput([
        { type: "image_url", image_url: { url: "https://example.com/a.png" } },
      ]),
    ).toBe(true);
  });

  it("treats reasoning-only empty turns as repairable up to cap, not silent fallback", () => {
    // reasoning-only, stream completed, under cap -> repair (引导输出正文/工具)
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: false,
        hasVisibleOutput: false,
        repairUsed: false,
        hasReasoning: true,
        reasoningRepairCount: 0,
        streamComplete: true,
      }),
    ).toEqual({ kind: "repair" });

    // one repair already used, still reasoning-only, under cap -> repair again
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: false,
        hasVisibleOutput: false,
        hasReasoning: true,
        reasoningRepairCount: 1,
        repairUsed: true,
        streamComplete: true,
      }),
    ).toEqual({ kind: "repair" });

    // reaches cap + repair used + stream completed -> empty_completion fallback (stop, no infinite loop)
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: false,
        hasVisibleOutput: false,
        hasReasoning: true,
        reasoningRepairCount: MAX_REASONING_ONLY_REPAIRS,
        repairUsed: true,
        streamComplete: true,
      }),
    ).toEqual({ kind: "fallback", reason: "empty_completion" });

    // reaches cap but generic repair not yet used -> falls through to generic repair (unchanged)
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: false,
        hasVisibleOutput: false,
        hasReasoning: true,
        reasoningRepairCount: MAX_REASONING_ONLY_REPAIRS,
        repairUsed: false,
        streamComplete: true,
      }),
    ).toEqual({ kind: "repair" });

    // reasoning-only but stream did not complete (no finish_reason) -> stream_truncated, not silent empty
    expect(
      resolveEmptyAssistantOutcome({
        hasToolCalls: false,
        hasVisibleOutput: false,
        hasReasoning: true,
        reasoningRepairCount: MAX_REASONING_ONLY_REPAIRS,
        repairUsed: true,
        streamComplete: false,
      }),
    ).toEqual({ kind: "fallback", reason: "stream_truncated" });
  });

  describe("formatLengthTruncatedReasoningTail", () => {
    it("returns null for empty, blank, or non-string reasoning", () => {
      expect(formatLengthTruncatedReasoningTail(undefined)).toBeNull();
      expect(formatLengthTruncatedReasoningTail(null)).toBeNull();
      expect(formatLengthTruncatedReasoningTail("")).toBeNull();
      expect(formatLengthTruncatedReasoningTail("   \n\t  ")).toBeNull();
    });

    it("formats short reasoning with marker", () => {
      const reasoning = "I think the review is approved.";
      const formatted = formatLengthTruncatedReasoningTail(reasoning);
      expect(formatted).toBe(`[nolo] ${LENGTH_TRUNCATED_REASONING_MARKER}\n${reasoning}`);
    });

    it("clips reasoning exceeding maxChars to the tail", () => {
      const prefix = "a".repeat(3000);
      const tail = "b".repeat(2000);
      const fullReasoning = prefix + tail;
      const formatted = formatLengthTruncatedReasoningTail(fullReasoning, 2000);
      expect(formatted).toBe(`[nolo] ${LENGTH_TRUNCATED_REASONING_MARKER}\n${tail}`);
      expect(formatted?.length).toBe(`[nolo] ${LENGTH_TRUNCATED_REASONING_MARKER}\n`.length + 2000);
    });
  });
});
