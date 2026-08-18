import {
  EmptyState_default
} from "/public/assets/chunks/chunk-W7N4CJ4P.js";
import {
  useSpaceData
} from "/public/assets/chunks/chunk-V2EX6S7V.js";
import {
  Input
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
import "/public/assets/chunks/chunk-IOQKDOEC.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import {
  Select,
  SelectItem
} from "/public/assets/chunks/chunk-5LT6KM4O.js";
import "/public/assets/chunks/chunk-AL5TXIK3.js";
import "/public/assets/chunks/chunk-CXTRCW5J.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  addMember,
  removeMember,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuClock,
  LuInfo,
  LuPencil,
  LuPlus,
  LuShield,
  LuTrash2,
  LuUser,
  LuUserPlus,
  LuUsers
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
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
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/create/space/pages/SpaceMembers.tsx
var import_react2 = __toESM(require_react(), 1);

// packages/create/space/components/InviteModal.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var InviteModal = ({
  isOpen,
  onClose,
  onInvite,
  loading = false
}) => {
  const [identifier, setIdentifier] = (0, import_react.useState)("");
  const [role, setRole] = (0, import_react.useState)("viewer");
  const handleInvite = () => {
    onInvite(identifier, role);
  };
  const actions = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Button_default,
      {
        onClick: onClose,
        variant: "secondary",
        size: "small",
        disabled: loading,
        children: "\u53D6\u6D88"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Button_default,
      {
        onClick: handleInvite,
        size: "small",
        loading,
        disabled: loading,
        children: "\u9080\u8BF7"
      }
    )
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    Dialog,
    {
      isOpen,
      onClose,
      title: "\u9080\u8BF7\u6210\u5458",
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuInfo, { size: 16 }),
      actions,
      status: "info",
      width: 400,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-form", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "form-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "identifier", children: "\u7528\u6237\u540D\u6216\u7528\u6237 ID" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Input,
              {
                id: "identifier",
                type: "text",
                value: identifier,
                onChange: (e) => setIdentifier(e.target.value),
                placeholder: "\u8F93\u5165\u7528\u6237\u540D\u6216\u7528\u6237 ID"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "form-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "role", children: "\u89D2\u8272" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              Select,
              {
                className: "invite-role-select",
                selectedKey: role,
                onSelectionChange: (key) => setRole(key == null ? "viewer" : String(key)),
                "aria-label": "\u89D2\u8272",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "viewer", textValue: "\u67E5\u770B\u8005", children: "\u67E5\u770B\u8005" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "editor", textValue: "\u7F16\u8F91\u8005", children: "\u7F16\u8F91\u8005" })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { jsx: true, children: `
        .invite-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-weight: 500;
        }

        input {
          padding: 8px 12px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: var(--radius-md);
          font-size: var(--fontSize-base);
          width: 100%;
        }

        input:focus {
          outline: none;
          border-color: var(--primary-color, #0066ff);
          box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.1);
        }

        .invite-role-select {
          width: 100%;
        }
      ` })
      ]
    }
  );
};

