import {
  useMediaQuery
} from "/public/assets/chunks/chunk-LKJPGMXH.js";

// packages/app/hooks/useIsMobile.ts
function useIsMobile(breakpoint = 768) {
  return useMediaQuery(`(max-width: ${breakpoint}px)`);
}

export {
  useIsMobile
};
