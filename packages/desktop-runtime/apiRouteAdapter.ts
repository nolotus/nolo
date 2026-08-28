import { toErrorMessage } from "core/errorMessage";
import { safeParse } from "valibot";
import {
  createApiError,
  isApiError,
  serializeApiError,
  type ApiContext,
  type ApiMethod,
  type ApiProcedure,
} from "./apiContract";

const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const CORS_MAX_AGE = "86400";

const json = (payload: unknown, status: number, enableCors: boolean) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...(enableCors ? CORS_HEADERS : {}),
    },
  });

const nextRequestId = () =>
  `api-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function parseInput(req: Request, method: ApiMethod): Promise<unknown> {
  if (method === "GET") {
    return Object.fromEntries(new URL(req.url).searchParams);
  }

  try {
    return await req.json();
  } catch {
    throw createApiError({
      code: "invalid_input",
      message: "Request body must be valid JSON",
      status: 400,
    });
  }
}

function contextFromRequest(req: Request): ApiContext {
  const authHeader = req.headers.get("authorization") || undefined;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : authHeader;
  return {
    requestId: req.headers.get("x-request-id") || nextRequestId(),
    ...(token ? { token } : {}),
  };
}

function normalizedError(error: unknown) {
  if (isApiError(error)) return error;
  return createApiError({
    code: "internal",
    message: toErrorMessage(error),
    status: 500,
  });
}

export type ApiRouteEntry = Partial<Record<ApiMethod, ApiLegacyRouteHandler>> & {
  OPTIONS?: () => Response;
};

export function createApiRoute<TInput, TOutput>(
  procedure: ApiProcedure<TInput, TOutput>,
  options: { enableCors?: boolean } = {}
): ApiRouteEntry {
  const enableCors = options.enableCors ?? true;
  const handler = async (req: Request): Promise<Response> => {
    try {
      const rawInput = await parseInput(req, procedure.method);
      const input = safeParse(procedure.input, rawInput);
      if (!input.success) {
        const error = createApiError({
          code: "invalid_input",
          message: "Request input failed validation",
          status: 400,
          details: { issues: input.issues },
        });
        return json(
          { ok: false, error: serializeApiError(error) },
          error.status,
          enableCors
        );
      }

      const result = await procedure.handler({
        input: input.output,
        context: contextFromRequest(req),
        request: req,
      });

      if (!result.ok) {
        return json(
          { ok: false, error: serializeApiError(result.error) },
          result.error.status,
          enableCors
        );
      }

      const output = safeParse(procedure.output, result.data);
      if (!output.success) {
        const error = createApiError({
          code: "invalid_output",
          message: "Handler output failed validation",
          status: 500,
          details: { issues: output.issues },
        });
        return json(
          { ok: false, error: serializeApiError(error) },
          error.status,
          enableCors
        );
      }

      return json({ ok: true, data: output.output }, 200, enableCors);
    } catch (error) {
      const apiError = normalizedError(error);
      return json(
        { ok: false, error: serializeApiError(apiError) },
        apiError.status,
        enableCors
      );
    }
  };

  return {
    [procedure.method]: handler,
    OPTIONS: () =>
      new Response(null, {
        status: 204,
        headers: {
          ...(enableCors ? CORS_HEADERS : {}),
          "Access-Control-Allow-Methods": `${procedure.method}, OPTIONS`,
          "Access-Control-Max-Age": CORS_MAX_AGE,
        },
      }),
  };
}

export type ApiLegacyRouteHandler = (
  req: Request
) => Response | Promise<Response>;

export interface ApiLegacyRouteConfig {
  path: string;
  handlers: Partial<Record<ApiMethod, ApiLegacyRouteHandler>>;
  allowedMethods?: ApiMethod[];
  corsHeaders?: Record<string, string>;
  enableCors?: boolean;
  wrapCorsResponses?: boolean;
}

const withCorsResponseHeaders = (
  handler: ApiLegacyRouteHandler,
  corsHeaders: Record<string, string>
): ApiLegacyRouteHandler => {
  return async (req: Request) => {
    const response = await handler(req);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
};

export function createApiRouteFamily(
  configs: ApiLegacyRouteConfig[]
): Record<string, ApiRouteEntry> {
  return Object.fromEntries(
    configs.map((config) => {
      const enableCors = config.enableCors ?? true;
      const corsHeaders = config.corsHeaders ?? CORS_HEADERS;
      const handlers = config.wrapCorsResponses
        ? Object.fromEntries(
            Object.entries(config.handlers).map(([method, handler]) => [
              method,
              handler
                ? withCorsResponseHeaders(handler, corsHeaders)
                : handler,
            ])
          )
        : config.handlers;
      const methods = config.allowedMethods ?? [
        ...(Object.keys(config.handlers) as ApiMethod[]),
        "OPTIONS",
      ];
      return [
        config.path,
        {
          ...handlers,
          OPTIONS: () =>
            new Response(null, {
              status: 204,
              headers: {
                ...(enableCors ? corsHeaders : {}),
                "Access-Control-Allow-Methods": methods.join(", "),
                "Access-Control-Max-Age":
                  corsHeaders["Access-Control-Max-Age"] ?? CORS_MAX_AGE,
              },
            }),
        },
      ];
    })
  );
}
