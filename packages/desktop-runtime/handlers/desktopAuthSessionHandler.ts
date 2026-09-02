import { getCurrentProfile, loadProfileConfig } from "../../cli/client/profileConfig";
// authenticateToken moved to lazy import to avoid pulling private server deps into public build
import { isTrustedDesktopSameOriginRequest } from "../desktopRequestTrust";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

/** Sanitized 403 for untrusted callers — never echo profile/token metadata. */
const DESKTOP_AUTH_SESSION_FORBIDDEN_ERROR =
  "Forbidden: trusted desktop same-origin required";

type DesktopAuthSessionDeps = {
  env?: NodeJS.ProcessEnv;
  loadProfile?: typeof loadProfileConfig;
  validateAuthToken?: (token: string) => Promise<boolean>;
};

export async function handleDesktopAuthSessionGet(
  req: Request,
  deps: DesktopAuthSessionDeps = {}
) {
  const env = deps.env ?? process.env;
  if (env.NOLO_DESKTOP !== "1") {
    return new Response(JSON.stringify({ error: "Desktop runtime only" }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  // Reject cross-origin and bare curl before loading or returning profile tokens.
  // NOLO_DESKTOP alone identifies the host process, not the HTTP caller.
  if (!isTrustedDesktopSameOriginRequest(req, env)) {
    return new Response(
      JSON.stringify({ error: DESKTOP_AUTH_SESSION_FORBIDDEN_ERROR }),
      {
        status: 403,
        headers: JSON_HEADERS,
      },
    );
  }

  const profileConfig = (deps.loadProfile ?? loadProfileConfig)();
  const profile = getCurrentProfile(profileConfig);
  if (!profile?.authToken) {
    return new Response(JSON.stringify({ ok: true, tokens: [] }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  const validateAuthToken = deps.validateAuthToken ?? (async (token: string) => {
    // Lazy import: authenticateToken lives in packages/server (private) and is
    // only available in the full cloud build. Public build skips token validation.
    try {
      const { authenticateToken } = await import("../../server/authenticateToken");
      await authenticateToken(token);
      return true;
    } catch (err: any) {
      // Only swallow module-not-found (public build lacks the private server module).
      // Re-throw actual validation errors (invalid token, expired, revoked).
      if (err instanceof Error && /Cannot find module|Failed to resolve/.test(err.message)) {
        return true; // module not available — UI handles 401 from cloud API
      }
      throw err;
    }
  });
  const isValidToken = await validateAuthToken(profile.authToken).catch(() => false);
  if (!isValidToken) {
    return new Response(JSON.stringify({
      ok: true,
      tokens: [],
      serverUrl: profile.serverUrl,
      profile: profileConfig?.currentProfile ?? null,
      error: "invalid_profile_token",
    }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    tokens: [profile.authToken],
    serverUrl: profile.serverUrl,
    profile: profileConfig?.currentProfile ?? null,
  }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}
