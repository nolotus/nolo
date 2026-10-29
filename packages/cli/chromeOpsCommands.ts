import { t } from "./i18n";
/**
 * `nolo browser <op>` (legacy alias: `nolo chrome <op>`) — the operation half of the browser group:
 * read / click / type against the user's live browser (the machine-setup half — status / install / reload —
 * lives in chromeCommands.ts).
 *
 * A thin CLI surface over the connector RPC (Chrome: 127.0.0.1:38947, Firefox: 127.0.0.1:38948, token-authenticated):
 * the same bridge the desktop runtime exposes to agents as the browser_* tools, made
 * usable from the TUI, scripts and plain terminal sessions.
 *
 * Design notes:
 * - Every subcommand prints the connector's raw JSON result on stdout (exit 1 on
 *   failure), so both humans and agents can consume it.
 * - Payload validation lives in the connector module (validateChromeConnectorPayload)
 *   and in the extension itself; the CLI only adds friendlier missing-flag errors.
 * - The extension refuses actions it classifies as irreversible (CONFIRMATION_REQUIRED,
 *   e.g. Submit / Delete / Pay buttons); those must be performed by the user.
 */
import { writeFile } from "node:fs/promises";

import { toErrorMessage } from "core/errorMessage";

import {
  createChromeConnectorClient,
  createVerifiedChromeConnectorClient,
  type ChromeConnectorClient,
  type ChromeConnectorRequestPayload,
} from "../desktop-chrome-connector/chromeConnector";
import { readOption } from "./cliEnvHelpers";

type ChromeIo = {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
};

export type ChromeOpsCommandDeps = {
  client?: ChromeConnectorClient;
  createClient?: (browser?: "chrome" | "firefox") => ChromeConnectorClient;
  io?: Partial<ChromeIo>;
  env?: Record<string, string | undefined>;
  probeBrowser?: (browser: "chrome" | "firefox") => Promise<boolean>;
};

type ChromeSubcommandSpec = {
  /** Connector RPC action (see packages/desktop-chrome-connector). */
  action: string;
  /** One-line usage shown in help output and missing-flag errors. */
  usage: string;
  payload: (args: string[], usage: string) => ChromeConnectorRequestPayload;
};

function wantsHelp(args: string[]) {
  return args.includes("--help") || args.includes("-h");
}

function readTrimmedOption(args: string[], flag: string): string {
  return (readOption(args, flag) ?? "").trim();
}

/** `--browser chrome|firefox`（`--browser=firefox` 亦可）；未给返回 undefined，非法值返回 null。 */
function readBrowserFlag(args: string[]): "chrome" | "firefox" | null | undefined {
  const equalsForm = args.find((arg) => arg.startsWith("--browser="));
  const raw =
    equalsForm !== undefined
      ? equalsForm.slice("--browser=".length)
      : readOption(args, "--browser");
  if (raw === undefined) return undefined;
  const value = raw.trim();
  if (value === "chrome" || value === "firefox") return value;
  return null;
}

function readAllOptions(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) {
      const val = args[i + 1].trim();
      if (val && !val.startsWith("--")) {
        values.push(val);
      }
    }
  }
  return values;
}

function readIntOption(args: string[], flag: string, usage: string): number | undefined {
  const raw = readOption(args, flag);
  if (raw === undefined) return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    throw new Error(t("cliBrowserInvalidNumber", flag, usage));
  }
  return value;
}

function readNonNegativeIntOption(
  args: string[],
  flag: string,
  usage: string,
): number | undefined {
  const equalsForm = args.find((arg) => arg.startsWith(`${flag}=`));
  const raw =
    equalsForm !== undefined
      ? equalsForm.slice(`${flag}=`.length)
      : readOption(args, flag);
  if (raw === undefined) {
    if (args.includes(flag)) {
      throw new Error(t("cliBrowserInvalidNumber", flag, usage));
    }
    return undefined;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(t("cliBrowserInvalidNumber", flag, usage));
  }
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(t("cliBrowserInvalidNumber", flag, usage));
  }
  return value;
}

function requireTabId(args: string[], usage: string): string {
  const tabId = readTrimmedOption(args, "--tab");
  if (!tabId) {
    throw new Error(t("cliBrowserMissingTab", usage));
  }
  return tabId;
}

function requireTarget(args: string[], usage: string): ChromeConnectorRequestPayload {
  const elementRef = readTrimmedOption(args, "--ref");
  const selector = readTrimmedOption(args, "--selector");
  if (!elementRef && !selector) {
    throw new Error(
      t("cliBrowserMissingTarget", usage),
    );
  }
  return {
    ...(elementRef ? { elementRef } : {}),
    ...(selector ? { selector } : {}),
  };
}

