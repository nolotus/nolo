import { describe, expect, it } from "bun:test";

import { openAIModels } from "./models";

const modelByName = new Map(openAIModels.map((model) => [model.name, model]));

describe("OpenAI model pricing", () => {
  it("stores GPT text model prices as platform credits converted from USD at 8 credits per dollar", () => {
    expect(modelByName.get("gpt-5.5")?.price).toEqual({
      input: 40,
      output: 240,
      inputCacheHit: 4,
    });
    expect(modelByName.get("gpt-5.5-pro")?.price).toEqual({
      input: 240,
      output: 1440,
      inputCacheHit: 0,
    });
    expect(modelByName.get("gpt-5.6-sol")?.price).toEqual({
      input: 40,
      output: 240,
      inputCacheHit: 4,
    });
    expect(modelByName.get("gpt-5.6-terra")?.price).toEqual({
      input: 16,
      output: 96,
      inputCacheHit: 1.6,
    });
    expect(modelByName.get("gpt-5.6-luna")?.price).toEqual({
      input: 1.6,
      output: 9.6,
      inputCacheHit: 0.16,
    });
  });
});
