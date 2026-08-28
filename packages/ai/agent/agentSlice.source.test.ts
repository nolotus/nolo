import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "agentSlice.ts"), "utf8");

describe("agentSlice source contract", () => {
  it("stores machine selection as runtime binding instead of making machines create agents", () => {
    expect(source).toContain("delete result.machineId");
    expect(source).toContain('formData.apiSource === "cli" && machineId');
    expect(source).toContain("const binding: AgentRuntimeBinding = {");
    expect(source).toContain("machineId,");
  });

  it("processAgentCreateForm accepts userId and writes ownerUserId into runtimeBinding", () => {
    // Lock CREATE HELPER SIGNATURE - must carry userId parameter
    expect(source).toContain("const processAgentCreateForm = (formData: AgentFormData, userId: string)");

    // Lock the CREATE CALL SITE - ensures binding owner is passed at invocation
    expect(source).toContain("const processed = processAgentCreateForm(formData, effectiveUserId)");

    // Lock the CLI CREATE GUARD - runtimeBinding only persists when apiSource is "cli"
    expect(source).toContain('if (formData.apiSource === "cli" && machineId) {');

    // Lock the binding construction in CREATE path
    expect(source).toContain("const binding: AgentRuntimeBinding = {");
    expect(source).toContain("machineId,");
    expect(source).toContain("ownerUserId: userId");
    expect(source).toContain("result.runtimeBinding = binding;");
  });

  it("processAgentUpdateChanges accepts userId and previousAgent, writes ownerUserId when apiSource is cli", () => {
    // Lock the UPDATE HELPER SIGNATURE - must carry userId parameter
    expect(source).toContain("const processAgentUpdateChanges = (");
    expect(source).toContain("data: Partial<AgentFormData>");
    expect(source).toContain("userId: string");

    // Lock the UPDATE CALL SITE - ensures effectiveUserId and previousAgent are passed.
    // `let` (not const) so raw apiKey can be migrated into credentialRef before patch.
    expect(source).toContain("let changes = processAgentUpdateChanges(formData || {}, effectiveUserId, previousAgent)");
    expect(source).toContain("migrateRawApiKeyForAgent");
    expect(source).toContain("createFileCredentialBroker");

    // Lock the effectiveApiSource resolution logic
    expect(source).toContain("const effectiveApiSource = data.apiSource ?? previousAgent?.apiSource");

    // Lock the SET branch: persist binding when effective apiSource is 'cli' or undefined (backward-compatible)
    expect(source).toContain("if (machineId) {");
    expect(source).toContain("// Persist runtimeBinding when effective apiSource is 'cli' or undefined");
    expect(source).toContain("// undefined = tool/legacy partial update without apiSource context → preserve backward compatibility");
    expect(source).toContain('if (effectiveApiSource === "cli" || effectiveApiSource === undefined) {');
    expect(source).toContain("const binding: AgentRuntimeBinding = {");
    expect(source).toContain("ownerUserId: userId");
    expect(source).toContain("changes.runtimeBinding = binding;");

    // Lock the CLEAR branch: unique guard to prevent accidental satisfaction by SET branch
    expect(source).toContain("} else {");
    expect(source).toContain("// CLEAR branch: clear runtimeBinding when effectiveApiSource is 'cli' or undefined (backward-compatible)");
    expect(source).toContain("changes.runtimeBinding = null;");

    // Conservative behavior assertion: when apiSource is not CLI, binding update is silently dropped
    expect(source).toContain("// If apiSource is explicitly non-cli and machineId is supplied, do not create binding");
  });

  it("keeps local agents private and never writes a public copy", () => {
    expect(source).toContain(
      'const effectiveUserId = asOptionalTrimmedString(userId) ?? "local"',
    );
    expect(source).toContain("// Local agents must stay private and never write a public copy.");
    expect(source).toContain('if (effectiveUserId === "local") {');
    expect(source).toContain("agent.isPublic = false;");
    expect(source).toContain('effectiveUserId !== "local"');
    expect(source).toContain("userId: effectiveUserId");
  });

  it("persists hosted exec runtime policy through create and update without inventing a new agent spec", () => {
    expect(source).toContain("../../agent-runtime/runtimeToolPolicy");
    expect(source).not.toContain('from "agent-runtime"');
    expect(source).toContain("normalizeRuntimeToolPolicy");
    expect(source).toContain('"runtimeToolPolicy" in data');
    expect(source).toContain("const rawRuntimeToolPolicy = (data as any).runtimeToolPolicy");
    expect(source).toContain("changes.runtimeToolPolicy =");
    expect(source).toContain("rawRuntimeToolPolicy === null");
    expect(source).toContain("normalizeRuntimeToolPolicy(rawRuntimeToolPolicy) ?? null");
    expect(source).toContain("result.runtimeToolPolicy = normalizeRuntimeToolPolicy");
    expect(source).toContain("runtimeTools");
    expect(source).toContain("workspace");
    expect(source).toContain("mode");
    expect(source).not.toContain("agentSpec");
    expect(source).not.toContain("specPageKey");
  });
});
