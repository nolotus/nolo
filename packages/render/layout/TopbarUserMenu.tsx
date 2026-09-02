// 文件路径: render/layout/TopbarUserMenu.tsx

import React, {
  useCallback,
  useEffect,
  useState,
  useMemo } from
"react";
import { useNavigate, useLocation } from "app/routing";
import { useTranslation } from "react-i18next";
import {
  LuSettings,
  LuUser,
  LuPlus,
  LuLogOut,
  LuLogIn,
  LuDownload,
  LuChartColumnBig,
  LuUserPlus,
  LuShare2 } from
"react-icons/lu";
import {
  DialogTrigger,
  Dialog,
  Button as RacButton } from
"react-aria-components";

import { useAppDispatch, useAppSelector } from "app/store";
import { SettingRoutePaths } from "app/settings/config";
import {
  selectUsers,
  signOut,
  changeUser,
  fetchUserProfile,
} from "identity/actions";
import { useCurrentUser, useUserId } from "identity";
import { cloudLazy } from "identity/cloudLazy";
import { selectIdentityUserBalance } from "identity/selectors";
import { Tooltip } from "render/web/ui/Tooltip";
import { Popover } from "render/web/ui/Popover";
import Avatar from "render/web/ui/Avatar";

import { useIsMobile } from "app/hooks/useIsMobile";

// 🔹 新增：读取用户 profile 里的 avatarFileId
import { read, selectById } from "database/dbSlice";
import { createUserKey } from "database/keys";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import { resolveAvatarUrl } from "ai/agent/avatarUtils";
import { DarkModeSwitch } from "app/theme/web/DarkModeSwitch";
// InviteRewards 在公开集不存在（life 包 cloud-only）；cloudLazy 用变量路径绕过 esbuild。
const InviteRewards = cloudLazy<{ isOpen: boolean; onClose: () => void }>(
  "life/web/InviteRewards",
  () => null,
);
import "./layout.css";

/** 👤 菜单项组件 - 提取以优化性能和可读性 */
const UserMenuItem = React.memo(({
  icon: Icon,
  text,
  onClick,
  className = "",
  onClose




}: {icon: any;text: string;onClick: () => void;className?: string;onClose: () => void;}) =>
<button
  type="button"
  onClick={() => {onClick();onClose();}}
  className={`topbar-user-menu__item ${className}`}>

    <Icon size={14} aria-hidden="true" />
    <span>{text}</span>
  </button>
);

UserMenuItem.displayName = "UserMenuItem";

/**
 * 顶栏用户菜单
 */
