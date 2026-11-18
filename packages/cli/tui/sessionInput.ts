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
import { discoverSkills } from "../../agent-runtime/skillDiscovery";
import { listBuiltinSkills } from "ai/skills/builtinSkillRegistry";
import { formatSkillSlashReference } from "../../agent-runtime/skillSlashReference";
import { getCliLocale } from "./i18n";
import type { TuiKeyInfo, TuiInputKeyResult } from "./sessionTypes";

// ─── Key handling ───────────────────────────────────────────────────────────

export const PASTE_TOKEN_PREFIX = "\x00PASTE\x00";

export const MAX_INPUT_HISTORY_ENTRIES = 100;

export type InputHistoryState = {
  /** Ordered oldest -> newest; bounded to MAX_INPUT_HISTORY_ENTRIES. */
  entries: string[];
  /**
   * Active browse index into `entries` (`0 .. entries.length - 1`), or
   * `null` when editing the active draft.
   */
  cursorIndex: number | null;
  /**
   * Unsent draft captured on the first Up press into history; restored when
   * pressing Down past the newest history entry.
   */
  stashedDraft: string | null;
  /** Number of leading entries in `entries` seeded from restored dialog turns. */
  seededBaseCount?: number;
};

export function createInputHistoryState(
  initialEntries?: readonly string[],
): InputHistoryState {
  const state: InputHistoryState = {
    entries: [],
    cursorIndex: null,
    stashedDraft: null,
    seededBaseCount: 0,
  };
  if (initialEntries) {
    for (const entry of initialEntries) {
      recordInputHistoryEntry(state, entry);
    }
  }
  return state;
}

export function resetInputHistoryNavigation(history: InputHistoryState): void {
  history.cursorIndex = null;
  history.stashedDraft = null;
}

export function recordInputHistoryEntry(
  history: InputHistoryState,
  text: string,
): void {
  const normalized = text.trim();
  if (!normalized) return;
  if (history.entries[history.entries.length - 1] === normalized) return;
  history.entries.push(normalized);
  if (history.entries.length > MAX_INPUT_HISTORY_ENTRIES) {
    const overflow = history.entries.length - MAX_INPUT_HISTORY_ENTRIES;
    history.entries.splice(0, overflow);
    if (history.seededBaseCount !== undefined) {
      history.seededBaseCount = Math.max(0, history.seededBaseCount - overflow);
    }
  }
}

export function seedInputHistoryFromTurns(
  history: InputHistoryState,
  turns: readonly { role: string; content: string }[],
): void {
  const baseEntries: string[] = [];
  for (const turn of turns) {
    if (turn.role !== "user") continue;
    const normalized = turn.content.trim();
    if (!normalized) continue;
    if (baseEntries[baseEntries.length - 1] === normalized) continue;
    baseEntries.push(normalized);
  }
  const sessionOnly = history.entries.slice(history.seededBaseCount ?? 0);
  const combined = [...baseEntries];
  for (const entry of sessionOnly) {
    if (combined[combined.length - 1] === entry) continue;
    combined.push(entry);
  }
  const overflow = Math.max(0, combined.length - MAX_INPUT_HISTORY_ENTRIES);
  history.entries = overflow > 0 ? combined.slice(overflow) : combined;
  history.seededBaseCount = Math.max(0, baseEntries.length - overflow);
  resetInputHistoryNavigation(history);
}

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
  /**
   * Per-session input history stack for Up/Down recall and draft stashing.
   */
  inputHistory?: InputHistoryState;
};

type SlashCompletionNavState = {
  query: string;
  cwd?: string;
  index: number;
  active: boolean;
};

type AtFileCompletionNavState = {
  key: string;
  index: number;
  active: boolean;
};

export type ComposerCompletionMenu =
  | {
      kind: "slash";
      candidates: SlashCommandCandidate[];
    }
  | {
      kind: "at-file";
      candidates: SlashCommandCandidate[];
      tokenStart: number;
      tokenEnd: number;
      query: string;
    };

let activeSlashNav: SlashCompletionNavState | null = null;
let activeAtFileNav: AtFileCompletionNavState | null = null;

const AT_FILE_CACHE_TTL_MS = 5_000;
const MAX_AT_SCAN_FILES = 2_000;
const MAX_AT_SCAN_DIRS = 300;
const MAX_AT_SCAN_ENTRIES = 5_000;
const MAX_AT_RESULTS = 20;
const AT_SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".worktrees"]);
const atFileCache = new Map<string, { files: string[]; cachedAt: number }>();

