import { getCurrentProfile, getProfileTokens, loadProfileConfig } from "../../cli/client/profileConfig";
// token 校验走注入缝：私有侧（packages/server/routes.ts）注入 server/authenticateToken 的真实实现，
// 公开/本地构建不注册 → no-op 允许。这样公开集不再静态/动态依赖硬拒绝包 server。
import { validateDesktopProfileToken } from "../authTokenValidation";
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
  // CLI profile 的规范形状是 `tokens: string[]`（遗留的 `authToken` 在写入时会被
  // 删除，见 cli/client/profileConfig）。只读 `authToken` 会让桌面永远无法导入已有
  // 登录态——2026-09-16 实测：CLI 已登录而桌面报 "no CLI profile found"、点击登录
  // 也无法把浏览器会话带回桌面。
  const tokens = getProfileTokens(profileConfig);
  if (!profile || tokens.length === 0) {
    return new Response(JSON.stringify({ ok: true, tokens: [] }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  const validateAuthToken = deps.validateAuthToken ?? validateDesktopProfileToken;
  let isValidToken: boolean;
  try {
    isValidToken = await validateAuthToken(tokens[0]);
  } catch (error) {
    if (error instanceof Response && error.status === 503) return error;
    isValidToken = false;
  }
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
    tokens: [...tokens],
    serverUrl: profile.serverUrl,
    profile: profileConfig?.currentProfile ?? null,
  }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}
