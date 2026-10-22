import {
  buildExecutionTicket,
  type ExecutionClass,
  type ExecutionTicket,
} from "../executionBackend";
import type { AgentRunGrant } from "../runGrant";

/**
 * One accepted Agent execution gets one stable primary ticket identity.
 *
 * This is deterministic from RunGrant identity so retries/tool calls do not
 * mint sibling authority objects. Future delegated/subprocess tickets may use
 * separate child ids while retaining the same grantId.
 */
export function buildPrimaryExecutionTicket(
  runGrant: AgentRunGrant,
  executionClass: ExecutionClass = "session",
): ExecutionTicket {
  return buildExecutionTicket({
    runGrant,
    ticketId: `${runGrant.grantId}:primary`,
    executionClass,
  });
}
