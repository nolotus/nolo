/**
 * CLI projection of the Nolo Browser Connector executors (the `chrome_*` tool family).
 *
 * The CLI ships the `chrome_*` schemas but used to have no executor, so every call fell through to
 * `chromeConnectorUnavailableFunc` ("only executable in the Nolo desktop local runtime"). This module
 * closes that gap for TUI/local runs.
 *
 * Deliberately a mirror of `buildDesktopChromeConnectorToolExecutors` (desktop-runtime): both hosts
 * must delegate to the same `executeChromeConnectorTool` through the same verified client, otherwise
 * the extension-id check, protocol check and `features` enforcement would drift between TUI and
 * desktop. The executor-table test pins that both host tables answer `chrome_*` with a real
 * connector executor.
 */
import type {
  AgentRuntimeToolCallInput,
  AgentRuntimeToolResult,
} from "../../agent-runtime";
import {
  CHROME_CONNECTOR_TOOL_NAMES,
  type ChromeConnectorToolName,
} from "../../ai/tools/chromeConnectorTools";
import {
  createChromeConnectorClient,
  createVerifiedChromeConnectorClient,
  executeChromeConnectorTool,
  type ChromeConnectorClient,
} from "../../desktop-chrome-connector/chromeConnector";

/**
 * Builds the `chrome_*` executor entries for the CLI local tool table.
 *
 * `client` is injectable so tests (and future TUI hosts that already hold a connection) can drive the
 * table without reaching 127.0.0.1. When absent, the verified client is created lazily — the
 * `connector_info` handshake only happens on the first `chrome_*` call, never at table-build time.
 */
export function buildCliChromeConnectorToolExecutors(args?: {
  client?: ChromeConnectorClient;
}) {
  const client = createVerifiedChromeConnectorClient({
    client: args?.client ?? createChromeConnectorClient(),
  });
  return Object.fromEntries(
    CHROME_CONNECTOR_TOOL_NAMES.map((toolName) => [
      toolName,
      (call: AgentRuntimeToolCallInput) =>
        executeChromeConnectorTool({ client, call }),
    ]),
  ) as Record<
    ChromeConnectorToolName,
    (call: AgentRuntimeToolCallInput) => Promise<AgentRuntimeToolResult>
  >;
}
