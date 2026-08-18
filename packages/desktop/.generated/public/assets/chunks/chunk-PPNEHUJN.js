import {
  Navigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  selectUserId
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/auth/components/RequireSignedIn.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var RequireSignedIn = ({ children }) => {
  const userId = useAppSelector(selectUserId);
  if (!userId) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/auth/login", replace: true });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
};
var RequireSignedIn_default = RequireSignedIn;

export {
  RequireSignedIn_default
};
