/**
 * memoryCorrection 单测。
 *
 * 测试覆盖规格全部点：
 * - 来源推导：三档 + 无法判断归 inferred
 * - 自动降权：agent-not-found 命中扣分；quota/auth/network 不扣；阈值排除；
 *   再次失败继续扣；同记忆多次命中只扣一次
 * - 用户纠正优先于自动降权
 * - 召回过滤：阈值分界
 * - 召回档案：完整档案文本 + 降权记忆标注 + inferred 高置信度存疑
 *
 * 约束：本测试是纯逻辑测试，零 I/O，零 Node 依赖。
 */
import { describe, expect, it } from "bun:test";
import type { MemoryItem } from "../../memory/types";
import type { RunFailureInfo } from "./quotaCircuitBreaker";
import {
  DEFAULT_DEMOTE_THRESHOLD,
  FAILURE_PENALTY_DELTA,
  PROVENANCE_DEFAULT_CONFIDENCE,
  SUSPECT_INFERRED_HIGH_CONFIDENCE,
  appendCorrectionHistory,
  applyFailureFeedback,
  applyUserCorrection,
  buildMemoryDossier,
  buildMemoryDossiers,
  filterRecallableMemories,
  inferProvenance,
  migrateProvenance,
  type MemoryCorrectionHistory,
  type MemoryUsageRecord,
} from "./memoryCorrection";

// ─────────────────────────── 工具函数 ───────────────────────────

function makeMemory(overrides: Partial<MemoryItem> = {}): MemoryItem {
  return {
    id: "memory-001",
    ownerType: "user",
    ownerId: "user-1",
    visibility: "private",
    subjectType: "user",
    subjectId: "user-1",
    kind: "episodic",
    content: "agent-pub-x 的可用性：key = agent-pub-01KYW7ABCDEF",
    createdAt: "2026-08-09T08:00:00.000Z",
    lastActivatedAt: "2026-08-09T08:00:00.000Z",
    activationCount: 1,
    importance: 0.5,
    confidence: PROVENANCE_DEFAULT_CONFIDENCE.inferred,
    ...overrides,
  };
}

function makeFailure(
  overrides: Partial<RunFailureInfo> = {},
): RunFailureInfo {
  return {
    reason: "agent-not-found",
    message: "Agent config not found for ID: agent-pub-01KYW7ABCDEF",
    ...overrides,
  };
}

function makeUsage(overrides: Partial<MemoryUsageRecord> = {}): MemoryUsageRecord {
  return {
    memoryId: "memory-001",
    extractedValue: "agent-pub-01KYW7ABCDEF",
    operation: "dispatch-agent",
    ...overrides,
  };
}

// ─────────────────────────── 来源推导 ───────────────────────────

describe("来源推导（inferProvenance / migrateProvenance）", () => {
  it("tags 含 verified → verified", () => {
    const item = makeMemory({ tags: ["verified"] });
    expect(inferProvenance(item)).toBe("verified");
  });

  it("sourceKind 为 explicit-user-directive → stated", () => {
    const item = makeMemory({ sourceKind: "explicit-user-directive" });
    expect(inferProvenance(item)).toBe("stated");
  });

  it("无标记 → inferred（保守）", () => {
    const item = makeMemory({});
    expect(inferProvenance(item)).toBe("inferred");
  });

  it("verified tag 优先于 sourceKind（验证过的最可信）", () => {
    const item = makeMemory({
      tags: ["verified"],
      sourceKind: "explicit-user-directive",
    });
    expect(inferProvenance(item)).toBe("verified");
  });

  it("migrateProvenance 对无标记旧记录补标为 inferred", () => {
    const item = makeMemory({});
    expect(migrateProvenance(item)).toBe("inferred");
  });

  it("三档默认置信度：verified > stated > inferred", () => {
    expect(PROVENANCE_DEFAULT_CONFIDENCE.verified).toBeGreaterThan(
      PROVENANCE_DEFAULT_CONFIDENCE.stated,
    );
    expect(PROVENANCE_DEFAULT_CONFIDENCE.stated).toBeGreaterThan(
      PROVENANCE_DEFAULT_CONFIDENCE.inferred,
    );
  });
});

