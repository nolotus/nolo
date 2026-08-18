import {
  API_ENDPOINTS
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/database/client/queryRequest.ts
var DEFAULT_QUERY_TIMEOUT_MS = 8e3;
var noloQueryRequest = async (queryConfig) => {
  const { server, queryUserId, authToken, options, timeoutMs } = queryConfig;
  const queryParams = new URLSearchParams({
    limit: options.limit?.toString() ?? ""
  });
  if (typeof options.since === "number" && options.since > 0) {
    queryParams.set("since", options.since.toString());
  }
  const url = `${API_ENDPOINTS.DATABASE}/query/${queryUserId}?${queryParams}`;
  const fullUrl = server + url;
  const headers = {
    "Content-Type": "application/json"
  };
  if (typeof authToken === "string" && authToken.trim().length > 0) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const body = JSON.stringify(options.condition);
  const effectiveTimeout = typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : timeoutMs === 0 ? void 0 : DEFAULT_QUERY_TIMEOUT_MS;
  if (effectiveTimeout === void 0) {
    return fetch(fullUrl, {
      method: "POST",
      headers,
      body
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);
  try {
    return await fetch(fullUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
};

export {
  noloQueryRequest
};
