import {
  allocateCollapsedPaste,
  COLLAPSED_PASTE_PLACEHOLDER_RE,
  expandRangeToCollapsedPasteChips,
  findCollapsedPasteSpanAt,
  releaseCollapsedPaste,
  shouldCollapsePaste,
  type CollapsedPasteStore,
} from "core/collapsedPaste";
import { compactWhitespace } from "core/compactWhitespace";
import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { TuiKeyInfo, TuiInputKeyResult } from "./sessionTypes";

// ─── Key handling ───────────────────────────────────────────────────────────

export const PASTE_TOKEN_PREFIX = "\x00PASTE\x00";

export type ApplyTuiInputKeyOptions = {
  /**
   * When set, oversized bracketed-paste payloads collapse into a one-line
   * `[paste #N · L lines · preview]` placeholder; the full body lives in this
   * store and becomes a recoverable model reference when the draft is submitted.
   */
  pasteStore?: CollapsedPasteStore;
  /**
   * 当前 working directory（来自 TuiState.cwd）。传入后 TAB 补全支持
   * `/cd <部分路径>` 的目录候选展开；缺省时仅保留命令名补全。
   */
  cwd?: string;
};

export function applyTuiInputKey(
  buffer: string,
  sequence: string | undefined,
  key: TuiKeyInfo = {},
  cursorPos?: number,
  options?: ApplyTuiInputKeyOptions,
): TuiInputKeyResult {
  const seq = sequence ?? "";
  const curPos = Math.max(0, Math.min(buffer.length, cursorPos ?? buffer.length));
  const pasteStore = options?.pasteStore;

  if (seq.startsWith(PASTE_TOKEN_PREFIX)) {
    const rawPayload = seq.slice(PASTE_TOKEN_PREFIX.length);
    const normalized = rawPayload.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const insertAt = snapCursorOutsidePasteChip(buffer, curPos);
    if (pasteStore && shouldCollapsePaste(normalized)) {
      const { placeholder } = allocateCollapsedPaste(pasteStore, normalized);
      const nextBuf =
        buffer.slice(0, insertAt) + placeholder + buffer.slice(insertAt);
      return { buffer: nextBuf, cursorPos: insertAt + placeholder.length };
    }
    const nextBuf =
      buffer.slice(0, insertAt) + normalized + buffer.slice(insertAt);
    return { buffer: nextBuf, cursorPos: insertAt + normalized.length };
  }

  // Unmarked multi-line paste bursts are promoted to PASTE tokens in
  // createRawInputDecoder / splitRawInputWithTail — not here. By the time a
  // token reaches applyTuiInputKey, plain text has already been split to
  // code points, so a seq.length>1 newline heuristic here is unreachable.
  if (seq === "\u0003" || (key.ctrl && key.name === "c")) {
    return { buffer, cursorPos: curPos, abort: true };
  }
  if (seq === "\u000c" || (key.ctrl && key.name === "l")) {
    return { buffer, cursorPos: curPos, redraw: true };
  }
  // Ctrl+O used to open the retired copy view. Keep the control byte out of
  // the draft instead of treating it as printable input.
  if (seq === "\u000f" || (key.ctrl && key.name === "o")) {
    return { buffer, cursorPos: curPos };
  }
  if (
    seq === "\x1b[13;2~" ||
    seq === "\x1b[27;2;13~" ||
    seq === "\x1b\r" ||
    (key.shift && (key.name === "enter" || key.name === "return")) ||
    seq === "\n" ||
    (key.ctrl && key.name === "j")
  ) {
    const insertAt = snapCursorOutsidePasteChip(buffer, curPos);
    const nextBuf = buffer.slice(0, insertAt) + "\n" + buffer.slice(insertAt);
    return { buffer: nextBuf, cursorPos: insertAt + 1 };
  }
  if (key.name === "enter" || key.name === "return" || seq === "\r") {
    return { buffer: "", cursorPos: 0, submit: buffer };
  }

  // Navigation: Left / Right / Home (Ctrl+A) / End (Ctrl+E)
  // Collapsed paste placeholders are atomic — arrows jump over the whole chip.
  if (isLeftArrowSequence(seq, key)) {
    const span = findCollapsedPasteSpanAt(buffer, curPos, { preferLeft: true });
    if (span && curPos > span.start && curPos <= span.end) {
      return { buffer, cursorPos: span.start };
    }
    return { buffer, cursorPos: Math.max(0, curPos - 1) };
  }
  if (isRightArrowSequence(seq, key)) {
    const span = findCollapsedPasteSpanAt(buffer, curPos);
    if (span && curPos >= span.start && curPos < span.end) {
      return { buffer, cursorPos: span.end };
    }
    return { buffer, cursorPos: Math.min(buffer.length, curPos + 1) };
  }
  if (isHomeSequence(seq, key)) {
    return { buffer, cursorPos: 0 };
  }
  if (isEndSequence(seq, key)) {
    return { buffer, cursorPos: buffer.length };
  }

  // Delete word left (Ctrl+W / Ctrl+Backspace / Alt+Backspace): readline-style word delete.
  // Skips trailing whitespace, then deletes one word (non-whitespace run, or one CJK char).
  // Paste chips are atomic: never slice through a placeholder token.
  if (isDeleteWordSequence(seq, key)) {
    if (curPos === 0) return { buffer, cursorPos: curPos };
    const pasteSpan = findCollapsedPasteSpanAt(buffer, curPos, {
      preferLeft: true,
    });
    if (
      pasteSpan &&
      (curPos === pasteSpan.end ||
        (curPos > pasteSpan.start && curPos < pasteSpan.end))
    ) {
      return removePasteSpan(buffer, pasteSpan, pasteStore);
    }
    const cutIdx = findWordStartLeft(buffer, curPos);
    return deleteBufferRange(buffer, cutIdx, curPos, pasteStore);
  }

  // Kill to line start (Ctrl+U): deletes from cursor to beginning of current line.
  // In a multiline buffer only the current line segment before the cursor is removed.
  if (isKillToLineStartSequence(seq, key)) {
    if (curPos === 0) return { buffer, cursorPos: curPos };
    const lineStart = buffer.lastIndexOf("\n", curPos - 1) + 1;
    return deleteBufferRange(buffer, lineStart, curPos, pasteStore);
  }

  // Kill to line end (Ctrl+K): deletes from cursor to end of current line.
  // In a multiline buffer only the current line segment at/after the cursor is removed.
  if (isKillToLineEndSequence(seq, key)) {
    const nlIdx = buffer.indexOf("\n", curPos);
    const lineEnd = nlIdx === -1 ? buffer.length : nlIdx;
    return deleteBufferRange(buffer, curPos, lineEnd, pasteStore);
  }

  // Backspace (deletes character left of cursor) — whole paste chip if at its end.
  if (isBackspaceSequence(seq, key)) {
    if (curPos > 0) {
      const pasteSpan = findCollapsedPasteSpanAt(buffer, curPos, {
        preferLeft: true,
      });
      if (pasteSpan && (curPos === pasteSpan.end || (curPos > pasteSpan.start && curPos < pasteSpan.end))) {
        return removePasteSpan(buffer, pasteSpan, pasteStore);
      }
      const nextBuf = buffer.slice(0, curPos - 1) + buffer.slice(curPos);
      return { buffer: nextBuf, cursorPos: curPos - 1 };
    }
    return { buffer, cursorPos: curPos };
  }

  // Forward Delete (deletes character at cursor; fallback to backspace if at end)
  if (isForwardDeleteSequence(seq, key)) {
    if (curPos < buffer.length) {
      const pasteSpan = findCollapsedPasteSpanAt(buffer, curPos);
      if (
        pasteSpan &&
        (curPos === pasteSpan.start ||
          (curPos > pasteSpan.start && curPos < pasteSpan.end))
      ) {
        return removePasteSpan(buffer, pasteSpan, pasteStore);
      }
      const nextBuf = buffer.slice(0, curPos) + buffer.slice(curPos + 1);
      return { buffer: nextBuf, cursorPos: curPos };
    }
    if (curPos > 0) {
      const nextBuf = buffer.slice(0, curPos - 1);
      return { buffer: nextBuf, cursorPos: curPos - 1 };
    }
    return { buffer, cursorPos: curPos };
  }

  if (seq === "\t" || key.name === "tab") {
    // 路径补全优先：`/cd <部分路径>` 场景下展开目录候选。
    // 单候选直接补完（补全到「部分路径+目录名 + '/'」便于继续下钻）；
    // 多候选保留原 buffer——候选行由 renderInputArea 的 completeSlashCommand
    // 渲染，用户输入消歧后再次 TAB 收敛。与命令名补全的「单候选即补完、
    // 多候选仅显示」交互约定保持一致。
    if (options?.cwd) {
      const pathCandidates = completeSlashCommand(buffer, options.cwd);
      if (pathCandidates.length === 1) {
        // 候选已是完整行（`/cd <head><name>/`），直接落盘；尾斜杠留给
        // 后续下钻（再输字符 + TAB 进入子目录）。
        const [only] = pathCandidates;
        return { buffer: only, cursorPos: only.length };
      }
      if (pathCandidates.length > 1) {
        return { buffer, cursorPos: curPos };
      }
    }
    const completed = completeSlashPrefix(buffer) ?? buffer;
    return { buffer: completed, cursorPos: completed.length };
  }

  if (!seq || key.ctrl || key.meta || seq.startsWith("\x1b")) {
    return { buffer, cursorPos: curPos };
  }

  // Never splice into the middle of a collapsed paste chip — that would
  // break the placeholder token and orphan the stored body.
  const insertAt = snapCursorOutsidePasteChip(buffer, curPos);
  const nextBuf = buffer.slice(0, insertAt) + seq + buffer.slice(insertAt);
  return { buffer: nextBuf, cursorPos: insertAt + seq.length };
}

