import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "bun:test";

const root = join(import.meta.dir, "../../..");

describe("routing facade", () => {
  it("exists as the app-owned routing boundary", () => {
    const source = readFileSync(
      join(root, "packages/app/routing/index.tsx"),
      "utf8",
    );

    expect(source).toContain("export");
    expect(source).toContain("useNavigate");
    expect(source).toContain("NavLink");
    expect(source).toContain("Outlet");
  });
});
