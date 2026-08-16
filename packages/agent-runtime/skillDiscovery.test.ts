import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discoverSkills, parseSkillFrontmatter, buildSkillDiscoveryContextBlock } from "./skillDiscovery";

describe("discoverSkills", () => {
  it("returns [] when no skill directories exist", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-discover-empty-"));
    try {
      expect(discoverSkills(tempDir)).toEqual([]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scans .agents/skills/<name>/SKILL.md and extracts name + description", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-discover-agents-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "deployment");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: deployment\ndescription: How to deploy the app\n---\nbody",
        "utf8",
      );
      const skills = discoverSkills(tempDir);
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("deployment");
      expect(skills[0].description).toBe("How to deploy the app");
      expect(skills[0].relativePath).toBe(
        join(".agents", "skills", "deployment", "SKILL.md"),
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("does NOT scan docs/skills (only .agents/skills is scanned)", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-discover-no-docs-"));
    try {
      const docsDir = join(tempDir, "docs", "skills");
      mkdirSync(docsDir, { recursive: true });
      writeFileSync(
        join(docsDir, "legacy.md"),
        "---\nname: legacy\ndescription: Legacy skill doc\n---\nbody",
        "utf8",
      );
      // docs/skills is not a discovery source; only .agents/skills is scanned.
      const skills = discoverSkills(tempDir);
      expect(skills).toEqual([]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("discovers a skill from .agents/skills only (no duplication possible)", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-discover-nodupe-"));
    try {
      const agentsDir = join(tempDir, ".agents", "skills", "shared");
      mkdirSync(agentsDir, { recursive: true });
      writeFileSync(
        join(agentsDir, "SKILL.md"),
        "---\nname: shared\n---\nfrom agents",
        "utf8");
      const skills = discoverSkills(tempDir);
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("shared");
      expect(skills[0].relativePath).toBe(
        join(".agents", "skills", "shared", "SKILL.md"),
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("caps each description at 200 chars (per-skill limit, independent of total budget)", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-discover-percap-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "verbose");
      mkdirSync(skillDir, { recursive: true });
      const longDesc = "A".repeat(350);
      writeFileSync(
        join(skillDir, "SKILL.md"),
        `---\nname: verbose\ndescription: ${longDesc}\n---\nbody`,
        "utf8",
      );
      const skills = discoverSkills(tempDir);
      expect(skills).toHaveLength(1);
      // Per-skill 200-char cap applies regardless of total budget — the
      // discovery list is a menu; each entry stays short. Authors should
      // front-load triggers so the cap preserves them.
      expect(skills[0].description.length).toBe(200);
      expect(skills[0].description).toBe(longDesc.slice(0, 200));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("preserves short descriptions under the per-skill cap", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-discover-short-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "short");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: short\ndescription: A concise skill.\n---\nbody",
        "utf8",
      );
      const skills = discoverSkills(tempDir);
      expect(skills[0].description).toBe("A concise skill.");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("parseSkillFrontmatter", () => {
  it("returns {} when no frontmatter present", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-parse-nofm-"));
    try {
      const filePath = join(tempDir, "SKILL.md");
      writeFileSync(filePath, "# Just a heading\nno frontmatter here", "utf8");
      expect(parseSkillFrontmatter(filePath)).toEqual({});
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("truncates content to 2KB but still extracts frontmatter at the top", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-parse-trunc-"));
    try {
      const filePath = join(tempDir, "SKILL.md");
      const longBody = "x".repeat(4000);
      writeFileSync(
        filePath,
        `---\nname: trunc-skill\ndescription: truncated body skill\n---\n${longBody}`,
        "utf8",
      );
      const parsed = parseSkillFrontmatter(filePath);
      expect(parsed.name).toBe("trunc-skill");
      expect(parsed.description).toBe("truncated body skill");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("parses folded block scalar description (>-) across multiple indented lines", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-parse-block-"));
    try {
      const filePath = join(tempDir, "SKILL.md");
      writeFileSync(
        filePath,
        [
          "---",
          "name: nolo-commit",
          "description: >-",
          "  bun-nolo 的 commit 规则：分组标准、必填的 AI 署名。",
          "  触发词：commit、提交、git commit。",
          "---",
          "body",
        ].join("\n"),
        "utf8",
      );
      const parsed = parseSkillFrontmatter(filePath);
      expect(parsed.name).toBe("nolo-commit");
      expect(parsed.description).toContain("commit 规则");
      expect(parsed.description).toContain("触发词");
      // folded scalar joins lines with spaces
      expect(parsed.description).not.toContain("\n");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("parses folded block scalar description (>-) with blank-line paragraph breaks", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-parse-block-blank-"));
    try {
      const filePath = join(tempDir, "SKILL.md");
      writeFileSync(
        filePath,
        [
          "---",
          "name: multi-para",
          "description: >-",
          "  para one line a",
          "  para one line b",
          "",
          "  para two after blank",
          "---",
          "body",
        ].join("\n"),
        "utf8",
      );
      const parsed = parseSkillFrontmatter(filePath);
      expect(parsed.name).toBe("multi-para");
      expect(parsed.description).toContain("para one line a");
      expect(parsed.description).toContain("para two after blank");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("parses literal block scalar description (|)", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-parse-literal-"));
    try {
      const filePath = join(tempDir, "SKILL.md");
      writeFileSync(
        filePath,
        [
          "---",
          "name: literal-skill",
          "description: |",
          "  Line one.",
          "  Line two.",
          "---",
          "body",
        ].join("\n"),
        "utf8",
      );
      const parsed = parseSkillFrontmatter(filePath);
      expect(parsed.name).toBe("literal-skill");
      expect(parsed.description).toContain("Line one");
      expect(parsed.description).toContain("Line two");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("buildSkillDiscoveryContextBlock", () => {
  it("returns null when no skill directories exist", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-helper-empty-"));
    try {
      expect(buildSkillDiscoveryContextBlock(tempDir)).toBeNull();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns a model-readable skill index string when skills are found", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-helper-found-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "nolo-commit");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        [
          "---",
          "name: nolo-commit",
          "description: >-",
          "  commit rules: AI signature trailer.",
          "---",
          "body",
        ].join("\n"),
        "utf8",
      );
      const block = buildSkillDiscoveryContextBlock(tempDir);
      expect(block).not.toBeNull();
      expect(block).toContain("可用技能");
      expect(block).toContain("nolo-commit");
      expect(block).toContain("readFile");
      expect(block).toContain(
        join(".agents", "skills", "nolo-commit", "SKILL.md"),
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});