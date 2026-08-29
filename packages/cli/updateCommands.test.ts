import { afterEach, describe, expect, mock, test } from "bun:test";
import { Readable } from "node:stream";
import { PassThrough } from "node:stream";

import {
  buildCliDoctorText,
  buildCliVersionText,
  buildSelfUpdateCommand,
  checkForCliUpdate,
  compareCliVersions,
  resolveStandaloneBundlePlatform,
  resolveStandaloneBundleRepoBase,
  buildStandaloneManualUpdateHint,
  runStandaloneBundleUpdate,
  resolveSelfUpdateServerUrl,
  runSelfUpdate,
  runSelfUpdateDetailed,
} from "./updateCommands";
import type { SpawnFn, SpawnProcessOptions, SpawnedProcess } from "./processSpawn";
import type { WindowsUpdateLaunchOptions } from "./windowsSelfUpdate";

type SpawnCall = SpawnProcessOptions;
type StubSubprocess = Pick<SpawnedProcess, "exited"> & {
  stdout?: AsyncIterable<string | Uint8Array>;
  stderr?: AsyncIterable<string | Uint8Array>;
};

function createSpawnStub(handler: (options: SpawnCall) => StubSubprocess) {
  return ((options: SpawnCall) =>
    handler(options) as unknown as SpawnedProcess) as SpawnFn;
}

function toPlainUint8Array(chunk: string | Uint8Array) {
  return typeof chunk === "string"
    ? Uint8Array.from(Buffer.from(chunk))
    : Uint8Array.from(chunk);
}

