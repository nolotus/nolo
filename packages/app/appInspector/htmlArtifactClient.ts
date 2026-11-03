import type { HtmlArtifact } from "core/htmlArtifact";
export type { HtmlArtifact } from "core/htmlArtifact";

export type HtmlArtifactClientOptions = {
  fetchImpl?: typeof fetch;
  serverOrigin?: string;
  authToken?: string | null;
};

export async function createHtmlArtifact(
  params: { title?: string; html: string; dialogKey: string },
  options?: HtmlArtifactClientOptions
): Promise<HtmlArtifact> {
  const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
  if (!fetchFn) {
    throw new Error("fetch is not available in current environment");
  }

  const base = options?.serverOrigin ? options.serverOrigin.replace(/\/+$/, "") : "";
  const url = `${base}/api/html-artifacts`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
  }

  const response = await fetchFn(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      action: "create",
      title: params.title,
      html: params.html,
      dialogKey: params.dialogKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`创建 HTML 成品失败 (${response.status}): ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as { artifact?: HtmlArtifact };
  if (!data?.artifact) {
    throw new Error("服务端未返回有效的 HTML 成品对象");
  }
  return data.artifact;
}

export async function readHtmlArtifact(
  id: string,
  options?: HtmlArtifactClientOptions
): Promise<HtmlArtifact> {
  const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
  if (!fetchFn) {
    throw new Error("fetch is not available in current environment");
  }

  const base = options?.serverOrigin ? options.serverOrigin.replace(/\/+$/, "") : "";
  const url = `${base}/api/html-artifacts`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
  }

  const response = await fetchFn(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      action: "read",
      id,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`读取 HTML 成品失败 (${response.status}): ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as { artifact?: HtmlArtifact };
  if (!data?.artifact) {
    throw new Error("服务端未返回有效的 HTML 成品对象");
  }
  return data.artifact;
}

export async function updateHtmlArtifact(
  params: { id: string; title?: string; html?: string },
  options?: HtmlArtifactClientOptions
): Promise<HtmlArtifact> {
  const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
  if (!fetchFn) {
    throw new Error("fetch is not available in current environment");
  }

  const base = options?.serverOrigin ? options.serverOrigin.replace(/\/+$/, "") : "";
  const url = `${base}/api/html-artifacts`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
  }

  const response = await fetchFn(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      action: "update",
      id: params.id,
      title: params.title,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`更新 HTML 成品失败 (${response.status}): ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as { artifact?: HtmlArtifact };
  if (!data?.artifact) {
    throw new Error("服务端未返回有效的 HTML 成品对象");
  }
  return data.artifact;
}

export async function listHtmlArtifacts(
  dialogKey: string,
  options?: HtmlArtifactClientOptions
): Promise<HtmlArtifact[]> {
  const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
  if (!fetchFn) {
    throw new Error("fetch is not available in current environment");
  }

  const base = options?.serverOrigin ? options.serverOrigin.replace(/\/+$/, "") : "";
  const url = `${base}/api/html-artifacts`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
  }

  const response = await fetchFn(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      action: "list",
      dialogKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`获取 HTML 成品列表失败 (${response.status}): ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as { artifacts?: HtmlArtifact[] };
  return Array.isArray(data?.artifacts) ? data.artifacts : [];
}
