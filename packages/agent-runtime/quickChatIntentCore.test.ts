import { describe, expect, it } from "bun:test";
import {
  buildQuickChatIntentSystemPrompt,
  estimateComplexity,
  isShortGreeting,
  parseQuickChatIntentResult,
  type TierAgentOption,
} from "./quickChatIntentCore";

const TIER_AGENTS: TierAgentOption[] = [
  { tier: "flash", agentKey: "agent-flash", description: "快速简单" },
  { tier: "balanced", agentKey: "agent-balanced", description: "平衡推理" },
  { tier: "quality", agentKey: "agent-quality", description: "高质量深度" },
];

describe("isShortGreeting", () => {
  it("matches pure short greetings in zh/en", () => {
    for (const text of ["hi", "Hello!", "你好", "谢谢", "好的", "拜拜", "早上好~"]) {
      expect(isShortGreeting(text)).toBe(true);
    }
  });

  it("does not match empty, whitespace, or longer text", () => {
    expect(isShortGreeting("")).toBe(false);
    expect(isShortGreeting("   ")).toBe(false);
    expect(isShortGreeting("你好，帮我做个网站")).toBe(false);
    expect(isShortGreeting("hi, implement login")).toBe(false);
    expect(isShortGreeting("这是一个明显超过二十个字符的问候句子不会被吃掉")).toBe(false);
  });
});

describe("estimateComplexity", () => {
  it("classifies by length, keywords and code blocks", () => {
    expect(estimateComplexity("写一首诗")).toBe("simple");
    expect(estimateComplexity("分析一下这个架构的优缺点")).toBe("medium");
    expect(estimateComplexity("x".repeat(600))).toBe("complex");
    expect(estimateComplexity("```\ncode\n```")).toBe("complex");
  });
});

describe("buildQuickChatIntentSystemPrompt", () => {
  it("embeds all route keys and the JSON output contract", () => {
    const prompt = buildQuickChatIntentSystemPrompt(TIER_AGENTS);
    for (const t of TIER_AGENTS) {
      expect(prompt).toContain(t.agentKey);
      expect(prompt).toContain(t.description);
    }
    expect(prompt).toContain("confidence");
    expect(prompt).toContain("只输出 JSON");
  });
});

describe("parseQuickChatIntentResult", () => {
  it("accepts a valid result with confidence", () => {
    const parsed = parseQuickChatIntentResult(
      '{"confidence":0.8,"agentKey":"agent-balanced"}',
      TIER_AGENTS,
    );
    expect(parsed).toEqual({
      agentKey: "agent-balanced",
      confidence: 0.8,
    });
  });

  it("rejects agentKey not in the route options", () => {
    expect(
      parseQuickChatIntentResult('{"agentKey":"agent-unknown"}', TIER_AGENTS),
    ).toBeNull();
  });

  it("rejects invalid JSON and missing agentKey", () => {
    expect(parseQuickChatIntentResult("not json", TIER_AGENTS)).toBeNull();
    expect(parseQuickChatIntentResult('{"foo":1}', TIER_AGENTS)).toBeNull();
  });

  it("drops bad confidence", () => {
    expect(
      parseQuickChatIntentResult('{"agentKey":"agent-flash"}', TIER_AGENTS),
    ).toEqual({ agentKey: "agent-flash", confidence: undefined });
    expect(
      parseQuickChatIntentResult(
        '{"agentKey":"agent-flash","confidence":1.5}',
        TIER_AGENTS,
      )!.confidence,
    ).toBeUndefined();
  });

  it("parses skills and filters illegal/duplicate values", () => {
    expect(
      parseQuickChatIntentResult(
        '{"agentKey":"agent-balanced","skills":["table","code"]}',
        TIER_AGENTS,
      )!.skills,
    ).toEqual(["table", "code"]);
    expect(
      parseQuickChatIntentResult(
        '{"agentKey":"agent-balanced","skills":["doc","table","code","plan","table","invalid"]}',
        TIER_AGENTS,
      )!.skills,
    ).toEqual(["doc", "table", "code"]);
  });

  it("parses pagebuilder skill alongside other skills", () => {
    expect(
      parseQuickChatIntentResult(
        '{"agentKey":"agent-balanced","skills":["pagebuilder"]}',
        TIER_AGENTS,
      )!.skills,
    ).toEqual(["pagebuilder"]);
    expect(
      parseQuickChatIntentResult(
        '{"agentKey":"agent-balanced","skills":["pagebuilder","table"]}',
        TIER_AGENTS,
      )!.skills,
    ).toEqual(["pagebuilder", "table"]);
  });

  it("treats missing/empty skills as absent (backward compatible)", () => {
    expect(
      parseQuickChatIntentResult('{"agentKey":"agent-flash"}', TIER_AGENTS)!
        .skills,
    ).toBeUndefined();
    expect(
      parseQuickChatIntentResult(
        '{"agentKey":"agent-flash","skills":[]}',
        TIER_AGENTS,
      )!.skills,
    ).toBeUndefined();
    expect(
      parseQuickChatIntentResult(
        '{"agentKey":"agent-flash","skills":"table"}',
        TIER_AGENTS,
      )!.skills,
    ).toBeUndefined();
  });
});
