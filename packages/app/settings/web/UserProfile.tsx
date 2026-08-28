import React, { useEffect, useMemo, useRef, useState } from "react";
// 直接引用 auth/hooks 实现而非 identity re-export：
// identity/useDeleteOwnAccountFlow 的 re-export 层在 esbuild splitting+minify 下
// 会导致共享 chunk 符号级 import 丢失（Oe is not defined，2026-08-21 生产事故），
// 直接 import 后 hook 随 UserProfile chunk 内联，产物自洽。
import { useDeleteOwnAccountFlow } from "identity/useDeleteOwnAccountFlow";
import { useCurrentUser, useToken } from "identity";
import { useTranslation } from "react-i18next";
import { useNavigate } from "app/routing";

import {
  LuUser,
  LuKeyRound,
  LuMail,
  LuClipboard,
  LuClipboardCheck,
  LuGlobe,
  LuPencil,
  LuCheck,
  LuX,
  LuExternalLink,
  LuTriangleAlert,
} from "react-icons/lu";

import { useAppDispatch, useAppSelector } from "app/store";
import {
  upload,
  patch,
  read,
  readAndWait,
  readFileContent,
  selectById,
} from "database/dbSlice";
import { selectRemoteServer } from "app/settings/settingSlice";
import { buildDatabaseFileContentUrl } from "database/fileUrl";
import { createUserKey } from "database/keys";
import { toast } from "app/utils/toast"
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import LanguageSwitcher from "render/web/ui/LanguageSwitcher";
import { USER_EMAIL_PREFERENCE_ENDPOINTS } from "app/email/emailApiRoutes";
import Button from "render/web/ui/Button";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";

