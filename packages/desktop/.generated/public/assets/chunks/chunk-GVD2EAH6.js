import {
  useTheme
} from "/public/assets/chunks/chunk-LVVUA2RZ.js";
import {
  require_browser
} from "/public/assets/chunks/chunk-2CATDSNY.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/Pagination.tsx
var import_pino = __toESM(require_browser(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var logger = (0, import_pino.default)({ name: "Pagination" });
function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = ""
}) {
  const theme = useTheme();
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const getPageNumbers = () => {
    const maxVisiblePages = 5;
    const pages = [];
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push("...");
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };
  const handlePageChange = (page) => {
    if (page === currentPage) return;
    logger.debug({ from: currentPage, to: page }, "Page change requested");
    onPageChange(page);
  };
  if (totalItems === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `pagination ${className}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pagination-info", children: [
        "\u663E\u793A ",
        startItem,
        "-",
        endItem,
        " \u6761\uFF0C\u5171 ",
        totalItems,
        " \u6761"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pagination-buttons", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "secondary",
            size: "small",
            disabled: currentPage === 1,
            onClick: () => handlePageChange(1),
            className: "page-button",
            children: "\u9996\u9875"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "secondary",
            size: "small",
            disabled: currentPage === 1,
            onClick: () => handlePageChange(currentPage - 1),
            className: "page-button",
            children: "\u4E0A\u4E00\u9875"
          }
        ),
        getPageNumbers().map(
          (pageNum, index) => pageNum === "..." ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ellipsis", children: "..." }, `ellipsis-${index}`) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              variant: pageNum === currentPage ? "primary" : "secondary",
              size: "small",
              className: "page-button",
              onClick: () => handlePageChange(pageNum),
              disabled: pageNum === currentPage,
              children: pageNum
            },
            pageNum
          )
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "secondary",
            size: "small",
            disabled: currentPage === totalPages,
            onClick: () => handlePageChange(currentPage + 1),
            className: "page-button",
            children: "\u4E0B\u4E00\u9875"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "secondary",
            size: "small",
            disabled: currentPage === totalPages,
            onClick: () => handlePageChange(totalPages),
            className: "page-button",
            children: "\u672B\u9875"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { jsx: true, children: `
        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          gap: 16px;
          flex-wrap: wrap;
        }

        .pagination-info {
          font-size: var(--fontSize-base);
          color: ${theme.textSecondary};
          white-space: nowrap;
        }

        .pagination-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .ellipsis {
          color: ${theme.textSecondary};
          padding: 0 4px;
          user-select: none;
        }

        :global(.page-button) {
          min-width: var(--control-sm);
          height: var(--control-sm);
          padding: 0 8px;
        }

        @media (max-width: 640px) {
          .pagination {
            justify-content: center;
          }

          .pagination-info {
            width: 100%;
            text-align: center;
            order: 2;
          }

          .pagination-buttons {
            width: 100%;
            justify-content: center;
            order: 1;
          }
        }
      ` })
  ] });
}

export {
  Pagination
};
