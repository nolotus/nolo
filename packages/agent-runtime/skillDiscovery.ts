/**
 * Skill discovery: filesystem scanning of SKILL.md files.
 *
 * Host-specific module — imports `node:fs`. Split out of turnContext.ts
 * (which is host-neutral and referenced by cross-host surfaces including
 * the RN renderer) so non-Node hosts don't pull `node:fs` into their bundle.
 *
 * The host-neutral `DiscoveredSkill` interface and `buildSkillDiscoveryLayer`
 * remain in turnContext.ts; this module only owns the fs-touching scan.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { load as loadYaml } from "js-yaml";
import {
  buildSkillDiscoveryCatalogLayer,
  type DiscoveredSkill,
  type TurnContextLayer,
} from "./turnContext";
import {
  applySkillDescriptionBudget,
  DEFAULT_SKILL_CATALOG_BUDGET,
  mapDiscoveredSkillsToCatalogEntries,
  resolveSkillCatalog,
  resolveSkillCatalogSync,
  type SkillCatalog,
  type SkillCatalogBudget,
  type SkillCatalogEntryInput,
  type SkillCatalogSourceProvider,
} from "./skillCatalog";

// Discovery only scans `.agents/skills` — the single skill source-of-truth.
// Each skill lives at `.agents/skills/<name>/SKILL.md`; `resolveSkillByName`
// (below) resolves by directory stem or frontmatter name within this dir.
const SKILL_SCAN_DIRS = [".agents/skills"] as const;
// 目录规模 / 描述预算的常量已迁到 host-neutral 的 `skillCatalog.ts`
// （`DEFAULT_SKILL_CATALOG_BUDGET`）：同一份预算要同时约束本地文件来源和平台
// 来源，两处各存一份就会分叉。语义未变——最多 50 项、描述合计 4000 字符、
// 超预算按比例缩短且每条不低于 80 字符。
const MAX_DISCOVERED_SKILLS = DEFAULT_SKILL_CATALOG_BUDGET.maxEntries;

export function parseSkillFrontmatter(filePath: string): { name?: string; description?: string } {
  try {
    const content = readFileSync(filePath, "utf8").slice(0, 2048);
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return {};
    // Parse the frontmatter as YAML via js-yaml (already a project dep, used in
    // skillDocProtocol.ts). This replaces a hand-rolled regex that broke twice:
    // once on the `>-` chomping indicator, once on blank-line paragraph breaks
    // in folded scalars. js-yaml handles all block scalar variants correctly.
    const fm = (() => {
      try {
        return loadYaml(fmMatch[1]) as Record<string, unknown> | undefined;
      } catch (err) {
        // Surface YAML parse failures instead of silently dropping the skill:
        // a malformed description silently produced an empty description in the
        // discovery list, which was nearly impossible to diagnose. Keep the
        // return behavior unchanged (fall through to the outer catch → {}).
        console.warn(
          `[skillDiscovery] failed to parse frontmatter: ${filePath}: ${(err as Error).message}`,
        );
        throw err;
      }
    })();
    if (!fm || typeof fm !== "object") return {};
    const name = typeof fm.name === "string" ? fm.name : undefined;
    const rawDesc = fm.description;
    // js-yaml already unfolds folded/literal scalars into strings; for
    // non-string values fall back to String() so callers always get text.
    const description =
      typeof rawDesc === "string"
        ? rawDesc
        : rawDesc == null
          ? undefined
          : String(rawDesc);
    // name is a single-segment identifier; keep the 200-char guard as a safety
    // net for malformed frontmatter. description is capped at 200 chars per
    // skill (the discovery list is a menu — each entry should be short; authors
    // should front-load activation triggers so the cap preserves them). A
    // separate total-budget control in discoverSkills guards against skill-count
    // growth; the two layers are independent.
    const sanitizeName = (s: string | undefined) =>
      s?.trim().replace(/^["']|["']$/g, "").replace(/[\n\r]+/g, " ").slice(0, 200);
    const sanitizeDesc = (s: string | undefined) =>
      s?.trim().replace(/^["']|["']$/g, "").replace(/[\n\r]+/g, " ").slice(0, 200);
    return { name: sanitizeName(name), description: sanitizeDesc(description) };
  } catch { return {}; }
}

export function discoverSkills(cwd: string): DiscoveredSkill[] {
  const skills: DiscoveredSkill[] = [];
  for (const dir of SKILL_SCAN_DIRS) {
    if (skills.length >= MAX_DISCOVERED_SKILLS) break;
    const absDir = join(cwd, dir);
    if (!existsSync(absDir) || !statSync(absDir).isDirectory()) continue;
    try {
      for (const entry of readdirSync(absDir)) {
        if (skills.length >= MAX_DISCOVERED_SKILLS) break;
        const skillMdPath = join(absDir, entry, "SKILL.md");
        if (existsSync(skillMdPath)) {
          const { name, description } = parseSkillFrontmatter(skillMdPath);
          skills.push({ name: name ?? entry, description: description ?? "", relativePath: join(dir, entry, "SKILL.md") });
          continue;
        }
      }
    } catch { }
  }
  // Budget control (Codex-style): if total description length exceeds the
  // budget, shorten each description proportionally — keeping the front (where
  // authors should front-load activation triggers) and never below the floor.
  // Shared implementation in skillCatalog.ts: the merged catalog (local +
  // builtin + platform) must apply the exact same rule, and the function is
  // idempotent, so applying it here and again after merge does not double-trim.
  return applySkillDescriptionBudget(skills);
}

/**
 * Resolve a single skill by name to its absolute SKILL.md path, reusing the
 * same scan source as `discoverSkills` (`.agents/skills/<name>/SKILL.md`).
 * This does not re-run the full scan — it probes the candidate path directly
 * and optionally scans siblings for a frontmatter-name match, so it stays
 * O(1) in the common case and never duplicates the discovery logic.
 *
 * Returns the resolved absolute path, or null when no candidate exists. The
 * caller decides what to do with a miss (the `loadSkill` tool returns an
 * available-skills list rather than throwing).
 *
 * Name matching mirrors `discoverSkills`'s advertising: a discovered
 * `.agents/skills/<dir>/SKILL.md` is identified by its directory entry, with
 * frontmatter `name:` as an alias. To stay consistent with advertised names
 * without re-reading frontmatter on every lookup, we match on the directory
 * stem and also accept a frontmatter-name match by reading the file only
 * when the stem doesn't match (so the common path stays cheap).
 */
