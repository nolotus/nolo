import { describe, it, expect } from "bun:test";
import { splitAudioFile } from "./audioSplit";

function makeFfprobeOutput(durationSec: number, bitRateBps = 128_000) {
  return `duration=${durationSec}\nbit_rate=${bitRateBps}\nformat_name=mov,mp4,m4a,3gp,3g2,mj2\n`;
}

function makeExecMock(
  fileSizeBytes: number,
  durationSec: number,
  bitRateBps = 128_000
) {
  return (
    file: string,
    args: readonly string[],
    _options: { encoding: "buffer" | "utf8"; maxBuffer?: number },
    callback: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void
  ) => {
    if (file.includes("ffprobe")) {
      callback(null, makeFfprobeOutput(durationSec, bitRateBps), "");
      return;
    }

    if (file.includes("ffmpeg")) {
      const argSet = new Set(args);
      // 识别 silencedetect
      if (args.some((a) => a.includes("silencedetect"))) {
        const silenceLog = `silence_start: 3.0\nsilence_end: 3.4\nsilence_start: 7.5\nsilence_end: 7.9\n`;
        callback(null, "", silenceLog);
        return;
      }

      // splitChunk：记录调用参数并返回空
      callback(null, "", "");
      return;
    }

    callback(new Error(`unexpected exec: ${file}`), "", "");
  };
}

