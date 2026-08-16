import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ORIGINAL_BASE_URL = process.env.BASE_URL;
const ORIGINAL_NOLO_SERVER = process.env.NOLO_SERVER;
const ORIGINAL_READ_DIALOG_BASE = process.env.READ_DIALOG_BASE;
const ORIGINAL_SCRIPT_SYNC_SERVERS = process.env.SCRIPT_SYNC_SERVERS;
const ORIGINAL_SCRIPT_LOCAL_BASE_URL = process.env.SCRIPT_LOCAL_BASE_URL;

async function loadModule() {
  return import(`./serverBases?test=${Date.now()}-${Math.random()}`);
}

describe("serverBases helpers", () => {
  beforeEach(() => {
    delete process.env.BASE_URL;
    delete process.env.NOLO_SERVER;
    delete process.env.READ_DIALOG_BASE;
    delete process.env.SCRIPT_SYNC_SERVERS;
    process.env.SCRIPT_LOCAL_BASE_URL = "http://127.0.0.1:38123";
  });

  afterEach(() => {
    if (ORIGINAL_BASE_URL === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = ORIGINAL_BASE_URL;

    if (ORIGINAL_NOLO_SERVER === undefined) delete process.env.NOLO_SERVER;
    else process.env.NOLO_SERVER = ORIGINAL_NOLO_SERVER;

    if (ORIGINAL_READ_DIALOG_BASE === undefined) delete process.env.READ_DIALOG_BASE;
    else process.env.READ_DIALOG_BASE = ORIGINAL_READ_DIALOG_BASE;

    if (ORIGINAL_SCRIPT_SYNC_SERVERS === undefined) delete process.env.SCRIPT_SYNC_SERVERS;
    else process.env.SCRIPT_SYNC_SERVERS = ORIGINAL_SCRIPT_SYNC_SERVERS;

    if (ORIGINAL_SCRIPT_LOCAL_BASE_URL === undefined) delete process.env.SCRIPT_LOCAL_BASE_URL;
    else process.env.SCRIPT_LOCAL_BASE_URL = ORIGINAL_SCRIPT_LOCAL_BASE_URL;
  });

  it("builds normalized cluster-aware candidates with preferred base first", async () => {
    process.env.BASE_URL = "https://nolo.chat/";
    process.env.READ_DIALOG_BASE = "https://us.nolo.chat/";
    process.env.SCRIPT_SYNC_SERVERS =
      "http://localhost, https://preview.nolo.chat/, https://us.nolo.chat";

    const { buildScriptServerCandidates } = await loadModule();

    expect(buildScriptServerCandidates("http://localhost/")).toEqual([
      "http://localhost",
      "https://nolo.chat",
      "https://us.nolo.chat",
      "http://127.0.0.1:38123",
      "https://preview.nolo.chat",
    ]);
  });

  it("does not crash when preferred and optional env bases are absent", async () => {
    const { buildScriptServerCandidates } = await loadModule();

    expect(buildScriptServerCandidates()).toEqual([
      "http://127.0.0.1:38123",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });

  it("keeps remote candidates ahead of local when the preferred base is non-local", async () => {
    process.env.BASE_URL = "https://nolo.chat/";
    process.env.READ_DIALOG_BASE = "https://us.nolo.chat/";
    process.env.SCRIPT_SYNC_SERVERS =
      "http://localhost, https://preview.nolo.chat/";

    const { buildScriptServerCandidates } = await loadModule();

    expect(buildScriptServerCandidates("https://us.nolo.chat/")).toEqual([
      "https://us.nolo.chat",
      "https://nolo.chat",
      "https://preview.nolo.chat",
      "http://127.0.0.1:38123",
      "http://localhost",
    ]);
  });

  it("supports explicit sync target aliases", async () => {
    const { buildScriptServerCandidates, parseScriptSyncTargets } = await loadModule();

    const targets = parseScriptSyncTargets("local,us,https://preview.nolo.chat/");

    expect(buildScriptServerCandidates(undefined, { syncTargets: targets })).toEqual([
      "http://127.0.0.1:38123",
      "https://us.nolo.chat",
      "https://preview.nolo.chat",
    ]);
  });

  it("resolves sync targets from flags before environment defaults", async () => {
    const { resolveScriptSyncTargets } = await loadModule();

    expect(resolveScriptSyncTargets({
      explicitSync: "us",
      envSyncTargets: "local,main",
    })).toEqual(["https://us.nolo.chat"]);
  });

  it("resolves local-only as an explicit local sync target", async () => {
    const { resolveScriptSyncTargets } = await loadModule();

    expect(resolveScriptSyncTargets({
      explicitSync: "us",
      envSyncTargets: "main",
      localOnly: true,
    })).toEqual(["http://127.0.0.1:38123"]);
  });

  it("falls back to SCRIPT_SYNC_TARGETS when no flag is provided", async () => {
    const { resolveScriptSyncTargets } = await loadModule();

    expect(resolveScriptSyncTargets({
      envSyncTargets: "us,https://preview.nolo.chat/",
    })).toEqual([
      "https://us.nolo.chat",
      "https://preview.nolo.chat",
    ]);
  });

  it("honors an explicit empty sync target list", async () => {
    const { buildScriptServerCandidates, parseScriptSyncTargets } = await loadModule();

    expect(buildScriptServerCandidates(undefined, {
      syncTargets: parseScriptSyncTargets("none"),
    })).toEqual([]);
  });

  it("resolveDeleteServerCandidates mirrors buildScriptServerCandidates", async () => {
    const { resolveDeleteServerCandidates, buildScriptServerCandidates } = await loadModule();

    expect(resolveDeleteServerCandidates("https://us.nolo.chat/")).toEqual(
      buildScriptServerCandidates("https://us.nolo.chat/"),
    );
  });

  it("recognizes localhost and 127.0.0.1 as local bases", async () => {
    const { isLocalBaseUrl } = await loadModule();

    expect(isLocalBaseUrl("http://localhost")).toBe(true);
    expect(isLocalBaseUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalBaseUrl("https://us.nolo.chat")).toBe(false);
    expect(isLocalBaseUrl("not-a-url")).toBe(false);
  });

  describe("resolveTargetServerBase", () => {
    it("returns explicit --server if provided", async () => {
      const { resolveTargetServerBase } = await loadModule();
      expect(await resolveTargetServerBase("http://explicit.nolo.chat/", undefined, {
        env: {},
        resolveReadyDevApiOrigin: async () => "http://127.0.0.1:38223",
      })).toBe("http://explicit.nolo.chat");
    });

    it("returns NOLO_SERVER or BASE_URL from env", async () => {
      const { resolveTargetServerBase } = await loadModule();
      expect(await resolveTargetServerBase(undefined, undefined, {
        env: {
          NOLO_SERVER: "http://env.nolo.chat/",
          BASE_URL: "http://base.nolo.chat",
        },
        resolveReadyDevApiOrigin: async () => "http://127.0.0.1:38223",
      })).toBe("http://env.nolo.chat");
      expect(await resolveTargetServerBase(undefined, undefined, {
        env: {
          BASE_URL: "http://base.nolo.chat/",
        },
        resolveReadyDevApiOrigin: async () => "http://127.0.0.1:38223",
      })).toBe("http://base.nolo.chat");
    });

    it("uses the ready dev controller API before fallback", async () => {
      const { resolveTargetServerBase } = await loadModule();
      expect(await resolveTargetServerBase(undefined, "http://fallback.nolo.chat", {
        env: {},
        resolveReadyDevApiOrigin: async () => "http://127.0.0.1:38223/",
      })).toBe("http://127.0.0.1:38223");
    });

    it("fails fast instead of using a stale ready local API", async () => {
      const { resolveTargetServerBase } = await loadModule();
      await expect(resolveTargetServerBase(undefined, "http://fallback.nolo.chat", {
        env: {},
        resolveReadyDevApiOrigin: async () => {
          throw new Error("[Verifier] Local dev API process is running old code. Run `bun ./scripts/dev/devControl.ts restart api`.");
        },
      })).rejects.toThrow("bun ./scripts/dev/devControl.ts restart api");
    });

    it("uses dev:ctl stale-code metadata before returning a ready local API", () => {
      const source = readFileSync(join(import.meta.dir, "serverBases.ts"), "utf8");
      expect(source).toContain("isOldCode");
      expect(source).toContain("bun ./scripts/dev/devControl.ts restart api");
    });

    it("returns fallback if nothing else is available", async () => {
      const { resolveTargetServerBase } = await loadModule();
      expect(await resolveTargetServerBase(undefined, "http://fallback.nolo.chat", {
        env: {},
        resolveReadyDevApiOrigin: async () => undefined,
      })).toBe("http://fallback.nolo.chat");
    });

    it("returns LOCAL_SERVER_ORIGIN if no fallback and no other source is available", async () => {
      const { resolveTargetServerBase } = await loadModule();
      expect(await resolveTargetServerBase(undefined, undefined, {
        env: {},
        resolveReadyDevApiOrigin: async () => undefined,
      })).toBe("http://127.0.0.1:38123");
    });
  });

  describe("resolveLocalDialogReadBase", () => {
    it("uses the resolved target server when it is already local", async () => {
      const { resolveLocalDialogReadBase } = await loadModule();
      expect(await resolveLocalDialogReadBase({
        targetServer: "http://127.0.0.1:38223/",
        env: {},
        resolveReadyDevApiOrigin: async () => "http://127.0.0.1:39999",
      })).toBe("http://127.0.0.1:38223");
    });

    it("uses the ready dev controller origin for local dialog evidence when target is remote", async () => {
      const { resolveLocalDialogReadBase } = await loadModule();
      expect(await resolveLocalDialogReadBase({
        targetServer: "https://us.nolo.chat",
        env: {},
        resolveReadyDevApiOrigin: async () => "http://127.0.0.1:38223/",
      })).toBe("http://127.0.0.1:38223");
    });

    it("does not use a remote READ_DIALOG_BASE for local dialog evidence", async () => {
      const { resolveLocalDialogReadBase } = await loadModule();
      expect(await resolveLocalDialogReadBase({
        targetServer: "https://us.nolo.chat",
        env: {
          READ_DIALOG_BASE: "https://nolo.chat",
        },
        resolveReadyDevApiOrigin: async () => "http://127.0.0.1:38223",
      })).toBe("http://127.0.0.1:38223");
    });
  });

  describe("resolveDefaultScriptBaseUrl", () => {
    function writeProfile(profile: { serverUrl: string }): string {
      const dir = mkdtempSync(join(tmpdir(), "nolo-server-bases-"));
      const path = join(dir, "config.json");
      writeFileSync(
        path,
        `${JSON.stringify({
          currentProfile: "default",
          profiles: { default: profile },
        })}\n`,
        "utf8",
      );
      return path;
    }

    it("prefers explicit BASE_URL over profile and local", async () => {
      const { resolveDefaultScriptBaseUrl } = await loadModule();
      const profilePath = writeProfile({ serverUrl: "https://nolo.chat" });
      expect(
        resolveDefaultScriptBaseUrl({
          env: { BASE_URL: "https://override.example/" },
          profileConfigPath: profilePath,
        }),
      ).toBe("https://override.example");
    });

    it("prefers NOLO_SERVER over profile when BASE_URL is absent", async () => {
      const { resolveDefaultScriptBaseUrl } = await loadModule();
      const profilePath = writeProfile({ serverUrl: "https://nolo.chat" });
      expect(
        resolveDefaultScriptBaseUrl({
          env: { NOLO_SERVER: "https://us.nolo.chat/" },
          profileConfigPath: profilePath,
        }),
      ).toBe("https://us.nolo.chat");
    });

    it("falls back to current profile serverUrl when no env is set", async () => {
      const { resolveDefaultScriptBaseUrl } = await loadModule();
      const profilePath = writeProfile({ serverUrl: "https://nolo.chat/" });
      expect(
        resolveDefaultScriptBaseUrl({
          env: {},
          profileConfigPath: profilePath,
        }),
      ).toBe("https://nolo.chat");
    });

    it("falls back to LOCAL_SERVER_ORIGIN when profile is missing", async () => {
      const { resolveDefaultScriptBaseUrl } = await loadModule();
      const missingPath = join(mkdtempSync(join(tmpdir(), "nolo-server-bases-")), "nope.json");
      expect(
        resolveDefaultScriptBaseUrl({
          env: {},
          profileConfigPath: missingPath,
        }),
      ).toBe("http://127.0.0.1:38123");
    });


    it("ignores empty / whitespace-only env values", async () => {
      const { resolveDefaultScriptBaseUrl } = await loadModule();
      const profilePath = writeProfile({ serverUrl: "https://nolo.chat" });
      expect(
        resolveDefaultScriptBaseUrl({
          env: { BASE_URL: "  ", NOLO_SERVER: "\t" },
          profileConfigPath: profilePath,
        }),
      ).toBe("https://nolo.chat");
    });
   });
 });
