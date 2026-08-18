import { describe, expect, it } from "bun:test";

const read = (path: string) => Bun.file(path).text();

describe("ClientDownloadsPage source", () => {
  it("uses high contrast hover styles on action buttons without filter brightness degradation", async () => {
    const cssSource = await read("packages/app/pages/ClientDownloadsPage.css");

    expect(cssSource).toContain("color: var(--textOnPrimary, var(--primaryText, #ffffff));");
    expect(cssSource).toContain("background: color-mix(in srgb, var(--primary) 88%, #ffffff 12%);");
    expect(cssSource).not.toContain("filter: brightness(");
  });
  it("uses the SSR desktop release manifest instead of only browser origin", async () => {
    const pageSource = await read("packages/app/pages/ClientDownloadsPage.tsx");
    const preloadSource = await read("packages/server/html/ssrPreload.ts");

    expect(pageSource).toContain("desktopReleaseManifestDbKey");
    expect(pageSource).toContain("resolveDesktopManifestChannelFromOrigin");
    expect(pageSource).toContain("normalizeDesktopReleaseManifest");
    expect(pageSource).toContain("getClientDownloadUrls(");
    expect(pageSource).toContain("getCliInstallCommand");
    expect(pageSource).toContain("getCurlCliInstallCommand");
    expect(pageSource).toContain("clientDownloads.cliTitle");
    expect(pageSource).toContain("clientDownloads.cliRequirement");
    expect(pageSource).toContain("clientDownloads.macCliRequirement");
    expect(preloadSource).toContain('pathname === "/downloads"');
    expect(preloadSource).toContain("readDesktopReleaseManifest");
    expect(preloadSource).toContain("resolveDesktopManifestChannelFromOrigin");
    expect(preloadSource).toContain("desktopReleaseManifestDbKey");
    expect(preloadSource).toContain("upsertSSREntity");
  });
});
