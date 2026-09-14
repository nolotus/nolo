#!/usr/bin/env bun
// scripts/verify/desktop/verifyDesktopPackageCapability.ts
//
// Desktop 公开版 capability fail-closed verifier（Phase 3 release gate）。
// 公开投影 / 三平台 Desktop 产物在更新发布 manifest 之前，必须证明：
//   edition=desktop + anonymousLocal + sessionBridge + loginAction + accountAction，
// 并拒绝 sourcemap / .generated 构建输出 / 私有 cloud bundle 泄漏。
//
// 证据来源（绝不接受手写 "true" 常量）：
// 1. 实际 package export 解析 —— packages/identity/package.json 的 nolo-desktop
//    条件必须存在并解析到真实文件（storeSession/cloudBootstrap；release gate 另需
//    cloudRoutes 的 desktop 实现作为 login/account action 源）。
// 2. latest-assets.json edition 字段（真实打包 bytes）。
// 3. 构建后接线 —— 从 desktop 实现源码中**程序化提取**证据字符串（bridge endpoint、
//    fail-closed 口令登录错误码、外部 login/account action URL），再在真实
//    **打包内容** JS bytes 中扫描它们。缺任何一项都 fail closed。
// 4. 可执行 runtime probe —— 在 verifier 进程内 import 真实 desktop 模块执行行为
//    探针（匿名初始化不崩、无密码认证实现）。
//
// 证据必须派生自真实打包内容（evidenceKind，schema v2 起强制）：
// - extracted-payload：从真实安装包/主 payload 归档（tar.zst / deb / app.tar.zst /
//   zip）提取出的 public tree。release runner 会**再次解包**上传的真实 artifact，
//   对重新提取的 bytes 重跑全部检查 —— 旁路快照或 `.generated/public` 复制品
//   绝不可能通过。
// - installed：Windows 安装器无法在 release runner 稳定解包（Inno Setup），
//   证据来自 installed smoke：真实安装器安装后对 `Resources/app/public`
//   扫描。release 侧校验 snapshot tree 逐文件 sha256 与证据声明一致，且
//   payload artifact sha256 与上传的真实安装器 bytes 一致。limitation 字段必须
//   显式记录该边界。
// - 任何其它 evidenceKind（含 v1 遗留 / build-tree）在 release gate 一律 fail closed。
//
// 模式（build hard gate 与 installed smoke 的边界）：
// - web      ：build hard gate。edition/session/anonymous/privacy 必须可静态证明。
//              login/account action 属于路由接线（account-actions workstream），此模式
//              只记录不拦截；真实点击行为由 installed smoke 覆盖，此处绝不伪造。
// - payload  ：单平台打包后，从真实安装包/payload 归档提取 public 并写
//              extracted-payload 证据（linux: tar.zst+deb；macos: app.tar.zst）。
//              Windows 构建机不产此证据 —— 必须由 installed smoke 产生。
// - installed：installed smoke 专用。对真实安装后的 public tree 扫描并绑定
//              payload artifact（真实安装器）sha256，写 installed 证据。
// - release  ：发布 manifest 前的最终闸门。三平台（windows/macos/linux）证据齐全、
//              evidenceKind 合法、按上面对真实 bytes 重新推导/解包并复核全部能力，
//              复核证据 JSON 里声明的 artifact sha256 与真实安装包 bytes 一致。
//              任一缺失即非零退出 —— publishDesktopDownloads.ts 不得运行。
//
// 用法：
//   bun verifyDesktopPackageCapability.ts web --web-root <dir> --identity-root <dir>
//   bun verifyDesktopPackageCapability.ts payload --artifacts-dir <dir> --installer <path> [--installer <path> ...]
//   bun verifyDesktopPackageCapability.ts installed --artifacts-dir <dir> --web-root <dir> --payload-artifact <path>
//   bun verifyDesktopPackageCapability.ts release --artifacts-dir <dir> --identity-root <dir>
import { existsSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { readdir, readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CAPABILITY_EVIDENCE_FILENAME = "desktop-capability-evidence.json";
export const CAPABILITY_TREE_DIRNAME = "capability";
export const CAPABILITY_SCHEMA_VERSION = 2;
export const RELEASE_PLATFORMS = ["windows", "macos", "linux"] as const;
export type ReleasePlatform = (typeof RELEASE_PLATFORMS)[number];
export type CapabilityEvidenceKind = "installed" | "extracted-payload";
export const CAPABILITY_EVIDENCE_KINDS: readonly CapabilityEvidenceKind[] = [
  "installed",
  "extracted-payload",
];

export interface CapabilityViolation {
  capability: "edition" | "anonymousLocal" | "sessionBridge" | "loginAction" | "accountAction" | "privacy" | "artifact-integrity";
  message: string;
  path?: string;
}

export interface TreeFileClaim {
  name: string;
  bytes: number;
  sha256: string;
}

export interface PayloadSourceClaim {
  /** 相对 platformDir 的安装包/payload 归档路径（release 侧据此重新解包）。 */
  artifact: string;
  sha256: string;
  bytes: number;
}

export interface DesktopCapabilityContract {
  identityRoot: string;
  exports: Record<string, { desktop?: string; cloud?: string; local?: string }>;
  /** 从真实源码程序化提取的证据字符串（绝非遗出手写 marker）。 */
  sessionBridgeMarkers: { marker: string; source: string }[];
  anonymousLocalProbes: string[];
  accountActionMarkers: { marker: string; source: string }[];
  accountActionSourcePath: string | null;
}

const IDENTITY_EXPORTS_REQUIRING_DESKTOP_CONDITION = ["./storeSession", "./cloudBootstrap"] as const;
const ACCOUNT_ACTIONS_EXPORT = "./cloudRoutes";
const ACCOUNT_URL_POLICY_EXPORT = "./accountUrlPolicy";
const FAIL_CLOSED_PASSWORD_MARKER = "desktop_sign_in_is_external";
const WEB_MANIFEST_FILENAME = "latest-assets.json";

function firstExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  if (!existsSync(root)) return out;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  return out;
}

function extractFirstStringLiteral(source: string, pattern: RegExp): string | null {
  const match = source.match(pattern);
  return match?.[1] ?? null;
}

/** 解析 identity package exports + 从真实 desktop 实现源码提取证据字符串。 */
export async function collectDesktopCapabilityContract(input: {
  identityRoot: string;
}): Promise<DesktopCapabilityContract> {
  const identityRoot = resolve(input.identityRoot);
  const manifestPath = join(identityRoot, "package.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`identity package manifest missing: ${manifestPath}`);
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    exports?: Record<string, Record<string, string>>;
  };
  const exports: DesktopCapabilityContract["exports"] = {};
  for (const key of [
    ...IDENTITY_EXPORTS_REQUIRING_DESKTOP_CONDITION,
    ACCOUNT_ACTIONS_EXPORT,
    ACCOUNT_URL_POLICY_EXPORT,
  ]) {
    const conditions = manifest.exports?.[key] ?? {};
    exports[key] = {
      desktop: conditions["nolo-desktop"],
      cloud: conditions["nolo-cloud"],
      local: conditions["default"],
    };
  }

  // sessionBridge markers：从 storeSession.desktop.ts / desktopTokenManager.ts 真实源码提取。
  const sessionBridgeMarkers: DesktopCapabilityContract["sessionBridgeMarkers"] = [];
  const storeSessionPath = exports["./storeSession"].desktop
    ? join(identityRoot, exports["./storeSession"].desktop!)
    : null;
  if (storeSessionPath && existsSync(storeSessionPath)) {
    const source = await readFile(storeSessionPath, "utf8");
    // 公开 desktop 禁止密码认证实现：fail-closed 口令登录必须真实存在。
    if (source.includes(FAIL_CLOSED_PASSWORD_MARKER)) {
      sessionBridgeMarkers.push({ marker: FAIL_CLOSED_PASSWORD_MARKER, source: relative(identityRoot, storeSessionPath) });
    }
  }
  const tokenManagerPath = firstExisting([
    join(identityRoot, "session", "desktopTokenManager.ts"),
  ]);
  if (tokenManagerPath) {
    const source = await readFile(tokenManagerPath, "utf8");
    const endpoint = extractFirstStringLiteral(source, /fetch\(\s*["'`]([^"'`]+)["'`]/);
    if (endpoint) {
      sessionBridgeMarkers.push({ marker: endpoint, source: relative(identityRoot, tokenManagerPath) });
    }
    const storageKey = extractFirstStringLiteral(source, /STORAGE_KEY\s*=\s*["']([^"']+)["']/);
    if (storageKey) {
      sessionBridgeMarkers.push({ marker: storageKey, source: relative(identityRoot, tokenManagerPath) });
    }
  }

  // account/login action markers：从真实 cloudRoutes desktop 实现提取外部动作 URL/路由。
  const accountActionSourcePath = exports[ACCOUNT_ACTIONS_EXPORT]?.desktop
    ? join(identityRoot, exports[ACCOUNT_ACTIONS_EXPORT].desktop!)
    : null;
  const accountActionMarkers: DesktopCapabilityContract["accountActionMarkers"] = [];
  if (accountActionSourcePath && existsSync(accountActionSourcePath)) {
    const routeSource = await readFile(accountActionSourcePath, "utf8");
    // 路由实现必须真实引用统一 URL policy；注释中的自然语言 URL 不能成为证据。
    if (!routeSource.includes("accountExternalActions")) {
      accountActionMarkers.push({
        marker: "__missing_account_external_actions_wiring__",
        source: relative(identityRoot, accountActionSourcePath),
      });
    }
    const policyTarget =
      exports[ACCOUNT_URL_POLICY_EXPORT]?.desktop ??
      exports[ACCOUNT_URL_POLICY_EXPORT]?.local;
    const policyPath = policyTarget ? join(identityRoot, policyTarget) : null;
    if (policyPath && existsSync(policyPath)) {
      const policySource = await readFile(policyPath, "utf8");
      // Only exact quoted URL literals in the dependency-free policy are protocol evidence.
      for (const match of policySource.matchAll(/["'](https:\/\/nolo\.chat\/(?:login|life))["']/g)) {
        accountActionMarkers.push({
          marker: match[1],
          source: relative(identityRoot, policyPath),
        });
      }
    }
    // Child-route literals are stable after minification and prove that both intents are routed.
    for (const route of ["login", "life"]) {
      if (routeSource.includes(`"${route}"`) || routeSource.includes(`'${route}'`)) {
        accountActionMarkers.push({
          marker: route,
          source: relative(identityRoot, accountActionSourcePath),
        });
      }
    }
  }

  return {
    identityRoot,
    exports,
    sessionBridgeMarkers,
    anonymousLocalProbes: ["createStoreSessionCore", "bindStoreSessionRuntime"],
    accountActionMarkers,
    accountActionSourcePath:
      accountActionSourcePath && existsSync(accountActionSourcePath)
        ? accountActionSourcePath
        : null,
  };
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** 对真实 tree 逐文件计算 sha256/bytes，产出可复核的 manifest。 */
export async function manifestTree(root: string): Promise<TreeFileClaim[]> {
  const files = await walkFiles(root);
  const claims = files.map((file) => ({
    name: relative(root, file).split("\\").join("/"),
    bytes: statSync(file).size,
    sha256: sha256File(file),
  }));
  claims.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return claims;
}

export function fingerprintTree(manifest: TreeFileClaim[]): string {
  return sha256Text(
    manifest.map((claim) => `${claim.name}:${claim.bytes}:${claim.sha256}`).join("\n"),
  );
}

function sameTreeManifest(a: TreeFileClaim[], b: TreeFileClaim[]): boolean {
  return (
    a.length === b.length &&
    fingerprintTree(a) === fingerprintTree(b)
  );
}

function runTool(command: string, args: string[], options?: { cwd?: string }): void {
  const proc = Bun.spawnSync([command, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: options?.cwd,
  });
  if (proc.exitCode !== 0) {
    const stderr = proc.stderr ? proc.stderr.toString().slice(0, 800) : "";
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${proc.exitCode}: ${stderr}`);
  }
}

/**
 * 从真实安装包/payload 归档解包全部 bytes。
 * 支持：.tar.zst（linux tar / macos app archive）、.zip（windows payload /
 * macos app zip）、.deb（ar + data.tar）。Windows Inno 安装器(.exe) 与 DMG
 * 无法跨平台稳定解包 —— 调用方必须选择可解包的 payload artifact。
 */
export function extractArchive(installerPath: string, destDir: string): void {
  if (!existsSync(installerPath)) {
    throw new Error(`payload artifact not found: ${installerPath}`);
  }
  const lower = basename(installerPath).toLowerCase();
  if (lower.endsWith(".tar.zst")) {
    runTool("tar", ["--zstd", "-xf", resolve(installerPath), "-C", resolve(destDir)]);
    return;
  }
  if (lower.endsWith(".zip")) {
    runTool("unzip", ["-q", "-o", resolve(installerPath), "-d", resolve(destDir)]);
    return;
  }
  if (lower.endsWith(".deb")) {
    const debDir = join(destDir, "__deb__");
    mkdirSync(join(debDir, "root"), { recursive: true });
    runTool("cp", [resolve(installerPath), join(debDir, "payload.deb")]);
    let usedDpkg = true;
    try {
      runTool("dpkg-deb", ["-x", join(debDir, "payload.deb"), join(debDir, "root")]);
    } catch {
      usedDpkg = false;
    }
    if (usedDpkg) {
      return;
    }
    runTool("ar", ["x", join(debDir, "payload.deb")], { cwd: debDir });
    const dataTar = readdirSync(debDir).find((name) => /^data\.tar\.(zst|gz|xz)$/.test(name));
    if (!dataTar) {
      throw new Error(`deb payload has no data.tar.* member: ${installerPath}`);
    }
    if (dataTar.endsWith(".zst")) {
      runTool("tar", ["--zstd", "-xf", dataTar, "-C", "root"], { cwd: debDir });
    } else if (dataTar.endsWith(".gz")) {
      runTool("tar", ["-xzf", dataTar, "-C", "root"], { cwd: debDir });
    } else {
      runTool("tar", ["-xJf", dataTar, "-C", "root"], { cwd: debDir });
    }
    return;
  }
  throw new Error(
    `payload artifact ${basename(installerPath)} cannot be extracted by this verifier ` +
      `(supported: .tar.zst/.zip/.deb); choose a real payload archive for capability evidence`,
  );
}

/** 在解包结果里定位 web public tree（含 latest-assets.json 的目录，必须唯一）。 */
export async function findPayloadPublicDir(extractedRoot: string): Promise<string> {
  const matches: string[] = [];
  const stack = [extractedRoot];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    if (entries.some((entry) => entry.isFile() && entry.name === WEB_MANIFEST_FILENAME)) {
      matches.push(current);
    }
    for (const entry of entries) {
      if (entry.isDirectory()) stack.push(join(current, entry.name));
    }
  }
  if (matches.length === 0) {
    throw new Error(
      `no ${WEB_MANIFEST_FILENAME} found under extracted payload; the packaged payload does not contain a web public tree`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `ambiguous web public trees (${matches.length} dirs contain ${WEB_MANIFEST_FILENAME}) in extracted payload`,
    );
  }
  return matches[0];
}

export interface DerivedPayloadTree {
  publicDir: string;
  manifest: TreeFileClaim[];
  /** 与 primary tree 逐字节一致的 payload artifact 相对名列表（含 primary）。 */
  boundArtifacts: string[];
  workDir: string;
}

/**
 * 从一个或多个真实安装包/payload 归档提取 public tree。
 * 多 payload（如 linux tar.zst + deb）必须包含**逐字节相同**的 web bytes，
 * 否则 fail closed —— 同一次构建不允许不同安装包携带不同 web 内容。
 */
export async function derivePayloadPublicTree(input: {
  installers: string[];
  artifactsRoot?: string;
  workDir: string;
}): Promise<DerivedPayloadTree> {
  if (input.installers.length === 0) {
    throw new Error("derivePayloadPublicTree requires at least one payload artifact");
  }
  let primaryManifest: TreeFileClaim[] | null = null;
  let primaryPublicDir: string | null = null;
  const boundArtifacts: string[] = [];
  for (const [index, installer] of input.installers.entries()) {
    const extractDir = join(input.workDir, `payload-${index}`);
    await mkdir(extractDir, { recursive: true });
    extractArchive(installer, extractDir);
    const publicDir = await findPayloadPublicDir(extractDir);
    const manifest = await manifestTree(publicDir);
    if (primaryManifest === null || primaryPublicDir === null) {
      primaryManifest = manifest;
      primaryPublicDir = publicDir;
    } else if (!sameTreeManifest(primaryManifest, manifest)) {
      throw new Error(
        `payload artifacts ship divergent web bytes: ${basename(input.installers[0])} and ${basename(installer)} must contain identical public trees`,
      );
    }
    boundArtifacts.push(
      input.artifactsRoot
        ? relative(input.artifactsRoot, installer).split("\\").join("/")
        : basename(installer),
    );
  }
  return {
    publicDir: primaryPublicDir!,
    manifest: primaryManifest!,
    boundArtifacts,
    workDir: input.workDir,
  };
}

/** 可执行 runtime 探针：真实 import desktop 模块并执行行为断言。 */
export async function runAnonymousLocalProbes(contract: DesktopCapabilityContract): Promise<CapabilityViolation[]> {
  const violations: CapabilityViolation[] = [];
  const storeSessionPath = contract.exports["./storeSession"].desktop
    ? join(contract.identityRoot, contract.exports["./storeSession"].desktop!)
    : null;
  if (!storeSessionPath || !existsSync(storeSessionPath)) {
    violations.push({
      capability: "anonymousLocal",
      message: "storeSession nolo-desktop implementation missing; anonymous session behavior cannot be executed",
      path: storeSessionPath ?? "./storeSession",
    });
    return violations;
  }
  try {
    const module = await import(pathToFileURL(storeSessionPath).href);
    for (const probe of contract.anonymousLocalProbes) {
      if (typeof (module as Record<string, unknown>)[probe] !== "function") {
        violations.push({
          capability: "anonymousLocal",
          message: `desktop session module does not export probe function ${probe}`,
          path: storeSessionPath,
        });
      }
    }
    // 无 window 环境（verifier runtime）：匿名初始化必须安全返回（undefined/空核心），
    // 绝不因缺少云账号而抛错 —— 这是 anonymousLocal 的可执行证据。
    const core = await (module as { createStoreSessionCore: () => unknown }).createStoreSessionCore();
    if (core !== undefined && typeof core !== "object") {
      violations.push({
        capability: "anonymousLocal",
        message: "createStoreSessionCore returned a non-object, non-undefined value without a window runtime",
        path: storeSessionPath,
      });
    }
  } catch (error) {
    violations.push({
      capability: "anonymousLocal",
      message: `executable probe failed: ${error instanceof Error ? error.message : String(error)}`,
      path: storeSessionPath,
    });
  }
  return violations;
}

/** web 模式：对真实构建产物 bytes 做全部静态推导。 */
export async function verifyDesktopWebCapability(input: {
  webRoot: string;
  contract: DesktopCapabilityContract;
  requireAccountActions: boolean;
}): Promise<CapabilityViolation[]> {
  const violations: CapabilityViolation[] = [];
  const contract = input.contract;
  const webRoot = resolve(input.webRoot);
  const manifestPath = join(webRoot, WEB_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    violations.push({
      capability: "edition",
      message: `packaged web manifest missing (${WEB_MANIFEST_FILENAME}); cannot prove desktop edition`,
      path: manifestPath,
    });
  } else {
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { edition?: string };
      if (manifest.edition !== "desktop") {
        violations.push({
          capability: "edition",
          message: `packaged web manifest is not the desktop edition (edition=${manifest.edition ?? "missing"})`,
          path: manifestPath,
        });
      }
    } catch (error) {
      violations.push({
        capability: "edition",
        message: `packaged web manifest is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        path: manifestPath,
      });
    }
  }

  // 2. package export 解析：nolo-desktop 条件必须存在并解析到真实文件。
  for (const key of IDENTITY_EXPORTS_REQUIRING_DESKTOP_CONDITION) {
    const condition = contract.exports[key]?.desktop;
    if (!condition) {
      violations.push({
        capability: "sessionBridge",
        message: `identity export ${key} has no nolo-desktop condition; desktop edition would silently fall back`,
        path: join(contract.identityRoot, "package.json"),
      });
    } else if (!existsSync(join(contract.identityRoot, condition))) {
      violations.push({
        capability: "sessionBridge",
        message: `identity export ${key} nolo-desktop condition dangles (${condition})`,
        path: join(contract.identityRoot, condition),
      });
    }
  }

  // 3. 构建后接线：真实 JS bytes 必须包含从 desktop 源码提取的证据字符串。
  const jsFiles = (await walkFiles(webRoot)).filter((file) => /\.(js|mjs|html)$/.test(file));
  if (jsFiles.length === 0) {
    violations.push({
      capability: "sessionBridge",
      message: `no built JS/HTML found under webRoot=${webRoot}`,
      path: webRoot,
    });
  } else {
    const bytesByFile = new Map<string, string>();
    for (const file of jsFiles) bytesByFile.set(file, await readFile(file, "utf8"));
    for (const { marker, source } of contract.sessionBridgeMarkers) {
      const wired = [...bytesByFile.entries()].filter(([, text]) => text.includes(marker));
      if (wired.length === 0) {
        violations.push({
          capability: "sessionBridge",
          message: `session bridge marker "${marker}" (from ${source}) is not wired into the built bundle`,
          path: webRoot,
        });
      }
    }
    if (input.requireAccountActions) {
      if (!contract.accountActionSourcePath) {
        violations.push({
          capability: "loginAction",
          message: `identity export ${ACCOUNT_ACTIONS_EXPORT} has no nolo-desktop implementation; login/account action capability cannot be derived`,
          path: join(contract.identityRoot, "package.json"),
        });
      } else {
        if (contract.accountActionMarkers.length === 0) {
          violations.push({
            capability: "accountAction",
            message: `no external account action descriptors found in ${relative(contract.identityRoot, contract.accountActionSourcePath)}`,
            path: contract.accountActionSourcePath,
          });
        }
        for (const { marker, source } of contract.accountActionMarkers) {
          const wired = [...bytesByFile.entries()].filter(([, text]) => text.includes(marker));
          if (wired.length === 0) {
            violations.push({
              capability: "accountAction",
              message: `account action marker "${marker}" (from ${source}) is not wired into the built bundle`,
              path: webRoot,
            });
          }
        }
        // loginAction：/login 必须在 bundle 中解析为动作而不是 NoMatch。
        const loginWired = [...bytesByFile.values()].some((text) => text.includes("/login"));
        if (!loginWired) {
          violations.push({
            capability: "loginAction",
            message: "no /login route/action wiring found in the built bundle",
            path: webRoot,
          });
        }
      }
    }
  }

  // 4. privacy：拒绝真实 sourcemap 内容和真实 .generated 路径泄漏。
  // - 上游第三方文件可能保留 `//# sourceMappingURL=name.map`，但只要对应 map
  //   没有随包发布，就没有泄漏源码；内嵌 data URL 或实际存在的 map 才 fail。
  // - `.generatedAt` / `.generatedVariables` 是合法标识符，不能用子串扫描；
  //   只拒绝具备路径边界的 `.generated/` 或 `.generated\\`。
  const allFiles = await walkFiles(webRoot);
  const shippedRelativeFiles = new Set(
    allFiles.map((file) => relative(webRoot, file).split("\\").join("/")),
  );
  for (const file of allFiles) {
    if (file.endsWith(".map")) {
      violations.push({
        capability: "privacy",
        message: `sourcemap file must not ship in a public desktop build`,
        path: relative(webRoot, file),
      });
    }
  }
  for (const file of jsFiles) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(/(?:\/\/[#@]|\/\*[#@])\s*sourceMappingURL=([^\s*]+)/g)) {
      const target = match[1]?.trim();
      if (!target) continue;
      const isEmbedded = target.startsWith("data:");
      const sourceMapPath = join(dirname(file), target);
      const shippedMap = existsSync(sourceMapPath) &&
        shippedRelativeFiles.has(relative(webRoot, sourceMapPath).split("\\").join("/"));
      if (isEmbedded || shippedMap) {
        violations.push({
          capability: "privacy",
          message: `sourceMappingURL exposes a shipped or embedded sourcemap`,
          path: relative(webRoot, file),
        });
      }
    }
    if (/(?:^|[\\/])\.generated(?:[\\/]|$)/.test(text)) {
      violations.push({
        capability: "privacy",
        message: `build-time .generated path leaked into shipped bundle bytes`,
        path: relative(webRoot, file),
      });
    }
  }
  return violations;
}

async function collectArtifactFiles(artifactsDir: string): Promise<{ name: string; bytes: number; sha256: string }[]> {
  return (await walkFiles(artifactsDir))
    .map((file) => ({ file, rel: relative(artifactsDir, file).split("\\").join("/") }))
    .filter(
      ({ rel, file }) =>
        // 段级精确排除（不能用子串匹配：绝对路径里可能恰好含 "capability"）。
        rel !== `${CAPABILITY_TREE_DIRNAME}/public` &&
        !rel.startsWith(`${CAPABILITY_TREE_DIRNAME}/`) &&
        rel !== CAPABILITY_EVIDENCE_FILENAME &&
        basename(file) !== CAPABILITY_EVIDENCE_FILENAME,
    )
    .map(({ file, rel }) => ({
      name: rel,
      bytes: statSync(file).size,
      sha256: sha256File(file),
    }));
}

async function capabilitySummary(
  violations: CapabilityViolation[],
  requireAccountActions: boolean,
): Promise<Record<string, string>> {
  return {
    edition: violations.some((v) => v.capability === "edition") ? "unproven" : "desktop",
    anonymousLocal: violations.some((v) => v.capability === "anonymousLocal") ? "unproven" : "ok",
    sessionBridge: violations.some((v) => v.capability === "sessionBridge") ? "unproven" : "ok",
    loginAction:
      !requireAccountActions && violations.every((v) => v.capability !== "loginAction")
        ? "not-required-at-build-gate"
        : violations.some((v) => v.capability === "loginAction")
          ? "unproven"
          : "ok",
    accountAction:
      !requireAccountActions && violations.every((v) => v.capability !== "accountAction")
        ? "not-required-at-build-gate"
        : violations.some((v) => v.capability === "accountAction")
          ? "unproven"
          : "ok",
    privacy: violations.some((v) => v.capability === "privacy") ? "violated" : "ok",
  };
}

async function writeCapabilityTreeSnapshot(webRoot: string, artifactsDir: string): Promise<TreeFileClaim[]> {
  const treeDir = join(artifactsDir, CAPABILITY_TREE_DIRNAME, "public");
  if (resolve(webRoot) !== resolve(treeDir)) {
    await rm(treeDir, { recursive: true, force: true });
    await cp(webRoot, treeDir, { recursive: true });
  }
  return manifestTree(treeDir);
}

/**
 * installed 模式：对真实安装后的 public tree（如 Windows `Resources/app/public`）
 * 扫描并写证据。payloadSource 绑定产生该安装的**真实安装器** bytes。
 */
export async function writeInstalledEvidence(input: {
  artifactsDir: string;
  webRoot: string;
  payloadArtifact: string;
  identityRoot: string;
  platform: ReleasePlatform;
  limitation?: string;
}): Promise<CapabilityViolation[]> {
  const artifactsDir = resolve(input.artifactsDir);
  if (!existsSync(input.payloadArtifact)) {
    throw new Error(`payload artifact passed to installed evidence does not exist: ${input.payloadArtifact}`);
  }
  const payloadSource: PayloadSourceClaim = {
    artifact: relative(artifactsDir, resolve(input.payloadArtifact)).split("\\").join("/"),
    sha256: sha256File(input.payloadArtifact),
    bytes: statSync(input.payloadArtifact).size,
  };
  const limitation =
    input.limitation ??
    `Installed evidence: the web tree was scanned at ${input.platform} install time from the real payload ` +
      `bound by payloadSources[0].sha256; the installer format cannot be re-extracted on the release runner, ` +
      `so the release gate re-verifies the snapshot tree byte-for-byte plus the installer hash instead of re-unpacking.`;

  const contract = await collectDesktopCapabilityContract({ identityRoot: input.identityRoot });
  const violations = await verifyDesktopWebCapability({
    webRoot: input.webRoot,
    contract,
    requireAccountActions: true,
  });
  violations.push(...(await runAnonymousLocalProbes(contract)));

  const scannedTree = await writeCapabilityTreeSnapshot(input.webRoot, artifactsDir);
  const evidence = {
    schemaVersion: CAPABILITY_SCHEMA_VERSION,
    platform: input.platform,
    evidenceKind: "installed" as const,
    generatedAt: new Date().toISOString(),
    payloadSources: [payloadSource],
    scannedTree,
    webTreeFingerprint: fingerprintTree(scannedTree),
    limitation,
    capabilities: await capabilitySummary(violations, true),
    artifactFiles: await collectArtifactFiles(artifactsDir),
    violations,
  };

  await mkdir(artifactsDir, { recursive: true });
  await writeFile(
    join(artifactsDir, CAPABILITY_EVIDENCE_FILENAME),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  return violations;
}

/**
 * payload 模式：从真实安装包/payload 归档提取 public tree，扫描并写
 * extracted-payload 证据。多 installer 必须携带相同的 web bytes。
 */
export async function writeExtractedPayloadEvidence(input: {
  artifactsDir: string;
  installers: string[];
  identityRoot: string;
  platform: ReleasePlatform;
  limitation?: string;
}): Promise<CapabilityViolation[]> {
  const artifactsDir = resolve(input.artifactsDir);
  const workDir = mkdtempSync(join(tmpdir(), "desktop-capability-payload-"));
  try {
    const derived = await derivePayloadPublicTree({
      installers: input.installers,
      artifactsRoot: artifactsDir,
      workDir,
    });
    const payloadSources: PayloadSourceClaim[] = derived.boundArtifacts.map((artifact) => {
      const realPath = join(artifactsDir, artifact);
      if (!existsSync(realPath)) {
        throw new Error(`payload artifact not found under artifacts dir: ${artifact}`);
      }
      return { artifact, sha256: sha256File(realPath), bytes: statSync(realPath).size };
    });

    const contract = await collectDesktopCapabilityContract({ identityRoot: input.identityRoot });
    const violations = await verifyDesktopWebCapability({
      webRoot: derived.publicDir,
      contract,
      requireAccountActions: true,
    });
    violations.push(...(await runAnonymousLocalProbes(contract)));

    const scannedTree = await writeCapabilityTreeSnapshot(derived.publicDir, artifactsDir);
    const evidence = {
      schemaVersion: CAPABILITY_SCHEMA_VERSION,
      platform: input.platform,
      evidenceKind: "extracted-payload" as const,
      generatedAt: new Date().toISOString(),
      payloadSources,
      scannedTree,
      webTreeFingerprint: fingerprintTree(scannedTree),
      limitation: input.limitation,
      capabilities: await capabilitySummary(violations, true),
      artifactFiles: await collectArtifactFiles(artifactsDir),
      violations,
    };

    await mkdir(artifactsDir, { recursive: true });
    await writeFile(
      join(artifactsDir, CAPABILITY_EVIDENCE_FILENAME),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    return violations;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/** 兼容导出：旧 package 模式语义已废弃 —— 现在等价于 installed 证据（需 payload artifact）。 */
export async function writePackageEvidence(input: {
  artifactsDir: string;
  webRoot: string;
  identityRoot: string;
  platform: ReleasePlatform;
  requireAccountActions?: boolean;
  payloadArtifact?: string;
}): Promise<CapabilityViolation[]> {
  if (!input.payloadArtifact) {
    throw new Error(
      "writePackageEvidence requires payloadArtifact: copying a build-output tree (.generated/public) is not valid package evidence (evidenceKind=installed/extracted-payload required)",
    );
  }
  return writeInstalledEvidence({
    artifactsDir: input.artifactsDir,
    webRoot: input.webRoot,
    payloadArtifact: input.payloadArtifact,
    identityRoot: input.identityRoot,
    platform: input.platform,
  });
}

/** release 模式：三平台证据齐全 + 真实打包内容重推导 + artifact sha256 复核。 */
export async function verifyDesktopReleaseArtifacts(input: {
  artifactsDir: string;
  identityRoot: string;
}): Promise<CapabilityViolation[]> {
  const violations: CapabilityViolation[] = [];
  const artifactsDir = resolve(input.artifactsDir);
  for (const platform of RELEASE_PLATFORMS) {
    const platformDir = join(artifactsDir, `desktop-${platform}`);
    if (!existsSync(platformDir)) {
      violations.push({
        capability: "artifact-integrity",
        message: `no uploaded artifacts for platform ${platform}; release manifest must not be updated`,
        path: platformDir,
      });
      continue;
    }
    const evidencePath = join(platformDir, CAPABILITY_EVIDENCE_FILENAME);
    if (!existsSync(evidencePath)) {
      violations.push({
        capability: "artifact-integrity",
        message: `capability evidence missing for platform ${platform}; release manifest must not be updated`,
        path: evidencePath,
      });
      continue;
    }
    let evidence: {
      schemaVersion?: number;
      platform?: string;
      evidenceKind?: string;
      payloadSources?: PayloadSourceClaim[];
      scannedTree?: TreeFileClaim[];
      limitation?: string;
      capabilities?: Record<string, string>;
      artifactFiles?: { name: string; bytes: number; sha256: string }[];
    };
    try {
      evidence = JSON.parse(await readFile(evidencePath, "utf8"));
    } catch (error) {
      violations.push({
        capability: "artifact-integrity",
        message: `capability evidence is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        path: evidencePath,
      });
      continue;
    }
    if (evidence.schemaVersion !== CAPABILITY_SCHEMA_VERSION || evidence.platform !== platform) {
      violations.push({
        capability: "artifact-integrity",
        message: `capability evidence schema/platform mismatch for ${platform}`,
        path: evidencePath,
      });
    }
    // evidenceKind fail-closed：只接受真实打包内容派生的证据。
    if (
      !evidence.evidenceKind ||
      !CAPABILITY_EVIDENCE_KINDS.includes(evidence.evidenceKind as CapabilityEvidenceKind)
    ) {
      violations.push({
        capability: "artifact-integrity",
        message: `platform ${platform} evidence has evidenceKind=${evidence.evidenceKind ?? "missing"}; ` +
          `only installed/extracted-payload (derived from real packaged bytes) is accepted — a copied build tree is not package evidence`,
        path: evidencePath,
      });
      continue;
    }
    // Windows 的发布物是 Inno Setup 安装器，release runner 无法解包比对；其证据
    // **只能**来自真实安装（installed）。extracted-payload 只对 Linux/macOS 的
    // 归档成立 —— 若 Windows 出现该 kind（构建期误写、或有人拿无关归档冒充），
    // 必须 fail closed：否则 gate 会接受一份与**被发布的安装器**无关的证据。
    // 生产端（post-package.ts）已无条件跳过 Windows 的构建期 payload 证据；
    // 这里是消费端的同一不变量，两层各自成立，不依赖对方。
    if (platform === "windows" && evidence.evidenceKind !== "installed") {
      violations.push({
        capability: "artifact-integrity",
        message:
          `platform windows evidence must come from a real install ` +
          `(evidenceKind=installed), got evidenceKind=${evidence.evidenceKind}`,
        path: evidencePath,
      });
      continue;
    }
    const payloadSources = evidence.payloadSources ?? [];
    if (payloadSources.length === 0) {
      violations.push({
        capability: "artifact-integrity",
        message: `platform ${platform} evidence binds no payload artifact; the web tree provenance is unproven`,
        path: evidencePath,
      });
      continue;
    }

    // capability 静态推导的对象：extracted-payload 用 release 侧重新解包的 tree；
    // installed 用 snapshot tree（其 bytes 由 scannedTree manifest 锁定）。
    let capabilityWebRoot: string | null = null;
    let releaseWorkDir: string | null = null;
    try {
      if (evidence.evidenceKind === "extracted-payload") {
        releaseWorkDir = mkdtempSync(join(tmpdir(), "desktop-capability-release-"));
        let primaryManifest: TreeFileClaim[] | null = null;
        for (const [index, claim] of payloadSources.entries()) {
          const realPath = join(platformDir, claim.artifact);
          if (!existsSync(realPath)) {
            violations.push({
              capability: "artifact-integrity",
              message: `evidence binds payload artifact ${claim.artifact} but it is absent from the merged upload`,
              path: realPath,
            });
            continue;
          }
          const realSha = sha256File(realPath);
          if (realSha !== claim.sha256 || statSync(realPath).size !== claim.bytes) {
            violations.push({
              capability: "artifact-integrity",
              message: `payload artifact ${claim.artifact} does not match evidence sha256/bytes; the scanned tree does not provably come from the published payload`,
              path: realPath,
            });
            continue;
          }
          const extractDir = join(releaseWorkDir, `payload-${index}`);
          await mkdir(extractDir, { recursive: true });
          try {
            extractArchive(realPath, extractDir);
          } catch (error) {
            violations.push({
              capability: "artifact-integrity",
              message: `release runner could not re-extract payload artifact ${claim.artifact}: ${error instanceof Error ? error.message : String(error)}`,
              path: realPath,
            });
            continue;
          }
          let publicDir: string;
          try {
            publicDir = await findPayloadPublicDir(extractDir);
          } catch (error) {
            violations.push({
              capability: "artifact-integrity",
              message: `re-extracted payload ${claim.artifact} has no scannable web public tree: ${error instanceof Error ? error.message : String(error)}`,
              path: extractDir,
            });
            continue;
          }
          const manifest = await manifestTree(publicDir);
          if (index === 0) {
            primaryManifest = manifest;
            capabilityWebRoot = publicDir;
          } else if (!primaryManifest || !sameTreeManifest(primaryManifest, manifest)) {
            violations.push({
              capability: "artifact-integrity",
              message: `payload artifacts ship divergent web bytes on the release runner: ${payloadSources[0].artifact} vs ${claim.artifact}`,
              path: realPath,
            });
          }
        }
        // 重新解包的 bytes 必须与构建侧扫描的 tree 一致 —— 防止证据与上传内容错位。
        if (primaryManifest && evidence.scannedTree) {
          if (!sameTreeManifest(primaryManifest, evidence.scannedTree)) {
            violations.push({
              capability: "artifact-integrity",
              message: `re-extracted payload tree differs from the evidence scannedTree; evidence was not derived from these published bytes`,
              path: evidencePath,
            });
          }
        }
      } else {
        // installed：release runner 无法解包安装器 —— 校验 snapshot tree 逐文件 sha256
        // 与 payload artifact hash；capability 推导对象是锁定的 snapshot tree。
        const snapshotDir = join(platformDir, CAPABILITY_TREE_DIRNAME, "public");
        if (!existsSync(snapshotDir)) {
          violations.push({
            capability: "artifact-integrity",
            message: `installed evidence for ${platform} has no capability tree snapshot in the merged upload`,
            path: snapshotDir,
          });
        } else if (evidence.scannedTree) {
          const actualTree = await manifestTree(snapshotDir);
          if (!sameTreeManifest(actualTree, evidence.scannedTree)) {
            violations.push({
              capability: "artifact-integrity",
              message: `capability tree snapshot for ${platform} does not match the scannedTree manifest recorded at install time`,
              path: snapshotDir,
            });
          } else {
            capabilityWebRoot = snapshotDir;
          }
        }
        const claim = payloadSources[0];
        const realPath = join(platformDir, claim.artifact);
        if (!existsSync(realPath)) {
          violations.push({
            capability: "artifact-integrity",
            message: `installed evidence binds payload artifact ${claim.artifact} but it is absent from the merged upload`,
            path: realPath,
          });
        } else {
          const realSha = sha256File(realPath);
          if (realSha !== claim.sha256 || statSync(realPath).size !== claim.bytes) {
            violations.push({
              capability: "artifact-integrity",
              message: `installed payload artifact ${claim.artifact} does not match evidence sha256/bytes; the smoke did not install the published installer`,
              path: realPath,
            });
          }
        }
        if (!evidence.limitation || evidence.limitation.trim().length === 0) {
          violations.push({
            capability: "artifact-integrity",
            message: `installed evidence for ${platform} must declare its limitation explicitly`,
            path: evidencePath,
          });
        }
      }

      // 真实 bytes 重新推导（不盲信 JSON capability 字段）。
      if (capabilityWebRoot) {
        const contract = await collectDesktopCapabilityContract({ identityRoot: input.identityRoot });
        violations.push(
          ...(await verifyDesktopWebCapability({
            webRoot: capabilityWebRoot,
            contract,
            requireAccountActions: true,
          })),
        );
      } else {
        violations.push({
          capability: "artifact-integrity",
          message: `no real packaged web bytes could be re-derived for ${platform}; capability cannot be proven`,
          path: evidencePath,
        });
      }
    } finally {
      if (releaseWorkDir) rmSync(releaseWorkDir, { recursive: true, force: true });
    }

    // artifact-integrity：证据 JSON 声明的 sha256 必须与合并后的真实安装包 bytes 一致。
    for (const claim of evidence.artifactFiles ?? []) {
      if (claim.name === CAPABILITY_TREE_DIRNAME || claim.name.startsWith(`${CAPABILITY_TREE_DIRNAME}/`)) continue;
      const realPath = join(platformDir, claim.name);
      if (!existsSync(realPath)) {
        violations.push({
          capability: "artifact-integrity",
          message: `evidence claims artifact ${claim.name} but it is absent from the merged upload`,
          path: realPath,
        });
        continue;
      }
      const realSha = sha256File(realPath);
      if (realSha !== claim.sha256 || statSync(realPath).size !== claim.bytes) {
        violations.push({
          capability: "artifact-integrity",
          message: `artifact ${claim.name} does not match evidence sha256/bytes (installers and verified capability tree diverge)`,
          path: realPath,
        });
      }
    }
    if (
      (evidence.artifactFiles ?? []).filter(
        (f) => !f.name.startsWith(`${CAPABILITY_TREE_DIRNAME}/`) && f.name !== CAPABILITY_EVIDENCE_FILENAME,
      ).length === 0
    ) {
      violations.push({
        capability: "artifact-integrity",
        message: `evidence for ${platform} lists no installer artifacts`,
        path: evidencePath,
      });
    }
  }
  return violations;
}

function usage(): never {
  console.error(
    `Usage:\n` +
      `  verifyDesktopPackageCapability.ts web --web-root <dir> --identity-root <dir>\n` +
      `  verifyDesktopPackageCapability.ts payload --artifacts-dir <dir> --installer <path> [--installer <path> ...]\n` +
      `  verifyDesktopPackageCapability.ts installed --artifacts-dir <dir> --web-root <dir> --payload-artifact <path>\n` +
      `  verifyDesktopPackageCapability.ts release --artifacts-dir <dir> [--identity-root <dir>]`,
  );
  process.exit(2);
}

function fail(violations: CapabilityViolation[]): never {
  for (const violation of violations) {
    console.error(`[desktop-capability] FAIL [${violation.capability}] ${violation.message}${violation.path ? ` (${violation.path})` : ""}`);
  }
  console.error(`[desktop-capability] ${violations.length} violation(s); refusing to proceed`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  const readArg = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 && index + 1 < args.length ? args[index + 1] : undefined;
  };
  const readArgs = (flag: string) => {
    const values: string[] = [];
    for (let index = args.indexOf(flag); index >= 0 && index + 1 < args.length; index = args.indexOf(flag, index + 1)) {
      values.push(args[index + 1]!);
    }
    return values;
  };
  const scriptDir = dirnameOf(import.meta.url);
  const repoRootDefault = resolve(scriptDir, "..", "..", "..");
  const identityRoot = resolve(readArg("--identity-root") ?? join(repoRootDefault, "packages", "identity"));

  if (mode === "web") {
    const webRoot = readArg("--web-root");
    if (!webRoot) usage();
    const contract = await collectDesktopCapabilityContract({ identityRoot });
    const violations = await verifyDesktopWebCapability({ webRoot, contract, requireAccountActions: false });
    violations.push(...(await runAnonymousLocalProbes(contract)));
    if (violations.length > 0) fail(violations);
    console.log("[desktop-capability] web bundle capability gate passed (edition/session/anonymous/privacy)");
    return;
  }
  if (mode === "payload" || mode === "installed") {
    const artifactsDir = readArg("--artifacts-dir");
    if (!artifactsDir) usage();
    const platform = normalizePlatform(process.platform);
    if (mode === "payload") {
      const installers = readArgs("--installer");
      if (installers.length === 0) usage();
      const violations = await writeExtractedPayloadEvidence({
        artifactsDir,
        installers,
        identityRoot,
        platform,
        limitation: readArg("--limitation"),
      });
      if (violations.length > 0) fail(violations);
      console.log(`[desktop-capability] extracted-payload capability evidence written for ${platform}`);
      return;
    }
    const webRoot = readArg("--web-root");
    const payloadArtifact = readArg("--payload-artifact");
    if (!webRoot || !payloadArtifact) usage();
    const violations = await writeInstalledEvidence({
      artifactsDir,
      webRoot,
      payloadArtifact,
      identityRoot,
      platform,
      limitation: readArg("--limitation"),
    });
    if (violations.length > 0) fail(violations);
    console.log(`[desktop-capability] installed capability evidence written for ${platform}`);
    return;
  }
  if (mode === "release") {
    const artifactsDir = readArg("--artifacts-dir");
    if (!artifactsDir) usage();
    const violations = await verifyDesktopReleaseArtifacts({ artifactsDir, identityRoot });
    if (violations.length > 0) fail(violations);
    console.log("[desktop-capability] release gate passed for all platforms (windows/macos/linux)");
    return;
  }
  usage();
}

function dirnameOf(url: string): string {
  return new URL(".", url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
}

function normalizePlatform(platform: string): ReleasePlatform {
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";
  if (platform === "linux") return "linux";
  throw new Error(`unsupported desktop build platform: ${platform}`);
}

if (import.meta.main) {
  await main();
}
