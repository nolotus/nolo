import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { execFileSync } from "node:child_process";

const files = [
  "messagesStyles.ts", "messageActionsStyles.ts", "messageLayoutStyles.ts",
  "appDeployCardStyles.ts", "prepareAgentDraftToolCardStyles.ts",
  "createAgentToolCardStyles.ts", "fileItemStyles.ts", "todoCardStyles.ts",
  "messageToolConfirmBarStyles.ts",
].map((name) => `packages/chat/messages/web/${name}`);

// Find property spans by balancing (), [], and {} while ignoring strings/comments.
// This deliberately does not parse TypeScript: a property value may be multiline,
// an object variant, a token identifier, 0, or contain nested @media objects.
const shorthand = /^(?:background|border|border(?:Top|Right|Bottom|Left|Block|Inline)(?:Start|End)?)$/;
function lineOf(text: string, offset: number) { return text.slice(0, offset).split("\n").length; }
function scan(text: string) {
  const hits: { property: string; line: number; span: string }[] = [];
  let i = 0, quote = "", comment = "";
  while (i < text.length) {
    if (comment === "line") { if (text[i] === "\n") comment = ""; i++; continue; }
    if (comment === "block") { if (text.slice(i, i + 2) === "*/") { comment = ""; i += 2; } else i++; continue; }
    if (quote) { if (text[i] === "\\") i += 2; else if (text[i] === quote) { quote = ""; i++; } else i++; continue; }
    if (text.slice(i, i + 2) === "//") { comment = "line"; i += 2; continue; }
    if (text.slice(i, i + 2) === "/*") { comment = "block"; i += 2; continue; }
    if (text[i] === '"' || text[i] === "'" || text[i] === "`") { quote = text[i]; i++; continue; }
    if ("({[".includes(text[i])) { i++; continue; }
    if (")}]".includes(text[i])) { i++; continue; }
    const m = text.slice(i).match(/^([A-Za-z][A-Za-z0-9]*)\s*:/);
    if (m && shorthand.test(m[1])) {
      const start = i, valueStart = i + m[0].length;
      let j = valueStart, q = "", depth = 0;
      for (; j < text.length; j++) {
        const c = text[j];
        if (q) { if (c === "\\") j++; else if (c === q) q = ""; continue; }
        if (c === '"' || c === "'" || c === "`") { q = c; continue; }
        if ("({[".includes(c)) depth++;
        else if (")}]".includes(c)) { if (depth === 0) break; depth--; }
        else if (c === "," && depth === 0) break;
      }
      hits.push({ property: m[1], line: lineOf(text, start), span: text.slice(start, j).trim() });
      i = j; continue;
    }
    i++;
  }
  return hits;
}
const report = files.map((file) => {
  const source = process.argv.includes("--git")
    ? execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" })
    : readFileSync(file, "utf8");
  const hits = scan(source);
  return `${basename(file)} (${hits.length})\n${hits.map((h) => `  ${basename(file)}:${h.line} ${h.span.replace(/\s+/g, " ")}`).join("\n")}`;
}).join("\n\n") + "\n";
const out = "docs/plans/2026-08-31-chat-messages-stylex-shorthand-baseline.txt";
writeFileSync(out, report);
console.log(report);
console.log(`Wrote ${out}`);
