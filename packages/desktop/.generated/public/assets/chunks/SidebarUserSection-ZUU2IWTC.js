import {
  addNotification,
  replaceNotifications,
  useNotificationActions,
  useNotifications,
  useNotificationsHydrated,
  useUnreadNotificationCount
} from "/public/assets/chunks/chunk-VHK6SQ2N.js";
import "/public/assets/chunks/chunk-45KYWPDW.js";
import {
  subscribeSharedSse
} from "/public/assets/chunks/chunk-MLKRBWWR.js";
import {
  QUICK_CHAT_FEEDBACK_LAUNCH_PATH
} from "/public/assets/chunks/chunk-5IOWWQCJ.js";
import {
  useClickOutside
} from "/public/assets/chunks/chunk-3A7A5J6H.js";
import {
  Avatar_default
} from "/public/assets/chunks/chunk-EOM4G5HF.js";
import {
  resolveAvatarUrl
} from "/public/assets/chunks/chunk-NLX7YQL6.js";
import {
  fetchUserDataThunk
} from "/public/assets/chunks/chunk-APUNFOYF.js";
import {
  cacheMergedUserDataThunk
} from "/public/assets/chunks/chunk-GYU2TA6X.js";
import {
  Tooltip
} from "/public/assets/chunks/chunk-WZN2TP6C.js";
import {
  useIsMobile
} from "/public/assets/chunks/chunk-ZQBH52MP.js";
import "/public/assets/chunks/chunk-LKJPGMXH.js";
import {
  DarkModeSwitch
} from "/public/assets/chunks/chunk-LGIWNRAE.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-DMDFFSG6.js";
import {
  mergeAndDedupUserData
} from "/public/assets/chunks/chunk-7PX5UKK4.js";
import {
  SettingRoutePaths
} from "/public/assets/chunks/chunk-UTF6L3FT.js";
import "/public/assets/chunks/chunk-7MYCSSXH.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import {
  useToken,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useLocation,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  API_ENDPOINTS,
  changeUser,
  createNotificationKey,
  createUserKey,
  fetchUserProfile,
  markDialogRead,
  read,
  selectById,
  selectCurrentUserBalance,
  selectRemoteServer,
  selectRuntimeCurrentServer,
  selectRuntimeRemoteServers,
  selectRuntimeSnapshot,
  selectUsers,
  signOut,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuArrowRight,
  LuBell,
  LuChartColumnBig,
  LuCheck,
  LuChevronDown,
  LuCircleX,
  LuClock3,
  LuCoins,
  LuDownload,
  LuFlag,
  LuGift,
  LuLink,
  LuLoaderCircle,
  LuLogIn,
  LuLogOut,
  LuPlus,
  LuSettings,
  LuShare2,
  LuUser,
  LuUserPlus,
  LuUsers
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
import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
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

// packages/chat/web/sidebar/SidebarUserSection.tsx
var import_react3 = __toESM(require_react());
var import_react_dom = __toESM(require_react_dom());

// packages/app/hooks/useUserNotifications.ts
var import_react = __toESM(require_react());

// packages/app/notifications/model.ts
var NOTIFICATION_LIMIT = 100;
var createNotificationRecord = ({
  userId,
  notificationId,
  kind,
  createdAt,
  updatedAt = createdAt,
  href,
  spaceId,
  dialogId,
  sourceUserId,
  readAt,
  archivedAt,
  payload
}) => ({
  dbKey: createNotificationKey.single(userId, notificationId),
  type: "notification" /* NOTIFICATION */,
  userId,
  notificationId,
  kind,
  createdAt,
  updatedAt,
  ...href ? { href } : {},
  ...spaceId ? { spaceId } : {},
  ...dialogId ? { dialogId } : {},
  ...sourceUserId ? { sourceUserId } : {},
  ...typeof readAt === "number" ? { readAt } : {},
  ...typeof archivedAt === "number" ? { archivedAt } : {},
  ...payload ? { payload } : {}
});

