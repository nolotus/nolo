/** Canonical (model-visible) tool names. `chrome_*` remain accepted aliases (see CHROME_CONNECTOR_LEGACY_TOOL_ALIASES). */
export const CHROME_CONNECTOR_TOOL_NAMES = [
  "browser_list_tabs",
  "browser_open_tab",
  "browser_close_tab",
  "browser_read_page",
  "browser_click_element",
  "browser_type",
  "browser_set_select_value",
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
  chrome_set_select_value: "browser_set_select_value",
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

/**
 * Optional per-call browser routing: `"chrome"` or `"firefox"` picks which native host serves the
 * action (each listens on its own port). Omit to use the default endpoint.
 */
export const CONNECTOR_TARGET_PROPERTY = {
  type: "string",
  enum: ["chrome", "firefox"],
  description:
    "Which browser's connector serves this call: \"chrome\" or \"firefox\". Omit for the default endpoint.",
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
  "Read a compact view of a browser tab: visible text (hard cap 6000 chars) plus short-lived elementRefs (hard cap 35) and a pageRevision. Reuse those refs for browser_click_element and browser_type instead of guessing selectors; use region to focus a big page. When the element list exceeds one page, continue by passing the returned nextOffset as offset. Does not read cookies or profile databases.",
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
    offset: {
      type: "integer",
      minimum: 0,
      description: "Optional element offset for paging. When an element list exceeds one page, continue by passing the returned nextOffset as offset.",
    },
    viewportOnly: {
      type: "boolean",
      description: "Optional. When true, only elements intersecting the current viewport are listed.",
    },
  },
  ["tabId"],
);

/**
 * The approval round trip, model side. This id is *not* an authorization: the model cannot mint or
 * reuse one, it can only hand back what the connector returned after the user clicked "Allow once".
 */
const approvalId = {
  type: "string",
  description:
    "Only echo a value the connector returned in a USER_APPROVAL_PENDING response for this same action: after the user clicks \"Allow once\", retry with that approvalId. It grants nothing by itself (it is the lookup key for the user's decision), never invent or reuse one, and do not pass a previous id to a different action — it is single-use and expires quickly.",
};

export const chromeClickFunctionSchema = baseSchema(
  "browser_click_element",
  "Click a visible element in a browser tab by elementRef from browser_read_page, or by CSS selector. Clicking an element whose accessible name indicates an irreversible external action — whatever its tag, including a div with a click handler, an anchor or a custom element — opens a confirmation request for the user and returns USER_APPROVAL_PENDING (approval_pending) with an approvalId: ask the user to click \"Allow once\" in the Nolo window, then retry the same click. Do not retry without that approvalId, and do not switch to another selector or elementRef to get around the gate.",
  {
    tabId,
    elementRef,
    selector,
    approvalId,
  },
  ["tabId"],
);

export const chromeTypeFunctionSchema = baseSchema(
  "browser_type",
  "Type text into a browser page element identified by elementRef from browser_read_page or by CSS selector. Typing into an operable control whose name indicates an irreversible external action behaves like clicking it: a confirmation request goes to the user and the call returns USER_APPROVAL_PENDING with an approvalId — ask the user to allow it, then retry with that approvalId.",
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
    approvalId,
  },
  ["tabId", "text"],
);

export const chromeSetSelectValueSchema = baseSchema(
  "browser_set_select_value",
  "Choose an option in a native <select> element and verify the result. Use this for real <select> controls instead of click/press: clicking a select never changes its value (type reports value_mismatch, key presses have no observable effect, and <option> elements do not appear in browser_read_page). Provide exactly one of value (matched exactly against option values) or label (the option's visible text, which must match exactly one option). When the option is missing (OPTION_NOT_FOUND), several options share the label (OPTION_AMBIGUOUS) or the option is disabled (OPTION_DISABLED), the call fails with that code instead of guessing — call browser_read_page again and pass the exact value. The result is ok only when the select reads back the requested option after input/change were dispatched (verified is true on that same read-back); SELECT_VALUE_NOT_APPLIED means the page rejected or reverted the choice. If the select cannot be read back at all — for example a change listener removed it — the call returns ok:false with effect \"uncertain\" and code SELECT_GONE (or SELECT_VALUE_UNVERIFIED when the read never returned), which means unverified, not success: re-read the page before reporting the choice. Custom (non-native) dropdowns still need browser_click_element. Selecting an option in a control whose accessible name indicates an irreversible external action (delete, 支付, 发送…) opens a confirmation request for the user and returns USER_APPROVAL_PENDING with an approvalId: ask the user to click \"Allow once\" in the Nolo window, then retry this same call with that approvalId. Do not retry without it, and do not switch to another selector or elementRef to get around the gate. Four further codes say the select's identity could not be proven: SELECT_TOKEN_UNAVAILABLE means this page cannot hold a select identity token at all (the value was not set), SELECT_TOKEN_REQUIRED means the target select was not marked before the set so it cannot be identified (the value was not set), and SELECT_TOKEN_FAILED means marking that token failed (the value was not set) — in all three cases the connector cannot prove which control it addressed, so call browser_read_page again and retry with a fresh selector or elementRef. TYPE_ON_SELECT_REFUSED means browser_type was aimed at a native <select>, which never chooses an option — use browser_set_select_value for that control instead.",
  {
    tabId,
    elementRef,
    selector,
    value: {
      type: "string",
      description: "Exact option value to select. Mutually exclusive with label.",
    },
    label: {
      type: "string",
      description: "Visible option text to select; must match exactly one option. Mutually exclusive with value.",
    },
    approvalId,
  },
  ["tabId"],
);

export const chromePressFunctionSchema = baseSchema(
  "browser_press",
  "Send a keyboard key or shortcut to a browser tab. Enter-like keys on a focused operable control whose name indicates an irreversible action first ask the user for confirmation and return USER_APPROVAL_PENDING with an approvalId.",
  {
    tabId,
    key: {
      type: "string",
      description: "Key or shortcut, for example Enter, Escape, ArrowDown, or Meta+L.",
    },
    approvalId,
  },
  ["tabId", "key"],
);

export const chromeScrollFunctionSchema = baseSchema(
  "browser_scroll",
  "Scroll the browser page or a CSS-selected container by pixel deltas; with selector and no deltas, observe the container's scroll position without moving it. Selector matching must resolve to exactly one valid element; invalid, missing, or ambiguous selectors fail without falling back to page scrolling. Results include targetBefore and targetAfter measurements for scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, and clientWidth.",
  {
    tabId,
    selector: {
      type: "string",
      description: "Optional CSS selector for exactly one scroll container. When provided, only that container is scrolled; invalid, not-found, or ambiguous selectors fail without falling back. May be used without deltas to observe scroll position.",
    },
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
  chromeSetSelectValueSchema,
  chromePressFunctionSchema,
  chromeScrollFunctionSchema,
  chromeScreenshotFunctionSchema,
  chromeReadConsoleFunctionSchema,
  chromeReadNetworkFunctionSchema,
];

export async function chromeConnectorUnavailableFunc(): Promise<never> {
  throw new Error("Browser connector tools are only executable in the Nolo desktop local runtime.");
}
