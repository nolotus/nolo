import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ensureClientLanguageResources,
  hasClientLanguageResources,
  type ClientLocaleScope,
} from "./clientResources";

export function clientLocaleScope({ pathname, cloud, defaultSite, desktopShell, signedIn,
  overlay, needsFullContent }: {
  pathname: string;
  cloud: boolean;
  defaultSite: boolean;
  desktopShell: boolean;
  signedIn: boolean;
  overlay?: boolean;
  needsFullContent?: boolean;
}): ClientLocaleScope {
  return pathname === "/" && cloud && defaultSite && !desktopShell && !signedIn &&
    !overlay && !needsFullContent ? "guest" : "full";
}

export const ClientLocaleScopeContext = createContext<(() => ClientLocaleScope) | null>(null);

export function useClientLocaleScopeReader(scope: ClientLocaleScope) {
  const committedScope = useRef(scope);
  useLayoutEffect(() => { committedScope.current = scope; }, [scope]);
  return useRef(() => committedScope.current).current;
}

export function useClientLocaleGate(scope: ClientLocaleScope, enabled: boolean) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const ready = !enabled || hasClientLanguageResources(i18n, language, scope);
  const [attempt, retry] = useState(0);
  const [failure, setFailure] = useState<{ language: string; scope: ClientLocaleScope; attempt: number }>();
  const [, notifyReady] = useState(0);

  useEffect(() => {
    if (ready) return;
    let active = true;
    void ensureClientLanguageResources(i18n, language, scope).then(() => {
      if (active) notifyReady((n) => n + 1);
    }, (error) => {
      if (!active) return;
      console.warn("[i18n] Failed to prepare route locale", error);
      setFailure({ language, scope, attempt });
    });
    return () => { active = false; };
  }, [ready, i18n, language, scope, attempt]);

  return {
    ready,
    failed: !ready && failure?.language === language && failure.scope === scope && failure.attempt === attempt,
    retry: () => retry((n) => n + 1),
  };
}

export function useHomeLocaleGate(needsFull: boolean) {
  const readScope = useContext(ClientLocaleScopeContext);
  return useClientLocaleGate("full", readScope !== null && needsFull);
}

export function ClientLocalePending({ failed, retry }: { failed: boolean; retry: () => void }) {
  return failed ? (
    <div role="alert">
      <button type="button" onClick={retry}>↻ Retry loading translations</button>
    </div>
  ) : <div role="status" aria-busy="true" />;
}
