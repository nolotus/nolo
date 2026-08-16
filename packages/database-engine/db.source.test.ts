import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "db.ts"), "utf8");

describe("server db source contract", () => {
  it("exports the authority store alongside the legacy server db facade", () => {
    expect(source).toContain("export function getServerAuthorityStore()");
    expect(source).toContain("return authorityStore;");
  });

  it("bounds the server db open path with an env-tunable lock retry", () => {
    expect(source).toContain("NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS");
    expect(source).toContain("isServerDbLockError(err)");
  });
});
