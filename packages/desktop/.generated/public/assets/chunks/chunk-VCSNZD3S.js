// packages/ai/agent/utils/publicImageAgentMode.ts
var getPublicImageAgentMode = (agent) => {
  if (!agent) return null;
  if (agent.imageWorkflow) return agent.imageWorkflow;
  return null;
};
var getPublicImageAgentDefaultProfile = (mode) => {
  if (mode === "generate") {
    return { quality: "medium", size: "1024x1024", outputFormat: "png" };
  }
  if (mode === "edit") {
    return { quality: "medium", size: "auto", outputFormat: "png" };
  }
  return { quality: "low", size: "auto", outputFormat: "png" };
};

export {
  getPublicImageAgentMode,
  getPublicImageAgentDefaultProfile
};
