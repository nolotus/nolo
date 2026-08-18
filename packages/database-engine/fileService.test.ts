import { afterEach, describe, expect, it, mock } from "bun:test";
import { fileIdIndexKey } from "database/keys";

let moduleVersion = 0;

const createMockDb = (records: Record<string, any>) => ({
  get: async (key: string) => {
    if (key in records) {
      return records[key];
    }

    const error: any = new Error("NotFound");
    error.code = "LEVEL_NOT_FOUND";
    error.notFound = true;
    throw error;
  },
  put: async () => {},
  del: async () => {},
  batch: () => ({
    put: () => {},
    del: () => {},
    write: async () => {},
  }),
});

const loadFileService = async (records: Record<string, any>) => {
  mock.module("./db", () => ({
    default: createMockDb(records),
    getServerAuthorityStore: () => createMockDb(records),
  }));

  return import(`./fileService.ts`);
};

afterEach(() => {
  mock.restore();
});

describe("getFileMetadataById", () => {
  it("returns null for tombstoned direct file records", async () => {
    const { getFileMetadataById } = await loadFileService({
      "file-user-1-abc": {
        dbKey: "file-user-1-abc",
        id: "abc",
        deletedAt: new Date().toISOString(),
      },
    });

    await expect(getFileMetadataById("file-user-1-abc")).resolves.toBeNull();
  });

  it("returns null for tombstoned records resolved via fileId index", async () => {
    const { getFileMetadataById } = await loadFileService({
      [fileIdIndexKey("abc")]: {
        tenantId: "default",
        fileId: "abc",
        mainKey: "file-user-1-abc",
      },
      "file-user-1-abc": {
        dbKey: "file-user-1-abc",
        id: "abc",
        deletedAt: new Date().toISOString(),
      },
    });

    await expect(getFileMetadataById("abc")).resolves.toBeNull();
  });

  it("keeps returning live file metadata", async () => {
    const liveRecord = {
      dbKey: "file-user-1-live",
      id: "live",
      mimeType: "text/plain",
      filePath: "/tmp/live.txt",
    };

    const { getFileMetadataById } = await loadFileService({
      [fileIdIndexKey("live")]: {
        tenantId: "default",
        fileId: "live",
        mainKey: "file-user-1-live",
      },
      "file-user-1-live": liveRecord,
    });

    await expect(getFileMetadataById("live")).resolves.toEqual(liveRecord);
  });
});

describe("hasFileTombstoneById", () => {
  it("detects tombstoned direct file records", async () => {
    const { hasFileTombstoneById } = await loadFileService({
      "file-user-1-deleted": {
        dbKey: "file-user-1-deleted",
        id: "deleted",
        deletedAt: new Date().toISOString(),
      },
    });

    await expect(hasFileTombstoneById("file-user-1-deleted")).resolves.toBe(true);
  });

  it("detects tombstoned records resolved via fileId index", async () => {
    const { hasFileTombstoneById } = await loadFileService({
      [fileIdIndexKey("deleted")]: {
        tenantId: "default",
        fileId: "deleted",
        mainKey: "file-user-1-deleted",
      },
      "file-user-1-deleted": {
        dbKey: "file-user-1-deleted",
        id: "deleted",
        deletedAt: new Date().toISOString(),
      },
    });

    await expect(hasFileTombstoneById("deleted")).resolves.toBe(true);
  });

  it("returns false for live file records", async () => {
    const { hasFileTombstoneById } = await loadFileService({
      [fileIdIndexKey("live")]: {
        tenantId: "default",
        fileId: "live",
        mainKey: "file-user-1-live",
      },
      "file-user-1-live": {
        dbKey: "file-user-1-live",
        id: "live",
        filePath: "/tmp/live.txt",
      },
    });

    await expect(hasFileTombstoneById("live")).resolves.toBe(false);
  });
});