// ─────────────────────────── 自动降权（负反馈闭环） ───────────────────────────

describe("applyFailureFeedback（自动降权负反馈闭环）", () => {
  it("agent-not-found + usage 命中失败消息 → 扣该记忆置信度", () => {
    const memory = makeMemory({ confidence: 0.9 });
    const penalties = applyFailureFeedback({
      failure: makeFailure(),
      usages: [makeUsage()],
      now: Date.parse("2026-08-09T08:10:00.000Z"),
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [memory],
    });
    expect(penalties).toHaveLength(1);
    expect(penalties[0].memoryId).toBe("memory-001");
    expect(penalties[0].delta).toBe(FAILURE_PENALTY_DELTA);
    expect(penalties[0].newConfidence).toBeCloseTo(0.9 + FAILURE_PENALTY_DELTA, 5);
    expect(penalties[0].reason).toContain("agent-not-found");
  });

  it("扣到阈值以下 → belowThreshold=true（从活跃检索排除）", () => {
    // inferred 默认 0.4，扣 0.25 → 0.15 < 0.3 阈值
    const memory = makeMemory({ confidence: 0.4 });
    const penalties = applyFailureFeedback({
      failure: makeFailure(),
      usages: [makeUsage()],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [memory],
    });
    expect(penalties[0].newConfidence).toBeLessThan(DEFAULT_DEMOTE_THRESHOLD);
    expect(penalties[0].belowThreshold).toBe(true);
  });

  it("未跌阈值 → belowThreshold=false（仍可用）", () => {
    const memory = makeMemory({ confidence: 0.9 });
    const penalties = applyFailureFeedback({
      failure: makeFailure(),
      usages: [makeUsage()],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [memory],
    });
    expect(penalties[0].newConfidence).toBeGreaterThan(DEFAULT_DEMOTE_THRESHOLD);
    expect(penalties[0].belowThreshold).toBe(false);
  });

  it("quota 失败不扣任何记忆（与记忆无关，不误罚）", () => {
    const memory = makeMemory({ confidence: 0.9 });
    const penalties = applyFailureFeedback({
      failure: makeFailure({ reason: "quota", message: "rate limit exceeded" }),
      usages: [makeUsage()],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [memory],
    });
    expect(penalties).toHaveLength(0);
  });

  it("auth 失败不扣任何记忆", () => {
    const penalties = applyFailureFeedback({
      failure: makeFailure({ reason: "auth", message: "401 unauthorized" }),
      usages: [makeUsage()],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [makeMemory()],
    });
    expect(penalties).toHaveLength(0);
  });

  it("network 失败不扣任何记忆", () => {
    const penalties = applyFailureFeedback({
      failure: makeFailure({ reason: "network", message: "ECONNREFUSED" }),
      usages: [makeUsage()],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [makeMemory()],
    });
    expect(penalties).toHaveLength(0);
  });

  it("other 失败不扣任何记忆", () => {
    const penalties = applyFailureFeedback({
      failure: makeFailure({ reason: "other", message: "unknown" }),
      usages: [makeUsage()],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [makeMemory()],
    });
    expect(penalties).toHaveLength(0);
  });

  it("agent-not-found 但 usage 值不在失败消息里 → 不扣（不误罚无关记忆）", () => {
    const penalties = applyFailureFeedback({
      failure: makeFailure({
        message: "Agent not found for ID: agent-pub-OTHERKEY",
      }),
      usages: [makeUsage({ extractedValue: "agent-pub-01KYW7ABCDEF" })],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [makeMemory()],
    });
    expect(penalties).toHaveLength(0);
  });

  it("非 dispatch-agent 操作不扣（read-agent 失败可能另有原因）", () => {
    const penalties = applyFailureFeedback({
      failure: makeFailure(),
      usages: [makeUsage({ operation: "read-agent" })],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [makeMemory()],
    });
    expect(penalties).toHaveLength(0);
  });

  it("再次失败继续扣分（累加降权）", () => {
    // 第一次：0.9 → 0.65
    const memory1 = makeMemory({ confidence: 0.9 });
    const first = applyFailureFeedback({
      failure: makeFailure(),
      usages: [makeUsage()],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [memory1],
    });
    expect(first[0].newConfidence).toBeCloseTo(0.65, 5);

    // 第二次：从 0.65 继续扣 → 0.4
    const memory2 = makeMemory({ confidence: first[0].newConfidence });
    const second = applyFailureFeedback({
      failure: makeFailure(),
      usages: [makeUsage()],
      now: 0,
      nowIso: "2026-08-09T08:20:00.000Z",
      memories: [memory2],
    });
    expect(second[0].newConfidence).toBeCloseTo(0.4, 5);
  });

  it("同一记忆在多次失败后可跌到阈值以下并排除", () => {
    let confidence = 0.9;
    for (let i = 0; i < 3; i += 1) {
      const penalties = applyFailureFeedback({
        failure: makeFailure(),
        usages: [makeUsage()],
        now: 0,
        nowIso: `2026-08-09T08:${10 + i}:00.000Z`,
        memories: [makeMemory({ confidence })],
      });
      confidence = penalties[0].newConfidence;
    }
    // 0.9 - 0.25*3 = 0.15 < 0.3
    expect(confidence).toBeLessThan(DEFAULT_DEMOTE_THRESHOLD);
  });

  it("同一次失败中同一记忆多个 usage 命中只扣一次（一次失败=一次扣分）", () => {
    const penalties = applyFailureFeedback({
      failure: makeFailure(),
      usages: [
        makeUsage(),
        makeUsage({ extractedValue: "agent-pub-01KYW7ABCDEF" }),
      ],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [makeMemory({ confidence: 0.9 })],
    });
    expect(penalties).toHaveLength(1);
  });

  it("置信度 clamp 到 [0,1]：接近 0 时不溢出为负", () => {
    const penalties = applyFailureFeedback({
      failure: makeFailure(),
      usages: [makeUsage()],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [makeMemory({ confidence: 0.1 })],
    });
    expect(penalties[0].newConfidence).toBe(0);
  });

  it("历史记录字段完整：at/kind/from/to/reason", () => {
    const penalties = applyFailureFeedback({
      failure: makeFailure(),
      usages: [makeUsage()],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [makeMemory({ confidence: 0.9 })],
    });
    const history = penalties[0].history;
    expect(history.at).toBe("2026-08-09T08:10:00.000Z");
    expect(history.kind).toBe("demote");
    expect(history.from).toBeCloseTo(0.9, 5);
    expect(history.to).toBeCloseTo(0.65, 5);
    expect(history.reason).toContain("agent-not-found");
  });

  it("reason 记录失败原因（解释链）", () => {
    const penalties = applyFailureFeedback({
      failure: makeFailure({ message: "Agent not found for ID: agent-bad-key" }),
      usages: [makeUsage({ extractedValue: "agent-bad-key" })],
      now: 0,
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [makeMemory({ confidence: 0.9 })],
    });
    expect(penalties[0].reason).toContain("agent-bad-key");
  });
});

