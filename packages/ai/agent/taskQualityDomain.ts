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
// - the creative-writing group is additionally vetoed by code context
//   (code-object nouns plus the repo outcome signals: "story parser",
//   "scene state machine", "logic in src/story.ts"): the group is skipped
//   entirely, so the task falls through to the later repo/terminal rules — no
//   reordering needed to keep code work out of creative writing;
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
 * Literary forms that can identify creative writing — only together with a
 * creation/continuation verb, or inside an unambiguous phrase (see below).
 *
 * `script` is deliberately absent: "write a bash script" is terminal/repo work,
 * screenwriting is matched through `screenplay` instead. `novel` is guarded
 * against its adjective sense ("a novel approach").
 */
const CREATIVE_WRITING_FORM =
  String.raw`(?:short story|story|fiction|novel(?!\s+(?:approach|idea|way|method|technique|solution|design|algorithm|strategy))|novella|poem|poetry|screenplay|chapter|prose|scene)`;

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
    String.raw`\b(?:write|writing|draft|compose|create|continue|continuing|extend|rewrite|edit)\b[^.!?\n]{0,40}\b${CREATIVE_WRITING_FORM}\b`,
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

/**
 * Code-shaped object nouns: wording that says the work *is* code.
 *
 * These turn a literary noun into a modifier ("the story parser", "the scene
 * state machine") — the cases where a creation verb plus a literary noun must
 * not be read as prose.
 */
const CODE_OBJECT_SIGNALS: readonly RegExp[] = [
  /\b(?:parsers?|parsing|serializ\w*|deserializ\w*|tokeniz\w*|lexers?|compilers?|components?|modules?|classes|functions?|methods?|hooks?|reducers?|schemas?|interfaces?|apis?|sdks?|endpoints?|regex(?:es)?|state machines?|renderers?)\b/i,
  /\b(?:code|source files?)\b/i,
  CODE_PATH_SIGNAL,
  // Shell/code scripts only; a screenwriting "script" is not a shell script.
  /\b(?:bash|shell|node|python|npm|docker|ci) scripts?\b/i,
  // 中文代码语境。
  /(?:代码|源码|仓库|重构|解析器|序列化|组件|模块|函数|接口|状态机|报错|单元测试)/,
];

/**
 * Hard negatives for the creative-writing group: code / repo context never
 * becomes prose. Reuses the repo outcome signals (rather than restating them,
 * so the two lists can never drift) plus the code-object nouns above.
 *
 * A hit cancels the creative group and evaluation continues with the later
 * repo/terminal rules — it never asserts a domain by itself. Generic verbs like
 * "build" stay out, so "build the character arc" remains creative.
 */
const CREATIVE_WRITING_VETOES: readonly RegExp[] = [
  ...CODE_OBJECT_SIGNALS,
  ...REPO_OUTCOME_SIGNALS,
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
    // Rare by design: only standalone, framework-free coding craft.
    domain: "coding.general",
    patterns: [
      /\b(?:write|implement) (?:a|an|the) [a-z0-9 -]*(?:algorithm|parser|regex|data structure|small function|standalone function|utility function)\b/i,
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
