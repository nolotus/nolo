import type { Word, Cue, AlignOptions, AlignResult } from "./types";

/**
 * 判断一个字符是否为空白或标点符号/符号
 */
export function isPunctOrSpace(ch: string): boolean {
  return /^[\s\p{P}\p{S}]$/u.test(ch);
}

interface CleanCharInfo {
  char: string;
  start: number;
  end: number;
}

export interface LcsMatchResult {
  lcsLength: number;
  matches: Array<{ aIndex: number; bIndex: number }>;
}

/**
 * 用二维 DP 计算序列 a 与 b 的最长公共子序列（LCS）匹配
 */
export function lcsMatch(
  a: string[] | string,
  b: string[] | string
): LcsMatchResult {
  const arrA = typeof a === "string" ? Array.from(a) : a;
  const arrB = typeof b === "string" ? Array.from(b) : b;
  const n = arrA.length;
  const m = arrB.length;

  if (n === 0 || m === 0) {
    return { lcsLength: 0, matches: [] };
  }

  // 1. DP 表计算
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (arrA[i - 1] === arrB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 2. 回溯求解匹配索引对
  let i = n;
  let j = m;
  const matches: Array<{ aIndex: number; bIndex: number }> = [];

  while (i > 0 && j > 0) {
    if (arrA[i - 1] === arrB[j - 1]) {
      matches.push({ aIndex: i - 1, bIndex: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  matches.reverse();
  return {
    lcsLength: dp[n][m],
    matches,
  };
}

/**
 * 计算序列 a 与 b 的最长公共子串长度（相邻匹配，非子序列）。
 * 用于防御 LCS 盲区：LCS 只看公共子序列、不看相邻性，「整段改写但保留
 * 大量高频字（的/是/我/了/在）」可能让 LCS ratio 蒙混过关，但最长公共
 * 子串占比会显著偏低。
 * 空间优化：滚动一维 DP，O(n*m) 时间、O(m) 空间。
 */
export function longestCommonSubstringLength(
  a: string[] | string,
  b: string[] | string
): number {
  const arrA = typeof a === "string" ? Array.from(a) : a;
  const arrB = typeof b === "string" ? Array.from(b) : b;
  const n = arrA.length;
  const m = arrB.length;
  if (n === 0 || m === 0) return 0;

  const dp: number[] = new Array(m + 1).fill(0);
  let maxLen = 0;
  for (let i = 1; i <= n; i++) {
    let prev = 0;
    for (let j = 1; j <= m; j++) {
      const tmp = dp[j];
      if (arrA[i - 1] === arrB[j - 1]) {
        dp[j] = prev + 1;
        if (dp[j] > maxLen) maxLen = dp[j];
      } else {
        dp[j] = 0;
      }
      prev = tmp;
    }
  }
  return maxLen;
}

/**
 * 对齐标点文本与原始 words，输出字幕 Cue 列表。
 * 基于 LCS 容错对齐，插值与兜底计算未匹配字符的时间戳。
 */
export function alignPunctuatedText(
  words: Word[],
  punctuatedText: string,
  opts?: AlignOptions
): AlignResult {
  const minMatchRatio = opts?.minMatchRatio ?? 0.9;

  // 1. 提取 words 中所有非标点/非空白字符及时间戳（按词内字符插值）
  const wordsClean: CleanCharInfo[] = [];
  if (words && words.length > 0) {
    for (const word of words) {
      const chars = Array.from(word.word).filter((ch) => !isPunctOrSpace(ch));
      const n = chars.length;
      if (n === 0) continue;
      const duration = word.end - word.start;
      chars.forEach((ch, idx) => {
        wordsClean.push({
          char: ch,
          start: word.start + duration * (idx / n),
          end: word.start + duration * ((idx + 1) / n),
        });
      });
    }
  }

  // 2. 提取 punctuatedText 中所有非标点/非空白字符
  const punctChars = Array.from(punctuatedText || "");
  const punctClean: { char: string; index: number }[] = [];
  punctChars.forEach((ch, idx) => {
    if (!isPunctOrSpace(ch)) {
      punctClean.push({ char: ch, index: idx });
    }
  });

  // 处理空情况
  if (wordsClean.length === 0 && punctClean.length === 0) {
    return { ok: true, cues: [] };
  }

  // 3. 计算 LCS 匹配
  const { lcsLength, matches } = lcsMatch(
    wordsClean.map((c) => c.char),
    punctClean.map((c) => c.char)
  );

  const maxLen = Math.max(wordsClean.length, punctClean.length);
  const matchRatio = maxLen === 0 ? 1.0 : lcsLength / maxLen;

  if (matchRatio < minMatchRatio) {
    // 找出首个不匹配的位置
    let firstMismatchIndex = Math.min(wordsClean.length, punctClean.length);
    for (let i = 0; i < Math.min(wordsClean.length, punctClean.length); i++) {
      if (wordsClean[i].char !== punctClean[i].char) {
        firstMismatchIndex = i;
        break;
      }
    }
    return {
      ok: false,
      reason: `Match ratio ${matchRatio.toFixed(2)} below minMatchRatio ${minMatchRatio} (mismatch at clean index ${firstMismatchIndex})`,
    };
  }

  // 3.5 LCS 盲区防御：即使 LCS ratio 达标，若最长公共子串占比过低，
  // 说明匹配是「稀疏散点」（高频字蒙混，如整段改写但保留大量 的/是/我/了/在），
  // 产出的是垃圾时间戳，拒绝该对齐。
  // 分母用 lcsLength 而非 maxLen：真实容错场景（ASR 纠错、纯插入标点）的
  // 最长子串占 LCS 比例仍可观（实测 >= 0.5），而高频字散点蒙混时
  // 最长子串往往只有 1~3 个字符，占比趋近 0，区分度更好。
  const adjacencyCheck = opts?.adjacencyCheck ?? true;
  if (adjacencyCheck && lcsLength > 0) {
    const minSubstringRatio = opts?.minLongestSubstringRatio ?? 0.3;
    const substringLen = longestCommonSubstringLength(
      wordsClean.map((c) => c.char),
      punctClean.map((c) => c.char)
    );
    const substringRatio = substringLen / lcsLength;
    if (substringRatio < minSubstringRatio) {
      return {
        ok: false,
        reason: `LCS ratio ${matchRatio.toFixed(2)} passed but longest-common-substring covers only ${substringRatio.toFixed(2)} of LCS (below ${minSubstringRatio}; scattered high-frequency-char matches)`,
      };
    }
  }

  // 4. 为 punctClean 中每个字符计算时间戳 (start, end)
  const matchedAForB = new Map<number, number>();
  for (const match of matches) {
    matchedAForB.set(match.bIndex, match.aIndex);
  }

  const punctTimes: Array<{ start: number; end: number }> = new Array(
    punctClean.length
  );

  for (let j = 0; j < punctClean.length; j++) {
    if (matchedAForB.has(j)) {
      const aIdx = matchedAForB.get(j)!;
      punctTimes[j] = {
        start: wordsClean[aIdx].start,
        end: wordsClean[aIdx].end,
      };
    } else {
      // 未匹配字符：时间戳插值或兜底
      let prevB: number | null = null;
      for (let k = j - 1; k >= 0; k--) {
        if (matchedAForB.has(k)) {
          prevB = k;
          break;
        }
      }

      let nextB: number | null = null;
      for (let k = j + 1; k < punctClean.length; k++) {
        if (matchedAForB.has(k)) {
          nextB = k;
          break;
        }
      }

      if (prevB !== null && nextB !== null) {
        const prevA = matchedAForB.get(prevB)!;
        const nextA = matchedAForB.get(nextB)!;

        const tStart = wordsClean[prevA].end;
        let tEnd = wordsClean[nextA].start;
        if (tEnd < tStart) tEnd = tStart;

        const gapCount = nextB - prevB - 1;
        const posInGap = j - prevB;
        const step = (tEnd - tStart) / gapCount;

        punctTimes[j] = {
          start: tStart + step * (posInGap - 1),
          end: tStart + step * posInGap,
        };
      } else if (nextB !== null) {
        const firstA = matchedAForB.get(nextB)!;
        const t = wordsClean[firstA].start;
        punctTimes[j] = { start: t, end: t };
      } else if (prevB !== null) {
        const lastA = matchedAForB.get(prevB)!;
        const t = wordsClean[lastA].end;
        punctTimes[j] = { start: t, end: t };
      } else {
        punctTimes[j] = { start: 0, end: 0 };
      }
    }
  }

  // 5. 按句末标点拆分切出 Cues
  const isSentenceEndPunct = (ch: string) => /[。！？…!?]/u.test(ch);

  const cues: Cue[] = [];
  let currentStartCleanIdx = -1;
  let currentEndCleanIdx = -1;
  let cueTextBuffer = "";
  let cleanPtr = 0;

  for (let i = 0; i < punctChars.length; i++) {
    const ch = punctChars[i];
    cueTextBuffer += ch;

    if (!isPunctOrSpace(ch)) {
      if (currentStartCleanIdx === -1) {
        currentStartCleanIdx = cleanPtr;
      }
      currentEndCleanIdx = cleanPtr;
      cleanPtr++;
    }

    const isLastChar = i === punctChars.length - 1;
    const isEndPunct = isSentenceEndPunct(ch);
    const nextChar = i + 1 < punctChars.length ? punctChars[i + 1] : "";
    const shouldClose =
      (isEndPunct && !isSentenceEndPunct(nextChar)) || isLastChar;

    if (shouldClose && cueTextBuffer.trim() !== "") {
      if (
        currentStartCleanIdx !== -1 &&
        currentEndCleanIdx >= currentStartCleanIdx &&
        currentStartCleanIdx < punctTimes.length
      ) {
        const start = punctTimes[currentStartCleanIdx].start;
        const end = punctTimes[currentEndCleanIdx].end;
        cues.push({
          start,
          end,
          text: cueTextBuffer.trim(),
        });
      }
      cueTextBuffer = "";
      currentStartCleanIdx = -1;
      currentEndCleanIdx = -1;
    }
  }

  return { ok: true, cues };
}
