import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  buildNoloWorkspaceCommandArgs,
  buildNoloWorkspaceOpenAiTools,
  filterNoloDialogSubjectRefEvidence,
  verifyNoloDialogSubjectRefQuery,
} from "./noloWorkspaceTools";
import { buildLoadSkillExecutor } from "./noloWorkspaceTools.node";
import { resolveSkillByName } from "./skillDiscovery";

describe("nolo workspace tools", () => {
  test("readDialog tool documents dbKey/URL preference over bare ids", () => {
    const tools = buildNoloWorkspaceOpenAiTools({
      toolNames: ["readDialog"],
    });
    expect(tools).toHaveLength(1);
    const readDialog = (tools[0] as any).function;
    expect(readDialog.name).toBe("readDialog");
    expect(readDialog.description).toContain("dialog-<userId>-<id>");
    expect(readDialog.description).toMatch(/bare id/i);
    expect(readDialog.description).toContain("listDialogs");
    const dialogParam =
      readDialog.parameters.properties.dialog;
    expect(dialogParam.description).toContain("dialog-<userId>-<id>");
    expect(readDialog.parameters.required).toEqual(["dialog"]);
  });

  test("readDialog steers agent-run polling to controlAgentRun and exposes mode/user/server", () => {
    const tools = buildNoloWorkspaceOpenAiTools({ toolNames: ["readDialog"] });
    const readDialog = (tools[0] as any).function;
    expect(readDialog.description).toContain("controlAgentRun");
    expect(readDialog.description).toMatch(/done\/failed\/cancelled/i);
    expect(readDialog.parameters.properties.mode.enum).toEqual(["full", "status"]);
    expect(readDialog.parameters.properties.user.description).toMatch(/bare dialog id/i);
    expect(readDialog.parameters.properties.server.description).toMatch(/server/i);
    expect(readDialog.parameters.properties.limit.description).toMatch(/newest first/i);
  });

  test("maps readDialog to dialog read with limit, user and server", () => {
    expect(buildNoloWorkspaceCommandArgs({
      name: "readDialog",
      arguments: JSON.stringify({
        dialog: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        limit: 5,
        user: "0e95801d90",
        server: "https://nolo.chat",
      }),
    })).toEqual([
      "dialog",
      "read",
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "5",
      "--user",
      "0e95801d90",
      "--server",
      "https://nolo.chat",
    ]);
  });

  test("rejects an unknown readDialog mode instead of silently reading the full transcript", () => {
    expect(() => buildNoloWorkspaceCommandArgs({
      name: "readDialog",
      arguments: JSON.stringify({ dialog: "01ARZ3NDEKTSV4RRFFQ69G5FAV", mode: "summary" }),
    })).toThrow(/mode must be/i);
  });

  test("maps readDialog mode=status to dialog status without a message limit", () => {
    expect(buildNoloWorkspaceCommandArgs({
      name: "readDialog",
      arguments: JSON.stringify({
        dialog: "dialog-0e95801d90-01ARZ3NDEKTSV4RRFFQ69G5FAV",
        mode: "status",
        limit: 5,
      }),
    })).toEqual([
      "dialog",
      "status",
      "dialog-0e95801d90-01ARZ3NDEKTSV4RRFFQ69G5FAV",
    ]);
  });

  test("exposes queryDialogsBySubjectRef as a generic subject ref dialog evidence tool", () => {
    const tools = buildNoloWorkspaceOpenAiTools({
      toolNames: ["queryDialogsBySubjectRef"],
    });

    expect(tools).toHaveLength(1);
    expect((tools[0] as any).function.name).toBe("queryDialogsBySubjectRef");
    expect((tools[0] as any).function.parameters.properties).toMatchObject({
      subjectKind: { type: "string" },
      subjectId: { type: "string" },
      rowDbKey: { type: "string" },
      excludeDialogId: { type: "string" },
      limit: { type: "integer" },
    });
  });

  test("maps queryDialogsBySubjectRef to the generic dialog query CLI", () => {
    expect(buildNoloWorkspaceCommandArgs({
      name: "queryDialogsBySubjectRef",
      arguments: JSON.stringify({
        rowDbKey: "row-user-board-task",
        limit: 25,
        excludeDialogId: "01CURRENTDIALOG0000000000",
      }),
    })).toEqual([
      "dialog",
      "query",
      "--row-dbkey",
      "row-user-board-task",
      "--limit",
      "25",
      "--exclude-dialog",
      "01CURRENTDIALOG0000000000",
      "--json",
    ]);

    expect(buildNoloWorkspaceCommandArgs({
      name: "queryDialogsBySubjectRef",
      arguments: JSON.stringify({
        subjectKind: "page",
        subjectId: "page-user-doc",
        subjectRole: "artifact",
      }),
    })).toEqual([
      "dialog",
      "query",
      "--subject-kind",
      "page",
      "--subject-id",
      "page-user-doc",
      "--subject-role",
      "artifact",
      "--json",
    ]);
  });

  test("workspace prompt and listAgents describe runnable agentKey usage", () => {
    const tools = buildNoloWorkspaceOpenAiTools({
      toolNames: ["listAgents"],
    });
    expect(tools[0].function.description).toContain("runnable agentKey");
    expect(tools[0].function.description).toContain("Copy the agentKey verbatim");
    expect(tools[0].function.description).toContain("do not infer it from the display name");
  });

  test("readAgent requires the runnable agentKey from listAgents", () => {
    const tools = buildNoloWorkspaceOpenAiTools({
      toolNames: ["readAgent"],
    });
    expect(tools).toHaveLength(1);
    const readAgent = (tools[0] as any).function;
    expect(readAgent.description).toContain("exact agentKey returned by listAgents");
    expect(readAgent.description).toContain("do not use the display name");
    expect(readAgent.parameters.properties.agent.description).toContain("copy verbatim");
    expect(readAgent.parameters.properties.agent.description).toContain("compatibility fallbacks");
  });

  test("maps listAgents to agent list CLI with --json --safe", () => {
    expect(buildNoloWorkspaceCommandArgs({
      name: "listAgents",
      arguments: JSON.stringify({
        space: "space-123",
        publicOnly: true,
      }),
    })).toEqual([
      "agent",
      "list",
      "--space",
      "space-123",
      "--public-only",
      "--json",
      "--safe",
    ]);
  });

  test("excludes current dialog candidates from subject ref evidence and strict counts", () => {
    const target = { kind: "table-row", id: "row-user-board-task", role: "task" };
    const dialogs = [
      {
        dbKey: "dialog-user-1-01CURRENTDIALOG0000000000",
        id: "01CURRENTDIALOG0000000000",
        title: "Current tool caller",
        updatedAt: "2026-06-12T03:00:00.000Z",
        subjectRefs: [target],
      },
      {
        dbKey: "dialog-user-1-01PREVIOUSDIALOG00000000",
        id: "01PREVIOUSDIALOG00000000",
        title: "Previous implementation",
        updatedAt: "2026-06-12T02:00:00.000Z",
        subjectRefs: [target],
      },
      {
        dbKey: "dialog-user-1-01UNRELATEDDIALOG0000000",
        id: "01UNRELATEDDIALOG0000000",
        title: "Other row",
        updatedAt: "2026-06-12T01:00:00.000Z",
        subjectRefs: [{ kind: "table-row", id: "row-other-task", role: "task" }],
      },
    ];

    const strict = verifyNoloDialogSubjectRefQuery(dialogs, target, {
      excludeDialogIds: ["dialog-user-1-01CURRENTDIALOG0000000000"],
    });
    const evidence = filterNoloDialogSubjectRefEvidence({
      dialogs,
      target,
      limit: 10,
      excludeDialogIds: ["01CURRENTDIALOG0000000000"],
    });

    expect(strict).toMatchObject({
      returnedCount: 2,
      matchedCount: 1,
      unmatchedCount: 1,
    });
    expect(evidence.map((dialog) => dialog.dialogId)).toEqual([
      "01PREVIOUSDIALOG00000000",
    ]);
  });
});

