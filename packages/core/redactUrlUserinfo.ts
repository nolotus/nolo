/**
 * URL userinfo redaction for free text.
 *
 * Shared by the web reporter (`ai/agent/toolErrorReport.ts`) and the server
 * sanitizer (`database/server/toolErrorReports/sanitize.ts`): two hand-kept
 * copies of the same regex is exactly how the apostrophe leak shipped twice
 * (both copies treated `'` as a URL boundary while WHATWG `new URL()` keeps it
 * inside userinfo, so `https://alice:pa'ss@host` kept `ss@host`).
 *
 * Contract (docs/plans/2026-11-12-tool-error-reports.md §6):
 *
 * 1. **Zero false negatives vs. WHATWG.** For any input, if *any* contiguous
 *    substring parses with `new URL()` into a non-empty `username`/`password`,
 *    that userinfo is gone from the output — no byte fragment survives.
 * 2. **Fail closed on truncated / malformed URLs.** A valid scheme authority
 *    with a non-empty run before `@` is redacted even when the host is missing,
 *    the port is invalid or the host has illegal characters.
 * 3. **Idempotent.** `f(redact(f)) === redact(f)` for every `t`.
 * 4. **Strictly O(n).** No backtracking regex; monotone pointer scans only.
 *
 * Algorithm (§2.2 of the design note): anchor on every `:`. A `:` whose
 * preceding word is a *special* scheme (`http`/`https`/`ws`/`wss`/`ftp`) starts
 * its authority right after any mix of `/`, `\` and ASCII tab/newline; a `:`
 * preceded by any valid scheme and followed by `//` starts it after the second
 * slash. The authority run ends at the first `/`, `?`, `#` (and `\` for special
 * schemes) — quotes, commas, semicolons, spaces, angle brackets and control
 * characters are **data**, because WHATWG keeps most of them inside userinfo.
 * The *last* `@` before that end is the separator (WHATWG takes the last one)
 * and everything from the authority start to it is replaced by `[REDACTED]`.
 *
 * Why per-`:` instead of left-to-right longest-scheme matching: in
 * `failed\nhttps:///user:pass@host` a greedy scheme token would merge into the
 * non-special scheme `failedhttps` and miss the credentials. Anchoring on `:`
 * keeps `failed\n` out of the decision (`\n` is skipped only *inside* the
 * special-scheme lookback), while `aws:` / `throws:` still do not look like a
 * special scheme.
 *
 * Known, deliberate over-redaction (fail closed, §6 of the contract): prose
 * like `'https://host.test','a@b.com'` or `https://host.test, a@b.com` folds
 * into `[REDACTED]@` because the run is not allowed to stop at punctuation.
 * Losing a bare host in an error message is cheap; leaking half a password is
 * not.
 *
 * Pure string -> string, no `node:` imports (the web bundle imports this).
 */
const REDACTED_USERINFO = "[REDACTED]@";
const REDACTED = "[REDACTED]";

const SPECIAL_SCHEMES = new Set(["http", "https", "ws", "wss", "ftp"]);

/**
 * `https` is the longest special scheme, so any scheme token longer than this
 * cannot be special. Used to keep the per-`:` lookback constant.
 */
const MAX_SCHEME_CHARS = 8;

const isTabOrNewline = (char: string): boolean => char === "\t" || char === "\n" || char === "\r";

