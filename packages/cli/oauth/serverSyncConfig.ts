// packages/cli/oauth/serverSyncConfig.ts
//
// 「本机要访问的 nolo 服务器 + 认证 token」的唯一解析入口。
// 从 authCommand 抽出：服务端托管凭据的取 token 通道（serverAccessTokenPull）
// 也要用同一份解析，不能让解析器去 import 命令模块。
//
// 优先级：环境变量（NOLO_SERVER / NOLO_SERVER_URL / BASE_URL 与 AUTH_TOKEN /
// NOLO_AUTH_TOKEN）→ profile 配置。

import { buildEnvFromProfile, loadProfileConfig } from "../client/profileConfig";

export type ServerSyncConfig = {
  serverOrigin: string;
  authToken: string;
};

export function resolveServerSyncConfig(): ServerSyncConfig | null {
  const envServer =
    process.env.NOLO_SERVER?.trim() ||
    process.env.NOLO_SERVER_URL?.trim() ||
    process.env.BASE_URL?.trim() ||
    "";
  const envToken =
    process.env.AUTH_TOKEN?.trim() || process.env.NOLO_AUTH_TOKEN?.trim() || "";

  if (envServer && envToken) {
    return { serverOrigin: envServer.replace(/\/+$/, ""), authToken: envToken };
  }

  let profileServer = "";
  let profileToken = "";
  try {
    const config = loadProfileConfig();
    const profileEnv = buildEnvFromProfile(config) as Record<
      string,
      string | undefined
    >;
    profileServer = profileEnv.NOLO_SERVER?.trim() || "";
    profileToken = profileEnv.AUTH_TOKEN?.trim() || "";
  } catch {
    // Profile config not available
  }

  const serverOrigin = (envServer || profileServer).replace(/\/+$/, "");
  const authToken = envToken || profileToken;
  if (serverOrigin && authToken) {
    return { serverOrigin, authToken };
  }

  return null;
}
