/**
 * 稳定 prompt 缓存键。
 *
 * 为什么需要：托管上游是多副本共享池（RunInfra 的 429 会直说
 * "the shared hosted model is momentarily near its concurrency limit of 32"）。
 * 前缀缓存是节点本地的，请求被路由到另一个副本就整条 miss。实测本地近 14 天
 * glm-5-3-flash 的 token 记录：417 次整 miss（cached=0）发生在「同一次 saveTurn
 * 批次里兄弟轮次命中良好」的批中，浪费 5756 万 token —— 占该模型全部 miss token
 * 的 52%。轮内 system 稳定前缀按构造逐字节相同（buildMessages 在工具循环外只算
 * 一次），所以那些整 miss 不可能是我们的字节变了。
 *
 * `prompt_cache_key` 是 OpenAI 系网关的标准缓存路由提示。已实测 RunInfra 接受该
 * 字段（HTTP 200，且不破坏既有命中）；**是否真的改善亲和性尚未验证**，验证方法见
 * 本文件末尾注释。
 *
 * 键的取材必须只含**跨轮稳定**的部分：model + system 稳定前缀 + 工具定义。
 * 把增长中的历史算进去会让键每轮都变，等于没有键。
 */

/**
 * 取 system/developer 消息里的稳定前缀部分。
 *
 * `stable_prefix_chars` 由 localLoop 的 buildMessages 写入，标记 system 消息里
 * 「session 作用域、逐轮不变」的那一段长度；没有该标记时整条 system 都算稳定。
 */
export function collectStablePromptPrefix(
  messages: unknown[],
  fallbackPrompt?: string,
): string {
  const systemTexts: string[] = [];
  if (fallbackPrompt?.trim()) systemTexts.push(fallbackPrompt.trim());
  for (const raw of messages) {
    if (!raw || typeof raw !== "object") continue;
    const message = raw as Record<string, unknown>;
    const role = String(message.role ?? "");
    if (role !== "system" && role !== "developer") continue;
    if (typeof message.content === "string") {
      const boundary = Number(message.stable_prefix_chars);
      const text =
        Number.isFinite(boundary) && boundary > 0
          ? message.content.slice(0, boundary)
          : message.content;
      if (text.trim()) systemTexts.push(text.trim());
    }
  }
  return systemTexts.join("\n\n");
}

/** FNV-1a：与 contextCompiler 的前缀指纹同族，稳定且无依赖。 */
export function stablePromptCacheKey(parts: unknown[], namespace: string): string {
  const value = JSON.stringify(parts);
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${namespace}-${hash.toString(16).padStart(8, "0")}`;
}

// 上线后如何验收（不要凭感觉判断）：对同一模型比较改动前后的
//   「整 miss 且同批兄弟命中良好」次数 / 该模型总 miss token 占比。
// 数据源是本地 token 记录（token-<userId>-*，字段 input_tokens /
// cache_read_input_tokens / dialogId / timestamp）；同一次 saveTurn 批次
// 用「同 dialog 且 timestamp 相差 ≤50ms」聚类识别（timestamp 是落库时间，
// 不是调用时间，别拿它当调用间隔用）。基线：417 次 / 5756 万 token / 52%。
