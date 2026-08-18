import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import {
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  authRoutes,
  buildPersistentAuthTokenPayload,
  generateKeyPairFromSeedV1,
  hashPasswordV1,
  parseToken,
  replaceCurrentToken,
  selectRemoteServer,
  signToken,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuClock3
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
import {
  asOptionalFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
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

// packages/app/settings/web/SecuritySettings.tsx
var import_react = __toESM(require_react());

// packages/app/settings/web/userSecurityUtils.ts
var buildRecentAccessFlags = (recentAccesses) => {
  const seenLaterEntries = /* @__PURE__ */ new Set();
  return recentAccesses.map((entry) => {
    const fingerprint = `${entry.device}__${entry.ip}`;
    const isNew = !seenLaterEntries.has(fingerprint);
    seenLaterEntries.add(fingerprint);
    return {
      ...entry,
      isNew
    };
  });
};

// packages/app/settings/web/SecuritySettings.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var formatSecurityTime = (value, fallback) => {
  if (value == null || value === "") return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString();
};
var SecurityStatItem = ({ icon, label, value }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "profile-item", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-main", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "profile-item-icon", children: icon }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "profile-item-content", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-label", children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-value", children: value })
  ] })
] }) });
var SecuritySettings = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentServer = useAppSelector(selectRemoteServer);
  const currentToken = useToken();
  const userId = user?.userId;
  const [securityInfo, setSecurityInfo] = (0, import_react.useState)({
    lastLoginAt: null,
    lastActiveAt: null,
    recentAccesses: [],
    locale: "",
    publicKey: ""
  });
  const [securityLoading, setSecurityLoading] = (0, import_react.useState)(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = (0, import_react.useState)(false);
  const [revokePassword, setRevokePassword] = (0, import_react.useState)("");
  const [isRevokingSessions, setIsRevokingSessions] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
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
              Authorization: `Bearer ${currentToken}`
            }
          }
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setSecurityInfo({
          lastLoginAt: data?.lastLoginAt,
          lastActiveAt: data?.lastActiveAt,
          recentAccesses: Array.isArray(data?.recentAccesses) ? data.recentAccesses : [],
          locale: typeof data?.locale === "string" ? data.locale : "",
          publicKey: typeof data?.publicKey === "string" ? data.publicKey : ""
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
  const flaggedRecentAccesses = (0, import_react.useMemo)(
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
      toast.error(t("accountSecurity.revokeFailed", "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002"));
      return;
    }
    if (!revokePassword) {
      toast.error(
        t("accountSecurity.currentPasswordRequired", "\u8BF7\u8F93\u5165\u5F53\u524D\u5BC6\u7801\u540E\u518D\u7EE7\u7EED\u3002")
      );
      return;
    }
    const locale = securityInfo.locale;
    if (!locale) {
      toast.error(
        t(
          "accountSecurity.revokeMissingLocale",
          "\u5F53\u524D\u8D26\u53F7\u7F3A\u5C11\u767B\u5F55\u73AF\u5883\u4FE1\u606F\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u518D\u8BD5\u3002"
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
            tokenVersion: typeof currentTokenPayload?.tokenVersion === "number" ? Math.max(0, Math.floor(currentTokenPayload.tokenVersion)) : 0
          },
          Math.floor(Date.now() / 1e3)
        ),
        secretKey
      );
      const response = await fetch(
        `${currentServer}${authRoutes.users.sessionRevoke.createPath()}`,
        {
          method: authRoutes.users.sessionRevoke.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`
          },
          body: JSON.stringify({ verificationToken })
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
            )
          },
          Math.floor(Date.now() / 1e3)
        ),
        secretKey
      );
      try {
        await dispatch(replaceCurrentToken({ token: nextToken })).unwrap();
      } catch {
        throw new Error("replace_token_failed");
      }
      setRevokePassword("");
      setIsRevokeModalOpen(false);
      toast.success(
        t(
          "accountSecurity.revokeSuccess",
          "\u5DF2\u8E22\u6389\u5176\u4ED6\u8BBE\u5907\uFF0C\u5E76\u4E3A\u5F53\u524D\u8BBE\u5907\u66F4\u65B0\u4E86\u65B0\u7684\u767B\u5F55\u51ED\u8BC1\u3002"
        )
      );
    } catch (error) {
      const isWrongPassword = error instanceof Error && error.message === "wrong_password";
      const isReplaceTokenFailed = error instanceof Error && error.message === "replace_token_failed";
      toast.error(
        isWrongPassword ? t("accountSecurity.revokeWrongPassword", "\u5F53\u524D\u5BC6\u7801\u4E0D\u6B63\u786E\uFF0C\u8BF7\u91CD\u8BD5\u3002") : isReplaceTokenFailed ? t(
          "accountSecurity.revokeReplaceTokenFailed",
          "\u65E7\u8BBE\u5907\u5DF2\u88AB\u8E22\u6389\uFF0C\u4F46\u5F53\u524D\u8BBE\u5907\u4FDD\u5B58\u65B0 token \u5931\u8D25\u3002\u8BF7\u7ACB\u5373\u5237\u65B0\u9875\u9762\u5E76\u91CD\u65B0\u767B\u5F55\u3002"
        ) : t("accountSecurity.revokeFailed", "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002")
      );
    } finally {
      setIsRevokingSessions(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "user-profile-page", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("accountSecurity.title", "\u8D26\u53F7\u5B89\u5168") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "security-panel__desc", children: t(
        "accountSecurity.panelDescription",
        "\u67E5\u770B\u6700\u8FD1\u767B\u5F55\u4E0E\u8BBF\u95EE\u75D5\u8FF9\uFF0C\u5E2E\u52A9\u4F60\u66F4\u65E9\u53D1\u73B0\u5F02\u5E38\u8BBE\u5907\u6216\u964C\u751F IP\u3002"
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "security-panel", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "security-panel__stats", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            SecurityStatItem,
            {
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock3, { size: 18, "aria-hidden": "true" }),
              label: t("accountSecurity.lastLoginAt", "\u6700\u8FD1\u767B\u5F55"),
              value: formatSecurityTime(
                securityInfo.lastLoginAt,
                t("accountSecurity.notAvailable", "\u6682\u65E0\u8BB0\u5F55")
              )
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            SecurityStatItem,
            {
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock3, { size: 18, "aria-hidden": "true" }),
              label: t("accountSecurity.lastActiveAt", "\u6700\u8FD1\u6D3B\u8DC3"),
              value: formatSecurityTime(
                securityInfo.lastActiveAt,
                t("accountSecurity.notAvailable", "\u6682\u65E0\u8BB0\u5F55")
              )
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "security-panel__activity", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "security-panel__section-heading", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "security-panel__section-title", children: t("accountSecurity.recentActivity", "\u6700\u8FD1\u8BBF\u95EE\u6D3B\u52A8") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "security-panel__section-hint", children: t(
              "accountSecurity.recentActivityHint",
              "\u8FD9\u91CC\u4F1A\u5C55\u793A\u6700\u8FD1\u767B\u5F55\u548C\u5DF2\u8BA4\u8BC1\u8BBF\u95EE\u7684\u8BBE\u5907\u6458\u8981\uFF0C\u5E2E\u52A9\u4F60\u53D1\u73B0\u5F02\u5E38\u6D3B\u52A8\u3002"
            ) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "security-activity-list", children: securityLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "security-activity-empty", children: t("loading", "\u52A0\u8F7D\u4E2D...") }) : flaggedRecentAccesses.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "security-activity-empty", children: t("accountSecurity.noRecentActivity", "\u8FD8\u6CA1\u6709\u6700\u8FD1\u8BBF\u95EE\u6D3B\u52A8\u8BB0\u5F55\u3002") }) : flaggedRecentAccesses.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              className: `security-activity-item ${entry.isNew ? "security-activity-item--new" : ""}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "security-activity-item__main", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "security-activity-item__headline", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "security-activity-item__device", children: entry.device }),
                    entry.isNew && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "security-activity-item__badge", children: t("accountSecurity.newAccess", "\u65B0\u8BBF\u95EE") })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "security-activity-item__meta", children: [
                    entry.ip,
                    " \xB7",
                    " ",
                    entry.source === "login" ? t("accountSecurity.sourceLogin", "\u767B\u5F55") : t("accountSecurity.sourceToken", "\u5DF2\u8BA4\u8BC1\u8BBF\u95EE")
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "security-activity-item__time", children: formatSecurityTime(
                  entry.timestamp,
                  t("accountSecurity.notAvailable", "\u6682\u65E0\u8BB0\u5F55")
                ) })
              ]
            },
            `${entry.timestamp}-${entry.source}-${entry.ip}-${entry.device}`
          )) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "security-action-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "security-action-card__copy", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-label", children: t("accountSecurity.revokeTitle", "\u53D1\u73B0\u5F02\u5E38\uFF1F\u8E22\u6389\u6240\u6709\u5176\u4ED6\u8BBE\u5907") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profile-item-subtext", children: t(
              "accountSecurity.revokeDescription",
              "\u8F93\u5165\u5F53\u524D\u5BC6\u7801\u540E\uFF0C\u6240\u6709\u65E7 token \u4F1A\u7ACB\u523B\u5931\u6548\u3002\u5F53\u524D\u8BBE\u5907\u4F1A\u81EA\u52A8\u6362\u6210\u65B0\u7684 token\uFF0C\u5176\u5B83\u8BBE\u5907\u4F1A\u88AB\u9000\u51FA\u3002"
            ) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              variant: "danger",
              size: "small",
              disabled: !userId || securityLoading,
              onClick: () => setIsRevokeModalOpen(true),
              children: t("accountSecurity.revokeButton", "\u8E22\u6389\u6240\u6709\u5176\u4ED6\u8BBE\u5907")
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Dialog,
      {
        isOpen: isRevokeModalOpen,
        onClose: handleCloseRevokeModal,
        title: t("accountSecurity.revokeModalTitle", "\u8E22\u6389\u6240\u6709\u5176\u4ED6\u8BBE\u5907"),
        status: "warning",
        width: 440,
        onEnterPress: () => void handleRevokeSessions(),
        isActionDisabled: isRevokingSessions,
        actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              variant: "secondary",
              size: "small",
              disabled: isRevokingSessions,
              onClick: handleCloseRevokeModal,
              children: t("cancel", "\u53D6\u6D88")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              variant: "danger",
              size: "small",
              loading: isRevokingSessions,
              disabled: isRevokingSessions,
              onClick: () => void handleRevokeSessions(),
              children: t("accountSecurity.revokeConfirmButton", "\u786E\u8BA4\u8E22\u6389\u5E76\u66F4\u65B0 token")
            }
          )
        ] }),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "security-revoke-modal", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "security-revoke-modal__hint", children: t(
            "accountSecurity.revokeModalHint",
            "\u5982\u679C\u4F60\u6000\u7591\u8D26\u53F7\u5DF2\u5728\u964C\u751F\u8BBE\u5907\u767B\u5F55\uFF0C\u53EF\u4EE5\u7ACB\u5373\u8BA9\u6240\u6709\u65E7 token \u5931\u6548\u3002\u4E3A\u4E86\u4FDD\u7559\u5F53\u524D\u8BBE\u5907\u767B\u5F55\uFF0C\u9700\u8981\u5148\u9A8C\u8BC1\u4E00\u6B21\u5F53\u524D\u5BC6\u7801\u3002"
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "label",
            {
              className: "security-revoke-modal__label",
              htmlFor: "security-revoke-password",
              children: t("accountSecurity.currentPasswordLabel", "\u5F53\u524D\u5BC6\u7801")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: "security-revoke-password",
              className: "security-revoke-modal__input",
              type: "password",
              autoComplete: "current-password",
              value: revokePassword,
              onChange: (event) => setRevokePassword(event.target.value),
              disabled: isRevokingSessions,
              placeholder: t(
                "accountSecurity.currentPasswordPlaceholder",
                "\u8F93\u5165\u5F53\u524D\u5BC6\u7801\u540E\u7EE7\u7EED"
              )
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "security-revoke-modal__note", children: t(
            "accountSecurity.revokeModalNote",
            "\u6267\u884C\u540E\uFF0C\u5F53\u524D\u9875\u9762\u4F1A\u5207\u6362\u5230\u65B0 token\uFF1B\u5176\u4F59\u8BBE\u5907\u4E0A\u7684\u65E7\u4F1A\u8BDD\u4F1A\u5728\u4E0B\u4E00\u6B21\u8BF7\u6C42\u65F6\u5931\u6548\u3002"
          ) })
        ] })
      }
    )
  ] });
};
var SecuritySettings_default = SecuritySettings;
export {
  SecuritySettings_default as default
};
