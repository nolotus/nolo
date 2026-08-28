import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
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
 */
export function getClipboardImageCommand(
  deps: ClipboardImageDeps = {},
): { command: string[] } {
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
    if (!pngpaste) {
      throw new ClipboardImageError(
        "binary-missing",
        "未找到 pngpaste，请运行 brew install pngpaste 安装，或直接拖入图片文件/输入图片路径",
      );
    }
    return { command: [pngpaste, "-"] };
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
      return { command: [wlPaste, "--type", "image/png"] };
    }

    const xclip = which("xclip");
    if (xclip) {
      return {
        command: [xclip, "-selection", "clipboard", "-t", "image/png", "-o"],
      };
    }

    const wlPaste = which("wl-paste");
    if (wlPaste) {
      return { command: [wlPaste, "--type", "image/png"] };
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
  const tempDir = deps.tempDir ?? join(tmpdir(), "nolo-clipboard");

  const { command } = getClipboardImageCommand({
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
