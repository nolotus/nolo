import { describe, expect, test } from "bun:test";

import { resolveServerDbPath } from "./dbPath";

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
