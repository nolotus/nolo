import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROJECTION_RELEASE_METADATA_FILENAME, serializeProjectionReleaseMetadata } from "./projectionReleaseMetadata";

const scriptPath = join(import.meta.dir, "assertProjectionReleaseMetadata.ts");
const ALPHA_VERSION = "0.63.0-alpha.7";
const temporaryDirectories: string[] = [];

afterEach(async () => {
  while (temporaryDirectories.length) {
    const dir = temporaryDirectories.pop()!;
    await rm(dir, { recursive: true, force: true });
  }
});

async function makeFixture(options: { metadata?: string; desktopVersion?: string | null } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "nolo-assert-meta-"));
  temporaryDirectories.push(dir);
  if (options.desktopVersion !== null) {
    await mkdir(join(dir, "packages/desktop"), { recursive: true });
    await writeFile(
      join(dir, "packages/desktop/package.json"),
      JSON.stringify({ name: "desktop", version: options.desktopVersion ?? ALPHA_VERSION }),
    );
  }
  if (options.metadata !== undefined) {
    await writeFile(join(dir, PROJECTION_RELEASE_METADATA_FILENAME), options.metadata);
  }
  return dir;
}

async function run(dir: string, args: string[], env: Record<string, string> = {}) {
  const child = Bun.spawn([process.execPath, scriptPath, ...args], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, exitCode };
}

function declaredMetadata(overrides: Partial<{ version: string; channel: string; releaseIntent: string }> = {}) {
  const version = overrides.version ?? ALPHA_VERSION;
  return serializeProjectionReleaseMetadata({
    schemaVersion: 1,
    component: "desktop",
    version,
    channel: overrides.channel ?? "alpha",
    releaseIntent: overrides.releaseIntent ?? "release",
    provenance: { sourceSha: "a".repeat(40), sourceBranch: "alpha" },
  });
}

describe("assertProjectionReleaseMetadata CLI contract", () => {
  it("passes a declared release, binds the target version, and emits GitHub outputs", async () => {
    const dir = await makeFixture({ metadata: declaredMetadata() });
    const outputFile = join(dir, "github-output.txt");
    const { stdout, stderr, exitCode } = await run(
      dir,
      ["--expect-intent", "release", "--expect-version", ALPHA_VERSION, "--set-outputs", "channel,version,tag", "--print-version"],
      { GITHUB_OUTPUT: outputFile },
    );
    expect(exitCode).toBe(0);
    // 流契约：人读日志走 stderr；stdout 只保留 --print-version 的单行 SemVer。
    expect(stderr).toContain("[projection-release-metadata] ok");
    expect(stdout).toBe(`${ALPHA_VERSION}\n`);
    // GITHUB_OUTPUT 是纯字段值：无日志混入、无空行、仅一个结尾换行。
    const outputs = await readFile(outputFile, "utf8");
    expect(outputs).toBe(
      [`channel=alpha`, `version=${ALPHA_VERSION}`, `tag=desktop-alpha-v${ALPHA_VERSION}`].join("\n") + "\n",
    );
  });

  it("writes a pure machine-readable version output with no logs or stray newlines", async () => {
    // version-bump workflow 的消费契约：--set-outputs version 只写纯 SemVer。
    const dir = await makeFixture({ metadata: declaredMetadata() });
    const outputFile = join(dir, "github-output.txt");
    const { stdout, exitCode } = await run(dir, ["--expect-intent", "release", "--set-outputs", "version"], {
      GITHUB_OUTPUT: outputFile,
    });
    expect(exitCode).toBe(0);
    expect(stdout).toBe("");
    expect(await readFile(outputFile, "utf8")).toBe(`version=${ALPHA_VERSION}\n`);
  });

  it("exit 1 (skip signal) when valid metadata declares no desktop release intent", async () => {
    const dir = await makeFixture({ metadata: declaredMetadata({ releaseIntent: "none" }) });
    const { stdout, stderr, exitCode } = await run(dir, ["--expect-intent", "release", "--print-version"]);
    expect(exitCode).toBe(1);
    // 说明性日志走 stderr（不污染机器输出流）
    expect(stderr).toContain("releaseIntent=none");
    // 跳过信号：stdout 为空（不输出 --print-version 的独立版本行）
    expect(stdout).toBe("");
  });

  it("exit 2 fail closed when the metadata file is missing", async () => {
    const dir = await makeFixture({ metadata: undefined });
    const { exitCode, stderr } = await run(dir, ["--expect-intent", "release"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("missing");
    expect(stderr).toContain("fail closed");
  });

  it("exit 2 fail closed on malformed metadata JSON", async () => {
    const dir = await makeFixture({ metadata: "{ not json" });
    const { exitCode } = await run(dir, ["--expect-intent", "release"]);
    expect(exitCode).toBe(2);
  });

  it("exit 2 fail closed when metadata lies about the channel (channel is SemVer-derived)", async () => {
    const dir = await makeFixture({ metadata: declaredMetadata({ channel: "stable" }) });
    const { exitCode, stderr } = await run(dir, ["--expect-intent", "release"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("does not match SemVer-derived channel");
  });

  it("exit 2 fail closed when metadata version drifts from packages/desktop/package.json", async () => {
    const dir = await makeFixture({
      metadata: declaredMetadata({ version: "0.63.0-alpha.6" }),
      desktopVersion: ALPHA_VERSION,
    });
    const { exitCode, stderr } = await run(dir, ["--expect-intent", "release"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("drifts");
  });

  it("exit 3 fail closed when the repair dispatch targets a version other than the declared metadata", async () => {
    const dir = await makeFixture({ metadata: declaredMetadata() });
    const { exitCode, stderr } = await run(dir, ["--expect-intent", "release", "--expect-version", "0.63.0-alpha.6"]);
    expect(exitCode).toBe(3);
    expect(stderr).toContain("does not match declared metadata version");
  });

  it("exit 4 fail closed when the projected desktop manifest is unreadable", async () => {
    const dir = await makeFixture({ metadata: declaredMetadata(), desktopVersion: null });
    const { exitCode } = await run(dir, ["--expect-intent", "release"]);
    expect(exitCode).toBe(4);
  });
});
