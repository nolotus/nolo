import { normalizeServerOrigin } from "core/serverOrigin";
import { getDefaultProfileConfigPath } from "../client/profileConfig";
import { DEFAULT_NOLO_SERVER_URL } from "../defaultServer";
import { defaultOpenBrowser, saveTokenLogin } from "../authCommands";
import type { CliFetchImpl } from "../cliFetch";
import { t } from "./i18n";

/**
 * TUI 内登录（/login --server <url>）的 device-code 授权流。
 *
 * 复用 `nolo login` 的服务端契约（POST /api/v1/users/cli-login/start →
 * 浏览器授权 → POST /api/v1/users/cli-login/poll 拿 token）与
 * `saveTokenLogin` 的落地逻辑（写 profile + 本地记忆 rekey）。区别在于输出
 * 通道：saveTokenLogin / CLI 轮询输出走 console，会打穿 alternate screen，
 * 这里全部经由 `emit`（即 TUI 的 emitCommandOutput）写入 history 通道；
 * saveTokenLogin 用捕获 shim 喂 console 对象再转发。
 *
 * 成功后调用方（tuiSlashRouter）把返回的 token 热写进 options.env.AUTH_TOKEN：
 * 聊天分支每轮经 resolvePlatformAuthToken(options.env) 读取，即改即生效，
 * 无需重启 TUI。
 */

export type TuiLoginDeps = {
  /** 覆盖默认 fetch（测试注入假 server）。 */
  fetchImpl?: CliFetchImpl;
  /** 覆盖浏览器打开（测试记录 URL；返回 false 模拟打开失败）。 */
  openBrowser?: (url: string) => Promise<boolean> | boolean;
  /** 覆盖轮询间隔等待（测试即时返回）。 */
  sleep?: (ms: number) => Promise<void>;
  /** 覆盖时钟（测试推进时间）。 */
  now?: () => number;
  /** 覆盖 profile 落盘路径（测试传临时目录）。 */
  configPath?: string;
};

export type TuiLoginOutcome =
  | { status: "success"; token: string }
  | { status: "failed"; reason: string }
  | { status: "timeout" };

const postJson = async (
  fetchImpl: CliFetchImpl,
  url: string,
  body: Record<string, unknown>
) =>
  fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export function formatLoginDuration(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * 解析 /login 参数。MVP 只收 --server <url>；其余 flag 明确拒绝而不是静默
 * 忽略（尤其 --token / --manual：TUI 的 token 粘贴要走独立交互设计，这里
 * 不做半吊子支持，避免用户以为粘贴的 token 被处理了）。
 */
export function parseTuiLoginArgs(args: string[]):
  | { ok: true; serverUrl: string }
  | { ok: false; unsupported: string[] } {
  const unsupported: string[] = [];
  let serverUrl = "";
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--server") {
      serverUrl = (args[i + 1] ?? "").replace(/\/+$/, "");
      i++;
      continue;
    }
    if (arg?.startsWith("--server=")) {
      serverUrl = arg.slice("--server=".length).replace(/\/+$/, "");
      continue;
    }
    unsupported.push(arg ?? "");
  }
  if (!serverUrl) serverUrl = DEFAULT_NOLO_SERVER_URL;
  return unsupported.length > 0 ? { ok: false, unsupported } : { ok: true, serverUrl };
}

/**
 * 跑一次完整的 TUI 内浏览器授权登录。emit 接收所有用户可见输出（已本地化）。
 * 取消通过 handle.cancel()：正在 await 的 sleep 立刻被短路，轮询循环退出。
 */
