import { describe, expect, test } from "bun:test";

import { resolveRuntimeConfig, toRuntimeEnv } from "./runtimeConfig";

describe("runtimeConfig", () => {
  test("resolves a core owner runtime with the shared db and no core proxy", () => {
    const config = resolveRuntimeConfig({
      mode: "core-owner",
      workspacePath: "C:\\repo",
      branch: "alpha",
    });

    expect(config).toMatchObject({
      mode: "core-owner",
      workspacePath: "C:\\repo",
      branch: "alpha",
      previewSlug: "main",
      serverDbPath: "data/leveldb",
      coreBaseUrl: null,
    });
    expect(config.httpPort).toBeGreaterThanOrEqual(38123);
  });

  test("resolves an overlay preview without guessing a core proxy", () => {
    const config = resolveRuntimeConfig({
      mode: "overlay-preview",
      workspacePath: "C:\\repo\\.worktrees\\ui-task",
      branch: "feat/ui-task",
      previewSlot: {
        slotSlug: "c",
        host: "alpha-c.nolo.chat",
        httpPort: 38323,
      },
    });

    expect(config).toMatchObject({
      mode: "overlay-preview",
      workspacePath: "C:\\repo\\.worktrees\\ui-task",
      branch: "feat/ui-task",
      previewSlug: "main",
      httpPort: 38323,
      serverDbPath: "data/leveldb",
      coreBaseUrl: null,
      previewSlot: {
        slotSlug: "c",
        host: "alpha-c.nolo.chat",
        httpPort: 38323,
      },
    });
  });

  test("resolves a shared-data preview with null coreBaseUrl (single-instance)", () => {
    const config = resolveRuntimeConfig({
      mode: "shared-data-preview",
      workspacePath: "C:\\repo\\.worktrees\\ui-task",
      branch: "feat/ui-task",
    });

    expect(config.coreBaseUrl).toBeNull();
  });

  test("converts resolved config to process env without second-guessing mode", () => {
    const config = resolveRuntimeConfig({
      mode: "overlay-preview",
      workspacePath: "C:\\repo\\.worktrees\\ui-task",
      branch: "feat/ui-task",
      previewSlot: {
        slotSlug: "c",
        host: "alpha-c.nolo.chat",
        httpPort: 38323,
      },
    });

    expect(toRuntimeEnv(config)).toEqual({
      HTTP_PORT: "38323",
      NOLO_SERVER_DB_PATH: "data/leveldb",
      NOLO_SLOT_LABEL: "[slot:main preview:c api:38323]",
      PREVIEW_SLUG: "main",
      PREVIEW_SLOT: "c",
      PREVIEW_HOST: "alpha-c.nolo.chat",
      PREVIEW_HTTP_PORT: "38323",
    });
  });
});
