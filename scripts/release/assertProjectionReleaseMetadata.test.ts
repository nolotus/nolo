import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PROJECTION_RELEASE_METADATA_FILENAME,
  resolveChannelFromSemVer,
  serializeProjectionReleaseMetadata,
  type ProjectionReleaseMetadata,
} from "./projectionReleaseMetadata";

const scriptPath = join(import.meta.dir, "assertProjectionReleaseMetadata.ts");
const CLI_ALPHA_VERSION = "0.33.0-alpha.33";
const DESKTOP_ALPHA_VERSION = "0.63.0-alpha.7";
const temporaryDirectories: string[] = [];

afterEach(async () => {
  while (temporaryDirectories.length) {
    const dir = temporaryDirectories.pop()!;
    await rm(dir, { recursive: true, force: true });
  }
});

async function makeFixture(options: {
  metadata?: string;
  cliVersion?: string | null;
  desktopVersion?: string | null;
} = {}) {
  const dir = await mkdtemp(join(tmpdir(), "nolo-assert-meta-"));
  temporaryDirectories.push(dir);
  if (options.cliVersion !== null) {
    await mkdir(join(dir, "packages/cli"), { recursive: true });
    await writeFile(
      join(dir, "packages/cli/package.json"),
      JSON.stringify({ name: "cli", version: options.cliVersion ?? CLI_ALPHA_VERSION }),
    );
  }
  if (options.desktopVersion !== null) {
    await mkdir(join(dir, "packages/desktop"), { recursive: true });
    await writeFile(
      join(dir, "packages/desktop/package.json"),
      JSON.stringify({ name: "desktop", version: options.desktopVersion ?? DESKTOP_ALPHA_VERSION }),
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

function declaredMetadata(overrides: {
  cli?: Partial<{ version: string; channel: "alpha" | "stable"; releaseIntent: "none" | "release" }>;
  desktop?: Partial<{ version: string; channel: "alpha" | "stable"; releaseIntent: "none" | "release" }>;
  provenance?: Partial<{ sourceSha: string; sourceBranch: string | null }>;
} = {}): string {
  const cliVersion = overrides.cli?.version ?? CLI_ALPHA_VERSION;
  const desktopVersion = overrides.desktop?.version ?? DESKTOP_ALPHA_VERSION;
  const meta: ProjectionReleaseMetadata = {
    schemaVersion: 2,
    components: {
      cli: {
        version: cliVersion,
        channel: overrides.cli?.channel ?? resolveChannelFromSemVer(cliVersion),
        releaseIntent: overrides.cli?.releaseIntent ?? "none",
      },
      desktop: {
        version: desktopVersion,
        channel: overrides.desktop?.channel ?? resolveChannelFromSemVer(desktopVersion),
        releaseIntent: overrides.desktop?.releaseIntent ?? "release",
      },
    },
    provenance: {
      sourceSha: overrides.provenance?.sourceSha ?? "a".repeat(40),
      sourceBranch: overrides.provenance?.sourceBranch !== undefined ? overrides.provenance.sourceBranch : "alpha",
    },
  };
  return serializeProjectionReleaseMetadata(meta);
}

describe("assertProjectionReleaseMetadata CLI contract", () => {
  it("passes a declared release, binds the target version, and emits GitHub outputs", async () => {
    const dir = await makeFixture({
      metadata: declaredMetadata({
        desktop: { version: DESKTOP_ALPHA_VERSION, releaseIntent: "release" },
        cli: { version: CLI_ALPHA_VERSION, releaseIntent: "release" },
      }),
    });
    const outputFile = join(dir, "github-output.txt");

    // Desktop
    const desktopRun = await run(
      dir,
      ["--component", "desktop", "--expect-intent", "release", "--expect-version", DESKTOP_ALPHA_VERSION, "--set-outputs", "channel,version,tag", "--print-version"],
      { GITHUB_OUTPUT: outputFile },
    );
    expect(desktopRun.exitCode).toBe(0);
    expect(desktopRun.stderr).toContain("[projection-release-metadata] ok: desktop");
    expect(desktopRun.stdout).toBe(`${DESKTOP_ALPHA_VERSION}\n`);

    const outputContent = await readFile(outputFile, "utf8");
    expect(outputContent).toContain("channel=alpha\n");
    expect(outputContent).toContain(`version=${DESKTOP_ALPHA_VERSION}\n`);
    expect(outputContent).toContain(`tag=desktop-alpha-v${DESKTOP_ALPHA_VERSION}\n`);

    // CLI
    const cliRun = await run(
      dir,
      ["--component", "cli", "--expect-intent", "release", "--expect-version", CLI_ALPHA_VERSION, "--set-outputs", "channel,version,tag", "--print-version"],
      { GITHUB_OUTPUT: outputFile },
    );
    expect(cliRun.exitCode).toBe(0);
    expect(cliRun.stderr).toContain("[projection-release-metadata] ok: cli");
    expect(cliRun.stdout).toBe(`${CLI_ALPHA_VERSION}\n`);
  });

  it("writes a pure machine-readable version output with no logs or stray newlines", async () => {
    const dir = await makeFixture({
      metadata: declaredMetadata({ desktop: { version: DESKTOP_ALPHA_VERSION, releaseIntent: "release" } }),
    });
    const { stdout, stderr, exitCode } = await run(dir, ["--component", "desktop", "--print-version"]);
    expect(exitCode).toBe(0);
    expect(stdout).toBe(`${DESKTOP_ALPHA_VERSION}\n`);
    expect(stderr).toContain("[projection-release-metadata] ok");
  });

  it("exit 1 (skip signal) when valid metadata declares no release intent for the component", async () => {
    const dir = await makeFixture({
      metadata: declaredMetadata({ desktop: { releaseIntent: "none" }, cli: { releaseIntent: "release" } }),
    });
    const { exitCode, stderr } = await run(dir, ["--component", "desktop", "--expect-intent", "release"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("no declared release intent (releaseIntent=none)");
  });

  it("exit 2 fail closed when --component is missing or invalid", async () => {
    const dir = await makeFixture({ metadata: declaredMetadata() });
    const missing = await run(dir, ["--expect-intent", "release"]);
    expect(missing.exitCode).toBe(2);
    expect(missing.stderr).toContain("--component is required");

    const invalid = await run(dir, ["--component", "unknown", "--expect-intent", "release"]);
    expect(invalid.exitCode).toBe(2);
    expect(invalid.stderr).toContain("unsupported --component");
  });

  it("exit 2 fail closed when the metadata file is missing", async () => {
    const dir = await makeFixture();
    const { exitCode, stderr } = await run(dir, ["--component", "desktop", "--expect-intent", "release"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("projection-release-metadata.json missing");
  });

  it("exit 2 fail closed when metadata lies about the channel (channel is SemVer-derived)", async () => {
    const dir = await makeFixture({
      metadata: declaredMetadata({ desktop: { version: DESKTOP_ALPHA_VERSION, channel: "stable" } }),
    });
    const { exitCode, stderr } = await run(dir, ["--component", "desktop", "--expect-intent", "release"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("does not match SemVer-derived channel");
  });

  it("exit 2 fail closed when metadata version drifts from packages/desktop/package.json or packages/cli/package.json", async () => {
    // Desktop drift
    const desktopDriftDir = await makeFixture({
      metadata: declaredMetadata({ desktop: { version: "0.63.0-alpha.6" } }),
      desktopVersion: DESKTOP_ALPHA_VERSION,
    });
    const desktopDrift = await run(desktopDriftDir, ["--component", "desktop", "--expect-intent", "release"]);
    expect(desktopDrift.exitCode).toBe(2);
    expect(desktopDrift.stderr).toContain("drifts from projected packages/desktop/package.json");

    // CLI drift
    const cliDriftDir = await makeFixture({
      metadata: declaredMetadata({ cli: { version: "0.33.0-alpha.32" } }),
      cliVersion: CLI_ALPHA_VERSION,
    });
    const cliDrift = await run(cliDriftDir, ["--component", "cli", "--expect-intent", "release"]);
    expect(cliDrift.exitCode).toBe(2);
    expect(cliDrift.stderr).toContain("drifts from projected packages/cli/package.json");
  });

  it("exit 3 fail closed when the repair dispatch targets a version other than the declared metadata", async () => {
    const dir = await makeFixture({ metadata: declaredMetadata() });
    const { exitCode, stderr } = await run(dir, [
      "--component",
      "desktop",
      "--expect-intent",
      "release",
      "--expect-version",
      "0.63.0-alpha.6",
    ]);
    expect(exitCode).toBe(3);
    expect(stderr).toContain("does not match declared desktop metadata version");
  });

  it("exit 4 fail closed when a projected component manifest is unreadable", async () => {
    const dir = await makeFixture({ metadata: declaredMetadata(), desktopVersion: null });
    const { exitCode } = await run(dir, ["--component", "desktop", "--expect-intent", "release"]);
    expect(exitCode).toBe(4);
  });
});
