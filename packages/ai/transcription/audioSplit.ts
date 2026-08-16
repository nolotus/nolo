import { execFile } from "node:child_process";
import { statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AudioChunk, ExecFileFn, SplitAudioOptions } from "./types";

const DEFAULT_MAX_BYTES = 24 * 1024 * 1024; // 24MB
const DEFAULT_FALLBACK_DURATION_SEC = 600; // 10min

/** ffmpeg 可执行文件解析：env 显式指定 > PATH 的 ffmpeg > darwin Homebrew 兜底 */
function resolveFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (process.platform === "darwin" && existsSync("/opt/homebrew/bin/ffmpeg")) {
    return "/opt/homebrew/bin/ffmpeg";
  }
  // 非 macOS 服务端走 PATH 解析（Linux 安装 ffmpeg 后即用）
  return "ffmpeg";
}
const DEFAULT_FFMPEG_PATH = resolveFfmpegPath();
const DEFAULT_SILENCE_THRESHOLD_DB = -40;
const DEFAULT_MIN_SILENCE_SEC = 0.3;

interface ProbeInfo {
  durationSec: number;
  bitRateBps: number;
  formatName: string;
}

interface SilenceRange {
  start: number;
  end: number;
}

async function runFfprobe(
  ffmpegPath: string,
  filePath: string,
  execFileImpl?: ExecFileFn
): Promise<ProbeInfo> {
  const runner = execFileImpl ?? (execFile as ExecFileFn);
  const ffprobePath = ffmpegPath.replace(/ffmpeg$/, "ffprobe");

  return new Promise((resolve, reject) => {
    runner(
      ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration,bit_rate:format_name",
        "-of",
        "default=noprint_wrappers=1",
        filePath,
      ],
      { encoding: "utf8", maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`ffprobe failed: ${error.message}; ${stderr}`));
          return;
        }

        const text = typeof stdout === "string" ? stdout : stdout.toString("utf8");
        const durationMatch = text.match(/duration=([\d.]+)/);
        const bitRateMatch = text.match(/bit_rate=([\d.]+)/);
        const formatMatch = text.match(/format_name=([^\r\n]+)/);

        const durationSec = durationMatch ? parseFloat(durationMatch[1]) : 0;
        const bitRateBps = bitRateMatch ? parseFloat(bitRateMatch[1]) : 0;
        const formatName = formatMatch ? formatMatch[1].trim() : "";

        if (!durationSec || durationSec <= 0) {
          reject(new Error(`ffprobe could not determine duration for ${filePath}`));
          return;
        }

        resolve({ durationSec, bitRateBps, formatName });
      }
    );
  });
}

async function detectSilenceRanges(
  ffmpegPath: string,
  filePath: string,
  thresholdDb: number,
  minSilenceSec: number,
  execFileImpl?: ExecFileFn
): Promise<SilenceRange[]> {
  const runner = execFileImpl ?? (execFile as ExecFileFn);

  return new Promise((resolve, reject) => {
    runner(
      ffmpegPath,
      [
        "-i",
        filePath,
        "-af",
        `silencedetect=noise=${thresholdDb}dB:d=${minSilenceSec}`,
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        // ffmpeg 输出到 stderr，并以退出码 0 或 1 结束；我们关注 silencedetect 日志。
        const text =
          (typeof _stdout === "string" ? _stdout : _stdout.toString("utf8")) +
          (typeof stderr === "string" ? stderr : stderr.toString("utf8"));

        const starts = [...text.matchAll(/silence_start:\s*([\d.]+)/g)].map(
          (m) => parseFloat(m[1])
        );
        const ends = [...text.matchAll(/silence_end:\s*([\d.]+)/g)].map(
          (m) => parseFloat(m[1])
        );

        const ranges: SilenceRange[] = [];
        for (let i = 0; i < starts.length; i++) {
          const end = i < ends.length ? ends[i] : starts[i] + minSilenceSec;
          ranges.push({ start: starts[i], end });
        }

        resolve(ranges);
      }
    );
  });
}

function buildChunkCandidates(
  durationSec: number,
  maxBytes: number,
  fallbackDurationSec: number,
  silenceRanges: SilenceRange[]
): Array<{ start: number; end: number }> {
  const candidates: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  while (cursor < durationSec) {
    const remaining = durationSec - cursor;

    // 先用目标时长划出 soft 终点
    let targetEnd = Math.min(
      cursor + fallbackDurationSec,
      durationSec
    );

    // 找不超出目标终点的**最后一个**静音切点（最大化每段长度、减少段数）。
    // 注意：必须是「最后一个」，取第一个会让每段过早切断、段数膨胀，
    // 25MB 超限场景的转写请求数成本/延迟显著上升。
    let chosenCut = -1;
    for (const range of silenceRanges) {
      // 静音段中点作为切分位置
      const mid = (range.start + range.end) / 2;
      if (mid > cursor + 0.1 && mid < targetEnd - 0.1 && mid > chosenCut) {
        chosenCut = mid;
      }
    }

    const end = Math.max(
      cursor + 0.5,
      Math.min(chosenCut > 0 ? chosenCut : targetEnd, durationSec)
    );
    candidates.push({ start: cursor, end });
    cursor = end;
  }

  return candidates;
}

