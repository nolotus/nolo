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
  Input
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
import {
  TextArea
} from "/public/assets/chunks/chunk-MDRAKVMH.js";
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
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  inviteSignUp
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuMail
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

// packages/auth/web/BetaAccessSignup.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var BetaAccessSignup = () => {
  const theme = useTheme();
  const { isLoading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { t: t2 } = useTranslation();
  const [error, setError] = (0, import_react.useState)(null);
  const userFormSchema = esm_default.object({
    email: esm_default.string().nonempty({ message: t2("emailRequired") || "" }).email({ message: t2("invalidEmail") || "" }),
    purpose: esm_default.string().nonempty({ message: t2("purposeRequired") || "" }).min(10, { message: t2("purposeTooShort") || "" })
  });
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: t(userFormSchema)
  });
  const onSubmit = async (data) => {
    try {
      const action = await dispatch(
        inviteSignUp(data)
      );
      if (action.payload.success) {
        return;
      }
      switch (action.payload.status) {
        case 422:
          setError(t2("invalidEmail"));
          break;
        case 409:
          setError(t2("emailExists"));
          break;
        default:
          setError(t2("operationFailed"));
      }
    } catch (err) {
      setError(t2("networkError"));
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "beta-access-container", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
        .beta-access-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100dvh - 60px);
          padding: 24px;
        }

        .beta-access-form {
          width: 100%;
          max-width: 380px;
        }

        .beta-access-title {
          font-size: 32px;
          font-weight: 600;
          color: ${theme.text};
          margin-bottom: 24px;
          text-align: center;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .beta-tag {
          display: inline-block;
          background-color: ${theme.primary};
          color: white;
          font-size: 14px;
          padding: 2px 10px;
          border-radius: var(--radius-xs);
          font-weight: 500;
        }

        .description {
          text-align: center;
          color: ${theme.textSecondary};
          font-size: 15px;
          margin-bottom: 40px;
          line-height: 1.6;
        }

        .field-group {
          margin-bottom: 28px;
        }

        .error-message {
          font-size: 14px;
          color: ${theme.error};
          margin-top: 8px;
        }

        .beta-access-footer {
          display: flex;
          flex-direction: column;
          gap: 32px;
          align-items: center;
        }

        .login-section {
          text-align: center;
        }

        .link-text {
          color: ${theme.textSecondary};
          font-size: 15px;
        }

        .login-link {
          color: ${theme.primary};
          text-decoration: none;
          font-size: 15px;
          margin-left: 6px;
          font-weight: 500;
          transition: color 0.2s;
        }

        .login-link:hover {
          color: ${theme.primaryLight};
        }

        @media (min-width: 768px) {
          .beta-access-form {
            max-width: 420px;
          }

          .beta-access-title {
            font-size: 36px;
          }

          .description {
            font-size: 16px;
            margin-bottom: 48px;
          }
        }

        @media (min-width: 1200px) {
          .beta-access-form {
            max-width: 460px;
          }

          .beta-access-title {
            font-size: 40px;
          }

          .description {
            margin-bottom: 56px;
          }
        }
      ` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleSubmit(onSubmit), className: "beta-access-form", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { className: "beta-access-title", children: [
        t2("betaAccess"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "beta-tag", children: "Beta" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "description", children: t2("betaDescription") }),
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field-group", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          TextArea,
          {
            placeholder: t2("purposeHolder"),
            ...register("purpose"),
            error: !!errors.purpose,
            rows: 3
          }
        ),
        errors.purpose && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: errors.purpose.message })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "beta-access-footer", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "primary",
            size: "large",
            loading: isLoading,
            disabled: isLoading,
            style: { width: "100%" },
            type: "submit",
            children: isLoading ? t2("loading") : t2("applyForAccess")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "login-section", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "link-text", children: t2("haveAccount") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, { to: "/login", className: "login-link", children: t2("loginNow") })
        ] })
      ] })
    ] })
  ] });
};
var BetaAccessSignup_default = BetaAccessSignup;
export {
  BetaAccessSignup_default as default
};
