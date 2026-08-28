import { describe, expect, it } from "bun:test";
import { createRatingResult } from "./ratingResult";
import { writeRatingResult } from "./ratingResultWriter";

const createMemoryStore = () => {
  const records = new Map<string, unknown>();
  return {
    records,
    async get(key: string) {
      return records.get(key);
    },
    async put(key: string, value: unknown) {
      records.set(key, value);
    },
  };
};

describe("writeRatingResult", () => {
  it("writes append-only rating results under deterministic keys", async () => {
    const store = createMemoryStore();
    const rating = createRatingResult({
      ratingId: "rating_123",
      billableEventId: "billable_123",
      provider: "openai",
      model: "gpt-5.4",
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    const result = await writeRatingResult({ store, rating });

    expect(result.key).toBe("rating-result-rating_123");
    expect(store.records.get(result.key)).toEqual(rating);
  });

  it("refuses to overwrite an existing rating result", async () => {
    const store = createMemoryStore();
    const rating = createRatingResult({
      ratingId: "rating_123",
      billableEventId: "billable_123",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    await writeRatingResult({ store, rating });

    await expect(writeRatingResult({ store, rating })).rejects.toThrow(
      "rating result already exists"
    );
  });

  it("treats LEVEL_NOT_FOUND from the store as an empty append slot", async () => {
    const records = new Map<string, unknown>();
    const store = {
      records,
      async get() {
        const error: any = new Error("not found");
        error.code = "LEVEL_NOT_FOUND";
        throw error;
      },
      async put(key: string, value: unknown) {
        records.set(key, value);
      },
    };
    const rating = createRatingResult({
      ratingId: "rating_456",
      billableEventId: "billable_456",
      provider: "openai",
      model: "gpt-5.4",
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    const result = await writeRatingResult({ store, rating });

    expect(result.key).toBe("rating-result-rating_456");
    expect(records.get(result.key)).toEqual(rating);
  });
});
