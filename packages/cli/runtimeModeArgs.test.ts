import { describe, expect, test } from "bun:test";

import { resolveTuiLaunchMode } from "./runtimeModeArgs";

describe("CLI runtime mode args", () => {
  test("starts TUI for chat --local and patches runtime env", () => {
    expect(resolveTuiLaunchMode(["chat", "--local"])).toEqual({
      shouldStartTui: true,
      envPatch: { NOLO_RUNTIME_MODE: "local" },
    });
  });

  test("starts TUI for chat --server and tui --auto", () => {
    expect(resolveTuiLaunchMode(["chat", "--server"])).toEqual({
      shouldStartTui: true,
      envPatch: { NOLO_RUNTIME_MODE: "server" },
    });
    expect(resolveTuiLaunchMode(["tui", "--auto"])).toEqual({
      shouldStartTui: true,
      envPatch: { NOLO_RUNTIME_MODE: "auto" },
    });
  });

  test("does not claim script chat args", () => {
    expect(resolveTuiLaunchMode(["chat", "--agent", "agent-pub-test"])).toEqual({
      shouldStartTui: false,
      envPatch: {},
    });
  });
});
