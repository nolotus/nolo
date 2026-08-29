import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "GuidedAgentCreatePage.tsx"),
  "utf8"
);
const cssSource = readFileSync(
  join(import.meta.dir, "guidedAgentCreatePageStyles.ts"),
  "utf8"
);
const escapeHatchSource = readFileSync(
  join(import.meta.dir, "agentPageStylexEscapeHatch.css"),
  "utf8"
);
const hookSource = readFileSync(
  join(import.meta.dir, "useGuidedAgentCreation.ts"),
  "utf8"
);
const agentFormSource = readFileSync(join(import.meta.dir, "AgentForm.tsx"), "utf8");
const routes = readFileSync(
  join(import.meta.dir, "../../../app/web/routes.tsx"),
  "utf8"
);
const routePaths = readFileSync(
  join(import.meta.dir, "../../../create/routePaths.ts"),
  "utf8"
);

describe("GuidedAgentCreatePage source contract", () => {
  it("renders create-agent as a manual configuration form instead of a chat assistant", () => {
    expect(source).toContain("AgentForm");
    expect(source).toContain('mode="create"');
    expect(source).toContain("initialValues={formInitialValues}");
    expect(source).toContain("location.state");
    expect(source).toContain("initialDraft");
    expect(source).toContain("manual-agent-create");
    expect(source).not.toContain("guided-agent-create__assistant");
    expect(source).not.toContain("guided-agent-create__chat");
    expect(source).not.toContain("guided-agent-create__composer");
    expect(source).not.toContain("guided-agent-create__draft");
    expect(source).not.toContain("dispatch(createAgent");
    expect(source).not.toContain("createAgent({");
    expect(hookSource).not.toContain("createAgent");
  });

  it("keeps guided drafts as manual form prefill data", () => {
    expect(source).toContain("buildAgentFormDataFromGuidedDraft");
    expect(source).toContain("DEFAULT_MODEL");
    expect(source).toContain("EMPTY_MANUAL_DRAFT");
    expect(source).toContain("formInitialValues");
  });

  it("routes create-agent to the guided page", () => {
    expect(routes).toContain("GuidedAgentCreatePage");
    expect(routes).toContain("<GuidedAgentCreatePage />");
  });

  it("keeps /create/agent as the canonical local visual check route", () => {
    expect(routePaths).toContain('CREATE_AGENT = "create/agent"');
    expect(routes).toContain("path: CreateRoutePaths.CREATE_AGENT");
    expect(source).toContain("canonical visual check route: /create/agent");
    expect(source).not.toContain("/agent/create");
  });

  it("keeps final persistence inside AgentForm while allowing guided initial values", () => {
    expect(agentFormSource).toContain("新建模式允许上游 guided creation 草稿预填");
    expect(agentFormSource).toContain("useAgentValidation(hydratedInitialValues)");
  });

  it("does not keep the old guided preview cost sidebar on the manual page", () => {
    expect(source).not.toContain("getModelPricing");
    expect(source).not.toContain("guided-agent-create__model-cost");
    expect(hookSource).toContain("DEFAULT_MODEL");
    expect(hookSource).not.toContain('model: "openai/gpt-5.1"');
  });

  it("keeps the manual page visually quiet instead of wrapping the form in another card", () => {
    expect(cssSource).toContain('backgroundColor: "transparent"');
    expect(cssSource).toContain('boxShadow: "none"');
    expect(escapeHatchSource).toContain(".manual-agent-create .form-title");
    expect(escapeHatchSource).toContain("display: none;");
  });
});
