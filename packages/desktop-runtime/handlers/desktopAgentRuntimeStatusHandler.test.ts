import { describe, expect, test } from "bun:test";

import {
  buildDesktopAgentRuntimeReadinessStatus,
  handleDesktopAgentRuntimeStatusGet,
} from "./desktopAgentRuntimeStatusHandler";

describe("desktop agent runtime status", () => {
  test("builds desktop agent runtime readiness from the provider runtime snapshot and shared runtime decision", async () => {
    await expect(buildDesktopAgentRuntimeReadinessStatus({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_SERVER_DB_PATH: "/Users/example/Nolo/data/leveldb",
        OPENAI_API_KEY: "sk-local",
      },
      readDesktopProviderRuntimeSnapshot: async () => ({
        state: "stopped",
        baseUrl: "http://127.0.0.1:11434/v1",
        managedPid: null,
        watchPid: null,
        modelNames: [],
        logTail: [],
        health: null,
      }),
    })).resolves.toEqual({
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

  test("serves desktop agent runtime status as JSON only inside desktop mode", async () => {
    const rejected = await handleDesktopAgentRuntimeStatusGet(new Request("http://local/status"), {
      env: {},
    });
    expect(rejected.status).toBe(404);

    const accepted = await handleDesktopAgentRuntimeStatusGet(new Request("http://local/status"), {
      env: {
        NOLO_DESKTOP: "1",
        NOLO_SERVER_DB_PATH: "/Users/example/Nolo/data/leveldb",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      readDesktopProviderRuntimeSnapshot: async () => ({
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
      }),
    });
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      ok: true,
      host: "desktop",
      providerRuntimeState: "running",
      decision: {
        runnable: true,
        reason: "local runtime capabilities are available",
      },
    });
  });
});