function refineByByteLimit(
  candidates: Array<{ start: number; end: number }>,
  fileSizeBytes: number,
  durationSec: number,
  maxBytes: number
): Array<{ start: number; end: number }> {
  if (fileSizeBytes <= maxBytes || durationSec <= 0) {
    return candidates;
  }

  const avgBps = fileSizeBytes / durationSec;
  const safeDuration = Math.max(1, Math.floor(maxBytes / avgBps) - 1);

  const refined: Array<{ start: number; end: number }> = [];
  for (const c of candidates) {
    let start = c.start;
    const end = c.end;
    while (start < end) {
      const segEnd = Math.min(start + safeDuration, end);
      refined.push({ start, end: segEnd });
      start = segEnd;
    }
  }

  return refined;
}

function pickOutputDir(filePath: string): string {
  return tmpdir();
}

async function splitChunk(
  ffmpegPath: string,
  inputPath: string,
  outputPath: string,
  start: number,
  duration: number,
  execFileImpl?: ExecFileFn
): Promise<void> {
  const runner = execFileImpl ?? (execFile as ExecFileFn);

  return new Promise((resolve, reject) => {
    runner(
      ffmpegPath,
      [
        "-ss",
        String(start),
        "-i",
        inputPath,
        "-t",
        String(duration),
        "-c",
        "copy",
        "-avoid_negative_ts",
        "make_zero",
        "-y",
        outputPath,
      ],
      { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`ffmpeg split failed: ${error.message}; ${stderr}`));
          return;
        }
        resolve();
      }
    );
  });
}

/**
 * 将音频文件切成多段，保证每段不超过 maxBytes。
 *
 * 原则：
 * - 只做时间切分，不转码/不降采样/不改声道码率（ffmpeg -c copy）。
 * - 优先在静音点附近切分；静音点不足时 fallback 固定时长。
 * - 若文件本身已能容纳，则返回单段。
 *
 * 返回每段文件路径 + 该段在整条音频中的起始偏移秒数（startOffsetSec）。
 */
export async function splitAudioFile(
  filePath: string,
  opts?: SplitAudioOptions
): Promise<AudioChunk[]> {
  const maxBytes = opts?.maxBytes ?? DEFAULT_MAX_BYTES;
  const fallbackDurationSec = opts?.fallbackDurationSec ?? DEFAULT_FALLBACK_DURATION_SEC;
  const silenceThresholdDb = opts?.silenceThresholdDb ?? DEFAULT_SILENCE_THRESHOLD_DB;
  const minSilenceSec = opts?.minSilenceSec ?? DEFAULT_MIN_SILENCE_SEC;
  const ffmpegPath = opts?.ffmpegPath ?? DEFAULT_FFMPEG_PATH;
  const execFileImpl = opts?.execFileImpl;

  const fileStats = statSync(filePath, { throwIfNoEntry: false });
  const fileSizeBytes = opts?.fileSizeBytes ?? fileStats?.size ?? 0;

  if (fileSizeBytes === 0) {
    throw new Error(`Audio file is empty or missing: ${filePath}`);
  }

  // 单段即可容纳
  if (fileSizeBytes <= maxBytes) {
    const probe = await runFfprobe(ffmpegPath, filePath, execFileImpl);
    return [
      {
        filePath,
        startOffsetSec: 0,
        durationSec: probe.durationSec,
      },
    ];
  }

  const probe = await runFfprobe(ffmpegPath, filePath, execFileImpl);
  const { durationSec } = probe;

  const silenceRanges = await detectSilenceRanges(
    ffmpegPath,
    filePath,
    silenceThresholdDb,
    minSilenceSec,
    execFileImpl
  );

  let ranges = buildChunkCandidates(
    durationSec,
    maxBytes,
    fallbackDurationSec,
    silenceRanges
  );

  ranges = refineByByteLimit(ranges, fileSizeBytes, durationSec, maxBytes);

  const outputDir = pickOutputDir(filePath);
  const ext = path.extname(filePath) || ".m4a";
  const base = path.basename(filePath, ext);

  const chunks: AudioChunk[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i];
    const duration = end - start;
    const outputPath = path.join(outputDir, `${base}_chunk_${i}${ext}`);
    await splitChunk(ffmpegPath, filePath, outputPath, start, duration, execFileImpl);
    chunks.push({
      filePath: outputPath,
      startOffsetSec: start,
      durationSec: duration,
    });
  }

  return chunks;
}