/**
 * `--approval-id` is the id a previous USER_APPROVAL_PENDING response returned after the user clicked
 * "Allow once" in the browser. It carries no authority of its own: the CLI cannot mint a usable one,
 * it only hands back what the user already approved.
 */
function withApprovalId(
  args: string[],
  payload: ChromeConnectorRequestPayload,
): ChromeConnectorRequestPayload {
  const approvalId = readTrimmedOption(args, "--approval-id");
  return approvalId ? { ...payload, approvalId } : payload;
}

/**
 * `eval` bounds: too small a timeout cannot survive a debugger round trip, too large one holds the
 * user's approval (and the tab) hostage. Kept in the CLI surface so the failure is a clear usage
 * error instead of a connector-side rejection.
 */
const EVAL_TIMEOUT_MIN_MS = 100;
const EVAL_TIMEOUT_MAX_MS = 60000;

export const CHROME_OPS_SUBCOMMANDS: Record<string, ChromeSubcommandSpec> = {
  "list-tabs": {
    action: "list_tabs",
    usage: "nolo browser list-tabs",
    payload: () => ({}),
  },
  "open-tab": {
    action: "open_tab",
    usage: "nolo browser open-tab --url <url> [--active]",
    payload: (args, usage) => {
      const url = readTrimmedOption(args, "--url");
      if (!url) {
        throw new Error(t("cliBrowserMissingUrl", usage));
      }
      return { url, active: args.includes("--active") };
    },
  },
  "close-tab": {
    action: "close_tab",
    usage: "nolo browser close-tab --tab <id>",
    payload: (args, usage) => ({ tabId: requireTabId(args, usage) }),
  },
  "read-page": {
    action: "read_page",
    usage:
      "nolo browser read-page --tab <id> [--selector <css>] [--detail compact|full] [--max-elements N] [--offset N] [--viewport]",
    payload: (args, usage) => {
      const payload: ChromeConnectorRequestPayload = { tabId: requireTabId(args, usage) };
      const selector = readTrimmedOption(args, "--selector");
      if (selector) payload.selector = selector;
      const detail = readTrimmedOption(args, "--detail");
      if (detail) payload.detail = detail;
      const maxElements = readIntOption(args, "--max-elements", usage);
      if (maxElements !== undefined) payload.maxElements = maxElements;
      const offset = readNonNegativeIntOption(args, "--offset", usage);
      if (offset !== undefined) payload.offset = offset;
      if (args.includes("--viewport")) payload.viewportOnly = true;
      return payload;
    },
  },
  click: {
    action: "click",
    usage:
      "nolo browser click --tab <id> (--ref <elementRef> | --selector <css>) [--approval-id <id>]",
    payload: (args, usage) =>
      withApprovalId(args, {
        tabId: requireTabId(args, usage),
        ...requireTarget(args, usage),
      }),
  },
  type: {
    action: "type",
    usage:
      "nolo browser type --tab <id> (--ref <elementRef> | --selector <css>) --text <text> [--append] [--approval-id <id>]",
    payload: (args, usage) => {
      const text = readOption(args, "--text");
      // A value that starts with "--" is a swallowed flag, not text: fail instead of
      // typing "--append" into the page (and clearing the field on the way).
      if (text === undefined || text.startsWith("--")) {
        throw new Error(t("cliBrowserMissingText", usage));
      }
      return withApprovalId(args, {
        tabId: requireTabId(args, usage),
        ...requireTarget(args, usage),
        text,
        ...(args.includes("--append") ? { clearFirst: false } : {}),
      });
    },
  },
  select: {
    action: "set_select_value",
    usage:
      "nolo browser select --tab <id> (--ref <elementRef> | --selector <css>) (--value <v> | --label <l>) [--approval-id <id>]",
    payload: (args, usage) => {
      const value = readOption(args, "--value");
      const label = readOption(args, "--label");
      if ((value === undefined) === (label === undefined)) {
        throw new Error(`Provide exactly one of --value <v> or --label <l>. Usage: ${usage}`);
      }
      // A value that starts with "--" is a swallowed flag, not an option value: fail instead of
      // selecting something the user never meant.
      for (const optionValue of [value, label]) {
        if (typeof optionValue === "string" && optionValue.startsWith("--")) {
          throw new Error(`A flag was passed where an option value was expected. Usage: ${usage}`);
        }
      }
      // A select behind an irreversible-looking name opens the same approval window as click/type,
      // so the retry needs the approvalId the connector returned — without this the user could
      // allow the window and the caller would still have no way to complete the action.
      return withApprovalId(args, {
        tabId: requireTabId(args, usage),
        ...requireTarget(args, usage),
        ...(value !== undefined ? { value } : { label }),
      });
    },
  },
  upload: {
    action: "set_files",
    usage:
      "nolo browser upload --tab <id> (--ref <elementRef> | --selector <css>) --file <path> [--file <path>...]",
    payload: (args, usage) => {
      const files = readAllOptions(args, "--file");
      if (files.length === 0) {
        throw new Error(t("cliBrowserMissingFile", usage));
      }
      const target = requireTarget(args, usage);
      const tabId = requireTabId(args, usage);
      return {
        tabId,
        ...target,
        ...(target.elementRef ? { ref: target.elementRef } : {}),
        files,
      };
    },
  },
  press: {
    action: "press",
    usage: "nolo browser press --tab <id> --key <key> [--approval-id <id>]",
    payload: (args, usage) => {
      const key = readTrimmedOption(args, "--key");
      if (!key) {
        throw new Error(t("cliBrowserMissingKey", usage));
      }
      return withApprovalId(args, { tabId: requireTabId(args, usage), key });
    },
  },
  "prepare-action": {
    action: "prepare_browser_action",
    usage:
      "nolo browser prepare-action --tab <id> --action click|type|press (--selector <css> | --active) [--text <text>] [--key <key>] [--owner <id>] [--dialog <id>]",
    payload: (args, usage) => {
      const tabId = requireTabId(args, usage);
      const action = readTrimmedOption(args, "--action").toLowerCase();
      if (!action || !["click", "type", "press"].includes(action)) {
        throw new Error(t("cliBrowserAction", usage));
      }

      if (readOption(args, "--ref") !== undefined) {
        throw new Error(t("cliBrowserRefUnsupported", usage));
      }

      const active = args.includes("--active");
      const selector = readTrimmedOption(args, "--selector");
      if (!active && !selector && action !== "press") {
        throw new Error(t("cliBrowserSelector", usage));
      }

      const payload: ChromeConnectorRequestPayload = {
        tabId,
        action,
        ...(active ? { active: true } : {}),
        ...(selector ? { selector } : {}),
      };

      if (action === "type") {
        const text = readOption(args, "--text");
        if (text === undefined || text.startsWith("--")) {
          throw new Error(t("cliBrowserTypeText", usage));
        }
        payload.text = text;
        if (args.includes("--append")) {
          payload.clearFirst = false;
        }
      } else if (action === "press") {
        const key = readTrimmedOption(args, "--key");
        if (!key) {
          throw new Error(t("cliBrowserPressKey", usage));
        }
        payload.key = key;
      }

      const owner = readTrimmedOption(args, "--owner");
      if (owner) payload.owner = owner;
      const dialog = readTrimmedOption(args, "--dialog");
      if (dialog) payload.dialogId = dialog;

      return payload;
    },
  },
  scroll: {
    action: "scroll",
    usage: "nolo browser scroll --tab <id> [--selector <css>] [--delta-x N] [--delta-y N]",
    payload: (args, usage) => {
      const payload: ChromeConnectorRequestPayload = { tabId: requireTabId(args, usage) };
      const selector = readTrimmedOption(args, "--selector");
      const deltaX = readIntOption(args, "--delta-x", usage);
      const deltaY = readIntOption(args, "--delta-y", usage);
      if (selector) payload.selector = selector;
      if (deltaX !== undefined) payload.deltaX = deltaX;
      if (deltaY !== undefined) payload.deltaY = deltaY;
      return payload;
    },
  },
  screenshot: {
    action: "screenshot",
    usage: "nolo browser screenshot --tab <id> [--out <path>] [--full-page]",
    payload: (args, usage) => ({
      tabId: requireTabId(args, usage),
      ...(args.includes("--full-page") ? { fullPage: true } : {}),
    }),
  },
  "read-console": {
    action: "read_console",
    usage: "nolo browser read-console --tab <id> [--limit N]",
    payload: (args, usage) => {
      const payload: ChromeConnectorRequestPayload = { tabId: requireTabId(args, usage) };
      const limit = readIntOption(args, "--limit", usage);
      if (limit !== undefined) payload.limit = limit;
      return payload;
    },
  },
  "read-network": {
    action: "read_network",
    usage: "nolo browser read-network --tab <id> [--limit N] [--include-assets]",
    payload: (args, usage) => {
      const payload: ChromeConnectorRequestPayload = { tabId: requireTabId(args, usage) };
      const limit = readIntOption(args, "--limit", usage);
      if (limit !== undefined) payload.limit = limit;
      if (args.includes("--include-assets")) payload.includeAssets = true;
      return payload;
    },
  },
  eval: {
    action: "eval_script",
    usage:
      "nolo browser eval --tab <id> --expr <js> [--await] [--timeout-ms N] [--approval-id <id>]",
    payload: (args, usage) => {
      const expression = readOption(args, "--expr");
      // Same rule as --text: a value that starts with "--" is a swallowed flag, not an expression.
      if (
        expression === undefined ||
        expression.trim() === "" ||
        expression.startsWith("--")
      ) {
        throw new Error(t("cliBrowserMissingExpression", usage));
      }
      const payload: ChromeConnectorRequestPayload = {
        tabId: requireTabId(args, usage),
        expression,
      };
      const timeoutMs = readNonNegativeIntOption(args, "--timeout-ms", usage);
      if (timeoutMs !== undefined) {
        if (timeoutMs < EVAL_TIMEOUT_MIN_MS || timeoutMs > EVAL_TIMEOUT_MAX_MS) {
          throw new Error(t("cliBrowserEvalTimeoutRange", usage));
        }
        payload.timeoutMs = timeoutMs;
      }
      // Only `--await` sets awaitPromise: the connector/extension must never infer it.
      if (args.includes("--await")) payload.awaitPromise = true;
      return withApprovalId(args, payload);
    },
  },
};

