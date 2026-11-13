import { tokenize } from "../rank";
import type { MemoryEntityVNext, MemoryStateVNext } from "./types";

/**
 * Memory vNext M4/M5 — cheap local recall over current States.
 *
 * Foreground-safe: pure, synchronous, no LLM, no I/O (the caller loads the
 * owner context once). Uses the legacy ranker's `tokenize` (words + CJK
 * bigrams) so legacy and vNext share one notion of lexical relevance.
 *
 * Relevance gate: a State is recalled when at least MIN_SHARED_TOKENS distinct
 * query tokens appear in its facet / text / Entity name / aliases. At production
 * corpus size a single **rare** token (document frequency ≤ 5%) is already
 * sufficient — short queries like "clash" tokenize to one word and would
 * otherwise never be recalled. One shared CJK bigram (e.g. "技术") is too weak
 * a signal to inject memory into an unrelated conversation.
 */

export const MIN_SHARED_TOKENS = 2;
export const MAX_LOCAL_RECALL_STATES = 8;

/**
 * IDF 门控：小语料下统计量没有意义，且会让既有小样本断言变得脆弱，
 * 所以只在语料达到这个规模后才启用。
 */
export const IDF_MIN_CORPUS = 20;

/**
 * 文档频率占比**不高于**此值（代码是 `df <= cutoff`，不是 `<`）的 token
 * 算「稀有词」。生产库实测（871 条 State）：`worktree`/`grok` 这类 ≈0.5%，
 * 而 `本机`/`系统`/`分组` 这类泛词会超过 5%——正是它们造成了
 * 「Claude 分组」误召回时区记忆。
 */
export const RARE_DF_RATIO = 0.05;

export interface MemoryVNextLocalRecallHit {
  state: MemoryStateVNext;
  /** Distinct query tokens found in the State's searchable text. */
  sharedTokens: number;
}

/**
 * Safe, unambiguous domain-specific synonyms.
 * Deliberately excludes high-collision general verbs like "run" / "running" / "jog",
 * which cause false positive bleed in software tasks (e.g. "how to run deploy script").
 */
const SAFE_TECHNICAL_SYNONYMS: Record<string, string[]> = {
  pr: ["审查", "代码审查", "diff"],
  diff: ["审查", "代码审查"],
  review: ["审查", "代码审查"],
  deploy: ["部署", "发版"],
  release: ["发版", "发布"],
  desktop: ["桌面", "桌面端"],
};

const distinctTokens = (text: string): Set<string> =>
  new Set(tokenize(text).filter((token) => token.length >= 2));

const haystackTokens = (
  state: MemoryStateVNext,
  entity: MemoryEntityVNext | undefined
): Set<string> =>
  distinctTokens(
    [state.facet, state.text, entity?.name ?? "", ...(entity?.aliases ?? [])].join(" ")
  );

export const recallMemoryVNextLocal = (input: {
  query: string;
  entities: readonly MemoryEntityVNext[];
  states: readonly MemoryStateVNext[];
  limit?: number;
}): MemoryVNextLocalRecallHit[] => {
  const rawTokens = distinctTokens(input.query);
  if (rawTokens.size === 0) return [];

  const queryTokens = new Set<string>(rawTokens);
  for (const token of rawTokens) {
    const syns = SAFE_TECHNICAL_SYNONYMS[token.toLowerCase()];
    if (syns) {
      for (const syn of syns) {
        for (const t of distinctTokens(syn)) queryTokens.add(t);
      }
    }
  }

  const entityById = new Map(input.entities.map((entity) => [entity.id, entity]));

  // 先做一次 tokenize（每个 State 只切一次，避免下面重复计算）。
  const prepared: Array<{ state: MemoryStateVNext; tokens: Set<string> }> = [];
  for (const state of input.states) {
    if (state.retiredAt || !state.text.trim()) continue;
    prepared.push({
      state,
      tokens: haystackTokens(state, entityById.get(state.entityId)),
    });
  }
  if (prepared.length === 0) return [];

  // IDF 门控：为每个 query token 算文档频率，泛词降权。
  // 语料太小（< IDF_MIN_CORPUS）时统计无意义，跳过门控，行为与旧版一致。
  const useIdf = prepared.length >= IDF_MIN_CORPUS;
  const rareCutoff = prepared.length * RARE_DF_RATIO;
  const rareTokens = new Set<string>();
  if (useIdf) {
    for (const token of queryTokens) {
      let df = 0;
      for (const item of prepared) if (item.tokens.has(token)) df++;
      // 只有「库里存在但少见」的词才算稀有词。
      // df === 0 表示整个语料里没有这个词——它无法区分相关与不相关，
      // 若把它算作稀有词，带一个生词的正常 query（如「本机系统配置是什么」
      // 里的「是什/什么」）会激活下面的丢弃规则，把只命中泛词的状态全部丢掉。
      if (df > 0 && df <= rareCutoff) rareTokens.add(token);
    }
  }

  const scored: Array<MemoryVNextLocalRecallHit & { score: number }> = [];
  for (const item of prepared) {
    let sharedTokens = 0;
    let rareShared = 0;
    for (const token of queryTokens) {
      if (!item.tokens.has(token)) continue;
      sharedTokens++;
      if (rareTokens.has(token)) rareShared++;
    }
    if (sharedTokens < MIN_SHARED_TOKENS) {
      // 例外：命中一个**稀有词**就够（"clash"/"worktree"/"grok" 这类专有词）。
      // 生产实测：query "clash" 只切出一个 token，旧逻辑永远无法满足
      // MIN_SHARED_TOKENS=2，导致切到 pure vNext 后短查询一条记忆都召不回。
      if (!(useIdf && rareShared >= 1)) continue;
    }
    // 生产规模下，若 query 里存在稀有词而本条一个都没命中，说明只是靠
    // 「本机/系统」这类泛词蹭上的，丢弃。
    // query 本身全是泛词时无稀有词可用，退回旧行为，避免整类查询判死。
    if (useIdf && rareTokens.size > 0 && rareShared === 0) continue;
    scored.push({
      state: item.state,
      sharedTokens,
      score: useIdf ? rareShared * 10 + sharedTokens : sharedTokens,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.state.id.localeCompare(b.state.id))
    .slice(0, input.limit ?? MAX_LOCAL_RECALL_STATES)
    .map(({ state, sharedTokens }) => ({ state, sharedTokens }));
};
