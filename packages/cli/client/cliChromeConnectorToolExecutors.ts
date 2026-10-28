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
 *
 * In-conversation approval: when the connector answers `USER_APPROVAL_PENDING` and this host has
 * somewhere to ask (`awaitHostApproval` injected, or a renderer registered by the TUI), the decision
 * is taken in the conversation and submitted host→connector — see `hostApprovalFlow.ts`. Without a
 * host approver the pending verdict is returned untouched (old behaviour, browser popup fallback).
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
  type ChromeConnectorClientSelector,
} from "../../desktop-chrome-connector/chromeConnector";
import {
  createConnectorApprovalPort,
  getHostApprovalRenderer,
  runConnectorToolWithHostApproval,
  type HostApprovalDecision,
  type HostApprovalCard,
  type HostApprovalRenderer,
} from "./hostApprovalFlow";

/**
 * The call's `target` argument, read the same way `executeChromeConnectorTool` reads it, so the
 * approval port talks to the same browser host the action will run in. Unparseable arguments yield
 * `undefined` (the ambient endpoint) — the executor itself will report the argument error.
 */
function approvalTargetForCall(
  call: AgentRuntimeToolCallInput,
): ChromeConnectorClientSelector {
  try {
    const parsed = JSON.parse(call.arguments || "{}");
    const raw = parsed?.target;
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim().toLowerCase();
    return trimmed === "chrome" || trimmed === "firefox" ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

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
 *
 * `awaitHostApproval` is the in-conversation approval hook: given the connector-supplied card it
 * resolves with the user's answer. Absent, a renderer registered through
 * `registerHostApprovalRenderer()` is used (read per call, so the TUI can install it after this
 * table is built). Absent both, `USER_APPROVAL_PENDING` is returned unchanged.
 */
export function buildCliChromeConnectorToolExecutors(args?: {
  client?: ChromeConnectorClient;
  /** Per-target client overrides (tests); entries missing here get real per-browser endpoints. */
  clients?: Partial<Record<"chrome" | "firefox", ChromeConnectorClient>>;
  /** Explicit host approver; wins over a renderer registered through the late-bound registry. */
  awaitHostApproval?: (card: HostApprovalCard) => Promise<HostApprovalDecision>;
}) {
  const clientForTarget = createChromeConnectorClientResolver({
    clients: {
      ...(args?.clients ?? {}),
      ...(args?.client
        ? { default: createVerifiedChromeConnectorClient({ client: args.client }) }
        : {}),
    },
  });
  const injectedApprover: HostApprovalRenderer | undefined = args?.awaitHostApproval;
  return Object.fromEntries(
    CHROME_CONNECTOR_ACCEPTED_TOOL_NAMES.map((toolName) => [
      toolName,
      (call: AgentRuntimeToolCallInput) => {
        const target = approvalTargetForCall(call);
        // Both the approval ops and the retry must use the browser this call names.
        const connector = createConnectorApprovalPort(() => clientForTarget(target));
        return runConnectorToolWithHostApproval({
          call,
          execute: (nextCall) =>
            executeChromeConnectorTool({ clientForTarget, call: nextCall }),
          connector,
          // Read the registry per call so a TUI that installs its renderer after the table is
          // built still gets approvals in the conversation; no host approver ⇒ undefined ⇒ the
          // pending verdict is returned untouched.
          awaitHostApproval: injectedApprover ?? getHostApprovalRenderer(),
        });
      },
    ]),
  ) as Record<
    ChromeConnectorToolName | ChromeConnectorLegacyToolName,
    (call: AgentRuntimeToolCallInput) => Promise<AgentRuntimeToolResult>
  >;
}
