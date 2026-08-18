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
  NavLink
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useSelector
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
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
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/auth/web/Signup.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var Signup = () => {
  const { t: t2 } = useTranslation();
  const { isLoading } = useSelector((state) => state.auth);
  const { handleRegister, error } = useRegister_default();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: t(
      esm_default.object({
        username: esm_default.string().nonempty(t2("usernameRequired") || ""),
        password: esm_default.string().nonempty(t2("passwordRequired") || ""),
        email: esm_default.string().email(t2("invalidEmail") || "").optional().or(esm_default.literal(""))
      })
    )
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "signup-container", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "auth-form-panel", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleSubmit(handleRegister), className: "signup-form", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "signup-title", children: t2("signup") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field-group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Input,
        {
          placeholder: t2("enterUsername"),
          ...register("username"),
          error: !!errors.username,
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUser, { size: 20, "aria-hidden": "true" }),
          autoComplete: "username"
        }
      ),
      errors.username && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: errors.username.message })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field-group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        PasswordInput,
        {
          placeholder: t2("enterPassword"),
          ...register("password"),
          error: !!errors.password,
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLock, { size: 20, "aria-hidden": "true" }),
          autoComplete: "new-password"
        }
      ),
      errors.password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: errors.password.message })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field-group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Input,
        {
          placeholder: t2("enterEmail"),
          ...register("email"),
          error: !!errors.email,
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 20, "aria-hidden": "true" }),
          type: "email",
          autoComplete: "email"
        }
      ),
      errors.email && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: errors.email.message })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "auth-form-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          variant: "primary",
          size: "large",
          loading: isLoading,
          disabled: isLoading,
          style: { width: "100%" },
          type: "submit",
          children: isLoading ? t2("loading") : t2("signup")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "login-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "link-text", children: t2("haveAccount") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, { to: "/login", className: "login-link", children: t2("loginNow") })
      ] })
    ] })
  ] }) }) });
};
var Signup_default = Signup;
export {
  Signup_default as default
};