// packages/app/notifications/formatNotification.ts
var normalizeNotificationTimestamp = (value) => {
  const asNumber = asOptionalFiniteNumber(value);
  if (asNumber !== void 0) return asNumber;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
};
var getSpaceName = (record) => {
  const candidate = record.payload?.spaceName;
  if (typeof candidate === "string" && candidate.trim()) return candidate;
  return record.spaceId ?? "space";
};
var getDialogTitle = (record, t) => {
  const candidate = record.payload?.dialogTitle;
  if (typeof candidate === "string" && candidate.trim()) return candidate;
  return t("notifications.dialogFallbackTitle", "Conversation");
};
var notificationRecordToAppNotification = (record, t) => {
  const readAt = record.readAt;
  const base = {
    id: record.notificationId,
    kind: record.kind,
    createdAt: normalizeNotificationTimestamp(record.createdAt),
    updatedAt: normalizeNotificationTimestamp(record.updatedAt),
    read: asOptionalFiniteNumber(readAt) !== void 0,
    href: record.href,
    dialogId: record.dialogId,
    spaceId: record.spaceId,
    record
  };
  if (record.kind === "space_member_added") {
    const spaceName2 = getSpaceName(record);
    return {
      ...base,
      title: t("notifications.spaceAddedTitle", "You were added to a space"),
      message: t(
        "notifications.spaceAddedMessage",
        'You were added to "{{spaceName}}"',
        { spaceName: spaceName2 }
      )
    };
  }
  if (record.kind === "agent_notice") {
    const title = record.payload?.title;
    const message = record.payload?.message;
    return {
      ...base,
      title: typeof title === "string" && title.trim() ? title : t("notifications.agentNoticeTitle", "Agent notice"),
      message: typeof message === "string" && message.trim() ? message : t("notifications.agentNoticeMessage", "Your agent sent a notice")
    };
  }
  const dialogTitle = getDialogTitle(record, t);
  const spaceName = typeof record.payload?.spaceName === "string" && record.payload.spaceName.trim() ? record.payload.spaceName : null;
  if (record.kind === "dialog_failed") {
    return {
      ...base,
      title: t("notifications.dialogFailedTitle", "Agent run failed"),
      message: spaceName ? t(
        "notifications.dialogFailedMessageWithSpace",
        '"{{title}}" failed in "{{spaceName}}"',
        { title: dialogTitle, spaceName }
      ) : t(
        "notifications.dialogFailedMessage",
        '"{{title}}" failed',
        { title: dialogTitle }
      )
    };
  }
  return {
    ...base,
    title: t("notifications.dialogDoneTitle", "Agent run finished"),
    message: spaceName ? t(
      "notifications.dialogDoneMessageWithSpace",
      '"{{title}}" finished in "{{spaceName}}"',
      { title: dialogTitle, spaceName }
    ) : t(
      "notifications.dialogDoneMessage",
      '"{{title}}" finished',
      { title: dialogTitle }
    )
  };
};