// packages/create/space/pages/SpaceMembers.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var roleLabelMap = {
  ["owner" /* OWNER */]: "\u62E5\u6709\u8005",
  ["admin" /* ADMIN */]: "\u7BA1\u7406\u5458",
  ["member" /* MEMBER */]: "\u6210\u5458",
  ["guest" /* GUEST */]: "\u8BBF\u5BA2"
};
var roleIconMap = {
  ["owner" /* OWNER */]: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuShield, { size: 14, "aria-hidden": "true" }),
  ["admin" /* ADMIN */]: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuUsers, { size: 14, "aria-hidden": "true" }),
  ["member" /* MEMBER */]: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuUser, { size: 14, "aria-hidden": "true" }),
  ["guest" /* GUEST */]: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuClock, { size: 14, "aria-hidden": "true" })
};
var roleDescriptionMap = {
  ["owner" /* OWNER */]: "\u5B8C\u5168\u63A7\u5236\u7A7A\u95F4\u7684\u6240\u6709\u6743\u9650",
  ["admin" /* ADMIN */]: "\u53EF\u4EE5\u7BA1\u7406\u7A7A\u95F4\u8BBE\u7F6E\u548C\u6210\u5458",
  ["member" /* MEMBER */]: "\u53EF\u4EE5\u67E5\u770B\u548C\u7F16\u8F91\u7A7A\u95F4\u5185\u5BB9",
  ["guest" /* GUEST */]: "\u4EC5\u53EF\u67E5\u770B\u7A7A\u95F4\u5185\u5BB9"
};
var SpaceMembers = () => {
  const { spaceId } = useParams();
  const dispatch = useAppDispatch();
  const { spaceData, loading, error } = useSpaceData(spaceId);
  const [showInviteModal, setShowInviteModal] = (0, import_react2.useState)(false);
  const [members, setMembers] = (0, import_react2.useState)([]);
  const [removingMemberId, setRemovingMemberId] = (0, import_react2.useState)(null);
  const [editMemberId, setEditMemberId] = (0, import_react2.useState)(null);
  (0, import_react2.useEffect)(() => {
    if (spaceData) {
      setMembers(spaceData.members || []);
    }
  }, [spaceData]);
  const handleInviteMember = async (identifier, role) => {
    if (!spaceData) return;
    try {
      const mappedRole = role === "viewer" ? "guest" /* GUEST */ : "member" /* MEMBER */;
      await dispatch(
        addMember({
          spaceId,
          memberId: identifier,
          role: mappedRole
        })
      ).unwrap();
      toast.success("\u9080\u8BF7\u5DF2\u53D1\u9001");
      setShowInviteModal(false);
    } catch (err) {
      toast.error("\u9080\u8BF7\u5931\u8D25");
    }
  };
  const handleRemoveMember = async (memberId) => {
    if (!spaceData) return;
    try {
      setRemovingMemberId(memberId);
      await dispatch(
        removeMember({
          spaceId,
          memberId
        })
      ).unwrap();
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("\u5DF2\u79FB\u9664\u6210\u5458");
    } catch (err) {
      const message = toErrorMessage(err);
      toast.error(`\u79FB\u9664\u5931\u8D25: ${message}`);
    } finally {
      setRemovingMemberId(null);
    }
  };
  const updateMemberRole = async (memberId, newRole) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setMembers(
        (prev) => prev.map(
          (member) => member.id === memberId ? { ...member, role: newRole } : member
        )
      );
      setEditMemberId(null);
      toast.success("\u6210\u5458\u89D2\u8272\u5DF2\u66F4\u65B0");
    } catch (err) {
      toast.error("\u66F4\u65B0\u5931\u8D25");
    }
  };
  if (loading) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-members", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__loading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "space-members__loading-spinner" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u6B63\u5728\u52A0\u8F7D\u6210\u5458\u4FE1\u606F..." })
    ] }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      InviteModal,
      {
        isOpen: showInviteModal,
        onClose: () => setShowInviteModal(false),
        onInvite: handleInviteMember,
        loading: false
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "space-members__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__header-left", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuUsers, { "aria-hidden": "true", className: "space-members__header-icon" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__header-copy", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__title-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "space-members__title", children: "\u7A7A\u95F4\u6210\u5458" }),
            spaceData && !error && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "space-members__count", children: members.length })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "space-members__subtitle", children: "\u7BA1\u7406\u8C01\u53EF\u4EE5\u8BBF\u95EE\u6B64\u7A7A\u95F4\uFF0C\u4EE5\u53CA\u4ED6\u4EEC\u7684\u89D2\u8272\u6743\u9650" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        Button_default,
        {
          variant: "secondary",
          className: "space-members__invite-btn",
          onClick: () => setShowInviteModal(true),
          icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPlus, { size: 15, "aria-hidden": "true" }),
          children: "\u9080\u8BF7\u6210\u5458"
        }
      )
    ] }),
    error || !spaceData ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__error", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: "space-members__error-title", children: "\u65E0\u6CD5\u52A0\u8F7D\u6210\u5458\u4FE1\u606F" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "space-members__error-text", children: error ? error.message : "\u672A\u627E\u5230\u7A7A\u95F4\u6570\u636E" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("section", { className: "space-members__section", children: members.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { className: "space-members__members-list", children: members.map((member) => {
        const isOwner = member.id === spaceData.ownerId;
        const isEditing = editMemberId === member.id;
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "li",
          {
            className: isOwner ? "space-members__member-item space-members__member-item--owner" : "space-members__member-item",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__member-info", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-members__avatar", children: member.avatar ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("img", { src: member.avatar, alt: member.name }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "div",
                  {
                    className: "space-members__avatar-fallback",
                    style: {
                      backgroundColor: stringToColor(
                        member.name || member.id
                      )
                    },
                    children: getInitials(member.name || member.id)
                  }
                ) }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__member-meta", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__member-name-row", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "space-members__member-name", children: member.name }),
                    isOwner && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "space-members__owner-badge", children: "\u521B\u5EFA\u8005" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "space-members__member-email", children: member.email || member.id })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__member-controls", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-members__member-role", children: isEditing ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__role-editor", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    Select,
                    {
                      className: "space-members__role-select",
                      selectedKey: member.role,
                      onSelectionChange: (key) => updateMemberRole(
                        member.id,
                        key == null ? member.role : String(key)
                      ),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          SelectItem,
                          {
                            id: "admin" /* ADMIN */,
                            textValue: "\u7BA1\u7406\u5458",
                            children: "\u7BA1\u7406\u5458"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          SelectItem,
                          {
                            id: "member" /* MEMBER */,
                            textValue: "\u6210\u5458",
                            children: "\u6210\u5458"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          SelectItem,
                          {
                            id: "guest" /* GUEST */,
                            textValue: "\u8BBF\u5BA2",
                            children: "\u8BBF\u5BA2"
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "space-members__role-cancel",
                      onClick: () => setEditMemberId(null),
                      children: "\u53D6\u6D88"
                    }
                  )
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__role-chip", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "space-members__member-role-icon", children: roleIconMap[member.role] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: roleLabelMap[member.role] })
                ] }) }),
                isOwner ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "div",
                  {
                    className: "space-members__actions space-members__actions--spacer",
                    "aria-hidden": "true"
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__actions", children: [
                  !isEditing && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "space-members__action",
                      title: "\u66F4\u6539\u89D2\u8272",
                      "aria-label": `\u66F4\u6539 ${member.name} \u7684\u89D2\u8272`,
                      onClick: () => setEditMemberId(member.id),
                      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPencil, { size: 13, "aria-hidden": "true" })
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "space-members__action space-members__action--remove",
                      title: "\u79FB\u9664\u6210\u5458",
                      "aria-label": `\u79FB\u9664\u6210\u5458 ${member.name}`,
                      onClick: () => handleRemoveMember(member.id),
                      disabled: removingMemberId === member.id,
                      children: removingMemberId === member.id ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        "span",
                        {
                          className: "space-members__inline-spinner",
                          "aria-hidden": "true"
                        }
                      ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuTrash2, { size: 13, "aria-hidden": "true" })
                    }
                  )
                ] })
              ] })
            ]
          },
          member.id
        );
      }) }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        EmptyState_default,
        {
          icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuUserPlus, { size: 26, "aria-hidden": "true" }),
          title: "\u9080\u8BF7\u56E2\u961F\u6210\u5458",
          description: "\u9080\u8BF7\u6210\u5458\u52A0\u5165\u8FD9\u4E2A\u7A7A\u95F4\uFF0C\u4E00\u8D77\u534F\u4F5C\u548C\u5206\u4EAB\u5185\u5BB9",
          actionText: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPlus, { size: 15, "aria-hidden": "true" }),
            "\u9080\u8BF7\u6210\u5458"
          ] }),
          onAction: () => setShowInviteModal(true)
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "space-members__roles-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__roles-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: "space-members__roles-title", children: "\u89D2\u8272\u8BF4\u660E" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "space-members__roles-desc", children: "\u4E0D\u540C\u89D2\u8272\u51B3\u5B9A\u6210\u5458\u53EF\u6267\u884C\u7684\u64CD\u4F5C\u8303\u56F4" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-members__roles-list", children: Object.entries(roleLabelMap).map(([role, label]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__role-item", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "space-members__role-item-icon", children: roleIconMap[role] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-members__role-item-copy", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "space-members__role-item-name", children: label }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "space-members__role-item-desc", children: roleDescriptionMap[role] })
          ] })
        ] }, role)) })
      ] })
    ] })
  ] });
};
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
function getInitials(name) {
  return name.split(" ").map((word) => word.charAt(0)).join("").toUpperCase().substring(0, 2);
}
var SpaceMembers_default = SpaceMembers;
export {
  SpaceMembers_default as default
};
