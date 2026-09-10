// ai/agent/taskQualityDomain.ts
//
// Thin deterministic resolver: task context → ModelQualityDomain | null.
//
// High-confidence keyword rules only — no scores, no confidence, no weighted
// keywords, no LLM classifier. Philosophy: resolve when certain, otherwise
// return null. This is a prerequisite layer for future quality-evidence
// routing (packages/ai/llm/modelQualityEvidence.ts) and must stay decoupled:
// no evidence/selector/economics imports, no prompt text generation, pure
// function in → domain | null out.
//
// Rule semantics (checked in order):
// - explicitDomain wins outright (stable exit for future planner/routing);
// - framework-specific > everything (Rails beats design/terminal/repo);
// - creative-writing needs a literary FORM plus a creation/continuation verb
//   ("write a short sci-fi story", "续写这段小说") or an unambiguous phrase
//   ("creative writing", "short story"). A bare "story"/"novel"/"scene" is NOT
//   enough — "fix the story editor bug" stays coding.repo — and technical or
//   business prose (README, PR description, docs, summary, email, product
//   description, code comments) is never creative writing;
// - the creative-writing group is vetoed by a "code work context" (a change
//   verb acting on a code artifact, a shell/code script kind, or a code path:
//   "rewrite the story parser", "logic in src/story.ts"). A code artifact
//   mentioned anywhere else in the sentence does NOT veto — "a story about a
//   parser that dreams" stays creative. The same list is a coding.repo signal,
//   so a vetoed task resolves to coding.repo rather than falling through to
//   null, and no rule order had to change;
// - strong design/terminal GOAL signals beat repo modification ("redesign
//   this landing page" is design even when a repo is touched);
// - repo modification outcome > INCIDENTAL design/terminal keywords
//   ("fix the layout bug" is repo work; "fix the bug and install a
//   dependency" is repo work, not terminal);
// - incidental words (layout/styling/install/build/compile) only fire when
//   no stronger signal matched — the repo sandwich, not a reversal;
// - bare "ruby" / "rspec" / "rake" never imply Rails ("rake" alone is repo
//   work — a rake task is repo code, Rails needs an explicit Rails signal);
// - agent capabilities (tools/skills) never imply terminal work; they may
//   only strengthen rails/design identity when the task text resolves to
//   nothing on its own.

import type { ModelQualityDomain } from "../llm/modelQualityEvidence";

/** Everything the resolver may look at. All fields optional. */
export interface TaskQualityDomainInput {
  /** Free-form task description — the primary signal. */
  task?: string | null;
  /** Agent capability names — auxiliary only, never imply terminal. */
  tools?: readonly string[];
  /** Skill identifiers — may strengthen rails/design identity only. */
  skills?: readonly string[];
  /** Caller-known domain; highest priority, returned verbatim when set. */
  explicitDomain?: ModelQualityDomain | null;
}

/** High-confidence Rails signals. Bare "ruby", "rspec" or "rake" is NOT enough. */
const RAILS_SIGNALS: readonly RegExp[] = [
  /\brails\b/i,
  /\bruby on rails\b/i,
  /\bactive\s?record\b/i,
  /\baction\s?controller\b/i,
  /\brails[ -](?:controller|model|migration|app|project|route|view)\b/i,
];

/** Design signals must express a visual outcome, not merely name a UI surface. */
const DESIGN_GOAL_SIGNALS: readonly RegExp[] = [
  /\bredesign(?:ing)?\b/i,
  /\b(?:improve|enhance) (?:the )?(?:visual hierarchy|visual design|appearance)\b/i,
  /\b(?:polish|refine) (?:the )?(?:spacing|styling|typography|layout|design)\b/i,
  /\b(?:adjust|improve|refine) (?:the )?(?:layout|spacing|typography|styling)\b/i,
  /\blook(?:s)? more like\b/i,
  /\bmake (?:it|this|them|the) look\b/i,
  /\b(?:redesign|improve|enhance|polish|refine|adjust)\b[^.!?\n]*\b(?:landing[\s-]?page|website|web(?:site)?|ui|visual|appearance|design)\b/i,
];

/** Capability names can explicitly identify a design skill without making task nouns goals. */
const DESIGN_AUXILIARY_SIGNALS: readonly RegExp[] = [
  /\bweb[ -]?design\b/i,
  /\bui[ -]?design\b/i,
  /\bvisual[ -]?(?:design|review)\b/i,
];

/** Incidental design words: only design signals when no repo outcome matched. */
const DESIGN_INCIDENTAL_SIGNALS: readonly RegExp[] = [/\blayout\b/i, /\bstyling\b/i];

