import { existsSync, readFileSync, statSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";
import { toErrorMessage } from "core/errorMessage";
import { compressImage } from "./compressImage";
import { themeText } from "./theme";
import { resolveCliColorEnabled } from "../client/terminalStyles";

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"] as const;
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];

const IMAGE_EXTENSION_SET = new Set<string>(IMAGE_EXTENSIONS.map((ext) => ext.toLowerCase()));

const MIME_BY_EXTENSION: Record<ImageExtension, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Phase A 默认大小上限。
 * 8 MB 是经验值:大部分截图 < 5 MB,iPhone HEIC 导出 jpg < 4 MB,
 * base64 编码后约 11 MB JSON payload,不会让 fetch / stream 卡顿。
 * 超出后会被静默忽略并提示(每个 path 在当前 session 内只提示一次)。
 */
/**
 * 单图硬上限（压缩后仍超限则拒绝发送）。
 * 图片以 base64 内联进消息体（+33% 膨胀），且请求体会叠加完整对话历史；上限过大时
 * 长上下文对话极易撞平台边缘网关的单请求体上限（413 FUNCTION_PAYLOAD_TOO_LARGE）。
 * 正常图片经 compressImage 收敛到 TARGET_IMAGE_BYTES (1.5MB) 内，此处 4MB 是兜底拒绝线。
 */
export const DEFAULT_MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type AttachedImage = {
  dataUrl: string;
  mime: string;
  filename: string;
  sizeBytes: number;
  sourcePath: string;
  originalSizeBytes?: number;
};

export type DetectedImageToken = {
  /** 原始 paste 进来的 token,保留 \ 转义形式,用于 stripImageTokens 在原 input 里匹配 */
  raw: string;
  /** 反斜杠转义解析后的字面值,用于 existsSync / 扩展名判定 / readFile */
  resolvedPath: string;
  /**
   * 图片扩展名命中但文件探测失败（不存在 / 无读权限，如 macOS tccd 拦了
   * 截图临时目录）。statSync 同时覆盖两种失败且不细分（对调用方的兜底
   * 语义等价：用户意图都是要发这张图），由 dispatch 层决定剪贴板兜底或
   * 提示；探测通过的既有路径不带此字段（undefined）。
   */
  unreadable?: boolean;
};

export type ImageReadErrorCode =
  | "not-found"
  | "is-directory"
  | "permission-denied"
  | "too-large"
  | "unsupported-extension"
  | "io-error";

export class ImageReadError extends Error {
  readonly code: ImageReadErrorCode;
  readonly path: string;
  constructor(code: ImageReadErrorCode, path: string, message: string) {
    super(message);
    this.code = code;
    this.path = path;
    this.name = "ImageReadError";
  }
}

