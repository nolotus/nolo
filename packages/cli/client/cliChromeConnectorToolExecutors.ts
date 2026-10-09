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
  CHROME_CONNECTOR_ACCEPTED_TOOL_NAMES,
  type ChromeConnectorToolName,
  type ChromeConnectorLegacyToolName,
} from "../../ai/tools/chromeConnectorTools";
import {
  createChromeConnectorClientResolver,
  createVerifiedChromeConnectorClient,
  executeChromeConnectorTool,
  type ChromeConnectorClient,
} from "../../desktop-chrome-connector/chromeConnector";

/**
 * Builds the `chrome_*` executor entries for the CLI local tool table.
 *
 * Routing is per call: the resolver holds one verified client per browser target (lazily created —
 * the `connector_info` handshake only happens on the first `chrome_*` call for that browser, never
 * at table-build time), so `{target: "firefox"}` really reaches the Firefox host instead of being
 * silently served by a pinned Chrome client.
 *
 * `client` is injectable so tests (and future TUI hosts that already hold a connection) can drive
 * target-less calls without reaching 127.0.0.1; it is wrapped in the same verified client as the
 * production default so the handshake/feature gate cannot drift. An explicit `target` still routes
 * to that browser's own endpoint — an injected client never swallows a routing request.
 */
export function buildCliChromeConnectorToolExecutors(args?: {
  client?: ChromeConnectorClient;
  /** Per-target client overrides (tests); entries missing here get real per-browser endpoints. */
  clients?: Partial<Record<"chrome" | "firefox", ChromeConnectorClient>>;
}) {
  const clientForTarget = createChromeConnectorClientResolver({
    clients: {
      ...(args?.clients ?? {}),
      ...(args?.client
        ? { default: createVerifiedChromeConnectorClient({ client: args.client }) }
        : {}),
    },
  });
  return Object.fromEntries(
    CHROME_CONNECTOR_ACCEPTED_TOOL_NAMES.map((toolName) => [
      toolName,
      (call: AgentRuntimeToolCallInput) =>
        executeChromeConnectorTool({ clientForTarget, call }),
    ]),
  ) as Record<
    ChromeConnectorToolName | ChromeConnectorLegacyToolName,
    (call: AgentRuntimeToolCallInput) => Promise<AgentRuntimeToolResult>
  >;
}
