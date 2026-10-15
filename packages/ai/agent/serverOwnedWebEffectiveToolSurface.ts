import type { RootState } from "app/store";
import type { Agent } from "app/types";
import {
  readEffectiveToolName,
  resolveEffectiveToolSurface,
  type EffectiveToolSurface,
  type EffectiveToolSurfaceEntry,
} from "ai/tools/effectiveToolSurface";
import { mergeAgentToolsWithRuntime } from "./streamAgentChatTurnUtils";
import type { AgentRuntimeOptions } from "./types";
import type { TurnToolContext } from "./turnToolContext";

/**
 * Resolve the exact Web tool surface visible to the model at foreground
 * admission time without recreating Web host policy.
 *
 * `mergeAgentToolsWithRuntime` remains the host truth for defaults, global
 * capability switches, view-mode adjustments and disabledTools. The shared
 * effective-surface resolver contributes canonical requested provenance; the
 * final merged `tools` list is authoritative for what actually survived every
 * Web filter.
 *
 * Consumes `TurnToolContext` to account for turn-level referenced tools,
 * mentioned tools, and cross-turn loaded skills at admission time.
 */
export function resolveServerOwnedWebEffectiveToolSurface(args: {
  agentConfig: Agent;
  runtimeOptions?: AgentRuntimeOptions | null;
  state: RootState;
  turnToolContext?: TurnToolContext | null;
}): EffectiveToolSurface {
  const referencedToolNames = args.turnToolContext?.referencedToolNames ?? [];
  const mentionedToolNames = args.turnToolContext?.mentionedToolNames ?? [];

  const requested = resolveEffectiveToolSurface({
    agent: args.agentConfig as any,
    referencedToolNames,
    mentionedToolNames,
    runtimeExtraToolNames: args.runtimeOptions?.extraTools ?? [],
  });

  const mergedAgent = mergeAgentToolsWithRuntime(
    args.agentConfig,
    referencedToolNames,
    mentionedToolNames,
    args.runtimeOptions ?? undefined,
    args.state,
  );
  const rawNames = (Array.isArray((mergedAgent as any).tools) ? (mergedAgent as any).tools : [])
    .map(readEffectiveToolName)
    .filter((name: unknown): name is string => typeof name === "string" && !!name);
  const finalNames: string[] = Array.from(new Set(rawNames));
  const finalSet = new Set<string>(finalNames);
  const requestedSet = new Set<string>(requested.requestedNames);
  const requestedNames: string[] = requested.requestedNames.filter((name: string) => finalSet.has(name));
  const hostInjectedNames: string[] = finalNames.filter((name: string) => !requestedSet.has(name));

  const hostResolved = resolveEffectiveToolSurface({
    agent: args.agentConfig as any,
    referencedToolNames,
    mentionedToolNames,
    hostInjectedToolNames: hostInjectedNames,
    runtimeExtraToolNames: args.runtimeOptions?.extraTools ?? [],
  });
  const entryByName = new Map(hostResolved.entries.map((entry) => [entry.name, entry]));
  const entries: EffectiveToolSurfaceEntry[] = finalNames.flatMap((name: string) => {
    const entry = entryByName.get(name);
    return entry ? [entry] : [];
  });

  return {
    names: finalNames,
    entries,
    requestedNames,
    hostInjectedNames,
    shellEnabled: hostResolved.shellEnabled,
    workspaceModes: hostResolved.workspaceModes,
    workspaceLease: hostResolved.workspaceLease,
  };
}
