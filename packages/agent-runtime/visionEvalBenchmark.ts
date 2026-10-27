import { deflateSync, inflateSync } from "node:zlib";
import { createHash } from "node:crypto";

export type Shape = "圆" | "方" | "三角";
export type Color = "红" | "蓝" | "绿" | "黄" | "黑" | "白";
export type SizeClass = "大" | "中" | "小";
export type GridPos =
  | "左上"
  | "上"
  | "右上"
  | "左"
  | "中"
  | "右"
  | "左下"
  | "下"
  | "右下";

export interface BoundingBox {
  minY: number;
  minX: number;
  maxY: number;
  maxX: number;
}

export interface ElementSpec {
  shape: Shape;
  color: Color;
  size: SizeClass;
  grid: GridPos;
  bbox: BoundingBox;
  center: [y: number, x: number];
  heightPx: number;
}

export interface CorpusItem {
  file: string;
  flag: string;
  elements: ElementSpec[];
  pngBuffer: Buffer;
  hash: string;
}

export interface ModelPredictionElement {
  shape: Shape;
  color: Color;
  size: SizeClass;
  grid: GridPos;
}

export interface ModelPrediction {
  flag: string;
  elements: ModelPredictionElement[];
  isTruncated?: boolean;
}

export interface JudgeResult {
  passed: boolean;
  flagPassed: boolean;
  geometryPassed: boolean;
  orderPassed: boolean;
  orderReversed: boolean;
  details: string[];
}

