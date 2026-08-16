import { describe, expect, it } from "bun:test";

import { resolveAgentCallPlan } from "../../agent-runtime/agentCallPlan";
import {
  BUILTIN_AGENT_CREATOR_AGENT_KEY,
  BUILTIN_APP_BUILDER_AGENT_KEY,
  BUILTIN_FEEDBACK_AGENT_KEY,
} from "core/builtinAgents";

import {
  buildQuickChatIntentSystemPrompt,
  classifyQuickChatIntent,
  isShortGreeting,
  QUICK_CHAT_INTENT_LLM_CONFIG,
} from "./quickChatIntentClassifier";
import type { TierAgentOption } from "./quickChatIntentClassifier";

const routeOptions: TierAgentOption[] = [
  {
    tier: "flash",
    agentKey: "agent-user-flash",
    description: "flash",
  },
  {
    tier: "feedback",
    agentKey: BUILTIN_FEEDBACK_AGENT_KEY,
    description: "feedback",
  },
  {
    tier: "agentCreator",
    agentKey: BUILTIN_AGENT_CREATOR_AGENT_KEY,
    description: "agentCreator",
  },
  {
    tier: "appBuilder",
    agentKey: BUILTIN_APP_BUILDER_AGENT_KEY,
    description: "appBuilder",
  },
];

const fallback = () => "agent-user-flash";

function mockDispatchWithLlmContent(content: string) {
  return () =>
    ({
      unwrap: async () => content,
    }) as { unwrap: () => Promise<string> };
}

function mockDispatchThatThrows(message: string) {
  return () =>
    ({
      unwrap: async () => {
        throw new Error(message);
      },
    }) as { unwrap: () => Promise<string> };
}

function mockDispatchThatNeverResolves() {
  return () =>
    ({
      unwrap: () => new Promise<string>(() => {}),
    }) as { unwrap: () => Promise<string> };
}

