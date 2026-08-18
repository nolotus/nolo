import React, { useEffect, useMemo, useState } from "react";
import { replaceCurrentToken } from "identity/actions";
import { useCurrentUser, useToken } from "identity";
import { useTranslation } from "react-i18next";
import { LuClock3 } from "react-icons/lu";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectRemoteServer } from "app/settings/settingSlice";
import { authRoutes } from "core/authRoutes";
import { toast } from "app/utils/toast"
import Button from "render/web/ui/Button";
import { Dialog } from "render/web/ui/modal/Dialog";
import { parseToken } from "core/authToken";
import { buildRecentAccessFlags } from "./userSecurityUtils";
import { hashPasswordV1 } from "core/password";
import { generateKeyPairFromSeedV1 } from "core/generateKeyPairFromSeedV1";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { buildPersistentAuthTokenPayload, signToken } from "core/authToken";

type RecentAccessEntry = {
  timestamp: number;
  source: "login" | "token";
  ip: string;
  device: string;
};

type UserSecurityState = {
  lastLoginAt?: number | string | null;
  lastActiveAt?: number | string | null;
  recentAccesses: RecentAccessEntry[];
  locale?: string;
  publicKey?: string;
};

const formatSecurityTime = (
  value: number | string | null | undefined,
  fallback: string
) => {
  if (value == null || value === "") return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString();
};

const SecurityStatItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="profile-item">
    <div className="profile-item-main">
      <div className="profile-item-icon">{icon}</div>
      <div className="profile-item-content">
        <span className="profile-item-label">{label}</span>
        <span className="profile-item-value">{value}</span>
      </div>
    </div>
  </div>
);

