import {
  useRegister_default
} from "/public/assets/chunks/chunk-EDX2DVCN.js";
import "/public/assets/chunks/chunk-5WJ7RXPI.js";
import "/public/assets/chunks/chunk-HWC2ZOVH.js";
import {
  t
} from "/public/assets/chunks/chunk-THM65O3R.js";
import {
  useForm
} from "/public/assets/chunks/chunk-Q66XOYF3.js";
import {
  useTheme
} from "/public/assets/chunks/chunk-LVVUA2RZ.js";
import {
  Input,
  PasswordInput
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
import "/public/assets/chunks/chunk-IOQKDOEC.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  NavLink,
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  createUserKey,
  read
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCheck,
  LuGift,
  LuLock,
  LuMail,
  LuUser
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import {
  esm_default
} from "/public/assets/chunks/chunk-LPS7IE46.js";
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
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/auth/web/InviteSignup.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var InviteSignup = () => {
  const theme = useTheme();
  const { isLoading } = useAppSelector((state) => state.auth);
  const { t: t2 } = useTranslation();
  const { handleRegister, error } = useRegister_default();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const inviterId = searchParams.get("inviterId") || "";
  const inviterCode = searchParams.get("code") || "";
  const [inviterProfile, setInviterProfile] = (0, import_react.useState)({
    nickname: "",
    username: "",
    avatar: ""
  });
  (0, import_react.useEffect)(() => {
    const fetchInviterProfile = async () => {
      if (!inviterId) return;
      try {
        const profileKey = createUserKey.profile(inviterId);
        const userProfile = await dispatch(
          read({ dbKey: profileKey })
        ).unwrap();
        if (userProfile) {
          setInviterProfile({
            nickname: userProfile.nickname || "",
            username: userProfile.username || t2("unknown"),
            avatar: userProfile.avatar || ""
          });
        }
      } catch (e) {
        console.error("Failed to fetch inviter profile:", e);
      }
    };
    fetchInviterProfile();
  }, [inviterId, dispatch, t2]);
  const userFormSchema = esm_default.object({
    username: esm_default.string().nonempty({ message: t2("usernameRequired") || "" }),
    password: esm_default.string().nonempty({ message: t2("passwordRequired") || "" }),
    email: esm_default.string().email({ message: t2("invalidEmail") || "" }).optional().or(esm_default.literal(""))
  });
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: t(userFormSchema)
  });
  const onSubmit = (data) => {
    handleRegister({
      ...data,
      inviterId,
      inviterCode: inviterCode || void 0
    });
  };
  const displayName = inviterProfile.nickname || inviterProfile.username;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "invite-signup", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-container", children: [
    displayName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-header", children: [
      inviterProfile.avatar && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "img",
        {
          src: inviterProfile.avatar,
          alt: t2("inviterAvatarAlt", { name: displayName }),
          className: "inviter-avatar"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "invite-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "invite-title", children: t2("inviteHeader", { name: displayName }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "invite-desc", children: t2("invitePartnerDescription") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleSubmit(onSubmit), className: "signup-form", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "form-header", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "form-title", children: t2("signup") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "form-fields", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Input,
            {
              placeholder: t2("enterUsername"),
              ...register("username"),
              error: !!errors.username,
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUser, { size: 18, "aria-hidden": "true" }),
              autoComplete: "username"
            }
          ),
          errors.username && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "field-error", children: String(errors.username.message || "") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            PasswordInput,
            {
              placeholder: t2("enterPassword"),
              ...register("password"),
              error: !!errors.password,
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLock, { size: 18, "aria-hidden": "true" }),
              autoComplete: "new-password"
            }
          ),
          errors.password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "field-error", children: String(errors.password.message || "") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Input,
            {
              placeholder: t2("emailOptionalPlaceholder"),
              ...register("email"),
              error: !!errors.email,
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 18, "aria-hidden": "true" }),
              type: "email",
              autoComplete: "email"
            }
          ),
          errors.email && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "field-error", children: String(errors.email.message || "") })
        ] }),
        displayName && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "field-group", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "inviter-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inviter-field-icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 18, "aria-hidden": "true" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "inviter-field-content", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inviter-field-label", children: t2("invitedBy") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inviter-field-value", children: displayName })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inviter-field-badge", children: t2("acceptInvitation") })
        ] }) })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "form-error", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "form-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "primary",
            size: "large",
            loading: isLoading,
            disabled: isLoading,
            className: "submit-button",
            type: "submit",
            children: isLoading ? t2("loading") : t2("signup")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "reward-hint", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuGift, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t2("inviteGeneralHint") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "auth-switch", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "switch-text", children: t2("haveAccount") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, { to: "/login", className: "switch-link", children: t2("loginNow") })
        ] })
      ] })
    ] })
  ] }) });
};
var InviteSignup_default = InviteSignup;
export {
  InviteSignup_default as default
};
