import { describe, expect, test } from "bun:test";

import { resolveLocalDialogDbCandidates, resolveServerDbPath } from "./dbPath";

describe("resolveServerDbPath", () => {
  test("honors explicit NOLO_SERVER_DB_PATH", () => {
    expect(resolveServerDbPath({
      env: { NOLO_SERVER_DB_PATH: "/tmp/nolo-slot/leveldb" },
      homeDir: "/Users/demo",
    })).toBe("/tmp/nolo-slot/leveldb");
  });

  test("uses cwd-relative data/leveldb for bare server processes", () => {
    expect(resolveServerDbPath({
      env: {},
      homeDir: "/Users/demo",
      cwd: "/repo/bun-nolo",
    })).toBe("/repo/bun-nolo/data/leveldb");
  });

  test("does not apply NOLO_HOME to server processes unless NOLO_SERVER_DB_PATH is set", () => {
    expect(resolveServerDbPath({
      env: { NOLO_HOME: "/var/nolo" },
      homeDir: "/Users/demo",
      cwd: "/repo/bun-nolo",
    })).toBe("/repo/bun-nolo/data/leveldb");
  });
});

describe("resolveLocalDialogDbCandidates", () => {
  test("falls back from cwd data dir to NOLO_HOME data dir", () => {
    expect(resolveLocalDialogDbCandidates({
      env: { NOLO_HOME: "/Users/demo/.nolo" },
      homeDir: "/Users/demo",
      cwd: "/repo/bun-nolo",
    })).toEqual([
      "/repo/bun-nolo/data/leveldb",
      "/Users/demo/.nolo/data/leveldb",
    ]);
  });

  test("derives the NOLO_HOME candidate from homeDir when NOLO_HOME is unset", () => {
    expect(resolveLocalDialogDbCandidates({
      env: {},
      homeDir: "/Users/demo",
      cwd: "/repo/bun-nolo",
    })).toEqual([
      "/repo/bun-nolo/data/leveldb",
      "/Users/demo/.nolo/data/leveldb",
    ]);
  });

  test("keeps an explicit NOLO_SERVER_DB_PATH as the primary candidate", () => {
    expect(resolveLocalDialogDbCandidates({
      env: { NOLO_SERVER_DB_PATH: "/tmp/nolo-slot/leveldb", NOLO_HOME: "/var/nolo" },
      homeDir: "/Users/demo",
      cwd: "/repo/bun-nolo",
    })).toEqual([
      "/tmp/nolo-slot/leveldb",
      "/var/nolo/data/leveldb",
    ]);
  });

  test("dedupes when the primary path already is the NOLO_HOME db", () => {
    expect(resolveLocalDialogDbCandidates({
      env: { NOLO_SERVER_DB_PATH: "/Users/demo/.nolo/data/leveldb", NOLO_HOME: "/Users/demo/.nolo" },
      homeDir: "/Users/demo",
      cwd: "/repo/bun-nolo",
    })).toEqual(["/Users/demo/.nolo/data/leveldb"]);
  });
});
