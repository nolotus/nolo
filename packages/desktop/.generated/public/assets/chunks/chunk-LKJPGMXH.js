import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/hooks/useMediaQuery.ts
var import_react = __toESM(require_react());
function useMediaQuery(query) {
  const [matches, setMatches] = (0, import_react.useState)(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  });
  (0, import_react.useEffect)(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const queryList = window.matchMedia(query);
    const handleChange = (event) => {
      setMatches(event.matches);
    };
    setMatches(queryList.matches);
    queryList.addEventListener("change", handleChange);
    return () => {
      queryList.removeEventListener("change", handleChange);
    };
  }, [query]);
  return matches;
}

export {
  useMediaQuery
};
