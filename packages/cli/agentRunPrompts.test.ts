import { describe, expect, test } from "bun:test";
import { existsSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveSkillReference } from "./agentRunPrompts";

describe("agentRunPrompts - skill integration", () => {
  test("resolveSkillReference dbKey branch returns page content", async () => {
    const mockRecord = {
      content: `
<!-- skill-config
name: Mock Skill
description: mock skill from db
promptPatch: Patch instruction
-->

This is custom skill content from DB`,
    };
    const readDbRecord = async (dbKey: string) => {
      expect(dbKey).toBe("page-12345-abc");
      return mockRecord;
    };
    const resolved = await resolveSkillReference("page-12345-abc", {
      readDbRecord,
    });
    expect(resolved.ref).toBe("page-12345-abc");
    expect(resolved.content).toContain("This is custom skill content from DB");
    expect(resolved.name).toBe("Mock Skill");
    expect(resolved.promptPatch).toBe("Patch instruction");
  });

  test("resolveSkillReference throws error if dbKey read fails or returns empty", async () => {
    const readDbRecord = async () => null;
    await expect(
      resolveSkillReference("page-12345-abc", { readDbRecord })
    ).rejects.toThrow("Skill reference has no content: page-12345-abc");
  });

  test("resolveSkillReference local md resolution works", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-skills-test-"));
    const skillDir = join(tempDir, ".agents", "skills", "local-test-skill");
    mkdirSync(skillDir, { recursive: true });

    const testFileContent = `
<!-- skill-config
name: Local Test Skill
description: local skill configuration
promptPatch: Local Prompt Patch
-->

# Local Test Title
This is local body content.
`;
    const skillFilePath = join(skillDir, "SKILL.md");
    writeFileSync(skillFilePath, testFileContent, "utf8");

    let resolved;
    try {
      resolved = await resolveSkillReference("local-test-skill", {
        cwd: tempDir,
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    expect(resolved.name).toBe("Local Test Skill");
    expect(resolved.promptPatch).toBe("Local Prompt Patch");
    expect(resolved.content).toContain("# Local Test Title");
    expect(resolved.content).toContain("This is local body content.");
  });

  test("buildSkillContextBlocks dedup and format", () => {
    const { buildSkillContextBlocks } = require("./agentRunPrompts");
    expect(buildSkillContextBlocks()).toEqual([]);
    expect(buildSkillContextBlocks([])).toEqual([]);
    const blocks = buildSkillContextBlocks([
      { ref: "skill-a", content: "Skill A Body", name: "Nice Skill A", promptPatch: "Patch A" },
      { ref: "skill-a", content: "Skill A Body", name: "Nice Skill A", promptPatch: "Patch A" },
      { ref: "skill-b", content: "Skill B Body" },
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("## Nice Skill A");
    expect(blocks[0]).toContain("Patch A");
    expect(blocks[0]).toContain("Skill A Body");
    expect(blocks[1]).toContain("## skill-b");
  });
});

describe("skillRefToCandidatePath - P0 conventional dirs", () => {
  const { skillRefToCandidatePath } = require("./agentRunPrompts");

  test("finds SKILL.md in .agents/skills/<name>/SKILL.md", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-p0-test-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "deployment");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "---\nname: deployment\n---\nbody", "utf8");
      const path = skillRefToCandidatePath(tempDir, "deployment");
      expect(path).toBe(join(tempDir, ".agents", "skills", "deployment", "SKILL.md"));
      expect(existsSync(path)).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("prefers .agents/skills when skill exists", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-p0-test-"));
    try {
      const agentsDir = join(tempDir, ".agents", "skills", "my-skill");
      mkdirSync(agentsDir, { recursive: true });
      writeFileSync(join(agentsDir, "SKILL.md"), "---\nname: my-skill\n---\nfrom agents", "utf8");
      const path = skillRefToCandidatePath(tempDir, "my-skill");
      expect(path).toContain(".agents/skills/my-skill/SKILL.md");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("resolveSkillReference - P1 directory skill", () => {
  test("resolves SKILL.md from .agents/skills with frontmatter name", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-p1-test-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "test-skill");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: test-skill\ndescription: A test skill\n---\n# Test Skill\nBody content here.",
        "utf8",
      );
      const resolved = await resolveSkillReference("test-skill", { cwd: tempDir });
      expect(resolved.name).toBe("test-skill");
      expect(resolved.content).toContain("Body content here.");
      expect(resolved.skillDir).toBeDefined();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("inlines relative path references from references/ subdirectory", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-p1-test-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "ref-skill");
      const refsDir = join(skillDir, "references");
      mkdirSync(refsDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: ref-skill\ndescription: skill with refs\n---\nSee [style guide](./references/style.md) for details.",
        "utf8",
      );
      writeFileSync(join(refsDir, "style.md"), "# Style Guide\nBe consistent.", "utf8");
      const resolved = await resolveSkillReference("ref-skill", { cwd: tempDir });
      expect(resolved.content).toContain("Be consistent.");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("lists scripts/ subdirectory entries", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-p1-test-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "script-skill");
      const scriptsDir = join(skillDir, "scripts");
      mkdirSync(scriptsDir, { recursive: true });
      writeFileSync(join(scriptsDir, "deploy.sh"), "#!/bin/sh\necho deploy", "utf8");
      writeFileSync(join(scriptsDir, "build.sh"), "#!/bin/sh\necho build", "utf8");
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: script-skill\ndescription: skill with scripts\n---\nRun the scripts.",
        "utf8",
      );
      const resolved = await resolveSkillReference("script-skill", { cwd: tempDir });
      expect(resolved.content).toContain("scripts/deploy.sh");
      expect(resolved.content).toContain("scripts/build.sh");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("resolveSkillReference - P3 allowed-tools", () => {
  test("extracts allowed-tools from SKILL.md frontmatter", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-p3-test-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "tools-skill");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: tools-skill\ndescription: skill with allowed-tools\nallowed-tools: readFile writeFile execShell\n---\nBody.",
        "utf8",
      );
      const resolved = await resolveSkillReference("tools-skill", { cwd: tempDir });
      expect(resolved.allowedTools).toEqual(["readFile", "writeFile", "execShell"]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("allowedTools is absent when frontmatter has no allowed-tools", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-p3-test-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "no-tools-skill");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: no-tools-skill\ndescription: skill without allowed-tools\n---\nBody.",
        "utf8",
      );
      const resolved = await resolveSkillReference("no-tools-skill", { cwd: tempDir });
      expect(resolved.allowedTools).toBeUndefined();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
