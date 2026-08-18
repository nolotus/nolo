import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/hooks/useChatInputSeed.ts
var import_react = __toESM(require_react());
var currentSeed = null;
var listeners = /* @__PURE__ */ new Set();
function publishChatInputSeed(seed) {
  currentSeed = seed;
  listeners.forEach((listener) => listener(seed));
}
function subscribeChatInputSeed(listener) {
  listeners.add(listener);
  listener(currentSeed);
  return () => {
    listeners.delete(listener);
  };
}
function useChatInputSeed() {
  const [seed, setSeed] = (0, import_react.useState)(currentSeed);
  (0, import_react.useEffect)(() => subscribeChatInputSeed(setSeed), []);
  return seed;
}

export {
  publishChatInputSeed,
  subscribeChatInputSeed,
  useChatInputSeed
};