// 5x7 标准清晰点阵字模，覆盖 FLAG- 与 16 进制字符 [0-9a-f]
export const BITMAP_FONT_5x7: Record<string, number[]> = {
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x06, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  "a": [0x00, 0x00, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  "b": [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x1e],
  "c": [0x00, 0x00, 0x0e, 0x11, 0x10, 0x11, 0x0e],
  "d": [0x01, 0x01, 0x0d, 0x13, 0x11, 0x11, 0x0f],
  "e": [0x00, 0x00, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  "f": [0x06, 0x09, 0x08, 0x1c, 0x08, 0x08, 0x08],
  "F": [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  "L": [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  "A": [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  "G": [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  "-": [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
};

export const COLOR_MAP: Record<Color, [number, number, number]> = {
  红: [220, 38, 38],
  蓝: [37, 99, 235],
  绿: [22, 163, 74],
  黄: [234, 179, 8],
  黑: [15, 23, 42],
  白: [255, 255, 255],
};

export const GRID_MAP: Record<GridPos, { row: number; col: number }> = {
  左上: { row: 0, col: 0 },
  上: { row: 0, col: 1 },
  右上: { row: 0, col: 2 },
  左: { row: 1, col: 0 },
  中: { row: 1, col: 1 },
  右: { row: 1, col: 2 },
  左下: { row: 2, col: 0 },
  下: { row: 2, col: 1 },
  右下: { row: 2, col: 2 },
};

// 确定性随机数发生器（Mulberry32）
export function createPrng(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// CRC32 计算函数
export function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i]!;
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// 纯内存 RGBA 转 PNG 编码器
export function encodeRgbaToPng(width: number, height: number, rgba: Uint8Array): Buffer {
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawScanlines[rowOffset] = 0; // Filter 0 (None)
    const srcOffset = y * width * 4;
    Buffer.from(rgba.buffer, rgba.byteOffset + srcOffset, width * 4).copy(
      rawScanlines,
      rowOffset + 1
    );
  }

  const compressed = deflateSync(rawScanlines);

  function chunk(type: string, data: Uint8Array): Buffer {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, "ascii");
    buf.set(data, 8);
    const typeAndData = Buffer.alloc(4 + len);
    typeAndData.write(type, 0, 4, "ascii");
    typeAndData.set(data, 4);
    buf.writeUInt32BE(crc32(typeAndData), 8 + len);
    return buf;
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Standard filter
  ihdr[12] = 0; // Non-interlaced

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * 纯内存 PNG 解码器：还原为统一 RGBA 像素矩阵
 * 仅支持非交错、8-bit colorType 6 (RGBA), 2 (RGB), 0 (Grayscale)，支持 5 种标准 scanline filter；其它格式显式抛错
 */
export function decodePngToRgba(pngBuffer: Buffer | Uint8Array): {
  width: number;
  height: number;
  rgba: Uint8Array;
} {
  const buf = Buffer.isBuffer(pngBuffer) ? pngBuffer : Buffer.from(pngBuffer);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) {
      throw new Error("Invalid PNG signature");
    }
  }

  let offset = 8;
  const idatChunks: Buffer[] = [];
  let width = 0;
  let height = 0;
  let colorType = 6;

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    offset += 12 + len;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8 || ![0, 2, 6].includes(colorType)) {
        throw new Error(`Unsupported PNG format: colorType=${colorType}, bitDepth=${bitDepth}; supported: colorType=0,2,6 with bitDepth=8`);
      }
      if (data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new Error(`Unsupported PNG encoding: compression=${data[10]}, filter=${data[11]}, interlace=${data[12]}`);
      }
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (width === 0 || height === 0) {
    throw new Error("Invalid PNG dimensions");
  }

  const decompressed = inflateSync(Buffer.concat(idatChunks));
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = width * bpp;
  const outRgba = new Uint8Array(width * height * 4);
  const rawScan = new Uint8Array(decompressed);

  let prevRow = new Uint8Array(stride);
  let curRow = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const filter = rawScan[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    for (let i = 0; i < stride; i++) {
      const x = rawScan[rowStart + i]!;
      const a = i >= bpp ? curRow[i - bpp]! : 0;
      const b = prevRow[i]!;
      const c = i >= bpp ? prevRow[i - bpp]! : 0;
      let val = 0;
      if (filter === 0) val = x;
      else if (filter === 1) val = (x + a) & 0xff;
      else if (filter === 2) val = (x + b) & 0xff;
      else if (filter === 3) val = (x + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) val = (x + paeth(a, b, c)) & 0xff;
      curRow[i] = val;
    }
    for (let x = 0; x < width; x++) {
      const outIdx = (y * width + x) * 4;
      const srcIdx = x * bpp;
      if (bpp === 4) {
        outRgba[outIdx + 0] = curRow[srcIdx + 0]!;
        outRgba[outIdx + 1] = curRow[srcIdx + 1]!;
        outRgba[outIdx + 2] = curRow[srcIdx + 2]!;
        outRgba[outIdx + 3] = curRow[srcIdx + 3]!;
      } else if (bpp === 3) {
        outRgba[outIdx + 0] = curRow[srcIdx + 0]!;
        outRgba[outIdx + 1] = curRow[srcIdx + 1]!;
        outRgba[outIdx + 2] = curRow[srcIdx + 2]!;
        outRgba[outIdx + 3] = 255;
      } else {
        const v = curRow[srcIdx]!;
        outRgba[outIdx + 0] = v;
        outRgba[outIdx + 1] = v;
        outRgba[outIdx + 2] = v;
        outRgba[outIdx + 3] = 255;
      }
    }
    prevRow.set(curRow);
  }

  return { width, height, rgba: outRgba };
}

/**
 * 真值中心来源 (b)：从实际 PNG 像素求连通块 bbox 中心
 */
export function extractPixelComponents(
  pngBuffer: Buffer | Uint8Array,
  playAreaHeight = 510,
): Array<{
  bbox: BoundingBox;
  center: [y: number, x: number];
  pixelCount: number;
  heightPx: number;
  widthPx: number;
}> {
  const { width, rgba } = decodePngToRgba(pngBuffer);
  // 背景色基准取 (0, 0) 像素
  const bgR = rgba[0]!;
  const bgG = rgba[1]!;
  const bgB = rgba[2]!;

  const isBg = (r: number, g: number, b: number) => {
    return Math.abs(r - bgR) <= 3 && Math.abs(g - bgG) <= 3 && Math.abs(b - bgB) <= 3;
  };

  const visited = new Uint8Array(width * playAreaHeight);
  const components: Array<{
    bbox: BoundingBox;
    center: [y: number, x: number];
    pixelCount: number;
    heightPx: number;
    widthPx: number;
  }> = [];

  for (let y = 0; y < playAreaHeight; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      const p = idx * 4;
      if (isBg(rgba[p]!, rgba[p + 1]!, rgba[p + 2]!)) continue;

      let minY = y;
      let maxY = y;
      let minX = x;
      let maxX = x;
      const q = [idx];
      visited[idx] = 1;
      let head = 0;

      while (head < q.length) {
        const curr = q[head++]!;
        const cy = Math.floor(curr / width);
        const cx = curr % width;

        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;

        const neighbors = [
          cy > 0 ? (cy - 1) * width + cx : -1,
          cy < playAreaHeight - 1 ? (cy + 1) * width + cx : -1,
          cx > 0 ? cy * width + (cx - 1) : -1,
          cx < width - 1 ? cy * width + (cx + 1) : -1,
        ];
        for (const n of neighbors) {
          if (n !== -1 && !visited[n]) {
            const np = n * 4;
            if (!isBg(rgba[np]!, rgba[np + 1]!, rgba[np + 2]!)) {
              visited[n] = 1;
              q.push(n);
            }
          }
        }
      }

      if (q.length > 50) {
        components.push({
          bbox: { minY, minX, maxY, maxX },
          center: [(minY + maxY) / 2, (minX + maxX) / 2],
          pixelCount: q.length,
          heightPx: maxY - minY + 1,
          widthPx: maxX - minX + 1,
        });
      }
    }
  }

  return components;
}

// 尺寸判定的真值映射口径
export const SIZE_CONFIG_DEFAULT = {
  大: 198, // 33% of 600px
  中: 132, // 22% of 600px
  小: 60,  // 10% of 600px
};

export const SIZE_CONFIG_EXTREME = {
  大: 252, // 42%
  中: 132, // 22%
  小: 42,  // 7%
};

/**
 * 尺寸档机械判定规则：
 * 基于高度像素比对：
 * - 大 (33% 基准，即 198px)：>= 165px (27.5%)
 * - 中 (22% 基准，即 132px)：[96px, 165px) (16% ~ 27.5%)
 * - 小 (10% 基准，即 60px)：< 96px (< 16%)
 */
export function classifySize(heightPx: number, totalHeight = 600): SizeClass {
  const ratio = heightPx / totalHeight;
  if (ratio >= 0.275) return "大";
  if (ratio >= 0.16) return "中";
  return "小";
}

/**
 * 规范化元素顺序：按 (中心 y, 中心 x) 升序排列
 * 自上而下、同高度自左向右
 */
export function normalizeElements<T extends { center: [number, number] }>(elements: T[]): T[] {
  return [...elements].sort((a, b) => {
    if (a.center[0] !== b.center[0]) {
      return a.center[0] - b.center[0];
    }
    return a.center[1] - b.center[1];
  });
}

/**
 * 语料生成器
 */
export interface GenerateOptions {
  width?: number; // 默认 900
  height?: number; // 默认 600
  footerHeight?: number; // 默认 90
  seed: number;
  count?: number; // 生成几张图，默认 5
  sizeConfig?: Record<SizeClass, number>;
}

export function generateCorpus(options: GenerateOptions): CorpusItem[] {
  const width = options.width ?? 900;
  const height = options.height ?? 600;
  const footerHeight = options.footerHeight ?? 90;
  const playAreaHeight = height - footerHeight; // 510
  const rowHeight = playAreaHeight / 3; // 170
  const colWidth = width / 3; // 300
  const count = options.count ?? 5;
  const sizeMap = options.sizeConfig ?? SIZE_CONFIG_DEFAULT;

  const prng = createPrng(options.seed);
  // Domain-separated deterministic sources: neither filenames nor geometry
  // consume the FLAG stream (the seed is the reproducibility key only).
  const flagPrng = createPrng(createHash("sha256")
    .update(`vision-eval:flags:${options.seed}`).digest().readUInt32BE(0));
  const flagTokens = Array.from({ length: count }, () =>
    Math.floor(flagPrng() * 0x1000000).toString(16).padStart(6, "0"));
  const usedFileIds = new Set<string>();

  const shapes: Shape[] = ["圆", "方", "三角"];
  const colors: Color[] = ["红", "蓝", "绿", "黄", "黑", "白"];
  const sizes: SizeClass[] = ["大", "中", "小"];
  const gridKeys: GridPos[] = ["左上", "上", "右上", "左", "中", "右", "左下", "下", "右下"];

  const items: CorpusItem[] = [];

  for (let idx = 0; idx < count; idx++) {
    const flag = `FLAG-${flagTokens[idx]!}`;
    // Filename input never includes flags, pixels, or geometry. Reject even
    // accidental matches with ANY answer in this corpus, and resolve collisions.
    let fileId: string;
    let attempt = 0;
    do {
      fileId = createHash("sha256")
        .update(`vision-eval:files:${options.seed}:${idx}:${attempt++}`)
        .digest("hex").slice(0, 12);
    } while (usedFileIds.has(fileId) || flagTokens.some((token) => fileId.includes(token)));
    usedFileIds.add(fileId);

    // 严禁挪格子：中心必须严格位于格子正中心
    // 遇到越界或重叠时：断言 + 换 seed 重试 (PRNG retry)
    let elem1!: ElementSpec;
    let elem2!: ElementSpec;
    let valid = false;
    let attempts = 0;

    while (attempts++ < 300) {
      const g1Idx = Math.floor(prng() * gridKeys.length);
      let g2Idx = Math.floor(prng() * (gridKeys.length - 1));
      if (g2Idx >= g1Idx) g2Idx++;
      const grid1 = gridKeys[g1Idx]!;
      const grid2 = gridKeys[g2Idx]!;

      const shape1 = shapes[Math.floor(prng() * shapes.length)]!;
      const shape2 = shapes[Math.floor(prng() * shapes.length)]!;
      const color1 = colors[Math.floor(prng() * colors.length)]!;
      const color2 = colors[Math.floor(prng() * colors.length)]!;
      const size1 = sizes[Math.floor(prng() * sizes.length)]!;
      const size2 = sizes[Math.floor(prng() * sizes.length)]!;

      function createElement(g: GridPos, shape: Shape, color: Color, sizeClass: SizeClass): ElementSpec {
        const { row, col } = GRID_MAP[g];
        // 绝对格子中心：绝不挪动、绝不 shift
        const cy = Math.round(row * rowHeight + rowHeight / 2);
        const cx = Math.round(col * colWidth + colWidth / 2);
        const hPx = sizeMap[sizeClass];
        const halfH = Math.round(hPx / 2);
        const minY = cy - halfH;
        const maxY = cy + halfH;
        const minX = cx - halfH;
        const maxX = cx + halfH;

        return {
          shape,
          color,
          size: sizeClass,
          grid: g,
          bbox: { minY, minX, maxY, maxX },
          center: [cy, cx],
          heightPx: hPx,
        };
      }

      const candidate1 = createElement(grid1, shape1, color1, size1);
      const candidate2 = createElement(grid2, shape2, color2, size2);

      // 越界断言：严禁侵入文字带或超出图形区
      if (
        candidate1.bbox.minY < 0 ||
        candidate1.bbox.maxY >= playAreaHeight ||
        candidate1.bbox.minX < 0 ||
        candidate1.bbox.maxX >= width
      ) {
        continue;
      }
      if (
        candidate2.bbox.minY < 0 ||
        candidate2.bbox.maxY >= playAreaHeight ||
        candidate2.bbox.minX < 0 ||
        candidate2.bbox.maxX >= width
      ) {
        continue;
      }

      // 重叠断言：两个元素 bbox 绝不可重叠
      const overlapY = Math.max(
        0,
        Math.min(candidate1.bbox.maxY, candidate2.bbox.maxY) -
          Math.max(candidate1.bbox.minY, candidate2.bbox.minY)
      );
      const overlapX = Math.max(
        0,
        Math.min(candidate1.bbox.maxX, candidate2.bbox.maxX) -
          Math.max(candidate1.bbox.minX, candidate2.bbox.minX)
      );
      if (overlapY > 0 && overlapX > 0) {
        continue; // 重叠，重试
      }

      elem1 = candidate1;
      elem2 = candidate2;
      valid = true;
      break;
    }

    if (!valid) {
      throw new Error(
        `Corpus generation failed: could not find non-overlapping layout without shifting grid after ${attempts} attempts`
      );
    }

    // 渲染图像
    const rgba = new Uint8Array(width * height * 4);
    // 背景：实色浅灰白 #f8f8f8
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4 + 0] = 248;
      rgba[i * 4 + 1] = 248;
      rgba[i * 4 + 2] = 248;
      rgba[i * 4 + 3] = 255;
    }

    // 绘制两个元素
    for (const elem of [elem1, elem2]) {
      const [r, g, b] = COLOR_MAP[elem.color];
      const { minY, minX, maxY, maxX } = elem.bbox;
      const cy = elem.center[0];
      const cx = elem.center[1];
      const rad = elem.heightPx / 2;

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          let inside = false;
          if (elem.shape === "方") {
            inside = true;
          } else if (elem.shape === "圆") {
            const dy = y - cy;
            const dx = x - cx;
            if (dy * dy + dx * dx <= rad * rad) {
              inside = true;
            }
          } else if (elem.shape === "三角") {
            const topY = cy - rad;
            const botY = cy + rad;
            if (y >= topY && y <= botY) {
              const progress = (y - topY) / (botY - topY);
              const halfW = progress * rad;
              if (Math.abs(x - cx) <= halfW) {
                inside = true;
              }
            }
          }

          if (inside) {
            const pos = (y * width + x) * 4;
            rgba[pos + 0] = r;
            rgba[pos + 1] = g;
            rgba[pos + 2] = b;
            rgba[pos + 3] = 255;
          }
        }
      }
    }

    // 底部文字带分割线（极微弱浅灰 #e5e5e5，y=510）
    for (let x = 0; x < width; x++) {
      const pos = (playAreaHeight * width + x) * 4;
      rgba[pos + 0] = 229;
      rgba[pos + 1] = 229;
      rgba[pos + 2] = 229;
      rgba[pos + 3] = 255;
    }

    // 在底部文字带绘制 FLAG（居中，4x 放大点阵，黑色）
    const scale = 4;
    const charW = 5 * scale; // 20px
    const charH = 7 * scale; // 28px
    const spacing = 2 * scale; // 8px
    const totalTextWidth = flag.length * charW + (flag.length - 1) * spacing;
    const startX = Math.round((width - totalTextWidth) / 2);
    const startY = Math.round(playAreaHeight + (footerHeight - charH) / 2); // 居中于 510~600

    for (let cIdx = 0; cIdx < flag.length; cIdx++) {
      const ch = flag[cIdx]!;
      const glyph = BITMAP_FONT_5x7[ch];
      if (!glyph) continue;
      const xOffset = startX + cIdx * (charW + spacing);

      for (let gy = 0; gy < 7; gy++) {
        const rowBits = glyph[gy]!;
        for (let gx = 0; gx < 5; gx++) {
          if ((rowBits & (1 << (4 - gx))) !== 0) {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                const py = startY + gy * scale + sy;
                const px = xOffset + gx * scale + sx;
                const pos = (py * width + px) * 4;
                rgba[pos + 0] = 0;
                rgba[pos + 1] = 0;
                rgba[pos + 2] = 0;
                rgba[pos + 3] = 255;
              }
            }
          }
        }
      }
    }

    const png = encodeRgbaToPng(width, height, rgba);
    const fileName = `${fileId}.png`;

    // 编码前点阵一致性自检
    const ocrRead = localOcrReadFlag(rgba, width, height, playAreaHeight);
    if (ocrRead !== flag) {
      throw new Error(`Self-check OCR failed for ${fileName}: expected "${flag}" but got "${ocrRead}"`);
    }

    items.push({
      file: fileName,
      flag,
      // 真值中心来源 (a)：落入生成时记录的真实几何
      elements: [elem1, elem2],
      pngBuffer: png,
      hash: fileId,
    });
  }

  return items;
}

