/**
 * 启动期（agent run 派发/握手期）provider 429 的冷却落盘回归。
 *
 * 缺陷背景：启动期 429（如 Codex/Claude OAuth "usage limit reached"、
 * antigravity "Individual quota reached"）此前在 agentRun.ts 只被
 * classifyLocalRunError 分类后打日志 exit 1，不落冷却标记 → agent 照常被
 * listAgents 列出、下次派发继续撞 429。修复后 runLocalAgentTurnForCli 的失败
 * catch 经 markStartupRateLimitCooldown 调 localRuntimeAdapter 的
 * recordStartupAvailabilityForAgent（复用与 run 中途 recordLocalAvailability
 * 完全相同的核心 recordLocalAvailabilityForAgent），credential 级优先写盘、
 * agent 级 merge 取更晚者，失败文案追加「已标记冷却至 <ISO>」。
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";

import { runAgentTurn } from "./agentRun";
import { recordLocalAvailabilityForAgent } from "./localRuntimeAdapter";
import { resolveCredentialAvailabilityPath } from "../credentialAvailability";
import { DEFAULT_PROVIDER_RETRY_MS } from "ai/agent/agentAvailabilityShared";

const AGENT_KEY = "agent-local-01STARTUP429";
const MINUTE_MS = 60 * 1000;

class CaptureOutput extends Writable {
  chunks: string[] = [];

  _write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.chunks.push(String(chunk));
    callback();
  }

  text() {
    return this.chunks.join("");
  }
}

async function readCredentialEntries(env: NodeJS.ProcessEnv) {
  const path = resolveCredentialAvailabilityPath(env);
  if (!existsSync(path)) return {};
  const parsed = JSON.parse(await readFile(path, "utf8")) as {
    entries?: Record<string, { nextAvailableAt?: number }>;
  };
  return parsed.entries ?? {};
}

function createStartup429Adapter(input: {
  env: NodeJS.ProcessEnv;
  store: Map<string, any>;
  failWith?: string;
  succeedWith?: string;
}) {
  const loadAgentConfig = async (agentRef: string) => ({
    key: agentRef,
    apiKeyRef: "chatgpt",
    name: "Frontend",
    prompt: "Fix UI",
    model: "fake-local",
  });
  const fakeStore = {
    read: async (dbKey: string) => input.store.get(dbKey) ?? null,
    write: async (dbKey: string, record: any) => {
      input.store.set(dbKey, record);
    },
  };
  return {
    host: "cli",
    capabilities: ["local-provider", "local-persistence"],
    loadAgentConfig,
    loadDialogHistory: async () => [],
    saveTurn: async () => ({ dialogId: "dialog-startup-429" }),
    resolveProvider: async () => ({
      model: "fake-local",
      complete: async () => {
        if (input.failWith) throw new Error(input.failWith);
        return { content: input.succeedWith ?? "ok", model: "fake-local" };
      },
    }),
    executeTool: async () => {
      throw new Error("no tools expected");
    },
    // 生产环境由 createCliLocalRuntimeAdapter 提供该入口；测试里用同一个
    // 模块级核心函数 + 测试 store 复刻其接线（注入测试替身也能被兜底覆盖）。
    recordStartupAvailabilityForAgent: async (
      agentRef: string,
      status: number,
      body?: unknown,
    ) => {
      const agentConfig = await loadAgentConfig(agentRef);
      if (!agentConfig) return undefined;
      return recordLocalAvailabilityForAgent({
        deps: { env: input.env, store: fakeStore as any },
        agentConfig,
        status,
        body,
      });
    },
  };
}

describe("agent run startup 429 marks cooldown", () => {
  let home: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "nolo-startup-429-"));
    env = { NOLO_HOME: home, AUTH_TOKEN: "token-123" };
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  test("startup 429 with a 'Resets in 30m' message marks credential + agent cooldown and the failure copy carries the cooldown instant", async () => {
    const output = new CaptureOutput();
    const store = new Map<string, any>([
      [AGENT_KEY, { key: AGENT_KEY, name: "Frontend", prompt: "Fix UI", model: "fake-local" }],
    ]);
    const t0 = Date.now();

    const result = await runAgentTurn({
      agentName: "frontend",
      agentKey: AGENT_KEY,
      serverUrl: "https://nolo.chat",
      message: "review inference intensity code",
      scriptDir: "C:/missing/scripts",
      env,
      output,
      runtimeMode: "auto",
      localRuntimeAdapter: createStartup429Adapter({
        env,
        store,
        failWith:
          "local Codex OAuth provider failed: HTTP 429 You have hit your usage limit. Resets in 30m",
      }),
      fetchImpl: async () => {
        throw new Error("server fallback should not run");
      },
    });
    const t1 = Date.now();

    expect(result.exitCode).toBe(1);
    const window30m = 30 * MINUTE_MS;
    // credential 级：启动期 429 也落 credential 冷却（共享同一 OAuth 的 agent 都被挡）。
    const credentialEntries = await readCredentialEntries(env);
    const credentialAt = credentialEntries["chatgpt"]?.nextAvailableAt;
    expect(typeof credentialAt).toBe("number");
    expect(credentialAt!).toBeGreaterThanOrEqual(t0 + window30m - 5_000);
    expect(credentialAt!).toBeLessThanOrEqual(t1 + window30m + 5_000);
    // agent 级：既有 agent 记录的 nextAvailableAt 同步落盘。
    const agentRecord = store.get(AGENT_KEY);
    expect(typeof agentRecord?.nextAvailableAt).toBe("number");
    expect(agentRecord.nextAvailableAt).toBe(credentialAt);
    // 失败文案：rate-limit 分类 + 「已标记冷却至 <ISO>」。
    expect(output.text()).toContain("rate limited");
    const cooldownIso = new Date(agentRecord.nextAvailableAt).toISOString();
    expect(output.text()).toContain("已标记冷却至");
    expect(output.text()).toContain(cooldownIso);
  });

  test("startup 429 without parseable reset info falls back to the shared conservative default window", async () => {
    const output = new CaptureOutput();
    const store = new Map<string, any>([
      [AGENT_KEY, { key: AGENT_KEY, name: "Frontend", prompt: "Fix UI", model: "fake-local" }],
    ]);

    await runAgentTurn({
      agentName: "frontend",
      agentKey: AGENT_KEY,
      serverUrl: "https://nolo.chat",
      message: "continue",
      scriptDir: "C:/missing/scripts",
      env,
      output,
      runtimeMode: "auto",
      localRuntimeAdapter: createStartup429Adapter({
        env,
        store,
        failWith: "local provider failed: HTTP 429 usage limit has been reached",
      }),
      fetchImpl: async () => {
        throw new Error("server fallback should not run");
      },
    });

    const entries = await readCredentialEntries(env);
    const at = entries["chatgpt"]?.nextAvailableAt;
    expect(typeof at).toBe("number");
    // 默认窗口 = agentAvailabilityShared 的 DEFAULT_PROVIDER_RETRY_MS（不新发明数值）。
    expect(at! - Date.now()).toBeGreaterThan(DEFAULT_PROVIDER_RETRY_MS - MINUTE_MS);
    expect(at! - Date.now()).toBeLessThan(DEFAULT_PROVIDER_RETRY_MS + MINUTE_MS);
    expect(output.text()).toContain("已标记冷却至");
  });

  test("a longer pre-existing cooldown is not shortened by a startup 429 (merge keeps the later deadline)", async () => {
    const output = new CaptureOutput();
    const longDeadline = Date.now() + 2 * 60 * MINUTE_MS;
    const store = new Map<string, any>([
      [
        AGENT_KEY,
        {
          key: AGENT_KEY,
          name: "Frontend",
          prompt: "Fix UI",
          model: "fake-local",
          nextAvailableAt: longDeadline,
        },
      ],
    ]);
    // 预置 credential 级长冷却。
    await writeFile(
      resolveCredentialAvailabilityPath(env),
      `${JSON.stringify({ entries: { chatgpt: { nextAvailableAt: longDeadline } } }, null, 2)}\n`,
      "utf8",
    );

    await runAgentTurn({
      agentName: "frontend",
      agentKey: AGENT_KEY,
      serverUrl: "https://nolo.chat",
      message: "continue",
      scriptDir: "C:/missing/scripts",
      env,
      output,
      runtimeMode: "auto",
      localRuntimeAdapter: createStartup429Adapter({
        env,
        store,
        failWith:
          "local antigravity provider failed: HTTP 429 Individual quota reached. Resets in 30m",
      }),
      fetchImpl: async () => {
        throw new Error("server fallback should not run");
      },
    });

    const entries = await readCredentialEntries(env);
    const credentialAt = entries["chatgpt"]?.nextAvailableAt;
    // 取更晚者：30m 的短冷却不得抹掉已落盘的 2h 长冷却。
    expect(credentialAt).toBe(longDeadline);
    const agentRecord = store.get(AGENT_KEY);
    expect(agentRecord.nextAvailableAt).toBe(longDeadline);
    expect(output.text()).toContain(new Date(longDeadline).toISOString());
  });

  test("a successful startup turn (2xx-equivalent) writes no cooldown", async () => {
    const output = new CaptureOutput();
    const store = new Map<string, any>([
      [AGENT_KEY, { key: AGENT_KEY, name: "Frontend", prompt: "Fix UI", model: "fake-local" }],
    ]);

    const result = await runAgentTurn({
      agentName: "frontend",
      agentKey: AGENT_KEY,
      serverUrl: "https://nolo.chat",
      message: "say hi",
      scriptDir: "C:/missing/scripts",
      env,
      output,
      runtimeMode: "auto",
      localRuntimeAdapter: createStartup429Adapter({ env, store, succeedWith: "local:hi" }),
      fetchImpl: async () => {
        throw new Error("HTTP should not be called for local runs");
      },
    });

    expect(result.exitCode).toBe(0);
    // credential 级无冷却落盘。
    expect(await readCredentialEntries(env)).toEqual({});
    // agent 级记录未被补写 nextAvailableAt。
    expect("nextAvailableAt" in store.get(AGENT_KEY)).toBe(false);
  });
});
