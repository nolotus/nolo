// src/calcGeminiImageTokens.ts

/**
 * Gemini 图片 token 计算（粗略公式版）
 *
 * 规则：
 * - 若宽高都 <= 384，则直接按 1 个图块：258 tokens
 * - 否则：
 *   - uRaw = floor( min(width, height) / 1.5 )
 *   - u = clamp(uRaw, 256, 768)
 *   - tilesX = ceil(width  / u)
 *   - tilesY = ceil(height / u)
 *   - tiles  = tilesX * tilesY
 *   - tokens = tiles * 258
 */

export const GEMINI_IMAGE_TILE_TOKENS = 258;
export const GEMINI_SMALL_IMAGE_THRESHOLD = 384;
export const GEMINI_MIN_TILE_SIZE = 256;
export const GEMINI_MAX_TILE_SIZE = 768;

const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

const ceilDiv = (numerator: number, denominator: number): number =>
    Math.ceil(numerator / denominator);

/**
 * 计算单张图片的 token 数（适用于 Gemini 1.5 / 2.0 / 2.5 的粗略估算）
 */
export const calculateGeminiImageTokens = (
    width: number,
    height: number,
): number => {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        throw new TypeError('width 和 height 必须是有限数字');
    }
    if (width <= 0 || height <= 0) {
        throw new RangeError('width 和 height 必须为正数');
    }

    // 情况 1：小图（两个维度都 <= 384）
    if (width <= GEMINI_SMALL_IMAGE_THRESHOLD && height <= GEMINI_SMALL_IMAGE_THRESHOLD) {
        return GEMINI_IMAGE_TILE_TOKENS;
    }

    // 情况 2：大图，按粗略公式计算图块数量
    const minSide = Math.min(width, height);
    const rawUnit = Math.floor(minSide / 1.5);
    const unit = clamp(rawUnit, GEMINI_MIN_TILE_SIZE, GEMINI_MAX_TILE_SIZE);

    const tilesX = ceilDiv(width, unit);
    const tilesY = ceilDiv(height, unit);
    const tiles = tilesX * tilesY;

    return tiles * GEMINI_IMAGE_TILE_TOKENS;
};