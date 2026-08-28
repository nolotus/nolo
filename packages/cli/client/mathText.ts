/**
 * Lightweight LaTeX math transpilier for terminal / TUI display.
 * No heavy external renderers (KaTeX/MathJax) — pure Unicode transcription.
 */

import { visibleWidth } from "../tui/tuiAnsi";

let mathRenderingEnabled = true;

export function isMathRenderingEnabled(): boolean {
  return mathRenderingEnabled;
}

export function setMathRenderingEnabled(enabled: boolean): void {
  mathRenderingEnabled = enabled;
}

// ─── Unicode Mapping Dictionaries ──────────────────────────────────────────

const GREEK_LETTERS: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  omicron: "ο",
  pi: "π",
  varpi: "π",
  rho: "ρ",
  varrho: "ρ",
  sigma: "σ",
  varsigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Upsilon: "Υ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
};

const OPERATORS_AND_SYMBOLS: Record<string, string> = {
  // Operators
  times: "×",
  div: "÷",
  pm: "±",
  mp: "∓",
  cdot: "·",
  bullet: "·",
  circ: "∘",
  ast: "*",
  star: "★",
  // Relations
  leq: "≤",
  le: "≤",
  geq: "≥",
  ge: "≥",
  neq: "≠",
  ne: "≠",
  approx: "≈",
  equiv: "≡",
  sim: "∼",
  simeq: "≃",
  cong: "≅",
  propto: "∝",
  ll: "≪",
  gg: "≫",
  // Arrows
  to: "→",
  rightarrow: "→",
  longrightarrow: "→",
  gets: "←",
  leftarrow: "←",
  longleftarrow: "←",
  Rightarrow: "⇒",
  implies: "⇒",
  Longrightarrow: "⇒",
  Leftarrow: "⇐",
  Longleftarrow: "⇐",
  Leftrightarrow: "⇔",
  iff: "⇔",
  Longleftrightarrow: "⇔",
  leftrightarrow: "↔",
  uparrow: "↑",
  downarrow: "↓",
  mapsto: "↦",
  // Sets & Logic
  in: "∈",
  notin: "∉",
  ni: "∋",
  owns: "∋",
  subset: "⊂",
  supset: "⊃",
  subseteq: "⊆",
  supseteq: "⊇",
  cap: "∩",
  cup: "∪",
  setminus: "\\",
  emptyset: "∅",
  varnothing: "∅",
  forall: "∀",
  exists: "∃",
  nexists: "∄",
  land: "∧",
  wedge: "∧",
  lor: "∨",
  vee: "∨",
  neg: "¬",
  lnot: "¬",
  top: "⊤",
  bot: "⊥",
  // Calculus & Special
  infty: "∞",
  inf: "∞",
  partial: "∂",
  nabla: "∇",
  angle: "∠",
  perp: "⊥",
  degree: "°",
  prime: "′",
  hbar: "ħ",
  ell: "ℓ",
  Re: "ℜ",
  Im: "ℑ",
  aleph: "ℵ",
  // Punctuation dots
  dots: "…",
  ldots: "…",
  cdots: "…",
  vdots: "⋮",
  ddots: "⋱",
  // Large operators
  sum: "∑",
  prod: "∏",
  coprod: "∐",
  int: "∫",
  iint: "∬",
  iiint: "∭",
  oint: "∮",
};

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",
  f: "ᶠ",
  g: "ᵍ",
  h: "ʰ",
  i: "ⁱ",
  j: "ʲ",
  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  n: "ⁿ",
  o: "ᵒ",
  p: "ᵖ",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",
  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",
  z: "ᶻ",
  A: "ᴬ",
  B: "ᴮ",
  D: "ᴰ",
  E: "ᴱ",
  G: "ᴳ",
  H: "ᴴ",
  I: "ᴵ",
  J: "ᴶ",
  K: "ᴷ",
  L: "ᴸ",
  M: "ᴹ",
  N: "ᴺ",
  O: "ᴼ",
  P: "ᴾ",
  R: "ᴿ",
  T: "ᵀ",
  U: "ᵁ",
  V: "ⱽ",
  W: "ᵂ",
};

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
};

