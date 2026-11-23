import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NOLO_CLUSTER_SERVERS } from "database/config";
import { googleSessionRequestToken } from "core/googleSessionScope";
import { createWebMediaSources, parseWebMedia, resolveWebMediaSrc, webMediaKey } from "./webMediaSources";

type Context = { client: ReturnType<typeof createWebMediaSources>; base?: string };
const MediaContext = createContext<Context | null>(null);

export function WebMediaSources({ server, token, sessionKey, children }: React.PropsWithChildren<{ server?: string; token?: string; sessionKey?: string | null }>) {
  const [pageOrigin, setPageOrigin] = useState<string>();
  useEffect(() => { setPageOrigin(window.location.origin); }, []);
  const context = useMemo<Context>(() => {
    // URL/space values may come from untrusted content; do not probe arbitrary hosts or send them a bearer.
    const isTrustedOrigin = (origin: string) =>
      origin === server || origin === pageOrigin || NOLO_CLUSTER_SERVERS.some((trusted) => origin === trusted);
    return {
      base: pageOrigin,
      client: createWebMediaSources({ canProbe: isTrustedOrigin, tokenFor: (origin) =>
        isTrustedOrigin(origin) ? googleSessionRequestToken(token, origin, true) : undefined }),
    };
  }, [server, pageOrigin, token, sessionKey]);
  return <MediaContext.Provider value={context}>{children}</MediaContext.Provider>;
}

type MediaOptions = { spaceId?: string | null; trustedAccessPolicy?: string };

export function useWebMediaSource(src: string | null | undefined, options?: MediaOptions) {
  const context = useContext(MediaContext);
  const base = context?.base ?? "https://relative.invalid";
  const media = useMemo(() => parseWebMedia(src, base, options?.spaceId || undefined), [src, base, options?.spaceId]);
  const key = media ? webMediaKey(media) : null;
  const policy = options?.trustedAccessPolicy;
  // This identity changes on source, scope, or account change; active playback
  // must not carry a previously authorized URL across those boundaries.
  const identity = useMemo(() => ({}), [context, key, policy, src]);
  const [view, setView] = useState<{ identity: object; src: string | null; until: number }>();
  const load = useCallback(async (force = false, allowProbe = true) => {
    if (!media) return { src: src || null, until: Infinity };
    if (!context?.base) return { src: null, until: Infinity };
    return context.client.get(media, policy, force, allowProbe);
  }, [context, media, policy, src]);

  const entry = view?.identity === identity ? view : undefined;
  const refresh = useCallback(async () => {
    const entry = await load(true, false);
    setView({ identity, ...entry });
    return entry.src;
  }, [identity, load]);
  useEffect(() => {
    if (!context?.base || !media) return;
    let active = true;
    const update = async () => {
      const next = await load(false, !entry);
      if (active) setView({ identity, ...next });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && (!entry || entry.until <= Date.now())) void update();
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!entry) void update();
    else if (Number.isFinite(entry.until)) timer = setTimeout(update, Math.max(20, entry.until - Date.now()));
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [context, media, identity, load, entry]);

  const getFresh = useCallback(async () => (await load(false, !entry)).src, [entry, load]);
  const resolved = entry && entry.until > Date.now() ? entry.src : media && context?.client.peek(media)?.src;
  return { src: resolveWebMediaSrc(src, base, resolved), identity, getFresh, refresh };
}

export function useWebMediaSrc(src: string | null | undefined, options?: MediaOptions) {
  return useWebMediaSource(src, options).src;
}
