import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  LuSearch,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/SearchInput.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var SearchInput = ({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = "\u641C\u7D22...",
  className = "",
  autoFocus,
  label,
  description,
  errorMessage,
  name,
  inputId,
  disabled = false,
  size = "medium",
  clearAriaLabel = "\u6E05\u7A7A\u641C\u7D22",
  searchButtonLabel = "\u641C\u7D22",
  formClassName,
  dismissible = false
}) => {
  const inputRef = (0, import_react.useRef)(null);
  const reactId = (0, import_react.useId)();
  const fieldId = inputId ?? `search-input-${reactId}`;
  const descriptionId = description ? `${fieldId}-description` : void 0;
  const errorId = errorMessage ? `${fieldId}-error` : void 0;
  const isEmpty = value.length === 0;
  const hasError = Boolean(errorMessage);
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || void 0;
  const inputAriaLabel = label ? void 0 : placeholder || "\u641C\u7D22";
  const showClearControl = dismissible || !isEmpty;
  const wrapperClassName = [
    "search-form",
    formClassName,
    className,
    `search-form--${size}`
  ].filter(Boolean).join(" ");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;
    onSearch();
    inputRef.current?.blur();
  };
  const handleClear = () => {
    if (disabled) return;
    onClear();
    if (!dismissible) {
      inputRef.current?.focus();
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "form",
    {
      onSubmit: handleSubmit,
      className: wrapperClassName,
      "data-empty": isEmpty,
      "data-dismissible": dismissible || void 0,
      "data-disabled": disabled || void 0,
      "data-invalid": hasError || void 0,
      role: "search",
      children: [
        label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: fieldId, className: "search-input-label", children: label }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "search-container", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "input-field-wrapper", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSearch, { className: "search-icon-left", size: 18, "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                ref: inputRef,
                id: fieldId,
                name,
                type: "text",
                placeholder,
                value,
                disabled,
                autoFocus,
                "aria-label": inputAriaLabel,
                "aria-invalid": hasError || void 0,
                "aria-describedby": describedBy,
                onChange: (e) => onChange(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Escape" && (dismissible || !isEmpty)) {
                    e.preventDefault();
                    handleClear();
                  }
                },
                className: "search-input-field"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                className: `clear-btn-wrapper${showClearControl ? " visible" : ""}`,
                "aria-hidden": !showClearControl,
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: handleClear,
                    className: "clear-icon-button",
                    title: clearAriaLabel,
                    "aria-label": clearAriaLabel,
                    tabIndex: !showClearControl || disabled ? -1 : 0,
                    disabled,
                    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 12, "aria-hidden": "true" })
                  }
                )
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "search-action", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              type: "submit",
              variant: "primary",
              size: "medium",
              className: "search-btn",
              disabled,
              "aria-label": searchButtonLabel,
              children: searchButtonLabel
            }
          ) })
        ] }),
        description && !hasError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { id: descriptionId, className: "search-input-description", children: description }),
        hasError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { id: errorId, className: "search-input-error", role: "alert", children: errorMessage })
      ]
    }
  );
};
SearchInput.displayName = "SearchInput";
var SearchInput_default = SearchInput;

export {
  SearchInput_default
};
