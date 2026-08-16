import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "routeStyles.js"), "utf8");

describe("home route styles source contract", () => {
  it("builds a dedicated first-paint stylesheet for the homepage", () => {
    expect(source).toContain('"packages/app/pages/home-motion.css"');
    expect(source).toContain('"packages/app/pages/WelcomeSection.css"');
    expect(source).toContain('"packages/app/pages/WelcomeSection.hero.css"');
    expect(source).toContain('"packages/app/pages/WelcomeSection.orchestration.css"');
    expect(source).toContain('"packages/app/pages/Home.css"');
    expect(source).toContain('"home.css"');
  });

  it("remains the single authoritative source of the route-style file map", () => {
    // The shared module exports the data; one-shot and dev builds must both reuse it.
    expect(source).toContain("export const ROUTE_STYLE_FILES");
    expect(source).toContain("export const copyRouteStyles");
  });
});
