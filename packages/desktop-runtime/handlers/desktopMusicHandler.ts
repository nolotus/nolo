import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { toErrorMessage } from "core/errorMessage";
import {
  createNeteaseClient,
  createFileSessionStore,
  createAudioCacheManager,
  type AudioCacheManager,
  type NeteaseErrorCode,
  type NeteaseClient,
} from "../../integrations/netease";
import { resolveDesktopChannelDir } from "../../desktop/src/bun/runtimePaths";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });

type MusicErrorPayload = {
  ok: false;
  reason: NeteaseErrorCode;
  message: string;
};

/**
 * 已知错误码对应的人话默认文案。命中时优先用它，避免把底层 HTTP 原文
 * （可能夹带 cookie/token）直接透给 renderer。
 */
const CODE_MESSAGES: Partial<Record<NeteaseErrorCode, string>> = {
  "not-authenticated": "登录已失效，请重新连接",
  "session-expired": "登录已失效，请重新连接",
  "rate-limited": "操作太频繁，请稍后再试",
  "captcha-required": "网易云要求验证，请在网易云 App 中确认",
  network: "网络请求失败，请检查网络",
  "bad-response": "服务返回异常",
};

const GENERIC_ERROR_MESSAGE = "服务异常，请稍后重试";

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/(?:cookie|token|secret|ticket|auth)=[^\s;&]+/gi, "[REDACTED]")
    .slice(0, 200);
}

function reasonOf(error: unknown): NeteaseErrorCode {
  if (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code as NeteaseErrorCode;
  }
  return "unknown";
}

/**
 * 把任意异常归一成 renderer 可直接消费的失败负载：
 * `{ ok: false, reason, message }`。`reason` 保留 NeteaseError.code，
 * `message` 用该 code 的人话默认文案；未知码回退到（已脱敏的）原始 message。
 */
function errorPayload(error: unknown): MusicErrorPayload {
  const reason = reasonOf(error);
  const original = sanitizeErrorMessage(toErrorMessage(error));
  const message = CODE_MESSAGES[reason] || original || GENERIC_ERROR_MESSAGE;
  return { ok: false, reason, message };
}

function statusForReason(reason: NeteaseErrorCode): number {
  switch (reason) {
    case "not-authenticated":
    case "session-expired":
      return 401;
    case "rate-limited":
      return 429;
    case "captcha-required":
      return 403;
    default:
      return 500;
  }
}

function errorResponse(error: unknown): Response {
  const payload = errorPayload(error);
  return json(payload, statusForReason(payload.reason));
}

export type MusicFetchFunction = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type MusicHandlerDeps = {
  client?: NeteaseClient;
  getClient?: () => Promise<NeteaseClient>;
  cache?: AudioCacheManager;
  fetchImpl?: MusicFetchFunction;
};

export function resolveDefaultSessionDir(): string {
  try {
    const channel = process.env.NOLO_DESKTOP_CHANNEL || "stable";
    const channelDir = resolveDesktopChannelDir(channel);
    if (channelDir) {
      return path.join(channelDir, "netease");
    }
  } catch {
    // fallback
  }
  return path.join(homedir(), ".config", "chat.nolo.desktop", "netease");
}

let defaultClient: NeteaseClient | null = null;
let defaultAudioCache: AudioCacheManager | null = null;

export function resolveDefaultAudioCacheDir(): string {
  try {
    const channel = process.env.NOLO_DESKTOP_CHANNEL || "stable";
    const channelDir = resolveDesktopChannelDir(channel);
    if (channelDir) {
      return path.join(channelDir, "audio-cache");
    }
  } catch {
    // fallback
  }
  return path.join(homedir(), ".config", "chat.nolo.desktop", "audio-cache");
}

function resolveAudioCache(deps?: MusicHandlerDeps): AudioCacheManager {
  if (deps?.cache) {
    return deps.cache;
  }
  if (!defaultAudioCache) {
    const cacheDir = resolveDefaultAudioCacheDir();
    defaultAudioCache = createAudioCacheManager({
      cacheDir,
      maxSizeBytes: 500 * 1024 * 1024,
      maxAgeMs: 7 * 24 * 60 * 60 * 1000,
    });
  }
  return defaultAudioCache;
}