export function clearAtFileCompletionCache(): void {
  atFileCache.clear();
}

function scanAtFilesBounded(cwd: string): string[] {
  const root = resolve(cwd);
  const now = Date.now();
  const cached = atFileCache.get(root);
  if (cached && now - cached.cachedAt < AT_FILE_CACHE_TTL_MS) {
    return cached.files;
  }

  const files: string[] = [];
  const queue: string[] = [""];
  let visitedDirs = 0;
  let inspectedEntries = 0;
  while (
    queue.length > 0 &&
    files.length < MAX_AT_SCAN_FILES &&
    visitedDirs < MAX_AT_SCAN_DIRS &&
    inspectedEntries < MAX_AT_SCAN_ENTRIES
  ) {
    const relDir = queue.shift()!;
    visitedDirs += 1;
    const absDir = relDir ? resolve(root, relDir) : root;
    let entries;
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (files.length >= MAX_AT_SCAN_FILES || inspectedEntries >= MAX_AT_SCAN_ENTRIES) break;
      inspectedEntries += 1;
      const name = entry.name;
      if (!name || name.startsWith(".") || AT_SKIP_DIRS.has(name)) continue;
      if (entry.isSymbolicLink()) continue;
      const relPath = relDir ? `${relDir}/${name}` : name;
      if (entry.isDirectory()) {
        queue.push(relPath);
      } else if (entry.isFile()) {
        files.push(relPath);
      }
    }
  }

  atFileCache.set(root, { files, cachedAt: now });
  return files;
}

export function getAtFileTokenAtCursor(
  buffer: string,
  cursorPos?: number,
): { tokenStart: number; tokenEnd: number; query: string } | null {
  const curPos = Math.max(0, Math.min(buffer.length, cursorPos ?? buffer.length));
  let start = curPos;
  while (start > 0 && !/\s/.test(buffer[start - 1]!)) {
    start -= 1;
  }
  if (start >= curPos || buffer[start] !== "@") return null;
  if (start > 0 && !/\s/.test(buffer[start - 1]!)) return null;
  const pasteSpan = findCollapsedPasteSpanAt(buffer, start);
  if (pasteSpan && start >= pasteSpan.start && start < pasteSpan.end) return null;

  let end = curPos;
  while (end < buffer.length && !/\s/.test(buffer[end]!)) {
    end += 1;
  }
  const query = buffer.slice(start + 1, curPos);
  if (/\s/.test(query)) return null;
  return { tokenStart: start, tokenEnd: end, query };
}

function isSubsequenceMatch(needle: string, haystack: string): boolean {
  if (!needle) return true;
  let ni = 0;
  for (let hi = 0; hi < haystack.length && ni < needle.length; hi += 1) {
    if (haystack[hi] === needle[ni]) ni += 1;
  }
  return ni === needle.length;
}

function scoreAtFileMatch(relPath: string, queryLower: string): number {
  if (!queryLower) return 0;
  const slashIdx = relPath.lastIndexOf("/");
  const baseName = slashIdx >= 0 ? relPath.slice(slashIdx + 1) : relPath;
  const baseLower = baseName.toLowerCase();
  const pathLower = relPath.toLowerCase();

  if (baseLower.startsWith(queryLower)) return 0;
  if (baseLower.includes(queryLower)) return 1;
  if (pathLower.includes(queryLower)) return 2;
  if (queryLower.length >= 2 && isSubsequenceMatch(queryLower, baseLower)) return 3;
  if ((queryLower.length >= 3 || queryLower.includes("/")) && isSubsequenceMatch(queryLower, pathLower)) {
    return 4;
  }
  return -1;
}

export function completeAtFileCandidates(
  query: string,
  cwd?: string,
): SlashCommandCandidate[] {
  if (!cwd) return [];
  const files = scanAtFilesBounded(cwd);
  if (files.length === 0) return [];
  const queryLower = query.toLowerCase();
  if (!queryLower) {
    return files.slice(0, MAX_AT_RESULTS).map((relPath) => ({
      label: relPath,
      insertText: `${relPath} `,
      source: "path",
    }));
  }

  const scored: { relPath: string; tier: number }[] = [];
  for (const relPath of files) {
    const tier = scoreAtFileMatch(relPath, queryLower);
    if (tier >= 0) scored.push({ relPath, tier });
  }
  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.relPath.length !== b.relPath.length) return a.relPath.length - b.relPath.length;
    return a.relPath.localeCompare(b.relPath);
  });
  return scored.slice(0, MAX_AT_RESULTS).map(({ relPath }) => ({
    label: relPath,
    insertText: `${relPath} `,
    source: "path",
  }));
}

