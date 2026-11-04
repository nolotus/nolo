import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { resolveDesktopChannelDir } from "../../desktop/src/bun/runtimePaths";
import type {
  LocalLibrary,
  LocalScanner,
} from "../../integrations/local-music/localMusicTypes";
import { createLocalLibrary } from "../../integrations/local-music/localMusicIndex";
import { createLocalScanner } from "../../integrations/local-music/localMusicScanner";
import type { MusicErrorCode } from "../../integrations/music/musicTypes";
import { isMusicError } from "../../integrations/music/musicTypes";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });

export const AUDIO_MIME_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/mp4",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
};

export function getAudioContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return AUDIO_MIME_TYPES[ext] || "application/octet-stream";
}

export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/(?:cookie|token|secret|ticket|auth)=[^\s;&]+/gi, "[REDACTED]")
    .replace(/(?:bearer\s+)[^\s;&]+/gi, "[REDACTED]")
    .slice(0, 200);
}

function statusForReason(reason: MusicErrorCode | "busy"): number {
  switch (reason) {
    case "not-authenticated":
    case "session-expired":
      return 401;
    case "rate-limited":
      return 429;
    case "captcha-required":
    case "permission-denied":
      return 403;
    case "no-source":
      return 404;
    case "busy":
      return 409;
    default:
      return 500;
  }
}

function errorJson(
  reason: MusicErrorCode | "busy",
  message: string,
  status?: number,
): Response {
  return json(
    {
      ok: false,
      reason,
      message: sanitizeErrorMessage(message),
    },
    status ?? statusForReason(reason),
  );
}

function errorResponse(
  error: unknown,
  defaultReason: MusicErrorCode = "bad-response",
): Response {
  if (isMusicError(error)) {
    return errorJson(error.code, error.message);
  }
  const msg = error instanceof Error ? error.message : String(error);
  return errorJson(defaultReason, msg);
}

export function parseRangeHeader(
  rangeHeader: string,
  fileSize: number,
): { start: number; end: number } | null {
  if (fileSize <= 0) {
    return null;
  }
  const match = rangeHeader.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const rawStart = match[1];
  const rawEnd = match[2];

  let start: number;
  let end: number;

  if (rawStart && rawEnd) {
    start = parseInt(rawStart, 10);
    end = parseInt(rawEnd, 10);
  } else if (rawStart && !rawEnd) {
    start = parseInt(rawStart, 10);
    end = fileSize - 1;
  } else if (!rawStart && rawEnd) {
    const suffixLength = parseInt(rawEnd, 10);
    if (suffixLength === 0) return null;
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  } else {
    return null;
  }

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
    return null;
  }

  end = Math.min(end, fileSize - 1);
  return { start, end };
}

const PROJECT_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidProjectId(projectId: unknown): projectId is string {
  return typeof projectId === "string" && PROJECT_ID_REGEX.test(projectId);
}

function invalidProjectIdResponse(): Response {
  return errorJson("bad-response", "缺少项目标识", 400);
}

export type DesktopLocalMusicHandlerDeps = {
  library?: LocalLibrary | ((projectId: string) => LocalLibrary);
  libraries?: Map<string, LocalLibrary>;
  channelDir?: string;
  scanner?: LocalScanner;
  now?: () => number;
};

export type LocalMusicHandlerDeps = DesktopLocalMusicHandlerDeps;

export function resolveDefaultIndexPath(
  projectId?: string,
  channelDirOverride?: string,
): string {
  const getChannelDir = () => {
    if (channelDirOverride) return channelDirOverride;
    if (process.env.NOLO_DESKTOP_CHANNEL_DIR) return process.env.NOLO_DESKTOP_CHANNEL_DIR;
    try {
      const channel = process.env.NOLO_DESKTOP_CHANNEL || "stable";
      return resolveDesktopChannelDir(channel);
    } catch {
      return path.join(
        homedir(),
        ".config",
        "chat.nolo.desktop",
      );
    }
  };

  const channelDir = getChannelDir();
  if (projectId) {
    return path.join(channelDir, "local-music", projectId, "index.json");
  }
  return path.join(channelDir, "local-music", "index.json");
}

const defaultLibraries = new Map<string, LocalLibrary>();
const activeScanPromises = new Map<string, Promise<void>>();
let defaultScanner: LocalScanner | null = null;

