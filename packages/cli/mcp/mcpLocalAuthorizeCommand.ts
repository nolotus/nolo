import { openMcpLocalManagement } from "./mcpLocalRuntimeAdapter";
import { createDefaultMcpLocalOAuthManager } from "./mcpLocalOAuthHost";
import { createStrictHostCredentialBroker } from "../../agent-runtime/desktopHostCredentialBroker";
import { resolveLocalUserId } from "../client/cliAgentConfigHelpers";
/** Host terminal command only. No model executor, implicit registration or browser launch. */
export async function runMcpLocalAuthorizeCommand(args: string[], env: Record<string, string | undefined>) {
 const [id, revisionText, ...flags] = args;
 const revision = Number(revisionText);
 const register = flags.length === 1 && flags[0] === "--register";
 const clientId = flags.length === 2 && flags[0] === "--client-id" ? flags[1] : undefined;
 if (!id || !Number.isSafeInteger(revision) || revision < 1 || (!register && !clientId)) {
  process.stderr.write("Usage: nolo mcp local authorize ID REV (--register | --client-id CLIENT_ID)\nNo registration was requested. --register explicitly permits dynamic client registration.\n"); return 1;
 }
 const broker = createStrictHostCredentialBroker({ env }); const authenticatedUserId = resolveLocalUserId(env);
 const repository = await openMcpLocalManagement({ authenticatedUserId, broker, env });
 const loaded = await repository.loadForUse({ authenticatedUserId, connectionId: id, expectedRevision: revision, placement: { kind: "local" } });
 if (!loaded.ok || loaded.value.auth.kind !== "oauth") { process.stderr.write("oauth_connection_unavailable\n"); return 1; }
 const controller = new AbortController();
 const cancel = () => controller.abort(); process.once("SIGINT", cancel); process.once("SIGTERM", cancel);
 let timedOut = false;
 const timeout = setTimeout(() => { timedOut = true; cancel(); }, 180_000);
 const ctx = { authenticatedUserId, connection: loaded.value, signal: controller.signal };
 const manager = createDefaultMcpLocalOAuthManager({ authenticatedUserId, broker, repository });
 let attempt: string | undefined;
 try {
  const start = await manager.beginAuthorization(ctx, register ? { register: true } : { clientId: clientId! }); attempt = start.attemptId;
  process.stdout.write(`Open this public authorization link yourself. Requested permissions include Zoho Mail accounts/folders/messages reading, zohomail.messages.create (message creation), and ZohoMCP.tool.execute (MCP tool execution). This is not read-only authorization and does not itself permit local sending tools. Review the actual consent page yourself; if it shows broader permissions, decide whether to proceed or cancel. Local tool allowlists remain separate:\n${start.authorizationUrl}\nWaiting up to 180 seconds for the local callback. Press Ctrl-C to cancel.\n`);
  const outcome = await start.completion;
  if (outcome === "completed" && !controller.signal.aborted) {
   process.stdout.write("OAuth token stored in the strict local credential broker. Email access has not been tested.\n"); return 0;
  }
  if (outcome === "failed") {
   const failure = await manager.getAttemptFailure(ctx, start.attemptId);
   process.stderr.write(`oauth_authorization_failed stage=${failure?.stage ?? "callback_validation"} code=${failure?.code ?? "oauth_stage_failed"}${failure?.scope ? ` scope=${JSON.stringify(failure.scope)}` : ""}\n`);
  } else process.stderr.write(timedOut || outcome === "timeout" ? "oauth_timeout\n" : "oauth_cancelled\n");
  return 1;
 } catch { process.stderr.write("oauth_authorization_failed\n"); return 1; }
 finally { clearTimeout(timeout); if (attempt) await manager.cancelAuthorization(ctx, attempt).catch(() => {}); process.removeListener("SIGINT", cancel); process.removeListener("SIGTERM", cancel); }
}
