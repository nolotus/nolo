import { toErrorMessage } from "core/errorMessage";
import type { AgentCommandDeps } from "./agentCommandSupport";
import { readOption, resolveAuthToken, resolveServerUrl } from "./cliEnvHelpers";
import type { CliFetchImpl } from "./cliFetch";

type EnvVars = Record<string, string | undefined>;

type OpenAICompatModel = { id?: string; name?: string; object?: string };

function asEnvVars(env: NodeJS.ProcessEnv | EnvVars): EnvVars {
  return env as EnvVars;
}

function resolveProviderUrl(args: string[], env: EnvVars): string | undefined {
  return (
    readOption(args, "--url") ??
    readOption(args, "--provider-url") ??
    env.CUSTOM_PROVIDER_URL ??
    env.OPENAI_COMPAT_BASE_URL
  );
}

function resolveProviderKey(args: string[], env: EnvVars): string | undefined {
  return (
    readOption(args, "--api-key") ??
    readOption(args, "--provider-api-key") ??
    env.CUSTOM_API_KEY ??
    env.OPENAI_COMPAT_API_KEY ??
    env.OPENROUTER_API_KEY
  );
}

/** Join a base URL with a path, normalizing trailing slashes. */
function joinBase(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

export const AGENT_MODELS_USAGE =
  "Usage: nolo agent models --preset <presetId> [--api-key <key>] [--filter <str>] [--json]\n" +
  "       nolo agent models --url <base> --api-key <key> [--filter <str>] [--json]\n" +
  "  --preset  discover models via the server (POST /api/agents/providers/discover-models);\n" +
  "            exit 0 = live, 1 = static fallback / error. OAuth presets (devin-oauth) take no --api-key.\n" +
  "  --url     list models straight from an OpenAI-compatible provider's /models\n";

type DiscoveredModel = {
  id?: string;
  label?: string;
  recommended?: boolean;
  hasVision?: boolean;
};

type DiscoverModelsResponse = {
  ok?: boolean;
  code?: string;
  error?: string;
  presetId?: string;
  source?: "live" | "static";
  models?: DiscoveredModel[];
  observedAt?: number;
  truncated?: boolean;
  fallbackReason?: string;
};

/**
 * `nolo agent models --preset <id>`: server-side discovery. Exit contract
 * (frozen): live → 0; static fallback → 1 (not a real observation); 409 /
 * network / other HTTP failure → 1. OAuth presets ignore any API key, so it is
 * never read from args/env here; only an explicit --api-key is forwarded.
 */
async function runPresetModelsCommand(
  presetId: string,
  args: string[],
  deps: AgentCommandDeps
): Promise<number> {
  const env = asEnvVars(deps.env ?? process.env);
  const output = deps.output ?? process.stdout;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const filter = (readOption(args, "--filter") ?? "").trim().toLowerCase();
  const wantJson = args.includes("--json");

  if (!presetId || presetId.startsWith("--")) {
    output.write(`[nolo] agent models --preset requires a preset id.\n${AGENT_MODELS_USAGE}`);
    return 1;
  }
  const authToken = resolveAuthToken(args, env as NodeJS.ProcessEnv);
  if (!authToken) {
    output.write(
      "[nolo] agent models --preset requires login. Run `nolo login` or set AUTH_TOKEN.\n"
    );
    return 1;
  }
  const explicitKey =
    readOption(args, "--api-key") ?? readOption(args, "--provider-api-key");
  const apiKey = explicitKey?.trim() ? explicitKey.trim() : undefined;

  try {
    const url = joinBase(
      resolveServerUrl(args, env as NodeJS.ProcessEnv),
      "/api/agents/providers/discover-models"
    );
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(apiKey ? { presetId, apiKey } : { presetId }),
    });
    const body = (await res.json().catch(() => null)) as DiscoverModelsResponse | null;

    if (!res.ok || !body || body.ok === false) {
      if (wantJson) {
        output.write(
          JSON.stringify(body ?? { ok: false, status: res.status }, null, 2) + "\n"
        );
      } else {
        const code = body?.code ? ` ${body.code}` : "";
        const detail = body?.error ? `: ${body.error}` : "";
        output.write(
          `[nolo] agent models --preset ${presetId} failed (HTTP ${res.status}${code})${detail}\n`
        );
      }
      return 1;
    }

    const isLive = body.source === "live";
    if (wantJson) {
      output.write(JSON.stringify(body, null, 2) + "\n");
      return isLive ? 0 : 1;
    }

    const models = Array.isArray(body.models) ? body.models : [];
    const shown = filter
      ? models.filter(
          (m) =>
            (m.id ?? "").toLowerCase().includes(filter) ||
            (m.label ?? "").toLowerCase().includes(filter)
        )
      : models;

    output.write(
      isLive
        ? `source: live${typeof body.observedAt === "number" ? ` (observedAt ${body.observedAt})` : ""}\n`
        : `source: ${body.source ?? "unknown"}\n`
    );
    if (!isLive) {
      output.write(`static fallback: ${body.fallbackReason ?? "unknown"}\n`);
    }
    if (body.truncated) output.write("(list truncated by server)\n");
    if (!shown.length) {
      output.write(
        `[nolo] agent models: no models found${
          filter ? ` matching "${filter}"` : ""
        } for preset ${presetId}\n`
      );
      return 1;
    }
    for (const m of shown) {
      const label = m.label && m.label !== m.id ? `  ${m.label}` : "";
      const tags = [m.recommended ? "recommended" : "", m.hasVision ? "vision" : ""]
        .filter(Boolean)
        .join(",");
      output.write(`${m.id ?? ""}${label}${tags ? `  [${tags}]` : ""}\n`);
    }
    return isLive ? 0 : 1;
  } catch (error) {
    output.write(`[nolo] agent models failed: ${toErrorMessage(error)}\n`);
    return 1;
  }
}

