import type { Cue } from "./types";

/**
 * 秒数转换为 SRT 时间戳格式：HH:MM:SS,mmm
 * 例如：3723.456 -> "01:02:03,456"
 */
export function formatSrtTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    seconds = 0;
  }
  const totalMillis = Math.round(seconds * 1000);
  const millis = totalMillis % 1000;
  const totalSeconds = Math.floor(totalMillis / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");

  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * 将 Cue 数组格式化为标准 SRT 文本
 */
export function formatSRT(cues: Cue[]): string {
  if (!cues || cues.length === 0) {
    return "";
  }

  return (
    cues
      .map((cue, index) => {
        const seq = index + 1;
        const startTime = formatSrtTime(cue.start);
        const endTime = formatSrtTime(cue.end);
        return `${seq}\n${startTime} --> ${endTime}\n${cue.text}`;
      })
      .join("\n\n") + "\n"
  );
}
