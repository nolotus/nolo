import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { isMcpPublicAddress, type McpResolvedAddress } from "../../agent-runtime/mcpNetworkPolicy";
const fake = new BlockList(); fake.addSubnet("198.18.0.0", 15, "ipv4");
const normalize = (name: string) => name.toLowerCase().replace(/\.$/, "");
/** Host-owned local MCP escape from Clash synthetic DNS only. Not a configurable DNS/proxy stack. */
export function createMcpLocalResolver(deps: {
 lookup?: (host: string) => Promise<McpResolvedAddress[]>;
 fetch?: (url: string, init?: RequestInit) => Promise<Response>;
} = {}) {
 return async (host: string, signal?: AbortSignal): Promise<McpResolvedAddress[]> => {
  const bounded = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(8000)]);
  const wait = async <T>(work: Promise<T>): Promise<T> => {
   bounded.throwIfAborted();
   return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new Error("network_denied")); bounded.addEventListener("abort", abort, { once: true });
    work.then(value => { bounded.removeEventListener("abort", abort); if (bounded.aborted) reject(new Error("network_denied")); else resolve(value); }, error => { bounded.removeEventListener("abort", abort); reject(error); });
   });
  };
  bounded.throwIfAborted();
  if (isIP(host)) throw new Error("network_denied");
  const answers = await wait((deps.lookup ?? (name => lookup(name, { all: true, verbatim: true })))(host));
  if (!answers.length || answers.length > 32 || answers.some(a => isIP(a.address) !== a.family)) throw new Error("network_denied");
  if (!answers.some(a => a.family === 4 && fake.check(a.address, "ipv4"))) return answers;
  // Mixed synthetic + private results are not a reason to export an internal hostname.
  if (answers.some(a => !(a.family === 4 && fake.check(a.address, "ipv4")) && !isMcpPublicAddress(a.address))) throw new Error("network_denied");
  const name = normalize(host);
  if (name.length > 253 || !name.includes(".") || !name.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || /\.(?:local|localhost|internal|lan|home|test|invalid)$/.test(name)) throw new Error("network_denied");
  const groups = await Promise.all([1, 28].map(async type => {
   const url = new URL("https://dns.google/resolve"); url.searchParams.set("name", name); url.searchParams.set("type", String(type));
   const response = await wait((deps.fetch ?? ((url, init) => fetch(url, init)))(url.toString(), { signal: bounded, redirect: "error", credentials: "omit", headers: { accept: "application/dns-json" } }));
   if (!response.ok || !response.body || Number(response.headers.get("content-length") ?? 0) > 65536) throw new Error("network_denied");
   const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
   try { while (true) { const next = await wait(reader.read()); if (next.done) break; size += next.value.byteLength; if (size > 65536) throw new Error("network_denied"); chunks.push(next.value); } }
   finally { await reader.cancel().catch(() => {}); }
   const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
   if (data.Status !== 0 || data.TC === true || !Array.isArray(data.Question) || data.Question.length !== 1 || normalize(String(data.Question[0].name)) !== name || data.Question[0].type !== type || (data.Answer !== undefined && !Array.isArray(data.Answer)) || (data.Answer?.length ?? 0) > 32) throw new Error("network_denied");
   const records = data.Answer ?? [];
   const validName = (value: string) => value.length <= 253 && value.includes(".") && value.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) && !/\.(?:local|localhost|internal|lan|home|test|invalid)$/.test(value);
   const aliases = new Map<string, string>();
   for (const answer of records) {
    if (!answer || typeof answer.name !== "string" || typeof answer.data !== "string" || !validName(normalize(answer.name))) throw new Error("network_denied");
    if (answer.type === 5) {
     const owner = normalize(answer.name), target = normalize(answer.data);
     if (!validName(target) || aliases.has(owner)) throw new Error("network_denied");
     aliases.set(owner, target);
    } else if (answer.type !== type || isIP(answer.data) !== (type === 1 ? 4 : 6) || !isMcpPublicAddress(answer.data)) throw new Error("network_denied");
   }
   const chain = new Set<string>(); let terminal = name;
   while (aliases.has(terminal)) { if (chain.has(terminal) || chain.size >= 8) throw new Error("network_denied"); chain.add(terminal); terminal = aliases.get(terminal)!; }
   if ([...aliases.keys()].some(owner => !chain.has(owner))) throw new Error("network_denied");
   return records.filter((answer: any) => answer.type !== 5).map((answer: any): McpResolvedAddress => {
    if (normalize(answer.name) !== terminal) throw new Error("network_denied");
    return { address: answer.data, family: type === 1 ? 4 : 6 };
   });
  }));
  bounded.throwIfAborted(); const result = groups.flat();
  if (!result.length || result.length > 32) throw new Error("network_denied");
  return result;
 };
}
export const resolveMcpLocalHost = createMcpLocalResolver();