// ─────────────────────────── 用户显式纠正 ───────────────────────────

describe("applyUserCorrection（用户纠正优先于自动降权）", () => {
  it("直接设定目标置信度（不累加 delta）", () => {
    const record = applyUserCorrection({
      memoryId: "memory-001",
      targetConfidence: 0.1,
      nowIso: "2026-08-09T09:00:00.000Z",
      reason: "用户明确指出该 agentKey 编造",
      currentConfidence: 0.9,
    });
    expect(record.kind).toBe("user-correct");
    expect(record.from).toBeCloseTo(0.9, 5);
    expect(record.to).toBeCloseTo(0.1, 5);
    expect(record.reason).toBe("用户明确指出该 agentKey 编造");
  });

  it("目标置信度 clamp 到 [0,1]", () => {
    const record = applyUserCorrection({
      memoryId: "memory-001",
      targetConfidence: 1.5,
      nowIso: "2026-08-09T09:00:00.000Z",
      reason: "",
      currentConfidence: 0.9,
    });
    expect(record.to).toBe(1);
  });

  it("缺省 reason 用「用户明确纠正」", () => {
    const record = applyUserCorrection({
      memoryId: "memory-001",
      targetConfidence: 0.1,
      nowIso: "2026-08-09T09:00:00.000Z",
      currentConfidence: 0.9,
    });
    expect(record.reason).toBe("用户明确纠正");
  });
});

