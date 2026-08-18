/**
 * LLM 提取 understanding memory 候选——替代原来的中文正则穷举。
 *
 * 为什么换掉正则：原实现用 `[你我](?:更)?喜欢(.+)` 这类模式逐条枚举中文表达，
 * 召回率完全取决于模式表是否覆盖了用户这次的措辞（「请记得」漏掉、英文归零），
 * 而漏掉的部分没有任何信号——不会报错，只是永远不记。判据本身放错了层：
 * 「这句话是否表达了一个稳定偏好」是语义判断，不是字符串匹配。
 *
 * 产出结构与原正则版完全一致（facet + patternKey + tags），因为下游依赖它：
 * `understandingGreeting.ts` 按 `tags.includes("understanding-memory")` 和
 * `item.facet` 挑选开场白锚点，`understanding.ts` 的 episodic→semantic 合并按
 * patternKey 去重。换掉抽取方式不能改变这层契约。
 */

import type { MemoryFacet } from "./types";

/** 与 dialogLearning 共用签名：由调用方注入（server 直接 fetch，client 走 API）。 */
export type UnderstandingLlmCall = (
  systemPrompt: string,
  content: string
) => Promise<string>;

export interface UnderstandingMemoryCandidate {
  facet: MemoryFacet;
  content: string;
  importance: number;
  confidence: number;
  patternKey: string;
  tags: string[];
}

export const UNDERSTANDING_TAG = "understanding-memory";

const VALID_FACETS = new Set<MemoryFacet>([
  "preference",
  "tension",
  "unfinished",
  "goal",
  "style",
]);

export const UNDERSTANDING_SYSTEM_PROMPT = `你是一个用户理解提取器。从一段对话中提取关于「这个用户是谁、想要什么」的稳定信号。

只提取以下五类，没有就返回空数组：

1. preference：用户在意什么、怕什么、不想要什么。例如"更在意信任感""更怕第一封把用户吓跑"。
2. style：用户希望你怎么回复——篇幅、结构、语气、称呼、详略。例如"更喜欢先给结论再给推理""不喜欢长篇解释"。
3. goal：用户这一阶段想先达成什么。例如"想先把第一封欢迎邮件的体验做稳"。
4. tension：用户正在权衡的两难。例如"在权衡稳定可信的首体验与更强运营能力"。
5. unfinished：用户明确尚未决定、还没想好的事。例如"还没决定第一阶段要不要上 marketing 分组"。

严格要求：
- 只提取对话里真实出现的信号，不要推测、不要编造、不要为凑数勉强抽取。
- 疑问句不是 goal——用户在问「先做哪块」不等于他决定了先做某块。
- 一次性任务细节、当前进度、很快过期的事实，都不要提取。
- 每条写成一句独立可懂的话，不依赖对话上下文，使用对话主语言。
- 用第三人称描述用户的状态，不要用"你"开头。
- 没有可提取的信号就返回 []。

输出格式：JSON 数组，每个元素含 facet 和 content 两个字段。
示例：
[{"facet":"preference","content":"更在意信任感，不想一上来就很促销"},{"facet":"style","content":"更喜欢先看结论再看推理过程"}]

只输出 JSON 数组，不要其他文字。`;

const buildPatternKey = (facet: MemoryFacet, content: string): string =>
  `understanding:${facet}:${content.toLowerCase()}`;

/**
 * 打分沿用原正则版的数值，保持既有记忆与新记忆在排序里可比。
 * unfinished/tension 最高：它们描述「还悬着的事」，对下一轮最有用。
 */
export const buildUnderstandingCandidate = (
  facet: MemoryFacet,
  rawContent: string
): UnderstandingMemoryCandidate | null => {
  const content = rawContent.trim().replace(/[。！？!?；;]+$/u, "").trim();
  if (!content || content.length < 6) return null;
  if (content.length > 200) return null;

  const importance =
    facet === "unfinished" ? 0.91 :
    facet === "tension" ? 0.89 :
    facet === "preference" ? 0.84 :
    facet === "style" ? 0.8 :
    0.82;
  const confidence =
    facet === "unfinished" || facet === "tension" ? 0.76 : 0.72;

  return {
    facet,
    content,
    importance,
    confidence,
    patternKey: buildPatternKey(facet, content),
    tags: [UNDERSTANDING_TAG, `memory-facet:${facet}`],
  };
};

const MAX_CANDIDATES_PER_TURN = 50;

/** 解析 LLM 返回的 JSON 数组；任何解析失败都退化为「没提取到」而不是抛错。 */
export const parseUnderstandingResponse = (
  raw: string
): UnderstandingMemoryCandidate[] => {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "[]") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  // A single turn cannot legitimately yield dozens of stable signals. Bound the
  // loop so a runaway or hostile model response cannot turn parsing into work —
  // this is untrusted input no matter which model produced it.
  if (parsed.length > MAX_CANDIDATES_PER_TURN) return [];

  const candidates: UnderstandingMemoryCandidate[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const facet = obj.facet as MemoryFacet;
    if (typeof facet !== "string" || !VALID_FACETS.has(facet)) continue;
    const content = typeof obj.content === "string" ? obj.content : "";
    const candidate = buildUnderstandingCandidate(facet, content);
    if (!candidate) continue;
    const key = `${candidate.facet}:${candidate.content.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(candidate);
  }
  return candidates;
};

const MAX_TRACE_MESSAGES = 20;
const MAX_CONTENT_CHARS = 6000;

const contentToText = (content: unknown): string => {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part: any) => (part?.type === "text" ? String(part.text).trim() : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
};

export const buildUnderstandingDialogText = (input: {
  userInput: string;
  trace?: Array<{ role?: string; content?: unknown }>;
}): string => {
  const lines: string[] = [`U: ${input.userInput.trim()}`];
  for (const message of (input.trace ?? []).slice(-MAX_TRACE_MESSAGES)) {
    if (message?.role !== "assistant" && message?.role !== "user") continue;
    const text = contentToText(message.content);
    if (text) lines.push(`${message.role === "assistant" ? "A" : "U"}: ${text}`);
  }
  const joined = lines.join("\n");
  return joined.length > MAX_CONTENT_CHARS
    ? `${joined.slice(0, MAX_CONTENT_CHARS)}\n[...truncated]`
    : joined;
};

/**
 * 提取候选。LLM 调用失败一律退化为空数组——漏记一条远好过让整轮对话失败。
 */
export const extractUnderstandingMemoryCandidates = async (input: {
  userInput: string;
  trace?: Array<{ role?: string; content?: unknown }>;
  llmCall: UnderstandingLlmCall;
}): Promise<UnderstandingMemoryCandidate[]> => {
  const dialogText = buildUnderstandingDialogText(input);
  if (!dialogText.trim()) return [];
  try {
    const raw = await input.llmCall(UNDERSTANDING_SYSTEM_PROMPT, dialogText);
    return parseUnderstandingResponse(raw);
  } catch (err) {
    console.warn("[memory] understanding LLM extraction failed", { error: err });
    return [];
  }
};
