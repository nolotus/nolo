import {
  isVoiceModel
} from "/public/assets/chunks/chunk-VKQKRZVR.js";

// packages/ai/agent/isLiveAudioOnlyAgent.ts
function isLiveAudioOnlyAgent(agent) {
  if (agent.defaultInteractionMode !== "live_audio") return false;
  return isVoiceModel(agent.model, agent.provider);
}

export {
  isLiveAudioOnlyAgent
};
