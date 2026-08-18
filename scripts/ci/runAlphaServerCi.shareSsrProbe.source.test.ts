import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "runAlphaServerCi.sh"), "utf8");
const workflow = readFileSync(join(import.meta.dir, "..", "..", ".github", "workflows", "main.yml"), "utf8");

describe("runAlphaServerCi share SSR probe source contract", () => {
  it("supports an optional alpha share SSR probe after deploy", () => {
    expect(source).toContain('ALPHA_SSR_PROBE_PATH="${NOLO_ALPHA_SSR_PROBE_PATH:-}"');
    expect(source).toContain("probe_alpha_share_ssr()");
    expect(source).toContain('curl -s -o /dev/null -w "alpha_share_local code=%{http_code}');
    expect(source).toContain('curl -s -o /dev/null -w "alpha_share_public code=%{http_code}');
    expect(source).toContain("grep -E '\\[ssr-render\\]|\\[share-ssr\\] preload share detail|SSR total'");
    expect(source).toContain("probe_alpha_share_ssr");
  });

  it("keeps GitHub Actions alpha jobs probe-only because alpha deploys are owned by nolo-ci", () => {
    expect(workflow).not.toContain("NOLO_ALPHA_SSR_PROBE_PATH:");
    expect(workflow).not.toContain("bash ./scripts/ci/runAlphaServerCi.sh alpha-deploy");
  });
});
