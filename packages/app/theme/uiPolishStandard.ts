// 真值：docs/design/ui-polish-standard.md
// 源码级尺度检查：字号 / 字重 / 圆角 / 间距是否落在标准尺度上。
// 同时支持连字符 CSS（font-size: …）与 TSX / StyleX 驼峰（fontSize: …）；
// 值可以是引号字符串、var(…)（含 fallback 逗号）或 React 无单位数字。
// CLI：bun packages/app/theme/uiPolishStandard.ts <file.css...>

const ALLOWED_WEIGHTS = new Set(["400", "500", "600", "700", "inherit", "normal", "bold"]);
const FONT_SIZE_OK = /^\s*(var\(--(type|fontSize)-[\w-]+[^)]*\)|inherit|1em|100%)\s*(!important)?\s*$/;
const RADIUS_PART_OK = /^(0|999px|9999px|50%|inherit|var\(--radius-[\w-]+\)|calc\(.*\))$/;
const SPACING_NAMES =
  "padding|margin|gap|rowGap|columnGap|row-gap|column-gap|inset|top|left|right|bottom";

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

// 属性值：引号字符串 / var(…)（可含 fallback 逗号）/ 数字（可带单位）/ 其它。
const VALUE_PAT =
  '("(?:[^"]*)"|\'(?:[^\']*)\'|var\\([^)]*\\)|-?\\d+(?:\\.\\d+)?(?:px|rem|em|%)?|[^,;}]+)';

/** 取某一属性（连字符或驼峰）的值，去掉引号与首尾空白。 */
function readProp(line: string, names: string[]): string | null {
  for (const name of names) {
    const m = line.match(
      new RegExp(`(?:^|[\\s;{,(])${name}:\\s*(${VALUE_PAT})`, "i"),
    );
    if (m) return m[1].trim().replace(/^["']|["']$/g, "").trim();
  }
  return null;
}

export function findUiScaleViolations(source: string): string[] {
  const out: string[] = [];
  const spacingRe = new RegExp(
    `(?:^|[\\s;{,(])(${SPACING_NAMES})([A-Z][a-zA-Z]*)?\\s*:\\s*(${VALUE_PAT})`,
    "gi",
  );
  stripComments(source)
    .split("\n")
    .forEach((line, i) => {
      const at = `L${i + 1}: ${line.trim()}`;

      const fs = readProp(line, ["font-size", "fontSize"]);
      if (fs !== null && !FONT_SIZE_OK.test(fs)) out.push(`font-size ${at}`);

      const fw = readProp(line, ["font-weight", "fontWeight"]);
      if (fw !== null && !ALLOWED_WEIGHTS.has(fw) && !fw.startsWith("var")) {
        out.push(`font-weight ${at}`);
      }

      const br = readProp(line, ["border-radius", "borderRadius"]);
      if (
        br !== null &&
        !br
          .replace(/!important/, "")
          .trim()
          .split(/\s+/)
          .every((v) => RADIUS_PART_OK.test(v))
      ) {
        out.push(`border-radius ${at}`);
      }

      for (const m of line.matchAll(spacingRe)) {
        const raw = m[3].trim().replace(/^["']|["']$/g, "").trim();
        // var(…) 是 token 引用，token 名里的数字（如 --space-3）不是间距值。
        const value = raw.replace(/var\([^)]*\)/g, "");
        for (const n of value.matchAll(/(-?\d+(?:\.\d+)?)px\b/g)) {
          const num = Math.abs(Number(n[1]));
          if (num > 2 && num % 4 !== 0) out.push(`spacing ${n[1]}px ${at}`);
        }
        // React 内联样式的无单位数字按 px 处理；排除百分比与带单位值。
        for (const n of value.matchAll(/(-?\d+(?:\.\d+)?)(?![\w%.])/g)) {
          const num = Math.abs(Number(n[1]));
          if (num > 2 && num % 4 !== 0) out.push(`spacing ${n[1]} ${at}`);
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
