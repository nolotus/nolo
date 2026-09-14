// Desktop edition account routes (nolo-desktop condition).
//
// `/login` 与 `/life` 在桌面端必须是「有意图」的 action/page —— 绝不 NoMatch。
// 桌面端不复制私有 auth/life 页面（无密码表单、无计费/管理界面）：登录与
// 账户中心通过固定 allowlist（https://nolo.chat）在系统浏览器打开（见
// accountExternalActions）；本地账户页只展示服务端 profile 返回的脱敏信息，
// 余额原样显示服务端返回值，不做任何计算。匿名（无 session）同样是
// 一等状态：本地工作区不受登录门。
import React, { useState } from "react";
import { useSelector } from "react-redux";
import type { RouteObject } from "app/routing";
import { AppRoutePaths } from "app/constants/routePaths";
import {
  DESKTOP_ACCOUNT_ALLOWLIST,
  openDesktopAccountPage,
  type DesktopAccountTarget,
} from "./accountExternalActions";
import { useCurrentUser, useIdentity } from "./useIdentity.desktop";
import { selectIdentityUserBalance } from "./selectors.desktop";

const pageStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: "48px auto",
  padding: "0 24px",
  fontFamily: "inherit",
};

const ExternalAccountAction = ({
  target,
  label,
  description,
}: {
  target: DesktopAccountTarget;
  label: string;
  description: string;
}) => {
  const [failed, setFailed] = useState(false);
  return (
    <section style={{ marginTop: 16 }}>
      <button
        type="button"
        onClick={() => {
          // 固定 allowlist 外跳；bridge 缺席时回退 noopener window.open。
          setFailed(!openDesktopAccountPage(target));
        }}
      >
        {label}
      </button>
      {failed ? (
        <p role="alert">
          无法打开系统浏览器，请手动访问{" "}
          <a href={DESKTOP_ACCOUNT_ALLOWLIST[target]}>{DESKTOP_ACCOUNT_ALLOWLIST[target]}</a>
        </p>
      ) : null}
      <p style={{ color: "inherit", opacity: 0.7 }}>{description}</p>
    </section>
  );
};

const DesktopSignInPage = () => {
  return (
    <main style={pageStyle}>
      <h1>登录 Nolo</h1>
      <p>桌面端不在应用内处理密码。登录在系统浏览器中完成；本机已有的 Nolo 登录凭据会在桌面端启动时自动导入。</p>
      <ExternalAccountAction
        target="signIn"
        label="在浏览器中登录"
        description="将在系统浏览器中打开 nolo.chat 登录页。"
      />
    </main>
  );
};

const DesktopAccountPage = () => {
  const user = useCurrentUser();
  const { isLoggedIn } = useIdentity();
  // 服务端 profile 返回值，原样展示（仅登录后请求 profile 才有值）。
  const balance = useSelector(selectIdentityUserBalance);

  return (
    <main style={pageStyle}>
      <h1>账户</h1>
      <div>{user?.username}</div>
      {user?.email ? <div style={{ opacity: 0.7 }}>{user.email}</div> : null}
      {isLoggedIn && typeof balance === "number" ? (
        <div style={{ marginTop: 8 }}>积分：{balance.toFixed(2)}</div>
      ) : null}
      {isLoggedIn ? (
        <ExternalAccountAction
          target="accountCenter"
          label="在浏览器中打开账户中心"
          description="用量、充值与账户管理在 nolo.chat 的账户中心完成。"
        />
      ) : (
        <p style={{ marginTop: 16, opacity: 0.7 }}>
          当前为本地用户模式：本地功能无需登录；登录后可在浏览器中管理账户。
        </p>
      )}
    </main>
  );
};

// 消费方只用合并后的 cloudRoutes（app/web/routes.tsx 以子路由展开）。
export const cloudRoutes: RouteObject[] = [
  { path: AppRoutePaths.LOGIN.slice(1), element: <DesktopSignInPage /> },
  { path: "life", element: <DesktopAccountPage /> },
  { path: "life/usage", element: <DesktopAccountPage /> },
];
