import {
  Switch
} from "/public/assets/chunks/chunk-FORT2GLR.js";
import "/public/assets/chunks/chunk-AL5TXIK3.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectDeveloperModeEnabled,
  selectDiagnosticModeEnabled,
  setSettings
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
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
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/settings/web/DeveloperConfig.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var SettingSection = ({ title, description, children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "setting-section", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "section-header", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "section-title", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "section-description", children: description })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "section-content", children })
] });
var DeveloperConfig = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const developerMode = useAppSelector(selectDeveloperModeEnabled);
  const diagnosticMode = useAppSelector(selectDiagnosticModeEnabled);
  const handleDeveloperModeChange = (0, import_react.useCallback)(
    (enabled) => {
      if (enabled) {
        void dispatch(setSettings({ developerModeEnabled: true }));
        return;
      }
      void dispatch(
        setSettings({
          developerModeEnabled: false,
          diagnosticModeEnabled: false
        })
      );
    },
    [dispatch]
  );
  const handleDiagnosticModeChange = (0, import_react.useCallback)(
    (enabled) => {
      if (!developerMode) return;
      void dispatch(setSettings({ diagnosticModeEnabled: enabled }));
    },
    [dispatch, developerMode]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "productivity-page developer-config-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("settings.developer.title", "\u5F00\u53D1\u8005") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection,
      {
        title: t("settings.developer.developerMode.title", "\u5F00\u53D1\u8005\u6A21\u5F0F"),
        description: t(
          "settings.developer.developerMode.description",
          "\u5F00\u542F\u540E\u53EF\u4F7F\u7528\u8BCA\u65AD\u7B49\u9762\u5411\u5F00\u53D1\u8005\u7684\u529F\u80FD\u3002\u5173\u95ED\u65F6\u4F1A\u540C\u65F6\u5173\u95ED\u8BCA\u65AD\u6A21\u5F0F\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Switch,
          {
            checked: developerMode,
            onChange: handleDeveloperModeChange,
            label: t("settings.developer.developerMode.label", "\u5F00\u53D1\u8005\u6A21\u5F0F")
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection,
      {
        title: t("settings.developer.diagnosticMode.title", "\u8BCA\u65AD\u6A21\u5F0F"),
        description: t(
          "settings.developer.diagnosticMode.description",
          "\u5F00\u542F\u540E\u53EF\u5728\u5BF9\u8BDD\u83DC\u5355\u4E2D\u590D\u5236\u8BCA\u65AD\u4FE1\u606F\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Switch,
          {
            checked: developerMode && diagnosticMode,
            disabled: !developerMode,
            onChange: handleDiagnosticModeChange,
            label: t("settings.developer.diagnosticMode.label", "\u8BCA\u65AD\u6A21\u5F0F")
          }
        )
      }
    )
  ] });
};
var DeveloperConfig_default = DeveloperConfig;
export {
  DeveloperConfig_default as default
};
