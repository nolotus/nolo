import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "ShareCommunityPreview.tsx"), "utf8");

describe("ShareCommunityPreview source contract", () => {
  it("hydrates from SSR community shares before refresh", () => {
    expect(source).toContain("useSSRCommunityShares");
    expect(source).toContain("from \"share/shareStore\"");
    expect(source).toContain("const ssrCommunityShares = useSSRCommunityShares();");
    expect(source).toContain("const [shares, setShares] = useState<ShareCardItem[]>(() =>");
    expect(source).toContain("? ssrCommunityShares.data.map(mapSummary)");
  });

  it("keeps existing shares visible when refresh fails", () => {
    expect(source).not.toContain("setShares([]);");
    expect(source).toContain('setError(err?.message || "加载社区分享失败")');
  });

  it("requests lightweight summaries with cover URLs instead of embedded cover images", () => {
    expect(source).toContain('new URLSearchParams({ limit: "6", coverImage: "url" })');
  });
});
