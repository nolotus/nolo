// create/space/epub/epubParser.ts
//
// EPUB 解析层（纯函数，无 React / Redux 依赖）。
//
// 流程：PizZip 解压 → META-INF/container.xml → OPF → manifest / spine / 目录；
// 渲染时只处理「当前一章」：把该章 XHTML 引用到的 CSS + 图片 / 字体按需内联成 data URL，
// 产出一份自包含的 HTML 字符串，交给零权限 sandbox=""（无脚本、无 allow-same-origin）的 iframe。
//
// 为什么是 data URL：沙箱帧是不透明源（opaque origin），blob: / 站内 URL 都取不到，
// 所以资源只能随文档内联。不引入 epubjs（RN 端无 DOM，且仓库偏好复用既有依赖）。
import PizZip from "pizzip";
import { EPUB_MIME_TYPE, isEpubFile, isEpubReaderTarget } from "./epubFile";

export type EpubErrorCode =
  | "invalid-zip"
  | "missing-container"
  | "missing-opf"
  | "invalid-opf"
  | "encrypted"
  | "empty-spine"
  | "missing-chapter"
  | "too-large"
  | "chapter-too-large";

export class EpubError extends Error {
  readonly code: EpubErrorCode;
  constructor(code: EpubErrorCode, message: string) {
    super(message);
    this.name = "EpubError";
    this.code = code;
  }
}

export interface EpubSpineItem {
  id: string;
  /** 章节文档在包内的规范化路径 */
  path: string;
  mediaType: string;
}

export interface EpubTocEntry {
  title: string;
  path: string;
  fragment: string;
  /** 目标章节在 spine 中的下标；不在 spine 内为 -1 */
  spineIndex: number;
  /** 目录层级（0 = 顶层），来自 nav 的 <ol> 嵌套 / NCX 的 navPoint 嵌套。 */
  level: number;
}

export interface EpubBook {
  title: string | null;
  spine: EpubSpineItem[];
  toc: EpubTocEntry[];
  limits: EpubLimits;
  /** 章节渲染缓存（按路径缓存 data URL / 展开后的 CSS，带总量上限）。 */
  cache: EpubRenderCache;
  readBytes: (path: string) => Uint8Array | null;
  /** zip 目录声明的解压后大小（不解压）；条目不存在为 null。 */
  peekSize: (path: string) => number | null;
  mediaTypeOf: (path: string) => string;
}

export { EPUB_MIME_TYPE, isEpubFile, isEpubReaderTarget };

/**
 * 阅读器 iframe 的 sandbox。章节里不再有任何脚本（宿主 CSP 没有 unsafe-inline，
 * 内联桥接脚本在线上会被拦），所以连 allow-scripts 都不给；更不能给 allow-same-origin。
 */
export const EPUB_READER_SANDBOX = "";

/* ───────────────────────── 渲染缓存 ───────────────────────── */

/** 整本书的渲染缓存上限（字符数）；超出按插入顺序淘汰最旧项。 */
export const EPUB_CACHE_MAX_CHARS = 48 * 1024 * 1024;

export interface EpubRenderCache {
  /** 包内路径 → data URL */
  dataUrls: Map<string, string>;
  /** `${path}@${depth}` → 已展开 @import / url() 的 CSS 文本 */
  css: Map<string, string>;
  chars: number;
  maxChars: number;
}

export const createRenderCache = (maxChars = EPUB_CACHE_MAX_CHARS): EpubRenderCache => ({
  dataUrls: new Map(),
  css: new Map(),
  chars: 0,
  maxChars,
});

const cachePut = (
  cache: EpubRenderCache,
  bucket: "dataUrls" | "css",
  key: string,
  value: string
): void => {
  // 单项就超过整个缓存上限：不缓存（调用方仍会把它计入章节预算）。
  if (value.length > cache.maxChars) return;
  const map = cache[bucket];
  const previous = map.get(key);
  if (previous !== undefined) {
    cache.chars -= previous.length;
    map.delete(key);
  }
  map.set(key, value);
  cache.chars += value.length;
  while (cache.chars > cache.maxChars) {
    const victim =
      cache.dataUrls.size > 0
        ? ([cache.dataUrls, cache.dataUrls.keys().next().value as string] as const)
        : ([cache.css, cache.css.keys().next().value as string] as const);
    const text = victim[0].get(victim[1]);
    victim[0].delete(victim[1]);
    cache.chars -= text?.length ?? 0;
  }
};

/* ───────────────────────── 体积上限 ───────────────────────── */

