import type SharpType from "sharp";

/**
 * 最长边阈值：超过 1568px 时等比缩放。
 * 1568px 是视觉模型编码甜点（Anthropic 官方建议值，GLM 同量级）：超过后再多的像素
 * 不会增加模型可感知的细节，只多花视觉 token（每轮重发）。2048 → 1568 视觉 token
 * 省 ~41%，文件体积顺带减半，截图文字锐度无感损失。
 */
export const MAX_IMAGE_DIMENSION = 1568;

/**
 * 发送目标体积：单图进入消息体前的体积收敛目标。
 *
 * 图片以 data:image/...;base64 内联进消息体（体积 +33%），且每轮请求会重发完整对话
 * 历史。长上下文对话里叠一张几 MB 的截图就会撞平台边缘网关的单请求体上限
 * （413 FUNCTION_PAYLOAD_TOO_LARGE）。故压缩后仍超此目标时继续降级：
 * PNG → 白底 flatten 转 JPEG（截图类压缩率 10x 量级），quality 80 → 60 → 40 递降。
 */
export const TARGET_IMAGE_BYTES = 1.5 * 1024 * 1024;

/** 硬触发线：超过 5 MB 必进压缩流程（不依赖快速探测是否成功） */
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
  targetBytes?: number;
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
 * 核心逻辑（体积目标导向）：
 * 1. GIF 动图跳过：GIF 通常包含多帧动画或特有的调色板，经由通用重编码极易丢失动图帧
 *    或透明度信息，故一律跳过压缩，原样返回。
 * 2. 廉价预检：快速探测宽高未超 1568px 且体积未超发送目标（TARGET_IMAGE_BYTES）时，
 *    跳过 sharp 加载与调用，节省 200-500ms 开销。
 * 3. 等比缩放：最长边 > 1568px 时缩到 1568px 内（fit: "inside", withoutEnlargement: true）。
 * 4. 格式重编码：JPEG/WebP 原格式重压（quality 80）；PNG 先无损重压，压完仍超发送目标
 *    时白底 flatten 转 JPEG（quality 80 → 60 → 40 递降直到达标）——截图类 PNG 转 JPEG
 *    是压缩率的大头，纯 PNG 无损压缩对几 MB 的截图收效甚微。
 * 5. 采纳条件：压缩结果体积更小，或确实发生了缩放；否则原样返回。
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
  const targetBytes = options.targetBytes ?? TARGET_IMAGE_BYTES;
  const maxSizeBytes = options.maxSizeBytes ?? MAX_IMAGE_SIZE_BYTES;
  const isJpegMime =
    normalizedMime === "image/jpeg" ||
    normalizedMime === "image/jpg" ||
    normalizedMime === "image/webp";

  // 2. 廉价预检：尺寸 <= maxDimension 且体积未超「必压线」（发送目标，或 JPEG/WebP 的硬触发线）时，
  //    无需加载 sharp 原生模块，直接跳过压缩，节省 200-500ms 开销。
  //    JPEG/WebP 已是有损压缩格式，小幅超目标时重压收益有限，按 5MB 硬触发线放行；
  //    PNG 是截图/界面图的常见格式，2-4MB 很普遍，超过发送目标就值得转 JPEG。
  const precheckLimit = isJpegMime ? maxSizeBytes : targetBytes;
  const fastDims = tryGetFastDimensions(input, normalizedMime);
  if (
    fastDims &&
    fastDims.width > 0 &&
    fastDims.height > 0 &&
    fastDims.width <= maxDimension &&
    fastDims.height <= maxDimension &&
    originalBytes <= precheckLimit
  ) {
    return {
      buffer: input,
      mime,
      originalBytes,
      compressedBytes: originalBytes,
      compressed: false,
    };
  }

  try {
    const sharp = await loadSharp(options.sharpLoader);
    const metadata = await sharp(input).metadata();

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const needsResize = (width > maxDimension || height > maxDimension) && width > 0 && height > 0;
    const needsSizeReduction = originalBytes > precheckLimit;

    // 未超阈值原样返回，不做无谓重编码（预检未解析出宽高时的兜底路径）
    if (!needsResize && !needsSizeReduction) {
      return {
        buffer: input,
        mime,
        originalBytes,
        compressedBytes: originalBytes,
        compressed: false,
      };
    }

    const format = metadata.format?.toLowerCase() || "";
    const isJpegInput =
      format === "jpeg" || format === "jpg" || normalizedMime === "image/jpeg" || normalizedMime === "image/jpg";
    const isPngInput = format === "png" || normalizedMime === "image/png";
    const isWebpInput = format === "webp" || normalizedMime === "image/webp";

    const buildPipeline = (): ReturnType<typeof sharp> => {
      let pipeline = sharp(input);
      if (needsResize) {
        pipeline = pipeline.resize(maxDimension, maxDimension, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }
      return pipeline;
    };

    // PNG/未知格式压后仍超目标时的 JPEG 降级链：白底 flatten + quality 递降
    const encodeJpegFallback = async (): Promise<{ buffer: Buffer; quality: number } | null> => {
      for (const quality of [80, 60, 40]) {
        try {
          const buf = await buildPipeline()
            .flatten({ background: "#ffffff" })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
          if (buf.byteLength <= targetBytes || quality === 40) {
            return { buffer: buf, quality };
          }
        } catch {
          return null;
        }
      }
      return null;
    };

    const adopt = (buffer: Uint8Array, outMime: string): CompressImageResult => {
      if (buffer.byteLength < originalBytes || needsResize) {
        return {
          buffer,
          mime: outMime,
          originalBytes,
          compressedBytes: buffer.byteLength,
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
    };

    if (isJpegInput) {
      const compressedBuf = await buildPipeline().jpeg({ quality: 80, mozjpeg: true }).toBuffer();
      // JPEG quality 80 仍超目标时递降一档，长上下文对话里多省一点是一点
      if (compressedBuf.byteLength > targetBytes) {
        const fallback = await encodeJpegFallback();
        if (fallback) {
          return adopt(fallback.buffer, "image/jpeg");
        }
      }
      return adopt(compressedBuf, "image/jpeg");
    }

    if (isWebpInput) {
      const compressedBuf = await buildPipeline().webp({ quality: 80 }).toBuffer();
      if (compressedBuf.byteLength > targetBytes) {
        const fallback = await encodeJpegFallback();
        if (fallback) {
          return adopt(fallback.buffer, "image/jpeg");
        }
      }
      return adopt(compressedBuf, "image/webp");
    }

    // PNG 及其他格式：先无损重压；压完仍超发送目标 → 白底 flatten 转 JPEG
    if (isPngInput) {
      const pngBuf = await buildPipeline().png({ compressionLevel: 9 }).toBuffer();
      if (pngBuf.byteLength > targetBytes) {
        const fallback = await encodeJpegFallback();
        if (fallback && fallback.buffer.byteLength < pngBuf.byteLength) {
          return adopt(fallback.buffer, "image/jpeg");
        }
      }
      return adopt(pngBuf, "image/png");
    }

    // 其他格式（罕见）：直接走 JPEG 降级链兜底
    const fallback = await encodeJpegFallback();
    if (fallback) {
      return adopt(fallback.buffer, "image/jpeg");
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