// ─────────────────────────── 召回过滤 ───────────────────────────

describe("filterRecallableMemories（召回过滤）", () => {
  it("阈值以上进 active，以下进 demoted", () => {
    const memories = [
      makeMemory({ id: "high", confidence: 0.8 }),
      makeMemory({ id: "low", confidence: 0.15 }),
    ];
    const { active, demoted } = filterRecallableMemories({ memories });
    expect(active.map((m) => m.id)).toEqual(["high"]);
    expect(demoted.map((m) => m.id)).toEqual(["low"]);
  });

  it("等于阈值仍算 active（边界 >= threshold）", () => {
    const memories = [makeMemory({ id: "edge", confidence: 0.3 })];
    const { active } = filterRecallableMemories({ memories });
    expect(active.map((m) => m.id)).toEqual(["edge"]);
  });

  it("自定义阈值生效", () => {
    const memories = [
      makeMemory({ id: "m", confidence: 0.35 }),
    ];
    const { active, demoted } = filterRecallableMemories({
      memories,
      threshold: 0.5,
    });
    expect(active).toHaveLength(0);
    expect(demoted.map((m) => m.id)).toEqual(["m"]);
  });

  it("demoted 记录保留（不删除）", () => {
    const memories = [makeMemory({ id: "low", confidence: 0.1 })];
    const { demoted } = filterRecallableMemories({ memories });
    expect(demoted).toHaveLength(1);
    // 记录仍在，供审计/档案
    expect(demoted[0].id).toBe("low");
  });
});

// ─────────────────────────── 召回档案 ───────────────────────────