export async function runAgentModelsCommand(
  args: string[],
  deps: AgentCommandDeps = {}
): Promise<number> {
  const env = asEnvVars(deps.env ?? process.env);
  const output = deps.output ?? process.stdout;
  const fetchImpl = deps.fetchImpl ?? fetch;

  if (args.includes("--preset")) {
    return runPresetModelsCommand(readOption(args, "--preset") ?? "", args, deps);
  }

  const base = resolveProviderUrl(args, env);
  const key = resolveProviderKey(args, env);
  const filter = (readOption(args, "--filter") ?? "").trim().toLowerCase();
  const wantJson = args.includes("--json");

  if (!base) {
    output.write(
      "[nolo] agent models requires a provider URL. Use --url <base>, --provider-url <base>, or CUSTOM_PROVIDER_URL.\n"
    );
    return 1;
  }
  if (!key) {
    output.write(
      "[nolo] agent models requires an API key. Use --api-key <key> or CUSTOM_API_KEY.\n"
    );
    return 1;
  }

  try {
    const res = await fetchImpl(joinBase(base, "/models"), {
      headers: { Authorization: `Bearer ${key}` },
    });
    const body = (await res.json().catch(() => null)) as
      | { data?: OpenAICompatModel[] }
      | null;
    const modelIds = (Array.isArray(body?.data) ? body!.data : [])
      .map((m) => m.id ?? m.name ?? "")
      .filter((id) => id);
    const filtered = filter
      ? modelIds.filter((id) => id.toLowerCase().includes(filter))
      : modelIds;

    if (wantJson) {
      output.write(
        JSON.stringify(
          { ok: res.ok, status: res.status, base, modelIds: filtered },
          null,
          2
        ) + "\n"
      );
      return res.ok ? 0 : 1;
    }

    if (!res.ok) {
      output.write(
        `[nolo] agent models failed (HTTP ${res.status}): ${JSON.stringify(body)}\n`
      );
      return 1;
    }
    if (!filtered.length) {
      output.write(
        `[nolo] agent models: no models found${
          filter ? ` matching "${filter}"` : ""
        } at ${base}\n`
      );
      return 1;
    }
    output.write(filtered.join("\n") + "\n");
    return 0;
  } catch (error) {
    output.write(`[nolo] agent models failed: ${toErrorMessage(error)}\n`);
    return 1;
  }
}

/**
 * Send a minimal chat-completion probe to an OpenAI-compatible endpoint.
 * Used by `nolo agent create --verify` to prove the key + endpoint + model work
 * end-to-end right after creating a custom-provider agent. Never logs the key.
 */
