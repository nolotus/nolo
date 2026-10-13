// packages/cli/tui/mediaAttachment.ts
//
// 音视频附件转写：本地 ffmpeg 预处理 → POST /api/transcribe-media (NDJSON 流)
// → 带时间戳文本随消息发给模型，txt/srt 落 ~/.nolo/transcripts/。
//
// 与 pasteImage.ts 的分工：图片读成 dataUrl 直接进消息体；音视频文件太大，
// 走服务端转写、模型拿的是 <transcript> 文本块。路径检测复用 pasteImage 的
// tokenize / file:// / WSL / `\ ` 转义逻辑（detectMediaPaths 内部仍走同一
// tokenizePasteLine，不重复实现）。

import { accessSync, constants, mkdirSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  classifyMediaPath,
  preprocessMedia,
  type DenoiseLevel,
} from "../../ai/transcription/mediaPreprocess";
import type { ExecFileFn } from "../../ai/transcription/types";
import type { CliFetchImpl } from "../cliFetch";
import {
  fileUriToPath,
  isWslEnvironment,
  mapWindowsPathToWsl,
  resolveImageSource,
} from "./pasteImage";
import { stripImageTokens } from "./sessionInput";

export type DetectedMediaToken = {
  /** 原始 paste token（保留 `\ ` 转义），用于 stripImageTokens。 */
  raw: string;
  /** 转义解析 + cwd/WSL/file:// 归一后的路径。 */
  resolvedPath: string;
  kind: "audio" | "video";
  /** 扩展名命中但探测不可读：保留在原文，不剥（同图片 unreadable 语义）。 */
  unreadable?: boolean;
};

// tokenizePasteLine 从 pasteImage 导出：paste 行的分词（`\ ` 转义、引号、
// file:// 由 fileUriToPath 后处理）必须只有一份实现，media 检测复用同一函数。
import { tokenizePasteLine } from "./pasteImage";

function isReadableMediaPath(p: string): boolean {
  try {
    accessSync(p, constants.R_OK);
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * 从一行输入里检测音视频文件路径（存在且可读）。
 * 返回 token 供调用方剥离/转写；unreadable 的也返回（保留在原文）。
 * 不认识的扩展名（非 audio/video）不命中。
 */
export function detectMediaPaths(
  line: string,
  cwd: string,
  opts: { wsl?: boolean } = {},
): DetectedMediaToken[] {
  const wsl = opts.wsl ?? isWslEnvironment();
  const out: DetectedMediaToken[] = [];
  for (const token of tokenizePasteLine(line)) {
    if (!token.raw) continue;
    let candidate = token.decoded;
    const uriPath = fileUriToPath(candidate);
    if (uriPath !== null) candidate = uriPath;
    if (wsl) candidate = mapWindowsPathToWsl(candidate);
    const kind = classifyMediaPath(candidate);
    if (!kind) continue;
    const resolved = resolveImageSource(candidate, cwd);
    if (!isReadableMediaPath(resolved)) {
      out.push({ raw: token.raw, resolvedPath: resolved, kind, unreadable: true });
      continue;
    }
    out.push({ raw: token.raw, resolvedPath: resolved, kind });
  }
  return out;
}

/** 从提交文本检测可读媒体路径并剥离 token（与 detectSubmittedImagePaths 同构）。 */
export function detectSubmittedMediaPaths(
  text: string,
  cwd: string,
  opts: { wsl?: boolean } = {},
): { mediaPaths: string[]; hints: DetectedMediaToken[]; message: string } {
  const trimmed = text.trim();
  const hints = detectMediaPaths(trimmed, cwd, opts);
  const readable = hints.filter((h) => !h.unreadable);
  const stripped = stripImageTokens(trimmed, readable);
  return {
    mediaPaths: readable.map((h) => h.resolvedPath),
    hints,
    message: stripped.length > 0 ? stripped : trimmed,
  };
}

// ── /transcribe 参数解析 ─────────────────────────────────────────────

/**
 * "ss" | "mm:ss" | "hh:mm:ss" | 小数秒 → 秒数；非法返回 null。
 *
 * 这是裁剪参数的**解析层校验**（预处理层 preprocessMedia 还会再校验一次，
 * 见 validateTrimRange）：只放行有限数，并按「时钟分段」语义——第一个分段
 * 之外的分/秒必须 <60（`1:99` 不是时刻而是笔误，拒绝，不换算成 159 秒）。
 */
export function parseTimestampArg(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const parts = t.split(":");
  if (parts.length > 3) return null;
  let sec = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!/^\d+(\.\d+)?$/.test(p)) return null;
    const n = Number(p);
    // 超长数字串（"1"×400）会被 Number() 解析成 Infinity：不是合法时刻。
    if (!Number.isFinite(n)) return null;
    // 分/秒段必须 <60（首段是小时或裸秒数，不受此限）。
    if (i > 0 && n >= 60) return null;
    sec = sec * 60 + n;
  }
  return Number.isFinite(sec) ? sec : null;
}

