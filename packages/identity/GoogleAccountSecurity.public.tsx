import React, { useState } from "react";
import { useCurrentUser, useIdentity } from "identity";
import Button from "render/web/ui/Button";
import { DESKTOP_ACCOUNT_ALLOWLIST, openDesktopAccountPage } from "./accountExternalActions";
import type { IdentityUser } from "./types";

export interface GoogleButtonProps {
  mode: "login" | "bind" | "revoke";
  returnTo?: string;
}

function accountLabel(user: IdentityUser | null): string {
  return user?.name || user?.nickname || user?.username || "";
}

/** Browser identity only: this page cannot infer the account targeted in another app. */
export function BrowserAccountNotice(): React.ReactElement {
  const user = useCurrentUser();
  return <p className="security-panel__desc" data-account-context="browser">
    当前操作账号：{user ? <>{accountLabel(user)} / {user.userId}</> : "尚未登录"}。
    请核对这是你要管理的 Nolo 账号；从桌面前来时，请与桌面显示的账号对照，必要时重新登录。
  </p>;
}

/** Request-only action. No credentials, return URL, or account identifiers leave this component. */
export function GoogleAccountAction({ mode }: GoogleButtonProps): React.ReactElement {
  const [status, setStatus] = useState<"idle" | "requested" | "failed">("idle");
  const target = mode === "login" ? "signIn" : "accountSecurity";
  const url = DESKTOP_ACCOUNT_ALLOWLIST[target];
  return <div className="google-auth-actions">
    <Button variant="secondary" onClick={() => {
      setStatus(openDesktopAccountPage(target) ? "requested" : "failed");
    }}>
      {status === "failed" ? "重试：" : ""}{mode === "login" ? "在浏览器打开登录页" : "在浏览器打开安全设置"}
    </Button>
    {status === "failed" && <p role="alert" className="error-message">未能发送打开请求，请重试或使用下方固定链接。</p>}
    {status === "requested" && <p role="status" className="security-panel__desc">已发送打开请求；尚未确认浏览器已打开，也不代表 Google 操作已完成。</p>}
    <p className="security-panel__desc">若浏览器未打开，可手动访问：<a href={url} target="_blank" rel="noopener noreferrer">{url}</a></p>
  </div>;
}

export function GoogleAccountSecurity(): React.ReactElement {
  const identity = useIdentity();
  const connected = identity.isLoggedIn && !!identity.userId;
  return <section className="security-panel">
    <div className="security-panel__section-heading"><h2>Google 账号安全</h2></div>
    <p className="security-panel__desc" data-account-context="desktop">桌面当前账号：{connected
      ? <>{accountLabel(identity.currentUser)} / {identity.userId}</>
      : "尚未连接账号"}</p>
    <p className="security-panel__desc">将在浏览器管理；请先核对浏览器当前账号与上述账号一致，必要时重新登录。</p>
    <GoogleAccountAction mode="bind" />
    <p className="security-panel__desc">这里不自动同步浏览器操作结果；浏览器中的绑定或撤销不会在此被标记为已完成。如需重新连接，请使用现有登录入口。</p>
  </section>;
}
