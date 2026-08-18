import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/hooks/useHasMounted.ts
var import_react = __toESM(require_react());
var useHasMounted = () => {
  const [hasMounted, setHasMounted] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    setHasMounted(true);
  }, []);
  return hasMounted;
};

export {
  useHasMounted
};
