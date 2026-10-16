/**
 * WorkBuddy model catalog parsing and controlled config retrieval.
 * Pricing values are usage-credit multipliers, not currency prices.
 *
 * Model promotion behavior is informed by magpie's WorkBuddy plugin:
 * Copyright (c) 2026 magpie-community contributors, MIT License.
 */
export type WorkBuddyCatalogModel = {
  id: string;
  label: string;
  hasVision?: boolean;
  contextWindow?: number;
  maxOutputTokens?: number;
  pricing?: {
    rate?: number;
    free: boolean;
    rateWas?: number;
    observedAt: number;
    requiresActivePackage: true;
  };
};

type Site = "workbuddy" | "workbuddy-ai";
type Dict = Record<string, unknown>;
const endpoint: Record<Site, string> = {
  workbuddy: "https://copilot.tencent.com",
  "workbuddy-ai": "https://www.workbuddy.ai",
};
const isDict = (v: unknown): v is Dict => typeof v === "object" && v !== null && !Array.isArray(v);
const finite = (v: unknown): number | undefined => {
  if (v == null || v === "") return undefined;
  const text = String(v).trim().toLowerCase().replace(/^x/, "");
  const n = Number(text);
  return text !== "" && Number.isFinite(n) && n >= 0 ? n : undefined;
};
function promotionActive(p: Dict, now: number): boolean {
  if (p.enabled !== true || !isDict(p.schedule)) return false;
  const s = p.schedule;
  if (typeof s.validFrom !== "string" || typeof s.validUntil !== "string") return false;
  const from = Date.parse(s.validFrom), until = Date.parse(s.validUntil);
  if (!Number.isFinite(from) || !Number.isFinite(until) || now < from || now >= until) return false;
  return true;
}
function promoRate(p: Dict, base: number | undefined): number | undefined {
  const d = isDict(p.discount) ? p.discount : undefined;
  if (!d) return undefined;
  const direct = finite(d.discountedCredits);
  if (direct !== undefined) return direct;
  const factor = finite(d.factor);
  return factor !== undefined && base !== undefined ? base * factor : undefined;
}

/** Parse only models explicitly offered to the CLI agent. */
export function parseWorkBuddyModelCatalog(config: unknown, options: { site?: Site; now?: number } = {}): WorkBuddyCatalogModel[] {
  const now = options.now ?? Date.now();
  const root = isDict(config) ? config : {};
  const data = isDict(root.data) ? root.data : root;
  const agents = Array.isArray(data.agents) ? data.agents : [];
  const models = Array.isArray(data.models) ? data.models : [];
  const byId = new Map<string, Dict>();
  for (const m of models) if (isDict(m) && typeof m.id === "string" && !byId.has(m.id)) byId.set(m.id, m);
  const promos = Array.isArray(data.modelPromotions) ? data.modelPromotions.filter(isDict) : [];
  const result: WorkBuddyCatalogModel[] = [];
  const seen = new Set<string>();
  for (const a of agents) {
    if (!isDict(a) || a.name !== "cli" || !Array.isArray(a.models)) continue;
    for (const id of a.models) {
      if (typeof id !== "string" || !id || seen.has(id)) continue;
      seen.add(id);
      const m = byId.get(id);
      const item: WorkBuddyCatalogModel = { id, label: m && typeof m.name === "string" && m.name ? m.name : id };
      if (m) {
        if (typeof m.supportsImages === "boolean" && !(options.site === "workbuddy-ai" && /^glm-/i.test(id))) item.hasVision = m.supportsImages;
        const context = finite(m.maxInputTokens), output = finite(m.maxOutputTokens);
        if (context !== undefined) item.contextWindow = context;
        if (output !== undefined) item.maxOutputTokens = output;
        const base = finite(m.credits);
        const matching = promos.filter(p => p.kind === "discount" && Array.isArray(p.modelIds) && p.modelIds.includes(id) && promotionActive(p, now));
        const daily = matching.filter(p => isDict(p.schedule) && Array.isArray(p.schedule.daily) && (p.schedule.daily as unknown[]).length > 0);
        const dailyMayBeFree = daily.some(p => promoRate(p, base) === 0);
        const discounted = matching.filter(p => !daily.includes(p)).map(p => promoRate(p, base)).filter((n): n is number => n !== undefined);
        let rate = base;
        if (discounted.length) rate = Math.min(...discounted);
        if (dailyMayBeFree && base === 0) rate = undefined;
        if (rate !== undefined) item.pricing = { rate, free: rate === 0, ...(base !== undefined && rate < base ? { rateWas: base } : {}), observedAt: now, requiresActivePackage: true };
        else if (dailyMayBeFree) item.pricing = { free: false, observedAt: now, requiresActivePackage: true };
      }
      result.push(item);
    }
  }
  return result;
}

/** Fetch public config with caller-supplied credentials; errors never echo response content. */
export async function fetchWorkBuddyModelCatalog(site: Site, headers: Record<string, string>, deps: { fetchImpl?: typeof fetch; now?: () => number } = {}): Promise<WorkBuddyCatalogModel[]> {
  if (site !== "workbuddy" && site !== "workbuddy-ai") throw new Error("Unsupported WorkBuddy site");
  const fetchImpl = deps.fetchImpl ?? fetch;
  const safeHeaders = new Headers();
  for (const [key, value] of Object.entries(headers)) safeHeaders.set(key, value);
  safeHeaders.set("User-Agent", "CLI/2.0.0 WorkBuddy/5.5.6");
  safeHeaders.set("X-Requested-With", "XMLHttpRequest");
  safeHeaders.set("Accept", "application/json");
  let response: Response;
  try {
    response = await fetchImpl(`${endpoint[site]}/v3/config`, { headers: safeHeaders, redirect: "error", signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new Error("WorkBuddy model catalog request failed");
  }
  if (!response.ok) throw new Error(`WorkBuddy model catalog request failed (HTTP ${response.status})`);
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error("WorkBuddy model catalog returned invalid JSON"); }
  if (!isDict(body) || (body.code !== undefined && body.code !== 0 && body.code !== "0")) throw new Error("WorkBuddy model catalog returned an invalid response");
  return parseWorkBuddyModelCatalog(body, { site, now: deps.now?.() });
}
