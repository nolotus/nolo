import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import i18n from "i18next";
import { resources } from "./i18n.config";
import { i18nBaseConfig } from "./i18n.base";
import { Language } from "./types";

const languages = [
  Language.EN,
  Language.ZH_CN,
  Language.ZH_HANT,
  Language.JA,
] as const;

/** Dot-path keys used by Desktop + RN onboarding / quick-create (common NS). */
const LOCAL_FIRST_COMMON_KEYS = [
  "localFirst.onboarding.title",
  "localFirst.onboarding.description",
  "localFirst.onboarding.group.nolo",
  "localFirst.onboarding.group.byo",
  "localFirst.onboarding.path.signup",
  "localFirst.onboarding.path.signupHint",
  "localFirst.onboarding.path.login",
  "localFirst.onboarding.path.loginHint",
  "localFirst.onboarding.path.membership",
  "localFirst.onboarding.path.membershipHint",
  "localFirst.onboarding.path.byo",
  "localFirst.onboarding.path.byoHint",
  "localFirst.onboarding.skipCta",
  "localFirst.onboarding.rnTitle",
  "localFirst.onboarding.rnDescription",
  "localFirst.onboarding.createCta",
  "localFirst.onboarding.loginCta",
  "localFirst.onboarding.rnSkip",
  "localFirst.onboarding.closeA11y",
  "localFirst.onboarding.eyebrow",
  "localFirst.quickCreate.defaultLaterName",
  "localFirst.quickCreate.defaultOllamaName",
  "localFirst.quickCreate.defaultNamed",
  "localFirst.quickCreate.apiKeyRequired",
  "localFirst.quickCreate.missingAgentId",
  "localFirst.quickCreate.failed",
  "localFirst.quickCreate.back",
  "localFirst.quickCreate.titlePath",
  "localFirst.quickCreate.titleMembership",
  "localFirst.quickCreate.titleSourceByo",
  "localFirst.quickCreate.titleSource",
  "localFirst.quickCreate.titleForm",
  "localFirst.quickCreate.descPath",
  "localFirst.quickCreate.descMembership",
  "localFirst.quickCreate.descSourceByo",
  "localFirst.quickCreate.descSource",
  "localFirst.quickCreate.path.byo",
  "localFirst.quickCreate.path.byoHint",
  "localFirst.quickCreate.path.membership",
  "localFirst.quickCreate.path.membershipHint",
  "localFirst.quickCreate.membership.cli",
  "localFirst.quickCreate.membership.cliHint",
  "localFirst.quickCreate.membership.oauth",
  "localFirst.quickCreate.membership.oauthHint",
  "localFirst.quickCreate.membership.apiKey",
  "localFirst.quickCreate.membership.apiKeyHint",
  "localFirst.quickCreate.cliScanning",
  "localFirst.quickCreate.emptySources",
  "localFirst.quickCreate.cliDetected",
  "localFirst.quickCreate.nameLabel",
  "localFirst.quickCreate.modelLabel",
  "localFirst.quickCreate.endpointLabel",
  "localFirst.quickCreate.changeDefaults",
  "localFirst.quickCreate.laterHint",
  "localFirst.quickCreate.creating",
  "localFirst.quickCreate.submit",
  "localFirst.quickCreate.advanced",
] as const;

/** Keys under the `ai` namespace for RN CreateAgentModal. */
const LOCAL_CREATE_AI_KEYS = [
  "localCreate.title",
  "localCreate.subtitle",
  "localCreate.descLabel",
  "localCreate.descPlaceholder",
  "localCreate.connectionMethod",
  "localCreate.configureLater",
  "localCreate.liveVoice",
  "localCreate.recommendedTokenPlan",
  "localCreate.apiTemplates",
  "localCreate.apiKeyPlaceholder",
  "localCreate.modelPlaceholder",
  "localCreate.endpointRequired",
  "localCreate.apiKeyRequired",
  "localCreate.ollamaUrlRequired",
  "localCreate.createGlobalFirst",
  "localCreate.liveVoiceHint",
  "localCreate.ollamaHint",
  "localCreate.joinSpace",
  "localCreate.noBinding",
  "localCreate.success",
  "localCreate.failed",
  "localCreate.defaultNewName",
  "localCreate.submit",
  // reused existing keys
  "validation.nameRequired",
  "validation.modelRequired",
  "form.name",
  "form.model",
  "form.customProviderUrl",
  "cancel",
  "creating",
  "unnamed",
] as const;

const getByPath = (obj: unknown, path: string): unknown => {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as object)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
};

