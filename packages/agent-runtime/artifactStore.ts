// packages/agent-runtime/artifactStore.ts
//
// 块ART2：产物层（ArtifactStore）。run 的产出（工作区 diff、文件产物）需要一层
// 与「run 记录」分离的字节存储：记录里只留 ref（id / size / contentType / 时间），
// 字节落本地目录或 R2。
//
// 本模块的三条硬约定：
//   1. 密钥只参与签名，**绝不**进错误消息、日志或 ref —— 所有对外文本统一过
//      `redactSecrets`（凭据值逐字替换成 [redacted]）；
//   2. 不假装支持：本地目录没有签发 URL 的实体，`presign` 显式返回 null
//      （「返回 null」就是「本实现不支持」的可读声明，不伪装成一个假 URL）；
//   3. key → 路径的转换只发生在 store 内部：`assertArtifactKey` 拒绝绝对路径、
//      反斜杠、空段与 `..`，本地实现再加一层 root 前缀兜底。调用方不必各自
//      重复校验。
//
// R2 侧走 S3 兼容协议 + SigV4：普通 put/get/delete 用 Authorization 头签名，
// `presign` 用 query 签名（presigned URL，payload hash = UNSIGNED-PAYLOAD）。
// 未对真实 R2 端点做过端到端联调（本机没有凭据），正确性口径见
// artifactStore.test.ts：签名结构与自洽性（同一输入 → 同一签名）、以及请求
// 形状（method / URL / 头 / body）逐项断言。

import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

/** 产物引用：字节的唯一身份是「store + key」，ref 只是它的可序列化描述。 */
export type ArtifactRef = {
  id: string;
  sizeBytes: number;
  contentType?: string;
  createdAt: number;
};

export interface ArtifactStore {
  put(
    key: string,
    data: Uint8Array | string,
    opts?: { contentType?: string },
  ): Promise<ArtifactRef>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  /**
   * 可选：签发限时 URL。实现方**不支持时必须返回 null**（而不是抛错、也不是
   * 返回一个必失效的假 URL）——调用方据此走「服务端代理读取」的降级路径。
   */
  presign?(key: string, op: "get" | "put", ttlSec: number): Promise<string | null>;
}

export type ArtifactStoreErrorCode =
  | "invalid_key"
  | "invalid_ttl"
  | "not_found"
  | "io_failed"
  | "request_failed";

export class ArtifactStoreError extends Error {
  readonly code: ArtifactStoreErrorCode;
  readonly key?: string;

  constructor(code: ArtifactStoreErrorCode, message: string, key?: string) {
    super(message);
    this.name = "ArtifactStoreError";
    this.code = code;
    if (key !== undefined) this.key = key;
  }
}

const MAX_KEY_LENGTH = 1024;
const MAX_PRESIGN_TTL_SEC = 60 * 60 * 168;
const KEY_HEAD_CHARS = 200;

/** 只用于日志/错误消息的 key 投影：key 不含凭据，但仍按「不整段外泄」处理。 */
function describeKey(key: string): string {
  return key.length > KEY_HEAD_CHARS ? `${key.slice(0, KEY_HEAD_CHARS)}…` : key;
}

export function assertArtifactKey(key: string): void {
  if (typeof key !== "string" || key.length === 0 || key.length > MAX_KEY_LENGTH) {
    throw new ArtifactStoreError(
      "invalid_key",
      `artifact key 必须是 1..${MAX_KEY_LENGTH} 字符的非空字符串`,
    );
  }
  if (key.startsWith("/") || key.includes("\\") || key.includes("\0")) {
    throw new ArtifactStoreError(
      "invalid_key",
      `artifact key 必须是相对 POSIX 路径（不得以 / 开头、不得含 \\ 或 NUL）：${describeKey(key)}`,
      key,
    );
  }
  if (key.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new ArtifactStoreError(
      "invalid_key",
      `artifact key 不允许空段 / "." / ".."：${describeKey(key)}`,
      key,
    );
  }
}

function toBytes(data: Uint8Array | string): Uint8Array {
  return typeof data === "string" ? new TextEncoder().encode(data) : data;
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > KEY_HEAD_CHARS ? `${message.slice(0, KEY_HEAD_CHARS)}…` : message;
}

/** 把凭据值逐字替换掉：任何进错误消息/日志的文本都必须先过这一层。 */
export function redactSecrets(message: string, secrets: readonly string[]): string {
  let out = message;
  for (const secret of secrets) {
    if (secret && out.includes(secret)) out = out.split(secret).join("[redacted]");
  }
  return out;
}

function isNotFoundError(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "ENOENT";
}

// ---------------------------------------------------------------------------
// 本地目录实现
// ---------------------------------------------------------------------------

export type LocalArtifactStoreOptions = {
  rootDir: string;
  now?: () => number;
};

