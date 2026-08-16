import { describe, expect, it } from "bun:test";

import { buildDelegatedRuntimeCommand } from "./localModelRuntimeSupervisor";

describe("localModelRuntimeSupervisor helpers", () => {
  it("maps generic env and runtime args to the current llama implementation", () => {
    const result = buildDelegatedRuntimeCommand(
      ["configure", "--exe", "D:\\llamacpp\\llama-server.exe", "--runtime-arg", "--ctx-size", "--kind", "llama"],
      {
        MODEL_RUNTIME_BIN: "D:\\llamacpp\\llama-server.exe",
        MODEL_RUNTIME_MODEL_PATH: "D:\\ollama\\imports\\Qwen3.6-27B-Q3_K_M.gguf",
        MODEL_RUNTIME_ARGS_JSON: '["--n-gpu-layers","99"]',
      } as NodeJS.ProcessEnv,
    );

    expect(result.kind).toBe("llama");
    expect(result.delegatedArgs).toEqual([
      "configure",
      "--exe",
      "D:\\llamacpp\\llama-server.exe",
      "--llama-arg",
      "--ctx-size",
    ]);
    expect(result.delegatedEnv).toMatchObject({
      LLAMA_SERVER_BIN: "D:\\llamacpp\\llama-server.exe",
      LLAMA_MODEL_PATH: "D:\\ollama\\imports\\Qwen3.6-27B-Q3_K_M.gguf",
      LLAMA_SERVER_ARGS_JSON: '["--n-gpu-layers","99"]',
    });
  });

  it("defaults to llama kind for local model runtimes today", () => {
    expect(buildDelegatedRuntimeCommand(["status"]).kind).toBe("llama");
    expect(buildDelegatedRuntimeCommand(["status", "--kind", "openai-local"]).kind).toBe("llama");
  });

  it("rejects unknown runtime kinds", () => {
    expect(() => buildDelegatedRuntimeCommand(["status", "--kind", "vllm"])).toThrow(
      "Unsupported model runtime kind: vllm",
    );
  });
});