export function renderChromeOpsHelp(): string {
  const lines = [
    t("cliBrowserHelpIntro"),
    ...Object.values(CHROME_OPS_SUBCOMMANDS).map(
      (spec) => `  ${spec.usage.replace(/^nolo browser /, "")}`,
    ),
    t("cliBrowserHelpNotes"),
  ];
  return lines.join("\n");
}

// 探测读 process.env
async function defaultProbeBrowser(
  browser: "chrome" | "firefox",
): Promise<boolean> {
  try {
    const client = createChromeConnectorClient({
      browser,
      fetchImpl: (input, init) => {
        return fetch(input, {
          ...init,
          signal: AbortSignal.timeout(400),
        });
      },
    });
    const info = (await client.request("connector_info", {})) as
      | { extensionId?: string }
      | undefined;
    return typeof info?.extensionId === "string";
  } catch (error) {
    if ((error as { code?: string })?.code === "CHROME_CONNECTOR_UNAVAILABLE") {
      return false;
    }
    const handshakeError = new Error(
      `探测到端点但握手失败：${toErrorMessage(error)}`,
    ) as Error & { code?: string; details?: unknown };
    handshakeError.code =
      (error as { code?: string })?.code || "CHROME_CONNECTOR_HANDSHAKE_FAILED";
    handshakeError.details = (error as { details?: unknown })?.details;
    throw handshakeError;
  }
}

