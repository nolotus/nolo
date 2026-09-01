import { describe, expect, test } from "bun:test";
import { getModelConfig } from "./providers";

describe("Baseten GLM 5.3 Flash pricing", () => {
  test("exposes separate cached input and output rates", () => {
    expect(getModelConfig("baseten", "zai-org/GLM-5.3-Flash").price).toMatchObject({
      input: 1.2,
      inputCacheHit: 0.24,
      output: 4,
    });
  });
});
