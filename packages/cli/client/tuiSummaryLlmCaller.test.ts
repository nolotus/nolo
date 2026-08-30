import { describe, expect, it, mock } from "bun:test";
import { createTuiSummaryLlmCaller } from "./tuiSummaryLlmCaller";
import { COMPACTION_SUMMARY_SYSTEM_PROMPT } from "../../ai/context/compactionShared";

describe("createTuiSummaryLlmCaller", () => {
  it("returns null if env does not allow platform chat provider", async () => {
    const caller = createTuiSummaryLlmCaller({});
    const result = await caller("some conversation text");
    expect(result).toBeNull();
  });

  it("calls platform chat completions with reasoning_effort low and no max_tokens", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    const mockFetch = mock(async (url: any, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: "Summary of conversation",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const env = {
      AUTH_TOKEN: "nolo-jwt-test-token",
      NOLO_SERVER_URL: "https://nolo.test",
    };

    const caller = createTuiSummaryLlmCaller(env, {
      fetchImpl: mockFetch as any,
    });

    const summary = await caller("user: hello\nassistant: hi");
    expect(summary).toBe("Summary of conversation");

    const body = JSON.parse(String(capturedInit?.body));
    expect(body.model).toBe("glm-5-3-flash");
    expect(body.reasoning_effort).toBe("low");
    expect(body.max_tokens).toBeUndefined();
    expect(body.messages).toEqual([
      { role: "system", content: COMPACTION_SUMMARY_SYSTEM_PROMPT },
      { role: "user", content: "user: hello\nassistant: hi" },
    ]);
  });

  it("returns null when fetch returns error status", async () => {
    const mockFetch = mock(async () => {
      return new Response("Unauthorized", { status: 401 });
    });

    const env = {
      AUTH_TOKEN: "nolo-jwt-test-token",
      NOLO_SERVER_URL: "https://nolo.test",
    };

    const caller = createTuiSummaryLlmCaller(env, {
      fetchImpl: mockFetch as any,
    });

    const summary = await caller("user: hello");
    expect(summary).toBeNull();
  });
});
