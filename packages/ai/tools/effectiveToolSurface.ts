import { resolveAgentRequiredPackIds } from "./agentSkillConfig";
import { expandEnabledPacks } from "./toolPacks";
import { canonicalizeToolName } from "./toolNameAliases";

export type EffectiveToolSurfaceSource =
  | "explicit"
  | "required-pack"
  | "runtime-policy"
  | "reference"
  | "mention"
  | "host-injected"
  | "runtime-extra";

export type EffectiveToolSurfaceEntry = {
  name: string;
  sources: EffectiveToolSurfaceSource[];
};

export type EffectiveToolSurface = {
  /** Final canonical tool names after disabledTools is applied. */
  names: string[];
  /** Same surface with provenance, in stable first-seen order. */
  entries: EffectiveToolSurfaceEntry[];
  /** Agent/turn requested surface before host defaults. */
  requestedNames: string[];
  /** Host defaults that survived disabledTools. */
  hostInjectedNames: string[];
  /** Hosted execution constraints that are not expressible as ordinary tool names. */
  shellEnabled: boolean;
  workspaceModes: string[];
  workspaceLease: boolean;
};

export type ResolveEffectiveToolSurfaceInput = {
  agent?: Record<string, any> | null;
  /** Turn/runtime reference tools already resolved by the caller. */
  referencedToolNames?: Iterable<unknown> | null;
  /** Tools activated by mentions/context objects for this turn. */
  mentionedToolNames?: Iterable<unknown> | null;
  /**
   * Tools the concrete host actually injected after its own defaults/filters.
   * The resolver deliberately does not recreate Web/CLI/Desktop host policy.
   */
  hostInjectedToolNames?: Iterable<unknown> | null;
  /** Per-turn additions such as runtimeOptions.extraTools. */
  runtimeExtraToolNames?: Iterable<unknown> | null;
};

export function readEffectiveToolName(value: unknown): string | null {
  if (typeof value === "string") {
    const name = canonicalizeToolName(value.trim());
    return name || null;
  }
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, any>;
  const candidate =
    (typeof record.name === "string" && record.name) ||
    (typeof record.toolName === "string" && record.toolName) ||
    (typeof record.function?.name === "string" && record.function.name) ||
    "";
  const name = canonicalizeToolName(candidate.trim());
  return name || null;
}

function valuesOf(iterable: Iterable<unknown> | null | undefined): unknown[] {
  return iterable ? [...iterable] : [];
}

/**
 * Compose a canonical tool surface from already-existing runtime truth sources.
 *
 * This function owns normalization, de-duplication, provenance and disabledTools
 * application only. It intentionally does NOT decide which host defaults exist:
 * Web/CLI/Desktop must pass the tools they really injected via
 * `hostInjectedToolNames`, keeping host policy single-sourced in each runtime.
 */
export function resolveEffectiveToolSurface(
  input: ResolveEffectiveToolSurfaceInput,
): EffectiveToolSurface {
  const agent = input.agent ?? {};
  const byName = new Map<string, Set<EffectiveToolSurfaceSource>>();

  const add = (values: Iterable<unknown>, source: EffectiveToolSurfaceSource) => {
    for (const value of values) {
      const name = readEffectiveToolName(value);
      if (!name) continue;
      let sources = byName.get(name);
      if (!sources) {
        sources = new Set<EffectiveToolSurfaceSource>();
        byName.set(name, sources);
      }
      sources.add(source);
    }
  };

  add(Array.isArray(agent.tools) ? agent.tools : [], "explicit");
  add(Array.isArray(agent.toolNames) ? agent.toolNames : [], "explicit");

  // New skills config is the truth source when present; the shared resolver
  // already handles fallback to legacy enabledPacks without double-counting a
  // stale compatibility field.
  const requiredPackIds = resolveAgentRequiredPackIds(agent as any);
  add(expandEnabledPacks(requiredPackIds), "required-pack");

  const policies = [
    agent.runtimeToolPolicy,
    agent.runtimeBinding?.runtimeToolPolicy,
    agent.runtimeBinding?.runtimeToolPolicySnapshot,
  ];
  for (const policy of policies) {
    if (!policy || typeof policy !== "object") continue;
    add(Array.isArray(policy.agentTools) ? policy.agentTools : [], "runtime-policy");
    add(Array.isArray(policy.runtimeTools) ? policy.runtimeTools : [], "runtime-policy");
  }

  // Persisted reference-derived tools (for example required built-in skills)
  // are a real part of the model-visible surface in mergeAgentToolsWithRuntime.
  add(Array.isArray(agent.referencedTools) ? agent.referencedTools : [], "reference");
  add(valuesOf(input.referencedToolNames), "reference");
  add(valuesOf(input.mentionedToolNames), "mention");
  add(valuesOf(input.hostInjectedToolNames), "host-injected");
  add(valuesOf(input.runtimeExtraToolNames), "runtime-extra");

  const disabled = new Set(
    (Array.isArray(agent.disabledTools) ? agent.disabledTools : [])
      .map(readEffectiveToolName)
      .filter((name): name is string => !!name),
  );
  for (const name of disabled) byName.delete(name);

  const entries: EffectiveToolSurfaceEntry[] = [...byName.entries()].map(
    ([name, sources]) => ({ name, sources: [...sources] }),
  );
  const requestedSources = new Set<EffectiveToolSurfaceSource>([
    "explicit",
    "required-pack",
    "runtime-policy",
    "reference",
    "mention",
    "runtime-extra",
  ]);

  const requestedNames = entries
    .filter((entry) => entry.sources.some((source) => requestedSources.has(source)))
    .map((entry) => entry.name);
  const hostInjectedNames = entries
    .filter((entry) => entry.sources.includes("host-injected"))
    .map((entry) => entry.name);

  const shellEnabled = policies.some(
    (policy) => policy && typeof policy === "object" && policy.shell?.enabled === true,
  );
  const workspaceModes = [
    ...new Set(
      policies
        .map((policy) =>
          policy && typeof policy === "object" && typeof policy.workspace?.mode === "string"
            ? policy.workspace.mode.trim()
            : "",
        )
        .filter(Boolean),
    ),
  ];

  return {
    names: entries.map((entry) => entry.name),
    entries,
    requestedNames,
    hostInjectedNames,
    shellEnabled,
    workspaceModes,
    workspaceLease: workspaceModes.includes("lease"),
  };
}