describe("splitAudioFile", () => {
  it("空文件报错", async () => {
    // 通过构造不存在的路径触发 statSync 返回空
    await expect(
      splitAudioFile("/nonexistent-empty-file.m4a", { maxBytes: 10 * 1024 * 1024 })
    ).rejects.toThrow("empty or missing");
  });

  it("单段即可容纳时返回原文件", async () => {
    const calls: string[] = [];
    const execMock = (
      file: string,
      args: readonly string[],
      _options: { encoding: "buffer" | "utf8"; maxBuffer?: number },
      callback: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void
    ) => {
      calls.push(file);
      callback(null, makeFfprobeOutput(300), "");
    };

    const result = await splitAudioFile("/fake/audio.m4a", {
      maxBytes: 100 * 1024 * 1024,
      fileSizeBytes: 10 * 1024 * 1024,
      execFileImpl: execMock as any,
    });

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("/fake/audio.m4a");
    expect(result[0].startOffsetSec).toBe(0);
    expect(result[0].durationSec).toBe(300);
    expect(calls.some((c) => c.includes("ffmpeg"))).toBe(false);
  });

  it("超过 25MB 时按静音点切并返回时间偏移", async () => {
    const fileSizeBytes = 26 * 1024 * 1024; // 26MB
    const durationSec = 600; // 10min
    const bitRateBps = Math.floor(fileSizeBytes / durationSec);

    const execCalls: Array<{ file: string; args: readonly string[] }> = [];
    const execMock = (
      file: string,
      args: readonly string[],
      _options: { encoding: "buffer" | "utf8"; maxBuffer?: number },
      callback: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void
    ) => {
      execCalls.push({ file, args });
      if (file.includes("ffprobe")) {
        callback(null, makeFfprobeOutput(durationSec, bitRateBps), "");
        return;
      }

      if (file.includes("ffmpeg")) {
        if (args.some((a) => a.includes("silencedetect"))) {
          const silenceLog = `silence_start: 120.0\nsilence_end: 120.5\nsilence_start: 300.0\nsilence_end: 300.4\nsilence_start: 480.0\nsilence_end: 480.5\n`;
          callback(null, "", silenceLog);
          return;
        }
        callback(null, "", "");
        return;
      }

      callback(new Error("unexpected"), "", "");
    };

    const chunks = await splitAudioFile("/fake/audio.m4a", {
      maxBytes: 24 * 1024 * 1024,
      fallbackDurationSec: 300,
      fileSizeBytes,
      execFileImpl: execMock as any,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(2);

    // 偏移量递增且连续
    let prevEnd = 0;
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].startOffsetSec).toBe(prevEnd);
      prevEnd = chunks[i].startOffsetSec + chunks[i].durationSec;
    }
    expect(prevEnd).toBe(durationSec);

    // 静音点附近切：至少有一个 chunk 结束于静音中点附近
    const endSet = new Set(chunks.map((c) => c.startOffsetSec + c.durationSec));
    const nearSilenceMid = [120.25, 300.2, 480.25].some((target) =>
      [...endSet].some((end) => Math.abs(end - target) < 0.5)
    );
    expect(nearSilenceMid).toBe(true);

    // 每段起始偏移 = 前 k-1 段时长之和
    let acc = 0;
    for (const c of chunks) {
      expect(c.startOffsetSec).toBe(acc);
      acc += c.durationSec;
    }
  });

  it("同一 fallback 段内多个静音点 -> 取最后一个（最大化每段长度）", async () => {
    // reviewer P1：旧实现取第一个静音点导致段数膨胀；必须取段内最后一个。
    const fileSizeBytes = 30 * 1024 * 1024;
    const durationSec = 900; // 15min
    const bitRateBps = Math.floor(fileSizeBytes / durationSec);

    const execMock = (
      file: string,
      args: readonly string[],
      _options: { encoding: "buffer" | "utf8"; maxBuffer?: number },
      callback: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void
    ) => {
      if (file.includes("ffprobe")) {
        callback(null, makeFfprobeOutput(durationSec, bitRateBps), "");
        return;
      }
      if (file.includes("ffmpeg")) {
        if (args.some((a) => a.includes("silencedetect"))) {
          // 三个静音点都在第一段 (fallbackDurationSec=600) 内：100 / 300 / 500
          const silenceLog =
            "silence_start: 100.0\nsilence_end: 100.4\n" +
            "silence_start: 300.0\nsilence_end: 300.5\n" +
            "silence_start: 500.0\nsilence_end: 500.4\n";
          callback(null, "", silenceLog);
          return;
        }
        callback(null, "", "");
        return;
      }
      callback(new Error("unexpected"), "", "");
    };

    const chunks = await splitAudioFile("/fake/audio.m4a", {
      maxBytes: 24 * 1024 * 1024,
      fallbackDurationSec: 600,
      fileSizeBytes,
      execFileImpl: execMock as any,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    // 第一段应结束在最后一个静音点（500.2）而非第一个（100.2）
    expect(chunks[0].startOffsetSec + chunks[0].durationSec).toBeCloseTo(500.2, 1);
  });

  it("静音点不足时 fallback 到固定时长", async () => {
    const fileSizeBytes = 30 * 1024 * 1024;
    const durationSec = 900; // 15min
    const bitRateBps = Math.floor(fileSizeBytes / durationSec);

    const execMock = (
      file: string,
      args: readonly string[],
      _options: { encoding: "buffer" | "utf8"; maxBuffer?: number },
      callback: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void
    ) => {
      if (file.includes("ffprobe")) {
        callback(null, makeFfprobeOutput(durationSec, bitRateBps), "");
        return;
      }

      if (file.includes("ffmpeg")) {
        if (args.some((a) => a.includes("silencedetect"))) {
          callback(null, "", "no silence detected\n");
          return;
        }
        callback(null, "", "");
        return;
      }

      callback(new Error("unexpected"), "", "");
    };

    const chunks = await splitAudioFile("/fake/audio.m4a", {
      maxBytes: 24 * 1024 * 1024,
      fallbackDurationSec: 200,
      fileSizeBytes,
      execFileImpl: execMock as any,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // 无静音点时 fallback 到固定时长
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].durationSec).toBeLessThanOrEqual(201);
    }
  });

  it("每段估算时长受 24MB 安全余量限制", async () => {
    const fileSizeBytes = 50 * 1024 * 1024;
    const durationSec = 600; // 10min
    const bitRateBps = Math.floor(fileSizeBytes / durationSec); // ~87KB/s

    const execMock = (
      file: string,
      args: readonly string[],
      _options: { encoding: "buffer" | "utf8"; maxBuffer?: number },
      callback: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void
    ) => {
      if (file.includes("ffprobe")) {
        callback(null, makeFfprobeOutput(durationSec, bitRateBps), "");
        return;
      }
      if (file.includes("ffmpeg")) {
        if (args.some((a) => a.includes("silencedetect"))) {
          callback(null, "", "no silence\n");
          return;
        }
        callback(null, "", "");
        return;
      }
      callback(new Error("unexpected"), "", "");
    };

    const chunks = await splitAudioFile("/fake/audio.m4a", {
      maxBytes: 24 * 1024 * 1024,
      fallbackDurationSec: 600,
      fileSizeBytes,
      execFileImpl: execMock as any,
    });

    // 50MB / 600s ~ 87KB/s；24MB 对应约 280s；段数应 >= 2
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});
