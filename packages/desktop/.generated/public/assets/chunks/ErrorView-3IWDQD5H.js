import {
  LuTriangleAlert
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/ErrorView.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var ErrorView = ({ error }) => {
  const { t } = useTranslation("common");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      style: {
        display: "flex",
        // 增加 flex 居中，比原版单纯 text-align 更好
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "var(--space-5)",
        color: "var(--error)",
        textAlign: "center",
        gap: "var(--space-2)"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTriangleAlert, { size: 24, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          t("errors.loadingMessages"),
          ": ",
          toErrorMessage(error)
        ] })
      ]
    }
  );
};
var ErrorView_default = ErrorView;
export {
  ErrorView_default as default
};
