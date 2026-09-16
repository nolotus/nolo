import type {
  AgentRuntimeToolCallInput,
  AgentRuntimeToolResult,
} from "../agent-runtime";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { toErrorMessage } from "core/errorMessage";
import { isRecord } from "core/isRecord";

export type ChromeConnectorRequestPayload = Record<string, unknown>;

export type ChromeConnectorClient = {
  request(action: string, payload: ChromeConnectorRequestPayload): Promise<unknown>;
};

export type ChromeConnectorError = Error & {
  code?: string;
  details?: unknown;
};

export const NOLO_CHROME_CONNECTOR_EXTENSION_ID = "ahpdoopadkamnglhlacfjdfnonpjdplg";
export const NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION = "2";

function defaultTokenPath() {
  return resolve(
    process.env.HOME || "",
    "Library/Application Support/Nolo/ChromeConnector/token",
  );
}

function readConnectorToken(tokenPath = defaultTokenPath()) {
  if (process.env.NOLO_CHROME_CONNECTOR_TOKEN) return process.env.NOLO_CHROME_CONNECTOR_TOKEN;
  if (!existsSync(tokenPath)) return "";
  return readFileSync(tokenPath, "utf8").trim();
}

type NativeHostMessage = {
  id: string;
  action: string;
  payload: ChromeConnectorRequestPayload;
};

type NativeHostResponse = {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type NativeHostRouterDeps = {
  sendToExtension(message: NativeHostMessage): Promise<NativeHostResponse>;
  createId?: () => string;
};

const CHROME_TOOL_ACTIONS: Record<string, string> = {
  chrome_list_tabs: "list_tabs",
  chrome_open_tab: "open_tab",
  chrome_close_tab: "close_tab",
  chrome_read_page: "read_page",
  chrome_click: "click",
  chrome_type: "type",
  chrome_press: "press",
  chrome_scroll: "scroll",
  chrome_screenshot: "screenshot",
  chrome_read_console: "read_console",
  chrome_read_network: "read_network",
};

function createConnectorError(code: string, message: string, details?: unknown): ChromeConnectorError {
  const error = new Error(message) as ChromeConnectorError;
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function parseArguments(raw: string): ChromeConnectorRequestPayload {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (!isRecord(parsed)) {
      throw createConnectorError("INVALID_ARGUMENTS", "Chrome connector tool arguments must be a JSON object.");
    }
    return parsed as ChromeConnectorRequestPayload;
  } catch (error) {
    if ((error as ChromeConnectorError).code) throw error;
    throw createConnectorError("INVALID_ARGUMENTS", "Chrome connector tool arguments must be valid JSON.");
  }
}

function errorPayload(error: unknown) {
  return {
    code: (error as ChromeConnectorError)?.code ?? "CHROME_CONNECTOR_ERROR",
    message: toErrorMessage(error),
    ...((error as ChromeConnectorError)?.details !== undefined
      ? { details: (error as ChromeConnectorError).details }
      : {}),
  };
}

export function createNativeHostRouter(deps: NativeHostRouterDeps): ChromeConnectorClient {
  return {
    async request(action, payload) {
      const id = deps.createId?.() ?? crypto.randomUUID();
      const response = await deps.sendToExtension({ id, action, payload });
      if (response.id !== id) {
        throw createConnectorError(
          "NATIVE_HOST_RESPONSE_MISMATCH",
          `Chrome native host response id mismatch for ${action}.`,
          { expected: id, received: response.id },
        );
      }
      if (!response.ok) {
        throw createConnectorError(
          response.error?.code ?? "CHROME_EXTENSION_ERROR",
          response.error?.message ?? `Chrome extension failed action ${action}.`,
          response.error?.details,
        );
      }
      return response.result;
    },
  };
}

const TARGET_REQUIRED_ACTIONS = new Set(["click", "type"]);
const TAB_ID_REQUIRED_ACTIONS = new Set(["close_tab", "detach"]);

/**
 * Deterministic, connector-side guard for the two action styles. The extension re-checks the same
 * rule, so a model call never reaches the RPC endpoint (or the page) without a resolvable target.
 */
export function validateChromeConnectorPayload(
  action: string,
  payload: ChromeConnectorRequestPayload,
): void {
  if (TAB_ID_REQUIRED_ACTIONS.has(action)) {
    const raw = payload.tabId;
    const tabId = typeof raw === "string"
      ? raw.trim()
      : typeof raw === "number" && Number.isFinite(raw)
        ? String(raw)
        : "";
    if (!tabId) {
      throw createConnectorError(
        "TAB_ID_REQUIRED",
        `Provide the tabId from chrome_list_tabs before calling ${action}.`,
      );
    }
    return;
  }
  if (!TARGET_REQUIRED_ACTIONS.has(action)) return;
  const elementRef = typeof payload.elementRef === "string" ? payload.elementRef.trim() : "";
  const selector = typeof payload.selector === "string" ? payload.selector.trim() : "";
  if (elementRef || selector) return;
  throw createConnectorError(
    "ELEMENT_TARGET_REQUIRED",
    "Provide elementRef from chrome_read_page or a CSS selector.",
  );
}

export function createChromeConnectorClient(args?: {
  endpoint?: string;
  fetchImpl?: (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response>;
  request?: ChromeConnectorClient["request"];
  token?: string;
  tokenPath?: string;
}): ChromeConnectorClient {
  if (args?.request) return { request: args.request };
  const defaultPort = process.env.NOLO_CHROME_CONNECTOR_PORT || "38947";
  const endpoint =
    args?.endpoint ??
    process.env.NOLO_CHROME_CONNECTOR_RPC_URL ??
    `http://127.0.0.1:${defaultPort}/rpc`;
  const fetchImpl = args?.fetchImpl ?? fetch;
  const token = args?.token ?? readConnectorToken(args?.tokenPath);
  return {
    async request(action, payload) {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "X-Nolo-Chrome-Connector-Token": token } : {}),
          },
          body: JSON.stringify({ action, payload }),
        });
      } catch (error) {
        throw createConnectorError(
          "CHROME_CONNECTOR_UNAVAILABLE",
          `Chrome connector RPC endpoint is unavailable at ${endpoint}.`,
          { cause: toErrorMessage(error) },
        );
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        throw createConnectorError(
          typeof data?.error?.code === "string" ? data.error.code : "CHROME_CONNECTOR_RPC_ERROR",
          typeof data?.error?.message === "string"
            ? data.error.message
            : `Chrome connector RPC failed with HTTP ${response.status}.`,
          data?.error?.details,
        );
      }
      return data?.result;
    },
  };
}

