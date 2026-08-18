import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LuCircleAlert, LuCircleCheck, LuLogIn, LuUserPlus } from "react-icons/lu";
import { authRoutes as authApiRoutes } from "core/authRoutes";
import { AppRoutePaths } from "app/constants/routePaths";
import { useAppSelector } from "app/store";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useCurrentUser, useToken } from "identity";
import { NavLink, useNavigate, useSearchParams } from "app/routing";
import Button from "render/web/ui/Button";

type InviteSummary = {
  token: string;
  spaceId: string;
  spaceName: string;
  email: string;
  role: string;
  status: string;
};

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  padding: 24,
  background: "#f6f7fb",
  color: "#172033",
};

const panelStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: "64px auto",
  padding: 24,
  border: "1px solid #dde3ee",
  borderRadius: 8,
  background: "#fff",
  boxShadow: "0 14px 38px rgba(15, 23, 42, 0.08)",
};

const mutedStyle: React.CSSProperties = {
  color: "#5f6f86",
  lineHeight: 1.6,
};

const statusStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  marginTop: 16,
  padding: 12,
  borderRadius: 8,
  background: "#f3f6fb",
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 20,
};

const readPayload = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
};

const getErrorMessage = (payload: any, fallback: string) =>
  payload?.error?.message || payload?.error || payload?.message || fallback;

export default function SpaceInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentServer = useAppSelector(selectCurrentServer);
  const token = useToken();
  const currentUser = useCurrentUser();
  const [invite, setInvite] = useState<InviteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const inviteToken = useMemo(
    () => searchParams.get("spaceInvite") || searchParams.get("token") || "",
    [searchParams],
  );
  const serverUrl = currentServer || (typeof window !== "undefined" ? window.location.origin : "");
  const returnTo = `${AppRoutePaths.SPACE_INVITE}?spaceInvite=${encodeURIComponent(inviteToken)}`;

  useEffect(() => {
    let active = true;
    const loadInvite = async () => {
      if (!inviteToken) {
        setError("缺少空间邀请 token。");
        setLoading(false);
        return;
      }
      if (!serverUrl) {
        setError("缺少当前服务器地址。");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const statusPath = `${authApiRoutes.users.spaceInviteStatus.createPath()}?token=${encodeURIComponent(inviteToken)}`;
        const response = await fetch(`${serverUrl}${statusPath}`, {
          method: authApiRoutes.users.spaceInviteStatus.method,
        });
        const payload = await readPayload(response);
        if (!response.ok) {
          throw new Error(getErrorMessage(payload, `读取邀请失败：HTTP ${response.status}`));
        }
        if (active) {
          setInvite(payload as InviteSummary);
          setError(null);
        }
      } catch (err: any) {
        if (active) setError(err?.message || "读取邀请失败。");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInvite();
    return () => {
      active = false;
    };
  }, [inviteToken, serverUrl]);

  const acceptInvite = useCallback(async () => {
    if (!token) {
      setError("请先登录被邀请邮箱对应的账号。");
      return;
    }
    if (!serverUrl || !inviteToken) return;
    try {
      setAccepting(true);
      const response = await fetch(`${serverUrl}${authApiRoutes.users.spaceInviteAccept.createPath()}`, {
        method: authApiRoutes.users.spaceInviteAccept.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: inviteToken }),
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, `接受邀请失败：HTTP ${response.status}`));
      }
      navigate(`/space/${payload.spaceId}`);
    } catch (err: any) {
      setError(err?.message || "接受邀请失败。");
    } finally {
      setAccepting(false);
    }
  }, [inviteToken, navigate, serverUrl, token]);

  const loginTo = `${AppRoutePaths.LOGIN}?returnTo=${encodeURIComponent(returnTo)}`;
  const signupTo = `${AppRoutePaths.SIGNUP}?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div style={pageStyle}>
      <section style={panelStyle}>
        <h1 style={{ margin: 0, fontSize: 28 }}>空间邀请</h1>
        {loading ? (
          <p style={mutedStyle}>正在读取邀请...</p>
        ) : invite ? (
          <>
            <p style={mutedStyle}>
              你被邀请加入 <strong>{invite.spaceName || invite.spaceId}</strong>。
            </p>
            <div style={statusStyle}>
              <LuUserPlus size={20} aria-hidden="true" />
              <div>
                <div>被邀请邮箱：{invite.email}</div>
                <div style={mutedStyle}>请使用这个邮箱对应的 Nolo 账号登录后接受邀请。</div>
              </div>
            </div>
            {invite.status !== "pending" ? (
              <div style={statusStyle}>
                <LuCircleCheck size={20} aria-hidden="true" />
                <div>这个邀请当前状态是 {invite.status}。</div>
              </div>
            ) : currentUser ? (
              <div style={actionRowStyle}>
                <Button variant="primary" loading={accepting} disabled={accepting} onClick={acceptInvite}>
                  接受邀请
                </Button>
              </div>
            ) : (
              <div style={actionRowStyle}>
                <Button as={NavLink} to={loginTo} variant="primary" icon={<LuLogIn size={18} aria-hidden="true" />}>
                  登录后接受
                </Button>
                <Button as={NavLink} to={signupTo} variant="secondary">
                  注册账号
                </Button>
              </div>
            )}
          </>
        ) : null}
        {error ? (
          <div style={{ ...statusStyle, background: "#fff4f2", color: "#8f2a1d" }}>
            <LuCircleAlert size={20} aria-hidden="true" />
            <div>{error}</div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
