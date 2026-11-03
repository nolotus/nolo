import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { NeteaseSession, NeteaseSessionStore } from "./neteaseTypes";

const DEFAULT_FILE_NAME = "netease-session.json";

async function safeChmod(targetPath: string, mode: number): Promise<void> {
  if (process.platform === "win32") {
    return;
  }
  try {
    await fs.promises.chmod(targetPath, mode);
  } catch {
    // 忽略平台不支持或权限问题，不抛错
  }
}

export class NeteaseSessionStoreError extends Error {
  readonly code: string;
  constructor(message: string, code = "SESSION_STORE_ERROR", cause?: unknown) {
    super(message);
    this.name = "NeteaseSessionStoreError";
    this.code = code;
    this.cause = cause;
  }
}

function sanitizeSession(session: NeteaseSession): NeteaseSession {
  const result: NeteaseSession = {
    cookie: session.cookie,
    obtainedAt: session.obtainedAt,
  };
  if (typeof session.uid === "number" && !Number.isNaN(session.uid)) {
    result.uid = session.uid;
  }
  if (typeof session.nickname === "string") {
    result.nickname = session.nickname;
  }
  if (typeof session.avatarUrl === "string") {
    result.avatarUrl = session.avatarUrl;
  }
  return result;
}

export function createFileSessionStore(options: {
  dir: string;
  fileName?: string;
}): NeteaseSessionStore {
  const dir = options.dir;
  const fileName = options.fileName ?? DEFAULT_FILE_NAME;
  const filePath = path.join(dir, fileName);

  return {
    async read(): Promise<NeteaseSession | null> {
      let raw: string;
      try {
        raw = await fs.promises.readFile(filePath, "utf-8");
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "ENOENT"
        ) {
          return null;
        }
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[neteaseSessionStore] Failed to read session file ${filePath}:`, message);
        throw new NeteaseSessionStoreError(
          `Failed to read session file from ${filePath}: ${message}`,
          "SESSION_READ_ERROR",
          err,
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err: unknown) {
        console.warn(`[neteaseSessionStore] Session file corrupted in ${filePath}:`, err);
        return null;
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }

      const obj = parsed as Record<string, unknown>;
      if (typeof obj.cookie !== "string" || obj.cookie.trim().length === 0) {
        return null;
      }

      const obtainedAt =
        typeof obj.obtainedAt === "number" && !Number.isNaN(obj.obtainedAt)
          ? obj.obtainedAt
          : Date.now();

      const session: NeteaseSession = {
        cookie: obj.cookie,
        obtainedAt,
      };

      if (typeof obj.uid === "number" && !Number.isNaN(obj.uid)) {
        session.uid = obj.uid;
      }
      if (typeof obj.nickname === "string") {
        session.nickname = obj.nickname;
      }
      if (typeof obj.avatarUrl === "string") {
        session.avatarUrl = obj.avatarUrl;
      }

      return session;
    },

    async write(session: NeteaseSession): Promise<void> {
      await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
      await safeChmod(dir, 0o700);

      const rand = crypto.randomBytes(8).toString("hex");
      const tmpPath = `${filePath}.tmp-${process.pid}-${rand}`;
      const payload = sanitizeSession(session);
      const content = JSON.stringify(payload, null, 2) + "\n";

      try {
        await fs.promises.writeFile(tmpPath, content, {
          encoding: "utf-8",
          mode: 0o600,
        });
        await safeChmod(tmpPath, 0o600);
        await fs.promises.rename(tmpPath, filePath);
      } catch (err: unknown) {
        await fs.promises.unlink(tmpPath).catch(() => {});
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to write session file to ${filePath}: ${message}`);
      }
    },

    async clear(): Promise<void> {
      try {
        await fs.promises.unlink(filePath);
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "ENOENT"
        ) {
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to clear session file ${filePath}: ${message}`);
      }
    },
  };
}

export function createMemorySessionStore(
  initial?: NeteaseSession | null
): NeteaseSessionStore {
  let current: NeteaseSession | null = initial ? sanitizeSession(initial) : null;

  return {
    async read(): Promise<NeteaseSession | null> {
      return current ? { ...current } : null;
    },
    async write(session: NeteaseSession): Promise<void> {
      current = sanitizeSession(session);
    },
    async clear(): Promise<void> {
      current = null;
    },
  };
}
