import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { readdir, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compressImage, mimeToExtension } from "./compressImage";
import {
  type AttachedImage,
  buildAttachedImage,
  DEFAULT_MAX_IMAGE_BYTES,
  formatBytes,
} from "./pasteImage";

export type ClipboardImageErrorCode =
  | "remote-session"
  | "binary-missing"
  | "empty-clipboard"
  | "unsupported-platform"
  | "too-large"
  | "read-failed";

export class ClipboardImageError extends Error {
  readonly code: ClipboardImageErrorCode;
  constructor(code: ClipboardImageErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ClipboardImageError";
  }
}

export type ClipboardImageDeps = {
  env?: Record<string, string | undefined>;
  platform?: NodeJS.Platform;
  which?: (bin: string) => string | null;
  spawn?: typeof Bun.spawn;
  tempDir?: string;
  maxBytes?: number;
  timeoutMs?: number;
};

/** 剪贴板子进程默认读取超时（毫秒）。到期后 kill 进程并按可读错误降级。 */
export const DEFAULT_CLIPBOARD_TIMEOUT_MS = 30_000;

/** nolo 剪贴板临时文件的落盘目录名（`<tmpdir>/nolo-clipboard`）。 */
const CLIPBOARD_TEMP_DIR_NAME = "nolo-clipboard";

export function getDefaultClipboardTempDir(): string {
  return join(tmpdir(), CLIPBOARD_TEMP_DIR_NAME);
}

/** clip-* 临时文件的最大保留年龄：24 小时（US-5.7）。 */
export const CLIPBOARD_SWEEP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** 只清 readClipboardImage 确定性命名产出的 clip-* 文件；其余文件一律不动。 */
const CLIPBOARD_SWEEP_FILE_RE = /^clip-[0-9a-f]{8,}\.(png|jpg|jpeg|gif|webp)$/;

/**
 * 清扫 `<tmpdir>/nolo-clipboard` 里过期的 clip-* 临时文件（US-5.7）。
 *
 * 只匹配 readClipboardImage 的确定性命名（`clip-<hash>.<ext>`）且 mtime 早于
 * `now - maxAgeMs`（默认 24h）的文件；返回成功删除数。目录不存在返回 0；
 * 所有错误一律吞掉——清理失败绝不能影响 TUI 运行。`now` 可注入便于测试。
 */
export async function sweepStaleClipboardFiles(
  tempDir: string,
  opts: { maxAgeMs?: number; now?: number } = {},
): Promise<number> {
  try {
    const maxAgeMs = opts.maxAgeMs ?? CLIPBOARD_SWEEP_MAX_AGE_MS;
    const now = opts.now ?? Date.now();
    const entries = await readdir(tempDir);
    let removed = 0;
    for (const name of entries) {
      if (!CLIPBOARD_SWEEP_FILE_RE.test(name)) continue;
      try {
        const fullPath = join(tempDir, name);
        const stats = await stat(fullPath);
        if (stats.mtimeMs >= now - maxAgeMs) continue;
        await unlink(fullPath);
        removed += 1;
      } catch {
        // 单个文件 stat/unlink 失败（权限/竞态）：跳过，继续清扫其余文件。
      }
    }
    return removed;
  } catch {
    // 目录不存在 / readdir 失败：视为无可清扫，绝不向上抛。
    return 0;
  }
}

/**
 * 判断当前是否处于 SSH 等远程终端会话。
 * 远程会话无法访问客户端本地系统剪贴板，应直接降级提示。
 */
export function isRemoteSession(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.SSH_CONNECTION || env.SSH_TTY || env.SSH_CLIENT);
}

/**
 * 根据当前平台与环境变量获取剪贴板读取命令及参数。
 *
 * 返回值附带 `outputFormat`：子进程 stdout 的语义。
 * - "raw"：stdout 即原始图像字节流（pngpaste / xclip / PowerShell 路径）。
 * - "osascript-hex"：stdout 是 osascript 的文本输出，需经
 *   decodeOsascriptPngHex 解码成 PNG 字节（darwin 无 pngpaste 时的兜底）。
 */
export type ClipboardImageCommand = {
  command: string[];
  outputFormat: "raw" | "osascript-hex";
};

