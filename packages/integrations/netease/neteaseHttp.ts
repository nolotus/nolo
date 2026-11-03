import type {
  NeteaseClientOptions,
  NeteaseError,
  NeteaseErrorCode,
  NeteaseSession,
} from "./neteaseTypes";
import { eapiEncrypt, weapiEncrypt } from "./neteaseCrypto";

export type NeteaseHttp = {
  /** 走 weapi 的 POST（https://music.163.com/weapi/<path>） */
  weapi<T = unknown>(
    path: string,
    data: Record<string, unknown>,
    options?: { cookie?: string; signal?: AbortSignal },
  ): Promise<T>;
  /** 走 eapi 的 POST（完整 URL 或 /eapi/<path>） */
  eapi<T = unknown>(
    urlOrPath: string,
    data: Record<string, unknown>,
    options?: { cookie?: string; signal?: AbortSignal },
  ): Promise<T>;
  /** 明文 GET（https://music.163.com/api/...） */
  plainGet<T = unknown>(
    path: string,
    options?: { cookie?: string; signal?: AbortSignal },
  ): Promise<T>;
};

export class NeteaseHttpError extends Error implements NeteaseError {
  readonly code: NeteaseErrorCode;
  override readonly cause?: unknown;

  constructor(code: NeteaseErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "NeteaseError";
    this.code = code;
    this.cause = cause;
  }
}

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_TIMEOUT_MS = 10_000;
const RATE_LIMIT_INTERVAL_MS = 300;

function extractHost(urlStr: string): string {
  try {
    return new URL(urlStr).host;
  } catch {
    return "music.163.com";
  }
}

function sanitizeErrorMessage(msg: string): string {
  return msg
    .replace(/(?:cookie|token|secret|ticket|auth)=[^\s;&]+/gi, "[REDACTED]")
    .slice(0, 200);
}

function mapServerCodeToErrorCode(code: number): NeteaseErrorCode | null {
  if (code === 200 || code === 0) return null;
  if (code === 301) return "not-authenticated";
  if (code === 405) return "bad-response";
  if (code === 460 || code === -460) return "captcha-required";
  if (code === -110) return "rate-limited";
  return "unknown";
}

function mapHttpStatusToErrorCode(status: number): NeteaseErrorCode {
  if (status === 401 || status === 403) return "not-authenticated";
  if (status === 429) return "rate-limited";
  if (status === 408 || (status >= 500 && status < 600)) return "network";
  if (status >= 400 && status < 500) return "bad-response";
  return "network";
}

function getDefaultMessageForCode(code: NeteaseErrorCode, originalMsg?: string): string {
  if (originalMsg) {
    return sanitizeErrorMessage(originalMsg);
  }
  switch (code) {
    case "not-authenticated":
      return "需要登录后访问";
    case "bad-response":
      return "服务端响应格式异常";
    case "captcha-required":
      return "触发人机验证，请在网易云客户端完成验证后重试";
    case "rate-limited":
      return "请求过于频繁，请稍后重试";
    case "network":
      return "网络请求失败或超时";
    default:
      return "网易云音乐接口请求失败";
  }
}

