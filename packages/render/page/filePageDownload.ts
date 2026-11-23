/** A remote capability is fetched only on click; only a local blob URL is
 * handed to the browser's download link (also works for CORS-enabled origins). */
export async function loadFilePageDownload(
  getFresh: () => Promise<string | null>,
  signal: AbortSignal,
  request: typeof fetch = fetch,
): Promise<Blob> {
  const src = await getFresh();
  signal.throwIfAborted();
  if (!src) throw new Error("文件当前不可下载");
  const response = await request(src, { credentials: "omit", redirect: "error", cache: "no-store", signal });
  if (!response.ok) throw new Error("文件下载失败");
  return response.blob();
}
