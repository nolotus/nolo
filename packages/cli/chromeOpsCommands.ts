/**
 * `nolo chrome <op>` — the operation half of the nolo chrome group: read / click / type
 * against the user's live Chrome (the machine-setup half — status / install / reload —
 * lives in chromeCommands.ts).
 *
 * A thin CLI surface over the connector RPC (127.0.0.1:38947, token-authenticated):
 * the same bridge the desktop runtime exposes to agents as the chrome_* tools, made
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
  io?: Partial<ChromeIo>;
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
    throw new Error(`Invalid ${flag} <N>. Usage: ${usage}`);
  }
  return value;
}

function requireTabId(args: string[], usage: string): string {
  const tabId = readTrimmedOption(args, "--tab");
  if (!tabId) {
    throw new Error(`Missing required --tab <id>. Usage: ${usage}`);
  }
  return tabId;
}

function requireTarget(args: string[], usage: string): ChromeConnectorRequestPayload {
  const elementRef = readTrimmedOption(args, "--ref");
  const selector = readTrimmedOption(args, "--selector");
  if (!elementRef && !selector) {
    throw new Error(
      `Provide --ref <elementRef> (from read-page) or --selector <css>. Usage: ${usage}`,
    );
  }
  return {
    ...(elementRef ? { elementRef } : {}),
    ...(selector ? { selector } : {}),
  };
}

export const CHROME_OPS_SUBCOMMANDS: Record<string, ChromeSubcommandSpec> = {
  "list-tabs": {
    action: "list_tabs",
    usage: "nolo chrome list-tabs",
    payload: () => ({}),
  },
  "open-tab": {
    action: "open_tab",
    usage: "nolo chrome open-tab --url <url> [--active]",
    payload: (args, usage) => {
      const url = readTrimmedOption(args, "--url");
      if (!url) {
        throw new Error(`Missing required --url <url>. Usage: ${usage}`);
      }
      return { url, active: args.includes("--active") };
    },
  },
  "close-tab": {
    action: "close_tab",
    usage: "nolo chrome close-tab --tab <id>",
    payload: (args, usage) => ({ tabId: requireTabId(args, usage) }),
  },
  "read-page": {
    action: "read_page",
    usage:
      "nolo chrome read-page --tab <id> [--selector <css>] [--detail compact|full] [--max-elements N]",
    payload: (args, usage) => {
      const payload: ChromeConnectorRequestPayload = { tabId: requireTabId(args, usage) };
      const selector = readTrimmedOption(args, "--selector");
      if (selector) payload.selector = selector;
      const detail = readTrimmedOption(args, "--detail");
      if (detail) payload.detail = detail;
      const maxElements = readIntOption(args, "--max-elements", usage);
      if (maxElements !== undefined) payload.maxElements = maxElements;
      return payload;
    },
  },
  click: {
    action: "click",
    usage: "nolo chrome click --tab <id> (--ref <elementRef> | --selector <css>)",
    payload: (args, usage) => ({
      tabId: requireTabId(args, usage),
      ...requireTarget(args, usage),
    }),
  },
  type: {
    action: "type",
    usage:
      "nolo chrome type --tab <id> (--ref <elementRef> | --selector <css>) --text <text> [--append]",
    payload: (args, usage) => {
      const text = readOption(args, "--text");
      // A value that starts with "--" is a swallowed flag, not text: fail instead of
      // typing "--append" into the page (and clearing the field on the way).
      if (text === undefined || text.startsWith("--")) {
        throw new Error(`Missing required --text <text>. Usage: ${usage}`);
      }
      return {
        tabId: requireTabId(args, usage),
        ...requireTarget(args, usage),
        text,
        ...(args.includes("--append") ? { clearFirst: false } : {}),
      };
    },
  },
  upload: {
    action: "set_files",
    usage:
      "nolo chrome upload --tab <id> (--ref <elementRef> | --selector <css>) --file <path> [--file <path>...]",
    payload: (args, usage) => {
      const files = readAllOptions(args, "--file");
      if (files.length === 0) {
        throw new Error(`Missing required --file <path>. Usage: ${usage}`);
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
    usage: "nolo chrome press --tab <id> --key <key>",
    payload: (args, usage) => {
      const key = readTrimmedOption(args, "--key");
      if (!key) {
        throw new Error(`Missing required --key <key>. Usage: ${usage}`);
      }
      return { tabId: requireTabId(args, usage), key };
    },
  },
  scroll: {
    action: "scroll",
    usage: "nolo chrome scroll --tab <id> [--delta-x N] [--delta-y N]",
    payload: (args, usage) => {
      const payload: ChromeConnectorRequestPayload = { tabId: requireTabId(args, usage) };
      const deltaX = readIntOption(args, "--delta-x", usage);
      const deltaY = readIntOption(args, "--delta-y", usage);
      if (deltaX !== undefined) payload.deltaX = deltaX;
      if (deltaY !== undefined) payload.deltaY = deltaY;
      return payload;
    },
  },
  screenshot: {
    action: "screenshot",
    usage: "nolo chrome screenshot --tab <id> [--out <path>] [--full-page]",
    payload: (args, usage) => ({
      tabId: requireTabId(args, usage),
      ...(args.includes("--full-page") ? { fullPage: true } : {}),
    }),
  },
  "read-console": {
    action: "read_console",
    usage: "nolo chrome read-console --tab <id> [--limit N]",
    payload: (args, usage) => {
      const payload: ChromeConnectorRequestPayload = { tabId: requireTabId(args, usage) };
      const limit = readIntOption(args, "--limit", usage);
      if (limit !== undefined) payload.limit = limit;
      return payload;
    },
  },
  "read-network": {
    action: "read_network",
    usage: "nolo chrome read-network --tab <id> [--limit N] [--include-assets]",
    payload: (args, usage) => {
      const payload: ChromeConnectorRequestPayload = { tabId: requireTabId(args, usage) };
      const limit = readIntOption(args, "--limit", usage);
      if (limit !== undefined) payload.limit = limit;
      if (args.includes("--include-assets")) payload.includeAssets = true;
      return payload;
    },
  },
};

export function renderChromeOpsHelp(): string {
  const lines = [
    "Operate the user's Chrome through the Nolo Chrome connector (the desktop bridge;",
    "the same RPC the chrome_* agent tools use).",
    "",
    "Usage:",
    "  nolo chrome <subcommand> [flags]",
    "",
    "Subcommands:",
    ...Object.values(CHROME_OPS_SUBCOMMANDS).map(
      (spec) => `  ${spec.usage.replace(/^nolo chrome /, "")}`,
    ),
    "",
    "Notes:",
    "  --ref takes an elementRef copied from `nolo chrome read-page` (revision-scoped,",
    "    preferred over --selector); --selector takes a CSS selector.",
    "  Actions the connector classifies as irreversible (Submit / Delete / Pay ...)",
    "    are refused with CONFIRMATION_REQUIRED — ask the user to perform them.",
    "  Every subcommand prints the connector's raw JSON result; failures exit 1.",
    "  Endpoint: NOLO_CHROME_CONNECTOR_RPC_URL or http://127.0.0.1:38947/rpc.",
  ];
  return lines.join("\n");
}

export const CHROME_OPS_HELP_TEXT = renderChromeOpsHelp();

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
    io.stderr(`Unknown chrome subcommand: ${subcommand}\n\n${CHROME_OPS_HELP_TEXT}`);
    return 1;
  }
  if (wantsHelp(args)) {
    io.stdout(CHROME_OPS_HELP_TEXT);
    return 0;
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
    const client = deps.client ?? createChromeConnectorClient();
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

  io.stdout(JSON.stringify({ ok: true, result }, null, 2));
  return 0;
}