// ─── Complex LaTeX Structures (Fallback as-is) ─────────────────────────────

export function hasUnsupportedLatex(latex: string): boolean {
  if (/\\(newcommand|renewcommand|def|let)\b/.test(latex)) {
    return true;
  }
  if (/\\begin\s*\{/.test(latex)) {
    return true;
  }
  return false;
}

// ─── LaTeX Transpiler Helpers ──────────────────────────────────────────────

/** Helper to extract matching balanced braces { ... } */
function extractBalancedBraces(text: string, startIndex: number): { content: string; endIndex: number } | null {
  if (text[startIndex] !== "{") return null;
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === "{") {
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        return { content: text.slice(startIndex + 1, i), endIndex: i };
      }
    }
  }
  return null;
}

/** Helper to extract balanced square brackets [ ... ] */
function extractBalancedBrackets(text: string, startIndex: number): { content: string; endIndex: number } | null {
  if (text[startIndex] !== "[") return null;
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === "[") {
      depth++;
    } else if (text[i] === "]") {
      depth--;
      if (depth === 0) {
        return { content: text.slice(startIndex + 1, i), endIndex: i };
      }
    }
  }
  return null;
}

function toSuperscriptString(raw: string): string | null {
  let res = "";
  for (const char of raw) {
    const s = SUPERSCRIPTS[char];
    if (!s) return null;
    res += s;
  }
  return res;
}

function toSubscriptString(raw: string): string | null {
  let res = "";
  for (const char of raw) {
    const s = SUBSCRIPTS[char];
    if (!s) return null;
    res += s;
  }
  return res;
}

/**
 * Transpiles a LaTeX math string into a Unicode representation.
 */
