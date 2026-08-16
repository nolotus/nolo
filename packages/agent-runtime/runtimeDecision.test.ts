import { describe, expect, test } from "bun:test";

import { AGENT_RUNTIME_PACKAGE_ID } from ".";
import { resolveAgentRuntimeDecision } from "./runtimeDecision";
import { buildAgentRuntimeDecisionInput } from "./runtimeFacts";
import type { AgentRuntimeMode } from "./types";

describe("agent-runtime package skeleton", () => {
  test("exports runtime modes as pure types", () => {
    const mode: AgentRuntimeMode = "local";

    expect(mode).toBe("local");
  });

  test("exports a side-effect-free package marker", () => {
    expect(AGENT_RUNTIME_PACKAGE_ID).toBe("agent-runtime");
  });
});

describe("resolveAgentRuntimeDecision", () => {
  test("uses shared host capability facts for CLI/Desktop/Web runtime selection", () => {
    const input = buildAgentRuntimeDecisionInput({
      host: "desktop",
      requestedMode: "auto",
      capabilities: ["leveldb-agent-config", "local-provider", "leveldb-persistence"],
      serverFallbackAvailable: true,
    });

    expect(resolveAgentRuntimeDecision(input)).toMatchObject({
      mode: "local",
      runnable: true,
      missingLocalCapabilities: [],
    });
  });

  test("normalizes missing local capabilities for web host facts", () => {
    const input = buildAgentRuntimeDecisionInput({
      host: "web",
      requestedMode: "auto",
      capabilities: ["leveldb-agent-config"],
      serverFallbackAvailable: true,
    });

    expect(input).toMatchObject({
      hasLocalAgentConfig: true,
      hasLocalProvider: false,
      hasLocalPersistence: false,
      missingLocalCapabilities: ["provider", "persistence"],
    });
    expect(resolveAgentRuntimeDecision(input)).toMatchObject({
      mode: "server",
      missingLocalCapabilities: ["provider", "persistence", "local-host-adapter"],
    });
  });

  test("chooses local when local facts are complete", () => {
    expect(resolveAgentRuntimeDecision({
      requestedMode: "auto",
      syncRequested: false,
      hasLocalAgentConfig: true,
      hasLocalProvider: true,
      hasLocalPersistence: true,
      missingLocalCapabilities: [],
      requiresServer: false,
      serverFallbackAvailable: true,
    })).toMatchObject({
      mode: "local",
      runnable: true,
      syncAfterRun: false,
      missingLocalCapabilities: [],
    });
  });

  test("falls back to server when local provider is missing", () => {
    expect(resolveAgentRuntimeDecision({
      requestedMode: "auto",
      syncRequested: false,
      hasLocalAgentConfig: true,
      hasLocalProvider: false,
      hasLocalPersistence: true,
      missingLocalCapabilities: ["provider"],
      requiresServer: false,
      serverFallbackAvailable: true,
    })).toMatchObject({
      mode: "server",
      runnable: true,
      missingLocalCapabilities: ["provider"],
    });
  });

  test("forced local fails closed instead of falling back", () => {
    expect(resolveAgentRuntimeDecision({
      requestedMode: "local",
      syncRequested: false,
      hasLocalAgentConfig: false,
      hasLocalProvider: false,
      hasLocalPersistence: true,
      missingLocalCapabilities: ["agent-config", "provider"],
      requiresServer: false,
      serverFallbackAvailable: true,
    })).toMatchObject({
      mode: "local",
      runnable: false,
      missingLocalCapabilities: ["agent-config", "provider"],
    });
  });

  test("web host cannot execute local privileged runtime directly", () => {
    expect(resolveAgentRuntimeDecision({
      requestedMode: "auto",
      syncRequested: false,
      host: "web",
      hasLocalAgentConfig: true,
      hasLocalProvider: true,
      hasLocalPersistence: true,
      missingLocalCapabilities: [],
      requiresServer: false,
      serverFallbackAvailable: true,
    })).toMatchObject({
      mode: "server",
      runnable: true,
      missingLocalCapabilities: ["local-host-adapter"],
    });
  });

  test("forced server stays server even when local facts are complete", () => {
    expect(resolveAgentRuntimeDecision({
      requestedMode: "server",
      syncRequested: true,
      host: "cli",
      hasLocalAgentConfig: true,
      hasLocalProvider: true,
      hasLocalPersistence: true,
      missingLocalCapabilities: [],
      requiresServer: false,
      serverFallbackAvailable: true,
    })).toMatchObject({
      mode: "server",
      runnable: true,
      syncAfterRun: false,
      missingLocalCapabilities: [],
    });
  });

});
