import { safeParse, type BaseIssue, type BaseSchema } from "valibot";

export type ApiMethod =
  | "GET"
  | "POST"
  | "PATCH"
  | "PUT"
  | "DELETE"
  | "HEAD"
  | "QUERY"
  | "OPTIONS";

export type ApiErrorCode =
  | "invalid_input"
  | "invalid_output"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "internal";

export interface ApiErrorShape {
  code: ApiErrorCode;
  message: string;
  status: number;
  details?: unknown;
}

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: unknown;

  constructor(args: ApiErrorShape) {
    super(args.message);
    this.name = "ApiError";
    this.code = args.code;
    this.status = args.status;
    this.details = args.details;
  }
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type ApiWireEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorShape };

export type ApiAuthMode = "none" | "optional" | "required";

export interface ApiContext {
  requestId: string;
  token?: string;
  userId?: string;
}

export interface ApiHandlerArgs<TInput> {
  input: TInput;
  context: ApiContext;
  request?: Request;
}

export interface ApiProcedureContract<TInput, TOutput> {
  method: ApiMethod;
  path: string;
  auth?: ApiAuthMode;
  input: BaseSchema<unknown, TInput, BaseIssue<unknown>>;
  output: BaseSchema<unknown, TOutput, BaseIssue<unknown>>;
}

export interface ApiProcedure<TInput, TOutput>
  extends ApiProcedureContract<TInput, TOutput> {
  handler(args: ApiHandlerArgs<TInput>): Promise<ApiResult<TOutput>> | ApiResult<TOutput>;
}

export function createApiError(args: ApiErrorShape): ApiError {
  return new ApiError(args);
}

/**
 * Shared pure HTTP status → ApiErrorCode mapper.
 *
 * Auth error response builders (and similar API envelopes) map common client
 * statuses onto the contract code vocabulary. Keep one definition so
 * 400/401/403/404/409 classification cannot drift across adapters.
 */
export function apiErrorCodeFromStatus(status: number): ApiErrorCode {
  if (status === 400) return "invalid_input";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  return "internal";
}

/**
 * Shared pure ApiErrorCode → HTTP status mapper (inverse of
 * `apiErrorCodeFromStatus` for the common client codes).
 *
 * RPC dispatch and email inbound webhooks translate contract error codes into
 * response statuses. Keep one definition so unauthorized/forbidden/not_found/
 * invalid_input → 401/403/404/400 cannot drift; unknown codes become 500.
 */
export function apiStatusFromErrorCode(code: string): number {
  if (code === "unauthorized") return 401;
  if (code === "forbidden") return 403;
  if (code === "not_found") return 404;
  if (code === "invalid_input") return 400;
  return 500;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function apiOk<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function apiErr(error: ApiError): ApiResult<never> {
  return { ok: false, error };
}

/** Legacy aliases preserved for `desktop-runtime/index.ts` re-exports. */
export const apiSuccess = apiOk;
export const apiError = apiErr;

export function serializeApiError(error: ApiError): ApiErrorShape {
  return {
    code: error.code,
    message: error.message,
    status: error.status,
    ...(error.details !== undefined ? { details: error.details } : {}),
  };
}

export function defineApiContract<TInput, TOutput>(
  contract: ApiProcedureContract<TInput, TOutput>,
): ApiProcedureContract<TInput, TOutput> {
  return contract;
}

export function defineApiProcedure<TInput, TOutput>(
  procedure: ApiProcedure<TInput, TOutput>
): ApiProcedure<TInput, TOutput> {
  return procedure;
}

export function implementApiContract<TInput, TOutput>(
  contract: ApiProcedureContract<TInput, TOutput>,
  handler: ApiProcedure<TInput, TOutput>["handler"],
): ApiProcedure<TInput, TOutput> {
  return { ...contract, handler };
}

const DEFAULT_AUTH_COOKIE_NAME = "nolo_auth_token";

/**
 * Pure request token extractor supporting both `Authorization: Bearer <token>`
 * and the web `nolo_auth_token` cookie (matching `auth/server/token.ts`
 * precedence without pulling private `auth` imports into public packages).
 */
export function extractApiAuthToken(
  headers: { get(name: string): string | null | undefined },
  cookieName: string = DEFAULT_AUTH_COOKIE_NAME,
): string | undefined {
  const authHeader =
    headers.get("authorization") ?? headers.get("Authorization") ?? "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;

  const cookieHeader = headers.get("cookie") ?? headers.get("Cookie") ?? "";
  const prefix = `${cookieName}=`;
  const rawCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!rawCookie) return undefined;
  try {
    const decoded = decodeURIComponent(rawCookie).trim();
    return decoded || undefined;
  } catch {
    return undefined;
  }
}