export interface EpubLimits {
  /** 整个 .epub（压缩后）字节数 */
  maxFileBytes: number;
  /** 单个条目解压后字节数（按 zip 目录声明值） */
  maxEntryBytes: number;
  /** 全部条目解压后字节数之和（按 zip 目录声明值） */
  maxTotalBytes: number;
  /** 单章渲染产物（含内联 data URL）字符数 */
  maxChapterOutputChars: number;
}

const MIB = 1024 * 1024;
export const DEFAULT_EPUB_LIMITS: EpubLimits = {
  maxFileBytes: 100 * MIB,
  maxEntryBytes: 32 * MIB,
  maxTotalBytes: 256 * MIB,
  maxChapterOutputChars: 24 * MIB,
};

/* ───────────────────────── 路径 / 文本工具 ───────────────────────── */

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** 把 base 文件所在目录下的相对引用解析成包内路径；外部 URL / data: 返回 null。 */
export const resolveZipPath = (basePath: string, ref: string): string | null => {
  const trimmed = ref.trim();
  if (!trimmed || SCHEME_RE.test(trimmed) || trimmed.startsWith("//")) return null;
  const pathPart = safeDecode(trimmed.split("#")[0].split("?")[0]);
  if (!pathPart) return basePath;
  const baseDir = basePath.includes("/")
    ? basePath.slice(0, basePath.lastIndexOf("/") + 1)
    : "";
  const combined = pathPart.startsWith("/") ? pathPart.slice(1) : baseDir + pathPart;
  const out: string[] = [];
  for (const segment of combined.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return out.join("/");
};

const fragmentOf = (ref: string): string => {
  const idx = ref.indexOf("#");
  return idx >= 0 ? safeDecode(ref.slice(idx + 1)) : "";
};

const decodeText = (bytes: Uint8Array): string =>
  new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");

const collapse = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

const byLocalName = (root: Document | Element, name: string): Element[] =>
  Array.from(root.getElementsByTagName("*")).filter((el) => el.localName === name);

const parseXml = (text: string, code: EpubErrorCode, what: string): Document => {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new EpubError(code, `${what} is not well-formed XML`);
  }
  return doc;
};

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  css: "text/css",
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml",
  html: "text/html",
  htm: "text/html",
};

const mimeFromExtension = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? "application/octet-stream";
};

