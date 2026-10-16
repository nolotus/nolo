/**
 * Platform-owned `agent-provider-setup` built-in skill.
 *
 * Teaches an agent how to guide a user through creating an Agent that runs on a
 * subscription plan (token-plan endpoint) or a metered/own-API-key provider —
 * instead of only platform-hosted models.
 *
 * Data-driven design: the skill does NOT hardcode a provider list. It instructs
 * the agent to read the live registry via `nolo agent providers --json`, so a
 * provider added to `packages/ai/agent/providerRegistry.ts` (step-plan,
 * kimi-code, deepseek-api, …) automatically becomes creatable through this
 * flow with zero skill edits. This is the TUI/CLI counterpart of the web
 * "订阅会员 / Custom API Key" preset pickers.
 *
 * Trigger: user asks to create an agent on a subscription/metered provider
 * (e.g. "用 stepfun 订阅建个 agent", "create an agent on my Step Plan").
 */

import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const AGENT_PROVIDER_SETUP_SKILL_SLUGS = ["agent-provider-setup"] as const;

export type AgentProviderSetupSkillSlug =
  (typeof AGENT_PROVIDER_SETUP_SKILL_SLUGS)[number];

/** Same FNV-1a deterministic id used by the other builtin skill seeds. */
function deterministicId(prefix: string, seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}

function normalizeSkillSeed(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildAgentProviderSetupSkillId(
  slug: AgentProviderSetupSkillSlug,
): string {
  return deterministicId("01SK", normalizeSkillSeed(slug) || slug);
}

export function buildAgentProviderSetupSkillPageKey(
  userId: string,
  slug: AgentProviderSetupSkillSlug,
): string {
  return `page-${userId}-${buildAgentProviderSetupSkillId(slug)}`;
}

export function buildAgentProviderSetupSkillConfig(
  slug: AgentProviderSetupSkillSlug,
): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: buildAgentProviderSetupSkillId(slug),
    name: "自建 Provider Agent 引导（agent-provider-setup）",
    triggerMode: "recommended",
    // execShell runs `nolo agent providers` + `nolo agent create`; ask_user is
    // used for the model/effort fork and the key-confirm gate.
    toolNames: ["execShell", "ask_user", "loadSkill"],
    description:
      "Guide the user through creating an Agent on a subscription token-plan or metered own-API-key provider (Step Plan, Kimi Code, DeepSeek, OpenCode Go, …). Use when the user wants to create an agent that is NOT platform-hosted — e.g. \"用订阅会员建 agent\", \"create an agent on Step Plan / my own API key\", or names a provider subscription. Reads `nolo agent providers --json` for the live preset list; never hardcode providers.",
  };
}

