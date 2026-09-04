// scripts/release/projectionReleaseMetadata.ts
// bun-nolo → nolo projection release metadata（release projection P0/P1）。
//
// 职责边界（一句话）：
//   bun-nolo owns release intent; nolo owns release execution.
//
// - bun-nolo 在生成投影时单源决定“这次投影对 cli / desktop 各自声明了什么
//   release”，以 metadata 文件形式随投影 commit 落到公开仓。
// - 公开仓 workflow 只执行已声明的 release；workflow_dispatch 仅作为
//   repair/rebuild，且必须显式绑定 metadata 声明的目标版本 + 本次投影 commit
//   SHA（projection_sha，严格 40-hex），fail closed。
// - channel 一律由各组件投影 SemVer 解析（`-alpha.N` prerelease → alpha，
//   无 prerelease → stable）。绝不由 public branch 推断：公开仓只有 main，
//   用 branch 推断会把 alpha 发布误标成 stable。
//   CLI 的 npm dist-tag 是 channel 的确定性映射：alpha → alpha，stable → latest。
// - 判定 release intent 的单源是 bun-nolo 的 component tag：
//   HEAD 指向 `cli-v<version>` ⇒ cli release；`desktop-v<version>` ⇒ desktop
//   release（与 publishComponents.mts 的 "Tags are the only channel state" 一致）。
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const PROJECTION_RELEASE_METADATA_SCHEMA_VERSION = 2;
/** 生成的 metadata 文件在投影仓/公开仓中的固定路径（repo root 相对）。 */
export const PROJECTION_RELEASE_METADATA_FILENAME = "projection-release-metadata.json";
export const DESKTOP_PACKAGE_MANIFEST_PATH = "packages/desktop/package.json";
export const CLI_PACKAGE_MANIFEST_PATH = "packages/cli/package.json";

export type ProjectionChannel = "alpha" | "stable";
export type ProjectionReleaseIntent = "none" | "release";
export type ProjectionComponent = "cli" | "desktop";

export const PROJECTION_COMPONENTS = ["cli", "desktop"] as const;

/** component tag 前缀：release intent 的单源（bun-nolo component tags）。 */
export const COMPONENT_TAG_PREFIX: Record<ProjectionComponent, string> = {
  cli: "cli-v",
  desktop: "desktop-v",
};

export interface ProjectionReleaseProvenance {
  /** 生成投影时 bun-nolo 的 HEAD SHA。 */
  sourceSha: string;
  /** 生成时的 bun-nolo branch（仅 provenance 记录；绝不参与 channel 解析）。 */
  sourceBranch: string | null;
}

export interface ComponentProjectionReleaseMetadata {
  /** 投影后的组件版本（严格 SemVer）。 */
  version: string;
  /** 由 version 的 SemVer prerelease 解析；与 sourceBranch 无关。 */
  channel: ProjectionChannel;
  /** "none"：本次投影不发布该组件；"release"：声明一次该组件 release。 */
  releaseIntent: ProjectionReleaseIntent;
}

export interface ProjectionReleaseMetadata {
  schemaVersion: number;
  /** cli / desktop 两组件各自的 release intent / version / channel。 */
  components: Record<ProjectionComponent, ComponentProjectionReleaseMetadata>;
  provenance: ProjectionReleaseProvenance;
}

// 严格 SemVer（semantic-semver 官方正则）；拒绝前导零等非法输入。
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export interface ParsedSemVer {
  major: string;
  minor: string;
  patch: string;
  prerelease: string[];
}