export interface CallApiProcedureOptions {
  baseUrl: string;
  authToken?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

/**
 * Lightweight, zero-dependency typed client for any `ApiProcedureContract`.
 * Validates input before sending, normalizes `{ ok, data/error }` envelopes,
 * and validates output with Valibot so Web, Desktop, RN, and CLI share one
 * exact contract without introducing an external RPC library.
 */
export async function callApiProcedure<TInput, TOutput>(
  contract: ApiProcedureContract<TInput, TOutput>,
  input: TInput,
  options: CallApiProcedureOptions,
): Promise<ApiResult<TOutput>> {
  const parsedInput = safeParse(contract.input, input);
  if (!parsedInput.success) {
    return apiErr(
      createApiError({
        code: "invalid_input",
        message: "Client input failed contract validation",
        status: 400,
        details: { issues: parsedInput.issues },
      }),
    );
  }

  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const base = options.baseUrl.replace(/\/$/, "");
  let url = `${base}${contract.path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
    ...(options.headers ?? {}),
  };

  const init: RequestInit = {
    method: contract.method,
    headers,
    ...(options.signal ? { signal: options.signal } : {}),
  };

  if (contract.method === "GET" || contract.method === "HEAD") {
    const params = new URLSearchParams();
    if (parsedInput.output && typeof parsedInput.output === "object") {
      for (const [key, value] of Object.entries(
        parsedInput.output as Record<string, unknown>,
      )) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      }
    }
    const qs = params.toString();
    if (qs) url += `${url.includes("?") ? "&" : "?"}${qs}`;
  } else {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(parsedInput.output);
  }

  let response: Response;
  try {
    response = await fetchFn(url, init);
  } catch (error) {
    return apiErr(
      createApiError({
        code: "internal",
        message: error instanceof Error ? error.message : String(error),
        status: 0,
      }),
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return apiErr(
      createApiError({
        code: apiErrorCodeFromStatus(response.status),
        message: `Non-JSON response (HTTP ${response.status})`,
        status: response.status,
      }),
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as { ok?: unknown }).ok !== "boolean"
  ) {
    return apiErr(
      createApiError({
        code: response.ok ? "invalid_output" : apiErrorCodeFromStatus(response.status),
        message: `Unexpected API envelope (HTTP ${response.status})`,
        status: response.status,
      }),
    );
  }

  const envelope = payload as ApiWireEnvelope<unknown>;
  if (!envelope.ok) {
    const err = envelope.error;
    return apiErr(
      createApiError({
        code: typeof err?.code === "string" ? err.code : apiErrorCodeFromStatus(response.status),
        message: typeof err?.message === "string" ? err.message : `HTTP ${response.status}`,
        status: typeof err?.status === "number" ? err.status : response.status,
        ...(err?.details !== undefined ? { details: err.details } : {}),
      }),
    );
  }

  const parsedOutput = safeParse(contract.output, envelope.data);
  if (!parsedOutput.success) {
    return apiErr(
      createApiError({
        code: "invalid_output",
        message: "Server response failed contract output validation",
        status: response.status,
        details: { issues: parsedOutput.issues },
      }),
    );
  }

  return apiOk(parsedOutput.output);
}
