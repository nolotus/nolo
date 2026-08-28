import type { Cue, SplitOptions } from "./types";

/**
 * 批量切分 cues 列表中超长或超时长的 cue
 */
export function splitCues(cues: Cue[], opts?: SplitOptions): Cue[] {
  const result: Cue[] = [];
  for (const cue of cues) {
    result.push(...splitCue(cue, opts));
  }
  return result;
}

/**
 * 对单条 Cue 进行超长/超时长二次切分。
 * 约束：
 * - 单条最多 maxChars 个字符（默认 24）
 * - 最长 maxDuration 秒（默认 6.0）
 */
export function splitCue(cue: Cue, opts?: SplitOptions): Cue[] {
  const maxChars = opts?.maxChars ?? 24;
  const maxDuration = opts?.maxDuration ?? 6.0;

  const duration = cue.end - cue.start;
  const textLength = cue.text.length;

  if (textLength <= maxChars && duration <= maxDuration) {
    return [cue];
  }

  const getCleanLen = (s: string) => {
    const clean = s.replace(/[\s\p{P}\p{S}]/gu, "");
    return clean.length > 0 ? clean.length : s.length;
  };

  const isSecondaryPunct = (ch: string) => /[,;:，、；：]/u.test(ch);

  let targetLimitChars = maxChars;
  if (duration > maxDuration) {
    const charRatio = maxDuration / duration;
    const durationBasedLimit = Math.max(1, Math.floor(textLength * charRatio));
    targetLimitChars = Math.min(maxChars, durationBasedLimit);
  }

  const chars = Array.from(cue.text);
  const searchLimit = Math.min(chars.length - 1, targetLimitChars);

  let splitIndex = -1;

  // 1. 在 <= searchLimit 范围内查找最靠右的次级标点
  for (let i = searchLimit - 1; i >= 0; i--) {
    if (isSecondaryPunct(chars[i])) {
      splitIndex = i + 1;
      break;
    }
  }

  // 2. 查找空格
  if (splitIndex <= 0) {
    for (let i = searchLimit - 1; i >= 0; i--) {
      if (chars[i] === " ") {
        splitIndex = i + 1;
        break;
      }
    }
  }

  // 3. 延伸至 maxChars 范围寻找次级标点
  if (
    splitIndex <= 0 &&
    searchLimit < maxChars &&
    chars.length > searchLimit
  ) {
    const extendedLimit = Math.min(chars.length - 1, maxChars);
    for (let i = extendedLimit - 1; i >= searchLimit; i--) {
      if (isSecondaryPunct(chars[i])) {
        splitIndex = i + 1;
        break;
      }
    }
  }

  // 4. 硬切
  if (splitIndex <= 0) {
    splitIndex = searchLimit > 0 ? searchLimit : 1;
  }

  splitIndex = Math.max(1, Math.min(chars.length - 1, splitIndex));

  const leftText = chars.slice(0, splitIndex).join("");
  const rightText = chars.slice(splitIndex).join("");

  const leftCleanLen = getCleanLen(leftText);
  const rightCleanLen = getCleanLen(rightText);
  const totalCleanLen = leftCleanLen + rightCleanLen;

  const splitTime =
    totalCleanLen > 0
      ? cue.start + duration * (leftCleanLen / totalCleanLen)
      : cue.start + duration * 0.5;

  const leftCue: Cue = {
    start: cue.start,
    end: splitTime,
    text: leftText,
  };

  const rightCue: Cue = {
    start: splitTime,
    end: cue.end,
    text: rightText,
  };

  // 无进度保护：切分未能真正缩短任一侧时直接返回，避免无限递归导致栈溢出。
  // 触发场景：单字符 cue 且时长超过 maxDuration（切不动但绕过了顶部 guard）。
  if (leftText === cue.text || rightText === "" || leftText === "") {
    return [cue];
  }

  return [...splitCue(leftCue, opts), ...splitCue(rightCue, opts)];
}
