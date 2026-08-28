import type { MachineHeartbeat } from "connector-experimental/protocol";
import { CORS_HEADERS, corsOptionsResponse } from "../sharedCors";
import { detectMachineInfo } from "connector-experimental/machineInfo";
import { toErrorMessage } from "core/errorMessage";
import { normalizeServerOrigin } from "core/serverOrigin";
import { asTrimmedString } from "core/trimmedString";
import { runMachineConnectCommand } from "../../cli/machineCommands";

type StartDeps = {
  runConnect?: typeof runMachineConnectCommand;
  machineInfo?: () => Pick<MachineHeartbeat, "machineId">;
};

let lastStartedKey = "";
let lastStartedMachineId = "";
let activeConnectorAbort: AbortController | null = null;
let activeConnectorPromise: Promise<number> | null = null;

function isLocalDesktopRuntime() {
  return process.env.NOLO_DESKTOP === "1";
}

export async function handleDesktopLocalConnectorStart(
  req: Request,
  deps: StartDeps = {}
) {
  if (!isLocalDesktopRuntime()) {
    return new Response(JSON.stringify({ error: "Desktop runtime only" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({})) as {
    serverUrl?: unknown;
    authToken?: unknown;
  };
  const serverUrl = normalizeServerOrigin(body.serverUrl);
  const authToken = asTrimmedString(body.authToken);
  if (!serverUrl || !authToken) {
    return new Response(JSON.stringify({ error: "serverUrl and authToken are required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const startKey = `${serverUrl}:${authToken.slice(-16)}`;
  if (startKey === lastStartedKey) {
    return new Response(JSON.stringify({
      ok: true,
      started: false,
      reason: "already-started",
      ...(lastStartedMachineId ? { machineId: lastStartedMachineId } : {}),
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const chunks: string[] = [];
  const machineId = (() => {
    try {
      return (deps.machineInfo ?? (() => detectMachineInfo({ probeLaunchable: true })))().machineId.trim();
    } catch {
      return "";
    }
  })();
  activeConnectorAbort?.abort("desktop-local-connector-replaced");
  const abortController = new AbortController();
  activeConnectorAbort = abortController;
  const runConnect = deps.runConnect ?? runMachineConnectCommand;
  const connectorPromise = runConnect(["--ws"], {
    env: {
      ...process.env,
      NOLO_SERVER: serverUrl,
      AUTH_TOKEN: authToken,
    },
    signal: abortController.signal,
    output: {
      write(chunk) {
        chunks.push(chunk);
      },
    },
  }).then((exitCode) => {
    if (activeConnectorPromise === connectorPromise) {
      activeConnectorPromise = null;
      activeConnectorAbort = null;
      lastStartedKey = "";
      lastStartedMachineId = "";
    }
    if (exitCode !== 0) {
      console.warn(
        `[desktop local connector] exited with code ${exitCode}: ${chunks.join("").trim()}`
      );
    }
    return exitCode;
  }).catch((error) => {
    if (activeConnectorPromise === connectorPromise) {
      activeConnectorPromise = null;
      activeConnectorAbort = null;
      lastStartedKey = "";
      lastStartedMachineId = "";
    }
    console.warn(
      `[desktop local connector] failed: ${toErrorMessage(error)}`
    );
    return 1;
  });

  activeConnectorPromise = connectorPromise;

  const startupResult = await Promise.race([
    connectorPromise.then((exitCode) => ({ settled: true as const, exitCode })),
    new Promise<{ settled: false }>((resolve) =>
      setTimeout(() => resolve({ settled: false }), 250)
    ),
  ]);

  if (startupResult.settled) {
    return new Response(JSON.stringify({
      ok: false,
      error: chunks.join("").trim() || `Connector exited before staying online with code ${startupResult.exitCode}`,
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  lastStartedKey = startKey;
  lastStartedMachineId = machineId;
  return new Response(JSON.stringify({
    ok: true,
    started: true,
    ...(machineId ? { machineId } : {}),
  }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function __resetDesktopLocalConnectorStartForTest() {
  activeConnectorAbort?.abort("test-reset");
  activeConnectorAbort = null;
  activeConnectorPromise = null;
  lastStartedKey = "";
  lastStartedMachineId = "";
}
