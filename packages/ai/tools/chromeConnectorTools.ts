/** Canonical (model-visible) tool names. `chrome_*` remain accepted aliases (see CHROME_CONNECTOR_LEGACY_TOOL_ALIASES). */
export const CHROME_CONNECTOR_TOOL_NAMES = [
  "browser_list_tabs",
  "browser_open_tab",
  "browser_close_tab",
  "browser_read_page",
  "browser_click_element",
  "browser_type",
  "browser_press",
  "browser_scroll",
  "browser_screenshot",
  "browser_read_console",
  "browser_read_network",
] as const;

export type ChromeConnectorToolName = typeof CHROME_CONNECTOR_TOOL_NAMES[number];

/**
 * Legacy `chrome_*` names → canonical `browser_*`. `browser_click` is already the Playwright
 * session tool, so the connector click is `browser_click_element`.
 */
export const CHROME_CONNECTOR_LEGACY_TOOL_ALIASES = {
  chrome_list_tabs: "browser_list_tabs",
  chrome_open_tab: "browser_open_tab",
  chrome_close_tab: "browser_close_tab",
  chrome_read_page: "browser_read_page",
  chrome_click: "browser_click_element",
  chrome_type: "browser_type",
  chrome_press: "browser_press",
  chrome_scroll: "browser_scroll",
  chrome_screenshot: "browser_screenshot",
  chrome_read_console: "browser_read_console",
  chrome_read_network: "browser_read_network",
} as const satisfies Record<string, ChromeConnectorToolName>;

export type ChromeConnectorLegacyToolName = keyof typeof CHROME_CONNECTOR_LEGACY_TOOL_ALIASES;

export const CHROME_CONNECTOR_LEGACY_TOOL_NAMES = Object.keys(
  CHROME_CONNECTOR_LEGACY_TOOL_ALIASES,
) as ChromeConnectorLegacyToolName[];

/** Every accepted name (canonical + legacy) for parsing/policy/executor tables. */
export const CHROME_CONNECTOR_ACCEPTED_TOOL_NAMES: readonly string[] = [
  ...CHROME_CONNECTOR_TOOL_NAMES,
  ...CHROME_CONNECTOR_LEGACY_TOOL_NAMES,
];

/** Resolve a canonical or legacy connector tool name to canonical; undefined if not a connector tool. */
export function resolveChromeConnectorToolName(name: string): ChromeConnectorToolName | undefined {
  if ((CHROME_CONNECTOR_TOOL_NAMES as readonly string[]).includes(name)) {
    return name as ChromeConnectorToolName;
  }
  return (CHROME_CONNECTOR_LEGACY_TOOL_ALIASES as Record<string, ChromeConnectorToolName>)[name];
}

