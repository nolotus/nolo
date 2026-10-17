/**
 * Docker 配额 KV 存储：类型 + 纯实现（从 scripts/ci/runDockerWithQuota 原样搬出）。
 *
 * 分层原因：`packages/server` 依赖 `scripts/` 是方向错误，运行时依赖应落在本包，
 * 脚本侧只做重新导出，避免双份真值。
 *
 * 语义与原实现完全一致：记录字段、键格式、文件存储默认路径、远程存储配置解析均未改动。
 */

import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync, mkdirSync } from "node:fs";
import { loadProfileConfig, getProfileTokens } from "../cli/client/profileConfig";

export interface DockerQuotaRecord {
  key: string;
  owner: string;
  dockerAccount: string;
  remainingNanoUsd: string;
  observedAt: number;
  pendingEstimateNanoUsd: string;
  estimatedSpendNanoUsd: string;
  taskId: string;
  sandbox: string;
  status: "idle" | "running" | "stopped" | "failed";
  stale?: boolean;
  beforeAfter: {
    before?: {
      remainingNanoUsd: string;
      observedAt: number;
    };
    after?: {
      remainingNanoUsd: string;
      observedAt: number;
      stale?: boolean;
    };
  };
}

export interface DockerQuotaKvStore {
  get(key: string): Promise<DockerQuotaRecord | null>;
  put(key: string, record: DockerQuotaRecord): Promise<void>;
}

export class InMemoryDockerQuotaKvStore implements DockerQuotaKvStore {
  private readonly store = new Map<string, DockerQuotaRecord>();

  async get(key: string): Promise<DockerQuotaRecord | null> {
    const val = this.store.get(key);
    return val ? JSON.parse(JSON.stringify(val)) : null;
  }

  async put(key: string, record: DockerQuotaRecord): Promise<void> {
    this.store.set(key, JSON.parse(JSON.stringify(record)));
  }
}

