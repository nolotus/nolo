import {
  extractRuntimePageCapabilities,
  resolveSkillGraphFromRoots
} from "/public/assets/chunks/chunk-LWXWW4DE.js";
import {
  read
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/ai/agent/referenceUtils.ts
function mergeReferences(base, extra) {
  const safeBase = Array.isArray(base) ? base : [];
  const safeExtra = Array.isArray(extra) ? extra : [];
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const item of [...safeBase, ...safeExtra]) {
    const key = item.dbKey;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    merged.push(item);
  }
  return merged;
}
var loadContentsByKeys = async (keys, dispatch, preloaded) => {
  const contentByKey = /* @__PURE__ */ new Map();
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
  await Promise.all(
    uniqueKeys.map(async (dbKey) => {
      if (preloaded?.has(dbKey)) {
        const content = preloaded.get(dbKey);
        if (content) contentByKey.set(dbKey, content);
        return;
      }
      try {
        const content = await dispatch(read({ dbKey })).unwrap();
        if (content) contentByKey.set(dbKey, content);
      } catch {
      }
    })
  );
  return contentByKey;
};
var resolveReferenceAssets = async (references, dispatch) => {
  if (!Array.isArray(references) || references.length === 0) {
    return {
      references: [],
      referencedTools: [],
      recommendedSkillTools: [],
      recommendedSkillHints: [],
      skillPromptPatches: [],
      contentByKey: /* @__PURE__ */ new Map()
    };
  }
  const entries = await Promise.all(
    references.filter((ref) => ref?.dbKey).map(async (ref) => {
      try {
        const content = await dispatch(read({ dbKey: ref.dbKey })).unwrap();
        return { ref, content };
      } catch {
        return { ref, content: null };
      }
    })
  );
  const contentByKey = /* @__PURE__ */ new Map();
  const toolSet = /* @__PURE__ */ new Set();
  const recommendedToolSet = /* @__PURE__ */ new Set();
  const recommendedSkillHints = /* @__PURE__ */ new Set();
  const skillPromptPatches = /* @__PURE__ */ new Set();
  const normalizedReferences = [];
  const hardSkillKeys = /* @__PURE__ */ new Set();
  const softSkillKeys = /* @__PURE__ */ new Set();
  for (const { ref, content } of entries) {
    if (content) {
      contentByKey.set(ref.dbKey, content);
    }
    const capabilities = extractRuntimePageCapabilities(content);
    for (const tool of capabilities.directTools) {
      toolSet.add(tool);
    }
    for (const tool of capabilities.hardSkillTools) {
      toolSet.add(tool);
    }
    for (const hint of capabilities.softSkillHints) {
      recommendedSkillHints.add(hint);
    }
    for (const patch of capabilities.promptPatches) {
      skillPromptPatches.add(patch);
    }
    for (const skillKey of capabilities.hardSkillKeys) {
      hardSkillKeys.add(skillKey);
    }
    for (const skillKey of capabilities.softSkillKeys) {
      softSkillKeys.add(skillKey);
    }
    normalizedReferences.push({
      ...ref,
      type: capabilities.shouldUpgradeReference ? "instruction" : ref.type
    });
  }
  const resolvedSkillLinks = await resolveSkillGraphFromRoots({
    roots: [
      ...Array.from(hardSkillKeys).map((identifier) => ({ identifier, mode: "required" })),
      ...Array.from(softSkillKeys).map((identifier) => ({ identifier, mode: "recommended" }))
    ],
    loadPage: async (identifier) => {
      const loaded = await loadContentsByKeys([identifier], dispatch, contentByKey);
      return loaded.get(identifier) ?? null;
    },
    contentByKey
  });
  resolvedSkillLinks.contentByKey.forEach((value, key) => contentByKey.set(key, value));
  for (const tool of resolvedSkillLinks.requiredTools) {
    toolSet.add(tool);
  }
  for (const tool of resolvedSkillLinks.recommendedTools) {
    recommendedToolSet.add(tool);
  }
  for (const hint of resolvedSkillLinks.recommendedSkillHints) {
    recommendedSkillHints.add(hint);
  }
  for (const patch of resolvedSkillLinks.skillPromptPatches) {
    skillPromptPatches.add(patch);
  }
  return {
    references: normalizedReferences,
    referencedTools: Array.from(toolSet),
    recommendedSkillTools: Array.from(recommendedToolSet),
    recommendedSkillHints: Array.from(recommendedSkillHints),
    skillPromptPatches: Array.from(skillPromptPatches),
    contentByKey
  };
};
var resolveToolsFromKeys = async (keys, dispatch, preloaded) => {
  if (!Array.isArray(keys) || keys.length === 0) {
    return {
      tools: [],
      recommendedSkillTools: [],
      recommendedSkillHints: [],
      skillPromptPatches: [],
      contentByKey: /* @__PURE__ */ new Map()
    };
  }
  const contentByKey = await loadContentsByKeys(keys, dispatch, preloaded);
  const toolSet = /* @__PURE__ */ new Set();
  const recommendedToolSet = /* @__PURE__ */ new Set();
  const recommendedSkillHints = /* @__PURE__ */ new Set();
  const skillPromptPatches = /* @__PURE__ */ new Set();
  const hardSkillKeys = /* @__PURE__ */ new Set();
  const softSkillKeys = /* @__PURE__ */ new Set();
  for (const content of contentByKey.values()) {
    const capabilities = extractRuntimePageCapabilities(content);
    for (const tool of [...capabilities.directTools, ...capabilities.hardSkillTools]) {
      toolSet.add(tool);
    }
    for (const hint of capabilities.softSkillHints) {
      recommendedSkillHints.add(hint);
    }
    for (const patch of capabilities.promptPatches) {
      skillPromptPatches.add(patch);
    }
    for (const skillKey of capabilities.hardSkillKeys) {
      hardSkillKeys.add(skillKey);
    }
    for (const skillKey of capabilities.softSkillKeys) {
      softSkillKeys.add(skillKey);
    }
  }
  const resolvedSkillLinks = await resolveSkillGraphFromRoots({
    roots: [
      ...Array.from(hardSkillKeys).map((identifier) => ({ identifier, mode: "required" })),
      ...Array.from(softSkillKeys).map((identifier) => ({ identifier, mode: "recommended" }))
    ],
    loadPage: async (identifier) => {
      const loaded = await loadContentsByKeys([identifier], dispatch, contentByKey);
      return loaded.get(identifier) ?? null;
    },
    contentByKey
  });
  resolvedSkillLinks.contentByKey.forEach((value, key) => contentByKey.set(key, value));
  for (const tool of resolvedSkillLinks.requiredTools) {
    toolSet.add(tool);
  }
  for (const tool of resolvedSkillLinks.recommendedTools) {
    recommendedToolSet.add(tool);
  }
  for (const hint of resolvedSkillLinks.recommendedSkillHints) {
    recommendedSkillHints.add(hint);
  }
  for (const patch of resolvedSkillLinks.skillPromptPatches) {
    skillPromptPatches.add(patch);
  }
  return {
    tools: Array.from(toolSet),
    recommendedSkillTools: Array.from(recommendedToolSet),
    recommendedSkillHints: Array.from(recommendedSkillHints),
    skillPromptPatches: Array.from(skillPromptPatches),
    contentByKey
  };
};

export {
  mergeReferences,
  resolveReferenceAssets,
  resolveToolsFromKeys
};
