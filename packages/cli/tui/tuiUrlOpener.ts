/**
 * 用系统默认浏览器打开正文里的 http(s) URL（Ctrl+左键）。
 *
 * 安全边界（review 关注的四条）：
 * - 只接受 `http:` / `https:`，其它协议（`file:` / `javascript:` / `data:` …）一律拒绝；
 * - 拒绝含控制字符（NUL / 换行等）的 URL —— 参数注入与终端转义都由此挡住；
 * - 命令与参数分开放进数组交给 spawn，**从不拼接 shell 字符串**：
 *   URL 里的 `&`、`;`、`|`、空格、`$()` 都不会被解释成 shell 语法；
 * - 子进程 detached + stdio ignore + unref，不占用 TUI 的 stdin/stdout，也不阻塞事件循环。
 *
 * 这里只做纯判定与注入式 spawn，不做任何渲染层改动（不注入 OSC 8）。
 */
import { spawn as nodeSpawn } from "node:child_process";

export type UrlOpenCommand = {
  command: string;
  args: string[];
};

/** 注入点：测试用假的 spawn 断言 argv，不真的开浏览器。 */
export type UrlOpenerSpawn = (
  command: string,
  args: string[],
  options: { detached: true; stdio: "ignore" },
) => {
  unref?: () => void;
  on?: (event: string, listener: (error: unknown) => void) => void;
};

/** 超过这个长度的“URL”几乎必然是误匹配，拒绝打开（同时限制正则/opener 开销）。 */
export const MAX_URL_LENGTH = 2048;

/**
 * 校验并规范化待打开 URL：必须是可解析的绝对 http(s) URL，且不含控制字符。
 * 不合法返回 null（调用方据此拒绝打开）。
 */
export function normalizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_URL_LENGTH) return null;
  // 控制字符：换行/NUL/ESC —— 既会污染 argv，也可能被某些 opener 当成额外参数。
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.hostname.length === 0) return null;
  return trimmed;
}

/**
 * 解析平台 opener 命令（纯函数，便于测试）。
 * 命令行始终是 `[command, ...args]` 的数组形式，绝不返回 shell 字符串。
 */
export function resolveUrlOpenCommand(
  platform: NodeJS.Platform,
  url: string,
): UrlOpenCommand | null {
  if (normalizeHttpUrl(url) === null) return null;
  if (platform === "darwin") {
    return { command: "open", args: [url] };
  }
  if (platform === "win32") {
    // 不经 cmd.exe：URL 作为独立 argv 交给 FileProtocolHandler，无 shell 解析。
    return { command: "rundll32.exe", args: ["url.dll,FileProtocolHandler", url] };
  }
  return { command: "xdg-open", args: [url] };
}

/**
 * 用系统默认浏览器打开 URL。返回是否**已发出**打开请求（不代表浏览器一定起来了）。
 * 校验失败一律返回 false 且不 spawn。
 */
export function openExternalUrl(
  raw: string,
  options: {
    platform?: NodeJS.Platform;
    spawnImpl?: UrlOpenerSpawn;
    onError?: (message: string) => void;
  } = {},
): boolean {
  const url = normalizeHttpUrl(raw);
  if (url === null) return false;
  const resolved = resolveUrlOpenCommand(options.platform ?? process.platform, url);
  if (!resolved) return false;

  const spawnImpl = options.spawnImpl ?? (nodeSpawn as unknown as UrlOpenerSpawn);
  const report = (error: unknown): void => {
    try {
      options.onError?.(error instanceof Error ? error.message : String(error));
    } catch {
      /* 诊断回调永不抛出 */
    }
  };

  try {
    const child = spawnImpl(resolved.command, resolved.args, {
      detached: true,
      stdio: "ignore",
    });
    // ENOENT 等 spawn 失败是异步 error 事件：不监听会变成未捕获异常打崩 TUI。
    child.on?.("error", report);
    child.unref?.();
    return true;
  } catch (error) {
    report(error);
    return false;
  }
}
