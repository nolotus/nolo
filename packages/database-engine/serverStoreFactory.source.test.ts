import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "serverStoreFactory.ts"),
  "utf-8"
);

describe("serverStoreFactory source contract", () => {
  it("declares all supported server authority store drivers", () => {
    expect(source).toContain('ServerStoreDriver = "level" | "memory" | "sqlite"');
  });

  it("resolves sqlite from env", () => {
    expect(source).toContain('if (rawDriver === "sqlite") return "sqlite"');
  });

  it("creates sqlite authority store in the driver switch", () => {
    expect(source).toContain('case "sqlite":');
    expect(source).toContain("createSqliteAuthorityStore");
  });
});