/** Terminal signals must describe an environment/execution outcome, not a noun in code. */
const TERMINAL_GOAL_SIGNALS: readonly RegExp[] = [
  /\b(?:set up|setup|configure) (?:the )?(?:docker|ci|shell|terminal|environment)\b/i,
  /\b(?:install|remove|upgrade)\b[^.!?\n]*\b(?:package|dependency|ffmpeg)\b/i,
  /\b(?:figure out|debug|diagnose|explain) why (?:this )?(?:shell|terminal|command)\b/i,
  /\bcommands? (?:fails?|failed|failure|not found|exits?|timed? out)\b/i,
  /\brun (?:a |the )?command\b/i,
  /\bpackage manager\b/i,
  /\bsystem package\b/i,
  /\bdependency installation\b/i,
  /\benvironment setup\b/i,
  /\bci (?:failure|failed|pipeline|job)\b/i,
];

/** Incidental terminal words: environment mentions beside other outcomes. */
const TERMINAL_INCIDENTAL_SIGNALS: readonly RegExp[] = [
  /\binstall(?:ing|ation)?\b/i,
  /\bbuild(?:ing)?\b/i,
  /\bcompil(?:e|ing|ation)\b/i,
];

/**
 * Code artifacts: the objects a code-modification verb can act on.
 *
 * Vocabulary only — never a signal by itself. Naming a code artifact is not the
 * same as working on code: "a story about a parser that dreams" mentions a
 * parser but is prose (see CODE_WORK_CONTEXT_SIGNALS). It is also the
 * disambiguator for `novel` in CREATIVE_WRITING_FORM.
 *
 * Kept to artifacts that mean "software" in a creative-writing sentence. Words
 * a literary task also uses (`interface` — a social interface, `class` — social
 * classes, `logic`) stay out on purpose: they would veto real prose, and the
 * repo outcome signals already cover them in code contexts.
 */
const CODE_ARTIFACT_NOUNS =
  String.raw`(?:parsers?|serializers?|serializ\w*|deserializ\w*|tokenizers?|lexers?|compilers?|components?|modules?|functions?|methods?|hooks?|reducers?|schemas?|apis?|endpoints?|regex(?:es)?|state machines?|renderers?|code)`;

/**
 * `novel` is polysemous, so it only counts as a literary form when it stands as
 * a head noun: at the end of the phrase, as a possessive ("the novel's
 * ending"), or followed by a literary continuation — punctuation, an adverb
 * ("rewrite the novel beautifully"), a preposition, a copula/narrative verb
 * ("is", "tells", "called", "titled"), a participle, or another literary noun.
 *
 * Any *other* word after it means the adjective sense — "a novel function/
 * class/meta function" is a *new* thing, not fiction. That reading is the safe
 * one here: an unrecognized continuation resolves to null or to code work
 * instead of injecting prose-quality evidence, and no blocklist has to
 * enumerate every code noun or metaphor a person might write. The adverb branch
 * additionally refuses to fire in front of a code artifact, so a noun that
 * happens to end in "-ly" ("a novel assembly parser") cannot slip through.
 */
const NOVEL_HEAD_NOUN_LOOKAHEAD =
  String.raw`(?=\s*(?:[.,;:!?)"'’”]|$|['’]s\b|\w+ly\b(?!\s+(?:${CODE_ARTIFACT_NOUNS}))|(?:about|in|into|of|on|to|with|without|whose|where|when|that|which|is|was|are|were|tells|follows|begins|ends|reads|feels|called|titled|named|entitled|explores|examines|depicts|chronicles|following|featuring|telling|set|starring|based|written|chapter|scene|story|prose|novella|trilogy|manuscript|draft)\b))`;

/**
 * Literary forms that can identify creative writing — only together with a
 * creation/continuation verb, or inside an unambiguous phrase (see below).
 *
 * `script` is deliberately absent: "write a bash script" is terminal/repo work,
 * screenwriting is matched through `screenplay` instead.
 */
const CREATIVE_WRITING_FORM =
  String.raw`(?:short story|story|fiction|novels?${NOVEL_HEAD_NOUN_LOOKAHEAD}|novella|poem|poetry|screenplay|chapter|prose|scene)`;

/**
 * Creative-writing signals: a literary form reached by a creation/continuation
 * verb, or a phrase that is unambiguous on its own.
 *
 * Intentionally excluded (must stay non-creative): README / PR description /
 * documentation / summary / email / product description / code comments, and
 * Chinese 写代码 / 写文档 / 写测试 / 写邮件 / 写总结.
 */
