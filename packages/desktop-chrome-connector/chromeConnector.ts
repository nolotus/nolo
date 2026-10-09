import type {
  AgentRuntimeToolCallInput,
  AgentRuntimeToolResult,
} from "../agent-runtime";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { toErrorMessage } from "core/errorMessage";
import { isRecord } from "core/isRecord";
import {
  UploadSecurityError,
  logUploadAudit,
  validateUploadFiles,
} from "./uploadSecurity";

export type ChromeConnectorRequestPayload = Record<string, unknown>;

export type ChromeConnectorClient = {
  request(action: string, payload: ChromeConnectorRequestPayload): Promise<unknown>;
};

export type ChromeConnectorError = Error & {
  code?: string;
  details?: unknown;
};

export const NOLO_CHROME_CONNECTOR_EXTENSION_ID = "ahpdoopadkamnglhlacfjdfnonpjdplg";
/**
 * The Gecko id the Firefox (AMO) build reports in `connector_info.extensionId` — it is fixed by
 * `browser_specific_settings.gecko.id` in the packaged manifest, not by the Chrome key, so it is a
 * different wire value even though both builds are the same trusted connector. Kept in sync with
 * `FIREFOX_EXTENSION_ID` in `nativeHostInstall.mjs` (a test asserts it).
 */
export const NOLO_FIREFOX_CONNECTOR_EXTENSION_ID = "nolo-browser-connector@nolo.chat";
/**
 * Extension ids the desktop client accepts during the handshake: the Chrome store id and the Firefox
 * Gecko id. Either build is a first-class connector; matching any of them means "the Nolo connector".
 */
export const NOLO_CONNECTOR_EXTENSION_IDS: readonly string[] = [
  NOLO_CHROME_CONNECTOR_EXTENSION_ID,
  NOLO_FIREFOX_CONNECTOR_EXTENSION_ID,
];
export const NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION = "2";

/** Connector builds the RPC layer can route to independently. */
export type ConnectorBrowserTarget = "chrome" | "firefox";

/** Default RPC ports: Chrome keeps 38947 (the long-standing contract); Firefox gets its own. */
export const NOLO_CHROME_CONNECTOR_DEFAULT_PORTS: Record<ConnectorBrowserTarget, number> = {
  chrome: 38947,
  firefox: 38948,
};

/** Extension id each build reports in `connector_info`; used to refuse a misrouted connection. */
export const CONNECTOR_BROWSER_EXTENSION_IDS: Record<ConnectorBrowserTarget, string> = {
  chrome: NOLO_CHROME_CONNECTOR_EXTENSION_ID,
  firefox: NOLO_FIREFOX_CONNECTOR_EXTENSION_ID,
};

/**
 * Which env var overrides which browser's endpoint.
 *
 * `NOLO_CHROME_CONNECTOR_RPC_URL` stays the single-endpoint override for both browsers (explicit
 * opt-in: whoever sets it takes responsibility for routing, e.g. a proxy that already splits
 * Chrome vs Firefox upstream).
 *
 * `NOLO_CHROME_CONNECTOR_PORT` is the Chrome override only and is never applied to the Firefox
 * endpoint: setting it (e.g. for a Chrome dev host) must not silently reroute Firefox calls onto
 * Chrome's port. The Firefox endpoint is `NOLO_FIREFOX_CONNECTOR_PORT`, falling back to the
 * Firefox default. `connectorPortForBrowser` in `nativeHostInstall.mjs` resolves the *install-time*
 * wrapper port with the same rule.
 */
function connectorEndpointForBrowser(
  browser: ConnectorBrowserTarget,
  env: Record<string, string | undefined> = process.env,
): string {
  const explicitUrl = env.NOLO_CHROME_CONNECTOR_RPC_URL;
  if (explicitUrl) return explicitUrl;
  const port =
    browser === "firefox"
      ? env.NOLO_FIREFOX_CONNECTOR_PORT
      : env.NOLO_CHROME_CONNECTOR_PORT;
  return `http://127.0.0.1:${port || NOLO_CHROME_CONNECTOR_DEFAULT_PORTS[browser]}/rpc`;
}

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
  browser_list_tabs: "list_tabs",
  browser_open_tab: "open_tab",
  browser_close_tab: "close_tab",
  browser_read_page: "read_page",
  browser_click_element: "click",
  browser_type: "type",
  browser_press: "press",
  browser_scroll: "scroll",
  browser_screenshot: "screenshot",
  browser_read_console: "read_console",
  browser_read_network: "read_network",
  // Legacy aliases (kept for existing agents/tests).
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
  chrome_set_files: "set_files",
  chrome_upload_file: "set_files",
  chrome_upload: "set_files",
};

