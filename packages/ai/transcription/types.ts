export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface Segment {
  id?: number;
  seek?: number;
  start: number;
  end: number;
  text: string;
  tokens?: number[];
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
  words?: Word[];
}

export interface WhisperVerboseResponse {
  task?: string;
  language?: string;
  duration?: number;
  text: string;
  words: Word[];
  segments?: Segment[];
}

export interface Cue {
  start: number;
  end: number;
  text: string;
}

export interface AlignOptions {
  minMatchRatio?: number; // 默认 0.90
  /** 是否启用相邻性/子串检查以防御 LCS 高频字蒙混；默认 true */
  adjacencyCheck?: boolean;
  /** 相邻性检查参数：最长公共子串占 LCS 长度的最小比例；默认 0.3 */
  minLongestSubstringRatio?: number;
}

export type AlignResult =
  | { ok: true; cues: Cue[] }
  | { ok: false; reason: string };

export interface SplitOptions {
  maxChars?: number; // 默认 24
  maxDuration?: number; // 默认 6.0
}

export interface BuildOptions extends AlignOptions, SplitOptions {
  chunkMaxChars?: number; // 默认 300
  concurrency?: number; // 标点请求并发数，默认 8
  apiKey?: string;
  punctuateFn?: (text: string) => Promise<string>;
}

export interface AudioChunk {
  filePath: string;
  startOffsetSec: number;
  durationSec: number;
}

export interface SplitAudioOptions {
  /** 单段最大字节数；默认 24MB（留 1MB 余量，低于 DeepInfra 25MB 上限 26214400） */
  maxBytes?: number;
  /** 仅当找不到足够静音点时的固定段时长（秒）；默认 600 */
  fallbackDurationSec?: number;
  /** 静音检测阈值（dB）；默认 -40 */
  silenceThresholdDb?: number;
  /** 静音最小持续时间（秒），用于判定可切点；默认 0.3 */
  minSilenceSec?: number;
  /** ffmpeg 可执行文件路径；默认 /opt/homebrew/bin/ffmpeg */
  ffmpegPath?: string;
  /**
   * 可注入的文件字节数（测试用，绕过 statSync）。
   * 缺省时用 statSync 读取真实文件大小。
   */
  fileSizeBytes?: number;
  /**
   * 可注入的 execFile 实现，用于测试 mock。
   * 签名需与 Node/Bun child_process.execFile 兼容。
   */
  execFileImpl?: ExecFileFn;
}

/** execFile 函数签名子集，用于注入 */
export type ExecFileFn = (
  file: string,
  args: readonly string[],
  options: { encoding: "buffer" | "utf8"; maxBuffer?: number },
  callback: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void
) => unknown;