/** If `pos` sits inside a paste chip, snap to the chip's end. */
function snapCursorOutsidePasteChip(buffer: string, pos: number): number {
  const span = findCollapsedPasteSpanAt(buffer, pos);
  if (span && pos > span.start && pos < span.end) return span.end;
  return pos;
}

function isLeftArrowSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.name === "left") return true;
  if (seq === "\x1b[D" || seq === "\x1b[1;2D" || seq === "\x1b[1;5D" || seq === "\x1bOD") return true;
  return false;
}

function isRightArrowSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.name === "right") return true;
  if (seq === "\x1b[C" || seq === "\x1b[1;2C" || seq === "\x1b[1;5C" || seq === "\x1bOC") return true;
  return false;
}

function isHomeSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.name === "home") return true;
  if (key.ctrl && key.name === "a") return true;
  if (seq === "\u0001" || seq === "\x1b[H" || seq === "\x1b[1~" || seq === "\x1b[7~" || seq === "\x1bOH") return true;
  return false;
}

function isEndSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.name === "end") return true;
  if (key.ctrl && key.name === "e") return true;
  if (seq === "\u0005" || seq === "\x1b[F" || seq === "\x1b[4~" || seq === "\x1b[8~" || seq === "\x1bOF") return true;
  return false;
}

