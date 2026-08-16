import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CLI_PROVIDER_VALUES } from "./cliProviders";
import {
  CLI_PROVIDER_VALUES as SCHEMA_CLI_PROVIDER_VALUES,
  MAX_TOKENS_LIMIT,
  getCreateAgentSchema,
} from "./createAgentSchema";
import type { CliProvider } from "./cliExecutor";

const t = (key: string) => key;

describe("CLI_PROVIDER_VALUES single authority", () => {
  it("exports the canonical CLI provider list from cliProviders", () => {
    expect(CLI_PROVIDER_VALUES).toEqual([
      "copilot",
      "gemini",
      "codex",
      "claude",
      "agy",
      "qoder",
      "opencode",
      "grok",
      "kimi",
    ]);
  });

  it("createAgentSchema re-exports the same runtime list reference", () => {
    expect(SCHEMA_CLI_PROVIDER_VALUES).toBe(CLI_PROVIDER_VALUES);
  });

  it("cliExecutor CliProvider is the same union (type-level via value assignability)", () => {
    const sample: CliProvider = CLI_PROVIDER_VALUES[0];
    expect(CLI_PROVIDER_VALUES).toContain(sample);
  });
});

describe("MAX_TOKENS_LIMIT single authority", () => {
  it("exports the shared upper limit constant from createAgentSchema", () => {
    expect(MAX_TOKENS_LIMIT).toBe(500000);
  });

  it("createAgentSchema's max_tokens .max() references the shared constant", () => {
    const schemaSource = readFileSync(
      join(import.meta.dir, "createAgentSchema.ts"),
      "utf8",
    );
    // schema 校验上限必须引用常量，而不是硬编码 500000
    expect(schemaSource).toContain("MAX_TOKENS_LIMIT");
    expect(schemaSource).toContain(".max(MAX_TOKENS_LIMIT");
    // 不能再出现硬编码的 500000 字面量
    expect(schemaSource).not.toMatch(/\.max\(\s*500000\b/);
  });

  it("AdvancedSettingsTab slider max references the shared constant", () => {
    const uiSource = readFileSync(
      join(import.meta.dir, "web/AdvancedSettingsTab.tsx"),
      "utf8",
    );
    // UI 滑块上限必须 import 并引用常量
    expect(uiSource).toContain("MAX_TOKENS_LIMIT");
    expect(uiSource).toMatch(/max:\s*MAX_TOKENS_LIMIT/);
    // 不能再出现硬编码的 128000 滑块上限
    expect(uiSource).not.toMatch(/max:\s*128000\b/);
  });
});

describe("createAgentSchema machine binding validation", () => {
  const schema = getCreateAgentSchema(t as any);

  const base = {
    name: "Agent",
    provider: "openai",
    model: "gpt-5",
    apiSource: "platform" as const,
    tools: [],
    references: [],
    whitelist: [],
    tags: "",
    prompt: "",
    introduction: "",
    greeting: "",
    inputPrice: 0,
    outputPrice: 0,
    useServerProxy: true,
  };

  it("allows max_tokens at the shared upper limit (500000)", () => {
    const parsed = schema.safeParse({ ...base, max_tokens: MAX_TOKENS_LIMIT });
    expect(parsed.success).toBe(true);
  });

  it("rejects max_tokens above the shared upper limit (500001)", () => {
    const parsed = schema.safeParse({ ...base, max_tokens: MAX_TOKENS_LIMIT + 1 });
    expect(parsed.success).toBe(false);
  });

  it("accepts max_tokens null (follow model default)", () => {
    const parsed = schema.safeParse({ ...base, max_tokens: null });
    expect(parsed.success).toBe(true);
  });

  it("accepts max_tokens undefined (follow model default)", () => {
    const parsed = schema.safeParse({ ...base });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.max_tokens).toBeUndefined();
  });

  it("allows machine binding for cli agents", () => {
    const parsed = schema.safeParse({
      ...base,
      apiSource: "cli",
      cliProvider: "codex",
      machineId: "machine-mac",
    });
    expect(parsed.success).toBe(true);
  });

  it("allows Qoder as a CLI provider", () => {
    const parsed = schema.safeParse({
      ...base,
      apiSource: "cli",
      cliProvider: "qoder",
      machineId: "machine-mac",
    });
    expect(parsed.success).toBe(true);
  });

  it("allows OpenCode as a CLI provider", () => {
    const parsed = schema.safeParse({
      ...base,
      apiSource: "cli",
      cliProvider: "opencode",
      machineId: "machine-mac",
    });
    expect(parsed.success).toBe(true);
  });

  it("allows Grok as a CLI provider", () => {
    const parsed = schema.safeParse({
      ...base,
      apiSource: "cli",
      cliProvider: "grok",
      machineId: "machine-mac",
    });
    expect(parsed.success).toBe(true);
  });

  it("allows machine binding for localhost custom providers", () => {
    const parsed = schema.safeParse({
      ...base,
      apiSource: "custom",
      customProviderUrl: "http://127.0.0.1:11434/v1/chat/completions",
      machineId: "machine-mac",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects machine binding for remote custom providers", () => {
    const parsed = schema.safeParse({
      ...base,
      apiSource: "custom",
      customProviderUrl: "https://api.example.com/v1/chat/completions",
      machineId: "machine-mac",
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.machineId).toContain(
      "validation.machineBindingRequiresCliOrLocalCustom",
    );
  });

  it("rejects machine binding for platform agents", () => {
    const parsed = schema.safeParse({
      ...base,
      apiSource: "platform",
      machineId: "machine-mac",
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.machineId).toContain(
      "validation.machineBindingRequiresCliOrLocalCustom",
    );
  });

  it("accepts a hosted exec runtime policy for advanced web execution", () => {
    const parsed = schema.safeParse({
      ...base,
      runtimeToolPolicy: {
        version: 1,
        runtimeTools: ["execShell"],
        workspace: { mode: "lease" },
      },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.runtimeToolPolicy).toEqual({
      version: 1,
      runtimeTools: ["execShell"],
      workspace: { mode: "lease" },
    });
  });
});
