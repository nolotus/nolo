import {
  $41fb335299a4a39e$export$f5b8910cec6cf069,
  $43a3b93638fe5db9$export$b04be29aa201d4f5,
  $b8dcdc58eeae0d40$export$2c73285ae9390cec,
  $efe09c6d1c304b50$export$5f1af8db9871e1d6
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  LuEye,
  LuEyeOff
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

// packages/render/web/form/Input.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var Input = ({
  icon,
  error,
  helperText,
  label,
  variant = "default",
  size = "md",
  password = false,
  type: propType,
  className = "",
  style,
  id,
  ref,
  ...props
}) => {
  const [showPassword, setShowPassword] = (0, import_react.useState)(false);
  const inputType = password ? showPassword ? "text" : "password" : propType;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    $b8dcdc58eeae0d40$export$2c73285ae9390cec,
    {
      isInvalid: error,
      isDisabled: props.disabled,
      className: `react-aria-TextField ${className}`,
      style,
      id,
      children: [
        label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)($43a3b93638fe5db9$export$b04be29aa201d4f5, { className: `react-aria-Label ${error ? "is-invalid" : ""}`, children: label }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `input-wrapper ${icon ? "has-icon" : ""} ${password ? "has-password" : ""}`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            $41fb335299a4a39e$export$f5b8910cec6cf069,
            {
              ref,
              type: inputType,
              className: `react-aria-Input variant-${variant} size-${size} ${error ? "is-invalid" : ""} ${icon ? "has-icon" : ""} ${password ? "has-password" : ""}`,
              ...props
            }
          ),
          icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `input-icon ${error ? "error" : ""}`, "aria-hidden": "true", children: icon }),
          password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => setShowPassword(!showPassword),
              className: `password-toggle ${error ? "error" : ""}`,
              "aria-label": showPassword ? "\u9690\u85CF\u5BC6\u7801" : "\u663E\u793A\u5BC6\u7801",
              disabled: props.disabled,
              children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuEyeOff, { size: 16, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuEye, { size: 16, "aria-hidden": "true" })
            }
          )
        ] }),
        helperText && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          $efe09c6d1c304b50$export$5f1af8db9871e1d6,
          {
            slot: error ? "errorMessage" : "description",
            className: `input-helper ${error ? "error" : "normal"}`,
            children: helperText
          }
        )
      ]
    }
  );
};
var NumberInput = ({
  value,
  onChange,
  decimal = 0,
  placeholder = "",
  ref,
  ...props
}) => {
  const [displayValue, setDisplayValue] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    if (value === void 0 || value === 0) {
      setDisplayValue("");
    } else {
      const formatted = decimal > 0 ? value.toFixed(decimal).replace(/\.?0+$/, "") : value.toString();
      setDisplayValue(formatted);
    }
  }, [value, decimal]);
  const handleChange = (0, import_react.useCallback)(
    (e) => {
      const raw = e.target.value;
      const pattern = new RegExp(
        `^${raw.startsWith("-") ? "-?" : ""}\\d*(\\.\\d{0,${decimal}})?$`
      );
      if (raw === "" || pattern.test(raw)) {
        setDisplayValue(raw);
        const numericValue = parseFloat(raw) || 0;
        onChange(numericValue);
      }
    },
    [onChange, decimal]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Input,
    {
      ...props,
      ref,
      type: "text",
      value: displayValue,
      onChange: handleChange,
      placeholder: value === void 0 || value === 0 ? placeholder : "",
      inputMode: decimal > 0 ? "decimal" : "numeric"
    }
  );
};
var PasswordInput = (props) => {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, { ...props, password: true });
};
Input.displayName = "Input";
NumberInput.displayName = "NumberInput";
PasswordInput.displayName = "PasswordInput";

export {
  Input,
  NumberInput,
  PasswordInput
};