export const bytesToDataUrl = (bytes: Uint8Array, mediaType: string): string => {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${mediaType};base64,${btoa(binary)}`;
};

/* ───────────────────────── 加密检测 ───────────────────────── */

// 字体混淆（IDPF / Adobe）不是 DRM：书照样能读，只是对应字体拿不到明文。
const FONT_OBFUSCATION_ALGORITHMS = new Set([
  "http://www.idpf.org/2008/embedding",
  "http://ns.adobe.com/pdf/enc#RC",
]);

const hasContentEncryption = (xml: string): boolean => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  // 无法解析的 encryption.xml 一律按「可能加密」处理，宁可拒读也不渲染乱码。
  if (doc.getElementsByTagName("parsererror").length > 0) return true;
  return byLocalName(doc, "EncryptionMethod").some(
    (el) => !FONT_OBFUSCATION_ALGORITHMS.has(el.getAttribute("Algorithm") ?? "")
  );
};

/* ───────────────────────── 目录 ───────────────────────── */

interface RawTocEntry {
  title: string;
  path: string;
  fragment: string;
  level: number;
}

const parseNavToc = (
  html: string,
  navPath: string
): RawTocEntry[] => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const navs = Array.from(doc.getElementsByTagName("nav"));
  const tocNav =
    navs.find((nav) => (nav.getAttribute("epub:type") ?? "").split(/\s+/).includes("toc")) ??
    navs[0];
  if (!tocNav) return [];
  const out: RawTocEntry[] = [];
  for (const a of Array.from(tocNav.getElementsByTagName("a"))) {
    const href = a.getAttribute("href");
    if (!href) continue;
    const path = resolveZipPath(navPath, href);
    if (path === null) continue;
    let level = 0;
    for (let el = a.parentElement; el && el !== tocNav; el = el.parentElement) {
      if (el.localName === "ol" || el.localName === "ul") level += 1;
    }
    out.push({
      title: collapse(a.textContent),
      path,
      fragment: fragmentOf(href),
      level: Math.max(0, level - 1),
    });
  }
  return out;
};

const parseNcxToc = (
  xml: string,
  ncxPath: string
): RawTocEntry[] => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return [];
  const out: RawTocEntry[] = [];
  for (const point of byLocalName(doc, "navPoint")) {
    const content = Array.from(point.children).find((c) => c.localName === "content");
    const src = content?.getAttribute("src");
    if (!src) continue;
    const path = resolveZipPath(ncxPath, src);
    if (path === null) continue;
    const label = Array.from(point.children).find((c) => c.localName === "navLabel");
    let level = 0;
    for (let el = point.parentElement; el; el = el.parentElement) {
      if (el.localName === "navPoint") level += 1;
    }
    out.push({ title: collapse(label?.textContent), path, fragment: fragmentOf(src), level });
  }
  return out;
};

/* ───────────────────────── 解析入口 ───────────────────────── */

const DOCUMENT_MEDIA_TYPES = new Set(["application/xhtml+xml", "text/html"]);

export const parseEpub = (
  bytes: Uint8Array,
  limitOverrides: Partial<EpubLimits> = {}
): EpubBook => {
  const limits = { ...DEFAULT_EPUB_LIMITS, ...limitOverrides };
  if (bytes.length > limits.maxFileBytes) {
    throw new EpubError("too-large", `EPUB file exceeds ${limits.maxFileBytes} bytes`);
  }
  let zip: PizZip;
  try {
    zip = new PizZip(bytes);
  } catch (error) {
    throw new EpubError(
      "invalid-zip",
      `Not a readable ZIP archive: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // 解压前按 zip 目录里声明的大小拒绝过大条目（pizzip 是同步解压，只能前置拦）。
  // 声明值可被恶意包伪造；pizzip 解压后会校验长度并抛错，但那时内存已用掉——
  // 这是 v1 已知的残余风险，由 maxFileBytes 压缩体积上限一并约束。
  let declaredTotal = 0;
  for (const [name, entry] of Object.entries(zip.files)) {
    const size = Number(
      (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0
    );
    if (size > limits.maxEntryBytes) {
      throw new EpubError("too-large", `Entry ${name} exceeds ${limits.maxEntryBytes} bytes`);
    }
    declaredTotal += size;
    if (declaredTotal > limits.maxTotalBytes) {
      throw new EpubError("too-large", `Archive exceeds ${limits.maxTotalBytes} bytes unpacked`);
    }
  }

  const findEntry = (path: string) => zip.file(path) ?? zip.file(safeDecode(path));
  const readBytes = (path: string): Uint8Array | null => {
    const entry = findEntry(path);
    return entry ? entry.asUint8Array() : null;
  };
  const peekSize = (path: string): number | null => {
    const entry = findEntry(path);
    if (!entry) return null;
    return Number((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0);
  };

  const encryptionBytes = readBytes("META-INF/encryption.xml");
  if (encryptionBytes && hasContentEncryption(decodeText(encryptionBytes))) {
    throw new EpubError("encrypted", "EPUB content is encrypted (DRM) and cannot be read");
  }

  const containerBytes = readBytes("META-INF/container.xml");
  if (!containerBytes) {
    throw new EpubError("missing-container", "META-INF/container.xml not found");
  }
  const container = parseXml(decodeText(containerBytes), "missing-container", "container.xml");
  const rootfile = byLocalName(container, "rootfile")[0];
  const opfRef = rootfile?.getAttribute("full-path");
  if (!opfRef) {
    throw new EpubError("missing-opf", "container.xml does not declare an OPF rootfile");
  }
  const opfPath = resolveZipPath("", opfRef) ?? "";
  const opfBytes = opfPath ? readBytes(opfPath) : null;
  if (!opfBytes) {
    throw new EpubError("missing-opf", `OPF package document not found: ${opfRef}`);
  }
  const opf = parseXml(decodeText(opfBytes), "invalid-opf", "OPF package document");

  const manifest = new Map<
    string,
    { path: string; mediaType: string; properties: string[] }
  >();
  const mediaByPath = new Map<string, string>();
  for (const item of byLocalName(opf, "item")) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (!id || !href) continue;
    const path = resolveZipPath(opfPath, href);
    if (path === null) continue;
    const mediaType = item.getAttribute("media-type") ?? mimeFromExtension(path);
    manifest.set(id, {
      path,
      mediaType,
      properties: (item.getAttribute("properties") ?? "").split(/\s+/).filter(Boolean),
    });
    mediaByPath.set(path, mediaType);
  }
  if (manifest.size === 0) {
    throw new EpubError("invalid-opf", "OPF manifest is empty or missing");
  }

  const spine: EpubSpineItem[] = [];
  for (const ref of byLocalName(opf, "itemref")) {
    const entry = manifest.get(ref.getAttribute("idref") ?? "");
    if (!entry || !DOCUMENT_MEDIA_TYPES.has(entry.mediaType)) continue;
    spine.push({ id: ref.getAttribute("idref") ?? "", path: entry.path, mediaType: entry.mediaType });
  }
  if (spine.length === 0) {
    throw new EpubError("empty-spine", "OPF spine contains no readable documents");
  }

  const spineIndexByPath = new Map(spine.map((item, index) => [item.path, index]));

  // 目录：EPUB3 nav 优先，其次 NCX；都没有则 toc 为空（UI 退回章节序号）。
  let rawToc: RawTocEntry[] = [];
  const navItem = Array.from(manifest.values()).find((m) => m.properties.includes("nav"));
  const navBytes = navItem ? readBytes(navItem.path) : null;
  if (navItem && navBytes) rawToc = parseNavToc(decodeText(navBytes), navItem.path);
  if (rawToc.length === 0) {
    const spineEl = byLocalName(opf, "spine")[0];
    const ncxId = spineEl?.getAttribute("toc");
    const ncxItem =
      (ncxId ? manifest.get(ncxId) : undefined) ??
      Array.from(manifest.values()).find((m) => m.mediaType === "application/x-dtbncx+xml");
    const ncxBytes = ncxItem ? readBytes(ncxItem.path) : null;
    if (ncxItem && ncxBytes) rawToc = parseNcxToc(decodeText(ncxBytes), ncxItem.path);
  }
  const toc: EpubTocEntry[] = rawToc.map((entry) => ({
    ...entry,
    spineIndex: spineIndexByPath.get(entry.path) ?? -1,
  }));

  const titleEl = byLocalName(opf, "title")[0];
  return {
    title: collapse(titleEl?.textContent) || null,
    spine,
    toc,
    limits,
    cache: createRenderCache(),
    readBytes,
    peekSize,
    mediaTypeOf: (path) => mediaByPath.get(path) ?? mimeFromExtension(path),
  };
};

/** 章节标题：优先目录里指向该章节开头的条目，其次该章节的任一目录条目；没有则 null。 */
export const getChapterTitle = (book: EpubBook, spineIndex: number): string | null => {
  const entries = book.toc.filter((entry) => entry.spineIndex === spineIndex && entry.title);
  const whole = entries.find((entry) => !entry.fragment);
  return (whole ?? entries[0])?.title ?? null;
};

/** v1 进度是「章级」：已读到第几章 / 总章数，折算成 0–100。 */
export const computeChapterPercent = (spineIndex: number, spineLength: number): number => {
  if (spineLength <= 0) return 0;
  const clampedIndex = Math.min(spineLength - 1, Math.max(0, spineIndex));
  return Math.round(((clampedIndex + 1) / spineLength) * 100);
};

/* ───────────────────────── 章节渲染（资源内联） ───────────────────────── */

const MAX_CSS_IMPORT_DEPTH = 3;

/** 一次章节渲染的体积预算：内联资源累计 base64 长度。 */
interface RenderBudget {
  used: number;
  max: number;
}

const spend = (budget: RenderBudget, chars: number): void => {
  budget.used += chars;
  if (budget.used > budget.max) {
    throw new EpubError("chapter-too-large", "Chapter is too large to render");
  }
};

/** base64 data URL 的字符数（据解压后字节数估算，不需要先解压）。 */
const estimateDataUrlChars = (byteLength: number, mediaType: string): number =>
  `data:${mediaType};base64,`.length + Math.ceil(byteLength / 3) * 4;

/**
 * 读取并内联一个包内资源（按需：只有当前章引用到的才会走到这里）。
 * - 命中缓存：不再解压 / 转 base64，只计入本章预算；
 * - 未命中：先按 zip 目录声明的大小预判预算，超限直接拒绝，不解压；
 * - 找不到条目返回 null。
 */
const loadDataUrl = (book: EpubBook, path: string, budget: RenderBudget): string | null => {
  const cached = book.cache.dataUrls.get(path);
  if (cached !== undefined) {
    spend(budget, cached.length);
    return cached;
  }
  const declared = book.peekSize(path);
  if (declared === null) return null;
  const mediaType = book.mediaTypeOf(path);
  if (budget.used + estimateDataUrlChars(declared, mediaType) > budget.max) {
    throw new EpubError("chapter-too-large", "Chapter is too large to render");
  }
  const bytes = book.readBytes(path);
  if (!bytes) return null;
  const dataUrl = bytesToDataUrl(bytes, mediaType);
  cachePut(book.cache, "dataUrls", path, dataUrl);
  spend(budget, dataUrl.length);
  return dataUrl;
};

/**
 * CSS 文本要被放进 <style> 并整篇序列化进 srcdoc。<style> 是原始文本元素，
 * 序列化时不转义：`</style` 会提前结束元素并让后面的内容被当作 HTML 解析。
 * CSS 里 `\/`、`\!`、`\>` 都是合法转义，所以这样改不会破坏正常样式。
 */
export const escapeCssForStyleElement = (css: string): string =>
  css
    .replace(/<\/(style)/gi, "<\\/$1")
    .replace(/<!--/g, "<\\!--")
    .replace(/-->/g, "--\\>");

const isFragmentOnlyRef = (ref: string): boolean => ref.trim().startsWith("#");

/**
 * 展开 @import 与 url()。结果按「路径@剩余深度」缓存：同一份 CSS（多章共用的主样式表）
 * 只展开一次；命中缓存时展开结果整体计入本章预算（其中含内联的 data URL）。
 */
const loadExpandedCss = (
  book: EpubBook,
  cssPath: string,
  budget: RenderBudget,
  depth = 0
): string | null => {
  const cacheKey = `${cssPath}@${depth}`;
  const cached = book.cache.css.get(cacheKey);
  if (cached !== undefined) {
    spend(budget, cached.length);
    return cached;
  }
  const declared = book.peekSize(cssPath);
  if (declared === null) return null;
  if (budget.used + declared > budget.max) {
    throw new EpubError("chapter-too-large", "Chapter is too large to render");
  }
  const bytes = book.readBytes(cssPath);
  if (!bytes) return null;
  spend(budget, bytes.length);
  const expanded = inlineCss(book, decodeText(bytes), cssPath, budget, depth);
  cachePut(book.cache, "css", cacheKey, expanded);
  return expanded;
};

const inlineCss = (
  book: EpubBook,
  css: string,
  cssPath: string,
  budget: RenderBudget,
  depth = 0
): string => {
  let result = css;
  if (depth < MAX_CSS_IMPORT_DEPTH) {
    result = result.replace(
      /@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?[^;]*;/gi,
      (_match, ref: string) => {
        const importPath = resolveZipPath(cssPath, ref);
        return (importPath && loadExpandedCss(book, importPath, budget, depth + 1)) || "";
      }
    );
  }
  return result.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, _quote: string, ref: string) => {
    // data: 已内联；#id 是 SVG 片段引用（fill:url(#g)），指向文档内部，必须原样保留。
    if (ref.startsWith("data:") || isFragmentOnlyRef(ref)) return match;
    const resourcePath = resolveZipPath(cssPath, ref);
    const dataUrl = resourcePath ? loadDataUrl(book, resourcePath, budget) : null;
    return dataUrl ? `url("${dataUrl}")` : "url()";
  });
};