export function createNeteaseHttp(
  options?: NeteaseClientOptions & { session?: NeteaseSession | null },
): NeteaseHttp {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const getTime = options?.now ?? (() => Date.now());
  const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
  const rateLimitEnabled = options?.rateLimit !== false;

  const lastRequestTimeByHost = new Map<string, number>();

  async function applyRateLimit(url: string): Promise<void> {
    if (!rateLimitEnabled) return;
    const host = extractHost(url);
    const now = getTime();
    const lastTime = lastRequestTimeByHost.get(host) ?? 0;
    const diff = now - lastTime;
    if (diff < RATE_LIMIT_INTERVAL_MS) {
      const waitTime = RATE_LIMIT_INTERVAL_MS - diff;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastRequestTimeByHost.set(host, getTime());
  }

  function resolveCookie(callCookie?: string): string {
    const parts: string[] = [];
    const currentSessionCookie = options?.session?.cookie;
    if (currentSessionCookie) {
      parts.push(currentSessionCookie);
    }
    if (callCookie) {
      parts.push(callCookie);
    }
    if (parts.length === 0) {
      return "os=pc; appver=2.9.7";
    }
    const merged = parts.join("; ");
    if (!merged.includes("os=")) {
      return `${merged}; os=pc; appver=2.9.7`;
    }
    return merged;
  }

  function buildCommonHeaders(callCookie?: string): Record<string, string> {
    return {
      "User-Agent": userAgent,
      Referer: "https://music.163.com/",
      Origin: "https://music.163.com",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      Cookie: resolveCookie(callCookie),
    };
  }

  async function executeFetch<T>(
    url: string,
    init: {
      method: "GET" | "POST";
      headers?: Record<string, string>;
      body?: string;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    await applyRateLimit(url);

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const externalSignal = init.signal;
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timer);
        throw new NeteaseHttpError("network", "请求已被取消");
      }
      externalSignal.addEventListener("abort", onExternalAbort);
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
      if (timedOut) {
        throw new NeteaseHttpError("network", "网络请求超时", err);
      }
      throw new NeteaseHttpError("network", "网络请求异常", err);
    } finally {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
    }

    if (!response.ok) {
      const errorCode = mapHttpStatusToErrorCode(response.status);
      throw new NeteaseHttpError(
        errorCode,
        `HTTP 请求失败，状态码: ${response.status}`,
      );
    }

    let text: string;
    try {
      text = await response.text();
    } catch (err: unknown) {
      throw new NeteaseHttpError("bad-response", "读取服务端响应失败", err);
    }

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch (err: unknown) {
      throw new NeteaseHttpError("bad-response", "响应内容不是合法 JSON", err);
    }

    if (json && typeof json.code === "number") {
      const errCode = mapServerCodeToErrorCode(json.code);
      if (errCode) {
        const msg = getDefaultMessageForCode(
          errCode,
          typeof json.message === "string"
            ? json.message
            : typeof json.msg === "string"
              ? json.msg
              : undefined,
        );
        throw new NeteaseHttpError(errCode, msg, json);
      }
    }

    return json as T;
  }

  return {
    async weapi<T = unknown>(
      path: string,
      data: Record<string, unknown>,
      callOptions?: { cookie?: string; signal?: AbortSignal },
    ): Promise<T> {
      const cleanPath = path.replace(/^\/+/, "").replace(/^weapi\/+/, "");
      const baseUrl = options?.baseUrl || "https://music.163.com";
      const targetUrl = `${baseUrl.replace(/\/+$/, "")}/weapi/${cleanPath}`;

      const encrypted = weapiEncrypt(data);
      const body = new URLSearchParams({
        params: encrypted.params,
        encSecKey: encrypted.encSecKey,
        encType: "weapi",
        sep: "encrypt",
      }).toString();

      const headers = {
        ...buildCommonHeaders(callOptions?.cookie),
        "Content-Type": "application/x-www-form-urlencoded",
      };

      return executeFetch<T>(targetUrl, {
        method: "POST",
        headers,
        body,
        signal: callOptions?.signal,
      });
    },

    async eapi<T = unknown>(
      urlOrPath: string,
      data: Record<string, unknown>,
      callOptions?: { cookie?: string; signal?: AbortSignal },
    ): Promise<T> {
      let targetUrl: string;
      if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
        targetUrl = urlOrPath;
      } else {
        const cleanPath = urlOrPath.replace(/^\/+/, "").replace(/^eapi\/+/, "");
        const baseUrl = options?.baseUrl || "https://interface.music.163.com";
        targetUrl = `${baseUrl.replace(/\/+$/, "")}/eapi/${cleanPath}`;
      }

      const encrypted = eapiEncrypt(data, targetUrl);
      const body = new URLSearchParams({
        params: encrypted.params,
        encSecKey: encrypted.encSecKey,
      }).toString();

      const headers = {
        ...buildCommonHeaders(callOptions?.cookie),
        "Content-Type": "application/x-www-form-urlencoded",
      };

      return executeFetch<T>(targetUrl, {
        method: "POST",
        headers,
        body,
        signal: callOptions?.signal,
      });
    },

    async plainGet<T = unknown>(
      path: string,
      callOptions?: { cookie?: string; signal?: AbortSignal },
    ): Promise<T> {
      let targetUrl: string;
      if (path.startsWith("http://") || path.startsWith("https://")) {
        targetUrl = path;
      } else {
        const cleanPath = path.replace(/^\/+/, "").replace(/^api\/+/, "");
        const baseUrl = options?.baseUrl || "https://music.163.com";
        targetUrl = `${baseUrl.replace(/\/+$/, "")}/api/${cleanPath}`;
      }

      const headers = buildCommonHeaders(callOptions?.cookie);
      return executeFetch<T>(targetUrl, {
        method: "GET",
        headers,
        signal: callOptions?.signal,
      });
    },
  };
}
