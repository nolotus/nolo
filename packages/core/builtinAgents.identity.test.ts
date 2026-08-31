import { describe, expect, it } from "bun:test";
import {
  BUILTIN_AGENT_CREATOR_AGENT_KEY,
  BUILTIN_APP_BUILDER_AGENT_KEY,
  BUILTIN_CHROME_OPERATOR_AGENT_KEY,
  BUILTIN_ECOMMERCE_AGENT_KEY,
  BUILTIN_FEEDBACK_AGENT_KEY,
  BUILTIN_NOLO_AGENT_KEY,
  BUILTIN_PLATFORM_AGENT_KEYS,
  DEFAULT_CODE_PLANNER_EXECUTOR_CANDIDATE_KEYS,
  PUBLIC_DEEPSEEK_V4_FLASH_AGENT_ID,
  PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
  PUBLIC_DEEPSEEK_V4_PRO_AGENT_ID,
  PUBLIC_DEEPSEEK_V4_PRO_AGENT_KEY,
  PUBLIC_GLM_53_FLASH_AGENT_ID,
  PUBLIC_GLM_53_FLASH_AGENT_KEY,
  PUBLIC_GPT_IMAGE_2_GENERATOR_AGENT_ID,
  PUBLIC_GPT_IMAGE_2_EDITOR_AGENT_ID,
  PUBLIC_GPT_IMAGE_2_CONTINUOUS_AGENT_ID,
  PUBLIC_NANO_BANANA_2_LITE_AGENT_ID,
  SYSTEM_USER_ID,
} from "./builtinAgents";
import {
  BUILTIN_AGENT_CATALOG,
  builtinAgentCatalogEntryById,
} from "./builtinAgentCatalog";
import {
  PUBLIC_AGENT_DEFS,
  NANO_BANANA_2_LITE_GENERATOR_DEF,
  defineAgentSeed,
} from "./publicAgentSeeds";
import { getModelPricing } from "../ai/llm/getPricing";

describe("builtin platform agent identity", () => {
  it("keeps only stable platform keys in code", () => {
    expect(BUILTIN_PLATFORM_AGENT_KEYS).toEqual([
      BUILTIN_NOLO_AGENT_KEY,
      BUILTIN_APP_BUILDER_AGENT_KEY,
      BUILTIN_ECOMMERCE_AGENT_KEY,
      BUILTIN_AGENT_CREATOR_AGENT_KEY,
      BUILTIN_FEEDBACK_AGENT_KEY,
      BUILTIN_CHROME_OPERATOR_AGENT_KEY,
    ]);
  });

  it("exposes stable public ids/keys for default Code Planner executor candidates", () => {
    // Deterministic seed id from createSpaceAgents DeepSeek V4 Flash seed,
    // not the historical alias agent-pub-deepseek-v4-flash.
    expect(PUBLIC_DEEPSEEK_V4_FLASH_AGENT_ID).toBe("01DSV4FLASHPB00000000JFPFD");
    expect(PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY).toBe(
      `agent-pub-${PUBLIC_DEEPSEEK_V4_FLASH_AGENT_ID}`,
    );

    expect(DEFAULT_CODE_PLANNER_EXECUTOR_CANDIDATE_KEYS).toEqual([
      PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
    ]);
    // No roles / scoring metadata — plain key list only.
    expect(Array.isArray(DEFAULT_CODE_PLANNER_EXECUTOR_CANDIDATE_KEYS)).toBe(true);
    expect(PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY).not.toBe("agent-pub-deepseek-v4-flash");
  });

  it("exposes a stable public id/key for GLM 5.3 Flash (RunInfra flash tier)", () => {
    // Deterministic seed id from createSpaceAgents GLM 5.3 Flash seed,
    // same treatment as DeepSeek V4 Flash.
    expect(PUBLIC_GLM_53_FLASH_AGENT_ID).toBe("01GLMFLASHPB00000000BT20BC");
    expect(PUBLIC_GLM_53_FLASH_AGENT_KEY).toBe(
      `agent-pub-${PUBLIC_GLM_53_FLASH_AGENT_ID}`,
    );
  });

  it("exposes stable public ids for Pro and image agents (single source of truth)", () => {
    // Deterministic seed ids from createSpaceAgents; keep in sync with
    // agent-runtime/builtinPlatformAgentConfigs fallback coverage.
    expect(PUBLIC_DEEPSEEK_V4_PRO_AGENT_ID).toBe("01DSV4PRONPB00000001VIR3EK");
    expect(PUBLIC_DEEPSEEK_V4_PRO_AGENT_KEY).toBe(
      `agent-pub-${PUBLIC_DEEPSEEK_V4_PRO_AGENT_ID}`,
    );
    expect(PUBLIC_GPT_IMAGE_2_GENERATOR_AGENT_ID).toBe("01GPTIMG2GEN00000000SSEBOS");
    expect(PUBLIC_GPT_IMAGE_2_EDITOR_AGENT_ID).toBe("01GPTIMG2EDT00000001R4R4H4");
    expect(PUBLIC_GPT_IMAGE_2_CONTINUOUS_AGENT_ID).toBe("01GPTIMG2CNT00000000USKZFO");
    expect(PUBLIC_NANO_BANANA_2_LITE_AGENT_ID).toBe("01NB2LITEGEN00000001XE1MNO");
  });

  it("exposes system user id constant", () => {
    expect(SYSTEM_USER_ID).toBe("system");
  });
});

