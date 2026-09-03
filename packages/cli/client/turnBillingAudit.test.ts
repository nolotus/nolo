import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendTurnBillingAudit,
  projectUsageForAudit,
  resolveTurnBillingAuditLogPath,
} from "./turnBillingAudit";

const makeEnvHome = (): { home: string; logPath: string } => {
  const home = mkdtempSync(join(tmpdir(), "nolo-turn-billing-audit-"));
  return { home, logPath: join(home, "logs", "turn-billing.jsonl") };
};

const cleanup = (home: string) => rmSync(home, { recursive: true, force: true });

describe("projectUsageForAudit", () => {
  test("投影数字字段与计费元数据，丢弃其余内容", () => {
    const projected = projectUsageForAudit({
      input_tokens: 121171,
      output_tokens: 452,
      cache_read_input_tokens: 118656,
      cache_creation_input_tokens: 0,
      cost: 0.024018,
      billing_unit: "credits",
      provider_call_id: "call_01ABC",
      total_tokens: 121623,
      reasoning_tokens: 17,
    });
    expect(projected).toEqual({
      input_tokens: 121171,
      output_tokens: 452,
      cache_read_input_tokens: 118656,
      cache_creation_input_tokens: 0,
      cost: 0.024018,
      billing_unit: "credits",
      provider_call_id: "call_01ABC",
    });
  });

  test("空 / 非对象 usage 返回 null", () => {
    expect(projectUsageForAudit(null)).toBeNull();
    expect(projectUsageForAudit(undefined)).toBeNull();
    expect(projectUsageForAudit("nope" as never)).toBeNull();
  });
});

describe("appendTurnBillingAudit", () => {
  test("写入 JSONL：单行 + calls 投影 + turnCredits 汇总", () => {
    const { home, logPath } = makeEnvHome();
    const prevHome = process.env.NOLO_HOME;
    const prevSwitch = process.env.NOLO_TURN_BILLING_AUDIT;
    try {
      process.env.NOLO_HOME = home;
      delete process.env.NOLO_TURN_BILLING_AUDIT;
      appendTurnBillingAudit({
        dialogId: "01MDIALOG",
        agentKey: "agent-x",
        turnCredits: 0.024018,
        usageRecords: [
          {
            callId: "call-1",
            usage: {
              input_tokens: 100,
              output_tokens: 5,
              cache_read_input_tokens: 90,
              cache_creation_input_tokens: 0,
              cost: 0.024018,
              billing_unit: "credits",
            },
            model: "glm-5-3-flash",
            provider: "nolo",
          },
        ],
      });
      const raw = readFileSync(logPath, "utf-8");
      const lines = raw.trim().split("\n");
      expect(lines.length).toBe(1);
      const row = JSON.parse(lines[0]);
      expect(row.dialogId).toBe("01MDIALOG");
      expect(row.agentKey).toBe("agent-x");
      expect(row.turnCredits).toBe(0.024018);
      expect(row.calls.length).toBe(1);
      expect(row.calls[0].model).toBe("glm-5-3-flash");
      expect(row.calls[0].input_tokens).toBe(100);
      expect(row.calls[0].cost).toBe(0.024018);
      expect(row.calls[0].billing_unit).toBe("credits");
    } finally {
      if (prevHome === undefined) delete process.env.NOLO_HOME;
      else process.env.NOLO_HOME = prevHome;
      if (prevSwitch === undefined) delete process.env.NOLO_TURN_BILLING_AUDIT;
      else process.env.NOLO_TURN_BILLING_AUDIT = prevSwitch;
      cleanup(home);
    }
  });

  test("无平台计费帧（turnCredits undefined 且无 usageRecords）不落行", () => {
    const { home, logPath } = makeEnvHome();
    const prevHome = process.env.NOLO_HOME;
    try {
      process.env.NOLO_HOME = home;
      appendTurnBillingAudit({ dialogId: "01MDIALOG" });
      expect(() => readFileSync(logPath)).toThrow();
    } finally {
      if (prevHome === undefined) delete process.env.NOLO_HOME;
      else process.env.NOLO_HOME = prevHome;
      cleanup(home);
    }
  });

  test("NOLO_TURN_BILLING_AUDIT=0 整体关闭", () => {
    const { home, logPath } = makeEnvHome();
    const prevHome = process.env.NOLO_HOME;
    const prevSwitch = process.env.NOLO_TURN_BILLING_AUDIT;
    try {
      process.env.NOLO_HOME = home;
      process.env.NOLO_TURN_BILLING_AUDIT = "0";
      appendTurnBillingAudit({
        dialogId: "01MDIALOG",
        turnCredits: 1,
        usageRecords: [
          {
            callId: "c",
            usage: { input_tokens: 1, output_tokens: 1, billing_unit: "credits", cost: 1 },
          },
        ],
      });
      expect(() => readFileSync(logPath)).toThrow();
    } finally {
      if (prevHome === undefined) delete process.env.NOLO_HOME;
      else process.env.NOLO_HOME = prevHome;
      if (prevSwitch === undefined) delete process.env.NOLO_TURN_BILLING_AUDIT;
      else process.env.NOLO_TURN_BILLING_AUDIT = prevSwitch;
      cleanup(home);
    }
  });

  test("坏 usage / 坏目录不抛错（静默失败）", () => {
    const prevHome = process.env.NOLO_HOME;
    const prevSwitch = process.env.NOLO_TURN_BILLING_AUDIT;
    try {
      process.env.NOLO_HOME = join(tmpdir(), "nolo-turn-billing-audit-nonexistent-deep");
      delete process.env.NOLO_TURN_BILLING_AUDIT;
      expect(() =>
        appendTurnBillingAudit({
          dialogId: "01MDIALOG",
          turnCredits: 1,
          usageRecords: [{ callId: "c", usage: "garbage" as never }],
        }),
      ).not.toThrow();
      mkdirSync(join(tmpdir(), "nolo-turn-billing-audit-mkdir-conflict"), { recursive: true });
    } finally {
      if (prevHome === undefined) delete process.env.NOLO_HOME;
      else process.env.NOLO_HOME = prevHome;
      if (prevSwitch === undefined) delete process.env.NOLO_TURN_BILLING_AUDIT;
      else process.env.NOLO_TURN_BILLING_AUDIT = prevSwitch;
    }
  });

  test("resolveTurnBillingAuditLogPath 尊重 NOLO_HOME", () => {
    const path = resolveTurnBillingAuditLogPath({ NOLO_HOME: "/tmp/nolo-x" });
    expect(path).toBe(join("/tmp/nolo-x", "logs", "turn-billing.jsonl"));
  });
});