// packages/app/hooks/useUserNotifications.ts
var isNotificationRecord = (value) => {
  return !!value && typeof value === "object" && typeof value.notificationId === "string" && typeof value.userId === "string" && typeof value.dbKey === "string" && typeof value.kind === "string";
};
var isNotificationEventPayload = (value) => value.type === "notification.upsert" && isNotificationRecord(value.notification);
var loadRemoteNotifications = async ({
  serverOrigin,
  token
}) => {
  const response = await fetch(
    `${serverOrigin}/api/notifications?limit=${NOTIFICATION_LIMIT}`,
    {
      headers: {
        Accept: "application/json",
        ...token ? { Authorization: `Bearer ${token}` } : {}
      }
    }
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return { data: { data: [] } };
    }
    throw new Error(`Failed to load notifications from ${serverOrigin}`);
  }
  const json = await response.json();
  const data = Array.isArray(json.data) ? json.data.map((record) => ({ ...record, serverOrigin })) : [];
  return { data: { data } };
};
var buildLegacySpaceMemberRecord = (event) => {
  const notificationId = typeof event.notificationId === "string" ? event.notificationId : null;
  const spaceId = typeof event.spaceId === "string" ? event.spaceId : null;
  const userId = typeof event.memberUserId === "string" ? event.memberUserId : null;
  if (!notificationId || !spaceId || !userId) return null;
  const createdAt = normalizeNotificationTimestamp(event.createdAt);
  return createNotificationRecord({
    userId,
    notificationId,
    kind: "space_member_added",
    createdAt,
    updatedAt: createdAt,
    href: `/space/${encodeURIComponent(spaceId)}`,
    spaceId,
    sourceUserId: typeof event.addedByUserId === "string" ? event.addedByUserId : void 0,
    payload: {
      role: event.role,
      spaceName: typeof event.spaceName === "string" ? event.spaceName : spaceId
    }
  });
};
var hydrateInFlight = null;
function useUserNotifications() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { currentServer, currentToken, currentUserId } = useAppSelector(selectRuntimeSnapshot);
  const remoteServers = useAppSelector(selectRuntimeRemoteServers);
  const hydrated = useNotificationsHydrated();
  const hydrateNotifications = (0, import_react.useCallback)(async () => {
    if (!currentUserId) {
      replaceNotifications([]);
      return Promise.resolve();
    }
    if (hydrated) return Promise.resolve();
    if (hydrateInFlight) return hydrateInFlight;
    hydrateInFlight = (async () => {
      const localRecords = await dispatch(
        fetchUserDataThunk({
          types: "notification" /* NOTIFICATION */,
          userId: currentUserId
        })
      ).unwrap();
      const remoteResults = await Promise.all(
        remoteServers.map(
          (serverOrigin) => loadRemoteNotifications({ serverOrigin, token: currentToken }).catch(
            (error) => {
              console.warn(
                "[notifications] failed to load remote notifications",
                serverOrigin,
                error
              );
              return { data: { data: [] } };
            }
          )
        )
      );
      const merged = mergeAndDedupUserData(localRecords, remoteResults).filter(isNotificationRecord).sort(
        (left, right) => normalizeNotificationTimestamp(right.updatedAt) - normalizeNotificationTimestamp(left.updatedAt)
      ).slice(0, NOTIFICATION_LIMIT);
      if (merged.length > 0) {
        await dispatch(
          cacheMergedUserDataThunk({ records: merged })
        ).unwrap();
      }
      replaceNotifications(
        merged.map((record) => notificationRecordToAppNotification(record, t))
      );
    })().finally(() => {
      hydrateInFlight = null;
    });
  }, [currentToken, currentUserId, dispatch, remoteServers, t, hydrated]);
  (0, import_react.useEffect)(() => {
    void hydrateNotifications().catch((error) => {
      console.warn("[notifications] failed to hydrate notifications", error);
    });
  }, [hydrateNotifications]);
  (0, import_react.useEffect)(() => {
    if (!currentUserId || !currentServer) return;
    const channel = `user-${currentUserId}`;
    const dispose = subscribeSharedSse({
      key: `${currentServer}:${channel}`,
      url: `${currentServer}/api/events/${channel}`,
      headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : void 0,
      onEvent: (event) => {
        let notificationRecord = null;
        if (isNotificationEventPayload(event)) {
          notificationRecord = event.notification;
        } else if (event.type === "space.member_added") {
          notificationRecord = buildLegacySpaceMemberRecord(event);
        }
        if (!notificationRecord) return;
        void (async () => {
          await dispatch(
            cacheMergedUserDataThunk({ records: [notificationRecord] })
          ).unwrap().catch((error) => {
            console.warn(
              "[notifications] failed to cache live notification",
              error
            );
          });
          addNotification(
            notificationRecordToAppNotification(notificationRecord, t)
          );
        })();
      }
    });
    return () => {
      dispose();
    };
  }, [currentServer, currentToken, currentUserId, dispatch, t]);
}

// packages/life/web/InviteRewards.tsx
var import_react2 = __toESM(require_react(), 1);

// packages/auth/invite.ts
var INVITE_REWARD_REASON_PREFIX = "invite_reward_for_";
var parseInviteeIdFromRewardReason = (reason) => reason.startsWith(INVITE_REWARD_REASON_PREFIX) ? reason.slice(INVITE_REWARD_REASON_PREFIX.length) : "";