function formatAtFileNavKey(cwd: string | undefined, tokenStart: number, query: string): string {
  return `${cwd ?? ""}\0${tokenStart}\0${query}`;
}

function getAtFileCompletionSelection(
  navKey: string,
  candidates: SlashCommandCandidate[],
): number {
  if (candidates.length === 0) return -1;
  if (activeAtFileNav && activeAtFileNav.active && activeAtFileNav.key === navKey) {
    return ((activeAtFileNav.index % candidates.length) + candidates.length) % candidates.length;
  }
  return 0;
}

export function resolveComposerCompletionMenu(
  buffer: string,
  cursorPos?: number,
  cwd?: string,
): ComposerCompletionMenu | null {
  const slashCandidates = resolveSlashCandidatesForMenu(buffer, cwd);
  if (slashCandidates.length > 0) {
    return { kind: "slash", candidates: slashCandidates };
  }
  const atToken = getAtFileTokenAtCursor(buffer, cursorPos);
  if (atToken && cwd) {
    const atCandidates = completeAtFileCandidates(atToken.query, cwd);
    if (atCandidates.length > 0) {
      return {
        kind: "at-file",
        candidates: atCandidates,
        tokenStart: atToken.tokenStart,
        tokenEnd: atToken.tokenEnd,
        query: atToken.query,
      };
    }
  }
  return null;
}

export function getCompletionMenuSelection(
  buffer: string,
  cursorPos?: number,
  cwd?: string,
  candidates?: SlashCommandCandidate[],
): number {
  const menu = resolveComposerCompletionMenu(buffer, cursorPos, cwd);
  if (!menu) return -1;
  if (menu.kind === "slash") {
    return getSlashCompletionSelection(buffer, cwd, candidates ?? menu.candidates);
  }
  const list = candidates ?? menu.candidates;
  return getAtFileCompletionSelection(
    formatAtFileNavKey(cwd, menu.tokenStart, menu.query),
    list,
  );
}

function applyAtFileCompletionReplacement(
  buffer: string,
  tokenStart: number,
  tokenEnd: number,
  selectedPath: string,
): TuiInputKeyResult {
  const hasTrailingSpace = buffer[tokenEnd] === " ";
  const inserted = hasTrailingSpace ? selectedPath : `${selectedPath} `;
  const nextBuf = buffer.slice(0, tokenStart) + inserted + buffer.slice(tokenEnd);
  const nextCursorPos = tokenStart + selectedPath.length + 1;
  return { buffer: nextBuf, cursorPos: nextCursorPos };
}

function isUpArrowSequence(seq: string, key: TuiKeyInfo): boolean {
  return key.name === "up" || seq === "\x1b[A" || seq === "\x1bOA";
}

function isDownArrowSequence(seq: string, key: TuiKeyInfo): boolean {
  return key.name === "down" || seq === "\x1b[B" || seq === "\x1bOB";
}

/**
 * Resolve slash completion candidates for the current draft, including `/cd dir/`
 * parent-directory cycling so menu rendering and Tab/arrow navigation agree.
 */
export function resolveSlashCandidatesForMenu(
  buffer: string,
  cwd?: string,
): SlashCommandCandidate[] {
  if (!buffer.startsWith("/") || buffer.includes("\n")) return [];
  let candidates = completeSlashCandidates(buffer, cwd);
  if (cwd && buffer.startsWith("/cd ") && buffer.endsWith("/")) {
    const prefix = buffer.slice("/cd ".length);
    const trimmedSlash = prefix.slice(0, -1);
    const lastSlash = trimmedSlash.lastIndexOf("/");
    const parentPrefix = lastSlash >= 0 ? trimmedSlash.slice(0, lastSlash + 1) : "";
    const parentCandidates = completeSlashCandidates(`/cd ${parentPrefix}`, cwd);
    const parentIdx = parentCandidates.findIndex(
      (c) => buffer === c.insertText || buffer === c.insertText.trimEnd(),
    );
    if (parentIdx >= 0 && parentCandidates.length > 1) {
      candidates = parentCandidates;
    }
  }
  return candidates;
}

