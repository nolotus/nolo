// Side-effect dependency: ESM evaluates this before the host's other application
// imports. Keep protocol imports themselves cheap for non-agent CLI commands.
import { initializeHostRuntimeIdentity } from "./agentRunProtocol";
initializeHostRuntimeIdentity();
