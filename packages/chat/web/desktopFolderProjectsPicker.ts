/** Native picker: cancellation stays null; transport and API errors remain visible. */
export async function requestPickFolderPath(): Promise<string | null> {
  const response = await fetch("/api/desktop/pick-folder", { method: "POST" });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "选择文件夹失败");
  return typeof result.path === "string" && result.path.trim() ? result.path.trim() : null;
}
