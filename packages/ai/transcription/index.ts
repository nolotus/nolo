/**
 * 转写后处理模块
 *
 * 转写请求侧实测结论：
 * 1. Whisper 直接接受 mp4，无需 ffmpeg 转码；
 * 2. 不要降采样，降采样会降低识别准确率（实测「多agent」被压成「多一阵」）。
 */

import type { WhisperVerboseResponse, Cue, BuildOptions } from "./types";
import { chunkWords } from "./chunk";
import { alignPunctuatedText } from "./align";
import { splitCues } from "./split";
import { formatSRT } from "./srt";
import { punctuateText } from "./punctuate";

export * from "./types";
export * from "./chunk";
export * from "./align";
export * from "./split";
export * from "./srt";
export * from "./punctuate";
export * from "./offset";
export * from "./audioSplit";

/**
 * 完整编排构建字幕及 SRT
 */
export async function buildSubtitles(
  resp: WhisperVerboseResponse,
  opts?: BuildOptions
): Promise<{ cues: Cue[]; srt: string; text: string; degradedChunks: number }> {
  if (!resp || !resp.words || resp.words.length === 0) {
    return { cues: [], srt: "", text: "", degradedChunks: 0 };
  }

  const chunkMaxChars = opts?.chunkMaxChars ?? 300;
  const chunks = chunkWords(resp.words, chunkMaxChars);

  let degradedChunks = 0;
  const allFinalCues: Cue[] = [];
  const punctuatedTexts: string[] = [];

  const punctuateFn =
    opts?.punctuateFn ??
    (async (text: string) => {
      const apiKey = opts?.apiKey || process.env.DEEPINFRA_API_KEY;
      if (!apiKey) {
        throw new Error("No API key available");
      }
      return await punctuateText(text, apiKey);
    });

  // 分块标点彼此独立（每块只依赖自身文本，无跨块状态），故并发执行。
  // 串行版实测：40 分钟音频切 38 块耗时 539s，其中绝大部分是等待网络。
  // 只并发网络这一步；对齐与切分仍按原顺序串行，保证 cue 顺序与降级计数语义不变。
  const concurrency = Math.max(1, opts?.concurrency ?? 8);
  const punctuatedByIndex: (string | null)[] = new Array(chunks.length).fill(null);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunks.length) }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= chunks.length) return;
        try {
          punctuatedByIndex[i] = await punctuateFn(chunks[i].text);
        } catch {
          // API 调用失败或缺乏 key -> 该块降级为 rawText
          punctuatedByIndex[i] = null;
        }
      }
    })
  );

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const rawText = chunk.text;
    const pText = punctuatedByIndex[ci];

    if (pText !== null) {
      const alignRes = alignPunctuatedText(chunk.words, pText, opts);
      if (alignRes.ok) {
        punctuatedTexts.push(pText);
        const splitted = splitCues(alignRes.cues, opts);
        allFinalCues.push(...splitted);
        continue;
      }
    }

    // 校验失败或掉线 -> 降级块处理 (degraded chunk)
    degradedChunks++;
    punctuatedTexts.push(rawText);
    const fallbackRes = alignPunctuatedText(chunk.words, rawText, opts);
    if (fallbackRes.ok) {
      const splitted = splitCues(fallbackRes.cues, opts);
      allFinalCues.push(...splitted);
    }
  }

  const srt = formatSRT(allFinalCues);
  const text = punctuatedTexts.join("");

  return {
    cues: allFinalCues,
    srt,
    text,
    degradedChunks,
  };
}