// packages/life/web/InviteRewards.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var PAGE_LIMIT = 100;
var formatTime = (timestamp) => new Date(timestamp).toLocaleString("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});
var maskInviteeId = (inviteeId) => {
  if (!inviteeId) return "-";
  if (inviteeId.length <= 10) return `${inviteeId.slice(0, 4)}****`;
  return `${inviteeId.slice(0, 6)}****${inviteeId.slice(-4)}`;
};
var InviteRewards = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const token = useToken();
  const userId = useUserId();
  const server = useAppSelector(selectRemoteServer);
  const [records, setRecords] = (0, import_react2.useState)([]);
  const [loading, setLoading] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)(null);
  const inviteLink = (0, import_react2.useMemo)(() => {
    if (!userId) return "";
    const path = `/invite-signup?inviterId=${encodeURIComponent(userId)}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }, [userId]);
  const fetchInviteRewards = (0, import_react2.useCallback)(async () => {
    if (!token || !server) return;
    setLoading(true);
    setError(null);
    try {
      let cursor = null;
      const seenCursors = /* @__PURE__ */ new Set();
      const allRewards = [];
      do {
        const response = await fetch(
          `${server}${API_ENDPOINTS.TRANSACTIONS}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              limit: PAGE_LIMIT,
              cursor
            })
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const pageData = Array.isArray(payload?.data) ? payload.data : [];
        for (const item of pageData) {
          if (item?.type === "recharge" && item?.status === "completed" && typeof item?.reason === "string" && item.reason.startsWith(INVITE_REWARD_REASON_PREFIX)) {
            allRewards.push(item);
          }
        }
        const nextCursor = typeof payload?.nextCursor === "string" && payload.nextCursor ? payload.nextCursor : null;
        if (!nextCursor || seenCursors.has(nextCursor)) {
          cursor = null;
        } else {
          seenCursors.add(nextCursor);
          cursor = nextCursor;
        }
      } while (cursor);
      allRewards.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(allRewards);
    } catch (e) {
      setError(e?.message || t("operationFailed", "\u64CD\u4F5C\u5931\u8D25"));
    } finally {
      setLoading(false);
    }
  }, [server, token, t]);
  (0, import_react2.useEffect)(() => {
    if (isOpen) {
      fetchInviteRewards();
    }
  }, [fetchInviteRewards, isOpen]);
  const invitedCount = (0, import_react2.useMemo)(() => {
    const ids = /* @__PURE__ */ new Set();
    for (const item of records) {
      const inviteeId = parseInviteeIdFromRewardReason(item.reason || "");
      if (inviteeId) ids.add(inviteeId);
    }
    return ids.size;
  }, [records]);
  const totalReward = (0, import_react2.useMemo)(
    () => records.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [records]
  );
  const handleCopyLink = (0, import_react2.useCallback)(async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success(t("inviteLinkCopied", "\u9080\u8BF7\u94FE\u63A5\u5DF2\u590D\u5236"));
    } catch {
      toast.error(t("copyFailed", "\u590D\u5236\u5931\u8D25"));
    }
  }, [inviteLink, t]);
  if (!userId) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, { isOpen, onClose, size: "xlarge", title: t("inviteFriend", "\u9080\u8BF7\u670B\u53CB"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "invite-rewards__hero", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__hero-main", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__badge", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuGift, { size: 14, "aria-hidden": "true" }),
          "\u9080\u8BF7\u6709\u793C"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { className: "invite-rewards__title", children: [
          t("inviteFriend", "\u9080\u8BF7\u670B\u53CB"),
          "\uFF0C\u4E00\u8D77\u62FF\u5956\u52B1"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "invite-rewards__subtitle", children: "\u4F60\u7684\u9080\u8BF7\u94FE\u63A5\u53EF\u76F4\u63A5\u5206\u4EAB\u7ED9\u597D\u53CB\uFF1B\u597D\u53CB\u6CE8\u518C\u6210\u529F\u540E\uFF0C\u7CFB\u7EDF\u81EA\u52A8\u53D1\u653E\u5956\u52B1\u5E76\u8BB0\u5F55\u5230\u4F60\u7684\u4EA4\u6613\u660E\u7EC6\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__link-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__link-shell", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLink, { size: 16, className: "invite-rewards__link-icon", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                className: "invite-rewards__link-input",
                readOnly: true,
                value: inviteLink,
                "aria-label": t("inviteLink", "\u9080\u8BF7\u94FE\u63A5")
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              className: "invite-rewards__cta",
              onClick: handleCopyLink,
              size: "large",
              variant: "primary",
              children: "\u590D\u5236\u9080\u8BF7\u94FE\u63A5"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "invite-rewards__cta-tip", children: t(
          "inviteCtaTip",
          "\u5206\u4EAB\u94FE\u63A5\u540E\uFF0C\u597D\u53CB\u5B8C\u6210\u6CE8\u518C\u5373\u53EF\u81EA\u52A8\u7ED1\u5B9A\u9080\u8BF7\u5173\u7CFB\u5E76\u53D1\u653E\u5956\u52B1\u3002"
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__kpi-grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__kpi-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__kpi-label", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUsers, { size: 16, "aria-hidden": "true" }),
            "\u5DF2\u9080\u8BF7\u4EBA\u6570"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "invite-rewards__kpi-value", children: invitedCount })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__kpi-card invite-rewards__kpi-card--highlight", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__kpi-label", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCoins, { size: 16, "aria-hidden": "true" }),
            "\u7D2F\u8BA1\u9080\u8BF7\u5956\u52B1"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "invite-rewards__kpi-value", children: totalReward.toFixed(2) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__kpi-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__kpi-label", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock3, { size: 16, "aria-hidden": "true" }),
            "\u5956\u52B1\u8BB0\u5F55\u6570"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "invite-rewards__kpi-value", children: records.length })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "invite-rewards__main", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "invite-rewards__panel invite-rewards__records", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__records-toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "invite-rewards__records-title", children: "\u6700\u8FD1\u5956\u52B1\u8BB0\u5F55" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            onClick: fetchInviteRewards,
            size: "small",
            variant: "secondary",
            loading,
            disabled: loading,
            children: "\u5237\u65B0"
          }
        )
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "invite-rewards__notice invite-rewards__notice--error", children: "\u6570\u636E\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002" }),
      !error && records.length === 0 && !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "invite-rewards__notice", children: "\u6682\u65E0\u8BB0\u5F55\uFF0C\u9080\u8BF7\u597D\u53CB\u5373\u53EF\u83B7\u53D6\u5956\u52B1\u3002" }),
      records.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "invite-rewards__table-wrap", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "invite-rewards__table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u65F6\u95F4" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u9080\u8BF7\u7528\u6237" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: { textAlign: "right" }, children: "\u5956\u52B1" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: records.slice(0, 5).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: formatTime(item.timestamp) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-rewards__user-cell", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUsers, { size: 14, opacity: 0.6, "aria-hidden": "true" }),
            maskInviteeId(
              parseInviteeIdFromRewardReason(item.reason || "")
            )
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "invite-rewards__reward-amount", children: [
            "+",
            Number(item.amount || 0).toFixed(2)
          ] })
        ] }, item.txId)) })
      ] }) })
    ] }) })
  ] }) });
};
var InviteRewards_default = InviteRewards;

