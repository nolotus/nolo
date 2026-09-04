// scripts/release/projectionReleaseMetadata.ts
// bun-nolo → nolo projection release metadata（release projection P0）。
//
// 职责边界（一句话）：
//   bun-nolo owns release intent; nolo owns release execution.
//
// - bun-nolo 在生成投影时单源决定“这次投影是否声明 desktop 发布”，
//   以 metadata 文件形式随投影 commit 落到公开仓。
// - 公开仓 workflow 只执行已声明的 release；workflow_dispatch 仅作为
//   repair/rebuild，且必须绑定 metadata 中的目标版本（fail closed）。
// - channel 一律由投影 SemVer 解析（`-alpha.N` prerelease → alpha，
//   无 prerelease → stable）。绝不由 public branch 推断：公开仓只有 main，
//   用 branch 推断会把 alpha 发布误标成 stable。
// - 判定 release intent 的单源是 bun-nolo 的 component tag：
//   HEAD 指向 `desktop-v<version>` tag ⇒ 本次投影声明 desktop release。
//   （与 publishComponents.mts 的 "Tags are the only channel state" 一致。）
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const PROJECTION_RELEASE_METADATA_SCHEMA_VERSION = 1;
/** 生成的 metadata 文件在投影仓/公开仓中的固定路径（repo root 相对）。 */
export const PROJECTION_RELEASE_METADATA_FILENAME = "projection-release-metadata.json";
export const DESKTOP_PACKAGE_MANIFEST_PATH = "packages/desktop/package.json";

export type ProjectionChannel = "alpha" | "stable";
export type ProjectionReleaseIntent = "none" | "release";

export interface ProjectionReleaseProvenance {
  /** 生成投影时 bun-nolo 的 HEAD SHA。 */
  sourceSha: string;
  /** 生成时的 bun-nolo branch（仅 provenance 记录；绝不参与 channel 解析）。 */
  sourceBranch: string | null;
}

export interface ProjectionReleaseMetadata {
  schemaVersion: number;
  component: "desktop";
  /** 投影后的 desktop 版本（严格 SemVer）。 */
  version: string;
  /** 由 version 的 SemVer prerelease 解析；与 sourceBranch 无关。 */
  channel: ProjectionChannel;
  /** "none"：本次投影不发布 desktop；"release"：声明一次 desktop release。 */
  releaseIntent: ProjectionReleaseIntent;
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
    throw new Error(`[projection-release-metadata] invalid SemVer version: ${JSON.stringify(version)}`);
  }
  if (parsed.prerelease.length === 0) return "stable";
  if (parsed.prerelease[0] === "alpha") return "alpha";
  throw new Error(
    `[projection-release-metadata] unsupported prerelease channel in ${version} (only "alpha" prereleases map to the alpha channel)`,
  );
}

/** 公开仓 GitHub Release 的确定性 tag：同一版本永远同一 tag，不重新生成版本。 */
export function buildReleaseTag(metadata: Pick<ProjectionReleaseMetadata, "channel" | "version">): string {
  return `desktop-${metadata.channel}-v${metadata.version}`;
}

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** 读取 bun-nolo 侧 desktop 版本（投影版本的单源 manifest）。 */
export function readDesktopVersion(repoRoot: string): string {
  const manifest = JSON.parse(readFileSync(join(repoRoot, DESKTOP_PACKAGE_MANIFEST_PATH), "utf8")) as {
    version?: string;
  };
  const version = manifest.version?.trim() ?? "";
  if (!version) {
    throw new Error(`[projection-release-metadata] ${DESKTOP_PACKAGE_MANIFEST_PATH} has no version field`);
  }
  return version;
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
  /** 覆盖 desktop 版本读取（默认读 packages/desktop/package.json）。 */
  desktopVersion?: string;
  /** 覆盖 HEAD tags（默认 `git tag --points-at HEAD`；测试注入用）。 */
  headTags?: readonly string[];
  /** 覆盖 source SHA（默认 `git rev-parse HEAD`；测试注入用）。 */
  sourceSha?: string;
  /** 覆盖 source branch（默认 `git rev-parse --abbrev-ref HEAD`；测试注入用）。 */
  sourceBranch?: string | null;
}

