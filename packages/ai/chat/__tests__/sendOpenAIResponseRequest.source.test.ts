import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "..", "sendOpenAIResponseRequest.ts"),
  "utf-8"
);

describe("sendOpenAIResponseRequest source contract", () => {
  it("uses runtime current server instead of legacy settings selector", () => {
    expect(source).toContain(
      'import { selectRuntimeCurrentServer } from "app/stateViews/runtime"'
    );
    expect(source).toContain(
      "currentServer: selectRuntimeCurrentServer(getState() as RootState)"
    );
    expect(source).not.toContain("selectCurrentServer");
  });

  it("backfills final text from completed responses output when deltas are absent", () => {
    expect(source).toContain(
      "const completedText = extractTextFromResponseOutput(state.completedResponse);"
    );
    expect(source).toContain(
      "const completedImages = extractImagePartsFromResponseOutput(state.completedResponse);"
    );
    expect(source).toContain("state.content = completedText;");
  });

  it("recovers text from message output items before finalize", () => {
    expect(source).toContain("const itemText = extractTextFromOutputItem(item);");
    expect(source).toContain("state.content = itemText;");
  });

  it("records quick-chat fetch and first visible delta stages", () => {
    expect(source).toContain("quickChatPerfStartedAt?: number");
    expect(source).toContain("openai-response-fetch-starting");
    expect(source).toContain("openai-response-fetch-response");
    expect(source).toContain("openai-response-first-stream-chunk");
    expect(source).toContain("openai-response-first-sse-event");
    expect(source).toContain("openai-response-first-visible-delta");
    expect(source).toContain("openai-response-stream-finished");
    expect(source).toContain("if (!startedAt) return;");
    expect(source).toContain("elapsedMs: now - startedAt");
    expect(source).toContain("atMs: now");
  });

  it("retries the response stream once before any visible delta when the server disconnects during deploy", () => {
    expect(source).toContain('from "./streamRetry"');
    expect(source).toContain("MAX_INITIAL_STREAM_RETRIES");
    expect(source).toContain("waitForInitialStreamRetry");
    expect(source).toContain("isRetryableInitialStreamError");
    expect(source).toContain("!loggedFirstVisibleDelta");
    expect(source).toContain("!state.assistantToolCalls.length");
    expect(source).toContain("response stream ended before first visible delta");
  });

  it("dispatches retryProgress to the streaming message during server-proxy retry", () => {
    expect(source).toContain("onRetry: (info:");
    expect(source).toContain("retryProgress: info");
    expect(source).toContain("messageStreaming({");
  });
});