describe("local-first i18n source truth", () => {
  it("merges localFirst under common for all four languages", () => {
    for (const language of languages) {
      const common = resources[language].common as Record<string, unknown>;
      expect(common.localFirst).toBeDefined();
      for (const key of LOCAL_FIRST_COMMON_KEYS) {
        const value = getByPath(common, key);
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
        // Must not leave the raw key path as the value
        expect(value).not.toBe(key);
      }
    }
  });

  it("ships ai.localCreate (+ reused keys) for all four languages", () => {
    for (const language of languages) {
      const ai = resources[language].ai as Record<string, unknown>;
      expect(ai.localCreate).toBeDefined();
      for (const key of LOCAL_CREATE_AI_KEYS) {
        const value = getByPath(ai, key);
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
      }
    }
  });

  it("resolves localFirst via defaultNS common and localCreate via ai NS", async () => {
    const instance = i18n.createInstance();
    await instance.init({
      ...i18nBaseConfig,
      lng: Language.ZH_CN,
      resources,
    });

    // defaultNS common: bare key path works
    expect(instance.t("localFirst.onboarding.rnTitle")).toBe(
      "先创建你的本地 Agent",
    );
    expect(
      instance.t("localFirst.quickCreate.defaultNamed", { label: "Claude" }),
    ).toBe("我的Claude");

    // ai NS must be explicit — bare "localCreate.title" under common would miss
    expect(instance.t("localCreate.title")).not.toBe("创建本地 AI");
    expect(instance.t("localCreate.title", { ns: "ai" })).toBe("创建本地 AI");
    expect(instance.t("ai:localCreate.title")).toBe("创建本地 AI");
    expect(instance.t("validation.nameRequired", { ns: "ai" })).toBe(
      "AI名称为必填项",
    );
  });

  it("RN onboarding uses common keys with fallback defaults", () => {
    const source = readFileSync(
      join(
        import.meta.dir,
        "../../rn/components/LocalFirstOnboardingOverlay.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("useTranslation()");
    expect(source).toContain("localFirst.onboarding.rnTitle");
    expect(source).toContain("localFirst.onboarding.rnDescription");
    expect(source).toContain("localFirst.onboarding.createCta");
    expect(source).toContain("localFirst.onboarding.loginCta");
    expect(source).toContain("localFirst.onboarding.rnSkip");
    expect(source).toContain("localFirst.onboarding.closeA11y");
    // No hard-coded Chinese outside t() argument lists
    const withoutTArgs = source.replace(
      new RegExp(String.raw`t\(\s*[\s\S]*?\)`, "g"),
      "t(STRIPPED)",
    );
    expect(withoutTArgs).not.toMatch(new RegExp("[\\u4e00-\\u9fff]"));
  });

  it("RN CreateAgentModal uses ai namespace (not common.ai.agent.*)", () => {
    const source = readFileSync(
      join(
        import.meta.dir,
        "../../rn/components/agent/CreateAgentModal.tsx",
      ),
      "utf8",
    );
    expect(source).toContain('useTranslation("ai")');
    expect(source).toContain("localCreate.title");
    expect(source).toContain("validation.nameRequired");
    expect(source).not.toContain('t("ai.agent.');
    expect(source).not.toContain('t("common.cancel"');

    const withoutTArgs = source.replace(
      new RegExp(String.raw`t\(\s*[\s\S]*?\)`, "g"),
      "t(STRIPPED)",
    );
    expect(withoutTArgs).not.toMatch(new RegExp("[\\u4e00-\\u9fff]"));
  });

  it("LocalQuickCreateAgent interpolates defaultNamed with label", () => {
    const source = readFileSync(
      join(import.meta.dir, "../pages/LocalQuickCreateAgent.tsx"),
      "utf8",
    );
    expect(source).toContain('t("localFirst.quickCreate.defaultNamed"');
    expect(source).toContain("label: selected.label");
    expect(source).toContain("defaultValue:");
  });

  it("ships adjacent Home and Dialog keys that previously relied on fallbacks", () => {
    for (const language of languages) {
      const common = resources[language].common as Record<string, unknown>;
      const chat = resources[language].chat as Record<string, unknown>;
      expect(getByPath(common, "homeTabs.editDone")).toBeTruthy();
      expect(getByPath(common, "homeTabs.editCustom")).toBeTruthy();
      expect(getByPath(chat, "openSourceDialog")).toBeTruthy();
      expect(getByPath(chat, "loadError")).toBeTruthy();
      expect(getByPath(chat, "selectADialog")).toBeTruthy();
    }
  });
});
