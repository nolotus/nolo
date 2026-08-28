import { toErrorMessage } from "core/errorMessage";
import { normalizeServerOrigin } from "core/serverOrigin";
import { asTrimmedString } from "core/trimmedString";

export type DesktopLocalConnectorStartStatus =
  | "started"
  | "already-started"
  | "skipped";

export type DesktopLocalConnectorStartResult = {
  ok: boolean;
  status: DesktopLocalConnectorStartStatus;
  machineId?: string;
  error?: string;
};

type StartDesktopLocalConnectorArgs = {
  serverUrl: string;
  authToken: string;
  fetchImpl?: typeof fetch;
};

const startedResults = new Map<string, DesktopLocalConnectorStartResult>();
const inFlightStarts = new Map<string, Promise<DesktopLocalConnectorStartResult>>();

function startKey(serverUrl: string, authToken: string) {
  return `${normalizeServerOrigin(serverUrl)}:${authToken.slice(-16)}`;
}

export async function startDesktopLocalConnectorFromSession({
  serverUrl,
  authToken,
  fetchImpl = fetch,
}: StartDesktopLocalConnectorArgs): Promise<DesktopLocalConnectorStartResult> {
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
      authToken: trimmedToken,
    }),
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to start desktop connector"
        );
      }
      const machineId = asTrimmedString(data?.machineId);
      if (machineId && typeof window !== "undefined") {
        (window as any).__NOLO_CURRENT_MACHINE_ID__ = machineId;
        (window as any).__NOLO_MACHINE_ID__ = machineId;
      }
      const result = {
        ok: true,
        status: data?.started === false ? "already-started" : "started",
        ...(machineId ? { machineId } : {}),
      } satisfies DesktopLocalConnectorStartResult;
      startedResults.set(key, result);
      return result;
    })
    .catch((error) => ({
      ok: false,
      status: "skipped" as const,
      error: toErrorMessage(error),
    }))
    .finally(() => {
      inFlightStarts.delete(key);
    });

  inFlightStarts.set(key, request);
  return request;
}

export function __resetDesktopLocalConnectorClientForTest() {
  startedResults.clear();
  inFlightStarts.clear();
}
