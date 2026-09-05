#!/usr/bin/env bun
/**
 * checkDangling.mjs — 检测 esbuild 压缩产物 chunk 的悬空引用（Dangling Identifier）。
 *
 * 背景：esbuild splitting+minify 在 re-export 层（如 identity/useDeleteOwnAccountFlow
 * re-export auth/hooks）场景下会丢失懒加载 chunk 的共享符号级 import，构建产物出现
 * 「使用点引用了但既无 import 也无本地定义」的标识符（生产事故：Oe is not defined，
 * 2026-08-21）。本脚本在构建后扫描全部产物 chunk，检出悬空即失败，防止复发。
 *
 * 用法：
 *   bun scripts/dev/checkDangling.mjs <dir>          # 扫描目录下所有 .js
 *   bun scripts/dev/checkDangling.mjs <file.js>      # 扫描单文件
 *
 * 判定（启发式，针对 esbuild esm 压缩产物）：
 *   1. 提取 import 绑定（import{a as X,...} → X + a；import X；import * as X）
 *   2. 提取顶层声明（function/var/let/const/class/无关键字赋值 X=/解构 [X,Y]=/{a:X}=/({a:X})=>）
 *   3. 提取 export{...} 名字
 *   4. 扫描标识符引用（排除属性访问 .N、?.N、对象 key N:、字符串/正则）
 *   5. 引用 > 0 且不在 import ∪ 声明 ∪ export ∪ 全局白名单 → 悬空候选
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";import { join } from "node:path";

const GLOBALS = new Set(`
window document navigator console Object Array String Number Boolean JSON Math Date RegExp
Promise Map Set Symbol Reflect Proxy Error TypeError RangeError SyntaxError ReferenceError
undefined NaN Infinity globalThis self location history sessionStorage localStorage fetch
XMLHttpRequest WebSocket URL URLSearchParams TextEncoder TextDecoder Intl AbortController
AbortSignal requestAnimationFrame cancelAnimationFrame queueMicrotask setTimeout clearTimeout
setInterval clearInterval atob btoa structuredClone crypto customElements Event EventTarget
CustomEvent HTMLElement Element Node Document global process Bun importScripts
Blob FormData File FileReader Headers Request Response
IntersectionObserver ResizeObserver MutationObserver WeakMap WeakSet WeakRef FinalizationRegistry
isNaN isFinite parseFloat parseInt encodeURIComponent decodeURIComponent
Uint8Array Uint16Array Uint32Array Int8Array Int16Array Int32Array Float32Array Float64Array
ArrayBuffer DataView SharedArrayBuffer BigInt BigInt64Array BigUint64Array Buffer
Image Notification HTMLImageElement HTMLInputElement HTMLTextAreaElement HTMLSelectElement
InputEvent KeyboardEvent MouseEvent FocusEvent Performance performance
requestIdleCallback cancelIdleCallback getComputedStyle matchMedia
__esModule React
`.trim().split(/\s+/));

const KEYWORDS = new Set(`
import from export default function var let const class return if else for while switch case
break continue new typeof instanceof in of this null true false void delete throw try catch
finally do yield await async static get set extends super debugger arguments as
`.trim().split(/\s+/));

function stripStrings(content) {
  // 去字符串字面量（含转义与 \uXXXX），避免字符串内容被当标识符
  return content
    .replace(/"(?:[^"\\]|\\.|\\u[0-9a-fA-F]{4})*"/g, ' "" ')
    .replace(/'(?:[^'\\]|\\.|\\u[0-9a-fA-F]{4})*'/g, " '' ")
    .replace(/`(?:[^`\\]|\\.)*`/g, ' `` ');
}

export function analyze(content) {
  const cleaned = stripStrings(content);

  const known = new Set(GLOBALS);

  // import 绑定
  const importRe = /import\s*(?:([^"'()]*?)\s*from\s*)?["'][^"']*["']/g;
  let m;
  while ((m = importRe.exec(cleaned))) {
    const spec = (m[1] || "").trim();
    if (!spec) continue;
    if (spec.startsWith("*")) {
      const star = spec.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
      if (star) known.add(star[1]);
    } else if (spec.startsWith("{")) {
      const namedRe = /\b([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?/g;
      let n;
      while ((n = namedRe.exec(spec))) {
        known.add(n[1]);
        if (n[2]) known.add(n[2]);
      }
    } else {
      const def = spec.match(/^([A-Za-z_$][\w$]*)/);
      if (def) known.add(def[1]);
    }
  }

  // 顶层声明：function/var/let/const/class/无关键字赋值/解构
  const declRe = /(?:function\s+([A-Za-z_$][\w$]*)|(?:var|let|const|class)\s+([A-Za-z_$][\w$]*)|(?<![\w$.])([A-Za-z_$][\w$]*)=(?!=))/g;
  while ((m = declRe.exec(cleaned))) {
    for (let i = 1; i <= 3; i++) if (m[i]) known.add(m[i]);
  }
  // 数组解构 [X,Y]=
  const arrRe = /\[([^\]]*)\]=/g;
  while ((m = arrRe.exec(cleaned))) {
    for (const n of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) known.add(n[0]);
  }
  // 对象解构 {a:X,b:Y}=
  const objRe = /\{([^}]*)\}=/g;
  while ((m = objRe.exec(cleaned))) {
    for (const part of m[1].split(",")) {
      const p = part.trim();
      if (!p) continue;
      known.add(p.includes(":") ? p.split(":").pop().trim() : p);
    }
  }
  // 函数参数解构 ({icon:p,label:t,...})=>
  const paramRe = /\(\s*(\{[^}]*\}|\[[^\]]*\])\s*\)\s*=>/g;
  while ((m = paramRe.exec(cleaned))) {
    const body = m[1];
    if (body.startsWith("{")) {
      for (const part of body.slice(1, -1).split(",")) {
        const p = part.trim();
        if (!p) continue;
        known.add(p.includes(":") ? p.split(":").pop().trim() : p);
      }
    } else {
      for (const n of body.matchAll(/[A-Za-z_$][\w$]*/g)) known.add(n[0]);
    }
  }

  // export{...} 名字
  const expRe = /export\s*\{([^}]*)\}/g;
  while ((m = expRe.exec(cleaned))) {
    for (const part of m[1].split(",")) {
      const p = part.trim();
      if (!p) continue;
      if (p.includes(" as ")) {
        const [a, b] = p.split(" as ", 2);
        known.add(a.trim());
        known.add(b.trim());
      } else {
        known.add(p);
      }
    }
  }

  // 标识符引用
  const identRe = /(?<![\w$.])\b([A-Za-z_$][\w$]*)\b(?!\s*:)/g;
  const refs = new Map();
  while ((m = identRe.exec(cleaned))) {
    const name = m[1];
    if (KEYWORDS.has(name) || known.has(name)) continue;
    refs.set(name, (refs.get(name) || 0) + 1);
  }

  return [...refs.entries()].map(([name, cnt]) => ({ name, count: cnt }));
}

