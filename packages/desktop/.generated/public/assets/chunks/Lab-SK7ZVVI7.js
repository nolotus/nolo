import {
  Slider
} from "/public/assets/chunks/chunk-B4HGU7PU.js";
import "/public/assets/chunks/chunk-SBTGPOJ3.js";
import {
  useForm
} from "/public/assets/chunks/chunk-Q66XOYF3.js";
import {
  Input,
  NumberInput
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
import {
  TextArea
} from "/public/assets/chunks/chunk-MDRAKVMH.js";
import "/public/assets/chunks/chunk-IOQKDOEC.js";
import {
  Switch
} from "/public/assets/chunks/chunk-FORT2GLR.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-AL5TXIK3.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectTheme
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuEye,
  LuLock,
  LuMail,
  LuPencil,
  LuSearch,
  LuSettings,
  LuTag,
  LuUser,
  LuX
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

// packages/app/pages/Lab.tsx
var import_react2 = __toESM(require_react());

// packages/render/web/form/TagsInput.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var TagsInput = ({
  value = "",
  onChange,
  error,
  placeholder,
  disabled = false,
  label,
  helperText,
  variant = "default",
  maxTags,
  allowDuplicates = false,
  separator = /[,\s]+/,
  className = "",
  style,
  id,
  ref
}) => {
  const { t } = useTranslation("ai");
  const [inputValue, setInputValue] = (0, import_react.useState)("");
  const [isFocused, setIsFocused] = (0, import_react.useState)(false);
  const tagsArray = String(value).split(",").map((tag) => tag.trim()).filter(Boolean);
  const generatedId = (0, import_react.useId)();
  const inputId = id || `tags-input-${generatedId}`;
  const helperTextId = helperText || error?.message ? `${inputId}-helper` : void 0;
  const addTag = (tagToAdd) => {
    const trimmedTag = tagToAdd.trim();
    if (!trimmedTag || maxTags && tagsArray.length >= maxTags || !allowDuplicates && tagsArray.includes(trimmedTag))
      return;
    onChange([...tagsArray, trimmedTag].join(", "));
    setInputValue("");
  };
  const removeTag = (indexToRemove) => {
    const newTags = tagsArray.filter((_, index) => index !== indexToRemove).join(", ");
    onChange(newTags);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tagsArray.length) {
      removeTag(tagsArray.length - 1);
    }
  };
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };
  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    pastedText.split(separator).forEach(addTag);
  };
  const finalPlaceholder = placeholder || t("form.tagsPlaceholder");
  const wrapperClasses = [
    "ti-wrapper",
    variant,
    // default | filled | ghost
    isFocused ? "focused" : "",
    error ? "error" : "",
    disabled ? "disabled" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `ti-container ${className}`, style, children: [
    label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "label",
      {
        htmlFor: inputId,
        className: `ti-label ${error ? "error" : ""}`,
        children: label
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: wrapperClasses, children: [
      tagsArray.map((tag, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "span",
        {
          className: "ti-tag",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: tag, children: tag }),
            !disabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "ti-remove",
                onClick: () => removeTag(index),
                "aria-label": t("form.removeTag", { tag }),
                tabIndex: -1,
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 12, "aria-hidden": "true" })
              }
            )
          ]
        },
        allowDuplicates ? `${tag}-${index}` : tag
      )),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          ref,
          id: inputId,
          type: "text",
          value: inputValue,
          onChange: handleInputChange,
          onKeyDown: handleKeyDown,
          onBlur: handleBlur,
          onFocus: () => setIsFocused(true),
          onPaste: handlePaste,
          placeholder: tagsArray.length === 0 ? finalPlaceholder : "",
          disabled,
          className: "ti-input",
          "aria-invalid": !!error,
          "aria-describedby": helperTextId,
          autoComplete: "off"
        }
      ),
      maxTags && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          className: `ti-counter ${tagsArray.length >= maxTags ? "warning" : ""}`,
          children: [
            tagsArray.length,
            "/",
            maxTags
          ]
        }
      )
    ] }),
    (helperText || error?.message) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        id: helperTextId,
        className: `ti-helper ${error ? "error" : ""}`,
        role: error ? "alert" : "note",
        children: error?.message || helperText
      }
    )
  ] }) });
};
TagsInput.displayName = "TagsInput";

