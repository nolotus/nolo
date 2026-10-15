import { fitImageToCells } from "./terminalGraphics";
import { stripAnsi, truncateAnsi, visibleWidth } from "./tuiAnsi";

/**
 * 结构化图片元数据（纯数据，不含 PNG 字节；字节加载由后续块负责，本模块不做 IO）。
 * key 在同一 turn 内稳定，供后续块映射 kitty 图片 id；width/height 为源像素尺寸。
 */
export type TurnImage = {
  key: string;
  label: string;
  width: number;
  height: number;
};

/** 图片占位行携带的布局信息，供后续视口渲染块定位与绘制。 */
export type TurnImageRowInfo = {
  key: string;
  /** 该行在本图片占位块内的 0 起始序号。 */
  index: number;
  /** 本图片占位总行数（图形模式为等比缩放行数，文字降级为 1）。 */
  rows: number;
  /** 占用列数（图形模式为缩放列数，文字降级为可见宽度）。 */
  columns: number;
  /** true 表示预留给 kitty 图片；false 表示文字降级行。 */
  graphics: boolean;
};

/**
 * 图片占位行没有正文 source 字符：sourceStart === sourceEnd，都取正文末尾
 * （正文长度），是一个空区间，选区复制不会从占位行取到任何文字。
 */
export type TurnImageRow = {
  rendered: string;
  sourceStart: number;
  sourceEnd: number;
  prefixWidth: 0;
  image: TurnImageRowInfo;
};

const PLACEHOLDER_PREFIX = "[图片] ";
// 控制字符、C1、零宽与双向控制符：标签来自外部，不能原样写进终端。
const UNSAFE_LABEL_CHARS =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;

/** 标签净化：去 ANSI、替换不可见控制符、折叠空白；空则回退为 "image"。 */
export function sanitizeImageLabel(label: string): string {
  const cleaned = stripAnsi(String(label))
    .replace(UNSAFE_LABEL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : "image";
}

function hasUsableSize(image: TurnImage): boolean {
  return (
    Number.isFinite(image.width) &&
    Number.isFinite(image.height) &&
    image.width > 0 &&
    image.height > 0
  );
}

/**
 * 图片占位布局行。graphicsEnabled 为 true 且尺寸可用时预留等比缩放行数（≤8）；
 * 否则（关闭或尺寸非法）输出一行文字附件提示。bodyEnd 为正文长度，用作空 source 区间。
 */
export function layoutImageRows(
  images: readonly TurnImage[],
  contentWidth: number,
  graphicsEnabled: boolean,
  bodyEnd: number,
): TurnImageRow[] {
  const width = Math.max(1, Math.floor(contentWidth));
  const rows: TurnImageRow[] = [];
  for (const image of images) {
    if (graphicsEnabled && hasUsableSize(image)) {
      const fit = fitImageToCells(
        { width: image.width, height: image.height },
        { maxColumns: width },
      );
      for (let index = 0; index < fit.rows; index++) {
        rows.push({
          rendered: "",
          sourceStart: bodyEnd,
          sourceEnd: bodyEnd,
          prefixWidth: 0,
          image: { key: image.key, index, rows: fit.rows, columns: fit.columns, graphics: true },
        });
      }
      continue;
    }
    const rendered = truncateAnsi(`${PLACEHOLDER_PREFIX}${sanitizeImageLabel(image.label)}`, width);
    rows.push({
      rendered,
      sourceStart: bodyEnd,
      sourceEnd: bodyEnd,
      prefixWidth: 0,
      image: {
        key: image.key,
        index: 0,
        rows: 1,
        columns: Math.min(visibleWidth(rendered), width),
        graphics: false,
      },
    });
  }
  return rows;
}

/** 图片元数据的稳定签名：任一字段变化即视为布局过期（供 cache 失效判定）。无图为空串。 */
export function turnImagesSignature(images: readonly TurnImage[] | undefined): string {
  if (!images || images.length === 0) return "";
  return images
    .map((image) => JSON.stringify([image.key, image.label, image.width, image.height]))
    .join("\n");
}