function extnameOf(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const base = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

function basenameOf(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return slash >= 0 ? path.slice(slash + 1) : path;
}

/**
 * 判断当前是否运行在 WSL 环境。
 * 判定依据(任一命中即视为 WSL):
 * - WSL_DISTRO_NAME 环境变量存在
 * - /proc/version 内容含 "microsoft"(大小写不敏感)
 * 探测失败(如文件不可读)保守返回 false,避免在非 WSL 上误映射路径。
 * 纯函数、只读,不写文件。可被测试注入覆盖。
 */
export function isWslEnvironment(): boolean {
  if (process.env.WSL_DISTRO_NAME) return true;
  try {
    const version = readFileSync("/proc/version", "utf8");
    return /microsoft/i.test(version);
  } catch {
    return false;
  }
}

const WINDOWS_DRIVE_RE = /^([a-zA-Z]):[\\/](.*)$/s;

/**
 * 把 Windows 绝对路径(C:\Users\me\a.png)映射为 WSL 挂载路径
 * (/mnt/c/Users/me/a.png)。盘符小写,反斜杠转正斜杠,多余分隔符折叠。
 * 非 Windows 绝对路径(不以盘符开头)原样返回,保持幂等。
 */
export function mapWindowsPathToWsl(rawPath: string): string {
  const m = WINDOWS_DRIVE_RE.exec(rawPath);
  if (!m) return rawPath;
  const drive = m[1]!.toLowerCase();
  const rest = m[2]!.replace(/[\\/]+/g, "/");
  return `/mnt/${drive}/${rest}`.replace(/\/+/g, "/");
}

/**
 * 把 file:// URI 解析为本地文件路径。
 * - 剥离 file:// 前缀
 * - 处理 file:///path 与 file://localhost/path(host 部分忽略)
 * - 对路径段做 percent-decoding(%20→空格、UTF-8 字节序列→中文等)
 * 非 file:// 输入返回 null;无法解码的非法百分号序列保守返回原样(不抛错,
 * 让后续存在性校验自行判定)。 */
export function fileUriToPath(rawPath: string): string | null {
  if (!/^file:\/\//i.test(rawPath)) return null;
  const rest = rawPath.slice("file://".length);
  const slash = rest.indexOf("/");
  if (slash < 0) return null; // 没有路径部分,不是合法 file URI
  const pathPart = rest.slice(slash);
  try {
    return decodeURIComponent(pathPart);
  } catch {
    return pathPart;
  }
}

/**
 * 把 `~` 展开成用户家目录,绝对路径保持原样,相对路径基于 cwd 解析。
 * 不会做 file:// 或 URL 解码,留给上层 detectImagePaths。
 */
export function resolveImageSource(rawPath: string, cwd: string): string {
  let candidate = rawPath.trim();
  if (!candidate) return candidate;
  if (candidate === "~") return homedir();
  if (candidate.startsWith("~/") || candidate.startsWith("~\\")) {
    return homedir() + candidate.slice(1);
  }
  if (isAbsolute(candidate)) return candidate;
  return resolve(cwd, candidate);
}

function isImagePath(path: string): boolean {
  return IMAGE_EXTENSION_SET.has(extnameOf(path));
}

/**
 * 同步探测路径是否可读（存在且有读权限）。
 * 不能用 existsSync：它对「不存在」和「权限不足」都返回 false，而这个
 * 探测结果要透传给调用方做剪贴板兜底——必须基于真实 syscall 结果，否则
 * 探测本身就会掩盖权限问题。不细分两种失败原因：对兜底语义二者等价。
 */
function isReadableFilePath(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 从一行输入里检测可能作为 image attachment 的 token。
 *
 * 规则(平衡考虑):
 * - 必须是图片扩展名 (png/jpg/jpeg/gif/webp),其他文件不抽
 * - 必须存在(用 existsSync 探测,快速失败)
 * - 一行内可能有多个路径,按 token 拆分,不解析上下文
 * - 引号("...","'...")包住的整段当一段处理,避免切到中间
 * - 反斜杠转义(`\ `, `\\`)按 shell 风格解析(iTerm2 / WezTerm 默认 paste 行为)
 * - ~/xxx、/abs、./xxx、../xxx 都解析;不是图片扩展名时返回空数组
 *
 * 不做 image MIME 嗅探(binary 文件头):iTerm2/WezTerm 拖图走的
 * 是绝对路径,不是 inline base64,这里只关心路径这一层。
 *
 * 可选第三个参数 `opts.wsl` 注入 WSL 判定(测试用),缺省走 isWslEnvironment()。
 * 在 WSL 下把 Windows 盘符路径(C:\...)映射为 /mnt/<盘符>/...,再把
 * file:// URI percent-decode 成普通路径,随后走统一解析链路。
 */
export function detectImagePaths(
  line: string,
  cwd: string,
  opts: { wsl?: boolean } = {}
): DetectedImageToken[] {
  const wsl = opts.wsl ?? isWslEnvironment();
  const tokens = tokenizePasteLine(line);
  const out: DetectedImageToken[] = [];
  for (const token of tokens) {
    if (!token.raw) continue;
    let candidate = token.decoded;
    const uriPath = fileUriToPath(candidate);
    if (uriPath !== null) candidate = uriPath;
    if (wsl) candidate = mapWindowsPathToWsl(candidate);
    const resolved = resolveImageSource(candidate, cwd);
    if (!isImagePath(resolved)) continue;
    if (!isReadableFilePath(resolved)) {
      // 读不到（不存在 / macOS tccd 沙盒拒了 TemporaryItems 等）也要带回去，
      // 让 dispatch 层决定剪贴板兜底或提示；静默丢弃会让用户误以为路径已生效。
      out.push({ raw: token.raw, resolvedPath: resolved, unreadable: true });
      continue;
    }
    out.push({ raw: token.raw, resolvedPath: resolved });
  }
  return out;
}

type Tokenized = { raw: string; decoded: string };

/**
 * 把 paste 行切成 token,支持 shell-style 反斜杠转义。
 *
 * 兼容 iTerm2 / WezTerm 在 paste 文件路径时把空格转义成 `\ `
 * 的默认行为。如果不做这一步,中文 / 含空格的 Finder 文件名会被切碎。
 *
 * - `\ ` `\\` `\"` `\'` 都按 bash 风格解码(字面 char)
 * - `"..."` `'...'` 内的 token 不再拆分空格
 * - 引号外用空白分隔
 *
 * 返回 { raw, decoded } 配对:`raw` 保留原始(用于 stripImageTokens 在
 * 原 input 上做 regex replace),`decoded` 是 escape 解析后的字面
 * 路径(用于 existsSync / readFile)。
 */
function tokenizePasteLine(line: string): Tokenized[] {
  const tokens: Tokenized[] = [];
  let rawBuf = "";
  let decBuf = "";
  let quote: string | null = null;

  const push = () => {
    if (rawBuf.length > 0) {
      tokens.push({ raw: rawBuf, decoded: decBuf });
      rawBuf = "";
      decBuf = "";
    }
  };

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (quote) {
      if (ch === "\\" && next !== undefined) {
        rawBuf += ch + next;
        decBuf += next;
        i++;
        continue;
      }
      if (ch === quote) {
        quote = null;
        rawBuf += ch;
        continue;
      }
      rawBuf += ch;
      decBuf += ch;
      continue;
    }

    // 引号外:反斜杠 + 空白 → 合并 token(iTerm2 / WezTerm paste 行为)
    if (ch === "\\" && next !== undefined && /\s/.test(next)) {
      rawBuf += ch + next;
      decBuf += next;
      i++;
      continue;
    }
    // 引号外:双反斜杠 → 单反斜杠
    if (ch === "\\" && next === "\\") {
      rawBuf += "\\\\";
      decBuf += "\\";
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      rawBuf += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      push();
      continue;
    }
    rawBuf += ch;
    decBuf += ch;
  }
  push();
  return tokens;
}

/**
 * 把图片读成 base64 data URL,做大小/MIME 校验。
 * 错误用 ImageReadError 表达,调用方按 code 决定提示方式。
 */
export async function readImageAsDataUrl(
  absolutePath: string,
  options: { maxBytes?: number } = {}
): Promise<AttachedImage> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES;

  let stats;
  try {
    stats = await stat(absolutePath);
  } catch (error) {
    throw classifyFsError(error, absolutePath);
  }
  if (stats.isDirectory()) {
    throw new ImageReadError(
      "is-directory",
      absolutePath,
      `path is a directory, not an image: ${absolutePath}`
    );
  }
  const ext = extnameOf(absolutePath) as ImageExtension | "";
  if (!ext || !(IMAGE_EXTENSION_SET.has(ext))) {
    throw new ImageReadError(
      "unsupported-extension",
      absolutePath,
      `unsupported image extension: .${ext || "(none)"}`
    );
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(absolutePath);
  } catch (error) {
    throw classifyFsError(error, absolutePath);
  }

  const rawMime = MIME_BY_EXTENSION[ext as ImageExtension];
  const compressResult = await compressImage(buffer, rawMime);
  const finalBuffer = compressResult.buffer;
  const finalMime = compressResult.mime;
  const finalSizeBytes = finalBuffer.byteLength;

  if (finalSizeBytes > maxBytes) {
    throw new ImageReadError(
      "too-large",
      absolutePath,
      `image too large: ${formatBytes(finalSizeBytes)} (limit ${formatBytes(maxBytes)})`
    );
  }

  return buildAttachedImage({
    buffer: finalBuffer,
    mime: finalMime,
    filename: basenameOf(absolutePath),
    sourcePath: absolutePath,
    originalSizeBytes: compressResult.compressed ? compressResult.originalBytes : undefined,
  });
}

function classifyFsError(error: unknown, path: string): ImageReadError {
  const code = (error as { code?: string } | null)?.code;
  const message = toErrorMessage(error);
  switch (code) {
    case "ENOENT":
      return new ImageReadError("not-found", path, `image not found: ${path}`);
    case "EACCES":
    case "EPERM":
      return new ImageReadError(
        "permission-denied",
        path,
        `cannot read image (permission denied): ${path}`
      );
    case "EISDIR":
      return new ImageReadError(
        "is-directory",
        path,
        `path is a directory, not an image: ${path}`
      );
    default:
      return new ImageReadError("io-error", path, `failed to read image: ${message}`);
  }
}

/**
 * 构造 AttachedImage 结构体。
 */
export function buildAttachedImage(params: {
  buffer: Uint8Array | Buffer;
  mime: string;
  filename: string;
  sourcePath: string;
  originalSizeBytes?: number;
}): AttachedImage {
  const sizeBytes = params.buffer.byteLength;
  const base64 = Buffer.from(params.buffer).toString("base64");
  const dataUrl = `data:${params.mime};base64,${base64}`;
  return {
    dataUrl,
    mime: params.mime,
    filename: params.filename,
    sizeBytes,
    sourcePath: params.sourcePath,
    ...(typeof params.originalSizeBytes === "number" && params.originalSizeBytes > sizeBytes
      ? { originalSizeBytes: params.originalSizeBytes }
      : {}),
  };
}

/**
 * 格式化图片体积大小及压缩变更说明。
 */
export function describeImageSize(
  img: Pick<AttachedImage, "sizeBytes" | "originalSizeBytes">,
  options: { prefix?: boolean } = {}
): string {
  const isCompressed = typeof img.originalSizeBytes === "number" && img.originalSizeBytes > img.sizeBytes;
  const core = isCompressed
    ? `${formatBytes(img.sizeBytes)} (已压缩 ${formatBytes(img.originalSizeBytes!)} → ${formatBytes(img.sizeBytes)})`
    : formatBytes(img.sizeBytes);
  return options.prefix ? `Size: ${core}` : core;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function summarizeAttachment(img: AttachedImage): string {
  const colorEnabled = resolveCliColorEnabled();

  const sizeText = describeImageSize(img, { prefix: true });

  const titleRaw = "📷 [Attached Image]";
  const nameRaw = `Name: ${img.filename}`;

  const boxWidth = Math.max(40, titleRaw.length + 4, nameRaw.length + 4, sizeText.length + 4);
  const border = "┌" + "─".repeat(boxWidth - 2) + "┐";
  const bottom = "└" + "─".repeat(boxWidth - 2) + "┘";

  const padLine = (content: string) => {
    const padded = content.padEnd(boxWidth - 4, " ");
    return `│ ${padded} │`;
  };

  const title = padLine(titleRaw);
  const name = padLine(nameRaw);
  const size = padLine(sizeText);

  const text = [
    border,
    title,
    name,
    size,
    bottom
  ].join("\n");

  return themeText(text, "chrome", colorEnabled);
}

/**
 * 格式化多张已读图片附件的聚合摘要卡片。
 * 当图片 ≥ 2 张时，聚合为紧凑的列表面板，避免多张图片连环刷屏占满视口。
 */
export function summarizeAttachments(images: AttachedImage[]): string {
  if (images.length === 0) return "";
  if (images.length === 1) return summarizeAttachment(images[0]!);

  const colorEnabled = resolveCliColorEnabled();
  const totalBytes = images.reduce((acc, img) => acc + img.sizeBytes, 0);
  const titleText = `📷 Attached ${images.length} Images (${formatBytes(totalBytes)})`;

  const rowsData = images.map((img, i) => {
    const num = `${i + 1}. `;
    const size = describeImageSize(img);
    return { num, size, filename: img.filename };
  });

  const boxWidth = Math.max(
    48,
    ...rowsData.map((r) => r.filename.length + r.num.length + r.size.length + 6),
    titleText.length + 6,
  );
  const innerWidth = boxWidth - 4;

  const top = "┌─ " + titleText + " " + "─".repeat(Math.max(0, boxWidth - titleText.length - 5)) + "┐";
  const bottom = "└" + "─".repeat(boxWidth - 2) + "┘";

  const rows = rowsData.map(({ num, size, filename }) => {
    const availableNameWidth = Math.max(10, innerWidth - num.length - size.length - 2);
    let name = filename;
    if (name.length > availableNameWidth) {
      name = name.slice(0, availableNameWidth - 3) + "...";
    }
    const gap = " ".repeat(Math.max(1, innerWidth - num.length - name.length - size.length));
    return `│ ${num}${name}${gap}${size} │`;
  });

  const text = [top, ...rows, bottom].join("\n");
  return themeText(text, "chrome", colorEnabled);
}

/**
 * Composer 附件条文本：`📎 <filename> (<size>)`，逗号分隔。
 *
 * ≤2 张全列；更多张列前 2 张 + `+N`。超终端宽的截断由 composer 的
 * fitAnsiLine 负责（这里不做宽度计算，避免引入与终端状态耦合的逻辑）。
 * 无附件返回 null（composer 据此隐藏附件行）。纯函数，便于单元测试。
 */
export function formatComposerAttachmentLine(
  images: AttachedImage[],
): string | null {
  if (images.length === 0) return null;
  const head = images
    .slice(0, 2)
    .map((img) => `📎 ${img.filename} (${formatBytes(img.sizeBytes)})`);
  const extra = images.length - head.length;
  return extra > 0 ? `${head.join(", ")} +${extra}` : head.join(", ");
}

/**
 * Backspace 撤销附件：弹出最后一张（最新贴的在后）。
 *
 * 空数组返回 handled=false（没有可撤销的附件，调用方保持普通退格语义）。
 * 纯函数，便于单元测试。
 */
export function popLastAttachedImage(
  images: AttachedImage[],
): { handled: boolean; images: AttachedImage[]; removed?: AttachedImage } {
  if (images.length === 0) return { handled: false, images };
  return {
    handled: true,
    images: images.slice(0, -1),
    removed: images[images.length - 1],
  };
}

/**
 * 合并已存的附件和刚读到的新附件,按 sourcePath 去重。
 *
 * 语义:
 * - 同 sourcePath 的项,incoming 覆盖 existing(让 chat 路径重读后的 dataUrl 生效)
 * - 顺序:existing 中独有的项保持原位,新项(incoming 中独有的 + 被覆盖的项)按
 *   出现顺序追加到末尾
 *
 * 纯函数,无副作用,容易测试。
 */
export function mergeAttachedImages(
  existing: AttachedImage[],
  incoming: AttachedImage[]
): AttachedImage[] {
  if (incoming.length === 0) return existing;
  if (existing.length === 0) return [...incoming];
  const incomingByPath = new Map<string, AttachedImage>();
  for (const img of incoming) incomingByPath.set(img.sourcePath, img);
  const out: AttachedImage[] = [];
  const seen = new Set<string>();
  for (const img of existing) {
    if (seen.has(img.sourcePath)) continue;
    const override = incomingByPath.get(img.sourcePath);
    out.push(override ?? img);
    seen.add(img.sourcePath);
  }
  for (const img of incoming) {
    if (seen.has(img.sourcePath)) continue;
    out.push(img);
    seen.add(img.sourcePath);
  }
  return out;
}

/**
 * 批量读图片:逐个 readImageAsDataUrl,把成功的放进 images,失败路径放进 failures。
 * 失败路径默认每个只回调一次(避免一行里同一 path 报两次)。
 *
 * 用法:
 * - chat 路径:paths 已经是绝对路径,不需要 resolve
 * - 用户直接输入的路径:传 resolve 把 ~ / 相对路径解析成绝对路径
 *
 * 这个 helper 把"读 + 报错提示 + dedupe 失败"集中处理,workspace 不需要再写 try/catch 循环。
 */
export type ReadImagePathsOptions = {
  resolve?: (raw: string) => string;
  onSuccess?: (img: AttachedImage) => void;
  onFailure?: (resolvedPath: string, error: Error) => void;
  maxBytes?: number;
};

export type ReadImagePathsResult = {
  images: AttachedImage[];
  failures: string[];
};

export async function readImagePaths(
  paths: string[],
  options: ReadImagePathsOptions = {}
): Promise<ReadImagePathsResult> {
  const resolve = options.resolve ?? ((p: string) => p);
  const reportedFailures = new Set<string>();
  const images: AttachedImage[] = [];
  const failures: string[] = [];
  for (const raw of paths) {
    const absolute = resolve(raw);
    try {
      const img = await readImageAsDataUrl(absolute, {
        ...(options.maxBytes !== undefined ? { maxBytes: options.maxBytes } : {}),
      });
      images.push(img);
      options.onSuccess?.(img);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (!reportedFailures.has(absolute)) {
        reportedFailures.add(absolute);
        failures.push(absolute);
        options.onFailure?.(absolute, err);
      }
    }
  }
  return { images, failures };
}

export type ResolveAttachmentImageUrlsInput = {
  /** chat action 内联检测到的图片路径（可能为空） */
  actionImagePaths?: string[];
  /** state 里本轮待发送的暂存附件 */
  attachedImages: AttachedImage[];
  /** 图片读取失败时的回调（调用方借此向 output 输出 [nolo] image skipped） */
  onFailure?: (resolvedPath: string, error: Error) => void;
};

export type ResolveAttachmentImageUrlsResult = {
  /** 已读成 dataUrl 的图片列表，供 agent turn 消费 */
  imageUrls: string[];
};

/**
 * 收集本轮待发送图片路径（chat action 内联路径 + state 暂存附件）→ 统一读取为
 * dataUrl。与附件读取逻辑共居本文件（readImagePaths 的所有者），贴近既有内聚；
 * 失败回调通过 onFailure 交由调用方决定如何写入，因此本函数不依赖具体的
 * output writer 类型，也便于在 readlineWorkspace.ts 之外复用/单独测试。
 */
export async function resolveAttachmentImageUrls({
  actionImagePaths,
  attachedImages,
  onFailure,
}: ResolveAttachmentImageUrlsInput): Promise<ResolveAttachmentImageUrlsResult> {
  const pathsToRead = [
    ...(actionImagePaths ?? []),
    ...attachedImages.map((img) => img.sourcePath),
  ];
  let imageUrls: string[] = [];
  if (pathsToRead.length > 0) {
    const readResult = await readImagePaths(pathsToRead, {
      onFailure,
    });
    imageUrls = readResult.images.map((img) => img.dataUrl);
  }
  return { imageUrls };
}