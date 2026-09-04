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
// - framework-specific > generic coding (Rails beats terminal/repo);
// - task outcome > incidental tool mention ("run tests" is not terminal);
// - repo modification > merely using terminal while modifying repo;
// - build/compile words are weak terminal signals and only fire when no
//   repo code signal matched ("fix the compile error in src/x.ts" → repo);
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

/** High-confidence Rails signals. Bare "ruby" or "rspec" is NOT enough. */
const RAILS_SIGNALS: readonly RegExp[] = [
  /\brails\b/i,
  /\bruby on rails\b/i,
  /\bactive\s?record\b/i,
  /\baction\s?controller\b/i,
  /\brails[ -](?:controller|model|migration|app|project|route|view)\b/i,
  /\brake\b/i,
];

/** Visual/design-goal signals. Code bugs and frontend logic never hit these. */
const DESIGN_SIGNALS: readonly RegExp[] = [
  /\blanding[\s-]?page\b/i,
  /\bwebsite[\s-]?design\b/i,
  /\bui[\s-]?design\b/i,
  /\bweb[\s-]?(?:design|visual|ui)\b/i,
  /\bvisual[\s-]?(?:hierarchy|design)\b/i,
  /\bredesign(?:ing)?\b/i,
  /\blayout\b/i,
  /\bstyling\b/i,
  /\bfront-?end[\s-]?visual\b/i,
  /\blook(?:s)? more like\b/i,
  /\bmake (?:it|this|them|the) look\b/i,
];

/**
 * Ordered high-confidence signal groups; first group with a hit wins.
 * Order matters — see file header for the conflict semantics it encodes.
 */
const TASK_SIGNAL_RULES: ReadonlyArray<{
  domain: ModelQualityDomain;
  patterns: readonly RegExp[];
}> = [
  { domain: "coding.rails", patterns: RAILS_SIGNALS },
  { domain: "design.website", patterns: DESIGN_SIGNALS },
  {
    // Ops outcomes: environment/package/shell work is the terminal's turf.
    domain: "coding.terminal",
    patterns: [
      /\binstall(?:ing|ation)?\b/i,
      /\bdocker\b/i,
      /\bapt(?:-get)?\b/i,
      /\bbrew\b/i,
      /\byum\b/i,
      /\bshell\b/i,
      /\bbash\b/i,
      /\bzsh\b/i,
      /\bterminal\b/i,
      /\bcommand[ -]line\b/i,
      /\bcommands? (?:fails?|failed|failure|not found|exits?|timed? out)\b/i,
      /\brun (?:a |the )?command\b/i,
      /\bpackage manager\b/i,
      /\bsystem package\b/i,
      /\bdependency installation\b/i,
      /\benvironment setup\b/i,
      /\bsetup (?:the )?environment\b/i,
      /\bci (?:failure|failed|pipeline|job)\b/i,
    ],
  },
  {
    // coding.repo is the default coding domain: code modification outcomes.
    domain: "coding.repo",
    patterns: [
      /\bbugs?\b/i,
      /\bregressions?\b/i,
      /\brefactor(?:ing)?\b/i,
      /\bimplement (?:a |an |the )?(?:new |missing )?feature\b/i,
      /\brepo(?:sitory)?\b/i,
      /\bcodebase\b/i,
      /\bcode review\b/i,
      /\bpull request\b/i,
      /\bPR(?:s)?\b/,
      /\bcommits?\b/i,
      /\btests? (?:are |is )?(?:failing|failed|broken)\b/i,
      /(?:^|\s)[\w.@/-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|java|ex|exs|php|vue|svelte)\b/i,
    ],
  },
  {
    // Weak build words reach terminal only when no repo signal matched.
    domain: "coding.terminal",
    patterns: [/\bbuild(?:ing)?\b/i, /\bcompil(?:e|ing|ation)\b/i],
  },
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
    if (DESIGN_SIGNALS.some((pattern) => pattern.test(auxiliary))) {
      return "design.website";
    }
  }

  return null;
}
