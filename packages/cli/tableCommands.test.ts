import { describe, expect, test } from "bun:test";

import {
  runTableDeleteRowsCommand,
  runTableListCommand,
  runTablePurgeRowsCommand,
  runTableQueryCommand,
  runTableRemoveRowFieldsCommand,
} from "./tableCommands";

function createJwt(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
  return `header.${payload}.sig`;
}

function createUsernameJwt(username: string) {
  const payload = Buffer.from(JSON.stringify({ username })).toString("base64url");
  return `${payload}.sig`;
}

describe("table list CLI command", () => {
  test("queries table metadata and filters by purpose", async () => {
    let requestUrl = "";
    let requestBody: unknown;
    const chunks: string[] = [];
    const exitCode = await runTableListCommand(
      ["--purpose", "agent_eval_workbench", "--output", "items"],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string, init: RequestInit) => {
          requestUrl = url;
          requestBody = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({
              data: [
                {
                  dbKey: "meta-user1-eval",
                  tenantId: "user1",
                  tableId: "eval",
                  displayName: "Agent Eval Workbench",
                  purpose: "agent_eval_workbench",
                  columns: [],
                },
                {
                  dbKey: "meta-user1-notes",
                  tenantId: "user1",
                  tableId: "notes",
                  displayName: "Notes",
                  tags: ["agent_eval_workbench"],
                },
              ],
            }),
            { status: 200 }
          );
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(requestUrl).toBe("https://us.nolo.chat/api/v1/db/query/user1?limit=250");
    expect(requestBody).toEqual({ type: "table" });
    expect(JSON.parse(chunks.join(""))).toEqual([
      {
        dbKey: "meta-user1-eval",
        tableId: "eval",
        displayName: "Agent Eval Workbench",
        spaceId: null,
        tenantId: "user1",
        columnCount: 0,
        createdAt: null,
        updatedAt: null,
      },
    ]);
  });

  test("lists only table metadata referenced by a space", async () => {
    const urls: string[] = [];
    const chunks: string[] = [];
    const exitCode = await runTableListCommand(
      ["--space", "spaceA", "--output", "items"],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string) => {
          urls.push(url);
          if (url.endsWith("/api/v1/db/read/space-spaceA")) {
            return new Response(
              JSON.stringify({
                data: {
                  contents: {
                    "meta-owner-table1": { contentKey: "meta-owner-table1" },
                    "page-owner-ignored": { contentKey: "page-owner-ignored" },
                  },
                },
              }),
              { status: 200 }
            );
          }
          if (url.endsWith("/api/v1/db/read/meta-owner-table1")) {
            return new Response(
              JSON.stringify({
                data: {
                  dbKey: "meta-owner-table1",
                  tenantId: "owner",
                  tableId: "table1",
                  displayName: "Space Table",
                  columns: [{ name: "status" }],
                },
              }),
              { status: 200 }
            );
          }
          return new Response("not found", { status: 404 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(urls).toEqual([
      "https://us.nolo.chat/api/v1/db/read/space-spaceA",
      "https://us.nolo.chat/api/v1/db/read/meta-owner-table1",
    ]);
    expect(JSON.parse(chunks.join(""))).toEqual([
      {
        dbKey: "meta-owner-table1",
        tableId: "table1",
        displayName: "Space Table",
        spaceId: null,
        tenantId: "owner",
        columnCount: 1,
        createdAt: null,
        updatedAt: null,
      },
    ]);
  });

  test("falls back to username from compact profile tokens when tenant id is omitted", async () => {
    let requestUrl = "";
    const exitCode = await runTableListCommand(
      ["--output", "items"],
      {
        env: {
          AUTH_TOKEN: createUsernameJwt("0e95801d90"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: () => {} },
        fetchImpl: (async (url: string) => {
          requestUrl = url;
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(requestUrl).toBe("https://us.nolo.chat/api/v1/db/query/0e95801d90?limit=50");
  });
});

describe("table query CLI command", () => {
  test("posts compact query options and prints only items", async () => {
    let requestBody: unknown;
    let requestUrl = "";
    const chunks: string[] = [];
    const exitCode = await runTableQueryCommand(
      [
        "--table",
        "meta-user1-01KWSK4Q4TESXQ06SW39JN2TTJ",
        "--columns",
        '["title","status"]',
        "--no-base-fields",
        "--output",
        "items",
        "--limit",
        "5",
      ],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string, init: RequestInit) => {
          requestUrl = url;
          requestBody = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({
              rawData: {
                total: 1,
                items: [{ title: "Task", status: "待处理" }],
              },
            }),
            { status: 200 }
          );
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(requestUrl).toBe("https://us.nolo.chat/api/table/query-rows");
    expect(requestBody).toMatchObject({
      tenantId: "user1",
      tableId: "01KWSK4Q4TESXQ06SW39JN2TTJ",
      columns: ["title", "status"],
      includeBaseFields: false,
      limit: 5,
    });
    expect(JSON.parse(chunks.join(""))).toEqual([{ title: "Task", status: "待处理" }]);
  });

  test("strips deletedItems from --json output", async () => {
    // Tombstones are fetched (includeDeleted: true) purely so the
    // multi-server merge can dedup, but leaking them into the payload put 70
    // deleted rows beside 3 live ones — any text scan of the output reads
    // tombstones as current data.
    const chunks: string[] = [];
    const exitCode = await runTableQueryCommand(
      ["--table", "tasks", "--tenant-id", "user1", "--json"],
      {
        env: { AUTH_TOKEN: "token", NOLO_SERVER: "https://us.nolo.chat" },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async () =>
          new Response(
            JSON.stringify({
              rawData: {
                total: 1,
                items: [{ rowId: "live", rank: "2" }],
                deletedItems: [
                  { rowId: "tombstone", rank: "3", deletedAt: "2026-07-18T01:59:12+08:00" },
                ],
              },
            }),
            { status: 200 }
          )) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    const raw = chunks.join("");
    expect(raw).not.toContain("deletedItems");
    expect(raw).not.toContain("tombstone");
    const parsed = JSON.parse(raw);
    expect(parsed.rawData.deletedItems).toBeUndefined();
    expect(parsed.rawData.items).toEqual([{ rowId: "live", rank: "2" }]);
  });

  test("prints jsonl for long scans", async () => {
    const chunks: string[] = [];
    const exitCode = await runTableQueryCommand(["--table", "tasks", "--tenant-id", "user1", "--output", "jsonl"], {
      env: { AUTH_TOKEN: "token", NOLO_SERVER: "https://us.nolo.chat" },
      output: { write: (chunk) => chunks.push(String(chunk)) },
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({
            rawData: {
              items: [{ rowId: "1" }, { rowId: "2" }],
            },
          }),
          { status: 200 }
        )) as unknown as typeof fetch,
    });

    expect(exitCode).toBe(0);
    expect(chunks.join("").trim().split("\n")).toEqual([
      JSON.stringify({ rowId: "1" }),
      JSON.stringify({ rowId: "2" }),
    ]);
  });

  test("default limit is 20 and client-side caps server over-return", async () => {
    let requestBody: unknown;
    const chunks: string[] = [];
    const many = Array.from({ length: 50 }, (_, i) => ({ rowId: String(i) }));
    const exitCode = await runTableQueryCommand(
      ["--table", "tasks", "--tenant-id", "user1", "--output", "items"],
      {
        env: { AUTH_TOKEN: "token", NOLO_SERVER: "https://us.nolo.chat" },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (_url: string, init: RequestInit) => {
          requestBody = JSON.parse(String(init.body));
          return new Response(JSON.stringify({ rawData: { items: many } }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect((requestBody as Record<string, unknown>).limit).toBe(20);
    const items = JSON.parse(chunks.join(""));
    expect(items).toHaveLength(20);
    expect(items[0]).toEqual({ rowId: "0" });
    expect(items[19]).toEqual({ rowId: "19" });
  });

  test("--all and --limit 0 dump beyond the default limit", async () => {
    const many = Array.from({ length: 35 }, (_, i) => ({ rowId: String(i) }));
    for (const fullFlag of [["--all"], ["--limit", "0"]] as string[][]) {
      let requestBody: unknown;
      const chunks: string[] = [];
      const exitCode = await runTableQueryCommand(
        ["--table", "tasks", "--tenant-id", "user1", "--output", "items", ...fullFlag],
        {
          env: { AUTH_TOKEN: "token", NOLO_SERVER: "https://us.nolo.chat" },
          output: { write: (chunk) => chunks.push(String(chunk)) },
          fetchImpl: (async (_url: string, init: RequestInit) => {
            requestBody = JSON.parse(String(init.body));
            return new Response(JSON.stringify({ rawData: { items: many } }), { status: 200 });
          }) as unknown as typeof fetch,
        }
      );
      expect(exitCode).toBe(0);
      expect((requestBody as Record<string, unknown>).limit).toBeGreaterThan(35);
      expect(JSON.parse(chunks.join(""))).toHaveLength(35);
    }
  });

  test("table list default limit is 50; --all returns more", async () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      dbKey: `meta-user1-t${i}`,
      tenantId: "user1",
      tableId: `t${i}`,
      displayName: `Table ${i}`,
      columns: [],
    }));

    const defaultChunks: string[] = [];
    const defaultCode = await runTableListCommand(["--output", "items"], {
      env: { AUTH_TOKEN: createJwt("user1"), NOLO_SERVER: "https://us.nolo.chat" },
      output: { write: (chunk) => defaultChunks.push(String(chunk)) },
      fetchImpl: (async () =>
        new Response(JSON.stringify({ data: many }), { status: 200 })) as unknown as typeof fetch,
    });
    expect(defaultCode).toBe(0);
    expect(JSON.parse(defaultChunks.join(""))).toHaveLength(50);

    const allChunks: string[] = [];
    const allCode = await runTableListCommand(["--output", "items", "--all"], {
      env: { AUTH_TOKEN: createJwt("user1"), NOLO_SERVER: "https://us.nolo.chat" },
      output: { write: (chunk) => allChunks.push(String(chunk)) },
      fetchImpl: (async () =>
        new Response(JSON.stringify({ data: many }), { status: 200 })) as unknown as typeof fetch,
    });
    expect(allCode).toBe(0);
    expect(JSON.parse(allChunks.join(""))).toHaveLength(80);
  });

  test("accepts --filter alias and json output alias", async () => {
    let requestBody: unknown;
    const chunks: string[] = [];
    const exitCode = await runTableQueryCommand(
      [
        "--table",
        "tasks",
        "--tenant-id",
        "user1",
        "--filter",
        '{"rowId":"01ROW"}',
        "--output",
        "json",
      ],
      {
        env: { AUTH_TOKEN: "token", NOLO_SERVER: "https://us.nolo.chat" },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (_url: string, init: RequestInit) => {
          requestBody = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({
              rawData: {
                total: 1,
                items: [{ rowId: "01ROW" }],
              },
            }),
            { status: 200 }
          );
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect((requestBody as Record<string, unknown>).filters).toEqual({ rowId: "01ROW" });
    expect(JSON.parse(chunks.join(""))).toEqual({ total: 1, items: [{ rowId: "01ROW" }] });
  });

  test("uses row shortcut as a single-row filter", async () => {
    let requestBody: unknown;
    const exitCode = await runTableQueryCommand(
      ["--table", "tasks", "--tenant-id", "user1", "--row", "01ROW", "--output", "items"],
      {
        env: { AUTH_TOKEN: "token", NOLO_SERVER: "https://us.nolo.chat" },
        output: { write: () => {} },
        fetchImpl: (async (_url: string, init: RequestInit) => {
          requestBody = JSON.parse(String(init.body));
          return new Response(JSON.stringify({ rawData: { items: [{ rowId: "01ROW" }] } }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect((requestBody as Record<string, unknown>).filters).toEqual({ rowId: "01ROW" });
    expect((requestBody as Record<string, unknown>).limit).toBe(1);
  });

  test("keeps full row output for row shortcut with activity when columns are omitted", async () => {
    let requestBody: unknown;
    const exitCode = await runTableQueryCommand(
      ["--table", "tasks", "--tenant-id", "user1", "--row", "01ROW", "--include-activity", "--output", "json"],
      {
        env: { AUTH_TOKEN: "token", NOLO_SERVER: "https://us.nolo.chat" },
        output: { write: () => {} },
        fetchImpl: (async (_url: string, init: RequestInit) => {
          requestBody = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({
              rawData: {
                items: [{
                  rowId: "01ROW",
                  title: "Task",
                  status: "todo",
                  meta: { latestActivityRef: { dialogId: "dialog-1" } },
                }],
              },
            }),
            { status: 200 }
          );
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect((requestBody as Record<string, unknown>).columns).toBeUndefined();
    expect((requestBody as Record<string, unknown>).filters).toEqual({ rowId: "01ROW" });
    expect((requestBody as Record<string, unknown>).limit).toBe(1);
  });

  test("uses row dbKey shortcut as a single-row filter", async () => {
    let requestBody: unknown;
    const exitCode = await runTableQueryCommand(
      ["--table", "tasks", "--tenant-id", "user1", "--row-dbkey", "row-user1-tasks-01ROW", "--output", "items"],
      {
        env: { AUTH_TOKEN: "token", NOLO_SERVER: "https://us.nolo.chat" },
        output: { write: () => {} },
        fetchImpl: (async (_url: string, init: RequestInit) => {
          requestBody = JSON.parse(String(init.body));
          return new Response(JSON.stringify({ rawData: { items: [{ dbKey: "row-user1-tasks-01ROW" }] } }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect((requestBody as Record<string, unknown>).filters).toEqual({ dbKey: "row-user1-tasks-01ROW" });
    expect((requestBody as Record<string, unknown>).limit).toBe(1);
  });

  test("can include generic activity projection columns", async () => {
    let requestBody: unknown;
    const exitCode = await runTableQueryCommand(
      [
        "--table",
        "meta-user1-01KWSK4Q4TESXQ06SW39JN2TTJ",
        "--columns",
        '["title","meta.latestActivityRef"]',
        "--include-activity",
      ],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: () => {} },
        fetchImpl: (async (_url: string, init: RequestInit) => {
          requestBody = JSON.parse(String(init.body));
          return new Response(JSON.stringify({ rawData: { items: [] } }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect((requestBody as Record<string, unknown>).columns).toEqual(["title", "meta.latestActivityRef", "meta.activityRefs"]);
  });

  test("includes purpose in raw output when server returns it", async () => {
    const chunks: string[] = [];
    const exitCode = await runTableQueryCommand(
      ["--table", "meta-user1-01KWSK4Q4TESXQ06SW39JN2TTJ", "--output", "raw"],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async () =>
          new Response(
            JSON.stringify({
              rawData: {
                total: 1,
                purpose: "pm_code_task_closed_loop_probe",
                items: [{ title: "Task" }],
              },
            }),
            { status: 200 }
          )) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(chunks.join(""));
    expect(output.purpose).toBe("pm_code_task_closed_loop_probe");
    expect(output.items).toEqual([{ title: "Task" }]);
  });

  test("omits purpose from items output when server does not return it", async () => {
    const chunks: string[] = [];
    const exitCode = await runTableQueryCommand(
      ["--table", "meta-user1-01KWSK4Q4TESXQ06SW39JN2TTJ", "--output", "items"],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async () =>
          new Response(
            JSON.stringify({
              rawData: {
                total: 1,
                items: [{ title: "Regular Task" }],
              },
            }),
            { status: 200 }
          )) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(chunks.join(""));
    expect(output).toEqual([{ title: "Regular Task" }]);
  });
  test("--multi-server merges rows from multiple servers and tags origin", async () => {
    const chunks: string[] = [];
    const requests: { url: string; body: unknown }[] = [];
    const exitCode = await runTableQueryCommand(
      [
        "--table",
        "meta-user1-01KWSK4Q4TESXQ06SW39JN2TTJ",
        "--multi-server",
        "--no-base-fields",
        "--output",
        "items",
        "--limit",
        "10",
      ],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string, init: RequestInit) => {
          requests.push({ url, body: JSON.parse(String(init.body)) });
          if (url === "https://us.nolo.chat/api/table/query-rows") {
            return new Response(
              JSON.stringify({
                rawData: {
                  items: [
                    {
                      dbKey: "row-user1-01KWSK4Q4TESXQ06SW39JN2TTJ-01ALPHA",
                      title: "Alpha only",
                      updatedAt: "2026-06-25T10:00:00.000Z",
                    },
                    {
                      dbKey: "row-user1-01KWSK4Q4TESXQ06SW39JN2TTJ-01BOTH",
                      title: "Alpha newer",
                      updatedAt: "2026-06-25T12:00:00.000Z",
                    },
                  ],
                },
              }),
              { status: 200 }
            );
          }
          if (url === "https://nolo.chat/api/table/query-rows") {
            return new Response(
              JSON.stringify({
                rawData: {
                  items: [
                    {
                      dbKey: "row-user1-01KWSK4Q4TESXQ06SW39JN2TTJ-01MAIN",
                      title: "Main only",
                      updatedAt: "2026-06-25T11:00:00.000Z",
                    },
                    {
                      dbKey: "row-user1-01KWSK4Q4TESXQ06SW39JN2TTJ-01BOTH",
                      title: "Main older",
                      updatedAt: "2026-06-25T09:00:00.000Z",
                    },
                  ],
                },
              }),
              { status: 200 }
            );
          }
          return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(requests.map((r) => r.url).sort()).toEqual([
      "https://nolo.chat/api/table/query-rows",
      "https://us.nolo.chat/api/table/query-rows",
    ]);
    expect(requests.every((r) => (r.body as Record<string, unknown>).limit === 10000)).toBe(true);

    const items = JSON.parse(chunks.join(""));
    expect(items).toHaveLength(3);
    const byKey = Object.fromEntries(items.map((it: { dbKey: string }) => [it.dbKey, it]));
    expect(byKey["row-user1-01KWSK4Q4TESXQ06SW39JN2TTJ-01BOTH"].title).toBe("Alpha newer");
    expect(byKey["row-user1-01KWSK4Q4TESXQ06SW39JN2TTJ-01BOTH"]._serverOrigin).toBe("https://us.nolo.chat");
    expect(byKey["row-user1-01KWSK4Q4TESXQ06SW39JN2TTJ-01MAIN"]._serverOrigin).toBe("https://nolo.chat");
    expect(byKey["row-user1-01KWSK4Q4TESXQ06SW39JN2TTJ-01ALPHA"]._serverOrigin).toBe("https://us.nolo.chat");
  });
  test("--multi-server continues when one server fails", async () => {
    const chunks: string[] = [];
    const exitCode = await runTableQueryCommand(
      [
        "--table",
        "meta-user1-01KWSK4Q4TESXQ06SW39JN2TTJ",
        "--multi-server",
        "--no-base-fields",
        "--output",
        "items",
      ],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string) => {
          if (url === "https://us.nolo.chat/api/table/query-rows") {
            return new Response(
              JSON.stringify({
                rawData: {
                  items: [
                    {
                      dbKey: "row-user1-01KWSK4Q4TESXQ06SW39JN2TTJ-01ALPHA",
                      title: "Alpha only",
                      updatedAt: "2026-06-25T10:00:00.000Z",
                    },
                  ],
                },
              }),
              { status: 200 }
            );
          }
          return new Response(JSON.stringify({ error: "down" }), { status: 503 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(chunks.join(""));
    const items = Array.isArray(output) ? output : output.rawData?.items ?? output.items ?? [];
    expect(items).toHaveLength(1);
    expect(items[0].dbKey).toBe("row-user1-01KWSK4Q4TESXQ06SW39JN2TTJ-01ALPHA");
  });

  test("understands table sync envelopes and hides rows when table meta is deleted", async () => {
    const chunks: string[] = [];
    let requestBody: any;
    const exitCode = await runTableQueryCommand(
      [
        "--table",
        "meta-user1-tasks",
        "--no-base-fields",
        "--output",
        "items",
      ],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (_url: string, init: RequestInit) => {
          requestBody = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({
              rawData: {
                schemaVersion: 1,
                complete: true,
                includeDeleted: true,
                tableMeta: {
                  dbKey: "meta-user1-tasks",
                  tenantId: "user1",
                  tableId: "tasks",
                  deletedAt: "2026-06-26T10:00:00.000Z",
                  updatedAt: "2026-06-26T10:00:00.000Z",
                },
                items: [
                  {
                    dbKey: "row-user1-tasks-row1",
                    title: "cached elsewhere",
                    updatedAt: "2026-06-26T09:00:00.000Z",
                  },
                ],
                deletedItems: [],
              },
            }),
            { status: 200 }
          );
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(requestBody).toMatchObject({
      tenantId: "user1",
      tableId: "tasks",
      includeDeleted: true,
      envelope: "table-sync-v1",
    });
    expect(JSON.parse(chunks.join(""))).toEqual([]);
  });
});

describe("table delete-rows CLI command", () => {
  test("soft-deletes rows by ids using POST /api/table/delete-rows", async () => {
    const urls: string[] = [];
    const bodies: any[] = [];
    const chunks: string[] = [];
    const exitCode = await runTableDeleteRowsCommand(
      ["--table", "meta-user1-tasks", "--row-ids", '["row1","row2"]'],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string, init: RequestInit) => {
          urls.push(url);
          bodies.push(JSON.parse(String(init.body)));
          return new Response(
            JSON.stringify({
              rawData: {
                count: 2,
                items: [
                  { dbKey: "row-user1-tasks-row1", deletedAt: "2026-06-26T10:00:00.000Z" },
                  { dbKey: "row-user1-tasks-row2", deletedAt: "2026-06-26T10:00:00.000Z" },
                ],
              },
            }),
            { status: 200 }
          );
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(urls).toEqual(["https://us.nolo.chat/api/table/delete-rows"]);
    expect(bodies).toEqual([
      {
        tenantId: "user1",
        tableId: "tasks",
        dbKeys: ["row-user1-tasks-row1", "row-user1-tasks-row2"],
      },
    ]);
    const output = JSON.parse(chunks.join(""));
    expect(output).toMatchObject({ ok: true, deleted: 2 });
    expect(output.results).toEqual([
      { dbKey: "row-user1-tasks-row1", ok: true, source: "--row-ids:row1" },
      { dbKey: "row-user1-tasks-row2", ok: true, source: "--row-ids:row2" },
    ]);
  });

  test("deletes rows by dbKeys using --row-dbkeys", async () => {
    const urls: string[] = [];
    const bodies: any[] = [];
    const chunks: string[] = [];
    const exitCode = await runTableDeleteRowsCommand(
      ["--table", "meta-user1-tasks", "--row-dbkeys", '["row-user1-tasks-row1","row-user1-tasks-row2"]'],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string, init: RequestInit) => {
          urls.push(url);
          bodies.push(JSON.parse(String(init.body)));
          return new Response(JSON.stringify({ rawData: { count: 2, items: [] } }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(urls).toEqual(["https://us.nolo.chat/api/table/delete-rows"]);
    expect(bodies[0]).toEqual({
      tenantId: "user1",
      tableId: "tasks",
      dbKeys: ["row-user1-tasks-row1", "row-user1-tasks-row2"],
    });
    const output = JSON.parse(chunks.join(""));
    expect(output).toMatchObject({ ok: true, deleted: 2 });
    expect(output.results).toEqual([
      { dbKey: "row-user1-tasks-row1", ok: true, source: "--row-dbkeys" },
      { dbKey: "row-user1-tasks-row2", ok: true, source: "--row-dbkeys" },
    ]);
  });

  test("deletes rows matched by --filters", async () => {
    const urls: string[] = [];
    const chunks: string[] = [];
    const exitCode = await runTableDeleteRowsCommand(
      ["--table", "meta-user1-tasks", "--filters", '{"status":"done"}', "--yes"],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string, init: RequestInit) => {
          urls.push(url);
          if (url.endsWith("/api/table/query-rows")) {
            const body = JSON.parse(String(init.body));
            expect(body).toMatchObject({ tenantId: "user1", tableId: "tasks", filters: { status: "done" }, limit: 200, offset: 0 });
            return new Response(
              JSON.stringify({
                rawData: {
                  total: 2,
                  limit: 200,
                  offset: 0,
                  items: [
                    { dbKey: "row-user1-tasks-row1", status: "done" },
                    { dbKey: "row-user1-tasks-row2", status: "done" },
                  ],
                },
              }),
              { status: 200 }
            );
          }
          const body = JSON.parse(String(init.body));
          expect(body).toMatchObject({
            tenantId: "user1",
            tableId: "tasks",
            dbKeys: ["row-user1-tasks-row1", "row-user1-tasks-row2"],
          });
          return new Response(JSON.stringify({ rawData: { count: 2, items: [] } }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(urls.filter((u) => u.endsWith("/api/table/delete-rows"))).toEqual([
      "https://us.nolo.chat/api/table/delete-rows",
    ]);
    const output = JSON.parse(chunks.join(""));
    expect(output).toMatchObject({ ok: true, deleted: 2 });
  });

  test("paginates filtered delete queries before soft-deleting all matches", async () => {
    const urls: string[] = [];
    const queryOffsets: number[] = [];
    const deleteBodies: any[] = [];
    const chunks: string[] = [];
    const exitCode = await runTableDeleteRowsCommand(
      ["--table", "meta-user1-tasks", "--filters", '{"status":"done"}', "--yes"],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string, init: RequestInit) => {
          urls.push(url);
          const body = JSON.parse(String(init.body));
          if (url.endsWith("/api/table/query-rows")) {
            queryOffsets.push(body.offset);
            const offset = Number(body.offset);
            const pageItems =
              offset === 0
                ? Array.from({ length: 200 }, (_, index) => ({
                    dbKey: `row-user1-tasks-${index + 1}`,
                    status: "done",
                  }))
                : [{ dbKey: "row-user1-tasks-201", status: "done" }];
            return new Response(
              JSON.stringify({
                rawData: {
                  total: 201,
                  limit: 200,
                  offset,
                  items: pageItems,
                },
              }),
              { status: 200 }
            );
          }
          deleteBodies.push(body);
          return new Response(JSON.stringify({ rawData: { count: 201, items: [] } }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(queryOffsets).toEqual([0, 200]);
    expect(deleteBodies).toHaveLength(1);
    expect(deleteBodies[0].dbKeys).toHaveLength(201);
    expect(urls.filter((u) => u.endsWith("/api/table/delete-rows"))).toEqual([
      "https://us.nolo.chat/api/table/delete-rows",
    ]);
    const output = JSON.parse(chunks.join(""));
    expect(output).toMatchObject({ ok: true, deleted: 201 });
  });



  test("--filters dry-run requires --yes", async () => {
    const urls: string[] = [];
    const chunks: string[] = [];
    const exitCode = await runTableDeleteRowsCommand(
      ["--table", "meta-user1-tasks", "--filters", '{"status":"done"}'],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string, init: RequestInit) => {
          urls.push(url);
          if (url.endsWith("/api/table/query-rows")) {
            const body = JSON.parse(String(init.body));
            expect(body).toMatchObject({ tenantId: "user1", tableId: "tasks", filters: { status: "done" }, limit: 200, offset: 0 });
            return new Response(
              JSON.stringify({
                rawData: {
                  total: 2,
                  limit: 200,
                  offset: 0,
                  items: [
                    { dbKey: "row-user1-tasks-row1", status: "done" },
                    { dbKey: "row-user1-tasks-row2", status: "done" },
                  ],
                },
              }),
              { status: 200 }
            );
          }
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(urls.filter((u) => u.includes("/api/v1/db/delete/"))).toHaveLength(0);
    const jsonChunk = chunks.find((c) => { try { JSON.parse(c); return true; } catch { return false; } });
    expect(jsonChunk).toBeDefined();
    const output = JSON.parse(jsonChunk!);
    expect(output).toMatchObject({ ok: true, dryRun: true, wouldDelete: 2 });
  });
  test("reports partial failures and returns non-zero exit code", async () => {
    const chunks: string[] = [];
    const exitCode = await runTableDeleteRowsCommand(
      ["--table", "meta-user1-tasks", "--row-ids", '["row1","row2"]'],
      {
        env: {
          AUTH_TOKEN: createJwt("user1"),
          NOLO_SERVER: "https://us.nolo.chat",
        },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async () => {
          return new Response(
            JSON.stringify({
              rawData: {
                count: 1,
                items: [{ dbKey: "row-user1-tasks-row1", deletedAt: "2026-06-26T10:00:00.000Z" }],
                results: [
                  { dbKey: "row-user1-tasks-row1", ok: true },
                  { dbKey: "row-user1-tasks-row2", ok: false, error: "not found" },
                ],
              },
            }),
            { status: 207 }
          );
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(1);
    const output = JSON.parse(chunks.join(""));
    expect(output.deleted).toBe(1);
    expect(output.results).toEqual([
      { dbKey: "row-user1-tasks-row1", ok: true, source: "--row-ids:row1" },
      { dbKey: "row-user1-tasks-row2", ok: false, source: "--row-ids:row2", error: "not found" },
    ]);
  });

  test("requires --row-ids to be a non-empty json array", async () => {
    const chunks: string[] = [];
    const exitCode = await runTableDeleteRowsCommand(
      ["--table", "meta-user1-tasks", "--row-ids", "[]"],
      {
        env: { AUTH_TOKEN: createJwt("user1"), NOLO_SERVER: "https://us.nolo.chat" },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("--row-ids must be a non-empty JSON array");
  });



  test("rejects multiple deletion sources", async () => {
    const chunks: string[] = [];
    const exitCode = await runTableDeleteRowsCommand(
      ["--table", "meta-user1-tasks", "--row-ids", '["row1"]', "--row-dbkeys", '["row-user1-tasks-row2"]'],
      {
        env: { AUTH_TOKEN: createJwt("user1"), NOLO_SERVER: "https://us.nolo.chat" },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("only one deletion source allowed");
  });
  test("requires at least one deletion source", async () => {
    const chunks: string[] = [];
    const exitCode = await runTableDeleteRowsCommand(
      ["--table", "meta-user1-tasks"],
      {
        env: { AUTH_TOKEN: createJwt("user1"), NOLO_SERVER: "https://us.nolo.chat" },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("nothing to delete");
  });
});

describe("exact table maintenance CLI commands", () => {
  test("purge-rows is a dry run by default and reports affectedCount", async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    const chunks: string[] = [];
    const exitCode = await runTablePurgeRowsCommand(
      [
        "--table",
        "meta-user1-tasks",
        "--row-dbkeys",
        '["row-user1-tasks-one","row-user1-tasks-two"]',
      ],
      {
        env: { AUTH_TOKEN: "secret", NOLO_SERVER: "https://us.nolo.chat" },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (url: string, init: RequestInit) => {
          requests.push({ url, body: JSON.parse(String(init.body)) });
          return new Response(JSON.stringify({ affectedCount: 2 }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        url: "https://us.nolo.chat/api/table/purge-rows",
        body: {
          tableDbKey: "meta-user1-tasks",
          rowDbKeys: ["row-user1-tasks-one", "row-user1-tasks-two"],
          dryRun: true,
        },
      },
    ]);
    expect(chunks.join("")).toContain("DRY RUN");
    expect(chunks.join("")).toContain("affectedCount=2");
  });

  test("purge-rows --yes sends the exact confirmation payload", async () => {
    let body: unknown;
    const chunks: string[] = [];
    const exitCode = await runTablePurgeRowsCommand(
      [
        "--table",
        "meta-user1-tasks",
        "--row-dbkeys",
        '["row-user1-tasks-one"]',
        "--yes",
      ],
      {
        env: { AUTH_TOKEN: "secret" },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (_url: string, init: RequestInit) => {
          body = JSON.parse(String(init.body));
          return new Response(JSON.stringify({ rawData: { affectedCount: 1 } }), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(body).toEqual({
      tableDbKey: "meta-user1-tasks",
      rowDbKeys: ["row-user1-tasks-one"],
      dryRun: false,
      confirmTableDbKey: "meta-user1-tasks",
    });
    expect(chunks.join("")).toContain("EXECUTED");
    expect(chunks.join("")).toContain("affectedCount=1");
  });

  test("remove-row-fields sends fields and preserves the JSON response", async () => {
    let body: unknown;
    const chunks: string[] = [];
    const responsePayload = { ok: true, dryRun: false, affectedCount: 4 };
    const exitCode = await runTableRemoveRowFieldsCommand(
      [
        "--table",
        "meta-user1-tasks",
        "--row-dbkeys",
        '["row-user1-tasks-one","row-user1-tasks-two"]',
        "--fields",
        '["weeklyQuota","currentUsage"]',
        "--yes",
        "--json",
      ],
      {
        env: { AUTH_TOKEN: "secret" },
        output: { write: (chunk) => chunks.push(String(chunk)) },
        fetchImpl: (async (_url: string, init: RequestInit) => {
          body = JSON.parse(String(init.body));
          return new Response(JSON.stringify(responsePayload), { status: 200 });
        }) as unknown as typeof fetch,
      }
    );

    expect(exitCode).toBe(0);
    expect(body).toEqual({
      tableDbKey: "meta-user1-tasks",
      rowDbKeys: ["row-user1-tasks-one", "row-user1-tasks-two"],
      fields: ["weeklyQuota", "currentUsage"],
      dryRun: false,
      confirmTableDbKey: "meta-user1-tasks",
    });
    expect(JSON.parse(chunks.join(""))).toEqual(responsePayload);
  });

  test("rejects missing exact targets and invalid JSON without fetching", async () => {
    let fetchCount = 0;
    const fetchImpl = (async () => {
      fetchCount += 1;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;

    const missingTableOutput: string[] = [];
    expect(await runTablePurgeRowsCommand(
      ["--row-dbkeys", '["row-one"]'],
      {
        env: { AUTH_TOKEN: "secret" },
        output: { write: (chunk) => missingTableOutput.push(String(chunk)) },
        fetchImpl,
      }
    )).toBe(1);
    expect(missingTableOutput.join("")).toContain("--table must be an exact table dbKey");

    const invalidRowsOutput: string[] = [];
    expect(await runTablePurgeRowsCommand(
      ["--table", "meta-user1-tasks", "--row-dbkeys", "not-json"],
      {
        env: { AUTH_TOKEN: "secret" },
        output: { write: (chunk) => invalidRowsOutput.push(String(chunk)) },
        fetchImpl,
      }
    )).toBe(1);
    expect(invalidRowsOutput.join("")).toContain("--row-dbkeys must be valid JSON");

    const nonExactRowsOutput: string[] = [];
    expect(await runTablePurgeRowsCommand(
      ["--table", "meta-user1-tasks", "--row-dbkeys", '["one"]'],
      {
        env: { AUTH_TOKEN: "secret" },
        output: { write: (chunk) => nonExactRowsOutput.push(String(chunk)) },
        fetchImpl,
      }
    )).toBe(1);
    expect(nonExactRowsOutput.join("")).toContain(
      '--row-dbkeys must contain exact row dbKeys beginning with "row-"'
    );

    const missingFieldsOutput: string[] = [];
    expect(await runTableRemoveRowFieldsCommand(
      ["--table", "meta-user1-tasks", "--row-dbkeys", '["row-one"]'],
      {
        env: { AUTH_TOKEN: "secret" },
        output: { write: (chunk) => missingFieldsOutput.push(String(chunk)) },
        fetchImpl,
      }
    )).toBe(1);
    expect(missingFieldsOutput.join("")).toContain("--fields is required");

    const invalidFieldsOutput: string[] = [];
    expect(await runTableRemoveRowFieldsCommand(
      [
        "--table",
        "meta-user1-tasks",
        "--row-dbkeys",
        '["row-one"]',
        "--fields",
        "{}",
      ],
      {
        env: { AUTH_TOKEN: "secret" },
        output: { write: (chunk) => invalidFieldsOutput.push(String(chunk)) },
        fetchImpl,
      }
    )).toBe(1);
    expect(invalidFieldsOutput.join("")).toContain("--fields must be a non-empty JSON array of strings");
    expect(fetchCount).toBe(0);
  });
});
