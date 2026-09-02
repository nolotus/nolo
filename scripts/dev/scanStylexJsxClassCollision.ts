import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

export type Collision = { file: string; line: number; element: string; reason: string };
const safeMerge = /\.\.\.\s*(?:withLiteralClass|[A-Za-z_$][\w$]*\.withLiteralClass)\s*\(/;
const stylexSpread = /\.\.\.\s*stylex\.(?:props|attrs)\s*\(/;

function lineOf(s: string, n: number) { return s.slice(0, n).split("\n").length; }
/** Source parser intentionally handles JSX strings and balanced braces, without depending on a parser version. */
export function scanJsxClassCollisions(source: string, file = "fixture.tsx"): Collision[] {
  const out: Collision[] = [];
  const opening = /<([A-Za-z][\w.]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = opening.exec(source))) {
    let i = match.index + match[0].length, depth = 0, quote = "", end = -1;
    for (; i < source.length; i++) {
      const c = source[i];
      if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      if (c === "{") depth++; else if (c === "}") depth--;
      else if (c === ">" && depth === 0) { end = i; break; }
    }
    if (end < 0) continue;
    const attrs = source.slice(match.index, end + 1);
    const classAt = /\bclassName\s*=/.test(attrs);
    if (!classAt) continue;
    const classPos = attrs.search(/\bclassName\s*=/);
    const after = attrs.slice(classPos);
    const spread = after.match(/\{\.\.\.([\s\S]*?)\}/g) ?? [];
    for (const token of spread) {
      if (stylexSpread.test(token) || (!safeMerge.test(token) && !/^\{\.\.\.\s*(?:props|rest|extra)\b/.test(token))) {
        out.push({ file, line: lineOf(source, match.index), element: match[1], reason: token.includes("stylex.") ? "stylex spread follows className" : "possibly className-producing spread follows className" });
      }
    }
  }
  return out;
}

export function discoverTsxFiles(root: string): string[] {
  return execFileSync("git", ["ls-files", "packages"], { cwd: root, encoding: "utf8" }).split("\n")
    .filter((f) => f.endsWith(".tsx"));
}

if (import.meta.main) {
  const root = process.cwd();
  const collisions = discoverTsxFiles(root).flatMap((file) => scanJsxClassCollisions(readFileSync(join(root, file), "utf8"), file));
  if (collisions.length) { console.error(collisions.map((c) => `${c.file}:${c.line} <${c.element}> ${c.reason}`).join("\n")); process.exitCode = 1; }
  else console.log("StyleX JSX class collision scan: clean");
}
