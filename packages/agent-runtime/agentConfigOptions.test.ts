import { describe, expect, test } from "bun:test";

import { pickAgentRuntimeInferenceOptions } from "./agentConfigOptions";

describe("agent runtime config options", () => {
  test("picks only explicit inference options from agent config", () => {
    expect(pickAgentRuntimeInferenceOptions({
      key: "agent-user-1-tuned",
      temperature: 0.2,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.3,
      max_tokens: 4096,
      reasoning_effort: "medium",
    })).toEqual({
      temperature: 0.2,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.3,
      max_tokens: 4096,
      reasoning_effort: "medium",
    });
  });

  test("does not invent provider defaults", () => {
    expect(pickAgentRuntimeInferenceOptions({
      key: "agent-user-1-default",
      model: "gpt-4.1-mini",
    })).toEqual({});
  });
});