describe("buildMemoryDossier（召回档案，禁止 LLM 自行推理）", () => {
  const baseHistory: MemoryCorrectionHistory[] = [
    {
      at: "2026-08-09T08:00:00.000Z",
      kind: "create",
      to: 0.3,
      reason: "模型推断 key = agent-pub-01KYW7ABCDEF",
      provenance: "inferred",
    },
    {
      at: "2026-08-09T08:05:00.000Z",
      kind: "verify",
      from: 0.3,
      to: 0.95,
      reason: "readAgent 通过",
      provenance: "verified",
    },
    {
      at: "2026-08-09T08:10:00.000Z",
      kind: "demote",
      from: 0.95,
      to: 0.7,
      reason: "第一次 agent-not-found",
    },
    {
      at: "2026-08-09T08:20:00.000Z",
      kind: "demote",
      from: 0.7,
      to: 0.45,
      reason: "第二次 agent-not-found",
    },
  ];

  it("档案包含内容、来源、置信度、历史、相关事件", () => {
    const dossier = buildMemoryDossier({
      memory: makeMemory({ confidence: 0.45, tags: ["verified"] }),
      history: baseHistory,
      relatedEvents: ["配额熔断模块由该 agent 实现"],
    });
    expect(dossier.content).toContain("agent-pub-01KYW7ABCDEF");
    expect(dossier.provenance).toBe("verified");
    expect(dossier.confidence).toBeCloseTo(0.45, 5);
    expect(dossier.history).toHaveLength(4);
    expect(dossier.relatedEvents).toContain("配额熔断模块由该 agent 实现");
  });

  it("档案文本是完整可读文本（LLM 直接读取，不推理）", () => {
    const dossier = buildMemoryDossier({
      memory: makeMemory({ confidence: 0.45, tags: ["verified"] }),
      history: baseHistory,
      relatedEvents: ["配额熔断模块由该 agent 实现"],
    });
    const text = dossier.dossierText;
    expect(text).toContain("记忆：");
    expect(text).toContain("来源：verified");
    expect(text).toContain("置信度：0.45");
    expect(text).toContain("历史：");
    expect(text).toContain("[初始]");
    expect(text).toContain("[验证]");
    expect(text).toContain("[降权]");
    expect(text).toContain("相关事件：配额熔断模块由该 agent 实现");
  });

  it("降权后（低于阈值）档案标注「已降权，不在活跃检索中」", () => {
    const dossier = buildMemoryDossier({
      memory: makeMemory({ confidence: 0.15, tags: [] }),
      history: [
        {
          at: "2026-08-09T08:10:00.000Z",
          kind: "demote",
          from: 0.4,
          to: 0.15,
          reason: "agent-not-found",
        },
      ],
    });
    expect(dossier.active).toBe(false);
    expect(dossier.dossierText).toContain("已降权，不在活跃检索中");
  });

  it("活跃记忆（>= 阈值）档案不标注降权", () => {
    const dossier = buildMemoryDossier({
      memory: makeMemory({ confidence: 0.8, tags: ["verified"] }),
      history: [],
    });
    expect(dossier.active).toBe(true);
    expect(dossier.dossierText).not.toContain("已降权");
  });

  it("inferred 高置信度（>SUSPECT）标记存疑", () => {
    // inferred 默认 0.4，但若被异常设为 0.9（数据不一致）应标记
    const dossier = buildMemoryDossier({
      memory: makeMemory({ confidence: 0.9, tags: [] }), // 无 verified tag → inferred
      history: [],
    });
    expect(dossier.provenance).toBe("inferred");
    expect(dossier.suspect).toBe(true);
    expect(dossier.dossierText).toContain("存疑");
  });

  it("inferred 低置信度不标记存疑", () => {
    const dossier = buildMemoryDossier({
      memory: makeMemory({ confidence: 0.4, tags: [] }),
      history: [],
    });
    expect(dossier.suspect).toBe(false);
  });

  it("verified 高置信度不标记存疑（验证过的可信）", () => {
    const dossier = buildMemoryDossier({
      memory: makeMemory({ confidence: 0.9, tags: ["verified"] }),
      history: [],
    });
    expect(dossier.suspect).toBe(false);
  });
});

describe("buildMemoryDossiers（批量档案）", () => {
  it("对每条记忆生成独立档案", () => {
    const memories = [
      makeMemory({ id: "m1", confidence: 0.8, tags: ["verified"] }),
      makeMemory({ id: "m2", confidence: 0.15, tags: [] }),
    ];
    const histories = new Map<string, MemoryCorrectionHistory[]>([
      ["m1", [{ at: "2026-08-09T08:00:00.000Z", kind: "create", to: 0.8, reason: "verified" }]],
      ["m2", []],
    ]);
    const dossiers = buildMemoryDossiers(memories, histories);
    expect(dossiers).toHaveLength(2);
    expect(dossiers[0].memoryId).toBe("m1");
    expect(dossiers[0].active).toBe(true);
    expect(dossiers[1].memoryId).toBe("m2");
    expect(dossiers[1].active).toBe(false);
  });

  it("历史缺失时按空数组处理（不报错）", () => {
    const memories = [makeMemory({ id: "m1", confidence: 0.8 })];
    const histories = new Map<string, MemoryCorrectionHistory[]>();
    const dossiers = buildMemoryDossiers(memories, histories);
    expect(dossiers[0].history).toEqual([]);
  });
});

// ─────────────────────────── 历史记录追加 ───────────────────────────