export function getSlashCompletionSelection(
  buffer: string,
  cwd?: string,
  candidates?: SlashCommandCandidate[],
): number {
  const list = candidates ?? resolveSlashCandidatesForMenu(buffer, cwd);
  if (list.length === 0) return -1;
  if (
    activeSlashNav &&
    activeSlashNav.active &&
    activeSlashNav.query === buffer &&
    activeSlashNav.cwd === cwd
  ) {
    return ((activeSlashNav.index % list.length) + list.length) % list.length;
  }
  const exactIndex = list.findIndex(
    (c) => buffer === c.insertText || buffer === c.insertText.trimEnd(),
  );
  return exactIndex >= 0 ? exactIndex : 0;
}

export function resetSlashCompletionSelection(): void {
  activeSlashNav = null;
  activeAtFileNav = null;
}

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

  const isUp = isUpArrowSequence(seq, key);
  const isDown = isDownArrowSequence(seq, key);
  if (isUp || isDown) {
    // 1. 第一优先：单行斜杠命令补全菜单或 @ 文件模糊补全菜单导航
    const menu = resolveComposerCompletionMenu(buffer, curPos, options?.cwd);
    if (menu && menu.candidates.length > 0) {
      const step = isUp ? -1 : 1;
      if (menu.kind === "slash") {
        activeAtFileNav = null;
        const currentIndex = getSlashCompletionSelection(buffer, options?.cwd, menu.candidates);
        const nextIndex = (currentIndex + step + menu.candidates.length) % menu.candidates.length;
        activeSlashNav = {
          query: buffer,
          cwd: options?.cwd,
          index: nextIndex,
          active: true,
        };
      } else {
        activeSlashNav = null;
        const navKey = formatAtFileNavKey(options?.cwd, menu.tokenStart, menu.query);
        const currentIndex = getAtFileCompletionSelection(navKey, menu.candidates);
        const nextIndex = (currentIndex + step + menu.candidates.length) % menu.candidates.length;
        activeAtFileNav = {
          key: navKey,
          index: nextIndex,
          active: true,
        };
      }
      return { buffer, cursorPos: curPos };
    }
    activeSlashNav = null;
    activeAtFileNav = null;

    // 2. 第二优先：多行草稿内部光标上下移动（仅在不在首行/末行时拦截）
    if (buffer.includes("\n")) {
      if (isUp) {
        const prevNl = curPos > 0 ? buffer.lastIndexOf("\n", curPos - 1) : -1;
        if (prevNl !== -1) {
          const curLineStart = prevNl + 1;
          const col = curPos - curLineStart;
          const prevLineStart = prevNl > 0 ? buffer.lastIndexOf("\n", prevNl - 1) + 1 : 0;
          const prevLineLen = prevNl - prevLineStart;
          const nextCursor = snapCursorOutsidePasteChip(
            buffer,
            prevLineStart + Math.min(col, prevLineLen),
          );
          return { buffer, cursorPos: nextCursor };
        }
      } else {
        const nextNl = buffer.indexOf("\n", curPos);
        if (nextNl !== -1) {
          const prevNl = curPos > 0 ? buffer.lastIndexOf("\n", curPos - 1) : -1;
          const curLineStart = prevNl + 1;
          const col = curPos - curLineStart;
          const nextLineStart = nextNl + 1;
          const afterNextNl = buffer.indexOf("\n", nextLineStart);
          const nextLineEnd = afterNextNl === -1 ? buffer.length : afterNextNl;
          const nextLineLen = nextLineEnd - nextLineStart;
          const nextCursor = snapCursorOutsidePasteChip(
            buffer,
            nextLineStart + Math.min(col, nextLineLen),
          );
          return { buffer, cursorPos: nextCursor };
        }
      }
    }

    // 3. 第三优先：输入历史栈（按 ↑ 回溯更早一条并暂存当前草稿，按 ↓ 前进并还原草稿）
    const inputHistory = options?.inputHistory;
    if (inputHistory && inputHistory.entries.length > 0) {
      if (isUp) {
        if (inputHistory.cursorIndex === null) {
          inputHistory.stashedDraft = buffer;
          inputHistory.cursorIndex = inputHistory.entries.length - 1;
        } else if (inputHistory.cursorIndex > 0) {
          inputHistory.cursorIndex -= 1;
        }
        const entry = inputHistory.entries[inputHistory.cursorIndex]!;
        return { buffer: entry, cursorPos: entry.length };
      } else if (inputHistory.cursorIndex !== null) {
        if (inputHistory.cursorIndex < inputHistory.entries.length - 1) {
          inputHistory.cursorIndex += 1;
          const entry = inputHistory.entries[inputHistory.cursorIndex]!;
          return { buffer: entry, cursorPos: entry.length };
        }
        const restored = inputHistory.stashedDraft ?? "";
        resetInputHistoryNavigation(inputHistory);
        return { buffer: restored, cursorPos: restored.length };
      }
    }

    return { buffer, cursorPos: curPos };
  }

  const res = applyNonArrowTuiInputKey(buffer, seq, key, curPos, pasteStore, options);
  if (
    options?.inputHistory &&
    (res.submit !== undefined || res.abort || res.buffer !== buffer)
  ) {
    resetInputHistoryNavigation(options.inputHistory);
  }
  return res;
}