/** 严格解析 SemVer；非法输入返回 null（调用方决定 fail-closed 策略）。 */
export function parseStrictSemVer(version: string): ParsedSemVer | null {
  if (typeof version !== "string" || version.length === 0 || version.length > 256) return null;
  const match = SEMVER_PATTERN.exec(version);
  if (!match) return null;
  return {
    major: match[1],
    minor: match[2],
    patch: match[3],
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

/**
 * 从投影 SemVer 解析 release channel（唯一合法来源）。
 * - 无 prerelease → stable
 * - prerelease 首标识符为 alpha → alpha
 * - 其他 prerelease（beta/rc/…）→ throw：metadata schema 只能表达
 *   alpha/stable，遇到未知 prerelease 必须 fail closed，禁止猜测。
 */
export function resolveChannelFromSemVer(version: string): ProjectionChannel {
  const parsed = parseStrictSemVer(version);
  if (!parsed) {
    throw new Error(`[projection-release-metadata] invalid SemVer: ${JSON.stringify(version)}`);
  }
  const first = parsed.prerelease[0];
  if (!first) return "stable";
  if (first === "alpha") return "alpha";
  throw new Error(
    `[projection-release-metadata] unsupported prerelease channel in ${JSON.stringify(version)} (only -alpha.* prereleases map to a known channel)`,
  );
}

/** npm dist-tag 是 CLI channel 的确定性映射：alpha → alpha，stable → latest。 */
export function resolveNpmDistTagFromChannel(channel: ProjectionChannel): "alpha" | "latest" {
  return channel === "alpha" ? "alpha" : "latest";
}

/** 读取 bun-nolo 侧组件版本（投影版本的单源 manifest）。 */
export function readComponentVersion(repoRoot: string, component: ProjectionComponent): string {
  const manifestPath = component === "cli" ? CLI_PACKAGE_MANIFEST_PATH : DESKTOP_PACKAGE_MANIFEST_PATH;
  const manifest = JSON.parse(readFileSync(join(repoRoot, manifestPath), "utf8")) as {
    version?: string;
  };
  const version = manifest.version?.trim() ?? "";
  if (!version) {
    throw new Error(`[projection-release-metadata] ${manifestPath} has no version field`);
  }
  return version;
}

/** 读取 bun-nolo 侧 desktop 版本。 */
export function readDesktopVersion(repoRoot: string): string {
  return readComponentVersion(repoRoot, "desktop");
}

/** 读取 bun-nolo 侧 cli 版本。 */
export function readCliVersion(repoRoot: string): string {
  return readComponentVersion(repoRoot, "cli");
}

function git(args: string[], repoRoot: string): string {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

/** HEAD 上的全部 tag（默认实现；测试可注入）。 */
export function gitTagsAtHead(repoRoot: string): string[] {
  const out = git(["tag", "--points-at", "HEAD"], repoRoot);
  return out ? out.split("\n").map((tag) => tag.trim()).filter(Boolean) : [];
}

function gitHeadSha(repoRoot: string): string {
  return git(["rev-parse", "HEAD"], repoRoot);
}

function gitCurrentBranch(repoRoot: string): string | null {
  try {
    const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
    return branch && branch !== "HEAD" ? branch : null;
  } catch {
    return null;
  }
}

export interface BuildProjectionReleaseMetadataInput {
  repoRoot: string;
  /** 覆盖 cli 版本读取（默认读 packages/cli/package.json）。 */
  cliVersion?: string;
  /** 覆盖 desktop 版本读取（默认读 packages/desktop/package.json）。 */
  desktopVersion?: string;
  /** 覆盖 HEAD tags（默认 `git tag --points-at HEAD`；测试注入用）。 */
  headTags?: readonly string[];
  /** 覆盖 source SHA（默认 `git rev-parse HEAD`；测试注入用）。 */
  sourceSha?: string;
  /** 覆盖 source branch（默认 `git rev-parse --abbrev-ref HEAD`；测试注入用）。 */
  sourceBranch?: string | null;
}

/** 生成投影 release metadata（bun-nolo 侧，generator 单源；cli + desktop 两组件）。 */
export function buildProjectionReleaseMetadata(input: BuildProjectionReleaseMetadataInput): ProjectionReleaseMetadata {
  const { repoRoot } = input;
  const headTags = input.headTags ?? gitTagsAtHead(repoRoot);
  const versions: Record<ProjectionComponent, string> = {
    cli: input.cliVersion ?? readCliVersion(repoRoot),
    desktop: input.desktopVersion ?? readDesktopVersion(repoRoot),
  };
  const components = Object.fromEntries(
    PROJECTION_COMPONENTS.map((component) => {
      const version = versions[component];
      return [
        component,
        {
          version,
          channel: resolveChannelFromSemVer(version),
          releaseIntent: headTags.includes(`${COMPONENT_TAG_PREFIX[component]}${version}`)
            ? ("release" as const)
            : ("none" as const),
        },
      ];
    }),
  ) as ProjectionReleaseMetadata["components"];
  const sourceSha = input.sourceSha ?? gitHeadSha(repoRoot);
  const sourceBranch = input.sourceBranch !== undefined ? input.sourceBranch : gitCurrentBranch(repoRoot);
  return {
    schemaVersion: PROJECTION_RELEASE_METADATA_SCHEMA_VERSION,
    components,
    provenance: { sourceSha, sourceBranch },
  };
}

export function serializeProjectionReleaseMetadata(metadata: ProjectionReleaseMetadata): string {
  return `${JSON.stringify(metadata, null, 2)}\n`;
}

/** 公开仓 release tag：deterministic `<component>-<channel>-v<version>`。 */
export function buildReleaseTag(
  component: ProjectionComponent,
  metadata: Pick<ComponentProjectionReleaseMetadata, "channel" | "version">,
): string {
  return `${component}-${metadata.channel}-v${metadata.version}`;
}

/**
 * fail-closed 解析公开仓中的 metadata 文件：任何结构/字段/channel 谎报
 * 都直接 throw（调用方映射为 hard failure），绝不回退到默认值。
 */
export function parseProjectionReleaseMetadata(raw: string): ProjectionReleaseMetadata {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `[projection-release-metadata] metadata file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const fail = (message: string): never => {
    throw new Error(`[projection-release-metadata] ${message}`);
  };
  if (typeof json !== "object" || json === null) fail("metadata root must be a JSON object");
  const meta = json as Record<string, unknown>;
  if (meta.schemaVersion !== PROJECTION_RELEASE_METADATA_SCHEMA_VERSION) {
    fail(`unsupported schemaVersion ${JSON.stringify(meta.schemaVersion)} (expected ${PROJECTION_RELEASE_METADATA_SCHEMA_VERSION})`);
  }
  if (typeof meta.components !== "object" || meta.components === null) {
    fail("components must be an object with cli and desktop entries");
  }
  const rawComponents = meta.components as Record<string, unknown>;
  const components = Object.fromEntries(
    PROJECTION_COMPONENTS.map((component) => {
      const raw = rawComponents[component];
      if (typeof raw !== "object" || raw === null) {
        fail(`components.${component} must be an object`);
      }
      const entry = raw as Record<string, unknown>;
      if (typeof entry.version !== "string") fail(`components.${component}.version must be a string`);
      const channel = resolveChannelFromSemVer(entry.version as string);
      if (entry.channel !== channel) {
        fail(
          `components.${component}.channel ${JSON.stringify(entry.channel)} does not match SemVer-derived channel ${JSON.stringify(channel)} for version ${JSON.stringify(entry.version)}`,
        );
      }
      if (entry.releaseIntent !== "none" && entry.releaseIntent !== "release") {
        fail(`components.${component}.releaseIntent must be "none" or "release", got ${JSON.stringify(entry.releaseIntent)}`);
      }
      return [
        component,
        {
          version: entry.version,
          channel,
          releaseIntent: entry.releaseIntent,
        },
      ] as const;
    }),
  ) as ProjectionReleaseMetadata["components"];
  if (typeof meta.provenance !== "object" || meta.provenance === null) fail("provenance must be an object");
  const provenance = meta.provenance as Record<string, unknown>;
  if (typeof provenance.sourceSha !== "string" || !/^[0-9a-f]{40}$/.test(provenance.sourceSha)) {
    fail(`provenance.sourceSha must be a 40-hex commit SHA, got ${JSON.stringify(provenance.sourceSha)}`);
  }
  if (provenance.sourceBranch !== null && (typeof provenance.sourceBranch !== "string" || provenance.sourceBranch.length === 0)) {
    fail("provenance.sourceBranch must be a non-empty string or null");
  }
  return {
    schemaVersion: PROJECTION_RELEASE_METADATA_SCHEMA_VERSION,
    components,
    provenance: { sourceSha: provenance.sourceSha, sourceBranch: provenance.sourceBranch },
  };
}

/** metadata 与同一投影 commit 内 packages/<component>/package.json 的漂移检查（cli + desktop）。 */
export function validateMetadataAgainstProjection(
  metadata: ProjectionReleaseMetadata,
  projectedVersions: { cli: string; desktop: string },
): void {
  for (const component of PROJECTION_COMPONENTS) {
    const manifestPath = component === "cli" ? CLI_PACKAGE_MANIFEST_PATH : DESKTOP_PACKAGE_MANIFEST_PATH;
    if (metadata.components[component].version !== projectedVersions[component]) {
      throw new Error(
        `[projection-release-metadata] metadata components.${component}.version ${metadata.components[component].version} drifts from projected ${manifestPath} version ${projectedVersions[component]}`,
      );
    }
  }
}

export type ProjectionReleaseExpectationStatus =
  | "ok"
  | "no-declared-intent"
  | "version-binding-mismatch";

export interface EvaluateProjectionReleaseExpectationsInput {
  metadata: ProjectionReleaseMetadata;
  /** 同一投影 commit 内 cli + desktop manifest 的版本（漂移检查对两者都做）。 */
  projectedVersions: { cli: string; desktop: string };
  /** 评估哪个组件的 intent / version 绑定。 */
  component: ProjectionComponent;
  /** 要求该组件 releaseIntent === "release"（repair/rebuild 与正式发布路径都用）。 */
  expectIntent: boolean;
  /** 绑定目标版本（workflow_dispatch repair 必须显式传入）。 */
  expectVersion?: string;
}

/**
 * 期望校验（结构合法之后才到这里）。返回值由 CLI 映射为退出码：
 * - ok                     → 0
 * - no-declared-intent     → 1（合法 metadata 但未声明该组件发布：普通投影变化的正常跳过信号）
 * - version-binding-mismatch → 3（dispatch 传入版本与该组件 metadata 不符：fail closed）
 * 漂移（metadata vs 任一 package.json）直接 throw → CLI exit 2（fail closed）。
 */
export function evaluateProjectionReleaseExpectations(
  input: EvaluateProjectionReleaseExpectationsInput,
): ProjectionReleaseExpectationStatus {
  validateMetadataAgainstProjection(input.metadata, input.projectedVersions);
  const declared = input.metadata.components[input.component];
  if (input.expectIntent && declared.releaseIntent !== "release") {
    return "no-declared-intent";
  }
  if (input.expectVersion !== undefined && declared.version !== input.expectVersion) {
    return "version-binding-mismatch";
  }
  return "ok";
}
