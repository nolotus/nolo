import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  validateDesktopUpdateMetadata,
  mergeDesktopReleaseManifest,
  normalizeDesktopPublishChannel,
  resolveDesktopAppVersion,
  resolveDesktopPublishConfig,
  resolveDesktopReleaseUploadPlan,
  resolveDesktopPublishTargets,
  resolveImmutableDesktopPrimaryUploadName,
  createDesktopReleaseArtifact,
  desktopReleaseManifestFileName,
  verifyPublishedTripleConsistency,
  verifyPublishedUrl,
  assertTripleConsistency,
  type DesktopTripleConsistencyResult,
} from "./desktopReleasePublisher";
import { DESKTOP_APP_VERSION } from "../../packages/desktop/desktopVersion";
import {
  normalizeDesktopReleaseManifest,
  type DesktopReleaseManifest,
} from "../../packages/app/constants/desktopReleaseManifest";

describe("desktopReleasePublisher", () => {
  it("verifies published size directly from HEAD when available", async () => {
    const requests: RequestInit[] = [];
    await verifyPublishedUrl("https://downloads.example/artifact", 100, {
      fetchFn: async (_input, init) => {
        requests.push(init ?? {});
        return new Response(null, {
          status: 200,
          headers: { "content-length": "120" },
        });
      },
      maxAttempts: 1,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("HEAD");
  });

  it("uses Content-Range when a compressed HEAD response has no usable length", async () => {
    const requests: RequestInit[] = [];
    await verifyPublishedUrl("https://downloads.example/manifest.json", 1, {
      fetchFn: async (_input, init) => {
        requests.push(init ?? {});
        if (init?.method === "HEAD") {
          return new Response(null, { status: 200 });
        }
        return new Response("{", {
          status: 206,
          headers: {
            "content-length": "1",
            "content-range": "bytes 0-0/1431",
          },
        });
      },
      maxAttempts: 1,
    });

    expect(requests).toHaveLength(2);
    expect(requests[1]?.method).toBe("GET");
    expect(new Headers(requests[1]?.headers).get("range")).toBe("bytes=0-0");
  });

  it("rejects objects whose range-confirmed size is below the minimum", async () => {
    await expect(
      verifyPublishedUrl("https://downloads.example/truncated", 100, {
        fetchFn: async (_input, init) =>
          init?.method === "HEAD"
            ? new Response(null, {
                status: 200,
                headers: { "content-length": "0" },
              })
            : new Response("x", {
                status: 206,
                headers: { "content-range": "bytes 0-0/12" },
              }),
        maxAttempts: 1,
      }),
    ).rejects.toThrow("minimum 100 bytes");
  });

  it("retains backoff retries while a new object becomes edge-visible", async () => {
    let attempts = 0;
    const delays: number[] = [];
    await verifyPublishedUrl("https://downloads.example/eventual", 10, {
      fetchFn: async () => {
        attempts += 1;
        return attempts === 1
          ? new Response(null, { status: 404 })
          : new Response(null, {
              status: 200,
              headers: { "content-length": "10" },
            });
      },
      sleepFn: async (ms) => {
        delays.push(ms);
      },
      maxAttempts: 2,
      baseDelayMs: 25,
    });

    expect(attempts).toBe(2);
    expect(delays).toEqual([25]);
  });

  it("retries transient fetch exceptions", async () => {
    let attempts = 0;
    const delays: number[] = [];
    await verifyPublishedUrl("https://downloads.example/transient", 10, {
      fetchFn: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("transient network failure");
        return new Response(null, {
          status: 200,
          headers: { "content-length": "10" },
        });
      },
      sleepFn: async (ms) => {
        delays.push(ms);
      },
      maxAttempts: 2,
      baseDelayMs: 25,
    });

    expect(attempts).toBe(2);
    expect(delays).toEqual([25]);
  });

  it("treats main as the stable desktop channel", () => {
    expect(normalizeDesktopPublishChannel("main")).toBe("stable");
    expect(normalizeDesktopPublishChannel("stable")).toBe("stable");
    expect(normalizeDesktopPublishChannel("alpha")).toBe("alpha");
  });

  it("names per-channel manifests and keeps the legacy alias filename", () => {
    expect(desktopReleaseManifestFileName("alpha")).toBe(
      "desktop-release-manifest.alpha.json",
    );
    expect(desktopReleaseManifestFileName("stable")).toBe(
      "desktop-release-manifest.stable.json",
    );
    expect(desktopReleaseManifestFileName()).toBe("desktop-release-manifest.json");
  });

  it("defaults publish metadata version to the desktop app version", () => {
    expect(resolveDesktopAppVersion()).toBe(DESKTOP_APP_VERSION);
    expect(resolveDesktopAppVersion(" 1.2.3 ")).toBe("1.2.3");
  });

  it("uses S3-compatible desktop downloads when storage credentials are configured", () => {
    const config = resolveDesktopPublishConfig({
      channel: "stable",
      env: {
        DESKTOP_DOWNLOAD_S3_ENDPOINT: "https://example.r2.cloudflarestorage.com",
        DESKTOP_DOWNLOAD_S3_BUCKET: "nolo-downloads",
        DESKTOP_DOWNLOAD_S3_REGION: "auto",
        DESKTOP_DOWNLOAD_S3_ACCESS_KEY_ID: "access-key",
        DESKTOP_DOWNLOAD_S3_SECRET_ACCESS_KEY: "secret-key",
        DESKTOP_DOWNLOAD_PUBLIC_BASE: "https://pub-example.r2.dev",
      } as NodeJS.ProcessEnv,
    });

    expect(config.storage).toBe("s3");
    expect(config.publicBase).toBe("https://pub-example.r2.dev");
    if (config.storage !== "s3") throw new Error("expected s3 config");
    expect(config.bucket).toBe("nolo-downloads");
    expect(config.region).toBe("auto");
    expect(config.endpoint).toBe("https://example.r2.cloudflarestorage.com");
  });

  it("merges platform updates so Windows and macOS can release independently", () => {
    const existing: DesktopReleaseManifest = {
      schemaVersion: 1,
      channel: "alpha",
      updatedAt: "2026-05-14T00:00:00.000Z",
      artifacts: {
        macos: {
          url: "/public/downloads/canary-mac.dmg",
          size: 100,
          sha256: "mac",
        },
      },
    };

    const merged = mergeDesktopReleaseManifest({
      channel: "alpha",
      existing,
      updatedAt: "2026-05-15T00:00:00.000Z",
      updates: {
        windows: {
          url: "/public/downloads/canary-win.exe",
          size: 200,
          sha256: "win",
        },
      },
    });

    expect(merged.artifacts.macos?.url).toBe("/public/downloads/canary-mac.dmg");
    expect(merged.artifacts.windows?.url).toBe("/public/downloads/canary-win.exe");
  });

  it("does not carry artifacts across channels", () => {
    const existing: DesktopReleaseManifest = {
      schemaVersion: 1,
      channel: "stable",
      updatedAt: "2026-05-14T00:00:00.000Z",
      artifacts: {
        windows: {
          url: "/public/downloads/stable-win.exe",
          size: 200,
        },
      },
    };

    const merged = mergeDesktopReleaseManifest({
      channel: "alpha",
      existing,
      updatedAt: "2026-05-15T00:00:00.000Z",
      updates: {
        macos: {
          url: "/public/downloads/canary-mac.dmg",
          size: 100,
        },
      },
    });

    expect(merged.artifacts.windows).toBeUndefined();
    expect(merged.artifacts.macos?.url).toBe("/public/downloads/canary-mac.dmg");
  });

  it("publishes the alpha macOS app archive when no DMG was built", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-alpha-mac-artifacts-"));
    const nestedArtifactDir = join(artifactDir, "packages", "desktop", "artifacts");
    await mkdir(nestedArtifactDir, { recursive: true });
    const sourcePath = join(
      nestedArtifactDir,
      "canary-macos-arm64-NoloDesktop-canary.app.tar.zst",
    );
    await writeFile(sourcePath, "fake app archive");

    const targets = await resolveDesktopPublishTargets({
      channel: "alpha",
      artifactDir,
      platforms: ["macos"],
    });

    expect(targets.primary).toEqual([
      {
        platform: "macos",
        sourcePath,
        uploadName: "canary-macos-arm64-NoloDesktop-canary.app.tar.zst",
        required: true,
        minBytes: 1,
      },
    ]);
  });

  it("prefers the alpha macOS DMG when both DMG and app tarball exist", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-desktop-publish-"));
    const dmgPath = join(artifactDir, "canary-macos-arm64-NoloDesktop-canary.dmg");
    const tarballPath = join(artifactDir, "canary-macos-arm64-NoloDesktop-canary.app.tar.zst");
    await writeFile(dmgPath, "fake dmg");
    await writeFile(tarballPath, "fake app archive");

    const targets = await resolveDesktopPublishTargets({
      channel: "alpha",
      artifactDir,
      platforms: ["macos"],
    });

    expect(targets.primary).toEqual([
      {
        platform: "macos",
        sourcePath: dmgPath,
        uploadName: "canary-macos-arm64-NoloDesktop-canary.dmg",
        required: true,
        minBytes: 1,
      },
    ]);
  });

  it("keeps stable macOS publishing strict about the DMG artifact", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-stable-mac-artifacts-"));
    await writeFile(
      join(artifactDir, "stable-macos-arm64-NoloDesktop.app.tar.zst"),
      "fake app archive",
    );

    await expect(
      resolveDesktopPublishTargets({
        channel: "stable",
        artifactDir,
        platforms: ["macos"],
      }),
    ).rejects.toThrow("Missing required macos desktop artifact");
  });

  it("uploads the versioned stable Windows installer as an optional artifact", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-stable-win-artifacts-"));
    await writeFile(join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"), "x".repeat(60000000));
    await writeFile(
      join(artifactDir, "stable-win-x64-NoloDesktop-Setup-0.1.2.exe"),
      "x".repeat(60000000),
    );
    await writeFile(join(artifactDir, "stable-win-x64-update.json"), "{\"hash\":\"abc\"}");

    const targets = await resolveDesktopPublishTargets({
      channel: "stable",
      artifactDir,
      platforms: ["windows"],
    });

    expect(targets.primary).toHaveLength(1);
    expect(targets.primary[0]?.uploadName).toBe("stable-win-x64-NoloDesktop-Setup.exe");
    expect(targets.optional.map((target) => target.uploadName)).toContain(
      "stable-win-x64-NoloDesktop-Setup-0.1.2.exe",
    );
  });

  it("derives immutable primary upload names without changing update metadata aliases", () => {
    expect(
      resolveImmutableDesktopPrimaryUploadName({
        uploadName: "stable-win-x64-NoloDesktop-Setup.exe",
        sourcePath: "/tmp/stable-win-x64-NoloDesktop-Setup.exe",
        version: "0.1.13",
      }),
    ).toBe("stable-win-x64-NoloDesktop-Setup-0.1.13.exe");
    expect(
      resolveImmutableDesktopPrimaryUploadName({
        uploadName: "stable-macos-arm64-NoloDesktop.app.tar.zst",
        sourcePath: "/tmp/stable-macos-arm64-NoloDesktop.app.tar.zst",
        version: "0.1.13",
      }),
    ).toBe("stable-macos-arm64-NoloDesktop-0.1.13.app.tar.zst");
    expect(
      resolveImmutableDesktopPrimaryUploadName({
        uploadName: "stable-win-x64-NoloDesktop-Setup.exe",
        sourcePath: "/tmp/stable-win-x64-NoloDesktop-Setup-0.1.13.exe",
        version: "0.1.13",
      }),
    ).toBe("stable-win-x64-NoloDesktop-Setup-0.1.13.exe");
  });

  it("resolves a manifest-aware upload plan with required update metadata per platform", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-stable-win-release-plan-"));
    const installerPath = join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe");
    const updateJsonPath = join(artifactDir, "stable-win-x64-update.json");
    await writeFile(installerPath, "x".repeat(60000000));
    await writeFile(updateJsonPath, JSON.stringify({ version: "0.1.13", hash: "hash-013" }));

    const plan = await resolveDesktopReleaseUploadPlan({
      channel: "stable",
      artifactDir,
      platforms: ["windows"],
      version: "0.1.13",
    });

    expect(plan.primary).toHaveLength(1);
    expect(plan.primary[0]).toMatchObject({
      platform: "windows",
      sourcePath: installerPath,
      uploadName: "stable-win-x64-NoloDesktop-Setup-0.1.13.exe",
      aliasUploadName: "stable-win-x64-NoloDesktop-Setup.exe",
    });
    expect(plan.updateMetadata.windows).toMatchObject({
      platform: "windows",
      sourcePath: updateJsonPath,
      uploadName: "stable-win-x64-update.json",
    });
    expect(plan.requiredUploadNames).toEqual([
      "stable-win-x64-NoloDesktop-Setup-0.1.13.exe",
      "stable-win-x64-update.json",
      "desktop-release-manifest.stable.json",
      "desktop-release-manifest.json",
    ]);
    expect(plan.preManifestUploadNames).toEqual([
      "stable-win-x64-NoloDesktop-Setup-0.1.13.exe",
      "stable-win-x64-update.json",
      "desktop-release-manifest.stable.json",
    ]);
    expect(plan.postManifestUploadNames).toEqual([
      "stable-win-x64-NoloDesktop-Setup.exe",
      "desktop-release-manifest.json",
    ]);
    expect(plan.channelManifestUploadName).toBe("desktop-release-manifest.stable.json");
    expect(plan.legacyManifestUploadName).toBe("desktop-release-manifest.json");
  });

  it("rejects a manifest-aware upload plan when platform update metadata is missing", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-stable-win-release-plan-missing-"));
    await writeFile(
      join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"),
      "x".repeat(60000000),
    );

    await expect(
      resolveDesktopReleaseUploadPlan({
        channel: "stable",
        artifactDir,
        platforms: ["windows"],
      }),
    ).rejects.toThrow("Missing windows desktop update metadata: stable-win-x64-update.json");
  });

  it("rejects built update metadata when the release version does not advance", () => {
    expect(() =>
      validateDesktopUpdateMetadata({
        channel: "stable",
        platform: "windows",
        expectedVersion: "0.1.5",
        buildSha: "new",
        updateJson: {
          version: "0.1.5",
          hash: "abc",
        },
        existingManifest: {
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-05-26T00:00:00.000Z",
          artifacts: {
            windows: {
              url: "/public/downloads/stable-win-x64-NoloDesktop-Setup.exe",
              size: 123,
              version: "0.1.5",
              buildSha: "old",
              publishedAt: "2026-05-26T00:00:00.000Z",
            },
          },
        },
      }),
    ).toThrow("must be newer than the currently published");
  });

  it("repairs a stable channel polluted by a prerelease version instead of blocking", () => {
    // Regression guard: stable-win/macos update.json once recorded
    // 0.53.0-alpha.1 (an alpha build published to stable), which deadlocked
    // every stable release behind the monotonicity check.
    expect(() =>
      validateDesktopUpdateMetadata({
        channel: "stable",
        platform: "windows",
        expectedVersion: "0.36.1",
        buildSha: "new",
        updateJson: {
          version: "0.36.1",
          hash: "abc",
        },
        existingManifest: {
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-08-31T00:00:00.000Z",
          artifacts: {
            windows: {
              url: "/public/downloads/stable-win-x64-NoloDesktop-Setup.exe",
              size: 123,
              version: "0.53.0-alpha.1",
              buildSha: "polluted",
              publishedAt: "2026-08-31T00:00:00.000Z",
            },
          },
        },
      }),
    ).not.toThrow();
  });

  it("still rejects a stable downgrade between two stable versions", () => {
    expect(() =>
      validateDesktopUpdateMetadata({
        channel: "stable",
        platform: "windows",
        expectedVersion: "0.36.1",
        buildSha: "new",
        updateJson: {
          version: "0.36.1",
          hash: "abc",
        },
        existingManifest: {
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-08-31T00:00:00.000Z",
          artifacts: {
            windows: {
              url: "/public/downloads/stable-win-x64-NoloDesktop-Setup.exe",
              size: 123,
              version: "0.37.0",
              buildSha: "old",
              publishedAt: "2026-08-31T00:00:00.000Z",
            },
          },
        },
      }),
    ).toThrow("must be newer than the currently published");
  });

  it("does not let the pollution repair bypass canary monotonicity", () => {
    expect(() =>
      validateDesktopUpdateMetadata({
        channel: "alpha",
        platform: "windows",
        expectedVersion: "0.32.0-alpha.50",
        buildSha: "new",
        updateJson: {
          version: "0.32.0-alpha.50",
          hash: "abc",
        },
        existingManifest: {
          schemaVersion: 1,
          channel: "alpha",
          updatedAt: "2026-08-31T00:00:00.000Z",
          artifacts: {
            windows: {
              url: "/public/downloads/canary-win-x64-NoloDesktop-Setup.exe",
              size: 123,
              version: "0.32.0-alpha.60",
              buildSha: "newer-canary",
              publishedAt: "2026-08-31T00:00:00.000Z",
            },
          },
        },
      }),
    ).toThrow("must be newer than the currently published");
  });

  it("does not allow a prerelease to replace a prerelease in the stable channel", () => {
    // Locks the actualIsStableRelease condition: stable channels must never
    // carry prerelease versions, in either direction.
    expect(() =>
      validateDesktopUpdateMetadata({
        channel: "stable",
        platform: "windows",
        expectedVersion: "0.36.1-alpha.1",
        buildSha: "new",
        updateJson: {
          version: "0.36.1-alpha.1",
          hash: "abc",
        },
        existingManifest: {
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-08-31T00:00:00.000Z",
          artifacts: {
            windows: {
              url: "/public/downloads/stable-win-x64-NoloDesktop-Setup.exe",
              size: 123,
              version: "0.53.0-alpha.1",
              buildSha: "polluted",
              publishedAt: "2026-08-31T00:00:00.000Z",
            },
          },
        },
      }),
    ).toThrow("must be newer than the currently published");
  });

  it("allows rerunning a stable publish for the same version and build sha", () => {
    expect(() =>
      validateDesktopUpdateMetadata({
        channel: "stable",
        platform: "windows",
        expectedVersion: "0.1.14",
        buildSha: "same-build",
        updateJson: {
          version: "0.1.14",
          hash: "abc",
        },
        existingManifest: {
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-06-03T18:27:19.000Z",
          artifacts: {
            windows: {
              url: "/public/downloads/stable-win-x64-NoloDesktop-Setup.exe",
              size: 123,
              version: "0.1.14",
              buildSha: "same-build",
              publishedAt: "2026-06-03T18:27:19.000Z",
            },
          },
        },
      }),
    ).not.toThrow();
  });

  it("ignores previous manifest versions from another desktop channel", () => {
    expect(() =>
      validateDesktopUpdateMetadata({
        channel: "stable",
        platform: "windows",
        expectedVersion: "0.1.12",
        updateJson: {
          version: "0.1.12",
          hash: "abc",
        },
        existingManifest: {
          schemaVersion: 1,
          channel: "alpha",
          updatedAt: "2026-06-03T00:00:00.000Z",
          artifacts: {
            windows: {
              url: "/public/downloads/canary-win-x64-NoloDesktop-Setup-canary.exe",
              size: 123,
              version: "0.1.12",
              buildSha: "alpha-build",
              publishedAt: "2026-06-03T00:00:00.000Z",
            },
          },
        },
      }),
    ).not.toThrow();
  });

  it("rejects built update metadata when update.json version does not match the release version", () => {
    expect(() =>
      validateDesktopUpdateMetadata({
        channel: "stable",
        platform: "macos",
        expectedVersion: "0.1.6",
        updateJson: {
          version: "0.1.5",
          hash: "abc",
        },
        existingManifest: null,
      }),
    ).toThrow("does not match expected desktop version");
  });

  it("allows a recovery release when the previous manifest lacks version metadata", () => {
    expect(() =>
      validateDesktopUpdateMetadata({
        channel: "stable",
        platform: "macos",
        expectedVersion: "0.1.6",
        updateJson: {
          version: "0.1.6",
          hash: "abc",
        },
        existingManifest: {
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-05-16T10:59:22.024Z",
          artifacts: {
            macos: {
              url: "/public/downloads/stable-macos-arm64-NoloDesktop.dmg",
              size: 123,
              buildSha: "migration-20260516",
              publishedAt: "2026-05-16T10:59:22.024Z",
            },
          },
        },
      }),
    ).not.toThrow();
  });

  describe("createDesktopReleaseArtifact", () => {
    it("populates updateMeta when updateJsonSourcePath is provided", async () => {
      const artifactDir = await mkdtemp(join(tmpdir(), "nolo-artifact-meta-"));
      const primaryPath = join(artifactDir, "canary-win-x64-NoloDesktop-Setup-canary.exe");
      const updateJsonPath = join(artifactDir, "canary-win-x64-update.json");
      await writeFile(primaryPath, "x".repeat(60000000));
      await writeFile(
        updateJsonPath,
        JSON.stringify({ version: "0.2.0", hash: "abc123" }),
      );

      const artifact = await createDesktopReleaseArtifact({
        sourcePath: primaryPath,
        uploadName: "canary-win-x64-NoloDesktop-Setup-canary.exe",
        publicBase: "https://pub.example.com/downloads",
        version: "0.2.0",
        buildSha: "abc123",
        publishedAt: "2026-06-05T00:00:00.000Z",
        updateJsonSourcePath: updateJsonPath,
        updateJsonUploadName: "canary-win-x64-update.json",
      });

      expect(artifact.updateMeta).toBeDefined();
      expect(artifact.updateMeta?.url).toBe(
        "https://pub.example.com/downloads/canary-win-x64-update.json",
      );
      expect(artifact.updateMeta?.version).toBe("0.2.0");
      expect(artifact.updateMeta?.hash).toBe("abc123");
      expect(artifact.updateMeta?.size).toBe(Bun.file(updateJsonPath).size);
      expect(typeof artifact.updateMeta?.sha256).toBe("string");
      expect(artifact.updateMeta?.sha256).toHaveLength(64);
    });

    it("omits updateMeta when updateJsonSourcePath is not provided", async () => {
      const artifactDir = await mkdtemp(join(tmpdir(), "nolo-artifact-no-meta-"));
      const primaryPath = join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe");
      await writeFile(primaryPath, "x".repeat(60000000));

      const artifact = await createDesktopReleaseArtifact({
        sourcePath: primaryPath,
        uploadName: "stable-win-x64-NoloDesktop-Setup.exe",
        publicBase: "https://pub.example.com/downloads",
        version: "0.1.5",
        publishedAt: "2026-06-05T00:00:00.000Z",
      });

      expect(artifact.updateMeta).toBeUndefined();
    });
  });

  describe("verifyPublishedTripleConsistency", () => {
    it("passes when published update.json matches local", async () => {
      const artifactDir = await mkdtemp(join(tmpdir(), "nolo-triple-pass-"));
      const updateJsonPath = join(artifactDir, "canary-win-x64-update.json");
      await writeFile(
        updateJsonPath,
        JSON.stringify({ version: "0.2.0", hash: "build-sha-42" }),
      );

      const mockFetch = async (url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
        if (urlStr.includes("canary-win-x64-update.json")) {
          return Response.json({ version: "0.2.0", hash: "build-sha-42" });
        }
        return new Response("not found", { status: 404 });
      };

      const result = await verifyPublishedTripleConsistency({
        platform: "windows",
        publicBase: "https://pub.example.com/downloads",
        updateJsonUploadName: "canary-win-x64-update.json",
        updateJsonSourcePath: updateJsonPath,
        manifestArtifactVersion: "0.2.0",
        fetchFn: mockFetch,
      });

      expect(result.versionMatch).toBe(true);
      expect(result.hashMatch).toBe(true);
      expect(result.manifestVersionMatch).toBe(true);
      expect(() => assertTripleConsistency(result)).not.toThrow();
    });

    it("detects published update.json version mismatch", async () => {
      const artifactDir = await mkdtemp(join(tmpdir(), "nolo-triple-ver-fail-"));
      const updateJsonPath = join(artifactDir, "stable-win-x64-update.json");
      await writeFile(
        updateJsonPath,
        JSON.stringify({ version: "0.2.0", hash: "build-sha" }),
      );

      const mockFetch = async () =>
        Response.json({ version: "0.1.9", hash: "build-sha" });

      const result = await verifyPublishedTripleConsistency({
        platform: "windows",
        publicBase: "https://pub.example.com/downloads",
        updateJsonUploadName: "stable-win-x64-update.json",
        updateJsonSourcePath: updateJsonPath,
        manifestArtifactVersion: "0.1.9",
        fetchFn: mockFetch,
      });

      expect(result.versionMatch).toBe(false);
      expect(() => assertTripleConsistency(result)).toThrow(
        "update.json version mismatch: published 0.1.9 vs local 0.2.0",
      );
    });

    it("detects published update.json hash mismatch", async () => {
      const artifactDir = await mkdtemp(join(tmpdir(), "nolo-triple-hash-fail-"));
      const updateJsonPath = join(artifactDir, "stable-win-x64-update.json");
      await writeFile(
        updateJsonPath,
        JSON.stringify({ version: "0.2.0", hash: "local-hash" }),
      );

      const mockFetch = async () =>
        Response.json({ version: "0.2.0", hash: "corrupted-hash" });

      const result = await verifyPublishedTripleConsistency({
        platform: "windows",
        publicBase: "https://pub.example.com/downloads",
        updateJsonUploadName: "stable-win-x64-update.json",
        updateJsonSourcePath: updateJsonPath,
        manifestArtifactVersion: "0.2.0",
        fetchFn: mockFetch,
      });

      expect(result.hashMatch).toBe(false);
      expect(() => assertTripleConsistency(result)).toThrow(
        "update.json hash mismatch: published corrupted-hash vs local local-hash",
      );
    });

    it("detects manifest version does not match update.json version", async () => {
      const artifactDir = await mkdtemp(join(tmpdir(), "nolo-triple-manifest-fail-"));
      const updateJsonPath = join(artifactDir, "canary-win-x64-update.json");
      await writeFile(
        updateJsonPath,
        JSON.stringify({ version: "0.2.0", hash: "build-sha" }),
      );

      const mockFetch = async () =>
        Response.json({ version: "0.2.0", hash: "build-sha" });

      const result = await verifyPublishedTripleConsistency({
        platform: "windows",
        publicBase: "https://pub.example.com/downloads",
        updateJsonUploadName: "canary-win-x64-update.json",
        updateJsonSourcePath: updateJsonPath,
        manifestArtifactVersion: "0.1.8",
        fetchFn: mockFetch,
      });

      expect(result.manifestVersionMatch).toBe(false);
      expect(() => assertTripleConsistency(result)).toThrow(
        "manifest version 0.1.8 does not match update.json version 0.2.0",
      );
    });

    it("rejects empty local update metadata before comparing published values", async () => {
      const result: DesktopTripleConsistencyResult = {
        platform: "windows",
        updateJsonUrl: "https://pub.example.com/downloads/stable-win-x64-update.json",
        publishedVersion: "0.2.0",
        publishedHash: "build-sha",
        localVersion: "",
        localHash: "build-sha",
        manifestVersion: "0.2.0",
        versionMatch: false,
        hashMatch: true,
        manifestVersionMatch: true,
      };

      expect(() => assertTripleConsistency(result)).toThrow(
        "update.json version is missing",
      );
    });

    it("rejects missing manifest version in triple consistency checks", async () => {
      const result: DesktopTripleConsistencyResult = {
        platform: "windows",
        updateJsonUrl: "https://pub.example.com/downloads/stable-win-x64-update.json",
        publishedVersion: "0.2.0",
        publishedHash: "build-sha",
        localVersion: "0.2.0",
        localHash: "build-sha",
        manifestVersion: undefined,
        versionMatch: true,
        hashMatch: true,
        manifestVersionMatch: true,
      };

      expect(() => assertTripleConsistency(result)).toThrow("manifest version is missing");
    });
  });

  describe("normalizeDesktopReleaseManifest with updateMeta", () => {
    it("preserves updateMeta from normalized manifest JSON", () => {
      const raw = {
        schemaVersion: 1,
        channel: "alpha",
        updatedAt: "2026-06-05T00:00:00.000Z",
        artifacts: {
          windows: {
            url: "https://pub.example.com/downloads/canary-win-x64-NoloDesktop-Setup-canary.exe",
            size: 60000000,
            sha256: "abc123",
            version: "0.2.0",
            buildSha: "commit-sha",
            publishedAt: "2026-06-05T00:00:00.000Z",
            updateMeta: {
              url: "https://pub.example.com/downloads/canary-win-x64-update.json",
              sha256: "def456",
              size: 120,
              version: "0.2.0",
              hash: "commit-sha",
            },
          },
        },
      };

      const manifest = normalizeDesktopReleaseManifest(raw);
      expect(manifest).not.toBeNull();
      expect(manifest?.artifacts.windows?.updateMeta).toEqual({
        url: "https://pub.example.com/downloads/canary-win-x64-update.json",
        sha256: "def456",
        size: 120,
        version: "0.2.0",
        hash: "commit-sha",
      });
    });

    it("omits updateMeta when absent in raw JSON", () => {
      const raw = {
        schemaVersion: 1,
        channel: "stable",
        updatedAt: "2026-06-05T00:00:00.000Z",
        artifacts: {
          windows: {
            url: "https://pub.example.com/downloads/stable-win-x64-NoloDesktop-Setup.exe",
            size: 60000000,
            version: "0.1.5",
          },
        },
      };

      const manifest = normalizeDesktopReleaseManifest(raw);
      expect(manifest?.artifacts.windows?.updateMeta).toBeUndefined();
    });

    it("discards malformed updateMeta with missing fields", () => {
      const raw = {
        schemaVersion: 1,
        channel: "alpha",
        updatedAt: "2026-06-05T00:00:00.000Z",
        artifacts: {
          windows: {
            url: "https://pub.example.com/downloads/canary-win-x64-NoloDesktop-Setup-canary.exe",
            size: 60000000,
            updateMeta: {
              url: "https://pub.example.com/downloads/canary-win-x64-update.json",
              sha256: "def456",
              // missing size, version, hash
            },
          },
        },
      };

      const manifest = normalizeDesktopReleaseManifest(raw);
      expect(manifest?.artifacts.windows?.updateMeta).toBeUndefined();
    });
  });

  describe("requireLinuxPackages option", () => {
    it("passes when requireLinuxPackages is true and both rpm and deb artifacts exist for linux", async () => {
      const artifactDir = await mkdtemp(join(tmpdir(), "nolo-linux-pkg-pass-"));
      await writeFile(join(artifactDir, "stable-linux-x64-NoloDesktop.tar.zst"), "fake linux tarball");
      await writeFile(join(artifactDir, "nolo-desktop_0.1.0_amd64.deb"), "fake deb");
      await writeFile(join(artifactDir, "nolo-desktop-0.1.0.x86_64.rpm"), "fake rpm");

      const targets = await resolveDesktopPublishTargets({
        channel: "stable",
        artifactDir,
        platforms: ["linux"],
        requireLinuxPackages: true,
      });

      expect(targets.primary).toHaveLength(1);
      expect(targets.optional).toHaveLength(2);
    });

    it("rejects when requireLinuxPackages is true and linux deb artifact is missing", async () => {
      const artifactDir = await mkdtemp(join(tmpdir(), "nolo-linux-deb-missing-"));
      await writeFile(join(artifactDir, "stable-linux-x64-NoloDesktop.tar.zst"), "fake linux tarball");
      await writeFile(join(artifactDir, "nolo-desktop-0.1.0.x86_64.rpm"), "fake rpm");

      await expect(
        resolveDesktopPublishTargets({
          channel: "stable",
          artifactDir,
          platforms: ["linux"],
          requireLinuxPackages: true,
        }),
      ).rejects.toThrow("Missing required Linux DEB artifact");
    });

    it("rejects when requireLinuxPackages is true and linux rpm artifact is missing", async () => {
      const artifactDir = await mkdtemp(join(tmpdir(), "nolo-linux-rpm-missing-"));
      await writeFile(join(artifactDir, "stable-linux-x64-NoloDesktop.tar.zst"), "fake linux tarball");
      await writeFile(join(artifactDir, "nolo-desktop_0.1.0_amd64.deb"), "fake deb");

      await expect(
        resolveDesktopPublishTargets({
          channel: "stable",
          artifactDir,
          platforms: ["linux"],
          requireLinuxPackages: true,
        }),
      ).rejects.toThrow("Missing required Linux RPM artifact");
    });

    it("does not enforce linux package requirement when building for non-linux platform", async () => {
      const artifactDir = await mkdtemp(join(tmpdir(), "nolo-win-pkg-skip-"));
      await writeFile(
        join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"),
        "fake windows installer",
      );

      const targets = await resolveDesktopPublishTargets({
        channel: "stable",
        artifactDir,
        platforms: ["windows"],
        requireLinuxPackages: true,
      });

      expect(targets.primary).toHaveLength(1);
      expect(targets.primary[0].platform).toBe("windows");
    });
  });
});