/**
 * 编码前点阵一致性自检：
 * 在底部文字带扫描内存点阵像素并精确匹配 BITMAP_FONT_5x7 模版。
 * 机械自检防字太小、被遮挡、位置偏移导致的假阴性。
 */
export function localOcrReadFlag(
  rgba: Uint8Array,
  width: number,
  height: number,
  footerStartY = 510,
): string {
  let minTextY = height;
  let maxTextY = 0;
  let minTextX = width;
  let maxTextX = 0;

  for (let y = footerStartY + 1; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = (y * width + x) * 4;
      if (rgba[pos + 0]! < 50 && rgba[pos + 1]! < 50 && rgba[pos + 2]! < 50) {
        if (y < minTextY) minTextY = y;
        if (y > maxTextY) maxTextY = y;
        if (x < minTextX) minTextX = x;
        if (x > maxTextX) maxTextX = x;
      }
    }
  }

  if (minTextY > maxTextY || minTextX > maxTextX) {
    return "";
  }

  const detectedH = maxTextY - minTextY + 1;
  const scale = Math.round(detectedH / 7);
  if (scale < 1) return "";

  const charW = 5 * scale;
  const spacing = 2 * scale;
  const slotW = charW + spacing;
  const totalW = maxTextX - minTextX + 1;
  const charCount = Math.round((totalW + spacing) / slotW);

  let result = "";
  for (let i = 0; i < charCount; i++) {
    const slotStartX = minTextX + i * slotW;
    let bestChar = "?";
    let bestScore = -1;

    for (const [candidate, glyph] of Object.entries(BITMAP_FONT_5x7)) {
      let match = 0;
      let total = 0;
      for (let gy = 0; gy < 7; gy++) {
        const rowBits = glyph[gy]!;
        for (let gx = 0; gx < 5; gx++) {
          const expected = (rowBits & (1 << (4 - gx))) !== 0;
          const py = minTextY + Math.round((gy + 0.5) * scale);
          const px = slotStartX + Math.round((gx + 0.5) * scale);
          if (py < height && px < width) {
            const pos = (py * width + px) * 4;
            const isDark = rgba[pos + 0]! < 50;
            if (isDark === expected) match++;
            total++;
          }
        }
      }
      const score = match / (total || 1);
      if (score > bestScore) {
        bestScore = score;
        bestChar = candidate;
      }
    }
    result += bestChar;
  }

  return result;
}

