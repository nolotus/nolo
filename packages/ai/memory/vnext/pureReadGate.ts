export const isMemoryVNextPureReadEnabled = (
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {}
): boolean =>
  env.NOLO_MEMORY_VNEXT_PURE_READ === "1" ||
  env.NOLO_MEMORY_VNEXT_PURE_READ === "true";