export type TranscribeCommandArgs = {
  path: string;
  fromSec?: number;
  toSec?: number;
  lang?: string;
  denoise?: DenoiseLevel;
};

/**
 * 解析 `/transcribe <path> [--from T] [--to T] [--lang L] [--denoise off|light|strong]`。
 * path 可以是含 `\ ` 转义或引号的原始 token（取第一个 token）。
 * 解析失败返回 { error }。
 */
export function parseTranscribeArgs(
  argText: string,
): { ok: true; args: TranscribeCommandArgs } | { ok: false; error: string } {
  const tokens = tokenizePasteLine(argText.trim());
  if (tokens.length === 0 || !tokens[0].decoded.trim()) {
    return { ok: false, error: "usage" };
  }
  const args: TranscribeCommandArgs = { path: tokens[0].decoded };
  const rest = argText.trim().slice(tokens[0].raw.length).trim();
  // rest 里的 flag 按空白切（flag 值本身不含空格）
  const flagRe = /--([a-zA-Z-]+)(?:\s+("[^"]*"|'[^']*'|\S+))?/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = flagRe.exec(rest)) !== null) {
    const flag = m[1].toLowerCase();
    const rawVal = m[2];
    const val = rawVal?.replace(/^["']|["']$/g, "");
    switch (flag) {
      case "from": {
        if (val === undefined) {
          return { ok: false, error: "裁剪起点缺少取值：--from 后面要跟 ss / mm:ss / hh:mm:ss" };
        }
        const sec = parseTimestampArg(val);
        if (sec === null) {
          return {
            ok: false,
            error: `裁剪起点不合法：--from ${val}（支持 ss / mm:ss / hh:mm:ss，分与秒须 <60）`,
          };
        }
        args.fromSec = sec;
        break;
      }
      case "to": {
        if (val === undefined) {
          return { ok: false, error: "裁剪终点缺少取值：--to 后面要跟 ss / mm:ss / hh:mm:ss" };
        }
        const sec = parseTimestampArg(val);
        if (sec === null) {
          return {
            ok: false,
            error: `裁剪终点不合法：--to ${val}（支持 ss / mm:ss / hh:mm:ss，分与秒须 <60）`,
          };
        }
        // --to 0 曾被静默吞掉（不生成 -to）→ 退化成整片转写、白花钱，直接拒绝。
        if (sec <= 0) {
          return { ok: false, error: `裁剪终点不合法：--to ${val} 必须大于 0（0 等于不裁剪）` };
        }
        args.toSec = sec;
        break;
      }
      case "lang":
      case "language": {
        if (val === undefined) return { ok: false, error: "--lang needs a value" };
        args.lang = val;
        break;
      }
      case "denoise": {
        if (val === undefined) return { ok: false, error: "--denoise needs a value" };
        if (val !== "off" && val !== "light" && val !== "strong") {
          return { ok: false, error: `bad --denoise: ${val}` };
        }
        args.denoise = val;
        break;
      }
      default:
        return { ok: false, error: `unknown flag: --${flag}` };
    }
    seen.add(flag);
  }
  // 跨字段校验：必须 from < to。逆序（`--from 10 --to 5`）以前被放行，
  // 交给 ffmpeg 得到一个几乎空的产物，用户只看到「转写完成但没内容」。
  if (
    args.fromSec !== undefined &&
    args.toSec !== undefined &&
    !(args.fromSec < args.toSec)
  ) {
    return {
      ok: false,
      error: `裁剪范围不合法：--from ${args.fromSec} 必须小于 --to ${args.toSec}`,
    };
  }
  // rest 中若残留非 flag 文本（未消费的裸 token）→ 报错而非静默忽略
  const leftover = rest.replace(flagRe, "").trim();
  if (leftover) {
    return { ok: false, error: `unexpected: ${leftover}` };
  }
  return { ok: true, args };
}

// ── 服务端接口契约（NDJSON 行） ─────────────────────────────────────

type TranscribeStreamEvent =
  | { type: "progress"; stage?: string; message?: string }
  | { type: "heartbeat" }
  | {
      type: "result";
      text: string;
      srt: string;
      durationSec?: number;
      language?: string;
      provider?: string;
      model?: string;
      chargedMinutes?: number;
    }
  | { type: "error"; message?: string };

export type TranscribeResult = {
  text: string;
  srt: string;
  durationSec: number;
  language?: string;
  provider?: string;
  model?: string;
  chargedMinutes?: number;
  /** 保存到 ~/.nolo/transcripts/ 的 txt / srt 绝对路径。 */
  txtPath: string;
  srtPath: string;
};

export type TranscribeProgressInfo = {
  stage?: string;
  message?: string;
};

export type TranscribeMediaFileOptions = {
  path: string;
  serverUrl: string;
  authToken: string;
  language?: string;
  fromSec?: number;
  toSec?: number;
  denoise?: DenoiseLevel;
  dialogId?: string;
  /** 逐行进度回调（stage/message）。 */
  onProgress?: (info: TranscribeProgressInfo) => void;
  fetchImpl?: CliFetchImpl;
  execFileImpl?: ExecFileFn;
  /** 测试覆盖保存目录；默认 ~/.nolo/transcripts。 */
  transcriptsDir?: string;
};

function transcriptsDir(override?: string): string {
  return override ?? path.join(homedir(), ".nolo", "transcripts");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function transcriptStamp(d = new Date()): string {
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  );
}

function sanitizeBasename(p: string): string {
  const base = path.basename(p).replace(/\.[^.]+$/, "");
  const safe = base.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 80);
  return safe || "media";
}

async function saveTranscripts(
  sourcePath: string,
  text: string,
  srt: string,
  dirOverride?: string,
): Promise<{ txtPath: string; srtPath: string }> {
  const dir = transcriptsDir(dirOverride);
  mkdirSync(dir, { recursive: true });
  const stamp = transcriptStamp();
  const base = sanitizeBasename(sourcePath);
  const txtPath = path.join(dir, `${base}-${stamp}.txt`);
  const srtPath = path.join(dir, `${base}-${stamp}.srt`);
  await Promise.all([
    writeFile(txtPath, text, "utf8"),
    writeFile(srtPath, srt, "utf8"),
  ]);
  return { txtPath, srtPath };
}

/**
 * ffmpeg/ffprobe 缺失检测：ENOENT → 返回带安装提示的错误消息。
 * 只在 preprocessMedia 抛错后调用（不让它进 happy path 的 spawn 开销）。
 */
export function describeMediaError(err: unknown): { message: string; ffmpegMissing: boolean } {
  const msg = err instanceof Error ? err.message : String(err);
  const ffmpegMissing = /ENOENT|not found|spawn.*(ffmpeg|ffprobe)/i.test(msg);
  return {
    message: ffmpegMissing
      ? `${msg}\nInstall ffmpeg first: macOS "brew install ffmpeg", Debian/Ubuntu "sudo apt install ffmpeg", or set FFMPEG_PATH.`
      : msg,
    ffmpegMissing,
  };
}

/**
 * 上传体构造：优先「文件支撑的 Blob」（流式读盘），避免把整份压缩音频读进 JS 堆。
 *
 * - Bun：`Bun.file()` 是 Blob 语义的文件句柄，multipart 上传时运行时按块读盘 ——
 *   2h Opus ≈70MB，旧路径 `readFile` 先来一份 Buffer、`new Blob([bytes])` 再复制
 *   一份，瞬时堆 ≈140MB。
 * - Node ≥20.11：`fs.openAsBlob()` 同样给文件支撑的 Blob（动态 import + 特性检测，
 *   避免在 Bun 下对不存在的具名导出做静态 import）。
 * - 两者都没有：退回 readFile + Blob（与旧行为一致，整份占内存）。
 *
 * 接口侧无需改造：`/api/transcribe-media` 收的就是标准 multipart/form-data，
 * Content-Length 由文件大小给出，服务端按流读，不要求分块传输编码。
 */
export async function openUploadBlob(filePath: string, mimeType: string): Promise<Blob> {
  const bun = (globalThis as {
    Bun?: { file?: (p: string, o?: { type?: string }) => Blob };
  }).Bun;
  // 保留 this（Bun.file 是 Bun 对象上的方法）：不经中间变量抽函数。
  if (bun && typeof bun.file === "function") {
    return bun.file(filePath, { type: mimeType });
  }
  try {
    const fsMod = (await import("node:fs")) as {
      openAsBlob?: (p: string, o?: { type?: string }) => Promise<Blob>;
    };
    if (typeof fsMod.openAsBlob === "function") {
      return await fsMod.openAsBlob(filePath, { type: mimeType });
    }
  } catch {
    // 运行时没有该导出 → 走下面的整份读入
  }
  const bytes = await readFile(filePath);
  return new Blob([bytes], { type: mimeType });
}

/**
 * 预处理（ffmpeg）→ multipart 上传 → NDJSON 流式解析 → 保存 txt/srt →
 * 返回结构化结果。临时转码产物在 finally 中清理。
 *
 * 不在这里做 ffmpeg 存在性预检：ffmpeg 缺失时 preprocessMedia 的 execFile
 * 直接抛 ENOENT，调用方经 describeMediaError 得到带安装提示的文案。
 */
export async function transcribeMediaFile(
  opts: TranscribeMediaFileOptions,
): Promise<TranscribeResult> {
  const fetcher = opts.fetchImpl ?? fetch;
  const prepared = await preprocessMedia(opts.path, {
    fromSec: opts.fromSec,
    toSec: opts.toSec,
    denoise: opts.denoise ?? "light",
    execFileImpl: opts.execFileImpl,
  });
  try {
    opts.onProgress?.({ stage: "upload", message: "uploading" });
    const form = new FormData();
    if (opts.language) form.append("language", opts.language);
    if (opts.dialogId) form.append("dialogId", opts.dialogId);
    const uploadBlob = await openUploadBlob(prepared.filePath, prepared.mimeType);
    // file 放最后（契约）：服务端可在文件体未收全时先读前面的字段。
    form.append(
      "file",
      uploadBlob,
      path.basename(opts.path).replace(/\.[^.]+$/, "") + ".ogg",
    );
    const res = await fetcher(`${opts.serverUrl}/api/transcribe-media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.authToken}` },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `transcribe-media HTTP ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
      );
    }
    if (!res.body) {
      throw new Error("transcribe-media: empty response body");
    }

    // NDJSON 逐行解析：按行缓冲，容忍分块把一行切成多段或一段含多行。
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let resultEvent: Extract<TranscribeStreamEvent, { type: "result" }> | null =
      null;
    let errorMessage: string | null = null;

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let ev: TranscribeStreamEvent;
      try {
        ev = JSON.parse(trimmed) as TranscribeStreamEvent;
      } catch {
        return; // 容忍非 JSON 行（网关 padding 等）
      }
      if (ev.type === "progress") {
        opts.onProgress?.({ stage: ev.stage, message: ev.message });
      } else if (ev.type === "result") {
        resultEvent = ev;
      } else if (ev.type === "error") {
        errorMessage = ev.message ?? "transcription failed";
      }
      // heartbeat: 只刷新连接活性，无需回调
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        handleLine(line);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) handleLine(buffer);

    if (errorMessage) throw new Error(errorMessage);
    if (!resultEvent) {
      throw new Error("transcribe-media: stream ended without result");
    }
    const rv = resultEvent as Extract<TranscribeStreamEvent, { type: "result" }>;
    const { txtPath, srtPath } = await saveTranscripts(
      opts.path,
      rv.text ?? "",
      rv.srt ?? "",
      opts.transcriptsDir,
    );
    return {
      text: rv.text ?? "",
      srt: rv.srt ?? "",
      durationSec: rv.durationSec ?? prepared.durationSec,
      language: rv.language,
      provider: rv.provider,
      model: rv.model,
      chargedMinutes: rv.chargedMinutes,
      txtPath,
      srtPath,
    };
  } finally {
    prepared.cleanup();
  }
}

// ── transcript → 模型可读文本块 ─────────────────────────────────────

/** 模型上下文里 transcript 块的字符上限；超出截断并在尾注指向完整 txt。 */
export const TRANSCRIPT_MODEL_CHAR_LIMIT = 120_000;

const SRT_TIME_RE = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->/;

/**
 * 把 SRT 解析为 `[hh:mm:ss] 文本` 行序列；解析失败回退到按段切 text。
 * 时间戳行是刚需：用户要能指着「1:32 之后」让模型忽略或用 --to 重切。
 */
export function srtToTimestampedLines(srt: string): string[] {
  const blocks = srt.split(/\r?\n\r?\n/).map((b) => b.trim()).filter(Boolean);
  const lines: string[] = [];
  for (const block of blocks) {
    const rows = block.split(/\r?\n/);
    // 格式：seq \n start --> end \n text(可多行)
    const timeRowIdx = rows.findIndex((r) => SRT_TIME_RE.test(r));
    if (timeRowIdx < 0) continue;
    const m = rows[timeRowIdx].match(/(\d{2}):(\d{2}):(\d{2})/);
    if (!m) continue;
    const text = rows.slice(timeRowIdx + 1).join(" ").trim();
    if (!text) continue;
    lines.push(`[${m[1]}:${m[2]}:${m[3]}] ${text}`);
  }
  return lines;
}

/**
 * 组装发给模型的 transcript 块：
 * <transcript source="..." duration="..." language="..."> [hh:mm:ss] 行… </transcript>
 * 超 120k 字符截断，尾注完整 txt 路径。
 */
export function formatTranscriptForModel(
  result: Pick<TranscribeResult, "srt" | "text" | "durationSec" | "language" | "txtPath">,
  sourcePath: string,
): string {
  const stamped = srtToTimestampedLines(result.srt ?? "");
  const body =
    stamped.length > 0
      ? stamped.join("\n")
      : (result.text ?? "");
  const attrs =
    `source="${sourcePath}"` +
    (result.durationSec ? ` duration="${Math.round(result.durationSec)}s"` : "") +
    (result.language ? ` language="${result.language}"` : "");
  let inner = body;
  let truncatedNote = "";
  if (inner.length > TRANSCRIPT_MODEL_CHAR_LIMIT) {
    inner = inner.slice(0, TRANSCRIPT_MODEL_CHAR_LIMIT);
    truncatedNote = `\n[transcript truncated at ${TRANSCRIPT_MODEL_CHAR_LIMIT} chars — full text saved at ${result.txtPath}]`;
  }
  return `<transcript ${attrs}>\n${inner}${truncatedNote}\n</transcript>`;
}