export async function runTuiLogin(
  args: string[],
  emit: (text: string) => void,
  deps: TuiLoginDeps = {}
): Promise<TuiLoginOutcome> {
  const parsed = parseTuiLoginArgs(args);
  if (!parsed.ok) {
    emit(t("loginUsage", parsed.unsupported.join(" ")));
    return { status: "failed", reason: "unsupported-args" };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const openBrowser = deps.openBrowser ?? defaultOpenBrowser;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = deps.now ?? Date.now;
  const configPath = deps.configPath ?? getDefaultProfileConfigPath();
  const serverUrl = normalizeServerOrigin(parsed.serverUrl);

  // 取消语义未接 TUI 热键（当前 /login 期间 Ctrl+C 走 TUI 既有 turn-abort
  // 通道，不触达这里），轮询由服务端 expiresIn 兜底超时；将来接热键时再把
  // cancelled 标志挂进来。

  try {
    const startResponse = await postJson(
      fetchImpl,
      `${serverUrl}/api/v1/users/cli-login/start`,
      { clientName: "nolo-cli" }
    );
    const start = (await startResponse.json().catch(() => ({} as any))) as any;
    if (!startResponse.ok || !start?.deviceCode || !start?.verificationUriComplete) {
      const reason = `HTTP ${startResponse.status}`;
      emit(t("loginFailed", reason));
      return { status: "failed", reason };
    }

    emit(
      t("loginStarted", start.verificationUriComplete as string, start.userCode as string)
    );
    const opened = await openBrowser(start.verificationUriComplete as string);
    if (!opened) emit(t("loginBrowserFailed"));

    const intervalMs = Math.max(1, Number(start.interval) || 2) * 1000;
    const timeoutMs = Math.max(1, Number(start.expiresIn) || 600) * 1000;
    const deadline = now() + timeoutMs;
    const statusLogIntervalMs = 15_000;
    let lastStatusLogAt = 0;

    emit(t("loginWaiting", formatLoginDuration(timeoutMs)));

    while (now() <= deadline) {
      const pollResponse = await postJson(
        fetchImpl,
        `${serverUrl}/api/v1/users/cli-login/poll`,
        { deviceCode: start.deviceCode }
      );
      const poll = (await pollResponse.json().catch(() => ({} as any))) as any;

      if (pollResponse.status === 202) {
        const currentTime = now();
        if (
          lastStatusLogAt > 0 &&
          currentTime - lastStatusLogAt >= statusLogIntervalMs
        ) {
          const remainingMs = Math.max(0, deadline - currentTime);
          emit(t("loginStillWaiting", formatLoginDuration(remainingMs)));
          lastStatusLogAt = currentTime;
        } else if (lastStatusLogAt === 0) {
          lastStatusLogAt = currentTime;
        }
        await sleep(intervalMs);
        continue;
      }

      if (pollResponse.ok && poll?.token) {
        const approvedServer =
          typeof poll.serverUrl === "string" && poll.serverUrl.trim()
            ? normalizeServerOrigin(poll.serverUrl)
            : serverUrl;
        // saveTokenLogin 用 console.log/error 输出；在 TUI 里经由捕获 shim
        // 转发到 emit（history 通道），避免 raw write 打穿 alternate screen。
        // 记忆 rekey 的报错也转发（best-effort，不阻塞登录成功语义）。
        const exitCode = await saveTokenLogin({
          configPath,
          serverUrl: approvedServer,
          authToken: poll.token,
          output: { log: (message: string) => emit(String(message)) } as Pick<Console, "log">,
          error: { error: (message: string) => emit(String(message)) } as Pick<Console, "error">,
        });
        if (exitCode !== 0) {
          emit(t("loginFailed", `save profile exit ${exitCode}`));
          return { status: "failed", reason: "save-failed" };
        }
        emit(t("loginSuccess"));
        return { status: "success", token: poll.token as string };
      }

      const reason = poll?.error || `HTTP ${pollResponse.status}`;
      emit(t("loginFailed", String(reason)));
      return { status: "failed", reason: String(reason) };
    }

    emit(t("loginTimeout"));
    return { status: "timeout" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    emit(t("loginFailed", reason));
    return { status: "failed", reason };
  }
}
