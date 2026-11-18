import { resolveCliColorEnabled } from "../client/terminalStyles";
import { surfaceBackgroundSequence, themeColorSequence, themeText } from "./theme";
import { boxGlyphs, fitAnsiLine, resolveBoxCharset, visibleWidth } from "./tuiAnsi";
import { resolveSurfacePaintWidth } from "./tuiLayout";
import { t } from "./i18n";

/**
 * Shared look for every dialog frame (single-select, multi-select).
 *
 * The two renderers grew independently and ended up structurally identical but
 * entirely unstyled, so pickers rendered as flat text while the rest of the TUI
 * was themed. Centralizing the row/title/overflow styling here keeps them from
 * drifting again and makes every dialog follow the active `/theme`.
 *
 * Color is opt-out via `resolveCliColorEnabled()`: piped or NO_COLOR output
 * degrades to the exact plain text these frames produced before.
 */

/** Cursor marker for the focused row; blank keeps non-focused rows aligned. */
export const DIALOG_CURSOR = "❯";
export const DIALOG_CHECKED = "◉";
export const DIALOG_UNCHECKED = "○";

const DEFAULT_DIALOG_WIDTH = 80;
const HEADER_MIN_GAP = 2;

export function renderDialogRule(
  width = DEFAULT_DIALOG_WIDTH,
  colorEnabled = resolveCliColorEnabled(),
): string {
  const safeCols =
    Number.isFinite(width) && width > 0 ? Math.floor(width) : DEFAULT_DIALOG_WIDTH;
  const paintWidth = resolveSurfacePaintWidth(safeCols);
  if (paintWidth <= 0) return "";
  const rule = boxGlyphs(resolveBoxCharset()).h.repeat(paintWidth);
  if (!colorEnabled) return rule;
  return `\x1b[2m${themeColorSequence("chrome")}${rule}\x1b[0m`;
}

export function renderDialogTitle(
  title: string,
  colorEnabled = resolveCliColorEnabled(),
): string {
  if (!colorEnabled) return title;
  // Accent without bold: keeps dialog titles prominent without conflicting
  // with history user turns (which uniquely pair accent + bold + ┃ gutter).
  return `${themeColorSequence("accent")}${title}\x1b[0m`;
}

/**
 * Render the dialog header row: accent title on the left and muted key hint
 * right-aligned when `width` is known and both fit with breathing room.
 * On narrow screens where both do not fit within `resolveSurfacePaintWidth`,
 * the right hint is gracefully dropped and the title is truncated so the row
 * never wraps across terminal lines.
 */
export function renderDialogHeaderLine(
  args: {
    title: string;
    hint?: string;
    width?: number;
    colorEnabled?: boolean;
  },
  colorEnabledArg?: boolean,
): string {
  const colorEnabled =
    args.colorEnabled ?? colorEnabledArg ?? resolveCliColorEnabled();
  const hint = args.hint?.trim() ? args.hint.trim() : undefined;

  if (args.width === undefined) {
    if (!hint) return renderDialogTitle(args.title, colorEnabled);
    return `${renderDialogTitle(args.title, colorEnabled)}  ${themeText(hint, "muted", colorEnabled)}`;
  }

  const safeCols =
    Number.isFinite(args.width) && args.width > 0
      ? Math.floor(args.width)
      : DEFAULT_DIALOG_WIDTH;
  const budget = resolveSurfacePaintWidth(safeCols);
  if (budget <= 0) return "";

  const titleWidth = visibleWidth(args.title);
  const hintWidth = hint ? visibleWidth(hint) : 0;

  if (hint && titleWidth + HEADER_MIN_GAP + hintWidth <= budget) {
    const gap = " ".repeat(budget - titleWidth - hintWidth);
    return `${renderDialogTitle(args.title, colorEnabled)}${gap}${themeText(hint, "muted", colorEnabled)}`;
  }

  const fittedTitle =
    titleWidth > budget ? fitAnsiLine(args.title, budget, "…") : args.title;
  return renderDialogTitle(fittedTitle, colorEnabled);
}

/**
 * One selectable row. The focused row reads as a selection bar — a
 * low-contrast surface fill behind accent foreground text — so the cursor is
 * findable at a glance instead of relying on the `❯` glyph alone.
 */
export function renderDialogRow(
  args: {
    label: string;
    detail?: string;
    focused: boolean;
    /** Omitted for single-select; `◉`/`○` for multi-select. */
    checkbox?: string;
  },
  colorEnabled = resolveCliColorEnabled(),
): string {
  const marker = args.focused ? DIALOG_CURSOR : " ";
  const checkbox = args.checkbox ? `${args.checkbox} ` : "";
  const detail = args.detail
    ? `  ${themeText(args.detail, "muted", colorEnabled)}`
    : "";
  const row = `${marker} ${checkbox}${args.label}${detail}`;
  if (!args.focused || !colorEnabled) return row;
  return `${surfaceBackgroundSequence()}${themeColorSequence("accent")}${row}\x1b[0m`;
}

/** "... N more above/below" affordance shown when the list is windowed. */
export function renderDialogOverflow(
  text: string,
  colorEnabled = resolveCliColorEnabled(),
): string {
  return themeText(`  ${text}`, "chrome", colorEnabled);
}

/** Render "N more above" overflow indicator. */
export function renderOverflowAbove(
  count: number,
  colorEnabled = resolveCliColorEnabled(),
): string {
  return renderDialogOverflow(t("dialogMoreAbove", String(count)), colorEnabled);
}

/** Render "N more below" overflow indicator. */
export function renderOverflowBelow(
  count: number,
  colorEnabled = resolveCliColorEnabled(),
): string {
  return renderDialogOverflow(t("dialogMoreBelow", String(count)), colorEnabled);
}

export function renderDialogError(
  message: string,
  colorEnabled = resolveCliColorEnabled(),
): string {
  return themeText(`  ! ${message}`, "danger", colorEnabled);
}

/**
 * The command a confirm dialog is asking the user to approve, drawn in the
 * danger token so it stands apart from the chrome title/body and the user
 * can read exactly what they are about to sign. `renderDialogCommand` is a
 * styling primitive only — truncation/labeling is the caller's job so the
 * same look applies whether the command came from execShell or elsewhere.
 */
export function renderDialogCommand(
  text: string,
  colorEnabled = resolveCliColorEnabled(),
): string {
  return themeText(`  ${text}`, "danger", colorEnabled);
}
