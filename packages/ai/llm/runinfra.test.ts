import { describe, expect, test } from "bun:test";
import { getModelConfig } from "./providers";

describe("RunInfra GLM 5.3 Flash pricing", () => {
  test("exposes separate cached input and output rates", () => {
    expect(getModelConfig("runinfra", "glm-5-3-flash").price).toMatchObject({
      input: 0.8,
      inputCacheHit: 0.08,
      output: 3.2,
    });
  });
});