const inlineResource = (
  book: EpubBook,
  fromPath: string,
  ref: string | null,
  budget: RenderBudget
): string | null => {
  if (!ref) return null;
  if (ref.startsWith("data:")) return ref;
  if (isFragmentOnlyRef(ref)) return null;
  const path = resolveZipPath(fromPath, ref);
  return path ? loadDataUrl(book, path, budget) : null;
};

/* ───────────────────────── 阅读外观 ───────────────────────── */

export type EpubThemePreference = "system" | "light" | "paper" | "dark";
export type EpubTheme = Exclude<EpubThemePreference, "system">;
export type EpubFontSize = "sm" | "md" | "lg" | "xl";
export type EpubFontFamily = "sans" | "serif";

export interface EpubAppearance {
  theme: EpubTheme;
  fontSize: EpubFontSize;
  fontFamily: EpubFontFamily;
}

export const EPUB_FONT_SIZES: Record<EpubFontSize, number> = { sm: 15, md: 17, lg: 19, xl: 22 };

const EPUB_FONT_STACKS: Record<EpubFontFamily, string> = {
  sans: 'system-ui,-apple-system,"Segoe UI","PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif',
  serif: 'Georgia,"Noto Serif","Songti SC","Noto Serif CJK SC","Source Han Serif SC",serif',
};

