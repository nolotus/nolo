// create/space/epub/epubParser.ts
//
// EPUB 解析层（纯函数，无 React / Redux 依赖）。
//
// 流程：PizZip 解压 → META-INF/container.xml → OPF → manifest / spine / 目录；
// 渲染时把章节 XHTML + CSS + 图片 / 字体全部内联成 data URL，产出一份自包含的
// HTML 字符串，交给 sandbox="allow-scripts"（不含 allow-same-origin）的 iframe。
//
// 为什么是 data URL：沙箱帧是不透明源（opaque origin），blob: / 站内 URL 都取不到，
// 所以资源只能随文档内联。不引入 epubjs（RN 端无 DOM，且仓库偏好复用既有依赖）。
import PizZip from "pizzip";

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
}

export interface EpubBook {
  title: string | null;
  spine: EpubSpineItem[];
  toc: EpubTocEntry[];
  limits: EpubLimits;
  readBytes: (path: string) => Uint8Array | null;
  mediaTypeOf: (path: string) => string;
}

export const EPUB_MIME_TYPE = "application/epub+zip";

/** mime 优先；旧文件可能是 application/octet-stream，所以同时认 .epub 扩展名。 */
export const isEpubFile = (item: {
  title?: unknown;
  originalName?: unknown;
  mimeType?: unknown;
}): boolean => {
  const mime =
    typeof item.mimeType === "string" ? item.mimeType.trim().toLowerCase() : "";
  if (mime === EPUB_MIME_TYPE) return true;
  return [item.title, item.originalName].some(
    (name) => typeof name === "string" && name.trim().toLowerCase().endsWith(".epub")
  );
};

/**
 * 只有「文件类」空间条目才会打开阅读器：type 为 file 且 contentKey 是 file- 键。
 * 否则标题恰好以 .epub 结尾的页面 / 对话 / 应用会同时命中别的预览分支。
 */
export const isEpubReaderTarget = (item: {
  type?: unknown;
  contentKey?: unknown;
  title?: unknown;
  originalName?: unknown;
  mimeType?: unknown;
}): boolean =>
  typeof item.type === "string" &&
  item.type.toLowerCase() === "file" &&
  typeof item.contentKey === "string" &&
  item.contentKey.startsWith("file-") &&
  isEpubFile(item);

/**
 * 阅读器 iframe 的 sandbox。章节里不再有任何脚本（宿主 CSP 没有 unsafe-inline，
 * 内联桥接脚本在线上会被拦），所以连 allow-scripts 都不给；更不能给 allow-same-origin。
 */
export const EPUB_READER_SANDBOX = "";

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

const parseNavToc = (
  html: string,
  navPath: string
): Array<{ title: string; path: string; fragment: string }> => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const navs = Array.from(doc.getElementsByTagName("nav"));
  const tocNav =
    navs.find((nav) => (nav.getAttribute("epub:type") ?? "").split(/\s+/).includes("toc")) ??
    navs[0];
  if (!tocNav) return [];
  const out: Array<{ title: string; path: string; fragment: string }> = [];
  for (const a of Array.from(tocNav.getElementsByTagName("a"))) {
    const href = a.getAttribute("href");
    if (!href) continue;
    const path = resolveZipPath(navPath, href);
    if (path === null) continue;
    out.push({ title: collapse(a.textContent), path, fragment: fragmentOf(href) });
  }
  return out;
};

const parseNcxToc = (
  xml: string,
  ncxPath: string
): Array<{ title: string; path: string; fragment: string }> => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return [];
  const out: Array<{ title: string; path: string; fragment: string }> = [];
  for (const point of byLocalName(doc, "navPoint")) {
    const content = Array.from(point.children).find((c) => c.localName === "content");
    const src = content?.getAttribute("src");
    if (!src) continue;
    const path = resolveZipPath(ncxPath, src);
    if (path === null) continue;
    const label = Array.from(point.children).find((c) => c.localName === "navLabel");
    out.push({ title: collapse(label?.textContent), path, fragment: fragmentOf(src) });
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

  const readBytes = (path: string): Uint8Array | null => {
    const entry = zip.file(path) ?? zip.file(safeDecode(path));
    return entry ? entry.asUint8Array() : null;
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
  let rawToc: Array<{ title: string; path: string; fragment: string }> = [];
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
    readBytes,
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
        const bytes = importPath ? book.readBytes(importPath) : null;
        return bytes && importPath
          ? inlineCss(book, decodeText(bytes), importPath, budget, depth + 1)
          : "";
      }
    );
  }
  return result.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, _quote: string, ref: string) => {
    // data: 已内联；#id 是 SVG 片段引用（fill:url(#g)），指向文档内部，必须原样保留。
    if (ref.startsWith("data:") || isFragmentOnlyRef(ref)) return match;
    const resourcePath = resolveZipPath(cssPath, ref);
    const bytes = resourcePath ? book.readBytes(resourcePath) : null;
    if (!resourcePath || !bytes) return "url()";
    const dataUrl = bytesToDataUrl(bytes, book.mediaTypeOf(resourcePath));
    spend(budget, dataUrl.length);
    return `url("${dataUrl}")`;
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
  const bytes = path ? book.readBytes(path) : null;
  if (!path || !bytes) return null;
  const dataUrl = bytesToDataUrl(bytes, book.mediaTypeOf(path));
  spend(budget, dataUrl.length);
  return dataUrl;
};

const BASE_STYLE =
  "html{background:#fff;color:#1a1a1a}body{max-width:42em;margin:0 auto;padding:1.5rem 1.25rem 4rem;" +
  "font-family:Georgia,'Noto Serif',serif;line-height:1.75;overflow-wrap:anywhere}" +
  "img,svg,video{max-width:100%;height:auto}" +
  "a[data-epub-link]{color:inherit;text-decoration:underline dotted;pointer-events:none;cursor:default}";

export interface BuildChapterOptions {
  /** 覆盖默认的单章输出上限（字符数）。 */
  maxOutputChars?: number;
}

/**
 * 生成一份自包含的章节 HTML（零脚本）：
 *  - 去掉书里自带的 script / iframe / object / embed / base / form 与事件属性，
 *  - 样式表、图片、字体全部内联为 data URL；注入的 CSS 做 `</style` 等边界转义，
 *  - 所有链接一律去掉 href，改成不可点的文本样式（v1 没有帧内脚本，无法拦截站内跳转，
 *    也不让外链把帧导航走；用户通过目录或上一章/下一章翻页），
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
      const cssBytes = cssPath ? book.readBytes(cssPath) : null;
      if (cssPath && cssBytes) {
        const style = doc.createElement("style");
        style.textContent = escapeCssForStyleElement(
          inlineCss(book, decodeText(cssBytes), cssPath, budget)
        );
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
  const base = doc.createElement("style");
  base.textContent = BASE_STYLE;
  head.prepend(charset, csp, base);

  const output = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
  if (output.length > maxOutputChars) {
    throw new EpubError("chapter-too-large", "Chapter is too large to render");
  }
  return output;
};
