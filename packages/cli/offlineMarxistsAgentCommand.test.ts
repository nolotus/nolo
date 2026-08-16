import { describe, expect, test } from "bun:test";
import { runSetupOfflineMarxistsAgentCommand } from "./offlineMarxistsAgentCommand";

function outputBuffer() {
  const chunks: string[] = [];
  return {
    output: { write: (chunk: string) => chunks.push(chunk) },
    text: () => chunks.join(""),
  };
}

describe("offline marxists agent cli command", () => {
  test("creates a server-side agent from an existing source agent", async () => {
    const requests: Array<{ url: string; body?: any }> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      requests.push({ url, body });
      if (url.includes("/api/v1/db/read/agent-user-1-source")) {
        return Response.json({
          data: {
            id: "source",
            type: "agent",
            model: "mimo-v2.5-pro",
            provider: "custom",
            apiSource: "custom",
            apiKey: "sk-source",
            customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
            apiKeyHeader: "api-key",
            tools: ["read", "fetchWebpage"],
          },
        });
      }
      if (url.includes("/api/v1/db/read/space-space-1")) {
        return Response.json({ data: { id: "space-1", type: "space", contents: {} } });
      }
      if (url.endsWith("/api/v1/db/write/")) {
        return Response.json({ ok: true });
      }
      return Response.json({ error: "unexpected" }, { status: 404 });
    };
    const out = outputBuffer();

    const exitCode = await runSetupOfflineMarxistsAgentCommand(
      [
        "--server",
        "https://nolo.chat",
        "--source-agent",
        "agent-user-1-source",
        "--target-agent-id",
        "target",
        "--space",
        "space-1",
        "--json",
      ],
      {
        env: { AUTH_TOKEN: "x.eyJ1c2VySWQiOiJ1c2VyLTEifQ==.sig", NOLO_USER_ID: "user-1" },
        fetchImpl: fetchImpl as typeof fetch,
        output: out.output,
        now: () => 123,
      }
    );

    expect(exitCode).toBe(0);
    const targetWrite = requests.find((request) => request.body?.customKey === "agent-user-1-target");
    expect(targetWrite?.body?.data).toMatchObject({
      id: "target",
      type: "agent",
      model: "mimo-v2.5-pro",
      apiKey: "sk-source",
      customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
    });
    expect(targetWrite?.body?.data.tools).toEqual(["convertMarxistsBookToOfflineHtml"]);
    const spaceWrite = requests.find((request) => request.body?.customKey === "space-space-1");
    expect(spaceWrite?.body?.data.contents["agent-user-1-target"]).toMatchObject({
      type: "agent",
      contentKey: "agent-user-1-target",
    });
    expect(JSON.parse(out.text()).agentUrl).toBe("https://nolo.chat/agent-user-1-target");
  });

  test("uses the JWT payload userId when NOLO_USER_ID is not provided", async () => {
    const requests: Array<{ url: string; body?: any }> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      requests.push({ url, body });
      if (url.includes("/api/v1/db/read/fullstack")) {
        return Response.json({
          data: {
            id: "source",
            type: "agent",
            model: "mimo-v2.5-pro",
            provider: "custom",
            apiKey: "sk-source",
            customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
          },
        });
      }
      if (url.includes("/api/v1/db/read/space-01KKY77TT0DA9NY7TNW3R7255N")) {
        return Response.json({ data: { id: "01KKY77TT0DA9NY7TNW3R7255N", type: "space", contents: {} } });
      }
      if (url.endsWith("/api/v1/db/write/")) {
        return Response.json({ ok: true });
      }
      return Response.json({ error: "unexpected" }, { status: 404 });
    };

    const exitCode = await runSetupOfflineMarxistsAgentCommand([], {
      env: { AUTH_TOKEN: "x.eyJ1c2VySWQiOiJ1c2VyLWZyb20tdG9rZW4ifQ.sig" },
      fetchImpl: fetchImpl as typeof fetch,
      output: outputBuffer().output,
      now: () => 123,
    });

    expect(exitCode).toBe(0);
    expect(requests.some((request) => request.body?.customKey === "agent-user-from-token-01OFFMARXBOOK000000010AHL1")).toBe(true);
  });
});
