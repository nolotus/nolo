import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "AgentForm.tsx"), "utf8");
const actionsSource = readFileSync(
  join(import.meta.dir, "agentFormActions.ts"),
  "utf8"
);
const basicInfoSource = readFileSync(join(import.meta.dir, "PersonaSection.tsx"), "utf8");
const validationSource = readFileSync(
  join(import.meta.dir, "../hooks/useAgentFormValidation.ts"),
  "utf8"
);
const createSourceStepSource = readFileSync(
  join(import.meta.dir, "AgentCreateSourceStep.tsx"),
  "utf8"
);

describe("AgentForm source contract", () => {
  it("hydrates edit forms from the persisted agent key before submit", () => {
    expect(source).toContain("resolveAgentEditIdentity(initialValues)");
    expect(source).toContain("dispatch(read({ dbKey: agentKey }))");
    expect(source).toContain("setHydratedInitialValues({");
  });

  it("treats dbKey-backed edit forms as editable even when id is absent", () => {
    expect(source).toContain("if (!isCreate && agentId) {");
    expect(source).toContain("if (!isCreate && agentId) {");
    expect(source).toContain("showVersionPanel && !isCreate && agentId");
  });

  it("accepts machine preselection through create-agent query params", () => {
    expect(source).toContain('searchParams.get("apiSource")');
    expect(source).toContain('searchParams.get("machineId")');
    expect(source).toContain('setAny("apiSource", "cli")');
    expect(source).toContain('setAny("machineId", machineId)');
  });

  it("derives interaction mode from the selected model instead of a manual picker", () => {
    // 不再有交互模式手选 UI（BasicInfoTab 不再引用 live audio model / RadioGroup）
    expect(basicInfoSource).not.toContain("DEFAULT_GOOGLE_LIVE_AUDIO_MODEL");
    expect(basicInfoSource).not.toContain("defaultInteractionMode");
    expect(basicInfoSource).not.toContain("form.interactionMode");
    // 表单不再因为 mode 切换而硬写 live audio model
    expect(source).not.toContain("DEFAULT_GOOGLE_LIVE_AUDIO_MODEL");
    expect(source).not.toContain("gemini-3.1-flash-live-preview");
    // 模型选择时由模型倒推交互模式（在 AdvancedSettingsTab / agentFormActions 里）
    expect(source).not.toContain("defaultInteractionMode !== \"live_audio\"");
  });

  it("keeps tab rendering as local UI state so advanced settings are reachable without leaking into submitted data", () => {
    expect(source).toContain("setActiveTabState(Number(id))");
    expect(source).toContain("const activeTab = activeTabState");
    expect(source).toContain("{renderTabById(activeTab)}");
    expect(source).not.toContain('setValue("activeTab"');
    expect(source).not.toContain("mode={activeTab === tab.id ? \"visible\" : \"hidden\"}");
  });

  it("keeps create completion lightweight: direct use by default, optional eval later", () => {
    expect(source).toContain("afs.nextSteps");
    expect(source).toContain("创建后会直接进入对话");
    expect(source).toContain("生成评估用例草稿");
    expect(source).toContain("AgentPage 高级证据");
    expect(source).toContain("不会自动跑 live eval");
    expect(validationSource).toContain("createNewDialog({");
    expect(source).not.toContain("Agent Spec");
  });

  it("shows create-mode inline quick create before the full form", () => {
    expect(source).toContain('from "./AgentCreateSourceStep"');
    expect(source).toContain("createSourceCommitted");
    expect(source).toContain("showSourceStep");
    expect(source).toContain("AgentCreateSourceStep");
    expect(source).toContain("运行方式");
    expect(source).toContain("handleQuickCreate");
    expect(source).toContain("handleAdvancedEdit");
    expect(source).toContain("PLATFORM_QUICK_CREATE_MODEL");
    expect(source).toContain("afs.runModeBanner");
    expect(source).toContain("handleChangeCreateSource");
    expect(createSourceStepSource).toContain("平台内置");
    expect(createSourceStepSource).toContain("API 用量计费");
    expect(createSourceStepSource).toContain("订阅会员");
    expect(createSourceStepSource).toContain("高级编辑");
  });

  it("skips the create source step when apiSource=cli is preselected via query", () => {
    expect(source).toContain('searchParams.get("apiSource") === "cli"');
    expect(source).toContain("skipSourceStep");
    expect(source).toContain("useState(skipSourceStep)");
    expect(source).toContain("setCreateSourceCommitted(true)");
  });

  it("quick-creates platform/API without inventing a subscription apiSource", () => {
    // Real payload shapes live in agentFormActions (not comments in AgentForm)
    expect(actionsSource).toContain('apiSource: "platform"');
    expect(actionsSource).toContain('apiSource: "custom"');
    // Do not invent new apiSource values beyond platform | custom | cli
    expect(actionsSource).not.toContain('apiSource: "subscription"');
    expect(actionsSource).not.toContain('setValue("apiSource", "subscription"');
    expect(source).not.toContain('apiSource: "subscription"');
    expect(source).not.toContain('setValue("apiSource", "subscription"');
    // AgentForm still wires the real handlers / model constant
    expect(source).toContain("PLATFORM_QUICK_CREATE_MODEL");
    expect(source).toContain("handleAdvancedEdit");
    expect(source).toContain("requiresDesktopOAuth");
  });

  it("does not show source step in edit mode", () => {
    expect(source).toContain("isCreate && !createSourceCommitted && !skipSourceStep");
  });

  it("does not expose a memory tab inside the edit form (memory is managed from AgentPage)", () => {
    expect(source).not.toContain("MEMORY_TAB");
    expect(source).not.toContain("AgentMemoryTab");
    expect(source).not.toContain(
      "<AgentMemoryTab agentId={agentId} agentKey={agentKey} />"
    );
  });

  it("exposes an agent delete entry in edit mode reusing the deleteDbKey truth", () => {
    // Edit-mode only danger entry (AI- and human-discoverable), guarded against create/readOnly.
    expect(source).toContain('{!isCreate && !readOnly && agentKey && (');
    expect(source).toContain('aria-label={t("agentForm.deleteAgent", "删除此 Agent")}');
    expect(source).toContain('t("agentForm.deleteAgent", "删除此 Agent")');
    // Single delete truth: the same deleteDbKey thunk used by the topbar more-menu.
    expect(source).toContain('import { deleteDbKey } from "app/hooks/deleteDbKey"');
    expect(source).toContain("dispatch(deleteDbKey(agentKey))");
    // Confirmation reuses the project's ConfirmModal instead of a new dialog.
    expect(source).toContain("ConfirmModal");
  });
});
