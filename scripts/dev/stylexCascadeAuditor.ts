import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { globSync } from "glob";
import * as babelParser from "@babel/parser";
import postcss from "postcss";

export interface ElementIndexItem {
  file: string;
  line: number;
  tagName: string;
  classes: string[];
  hooks: string[];
  hasStylex: boolean;
  stylexCalls: string[];
}

export type StylexPropertyIndex = Map<string, Map<string, Map<string, Set<string>>>>;

export function buildStylexPropertyIndex(root: string): StylexPropertyIndex {
  const files = globSync("packages/**/*.{ts,tsx}", { cwd: root, absolute: true });
  const rawFileStyles = new Map<string, Map<string, Map<string, Set<string>>>>();

  for (const file of files) {
    const code = readFileSync(file, "utf8");
    if (!code.includes("stylex.create") && !code.includes("create(")) continue;
    try {
      const ast = babelParser.parse(code, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });

      const varMap = new Map<string, Map<string, Set<string>>>();

      function walk(node: any) {
        if (!node || typeof node !== "object") return;
        if (
          node.type === "VariableDeclarator" &&
          node.id?.type === "Identifier" &&
          node.init?.type === "CallExpression"
        ) {
          const varName = node.id.name;
          const callee = node.init.callee;
          const isCreate =
            (callee.type === "MemberExpression" &&
              callee.object?.name === "stylex" &&
              callee.property?.name === "create") ||
            (callee.type === "Identifier" && callee.name === "create");

          if (isCreate && node.init.arguments[0]?.type === "ObjectExpression") {
            const keyMap = new Map<string, Set<string>>();
            for (const prop of node.init.arguments[0].properties) {
              if (prop.type === "ObjectProperty" && prop.key) {
                const styleKey = prop.key.name || prop.key.value;
                const cssProps = new Set<string>();
                if (prop.value?.type === "ObjectExpression") {
                  for (const inner of prop.value.properties) {
                    if (inner.type === "ObjectProperty" && inner.key) {
                      const name = inner.key.name || inner.key.value;
                      if (typeof name === "string") {
                        const kebab = name.replace(/([A-Z])/g, "-$1").toLowerCase();
                        cssProps.add(kebab);
                        if (kebab === "background" || kebab === "background-color") {
                          cssProps.add("background");
                          cssProps.add("background-color");
                        }
                        if (kebab.startsWith("border")) {
                          cssProps.add("border");
                          cssProps.add("border-color");
                          cssProps.add("border-width");
                          cssProps.add("border-style");
                          cssProps.add("border-top");
                          cssProps.add("border-bottom");
                          cssProps.add("border-left");
                          cssProps.add("border-right");
                        }
                        if (kebab === "padding") {
                          cssProps.add("padding");
                          cssProps.add("padding-left");
                          cssProps.add("padding-right");
                          cssProps.add("padding-top");
                          cssProps.add("padding-bottom");
                        }
                      }
                    }
                  }
                }
                keyMap.set(styleKey, cssProps);
              }
            }
            varMap.set(varName, keyMap);
          }
        }

        for (const key of Object.keys(node)) {
          if (key === "parent") continue;
          const child = node[key];
          if (Array.isArray(child)) {
            for (const c of child) walk(c);
          } else if (child && typeof child === "object") {
            walk(child);
          }
        }
      }

      walk(ast);
      if (varMap.size > 0) rawFileStyles.set(file, varMap);
    } catch {
      // Ignored
    }
  }

  const resolvedIndex: StylexPropertyIndex = new Map();

  for (const file of files) {
    if (!file.endsWith(".tsx")) continue;
    const code = readFileSync(file, "utf8");
    try {
      const ast = babelParser.parse(code, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });

      const combinedVarMap = new Map<string, Map<string, Set<string>>>();
      const local = rawFileStyles.get(file);
      if (local) {
        for (const [k, v] of local) combinedVarMap.set(k, v);
      }

      function walkImport(node: any) {
        if (!node || typeof node !== "object") return;
        if (node.type === "ImportDeclaration" && node.source?.value) {
          const importPath = node.source.value;
          const candidatePaths = [
            resolve(dirname(file), importPath + ".ts"),
            resolve(dirname(file), importPath + ".tsx"),
            resolve(dirname(file), importPath, "index.ts"),
            resolve(dirname(file), importPath, "index.tsx"),
          ];
          for (const cp of candidatePaths) {
            if (rawFileStyles.has(cp)) {
              const importedStyles = rawFileStyles.get(cp)!;
              for (const spec of node.specifiers || []) {
                if (spec.type === "ImportSpecifier" || spec.type === "ImportDefaultSpecifier") {
                  const localName = spec.local.name;
                  const importedName = spec.imported ? spec.imported.name : localName;
                  if (importedStyles.has(importedName)) {
                    combinedVarMap.set(localName, importedStyles.get(importedName)!);
                  }
                }
              }
            }
          }
        }
        for (const k of Object.keys(node)) {
          if (k === "parent") continue;
          const child = node[k];
          if (Array.isArray(child)) {
            for (const c of child) walkImport(c);
          } else if (child && typeof child === "object") {
            walkImport(child);
          }
        }
      }

      walkImport(ast);
      if (combinedVarMap.size > 0) resolvedIndex.set(file, combinedVarMap);
    } catch {
      // Ignored
    }
  }

  return resolvedIndex;
}

