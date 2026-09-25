/**
 * Extract Google's one-time account-verification link from provider failures.
 *
 * Google Cloud Code Assist (the Antigravity OAuth surface, also used by
 * Gemini Code Assist) periodically gates calls behind a human verification
 * step and answers HTTP 403 with `reason: VALIDATION_REQUIRED`. The OAuth
 * token is still valid; the user only needs to open `validation_url` in a
 * browser signed into that Google account.
 *
 * The link arrives buried in one of several shapes, all of which reach error
 * strings on different transports:
 *
 * 1. parsed body    — `error.details[].metadata.validation_url`
 * 2. double-encoded — `error.message` is a *string* containing another
 *    JSON body with the same `error.details` structure (the CLI antigravity
 *    transport throws `body.error.message` verbatim, so the text keeps
 *    literal `\n` / `\"` escapes)
 * 3. truncated text  — gateways clip the body; a regex fallback recovers the
 *    URL directly from whatever text survived
 *
 * Shared by the chat send-error card (packages/chat) and the CLI/TUI
 * local-run failure line (packages/cli) so the two display paths cannot
 * drift apart.
 */

import { isRecord } from "../isRecord";

type ValidationLinkInfo = {
  /** Google's verification URL (`validation_url`), http(s) only. */
  url?: string;
  /** Link label Google provides (`validation_url_link_text`). */
  text?: string;
  /** Auxiliary `validation_learn_more_url`, http(s) only. */
  learnMoreUrl?: string;
};

/** Only pass through safe http/https URLs; drop `javascript:` and friends. */
function safeUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    // Return the parser's normalized href, never the raw input: the URL is
    // provider-controlled and gets rendered into a terminal (CLI/TUI auth
    // failure line). `new URL()` percent-encodes C0 controls — an input like
    // `https://x/\x1b[2J` would otherwise reach the terminal verbatim as a
    // clear-screen sequence. Verified: href === input for normal URLs, so no
    // visible change for legitimate links.
    return parsed.href;
  } catch {
    return undefined;
  }
}

/**
 * Scan a Google `rpc.ErrorInfo` `details[]` array for the verification link.
 * First match wins for both the verification URL and the learn-more URL,
 * matching the web card's historical precedence (metadata before `links[]`).
 */
export function scanValidationDetails(details: unknown): ValidationLinkInfo {
  if (!Array.isArray(details)) return {};
  let url: string | undefined;
  let text: string | undefined;
  let learnMoreUrl: string | undefined;
  for (const detail of details) {
    if (url && learnMoreUrl) break;
    if (!isRecord(detail)) continue;
    const metadata = isRecord(detail.metadata) ? detail.metadata : undefined;
    if (metadata) {
      url = url ?? safeUrl(metadata.validation_url);
      text = text ?? (typeof metadata.validation_url_link_text === "string"
        ? metadata.validation_url_link_text
        : undefined);
      learnMoreUrl = learnMoreUrl ?? safeUrl(metadata.validation_learn_more_url);
    }
    const links = Array.isArray(detail.links) ? detail.links : [];
    for (const link of links) {
      if (!isRecord(link)) continue;
      const linkUrl = safeUrl(link.url);
      if (!linkUrl) continue;
      const desc = typeof link.description === "string" ? link.description : "";
      if (!url && /verify|continue/i.test(desc)) {
        url = linkUrl;
        text = text ?? desc;
      } else if (!learnMoreUrl && /learn more/i.test(desc)) {
        learnMoreUrl = linkUrl;
      }
    }
  }
  return { url, text, learnMoreUrl };
}

/** Decode the escape sequences of a JSON *string* value (single pass). */
function unescapeJsonString(text: string): string {
  return text.replace(
    /\\(["\\/nrtbf]|u[0-9a-fA-F]{4})/g,
    (_match, esc: string) => {
      switch (esc[0]) {
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "b":
          return "\b";
        case "f":
          return "\f";
        case "u":
          return String.fromCharCode(parseInt(esc.slice(1), 16));
        default:
          return esc; // " \ /
      }
    }
  );
}

/**
 * Slice the first balanced `{...}` region out of `text`, respecting string
 * quoting and backslash escapes. Trailing prose (e.g. the ` | {clipped body}`
 * suffix `describeProviderFailure` appends) must not break the parse.
 */
function sliceBalancedJsonObject(text: string): string | undefined {
  const start = text.indexOf("{");
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return undefined;
}

function parseBalancedJson(text: string): unknown {
  const slice = sliceBalancedJsonObject(text);
  if (!slice) return undefined;
  try {
    return JSON.parse(slice);
  } catch {
    return undefined;
  }
}

/**
 * Recursively look for `details[]` in a parsed error payload, following the
 * double-encoding where `error.message` is itself a JSON body as a string.
 */
function findValidationInParsed(parsed: unknown, depth = 0): ValidationLinkInfo {
  if (depth > 3 || !isRecord(parsed)) return {};
  const err = isRecord(parsed.error) ? parsed.error : parsed;
  const fromDetails = scanValidationDetails(isRecord(err) ? err.details : undefined);
  if (fromDetails.url) return fromDetails;
  const nested = isRecord(err) ? err.message : undefined;
  if (typeof nested === "string" && nested.trim().startsWith("{")) {
    try {
      const reparsed = findValidationInParsed(JSON.parse(nested), depth + 1);
      if (reparsed.url) return reparsed;
    } catch {
      /* not JSON — fall through to the caller's other candidates */
    }
  }
  return {};
}

/**
 * 剥离 C0 控制字符与 DEL（含 ESC）。
 *
 * 远端可控文本进入终端前必须过这道：`\x1b[2J` 之类的序列会真的执行。
 * 放在这里而不是只靠 safeUrl 的 `parsed.href`，是因为 regex fallback 抓到的
 * URL 可能 parse 失败（截断的 body），那条路径同样会抵达终端。
 */
export function stripTerminalControlChars(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f\u007f]/g, "");
}

/** Last-resort regex: recover the URL from text even when JSON.parse fails. */
function regexValidationFallback(text: string): ValidationLinkInfo {
  const urlMatch = text.match(
    /validation_url[^h]{0,10}(https?:\/\/[^\s"\\]+)/i
  );
  if (!urlMatch) return {};
  const textMatch = text.match(
    /validation_url_link_text[^A-Za-z]{0,10}([^"\\\n]{1,60})/i
  );
  return {
    // safeUrl first (normalizes C0 into %XX); fall back to stripping controls
    // so a truncated-but-real link is still emitted rather than dropped.
    url: safeUrl(urlMatch[1]) ?? stripTerminalControlChars(urlMatch[1]),
    text: textMatch?.[1]
      ? stripTerminalControlChars(textMatch[1].trim()) || undefined
      : undefined,
  };
}

/**
 * Extract Google's verification link from a provider failure message.
 * Accepts any of the shapes described in the module doc; returns `{}` when
 * the failure is not a Google validation gate.
 */
export function extractGoogleValidationLink(errorText: string): ValidationLinkInfo {
  for (const candidate of [
    parseBalancedJson(errorText),
    parseBalancedJson(unescapeJsonString(errorText)),
  ]) {
    if (candidate === undefined) continue;
    const found = findValidationInParsed(candidate);
    if (found.url) return found;
  }
  return regexValidationFallback(errorText);
}
