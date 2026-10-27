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
} as const;
