import {
  NavLink,
  useLocation
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/layout/blocks/NavListItem.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var NavListItem = ({
  path,
  label,
  icon,
  onClick,
  end
}) => {
  const location = useLocation();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
          .nav-list-item {
            display: flex;
            align-items: center;
            padding: 0 var(--space-3);
            border: none;
            border-radius: var(--radius-md);
            color: var(--text);
            background: transparent;
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            font: inherit;
            font-weight: 400;
            height: 32px;
            font-size: var(--fontSize-base);
            width: 100%;
            text-align: left;
          }

          .nav-list-icon {
            display: flex;
            align-items: center;
            margin-right: var(--space-2);
            color: var(--textSecondary);
          }

          .nav-list-item:hover {
            color: var(--primary);
            background: var(--primaryGhost);
          }

          .nav-list-item:hover .nav-list-icon {
            color: var(--primary);
          }

          .nav-list-item.active {
            background: var(--primary);
            color: var(--background);
          }

          .nav-list-item.active .nav-list-icon {
            color: var(--background);
          }

          @media (prefers-reduced-motion: reduce) {
            .nav-list-item {
              transition: none;
            }
          }
        ` }),
    onClick ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", onClick, className: "nav-list-item", children: [
      icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nav-list-icon", "aria-hidden": "true", children: icon }),
      label
    ] }) : path ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      NavLink,
      {
        to: path,
        state: location.state,
        end,
        className: ({ isActive }) => `nav-list-item ${isActive ? "active" : ""}`,
        children: [
          icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nav-list-icon", "aria-hidden": "true", children: icon }),
          label
        ]
      }
    ) : null
  ] });
};
var NavListItem_default = NavListItem;

export {
  NavListItem_default
};
