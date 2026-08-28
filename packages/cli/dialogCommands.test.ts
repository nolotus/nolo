import { describe, expect, test } from "bun:test";

import {
  readDialogSnapshot,
  runDialogDeleteCommand,
  runDialogListCommand,
  runDialogQueryCommand,
  runDialogReadCommand,
  runDialogStatusCommand,
} from "./dialogCommands";
import {
  buildDialogAttachmentPlan,
  extractFileContentIds,
} from "./dialogAttachmentCleanup";

function authEnv(userId: string, extra: Record<string, string> = {}) {
  return {
    AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId })).toString("base64")}.sig`,
    ...extra,
  };
}

function standardJwtEnv(userId: string, extra: Record<string, string> = {}) {
  return {
    AUTH_TOKEN: `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64")}.${Buffer.from(JSON.stringify({ userId })).toString("base64")}.sig`,
    ...extra,
  };
}

type TestFetch = (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => Promise<Response>;

function testFetch(fn: TestFetch): typeof fetch {
  return fn as unknown as typeof fetch;
}

const dialogId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const secondDialogId = "01BRZ3NDEKTSV4RRFFQ69G5FAA";

describe("cli dialog commands", () => {
  test("dialog attachment cleanup plans only explicit dialog-owned files for deletion", () => {
    expect(extractFileContentIds({
      content: [
        { type: "image_url", image_url: { url: "https://nolo.chat/api/v1/db/file/content/file-delete" } },
        { type: "image_url", image_url: { url: "/api/v1/db/file/content/file-retain?download=1" } },
      ],
    })).toEqual(["file-delete", "file-retain"]);

    const plan = buildDialogAttachmentPlan({
      dialogId,
      messages: [
        {
          id: "msg-1",
          content: [
            { type: "image_url", image_url: { url: "https://nolo.chat/api/v1/db/file/content/file-delete" } },
            { type: "image_url", image_url: { url: "https://nolo.chat/api/v1/db/file/content/file-retain" } },
          ],
        },
      ],
      metadataByFileId: {
        "file-delete": {
          id: "file-delete",
          dbKey: "file-user-1-file-delete",
          size: 123,
          ownerType: "dialog",
          ownerId: dialogId,
        },
        "file-retain": {
          id: "file-retain",
          dbKey: "file-user-1-file-retain",
          size: 456,
          ownerType: "user",
          ownerId: "user-1",
        },
      },
    });

    expect(plan.deleteCandidates.map((candidate) => candidate.fileId)).toEqual(["file-delete"]);
    expect(plan.retainedCandidates.map((candidate) => candidate.fileId)).toEqual(["file-retain"]);
    expect(plan.bytesToDelete).toBe(123);
  });

  test("dialog attachment cleanup can explicitly include same-user referenced files", () => {
    const plan = buildDialogAttachmentPlan({
      dialogId,
      ownerId: "user-1",
      includeUserOwnedReferenced: true,
      messages: [
        {
          id: "msg-1",
          content: [
            { type: "image_url", image_url: { url: "https://nolo.chat/api/v1/db/file/content/file-user-owned" } },
          ],
        },
      ],
      metadataByFileId: {
        "file-user-owned": {
          id: "file-user-owned",
          dbKey: "file-user-1-file-user-owned",
          size: 456,
          ownerType: "user",
          ownerId: "user-1",
        },
      },
    });

    expect(plan.deleteCandidates.map((candidate) => candidate.fileId)).toEqual(["file-user-owned"]);
    expect(plan.deleteCandidates[0]?.reason).toContain("explicit referenced-attachment deletion");
  });


  test("dialog read falls back to the local store after remote 404s", async () => {
    const dialogId = "01JZZZZZZZZZZZZZZZZZZZZZZZ";
    const dialogKey = `dialog-user-1-${dialogId}`;
    const result = await readDialogSnapshot({
      authToken: authEnv("user-1").AUTH_TOKEN!,
      base: "https://nolo.chat",
      dialogId,
      dialogKey,
      limit: 0,
      fetchImpl: testFetch(async () => new Response("not found", { status: 404 })),
      readLocalDialog: async (args) => ({
        meta: { dbKey: args.dialogKey, status: "done" },
        msgs: [{ role: "assistant", content: "local result" }],
      }),
    });

    expect(result.source).toBe("local-db-fallback");
    expect(result.meta.status).toBe("done");
    expect(result.msgs[0].content).toBe("local result");
    // resolvedBase 保持调用方配置的真实 base（供渲染），本地回退由 source 字段
    // 标识——实现从未产出过 "local-db" 这个 sentinel，早先的断言是笔误。
    expect(result.resolvedBase).toBe("https://nolo.chat");
  });

  test("dialog read candidates include the local dev origin at the tail", async () => {
    const dialogId = "01JZZZZZZZZZZZZZZZZZZZZZZZ";
    const dialogKey = `dialog-user-1-${dialogId}`;
    const result = await readDialogSnapshot({
      authToken: authEnv("user-1").AUTH_TOKEN!,
      base: "https://nolo.chat",
      dialogId,
      dialogKey,
      limit: 0,
      fetchImpl: testFetch(async () => new Response("not found", { status: 404 })),
      readLocalDialog: async (args) => ({
        meta: { dbKey: args.dialogKey, status: "done" },
        msgs: [{ role: "assistant", content: "local result" }],
      }),
    });

    // 本地 origin 只注入 dialog 读路径（去重后置尾），不污染共享 resolveServerCandidates。
    expect(result.candidateBases).toContain("http://127.0.0.1:38123");
    expect(result.candidateBases[result.candidateBases.length - 1]).toBe("http://127.0.0.1:38123");
  });

  test("dialog read failure reports attempts detail and next-step hint", async () => {
    const chunks: string[] = [];

    const exitCode = await runDialogReadCommand(
      [dialogId, "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async () => new Response("not found", { status: 404 })),
      }
    );

    expect(exitCode).toBe(1);
    const text = chunks.join("");
    expect(text).toContain("dialog read failed");
    expect(text).toContain("attempts:");
    expect(text).toContain("https://arg.nolo.chat");
    expect(text).toContain("HTTP 404");
    expect(text).toContain("next-step:");
    expect(text).toContain("data/leveldb");
  });

  test("dialog read failure maps 'Unable to connect' to the connectivity next-step hint", async () => {
    const chunks: string[] = [];

    const exitCode = await runDialogReadCommand(
      [dialogId, "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async () => {
          throw new Error("Unable to connect. Is the computer able to access the url?");
        }),
      }
    );

    expect(exitCode).toBe(1);
    const text = chunks.join("");
    expect(text).toContain("dialog read failed");
    expect(text).toContain("Unable to connect");
    expect(text).toContain("NOLO_SERVER");
  });

  test("dialog read failure maps bare ECONNREFUSED / DNS errors to the connectivity next-step hint", async () => {
    for (const message of [
      "fetch failed: connect ECONNREFUSED 127.0.0.1:38123",
      "fetch failed: getaddrinfo ENOTFOUND nolo.chat",
      "fetch failed: getaddrinfo EAI_AGAIN nolo.chat",
    ]) {
      const chunks: string[] = [];
      const exitCode = await runDialogReadCommand(
        [dialogId, "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
        {
          env: authEnv("env-user"),
          output: { write(chunk) { chunks.push(String(chunk)); } },
          fetchImpl: testFetch(async () => { throw new Error(message); }),
        }
      );
      expect(exitCode).toBe(1);
      const text = chunks.join("");
      expect(text).toContain("dialog read failed");
      expect(text).toContain("NOLO_SERVER");
    }
  });

test("dialog read help is served by the internal command", async () => {
    const chunks: string[] = [];

    const exitCode = await runDialogReadCommand(["--help"], {
      env: authEnv("user-1"),
      output: { write(chunk) { chunks.push(String(chunk)); } },
    });

    expect(exitCode).toBe(0);
    expect(chunks.join("")).toContain("Usage:\n  nolo dialog read");
    expect(chunks.join("")).toContain("--server <url>");
  });

  test("dialog read fetches metadata and messages over HTTP", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; body?: any }> = [];

    const exitCode = await runDialogReadCommand(
      [dialogId, "25", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({
            url: String(url),
            ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
          });
          if (String(url).endsWith(`/api/v1/db/read/dialog-user-1-${dialogId}`)) {
            return Response.json({
              title: "Read me",
              status: "done",
              toolsUsed: ["execShell"],
              triggerType: "api",
              executionMode: "background",
              threadKind: "background",
              presentationIntent: "background_handoff",
              parentThreadId: "parent-dialog",
              rootThreadId: "root-dialog",
              runtimeContext: { entrypoint: "agent-tool:startAgentRun" },
              parentWake: {
                terminalStatus: "done",
                terminalNotifiedAt: 1781445772698,
              },
              subjectRefs: [{ kind: "dialog", id: "child-1", role: "completed-child-dialog" }],
            });
          }
          if (String(url).endsWith("/rpc/getConvMsgs")) {
            return Response.json([
              { role: "assistant", content: "done" },
              { role: "user", content: "hello" },
            ]);
          }
          return new Response("not found", { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.map((request) => request.url)).toEqual([
      `https://arg.nolo.chat/api/v1/db/read/dialog-user-1-${dialogId}`,
      "https://arg.nolo.chat/rpc/getConvMsgs",
    ]);
    expect(requests[1]?.body).toEqual({ dialogId, dialogKey: `dialog-user-1-${dialogId}`, limit: 25 });
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.source).toBe("http");
    expect(parsed.base).toBe("https://arg.nolo.chat");
    expect(parsed.title).toBe("Read me");
    expect(parsed.toolsUsed).toEqual(["execShell"]);
    expect(parsed.triggerType).toBe("api");
    expect(parsed.executionMode).toBe("background");
    expect(parsed.threadKind).toBe("background");
    expect(parsed.presentationIntent).toBe("background_handoff");
    expect(parsed.parentThreadId).toBe("parent-dialog");
    expect(parsed.rootThreadId).toBe("root-dialog");
    expect(parsed.runtimeContext).toMatchObject({ entrypoint: "agent-tool:startAgentRun" });
    expect(parsed.parentWake).toMatchObject({ terminalStatus: "done" });
    expect(parsed.subjectRefs).toEqual([
      { kind: "dialog", id: "child-1", role: "completed-child-dialog" },
    ]);
    expect(parsed.messages).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "done" },
    ]);
  });

  test("dialog read accepts --user before the raw dialog id", async () => {
    const chunks: string[] = [];
    const requests: string[] = [];

    const exitCode = await runDialogReadCommand(
      ["--user", "owner-1", dialogId, "--token", "opaque-token", "--server", "https://arg.nolo.chat"],
      {
        env: {},
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          requests.push(String(url));
          if (String(url).endsWith(`/api/v1/db/read/dialog-owner-1-${dialogId}`)) {
            return Response.json({ title: "By owner", status: "done" });
          }
          if (String(url).endsWith("/rpc/getConvMsgs")) {
            return Response.json([]);
          }
          return new Response("not found", { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests[0]).toBe(`https://arg.nolo.chat/api/v1/db/read/dialog-owner-1-${dialogId}`);
    expect(JSON.parse(chunks.join("")).userId).toBe("owner-1");
  });

  test("dialog read derives raw dialog owner from standard JWT payload", async () => {
    const chunks: string[] = [];
    const requests: string[] = [];

    const exitCode = await runDialogReadCommand(
      [dialogId, "--server", "https://arg.nolo.chat"],
      {
        env: standardJwtEnv("jwt-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          requests.push(String(url));
          if (String(url).endsWith(`/api/v1/db/read/dialog-jwt-user-${dialogId}`)) {
            return Response.json({ title: "JWT dialog", status: "done" });
          }
          if (String(url).endsWith("/rpc/getConvMsgs")) {
            return Response.json([]);
          }
          return new Response("not found", { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests[0]).toBe(`https://arg.nolo.chat/api/v1/db/read/dialog-jwt-user-${dialogId}`);
    expect(JSON.parse(chunks.join("")).userId).toBe("jwt-user");
  });

  test("dialog status renders compact status from HTTP metadata", async () => {
    const chunks: string[] = [];

    const exitCode = await runDialogStatusCommand(
      [dialogId, "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          if (String(url).endsWith(`/api/v1/db/read/dialog-user-1-${dialogId}`)) {
            return Response.json({
              title: "Status me",
              status: "failed",
              triggerType: "api",
              executionMode: "background",
              threadKind: "background",
              presentationIntent: "background_handoff",
              parentThreadId: "parent-dialog",
              rootThreadId: "root-dialog",
              runtimeContext: { entrypoint: "agent-runtime:parent-child-terminal-wake" },
              parentWake: {
                terminalStatus: "failed",
                terminalNotifiedAt: 1781445772698,
              },
              runtimeCheckpoint: {
                status: "failed",
                errorMessage: "Connector disconnected for machine: machine-win",
              },
              artifacts: { changedFiles: ["packages/cli/dialogCommands.ts"] },
              subjectRefs: [{ kind: "task", id: "row-1", role: "review" }],
              toolsUsed: ["execShell"],
              toolErrors: ["execShell"],
            });
          }
          if (String(url).endsWith("/rpc/getConvMsgs")) {
            return Response.json([]);
          }
          return new Response("not found", { status: 404 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    const output = chunks.join("");
    expect(output).toContain(`dialog: ${dialogId}`);
    expect(output).toContain("base: https://arg.nolo.chat");
    expect(output).toContain("state: failed");
    expect(output).toContain("triggerType: api");
    expect(output).toContain("executionMode: background");
    expect(output).toContain("threadKind: background");
    expect(output).toContain("presentationIntent: background_handoff");
    expect(output).toContain("parentThreadId: parent-dialog");
    expect(output).toContain("rootThreadId: root-dialog");
    expect(output).toContain("runtimeEntrypoint: agent-runtime:parent-child-terminal-wake");
    expect(output).toContain("parentWakeStatus: failed");
    expect(output).toContain("parentWakeAt: 1781445772698");
    expect(output).toContain("error: Connector disconnected for machine: machine-win");
    expect(output).toContain("tools: execShell");
    expect(output).toContain("files: packages/cli/dialogCommands.ts");
    expect(output).toContain("subjects: task:row-1#review");
    expect(output).toContain("toolErrors: execShell");
  });

  test("dialog query reads subjectRef-linked dialog evidence through the db query endpoint", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; body: any }> = [];

    const exitCode = await runDialogQueryCommand(
      [
        "--json",
        "--subject-kind",
        "table-row",
        "--subject-id",
        "row-user-1-board-task",
        "--subject-role",
        "task",
        "--limit",
        "25",
        "--token",
        authEnv("user-1").AUTH_TOKEN!,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({
            url: String(url),
            body: JSON.parse(String(init?.body ?? "{}")),
          });
          return Response.json({
            data: {
              data: [
                {
                  dbKey: `dialog-user-1-${dialogId}`,
                  id: dialogId,
                  type: "dialog",
                  title: "Implementation handoff",
                  status: "done",
                  updatedAt: "2026-06-12T05:47:44Z",
                  subjectRefs: [
                    { kind: "table-row", id: "row-user-1-board-task", role: "task" },
                  ],
                  runtimeCheckpoint: {
                    status: "done",
                    lastToolNames: ["execShell"],
                  },
                  artifacts: [{ kind: "test", command: "bun test" }],
                },
              ],
            },
          });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        url: "https://arg.nolo.chat/api/v1/db/query/user-1",
        body: {
          type: "dialog",
          limit: 25,
          subjectRef: { kind: "table-row", id: "row-user-1-board-task", role: "task" },
        },
      },
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.source).toBe("db.query.subjectRef");
    expect(parsed.strict.ok).toBe(true);
    expect(parsed.target).toEqual({ kind: "table-row", id: "row-user-1-board-task", role: "task" });
    expect(parsed.total).toBe(1);
    expect(parsed.dialogs).toEqual([
      {
        dialogId,
        dialogKey: `dialog-user-1-${dialogId}`,
        title: "Implementation handoff",
        status: "done",
        checkpointStatus: "done",
        updatedAt: "2026-06-12T05:47:44Z",
        hasArtifacts: true,
        artifactCount: 1,
        subjectRefs: [
          { kind: "table-row", id: "row-user-1-board-task", role: "task" },
        ],
        lastToolNames: ["execShell"],
      },
    ]);
  });

  test("dialog query can exclude the current caller dialog from evidence results", async () => {
    const chunks: string[] = [];
    const subjectRef = { kind: "table-row", id: "row-user-1-board-task", role: "task" };

    const exitCode = await runDialogQueryCommand(
      [
        "--json",
        "--row-dbkey",
        "row-user-1-board-task",
        "--exclude-dialog",
        dialogId,
        "--token",
        authEnv("user-1").AUTH_TOKEN!,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async () => Response.json({
          data: {
            data: [
              {
                dbKey: `dialog-user-1-${dialogId}`,
                id: dialogId,
                type: "dialog",
                title: "Current caller",
                status: "running",
                updatedAt: "2026-06-12T06:00:00Z",
                subjectRefs: [subjectRef],
                runtimeCheckpoint: { status: "running" },
              },
              {
                dbKey: "dialog-user-1-01PREVIOUSDIALOG00000000",
                id: "01PREVIOUSDIALOG00000000",
                type: "dialog",
                title: "Previous implementation",
                status: "done",
                updatedAt: "2026-06-12T05:47:44Z",
                subjectRefs: [subjectRef],
                runtimeCheckpoint: { status: "done" },
                artifacts: [{ kind: "test", command: "bun test" }],
              },
            ],
          },
        })),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.excludedDialogIds).toEqual([dialogId]);
    expect(parsed.strict).toMatchObject({
      returnedCount: 1,
      matchedCount: 1,
      unmatchedCount: 0,
    });
    expect(parsed.dialogs.map((dialog: any) => dialog.dialogId)).toEqual([
      "01PREVIOUSDIALOG00000000",
    ]);
  });

  test("dialog list without space queries current user's all-view dialog records", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; body: any }> = [];

    const exitCode = await runDialogListCommand(
      ["--json", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({
            url: String(url),
            body: JSON.parse(String(init?.body ?? "{}")),
          });
          return new Response(JSON.stringify({
            data: {
              data: [
                {
                  dbKey: `dialog-user-1-${dialogId}`,
                  id: dialogId,
                  type: "dialog",
                  userId: "user-1",
                  title: "Normal dialog",
                  updatedAt: "2026-05-30T10:00:00.000Z",
                },
                {
                  dbKey: `dialog-user-1-${secondDialogId}`,
                  id: secondDialogId,
                  type: "dialog",
                  userId: "user-1",
                  title: "Scheduled run",
                  triggerType: "scheduled_run",
                  updatedAt: "2026-05-30T11:00:00.000Z",
                },
              ],
            },
          }), { status: 200 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        url: "https://arg.nolo.chat/api/v1/db/query/user-1",
        body: { type: "dialog", includeDeleted: true },
      },
      {
        url: "https://nolo.chat/api/v1/db/query/user-1",
        body: { type: "dialog", includeDeleted: true },
      },
      {
        url: "https://us.nolo.chat/api/v1/db/query/user-1",
        body: { type: "dialog", includeDeleted: true },
      },
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.source).toBe("user-data");
    expect(parsed.targetServers).toEqual([
      "https://arg.nolo.chat",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
    expect(parsed.total).toBe(1);
    expect(parsed.dialogs.map((dialog: any) => dialog.dbKey)).toEqual([
      `dialog-user-1-${dialogId}`,
    ]);
  });

  test("dialog list without space merges current user's records across server candidates", async () => {
    const chunks: string[] = [];
    const requests: string[] = [];
    const tombstonedDialogId = "01CRZ3NDEKTSV4RRFFQ69G5FAB";
    const liveDialogId = "01DRZ3NDEKTSV4RRFFQ69G5FAC";

    const exitCode = await runDialogListCommand(
      ["--json", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push(String(url));
          const body = JSON.parse(String(init?.body ?? "{}"));
          expect(body.includeDeleted).toBe(true);
          if (String(url) === "https://arg.nolo.chat/api/v1/db/query/user-1") {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: `dialog-user-1-${tombstonedDialogId}`,
                    id: tombstonedDialogId,
                    type: "dialog",
                    userId: "user-1",
                    title: "Deleted elsewhere",
                    updatedAt: "2026-05-30T10:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          if (String(url) === "https://nolo.chat/api/v1/db/query/user-1") {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: `dialog-user-1-${liveDialogId}`,
                    id: liveDialogId,
                    type: "dialog",
                    userId: "user-1",
                    title: "Live global dialog",
                    updatedAt: "2026-05-31T10:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          if (String(url) === "https://us.nolo.chat/api/v1/db/query/user-1") {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: `dialog-user-1-${tombstonedDialogId}`,
                    id: tombstonedDialogId,
                    type: "dialog",
                    userId: "user-1",
                    title: "Deleted elsewhere",
                    deletedAt: "2026-05-31T11:00:00.000Z",
                    updatedAt: "2026-05-31T11:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          throw new Error(`unexpected ${url}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      "https://arg.nolo.chat/api/v1/db/query/user-1",
      "https://nolo.chat/api/v1/db/query/user-1",
      "https://us.nolo.chat/api/v1/db/query/user-1",
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.targetServers).toEqual([
      "https://arg.nolo.chat",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
    expect(parsed.total).toBe(1);
    expect(parsed.dialogs.map((dialog: any) => dialog.id)).toEqual([liveDialogId]);
  });

  test("dialog list applies output limit after scheduled filtering instead of query limiting", async () => {
    const chunks: string[] = [];
    const liveDialogId = "01HRZ3NDEKTSV4RRFFQ69G5FAG";
    const scheduledDialogId = "01IRZ3NDEKTSV4RRFFQ69G5FAH";
    const requests: string[] = [];

    const exitCode = await runDialogListCommand(
      ["--json", "--limit", "1", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url) => {
          requests.push(String(url));
          if (String(url).includes("?limit=1")) {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: `dialog-user-1-${scheduledDialogId}`,
                    id: scheduledDialogId,
                    type: "dialog",
                    userId: "user-1",
                    title: "Scheduled run",
                    triggerType: "scheduled_run",
                    updatedAt: "2026-05-31T12:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          if (String(url).endsWith("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: `dialog-user-1-${scheduledDialogId}`,
                    id: scheduledDialogId,
                    type: "dialog",
                    userId: "user-1",
                    title: "Scheduled run",
                    triggerType: "scheduled_run",
                    updatedAt: "2026-05-31T12:00:00.000Z",
                  },
                  {
                    dbKey: `dialog-user-1-${liveDialogId}`,
                    id: liveDialogId,
                    type: "dialog",
                    userId: "user-1",
                    title: "Live dialog after scheduled",
                    updatedAt: "2026-05-31T11:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          throw new Error(`unexpected ${url}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.every((url) => !url.includes("?limit=1"))).toBe(true);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.total).toBe(1);
    expect(parsed.dialogs.map((dialog: any) => dialog.id)).toEqual([liveDialogId]);
  });

  test("dialog list default limit is 50; --all and --limit 0 return full set", async () => {
    const many = Array.from({ length: 75 }, (_, i) => {
      const id = `01ARZ3NDEKTSV4RRFFQ69G5F${String(i).padStart(2, "0")}`.slice(0, 26);
      return {
        dbKey: `dialog-user-1-${id}`,
        id,
        type: "dialog",
        userId: "user-1",
        title: `Dialog ${i}`,
        updatedAt: new Date(Date.UTC(2026, 5, 1) + i * 1000).toISOString(),
      };
    });

    const defaultChunks: string[] = [];
    const defaultCode = await runDialogListCommand(
      ["--json", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { defaultChunks.push(String(chunk)); } },
        fetchImpl: testFetch(async () =>
          new Response(JSON.stringify({ data: { data: many } }), { status: 200 })
        ),
      }
    );
    expect(defaultCode).toBe(0);
    const defaultParsed = JSON.parse(defaultChunks.join(""));
    expect(defaultParsed.total).toBe(50);
    expect(defaultParsed.dialogs).toHaveLength(50);
    expect(defaultParsed.truncated).toBe(true);
    expect(defaultParsed.limit).toBe(50);

    for (const fullArgs of [["--all"], ["--limit", "0"]] as string[][]) {
      const chunks: string[] = [];
      const exitCode = await runDialogListCommand(
        ["--json", ...fullArgs, "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
        {
          env: authEnv("env-user"),
          output: { write(chunk) { chunks.push(String(chunk)); } },
          fetchImpl: testFetch(async () =>
            new Response(JSON.stringify({ data: { data: many } }), { status: 200 })
          ),
        }
      );
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(chunks.join(""));
      expect(parsed.total).toBe(75);
      expect(parsed.dialogs).toHaveLength(75);
      expect(parsed.truncated).toBeUndefined();
    }
  });

  test("dialog list --jsonl streams one object per line", async () => {
    const chunks: string[] = [];
    const exitCode = await runDialogListCommand(
      ["--jsonl", "--limit", "2", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async () =>
          new Response(JSON.stringify({
            data: {
              data: [
                {
                  dbKey: `dialog-user-1-${dialogId}`,
                  id: dialogId,
                  type: "dialog",
                  userId: "user-1",
                  title: "A",
                  updatedAt: "2026-05-31T12:00:00.000Z",
                },
                {
                  dbKey: `dialog-user-1-${secondDialogId}`,
                  id: secondDialogId,
                  type: "dialog",
                  userId: "user-1",
                  title: "B",
                  updatedAt: "2026-05-30T12:00:00.000Z",
                },
              ],
            },
          }), { status: 200 })
        ),
      }
    );
    expect(exitCode).toBe(0);
    const lines = chunks.join("").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).id).toBe(dialogId);
    expect(JSON.parse(lines[1]).id).toBe(secondDialogId);
  });

  test("dialog query default limit is 50", async () => {
    let requestBody: any;
    const exitCode = await runDialogQueryCommand(
      [
        "--json",
        "--allow-empty",
        "--subject-kind",
        "table-row",
        "--subject-id",
        "row-1",
        "--token",
        authEnv("user-1").AUTH_TOKEN!,
        "--server",
        "https://arg.nolo.chat",
      ],
      {
        env: authEnv("env-user"),
        output: { write() {} },
        fetchImpl: testFetch(async (_url, init) => {
          requestBody = JSON.parse(String(init?.body ?? "{}"));
          return Response.json({ data: { data: [] } });
        }),
      }
    );
    expect(exitCode).toBe(0);
    expect(requestBody.limit).toBe(50);
  });

  test("dialog list with space reads space contents and resolves user-owned dialog records", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string }> = [];

    const exitCode = await runDialogListCommand(
      ["--json", "--space", "01SPACE", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({ url: String(url), method: init?.method ?? "GET" });
          if (String(url) === "https://arg.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true") {
            return new Response(JSON.stringify({
              data: {
                dbKey: "space-01SPACE",
                contents: {
                  [`dialog-user-1-${dialogId}`]: {
                    contentKey: `dialog-user-1-${dialogId}`,
                    type: "dialog",
                    title: "Space dialog slot",
                  },
                  [`dialog-user-2-${secondDialogId}`]: {
                    contentKey: `dialog-user-2-${secondDialogId}`,
                    type: "dialog",
                    title: "Other owner",
                  },
                },
              },
            }), { status: 200 });
          }
          if (String(url).endsWith("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({
              data: {
                data: String(url).startsWith("https://arg.nolo.chat")
                  ? [
                      {
                        dbKey: `dialog-user-1-${dialogId}`,
                        id: dialogId,
                        type: "dialog",
                        userId: "user-1",
                        title: "Resolved dialog",
                        updatedAt: "2026-05-30T10:00:00.000Z",
                      },
                    ]
                  : [],
              },
            }), { status: 200 });
          }
          throw new Error(`unexpected ${url}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.map((request) => request.url)).toEqual([
      "https://arg.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true",
      "https://nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true",
      "https://us.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true",
      "https://arg.nolo.chat/api/v1/db/query/user-1",
      "https://nolo.chat/api/v1/db/query/user-1",
      "https://us.nolo.chat/api/v1/db/query/user-1",
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.source).toBe("space");
    expect(parsed.spaceId).toBe("01SPACE");
    expect(parsed.total).toBe(1);
    expect(parsed.dialogs[0].title).toBe("Resolved dialog");
  });

  test("dialog list with space filters tombstoned content and applies limit after sorting", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string }> = [];
    const oldDialogId = "01ERZ3NDEKTSV4RRFFQ69G5FAD";
    const newDialogId = "01FRZ3NDEKTSV4RRFFQ69G5FAE";
    const deletedDialogId = "01GRZ3NDEKTSV4RRFFQ69G5FAF";

    const exitCode = await runDialogListCommand(
      ["--json", "--space", "01SPACE", "--limit", "1", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({ url: String(url), method: init?.method ?? "GET" });
          if (String(url) === "https://arg.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true") {
            return new Response(JSON.stringify({
              data: {
                dbKey: "space-01SPACE",
                contents: {
                  [`dialog-user-1-${oldDialogId}`]: {
                    contentKey: `dialog-user-1-${oldDialogId}`,
                    type: "dialog",
                  },
                  [`dialog-user-1-${newDialogId}`]: {
                    contentKey: `dialog-user-1-${newDialogId}`,
                    type: "dialog",
                  },
                  [`dialog-user-1-${deletedDialogId}`]: {
                    contentKey: `dialog-user-1-${deletedDialogId}`,
                    type: "dialog",
                  },
                },
              },
            }), { status: 200 });
          }
          if (String(url).endsWith("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: `dialog-user-1-${oldDialogId}`,
                    id: oldDialogId,
                    type: "dialog",
                    userId: "user-1",
                    title: "Old space dialog",
                    updatedAt: "2026-05-29T10:00:00.000Z",
                  },
                  {
                    dbKey: `dialog-user-1-${newDialogId}`,
                    id: newDialogId,
                    type: "dialog",
                    userId: "user-1",
                    title: "New space dialog",
                    updatedAt: "2026-05-31T10:00:00.000Z",
                  },
                  {
                    dbKey: `dialog-user-1-${deletedDialogId}`,
                    id: deletedDialogId,
                    type: "dialog",
                    userId: "user-1",
                    title: "Deleted space dialog",
                    deletedAt: "2026-05-31T11:00:00.000Z",
                    updatedAt: "2026-05-31T11:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          throw new Error(`unexpected ${url}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.map((request) => request.url)).toEqual([
      "https://arg.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true",
      "https://nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true",
      "https://us.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true",
      "https://arg.nolo.chat/api/v1/db/query/user-1",
      "https://nolo.chat/api/v1/db/query/user-1",
      "https://us.nolo.chat/api/v1/db/query/user-1",
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.total).toBe(1);
    expect(parsed.dialogs.map((dialog: any) => dialog.id)).toEqual([newDialogId]);
  });

  test("dialog list with space ignores stale live space when a newer tombstone exists", async () => {
    const chunks: string[] = [];

    const exitCode = await runDialogListCommand(
      ["--json", "--space", "01SPACE", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          const target = String(url);
          if (
            target === "https://arg.nolo.chat/api/v1/db/read/space-01SPACE" ||
            target === "https://arg.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true"
          ) {
            return new Response(JSON.stringify({
              data: {
                dbKey: "space-01SPACE",
                contents: {
                  [`dialog-user-1-${dialogId}`]: {
                    contentKey: `dialog-user-1-${dialogId}`,
                    type: "dialog",
                  },
                },
                updatedAt: "2026-05-30T10:00:00.000Z",
              },
            }), { status: 200 });
          }
          if (
            target === "https://us.nolo.chat/api/v1/db/read/space-01SPACE" ||
            target === "https://us.nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true"
          ) {
            return new Response(JSON.stringify({
              data: {
                dbKey: "space-01SPACE",
                deletedAt: "2026-05-31T10:00:00.000Z",
                updatedAt: "2026-05-31T10:00:00.000Z",
              },
            }), { status: 200 });
          }
          if (
            target === "https://nolo.chat/api/v1/db/read/space-01SPACE" ||
            target === "https://nolo.chat/api/v1/db/read/space-01SPACE?includeDeleted=true"
          ) {
            return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
          }
          if (init?.method === "POST" && target.endsWith("/api/v1/db/query/user-1")) {
            return new Response(JSON.stringify({
              data: {
                data: [
                  {
                    dbKey: `dialog-user-1-${dialogId}`,
                    id: dialogId,
                    type: "dialog",
                    userId: "user-1",
                    title: "Stale dialog",
                    updatedAt: "2026-05-30T10:00:00.000Z",
                  },
                ],
              },
            }), { status: 200 });
          }
          throw new Error(`unexpected ${target}`);
        }),
      }
    );

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("dialog list failed");
  });

  test("dialog delete with yes deletes the resolved dialog key across server candidates", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string }> = [];

    const exitCode = await runDialogDeleteCommand(
      [dialogId, "--yes", "--json", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({ url: String(url), method: init?.method ?? "GET" });
          if (init?.method === "DELETE") {
            return new Response(JSON.stringify({ message: "Delete request processed" }), { status: 200 });
          }
          return new Response(JSON.stringify({
            data: {
              dbKey: `dialog-user-1-${dialogId}`,
              id: dialogId,
              type: "dialog",
              userId: "user-1",
              title: "Dialog to delete",
            },
          }), { status: 200 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        url: `https://arg.nolo.chat/api/v1/db/read/dialog-user-1-${dialogId}`,
        method: "GET",
      },
      {
        url: `https://arg.nolo.chat/api/v1/db/delete/dialog-user-1-${dialogId}`,
        method: "DELETE",
      },
      {
        url: `https://nolo.chat/api/v1/db/delete/dialog-user-1-${dialogId}`,
        method: "DELETE",
      },
      {
        url: `https://us.nolo.chat/api/v1/db/delete/dialog-user-1-${dialogId}`,
        method: "DELETE",
      },
      {
        url: `http://127.0.0.1:38123/api/v1/db/delete/dialog-user-1-${dialogId}`,
        method: "DELETE",
      },
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.deleted).toBe(true);
    expect(parsed.dbKey).toBe(`dialog-user-1-${dialogId}`);
    expect(parsed.deleteResults.map((result: any) => result.serverUrl)).toEqual([
      "https://arg.nolo.chat",
      "https://nolo.chat",
      "https://us.nolo.chat",
      "http://127.0.0.1:38123",
    ]);
  });

  test("dialog delete includes an explicit local server in global deletion", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string }> = [];

    const exitCode = await runDialogDeleteCommand(
      [dialogId, "--yes", "--json", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "http://127.0.0.1:38123"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({ url: String(url), method: init?.method ?? "GET" });
          if (init?.method === "DELETE") {
            return new Response(JSON.stringify({ message: "Delete request processed" }), { status: 200 });
          }
          return new Response(JSON.stringify({
            data: {
              dbKey: `dialog-user-1-${dialogId}`,
              id: dialogId,
              type: "dialog",
              userId: "user-1",
              title: "Local dialog to delete globally",
            },
          }), { status: 200 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.filter((request) => request.method === "DELETE").map((request) => request.url)).toEqual([
      `http://127.0.0.1:38123/api/v1/db/delete/dialog-user-1-${dialogId}`,
      `https://nolo.chat/api/v1/db/delete/dialog-user-1-${dialogId}`,
      `https://us.nolo.chat/api/v1/db/delete/dialog-user-1-${dialogId}`,
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.deleted).toBe(true);
    expect(parsed.deleteResults.every((result: any) => result.ok)).toBe(true);
  });

  test("dialog delete without yes is a dry-run", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string }> = [];

    const exitCode = await runDialogDeleteCommand(
      [dialogId, "--json", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({ url: String(url), method: init?.method ?? "GET" });
          return new Response(JSON.stringify({
            data: {
              dbKey: `dialog-user-1-${dialogId}`,
              id: dialogId,
              type: "dialog",
              userId: "user-1",
              title: "Dialog to inspect",
            },
          }), { status: 200 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        url: `https://arg.nolo.chat/api/v1/db/read/dialog-user-1-${dialogId}`,
        method: "GET",
      },
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.dryRun).toBe(true);
    expect(parsed.deleted).toBe(false);
  });

  test("dialog delete with include attachments dry-runs dialog-owned files", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string; body?: any }> = [];

    const exitCode = await runDialogDeleteCommand(
      [dialogId, "--include-attachments", "--json", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({
            url: String(url),
            method: init?.method ?? "GET",
            ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
          });
          const target = String(url);
          if (target.endsWith(`/api/v1/db/read/dialog-user-1-${dialogId}`)) {
            return Response.json({
              data: {
                dbKey: `dialog-user-1-${dialogId}`,
                id: dialogId,
                type: "dialog",
                userId: "user-1",
                title: "Dialog to inspect",
              },
            });
          }
          if (target.endsWith("/rpc/getConvMsgs")) {
            return Response.json([
              {
                id: "msg-1",
                content: [{ type: "image_url", image_url: { url: "https://arg.nolo.chat/api/v1/db/file/content/file-owned" } }],
              },
            ]);
          }
          if (target.endsWith("/api/v1/db/read/file-id-file-owned")) {
            return Response.json({ data: { mainKey: "file-user-1-file-owned" } });
          }
          if (target.endsWith("/api/v1/db/read/file-user-1-file-owned")) {
            return Response.json({
              data: {
                id: "file-owned",
                dbKey: "file-user-1-file-owned",
                size: 1024,
                ownerType: "dialog",
                ownerId: dialogId,
              },
            });
          }
          throw new Error(`unexpected ${target}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.some((request) => request.method === "DELETE")).toBe(false);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.attachmentPlan.deleteCandidates.map((candidate: any) => candidate.fileId)).toEqual(["file-owned"]);
    expect(parsed.attachmentPlan.bytesToDelete).toBe(1024);
  });

  test("dialog delete with include attachments deletes files before dialog", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string }> = [];

    const exitCode = await runDialogDeleteCommand(
      [dialogId, "--include-attachments", "--yes", "--json", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({ url: String(url), method: init?.method ?? "GET" });
          const target = String(url);
          if (init?.method === "DELETE") {
            return Response.json({ message: "Delete request processed" });
          }
          if (target.endsWith(`/api/v1/db/read/dialog-user-1-${dialogId}`)) {
            return Response.json({
              data: {
                dbKey: `dialog-user-1-${dialogId}`,
                id: dialogId,
                type: "dialog",
                userId: "user-1",
                title: "Dialog to delete",
              },
            });
          }
          if (target.endsWith("/rpc/getConvMsgs")) {
            return Response.json([
              {
                id: "msg-1",
                content: [{ type: "image_url", image_url: { url: "https://arg.nolo.chat/api/v1/db/file/content/file-owned" } }],
              },
            ]);
          }
          if (target.endsWith("/api/v1/db/read/file-id-file-owned")) {
            return Response.json({ data: { mainKey: "file-user-1-file-owned" } });
          }
          if (target.endsWith("/api/v1/db/read/file-user-1-file-owned")) {
            return Response.json({
              data: {
                id: "file-owned",
                dbKey: "file-user-1-file-owned",
                size: 1024,
                ownerType: "dialog",
                ownerId: dialogId,
              },
            });
          }
          throw new Error(`unexpected ${target}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.filter((request) => request.method === "DELETE").map((request) => request.url)).toEqual([
      "https://arg.nolo.chat/api/v1/db/delete/file-user-1-file-owned",
      "https://nolo.chat/api/v1/db/delete/file-user-1-file-owned",
      "https://us.nolo.chat/api/v1/db/delete/file-user-1-file-owned",
      "http://127.0.0.1:38123/api/v1/db/delete/file-user-1-file-owned",
      `https://arg.nolo.chat/api/v1/db/delete/dialog-user-1-${dialogId}`,
      `https://nolo.chat/api/v1/db/delete/dialog-user-1-${dialogId}`,
      `https://us.nolo.chat/api/v1/db/delete/dialog-user-1-${dialogId}`,
      `http://127.0.0.1:38123/api/v1/db/delete/dialog-user-1-${dialogId}`,
    ]);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.attachmentDeleteResults).toHaveLength(1);
    expect(parsed.deleted).toBe(true);
  });

  test("dialog delete with referenced attachments includes same-account user-owned files", async () => {
    const chunks: string[] = [];

    const exitCode = await runDialogDeleteCommand(
      [dialogId, "--include-referenced-attachments", "--json", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          const target = String(url);
          if (target.endsWith(`/api/v1/db/read/dialog-user-1-${dialogId}`)) {
            return Response.json({
              data: {
                dbKey: `dialog-user-1-${dialogId}`,
                id: dialogId,
                type: "dialog",
                userId: "user-1",
                title: "Dialog to inspect",
              },
            });
          }
          if (target.endsWith("/rpc/getConvMsgs")) {
            return Response.json([
              {
                id: "msg-1",
                content: [{ type: "image_url", image_url: { url: "https://arg.nolo.chat/api/v1/db/file/content/file-owned" } }],
              },
            ]);
          }
          if (target.endsWith("/api/v1/db/read/file-id-file-owned")) {
            return Response.json({ data: { mainKey: "file-user-1-file-owned" } });
          }
          if (target.endsWith("/api/v1/db/read/file-user-1-file-owned")) {
            return Response.json({
              data: {
                id: "file-owned",
                dbKey: "file-user-1-file-owned",
                size: 1024,
                ownerType: "user",
                ownerId: "user-1",
              },
            });
          }
          throw new Error(`unexpected ${target} ${init?.method ?? "GET"}`);
        }),
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.includeAttachments).toBe(true);
    expect(parsed.includeReferencedAttachments).toBe(true);
    expect(parsed.attachmentPlan.deleteCandidates.map((candidate: any) => candidate.fileId)).toEqual(["file-owned"]);
  });

  test("dialog delete with yes deletes multiple resolved dialog keys", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string }> = [];

    const exitCode = await runDialogDeleteCommand(
      [dialogId, secondDialogId, "--yes", "--json", "--token", authEnv("user-1").AUTH_TOKEN!, "--server", "https://arg.nolo.chat"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({ url: String(url), method: init?.method ?? "GET" });
          if (init?.method === "DELETE") {
            return new Response(JSON.stringify({ message: "Delete request processed" }), { status: 200 });
          }
          const id = String(url).includes(dialogId) ? dialogId : secondDialogId;
          return new Response(JSON.stringify({
            data: {
              dbKey: `dialog-user-1-${id}`,
              id,
              type: "dialog",
              userId: "user-1",
              title: `Dialog ${id} to delete`,
            },
          }), { status: 200 });
        }),
      }
    );

    expect(exitCode).toBe(0);
    const deleteRequests = requests.filter((request) => request.method === "DELETE").map((request) => request.url);
    expect(deleteRequests).toContain(`https://arg.nolo.chat/api/v1/db/delete/dialog-user-1-${dialogId}`);
    expect(deleteRequests).toContain(`https://arg.nolo.chat/api/v1/db/delete/dialog-user-1-${secondDialogId}`);

    const parsed = JSON.parse(chunks.join(""));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].deleted).toBe(true);
    expect(parsed[1].deleted).toBe(true);
  });

  test("dialog delete with batch inputs ignores value flag arguments before dialog ids", async () => {
    const chunks: string[] = [];
    const requests: Array<{ url: string; method: string }> = [];
    const token = authEnv("user-1").AUTH_TOKEN!;

    const exitCode = await runDialogDeleteCommand(
      ["--machine-key", token, "--server", "https://arg.nolo.chat", dialogId, secondDialogId, "--yes", "--json"],
      {
        env: authEnv("env-user"),
        output: { write(chunk) { chunks.push(String(chunk)); } },
        fetchImpl: testFetch(async (url, init) => {
          requests.push({ url: String(url), method: init?.method ?? "GET" });
          if (init?.method === "DELETE") {
            return Response.json({ message: "Delete request processed" });
          }
          const id = String(url).includes(dialogId) ? dialogId : secondDialogId;
          return Response.json({
            data: {
              dbKey: `dialog-user-1-${id}`,
              id,
              type: "dialog",
              userId: "user-1",
              title: `Dialog ${id} to delete`,
            },
          });
        }),
      }
    );

    expect(exitCode).toBe(0);
    expect(requests[0]?.url).toBe(`https://arg.nolo.chat/api/v1/db/read/dialog-user-1-${dialogId}`);
    expect(requests.some((request) => request.url.includes(encodeURIComponent(token)))).toBe(false);
    const parsed = JSON.parse(chunks.join(""));
    expect(parsed.map((item: any) => item.dialogId)).toEqual([dialogId, secondDialogId]);
  });
});
