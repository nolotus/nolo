import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExecFileFn } from "./types";

/**
 * 音视频本地预处理（TUI /transcribe 与拖拽转写共用）。
 *
 * 管线：任意音视频文件 → ffmpeg 抽音轨/转码 → 单声道 Opus (.ogg) →
 * 上传 /api/transcribe-media。统一转 Opus 的原因：服务端 multipart 上传
 * 体积敏感（课堂录音常 60–100MB / 1.5–2h），48kbps Opus 把 2h 压到 ~70MB
 * 以内且对语音保真足够。
 *
 * 采样率纪律（index.ts 顶部有实测教训）：**不低于 16kHz**。默认不重采样
 * （保留源采样率），仅当源低于 16kHz 时升到 16k——继续往下压会把中文
 * 识别准确率打穿。
 */

/** 常见音频容器扩展名（小写、不带点） */
export const MEDIA_AUDIO_EXTENSIONS = [
  "mp3",
  "m4a",
  "wav",
  "aac",
  "flac",
  "ogg",
  "opus",
  "wma",
  "amr",
  "aiff",
] as const;

/** 常见视频容器扩展名（小写、不带点） */
export const MEDIA_VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "mkv",
  "avi",
  "webm",
  "m4v",
  "flv",
  "3gp",
  "ts",
] as const;

const AUDIO_EXTENSION_SET = new Set<string>(MEDIA_AUDIO_EXTENSIONS);
const VIDEO_EXTENSION_SET = new Set<string>(MEDIA_VIDEO_EXTENSIONS);

export type MediaKind = "audio" | "video";

function extnameOf(filePath: string): string {
  const slash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  const base = slash >= 0 ? filePath.slice(slash + 1) : filePath;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

/**
 * 按扩展名把路径分类为 audio / video / null（不认识的扩展名）。
 * 只分类、不探测存在性——存在性由调用方决定如何处理。
 */
export function classifyMediaPath(filePath: string): MediaKind | null {
  const ext = extnameOf(filePath);
  if (AUDIO_EXTENSION_SET.has(ext)) return "audio";
  if (VIDEO_EXTENSION_SET.has(ext)) return "video";
  return null;
}

/** ffmpeg 可执行文件解析：env 显式指定 > PATH > darwin Homebrew 兜底（照 audioSplit 惯例） */
export function resolveFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (process.platform === "darwin" && existsSync("/opt/homebrew/bin/ffmpeg")) {
    return "/opt/homebrew/bin/ffmpeg";
  }
  return "ffmpeg";
}
const DEFAULT_FFMPEG_PATH = resolveFfmpegPath();

export type MediaProbeResult = {
  /** 容器时长（秒，浮点）。探测不到时为 0。 */
  durationSec: number;
  /** 是否含至少一条音轨。 */
  hasAudio: boolean;
  /** 首条音轨采样率（Hz）；探测不到为 null。 */
  sampleRate: number | null;
};

/**
 * ffprobe 探测：时长 + 是否有音轨 + 首条音轨采样率（一次调用）。
 * 无音轨不在这里报错（调用方可能只想要 duration 做展示），由
 * preprocessMedia 抛清晰错误。
 */
export async function probeMedia(
  filePath: string,
  opts: { ffmpegPath?: string; execFileImpl?: ExecFileFn } = {},
): Promise<MediaProbeResult> {
  const runner = opts.execFileImpl ?? (execFile as ExecFileFn);
  const ffmpegPath = opts.ffmpegPath ?? DEFAULT_FFMPEG_PATH;
  const ffprobePath = ffmpegPath.replace(/ffmpeg$/, "ffprobe");

  return new Promise((resolve, reject) => {
    runner(
      ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-show_streams",
        "-select_streams",
        "a",
        "-of",
        "default=noprint_wrappers=1",
        filePath,
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `ffprobe failed for ${filePath}: ${error.message}${
                stderr ? `; ${String(stderr).trim()}` : ""
              }`,
            ),
          );
          return;
        }
        const text = typeof stdout === "string" ? stdout : stdout.toString("utf8");
        const durationMatch = text.match(/duration=([\d.]+)/);
        const durationSec = durationMatch ? parseFloat(durationMatch[1]) : 0;
        // `-select_streams a` 过滤后仍有 codec_type=audio 行即存在音轨。
        const hasAudio = /^codec_type=audio$/m.test(text);
        const rateMatch = text.match(/sample_rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : null;
        resolve({ durationSec, hasAudio, sampleRate });
      },
    );
  });
}