const SecuritySettings: React.FC = () => {
  const user = useCurrentUser();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentServer = useAppSelector(selectRemoteServer);
  const currentToken = useToken();

  const userId = user?.userId;
  const [securityInfo, setSecurityInfo] = useState<UserSecurityState>({
    lastLoginAt: null,
    lastActiveAt: null,
    recentAccesses: [],
    locale: "",
    publicKey: "",
  });
  const [securityLoading, setSecurityLoading] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokePassword, setRevokePassword] = useState("");
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);

  useEffect(() => {
    if (!currentServer || !currentToken || !userId) return;
    let cancelled = false;

    const loadSecurityInfo = async () => {
      setSecurityLoading(true);
      try {
        const res = await fetch(
          `${currentServer}${authRoutes.users.detail.createPath({ userId })}`,
          {
            method: authRoutes.users.detail.method,
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setSecurityInfo({
          lastLoginAt: data?.lastLoginAt,
          lastActiveAt: data?.lastActiveAt,
          recentAccesses: Array.isArray(data?.recentAccesses)
            ? data.recentAccesses
            : [],
          locale: typeof data?.locale === "string" ? data.locale : "",
          publicKey: typeof data?.publicKey === "string" ? data.publicKey : "",
        });
      } finally {
        if (!cancelled) setSecurityLoading(false);
      }
    };

    void loadSecurityInfo();

    return () => {
      cancelled = true;
    };
  }, [currentServer, currentToken, userId]);

  const flaggedRecentAccesses = useMemo(
    () => buildRecentAccessFlags(securityInfo.recentAccesses),
    [securityInfo.recentAccesses]
  );

  const handleCloseRevokeModal = () => {
    if (isRevokingSessions) return;
    setIsRevokeModalOpen(false);
    setRevokePassword("");
  };

  const handleRevokeSessions = async () => {
    if (!currentServer || !currentToken || !userId || !user?.username) {
      toast.error(t("accountSecurity.revokeFailed", "操作失败，请稍后重试。"));
      return;
    }
    if (!revokePassword) {
      toast.error(
        t("accountSecurity.currentPasswordRequired", "请输入当前密码后再继续。")
      );
      return;
    }

    const locale = securityInfo.locale;
    if (!locale) {
      toast.error(
        t(
          "accountSecurity.revokeMissingLocale",
          "当前账号缺少登录环境信息，请重新登录后再试。"
        )
      );
      return;
    }

    setIsRevokingSessions(true);
    try {
      const encryptionKey = await hashPasswordV1(revokePassword);
      const { publicKey, secretKey } = generateKeyPairFromSeedV1(
        user.username + encryptionKey + locale
      );
      const currentTokenPayload = parseToken(currentToken);

      if (securityInfo.publicKey && securityInfo.publicKey !== publicKey) {
        throw new Error("wrong_password");
      }

      const verificationToken = signToken(
        buildPersistentAuthTokenPayload(
          {
            userId,
            username: user.username,
            publicKey,
            tokenVersion:
              typeof currentTokenPayload?.tokenVersion === "number"
                ? Math.max(0, Math.floor(currentTokenPayload.tokenVersion))
                : 0,
          },
          Math.floor(Date.now() / 1000)
        ),
        secretKey
      );

      const response = await fetch(
        `${currentServer}${authRoutes.users.sessionRevoke.createPath()}`,
        {
          method: authRoutes.users.sessionRevoke.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ verificationToken }),
        }
      );

      if (!response.ok) {
        throw new Error(response.status === 403 ? "wrong_password" : "revoke_failed");
      }

      const data = await response.json();
      const nextToken = signToken(
        buildPersistentAuthTokenPayload(
          {
            userId,
            username: user.username,
            publicKey,
            tokenVersion: Math.max(
              0,
              Math.floor(asOptionalFiniteNumber(data?.tokenVersion) ?? 0)
            ),
          },
          Math.floor(Date.now() / 1000)
        ),
        secretKey
      );

      try {
        await dispatch(replaceCurrentToken({ token: nextToken }) as any).unwrap();
      } catch {
        throw new Error("replace_token_failed");
      }

      setRevokePassword("");
      setIsRevokeModalOpen(false);
      toast.success(
        t(
          "accountSecurity.revokeSuccess",
          "已踢掉其他设备，并为当前设备更新了新的登录凭证。"
        )
      );
    } catch (error: any) {
      const isWrongPassword =
        error instanceof Error && error.message === "wrong_password";
      const isReplaceTokenFailed =
        error instanceof Error && error.message === "replace_token_failed";
      toast.error(
        isWrongPassword
          ? t("accountSecurity.revokeWrongPassword", "当前密码不正确，请重试。")
          : isReplaceTokenFailed
            ? t(
                "accountSecurity.revokeReplaceTokenFailed",
                "旧设备已被踢掉，但当前设备保存新 token 失败。请立即刷新页面并重新登录。"
              )
            : t("accountSecurity.revokeFailed", "操作失败，请稍后重试。")
      );
    } finally {
      setIsRevokingSessions(false);
    }
  };

  return (
    <>
      <div className="user-profile-page">
        <h1 className="page-title">{t("accountSecurity.title", "账号安全")}</h1>
        <p className="security-panel__desc">
          {t(
            "accountSecurity.panelDescription",
            "查看最近登录与访问痕迹，帮助你更早发现异常设备或陌生 IP。"
          )}
        </p>

        <section className="security-panel">
          <div className="security-panel__stats">
            <SecurityStatItem
              icon={<LuClock3 size={18} aria-hidden="true" />}
              label={t("accountSecurity.lastLoginAt", "最近登录")}
              value={formatSecurityTime(
                securityInfo.lastLoginAt,
                t("accountSecurity.notAvailable", "暂无记录")
              )}
            />
            <SecurityStatItem
              icon={<LuClock3 size={18} aria-hidden="true" />}
              label={t("accountSecurity.lastActiveAt", "最近活跃")}
              value={formatSecurityTime(
                securityInfo.lastActiveAt,
                t("accountSecurity.notAvailable", "暂无记录")
              )}
            />
          </div>

          <div className="security-panel__activity">
            <div className="security-panel__section-heading">
              <span className="security-panel__section-title">
                {t("accountSecurity.recentActivity", "最近访问活动")}
              </span>
              <span className="security-panel__section-hint">
                {t(
                  "accountSecurity.recentActivityHint",
                  "这里会展示最近登录和已认证访问的设备摘要，帮助你发现异常活动。"
                )}
              </span>
            </div>
            <div className="security-activity-list">
              {securityLoading ? (
                <div className="security-activity-empty">
                  {t("loading", "加载中...")}
                </div>
              ) : flaggedRecentAccesses.length === 0 ? (
                <div className="security-activity-empty">
                  {t("accountSecurity.noRecentActivity", "还没有最近访问活动记录。")}
                </div>
              ) : (
                flaggedRecentAccesses.map((entry) => (
                  <div
                    className={`security-activity-item ${
                      entry.isNew ? "security-activity-item--new" : ""
                    }`}
                    key={`${entry.timestamp}-${entry.source}-${entry.ip}-${entry.device}`}
                  >
                    <div className="security-activity-item__main">
                      <div className="security-activity-item__headline">
                        <span className="security-activity-item__device">
                          {entry.device}
                        </span>
                        {entry.isNew && (
                          <span className="security-activity-item__badge">
                            {t("accountSecurity.newAccess", "新访问")}
                          </span>
                        )}
                      </div>
                      <span className="security-activity-item__meta">
                        {entry.ip} ·{" "}
                        {entry.source === "login"
                          ? t("accountSecurity.sourceLogin", "登录")
                          : t("accountSecurity.sourceToken", "已认证访问")}
                      </span>
                    </div>
                    <span className="security-activity-item__time">
                      {formatSecurityTime(
                        entry.timestamp,
                        t("accountSecurity.notAvailable", "暂无记录")
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="security-action-card">
            <div className="security-action-card__copy">
              <span className="profile-item-label">
                {t("accountSecurity.revokeTitle", "发现异常？踢掉所有其他设备")}
              </span>
              <span className="profile-item-subtext">
                {t(
                  "accountSecurity.revokeDescription",
                  "输入当前密码后，所有旧 token 会立刻失效。当前设备会自动换成新的 token，其它设备会被退出。"
                )}
              </span>
            </div>
            <Button
              variant="danger"
              size="small"
              disabled={!userId || securityLoading}
              onClick={() => setIsRevokeModalOpen(true)}
            >
              {t("accountSecurity.revokeButton", "踢掉所有其他设备")}
            </Button>
          </div>
        </section>
      </div>

      <Dialog
        isOpen={isRevokeModalOpen}
        onClose={handleCloseRevokeModal}
        title={t("accountSecurity.revokeModalTitle", "踢掉所有其他设备")}
        status="warning"
        width={440}
        onEnterPress={() => void handleRevokeSessions()}
        isActionDisabled={isRevokingSessions}
        actions={
          <>
            <Button
              variant="secondary"
              size="small"
              disabled={isRevokingSessions}
              onClick={handleCloseRevokeModal}
            >
              {t("cancel", "取消")}
            </Button>
            <Button
              variant="danger"
              size="small"
              loading={isRevokingSessions}
              disabled={isRevokingSessions}
              onClick={() => void handleRevokeSessions()}
            >
              {t("accountSecurity.revokeConfirmButton", "确认踢掉并更新 token")}
            </Button>
          </>
        }
      >
        <div className="security-revoke-modal">
          <p className="security-revoke-modal__hint">
            {t(
              "accountSecurity.revokeModalHint",
              "如果你怀疑账号已在陌生设备登录，可以立即让所有旧 token 失效。为了保留当前设备登录，需要先验证一次当前密码。"
            )}
          </p>
          <label
            className="security-revoke-modal__label"
            htmlFor="security-revoke-password"
          >
            {t("accountSecurity.currentPasswordLabel", "当前密码")}
          </label>
          <input
            id="security-revoke-password"
            className="security-revoke-modal__input"
            type="password"
            autoComplete="current-password"
            value={revokePassword}
            onChange={(event) => setRevokePassword(event.target.value)}
            disabled={isRevokingSessions}
            placeholder={t(
              "accountSecurity.currentPasswordPlaceholder",
              "输入当前密码后继续"
            )}
          />
          <p className="security-revoke-modal__note">
            {t(
              "accountSecurity.revokeModalNote",
              "执行后，当前页面会切换到新 token；其余设备上的旧会话会在下一次请求时失效。"
            )}
          </p>
        </div>
      </Dialog>
    </>
  );
};

export default SecuritySettings;
