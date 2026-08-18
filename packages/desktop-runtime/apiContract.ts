import { safeParse, type BaseIssue, type BaseSchema } from "valibot";

export type ApiMethod =
  | "GET"
  | "POST"
  | "PATCH"
  | "PUT"
  | "DELETE"
  | "HEAD"
  | "QUERY";

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

export interface ApiProcedure<TInput, TOutput> {
  method: ApiMethod;
  path: string;
  input: BaseSchema<unknown, TInput, BaseIssue<unknown>>;
  output: BaseSchema<unknown, TOutput, BaseIssue<unknown>>;
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
 * 400/401/403/404 classification cannot drift across adapters.
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

export function serializeApiError(error: ApiError): ApiErrorShape {
  return {
    code: error.code,
    message: error.message,
    status: error.status,
    ...(error.details !== undefined ? { details: error.details } : {}),
  };
}

export function defineApiProcedure<TInput, TOutput>(
  procedure: ApiProcedure<TInput, TOutput>
): ApiProcedure<TInput, TOutput> {
  return procedure;
}
