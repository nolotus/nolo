import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/share/shareStore.ts
var import_react = __toESM(require_react(), 1);
var createInitialState = () => ({
  communityShares: {
    loading: false,
    error: null,
    data: [],
    nextCursor: void 0
  }
});
var clientState = createInitialState();
var ssrOverrideGetter = null;
var listeners = /* @__PURE__ */ new Set();
var notify = () => {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
    }
  }
};
var bump = () => {
  notify();
};
function getState() {
  if (ssrOverrideGetter) {
    const override = ssrOverrideGetter();
    if (override) return override;
  }
  return clientState;
}
function setSSRCommunityShares(args) {
  clientState = {
    communityShares: {
      loading: false,
      error: null,
      data: Array.isArray(args.data) ? args.data : [],
      nextCursor: args.nextCursor
    }
  };
  bump();
}
function getSSRCommunityShares() {
  const { communityShares } = getState();
  return {
    data: communityShares.data,
    ...communityShares.nextCursor !== void 0 ? { nextCursor: communityShares.nextCursor } : {}
  };
}
function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function getSnapshot() {
  const { communityShares } = getState();
  return JSON.stringify({
    data: communityShares.data,
    nextCursor: communityShares.nextCursor ?? null
  });
}
function useSSRCommunityShares() {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getSSRCommunityShares();
}

export {
  setSSRCommunityShares,
  useSSRCommunityShares
};
