import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/form/Slider.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var Slider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  label,
  showValue = false,
  size = "medium",
  className = "",
  helperText,
  error = false,
  ref,
  id,
  ...inputProps
}) => {
  const [dragState, setDragState] = (0, import_react.useState)({ value, dragging: false });
  const localValue = dragState.value;
  const isDragging = dragState.dragging;
  const [isHovered, setIsHovered] = (0, import_react.useState)(false);
  const inputId = id || `slider-${Math.random().toString(36).substr(2, 9)}`;
  const helperTextId = helperText ? `${inputId}-helper` : void 0;
  const progress = (localValue - min) / (max - min) * 100;
  const handleInput = (0, import_react.useCallback)((e) => {
    const val = parseFloat(e.target.value);
    setDragState({ value: val, dragging: true });
  }, []);
  const handleChange = (0, import_react.useCallback)(
    (e) => {
      const val = parseFloat(e.target.value);
      setDragState({ value: val, dragging: false });
      onChange(val);
    },
    [onChange]
  );
  (0, import_react.useEffect)(() => {
    if (!isDragging) {
      setDragState(
        (current) => current.value === value ? current : { ...current, value }
      );
    }
  }, [value, isDragging]);
  const displayValue = step < 1 ? localValue.toFixed(1) : Math.round(localValue).toString();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: [
        "slider-container",
        `size-${size}`,
        disabled ? "disabled" : "",
        error ? "error" : "",
        className
      ].filter(Boolean).join(" "),
      children: [
        (label || showValue) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "slider-header", children: [
          label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "slider-label", children: label }),
          showValue && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "slider-value", children: displayValue })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "slider-track-container",
            onMouseEnter: () => !disabled && setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `slider-track-bg ${isHovered ? "hovered" : ""}` }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "div",
                {
                  className: [
                    "slider-track-fill",
                    isDragging ? "dragging" : "",
                    isHovered ? "hovered" : ""
                  ].filter(Boolean).join(" "),
                  style: { width: `${progress}%` }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  ref,
                  id: inputId,
                  type: "range",
                  value: localValue,
                  onInput: handleInput,
                  onChange: handleChange,
                  min,
                  max,
                  step,
                  disabled,
                  className: [
                    "slider-input",
                    isDragging ? "dragging" : "",
                    isHovered ? "hovered" : ""
                  ].filter(Boolean).join(" "),
                  "aria-label": label,
                  "aria-describedby": helperTextId,
                  ...inputProps
                }
              )
            ]
          }
        ),
        helperText && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { id: helperTextId, className: "slider-helper", children: helperText })
      ]
    }
  ) });
};
Slider.displayName = "Slider";

export {
  Slider
};
