/**
 * Desktop preview handler.
 *
 * Receives a request from the in-process desktop runtime (server side of the
 * desktop app) and asks the host (packages/desktop/src/bun/index.ts) to open
 * the LOCAL PREVIEW SPLIT's iframe at the given URL inside the main window's
 * webview — not the standalone "Nolo Browser" window.
 *
 * Flow: server handler → host's `__noloDesktopApiRequest` bridge → main
 * window webview `executeJavascript` → appInspectorStore.setPreview(true, url)
 * → LocalPreviewSplit re-renders the iframe with the new src.
 */

import { toErrorMessage } from "core/errorMessage";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

type DesktopApiRequest = (payload: {
  type: string;
  action?: string;
  url?: string;
}) => Promise<unknown>;

type HandlerDeps = {
  env?: Record<string, string | undefined>;
  desktopApiRequest?: DesktopApiRequest;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });

const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export async function handleDesktopPreviewOpenPost(
  req: Request,
  deps: HandlerDeps = {},
) {
  const env = deps.env ?? process.env;
  if (env.NOLO_DESKTOP !== "1") {
    return json(
      { error: "Desktop preview is only available inside Nolo Desktop." },
      404,
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const url = body?.url;
  if (!isHttpUrl(url)) {
    return json({ error: "url must be an absolute http(s) URL." }, 400);
  }

  const request =
    deps.desktopApiRequest ??
    ((globalThis as any).__noloDesktopApiRequest as DesktopApiRequest | undefined);
  if (typeof request !== "function") {
    return json(
      { error: "Desktop preview bridge is not connected (desktopApiRequest missing)." },
      503,
    );
  }

  try {
    await request({
      type: "nolo-preview-open",
      action: "open",
      url,
    } as any);
    return json({ ok: true, url });
  } catch (error) {
    return json({ error: toErrorMessage(error) }, 500);
  }
}
