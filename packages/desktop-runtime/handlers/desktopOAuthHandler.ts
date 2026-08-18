import {
  createOAuthTokenStore,
  type OAuthCredential,
  type OAuthProvider,
  type OAuthTokenStore,
} from "agent-runtime/oauthTokenStore";
import type { OAuthFlowDeps } from "cli/oauth/types";
import { isTrustedDesktopSameOriginRequest } from "../desktopRequestTrust";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const DESKTOP_OAUTH_PROVIDERS = new Set<OAuthProvider>([
  "chatgpt",
  "xai",
  "antigravity",
  "claude",
  "cursor",
]);
const activeLogins = new Map<OAuthProvider, Promise<OAuthCredential>>();

type DesktopOAuthDeps = {
  env?: NodeJS.ProcessEnv;
  tokenStore?: OAuthTokenStore;
  runLogin?: (
    provider: OAuthProvider,
    deps: OAuthFlowDeps,
  ) => Promise<OAuthCredential>;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

function readProvider(req: Request): OAuthProvider | null {
  const provider = new URL(req.url).pathname.match(
    /\/api\/desktop\/oauth\/([^/]+)(?:\/(?:start|status))?$/,
  )?.[1];
  return provider && DESKTOP_OAUTH_PROVIDERS.has(provider as OAuthProvider)
    ? (provider as OAuthProvider)
    : null;
}

function publicStatus(credential: OAuthCredential | null) {
  if (!credential) return { connected: false };
  return {
    connected: true,
    email:
      typeof credential.metadata?.email === "string"
        ? credential.metadata.email
        : undefined,
    accountId: credential.accountId,
    expiresAt: credential.expiresAt,
  };
}

function admit(req: Request, env: NodeJS.ProcessEnv): Response | null {
  if (env.NOLO_DESKTOP !== "1") {
    return json({ error: "Desktop runtime only" }, 404);
  }
  if (!isTrustedDesktopSameOriginRequest(req, env)) {
    return json({ error: "Forbidden: trusted desktop same-origin required" }, 403);
  }
  return null;
}

async function defaultRunLogin(
  provider: OAuthProvider,
  deps: OAuthFlowDeps,
): Promise<OAuthCredential> {
  const { defaultOpenBrowser } = await import("../../cli/authCommands");
  const flowDeps = { ...deps, openBrowser: defaultOpenBrowser };
  if (provider === "claude") {
    const { runAnthropicOAuthLogin } = await import("../../cli/oauth/flows/anthropic");
    return runAnthropicOAuthLogin(flowDeps);
  }
  if (provider === "chatgpt") {
    const { runOpenAiCodexBrowserPkce } = await import(
      "../../cli/oauth/flows/openai-codex"
    );
    return runOpenAiCodexBrowserPkce(flowDeps);
  }
  if (provider === "xai") {
    const { runXaiOAuthLogin } = await import("../../cli/oauth/flows/xai");
    return runXaiOAuthLogin(flowDeps);
  }
  if (provider === "antigravity") {
    const { runAntigravityOAuthLogin } = await import(
      "../../cli/oauth/flows/antigravity"
    );
    return runAntigravityOAuthLogin(flowDeps);
  }
  if (provider === "cursor") {
    const { runCursorOAuthLogin } = await import("../../cli/oauth/flows/cursor");
    return runCursorOAuthLogin(flowDeps);
  }
  throw new Error("unsupported_desktop_oauth_provider");
}

export async function handleDesktopOAuthStatusGet(
  req: Request,
  deps: DesktopOAuthDeps = {},
) {
  const env = deps.env ?? process.env;
  const denied = admit(req, env);
  if (denied) return denied;
  const provider = readProvider(req);
  if (!provider) return json({ error: "unsupported_provider" }, 400);

  const credential = (deps.tokenStore ?? createOAuthTokenStore()).read(provider);
  return json(publicStatus(credential));
}

export async function handleDesktopOAuthStartPost(
  req: Request,
  deps: DesktopOAuthDeps = {},
) {
  const env = deps.env ?? process.env;
  const denied = admit(req, env);
  if (denied) return denied;
  const provider = readProvider(req);
  if (!provider) return json({ error: "unsupported_provider" }, 400);

  const tokenStore = deps.tokenStore ?? createOAuthTokenStore();
  const runLogin = deps.runLogin ?? defaultRunLogin;
  let login = activeLogins.get(provider);
  if (!login) {
    // Forward flow progress/errors to the server console instead of swallowing
    // them: without this, a failed desktop OAuth (e.g. Google rejecting the
    // discoverProject request) surfaces only as a generic `oauth_failed`.
    login = runLogin(provider, {
      output: { log: console.log.bind(console, `[desktop-oauth:${provider}]`) },
      error: { error: console.error.bind(console, `[desktop-oauth:${provider}]`) },
    });
    activeLogins.set(provider, login);
  }

  try {
    const credential = await login;
    tokenStore.write(provider, credential);
    return json({ ok: true, ...publicStatus(credential) });
  } catch (error) {
    console.error(`[desktop-oauth:${provider}] login failed:`, error);
    return json({ ok: false, error: "oauth_failed" }, 502);
  } finally {
    if (activeLogins.get(provider) === login) activeLogins.delete(provider);
  }
}

export async function handleDesktopOAuthDelete(
  req: Request,
  deps: DesktopOAuthDeps = {},
) {
  const env = deps.env ?? process.env;
  const denied = admit(req, env);
  if (denied) return denied;
  const provider = readProvider(req);
  if (!provider) return json({ error: "unsupported_provider" }, 400);
  (deps.tokenStore ?? createOAuthTokenStore()).remove(provider);
  return json({ ok: true });
}
