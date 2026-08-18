import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  materializeLargeConnectorPrompt,
  readRuntimePromptPageMeta,
} from "./machineWsPromptMaterialization";

describe("cli machine ws prompt materialization", () => {
  test("keeps small prompts inline", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-machine-prompt-inline-"));
    try {
      const result = materializeLargeConnectorPrompt({
        prompt: "hello",
        cwd: workspaceRoot,
        env: {},
        requestId: "request-1",
        runtimePromptPage: null,
      });

      expect(result.prompt).toBe("hello");
      expect(result.promptBytes).toBe(5);
      expect(result.promptRef).toBeNull();
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("materializes large prompts to a prompt ref file", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-machine-prompt-large-"));
    const largePrompt = `system prompt\n${"x".repeat(5000)}`;
    try {
      const result = materializeLargeConnectorPrompt({
        prompt: largePrompt,
        cwd: workspaceRoot,
        env: {
          NOLO_CONNECTOR_PROMPT_INLINE_MAX_BYTES: "1024",
        },
        requestId: "request-large",
        runtimePromptPage: {
          dbKey: "page-user-runtime-prompt",
          promptHash: "cloudhash123",
          contentBytes: 6000,
        },
      });

      expect(result.prompt).toContain("large Nolo runtime prompt");
      expect(result.prompt).toContain("Cloud prompt page: page-user-runtime-prompt");
      expect(result.prompt).toContain(
        'Read cloud page: bun packages/cli/index.ts doc read "page-user-runtime-prompt"',
      );
      expect(result.prompt).not.toContain("x".repeat(200));
      expect(result.promptRef).toContain(join(".nolo", "agent-prompts", "request-large-"));
      expect(existsSync(result.promptRef!)).toBe(true);
      expect(readFileSync(result.promptRef!, "utf8")).toBe(largePrompt);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("falls back to the default inline threshold for invalid env overrides", () => {
    const nearDefaultLimitPrompt = "x".repeat(31_999);

    const result = materializeLargeConnectorPrompt({
      prompt: nearDefaultLimitPrompt,
      cwd: tmpdir(),
      env: {
        NOLO_CONNECTOR_PROMPT_INLINE_MAX_BYTES: "999",
      },
      requestId: "request-default-threshold",
    });

    expect(result.prompt).toBe(nearDefaultLimitPrompt);
    expect(result.promptBytes).toBe(31_999);
    expect(result.promptRef).toBeNull();
  });

  test("reads runtime prompt page metadata defensively", () => {
    expect(
      readRuntimePromptPageMeta({
        payload: {
          meta: {
            runtimePromptPage: {
              dbKey: "page-1",
            },
          },
        },
      }),
    ).toEqual({
      dbKey: "page-1",
      promptHash: undefined,
      contentBytes: undefined,
    });

    expect(readRuntimePromptPageMeta({ payload: {} })).toBeNull();
    expect(readRuntimePromptPageMeta(null)).toBeNull();
  });
});
