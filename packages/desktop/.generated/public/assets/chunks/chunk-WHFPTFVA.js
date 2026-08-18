// packages/app/utils/localStorageState.ts
function readStorageJSON(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeStorageJSON(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
function readStorageFlag(key, fallback = false) {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return fallback;
  }
}
function writeStorageFlag(key) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
  }
}

export {
  readStorageJSON,
  writeStorageJSON,
  readStorageFlag,
  writeStorageFlag
};