// packages/app/pages/Lab.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var Lab = () => {
  const theme = useAppSelector(selectTheme);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      age: 0,
      bio: "",
      tags: "",
      search: ""
    }
  });
  const [loading, setLoading] = (0, import_react2.useState)(false);
  const onSubmit = async (data) => {
    setLoading(true);
    console.log("Form Data:", data);
    await new Promise((resolve) => setTimeout(resolve, 2e3));
    setLoading(false);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_jsx_runtime2.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "lab-container", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "lab-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h1", { className: "lab-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "status-indicator" }),
        "\u7EC4\u4EF6\u5C55\u793A\u5B9E\u9A8C\u5BA4"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "lab-description", children: "\u8FD9\u91CC\u5C55\u793A\u4E86\u5404\u79CD\u8868\u5355\u7EC4\u4EF6\u7684\u529F\u80FD\u548C\u6837\u5F0F\uFF0C\u5305\u62EC\u4E0D\u540C\u5C3A\u5BF8\u3001\u53D8\u4F53\u548C\u72B6\u6001\u7684\u6F14\u793A" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "lab-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "lab-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "section-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { className: "section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSettings, { size: 20, className: "section-title-icon", "aria-hidden": "true" }),
            "Button \u7EC4\u4EF6"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "section-description", children: "\u652F\u6301\u591A\u79CD\u53D8\u4F53\u3001\u5C3A\u5BF8\u548C\u72B6\u6001\u7684\u73B0\u4EE3\u6309\u94AE\u7EC4\u4EF6" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-demo", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "\u53D8\u4F53\u6F14\u793A" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "variant-demo", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { variant: "primary", children: "Primary" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { variant: "secondary", children: "Secondary" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { variant: "ghost", children: "Ghost" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { variant: "danger", children: "Danger" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "\u5C3A\u5BF8\u6F14\u793A" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "variant-demo", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { size: "small", children: "Small" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { children: "Medium" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { size: "large", children: "Large" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "\u72B6\u6001\u6F14\u793A" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "variant-demo", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSearch, { size: 16, "aria-hidden": "true" }), children: "With Icon" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { loading: true, children: "Loading" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { disabled: true, children: "Disabled" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { block: true, children: "Block Button" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "lab-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "section-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { className: "section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPencil, { size: 20, className: "section-title-icon", "aria-hidden": "true" }),
            "\u8868\u5355\u7EC4\u4EF6"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "section-description", children: "\u5B8C\u6574\u7684\u8868\u5355\u8F93\u5165\u7EC4\u4EF6\u96C6\u5408\uFF0C\u652F\u6301\u9A8C\u8BC1\u548C\u5404\u79CD\u8F93\u5165\u7C7B\u578B" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("form", { onSubmit: handleSubmit(onSubmit), className: "demo-form", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "demo-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Input,
              {
                label: "\u7528\u6237\u540D",
                placeholder: "\u8BF7\u8F93\u5165\u7528\u6237\u540D",
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuUser, { size: 16, "aria-hidden": "true" }),
                helperText: "\u7528\u6237\u540D\u957F\u5EA6\u4E3A3-20\u4E2A\u5B57\u7B26",
                ...control.register("username", {
                  required: "\u7528\u6237\u540D\u4E0D\u80FD\u4E3A\u7A7A",
                  minLength: { value: 3, message: "\u7528\u6237\u540D\u81F3\u5C113\u4E2A\u5B57\u7B26" }
                }),
                error: !!errors.username
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Input,
              {
                label: "\u90AE\u7BB1",
                type: "email",
                placeholder: "\u8BF7\u8F93\u5165\u90AE\u7BB1\u5730\u5740",
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuMail, { size: 16, "aria-hidden": "true" }),
                ...control.register("email", {
                  required: "\u90AE\u7BB1\u4E0D\u80FD\u4E3A\u7A7A",
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: "\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E"
                  }
                }),
                error: !!errors.email
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "demo-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Input,
              {
                label: "\u5BC6\u7801",
                password: true,
                placeholder: "\u8BF7\u8F93\u5165\u5BC6\u7801",
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLock, { size: 16, "aria-hidden": "true" }),
                helperText: "\u5BC6\u7801\u957F\u5EA6\u81F3\u5C116\u4F4D",
                ...control.register("password", {
                  required: "\u5BC6\u7801\u4E0D\u80FD\u4E3A\u7A7A",
                  minLength: { value: 6, message: "\u5BC6\u7801\u81F3\u5C116\u4F4D" }
                }),
                error: !!errors.password
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              NumberInput,
              {
                label: "\u5E74\u9F84",
                placeholder: "\u8BF7\u8F93\u5165\u5E74\u9F84",
                helperText: "\u8BF7\u8F93\u5165\u771F\u5B9E\u5E74\u9F84",
                ...control.register("age", {
                  required: "\u5E74\u9F84\u4E0D\u80FD\u4E3A\u7A7A",
                  min: { value: 1, message: "\u5E74\u9F84\u5FC5\u987B\u5927\u4E8E0" },
                  max: { value: 150, message: "\u5E74\u9F84\u4E0D\u80FD\u8D85\u8FC7150" }
                })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "demo-full-width", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            TextArea,
            {
              label: "\u4E2A\u4EBA\u7B80\u4ECB",
              placeholder: "\u8BF7\u8F93\u5165\u4E2A\u4EBA\u7B80\u4ECB...",
              icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPencil, { size: 16, "aria-hidden": "true" }),
              autoResize: true,
              helperText: "\u7B80\u8981\u4ECB\u7ECD\u4E00\u4E0B\u81EA\u5DF1",
              ...control.register("bio")
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "demo-full-width", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            TagsInput,
            {
              label: "\u6280\u80FD\u6807\u7B7E",
              placeholder: "\u8F93\u5165\u6280\u80FD\u6807\u7B7E\uFF0C\u6309\u56DE\u8F66\u6DFB\u52A0",
              maxTags: 10,
              helperText: "\u6700\u591A\u53EF\u6DFB\u52A010\u4E2A\u6280\u80FD\u6807\u7B7E",
              ...control.register("tags")
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "demo-buttons", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Button_default,
              {
                variant: "secondary",
                type: "button",
                onClick: () => console.log("Reset clicked"),
                children: "\u91CD\u7F6E"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Button_default,
              {
                type: "submit",
                loading,
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSearch, { size: 16, "aria-hidden": "true" }),
                children: loading ? "\u63D0\u4EA4\u4E2D..." : "\u63D0\u4EA4\u8868\u5355"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "lab-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "section-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { className: "section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuEye, { size: 20, className: "section-title-icon", "aria-hidden": "true" }),
            "\u5C3A\u5BF8\u5BF9\u6BD4"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "section-description", children: "\u4E0D\u540C\u5C3A\u5BF8\u7684\u7EC4\u4EF6\u5BF9\u6BD4\u5C55\u793A" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-demo", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "Small" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "demo-grid", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                Input,
                {
                  size: "sm",
                  placeholder: "Small input",
                  icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSearch, { size: 14, "aria-hidden": "true" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { size: "small", children: "Small Button" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "Medium (\u9ED8\u8BA4)" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "demo-grid", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                Input,
                {
                  placeholder: "Medium input",
                  icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSearch, { size: 16, "aria-hidden": "true" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { children: "Medium Button" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "Standard (\u9ED8\u8BA4)" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "demo-grid", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                Input,
                {
                  placeholder: "Standard input",
                  icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSearch, { size: 16, "aria-hidden": "true" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { children: "Standard Button" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "lab-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "section-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { className: "section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuTag, { size: 20, className: "section-title-icon", "aria-hidden": "true" }),
            "\u53D8\u4F53\u6837\u5F0F"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "section-description", children: "\u4E0D\u540C\u6837\u5F0F\u53D8\u4F53\u7684\u7EC4\u4EF6\u5C55\u793A" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-demo", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "Default" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Input,
              {
                variant: "default",
                placeholder: "Default variant",
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSearch, { size: 16, "aria-hidden": "true" })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "Filled" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Input,
              {
                variant: "filled",
                placeholder: "Filled variant",
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSearch, { size: 16, "aria-hidden": "true" })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "Ghost" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Input,
              {
                variant: "ghost",
                placeholder: "Ghost variant",
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSearch, { size: 16, "aria-hidden": "true" })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "Password Input" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Input,
              {
                password: true,
                placeholder: "Password input",
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLock, { size: 16, "aria-hidden": "true" })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "TextArea with Auto Resize" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              TextArea,
              {
                autoResize: true,
                placeholder: "This textarea will auto-resize as you type...",
                variant: "filled"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "lab-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "section-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { className: "section-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuSettings, { size: 20, className: "section-title-icon", "aria-hidden": "true" }),
            "Toggle & Slider"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "section-description", children: "\u5F00\u5173\u548C\u6ED1\u5757\u7EC4\u4EF6\u6F14\u793A\uFF0C\u652F\u6301\u4E0D\u540C\u72B6\u6001\u548C\u4EA4\u4E92" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "demo-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "Toggle Switch" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "variant-demo", style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { label: "\u9ED8\u8BA4\u5173\u95ED" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { defaultChecked: true, label: "\u9ED8\u8BA4\u5F00\u542F" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { disabled: true, label: "\u7981\u7528\u72B6\u6001" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { defaultChecked: true, disabled: true, label: "\u7981\u7528\u4E14\u5F00\u542F" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { loading: true, label: "\u52A0\u8F7D\u72B6\u6001" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { error: true, label: "\u9519\u8BEF\u72B6\u6001", helperText: "\u4FDD\u5B58\u5931\u8D25" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "size-group", style: { flex: 1 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "size-label", children: "Slider" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "variant-demo", style: { display: "flex", flexDirection: "column", gap: "32px" }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SliderDemo, {}) })
          ] })
        ] })
      ] })
    ] })
  ] }) });
};
var SliderDemo = () => {
  const [val1, setVal1] = (0, import_react2.useState)(30);
  const [val2, setVal2] = (0, import_react2.useState)(60);
  const [val3, setVal3] = (0, import_react2.useState)(2.5);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Slider,
      {
        label: `\u57FA\u7840\u6ED1\u5757 (\u5F53\u524D\u503C: ${val1})`,
        value: val1,
        onChange: setVal1
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Slider,
      {
        label: "\u5E26\u6570\u503C\u663E\u793A",
        showValue: true,
        value: val2,
        onChange: setVal2
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Slider,
      {
        label: "\u7981\u7528\u72B6\u6001",
        disabled: true,
        value: 40,
        onChange: () => {
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Slider,
      {
        label: "\u81EA\u5B9A\u4E49\u8303\u56F4 (0-10, step 0.5)",
        min: 0,
        max: 10,
        step: 0.5,
        value: val3,
        showValue: true,
        onChange: setVal3
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Slider,
      {
        label: "\u9519\u8BEF\u72B6\u6001",
        error: true,
        helperText: "\u6570\u503C\u8D85\u51FA\u9650\u5236",
        value: 90,
        showValue: true,
        onChange: () => {
        }
      }
    )
  ] });
};
var Lab_default = Lab;
export {
  Lab_default as default
};
