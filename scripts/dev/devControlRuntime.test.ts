import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDevControlRuntime } from "./devControlRuntime";

describe("devControlRuntime", () => {
  test("describes a single backend origin", () => {
    const runtime = createDevControlRuntime({
      repoRoot: "C:\\repo",
      env: {
        HTTP_PORT: "38223",
      },
    });

    const summary = runtime.describe();
    expect(summary).toEqual({
      repoRoot: "C:\\repo",
      logDir: "C:\\repo\\logs\\dev-control",
      apiOrigin: "http://127.0.0.1:38223",
      serverDbPath: "data/leveldb",
    });
  });

  test("does not emit core proxy fields", () => {
    const runtime = createDevControlRuntime({
      repoRoot: "C:\\repo",
    });

    const summary = runtime.describe();
    expect(summary).not.toHaveProperty("coreBaseUrl");
    expect(summary).not.toHaveProperty("coreOwnerAutoStart");
    expect(runtime.describeProcess("api").env).not.toHaveProperty("NOLO_SERVER_CORE_BASE_URL");
  });

  test("uses a complete resolved runtime env without second-guessing", () => {
    const runtime = createDevControlRuntime({
      repoRoot: "C:\\repo",
      env: {
        HTTP_PORT: "38323",
        NOLO_SERVER_DB_PATH: "C:\\repo\\data\\leveldb",
        NOLO_SLOT_LABEL: "[slot:preview-agent-a preview:c api:38323]",
        PREVIEW_SLUG: "preview-agent-a",
        PREVIEW_SLOT: "c",
        PREVIEW_HOST: "alpha-c.nolo.chat",
        PREVIEW_HTTP_PORT: "38323",
      },
    });

    expect(runtime.describe()).toMatchObject({
      apiOrigin: "http://127.0.0.1:38323",
      serverDbPath: "C:\\repo\\data\\leveldb",
    });
    expect(runtime.describeProcess("api").env).not.toHaveProperty("NOLO_SERVER_CORE_BASE_URL");
  });

  test("passes the hosted exec alpha switch through to the api process", () => {
    const runtime = createDevControlRuntime({
      repoRoot: "C:\\repo",
      env: {
        NOLO_WEB_HOSTED_EXEC_RUNTIME: "1",
      },
    });

    expect(runtime.describeProcess("api").env.NOLO_WEB_HOSTED_EXEC_RUNTIME).toBe("1");
  });

  test("configures the api process without a slot argument", () => {
    const repoRoot = process.cwd();
    const runtime = createDevControlRuntime({
      repoRoot,
      env: {
        HTTP_PORT: "38491",
        DEV_STABILITY_MS: "1",
      },
    });

    expect(runtime.describeProcess("api")).toEqual({
      command: [process.execPath || "bun", "--conditions=nolo-cloud", "./packages/server/entry.ts"],
      cwd: repoRoot,
      env: {
        HTTP_PORT: "38491",
        NOLO_SERVER_DB_PATH: "data/leveldb",
        NOLO_SLOT_LABEL: "[local-dev api:38123]",
        NOLO_OAUTH_DEV_PLAINTEXT: "1",
        PREVIEW_SLUG: "main",
        APP_QUERY_DEBUG: "1",
      },
    });
  });

  test("ignores stale pid files when the process command does not match the launch config", async () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), "nolo-dev-control-runtime-"));
    mkdirSync(path.join(repoRoot, "logs", "dev-control"), { recursive: true });
    writeFileSync(path.join(repoRoot, "logs", "dev-control", "api.pid"), `${process.pid}\n`);
    const runtime = createDevControlRuntime({
      repoRoot,
      env: {
        HTTP_PORT: "38491",
      },
    });

    try {
      const status = await runtime.collectStatus();

      expect(status.find((item) => item.key === "api")).toMatchObject({
        pid: null,
        origin: "http://127.0.0.1:38491",
        running: false,
        ready: false,
      });
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test("does not delete live pid command metadata for a different launch config", async () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), "nolo-dev-control-runtime-"));
    const logDir = path.join(repoRoot, "logs", "dev-control");
    const pidFile = path.join(logDir, "api.pid");
    const commandFile = path.join(logDir, "api.command");
    mkdirSync(logDir, { recursive: true });
    writeFileSync(pidFile, `${process.pid}\n`);
    writeFileSync(commandFile, "other-launch-config", "utf8");
    const runtime = createDevControlRuntime({
      repoRoot,
      env: {
        HTTP_PORT: "38491",
      },
    });

    try {
      const status = await runtime.collectStatus();

      expect(status.find((item) => item.key === "api")).toMatchObject({
        pid: null,
        origin: "http://127.0.0.1:38491",
        running: false,
        ready: false,
      });
      expect(readFileSync(pidFile, "utf8")).toBe(`${process.pid}\n`);
      expect(readFileSync(commandFile, "utf8")).toBe("other-launch-config");
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test("marks the api as old code when launch source stamp differs from current source stamp", async () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), "nolo-dev-control-runtime-"));
    const logDir = path.join(repoRoot, "logs", "dev-control");
    const pidFile = path.join(logDir, "api.pid");
    const commandFile = path.join(logDir, "api.command");
    const stampFile = path.join(logDir, "api.source-stamp");
    mkdirSync(logDir, { recursive: true });
    mkdirSync(path.join(repoRoot, "packages", "server"), { recursive: true });
    writeFileSync(path.join(repoRoot, "packages", "server", "entry.ts"), "console.log('new')\n");
    writeFileSync(pidFile, `${process.pid}\n`);
    writeFileSync(stampFile, "1\n", "utf8");
    const runtime = createDevControlRuntime({
      repoRoot,
      env: {
        HTTP_PORT: "38491",
      },
    });
    writeFileSync(
      commandFile,
      `${runtime.describeProcess("api").command.slice(1).join(" ")}\n`,
      "utf8",
    );

    try {
      const status = await runtime.collectStatus();

      expect(status.find((item) => item.key === "api")).toMatchObject({
        running: true,
        isOldCode: true,
      });
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test("marks a running api without launch source stamp as old code", async () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), "nolo-dev-control-runtime-"));
    const logDir = path.join(repoRoot, "logs", "dev-control");
    const pidFile = path.join(logDir, "api.pid");
    const commandFile = path.join(logDir, "api.command");
    mkdirSync(logDir, { recursive: true });
    mkdirSync(path.join(repoRoot, "packages", "server"), { recursive: true });
    writeFileSync(path.join(repoRoot, "packages", "server", "entry.ts"), "console.log('new')\n");
    writeFileSync(pidFile, `${process.pid}\n`);
    const runtime = createDevControlRuntime({
      repoRoot,
      env: {
        HTTP_PORT: "38491",
      },
    });
    writeFileSync(
      commandFile,
      `${runtime.describeProcess("api").command.slice(1).join(" ")}\n`,
      "utf8",
    );

    try {
      const status = await runtime.collectStatus();

      expect(status.find((item) => item.key === "api")).toMatchObject({
        running: true,
        isOldCode: true,
      });
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
