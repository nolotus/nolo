import { readdir, readFile, stat } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { spawn as spawnChildProcess } from "node:child_process";
import { resolveExecutableOnPath } from "./runtimeCompat";
import { readRootGitignorePatterns } from "./gitignore";

// ───────────────────────────────────────────────────────────────────────────
// Type definitions
// ───────────────────────────────────────────────────────────────────────────

export type FileTextSearchMatch = { path: string; line: number; text: string; before: string[]; after: string[] };
export type FileTextSearchEngine = "ripgrep" | "grep" | "js";

/** How a command run ended. Exactly one of the outcomes applies. */
export type CommandOutcome =
  | { kind: "completed"; exitCode: number | null }
  | { kind: "spawn-failed" }
  | { kind: "stopped-by-limit" };

export type CommandResult = { stdout: string; stderr: string; outcome: CommandOutcome };
export type RunCommand = (binary: string, args: string[], cwd: string, maxResults?: number) => Promise<CommandResult>;

export type FileTextSearchOptions = {
  root: string;
  target?: string;
  query: string;
  regex?: boolean;
  caseSensitive?: boolean;
  contextLines?: number;
  maxResults?: number;
  includeIgnored?: boolean;
  exclude?: string[];
  include?: string;
  absolutePaths?: boolean;
  resolveRipgrepBinary?: () => string | null;
  resolveGrepBinary?: () => string | null;
  runCommand?: RunCommand;
  /**
   * Internal test seam: overrides how the JS fallback reads file text
   * (lightweight reader injection for deterministic early-stop tests). Not
   * part of any public tool schema.
   */
  readTextFile?: (filePath: string) => Promise<string>;
};

export type FileTextSearchResult = { matches: FileTextSearchMatch[]; totalMatches: number; truncated: boolean; engine: FileTextSearchEngine };

/** Raw record shape shared by rg/grep line-oriented output after parsing. */
type RawRecord = { file: string; line: number; text: string };

// ───────────────────────────────────────────────────────────────────────────
// Path helpers
// ───────────────────────────────────────────────────────────────────────────

const normalizePath = (value: string) => value.replaceAll("\\", "/");
const pathFor = (root: string, file: string, absolute = false) => absolute ? normalizePath(file) : normalizePath(relative(root, file) || basename(file));

// ───────────────────────────────────────────────────────────────────────────
// Command runner
//
// maxResults is an upper bound for capture: both rg and grep are launched with
// `maxResults + 1` (see COMMAND_LIMIT_HEADROOM) so the caller can distinguish
// "exactly N matches" (never saw record N+1 → not truncated) from "at least
// N+1" (saw record N+1 → truncated=true, keep top N). The runner kills the
// child as soon as it has captured that N+1 lines of record output — this is
// the top-N early stop, a successful bounded run, never a failure.
// ───────────────────────────────────────────────────────────────────────────

const COMMAND_LIMIT_HEADROOM = 1;
const MAX_SEARCH_FILE_BYTES = 8 * 1024 * 1024;
const MAX_SEARCH_LINE_CHARS = 2000;

