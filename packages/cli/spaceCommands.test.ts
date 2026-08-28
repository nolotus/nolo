import { afterEach, describe, expect, mock, test } from "bun:test";

import {
  runSpaceAcceptInviteCommand,
  runSpaceCreateCommand,
  runSpaceInviteCommand,
} from "./spaceCommands";

const originalFetch = globalThis.fetch;

function tokenForUser(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
  return `header.${payload}.sig`;
}

describe("space cli commands", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("creates a space and owner membership for the auth user", async () => {
    const requests: Array<{ url: string; body: any }> = [];
    const output: string[] = [];
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? "{}")),
      });
      return Response.json({ ok: true });
    }) as any;

    const exitCode = await runSpaceCreateCommand(
      [
        "--name",
        "Client X Test",
        "--description",
        "Shared testing space",
        "--id",
        "01CLIENTTEST",
        "--server",
        "https://nolo.chat",
      ],
      {
        env: { AUTH_TOKEN: tokenForUser("owner-1") } as NodeJS.ProcessEnv,
        output: { write(chunk) { output.push(String(chunk)); } },
      },
    );

    expect(exitCode).toBe(0);
    expect(requests.map((request) => request.body.customKey)).toEqual([
      "space-01CLIENTTEST",
      "space-member-owner-1-01CLIENTTEST",
    ]);
    expect(requests[0]?.body.userId).toBe("owner-1");
    expect(requests[0]?.body.data).toMatchObject({
      id: "01CLIENTTEST",
      name: "Client X Test",
      description: "Shared testing space",
      ownerId: "owner-1",
      visibility: "private",
      members: ["owner-1"],
      type: "space",
    });
    expect(requests[1]?.body.data).toMatchObject({
      userId: "owner-1",
      role: "owner",
      spaceId: "01CLIENTTEST",
      spaceName: "Client X Test",
      ownerId: "owner-1",
      visibility: "private",
      type: "space",
    });
  });

  test("invites an existing user id by updating the space and member record", async () => {
    const requests: Array<{ method: string; url: string; body?: any }> = [];
    const output: string[] = [];
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({
        method: init?.method ?? "GET",
        url: String(url),
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      });
      if (String(url).endsWith("/api/v1/db/read/space-01CLIENTTEST")) {
        return Response.json({
          id: "01CLIENTTEST",
          name: "Client X Test",
          description: "",
          ownerId: "owner-1",
          visibility: "private",
          members: ["owner-1"],
          categories: {},
          contents: {},
          createdAt: 100,
          updatedAt: 100,
          type: "space",
        });
      }
      return Response.json({ ok: true });
    }) as any;

    const exitCode = await runSpaceInviteCommand(
      [
        "--space",
        "01CLIENTTEST",
        "--member",
        "client-1",
        "--role",
        "member",
        "--server",
        "https://nolo.chat",
      ],
      {
        env: { AUTH_TOKEN: tokenForUser("owner-1") } as NodeJS.ProcessEnv,
        output: { write(chunk) { output.push(String(chunk)); } },
      },
    );

    expect(exitCode).toBe(0);
    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ["GET", "https://nolo.chat/api/v1/db/read/space-01CLIENTTEST"],
      ["POST", "https://nolo.chat/api/v1/db/write/"],
      ["POST", "https://nolo.chat/api/v1/db/write/"],
    ]);
    expect(requests[1]?.body.customKey).toBe("space-01CLIENTTEST");
    expect(requests[1]?.body.data.members).toEqual(["owner-1", "client-1"]);
    expect(requests[2]?.body.customKey).toBe("space-member-client-1-01CLIENTTEST");
    expect(requests[2]?.body.data).toMatchObject({
      userId: "client-1",
      role: "member",
      spaceId: "01CLIENTTEST",
      spaceName: "Client X Test",
      ownerId: "owner-1",
      visibility: "private",
      type: "space",
    });
  });

  test("invites by email through the space invite API", async () => {
    const requests: Array<{ method: string; url: string; body?: any }> = [];
    const output: string[] = [];
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({
        method: init?.method ?? "GET",
        url: String(url),
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      });
      return Response.json({
        spaceId: "01CLIENTTEST",
        email: "client@example.com",
        role: "member",
        inviteKey: "space-invite-01CLIENTTEST-01INVITE",
        inviteUrl: "https://nolo.chat/space/invite?spaceInvite=01INVITE",
        emailStatus: "sent",
      });
    }) as any;

    const exitCode = await runSpaceInviteCommand(
      [
        "--space",
        "01CLIENTTEST",
        "--email",
        "client@example.com",
        "--role",
        "member",
        "--server",
        "https://nolo.chat",
        "--json",
      ],
      {
        env: { AUTH_TOKEN: tokenForUser("owner-1") } as NodeJS.ProcessEnv,
        output: { write(chunk) { output.push(String(chunk)); } },
      },
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        method: "POST",
        url: "https://nolo.chat/api/v1/users/space-invite",
        body: {
          spaceId: "01CLIENTTEST",
          email: "client@example.com",
          role: "member",
        },
      },
    ]);
    expect(JSON.parse(output.join(""))).toMatchObject({
      inviteKey: "space-invite-01CLIENTTEST-01INVITE",
      emailStatus: "sent",
    });
  });

  test("accepts a pending email invite through the space invite API", async () => {
    const requests: Array<{ method: string; url: string; body?: any }> = [];
    const output: string[] = [];
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({
        method: init?.method ?? "GET",
        url: String(url),
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      });
      return Response.json({
        spaceId: "01CLIENTTEST",
        memberKey: "space-member-client-1-01CLIENTTEST",
        status: "accepted",
      });
    }) as any;

    const exitCode = await runSpaceAcceptInviteCommand(
      [
        "--invite",
        "01INVITE",
        "--server",
        "https://nolo.chat",
        "--json",
      ],
      {
        env: { AUTH_TOKEN: tokenForUser("client-1") } as NodeJS.ProcessEnv,
        output: { write(chunk) { output.push(String(chunk)); } },
      },
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        method: "POST",
        url: "https://nolo.chat/api/v1/users/space-invite/accept",
        body: {
          token: "01INVITE",
        },
      },
    ]);
    expect(JSON.parse(output.join(""))).toMatchObject({
      spaceId: "01CLIENTTEST",
      status: "accepted",
    });
  });
});