export type DenoiseLevel = "off" | "light" | "strong";

/**
 * 裁剪参数**预处理层校验**（解析层见 cli/tui/mediaAttachment.parseTimestampArg，
 * 两处都查是刻意的：parse 层不知道媒体时长，预处理层才知道上限）。
 *
 * 规则（任一不满足即抛中文错误、拒绝执行，**不静默降级成全片**）：
 * - fromSec / toSec 必须是有限数（`--to 1e999` 这类会解析成 Infinity）；
 * - 0 ≤ fromSec < toSec；toSec 必须 > 0（`--to 0` 旧行为是丢掉 -to → 跑全片，
 *   用户以为裁了却付了全片的钱）；
 * - toSec 不超过媒体时长（+1s 容差，吸收浮点/进位误差）；fromSec 不落在时长之后。
 * durationSec ≤ 0（ffprobe 探不到时长）时跳过依赖时长的两条，只查前两类。
 */
export function validateTrimRange(args: {
  fromSec?: number;
  toSec?: number;
  durationSec: number;
}): void {
  const { fromSec, toSec, durationSec } = args;
  const finiteOrThrow = (value: number, flag: string) => {
    if (!Number.isFinite(value)) {
      throw new Error(`裁剪参数不合法：${flag} 必须是有限秒数（收到 ${value}）`);
    }
  };
  if (fromSec !== undefined) {
    finiteOrThrow(fromSec, "--from");
    if (fromSec < 0) {
      throw new Error(`裁剪参数不合法：--from 不能为负（收到 ${fromSec}）`);
    }
  }
  if (toSec !== undefined) {
    finiteOrThrow(toSec, "--to");
    if (toSec <= 0) {
      throw new Error(`裁剪参数不合法：--to 必须大于 0（收到 ${toSec}，0 等于不裁剪）`);
    }
  }
  if (fromSec !== undefined && toSec !== undefined && !(fromSec < toSec)) {
    throw new Error(`裁剪范围不合法：起点 ${fromSec}s 必须小于终点 ${toSec}s`);
  }
  if (Number.isFinite(durationSec) && durationSec > 0) {
    if (toSec !== undefined && toSec > durationSec + 1) {
      throw new Error(
        `裁剪终点超出媒体时长：--to ${toSec}s 大于媒体时长 ${Math.round(durationSec)}s`,
      );
    }
    if (fromSec !== undefined && fromSec > durationSec + 1) {
      throw new Error(
        `裁剪起点超出媒体时长：--from ${fromSec}s 大于媒体时长 ${Math.round(durationSec)}s`,
      );
    }
  }
}

export type PreprocessMediaOptions = {
  /** 裁剪起点（秒）。 */
  fromSec?: number;
  /** 裁剪终点（秒，相对源文件时间轴）。 */
  toSec?: number;
  /**
   * 降噪档位：
   * - off：不加滤镜；
   * - light（默认）：highpass=f=80,dynaudnorm——切低频轰隆并把大讲堂远场
   *   人声音量拉平，对课堂录音实测最稳；
   * - strong：在 light 基础上再叠加 afftdn=nf=-25（FFT 降噪），适合风扇/
   *   空调底噪明显的录音，但对极轻人声略伤。
   */
  denoise?: DenoiseLevel;
  /** 输出目录（默认 mkdtemp 于 os.tmpdir()，cleanup() 会整体删除）。 */
  outDir?: string;
  ffmpegPath?: string;
  /** 测试注入 execFile（mock ffmpeg/ffprobe）。 */
  execFileImpl?: ExecFileFn;
};

export type PreprocessMediaResult = {
  /** 转码产物路径（.ogg，Opus）。 */
  filePath: string;
  mimeType: "audio/ogg";
  /** 源文件时长（秒，ffprobe 探测）。 */
  durationSec: number;
  /** 产物字节数。 */
  bytes: number;
  /** 删除产物文件（幂等）。自带 outDir 时只删文件不删目录。 */
  cleanup(): void;
};