describe("builtinAgentCatalog ↔ PUBLIC_AGENT_DEFS cross-assertions", () => {
  it("keeps every catalog group=public entry in sync with a PUBLIC_AGENT_DEFS seed (id, provider, model, image workflow)", () => {
    const seedById = new Map(PUBLIC_AGENT_DEFS.map((s) => [s.id, s]));

    const catalogPublicEntries = BUILTIN_AGENT_CATALOG.filter(
      (e) => e.group === "public",
    );
    expect(catalogPublicEntries.length).toBeGreaterThan(0);

    for (const entry of catalogPublicEntries) {
      const seed = seedById.get(entry.id);
      expect(
        seed,
        `seed missing in PUBLIC_AGENT_DEFS for catalog entry ${entry.id} (${entry.name})`,
      ).toBeDefined();
      if (!seed) continue;

      expect(seed.model).toBe<string>(entry.model);
      expect(seed.provider ?? "openai").toBe<string>(entry.provider);
      if (entry.imageModel) {
        expect(seed.imageModel).toBe(entry.imageModel);
      }
      if (entry.imageWorkflow) {
        expect(seed.imageWorkflow).toBe(entry.imageWorkflow);
      }
    }
  });

  it("keeps every PUBLIC_AGENT_DEFS seed in BUILTIN_AGENT_CATALOG with group=public", () => {
    const catalogById = new Map(
      BUILTIN_AGENT_CATALOG.map((e) => [e.id, e]),
    );

    for (const seed of PUBLIC_AGENT_DEFS) {
      const entry = catalogById.get(seed.id);
      expect(
        entry,
        `catalog entry missing for PUBLIC_AGENT_DEFS seed ${seed.id} (${seed.name})`,
      ).toBeDefined();
      if (!entry) continue;

      expect(entry.group).toBe("public");
      expect(seed.model).toBe<string>(entry.model);
      expect(seed.provider ?? "openai").toBe<string>(entry.provider);
      if (entry.imageModel) {
        expect(seed.imageModel).toBe(entry.imageModel);
      }
      if (entry.imageWorkflow) {
        expect(seed.imageWorkflow).toBe(entry.imageWorkflow);
      }
    }
  });

  it("locks catalog group partitioning with strict whitelists against unexpected drift", () => {
    const catalogPublicIds = BUILTIN_AGENT_CATALOG.filter(
      (e) => e.group === "public",
    )
      .map((e) => e.id)
      .sort();

    const seedPublicIds = PUBLIC_AGENT_DEFS.map((s) => s.id).sort();

    // 1:1 bi-directional equality
    expect(catalogPublicIds).toEqual(seedPublicIds);

    // Whitelist for builtin group (6 platform agents)
    const catalogBuiltinIds = BUILTIN_AGENT_CATALOG.filter(
      (e) => e.group === "builtin",
    )
      .map((e) => e.id)
      .sort();

    const EXPECTED_BUILTIN_IDS = [
      "01APPBUILDER00000001YAII3I",
      "01CHROMEOPR000000000001",
      "01ECOMMERCEAG00000001PYQ2J",
      "01NOLOAGENTCRT000000000001",
      "01NOLOAPPBLD000000019KCKT0",
      "01NOLOFEEDBACKA000000000R2",
    ].sort();

    expect(catalogBuiltinIds).toEqual(EXPECTED_BUILTIN_IDS);

    // Whitelist for internal group (1 compatibility agent)
    const catalogInternalIds = BUILTIN_AGENT_CATALOG.filter(
      (e) => e.group === "internal",
    )
      .map((e) => e.id)
      .sort();

    const EXPECTED_INTERNAL_IDS = ["01KIMIK26OLLAMA0000000001"].sort();

    expect(catalogInternalIds).toEqual(EXPECTED_INTERNAL_IDS);

    // Total must exactly equal partition sum
    expect(BUILTIN_AGENT_CATALOG.length).toBe(
      catalogPublicIds.length +
        catalogBuiltinIds.length +
        catalogInternalIds.length,
    );
  });
});

