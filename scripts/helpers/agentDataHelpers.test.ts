import { afterEach, describe, expect, it, mock } from "bun:test";

import { FIREWORKS_KIMI_LATEST_MODEL } from "../../packages/ai/llm/kimi";

let moduleVersion = 0;

async function loadModuleWithApiGet(
  apiGetImpl: (url: string, token?: string) => Promise<any>,
  apiPostImpl?: (url: string, body: unknown, token?: string) => Promise<any>,
) {
  const actualApiHelpers = await import("./apiHelpers");
  mock.module("./apiHelpers", () => ({
    ...actualApiHelpers,
    apiGet: apiGetImpl,
    ...(apiPostImpl ? { apiPost: apiPostImpl } : {}),
  }));

  const mod = await import(`./agentDataHelpers?test=${moduleVersion++}`);
  mock.restore();
  return mod;
}

afterEach(() => {
  mock.restore();
});

describe("agentDataHelpers", () => {
  it("normalizes bare ids, private keys, public keys, and URLs to agent ids", async () => {
    const mod = await loadModuleWithApiGet(async () => {
      throw new Error("not used");
    });

    expect(mod.normalizeAgentIdInput("01APPBUILDER00000001YAII3I")).toBe(
      "01APPBUILDER00000001YAII3I"
    );
    expect(mod.normalizeAgentIdInput("agent-pub-01APPBUILDER00000001YAII3I")).toBe(
      "01APPBUILDER00000001YAII3I"
    );
    expect(
      mod.normalizeAgentIdInput("agent-user-1-01APPBUILDER00000001YAII3I")
    ).toBe("01APPBUILDER00000001YAII3I");
    expect(
      mod.normalizeAgentIdInput("http://127.0.0.1:38123/agent-pub-01APPBUILDER00000001YAII3I")
    ).toBe("01APPBUILDER00000001YAII3I");
  });

  it("returns the first successful agent record across bases and records attempts", async () => {
    const apiGetCalls: string[] = [];
    const mod = await loadModuleWithApiGet(async (url: string) => {
      apiGetCalls.push(url);
      if (url.startsWith("http://localhost")) {
        return {
          ok: false,
          status: 404,
          data: { error: "not found" },
        };
      }
      return {
        ok: true,
        status: 200,
        data: {
          data: {
            name: "App Builder",
            model: FIREWORKS_KIMI_LATEST_MODEL,
          },
        },
      };
    });

    const result = await mod.readAgentRecordAcrossBases({
      bases: ["http://localhost", "https://us.nolo.chat", "https://nolo.chat"],
      agentKey: "agent-pub-01APPBUILDER00000001YAII3I",
      authToken: "token",
    });

    expect(result.resolvedBase).toBe("https://us.nolo.chat");
    expect(result.record).toEqual({
      name: "App Builder",
      model: FIREWORKS_KIMI_LATEST_MODEL,
    });
    expect(result.attempts).toEqual([
      {
        base: "http://localhost",
        ok: false,
        status: 404,
        message: 'read agent failed (404): {"error":"not found"}',
      },
      {
        base: "https://us.nolo.chat",
        ok: true,
      },
    ]);
    expect(apiGetCalls).toEqual([
      "http://localhost/api/v1/db/read/agent-pub-01APPBUILDER00000001YAII3I",
      "https://us.nolo.chat/api/v1/db/read/agent-pub-01APPBUILDER00000001YAII3I",
    ]);
  });

  it("throws with collected attempts when all bases fail", async () => {
    const mod = await loadModuleWithApiGet(async () => ({
      ok: false,
      status: 500,
      data: { error: "boom" },
    }));

    await expect(
      mod.readAgentRecordAcrossBases({
        bases: ["http://localhost", "https://us.nolo.chat"],
        agentKey: "agent-pub-01APPBUILDER00000001YAII3I",
      })
    ).rejects.toMatchObject({
      message: "All agent reads failed",
      attempts: [
        {
          base: "http://localhost",
          ok: false,
          status: 500,
          message: 'read agent failed (500): {"error":"boom"}',
        },
        {
          base: "https://us.nolo.chat",
          ok: false,
          status: 500,
          message: 'read agent failed (500): {"error":"boom"}',
        },
      ],
    });
  });

  it("resolves agent handles from queried agent records", async () => {
    const apiPostCalls: Array<{ url: string; body: unknown; token?: string }> = [];
    const token = `x.${Buffer.from(JSON.stringify({ userId: "user-1" })).toString("base64")}.y`;
    const mod = await loadModuleWithApiGet(
      async () => {
        throw new Error("read not used");
      },
      async (url, body, authToken) => {
        apiPostCalls.push({ url, body, token: authToken });
        return {
          ok: true,
          status: 200,
          data: {
            data: [
              { dbKey: "agent-user-1-a", type: "agent", handle: "other" },
              { dbKey: "agent-user-1-pm", type: "agent", handle: "pm" },
            ],
          },
        };
      },
    );

    const result = await mod.resolveAgentRecordInputAcrossBases({
      bases: ["https://us.nolo.chat"],
      agentInput: "pm",
      authToken: token,
    });

    expect(result.agentKey).toBe("agent-user-1-pm");
    expect(result.record).toMatchObject({ dbKey: "agent-user-1-pm" });
    expect(apiPostCalls).toEqual([
      {
        url: "https://us.nolo.chat/api/v1/db/query/user-1?limit=200",
        body: { type: "agent" },
        token,
      },
    ]);
  });

  it("resolves agent handles from the local CLI cache when token userId is opaque", async () => {
    const apiPostCalls: unknown[] = [];
    const mod = await loadModuleWithApiGet(
      async () => {
        throw new Error("read not used");
      },
      async (url, body, authToken) => {
        apiPostCalls.push({ url, body, authToken });
        throw new Error("remote query should not be used");
      },
    );
    const localDb = {
      async *iterator() {
        yield [
          "agent-user-1-pm",
          {
            dbKey: "agent-user-1-pm",
            type: "agent",
            handle: "pm",
            serverOrigin: "https://us.nolo.chat",
          },
        ];
      },
    };

    const result = await mod.resolveAgentRecordInputAcrossBases({
      bases: ["https://us.nolo.chat"],
      agentInput: "pm",
      authToken: "opaque-token",
      localDb,
    });

    expect(result.agentKey).toBe("agent-user-1-pm");
    expect(result.resolvedBase).toBe("https://us.nolo.chat");
    expect(result.record).toMatchObject({ dbKey: "agent-user-1-pm", handle: "pm" });
    expect(apiPostCalls).toEqual([]);
  });
});
