import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getAgentSourceDescriptor,
  getRecommendedAgentSourceKey,
  getTokenPlanTemplate,
  groupAgentSourceDescriptors,
  listAgentSourceDescriptors,
  projectAgentSourceFormData,
} from "./agentSourceDescriptors";
import { CLI_PROVIDER_VALUES, type CliProvider } from "./cliProviders";
import {
  CUSTOM_API_KEY_TEMPLATES,
  SUBSCRIPTION_OAUTH_PROVIDERS,
  findProviderById,
} from "./providerRegistry";

describe("agentSourceDescriptors", () => {
  const all = listAgentSourceDescriptors();

  it("lists every subscription OAuth with apiKeyRef as credential id, not preset id alone", () => {
    const oauth = all.filter((d) => d.accessVariant === "oauth");
    expect(oauth.length).toBe(SUBSCRIPTION_OAUTH_PROVIDERS.length);

    for (const preset of SUBSCRIPTION_OAUTH_PROVIDERS) {
      const d = oauth.find((x) => x.registryPresetId === preset.id);
      expect(d).toBeTruthy();
      expect(d!.oauthApiKeyRef).toBe(preset.apiKeyRef);
      expect(d!.form.apiKeyRef).toBe(preset.apiKeyRef);
      expect(d!.oauthAuthCommand).toBe(`nolo auth ${preset.apiKeyRef}`);
      // sourceKey uses store id
      expect(d!.sourceKey).toBe(`oauth:${preset.apiKeyRef}`);
      // Never use preset id in auth command when they differ
      if (preset.id !== preset.apiKeyRef) {
        expect(d!.oauthAuthCommand).not.toContain(preset.id);
        expect(d!.form.apiKeyRef).not.toBe(preset.id);
      }
    }
  });

  it("proves xai-oauth preset maps to apiKeyRef xai (not xai-oauth)", () => {
    const xai = getAgentSourceDescriptor("oauth:xai");
    expect(xai).toBeTruthy();
    expect(xai!.registryPresetId).toBe("xai-oauth");
    expect(xai!.form.apiKeyRef).toBe("xai");
    expect(xai!.oauthApiKeyRef).toBe("xai");
    expect(xai!.oauthAuthCommand).toBe("nolo auth xai");
    expect(xai!.oauthAuthCommand).not.toBe("nolo auth xai-oauth");
  });

  it("lists all CUSTOM_API_KEY_TEMPLATES from registry commercial metadata (no id inference)", () => {
    const templates = all.filter(
      (d) =>
        d.accessVariant === "token_plan_endpoint" ||
        d.accessVariant === "metered_key",
    );
    expect(templates.length).toBe(CUSTOM_API_KEY_TEMPLATES.length);

    for (const t of CUSTOM_API_KEY_TEMPLATES) {
      const d = getAgentSourceDescriptor(`template:${t.id}`);
      expect(d).toBeTruthy();
      expect(d!.form.provider).toBe(t.provider);
      expect(d!.form.customProviderUrl).toBe(t.baseUrl);
      expect(d!.form.model).toBe(t.defaultModel ?? null);
      expect(d!.form.apiKeyHeader).toBe(t.apiKeyHeader ?? null);
      expect(d!.form.apiSource).toBe("custom");
      expect(d!.form.useServerProxy).toBe(false);
      expect(d!.requiresApiKey).toBe(true);
      // Descriptor mirrors registry fields — no parallel id→policy map.
      expect(d!.accessVariant).toBe(t.accessVariant);
      expect(d!.commercialKind).toBe(t.commercialKind);
    }

    const tokenPlan = getAgentSourceDescriptor("template:token-plan");
    expect(tokenPlan!.recommended).toBe(true);
    expect(tokenPlan!.accessVariant).toBe("token_plan_endpoint");
    expect(tokenPlan!.commercialKind).toBe("subscription");
    expect(getRecommendedAgentSourceKey()).toBe("template:token-plan");
  });

  it("Token Plan commercialKind is subscription from registry, not inferred as api", () => {
    const registry = findProviderById("token-plan");
    expect(registry?.kind).toBe("api_key_template");
    if (registry?.kind === "api_key_template") {
      expect(registry.commercialKind).toBe("subscription");
      expect(registry.accessVariant).toBe("token_plan_endpoint");
    }
    const d = getAgentSourceDescriptor("template:token-plan")!;
    expect(d.commercialKind).toBe("subscription");
    expect(d.accessVariant).toBe("token_plan_endpoint");
    expect(d.group).toBe("token_plan");
  });

  it("metered templates keep commercialKind api from registry", () => {
    const openai = getAgentSourceDescriptor("template:openai-api")!;
    expect(openai.commercialKind).toBe("api");
    expect(openai.accessVariant).toBe("metered_key");
    const opencodeGo = getAgentSourceDescriptor("template:opencode-go")!;
    expect(opencodeGo.commercialKind).toBe("subscription");
    expect(opencodeGo.accessVariant).toBe("token_plan_endpoint");
  });

  it("Token Plan defaults come only from providerRegistry", () => {
    const registry = findProviderById("token-plan");
    expect(registry?.kind).toBe("api_key_template");
    const template = getTokenPlanTemplate();
    const d = getAgentSourceDescriptor("template:token-plan")!;
    expect(d.form.customProviderUrl).toBe(template.baseUrl);
    expect(d.form.model).toBe(template.defaultModel ?? null);
    expect(d.form.provider).toBe(template.provider);
    if (registry?.kind === "api_key_template") {
      expect(d.form.customProviderUrl).toBe(registry.baseUrl);
      expect(d.form.model).toBe(registry.defaultModel);
      expect(d.commercialKind).toBe(registry.commercialKind);
      expect(d.accessVariant).toBe(registry.accessVariant);
    }
  });

  it("does not re-export id-based accessVariant policy helper", () => {
    // Source contract: descriptor module must not contain id === "token-plan" inference.
    const source = readFileSync(
      join(import.meta.dir, "agentSourceDescriptors.ts"),
      "utf8",
    );
    expect(source).not.toContain('id === "token-plan"');
    expect(source).not.toContain("accessVariantForApiKeyTemplate");
  });

  it("lists every CLI_PROVIDER_VALUES with canonical cliProvider and no Nolo apiKey", () => {
    const cli = all.filter((d) => d.accessVariant === "cli_session");
    expect(cli.length).toBe(CLI_PROVIDER_VALUES.length);
    for (const id of CLI_PROVIDER_VALUES) {
      const d = getAgentSourceDescriptor(`cli:${id}`);
      expect(d).toBeTruthy();
      expect(d!.form.apiSource).toBe("cli");
      expect(d!.form.cliProvider).toBe(id);
      expect(d!.form.apiKeyRef).toBeNull();
      expect(d!.requiresApiKey).toBe(false);
      expect(d!.cliBinaryHint).toBeTruthy();
    }
  });

  it("includes non-persistent local extras: ollama, lmstudio, and later", () => {
    const ollama = getAgentSourceDescriptor("local:ollama")!;
    expect(ollama.accessVariant).toBe("local_runtime");
    expect(ollama.form.provider).toBe("ollama");
    expect(ollama.form.customProviderUrl).toContain("11434");
    expect(ollama.requiresApiKey).toBe(false);

    const lmstudio = getAgentSourceDescriptor("local:lmstudio")!;
    expect(lmstudio.accessVariant).toBe("local_runtime");
    expect(lmstudio.commercialKind).toBe("local");
    expect(lmstudio.group).toBe("local_later");
    expect(lmstudio.label).toBe("LM Studio 本机");
    expect(lmstudio.form.provider).toBe("lmstudio");
    expect(lmstudio.form.model).toBe("local-model");
    expect(lmstudio.form.customProviderUrl).toBe("http://localhost:1234/v1");
    expect(lmstudio.form.apiSource).toBe("custom");
    expect(lmstudio.form.useServerProxy).toBe(false);
    expect(lmstudio.requiresApiKey).toBe(false);

    // Order: ollama → lmstudio → later
    const keys = all.map((d) => d.sourceKey);
    const ollamaIdx = keys.indexOf("local:ollama");
    const lmIdx = keys.indexOf("local:lmstudio");
    const laterIdx = keys.indexOf("local:later");
    expect(ollamaIdx).toBeGreaterThanOrEqual(0);
    expect(lmIdx).toBe(ollamaIdx + 1);
    expect(laterIdx).toBe(lmIdx + 1);

    const later = getAgentSourceDescriptor("local:later")!;
    expect(later.accessVariant).toBe("configure_later");
    expect(later.form.customProviderUrl).toBeNull();
  });

  it("orders groups: token_plan → oauth → metered → cli → local_later", () => {
    const groups = groupAgentSourceDescriptors();
    expect(groups.map((g) => g.group)).toEqual([
      "token_plan",
      "subscription_oauth",
      "metered_api",
      "cli_session",
      "local_later",
    ]);
    // First overall item is Token Plan
    expect(all[0].sourceKey).toBe("template:token-plan");
  });

  it("does not invent new apiSource values", () => {
    for (const d of all) {
      expect(["custom", "cli"]).toContain(d.form.apiSource);
    }
  });
});

