/**
 * `nolo chrome status | install | reload` — the TUI's way from "nothing installed" to "an agent in
 * this terminal can drive my real Chrome".
 *
 * This module owns no connector logic. It resolves the connector checkout (`extension/` +
 * `native-host/`), reuses the same installer the desktop app calls
 * (`installNativeHostManifest`), and talks to the running native host through the connector's own
 * client — so installer guarantees (idempotent token, per-platform manifest path) and RPC semantics
 * cannot drift between desktop and CLI.
 *
 * Why three commands and not one: `install` writes files Chrome reads at startup, `reload` is the only
 * way to pick up changed extension code without the desktop app, and `status` has to tell the user
 * *which* of the three is next — manifest missing, token missing, or connector offline are three
 * different fixes.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { toErrorMessage } from "core/errorMessage";
import {
  createChromeConnectorClient,
  NOLO_CHROME_CONNECTOR_EXTENSION_ID,
  NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION,
  REQUIRED_CHROME_CONNECTOR_FEATURES,
  type ChromeConnectorClient,
} from "../desktop-chrome-connector/chromeConnector";
import {
  extensionIdFromPublicKey,
  installNativeHostManifest,
  resolveNativeHostInstallPaths,
} from "./chromeNativeHost";

type EnvLike = Record<string, string | undefined>;
type OutputLike = { write(chunk: string): unknown };
type RequestChrome = ChromeConnectorClient["request"];

type InstallOptions = {
  home?: string;
  connectorRoot?: string;
  platform?: string;
  extensionId?: string;
  nodePath?: string;
};

type InstallResult = {
  extensionId: string;
  nodePath: string;
  tokenPath: string;
  nativeManifestPath: string;
  wrapperPath: string;
  supportDir: string;
  extensionManifestPath: string;
  connectorRoot: string;
};

export type ChromeCommandDeps = {
  env?: EnvLike;
  output?: OutputLike;
  /** Overrides process.platform (tests). */
  platform?: string;
  /** Overrides env.HOME (tests). */
  home?: string;
  /** Explicit connector checkout; skips auto-detection (tests / non-repo installs). */
  connectorRoot?: string;
  /** RPC override (tests, alternate ports). */
  requestChrome?: RequestChrome;
  /** Installer override (tests); defaults to the shared installer. */
  installNativeHost?: (options?: InstallOptions) => InstallResult;
  /** Node executable the generated wrapper must exec (tests / unusual installs). */
  nodePath?: string;
};

/**
 * Connector checkout locations relative to this module (`packages/cli`):
 * - dev / monorepo: `../desktop-chrome-connector`;
 * - the same layouts the desktop runtime probes, so a copied/installed tree can still be found.
 * The first candidate containing `extension/manifest.json` wins.
 */
export const CLI_CONNECTOR_ROOT_CANDIDATES = [
  "../desktop-chrome-connector",
  "../../desktop-chrome-connector",
  "../integrations/connector",
  "../../integrations/connector",
] as const;

/** Every feature the tool family needs; the four the extension advertises when it is fully capable. */
export const FULL_SUPPORT_CHROME_FEATURES = [
  ...new Set(Object.values(REQUIRED_CHROME_CONNECTOR_FEATURES).flat()),
].sort();

export type ChromeConnectorStatusReport = {
  ok: boolean;
  connectorRoot: string | null;
  /** Why the connector checkout could not be resolved (only set when `connectorRoot` is null). */
  connectorRootError?: string;
  extension: {
    path: string | null;
    expectedId: string;
  };
  nativeHost: {
    /** False when the platform has no supported install (win32). */
    supported: boolean;
    /** Why the platform is unsupported (only set when `supported` is false). */
    platformError?: string;
    installed: boolean;
    manifestPath: string | null;
    wrapperPath: string | null;
    /** `path` recorded in the installed manifest, as read back. */
    installedWrapperPath: string | null;
    wrapperPathMatches: boolean;
    allowedOriginMatches: boolean;
  };
  token: {
    path: string | null;
    present: boolean;
  };
  rpc: {
    online: boolean;
    extensionId: string | null;
    protocolVersion: string | null;
    features: string[];
    missingFeatures: string[];
    expectedProtocolVersion: string;
    error?: { code: string; message: string };
  };
  nextStep: string;
};

