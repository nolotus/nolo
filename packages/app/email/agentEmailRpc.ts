export async function postAuthorizedJsonRpc<T = unknown>(
  serverOrigin: string,
  token: string,
  path: string,
  body: unknown
): Promise<T> {
  const base = serverOrigin.replace(/\/+$/, "");
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { rawText: text };
  }
  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status}`), { payload });
  }
  return payload as T;
}

export async function listAgentInboxEmails(args: {
  serverOrigin: string;
  token: string;
  agentId: string;
  limit?: number;
}) {
  return postAuthorizedJsonRpc<unknown[]>(args.serverOrigin, args.token, "/rpc/listEmails", {
    ownerId: args.agentId,
    mailbox: "inbox",
    limit: args.limit ?? 50,
  });
}