const CREATIVE_WRITING_SIGNALS: readonly RegExp[] = [
  new RegExp(
    String.raw`\b(?:write|writing|draft|compose|create|continue|continuing|extend|rewrite|edit|tell|telling|narrate|narrating)\b[^.!?\n]{0,40}\b${CREATIVE_WRITING_FORM}\b`,
    "i",
  ),
  /\b(?:short story|flash fiction|creative writing|fiction writing|story writing|novel writing|science fiction|poetry)\b/i,
  // 中文：创作/续写动词 + 文学体裁（"写一个短篇小说"、"续写这段小说"）。
  /(?:写|创作|撰写|编写|续写|来一篇|来个)[^。！？\n]{0,12}(?:小说|故事|诗歌|诗|散文|剧本|短篇|文学)/,
  // 中文：体裁 + 创作动作（"小说续写"、"故事大纲"、"人物对白"）。
  /(?:小说|故事|诗歌|散文|剧本)[^。！？\n]{0,6}(?:续写|创作|大纲|开头|对白|人物|情节)/,
  /(?:创意写作|文学创作|小说创作)/,
];

/**
 * A file path carrying a code extension — unambiguous code work. Shared by the
 * repo rule and the creative-writing veto so the two can never drift apart.
 */
const CODE_PATH_SIGNAL =
  /(?:^|\s)[\w.@/-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|java|ex|exs|php|vue|svelte)\b/i;

/** Code modification outcomes — the coding.repo rule's own signal list. */
const REPO_OUTCOME_SIGNALS: readonly RegExp[] = [
  /\bbugs?\b/i,
  /\b(?:typescript|javascript|python|ruby) error\b/i,
  /\bregressions?\b/i,
  /\brefactor(?:ing)?\b/i,
  /\bimplement (?:a |an |the )?(?:new |missing )?feature\b/i,
  /\brake\b/i,
  /\brepo(?:sitory)?\b/i,
  /\bcodebase\b/i,
  /\bcode review\b/i,
  /\bpull request\b/i,
  /\bPR(?:s)?\b/,
  /\bcommits?\b/i,
  /\btests? (?:are |is )?(?:failing|failed|broken)\b/i,
];

/** Verbs that ask to change something that already exists in code. */
const CODE_MODIFICATION_VERBS =
  String.raw`(?:rewrite|rewriting|edit|editing|fix|fixing|refactor|refactoring|implement|implementing|update|updating|replace|replacing|rename|renaming|migrate|migrating|patch|patching|modify|modifying|change|changing|port|porting|debug|debugging)`;

/**
 * Contexts where the object of the task *is code* — the only thing that may
 * keep a literary noun out of writing.creative:
 *
 * 1. a change verb acting on a code artifact inside a two-word window
 *    ("rewrite the story parser", "update the story serializer");
 * 2. an explicit shell/code script kind ("write a bash script" is not
 *    screenwriting);
 * 3. a code path with a source extension ("rewrite story.ts").
 *
 * Deliberately *not* a signal: a code artifact anywhere else in the sentence.
 * "Write a story about an API that gains consciousness" and "Fix the story
 * parser" differ in structure, not in vocabulary — only the second one makes
 * the code artifact the object of a change verb, so only the second is vetoed.
 * A literary noun that *modifies* a code artifact ("story parser") counts as
 * the same structure: there the code artifact is the head noun of the work.
 */
const CODE_WORK_CONTEXT_SIGNALS: readonly RegExp[] = [
  // 1. A change verb acting on a code artifact inside a two-word window
  //    ("rewrite the story parser", "update the story serializer").
  new RegExp(
    String.raw`\b${CODE_MODIFICATION_VERBS}\b(?:\s+[\p{L}'’-]+){0,2}\s+${CODE_ARTIFACT_NOUNS}\b`,
    "iu",
  ),
  // 2. A literary noun used as the modifier of a code artifact, whatever the
  //    verb distance is — the code artifact is the head noun ("story parser",
  //    "scene state machine", "story component"). The preposition form
  //    ("a story about a parser") is prose and deliberately does not match.
  new RegExp(String.raw`\b${CREATIVE_WRITING_FORM}\s+${CODE_ARTIFACT_NOUNS}\b`, "iu"),
  // 3. 中文：修改动词 + 代码对象（"改写小说解析器的代码"）。
  /(?:改写|重写|修改|修复|重构|更新|实现|调整)[^。！？\n]{0,8}(?:代码|源码|解析器|序列化|组件|模块|函数|接口|状态机|渲染器|仓库)/,
  // 4. A code path with a source extension.
  CODE_PATH_SIGNAL,
];