function applyNonArrowTuiInputKey(
  buffer: string,
  seq: string,
  key: TuiKeyInfo,
  curPos: number,
  pasteStore: CollapsedPasteStore | undefined,
  options?: ApplyTuiInputKeyOptions,
): TuiInputKeyResult {

  const navMatch =
    activeSlashNav &&
    activeSlashNav.active &&
    activeSlashNav.query === buffer &&
    activeSlashNav.cwd === options?.cwd
      ? activeSlashNav
      : null;

  const isBackTab =
    seq === "\x1b[Z" ||
    key.name === "backtab" ||
    (Boolean(key.shift) && (seq === "\t" || key.name === "tab"));
  const isTab = !isBackTab && (seq === "\t" || key.name === "tab");
  if (isTab || isBackTab) {
    const isReverse = isBackTab;
    const atToken = getAtFileTokenAtCursor(buffer, curPos);
    const slashCandidates = resolveSlashCandidatesForMenu(buffer, options?.cwd);
    if (slashCandidates.length === 0 && atToken && options?.cwd) {
      const atCandidates = completeAtFileCandidates(atToken.query, options.cwd);
      if (atCandidates.length > 0) {
        const navKey = formatAtFileNavKey(options.cwd, atToken.tokenStart, atToken.query);
        const idx = getAtFileCompletionSelection(navKey, atCandidates);
        const chosen = atCandidates[idx]!;
        activeAtFileNav = null;
        activeSlashNav = null;
        return applyAtFileCompletionReplacement(
          buffer,
          atToken.tokenStart,
          atToken.tokenEnd,
          chosen.label,
        );
      }
    }
    activeAtFileNav = null;

    const candidates = slashCandidates;
    if (navMatch && candidates.length > 0) {
      const idx = ((navMatch.index % candidates.length) + candidates.length) % candidates.length;
      const chosen = candidates[idx]!;
      activeSlashNav = null;
      return { buffer: chosen.insertText, cursorPos: chosen.insertText.length };
    }
    activeSlashNav = null;

    if (candidates.length === 1) {
      const [only] = candidates;
      return { buffer: only.insertText, cursorPos: only.insertText.length };
    }
    if (candidates.length > 1) {
      const currentIndex = candidates.findIndex(
        (c) => buffer === c.insertText || buffer === c.insertText.trimEnd(),
      );
      if (currentIndex >= 0) {
        const step = isReverse ? -1 : 1;
        const nextIndex =
          (currentIndex + step + candidates.length) % candidates.length;
        const next = candidates[nextIndex];
        return { buffer: next.insertText, cursorPos: next.insertText.length };
      }
      const common = findCommonPrefix(candidates.map((c) => c.insertText));
      if (common.length > buffer.length) {
        return { buffer: common, cursorPos: common.length };
      }
      const chosen = isReverse
        ? candidates[candidates.length - 1]
        : candidates[0];
      return { buffer: chosen.insertText, cursorPos: chosen.insertText.length };
    }
    const completed = completeSlashPrefix(buffer) ?? buffer;
    return { buffer: completed, cursorPos: completed.length };
  }

  if (
    // CSI-u / kitty: Shift+Enter press or repeat, never key release (:3).
    // Raw input passes complete CSI tokens without populating key.shift.
    /^\x1b\[13;2(?::[12])?u$/.test(seq) ||
    seq === "\x1b[13;2~" ||
    seq === "\x1b[27;2;13~" ||
    seq === "\x1b\r" ||
    (key.shift && (key.name === "enter" || key.name === "return")) ||
    seq === "\n" ||
    (key.ctrl && key.name === "j")
  ) {
    activeSlashNav = null;
    activeAtFileNav = null;
    const insertAt = snapCursorOutsidePasteChip(buffer, curPos);
    const nextBuf = buffer.slice(0, insertAt) + "\n" + buffer.slice(insertAt);
    return { buffer: nextBuf, cursorPos: insertAt + 1 };
  }

  if (key.name === "enter" || key.name === "return" || seq === "\r") {
    if (navMatch) {
      const candidates = resolveSlashCandidatesForMenu(buffer, options?.cwd);
      activeSlashNav = null;
      activeAtFileNav = null;
      if (candidates.length > 0) {
        const idx = ((navMatch.index % candidates.length) + candidates.length) % candidates.length;
        const chosen = candidates[idx]!;
        if (chosen.insertText === "/cd " || !chosen.insertText.startsWith("/")) {
          return { buffer: chosen.insertText, cursorPos: chosen.insertText.length };
        }
        return { buffer: "", cursorPos: 0, submit: chosen.insertText.trimEnd() };
      }
    }
    const menu = resolveComposerCompletionMenu(buffer, curPos, options?.cwd);
    if (menu?.kind === "at-file" && menu.candidates.length > 0) {
      const navKey = formatAtFileNavKey(options?.cwd, menu.tokenStart, menu.query);
      const idx = getAtFileCompletionSelection(navKey, menu.candidates);
      const chosen = menu.candidates[idx]!;
      activeSlashNav = null;
      activeAtFileNav = null;
      return applyAtFileCompletionReplacement(
        buffer,
        menu.tokenStart,
        menu.tokenEnd,
        chosen.label,
      );
    }
    activeSlashNav = null;
    activeAtFileNav = null;
    return { buffer: "", cursorPos: 0, submit: buffer };
  }

  activeSlashNav = null;
  activeAtFileNav = null;

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
  // Plain Enter and Shift+Enter newline sequences are handled above before nav checks.

  // Navigation: Word-jump (Ctrl+Left/Right, Alt+B/F), Left / Right / Home (Ctrl+A) / End (Ctrl+E)
  // Collapsed paste placeholders are atomic — arrows jump over the whole chip.
  if (isWordLeftSequence(seq, key)) {
    return { buffer, cursorPos: findWordStartLeft(buffer, curPos) };
  }
  if (isWordRightSequence(seq, key)) {
    return { buffer, cursorPos: findWordEndRight(buffer, curPos) };
  }
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

function isWordLeftSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.ctrl && key.name === "left") return true;
  if (key.meta && (key.name === "left" || key.name === "b")) return true;
  if (
    seq === "\x1b[1;5D" ||
    seq === "\x1b[1;3D" ||
    seq === "\x1b[5D" ||
    seq === "\x1bb" ||
    seq === "\x1bB"
  ) {
    return true;
  }
  return false;
}

function isWordRightSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.ctrl && key.name === "right") return true;
  if (key.meta && (key.name === "right" || key.name === "f")) return true;
  if (
    seq === "\x1b[1;5C" ||
    seq === "\x1b[1;3C" ||
    seq === "\x1b[5C" ||
    seq === "\x1bf" ||
    seq === "\x1bF"
  ) {
    return true;
  }
  return false;
}

function isLeftArrowSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.name === "left" && !key.ctrl && !key.meta) return true;
  if (seq === "\x1b[D" || seq === "\x1b[1;2D" || seq === "\x1bOD") return true;
  return false;
}

function isRightArrowSequence(seq: string, key: TuiKeyInfo): boolean {
  if (key.name === "right" && !key.ctrl && !key.meta) return true;
  if (seq === "\x1b[C" || seq === "\x1b[1;2C" || seq === "\x1bOC") return true;
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

/**
 * Find the index where a right-ward word jump should land.
 * Skips leading whitespace, then skips one word:
 * - a single CJK char (each char is a word), or
 * - a run of non-whitespace ASCII-ish chars.
 * Never stops inside a collapsed paste chip — chips are atomic tokens.
 */
function findWordEndRight(buffer: string, curPos: number): number {
  const len = buffer.length;
  let i = curPos;
  while (i < len && /\s/.test(buffer[i]!)) i++;
  if (i >= len) return len;

  const spanAtCursor = findCollapsedPasteSpanAt(buffer, i);
  if (
    spanAtCursor &&
    (i === spanAtCursor.start ||
      (i > spanAtCursor.start && i < spanAtCursor.end))
  ) {
    return spanAtCursor.end;
  }

  // CJK char is its own word — stop after jumping one.
  if (CJK_CHAR.test(buffer[i]!)) return i + 1;
  // ASCII word run — stop at whitespace, CJK, or paste-chip boundary.
  while (i < len && !/\s/.test(buffer[i]!) && !CJK_CHAR.test(buffer[i]!)) {
    const span = findCollapsedPasteSpanAt(buffer, i);
    if (span && i === span.start) break;
    i++;
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
  "/credits",
  "/links",
  "/cd",
  "/runtime",
  "/auto",
  "/agents",
  "/history",
  "/resume",
  "/lang",
  "/paste",
  "/mouse",
  "/math",
  "/doc",
  "/skill",
  "/customize",
  "/login",
  "/auth",
  "/profile",
  "/update",
  "/logs",
  "/tasks",
  "/stop",
  "/exit",
  "/restart",
  "/learn",
  "/transcribe",
] as const;

export const CURATED_ROOT_SLASH_COMMANDS: readonly (typeof SLASH_COMMANDS)[number][] = [
  "/new",
  "/clear",
  "/compact",
  "/agents",
  "/history",
  "/cd",
  "/context",
  "/credits",
  "/auto",
  "/theme",
  "/tasks",
  "/login",
  "/auth",
  "/help",
  "/restart",
  "/exit",
];

export const SLASH_COMMAND_DESCRIPTIONS: Record<
  (typeof SLASH_COMMANDS)[number],
  { zh: string; en: string }
> = {
  "/help": { zh: "显示命令帮助", en: "Show command help" },
  "/new": { zh: "开启新对话（原对话保留在 /history）", en: "Start new dialog (keeps history)" },
  "/clear": { zh: "清空并删除当前对话的消息记录", en: "Clear & delete current dialog messages" },
  "/compact": { zh: "压缩当前上下文并续接新对话", en: "Compact context into a new dialog" },
  "/theme": { zh: "查看或切换界面主题", en: "Switch color theme" },
  "/context": { zh: "查看工作区上下文与预算", en: "Show workspace context" },
  "/credits": { zh: "查看会话计费方式与积分用量", en: "Show billing mode & credit usage" },
  "/links": { zh: "查看对话关联页面与链接", en: "Show linked pages" },
  "/cd": { zh: "切换工作目录", en: "Change working directory" },
  "/runtime": { zh: "切换运行模式 (auto/local/server)", en: "Switch runtime mode" },
  "/auto": { zh: "设置工具自动放行权限", en: "Toggle permission grants" },
  "/agents": { zh: "搜索并切换智能体", en: "Search and switch active agent" },
  "/history": { zh: "搜索并恢复最近对话", en: "Search and resume recent dialogs" },
  "/resume": { zh: "按对话 ID 精确恢复对话", en: "Resume dialog by exact ID" },
  "/lang": { zh: "切换界面语言 (zh/en)", en: "Switch language (zh/en)" },
  "/paste": { zh: "读取剪贴板（图片/文本）", en: "Paste from clipboard" },
  "/mouse": { zh: "开关终端鼠标模式", en: "Toggle mouse mode" },
  "/math": { zh: "开关数学公式 Unicode 渲染", en: "Toggle math rendering" },
  "/doc": { zh: "查看或挂载文档到工作区", en: "List or attach docs" },
  "/skill": { zh: "查看或挂载技能", en: "List or attach skills" },
  "/customize": { zh: "描述你想如何调教 nolo", en: "Customize nolo behavior" },
  "/login": { zh: "登录 Nolo 平台账号", en: "Log in to Nolo account" },
  "/auth": { zh: "配置第三方模型订阅授权 (OAuth)", en: "Configure provider OAuth subscriptions" },
  "/profile": { zh: "查看当前配置与登录环境", en: "Show current profile" },
  "/update": { zh: "检查并安装 CLI 更新", en: "Check for CLI updates" },
  "/logs": { zh: "查看最近诊断日志与路径", en: "Show recent logs" },
  "/tasks": { zh: "查看运行中的子任务与后台进程", en: "Show subagents & background processes" },
  "/stop": { zh: "终止指定或全部后台进程", en: "Stop background processes" },
  "/exit": { zh: "退出 CLI 交互工作区", en: "Exit CLI workspace" },
  "/restart": { zh: "原地重启当前 CLI 会话", en: "Restart CLI session in place" },
  "/learn": { zh: "复盘对话沉淀可复用改进", en: "Review dialog for learnings" },
  "/transcribe": { zh: "转写音视频文件为文本", en: "Transcribe audio/video file" },
};

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

export interface SlashCommandCandidate {
  label: string;
  insertText: string;
  source?: "builtin" | "project" | "path" | string;
  description?: string;
}

function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  let prefix = strings[0] ?? "";
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i]!.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === "") return "";
    }
  }
  return prefix;
}

