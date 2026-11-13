// Desktop edition account routes (nolo-desktop condition).
//
// `/login` 与 `/life` 在桌面端必须是「有意图」的 action/page —— 绝不 NoMatch。
// 桌面端不复制私有 auth/life 页面（无密码表单、无计费/管理界面）：连接账号通过
// 系统浏览器完成（设备码授权，由 store 上的 desktopBrowserAuthorization 控制器
// 驱动，见 storeSession.desktop.ts / desktopBrowserAuthorization.ts）；账户中心通过
// 固定 allowlist（https://nolo.chat）在系统浏览器打开（见 accountExternalActions）。
// 本地账户页只展示服务端 profile 返回的脱敏信息，余额原样显示服务端返回值，不做任何计算。
// 匿名（无 session）同样是一等状态：本地工作区不受登录门 —— 登录永远不是墙。
import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { ReactReduxContext, useSelector } from "react-redux";
import { AppRoutePaths } from "app/constants/routePaths";
import {
  useLocation,
  useNavigate,
  type RouteObject,
} from "app/routing";
import Button from "render/web/ui/Button";
import {
  DESKTOP_ACCOUNT_ALLOWLIST,
  openDesktopAccountPage,
  type DesktopAccountTarget,
} from "./accountExternalActions";
import type {
  DesktopBrowserAuthorizationController,
  DesktopBrowserAuthorizationState,
} from "./desktopBrowserAuthorization";
import { useCurrentUser, useIdentity } from "./useIdentity.desktop";
import { selectIdentityUserBalance } from "./selectors.desktop";

const pageStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: "48px auto",
  padding: "0 24px",
  fontFamily: "inherit",
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 16,
};

const statusTextStyle: React.CSSProperties = {
  marginTop: 12,
  opacity: 0.85,
};

/**
 * 浏览器授权的失败错误码 → 用户可读文案。
 * 只映射已知错误码，不回显任何 token / 授权码 / 原始错误串。
 */
const AUTHORIZATION_ERROR_MESSAGES: Record<string, string> = {
  start_failed: "无法开始授权，请检查网络后重试。",
  request_timeout: "网络请求超时，请重试。",
  invalid_response: "授权服务返回的数据异常，请重试。",
  authorization_failed: "授权失败，请重试。",
  cancelled: "已取消连接。",
  expired: "授权已过期，请重新发起。",
};

const describeAuthorizationError = (code: string | undefined): string =>
  (code ? AUTHORIZATION_ERROR_MESSAGES[code] : undefined) ??
  "授权失败，请重试。";

/**
 * 与 auth/web/loginPresentation 的 resolveSafeReturnTo 同一条判定：只允许站内
 * 相对路径，且不回跳到登录页本身。桌面端公开边界不允许 import auth/*，故在此
 * 保留同一规则（改一处必须同步另一处）。
 */
