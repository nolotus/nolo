import { describe, expect, test } from "bun:test";
import { CUSTOM_API_KEY_TEMPLATES } from "ai/agent/providerRegistry";
import { PROVIDER_KEY_PRESET_IDS } from "./providerSecrets";

describe("provider key preset allowlist", () => {
  test("contains every registered custom API-key template id", () => {
    for (const template of CUSTOM_API_KEY_TEMPLATES) {
      expect(PROVIDER_KEY_PRESET_IDS.has(template.id)).toBe(true);
    }
  });
});
