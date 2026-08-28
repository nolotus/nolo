import { describe, expect, test } from "bun:test";

import {
  normalizeCapabilityList,
  normalizeMachineHeartbeat,
} from "./protocol";

describe("connector experimental protocol", () => {
  test("normalizes a machine heartbeat into a stable registration payload", () => {
    const heartbeat = normalizeMachineHeartbeat({
      machineId: " machine-mac ",
      name: " Mac Studio ",
      platform: "darwin",
      arch: "arm64",
      connectorVersion: "0.1.0",
      capabilities: [" codex-cli ", "codex-cli", "", "local-llm:qwen"],
    });

    expect(heartbeat).toEqual({
      machineId: "machine-mac",
      name: "Mac Studio",
      platform: "darwin",
      arch: "arm64",
      connectorVersion: "0.1.0",
      capabilities: ["codex-cli", "local-llm:qwen"],
    });
  });

  test("rejects heartbeats without a stable machine id", () => {
    expect(() =>
      normalizeMachineHeartbeat({
        machineId: " ",
        name: "Windows",
        platform: "win32",
        arch: "x64",
        capabilities: [],
      })
    ).toThrow("machineId is required");
  });

  test("deduplicates capabilities while preserving declaration order", () => {
    expect(
      normalizeCapabilityList(["shell-readonly", " codex-cli ", "shell-readonly"])
    ).toEqual(["shell-readonly", "codex-cli"]);
  });
});