export function buildTsxElementIndex(root: string): ElementIndexItem[] {
  const tsxFiles = globSync("packages/**/*.{tsx,jsx}", { cwd: root, absolute: true });
  const index: ElementIndexItem[] = [];

  for (const file of tsxFiles) {
    const code = readFileSync(file, "utf8");
    if (!code.includes("<")) continue;
    try {
      const ast = babelParser.parse(code, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });

      function extractStringTokens(node: any): string[] {
        if (!node) return [];
        if (node.type === "StringLiteral") {
          return node.value.split(/\s+/).filter(Boolean);
        }
        if (node.type === "JSXExpressionContainer") {
          return extractStringTokens(node.expression);
        }
        if (node.type === "TemplateLiteral") {
          const tokens: string[] = [];
          for (const quasi of node.quasis) {
            tokens.push(...quasi.value.raw.split(/\s+/).filter(Boolean));
          }
          return tokens;
        }
        if (node.type === "BinaryExpression" && node.operator === "+") {
          return [...extractStringTokens(node.left), ...extractStringTokens(node.right)];
        }
        if (node.type === "ConditionalExpression") {
          return [...extractStringTokens(node.consequent), ...extractStringTokens(node.alternate)];
        }
        return [];
      }

      function walk(node: any) {
        if (!node || typeof node !== "object") return;
        if (node.type === "JSXOpeningElement") {
          const classes: string[] = [];
          const hooks: string[] = [];
          const stylexCalls: string[] = [];
          let hasStylex = false;

          const tagName =
            node.name.name ||
            (node.name.property ? `${node.name.object?.name}.${node.name.property.name}` : "");

          for (const attr of node.attributes || []) {
            if (attr.type === "JSXAttribute" && attr.name) {
              const name = attr.name.name;
              if (name === "className" || name === "class") {
                classes.push(...extractStringTokens(attr.value));
              } else if (name === "data-hook" || name === "data-testid") {
                hooks.push(...extractStringTokens(attr.value));
              }
            } else if (attr.type === "JSXSpreadAttribute") {
              const argText = code.slice(attr.argument.start, attr.argument.end);
              if (argText.includes("stylex.props") || argText.includes("stylex.attrs")) {
                hasStylex = true;
                stylexCalls.push(argText);
              }
            }
          }

          if (classes.length > 0 || hooks.length > 0 || hasStylex) {
            index.push({
              file,
              line: node.loc?.start?.line ?? 0,
              tagName,
              classes,
              hooks,
              hasStylex,
              stylexCalls,
            });
          }
        }

        for (const key of Object.keys(node)) {
          if (key === "parent") continue;
          const child = node[key];
          if (Array.isArray(child)) {
            for (const c of child) walk(c);
          } else if (child && typeof child === "object") {
            walk(child);
          }
        }
      }

      walk(ast);
    } catch {
      // Ignored
    }
  }

  return index;
}

