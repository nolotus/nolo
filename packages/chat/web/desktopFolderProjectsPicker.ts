export class FolderPickerUnavailableError extends Error {}
/** A missing capability hides the entry; transient probe failures remain retryable. */
export async function probeFolderPicker(): Promise<boolean> {
  const response = await fetch("/api/desktop/pick-folder", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "capability" }),
    signal: AbortSignal.timeout(5000),
  });
  if ([404, 405, 501].includes(response.status)) return false;
  const result = await response.json();
  if (response.ok && result.ok && typeof result.available === "boolean" && Array.isArray(result.channels)) {
    if (result.retryable) throw new Error(result.reason || "无法检查文件夹选择能力");
    return result.available && result.channels.length > 0;
  }
  // Older desktop runtimes cannot prove native capability; never infer it from HTTP 400.
  if (response.status === 400 && result.error === "Unknown folder action") return false;
  throw new Error(result.error || "无法检查文件夹选择能力");
}
/** Native picker: cancellation stays null; transport and API errors remain visible. */
export async function requestPickFolderPath(): Promise<string | null> {
  const response = await fetch("/api/desktop/pick-folder", { method: "POST" });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    const message = result.error || "选择文件夹失败";
    if ([404, 405, 501].includes(response.status) || /No native folder picker available|No PowerShell executable available/.test(message))
      throw new FolderPickerUnavailableError(message);
    throw new Error(message);
  }
  return typeof result.path === "string" && result.path.trim() ? result.path.trim() : null;
}
