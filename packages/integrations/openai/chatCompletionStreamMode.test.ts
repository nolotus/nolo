import { describe, expect, it } from "bun:test";

import { applyChatCompletionsStreamMode } from "./chatCompletionStreamMode";

describe("applyChatCompletionsStreamMode", () => {
  it("returns a non-streaming body without stream_options", () => {
    const body = {
      model: "deepseek-v4-pro",
      stream: true,
      stream_options: { include_usage: true },
    };

    expect(applyChatCompletionsStreamMode(body, false)).toEqual({
      model: "deepseek-v4-pro",
      stream: false,
    });
  });

  it("does not mutate the caller-owned request body", () => {
    const body = {
      model: "deepseek-v4-pro",
      stream: true,
      stream_options: { include_usage: true },
    };

    const nextBody = applyChatCompletionsStreamMode(body, false);

    expect(nextBody).not.toBe(body);
    expect(body).toEqual({
      model: "deepseek-v4-pro",
      stream: true,
      stream_options: { include_usage: true },
    });
  });
});
