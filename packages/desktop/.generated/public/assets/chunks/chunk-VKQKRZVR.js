// packages/ai/agent/isVoiceModel.ts
function isVoiceModel(model, provider) {
  const providerLower = String(provider || "").toLowerCase();
  const modelLower = String(model || "").toLowerCase();
  if (providerLower === "google" && modelLower.includes("live")) return true;
  if (modelLower.includes("live-preview")) return true;
  if (modelLower.includes("live-001")) return true;
  if (modelLower.includes("native-audio")) return true;
  return false;
}

export {
  isVoiceModel
};