// 可编辑列
const EditableProfileItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
}> = ({ icon, label, value, onSave, placeholder }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTempValue(value || "");
  }, [value]);

  const handleSave = async () => {
    if (tempValue === (value || "")) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(tempValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-item">
      <div className="profile-item-main">
        <div className="profile-item-icon">{icon}</div>
        <div className="profile-item-content">
          <span className="profile-item-label">{label}</span>
          {isEditing ? (
            <input
              autoFocus
              className="profile-item-input"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder={placeholder}
              disabled={isSaving}
            />
          ) : (
            <span className="profile-item-value">{value || placeholder || t("userProfile.profileItem.notSet", "未设置")}</span>
          )}
        </div>
      </div>
      <div className="profile-item-actions">
        {isEditing ? (
          <>
            <button
              type="button"
              className="action-btn save"
              onClick={handleSave}
              disabled={isSaving}
              title={t("userProfile.profileItem.save", "保存")}
              aria-label={t("userProfile.profileItem.save", "保存")}
            >
              {isSaving ? (
                <div className="spinner-small" aria-hidden="true" />
              ) : (
                <LuCheck size={18} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="action-btn cancel"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              title={t("userProfile.profileItem.cancel", "取消")}
              aria-label={t("userProfile.profileItem.cancel", "取消")}
            >
              <LuX size={18} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="action-btn"
            onClick={() => setIsEditing(true)}
            title={t("userProfile.profileItem.edit", "编辑")}
            aria-label={t("userProfile.profileItem.edit", "编辑")}
          >
            <LuPencil size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

// 静态只读列
const StaticProfileItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  isCopyable?: boolean;
}> = ({ icon, label, value, isCopyable = false }) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const copyLabel = isCopied
    ? t("userProfile.profileItem.copied", "已复制")
    : t("userProfile.profileItem.copy", "复制");

  return (
    <div className="profile-item">
      <div className="profile-item-main">
        <div className="profile-item-icon">{icon}</div>
        <div className="profile-item-content">
          <span className="profile-item-label">{label}</span>
          <span className="profile-item-value">{value || "N/A"}</span>
        </div>
      </div>
      {isCopyable && value && (
        <button
          type="button"
          onClick={handleCopy}
          className={`action-btn ${isCopied ? "copied" : ""}`}
          title={copyLabel}
          aria-label={copyLabel}
        >
          {isCopied ? (
            <LuClipboardCheck size={18} aria-hidden="true" />
          ) : (
            <LuClipboard size={18} aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
};

const UserProfile: React.FC = () => {
  const user = useCurrentUser();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentServer = useAppSelector(selectRemoteServer);
  const currentToken = useToken();

  const userId = user?.userId;
  const profileKey = useMemo(() => (userId ? createUserKey.profile(userId) : null), [userId]);
  const [emailPrefs, setEmailPrefs] = useState<{
    emailOptOutAll: boolean;
    emailMutedUntil: number;
    emailOptOutTags: string[];
  }>({
    emailOptOutAll: false,
    emailMutedUntil: 0,
    emailOptOutTags: [],
  });
  const [emailPrefsLoading, setEmailPrefsLoading] = useState(false);
  const [emailPrefsSaving, setEmailPrefsSaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const {
    deleteAccount,
    isDeletingAccount,
  } = useDeleteOwnAccountFlow({
    afterSignOut: () => navigate("/"),
    onDeleteSucceeded: () => {
      toast.success(t("accountDeletion.success", "你的账号已被删除。"));
    },
    onDeleteFailed: () => {
      toast.error(t("accountDeletion.failed", "删除账号失败，请稍后重试。"));
    },
    onLocalCleanupFailed: (error) => {
      console.error("Failed to clear local session after account deletion", error);
    },
  });

  useEffect(() => {
    if (profileKey) dispatch(read({ dbKey: profileKey }) as any);
  }, [profileKey, dispatch]);

  useEffect(() => {
    if (!currentServer || !userId || !currentToken) return;
    let cancelled = false;
    const loadEmailPrefs = async () => {
      setEmailPrefsLoading(true);
      try {
        const res = await fetch(
          `${currentServer}${USER_EMAIL_PREFERENCE_ENDPOINTS.get.path}`,
          {
            method: USER_EMAIL_PREFERENCE_ENDPOINTS.get.method,
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setEmailPrefs({
          emailOptOutAll: Boolean(data?.emailOptOutAll),
          emailMutedUntil: Number(data?.emailMutedUntil || 0),
          emailOptOutTags: Array.isArray(data?.emailOptOutTags) ? data.emailOptOutTags : [],
        });
      } finally {
        if (!cancelled) setEmailPrefsLoading(false);
      }
    };
    void loadEmailPrefs();
    return () => {
      cancelled = true;
    };
  }, [currentServer, userId, currentToken]);

  const profile = useAppSelector((state) =>
    profileKey ? (selectById(state as any, profileKey) as any) : null
  );

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const cleanupObjectUrl = () => {
    if (avatarObjectUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }
    avatarObjectUrlRef.current = null;
  };

  useEffect(() => {
    const fileId = profile?.avatarFileId || profile?.avatar;
    if (!fileId) return;

    let cancelled = false;
    const loadAvatar = async () => {
      try {
        if (fileId.startsWith("http") || fileId.startsWith("blob:") || fileId.includes("/")) {
          setAvatarPreview(fileId);
          return;
        }
        const result = await dispatch(readFileContent({ fileId, useServerFallback: true }) as any).unwrap();
        if (cancelled) return;
        const url = URL.createObjectURL(result.blob);
        cleanupObjectUrl();
        avatarObjectUrlRef.current = url;
        setAvatarPreview(url);
      } catch {
        if (!fileId.includes("/")) {
          const remoteUrl = buildDatabaseFileContentUrl(currentServer, fileId);
          if (remoteUrl) {
            setAvatarPreview(remoteUrl);
          }
        }
      }
    };
    loadAvatar();
    return () => { cancelled = true; };
  }, [profile?.avatarFileId, profile?.avatar, currentServer, dispatch]);

  const handleUpdateField = async (field: string, newValue: string) => {
    if (!profileKey) return;
    try {
      await dispatch(patch({ dbKey: profileKey, changes: { [field]: newValue } }) as any).unwrap();
      toast.success(t("userProfile.saveSuccess", "保存成功"));
    } catch {
      toast.error(t("userProfile.saveFailed", "保存失败"));
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.userId || !profileKey) return;

    const localUrl = URL.createObjectURL(file);
    cleanupObjectUrl();
    avatarObjectUrlRef.current = localUrl;
    setAvatarPreview(localUrl);

    try {
      const metadata = await dispatch(upload({ file, customKey: `avatar-${user.userId}`, userId: user.userId }) as any).unwrap();
      if (metadata?.id) {
        await dispatch(readAndWait(profileKey) as any).unwrap();
        await dispatch(patch({ dbKey: profileKey, changes: { avatarFileId: metadata.id } }) as any).unwrap();
        toast.success(t("userProfile.uploadSuccess", "头像已更新"));
      }
    } catch {
      toast.error(t("userProfile.uploadFailed", "上传失败"));
    }
  };

  const handleUpdateEmailPrefs = async (changes: Record<string, any>) => {
    if (!currentServer || !currentToken) return;
    setEmailPrefsSaving(true);
    try {
      const res = await fetch(
        `${currentServer}${USER_EMAIL_PREFERENCE_ENDPOINTS.update.path}`,
        {
          method: USER_EMAIL_PREFERENCE_ENDPOINTS.update.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify(changes),
        }
      );
      if (!res.ok) {
        throw new Error("update_email_preferences_failed");
      }
      const data = await res.json();
      setEmailPrefs({
        emailOptOutAll: Boolean(data?.emailOptOutAll),
        emailMutedUntil: Number(data?.emailMutedUntil || 0),
        emailOptOutTags: Array.isArray(data?.emailOptOutTags) ? data.emailOptOutTags : [],
      });
      toast.success(t("userProfile.saveSuccess", "保存成功"));
    } catch {
      toast.error(t("userProfile.saveFailed", "保存失败"));
    } finally {
      setEmailPrefsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) {
      toast.error(
        t("accountDeletion.failed", "删除账号失败，请稍后重试。")
      );
      return;
    }
    try {
      await deleteAccount();
    } finally {
      setIsDeleteConfirmOpen(false);
    }
  };

  return (
    <>
      
      <div className="user-profile-page">
        <h1 className="page-title">{t("userProfile.title", "账号设置")}</h1>

        <section className="avatar-section">
          <div className="avatar-preview">
            {avatarPreview ? <img src={avatarPreview} alt="Avatar" /> : <LuUser size={40} aria-hidden="true" />}
          </div>
          <div className="avatar-upload">
            <div className="avatar-upload-label">{t("userProfile.avatar.title", "个人头像")}</div>
            <div className="avatar-upload-actions">
              <label className="avatar-upload-button">
                <input className="avatar-input" type="file" accept="image/*" onChange={handleAvatarChange} />
                {t("userProfile.avatar.upload", "上传新头像")}
              </label>
              <span className="avatar-upload-hint">{t("userProfile.avatar.supportedFormats", "支持 JPG / PNG / WebP")}</span>
            </div>
          </div>
        </section>

        <div className="profile-section">
          <div className="section-group">
            <h2 className="section-title"><LuPencil size={16} aria-hidden="true" />{t("userProfile.publicProfile", "公开资料")}</h2>
            <EditableProfileItem
              icon={<LuUser size={18} aria-hidden="true" />}
              label={t("userProfile.nickname.label", "昵称")}
              value={profile?.nickname}
              onSave={(val) => handleUpdateField("nickname", val)}
              placeholder={t("userProfile.nickname.placeholder", "起个好听的名字")}
            />
            <EditableProfileItem
              icon={<LuGlobe size={18} aria-hidden="true" />}
              label={t("userProfile.website.label", "个人主页")}
              value={profile?.website}
              onSave={(val) => handleUpdateField("website", val)}
              placeholder="https://..."
            />
            <EditableProfileItem
              icon={<LuExternalLink size={18} aria-hidden="true" />}
              label={t("userProfile.signature.label", "个性签名")}
              value={profile?.bio || profile?.signature}
              onSave={(val) => handleUpdateField("bio", val)}
              placeholder={t("userProfile.signature.placeholder", "介绍一下自己吧")}
            />
          </div>

          <div className="section-group">
            <h2 className="section-title"><LuKeyRound size={16} aria-hidden="true" />{t("userProfile.account.title", "账号详情")}</h2>
            <StaticProfileItem icon={<LuUser size={18} aria-hidden="true" />} label={t("userProfile.account.username", "用户名")} value={user?.username} />
            <StaticProfileItem icon={<LuKeyRound size={18} aria-hidden="true" />} label={t("userProfile.account.userId", "UID")} value={user?.userId} isCopyable />
            <StaticProfileItem icon={<LuMail size={18} aria-hidden="true" />} label={t("userProfile.account.email", "邮件")} value={user?.email} isCopyable />
          </div>

          <div className="section-group">
            <h2 className="section-title"><LuGlobe size={16} aria-hidden="true" />{t("userProfile.language", "显示语言")}</h2>
            <LanguageSwitcher />
          </div>

          <div className="section-group">
            <h2 className="section-title"><LuMail size={16} aria-hidden="true" />{t("userProfile.emailPreferences", "邮件偏好")}</h2>
            <div className="profile-item">
              <div className="profile-item-main">
                <div className="profile-item-icon"><LuMail size={18} aria-hidden="true" /></div>
                <div className="profile-item-content">
                  <span className="profile-item-label">{t("userProfile.emailAllSwitch", "通知总开关")}</span>
                  <span className="profile-item-value">
                    {emailPrefs.emailOptOutAll
                      ? t("userProfile.emailDisabled", "已关闭所有邮件")
                      : t("userProfile.emailEnabled", "已开启邮件通知")}
                  </span>
                </div>
              </div>
              <div className="profile-item-actions">
                <button
                  type="button"
                  className="action-btn text-btn"
                  disabled={emailPrefsLoading || emailPrefsSaving}
                  onClick={() =>
                    handleUpdateEmailPrefs({ emailOptOutAll: !emailPrefs.emailOptOutAll })
                  }
                >
                  {emailPrefs.emailOptOutAll ? t("userProfile.enable", "开启") : t("userProfile.disable", "关闭")}
                </button>
              </div>
            </div>

            <div className="profile-item">
              <div className="profile-item-main">
                <div className="profile-item-icon"><LuKeyRound size={18} aria-hidden="true" /></div>
                <div className="profile-item-content">
                  <span className="profile-item-label">{t("userProfile.emailMuteUntil", "静默到期时间")}</span>
                  <span className="profile-item-value">
                    {emailPrefs.emailMutedUntil
                      ? new Date(emailPrefs.emailMutedUntil).toLocaleString()
                      : t("userProfile.notMuted", "未静默")}
                  </span>
                </div>
              </div>
              <div className="profile-item-actions">
                <button
                  type="button"
                  className="action-btn text-btn"
                  disabled={emailPrefsLoading || emailPrefsSaving}
                  onClick={() => handleUpdateEmailPrefs({ muteForDays: 3 })}
                >
                  {t("userProfile.mute3Days", "静默3天")}
                </button>
                <button
                  type="button"
                  className="action-btn text-btn"
                  disabled={emailPrefsLoading || emailPrefsSaving}
                  onClick={() => handleUpdateEmailPrefs({ clearMute: true })}
                >
                  {t("userProfile.clearMute", "取消静默")}
                </button>
              </div>
            </div>

            <EditableProfileItem
              icon={<LuClipboard size={18} aria-hidden="true" />}
              label={t("userProfile.emailOptOutTags.label", "退订标签（逗号分隔）")}
              value={emailPrefs.emailOptOutTags.join(",")}
              onSave={async (value) => {
                const tags = value
                  .split(",")
                  .map((tag) => asTrimmedLowercaseString(tag))
                  .filter(Boolean);
                await handleUpdateEmailPrefs({ emailOptOutTags: tags });
              }}
              placeholder={t("userProfile.emailOptOutTags.placeholder", "reengagement,onboarding-guide")}
            />
          </div>

          <div className="section-group">
            <h2 className="section-title">
              <LuTriangleAlert size={16} aria-hidden="true" />
              {t("accountDeletion.sectionTitle", "危险操作")}
            </h2>
            <div className="danger-zone">
              <div className="danger-zone-main">
                <div className="danger-zone-icon">
                  <LuTriangleAlert size={20} aria-hidden="true" />
                </div>
                <div className="danger-zone-copy">
                  <h3 className="danger-zone-title">
                    {t("accountDeletion.title", "删除账户")}
                  </h3>
                  <p className="danger-zone-desc">
                    {t(
                      "accountDeletion.description",
                      "删除后将永久移除你的账号及相关数据，此操作不可撤销。"
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="small"
                loading={isDeletingAccount}
                disabled={!userId}
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                {t("accountDeletion.button", "删除账户")}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => void handleDeleteAccount()}
        title={t("accountDeletion.confirmTitle", "确认删除你的账户？")}
        message={t(
          "accountDeletion.confirmMessage",
          "这会永久删除你的账号及相关数据，并立即退出当前登录。此操作不可撤销。"
        )}
        confirmText={t("accountDeletion.confirmButton", "永久删除")}
        type="error"
        loading={isDeletingAccount}
      />
    </>
  );
};

export default UserProfile;
