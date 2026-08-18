import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/web/AgentGrid.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var AgentGrid = (0, import_react.memo)(({ children, masonry = false }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: masonry ? "agents-grid agents-grid--masonry" : "agents-grid", children }));
AgentGrid.displayName = "AgentGrid";
var AgentGrid_default = AgentGrid;

export {
  AgentGrid_default
};
