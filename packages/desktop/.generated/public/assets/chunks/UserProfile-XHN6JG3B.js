import {
  deleteUserAcrossServers
} from "/public/assets/chunks/chunk-IA3XQPBZ.js";
import {
  USER_EMAIL_PREFERENCE_ENDPOINTS
} from "/public/assets/chunks/chunk-7QRUURKO.js";
import {
  LanguageSwitcher_default
} from "/public/assets/chunks/chunk-U7OT52AE.js";
import "/public/assets/chunks/chunk-PE7D2KFT.js";
import {
  ConfirmModal
} from "/public/assets/chunks/chunk-EPKZ4DTY.js";
import {
  require_browser
} from "/public/assets/chunks/chunk-2CATDSNY.js";
import "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import "/public/assets/chunks/chunk-CXTRCW5J.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import {
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  buildDatabaseFileContentUrl,
  createUserKey,
  patch,
  read,
  readAndWait,
  readFileContent,
  selectById,
  selectCurrentToken,
  selectCurrentUser,
  selectRemoteServer,
  selectRemoteServers,
  signOut,
  toast,
  upload
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCheck,
  LuClipboard,
  LuClipboardCheck,
  LuExternalLink,
  LuGlobe,
  LuKeyRound,
  LuMail,
  LuPencil,
  LuTriangleAlert,
  LuUser,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/settings/web/UserProfile.tsx
var import_react3 = __toESM(require_react());

// packages/auth/hooks/useDeleteOwnAccountFlow.ts
var import_react2 = __toESM(require_react(), 1);

// packages/auth/hooks/useDeleteOwnAccount.ts
var import_react = __toESM(require_react(), 1);
var import_pino = __toESM(require_browser(), 1);
var logger = (0, import_pino.default)({ name: "useDeleteOwnAccount" });
function useDeleteOwnAccount(onSuccess) {
  const servers = useAppSelector(selectRemoteServers);
  const token = useAppSelector(selectCurrentToken);
  const currentUser = useAppSelector(selectCurrentUser);
  return (0, import_react.useCallback)(async () => {
    if (!servers.length || !token || !currentUser?.userId) {
      const error = new Error("Missing remote servers, token, or current user");
      logger.error({ err: error }, "Delete own account failed before request");
      throw error;
    }
    try {
      logger.info({ userId: currentUser.userId, primaryServer: servers[0] }, "Deleting own account");
      const results = await deleteUserAcrossServers({
        servers,
        token,
        userId: currentUser.userId
      });
      const replicaFailures = results.filter((result) => !result.required && !result.ok);
      if (replicaFailures.length > 0) {
        logger.warn(
          { userId: currentUser.userId, results: replicaFailures },
          "Own account deletion skipped failed replica servers"
        );
      }
      logger.info({ userId: currentUser.userId }, "Own account deleted");
      onSuccess?.();
    } catch (err) {
      logger.error(
        { err, userId: currentUser.userId, results: err?.results },
        "Delete own account failed"
      );
      throw err;
    }
  }, [currentUser?.userId, onSuccess, servers, token]);
}

// packages/auth/hooks/useDeleteOwnAccountFlow.ts
function useDeleteOwnAccountFlow({
  afterSignOut,
  onDeleteSucceeded,
  onDeleteFailed,
  onLocalCleanupFailed
}) {
  const dispatch = useAppDispatch();
  const deleteOwnAccount = useDeleteOwnAccount();
  const [isDeletingAccount, setIsDeletingAccount] = (0, import_react2.useState)(false);
  const deleteAccount = (0, import_react2.useCallback)(async () => {
    if (isDeletingAccount) {
      return false;
    }
    let deletionSucceeded = false;
    setIsDeletingAccount(true);
    try {
      await deleteOwnAccount();
      deletionSucceeded = true;
      onDeleteSucceeded?.();
      await dispatch(signOut()).unwrap();
      afterSignOut();
      return true;
    } catch (error) {
      if (deletionSucceeded) {
        onLocalCleanupFailed?.(error);
        afterSignOut();
        return true;
      }
      onDeleteFailed?.(error);
      return false;
    } finally {
      setIsDeletingAccount(false);
    }
  }, [
    afterSignOut,
    deleteOwnAccount,
    dispatch,
    isDeletingAccount,
    onDeleteFailed,
    onDeleteSucceeded,
    onLocalCleanupFailed
  ]);
  return {
    deleteAccount,
    isDeletingAccount
  };
}

// packages/app/settings/web/UserProfile.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var EditableProfileItem = ({ icon, label, value, onSave, placeholder }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = (0, import_react3.useState)(false);
  const [tempValue, setTempValue] = (0, import_react3.useState)(value || "");
  const [isSaving, setIsSaving] = (0, import_react3.useState)(false);
  (0, import_react3.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "profile-item-icon", children: icon }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-label", children: label }),
        isEditing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            autoFocus: true,
            className: "profile-item-input",
            value: tempValue,
            onChange: (e) => setTempValue(e.target.value),
            onKeyDown: (e) => e.key === "Enter" && handleSave(),
            placeholder,
            disabled: isSaving
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-value", children: value || placeholder || t("userProfile.profileItem.notSet", "\u672A\u8BBE\u7F6E") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "profile-item-actions", children: isEditing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "action-btn save",
          onClick: handleSave,
          disabled: isSaving,
          title: t("userProfile.profileItem.save", "\u4FDD\u5B58"),
          "aria-label": t("userProfile.profileItem.save", "\u4FDD\u5B58"),
          children: isSaving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "spinner-small", "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 18, "aria-hidden": "true" })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "action-btn cancel",
          onClick: () => setIsEditing(false),
          disabled: isSaving,
          title: t("userProfile.profileItem.cancel", "\u53D6\u6D88"),
          "aria-label": t("userProfile.profileItem.cancel", "\u53D6\u6D88"),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 18, "aria-hidden": "true" })
        }
      )
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "action-btn",
        onClick: () => setIsEditing(true),
        title: t("userProfile.profileItem.edit", "\u7F16\u8F91"),
        "aria-label": t("userProfile.profileItem.edit", "\u7F16\u8F91"),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPencil, { size: 18, "aria-hidden": "true" })
      }
    ) })
  ] });
};
var StaticProfileItem = ({ icon, label, value, isCopyable = false }) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = (0, import_react3.useState)(false);
  const handleCopy = () => {
    if (!value) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2e3);
    }
  };
  const copyLabel = isCopied ? t("userProfile.profileItem.copied", "\u5DF2\u590D\u5236") : t("userProfile.profileItem.copy", "\u590D\u5236");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "profile-item-icon", children: icon }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-label", children: label }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-value", children: value || "N/A" })
      ] })
    ] }),
    isCopyable && value && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        onClick: handleCopy,
        className: `action-btn ${isCopied ? "copied" : ""}`,
        title: copyLabel,
        "aria-label": copyLabel,
        children: isCopied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClipboardCheck, { size: 18, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClipboard, { size: 18, "aria-hidden": "true" })
      }
    )
  ] });
};
var UserProfile = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentServer = useAppSelector(selectRemoteServer);
  const currentToken = useToken();
  const userId = user?.userId;
  const profileKey = (0, import_react3.useMemo)(() => userId ? createUserKey.profile(userId) : null, [userId]);
  const [emailPrefs, setEmailPrefs] = (0, import_react3.useState)({
    emailOptOutAll: false,
    emailMutedUntil: 0,
    emailOptOutTags: []
  });
  const [emailPrefsLoading, setEmailPrefsLoading] = (0, import_react3.useState)(false);
  const [emailPrefsSaving, setEmailPrefsSaving] = (0, import_react3.useState)(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = (0, import_react3.useState)(false);
  const {
    deleteAccount,
    isDeletingAccount
  } = useDeleteOwnAccountFlow({
    afterSignOut: () => navigate("/"),
    onDeleteSucceeded: () => {
      toast.success(t("accountDeletion.success", "\u4F60\u7684\u8D26\u53F7\u5DF2\u88AB\u5220\u9664\u3002"));
    },
    onDeleteFailed: () => {
      toast.error(t("accountDeletion.failed", "\u5220\u9664\u8D26\u53F7\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002"));
    },
    onLocalCleanupFailed: (error) => {
      console.error("Failed to clear local session after account deletion", error);
    }
  });
  (0, import_react3.useEffect)(() => {
    if (profileKey) dispatch(read({ dbKey: profileKey }));
  }, [profileKey, dispatch]);
  (0, import_react3.useEffect)(() => {
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
              Authorization: `Bearer ${currentToken}`
            }
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setEmailPrefs({
          emailOptOutAll: Boolean(data?.emailOptOutAll),
          emailMutedUntil: Number(data?.emailMutedUntil || 0),
          emailOptOutTags: Array.isArray(data?.emailOptOutTags) ? data.emailOptOutTags : []
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
  const profile = useAppSelector(
    (state) => profileKey ? selectById(state, profileKey) : null
  );
  const [avatarPreview, setAvatarPreview] = (0, import_react3.useState)(null);
  const avatarObjectUrlRef = (0, import_react3.useRef)(null);
  const cleanupObjectUrl = () => {
    if (avatarObjectUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }
    avatarObjectUrlRef.current = null;
  };
  (0, import_react3.useEffect)(() => {
    const fileId = profile?.avatarFileId || profile?.avatar;
    if (!fileId) return;
    let cancelled = false;
    const loadAvatar = async () => {
      try {
        if (fileId.startsWith("http") || fileId.startsWith("blob:") || fileId.includes("/")) {
          setAvatarPreview(fileId);
          return;
        }
        const result = await dispatch(readFileContent({ fileId, useServerFallback: true })).unwrap();
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
    return () => {
      cancelled = true;
    };
  }, [profile?.avatarFileId, profile?.avatar, currentServer, dispatch]);
  const handleUpdateField = async (field, newValue) => {
    if (!profileKey) return;
    try {
      await dispatch(patch({ dbKey: profileKey, changes: { [field]: newValue } })).unwrap();
      toast.success(t("userProfile.saveSuccess", "\u4FDD\u5B58\u6210\u529F"));
    } catch {
      toast.error(t("userProfile.saveFailed", "\u4FDD\u5B58\u5931\u8D25"));
    }
  };
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.userId || !profileKey) return;
    const localUrl = URL.createObjectURL(file);
    cleanupObjectUrl();
    avatarObjectUrlRef.current = localUrl;
    setAvatarPreview(localUrl);
    try {
      const metadata = await dispatch(upload({ file, customKey: `avatar-${user.userId}`, userId: user.userId })).unwrap();
      if (metadata?.id) {
        await dispatch(readAndWait(profileKey)).unwrap();
        await dispatch(patch({ dbKey: profileKey, changes: { avatarFileId: metadata.id } })).unwrap();
        toast.success(t("userProfile.uploadSuccess", "\u5934\u50CF\u5DF2\u66F4\u65B0"));
      }
    } catch {
      toast.error(t("userProfile.uploadFailed", "\u4E0A\u4F20\u5931\u8D25"));
    }
  };
  const handleUpdateEmailPrefs = async (changes) => {
    if (!currentServer || !currentToken) return;
    setEmailPrefsSaving(true);
    try {
      const res = await fetch(
        `${currentServer}${USER_EMAIL_PREFERENCE_ENDPOINTS.update.path}`,
        {
          method: USER_EMAIL_PREFERENCE_ENDPOINTS.update.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`
          },
          body: JSON.stringify(changes)
        }
      );
      if (!res.ok) {
        throw new Error("update_email_preferences_failed");
      }
      const data = await res.json();
      setEmailPrefs({
        emailOptOutAll: Boolean(data?.emailOptOutAll),
        emailMutedUntil: Number(data?.emailMutedUntil || 0),
        emailOptOutTags: Array.isArray(data?.emailOptOutTags) ? data.emailOptOutTags : []
      });
      toast.success(t("userProfile.saveSuccess", "\u4FDD\u5B58\u6210\u529F"));
    } catch {
      toast.error(t("userProfile.saveFailed", "\u4FDD\u5B58\u5931\u8D25"));
    } finally {
      setEmailPrefsSaving(false);
    }
  };
  const handleDeleteAccount = async () => {
    if (!userId) {
      toast.error(
        t("accountDeletion.failed", "\u5220\u9664\u8D26\u53F7\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002")
      );
      return;
    }
    try {
      await deleteAccount();
    } finally {
      setIsDeleteConfirmOpen(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "user-profile-page", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("userProfile.title", "\u8D26\u53F7\u8BBE\u7F6E") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "avatar-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "avatar-preview", children: avatarPreview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: avatarPreview, alt: "Avatar" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUser, { size: 40, "aria-hidden": "true" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "avatar-upload", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "avatar-upload-label", children: t("userProfile.avatar.title", "\u4E2A\u4EBA\u5934\u50CF") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "avatar-upload-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "avatar-upload-button", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "avatar-input", type: "file", accept: "image/*", onChange: handleAvatarChange }),
              t("userProfile.avatar.upload", "\u4E0A\u4F20\u65B0\u5934\u50CF")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "avatar-upload-hint", children: t("userProfile.avatar.supportedFormats", "\u652F\u6301 JPG / PNG / WebP") })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "section-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPencil, { size: 16, "aria-hidden": "true" }),
            t("userProfile.publicProfile", "\u516C\u5F00\u8D44\u6599")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            EditableProfileItem,
            {
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUser, { size: 18, "aria-hidden": "true" }),
              label: t("userProfile.nickname.label", "\u6635\u79F0"),
              value: profile?.nickname,
              onSave: (val) => handleUpdateField("nickname", val),
              placeholder: t("userProfile.nickname.placeholder", "\u8D77\u4E2A\u597D\u542C\u7684\u540D\u5B57")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            EditableProfileItem,
            {
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuGlobe, { size: 18, "aria-hidden": "true" }),
              label: t("userProfile.website.label", "\u4E2A\u4EBA\u4E3B\u9875"),
              value: profile?.website,
              onSave: (val) => handleUpdateField("website", val),
              placeholder: "https://..."
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            EditableProfileItem,
            {
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuExternalLink, { size: 18, "aria-hidden": "true" }),
              label: t("userProfile.signature.label", "\u4E2A\u6027\u7B7E\u540D"),
              value: profile?.bio || profile?.signature,
              onSave: (val) => handleUpdateField("bio", val),
              placeholder: t("userProfile.signature.placeholder", "\u4ECB\u7ECD\u4E00\u4E0B\u81EA\u5DF1\u5427")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "section-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuKeyRound, { size: 16, "aria-hidden": "true" }),
            t("userProfile.account.title", "\u8D26\u53F7\u8BE6\u60C5")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StaticProfileItem, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUser, { size: 18, "aria-hidden": "true" }), label: t("userProfile.account.username", "\u7528\u6237\u540D"), value: user?.username }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StaticProfileItem, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuKeyRound, { size: 18, "aria-hidden": "true" }), label: t("userProfile.account.userId", "UID"), value: user?.userId, isCopyable: true }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StaticProfileItem, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 18, "aria-hidden": "true" }), label: t("userProfile.account.email", "\u90AE\u4EF6"), value: user?.email, isCopyable: true })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "section-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuGlobe, { size: 16, "aria-hidden": "true" }),
            t("userProfile.language", "\u663E\u793A\u8BED\u8A00")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LanguageSwitcher_default, {})
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "section-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 16, "aria-hidden": "true" }),
            t("userProfile.emailPreferences", "\u90AE\u4EF6\u504F\u597D")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-main", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "profile-item-icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 18, "aria-hidden": "true" }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-content", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-label", children: t("userProfile.emailAllSwitch", "\u901A\u77E5\u603B\u5F00\u5173") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-value", children: emailPrefs.emailOptOutAll ? t("userProfile.emailDisabled", "\u5DF2\u5173\u95ED\u6240\u6709\u90AE\u4EF6") : t("userProfile.emailEnabled", "\u5DF2\u5F00\u542F\u90AE\u4EF6\u901A\u77E5") })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "profile-item-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "action-btn text-btn",
                disabled: emailPrefsLoading || emailPrefsSaving,
                onClick: () => handleUpdateEmailPrefs({ emailOptOutAll: !emailPrefs.emailOptOutAll }),
                children: emailPrefs.emailOptOutAll ? t("userProfile.enable", "\u5F00\u542F") : t("userProfile.disable", "\u5173\u95ED")
              }
            ) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-main", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "profile-item-icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuKeyRound, { size: 18, "aria-hidden": "true" }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-content", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-label", children: t("userProfile.emailMuteUntil", "\u9759\u9ED8\u5230\u671F\u65F6\u95F4") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-value", children: emailPrefs.emailMutedUntil ? new Date(emailPrefs.emailMutedUntil).toLocaleString() : t("userProfile.notMuted", "\u672A\u9759\u9ED8") })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-actions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: "action-btn text-btn",
                  disabled: emailPrefsLoading || emailPrefsSaving,
                  onClick: () => handleUpdateEmailPrefs({ muteForDays: 3 }),
                  children: t("userProfile.mute3Days", "\u9759\u9ED83\u5929")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: "action-btn text-btn",
                  disabled: emailPrefsLoading || emailPrefsSaving,
                  onClick: () => handleUpdateEmailPrefs({ clearMute: true }),
                  children: t("userProfile.clearMute", "\u53D6\u6D88\u9759\u9ED8")
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            EditableProfileItem,
            {
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClipboard, { size: 18, "aria-hidden": "true" }),
              label: t("userProfile.emailOptOutTags.label", "\u9000\u8BA2\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF09"),
              value: emailPrefs.emailOptOutTags.join(","),
              onSave: async (value) => {
                const tags = value.split(",").map((tag) => asTrimmedLowercaseString(tag)).filter(Boolean);
                await handleUpdateEmailPrefs({ emailOptOutTags: tags });
              },
              placeholder: t("userProfile.emailOptOutTags.placeholder", "reengagement,onboarding-guide")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "section-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTriangleAlert, { size: 16, "aria-hidden": "true" }),
            t("accountDeletion.sectionTitle", "\u5371\u9669\u64CD\u4F5C")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "danger-zone", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "danger-zone-main", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "danger-zone-icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTriangleAlert, { size: 20, "aria-hidden": "true" }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "danger-zone-copy", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "danger-zone-title", children: t("accountDeletion.title", "\u5220\u9664\u8D26\u6237") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "danger-zone-desc", children: t(
                  "accountDeletion.description",
                  "\u5220\u9664\u540E\u5C06\u6C38\u4E45\u79FB\u9664\u4F60\u7684\u8D26\u53F7\u53CA\u76F8\u5173\u6570\u636E\uFF0C\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002"
                ) })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Button_default,
              {
                variant: "danger",
                size: "small",
                loading: isDeletingAccount,
                disabled: !userId,
                onClick: () => setIsDeleteConfirmOpen(true),
                children: t("accountDeletion.button", "\u5220\u9664\u8D26\u6237")
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ConfirmModal,
      {
        isOpen: isDeleteConfirmOpen,
        onClose: () => setIsDeleteConfirmOpen(false),
        onConfirm: () => void handleDeleteAccount(),
        title: t("accountDeletion.confirmTitle", "\u786E\u8BA4\u5220\u9664\u4F60\u7684\u8D26\u6237\uFF1F"),
        message: t(
          "accountDeletion.confirmMessage",
          "\u8FD9\u4F1A\u6C38\u4E45\u5220\u9664\u4F60\u7684\u8D26\u53F7\u53CA\u76F8\u5173\u6570\u636E\uFF0C\u5E76\u7ACB\u5373\u9000\u51FA\u5F53\u524D\u767B\u5F55\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002"
        ),
        confirmText: t("accountDeletion.confirmButton", "\u6C38\u4E45\u5220\u9664"),
        type: "error",
        loading: isDeletingAccount
      }
    )
  ] });
};
var UserProfile_default = UserProfile;
export {
  UserProfile_default as default
};
