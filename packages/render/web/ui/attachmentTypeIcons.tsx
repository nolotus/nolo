// attachmentTypeIcons.tsx
// Lightweight resolver for the *file kind* icon of an attachment row.
//
// Scope: the shared type-identity truth (`render/web/ui/sidebarTypeIcons.tsx`)
// only knows the "attachment" identity (paperclip) and stays unchanged — the
// attachment entry keeps its paperclip. This module resolves the finer
// "which kind of file is this" question for file rows:
//
//   image / video / audio / pdf / document / spreadsheet / archive / code / unknown
//
// Resolution order (most reliable first):
//   1. mimeType     — server-side truth about the bytes.
//   2. fileCategory — coarse backend bucket
//      ("image" | "video" | "audio" | "document" | "other"). The "document"
//      bucket is refined by the extension, because one bucket holds
//      PDF / spreadsheet / archive / code.
//   3. originalName extension — a *display* hint only.
//
// The extension never decides what a file "is" (no content sniffing, no
// safety verdict): a hostile file name can only pick an icon.

import type { IconType } from "react-icons";
import {
  PiImage,
  PiVideoCamera,
  PiFileAudio,
  PiFilePdf,
  PiFileText,
  PiFileXls,
  PiFileZip,
  PiFileCode,
  PiFile,
} from "react-icons/pi";

export type AttachmentIconKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "archive"
  | "code"
  | "unknown";

/** Phosphor icon per file kind. */
export const ATTACHMENT_KIND_ICONS: Record<AttachmentIconKind, IconType> = {
  image: PiImage,
  video: PiVideoCamera,
  audio: PiFileAudio,
  pdf: PiFilePdf,
  document: PiFileText,
  spreadsheet: PiFileXls,
  archive: PiFileZip,
  code: PiFileCode,
  unknown: PiFile,
};

export type AttachmentIconInput = {
  mimeType?: string | null;
  fileCategory?: string | null;
  originalName?: string | null;
};

/** Row types that carry a file (see `ITEM_ICONS` in create/space/sidebarItemShared). */
const ATTACHMENT_ROW_TYPES = new Set(["image", "doc", "file"]);

export const isAttachmentRowType = (type: string): boolean =>
  ATTACHMENT_ROW_TYPES.has(type);

const MIME_KIND_RULES: { kind: AttachmentIconKind; test: (mime: string) => boolean }[] = [
  { kind: "image", test: (m) => m.startsWith("image/") },
  { kind: "video", test: (m) => m.startsWith("video/") },
  { kind: "audio", test: (m) => m.startsWith("audio/") },
  { kind: "pdf", test: (m) => m === "application/pdf" },
  {
    kind: "spreadsheet",
    test: (m) =>
      m === "text/csv" ||
      m === "text/tab-separated-values" ||
      m === "application/vnd.ms-excel" ||
      m.includes("spreadsheetml") ||
      m.includes("opendocument.spreadsheet"),
  },
  {
    kind: "archive",
    test: (m) =>
      /(^|\/)(x-)?(zip|rar|7z|gzip|x-gzip|x-tar|x-bzip2?|x-xz|x-compress)$/.test(m) ||
      m === "application/zip" ||
      m === "application/x-tar" ||
      m === "application/gzip",
  },
  {
    kind: "code",
    test: (m) =>
      m === "application/json" ||
      m === "application/xml" ||
      m === "text/xml" ||
      m === "application/javascript" ||
      m === "text/javascript" ||
      m === "text/typescript" ||
      m === "application/typescript" ||
      m === "text/x-python" ||
      m === "application/x-sh" ||
      m === "application/sql" ||
      m === "text/html",
  },
  {
    kind: "document",
    test: (m) =>
      m === "text/plain" ||
      m === "application/msword" ||
      m === "application/rtf" ||
      m === "application/vnd.oasis.opendocument.text" ||
      m === "application/vnd.ms-powerpoint" ||
      (m.startsWith("application/vnd.openxmlformats-officedocument") &&
        !m.includes("spreadsheetml")) ||
      m.startsWith("application/vnd.oasis.opendocument."),
  },
];

