import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  normalizeServerOrigin
} from "/public/assets/chunks/chunk-XJRNNKKF.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";

// packages/app/utils/desktopLocalConnectorClient.ts
var startedResults = /* @__PURE__ */ new Map();
var inFlightStarts = /* @__PURE__ */ new Map();
function startKey(serverUrl, authToken) {
  return `${normalizeServerOrigin(serverUrl)}:${authToken.slice(-16)}`;
}
async function startDesktopLocalConnectorFromSession({
  serverUrl,
  authToken,
  fetchImpl = fetch
}) {
  const normalizedServerUrl = normalizeServerOrigin(serverUrl);
  const trimmedToken = authToken.trim();
  if (!normalizedServerUrl || !trimmedToken) {
    return { ok: false, status: "skipped", error: "serverUrl and authToken are required" };
  }
  const key = startKey(normalizedServerUrl, trimmedToken);
  const startedResult = startedResults.get(key);
  if (startedResult) return { ...startedResult, status: "already-started" };
  const existing = inFlightStarts.get(key);
  if (existing) return existing;
  const request = fetchImpl("/api/desktop/local-connector/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serverUrl: normalizedServerUrl,
      authToken: trimmedToken
    })
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(
        typeof data?.error === "string" ? data.error : "Failed to start desktop connector"
      );
    }
    const machineId = asTrimmedString(data?.machineId);
    if (machineId && typeof window !== "undefined") {
      window.__NOLO_CURRENT_MACHINE_ID__ = machineId;
      window.__NOLO_MACHINE_ID__ = machineId;
    }
    const result = {
      ok: true,
      status: data?.started === false ? "already-started" : "started",
      ...machineId ? { machineId } : {}
    };
    startedResults.set(key, result);
    return result;
  }).catch((error) => ({
    ok: false,
    status: "skipped",
    error: toErrorMessage(error)
  })).finally(() => {
    inFlightStarts.delete(key);
  });
  inFlightStarts.set(key, request);
  return request;
}

export {
  startDesktopLocalConnectorFromSession
};
