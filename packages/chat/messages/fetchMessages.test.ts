import { afterEach, describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;

async function loadFetchMessages() {
  mock.module("database/tombstones", () => ({
    isTombstoneRecord: (record: any) => Boolean(record?.deletedAt),
    shouldReplaceWithNextRecord: (nextRecord: any, currentRecord: any) => {
      if (!currentRecord) return true;
      return String(nextRecord?.updatedAt ?? "") > String(currentRecord?.updatedAt ?? "");
    },
  }));

  const mod = await import(`./fetchMessages.ts`);
  return mod.fetchMessages;
}

describe("fetchMessages", () => {
  afterEach(() => {
    mock.restore();
  });

  it("defaults to unbounded history (no iterator limit)", async () => {
    const { isUnboundedMessageLimit, fetchMessages } = await import(
      `./fetchMessages.ts?test=${moduleVersion++}`
    );
    expect(isUnboundedMessageLimit(undefined)).toBe(true);
    expect(isUnboundedMessageLimit(0)).toBe(true);
    expect(isUnboundedMessageLimit(-1)).toBe(true);
    expect(isUnboundedMessageLimit(50)).toBe(false);

    let iteratorOptions: any = null;
    const db = {
      iterator: (options: any) => {
        iteratorOptions = options;
        return (async function* () {
          yield [
            "dialog-dialog-1-msg-01",
            {
              id: "msg-01",
              role: "user",
              content: "hi",
              createdAt: "2026-03-27T10:58:00.000Z",
            },
          ] as [string, unknown];
        })();
      },
    };

    await fetchMessages(db, "dialog-1", { throwOnError: true });
    expect(iteratorOptions).toBeTruthy();
    expect(iteratorOptions.limit).toBeUndefined();

    await fetchMessages(db, "dialog-1", { throwOnError: true, limit: 12 });
    expect(iteratorOptions.limit).toBe(12);
  });

  it("skips tombstoned messages when loading a dialog", async () => {
    const fetchMessages = await loadFetchMessages();

    const records: Array<[string, unknown]> = [
      [
        "dialog-dialog-1-msg-03",
        {
          id: "msg-03",
          dbKey: "dialog-dialog-1-msg-03",
          role: "assistant",
          content: "deleted",
          createdAt: "2026-03-27T11:00:00.000Z",
          deletedAt: "2026-03-27T11:01:00.000Z",
          updatedAt: "2026-03-27T11:01:00.000Z",
        },
      ],
      [
        "dialog-dialog-1-msg-02",
        {
          id: "msg-02",
          dbKey: "dialog-dialog-1-msg-02",
          role: "assistant",
          content: "kept-2",
          createdAt: "2026-03-27T10:59:00.000Z",
        },
      ],
      [
        "dialog-dialog-1-msg-01",
        {
          id: "msg-01",
          dbKey: "dialog-dialog-1-msg-01",
          role: "user",
          content: "kept-1",
          createdAt: "2026-03-27T10:58:00.000Z",
        },
      ],
    ];

    const db = {
      iterator: () =>
        (async function* () {
          for (const record of records) {
            yield record;
          }
        })(),
    };

    const result = await fetchMessages(db, "dialog-1", { throwOnError: true });

    expect(result.map((msg: any) => msg.id)).toEqual(["msg-02", "msg-01"]);
    expect(result.some((msg: any) => msg.deletedAt)).toBe(false);
  });
});
