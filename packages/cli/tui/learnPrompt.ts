/**
 * Cheap same-dialog self-review used by `/learn`.
 *
 * This is intentionally a user-triggered review prompt, not an Evolution
 * verdict and not an instruction to modify the system. Reusing the current
 * dialog lets providers benefit from the already-hot conversation/cache while
 * the agent still has the execution context in view.
 */
export const TUI_LEARN_REVIEW_PROMPT = `Review the work you just completed in this current dialog and look only for reusable improvements to the system.

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
- Separate observed evidence from hypotheses. Do not present correlation as root cause.
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
