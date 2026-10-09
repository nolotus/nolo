// packages/core/file/dataUrl.ts
//
// Dependency-free data-URL helpers (no DOM-framework imports, no
// browser-image-compression). Extracted from app/utils/imageUtils.ts so that
// non-UI consumers (e.g. chat/messages/messageContent.ts, reachable from the
// CLI/agent static graph) can use them without pulling the compression chunk
// into their static module graph.
//
// The compression helpers (compressImageFile / compressImage) stay in
// app/utils/imageUtils.ts, which re-exports the functions below.

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 解析 dataURL，提取 mime 和 base64 数据部分。
 */
const parseDataUrl = (
  dataUrl: string
): { mime: string; base64: string } | null => {
  const trimmed = dataUrl.trim();
  const parts = trimmed.split(",");

  if (parts.length < 2 || !parts[0] || !parts[1]) {
    console.warn("[imageUtils] parseDataUrl: invalid data URL", {
      hasHeader: !!parts[0],
      hasBody: !!parts[1],
    });
    return null;
  }

  const header = parts[0];
  const base64 = parts[1];

  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch?.[1];

  if (!mime) {
    console.warn("[imageUtils] parseDataUrl: cannot extract mime from", header);
    return null;
  }

  return { mime, base64 };
};

/**
 * 将 data URL 字符串转回 File 对象。
 * @param dataUrl 形如 "data:image/png;base64,..." 的字符串
 * @param filename 生成 File 时使用的文件名
 * @returns File 对象，失败时返回 null
 */
export function dataURLtoFile(
  dataUrl: string,
  filename: string
): File | null {
  try {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) return null;

    const { mime, base64 } = parsed;

    const binaryString = atob(base64);
    const length = binaryString.length;
    const u8arr = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
      u8arr[i] = binaryString.charCodeAt(i);
    }

    return new File([u8arr], filename, { type: mime });
  } catch (error) {
    console.error("[imageUtils] Error converting data URL to File:", error);
    return null;
  }
}

/**
 * 等待 remote /file/content/:fileId 对应的图片 URL 可用。
 * 通过创建 <img> 去加载这个 URL，避免 CORS 问题。
 *
 * 成功：在 maxWaitMs 内，某次加载 onload 触发。
 * 失败：超时或每次都是 onerror。
 */
export interface WaitForFileReadyOptions {
  /** 最大等待时间（毫秒），默认 4000ms */
  maxWaitMs?: number;
  /** 每次重试之间的间隔时间（毫秒），默认 250ms */
  intervalMs?: number;
}

const appendNoCacheQuery = (url: string): string => {
  const stamp = `_t=${Date.now()}`;
  return url.includes("?") ? `${url}&${stamp}` : `${url}?${stamp}`;
};

const tryLoadImage = (url: string): Promise<boolean> =>
  new Promise((resolve) => {
    const img = new Image();

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      resolve(true);
    };

    img.onerror = () => {
      cleanup();
      resolve(false);
    };

    img.src = url;
  });

export const waitForFileReady = async (
  url: string,
  {
    maxWaitMs = 4000,
    intervalMs = 250,
  }: WaitForFileReadyOptions = {}
): Promise<boolean> => {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const tryUrl = appendNoCacheQuery(url);
    const ok = await tryLoadImage(tryUrl);

    if (ok) {
      console.debug("[imageUtils] waitForFileReady: image loaded for", url);
      return true;
    }

    await sleep(intervalMs);
  }

  console.warn("[imageUtils] waitForFileReady: timeout for", url);
  return false;
};
