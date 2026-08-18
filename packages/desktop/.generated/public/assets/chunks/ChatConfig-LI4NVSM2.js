import {
  NumberInput
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
import {
  SettingSection_default
} from "/public/assets/chunks/chunk-32RQLKID.js";
import "/public/assets/chunks/chunk-IOQKDOEC.js";
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
  HIGH_IMPACT_SELF_UPDATE_FIELDS,
  PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS,
  selectAiRecentContentLimit,
  selectAutoApproveSelfUpdateFields,
  selectShowScrollToBottomButton,
  selectShowScrollToTopButton,
  setAiRecentContentLimit,
  setSettings
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuChevronDown,
  LuChevronUp,
  LuFolderOpen
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
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/settings/web/chat-config/ChatConfigSections.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var PRIMARY_FIELD_SET = new Set(
  PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS
);
var HIGH_IMPACT_FIELD_SET = new Set(
  HIGH_IMPACT_SELF_UPDATE_FIELDS
);
var ChatConfigSections = ({
  autoApproveSelfUpdateFields,
  onToggleAutoApproveSelfUpdateField,
  aiRecentContentLimit,
  onAiRecentContentLimitChange,
  showScrollToTopButton,
  onShowScrollToTopButtonChange,
  showScrollToBottomButton,
  onShowScrollToBottomButtonChange
}) => {
  const { t } = useTranslation();
  const [showAdvancedSelfUpdateFields, setShowAdvancedSelfUpdateFields] = (0, import_react.useState)(false);
  const selfUpdateFieldOptions = [
    {
      field: "greeting",
      label: t("chat.agentBehavior.selfUpdate.greeting", "\u6B22\u8FCE\u8BED"),
      description: t(
        "chat.agentBehavior.selfUpdate.greetingDesc",
        "\u8C03\u6574\u5F00\u573A\u6587\u6848\u6216\u5FEB\u6377\u83DC\u5355\u3002"
      )
    },
    {
      field: "introduction",
      label: t("chat.agentBehavior.selfUpdate.introduction", "\u7B80\u4ECB"),
      description: t(
        "chat.agentBehavior.selfUpdate.introductionDesc",
        "\u66F4\u65B0 Agent \u5BF9\u5916\u5C55\u793A\u7684\u7B80\u4ECB\u3002"
      )
    },
    {
      field: "tags",
      label: t("chat.agentBehavior.selfUpdate.tags", "\u6807\u7B7E"),
      description: t(
        "chat.agentBehavior.selfUpdate.tagsDesc",
        "\u66F4\u65B0\u6807\u7B7E\u548C\u8F7B\u91CF\u5206\u7C7B\u4FE1\u606F\u3002"
      )
    },
    {
      field: "prompt",
      label: t("chat.agentBehavior.selfUpdate.prompt", "\u7CFB\u7EDF\u63D0\u793A\u8BCD"),
      description: t(
        "chat.agentBehavior.selfUpdate.promptDesc",
        "\u9AD8\u5F71\u54CD\u5B57\u6BB5\uFF0C\u9ED8\u8BA4\u5EFA\u8BAE\u4FDD\u6301\u8BE2\u95EE\u3002"
      )
    },
    {
      field: "references",
      label: t("chat.agentBehavior.selfUpdate.references", "\u77E5\u8BC6\u5F15\u7528"),
      description: t(
        "chat.agentBehavior.selfUpdate.referencesDesc",
        "\u4F1A\u6539\u53D8 Agent \u9ED8\u8BA4\u53C2\u8003\u7684\u6587\u6863\u548C\u9875\u9762\u3002"
      )
    },
    {
      field: "tools",
      label: t("chat.agentBehavior.selfUpdate.tools", "\u5DE5\u5177"),
      description: t(
        "chat.agentBehavior.selfUpdate.toolsDesc",
        "\u4F1A\u6539\u53D8 Agent \u53EF\u8C03\u7528\u7684\u5DE5\u5177\u80FD\u529B\u3002"
      )
    },
    {
      field: "model",
      label: t("chat.agentBehavior.selfUpdate.model", "\u6A21\u578B"),
      description: t(
        "chat.agentBehavior.selfUpdate.modelDesc",
        "\u66F4\u6362\u5E95\u5C42\u6A21\u578B\u3002"
      )
    },
    {
      field: "provider",
      label: t("chat.agentBehavior.selfUpdate.provider", "\u63D0\u4F9B\u5546"),
      description: t(
        "chat.agentBehavior.selfUpdate.providerDesc",
        "\u66F4\u6362\u6A21\u578B\u63D0\u4F9B\u65B9\u3002"
      )
    },
    {
      field: "isPublic",
      label: t("chat.agentBehavior.selfUpdate.public", "\u516C\u5F00\u72B6\u6001"),
      description: t(
        "chat.agentBehavior.selfUpdate.publicDesc",
        "\u5207\u6362\u662F\u5426\u516C\u5F00\u5C55\u793A\u3002"
      )
    },
    {
      field: "temperature",
      label: t("chat.agentBehavior.selfUpdate.temperature", "Temperature"),
      description: t(
        "chat.agentBehavior.selfUpdate.temperatureDesc",
        "\u8C03\u6574\u751F\u6210\u968F\u673A\u6027\u3002"
      )
    },
    {
      field: "top_p",
      label: t("chat.agentBehavior.selfUpdate.topP", "Top P"),
      description: t(
        "chat.agentBehavior.selfUpdate.topPDesc",
        "\u8C03\u6574 nucleus sampling\u3002"
      )
    },
    {
      field: "frequency_penalty",
      label: t(
        "chat.agentBehavior.selfUpdate.frequencyPenalty",
        "Frequency penalty"
      ),
      description: t(
        "chat.agentBehavior.selfUpdate.frequencyPenaltyDesc",
        "\u8C03\u6574\u91CD\u590D\u60E9\u7F5A\u3002"
      )
    },
    {
      field: "presence_penalty",
      label: t(
        "chat.agentBehavior.selfUpdate.presencePenalty",
        "Presence penalty"
      ),
      description: t(
        "chat.agentBehavior.selfUpdate.presencePenaltyDesc",
        "\u8C03\u6574\u65B0\u8BDD\u9898\u6FC0\u52B1\u3002"
      )
    },
    {
      field: "max_tokens",
      label: t("chat.agentBehavior.selfUpdate.maxTokens", "Max tokens"),
      description: t(
        "chat.agentBehavior.selfUpdate.maxTokensDesc",
        "\u8C03\u6574\u5355\u6B21\u56DE\u590D\u6700\u5927 token \u6570\u3002"
      )
    },
    {
      field: "reasoning_effort",
      label: t("chat.agentBehavior.selfUpdate.reasoningEffort", "\u63A8\u7406\u5F3A\u5EA6"),
      description: t(
        "chat.agentBehavior.selfUpdate.reasoningEffortDesc",
        "\u8C03\u6574 reasoning effort\u3002"
      )
    },
    {
      field: "name",
      label: t("chat.agentBehavior.selfUpdate.name", "\u540D\u79F0"),
      description: t(
        "chat.agentBehavior.selfUpdate.nameDesc",
        "\u4FEE\u6539 Agent \u540D\u79F0\u3002"
      )
    }
  ];
  const primarySelfUpdateFieldOptions = selfUpdateFieldOptions.filter(
    (option) => PRIMARY_FIELD_SET.has(option.field)
  );
  const advancedSelfUpdateFieldOptions = selfUpdateFieldOptions.filter(
    (option) => !PRIMARY_FIELD_SET.has(option.field)
  );
  const renderSelfUpdateFieldOption = (option) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ChatConfigSections__subSetting", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ChatConfigSections__subSettingHeader", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ChatConfigSections__subSettingLabel", children: option.label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ChatConfigSections__subSettingDescription", children: option.description })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Switch,
      {
        checked: autoApproveSelfUpdateFields.includes(option.field),
        onChange: () => onToggleAutoApproveSelfUpdateField(option.field)
      }
    )
  ] }, option.field);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection_default,
      {
        title: t("chat.agentBehavior.selfUpdate.title", "updateSelf \u514D\u8BE2\u95EE\u5B57\u6BB5"),
        description: t(
          "chat.agentBehavior.selfUpdate.description",
          "\u4EC5\u5EFA\u8BAE\u5BF9\u4F4E\u98CE\u9669\u5B57\u6BB5\uFF08\u6B22\u8FCE\u8BED\u3001\u7B80\u4ECB\u3001\u6807\u7B7E\uFF09\u9ED8\u8BA4\u514D\u8BE2\u95EE\uFF1B\u5176\u4ED6\u5B57\u6BB5\u8BF7\u6309\u9700\u5728\u9AD8\u7EA7\u5217\u8868\u4E2D\u5F00\u542F\u3002\u9AD8\u5F71\u54CD\u5B57\u6BB5\u5EFA\u8BAE\u4FDD\u6301\u5173\u95ED\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ChatConfigSections__stack", children: [
          primarySelfUpdateFieldOptions.map(renderSelfUpdateFieldOption),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ChatConfigSections__advanced", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                className: "ChatConfigSections__advancedToggle",
                "aria-expanded": showAdvancedSelfUpdateFields,
                onClick: () => setShowAdvancedSelfUpdateFields((open) => !open),
                children: [
                  showAdvancedSelfUpdateFields ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuChevronUp, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuChevronDown, { size: 14, "aria-hidden": "true" }),
                  t("chat.agentBehavior.selfUpdate.advanced", "\u9AD8\u7EA7\u5B57\u6BB5")
                ]
              }
            ),
            showAdvancedSelfUpdateFields ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ChatConfigSections__stack", children: [
              advancedSelfUpdateFieldOptions.some(
                (option) => HIGH_IMPACT_FIELD_SET.has(option.field)
              ) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ChatConfigSections__advancedNote", children: t(
                "chat.agentBehavior.selfUpdate.advancedNote",
                "\u9AD8\u5F71\u54CD\u5B57\u6BB5\u5EFA\u8BAE\u4FDD\u6301\u5173\u95ED\u3002"
              ) }) : null,
              advancedSelfUpdateFieldOptions.map(renderSelfUpdateFieldOption)
            ] }) : null
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection_default,
      {
        title: t("chat.recentContentLimit.title", "\u6700\u8FD1\u5185\u5BB9\u6570\u91CF"),
        description: t(
          "chat.recentContentLimit.description",
          "\u8BBE\u7F6E AI \u4E0A\u4E0B\u6587\u4E2D\u5305\u542B\u7684\u6700\u8FD1\u6587\u4EF6\u6570\u91CF\u3002\u4E3B\u8981\u5728\u201C\u8F7B\u91CF\u8BFB\u53D6 / \u81EA\u9002\u5E94\u8BFB\u53D6\u201D\u7EA7\u522B\u4E0B\u751F\u6548\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ChatConfigSections__inputWithIcon", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuFolderOpen, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            NumberInput,
            {
              value: aiRecentContentLimit,
              onChange: onAiRecentContentLimitChange,
              min: 10,
              max: 200
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection_default,
      {
        title: t("chat.scrollButtons.title", "\u5FEB\u6377\u6EDA\u52A8\u6309\u94AE"),
        description: t(
          "chat.scrollButtons.description",
          "\u5728\u5BF9\u8BDD\u9875\u9762\u53F3\u4FA7\u663E\u793A\u5FEB\u6377\u6EDA\u52A8\u6309\u94AE\uFF0C\u65B9\u4FBF\u5FEB\u901F\u8DF3\u8F6C\u5230\u9876\u90E8\u6216\u5E95\u90E8\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ChatConfigSections__stack", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ChatConfigSections__subSetting", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ChatConfigSections__subSettingHeader", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ChatConfigSections__subSettingLabel", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                LuChevronUp,
                {
                  size: 14,
                  style: {
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 4
                  },
                  "aria-hidden": "true"
                }
              ),
              t("chat.scrollButtons.top", "\u6EDA\u52A8\u5230\u9876\u90E8")
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Switch,
              {
                checked: showScrollToTopButton,
                onChange: () => onShowScrollToTopButtonChange(!showScrollToTopButton)
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ChatConfigSections__subSetting", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ChatConfigSections__subSettingHeader", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ChatConfigSections__subSettingLabel", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                LuChevronDown,
                {
                  size: 14,
                  style: {
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 4
                  },
                  "aria-hidden": "true"
                }
              ),
              t("chat.scrollButtons.bottom", "\u6EDA\u52A8\u5230\u5E95\u90E8")
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Switch,
              {
                checked: showScrollToBottomButton,
                onChange: () => onShowScrollToBottomButtonChange(!showScrollToBottomButton)
              }
            )
          ] })
        ] })
      }
    )
  ] });
};
var ChatConfigSections_default = ChatConfigSections;