describe("appendCorrectionHistory", () => {
  it("追加不修改原数组（纯函数）", () => {
    const existing: MemoryCorrectionHistory[] = [
      { at: "2026-08-09T08:00:00.000Z", kind: "create", to: 0.3, reason: "初始" },
    ];
    const record: MemoryCorrectionHistory = {
      at: "2026-08-09T08:10:00.000Z",
      kind: "demote",
      from: 0.3,
      to: 0.05,
      reason: "失败降权",
    };
    const next = appendCorrectionHistory(existing, record);
    expect(existing).toHaveLength(1); // 原数组不变
    expect(next).toHaveLength(2);
    expect(next[1]).toBe(record);
  });
});

// ─────────────────────────── 闭环集成场景 ───────────────────────────

describe("闭环集成场景（模拟实测：编造 agentKey 导致两次失败）", () => {
  it("编造记忆 → 两次失败 → 降权排除 → 档案带完整历史", () => {
    // 1. 初始：模型凭印象推断 key，inferred，置信度 0.4
    let memory = makeMemory({ confidence: 0.4, tags: [] });
    let history: MemoryCorrectionHistory[] = [
      {
        at: "2026-08-09T08:00:00.000Z",
        kind: "create",
        to: 0.4,
        reason: "模型推断 key",
        provenance: "inferred",
      },
    ];

    // 2. 第一次派发失败
    const firstPenalty = applyFailureFeedback({
      failure: makeFailure(),
      usages: [makeUsage()],
      now: Date.parse("2026-08-09T08:10:00.000Z"),
      nowIso: "2026-08-09T08:10:00.000Z",
      memories: [memory],
    });
    expect(firstPenalty).toHaveLength(1);
    history = appendCorrectionHistory(history, firstPenalty[0].history);
    memory = { ...memory, confidence: firstPenalty[0].newConfidence };

    // 0.4 - 0.25 = 0.15 < 0.3，已低于阈值
    expect(firstPenalty[0].belowThreshold).toBe(true);

    // 3. 第二次又用同记忆派发（模拟实测：无阻止机制）
    const secondPenalty = applyFailureFeedback({
      failure: makeFailure(),
      usages: [makeUsage()],
      now: Date.parse("2026-08-09T08:20:00.000Z"),
      nowIso: "2026-08-09T08:20:00.000Z",
      memories: [memory],
    });
    expect(secondPenalty).toHaveLength(1);
    history = appendCorrectionHistory(history, secondPenalty[0].history);
    memory = { ...memory, confidence: secondPenalty[0].newConfidence };

    // 4. 召回过滤：该记忆应被排除
    const { active, demoted } = filterRecallableMemories({ memories: [memory] });
    expect(active).toHaveLength(0);
    expect(demoted).toHaveLength(1);

    // 5. 召回档案：带完整历史，LLM 直接读取不推理
    const dossier = buildMemoryDossier({
      memory,
      history,
      relatedEvents: ["曾被用于派发 agent，导致两次 agent-not-found"],
    });
    expect(dossier.active).toBe(false);
    expect(dossier.dossierText).toContain("[初始]");
    expect(dossier.dossierText).toContain("[降权]");
    expect(dossier.dossierText).toContain("已降权，不在活跃检索中");
    expect(dossier.dossierText).toContain(
      "曾被用于派发 agent，导致两次 agent-not-found",
    );
  });

  it("用户纠正优先于自动降权：用户直接排除后，该记忆不再被用作可用记忆", () => {
    const memory = makeMemory({ confidence: 0.9, tags: ["verified"] });
    const record = applyUserCorrection({
      memoryId: memory.id,
      targetConfidence: 0.05,
      nowIso: "2026-08-09T09:00:00.000Z",
      reason: "用户明确指出该 agentKey 是编造的",
      currentConfidence: 0.9,
    });
    const corrected = { ...memory, confidence: record.to };
    const { active } = filterRecallableMemories({ memories: [corrected] });
    expect(active).toHaveLength(0);
  });
});