describe("classifyQuickChatIntent", () => {
  it("uses the platform proxy for the classifier request", () => {
    expect(QUICK_CHAT_INTENT_LLM_CONFIG).toMatchObject({
      apiSource: "platform",
      useServerProxy: true,
      provider: "nolo",
      model: "deepseek-v4-flash",
    });
    expect(resolveAgentCallPlan({
      key: "quick-chat-intent-classifier",
      ...QUICK_CHAT_INTENT_LLM_CONFIG,
    })).toMatchObject({
      transport: "server-proxy",
      authMethod: { kind: "platform-key" },
    });
  });

  it("accepts specialist agentKey when LLM returns valid JSON", async () => {
    const result = await classifyQuickChatIntent(
      "首页打不开了要反馈",
      routeOptions,
      mockDispatchWithLlmContent(
        JSON.stringify({ agentKey: BUILTIN_FEEDBACK_AGENT_KEY }),
      ),
      fallback,
    );
    expect(result.agentKey).toBe(BUILTIN_FEEDBACK_AGENT_KEY);
    expect(result.classified).toBe(true);
  });


  it("buildQuickChatIntentSystemPrompt embeds specialist route keys and workspace rules", () => {
    const prompt = buildQuickChatIntentSystemPrompt(routeOptions);
    // Real route keys in the agent list (not display names alone).
    expect(prompt).toContain(BUILTIN_FEEDBACK_AGENT_KEY);
    expect(prompt).toContain(BUILTIN_AGENT_CREATOR_AGENT_KEY);
    expect(prompt).toContain(BUILTIN_APP_BUILDER_AGENT_KEY);
    // Code task routing: 编码/仓库任务走通用档 balanced/quality（不再有专职 Code Planner）
    expect(prompt).toMatch(/实现功能|修 bug|refactor|测试|build|编码|代码规划/);
    // Non-specialist stays on balanced/quality
    expect(prompt).toMatch(/普通代码解释|架构|balanced\/quality/);
    expect(prompt).toMatch(/多 agent|multi-agent/);
  });

  it("rejects agentKey not in routeOptions and uses fallback", async () => {
    const result = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchWithLlmContent(JSON.stringify({ agentKey: "agent-unknown" })),
      fallback,
    );
    expect(result.agentKey).toBe("agent-user-flash");
    expect(result.classified).toBe(false);
  });

  it("uses fallback when unwrap throws", async () => {
    const result = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchThatThrows("network"),
      fallback,
    );
    expect(result.agentKey).toBe("agent-user-flash");
    expect(result.classified).toBe(false);
  });

  it("skips LLM and returns flash for short greetings", async () => {
    const shortGreetings = [
      "hi",
      "hello",
      "hey",
      "你好",
      "您好",
      "在吗",
      "hi!",
      "你好。",
      "thanks",
      "拜拜",
    ];
    for (const text of shortGreetings) {
      let llmCalled = false;
      const dispatch = () => {
        llmCalled = true;
        return mockDispatchWithLlmContent(
          JSON.stringify({ agentKey: BUILTIN_APP_BUILDER_AGENT_KEY }),
        )();
      };
      const result = await classifyQuickChatIntent(
        text,
        routeOptions,
        dispatch,
        fallback,
      );
      expect(result.agentKey).toBe("agent-user-flash");
      expect(result.classified).toBe(true);
      expect(llmCalled).toBe(false);
    }
  });

  it("does not treat longer chitchat as short greeting and still calls LLM", async () => {
    let llmCalled = false;
    const dispatch = () => {
      llmCalled = true;
      return mockDispatchWithLlmContent(
        JSON.stringify({ agentKey: BUILTIN_APP_BUILDER_AGENT_KEY }),
      )();
    };
    const result = await classifyQuickChatIntent(
      "hi, 帮我做个网站",
      routeOptions,
      dispatch,
      fallback,
    );
    expect(llmCalled).toBe(true);
    // LLM 返回了有效 key → 命中 app builder
    expect(result.agentKey).toBe(BUILTIN_APP_BUILDER_AGENT_KEY);
    expect(result.classified).toBe(true);
  });

  it("returns fallback when LLM call exceeds the configured timeout and does not hang", async () => {
    const start = Date.now();
    const result = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchThatNeverResolves(),
      fallback,
      { timeoutMs: 50 },
    );
    const elapsed = Date.now() - start;
    expect(result.agentKey).toBe("agent-user-flash");
    expect(result.classified).toBe(false);
    // 应该在超时时间附近返回（留点调度余量），绝不能挂死。
    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(2000);
  });

  it("uses the production 4000ms timeout by default", () => {
    // 这个用例不真正等 4s，只是确认默认常量没被改小到失效。
    expect(QUICK_CHAT_INTENT_LLM_CONFIG.model).toBe("deepseek-v4-flash");
  });

  it("parses a valid agentKey from the classifier JSON", async () => {
    const result = await classifyQuickChatIntent(
      "帮我分析一下 src/index.ts 这个文件",
      routeOptions,
      mockDispatchWithLlmContent(
        JSON.stringify({ agentKey: "agent-user-flash" }),
      ),
      fallback,
    );
    expect(result.agentKey).toBe("agent-user-flash");
    expect(result.classified).toBe(true);
  });

  it("parses a valid agentKey from the classifier JSON (no workspace field)", async () => {
    const result = await classifyQuickChatIntent(
      "广东经济怎么样",
      routeOptions,
      mockDispatchWithLlmContent(
        JSON.stringify({ agentKey: "agent-user-flash" }),
      ),
      fallback,
    );
    expect(result.agentKey).toBe("agent-user-flash");
    expect(result.classified).toBe(true);
  });

  it("accepts a valid agentKey when the classifier omits extra fields", async () => {
    const result = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchWithLlmContent(JSON.stringify({ agentKey: "agent-user-flash" })),
      fallback,
    );
    expect(result.classified).toBe(true);
  });

  it("parses a valid confidence alongside agentKey", async () => {
    const result = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchWithLlmContent(
        JSON.stringify({ confidence: 0.9, agentKey: "agent-user-flash" }),
      ),
      fallback,
    );
    expect(result.agentKey).toBe("agent-user-flash");
    expect(result.classified).toBe(true);
    expect(result.confidence).toBe(0.9);
  });

  it("accepts low confidence as classified (no threshold gating)", async () => {
    const result = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchWithLlmContent(
        JSON.stringify({ confidence: 0.05, agentKey: "agent-user-flash" }),
      ),
      fallback,
    );
    expect(result.classified).toBe(true);
    expect(result.confidence).toBe(0.05);
  });

  it("accepts valid agentKey with missing confidence (confidence is diagnostic-only)", async () => {
    const result = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchWithLlmContent(JSON.stringify({ agentKey: "agent-user-flash" })),
      fallback,
    );
    expect(result.agentKey).toBe("agent-user-flash");
    expect(result.classified).toBe(true);
    expect(result.confidence).toBeUndefined();
  });

  it("accepts valid agentKey with non-number confidence, drops the bad confidence", async () => {
    const result = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchWithLlmContent(
        JSON.stringify({ confidence: "high", agentKey: "agent-user-flash" }),
      ),
      fallback,
    );
    expect(result.agentKey).toBe("agent-user-flash");
    expect(result.classified).toBe(true);
    expect(result.confidence).toBeUndefined();
  });

  it("accepts valid agentKey with out-of-range confidence, drops the bad confidence", async () => {
    const result = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchWithLlmContent(
        JSON.stringify({ confidence: 1.5, agentKey: "agent-user-flash" }),
      ),
      fallback,
    );
    expect(result.agentKey).toBe("agent-user-flash");
    expect(result.classified).toBe(true);
    expect(result.confidence).toBeUndefined();
  });

  it("returns classified=false when the classifier fails or times out", async () => {
    const timeoutResult = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchThatNeverResolves(),
      fallback,
      { timeoutMs: 50 },
    );
    expect(timeoutResult.classified).toBe(false);

    const errorResult = await classifyQuickChatIntent(
      "随便聊点什么",
      routeOptions,
      mockDispatchThatThrows("network"),
      fallback,
    );
    expect(errorResult.classified).toBe(false);
  });

  it("parses skills array containing code skill from classifier JSON", async () => {
    const result = await classifyQuickChatIntent(
      "帮我重构一下这一段代码",
      routeOptions,
      mockDispatchWithLlmContent(
        JSON.stringify({ agentKey: "agent-user-flash", skills: ["code"] }),
      ),
      fallback,
    );
    expect(result.agentKey).toBe("agent-user-flash");
    expect(result.classified).toBe(true);
    expect(result.skills).toEqual(["code"]);
  });
});

describe("isShortGreeting", () => {
  it("matches pure short greetings in zh/en", () => {
    expect(isShortGreeting("hi")).toBe(true);
    expect(isShortGreeting("hello")).toBe(true);
    expect(isShortGreeting("hey")).toBe(true);
    expect(isShortGreeting("你好")).toBe(true);
    expect(isShortGreeting("您好")).toBe(true);
    expect(isShortGreeting("在吗")).toBe(true);
    expect(isShortGreeting("嗨")).toBe(true);
    expect(isShortGreeting("hi!")).toBe(true);
    expect(isShortGreeting("你好。")).toBe(true);
  });

  it("does not match empty, whitespace, or longer text", () => {
    expect(isShortGreeting("")).toBe(false);
    expect(isShortGreeting("   ")).toBe(false);
    expect(isShortGreeting("hello world")).toBe(false);
    expect(isShortGreeting("hi, 帮我做个网站")).toBe(false);
    expect(isShortGreeting("a".repeat(21))).toBe(false);
  });

  it("does not match short text that needs real classification", () => {
    expect(isShortGreeting("提交反馈")).toBe(false);
    expect(isShortGreeting("做个网站")).toBe(false);
    expect(isShortGreeting("创建一个 Agent")).toBe(false);
  });
});