export function transpileLatexToUnicode(latex: string): string {
  if (!mathRenderingEnabled) return latex;

  const trimmed = latex.trim();
  if (!trimmed) return "";

  // If unsupported environment is present, keep raw LaTeX unchanged.
  if (hasUnsupportedLatex(trimmed)) {
    return trimmed;
  }

  let s = trimmed;

  // 1. Strip \left and \right modifiers
  s = s.replace(/\\left\s*\\\{/g, "{")
       .replace(/\\right\s*\\\}/g, "}")
       .replace(/\\left\s*([(\[|.])?/g, (_, p) => (p === "." ? "" : p ?? ""))
       .replace(/\\right\s*([)\]|.])?/g, (_, p) => (p === "." ? "" : p ?? ""));

  // 2. Text / operator macros: \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}, \operatorname{...}
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname|mathtt|mathsf)\s*\{([^}]*)\}/g, "$1");

  // 3. Spacing macros
  s = s.replace(/\\qquad/g, "    ")
       .replace(/\\quad/g, "  ")
       .replace(/\\[,;:!]/g, " ")
       .replace(/\\ /g, " ");

  // 4. Fractions: \frac{a}{b} -> (a)/(b) or a/b
  // We iteratively replace from innermost fractions
  while (s.includes("\\frac")) {
    const idx = s.indexOf("\\frac");
    let afterFrac = idx + 5;
    while (afterFrac < s.length && /\s/.test(s[afterFrac] ?? "")) afterFrac++;
    const numMatch = extractBalancedBraces(s, afterFrac);
    if (!numMatch) break;
    let afterNum = numMatch.endIndex + 1;
    while (afterNum < s.length && /\s/.test(s[afterNum] ?? "")) afterNum++;
    const denMatch = extractBalancedBraces(s, afterNum);
    if (!denMatch) break;

    const numTranspiled = transpileLatexToUnicode(numMatch.content);
    const denTranspiled = transpileLatexToUnicode(denMatch.content);

    // If simple atomic (single letter / number / symbol with no operators), don't wrap in parens
    const isAtomic = (t: string) => /^[a-zA-Z0-9α-ωΑ-Ω∞π\\]+$/.test(t.trim());
    const numOut = isAtomic(numTranspiled) ? numTranspiled.trim() : `(${numTranspiled.trim()})`;
    const denOut = isAtomic(denTranspiled) ? denTranspiled.trim() : `(${denTranspiled.trim()})`;

    const fracReplacement = `${numOut}/${denOut}`;
    s = s.slice(0, idx) + fracReplacement + s.slice(denMatch.endIndex + 1);
  }

  // 5. Square roots: \sqrt[n]{x} or \sqrt{x}
  while (s.includes("\\sqrt")) {
    const idx = s.indexOf("\\sqrt");
    let afterSqrt = idx + 5;
    while (afterSqrt < s.length && /\s/.test(s[afterSqrt] ?? "")) afterSqrt++;

    let rootDegree: string | null = null;
    if (s[afterSqrt] === "[") {
      const bracketMatch = extractBalancedBrackets(s, afterSqrt);
      if (bracketMatch) {
        rootDegree = transpileLatexToUnicode(bracketMatch.content);
        afterSqrt = bracketMatch.endIndex + 1;
        while (afterSqrt < s.length && /\s/.test(s[afterSqrt] ?? "")) afterSqrt++;
      }
    }

    const radMatch = extractBalancedBraces(s, afterSqrt);
    if (!radMatch) break;

    const radContent = transpileLatexToUnicode(radMatch.content).trim();
    let rootSym = "√";
    if (rootDegree === "3") {
      rootSym = "∛";
    } else if (rootDegree === "4") {
      rootSym = "∜";
    } else if (rootDegree) {
      const supDeg = toSuperscriptString(rootDegree);
      rootSym = supDeg ? `${supDeg}√` : `^(${rootDegree})√`;
    }

    const sqrtReplacement = `${rootSym}(${radContent})`;
    s = s.slice(0, idx) + sqrtReplacement + s.slice(radMatch.endIndex + 1);
  }

  // 6. Greek letters and symbols
  // Replace symbols like \alpha, \times, \leq, \sum, etc.
  s = s.replace(/\\([a-zA-Z]+)/g, (fullMatch, name: string) => {
    if (GREEK_LETTERS[name]) return GREEK_LETTERS[name];
    if (OPERATORS_AND_SYMBOLS[name]) return OPERATORS_AND_SYMBOLS[name];
    return fullMatch;
  });

  // 7. Superscripts and Subscripts
  // Handle ^{...} or ^x and _{...} or _x
  // We scan for ^ and _ and convert to Unicode superscripts / subscripts
  // We repeat until all ^ and _ are processed
  s = processSubSuperscripts(s);

  // 8. Escaped characters: \{ \} \_ \% \$ \&
  s = s.replace(/\\([{}%$_&])/g, "$1");

  // Clean up extra whitespace
  s = s.replace(/\s{2,}/g, " ").trim();

  return s;
}

function processSubSuperscripts(text: string): string {
  let result = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "^" || text[i] === "_") {
      const isSuper = text[i] === "^";
      i++;
      let rawInner = "";
      if (i < text.length && text[i] === "{") {
        const braceMatch = extractBalancedBraces(text, i);
        if (braceMatch) {
          rawInner = braceMatch.content;
          i = braceMatch.endIndex + 1;
        } else {
          // Malformed input: preserve the marker and opening brace instead of
          // silently dropping syntax or manufacturing an empty superscript.
          result += `${isSuper ? "^" : "_"}{`;
          i++;
          continue;
        }
      } else if (i < text.length) {
        rawInner = text[i] ?? "";
        i++;
      }

      // Try transpiling inner first (e.g. \alpha or numbers)
      const transpiledInner = transpileLatexToUnicode(rawInner);
      const converted = isSuper
        ? toSuperscriptString(transpiledInner)
        : toSubscriptString(transpiledInner);

      if (converted !== null && converted.length > 0) {
        result += converted;
      } else {
        // Fallback to parentheses format
        const marker = isSuper ? "^" : "_";
        result += `${marker}(${transpiledInner})`;
      }
    } else {
      result += text[i];
      i++;
    }
  }
  return result;
}

