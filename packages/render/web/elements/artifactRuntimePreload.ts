const ARTIFACT_RUNTIME_SCRIPT_URL = "/artifact-runtime-script";

const preloadedRuntimeUrls = new Set<string>();

declare global {
  interface Window {
    __NOLO_ASSETS__?: {
      artifactRuntimeJs?: string;
      artifactRuntimePreloads?: string[];
    };
  }
}

export function resolveArtifactRuntimeScriptUrl() {
  if (typeof window === "undefined") return ARTIFACT_RUNTIME_SCRIPT_URL;
  return window.__NOLO_ASSETS__?.artifactRuntimeJs || ARTIFACT_RUNTIME_SCRIPT_URL;
}

function appendPreloadLink(href: string, rel: "preload" | "modulepreload", as?: string) {
  if (!href || preloadedRuntimeUrls.has(`${rel}:${href}`)) return;
  if (document.head.querySelector(`link[rel="${rel}"][href="${href}"]`)) {
    preloadedRuntimeUrls.add(`${rel}:${href}`);
    return;
  }

  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (as) link.as = as;
  link.crossOrigin = "anonymous";
  (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority = "high";
  document.head.appendChild(link);
  preloadedRuntimeUrls.add(`${rel}:${href}`);
}

export function preloadArtifactRuntimeResources() {
  if (typeof window === "undefined") return;

  appendPreloadLink(
    new URL("/artifact-runtime", window.location.origin).toString(),
    "preload",
    "document"
  );

  const urls = window.__NOLO_ASSETS__?.artifactRuntimePreloads?.length
    ? window.__NOLO_ASSETS__.artifactRuntimePreloads
    : [resolveArtifactRuntimeScriptUrl()];

  for (const url of urls) {
    appendPreloadLink(new URL(url, window.location.origin).toString(), "modulepreload");
  }
}
