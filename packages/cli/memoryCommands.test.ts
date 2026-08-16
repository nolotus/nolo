import { describe, expect, test } from "bun:test";

import { runMemoryDeleteCommand, runMemoryListCommand, runMemoryRememberCommand } from "./memoryCommands";

function authEnv(userId: string, extra: Record<string, string> = {}) {
  return {
    AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId })).toString("base64")}.sig`,
    ...extra,
  };
}

type TestFetch = (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => Promise<Response>;

function testFetch(fn: TestFetch): typeof fetch {
  return fn as unknown as typeof fetch;
}

describe("cli memory commands", () => {
  test("memory delete help is served by the internal command", async () => {
    const chunks: string[] = [];

    const exitCode = await runMemoryDeleteCommand(["--help"], {
      env: authEnv("user-1"),
      output: { write(chunk) { chunks.push(String(chunk)); } },
    });

    expect(exitCode).toBe(0);
    expect(chunks.join("")).toContain("Usage:\n  nolo memory delete");
    expect(chunks.join("")).toContain("--source-dialog <dialogId>");
  });

  test("memory delete refuses unfiltered deletes", async () => {
    const chunks: string[] = [];

    const exitCode = await runMemoryDeleteCommand(["--yes"], {
      env: authEnv("user-1"),
      output: { write(chunk) { chunks.push(String(chunk)); } },
    });

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("requires at least one filter");
  });

  test("memory delete dry-run prints request without calling the server", async () => {
    const chunks: string[] = [];
    const requests: string[] = [];

    const exitCode = await runMemoryDeleteCommand(
      [
        "--source-dialog",
        "01DIALOG",
        "--kind",
        "episodic",
        "--tag",
        "explicit-memory",
        "--server",
        "https://arg.nolo.chat",
        "--json",
      ],
      {
        env: authEnv("user-1"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          requests.push(String(url));
          return Response.json({});
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.dryRun).toBe(true);
    expect(parsed.request).toEqual({
      kinds: ["episodic"],
      tags: ["explicit-memory"],
      sourceDialogId: "01DIALOG",
    });
  });

  test("memory delete posts filters to all candidate servers when confirmed", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; body: any; auth: string | null }> = [];

    const exitCode = await runMemoryDeleteCommand(
      [
        "--source-dialog",
        "01DIALOG",
        "--pattern-prefix",
        "explicit-remember",
        "--limit",
        "3",
        "--server",
        "https://arg.nolo.chat",
        "--yes",
        "--json",
      ],
      {
        env: authEnv("user-1"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({
            url: String(url),
            auth: new Headers(init?.headers).get("authorization"),
            body: JSON.parse(String(init?.body ?? "{}")),
          });
          return Response.json({ success: true, deletedCount: 2, deletedIds: ["memory-1", "memory-2"] });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.map((request) => request.url)).toContain("https://arg.nolo.chat/api/memory/delete");
    expect(requests[0]?.auth).toBe(`Bearer ${authEnv("user-1").AUTH_TOKEN}`);
    expect(requests[0]?.body).toEqual({
      sourceDialogId: "01DIALOG",
      patternKeyPrefix: "explicit-remember",
      limit: 3,
    });
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.deleted).toBe(true);
    expect(parsed.deletedCount).toBeGreaterThanOrEqual(2);
    expect(parsed.deleteResults.every((result: any) => result.ok)).toBe(true);
  });
});

describe("cli memory list command", () => {
  test("help is served by the internal command", async () => {
    const chunks: string[] = [];

    const exitCode = await runMemoryListCommand(["--help"], {
      env: authEnv("user-1"),
      output: { write(chunk) { chunks.push(String(chunk)); } },
    });

    expect(exitCode).toBe(0);
    expect(chunks.join("")).toContain("Usage:\n  nolo memory list");
    expect(chunks.join("")).toContain("--subject-type <type>");
  });

  test("requires an auth token", async () => {
    const chunks: string[] = [];

    const exitCode = await runMemoryListCommand(["--limit", "5"], {
      env: {},
      output: { write(chunk) { chunks.push(String(chunk)); } },
    });

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("requires an auth token");
  });

  test("posts filters to /api/memory/list and renders items", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; body: any; auth: string | null }> = [];

    const exitCode = await runMemoryListCommand(
      ["--limit", "2", "--kind", "semantic", "--subject-type", "agent", "--subject", "agent-a", "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("user-1"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({
            url: String(url),
            auth: new Headers(init?.headers).get("authorization"),
            body: JSON.parse(String(init?.body ?? "{}")),
          });
          return Response.json({
            items: [
              { id: "mem-1", kind: "semantic", subjectType: "agent", subjectId: "agent-a", content: "short" },
              { id: "mem-2", kind: "semantic", content: "x".repeat(100) },
            ],
            nextCursor: "cursor-1",
          });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests[0]?.url).toBe("https://arg.nolo.chat/api/memory/list");
    expect(requests[0]?.auth).toBe(`Bearer ${authEnv("user-1").AUTH_TOKEN}`);
    expect(requests[0]?.body).toEqual({
      limit: 2,
      kind: "semantic",
      subjectType: "agent",
      subjectId: "agent-a",
    });
    const out = chunks.join("");
    expect(out).toContain("2 memories");
    expect(out).toContain("mem-1");
    expect(out).toContain("kind=semantic");
    expect(out).toContain("nextCursor: cursor-1");
    expect(out).toContain("…");
  });

  test("--json prints machine-readable payload", async () => {
    const chunks: string[] = [];

    const exitCode = await runMemoryListCommand(
      ["--json", "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("user-1"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async () =>
          Response.json({ items: [{ id: "mem-1" }], nextCursor: undefined })
        ),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.items).toEqual([{ id: "mem-1" }]);
  });
});

describe("cli memory remember command", () => {
  test("help is served by the internal command", async () => {
    const chunks: string[] = [];

    const exitCode = await runMemoryRememberCommand(["--help"], {
      env: authEnv("user-1"),
      output: { write(chunk) { chunks.push(String(chunk)); } },
    });

    expect(exitCode).toBe(0);
    expect(chunks.join("")).toContain("Usage:\n  nolo memory remember");
    expect(chunks.join("")).toContain("--content <text>");
  });

  test("requires --content and --kind", async () => {
    const chunks: string[] = [];

    const exitNoContent = await runMemoryRememberCommand(["--kind", "semantic"], {
      env: authEnv("user-1"),
      output: { write(chunk) { chunks.push(String(chunk)); } },
    });
    expect(exitNoContent).toBe(1);
    expect(chunks.join("")).toContain("requires --content");

    chunks.length = 0;
    const exitNoKind = await runMemoryRememberCommand(["--content", "hi"], {
      env: authEnv("user-1"),
      output: { write(chunk) { chunks.push(String(chunk)); } },
    });
    expect(exitNoKind).toBe(1);
    expect(chunks.join("")).toContain("requires --kind");
  });

  test("rejects unknown kind", async () => {
    const chunks: string[] = [];

    const exitCode = await runMemoryRememberCommand(["--content", "hi", "--kind", "bogus"], {
      env: authEnv("user-1"),
      output: { write(chunk) { chunks.push(String(chunk)); } },
    });

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("requires --kind <episodic|semantic|procedural>");
  });

  test("posts to /api/memory/remember and defaults scope to auto", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; body: any; auth: string | null }> = [];

    const exitCode = await runMemoryRememberCommand(
      ["--content", "prefers conclusion first", "--kind", "semantic", "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("user-1"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({
            url: String(url),
            auth: new Headers(init?.headers).get("authorization"),
            body: JSON.parse(String(init?.body ?? "{}")),
          });
          return Response.json({ success: true, id: "mem-9" });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests[0]?.url).toBe("https://arg.nolo.chat/api/memory/remember");
    expect(requests[0]?.auth).toBe(`Bearer ${authEnv("user-1").AUTH_TOKEN}`);
    expect(requests[0]?.body).toEqual({
      content: "prefers conclusion first",
      kind: "semantic",
      scope: "auto",
    });
    expect(chunks.join("")).toContain("remembered semantic");
  });

  test("--json prints server response", async () => {
    const chunks: string[] = [];

    const exitCode = await runMemoryRememberCommand(
      ["--content", "x", "--kind", "episodic", "--dialog-id", "01D", "--json", "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("user-1"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async () => Response.json({ id: "mem-7" })),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed).toEqual({ id: "mem-7" });
  });
});
