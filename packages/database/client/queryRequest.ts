import { API_ENDPOINTS } from "database/config";

export type NoloQueryRequestConfig = {
  server: string;
  queryUserId: string;
  authToken?: string | null;
  options: {
    limit?: number;
    condition: Record<string, unknown>;
    /** Incremental sync cursor (epoch ms). Only records updated after this
     * timestamp are returned. Omitted → full query. */
    since?: number;
  };
  /** 请求超时毫秒；默认 8000。传 0 禁用。 */
  timeoutMs?: number;
};

const DEFAULT_QUERY_TIMEOUT_MS = 8000;

export const noloQueryRequest = async (queryConfig: NoloQueryRequestConfig) => {
  const { server, queryUserId, authToken, options, timeoutMs } = queryConfig;

  const queryParams = new URLSearchParams({
    limit: options.limit?.toString() ?? "",
  });
  if (typeof options.since === "number" && options.since > 0) {
    queryParams.set("since", options.since.toString());
  }
  const url = `${API_ENDPOINTS.DATABASE}/query/${queryUserId}?${queryParams}`;
  const fullUrl = server + url;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof authToken === "string" && authToken.trim().length > 0) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const body = JSON.stringify(options.condition);
  const effectiveTimeout =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? timeoutMs
      : timeoutMs === 0
        ? undefined
        : DEFAULT_QUERY_TIMEOUT_MS;
  if (effectiveTimeout === undefined) {
    return fetch(fullUrl, {
      method: "POST",
      headers,
      body,
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);
  try {
    return await fetch(fullUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};
