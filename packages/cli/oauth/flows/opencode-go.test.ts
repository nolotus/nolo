import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  OPENCODE_GO_ENDPOINT,
  OPENCODE_GO_PROVIDER,
  readOpenCodeGoKeyFromAuthFile,
  normalizeOpenCodeGoModel,
} from "./opencode-go";

describe("OpenCode Go OAuth flow helpers", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "opencode-go-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("reads OpenCode Go key from auth file", () => {
    const path = join(tmpDir, "auth.json");
    writeFileSync(
      path,
      JSON.stringify({
        "opencode-go": { type: "api", key: "sk-test-key" },
        other: { type: "api", key: "ignored" },
      })
    );
    expect(readOpenCodeGoKeyFromAuthFile(path)).toBe("sk-test-key");
  });

  test("returns undefined when auth file is missing", () => {
    const path = join(tmpDir, "missing.json");
    expect(readOpenCodeGoKeyFromAuthFile(path)).toBeUndefined();
  });

  test("returns undefined when opencode-go entry is missing", () => {
    const path = join(tmpDir, "auth.json");
    writeFileSync(path, JSON.stringify({ other: { type: "api", key: "ignored" } }));
    expect(readOpenCodeGoKeyFromAuthFile(path)).toBeUndefined();
  });

  test("exports OpenCode Go constants", () => {
    expect(OPENCODE_GO_PROVIDER).toBe("opencode-go");
    expect(OPENCODE_GO_ENDPOINT).toBe("https://opencode.ai/zen/go/v1");
  });

  test("normalizes OpenCode Go model by stripping provider prefix", () => {
    expect(normalizeOpenCodeGoModel("opencode-go/glm-5.2")).toBe("glm-5.2");
    expect(normalizeOpenCodeGoModel("glm-5.2")).toBe("glm-5.2");
    expect(normalizeOpenCodeGoModel("opencode-go/deepseek-v3")).toBe("deepseek-v3");
  });
});
