import { createArgsCommand, createEnvCommand } from "./cliCommandFactories";
import type { CommandEntry } from "./cliCommandTypes";

/**
 * `nolo browser ...` (legacy alias: `nolo chrome ...`) — machine-local Nolo Browser Connector commands, in two halves:
 *
 * - setup (status / install / reload): run once per machine, outside any agent run;
 *   implementation in chromeCommands.ts.
 * - operations (list-tabs / read-page / click / ...): drive the user's live browser from
 *   scripts and the TUI; implementation in chromeOpsCommands.ts.
 */
const CHROME_OPS_SUBCOMMANDS: Array<{ name: string; summary: string }> = [
  { name: "list-tabs", summary: "List controllable browser tabs" },
  { name: "open-tab", summary: "Open a URL in a new tab (--url <url> [--active])" },
  { name: "close-tab", summary: "Close a tab (--tab <id>)" },
  {
    name: "read-page",
    summary:
      "Read a tab's text and interactive elements as elementRefs (--tab <id> [--offset N] [--viewport])",
  },
  { name: "click", summary: "Click an element (--tab <id> --ref|--selector)" },
  {
    name: "type",
    summary: "Type text into an element (--tab <id> --ref|--selector --text <text>)",
  },
  {
    name: "upload",
    summary:
      "Upload files to a file input element (--tab <id> --ref|--selector --file <path>)",
  },
  { name: "press", summary: "Press a keyboard key (--tab <id> --key <key>)" },
  { name: "scroll", summary: "Scroll a tab (--tab <id> [--delta-x N] [--delta-y N])" },
  { name: "screenshot", summary: "Capture a screenshot (--tab <id> [--out <path>])" },
  { name: "read-console", summary: "Read recent console entries (--tab <id>)" },
  { name: "read-network", summary: "Read recent network entries (--tab <id>)" },
];

function getBrowserFamilyEntries(): CommandEntry[] {
  return [
    createEnvCommand(
      ["browser", "status"],
      "Show Nolo Browser Connector status (native host manifest, token, live connection)",
      async (args, deps) => {
        const { runChromeStatusCommand } = await import("./chromeCommands");
        return runChromeStatusCommand(args, deps);
      },
    ),
    createEnvCommand(
      ["browser", "install"],
      "Install the native messaging host manifest for this user (--browser chrome|firefox)",
      async (args, deps) => {
        const { runChromeInstallCommand } = await import("./chromeCommands");
        return runChromeInstallCommand(args, deps);
      },
    ),
    createEnvCommand(
      ["browser", "reload"],
      "Reload the connector extension through the running native host",
      async (args, deps) => {
        const { runChromeReloadCommand } = await import("./chromeCommands");
        return runChromeReloadCommand(args, deps);
      },
    ),
    ...CHROME_OPS_SUBCOMMANDS.map(({ name, summary }) =>
      createArgsCommand(["browser", name], summary, async (args) => {
        const { runChromeOpsCommand } = await import("./chromeOpsCommands");
        return runChromeOpsCommand(name, args);
      }),
    ),
  ];
}

/**
 * `nolo browser ...` (main) plus its full-equivalent compatibility alias `nolo chrome ...`. The alias entries
 * reuse the very same handler function objects as their browser counterparts (one implementation).
 */
export function getChromeInternalCommandEntries(): CommandEntry[] {
  const browserEntries = getBrowserFamilyEntries();
  const chromeEntries: CommandEntry[] = browserEntries.map((entry) => ({
    ...entry,
    path: ["chrome", ...entry.path.slice(1)],
    description: `${entry.description} (Compatibility alias of \`nolo browser ${entry.path.slice(1).join(" ")}\`)`,
  }));
  return [...browserEntries, ...chromeEntries];
}
