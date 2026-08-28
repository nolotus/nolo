import { afterEach, describe, expect, it } from "bun:test";
import { AgentRunError, runAgent } from "./agentHelpers";

const originalFetch = globalThis.fetch;

describe("agentHelpers runAgent", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("preserves dialogId from failed agent-run responses for cleanup", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: "LLM API error (429)",
          dialogId: "01FAILEDAGENTRUNDIALOG0001",
        }),
        { status: 500 }
      )) as unknown as typeof fetch;

    try {
      await runAgent("https://example.test", "token", "agent-1", "hello");
      throw new Error("expected runAgent to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AgentRunError);
      expect((error as AgentRunError).dialogId).toBe("01FAILEDAGENTRUNDIALOG0001");
      expect(String(error)).toContain("dialogId=01FAILEDAGENTRUNDIALOG0001");
    }
  });

  it("passes background=true when a verifier needs AgentThread evidence", async () => {
    let postedBody: any = null;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      postedBody = JSON.parse(String(init?.body ?? "{}"));
      return new Response(JSON.stringify({ dialogId: "01BACKGROUNDTHREADDIALOG", content: "" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    await runAgent("https://example.test", "token", "agent-1", "hello", undefined, {
      background: true,
    });

    expect(postedBody?.background).toBe(true);
  });

  it("returns serverBase from proxied background agent-run responses", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          dialogId: "01PROXIEDBACKGROUND",
          content: "",
          serverBase: "http://127.0.0.1:39041",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )) as unknown as typeof fetch;

    const result = await runAgent("https://example.test", "token", "agent-1", "hello");

    expect(result.serverBase).toBe("http://127.0.0.1:39041");
  });
});
