// 文件路径: utils/imageUtils.ts
// browser-image-compression 仅在上传图片时需要，不应进入首屏同步 bundle。
// 在实际调用处动态 import（见 compressImageFile / compressImage）。
//
// 与压缩无关的纯 data-URL 工具（dataURLtoFile / waitForFileReady 及其私有
// helper）已下沉到 core/file/dataUrl.ts：非 UI 调用方（chat/messages/
// messageContent.ts，可从 CLI/agent 静态图到达）不应把本模块（含
// browser-image-compression 动态 import）拖进自己的静态模块图。
// 这里保留同名 re-export，既有调用方 API 与语义不变。

// 本地也要绑定 dataURLtoFile（compressImage 内部直接调用它）；
// 仅 re-export 不会在模块作用域内引入该名字。
import { dataURLtoFile } from "core/file/dataUrl";
export { dataURLtoFile, waitForFileReady } from "core/file/dataUrl";
export type { WaitForFileReadyOptions } from "core/file/dataUrl";

/**
 * 前端图片压缩配置（只包含我们实际用到的字段）。
 * 可以按需扩展字段。
 */
export interface ImageCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  initialQuality?: number;
  alwaysKeepResolution?: boolean;
}

/**
 * 默认压缩参数：
 * - 体积控制在 ~1.5MB 内
 * - 最长边 1400 像素
 * - 初始质量 0.9（画质较高）
 * - 使用 WebWorker 避免主线程卡顿
 */
const DEFAULT_COMPRESSION_OPTIONS: Required<
  Pick<
    ImageCompressionOptions,
    "maxSizeMB" | "maxWidthOrHeight" | "useWebWorker" | "initialQuality"
  >
> = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1400,
  useWebWorker: true,
  initialQuality: 0.9,
};

const BYTES_PER_MB = 1024 * 1024;

const toMegabytes = (bytes: number): number => bytes / BYTES_PER_MB;

const normalizeCompressedFile = (sourceFile: File, compressed: Blob | File): File => {
  if (compressed instanceof File) {
    return compressed;
  }

  return new File([compressed], sourceFile.name, {
    type: compressed.type || sourceFile.type || "application/octet-stream",
    lastModified: sourceFile.lastModified || Date.now(),
  });
};

export async function compressImageFile(
  imageFile: File,
  options?: ImageCompressionOptions
): Promise<File> {
  const mergedOptions: ImageCompressionOptions = {
    ...DEFAULT_COMPRESSION_OPTIONS,
    ...options,
  };

  const originalSizeMB = toMegabytes(imageFile.size);
  const targetSizeMB =
    mergedOptions.maxSizeMB ?? DEFAULT_COMPRESSION_OPTIONS.maxSizeMB;

  console.log(
    `[imageUtils] compressImageFile: original size = ${originalSizeMB.toFixed(
      2
    )} MB`
  );

  if (originalSizeMB <= targetSizeMB) {
    console.log(
      "[imageUtils] compressImageFile: image already smaller than target, skip compression"
    );
    return imageFile;
  }

  let imageCompression;
  try {
    ({ default: imageCompression } = await import("browser-image-compression"));
  } catch (error) {
    // 区分“库没加载进来”与“压缩炸了”：chunk 加载失败走这里，保持降级（返回原图）
    console.error(
      "[imageUtils] compressImageFile import failed:",
      error
    );
    return imageFile;
  }

  try {
    const compressedBlob = await imageCompression(imageFile, mergedOptions);
    const compressedFile = normalizeCompressedFile(imageFile, compressedBlob);
    const compressedSizeMB = toMegabytes(compressedFile.size);

    console.log(
      `[imageUtils] compressImageFile: compressed size = ${compressedSizeMB.toFixed(
        2
      )} MB (target <= ${targetSizeMB.toFixed(2)} MB)`
    );

    if (compressedFile.size >= imageFile.size) {
      console.log(
        "[imageUtils] compressImageFile: compressed file is not smaller, return original"
      );
      return imageFile;
    }

    return compressedFile;
  } catch (error) {
    console.error(
      "[imageUtils] compressImageFile compress failed:",
      error
    );
    return imageFile;
  }
}

/**
 * 压缩一张 dataURL 图片。
 * 使用 browser-image-compression 库。
 *
 * @param imageDataUrl 原始图片的 dataURL（Base64）
 * @param options 可选的压缩参数，会覆盖默认值
 * @returns 压缩后的 dataURL；如果压缩失败或不划算，会返回原始 dataURL
 */
export async function compressImage(
  imageDataUrl: string,
  options?: ImageCompressionOptions
): Promise<string> {
  // 为转换生成一个“相对唯一”的文件名
  const timestamp = Date.now();
  const filename = `image_${timestamp}.png`; // 实际类型由 dataURL 决定

  const imageFile = dataURLtoFile(imageDataUrl, filename);

  if (!imageFile) {
    console.warn(
      "[imageUtils] compressImage: cannot convert data URL to File, return original"
    );
    return imageDataUrl;
  }

  let imageCompression;
  try {
    ({ default: imageCompression } = await import("browser-image-compression"));
  } catch (error) {
    // 区分“库没加载进来”与“压缩炸了”：chunk 加载失败走这里，保持降级（返回原 dataURL）
    console.error(
      "[imageUtils] compressImage import failed:",
      error
    );
    return imageDataUrl;
  }

  try {
    const compressedFile = await compressImageFile(imageFile, options);
    if (compressedFile === imageFile) {
      console.log(
        "[imageUtils] compressImage: file-based compression kept original image"
      );
      return imageDataUrl;
    }

    const compressedDataUrl =
      await imageCompression.getDataUrlFromFile(compressedFile);

    return compressedDataUrl;
  } catch (error) {
    console.error(
      "[imageUtils] compressImage compress failed:",
      error
    );
    return imageDataUrl;
  }
}

// dataURLtoFile / waitForFileReady 的实现已移至 core/file/dataUrl.ts（见文件头
// re-export）。压缩相关逻辑（compressImageFile / compressImage）留在本模块。