/**
 * Hard negatives for writing.creative: CODE_WORK_CONTEXT_SIGNALS plus one
 * veto-only guard.
 *
 * "Write a bash script that prints a story" is not screenwriting, so an
 * explicit code-script kind keeps it out of creative writing — but that guard
 * is deliberately NOT a repo signal, so it cannot steal shell work
 * ("write a bash script to install ffmpeg") from coding.terminal.
 */
const CREATIVE_WRITING_VETOES: readonly RegExp[] = [
  ...CODE_WORK_CONTEXT_SIGNALS,
  /\b(?:bash|shell|node|python|npm|docker|ci) scripts?\b/i,
];

/**
 * Ordered high-confidence signal groups; first group with a hit wins.
 * Goal-level groups (rails → creative writing → design → terminal → repo) outrank incidental
 * keyword groups (design → terminal) — that sandwich is what keeps "fix the
 * layout bug in src/App.tsx" in coding.repo while "redesign this landing
 * page" stays design.website. A group may additionally declare `vetoes`
 * (writing.creative does): a veto hit skips that group and evaluation continues,
 * which is how code context wins over a literary noun without reordering.
 */
const TASK_SIGNAL_RULES: ReadonlyArray<{
  domain: ModelQualityDomain;
  patterns: readonly RegExp[];
  /**
   * Optional hard negatives: a hit cancels this group for the task (evaluation
   * continues with the next group). Never asserts a domain by itself.
   */
  vetoes?: readonly RegExp[];
}> = [
  { domain: "coding.rails", patterns: RAILS_SIGNALS },
  { domain: "writing.creative", patterns: CREATIVE_WRITING_SIGNALS, vetoes: CREATIVE_WRITING_VETOES },
  { domain: "design.website", patterns: DESIGN_GOAL_SIGNALS },
  {
    // coding.repo is the default coding domain: code modification outcomes.
    domain: "coding.repo",
    patterns: [...REPO_OUTCOME_SIGNALS, CODE_PATH_SIGNAL],
  },
  { domain: "coding.terminal", patterns: TERMINAL_GOAL_SIGNALS },
  { domain: "design.website", patterns: DESIGN_INCIDENTAL_SIGNALS },
  { domain: "coding.terminal", patterns: TERMINAL_INCIDENTAL_SIGNALS },
  {
    // Same list the creative veto uses, deliberately placed after the
    // incidental design/terminal groups: "update the component styling" keeps
    // its design.website domain, while "edit the story component" — which
    // nothing above claims — still lands in coding.repo instead of null.
    domain: "coding.repo",
    patterns: CODE_WORK_CONTEXT_SIGNALS,
  },
  {
    // Rare by design: only standalone, framework-free coding craft.
    domain: "coding.general",
    patterns: [
      /\b(?:write|implement) (?:a|an|the) [a-z0-9 -]*(?:algorithm|parser|regex|data structure|function)\b/i,
      /\bexplain (?:this |the |that )?code\b/i,
      /\bstandalone (?:function|script|algorithm)\b/i,
    ],
  },
];

/**
 * Resolve the quality domain for a task, or `null` when unknown.
 *
 * Deterministic and side-effect free. `null` is a first-class result: an
 * unrecognized task must NOT be forced into coding.general.
 */
export function resolveTaskQualityDomain(
  input: TaskQualityDomainInput,
): ModelQualityDomain | null {
  // 1. Caller-known domain always wins — never second-guess it.
  if (input.explicitDomain) return input.explicitDomain;

  const task = input.task?.trim();
  if (task) {
    for (const rule of TASK_SIGNAL_RULES) {
      if (rule.vetoes?.some((veto) => veto.test(task))) continue;
      if (rule.patterns.some((pattern) => pattern.test(task))) {
        return rule.domain;
      }
    }
  }

  // Auxiliary pass: skills/tools may strengthen framework/design identity
  // only when the task text resolved to nothing. Capabilities like execShell
  // deliberately never imply coding.terminal.
  const auxiliary = [...(input.skills ?? []), ...(input.tools ?? [])].join(" ");
  if (auxiliary.trim()) {
    if (RAILS_SIGNALS.some((pattern) => pattern.test(auxiliary))) {
      return "coding.rails";
    }
    if (
      [...DESIGN_AUXILIARY_SIGNALS, ...DESIGN_GOAL_SIGNALS, ...DESIGN_INCIDENTAL_SIGNALS].some((pattern) =>
        pattern.test(auxiliary),
      )
    ) {
      return "design.website";
    }
  }

  return null;
}
