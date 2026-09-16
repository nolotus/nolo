export const CHROME_CONNECTOR_TOOL_NAMES = [
  "chrome_list_tabs",
  "chrome_open_tab",
  "chrome_read_page",
  "chrome_click",
  "chrome_type",
  "chrome_press",
  "chrome_scroll",
  "chrome_screenshot",
  "chrome_read_console",
  "chrome_read_network",
] as const;

export type ChromeConnectorToolName = typeof CHROME_CONNECTOR_TOOL_NAMES[number];

export const CHROME_CONNECTOR_READ_TOOL_NAMES = [
  "chrome_list_tabs",
  "chrome_read_page",
  "chrome_screenshot",
  "chrome_read_console",
  "chrome_read_network",
] as const satisfies readonly ChromeConnectorToolName[];

export const getChromeConnectorToolBehavior = (
  name: ChromeConnectorToolName,
): "data" | "action" =>
  CHROME_CONNECTOR_READ_TOOL_NAMES.includes(name as any) ? "data" : "action";

export const getChromeConnectorToolDefaultConsent = (
  name: ChromeConnectorToolName,
): "auto" | "ask" =>
  CHROME_CONNECTOR_READ_TOOL_NAMES.includes(name as any) ? "auto" : "ask";

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
      properties,
      required,
    },
  };
}

const tabId = {
  type: "string",
  description: "Chrome tab id returned by chrome_list_tabs or chrome_open_tab.",
};

const elementRef = {
  type: "string",
  description: "Revision-scoped ref like 1a2b3c4d-e2, copied verbatim from chrome_read_page; preferred over selector when available.",
};

const selector = {
  type: "string",
  description: "CSS selector for the visible page element to operate on; fallback when no elementRef is available.",
};

export const chromeListTabsFunctionSchema = baseSchema(
  "chrome_list_tabs",
  "List controllable Chrome tabs from the user's Chrome profile through the Nolo desktop Chrome connector.",
  {},
);

export const chromeOpenTabFunctionSchema = baseSchema(
  "chrome_open_tab",
  "Open a URL in the user's Chrome browser through the Nolo desktop Chrome connector.",
  {
    url: {
      type: "string",
      description: "HTTP or HTTPS URL to open in Chrome.",
    },
    active: {
      type: "boolean",
      description: "Whether to focus the new Chrome tab. Defaults to true.",
    },
  },
  ["url"],
);

export const chromeReadPageFunctionSchema = baseSchema(
  "chrome_read_page",
  "Read a compact view of a Chrome tab: visible text (hard cap 6000 chars) plus short-lived elementRefs (hard cap 35) and a pageRevision. Reuse those refs for chrome_click and chrome_type instead of guessing selectors; use region to focus a big page. Does not read cookies or profile databases.",
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
  "chrome_click",
  "Click a visible element in a Chrome tab by elementRef from chrome_read_page, or by CSS selector. Do not use this for final submit/delete/payment/permission actions without action-time user confirmation.",
  {
    tabId,
    elementRef,
    selector,
  },
  ["tabId"],
);

export const chromeTypeFunctionSchema = baseSchema(
  "chrome_type",
  "Type text into a Chrome page element identified by elementRef from chrome_read_page or by CSS selector. Typing sensitive data into a third-party site counts as data transmission.",
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
  "chrome_press",
  "Send a keyboard key or shortcut to a Chrome tab.",
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
  "chrome_scroll",
  "Scroll a Chrome tab by pixel deltas.",
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
  "chrome_screenshot",
  "Capture a screenshot from a Chrome tab through the Nolo desktop Chrome connector.",
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
  "chrome_read_console",
  "Read recent console messages from a Chrome tab using debugger-backed connector state.",
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
  "chrome_read_network",
  "Read a deduplicated recent network summary from a Chrome tab using debugger-backed connector state. Static assets are filtered unless includeAssets is set.",
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
  throw new Error("Chrome connector tools are only executable in the Nolo desktop local runtime.");
}
