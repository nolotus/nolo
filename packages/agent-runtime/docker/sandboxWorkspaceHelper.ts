import * as path from "node:path";

/** 沙盒内工作区根 = 钉住的沙盒镜像（`docker.io/oven/bun:<version>`，见
 * `dockerSandboxCloudSpec.pinnedBunSandboxImage`）的默认工作目录 `/home/bun/app`。
 * execShell 不带 cwd 时就在容器默认 cwd 里跑：文件工具若根在别处（旧值
 * `/workspace`）两者会各写各的 —— `cat` / `readFile` 都看不到 writeFile 的产物。 */
export const SANDBOX_WORKSPACE_ROOT = "/home/bun/app";
export const SANDBOX_HELPER_PATH = "/tmp/nolo-tools/workspace-tool.mjs";

/** 与 `dockerWorkloadLifecycle.shQuote` 同一转义规则；此处自带一份以免模块循环依赖。 */
function posixQuote(value: string): string {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * 幂等的 helper 上传 argv：bootstrap / prepare 阶段执行一次，`mkdir -p` + 覆盖写，
 * 重复执行无副作用。服务端 run 通道（index.ts bootstrapDockerContainer）与 CLI 本地
 * docker 通道（localDockerWorkload.ts）共用这一份，保证两条通道的沙盒里都有 helper。
 */
export function buildSandboxHelperUploadArgv(): string[] {
    const encoded = Buffer.from(buildWorkspaceHelperSource(), "utf8").toString("base64");
    const dir = SANDBOX_HELPER_PATH.slice(0, SANDBOX_HELPER_PATH.lastIndexOf("/"));
    return [
        "bash",
        "-lc",
        `mkdir -p ${posixQuote(dir)}`
            + ` && printf %s ${posixQuote(encoded)} | base64 -d > ${posixQuote(SANDBOX_HELPER_PATH)}`
            + ` && chmod 0644 ${posixQuote(SANDBOX_HELPER_PATH)}`,
    ];
}
/** Docker file-tool output budget. Trimming happens on structured VALUES
 * before JSON serialization, so the helper always prints one complete JSON
 * envelope: the previous code cut the serialized string, and any value above
 * the backend stdout cap produced broken JSON (readFile of ~8KB+ files became
 * json_parse_failed). Keep this budget well below the cap agentRun passes for
 * docker runs (40_000, see agentRun/index.ts).
 */
export const SANDBOX_OUTPUT_LIMITS = {
    /** readFile: chars kept from the head of value.content */
    readHeadChars: 20_000,
    /** readFile: chars kept from the tail; head + marker + tail is the content cap */
    readTailChars: 10_000,
    /** glob/grep: max elements returned in value */
    maxArrayItems: 500,
    /** glob/grep: max chars per element (path or matched line) */
    maxItemChars: 2_000,
    /** glob/grep: serialized-char budget for the whole array */
    arrayCharBudget: 24_000,
    /** hard cap on the serialized {ok:true,value} envelope */
    maxSerializedChars: 32_000,
    /** writeFile.content and editFile.newText: max UTF-8 bytes per argument */
    maxContentBytes: 64 * 1024,
    /** base64 argv hard guard: one exec argument must stay far below 128KiB */
    maxArgvBytes: 96 * 1024,
} as const;

/** Flags the sandbox grep may use. g/y are rejected: a stateful lastIndex makes
 * re.test() skip matches, and global patterns only amplify backtracking. */
const ALLOWED_GREP_FLAGS = "imsu";

export function checkGrepFlags(flags: unknown): { ok: true; value: string } | { ok: false; error: string } {
    if (flags === undefined) return { ok: true, value: "" };
    if (typeof flags !== "string") return { ok: false, error: "unsupported_regex_flags" };
    for (const ch of flags) {
        if (!ALLOWED_GREP_FLAGS.includes(ch)) return { ok: false, error: "unsupported_regex_flags" };
    }
    return { ok: true, value: flags };
}

export function resolveSandboxPath(input: string): { ok: true; path: string } | { ok: false; error: string } {
    if (typeof input !== "string" || !input.trim()) {
        return { ok: false, error: "invalid_path" };
    }
    if (input.includes("\0")) {
        return { ok: false, error: "path_contains_nul" };
    }
    const isAbsolute = path.posix.isAbsolute(input);
    if (isAbsolute && input !== SANDBOX_WORKSPACE_ROOT && !input.startsWith(SANDBOX_WORKSPACE_ROOT + "/")) {
        return { ok: false, error: "path_outside_workspace" };
    }
    const resolved = isAbsolute
        ? path.posix.normalize(input)
        : path.posix.normalize(path.posix.join(SANDBOX_WORKSPACE_ROOT, input));

    if (resolved !== SANDBOX_WORKSPACE_ROOT && !resolved.startsWith(SANDBOX_WORKSPACE_ROOT + "/")) {
        return { ok: false, error: "path_escape" };
    }
    return { ok: true, path: resolved };
}

export type SandboxToolOp = "readFile" | "writeFile" | "editFile" | "glob" | "grep" | "mkdir" | "stat";

export function buildWorkspaceHelperSource(): string {
    return `import fs from "node:fs/promises";
import path from "node:path";

const ROOT = "${SANDBOX_WORKSPACE_ROOT}";
const MAX_SERIALIZED_CHARS = ${SANDBOX_OUTPUT_LIMITS.maxSerializedChars};
const READ_HEAD_CHARS = ${SANDBOX_OUTPUT_LIMITS.readHeadChars};
const READ_TAIL_CHARS = ${SANDBOX_OUTPUT_LIMITS.readTailChars};
const MAX_ARRAY_ITEMS = ${SANDBOX_OUTPUT_LIMITS.maxArrayItems};
const MAX_ITEM_CHARS = ${SANDBOX_OUTPUT_LIMITS.maxItemChars};
const ARRAY_CHAR_BUDGET = ${SANDBOX_OUTPUT_LIMITS.arrayCharBudget};
const MAX_CONTENT_BYTES = ${SANDBOX_OUTPUT_LIMITS.maxContentBytes};
const NL = String.fromCharCode(10);

function resolvePath(input) {
  if (typeof input !== "string" || !input.trim() || input.includes("\\0")) {
    return { ok: false, error: "invalid_path" };
  }
  const isAbs = path.posix.isAbsolute(input);
  if (isAbs && input !== ROOT && !input.startsWith(ROOT + "/")) {
    return { ok: false, error: "path_outside_workspace" };
  }
  const res = isAbs ? path.posix.normalize(input) : path.posix.normalize(path.posix.join(ROOT, input));
  if (res !== ROOT && !res.startsWith(ROOT + "/")) {
    return { ok: false, error: "path_escape" };
  }
  return { ok: true, path: res };
}

function truncateContent(str) {
  if (typeof str !== "string") return str;
  if (str.length <= READ_HEAD_CHARS + READ_TAIL_CHARS) return str;
  const omitted = str.length - READ_HEAD_CHARS - READ_TAIL_CHARS;
  return str.slice(0, READ_HEAD_CHARS) + NL + "...[truncated " + omitted + " chars]..." + NL + str.slice(str.length - READ_TAIL_CHARS);
}

function capText(text, limit) {
  if (typeof text !== "string") return "";
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "...[+" + (text.length - limit) + " chars]";
}

// Arrays are trimmed element by element (never by cutting the serialized
// string), so the emitted envelope is always complete JSON. A single trailing
// marker string reports how many results were dropped.
function capPaths(paths) {
  const kept = [];
  let used = 0;
  let omitted = 0;
  for (let i = 0; i < paths.length; i++) {
    if (kept.length >= MAX_ARRAY_ITEMS) { omitted = paths.length - i; break; }
    const text = capText(paths[i], MAX_ITEM_CHARS);
    const cost = JSON.stringify(text).length;
    if (used + cost > ARRAY_CHAR_BUDGET) { omitted = paths.length - i; break; }
    used += cost;
    kept.push(text);
  }
  return { items: kept, omitted };
}

function capMatches(matches) {
  const kept = [];
  let used = 0;
  let omitted = 0;
  for (let i = 0; i < matches.length; i++) {
    if (kept.length >= MAX_ARRAY_ITEMS) { omitted = matches.length - i; break; }
    const item = { file: capText(matches[i].file, MAX_ITEM_CHARS), line: matches[i].line, text: capText(matches[i].text, MAX_ITEM_CHARS) };
    const cost = JSON.stringify(item).length;
    if (used + cost > ARRAY_CHAR_BUDGET) { omitted = matches.length - i; break; }
    used += cost;
    kept.push(item);
  }
  return { items: kept, omitted };
}

function withMarker(items, omitted) {
  if (omitted <= 0) return items;
  return items.concat("...[truncated: " + omitted + " more results omitted]");
}

function clampArray(items) {
  let kept = items;
  while (kept.length > 0) {
    const out = JSON.stringify({ ok: true, value: kept });
    if (out.length <= MAX_SERIALIZED_CHARS) return out;
    const nextCount = Math.max(0, Math.floor(kept.length / 2) - 1);
    kept = kept.slice(0, nextCount).concat("...[output clipped: " + (kept.length - nextCount) + " items dropped]");
  }
  return JSON.stringify({ ok: true, value: [] });
}

function clampString(value) {
  const plain = JSON.stringify({ ok: true, value: value });
  if (plain.length <= MAX_SERIALIZED_CHARS) return plain;
  let head = READ_HEAD_CHARS;
  let tail = READ_TAIL_CHARS;
  while (true) {
    const candidate = value.slice(0, head) + NL + "...[output clipped]..." + NL + value.slice(value.length - tail);
    const out = JSON.stringify({ ok: true, value: candidate });
    if (out.length <= MAX_SERIALIZED_CHARS) return out;
    if (head <= 4000) return JSON.stringify({ ok: true, value: capText(value, 2000) });
    head = Math.floor(head / 2);
    tail = Math.floor(tail / 2);
  }
}

function emitValue(value) {
  if (Array.isArray(value)) return console.log(clampArray(value));
  if (typeof value === "string") return console.log(clampString(value));
  const out = JSON.stringify({ ok: true, value });
  if (out.length <= MAX_SERIALIZED_CHARS) return console.log(out);
  return console.log(JSON.stringify({ ok: false, error: "output_too_large" }));
}
function patternToRegex(pat) {
  const escaped = pat.replace(/[-/\\\\^$+?.()|[\\]{}]/g, "\\\\$&");
  const regexStr = "^" + escaped.replace(/\\\*\\\*/g, ".*").replace(/\\\*/g, "[^/]*") + "$";
  return new RegExp(regexStr);
}

async function collectFiles(dir, maxDepth = 15, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectFiles(full, maxDepth, currentDepth + 1));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const payloadRaw = process.argv[2];
  if (!payloadRaw) {
    console.log(JSON.stringify({ ok: false, error: "missing_payload" }));
    return;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadRaw, "base64").toString("utf-8"));
  } catch {
    console.log(JSON.stringify({ ok: false, error: "invalid_base64_payload" }));
    return;
  }

  const { op, args } = payload;
  try {
    switch (op) {
      case "readFile": {
        const p = resolvePath(args.path);
        if (!p.ok) return console.log(JSON.stringify({ ok: false, error: p.error }));
        const content = await fs.readFile(p.path, "utf-8");
        let result = content;
        if (typeof args.lines === "string") {
          const lines = content.split("\\n");
          const m = args.lines.match(/^(-?\\d+)?(?:-(-?\\d+)?)?$/);
          if (m) {
            const start = m[1] ? parseInt(m[1], 10) : 1;
            const end = m[2] ? parseInt(m[2], 10) : (args.lines.endsWith("-") ? lines.length : start);
            if (args.lines.startsWith("-")) {
              const count = Math.abs(parseInt(args.lines, 10));
              result = lines.slice(-count).join("\\n");
            } else {
              result = lines.slice(Math.max(0, start - 1), Math.max(0, end)).join("\\n");
            }
          }
        }
        return emitValue(truncateContent(result));
      }      case "writeFile": {
        const p = resolvePath(args.path);
        if (!p.ok) return console.log(JSON.stringify({ ok: false, error: p.error }));
        if (Buffer.byteLength(args.content, "utf-8") > MAX_CONTENT_BYTES) {
          return console.log(JSON.stringify({ ok: false, error: "content_too_large" }));
        }
        await fs.mkdir(path.posix.dirname(p.path), { recursive: true });
        await fs.writeFile(p.path, args.content, "utf-8");
        return console.log(JSON.stringify({ ok: true, value: { written: true, bytes: Buffer.byteLength(args.content) } }));
      }
      case "editFile": {
        const p = resolvePath(args.path);
        if (!p.ok) return console.log(JSON.stringify({ ok: false, error: p.error }));
        if (Buffer.byteLength(args.newText, "utf-8") > MAX_CONTENT_BYTES) {
          return console.log(JSON.stringify({ ok: false, error: "content_too_large" }));
        }
        const content = await fs.readFile(p.path, "utf-8");
        if (!content.includes(args.oldText)) {
          return console.log(JSON.stringify({ ok: false, error: "edit_old_text_not_found" }));
        }
        const replaced = content.replaceAll(args.oldText, args.newText);
        await fs.writeFile(p.path, replaced, "utf-8");
        return console.log(JSON.stringify({ ok: true, value: { replaced: true } }));
      }
      case "glob": {
        const rootDir = args.path ? resolvePath(args.path) : { ok: true, path: ROOT };
        if (!rootDir.ok) return console.log(JSON.stringify({ ok: false, error: rootDir.error }));
        const allFiles = await collectFiles(rootDir.path);
        const re = patternToRegex(args.pattern);
        const matched = allFiles.filter(f => {
          const rel = path.posix.relative(ROOT, f);
          return re.test(rel) || re.test(f);
        });
        const capped = capPaths(matched);
        return emitValue(withMarker(capped.items, capped.omitted));
      }
      case "grep": {
        const rootDir = args.path ? resolvePath(args.path) : { ok: true, path: ROOT };
        if (!rootDir.ok) return console.log(JSON.stringify({ ok: false, error: rootDir.error }));
        const flags = args.flags === undefined ? "" : args.flags;
        if (typeof flags !== "string" || !/^[imsu]*$/.test(flags)) {
          return console.log(JSON.stringify({ ok: false, error: "unsupported_regex_flags" }));
        }
        const allFiles = await collectFiles(rootDir.path);
        const re = new RegExp(args.pattern, flags);
        const matches = [];
        for (const file of allFiles) {
          try {
            const text = await fs.readFile(file, "utf-8");
            const lines = text.split(NL);
            for (let i = 0; i < lines.length; i++) {
              if (re.test(lines[i])) {
                matches.push({ file: path.posix.relative(ROOT, file), line: i + 1, text: lines[i].slice(0, 500) });
              }
            }
          } catch {}
        }
        const capped = capMatches(matches);
        return emitValue(withMarker(capped.items, capped.omitted));
      }

      case "mkdir": {
        const p = resolvePath(args.path);
        if (!p.ok) return console.log(JSON.stringify({ ok: false, error: p.error }));
        await fs.mkdir(p.path, { recursive: true });
        return console.log(JSON.stringify({ ok: true, value: { created: true } }));
      }
      case "stat": {
        const p = resolvePath(args.path);
        if (!p.ok) return console.log(JSON.stringify({ ok: false, error: p.error }));
        const st = await fs.stat(p.path);
        return console.log(JSON.stringify({ ok: true, value: { isFile: st.isFile(), isDirectory: st.isDirectory(), size: st.size, mtimeMs: st.mtimeMs } }));
      }
      default:
        return console.log(JSON.stringify({ ok: false, error: "unknown_op" }));
    }
  } catch (err) {
    return console.log(JSON.stringify({ ok: false, error: err && err.message ? err.message : "operation_failed" }));
  }
}
main();
`;
}

export function buildToolInvocation(
    toolName: string,
    args: Record<string, unknown>,
): { ok: true; argv: string[] } | { ok: false; error: string } {
    let op: SandboxToolOp;
    const validatedArgs: Record<string, unknown> = {};

    switch (toolName) {
        case "readFile": {
            if (typeof args.path !== "string" || !args.path.trim()) {
                return { ok: false, error: "missing_path" };
            }
            const res = resolveSandboxPath(args.path);
            if (!res.ok) return { ok: false, error: res.error };
            op = "readFile";
            validatedArgs.path = res.path;
            if (typeof args.lines === "string") validatedArgs.lines = args.lines;
            break;
        }
        case "writeFile": {
            if (typeof args.path !== "string" || !args.path.trim()) {
                return { ok: false, error: "missing_path" };
            }
            if (typeof args.content !== "string") {
                return { ok: false, error: "missing_content" };
            }
            if (Buffer.byteLength(args.content, "utf-8") > SANDBOX_OUTPUT_LIMITS.maxContentBytes) {
                return { ok: false, error: "content_too_large" };
            }
            const res = resolveSandboxPath(args.path);
            if (!res.ok) return { ok: false, error: res.error };
            op = "writeFile";
            validatedArgs.path = res.path;
            validatedArgs.content = args.content;
            break;
        }
        case "editFile": {
            if (typeof args.path !== "string" || !args.path.trim()) {
                return { ok: false, error: "missing_path" };
            }
            if (typeof args.oldText !== "string" || typeof args.newText !== "string") {
                return { ok: false, error: "missing_edit_text" };
            }
            if (args.oldText === args.newText) {
                return { ok: false, error: "edit_text_identical" };
            }
            if (Buffer.byteLength(args.newText, "utf-8") > SANDBOX_OUTPUT_LIMITS.maxContentBytes) {
                return { ok: false, error: "content_too_large" };
            }
            const res = resolveSandboxPath(args.path);
            if (!res.ok) return { ok: false, error: res.error };
            op = "editFile";
            validatedArgs.path = res.path;
            validatedArgs.oldText = args.oldText;
            validatedArgs.newText = args.newText;
            break;
        }
        case "glob":
        case "globFiles": {
            if (typeof args.pattern !== "string" || !args.pattern.trim()) {
                return { ok: false, error: "missing_pattern" };
            }
            op = "glob";
            validatedArgs.pattern = args.pattern;
            if (typeof args.path === "string" && args.path.trim()) {
                const res = resolveSandboxPath(args.path);
                if (!res.ok) return { ok: false, error: res.error };
                validatedArgs.path = res.path;
            }
            break;
        }
        case "grep":
        case "grepFiles": {
            if (typeof args.pattern !== "string" || !args.pattern.trim()) {
                return { ok: false, error: "missing_pattern" };
            }
            const flags = checkGrepFlags(args.flags);
            if (!flags.ok) return { ok: false, error: flags.error };
            try {
                new RegExp(args.pattern, flags.value);
            } catch {
                return { ok: false, error: "invalid_regex_pattern" };
            }
            op = "grep";
            validatedArgs.pattern = args.pattern;
            if (flags.value) validatedArgs.flags = flags.value;
            if (typeof args.path === "string" && args.path.trim()) {
                const res = resolveSandboxPath(args.path);
                if (!res.ok) return { ok: false, error: res.error };
                validatedArgs.path = res.path;
            }
            break;
        }
        case "mkdir": {
            if (typeof args.path !== "string" || !args.path.trim()) {
                return { ok: false, error: "missing_path" };
            }
            const res = resolveSandboxPath(args.path);
            if (!res.ok) return { ok: false, error: res.error };
            op = "mkdir";
            validatedArgs.path = res.path;
            break;
        }
        case "stat": {
            if (typeof args.path !== "string" || !args.path.trim()) {
                return { ok: false, error: "missing_path" };
            }
            const res = resolveSandboxPath(args.path);
            if (!res.ok) return { ok: false, error: res.error };
            op = "stat";
            validatedArgs.path = res.path;
            break;
        }
        default:
            return { ok: false, error: "unsupported_tool" };
    }

    const payload = Buffer.from(JSON.stringify({ op, args: validatedArgs }), "utf-8").toString("base64");
    if (payload.length > SANDBOX_OUTPUT_LIMITS.maxArgvBytes) {
        return { ok: false, error: "content_too_large" };
    }
    return {
        ok: true,
        argv: ["bun", SANDBOX_HELPER_PATH, payload],
    };
}

export function parseToolOutput(stdout: string): { ok: true; value: unknown } | { ok: false; error: string } {
    if (typeof stdout !== "string") {
        return { ok: false, error: "invalid_tool_output" };
    }
    const NL = String.fromCharCode(10);
    const lines = stdout.trim().split(NL).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
        return { ok: false, error: "empty_tool_output" };
    }
    // Only the last line may carry the envelope: helper logs above it are noise
    // and an envelope anywhere else is never the tool result.
    let parsed: unknown;
    try {
        parsed = JSON.parse(lines[lines.length - 1]);
    } catch {
        return { ok: false, error: "json_parse_failed" };
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { ok: false, error: "invalid_helper_output" };
    }
    const record = parsed as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (record.ok === true) {
        // Exactly { ok: true, value }; extra wrapping is not a success envelope.
        if (keys.length !== 2 || keys[0] !== "ok" || keys[1] !== "value") {
            return { ok: false, error: "invalid_helper_output" };
        }
        return { ok: true, value: record.value };
    }
    if (record.ok === false) {
        if (keys.length !== 2 || keys[0] !== "error" || keys[1] !== "ok" ||
            typeof record.error !== "string" || !record.error) {
            return { ok: false, error: "invalid_helper_output" };
        }
        return { ok: false, error: record.error };
    }
    // No boolean ok field at all: unknown envelopes are never treated as success.
    return { ok: false, error: "invalid_helper_output" };
}
