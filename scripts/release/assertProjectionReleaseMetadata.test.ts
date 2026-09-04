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
    const { exitCode, stderr } = await run(
      dir,
      ["--expect-intent", "release", "--expect-version", ALPHA_VERSION, "--set-outputs", "channel,version,tag", "--print-version"],
      { GITHUB_OUTPUT: outputFile },
    );
    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    const outputs = await readFile(outputFile, "utf8");
    expect(outputs).toContain(`version=${ALPHA_VERSION}`);
    expect(outputs).toContain("channel=alpha");
    expect(outputs).toContain(`tag=desktop-alpha-v${ALPHA_VERSION}`);
  });

  it("exit 1 (skip signal) when valid metadata declares no desktop release intent", async () => {
    const dir = await makeFixture({ metadata: declaredMetadata({ releaseIntent: "none" }) });
    const { stdout, exitCode } = await run(dir, ["--expect-intent", "release", "--print-version"]);
    expect(exitCode).toBe(1);
    expect(stdout).toContain("releaseIntent=none");
    // 跳过信号：不输出 --print-version 的独立版本行（只有说明性日志）
    expect(stdout.split("\n").filter((line) => line === ALPHA_VERSION)).toEqual([]);
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