export function resetDefaultDesktopLocalMusicSingletons(): void {
  defaultLibraries.clear();
  activeScanPromises.clear();
  defaultScanner = null;
}

function resolveLibrary(
  projectId: string,
  deps?: DesktopLocalMusicHandlerDeps,
): LocalLibrary {
  if (typeof deps?.library === "function") {
    return deps.library(projectId);
  }
  if (deps?.libraries) {
    let lib = deps.libraries.get(projectId);
    if (!lib) {
      lib = createLocalLibrary({
        indexPath: resolveDefaultIndexPath(projectId, deps?.channelDir),
        autoLoad: true,
        projectId,
      });
      deps.libraries.set(projectId, lib);
    }
    return lib;
  }
  if (deps?.library) {
    return deps.library;
  }
  let lib = defaultLibraries.get(projectId);
  if (!lib) {
    lib = createLocalLibrary({
      indexPath: resolveDefaultIndexPath(projectId, deps?.channelDir),
      autoLoad: true,
      projectId,
    });
    defaultLibraries.set(projectId, lib);
  }
  return lib;
}

function resolveScanner(deps?: DesktopLocalMusicHandlerDeps): LocalScanner {
  if (deps?.scanner) {
    return deps.scanner;
  }
  if (!defaultScanner) {
    defaultScanner = createLocalScanner({
      now: deps?.now,
    });
  }
  return defaultScanner;
}