async function runCommand(binary: string, args: string[], cwd: string, maxResults?: number): Promise<CommandResult> {
  // Record lines to capture before stopping the child (N+1 for the headroom).
  // Count parsed `path\\0line:text` records, not arbitrary newlines in a
  // stream chunk. This keeps the limit tied to the --null output contract.
  const recordLimit = maxResults === undefined ? 0 : Math.max(0, maxResults) + COMMAND_LIMIT_HEADROOM;
  return await new Promise((done) => {
    let stdout = "", stderr = "", recordCount = 0, stopped = false;
    try {
      // Windows: a console-less parent (a detached background run) would otherwise get a
      // flashing console window for every grep/rg search.
      const child = spawnChildProcess(binary, args, { cwd, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      child.stdout.on("data", (chunk: Buffer) => {
        // Bound even grep output before a giant first record can accumulate.
        const room = MAX_SEARCH_FILE_BYTES - stdout.length;
        stdout += chunk.toString().slice(0, Math.max(0, room));
        if (stdout.length >= MAX_SEARCH_FILE_BYTES && !stopped) {
          stopped = true;
          child.kill();
        }
        recordCount = parseMatches(cwd, stdout).length;
        if (recordLimit > 0 && recordCount >= recordLimit && !stopped) {
          stopped = true;
          child.kill();
        }
      });
      child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
      child.on("error", () => done({ stdout, stderr, outcome: { kind: "spawn-failed" } }));
      child.on("close", (exitCode) => done({ stdout, stderr, outcome: stopped ? { kind: "stopped-by-limit" } : { kind: "completed", exitCode } }));
    } catch {
      done({ stdout, stderr, outcome: { kind: "spawn-failed" } });
    }
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Argument builders
// ───────────────────────────────────────────────────────────────────────────

/**
 * A caller exclude pattern is expressible by grep's `--exclude-dir` if and only
 * if it explicitly specifies a directory (ending in `/**`, `/*`, or `/`) and the
 * resulting directory name is a single bare name without path separators or
 * wildcard characters (e.g. `node_modules/**`, `.git/**`, `coverage/`).
 *
 * Bare names without trailing slashes (e.g. `secret`, `.env`, `credentials`, `id_rsa`)
 * could refer to files. Since grep `--exclude-dir` only skips directories, treating
 * bare names as directories would leak matching files.
 *
 * Leading/trailing whitespace is preserved as-is so callers with whitespace
 * in folder names are handled consistently without silent mismatch.
 */
export function extractGrepExcludeDir(pattern: string): string | null {
  const p = pattern.replaceAll("\\", "/");
  if (!p) return null;
  if (!/\/(\*{1,2})?$/.test(p)) return null;
  const clean = p.replace(/\/(\*{1,2})?$/, "");
  if (!clean || clean.includes("/") || /[*?{}[\]]/.test(clean)) return null;
  return clean;
}

export function isGrepExpressibleExclude(pattern: string): boolean {
  return extractGrepExcludeDir(pattern) !== null;
}

function commandArgs(o: FileTextSearchOptions, binary: "rg" | "grep", target: string): string[] {
  const args = binary === "rg" ? ["--line-number", "--no-heading", "--color", "never", "--null"] : ["-RIn", "--binary-files=without-match", "--null"];
  // Workspace roots are often plain directories without .git (spills, app
  // workspaces, tmpdirs). rg >= 15 only honors .gitignore inside a real repo
  // unless --no-require-git is passed; older rg ignores the flag's absence.
  // Passing it unconditionally gives uniform gitignore parity everywhere.
  if (binary === "rg") args.push("--no-require-git", "--max-columns", String(MAX_SEARCH_LINE_CHARS), "--max-columns-preview");
  if (o.regex !== true) args.push(binary === "rg" ? "--fixed-strings" : "-F"); else if (binary === "grep") args.push("-E");
  if (o.caseSensitive === false) args.push("-i");
  if (binary === "rg") {
    if (o.includeIgnored) args.push("--no-ignore");
    // Caller policy is the only exclusion policy — the primitive ships no
    // defaults. rg is the complete Git-ignore semantics source; every caller
    // glob is passed through verbatim.
    for (const x of o.exclude ?? []) args.push("--glob", `!${x}`);
    // Type filters narrow candidate files without overriding .gitignore or
    // explicit negative globs (positive --glob would override both).
    if (o.include) args.push("--type-add", `noloSearch:${o.include}`, "--type", "noloSearch");
  } else {
    // grep is only invoked when canGrepFulfillOptions(o) confirms every exclude
    // can be fulfilled via --exclude-dir and include is a safe basename pattern.
    for (const x of o.exclude ?? []) {
      const clean = extractGrepExcludeDir(x);
      if (clean) args.push("--exclude-dir", clean);
    }
    if (o.include) args.push("--include", o.include);
  }
  args.push("--", o.query, target);
  return args;
}

// ───────────────────────────────────────────────────────────────────────────
// Output parsing (rg/grep `--null` record format)
//
// Both rg (`--null`) and grep (`-RIn ... --null`) emit records as
// `path\0line:text\n`. NUL is illegal inside file paths, and the terminator is
// always `\n` following the `line:` prefix, so counting complete records —
// NOT raw newlines — is what truncation decisions are built on. A match line
// that itself contains colons (URLs, `key: value`, Windows drive letters) is
// preserved because only the FIRST colon after the NUL splits line number
// from text, and the file path is read before the NUL.
// ───────────────────────────────────────────────────────────────────────────

function parseMatches(root: string, output: string): RawRecord[] {
  const records: RawRecord[] = [];
  // Group 1 = path (NUL-terminated, cannot contain NUL itself), group 2 =
  // line number, group 3 = rest of the record up to the next path\0 or EOF.
  const pattern = /(?:^|\n)([^\0\n]+)\0(\d+):(.*?)(?=\n[^\0\n]+\0|$)/gs;
  for (const match of output.matchAll(pattern)) {
    // The final record's text would otherwise carry the record-terminating
    // newline; disk text (decorate) remains the primary source anyway.
    records.push({ file: resolve(root, match[1] ?? ""), line: Number(match[2]), text: (match[3] ?? "").replace(/\n$/, "") });
  }
  return records;
}

// ───────────────────────────────────────────────────────────────────────────
// Decoration (read context lines from disk)
// ───────────────────────────────────────────────────────────────────────────

async function decorate(root: string, raw: RawRecord[], context: number, absolute = false): Promise<FileTextSearchMatch[]> {
  const out: FileTextSearchMatch[] = [];
  for (const x of raw) {
    let lines: string[] = [];
    // No second disk read without context. Oversized files retain the bounded
    // command preview rather than re-reading/splitting the entire file.
    if (context > 0) {
      try {
        if ((await stat(x.file)).size <= MAX_SEARCH_FILE_BYTES) {
          lines = (await readFile(x.file, "utf8")).split(/\r\n|\r|\n/);
        }
      } catch { /* The file may disappear between search and decoration. */ }
    }
    const i = x.line - 1;
    out.push({ path: pathFor(root, x.file, absolute), line: x.line,
      text: (lines[i] ?? x.text).slice(0, MAX_SEARCH_LINE_CHARS),
      before: lines.slice(Math.max(0, i - context), i).map((line) => line.slice(0, MAX_SEARCH_LINE_CHARS)),
      after: lines.slice(i + 1, i + context + 1).map((line) => line.slice(0, MAX_SEARCH_LINE_CHARS)) });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Glob matching + JS fallback file collection
// ───────────────────────────────────────────────────────────────────────────

function globMatch(pattern: string, value: string): boolean {
  const p = normalizePath(pattern).replace(/^!/, "");
  // Expand brace alternatives before compiling the shared glob subset.
  const brace = /\{([^{}]+)\}/.exec(p);
  if (brace) return brace[1].split(",").some((part) =>
    globMatch(p.slice(0, brace.index) + part + p.slice(brace.index + brace[0].length), value));
  let source = "";
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === "*" && p[i + 1] === "*") {
      i++;
      if (p[i + 1] === "/") { i++; source += "(?:.*/)?"; } else source += ".*";
    } else if (c === "*") source += "[^/]*";
    else if (c === "?") source += "[^/]";
    else source += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  const r = new RegExp(`^${source}$`);
  return r.test(value) || r.test(basename(value));
}

// ───────────────────────────────────────────────────────────────────────────
// JS fallback search
//
// Best-effort engine, last in the rg → grep → js chain. Exclusion policy is
// entirely the caller's: `exclude`/`include` are exact globs applied to every
// file, and explicit excludes win over includeIgnored. Ignore semantics are a
// best-effort ROOT-.gitignore subset (see gitignore.ts):
// `includeIgnored=false` drops files matching the root .gitignore;
// `includeIgnored=true` skips that filter entirely. rg is the complete
// Git-ignore semantics source; grep is a lexical fallback with limited CLI
// capability; the JS fallback is best-effort root .gitignore only.
// ───────────────────────────────────────────────────────────────────────────

const defaultReadTextFile = (filePath: string): Promise<string> => readFile(filePath, "utf8").catch(() => "");

async function jsSearch(o: FileTextSearchOptions, targetPath: string): Promise<FileTextSearchResult> {
  const max = o.maxResults ?? Number.MAX_SAFE_INTEGER;
  const excludes = o.exclude ?? [];
  const readText = o.readTextFile ?? defaultReadTextFile;
  const files: string[] = [];
  const targetStat = await stat(targetPath).catch(() => null);
  if (!targetStat) return { matches: [], totalMatches: 0, truncated: false, engine: "js" };
  const ignorePatterns = o.includeIgnored ? [] : await readRootGitignorePatterns(o.root);
  const isIgnored = (rel: string) => ignorePatterns.some((pattern) => globMatch(pattern, rel));
  const isSearchableFile = (filePath: string) => {
    const rel = pathFor(o.root, filePath);
    return !excludes.some((pattern) => globMatch(pattern, rel)) &&
      !isIgnored(rel) &&
      (!o.include || globMatch(o.include, rel));
  };
  if (targetStat.isFile()) {
    if (isSearchableFile(targetPath)) files.push(targetPath);
  } else {
    const walk = async (dir: string): Promise<void> => {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const f = resolve(dir, e.name), rel = pathFor(o.root, f);
        if (e.isDirectory()) {
          if (!excludes.some((p) => globMatch(p, rel))) await walk(f);
        } else if (e.isFile() && !excludes.some((p) => globMatch(p, rel)) && !isIgnored(rel) && (!o.include || globMatch(o.include, rel))) {
          files.push(f);
        }
      }
    };
    await walk(targetPath);
  }
  const matcher = o.regex ? new RegExp(o.query, o.caseSensitive === false ? "i" : "") : null;
  const needle = o.caseSensitive === false ? o.query.toLowerCase() : o.query;
  const out: FileTextSearchMatch[] = [], context = o.contextLines ?? 0;
  // Bounded top-N early stop, mirroring the command engines: collect the
  // first maxResults hits; the moment hit N+1 appears, return the top N with
  // truncated=true WITHOUT reading any further files or lines. Without
  // maxResults the full walk is scanned and truncated stays false.
  for (const file of files) {
    // Fallback is deliberately bounded; do not buffer giant bundles/data lines.
    const info = await stat(file).catch(() => null);
    if (!info || info.size > MAX_SEARCH_FILE_BYTES) continue;
    const text = await readText(file);
    if (!text || text.includes("\0")) continue;
    const lines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const hit = matcher ? matcher.test(line) : (o.caseSensitive === false ? line.toLowerCase().includes(needle) : line.includes(needle));
      if (!hit) continue;
      if (out.length >= max) return { matches: out, totalMatches: max, truncated: true, engine: "js" };
      out.push({ path: pathFor(o.root, file, o.absolutePaths === true), line: i + 1, text: line.slice(0, MAX_SEARCH_LINE_CHARS), before: lines.slice(Math.max(0, i - context), i).map((line) => line.slice(0, MAX_SEARCH_LINE_CHARS)), after: lines.slice(i + 1, i + context + 1).map((line) => line.slice(0, MAX_SEARCH_LINE_CHARS)) });
    }
  }
  return { matches: out, totalMatches: out.length, truncated: false, engine: "js" };
}

// ───────────────────────────────────────────────────────────────────────────
// Grep capability guard
//
// Grep is a lexical fallback with limited CLI options. It only participates
// when it can completely fulfill caller options. If caller requests gitignore
// parity while a root .gitignore has patterns, or passes path-based includes
// or complex/nested excludes (e.g. ALWAYS_EXCLUDED_GLOBS), grep steps aside
// immediately in favor of the best-effort JS fallback (which enforces caller
// globs and root .gitignore parity).
// ───────────────────────────────────────────────────────────────────────────

export async function canGrepFulfillOptions(o: FileTextSearchOptions): Promise<boolean> {
  // 1. Gitignore parity: grep has no gitignore engine.
  // When includeIgnored is false/unset, if root .gitignore exists and is active,
  // grep cannot fulfill ignore semantics. If .gitignore exists but cannot be read
  // (e.g. EACCES), readRootGitignorePatterns throws rather than fail-open.
  if (!o.includeIgnored) {
    const gitignorePatterns = await readRootGitignorePatterns(o.root);
    if (gitignorePatterns.length > 0) return false;
  }

  // 2. Include pattern:
  // grep --include only matches file basenames. Path separators ('/' or '\\'),
  // globstars ('**'), and character classes/braces ('[', ']', '{', '}') cannot be
  // safely fulfilled by grep due to semantic mismatches with JS glob matching.
  if (o.include) {
    if (
      o.include.includes("/") ||
      o.include.includes("\\") ||
      o.include.includes("**") ||
      /[{}[\]]/.test(o.include)
    ) {
      return false;
    }
  }

  // 3. Exclude patterns:
  // Every caller exclude pattern must be strictly expressible as a bare --exclude-dir.
  // Any pattern targeting files or nested paths (e.g. bare 'secret', '.env', 'public/assets/**')
  // cannot be fulfilled by grep and would leak files; grep must step aside.
  if (o.exclude && o.exclude.length > 0) {
    for (const pattern of o.exclude) {
      if (!isGrepExpressibleExclude(pattern)) return false;
    }
  }

  return true;
}

// ───────────────────────────────────────────────────────────────────────────
// Main entry (rg → grep → js)
//
// Truncation contract: the command is launched with maxResults + 1 record
// budget; truncated=true only when record N+1 was actually observed.
// totalMatches is therefore an observed-hits count bounded by the command's
// capture budget, never a claim about the full repo total.
// ───────────────────────────────────────────────────────────────────────────

const COMMAND_ENGINES = [
  { engine: "ripgrep", binaryOption: "resolveRipgrepBinary", binaryName: "rg", argsKey: "rg" },
  { engine: "grep", binaryOption: "resolveGrepBinary", binaryName: "grep", argsKey: "grep" },
] as const;

export async function searchFileTextMatches(o: FileTextSearchOptions): Promise<FileTextSearchResult> {
  const targetPath = resolve(o.root, o.target || ".");
  const targetStat = await stat(targetPath).catch(() => null);
  if (!targetStat) return { matches: [], totalMatches: 0, truncated: false, engine: "js" };
  if (targetStat.isFile()) return jsSearch(o, targetPath);

  const run = o.runCommand ?? runCommand, max = o.maxResults;
  for (const entry of COMMAND_ENGINES) {
    // rg type filters match basenames, not workspace-relative paths. Keep
    // path globs on the exact shared JS matcher rather than weakening filters.
    if (entry.engine === "ripgrep" && o.include && /[/\\]/.test(o.include)) continue;
    if (entry.engine === "grep" && !(await canGrepFulfillOptions(o))) continue;
    const injectedResolver = o[entry.binaryOption];
    const binary = injectedResolver ? injectedResolver() : resolveExecutableOnPath(entry.binaryName);
    if (!binary) continue;
    const result = await run(binary, commandArgs(o, entry.argsKey, o.target || "."), o.root, max);
    const raw = parseMatches(o.root, result.stdout);
    // Only a completed run or a deliberate bounded stop counts as engine
    // success. rg exit 1 = "no matches" (success); a bounded stop is success
    // by design; only spawn failures and hard errors (rg exit ≥ 2, historical
    // behavior) fall through to the next engine.
    const hardFailed = result.outcome.kind === "spawn-failed" ||
      (result.outcome.kind === "completed" && result.outcome.exitCode !== 0 && result.outcome.exitCode !== 1);
    if (hardFailed) continue;
    const truncated = raw.length > (max ?? Number.MAX_SAFE_INTEGER);
    const matches = await decorate(o.root, raw.slice(0, max), o.contextLines ?? 0, o.absolutePaths === true);
    return {
      matches,
      totalMatches: truncated ? matches.length : raw.length,
      truncated,
      engine: entry.engine,
    };
  }
  return jsSearch(o, targetPath);
}