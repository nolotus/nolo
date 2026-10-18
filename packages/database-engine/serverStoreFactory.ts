import fs from "fs";
import path from "path";
import { Level } from "level";

import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import type { AuthorityStore } from "./authorityStoreTypes";
import { createLegacyServerDb, type LegacyServerDb } from "./legacyServerDb";
import { createLevelAuthorityStore } from "./levelAuthorityStore";
import { createMemoryAuthorityStore } from "./memoryAuthorityStore";
import { createSqliteAuthorityStore } from "./sqliteAuthorityStore";
import { shouldOpenDatabase } from "core/runtimeRole";
import {
    ServerDbRoleViolationError,
    SERVER_DB_ROLE_VIOLATION_MESSAGE,
} from "./serverDbRoleViolation";

export type ServerStoreDriver = "level" | "memory" | "sqlite";

export type ServerStoreFactoryEnv = {
  NOLO_SERVER_AUTHORITY_DRIVER?: string | undefined;
};

export const safeJsonEncoding = {
  name: "safe-json",
  format: "utf8" as const,
  encode: (data: any) => JSON.stringify(data),
  decode: (data: string) => {
    try {
      return JSON.parse(data);
    } catch {
      console.warn("[LevelDB] Corrupted value:", data?.substring?.(0, 60));
      return null;
    }
  },
};

export type ServerStoreRuntime = {
  authorityStore: AuthorityStore;
  serverDb: LegacyServerDb;
};

export type ServerStoreFactoryOptions = {
  driver?: ServerStoreDriver;
  env?: ServerStoreFactoryEnv;
  globalScope?: Record<string, unknown>;
};

export function ensureServerDbDirectory(dbPath: string) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function createLevelBackedAuthorityStore(dbPath: string): AuthorityStore {
  const levelDb = new Level<string, any>(dbPath, {
    valueEncoding: safeJsonEncoding,
  });
  // Level package typings are stricter than the store's LevelLike surface.
  return createLevelAuthorityStore(levelDb as any);
}

export function resolveServerStoreDriver(
  env: ServerStoreFactoryEnv | NodeJS.ProcessEnv = process.env
): ServerStoreDriver {
  const rawDriver = asTrimmedLowercaseString(env.NOLO_SERVER_AUTHORITY_DRIVER);
  if (!rawDriver) return "level";
  if (rawDriver === "level") return "level";
  if (rawDriver === "memory") return "memory";
  if (rawDriver === "sqlite") return "sqlite";
  throw new Error(`Unsupported server authority store driver: ${rawDriver}`);
}

export function createAuthorityStoreForDriver(
  driver: ServerStoreDriver,
  dbPath: string
): AuthorityStore {
  switch (driver) {
    case "level":
      return createLevelBackedAuthorityStore(dbPath);
    case "memory":
      return createMemoryAuthorityStore(dbPath);
    case "sqlite":
      return createSqliteAuthorityStore(dbPath);
  }
}

/**
 * chat-proxy 等非 core 角色使用的「拒绝访问」store。
 *
 * 存在的唯一理由：**绝不能构造 real Level 实例**。`new Level()` 的构造器会在
 * `process.nextTick` 自动 open（abstract-level 的 autoOpen），于是「只是 import
 * 了 db.ts」就足以握住 LevelDB 的 LOCK —— 2026-10-18 生产整站 502 就是这么来的：
 * chat-proxy 先起、抢锁，core 等 NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS 超时崩溃循环。
 * 事后在 ensureServerDbOpen() 里补门禁已经太晚（实测：import 时 status 就是 opening）。
 *
 * 因此这里返回一个永远不碰磁盘的 store：open/get/put/... 一律抛 tagged 错误，
 * status 恒为 "closed"（如实反映「本进程没有库」）。close() 是 no-op —— 关机路径
 * 会无条件调用它，不该因为「本来就没开」而让关机失败。
 */
export function createRoleBlockedAuthorityStore(dbPath: string): AuthorityStore {
  const blocked = (): never => {
    throw new ServerDbRoleViolationError(SERVER_DB_ROLE_VIOLATION_MESSAGE);
  };
  async function* blockedIterator(): AsyncIterableIterator<[string, unknown]> {
    blocked();
  }
  return {
    location: dbPath,
    status: "closed",
    async open() {
      blocked();
    },
    async close() {
      // 从未打开过：让 shutdown 路径照常走完。
    },
    async get<T>(): Promise<T> {
      return blocked();
    },
    async put() {
      blocked();
    },
    async del() {
      blocked();
    },
    async batchWrite() {
      blocked();
    },
    createBatch() {
      return blocked();
    },
    iterator: blockedIterator,
  };
}

export function getOrCreateServerStoreRuntime(
  dbPath: string,
  options: ServerStoreFactoryOptions = {}
): ServerStoreRuntime {
  // 角色守卫必须在**任何**磁盘副作用之前：不 mkdir、不 new Level、不写 globalScope。
  // 放在 ensureServerDbDirectory/构造之后都晚了 —— 构造即抢锁（见 createRoleBlockedAuthorityStore）。
  if (!shouldOpenDatabase()) {
    const blocker = createRoleBlockedAuthorityStore(dbPath);
    return { authorityStore: blocker, serverDb: createLegacyServerDb(blocker) };
  }

  const globalScope =
    options.globalScope ?? (globalThis as Record<string, unknown>);
  const driver = options.driver ?? resolveServerStoreDriver(options.env);
  const cachedDriver = globalScope.__serverAuthorityStoreDriver;

  ensureServerDbDirectory(dbPath);

  if (
    globalScope.__serverAuthorityStore &&
    typeof cachedDriver === "string" &&
    cachedDriver !== driver
  ) {
    throw new Error(
      `Server authority store already initialized with driver ${cachedDriver}, cannot reuse it for ${driver}`
    );
  }

  if (!globalScope.__serverAuthorityStore) {
    globalScope.__serverAuthorityStore = createAuthorityStoreForDriver(
      driver,
      dbPath
    );
    globalScope.__serverAuthorityStoreDriver = driver;
  } else if (!cachedDriver) {
    globalScope.__serverAuthorityStoreDriver = driver;
  }

  const authorityStore = globalScope.__serverAuthorityStore as AuthorityStore;

  if (!globalScope.__serverDb) {
    globalScope.__serverDb = createLegacyServerDb(authorityStore);
  }

  return {
    authorityStore,
    serverDb: globalScope.__serverDb as LegacyServerDb,
  };
}