interface EpubPalette {
  bg: string;
  fg: string;
  muted: string;
  codeBg: string;
  rule: string;
}

export const EPUB_PALETTES: Record<EpubTheme, EpubPalette> = {
  light: { bg: "#ffffff", fg: "#1f2328", muted: "#57606a", codeBg: "#f3f4f6", rule: "#d0d7de" },
  paper: { bg: "#f4ecd8", fg: "#3b2f1e", muted: "#6b5b45", codeBg: "#eadfc4", rule: "#cdbf9f" },
  dark: { bg: "#15171b", fg: "#d7dae0", muted: "#9aa0aa", codeBg: "#22262d", rule: "#363b44" },
};

export const resolveEpubTheme = (
  preference: EpubThemePreference,
  systemIsDark: boolean
): EpubTheme => (preference === "system" ? (systemIsDark ? "dark" : "light") : preference);

export const DEFAULT_EPUB_APPEARANCE: EpubAppearance = {
  theme: "light",
  fontSize: "md",
  fontFamily: "sans",
};

/**
 * 阅读器注入的基础样式。放在书自带样式之后并用 !important，温和覆盖书里硬编码的
 * 字色 / 背景色 / 固定像素宽（暗色、暖纸主题下保证文字清晰）；版心收敛到约 70ch
 * （680–740px 区间），全屏也不会拉成超长一行。内容全是常量，不含书里的文本。
 */
