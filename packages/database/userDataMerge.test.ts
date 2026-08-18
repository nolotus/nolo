import { describe, it, expect } from "bun:test";
import { mergeAndDedupUserData } from "./userDataMerge";

describe("mergeAndDedupUserData", () => {
  it("uses dbKey as primary merge key, not id", () => {
    const localData = [
      {
        dbKey: "page-user1-ABC",
        deletedAt: "2026-03-20T10:00:00Z",
        updatedAt: "2026-03-20T10:00:00Z",
      },
    ];
    const remoteResults = [
      {
        data: {
          data: [
            {
              id: "ABC",
              dbKey: "page-user1-ABC",
              type: "page",
              updatedAt: "2026-03-19T10:00:00Z",
            },
          ],
        },
      },
    ];

    const result = mergeAndDedupUserData(localData, remoteResults);
    // tombstone 时间更新，应该胜出；最终 filter 过滤掉 tombstone → 空
    expect(result).toEqual([]);
  });

  it("tombstone without id still matches remote record with id via dbKey", () => {
    // 这是修复前的真实 bug：本地 tombstone 只有 dbKey，远端活记录有 id + dbKey
    const localData = [
      {
        dbKey: "page-0e95801d90-01KHP2AK33JVDZ14Z3D5P8FERE",
        deletedAt: "2026-03-20T12:00:00Z",
        updatedAt: "2026-03-20T12:00:00Z",
      },
    ];
    const remoteResults = [
      {
        data: {
          data: [
            {
              id: "01KHP2AK33JVDZ14Z3D5P8FERE",
              dbKey: "page-0e95801d90-01KHP2AK33JVDZ14Z3D5P8FERE",
              type: "page",
              title: "test page",
              updatedAt: "2026-03-20T09:51:21+08:00",
            },
          ],
        },
      },
    ];

    const result = mergeAndDedupUserData(localData, remoteResults);
    expect(result).toEqual([]);
  });

  it("tombstone matches remote active record via contentKey when remote only has id+contentKey (no dbKey)", () => {
    // Regression: remote summary records sometimes omit dbKey and only carry the
    // short id + contentKey. getItemKey must prefer contentKey over raw id so
    // the tombstone covers the active record; otherwise the deleted item would
    // reappear in the my-content list under the short-id key.
    const localData = [
      {
        dbKey: "page-user1-ABC",
        deletedAt: "2026-07-06T10:00:00Z",
        updatedAt: "2026-07-06T10:00:00Z",
      },
    ];
    const remoteResults = [
      {
        data: {
          data: [
            {
              id: "ABC",
              contentKey: "page-user1-ABC",
              type: "page",
              title: "stale duplicate",
              updatedAt: "2026-07-05T10:00:00Z",
            },
          ],
        },
      },
    ];

    expect(mergeAndDedupUserData(localData, remoteResults)).toEqual([]);
    // includeDeleted surfaces the surviving tombstone under the canonical key.
    const preserved = mergeAndDedupUserData(localData, remoteResults, {
      includeDeleted: true,
    });
    expect(preserved).toHaveLength(1);
    expect(preserved[0].dbKey).toBe("page-user1-ABC");
    expect(preserved[0].deletedAt).toBe("2026-07-06T10:00:00Z");
  });

  it("keeps active record when no tombstone exists", () => {
    const localData: any[] = [];
    const remoteResults = [
      {
        data: {
          data: [
            {
              id: "ABC",
              dbKey: "page-user1-ABC",
              type: "page",
              updatedAt: "2026-03-19T10:00:00Z",
            },
          ],
        },
      },
    ];

    const result = mergeAndDedupUserData(localData, remoteResults);
    expect(result.length).toBe(1);
    expect(result[0].dbKey).toBe("page-user1-ABC");
  });

  it("deduplicates records from multiple remote servers by dbKey", () => {
    const localData: any[] = [];
    const remoteResults = [
      {
        data: {
          data: [
            {
              dbKey: "page-user1-ABC",
              type: "page",
              updatedAt: "2026-03-19T10:00:00Z",
              serverOrigin: "https://nolo.chat",
            },
          ],
        },
      },
      {
        data: {
          data: [
            {
              dbKey: "page-user1-ABC",
              type: "page",
              updatedAt: "2026-03-20T10:00:00Z",
              serverOrigin: "https://us.nolo.chat",
            },
          ],
        },
      },
    ];

    const result = mergeAndDedupUserData(localData, remoteResults);
    expect(result.length).toBe(1);
    // 更新时间更晚的版本应胜出
    expect(result[0].updatedAt).toBe("2026-03-20T10:00:00Z");
  });

  it("same-timestamp tombstone wins over active record", () => {
    const ts = "2026-03-20T10:00:00Z";
    const localData = [
      { dbKey: "page-user1-X", deletedAt: ts, updatedAt: ts },
    ];
    const remoteResults = [
      {
        data: {
          data: [
            { dbKey: "page-user1-X", type: "page", updatedAt: ts },
          ],
        },
      },
    ];

    const result = mergeAndDedupUserData(localData, remoteResults);
    expect(result).toEqual([]);
  });

  it("can preserve tombstones for local cache refresh", () => {
    const tombstone = {
      dbKey: "dialog-user1-ABC",
      type: "dialog",
      deletedAt: "2026-05-10T15:10:22.000Z",
      updatedAt: "2026-05-10T15:10:22.000Z",
    };
    const localData = [
      {
        dbKey: "dialog-user1-ABC",
        type: "dialog",
        title: "pw-agent-mozub4oi  05-10 23:10",
        updatedAt: "2026-05-10T15:10:00.000Z",
      },
    ];
    const remoteResults = [{ data: { data: [tombstone] } }];

    expect(mergeAndDedupUserData(localData, remoteResults)).toEqual([]);
    expect(
      mergeAndDedupUserData(localData, remoteResults, { includeDeleted: true })
    ).toEqual([tombstone]);
  });
});
