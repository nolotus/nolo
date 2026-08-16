import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  listAgentSourceDescriptors,
  projectAgentSourceFormData,
} from "ai/agent/agentSourceDescriptors";
import { findProviderById } from "ai/agent/providerRegistry";
import { orderSourcesWithInstalledCli } from "./LocalQuickCreateAgent";

const source = readFileSync(
  join(import.meta.dir, "LocalQuickCreateAgent.tsx"),
  "utf8",
);
const css = readFileSync(
  join(import.meta.dir, "LocalQuickCreateAgent.css"),
  "utf8",
);

describe("LocalQuickCreateAgent source contract", () => {
  it("is a minimal local create path (not full AgentForm)", () => {
    expect(source).toContain('data-testid="local-quick-create"');
    expect(source).toContain("createAgent");
    expect(source).toContain("projectAgentSourceFormData");
    expect(source).toContain("listAgentSourceDescriptors");
    expect(source).toContain("filterByPath");
    expect(source).not.toContain('from "ai/agent/web/AgentForm"');
    expect(source).toContain("/create/agent"); // advanced escape hatch
  });

  it("offers two top-level intents: byo / membership", () => {
    expect(source).toContain('LocalCreatePath = "byo" | "membership"');
    expect(source).toContain('data-testid="local-quick-create-path-byo"');
    expect(source).toContain('data-testid="local-quick-create-path-membership"');
    expect(source).not.toContain('data-testid="local-quick-create-path-free"');
    expect(source).not.toContain('data-testid="local-quick-create-path-pure-api"');
    expect(source).toContain("我有 API Key / 本地模型");
    expect(source).toContain("我在用某家 AI 会员/订阅");
    expect(source).toContain("怎么开始？");
    expect(source).toContain("选最接近你的一项，我们一步步带你建好助手。");
    expect(source).toContain("local-quick-create__intent-hint");
    expect(source).toContain('raw === "byo"');
    expect(source).toContain("parsePath");
  });

  it("byo filter includes metered key + local runtime + configure later", () => {
    expect(source).toContain('path === "byo"');
    expect(source).toContain('accessVariant === "metered_key"');
    expect(source).toContain('accessVariant === "local_runtime"');
    expect(source).toContain('accessVariant === "configure_later"');
    // Runtime: byo list includes Ollama + LM Studio + metered + later
    const all = listAgentSourceDescriptors();
    const byo = all.filter(
      (d) =>
        d.accessVariant === "metered_key" ||
        d.accessVariant === "local_runtime" ||
        d.accessVariant === "configure_later",
    );
    const keys = byo.map((d) => d.sourceKey);
    expect(keys).toContain("local:ollama");
    expect(keys).toContain("local:lmstudio");
    expect(keys).toContain("local:later");
    expect(byo.some((d) => d.accessVariant === "metered_key")).toBe(true);
    expect(byo.some((d) => d.accessVariant === "oauth")).toBe(false);
    expect(byo.some((d) => d.accessVariant === "cli_session")).toBe(false);
  });

  it("shows only working membership paths while keeping OAuth contracts for later", () => {
    expect(source).toContain('MembershipAccess = "cli" | "oauth" | "api_key"');
    expect(source).toContain('data-testid="local-quick-create-membership-cli"');
    expect(source).not.toContain('data-testid="local-quick-create-membership-oauth"');
    expect(source).toContain('data-testid="local-quick-create-membership-api-key"');
    expect(source).toContain("本机终端 / CLI 已经登录");
    expect(source).not.toContain("想用浏览器登录授权");
    expect(source).toContain("会员发了 Key 和接口地址");
    expect(source).toContain('accessVariant === "cli_session"');
    expect(source).toContain('accessVariant === "oauth"');
    expect(source).toContain('accessVariant === "token_plan_endpoint"');
  });

  it("styles intent list (not provider group chrome as primary)", () => {
    expect(css).toContain(".local-quick-create__intent-list");
    expect(css).toContain(".local-quick-create__intent");
    expect(source).not.toContain("local-quick-create-source-groups");
    expect(source).not.toContain("groupAgentSourceDescriptors");
  });

  it("consumes shared descriptors instead of hard-coded SourceMode presets", () => {
    expect(source).toContain('from "ai/agent/agentSourceDescriptors"');
    expect(source).not.toContain("type SourceMode =");
    expect(source).not.toContain("SOURCE_MODE_ORDER");
    expect(source).not.toContain("TOKEN_PLAN_TEMPLATE");
    expect(source).not.toContain("token-plan-cn.xiaomimimo.com");
    expect(source).not.toContain("mimo-v2.5-pro");
    expect(source).not.toContain("https://api.openai.com/v1");
    expect(source).not.toContain("gpt-4o-mini");
    expect(source).not.toContain("http://127.0.0.1:11434/v1");
  });

  it("defaults owner to local when no account", () => {
    expect(source).toContain('"local"');
    expect(source).toContain("useUserId");
  });

  it("navigates via createAgentKey + createNewDialog, not silent home fallback", () => {
    expect(source).toContain("createAgentKey");
    expect(source).toContain("createNewDialog");
    expect(source).toContain("useCreateDialog");
    expect(source).toContain("resolveAgentDbKey");
    expect(source).toContain("createAgentKey.private");
    expect(source).toContain("createAgentKey.public");
    expect(source).not.toMatch(/navigate\(\s*["']\/["']\s*\)/);
    expect(source).not.toContain("navigate(`/${key}`)");
  });

  it("creates global agents without spaceId attachment", () => {
    expect(source).toContain("spaceId: undefined");
  });

  it("keeps OAuth/CLI hints as short command/binary text", () => {
    expect(source).toContain("oauthAuthCommand");
    expect(source).toContain("local-quick-create-oauth-hint");
    expect(source).toContain("local-quick-create-cli-hint");
    expect(source).toContain("cliBinaryHint");
  });

  it("Token Plan defaults come from registry via descriptors, not UI constants", () => {
    const template = findProviderById("token-plan");
    expect(template?.kind).toBe("api_key_template");
    if (template?.kind === "api_key_template") {
      const form = projectAgentSourceFormData({
        sourceKey: "template:token-plan",
        name: "TP",
        apiKey: "sk-x",
      });
      expect(form.customProviderUrl).toBe(template.baseUrl);
      expect(form.model).toBe(template.defaultModel);
      expect(form.provider).toBe(template.provider);
      expect(form.apiSource).toBe("custom");
      expect(form.useServerProxy).toBe(false);
      expect(source).not.toContain(template.baseUrl);
      expect(source).not.toContain(template.defaultModel || "___");
    }
  });

  it("hands raw apiKey only via projectAgentSourceFormData for key templates", () => {
    expect(source).toContain("projectAgentSourceFormData");
    expect(source).toContain("hasApiKey: Boolean(apiKey.trim())");
    expect(source).toContain("never log apiKey contents");
    // submit log must not pass raw secret as `apiKey:` field (hasApiKey is ok).
    const submitLog = source.match(
      /localFirstLog\("quickCreate\.submit",\s*\{[\s\S]*?\}\)/,
    )?.[0];
    expect(submitLog).toBeTruthy();
    expect(submitLog).toContain("hasApiKey:");
    expect(submitLog).not.toMatch(/(?<![A-Za-z])apiKey\s*:/);
    expect(source).not.toContain("console.log");
    expect(source).toContain('setApiKey("")');
  });

  it("exposes OAuth and CLI branches through descriptor source keys", () => {
    const keys = listAgentSourceDescriptors().map((d) => d.sourceKey);
    expect(keys).toContain("oauth:xai");
    expect(keys).toContain("oauth:chatgpt");
    expect(keys).toContain("oauth:antigravity");
    expect(keys).toContain("cli:claude");
    expect(keys).toContain("cli:codex");
    expect(keys).toContain("local:ollama");
    expect(keys).toContain("local:lmstudio");
    expect(keys).toContain("local:later");
    expect(source).toContain("data-source-key={d.sourceKey}");
    expect(source).toContain("local-quick-create-source-");
  });

  it("desktop CLI source step scans installed CLIs and highlights detected", () => {
    expect(source).toContain("scanInstalledClis");
    expect(source).toContain('from "ai/agent/cliChatClient"');
    expect(source).toContain("getIsDesktopApp");
    expect(source).toContain("orderSourcesWithInstalledCli");
    expect(source).toContain("is-detected");
    expect(source).toContain("已检测到");
    expect(source).toContain("data-cli-detected");
    expect(source).toContain("local-quick-create-cli-scan");
    expect(css).toContain(".local-quick-create__preset.is-detected");
    expect(css).toContain(".local-quick-create__preset-badge");
  });

  it("orderSourcesWithInstalledCli puts detected providers first", () => {
    const cli = listAgentSourceDescriptors().filter(
      (d) => d.accessVariant === "cli_session",
    );
    expect(cli.length).toBeGreaterThan(2);
    const ordered = orderSourcesWithInstalledCli(cli, ["agy", "grok"]);
    expect(ordered[0]?.form.cliProvider).toBe("agy");
    expect(ordered[1]?.form.cliProvider).toBe("grok");
    // Non-detected remain after; all options still present.
    expect(ordered.map((d) => d.sourceKey).sort()).toEqual(
      cli.map((d) => d.sourceKey).sort(),
    );
    expect(orderSourcesWithInstalledCli(cli, [])).toEqual(cli);
  });
});
