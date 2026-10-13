// packages/ai/transcription/silenceTrim.ts
//
// 尾部静音截取建议（方案 §2 T5）：转写**前**若探到「尾部基本没人声 ≥3 分钟」，
// 提示用户「建议截到 hh:mm:ss，可省 N 分钟」，由用户决定是否只处理前段。
//
// 为什么在这里另写一份，而不是复用现成实现：
// - `packages/server/handlers/mediaJobs/silence.ts` 的 detectSilenceTrimSuggestions
//   是服务端实现（还含中段静音）。TUI 不能 import server 代码（依赖方向
//   ai ← server），所以按同一算法在这里落一份**纯函数**子集。
//   `packages/server/handlers/mediaJobs/silence.ts` 的 `parseSilencedetect` /
//   `silenceToTrimSuggestions` 与本文件语义对齐；改动请两边一起看。
// - `packages/ai/transcription/audioSplit.ts` 的 detectSilenceRanges 不能复用：
//   它取静音**中点**当分片切点，且末尾未闭合的 silence_start 只按 minSilenceSec
//   计长（分片够用，问「尾部静音有多长」则错），语义不同。
//
// 纯函数不碰 ffmpeg，便于单测；detectTrailingSilenceSuggestion 只做一次
// silencedetect 解码（可选信息，任何失败都返回 null，绝不阻断转写）。

import { execFile } from "node:child_process";
import type { TrimSuggestion } from "ai/lecture/types";
import { resolveFfmpegPath } from "./mediaPreprocess";
import type { ExecFileFn } from "./types";

/** 触发建议的最小尾部静音时长（秒）：≥3 分钟才值得打断用户。 */
export const MIN_TRAILING_SILENCE_SEC = 180;
/** silencedetect 噪声门槛（dB）与最短静音判定（秒），与 server 侧保持一致。 */
export const SILENCE_NOISE_DB = -35;
export const SILENCE_MIN_DETECT_SEC = 2;

export interface SilenceInterval {
  startSec: number;
  endSec: number;
}

/** 秒 → hh:mm:ss（向下取整，与 server 侧 fmt 同口径）。 */
export function formatHms(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/**
 * 解析 ffmpeg silencedetect 的 stderr。
 * 末尾只有 silence_start 没有 silence_end → 静音持续到文件结束（durationSec）。
 */
export function parseSilencedetectIntervals(
  stderr: string,
  durationSec: number,
): SilenceInterval[] {
  const out: SilenceInterval[] = [];
  let open: number | null = null;
  for (const line of stderr.split(/\r?\n/)) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (s) {
      open = Math.max(0, Number(s[1]));
      continue;
    }
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (e && open !== null) {
      out.push({ startSec: open, endSec: Number(e[1]) });
      open = null;
    }
  }
  if (open !== null && durationSec > open) {
    out.push({ startSec: open, endSec: durationSec });
  }
  return out;
}

/**
 * 静音区间 → **尾部**截取建议（无则 null）。
 *
 * 「尾部」判定与 server 同口径：静音结束点落在文件末尾 1s 内。
 * 返回的 TrimSuggestion 语义是「建议丢弃 [fromSec, toSec]」；对尾部静音
 * 即 toSec = 时长、fromSec = 静音起点，因此「按建议处理」= 只转写
 * [0, fromSec)。
 */
export function buildTrailingSilenceSuggestion(
  silences: SilenceInterval[],
  durationSec: number,
  minSec: number = MIN_TRAILING_SILENCE_SEC,
): TrimSuggestion | null {
  if (!Number.isFinite(durationSec) || durationSec <= minSec) return null;
  let best: SilenceInterval | null = null;
  for (const s of silences) {
    if (durationSec - s.endSec > 1) continue; // 不是尾部
    const len = s.endSec - s.startSec;
    if (len < minSec) continue;
    // 取起点最早（跨度最长）的那段：尾部被一声咳嗽切成两段时仍报整段。
    if (!best || s.startSec < best.startSec) best = s;
  }
  if (!best) return null;
  const fromSec = Math.round(best.startSec);
  if (fromSec <= 0) return null; // 整份都静音 → 没有「截到」可言
  const minutes = Math.round((durationSec - fromSec) / 60);
  return {
    fromSec,
    toSec: Math.round(durationSec),
    reason: `${formatHms(fromSec)} 之后基本无人声，建议截掉，省 ${minutes} 分钟`,
    signal: "silence",
    confidence: 0.9,
  };
}

/** 建议省下的分钟数（四舍五入），提示文案与测试共用同一算法。 */
export function suggestionSavedMinutes(
  suggestion: TrimSuggestion,
  durationSec: number,
): number {
  return Math.round((durationSec - suggestion.fromSec) / 60);
}

/**
 * 跑一次 silencedetect 并给出尾部静音建议；无建议 / 任何失败 → null。
 *
 * 成本：一次全片解码（与转码同量级，1.5h 录音约数十秒）。所以调用方只在
 * 已经有用户等着看结果、且时长可能省下 ≥3 分钟时才调（durationSec 过短
 * 直接短路返回，不 spawn ffmpeg）。
 */
export async function detectTrailingSilenceSuggestion(
  filePath: string,
  durationSec: number,
  opts: {
    execFileImpl?: ExecFileFn;
    ffmpegPath?: string;
    minSec?: number;
  } = {},
): Promise<TrimSuggestion | null> {
  const minSec = opts.minSec ?? MIN_TRAILING_SILENCE_SEC;
  // 时长未知（探测失败）或短于门槛：不可能省出 minSec，不做无谓的解码。
  if (!Number.isFinite(durationSec) || durationSec <= minSec) return null;
  const runner = opts.execFileImpl ?? (execFile as ExecFileFn);
  // -nostdin 必要：TUI 里 stdin 是 raw 模式 TTY，ffmpeg 交互按键处理会抢读。
  const args = [
    "-hide_banner",
    "-nostats",
    "-nostdin",
    "-i",
    filePath,
    "-vn",
    "-af",
    `silencedetect=noise=${SILENCE_NOISE_DB}dB:d=${SILENCE_MIN_DETECT_SEC}`,
    "-f",
    "null",
    "-",
  ];
  try {
    const stderr = await new Promise<string>((resolve, reject) => {
      runner(
        opts.ffmpegPath ?? resolveFfmpegPath(),
        args,
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
        (error, _stdout, stderrText) =>
          error ? reject(error) : resolve(String(stderrText ?? "")),
      );
    });
    return buildTrailingSilenceSuggestion(
      parseSilencedetectIntervals(stderr, durationSec),
      durationSec,
      minSec,
    );
  } catch {
    // 建议是可选信息：探测失败静默返回 null，转写照原范围进行。
    return null;
  }
}
