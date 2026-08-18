// packages/agent-runtime/modelLayerOverride.ts
var MODEL_LAYER_KEYS = [
  "provider",
  "model",
  "apiSource",
  "cliProvider",
  "useServerProxy",
  "apiKey",
  "apiKeyRef",
  "apiKeyHeader",
  "customProviderUrl",
  "credentialRef",
  "credentialSynced",
  "temperature",
  "top_p",
  "frequency_penalty",
  "presence_penalty",
  "max_tokens",
  "reasoning_effort",
  "enableThinking",
  "thinkingBudget"
];
function mergeReferences(base, extra) {
  const safeBase = Array.isArray(base) ? base : [];
  const safeExtra = Array.isArray(extra) ? extra : [];
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const item of [...safeBase, ...safeExtra]) {
    const key = item?.dbKey;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    if (item) merged.push(item);
  }
  return merged;
}
var asNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
function buildModelLayerOverride(agent) {
  if (!agent || !asNonEmptyString(agent.provider) || !asNonEmptyString(agent.model)) {
    return null;
  }
  const override = {
    provider: agent.provider,
    model: agent.model
  };
  for (const key of MODEL_LAYER_KEYS) {
    if (key === "provider" || key === "model") continue;
    const value = agent[key];
    if (value !== void 0) {
      override[key] = value;
    }
  }
  if (Array.isArray(agent.references) && agent.references.length > 0) {
    override.references = agent.references;
  }
  return override;
}
function applyModelLayerOverride(base, override) {
  const next = { ...base };
  for (const key of MODEL_LAYER_KEYS) {
    delete next[key];
  }
  for (const key of MODEL_LAYER_KEYS) {
    const value = override[key];
    if (value !== void 0) {
      next[key] = value;
    }
  }
  const merged = mergeReferences(
    base.references,
    override.references
  );
  if (merged.length > 0) {
    next.references = merged;
  } else {
    delete next.references;
  }
  return next;
}

// packages/ai/agent/quickChatModelOverride.ts
function buildQuickChatModelOverride(agent) {
  return buildModelLayerOverride(agent);
}
function applyQuickChatModelOverride(base, override) {
  return applyModelLayerOverride(
    base,
    override
  );
}

export {
  buildQuickChatModelOverride,
  applyQuickChatModelOverride
};