function removePasteSpan(
  buffer: string,
  span: { id: number; start: number; end: number },
  pasteStore: CollapsedPasteStore | undefined,
): TuiInputKeyResult {
  if (pasteStore) releaseCollapsedPaste(pasteStore, span.id);
  const nextBuf = buffer.slice(0, span.start) + buffer.slice(span.end);
  return { buffer: nextBuf, cursorPos: span.start };
}

function deleteBufferRange(
  buffer: string,
  start: number,
  end: number,
  pasteStore: CollapsedPasteStore | undefined,
): TuiInputKeyResult {
  if (start >= end) return { buffer, cursorPos: start };
  const range = expandRangeToCollapsedPasteChips(buffer, start, end);
  releasePastesInRange(buffer, range.start, range.end, pasteStore);
  const nextBuf = buffer.slice(0, range.start) + buffer.slice(range.end);
  return { buffer: nextBuf, cursorPos: range.start };
}

function releasePastesInRange(
  buffer: string,
  start: number,
  end: number,
  pasteStore: CollapsedPasteStore | undefined,
): void {
  if (!pasteStore || start >= end) return;
  const slice = buffer.slice(start, end);
  // 复用 core 的共享正则（兼容新旧两种 chip 格式）。此前这里是私拷贝的旧
  // 格式正则，chip 引入 preview 段后曾漂移；单一真值避免再次漂移。
  COLLAPSED_PASTE_PLACEHOLDER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COLLAPSED_PASTE_PLACEHOLDER_RE.exec(slice)) !== null) {
    releaseCollapsedPaste(pasteStore, Number(match[1]));
  }
}

// CJK + fullwidth forms: each character is treated as its own "word" for Ctrl+W.
const CJK_CHAR = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;