export async function handleDesktopLocalMusicStatusGet(
  req: Request,
  deps?: DesktopLocalMusicHandlerDeps,
): Promise<Response> {
  try {
    const url = new URL(req.url, "http://localhost");
    const projectId = url.searchParams.get("projectId");
    if (!isValidProjectId(projectId)) {
      return invalidProjectIdResponse();
    }

    const library = resolveLibrary(projectId, deps);
    return json({
      ok: true,
      stats: await library.stats(),
      roots: library.listRoots(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleDesktopLocalMusicRootsPost(
  req: Request,
  deps?: DesktopLocalMusicHandlerDeps,
): Promise<Response> {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorJson("bad-response", "Invalid JSON payload", 400);
    }

    if (!body || typeof body !== "object") {
      return invalidProjectIdResponse();
    }

    const { projectId, action, path: rawPath } = body;
    if (!isValidProjectId(projectId)) {
      return invalidProjectIdResponse();
    }

    if (action !== "add" && action !== "remove") {
      return errorJson("bad-response", 'Action must be "add" or "remove"', 400);
    }

    if (typeof rawPath !== "string" || !rawPath.trim()) {
      return errorJson("bad-response", "Path must be a non-empty string", 400);
    }

    const normalizedPath = rawPath.trim();

    // 不允许接受相对路径或 ..
    if (!path.isAbsolute(normalizedPath)) {
      return errorJson("bad-response", "Path must be an absolute path", 400);
    }

    const pathSegments = normalizedPath.split(/[/\\]/);
    if (pathSegments.includes("..")) {
      return errorJson("bad-response", "Path must not contain '..'", 400);
    }

    const library = resolveLibrary(projectId, deps);

    if (action === "add") {
      // 路径必须存在且是目录，否则 400
      let stat: fs.Stats;
      try {
        stat = await fs.promises.stat(normalizedPath);
      } catch {
        return errorJson("bad-response", "Path does not exist", 400);
      }

      if (!stat.isDirectory()) {
        return errorJson("bad-response", "Path is not a directory", 400);
      }

      const res = await library.addRoot(normalizedPath);
      await library.persist();
      return json({ ok: true, added: res.added });
    } else {
      const res = await library.removeRoot(normalizedPath);
      await library.persist();
      return json({ ok: true, removed: res.removed });
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleDesktopLocalMusicScanPost(
  req: Request,
  deps?: DesktopLocalMusicHandlerDeps,
): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return invalidProjectIdResponse();
  }

  if (!body || typeof body !== "object") {
    return invalidProjectIdResponse();
  }

  const { projectId } = body;
  if (!isValidProjectId(projectId)) {
    return invalidProjectIdResponse();
  }

  if (activeScanPromises.has(projectId)) {
    return json(
      { ok: false, reason: "busy", message: "Scan already in progress" },
      409,
    );
  }

  const library = resolveLibrary(projectId, deps);
  const scanner = resolveScanner(deps);

  let finishScan: () => void = () => {};
  const scanPromise = new Promise<void>((resolve) => {
    finishScan = resolve;
  });
  activeScanPromises.set(projectId, scanPromise);

  try {
    const roots = library.listRoots();
    const previous = library.allTracks();
    const { tracks, result } = await scanner.scan({ roots, previous });
    await library.applyScan({ roots, tracks });
    await library.persist();
    return json({
      ok: true,
      result,
      stats: await library.stats(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return json(
      {
        ok: false,
        reason: "bad-response",
        message: sanitizeErrorMessage(msg),
      },
      500,
    );
  } finally {
    activeScanPromises.delete(projectId);
    finishScan();
  }
}

export async function handleDesktopLocalMusicFileGet(
  req: Request,
  deps?: DesktopLocalMusicHandlerDeps,
): Promise<Response> {
  try {
    const url = new URL(req.url, "http://localhost");
    const projectId = url.searchParams.get("projectId");
    if (!isValidProjectId(projectId)) {
      return invalidProjectIdResponse();
    }

    const refId = url.searchParams.get("refId");
    const rawPath = url.searchParams.get("path");

    if (!refId && !rawPath) {
      return errorJson("no-source", "Missing refId or path", 404);
    }

    const library = resolveLibrary(projectId, deps);

    let targetPath: string;
    if (refId) {
      const record = await library.findByRef({ source: "local", id: refId });
      if (!record) {
        return errorJson("no-source", "Track not found", 404);
      }
      targetPath = record.filePath;
    } else {
      targetPath = rawPath!;
    }

    const roots = library.listRoots();
    if (roots.length === 0) {
      return errorJson("permission-denied", "No roots configured", 403);
    }

    const realRoots: string[] = [];
    for (const r of roots) {
      try {
        realRoots.push(await fs.promises.realpath(r.path));
      } catch {
        realRoots.push(path.resolve(r.path));
      }
    }

    const isUnderAnyRoot = (testPath: string): boolean => {
      return realRoots.some((realRoot) => {
        const rel = path.relative(realRoot, testPath);
        return !rel.startsWith("..") && !path.isAbsolute(rel) && rel !== "";
      });
    };

    const resolvedPath = path.resolve(targetPath);

    let realFilePath: string;
    try {
      realFilePath = await fs.promises.realpath(resolvedPath);
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        if (!isUnderAnyRoot(resolvedPath)) {
          return errorJson(
            "permission-denied",
            "Path is not within allowed music roots",
            403,
          );
        }
        return errorJson("no-source", "File not found", 404);
      }
      return errorJson("permission-denied", "Cannot access file", 403);
    }

    if (!isUnderAnyRoot(realFilePath)) {
      return errorJson(
        "permission-denied",
        "Path is not within allowed music roots",
        403,
      );
    }

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(realFilePath);
    } catch {
      return errorJson("no-source", "File not found", 404);
    }

    if (!stat.isFile()) {
      return errorJson("no-source", "Target is not a file", 404);
    }

    const fileSize = stat.size;
    const contentType = getAudioContentType(realFilePath);
    const rangeHeader = req.headers.get("range") || req.headers.get("Range");

    if (rangeHeader) {
      const range = parseRangeHeader(rangeHeader, fileSize);
      if (!range) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const { start, end } = range;
      const chunkSize = end - start + 1;
      const stream = Bun.file(realFilePath).slice(start, end + 1).stream();

      return new Response(stream, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": String(chunkSize),
          "Accept-Ranges": "bytes",
        },
      });
    }

    const stream = Bun.file(realFilePath).stream();
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleDesktopLocalMusicSearchPost(
  req: Request,
  deps?: LocalMusicHandlerDeps,
): Promise<Response> {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorJson("bad-response", "缺少搜索关键词", 400);
    }

    if (!body || typeof body !== "object") {
      return invalidProjectIdResponse();
    }

    const { projectId } = body;
    if (!isValidProjectId(projectId)) {
      return invalidProjectIdResponse();
    }

    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    if (!keyword) {
      return errorJson("bad-response", "缺少搜索关键词", 400);
    }

    const limit = typeof body.limit === "number" ? body.limit : undefined;
    const offset = typeof body.offset === "number" ? body.offset : undefined;

    const library = resolveLibrary(projectId, deps);
    const searchResult = await library.search({ keyword, limit, offset });

    return json({
      ok: true,
      tracks: searchResult.tracks,
      total: searchResult.total,
      offset,
      limit,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
