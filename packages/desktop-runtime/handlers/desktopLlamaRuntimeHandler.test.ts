import { afterEach, describe, expect, it } from "bun:test";

import type { DesktopLlamaRuntimeSnapshot } from "@nolo/llama-runtime";
import {
  configureDesktopLocalProviderEnv,
  createDesktopLlamaRuntimeHandlers,
  handleDesktopLlamaRuntimeGet,
  handleDesktopLlamaRuntimePost,
  resolveDesktopLlamaSupervisorLogDir,
} from "./desktopLlamaRuntimeHandler";

describe("desktopLlamaRuntimeHandler", () => {
  const stoppedSnapshot = (): DesktopLlamaRuntimeSnapshot => ({
    state: "stopped",
    baseUrl: "http://127.0.0.1:8080",
    managedPid: null,
    watchPid: null,
    modelNames: [],
    logTail: [],
    health: null,
  });

  const settledStart = async () => ({
    status: stoppedSnapshot(),
    startupTask: null,
  });

  const waitFor = async <T>(
    readValue: () => Promise<T | null>,
    { timeoutMs = 1_000, pollIntervalMs = 10 } = {},
  ): Promise<T> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const value = await readValue();
      if (value !== null) {
        return value;
      }
      await Bun.sleep(pollIntervalMs);
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`);
  };

  afterEach(() => {
    delete process.env.NOLO_DESKTOP;
    delete process.env.NOLO_LOCAL_OPENAI_BASE_URL;
    delete process.env.NOLO_LOCAL_LLM;
  });

  it("rejects requests outside desktop mode", async () => {
    const previous = process.env.NOLO_DESKTOP;
    try {
      delete process.env.NOLO_DESKTOP;

      const response = await handleDesktopLlamaRuntimeGet();

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "Desktop llama runtime is only available inside Nolo Desktop.",
      });
    } finally {
      if (previous !== undefined) {
        process.env.NOLO_DESKTOP = previous;
      } else {
        delete process.env.NOLO_DESKTOP;
      }
    }
  });

  it("returns desktop runtime status in desktop mode", async () => {
    const handlers = createDesktopLlamaRuntimeHandlers({
      isDesktopMode: () => true,
      controller: {
        status: async () => ({
          state: "running",
          baseUrl: "http://127.0.0.1:8080",
          managedPid: 4242,
          watchPid: 5252,
          modelNames: ["qwen"],
          logTail: ["ready"],
          health: {
            healthy: true,
            baseUrl: "http://127.0.0.1:8080",
            healthStatus: 200,
            modelStatus: 200,
            modelNames: ["qwen"],
          },
        }),
        stop: async () => ({ managedPid: null }),
        start: settledStart,
      },
    });

    const response = await handlers.handleGet();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      state: "running",
      managedPid: 4242,
      watchPid: 5252,
      modelNames: ["qwen"],
    });
  });

  it("stops synchronously with an accurate response code", async () => {
    let stopCalls = 0;
    const handlers = createDesktopLlamaRuntimeHandlers({
      isDesktopMode: () => true,
      controller: {
        status: async () => stoppedSnapshot(),
        stop: async () => {
          stopCalls += 1;
          return { managedPid: 31337 };
        },
        start: settledStart,
      },
    });

    const response = await handlers.handlePost(
      new Request("http://localhost/api/desktop/provider-runtime", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      }),
    );

    expect(stopCalls).toBe(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ managedPid: 31337 });
  });

  it("accepts start immediately and reports starting while the task is active", async () => {
    const startGate = {
      resolve: null as null | (() => void),
    };
    let startCalls = 0;
    const handlers = createDesktopLlamaRuntimeHandlers({
      isDesktopMode: () => true,
      controller: {
        status: async () => ({
          ...stoppedSnapshot(),
        }),
        stop: async () => ({ managedPid: null }),
        start: async () => {
          startCalls += 1;
          const startupTask = new Promise<void>((resolve) => {
            startGate.resolve = resolve;
          });
          return {
            status: stoppedSnapshot(),
            startupTask,
          };
        },
      },
    });

    const response = await handlers.handlePost(
      new Request("http://localhost/api/desktop/provider-runtime", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      }),
    );

    expect(startCalls).toBe(1);
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      accepted: true,
      state: "starting",
      baseUrl: "http://127.0.0.1:8080",
    });

    const statusResponse = await handlers.handleGet();
    await expect(statusResponse.json()).resolves.toMatchObject({
      state: "starting",
      baseUrl: "http://127.0.0.1:8080",
    });

    const secondStartResponse = await handlers.handlePost(
      new Request("http://localhost/api/desktop/provider-runtime", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      }),
    );

    expect(startCalls).toBe(1);
    expect(secondStartResponse.status).toBe(202);

    startGate.resolve?.();
  });

  it("configures the desktop agent runtime provider from the resolved llama endpoint", () => {
    configureDesktopLocalProviderEnv({
      host: "127.0.0.1",
      port: 18080,
    });

    expect(process.env.NOLO_LOCAL_OPENAI_BASE_URL).toBe("http://127.0.0.1:18080/v1");
    expect(process.env.NOLO_LOCAL_LLM).toBe("direct");
  });

  it("derives the stable llama supervisor log dir from the desktop db path", () => {
    expect(
      resolveDesktopLlamaSupervisorLogDir({
        NOLO_SERVER_DB_PATH:
          "D:\\Users\\tester\\AppData\\Local\\chat.nolo.desktop\\stable\\data\\leveldb",
      })
    ).toBe(
      "D:\\Users\\tester\\AppData\\Local\\chat.nolo.desktop\\stable\\logs\\llama-supervisor"
    );
    expect(resolveDesktopLlamaSupervisorLogDir({})).toBeNull();
  });

  it("treats configured desktop status checks as a local provider source", async () => {
    const handlers = createDesktopLlamaRuntimeHandlers({
      isDesktopMode: () => true,
      env: {
        NOLO_DESKTOP: "1",
        NOLO_SERVER_DB_PATH:
          "D:\\Users\\tester\\AppData\\Local\\chat.nolo.desktop\\stable\\data\\leveldb",
      },
      repoRoot: "C:\\repo-that-should-not-matter",
    });

    const previousFile = Bun.file;
    (Bun as any).file = (path: string) => {
      if (path.endsWith("local-model.json")) {
        return {
          text: async () =>
            JSON.stringify({
              exePath: "D:\\llamacpp\\llama-server.exe",
              modelPath: "D:\\models\\Qwen3.gguf",
            }),
        };
      }
      return {
        text: async () => {
          throw new Error(`ENOENT ${path}`);
        },
      };
    };

    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error("not healthy");
    }) as unknown as typeof globalThis.fetch;

    try {
      const response = await handlers.handleGet();
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        state: "stopped",
        baseUrl: "http://127.0.0.1:8080",
      });
      expect(process.env.NOLO_LOCAL_OPENAI_BASE_URL).toBe("http://127.0.0.1:8080/v1");
      expect(process.env.NOLO_LOCAL_LLM).toBe("direct");
    } finally {
      (Bun as any).file = previousFile;
      globalThis.fetch = previousFetch;
    }
  });

  it("surfaces startup failures on subsequent status polls", async () => {
    let rejectStart: ((error?: unknown) => void) | null = null;
    const handlers = createDesktopLlamaRuntimeHandlers({
      isDesktopMode: () => true,
      logger: { error: () => undefined },
      controller: {
        status: async () => stoppedSnapshot(),
        stop: async () => ({ managedPid: null }),
        start: async () => ({
          status: stoppedSnapshot(),
          startupTask: new Promise<void>((_, reject) => {
            rejectStart = reject;
          }),
        }),
      },
    });

    const startResponse = await handlers.handlePost(
      new Request("http://localhost/api/desktop/provider-runtime", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      }),
    );

    expect(startResponse.status).toBe(202);

    (rejectStart as ((error?: unknown) => void) | null)?.(new Error("startup exploded"));
    const errorStatus = await waitFor(async () => {
      const statusResponse = await handlers.handleGet();
      const body = (await statusResponse.json()) as DesktopLlamaRuntimeSnapshot & {
        error?: string;
        state: DesktopLlamaRuntimeSnapshot["state"] | "starting";
      };
      return body.state === "error" ? body : null;
    });

    expect(errorStatus).toMatchObject({
      state: "error",
      error: "startup exploded",
    });
  });

  it("rejects unsupported actions", async () => {
    const previous = process.env.NOLO_DESKTOP;
    try {
      process.env.NOLO_DESKTOP = "1";

      const response = await handleDesktopLlamaRuntimePost(
        new Request("http://localhost/api/desktop/provider-runtime", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "restart" }),
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Unsupported action" });
    } finally {
      if (previous !== undefined) {
        process.env.NOLO_DESKTOP = previous;
      } else {
        delete process.env.NOLO_DESKTOP;
      }
    }
  });
});
