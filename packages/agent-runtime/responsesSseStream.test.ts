import { describe, expect, test } from "bun:test";
import { createResponsesStreamCollector } from "./responsesSseStream";
import { normalizeUsage } from "../ai/token/normalizeUsage";

/**
 * Responses wire 的缓存命中只出现在 usage.input_tokens_details.cached_tokens；
 * 收集器一度把 usage 重建成 prompt/completion/total 三个标量，把该字段丢掉，
 * 于是这条线（gpt-5.6-luna 等）的 token 记录 cache_read_input_tokens 恒为 0，
 * 缓存率不可观测且已缓存的 prompt 被按全价计。
 */
describe("responses stream usage", () => {
  const completedEvent = (usage: Record<string, unknown>) => ({
    type: "response.completed",
    response: { usage, output: [] },
  });

  test("carries cached-token details through to normalized usage", () => {
    const collector = createResponsesStreamCollector();
    collector.processEvent(
      completedEvent({
        input_tokens: 69797,
        output_tokens: 1162,
        total_tokens: 70959,
        input_tokens_details: { cached_tokens: 66048 },
        output_tokens_details: { reasoning_tokens: 704 },
      }),
    );
    const { usage } = collector.finalize();

    expect(usage?.prompt_tokens).toBe(69797);
    expect(usage?.completion_tokens).toBe(1162);
    expect(usage?.input_tokens_details).toEqual({ cached_tokens: 66048 });
    expect(usage?.output_tokens_details).toEqual({ reasoning_tokens: 704 });

    // 端到端：落 token 记录的那一步必须看得见缓存命中。
    expect(normalizeUsage(usage as never).cache_read_input_tokens).toBe(66048);
  });

  test("omits detail fields when the upstream did not send them", () => {
    const collector = createResponsesStreamCollector();
    collector.processEvent(
      completedEvent({ input_tokens: 10, output_tokens: 2, total_tokens: 12 }),
    );
    const { usage } = collector.finalize();

    expect(usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 2,
      total_tokens: 12,
    });
    expect(normalizeUsage(usage as never).cache_read_input_tokens).toBe(0);
  });
});
