import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "AgentCreateSourceStep.tsx"), "utf8");
const stateSource = readFileSync(
  join(import.meta.dir, "useAgentCreateSourceState.ts"),
  "utf8"
);
const combined = `${source}\n${stateSource}`;

describe("AgentCreateSourceStep source contract", () => {
  it("exposes four primary run-mode cards with inline panels (no continue gate)", () => {
    expect(source).toContain('id: "platform"');
    expect(source).toContain('id: "api"');
    expect(source).toContain('id: "subscription"');
    expect(source).toContain('id: "cli"');
    expect(source).toContain("平台内置");
    expect(source).toContain("API 用量计费");
    expect(source).toContain("订阅会员");
    expect(source).toContain("本机 CLI");
    expect(source.indexOf('id: "platform"')).toBeLessThan(
      source.indexOf('id: "subscription"')
    );
    expect(source.indexOf('id: "subscription"')).toBeLessThan(
      source.indexOf('id: "api"')
    );
    expect(source.indexOf('id: "api"')).toBeLessThan(
      source.indexOf('id: "cli"')
    );
    expect(source).not.toContain("继续");
    expect(source).toContain("onQuickCreate");
    expect(source).toContain("onAdvancedEdit");
    expect(source).toContain("高级编辑");
  });

  it("platform path uses composition React Aria Select + SelectItem", () => {
    expect(combined).toContain("PLATFORM_QUICK_CREATE_MODEL");
    expect(combined).toContain("PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL");
    expect(combined).toContain("getModelsByProvider");
    expect(combined).toContain("platformModel");
    expect(source).toContain('data-mode="platform"');
    expect(source).toContain("系统提示词");
    expect(source).toContain('Select, SelectItem } from "render/web/ui/Select"');
    expect(source).toContain("selectedKey={platformModel}");
    expect(source).toContain("onSelectionChange");
    expect(source).toContain("<SelectItem");
    expect(source).not.toContain("<select");
    expect(source).not.toContain("options={platformModelOptions}");
  });

  it("api path uses shared provider templates for url and api key", () => {
    expect(source).toContain('data-mode="api"');
    expect(combined).toContain("listMeteredApiPresetOptions");
    expect(combined).toContain("resolveProviderPresetFields");
    expect(combined).toContain("customProviderUrl");
    expect(combined).toContain("apiKey");
    expect(source).toContain("服务商 URL");
    expect(source).toContain("API 密钥");
    expect(source).toContain("Provider 模板");
  });

  it("subscription is selectable with Token Plan create and OAuth desktop note", () => {
    expect(source).toContain('data-mode="subscription"');
    expect(combined).toContain("listSubscriptionPresetOptions");
    expect(combined).toContain("requiresDesktopOAuth");
    expect(source).toContain('navigate("/downloads")');
    expect(combined).toContain("桌面端");
    expect(source).toContain("cliDesktopBody");
  });

  it("cli card exposes provider dropdown and machine dropdown with default-env option", () => {
    expect(source).toContain('data-mode="cli"');
    expect(source).toContain("AgentCreateCliPanel");
    expect(combined).toContain("CLI_PROVIDER_OPTIONS");
    expect(combined).toContain("CLI_CAPABILITY_BY_PROVIDER");
    expect(source).toContain("CLI 工具");
    expect(source).toContain("运行位置");
    expect(source).toContain("默认环境");
  });

  it("is accessible as a radiogroup of selectable cards", () => {
    expect(source).toContain('role="radiogroup"');
    expect(source).toContain('role="radio"');
    expect(source).toContain("aria-checked={isActive}");
  });

  it("exports create run-mode labels and quick draft type", () => {
    expect(combined).toContain("CREATE_RUN_MODE_LABELS");
    expect(combined).toContain("export type CreateRunMode");
    expect(combined).toContain("export type AgentCreateQuickDraft");
  });

  it("extracts state orchestration into useAgentCreateSourceState", () => {
    expect(source).toContain("useAgentCreateSourceState");
    expect(stateSource).toContain("export function useAgentCreateSourceState");
    expect(stateSource).toContain("useState");
    expect(stateSource).toContain("useMemo");
  });
});
