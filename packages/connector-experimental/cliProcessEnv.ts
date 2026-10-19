import { execSync } from "child_process";

type ProxyEnv = {
  HTTP_PROXY?: string;
  HTTPS_PROXY?: string;
  ALL_PROXY?: string;
  NO_PROXY?: string;
  http_proxy?: string;
  https_proxy?: string;
  all_proxy?: string;
  no_proxy?: string;
};

function readMacSystemProxyEnv(): ProxyEnv {
  if (process.platform !== "darwin") return {};

  try {
    const raw = String(execSync("scutil --proxy", { encoding: "utf8" }) || "");
    const values = new Map<string, string>();
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*(.+?)\s*$/);
      if (!match) continue;
      values.set(match[1], match[2].replace(/^"|"$/g, ""));
    }

    const httpEnabled = values.get("HTTPEnable") === "1";
    const httpsEnabled = values.get("HTTPSEnable") === "1";
    const httpHost = values.get("HTTPProxy")?.trim();
    const httpsHost = values.get("HTTPSProxy")?.trim();
    const httpPort = values.get("HTTPPort")?.trim();
    const httpsPort = values.get("HTTPSPort")?.trim();
    const noProxy = values.get("ExceptionsList")?.trim();

    const httpProxy = httpEnabled && httpHost && httpPort ? `http://${httpHost}:${httpPort}` : "";
    const httpsProxy = httpsEnabled && httpsHost && httpsPort ? `http://${httpsHost}:${httpsPort}` : "";
    const allProxy = httpsProxy || httpProxy;

    return {
      ...(httpProxy ? { HTTP_PROXY: httpProxy, http_proxy: httpProxy } : {}),
      ...(httpsProxy ? { HTTPS_PROXY: httpsProxy, https_proxy: httpsProxy } : {}),
      ...(allProxy ? { ALL_PROXY: allProxy, all_proxy: allProxy } : {}),
      ...(noProxy ? { NO_PROXY: noProxy, no_proxy: noProxy } : {}),
    };
  } catch {
    return {};
  }
}

function normalizeProxyEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  const explicitHttp = env.HTTP_PROXY?.trim() || env.http_proxy?.trim() || "";
  const explicitHttps = env.HTTPS_PROXY?.trim() || env.https_proxy?.trim() || "";
  const explicitAll = env.ALL_PROXY?.trim() || env.all_proxy?.trim() || "";
  const explicitNoProxy = env.NO_PROXY?.trim() || env.no_proxy?.trim() || "";
  const fallback = explicitHttp || explicitHttps || explicitAll ? {} : readMacSystemProxyEnv();

  const httpProxy = explicitHttp || fallback.HTTP_PROXY || fallback.http_proxy || "";
  const httpsProxy = explicitHttps || fallback.HTTPS_PROXY || fallback.https_proxy || httpProxy;
  const allProxy = explicitAll || fallback.ALL_PROXY || fallback.all_proxy || httpsProxy || httpProxy;
  const noProxy = explicitNoProxy || fallback.NO_PROXY || fallback.no_proxy || "";

  return {
    ...env,
    ...(httpProxy ? { HTTP_PROXY: httpProxy, http_proxy: httpProxy } : {}),
    ...(httpsProxy ? { HTTPS_PROXY: httpsProxy, https_proxy: httpsProxy } : {}),
    ...(allProxy ? { ALL_PROXY: allProxy, all_proxy: allProxy } : {}),
    ...(noProxy ? { NO_PROXY: noProxy, no_proxy: noProxy } : {}),
  };
}

/** Enhanced process env for CLI spawn / binary probes (GUI PATH on macOS). */
export function buildCliProcessEnv(extraEnv?: Record<string, string | undefined>) {
  const baseEnv: Record<string, string | undefined> = {
    ...process.env,
    ...extraEnv,
    NO_COLOR: "1",
  };

  // Enhance PATH on macOS so GUI-launched app can find brew/local tools
  if (process.platform === "darwin") {
    const defaultMacPaths = [
      `${process.env.HOME || ""}/.local/bin`,
      "/opt/homebrew/bin",
      "/opt/homebrew/sbin",
      "/usr/local/bin",
      "/usr/local/sbin",
      `${process.env.HOME || ""}/.bun/bin`,
      `${process.env.HOME || ""}/Library/pnpm`,
      `${process.env.HOME || ""}/.npm-global/bin`,
      `${process.env.HOME || ""}/bin`,
    ];
    const existingPath = baseEnv.PATH || "/usr/bin:/bin:/usr/sbin:/sbin";
    const paths = existingPath.split(":");
    for (const p of defaultMacPaths) {
      if (p && !paths.includes(p)) {
        paths.unshift(p); // Put brew/local paths at the front
      }
    }
    baseEnv.PATH = paths.join(":");
  }

  // OpenCode's standard user install location is missing from GUI runtimes.
  if (baseEnv.HOME) {
    const delimiter = process.platform === "win32" ? ";" : ":";
    const openCodeBin = `${baseEnv.HOME}/.opencode/bin`;
    const paths = (baseEnv.PATH || "").split(delimiter);
    if (!paths.includes(openCodeBin)) baseEnv.PATH = [...paths, openCodeBin].filter(Boolean).join(delimiter);
  }

  return Object.fromEntries(
    Object.entries(normalizeProxyEnv(baseEnv)).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

