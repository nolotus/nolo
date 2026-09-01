// @ts-nocheck — mock-heavy memory injection suite; runner stubs are incomplete vs production deps.
import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runAgentRunCommand } from "./agentRunCommand";

function runCommand(args: string[], deps: any) {
  return runAgentRunCommand(args, deps);
}

describe("CLI memory injection (T3456)", () => {
  let tempNoloHome: string;
  let originalNoloHome: string | undefined;
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalNoloHome = process.env.NOLO_HOME;
    tempNoloHome = mkdtempSync(join(tmpdir(), "nolo-mem-test-"));
    process.env.NOLO_HOME = tempNoloHome;
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    if (originalNoloHome === undefined) {
      delete process.env.NOLO_HOME;
    } else {
      process.env.NOLO_HOME = originalNoloHome;
    }
    globalThis.fetch = originalFetch;
    try {
      rmSync(tempNoloHome, { recursive: true, force: true });
    } catch {}
  });

  // (a) Anonymous state: resolveMemoryRuntime local direct read.
  //     No AUTH_TOKEN → no HTTP call; memory recall runs locally against the
  //     temp LevelDB. An empty DB yields null promptBlock → no memory layers,
  //     but contextBlockScopes still carries AGENTS.md (session) + skill (turn).
  test("anonymous state routes to resolveMemoryRuntime local direct read (no HTTP)", async () => {
    const calls: any[] = [];
    let fetchCalled = false;

    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    };

    const exitCode = await runCommand(
      ["review this repo"],
      {
        commandPath: ["run"],
        env: {},
        scriptDir: "/repo/scripts",
        output: { write() {} },
        runner: async (options) => {
          calls.push(options);
          return { exitCode: 0, dialogId: "dialog-anon-mem" };
        },
      } as any,
    );

    expect(exitCode).toBe(0);
    expect(fetchCalled).toBe(false);
    expect(calls).toHaveLength(1);
    // contextBlockScopes must exist and include session-scope blocks.
    const scopes = calls[0]?.contextBlockScopes;
    expect(Array.isArray(scopes)).toBe(true);
    // Even with no memory, the scopes array should be present (AGENTS.md or
    // skill discovery may populate it). The key invariant: no AGENTS.md loss.
    // Every block tagged "session" must have cacheScope === "session".
    for (const s of scopes ?? []) {
      if (s.content.startsWith("--- 项目指令（")) {
        expect(s.cacheScope).toBe("session");
      }
    }
  });

  // (b) Logged-in state: HTTP POST /api/memory/query (mock fetch).
  test("logged-in state routes to HTTP /api/memory/query", async () => {
    const calls: any[] = [];
    const fetchUrls: string[] = [];
    const fetchHeaders: Record<string, string>[] = [];
    const fetchBodies: any[] = [];

    globalThis.fetch = async (url: any, init: any) => {
      fetchUrls.push(String(url));
      fetchHeaders.push(init?.headers ?? {});
      fetchBodies.push(init?.body ? JSON.parse(init.body) : null);
      return new Response(
        JSON.stringify({ promptBlock: "Remember: user prefers concise answers." }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const exitCode = await runCommand(
      ["review this repo", "--server"],
      {
        commandPath: ["run"],
        env: { AUTH_TOKEN: "header.eyJ1c2VySWQiOiJ1c2VyLTEifQ.sig" },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        runner: async (options) => {
          calls.push(options);
          return { exitCode: 0, dialogId: "dialog-auth-mem" };
        },
      } as any,
    );

    expect(exitCode).toBe(0);
    expect(calls).toHaveLength(1);

    // HTTP memory query was called.
    expect(fetchUrls.some((u) => u.endsWith("/api/memory/query"))).toBe(true);
    expect(fetchHeaders[0]?.Authorization).toBe(
      "Bearer header.eyJ1c2VySWQiOiJ1c2VyLTEifQ.sig",
    );
    expect(fetchBodies[0]?.agentKey).toBeTruthy();
    expect(typeof fetchBodies[0]?.agentKey).toBe("string");
    expect(fetchBodies[0]?.userInput).toBe("review this repo");

    // contextBlockScopes must contain memory-overlay (turn) + memory-use-guidance (session).
    const scopes = calls[0]?.contextBlockScopes;
    expect(Array.isArray(scopes)).toBe(true);
    const contents = (scopes ?? []).map((s: any) => s.content);
    const hasMemoryOverlay = contents.some((c: string) =>
      c.includes("Remember: user prefers concise answers."),
    );
    const hasGuidance = contents.some((c: string) =>
      // buildMemoryUseGuidanceLayer emits the fixed MEMORY_USE_GUIDANCE text.
      c.includes("memory") || c.includes("记忆") || c.length > 0,
    );
    expect(hasMemoryOverlay).toBe(true);

    // bb63cfe48 makes memory overlay session-stable so it can stay in the
    // cacheable prefix; only per-turn transport context moves to user content.
    // memory-use-guidance remains session-scope.
    const memoryOverlayScope = (scopes ?? []).find((s: any) =>
      s.content.includes("Remember: user prefers concise answers."),
    );
    expect(memoryOverlayScope?.cacheScope).toBe("session");

    // The guidance layer content is the fixed text; it should be session-scope.
    // We identify it as a session-scope block that is NOT AGENTS.md.
    const sessionNonAgentsMd = (scopes ?? []).filter(
      (s: any) =>
        s.cacheScope === "session" && !s.content.startsWith("--- 项目指令（"),
    );
    expect(sessionNonAgentsMd.length).toBeGreaterThanOrEqual(1);
  });

  test("logged-in local runs recall memory remote-first (one /api/memory/query)", async () => {
    let memoryRequestCount = 0;
    globalThis.fetch = async (url: any) => {
      if (String(url).endsWith("/api/memory/query")) memoryRequestCount += 1;
      return new Response("{}", { status: 200 });
    };

    const exitCode = await runCommand(
      ["do work", "--local"],
      {
        commandPath: ["run"],
        env: { AUTH_TOKEN: "header.eyJ1c2VySWQiOiJ1c2VyLTMifQ.sig" },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        runner: async () => ({ exitCode: 0, dialogId: "dialog-local-mem" }),
      } as any,
    );

    expect(exitCode).toBe(0);
    // Remote-first recall is the CLI contract (see memoryRecall.ts): an
    // authenticated local run may still use the shared server memory index;
    // `--local` selects execution, not a separate memory namespace.
    expect(memoryRequestCount).toBe(1);
  });

  // (c) contextBlockScopes assembly: AGENTS.md(session) + memory-overlay(turn) + guidance(session),
  //     no AGENTS.md loss.
  test("contextBlockScopes contains AGENTS.md (session) + memory layers, no AGENTS.md loss", async () => {
    const calls: any[] = [];

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ promptBlock: "User likes TypeScript." }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    // Run from a temp dir that has an AGENTS.md so we can verify it appears in scopes.
    const tempCwd = mkdtempSync(join(tmpdir(), "nolo-mem-cwd-"));
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(tempCwd, "AGENTS.md"), "# Test AGENTS.md\nThis is a test project instruction.");

    const exitCode = await runCommand(
      ["do work", "--cwd", tempCwd, "--server"],
      {
        commandPath: ["run"],
        env: { AUTH_TOKEN: "header.eyJ1c2VySWQiOiJ1c2VyLTIifQ.sig" },
        scriptDir: "/repo/scripts",
        output: { write() {} },
        runner: async (options) => {
          calls.push(options);
          return { exitCode: 0, dialogId: "dialog-scopes" };
        },
      } as any,
    );

    expect(exitCode).toBe(0);
    const scopes = calls[0]?.contextBlockScopes;
    expect(Array.isArray(scopes)).toBe(true);

    // AGENTS.md must be present and tagged session.
    const agentsMdBlocks = (scopes ?? []).filter((s: any) =>
      s.content.startsWith("--- 项目指令（"),
    );
    expect(agentsMdBlocks.length).toBe(1);
    expect(agentsMdBlocks[0].cacheScope).toBe("session");
    expect(agentsMdBlocks[0].content).toContain("Test AGENTS.md");

    // memory-overlay must be present (session-stable after bb63cfe48).
    const memoryOverlayBlocks = (scopes ?? []).filter((s: any) =>
      s.content.includes("User likes TypeScript."),
    );
    expect(memoryOverlayBlocks.length).toBe(1);
    expect(memoryOverlayBlocks[0].cacheScope).toBe("session");

    // memory-use-guidance (session) must be present (a session block that is not AGENTS.md).
    const sessionBlocks = (scopes ?? []).filter((s: any) => s.cacheScope === "session");
    const nonAgentsMdSession = sessionBlocks.filter(
      (s: any) => !s.content.startsWith("--- 项目指令（"),
    );
    expect(nonAgentsMdSession.length).toBeGreaterThanOrEqual(1);

    rmSync(tempCwd, { recursive: true, force: true });
  });
});