/**
 * Find the index where a left-ward word delete should cut.
 * Skips trailing whitespace, then deletes one word:
 * - a single CJK char (each char is a word), or
 * - a run of non-whitespace ASCII-ish chars.
 * Never scans into a collapsed paste chip — chips are atomic tokens.
 */
function findWordStartLeft(buffer: string, curPos: number): number {
  let i = curPos;
  while (i > 0 && /\s/.test(buffer[i - 1])) i--;
  if (i === 0) return 0;

  const spanAtCursor = findCollapsedPasteSpanAt(buffer, i, {
    preferLeft: true,
  });
  if (
    spanAtCursor &&
    (i === spanAtCursor.end ||
      (i > spanAtCursor.start && i < spanAtCursor.end))
  ) {
    return spanAtCursor.start;
  }

  // CJK char is its own word — stop after deleting one.
  if (CJK_CHAR.test(buffer[i - 1])) return i - 1;
  // ASCII word run — stop at whitespace, CJK, or paste-chip boundary.
  while (i > 0 && !/\s/.test(buffer[i - 1]) && !CJK_CHAR.test(buffer[i - 1])) {
    const span = findCollapsedPasteSpanAt(buffer, i, { preferLeft: true });
    if (span && i === span.end) break;
    i--;
  }
  return i;
}

function isDeleteWordSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.ctrl && key.name === "w") return true;
  // Ctrl+Backspace and Alt+Backspace both delete a word left (readline convention).
  if ((key.ctrl || key.meta) && key.name === "backspace") return true;
  if (seq === "\x17" || seq === "\x1b\x7f") return true;
  return false;
}

function isKillToLineStartSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.ctrl && key.name === "u") return true;
  if (seq === "\x15") return true;
  return false;
}

function isKillToLineEndSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.ctrl && key.name === "k") return true;
  if (seq === "\x0b") return true;
  return false;
}

export function isBackspaceSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.name === "backspace") return true;
  if (seq === "\b" || seq === "\x7f") return true;
  // eslint-disable-next-line no-control-regex
  return /^\x1b\[27;\d+;8~$/.test(seq);
}

function isForwardDeleteSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.name === "delete") return true;
  // eslint-disable-next-line no-control-regex
  return /^\x1b\[3(?:;\d+)*~$/.test(seq);
}

// ─── Slash command registry & completion ────────────────────────────────────

export const SLASH_COMMANDS = [
  "/help",
  "/new",
  "/clear",
  "/compact",
  "/theme",
  "/context",
  "/ctx",
  "/credits",
  "/cd",
  "/runtime",
  "/auto",
  "/switch",
  "/agent",
  "/agents",
  "/history",
  "/resume",
  "/lang",
  "/copy",
  "/mouse",
  "/math",
  "/doc",
  "/skill",
  "/customize",
  "/login",
  "/profile",
  "/update",
  "/version",
  "/tasks",
  "/jobs",
  "/procs",
  "/stop",
  "/exit",
  "/quit",
] as const;

/**
 * Tab completion for a partial slash command. Returns the new buffer, or
 * null when the buffer is not a completable command prefix (not a slash
 * command, already has arguments, or nothing matches).
 */
