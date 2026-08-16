import { toErrorMessage } from "core/errorMessage";

export type DesktopChromeConnectorStatus =
  | {
      ok: true;
      extensionId: string;
      extensionPath: string;
      nativeHost: {
        installed: boolean;
        manifestPath: string;
        wrapperPath: string;
        allowedOriginMatches: boolean;
        wrapperPathMatches: boolean;
      };
      rpc: {
        online: boolean;
        tabCount: number | null;
      };
      lastError?: string;
    }
  | {
      ok: false;
      error: string;
    };

export type DesktopChromeConnectorActionResult =
  | {
      ok: true;
      [key: string]: unknown;
    }
  | {
      ok: false;
      error: string;
      [key: string]: unknown;
    };

type ClientArgs = {
  fetchImpl?: typeof fetch;
};

async function parseActionResponse(response: Response, fallback: string): Promise<DesktopChromeConnectorActionResult> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : fallback,
      ...data,
    };
  }
  return { ok: true, ...data };
}

export async function fetchDesktopChromeConnectorStatus({
  fetchImpl = fetch,
}: ClientArgs = {}): Promise<DesktopChromeConnectorStatus> {
  try {
    const response = await fetchImpl("/api/desktop/chrome-connector/status", {
      method: "GET",
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      return {
        ok: false,
        error: typeof data?.error === "string" ? data.error : "Failed to load Chrome connector status",
      };
    }
    return data as DesktopChromeConnectorStatus;
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error),
    };
  }
}

export async function installDesktopChromeNativeHost({
  fetchImpl = fetch,
}: ClientArgs = {}): Promise<DesktopChromeConnectorActionResult> {
  try {
    return await parseActionResponse(
      await fetchImpl("/api/desktop/chrome-connector/install-native-host", {
        method: "POST",
      }),
      "Failed to install Chrome native host",
    );
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error),
    };
  }
}

export async function runDesktopChromeConnectorSmokeTest({
  fetchImpl = fetch,
}: ClientArgs = {}): Promise<DesktopChromeConnectorActionResult> {
  try {
    return await parseActionResponse(
      await fetchImpl("/api/desktop/chrome-connector/smoke-test", {
        method: "POST",
      }),
      "Failed to run Chrome connector smoke test",
    );
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error),
    };
  }
}
