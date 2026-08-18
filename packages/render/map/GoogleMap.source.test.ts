import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("GoogleMap source contract", () => {
  test("does not hard-code Google API keys", () => {
    const source = readFileSync(join(import.meta.dir, "GoogleMap.tsx"), "utf8");

    expect(source).not.toMatch(/AIza[0-9A-Za-z_-]+/);
    expect(source).toContain("process.env.GOOGLE_MAPS_API_KEY");
    expect(source).toContain("process.env.MAPS_API_KEY");
  });
});
