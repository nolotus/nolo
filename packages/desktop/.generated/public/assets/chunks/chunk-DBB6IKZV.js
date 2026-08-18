// packages/core/foldHomePath.ts
function foldHomePath(path, home) {
  if (!path) return path;
  if (home) {
    const cleanHome = home.endsWith("/") ? home.slice(0, -1) : home;
    if (path === cleanHome) return "~";
    if (path.startsWith(cleanHome + "/")) return `~${path.slice(cleanHome.length)}`;
  }
  return path.replace(/^(\/Users\/[^/]+|\/home\/[^/]+)(\/|$)/, "~$2");
}

export {
  foldHomePath
};