export const buildReaderStyle = (appearance: EpubAppearance): string => {
  const c = EPUB_PALETTES[appearance.theme];
  const textTags = "p,div,span,li,ul,ol,dl,dt,dd,section,article,aside,header,footer,main,figure,figcaption,blockquote,h1,h2,h3,h4,h5,h6,td,th,tr,tbody,thead,em,strong,i,b,u,small,cite,sup,sub,font,center";
  return [
    `html{background:${c.bg}!important;color:${c.fg}!important;font-size:${EPUB_FONT_SIZES[appearance.fontSize]}px!important;-webkit-text-size-adjust:100%;color-scheme:${appearance.theme === "dark" ? "dark" : "light"}}`,
    `body{box-sizing:border-box!important;width:auto!important;max-width:min(max(70ch,680px),740px,100%)!important;margin:0 auto!important;padding:2.5rem 1.25rem 6rem!important;` +
      `background:transparent!important;color:${c.fg}!important;font-family:${EPUB_FONT_STACKS[appearance.fontFamily]}!important;line-height:1.8;overflow-wrap:anywhere;word-break:normal}`,
    `body :where(${textTags}){color:inherit!important;background-color:transparent!important;font-family:inherit!important;max-width:100%;box-sizing:border-box}`,
    `body :where(p,li,dd,dt,td,th,blockquote,div){font-size:inherit!important;line-height:inherit}`,
    `body :where(p,li,dd,dt,blockquote,div){width:auto!important;min-width:0!important}`,
    `body :where(p){margin-block:.9em}`,
    `body :where(pre,code,kbd,samp){background:${c.codeBg}!important;color:inherit!important;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;font-size:.92em}`,
    `pre{max-width:100%;overflow-x:auto;padding:.75em 1em;border-radius:6px;white-space:pre-wrap}`,
    `body :where(blockquote){border-left:3px solid ${c.rule};padding-left:1em;margin-inline:0;color:${c.muted}!important}`,
    `body :where(hr){border:0;border-top:1px solid ${c.rule}}`,
    `img,svg,video,canvas{max-width:100%!important;height:auto!important;display:block;margin:1em auto}`,
    `table{display:block;max-width:100%!important;overflow-x:auto;border-collapse:collapse}`,
    `td,th{border:1px solid ${c.rule};padding:.35em .6em}`,
    `a[data-epub-link]{color:inherit!important;text-decoration:underline dotted;pointer-events:none;cursor:default}`,
  ].join("");
};

export interface BuildChapterOptions {
  /** 覆盖默认的单章输出上限（字符数）。 */
  maxOutputChars?: number;
  /** 阅读外观；缺省为浅色 / 中号 / 无衬线。 */
  appearance?: Partial<EpubAppearance>;
}

/**
 * 生成一份自包含的章节 HTML（零脚本）：
 *  - 去掉书里自带的 script / iframe / object / embed / base / form 与事件属性，
 *  - 只内联「本章引用到」的样式表 / 图片 / 字体为 data URL（带缓存与体积预算）；
 *    注入的 CSS 做 `</style` 等边界转义，
 *  - 所有链接一律去掉 href，改成不可点的文本样式（帧内没有脚本，无法拦截站内跳转，
 *    也不让外链把帧导航走；翻章与小节定位由宿主通过目录完成），
 *  - 加 CSP（只允许 data: 资源；不允许任何脚本），即使清理有遗漏也出不了网。
 */