const resolveDesktopReturnTo = (raw: string | null | undefined): string => {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  const [pathname] = raw.split(/[?#]/);
  return pathname === "/login" || pathname === "/signup" ? "/" : raw;
};

const IDLE_AUTHORIZATION_STATE: DesktopBrowserAuthorizationState = Object.freeze({
  status: "idle",
});

const subscribeToNothing = () => () => {};

const readIdleAuthorizationState = () => IDLE_AUTHORIZATION_STATE;

/**
 * 浏览器授权控制器挂在 store 上（storeSession.desktop.ts 里
 * `store.desktopBrowserAuthorization = browserAuthorization`）。
 * 控制器缺席 = 桌面端会话运行时未就绪：必须明确提示不可用，绝不假装登录成功。
 */
const useDesktopBrowserAuthorization = (): DesktopBrowserAuthorizationController | null => {
  const contextValue = useContext(ReactReduxContext) as
    | {
        store?: {
          desktopBrowserAuthorization?: DesktopBrowserAuthorizationController;
        };
      }
    | undefined;
  return contextValue?.store?.desktopBrowserAuthorization ?? null;
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
      <Button
        variant="primary"
        onClick={() => {
          // 固定 allowlist 外跳；bridge 缺席时回退 noopener window.open。
          setFailed(!openDesktopAccountPage(target));
        }}
      >
        {label}
      </Button>
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

/**
 * 连接账号页（桌面端 /login）。
 *
 * 契约：
 * - 保留本地工作台：任何状态都能「返回工作区」，登录不是墙。
 * - 主按钮在浏览器登录；pending 可重开浏览器（同一笔授权，不另起）与取消；
 *   committing 是不可逆提交，不可取消。
 * - 失败按错误码映射成可读中文，绝不回显 token。
 * - 成功回到工作区：安全本站 returnTo 优先，否则首页。
 */
const DesktopConnectAccountPage = () => {
  const controller = useDesktopBrowserAuthorization();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
  const { isLoggedIn } = useIdentity();
  const [notice, setNotice] = useState<string | null>(null);

  const state = useSyncExternalStore(
    controller ? controller.subscribe : subscribeToNothing,
    controller ? controller.getState : readIdleAuthorizationState,
  );

  const returnTo = useMemo(() => {
    const fromRouter = new URLSearchParams(location.search).get("returnTo");
    const fromWindow =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("returnTo")
        : null;
    return resolveDesktopReturnTo(fromRouter ?? fromWindow);
  }, [location.search]);

  useEffect(() => {
    // 页面卸载只 cancel，绝不 dispose：dispose 属于会话运行时所有者。
    return () => {
      controller?.cancel();
    };
  }, [controller]);

  useEffect(() => {
    if (state.status === "succeeded") {
      navigate(returnTo, { replace: true });
    }
  }, [navigate, returnTo, state.status]);

  const startAuthorization = () => {
    setNotice(null);
    void controller?.start();
  };

  const reopenBrowser = () => {
    if (!controller) return;
    setNotice(
      controller.reopen()
        ? "已重新打开浏览器授权页。"
        : "无法重新打开授权页，请重新发起连接。",
    );
  };

  const cancelAuthorization = () => {
    controller?.cancel();
  };

  const goToWorkspace = () => {
    navigate("/", { replace: true });
  };

  const renderStatus = () => {
    switch (state.status) {
      case "starting":
        return <p style={statusTextStyle}>正在启动浏览器授权…</p>;
      case "pending":
        return (
          <p style={statusTextStyle}>
            请在系统浏览器中确认授权；若浏览器未自动打开，可重新打开。
          </p>
        );
      case "committing":
        return <p style={statusTextStyle}>正在完成登录，请稍候…</p>;
      case "succeeded":
        return <p style={statusTextStyle}>已连接 Nolo 账号，正在返回工作区…</p>;
      case "cancelled":
        return <p style={statusTextStyle}>已取消连接。</p>;
      case "expired":
        return <p style={statusTextStyle}>授权已过期，请重新发起连接。</p>;
      case "failed":
        return (
          <p role="alert" style={statusTextStyle}>
            {describeAuthorizationError(state.error)}
          </p>
        );
      default:
        return null;
    }
  };

  const renderPrimaryAction = () => {
    if (!controller) return null;
    switch (state.status) {
      case "starting":
        return (
          <Button variant="primary" size="large" disabled>
            正在连接…
          </Button>
        );
      case "pending":
        return (
          <>
            <Button variant="primary" size="large" onClick={reopenBrowser}>
              重新打开浏览器
            </Button>
            <Button variant="ghost" size="large" onClick={cancelAuthorization}>
              取消
            </Button>
          </>
        );
      case "committing":
        return (
          <Button variant="primary" size="large" disabled>
            正在完成登录…
          </Button>
        );
      case "cancelled":
      case "expired":
      case "failed":
        return (
          <Button variant="primary" size="large" onClick={startAuthorization}>
            重新连接
          </Button>
        );
      default:
        return (
          <Button variant="primary" size="large" onClick={startAuthorization}>
            在浏览器中登录
          </Button>
        );
    }
  };

  return (
    <main style={pageStyle}>
      <h1>连接 Nolo 账号</h1>
      <p style={{ marginTop: 8 }}>
        本地工作台无需登录即可使用；连接账号后可在浏览器中管理账户与云端能力。
      </p>
      {isLoggedIn ? (
        <section style={{ marginTop: 16 }}>
          <div>当前账号：{user?.username}</div>
          {user?.email ? <div style={{ opacity: 0.7 }}>{user.email}</div> : null}
          <div style={actionRowStyle}>
            <Button variant="primary" size="large" onClick={goToWorkspace}>
              返回工作区
            </Button>
          </div>
        </section>
      ) : controller ? (
        <section style={{ marginTop: 16 }}>
          {renderStatus()}
          <div style={actionRowStyle}>{renderPrimaryAction()}</div>
          {notice ? (
            <p role="status" style={statusTextStyle}>
              {notice}
            </p>
          ) : null}
          <div style={actionRowStyle}>
            <Button variant="secondary" size="large" onClick={goToWorkspace}>
              返回工作区
            </Button>
          </div>
        </section>
      ) : (
        <section style={{ marginTop: 16 }}>
          <p role="alert" style={statusTextStyle}>
            账号连接当前不可用：桌面端会话运行时未就绪，本地功能仍可正常使用。
          </p>
          <ExternalAccountAction
            target="signIn"
            label="在浏览器中打开登录页"
            description="将在系统浏览器中打开 nolo.chat 登录页。"
          />
          <div style={actionRowStyle}>
            <Button variant="secondary" size="large" onClick={goToWorkspace}>
              返回工作区
            </Button>
          </div>
        </section>
      )}
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
  { path: AppRoutePaths.LOGIN.slice(1), element: <DesktopConnectAccountPage /> },
  { path: "life", element: <DesktopAccountPage /> },
  { path: "life/usage", element: <DesktopAccountPage /> },
];
