/**
 * Cheap same-dialog self-review used by `/learn`.
 *
 * This is intentionally a user-triggered review prompt, not an Evolution
 * verdict and not an instruction to modify the system. Reusing the current
 * dialog lets providers benefit from the already-hot conversation/cache while
 * the agent still has the execution context in view.
 */
export const TUI_LEARN_REVIEW_PROMPT = `Review the visible conversation and work so far in this current dialog and look only for reusable improvements to the system. Cover what is actually visible here, including unfinished, failed, or interrupted work; do not assume history you cannot see.

Focus on two surfaces:

1. Tools
- Was any tool unnecessary, repeatedly called, hard to use, or missing?
- Did a tool description, schema, or result shape cause confusion or wasted work?
- Is there a concrete tool change that would improve multiple future tasks?

2. Prompts / instructions
- Did any system, developer, project, or tool instruction cause confusion, conflict, repetition, or unnecessary work?
- Was an important reusable instruction missing?
- Is there a concrete prompt/instruction change that would improve multiple future tasks?

Rules:
- Do not invent findings just to produce feedback. "none" is a good result.
- Every finding must cite concrete visible evidence: the user's correction, the failed call, the repeated work. No evidence, no finding. Keep observed facts separate from assumptions; do not present correlation as root cause.
- Prefer deleting, merging, or clarifying an existing instruction over adding a new one, and do not generalize a one-off mistake into a global rule.
- For prompt findings, give the visible original wording or a verifiable location plus the minimal replacement text. If you cannot locate it, say the location is unknown instead of guessing where it came from.
- Prefer reusable improvements over task-specific preferences.
- Do not modify code, prompts, tools, memory, or configuration in this review. Review only.
- Be concise.

Return exactly these sections:
Tool findings
- none OR: finding; evidence; proposed change

Prompt findings
- none OR: finding; evidence; proposed change

Worth changing?
- yes/no
- confidence: low/medium/high
- one-sentence reason`;
