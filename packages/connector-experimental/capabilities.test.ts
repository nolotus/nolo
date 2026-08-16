import { describe, expect, test } from "bun:test";

import { detectRuntimeCapabilities } from "./capabilities";

describe("connector runtime capabilities", () => {
  test("reports installed agent CLIs without executing them", () => {
    const capabilities = detectRuntimeCapabilities({
      commandExists: (command) =>
        command === "codex" ||
        command === "claude" ||
        command === "gh" ||
        command === "agy" ||
        command === "qoder" ||
        command === "gemini" ||
        command === "opencode" ||
        command === "grok" ||
        command === "kimi",
      env: {},
    });

    expect(capabilities).toEqual([
      "codex-cli",
      "claude-code",
      "copilot-cli",
      "gemini-cli",
      "kimi-cli",
      "agy-cli",
      "qoder-cli",
      "opencode-cli",
      "grok-cli",
    ]);
  });

  test("can require agent CLIs to be launchable by the connector process", () => {
    const capabilities = detectRuntimeCapabilities({
      commandExists: (command) => command === "codex" || command === "claude",
      commandLaunchable: (command, args) => command === "claude" && args[0] === "--version",
      env: {},
      probeLaunchable: true,
    });

    expect(capabilities).toEqual(["claude-code"]);
  });

  test("reports a configured local llm endpoint as private local capability", () => {
    const capabilities = detectRuntimeCapabilities({
      commandExists: () => false,
      env: { NOLO_LOCAL_LLM_ENDPOINT: "http://127.0.0.1:8080/v1/chat/completions" },
    });

    expect(capabilities).toEqual(["local-llm"]);
  });
});
