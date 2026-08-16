import { describe, expect, test } from "bun:test";

import { buildCliLocalRuntimeDbEnv, resolveCliLocalRuntimeDbPath } from "./localRuntimeDb";

describe("CLI local runtime DB path", () => {
  test("uses a user-level default independent from cwd", () => {
    expect(resolveCliLocalRuntimeDbPath({
      env: {},
      homeDir: "/Users/demo",
    })).toBe("/Users/demo/.nolo/data/leveldb");
  });

  test("honors NOLO_HOME for CLI local runtime only", () => {
    expect(resolveCliLocalRuntimeDbPath({
      env: { NOLO_HOME: "/var/nolo" },
      homeDir: "/Users/demo",
    })).toBe("/var/nolo/data/leveldb");
  });

  test("does not overwrite explicit server DB path", () => {
    expect(buildCliLocalRuntimeDbEnv({
      NOLO_SERVER_DB_PATH: "/tmp/slot/leveldb",
      NOLO_HOME: "/var/nolo",
    }).NOLO_SERVER_DB_PATH).toBe("/tmp/slot/leveldb");
  });

  test("injects CLI user-level DB path when no explicit server DB path exists", () => {
    expect(buildCliLocalRuntimeDbEnv({
      NOLO_HOME: "/var/nolo",
    }).NOLO_SERVER_DB_PATH).toBe("/var/nolo/data/leveldb");
  });
});