/** ASR 采样率下限（见文件顶部注释）：低于此值的源被升到 16k，其余保持原采样率。 */
const MIN_SAMPLE_RATE = 16000;
/** Opus 目标码率：语音转写够用且 2h 录音产物 < ~70MB。 */
const OPUS_BITRATE = "48k";

export function buildDenoiseFilter(denoise: DenoiseLevel): string | null {
  switch (denoise) {
    case "off":
      return null;
    case "strong":
      return "highpass=f=80,dynaudnorm,afftdn=nf=-25";
    case "light":
    default:
      return "highpass=f=80,dynaudnorm";
  }
}

/**
 * 预处理：ffprobe 探测（无音轨即抛错）→ ffmpeg 输出单声道 Opus .ogg。
 * `-ss/-to` 放在 -i 之前做输入级 seek（快且对容器时间戳安全，裁剪边界
 * 由 ffmpeg 解码侧精确对齐到帧）。
 */
export async function preprocessMedia(
  inputPath: string,
  opts: PreprocessMediaOptions = {},
): Promise<PreprocessMediaResult> {
  const runner = opts.execFileImpl ?? (execFile as ExecFileFn);
  const ffmpegPath = opts.ffmpegPath ?? DEFAULT_FFMPEG_PATH;
  const probe = await probeMedia(inputPath, {
    ffmpegPath,
    execFileImpl: opts.execFileImpl,
  });
  if (!probe.hasAudio) {
    throw new Error(`Media file has no audio track: ${inputPath}`);
  }
  // 裁剪参数第二道闸（第一道在 CLI 解析层）：越界/逆序/非有限数在这里
  // 直接抛中文错误，绝不静默降级成全片。
  validateTrimRange({
    fromSec: opts.fromSec,
    toSec: opts.toSec,
    durationSec: probe.durationSec,
  });

  const ownOutDir = !opts.outDir;
  const outDir = opts.outDir ?? mkdtempSync(path.join(tmpdir(), "nolo-media-"));
  const outPath = path.join(outDir, "audio.ogg");

  const args: string[] = ["-hide_banner", "-loglevel", "error", "-y"];
  // 到这里的 fromSec/toSec 已经过 validateTrimRange：`> 0` 守卫只是防空值。
  if (opts.fromSec !== undefined && opts.fromSec > 0) {
    args.push("-ss", String(opts.fromSec));
  }
  if (opts.toSec !== undefined && opts.toSec > 0) {
    args.push("-to", String(opts.toSec));
  }
  args.push("-i", inputPath, "-vn", "-ac", "1");
  // 采样率：不主动降采样（ASR 准确率敏感，见 index.ts 教训）。仅当探测到
  // 源采样率低于 16k 下限才显式 -ar 16000；探测不到或源 ≥16k 都保持源
  // 采样率（unconditional -ar 会把 44.1k/48k 源压到 16k 损高频）。
  if (probe.sampleRate !== null && probe.sampleRate < MIN_SAMPLE_RATE) {
    args.push("-ar", String(MIN_SAMPLE_RATE));
  }
  const filter = buildDenoiseFilter(opts.denoise ?? "light");
  if (filter) {
    args.push("-af", filter);
  }
  args.push("-c:a", "libopus", "-b:a", OPUS_BITRATE, outPath);

  await new Promise<void>((resolve, reject) => {
    runner(ffmpegPath, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }, (error, _stdout, stderr) => {
      if (error) {
        reject(
          new Error(
            `ffmpeg failed for ${inputPath}: ${error.message}${
              stderr ? `; ${String(stderr).trim()}` : ""
            }`,
          ),
        );
        return;
      }
      resolve();
    });
  }).catch((err) => {
    if (ownOutDir) {
      try {
        rmSync(outDir, { recursive: true, force: true });
      } catch {
        // 清理失败不掩盖原始错误
      }
    }
    throw err;
  });

  const bytes = statSync(outPath).size;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      if (ownOutDir) {
        rmSync(outDir, { recursive: true, force: true });
      } else {
        rmSync(outPath, { force: true });
      }
    } catch {
      // 临时文件清理失败不值得抛
    }
  };

  return {
    filePath: outPath,
    mimeType: "audio/ogg",
    durationSec: probe.durationSec,
    bytes,
    cleanup,
  };
}
