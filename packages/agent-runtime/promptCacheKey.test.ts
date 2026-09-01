import { describe, expect, test } from "bun:test";
import {
  collectStablePromptPrefix,
  stablePromptCacheKey,
} from "./promptCacheKey";
import {
  buildPlatformChatCompletionRequest,
  resolvePlatformChatProviderConfig,
} from "./platformChatProvider";

describe("stable prompt cache key", () => {
  test("只取 system 的稳定前缀段，忽略 stable_prefix_chars 之后的动态尾巴", () => {
    const messages = [
      { role: "system", content: "STABLE_PART|DYNAMIC_TAIL", stable_prefix_chars: 11 },
      { role: "user", content: "hi" },
    ];
    expect(collectStablePromptPrefix(messages)).toBe("STABLE_PART");
  });

  test("没有 stable_prefix_chars 标记时整条 system 都算稳定", () => {
    expect(collectStablePromptPrefix([{ role: "system", content: " whole " }])).toBe("whole");
  });

  test("同样的取材得到同样的键，不同 model 得到不同的键", () => {
    const a = stablePromptCacheKey(["m1", "prefix", []], "nolo-chat");
    expect(stablePromptCacheKey(["m1", "prefix", []], "nolo-chat")).toBe(a);
    expect(stablePromptCacheKey(["m2", "prefix", []], "nolo-chat")).not.toBe(a);
    expect(a.startsWith("nolo-chat-")).toBe(true);
  });
});

/**
 * 键的全部价值在于「跨轮不变」：把增长中的历史算进去，键每轮都变，
 * 等于没有键——多副本共享池照样把请求路由到没有缓存的节点。
 */
test("工具循环里历史增长不改变 prompt_cache_key", async () => {
  const providerConfig = await resolvePlatformChatProviderConfig({
    agentConfig: { key: "agent-pub-x", provider: "nolo", model: "glm-5-3-flash" },
    env: { NOLO_SERVER: "https://nolo.chat", AUTH_TOKEN: "token" },
  });
  const system = {
    role: "system" as const,
    content: "稳定前缀|本轮动态块",
    stable_prefix_chars: 4,
  };
  const keyOf = (messages: any[]) =>
    JSON.parse(
      String(
        buildPlatformChatCompletionRequest({
          providerConfig,
          messages,
          stream: true,
        }).init.body,
      ),
    ).prompt_cache_key;

  const round1 = keyOf([system, { role: "user", content: "开始" }]);
  const round2 = keyOf([
    system,
    { role: "user", content: "开始" },
    { role: "assistant", content: "第一轮的大段输出".repeat(200) },
    { role: "user", content: "继续" },
  ]);

  expect(round1).toBeTruthy();
  expect(round2).toBe(round1);

  // system 稳定段真的变了（换 agent / 换技能）时，键必须跟着变
  const changed = keyOf([
    { ...system, content: "别的前缀|本轮动态块" },
    { role: "user", content: "开始" },
  ]);
  expect(changed).not.toBe(round1);
});
