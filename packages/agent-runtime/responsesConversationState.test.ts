import { describe, expect, it } from "bun:test";

import {
  isResponsesConversationStateRejection,
  normalizeResponsesConversationState,
  selectResponsesConversationState,
  updateResponsesConversationState,
} from "./responsesConversationState";

describe("responses conversation state", () => {
  const agent = { provider: "OpenAI", model: "gpt-5.4" };

  it("normalizes and selects state only for the same provider/model", () => {
    const state = normalizeResponsesConversationState({
      provider: " OPENAI ",
      model: "gpt-5.4",
      responseId: " resp_123 ",
    });
    expect(state).toEqual({ provider: "openai", model: "gpt-5.4", responseId: "resp_123" });
    expect(selectResponsesConversationState(state, agent)).toEqual(state);
    expect(selectResponsesConversationState(state, { provider: "openai", model: "gpt-5.5" })).toBeNull();
    expect(selectResponsesConversationState(state, { provider: "deepseek", model: "gpt-5.4" })).toBeNull();
  });

  it("does not create or select server-side state for stateless DeepSeek Responses", () => {
    expect(
      updateResponsesConversationState(
        { provider: "deepseek", model: "deepseek-v4-flash" },
        "resp_ds_123",
      ),
    ).toBeNull();
    expect(
      selectResponsesConversationState(
        { provider: "deepseek", model: "deepseek-v4-flash", responseId: "resp_ds_123" },
        { provider: "deepseek", model: "deepseek-v4-flash" },
      ),
    ).toBeNull();
  });

  it("updates state from a completed response and rejects blank ids", () => {
    expect(updateResponsesConversationState(agent, " resp_456 ")).toEqual({
      provider: "openai",
      model: "gpt-5.4",
      responseId: "resp_456",
    });
    expect(updateResponsesConversationState(agent, " ")).toBeNull();
    expect(normalizeResponsesConversationState({ provider: "openai", model: "gpt-5.4" })).toBeNull();
  });

  it("only classifies explicit stored-response rejections as fallbackable", () => {
    expect(isResponsesConversationStateRejection(400, "previous response not found")).toBe(true);
    expect(isResponsesConversationStateRejection(404, '{"code":"response_id_expired"}')).toBe(true);
    expect(isResponsesConversationStateRejection(401, "previous response not found")).toBe(false);
    expect(isResponsesConversationStateRejection(429, "rate limit exceeded")).toBe(false);
    expect(isResponsesConversationStateRejection(400, "invalid tool schema")).toBe(false);
  });
});