const TopbarUserMenu: React.FC = () => {
  const { t } = useTranslation(["common", "chat"]);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const authUser = useCurrentUser();

  const users = useAppSelector(selectUsers);
  const currentUserId = useUserId();
  const balance = useAppSelector(selectIdentityUserBalance);
  const currentServer = useAppSelector(selectRuntimeCurrentServer);

  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const balanceValue = typeof balance === "number" ? balance : 0;
  const isLoadingBalance = typeof balance !== "number";
  const creditsValue = isLoadingBalance ? "..." : balanceValue.toFixed(2);
  const creditsUnit = t("chat:creditsUnit", "积分");

  const otherUsers = useMemo(() =>
  users.filter((u: any) => u?.userId && u.userId !== currentUserId),
  [users, currentUserId]
  );

  useEffect(() => {
    if (currentUserId) {
      dispatch(fetchUserProfile());
    }
  }, [currentUserId, dispatch]);

  const isMobile = useIsMobile(768);

  const handleInvite = useCallback(() => {
    setMenuOpen(false);
    setInviteOpen(true);
  }, []);

  const handleLoginOther = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  const handleLogout = useCallback(() => {
    dispatch(signOut() as any).unwrap().then(() => navigate("/"));
  }, [dispatch, navigate]);

  const handleOpenLifeUsage = useCallback(() => {
    setMenuOpen(false);
    navigate("/life/usage");
  }, [navigate]);

  const handleOpenSettings = useCallback(() => {
    setMenuOpen(false);
    navigate(SettingRoutePaths.SETTING, { state: { backgroundLocation: location } });
  }, [navigate, location]);


  // 📝 配置项缓存
  const bottomActions = useMemo(() => [
  { icon: LuLogIn, text: t("loginOtherUser", "登录其他用户"), onClick: handleLoginOther, className: "topbar-user-menu__item--login-other" },
  { icon: LuUserPlus, text: t("inviteFriend"), onClick: handleInvite, className: "topbar-user-menu__item--invite" },
  { icon: LuDownload, text: t("downloadClient", "下载客户端"), onClick: () => navigate("/downloads"), className: "topbar-user-menu__item--download" },
  { icon: LuLogOut, text: t("logout"), onClick: handleLogout, className: "topbar-user-menu__item--logout" }],
  [t, handleLoginOther, handleInvite, handleLogout, navigate]);

  // ================= 读取用户头像 =================

  // 1) 计算 profileKey，用于读取用户 Profile 记录
  const profileKey = useMemo(
    () => currentUserId ? createUserKey.profile(currentUserId) : null,
    [currentUserId]
  );

  // 2) 异步从 DB 读取 Profile
  useEffect(() => {
    if (!profileKey) return;
    dispatch(read({ dbKey: profileKey }) as any);
  }, [profileKey, dispatch]);

  // 3) 从 dbSlice 中取出 Profile
  const profile = useAppSelector((state) =>
  profileKey ? selectById(state as any, profileKey) as any : null
  );

  // 4) 根据 profile.avatarFileId / profile.avatar 推导头像 URL
  const avatarUrl = useMemo(() => {
    if (!profile) return null;
    const anyProfile = profile as any;

    const avatarFromFile = resolveAvatarUrl(anyProfile.avatarFileId, currentServer);
    if (avatarFromFile) return avatarFromFile;

    if (typeof anyProfile.avatar === "string" && anyProfile.avatar.trim()) {
      return anyProfile.avatar as string;
    }

    return null;
  }, [profile, currentServer]);

  if (!authUser) return null;

  return (
      <>
        <div className="TopbarUserMenu">
        <DialogTrigger isOpen={menuOpen} onOpenChange={setMenuOpen}>
          <Tooltip
            content={t("accountMenu", "账号菜单")}
            placement="bottom"
            disabled={isMobile || menuOpen}
          >
            <RacButton
              className={`topbar-user-menu__avatar-button ${menuOpen ? "is-open" : ""}`}
              aria-label={t("accountMenu", "账号菜单")}
            >
              <Avatar
                name={authUser.username}
                type="user"
                size="small"
                shape="full"
                className="topbar-user-menu__avatar"
                src={avatarUrl || undefined}
              />
            </RacButton>
          </Tooltip>

          <Popover
            className="topbar-user-menu__popup"
            placement="bottom end"
            hideArrow
          >
            <Dialog className="topbar-user-menu__dialog">
              {/* Section 1: User Identity */}
              <div className="topbar-user-menu__header">
                <button
                  type="button"
                  className="topbar-user-menu__username topbar-user-menu__username--link"
                  onClick={() => {
                    navigate("/life");
                    setMenuOpen(false);
                  }}
                >
                  {authUser.username}
                </button>
                {authUser.email && authUser.email !== authUser.username ? (
                  <div className="topbar-user-menu__email" title={authUser.email}>
                    {authUser.email}
                  </div>
                ) : null}
                <div className="topbar-user-menu__balance-row">
                  <div className="topbar-user-menu__balance-copy">
                    <span className="topbar-user-menu__balance-label">{creditsUnit}</span>
                    <span className={`topbar-user-menu__balance-value ${!isLoadingBalance && balanceValue < 10 ? "is-low" : ""}`}>
                      {creditsValue}
                    </span>
                  </div>
                  <button
                    type="button" className="topbar-user-menu__btn-add"
                    onClick={() => {navigate("/recharge");setMenuOpen(false);}}>

                    <LuPlus size={10} strokeWidth={3} aria-hidden="true" />
                    <span>{t("recharge", "充值")}</span>
                  </button>
                </div>
              </div>

              <div className="topbar-user-menu__divider" />

              <div className="topbar-user-menu__list">
                <UserMenuItem
                  icon={LuChartColumnBig}
                  text={t("usage_dashboard", "使用统计")}
                  onClick={handleOpenLifeUsage}
                  onClose={() => setMenuOpen(false)}
                />
                <UserMenuItem
                  icon={LuShare2}
                  text={t("space:myShares.title", "我的分享")}
                  onClick={() => navigate("/life/shares")}
                  onClose={() => setMenuOpen(false)}
                />
                <UserMenuItem
                  icon={LuSettings}
                  text={t("settings.title", "设置")}
                  onClick={handleOpenSettings}
                  onClose={() => setMenuOpen(false)}
                />
              </div>

              {/* Section 2: Account Switch */}
              {otherUsers.length > 0 && (
                <>
                  <div className="topbar-user-menu__divider" />
                  <div className="topbar-user-menu__list">
                    {otherUsers.map((u: any) => u &&
                      <Tooltip key={u.userId} content={t("switchToThisAccount", "切换账号")} placement="left" disabled={isMobile}>
                        <UserMenuItem icon={LuUser} text={u.username} onClick={() => dispatch(changeUser(u))} onClose={() => setMenuOpen(false)} />
                      </Tooltip>
                    )}
                  </div>
                </>
              )}

              <div className="topbar-user-menu__divider" />

              <div className="topbar-user-menu__preferences">
                <div className="topbar-user-menu__theme-row">
                  <span className="topbar-user-menu__theme-label">
                    {t("settings.appearance.mode.title", "深色模式")}
                  </span>
                  <DarkModeSwitch compact />
                </div>
              </div>

              <div className="topbar-user-menu__divider" />

              {/* Section 4: Functional Actions */}
              <div className="topbar-user-menu__list">
                {bottomActions.map((action) =>
                <UserMenuItem key={action.text} {...action} onClose={() => setMenuOpen(false)} />
                )}
              </div>
            </Dialog>
          </Popover>
        </DialogTrigger>
      </div>
      <InviteRewards isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>);

};

export default TopbarUserMenu;
