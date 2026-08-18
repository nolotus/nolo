import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/layout/RightSidebarContext.tsx
var import_react = __toESM(require_react(), 1);
var RightSidebarContext = (0, import_react.createContext)(null);
var useRightSidebar = () => {
  const ctx = (0, import_react.useContext)(RightSidebarContext);
  if (!ctx) {
    throw new Error(
      "useRightSidebar \u5FC5\u987B\u5728 <RightSidebarContext.Provider> \u5185\u90E8\u4F7F\u7528\uFF08\u5373 MainLayout \u5185\u90E8\uFF09\u3002"
    );
  }
  return ctx;
};
var RightSidebarContext_default = RightSidebarContext;

export {
  useRightSidebar,
  RightSidebarContext_default
};
