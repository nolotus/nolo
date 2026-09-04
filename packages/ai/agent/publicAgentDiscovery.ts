import type { Agent } from "app/types";

export async function fetchPublicAgentsForDiscovery(args: {
  serverBase: string;
  token?: string;
  limit?: number;
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}): Promise<Agent[]> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const response = await fetchImpl(`${args.serverBase.replace(/\/$/, "")}/rpc/getPublicAgents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(args.token ? { Authorization: `Bearer ${args.token}` } : {}),
    },
    body: JSON.stringify({ limit: Math.min(args.limit ?? 500, 500), summary: true }),
  });
  if (!response.ok) throw new Error(`Public agent catalog request failed (${response.status})`);
  const payload = await response.json();
  const data = Array.isArray(payload?.data?.data)
    ? payload.data.data
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : null;
  if (!data) throw new Error("Public agent catalog returned an invalid response");
  return data as Agent[];
}
