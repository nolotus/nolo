import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/elements/BaseTable.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var BaseTable = ({
  columns = [],
  containerStyle,
  headerControls,
  style,
  children,
  ...tableProps
}) => {
  const hasCustomWidth = columns.some(
    (col) => col.width !== void 0 && col.width !== null
  );
  const childArray = import_react.default.Children.toArray(children);
  const hasExplicitTableSections = childArray.some((child) => {
    if (!import_react.default.isValidElement(child) || typeof child.type !== "string") return false;
    return child.type === "thead" || child.type === "tbody" || child.type === "tfoot";
  });
  const tableChildren = hasExplicitTableSections ? children : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "table-container", style: containerStyle, children: [
    headerControls,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "data-table", style, ...tableProps, children: [
      hasCustomWidth && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("colgroup", { children: columns.map((col, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "col",
        {
          style: col.width != null ? {
            width: typeof col.width === "number" ? `${col.width}px` : col.width
          } : void 0
        },
        col.key ?? col.id ?? col.title ?? `col-${index}-${String(col.width ?? "").slice(0, 24)}`
      )) }),
      tableChildren
    ] })
  ] }) });
};
var BaseTableRow = import_react.default.forwardRef(function BaseTableRow2({ children, ...rowProps }, ref) {
  const { className, ...rest } = rowProps;
  const mergedClassName = ["table-row", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { ref, className: mergedClassName, ...rest, children });
});
BaseTableRow.displayName = "BaseTableRow";
var BaseTableCell = ({
  header,
  children,
  className,
  ...cellProps
}) => {
  const Component = header ? "th" : "td";
  const mergedClassName = [
    "table-cell",
    header ? "table-header" : "",
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Component, { className: mergedClassName, ...cellProps, children });
};

export {
  BaseTable,
  BaseTableRow,
  BaseTableCell
};