export function resolveSkillByName(cwd: string, name: string): string | null {
  const trimmed = name.trim();
  // Reject empty / path-traversal inputs before touching the filesystem:
  // a name containing `/`, `\`, or `..` could escape the skill directories and
  // resolve an arbitrary .md. Skill names are single-segment identifiers
  // (e.g. `nolo-commit`), so these characters are never valid here.
  if (!trimmed || trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
    return null;
  }
  // .agents/skills/<name>/SKILL.md — match by directory stem or frontmatter name.
  const agentsDir = join(cwd, ".agents", "skills", trimmed);
  const agentsSkillMd = join(agentsDir, "SKILL.md");
  if (existsSync(agentsSkillMd)) return agentsSkillMd;
  // Frontmatter-name match: scan sibling dirs whose frontmatter name equals
  // the requested name. Kept narrow — only runs when the stem match missed.
  const agentsParent = join(cwd, ".agents", "skills");
  if (existsSync(agentsParent) && statSync(agentsParent).isDirectory()) {
    try {
      for (const entry of readdirSync(agentsParent)) {
        const candidate = join(agentsParent, entry, "SKILL.md");
        if (!existsSync(candidate)) continue;
        // Per-file try/catch: one malformed SKILL.md must not abort the scan
        // of its siblings. (parseSkillFrontmatter already swallows YAML
        // errors; this guards readdirSync/stat edge cases and future changes.)
        try {
          const { name: fmName } = parseSkillFrontmatter(candidate);
          if (fmName && fmName === trimmed) return candidate;
        } catch { /* skip unreadable/bad file, keep scanning */ }
      }
    } catch { /* best-effort, mirror discoverSkills' swallow */ }
  }
  return null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * 技能目录适配器（Node 宿主）
 *
 * 文件扫描结果在这里映射进 `skillCatalog` 的宿主无关契约，再由
 * `turnContext.buildSkillDiscoveryCatalogLayer` 统一渲染。宿主只需提供来源：
 * 本地文件来源由本模块实现，builtin / platform 来源由接线处注入
 * （见 `collectWorkspaceSkillCatalog` 的 `sources`）。
 * ────────────────────────────────────────────────────────────────────────── */

/** 本地工作区文件来源的条目（扫描 `.agents/skills/<name>/SKILL.md`）。 */
export function listLocalWorkspaceSkillCatalogEntries(
  cwd: string,
): SkillCatalogEntryInput[] {
  return mapDiscoveredSkillsToCatalogEntries(discoverSkills(cwd));
}

/**
 * 本地工作区文件来源（`local-workspace`，优先级最高）。
 * 非 Node 宿主没有这个来源，改为注入 `builtin` / `platform` 来源。
 */
export function createLocalWorkspaceSkillCatalogSource(): SkillCatalogSourceProvider {
  return {
    id: "local-workspace",
    list: (query) =>
      query.cwd ? listLocalWorkspaceSkillCatalogEntries(query.cwd) : [],
  };
}

export interface CollectWorkspaceSkillCatalogArgs {
  /** 工作区根目录；缺省时只合并注入的来源（无文件来源）。 */
  cwd?: string;
  /** 额外来源（builtin 注册表 / 平台 agent 配置）。优先级由 `skillCatalog` 定。 */
  sources?: readonly SkillCatalogSourceProvider[];
  /** 关闭文件来源（迁移到平台后只剩注入来源时用）。 */
  includeLocalWorkspace?: boolean;
  budget?: SkillCatalogBudget;
}

const collectSources = (
  args: CollectWorkspaceSkillCatalogArgs,
): SkillCatalogSourceProvider[] => [
  ...(args.includeLocalWorkspace === false || !args.cwd
    ? []
    : [createLocalWorkspaceSkillCatalogSource()]),
  ...(args.sources ?? []),
];

/**
 * 合并「本地文件 + 注入来源」得到一份目录（异步版，平台来源可走 DB/HTTP）。
 *
 * 单个来源失败按空清单处理并在 console 留痕，不拖垮整份菜单。
 */
export async function collectWorkspaceSkillCatalog(
  args: CollectWorkspaceSkillCatalogArgs,
): Promise<SkillCatalog> {
  return resolveSkillCatalog(
    collectSources(args),
    { cwd: args.cwd },
    args.budget ?? DEFAULT_SKILL_CATALOG_BUDGET,
  );
}

/**
 * 同步版合并（CLI / desktop 的会话层装配是同步的）。
 * 注入异步来源会抛错——静默返回空清单会让「平台版本没出现」查不出来。
 */
export function collectWorkspaceSkillCatalogSync(
  args: CollectWorkspaceSkillCatalogArgs,
): SkillCatalog {
  return resolveSkillCatalogSync(
    collectSources(args),
    { cwd: args.cwd },
    args.budget ?? DEFAULT_SKILL_CATALOG_BUDGET,
    // HIGH-1：注入来源里混进异步实现时，跳过它并在 skillCatalog 里打 warn，
    // 而不是抛错把「已经收集到的本地文件技能」一起丢掉。
    { onAsyncSource: "skip" },
  );
}

/** 已合并目录 → skill-discovery 上下文层（host-neutral 渲染，浏览器也可用）。 */
export function buildSkillDiscoveryContextLayerFromCatalog(
  catalog: SkillCatalog,
): TurnContextLayer | null {
  return buildSkillDiscoveryCatalogLayer(catalog);
}

/**
 * One-call helper for host entry points (CLI agentRunCommand, TUI
 * readlineWorkspace, desktop runtime) to build the skill-discovery context
 * block. Encapsulates the local file scan + catalog merge + best-effort
 * try/catch so every entry point gets identical behavior and a new entry
 * point can't accidentally omit the scan (the exact bug that made skills
 * invisible to CLI agents).
 *
 * `options.sources` injects extra catalog sources (builtin registry / platform
 * agent config); they are merged with the same priority rules as the file
 * source. Non-Node hosts call `buildSkillDiscoveryContextLayerFromCatalog`
 * with their own merged catalog instead — this function needs the file system.
 *
 * Returns the layer content string ready to push into extraContextBlocks,
 * or null when no skills were found / the scan failed.
 */
export function buildSkillDiscoveryContextLayer(
  cwd: string,
  options: { sources?: readonly SkillCatalogSourceProvider[] } = {},
): TurnContextLayer | null {
  try {
    return buildSkillDiscoveryCatalogLayer(
      collectWorkspaceSkillCatalogSync({ cwd, sources: options.sources }),
    );
  } catch (error) {
    // Skill discovery 是 best-effort：扫描失败不该中止整轮 run。但「静默返回
    // null」会让「技能变少/消失」变成一个查不出来的现象（HIGH-1），所以必须
    // 留痕；注入的异步来源已由 collectWorkspaceSkillCatalogSync 跳过并 warn，
    // 走到这里说明是文件扫描本身的意外错误。
    console.warn(
      `[skillDiscovery] 技能目录装配失败，本轮不带技能索引运行：${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

/**
 * Content-only variant for hosts that still assemble plain string blocks.
 *
 * Prefer `buildSkillDiscoveryContextLayer`: the layer carries its own
 * cacheScope, so callers don't have to string-match the block marker to work
 * out where it belongs in the prompt.
 */
export function buildSkillDiscoveryContextBlock(
  cwd: string,
  options: { sources?: readonly SkillCatalogSourceProvider[] } = {},
): string | null {
  return buildSkillDiscoveryContextLayer(cwd, options)?.content ?? null;
}