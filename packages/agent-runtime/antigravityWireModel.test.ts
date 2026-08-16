import { describe, expect, test } from "bun:test";

import { resolveAntigravityWireModel } from "./antigravityWireModel";

describe("resolveAntigravityWireModel", () => {
  test("maps the recommended Gemini 3.5 Flash id to the supported low wire profile", () => {
    const r = resolveAntigravityWireModel("gemini-3.5-flash");
    expect(r.wireModelId).toBe("gemini-3.5-flash-low");
    expect(r.profile?.modelEnum).toBe("MODEL_PLACEHOLDER_M20");
    expect(r.profile?.maxOutputTokens).toBe(65536);
  });

  test("maps gemini-3.1-pro to gemini-3.1-pro-low with wire profile", () => {
    const r = resolveAntigravityWireModel("gemini-3.1-pro");
    expect(r.wireModelId).toBe("gemini-3.1-pro-low");
    expect(r.profile?.modelEnum).toBe("MODEL_PLACEHOLDER_M36");
    expect(r.profile?.maxOutputTokens).toBe(65535);
  });

  test("maps gemini-3.7-flash to the tiered wire profile", () => {
    const r = resolveAntigravityWireModel("gemini-3.7-flash");
    expect(r.wireModelId).toBe("gemini-3.7-flash-tiered");
    expect(r.profile?.modelEnum).toBe("MODEL_PLACEHOLDER_M301");
    expect(r.profile?.maxOutputTokens).toBe(65536);
  });

  test("collapses 3.7 effort wire aliases to the tiered upstream model", () => {
    for (const id of ["gemini-3.7-flash-low", "gemini-3.7-flash-medium", "gemini-3.7-flash-high"]) {
      const r = resolveAntigravityWireModel(id);
      expect(r.wireModelId).toBe("gemini-3.7-flash-tiered");
      expect(r.profile?.modelEnum).toBe("MODEL_PLACEHOLDER_M301");
    }
  });

  test("maps gemini-3.6-flash to gemini-3.6-flash-low wire profile", () => {
    const r = resolveAntigravityWireModel("gemini-3.6-flash");
    expect(r.wireModelId).toBe("gemini-3.6-flash-low");
    expect(r.profile?.maxOutputTokens).toBe(65536);
  });

  test("passes through known wire ids", () => {
    expect(resolveAntigravityWireModel("gemini-2.5-flash").wireModelId).toBe("gemini-2.5-flash");
  });
});
