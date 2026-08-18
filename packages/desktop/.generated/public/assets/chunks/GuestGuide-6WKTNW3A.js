import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  Link
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  LuBot,
  LuLogIn,
  LuUserPlus
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/GuestGuide.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var GuestGuide = ({ title, description }) => {
  const { t } = useTranslation("common");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        padding: "var(--space-8)",
        textAlign: "center",
        color: "var(--textSecondary)",
        backgroundColor: "var(--background)"
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          style: {
            width: "100%",
            maxWidth: "400px",
            backgroundColor: "var(--backgroundSecondary)",
            borderRadius: "var(--space-4)",
            padding: "var(--space-8)",
            boxShadow: "0 10px 30px var(--shadowMedium)"
            // 稍微优化了阴影以符合设计规范
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "var(--space-6)"
                },
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 48, style: { color: "var(--primary)" }, "aria-hidden": "true" })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "h2",
              {
                style: {
                  margin: "0 0 var(--space-4) 0",
                  color: "var(--text)",
                  fontSize: "var(--fontSize-2xl)",
                  fontWeight: 600
                },
                children: title || t("welcomeTitle")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "p",
              {
                style: {
                  margin: "0 0 var(--space-6) 0",
                  lineHeight: "1.5",
                  fontSize: "16px"
                },
                children: description || t("welcomeHint")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "div",
              {
                style: {
                  display: "flex",
                  gap: "var(--space-4)",
                  justifyContent: "center"
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                    Button_default,
                    {
                      as: Link,
                      to: "/login",
                      variant: "primary",
                      style: {
                        width: "120px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "var(--space-2)"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLogIn, { size: 16, "aria-hidden": "true" }),
                        t("login")
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                    Button_default,
                    {
                      as: Link,
                      to: "/signup",
                      variant: "secondary",
                      style: {
                        width: "120px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "var(--space-2)"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUserPlus, { size: 16, "aria-hidden": "true" }),
                        t("signup")
                      ]
                    }
                  )
                ]
              }
            )
          ]
        }
      )
    }
  );
};
var GuestGuide_default = GuestGuide;
export {
  GuestGuide_default as default
};
