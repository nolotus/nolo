import { afterEach, describe, expect, mock, test } from "bun:test";

import { runDocCreateCommand, runSkillDocCreateCommand } from "./docCreateCommands";

const originalFetch = globalThis.fetch;

function tokenForUser(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
  return `header.${payload}.sig`;
}

describe("doc create cli commands", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("creates normal docs for the auth token owner instead of a demo user", async () => {
    const requests: Array<{ url: string; body: any }> = [];
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? "{}")),
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    const exitCode = await runDocCreateCommand(
      ["--title", "Owner Test", "--body", "hello", "--server", "https://nolo.chat", "--id", "DOC001"],
      { env: { AUTH_TOKEN: tokenForUser("0e95801d90") } as NodeJS.ProcessEnv }
    );

    expect(exitCode).toBe(0);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://nolo.chat/api/v1/db/write/");
    expect(requests[0]?.body.userId).toBe("0e95801d90");
    expect(requests[0]?.body.customKey).toBe("page-0e95801d90-DOC001");
    expect(requests[0]?.body.data.title).toBe("Owner Test");
    expect(requests[0]?.body.data.meta).toBeUndefined();
  });

  test("creates skill-backed docs with skill metadata", async () => {
    const requests: Array<{ body: any }> = [];
    globalThis.fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
      requests.push({ body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    const exitCode = await runSkillDocCreateCommand(
      [
        "--title",
        "Course Skill",
        "--description",
        "Use course references",
        "--body",
        "Follow the source docs.",
        "--server",
        "https://nolo.chat",
        "--id",
        "01SKCOURSE",
        "--tools",
        '["readDoc"]',
      ],
      { env: { AUTH_TOKEN: tokenForUser("0e95801d90") } as NodeJS.ProcessEnv }
    );

    expect(exitCode).toBe(0);
    const record = requests[0]?.body.data;
    expect(requests[0]?.body.customKey).toBe("page-0e95801d90-01SKCOURSE");
    expect(record.meta.kind).toBe("skill");
    expect(record.meta.skillConfig.name).toBe("Course Skill");
    expect(record.meta.skillConfig.toolNames).toEqual(["readDoc"]);
    expect(record.content).toContain("skill-config");
  });

  test("dry-run can resolve local-only without requiring auth", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("dry-run should not write");
    }) as any;

    const exitCode = await runDocCreateCommand(
      ["--title", "Local Draft", "--body", "draft", "--local-only", "--dry-run"],
      { env: {} as NodeJS.ProcessEnv }
    );

    expect(exitCode).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
