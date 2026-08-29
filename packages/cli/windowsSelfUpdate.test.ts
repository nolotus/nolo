import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildWindowsUpdateHelperSource,
  consumeWindowsUpdateStartupNotice,
  readWindowsUpdateState,
  resolveWindowsUpdateStatePath,
  scheduleWindowsSelfUpdate,
  type WindowsUpdateState,
} from "./windowsSelfUpdate";

describe("Windows safe self-update", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function makeRoot(): string {
    const root = mkdtempSync(join(tmpdir(), "nolo-windows-update-test-"));
    roots.push(root);
    return root;
  }

  test("generates a dependency-free helper that parses as CommonJS", () => {
    const source = buildWindowsUpdateHelperSource();
    expect(source).toContain('require("node:child_process")');
    expect(source).toContain("payload.npmCliPath");
    expect(source).toContain("payload.powershellPath");
    expect(source).toContain("$_.Name -ieq 'node.exe'");
    expect(source).not.toContain("ComSpec");
    expect(source).toContain("Waiting for parent process");
    expect(
      () => new Function("require", "process", "Buffer", source),
    ).not.toThrow();
  });

  test("writes pending state before launching a detached temp helper", () => {
    const root = makeRoot();
    const temp = join(root, "temp");
    const env = { NOLO_HOME: join(root, "nolo-home") };
    mkdirSync(temp, { recursive: true });
    const nodePath = join(temp, "node.exe");
    const npmCliPath = join(temp, "npm-cli.js");
    const powershellPath = join(temp, "powershell.exe");
    for (const path of [nodePath, npmCliPath, powershellPath]) {
      writeFileSync(path, "", "utf8");
    }
    const launches: Array<{
      execPath: string;
      helperPath: string;
      payload: string;
    }> = [];

    const result = scheduleWindowsSelfUpdate({
      channel: "latest",
      currentVersion: "0.34.0-alpha.1",
      entrypointPath:
        "C:\\Users\\test\\AppData\\Roaming\\npm\\node_modules\\nolo-cli\\index.js",
      env,
      homeDir: root,
      tempDir: temp,
      parentPid: 1234,
      execPath: nodePath,
      nodePath,
      npmCliPath,
      powershellPath,
      launchDetached: (input) => {
        launches.push(input);
        return 5678;
      },
    });

    expect(result.helperPid).toBe(5678);
    expect(launches).toHaveLength(1);
    expect(launches[0]?.helperPath.startsWith(temp)).toBe(true);
    expect(launches[0]?.helperPath).not.toContain("node_modules");
    expect(readFileSync(launches[0]!.helperPath, "utf8")).toContain(
      "npm install exited with code",
    );
    const payload = JSON.parse(
      Buffer.from(launches[0]!.payload, "base64url").toString("utf8"),
    );
    expect(payload.parentPid).toBe(1234);
    expect(payload.channel).toBe("latest");
    expect(payload.statePath).toBe(result.statePath);

    expect(readWindowsUpdateState(env, root)).toMatchObject({
      status: "pending",
      helperPid: 5678,
      currentVersion: "0.34.0-alpha.1",
    });
    expect(() =>
      scheduleWindowsSelfUpdate({
        channel: "latest",
        currentVersion: "0.34.0-alpha.1",
        entrypointPath: payload.entrypointPath,
        env,
        homeDir: root,
        tempDir: temp,
        parentPid: 1234,
        execPath: nodePath,
        nodePath,
        npmCliPath,
        powershellPath,
        launchDetached: () => 9999,
      }),
    ).toThrow("Another Nolo update is already pending");
  });

  test("blocks a competing CLI while a fresh update is pending", () => {
    const root = makeRoot();
    const env = { NOLO_HOME: join(root, "nolo-home") };
    const statePath = resolveWindowsUpdateStatePath(env, root);
    const state: WindowsUpdateState = {
      status: "pending",
      currentVersion: "0.34.0-alpha.1",
      channel: "latest",
      startedAt: "2026-08-29T00:00:00.000Z",
      logPath: join(root, "update.log"),
      updateId: "owner-update-id",
    };
    mkdirSync(join(root, "nolo-home", "updates"), { recursive: true });
    writeFileSync(statePath, JSON.stringify(state), "utf8");

    expect(
      consumeWindowsUpdateStartupNotice(env, {
        homeDir: root,
        now: Date.parse(state.startedAt) + 1000,
        ownerUpdateId: "owner-update-id",
      }),
    ).toBeNull();

    const notice = consumeWindowsUpdateStartupNotice(env, {
      homeDir: root,
      now: Date.parse(state.startedAt) + 1000,
    });
    expect(notice?.blocking).toBe(true);
    expect(notice?.text).toContain("still running");
    expect(readWindowsUpdateState(env, root)?.status).toBe("pending");
  });

  test("reports and consumes a verified success result", () => {
    const root = makeRoot();
    const env = { NOLO_HOME: join(root, "nolo-home") };
    const statePath = resolveWindowsUpdateStatePath(env, root);
    const state: WindowsUpdateState = {
      status: "success",
      currentVersion: "0.32.0-alpha.4",
      targetVersion: "0.34.0-alpha.1",
      channel: "latest",
      startedAt: "2026-08-29T00:00:00.000Z",
      finishedAt: "2026-08-29T00:00:15.000Z",
      logPath: join(root, "update.log"),
    };
    mkdirSync(join(root, "nolo-home", "updates"), { recursive: true });
    writeFileSync(statePath, JSON.stringify(state), "utf8");

    const notice = consumeWindowsUpdateStartupNotice(env, { homeDir: root });
    expect(notice).toEqual({
      blocking: false,
      text: `Nolo updated successfully: 0.32.0-alpha.4 -> 0.34.0-alpha.1.\nLog: ${state.logPath}`,
    });
    expect(readWindowsUpdateState(env, root)).toBeNull();
  });

  test("helper waits, runs the trusted npm CLI, and verifies the installed package", () => {
    const root = makeRoot();
    const binDir = join(root, "bin");
    const prefix = join(root, "npm-prefix");
    const packageDir = join(prefix, "node_modules", "nolo-cli");
    const statePath = join(root, "state.json");
    const logPath = join(root, "update.log");
    const helperPath = join(root, "nolo-update-helper.cjs");
    mkdirSync(binDir, { recursive: true });
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(
      join(packageDir, "package.json"),
      JSON.stringify({ version: "0.34.0-alpha.1" }),
    );

    const powershellPath = join(binDir, "powershell.exe");
    writeFileSync(powershellPath, "#!/bin/sh\nexit 0\n", "utf8");
    chmodSync(powershellPath, 0o755);
    const npmCliPath = join(binDir, "npm-cli.js");
    writeFileSync(
      npmCliPath,
      `const fs = require("node:fs"); const path = require("node:path");\nconst argv = process.argv.slice(2); const args = argv.join(" ");\nif (args === "prefix -g") console.log(${JSON.stringify(prefix)});\nelse if (args === "view nolo-cli@latest version") console.log("0.34.0-alpha.1");\nelse if (args.startsWith("install -g --prefix ")) { const target = argv[argv.indexOf("--prefix") + 1]; const pkg = path.join(target, "node_modules", "nolo-cli"); fs.mkdirSync(pkg, { recursive: true }); fs.writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ version: "0.34.0-alpha.1" })); fs.writeFileSync(path.join(pkg, "index.js"), "if (process.env.NOLO_UPDATE_OWNER_ID !== 'update-test') process.exit(75); console.log('nolo-cli 0.34.0-alpha.1')\\n"); console.log("installed"); }\nelse process.exit(9);\n`,
      "utf8",
    );
    writeFileSync(helperPath, buildWindowsUpdateHelperSource(), "utf8");

    const payload = Buffer.from(
      JSON.stringify({
        parentPid: 999_999_999,
        currentVersion: "0.32.0-alpha.4",
        channel: "latest",
        entrypointPath: join(packageDir, "index.js"),
        startedAt: "2026-08-29T00:00:00.000Z",
        statePath,
        logPath,
        updateDir: root,
        updateId: "update-test",
        lockPath: join(root, "update.lock"),
        managedRoot: join(root, "managed-versions"),
        nodePath: process.execPath,
        npmCliPath,
        powershellPath,
      }),
      "utf8",
    ).toString("base64url");
    const result = spawnSync(process.execPath, [helperPath, payload], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
      },
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(readFileSync(statePath, "utf8"))).toMatchObject({
      status: "success",
      currentVersion: "0.32.0-alpha.4",
      targetVersion: "0.34.0-alpha.1",
    });
    const log = readFileSync(logPath, "utf8");
    expect(log).toContain(`${process.execPath} ${npmCliPath} prefix -g`);
    expect(log).toContain(
      `${process.execPath} ${npmCliPath} install -g --prefix`,
    );
    expect(log).toContain("Verified nolo-cli 0.34.0-alpha.1 at");
    expect(readFileSync(join(prefix, "nolo.cmd"), "utf8")).toContain(
      "managed-versions",
    );
  });

  test("helper restores every previous shim when post-switch verification fails", () => {
    const root = makeRoot();
    const binDir = join(root, "bin");
    const prefix = join(root, "npm-prefix");
    const packageDir = join(prefix, "node_modules", "nolo-cli");
    const statePath = join(root, "state.json");
    const logPath = join(root, "update.log");
    const helperPath = join(root, "nolo-update-helper.cjs");
    mkdirSync(binDir, { recursive: true });
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(
      join(packageDir, "package.json"),
      JSON.stringify({ version: "0.32.0-alpha.4" }),
    );
    const previousShims = {
      "nolo.cmd": "old cmd shim\r\n",
      "nolo.ps1": "old ps1 shim\r\n",
      nolo: "old sh shim\n",
    };
    for (const [name, content] of Object.entries(previousShims)) {
      writeFileSync(join(prefix, name), content, "utf8");
    }

    const powershellPath = join(binDir, "powershell.exe");
    writeFileSync(powershellPath, "#!/bin/sh\nexit 0\n", "utf8");
    chmodSync(powershellPath, 0o755);
    const npmCliPath = join(binDir, "npm-cli.js");
    writeFileSync(
      npmCliPath,
      `const fs = require("node:fs"); const path = require("node:path");\nconst argv = process.argv.slice(2); const args = argv.join(" ");\nif (args === "prefix -g") console.log(${JSON.stringify(prefix)});\nelse if (args === "view nolo-cli@latest version") console.log("0.34.0-alpha.1");\nelse if (args.startsWith("install -g --prefix ")) { const target = argv[argv.indexOf("--prefix") + 1]; const pkg = path.join(target, "node_modules", "nolo-cli"); fs.mkdirSync(pkg, { recursive: true }); fs.writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ version: "0.34.0-alpha.1" })); fs.writeFileSync(path.join(pkg, "index.js"), "console.log('wrong version')\\n"); }\nelse process.exit(9);\n`,
      "utf8",
    );
    writeFileSync(helperPath, buildWindowsUpdateHelperSource(), "utf8");
    const payload = Buffer.from(
      JSON.stringify({
        parentPid: 999_999_999,
        currentVersion: "0.32.0-alpha.4",
        channel: "latest",
        entrypointPath: join(packageDir, "index.js"),
        startedAt: "2026-08-29T00:00:00.000Z",
        statePath,
        logPath,
        updateDir: root,
        updateId: "rollback-test",
        lockPath: join(root, "update.lock"),
        managedRoot: join(root, "managed-versions"),
        nodePath: process.execPath,
        npmCliPath,
        powershellPath,
      }),
      "utf8",
    ).toString("base64url");

    const result = spawnSync(process.execPath, [helperPath, payload], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ""}` },
    });

    expect(result.status).toBe(1);
    expect(JSON.parse(readFileSync(statePath, "utf8"))).toMatchObject({
      status: "failed",
      message: expect.stringContaining("previous launch shims were restored"),
    });
    for (const [name, content] of Object.entries(previousShims)) {
      expect(readFileSync(join(prefix, name), "utf8")).toBe(content);
    }
  });
});