describe("platform hosted seed pricing policy", () => {
  it("defers all nolo and legacy ollama-cloud public seed prices to catalog pricing", () => {
    for (const seed of PUBLIC_AGENT_DEFS) {
      if (seed.provider === "nolo" || seed.provider === "ollama-cloud") {
        expect(seed.inputPrice).toBe(0);
        expect(seed.outputPrice).toBe(0);
      }
    }
  });
});

describe("platform hosted image agent seed pricing resolution", () => {
  it("resolves google image model price from nolo catalog without throwing", () => {
    expect(NANO_BANANA_2_LITE_GENERATOR_DEF.id).toBe(
      PUBLIC_NANO_BANANA_2_LITE_AGENT_ID,
    );
    expect(NANO_BANANA_2_LITE_GENERATOR_DEF.provider).toBe("google");
    expect(NANO_BANANA_2_LITE_GENERATOR_DEF.model).toBe(
      "gemini-3.1-flash-lite-image",
    );

    const noloPricing = getModelPricing(
      "nolo",
      "gemini-3.1-flash-lite-image",
    );
    expect(noloPricing).toBeDefined();

    expect(NANO_BANANA_2_LITE_GENERATOR_DEF.inputPrice).toBe(
      noloPricing!.inputPrice,
    );
    expect(NANO_BANANA_2_LITE_GENERATOR_DEF.outputPrice).toBe(
      noloPricing!.outputPrice,
    );
    expect(NANO_BANANA_2_LITE_GENERATOR_DEF.inputPrice).toBe(2);
    expect(NANO_BANANA_2_LITE_GENERATOR_DEF.outputPrice).toBe(12);
    expect(NANO_BANANA_2_LITE_GENERATOR_DEF.hasVision).toBe(true);
  });

  it("correctly resolves pricing via defineAgentSeed for platform hosted image models", () => {
    const customGoogleDef = defineAgentSeed({
      id: "01CUSTOMIMGTEST00000000001",
      name: "Google Image Test",
      provider: "google",
      model: "gemini-3.1-flash-lite-image",
      isPublic: true,
      introduction: "test",
      greeting: "test",
      prompt: "test",
    });

    expect(customGoogleDef.inputPrice).toBe(2);
    expect(customGoogleDef.outputPrice).toBe(12);
    expect(customGoogleDef.hasVision).toBe(true);
  });
});
