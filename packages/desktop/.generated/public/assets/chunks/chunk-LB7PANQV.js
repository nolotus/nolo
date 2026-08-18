import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  Link,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/NoMatch.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var NoMatch = ({ message }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#fafafa"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "h2",
          {
            style: {
              fontSize: "3rem",
              marginBottom: "2rem",
              color: "#2d3748",
              fontWeight: "500"
            },
            children: t("Nothing to see here!")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: "12px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, { to: "/", style: { textDecoration: "none" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { variant: "primary", children: t("Go to Home") }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { variant: "secondary", onClick: () => navigate(-1), children: t("Go Back") })
        ] })
      ]
    }
  );
};
var NoMatch_default = NoMatch;

export {
  NoMatch_default
};