export function completeSlashCandidates(
  buffer: string,
  cwd?: string,
): SlashCommandCandidate[] {
  if (!buffer.startsWith("/")) return [];
  const trimmed = buffer.trim();
  if (cwd && buffer.startsWith("/cd ")) {
    // `/cd <部分路径>`：以 cwd 为基展开目录候选（只列目录，不列文件）。
    // 返回完整候选行（`/cd <head><name>/` 形式），TAB 与候选行渲染共用。
    // 空前缀（`/cd ` + TAB）列出 cwd 下全部子目录。注意用原始 buffer 判断
    // 前缀：`/cd `.trim() 会吃掉尾空格，导致空参数场景漏判。
    const prefix = buffer.slice("/cd ".length);
    const pathLines = completeCdPathCandidates(prefix, cwd);
    return pathLines.map((line) => ({
      label: line,
      insertText: line,
      source: "path",
    }));
  }
  if (trimmed.includes(" ")) return [];

  const locale = getCliLocale();
  if (trimmed === "/") {
    if (buffer !== "/") return [];
    return CURATED_ROOT_SLASH_COMMANDS.map((cmd) => ({
      label: cmd,
      insertText: `${cmd} `,
      source: "builtin",
      description: SLASH_COMMAND_DESCRIPTIONS[cmd]?.[locale],
    }));
  }

  const candidates: SlashCommandCandidate[] = [];

  for (const cmd of SLASH_COMMANDS) {
    if (cmd.startsWith(trimmed) && cmd !== trimmed) {
      candidates.push({
        label: cmd,
        insertText: `${cmd} `,
        source: "builtin",
        description: SLASH_COMMAND_DESCRIPTIONS[cmd]?.[locale],
      });
    }
  }

  // 内置 skill 也要能补全：Web 候选池与 CLI 执行器都支持 builtin 源，TAB 只补
  // 系统命令和项目 skill 会让两端体验分叉。
  const slashQuery = trimmed.slice(1).toLowerCase();
  for (const skill of listBuiltinSkills()) {
    const slug = skill.slug;
    if (slashQuery !== "" && !slug.toLowerCase().startsWith(slashQuery)) continue;
    candidates.push({
      label: `/${slug} (builtin)`,
      insertText: `${formatSkillSlashReference({
        source: "builtin",
        id: slug,
      })} `,
      source: "builtin",
      description: skill.title || "Builtin skill",
    });
  }

  if (cwd) {
    try {
      const skills = discoverSkills(cwd);
      const query = trimmed.slice(1).toLowerCase();
      for (const skill of skills) {
        const nameLower = skill.name.toLowerCase();
        if (query === "" || nameLower.startsWith(query)) {
          const insertText = `${formatSkillSlashReference({
            source: "project",
            projectBinding: cwd,
            relativePath: skill.relativePath,
          })} `;
          candidates.push({
            label: `/${skill.name} (project)`,
            insertText,
            source: "project",
            description: skill.description || "Project skill",
          });
        }
      }
    } catch {
      // Swallowed: keep built-in candidates on fs errors
    }
  }

  return candidates;
}

export function completeSlashCommand(buffer: string, cwd?: string): string[] {
  return completeSlashCandidates(buffer, cwd).map((c) => c.label);
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
