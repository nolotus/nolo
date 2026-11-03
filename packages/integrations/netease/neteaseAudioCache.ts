import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

export type AudioCacheOptions = {
  cacheDir: string;
  maxSizeBytes?: number; // 默认 500MB
  maxAgeMs?: number; // 默认 7 天
};

export type AudioCacheEntry = {
  key: string;
  filePath: string;
  sizeBytes: number;
  cachedAt: number;
};

export type AudioCacheManager = {
  get(key: string | number): Promise<string | null>; // 返回本地文件绝对路径，不存在或过期返回 null
  put(key: string | number, stream: ReadableStream | Buffer | Uint8Array): Promise<string>; // 写入缓存并执行 LRU 裁剪
  prune(): Promise<void>; // 清理超额或过期文件
  clear(): Promise<void>; // 清空全部缓存
  getStats(): Promise<{ count: number; totalSizeBytes: number }>;
};

const DEFAULT_MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createAudioCacheManager(options: AudioCacheOptions): AudioCacheManager {
  const resolvedCacheDir = path.resolve(options.cacheDir);
  const maxSizeBytes =
    typeof options.maxSizeBytes === "number" && options.maxSizeBytes > 0
      ? options.maxSizeBytes
      : DEFAULT_MAX_SIZE_BYTES;
  const maxAgeMs =
    typeof options.maxAgeMs === "number" && options.maxAgeMs > 0
      ? options.maxAgeMs
      : DEFAULT_MAX_AGE_MS;

  async function ensureCacheDir(): Promise<void> {
    await fs.promises.mkdir(resolvedCacheDir, { recursive: true });
  }

  function getSongFilePath(key: string | number): string {
    const sanitized = String(key).replace(/[^a-zA-Z0-9._-]/g, "_");
    return path.join(resolvedCacheDir, `song-${sanitized}.audio`);
  }

  async function get(key: string | number): Promise<string | null> {
    const filePath = getSongFilePath(key);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      return null;
    }

    if (!stat.isFile()) {
      return null;
    }

    const now = Date.now();
    const lastAccessTime = Math.max(stat.atimeMs, stat.mtimeMs);
    if (now - lastAccessTime > maxAgeMs) {
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // Ignore unlink error
      }
      return null;
    }

    // 更新访问时间以维护 LRU
    try {
      await fs.promises.utimes(filePath, new Date(), stat.mtime);
    } catch {
      // Ignore utimes update error
    }

    return filePath;
  }

  async function put(
    key: string | number,
    stream: ReadableStream | Buffer | Uint8Array,
  ): Promise<string> {
    await ensureCacheDir();

    const finalPath = getSongFilePath(key);
    const safeKey = String(key).replace(/[^a-zA-Z0-9._-]/g, "_");
    const tempFileName = `.tmp-${safeKey}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
    const tempPath = path.join(resolvedCacheDir, tempFileName);

    let activeWriteStream: fs.WriteStream | null = null;
    try {
      if (Buffer.isBuffer(stream) || stream instanceof Uint8Array) {
        await fs.promises.writeFile(tempPath, stream);
      } else if (typeof (stream as any)?.getReader === "function") {
        // Web ReadableStream
        const reader = (stream as ReadableStream<Uint8Array>).getReader();
        const writeStream = fs.createWriteStream(tempPath);
        activeWriteStream = writeStream;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              const bufferChunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
              if (!writeStream.write(bufferChunk)) {
                await new Promise<void>((resolve) => writeStream.once("drain", () => resolve()));
              }
            }
          }
          await new Promise<void>((resolve, reject) => {
            writeStream.once("error", reject);
            writeStream.end(() => resolve());
          });
        } finally {
          try {
            reader.releaseLock();
          } catch {
            // Ignore lock release error
          }
        }
      } else if (typeof (stream as any)?.pipe === "function") {
        // Node stream
        const writeStream = fs.createWriteStream(tempPath);
        activeWriteStream = writeStream;
        await pipeline(stream as any, writeStream);
      } else {
        await fs.promises.writeFile(tempPath, Buffer.from(stream as any));
      }

      // 原子重命名替换
      await fs.promises.rename(tempPath, finalPath);
    } catch (err) {
      if (activeWriteStream && !activeWriteStream.destroyed) {
        await new Promise<void>((resolve) => {
          activeWriteStream!.destroy();
          activeWriteStream!.once("close", () => resolve());
        });
      }
      try {
        await fs.promises.unlink(tempPath);
      } catch {
        // Ignore cleanup error
      }
      throw err;
    }

    // 写入后触发 LRU 裁剪与过期清理
    await prune();

    return finalPath;
  }

  async function prune(): Promise<void> {
    try {
      await ensureCacheDir();
      const dirEntries = await fs.promises.readdir(resolvedCacheDir, { withFileTypes: true });
      const now = Date.now();

      type CachedItem = {
        filePath: string;
        sizeBytes: number;
        accessTime: number;
      };

      const cachedFiles: CachedItem[] = [];

      for (const entry of dirEntries) {
        if (!entry.isFile()) continue;

        const filePath = path.join(resolvedCacheDir, entry.name);

        // 清理超时的 .tmp 临时文件（超过 1 小时未完成残留）
        if (entry.name.startsWith(".tmp-")) {
          try {
            const st = await fs.promises.stat(filePath);
            if (now - st.mtimeMs > 3600_000) {
              await fs.promises.unlink(filePath);
            }
          } catch {
            // Ignore
          }
          continue;
        }

        const match = entry.name.match(/^song-([a-zA-Z0-9._-]+)\.audio$/);
        if (!match) continue;

        try {
          const stat = await fs.promises.stat(filePath);
          const accessTime = Math.max(stat.atimeMs, stat.mtimeMs);

          // 过期删除
          if (now - accessTime > maxAgeMs) {
            await fs.promises.unlink(filePath);
            continue;
          }

          cachedFiles.push({
            filePath,
            sizeBytes: stat.size,
            accessTime,
          });
        } catch {
          // Ignore transient stat errors
        }
      }

      // 计算当前总字节数
      let totalSizeBytes = cachedFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

      // LRU 裁剪：按 accessTime 升序排序，优先淘汰最旧文件
      if (totalSizeBytes > maxSizeBytes) {
        cachedFiles.sort((a, b) => a.accessTime - b.accessTime);

        for (const item of cachedFiles) {
          if (totalSizeBytes <= maxSizeBytes) {
            break;
          }
          try {
            await fs.promises.unlink(item.filePath);
            totalSizeBytes -= item.sizeBytes;
          } catch {
            // Ignore unlink error
          }
        }
      }
    } catch {
      // Ignore prune errors if directory is not accessible
    }
  }

  async function clear(): Promise<void> {
    try {
      const dirEntries = await fs.promises.readdir(resolvedCacheDir, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (!entry.isFile()) continue;
        if (entry.name.match(/^song-([a-zA-Z0-9._-]+)\.audio$/) || entry.name.startsWith(".tmp-")) {
          try {
            await fs.promises.unlink(path.join(resolvedCacheDir, entry.name));
          } catch {
            // Ignore unlink error
          }
        }
      }
    } catch (err: any) {
      if (err?.code !== "ENOENT") {
        throw err;
      }
    }
  }

  async function getStats(): Promise<{ count: number; totalSizeBytes: number }> {
    try {
      const dirEntries = await fs.promises.readdir(resolvedCacheDir, { withFileTypes: true });
      let count = 0;
      let totalSizeBytes = 0;
      const now = Date.now();

      for (const entry of dirEntries) {
        if (!entry.isFile()) continue;
        const match = entry.name.match(/^song-([a-zA-Z0-9._-]+)\.audio$/);
        if (!match) continue;

        try {
          const filePath = path.join(resolvedCacheDir, entry.name);
          const stat = await fs.promises.stat(filePath);
          const accessTime = Math.max(stat.atimeMs, stat.mtimeMs);

          // 仅统计未过期文件
          if (now - accessTime <= maxAgeMs) {
            count += 1;
            totalSizeBytes += stat.size;
          }
        } catch {
          // Ignore
        }
      }

      return { count, totalSizeBytes };
    } catch {
      return { count: 0, totalSizeBytes: 0 };
    }
  }

  return {
    get,
    put,
    prune,
    clear,
    getStats,
  };
}