export function createLocalArtifactStore(
  options: LocalArtifactStoreOptions,
): ArtifactStore {
  const root = resolve(options.rootDir);
  const now = options.now ?? Date.now;

  const pathFor = (key: string): string => {
    assertArtifactKey(key);
    const target = resolve(root, key);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      throw new ArtifactStoreError(
        "invalid_key",
        `artifact key 解析后越出 rootDir：${describeKey(key)}`,
        key,
      );
    }
    return target;
  };

  return {
    async put(key, data, opts) {
      const bytes = toBytes(data);
      const target = pathFor(key);
      try {
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, bytes);
      } catch (error) {
        if (error instanceof ArtifactStoreError) throw error;
        throw new ArtifactStoreError(
          "io_failed",
          `本地产物写入失败（${describeKey(key)}）：${describeError(error)}`,
          key,
        );
      }
      return {
        id: key,
        sizeBytes: bytes.byteLength,
        ...(opts?.contentType ? { contentType: opts.contentType } : {}),
        createdAt: now(),
      };
    },

    async get(key) {
      const target = pathFor(key);
      try {
        return new Uint8Array(await readFile(target));
      } catch (error) {
        if (isNotFoundError(error)) {
          throw new ArtifactStoreError(
            "not_found",
            `本地产物不存在：${describeKey(key)}`,
            key,
          );
        }
        throw new ArtifactStoreError(
          "io_failed",
          `本地产物读取失败（${describeKey(key)}）：${describeError(error)}`,
          key,
        );
      }
    },

    async delete(key) {
      const target = pathFor(key);
      try {
        await unlink(target);
      } catch (error) {
        // 幂等：删一个不存在的 key 不是失败。
        if (isNotFoundError(error)) return;
        throw new ArtifactStoreError(
          "io_failed",
          `本地产物删除失败（${describeKey(key)}）：${describeError(error)}`,
          key,
        );
      }
    },

    // 本地目录没有签发 URL 的实体：显式声明「不支持」，不伪造 URL。
    async presign() {
      return null;
    },
  };
}

/**
 * 调用方取 URL 的统一入口：实现没提供 `presign` → null（= 本 store 不支持
 * 直连 URL，请走代理读取）。**不抛错**，让降级路径保持在调用方手里。
 */
export async function resolvePresignedUrl(
  store: ArtifactStore,
  key: string,
  op: "get" | "put",
  ttlSec: number,
): Promise<string | null> {
  if (!store.presign) return null;
  return await store.presign(key, op, ttlSec);
}

// ---------------------------------------------------------------------------
// R2（S3 兼容）实现
// ---------------------------------------------------------------------------

export type R2ArtifactStoreOptions = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** 缺省 `https://<accountId>.r2.cloudflarestorage.com`；测试/私有网关可覆盖。 */
  endpoint?: string;
  /** R2 用 "auto"；留出参数是为了能对着任意 S3 兼容端点复用同一签名代码。 */
  region?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

type SigV4Context = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  amzDate: string;
  dateStamp: string;
  scope: string;
};

