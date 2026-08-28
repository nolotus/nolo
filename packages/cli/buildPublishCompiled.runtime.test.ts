import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildPublishArtifactCompiled } from "./buildPublish";

const NODE_BINARY_RUNNER = `
const { spawnSync } = require("node:child_process");
const { closeSync, openSync } = require("node:fs");
const [binaryPath, stdoutPath, stderrPath, ...args] = process.argv.slice(1);
const stdoutFd = openSync(stdoutPath, "w");
const stderrFd = openSync(stderrPath, "w");
const result = spawnSync(binaryPath, args, { stdio: ["ignore", stdoutFd, stderrFd] });
closeSync(stdoutFd);
closeSync(stderrFd);
process.exit(result.status ?? 1);
`;

describe("CLI compiled native artifact", () => {
  const DIST_DIR = join(import.meta.dir, ".test-dist-compiled");

  beforeAll(async () => {
    rmSync(DIST_DIR, { recursive: true, force: true });
    await buildPublishArtifactCompiled(import.meta.dir, DIST_DIR);
  });

  afterAll(() => {
    rmSync(DIST_DIR, { recursive: true, force: true });
  });

  function runCompiledCli(binaryPath: string, args: string[], outputName: string) {
    const stdoutPath = join(DIST_DIR, `${outputName}.stdout.txt`);
    const stderrPath = join(DIST_DIR, `${outputName}.stderr.txt`);
    const result = Bun.spawnSync({
      cmd: ["node", "-e", NODE_BINARY_RUNNER, binaryPath, stdoutPath, stderrPath, ...args],
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: result.exitCode,
      stdout: readFileSync(stdoutPath, "utf8"),
    };
  }

  test("produces a standalone binary named nolo", () => {
    const binaryPath = join(DIST_DIR, "nolo");
    expect(existsSync(binaryPath)).toBe(true);
  });

  test("binary is executable and responds to --help", () => {
    const binaryPath = join(DIST_DIR, "nolo");
    const result = runCompiledCli(binaryPath, ["--help"], "help");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("nolo — Agent-first terminal workspace");
  });

  test("binary reports version via doctor", () => {
    const binaryPath = join(DIST_DIR, "nolo");
    const result = runCompiledCli(binaryPath, ["doctor"], "doctor");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(
      /version\s+nolo-cli(-darwin-arm64)?\s+\d+\.\d+\.\d+/
    );
  });
});