export function completeSlashPrefix(buffer: string): string | null {
  if (!buffer.startsWith("/") || /\s/.test(buffer)) return null;
  const matches = SLASH_COMMANDS.filter((cmd) => cmd.startsWith(buffer));
  if (matches.length === 0) return null;
  if (matches.length === 1) {
    return `${matches[0]} `;
  }
  let prefix: string = matches[0];
  for (const cmd of matches) {
    while (!cmd.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix.length > buffer.length ? prefix : null;
}

export function completeSlashCommand(buffer: string, cwd?: string): string[] {
  if (!buffer.startsWith("/")) return [];
  const trimmed = buffer.trim();
  if (cwd && buffer.startsWith("/cd ")) {
    // `/cd <部分路径>`：以 cwd 为基展开目录候选（只列目录，不列文件）。
    // 返回完整候选行（`/cd <head><name>/` 形式），TAB 与候选行渲染共用。
    // 空前缀（`/cd ` + TAB）列出 cwd 下全部子目录。注意用原始 buffer 判断
    // 前缀：`/cd `.trim() 会吃掉尾空格，导致空参数场景漏判。
    const prefix = buffer.slice("/cd ".length);
    return completeCdPathCandidates(prefix, cwd);
  }
  if (trimmed.includes(" ")) return [];
  return SLASH_COMMANDS.filter((cmd) => cmd.startsWith(trimmed) && cmd !== trimmed);
}

/**
 * 把 `/cd <part>` 的 part 解析为目录前缀并列出匹配的子目录候选。
 *
 * 规则：
 * - 解析以 `cwd` 为基（绝对路径原样；`~` 展开为 home；相对路径 resolve(cwd, head)）；
 * - 只列目录（含符号链接到目录），不列普通文件；
 * - 隐藏目录默认不列，除非待匹配段以 `.` 开头（含 `/cd sub/.` 看隐藏目录）。
 * - 返回完整候选行：`/cd <head><name>/`，head 保持用户输入风格（相对/绝对/~/）。
 */
function completeCdPathCandidates(prefix: string, cwd: string): string[] {
  // 拆成 head（已输入的目录前缀，保留用户输入风格）与 baseName（待匹配段）。
  // 不能依赖 resolve 后的 basename：resolve 会规范化掉尾部斜杠、丢失分隔符
  // 位置（"alpha/" 会变成 "alpha"，head 就拆错了）。
  const lastSlash = prefix.lastIndexOf("/");
  const head = lastSlash >= 0 ? prefix.slice(0, lastSlash + 1) : "";
  const baseName = lastSlash >= 0 ? prefix.slice(lastSlash + 1) : prefix;
  // 展开 head：`~` / `~/` 展开为 home；绝对路径原样；其余（含空串）以 cwd 为基。
  let dirPath: string;
  if (head === "~" || head === "~/" || head === "~\\") {
    dirPath = homedir();
  } else if (head.startsWith("~/") || head.startsWith("~\\")) {
    dirPath = resolve(homedir(), head.slice(2));
  } else {
    dirPath = head.startsWith("/") ? head : resolve(cwd, head);
  }
  let entries;
  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const hiddenRequested = baseName.startsWith(".");
  const names = entries
    .filter((e) => {
      if (e.isDirectory()) return true;
      // symlink → 目录在 dirent 上 isDirectory() 为 false（pnpm 等大量用
      // symlink 目录），需跟随一次 stat 才能列出；断链按不存在处理。
      if (!e.isSymbolicLink()) return false;
      try {
        return statSync(resolve(dirPath, e.name)).isDirectory();
      } catch {
        return false;
      }
    })
    .map((e) => e.name)
    .filter((name) => {
      if (!name.startsWith(baseName)) return false;
      return hiddenRequested || !name.startsWith(".");
    })
    .sort();
  return names.map((name) => `/cd ${head}${name}/`);
}

// ─── Input classification ───────────────────────────────────────────────────

/**
 * 判断一行 input 是不是 slash 命令。
 *
 * 关键陷阱:Unix 绝对路径都以 `/` 开头(`/Users/foo`),而 slash 命令也是
 * `/foo`。直接 `startsWith("/")` 会把 paste 进来的文件路径当成 unknown slash
 * command。
 *
 * 判别规则:
 * - 必须以 `/` 开头
 * - 第一个 token(到首个空白前)必须 match `/[a-zA-Z_][a-zA-Z0-9._:-]*`
 *   这同时排除两个情况:
 *   1. 路径(`/Users/foo`,因为 token 含第二个 `/`,regex 不匹配)
 *   2. 数字开头(`/123abc` 不是合法命令名)
 *
 * 这样 `/help`、`/switch list` 都正确判为 slash,
 * `/Users/x.png 看图`、`/etc/hosts` 都正确判为 chat。
 */
export function isLikelySlashCommand(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return false;
  const spaceIdx = trimmed.search(/\s/);
  const firstToken = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  return /^\/[a-zA-Z_][a-zA-Z0-9._:-]*$/.test(firstToken);
}

/**
 * 把 hints 对应的 raw token 从 message 里 strip 掉。
 * 用于"看图 /Users/foo/a.png 怎么样"这种:路径不应该作为文本发给 LLM。
 *
 * - strip 后空了就保留原 message(避免空 message,workspace 仍然发图片)
 * - 失败的 hint 不会出现在这里(只有 sync 阶段确认的路径才会传进来)
 */
export function stripImageTokens(input: string, hints: { raw: string }[]): string {
  if (hints.length === 0) return input;
  let out = input;
  for (const hint of hints) {
    if (!hint.raw) continue;
    const escaped = hint.raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "g"), "");
  }
  return compactWhitespace(out);
}