export const buildChapterDocument = (
  book: EpubBook,
  spineIndex: number,
  options: BuildChapterOptions = {}
): string => {
  const chapter = book.spine[spineIndex];
  const bytes = chapter ? book.readBytes(chapter.path) : null;
  if (!chapter || !bytes) {
    throw new EpubError("missing-chapter", `Chapter ${spineIndex + 1} is missing from the package`);
  }
  const maxOutputChars = options.maxOutputChars ?? book.limits.maxChapterOutputChars;
  const budget: RenderBudget = { used: bytes.length, max: maxOutputChars };
  const appearance: EpubAppearance = { ...DEFAULT_EPUB_APPEARANCE, ...options.appearance };

  const doc = new DOMParser().parseFromString(decodeText(bytes), "text/html");
  const chapterPath = chapter.path;

  for (const el of Array.from(
    doc.querySelectorAll(
      "script, iframe, frame, object, embed, base, form, meta[http-equiv], noscript"
    )
  )) {
    el.remove();
  }
  for (const el of Array.from(doc.querySelectorAll("*"))) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.toLowerCase().startsWith("on")) el.removeAttribute(attr.name);
    }
  }

  for (const link of Array.from(doc.querySelectorAll("link"))) {
    const rel = (link.getAttribute("rel") ?? "").toLowerCase().split(/\s+/);
    const href = link.getAttribute("href");
    if (rel.includes("stylesheet") && href) {
      const cssPath = resolveZipPath(chapterPath, href);
      const css = cssPath ? loadExpandedCss(book, cssPath, budget) : null;
      if (css !== null) {
        const style = doc.createElement("style");
        style.textContent = escapeCssForStyleElement(css);
        link.replaceWith(style);
        continue;
      }
    }
    link.remove();
  }
  for (const style of Array.from(doc.querySelectorAll("style"))) {
    style.textContent = escapeCssForStyleElement(
      inlineCss(book, style.textContent ?? "", chapterPath, budget)
    );
  }
  for (const el of Array.from(doc.querySelectorAll("[style]"))) {
    el.setAttribute("style", inlineCss(book, el.getAttribute("style") ?? "", chapterPath, budget));
  }

  for (const img of Array.from(doc.querySelectorAll("img"))) {
    img.removeAttribute("srcset");
    img.removeAttribute("width");
    img.removeAttribute("height");
    const inlined = inlineResource(book, chapterPath, img.getAttribute("src"), budget);
    if (inlined) img.setAttribute("src", inlined);
    else img.removeAttribute("src");
  }
  for (const image of Array.from(doc.querySelectorAll("image"))) {
    for (const name of ["href", "xlink:href"]) {
      if (!image.hasAttribute(name)) continue;
      const inlined = inlineResource(book, chapterPath, image.getAttribute(name), budget);
      if (inlined) image.setAttribute(name, inlined);
      else image.removeAttribute(name);
    }
  }

  for (const a of Array.from(doc.querySelectorAll("a, area"))) {
    a.removeAttribute("href");
    a.removeAttribute("xlink:href");
    a.removeAttribute("target");
    a.setAttribute("data-epub-link", "");
  }

  const head = doc.head ?? doc.documentElement.insertBefore(doc.createElement("head"), doc.body);
  const charset = doc.createElement("meta");
  charset.setAttribute("charset", "utf-8");
  const csp = doc.createElement("meta");
  csp.setAttribute("http-equiv", "Content-Security-Policy");
  csp.setAttribute(
    "content",
    "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; script-src 'none'"
  );
  const viewport = doc.createElement("meta");
  viewport.setAttribute("name", "viewport");
  viewport.setAttribute("content", "width=device-width,initial-scale=1");
  head.prepend(charset, csp, viewport);
  // 阅读器样式放在 head 末尾：晚于书自带样式，配合 !important 才能真正覆盖。
  const reader = doc.createElement("style");
  reader.textContent = buildReaderStyle(appearance);
  head.append(reader);

  const output = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
  if (output.length > maxOutputChars) {
    throw new EpubError("chapter-too-large", "Chapter is too large to render");
  }
  return output;
};

/* ───────────────────────── 目录展示 ───────────────────────── */

/** 一个可展示 / 可跳转的目录项（章级）。 */
export interface EpubTocView {
  title: string;
  spineIndex: number;
  level: number;
}

/**
 * 目录展示项（章级）。
 * 实测：sandbox="" 的 iframe 里，改 `src="about:srcdoc#id"` / `location.hash` 都不会滚动到锚点
 * （无脚本、不能给 allow-scripts / allow-same-origin），所以带 fragment 的同章多项不能伪装成
 * 小节跳转：这里按章去重，一章只出现一次（优先指向章首的条目），保留 nav / NCX 的层级缩进；
 * 不在 spine 内的项剔除；没有目录时退回章节序号。
 */
export const buildTocView = (
  book: Pick<EpubBook, "toc" | "spine">,
  fallbackTitle: (n: number) => string
): EpubTocView[] => {
  if (book.toc.length === 0) {
    return book.spine.map((_item, position) => ({
      title: fallbackTitle(position + 1),
      spineIndex: position,
      level: 0,
    }));
  }
  const byChapter = new Map<number, EpubTocEntry[]>();
  for (const entry of book.toc) {
    if (entry.spineIndex < 0) continue;
    byChapter.set(entry.spineIndex, [...(byChapter.get(entry.spineIndex) ?? []), entry]);
  }
  return Array.from(byChapter.entries()).map(([spineIndex, entries]) => {
    const chosen =
      entries.find((entry) => !entry.fragment && entry.title) ??
      entries.find((entry) => entry.title) ??
      entries[0];
    return {
      title: chosen.title || fallbackTitle(spineIndex + 1),
      spineIndex,
      level: chosen.level,
    };
  });
};

