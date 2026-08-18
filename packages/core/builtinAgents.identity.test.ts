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
  PUBLIC_GPT_IMAGE_2_GENERATOR_AGENT_ID,
  PUBLIC_GPT_IMAGE_2_EDITOR_AGENT_ID,
  PUBLIC_GPT_IMAGE_2_CONTINUOUS_AGENT_ID,
  PUBLIC_NANO_BANANA_2_LITE_AGENT_ID,
  SYSTEM_USER_ID,
} from "./builtinAgents";

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