export function getClipboardImageCommand(
  deps: ClipboardImageDeps = {},
): ClipboardImageCommand {
  const env = deps.env ?? process.env;
  const platform = deps.platform ?? process.platform;
  const which = deps.which ?? Bun.which;

  if (isRemoteSession(env)) {
    throw new ClipboardImageError(
      "remote-session",
      "远程会话无法读取本地剪贴板，请拖入图片文件或直接输入图片路径",
    );
  }

  if (platform === "darwin") {
    const pngpaste = which("pngpaste");
    if (pngpaste) {
      return { command: [pngpaste, "-"], outputFormat: "raw" };
    }
    // pngpaste 缺失不再直接失败：osascript 是 macOS 自带，读 «class PNGf»
    // 覆盖"剪贴板里是真图片数据"这一最常见场景（US：无 pngpaste 时兜底）。
    // osascript 也缺失（精简环境）才按原 binary-missing 语义报错。
    const osascript = which("osascript");
    if (!osascript) {
      throw new ClipboardImageError(
        "binary-missing",
        "未找到 pngpaste，也未找到系统自带的 osascript，无法读取剪贴板图像。请运行 brew install pngpaste 安装，或直接拖入图片文件/输入图片路径",
      );
    }
    return {
      command: [osascript, "-e", "the clipboard as «class PNGf»"],
      outputFormat: "osascript-hex",
    };
  }

  if (platform === "win32") {
    const ps =
      which("powershell.exe") ||
      which("powershell") ||
      which("pwsh.exe") ||
      which("pwsh");
    if (!ps) {
      throw new ClipboardImageError(
        "binary-missing",
        "未找到 PowerShell，无法从系统剪贴板读取图像，请直接拖入图片文件或输入图片路径",
      );
    }
    return {
      command: [
        ps,
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "$img = Get-Clipboard -Format Image; if ($img) { $ms = New-Object System.IO.MemoryStream; $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [Console]::OpenStandardOutput().Write($ms.ToArray(), 0, $ms.Length) }",
      ],
      outputFormat: "raw",
    };
  }

  if (platform === "linux") {
    const isWayland = Boolean(env.WAYLAND_DISPLAY);
    if (isWayland) {
      const wlPaste = which("wl-paste");
      if (!wlPaste) {
        throw new ClipboardImageError(
          "binary-missing",
          "未找到 wl-paste，请安装 wl-clipboard (例如 sudo apt install wl-clipboard)，或直接拖入图片文件/输入图片路径",
        );
      }
      return { command: [wlPaste, "--type", "image/png"], outputFormat: "raw" };
    }

    const xclip = which("xclip");
    if (xclip) {
      return {
        command: [xclip, "-selection", "clipboard", "-t", "image/png", "-o"],
        outputFormat: "raw",
      };
    }

    const wlPaste = which("wl-paste");
    if (wlPaste) {
      return { command: [wlPaste, "--type", "image/png"], outputFormat: "raw" };
    }

    throw new ClipboardImageError(
      "binary-missing",
      "未找到 xclip，请安装 xclip (例如 sudo apt install xclip)，或直接拖入图片文件/输入图片路径",
    );
  }

  throw new ClipboardImageError(
    "unsupported-platform",
    `当前操作系统暂不支持剪贴板图像读取: ${platform}`,
  );
}

/** osascript 无 PNG 数据/输出为空时的 empty-clipboard 文案（给可执行下一步）。 */
export const OSASCRIPT_EMPTY_CLIPBOARD_MESSAGE =
  "剪贴板中没有图像数据。可直接拖入图片文件、输入图片路径，或运行 brew install pngpaste 以支持更多图片格式";

export type OsascriptHexDecodeResult =
  | { kind: "bytes"; bytes: Uint8Array }
  | { kind: "empty" }
  | { kind: "invalid" };

/**
 * 解码 osascript `the clipboard as «class PNGf»` 的 stdout。
 *
 * 成功时输出形如 `«data PNGf89504E47…»`；剪贴板里没有 PNG 数据时 osascript
 * 以非零码退出（走调用方的 empty 分支），stdout 也可能完全没有 PNGf 标记。
 *
 * - 无 PNGf 标记 / PNGf 后无 hex → "empty"（调用方报 empty-clipboard）。
 * - hex 为奇数长度，或 PNGf 之后到结尾混入非 hex 字符（宽容匹配只取前导
 *   hex run，如 `PNGf89GH` 只取到 `89`）→ "invalid"（调用方报 read-failed）。
 * - 否则转成字节返回。
 */
export function decodeOsascriptPngHex(text: string): OsascriptHexDecodeResult {
  const match = /PNGf\s*([0-9A-Fa-f]*)/.exec(text);
  if (!match) return { kind: "empty" };
  const hex = match[1] ?? "";
  // hex run 之后直到结尾只允许空白与 osascript 的收尾引号 »，其余都算坏数据。
  const tail = text.slice(match.index + match[0].length).replace(/[\s»]*$/, "");
  if (tail.length > 0) return { kind: "invalid" };
  if (hex.length === 0) return { kind: "empty" };
  if (hex.length % 2 !== 0) return { kind: "invalid" };
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return { kind: "bytes", bytes };
}