export async function runChromeOpsCommand(
  subcommand: string,
  args: string[],
  deps: ChromeOpsCommandDeps = {},
): Promise<number> {
  const io: ChromeIo = {
    stdout: (text) => console.log(text),
    stderr: (text) => console.error(text),
    ...deps.io,
  };

  const spec = CHROME_OPS_SUBCOMMANDS[subcommand];
  if (!spec) {
    io.stderr(`${t("cliBrowserUnknown", subcommand)}\n\n${renderChromeOpsHelp()}`);
    return 1;
  }
  if (wantsHelp(args)) {
    io.stdout(renderChromeOpsHelp());
    return 0;
  }

  const browserFlag = readBrowserFlag(args);
  if (browserFlag === null) {
    io.stderr(
      t("cliBrowserBrowser", spec.usage),
    );
    return 1;
  }

  let payload: ChromeConnectorRequestPayload;
  try {
    payload = spec.payload(args, spec.usage);
  } catch (error) {
    io.stderr(toErrorMessage(error));
    return 1;
  }

  let result: unknown;
  try {
    const env = deps.env ?? process.env;
    let client: ChromeConnectorClient;

    if (deps.client) {
      client = deps.client;
    } else {
      let targetBrowser: "chrome" | "firefox" | undefined = browserFlag;

      if (!targetBrowser && !env.NOLO_CHROME_CONNECTOR_RPC_URL) {
        const probe = deps.probeBrowser ?? defaultProbeBrowser;
        const [chromeResult, firefoxResult] = await Promise.allSettled([
          probe("chrome"),
          probe("firefox"),
        ]);

        const chromeOnline =
          chromeResult.status === "fulfilled" && chromeResult.value === true;
        const firefoxOnline =
          firefoxResult.status === "fulfilled" && firefoxResult.value === true;

        if (chromeOnline && firefoxOnline) {
          const error = new Error(
            "Both Chrome and Firefox connectors are online. Specify --browser chrome or --browser firefox.",
          ) as Error & { code: string };
          error.code = "MULTIPLE_BROWSERS_AVAILABLE";
          throw error;
        }

        if (chromeOnline) {
          targetBrowser = "chrome";
        } else if (firefoxOnline) {
          targetBrowser = "firefox";
        } else {
          if (chromeResult.status === "rejected") {
            const reason = toErrorMessage(chromeResult.reason);
            const err = new Error(
              reason.startsWith("探测到端点但握手失败：")
                ? reason
                : `探测到端点但握手失败：${reason}`,
            ) as Error & { code?: string; details?: unknown };
            err.code =
              (chromeResult.reason as { code?: string })?.code ||
              "CHROME_CONNECTOR_HANDSHAKE_FAILED";
            err.details = (chromeResult.reason as { details?: unknown })?.details;
            throw err;
          }
          if (firefoxResult.status === "rejected") {
            const reason = toErrorMessage(firefoxResult.reason);
            const err = new Error(
              reason.startsWith("探测到端点但握手失败：")
                ? reason
                : `探测到端点但握手失败：${reason}`,
            ) as Error & { code?: string; details?: unknown };
            err.code =
              (firefoxResult.reason as { code?: string })?.code ||
              "CHROME_CONNECTOR_HANDSHAKE_FAILED";
            err.details = (firefoxResult.reason as { details?: unknown })?.details;
            throw err;
          }
          const chromePort = env.NOLO_CHROME_CONNECTOR_PORT || 38947;
          const firefoxPort = env.NOLO_FIREFOX_CONNECTOR_PORT || 38948;
          const chromeEndpoint = `http://127.0.0.1:${chromePort}/rpc`;
          const firefoxEndpoint = `http://127.0.0.1:${firefoxPort}/rpc`;
          const error = new Error(
            `Chrome connector RPC endpoint is unavailable at ${chromeEndpoint} or ${firefoxEndpoint}.`,
          ) as Error & { code: string };
          error.code = "CHROME_CONNECTOR_UNAVAILABLE";
          throw error;
        }
      }

      if (deps.createClient) {
        client = deps.createClient(targetBrowser);
      } else if (targetBrowser) {
        client = createVerifiedChromeConnectorClient({
          client: createChromeConnectorClient({ browser: targetBrowser }),
          expectedBrowser: targetBrowser,
        });
      } else {
        client = createChromeConnectorClient();
      }
    }

    result = await client.request(spec.action, payload);
  } catch (error) {
    const code =
      typeof (error as { code?: unknown })?.code === "string"
        ? (error as { code: string }).code
        : "CHROME_COMMAND_FAILED";
    io.stderr(JSON.stringify({ ok: false, error: { code, message: toErrorMessage(error) } }, null, 2));
    return 1;
  }

  if (subcommand === "screenshot") {
    const out = readTrimmedOption(args, "--out");
    const dataUrl = (result as { dataUrl?: unknown })?.dataUrl;
    if (out && typeof dataUrl === "string") {
      const base64 = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;
      const bytes = Buffer.from(base64, "base64");
      try {
        await writeFile(out, bytes);
      } catch (error) {
        io.stderr(
          JSON.stringify(
            {
              ok: false,
              error: { code: "SCREENSHOT_WRITE_FAILED", message: toErrorMessage(error) },
            },
            null,
            2,
          ),
        );
        return 1;
      }
      io.stdout(JSON.stringify({ ok: true, result: { savedTo: out, bytes: bytes.byteLength } }, null, 2));
      return 0;
    }
  }

  // 审批待决时额外打一行稳定可 grep 的 approvalId：它一直嵌在 result 里，
  // 人或 agent 想“重试这次操作”都需要先把这个 id 抠出来。
  const pendingVerdict = result as { code?: unknown; approvalId?: unknown } | null;
  if (
    pendingVerdict &&
    pendingVerdict.code === "USER_APPROVAL_PENDING" &&
    typeof pendingVerdict.approvalId === "string" &&
    pendingVerdict.approvalId.length > 0
  ) {
    io.stdout(`approvalId: ${pendingVerdict.approvalId}`);
  }
  io.stdout(JSON.stringify({ ok: true, result }, null, 2));
  return 0;
}
