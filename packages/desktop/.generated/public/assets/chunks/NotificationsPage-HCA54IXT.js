import {
  useNotificationActions,
  useNotifications,
  useUnreadNotificationCount
} from "/public/assets/chunks/chunk-VHK6SQ2N.js";
import {
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  markDialogRead
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuBell,
  LuCheck,
  LuCircleX,
  LuLoaderCircle,
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
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/NotificationsPage.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var getNotificationIcon = (item) => {
  if (item.kind === "agent_notice") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBell, { size: 16, "aria-hidden": "true" });
  if (item.kind === "space_member_added") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUsers, { size: 16, "aria-hidden": "true" });
  if (item.kind === "dialog_failed") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleX, { size: 16, "aria-hidden": "true" });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLoaderCircle, { size: 16, "aria-hidden": "true" });
};
var formatNotificationTime = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};
var NotificationsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const { markAsRead, markAllAsRead } = useNotificationActions();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "NotificationsPage", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "NotificationsPage__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "NotificationsPage__eyebrow", children: t("notifications.title", "Notifications") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "NotificationsPage__title", children: t("notifications.centerTitle", "Your updates") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "NotificationsPage__subtitle", children: t(
          "notifications.centerSubtitle",
          "Persistent space and agent updates across devices."
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: "NotificationsPage__mark-all",
          onClick: () => void markAllAsRead(),
          disabled: unreadCount === 0,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 14, "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("notifications.markAllRead", "Mark all read") })
          ]
        }
      )
    ] }),
    notifications.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "NotificationsPage__empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBell, { size: 18, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("notifications.empty", "No notifications yet") })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "NotificationsPage__list", children: notifications.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        className: `NotificationsPage__item ${item.read ? "" : "is-unread"}`,
        onClick: () => {
          if (item.href) navigate(item.href);
          void markAsRead(item);
          if (item.dialogId) {
            dispatch(markDialogRead({ dialogId: item.dialogId }));
          }
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "NotificationsPage__itemIcon", "aria-hidden": "true", children: getNotificationIcon(item) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "NotificationsPage__itemMain", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "NotificationsPage__itemTitleRow", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "NotificationsPage__itemTitle", children: item.title }),
              !item.read && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "NotificationsPage__itemDot", "aria-hidden": "true" })
            ] }),
            item.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "NotificationsPage__itemMessage", children: item.message })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "NotificationsPage__itemTime", children: formatNotificationTime(item.createdAt) })
        ]
      },
      item.id
    )) })
  ] });
};
var NotificationsPage_default = NotificationsPage;
export {
  NotificationsPage_default as default
};