// ─── Block Math Rendering (Multi-line fraction & Centering) ────────────────

export function renderMathBlock(
  latex: string,
  options: { columns?: number; brightness?: string } = {}
): string {
  const trimmed = latex.trim();
  if (!mathRenderingEnabled) {
    return `\x1b[2m${trimmed}\x1b[0m`;
  }

  if (hasUnsupportedLatex(trimmed)) {
    return `\x1b[2m${trimmed}\x1b[0m`;
  }

  const columns = options.columns && options.columns > 10 ? options.columns : 80;

  // Check if it's a standalone long fraction \frac{num}{den}
  const fracMatch = trimmed.match(/^\\frac\s*\{([\s\S]+)\}\s*\{([\s\S]+)\}$/);
  if (fracMatch) {
    const num = transpileLatexToUnicode(fracMatch[1] ?? "");
    const den = transpileLatexToUnicode(fracMatch[2] ?? "");
    // If long or complex, render 3-line fraction
    if (num.length > 8 || den.length > 8 || num.includes("+") || den.includes("+") || num.includes("-") || den.includes("-")) {
      const width = Math.max(visibleWidth(num), visibleWidth(den)) + 2;
      const bar = "─".repeat(width);
      const padNum = " ".repeat(Math.max(0, Math.floor((width - visibleWidth(num)) / 2)));
      const padDen = " ".repeat(Math.max(0, Math.floor((width - visibleWidth(den)) / 2)));

      const l1 = padNum + num;
      const l2 = bar;
      const l3 = padDen + den;

      const centerIndent = Math.max(0, Math.floor((columns - width) / 2));
      const indent = " ".repeat(centerIndent);

      return `\x1b[2m${indent}${l1}\n${indent}${l2}\n${indent}${l3}\x1b[0m`;
    }
  }

  const transpiled = transpileLatexToUnicode(trimmed);
  const lines = transpiled.split("\n");
  const maxLineW = Math.max(...lines.map((l) => visibleWidth(l)));
  const centerIndent = Math.max(0, Math.floor((columns - maxLineW) / 2));
  const indent = " ".repeat(centerIndent);

  const centeredLines = lines.map((line) => `${indent}${line}`);
  return `\x1b[2m${centeredLines.join("\n")}\x1b[0m`;
}

// ─── Inline Math Detection & Masking ───────────────────────────────────────

/**
 * Checks if a matched `$inner$` is likely currency or natural language rather than math.
 */
function isCurrencyOrNonMath(
  leadingChar: string,
  inner: string,
  trailingChar: string
): boolean {
  // Empty or starts/ends with whitespace
  if (!inner || /^\s/.test(inner) || /\s$/.test(inner)) return true;

  // $ leading character was alphanumeric with no whitespace before it (e.g. var$foo$bar)
  if (/[a-zA-Z0-9]/.test(leadingChar)) return true;

  if (/^(?:\d[\d,]*(?:\.\d+)?|\.\d+)$/.test(inner)) return true;

  if (/^\d/.test(inner)) {
    if (/\d/.test(trailingChar)) return true;

    // Contains Chinese text or natural language conjunctions (to, and, or, between, etc.)
    if (/[\u4e00-\u9fa5]/.test(inner)) return true;
    if (/\b(to|and|or|for|is|between|with|at|from|dollars?|cents?|usd|cny|rmb|eur|gbp)\b/i.test(inner)) return true;

    // If inner contains commas and digits with spaces like "100, 200"
    if (/,\s*\d/.test(inner)) return true;

    // If inner contains multiple words with spaces but no math operators
    if (/\s+/.test(inner) && !/[=+\-*/\\^_<>]/.test(inner)) return true;
  }

  return false;
}

