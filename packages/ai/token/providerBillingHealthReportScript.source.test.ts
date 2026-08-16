import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "../../../scripts/reportProviderBillingHealth.ts"),
  "utf-8"
);

describe("reportProviderBillingHealth script source", () => {
  it("loads the DB dynamically and builds the provider billing health report", () => {
    expect(source).toContain("buildProviderBillingHealthReport");
    expect(source).toContain('await import("database-engine/db")');
    expect(source).not.toContain('import serverDb, { ensureServerDbOpen } from "database-engine/db"');
  });

  it("supports explicit ISO windows and safe default limits", () => {
    expect(source).toContain('readOption("--since")');
    expect(source).toContain('readOption("--until")');
    expect(source).toContain('readOption("--limit")');
  });
});
