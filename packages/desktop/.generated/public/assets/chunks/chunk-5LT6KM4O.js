import {
  Description
} from "/public/assets/chunks/chunk-AL5TXIK3.js";
import {
  Popover
} from "/public/assets/chunks/chunk-CXTRCW5J.js";
import {
  $1f3c3b1a70cec653$export$f551688fc98f2e09,
  $43a3b93638fe5db9$export$b04be29aa201d4f5,
  $53e61d82d8b8611d$export$8b251419efc915eb,
  $7705c033048f6da7$export$353f5b6fc5456de1,
  $928221da08ecbc62$export$41f133550aa26f48,
  $928221da08ecbc62$export$a11e76429ed99b4,
  $928221da08ecbc62$export$dca12b0bb56e4fc,
  $c8bb816105474884$export$e288731fd71264f0,
  $c8bb816105474884$export$ef9b1a59e592288f
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  LuCheck,
  LuChevronDown
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/Select.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var joinClass = (base, extra) => extra ? `${base} ${extra}` : base;
function SelectItem({
  children,
  className,
  textValue,
  ...props
}) {
  const isSimple = typeof children === "string" || typeof children === "number";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    $928221da08ecbc62$export$a11e76429ed99b4,
    {
      ...props,
      textValue: textValue ?? (isSimple ? String(children) : void 0),
      className: joinClass(
        "nolo-select-item",
        typeof className === "string" ? className : void 0
      ),
      children: isSimple ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nolo-select-item-text", children }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nolo-select-item-indicator", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 14 }) })
      ] }) : children
    }
  );
}
function SelectListBox(props) {
  const { className, ...rest } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    $928221da08ecbc62$export$41f133550aa26f48,
    {
      ...rest,
      className: joinClass(
        "nolo-select-list",
        typeof className === "string" ? className : void 0
      )
    }
  );
}
function Select({
  label,
  description,
  errorMessage,
  children,
  items,
  className,
  triggerClassName,
  ...props
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    $c8bb816105474884$export$ef9b1a59e592288f,
    {
      ...props,
      className: joinClass("react-aria-Select nolo-select", className),
      children: [
        label ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)($43a3b93638fe5db9$export$b04be29aa201d4f5, { className: "nolo-select-label", children: label }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          $7705c033048f6da7$export$353f5b6fc5456de1,
          {
            className: joinClass("nolo-select-trigger", triggerClassName),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)($c8bb816105474884$export$e288731fd71264f0, { className: "nolo-select-value" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", className: "nolo-select-icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuChevronDown, { size: 16 }) })
            ]
          }
        ),
        description ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description, { children: description }) : null,
        errorMessage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)($1f3c3b1a70cec653$export$f551688fc98f2e09, { children: errorMessage }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Popover,
          {
            hideArrow: true,
            offset: 4,
            className: "nolo-select-popover select-popover",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)($928221da08ecbc62$export$41f133550aa26f48, { items, className: "nolo-select-list", children })
          }
        )
      ]
    }
  );
}
var SelectRoot = $c8bb816105474884$export$ef9b1a59e592288f;
var SelectTrigger = $7705c033048f6da7$export$353f5b6fc5456de1;
var SelectValue = $c8bb816105474884$export$e288731fd71264f0;
var SelectIcon = ({
  children
}) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", className: "nolo-select-icon", children: children ?? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuChevronDown, { size: 16 }) });
var SelectList = $928221da08ecbc62$export$41f133550aa26f48;
var SelectItemText = ({ children, className }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: joinClass("nolo-select-item-text", className), children });
var SelectItemIndicator = ({ children, className }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
  "span",
  {
    "aria-hidden": "true",
    className: joinClass("nolo-select-item-indicator", className),
    children: children ?? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 14 })
  }
);
var SelectGroup = $928221da08ecbc62$export$dca12b0bb56e4fc;
var SelectGroupLabel = ({ children, className }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)($53e61d82d8b8611d$export$8b251419efc915eb, { className: joinClass("nolo-select-group-label", className), children });

export {
  SelectItem,
  SelectListBox,
  Select,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectList,
  SelectItemText,
  SelectItemIndicator,
  SelectGroup,
  SelectGroupLabel
};