/** 生成投影 release metadata（bun-nolo 侧，generator 单源）。 */
export function buildProjectionReleaseMetadata(input: BuildProjectionReleaseMetadataInput): ProjectionReleaseMetadata {
  const { repoRoot } = input;
  const version = input.desktopVersion ?? readDesktopVersion(repoRoot);
  const channel = resolveChannelFromSemVer(version);
  const headTags = input.headTags ?? gitTagsAtHead(repoRoot);
  const releaseIntent: ProjectionReleaseIntent = headTags.includes(`desktop-v${version}`) ? "release" : "none";
  const sourceSha = input.sourceSha ?? gitHeadSha(repoRoot);
  const sourceBranch = input.sourceBranch !== undefined ? input.sourceBranch : gitCurrentBranch(repoRoot);
  return {
    schemaVersion: PROJECTION_RELEASE_METADATA_SCHEMA_VERSION,
    component: "desktop",
    version,
    channel,
    releaseIntent,
    provenance: { sourceSha, sourceBranch },
  };
}

export function serializeProjectionReleaseMetadata(metadata: ProjectionReleaseMetadata): string {
  return `${JSON.stringify(metadata, null, 2)}\n`;
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
  if (meta.component !== "desktop") fail(`unsupported component ${JSON.stringify(meta.component)} (expected "desktop")`);
  if (typeof meta.version !== "string") fail("version must be a string");
  const channel = resolveChannelFromSemVer(meta.version);
  if (meta.channel !== channel) {
    fail(`channel ${JSON.stringify(meta.channel)} does not match SemVer-derived channel ${JSON.stringify(channel)} for version ${meta.version}`);
  }
  if (meta.releaseIntent !== "none" && meta.releaseIntent !== "release") {
    fail(`releaseIntent must be "none" or "release", got ${JSON.stringify(meta.releaseIntent)}`);
  }
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
    component: "desktop",
    version: meta.version,
    channel,
    releaseIntent: meta.releaseIntent,
    provenance: { sourceSha: provenance.sourceSha, sourceBranch: provenance.sourceBranch },
  };
}

/** metadata 与同一投影 commit 内的 packages/desktop/package.json 的漂移检查。 */
export function validateMetadataAgainstProjection(
  metadata: ProjectionReleaseMetadata,
  projectedDesktopVersion: string,
): void {
  if (metadata.version !== projectedDesktopVersion) {
    throw new Error(
      `[projection-release-metadata] metadata version ${metadata.version} drifts from projected ${DESKTOP_PACKAGE_MANIFEST_PATH} version ${projectedDesktopVersion}`,
    );
  }
}

export type ProjectionReleaseExpectationStatus =
  | "ok"
  | "no-declared-intent"
  | "version-binding-mismatch";

export interface EvaluateProjectionReleaseExpectationsInput {
  metadata: ProjectionReleaseMetadata;
  projectedDesktopVersion: string;
  /** 要求 releaseIntent === "release"（repair/rebuild 与正式发布路径都用）。 */
  expectIntent: boolean;
  /** 绑定目标版本（workflow_dispatch repair 必须显式传入）。 */
  expectVersion?: string;
}

/**
 * 期望校验（结构合法之后才到这里）。返回值由 CLI 映射为退出码：
 * - ok                     → 0
 * - no-declared-intent     → 1（合法 metadata 但未声明发布：普通投影变化的正常跳过信号）
 * - version-binding-mismatch → 3（dispatch 传入版本与 metadata 不符：fail closed）
 * 漂移（metadata vs package.json）直接 throw → CLI exit 2（fail closed）。
 */
export function evaluateProjectionReleaseExpectations(
  input: EvaluateProjectionReleaseExpectationsInput,
): ProjectionReleaseExpectationStatus {
  validateMetadataAgainstProjection(input.metadata, input.projectedDesktopVersion);
  if (input.expectIntent && input.metadata.releaseIntent !== "release") {
    return "no-declared-intent";
  }
  if (input.expectVersion !== undefined && input.metadata.version !== input.expectVersion) {
    return "version-binding-mismatch";
  }
  return "ok";
}