/* ───────────────────────── 给 AI 的上下文 ───────────────────────── */

export const EPUB_ASSISTANT_TEXT_LIMIT = 12000;
export const EPUB_ASSISTANT_TOC_LIMIT = 80;
export const EPUB_ASSISTANT_TOC_ITEM_LIMIT = 120;
export const EPUB_ASSISTANT_TOC_TOTAL_CHARS = 3000;
export const EPUB_ASSISTANT_TITLE_LIMIT = 200;

export interface EpubAssistantContext {
  bookTitle: string | null;
  /** 目录标题列表（章级去重并受单条/条数/总字符预算限制）。 */
  toc: string[];
  chapterIndex: number;
  chapterCount: number;
  chapterTitle: string | null;
  /** 当前章节纯文本，已截断到 EPUB_ASSISTANT_TEXT_LIMIT 字符以内。 */
  chapterText: string;
  truncated: boolean;
}

const clipAssistantText = (value: string, maxChars: number): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  if (maxChars <= 1) return normalized.slice(0, Math.max(0, maxChars));
  let end = maxChars - 1;
  const code = normalized.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return `${normalized.slice(0, end)}…`;
};

/** 当前章节正文纯文本（不含脚本 / 样式，空白折叠）；读取或解析异常时返回空文本。 */
export const extractChapterText = (
  book: EpubBook,
  spineIndex: number,
  maxChars = EPUB_ASSISTANT_TEXT_LIMIT
): { text: string; truncated: boolean } => {
  try {
    const chapter = book.spine[spineIndex];
    const bytes = chapter ? book.readBytes(chapter.path) : null;
    if (!chapter || !bytes) return { text: "", truncated: false };
    const doc = new DOMParser().parseFromString(decodeText(bytes), "text/html");
    for (const el of Array.from(doc.querySelectorAll("script, style, noscript, svg"))) el.remove();
    for (const el of Array.from(doc.querySelectorAll("p, div, br, li, h1, h2, h3, h4, h5, h6, tr"))) {
      el.appendChild(doc.createTextNode("\n"));
    }
    const raw = (doc.body?.textContent ?? "")
      .replace(/[ \t\f\v\u00a0]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const chars = Array.from(raw);
    return chars.length > maxChars
      ? { text: chars.slice(0, maxChars).join(""), truncated: true }
      : { text: raw, truncated: false };
  } catch {
    return { text: "", truncated: false };
  }
};

export const buildEpubAssistantContext = (
  book: EpubBook,
  spineIndex: number,
  options: { maxChars?: number } = {}
): EpubAssistantContext => {
  let text = "";
  let truncated = false;
  try {
    const extracted = extractChapterText(book, spineIndex, options.maxChars);
    text = extracted.text;
    truncated = extracted.truncated;
  } catch {
    text = "";
    truncated = false;
  }

  const tocView = book.toc.length > 0 ? buildTocView(book, (n) => `第 ${n} 章`) : [];
  const titles: string[] = [];
  const seen = new Set<string>();
  let totalTocChars = 0;
  for (const entry of tocView) {
    const clipped = clipAssistantText(entry.title, EPUB_ASSISTANT_TOC_ITEM_LIMIT);
    if (!clipped || seen.has(clipped)) continue;
    const sep = titles.length > 0 ? 3 : 0;
    if (totalTocChars + sep + clipped.length > EPUB_ASSISTANT_TOC_TOTAL_CHARS) break;
    seen.add(clipped);
    titles.push(clipped);
    totalTocChars += sep + clipped.length;
    if (titles.length >= EPUB_ASSISTANT_TOC_LIMIT) break;
  }

  const bookTitle = book.title
    ? clipAssistantText(book.title, EPUB_ASSISTANT_TITLE_LIMIT) || null
    : null;
  const rawChapterTitle = getChapterTitle(book, spineIndex);
  const chapterTitle = rawChapterTitle
    ? clipAssistantText(rawChapterTitle, EPUB_ASSISTANT_TITLE_LIMIT) || null
    : null;

  return {
    bookTitle,
    toc: titles,
    chapterIndex: spineIndex,
    chapterCount: book.spine.length,
    chapterTitle,
    chapterText: text,
    truncated,
  };
};
