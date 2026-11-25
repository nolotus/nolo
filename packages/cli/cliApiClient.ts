import {
  callApiProcedure,
  type ApiProcedureContract,
} from "desktop-runtime/apiContract";
import { resolveServerUrl } from "./cliEnvHelpers";
import { requireTokenUser } from "./docCommandShared";
import type { EnvLike } from "./cliEnvHelpers";
import { t } from "./tui/i18n";

/**
 * 通用 CLI→server JSON API 请求工具。
 * 兼容旧 `{ success: true }` 与标准 `ApiProcedure` `{ ok: true, data }` 双信封；
 * 新接口推荐直接调用强类型的 `cliCallProcedure`。
 */

export class CliApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface CliApiRequestArgs {
  serverUrl: string;
  authToken: string;
  path: string;
  method?: string;
  body?: Record<string, unknown> | null;
  query?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

/**
 * 发起一个带鉴权的 JSON API 请求，兼容 `{ success: true }` 与 `{ ok: true, data }`。
 * 失败或网络错误时抛 CliApiError。
 */
export async function cliApiRequest(args: CliApiRequestArgs): Promise<Record<string, unknown>> {
  const method = args.method ?? "POST";
  let url = `${args.serverUrl.replace(/\/$/, "")}${args.path}`;
  if (args.query) {
    const params = new URLSearchParams(args.query);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${args.authToken}`,
  };

  const init: RequestInit = { method, headers };
  if (args.body !== undefined && args.body !== null && method !== "GET") {
    init.body = JSON.stringify(args.body);
  }

  const fetchFn = args.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchFn(url, init);
  } catch (error) {
    throw new CliApiError(t("api.requestFailed", (error as Error).message), "NETWORK_ERROR", 0);
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new CliApiError(
      t("api.nonJsonResponse", String(response.status)),
      "INVALID_RESPONSE",
      response.status,
    );
  }

  const isSuccessEnvelope = data.success === true || data.ok === true;
  if (!response.ok || !isSuccessEnvelope) {
    const errorObj =
      typeof data.error === "object" && data.error !== null
        ? (data.error as Record<string, unknown>)
        : {};
    const message =
      (errorObj.message as string) ||
      (typeof data.error === "string" ? data.error : "") ||
      (data.message as string) ||
      t("api.requestFailedHttp", String(response.status));
    const code = (errorObj.code as string) || `HTTP_${response.status}`;
    throw new CliApiError(message, code, response.status);
  }

  return data;
}

/**
 * 强类型调用标准 `ApiProcedureContract`，直接返回经 Valibot 校验后的 `TOutput`，
 * 失败时统一抛出 `CliApiError`。
 */
export async function cliCallProcedure<TInput, TOutput>(
  contract: ApiProcedureContract<TInput, TOutput>,
  input: TInput,
  args: {
    serverUrl: string;
    authToken?: string;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  },
): Promise<TOutput> {
  const result = await callApiProcedure(contract, input, {
    baseUrl: args.serverUrl,
    ...(args.authToken ? { authToken: args.authToken } : {}),
    ...(args.signal ? { signal: args.signal } : {}),
    ...(args.fetchImpl ? { fetchImpl: args.fetchImpl } : {}),
  });
  if (!result.ok) {
    throw new CliApiError(result.error.message, result.error.code, result.error.status);
  }
  return result.data;
}

/**
 * 统一打印 CLI 命令的错误到 stderr。
 */
export function printCliError(error: unknown): void {
  if (error instanceof CliApiError) {
    process.stderr.write(`${t("api.errorWithCode", error.code, error.message)}\n`);
  } else if (error instanceof Error) {
    process.stderr.write(`${t("api.error", error.message)}\n`);
  } else {
    process.stderr.write(`${t("api.error", String(error))}\n`);
  }
}

/**
 * 从 args + env 解析出 { serverUrl, authToken, userId }。
 * 所有 CLI 命令共用的鉴权前置步骤。
 */
export function resolveCliContext(args: string[], env: EnvLike): {
  serverUrl: string;
  authToken: string;
  userId: string;
} {
  const serverUrl = resolveServerUrl(args, env);
  const { authToken, userId } = requireTokenUser(args, env, false);
  return { serverUrl, authToken, userId };
}