export class FileDockerQuotaKvStore implements DockerQuotaKvStore {
  readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath =
      filePath ??
      join(process.env.NOLO_HOME || resolve(homedir(), ".nolo"), "docker-quota.json");
  }

  async get(key: string): Promise<DockerQuotaRecord | null> {
    try {
      if (!existsSync(this.filePath)) {
        return null;
      }
      const raw = readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      if (parsed.key === key) {
        return parsed as DockerQuotaRecord;
      }
      if (key in parsed) {
        return (parsed as Record<string, DockerQuotaRecord>)[key] ?? null;
      }
      return null;
    } catch (err) {
      console.warn(`[FileDockerQuotaKvStore] Warning: failed to parse quota file at ${this.filePath}:`, err);
      return null;
    }
  }

  async put(key: string, record: DockerQuotaRecord): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    let data: Record<string, DockerQuotaRecord> = {};
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          if (parsed.key && typeof parsed.key === "string" && !parsed[parsed.key]) {
            data[parsed.key] = parsed;
          } else {
            data = parsed;
          }
        }
      }
    } catch (err) {
      console.warn(`[FileDockerQuotaKvStore] Warning: corrupted quota file at ${this.filePath}, resetting content:`, err);
      data = {};
    }

    data[key] = record;

    const tmpPath = `${this.filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    try {
      writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
      renameSync(tmpPath, this.filePath);
    } catch (err) {
      try {
        if (existsSync(tmpPath)) {
          unlinkSync(tmpPath);
        }
      } catch {
        // ignore tmp cleanup error
      }
      throw err;
    }
  }
}

export interface RemoteDockerQuotaKvStoreOptions {
  serverUrl?: string;
  authToken?: string;
  userId?: string;
  fetchImpl?: typeof fetch;
}

export class RemoteDockerQuotaKvStore implements DockerQuotaKvStore {
  readonly serverUrl: string;
  readonly authToken?: string;
  readonly userId: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: RemoteDockerQuotaKvStoreOptions = {}) {
    const profileConfig = loadProfileConfig();
    const currentProfile = profileConfig?.currentProfile;
    const profile = currentProfile ? profileConfig?.profiles?.[currentProfile] : undefined;

    this.serverUrl = (
      options.serverUrl?.trim() ||
      profile?.serverUrl ||
      process.env.NOLO_SERVER ||
      process.env.BASE_URL ||
      ""
    ).replace(/\/+$/, "");

    this.authToken =
      options.authToken?.trim() ||
      (profileConfig ? getProfileTokens(profileConfig)[0] : undefined) ||
      profile?.authToken ||
      process.env.AUTH_TOKEN ||
      process.env.AUTH;

    let parsedUserId: string | undefined;
    if (this.authToken) {
      try {
        const parts = this.authToken.split(".").filter(Boolean);
        const payloadCandidates = parts.length >= 3 ? [parts[1], parts[0]] : [parts[0]];
        for (const payload of payloadCandidates) {
          const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
          if (typeof decoded?.userId === "string" && decoded.userId) {
            parsedUserId = decoded.userId;
            break;
          }
        }
      } catch {
        // ignore jwt decode errors
      }
    }

    this.userId =
      options.userId?.trim() ||
      parsedUserId ||
      (currentProfile && currentProfile !== "default" ? currentProfile : "") ||
      "system";

    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get(key: string): Promise<DockerQuotaRecord | null> {
    if (!this.serverUrl) {
      console.warn("[RemoteDockerQuotaKvStore] Warning: serverUrl is not configured");
      return null;
    }
    const url = `${this.serverUrl}/api/v1/db/read/${encodeURIComponent(key)}`;
    try {
      const headers: Record<string, string> = {};
      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }
      const res = await this.fetchImpl(url, {
        method: "GET",
        headers,
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        console.warn(`[RemoteDockerQuotaKvStore] GET ${url} failed with status ${res.status}`);
        return null;
      }
      const json = await res.json();
      if (!json || typeof json !== "object") {
        return null;
      }
      if ("data" in json && json.data && typeof json.data === "object") {
        return json.data as DockerQuotaRecord;
      }
      return json as DockerQuotaRecord;
    } catch (err) {
      console.warn(`[RemoteDockerQuotaKvStore] Error fetching key ${key} from ${url}:`, err);
      return null;
    }
  }

  async put(key: string, record: DockerQuotaRecord): Promise<void> {
    if (!this.serverUrl) {
      console.warn("[RemoteDockerQuotaKvStore] Warning: serverUrl is not configured");
      return;
    }
    const url = `${this.serverUrl}/api/v1/db/write/`;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }
      const body = {
        customKey: key,
        userId: this.userId,
        data: record,
      };
      const res = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        console.warn(`[RemoteDockerQuotaKvStore] POST ${url} failed with status ${res.status}: ${errorText}`);
      }
    } catch (err) {
      console.warn(`[RemoteDockerQuotaKvStore] Error writing key ${key} to ${url}:`, err);
    }
  }
}

export type DockerQuotaStorageMode = "remote" | "local" | "auto";

export function parseStorageMode(args: readonly string[]): DockerQuotaStorageMode | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--sync-to-server") return "remote";
    if (arg === "--no-sync-to-server") return "local";
    if (arg.startsWith("--storage=")) {
      const mode = arg.slice("--storage=".length).trim();
      if (mode === "remote" || mode === "local" || mode === "auto") return mode;
    }
    if (arg === "--storage" && i + 1 < args.length) {
      const mode = args[i + 1]?.trim();
      if (mode === "remote" || mode === "local" || mode === "auto") return mode;
    }
  }
  return undefined;
}

export interface DefaultDockerQuotaKvStoreOptions extends RemoteDockerQuotaKvStoreOptions {
  storageMode?: DockerQuotaStorageMode;
}

export function createDefaultDockerQuotaKvStore(
  options?: DefaultDockerQuotaKvStoreOptions
): DockerQuotaKvStore {
  const mode = options?.storageMode ?? "auto";

  if (mode === "local") {
    return new FileDockerQuotaKvStore();
  }

  const profileConfig = loadProfileConfig();
  const currentProfile = profileConfig?.currentProfile;
  const profile = currentProfile ? profileConfig?.profiles?.[currentProfile] : undefined;

  const explicitServerUrl = options && "serverUrl" in options ? options.serverUrl?.trim() : undefined;
  const serverUrl =
    explicitServerUrl !== undefined
      ? explicitServerUrl
      : profile?.serverUrl || process.env.NOLO_SERVER || process.env.BASE_URL;

  const explicitAuthToken = options && "authToken" in options ? options.authToken?.trim() : undefined;
  const authToken =
    explicitAuthToken !== undefined
      ? explicitAuthToken
      : (profileConfig ? getProfileTokens(profileConfig)[0] : undefined) ||
        profile?.authToken ||
        process.env.AUTH_TOKEN ||
        process.env.AUTH;

  if (mode === "remote") {
    if (!serverUrl || !authToken) {
      throw new Error(
        `Remote storage mode requested, but serverUrl or authToken is missing (serverUrl=${serverUrl ? "configured" : "missing"}, authToken=${authToken ? "configured" : "missing"})`
      );
    }
    return new RemoteDockerQuotaKvStore({
      ...options,
      serverUrl,
      authToken,
    });
  }

  // mode === "auto"
  if (serverUrl && authToken) {
    return new RemoteDockerQuotaKvStore({
      ...options,
      serverUrl,
      authToken,
    });
  }

  return new FileDockerQuotaKvStore();
}

export function buildDockerQuotaKey(owner: string, dockerAccount: string): string {
  if (!owner || !dockerAccount) {
    throw new Error("Both owner and dockerAccount must be non-empty to build quota key");
  }
  return `docker-quota:${owner}:${dockerAccount}`;
}