const isAsciiAlpha = (char: string): boolean =>
  (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");

const isSchemeChar = (char: string): boolean =>
  isAsciiAlpha(char) || (char >= "0" && char <= "9") || char === "+" || char === "-" || char === ".";

/**
 * True when `idx` sits inside an identifier (a contiguous scheme-character run
 * that starts with a letter) — `aws:` / `throws:` must not be read as a scheme.
 * Does not cross `\t` / `\n` / `\r`, so `failed\nhttps:user:pw@h` is still an
 * independent `https:`.
 */
const isPrecededBySchemeWord = (text: string, idx: number): boolean => {
  let index = idx - 1;
  if (index < 0 || !isSchemeChar(text[index] as string)) return false;
  while (index > 0 && isSchemeChar(text[index - 1] as string)) index -= 1;
  return isAsciiAlpha(text[index] as string);
};

/** Whether the word right before `colonIdx` (skipping `\t`/`\n`/`\r`) is a special scheme. */
const matchSpecialSchemeBeforeColon = (text: string, colonIdx: number): boolean => {
  let chars = "";
  let index = colonIdx - 1;
  // `https` is the longest special scheme: five characters is the whole budget.
  while (index >= 0 && chars.length < 5) {
    const char = text[index] as string;
    if (isTabOrNewline(char)) {
      index -= 1;
      continue;
    }
    if (!isAsciiAlpha(char)) break;
    chars = char.toLowerCase() + chars;
    if (SPECIAL_SCHEMES.has(chars) && !isPrecededBySchemeWord(text, index)) return true;
    index -= 1;
  }
  return false;
};

/**
 * Whether the *whole* scheme token ending at `colonIdx` is a special scheme,
 * skipping `\t` / `\n` / `\r` inside the token.
 *
 * The lookback must not stop at a newline: WHATWG strips tab/newline before
 * parsing, so `custom\nhttp://u:p\secret@host/p` is the single scheme
 * `customhttp:` (non-special, `\` stays inside the userinfo), never `custom` +
 * `http:`. Reading only the `http` suffix made the `\`-terminated special
 * authority win and leaked `secret@host` (TER-URL-USERINFO-BOUNDARY).
 *
 * Any token longer than the longest special scheme (`https`) is non-special by
 * construction, so the scan is capped there and stays cheap per anchor.
 */
const isFullSpecialSchemeBeforeColon = (text: string, colonIdx: number): boolean => {
  let index = colonIdx - 1;
  let chars = "";
  while (index >= 0 && chars.length <= MAX_SCHEME_CHARS) {
    const char = text[index] as string;
    if (isTabOrNewline(char)) {
      index -= 1;
      continue;
    }
    if (!isSchemeChar(char)) break;
    chars = char.toLowerCase() + chars;
    index -= 1;
  }
  // The loop also exits when the token outgrew the budget: that is not `https`.
  if (chars.length > MAX_SCHEME_CHARS) return false;
  if (!isAsciiAlpha(chars[0] ?? "")) return false;
  return SPECIAL_SCHEMES.has(chars);
};

/** Whether a valid scheme (scheme characters starting with a letter) precedes `colonIdx`. */
const hasValidSchemeBeforeColon = (text: string, colonIdx: number): boolean => {
  let index = colonIdx - 1;
  let sawAlpha = false;
  while (index >= 0) {
    const char = text[index] as string;
    if (isTabOrNewline(char)) {
      index -= 1;
      continue;
    }
    if (!isSchemeChar(char)) break;
    if (isAsciiAlpha(char)) sawAlpha = true;
    index -= 1;
  }
  return sawAlpha;
};

/** Index right after `//` following `colonIdx`, or `-1`. */
const matchDoubleSlashAfterColon = (text: string, colonIdx: number): number => {
  let index = colonIdx + 1;
  let slashes = 0;
  while (index < text.length && slashes < 2) {
    const char = text[index] as string;
    if (isTabOrNewline(char)) {
      index += 1;
      continue;
    }
    if (char === "/") {
      slashes += 1;
      index += 1;
      continue;
    }
    return -1;
  }
  return slashes === 2 ? index : -1;
};

/** An authority start offset plus whether WHATWG would treat that URL as special. */
type AuthorityCandidate = { start: number; isSpecial: boolean };

/** Index right after `colonIdx` plus any mix of `/`, `\` and tab/newline (special rules). */
const skipSpecialAuthorityPrefix = (text: string, colonIdx: number): number => {
  let index = colonIdx + 1;
  while (index < text.length) {
    const char = text[index] as string;
    if (char === "/" || char === "\\" || isTabOrNewline(char)) index += 1;
    else break;
  }
  return index;
};

/**
 * Every reading under which the `:` at `colonIdx` starts a URL with an
 * authority, widest coverage first.
 *
 * - Special scheme (with `\t`/`\n`/`\r` skipped): the authority starts after any
 *   mix of `/`, `\`, tab/newline and ends at `\` as well (§2.2).
 * - Non-special scheme with `//` after the colon: the authority starts after the
 *   second slash and `\` is data, which is strictly wider than the special
 *   reading of the same text (`custom\nhttp://u:p\secret@host/p` — the full
 *   scheme `customhttp` is non-special, so nothing may stop at `\`).
 * - Neither: a bare non-special `scheme:` has no authority at all, but an
 *   independent special suffix still does (`failed\nhttps:u:p@h`, where the
 *   newline keeps `https` a scheme of its own).
 *
 * Candidates are ordered widest-first; the caller takes the first one that
 * actually carries a non-empty run before `@`. Callers must stay monotone in
 * `colonIdx` (both redactors do) so the per-candidate stop caches stay linear.
 */
const authorityCandidates = (text: string, colonIdx: number): AuthorityCandidate[] => {
  const fullSchemeIsSpecial = isFullSpecialSchemeBeforeColon(text, colonIdx);
  if (!fullSchemeIsSpecial && !hasValidSchemeBeforeColon(text, colonIdx)) return [];

  const candidates: AuthorityCandidate[] = [];
  const afterSlashes = matchDoubleSlashAfterColon(text, colonIdx);
  if (!fullSchemeIsSpecial && afterSlashes !== -1) {
    candidates.push({ start: afterSlashes, isSpecial: false });
  }
  if (fullSchemeIsSpecial || matchSpecialSchemeBeforeColon(text, colonIdx)) {
    candidates.push({ start: skipSpecialAuthorityPrefix(text, colonIdx), isSpecial: true });
  }
  return candidates;
};

/**
 * First index at or after `from` that ends the authority run: path, query and
 * hash always; backslash too for special schemes only (WHATWG treats `\` as `/`
 * in special URLs, while `postgres://alice:pa\ss@db` keeps it in the userinfo).
 */
const findNextStop = (text: string, from: number, includeBackslash: boolean): number => {
  for (let index = from; index < text.length; index += 1) {
    const char = text[index] as string;
    if (char === "/" || char === "?" || char === "#" || (includeBackslash && char === "\\")) {
      return index;
    }
  }
  return text.length;
};

/** Whether `[start, end)` holds anything except tab/newline (i.e. a non-empty userinfo). */
const hasNonIgnoredChar = (text: string, start: number, end: number): boolean => {
  for (let index = start; index < end; index += 1) {
    if (!isTabOrNewline(text[index] as string)) return true;
  }
  return false;
};

/** Replaces every URL userinfo in `text` with `[REDACTED]@`. */
export function redactUrlUserinfo(text: string): string {
  // Anchor on the last `@` of the whole text, not of the current run: a leading
  // plain-text email (`mail a@b.com then https://u:p@host`) or an empty userinfo
  // (`https://@host/p https://u:p@host`) must not end the loop early.
  const lastAtInText = text.lastIndexOf("@");
  if (lastAtInText === -1 || !text.includes(":")) return text;

  let output = "";
  let cursor = 0;
  let scanFrom = 0;
  // Cached lookups; each cursor only moves forward, which is what keeps the
  // whole function linear (every region is scanned at most once).
  let nextAt = -1;
  let nextSpecialStop = -1;
  let nextNonSpecialStop = -1;

  while (scanFrom < lastAtInText) {
    const colonIdx = text.indexOf(":", scanFrom);
    if (colonIdx === -1 || colonIdx >= lastAtInText) break;
    scanFrom = colonIdx + 1;

    const candidates = authorityCandidates(text, colonIdx);
    if (candidates.length === 0) continue;

    // Widest reading first: the non-special `//` reading does not stop at `\`,
    // so it covers both `custom\nhttp://u:p\secret@host` interpretations.
    let authorityStart = -1;
    let authorityEnd = -1;
    for (const candidate of candidates) {
      if (nextAt < candidate.start) {
        nextAt = text.indexOf("@", candidate.start);
        // No `@` left at or after this start: no later colon can redact either.
        if (nextAt === -1) break;
      }
      const end = candidate.isSpecial
        ? nextSpecialStop < candidate.start
          ? (nextSpecialStop = findNextStop(text, candidate.start, true))
          : nextSpecialStop
        : nextNonSpecialStop < candidate.start
          ? (nextNonSpecialStop = findNextStop(text, candidate.start, false))
          : nextNonSpecialStop;
      if (nextAt >= end) continue;
      authorityStart = candidate.start;
      authorityEnd = end;
      break;
    }
    if (authorityStart === -1) {
      if (nextAt === -1) break;
      continue;
    }

    const lastAt = text.lastIndexOf("@", authorityEnd - 1);
    if (lastAt <= authorityStart) continue;
    if (!hasNonIgnoredChar(text, authorityStart, lastAt)) continue;

    // Already redacted: skip forward so a second pass is a no-op (idempotence).
    if (text.slice(authorityStart, lastAt) === "[REDACTED]") {
      scanFrom = lastAt + 1;
      continue;
    }

    output += `${text.slice(cursor, authorityStart)}${REDACTED_USERINFO}`;
    cursor = lastAt + 1;
    scanFrom = cursor;
  }

  return cursor === 0 ? text : output + text.slice(cursor);
}

/**
 * Replaces the query / fragment of every URL in `text` with `?[REDACTED]` /
 * `#[REDACTED]`, keeping the separator (`TER-URL-QUERY-FRAGMENT-PARSER-MISMATCH`).
 *
 * Shares the `:`-anchor URL start with `redactUrlUserinfo` on purpose: the old
 * `scheme://…[?#]` regex here and in the server rules missed
 * - slashless special URLs (`https:host.test/cb#code=secret123`),
 * - URLs split by `\n` / `\r` / `\t` (`https://host.test/cb#co\nde=secret`,
 *   `https://host.test/cb\n#code=secret`),
 * so OAuth `#code=` / `#id_token=` tails were stored verbatim.
 *
 * Every valid `scheme:` anchors a URL, not only schemes that carry an authority:
 * `new URL("myapp:callback#code=secret")` keeps the fragment, so a custom
 * protocol without `//` must be covered too. That is why the start falls back to
 * `colonIdx + 1` whenever `hasValidSchemeBeforeColon` holds (the same lookback
 * the userinfo pass uses).
 *
 * **Fail closed on spaces.** WHATWG allows a space inside the path, the query and
 * the fragment (`new URL("https://h/my path#code=secret")` parses with the space
 * intact), and free text gives no reliable way to tell the URL's end from the
 * neighbouring prose. So the scan does *not* stop at the first space: everything
 * from the first `?` / `#` at or after the URL start up to the end of `text`
 * becomes one value. Leftover prose after a redacted query is deliberately
 * dropped (plan §6); leaking half an OAuth code is not an option.
 *
 * Idempotent: the rewritten tail is exactly `?[REDACTED]` / `#[REDACTED]`, which
 * re-rewrites to itself. Texts without any `?` / `#` are returned untouched, so
 * `<scheme>:` mentions (`throws: err a@b.com`), stack frames (`/app.js:1:1`) and
 * plain URLs (`https://host.test/v1`) keep their following prose.
 */
export function redactUrlQueryAndFragment(text: string): string {
  if (!text.includes(":") || (!text.includes("?") && !text.includes("#"))) return text;

  let output = "";
  let cursor = 0;
  let scanFrom = 0;

  while (scanFrom < text.length) {
    const colonIdx = text.indexOf(":", scanFrom);
    if (colonIdx === -1) break;
    scanFrom = colonIdx + 1;

    let urlStart = -1;
    for (const candidate of authorityCandidates(text, colonIdx)) {
      if (urlStart === -1 || candidate.start < urlStart) urlStart = candidate.start;
    }
    // No authority required: `myapp:callback#code=secret` is a URL as well.
    if (urlStart === -1 && hasValidSchemeBeforeColon(text, colonIdx)) urlStart = colonIdx + 1;
    if (urlStart === -1) continue;
    // Inside a span this pass already rewrote: keep the first replacement.
    if (urlStart < cursor) continue;

    let marker = -1;
    for (let index = urlStart; index < text.length; index += 1) {
      const char = text[index] as string;
      if (char === "?" || char === "#") {
        marker = index;
        break;
      }
    }
    // Nothing after this anchor means nothing after any later anchor either.
    if (marker === -1) break;

    output += `${text.slice(cursor, marker)}${text[marker] as string}${REDACTED}`;
    cursor = text.length;
    scanFrom = text.length;
  }

  return cursor === 0 ? text : output + text.slice(cursor);
}
