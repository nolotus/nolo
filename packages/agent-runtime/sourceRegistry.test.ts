import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFileSourceRegistry } from "./sourceRegistry";

const tempHomes: string[] = [];

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), "nolo-source-reg-"));
  tempHomes.push(home);
  return home;
}

afterEach(() => {
  while (tempHomes.length > 0) {
    const home = tempHomes.pop();
    if (home) rmSync(home, { recursive: true, force: true });
  }
});

describe("sourceRegistry", () => {
  test("upsert/list/get/remove without storing secrets", () => {
    const registry = createFileSourceRegistry({ homeDir: makeHome(), now: () => 1000 });

    expect(registry.list()).toEqual([]);

    const row = registry.upsert({
      sourceId: "src-openai",
      kind: "api",
      providerId: "openai",
      label: "OpenAI metered",
      credentialRef: "api-key:agent-openai",
      status: "ready",
    });

    expect(row).toMatchObject({
      sourceId: "src-openai",
      kind: "api",
      providerId: "openai",
      label: "OpenAI metered",
      credentialRef: "api-key:agent-openai",
      status: "ready",
      updatedAt: 1000,
    });
    expect(JSON.stringify(row)).not.toContain("sk-");

    expect(registry.get("src-openai")).toEqual(row);
    expect(registry.list()).toHaveLength(1);

    registry.upsert({
      sourceId: "src-cli",
      kind: "cli",
      providerId: "codex",
      label: "Codex CLI",
      status: "ready",
    });
    expect(registry.list().map((s) => s.sourceId)).toEqual(["src-cli", "src-openai"]);

    expect(registry.remove("src-openai")).toBe(true);
    expect(registry.get("src-openai")).toBeNull();
    expect(registry.remove("src-openai")).toBe(false);
  });

  test("rejects credentialRef that looks like a raw api key", () => {
    const registry = createFileSourceRegistry({ homeDir: makeHome() });
    expect(() =>
      registry.upsert({
        sourceId: "bad",
        kind: "api",
        providerId: "openai",
        label: "Bad",
        credentialRef: "sk-live-secret",
        status: "ready",
      }),
    ).toThrow(/raw API key/i);
  });

  test("persists across registry instances on same home", () => {
    const homeDir = makeHome();
    const a = createFileSourceRegistry({ homeDir, now: () => 1 });
    a.upsert({
      sourceId: "src-sub",
      kind: "subscription",
      providerId: "chatgpt",
      label: "ChatGPT OAuth",
      credentialRef: "chatgpt",
      status: "ready",
    });
    const b = createFileSourceRegistry({ homeDir });
    expect(b.get("src-sub")?.label).toBe("ChatGPT OAuth");
  });
});