// packages/app/settings/web/ChatConfig.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var ChatConfig = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const aiRecentContentLimit = useAppSelector(selectAiRecentContentLimit);
  const autoApproveSelfUpdateFields = useAppSelector(
    selectAutoApproveSelfUpdateFields
  );
  const showScrollToTopButton = useAppSelector(selectShowScrollToTopButton);
  const showScrollToBottomButton = useAppSelector(selectShowScrollToBottomButton);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_jsx_runtime2.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "chat-config-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { className: "page-title", children: t("chat.title", "\u5BF9\u8BDD\u8BBE\u7F6E") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ChatConfigSections_default,
      {
        autoApproveSelfUpdateFields,
        onToggleAutoApproveSelfUpdateField: (field) => {
          const nextFields = autoApproveSelfUpdateFields.includes(field) ? autoApproveSelfUpdateFields.filter((item) => item !== field) : [...autoApproveSelfUpdateFields, field];
          dispatch(setSettings({ autoApproveSelfUpdateFields: nextFields }));
        },
        aiRecentContentLimit,
        onAiRecentContentLimitChange: (value) => dispatch(setAiRecentContentLimit(value)),
        showScrollToTopButton,
        onShowScrollToTopButtonChange: (value) => dispatch(setSettings({ showScrollToTopButton: value })),
        showScrollToBottomButton,
        onShowScrollToBottomButtonChange: (value) => dispatch(setSettings({ showScrollToBottomButton: value }))
      }
    )
  ] }) });
};
var ChatConfig_default = ChatConfig;
export {
  ChatConfig_default as default
};