export function extractRightmostTarget(selector: string): {
  rightmost: string;
  host: string;
  pseudoElement: string | null;
  classes: string[];
  hooks: string[];
  parts: string[];
} {
  const parts = selector.split(",").map((s) => s.trim()).filter(Boolean);
  const cleanSel = parts[0]
    .replace(/:not\(#\\?#\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Split on combinators (space, >, +, ~) that are outside brackets [...] and parentheses (...)
  const tokens: string[] = [];
  let current = "";
  let depthBracket = 0;
  let depthParen = 0;

  for (let i = 0; i < cleanSel.length; i++) {
    const ch = cleanSel[i];
    if (ch === "[") depthBracket++;
    else if (ch === "]") depthBracket--;
    else if (ch === "(") depthParen++;
    else if (ch === ")") depthParen--;

    if (depthBracket === 0 && depthParen === 0) {
      if (ch === " " || ch === ">" || ch === "+" || (ch === "~" && cleanSel[i + 1] !== "=")) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = "";
        }
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) tokens.push(current.trim());

  const rightmost = tokens[tokens.length - 1] || "";
  const pseudoElementMatch = rightmost.match(/::[a-zA-Z0-9_-]+/);
  const pseudoElement = pseudoElementMatch ? pseudoElementMatch[0] : null;
  const host = pseudoElement ? rightmost.replace(pseudoElement, "") : rightmost;

  const classes: string[] = [];
  const classMatches = host.matchAll(/\.([a-zA-Z0-9_-]+)/g);
  for (const m of classMatches) {
    classes.push(m[1]);
  }

  const hooks: string[] = [];
  const hookMatches = host.matchAll(/\[data-(?:hook|testid)[~|^$*]?=["']?([^"']+)["']?\]/g);
  for (const m of hookMatches) {
    hooks.push(m[1]);
  }

  return { rightmost, host, pseudoElement, classes, hooks, parts };
}

export function matchesElement(
  target: { classes: string[]; hooks: string[] },
  element: ElementIndexItem,
): boolean {
  if (target.hooks.length > 0) {
    return target.hooks.every((h) => element.hooks.includes(h));
  }
  if (target.classes.length > 0) {
    const nonModifierClasses = target.classes.filter(
      (c) =>
        ![
          "is-open",
          "open",
          "active",
          "is-active",
          "selected",
          "is-selected",
          "disabled",
          "show",
          "entering",
          "exiting",
          "animating",
          "stop-mode",
        ].includes(c),
    );
    if (nonModifierClasses.length > 0) {
      return nonModifierClasses.every((c) => element.classes.includes(c));
    }
    return target.classes.every((c) => element.classes.includes(c));
  }
  return false;
}

export interface Specificity {
  A: number;
  B: number;
  C: number;
}

export function calculateSpecificity(selector: string): Specificity {
  let A = (selector.match(/:not\(#\\?#\)/g) || []).length;
  let s = selector.replace(/:not\(#\\?#\)/g, "");

  const idMatches = s.match(/#[a-zA-Z0-9_-]+/g) || [];
  A += idMatches.length;

  const pseudoElements = s.match(/::[a-zA-Z0-9_-]+/g) || [];
  let C = pseudoElements.length;
  s = s.replace(/::[a-zA-Z0-9_-]+/g, "");

  const classes = s.match(/\.[a-zA-Z0-9_-]+/g) || [];
  const attrs = s.match(/\[[^\]]+\]/g) || [];
  const pseudoClasses = (s.match(/:[a-zA-Z0-9_-]+(?:\([^)]*\))?/g) || []).filter(
    (p) => !p.startsWith("::"),
  );

  const B = classes.length + attrs.length + pseudoClasses.length;

  const cleanTypes = s
    .replace(/\.[a-zA-Z0-9_-]+/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/:[a-zA-Z0-9_-]+(?:\([^)]*\))?/g, " ")
    .replace(/#[a-zA-Z0-9_-]+/g, " ")
    .replace(/[>+~]/g, " ")
    .trim();

  const typeTokens = cleanTypes
    .split(/\s+/)
    .filter((t) => t && /^[a-zA-Z0-9_-]+$/.test(t) && !/^\d+$/.test(t));
  C += typeTokens.length;

  return { A, B, C };
}

export function compareSpecificity(s1: Specificity, s2: Specificity): number {
  if (s1.A !== s2.A) return s1.A - s2.A;
  if (s1.B !== s2.B) return s1.B - s2.B;
  return s1.C - s2.C;
}

export interface StylexSpecificities {
  globalMax: Specificity;
  standardMax: Specificity;
  standardBaseMax: Specificity;
  pseudoMax: Specificity;
  pseudoMaxMap: Record<string, Specificity>;
  topBranches: string[];
}

export function deriveStylexSpecificities(
  entryCssPath: string,
): StylexSpecificities {
  if (!existsSync(entryCssPath)) {
    throw new Error(
      `StyleX entry CSS not found at "${entryCssPath}". Please run "bun run build" first before auditing cascade specificity.`,
    );
  }
  const content = readFileSync(entryCssPath, "utf8");
  if (!content.trim()) {
    throw new Error(
      `StyleX entry CSS at "${entryCssPath}" is empty. Please run "bun run build" first.`,
    );
  }

  const root = postcss.parse(content);
  let globalMax: Specificity = { A: 0, B: 0, C: 0 };
  let standardMax: Specificity = { A: 0, B: 0, C: 0 };
  let standardBaseMax: Specificity = { A: 0, B: 0, C: 0 };
  let pseudoMax: Specificity = { A: 0, B: 0, C: 0 };
  const pseudoMaxMap: Record<string, Specificity> = {};
  let topBranches: string[] = [];

  root.walkRules((rule) => {
    const branches = rule.selector.split(",").map((s) => s.trim()).filter(Boolean);
    for (const branch of branches) {
      if (/\.x[a-z0-9_]+/i.test(branch)) {
        const spec = calculateSpecificity(branch);
        const cmp = compareSpecificity(spec, globalMax);
        if (cmp > 0) {
          globalMax = spec;
          topBranches = [branch];
        } else if (cmp === 0) {
          topBranches.push(branch);
        }

        const pseudoMatch = branch.match(
          /(?:::|:(?:before|after|placeholder|selection|backdrop|marker|file-selector-button|-webkit-[a-z0-9_-]+|-moz-[a-z0-9_-]+))[a-zA-Z0-9_-]*/i,
        );
        if (pseudoMatch) {
          const pName = pseudoMatch[0].toLowerCase();
          if (compareSpecificity(spec, pseudoMax) > 0) pseudoMax = spec;
          const prev = pseudoMaxMap[pName] || { A: 0, B: 0, C: 0 };
          if (compareSpecificity(spec, prev) > 0) pseudoMaxMap[pName] = spec;
        } else {
          if (compareSpecificity(spec, standardMax) > 0) standardMax = spec;
          // Standard base class (no special attribute selector attached like [data-positioned], [data-pressed])
          if (!/\[[^\]]+\]/i.test(branch)) {
            if (compareSpecificity(spec, standardBaseMax) > 0) standardBaseMax = spec;
          }
        }
      }
    }
  });

  return { globalMax, standardMax, standardBaseMax, pseudoMax, pseudoMaxMap, topBranches };
}

export interface RuleAuditResult {
  file: string;
  line: number;
  selector: string;
  isTrueConflict: boolean;
  isWinning: boolean;
  isLosing: boolean;
  hasNoOpponent: boolean;
  hasImportantCover: boolean;
  matchedStylexCalls: string[];
}

export interface AuditOptions {
  entryCssPath?: string;
  maxOpponentOverride?: Specificity | { standard: Specificity; pseudo?: Specificity };
  silent?: boolean;
}

/**
 * 扫描 entry.css 中的「非标准 CSS 属性」（side 段重复，如折叠 bug 产生的
 * border-left-left / border-top-top / border-bottom-bottom）。
 * 伪属性会被 StyleX 静默直通进产物 CSS、被浏览器整条忽略 —— 审计/运行时
 * 均表现为「该样式丢了」，容易假绿，故在闸门显式 fail。
 */
export function findUnknownCssProperties(entryCssPath: string): string[] {
  if (!existsSync(entryCssPath)) return [];
  const content = readFileSync(entryCssPath, "utf8");
  const found = new Map<string, number>();
  const flag = (prop: string, lineNo: number) => {
    if (!found.has(prop)) found.set(prop, lineNo);
  };
  // 1) 声明行扫描：缩进行 `  prop: value`，相邻段重复即伪属性
  for (const [i, line] of content.split("\n").entries()) {
    const m = line.match(/^\s+([a-zA-Z][a-zA-Z0-9-]*)\s*:/);
    if (!m) continue;
    const segments = m[1].split("-");
    for (let s = 0; s < segments.length - 1; s++) {
      if (segments[s] && segments[s] === segments[s + 1]) {
        flag(m[1], i + 1);
        break;
      }
    }
  }
  // 2) 兜底正则：压缩单行形态下的 side×side 重复（不依赖缩进）
  const doubled =
    /\b(border(?:-block|-inline)?|background|margin|padding|inset)-((?:top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))-\2\s*:/g;
  let mm: RegExpExecArray | null;
  while ((mm = doubled.exec(content)) !== null) {
    flag(mm[0].trim().replace(/[:\s]+$/, ""), content.slice(0, mm.index).split("\n").length);
  }
  return [...found.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prop, line]) => `${prop} (entry.css line ${line})`);
}

export function auditEscapeHatchFiles(
  filePaths: string[],
  elementIndex: ElementIndexItem[],
  root: string,
  options: AuditOptions = {},
): {
  results: RuleAuditResult[];
  losing: RuleAuditResult[];
  winning: RuleAuditResult[];
  noOpponent: RuleAuditResult[];
  derivedSpecificities: StylexSpecificities;
} {
  const results: RuleAuditResult[] = [];
  const losing: RuleAuditResult[] = [];
  const winning: RuleAuditResult[] = [];
  const noOpponent: RuleAuditResult[] = [];

  const entryCssPath = options.entryCssPath || join(root, "public/assets/entry.css");
  const derived = deriveStylexSpecificities(entryCssPath);
  const propertyIndex = buildStylexPropertyIndex(root);

  let opponentStandardMax = derived.standardMax;
  let opponentPseudoMaxMap = derived.pseudoMaxMap;

  if (options.maxOpponentOverride) {
    if ("A" in options.maxOpponentOverride) {
      opponentStandardMax = options.maxOpponentOverride;
      opponentPseudoMaxMap = { "::placeholder": options.maxOpponentOverride };
    } else {
      opponentStandardMax = options.maxOpponentOverride.standard;
      opponentPseudoMaxMap = {
        "::placeholder": options.maxOpponentOverride.pseudo || options.maxOpponentOverride.standard,
      };
    }
  }

  if (!options.silent) {
    console.log(
      `[stylexCascadeAuditor] Derived max opponent specificity from ${entryCssPath}:\n` +
        `  globalMax   = { A: ${derived.globalMax.A}, B: ${derived.globalMax.B}, C: ${derived.globalMax.C} }\n` +
        `  standardMax = { A: ${derived.standardMax.A}, B: ${derived.standardMax.B}, C: ${derived.standardMax.C} }\n` +
        `  pseudoMax   = { A: ${derived.pseudoMax.A}, B: ${derived.pseudoMax.B}, C: ${derived.pseudoMax.C} }\n` +
        `  top branches: ${derived.topBranches.slice(0, 2).join(", ")}`,
    );
  }

  for (const relPath of filePaths) {
    const fullPath = join(root, relPath);
    const content = readFileSync(fullPath, "utf8");
    const parsed = postcss.parse(content);

    parsed.walkRules((rule) => {
      if (
        rule.parent &&
        rule.parent.type === "atrule" &&
        (rule.parent as any).name === "keyframes"
      ) {
        return;
      }
      const decls: Record<string, string> = {};
      const importantProps = new Set<string>();
      rule.walkDecls((d) => {
        decls[d.prop] = d.value;
        if (d.important) importantProps.add(d.prop);
      });

      const rawSelectors = rule.selector.split(",").map((s) => s.trim()).filter(Boolean);
      const matchedStylexElements: ElementIndexItem[] = [];

      for (const rawSel of rawSelectors) {
        const target = extractRightmostTarget(rawSel);
        const matches = elementIndex.filter((e) => matchesElement(target, e));
        const withStylex = matches.filter((e) => e.hasStylex);
        if (withStylex.length > 0) {
          if (target.pseudoElement) {
            const pseudoKeyword = target.pseudoElement.replace(/^::?/, "");
            const hasPseudoInStylex = withStylex.some((el) =>
              el.stylexCalls.some((call) => call.includes(pseudoKeyword)),
            );
            if (hasPseudoInStylex) matchedStylexElements.push(...withStylex);
          } else {
            // Check if there is any overlapping CSS property between decls and StyleX calls
            const hatchProps = Object.keys(decls).map((p) => p.toLowerCase());
            let hasPropertyCollision = false;

            for (const el of withStylex) {
              const varMap = propertyIndex.get(el.file);
              if (!varMap) {
                hasPropertyCollision = true;
                break;
              }
              for (const call of el.stylexCalls) {
                const refs = call.matchAll(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/g);
                let checkedAny = false;
                for (const r of refs) {
                  const varName = r[1];
                  const keyName = r[2];
                  const keyMap = varMap.get(varName);
                  if (keyMap) {
                    const set = keyMap.get(keyName);
                    if (set) {
                      checkedAny = true;
                      for (const hp of hatchProps) {
                        if (set.has(hp)) {
                          hasPropertyCollision = true;
                          break;
                        }
                      }
                    }
                  }
                  if (hasPropertyCollision) break;
                }
                if (!checkedAny) {
                  for (const km of varMap.values()) {
                    for (const set of km.values()) {
                      for (const hp of hatchProps) {
                        if (set.has(hp)) hasPropertyCollision = true;
                      }
                    }
                  }
                }
                if (hasPropertyCollision) break;
              }
              if (hasPropertyCollision) break;
            }

            if (hasPropertyCollision) {
              matchedStylexElements.push(...withStylex);
            }
          }
        }
      }

      const isTrueConflict = matchedStylexElements.length > 0;
      if (!isTrueConflict) {
        const item: RuleAuditResult = {
          file: relPath,
          line: rule.source?.start?.line ?? 0,
          selector: rule.selector,
          isTrueConflict: false,
          isWinning: false,
          isLosing: false,
          hasNoOpponent: true,
          hasImportantCover: false,
          matchedStylexCalls: [],
        };
        results.push(item);
        noOpponent.push(item);
        return;
      }

      let allSelectorsWin = true;
      for (const rawSel of rawSelectors) {
        const spec = calculateSpecificity(rawSel);
        const pseudoMatch = rawSel.match(
          /(?:::|:(?:before|after|placeholder|selection|backdrop|marker|file-selector-button|-webkit-[a-z0-9_-]+|-moz-[a-z0-9_-]+))[a-zA-Z0-9_-]*/i,
        );
        let oppMax = opponentStandardMax;
        if (pseudoMatch) {
          const pName = pseudoMatch[0].toLowerCase();
          oppMax = opponentPseudoMaxMap[pName] || { A: 0, B: 0, C: 0 };
        } else if (!options.maxOpponentOverride) {
          // If the element does not target data-positioned / data-entering / data-exiting, its opponent is standardBaseMax
          const hasAttributedOpponent = /\[data-(?:positioned|entering|exiting)\]/i.test(rawSel);
          if (!hasAttributedOpponent && derived.standardBaseMax) {
            oppMax = derived.standardBaseMax;
          }
        }
        const wins = compareSpecificity(spec, oppMax) > 0;
        if (!wins) allSelectorsWin = false;
      }

      const hasUnimportant = Object.keys(decls).some((p) => !importantProps.has(p));
      const hasImportantCover = !hasUnimportant && Object.keys(decls).length > 0;
      const isLosingRule = !allSelectorsWin && !hasImportantCover;

      const item: RuleAuditResult = {
        file: relPath,
        line: rule.source?.start?.line ?? 0,
        selector: rule.selector,
        isTrueConflict: true,
        isWinning: !isLosingRule,
        isLosing: isLosingRule,
        hasNoOpponent: false,
        hasImportantCover,
        matchedStylexCalls: matchedStylexElements.flatMap((e) => e.stylexCalls),
      };

      results.push(item);
      if (isLosingRule) {
        losing.push(item);
      } else {
        winning.push(item);
      }
    });
  }

  return { results, losing, winning, noOpponent, derivedSpecificities: derived };
}
