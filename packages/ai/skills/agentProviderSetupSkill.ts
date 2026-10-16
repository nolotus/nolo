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

## Step 1 — List available presets

Run (via execShell):
\`\`\`
nolo agent providers --json
\`\`\`
This returns the registry presets grouped by \`group\`:
- \`subscription\` — token-plan subscriptions (Step Plan, Kimi Code, OpenCode Go…): need an API key + a locked baseUrl.
- \`metered_api\` — pay-per-use own-key APIs (stepfun-api, deepseek-api, minimax…).
- \`subscription_oauth\` — OAuth brands (ChatGPT, Claude, Cursor…): **cannot be created from a key here** — tell the user these require Nolo Desktop OAuth login, and stop.

Match the user's request to a preset \`id\`. If the user already named one (e.g. "stepfun 订阅" → \`step-plan\`), skip straight to it. If ambiguous between subscription vs metered for the same vendor (e.g. \`step-plan\` vs \`stepfun-api\`), ask which they mean — subscription is the monthly-Credit plan, metered is pay-per-token.

## Step 2 — Model & reasoning effort: fork on how much the user knows

- **User is specific** (names a model or effort): use the preset's \`models[]\` list to confirm the choice is valid, and ask for reasoning effort only among what that model supports (\`low/medium/high\` for stepfun; check \`supportsReasoningEffort\`).
- **User doesn't know / says "随便 / 你看着办"**: just use the preset's \`defaultModel\` and default effort — do NOT interrogate them. The recommended model is already marked \`recommended:true\` in the list.

## Step 3 — Collect the API key

Show the preset's \`keyFormatHint\` if present (it says where to get the key). Ask the user to paste their API key. Never invent one.

## Step 4 — Confirm & create (sensitive — confirm first)

Show the user the exact command you will run, with the key masked, and get an explicit yes before executing. Then run it with the key passed via env so it never lands on the command line / in logs:

\`\`\`
CUSTOM_API_KEY='<the-key>' nolo agent create <slug> \\
  --preset <preset-id> --api-key "$CUSTOM_API_KEY" --verify
\`\`\`

- \`--preset\` auto-fills provider/baseUrl/model from the registry; add \`--model <id>\` only if the user picked a non-default model.
- \`--verify\` probes the endpoint end-to-end and confirms the key works.
- For a metered preset use its \`metered_api\` id the same way.

## Step 5 — Report

On success report the created agentKey and model. If \`--verify\` fails, relay the endpoint's error verbatim and suggest checking the key / plan tier.

## Hard rules

- API key goes through the \`CUSTOM_API_KEY\` env var, never as a literal arg, never echoed back.
- Always show the resolved command (key masked) and get confirmation before running — creating an agent + storing a credential is a sensitive action.
- OAuth subscription presets → redirect to Nolo Desktop; do not attempt to create them via key.
- If \`nolo agent providers\` fails or the list is empty, say so and ask the user for the provider's base URL + key to build a manual custom agent instead.`,
  });
}