function pickCliConnectorRoot(candidates: readonly string[]) {
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, "extension", "manifest.json"))) return candidate;
  }
  return null;
}

/**
 * Resolves the connector checkout the CLI should install from.
 *
 * `NOLO_CHROME_CONNECTOR_ROOT` wins when set, but a bogus value is an error rather than a silent
 * fallback — installing a manifest that points at some other checkout is exactly the confusion
 * `status` exists to prevent.
 */
export function resolveCliConnectorRoot(args: {
  env?: EnvLike;
  moduleDir?: string;
} = {}) {
  const env = args.env ?? process.env;
  const moduleDir = args.moduleDir ?? import.meta.dir;
  const override = (env.NOLO_CHROME_CONNECTOR_ROOT ?? "").trim();
  if (override) {
    const resolvedOverride = resolve(override);
    if (!existsSync(resolve(resolvedOverride, "extension", "manifest.json"))) {
      throw new Error(
        `NOLO_CHROME_CONNECTOR_ROOT is set to ${resolvedOverride}, but it contains no extension/manifest.json. ` +
          "Unset it or point it at a Nolo Chrome connector checkout.",
      );
    }
    return resolvedOverride;
  }
  const candidates = CLI_CONNECTOR_ROOT_CANDIDATES.map((relative) =>
    resolve(moduleDir, relative),
  );
  const found = pickCliConnectorRoot(candidates);
  if (!found) {
    throw new Error(
      "Nolo Chrome connector sources not found. Run the CLI from a repo checkout that contains " +
        `packages/desktop-chrome-connector, or set NOLO_CHROME_CONNECTOR_ROOT. Probed: ${candidates.join(", ")}`,
    );
  }
  return found;
}

/**
 * Detects a throwaway checkout (git worktree) before `install` writes a wrapper into the user's real
 * Chrome profile.
 *
 * A linked worktree looks exactly like a real checkout to the installer, but the wrapper it writes
 * embeds absolute paths inside that worktree — so once the worktree is removed, Chrome keeps
 * launching a wrapper whose node script is gone and the connector dies silently. This is not
 * theoretical: the TUI feature itself is developed and verified from `.worktrees/…`, which is
 * precisely where `nolo chrome install` would run.
 *
 * Detection: a linked worktree's repo root holds a `.git` *file* whose content is
 * `gitdir: <main>/.git/worktrees/<name>`. When that marker is gone the path shape decides — but only
 * when `.worktrees` sits *below* a real checkout root, so a repository that merely lives under a
 * directory called `.worktrees` is never refused.
 */
