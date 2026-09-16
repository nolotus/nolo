import { render, sourceBox, toAnsi, type AnsiTheme } from "lovely-mermaid";
import { themeSgrParams, type TuiBrightness } from "../tui/theme";

/**
 * Terminal Mermaid renderer — thin adapter over lovely-mermaid ("换核不换壳").
 *
 * lovely-mermaid draws flowcharts, sequence, state, class, ER, pie, mindmap,
 * timeline and gitGraph diagrams as Unicode box-drawing art; this module only
 * wires its output into the CLI's theme system and over-wide degradation.
 *
 * Contract with callers (see assistantOutput.renderMermaidBody):
 *
 *   - Return the **input `source` by reference** whenever there is nothing to
 *     draw (unsupported/blank/unparseable input, or a render throw). Callers
 *     detect fallback with `rendered === body` and re-render the raw lines as
 *     highlighted code — so any wrapper string here would break that check.
 *   - When the art is wider than the available columns, degrade to a framed
 *     source box (lovely-mermaid's `sourceBox`) instead of emitting mangled
 *     art. `cols` wins when it is a positive number; otherwise
 *     `process.stdout.columns` is consulted, but only on a TTY; with neither,
 *     the art is emitted as-is (headless / piped callers decide their own
 *     truncation).
 *   - `colorEnabled = false` yields pure text (`art.plain`) with no ANSI.
 *   - Roles map onto TUI tokens: border→chrome, edge→warning,
 *     edgeLabel→muted, title→accent. `text`/`none` are left unstyled so node
 *     labels keep the terminal's default foreground.
 *
 * Note: `AnsiTheme` values are **SGR parameters** (`'38;2;r;g;b'`, `'90'`),
 * not full escape sequences — themeSgrParams() exists for exactly that.
 */

/** Token-role mapping from the review brief; kept in one place. */
function themeAnsiTheme(brightness: TuiBrightness): AnsiTheme {
  return {
    border: themeSgrParams("chrome", process.env, brightness),
    edge: themeSgrParams("warning", process.env, brightness),
    edgeLabel: themeSgrParams("muted", process.env, brightness),
    title: themeSgrParams("accent", process.env, brightness),
  };
}

/** Effective column budget for the over-wide degradation, or undefined. */
function resolveMaxCols(cols?: number): number | undefined {
  if (typeof cols === "number" && Number.isFinite(cols) && cols > 0) {
    return Math.floor(cols);
  }
  const out = process.stdout as { isTTY?: boolean; columns?: number };
  if (
    out.isTTY &&
    typeof out.columns === "number" &&
    Number.isFinite(out.columns) &&
    out.columns > 0
  ) {
    return Math.floor(out.columns);
  }
  return undefined;
}

/**
 * Render a raw ```mermaid ``` code-block body (the lines between the fences,
 * without the fence markers) into a terminal diagram. Falls back to the raw
 * source if nothing parses.
 */
export function renderMermaidBlock(
  source: string,
  brightness: TuiBrightness,
  colorEnabled = true,
  cols?: number
): string {
  let art = null as ReturnType<typeof render>;
  try {
    art = render(source);
  } catch {
    // Defensive: a renderer throw must never lose user content.
    return source;
  }
  if (!art) {
    // No art to show (blank, unsupported kind, nothing parsed): hand back the
    // exact input so callers' `rendered === body` fallback check holds.
    return source;
  }

  const maxCols = resolveMaxCols(cols);
  if (maxCols !== undefined && art.width > maxCols) {
    return sourceBox(source, maxCols).plain.join("\n");
  }

  if (!colorEnabled) {
    return art.plain.join("\n");
  }

  return toAnsi(art, themeAnsiTheme(brightness)).join("\n");
}
