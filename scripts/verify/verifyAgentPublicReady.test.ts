import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

import {
  buildAgentRecordText,
  derivePublicAliasKey,
  inspectPublicAgentMemoryIsolation,
} from "./verifyAgentPublicReady";

describe("verifyAgentPublicReady source", () => {
  test("loads spec file, reads agent record, and uses evaluateAgentPublicReadiness", () => {
    const source = readFileSync(
      "./scripts/verify/verifyAgentPublicReady.ts",
      "utf8",
    );

    expect(source).toContain("--spec-file");
    expect(source).toContain("parseAgentCreationSpec");
    expect(source).toContain("evaluateAgentPublicReadiness");
    expect(source).toContain("fetchAgentRecord");
    expect(source).toContain("validateEvalCases");
    expect(source).toContain("publicGate");
  });

  test("derives public alias key from private agent key", () => {
    expect(derivePublicAliasKey("agent-0e95801d90-01NIHAISHATCMMVP000001ABCD")).toBe(
      "agent-pub-01NIHAISHATCMMVP000001ABCD",
    );
  });

  test("builds public-gate record text from maintained agent fields", () => {
    const text = buildAgentRecordText({
      name: "课程助手",
      greeting: "你好",
      introduction: "研读课程",
      prompt: "必须列出参考资料",
      tags: ["中医", "课程"],
      references: [{ title: "伤寒论讲稿" }, { dbKey: "page-index" }],
    });

    expect(text).toContain("课程助手");
    expect(text).toContain("研读课程");
    expect(text).toContain("必须列出参考资料");
    expect(text).toContain("中医");
    expect(text).toContain("伤寒论讲稿");
    expect(text).toContain("page-index");
  });

  test("exports verifyAgentPublicReady for programmatic use", () => {
    const source = readFileSync(
      "./scripts/verify/verifyAgentPublicReady.ts",
      "utf8",
    );
    expect(source).toContain("export async function verifyAgentPublicReady");
  });

  test("exports fetchReferenceReadabilityResults for programmatic use", () => {
    const source = readFileSync(
      "./scripts/verify/verifyAgentPublicReady.ts",
      "utf8",
    );
    expect(source).toContain("export async function fetchReferenceReadabilityResults");
  });

  test("source loads reference readability when gate requires it", () => {
    const source = readFileSync(
      "./scripts/verify/verifyAgentPublicReady.ts",
      "utf8",
    );
    expect(source).toContain("requireReferenceReadability");
    expect(source).toContain("fetchReferenceReadabilityResults");
    expect(source).toContain("referenceReadabilityResults");
  });

  test("source uses apiGet with public agent key for reference reads", () => {
    const source = readFileSync(
      "./scripts/verify/verifyAgentPublicReady.ts",
      "utf8",
    );
    expect(source).toContain('import { apiGet } from "../helpers/apiHelpers"');
    expect(source).toContain("apiGet(");
    expect(source).toContain("agentKey=");
    expect(source).toContain("derivePublicAliasKey(agentKey)");
  });

  test("exports and uses public agent memory isolation inspection", () => {
    const source = readFileSync(
      "./scripts/verify/verifyAgentPublicReady.ts",
      "utf8",
    );
    expect(source).toContain("export function inspectPublicAgentMemoryIsolation");
    expect(source).toContain("inspectPublicAgentMemoryIsolation()");
    expect(source).toContain("memoryInjectionResult");
  });

  test("public agent memory isolation inspection passes current source contract", () => {
    const result = inspectPublicAgentMemoryIsolation(".");
    expect(result.hasUnrelatedUserGlobalMemory).toBe(false);
    expect(result.detail).toContain("verified");
  });
});
