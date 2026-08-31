import { describe, expect, test } from "bun:test";
import {
  ALWAYS_ON_PACK_IDS,
  CAPABILITY_PACK_BY_ID,
  expandEnabledPacks,
} from "../../packages/ai/tools/toolPacks";
import { resolveCliEffectiveEnabledPacks } from "../../packages/cli/client/localRuntimeAdapter";
import { resolveDesktopEffectiveEnabledPacks } from "../../packages/desktop-runtime/handlers/desktopAgentRuntimeTurnService";
import { resolveEffectiveEnabledPacks } from "../../packages/ai/tools/toolPacks";

/**
 * Cross-host contract for capability-pack resolution.
 *
 * Each runtime used to hardcode its own always-on pack list, and they drifted
 * silently: the CLI's omitted `long-term-memory`, so `rememberMemory` never
 * reached the TUI tool schema and 「记住 X」degraded to shelling out to
 * `nolo memory remember`; web's non-empty branch omitted `skills`, hiding
 * loadSkill/readSkillDoc from any agent that had checked at least one pack.
 * Both were invisible until a user noticed the behavior, because every host's
 * own unit tests happily asserted that host's wrong list.
 *
 * These tests assert the three hosts *agree*, so a future host that hand-rolls
 * its own list — or a future pack added to ALWAYS_ON_PACK_IDS but wired into
 * only some runtimes — fails here rather than shipping as a silent capability
 * gap on one surface.
 */

/** The web runtime's resolution, as `mergeAgentToolsWithRuntime` calls it. */
const resolveWebEffectiveEnabledPacks = (args: {
  enabledPacks?: string[] | null;
  isInlineArtifact?: boolean;
}) =>
  resolveEffectiveEnabledPacks({
    enabledPacks: args.enabledPacks ?? [],
    declaredOnly: args.isInlineArtifact ?? false,
  });

/** Agent shapes a real user can produce from the settings page. */
const AGENT_PACK_SHAPES: Array<{ label: string; enabledPacks: string[] }> = [
  { label: "从未配置过能力包（历史 agent）", enabledPacks: [] },
  { label: "只勾了联网搜索", enabledPacks: ["web-search"] },
  { label: "只勾了代码", enabledPacks: ["code"] },
  { label: "勾了代码 + 长期记忆", enabledPacks: ["code", "long-term-memory"] },
  { label: "勾了一个非默认包", enabledPacks: ["full-browser"] },
];

const HOSTS: Array<{ name: string; resolve: (packs: string[]) => string[] }> = [
  { name: "CLI/TUI", resolve: (enabledPacks) => resolveCliEffectiveEnabledPacks({ enabledPacks }) },
  {
    name: "Desktop (workspace authorized)",
    resolve: (enabledPacks) =>
      resolveDesktopEffectiveEnabledPacks({ enabledPacks, workspaceAuthorized: true }),
  },
  {
    name: "Desktop (no workspace)",
    resolve: (enabledPacks) =>
      resolveDesktopEffectiveEnabledPacks({ enabledPacks, workspaceAuthorized: false }),
  },
  { name: "Web", resolve: (enabledPacks) => resolveWebEffectiveEnabledPacks({ enabledPacks }) },
];

describe("capability pack host contract", () => {
  test("每个 host 对每种 agent 配置都补齐全部 always-on 包", () => {
    for (const host of HOSTS) {
      for (const shape of AGENT_PACK_SHAPES) {
        const resolved = host.resolve(shape.enabledPacks);
        for (const packId of ALWAYS_ON_PACK_IDS) {
          expect(
            resolved,
            `${host.name} / ${shape.label} 少了 always-on 包 ${packId}`,
          ).toContain(packId);
        }
      }
    }
  });

  test("always-on 包的工具在每个 host 的工具面上都可见", () => {
    const alwaysOnTools = ALWAYS_ON_PACK_IDS.flatMap(
      (packId) => CAPABILITY_PACK_BY_ID[packId]?.tools ?? [],
    );
    // 守卫这份清单本身非空——否则上面的断言会因为「没有工具要检查」而空转通过。
    expect(alwaysOnTools).toContain("rememberMemory");

    for (const host of HOSTS) {
      for (const shape of AGENT_PACK_SHAPES) {
        const tools = expandEnabledPacks(host.resolve(shape.enabledPacks), []);
        for (const tool of alwaysOnTools) {
          expect(
            tools,
            `${host.name} / ${shape.label} 的工具面少了 ${tool}`,
          ).toContain(tool);
        }
      }
    }
  });

  test("三端对同一 agent 解析出的能力包集合一致（除去各自的 host-only 包）", () => {
    // code 是唯一合法的 host 差异：CLI 对未配置过的 agent 补，桌面端按 workspace
    // 授权补，web 不补。任何**其他**分歧都是漂移。
    const withoutHostOnly = (packs: string[]) =>
      [...packs].filter((p) => p !== "code").sort();

    for (const shape of AGENT_PACK_SHAPES) {
      const [reference, ...rest] = HOSTS.map((host) => ({
        name: host.name,
        packs: withoutHostOnly(host.resolve(shape.enabledPacks)),
      }));
      for (const other of rest) {
        expect(
          other.packs,
          `${other.name} 与 ${reference.name} 在「${shape.label}」上分歧`,
        ).toEqual(reference.packs);
      }
    }
  });

  test("ablation / inline-artifact 通道在每个 host 上都完全短路", () => {
    // 这条守的是相反方向：declaredOnly 必须一个包都不补，且对空/非空两种输入都成立。
    // 历史上 web 的 inline-artifact 守卫只挂在空 enabledPacks 那一侧。
    for (const enabledPacks of [[], ["web-search"]]) {
      expect(resolveCliEffectiveEnabledPacks({ enabledPacks, declaredOnly: true })).toEqual(
        enabledPacks,
      );
      expect(resolveWebEffectiveEnabledPacks({ enabledPacks, isInlineArtifact: true })).toEqual(
        enabledPacks,
      );
    }
  });
});
