import { describe, expect, it } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

import { toErrorMessage } from "core/errorMessage";
import { verifyLegacyDesktopDownloadAlias } from "./verifyLegacyDesktopDownloadAlias";

const UPDATE_JSON_BODY = JSON.stringify({ version: "0.2.0", hash: "hash-020" });
const UPDATE_JSON_SHA256 = createHash("sha256").update(UPDATE_JSON_BODY, "utf8").digest("hex");
const UPDATE_JSON_SIZE = new TextEncoder().encode(UPDATE_JSON_BODY).length;

function makeUpdateMeta(overrides: Record<string, unknown> = {}) {
  return {
    url: "/stable-win-x64-update.json",
    sha256: UPDATE_JSON_SHA256,
    size: UPDATE_JSON_SIZE,
    version: "0.2.0",
    hash: "hash-020",
    ...overrides,
  };
}

function makeFetch(opts?: {
  updateMeta?: Record<string, unknown>;
  updateJsonBody?: string;
  manifestVersion?: string;
  channelManifestMissing?: boolean;
}) {
  const body = opts?.updateJsonBody ?? UPDATE_JSON_BODY;
  const manifestVersion = opts?.manifestVersion ?? "0.2.0";
  const manifestPayload = {
    schemaVersion: 1,
    channel: "stable",
    updatedAt: "2026-06-04T00:00:00.000Z",
    artifacts: {
      windows: {
        url: "/stable-win-x64-NoloDesktop-Setup.exe",
        size: 60000000,
        version: manifestVersion,
        ...(opts?.updateMeta ? { updateMeta: opts.updateMeta } : {}),
      },
    },
  };
  return async (request: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = request instanceof Request ? request.url : String(request);
      const { pathname } = new URL(requestUrl);
      const method = init?.method ?? (request instanceof Request ? request.method : "GET");
      if (method === "HEAD") {
        if (
          opts?.channelManifestMissing &&
          pathname === "/desktop-release-manifest.stable.json"
        ) {
          return new Response(null, { status: 404 });
        }
        return new Response(null, {
          status: 200,
          headers: { "content-length": "60000000" },
        });
      }
      if (
        pathname === "/desktop-release-manifest.json" ||
        pathname === "/desktop-release-manifest.stable.json"
      ) {
        if (
          opts?.channelManifestMissing &&
          pathname === "/desktop-release-manifest.stable.json"
        ) {
          return new Response("missing", { status: 404 });
        }
        return Response.json(manifestPayload);
      }
      if (pathname === "/stable-win-x64-update.json") {
        return new Response(body, {
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("ok");
  };
}

async function runVerify(
  fetchImpl: (request: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  artifactDir: string
) {
  const logs: string[] = [];
  try {
    await verifyLegacyDesktopDownloadAlias({
      legacyBaseUrl: "https://downloads.example.test",
      artifactDir,
      channel: "stable",
      log: (message) => logs.push(message),
      fetchImpl,
    });
    return { exitCode: 0, combined: logs.join("\n") };
  } catch (error) {
    const message = toErrorMessage(error);
    return { exitCode: 1, combined: [...logs, message].join("\n") };
  }
}

describe("verifyLegacyDesktopDownloadAlias", () => {
  it("fails when the legacy manifest and update metadata disagree on version", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-legacy-alias-"));
    await writeFile(join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"), "installer");
    await writeFile(join(artifactDir, "stable-win-x64-update.json"), UPDATE_JSON_BODY);

    // manifest says 0.1.2 but update.json says 0.2.0
    const fetchImpl = makeFetch({ manifestVersion: "0.1.2" });
    const result = await runVerify(fetchImpl, artifactDir);

    expect(result.exitCode).not.toBe(0);
    expect(result.combined).toContain(
      "manifest version 0.1.2 does not match stable-win-x64-update.json version 0.2.0",
    );
  });

  it("fails when updateMeta.url basename does not match the expected update.json name", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-legacy-alias-"));
    await writeFile(join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"), "installer");
    await writeFile(join(artifactDir, "stable-win-x64-update.json"), UPDATE_JSON_BODY);

    const fetchImpl = makeFetch({
      updateMeta: makeUpdateMeta({ url: "/stable-linux-x64-update.json" }),
    });
    const result = await runVerify(fetchImpl, artifactDir);

    expect(result.exitCode).not.toBe(0);
    expect(result.combined).toContain("updateMeta.url");
    expect(result.combined).toContain("does not match");
  });

  it("fails when updateMeta.version/hash disagree with published update.json", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-legacy-alias-"));
    await writeFile(join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"), "installer");
    await writeFile(join(artifactDir, "stable-win-x64-update.json"), UPDATE_JSON_BODY);

    const fetchImpl = makeFetch({
      updateMeta: makeUpdateMeta({ version: "0.9.9", hash: "wrong-hash" }),
    });
    const result = await runVerify(fetchImpl, artifactDir);

    expect(result.exitCode).not.toBe(0);
    expect(result.combined).toContain("updateMeta.version");
    expect(result.combined).toContain("does not match");
  });

  it("fails when updateMeta.hash disagrees with published update.json", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-legacy-alias-"));
    await writeFile(join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"), "installer");
    await writeFile(join(artifactDir, "stable-win-x64-update.json"), UPDATE_JSON_BODY);

    const fetchImpl = makeFetch({
      updateMeta: makeUpdateMeta({ hash: "wrong-hash" }),
    });
    const result = await runVerify(fetchImpl, artifactDir);

    expect(result.exitCode).not.toBe(0);
    expect(result.combined).toContain("updateMeta.hash");
    expect(result.combined).toContain("does not match");
  });

  it("fails when updateMeta.size does not match actual update.json content-length", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-legacy-alias-"));
    await writeFile(join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"), "installer");
    await writeFile(join(artifactDir, "stable-win-x64-update.json"), UPDATE_JSON_BODY);

    const fetchImpl = makeFetch({
      updateMeta: makeUpdateMeta({ size: 999 }),
    });
    const result = await runVerify(fetchImpl, artifactDir);

    expect(result.exitCode).not.toBe(0);
    expect(result.combined).toContain("updateMeta.size");
    expect(result.combined).toContain("does not match");
  });

  it("fails when updateMeta.sha256 does not match actual update.json bytes", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-legacy-alias-"));
    await writeFile(join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"), "installer");
    await writeFile(join(artifactDir, "stable-win-x64-update.json"), UPDATE_JSON_BODY);

    const fetchImpl = makeFetch({
      updateMeta: makeUpdateMeta({ sha256: "deadbeef" + "00".repeat(28) }),
    });
    const result = await runVerify(fetchImpl, artifactDir);

    expect(result.exitCode).not.toBe(0);
    expect(result.combined).toContain("updateMeta.sha256");
    expect(result.combined).toContain("does not match");
  });

  it("passes when updateMeta is present and matches the published update.json", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-legacy-alias-"));
    await writeFile(join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"), "installer");
    await writeFile(join(artifactDir, "stable-win-x64-update.json"), UPDATE_JSON_BODY);

    const fetchImpl = makeFetch({ updateMeta: makeUpdateMeta() });
    const result = await runVerify(fetchImpl, artifactDir);

    expect(result.exitCode).toBe(0);
    expect(result.combined).toContain("OK");
  });

  it("passes when updateMeta is absent (backward compat)", async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), "nolo-legacy-alias-"));
    await writeFile(join(artifactDir, "stable-win-x64-NoloDesktop-Setup.exe"), "installer");
    await writeFile(join(artifactDir, "stable-win-x64-update.json"), UPDATE_JSON_BODY);

    const fetchImpl = makeFetch();
    const result = await runVerify(fetchImpl, artifactDir);

    expect(result.exitCode).toBe(0);
    expect(result.combined).toContain("OK");
  });
});
