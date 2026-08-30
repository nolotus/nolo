import { describe, expect, test } from "bun:test";
import { resolveStreamEndPostWritePolicy } from "./messageStreamEndPostWritePolicy";

describe("resolveStreamEndPostWritePolicy", () => {
  test("billingMode: reported when hasReportedUsage", () => {
    const r = resolveStreamEndPostWritePolicy({
      hasReportedUsage: true,
      agentProvider: "openai",
      titleEligible: true,
      textContent: "hi",
      toolCalls: null,
    });
    expect(r.billingMode).toBe("reported");
  });

  test("billingMode: estimated when no reported usage but provider present and !== custom", () => {
    const r = resolveStreamEndPostWritePolicy({
      hasReportedUsage: false,
      agentProvider: "anthropic",
      titleEligible: false,
      textContent: "hi",
      toolCalls: [],
    });
    expect(r.billingMode).toBe("estimated");
  });

  test("billingMode: skip when provider is custom", () => {
    const r = resolveStreamEndPostWritePolicy({
      hasReportedUsage: false,
      agentProvider: "custom",
      titleEligible: false,
      textContent: "hi",
      toolCalls: [],
    });
    expect(r.billingMode).toBe("skip");
  });

  test("billingMode: skip when provider missing", () => {
    const r = resolveStreamEndPostWritePolicy({
      hasReportedUsage: false,
      agentProvider: null,
      titleEligible: false,
      textContent: "hi",
      toolCalls: [],
    });
    expect(r.billingMode).toBe("skip");
  });

  test("billingMode: skip for an immediate user cancellation, preventing an estimated token report", () => {
    const r = resolveStreamEndPostWritePolicy({
      hasReportedUsage: false,
      skipBilling: true,
      agentProvider: "openrouter",
      titleEligible: false,
      textContent: "[用户中断]",
      toolCalls: [],
    });
    expect(r.billingMode).toBe("skip");
  });

  test("updateTitle mirrors titleEligible", () => {
    expect(
      resolveStreamEndPostWritePolicy({
        hasReportedUsage: false,
        agentProvider: null,
        titleEligible: true,
        textContent: "hi",
        toolCalls: null,
      }).updateTitle
    ).toBe(true);
    expect(
      resolveStreamEndPostWritePolicy({
        hasReportedUsage: false,
        agentProvider: null,
        titleEligible: false,
        textContent: "hi",
        toolCalls: null,
      }).updateTitle
    ).toBe(false);
  });

  test("updateSummary/addRefs follow textContent.trim() !== empty", () => {
    const withText = resolveStreamEndPostWritePolicy({
      hasReportedUsage: false,
      agentProvider: null,
      titleEligible: false,
      textContent: "  hello  ",
      toolCalls: null,
    });
    expect(withText.updateSummary).toBe(true);
    expect(withText.addRefs).toBe(true);

    const blank = resolveStreamEndPostWritePolicy({
      hasReportedUsage: false,
      agentProvider: null,
      titleEligible: false,
      textContent: "   ",
      toolCalls: null,
    });
    expect(blank.updateSummary).toBe(false);
    expect(blank.addRefs).toBe(false);
  });

  test("summary reason task_completed when no tool calls", () => {
    const r = resolveStreamEndPostWritePolicy({
      hasReportedUsage: false,
      agentProvider: null,
      titleEligible: false,
      textContent: "hi",
      toolCalls: null,
    });
    expect(r.summaryForce).toBe(true);
    expect(r.summaryReason).toBe("task_completed");
  });

  test("summary reason context_budget when tool calls present", () => {
    const r = resolveStreamEndPostWritePolicy({
      hasReportedUsage: false,
      agentProvider: null,
      titleEligible: false,
      textContent: "hi",
      toolCalls: [{ id: "t1" }],
    });
    expect(r.summaryForce).toBe(false);
    expect(r.summaryReason).toBe("context_budget");
  });

  test("summary defaults still filled when updateSummary is false", () => {
    const r = resolveStreamEndPostWritePolicy({
      hasReportedUsage: false,
      agentProvider: null,
      titleEligible: false,
      textContent: "   ",
      toolCalls: [{ id: "t1" }],
    });
    expect(r.updateSummary).toBe(false);
    expect(r.summaryForce).toBe(false);
    expect(r.summaryReason).toBe("context_budget");
  });
});
