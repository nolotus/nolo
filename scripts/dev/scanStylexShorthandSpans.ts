import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, join } from "node:path";

/** Properties which StyleX currently accepts but silently omits from generated CSS.
 *  Logical border shorthands are pinned to the exact four names: borderBlockStartWidth,
 *  borderInlineColor etc. are REAL longhands and must not be flagged. */
export const SILENT_DROP_PROPERTIES = /^(?:background|border|border(?:Top|Right|Bottom|Left|BlockStart|BlockEnd|InlineStart|InlineEnd)|animation)$/;
/** Deliberately documented so this scanner does not become a generic CSS shorthand linter. */
export const VERIFIED_SURVIVING_PROPERTIES = new Set([
  "backgroundColor", "backgroundImage", "margin", "padding", "font", "transition",
]);

export type ShorthandHit = { property: string; line: number; span: string };
function lineOf(text: string, offset: number) { return text.slice(0, offset).split("\n").length; }

// Balance delimiters while ignoring strings/comments. This catches object literals,
// nested media queries, and values returned by dynamic style functions without a TS AST.
export function scanStylexShorthandSpans(text: string): ShorthandHit[] {
  const hits: ShorthandHit[] = [];
  let i = 0, quote = "", comment = "";
  while (i < text.length) {
    if (comment === "line") { if (text[i] === "\n") comment = ""; i++; continue; }
    if (comment === "block") { if (text.slice(i, i + 2) === "*/") { comment = ""; i += 2; } else i++; continue; }
    if (quote) { if (text[i] === "\\") i += 2; else if (text[i] === quote) { quote = ""; i++; } else i++; continue; }
    if (text.slice(i, i + 2) === "//") { comment = "line"; i += 2; continue; }
    if (text.slice(i, i + 2) === "/*") { comment = "block"; i += 2; continue; }
    if (text[i] === '"' || text[i] === "'" || text[i] === "`") { quote = text[i]; i++; continue; }
    const m = text.slice(i).match(/^([A-Za-z][A-Za-z0-9]*)\s*:/);
    if (m && SILENT_DROP_PROPERTIES.test(m[1])) {
      const start = i, valueStart = i + m[0].length;
      let j = valueStart, q = "", depth = 0;
      for (; j < text.length; j++) {
        const c = text[j];
        if (q) { if (c === "\\") j++; else if (c === q) q = ""; continue; }
        if (c === '"' || c === "'" || c === "`") { q = c; continue; }
        if ("({[".includes(c)) depth++;
        else if (")} ]".replace(/ /g, "").includes(c)) { if (!depth) break; depth--; }
        else if (c === "," && !depth) break;
      }
      hits.push({ property: m[1], line: lineOf(text, start), span: text.slice(start, j).trim() });
      i = j; continue;
    }
    i++;
  }
  return hits;
}

export function discoverStylexFiles(root: string): string[] {
  const files = execFileSync("git", ["ls-files", "packages"], { cwd: root, encoding: "utf8" })
    .split("\n").filter(Boolean);
  return files.filter((file) => /(?:Styles\.ts|\.stylex\.ts)$/.test(file) ||
    /\.(?:ts|tsx)$/.test(file) && /stylex\.(?:create|keyframes|defineVars|createTheme)\s*\(/.test(readFileSync(join(root, file), "utf8")));
}

if (import.meta.main) {
  const root = process.cwd();
  const rows = discoverStylexFiles(root).map((file) => {
    const hits = scanStylexShorthandSpans(readFileSync(join(root, file), "utf8"));
    return `${file} (${hits.length})\n${hits.map((h) => `  ${basename(file)}:${h.line} ${h.span.replace(/\\s+/g, " ")}`).join("\n")}`;
  });
  const report = rows.join("\n\n") + "\n";
  const out = "/tmp/stylex-shorthand-baseline.txt";
  writeFileSync(out, report);
  console.log(report); console.log(`Wrote ${out}`);
}
