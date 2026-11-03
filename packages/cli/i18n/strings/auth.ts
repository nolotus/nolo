export const authStrings = {
  /** @deprecated No longer used by `/login` (now runs the in-TUI login flow). Kept to avoid structural churn. */
  loginHint: {
    en: "MVP login uses profile/env auth. Set AUTH_TOKEN, NOLO_SERVER, or NOLO_PROFILE before starting nolo.",
    zh: "MVP 登录走 profile/环境变量认证。启动 nolo 前请设置 AUTH_TOKEN、NOLO_SERVER 或 NOLO_PROFILE。",
  },
  /** @deprecated No longer used by `/login` (now runs the in-TUI login flow). Kept to avoid structural churn. */
  loginTuiStart: {
    en: "Or run `/login --server <url>` to log in right here (opens a browser authorization URL), or exit and run `nolo login`.",
    zh: "也可以执行 /login --server <url> 直接在这里登录（会给出浏览器授权链接），或退出后运行 `nolo login`。",
  },
  loginUsage: {
    en: "Usage: /login [--server <url>]. Unsupported flags: {0}",
    zh: "用法：/login [--server <url>]。不支持的参数：{0}",
  },
  loginStarted: {
    en: "Open this URL to authorize nolo-cli:\n{0}\nCode: {1}",
    zh: "打开这个链接授权 nolo-cli：\n{0}\n授权码：{1}",
  },
  loginBrowserFailed: {
    en: "Could not open a browser automatically. Paste the URL above into a browser.",
    zh: "无法自动打开浏览器，请把上面的链接粘贴到浏览器里。",
  },
  loginWaiting: {
    en: "Waiting for browser authorization ({0} remaining)... (Ctrl+C to cancel)",
    zh: "等待浏览器授权（剩余 {0}）……按 Ctrl+C 取消",
  },
  loginStillWaiting: {
    en: "Still waiting... ({0} remaining)",
    zh: "仍在等待……（剩余 {0}）",
  },
  loginSuccess: {
    en: "Logged in. Token saved to profile; this session now uses it immediately.",
    zh: "登录成功。Token 已写入 profile，当前会话立即生效。",
  },
  loginFailed: {
    en: "Login failed: {0}",
    zh: "登录失败：{0}",
  },
  loginTimeout: {
    en: "Login timed out. Run /login again, or use `nolo login --token <jwt>` in a shell.",
    zh: "登录超时。请重新执行 /login，或在 shell 里用 nolo login --token <jwt>。",
  },
  loginCancelled: {
    en: "Login cancelled.",
    zh: "已取消登录。",
  },
  // ── Non-TUI CLI output: nolo auth ─────────────────────────────────────────
  // User-visible copy of `nolo auth <provider>`. Params follow each en string:
  // {0}=provider, {1}=server origin / saved account / raw detail,
  // {2}=zone or HTTP status, {3}=optional trailing fragment.
  "auth.authorizationSaved": {
    en: "[nolo] {0} authorization saved{1}.",
    zh: "[nolo] 已保存 {0} 授权{1}。",
  },
  // Optional account suffix for authorizationSaved (empty when the provider
  // reports no account label).
  "auth.authorizationSavedForAccount": {
    en: " for {0}",
    zh: "（账号 {0}）",
  },
  "auth.noLocalCredential": {
    en: "[nolo] No local {0} credential. Run: nolo auth {0}",
    zh: "[nolo] 本地没有 {0} 凭据。请运行：nolo auth {0}",
  },
  "auth.credentialServerManaged": {
    en:
      "[nolo] The {0} credential is already server-managed by {1} (no local refresh token).\n" +
      "To sync it again, run: nolo auth {0} --sync-to-server",
    zh:
      "[nolo] {0} 凭据已由 {1} 服务端托管（本地无 refreshToken）。\n" +
      "如需重新同步，请运行: nolo auth {0} --sync-to-server",
  },
  "auth.verifyUnsupported": {
    en: '[nolo] --verify is only supported for "nolo auth antigravity".',
    zh: '[nolo] --verify 仅支持 "nolo auth antigravity"。',
  },
  "auth.checkingVerificationChallenge": {
    en: "[nolo] Checking the current verification challenge (one lightweight request)...",
    zh: "[nolo] 正在检查当前验证挑战（一次轻量请求）…",
  },
  "auth.refreshTokenInvalid": {
    en:
      "[nolo] The antigravity refresh token is no longer valid ({0}). " +
      "Re-run `nolo auth antigravity` to re-authorize this account.",
    zh:
      "[nolo] antigravity 的 refresh token 已失效（{0}）。" +
      "请重新运行 `nolo auth antigravity` 重新授权该账号。",
  },
  "auth.credentialIncomplete": {
    en:
      "[nolo] The stored antigravity credential is incomplete ({0}). " +
      "Re-run `nolo auth antigravity` to re-authorize.",
    zh:
      "[nolo] 本地保存的 antigravity 凭据不完整（{0}）。" +
      "请重新运行 `nolo auth antigravity` 重新授权。",
  },
  "auth.providerUnreachable": {
    en: "[nolo] Could not reach the antigravity provider: {0}. Check your network and retry.",
    zh: "[nolo] 无法访问 antigravity provider：{0}。请检查网络后重试。",
  },
  "auth.credentialWorking": {
    en:
      "[nolo] ✓ The credential is working — no verification is required right now. " +
      "You can retry your agent.",
    zh: "[nolo] ✓ 凭据可用——当前无需验证。可以重试你的 agent。",
  },
  "auth.googleVerificationRequired": {
    en: "[nolo] Google requires a one-time account verification for {0}.",
    zh: "[nolo] Google 需要对 {0} 做一次性账号验证。",
  },
  "auth.verificationOpened": {
    en:
      "[nolo] ✓ Opened it in your browser — complete the verification there " +
      "(sign in with the same Google account), then retry your agent.",
    zh:
      "[nolo] ✓ 已在浏览器中打开——请在那里完成验证" +
      "（用同一个 Google 账号登录），然后重试你的 agent。",
  },
  "auth.verificationCopyUrl": {
    en:
      "[nolo] Copy the URL above into a browser signed into {0}, " +
      "complete the verification, then retry your agent.",
    zh:
      "[nolo] 请把上面的 URL 复制到已登录 {0} 的浏览器中，" +
      "完成验证后重试你的 agent。",
  },
  "auth.httpWithoutVerificationLink": {
    en:
      "[nolo] The provider returned HTTP {0} without a verification link — " +
      "this is not the one-time-verification case --verify handles.{1}" +
      " Response detail: {2}",
    zh:
      "[nolo] provider 返回 HTTP {0}，但没有任何验证链接——" +
      "这不属于 --verify 处理的一次性验证场景。{1}响应详情：{2}",
  },
  // Optional trailing fragment spliced into httpWithoutVerificationLink when a
  // token refresh also failed earlier. English keeps the leading space.
  "auth.httpWithoutVerificationLink.refreshSuffix": {
    en: " (token refresh also failed earlier: {0})",
    zh: "（此前 token 刷新也失败：{0}）",
  },
  "auth.localRefreshTokenDropped": {
    en: "[nolo] No local refresh token is kept: {0} is refreshed by {1} (fetched on demand).",
    zh: "[nolo] 本地不再保存 refresh token：{0} 由 {1} 统一刷新（用完即取）。",
  },
  "auth.localStateUpdateFailed": {
    en: "[nolo] Warning: failed to update the local credential state ({0}).",
    zh: "[nolo] Warning: 本地凭据状态更新失败（{0}）。",
  },
  "auth.syncMissingConfig": {
    en:
      "[nolo] Warning: server sync needs NOLO_SERVER and AUTH_TOKEN env vars, " +
      "or a configured profile. Skipping server sync.",
    zh:
      "[nolo] 警告：服务端同步需要 NOLO_SERVER 和 AUTH_TOKEN 环境变量，" +
      "或已配置的 profile。已跳过同步。",
  },
  "auth.syncedTo": {
    en: "[nolo] Synced to {0}",
    zh: "[nolo] 已同步到 {0}",
  },
  "auth.syncDoneWebUsable": {
    en: "[nolo] The web app can now use this subscription.",
    zh: "[nolo] 网页端现在可以使用该订阅了。",
  },
  "auth.syncFailed": {
    en: "[nolo] Warning: server sync failed ({0}). Token saved locally.",
    zh: "[nolo] 警告：服务端同步失败（{0}）。Token 已保存在本地。",
  },
  "auth.noServerConfigured": {
    en:
      "[nolo] No server configured. To use this on the web, run nolo login first, " +
      "then nolo auth {0} --sync-only",
    zh:
      "[nolo] 未配置服务器。如需在网页端使用，请先运行 nolo login，" +
      "再运行 nolo auth {0} --sync-only",
  },
  // {1} is the provider name again so the --no-sync-to-server hint names the
  // exact command the user would run; keep [Y/n] as the literal answer hint.
  "auth.syncPrompt": {
    en:
      "Sync to {0} so the web app can also use this {1} subscription? " +
      "The credential is stored encrypted; run nolo auth {1} --no-sync-to-server " +
      "to turn it off later. [Y/n] ",
    zh:
      "同步到 {0}，让网页端也能使用这个 {1} 订阅？" +
      "凭证加密存储，可随时 nolo auth {1} --no-sync-to-server 关闭 [Y/n] ",
  },
  "auth.notSyncedToServer": {
    en:
      "[nolo] Not synced to the server. For web use, run: " +
      "nolo auth {0} --sync-to-server (or --sync-only)",
    zh:
      "[nolo] 未同步凭据到服务器。如需网页端使用，请运行: " +
      "nolo auth {0} --sync-to-server（或 --sync-only）",
  },
  "auth.markFailed": {
    en:
      "[nolo] The credential was uploaded to the server, but marking it " +
      "server-managed locally failed. Re-authorize so both sides cannot race " +
      "each other's refresh.",
    zh:
      "[nolo] 凭据已成功上传服务器，但本地打上托管标记失败。" +
      "为防双方竞态刷新导致失效，请重新授权。",
  },
  "auth.commandFailed": {
    en: "nolo auth {0} failed: {1}",
    zh: "nolo auth {0} 失败：{1}",
  },
  "auth.cloudflareTokenGenerated": {
    en:
      "[nolo] Generated Cloudflare API token for zone {0} ({1}).\n" +
      "Store it as CLOUDFLARE_EMAIL_ROUTING_API_TOKEN:\n  {2}\n",
    zh:
      "[nolo] 已为 zone {0}（{1}）生成 Cloudflare API token。\n" +
      "请保存为 CLOUDFLARE_EMAIL_ROUTING_API_TOKEN：\n  {2}\n",
  },
  "auth.envUpdated": {
    en: "[nolo] Updated {0} with CLOUDFLARE_EMAIL_ROUTING_API_TOKEN.",
    zh: "[nolo] 已更新 {0} 里的 CLOUDFLARE_EMAIL_ROUTING_API_TOKEN。",
  },
  "auth.claudeGrantExpired": {
    en: "[nolo] Claude OAuth grant has expired. Interactive login is required (run: nolo auth claude).",
    zh: "[nolo] Claude OAuth grant 已过期，必须重新交互式登录（运行：nolo auth claude）。",
  },
  "auth.claudeGrantExpiringSoon": {
    en: "[nolo] Claude OAuth grant expires in {0} day(s). Re-authenticate soon with: nolo auth claude.",
    zh: "[nolo] Claude OAuth grant 将在 {0} 天内过期，请尽快重新登录：nolo auth claude。",
  },
  "auth.claudeGrantValidDays": {
    en: "[nolo] Claude OAuth grant valid for about {0} day(s).",
    zh: "[nolo] Claude OAuth grant 预计还剩约 {0} 天有效。",
  },
  // ── TUI /auth commands ────────────────────────────────────────────────────
  "auth.statusTitle": {
    en: "Provider OAuth Status",
    zh: "Provider OAuth 授权状态",
  },
  "auth.statusColProvider": {
    en: "Provider",
    zh: "服务商",
  },
  "auth.statusColLocalStatus": {
    en: "Local Status",
    zh: "本机状态",
  },
  "auth.statusColGrantRemaining": {
    en: "Grant Remaining",
    zh: "Grant 剩余",
  },
  "auth.statusColServerSync": {
    en: "Server Sync",
    zh: "云端同步",
  },
  "auth.statusUnauthenticated": {
    en: "Unauthenticated",
    zh: "未认证",
  },
  "auth.statusAuthenticated": {
    en: "Authenticated",
    zh: "已认证",
  },
  "auth.statusExpired": {
    en: "Access expired",
    zh: "access 已过期",
  },
  "auth.grantExpired": {
    en: "Expired",
    zh: "已过期",
  },
  "auth.syncStatusSynced": {
    en: "Synced",
    zh: "已同步",
  },
  "auth.syncStatusNotSynced": {
    en: "Not synced",
    zh: "未同步",
  },
  "auth.statusBottomHint": {
    en: "Type /auth <provider> to authorize (e.g. /auth claude)",
    zh: "输入 /auth <provider> 开始授权（例如 /auth claude）",
  },
  "auth.pickerTitle": {
    en: "Use ↑/↓ to choose a provider, press Enter to authorize",
    zh: "上下键选一个，回车开始授权",
  },
  "auth.pasteCallbackPrompt": {
    en: "Please paste the full callback URL from your browser address bar (or authorization code): ",
    zh: "请在此粘贴浏览器地址栏里的完整回调 URL（或授权码）：",
  },
  "auth.unknownProvider": {
    en: "[nolo] Unknown provider: {0}. Supported providers: {1}",
    zh: "[nolo] 未知的 provider: {0}。支持的 provider：{1}",
  },
  "auth.logoutSuccess": {
    en: "[nolo] Deleted local {0} credential.",
    zh: "[nolo] 已删除本地 {0} 凭据。",
  },
  "auth.logoutLocalWithServerNotice": {
    en: "[nolo] Deleted local {0} credential. Note: server-managed credentials were not removed from the server.",
    zh: "[nolo] 已删除本地 {0} 凭据。注意：服务端托管的凭据未删除，如需在服务端删除请在控制台处理。",
  },
  "auth.syncPromptQuestion": {
    en: "Sync to server {0}? (y/N): ",
    zh: "同步到服务端 {0}？(y/N): ",
  },
  "auth.syncOptionNo": {
    en: "No (default)",
    zh: "否 (默认)",
  },
  "auth.syncOptionYes": {
    en: "Yes",
    zh: "是",
  },
  "auth.errorStateMismatch": {
    en: "[nolo] OAuth state verification failed. This usually happens if the callback was interrupted or expired; please run /auth {0} again.",
    zh: "[nolo] 授权 state 校验失败。这通常是由于回调被中断或过期的重定向引起，请重新执行 /auth {0}。",
  },
  "auth.errorCancelled": {
    en: "[nolo] Authorization was cancelled or denied. You can run /auth {0} again when ready.",
    zh: "[nolo] 授权被取消或拒绝。你可以随时重新执行 /auth {0} 开始授权。",
  },
  "auth.errorGrantExpired": {
    en: "[nolo] OAuth grant has expired or been revoked. Please complete /auth {0} authorization in your browser again.",
    zh: "[nolo] 授权 grant 已过期或已失效。请重新在浏览器中完成 /auth {0} 授权。",
  },
  "auth.errorNetwork": {
    en: "[nolo] Network error: could not reach the authorization server. Check your connection or proxy settings and retry.",
    zh: "[nolo] 网络连接失败：无法访问授权服务器。请检查你的网络连接或代理设置后重试。",
  },
  "auth.grantExpiredHint": {
    en: "Grant may have exceeded 30 days and requires re-authorization. Press Enter to run /auth {0}",
    zh: "grant 可能已超过 30 天，需重新授权。按 Enter 运行 /auth {0}",
  },
} as const;
