import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runAuthCooldownCommand } from "./cooldownCommands";
import {
  readCredentialAvailability,
  resolveCredentialAvailabilityPath,
} from "./credentialAvailability";

let home: string;
let env: NodeJS.ProcessEnv;
const logs: string[] = [];

// 用「当前时间之后」的未来截止，确保条目不会在读取时被当成过期丢弃。

beforeEach(async () => {
  nowBase = Date.now();
  home = await mkdtemp(join(tmpdir(), "nolo-cooldown-cmd-"));
  env = { NOLO_HOME: home };
  logs.length = 0;
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

describe("runAuthCooldownCommand", () => {
  it("lists active cooldowns with recovery time and remaining duration", async () => {
    await writeCreds(env, {
      chatgpt: FUTURE(2),
      claude: FUTURE(5),
    });
    const code = await runAuthCooldownCommand([], env);
    expect(code).toBe(0);
    const out = logs.join("\n");
    expect(out).toContain("Active credential cooldowns:");
    expect(out).toContain("chatgpt");
    expect(out).toContain("claude");
    expect(out).toMatch(/remaining/);
  });

  it("reports no active cooldowns when the file is empty", async () => {
    const code = await runAuthCooldownCommand([], env);
    expect(code).toBe(0);
    expect(logs.join("\n")).toContain("No active credential cooldowns.");
  });

  it("--clear removes one credential's cooldown", async () => {
    await writeCreds(env, { chatgpt: FUTURE(2), claude: FUTURE(5) });
    const code = await runAuthCooldownCommand(["--clear", "chatgpt"], env);
    expect(code).toBe(0);
    expect(logs.join("\n")).toContain("Cleared cooldown for credential: chatgpt");
    expect(await readCredentialAvailability(env)).toEqual({ claude: FUTURE(5) });
  });

  it("--clear on a credential with no cooldown is a no-op success", async () => {
    const code = await runAuthCooldownCommand(["--clear", "chatgpt"], env);
    expect(code).toBe(0);
    expect(logs.join("\n")).toContain("No active cooldown for credential: chatgpt");
  });

  it("--clear-all empties every cooldown", async () => {
    await writeCreds(env, { chatgpt: FUTURE(2), claude: FUTURE(5) });
    const code = await runAuthCooldownCommand(["--clear-all"], env);
    expect(code).toBe(0);
    expect(logs.join("\n")).toContain("Cleared 2 credential cooldown(s).");
    expect(await readCredentialAvailability(env)).toEqual({});
  });

  it("--clear-all on empty file reports nothing to clear", async () => {
    const code = await runAuthCooldownCommand(["--clear-all"], env);
    expect(code).toBe(0);
    expect(logs.join("\n")).toContain("No credential cooldowns to clear.");
  });

  it("--clear without a credential returns a usage error", async () => {
    const code = await runAuthCooldownCommand(["--clear"], env);
    expect(code).toBe(1);
    expect(logs.join("\n")).toContain("Missing credential for --clear");
  });
});

/**
 * 每个用例内固定的“现在”。
 *
 * 不能每次调用都重取 `Date.now()`：写入构造与随后的断言若跨越了毫秒边界，
 * 同一个 `FUTURE(5)` 会算出相差 1ms 的两个值，测试随机失败（已实际发生）。
 * 每个用例开始时取一次基准，用例内所有 FUTURE 都相对它计算。
 */
let nowBase = 0;

function FUTURE(hoursFromNow: number): number {
  return nowBase + hoursFromNow * 3600 * 1000;
}

// 直接写文件构造假记录，避免依赖 CLI 内部时钟。
async function writeCreds(
  env: NodeJS.ProcessEnv,
  entries: Record<string, number>,
): Promise<void> {
  const path = resolveCredentialAvailabilityPath(env);
  const entriesObj = Object.fromEntries(
    Object.entries(entries).map(([k, at]) => [k, { nextAvailableAt: at }]),
  );
  await writeFile(
    path,
    JSON.stringify({ entries: entriesObj }, null, 2) + "\n",
    "utf8",
  );
}
