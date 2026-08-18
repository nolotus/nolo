import { describe, expect, test } from "bun:test";

import { buildDesktopAgentRuntimeReadiness } from "./desktopAgentRuntimeReadiness";
import type { DesktopProviderRuntimeSnapshot } from "./desktopLlamaRuntimeHandler";

function stoppedProviderSnapshot(): DesktopProviderRuntimeSnapshot {
  return {
    state: "stopped",
    baseUrl: "http://127.0.0.1:11434/v1",
    managedPid: null,
    watchPid: null,
    modelNames: [],
    logTail: [],
    health: null,
  };
}

function runningProviderSnapshot(): DesktopProviderRuntimeSnapshot {
  return {
    state: "running",
    baseUrl: "http://127.0.0.1:11434/v1",
    managedPid: 4242,
    watchPid: null,
    modelNames: ["qwen"],
    logTail: ["ready"],
    health: {
      healthy: true,
      baseUrl: "http://127.0.0.1:11434/v1",
      modelNames: ["qwen"],
      healthStatus: 200,
      modelStatus: 200,
    },
  };
}

describe("desktop agent runtime readiness", () => {
  test("treats the provider runtime snapshot as the local provider source of truth", () => {
    expect(buildDesktopAgentRuntimeReadiness({
      env: {
        NOLO_SERVER_DB_PATH: "/Users/example/Nolo/data/leveldb",
        OPENAI_API_KEY: "sk-local",
      },
      providerRuntimeSnapshot: stoppedProviderSnapshot(),
    })).toEqual({
      ok: true,
      host: "desktop",
      providerRuntimeState: "stopped",
      localCapabilities: ["agent-config", "persistence"],
      decision: {
        mode: "server",
        runnable: true,
        reason: "local runtime capabilities are missing; using server fallback",
        missingLocalCapabilities: ["provider"],
        syncAfterRun: false,
      },
      missingLocalCapabilities: ["provider"],
    });
  });

  test("reports local readiness when persistence exists and the provider runtime is actually running", () => {
    expect(buildDesktopAgentRuntimeReadiness({
      env: {
        NOLO_SERVER_DB_PATH: "/Users/example/Nolo/data/leveldb",
      },
      providerRuntimeSnapshot: runningProviderSnapshot(),
    })).toEqual({
      ok: true,
      host: "desktop",
      providerRuntimeState: "running",
      localCapabilities: ["agent-config", "provider", "persistence"],
      decision: {
        mode: "local",
        runnable: true,
        reason: "local runtime capabilities are available",
        missingLocalCapabilities: [],
        syncAfterRun: false,
      },
      missingLocalCapabilities: [],
    });
  });

  test("surfaces an in-flight desktop provider startup as not yet locally ready", () => {
    expect(buildDesktopAgentRuntimeReadiness({
      env: {
        NOLO_SERVER_DB_PATH: "/Users/example/Nolo/data/leveldb",
      },
      providerRuntimeSnapshot: {
        ...stoppedProviderSnapshot(),
        state: "starting",
      },
    })).toMatchObject({
      providerRuntimeState: "starting",
      decision: {
        mode: "server",
        missingLocalCapabilities: ["provider"],
      },
    });
  });
});