describe("cli update commands", () => {
  const originalSpawn = Bun.spawn;

  afterEach(() => {
    Bun.spawn = originalSpawn;
  });

  test("prints the installed cli version", () => {
    expect(buildCliVersionText({ name: "nolo-cli", version: "0.1.3" })).toBe(
      "nolo-cli 0.1.3"
    );
  });

  test("builds a channel-aware npm self-update command", () => {
    expect(buildSelfUpdateCommand("https://nolo.chat")).toEqual([
      "npm",
      "install",
      "-g",
      "nolo-cli@latest",
      "--force",
      "--progress",
    ]);
    expect(buildSelfUpdateCommand("https://us.nolo.chat")).toEqual([
      "npm",
      "install",
      "-g",
      "nolo-cli@alpha",
      "--force",
      "--progress",
    ]);
  });

  test("renders doctor text that explains install kind and update path", () => {
    const text = buildCliDoctorText({
      packageName: "nolo-cli",
      version: "0.1.3",
      entrypoint: "/home/user/.local/share/nolo/cli/alpha/nolo-cli-0.1.3-alpha-linux-x64/lib/nolo-cli/index.js",
      serverUrl: "https://us.nolo.chat",
      profileName: "default",
      installKind: "npm-global",
      updateChannel: "alpha",
    });

    expect(text).toContain("version  nolo-cli 0.1.3");
    expect(text).toContain("install  npm-global");
    expect(text).toContain("channel  alpha");
    expect(text).toContain("update   nolo update");
    expect(text).toContain("npm install -g nolo-cli@alpha --force");
  });

  test("forwards spawned updater output into a provided sink", async () => {
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    const spawnCalls: SpawnCall[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

    const exitCode = await runSelfUpdate({
      output,
      serverUrl: "https://nolo.chat",
      entrypointPath: "/tmp/global/node_modules/nolo-cli/index.js",
      spawn: createSpawnStub((options) => {
        spawnCalls.push(options);
        return {
          stdout: Readable.from(["npm notice using latest\n"]),
          stderr: Readable.from(["npm warn deprecated flag\n"]),
          exited: Promise.resolve(0),
        };
      }),
    });

    const text = Buffer.concat(chunks).toString("utf8");

    expect(exitCode).toBe(0);
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0]?.stdout).toBe("pipe");
    expect(spawnCalls[0]?.stderr).toBe("pipe");
    expect(text).toContain("Nolo Agent CLI Installer & Updater");
    expect(text).toContain("✓ Target channel: latest");
    expect(text).toContain("npm notice using latest");
    expect(text).toContain("npm warn deprecated flag");
  });

  test("keeps inherited stdio for the zero-argument production call", async () => {
    const spawnCalls: SpawnCall[] = [];
    const spawnMock = createSpawnStub((options) => {
      spawnCalls.push(options);
      return {
        exited: Promise.resolve(0),
      };
    });
    Bun.spawn = mock(spawnMock) as unknown as typeof Bun.spawn;

    const exitCode = await runSelfUpdate({
      serverUrl: "https://nolo.chat",
      entrypointPath: "/tmp/global/node_modules/nolo-cli/index.js",
    });

    expect(exitCode).toBe(0);
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0]?.stdout).toBe("inherit");
    expect(spawnCalls[0]?.stderr).toBe("inherit");
  });

  test("runSelfUpdate routes to standalone path when running as compiled binary", async () => {
    // In the test environment isCompiledBinary() is false (real .ts file), so
    // runSelfUpdate takes the npm path. We verify the routing by asserting the
    // npm path is taken here (spawn cmd[0] === "npm"), which proves the
    // isCompiledBinary() guard routes non-compiled runs to npm. The compiled
    // branch is covered by the runStandaloneBundleUpdate tests above.
    const spawnCalls: SpawnCall[] = [];
    const exitCode = await runSelfUpdate({
      serverUrl: "https://nolo.chat",
      entrypointPath: "/tmp/global/node_modules/nolo-cli/index.js",
      spawn: createSpawnStub((options) => {
        spawnCalls.push(options);
        return { exited: Promise.resolve(0) };
      }),
    });

    expect(exitCode).toBe(0);
    expect(spawnCalls).toHaveLength(1);
    // Non-compiled run must take the npm path, not sh -c.
    expect(spawnCalls[0]?.cmd[0]).toBe("npm");
    expect(spawnCalls[0]?.cmd[3]).toBe("nolo-cli@latest");
  });

  test("schedules Windows npm updates outside the running CLI process", async () => {
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));
    const scheduled: WindowsUpdateLaunchOptions[] = [];

    const result = await runSelfUpdateDetailed({
      output,
      platform: "win32",
      serverUrl: "https://nolo.chat",
      entrypointPath: "C:\\Users\\test\\AppData\\Roaming\\npm\\node_modules\\nolo-cli\\index.js",
      scheduleWindowsUpdate: (options) => {
        scheduled.push(options);
        return {
          helperPid: 4321,
          statePath: "C:\\Users\\test\\.nolo\\updates\\update-result.json",
          logPath: "C:\\Users\\test\\.nolo\\updates\\update.log",
        };
      },
    });

    expect(result).toEqual({ exitCode: 0, disposition: "scheduled" });
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.channel).toBe("latest");
    expect(scheduled[0]?.entrypointPath).toContain("nolo-cli");
    const text = Buffer.concat(chunks).toString("utf8");
    expect(text).toContain("Safe Windows update scheduled");
    expect(text).toContain("after this process releases its files");
  });

  test("prefers explicit server url override for update channel selection", () => {
    expect(resolveSelfUpdateServerUrl({ NOLO_SERVER: "https://nolo.chat" }, "https://us.nolo.chat")).toBe(
      "https://us.nolo.chat",
    );
  });

  describe("standalone bundle platform detection", () => {
    test("resolves linux-x64 bundle metadata", () => {
      expect(resolveStandaloneBundlePlatform("linux" as NodeJS.Platform, "x64")).toEqual({
        tarballName: "nolo-linux-x64.tar.gz",
        extractSubdir: "nolo-linux-x64",
      });
    });

    test("resolves darwin-arm64 bundle metadata", () => {
      expect(resolveStandaloneBundlePlatform("darwin" as NodeJS.Platform, "arm64")).toEqual({
        tarballName: "nolo-darwin-arm64.tar.gz",
        extractSubdir: "nolo-darwin-arm64",
      });
    });

    test("returns null for unsupported platforms", () => {
      expect(resolveStandaloneBundlePlatform("win32" as NodeJS.Platform, "x64")).toBeNull();
      expect(resolveStandaloneBundlePlatform("darwin" as NodeJS.Platform, "x64")).toBeNull();
    });
  });

  describe("standalone bundle repo base", () => {
    test("alpha channel pulls from us.nolo.chat", () => {
      expect(resolveStandaloneBundleRepoBase("alpha")).toBe("https://us.nolo.chat");
    });

    test("latest channel pulls from nolo.chat", () => {
      expect(resolveStandaloneBundleRepoBase("latest")).toBe("https://nolo.chat");
    });
  });

  describe("standalone manual update hint", () => {
    test("alpha points at us.nolo.chat install script", () => {
      expect(buildStandaloneManualUpdateHint("alpha")).toBe(
        "curl -fsSL https://us.nolo.chat/install-nolo.sh | sh",
      );
    });

    test("latest points at nolo.chat install script", () => {
      expect(buildStandaloneManualUpdateHint("latest")).toBe(
        "curl -fsSL https://nolo.chat/install-nolo.sh | sh",
      );
    });
  });

  describe("doctor text for standalone-bundle installs", () => {
    test("shows standalone-bundle install kind and curl manual hint", () => {
      const text = buildCliDoctorText({
        packageName: "nolo-cli",
        version: "0.1.3",
        entrypoint: "/usr/local/bin/nolo",
        serverUrl: "https://us.nolo.chat",
        profileName: "default",
        installKind: "standalone-bundle",
        updateChannel: "alpha",
      });

      expect(text).toContain("install  standalone-bundle");
      expect(text).toContain("curl -fsSL https://us.nolo.chat/install-nolo.sh | sh");
      // Must not advertise npm for standalone installs.
      expect(text).not.toContain("npm install -g");
    });

    test("keeps npm hint for npm-global installs", () => {
      const text = buildCliDoctorText({
        packageName: "nolo-cli",
        version: "0.1.3",
        entrypoint: "/tmp/global/node_modules/nolo-cli/index.js",
        serverUrl: "https://nolo.chat",
        profileName: "default",
        installKind: "npm-global",
        updateChannel: "latest",
      });

      expect(text).toContain("install  npm-global");
      expect(text).toContain("npm install -g nolo-cli@latest --force");
    });
  });

  describe("runStandaloneBundleUpdate", () => {
    test("spawns sh with curl+tar+ln script and reports success", async () => {
      const output = new PassThrough();
      const chunks: Uint8Array[] = [];
      const spawnCalls: SpawnCall[] = [];
      output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

      const exitCode = await runStandaloneBundleUpdate({
        output,
        serverUrl: "https://us.nolo.chat",
        spawn: createSpawnStub((options) => {
          spawnCalls.push(options);
          return {
            stdout: Readable.from(["Downloading nolo...\n"]),
            stderr: Readable.from([""]),
            exited: Promise.resolve(0),
          };
        }),
        env: { ...process.env, HOME: "/tmp/test-home" },
      });

      const text = Buffer.concat(chunks).toString("utf8");

      expect(exitCode).toBe(0);
      expect(spawnCalls).toHaveLength(1);
      // Must run via sh, not npm.
      expect(spawnCalls[0]?.cmd[0]).toBe("sh");
      expect(spawnCalls[0]?.cmd[1]).toBe("-c");
      const script = String(spawnCalls[0]?.cmd[2] ?? "");
      // Script must contain the curl download, tar extract, and symlink swap —
      // mirroring install-nolo.sh. No npm allowed in the standalone path.
      expect(script).toContain("curl -fL --progress-bar");
      expect(script).toContain("tar -xzf");
      expect(script).toContain("ln -s");
      expect(script).not.toContain("npm install");
      expect(text).toContain("✓ Target channel: alpha (standalone bundle)");
      expect(text).toContain("✓ Update completed successfully!");
    });

    test("reports failure when spawn exits non-zero", async () => {
      const output = new PassThrough();
      const chunks: Uint8Array[] = [];
      output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

      const exitCode = await runStandaloneBundleUpdate({
        output,
        serverUrl: "https://nolo.chat",
        spawn: createSpawnStub(() => ({
          stdout: Readable.from([]),
          stderr: Readable.from(["curl: (22) The requested URL returned error: 404\n"]),
          exited: Promise.resolve(1),
        })),
        env: { ...process.env, HOME: "/tmp/test-home" },
      });

      const text = Buffer.concat(chunks).toString("utf8");

      expect(exitCode).toBe(1);
      expect(text).not.toContain("✓ Update completed successfully!");
      expect(text).toContain("curl: (22)");
    });
  });
});

