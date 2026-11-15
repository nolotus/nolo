import { createHash } from "node:crypto";
import { existsSync, lstatSync, statSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** Parent/child wire contract only; not a capability or authorization negotiation. */
export const AGENT_RUN_PROTOCOL = "nolo-agent-run/2";
export type RunStartupPhase = "spawn" | "initializing" | "protocol_validated" | "model";

export class RuntimeProtocolMismatchError extends Error {
  readonly code = "runtime_protocol_mismatch";
  constructor() {
    super("runtime_protocol_mismatch: parent and child agent-run protocols differ");
  }
}

export function validateAgentRunProtocol(expected: string | undefined): void {
  if (expected !== AGENT_RUN_PROTOCOL) throw new RuntimeProtocolMismatchError();
}

export class RuntimeVersionMismatchError extends Error {
  readonly code = "runtime_version_mismatch";
  constructor(detail: string) {
    super(`runtime_version_mismatch: ${detail}; restart CLI/desktop before retrying`);
  }
}

// Deliberately not a Git identity: two dirty edits at the same HEAD must differ.
// Only application code and runtime configuration are read, never arbitrary files.
const ignoredDirectories = new Set([
  "node_modules", ".git", ".nolo", ".worktrees", "data", "nolodata", "credentials",
  "dist", "build", "public", "assets", "docs", "logs", "artifacts", "coverage",
  "__tests__", "__fixtures__", "fixtures", "testHelpers", "test-helpers",
]);
const codeFile = /\.[cm]?[jt]sx?$/;
const testFile = /(?:\.(?:test|spec)\.[^.]+$|^tsconfig\.)/;

export function captureRuntimeContent(root: string, source: boolean): string {
  const hash = createHash("sha256");
  const active = new Set<string>();
  const visit = (directory: string) => {
    const canonical = realpathSync(directory);
    if (active.has(canonical)) throw new RuntimeVersionMismatchError("runtime code contains a symlink cycle");
    active.add(canonical);
    for (const name of readdirSync(directory).sort()) {
      if (name.startsWith(".") || ignoredDirectories.has(name)) continue;
      const path = join(directory, name);
      let stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        // Ignore non-code file links; follow code/package links and hash their contents.
        try { stat = statSync(path); } catch {
          if (codeFile.test(name) || name === "package.json") throw new RuntimeVersionMismatchError("runtime code link is unreadable");
          continue;
        }
      }
      if (stat.isDirectory()) visit(path);
      else if ((codeFile.test(name) && !testFile.test(name)) || name === "package.json") {
        // Frame names and bytes to avoid concatenation ambiguity.
        const bytes = readFileSync(path);
        hash.update(JSON.stringify([relative(root, path), bytes.length]));
        hash.update(bytes);
      }
    }
    active.delete(canonical);
  };
  if (source) {
    visit(join(root, "packages"));
    for (const name of ["package.json", "bun.lock", "bun.lockb", "bunfig.toml", "tsconfig.json"]) {
      hash.update(name);
      const path = join(root, name);
      hash.update(existsSync(path) ? readFileSync(path) : "<absent>");
    }
  } else visit(root); // Published JS entry and all sibling chunks, not just index.js.
  return hash.digest("hex");
}

export function createRuntimeContentGuard(root: string, source: boolean): (() => void) & { identity: string } {
  const canonical = realpathSync(root);
  const startupContent = captureRuntimeContent(canonical, source);
  return Object.assign(() => {
    try {
      if (captureRuntimeContent(canonical, source) !== startupContent) {
        throw new RuntimeVersionMismatchError("runtime content changed since host startup");
      }
    } catch (error) {
      if (error instanceof RuntimeVersionMismatchError) throw error;
      throw new RuntimeVersionMismatchError("startup runtime content is no longer readable");
    }
  }, { identity: startupContent });
}

function captureHostRuntimeGuard(): (() => void) & { identity: string } {
  try {
    const url = import.meta.url;
    if (url.includes("/$bunfs/")) {
      const executable = getHostRuntimeExecutable();
      const digest = createHash("sha256").update(readFileSync(executable)).digest("hex");
      return Object.assign(() => {
        try {
          if (createHash("sha256").update(readFileSync(executable)).digest("hex") !== digest) {
            throw new RuntimeVersionMismatchError("host executable changed since startup");
          }
        } catch (error) {
          if (error instanceof RuntimeVersionMismatchError) throw error;
          throw new RuntimeVersionMismatchError("startup executable is no longer readable");
        }
      }, { identity: digest });
    }
    const modulePath = fileURLToPath(url);
    const source = extname(modulePath) === ".ts";
    return createRuntimeContentGuard(source ? dirname(dirname(dirname(modulePath))) : dirname(modulePath), source);
  } catch {
    return Object.assign(() => { throw new RuntimeVersionMismatchError("host startup identity unavailable"); }, { identity: "unavailable" });
  }
}

// Explicitly initialized by agent-capable hosts BEFORE importing application runtime.
// Importing this module alone (help/version/doctor) performs no filesystem scan.
let hostExecutable: string | undefined;
/** Agent hosts freeze the executable before any later public-link switch. */
export function getHostRuntimeExecutable(): string {
  return hostExecutable ?? realpathSync(process.execPath);
}
let hostGuard: ReturnType<typeof captureHostRuntimeGuard> | undefined;
export let HOST_RUNTIME_CONTENT_IDENTITY = "uninitialized";
export function initializeHostRuntimeIdentity(): void {
  if (hostGuard) return;
  hostExecutable = realpathSync(process.execPath);
  hostGuard = captureHostRuntimeGuard();
  HOST_RUNTIME_CONTENT_IDENTITY = hostGuard.identity;
}
export function assertHostRuntimeUnchanged(): void {
  if (!hostGuard) throw new RuntimeVersionMismatchError("agent host identity was not initialized at startup");
  hostGuard();
}
export function validateHostRuntimeIdentity(expected: string | undefined): void {
  if (!hostGuard || expected !== HOST_RUNTIME_CONTENT_IDENTITY) {
    throw new RuntimeVersionMismatchError("child runtime differs from parent startup content");
  }
}
export function isAgentRuntimeHostCommand(args: string[], interactive: boolean): boolean {
  if (args.some(arg => ["--help", "-h", "--version", "-v"].includes(arg))) return false;
  if (!args.length) return interactive;
  return args[0] === "chat" || args[0] === "tui" || args[0] === "connect" ||
    (args[0] === "agent" && ["run", "continue", "smoke-current"].includes(args[1]));
}

export function resolveExactRuntimeEntrypoint(path: string): string {
  try {
    if (!existsSync(path)) throw new Error("missing");
    return realpathSync(path);
  } catch {
    throw new RuntimeVersionMismatchError("explicit runtime entrypoint is missing or unreadable");
  }
}