function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: string | Uint8Array, value: string): Uint8Array {
  return new Uint8Array(createHmac("sha256", key).update(value, "utf8").digest());
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeKeyPath(key: string): string {
  return key.split("/").map(rfc3986).join("/");
}

/** `2024-01-01T00:00:00.000Z` → `20240101T000000Z`。 */
function formatAmzDate(nowMs: number): string {
  return new Date(nowMs).toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sigV4Context(args: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  nowMs: number;
}): SigV4Context {
  const amzDate = formatAmzDate(args.nowMs);
  const dateStamp = amzDate.slice(0, 8);
  return {
    accessKeyId: args.accessKeyId,
    secretAccessKey: args.secretAccessKey,
    region: args.region,
    amzDate,
    dateStamp,
    scope: `${dateStamp}/${args.region}/s3/aws4_request`,
  };
}

function signingKey(context: SigV4Context): Uint8Array {
  return hmacSha256(
    hmacSha256(
      hmacSha256(hmacSha256(`AWS4${context.secretAccessKey}`, context.dateStamp), context.region),
      "s3",
    ),
    "aws4_request",
  );
}

function signCanonicalRequest(context: SigV4Context, canonicalRequest: string): string {
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    context.amzDate,
    context.scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  return bytesToHex(hmacSha256(signingKey(context), stringToSign));
}

/** Header 签名（put/get/delete 走这条）：host / x-amz-content-sha256 / x-amz-date 全签。 */
function signedHeadersFor(args: {
  context: SigV4Context;
  method: string;
  canonicalUri: string;
  host: string;
  payloadHash: string;
}): Record<string, string> {
  const signedHeaderNames = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders =
    `host:${args.host}\n` +
    `x-amz-content-sha256:${args.payloadHash}\n` +
    `x-amz-date:${args.context.amzDate}\n`;
  const canonicalRequest = [
    args.method,
    args.canonicalUri,
    "",
    canonicalHeaders,
    signedHeaderNames,
    args.payloadHash,
  ].join("\n");
  const signature = signCanonicalRequest(args.context, canonicalRequest);
  return {
    "x-amz-date": args.context.amzDate,
    "x-amz-content-sha256": args.payloadHash,
    authorization:
      `AWS4-HMAC-SHA256 Credential=${args.context.accessKeyId}/${args.context.scope}, ` +
      `SignedHeaders=${signedHeaderNames}, Signature=${signature}`,
  };
}

/** Query 签名（presigned URL）：只签 host，payload hash 用 UNSIGNED-PAYLOAD。 */
function presignedUrlFor(args: {
  context: SigV4Context;
  method: string;
  baseUrl: string;
  canonicalUri: string;
  host: string;
  ttlSec: number;
}): string {
  const query = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${args.context.accessKeyId}/${args.context.scope}`],
    ["X-Amz-Date", args.context.amzDate],
    ["X-Amz-Expires", String(args.ttlSec)],
    ["X-Amz-SignedHeaders", "host"],
  ]
    .map(([name, value]) => `${rfc3986(name!)}=${rfc3986(value!)}`)
    .join("&");
  const canonicalRequest = [
    args.method,
    args.canonicalUri,
    query,
    `host:${args.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const signature = signCanonicalRequest(args.context, canonicalRequest);
  return `${args.baseUrl}?${query}&X-Amz-Signature=${signature}`;
}

const EMPTY_SHA256 = sha256Hex("");

function assertPresignTtl(ttlSec: number): void {
  if (!Number.isInteger(ttlSec) || ttlSec < 1 || ttlSec > MAX_PRESIGN_TTL_SEC) {
    throw new ArtifactStoreError(
      "invalid_ttl",
      `presign ttlSec 必须是 1..${MAX_PRESIGN_TTL_SEC} 的整数（收到 ${String(ttlSec)}）`,
    );
  }
}

export function createR2ArtifactStore(options: R2ArtifactStoreOptions): ArtifactStore {
  const secrets = [options.secretAccessKey];
  const redact = (message: string) => redactSecrets(message, secrets);
  const base = (options.endpoint ?? `https://${options.accountId}.r2.cloudflarestorage.com`)
    .replace(/\/+$/, "");
  const host = new URL(base).host;
  const region = options.region ?? "auto";
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? Date.now;

  const objectTarget = (key: string) => {
    assertArtifactKey(key);
    const canonicalUri = `/${rfc3986(options.bucket)}/${encodeKeyPath(key)}`;
    return { canonicalUri, url: `${base}${canonicalUri}` };
  };

  const context = () =>
    sigV4Context({
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      region,
      nowMs: now(),
    });

  /** 所有失败的对外文本都过 redact：ni错误里绝不出现凭据值。 */
  const requestFailed = (method: string, key: string, detail: string) =>
    new ArtifactStoreError(
      "request_failed",
      redact(`R2 ${method} ${describeKey(key)} 请求失败：${detail}`),
      key,
    );

  const call = async (
    method: "PUT" | "GET" | "DELETE",
    key: string,
    body: Uint8Array | undefined,
    contentType: string | undefined,
  ) => {
    const target = objectTarget(key);
    const payloadHash = body ? sha256Hex(body) : EMPTY_SHA256;
    const headers = signedHeadersFor({
      context: context(),
      method,
      canonicalUri: target.canonicalUri,
      host,
      payloadHash,
    });
    let response: Response;
    try {
      response = await fetchImpl(target.url, {
        method,
        headers: {
          ...headers,
          ...(contentType ? { "content-type": contentType } : {}),
        },
        ...(body ? { body } : {}),
      });
    } catch (error) {
      throw requestFailed(method, key, describeError(error));
    }
    return { response, target };
  };

  return {
    async put(key, data, opts) {
      const bytes = toBytes(data);
      const contentType = opts?.contentType ?? "application/octet-stream";
      const { response } = await call("PUT", key, bytes, contentType);
      if (!response.ok) {
        throw requestFailed("PUT", key, `HTTP ${response.status}`);
      }
      return {
        id: key,
        sizeBytes: bytes.byteLength,
        contentType,
        createdAt: now(),
      };
    },

    async get(key) {
      const { response } = await call("GET", key, undefined, undefined);
      if (response.status === 404) {
        throw new ArtifactStoreError("not_found", `R2 产物不存在：${describeKey(key)}`, key);
      }
      if (!response.ok) {
        throw requestFailed("GET", key, `HTTP ${response.status}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },

    async delete(key) {
      const { response } = await call("DELETE", key, undefined, undefined);
      // 删不存在的对象在 S3 语义里是成功：保持幂等。
      if (response.ok || response.status === 404) return;
      throw requestFailed("DELETE", key, `HTTP ${response.status}`);
    },

    async presign(key, op, ttlSec) {
      assertPresignTtl(ttlSec);
      const target = objectTarget(key);
      return presignedUrlFor({
        context: context(),
        method: op === "get" ? "GET" : "PUT",
        baseUrl: target.url,
        canonicalUri: target.canonicalUri,
        host,
        ttlSec,
      });
    },
  };
}