export type MathSpanMask = {
  maskedText: string;
  restore: (styled: string) => string;
};

/**
 * Masks math spans ($...$, \(...\), $$...$$, \[...\]) in a text line so that inline
 * Markdown styling (like *italic*, `code`, **bold**) does not corrupt math syntax.
 */
export function maskMathInLine(
  line: string,
  brightness?: string
): MathSpanMask {
  const replacements: string[] = [];
  let out = "";
  let i = 0;

  while (i < line.length) {
    // 1. Escaped delimiter check or \(...\)
    if (line[i] === "\\") {
      if (line.startsWith("\\(", i)) {
        const closeIdx = line.indexOf("\\)", i + 2);
        if (closeIdx !== -1) {
          const inner = line.slice(i + 2, closeIdx);
          const id = replacements.length;
          const transpiled = transpileLatexToUnicode(inner);
          replacements.push(transpiled);
          out += `\x00M${id}\x00`;
          i = closeIdx + 2;
          continue;
        }
      }
      if (line.startsWith("\\[", i)) {
        const closeIdx = line.indexOf("\\]", i + 2);
        if (closeIdx !== -1) {
          const inner = line.slice(i + 2, closeIdx);
          const id = replacements.length;
          const transpiled = transpileLatexToUnicode(inner);
          replacements.push(transpiled);
          out += `\x00M${id}\x00`;
          i = closeIdx + 2;
          continue;
        }
      }
      // General escaped char (e.g. \$, \`, \*)
      out += line[i];
      if (i + 1 < line.length) {
        out += line[i + 1];
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }

    // 2. Code span `...` (preempts math if encountered first)
    if (line[i] === "`") {
      // Find matching closing backtick
      let runLen = 1;
      while (i + runLen < line.length && line[i + runLen] === "`") {
        runLen++;
      }
      const fence = "`".repeat(runLen);
      const closeIdx = line.indexOf(fence, i + runLen);
      if (closeIdx !== -1) {
        // Complete code span: emit verbatim so $ inside code span is never touched
        const span = line.slice(i, closeIdx + runLen);
        out += span;
        i = closeIdx + runLen;
        continue;
      }
    }

    // 3. Math span $...$ or $$...$$
    if (line[i] === "$") {
      // Check for $$
      if (line.startsWith("$$", i)) {
        const closeIdx = line.indexOf("$$", i + 2);
        if (closeIdx !== -1) {
          const inner = line.slice(i + 2, closeIdx);
          const id = replacements.length;
          const transpiled = transpileLatexToUnicode(inner);
          replacements.push(transpiled);
          out += `\x00M${id}\x00`;
          i = closeIdx + 2;
          continue;
        }
      }

      // Single $
      const nextChar = line[i + 1] ?? "";
      if (nextChar && !/\s/.test(nextChar) && nextChar !== "$") {
        let closeIdx = -1;
        for (let j = i + 1; j < line.length; j++) {
          if (line[j] === "$" && line[j - 1] !== "\\") {
            if (!/\s/.test(line[j - 1] ?? "")) {
              closeIdx = j;
              break;
            }
          }
        }

        if (closeIdx !== -1) {
          const inner = line.slice(i + 1, closeIdx);
          const leadingChar = i > 0 ? (line[i - 1] ?? "") : "";
          const trailingChar = closeIdx + 1 < line.length ? (line[closeIdx + 1] ?? "") : "";

          if (!isCurrencyOrNonMath(leadingChar, inner, trailingChar)) {
            const id = replacements.length;
            const transpiled = transpileLatexToUnicode(inner);
            replacements.push(transpiled);
            out += `\x00M${id}\x00`;
            i = closeIdx + 1;
            continue;
          }
        }
      }
    }

    out += line[i];
    i++;
  }

  return {
    maskedText: out,
    restore: (styled: string) => {
      return styled.replace(/\x00M(\d+)\x00/g, (_, id) => replacements[Number(id)] ?? "");
    },
  };
}
