import { describe, expect, it } from "bun:test";
import { resources } from "./i18n.config";
import { Language } from "./types";

const localeFiles = [
  Language.EN,
  Language.ZH_CN,
  Language.ZH_HANT,
  Language.JA,
] as const;

describe("client locale bundles", () => {
  it("ships namespace-structured locale resources with the generator price label", () => {
    for (const language of localeFiles) {
      const json = resources[language];

      expect(json.common).toBeDefined();
      expect(json.space).toBeDefined();
      expect(json.ai).toBeDefined();
      expect(json.chat).toBeDefined();
      expect((json.ai as unknown as Record<string, string>).defaultImageProfileEstimate).toBeDefined();
    }
  });
});
