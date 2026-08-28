export function resolveTargetSpaceId(explicit?: string) {
  const value = explicit?.trim();
  return value || undefined;
}