export function detectWorktreeCheckout(connectorRoot: string): {
  worktreeRoot: string;
  mainRoot: string | null;
} | null {
  const resolvedRoot = resolve(connectorRoot);
  let dir = resolvedRoot;
  let checkoutRoot: string | null = null;
  for (let depth = 0; depth < 8; depth += 1) {
    const gitEntry = resolve(dir, ".git");
    if (existsSync(gitEntry)) {
      let isGitFile: boolean | null = null;
      try {
        isGitFile = statSync(gitEntry).isFile();
      } catch {
        // Unreadable marker: fall through to the path-based heuristic (fail-safe).
      }
      if (isGitFile === true) {
        try {
          const match = /^gitdir:\s*(.+)$/m.exec(readFileSync(gitEntry, "utf8"));
          const gitDir = match ? resolve(dir, match[1].trim()) : null;
          if (gitDir && gitDir.split(/[\\/]+/).includes("worktrees")) {
            return { worktreeRoot: dir, mainRoot: resolve(gitDir, "..", "..", "..") };
          }
        } catch {
          // Unreadable .git marker: fall through to the path-based heuristic.
        }
      } else if (isGitFile === false) {
        // `.git` is a directory: this is a real checkout root. It may still *contain* a worktree
        // (`<checkout>/.worktrees/<name>`), which is what the path heuristic below checks.
        checkoutRoot = dir;
      }
      break;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  const segments = resolvedRoot.split(/[\\/]+/);
  const markerIndex = segments.indexOf(".worktrees");
  if (markerIndex <= 0) return null;
  // The marker must sit *below* the checkout root (a worktree of that checkout), never above it —
  // that is what keeps a repository whose own path merely contains `.worktrees` (e.g. the main
  // checkout living in `/srv/.worktrees/repo`) from being refused.
  if (checkoutRoot) {
    const checkoutDepth = resolve(checkoutRoot).split(/[\\/]+/).length;
    if (markerIndex < checkoutDepth) return null;
  }
  return {
    worktreeRoot: segments.slice(0, markerIndex + 2).join("/"),
    mainRoot: segments.slice(0, markerIndex).join("/") || "/",
  };
}

function readExtensionManifest(connectorRoot: string): Record<string, unknown> | null {
  try {
    return JSON.parse(
      readFileSync(resolve(connectorRoot, "extension", "manifest.json"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readJsonFile(path: string): Record<string, any> | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, any>;
  } catch {
    return null;
  }
}

async function probeConnectorRpc(requestChrome: RequestChrome) {
  try {
    const connectorInfo = (await requestChrome("connector_info", {})) ?? {};
    const features = Array.isArray((connectorInfo as { features?: unknown }).features)
      ? ((connectorInfo as { features: unknown[] }).features.filter(
          (entry): entry is string => typeof entry === "string",
        ))
      : [];
    return {
      online: true as const,
      extensionId:
        typeof (connectorInfo as { extensionId?: unknown }).extensionId === "string"
          ? ((connectorInfo as { extensionId: string }).extensionId)
          : null,
      protocolVersion:
        typeof (connectorInfo as { protocolVersion?: unknown }).protocolVersion === "string"
          ? ((connectorInfo as { protocolVersion: string }).protocolVersion)
          : null,
      features,
    };
  } catch (error) {
    return {
      online: false as const,
      extensionId: null,
      protocolVersion: null,
      features: [] as string[],
      error: {
        code: (error as { code?: string })?.code ?? "CHROME_CONNECTOR_ERROR",
        message: toErrorMessage(error),
      },
    };
  }
}

function resolveStatusNextStep(report: ChromeConnectorStatusReport) {
  if (!report.connectorRoot) {
    if (report.rpc.online && report.rpc.protocolVersion === report.rpc.expectedProtocolVersion) {
      return (
        "Chrome connector is online, but this CLI cannot see a connector checkout, so `nolo chrome " +
        "install` / manifest checks are unavailable here. Set NOLO_CHROME_CONNECTOR_ROOT (or run the " +
        "CLI from a repo checkout) to enable them."
      );
    }
    return (
      "Run the CLI from a repo checkout that contains packages/desktop-chrome-connector, " +
      "or set NOLO_CHROME_CONNECTOR_ROOT to one, then rerun `nolo chrome status`."
    );
  }
  if (!report.nativeHost.supported) {
    return (
      "This platform has no supported native messaging host install (Chrome looks the host up " +
      `through a registry value on Windows), so non-interactive install is not available: ${report.nativeHost.platformError ?? "unsupported platform"}`
    );
  }
  if (!report.nativeHost.installed || !report.token.present) {
    return "nolo chrome install";
  }
  if (!report.nativeHost.wrapperPathMatches || !report.nativeHost.allowedOriginMatches) {
    const installedWrapperPath = report.nativeHost.installedWrapperPath;
    // A healthy install owned by a *different* checkout (the common worktree case) is a fact to
    // report, not a reason to reinstall: suggesting `nolo chrome install` here is how the user gets
    // walked into pointing Chrome at a checkout that is about to be deleted.
    if (
      !report.nativeHost.wrapperPathMatches &&
      installedWrapperPath &&
      installedWrapperPath !== report.nativeHost.wrapperPath &&
      existsSync(installedWrapperPath)
    ) {
      return (
        `Native host is installed for a different checkout (${installedWrapperPath}); this CLI is ` +
        `looking at ${report.connectorRoot}. Run \`nolo chrome status\` from the checkout that ` +
        "installed it, or run `nolo chrome install` from here only if Chrome should switch to this one."
      );
    }
    return (
      "nolo chrome install (the installed manifest does not point at this checkout's wrapper / " +
      "extension id, which Chrome silently ignores)"
    );
  }
  if (!report.rpc.online) {
    return (
      `Load the unpacked extension from ${report.extension.path} in chrome://extensions ` +
      "(Developer mode) or install it from the Chrome Web Store, then rerun `nolo chrome status`."
    );
  }
  if (report.rpc.extensionId && report.rpc.extensionId !== report.extension.expectedId) {
    return (
      `The connected extension (${report.rpc.extensionId}) is not the connector at ` +
      `${report.extension.path}; remove the other copy and rerun \`nolo chrome status\`.`
    );
  }
  if (report.rpc.protocolVersion !== report.rpc.expectedProtocolVersion) {
    return (
      "nolo chrome reload (the running extension does not speak protocol " +
      `${report.rpc.expectedProtocolVersion}; a reload restarts the worker with the files on disk)`
    );
  }
  if (report.rpc.missingFeatures.length > 0) {
    return (
      `nolo chrome reload (the running extension is missing ${report.rpc.missingFeatures.join(", ")}); ` +
      "if that persists, the checkout's extension is older than the CLI expects."
    );
  }
  return "Chrome connector is online: chrome_* tools execute against this Chrome profile.";
}

export async function buildChromeConnectorStatus(
  args: Omit<ChromeCommandDeps, "installNativeHost" | "nodePath"> = {},
): Promise<ChromeConnectorStatusReport> {
  const env = args.env ?? process.env;
  const home = args.home ?? env.HOME ?? "";
  const platform = args.platform ?? process.platform;

  let connectorRoot: string | null = args.connectorRoot ?? null;
  let rootError: string | null = null;
  if (!connectorRoot) {
    try {
      connectorRoot = resolveCliConnectorRoot({ env });
    } catch (error) {
      rootError = toErrorMessage(error);
    }
  }

  const extensionManifest = connectorRoot ? readExtensionManifest(connectorRoot) : null;
  const expectedId =
    extensionManifest && typeof extensionManifest.key === "string"
      ? extensionIdFromPublicKey(extensionManifest.key)
      : NOLO_CHROME_CONNECTOR_EXTENSION_ID;

  const report: ChromeConnectorStatusReport = {
    ok: false,
    connectorRoot,
    extension: {
      path: connectorRoot ? resolve(connectorRoot, "extension") : null,
      expectedId,
    },
    nativeHost: {
      supported: true,
      installed: false,
      manifestPath: null,
      wrapperPath: null,
      installedWrapperPath: null,
      wrapperPathMatches: false,
      allowedOriginMatches: false,
    },
    token: { path: null, present: false },
    rpc: {
      online: false,
      extensionId: null,
      protocolVersion: null,
      features: [],
      missingFeatures: [...FULL_SUPPORT_CHROME_FEATURES],
      expectedProtocolVersion: NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION,
    },
    nextStep: "",
  };

  // Token + 127.0.0.1 only, so the live probe runs even when no checkout was found: an installed CLI
  // pointing at a desktop-installed native host is a healthy state and must not read as "offline".
  const requestChrome = args.requestChrome ?? createChromeConnectorClient().request;
  const probe = await probeConnectorRpc(requestChrome);
  report.rpc.online = probe.online;
  report.rpc.extensionId = probe.extensionId;
  report.rpc.protocolVersion = probe.protocolVersion;
  report.rpc.features = probe.features;
  report.rpc.missingFeatures = FULL_SUPPORT_CHROME_FEATURES.filter(
    (feature) => !probe.features.includes(feature),
  );
  if (!probe.online) report.rpc.error = probe.error;

  if (!connectorRoot) {
    if (rootError) report.connectorRootError = rootError;
    report.ok =
      report.rpc.online &&
      probe.extensionId === expectedId &&
      probe.protocolVersion === NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION &&
      report.rpc.missingFeatures.length === 0;
    report.nextStep = resolveStatusNextStep(report);
    return report;
  }

  let paths: ReturnType<typeof resolveNativeHostInstallPaths> | null = null;
  try {
    paths = resolveNativeHostInstallPaths({ home, connectorRoot, platform });
  } catch (error) {
    // An unsupported platform must produce a status answer, not a crash.
    report.nativeHost.supported = false;
    report.nativeHost.platformError = toErrorMessage(error);
    report.nextStep = resolveStatusNextStep(report);
    return report;
  }

  report.nativeHost.manifestPath = paths.nativeManifestPath;
  report.nativeHost.wrapperPath = paths.wrapperPath;
  report.token.path = paths.tokenPath;

  const installedManifest = existsSync(paths.nativeManifestPath)
    ? readJsonFile(paths.nativeManifestPath)
    : null;
  report.nativeHost.installed = installedManifest !== null;
  report.nativeHost.installedWrapperPath =
    typeof installedManifest?.path === "string" ? installedManifest.path : null;
  report.nativeHost.wrapperPathMatches =
    report.nativeHost.installedWrapperPath === paths.wrapperPath;
  const expectedOrigin = `chrome-extension://${expectedId}/`;
  report.nativeHost.allowedOriginMatches =
    Array.isArray(installedManifest?.allowed_origins) &&
    installedManifest.allowed_origins.includes(expectedOrigin);

  if (existsSync(paths.tokenPath)) {
    try {
      report.token.present = readFileSync(paths.tokenPath, "utf8").trim().length > 0;
    } catch {
      report.token.present = false;
    }
  }

  report.ok =
    report.nativeHost.supported &&
    report.nativeHost.installed &&
    report.nativeHost.wrapperPathMatches &&
    report.nativeHost.allowedOriginMatches &&
    report.token.present &&
    probe.online &&
    probe.extensionId === expectedId &&
    probe.protocolVersion === NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION &&
    report.rpc.missingFeatures.length === 0;
  report.nextStep = resolveStatusNextStep(report);
  return report;
}

function yesNo(value: boolean) {
  return value ? "ok" : "mismatch";
}

export function formatChromeConnectorStatus(report: ChromeConnectorStatusReport) {
  const lines: string[] = ["Nolo Chrome connector"];
  lines.push(
    `  connector source : ${report.connectorRoot ?? "(not found)"}`,
  );
  lines.push(
    `  extension        : ${report.extension.path ?? "(not found)"} (id ${report.extension.expectedId})`,
  );
  lines.push(
    `  native manifest  : ${
      !report.nativeHost.supported
        ? "(unsupported platform)"
        : report.nativeHost.manifestPath
          ? `${report.nativeHost.manifestPath} [${report.nativeHost.installed ? "installed" : "missing"}]`
          : "(not resolved)"
    }`,
  );
  if (report.nativeHost.supported && report.nativeHost.installed) {
    lines.push(`    wrapper path   : ${yesNo(report.nativeHost.wrapperPathMatches)} (${report.nativeHost.installedWrapperPath ?? "unreadable"})`);
    lines.push(`    allowed origins: ${yesNo(report.nativeHost.allowedOriginMatches)}`);
  }
  lines.push(
    `  token            : ${report.token.present ? "present" : "missing"}${
      report.token.path ? ` ${report.token.path}` : ""
    }`,
  );
  const rpc = report.rpc;
  if (rpc.online) {
    lines.push(
      `  RPC              : online  extension ${rpc.extensionId ?? "unknown"}  ` +
        `protocolVersion ${rpc.protocolVersion ?? "unknown"}  features ${
          rpc.features.length > 0 ? rpc.features.join(", ") : "(none)"
        }`,
    );
  } else {
    lines.push(
      `  RPC              : offline  ${rpc.error ? `${rpc.error.code}: ${rpc.error.message}` : ""}`.trimEnd(),
    );
  }
  lines.push(`Next step: ${report.nextStep}`);
  return `${lines.join("\n")}\n`;
}

export async function runChromeStatusCommand(
  args: string[],
  deps: Omit<ChromeCommandDeps, "installNativeHost" | "nodePath"> = {},
) {
  const output = deps.output ?? process.stdout;
  let report: ChromeConnectorStatusReport;
  try {
    report = await buildChromeConnectorStatus(deps);
  } catch (error) {
    output.write(`[nolo] Chrome connector status failed: ${toErrorMessage(error)}\n`);
    return 1;
  }
  if (args.includes("--json")) {
    output.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    output.write(formatChromeConnectorStatus(report));
  }
  return report.ok ? 0 : 1;
}

export async function runChromeInstallCommand(args: string[], deps: ChromeCommandDeps = {}) {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;
  const install = deps.installNativeHost ??
    (installNativeHostManifest as (options?: InstallOptions) => InstallResult);

  let connectorRoot: string;
  try {
    connectorRoot = deps.connectorRoot ?? resolveCliConnectorRoot({ env });
  } catch (error) {
    output.write(`[nolo] Chrome native host install failed: ${toErrorMessage(error)}\n`);
    return 1;
  }

  // Refuse to point the user's real Chrome profile at a checkout that will be deleted. An explicit
  // NOLO_CHROME_CONNECTOR_ROOT (or --force) means the caller knows which checkout they want.
  const explicitRoot = (env.NOLO_CHROME_CONNECTOR_ROOT ?? "").trim().length > 0;
  const worktree = detectWorktreeCheckout(connectorRoot);
  if (worktree && !explicitRoot && !args.includes("--force")) {
    output.write(
      "[nolo] Chrome native host install failed: refusing to install from a git worktree " +
        `(${worktree.worktreeRoot}). The wrapper it would write execs the native host inside that ` +
        "worktree, so the connector would stop working as soon as the worktree is removed. Run this " +
        `from the main checkout${worktree.mainRoot ? ` (${worktree.mainRoot})` : ""}, or re-run with ` +
        "--force / NOLO_CHROME_CONNECTOR_ROOT=<checkout> if Chrome should really use this one.\n",
    );
    return 1;
  }

  let result: InstallResult;
  try {
    result = install({
      home: deps.home ?? env.HOME ?? "",
      connectorRoot,
      ...(deps.platform ? { platform: deps.platform } : {}),
      ...(deps.nodePath ? { nodePath: deps.nodePath } : {}),
    });
  } catch (error) {
    output.write(`[nolo] Chrome native host install failed: ${toErrorMessage(error)}\n`);
    return 1;
  }

  if (args.includes("--json")) {
    output.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`);
  } else {
    output.write(
      [
        "Nolo Chrome connector native host installed.",
        `  manifest : ${result.nativeManifestPath}`,
        `  wrapper  : ${result.wrapperPath} -> ${result.nodePath}`,
        `  token    : ${result.tokenPath} (an existing token is kept, so reruns are idempotent)`,
        `  extension: ${result.extensionId}`,
        `Next step: load the unpacked extension from ${resolve(connectorRoot, "extension")} in ` +
          "chrome://extensions (Developer mode) or install it from the Chrome Web Store, then run `nolo chrome status`.",
        "",
      ].join("\n"),
    );
  }
  return 0;
}

export async function runChromeReloadCommand(args: string[], deps: ChromeCommandDeps = {}) {
  const output = deps.output ?? process.stdout;
  // Deliberately the *unverified* client: reload is the recovery path when the running extension is
  // stale (older protocol / missing features), so requiring a protocol handshake first would turn the
  // one fix that exists into a dead end.
  const requestChrome = deps.requestChrome ?? createChromeConnectorClient().request;
  try {
    const result = await requestChrome("reload_extension", {});
    if (args.includes("--json")) {
      output.write(`${JSON.stringify({ ok: true, result }, null, 2)}\n`);
    } else {
      output.write(
        `Reload requested: ${JSON.stringify(result ?? {})}\n` +
          "The connector service worker restarts within ~1s; verify with `nolo chrome status`.\n",
      );
    }
    return 0;
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "CHROME_CONNECTOR_ERROR";
    output.write(`[nolo] Chrome connector reload failed: ${code} ${toErrorMessage(error)}\n`);
    if (code === "CHROME_CONNECTOR_UNAVAILABLE") {
      output.write(
        "The native host is not reachable: load the unpacked connector extension in chrome://extensions " +
          "(or start Chrome), then rerun `nolo chrome reload`.\n",
      );
    }
    return 1;
  }
}