async function resolveClient(deps?: MusicHandlerDeps): Promise<NeteaseClient> {
  if (deps?.client) {
    return deps.client;
  }
  if (deps?.getClient) {
    return await deps.getClient();
  }
  if (!defaultClient) {
    const sessionDir = resolveDefaultSessionDir();
    const sessionStore = createFileSessionStore({ dir: sessionDir });
    defaultClient = createNeteaseClient(undefined, { sessionStore });
  }
  return defaultClient;
}

export async function handleDesktopMusicStatusGet(
  _req: Request,
  deps?: MusicHandlerDeps,
): Promise<Response> {
  try {
    const client = await resolveClient(deps);
    const session = await client.getSession();
    return json({
      ok: true,
      connected: !!session,
      nickname: session?.nickname,
      uid: session?.uid,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleDesktopMusicLoginPost(
  _req: Request,
  deps?: MusicHandlerDeps,
): Promise<Response> {
  try {
    const client = await resolveClient(deps);
    const login = await client.createQrLogin();
    return json({
      ok: true,
      key: login.key,
      qrUrl: login.qrUrl,
      expiresAt: login.expiresAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleDesktopMusicLoginStatusGet(
  req: Request,
  deps?: MusicHandlerDeps,
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!key || !key.trim()) {
      return json({ ok: false, error: "Missing key" }, 400);
    }

    const client = await resolveClient(deps);
    const status = await client.pollQrLogin(key.trim());
    return json({
      ok: true,
      state: status.state,
      message: status.message,
      nickname: status.session?.nickname,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleDesktopMusicSearchPost(
  req: Request,
  deps?: MusicHandlerDeps,
): Promise<Response> {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const keyword = typeof body?.keyword === "string" ? body.keyword.trim() : "";
    if (!keyword) {
      return json({ ok: false, error: "Missing keyword" }, 400);
    }

    const limit = typeof body?.limit === "number" ? body.limit : undefined;
    const offset = typeof body?.offset === "number" ? body.offset : undefined;

    const client = await resolveClient(deps);
    const res = await client.searchSongs({ keyword, limit, offset });
    return json({
      ok: true,
      songs: res.songs,
      total: res.total,
      offset: res.offset,
      limit: res.limit,
    });
  } catch (error) {
    // 搜索失败必须如实回传错误码（401/429/403/500），不得伪装成"没搜到"。
    return errorResponse(error);
  }
}

export async function handleDesktopMusicPlayUrlPost(
  req: Request,
  deps?: MusicHandlerDeps,
): Promise<Response> {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const songId =
      typeof body?.songId === "number" && !Number.isNaN(body.songId)
        ? body.songId
        : null;
    if (songId === null) {
      return json({ ok: false, error: "Missing songId" }, 400);
    }

    const quality = typeof body?.quality === "string" ? body.quality : undefined;

    const client = await resolveClient(deps);
    const res = await client.getPlayUrl({ songId, quality });
    const rawRes = res as any;
    return json({
      ok: true,
      playable: !!res?.url,
      ...(res?.reason ? { reason: res.reason } : {}),
      ...(res?.message ? { message: res.message } : {}),
      ...(typeof rawRes?.durationMs === "number" ? { durationMs: rawRes.durationMs } : {}),
      ...(res?.quality ? { quality: res.quality } : {}),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleDesktopMusicLyricGet(
  req: Request,
  deps?: MusicHandlerDeps,
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const rawSongId = url.searchParams.get("songId");
    if (!rawSongId || rawSongId.trim() === "" || Number.isNaN(Number(rawSongId))) {
      return json({ ok: false, error: "Missing songId" }, 400);
    }

    const songId = Number(rawSongId);
    const client = await resolveClient(deps);
    const res = await client.getLyric(songId);
    return json({
      ok: true,
      lyric: res,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function getFileSliceBody(filePath: string, start?: number, end?: number): BodyInit {
  if (typeof Bun !== "undefined" && typeof (Bun as any).file === "function") {
    const file = (Bun as any).file(filePath);
    if (typeof start === "number" && typeof end === "number") {
      return file.slice(start, end + 1);
    }
    return file;
  }
  const buf = fs.readFileSync(filePath);
  if (typeof start === "number" && typeof end === "number") {
    return buf.subarray(start, end + 1);
  }
  return buf;
}

export async function handleDesktopMusicAudioGet(
  req: Request,
  deps?: MusicHandlerDeps,
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const rawSongId = url.searchParams.get("songId");
    if (!rawSongId || rawSongId.trim() === "" || Number.isNaN(Number(rawSongId))) {
      return json({ ok: false, error: "Missing songId" }, 400);
    }

    const songId = Number(rawSongId);
    const quality = url.searchParams.get("quality") || undefined;
    const cacheKey = `${songId}:${quality ?? "standard"}`;
    const cache = resolveAudioCache(deps);

    let cachedPath: string | null = null;
    try {
      cachedPath = await cache.get(cacheKey);
    } catch {
      cachedPath = null;
    }

    if (cachedPath) {
      const stat = await fs.promises.stat(cachedPath);
      const fileSize = stat.size;
      const rangeHeader = req.headers.get("range");

      if (rangeHeader && rangeHeader.startsWith("bytes=")) {
        const parts = rangeHeader.replace(/bytes=/, "").trim().split("-");
        const rawStart = parts[0];
        const rawEnd = parts[1];

        let start = rawStart ? parseInt(rawStart, 10) : NaN;
        let end = rawEnd ? parseInt(rawEnd, 10) : NaN;

        if (isNaN(start)) {
          if (isNaN(end)) {
            return new Response("Invalid Range", { status: 416 });
          }
          start = Math.max(0, fileSize - end);
          end = fileSize - 1;
        } else if (isNaN(end)) {
          end = fileSize - 1;
        }

        if (start >= fileSize || end < start) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
            },
          });
        }

        const safeEnd = Math.min(end, fileSize - 1);
        const chunkSize = safeEnd - start + 1;
        const body = getFileSliceBody(cachedPath, start, safeEnd);

        return new Response(body, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${safeEnd}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": "audio/mpeg",
          },
        });
      }

      const body = getFileSliceBody(cachedPath);
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Accept-Ranges": "bytes",
          "Content-Length": String(fileSize),
        },
      });
    }

    // 缓存未命中
    const client = await resolveClient(deps);
    const res = await client.getPlayUrl({ songId, quality: quality as any });

    if (!res || !res.url) {
      return json(
        {
          ok: false,
          error: "no-source",
          reason: res?.reason,
          message: res?.message,
        },
        404,
      );
    }

    const fetchFn = deps?.fetchImpl || globalThis.fetch;
    const clientRange = req.headers.get("range");
    const fetchHeaders: Record<string, string> = {};
    if (clientRange) {
      fetchHeaders["range"] = clientRange;
    }

    let audioResp: Response;
    try {
      audioResp = await fetchFn(res.url, {
        headers: fetchHeaders,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (fetchErr: any) {
      if (
        fetchErr?.name === "TimeoutError" ||
        fetchErr?.name === "AbortError" ||
        (typeof fetchErr?.message === "string" &&
          fetchErr.message.toLowerCase().includes("timeout"))
      ) {
        return json(
          { ok: false, error: "gateway-timeout", message: "音频流拉取超时" },
          504,
        );
      }
      throw fetchErr;
    }

    if (!audioResp.ok) {
      return new Response(audioResp.body, {
        status: audioResp.status,
        headers: {
          "Content-Type": audioResp.headers.get("content-type") || "text/plain",
        },
      });
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", audioResp.headers.get("content-type") || "audio/mpeg");
    const cl = audioResp.headers.get("content-length");
    if (cl) responseHeaders.set("Content-Length", cl);
    const cr = audioResp.headers.get("content-range");
    if (cr) responseHeaders.set("Content-Range", cr);
    responseHeaders.set("Accept-Ranges", audioResp.headers.get("accept-ranges") || "bytes");

    if (!clientRange && audioResp.body) {
      const [streamForClient, streamForCache] = audioResp.body.tee();
      cache.put(cacheKey, streamForCache).catch(() => {
        // 缓存写入失败不得影响播放（catch 后忽略，播放继续）
      });
      return new Response(streamForClient, {
        status: audioResp.status,
        headers: responseHeaders,
      });
    }

    return new Response(audioResp.body, {
      status: audioResp.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleDesktopMusicLogoutPost(
  _req: Request,
  deps?: MusicHandlerDeps,
): Promise<Response> {
  try {
    const client = await resolveClient(deps);
    await client.logout();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