describe("loadSkill tool", () => {
  test("is registered as a workspace tool with a required name parameter", () => {
    const tools = buildNoloWorkspaceOpenAiTools({ toolNames: ["loadSkill"] });
    expect(tools).toHaveLength(1);
    expect((tools[0] as any).function.name).toBe("loadSkill");
    expect((tools[0] as any).function.parameters.properties).toMatchObject({
      name: { type: "string" },
    });
    expect((tools[0] as any).function.parameters.required).toEqual(["name"]);
  });

  test("has no CLI mapping — buildNoloWorkspaceCommandArgs throws so a miswired host fails loudly", () => {
    expect(() =>
      buildNoloWorkspaceCommandArgs({
        name: "loadSkill",
        arguments: JSON.stringify({ name: "deployment" }),
      }),
    ).toThrow(/loadSkill.*no CLI mapping/);
  });

  describe("resolveSkillByName", () => {
    test("resolves .agents/skills/<name>/SKILL.md by directory stem", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-resolve-agents-"));
      try {
        const skillDir = join(tempDir, ".agents", "skills", "deployment");
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(
          join(skillDir, "SKILL.md"),
          "---\nname: deployment\ndescription: deploy\n---\nbody",
          "utf8",
        );
        const resolved = resolveSkillByName(tempDir, "deployment");
        expect(resolved).toBe(join(tempDir, ".agents", "skills", "deployment", "SKILL.md"));
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("prefers .agents/skills when skill exists", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-resolve-prio-"));
      try {
        const agentsDir = join(tempDir, ".agents", "skills", "shared");
        mkdirSync(agentsDir, { recursive: true });
        writeFileSync(join(agentsDir, "SKILL.md"), "---\nname: shared\n---\nfrom agents", "utf8");
        const resolved = resolveSkillByName(tempDir, "shared");
        expect(resolved).toBe(join(tempDir, ".agents", "skills", "shared", "SKILL.md"));
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("returns null for an unknown name", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-resolve-miss-"));
      try {
        expect(resolveSkillByName(tempDir, "nope")).toBeNull();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("returns null for an empty/whitespace name without touching the fs", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-resolve-empty-"));
      try {
        expect(resolveSkillByName(tempDir, "")).toBeNull();
        expect(resolveSkillByName(tempDir, "   ")).toBeNull();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("rejects path-traversal inputs without escaping the skill dir", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-resolve-traversal-"));
      try {
        // Place a real SKILL.md outside the skill dir that a traversal input
        // would resolve to: `../package` joined onto `.agents/skills` lands on
        // `.agents/package/SKILL.md`. Without the guard this would be read.
        const baitDir = join(tempDir, ".agents", "package");
        mkdirSync(baitDir, { recursive: true });
        writeFileSync(
          join(baitDir, "SKILL.md"),
          "---\nname: bait\n---\nshould not be loaded",
          "utf8",
        );
        expect(resolveSkillByName(tempDir, "../package")).toBeNull();
        expect(resolveSkillByName(tempDir, "../../etc/passwd")).toBeNull();
        expect(resolveSkillByName(tempDir, "a/b")).toBeNull();
        expect(resolveSkillByName(tempDir, "a\\b")).toBeNull();
        expect(resolveSkillByName(tempDir, "..")).toBeNull();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("frontmatter scan skips a malformed sibling SKILL.md and still resolves a later match", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-resolve-badyaml-"));
      try {
        const agentsDir = join(tempDir, ".agents", "skills");
        mkdirSync(agentsDir, { recursive: true });
        // A malformed SKILL.md. parseSkillFrontmatter already swallows YAML
        // errors; the regression we guard is that the outer try/catch
        // previously wrapped the whole loop, so a throw from one entry would
        // abort scanning the rest. We assert the good sibling is still found.
        const brokenDir = join(agentsDir, "broken");
        mkdirSync(brokenDir, { recursive: true });
        writeFileSync(
          join(brokenDir, "SKILL.md"),
          "---\nname: \n description: [unterminated\n---\nbody",
          "utf8",
        );
        const goodDir = join(agentsDir, "good");
        mkdirSync(goodDir, { recursive: true });
        writeFileSync(
          join(goodDir, "SKILL.md"),
          "---\nname: good-skill\ndescription: ok\n---\nbody",
          "utf8",
        );
        expect(resolveSkillByName(tempDir, "good-skill")).toBe(
          join(agentsDir, "good", "SKILL.md"),
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("buildLoadSkillExecutor", () => {
    test("success: returns the contract content with SKILL.md inline", async () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-loadskill-ok-"));
      try {
        const skillDir = join(tempDir, ".agents", "skills", "nolo-commit");
        mkdirSync(skillDir, { recursive: true });
        const body = "---\nname: nolo-commit\ndescription: commit rules\n---\nFollow these commit rules.";
        writeFileSync(join(skillDir, "SKILL.md"), body, "utf8");

        const executor = buildLoadSkillExecutor({ cwd: tempDir });
        const result = await executor({
          name: "loadSkill",
          arguments: JSON.stringify({ name: "nolo-commit" }),
        });
        expect(result.content).toBe(
          `Skill "nolo-commit" loaded inline. Follow its instructions.\n\n${body}`,
        );
        expect(result.metadata).toMatchObject({
          loadSkill: true,
          resolved: true,
          name: "nolo-commit",
          requestedName: "nolo-commit",
        });
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("unknown name: returns a plain text result listing available skills (no throw)", async () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-loadskill-miss-"));
      try {
        // Two discoverable skills in .agents/skills so the message lists them.
        // Only .agents/skills is scanned; docs/skills is not a discovery source.
        const a = join(tempDir, ".agents", "skills", "deployment");
        mkdirSync(a, { recursive: true });
        writeFileSync(join(a, "SKILL.md"), "---\nname: deployment\n---\nx", "utf8");
        const b = join(tempDir, ".agents", "skills", "nolo-commit");
        mkdirSync(b, { recursive: true });
        writeFileSync(join(b, "SKILL.md"), "---\nname: nolo-commit\n---\nz", "utf8");
        const docsDir = join(tempDir, "docs", "skills");
        mkdirSync(docsDir, { recursive: true });
        writeFileSync(join(docsDir, "legacy.md"), "---\nname: legacy\n---\ny", "utf8");

        const executor = buildLoadSkillExecutor({ cwd: tempDir });
        const result = await executor({
          name: "loadSkill",
          arguments: JSON.stringify({ name: "nope" }),
        });
        expect(result.content).toContain('Skill "nope" not found');
        expect(result.content).toContain("Available skills:");
        expect(result.content).toContain("deployment");
        expect(result.content).toContain("nolo-commit");
        expect(result.content).not.toContain("legacy");
        expect(result.metadata).toMatchObject({ loadSkill: true, resolved: false, name: "nope", requestedName: "nope" });
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("unknown name with no discoverable skills: lists nothing without throwing", async () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-loadskill-empty-"));
      try {
        const executor = buildLoadSkillExecutor({ cwd: tempDir });
        const result = await executor({
          name: "loadSkill",
          arguments: JSON.stringify({ name: "ghost" }),
        });
        expect(result.content).toContain('Skill "ghost" not found');
        expect(result.content).toContain("No skills were discovered");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("resolves .agents/skills/<name>/SKILL.md through the executor too", async () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-loadskill-agents-"));
      try {
        const skillDir = join(tempDir, ".agents", "skills", "legacy");
        mkdirSync(skillDir, { recursive: true });
        const body = "---\nname: legacy\ndescription: legacy\n---\nlegacy body";
        writeFileSync(join(skillDir, "SKILL.md"), body, "utf8");

        const executor = buildLoadSkillExecutor({ cwd: tempDir });
        const result = await executor({
          name: "loadSkill",
          arguments: JSON.stringify({ name: "legacy" }),
        });
        expect(result.content).toBe(
          `Skill "legacy" loaded inline. Follow its instructions.\n\n${body}`,
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("accepts skillName/skill aliases for the name argument", async () => {
      const tempDir = mkdtempSync(join(tmpdir(), "nolo-loadskill-alias-"));
      try {
        const skillDir = join(tempDir, ".agents", "skills", "alias-skill");
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(join(skillDir, "SKILL.md"), "---\nname: alias-skill\n---\nbody", "utf8");

        const executor = buildLoadSkillExecutor({ cwd: tempDir });
        const result = await executor({
          name: "loadSkill",
          arguments: JSON.stringify({ skillName: "alias-skill" }),
        });
        expect(result.content).toContain('Skill "alias-skill" loaded inline');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
