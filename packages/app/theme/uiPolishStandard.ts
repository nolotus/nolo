// 真值：docs/design/ui-polish-standard.md
// 源码级尺度检查：字号 / 字重 / 圆角 / 间距是否落在标准尺度上。
// CLI：bun packages/app/theme/uiPolishStandard.ts <file.css...>

const ALLOWED_WEIGHTS = new Set(["400", "500", "600", "700", "inherit", "normal", "bold"]);
const FONT_SIZE_OK = /^\s*(var\(--(type|fontSize)-[\w-]+[^)]*\)|inherit|1em|100%)\s*(!important)?\s*$/;
const RADIUS_PART_OK = /^(0|999px|9999px|50%|inherit|var\(--radius-[\w-]+\)|calc\(.*\))$/;
const SPACING_PROP = /(?:^|[\s;{])(padding|margin|gap|row-gap|column-gap|inset|top|left|right|bottom)(-[a-z]+)?\s*:/;

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

export function findUiScaleViolations(source: string): string[] {
  const out: string[] = [];
  stripComments(source)
    .split("\n")
    .forEach((line, i) => {
      const at = `L${i + 1}: ${line.trim()}`;
      const fs = line.match(/font-size:\s*([^;]+);?/);
      if (fs && !FONT_SIZE_OK.test(fs[1])) out.push(`font-size ${at}`);

      const fw = line.match(/font-weight:\s*([\w-]+)/);
      if (fw && !ALLOWED_WEIGHTS.has(fw[1]) && !fw[1].startsWith("var")) out.push(`font-weight ${at}`);

      const br = line.match(/border-radius:\s*([^;]+);?/);
      if (br && !br[1].replace(/!important/, "").trim().split(/\s+/).every((v) => RADIUS_PART_OK.test(v))) {
        out.push(`border-radius ${at}`);
      }

      if (SPACING_PROP.test(line)) {
        for (const m of line.matchAll(/(?:^|[\s:(,])(-?\d+(?:\.\d+)?)px/g)) {
          const n = Math.abs(Number(m[1]));
          if (n > 2 && n % 4 !== 0) out.push(`spacing ${n}px ${at}`);
        }
      }
    });
  return out;
}

if (import.meta.main) {
  const { readFileSync } = await import("node:fs");
  let total = 0;
  for (const f of process.argv.slice(2)) {
    const v = findUiScaleViolations(readFileSync(f, "utf8"));
    total += v.length;
    console.log(`${String(v.length).padStart(4)}  ${f}`);
    if (process.env.VERBOSE) v.forEach((x) => console.log("      " + x));
  }
  console.log(`total ${total}`);
}
