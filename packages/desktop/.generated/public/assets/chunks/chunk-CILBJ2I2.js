// packages/app/utils/env.ts
var processEnv = typeof process !== "undefined" ? process.env : void 0;
var reactNativeDev = typeof globalThis !== "undefined" && "__DEV__" in globalThis ? globalThis.__DEV__ : void 0;
var isProduction = processEnv?.NOLO_FORCE_PRODUCTION === "1" || processEnv?.NODE_ENV === "production" || reactNativeDev === false;
var isDevelopment = !isProduction;
var getIsDesktopApp = () => (typeof process !== "undefined" ? process.env?.NOLO_DESKTOP : processEnv?.NOLO_DESKTOP) === "1" || typeof window !== "undefined" && window.__NOLO_DESKTOP__ === true;
var isDesktopApp = getIsDesktopApp();

export {
  isProduction,
  isDevelopment,
  getIsDesktopApp,
  isDesktopApp
};