export function buildAgentProviderSetupSkillContentBySlug(
  slug: AgentProviderSetupSkillSlug,
): string {
  return buildSkillDocMarkdown({
    skillConfig: buildAgentProviderSetupSkillConfig(slug),
    body: `Help the user create an Agent that runs on their own subscription plan or API key, not a platform-hosted model.

The preset catalog is DATA-DRIVEN — do not hardcode provider names or base URLs. Always read the live list first.

## CLI Environment & Portability

- The \`nolo\` CLI is globally available once installed and logged in; execute commands directly without assuming the current working directory, a repo clone, or a repository nolo-cli skill.
- **Shell-less environment check**: If the current runtime does NOT provide \`execShell\` (e.g. web chat without shell execution), you CANNOT directly create or configure custom-provider agents on behalf of the user. The platform \`createAgent\` tool only supports \`apiSource: "platform"\` with platform billing.
  - Do NOT pretend to create the agent directly without a shell, and do NOT fall back to platform billing.
  - Clearly explain this limitation to the user and direct them to the web configuration portal at \`/create/agent\` where they can securely configure their provider, model, and API key.

## Step 1 — List available presets

When \`execShell\` is available, run:
\`\`\`
nolo agent providers --json
\`\`\`
This returns the registry presets grouped by \`group\`:
- \`subscription\` — token-plan subscriptions (Step Plan, Kimi Code, OpenCode Go…): need an API key + a locked baseUrl.
- \`metered_api\` — pay-per-use own-key APIs (stepfun-api, deepseek-api, minimax…).
- \`subscription_oauth\` — OAuth brands (ChatGPT, Claude, Cursor…): **cannot be created from a key here** — tell the user these require Nolo Desktop OAuth login (\`nolo auth <brand>\`), and stop.

Match the user's request to a preset \`id\`. If the user already named one (e.g. "stepfun 订阅" → \`step-plan\`), skip straight to it. If ambiguous between subscription vs metered for the same vendor (e.g. \`step-plan\` vs \`stepfun-api\`), ask which they mean — subscription is a periodic plan with token quota, metered is pay-per-token. Subscriptions do NOT replace platform billing for platform-hosted models.

## Step 2 — Model & reasoning effort: fork on how much the user knows

- **User specifies a model**: Use the preset's \`models[]\` list to confirm the choice is valid. Do NOT interrogate the user about reasoning effort just because a model was named — use the model/preset's default effort unless the user explicitly requested a specific reasoning effort tier.
- **User specifies reasoning effort**: Set it only among what the model supports (\`low/medium/high\`; check \`supportsReasoningEffort\`).
- **User doesn't know / says "随便 / 你看着办 / 默认"**: Just use the preset's \`defaultModel\` and default effort — do NOT interrogate them. The recommended model is already marked \`recommended:true\` in the list.
- **Avoid redundant confirmations**: If the user has already made their preference or choice clear, do NOT re-ask the same question.

## Step 3 — Safe credential handling

Show the preset's \`keyFormatHint\` if present (it explains where to obtain the key).
- **Do not solicit raw keys in chat**: Do NOT prompt the user to paste their API key into the conversation transcript if avoidable.
- **WARNING on \`--copy-provider-from\`**: Do NOT use or recommend \`--copy-provider-from\` for credential reuse. It does NOT copy API keys or \`credentialRef\` (leaving the new agent with 401 unconfigured credentials), and it silently overwrites explicit \`--model\` flags with the source agent's model.
- **Recommended**: Guide the user to run the command directly in their local terminal:
  \`\`\`
  nolo agent create <slug> --preset <preset-id> [--model <model>] --api-key <YOUR_KEY> --verify
  \`\`\`
- If the user explicitly provides a key in chat or requests execution via \`execShell\`:
  - **Never echo, quote, or repeat the key back** in messages.
  - **Never show the real key** in draft previews or confirmation summaries (mask as \`***\`).
  - Transparent security disclosure: Explain to the user that CLI \`--api-key\` passes the key via command line arguments (argv), which may be visible in process listings (\`ps\`) and tool execution logs. \`nolo agent create\` does not read \`CUSTOM_API_KEY\` from the environment, and setting an env var before running does NOT prevent argv exposure because the shell expands it. Do not claim environment variables make argv/logs naturally safe.

## Step 4 — Confirm & create (when authorization is needed)

Show the resolved command with the key masked (\`--api-key "***"\`):
\`\`\`
nolo agent create <slug> --preset <preset-id> --api-key <KEY> --verify
\`\`\`
- **Confirmation gate**: If the user's current request has already clearly authorized the creation and its parameters (e.g. "帮我用 step-plan 建个 agent，key 是 ..."), proceed to execute directly without redundant re-confirmation. Only pause for confirmation when authorization is missing or when introducing new unexpected expense/permissions.
- \`--preset\` auto-fills provider/baseUrl/model from the registry; add \`--model <id>\` only if the user picked a non-default model.
- \`--verify\` probes the endpoint end-to-end to verify that the key works.
- For a metered preset use its \`metered_api\` id the same way.

## Step 5 — Verify behavior & report

Understand the behavior of \`--verify\`:
- \`nolo agent create ... --verify\` saves the agent record to the database **before** running the verification probe.
- **Creation success does NOT equal verify success**: If the verification probe fails, the agent has already been created.
- If \`--verify\` fails:
  - **Do NOT blindly retry creation** — that will cause duplicate creation or overwrite errors.
  - **Never echo raw error output** that might contain secrets, tokens, or authorization headers. Provide a sanitized diagnostic message (e.g. endpoint unreachable, HTTP 401 unauthorized, or model not found).
  - Advise the user to verify their key, network, or plan tier, and update the existing agent via \`nolo agent update\` or \`/create/agent\` rather than re-creating it.
- On complete success (both creation and probe passed), report the created agentKey and model.

## Hard rules

- Never invent or hardcode provider lists; always read \`nolo agent providers --json\`.
- Never claim environment variables eliminate argv or log exposure risks when passing keys to CLI.
- Never echo raw API keys back to the conversation.
- Without shell (\`execShell\`), never pretend to create custom-provider agents; direct to \`/create/agent\`.
- Do NOT demand redundant confirmation if the user already explicitly authorized the creation in context; confirm only when authorization is missing or scope changes.
- Do NOT recommend \`--copy-provider-from\` for credential reuse; warn that it does not copy keys and overwrites \`--model\`.
- OAuth subscription presets → redirect to Nolo Desktop (\`nolo auth <brand>\`); do not attempt to create them via key.`,
  });
}
