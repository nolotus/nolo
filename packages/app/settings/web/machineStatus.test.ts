import { describe, expect, test } from "bun:test";

import { projectMachineSummary } from "./machineStatus";

describe("machine status projection", () => {
  test("marks a stale online machine offline on the client", () => {
    expect(
      projectMachineSummary(
        {
          machineId: "machine-1",
          name: "Mac",
          platform: "darwin",
          arch: "arm64",
          capabilities: ["codex-cli"],
          connectorStatus: "connected",
          status: "online",
          lastSeenAt: 1_000,
        },
        92_000
      )
    ).toMatchObject({
      status: "offline",
      connectorStatus: "disconnected",
    });
  });
});
