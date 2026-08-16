import type { Word } from "./types";

/**
 * 将 Word 数组整体偏移指定秒数。
 * 纯函数：不修改入参，返回新数组。
 */
export function offsetWords(words: Word[], offsetSec: number): Word[] {
  if (!words || words.length === 0) {
    return [];
  }

  const offset = Number(offsetSec) || 0;
  if (offset === 0) {
    return words.map((w) => ({ ...w }));
  }

  return words.map((w) => ({
    word: w.word,
    start: w.start + offset,
    end: w.end + offset,
  }));
}

/**
 * 合并多个带偏移的 word 段，按段顺序拼接成单条 words 数组。
 * 输入已按时间顺序排列；每段先偏移再追加。
 */
export function mergeWordChunks(
  chunks: { words: Word[]; offsetSec: number }[]
): Word[] {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const result: Word[] = [];
  for (const chunk of chunks) {
    const words = chunk.words || [];
    const offset = Number(chunk.offsetSec) || 0;
    if (words.length === 0) {
      continue;
    }

    for (const w of words) {
      result.push({
        word: w.word,
        start: w.start + offset,
        end: w.end + offset,
      });
    }
  }

  return result;
}
