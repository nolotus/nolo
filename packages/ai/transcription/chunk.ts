import type { Word } from "./types";

export interface WordChunk {
  words: Word[];
  text: string;
}

/**
 * 按 words 边界将 words 切成分块，防止从词中间截断。
 */
export function chunkWords(
  words: Word[],
  maxCharsPerChunk: number = 300
): WordChunk[] {
  if (!words || words.length === 0) {
    return [];
  }

  const chunks: WordChunk[] = [];
  let currentWords: Word[] = [];
  let currentLength = 0;

  for (const word of words) {
    const wLen = word.word.length;
    if (currentWords.length > 0 && currentLength + wLen > maxCharsPerChunk) {
      chunks.push({
        words: currentWords,
        text: currentWords.map((w) => w.word).join(""),
      });
      currentWords = [word];
      currentLength = wLen;
    } else {
      currentWords.push(word);
      currentLength += wLen;
    }
  }

  if (currentWords.length > 0) {
    chunks.push({
      words: currentWords,
      text: currentWords.map((w) => w.word).join(""),
    });
  }

  return chunks;
}
