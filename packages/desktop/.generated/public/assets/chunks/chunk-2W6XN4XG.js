import {
  useTable
} from "/public/assets/chunks/chunk-D23ANNTW.js";
import {
  BaseTable,
  BaseTableCell,
  BaseTableRow
} from "/public/assets/chunks/chunk-QJUZO4YG.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  LuLoaderCircle,
  LuTable
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/modal/TablePreviewDialog.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var TablePreviewDialog = ({
  isOpen,
  onClose,
  tableKey,
  tableName
}) => {
  const { t } = useTranslation("chat");
  const {
    tenantId,
    tableId,
    valid,
    tableMeta,
    isLoading,
    error,
    rows
  } = useTable(tableKey, { enabled: isOpen });
  const columns = tableMeta?.columns ?? [];
  const renderTitle = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dialog-title-wrapper", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTable, { size: 16, className: "title-icon", "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "title-text", title: tableName, children: tableName || tableMeta?.displayName || "Table Preview" })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Dialog,
    {
      isOpen,
      onClose,
      title: renderTitle(),
      size: "xlarge",
      className: "table-preview-modal",
      children: isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "preview-body-content", children: isLoading && !tableMeta ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "loading-state", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLoaderCircle, { className: "spin", size: 24, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("loadingContent") })
      ] }) : !valid ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "error-state", children: " Invalid Table Key " }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "table-container", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BaseTable, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BaseTableRow, { children: columns.map((col) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: { width: col.width || 120 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "table-header-cell", children: col.label || col.name }) }, col.id)) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [
          rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BaseTableRow, { children: columns.map((col) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BaseTableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "table-data-cell", children: row[col.name] !== void 0 ? String(row[col.name]) : "" }) }, col.id)) }, row.dbKey)),
          rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BaseTableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BaseTableCell, { colSpan: columns.length, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "empty-rows-message", children: "No data rows found." }) }) })
        ] })
      ] }) }) })
    }
  ) });
};
var TablePreviewDialog_default = TablePreviewDialog;

export {
  TablePreviewDialog_default
};
