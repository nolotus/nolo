import type SharpType from "sharp";

/** 最长边阈值：超过 2048px 时等比缩放 */
export const MAX_IMAGE_DIMENSION = 2048;

/** 字节上限阈值：超过 5 MB (5 * 1024 * 1024) 时进行压缩 */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export type CompressImageResult = {
  buffer: Uint8Array;
  mime: string;
  originalBytes: number;
  compressedBytes: number;
  compressed: boolean;
};

export type SharpLoader = () => Promise<typeof SharpType | { default: typeof SharpType }>;

export type CompressImageOptions = {
  maxDimension?: number;
  maxSizeBytes?: number;
  sharpLoader?: SharpLoader;
};

let cachedSharp: typeof SharpType | null = null;

/**
 * 动态加载 sharp 原生模块。
 * sharp 是 C++ 原生 addon，体积和加载开销较大；采用动态 import 确保仅在
 * 实际需要处理图片时才加载，绝不拖慢 TUI 顶层冷启动。
 */
export async function loadSharp(customLoader?: SharpLoader): Promise<typeof SharpType> {
  if (customLoader) {
    const loaded = await customLoader();
    return ("default" in loaded && loaded.default ? loaded.default : loaded) as typeof SharpType;
  }
  if (!cachedSharp) {
    // Bun 动态 import 原生 CJS 模块通常已解包 default，mod.default ?? mod 为 Node/CJS 兼容兜底
    const mod = await import("sharp");
    cachedSharp = (mod.default ?? mod) as typeof SharpType;
  }
  return cachedSharp;
}

/**
 * 根据 MIME 类型映射到常用文件扩展名。
 */
export function mimeToExtension(mime: string): string {
  const normalized = mime.toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "jpg";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  return "png";
}

/**
 * 快速尝试从图片头部字节解析宽高（廉价预检，避免非必要时加载庞大的 sharp 模块）。
 * 目前支持标准 PNG 和常见 JPEG 头部解析。解析失败返回 null。
 */
export function tryGetFastDimensions(
  buffer: Uint8Array,
  _mime?: string,
): { width: number; height: number } | null {
  if (buffer.byteLength < 24) return null;

  // 1. PNG 快速探测
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  // 2. JPEG 快速探测
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    while (offset < buffer.byteLength - 8) {
      if (buffer[offset] !== 0xff) {
        break;
      }
      const marker = buffer[offset + 1];
      // SOF0 ~ SOF3, SOF5 ~ SOF7, SOF9 ~ SOF11, SOF13 ~ SOF15 (排除 DHT 0xC4, JPG 0xC8, DAC 0xCC)
      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);
      if (isSof) {
        const height = view.getUint16(offset + 5, false);
        const width = view.getUint16(offset + 7, false);
        if (width > 0 && height > 0) {
          return { width, height };
        }
        break;
      }
      const segmentLength = view.getUint16(offset + 2, false);
      offset += 2 + segmentLength;
    }
  }

  return null;
}

/**
 * TUI 侧图片自动压缩 (US-5.3)。
 *
 * 核心逻辑：
 * 1. GIF 动图跳过：GIF 通常包含多帧动画或特有的调色板，经由通用重编码极易丢失动图帧
 *    或透明度信息，故一律跳过压缩，原样返回。
 * 2. 廉价预检：若未超体积阈值且快速探测宽高未超 2048px，跳过 sharp 加载与调用。
 * 3. 阈值判定：当最长边 > 2048px 或文件大小 > 5 MB 时才触发压缩；未超阈值不做无谓重编码。
 * 4. 等比缩放：当最长边超标时，使用 sharp 等比缩放到 2048px 内（fit: "inside", withoutEnlargement: true）。
 * 5. 格式重编码：JPEG 质量 80 / mozjpeg，PNG compressionLevel 9，WebP 质量 80。
 * 6. 优雅降级：sharp 加载失败或图片解析异常时，静默回退使用原图（compressed: false），绝不中断流程。
 */
export async function compressImage(
  input: Uint8Array | Buffer,
  mime: string,
  options: CompressImageOptions = {},
): Promise<CompressImageResult> {
  const originalBytes = input.byteLength;
  const normalizedMime = mime.toLowerCase();

  // 1. GIF 动图跳过压缩（动图重编码会丢帧）
  if (normalizedMime === "image/gif" || normalizedMime.endsWith("/gif")) {
    return {
      buffer: input,
      mime,
      originalBytes,
      compressedBytes: originalBytes,
      compressed: false,
    };
  }

  const maxDimension = options.maxDimension ?? MAX_IMAGE_DIMENSION;
  const maxSizeBytes = options.maxSizeBytes ?? MAX_IMAGE_SIZE_BYTES;

  // 2. 廉价预检：若能快速解析宽高，且尺寸 <= maxDimension 且体积 <= maxSizeBytes，
  //    则无需加载 sharp 原生模块，直接跳过压缩，节省 200-500ms 开销。
  const fastDims = tryGetFastDimensions(input, normalizedMime);
  if (fastDims && fastDims.width > 0 && fastDims.height > 0) {
    if (
      fastDims.width <= maxDimension &&
      fastDims.height <= maxDimension &&
      originalBytes <= maxSizeBytes
    ) {
      return {
        buffer: input,
        mime,
        originalBytes,
        compressedBytes: originalBytes,
        compressed: false,
      };
    }
  }

  try {
    const sharp = await loadSharp(options.sharpLoader);
    const instance = sharp(input);
    const metadata = await instance.metadata();

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const needsResize = (width > maxDimension || height > maxDimension) && width > 0 && height > 0;
    const needsSizeReduction = originalBytes > maxSizeBytes;

    // 未超阈值原样返回，不做无谓重编码
    if (!needsResize && !needsSizeReduction) {
      return {
        buffer: input,
        mime,
        originalBytes,
        compressedBytes: originalBytes,
        compressed: false,
      };
    }

    let pipeline = sharp(input);
    if (needsResize) {
      pipeline = pipeline.resize(maxDimension, maxDimension, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const format = metadata.format?.toLowerCase() || "";
    let outputMime = mime;

    if (format === "jpeg" || format === "jpg" || normalizedMime === "image/jpeg" || normalizedMime === "image/jpg") {
      pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
      outputMime = "image/jpeg";
    } else if (format === "png" || normalizedMime === "image/png") {
      pipeline = pipeline.png({ compressionLevel: 9 });
      outputMime = "image/png";
    } else if (format === "webp" || normalizedMime === "image/webp") {
      pipeline = pipeline.webp({ quality: 80 });
      outputMime = "image/webp";
    }

    const compressedBuf = await pipeline.toBuffer();

    // 只有当尺寸发生缩放，或压缩后体积确实变小时才采纳压缩结果
    if (compressedBuf.byteLength < originalBytes || needsResize) {
      return {
        buffer: compressedBuf,
        mime: outputMime,
        originalBytes,
        compressedBytes: compressedBuf.byteLength,
        compressed: true,
      };
    }

    return {
      buffer: input,
      mime,
      originalBytes,
      compressedBytes: originalBytes,
      compressed: false,
    };
  } catch {
    // sharp 加载失败或解析报错时，优雅降级为原图
    return {
      buffer: input,
      mime,
      originalBytes,
      compressedBytes: originalBytes,
      compressed: false,
    };
  }
}