/**
 * 从系统剪贴板读取图像字节流，保存到确定性命名的临时文件并返回 AttachedImage。
 */
export async function readClipboardImage(
  deps: ClipboardImageDeps = {},
): Promise<AttachedImage> {
  const env = deps.env ?? process.env;
  const platform = deps.platform ?? process.platform;
  const which = deps.which ?? Bun.which;
  const spawn = deps.spawn ?? Bun.spawn;
  const maxBytes = deps.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_CLIPBOARD_TIMEOUT_MS;
  const tempDir = deps.tempDir ?? getDefaultClipboardTempDir();

  const { command, outputFormat } = getClipboardImageCommand({
    env,
    platform,
    which,
  });

  let stdoutBuf: Uint8Array;
  try {
    const proc = spawn(command, {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        proc.kill();
        reject(
          new ClipboardImageError(
            "read-failed",
            "读取剪贴板超时，剪贴板后端可能无响应",
          ),
        );
      }, timeoutMs);
    });

    try {
      const [stdoutArrayBuffer, stderrText, exitCode] = await Promise.race([
        Promise.all([
          new Response(proc.stdout).arrayBuffer(),
          new Response(proc.stderr).text(),
          proc.exited,
        ]),
        timeoutPromise,
      ]);

      if (exitCode !== 0 || stdoutArrayBuffer.byteLength === 0) {
        // osascript 剪贴板里没有 PNG 数据时以非零码退出，报 empty 并给可执行
        // 下一步；stderr 非空时附加到消息末尾（对齐 raw 分支写法）。raw 路径
        // （pngpaste/xclip/PowerShell）文案保持逐字不变。
        if (outputFormat === "osascript-hex") {
          throw new ClipboardImageError(
            "empty-clipboard",
            OSASCRIPT_EMPTY_CLIPBOARD_MESSAGE +
              (stderrText.trim() ? `: ${stderrText.trim()}` : ""),
          );
        }
        throw new ClipboardImageError(
          "empty-clipboard",
          "剪贴板中没有图像数据，请直接拖入图片文件或输入图片路径" +
            (stderrText.trim() ? `: ${stderrText.trim()}` : ""),
        );
      }

      stdoutBuf = new Uint8Array(stdoutArrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    if (err instanceof ClipboardImageError) {
      throw err;
    }
    throw new ClipboardImageError(
      "read-failed",
      `读取剪贴板图像失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // osascript 路径：stdout 是文本编码的 hex，先解码成 PNG 字节再走压缩/落盘。
  if (outputFormat === "osascript-hex") {
    const text = Buffer.from(stdoutBuf).toString("utf8");
    const decoded = decodeOsascriptPngHex(text);
    if (decoded.kind === "empty") {
      throw new ClipboardImageError(
        "empty-clipboard",
        OSASCRIPT_EMPTY_CLIPBOARD_MESSAGE,
      );
    }
    if (decoded.kind === "invalid") {
      throw new ClipboardImageError(
        "read-failed",
        "剪贴板图像数据无法解析（hex 编码损坏），请重新复制图片后重试，或直接拖入图片文件/输入图片路径",
      );
    }
    stdoutBuf = decoded.bytes;
  }

  const compressResult = await compressImage(stdoutBuf, "image/png");
  const finalBuf = compressResult.buffer;
  const finalMime = compressResult.mime;
  const finalSizeBytes = finalBuf.byteLength;

  if (finalSizeBytes > maxBytes) {
    throw new ClipboardImageError(
      "too-large",
      `剪贴板图像过大: ${formatBytes(finalSizeBytes)} (上限 ${formatBytes(maxBytes)})`,
    );
  }

  const hash = createHash("sha256")
    .update(finalBuf)
    .digest("hex")
    .slice(0, 12);
  const ext = mimeToExtension(finalMime);
  const filename = `clip-${hash}.${ext}`;

  mkdirSync(tempDir, { recursive: true });
  const filePath = join(tempDir, filename);
  await writeFile(filePath, finalBuf);

  return buildAttachedImage({
    buffer: finalBuf,
    mime: finalMime,
    filename,
    sourcePath: filePath,
    originalSizeBytes: compressResult.compressed ? compressResult.originalBytes : undefined,
  });
}
