import {
  resolveAgentRuntimeDecision,
  type AgentRuntimeDecision,
} from "agent-runtime";
import type {
  DesktopProviderRuntimeSnapshot,
} from "./desktopLlamaRuntimeHandler";
import type { DesktopAgentRuntimeEnv } from "./desktopAgentRuntimeHostCapabilities";

export type DesktopAgentRuntimeReadinessStatus = {
  ok: true;
  host: "desktop";
  providerRuntimeState: DesktopProviderRuntimeSnapshot["state"];
  localCapabilities: string[];
  decision: AgentRuntimeDecision;
  missingLocalCapabilities: string[];
};

function hasDesktopLocalPersistence(env: DesktopAgentRuntimeEnv) {
  return Boolean(env.NOLO_SERVER_DB_PATH?.trim());
}

function isDesktopProviderRuntimeReady(snapshot: DesktopProviderRuntimeSnapshot) {
  return snapshot.state === "running";
}

export function buildDesktopAgentRuntimeReadiness(args: {
  env: DesktopAgentRuntimeEnv;
  providerRuntimeSnapshot: DesktopProviderRuntimeSnapshot;
}): DesktopAgentRuntimeReadinessStatus {
  const hasLocalPersistence = hasDesktopLocalPersistence(args.env);
  const hasLocalAgentConfig = hasLocalPersistence;
  const hasLocalProvider = isDesktopProviderRuntimeReady(args.providerRuntimeSnapshot);
  const localCapabilities = [
    ...(hasLocalAgentConfig ? ["agent-config"] : []),
    ...(hasLocalProvider ? ["provider"] : []),
    ...(hasLocalPersistence ? ["persistence"] : []),
  ];
  const decision = resolveAgentRuntimeDecision({
    host: "desktop",
    syncRequested: false,
    hasLocalAgentConfig,
    hasLocalProvider,
    hasLocalPersistence,
    missingLocalCapabilities: [
      ...(hasLocalAgentConfig ? [] : ["agent-config"]),
      ...(hasLocalProvider ? [] : ["provider"]),
      ...(hasLocalPersistence ? [] : ["persistence"]),
    ],
    requiresServer: false,
    serverFallbackAvailable: true,
  });

  return {
    ok: true,
    host: "desktop",
    providerRuntimeState: args.providerRuntimeSnapshot.state,
    localCapabilities,
    decision,
    missingLocalCapabilities: decision.missingLocalCapabilities,
  };
}
