/**
 * Email body normalization for the agent inbox page.
 *
 * Real inbound mail is stored with `text` holding the raw quoted-printable
 * source of the HTML part and `html` left empty (verified against
 * us.nolo.chat records for agent-0e95801d90-mail-steward). Rendering that
 * source straight into the UI shows `<!DOCTYPE html> ... =3D` instead of the
 * message, so every consumer normalizes here first.
 *
 * Everything in this module is pure and DOM-free: it runs during SSR too.
 */
import { asOptionalTrimmedString } from "core/optionalString";

const HEX_PAIR = /^[0-9A-Fa-f]{2}$/;

// Document-level markers or a closed block element. Deliberately NOT a bare
// `<p>`/`<div>` anywhere in the body: plain-text mail that quotes markup
// (`wrap it in <p>`, `const el = <div className="x">`) must stay plain text,
// otherwise it renders through the HTML branch and loses every newline.
const HTML_DOCUMENT_HINT = /<!doctype\s+html|<html[\s>]|<\/html\s*>|<\/body\s*>/i;
const HTML_FRAGMENT_HINT =
  /<(p|div|table|ul|ol|h[1-6]|blockquote)\b[^>]*>[\s\S]*?<\/(p|div|table|ul|ol|h[1-6]|blockquote)\s*>/i;

// Long marketing mails can be hundreds of KB of markup; the preview only ever
// needs a few hundred characters, so cap the scan instead of regex-ing it all.
const PREVIEW_SCAN_CAP = 200_000;

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: false });

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  pound: "£",
  deg: "°",
  times: "×",
  bull: "•",
};

/**
 * Decodes quoted-printable (`=3D`, `=E4=BD=A0`, soft line breaks `=\r\n`).
 * Malformed sequences are kept verbatim — never throws.
 */
export const decodeQuotedPrintable = (input: string): string => {
  if (!input || input.indexOf("=") === -1) return input;

  const bytes: number[] = [];
  const pushText = (text: string) => {
    const encoded = utf8Encoder.encode(text);
    for (const byte of encoded) bytes.push(byte);
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char !== "=") {
      // Copy whole code points: slicing a surrogate pair one unit at a time
      // would turn every emoji into U+FFFD.
      const codePoint = input.codePointAt(index) ?? 0;
      const width = codePoint > 0xffff ? 2 : 1;
      pushText(input.slice(index, index + width));
      index += width - 1;
      continue;
    }
    const next = input[index + 1];
    if (next === "\r" && input[index + 2] === "\n") {
      index += 2;
      continue;
    }
    if (next === "\n") {
      index += 1;
      continue;
    }
    const hex = input.slice(index + 1, index + 3);
    if (HEX_PAIR.test(hex)) {
      bytes.push(Number.parseInt(hex, 16));
      index += 2;
      continue;
    }
    bytes.push(0x3d);
  }

  return utf8Decoder.decode(new Uint8Array(bytes));
};

const decodeEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const named = ENTITY_MAP[body.toLowerCase()];
    return named ?? match;
  });

const collapseWhitespace = (value: string): string =>
  value.replace(/[\s\u00a0]+/g, " ").trim();

const toPreview = (value: string, maxLength: number): string => {
  const text = collapseWhitespace(decodeEntities(value));
  if (maxLength <= 0 || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
};

/** True when the body is an HTML document or a closed fragment, not plain text. */
export const looksLikeHtml = (text: string): boolean => {
  const trimmed = asOptionalTrimmedString(text);
  if (!trimmed) return false;
  const scan =
    trimmed.length > PREVIEW_SCAN_CAP
      ? trimmed.slice(0, PREVIEW_SCAN_CAP)
      : trimmed;
  return HTML_DOCUMENT_HINT.test(scan) || HTML_FRAGMENT_HINT.test(scan);
};

/** Converts an HTML body to a single-line plain-text preview. */
export const htmlToPlainText = (html: string, maxLength = 240): string => {
  const scan =
    html.length > PREVIEW_SCAN_CAP ? html.slice(0, PREVIEW_SCAN_CAP) : html;
  const withoutHidden = scan
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|head|title)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|blockquote)\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return toPreview(withoutHidden, maxLength);
};

export interface EmailBodySource {
  text?: string;
  html?: string;
}

export interface ResolvedEmailBody {
  /** Plain-text preview for the list row; never raw markup. */
  previewText: string;
  /** How the detail view must render `content`. */
  kind: "html" | "text";
  content: string;
}

/**
 * Picks the body to render: explicit `html` first, then `text` decoded and
 * sniffed for markup. Handles quoted-printable in both fields.
 */
export const resolveEmailBody = (email?: EmailBodySource | null): ResolvedEmailBody => {
  const rawText = email?.text ?? "";
  const rawHtml = email?.html ?? "";
  const decodedText = decodeQuotedPrintable(rawText);
  const decodedHtml = decodeQuotedPrintable(rawHtml);

  const htmlCandidate = decodedHtml.trim()
    ? decodedHtml
    : looksLikeHtml(decodedText)
      ? decodedText
      : "";

  if (htmlCandidate) {
    return {
      previewText: htmlToPlainText(htmlCandidate),
      kind: "html",
      content: htmlCandidate,
    };
  }

  const label = asOptionalTrimmedString(decodedText) ?? "";
  return {
    previewText: toPreview(label, 240),
    kind: "text",
    content: label,
  };
};
