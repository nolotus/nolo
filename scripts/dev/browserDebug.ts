import { spawnSync } from "node:child_process";
import { toErrorMessage } from "core/errorMessage";

type Command = "check" | "capture" | "mcp-config" | "help";

type CaptureOptions = {
  url: string;
  waitMs: number;
  bodyChars: number;
  debugGlobals: string[];
  authUser?: string;
  authUsername: string;
  headless: boolean;
};

const DEFAULT_WAIT_MS = 8000;
const DEFAULT_BODY_CHARS = 2400;

function printHelp() {
  console.log(
    [
      "bun run browser:debug commands:",
      "  bun run browser:debug check",
      "  bun run browser:debug mcp-config",
      "  bun run browser:debug capture <url> [--auth-user <userId>] [--auth-username <name>] [--globals a,b] [--wait-ms 8000] [--body-chars 2400] [--headed]",
      "",
      "Examples:",
      "  bun run browser:debug check",
      "  bun run browser:debug mcp-config",
      "  bun run browser:debug capture http://127.0.0.1:38123/life/content --auth-user 0e95801d90 --globals __myContentDebug,__myContentRecordsDebug",
    ].join("\n")
  );
}

function run(command: string, args: string[], timeoutMs = 15_000) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  });
}

function hasLocalChromeDevtoolsMcp(): boolean {
  const result = run("npx", ["--no-install", "chrome-devtools-mcp", "--help"]);
  return result.status === 0;
}

async function canLaunchChrome146(): Promise<{ ok: boolean; version?: string; error?: string }> {
  const script = [
    "const { chromium } = require('playwright');",
    "(async()=>{",
    "const browser=await chromium.launch({channel:'chrome',headless:true});",
    "console.log(browser.version());",
    "await browser.close();",
    "})().catch(error=>{console.error(error && error.stack || error); process.exit(1);});",
  ].join("");
  const result = run("node", ["-e", script], 30_000);

  if (result.status === 0) {
    return { ok: true, version: result.stdout.trim() || undefined };
  }

  {
    const error = result.error ?? result.stderr;
    return {
      ok: false,
      error: toErrorMessage(error),
    };
  }
}

async function check() {
  const chromeMcpAvailable = hasLocalChromeDevtoolsMcp();
  const chromeCheck = await canLaunchChrome146();
  const summary = {
    chromeDevtoolsMcpLocal: chromeMcpAvailable,
    chrome146Launchable: chromeCheck.ok,
    chromeVersion: chromeCheck.version ?? null,
    chromeLaunchError: chromeCheck.error ?? null,
    preferredPath: chromeMcpAvailable
      ? "chrome-devtools-mcp"
      : chromeCheck.ok
        ? "chrome-146-playwright-fallback"
        : "manual-browser-debug",
  };
  console.log(JSON.stringify(summary, null, 2));
  if (chromeMcpAvailable) {
    console.log(
      [
        "",
        "Preferred browser-debug path is available:",
        "  Chrome DevTools MCP (local)",
        "",
        "Suggested MCP client config:",
        JSON.stringify(
          {
            mcpServers: {
              "chrome-devtools": {
                command: "npx",
                args: ["chrome-devtools-mcp@latest"],
              },
            },
          },
          null,
          2
        ),
      ].join("\n")
    );
    return;
  }
  if (chromeCheck.ok) {
    console.log(
      [
        "",
        "Chrome DevTools MCP is not locally available.",
        "Fallback path is ready:",
        "  bun run browser:debug capture <url> --globals __myContentDebug,__myContentRecordsDebug",
      ].join("\n")
    );
    return;
  }
  console.log(
    [
      "",
      "Neither Chrome DevTools MCP nor Chrome 146 Playwright fallback is ready.",
      "Install/enable Chrome and then retry `bun run browser:debug check`.",
    ].join("\n")
  );
}

function printMcpConfig() {
  console.log(
    JSON.stringify(
      {
        mcpServers: {
          "chrome-devtools": {
            command: "npx",
            args: ["chrome-devtools-mcp@latest"],
          },
        },
      },
      null,
      2
    )
  );
}

function parseCaptureOptions(args: string[]): CaptureOptions {
  const url = args[0];
  if (!url) {
    throw new Error("capture requires a URL");
  }

  let waitMs = DEFAULT_WAIT_MS;
  let bodyChars = DEFAULT_BODY_CHARS;
  let debugGlobals: string[] = [];
  let authUser: string | undefined;
  let authUsername = "debug-user";
  let headless = true;

  for (let index = 1; index < args.length; index += 1) {
    const current = args[index];
    const next = args[index + 1];
    if (current === "--wait-ms" && next) {
      waitMs = Number(next) || DEFAULT_WAIT_MS;
      index += 1;
      continue;
    }
    if (current === "--body-chars" && next) {
      bodyChars = Number(next) || DEFAULT_BODY_CHARS;
      index += 1;
      continue;
    }
    if (current === "--globals" && next) {
      debugGlobals = next
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (current === "--auth-user" && next) {
      authUser = next.trim() || undefined;
      index += 1;
      continue;
    }
    if (current === "--auth-username" && next) {
      authUsername = next.trim() || authUsername;
      index += 1;
      continue;
    }
    if (current === "--headed") {
      headless = false;
      continue;
    }
    throw new Error(`Unknown capture argument: ${current}`);
  }

  return {
    url,
    waitMs,
    bodyChars,
    debugGlobals,
    authUser,
    authUsername,
    headless,
  };
}

async function capture(options: CaptureOptions) {
  const result = run(
    "node",
    ["./scripts/browserDebugCapture.cjs", JSON.stringify(options)],
    Math.max(45_000, options.waitMs + 40_000)
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`browser debug capture failed with exit code ${result.status}`);
  }
}

async function main() {
  const rawCommand = process.argv[2];
  if (rawCommand === undefined || rawCommand === "help" || rawCommand === "--help") {
    printHelp();
    return;
  }

  const command = rawCommand as Command;
  if (command === "check") {
    await check();
    return;
  }

  if (command === "mcp-config") {
    printMcpConfig();
    return;
  }

  if (command === "capture") {
    await capture(parseCaptureOptions(process.argv.slice(3)));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

await main();