describe("projectAgentSourceFormData", () => {
  it("projects OAuth without raw apiKey; uses apiKeyRef store id", () => {
    for (const preset of SUBSCRIPTION_OAUTH_PROVIDERS) {
      const form = projectAgentSourceFormData({
        sourceKey: `oauth:${preset.apiKeyRef}`,
        name: "OAuth Agent",
        apiKey: "should-be-ignored-sk-leak",
      });
      expect(form.apiSource).toBe("custom");
      expect(form.useServerProxy).toBe(false);
      expect(form.apiKeyRef).toBe(preset.apiKeyRef);
      expect(form.apiKey).toBeUndefined();
      expect(form.provider).toBe(preset.provider);
      expect(form.model).toBe(preset.defaultModel ?? "");
      if (preset.cloudCodeBaseUrl) {
        expect(form.customProviderUrl).toBe(preset.cloudCodeBaseUrl);
      }
    }
  });

  it("projects xai OAuth with apiKeyRef xai never xai-oauth", () => {
    const form = projectAgentSourceFormData({
      sourceKey: "oauth:xai",
      name: "Grok",
    });
    expect(form.apiKeyRef).toBe("xai");
    expect(form.apiKeyRef).not.toBe("xai-oauth");
    expect(form.apiKey).toBeUndefined();
  });

  it("projects Token Plan from registry with transient apiKey only", () => {
    const template = getTokenPlanTemplate();
    const form = projectAgentSourceFormData({
      sourceKey: "template:token-plan",
      name: "TP",
      apiKey: "sk-test-plan",
    });
    expect(form.apiSource).toBe("custom");
    expect(form.useServerProxy).toBe(false);
    expect(form.provider).toBe(template.provider);
    expect(form.customProviderUrl).toBe(template.baseUrl);
    expect(form.model).toBe(template.defaultModel);
    expect(form.apiKey).toBe("sk-test-plan");
    expect(form.apiKeyRef).toBeUndefined();
  });

  it("allows model/base URL overrides for metered templates", () => {
    const form = projectAgentSourceFormData({
      sourceKey: "template:openai-api",
      name: "OpenAI",
      apiKey: "sk-oai",
      model: "gpt-4o",
      customProviderUrl: "https://example.com/v1",
    });
    expect(form.model).toBe("gpt-4o");
    expect(form.customProviderUrl).toBe("https://example.com/v1");
    expect(form.provider).toBe("openai");
    expect(form.apiKey).toBe("sk-oai");
  });

  it("projects anthropic-api with apiKeyHeader from registry", () => {
    const form = projectAgentSourceFormData({
      sourceKey: "template:anthropic-api",
      name: "Claude API",
      apiKey: "sk-ant",
    });
    expect(form.apiKeyHeader).toBe("x-api-key");
    expect(form.provider).toBe("anthropic");
  });

  it("projects CLI with canonical cliProvider and no Nolo secrets", () => {
    for (const id of CLI_PROVIDER_VALUES) {
      const form = projectAgentSourceFormData({
        sourceKey: `cli:${id}`,
        name: `CLI ${id}`,
        apiKey: "must-not-appear",
      });
      expect(form.apiSource).toBe("cli");
      expect(form.cliProvider).toBe(id as CliProvider);
      expect(form.apiKey).toBeUndefined();
      expect(form.apiKeyRef).toBeUndefined();
      expect(form.customProviderUrl).toBeUndefined();
    }
  });

  it("projects ollama, lmstudio, and later with current semantics", () => {
    const ollama = projectAgentSourceFormData({
      sourceKey: "local:ollama",
      name: "Local",
    });
    expect(ollama.apiSource).toBe("custom");
    expect(ollama.provider).toBe("ollama");
    expect(ollama.customProviderUrl).toBe("http://127.0.0.1:11434/v1");
    expect(ollama.apiKey).toBeUndefined();

    const lmstudio = projectAgentSourceFormData({
      sourceKey: "local:lmstudio",
      name: "LM",
    });
    expect(lmstudio.apiSource).toBe("custom");
    expect(lmstudio.provider).toBe("lmstudio");
    expect(lmstudio.model).toBe("local-model");
    expect(lmstudio.customProviderUrl).toBe("http://localhost:1234/v1");
    expect(lmstudio.apiKey).toBeUndefined();
    expect(lmstudio.useServerProxy).toBe(false);

    const later = projectAgentSourceFormData({
      sourceKey: "local:later",
      name: "Later",
    });
    expect(later.apiSource).toBe("custom");
    expect(later.customProviderUrl).toBeNull();
    expect(later.apiKey).toBeUndefined();
    expect(later.model).toBe("local-model");
  });

  it("throws on unknown sourceKey", () => {
    expect(() =>
      projectAgentSourceFormData({
        sourceKey: "nope:missing",
        name: "X",
      }),
    ).toThrow(/Unknown agent source descriptor/);
  });
});
