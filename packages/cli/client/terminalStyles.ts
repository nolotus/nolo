import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

type CliTextStyle =
  | "dim"
  | "bold"
  | "cyan"
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "magenta"
  | "white"
  | "black";
type CliBgStyle = "bgCyan" | "bgGray" | "bgMagenta" | "bgYellow" | "bgBlue" | "bgGreen" | "bgRed" | "bgWhite";

const ANSI_FG: Record<CliTextStyle, string> = {
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  black: "\x1b[30m",
};

const ANSI_BG: Record<CliBgStyle, string> = {
  bgCyan: "\x1b[46m",
  bgGray: "\x1b[100m",
  bgMagenta: "\x1b[45m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
  bgWhite: "\x1b[47m",
};

const RESET = "\x1b[0m";

export function resolveCliColorEnabled(
  env: Record<string, string | undefined> = process.env,
  isTTY: boolean = Boolean(process.stdout.isTTY)
) {
  const setting = asTrimmedLowercaseString(env.NOLO_CLI_COLOR);
  if (setting === "0" || setting === "false" || setting === "off") return false;
  if (env.NO_COLOR) return false;
  if (setting === "1" || setting === "true" || setting === "on") return true;
  return isTTY;
}

export function styleCliText(
  text: string,
  style: CliTextStyle | CliBgStyle,
  enabled = resolveCliColorEnabled()
) {
  if (!enabled || !text) return text;
  const code = ANSI_FG[style as CliTextStyle] ?? ANSI_BG[style as CliBgStyle];
  // Guard unknown style names so we never paint the literal "undefined".
  if (!code) return text;
  return `${code}${text}${RESET}`;
}

export function dimCliText(text: string, enabled = resolveCliColorEnabled()) {
  return styleCliText(text, "dim", enabled);
}

export function styleCliSegment(
  text: string,
  options: { fg?: CliTextStyle; bg?: CliBgStyle },
  enabled = resolveCliColorEnabled()
) {
  if (!enabled || !text) return text;
  const codes: string[] = [];
  if (options.fg) codes.push(ANSI_FG[options.fg]);
  if (options.bg) codes.push(ANSI_BG[options.bg]);
  if (codes.length === 0) return text;
  return `${codes.join("")}${text}${RESET}`;
}

export function composeCliStyledText(
  parts: Array<{ text: string; style?: CliTextStyle | CliBgStyle }>,
  enabled = resolveCliColorEnabled()
) {
  if (!enabled) return parts.map((part) => part.text).join("");
  return parts
    .map((part) => (part.style ? styleCliText(part.text, part.style, true) : part.text))
    .join("");
}

const OSC8_OPEN = "\x1b]8;;";
const OSC8_CLOSE = "\x1b\\";

/**
 * Strip C0/DEL controls (ESC included) from a hyperlink label.
 *
 * Both ends of an OSC 8 hyperlink are terminated by ST (`ESC \`), so a stray
 * ESC inside the label would close the link and let the remainder run as an
 * unrelated escape sequence. The label is frequently provider-controlled (e.g.
 * Google's `validation_url_link_text`), so sanitize here rather than trusting
 * each caller.
 */
function sanitizeHyperlinkLabel(label: string): string {
  // eslint-disable-next-line no-control-regex
  return label.replace(/[\u0000-\u001f\u007f]/g, "");
}

/**
 * Whether terminal hyperlinks (OSC 8) may be emitted.
 *
 * Deliberately NOT gated on color: `NO_COLOR` says "do not paint my terminal",
 * not "do not make my links clickable" — a user who disabled color in a TTY
 * still has no other way to open a link once mouse reporting is on. Pipes are
 * still excluded automatically (no TTY ⇒ nothing to click).
 */
export function resolveCliHyperlinkEnabled(
  env: Record<string, string | undefined> = process.env,
  isTTY: boolean = Boolean(process.stdout.isTTY)
) {
  const setting = asTrimmedLowercaseString(env.NOLO_CLI_HYPERLINKS);
  if (setting === "0" || setting === "false" || setting === "off") return false;
  if (setting === "1" || setting === "true" || setting === "on") return true;
  return isTTY;
}

/**
 * Render `label` as a clickable OSC 8 hyperlink pointing at `url`.
 *
 * When hyperlinks are unavailable the url is emitted as plain text after the
 * label, so the line still carries a copy-pasteable / Cmd-clickable target —
 * that fallback is what non-TTY output (pipes, CI logs) gets, and it is the
 * only case where the raw url must survive.
 *
 * Only ever called with urls that already passed a `new URL()` check: the
 * sequence is emitted straight into a terminal, so a stray ESC inside `url`
 * would terminate the hyperlink and inject an unrelated escape.
 */
export function formatCliHyperlink(
  url: string,
  label: string,
  enabled = resolveCliHyperlinkEnabled()
) {
  if (!url) return label;
  const safeLabel = sanitizeHyperlinkLabel(label);
  if (!enabled) return `${safeLabel} (${url})`;
  if (!safeLabel) return url;
  return `${OSC8_OPEN}${url}${OSC8_CLOSE}${safeLabel}${OSC8_OPEN}${OSC8_CLOSE}`;
}