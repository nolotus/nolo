import { describe, expect, test } from "bun:test";
import { Writable } from "node:stream";

import { parseAgentPullArgs, runAgentPullCommand } from "./agentPullCommand";

class CaptureOutput extends Writable {
  chunks: string[] = [];

  _write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.chunks.push(String(chunk));
    callback();
  }

  text() {
    return this.chunks.join("");
  }
}

function createMemoryDb() {
  const values = new Map<string, any>();
  return {
    values,
    async get(key: string) {
      if (!values.has(key)) throw new Error(`not found: ${key}`);
      return values.get(key);
    },
    async put(key: string, value: any) {
      values.set(key, value);
    },
    async del(key: string) {
      values.delete(key);
    },
    async batch(ops: Array<{ type: "put"; key: string; value: any }>) {
      for (const op of ops) values.set(op.key, op.value);
    },
    async *iterator() {},
  };
}

describe("cli agent pull command", () => {
  test("parses required agent ref", () => {
    expect(parseAgentPullArgs(["agent-pub-123"])).toEqual({ agentKey: "agent-pub-123" });
    expect(parseAgentPullArgs(["--agent", "agent-pub-123"])).toEqual({ agentKey: "agent-pub-123" });
    expect(parseAgentPullArgs(["frontend-implementer"])).toEqual({
      agentKey: "agent-0e95801d90-01FRONTENDAG0000000115N4E1",
    });
    expect(parseAgentPullArgs([])).toBeNull();
  });

  test("reads an agent from the configured server and stores it in local LevelDB", async () => {
    const output = new CaptureOutput();
    const db = createMemoryDb();
    const requests: Array<{ url: string; auth: string | null }> = [];

    const exitCode = await runAgentPullCommand(["agent-pub-01FRONTEND"], {
      env: {
        AUTH_TOKEN: "token-123",
        NOLO_SERVER: "https://us.nolo.chat/",
        NOLO_LOCAL_USER_ID: "local-user",
      },
      output,
      db,
      fetchImpl: async (url, init) => {
        requests.push({
          url: String(url),
          auth: new Headers(init?.headers).get("Authorization"),
        });
        return Response.json({
          data: {
            id: "01FRONTEND",
            dbKey: "agent-pub-01FRONTEND",
            name: "Frontend Implementer",
            prompt: "Make UI polished.",
            model: "gpt-4.1-mini",
            provider: "openai",
            tools: [
              { name: "edit" },
              { type: "function", function: { name: "writeFile" } },
            ],
            isPublic: true,
          },
        });
      },
    });

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        url: "https://us.nolo.chat/api/v1/db/read/agent-pub-01FRONTEND",
        auth: "Bearer token-123",
      },
    ]);
    expect(db.values.get("agent-pub-01FRONTEND")).toMatchObject({
      name: "Frontend Implementer",
      prompt: "Make UI polished.",
      model: "gpt-4.1-mini",
      provider: "openai",
      toolNames: ["edit", "writeFile"],
    });
    expect(output.text()).toContain("cached agent-pub-01FRONTEND");
  });

  test("prefers explicit token and server args over env defaults", async () => {
    const output = new CaptureOutput();
    const db = createMemoryDb();
    const requests: Array<{ url: string; auth: string | null }> = [];

    const exitCode = await runAgentPullCommand(
      [
        "agent-pub-01FRONTEND",
        "--token",
        "arg-token",
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: {
          AUTH_TOKEN: "env-token",
          NOLO_SERVER: "https://env.nolo.chat/",
        },
        output,
        db,
        fetchImpl: async (url, init) => {
          requests.push({
            url: String(url),
            auth: new Headers(init?.headers).get("Authorization"),
          });
          return Response.json({
            data: {
              id: "01FRONTEND",
              dbKey: "agent-pub-01FRONTEND",
              name: "Frontend Implementer",
            },
          });
        },
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        url: "https://arg.nolo.chat/api/v1/db/read/agent-pub-01FRONTEND",
        auth: "Bearer arg-token",
      },
    ]);
  });
});
