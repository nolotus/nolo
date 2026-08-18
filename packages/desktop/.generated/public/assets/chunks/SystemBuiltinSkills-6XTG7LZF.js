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
  SYSTEM_AGENT_CAPABILITIES,
  selectSystemBuiltinSkills,
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

// packages/app/settings/web/SystemBuiltinSkills.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var SettingSection = ({ title, description, children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "setting-section", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "section-header", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "section-title", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "section-description", children: description })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "section-content", children })
] });
var SystemBuiltinSkills = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const systemBuiltinSkills = useAppSelector(selectSystemBuiltinSkills);
  const capabilityMeta = (0, import_react.useMemo)(
    () => SYSTEM_AGENT_CAPABILITIES.map((capability) => ({
      ...capability,
      label: capability.id === "web-search" ? t("settings.systemSkills.webSearch.label", capability.label) : capability.label,
      description: capability.id === "web-search" ? t(
        "settings.systemSkills.webSearch.description",
        "\u5141\u8BB8 agent \u641C\u7D22\u4E92\u8054\u7F51\u3001\u6293\u53D6\u7F51\u9875\u5185\u5BB9\uFF0C\u83B7\u53D6\u6700\u65B0\u4FE1\u606F\u3002\u5173\u95ED\u540E\u6240\u6709 agent \u4E0D\u518D\u5177\u5907\u8054\u7F51\u641C\u7D22\u80FD\u529B\u3002"
      ) : capability.description
    })),
    [t]
  );
  const handleToggle = (0, import_react.useCallback)(
    (packId, enabled) => {
      void dispatch(
        setSettings({
          systemBuiltinSkills: {
            ...systemBuiltinSkills,
            [packId]: enabled
          }
        })
      );
    },
    [dispatch, systemBuiltinSkills]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "productivity-page system-skills-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("settings.systemSkills.title", "Agent \u80FD\u529B") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection,
      {
        title: t(
          "settings.systemSkills.builtinSkills.title",
          "Agent \u80FD\u529B\u5F00\u5173"
        ),
        description: t(
          "settings.systemSkills.builtinSkills.description",
          "Nolo \u81EA\u5E26\u7684 Agent \u80FD\u529B\uFF0C\u9ED8\u8BA4\u5F00\u542F\u3002\u5173\u95ED\u540E\u6240\u6709 agent\uFF08Web / CLI / \u684C\u9762\uFF09\u90FD\u4E0D\u518D\u6CE8\u5165\u5BF9\u5E94\u5DE5\u5177\u3002\u6BCF\u4E2A agent \u7684\u80FD\u529B\u52FE\u9009\u4E0D\u53D7\u5F71\u54CD\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "agent-capability-list", children: capabilityMeta.map((skill) => {
          const enabled = systemBuiltinSkills[skill.id] !== false;
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "agent-capability-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent-capability-item__copy", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-capability-item__title", children: skill.label }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-capability-item__description", children: skill.description })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-capability-item__control", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Switch,
              {
                checked: enabled,
                onChange: (next) => handleToggle(skill.id, next),
                label: skill.label
              }
            ) })
          ] }, skill.id);
        }) })
      }
    )
  ] });
};
var SystemBuiltinSkills_default = SystemBuiltinSkills;
export {
  SystemBuiltinSkills_default as default
};
