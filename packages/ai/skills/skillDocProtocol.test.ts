import { describe, expect, it } from "bun:test";
import {
  buildSkillDocMarkdown,
  buildWorkflowConfigComment,
  normalizeSkillModalities,
  normalizeStringArray,
  parseExternalSkillMarkdown,
  parseSkillDocProtocol,
} from "./skillDocProtocol";

describe("normalizeStringArray pure seam", () => {
  it("returns undefined for non-arrays and empty/whitespace-only lists", () => {
    expect(normalizeStringArray(undefined)).toBeUndefined();
    expect(normalizeStringArray(null)).toBeUndefined();
    expect(normalizeStringArray("a")).toBeUndefined();
    expect(normalizeStringArray([])).toBeUndefined();
    expect(normalizeStringArray(["", "  "])).toBeUndefined();
  });

  it("trims, drops non-strings, and dedupes", () => {
    expect(
      normalizeStringArray(["  a ", "b", "a", 1, null, " b "])
    ).toEqual(["a", "b"]);
  });
});

describe("normalizeSkillModalities pure seam", () => {
  it("filters unknown modalities and keeps unique known ones", () => {
    expect(
      normalizeSkillModalities(["text", "image", "unknown", "text", "  "])
    ).toEqual(["text", "image"]);
    expect(normalizeSkillModalities(["nope"])).toBeUndefined();
    expect(normalizeSkillModalities("text")).toBeUndefined();
  });
});

describe("skillDocProtocol", () => {
  it("extracts skill-config and eval-config blocks from markdown", () => {
    const markdown = `
# Web Research

Use this skill to search the web.

<!-- skill-config
name: Web Research
description: Search the web and summarize findings.
kind: skill
toolNames:
  - exa_search
triggerMode: explicit
-->

<!-- eval-config
cases:
  - input: Compare two products
    expectedTools:
      - exa_search
-->
`.trim();

    const parsed = parseSkillDocProtocol(markdown);
    expect(parsed.content).toContain("# Web Research");
    expect(parsed.content).not.toContain("skill-config");
    expect(parsed.meta?.kind).toBe("skill");
    expect(parsed.meta?.skillConfig?.toolNames).toEqual(["exa_search"]);
    expect(parsed.meta?.evalConfig?.cases[0]?.expectedTools).toEqual(["exa_search"]);
  });

  it("extracts workflow-config blocks without making the doc a skill", () => {
    const markdown = `
# Frontend Implementation

Use this reference when an agent needs to make reviewable UI changes.

<!-- workflow-config
version: "0.1"
kind: workflow
id: bun-nolo/frontend-implementation
name: Frontend Implementation
description: Produce reviewable frontend changes with visual evidence.
defaultAgent: frontend-implementer
inputs:
  - msg
  - taskRowDbKey
recommendedTools:
  - queryTableRows
  - searchDialogMessages
  - captureVisualState
requiredOutputs:
  - dialogId
  - verification
gates:
  - reviewableChange
  - visualEvidence
-->
`.trim();

    const parsed = parseSkillDocProtocol(markdown);

    expect(parsed.content).toContain("# Frontend Implementation");
    expect(parsed.content).not.toContain("workflow-config");
    expect(parsed.meta?.kind).toBe("instruction");
    expect(parsed.meta?.workflowConfig).toEqual({
      version: "0.1",
      kind: "workflow",
      id: "bun-nolo/frontend-implementation",
      name: "Frontend Implementation",
      description: "Produce reviewable frontend changes with visual evidence.",
      defaultAgent: "frontend-implementer",
      inputs: ["msg", "taskRowDbKey"],
      recommendedTools: ["queryTableRows", "searchDialogMessages", "captureVisualState"],
      requiredOutputs: ["dialogId", "verification"],
      gates: ["reviewableChange", "visualEvidence"],
    });
  });

  it("builds markdown with hidden protocol blocks", () => {
    const markdown = buildSkillDocMarkdown({
      body: "Skill body",
      skillConfig: {
        version: "0.1",
        kind: "skill",
        id: "web-research",
        name: "Web Research",
        description: "Search the web",
        toolNames: ["exa_search"],
        triggerMode: "explicit",
      },
    });

    expect(markdown).toContain("Skill body");
    expect(markdown).toContain("<!-- skill-config");
    expect(markdown).toContain("exa_search");

    // round-trip：build 产出的文档必须能被 parseSkillDocProtocol 解析出工具面
    const parsed = parseSkillDocProtocol(markdown);
    expect(parsed.meta?.skillConfig?.id).toBe("web-research");
    expect(parsed.meta?.skillConfig?.toolNames).toEqual(["exa_search"]);
    expect(parsed.meta?.skillConfig?.triggerMode).toBe("explicit");
    expect(parsed.content).toContain("Skill body");
  });

  it("builds workflow-config hidden blocks", () => {
    const block = buildWorkflowConfigComment({
      version: "0.1",
      kind: "workflow",
      id: "film/storyboard-review",
      name: "Storyboard Review",
      description: "Review storyboard frames.",
      defaultAgent: "storyboard-reviewer",
      inputs: ["brief", "assetRefs"],
      gates: ["assetCoverage"],
    });

    expect(block).toContain("<!-- workflow-config");
    expect(block).toContain("id: film/storyboard-review");
    expect(parseSkillDocProtocol(`# Storyboard\n\n${block}`).meta?.workflowConfig).toMatchObject({
      id: "film/storyboard-review",
      name: "Storyboard Review",
      inputs: ["brief", "assetRefs"],
      gates: ["assetCoverage"],
    });
  });

  it("filters invalid enum values through the shared skill catalog", () => {
    const markdown = `
<!-- skill-config
name: Visual QA
description: Inspect screenshots.
kind: skill
modalities:
  - text
  - image
  - unknown
triggerMode: invalid
-->
`.trim();

    const parsed = parseSkillDocProtocol(markdown);

    expect(parsed.meta?.kind).toBe("skill");
    expect(parsed.meta?.skillConfig?.triggerMode).toBeUndefined();
    // budgetTier/preferredAgents/dispatchPreferred 已从 skill 侧移除（零读点），
    // 存量记录里出现这些 key 时 parser 直接忽略，不需要数据迁移。
    expect((parsed.meta?.skillConfig as any)?.budgetTier).toBeUndefined();
    expect(parsed.meta?.skillConfig?.modalities).toEqual(["text", "image"]);
  });

  it("parses external SKILL.md frontmatter", () => {
    const parsed = parseExternalSkillMarkdown(`
---
name: github-actions-failure-debugging
description: Debug failing GitHub Actions workflows.
allowed-tools: exa_search fetchWebpage
compatibility: requires network access
---

Use this skill when CI fails.
`.trim());

    expect(parsed.name).toBe("github-actions-failure-debugging");
    expect(parsed.allowedTools).toEqual(["exa_search", "fetchWebpage"]);
    expect(parsed.body).toContain("Use this skill");
  });
});