/** Map declared names: legacy `chrome_x` → `browser_x`; keep only connector names, de-duplicated, order-preserving. */
export function canonicalizeChromeConnectorToolNames(toolNames?: string[]): ChromeConnectorToolName[] {
  const out: ChromeConnectorToolName[] = [];
  for (const name of toolNames ?? []) {
    const resolved = typeof name === "string" ? resolveChromeConnectorToolName(name) : undefined;
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/** Reserved for future multi-provider targeting; accepted and ignored. */
export const CONNECTOR_TARGET_PROPERTY = {
  type: "string",
  description: "Reserved and ignored for now; future multi-provider targeting.",
};

export const CHROME_CONNECTOR_READ_TOOL_NAMES = [
  "browser_list_tabs",
  "browser_read_page",
  "browser_screenshot",
  "browser_read_console",
  "browser_read_network",
] as const satisfies readonly ChromeConnectorToolName[];

export const getChromeConnectorToolBehavior = (
  name: string,
): "data" | "action" =>
  CHROME_CONNECTOR_READ_TOOL_NAMES.includes(resolveChromeConnectorToolName(name) as any) ? "data" : "action";

export const getChromeConnectorToolDefaultConsent = (
  name: string,
): "auto" | "ask" =>
  CHROME_CONNECTOR_READ_TOOL_NAMES.includes(resolveChromeConnectorToolName(name) as any) ? "auto" : "ask";

function baseSchema(
  name: ChromeConnectorToolName,
  description: string,
  properties: Record<string, unknown>,
  required: string[] = [],
) {
  return {
    name,
    description,
    parameters: {
      type: "object",
      properties: { ...properties, target: CONNECTOR_TARGET_PROPERTY },
      required,
    },
  };
}

const tabId = {
  type: "string",
  description: "Browser tab id returned by browser_list_tabs or browser_open_tab.",
};

const elementRef = {
  type: "string",
  description: "Revision-scoped ref like 1a2b3c4d-e2, copied verbatim from browser_read_page; preferred over selector when available.",
};

const selector = {
  type: "string",
  description: "CSS selector for the visible page element to operate on; fallback when no elementRef is available.",
};

export const chromeListTabsFunctionSchema = baseSchema(
  "browser_list_tabs",
  "List controllable browser tabs from the user's browser profile through the Nolo Browser Connector.",
  {},
);

export const chromeOpenTabFunctionSchema = baseSchema(
  "browser_open_tab",
  "Open a URL in the user's browser (Chrome or Firefox) through the Nolo Browser Connector.",
  {
    url: {
      type: "string",
      description: "HTTP or HTTPS URL to open in the browser.",
    },
    active: {
      type: "boolean",
      description: "Whether to focus the new browser tab. Defaults to true.",
    },
  },
  ["url"],
);

export const chromeCloseTabFunctionSchema = baseSchema(
  "browser_close_tab",
  "Close a browser tab through the Nolo Browser Connector. Prefer closing the tabs your own run opened with browser_open_tab, and ask the user before closing a tab they are using. Pinned tabs are refused (TAB_PINNED); unknown tab ids fail (TAB_NOT_FOUND).",
  {
    tabId,
  },
  ["tabId"],
);

export const chromeReadPageFunctionSchema = baseSchema(
  "browser_read_page",
  "Read a compact view of a browser tab: visible text (hard cap 6000 chars) plus short-lived elementRefs (hard cap 35) and a pageRevision. Reuse those refs for browser_click_element and browser_type instead of guessing selectors; use region to focus a big page. Does not read cookies or profile databases.",
  {
    tabId,
    region: {
      type: "string",
      description: "Optional CSS selector limiting the read to part of the page.",
    },
    maxChars: {
      type: "number",
      description: "Optional text character budget; the connector clamps it to a hard maximum.",
    },
    detail: {
      type: "string",
      enum: ["compact", "full"],
      description: "compact (default) returns budgeted text; full raises the budget and adds capped HTML.",
    },
  },
  ["tabId"],
);

export const chromeClickFunctionSchema = baseSchema(
  "browser_click_element",
  "Click a visible element in a browser tab by elementRef from browser_read_page, or by CSS selector. Controls whose name indicates an irreversible external action (payment, send, delete, publish, permission change) are refused with SENSITIVE_ACTION_REQUIRES_CONFIRMATION: this desktop runtime has no approval channel, so name the control and ask the user to activate it themselves.",
  {
    tabId,
    elementRef,
    selector,
  },
  ["tabId"],
);

export const chromeTypeFunctionSchema = baseSchema(
  "browser_type",
  "Type text into a browser page element identified by elementRef from browser_read_page or by CSS selector. Typing into a control whose name indicates an irreversible external action is refused with SENSITIVE_ACTION_REQUIRES_CONFIRMATION, same as clicking it.",
  {
    tabId,
    elementRef,
    selector,
    text: {
      type: "string",
      description: "Text to type into the selected element.",
    },
    clearFirst: {
      type: "boolean",
      description: "Whether to clear the field before typing. Defaults to true.",
    },
  },
  ["tabId", "text"],
);

export const chromePressFunctionSchema = baseSchema(
  "browser_press",
  "Send a keyboard key or shortcut to a browser tab. Enter-like keys are refused with SENSITIVE_ACTION_REQUIRES_CONFIRMATION when the focused control is an irreversible action.",
  {
    tabId,
    key: {
      type: "string",
      description: "Key or shortcut, for example Enter, Escape, ArrowDown, or Meta+L.",
    },
  },
  ["tabId", "key"],
);

export const chromeScrollFunctionSchema = baseSchema(
  "browser_scroll",
  "Scroll a browser tab by pixel deltas.",
  {
    tabId,
    deltaX: {
      type: "number",
      description: "Horizontal scroll delta in pixels.",
    },
    deltaY: {
      type: "number",
      description: "Vertical scroll delta in pixels.",
    },
  },
  ["tabId"],
);

export const chromeScreenshotFunctionSchema = baseSchema(
  "browser_screenshot",
  "Capture a screenshot from a browser tab through the Nolo Browser Connector.",
  {
    tabId,
    fullPage: {
      type: "boolean",
      description: "Whether to capture the full page. Defaults to false.",
    },
  },
  ["tabId"],
);

export const chromeReadConsoleFunctionSchema = baseSchema(
  "browser_read_console",
  "Read recent console messages from a browser tab using debugger-backed connector state.",
  {
    tabId,
    limit: {
      type: "number",
      description: "Maximum number of recent console messages to return.",
    },
  },
  ["tabId"],
);

export const chromeReadNetworkFunctionSchema = baseSchema(
  "browser_read_network",
  "Read a deduplicated recent network summary from a browser tab using debugger-backed connector state. Static assets are filtered unless includeAssets is set.",
  {
    tabId,
    limit: {
      type: "number",
      description: "Maximum number of recent network entries to return.",
    },
    includeAssets: {
      type: "boolean",
      description: "Include images, CSS, fonts and other static assets. Defaults to false.",
    },
  },
  ["tabId"],
);

export const chromeConnectorToolSchemas = [
  chromeListTabsFunctionSchema,
  chromeOpenTabFunctionSchema,
  chromeCloseTabFunctionSchema,
  chromeReadPageFunctionSchema,
  chromeClickFunctionSchema,
  chromeTypeFunctionSchema,
  chromePressFunctionSchema,
  chromeScrollFunctionSchema,
  chromeScreenshotFunctionSchema,
  chromeReadConsoleFunctionSchema,
  chromeReadNetworkFunctionSchema,
];

export async function chromeConnectorUnavailableFunc(): Promise<never> {
  throw new Error("Browser connector tools are only executable in the Nolo desktop local runtime.");
}