// packages/chat/web/sidebar/SidebarUserSection.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var getNotificationIcon = (item) => {
  if (item.kind === "agent_notice") return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuBell, { size: 15, "aria-hidden": "true" });
  if (item.kind === "space_member_added") return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuUsers, { size: 15, "aria-hidden": "true" });
  if (item.kind === "dialog_failed") return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCircleX, { size: 15, "aria-hidden": "true" });
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLoaderCircle, { size: 15, "aria-hidden": "true" });
};
var formatNotificationTime = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};
var PortalDropdown = ({ isOpen, anchorRef, children, className, role }) => {
  const [rect, setRect] = (0, import_react3.useState)(null);
  (0, import_react3.useEffect)(() => {
    if (isOpen && anchorRef.current) {
      setRect(anchorRef.current.getBoundingClientRect());
    }
  }, [isOpen, anchorRef]);
  if (!isOpen || !rect) return null;
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        className: `SidebarUserSection__dropdown is-open ${className || ""}`,
        role,
        onPointerDown: (e) => e.stopPropagation(),
        onMouseDown: (e) => e.stopPropagation(),
        onTouchStart: (e) => e.stopPropagation(),
        style: {
          position: "fixed",
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left + 8,
          width: rect.width - 16
        },
        children
      }
    ),
    document.body
  );
};
var SidebarUserSection = () => {
  const { t } = useTranslation(["common", "chat", "space"]);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user: authUser } = useAuth();
  const isMobile = useIsMobile(768);
  const users = useAppSelector(selectUsers);
  const currentUserId = useUserId();
  const balance = useAppSelector(selectCurrentUserBalance);
  const currentServer = useAppSelector(selectRuntimeCurrentServer);
  useUserNotifications();
  const { markAsRead, markAllAsRead } = useNotificationActions();
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const visibleNotifications = (0, import_react3.useMemo)(() => notifications.slice(0, 8), [notifications]);
  const [bellOpen, setBellOpen] = (0, import_react3.useState)(false);
  const [menuOpen, setMenuOpen] = (0, import_react3.useState)(false);
  const [inviteOpen, setInviteOpen] = (0, import_react3.useState)(false);
  const sectionRef = (0, import_react3.useRef)(null);
  const bellContainerRef = (0, import_react3.useRef)(null);
  const menuContainerRef = (0, import_react3.useRef)(null);
  useClickOutside(bellContainerRef, () => setBellOpen(false));
  useClickOutside(menuContainerRef, () => setMenuOpen(false));
  (0, import_react3.useEffect)(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setBellOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  (0, import_react3.useEffect)(() => {
    if (currentUserId) {
      dispatch(fetchUserProfile());
    }
  }, [currentUserId, dispatch]);
  const profileKey = (0, import_react3.useMemo)(
    () => currentUserId ? createUserKey.profile(currentUserId) : null,
    [currentUserId]
  );
  (0, import_react3.useEffect)(() => {
    if (!profileKey) return;
    dispatch(read({ dbKey: profileKey }));
  }, [profileKey, dispatch]);
  const profile = useAppSelector(
    (state) => profileKey ? selectById(state, profileKey) : null
  );
  const avatarUrl = (0, import_react3.useMemo)(() => {
    if (!profile) return null;
    const anyProfile = profile;
    const avatarFromFile = resolveAvatarUrl(anyProfile.avatarFileId, currentServer);
    if (avatarFromFile) return avatarFromFile;
    if (typeof anyProfile.avatar === "string" && anyProfile.avatar.trim()) {
      return anyProfile.avatar;
    }
    return null;
  }, [profile, currentServer]);
  const balanceValue = typeof balance === "number" ? balance : 0;
  const isLoadingBalance = typeof balance !== "number";
  const creditsValue = isLoadingBalance ? "..." : balanceValue.toFixed(2);
  const creditsUnit = t("chat:creditsUnit", "\u79EF\u5206");
  const otherUsers = (0, import_react3.useMemo)(
    () => users.filter((u) => u?.userId && u.userId !== currentUserId),
    [users, currentUserId]
  );
  const handleLoginOther = (0, import_react3.useCallback)(() => navigate("/login"), [navigate]);
  const handleInvite = (0, import_react3.useCallback)(() => setInviteOpen(true), []);
  const handleOpenLifeProfile = (0, import_react3.useCallback)(() => {
    setMenuOpen(false);
    setBellOpen(false);
    navigate("/life");
  }, [navigate]);
  const handleOpenLifeUsage = (0, import_react3.useCallback)(() => {
    setMenuOpen(false);
    setBellOpen(false);
    navigate("/life/usage");
  }, [navigate]);
  const handleFeedback = (0, import_react3.useCallback)(() => {
    setMenuOpen(false);
    setBellOpen(false);
    navigate(QUICK_CHAT_FEEDBACK_LAUNCH_PATH);
  }, [navigate]);
  const handleOpenSettings = (0, import_react3.useCallback)(() => {
    setMenuOpen(false);
    setBellOpen(false);
    navigate(SettingRoutePaths.SETTING, { state: { backgroundLocation: location } });
  }, [navigate, location]);
  const handleLogout = (0, import_react3.useCallback)(() => {
    dispatch(signOut()).unwrap().then(() => navigate("/"));
  }, [dispatch, navigate]);
  const handleOpenNotificationItem = (item) => {
    setBellOpen(false);
    void markAsRead(item);
    if (item.dialogId) {
      dispatch(markDialogRead({ dialogId: item.dialogId }));
    }
    if (item.href) {
      navigate(item.href);
      return;
    }
    navigate("/notifications" /* NOTIFICATIONS */);
  };
  if (!authUser) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "SidebarUserSection", ref: sectionRef, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "SidebarUserSection__row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "SidebarUserSection__card-wrap", ref: menuContainerRef, style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          Tooltip,
          {
            content: t("goToProfile", "\u4E2A\u4EBA\u4E3B\u9875"),
            placement: "top",
            disabled: isMobile,
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                className: "SidebarUserSection__profile",
                onClick: handleOpenLifeProfile,
                "aria-label": t("goToProfile", "\u4E2A\u4EBA\u4E3B\u9875"),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    Avatar_default,
                    {
                      name: authUser.username,
                      type: "user",
                      size: "small",
                      shape: "full",
                      src: avatarUrl || void 0
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "span",
                    {
                      className: "SidebarUserSection__username",
                      title: authUser.email || authUser.username,
                      children: authUser.email || authUser.username
                    }
                  )
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: `SidebarUserSection__menu-toggle ${menuOpen ? "is-open" : ""}`,
            onClick: () => {
              setMenuOpen((prev) => !prev);
              setBellOpen(false);
            },
            "aria-haspopup": "menu",
            "aria-expanded": menuOpen,
            "aria-label": t("accountMenu", "\u8D26\u53F7\u83DC\u5355"),
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              LuChevronDown,
              {
                size: 14,
                className: "SidebarUserSection__menu-toggle-icon",
                "aria-hidden": "true"
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          PortalDropdown,
          {
            isOpen: menuOpen,
            anchorRef: sectionRef,
            className: "SidebarUserSection__dropdown--menu",
            role: "menu",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "topbar-user-menu__header", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-user-menu__username", children: authUser.username }),
                authUser.email && authUser.email !== authUser.username ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-user-menu__email", title: authUser.email, children: authUser.email }) : null,
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "topbar-user-menu__balance-row", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "topbar-user-menu__balance-copy", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "topbar-user-menu__balance-label", children: creditsUnit }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "span",
                      {
                        className: `topbar-user-menu__balance-value ${!isLoadingBalance && balanceValue < 10 ? "is-low" : ""}`,
                        children: creditsValue
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "topbar-user-menu__btn-add",
                      onClick: () => {
                        navigate("/recharge");
                        setMenuOpen(false);
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPlus, { size: 10, strokeWidth: 3, "aria-hidden": "true" }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("recharge", "\u5145\u503C") })
                      ]
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-user-menu__divider" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "topbar-user-menu__list", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "topbar-user-menu__item",
                    onClick: handleOpenLifeUsage,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuChartColumnBig, { size: 14, "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("usage_dashboard", "\u4F7F\u7528\u7EDF\u8BA1") })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "topbar-user-menu__item",
                    onClick: () => {
                      setMenuOpen(false);
                      setBellOpen(false);
                      navigate("/life/shares");
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuShare2, { size: 14, "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("space:myShares.title", "\u6211\u7684\u5206\u4EAB") })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "topbar-user-menu__item",
                    onClick: handleOpenSettings,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSettings, { size: 14, "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("settings.title", "\u8BBE\u7F6E") })
                    ]
                  }
                )
              ] }),
              otherUsers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-user-menu__divider" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-user-menu__list", children: otherUsers.map(
                  (u) => u && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "topbar-user-menu__item",
                      onClick: () => {
                        dispatch(changeUser(u));
                        setMenuOpen(false);
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuUser, { size: 14, "aria-hidden": "true" }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: u.username })
                      ]
                    },
                    u.userId
                  )
                ) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-user-menu__divider" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-user-menu__preferences", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "topbar-user-menu__theme-row", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "topbar-user-menu__theme-label", children: t("settings.appearance.mode.title", "\u6DF1\u8272\u6A21\u5F0F") }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(DarkModeSwitch, { compact: true })
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-user-menu__divider" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "topbar-user-menu__list", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "topbar-user-menu__item",
                    onClick: () => {
                      handleLoginOther();
                      setMenuOpen(false);
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLogIn, { size: 14, "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("loginOtherUser", "\u767B\u5F55\u5176\u4ED6\u7528\u6237") })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "topbar-user-menu__item topbar-user-menu__item--invite",
                    onClick: () => {
                      handleInvite();
                      setMenuOpen(false);
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuUserPlus, { size: 14, "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("inviteFriend", "\u9080\u8BF7\u670B\u53CB") })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "topbar-user-menu__item",
                    onClick: () => {
                      navigate("/downloads");
                      setMenuOpen(false);
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuDownload, { size: 14, "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("downloadClient", "\u4E0B\u8F7D\u5BA2\u6237\u7AEF") })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "topbar-user-menu__item",
                    onClick: handleFeedback,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuFlag, { size: 14, "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("quickChat.chipFeedbackAgent", "\u6211\u60F3\u53CD\u9988") })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-user-menu__divider" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "topbar-user-menu__item topbar-user-menu__item--logout",
                    onClick: handleLogout,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLogOut, { size: 14, "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("logout", "\u767B\u51FA") })
                    ]
                  }
                )
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "SidebarUserSection__actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Tooltip, { content: t("settings.title", "\u8BBE\u7F6E"), placement: "top", disabled: isMobile, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "SidebarUserSection__tool-btn",
            onClick: handleOpenSettings,
            "aria-label": t("settings.title", "\u8BBE\u7F6E"),
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSettings, { size: 17, "aria-hidden": "true" })
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "SidebarUserSection__tool-wrap", ref: bellContainerRef, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Tooltip, { content: t("notifications.title", "\u901A\u77E5"), placement: "top", disabled: isMobile, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              type: "button",
              className: `SidebarUserSection__tool-btn ${bellOpen ? "is-active" : ""}`,
              onClick: () => {
                setBellOpen((prev) => !prev);
                setMenuOpen(false);
              },
              "aria-label": unreadCount > 0 ? t("notifications.titleWithCount", {
                count: unreadCount,
                defaultValue: `\u901A\u77E5\uFF0C${unreadCount} \u6761\u672A\u8BFB`
              }) : t("notifications.title", "\u901A\u77E5"),
              "aria-expanded": bellOpen,
              "aria-haspopup": "menu",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuBell, { size: 17, "aria-hidden": "true" }),
                unreadCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "SidebarUserSection__badge", "aria-hidden": "true", children: unreadCount > 9 ? "9+" : unreadCount })
              ]
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(PortalDropdown, { isOpen: bellOpen, anchorRef: sectionRef, role: "menu", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "topbar-notification__header", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-notification__title", children: t("notifications.title", "Notifications") }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-notification__subtitle", children: t("notifications.subtitle", "Recent updates relevant to you") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  type: "button",
                  className: "topbar-notification__mark-all",
                  onClick: () => void markAllAsRead(),
                  disabled: unreadCount === 0,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCheck, { size: 13, "aria-hidden": "true" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("notifications.markAllRead", "Mark all read") })
                  ]
                }
              )
            ] }),
            visibleNotifications.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-notification__empty", children: t("notifications.empty", "No notifications yet") }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-notification__list", style: { maxHeight: "280px" }, children: visibleNotifications.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                className: `topbar-notification__item ${item.read ? "" : "is-unread"}`,
                onClick: () => handleOpenNotificationItem(item),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-notification__item-icon", children: getNotificationIcon(item) }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "topbar-notification__item-body", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "topbar-notification__item-title-row", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "topbar-notification__item-title", children: item.title }),
                      !item.read && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "topbar-notification__item-dot", "aria-hidden": "true" })
                    ] }),
                    item.message && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-notification__item-message", children: item.message }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "topbar-notification__item-time", children: formatNotificationTime(item.createdAt) })
                  ] })
                ]
              },
              item.id
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                className: "topbar-notification__footer-link",
                onClick: () => {
                  setBellOpen(false);
                  navigate("/notifications" /* NOTIFICATIONS */);
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("notifications.viewAll", "View all notifications") }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuArrowRight, { size: 14, "aria-hidden": "true" })
                ]
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(InviteRewards_default, { isOpen: inviteOpen, onClose: () => setInviteOpen(false) })
  ] });
};
var SidebarUserSection_default = SidebarUserSection;
export {
  SidebarUserSection,
  SidebarUserSection_default as default
};