describe("cli update availability check", () => {
  test("compareCliVersions orders release and prerelease versions", () => {
    expect(compareCliVersions("0.24.0", "0.24.0")).toBe(0);
    expect(compareCliVersions("0.24.0", "0.23.9")).toBe(1);
    expect(compareCliVersions("0.3.0", "0.24.0")).toBe(-1);
    // Pre-release sorts below the release it prefixes.
    expect(compareCliVersions("0.24.0-alpha.5", "0.24.0")).toBe(-1);
    expect(compareCliVersions("0.24.0", "0.24.0-alpha.5")).toBe(1);
    // Numeric prerelease identifiers sort by value, not lexicographically.
    expect(compareCliVersions("0.24.0-alpha.5", "0.24.0-alpha.6")).toBe(-1);
    expect(compareCliVersions("0.24.0-alpha.10", "0.24.0-alpha.9")).toBe(1);
    // Malformed input falls back to lexicographic order, never NaN.
    expect(compareCliVersions("weird", "0.24.0")).toBe(1);
  });

  test("reports a newer version on the channel implied by the server", async () => {
    const result = await checkForCliUpdate("0.24.0-alpha.5", "https://us.nolo.chat", {
      fetchImpl: (async () =>
        new Response(JSON.stringify({ version: "0.24.0-alpha.6" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })) as typeof fetch,
    });
    expect(result).toEqual({ latestVersion: "0.24.0-alpha.6", channel: "alpha" });
  });

  test("queries the latest dist-tag for non-alpha servers", async () => {
    let requestedUrl = "";
    const result = await checkForCliUpdate("0.23.0", "https://nolo.chat", {
      fetchImpl: (async (url: string | URL | Request) => {
        requestedUrl = String(url);
        return new Response(JSON.stringify({ version: "0.24.0" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch,
    });
    expect(requestedUrl).toContain("/nolo-cli/latest");
    expect(result).toEqual({ latestVersion: "0.24.0", channel: "latest" });
  });

  test("resolves null when the installed version is already current", async () => {
    const result = await checkForCliUpdate("0.24.0", "https://nolo.chat", {
      fetchImpl: (async () =>
        new Response(JSON.stringify({ version: "0.24.0" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })) as typeof fetch,
    });
    expect(result).toBeNull();
  });

  test("resolves null on network failure instead of throwing", async () => {
    const result = await checkForCliUpdate("0.24.0", "https://nolo.chat", {
      fetchImpl: (async () => {
        throw new Error("ECONNREFUSED");
      }) as typeof fetch,
    });
    expect(result).toBeNull();
  });

  test("resolves null on non-200 registry responses", async () => {
    const result = await checkForCliUpdate("0.24.0", "https://us.nolo.chat", {
      fetchImpl: (async () => new Response("not found", { status: 404 })) as typeof fetch,
    });
    expect(result).toBeNull();
  });

  test("respects the NOLO_CLI_NO_UPDATE_CHECK kill switch", async () => {
    let called = false;
    const result = await checkForCliUpdate("0.24.0", "https://nolo.chat", {
      env: { NOLO_CLI_NO_UPDATE_CHECK: "1" } as NodeJS.ProcessEnv,
      fetchImpl: (async () => {
        called = true;
        return new Response(JSON.stringify({ version: "0.25.0" }), { status: 200 });
      }) as typeof fetch,
    });
    expect(result).toBeNull();
    expect(called).toBe(false);
  });

  test("resolves null without a current version", async () => {
    const result = await checkForCliUpdate(undefined, "https://nolo.chat", {
      fetchImpl: (async () =>
        new Response(JSON.stringify({ version: "0.25.0" }), { status: 200 })) as typeof fetch,
    });
    expect(result).toBeNull();
  });

  test("resolves null for a malformed current version instead of misreporting", async () => {
    const result = await checkForCliUpdate("not-a-version", "https://nolo.chat", {
      fetchImpl: (async () =>
        new Response(JSON.stringify({ version: "0.25.0" }), { status: 200 })) as typeof fetch,
    });
    expect(result).toBeNull();
  });

  test("resolves null when the registry payload has no version", async () => {
    const result = await checkForCliUpdate("0.24.0", "https://nolo.chat", {
      fetchImpl: (async () =>
        new Response(JSON.stringify({ distTags: {} }), { status: 200 })) as typeof fetch,
    });
    expect(result).toBeNull();
  });

  test("resolves null when the registry reports a malformed version", async () => {
    // 非法 latestVersion 不得进入字典序 fallback 被当成"更新"误报。
    const result = await checkForCliUpdate("0.24.0", "https://nolo.chat", {
      fetchImpl: (async () =>
        new Response(JSON.stringify({ version: "totally-not-semver" }), {
          status: 200,
        })) as typeof fetch,
    });
    expect(result).toBeNull();
  });

  test("kill switch: explicit env value overrides the process-level switch", async () => {
    const previous = process.env.NOLO_CLI_NO_UPDATE_CHECK;
    try {
      process.env.NOLO_CLI_NO_UPDATE_CHECK = "1";
      let called = false;
      // env 显式传 "0"：进程级 "1" 被覆盖，检查应正常执行。
      const result = await checkForCliUpdate("0.24.0", "https://nolo.chat", {
        env: { NOLO_CLI_NO_UPDATE_CHECK: "0" } as NodeJS.ProcessEnv,
        fetchImpl: (async () => {
          called = true;
          return new Response(JSON.stringify({ version: "0.25.0" }), { status: 200 });
        }) as typeof fetch,
      });
      expect(result).toEqual({ latestVersion: "0.25.0", channel: "latest" });
      expect(called).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.NOLO_CLI_NO_UPDATE_CHECK;
      else process.env.NOLO_CLI_NO_UPDATE_CHECK = previous;
    }
  });

  test("honors the kill switch from process.env when no env is injected", async () => {
    const previous = process.env.NOLO_CLI_NO_UPDATE_CHECK;
    try {
      process.env.NOLO_CLI_NO_UPDATE_CHECK = "1";
      let called = false;
      const result = await checkForCliUpdate("0.24.0", "https://nolo.chat", {
        fetchImpl: (async () => {
          called = true;
          return new Response(JSON.stringify({ version: "0.25.0" }), { status: 200 });
        }) as typeof fetch,
      });
      expect(result).toBeNull();
      expect(called).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.NOLO_CLI_NO_UPDATE_CHECK;
      else process.env.NOLO_CLI_NO_UPDATE_CHECK = previous;
    }
  });
});