export async function verifyCustomProvider(options: {
  providerUrl: string | undefined;
  apiKey: string | undefined;
  model: string | undefined;
  prompt?: string;
  fetchImpl?: CliFetchImpl;
}): Promise<{
  ok: boolean;
  status?: number;
  providerUrl: string;
  model?: string;
  reply?: string;
  reason?: string;
}> {
  const { providerUrl, apiKey, model, prompt = "只回复 OK" } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const provider = providerUrl?.replace(/\/+$/, "") ?? "";

  if (!provider || !apiKey || !model) {
    return {
      ok: false,
      providerUrl: provider,
      model,
      reason: "missing-provider-config (need --custom-provider-url + --api-key + --model)",
    };
  }

  try {
    const res = await fetchImpl(joinBase(provider, "/chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 40,
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { choices?: { message?: { content?: string; reasoning_content?: string } }[] }
      | null;
    const message = data?.choices?.[0]?.message;
    const reply = (message?.content ?? message?.reasoning_content ?? "").trim();
    return { ok: res.ok, status: res.status, providerUrl: provider, model, reply };
  } catch (error) {
    return { ok: false, providerUrl: provider, model, reason: toErrorMessage(error) };
  }
}

/**
 * `nolo agent providers` — list the agent-creation provider presets from the
 * shared providerRegistry (subscription token-plans + metered APIs + OAuth
 * brands). Data-driven off the registry so newly-added providers surface here
 * automatically; `--json` for agent/skill consumption.
 */
export async function runAgentProvidersCommand(
  args: string[],
  deps: AgentCommandDeps = {}
): Promise<number> {
  const output = deps.output ?? process.stdout;
  const wantJson = args.includes("--json");
  const kindFilter = (readOption(args, "--kind") ?? "").trim().toLowerCase();

  try {
    const {
      CUSTOM_API_KEY_TEMPLATES,
      SUBSCRIPTION_OAUTH_PROVIDERS,
    } = await import("ai/agent/providerRegistry");

    const keyTemplates = CUSTOM_API_KEY_TEMPLATES.map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description,
      group: p.commercialKind === "subscription" ? "subscription" : "metered_api",
      commercialKind: p.commercialKind,
      accessVariant: p.accessVariant,
      provider: p.provider,
      baseUrl: p.baseUrl,
      defaultModel: p.defaultModel,
      keyFormatHint: p.keyFormatHint,
      models: (p.modelOptions ?? []).map((m) => ({
        id: m.id,
        label: m.label,
        recommended: m.recommended,
      })),
    }));

    const oauthProviders = SUBSCRIPTION_OAUTH_PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description,
      group: "subscription_oauth",
      commercialKind: "subscription",
      // OAuthProviderConfig has no accessVariant; surface a stable literal.
      accessVariant: "oauth",
      provider: p.provider,
      apiKeyRef: p.apiKeyRef,
      defaultModel: p.defaultModel,
      requiresDesktopOAuth: true,
      models: (p.modelOptions ?? []).map((m) => ({
        id: m.id,
        label: m.label,
        recommended: m.recommended,
      })),
    }));

    const all = [...oauthProviders, ...keyTemplates];
    const filtered = kindFilter
      ? all.filter(
          (p) =>
            p.group === kindFilter ||
            p.commercialKind === kindFilter ||
            p.accessVariant === kindFilter
        )
      : all;

    if (wantJson) {
      output.write(JSON.stringify({ ok: true, providers: filtered }, null, 2) + "\n");
      return 0;
    }

    if (!filtered.length) {
      output.write(`[nolo] agent providers: no presets matching "${kindFilter}"\n`);
      return 1;
    }

    const byGroup = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const list = byGroup.get(p.group) ?? [];
      list.push(p);
      byGroup.set(p.group, list);
    }
    for (const [group, items] of byGroup) {
      output.write(`\n[${group}]\n`);
      for (const p of items) {
        const url = "baseUrl" in p && p.baseUrl ? `  ${p.baseUrl}` : "";
        const def = p.defaultModel ? `  default=${p.defaultModel}` : "";
        output.write(`  ${p.id}  ${p.label}${url}${def}\n`);
        // keyFormatHint only exists on api_key_template items — guard the union.
        if ("keyFormatHint" in p && p.keyFormatHint) {
          output.write(`      key: ${p.keyFormatHint}\n`);
        }
      }
    }
    output.write("\n");
    return 0;
  } catch (error) {
    output.write(`[nolo] agent providers failed: ${toErrorMessage(error)}\n`);
    return 1;
  }
}
