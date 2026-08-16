export function canPreviewJson(rawCode: string) {
  if (!rawCode.trim()) return false;

  try {
    JSON.parse(rawCode);
    return true;
  } catch {
    return false;
  }
}
