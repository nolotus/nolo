import { describe, expect, test } from "bun:test";

import {
  handleConnectorRunMessage,
  localRuntimeEnvFromPolicy,
  type LocalCliExecutor,
} from "./machineWsRunDispatch";

function createRuntimeEnv() {
  return {
    NOLO_SERVER: "https://agent.nolo.chat",
    NOLO_SERVER_URL: "https://agent.nolo.chat",
    BASE_URL: "https://agent.nolo.chat",
    AUTH_TOKEN: "token-abc",
    NOLO_MACHINE_API_KEY: "token-abc",
  };
}

describe("cli machine ws run dispatch", () => {
  test("routes CLI agents to CLI execution", async () => {
    const sent: any[] = [];
    const executed: any[] = [];
    const executeCli: LocalCliExecutor = async (provider, prompt, options) => {
      executed.push({ provider, prompt, options });
      return { text: "cli ok", raw: "cli ok", elapsed: 10 };
    };

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-1",
        payload: {
          agentKey: "agent-cli",
          userInput: "hello",
          timeoutMs: 600000,
          agentConfig: {
            apiSource: "cli",
            cliProvider: "codex",
            model: "gpt-5.4",
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      executeCli,
      createRuntimeEnv(),
      fetch,
      {
        buildConnectorCliPrompt: () => "prompt",
        resolveConnectorRunCwd: () => "/tmp/demo",
        resolveMachineRunPermissionPolicy: () => ({
          mode: "ask" as const,
          allowFilesystemRead: true,
          allowFilesystemWrite: false,
          allowShell: false,
          writableRoots: [],
        }) as any,
        assertMachineRunAllowed: () => undefined,
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        materializeLargeConnectorPrompt: ({ prompt }: { prompt: string }) => ({
          prompt,
          promptBytes: prompt.length,
          promptHash: "hash123",
          promptRef: null,
        }),
        readRuntimePromptPageMeta: () => null,
      }
    );

    expect(executed).toHaveLength(1);
    expect(executed[0]).toMatchObject({
      provider: "codex",
      prompt: "prompt",
      options: {
        model: "gpt-5.4",
        timeout: 600000,
        cwd: "/tmp/demo",
        yolo: true,
      },
    });
    expect(sent.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-1",
      result: {
        content: "cli ok",
        model: "gpt-5.4",
        trace: [{ role: "assistant", content: "cli ok" }],
        artifacts: {
          cwd: "/tmp/demo",
          exitStatus: "completed",
        },
      },
    });
  });

  test("routes provider-only CLI records to the matching CLI provider", async () => {
    const sent: any[] = [];
    const executed: any[] = [];
    const executeCli: LocalCliExecutor = async (provider, prompt, options) => {
      executed.push({ provider, prompt, options });
      return { text: "qoder ok", raw: "qoder ok", elapsed: 10 };
    };

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-provider-only-1",
        payload: {
          agentKey: "agent-qoder",
          userInput: "hello",
          timeoutMs: 600000,
          agentConfig: {
            apiSource: "cli",
            provider: "qoder",
            model: "qoder-model",
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      executeCli,
      createRuntimeEnv(),
      fetch,
      {
        buildConnectorCliPrompt: () => "prompt",
        resolveConnectorRunCwd: () => "/tmp/demo",
        resolveMachineRunPermissionPolicy: () => ({
          mode: "ask" as const,
          allowFilesystemRead: true,
          allowFilesystemWrite: false,
          allowShell: false,
          writableRoots: [],
        }) as any,
        assertMachineRunAllowed: () => undefined,
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        materializeLargeConnectorPrompt: ({ prompt }: { prompt: string }) => ({
          prompt,
          promptBytes: prompt.length,
          promptHash: "hash-provider-only",
          promptRef: null,
        }),
        readRuntimePromptPageMeta: () => null,
      }
    );

    expect(executed).toHaveLength(1);
    expect(executed[0]).toMatchObject({
      provider: "qoder",
      prompt: "prompt",
      options: {
        model: "qoder-model",
        timeout: 600000,
        cwd: "/tmp/demo",
        yolo: true,
      },
    });
    expect(sent.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-provider-only-1",
      result: {
        content: "qoder ok",
        model: "qoder-model",
      },
    });
  });

  test("forwards reasoning_effort to CLI execution on connector runs", async () => {
    const executed: any[] = [];
    const executeCli: LocalCliExecutor = async (provider, prompt, options) => {
      executed.push({ provider, prompt, options });
      return { text: "cli ok", raw: "cli ok", elapsed: 10 };
    };

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-reasoning",
        payload: {
          agentKey: "agent-grok",
          userInput: "hello",
          agentConfig: {
            apiSource: "cli",
            cliProvider: "grok",
            model: "grok-4",
            reasoning_effort: "high",
          },
        },
      }),
      () => undefined,
      executeCli,
      createRuntimeEnv(),
      fetch,
      {
        buildConnectorCliPrompt: () => "prompt",
        resolveConnectorRunCwd: () => "/tmp/demo",
        resolveMachineRunPermissionPolicy: () => ({
          mode: "ask" as const,
          allowFilesystemRead: true,
          allowFilesystemWrite: false,
          allowShell: false,
          writableRoots: [],
        }) as any,
        assertMachineRunAllowed: () => undefined,
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        materializeLargeConnectorPrompt: ({ prompt }: { prompt: string }) => ({
          prompt,
          promptBytes: prompt.length,
          promptHash: "hash123",
          promptRef: null,
        }),
        readRuntimePromptPageMeta: () => null,
      }
    );

    expect(executed).toHaveLength(1);
    expect(executed[0]?.options).toMatchObject({
      reasoningEffort: "high",
    });
  });

  test("routes non-cli agents to local runtime when workspace runtime policy is enabled", async () => {
    const sent: any[] = [];
    const localRuns: any[] = [];

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-2",
        payload: {
          agentKey: "agent-local",
          userInput: "run pwd",
          agentConfig: {
            apiSource: "platform",
            provider: "openai",
            model: "qwen-coder",
          },
          meta: {
            runtimeToolPolicySnapshot: {
              runtimeTools: ["execShell"],
              workspace: { mode: "current" },
              shell: { enabled: true, mode: "worktree" },
            },
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      async () => {
        throw new Error("CLI path should not be used");
      },
      createRuntimeEnv(),
      fetch,
      {
        resolveConnectorRunCwd: () => "/tmp/demo",
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        runConnectorLocalRuntimeAgent: async (args) => {
          localRuns.push(args);
          return {
            content: "workspace runtime done",
            model: "qwen-coder",
            trace: [{ role: "assistant", content: "workspace runtime done" }],
            runtimeWorkspaceRoot: "/tmp/runtime-workspace",
          };
        },
      }
    );

    expect(localRuns).toHaveLength(1);
    expect(sent.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-2",
      result: {
        content: "workspace runtime done",
        model: "qwen-coder",
        artifacts: {
          cwd: "/tmp/runtime-workspace",
          exitStatus: "completed",
        },
      },
    });
  });

  test("does not synthesize shell env for local runtime policy", () => {
    expect(localRuntimeEnvFromPolicy(createRuntimeEnv(), {
      runtimeTools: ["execShell"],
      workspace: { mode: "current" },
      shell: { enabled: true, mode: "worktree" },
    })).toEqual(createRuntimeEnv());
  });

  test("grants machine shell permission from runtime policy without shell env", async () => {
    const sent: any[] = [];
    const prompts: any[] = [];
    const executed: any[] = [];
    const executeCli: LocalCliExecutor = async (provider, prompt, options) => {
      executed.push({ provider, prompt, options });
      return { text: "cli ok", raw: "cli ok", elapsed: 10 };
    };

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-runtime-shell",
        payload: {
          agentKey: "agent-cli-shell",
          userInput: "print cwd",
          agentConfig: {
            apiSource: "cli",
            cliProvider: "codex",
          },
          meta: {
            runtimeToolPolicySnapshot: {
              runtimeTools: ["execShell"],
              workspace: { mode: "current" },
              shell: { enabled: true, mode: "worktree" },
            },
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      executeCli,
      createRuntimeEnv(),
      fetch,
      {
        buildConnectorCliPrompt: (_agentConfig, _userInput, _bridgeArgs, permissionPolicy) => {
          prompts.push(permissionPolicy);
          return "prompt";
        },
        resolveConnectorRunCwd: () => "/tmp/demo",
        resolveMachineRunPermissionPolicy: () => ({
          mode: "read_only",
          allowFilesystemRead: true,
          allowFilesystemWrite: false,
          allowShell: false,
          writableRoots: [],
        }),
        assertMachineRunAllowed: () => undefined,
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        materializeLargeConnectorPrompt: ({ prompt }: { prompt: string }) => ({
          prompt,
          promptBytes: prompt.length,
          promptHash: "hash123",
          promptRef: null,
        }),
        readRuntimePromptPageMeta: () => null,
      }
    );

    expect(executed).toHaveLength(1);
    expect(prompts[0]).toMatchObject({ allowShell: true });
    expect(sent.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-runtime-shell",
    });
  });

  test("routes machine-bound localhost custom providers to local runtime without workspace policy", async () => {
    const sent: any[] = [];
    const localRuns: any[] = [];

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-2b",
        payload: {
          agentKey: "agent-local-custom",
          userInput: "hello",
          agentConfig: {
            apiSource: "custom",
            provider: "custom",
            model: "Qwen3.6-27B-MTP-Q3_K_M.gguf",
            customProviderUrl: "http://127.0.0.1:8080/v1/chat/completions",
            runtimeBinding: { machineId: "machine-win", ownerUserId: "user-1" },
          },
          meta: {
            userAuthToken: "token-forwarded",
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      async () => {
        throw new Error("CLI path should not be used");
      },
      createRuntimeEnv(),
      fetch,
      {
        resolveConnectorRunCwd: () => "/tmp/demo",
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        runConnectorLocalRuntimeAgent: async (args) => {
          localRuns.push(args);
          return {
            content: "custom runtime done",
            model: "Qwen3.6-27B-MTP-Q3_K_M.gguf",
            trace: [{ role: "assistant", content: "custom runtime done" }],
            runtimeWorkspaceRoot: "/tmp/demo",
          };
        },
      }
    );

    expect(localRuns).toHaveLength(1);
    expect(localRuns[0]?.runtimeEnv.AUTH_TOKEN).toBe("token-forwarded");
    expect(sent.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-2b",
      result: {
        content: "custom runtime done",
        model: "Qwen3.6-27B-MTP-Q3_K_M.gguf",
      },
    });
  });

  test("grants CLI shell permission from runtime policy when no explicit machine policy is configured", async () => {
    const sent: any[] = [];
    const executed: any[] = [];
    const prompts: any[] = [];
    const executeCli: LocalCliExecutor = async (provider, prompt, options) => {
      executed.push({ provider, prompt, options });
      return { text: "cli ok", raw: "cli ok", elapsed: 10 };
    };

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-shell-policy",
        payload: {
          agentKey: "agent-cli-shell",
          userInput: "print cwd",
          timeoutMs: 600000,
          agentConfig: {
            apiSource: "cli",
            cliProvider: "codex",
            model: "gpt-5.4",
          },
          meta: {
            runtimeToolPolicySnapshot: {
              runtimeTools: ["execShell"],
              workspace: { mode: "current" },
              shell: { enabled: true, mode: "worktree" },
            },
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      executeCli,
      createRuntimeEnv(),
      fetch,
      {
        buildConnectorCliPrompt: (_agentConfig, _userInput, _bridgeArgs, permissionPolicy) => {
          prompts.push(permissionPolicy);
          return "prompt";
        },
        resolveConnectorRunCwd: () => "/tmp/demo",
        resolveMachineRunPermissionPolicy: () => ({
          mode: "read_only",
          allowFilesystemRead: true,
          allowFilesystemWrite: false,
          allowShell: false,
          writableRoots: [],
        }),
        assertMachineRunAllowed: () => undefined,
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        materializeLargeConnectorPrompt: ({ prompt }: { prompt: string }) => ({
          prompt,
          promptBytes: prompt.length,
          promptHash: "hash123",
          promptRef: null,
        }),
        readRuntimePromptPageMeta: () => null,
      }
    );

    expect(executed).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      allowShell: true,
    });
    expect(sent.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-shell-policy",
      result: {
        content: "cli ok",
      },
    });
  });

  test("returns a clear error for non-cli payloads without workspace runtime policy", async () => {
    const sent: any[] = [];

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-3",
        payload: {
          agentKey: "agent-custom",
          userInput: "hello",
          agentConfig: {
            apiSource: "custom",
            prompt: "system prompt",
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      async () => {
        throw new Error("CLI path should not be used");
      },
      createRuntimeEnv(),
      fetch,
      {
        resolveConnectorRunCwd: () => "/tmp/demo",
      }
    );

    expect(sent).toEqual([
      {
        type: "agent.run.result",
        requestId: "request-3",
        error: "Connector can only execute non-CLI agents when runtimeToolPolicySnapshot requests a local workspace runtime.",
      },
    ]);
  });

  test("rejects non-cli payloads when policy metadata is present but no local runtime is requested", async () => {
    const sent: any[] = [];

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-4",
        payload: {
          agentKey: "agent-observe-only",
          userInput: "hello",
          agentConfig: {
            apiSource: "platform",
            provider: "openai",
          },
          meta: {
            runtimeToolPolicySnapshot: {
              agentTools: ["readDialog"],
              workspace: { mode: "current" },
            },
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      async () => {
        throw new Error("CLI path should not be used");
      },
      createRuntimeEnv(),
      fetch,
      {
        resolveConnectorRunCwd: () => "/tmp/demo",
      }
    );

    expect(sent).toEqual([
      {
        type: "agent.run.result",
        requestId: "request-4",
        error: "Connector can only execute non-CLI agents when runtimeToolPolicySnapshot requests a local workspace runtime.",
      },
    ]);
  });

  test("extracts multimodal userInput for CLI connectors and passes image inputs", async () => {
    const sent: any[] = [];
    const executed: any[] = [];
    const executeCli: LocalCliExecutor = async (provider, prompt, options) => {
      executed.push({ provider, prompt, options });
      return { text: "cli multimodal ok", raw: "cli multimodal ok", elapsed: 10 };
    };

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-mm-1",
        payload: {
          agentKey: "agent-cli-vision",
          userInput: [
            { type: "text", text: "describe this image" },
            { type: "image_url", image_url: { url: "https://example.com/photo.png" } },
          ],
          timeoutMs: 600000,
          agentConfig: {
            apiSource: "cli",
            cliProvider: "codex",
            model: "gpt-5.4",
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      executeCli,
      createRuntimeEnv(),
      fetch,
      {
        buildConnectorCliPrompt: (_agentConfig, userInput) => `prompt:${userInput}`,
        resolveConnectorRunCwd: () => "/tmp/demo",
        resolveMachineRunPermissionPolicy: () => ({
          mode: "ask" as const,
          allowFilesystemRead: true,
          allowFilesystemWrite: false,
          allowShell: false,
          writableRoots: [],
        }) as any,
        assertMachineRunAllowed: () => undefined,
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        materializeLargeConnectorPrompt: ({ prompt }: { prompt: string }) => ({
          prompt,
          promptBytes: prompt.length,
          promptHash: "hash-mm",
          promptRef: null,
        }),
        readRuntimePromptPageMeta: () => null,
      }
    );

    expect(executed).toHaveLength(1);
    expect(executed[0].prompt).toContain("describe this image");
    expect(executed[0].options.imageInputs).toEqual([
      { source: "https://example.com/photo.png" },
    ]);
    expect(sent.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-mm-1",
      result: {
        content: "cli multimodal ok",
      },
    });
  });

  test("handles plain string userInput for CLI connectors without image inputs", async () => {
    const sent: any[] = [];
    const executed: any[] = [];
    const executeCli: LocalCliExecutor = async (provider, prompt, options) => {
      executed.push({ provider, prompt, options });
      return { text: "cli text ok", raw: "cli text ok", elapsed: 10 };
    };

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-text-1",
        payload: {
          agentKey: "agent-cli-text",
          userInput: "just text, no images",
          timeoutMs: 600000,
          agentConfig: {
            apiSource: "cli",
            cliProvider: "claude",
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      executeCli,
      createRuntimeEnv(),
      fetch,
      {
        buildConnectorCliPrompt: (_agentConfig, userInput) => `prompt:${userInput}`,
        resolveConnectorRunCwd: () => "/tmp/demo",
        resolveMachineRunPermissionPolicy: () => ({
          mode: "ask" as const,
          allowFilesystemRead: true,
          allowFilesystemWrite: false,
          allowShell: false,
          writableRoots: [],
        }) as any,
        assertMachineRunAllowed: () => undefined,
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        materializeLargeConnectorPrompt: ({ prompt }: { prompt: string }) => ({
          prompt,
          promptBytes: prompt.length,
          promptHash: "hash-text",
          promptRef: null,
        }),
        readRuntimePromptPageMeta: () => null,
      }
    );

    expect(executed).toHaveLength(1);
    expect(executed[0].prompt).toContain("just text, no images");
    expect(executed[0].options.imageInputs).toBeUndefined();
    expect(sent.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-text-1",
      result: {
        content: "cli text ok",
      },
    });
  });

  test("localJob chatgptWebImageGenerate does not call CLI and returns gallery JSON", async () => {
    const sent: any[] = [];
    const executed: any[] = [];
    const executeCli: LocalCliExecutor = async (provider, prompt, options) => {
      executed.push({ provider, prompt, options });
      return { text: "should-not-run", raw: "should-not-run", elapsed: 1 };
    };

    const gallery = {
      text: "已生成 1 张图片。",
      imageCount: 1,
      files: [{ fileId: "01ABCFILE", metadata: { model: "chatgpt-web" } }],
    };

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-local-job-1",
        payload: {
          agentKey: "chatgpt-web-image",
          userInput: "ignored for local job",
          agentConfig: {
            apiSource: "cli",
            cliProvider: "codex",
            model: "gpt-5.4",
          },
          meta: {
            localJob: "chatgptWebImageGenerate",
            prompt: "画一只猫",
            userAuthToken: "user-token",
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      executeCli,
      createRuntimeEnv(),
      fetch,
      {
        runChatgptWebImageLocalJob: async (input) => {
          expect(input.prompt).toBe("画一只猫");
          expect(input.userAuthToken).toBe("user-token");
          return {
            rawData: gallery,
            outPath: "/tmp/fake.png",
            fileId: "01ABCFILE",
          };
        },
        buildConnectorCliPrompt: () => {
          throw new Error("CLI prompt builder must not run for localJob");
        },
      }
    );

    expect(executed).toHaveLength(0);
    const last = sent.at(-1);
    expect(last).toMatchObject({
      type: "agent.run.result",
      requestId: "request-local-job-1",
      result: {
        model: "chatgpt-web",
        artifacts: {
          localJob: "chatgptWebImageGenerate",
          fileId: "01ABCFILE",
          imageCount: 1,
        },
      },
    });
    expect(JSON.parse(last.result.content)).toEqual(gallery);
  });

  test("localJob chatgptWebImageGenerate missing prompt → error result, no CLI", async () => {
    const sent: any[] = [];
    const executed: any[] = [];
    const executeCli: LocalCliExecutor = async () => {
      executed.push("cli");
      return { text: "no", elapsed: 1 };
    };

    await handleConnectorRunMessage(
      JSON.stringify({
        type: "agent.run",
        requestId: "request-local-job-missing-prompt",
        payload: {
          agentKey: "chatgpt-web-image",
          meta: {
            localJob: "chatgptWebImageGenerate",
            prompt: "  ",
          },
        },
      }),
      (message) => sent.push(JSON.parse(message)),
      executeCli,
      createRuntimeEnv(),
      fetch,
      {
        // Use real job path (empty prompt fails before spawn).
        buildConnectorCliPrompt: () => {
          throw new Error("CLI must not run");
        },
      }
    );

    expect(executed).toHaveLength(0);
    expect(sent.at(-1)).toMatchObject({
      type: "agent.run.result",
      requestId: "request-local-job-missing-prompt",
    });
    expect(sent.at(-1).error).toMatch(/prompt/);
  });

  // ---- agent.run.cancel support ----
  // Uses the injectable runConnectorLocalRuntimeAgent so we can model an
  // in-flight local run that only settles when its abortSignal fires.

  function buildLocalRuntimeRunArgs(agentKey: string, requestId: string) {
    return JSON.stringify({
      type: "agent.run",
      requestId,
      payload: {
        agentKey,
        userInput: "hello",
        agentConfig: {
          apiSource: "platform",
          provider: "openai",
          model: "qwen-coder",
        },
        meta: {
          runtimeToolPolicySnapshot: {
            runtimeTools: ["execShell"],
            workspace: { mode: "current" },
            shell: { enabled: true, mode: "worktree" },
          },
        },
      },
    });
  }

  test("agent.run.cancel aborts the in-flight local run via its abortSignal", async () => {
    const sent: any[] = [];
    let observedSignal: AbortSignal | undefined;

    // Fire the run without awaiting — it stays pending until abort.
    const runHandle = handleConnectorRunMessage(
      buildLocalRuntimeRunArgs("agent-cancel-1", "request-cancel-1"),
      (message) => sent.push(JSON.parse(message)),
      async () => {
        throw new Error("CLI path should not be used");
      },
      createRuntimeEnv(),
      fetch,
      {
        resolveConnectorRunCwd: () => "/tmp/demo",
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        runConnectorLocalRuntimeAgent: async (args) => {
          observedSignal = args.abortSignal;
          // Stay pending until the signal aborts, then reject to mimic the
          // real localLoop throwing an aborted error.
          return new Promise<never>((_resolve, reject) => {
            const onAbort = () => reject(new Error("local agent turn aborted by user"));
            if (args.abortSignal?.aborted) {
              onAbort();
              return;
            }
            args.abortSignal?.addEventListener("abort", onAbort, { once: true });
          });
        },
      }
    );

    // Give the run a tick to register its controller + signal.
    await new Promise((r) => setTimeout(r, 10));
    expect(observedSignal).toBeInstanceOf(AbortSignal);
    expect(observedSignal?.aborted).toBe(false);

    // Fire cancel on a separate message dispatch (same module-level map).
    await handleConnectorRunMessage(
      JSON.stringify({ type: "agent.run.cancel", requestId: "request-cancel-1" }),
      (message) => sent.push(JSON.parse(message)),
      async () => {
        throw new Error("CLI path should not be used");
      },
      createRuntimeEnv(),
      fetch,
      {}
    );

    // Now the run should reject and the handler should emit the result.
    await runHandle;

    const last = sent.at(-1);
    expect(last).toMatchObject({
      type: "agent.run.result",
      requestId: "request-cancel-1",
      error: expect.any(String),
      cancelled: true,
    });
  });

  test("agent.run.cancel with unknown requestId is silently ignored (no throw, no result)", async () => {
    const sent: any[] = [];
    await handleConnectorRunMessage(
      JSON.stringify({ type: "agent.run.cancel", requestId: "never-existed" }),
      (message) => sent.push(JSON.parse(message)),
      async () => {
        throw new Error("CLI path should not be used");
      },
      createRuntimeEnv(),
      fetch,
      {}
    );
    expect(sent).toHaveLength(0);
  });

  test("run normally completing does not leave the requestId in the active map", async () => {
    const sent: any[] = [];
    let signal: AbortSignal | undefined;
    await handleConnectorRunMessage(
      buildLocalRuntimeRunArgs("agent-normal", "request-normal-cleanup"),
      (message) => sent.push(JSON.parse(message)),
      async () => {
        throw new Error("CLI path should not be used");
      },
      createRuntimeEnv(),
      fetch,
      {
        resolveConnectorRunCwd: () => "/tmp/demo",
        readConnectorGitHead: async () => "base-sha",
        collectConnectorRunArtifact: async ({ cwd }: { cwd: string }) => ({
          cwd,
          exitStatus: "completed" as const,
          collectedAt: new Date(0).toISOString(),
        }) as any,
        runConnectorLocalRuntimeAgent: async (args) => {
          signal = args.abortSignal;
          return {
            content: "done",
            model: "qwen-coder",
            trace: [],
            runtimeWorkspaceRoot: "/tmp/demo",
          };
        },
      }
    );
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);
    // After a normal completion, a cancel for the same requestId must be a
    // no-op (entry already removed).
    const sentBefore = sent.length;
    await handleConnectorRunMessage(
      JSON.stringify({ type: "agent.run.cancel", requestId: "request-normal-cleanup" }),
      (message) => sent.push(JSON.parse(message)),
      async () => {
        throw new Error("CLI path should not be used");
      },
      createRuntimeEnv(),
      fetch,
      {}
    );
    expect(sent.length).toBe(sentBefore);
  });
});