/**
 * 确定性判定规则（Judge）：
 * 1. 规范化真值顺序：按 (中心 y, 中心 x) 升序规范化为 [GT_1, GT_2]。
 * 2. 严格按索引比较：E1 必须匹配 GT_1，E2 必须匹配 GT_2。
 * 3. 顺序错判为 FAIL（不通过），记录 orderReversed: true。
 */
export function judgePrediction(
  groundTruth: { flag: string; elements: ElementSpec[] },
  prediction: ModelPrediction,
): JudgeResult {
  const details: string[] = [];
  if (prediction.isTruncated) {
    return {
      passed: false,
      flagPassed: false,
      geometryPassed: false,
      orderPassed: false,
      orderReversed: false,
      details: ["Image was truncated/omitted due to budget limit"],
    };
  }

  // 1. FLAG 判定
  const flagPassed = prediction.flag.trim() === groundTruth.flag.trim();
  if (!flagPassed) {
    details.push(`FLAG mismatch: expected "${groundTruth.flag}", got "${prediction.flag}"`);
  }

  // 2. 规范化真值
  const sortedGT = normalizeElements(groundTruth.elements);
  if (sortedGT.length !== 2 || prediction.elements.length !== 2) {
    return {
      passed: false,
      flagPassed,
      geometryPassed: false,
      orderPassed: false,
      orderReversed: false,
      details: [
        `Element count mismatch: GT has ${sortedGT.length}, prediction has ${prediction.elements.length}`,
      ],
    };
  }

  const [gt1, gt2] = sortedGT as [ElementSpec, ElementSpec];
  const [p1, p2] = prediction.elements as [ModelPredictionElement, ModelPredictionElement];

  function matchElem(pred: ModelPredictionElement, gt: ElementSpec): boolean {
    return (
      pred.shape === gt.shape &&
      pred.color === gt.color &&
      pred.size === gt.size &&
      pred.grid === gt.grid
    );
  }

  const matchStraight1 = matchElem(p1, gt1);
  const matchStraight2 = matchElem(p2, gt2);

  const matchReversed1 = matchElem(p1, gt2);
  const matchReversed2 = matchElem(p2, gt1);

  let orderPassed = false;
  let orderReversed = false;
  let geometryPassed = false;

  if (matchStraight1 && matchStraight2) {
    orderPassed = true;
    geometryPassed = true;
  } else if (matchReversed1 && matchReversed2) {
    orderPassed = false;
    orderReversed = true;
    geometryPassed = false;
    details.push(
      `Element order reversed: E1 got [${p1.shape} ${p1.color} ${p1.size} ${p1.grid}] (matches GT2), ` +
        `E2 got [${p2.shape} ${p2.color} ${p2.size} ${p2.grid}] (matches GT1). Order rule requires (center y, center x) ascending.`
    );
  } else {
    orderPassed = false;
    geometryPassed = false;
    if (!matchStraight1) {
      details.push(
        `E1 mismatch: expected [${gt1.shape} ${gt1.color} ${gt1.size} ${gt1.grid}], got [${p1.shape} ${p1.color} ${p1.size} ${p1.grid}]`
      );
    }
    if (!matchStraight2) {
      details.push(
        `E2 mismatch: expected [${gt2.shape} ${gt2.color} ${gt2.size} ${gt2.grid}], got [${p2.shape} ${p2.color} ${p2.size} ${p2.grid}]`
      );
    }
  }

  const passed = flagPassed && geometryPassed && orderPassed;
  return {
    passed,
    flagPassed,
    geometryPassed,
    orderPassed,
    orderReversed,
    details,
  };
}