export function createVerifiedChromeConnectorClient(args?: {
  client?: ChromeConnectorClient;
  expectedExtensionId?: string;
}): ChromeConnectorClient {
  const client = args?.client ?? createChromeConnectorClient();
  const expectedExtensionId = args?.expectedExtensionId ?? NOLO_CHROME_CONNECTOR_EXTENSION_ID;
  let verified: Promise<void> | null = null;

  const verify = async () => {
    const connectorInfo = await client.request("connector_info", {});
    const receivedExtensionId = (connectorInfo as { extensionId?: unknown })?.extensionId;
    if (receivedExtensionId !== expectedExtensionId) {
      throw createConnectorError(
        "CHROME_CONNECTOR_EXTENSION_MISMATCH",
        `Chrome connector extension id mismatch: expected ${expectedExtensionId}, received ${
          typeof receivedExtensionId === "string" ? receivedExtensionId : "unknown"
        }.`,
        { expectedExtensionId, receivedExtensionId },
      );
    }
    const receivedProtocolVersion = (connectorInfo as { protocolVersion?: unknown })?.protocolVersion;
    if (receivedProtocolVersion !== NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION) {
      throw createConnectorError(
        "CHROME_CONNECTOR_PROTOCOL_MISMATCH",
        `Chrome connector protocol mismatch: expected ${NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION}, received ${
          typeof receivedProtocolVersion === "string" ? receivedProtocolVersion : "unknown"
        }. Reload the Nolo Desktop Chrome Connector extension.`,
        {
          expectedProtocolVersion: NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION,
          receivedProtocolVersion,
        },
      );
    }
  };

  return {
    async request(action, payload) {
      verified ??= verify().catch((error) => {
        verified = null;
        throw error;
      });
      await verified;
      return client.request(action, payload);
    },
  };
}

export async function executeChromeConnectorTool(args: {
  client?: ChromeConnectorClient;
  call: AgentRuntimeToolCallInput;
}): Promise<AgentRuntimeToolResult> {
  const action = CHROME_TOOL_ACTIONS[args.call.name];
  if (!action) {
    return {
      content: JSON.stringify({
        ok: false,
        error: {
          code: "UNKNOWN_CHROME_TOOL",
          message: `Unknown Chrome connector tool: ${args.call.name}`,
        },
      }),
      metadata: {
        chromeConnector: true,
        error: true,
        code: "UNKNOWN_CHROME_TOOL",
      },
    };
  }

  try {
    const payload = parseArguments(args.call.arguments);
    validateChromeConnectorPayload(action, payload);
    const result = await (args.client ?? createChromeConnectorClient()).request(action, payload);
    return {
      content: JSON.stringify({ ok: true, result }),
      metadata: {
        chromeConnector: true,
        action,
      },
    };
  } catch (error) {
    const payload = errorPayload(error);
    return {
      content: JSON.stringify({ ok: false, error: payload }),
      metadata: {
        chromeConnector: true,
        error: true,
        code: payload.code,
      },
    };
  }
}

export const CHROME_CONNECTOR_TOOL_ACTIONS = { ...CHROME_TOOL_ACTIONS };
