import {
  fetchReferenceContents
} from "/public/assets/chunks/chunk-KF3GADC7.js";
import {
  resolveReferenceAssets
} from "/public/assets/chunks/chunk-IDOLQ4EL.js";

// packages/ai/agent/fetchAgentContexts.ts
async function fetchAgentContexts(references, dispatch) {
  if (!Array.isArray(references)) {
    return { botInstructionsContext: "", botKnowledgeContext: "" };
  }
  const { references: normalizedRefs, contentByKey } = await resolveReferenceAssets(references, dispatch);
  const instructionKeys = /* @__PURE__ */ new Set();
  const knowledgeKeys = /* @__PURE__ */ new Set();
  normalizedRefs.forEach((ref) => {
    if (!ref.dbKey) return;
    ref.type === "instruction" ? instructionKeys.add(ref.dbKey) : knowledgeKeys.add(ref.dbKey);
  });
  const [instructionsMap, knowledgeMap] = await Promise.all([
    fetchReferenceContents(Array.from(instructionKeys), dispatch, {
      preloaded: contentByKey
    }),
    fetchReferenceContents(Array.from(knowledgeKeys), dispatch, {
      preloaded: contentByKey
    })
  ]);
  return {
    botInstructionsContext: Array.from(instructionsMap.values()).join(""),
    botKnowledgeContext: Array.from(knowledgeMap.values()).join("")
  };
}

export {
  fetchAgentContexts
};