function scanDir(dir) {
  const hits = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.name.endsWith(".js")) {
        const content = readFileSync(path, "utf8");
        const dangling = analyze(content);
        if (dangling.length) hits.push({ file: path, dangling });
      }
    }
  };
  walk(dir);
  return hits;
}

function main() {
  const args = process.argv.slice(2);
  const warnOnly = args.includes("--warn");
  const positional = args.filter((a) => !a.startsWith("--"));
  if (!positional.length) {
    console.error("用法: bun scripts/dev/checkDangling.mjs <dir|file> [--warn]");
    process.exit(2);
  }
  const target = positional[0];
  let hits;
  if (statSync(target).isDirectory()) {
    hits = scanDir(target);
  } else {
    const content = readFileSync(target, "utf8");
    const dangling = analyze(content);
    hits = dangling.length ? [{ file: target, dangling }] : [];
  }

  if (hits.length) {
    console.error(`[checkDangling] 检出 ${hits.length} 个文件存在悬空引用候选:`);
    for (const { file, dangling } of hits) {
      console.error(`  ${file}: ${dangling.map((d) => `${d.name}(${d.count})`).join(", ")}`);
    }
    if (warnOnly) {
      console.error("[checkDangling] 警告模式：请人工确认以上候选（已知误报：第三方库方法名/字符串/正则内容）。");
      process.exit(0);
    }
    console.error("[checkDangling] 构建产物存在悬空引用（esbuild splitting+minify 缺陷），请检查相关 re-export 层。");
    process.exit(1);
  }
  console.log(`[checkDangling] 通过：${statSync(target).isDirectory() ? "目录" : "文件"}无悬空引用`);
}

main();
