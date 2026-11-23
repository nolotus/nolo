import { API_ENDPOINTS } from "database/config";

const contentPath = `${API_ENDPOINTS.DATABASE}/file/content/`;
const publicPath = `${API_ENDPOINTS.DATABASE}/file/public/`;
const signPath = `${API_ENDPOINTS.DATABASE}/file/sign`;
const MAX_IDS = 50;
const BATCH_DELAY = 20;
// The server guarantees at least one 10-minute bucket. Measure from request start.
const SIGNED_TTL = 9 * 60_000;
const RETRY_TTL = 30_000;

export type WebMedia = { origin: string; id: string; spaceId?: string };
const validId = (value: string) => /^[A-Za-z0-9._~-]{1,256}$/.test(value) && value !== "." && value !== "..";

export function parseWebMedia(src: string | null | undefined, base: string | undefined, spaceId?: string): WebMedia | null {
  if (!src) return null;
  try {
    const url = new URL(src, base);
    if (!/^https?:$/.test(url.protocol) || !url.pathname.startsWith(contentPath)) return null;
    const scope = url.searchParams.get("spaceId") || spaceId || undefined;
    return { origin: url.origin, id: url.pathname.slice(contentPath.length), spaceId: scope };
  } catch {
    return null;
  }
}

/** The render decision: never emit the original database URL while access is unresolved. */
export function resolveWebMediaSrc(src: string | null | undefined, base: string | undefined, resolved?: string | null) {
  return parseWebMedia(src, base) ? resolved ?? null : src || null;
}

/** No auth, cookies or redirects: only a successful, explicit boolean is proof. */
export async function confirmPublicWebFile(media: WebMedia, request: typeof fetch = fetch, signal?: AbortSignal) {
  if (!validId(media.id)) return false;
  try {
    const timeout = AbortSignal.timeout(10_000);
    const response = await request(`${media.origin}${publicPath}${media.id}`, {
      method: "GET", credentials: "omit", redirect: "error", cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    return response.ok && (await response.json())?.public === true;
  } catch {
    return false;
  }
}

const rawSource = ({ origin, id }: WebMedia) => `${origin}${contentPath}${id}`;
export const webMediaKey = ({ origin, id, spaceId }: WebMedia) => JSON.stringify([origin, spaceId ?? null, id]);

type Entry = { src: string | null; until: number };
type Pending = { media: WebMedia; finish: (entry: Entry) => void };

export function createWebMediaSources({ tokenFor, canProbe, now = Date.now, request = fetch }: {
  tokenFor: (origin: string) => string | undefined;
  canProbe: (origin: string) => boolean;
  now?: () => number;
  request?: typeof fetch;
}) {
  const cache = new Map<string, Entry>();
  const loading = new Map<string, Promise<Entry>>();
  // Confirmation is origin + ID, not space or account-scoped. The provider
  // owns this in-memory cache; in-flight probes aren't evicted by the LRU.
  const publicChecks = new Map<string, boolean>();
  const probing = new Map<string, Promise<boolean>>();
  let queue: Pending[] = [];
  let scheduled = false;

  function save(media: WebMedia, entry: Entry) {
    const key = webMediaKey(media);
    cache.delete(key);
    cache.set(key, entry);
    if (cache.size > 1_000) cache.delete(cache.keys().next().value!);
    return entry;
  }

  function send(url: string, init?: RequestInit) {
    return request(url, { credentials: "omit", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000), ...init });
  }

  function confirm(media: WebMedia) {
    if (!canProbe(media.origin)) return Promise.resolve(false);
    const key = JSON.stringify([media.origin, media.id]);
    const cached = publicChecks.get(key);
    if (cached !== undefined) {
      publicChecks.delete(key);
      publicChecks.set(key, cached);
      return Promise.resolve(cached);
    }
    const existing = probing.get(key);
    if (existing) return existing;
    const pending = confirmPublicWebFile(media, request).then((isPublic) => {
      probing.delete(key);
      publicChecks.set(key, isPublic);
      if (publicChecks.size > 1_000) publicChecks.delete(publicChecks.keys().next().value!);
      return isPublic;
    });
    probing.set(key, pending);
    return pending;
  }

  async function sign(batch: Pending[], origin: string, spaceId: string | undefined, token: string) {
    const started = now();
    let urls: Record<string, unknown> | null = null;
    try {
      const response = await send(`${origin}${signPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileIds: batch.map(({ media }) => media.id), ...(spaceId ? { spaceId } : {}) }),
      });
      if (response.ok) urls = await response.json();
    } catch { /* unavailable: use the same fallback as a missing ID */ }
    for (const { media, finish } of batch) {
      const value = urls?.[media.id];
      let src: string | null = null;
      if (typeof value === "string") {
        try {
          const url = new URL(value, origin);
          if (url.origin === origin && url.pathname === `${contentPath}${media.id}` && url.searchParams.get("sig")) src = url.href;
        } catch { /* malformed response */ }
      }
      finish({ src, until: src ? started + SIGNED_TTL : now() + RETRY_TTL });
    }
  }

  function resolveGroup(batch: Pending[]) {
    const { origin, spaceId } = batch[0].media;
    const token = tokenFor(origin);
    if (token) void sign(batch, origin, spaceId, token);
    else for (const { finish } of batch) finish({ src: null, until: Infinity });
  }

  function flush() {
    scheduled = false;
    const groups = new Map<string, Pending[]>();
    for (const item of queue) {
      const { origin, spaceId } = item.media;
      const key = JSON.stringify([origin, spaceId ?? null]);
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }
    queue = [];
    for (const items of groups.values()) {
      for (let i = 0; i < items.length; i += MAX_IDS) void resolveGroup(items.slice(i, i + MAX_IDS));
    }
  }

  function peek(media: WebMedia) {
    const value = cache.get(webMediaKey(media));
    return value && value.until > now() ? value : undefined;
  }

  function get(media: WebMedia, accessPolicy?: string, force = false, allowProbe = !force): Promise<Entry> {
    if (!validId(media.id) || (media.spaceId && !validId(media.spaceId))) {
      return Promise.resolve({ src: null, until: Infinity });
    }
    if (accessPolicy === "public") return Promise.resolve({ src: rawSource(media), until: Infinity });
    const hit = force ? undefined : peek(media);
    if (hit) return Promise.resolve(hit);
    const key = webMediaKey(media);
    const existing = loading.get(key);
    if (existing) return existing;
    const publicKey = JSON.stringify([media.origin, media.id]);
    const publicDecision = accessPolicy ? Promise.resolve(false) : allowProbe ? confirm(media)
      : probing.get(publicKey) ?? Promise.resolve(publicChecks.get(publicKey) === true);
    const pending = publicDecision.then((isPublic): Entry | Promise<Entry> => {
      if (isPublic) return { src: rawSource(media), until: Infinity };
      return new Promise<Entry>((finish) => {
        queue.push({ media, finish });
        if (!scheduled) {
          scheduled = true;
          setTimeout(flush, BATCH_DELAY);
        }
      });
    }).then((entry) => {
      loading.delete(key);
      return save(media, entry);
    });
    loading.set(key, pending);
    return pending;
  }

  return { get, peek, load: async (media: WebMedia, policy?: string) => (await get(media, policy)).src };
}
