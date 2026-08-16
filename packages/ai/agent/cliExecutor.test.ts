import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { existsSync } from "node:fs";
import { EventEmitter } from "node:events";
import * as realChildProcess from "node:child_process";

const execMock = mock(
  (
    _command: string,
    _options: any,
    callback: (error: Error | null, stdout: string, stderr: string) => void
  ) => {
    callback(null, "", "");
  }
);

const execSyncMock = mock(() => "");

const spawnMock = mock(() => {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof mock>;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = mock(() => undefined);
  return proc;
});

const execCallAt = (index: number): any[] | undefined => execMock.mock.calls[index] as any[] | undefined;

const spawnCallAt = (index: number): any[] | undefined =>
  spawnMock.mock.calls[index] as any[] | undefined;

beforeAll(() => {
  mock.module("child_process", () => ({
    exec: execMock,
    execSync: execSyncMock,
    spawn: spawnMock,
  }));
});

afterAll(() => {
  mock.module("child_process", () => realChildProcess);
});

const {
  closeCliSession,
  detectCliProviderQuotaLimit,
  executeCli,
  executeCliSessionTurn,
  executeCliSessionTurnStreaming,
  executeCliStreaming,
  getCliSession,
  startCliSession,
} = await import("./cliExecutor");

describe("cliExecutor provider support", () => {
  it("executes Copilot CLI with deterministic non-interactive output", async () => {
    execMock.mockClear();
    execMock.mockImplementation((_command, _options, callback) => {
      callback(null, "Copilot answer\n", "");
    });

    const result = await executeCli("copilot", "List files", {
      reasoningEffort: "high",
    });

    expect(execMock).toHaveBeenCalledTimes(1);
    expect(execCallAt(0)?.[0]).toContain("gh copilot --");
    expect(execCallAt(0)?.[0]).toContain("--disable-builtin-mcps");
    expect(execCallAt(0)?.[0]).toContain("--stream off");
    expect(execCallAt(0)?.[0]).toContain("--no-color");
    expect(execCallAt(0)?.[0]).toContain("--reasoning-effort high");
    expect(execCallAt(0)?.[0]).toContain("--yolo");
    expect(result.text).toBe("Copilot answer");
  });

  it("executes Gemini CLI with stream-json parsing", async () => {
    execMock.mockClear();
    execMock.mockImplementation((_command, _options, callback) => {
      callback(
        null,
        [
          JSON.stringify({
            type: "message",
            role: "assistant",
            content: "Hello",
          }),
          JSON.stringify({
            type: "message",
            role: "assistant",
            content: [{ text: " Gemini" }],
          }),
          JSON.stringify({
            type: "result",
            result: "!",
          }),
        ].join("\n"),
        ""
      );
    });

    const result = await executeCli("gemini", "Explain this file", {
      model: "gemini-2.5-pro",
    });

    expect(execMock).toHaveBeenCalledTimes(1);
    expect(execCallAt(0)?.[0]).toContain("gemini");
    expect(execCallAt(0)?.[0]).toContain("--output-format stream-json");
    expect(execCallAt(0)?.[0]).toContain("-m \"gemini-2.5-pro\"");
    expect(result.text).toBe("Hello Gemini!");
  });

  it("streams Gemini CLI chunks incrementally", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const chunks: string[] = [];
    const promise = executeCliStreaming("gemini", "Stream this prompt", {
      model: "gemini-3-flash-preview",
      onChunk: (chunk) => chunks.push(chunk),
    });

    proc.stdout.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          type: "message",
          role: "assistant",
          content: "Hello",
        }) + "\n"
      )
    );
    proc.stdout.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          type: "message",
          role: "assistant",
          content: { text: " from Gemini" },
        }) +
          "\n" +
          JSON.stringify({
            type: "result",
            result: "!",
          }) +
          "\n"
      )
    );
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnCallAt(0)?.[0]).toBe("gemini");
    expect(spawnCallAt(0)?.[1]).toContain("--output-format");
    expect(chunks).toEqual(["Hello", " from Gemini", "!"]);
    expect(result.text).toBe("Hello from Gemini!");
  });

  it("executes Codex CLI via codex exec", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("codex", "Explain this file", {
      model: "gpt-5.4",
    });

    proc.stdout.emit("data", Buffer.from("Codex answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnCallAt(0)?.[0]).toBe("codex");
    expect(spawnCallAt(0)?.[1]).toContain("exec");
    expect(spawnCallAt(0)?.[1]).toContain("--skip-git-repo-check");
    expect(spawnCallAt(0)?.[1]).toContain("--ephemeral");
    expect(spawnCallAt(0)?.[1]).toContain("--color");
    expect(spawnCallAt(0)?.[1]).toContain("never");
    expect(spawnCallAt(0)?.[1]).toContain("--sandbox");
    expect(spawnCallAt(0)?.[1]).toContain("danger-full-access");
    expect(spawnCallAt(0)?.[1]).not.toContain("--model");
    expect(spawnCallAt(0)?.[1]).not.toContain("gpt-5.4");
    expect(spawnCallAt(0)?.[1]).toContain("Explain this file");
    expect(result.text).toBe("Codex answer");
  });

  it("uses the resolved Codex executable from runtime env when provided", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("codex", "Explain this file", {
      env: {
        NOLO_CODEX_BIN: "C:\\Users\\demo\\.nolo\\bin\\codex.exe",
      },
    });

    proc.stdout.emit("data", Buffer.from("Codex answer\n"));
    proc.emit("close", 0);

    await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnCallAt(0)?.[0]).toBe("C:\\Users\\demo\\.nolo\\bin\\codex.exe");
  });

  it("falls back to buffered output for Codex CLI streaming", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const chunks: string[] = [];
    const promise = executeCliStreaming("codex", "Stream this prompt", {
      model: "gpt-5.4",
      onChunk: (chunk) => chunks.push(chunk),
    });

    proc.stdout.emit("data", Buffer.from("Codex streamed answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual(["Codex streamed answer"]);
    expect(result.text).toBe("Codex streamed answer");
  });

  it("warns that Codex CLI ignores model selection", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("codex", "Explain this file", {
      model: "codex",
    });

    proc.stdout.emit("data", Buffer.from("Codex answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    expect(result.warnings).toContain("Codex CLI does not support model selection; ignored.");
    expect(spawnCallAt(0)?.[1]).not.toContain("--model");
    expect(spawnCallAt(0)?.[1]).not.toContain("codex");
  });

  it("executes Claude CLI via claude print mode", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("claude", "Review this change", {
      model: "claude-sonnet-4.6",
      systemPrompt: "You are a code reviewer",
      reasoningEffort: "high",
      maxTokens: 2048,
    });

    proc.stdout.emit("data", Buffer.from("Claude answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnCallAt(0)?.[0]).toBe("claude");
    expect(spawnCallAt(0)?.[1]).toContain("--add-dir");
    expect(spawnCallAt(0)?.[1]).toContain(process.cwd());
    expect(spawnCallAt(0)?.[1]).toContain("-p");
    expect(spawnCallAt(0)?.[1]).toContain("Review this change");
    expect(spawnCallAt(0)?.[1]).not.toContain("--model");
    expect(spawnCallAt(0)?.[1]).not.toContain("claude-sonnet-4.6");
    expect(spawnCallAt(0)?.[1]).toContain("--system-prompt");
    expect(spawnCallAt(0)?.[1]).toContain("You are a code reviewer");
    expect(spawnCallAt(0)?.[1]).toContain("--effort");
    expect(spawnCallAt(0)?.[1]).toContain("high");
    expect(result.text).toBe("Claude answer");
    expect(result.warnings).toEqual([
      "Claude CLI model selection is disabled by default because current installs can reject --model; set NOLO_CLAUDE_CLI_ALLOW_MODEL=1 to pass it through.",
      "Claude CLI does not support max_tokens; ignored.",
    ]);
  });

  it("allows explicit Claude CLI model passthrough when opted in", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("claude", "Review this change", {
      model: "claude-sonnet-4.6",
      env: {
        NOLO_CLAUDE_CLI_ALLOW_MODEL: "1",
      },
    });

    proc.stdout.emit("data", Buffer.from("Claude answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnCallAt(0)?.[1]).toContain("--add-dir");
    expect(spawnCallAt(0)?.[1]).toContain(process.cwd());
    expect(spawnCallAt(0)?.[1]).toContain("--model");
    expect(spawnCallAt(0)?.[1]).toContain("claude-sonnet-4.6");
    expect(result.warnings).toEqual([]);
  });

  it("returns explicit warnings for unsupported Codex CLI inference fields", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("codex", "Explain this file", {
      model: "gpt-5.4",
      reasoningEffort: "medium",
      temperature: 0.3,
    });

    proc.stdout.emit("data", Buffer.from("Codex answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    expect(result.warnings).toEqual([
      "Codex CLI does not support reasoning_effort; ignored.",
      "Codex CLI does not support model selection; ignored.",
      "Codex CLI does not support temperature; ignored.",
    ]);
  });

  it("executes Antigravity CLI via agy print mode", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("agy", "Implement this UI task", {
      model: "gemini-3.1-pro",
      timeout: 60_000,
    });

    proc.stdout.emit("data", Buffer.from("AGY answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnCallAt(0)?.[0]).toBe("agy");
    expect(spawnCallAt(0)?.[1]).toContain("--add-dir");
    expect(spawnCallAt(0)?.[1]).toContain(process.cwd());
    expect(spawnCallAt(0)?.[1]).toContain("--print");
    expect(spawnCallAt(0)?.[1]).toContain("Implement this UI task");
    expect(spawnCallAt(0)?.[1]).toContain("--print-timeout");
    expect(spawnCallAt(0)?.[1]).toContain("60s");
    expect(spawnCallAt(0)?.[1]).toContain("--dangerously-skip-permissions");
    expect(result.text).toBe("AGY answer");
    expect(result.warnings).toEqual([
      "Antigravity CLI does not support model selection; ignored.",
    ]);
  });

  it("terminates Antigravity CLI and reports output tails when print mode never becomes idle", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("agy", "Long agentic task", {
      timeout: 1,
    });

    proc.stdout.emit("data", Buffer.from("PlannerResponse without ModifiedResponse\n"));

    await expect(promise).rejects.toThrow("Antigravity CLI timed out after 1ms");
    await expect(promise).rejects.toThrow("prefer shorter scoped prompts or split the task into multiple turns");
    await expect(promise).rejects.toThrow("PlannerResponse without ModifiedResponse");
    expect(proc.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("executes Qoder CLI via print mode with workspace cwd", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("qoder", "Implement this integration task", {
      model: "qoder-pro",
      reasoningEffort: "high",
      timeout: 60_000,
    });

    proc.stdout.emit("data", Buffer.from("Qoder answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnCallAt(0)?.[0]).toBe("qoder");
    expect(spawnCallAt(0)?.[1]).toContain("-p");
    expect(spawnCallAt(0)?.[1]).toContain("Implement this integration task");
    expect(spawnCallAt(0)?.[1]).toContain("--cwd");
    expect(spawnCallAt(0)?.[1]).toContain(process.cwd());
    expect(spawnCallAt(0)?.[1]).toContain("--model");
    expect(spawnCallAt(0)?.[1]).toContain("qoder-pro");
    expect(spawnCallAt(0)?.[1]).toContain("--reasoning-effort");
    expect(spawnCallAt(0)?.[1]).toContain("high");
    expect(spawnCallAt(0)?.[1]).toContain("--dangerously-skip-permissions");
    expect(result.text).toBe("Qoder answer");
    expect(result.warnings).toEqual([]);
  });

  it("falls back to buffered output for Qoder CLI streaming", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const chunks: string[] = [];
    const promise = executeCliStreaming("qoder", "Stream this prompt", {
      onChunk: (chunk) => chunks.push(chunk),
    });

    proc.stdout.emit("data", Buffer.from("Qoder streamed answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual(["Qoder streamed answer"]);
    expect(result.text).toBe("Qoder streamed answer");
  });

  it("executes OpenCode CLI via run with JSON parsing", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("opencode", "Implement this task", {
      model: "opencode/gpt-5.1-codex",
      reasoningEffort: "high",
      timeout: 60_000,
    });

    proc.stdout.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          type: "step_start",
          part: { type: "step-start" },
        }) + "\n" +
        JSON.stringify({
          type: "text",
          part: { type: "text", text: "OpenCode " },
        }) + "\n" +
        JSON.stringify({
          type: "text",
          part: { type: "text", text: "answer" },
        }) + "\n" +
        JSON.stringify({
          type: "step_finish",
          part: { type: "step-finish" },
        }) + "\n"
      )
    );
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnCallAt(0)?.[0]).toBe("opencode");
    expect(spawnCallAt(0)?.[1]).toContain("run");
    expect(spawnCallAt(0)?.[1]).toContain("--format");
    expect(spawnCallAt(0)?.[1]).toContain("json");
    expect(spawnCallAt(0)?.[1]).toContain("--dir");
    expect(spawnCallAt(0)?.[1]).toContain(process.cwd());
    expect(spawnCallAt(0)?.[1]).toContain("--model");
    expect(spawnCallAt(0)?.[1]).toContain("opencode/gpt-5.1-codex");
    expect(spawnCallAt(0)?.[1]).toContain("--variant");
    expect(spawnCallAt(0)?.[1]).toContain("high");
    expect(spawnCallAt(0)?.[1]).toContain("--dangerously-skip-permissions");
    expect(spawnCallAt(0)?.[1]).toContain("Implement this task");
    expect(result.text).toBe("OpenCode answer");
    expect(result.warnings).toEqual([]);
  });

  it("executes Grok CLI via headless JSON output", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("grok", "Implement this task", {
      model: "grok-build",
      reasoningEffort: "high",
      timeout: 60_000,
    });

    proc.stdout.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          text: "Grok answer",
          stopReason: "EndTurn",
          sessionId: "session-1",
          requestId: "request-1",
        })
      )
    );
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnCallAt(0)?.[0]).toBe("grok");
    expect(spawnCallAt(0)?.[1]).toContain("-p");
    expect(spawnCallAt(0)?.[1]).toContain("Implement this task");
    expect(spawnCallAt(0)?.[1]).toContain("--cwd");
    expect(spawnCallAt(0)?.[1]).toContain(process.cwd());
    expect(spawnCallAt(0)?.[1]).toContain("--output-format");
    expect(spawnCallAt(0)?.[1]).toContain("json");
    expect(spawnCallAt(0)?.[1]).toContain("-m");
    expect(spawnCallAt(0)?.[1]).toContain("grok-build");
    expect(spawnCallAt(0)?.[1]).toContain("--effort");
    expect(spawnCallAt(0)?.[1]).toContain("high");
    expect(spawnCallAt(0)?.[1]).toContain("--yolo");
    expect(spawnCallAt(0)?.[2]?.env?.GROK_TELEMETRY_TRACE_UPLOAD).toBe("0");
    expect(spawnCallAt(0)?.[2]?.env?.GROK_TELEMETRY_ENABLED).toBe("0");
    expect(spawnCallAt(0)?.[2]?.env?.GROK_FEEDBACK_ENABLED).toBe("0");
    expect(spawnCallAt(0)?.[2]?.env?.GROK_TELEMETRY_MIXPANEL_ENABLED).toBe("0");
    expect(result.text).toBe("Grok answer");
    expect(result.warnings).toEqual([]);
  });

  it("does not override explicit Grok telemetry env settings", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("grok", "Use explicit telemetry env", {
      env: {
        GROK_TELEMETRY_TRACE_UPLOAD: "1",
        GROK_TELEMETRY_ENABLED: "1",
        GROK_FEEDBACK_ENABLED: "1",
        GROK_TELEMETRY_MIXPANEL_ENABLED: "1",
      },
    });

    proc.stdout.emit("data", Buffer.from(JSON.stringify({ text: "Grok answer" })));
    proc.emit("close", 0);

    await promise;
    expect(spawnCallAt(0)?.[2]?.env?.GROK_TELEMETRY_TRACE_UPLOAD).toBe("1");
    expect(spawnCallAt(0)?.[2]?.env?.GROK_TELEMETRY_ENABLED).toBe("1");
    expect(spawnCallAt(0)?.[2]?.env?.GROK_FEEDBACK_ENABLED).toBe("1");
    expect(spawnCallAt(0)?.[2]?.env?.GROK_TELEMETRY_MIXPANEL_ENABLED).toBe("1");
  });

  it("falls back to buffered output for Grok CLI streaming", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const chunks: string[] = [];
    const promise = executeCliStreaming("grok", "Stream this prompt", {
      onChunk: (chunk) => chunks.push(chunk),
    });

    proc.stdout.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          text: "Grok streamed answer",
          stopReason: "EndTurn",
        })
      )
    );
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual(["Grok streamed answer"]);
    expect(result.text).toBe("Grok streamed answer");
  });

  it("falls back to buffered output for OpenCode CLI streaming", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const chunks: string[] = [];
    const promise = executeCliStreaming("opencode", "Stream this prompt", {
      onChunk: (chunk) => chunks.push(chunk),
    });

    proc.stdout.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          type: "text",
          part: { type: "text", text: "OpenCode streamed answer" },
        }) + "\n"
      )
    );
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual(["OpenCode streamed answer"]);
    expect(result.text).toBe("OpenCode streamed answer");
  });

  it("gives Antigravity CLI a longer default print timeout for implementation tasks", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("agy", "Implement this UI task", {});

    proc.stdout.emit("data", Buffer.from("AGY answer\n"));
    proc.emit("close", 0);

    await promise;

    const args = spawnCallAt(0)?.[1] as string[];
    expect(args[args.indexOf("--print-timeout") + 1]).toBe("600s");
  });

  it("gives Grok CLI a longer default timeout for implementation tasks", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const scheduled: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (typeof timeout === "number") scheduled.push(timeout);
      return originalSetTimeout(handler, timeout, ...args);
    }) as typeof setTimeout;

    try {
      const promise = executeCli("grok", "Implement this task", {
        model: "grok-build",
      });
      proc.stdout.emit(
        "data",
        Buffer.from(JSON.stringify({ text: "Grok answer", stopReason: "EndTurn" }))
      );
      proc.emit("close", 0);
      await promise;
      expect(scheduled).toContain(600_000);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("gives OpenCode CLI a longer default timeout for implementation tasks", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const scheduled: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (typeof timeout === "number") scheduled.push(timeout);
      return originalSetTimeout(handler, timeout, ...args);
    }) as typeof setTimeout;

    try {
      const promise = executeCli("opencode", "Implement this task", {
        model: "opencode/gpt-5.1-codex",
      });
      proc.stdout.emit(
        "data",
        Buffer.from(
          JSON.stringify({
            type: "text",
            part: { type: "text", text: "OpenCode answer" },
          }) + "\n"
        )
      );
      proc.emit("close", 0);
      await promise;
      expect(scheduled).toContain(600_000);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("uses the same normalized proxy env for agy and codex when only the macOS system proxy is available", async () => {
    const savedEnv = { ...process.env };
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.all_proxy;
    delete process.env.ALL_PROXY;

    try {
      execSyncMock.mockClear();
      execSyncMock.mockReturnValue([
        "<dictionary> {",
        "  HTTPEnable : 1",
        "  HTTPPort : 7890",
        '  HTTPProxy : 127.0.0.1',
        "  HTTPSEnable : 1",
        "  HTTPSPort : 7890",
        '  HTTPSProxy : 127.0.0.1',
        "}",
      ].join("\n"));

      const makeProc = () => {
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter;
          stderr: EventEmitter;
          kill: ReturnType<typeof mock>;
        };
        proc.stdout = new EventEmitter();
        proc.stderr = new EventEmitter();
        proc.kill = mock(() => undefined);
        return proc;
      };

      spawnMock.mockClear();
      const agyProc = makeProc();
      const codexProc = makeProc();
      spawnMock.mockReturnValueOnce(agyProc).mockReturnValueOnce(codexProc);

      const agyPromise = executeCli("agy", "Use proxy", { env: {} });
      agyProc.stdout.emit("data", Buffer.from("agy via proxy\n"));
      agyProc.emit("close", 0);
      await agyPromise;

      const codexPromise = executeCli("codex", "Use proxy", { env: {} });
      codexProc.stdout.emit("data", Buffer.from("codex via proxy\n"));
      codexProc.emit("close", 0);
      await codexPromise;

      const agyEnv = spawnCallAt(0)?.[2]?.env as Record<string, string>;
      const codexEnv = spawnCallAt(1)?.[2]?.env as Record<string, string>;

      expect(execSyncMock).toHaveBeenCalled();
      expect(agyEnv.http_proxy).toBe("http://127.0.0.1:7890");
      expect(agyEnv.HTTP_PROXY).toBe("http://127.0.0.1:7890");
      expect(agyEnv.https_proxy).toBe("http://127.0.0.1:7890");
      expect(agyEnv.HTTPS_PROXY).toBe("http://127.0.0.1:7890");
      expect(agyEnv.ALL_PROXY).toBe("http://127.0.0.1:7890");
      expect(agyEnv.all_proxy).toBe("http://127.0.0.1:7890");
      expect(codexEnv.HTTP_PROXY).toBe(agyEnv.HTTP_PROXY);
      expect(codexEnv.HTTPS_PROXY).toBe(agyEnv.HTTPS_PROXY);
      expect(codexEnv.ALL_PROXY).toBe(agyEnv.ALL_PROXY);
    } finally {
      Object.assign(process.env, savedEnv);
      for (const key of ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "all_proxy", "ALL_PROXY"]) {
        if (!(key in savedEnv)) {
          delete (process.env as any)[key];
        }
      }
    }
  });

  it("falls back to buffered output for Antigravity CLI streaming", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const chunks: string[] = [];
    const promise = executeCliStreaming("agy", "Stream this prompt", {
      onChunk: (chunk) => chunks.push(chunk),
    });

    proc.stdout.emit("data", Buffer.from("AGY streamed answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual(["AGY streamed answer"]);
    expect(result.text).toBe("AGY streamed answer");
  });

  it("decodes split UTF-8 stdout chunks for Antigravity CLI output", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("agy", "Reply in Chinese");
    const bytes = Buffer.from("进行\n", "utf8");
    proc.stdout.emit("data", bytes.subarray(0, 1));
    proc.stdout.emit("data", bytes.subarray(1));
    proc.emit("close", 0);

    const result = await promise;

    expect(result.text).toBe("进行");
    expect(result.raw).toBe("进行\n");
  });

  it("supports interactive CLI sessions across multiple turns", async () => {
    execMock.mockClear();
    execMock.mockImplementation((command, _options, callback) => {
      callback(null, `reply for ${command}`, "");
    });

    const session = startCliSession("copilot", {
      systemPrompt: "你是一个代码助手",
      model: "claude-haiku-4.5",
    });

    const first = await executeCliSessionTurn(session.sessionId, "第一问");
    const second = await executeCliSessionTurn(session.sessionId, "第二问");
    const stored = getCliSession(session.sessionId);

    expect(first.sessionId).toBe(session.sessionId);
    expect(second.sessionId).toBe(session.sessionId);
    expect(execMock).toHaveBeenCalledTimes(2);
    expect(execCallAt(0)?.[0]).toContain("第一问");
    expect(execCallAt(1)?.[0]).toContain("第一问");
    expect(execCallAt(1)?.[0]).toContain("[2] 助手");
    expect(execCallAt(1)?.[0]).toContain("第二问");
    expect(stored?.messages).toHaveLength(4);
    expect(closeCliSession(session.sessionId)).toBe(true);
  });

  it("supports interactive CLI sessions with streaming turns", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const session = startCliSession("gemini", { model: "gemini-3-flash-preview" });
    const chunks: string[] = [];
    const promise = executeCliSessionTurnStreaming(session.sessionId, "继续", {
      onChunk: (chunk) => chunks.push(chunk),
    });

    proc.stdout.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          type: "message",
          role: "assistant",
          content: "hello",
        }) + "\n"
      )
    );
    proc.emit("close", 0);

    const result = await promise;

    expect(chunks).toEqual(["hello"]);
    expect(result.sessionId).toBe(session.sessionId);
    expect(getCliSession(session.sessionId)?.messages).toHaveLength(2);
    expect(closeCliSession(session.sessionId)).toBe(true);
  });

  it("uses Claude native system prompt flags for session turns", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const session = startCliSession("claude", {
      systemPrompt: "你是一个代码助手",
      model: "claude-sonnet-4.6",
      reasoningEffort: "high",
    });
    const promise = executeCliSessionTurn(session.sessionId, "继续");

    proc.stdout.emit("data", Buffer.from("Claude session answer\n"));
    proc.emit("close", 0);

    const result = await promise;
    const args = spawnCallAt(0)?.[1] as string[];

    expect(args).toContain("--system-prompt");
    expect(args).toContain("你是一个代码助手");
    expect(args).toContain("--effort");
    expect(args).toContain("high");
    expect(args.join(" ")).not.toContain("[角色设定]");
    expect(result.text).toBe("Claude session answer");
  });

  it("passes image paths to Codex CLI via -i flags", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("codex", "describe this", {
      imageInputs: [
        { source: "/tmp/screenshot.png", materializedPath: "/tmp/screenshot.png" },
        { source: "/tmp/photo.jpg", materializedPath: "/tmp/photo.jpg" },
      ],
    });

    proc.stdout.emit("data", Buffer.from("image description\n"));
    proc.emit("close", 0);

    const result = await promise;
    const args = spawnCallAt(0)?.[1] as string[];

    expect(args).toContain("-i");
    expect(args).toContain("/tmp/screenshot.png");
    expect(args).toContain("/tmp/photo.jpg");
    expect(args).toContain("describe this");
    expect(result.text).toBe("image description");
    expect(result.warnings).toEqual([]);
  });

  it("injects image file references into prompt for Claude CLI", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("claude", "describe this image", {
      imageInputs: [
        { source: "/tmp/screenshot.png", materializedPath: "/tmp/screenshot.png" },
      ],
    });

    proc.stdout.emit("data", Buffer.from("claude image answer\n"));
    proc.emit("close", 0);

    const result = await promise;
    const args = spawnCallAt(0)?.[1] as string[];
    const promptArg = args.find((a) => a.includes("describe this image"));

    expect(promptArg).toBeDefined();
    expect(promptArg).toContain("/tmp/screenshot.png");
    expect(promptArg).toContain("attached image");
    expect(result.warnings).toEqual([
      "Claude CLI image input is passed as local file references; native image flags are not available in this wrapper.",
    ]);
  });

  it("injects image file references into prompt for AGY CLI", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("agy", "analyze this", {
      imageInputs: [
        { source: "/tmp/diagram.png", materializedPath: "/tmp/diagram.png" },
      ],
    });

    proc.stdout.emit("data", Buffer.from("agy image answer\n"));
    proc.emit("close", 0);

    const result = await promise;
    const args = spawnCallAt(0)?.[1] as string[];

    expect(args.some((a) => a.includes("/tmp/diagram.png"))).toBe(true);
    expect(args.some((a) => a.includes("attached image"))).toBe(true);
    expect(result.warnings).toEqual([
      "Antigravity CLI image input is passed as local file references; native image flags are not available in this wrapper.",
    ]);
  });

  it("injects image file references into prompt for Gemini CLI", async () => {
    execMock.mockClear();
    execMock.mockImplementation((_command, _options, callback) => {
      callback(
        null,
        JSON.stringify({
          type: "message",
          role: "assistant",
          content: "gemini image answer",
        }),
        ""
      );
    });

    const result = await executeCli("gemini", "explain this", {
      imageInputs: [
        { source: "/tmp/chart.png", materializedPath: "/tmp/chart.png" },
      ],
    });

    expect(result.text).toBe("gemini image answer");
    expect(result.warnings).toEqual([
      "Gemini CLI image input is passed as local file references; native image flags are not available in this wrapper.",
    ]);
  });

  it("injects image file references into prompt for Copilot CLI", async () => {
    execMock.mockClear();
    execMock.mockImplementation((_command, _options, callback) => {
      callback(null, "copilot image answer", "");
    });

    const result = await executeCli("copilot", "look at this", {
      imageInputs: [
        { source: "/tmp/ui.png", materializedPath: "/tmp/ui.png" },
      ],
    });

    expect(result.text).toBe("copilot image answer");
    expect(result.warnings).toEqual([
      "Copilot CLI image input is passed as local file references; native image flags are not available in this wrapper.",
    ]);
  });

  it("materializes data URL images to temp files for Codex CLI", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    // A tiny valid 1x1 red PNG (base64)
    const tinyPngB64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${tinyPngB64}`;

    const promise = executeCli("codex", "describe this", {
      imageInputs: [
        { source: dataUrl },
      ],
    });

    proc.stdout.emit("data", Buffer.from("codex image answer\n"));
    proc.emit("close", 0);

    const result = await promise;
    const args = spawnCallAt(0)?.[1] as string[];

    expect(args).toContain("-i");
    // The image path should have been materialized to a temp .png file
    const imageFlagIndex = args.indexOf("-i");
    expect(imageFlagIndex).toBeGreaterThanOrEqual(0);
    const imagePath = args[imageFlagIndex + 1];
    expect(imagePath).toContain("nolo-cli-assets-");
    expect(imagePath).toContain(".png");
    expect(result.text).toBe("codex image answer");
  });

  it("handles file: URL image inputs for Codex CLI", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("codex", "describe this", {
      imageInputs: [
        { source: "file:///tmp/image.png" },
      ],
    });

    proc.stdout.emit("data", Buffer.from("codex file-url answer\n"));
    proc.emit("close", 0);

    const result = await promise;
    const args = spawnCallAt(0)?.[1] as string[];

    expect(args).toContain("-i");
    expect(args).toContain("/tmp/image.png");
    expect(result.text).toBe("codex file-url answer");
  });

  it("preserves HTTP image URLs as references in non-codex prompts", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const promise = executeCli("claude", "describe this", {
      imageInputs: [
        { source: "https://example.com/photo.jpg" },
      ],
    });

    proc.stdout.emit("data", Buffer.from("claude answer\n"));
    proc.emit("close", 0);

    const result = await promise;
    const args = spawnCallAt(0)?.[1] as string[];
    const promptArg = args.find((a) => a.includes("describe this"));

    expect(promptArg).toContain("https://example.com/photo.jpg");
    expect(promptArg).toContain("remote URL");
    expect(result.warnings).toEqual([
      "Claude CLI image input is passed as local file references; native image flags are not available in this wrapper.",
    ]);
  });

  it("Copilot streaming with data URL image: includes file reference in prompt, warns, and cleans temp dir", async () => {
    spawnMock.mockClear();
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof mock>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = mock(() => undefined);
    spawnMock.mockReturnValue(proc);

    const tinyPngB64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${tinyPngB64}`;

    const chunks: string[] = [];
    const promise = executeCliStreaming("copilot", "describe this image", {
      imageInputs: [{ source: dataUrl }],
      onChunk: (chunk) => chunks.push(chunk),
    });

    // Extract the materialized temp path from the prompt that will be passed to gh
    // We need to emit the close after spawn is called, so do it synchronously
    proc.stdout.emit("data", Buffer.from("copilot streaming answer\n"));
    proc.emit("close", 0);

    const result = await promise;

    // 1. The prompt arg passed to `gh copilot` includes the materialized temp image path
    const args = spawnCallAt(0)?.[1] as string[];
    // args[2] is the prompt value after "-p"
    const promptArgIdx = args.indexOf("-p");
    expect(promptArgIdx).toBeGreaterThanOrEqual(0);
    const passedPrompt = args[promptArgIdx + 1];
    expect(passedPrompt).toContain("attached image");
    expect(passedPrompt).toContain("nolo-cli-assets-");
    expect(passedPrompt).toContain(".png");

    // 2. Warnings include the Copilot local-file-reference warning
    expect(result.warnings).toEqual([
      "Copilot CLI image input is passed as local file references; native image flags are not available in this wrapper.",
    ]);

    // 3. The materialized temp directory was removed after stream resolved
    const tempDirMatch = passedPrompt.match(/(\/[^\s]*nolo-cli-assets-[^\s\/]*)\//);
    expect(tempDirMatch).not.toBeNull();
    const tempDir = tempDirMatch![1];
    expect(existsSync(tempDir)).toBe(false);

    expect(result.text).toBe("copilot streaming answer");
    expect(chunks.join("").trim()).toBe("copilot streaming answer");
  });
});

describe("detectCliProviderQuotaLimit", () => {
  it("detects real opencode weekly usage limit", () => {
    const msg = "AI_APICallError: Weekly usage limit reached. Resets in 3 days.";
    const res = detectCliProviderQuotaLimit("opencode", "", msg, 1);
    expect(res.limited).toBe(true);
    expect(res.message).toContain("opencode");
  });

  it("detects rate limit and 429 patterns", () => {
    expect(detectCliProviderQuotaLimit("opencode", "some stdout", "rate limit exceeded", null).limited).toBe(true);
    expect(detectCliProviderQuotaLimit("qoder", "", "429 Too Many Requests - quota", 1).limited).toBe(true);
  });

  it("does not false positive on normal discussion of quota", () => {
    const normal = "We should implement quota fallback logic for better UX.";
    expect(detectCliProviderQuotaLimit("opencode", normal, "", 0).limited).toBe(false);
    expect(detectCliProviderQuotaLimit("grok", "", "discussing usage limit feature", null).limited).toBe(false);
  });

  it("prefers stderr signals", () => {
    const res = detectCliProviderQuotaLimit("opencode", "normal stdout", "quota exceeded in stderr", 1);
    expect(res.limited).toBe(true);
    expect(res.message).toContain("stderr");
  });
});
