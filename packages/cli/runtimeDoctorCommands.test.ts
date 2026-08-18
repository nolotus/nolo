import { describe, expect, test } from "bun:test";

import { defaultLocalRuntimeProbe } from "./runtimeDoctorCommands";

describe("default CLI local runtime doctor probe", () => {
  test("starts a fresh broker before checking its active health", async () => {
    const steps: string[] = [];
    const result = await defaultLocalRuntimeProbe(
      { NOLO_HOME: "/tmp/fresh-nolo-home" },
      {
        getDb: async () => {
          steps.push("connect");
          return { get: async () => null };
        },
        probeAuthorityHealth: async () => {
          steps.push("health");
          return { ok: true };
        },
      }
    );

    expect(steps).toEqual(["connect", "health"]);
    expect(result).toMatchObject({
      ok: true,
      authorityHealthy: true,
    });
  });

  test("reports healthy when connecting takes over stale broker artifacts", async () => {
    const steps: string[] = [];
    const result = await defaultLocalRuntimeProbe(
      { NOLO_HOME: "/tmp/stale-nolo-home" },
      {
        getDb: async () => {
          steps.push("takeover");
          return { get: async () => null };
        },
        probeAuthorityHealth: async () => {
          steps.push("health");
          return { ok: true };
        },
      }
    );

    expect(steps).toEqual(["takeover", "health"]);
    expect(result.authorityHealthy).toBe(true);
  });

  test("reports unhealthy when broker recovery fails before health probing", async () => {
    let healthProbed = false;
    const result = await defaultLocalRuntimeProbe(
      { NOLO_HOME: "/tmp/failed-nolo-home" },
      {
        getDb: async () => {
          throw new Error("broker takeover failed");
        },
        probeAuthorityHealth: async () => {
          healthProbed = true;
          return { ok: true };
        },
      }
    );

    expect(healthProbed).toBe(false);
    expect(result).toMatchObject({
      ok: false,
      authorityHealthy: false,
      authorityError: "broker takeover failed",
    });
  });

  test("keeps LevelDB healthy when only the active authority probe fails", async () => {
    const result = await defaultLocalRuntimeProbe(
      {
        NOLO_HOME: "/tmp/unreachable-authority-home",
        NOLO_LOCAL_AGENT_KEY: "agent-local",
      },
      {
        getDb: async () => ({ get: async () => ({ dbKey: "agent-local" }) }),
        probeAuthorityHealth: async () => ({
          ok: false,
          error: "authority broker endpoint is unreachable",
        }),
      }
    );

    expect(result).toMatchObject({
      ok: true,
      authorityHealthy: false,
      authorityError: "authority broker endpoint is unreachable",
      agentFound: false,
    });
    expect(result.error).toBeUndefined();
  });
});