// Mirror the upload trio (outside the 11 exposed tool names) into the browser_ family from its
// legacy entries, so the two halves cannot drift.
for (const legacyName of ["chrome_set_files", "chrome_upload_file", "chrome_upload"]) {
  const action = CHROME_TOOL_ACTIONS[legacyName];
  if (action) {
    CHROME_TOOL_ACTIONS[`browser_${legacyName.slice("chrome_".length)}`] = action;
  }
}

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
  const code = (error as ChromeConnectorError)?.code ?? "CHROME_CONNECTOR_ERROR";
  return {
    code,
    message: toErrorMessage(error),
    ...(code === "CHROME_CONNECTOR_UNAVAILABLE"
      ? {
          hint:
            "The Nolo Browser Connector is not reachable. It runs inside the user's own Chrome " +
            "or Firefox — ask the user to open their browser with the Nolo Browser Connector " +
            "extension enabled, or install it from https://nolo.chat/downloads (Firefox can " +
            "install the signed .xpi directly), then retry.",
        }
      : {}),
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

const TARGET_REQUIRED_ACTIONS = new Set(["click", "type", "set_files"]);
const TAB_ID_REQUIRED_ACTIONS = new Set(["close_tab", "detach", "set_files"]);

/**
 * Deterministic, connector-side guard for the action styles. The extension re-checks the same
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
        `Provide the tabId from browser_list_tabs before calling ${action}.`,
      );
    }
    if (!TARGET_REQUIRED_ACTIONS.has(action)) return;
  }
  if (!TARGET_REQUIRED_ACTIONS.has(action)) return;
  const rawRef =
    typeof payload.elementRef === "string"
      ? payload.elementRef
      : typeof payload.ref === "string"
        ? payload.ref
        : "";
  const elementRef = rawRef.trim();
  const selector = typeof payload.selector === "string" ? payload.selector.trim() : "";
  if (!elementRef && !selector) {
    throw createConnectorError(
      "ELEMENT_TARGET_REQUIRED",
      "Provide elementRef from browser_read_page or a CSS selector.",
    );
  }
  if (action === "set_files") {
    if (!Array.isArray(payload.files) || payload.files.length === 0) {
      throw createConnectorError(
        "no_files",
        "Provide at least one file path in files array.",
      );
    }
    try {
      const validated = validateUploadFiles({
        files: payload.files as string[],
        env: process.env,
      });
      payload.files = validated.files;
      const targetStr = elementRef ? `ref:${elementRef}` : `selector:${selector}`;
      logUploadAudit({
        tabId: String(payload.tabId),
        target: targetStr,
        files: validated.fileStats,
      });
    } catch (err) {
      const code = (err as UploadSecurityError)?.code ?? "path_not_allowed";
      throw createConnectorError(code, toErrorMessage(err));
    }
  }
}

export function createChromeConnectorClient(args?: {
  /** Which browser's native host to reach; defaults to Chrome (legacy single-endpoint behavior). */
  browser?: ConnectorBrowserTarget;
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
  const browser = args?.browser ?? "chrome";
  const endpoint =
    args?.endpoint ?? connectorEndpointForBrowser(browser);
  const fetchImpl = args?.fetchImpl ?? fetch;
  const token = args?.token ?? readConnectorToken(args?.tokenPath);
  return {
    async request(action, payload) {
      validateChromeConnectorPayload(action, payload);
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

/**
 * Which capabilities each connector action needs. This mirrors the extension's own map in
 * `extension/compactObservation.js`; the runtime keeps its copy so app code never imports extension
 * sources at typecheck time, and a drift test asserts both sides agree.
 *
 * The runtime deliberately requires **more** for the clicking actions: `action_gate` is what stops an
 * irreversible action before it happens, so an extension that cannot refuse one must not be allowed to
 * click at all — even though it might otherwise claim full observation support.
 */
export const REQUIRED_CHROME_CONNECTOR_FEATURES: Record<string, string[]> = {
  list_tabs: ["tabs"],
  open_tab: ["tabs"],
  close_tab: ["tabs"],
  read_page: ["compact_observation_v2"],
  click: ["compact_observation_v2", "action_gate"],
  type: ["compact_observation_v2", "action_gate"],
  press: ["compact_observation_v2", "action_gate"],
  scroll: ["compact_observation_v2"],
  // Both browsers advertise the dedicated `screenshot` feature: Chrome serves it through
  // Page.captureScreenshot (browser_debug-adjacent) while Firefox falls back to
  // tabs.captureVisibleTab, so gating on browser_debug would wrongly refuse Firefox.
  screenshot: ["screenshot"],
  read_console: ["browser_debug"],
  read_network: ["browser_debug"],
  detach: ["browser_debug"],
  set_files: ["compact_observation_v2", "file_upload"],
};

/** Features the runtime requires for an action; empty when the action needs none. */
export function requiredFeaturesForConnectorAction(action: string): string[] {
  return [...(REQUIRED_CHROME_CONNECTOR_FEATURES[action] ?? [])];
}

export type VerifiedChromeConnectorClient = ChromeConnectorClient & {
  /** Feature names the installed extension advertised; populated after the handshake (first request). */
  features(): string[];
};

/**
 * Which connector client a call's browser `target` must go through. `undefined` = follow the host's
 * ambient default (no `target` arg — the historical single-endpoint behaviour); `"chrome"` /
 * `"firefox"` = the call explicitly named a browser and must hit that build.
 */
export type ChromeConnectorClientSelector = ConnectorBrowserTarget | undefined;

/**
 * The per-call client contract between `executeChromeConnectorTool` and its hosts
 * (`buildCliChromeConnectorToolExecutors`, `buildDesktopChromeConnectorToolExecutors`).
 *
 * The builders hold a *map* of per-browser verified clients (lazily created, one handshake per
 * browser) and hand back the entry matching the call's `target`. This is the hook that makes
 * `target` real routing in production: the builders can no longer pin every call to one
 * pre-resolved Chrome client. Test doubles can return the same stub for every selector; production
 * must return distinct endpoint-bound clients.
 */
export type ChromeConnectorClientResolver = (
  selector: ChromeConnectorClientSelector,
) => ChromeConnectorClient;

/**
 * Builds the resolver the CLI/desktop tool tables share: lazily creates one verified client per
 * browser target (identity-pinned via `expectedBrowser`, so a host answering for the wrong browser
 * is refused *before* the action runs) plus one verified default client for target-less calls —
 * same handshake as the per-target clients but unpinned, accepting either known connector id
 * because the ambient endpoint cannot be attributed to a single browser ahead of time. `clients`
 * overrides entries individually — a test can inject a fake per browser without the other side
 * reaching the network; per-target overrides are *still* wrapped in `expectedBrowser` verification
 * so a misrouted injected stub cannot fake a match. `clients.default` is used as-is (callers wrap
 * their injection in `createVerifiedChromeConnectorClient` when they want the gate).
 */
export function createChromeConnectorClientResolver(args?: {
  clients?: Partial<Record<ConnectorBrowserTarget, ChromeConnectorClient>> & {
    /**
     * Default (no `target`) client; defaults to a verified client over the ambient endpoint.
     * Overrides are used verbatim — wrap them in `createVerifiedChromeConnectorClient` to keep the
     * handshake/feature gate, like the builders do.
     */
    default?: ChromeConnectorClient;
  };
}): ChromeConnectorClientResolver {
  const cache = new Map<ChromeConnectorClientSelector, ChromeConnectorClient>();
  const overrides = args?.clients;
  const resolve = (selector: ChromeConnectorClientSelector): ChromeConnectorClient => {
    const existing = cache.get(selector);
    if (existing) return existing;
    let client: ChromeConnectorClient;
    if (selector === "chrome" || selector === "firefox") {
      // The per-target client is always identity-pinned — whether it came from the endpoint factory
      // or a test override — because the pin is what proves an explicit `target` reached its build.
      const inner =
        overrides?.[selector] ?? createChromeConnectorClient({ browser: selector });
      client = createVerifiedChromeConnectorClient({
        client: inner,
        expectedBrowser: selector,
      });
    } else {
      // Ambient default is verified too — unpinned (either known connector id fits) but still
      // enforcing identity/protocol/features so a stale or foreign endpoint is refused before an
      // irreversible action, exactly like the pre-routing single-endpoint client.
      client =
        overrides?.default ??
        createVerifiedChromeConnectorClient({ client: createChromeConnectorClient() });
    }
    cache.set(selector, client);
    return client;
  };
  return resolve;
}

export function createVerifiedChromeConnectorClient(args?: {
  client?: ChromeConnectorClient;
  /** Single-id override kept for older callers; prefer `expectedExtensionIds`. */
  expectedExtensionId?: string;
  /** Ids the handshake accepts; defaults to every known Nolo connector build (Chrome + Firefox). */
  expectedExtensionIds?: readonly string[];
  /**
   * When set, the handshake accepts only that browser's extension id — a host that answers with a
   * different build (the classic "Firefox host listening on Chrome's port" failure) is rejected
   * before the requested action runs.
   */
  expectedBrowser?: ConnectorBrowserTarget;
}): VerifiedChromeConnectorClient {
  const client = args?.client ?? createChromeConnectorClient();
  const expectedExtensionIds = new Set(
    args?.expectedExtensionIds ??
      (args?.expectedBrowser
        ? [CONNECTOR_BROWSER_EXTENSION_IDS[args.expectedBrowser]]
        : args?.expectedExtensionId
          ? [args.expectedExtensionId]
          : NOLO_CONNECTOR_EXTENSION_IDS),
  );
  let verified: Promise<void> | null = null;
  let negotiatedFeatures: string[] = [];

  const verify = async () => {
    const connectorInfo = await client.request("connector_info", {});
    const receivedExtensionId = (connectorInfo as { extensionId?: unknown })?.extensionId;
    if (typeof receivedExtensionId !== "string" || !expectedExtensionIds.has(receivedExtensionId)) {
      const expectedList = [...expectedExtensionIds].join(", ");
      throw createConnectorError(
        "CHROME_CONNECTOR_EXTENSION_MISMATCH",
        `Chrome connector extension id mismatch: expected one of ${expectedList}, received ${
          typeof receivedExtensionId === "string" ? receivedExtensionId : "unknown"
        }.`,
        { expectedExtensionIds: [...expectedExtensionIds], receivedExtensionId },
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
    // Additive evolution rides here; an absent field means "no features", never "assume everything".
    const rawFeatures = (connectorInfo as { features?: unknown })?.features;
    negotiatedFeatures = Array.isArray(rawFeatures)
      ? rawFeatures.filter((entry): entry is string => typeof entry === "string")
      : [];
  };

  return {
    async request(action, payload) {
      verified ??= verify().catch((error) => {
        verified = null;
        throw error;
      });
      await verified;
      const missing = requiredFeaturesForConnectorAction(action).filter(
        (feature) => !negotiatedFeatures.includes(feature),
      );
      if (missing.length > 0) {
        throw createConnectorError(
          "CAPABILITY_UNSUPPORTED",
          `The installed Nolo Browser Connector extension does not support ${missing.join(", ")} ` +
            `(needed by ${action}). Reload or update the extension, then try again.`,
          { action, missingFeatures: missing, requiredFeatures: requiredFeaturesForConnectorAction(action), features: [...negotiatedFeatures] },
        );
      }
      return client.request(action, payload);
    },
    features() {
      return [...negotiatedFeatures];
    },
  };
}

export async function executeChromeConnectorTool(args: {
  /**
   * Per-call client factory keyed by the call's `target` (undefined = ambient default). This is the
   * production path — hosts (`buildCliChromeConnectorToolExecutors`,
   * `buildDesktopChromeConnectorToolExecutors`) must pass `createChromeConnectorClientResolver()` so
   * an explicit `target` actually routes to that browser instead of being silently ignored.
   */
  clientForTarget?: ChromeConnectorClientResolver;
  /**
   * Single-client escape hatch for tests that stub one endpoint. When a call carries an explicit
   * `target`, the target wins over this client — a fixed client must never silently swallow a
   * routing request (the production bug this field prevents is "target: firefox lands on Chrome").
   * To inject a fixed client *and* honour targets, pass `clientForTarget` returning it instead.
   */
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
    const { target: rawTarget, ...payload } = parseArguments(args.call.arguments) as Record<string, unknown>;
    // `target` selects which browser's native host serves the call. Accepted values are the two
    // connector builds; anything else (or a host answering for the wrong browser) is refused
    // before the action executes — never silently route a "chrome" call to a Firefox session.
    const target = typeof rawTarget === "string" && rawTarget.trim().length > 0
      ? rawTarget.trim().toLowerCase()
      : undefined;
    if (target !== undefined && target !== "chrome" && target !== "firefox") {
      throw createConnectorError(
        "INVALID_BROWSER_TARGET",
        `browser target must be "chrome" or "firefox", received "${rawTarget}".`,
        { receivedTarget: rawTarget },
      );
    }
    validateChromeConnectorPayload(action, payload);
    // Routing precedence, in order:
    //  1. `clientForTarget(target)` — the production path. The resolver owns per-browser clients, so
    //     an explicit target always reaches its own host (identity-pinned before the action).
    //  2. `client` — single-client test/injection escape hatch. An explicit target *still* wins:
    //     routing through a real per-target client is what stops a fixed client from silently
    //     swallowing "target: firefox" and hitting Chrome anyway.
    //  3. Neither — build a one-off client for this call (explicit target gets a verified,
    //     identity-pinned client; no target gets the verified ambient default — same gate the
    //     resolver builds, never a raw unverified endpoint).
    const client =
      args.clientForTarget?.(target) ??
      (target
        ? createVerifiedChromeConnectorClient({
            client: createChromeConnectorClient({ browser: target }),
            expectedBrowser: target,
          })
        : args.client ??
          createVerifiedChromeConnectorClient({ client: createChromeConnectorClient() }));
    const result = await client.request(action, payload);
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
