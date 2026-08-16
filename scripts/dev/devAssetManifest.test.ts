import { describe, expect, test } from "bun:test";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { publishDevWebBuildSignal, getDevEntryAssetManifest } from "./devAssetManifest.js";

describe("devAssetManifest", () => {
  test("dev entry manifest uses stable entry.js paths", () => {
    const m = getDevEntryAssetManifest();
    expect(m.js).toContain("entry.js");
    expect(m.timestamp).toBe("dev");
  });

  test("publishDevWebBuildSignal writes latest-assets.json", async () => {
    rmSync("public/.dev-reload-version", { force: true });
    await publishDevWebBuildSignal({ buildMs: 1 });
    expect(existsSync("public/latest-assets.json")).toBe(true);
    expect(existsSync("public/.dev-reload-version")).toBe(false);
    const assets = JSON.parse(readFileSync("public/latest-assets.json", "utf8"));
    expect(assets.js).toContain("entry.js");
  });
});