/** Extension → kind. Display hint only. */
const EXTENSION_KINDS: Record<string, AttachmentIconKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image",
  bmp: "image", svg: "image", ico: "image", avif: "image", heic: "image",
  tif: "image", tiff: "image",
  mp4: "video", mov: "video", mkv: "video", avi: "video", webm: "video",
  m4v: "video", mpg: "video", mpeg: "video",
  mp3: "audio", wav: "audio", ogg: "audio", flac: "audio", m4a: "audio",
  aac: "audio", opus: "audio", weba: "audio",
  pdf: "pdf",
  xls: "spreadsheet", xlsx: "spreadsheet", csv: "spreadsheet",
  tsv: "spreadsheet", ods: "spreadsheet", numbers: "spreadsheet",
  zip: "archive", tar: "archive", gz: "archive", tgz: "archive", rar: "archive",
  "7z": "archive", bz2: "archive", xz: "archive",
  ts: "code", tsx: "code", js: "code", jsx: "code", mjs: "code", cjs: "code",
  json: "code", py: "code", rs: "code", go: "code", java: "code", c: "code",
  h: "code", cpp: "code", hpp: "code", cs: "code", rb: "code", php: "code",
  swift: "code", kt: "code", scala: "code", sh: "code", bash: "code",
  zsh: "code", sql: "code", html: "code", htm: "code", css: "code",
  scss: "code", vue: "code", svelte: "code", yaml: "code", yml: "code",
  toml: "code", xml: "code",
  txt: "document", doc: "document", docx: "document", odt: "document",
  rtf: "document", md: "document", ppt: "document", pptx: "document",
  pages: "document", log: "document",
};

const normalizeExtension = (name?: string | null): string | null => {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const match = /\.([a-z0-9]{1,12})$/i.exec(trimmed);
  return match ? match[1].toLowerCase() : null;
};

const extensionKind = (name?: string | null): AttachmentIconKind | null => {
  const ext = normalizeExtension(name);
  if (!ext) return null;
  return EXTENSION_KINDS[ext] ?? null;
};

/** Resolve the file kind of an attachment. Never throws on odd input. */
export const resolveAttachmentIconKind = (
  input: AttachmentIconInput
): AttachmentIconKind => {
  const mime =
    typeof input.mimeType === "string" ? input.mimeType.trim().toLowerCase() : "";
  // `application/octet-stream` carries no type information: fall through to the
  // coarser signals instead of claiming "unknown".
  if (mime && mime !== "application/octet-stream") {
    for (const rule of MIME_KIND_RULES) {
      if (rule.test(mime)) return rule.kind;
    }
  }

  const category =
    typeof input.fileCategory === "string" ? input.fileCategory.trim().toLowerCase() : "";
  const byExtension = extensionKind(input.originalName);

  if (category === "image") return "image";
  if (category === "video") return "video";
  if (category === "audio") return "audio";
  if (category === "document") return byExtension ?? "document";
  if (byExtension) return byExtension;
  return "unknown";
};

/**
 * Read attachment metadata out of an unknown value (e.g. a cached entity
 * record). Missing / non-string fields are simply absent, so a partially
 * populated record still resolves.
 */
export const attachmentMetaFromUnknown = (value: unknown): AttachmentIconInput => {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const pick = (key: string): string | undefined =>
    typeof record[key] === "string" ? (record[key] as string) : undefined;
  return {
    mimeType: pick("mimeType"),
    fileCategory: pick("fileCategory"),
    originalName: pick("originalName"),
  };
};

/**
 * Icon for a file kind. `unknown` maps to the generic file icon — the
 * attachment *entry* keeps its paperclip (see `sidebarTypeIcons.tsx`), but a
 * file row without usable metadata shows the generic file glyph.
 */
export const attachmentIconForKind = (kind: AttachmentIconKind): IconType =>
  ATTACHMENT_KIND_ICONS[kind];
