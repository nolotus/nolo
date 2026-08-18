import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webSource = readFileSync(
  join(import.meta.dir, "..", "sendOpenAICompletionsRequest.ts"),
  "utf-8"
);
const nativeSource = readFileSync(
  join(import.meta.dir, "..", "sendOpenAICompletionsRequest.native.ts"),
  "utf-8"
);

describe("sendOpenAICompletionsRequest source contract", () => {
  it("translates provider policy errors before showing API errors", () => {
    for (const source of [webSource, nativeSource]) {
      expect(source).toContain("formatStreamErrorMessage");
      expect(source).toContain("terms\\s+of\\s+service");
      expect(source).toContain("当前模型服务商拒绝了这次请求");
      expect(source).toContain("`Error: ${formatStreamErrorMessage(data)}`");
      expect(source).not.toContain("`Error: ${getStreamErrorMessage(data)}`");
    }
  });

  it("records quick-chat fetch and first visible delta stages without changing native code", () => {
    expect(webSource).toContain("quickChatPerfStartedAt?: number");
    expect(webSource).toContain("openai-completions-fetch-starting");
    expect(webSource).toContain("openai-completions-fetch-response");
    expect(webSource).toContain("openai-completions-first-stream-chunk");
    expect(webSource).toContain("openai-completions-first-sse-event");
    expect(webSource).toContain("openai-completions-first-visible-delta");
    expect(webSource).toContain("openai-completions-stream-finished");
    expect(webSource).toContain("if (!startedAt) return;");
    expect(webSource).toContain("elapsedMs: now - startedAt");
    expect(webSource).toContain("atMs: now");
  });

  it("bounds stalled web streams so empty quick-chat responses can finalize", () => {
    expect(webSource).toContain("STREAM_READ_TIMEOUT_MS");
    expect(webSource).toContain("readStreamChunkWithTimeout");
    expect(webSource).toContain("模型响应流");
    expect(webSource).toContain("await readStreamChunkWithTimeout(reader, signal)");
    expect(webSource).toContain('from "./streamReader"');
  });

  it("uses image-generation capability checks instead of registry-only model metadata to suppress tools", () => {
    for (const source of [webSource, nativeSource]) {
      expect(source).toContain("supportsImageGeneration(agentConfig)");
    }
  });

  it("imports the think parser from the leaf module so the web bundle never pulls the agent-runtime barrel", () => {
    // The agent-runtime barrel re-exports server-only files (localWorkspaceTools,
    // kimiHeaders, externalTools → yahoo-finance2/serpapi) that pull in node:
    // built-ins and break the browser esbuild build.
    for (const source of [webSource, nativeSource]) {
      expect(source).toContain('from "agent-runtime/thinkTagParser"');
      expect(source).not.toMatch(/from\s+"agent-runtime"\s*;?/);
    }
  });
});
