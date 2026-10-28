/**
 * Browser stub for skillDiscovery.ts.
 *
 * The real module uses node:fs / node:path for filesystem scanning and must
 * never enter a browser bundle. This stub preserves the named export contract
 * with safe no-op behavior so dynamic `import("./skillDiscovery")` in
 * noloWorkspaceTools.ts resolves cleanly under platform: "browser".
 *
 * 技能目录契约（`skillCatalog.ts`）与 skill-discovery 渲染
 * （`turnContext.buildSkillDiscoveryCatalogLayer`）都是 host-neutral 的，
 * 所以浏览器里**不是**只能拿到空列表：注入 `sources`（平台 + agent 配置生成的
 * 目录）后可以走 `collectWorkspaceSkillCatalog` /
 * `buildSkillDiscoveryContextLayerFromCatalog` 得到真实内容。
 */
import {
  DEFAULT_SKILL_CATALOG_BUDGET,
  resolveSkillCatalog,
  resolveSkillCatalogSync,
  type SkillCatalog,
  type SkillCatalogBudget,
  type SkillCatalogEntryInput,
  type SkillCatalogSourceProvider,
} from "./skillCatalog";
import {
  buildSkillDiscoveryCatalogLayer,
  type TurnContextLayer,
} from "./turnContext";

export function parseSkillFrontmatter(_filePath: string): { name?: string; description?: string } {
  return {};
}

export function discoverSkills(_cwd: string): never[] {
  return [];
}

export function resolveSkillByName(_cwd: string, _name: string): null {
  return null;
}

/**
 * 浏览器没有工作区文件访问权，本地文件来源恒为空。
 *
 * TODO(平台技能来源)：接入平台目录——用 agent 配置里启用的 skill 列表 +
 * 平台 skill 记录构造 `SkillCatalogSourceProvider`（source: "platform"，
 * `contentRef` 存页面 dbKey），再交给 `collectWorkspaceSkillCatalog({ sources })`
 * 或直接 `buildSkillDiscoveryContextLayerFromCatalog(catalog)`。
 * 该路径不依赖 node:fs，因此不需要再改这个 stub。
 */
export function listLocalWorkspaceSkillCatalogEntries(
  _cwd: string,
): SkillCatalogEntryInput[] {
  return [];
}

/** 浏览器侧文件来源：显式声明为「无本地文件」，而不是谎报有技能。 */
export function createLocalWorkspaceSkillCatalogSource(): SkillCatalogSourceProvider {
  return { id: "local-workspace", list: () => [] };
}

export interface CollectWorkspaceSkillCatalogArgs {
  cwd?: string;
  sources?: readonly SkillCatalogSourceProvider[];
  includeLocalWorkspace?: boolean;
  budget?: SkillCatalogBudget;
}

/**
 * 浏览器可用的合并入口：只合并注入的来源（本地文件来源在此宿主恒为空）。
 *
 * TODO(平台技能来源)：接线处注入 platform / builtin 来源后，这里返回的就是
 * 「平台 + agent 配置」生成的真实目录。
 */
export async function collectWorkspaceSkillCatalog(
  args: CollectWorkspaceSkillCatalogArgs,
): Promise<SkillCatalog> {
  return resolveSkillCatalog(
    args.sources ?? [],
    { cwd: args.cwd },
    args.budget ?? DEFAULT_SKILL_CATALOG_BUDGET,
  );
}

/** 同步版：注入异步来源会抛错（与真实模块同一口径，不静默降级）。 */
export function collectWorkspaceSkillCatalogSync(
  args: CollectWorkspaceSkillCatalogArgs,
): SkillCatalog {
  return resolveSkillCatalogSync(
    args.sources ?? [],
    { cwd: args.cwd },
    args.budget ?? DEFAULT_SKILL_CATALOG_BUDGET,
    // HIGH-1：同 Node 侧 —— 异步来源只跳过（warn 由 skillCatalog 打），
    // 保留其余来源的条目，不当成「什么技能都没有」。
    { onAsyncSource: "skip" },
  );
}

/** 已合并目录 → skill-discovery 层（host-neutral，浏览器行为与 Node 一致）。 */
export function buildSkillDiscoveryContextLayerFromCatalog(
  catalog: SkillCatalog,
): TurnContextLayer | null {
  return buildSkillDiscoveryCatalogLayer(catalog);
}

/**
 * 浏览器没有文件系统，未注入来源时保持历史行为（null）。注入 `sources`
 * 时走真实合并路径，不再返回空。
 */
export function buildSkillDiscoveryContextLayer(
  _cwd: string,
  options: { sources?: readonly SkillCatalogSourceProvider[] } = {},
): TurnContextLayer | null {
  if (!options.sources?.length) return null;
  try {
    return buildSkillDiscoveryCatalogLayer(
      collectWorkspaceSkillCatalogSync({ sources: options.sources }),
    );
  } catch (error) {
    // best-effort：失败不带技能索引，但必须留痕（HIGH-1 的「零日志」问题）。
    console.warn(
      `[skillDiscovery] 浏览器侧技能目录装配失败，本轮不带技能索引运行：${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

export function buildSkillDiscoveryContextBlock(
  cwd: string,
  options: { sources?: readonly SkillCatalogSourceProvider[] } = {},
): string | null {
  return buildSkillDiscoveryContextLayer(cwd, options)?.content ?? null;
}
