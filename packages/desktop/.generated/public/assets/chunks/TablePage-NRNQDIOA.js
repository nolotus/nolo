import {
  InlineEditInput_default
} from "/public/assets/chunks/chunk-4JU66LN4.js";
import {
  NoMatch_default
} from "/public/assets/chunks/chunk-LB7PANQV.js";
import {
  ReadOnlyMarkdownContent_default
} from "/public/assets/chunks/chunk-5DFY76KP.js";
import {
  ContentIconPicker
} from "/public/assets/chunks/chunk-ZNBXGDWB.js";
import {
  ContentIcon
} from "/public/assets/chunks/chunk-X2QKE5FM.js";
import {
  Tooltip
} from "/public/assets/chunks/chunk-WZN2TP6C.js";
import {
  useDragResize
} from "/public/assets/chunks/chunk-6Q7JCK5Q.js";
import {
  useTable
} from "/public/assets/chunks/chunk-D23ANNTW.js";
import {
  BaseTable,
  BaseTableCell,
  BaseTableRow
} from "/public/assets/chunks/chunk-QJUZO4YG.js";
import "/public/assets/chunks/chunk-VPAVB2J5.js";
import "/public/assets/chunks/chunk-XXYYZRCQ.js";
import "/public/assets/chunks/chunk-IOQKDOEC.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import {
  Select,
  SelectItem
} from "/public/assets/chunks/chunk-5LT6KM4O.js";
import "/public/assets/chunks/chunk-AL5TXIK3.js";
import "/public/assets/chunks/chunk-CXTRCW5J.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-BZBR6J57.js";
import "/public/assets/chunks/chunk-YCIZFIEN.js";
import "/public/assets/chunks/chunk-2IJLPAOU.js";
import "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  addColumn,
  addColumnOption,
  addRow,
  deleteColumn,
  deleteRow,
  renameColumnLabel,
  renameTable,
  reorderColumn,
  selectCurrentSpaceId,
  setTableFocusContext,
  toast,
  updateCell,
  updateColumnWidth,
  updateContentTitle,
  updateTableIcon
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuArrowDown,
  LuArrowUp,
  LuArrowUpDown,
  LuCalendar,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuCircleAlert,
  LuClock,
  LuFileText,
  LuFlag,
  LuFolderOpen,
  LuGripVertical,
  LuLayoutDashboard,
  LuListTodo,
  LuLoaderCircle,
  LuMaximize2,
  LuOctagonAlert,
  LuPlay,
  LuPlus,
  LuStar,
  LuTable,
  LuTag,
  LuTrash2,
  LuUser
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  buildDialogUrl
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  compactWhitespace
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __commonJS,
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/@tanstack/react-store/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js
var require_use_sync_external_store_shim_development = __commonJS({
  "node_modules/@tanstack/react-store/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js"(exports) {
    "use strict";
    (function() {
      function is(x, y) {
        return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
      }
      function useSyncExternalStore$2(subscribe, getSnapshot) {
        didWarnOld18Alpha || void 0 === React10.startTransition || (didWarnOld18Alpha = true, console.error(
          "You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release."
        ));
        var value = getSnapshot();
        if (!didWarnUncachedGetSnapshot) {
          var cachedValue = getSnapshot();
          objectIs(value, cachedValue) || (console.error(
            "The result of getSnapshot should be cached to avoid an infinite loop"
          ), didWarnUncachedGetSnapshot = true);
        }
        cachedValue = useState11({
          inst: { value, getSnapshot }
        });
        var inst = cachedValue[0].inst, forceUpdate = cachedValue[1];
        useLayoutEffect3(
          function() {
            inst.value = value;
            inst.getSnapshot = getSnapshot;
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          },
          [subscribe, value, getSnapshot]
        );
        useEffect9(
          function() {
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
            return subscribe(function() {
              checkIfSnapshotChanged(inst) && forceUpdate({ inst });
            });
          },
          [subscribe]
        );
        useDebugValue(value);
        return value;
      }
      function checkIfSnapshotChanged(inst) {
        var latestGetSnapshot = inst.getSnapshot;
        inst = inst.value;
        try {
          var nextValue = latestGetSnapshot();
          return !objectIs(inst, nextValue);
        } catch (error) {
          return true;
        }
      }
      function useSyncExternalStore$1(subscribe, getSnapshot) {
        return getSnapshot();
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var React10 = require_react(), objectIs = "function" === typeof Object.is ? Object.is : is, useState11 = React10.useState, useEffect9 = React10.useEffect, useLayoutEffect3 = React10.useLayoutEffect, useDebugValue = React10.useDebugValue, didWarnOld18Alpha = false, didWarnUncachedGetSnapshot = false, shim = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
      exports.useSyncExternalStore = void 0 !== React10.useSyncExternalStore ? React10.useSyncExternalStore : shim;
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// node_modules/@tanstack/react-store/node_modules/use-sync-external-store/shim/index.js
var require_shim = __commonJS({
  "node_modules/@tanstack/react-store/node_modules/use-sync-external-store/shim/index.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_use_sync_external_store_shim_development();
    }
  }
});

// node_modules/@tanstack/react-store/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js
var require_with_selector_development = __commonJS({
  "node_modules/@tanstack/react-store/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js"(exports) {
    "use strict";
    (function() {
      function is(x, y) {
        return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var React10 = require_react(), shim = require_shim(), objectIs = "function" === typeof Object.is ? Object.is : is, useSyncExternalStore = shim.useSyncExternalStore, useRef5 = React10.useRef, useEffect9 = React10.useEffect, useMemo6 = React10.useMemo, useDebugValue = React10.useDebugValue;
      exports.useSyncExternalStoreWithSelector = function(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
        var instRef = useRef5(null);
        if (null === instRef.current) {
          var inst = { hasValue: false, value: null };
          instRef.current = inst;
        } else inst = instRef.current;
        instRef = useMemo6(
          function() {
            function memoizedSelector(nextSnapshot) {
              if (!hasMemo) {
                hasMemo = true;
                memoizedSnapshot = nextSnapshot;
                nextSnapshot = selector(nextSnapshot);
                if (void 0 !== isEqual && inst.hasValue) {
                  var currentSelection = inst.value;
                  if (isEqual(currentSelection, nextSnapshot))
                    return memoizedSelection = currentSelection;
                }
                return memoizedSelection = nextSnapshot;
              }
              currentSelection = memoizedSelection;
              if (objectIs(memoizedSnapshot, nextSnapshot))
                return currentSelection;
              var nextSelection = selector(nextSnapshot);
              if (void 0 !== isEqual && isEqual(currentSelection, nextSelection))
                return memoizedSnapshot = nextSnapshot, currentSelection;
              memoizedSnapshot = nextSnapshot;
              return memoizedSelection = nextSelection;
            }
            var hasMemo = false, memoizedSnapshot, memoizedSelection, maybeGetServerSnapshot = void 0 === getServerSnapshot ? null : getServerSnapshot;
            return [
              function() {
                return memoizedSelector(getSnapshot());
              },
              null === maybeGetServerSnapshot ? void 0 : function() {
                return memoizedSelector(maybeGetServerSnapshot());
              }
            ];
          },
          [getSnapshot, getServerSnapshot, selector, isEqual]
        );
        var value = useSyncExternalStore(subscribe, instRef[0], instRef[1]);
        useEffect9(
          function() {
            inst.hasValue = true;
            inst.value = value;
          },
          [value]
        );
        useDebugValue(value);
        return value;
      };
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// node_modules/@tanstack/react-store/node_modules/use-sync-external-store/shim/with-selector.js
var require_with_selector = __commonJS({
  "node_modules/@tanstack/react-store/node_modules/use-sync-external-store/shim/with-selector.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_with_selector_development();
    }
  }
});

// packages/render/table/TablePage.tsx
var import_react15 = __toESM(require_react(), 1);

// packages/render/table/tablePrefs.ts
var STORAGE_KEY_PREFIX = "nolo.table.prefs.v1.";
var isSortDirection = (value) => value === "asc" || value === "desc";
var sanitizeSort = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw;
  if (typeof obj.columnId !== "string" || obj.columnId.length === 0) return null;
  if (!isSortDirection(obj.direction)) return null;
  return { columnId: obj.columnId, direction: obj.direction };
};
var sanitizeOrder = (raw) => {
  if (!Array.isArray(raw)) return null;
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || entry.length === 0) continue;
    if (seen.has(entry)) continue;
    seen.add(entry);
    result.push(entry);
  }
  return result;
};
var readTablePrefs = (tableKey) => {
  if (typeof window === "undefined" || !tableKey) {
    return { sort: null, manualOrder: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + tableKey);
    if (!raw) return { sort: null, manualOrder: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { sort: null, manualOrder: null };
    }
    const obj = parsed;
    return {
      sort: sanitizeSort(obj.sort),
      manualOrder: sanitizeOrder(obj.manualOrder)
    };
  } catch {
    return { sort: null, manualOrder: null };
  }
};
var writeTablePrefs = (tableKey, prefs) => {
  if (typeof window === "undefined" || !tableKey) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY_PREFIX + tableKey,
      JSON.stringify(prefs)
    );
  } catch {
  }
};
var applyManualOrder = (rows, manualOrder, getKey) => {
  if (!manualOrder || manualOrder.length === 0) return rows;
  const rowByKey = /* @__PURE__ */ new Map();
  for (const row of rows) {
    rowByKey.set(getKey(row), row);
  }
  const ordered = [];
  const seen = /* @__PURE__ */ new Set();
  for (const key of manualOrder) {
    const row = rowByKey.get(key);
    if (!row) continue;
    ordered.push(row);
    seen.add(key);
  }
  for (const row of rows) {
    const key = getKey(row);
    if (seen.has(key)) continue;
    ordered.push(row);
  }
  return ordered;
};

// packages/render/table/selectCellUtils.ts
var SELECT_BADGE_PALETTE_SIZE = 8;
var resolveSelectOptions = (column, rows) => {
  if (!column) return [];
  const values = /* @__PURE__ */ new Set();
  const orderedValues = [];
  const rowOnlyValues = /* @__PURE__ */ new Set();
  if (Array.isArray(column.options)) {
    column.options.forEach((option) => {
      const value = String(option ?? "").trim();
      if (value && !values.has(value)) {
        values.add(value);
        orderedValues.push(value);
      }
    });
  }
  rows.forEach((row) => {
    const value = String(row[column.name] ?? "").trim();
    if (value && !values.has(value)) {
      values.add(value);
      rowOnlyValues.add(value);
    }
  });
  return [
    ...orderedValues,
    ...Array.from(rowOnlyValues).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
  ];
};
var selectBadgeColorIndex = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % SELECT_BADGE_PALETTE_SIZE;
};

// packages/render/table/RowContextMenu.tsx
var import_react2 = __toESM(require_react(), 1);

// packages/render/table/popupUtils.ts
var VIEWPORT_MARGIN = 8;
var POPUP_ANCHOR_GAP = 4;
var clampToViewport = (value, size, viewport, margin) => Math.min(Math.max(margin, value), Math.max(margin, viewport - size - margin));
var computePopupPosition = ({
  anchor,
  popup,
  viewport,
  mode,
  gap = POPUP_ANCHOR_GAP,
  margin = VIEWPORT_MARGIN
}) => {
  const left = clampToViewport(anchor.left, popup.width, viewport.width, margin);
  if (mode === "point") {
    return {
      top: clampToViewport(anchor.top, popup.height, viewport.height, margin),
      left
    };
  }
  const belowTop = anchor.top + anchor.height + gap;
  const flipUp = belowTop + popup.height > viewport.height;
  const top = flipUp ? Math.max(margin, anchor.top - gap - popup.height) : belowTop;
  return { top, left };
};

// packages/render/table/usePopupBehavior.ts
var import_react = __toESM(require_react(), 1);
var usePopupDismiss = (popupRef, onClose, options) => {
  const shouldIgnoreEscapeRef = (0, import_react.useRef)(options?.shouldIgnoreEscape);
  (0, import_react.useEffect)(() => {
    shouldIgnoreEscapeRef.current = options?.shouldIgnoreEscape;
  });
  (0, import_react.useEffect)(() => {
    const handlePointerDown = (event) => {
      if (!(event.target instanceof Node)) {
        onClose();
        return;
      }
      const popup = popupRef.current;
      if (popup && popup.contains(event.target)) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (shouldIgnoreEscapeRef.current?.(event)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    const handleScrollOrResize = (event) => {
      if (!(event.target instanceof Node)) {
        onClose();
        return;
      }
      if (event.type === "scroll" && popupRef.current?.contains(event.target)) {
        return;
      }
      onClose();
    };
    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [onClose]);
};
var useActiveItemNavigation = ({
  itemCount,
  initialIndex,
  onSelect,
  onClose,
  enableSpace = false,
  itemIdInfix = "item"
}) => {
  const containerRef = (0, import_react.useRef)(null);
  const [activeIndex, setActiveIndex] = (0, import_react.useState)(initialIndex);
  const instanceId = (0, import_react.useId)();
  const itemId = (index) => `${instanceId}-${itemIdInfix}-${index}`;
  (0, import_react.useEffect)(() => {
    containerRef.current?.focus();
  }, []);
  (0, import_react.useEffect)(() => {
    document.getElementById(itemId(activeIndex))?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);
  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (itemCount <= 0) return;
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((prev) => (prev + delta + itemCount) % itemCount);
      return;
    }
    if (event.key === "Enter" || enableSpace && event.key === " ") {
      if (itemCount <= 0) return;
      event.preventDefault();
      onSelect(activeIndex);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      onClose();
    }
  };
  return { activeIndex, setActiveIndex, itemId, handleKeyDown, containerRef };
};

// packages/render/table/RowContextMenu.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var MENU_WIDTH = 180;
var ITEM_HEIGHT = 28;
var SEPARATOR_HEIGHT = 9;
var MENU_VERTICAL_PADDING = 8;
var RowContextMenu = ({
  x,
  y,
  onInsertAbove,
  onInsertBelow,
  onDelete,
  onClose
}) => {
  const items = (0, import_react2.useMemo)(
    () => [
      {
        key: "insertAbove",
        label: "\u5728\u4E0A\u65B9\u63D2\u5165\u4E00\u884C",
        icon: LuArrowUp,
        action: onInsertAbove
      },
      {
        key: "insertBelow",
        label: "\u5728\u4E0B\u65B9\u63D2\u5165\u4E00\u884C",
        icon: LuArrowDown,
        action: onInsertBelow
      },
      {
        key: "delete",
        label: "\u5220\u9664\u884C",
        icon: LuTrash2,
        danger: true,
        action: onDelete
      }
    ],
    [onDelete, onInsertAbove, onInsertBelow]
  );
  const { activeIndex, setActiveIndex, itemId, handleKeyDown, containerRef } = useActiveItemNavigation({
    itemCount: items.length,
    initialIndex: 0,
    onSelect: (index) => items[index]?.action(),
    onClose,
    enableSpace: true,
    itemIdInfix: "item"
  });
  usePopupDismiss(containerRef, onClose);
  const estimatedMenuHeight = items.length * ITEM_HEIGHT + SEPARATOR_HEIGHT + MENU_VERTICAL_PADDING;
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const { top, left } = computePopupPosition({
    anchor: { top: y, left: x, width: 0, height: 0 },
    popup: { width: MENU_WIDTH, height: estimatedMenuHeight },
    viewport: { width: viewportWidth, height: viewportHeight },
    mode: "point"
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      ref: containerRef,
      role: "menu",
      "aria-label": "\u884C\u64CD\u4F5C",
      "aria-activedescendant": itemId(activeIndex),
      tabIndex: -1,
      className: "table-page__row-context-menu",
      style: { top, left },
      onKeyDown: handleKeyDown,
      children: items.map((item, index) => {
        const Icon = item.icon;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react2.default.Fragment, { children: [
          item.danger && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              role: "separator",
              className: "table-page__row-context-menu-separator"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              id: itemId(index),
              type: "button",
              role: "menuitem",
              className: "table-page__row-context-menu-item" + (item.danger ? " table-page__row-context-menu-item--danger" : "") + (index === activeIndex ? " table-page__row-context-menu-item--active" : ""),
              onMouseEnter: () => setActiveIndex(index),
              onClick: () => item.action(),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 14, "aria-hidden": "true" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label })
              ]
            }
          )
        ] }, item.key);
      })
    }
  );
};
var RowContextMenu_default = RowContextMenu;

// packages/render/table/SelectCellEditor.tsx
var import_react3 = __toESM(require_react(), 1);
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var OPTION_HEIGHT = 32;
var LIST_VERTICAL_PADDING = 8;
var MAX_LIST_HEIGHT = 260;
var MIN_LIST_WIDTH = 160;
var SelectCellEditor = ({
  anchor,
  options,
  currentValue,
  onSelect,
  onCreateOption,
  onClose
}) => {
  const createInputRef = (0, import_react3.useRef)(null);
  const itemCount = options.length + (onCreateOption ? 2 : 1);
  const createIndex = onCreateOption ? options.length : -1;
  const clearIndex = options.length + (onCreateOption ? 1 : 0);
  const [creating, setCreating] = (0, import_react3.useState)(false);
  const [createValue, setCreateValue] = (0, import_react3.useState)("");
  const selectIndex = (0, import_react3.useCallback)(
    (index) => {
      if (index === createIndex) {
        setCreating(true);
        return;
      }
      onSelect(index === clearIndex ? "" : options[index] ?? "");
    },
    [clearIndex, createIndex, onSelect, options]
  );
  const { activeIndex, setActiveIndex, itemId, handleKeyDown, containerRef } = useActiveItemNavigation({
    itemCount,
    initialIndex: () => {
      const current = options.indexOf(currentValue);
      return current >= 0 ? current : 0;
    },
    onSelect: selectIndex,
    onClose,
    itemIdInfix: "opt"
  });
  usePopupDismiss(containerRef, onClose, {
    shouldIgnoreEscape: () => creating
  });
  (0, import_react3.useEffect)(() => {
    if (creating) {
      createInputRef.current?.focus();
    }
  }, [creating]);
  const estimatedHeight = Math.min(
    MAX_LIST_HEIGHT,
    itemCount * OPTION_HEIGHT + LIST_VERTICAL_PADDING
  );
  const width = Math.max(anchor.width, MIN_LIST_WIDTH);
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const { top, left } = computePopupPosition({
    anchor,
    popup: { width, height: estimatedHeight },
    viewport: { width: viewportWidth, height: viewportHeight },
    mode: "below"
  });
  const handleCreateKeyDown = (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      const value = createValue.trim();
      setCreating(false);
      setCreateValue("");
      if (value) {
        onCreateOption?.(value);
      } else {
        containerRef.current?.focus();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setCreating(false);
      setCreateValue("");
      containerRef.current?.focus();
    }
    if (event.key === "Tab") {
      event.preventDefault();
      onClose();
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      ref: containerRef,
      role: "listbox",
      "aria-label": "\u9009\u62E9\u9009\u9879",
      "aria-activedescendant": itemId(activeIndex),
      tabIndex: -1,
      className: "table-page__select-editor",
      style: { top, left, width, maxHeight: MAX_LIST_HEIGHT },
      onKeyDown: (event) => {
        if (creating) return;
        handleKeyDown(event);
      },
      children: [
        options.map((option, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            id: itemId(index),
            type: "button",
            role: "option",
            "aria-selected": option === currentValue,
            className: "table-page__select-editor-option" + (index === activeIndex ? " table-page__select-editor-option--active" : ""),
            onMouseEnter: () => setActiveIndex(index),
            onClick: () => selectIndex(index),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "table-page__select-editor-option-text", children: option }),
              option === currentValue && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCheck, { size: 14, "aria-hidden": "true" })
            ]
          },
          option
        )),
        onCreateOption && (creating ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "div",
          {
            id: itemId(createIndex),
            className: "table-page__select-editor-create",
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                ref: createInputRef,
                type: "text",
                className: "table-page__select-editor-create-input",
                placeholder: "\u65B0\u9009\u9879\u540D\u79F0",
                value: createValue,
                onChange: (event) => setCreateValue(event.target.value),
                onKeyDown: handleCreateKeyDown
              }
            )
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            id: itemId(createIndex),
            type: "button",
            role: "option",
            "aria-selected": false,
            className: "table-page__select-editor-option table-page__select-editor-option--create" + (activeIndex === createIndex ? " table-page__select-editor-option--active" : ""),
            onMouseEnter: () => setActiveIndex(createIndex),
            onClick: () => selectIndex(createIndex),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPlus, { size: 14, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "table-page__select-editor-option-text", children: "\u65B0\u5EFA\u9009\u9879" })
            ]
          }
        )),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            id: itemId(clearIndex),
            type: "button",
            role: "option",
            "aria-selected": currentValue === "",
            className: "table-page__select-editor-option table-page__select-editor-option--clear" + (activeIndex === clearIndex ? " table-page__select-editor-option--active" : ""),
            onMouseEnter: () => setActiveIndex(clearIndex),
            onClick: () => selectIndex(clearIndex),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "table-page__select-editor-option-text", children: "\u6E05\u9664" }),
              currentValue === "" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCheck, { size: 14, "aria-hidden": "true" })
            ]
          }
        )
      ]
    }
  );
};
var SelectCellEditor_default = SelectCellEditor;

// packages/render/table/tableView.ts
var NOLO_TASK_BOARD_TABLE_ID = "01KWSK4Q4TESXQ06SW39JN2TTJ";
var EMPTY_TABLE_COLUMNS = [];
var GRID_DISPLAY_MODE = { type: "grid" };
var TASK_BOARD_STATUS_ORDER = [
  "\u5F85\u529E",
  "\u8FDB\u884C\u4E2D",
  "\u7B49\u5F85\u786E\u8BA4",
  "\u5DF2\u5B8C\u6210"
];
function normalizeKanbanStatusValue(status) {
  const val = String(status ?? "").trim();
  if (!val || val === "\u672A\u5206\u7C7B" || val === "\u5F85\u5904\u7406") {
    return "\u5F85\u529E";
  }
  return val;
}
var ACTIVITY_STATUS_LABELS = {
  pending: "\u7B49\u5F85\u4E2D",
  queued: "\u7B49\u5F85\u4E2D",
  accepted: "\u5DF2\u63A5\u6536",
  running: "\u8FD0\u884C\u4E2D",
  completed: "\u5DF2\u5B8C\u6210",
  failed: "\u5931\u8D25",
  failed_to_start: "\u542F\u52A8\u5931\u8D25",
  timed_out: "\u8D85\u65F6"
};
function findColumnById(columns, columnId) {
  if (!columnId) return null;
  return columns.find((column) => column.id === columnId) ?? null;
}
function findColumnByName(columns, columnName) {
  return columns.find((column) => column.name === columnName) ?? null;
}
function findColumnByNameOrLabel(columns, candidates) {
  const normalizedCandidates = candidates.map((candidate) => candidate.trim());
  return columns.find((column) => normalizedCandidates.includes(column.name)) ?? columns.find(
    (column) => typeof column.label === "string" && normalizedCandidates.includes(column.label.trim())
  ) ?? null;
}
function visibleNamesFromView(columns, view) {
  if (!Array.isArray(view.visibleColumnIds) || view.visibleColumnIds.length === 0) {
    return columns.map((column) => column.name);
  }
  const names = view.visibleColumnIds.map((columnId) => findColumnById(columns, columnId)?.name).filter((name) => Boolean(name));
  return names.length > 0 ? names : columns.map((column) => column.name);
}
function valuesForGroupColumn(column) {
  if (Array.isArray(column.options) && column.options.length > 0) {
    return column.options;
  }
  if (column.name === "status") {
    return TASK_BOARD_STATUS_ORDER;
  }
  return [];
}
function getColumnFilterOptions(column, rows) {
  return resolveSelectOptions(column, rows);
}
function normalizeActivityRef(value) {
  if (!isRecord(value)) return null;
  if (value.type !== "dialog") return null;
  const dialogId = asTrimmedString(value.dialogId);
  if (!dialogId) return null;
  const dialogKey = asOptionalTrimmedString(value.dialogKey);
  const status = asOptionalTrimmedString(value.status);
  return { dialogId, dialogKey, status };
}
function activityTone(status) {
  if (status === "running") return "running";
  if (status === "completed") return "success";
  if (status === "failed" || status === "failed_to_start" || status === "timed_out") {
    return "danger";
  }
  return "neutral";
}
function shortDialogId(dialogId) {
  return dialogId.length > 10 ? `${dialogId.slice(0, 6)}\u2026${dialogId.slice(-4)}` : dialogId;
}
function getLatestTableActivityBadge(row) {
  const meta = row?.meta;
  const metaRecord = isRecord(meta) ? meta : null;
  if (!metaRecord) return null;
  const latest = normalizeActivityRef(metaRecord.latestActivityRef) ?? (Array.isArray(metaRecord.activityRefs) ? normalizeActivityRef(metaRecord.activityRefs[metaRecord.activityRefs.length - 1]) : null);
  if (!latest) return null;
  const statusLabel = latest.status ? ACTIVITY_STATUS_LABELS[latest.status] ?? latest.status : "\u5BF9\u8BDD";
  return {
    ...latest,
    label: `${statusLabel} \xB7 ${shortDialogId(latest.dialogId)}`,
    title: `Dialog ${latest.dialogId}${latest.status ? ` \xB7 ${statusLabel}` : ""}`,
    tone: activityTone(latest.status)
  };
}
var MARKDOWN_TABLE_SEPARATOR_CELL = /^:?-{3,}:?$/;
function markdownTableCellCount(line) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return 0;
  const content = trimmed.startsWith("|") && trimmed.endsWith("|") ? trimmed.slice(1, -1) : trimmed;
  const cells = content.split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => cell.length > 0) ? cells.length : 0;
}
function isMarkdownTableSeparator(line) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const content = trimmed.startsWith("|") && trimmed.endsWith("|") ? trimmed.slice(1, -1) : trimmed;
  const cells = content.split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => MARKDOWN_TABLE_SEPARATOR_CELL.test(cell));
}
function containsMarkdownTable(value) {
  const lines = value.split(/\r?\n/);
  for (let index = 1; index < lines.length; index += 1) {
    if (!isMarkdownTableSeparator(lines[index])) continue;
    const headerCellCount = markdownTableCellCount(lines[index - 1]);
    if (headerCellCount < 2) continue;
    const separatorCellCount = markdownTableCellCount(lines[index]);
    if (separatorCellCount === headerCellCount) return true;
  }
  return false;
}
function shouldRenderKanbanMarkdownTable(tableId, value) {
  return tableId === NOLO_TASK_BOARD_TABLE_ID && containsMarkdownTable(value);
}
function resolveTableDisplayMode(tableMeta) {
  const columns = Array.isArray(tableMeta.columns) ? tableMeta.columns : [];
  const views = Array.isArray(tableMeta.views) ? tableMeta.views : [];
  const defaultView = views.find((view) => view.isDefault) ?? views[0];
  if (defaultView?.type === "kanban") {
    const groupColumn = findColumnById(columns, defaultView.group?.columnId);
    if (groupColumn) {
      return {
        type: "kanban",
        viewName: defaultView.name || "\u770B\u677F",
        groupColumnName: groupColumn.name,
        visibleColumnNames: visibleNamesFromView(columns, defaultView),
        preferredGroupValues: valuesForGroupColumn(groupColumn)
      };
    }
  }
  if (tableMeta.tableId === NOLO_TASK_BOARD_TABLE_ID) {
    const statusColumn = findColumnByName(columns, "status");
    if (statusColumn) {
      return {
        type: "kanban",
        viewName: "\u770B\u677F",
        groupColumnName: statusColumn.name,
        visibleColumnNames: ["title", "tags", "priority", "owner", "progress", "result"].filter(
          (name) => Boolean(findColumnByName(columns, name))
        ),
        preferredGroupValues: TASK_BOARD_STATUS_ORDER
      };
    }
  }
  return { type: "grid" };
}

// packages/render/table/LongTextDialog.tsx
var import_react4 = __toESM(require_react(), 1);
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
var LongTextDialog = ({
  payload,
  onClose,
  onSave
}) => {
  const [draft, setDraft] = (0, import_react4.useState)("");
  (0, import_react4.useEffect)(() => {
    if (payload) {
      setDraft(payload.value ?? "");
    } else {
      setDraft("");
    }
  }, [payload]);
  const handleCancel = () => {
    onClose();
  };
  const handleSave = () => {
    if (!payload) return;
    const { dbKey, columnName, value: oldValue } = payload;
    if (draft === String(oldValue ?? "")) {
      onClose();
      return;
    }
    onSave({ dbKey, columnName, value: draft });
    onClose();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    Dialog,
    {
      isOpen: !!payload,
      onClose: handleCancel,
      size: "xlarge",
      title: payload ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", flexDirection: "column" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
          payload.columnLabel,
          " "
        ] }),
        payload.rowTitle && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "span",
          {
            style: {
              fontSize: "var(--fontSize-sm)",
              color: "var(--textTertiary)",
              marginTop: 2
            },
            children: payload.rowTitle
          }
        )
      ] }) : null,
      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minHeight: 260
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "textarea",
              {
                value: draft,
                onChange: (e) => setDraft(e.target.value),
                "aria-label": payload?.columnLabel ?? "Long text",
                style: {
                  flex: 1,
                  width: "100%",
                  minHeight: 220,
                  resize: "vertical",
                  fontFamily: "inherit",
                  fontSize: "var(--fontSize-base)",
                  lineHeight: "var(--leading-relaxed)",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--backgroundSecondary)",
                  color: "var(--text)",
                  outline: "none"
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 4
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Button_default, { variant: "ghost", size: "small", onClick: handleCancel, children: "\u53D6\u6D88" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Button_default, { variant: "primary", size: "small", onClick: handleSave, children: "\u4FDD\u5B58" })
                ]
              }
            )
          ]
        }
      )
    }
  );
};
var LongTextDialog_default = LongTextDialog;

// node_modules/@tanstack/react-table/dist/FlexRender.js
var import_react5 = __toESM(require_react(), 1);
function isReactComponent(component) {
  return isClassComponent(component) || typeof component === "function" || isExoticComponent(component);
}
function isClassComponent(component) {
  return typeof component === "function" && (() => {
    const proto = Object.getPrototypeOf(component);
    return proto.prototype && proto.prototype.isReactComponent;
  })();
}
function isExoticComponent(component) {
  return typeof component === "object" && typeof component.$$typeof === "symbol" && ["react.memo", "react.forward_ref"].includes(component.$$typeof.description);
}
function flexRender(Comp, props) {
  if (Comp === null || Comp === void 0) return null;
  return isReactComponent(Comp) ? /* @__PURE__ */ import_react5.default.createElement(Comp, props) : Comp;
}
function FlexRender(props) {
  if ("cell" in props && props.cell) {
    const cell = props.cell;
    const def = cell.column.columnDef;
    const groupingCell = cell;
    const groupingDef = def;
    if (groupingCell.getIsAggregated?.()) return flexRender(groupingDef.aggregatedCell ?? def.cell, cell.getContext());
    if (groupingCell.getIsPlaceholder?.()) return null;
    return flexRender(def.cell, cell.getContext());
  }
  if ("header" in props && props.header) return flexRender(props.header.column.columnDef.header, props.header.getContext());
  if ("footer" in props && props.footer) return flexRender(props.footer.column.columnDef.footer, props.footer.getContext());
  return null;
}

// node_modules/@tanstack/store/dist/alien.js
var ReactiveFlags = /* @__PURE__ */ function(ReactiveFlags2) {
  ReactiveFlags2[ReactiveFlags2["None"] = 0] = "None";
  ReactiveFlags2[ReactiveFlags2["Mutable"] = 1] = "Mutable";
  ReactiveFlags2[ReactiveFlags2["Watching"] = 2] = "Watching";
  ReactiveFlags2[ReactiveFlags2["RecursedCheck"] = 4] = "RecursedCheck";
  ReactiveFlags2[ReactiveFlags2["Recursed"] = 8] = "Recursed";
  ReactiveFlags2[ReactiveFlags2["Dirty"] = 16] = "Dirty";
  ReactiveFlags2[ReactiveFlags2["Pending"] = 32] = "Pending";
  return ReactiveFlags2;
}({});
// @__NO_SIDE_EFFECTS__
function createReactiveSystem({ update, notify, unwatched }) {
  return {
    link: link2,
    unlink: unlink2,
    propagate: propagate2,
    checkDirty: checkDirty2,
    shallowPropagate: shallowPropagate2
  };
  function link2(dep, sub, version) {
    const prevDep = sub.depsTail;
    if (prevDep !== void 0 && prevDep.dep === dep) return;
    const nextDep = prevDep !== void 0 ? prevDep.nextDep : sub.deps;
    if (nextDep !== void 0 && nextDep.dep === dep) {
      nextDep.version = version;
      sub.depsTail = nextDep;
      return;
    }
    const prevSub = dep.subsTail;
    if (prevSub !== void 0 && prevSub.version === version && prevSub.sub === sub) return;
    const newLink = sub.depsTail = dep.subsTail = {
      version,
      dep,
      sub,
      prevDep,
      nextDep,
      prevSub,
      nextSub: void 0
    };
    if (nextDep !== void 0) nextDep.prevDep = newLink;
    if (prevDep !== void 0) prevDep.nextDep = newLink;
    else sub.deps = newLink;
    if (prevSub !== void 0) prevSub.nextSub = newLink;
    else dep.subs = newLink;
  }
  function unlink2(link3, sub = link3.sub) {
    const dep = link3.dep;
    const prevDep = link3.prevDep;
    const nextDep = link3.nextDep;
    const nextSub = link3.nextSub;
    const prevSub = link3.prevSub;
    if (nextDep !== void 0) nextDep.prevDep = prevDep;
    else sub.depsTail = prevDep;
    if (prevDep !== void 0) prevDep.nextDep = nextDep;
    else sub.deps = nextDep;
    if (nextSub !== void 0) nextSub.prevSub = prevSub;
    else dep.subsTail = prevSub;
    if (prevSub !== void 0) prevSub.nextSub = nextSub;
    else if ((dep.subs = nextSub) === void 0) unwatched(dep);
    return nextDep;
  }
  function propagate2(link3) {
    let next = link3.nextSub;
    let stack;
    top: do {
      const sub = link3.sub;
      let flags = sub.flags;
      if (!(flags & (ReactiveFlags.RecursedCheck | ReactiveFlags.Recursed | ReactiveFlags.Dirty | ReactiveFlags.Pending))) sub.flags = flags | ReactiveFlags.Pending;
      else if (!(flags & (ReactiveFlags.RecursedCheck | ReactiveFlags.Recursed))) flags = ReactiveFlags.None;
      else if (!(flags & ReactiveFlags.RecursedCheck)) sub.flags = flags & ~ReactiveFlags.Recursed | ReactiveFlags.Pending;
      else if (!(flags & (ReactiveFlags.Dirty | ReactiveFlags.Pending)) && isValidLink(link3, sub)) {
        sub.flags = flags | (ReactiveFlags.Recursed | ReactiveFlags.Pending);
        flags &= ReactiveFlags.Mutable;
      } else flags = ReactiveFlags.None;
      if (flags & ReactiveFlags.Watching) notify(sub);
      if (flags & ReactiveFlags.Mutable) {
        const subSubs = sub.subs;
        if (subSubs !== void 0) {
          const nextSub = (link3 = subSubs).nextSub;
          if (nextSub !== void 0) {
            stack = {
              value: next,
              prev: stack
            };
            next = nextSub;
          }
          continue;
        }
      }
      if ((link3 = next) !== void 0) {
        next = link3.nextSub;
        continue;
      }
      while (stack !== void 0) {
        link3 = stack.value;
        stack = stack.prev;
        if (link3 !== void 0) {
          next = link3.nextSub;
          continue top;
        }
      }
      break;
    } while (true);
  }
  function checkDirty2(link3, sub) {
    let stack;
    let checkDepth = 0;
    let dirty = false;
    top: do {
      const dep = link3.dep;
      const flags = dep.flags;
      if (sub.flags & ReactiveFlags.Dirty) dirty = true;
      else if ((flags & (ReactiveFlags.Mutable | ReactiveFlags.Dirty)) === (ReactiveFlags.Mutable | ReactiveFlags.Dirty)) {
        if (update(dep)) {
          const subs = dep.subs;
          if (subs.nextSub !== void 0) shallowPropagate2(subs);
          dirty = true;
        }
      } else if ((flags & (ReactiveFlags.Mutable | ReactiveFlags.Pending)) === (ReactiveFlags.Mutable | ReactiveFlags.Pending)) {
        if (link3.nextSub !== void 0 || link3.prevSub !== void 0) stack = {
          value: link3,
          prev: stack
        };
        link3 = dep.deps;
        sub = dep;
        ++checkDepth;
        continue;
      }
      if (!dirty) {
        const nextDep = link3.nextDep;
        if (nextDep !== void 0) {
          link3 = nextDep;
          continue;
        }
      }
      while (checkDepth--) {
        const firstSub = sub.subs;
        const hasMultipleSubs = firstSub.nextSub !== void 0;
        if (hasMultipleSubs) {
          link3 = stack.value;
          stack = stack.prev;
        } else link3 = firstSub;
        if (dirty) {
          if (update(sub)) {
            if (hasMultipleSubs) shallowPropagate2(firstSub);
            sub = link3.sub;
            continue;
          }
          dirty = false;
        } else sub.flags &= ~ReactiveFlags.Pending;
        sub = link3.sub;
        const nextDep = link3.nextDep;
        if (nextDep !== void 0) {
          link3 = nextDep;
          continue top;
        }
      }
      return dirty;
    } while (true);
  }
  function shallowPropagate2(link3) {
    do {
      const sub = link3.sub;
      const flags = sub.flags;
      if ((flags & (ReactiveFlags.Pending | ReactiveFlags.Dirty)) === ReactiveFlags.Pending) {
        sub.flags = flags | ReactiveFlags.Dirty;
        if ((flags & (ReactiveFlags.Watching | ReactiveFlags.RecursedCheck)) === ReactiveFlags.Watching) notify(sub);
      }
    } while ((link3 = link3.nextSub) !== void 0);
  }
  function isValidLink(checkLink, sub) {
    let link3 = sub.depsTail;
    while (link3 !== void 0) {
      if (link3 === checkLink) return true;
      link3 = link3.prevDep;
    }
    return false;
  }
}

// node_modules/@tanstack/store/dist/atom.js
function toObserver(nextHandler, errorHandler, completionHandler) {
  const isObserver = typeof nextHandler === "object";
  const self = isObserver ? nextHandler : void 0;
  return {
    next: (isObserver ? nextHandler.next : nextHandler)?.bind(self),
    error: (isObserver ? nextHandler.error : errorHandler)?.bind(self),
    complete: (isObserver ? nextHandler.complete : completionHandler)?.bind(self)
  };
}
var queuedEffects = [];
var cycle = 0;
var { link, unlink, propagate, checkDirty, shallowPropagate } = /* @__PURE__ */ createReactiveSystem({
  update(atom) {
    return atom._update();
  },
  notify(effect2) {
    queuedEffects[queuedEffectsLength++] = effect2;
    effect2.flags &= ~ReactiveFlags.Watching;
  },
  unwatched(atom) {
    if (atom.depsTail !== void 0) {
      atom.depsTail = void 0;
      atom.flags = ReactiveFlags.Mutable | ReactiveFlags.Dirty;
      purgeDeps(atom);
    }
  }
});
var notifyIndex = 0;
var queuedEffectsLength = 0;
var activeSub;
var batchDepth = 0;
function batch(fn) {
  try {
    ++batchDepth;
    fn();
  } finally {
    if (!--batchDepth) flush();
  }
}
function purgeDeps(sub) {
  const depsTail = sub.depsTail;
  let dep = depsTail !== void 0 ? depsTail.nextDep : sub.deps;
  while (dep !== void 0) dep = unlink(dep, sub);
}
function flush() {
  if (batchDepth > 0) return;
  while (notifyIndex < queuedEffectsLength) {
    const effect2 = queuedEffects[notifyIndex];
    queuedEffects[notifyIndex++] = void 0;
    effect2.notify();
  }
  notifyIndex = 0;
  queuedEffectsLength = 0;
}
function createAtom(valueOrFn, options) {
  const isComputed = typeof valueOrFn === "function";
  const getter = valueOrFn;
  const atom = {
    _snapshot: isComputed ? void 0 : valueOrFn,
    subs: void 0,
    subsTail: void 0,
    deps: void 0,
    depsTail: void 0,
    flags: isComputed ? ReactiveFlags.None : ReactiveFlags.Mutable,
    get() {
      if (activeSub !== void 0) link(atom, activeSub, cycle);
      return atom._snapshot;
    },
    subscribe(observerOrFn) {
      const obs = toObserver(observerOrFn);
      const observed = { current: false };
      const e = effect(() => {
        atom.get();
        if (!observed.current) observed.current = true;
        else obs.next?.(atom._snapshot);
      });
      return { unsubscribe: () => {
        e.stop();
      } };
    },
    _update(getValue) {
      const prevSub = activeSub;
      const compare = options?.compare ?? Object.is;
      if (isComputed) {
        activeSub = atom;
        ++cycle;
        atom.depsTail = void 0;
      } else if (getValue === void 0) return false;
      if (isComputed) atom.flags = ReactiveFlags.Mutable | ReactiveFlags.RecursedCheck;
      try {
        const oldValue = atom._snapshot;
        const newValue = typeof getValue === "function" ? getValue(oldValue) : getValue === void 0 && isComputed ? getter(oldValue) : getValue;
        if (oldValue === void 0 || !compare(oldValue, newValue)) {
          atom._snapshot = newValue;
          return true;
        }
        return false;
      } finally {
        activeSub = prevSub;
        if (isComputed) atom.flags &= ~ReactiveFlags.RecursedCheck;
        purgeDeps(atom);
      }
    }
  };
  if (isComputed) {
    atom.flags = ReactiveFlags.Mutable | ReactiveFlags.Dirty;
    atom.get = function() {
      const flags = atom.flags;
      if (flags & ReactiveFlags.Dirty || flags & ReactiveFlags.Pending && checkDirty(atom.deps, atom)) {
        if (atom._update()) {
          const subs = atom.subs;
          if (subs !== void 0) shallowPropagate(subs);
        }
      } else if (flags & ReactiveFlags.Pending) atom.flags = flags & ~ReactiveFlags.Pending;
      if (activeSub !== void 0) link(atom, activeSub, cycle);
      return atom._snapshot;
    };
  } else atom.set = function(valueOrFn2) {
    if (atom._update(valueOrFn2)) {
      const subs = atom.subs;
      if (subs !== void 0) {
        propagate(subs);
        shallowPropagate(subs);
        flush();
      }
    }
  };
  return atom;
}
function effect(fn) {
  const run = () => {
    const prevSub = activeSub;
    activeSub = effectObj;
    ++cycle;
    effectObj.depsTail = void 0;
    effectObj.flags = ReactiveFlags.Watching | ReactiveFlags.RecursedCheck;
    try {
      return fn();
    } finally {
      activeSub = prevSub;
      effectObj.flags &= ~ReactiveFlags.RecursedCheck;
      purgeDeps(effectObj);
    }
  };
  const effectObj = {
    deps: void 0,
    depsTail: void 0,
    subs: void 0,
    subsTail: void 0,
    flags: ReactiveFlags.Watching | ReactiveFlags.RecursedCheck,
    notify() {
      const flags = this.flags;
      if (flags & ReactiveFlags.Dirty || flags & ReactiveFlags.Pending && checkDirty(this.deps, this)) run();
      else this.flags = ReactiveFlags.Watching;
    },
    stop() {
      this.flags = ReactiveFlags.None;
      this.depsTail = void 0;
      purgeDeps(this);
    }
  };
  run();
  return effectObj;
}

// node_modules/@tanstack/store/dist/shallow.js
function shallow(objA, objB) {
  if (Object.is(objA, objB)) return true;
  if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) return false;
  if (objA instanceof Map && objB instanceof Map) {
    if (objA.size !== objB.size) return false;
    for (const [k, v] of objA) if (!objB.has(k) || !Object.is(v, objB.get(k))) return false;
    return true;
  }
  if (objA instanceof Set && objB instanceof Set) {
    if (objA.size !== objB.size) return false;
    for (const v of objA) if (!objB.has(v)) return false;
    return true;
  }
  if (objA instanceof Date && objB instanceof Date) {
    if (objA.getTime() !== objB.getTime()) return false;
    return true;
  }
  const keysA = getOwnKeys(objA);
  if (keysA.length !== getOwnKeys(objB).length) return false;
  for (let i = 0; i < keysA.length; i++) if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) return false;
  return true;
}
function getOwnKeys(obj) {
  return Object.keys(obj).concat(Object.getOwnPropertySymbols(obj));
}

// node_modules/@tanstack/react-store/dist/useSelector.js
var import_react6 = __toESM(require_react(), 1);
var import_with_selector = __toESM(require_with_selector(), 1);
function defaultCompare(a, b) {
  return a === b;
}
function useSelector(source, selector = (s) => s, options) {
  const compare = options?.compare ?? defaultCompare;
  const subscribe = (0, import_react6.useCallback)((handleStoreChange) => {
    const { unsubscribe } = source.subscribe(handleStoreChange);
    return unsubscribe;
  }, [source]);
  const getSnapshot = (0, import_react6.useCallback)(() => source.get(), [source]);
  return (0, import_with_selector.useSyncExternalStoreWithSelector)(subscribe, getSnapshot, getSnapshot, selector, compare);
}

// node_modules/@tanstack/react-table/dist/Subscribe.js
function Subscribe(props) {
  const selected = useSelector(props.source, props.selector, { compare: shallow });
  return typeof props.children === "function" ? props.children(selected) : props.children;
}

// node_modules/@tanstack/table-core/dist/core/reactivity/coreReactivityFeature.utils.js
function atomToStore(atom) {
  const store = atom;
  Object.defineProperty(atom, "state", { get() {
    return atom.get();
  } });
  if ("set" in atom) store.setState = atom.set.bind(atom);
  return store;
}

// node_modules/@tanstack/table-core/dist/core/reactivity/renderPhaseReactivity.js
function renderPhaseReactivity(primitives) {
  const { createAtom: createAtom2, batch: batch2 } = primitives;
  const commitAtom = createAtom2(0);
  return {
    createOptionsStore: false,
    wrapExternalAtoms: false,
    addSubscription: () => {
      throw new Error("Feature not supported in current reactivity implementation");
    },
    unmount: () => {
      throw new Error("Feature not supported in current reactivity implementation");
    },
    schedule: primitives.schedule ?? ((fn) => queueMicrotask(fn)),
    batch: batch2,
    untrack: (fn) => fn(),
    createReadonlyAtom: (fn, atomOptions) => {
      const compare = atomOptions?.compare ?? Object.is;
      let hasSnapshot = false;
      let snapshot;
      const getSnapshot = () => {
        const nextSnapshot = fn();
        if (!hasSnapshot || !compare(snapshot, nextSnapshot)) {
          snapshot = nextSnapshot;
          hasSnapshot = true;
        }
        return snapshot;
      };
      const reactiveAtom = createAtom2(() => {
        commitAtom.get();
        return getSnapshot();
      }, { compare });
      return {
        get: getSnapshot,
        subscribe: reactiveAtom.subscribe.bind(reactiveAtom)
      };
    },
    createWritableAtom: (value, atomOptions) => {
      return createAtom2(value, { compare: atomOptions?.compare });
    },
    commit: () => {
      commitAtom.set((version) => version + 1);
    }
  };
}
function createRenderPhaseSource(source, compare = Object.is) {
  let hasCommittedSnapshot = false;
  let committedSnapshot;
  return {
    get: source.get,
    markCommitted: (snapshot) => {
      committedSnapshot = snapshot;
      hasCommittedSnapshot = true;
    },
    subscribe: (listener) => source.subscribe((value) => {
      if (!hasCommittedSnapshot || !compare(committedSnapshot, value)) listener(value);
    })
  };
}

// node_modules/@tanstack/react-table/dist/reactivity.js
function reactReactivity() {
  return renderPhaseReactivity({
    createAtom,
    batch
  });
}

// node_modules/@tanstack/table-core/dist/utils.js
function functionalUpdate(updater, input) {
  return typeof updater === "function" ? updater(input) : updater;
}
function cloneState(value) {
  if (Array.isArray(value)) return value.map(cloneState);
  if (value && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    const copy = proto === null ? makeObjectMap() : {};
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      Object.defineProperty(copy, key, {
        configurable: true,
        enumerable: true,
        value: cloneState(value[key]),
        writable: true
      });
    }
    return copy;
  }
  return value;
}
function copyInstancePropertiesWithoutMemos(target, source) {
  const keys = Object.keys(source);
  const targetRecord = target;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!key.startsWith("_memo_") && key !== "_cellsCache") targetRecord[key] = source[key];
  }
  return target;
}
function makeObjectMap() {
  return /* @__PURE__ */ Object.create(null);
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
function makeStateUpdater(key, instance) {
  return (updater) => {
    (instance.options.atoms?.[key] ?? instance.baseAtoms[key]).set((old) => functionalUpdate(updater, old));
  };
}
function isFunction(d) {
  return d instanceof Function;
}
function flattenBy(arr, getChildren) {
  const flat = [];
  const recurse = (subArr) => {
    subArr.forEach((item) => {
      flat.push(item);
      const children = getChildren(item);
      if (children.length) recurse(children);
    });
  };
  recurse(arr);
  return flat;
}
var memo = ({ fn, memoDeps, onAfterCompare, onAfterUpdate, onBeforeCompare, onBeforeUpdate }) => {
  let deps = [];
  let result;
  const memoizedFn = (depArgs) => {
    onBeforeCompare?.();
    const newDeps = memoDeps?.(depArgs);
    let depsChanged = !newDeps || newDeps.length !== deps?.length;
    if (!depsChanged && newDeps) {
      for (let i = 0; i < newDeps.length; i++) if (newDeps[i] !== deps[i]) {
        depsChanged = true;
        break;
      }
    }
    onAfterCompare?.(depsChanged);
    if (!depsChanged) return result;
    deps = newDeps;
    onBeforeUpdate?.();
    result = fn(...newDeps ?? []);
    onAfterUpdate?.(result);
    return result;
  };
  return memoizedFn;
};
function skipFirstRun(fn) {
  let hasRun = false;
  return () => {
    if (!hasRun) {
      hasRun = true;
      return;
    }
    fn();
  };
}
var pad = (str, num) => {
  str = String(str);
  while (str.length < num) str = " " + str;
  return str;
};
function tableMemo({ feature, fnName, objectId, onAfterUpdate, table, ...memoOptions }) {
  let startCalcTime;
  let endCalcTime;
  let runCount = 0;
  let debug;
  if (true) {
    const { debugAll } = table.options;
    const { parentName } = getFunctionNameInfo(fnName, ".");
    const debugByParent = table.options[`debug${(parentName != "table" ? parentName + "s" : parentName).replace(parentName, parentName.charAt(0).toUpperCase() + parentName.slice(1))}`];
    const debugByFeature = feature ? table.options[`debug${feature.charAt(0).toUpperCase() + feature.slice(1)}`] : false;
    debug = debugAll || debugByParent || debugByFeature;
  }
  function logTime(time, depsChanged) {
    const runType = runCount === 0 ? "(1st run)" : depsChanged ? "(rerun #" + runCount + ")" : "(cache)";
    runCount++;
    console.groupCollapsed(`%c\u23F1 ${pad(`${time.toFixed(1)} ms`, 12)} %c${runType}%c ${fnName}%c ${objectId ? `(${fnName.split(".")[0]}Id: ${objectId})` : ""}`, `font-size: .6rem; font-weight: bold; ${depsChanged ? `color: hsl(
        ${Math.max(0, Math.min(120 - Math.log10(time) * 60, 120))}deg 100% 31%);` : ""} `, `color: ${runCount < 2 ? "#FF00FF" : "#FF1493"}`, "color: #666", "color: #87CEEB");
    console.info({
      feature,
      state: table.store.state,
      deps: memoOptions.memoDeps?.toString()
    });
    console.trace();
    console.groupEnd();
  }
  const onAfterUpdateHandler = () => {
    if (!onAfterUpdate) return;
    const { schedule, untrack } = table._reactivity;
    schedule(() => untrack(() => onAfterUpdate()));
  };
  const debugOptions = true ? {
    onBeforeCompare: () => {
    },
    onAfterCompare: (depsChanged) => {
    },
    onBeforeUpdate: () => {
      if (debug) startCalcTime = performance.now();
    },
    onAfterUpdate: () => {
      if (debug) {
        endCalcTime = performance.now();
        logTime(Math.round((endCalcTime - startCalcTime) * 100) / 100, true);
      }
      onAfterUpdateHandler();
    }
  } : { onAfterUpdate: () => {
    onAfterUpdateHandler();
  } };
  return memo({
    ...memoOptions,
    ...debugOptions
  });
}
function getFunctionNameInfo(staticFnName, splitBy = "_") {
  const [parentName, fnKey] = staticFnName.split(splitBy);
  return {
    fnKey,
    fnName: `${parentName}.${fnKey}`,
    parentName
  };
}
function assignTableAPIs(feature, table, apis) {
  for (const [staticFnName, { fn, memoDeps }] of Object.entries(apis)) {
    const { fnKey, fnName } = getFunctionNameInfo(staticFnName);
    table[fnKey] = memoDeps ? tableMemo({
      memoDeps,
      fn,
      fnName,
      table,
      feature
    }) : fn;
  }
}
function assignPrototypeAPIs(feature, prototype, table, apis) {
  for (const [staticFnName, { fn, memoDeps }] of Object.entries(apis)) {
    const { fnKey, fnName } = getFunctionNameInfo(staticFnName);
    if (memoDeps) {
      const memoKey = `_memo_${fnKey}`;
      prototype[fnKey] = function(...args) {
        if (!this[memoKey]) {
          const self = this;
          this[memoKey] = tableMemo({
            memoDeps: (depArgs) => memoDeps(self, depArgs),
            fn: (...deps) => fn(self, ...deps),
            fnName,
            objectId: self.id,
            table,
            feature
          });
        }
        return this[memoKey](...args);
      };
    } else prototype[fnKey] = function(...args) {
      return fn(this, ...args);
    };
  }
}
function callMemoOrStaticFn(obj, fnKey, staticFn, ...args) {
  return obj[fnKey]?.(...args) ?? staticFn(obj, ...args);
}

// node_modules/@tanstack/table-core/dist/core/cells/coreCellsFeature.utils.js
function cell_getValue(cell) {
  return cell.row.getValue(cell.column.id);
}
function cell_renderValue(cell) {
  return cell.getValue() ?? cell.table.options.renderFallbackValue;
}
function cell_getContext(cell) {
  return {
    table: cell.table,
    column: cell.column,
    row: cell.row,
    cell,
    getValue: () => cell.getValue(),
    renderValue: () => cell.renderValue()
  };
}

// node_modules/@tanstack/table-core/dist/core/cells/coreCellsFeature.js
var coreCellsFeature = { assignCellPrototype: (prototype, table) => {
  assignPrototypeAPIs("coreCellsFeature", prototype, table, {
    cell_getValue: { fn: (cell) => cell_getValue(cell) },
    cell_renderValue: { fn: (cell) => cell_renderValue(cell) },
    cell_getContext: {
      fn: (cell) => cell_getContext(cell),
      memoDeps: (cell) => [cell]
    }
  });
} };

// node_modules/@tanstack/table-core/dist/core/headers/constructHeader.js
function getHeaderPrototype(table) {
  if (!table._headerPrototype) {
    table._headerPrototype = { table };
    const features = Object.values(table._features);
    for (let i = 0; i < features.length; i++) features[i].assignHeaderPrototype?.(table._headerPrototype, table);
  }
  return table._headerPrototype;
}
function constructHeader(table, column, options) {
  const headerPrototype = getHeaderPrototype(table);
  const header = Object.create(headerPrototype);
  header.colSpan = 0;
  header.column = column;
  header.depth = options.depth;
  header.headerGroup = null;
  header.id = options.id ?? column.id;
  header.index = options.index;
  header.isPlaceholder = !!options.isPlaceholder;
  header.placeholderId = options.placeholderId;
  header.rowSpan = 0;
  header.subHeaders = [];
  const initFns = table._headerInstanceInitFns;
  for (let i = 0; i < initFns.length; i++) initFns[i](header);
  return header;
}

// node_modules/@tanstack/table-core/dist/features/column-pinning/columnPinningFeature.utils.js
function getDefaultColumnPinningState() {
  return {
    start: [],
    end: []
  };
}

// node_modules/@tanstack/table-core/dist/features/column-visibility/columnVisibilityFeature.utils.js
function column_getIsVisible(column) {
  const columnVisibility = column.table.atoms.columnVisibility?.get();
  if (!columnVisibility) return true;
  const childColumns = column.columns;
  if (childColumns.length) return childColumns.some((childColumn) => callMemoOrStaticFn(childColumn, "getIsVisible", column_getIsVisible));
  return (hasOwn(columnVisibility, column.id) ? columnVisibility[column.id] : void 0) ?? true;
}
function table_getVisibleLeafColumns(table) {
  return table.getAllLeafColumns().filter((column) => callMemoOrStaticFn(column, "getIsVisible", column_getIsVisible));
}

// node_modules/@tanstack/table-core/dist/core/headers/buildHeaderGroups.js
function getMaxHeaderDepth(columns, depth = 1) {
  let maxDepth = depth;
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    if (callMemoOrStaticFn(column, "getIsVisible", column_getIsVisible) && column.columns.length) maxDepth = Math.max(maxDepth, getMaxHeaderDepth(column.columns, depth + 1));
  }
  return maxDepth;
}
function formatHeaderGroupId(headerFamily, depth) {
  return headerFamily ? `${headerFamily}_${depth}` : String(depth);
}
function formatHeaderId(headerFamily, depth, columnId, childHeaderId) {
  let id = headerFamily ?? "";
  if (depth) id = id ? `${id}_${depth}` : String(depth);
  if (columnId) id = id ? `${id}_${columnId}` : columnId;
  if (childHeaderId) id = id ? `${id}_${childHeaderId}` : childHeaderId;
  return id;
}
function countPendingHeadersForColumn(headers, column) {
  let count = 0;
  for (let i = 0; i < headers.length; i++) if (headers[i].column === column) count++;
  return count;
}
function constructHeaderGroup(headersToGroup, depth, table, headerFamily, headerGroups, headerGroupInitFns) {
  const headerGroup = {
    depth,
    id: formatHeaderGroupId(headerFamily, depth),
    headers: []
  };
  const pendingParentHeaders = [];
  for (let i = 0; i < headersToGroup.length; i++) {
    if (!(i in headersToGroup)) continue;
    const headerToGroup = headersToGroup[i];
    const latestPendingParentHeader = pendingParentHeaders[pendingParentHeaders.length - 1];
    const isLeafHeader = headerToGroup.column.depth === headerGroup.depth;
    let column;
    let isPlaceholder = false;
    if (isLeafHeader && headerToGroup.column.parent) column = headerToGroup.column.parent;
    else {
      column = headerToGroup.column;
      isPlaceholder = true;
    }
    if (latestPendingParentHeader && latestPendingParentHeader.column === column) latestPendingParentHeader.subHeaders.push(headerToGroup);
    else {
      const header = constructHeader(table, column, {
        id: formatHeaderId(headerFamily, depth, column.id, headerToGroup.id),
        isPlaceholder,
        placeholderId: isPlaceholder ? String(countPendingHeadersForColumn(pendingParentHeaders, column)) : void 0,
        depth,
        index: pendingParentHeaders.length
      });
      header.subHeaders.push(headerToGroup);
      pendingParentHeaders.push(header);
    }
    headerGroup.headers.push(headerToGroup);
    headerToGroup.headerGroup = headerGroup;
  }
  for (let i = 0; i < headerGroupInitFns.length; i++) headerGroupInitFns[i](headerGroup);
  headerGroups.push(headerGroup);
  if (depth > 0) constructHeaderGroup(pendingParentHeaders, depth - 1, table, headerFamily, headerGroups, headerGroupInitFns);
}
function updateHeaderSpans(headers) {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (!callMemoOrStaticFn(header.column, "getIsVisible", column_getIsVisible)) continue;
    let colSpan = 0;
    if (header.subHeaders.length) {
      updateHeaderSpans(header.subHeaders);
      for (let j = 0; j < header.subHeaders.length; j++) {
        const child = header.subHeaders[j];
        if (!callMemoOrStaticFn(child.column, "getIsVisible", column_getIsVisible)) continue;
        colSpan += child.colSpan;
      }
    } else colSpan = 1;
    header.colSpan = colSpan;
    if (header.isPlaceholder && header.subHeaders.length === 1 && header.subHeaders[0].column === header.column) {
      let rowSpan = 1;
      let chainChild = header.subHeaders[0];
      while (chainChild) {
        chainChild.rowSpan = 0;
        rowSpan++;
        chainChild = chainChild.subHeaders.length === 1 && chainChild.subHeaders[0].column === header.column ? chainChild.subHeaders[0] : void 0;
      }
      header.rowSpan = rowSpan;
    } else header.rowSpan = 1;
  }
}
function buildHeaderGroups(allColumns, columnsToGroup, table, headerFamily) {
  const maxDepth = getMaxHeaderDepth(allColumns);
  const headerGroups = [];
  const headerGroupInitFns = table._headerGroupInstanceInitFns;
  const bottomHeaders = new Array(columnsToGroup.length);
  for (let i = 0; i < columnsToGroup.length; i++) {
    if (!(i in columnsToGroup)) continue;
    bottomHeaders[i] = constructHeader(table, columnsToGroup[i], {
      depth: maxDepth,
      index: i
    });
  }
  constructHeaderGroup(bottomHeaders, maxDepth - 1, table, headerFamily, headerGroups, headerGroupInitFns);
  headerGroups.reverse();
  updateHeaderSpans(headerGroups[0]?.headers ?? []);
  return headerGroups;
}

// node_modules/@tanstack/table-core/dist/core/columns/constructColumn.js
function getColumnPrototype(table) {
  if (!table._columnPrototype) {
    table._columnPrototype = { table };
    const features = Object.values(table._features);
    for (let i = 0; i < features.length; i++) features[i].assignColumnPrototype?.(table._columnPrototype, table);
  }
  return table._columnPrototype;
}
function constructColumn(table, columnDef, depth, parent) {
  const resolvedColumnDef = {
    ...table.getDefaultColumnDef(),
    ...columnDef
  };
  const accessorKey = resolvedColumnDef.accessorKey;
  const accessorKeyString = accessorKey === void 0 ? void 0 : String(accessorKey);
  const id = resolvedColumnDef.id ?? accessorKeyString?.replaceAll(".", "_") ?? (typeof resolvedColumnDef.header === "string" ? resolvedColumnDef.header : void 0);
  let accessorFn;
  if (resolvedColumnDef.accessorFn) accessorFn = resolvedColumnDef.accessorFn;
  else if (accessorKey !== void 0) if (typeof accessorKey === "string" && accessorKey.includes(".")) {
    const keys = accessorKey.split(".");
    accessorFn = (originalRow) => {
      let result = originalRow;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        result = result?.[key];
        if (result === void 0) console.warn(`"${key}" in deeply nested key "${accessorKey}" returned undefined.`);
      }
      return result;
    };
  } else accessorFn = (originalRow) => originalRow[resolvedColumnDef.accessorKey];
  if (!id) {
    if (true) throw new Error(resolvedColumnDef.accessorFn ? `coreColumnsFeature require an id when using an accessorFn` : `coreColumnsFeature require an id when using a non-string header`);
    throw new Error();
  }
  const columnPrototype = getColumnPrototype(table);
  const column = Object.create(columnPrototype);
  column.accessorFn = accessorFn;
  column.columnDef = resolvedColumnDef;
  column.columns = [];
  column.depth = depth;
  column.id = `${String(id)}`;
  column.parent = parent;
  const initFns = table._columnInstanceInitFns;
  for (let i = 0; i < initFns.length; i++) initFns[i](column);
  return column;
}

// node_modules/@tanstack/table-core/dist/features/column-ordering/columnOrderingFeature.utils.js
function table_getOrderColumnsFn(table) {
  const columnOrder = table.atoms.columnOrder?.get();
  return (columns) => {
    let orderedColumns = [];
    if (!columnOrder?.length) orderedColumns = columns;
    else {
      const remaining = /* @__PURE__ */ new Map();
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        remaining.set(column.id, column);
      }
      for (let i = 0; i < columnOrder.length; i++) {
        const id = columnOrder[i];
        const column = remaining.get(id);
        if (column) {
          orderedColumns.push(column);
          remaining.delete(id);
        }
      }
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        if (remaining.has(column.id)) orderedColumns.push(column);
      }
    }
    return orderColumns(table, orderedColumns);
  };
}
function orderColumns(table, leafColumns) {
  const grouping = table.atoms.grouping?.get() ?? [];
  const { groupedColumnMode } = table.options;
  if (!grouping.length || !groupedColumnMode) return leafColumns;
  const nonGroupingColumns = leafColumns.filter((col) => !grouping.includes(col.id));
  if (groupedColumnMode === "remove") return nonGroupingColumns;
  const leafColumnsById = /* @__PURE__ */ new Map();
  for (let i = 0; i < leafColumns.length; i++) {
    const col = leafColumns[i];
    leafColumnsById.set(col.id, col);
  }
  const groupingColumns = [];
  for (let i = 0; i < grouping.length; i++) {
    const col = leafColumnsById.get(grouping[i]);
    if (col) groupingColumns.push(col);
  }
  return [...groupingColumns, ...nonGroupingColumns];
}

// node_modules/@tanstack/table-core/dist/core/columns/coreColumnsFeature.utils.js
function column_getFlatColumns(column) {
  return [column, ...column.columns.flatMap((col) => col.getFlatColumns())];
}
function column_getLeafColumns(column) {
  if (column.columns.length) {
    const leafColumns = column.columns.flatMap((col) => col.getLeafColumns());
    return callMemoOrStaticFn(column.table, "getOrderColumns", table_getOrderColumnsFn)(leafColumns);
  }
  return [column];
}
function table_getDefaultColumnDef(table) {
  return {
    header: (props) => {
      const resolvedColumnDef = props.header.column.columnDef;
      if (resolvedColumnDef.accessorKey) return resolvedColumnDef.accessorKey;
      if (resolvedColumnDef.accessorFn) return resolvedColumnDef.id;
      return null;
    },
    cell: (props) => props.renderValue()?.toString?.() ?? null,
    ...Object.values(table._features).reduce((obj, feature) => {
      return Object.assign(obj, feature.getDefaultColumnDef?.());
    }, {}),
    ...table.options.defaultColumn
  };
}
function constructColumns(table, columnDefs, parent, depth = 0) {
  const columns = new Array(columnDefs.length);
  for (let i = 0; i < columnDefs.length; i++) {
    if (!(i in columnDefs)) continue;
    const columnDef = columnDefs[i];
    const column = constructColumn(table, columnDef, depth, parent);
    const groupingColumnDef = columnDef;
    column.columns = groupingColumnDef.columns ? constructColumns(table, groupingColumnDef.columns, column, depth + 1) : [];
    columns[i] = column;
  }
  return columns;
}
function table_getAllColumns(table) {
  return constructColumns(table, table.options.columns);
}
function table_getAllFlatColumns(table) {
  return table.getAllColumns().flatMap((column) => column.getFlatColumns());
}
function table_getAllFlatColumnsById(table) {
  const result = makeObjectMap();
  const flatColumns = table.getAllFlatColumns();
  for (let i = 0; i < flatColumns.length; i++) {
    const column = flatColumns[i];
    result[column.id] = column;
  }
  return result;
}
function table_getAllLeafColumns(table) {
  const leafColumns = table.getAllColumns().flatMap((c) => c.getLeafColumns());
  return callMemoOrStaticFn(table, "getOrderColumns", table_getOrderColumnsFn)(leafColumns);
}
function table_getAllLeafColumnsById(table) {
  const result = makeObjectMap();
  const leafColumns = table.getAllLeafColumns();
  for (let i = 0; i < leafColumns.length; i++) {
    const column = leafColumns[i];
    result[column.id] = column;
  }
  return result;
}
function table_getColumn(table, columnId) {
  const column = table.getAllFlatColumnsById()[columnId];
  if (!column) console.warn(`[Table] Column with id '${columnId}' does not exist.`);
  return column;
}

// node_modules/@tanstack/table-core/dist/core/columns/coreColumnsFeature.js
var coreColumnsFeature = {
  assignColumnPrototype: (prototype, table) => {
    assignPrototypeAPIs("coreColumnsFeature", prototype, table, {
      column_getFlatColumns: {
        fn: (column) => column_getFlatColumns(column),
        memoDeps: (column) => [column.table.options.columns]
      },
      column_getLeafColumns: {
        fn: (column) => column_getLeafColumns(column),
        memoDeps: (column) => [
          column.table.atoms.columnOrder?.get(),
          column.table.atoms.grouping?.get(),
          column.table.options.columns,
          column.table.options.groupedColumnMode
        ]
      }
    });
  },
  constructTableAPIs: (table) => {
    assignTableAPIs("coreColumnsFeature", table, {
      table_getDefaultColumnDef: {
        fn: () => table_getDefaultColumnDef(table),
        memoDeps: () => [table.options.defaultColumn]
      },
      table_getAllColumns: {
        fn: () => table_getAllColumns(table),
        memoDeps: () => [table.options.columns]
      },
      table_getAllFlatColumns: {
        fn: () => table_getAllFlatColumns(table),
        memoDeps: () => [table.options.columns]
      },
      table_getAllFlatColumnsById: {
        fn: () => table_getAllFlatColumnsById(table),
        memoDeps: () => [table.options.columns]
      },
      table_getAllLeafColumns: {
        fn: () => table_getAllLeafColumns(table),
        memoDeps: () => [
          table.atoms.columnOrder?.get(),
          table.atoms.grouping?.get(),
          table.options.columns,
          table.options.groupedColumnMode
        ]
      },
      table_getAllLeafColumnsById: {
        fn: () => table_getAllLeafColumnsById(table),
        memoDeps: () => [table.getAllLeafColumns()]
      },
      table_getColumn: { fn: (columnId) => table_getColumn(table, columnId) }
    });
  }
};

// node_modules/@tanstack/table-core/dist/core/headers/coreHeadersFeature.utils.js
function collectLeafHeaders(header, leafHeaders) {
  for (let i = 0; i < header.subHeaders.length; i++) collectLeafHeaders(header.subHeaders[i], leafHeaders);
  leafHeaders.push(header);
}
function header_getLeafHeaders(header) {
  const leafHeaders = [];
  collectLeafHeaders(header, leafHeaders);
  return leafHeaders;
}
function header_getContext(header) {
  return {
    column: header.column,
    header,
    table: header.column.table
  };
}
function table_getHeaderGroups(table) {
  const { start, end } = table.atoms.columnPinning?.get() ?? getDefaultColumnPinningState();
  const allColumns = table.getAllColumns();
  const leafColumns = callMemoOrStaticFn(table, "getVisibleLeafColumns", table_getVisibleLeafColumns);
  if (!start.length && !end.length) return buildHeaderGroups(allColumns, leafColumns, table);
  const leafColumnsById = table.getAllLeafColumnsById();
  const leftColumns = [];
  for (let i = 0; i < start.length; i++) {
    const column = leafColumnsById[start[i]];
    if (column && callMemoOrStaticFn(column, "getIsVisible", column_getIsVisible)) leftColumns.push(column);
  }
  const rightColumns = [];
  for (let i = 0; i < end.length; i++) {
    const column = leafColumnsById[end[i]];
    if (column && callMemoOrStaticFn(column, "getIsVisible", column_getIsVisible)) rightColumns.push(column);
  }
  const centerColumns = leafColumns.filter((column) => !start.includes(column.id) && !end.includes(column.id));
  return buildHeaderGroups(allColumns, [
    ...leftColumns,
    ...centerColumns,
    ...rightColumns
  ], table);
}
function table_getFooterGroups(table) {
  return [...table.getHeaderGroups()].reverse();
}
function table_getFlatHeaders(table) {
  const headerGroups = table.getHeaderGroups();
  const result = [];
  for (let i = 0; i < headerGroups.length; i++) {
    const headers = headerGroups[i].headers;
    for (let j = 0; j < headers.length; j++) result.push(headers[j]);
  }
  return result;
}
function table_getLeafHeaders(table) {
  const topHeaders = table.getHeaderGroups()[0]?.headers ?? [];
  const result = [];
  for (let i = 0; i < topHeaders.length; i++) {
    const leafHeaders = topHeaders[i].getLeafHeaders();
    for (let j = 0; j < leafHeaders.length; j++) result.push(leafHeaders[j]);
  }
  return result;
}

// node_modules/@tanstack/table-core/dist/core/headers/coreHeadersFeature.js
var coreHeadersFeature = {
  assignHeaderPrototype: (prototype, table) => {
    assignPrototypeAPIs("coreHeadersFeature", prototype, table, {
      header_getLeafHeaders: {
        fn: (header) => header_getLeafHeaders(header),
        memoDeps: (header) => [header.column.table.options.columns]
      },
      header_getContext: {
        fn: (header) => header_getContext(header),
        memoDeps: (header) => [header.column.table.options.columns]
      }
    });
  },
  constructTableAPIs: (table) => {
    assignTableAPIs("coreHeadersFeature", table, {
      table_getHeaderGroups: {
        fn: () => table_getHeaderGroups(table),
        memoDeps: () => [
          table.options.columns,
          table.atoms.columnOrder?.get(),
          table.atoms.grouping?.get(),
          table.atoms.columnPinning?.get(),
          table.atoms.columnVisibility?.get(),
          table.options.groupedColumnMode
        ]
      },
      table_getFooterGroups: {
        fn: () => table_getFooterGroups(table),
        memoDeps: () => [table.getHeaderGroups()]
      },
      table_getFlatHeaders: {
        fn: () => table_getFlatHeaders(table),
        memoDeps: () => [table.getHeaderGroups()]
      },
      table_getLeafHeaders: {
        fn: () => table_getLeafHeaders(table),
        memoDeps: () => [table.getHeaderGroups()]
      }
    });
  }
};

// node_modules/@tanstack/table-core/dist/core/rows/constructRow.js
function getRowPrototype(table) {
  if (!table._rowPrototype) {
    table._rowPrototype = { table };
    const features = Object.values(table._features);
    for (let i = 0; i < features.length; i++) features[i].assignRowPrototype?.(table._rowPrototype, table);
  }
  return table._rowPrototype;
}
var constructRow = (table, id, original, rowIndex, depth, subRows, parentId) => {
  const rowPrototype = getRowPrototype(table);
  const row = Object.create(rowPrototype);
  row._displayIndexCache = -1;
  row._uniqueValuesCache = makeObjectMap();
  row._valuesCache = makeObjectMap();
  row.depth = depth;
  row.id = id;
  row.index = rowIndex;
  row.original = original;
  row.parentId = parentId;
  row.subRows = subRows ?? [];
  const initFns = table._rowInstanceInitFns;
  for (let i = 0; i < initFns.length; i++) initFns[i](row);
  return row;
};

// node_modules/@tanstack/table-core/dist/features/row-sorting/sortFns.js
var reSplitAlphaNumeric = /([0-9]+)/gm;
function constructSortFn(def) {
  const sortFn = Object.assign((rowA, rowB, columnId) => {
    let dataValueA = rowA.getValue(columnId);
    let dataValueB = rowB.getValue(columnId);
    const resolveDataValue = sortFn.resolveDataValue;
    if (resolveDataValue) {
      dataValueA = resolveDataValue(dataValueA);
      dataValueB = resolveDataValue(dataValueB);
    }
    return sortFn.sort(dataValueA, dataValueB, rowA, rowB, columnId);
  }, def);
  return sortFn;
}
var sortFn_alphanumeric = constructSortFn({
  resolveDataValue: (dataValue) => toString(dataValue).toLowerCase(),
  sort: (dataValueA, dataValueB) => compareAlphanumeric(dataValueA, dataValueB)
});
var sortFn_alphanumericCaseSensitive = constructSortFn({
  resolveDataValue: (dataValue) => toString(dataValue),
  sort: (dataValueA, dataValueB) => compareAlphanumeric(dataValueA, dataValueB)
});
var sortFn_text = constructSortFn({
  resolveDataValue: (dataValue) => toString(dataValue).toLowerCase(),
  sort: (dataValueA, dataValueB) => compareBasic(dataValueA, dataValueB)
});
var sortFn_textCaseSensitive = constructSortFn({
  resolveDataValue: (dataValue) => toString(dataValue),
  sort: (dataValueA, dataValueB) => compareBasic(dataValueA, dataValueB)
});
var sortFn_datetime = constructSortFn({
  resolveDataValue: (dataValue) => toDateSortValue(dataValue),
  sort: (dataValueA, dataValueB) => dataValueA > dataValueB ? 1 : dataValueA < dataValueB ? -1 : 0
});
var sortFn_basic = constructSortFn({ sort: (dataValueA, dataValueB) => compareBasic(dataValueA, dataValueB) });
function compareBasic(a, b) {
  return a === b ? 0 : a > b ? 1 : -1;
}
function toDateSortValue(value) {
  return value instanceof Date ? value.getTime() : value;
}
function toString(a) {
  if (typeof a === "number") {
    if (isNaN(a) || a === Infinity || a === -Infinity) return "";
    return String(a);
  }
  if (typeof a === "string") return a;
  return "";
}
function compareAlphanumeric(aStr, bStr) {
  let ai = 0;
  let bi = 0;
  const aLen = aStr.length;
  const bLen = bStr.length;
  while (ai < aLen && bi < bLen) {
    const aIsNumeric = isDigit(aStr.charCodeAt(ai));
    const bIsNumeric = isDigit(bStr.charCodeAt(bi));
    const aEnd = findChunkEnd(aStr, ai, aIsNumeric);
    const bEnd = findChunkEnd(bStr, bi, bIsNumeric);
    if (!aIsNumeric && !bIsNumeric) {
      const stringComparison = compareStringChunks(aStr, ai, aEnd, bStr, bi, bEnd);
      if (stringComparison) return stringComparison;
      ai = aEnd;
      bi = bEnd;
      continue;
    }
    if (aIsNumeric !== bIsNumeric) return aIsNumeric ? 1 : -1;
    const numericComparison = compareNumericChunks(aStr, ai, aEnd, bStr, bi, bEnd);
    if (numericComparison) return numericComparison;
    ai = aEnd;
    bi = bEnd;
  }
  return countRemainingChunks(aStr, ai) - countRemainingChunks(bStr, bi);
}
function isDigit(charCode) {
  return charCode >= 48 && charCode <= 57;
}
function findChunkEnd(str, start, isNumeric) {
  let end = start + 1;
  while (end < str.length && isDigit(str.charCodeAt(end)) === isNumeric) end++;
  return end;
}
function compareStringChunks(aStr, aStart, aEnd, bStr, bStart, bEnd) {
  const aLength = aEnd - aStart;
  const bLength = bEnd - bStart;
  const minLength = aLength < bLength ? aLength : bLength;
  for (let i = 0; i < minLength; i++) {
    const aCode = aStr.charCodeAt(aStart + i);
    const bCode = bStr.charCodeAt(bStart + i);
    if (aCode > bCode) return 1;
    if (bCode > aCode) return -1;
  }
  if (aLength > bLength) return 1;
  if (bLength > aLength) return -1;
  return 0;
}
function compareNumericChunks(aStr, aStart, aEnd, bStr, bStart, bEnd) {
  let aSignificantStart = aStart;
  while (aSignificantStart < aEnd && aStr.charCodeAt(aSignificantStart) === 48) aSignificantStart++;
  let bSignificantStart = bStart;
  while (bSignificantStart < bEnd && bStr.charCodeAt(bSignificantStart) === 48) bSignificantStart++;
  const aSignificantLength = aEnd - aSignificantStart;
  const bSignificantLength = bEnd - bSignificantStart;
  if (aSignificantLength === 0 && bSignificantLength === 0) return 0;
  if (aSignificantLength <= 15 && bSignificantLength <= 15) {
    const an2 = parseSmallInt(aStr, aSignificantStart, aEnd);
    const bn2 = parseSmallInt(bStr, bSignificantStart, bEnd);
    if (an2 > bn2) return 1;
    if (bn2 > an2) return -1;
    return 0;
  }
  const an = parseInt(aStr.slice(aStart, aEnd), 10);
  const bn = parseInt(bStr.slice(bStart, bEnd), 10);
  if (an > bn) return 1;
  if (bn > an) return -1;
  return 0;
}
function parseSmallInt(str, start, end) {
  let result = 0;
  for (let i = start; i < end; i++) result = result * 10 + str.charCodeAt(i) - 48;
  return result;
}
function countRemainingChunks(str, start) {
  let count = 0;
  let index = start;
  while (index < str.length) {
    count++;
    index = findChunkEnd(str, index, isDigit(str.charCodeAt(index)));
  }
  return count;
}

// node_modules/@tanstack/table-core/dist/features/cell-selection/cellSelectionFeature.utils.js
function getDefaultCellSelectionState() {
  return [];
}
function table_setCellSelection(table, updater) {
  table.options.onCellSelectionChange?.(updater);
}
function table_resetCellSelection(table, defaultState) {
  table_setCellSelection(table, defaultState ? getDefaultCellSelectionState() : cloneState(table.initialState.cellSelection) ?? getDefaultCellSelectionState());
}
function table_autoResetCellSelection(table) {
  if (!table.atoms.cellSelection) return;
  if (table.options.autoResetAll ?? table.options.autoResetCellSelection ?? true) table._reactivity.schedule(() => table_resetCellSelection(table));
}

// node_modules/@tanstack/table-core/dist/features/row-expanding/rowExpandingFeature.utils.js
function table_autoResetExpanded(table) {
  if (!table.atoms.expanded) return;
  if (table.options.autoResetAll ?? table.options.autoResetExpanded ?? !table.options.manualExpanding) table._reactivity.schedule(() => table_resetExpanded(table));
}
function table_setExpanded(table, updater) {
  table.options.onExpandedChange?.(updater);
}
function table_resetExpanded(table, defaultState) {
  const initialExpanded = table.initialState.expanded;
  table_setExpanded(table, defaultState ? makeObjectMap() : initialExpanded === true ? true : Object.assign(makeObjectMap(), cloneState(initialExpanded ?? {})));
}

// node_modules/@tanstack/table-core/dist/features/row-pagination/rowPaginationFeature.utils.js
var defaultPageIndex = 0;
function table_autoResetPageIndex(table) {
  if (table.options.autoResetAll ?? table.options.autoResetPageIndex ?? !table.options.manualPagination) table_resetPageIndex(table, true);
}
function table_setPagination(table, updater) {
  const safeUpdater = (old) => {
    return functionalUpdate(updater, old);
  };
  return table.options.onPaginationChange?.(safeUpdater);
}
function table_setPageIndex(table, updater) {
  table_setPagination(table, (old) => {
    let pageIndex = functionalUpdate(updater, old.pageIndex);
    const maxPageIndex = typeof table.options.pageCount === "undefined" || table.options.pageCount === -1 ? Number.MAX_SAFE_INTEGER : table.options.pageCount - 1;
    pageIndex = Math.max(0, Math.min(pageIndex, maxPageIndex));
    return {
      ...old,
      pageIndex
    };
  });
}
function table_resetPageIndex(table, defaultState) {
  const currentPageIndex = table.atoms.pagination?.get()?.pageIndex ?? defaultPageIndex;
  const newPageIndex = defaultState ? defaultPageIndex : table.initialState.pagination?.pageIndex ?? defaultPageIndex;
  if (newPageIndex === currentPageIndex) return;
  table_setPageIndex(table, newPageIndex);
}

// node_modules/@tanstack/table-core/dist/features/row-sorting/rowSortingFeature.utils.js
function getDefaultSortingState() {
  return [];
}
function table_setSorting(table, updater) {
  table.options.onSortingChange?.(updater);
}
function table_resetSorting(table, defaultState) {
  table_setSorting(table, defaultState ? [] : cloneState(table.initialState.sorting ?? []));
}
function table_autoResetSorting(table) {
  if (!table.atoms.sorting) return;
  if (table.options.autoResetAll ?? table.options.autoResetSorting ?? false) table_resetSorting(table);
}
function column_getAutoSortFn(column) {
  const sortFns = column.table._rowModelFns.sortFns;
  const firstRows = column.table.getFilteredRowModel().flatRows.slice(0, 10);
  let sortFnName;
  let isString = false;
  for (let i = 0; i < firstRows.length; i++) {
    const value = firstRows[i].getValue(column.id);
    if (Object.prototype.toString.call(value) === "[object Date]") {
      sortFnName = "datetime";
      break;
    }
    if (typeof value === "string") {
      isString = true;
      if (value.split(reSplitAlphaNumeric).length > 1) {
        sortFnName = "alphanumeric";
        break;
      }
    }
  }
  if (!sortFnName && isString) sortFnName = "text";
  if (sortFnName) {
    let sortFn = sortFns?.[sortFnName];
    if (!sortFn) {
      if (true) console.warn(`sortFn '${sortFnName}' (auto) for column '${column.id}' is not registered`);
      if (sortFnName === "alphanumeric") sortFn = sortFns?.text;
    }
    if (sortFn) return sortFn;
  }
  return sortFn_basic;
}
function column_getAutoSortDir(column) {
  const firstRows = column.table.getFilteredRowModel().flatRows.slice(0, 10);
  for (let i = 0; i < firstRows.length; i++) {
    const value = firstRows[i].getValue(column.id);
    if (value == null) continue;
    return typeof value === "string" ? "asc" : "desc";
  }
  return "desc";
}
function column_getSortFn(column) {
  const sortFns = column.table._rowModelFns.sortFns;
  if (isFunction(column.columnDef.sortFn)) return column.columnDef.sortFn;
  if (column.columnDef.sortFn === "auto") return column_getAutoSortFn(column);
  const sortFn = sortFns?.[column.columnDef.sortFn];
  if (!sortFn) console.warn(`sortFn '${String(column.columnDef.sortFn)}' for column '${column.id}' is not registered`);
  return sortFn ?? sortFn_basic;
}
function column_toggleSorting(column, desc, multi) {
  const nextSortingOrder = column_getNextSortingOrder(column, multi && column_getCanMultiSort(column));
  const hasManualValue = typeof desc !== "undefined";
  table_setSorting(column.table, (old) => {
    const existingIndex = old.findIndex((d) => d.id === column.id);
    const existingSorting = existingIndex === -1 ? void 0 : old[existingIndex];
    let newSorting = [];
    let sortAction;
    const nextDesc = hasManualValue ? desc : nextSortingOrder === "desc";
    const isMultiMode = !!(old.length && column_getCanMultiSort(column) && multi);
    if (isMultiMode) if (existingSorting) sortAction = "toggle";
    else sortAction = "add";
    else if (existingSorting) sortAction = "toggle";
    else sortAction = "replace";
    if (sortAction === "toggle") {
      if (!hasManualValue) {
        if (!nextSortingOrder) sortAction = "remove";
      }
    }
    if (sortAction === "add") {
      newSorting = [...old, {
        id: column.id,
        desc: nextDesc
      }];
      newSorting.splice(0, newSorting.length - (column.table.options.maxMultiSortColCount ?? Number.MAX_SAFE_INTEGER));
    } else if (sortAction === "toggle") newSorting = isMultiMode ? old.map((d) => {
      if (d.id === column.id) return {
        ...d,
        desc: nextDesc
      };
      return d;
    }) : [{
      id: column.id,
      desc: nextDesc
    }];
    else if (sortAction === "remove") newSorting = isMultiMode ? old.filter((d) => d.id !== column.id) : [];
    else newSorting = [{
      id: column.id,
      desc: nextDesc
    }];
    return newSorting;
  });
}
function column_getFirstSortDir(column) {
  return column.columnDef.sortDescFirst ?? column.table.options.sortDescFirst ?? column_getAutoSortDir(column) === "desc" ? "desc" : "asc";
}
function column_getNextSortingOrder(column, multi) {
  const firstSortDirection = column_getFirstSortDir(column);
  const isSorted = column_getIsSorted(column);
  if (!isSorted) return firstSortDirection;
  if (isSorted !== firstSortDirection && (column.table.options.enableSortingRemoval ?? true) && (multi ? column.table.options.enableMultiRemove ?? true : true)) return false;
  return isSorted === "desc" ? "asc" : "desc";
}
function column_getCanSort(column) {
  return (column.columnDef.enableSorting ?? true) && (column.table.options.enableSorting ?? true) && !!column.accessorFn;
}
function column_getCanMultiSort(column) {
  return column.columnDef.enableMultiSort ?? column.table.options.enableMultiSort ?? !!column.accessorFn;
}
function column_getIsSorted(column) {
  const columnSort = column.table.atoms.sorting?.get()?.find((d) => d.id === column.id);
  return !columnSort ? false : columnSort.desc ? "desc" : "asc";
}
function column_getSortIndex(column) {
  return column.table.atoms.sorting?.get()?.findIndex((d) => d.id === column.id) ?? -1;
}
function column_clearSorting(column) {
  table_setSorting(column.table, (old) => old.length ? old.filter((d) => d.id !== column.id) : []);
}
function column_getToggleSortingHandler(column) {
  const canSort = column_getCanSort(column);
  return (e) => {
    if (!canSort) return;
    column_toggleSorting(column, void 0, column_getCanMultiSort(column) ? column.table.options.isMultiSortEvent?.(e) : false);
  };
}

// node_modules/@tanstack/table-core/dist/core/row-models/createCoreRowModel.js
function createCoreRowModel() {
  return (table) => {
    return tableMemo({
      feature: "coreRowModelsFeature",
      table,
      fnName: "table.getCoreRowModel",
      memoDeps: () => [table.options.data],
      fn: () => _createCoreRowModel(table, table.options.data),
      onAfterUpdate: skipFirstRun(() => {
        table_autoResetExpanded(table);
        table_autoResetPageIndex(table);
        table_autoResetSorting(table);
        table_autoResetCellSelection(table);
      })
    });
  };
}
function accessRows(table, rowModel, originalRows, depth = 0, parentRow) {
  const rows = [];
  for (let i = 0; i < originalRows.length; i++) {
    const originalRow = originalRows[i];
    const row = constructRow(table, table.getRowId(originalRow, i, parentRow), originalRow, i, depth, void 0, parentRow?.id);
    rowModel.flatRows.push(row);
    rowModel.rowsById[row.id] = row;
    rows.push(row);
    if (table.options.getSubRows) {
      row.originalSubRows = table.options.getSubRows(originalRow, i);
      if (row.originalSubRows?.length) row.subRows = accessRows(table, rowModel, row.originalSubRows, depth + 1, row);
    }
  }
  return rows;
}
function _createCoreRowModel(table, data) {
  const rowModel = {
    rows: [],
    flatRows: [],
    rowsById: makeObjectMap()
  };
  rowModel.rows = accessRows(table, rowModel, data);
  return rowModel;
}

// node_modules/@tanstack/table-core/dist/core/row-models/coreRowModelsFeature.utils.js
function table_getCoreRowModel(table) {
  if (!table._rowModels.coreRowModel) table._rowModels.coreRowModel = table.options.features.coreRowModel?.(table) ?? createCoreRowModel()(table);
  return table._rowModels.coreRowModel();
}
function table_getPreFilteredRowModel(table) {
  return table.getCoreRowModel();
}
function table_getFilteredRowModel(table) {
  if (!table._rowModels.filteredRowModel) table._rowModels.filteredRowModel = table.options.features.filteredRowModel?.(table);
  if (table.options.manualFiltering || !table._rowModels.filteredRowModel) return table.getPreFilteredRowModel();
  return table._rowModels.filteredRowModel();
}
function table_getPreGroupedRowModel(table) {
  return table.getFilteredRowModel();
}
function table_getGroupedRowModel(table) {
  if (!table._rowModels.groupedRowModel) table._rowModels.groupedRowModel = table.options.features.groupedRowModel?.(table);
  if (table.options.manualGrouping || !table._rowModels.groupedRowModel) return table.getPreGroupedRowModel();
  return table._rowModels.groupedRowModel();
}
function table_getPreSortedRowModel(table) {
  return table.getGroupedRowModel();
}
function table_getSortedRowModel(table) {
  if (!table._rowModels.sortedRowModel) table._rowModels.sortedRowModel = table.options.features.sortedRowModel?.(table);
  if (table.options.manualSorting || !table._rowModels.sortedRowModel) return table.getPreSortedRowModel();
  return table._rowModels.sortedRowModel();
}
function table_getPreExpandedRowModel(table) {
  return table.getSortedRowModel();
}
function table_getExpandedRowModel(table) {
  if (!table._rowModels.expandedRowModel) table._rowModels.expandedRowModel = table.options.features.expandedRowModel?.(table);
  if (table.options.manualExpanding || !table._rowModels.expandedRowModel) return table.getPreExpandedRowModel();
  return table._rowModels.expandedRowModel();
}
function table_getPrePaginatedRowModel(table) {
  return table.getExpandedRowModel();
}
function table_getPaginatedRowModel(table) {
  if (!table._rowModels.paginatedRowModel) table._rowModels.paginatedRowModel = table.options.features.paginatedRowModel?.(table);
  if (table.options.manualPagination || !table._rowModels.paginatedRowModel) return table.getPrePaginatedRowModel();
  return table._rowModels.paginatedRowModel();
}
function table_getRowModel(table) {
  return table.getPaginatedRowModel();
}

// node_modules/@tanstack/table-core/dist/core/row-models/coreRowModelsFeature.js
var coreRowModelsFeature = { constructTableAPIs: (table) => {
  assignTableAPIs("coreRowModelsFeature", table, {
    table_getCoreRowModel: { fn: () => table_getCoreRowModel(table) },
    table_getPreFilteredRowModel: { fn: () => table_getPreFilteredRowModel(table) },
    table_getFilteredRowModel: { fn: () => table_getFilteredRowModel(table) },
    table_getPreGroupedRowModel: { fn: () => table_getPreGroupedRowModel(table) },
    table_getGroupedRowModel: { fn: () => table_getGroupedRowModel(table) },
    table_getPreSortedRowModel: { fn: () => table_getPreSortedRowModel(table) },
    table_getSortedRowModel: { fn: () => table_getSortedRowModel(table) },
    table_getPreExpandedRowModel: { fn: () => table_getPreExpandedRowModel(table) },
    table_getExpandedRowModel: { fn: () => table_getExpandedRowModel(table) },
    table_getPrePaginatedRowModel: { fn: () => table_getPrePaginatedRowModel(table) },
    table_getPaginatedRowModel: { fn: () => table_getPaginatedRowModel(table) },
    table_getRowModel: { fn: () => table_getRowModel(table) }
  });
} };

// node_modules/@tanstack/table-core/dist/core/cells/constructCell.js
function getCellPrototype(table) {
  if (!table._cellPrototype) {
    table._cellPrototype = { table };
    const features = Object.values(table._features);
    for (let i = 0; i < features.length; i++) features[i].assignCellPrototype?.(table._cellPrototype, table);
  }
  return table._cellPrototype;
}
function constructCell(column, row, table) {
  const cellPrototype = getCellPrototype(table);
  const cell = Object.create(cellPrototype);
  cell.column = column;
  cell.id = `${row.id}_${column.id}`;
  cell.row = row;
  const initFns = table._cellInstanceInitFns;
  for (let i = 0; i < initFns.length; i++) initFns[i](cell);
  return cell;
}

// node_modules/@tanstack/table-core/dist/core/rows/coreRowsFeature.utils.js
function row_getDisplayIndex(row) {
  const rows = row.table.getRowsInDisplayOrder();
  const displayIndex = row._displayIndexCache;
  return rows[displayIndex] === row ? displayIndex : -1;
}
function table_getRowsInDisplayOrder(table) {
  const rows = table.getPrePaginatedRowModel().rows;
  if (table.options.paginateExpandedRows === false) {
    const displayRows = [];
    const handleRow = (row) => {
      row._displayIndexCache = displayRows.length;
      displayRows.push(row);
      if (row.subRows.length && row.getIsExpanded?.()) row.subRows.forEach(handleRow);
    };
    rows.forEach(handleRow);
    return displayRows;
  }
  for (let i = 0; i < rows.length; i++) rows[i]._displayIndexCache = i;
  return rows;
}
function row_getValue(row, columnId) {
  if (hasOwn(row._valuesCache, columnId)) return row._valuesCache[columnId];
  const column = row.table.getColumn(columnId);
  if (!column?.accessorFn) return;
  row._valuesCache[columnId] = column.accessorFn(row.original, row.index);
  return row._valuesCache[columnId];
}
function row_getUniqueValues(row, columnId) {
  if (hasOwn(row._uniqueValuesCache, columnId)) return row._uniqueValuesCache[columnId];
  const column = row.table.getColumn(columnId);
  if (!column?.accessorFn) return;
  if (!column.columnDef.getUniqueValues) {
    row._uniqueValuesCache[columnId] = [row.getValue(columnId)];
    return row._uniqueValuesCache[columnId];
  }
  row._uniqueValuesCache[columnId] = column.columnDef.getUniqueValues(row.original, row.index);
  return row._uniqueValuesCache[columnId];
}
function row_renderValue(row, columnId) {
  return row.getValue(columnId) ?? row.table.options.renderFallbackValue;
}
function row_getLeafRows(row) {
  return flattenBy(row.subRows, (d) => d.subRows);
}
function table_getMaxSubRowDepth(table) {
  const rows = table.getCoreRowModel().flatRows;
  let maxDepth = 0;
  for (let i = 0; i < rows.length; i++) maxDepth = Math.max(maxDepth, rows[i].depth);
  return maxDepth;
}
function row_getParentRow(row) {
  if (!row.parentId) return;
  return row.table.getCoreRowModel().rowsById[row.parentId] ?? row.table.getRow(row.parentId, true);
}
function row_getParentRows(row) {
  const parentRows = [];
  let currentRow = row;
  while (true) {
    const parentRow = currentRow.getParentRow();
    if (!parentRow) break;
    parentRows.push(parentRow);
    currentRow = parentRow;
  }
  return parentRows.reverse();
}
function row_getAllCells(row) {
  const columns = row.table.getAllLeafColumns();
  let cache = row._cellsCache;
  if (!cache) cache = row._cellsCache = /* @__PURE__ */ new WeakMap();
  const cells = new Array(columns.length);
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    let cell = cache.get(column);
    if (!cell) {
      cell = constructCell(column, row, row.table);
      cache.set(column, cell);
    }
    cells[i] = cell;
  }
  return cells;
}
function row_getAllCellsByColumnId(row) {
  const result = makeObjectMap();
  const cells = row.getAllCells();
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    result[cell.column.id] = cell;
  }
  return result;
}
function table_getRowId(originalRow, table, index, parent) {
  return table.options.getRowId?.(originalRow, index, parent) ?? (parent ? `${parent.id}.${index}` : String(index));
}
function table_getRow(table, rowId, searchAll) {
  let row = (searchAll ? table.getPrePaginatedRowModel() : table.getRowModel()).rowsById[rowId];
  if (!row) {
    row = table.getCoreRowModel().rowsById[rowId];
    if (!row) {
      if (true) throw new Error(`getRow could not find row with ID: ${rowId}`);
      throw new Error();
    }
  }
  return row;
}

// node_modules/@tanstack/table-core/dist/core/rows/coreRowsFeature.js
var coreRowsFeature = {
  assignRowPrototype: (prototype, table) => {
    assignPrototypeAPIs("coreRowsFeature", prototype, table, {
      row_getDisplayIndex: { fn: (row) => row_getDisplayIndex(row) },
      row_getAllCellsByColumnId: {
        fn: (row) => row_getAllCellsByColumnId(row),
        memoDeps: (row) => [row.getAllCells()]
      },
      row_getAllCells: {
        fn: (row) => row_getAllCells(row),
        memoDeps: (row) => [row.table.getAllLeafColumns()]
      },
      row_getLeafRows: {
        fn: (row) => row_getLeafRows(row),
        memoDeps: (row) => [row.subRows]
      },
      row_getParentRow: { fn: (row) => row_getParentRow(row) },
      row_getParentRows: { fn: (row) => row_getParentRows(row) },
      row_getUniqueValues: { fn: (row, columnId) => row_getUniqueValues(row, columnId) },
      row_getValue: { fn: (row, columnId) => row_getValue(row, columnId) },
      row_renderValue: { fn: (row, columnId) => row_renderValue(row, columnId) }
    });
  },
  constructTableAPIs: (table) => {
    assignTableAPIs("coreRowsFeature", table, {
      table_getRowsInDisplayOrder: {
        fn: () => table_getRowsInDisplayOrder(table),
        memoDeps: () => [
          table.getPrePaginatedRowModel().rows,
          table.options.paginateExpandedRows,
          table.options.paginateExpandedRows === false ? table.atoms.expanded?.get() : void 0
        ]
      },
      table_getRowId: { fn: (originalRow, index, parent) => table_getRowId(originalRow, table, index, parent) },
      table_getRow: { fn: (id, searchAll) => table_getRow(table, id, searchAll) },
      table_getMaxSubRowDepth: {
        fn: () => table_getMaxSubRowDepth(table),
        memoDeps: () => [table.getCoreRowModel()]
      }
    });
  }
};

// node_modules/@tanstack/table-core/dist/core/table/coreTablesFeature.utils.js
function table_syncExternalStateToBaseAtoms(table, capturedState, compare = (currentState, externalState) => currentState === externalState) {
  const state = capturedState === void 0 ? table.options.state : capturedState;
  table._reactivity.batch(() => {
    if (state) for (const key in state) {
      const baseAtom = table.baseAtoms[key];
      if (!baseAtom) continue;
      const rawExternalState = state[key];
      const externalState = rawExternalState === void 0 ? table.initialState[key] : rawExternalState;
      if (!compare(table._reactivity.untrack(() => baseAtom.get()), externalState)) baseAtom.set(() => externalState);
    }
  });
}
function table_publishExternalState(table, state, compare = (currentState, externalState) => currentState === externalState) {
  table._reactivity.batch(() => {
    table_syncExternalStateToBaseAtoms(table, state, compare);
    table._reactivity.commit?.();
  });
}
function table_reset(table) {
  const snap = cloneState(table.initialState);
  table._reactivity.batch(() => {
    const keys = Object.keys(snap);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      table.baseAtoms[key].set(snap[key]);
    }
  });
  const features = Object.values(table._features);
  for (let i = 0; i < features.length; i++) features[i].resetTableInstanceData?.(table);
}
function table_mergeOptions(table, newOptions) {
  const { features, atoms, initialState } = table.options;
  if (!table.options.mergeOptions) return {
    ...table.options,
    ...newOptions,
    features,
    atoms,
    initialState
  };
  const mergedOptions = table.options.mergeOptions(table.options, newOptions);
  const descriptors = { ...Object.getOwnPropertyDescriptors(mergedOptions) };
  return Object.defineProperties(Object.create(Object.getPrototypeOf(mergedOptions)), {
    ...descriptors,
    features: {
      value: features,
      enumerable: true,
      configurable: true,
      writable: true
    },
    atoms: {
      value: atoms,
      enumerable: true,
      configurable: true,
      writable: true
    },
    initialState: {
      value: initialState,
      enumerable: true,
      configurable: true,
      writable: true
    }
  });
}
function table_setOptions(table, updater, options) {
  const mergedOptions = table_mergeOptions(table, functionalUpdate(updater, table.options));
  if (table.optionsStore) table.optionsStore.set(() => mergedOptions);
  else table.options = mergedOptions;
  if (options?.syncExternalState !== false) table_publishExternalState(table, mergedOptions.state ?? null);
}

// node_modules/@tanstack/table-core/dist/core/table/coreTablesFeature.js
var coreTablesFeature = { constructTableAPIs: (table) => {
  assignTableAPIs("coreTablesFeature", table, {
    table_reset: { fn: () => table_reset(table) },
    table_setOptions: { fn: (updater) => table_setOptions(table, updater) }
  });
} };

// node_modules/@tanstack/table-core/dist/core/coreFeatures.js
var coreFeatures = {
  coreCellsFeature,
  coreColumnsFeature,
  coreHeadersFeature,
  coreRowModelsFeature,
  coreRowsFeature,
  coreTablesFeature
};

// node_modules/@tanstack/table-core/dist/helpers/columnHelper.js
function createColumnHelper() {
  return {
    accessor: (accessor, column) => {
      return typeof accessor === "function" ? {
        ...column,
        accessorFn: accessor
      } : {
        ...column,
        accessorKey: accessor
      };
    },
    columns: (columns) => columns,
    display: (column) => column,
    group: (column) => column
  };
}

// node_modules/@tanstack/table-core/dist/core/table/constructTable.js
function getInitialTableState(features, initialState = {}) {
  Object.values(features).forEach((feature) => {
    initialState = feature.getInitialState?.(initialState) ?? initialState;
  });
  return cloneState(initialState);
}
function constructTable(tableOptions) {
  const _reactivity = tableOptions.features.coreReactivityFeature;
  const { aggregationFns, columnMeta: _columnMeta, coreRowModel, expandedRowModel, facetedMinMaxValues, facetedRowModel, facetedUniqueValues, filterFns, filterMeta: _filterMeta, filteredRowModel, groupedRowModel, paginatedRowModel, sortFns, sortedRowModel, tableMeta: _tableMeta, ...features } = tableOptions.features;
  const table = {
    _cellInstanceInitFns: [],
    _columnInstanceInitFns: [],
    _features: {
      ...coreFeatures,
      ...features
    },
    _headerGroupInstanceInitFns: [],
    _headerInstanceInitFns: [],
    _reactivity,
    _rowInstanceInitFns: [],
    _rowModelFns: {
      aggregationFns,
      filterFns,
      sortFns
    },
    _rowModels: {},
    atoms: {},
    baseAtoms: {}
  };
  const featuresList = Object.values(table._features);
  const mergedOptions = {
    ...featuresList.reduce((obj, feature) => {
      return Object.assign(obj, feature.getDefaultTableOptions?.(table));
    }, {}),
    ...tableOptions
  };
  if (_reactivity.wrapExternalAtoms && mergedOptions.atoms) for (const [atomKey, _atom] of Object.entries(mergedOptions.atoms)) {
    const atom = _atom;
    const wrappedAtom = _reactivity.createWritableAtom(atom.get(), { debugName: `externalAtom/${atomKey}` });
    mergedOptions.atoms[atomKey] = wrappedAtom;
    let syncExternal = false;
    const syncAtomToWrappedSub = atom.subscribe((value) => {
      if (syncExternal) return;
      wrappedAtom.set(value);
    });
    const syncWrappedToAtomSub = wrappedAtom.subscribe((value) => {
      syncExternal = true;
      atom.set(value);
      syncExternal = false;
    });
    _reactivity.addSubscription(syncAtomToWrappedSub);
    _reactivity.addSubscription(syncWrappedToAtomSub);
  }
  if (_reactivity.createOptionsStore) {
    table.optionsStore = _reactivity.createWritableAtom(mergedOptions, { debugName: "table/optionsStore" });
    Object.defineProperty(table, "options", {
      configurable: true,
      enumerable: true,
      get() {
        return table.optionsStore.get();
      },
      set(value) {
        table.optionsStore.set(() => value);
      }
    });
  } else table.options = mergedOptions;
  table.initialState = getInitialTableState(table._features, table.options.initialState);
  const stateKeys = Object.keys(table.initialState);
  for (let i = 0; i < stateKeys.length; i++) {
    const key = stateKeys[i];
    table.baseAtoms[key] = _reactivity.createWritableAtom(table.initialState[key], { debugName: `table/baseAtoms/${key}` });
    table.atoms[key] = _reactivity.createReadonlyAtom(() => {
      const options = table.options;
      const externalAtom = options.atoms?.[key];
      const reactiveState = externalAtom ? externalAtom.get() : table.baseAtoms[key].get();
      if (externalAtom) return reactiveState;
      const controlledState = options.state;
      if (controlledState && hasOwn(controlledState, key)) {
        const controlledValue = controlledState[key];
        return controlledValue === void 0 ? table.initialState[key] : controlledValue;
      }
      return reactiveState;
    }, { debugName: `table/atoms/${key}` });
  }
  table_syncExternalStateToBaseAtoms(table);
  table.store = atomToStore(_reactivity.createReadonlyAtom(() => {
    const snapshot = {};
    for (let i = 0; i < stateKeys.length; i++) {
      const key = stateKeys[i];
      snapshot[key] = table.atoms[key].get();
    }
    return snapshot;
  }, {
    compare: shallow,
    debugName: "table/store"
  }));
  for (let i = 0; i < featuresList.length; i++) {
    const feature = featuresList[i];
    feature.initTableInstanceData?.(table);
    if (feature.initCellInstanceData) table._cellInstanceInitFns.push(feature.initCellInstanceData.bind(feature));
    if (feature.initColumnInstanceData) table._columnInstanceInitFns.push(feature.initColumnInstanceData.bind(feature));
    if (feature.initHeaderGroupInstanceData) table._headerGroupInstanceInitFns.push(feature.initHeaderGroupInstanceData.bind(feature));
    if (feature.initHeaderInstanceData) table._headerInstanceInitFns.push(feature.initHeaderInstanceData.bind(feature));
    if (feature.initRowInstanceData) table._rowInstanceInitFns.push(feature.initRowInstanceData.bind(feature));
    feature.constructTableAPIs?.(table);
  }
  if (tableOptions.debugAll || tableOptions.debugTable) {
    const features2 = Object.keys(table._features);
    const rowModels = Object.entries({
      coreRowModel,
      filteredRowModel,
      groupedRowModel,
      sortedRowModel,
      expandedRowModel,
      paginatedRowModel,
      facetedRowModel,
      facetedMinMaxValues,
      facetedUniqueValues
    }).filter(([, factory]) => factory).map(([key]) => key);
    const states = Object.keys(table.initialState);
    console.log(`Constructing Table Instance

  Features:   ${features2.join("\n              ")}

  Row Models: ${rowModels.length ? rowModels.join("\n              ") : "(none)"}

  States:     ${states.join("\n              ")}
`, { table });
  }
  return table;
}

// node_modules/@tanstack/table-core/dist/features/column-filtering/columnFilteringFeature.utils.js
function getDefaultColumnFiltersState() {
  return [];
}
function column_getAutoFilterFn(column) {
  const filterFns = column.table._rowModelFns.filterFns;
  const rows = column.table.getCoreRowModel().flatRows;
  let value;
  for (let i = 0; i < rows.length; i++) {
    const rowValue = rows[i].getValue(column.id);
    if (rowValue !== null && rowValue !== void 0) {
      value = rowValue;
      break;
    }
  }
  let filterFnName;
  if (typeof value === "string") filterFnName = "includesString";
  else if (typeof value === "number") filterFnName = "inNumberRange";
  else if (typeof value === "boolean") filterFnName = "equals";
  else if (Array.isArray(value)) filterFnName = "arrIncludes";
  else if (Object.prototype.toString.call(value) === "[object Date]") filterFnName = "inDateRange";
  else if (value !== null && typeof value === "object") filterFnName = "equals";
  else filterFnName = "weakEquals";
  const filterFn = filterFns?.[filterFnName];
  if (!filterFn) console.warn(`filterFn '${filterFnName}' (auto) for column '${column.id}' is not registered`);
  return filterFn;
}
function column_getFilterFn(column) {
  let filterFn = null;
  const filterFns = column.table._rowModelFns.filterFns;
  filterFn = isFunction(column.columnDef.filterFn) ? column.columnDef.filterFn : column.columnDef.filterFn === "auto" ? column_getAutoFilterFn(column) : filterFns?.[column.columnDef.filterFn];
  if (!filterFn && column.columnDef.filterFn !== "auto") console.warn(`filterFn '${String(column.columnDef.filterFn)}' for column '${column.id}' is not registered`);
  return filterFn ?? void 0;
}
function column_getCanFilter(column) {
  return (column.columnDef.enableColumnFilter ?? true) && (column.table.options.enableColumnFilters ?? true) && (column.table.options.enableFilters ?? true) && !!column.accessorFn;
}
function column_getIsFiltered(column) {
  return column_getFilterIndex(column) > -1;
}
function column_getFilterValue(column) {
  return column.table.atoms.columnFilters?.get()?.find((d) => d.id === column.id)?.value;
}
function column_getFilterIndex(column) {
  return column.table.atoms.columnFilters?.get()?.findIndex((d) => d.id === column.id) ?? -1;
}
function column_setFilterValue(column, value) {
  table_setColumnFilters(column.table, (old) => {
    const filterFn = column_getFilterFn(column);
    const previousFilter = old.find((d) => d.id === column.id);
    const newFilter = functionalUpdate(value, previousFilter ? previousFilter.value : void 0);
    if (shouldAutoRemoveFilter(filterFn, newFilter, column)) return old.filter((d) => d.id !== column.id);
    const newFilterObj = {
      id: column.id,
      value: newFilter
    };
    if (previousFilter) return old.map((d) => {
      if (d.id === column.id) return newFilterObj;
      return d;
    });
    if (old.length) return [...old, newFilterObj];
    return [newFilterObj];
  });
}
function table_setColumnFilters(table, updater) {
  const leafColumnsById = table.getAllLeafColumnsById();
  const updateFn = (old) => {
    return functionalUpdate(updater, old).filter((filter) => {
      const column = leafColumnsById[filter.id];
      if (column) {
        if (shouldAutoRemoveFilter(column_getFilterFn(column), filter.value, column)) return false;
      }
      return true;
    });
  };
  table.options.onColumnFiltersChange?.(updateFn);
}
function table_resetColumnFilters(table, defaultState) {
  table_setColumnFilters(table, defaultState ? [] : cloneState(table.initialState.columnFilters ?? []));
}
function shouldAutoRemoveFilter(filterFn, value, column) {
  if (typeof value === "undefined") return true;
  if (filterFn?.autoRemove) return !!filterFn.autoRemove(value, column);
  return typeof value === "string" && !value;
}

// node_modules/@tanstack/table-core/dist/features/column-filtering/columnFilteringFeature.js
var columnFilteringFeature = {
  getInitialState: (initialState) => {
    return {
      columnFilters: getDefaultColumnFiltersState(),
      ...initialState
    };
  },
  getDefaultColumnDef: () => {
    return { filterFn: "auto" };
  },
  getDefaultTableOptions: (table) => {
    return {
      onColumnFiltersChange: makeStateUpdater("columnFilters", table),
      filterFromLeafRows: false,
      maxLeafRowFilterDepth: 100
    };
  },
  assignColumnPrototype: (prototype, table) => {
    assignPrototypeAPIs("columnFilteringFeature", prototype, table, {
      column_getAutoFilterFn: { fn: (column) => column_getAutoFilterFn(column) },
      column_getFilterFn: { fn: (column) => column_getFilterFn(column) },
      column_getCanFilter: { fn: (column) => column_getCanFilter(column) },
      column_getIsFiltered: { fn: (column) => column_getIsFiltered(column) },
      column_getFilterValue: { fn: (column) => column_getFilterValue(column) },
      column_getFilterIndex: { fn: (column) => column_getFilterIndex(column) },
      column_setFilterValue: { fn: (column, value) => column_setFilterValue(column, value) }
    });
  },
  initRowInstanceData: (row) => {
    row.columnFilters = makeObjectMap();
    row.columnFiltersMeta = makeObjectMap();
  },
  constructTableAPIs: (table) => {
    assignTableAPIs("columnFilteringFeature", table, {
      table_setColumnFilters: { fn: (updater) => table_setColumnFilters(table, updater) },
      table_resetColumnFilters: { fn: (defaultState) => table_resetColumnFilters(table, defaultState) }
    });
  }
};

// node_modules/@tanstack/table-core/dist/features/column-filtering/filterFns.js
function constructFilterFn(def) {
  const filterFn = Object.assign((row, columnId, filterValue, addMeta) => {
    const rawValue = row.getValue(columnId);
    const dataValue = filterFn.resolveDataValue ? filterFn.resolveDataValue(rawValue) : rawValue;
    return filterFn.filter(dataValue, filterValue, row, columnId, addMeta);
  }, def);
  return filterFn;
}
var filterFn_equals = constructFilterFn({
  filter: (dataValue, filterValue) => dataValue === filterValue,
  autoRemove: (val) => testFalsy(val)
});
var filterFn_weakEquals = constructFilterFn({
  filter: (dataValue, filterValue) => dataValue == filterValue,
  autoRemove: (val) => testFalsy(val)
});
var filterFn_includesStringSensitive = constructFilterFn({
  filter: (dataValue, filterValue) => Boolean(dataValue?.includes(filterValue)),
  autoRemove: (val) => testFalsy(val),
  resolveFilterValue: (val) => String(val),
  resolveDataValue: (val) => val == null ? void 0 : String(val)
});
var filterFn_includesString = constructFilterFn({
  filter: (dataValue, filterValue) => Boolean(dataValue?.includes(filterValue)),
  autoRemove: (val) => testFalsy(val),
  resolveFilterValue: (val) => String(val).toLowerCase(),
  resolveDataValue: (val) => val == null ? void 0 : String(val).toLowerCase()
});
var filterFn_equalsString = constructFilterFn({
  filter: (dataValue, filterValue) => dataValue === filterValue,
  autoRemove: (val) => testFalsy(val),
  resolveFilterValue: (val) => String(val).toLowerCase(),
  resolveDataValue: (val) => val == null ? void 0 : String(val).toLowerCase()
});
var filterFn_equalsStringSensitive = constructFilterFn({
  filter: (dataValue, filterValue) => dataValue === filterValue,
  autoRemove: (val) => testFalsy(val),
  resolveFilterValue: (val) => String(val),
  resolveDataValue: (val) => val == null ? void 0 : String(val)
});
var filterFn_startsWith = constructFilterFn({
  filter: (dataValue, filterValue) => Boolean(dataValue?.startsWith(filterValue)),
  autoRemove: (val) => testFalsy(val),
  resolveFilterValue: (val) => String(val).toLowerCase(),
  resolveDataValue: (val) => val == null ? void 0 : String(val).toLowerCase()
});
var filterFn_endsWith = constructFilterFn({
  filter: (dataValue, filterValue) => Boolean(dataValue?.endsWith(filterValue)),
  autoRemove: (val) => testFalsy(val),
  resolveFilterValue: (val) => String(val).toLowerCase(),
  resolveDataValue: (val) => val == null ? void 0 : String(val).toLowerCase()
});
var filterFn_empty = constructFilterFn({
  filter: (dataValue) => testValueEmpty(dataValue),
  autoRemove: (val) => testFalsy(val) || val === false
});
var filterFn_notEmpty = constructFilterFn({
  filter: (dataValue) => !testValueEmpty(dataValue),
  autoRemove: (val) => testFalsy(val) || val === false
});
var filterFn_greaterThan = constructFilterFn({
  filter: (dataValue, filterValue) => compareGreaterThan(dataValue, filterValue),
  autoRemove: (val) => testFalsy(val)
});
var filterFn_greaterThanOrEqualTo = constructFilterFn({
  filter: (dataValue, filterValue) => compareGreaterThanOrEqualTo(dataValue, filterValue),
  autoRemove: (val) => testFalsy(val)
});
var filterFn_lessThan = constructFilterFn({
  filter: (dataValue, filterValue) => !compareGreaterThanOrEqualTo(dataValue, filterValue),
  autoRemove: (val) => testFalsy(val)
});
var filterFn_lessThanOrEqualTo = constructFilterFn({
  filter: (dataValue, filterValue) => !compareGreaterThan(dataValue, filterValue),
  autoRemove: (val) => testFalsy(val)
});
var filterFn_between = constructFilterFn({
  filter: (dataValue, filterValues) => compareBetween(dataValue, filterValues, false),
  autoRemove: (val) => testFalsy(val) || Array.isArray(val) && testFalsy(val[0]) && testFalsy(val[1])
});
var filterFn_betweenInclusive = constructFilterFn({
  filter: (dataValue, filterValues) => compareBetween(dataValue, filterValues, true),
  autoRemove: (val) => testFalsy(val) || Array.isArray(val) && testFalsy(val[0]) && testFalsy(val[1])
});
var filterFn_inNumberRange = constructFilterFn({
  filter: (dataValue, filterValue) => {
    if (typeof dataValue !== "number" || Number.isNaN(dataValue)) return false;
    const [min, max] = filterValue;
    return dataValue >= min && dataValue <= max;
  },
  resolveFilterValue: (val) => {
    const [unsafeMin, unsafeMax] = val;
    const parsedMin = typeof unsafeMin !== "number" ? parseFloat(unsafeMin) : unsafeMin;
    const parsedMax = typeof unsafeMax !== "number" ? parseFloat(unsafeMax) : unsafeMax;
    let min = unsafeMin === null || Number.isNaN(parsedMin) ? -Infinity : parsedMin;
    let max = unsafeMax === null || Number.isNaN(parsedMax) ? Infinity : parsedMax;
    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }
    return [min, max];
  },
  autoRemove: (val) => testFalsy(val) || Array.isArray(val) && testFalsy(val[0]) && testFalsy(val[1])
});
var filterFn_inDateRange = constructFilterFn({
  filter: (dataValue, filterValue) => {
    const [min, max] = filterValue;
    return dataValue >= min && dataValue <= max;
  },
  resolveFilterValue: (val) => {
    const [unsafeMin, unsafeMax] = val;
    const parsedMin = toDateTimestamp(unsafeMin);
    const parsedMax = toDateTimestamp(unsafeMax);
    let min = Number.isNaN(parsedMin) ? -Infinity : parsedMin;
    let max = Number.isNaN(parsedMax) ? Infinity : parsedMax;
    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }
    return [min, max];
  },
  resolveDataValue: (val) => toDateTimestamp(val),
  autoRemove: (val) => testFalsy(val) || Array.isArray(val) && testFalsy(val[0]) && testFalsy(val[1])
});
var filterFn_arrHas = constructFilterFn({
  filter: (dataValue, filterValue) => {
    for (let i = 0; i < filterValue.length; i++) if (dataValue === filterValue[i]) return true;
    return false;
  },
  autoRemove: (val) => testFalsy(val) || !val?.length
});
var filterFn_arrIncludes = constructFilterFn({
  filter: (dataValue, filterValue) => {
    if (typeof dataValue !== "string" && !Array.isArray(dataValue)) return false;
    for (let i = 0; i < filterValue.length; i++) if (dataValue.includes(filterValue[i])) return true;
    return false;
  },
  autoRemove: (val) => testFalsy(val) || !val?.length
});
var filterFn_arrIncludesAll = constructFilterFn({
  filter: (dataValue, filterValue) => {
    if (!Array.isArray(dataValue)) return false;
    for (let i = 0; i < filterValue.length; i++) if (!dataValue.includes(filterValue[i])) return false;
    return true;
  },
  autoRemove: (val) => testFalsy(val) || !val?.length
});
var filterFn_arrIncludesSome = constructFilterFn({
  filter: (dataValue, filterValue) => {
    if (!Array.isArray(dataValue)) return false;
    for (let i = 0; i < filterValue.length; i++) if (dataValue.includes(filterValue[i])) return true;
    return false;
  },
  autoRemove: (val) => testFalsy(val) || !val?.length
});
function testFalsy(val) {
  return val === void 0 || val === null || val === "";
}
function testValueEmpty(dataValue) {
  return dataValue == null || String(dataValue).trim() === "";
}
function toDateTimestamp(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (value == null || value === "") return NaN;
  return new Date(value).getTime();
}
function compareGreaterThan(dataValue, filterValue) {
  const numericDataValue = dataValue == null ? 0 : +dataValue;
  const numericFilterValue = Number(filterValue);
  if (!isNaN(numericFilterValue) && !isNaN(numericDataValue)) return numericDataValue > numericFilterValue;
  return String(dataValue ?? "").toLowerCase().trim() > String(filterValue).toLowerCase().trim();
}
function compareGreaterThanOrEqualTo(dataValue, filterValue) {
  return dataValue === filterValue || compareGreaterThan(dataValue, filterValue);
}
function compareBetween(dataValue, filterValues, inclusive) {
  const min = filterValues[0];
  const hasMin = min !== "" && min !== void 0;
  if (hasMin) {
    if (!(inclusive ? compareGreaterThanOrEqualTo(dataValue, min) : compareGreaterThan(dataValue, min))) return false;
  }
  const max = filterValues[1];
  if (max === "" || max === void 0) return true;
  if (hasMin) {
    const numericMin = Number(min);
    const numericMax = Number(max);
    if (!isNaN(numericMin) && !isNaN(numericMax) && numericMin > numericMax) return true;
  }
  return inclusive ? !compareGreaterThan(dataValue, max) : !compareGreaterThanOrEqualTo(dataValue, max);
}

// node_modules/@tanstack/table-core/dist/features/global-filtering/globalFilteringFeature.utils.js
function column_getCanGlobalFilter(column) {
  return (column.columnDef.enableGlobalFilter ?? true) && (column.table.options.enableGlobalFilter ?? true) && (column.table.options.enableFilters ?? true) && (column.table.options.getColumnCanGlobalFilter?.(column) ?? true) && !!column.accessorFn;
}
function table_getGlobalAutoFilterFn() {
  return filterFn_includesString;
}
function table_getGlobalFilterFn(table) {
  const { globalFilterFn } = table.options;
  const filterFns = table._rowModelFns.filterFns;
  const filterFn = isFunction(globalFilterFn) ? globalFilterFn : globalFilterFn === "auto" ? table_getGlobalAutoFilterFn() : filterFns?.[globalFilterFn];
  if (!filterFn && globalFilterFn != null) console.warn(`globalFilterFn '${String(globalFilterFn)}' is not registered`);
  return filterFn;
}

// node_modules/@tanstack/table-core/dist/features/row-sorting/rowSortingFeature.js
var rowSortingFeature = {
  getInitialState(initialState) {
    return {
      sorting: getDefaultSortingState(),
      ...initialState
    };
  },
  getDefaultColumnDef() {
    return {
      sortFn: "auto",
      sortUndefined: 1
    };
  },
  getDefaultTableOptions(table) {
    return {
      autoResetSorting: false,
      onSortingChange: makeStateUpdater("sorting", table),
      isMultiSortEvent: (e) => {
        return e.shiftKey;
      }
    };
  },
  assignColumnPrototype(prototype, table) {
    assignPrototypeAPIs("rowSortingFeature", prototype, table, {
      column_getAutoSortFn: { fn: (column) => column_getAutoSortFn(column) },
      column_getAutoSortDir: { fn: (column) => column_getAutoSortDir(column) },
      column_getSortFn: { fn: (column) => column_getSortFn(column) },
      column_toggleSorting: { fn: (column, desc, multi) => column_toggleSorting(column, desc, multi) },
      column_getFirstSortDir: { fn: (column) => column_getFirstSortDir(column) },
      column_getNextSortingOrder: { fn: (column, multi) => column_getNextSortingOrder(column, multi) },
      column_getCanSort: { fn: (column) => column_getCanSort(column) },
      column_getCanMultiSort: { fn: (column) => column_getCanMultiSort(column) },
      column_getIsSorted: { fn: (column) => column_getIsSorted(column) },
      column_getSortIndex: { fn: (column) => column_getSortIndex(column) },
      column_clearSorting: { fn: (column) => column_clearSorting(column) },
      column_getToggleSortingHandler: { fn: (column) => column_getToggleSortingHandler(column) }
    });
  },
  constructTableAPIs(table) {
    assignTableAPIs("rowSortingFeature", table, {
      table_setSorting: { fn: (updater) => table_setSorting(table, updater) },
      table_resetSorting: { fn: (defaultState) => table_resetSorting(table, defaultState) }
    });
  }
};

// node_modules/@tanstack/table-core/dist/features/column-filtering/filterRowsUtils.js
function filterRows(rows, filterRowImpl, table) {
  if (table.options.filterFromLeafRows) return filterRowModelFromLeafs(rows, filterRowImpl, table);
  return filterRowModelFromRoot(rows, filterRowImpl, table);
}
function filterRowModelFromLeafs(rowsToFilter, filterRow, table) {
  const newFilteredFlatRows = [];
  const newFilteredRowsById = makeObjectMap();
  const maxDepth = table.options.maxLeafRowFilterDepth ?? 100;
  const recurseFilterRows = (rowsToFilter2, depth = 0) => {
    const filteredRows = [];
    for (let row of rowsToFilter2) {
      const newRow = constructRow(table, row.id, row.original, row.index, row.depth, void 0, row.parentId);
      newRow.columnFilters = row.columnFilters;
      if (row.subRows.length && depth < maxDepth) {
        newRow.subRows = recurseFilterRows(row.subRows, depth + 1);
        row = newRow;
        if (filterRow(row) && !newRow.subRows.length) {
          filteredRows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
          continue;
        }
        if (filterRow(row) || newRow.subRows.length) {
          filteredRows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
          continue;
        }
      } else {
        row = newRow;
        if (filterRow(row)) {
          filteredRows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
        }
      }
    }
    return filteredRows;
  };
  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById
  };
}
function filterRowModelFromRoot(rowsToFilter, filterRow, table) {
  const newFilteredFlatRows = [];
  const newFilteredRowsById = makeObjectMap();
  const maxDepth = table.options.maxLeafRowFilterDepth ?? 100;
  const recurseFilterRows = (rowsToFilter2, depth = 0) => {
    const filteredRows = [];
    for (let row of rowsToFilter2) if (filterRow(row)) {
      if (row.subRows.length && depth < maxDepth) {
        const newRow = constructRow(table, row.id, row.original, row.index, row.depth, void 0, row.parentId);
        newRow.subRows = recurseFilterRows(row.subRows, depth + 1);
        row = newRow;
      }
      filteredRows.push(row);
      newFilteredFlatRows.push(row);
      newFilteredRowsById[row.id] = row;
      if (row.subRows.length && depth >= maxDepth) addSubRowsToFlatArrays(row.subRows, newFilteredFlatRows, newFilteredRowsById);
    }
    return filteredRows;
  };
  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById
  };
}
function addSubRowsToFlatArrays(subRows, flatRows, rowsById) {
  for (const subRow of subRows) {
    flatRows.push(subRow);
    rowsById[subRow.id] = subRow;
    if (subRow.subRows.length) addSubRowsToFlatArrays(subRow.subRows, flatRows, rowsById);
  }
}

// node_modules/@tanstack/table-core/dist/features/column-filtering/createFilteredRowModel.js
function createFilteredRowModel() {
  return (_table) => {
    const table = _table;
    return tableMemo({
      feature: "columnFilteringFeature",
      table,
      fnName: "table.getFilteredRowModel",
      memoDeps: () => [
        table.getPreFilteredRowModel(),
        table.atoms.columnFilters?.get(),
        table.atoms.globalFilter?.get()
      ],
      fn: () => _createFilteredRowModel(table),
      onAfterUpdate: skipFirstRun(() => table_autoResetPageIndex(table))
    });
  };
}
function _createFilteredRowModel(table) {
  const rowModel = table.getPreFilteredRowModel();
  const columnFilters = table.atoms.columnFilters?.get();
  const globalFilter = table.atoms.globalFilter?.get();
  const hasGlobalFilter = globalFilter !== void 0 && globalFilter !== null && globalFilter !== "";
  if (!rowModel.rows.length || !columnFilters?.length && !hasGlobalFilter) {
    const flatRows2 = rowModel.flatRows;
    for (let i = 0; i < flatRows2.length; i++) {
      const row = flatRows2[i];
      row.columnFilters = makeObjectMap();
      row.columnFiltersMeta = makeObjectMap();
    }
    return rowModel;
  }
  const resolvedColumnFilters = [];
  const resolvedGlobalFilters = [];
  columnFilters?.forEach((columnFilter) => {
    const column = table_getColumn(table, columnFilter.id);
    if (!column) return;
    const filterFn = column_getFilterFn(column);
    if (!filterFn) return;
    resolvedColumnFilters.push({
      id: columnFilter.id,
      filterFn,
      resolvedValue: filterFn.resolveFilterValue?.(columnFilter.value) ?? columnFilter.value
    });
  });
  const filterableIds = columnFilters?.map((d) => d.id) ?? [];
  const globalFilterFn = table_getGlobalFilterFn(table);
  const globallyFilterableColumns = table.getAllLeafColumns().filter((column) => column_getCanGlobalFilter(column));
  if (hasGlobalFilter && globalFilterFn && globallyFilterableColumns.length) {
    filterableIds.push("__global__");
    globallyFilterableColumns.forEach((column) => {
      resolvedGlobalFilters.push({
        id: column.id,
        filterFn: globalFilterFn,
        resolvedValue: globalFilterFn.resolveFilterValue?.(globalFilter) ?? globalFilter
      });
    });
  }
  const flatRows = rowModel.flatRows;
  for (let i = 0; i < flatRows.length; i++) {
    const row = flatRows[i];
    row.columnFilters = makeObjectMap();
    row.columnFiltersMeta = makeObjectMap();
    if (resolvedColumnFilters.length) for (let j = 0; j < resolvedColumnFilters.length; j++) {
      const currentColumnFilter = resolvedColumnFilters[j];
      const id = currentColumnFilter.id;
      row.columnFilters[id] = currentColumnFilter.filterFn(row, id, currentColumnFilter.resolvedValue, (filterMeta) => {
        if (!row.columnFiltersMeta) row.columnFiltersMeta = makeObjectMap();
        row.columnFiltersMeta[id] = filterMeta;
      });
    }
    if (resolvedGlobalFilters.length) {
      for (let j = 0; j < resolvedGlobalFilters.length; j++) {
        const currentGlobalFilter = resolvedGlobalFilters[j];
        const id = currentGlobalFilter.id;
        if (currentGlobalFilter.filterFn(row, id, currentGlobalFilter.resolvedValue, (filterMeta) => {
          if (!row.columnFiltersMeta) row.columnFiltersMeta = makeObjectMap();
          row.columnFiltersMeta[id] = filterMeta;
        })) {
          row.columnFilters.__global__ = true;
          break;
        }
      }
      if (row.columnFilters.__global__ !== true) row.columnFilters.__global__ = false;
    }
  }
  const filterRowsImpl = (row) => {
    for (let i = 0; i < filterableIds.length; i++) if (row.columnFilters[filterableIds[i]] === false) return false;
    return true;
  };
  return filterRows(rowModel.rows, filterRowsImpl, table);
}

// node_modules/@tanstack/table-core/dist/features/row-sorting/createSortedRowModel.js
function createSortedRowModel() {
  return (_table) => {
    const table = _table;
    return tableMemo({
      feature: "rowSortingFeature",
      table,
      fnName: "table.getSortedRowModel",
      memoDeps: () => [table.atoms.sorting?.get(), table.getPreSortedRowModel()],
      fn: () => _createSortedRowModel(table),
      onAfterUpdate: skipFirstRun(() => table_autoResetPageIndex(table))
    });
  };
}
function _createSortedRowModel(table) {
  const preSortedRowModel = table.getPreSortedRowModel();
  const sorting = table.atoms.sorting?.get();
  if (!preSortedRowModel.rows.length || !sorting?.length) return preSortedRowModel;
  const sortedFlatRows = [];
  const availableSorting = sorting.filter((sort) => {
    const column = table.getColumn(sort.id);
    return column ? column_getCanSort(column) : false;
  });
  if (!availableSorting.length) return preSortedRowModel;
  const resolvedSorting = [];
  for (let i = 0; i < availableSorting.length; i++) {
    const sortEntry = availableSorting[i];
    const column = table.getColumn(sortEntry.id);
    if (!column) continue;
    resolvedSorting.push({
      id: sortEntry.id,
      desc: sortEntry.desc,
      sortUndefined: column.columnDef.sortUndefined,
      invertSorting: column.columnDef.invertSorting,
      sortFn: column_getSortFn(column)
    });
  }
  const compareRows = (rowA, rowB) => {
    for (let i = 0; i < resolvedSorting.length; i++) {
      const sortEntry = resolvedSorting[i];
      const sortUndefined = sortEntry.sortUndefined;
      const isDesc = sortEntry.desc;
      let sortInt = 0;
      if (sortUndefined) {
        const aValue = rowA.getValue(sortEntry.id);
        const bValue = rowB.getValue(sortEntry.id);
        const aUndefined = aValue === void 0;
        const bUndefined = bValue === void 0;
        if (aUndefined && bUndefined) continue;
        if (aUndefined || bUndefined) {
          if (sortUndefined === "first") return aUndefined ? -1 : 1;
          if (sortUndefined === "last") return aUndefined ? 1 : -1;
          sortInt = aUndefined ? sortUndefined : -sortUndefined;
        }
      }
      if (sortInt === 0) sortInt = sortEntry.sortFn(rowA, rowB, sortEntry.id);
      if (sortInt !== 0) {
        if (isDesc) sortInt *= -1;
        if (sortEntry.invertSorting) sortInt *= -1;
        return sortInt;
      }
    }
    return rowA.index - rowB.index;
  };
  const sortData = (rows) => {
    const sortedData = rows.slice();
    sortedData.sort(compareRows);
    let changed = false;
    for (let i = 0; i < sortedData.length; i++) {
      const row = sortedData[i];
      if (row !== rows[i]) changed = true;
      if (row.subRows.length) {
        const sortedSubRows = sortData(row.subRows);
        if (sortedSubRows.changed) {
          const cloned = Object.create(Object.getPrototypeOf(row));
          copyInstancePropertiesWithoutMemos(cloned, row);
          cloned.subRows = sortedSubRows.rows;
          sortedData[i] = cloned;
          sortedFlatRows.push(cloned);
          changed = true;
        } else sortedFlatRows.push(row);
      } else sortedFlatRows.push(row);
    }
    return {
      rows: sortedData,
      changed
    };
  };
  return {
    rows: sortData(preSortedRowModel.rows).rows,
    flatRows: sortedFlatRows,
    rowsById: preSortedRowModel.rowsById
  };
}

// node_modules/@tanstack/react-table/dist/useTable.js
var import_react7 = __toESM(require_react(), 1);
var useIsomorphicLayoutEffect = typeof window === "undefined" ? import_react7.useEffect : import_react7.useLayoutEffect;
function useTable2(tableOptions, selector) {
  const [{ table, rootSource }] = (0, import_react7.useState)(() => {
    const tableInstance = constructTable({
      ...tableOptions,
      features: {
        coreReactivityFeature: reactReactivity(),
        ...tableOptions.features
      }
    });
    tableInstance.Subscribe = (props) => {
      return Subscribe({
        ...props,
        source: props.source ?? tableInstance.store
      });
    };
    tableInstance.FlexRender = FlexRender;
    return {
      table: tableInstance,
      rootSource: createRenderPhaseSource(tableInstance.store, shallow)
    };
  });
  const coreTable = table;
  table_setOptions(coreTable, (prev) => ({
    ...prev,
    ...tableOptions
  }), { syncExternalState: false });
  const controlledState = coreTable.options.state;
  const renderSnapshot = rootSource.get();
  const state = useSelector(rootSource, selector, { compare: shallow });
  useIsomorphicLayoutEffect(() => {
    rootSource.markCommitted(renderSnapshot);
    table_publishExternalState(coreTable, controlledState ?? null, shallow);
  });
  return (0, import_react7.useMemo)(() => ({
    ...table,
    options: tableOptions,
    state
  }), [
    table,
    tableOptions,
    state
  ]);
}

// packages/render/table/tableTanstack.ts
var isEmptyValue = (value) => value === null || value === void 0 || value === "";
var compareTableValues = (a, b) => {
  const aEmpty = isEmptyValue(a);
  const bEmpty = isEmptyValue(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  const aNum = typeof a === "number" ? a : Number(a);
  const bNum = typeof b === "number" ? b : Number(b);
  if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
    return aNum - bNum;
  }
  return String(a).localeCompare(String(b), "zh-Hans-CN", { numeric: true });
};
var partitionEmptyLast = (rows, columnName) => {
  const nonEmpty = [];
  const empty = [];
  for (const row of rows) {
    if (isEmptyValue(row[columnName])) {
      empty.push(row);
    } else {
      nonEmpty.push(row);
    }
  }
  return [...nonEmpty, ...empty];
};
var tableColumnSort = (rowA, rowB, columnId) => compareTableValues(rowA.getValue(columnId), rowB.getValue(columnId));
var matchesTableFilter = (value, filterValue) => {
  const expected = String(filterValue ?? "").trim();
  if (!expected) return true;
  return String(value ?? "").trim() === expected;
};
var tableColumnFilter = (row, columnId, filterValue) => matchesTableFilter(row.getValue(columnId), filterValue);
var tableFeatures = {
  rowSortingFeature,
  columnFilteringFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortFns: { tableColumnSort },
  filterFns: { tableColumnFilter }
};
var columnHelper = createColumnHelper();
var buildTableColumnDefs = (columns) => columns.map(
  (col) => columnHelper.accessor((row) => row[col.name], {
    id: col.id,
    header: col.label ?? col.name,
    sortFn: "tableColumnSort",
    filterFn: "tableColumnFilter"
  })
);
var sortRuleToSorting = (sortRule) => sortRule ? [{ id: sortRule.columnId, desc: sortRule.direction === "desc" }] : [];
var sortingToSortRule = (sorting) => {
  const first = sorting[0];
  return first ? { columnId: first.id, direction: first.desc ? "desc" : "asc" } : null;
};
var buildColumnFilters = (statusFilterColumn, statusValue, ownerFilterColumn, ownerValue) => {
  const filters = [];
  if (statusFilterColumn && statusValue.trim()) {
    filters.push({ id: statusFilterColumn.id, value: statusValue });
  }
  if (ownerFilterColumn && ownerValue.trim()) {
    filters.push({ id: ownerFilterColumn.id, value: ownerValue });
  }
  return filters;
};

// packages/render/table/useTablePrefs.ts
var import_react8 = __toESM(require_react(), 1);
function useTablePrefs(tableKey, rows) {
  const [manualOrder, setManualOrder] = (0, import_react8.useState)(
    () => readTablePrefs(tableKey).manualOrder
  );
  const [sortRule, setSortRule] = (0, import_react8.useState)(
    () => readTablePrefs(tableKey).sort
  );
  (0, import_react8.useEffect)(() => {
    const prefs = readTablePrefs(tableKey);
    setManualOrder(prefs.manualOrder);
    setSortRule(prefs.sort);
  }, [tableKey]);
  const persistPrefs = (0, import_react8.useCallback)(
    (next) => {
      const current = readTablePrefs(tableKey);
      writeTablePrefs(tableKey, {
        sort: next.sort !== void 0 ? next.sort : current.sort,
        manualOrder: next.manualOrder !== void 0 ? next.manualOrder : current.manualOrder
      });
    },
    [tableKey]
  );
  const handleSortClick = (0, import_react8.useCallback)(
    (columnId) => {
      setSortRule((prev) => {
        if (!prev || prev.columnId !== columnId) {
          const next = { columnId, direction: "asc" };
          persistPrefs({ sort: next });
          return next;
        }
        if (prev.direction === "asc") {
          const next = { columnId, direction: "desc" };
          persistPrefs({ sort: next });
          return next;
        }
        persistPrefs({ sort: null });
        return null;
      });
    },
    [persistPrefs]
  );
  const handleRowDrop = (0, import_react8.useCallback)(
    (draggingRowKey, targetRowDbKey, position) => {
      if (!draggingRowKey || draggingRowKey === targetRowDbKey) {
        return;
      }
      setManualOrder((prev) => {
        const base = prev ?? rows.filter((row) => row?.dbKey).map((row) => row.dbKey);
        const filtered = base.filter((key) => key !== draggingRowKey);
        const targetIndex = filtered.indexOf(targetRowDbKey);
        if (targetIndex < 0) {
          const next2 = [...filtered, draggingRowKey];
          persistPrefs({ manualOrder: next2 });
          return next2;
        }
        const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
        const next = [
          ...filtered.slice(0, insertIndex),
          draggingRowKey,
          ...filtered.slice(insertIndex)
        ];
        persistPrefs({ manualOrder: next });
        return next;
      });
    },
    [persistPrefs, rows]
  );
  return {
    manualOrder,
    setManualOrder,
    sortRule,
    setSortRule,
    persistPrefs,
    handleSortClick,
    handleRowDrop
  };
}

// packages/render/table/useCellEditing.ts
var import_react9 = __toESM(require_react(), 1);
function useCellEditing(rows, filteredRows, columns, dispatch) {
  const [editingCell, setEditingCell] = (0, import_react9.useState)(null);
  const [editingValue, setEditingValue] = (0, import_react9.useState)("");
  const saveCurrentEdit = (0, import_react9.useCallback)(() => {
    if (!editingCell) return;
    const { dbKey, columnName } = editingCell;
    const row = rows.find((r) => r.dbKey === dbKey);
    const oldValue = row ? String(row[columnName] ?? "") : "";
    if (editingValue !== oldValue) {
      void dispatch(updateCell({ dbKey, columnName, value: editingValue }));
    }
  }, [dispatch, editingCell, editingValue, rows]);
  const finishEdit = (0, import_react9.useCallback)(
    (save) => {
      if (save) {
        saveCurrentEdit();
      }
      setEditingCell(null);
      setEditingValue("");
    },
    [saveCurrentEdit]
  );
  const switchCell = (0, import_react9.useCallback)(
    (direction) => {
      if (!editingCell || !columns) return;
      const columnsInner = columns;
      const currentRowIndex = filteredRows.findIndex(
        (r) => r.dbKey === editingCell.dbKey
      );
      const currentColIndex = columnsInner.findIndex(
        (c) => c.name === editingCell.columnName
      );
      if (currentRowIndex === -1 || currentColIndex === -1) return;
      let nextRowIndex = currentRowIndex;
      let nextColIndex = currentColIndex;
      if (direction === "next") {
        nextColIndex++;
        if (nextColIndex >= columnsInner.length) {
          nextColIndex = 0;
          nextRowIndex++;
        }
      } else if (direction === "prev") {
        nextColIndex--;
        if (nextColIndex < 0) {
          nextColIndex = columnsInner.length - 1;
          nextRowIndex--;
        }
      } else if (direction === "down") {
        nextRowIndex++;
      } else if (direction === "up") {
        nextRowIndex--;
      }
      if (direction === "next" || direction === "prev") {
        const step = direction === "next" ? 1 : -1;
        let guard = 0;
        while (guard < columnsInner.length && columnsInner[nextColIndex]?.type === "select") {
          nextColIndex += step;
          if (nextColIndex >= columnsInner.length) {
            nextColIndex = 0;
            nextRowIndex++;
          } else if (nextColIndex < 0) {
            nextColIndex = columnsInner.length - 1;
            nextRowIndex--;
          }
          guard++;
        }
        if (columnsInner[nextColIndex]?.type === "select") {
          finishEdit(true);
          return;
        }
      }
      const isRowValid = nextRowIndex >= 0 && nextRowIndex < filteredRows.length;
      const isColValid = nextColIndex >= 0 && nextColIndex < columnsInner.length;
      if (isRowValid && isColValid) {
        saveCurrentEdit();
        const nextRow = filteredRows[nextRowIndex];
        const nextCol = columnsInner[nextColIndex];
        const nextValue = String(nextRow[nextCol.name] ?? "");
        setEditingCell({ dbKey: nextRow.dbKey, columnName: nextCol.name });
        setEditingValue(nextValue);
      } else {
        finishEdit(true);
      }
    },
    [editingCell, columns, filteredRows, saveCurrentEdit, finishEdit]
  );
  const handleKeyDown = (0, import_react9.useCallback)(
    (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        switchCell(e.shiftKey ? "prev" : "next");
        return;
      }
      if (e.key === "Enter") {
        if (e.shiftKey) {
          return;
        }
        e.preventDefault();
        switchCell("down");
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        finishEdit(false);
        return;
      }
    },
    [switchCell, finishEdit]
  );
  const handleStartEdit = (0, import_react9.useCallback)(
    (dbKey, columnName, value) => {
      setEditingCell({ dbKey, columnName });
      setEditingValue(value);
    },
    []
  );
  const handleEditingValueChange = (0, import_react9.useCallback)((value) => {
    setEditingValue(value);
  }, []);
  return {
    editingCell,
    setEditingCell,
    editingValue,
    setEditingValue,
    saveCurrentEdit,
    finishEdit,
    switchCell,
    handleKeyDown,
    handleStartEdit,
    handleEditingValueChange
  };
}

// packages/render/table/useRowInsertion.ts
var import_react10 = __toESM(require_react(), 1);

// packages/render/table/rowOrderUtils.ts
var insertKeyIntoOrder = (order, visibleKeys, newKey, anchor) => {
  const base = (order ?? visibleKeys).filter((key) => key !== newKey);
  if (anchor.type === "top") {
    return [newKey, ...base];
  }
  if (anchor.type === "bottom") {
    return [...base, newKey];
  }
  const anchorIndex = base.indexOf(anchor.key);
  if (anchorIndex < 0) {
    return [...base, newKey];
  }
  return [
    ...base.slice(0, anchorIndex + 1),
    newKey,
    ...base.slice(anchorIndex + 1)
  ];
};
var anchorForInsertAbove = (visibleKeys, targetKey) => {
  const index = visibleKeys.indexOf(targetKey);
  if (index < 0) {
    return { type: "bottom" };
  }
  if (index === 0) {
    return { type: "top" };
  }
  return { type: "after", key: visibleKeys[index - 1] };
};

// packages/render/table/useRowInsertion.ts
function useRowInsertion({
  tenantId,
  tableId,
  rows,
  sortedAndOrderedRows,
  primaryColumn,
  sortRule,
  manualOrder,
  setManualOrder,
  persistPrefs,
  selectedStatusFilter,
  selectedOwnerFilter,
  setEditingCell,
  setEditingValue,
  dispatch
}) {
  const insertRowAt = (0, import_react10.useCallback)(
    async (anchor) => {
      if (!tenantId || !tableId) return;
      const action = await dispatch(addRow({ tenantId, tableId, values: {} }));
      if (!addRow.fulfilled.match(action)) {
        toast.error("\u65B0\u589E\u884C\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
        return;
      }
      const newDbKey = action.payload?.dbKey;
      if (!newDbKey) {
        toast.error("\u65B0\u589E\u884C\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
        return;
      }
      if (sortRule) {
        toast("\u5DF2\u6309\u5F53\u524D\u6392\u5E8F\u89C4\u5219\u653E\u7F6E\u65B0\u884C");
      } else if (anchor.type !== "bottom") {
        const visibleKeys = rows.filter((row) => row?.dbKey).map((row) => row.dbKey);
        const nextOrder = insertKeyIntoOrder(
          manualOrder,
          visibleKeys,
          newDbKey,
          anchor
        );
        setManualOrder(nextOrder);
        persistPrefs({ manualOrder: nextOrder });
      }
      if (selectedStatusFilter || selectedOwnerFilter) {
        toast("\u65B0\u884C\u5DF2\u88AB\u5F53\u524D\u7B5B\u9009\u9690\u85CF\uFF0C\u6E05\u9664\u7B5B\u9009\u540E\u53EF\u89C1");
      }
      if (primaryColumn && primaryColumn.type !== "select") {
        setEditingCell({ dbKey: newDbKey, columnName: primaryColumn.name });
        setEditingValue("");
      }
    },
    [
      dispatch,
      manualOrder,
      persistPrefs,
      primaryColumn,
      rows,
      selectedOwnerFilter,
      selectedStatusFilter,
      setEditingCell,
      setEditingValue,
      setManualOrder,
      sortRule,
      tableId,
      tenantId
    ]
  );
  const handleInsertRowBelow = (0, import_react10.useCallback)(
    (dbKey) => {
      void insertRowAt({ type: "after", key: dbKey });
    },
    [insertRowAt]
  );
  const handleInsertRowAbove = (0, import_react10.useCallback)(
    (dbKey) => {
      const visibleKeys = sortedAndOrderedRows.filter((row) => row?.dbKey).map((row) => row.dbKey);
      void insertRowAt(anchorForInsertAbove(visibleKeys, dbKey));
    },
    [insertRowAt, sortedAndOrderedRows]
  );
  const handleAddRowTop = (0, import_react10.useCallback)(() => {
    void insertRowAt({ type: "top" });
  }, [insertRowAt]);
  const handleAddRowBottom = (0, import_react10.useCallback)(() => {
    void insertRowAt({ type: "bottom" });
  }, [insertRowAt]);
  return {
    insertRowAt,
    handleInsertRowBelow,
    handleInsertRowAbove,
    handleAddRowTop,
    handleAddRowBottom
  };
}

// packages/render/table/useGridDragDrop.ts
var import_react11 = __toESM(require_react(), 1);
function useGridDragDrop(handleRowDrop) {
  const [draggingRowKey, setDraggingRowKey] = (0, import_react11.useState)(null);
  const [dropTarget, setDropTarget] = (0, import_react11.useState)(null);
  const handleRowDragStart = (0, import_react11.useCallback)(
    (dbKey, e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dbKey);
      setDraggingRowKey(dbKey);
      setDropTarget(null);
    },
    []
  );
  const handleRowDragEnd = (0, import_react11.useCallback)(() => {
    setDraggingRowKey(null);
    setDropTarget(null);
  }, []);
  const handleRowDragOver = (0, import_react11.useCallback)(
    (dbKey, e) => {
      if (!draggingRowKey || draggingRowKey === dbKey) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = e.currentTarget.getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
      setDropTarget((prev) => {
        if (prev && prev.rowDbKey === dbKey && prev.position === position) {
          return prev;
        }
        return { rowDbKey: dbKey, position };
      });
    },
    [draggingRowKey]
  );
  const handleRowDragLeave = (0, import_react11.useCallback)((dbKey) => {
    setDropTarget((prev) => prev?.rowDbKey === dbKey ? null : prev);
  }, []);
  const handleRowDropOnKey = (0, import_react11.useCallback)(
    (dbKey) => {
      if (!draggingRowKey) {
        setDropTarget(null);
        return;
      }
      const position = dropTarget && dropTarget.rowDbKey === dbKey ? dropTarget.position : "after";
      handleRowDrop(draggingRowKey, dbKey, position);
      setDraggingRowKey(null);
      setDropTarget(null);
    },
    [draggingRowKey, dropTarget, handleRowDrop]
  );
  return {
    draggingRowKey,
    setDraggingRowKey,
    dropTarget,
    setDropTarget,
    handleRowDragStart,
    handleRowDragEnd,
    handleRowDragOver,
    handleRowDragLeave,
    handleRowDropOnKey
  };
}

// packages/render/table/useKanbanBoard.ts
var import_react12 = __toESM(require_react(), 1);
function useKanbanBoard({
  tableDisplayMode,
  statusFilterColumn,
  statusFilterOptions,
  columns,
  selectedViewChoice,
  filteredRows,
  rows,
  draggingRowKey,
  setDraggingRowKey,
  dropTarget,
  setDropTarget,
  handleRowDrop,
  dispatch
}) {
  const [kanbanDropTargetGroup, setKanbanDropTargetGroup] = (0, import_react12.useState)(null);
  const kanbanDisplayMode = (0, import_react12.useMemo)(() => {
    if (tableDisplayMode.type === "kanban") return tableDisplayMode;
    if (!statusFilterColumn) return GRID_DISPLAY_MODE;
    return {
      type: "kanban",
      viewName: "\u770B\u677F",
      groupColumnName: statusFilterColumn.name,
      visibleColumnNames: columns.map((column) => column.name),
      preferredGroupValues: statusFilterOptions
    };
  }, [columns, statusFilterColumn, statusFilterOptions, tableDisplayMode]);
  const canUseKanbanView = kanbanDisplayMode.type === "kanban";
  const activeViewChoice = selectedViewChoice === "grid" ? "grid" : selectedViewChoice === "kanban" && canUseKanbanView ? "kanban" : tableDisplayMode.type === "kanban" && canUseKanbanView ? "kanban" : "grid";
  const activeDisplayMode = (0, import_react12.useMemo)(
    () => activeViewChoice === "kanban" && kanbanDisplayMode.type === "kanban" ? kanbanDisplayMode : GRID_DISPLAY_MODE,
    [activeViewChoice, kanbanDisplayMode]
  );
  const kanbanDetailColumns = (0, import_react12.useMemo)(() => {
    if (activeDisplayMode.type !== "kanban") return EMPTY_TABLE_COLUMNS;
    const groupColumnName = activeDisplayMode.groupColumnName;
    return columns.filter(
      (column) => column.name !== groupColumnName && !column.isPrimary && activeDisplayMode.visibleColumnNames.includes(column.name)
    );
  }, [activeDisplayMode, columns]);
  const kanbanGroups = (0, import_react12.useMemo)(() => {
    if (activeDisplayMode.type !== "kanban") return [];
    const groupMap = /* @__PURE__ */ new Map();
    filteredRows.forEach((row) => {
      const rawValue = String(row[activeDisplayMode.groupColumnName] ?? "");
      const normalizedValue = normalizeKanbanStatusValue(rawValue);
      const list = groupMap.get(normalizedValue) ?? [];
      list.push(row);
      groupMap.set(normalizedValue, list);
    });
    const definedOptions = activeDisplayMode.preferredGroupValues.filter(
      (value) => value.trim().length > 0
    );
    const result = definedOptions.map((option) => ({
      groupValue: option,
      rows: groupMap.get(option) ?? []
    }));
    if (groupMap.has("\u672A\u5206\u7C7B")) {
      result.push({
        groupValue: "\u672A\u5206\u7C7B",
        rows: groupMap.get("\u672A\u5206\u7C7B") ?? []
      });
    }
    return result;
  }, [activeDisplayMode, filteredRows]);
  const handleKanbanCardDragStart = (0, import_react12.useCallback)(
    (dbKey, e) => {
      setDraggingRowKey(dbKey);
      try {
        e.dataTransfer.setData("text/plain", dbKey);
        e.dataTransfer.setData("application/x-nolo-card", dbKey);
      } catch {
      }
      e.dataTransfer.effectAllowed = "move";
    },
    [setDraggingRowKey]
  );
  const handleKanbanCardDragEnd = (0, import_react12.useCallback)(() => {
    setDraggingRowKey(null);
    setDropTarget(null);
    setKanbanDropTargetGroup(null);
  }, [setDraggingRowKey, setDropTarget]);
  const handleKanbanColumnDragOver = (0, import_react12.useCallback)(
    (groupValue, e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setKanbanDropTargetGroup(groupValue);
    },
    []
  );
  const handleKanbanColumnDragLeave = (0, import_react12.useCallback)(
    (groupValue, e) => {
      const currentTarget = e.currentTarget;
      const relatedTarget = e.relatedTarget;
      if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
        return;
      }
      setKanbanDropTargetGroup((prev) => prev === groupValue ? null : prev);
    },
    []
  );
  const handleKanbanColumnDrop = (0, import_react12.useCallback)(
    (targetGroupValue, e) => {
      e.preventDefault();
      e.stopPropagation();
      setKanbanDropTargetGroup(null);
      const draggedDbKey = draggingRowKey || e.dataTransfer.getData("text/plain");
      if (!draggedDbKey || activeDisplayMode.type !== "kanban") {
        setDraggingRowKey(null);
        setDropTarget(null);
        return;
      }
      const groupColumnName = activeDisplayMode.groupColumnName;
      const row = rows.find((r) => r.dbKey === draggedDbKey);
      if (row) {
        const targetValue = targetGroupValue === "\u672A\u5206\u7C7B" ? "" : targetGroupValue;
        const currentValue = String(row[groupColumnName] ?? "");
        if (currentValue !== targetValue) {
          void dispatch(updateCell({ dbKey: draggedDbKey, columnName: groupColumnName, value: targetValue }));
        }
      }
      setDraggingRowKey(null);
      setDropTarget(null);
    },
    [activeDisplayMode, dispatch, draggingRowKey, rows, setDraggingRowKey, setDropTarget]
  );
  const handleKanbanCardDragOver = (0, import_react12.useCallback)(
    (dbKey, e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      if (draggingRowKey === dbKey) {
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
      setDropTarget((prev) => {
        if (prev && prev.rowDbKey === dbKey && prev.position === position) {
          return prev;
        }
        return { rowDbKey: dbKey, position };
      });
    },
    [draggingRowKey, setDropTarget]
  );
  const handleKanbanCardDragLeave = (0, import_react12.useCallback)(
    (dbKey, e) => {
      const currentTarget = e.currentTarget;
      const relatedTarget = e.relatedTarget;
      if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
        return;
      }
      setDropTarget((prev) => prev?.rowDbKey === dbKey ? null : prev);
    },
    [setDropTarget]
  );
  const handleKanbanCardDrop = (0, import_react12.useCallback)(
    (targetRowDbKey, targetGroupValue, e) => {
      e.preventDefault();
      e.stopPropagation();
      const position = dropTarget && dropTarget.rowDbKey === targetRowDbKey ? dropTarget.position : "after";
      const draggedDbKey = draggingRowKey || e.dataTransfer.getData("text/plain");
      if (!draggedDbKey) {
        setDraggingRowKey(null);
        setDropTarget(null);
        setKanbanDropTargetGroup(null);
        return;
      }
      if (activeDisplayMode.type === "kanban") {
        const groupColumnName = activeDisplayMode.groupColumnName;
        const row = rows.find((r) => r.dbKey === draggedDbKey);
        if (row) {
          const targetValue = targetGroupValue === "\u672A\u5206\u7C7B" ? "" : targetGroupValue;
          const currentValue = String(row[groupColumnName] ?? "");
          if (currentValue !== targetValue) {
            void dispatch(updateCell({ dbKey: draggedDbKey, columnName: groupColumnName, value: targetValue }));
          }
        }
      }
      handleRowDrop(draggedDbKey, targetRowDbKey, position);
      setDraggingRowKey(null);
      setDropTarget(null);
      setKanbanDropTargetGroup(null);
    },
    [activeDisplayMode, dispatch, draggingRowKey, dropTarget, handleRowDrop, rows, setDraggingRowKey, setDropTarget]
  );
  return {
    kanbanDisplayMode,
    canUseKanbanView,
    activeViewChoice,
    activeDisplayMode,
    kanbanDetailColumns,
    kanbanGroups,
    kanbanDropTargetGroup,
    setKanbanDropTargetGroup,
    handleKanbanCardDragStart,
    handleKanbanCardDragEnd,
    handleKanbanColumnDragOver,
    handleKanbanColumnDragLeave,
    handleKanbanColumnDrop,
    handleKanbanCardDragOver,
    handleKanbanCardDragLeave,
    handleKanbanCardDrop
  };
}

// packages/render/table/TablePageHeader.tsx
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
var TablePageHeader = ({
  tableMeta,
  isRenamingTable,
  setIsRenamingTable,
  tableTitleInput,
  setTableTitleInput,
  tableTitleInputRef,
  isIconPickerOpen,
  setIsIconPickerOpen,
  newColumnName,
  setNewColumnName,
  handleAddRowTop,
  handleAddColumn,
  handleUpdateTitle,
  handleUpdateIcon
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "table-page__header", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "table-page__title", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "table-page__icon-anchor", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            type: "button",
            className: "content-icon-button table-page__icon-button",
            onClick: () => setIsIconPickerOpen(!isIconPickerOpen),
            title: "\u4FEE\u6539\u8868\u56FE\u6807",
            "aria-label": "\u4FEE\u6539\u8868\u56FE\u6807",
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ContentIcon, { icon: tableMeta?.icon, fallback: LuTable, size: 28 })
          }
        ),
        isIconPickerOpen && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          ContentIconPicker,
          {
            open: isIconPickerOpen,
            onSelect: (icon) => {
              handleUpdateIcon(icon);
              setIsIconPickerOpen(false);
            },
            onClose: () => setIsIconPickerOpen(false)
          }
        )
      ] }),
      isRenamingTable ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        InlineEditInput_default,
        {
          inputRef: tableTitleInputRef,
          className: "table-page__title-input",
          value: tableTitleInput,
          onChange: (e) => setTableTitleInput(e.target.value),
          onBlur: () => handleUpdateTitle(tableTitleInput),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              handleUpdateTitle(tableTitleInput);
            } else if (e.key === "Escape") {
              setIsRenamingTable(false);
            }
          }
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "button",
          className: "table-page__title-text",
          onClick: () => {
            setIsRenamingTable(true);
            setTableTitleInput(
              tableMeta.displayName ?? tableMeta.tableId
            );
          },
          children: tableMeta.displayName ?? tableMeta.tableId
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "table-page__toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        Button_default,
        {
          variant: "ghost",
          size: "small",
          onClick: handleAddRowTop,
          title: "\u65B0\u589E\u884C",
          "aria-label": "\u65B0\u589E\u884C",
          style: {
            padding: "0 8px",
            height: "24px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuPlus, { size: 14, "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\u65B0\u589E\u884C" })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "table-page__input-group", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "input",
          {
            type: "text",
            className: "table-page__input",
            placeholder: "\u65B0\u5217\u540D\u79F0...",
            value: newColumnName,
            onChange: (e) => setNewColumnName(e.target.value),
            onKeyDown: (e) => e.key === "Enter" && handleAddColumn()
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          Button_default,
          {
            variant: "ghost",
            size: "small",
            onClick: handleAddColumn,
            title: "\u786E\u8BA4\u6DFB\u52A0",
            "aria-label": "\u786E\u8BA4\u6DFB\u52A0",
            style: { padding: "0 8px", height: "24px", marginRight: "4px" },
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuCheck, { size: 14, "aria-hidden": "true" })
          }
        )
      ] })
    ] })
  ] });
};

// packages/render/table/TableViewControls.tsx
var import_jsx_runtime5 = __toESM(require_jsx_runtime(), 1);
var TableViewControls = ({
  statusFilterColumn,
  selectedStatusFilter,
  setSelectedStatusFilter,
  statusSelectOptions,
  ownerFilterColumn,
  selectedOwnerFilter,
  setSelectedOwnerFilter,
  ownerSelectOptions,
  activeViewChoice,
  setSelectedViewChoice,
  canUseKanbanView,
  filteredCount,
  totalCount
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "table-page__view-controls", "aria-label": "\u8868\u683C\u7B5B\u9009\u4E0E\u89C6\u56FE", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "table-page__filters", children: [
      statusFilterColumn && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { className: "table-page__filter", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: "\u72B6\u6001" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
          Select,
          {
            selectedKey: selectedStatusFilter,
            onSelectionChange: (key) => setSelectedStatusFilter(String(key ?? "")),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SelectItem, { id: "", textValue: "\u5168\u90E8\u72B6\u6001", children: "\u5168\u90E8\u72B6\u6001" }),
              statusSelectOptions.map((option) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SelectItem, { id: option, textValue: option, children: option }, option))
            ]
          }
        )
      ] }),
      ownerFilterColumn && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { className: "table-page__filter", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: "\u8D1F\u8D23\u4EBA" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
          Select,
          {
            selectedKey: selectedOwnerFilter,
            onSelectionChange: (key) => setSelectedOwnerFilter(String(key ?? "")),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SelectItem, { id: "", textValue: "\u5168\u90E8\u8D1F\u8D23\u4EBA", children: "\u5168\u90E8\u8D1F\u8D23\u4EBA" }),
              ownerSelectOptions.map((option) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SelectItem, { id: option, textValue: option, children: option }, option))
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "table-page__filter-summary", "aria-live": "polite", children: [
      "\u663E\u793A ",
      filteredCount,
      " / ",
      totalCount,
      " \u884C"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "table-page__view-switch", role: "group", "aria-label": "\u89C6\u56FE\u5207\u6362", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
        "button",
        {
          type: "button",
          className: "table-page__view-switch-btn" + (activeViewChoice === "grid" ? " table-page__view-switch-btn--active" : ""),
          onClick: () => setSelectedViewChoice("grid"),
          "aria-pressed": activeViewChoice === "grid",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuTable, { size: 15, "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: "\u8868\u683C" })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
        "button",
        {
          type: "button",
          className: "table-page__view-switch-btn" + (activeViewChoice === "kanban" ? " table-page__view-switch-btn--active" : ""),
          onClick: () => setSelectedViewChoice("kanban"),
          disabled: !canUseKanbanView,
          "aria-pressed": activeViewChoice === "kanban",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuLayoutDashboard, { size: 15, "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: "\u770B\u677F" })
          ]
        }
      )
    ] })
  ] });
};

// packages/render/table/kanbanHelpers.tsx
var import_jsx_runtime6 = __toESM(require_jsx_runtime(), 1);
var getKanbanStatusHeaderInfo = (groupValue) => {
  const val = String(groupValue ?? "").trim().toLowerCase();
  if (val.includes("\u5F85\u5904\u7406") || val.includes("\u5F85\u529E") || val.includes("todo") || val.includes("to call")) {
    return { icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuListTodo, { size: 14 }), color: "#d97706" };
  }
  if (val.includes("\u8FDB\u884C\u4E2D") || val.includes("in progress") || val.includes("called")) {
    return { icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuPlay, { size: 13 }), color: "#2563eb" };
  }
  if (val.includes("\u963B\u585E") || val.includes("blocked") || val.includes("error")) {
    return { icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuOctagonAlert, { size: 14 }), color: "#dc2626" };
  }
  if (val.includes("\u7B49\u5F85") || val.includes("waiting") || val.includes("booked")) {
    return { icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuClock, { size: 14 }), color: "#7c3aed" };
  }
  if (val.includes("\u5DF2\u5B8C\u6210") || val.includes("done") || val.includes("completed") || val.includes("signed")) {
    return { icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuCheck, { size: 14 }), color: "#059669" };
  }
  return { icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuFolderOpen, { size: 14 }), color: "#64748b" };
};
var getKanbanFieldIcon = (columnName) => {
  const name = String(columnName ?? "").toLowerCase();
  if (name.includes("\u8D1F\u8D23\u4EBA") || name.includes("owner") || name.includes("assignee") || name.includes("user") || name.includes("agent")) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuUser, { size: 13, style: { color: "#64748b", flexShrink: 0 } });
  }
  if (name.includes("\u4F18\u5148\u7EA7") || name.includes("priority")) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuFlag, { size: 13, style: { color: "#d97706", flexShrink: 0 } });
  }
  if (name.includes("\u65F6\u95F4") || name.includes("\u65E5\u671F") || name.includes("date") || name.includes("time")) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuCalendar, { size: 13, style: { color: "#7c3aed", flexShrink: 0 } });
  }
  if (name.includes("\u6807\u7B7E") || name.includes("tag") || name.includes("category")) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuTag, { size: 13, style: { color: "#0891b2", flexShrink: 0 } });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuFileText, { size: 13, style: { color: "#94a3b8", flexShrink: 0 } });
};
var formatKanbanRelativeAge = (row) => {
  const rawTs = row?.updatedAt ?? row?.createdAt ?? row?._updatedAt;
  if (!rawTs) return "";
  const date = new Date(rawTs);
  if (isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "";
  const diffMins = Math.floor(diffMs / (1e3 * 60));
  if (diffMins < 60) return `${Math.max(1, diffMins)}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

// packages/render/table/KanbanBoard.tsx
var import_jsx_runtime7 = __toESM(require_jsx_runtime(), 1);
var KanbanBoard = ({
  tableId,
  kanbanGroups,
  kanbanDetailColumns,
  kanbanDropTargetGroup,
  draggingRowKey,
  dropTarget,
  handleKanbanColumnDragOver,
  handleKanbanColumnDragLeave,
  handleKanbanColumnDrop,
  handleKanbanCardDragStart,
  handleKanbanCardDragEnd,
  handleKanbanCardDragOver,
  handleKanbanCardDragLeave,
  handleKanbanCardDrop,
  handleDeleteRow,
  handleStartEdit,
  handleOpenLongText,
  currentSpaceId,
  TableActivityBadge: TableActivityBadge2,
  primaryColumn
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "table-page__kanban-board", children: kanbanGroups.map((group) => {
    const isGroupDropTarget = kanbanDropTargetGroup === group.groupValue;
    const headerInfo = getKanbanStatusHeaderInfo(group.groupValue);
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      "div",
      {
        className: "table-page__kanban-column" + (isGroupDropTarget ? " table-page__kanban-column--drop-target" : ""),
        onDragOver: (e) => handleKanbanColumnDragOver(group.groupValue, e),
        onDragLeave: (e) => handleKanbanColumnDragLeave(group.groupValue, e),
        onDrop: (e) => handleKanbanColumnDrop(group.groupValue, e),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "table-page__kanban-column-header", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "table-page__kanban-column-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
              "span",
              {
                className: "table-page__kanban-status-badge",
                style: {
                  color: headerInfo.color
                },
                children: [
                  headerInfo.icon,
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: group.groupValue })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "table-page__kanban-count-pill", children: group.rows.length })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "table-page__kanban-cards", children: group.rows.map((row) => {
            const isCardDragging = draggingRowKey === row.dbKey;
            const isDropTarget = dropTarget && dropTarget.rowDbKey === row.dbKey;
            const dropPos = isDropTarget ? dropTarget.position : null;
            const titleVal = String(
              primaryColumn ? row[primaryColumn.name] ?? "" : row.dbKey
            );
            return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
              "div",
              {
                className: "table-page__kanban-card" + (isCardDragging ? " table-page__kanban-card--dragging" : "") + (dropPos === "before" ? " table-page__kanban-card--drop-before" : "") + (dropPos === "after" ? " table-page__kanban-card--drop-after" : ""),
                draggable: true,
                onDragStart: (e) => handleKanbanCardDragStart(row.dbKey, e),
                onDragEnd: handleKanbanCardDragEnd,
                onDragOver: (e) => handleKanbanCardDragOver(row.dbKey, e),
                onDragLeave: (e) => handleKanbanCardDragLeave(row.dbKey, e),
                onDrop: (e) => handleKanbanCardDrop(row.dbKey, group.groupValue, e),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "table-page__kanban-card-top", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "table-page__kanban-card-title-row", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "table-page__kanban-drag-handle", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuGripVertical, { size: 14, "aria-hidden": "true" }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "table-page__kanban-card-title",
                        onClick: () => primaryColumn && handleStartEdit(row.dbKey, primaryColumn.name, titleVal),
                        children: titleVal.trim() || "\u672A\u547D\u540D\u8BB0\u5F55"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                      Button_default,
                      {
                        variant: "ghost",
                        size: "small",
                        className: "table-page__kanban-delete-btn",
                        onClick: () => handleDeleteRow(row.dbKey),
                        title: "\u5220\u9664\u5361\u7247",
                        "aria-label": "\u5220\u9664\u5361\u7247",
                        children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuTrash2, { size: 13, "aria-hidden": "true" })
                      }
                    )
                  ] }) }),
                  kanbanDetailColumns.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "table-page__kanban-card-fields", children: kanbanDetailColumns.map((column) => {
                    const rawVal = row[column.name];
                    const valStr = rawVal === null || rawVal === void 0 ? "" : String(rawVal);
                    if (!valStr.trim()) return null;
                    const fieldIcon = getKanbanFieldIcon(column.name || column.label);
                    const canRenderMarkdownTable = shouldRenderKanbanMarkdownTable(
                      tableId,
                      valStr
                    );
                    return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "table-page__kanban-field-item", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "table-page__kanban-field-icon", title: column.label || column.name, children: fieldIcon }),
                      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "table-page__kanban-field-content", children: column.type === "select" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                        "span",
                        {
                          className: "table-select-badge",
                          "data-color-index": selectBadgeColorIndex(valStr),
                          children: valStr
                        }
                      ) : canRenderMarkdownTable ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                        "div",
                        {
                          className: "table-page__kanban-markdown",
                          onClick: () => handleOpenLongText({
                            dbKey: row.dbKey,
                            columnName: column.name,
                            columnLabel: column.label || column.name,
                            value: valStr
                          }),
                          children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ReadOnlyMarkdownContent_default, { markdown: valStr })
                        }
                      ) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                        "span",
                        {
                          className: "table-page__kanban-field-value",
                          onClick: () => handleStartEdit(row.dbKey, column.name, valStr),
                          children: valStr
                        }
                      ) })
                    ] }, column.id ?? column.name);
                  }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "table-page__kanban-card-footer", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "table-page__kanban-age", children: formatKanbanRelativeAge(
                      row.updatedAt ?? row.createdAt
                    ) }),
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TableActivityBadge2, { row, spaceId: currentSpaceId })
                  ] })
                ]
              },
              row.dbKey
            );
          }) })
        ]
      },
      group.groupValue
    );
  }) });
};

// packages/render/table/TableGridSection.tsx
var import_react14 = __toESM(require_react(), 1);

// node_modules/@tanstack/react-virtual/dist/esm/index.js
var React6 = __toESM(require_react(), 1);
var import_react_dom = __toESM(require_react_dom(), 1);

// node_modules/@tanstack/virtual-core/dist/esm/lazy-measurements.js
function createLazyMeasurementsView(count, flat, getItemKey) {
  const cache = new Array(count);
  return new Proxy(cache, {
    get(target, prop, receiver) {
      if (typeof prop === "string") {
        const c = prop.charCodeAt(0);
        if (c >= 48 && c <= 57) {
          const i = +prop;
          if (Number.isInteger(i) && i >= 0 && i < count) {
            let v = target[i];
            if (!v) {
              const s = flat[i * 2];
              v = target[i] = {
                index: i,
                key: getItemKey(i),
                start: s,
                size: flat[i * 2 + 1],
                end: s + flat[i * 2 + 1],
                lane: 0
              };
            }
            return v;
          }
        }
        if (prop === "length") return count;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

// node_modules/@tanstack/virtual-core/dist/esm/utils.js
function memo2(getDeps, fn, opts) {
  let deps = opts.initialDeps ?? [];
  let result;
  let isInitial = true;
  function memoizedFunction() {
    var _a;
    const debugEnabled = !!opts.key && !!((_a = opts.debug) == null ? void 0 : _a.call(opts));
    let depTime = 0;
    if (debugEnabled) depTime = Date.now();
    const newDeps = getDeps();
    const depsChanged = newDeps.length !== deps.length || newDeps.some((dep, index) => deps[index] !== dep);
    if (!depsChanged) {
      return result;
    }
    deps = newDeps;
    let resultTime = 0;
    if (debugEnabled) resultTime = Date.now();
    result = fn(...newDeps);
    if (debugEnabled) {
      const depEndTime = Math.round((Date.now() - depTime) * 100) / 100;
      const resultEndTime = Math.round((Date.now() - resultTime) * 100) / 100;
      const resultFpsPercentage = resultEndTime / 16;
      const pad2 = (str, num) => {
        str = String(str);
        while (str.length < num) {
          str = " " + str;
        }
        return str;
      };
      console.info(
        `%c\u23F1 ${pad2(resultEndTime, 5)} /${pad2(depEndTime, 5)} ms`,
        `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(
          0,
          Math.min(120 - 120 * resultFpsPercentage, 120)
        )}deg 100% 31%);`,
        opts == null ? void 0 : opts.key
      );
    }
    if ((opts == null ? void 0 : opts.onChange) && !(isInitial && opts.skipInitialOnChange)) {
      opts.onChange(result);
    }
    isInitial = false;
    return result;
  }
  memoizedFunction.updateDeps = (newDeps) => {
    deps = newDeps;
  };
  return memoizedFunction;
}
function notUndefined(value, msg) {
  if (value === void 0) {
    throw new Error(`Unexpected undefined${msg ? `: ${msg}` : ""}`);
  } else {
    return value;
  }
}
var approxEqual = (a, b) => Math.abs(a - b) < 1.01;
var debounce = (targetWindow, fn, ms) => {
  let timeoutId;
  return function(...args) {
    targetWindow.clearTimeout(timeoutId);
    timeoutId = targetWindow.setTimeout(() => fn.apply(this, args), ms);
  };
};

// node_modules/@tanstack/virtual-core/dist/esm/index.js
var _isIOSResult;
var isIOSWebKit = () => {
  if (_isIOSResult !== void 0) return _isIOSResult;
  if (typeof navigator === "undefined") return _isIOSResult = false;
  if (/iP(hone|od|ad)/.test(navigator.userAgent)) return _isIOSResult = true;
  const mtp = navigator.maxTouchPoints;
  return _isIOSResult = navigator.platform === "MacIntel" && mtp !== void 0 && mtp > 0;
};
var getRect = (element) => {
  const { offsetWidth, offsetHeight } = element;
  return { width: offsetWidth, height: offsetHeight };
};
var defaultKeyExtractor = (index) => index;
var defaultRangeExtractor = (range) => {
  const start = Math.max(range.startIndex - range.overscan, 0);
  const end = Math.min(range.endIndex + range.overscan, range.count - 1);
  const len = end - start + 1;
  const arr = new Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = start + i;
  }
  return arr;
};
var observeElementRect = (instance, cb) => {
  const element = instance.scrollElement;
  if (!element) {
    return;
  }
  const targetWindow = instance.targetWindow;
  if (!targetWindow) {
    return;
  }
  const handler = (rect) => {
    const { width, height } = rect;
    cb({ width: Math.round(width), height: Math.round(height) });
  };
  handler(getRect(element));
  if (!targetWindow.ResizeObserver) {
    return () => {
    };
  }
  const observer = new targetWindow.ResizeObserver((entries) => {
    const run = () => {
      const entry = entries[0];
      if (entry == null ? void 0 : entry.borderBoxSize) {
        const box = entry.borderBoxSize[0];
        if (box) {
          handler({ width: box.inlineSize, height: box.blockSize });
          return;
        }
      }
      handler(getRect(element));
    };
    instance.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(run) : run();
  });
  observer.observe(element, { box: "border-box" });
  return () => {
    observer.unobserve(element);
  };
};
var addEventListenerOptions = {
  passive: true
};
var supportsScrollend = typeof window == "undefined" ? true : "onscrollend" in window;
var observeOffset = (instance, cb, readOffset) => {
  const element = instance.scrollElement;
  if (!element) {
    return;
  }
  const targetWindow = instance.targetWindow;
  if (!targetWindow) {
    return;
  }
  const registerScrollendEvent = instance.options.useScrollendEvent && supportsScrollend;
  let offset = 0;
  const fallback = registerScrollendEvent ? null : debounce(
    targetWindow,
    () => cb(offset, false),
    instance.options.isScrollingResetDelay
  );
  const createHandler = (isScrolling) => () => {
    offset = readOffset(element);
    fallback == null ? void 0 : fallback();
    cb(offset, isScrolling);
  };
  const handler = createHandler(true);
  const endHandler = createHandler(false);
  element.addEventListener("scroll", handler, addEventListenerOptions);
  if (registerScrollendEvent) {
    element.addEventListener("scrollend", endHandler, addEventListenerOptions);
  }
  return () => {
    element.removeEventListener("scroll", handler);
    if (registerScrollendEvent) {
      element.removeEventListener("scrollend", endHandler);
    }
  };
};
var observeElementOffset = (instance, cb) => observeOffset(instance, cb, (el) => {
  const { horizontal, isRtl } = instance.options;
  return horizontal ? el.scrollLeft * (isRtl && -1 || 1) : el.scrollTop;
});
var measureElement = (element, entry, instance) => {
  if (instance.options.useCachedMeasurements) {
    const index = instance.indexFromElement(element);
    const key = instance.options.getItemKey(index);
    return instance.itemSizeCache.get(key) ?? instance.options.estimateSize(index);
  }
  if (entry == null ? void 0 : entry.borderBoxSize) {
    const box = entry.borderBoxSize[0];
    if (box) {
      const size = Math.round(
        box[instance.options.horizontal ? "inlineSize" : "blockSize"]
      );
      return size;
    }
  }
  if (!entry) {
    const index = instance.indexFromElement(element);
    const key = instance.options.getItemKey(index);
    const cachedSize = instance.itemSizeCache.get(key);
    if (cachedSize !== void 0) {
      return cachedSize;
    }
  }
  return element[instance.options.horizontal ? "offsetWidth" : "offsetHeight"];
};
var scrollWithAdjustments = (offset, {
  adjustments = 0,
  behavior
}, instance) => {
  var _a, _b;
  (_b = (_a = instance.scrollElement) == null ? void 0 : _a.scrollTo) == null ? void 0 : _b.call(_a, {
    [instance.options.horizontal ? "left" : "top"]: offset + adjustments,
    behavior
  });
};
var elementScroll = scrollWithAdjustments;
var Virtualizer = class {
  constructor(opts) {
    this.unsubs = [];
    this.scrollElement = null;
    this.targetWindow = null;
    this.isScrolling = false;
    this.scrollState = null;
    this.measurementsCache = [];
    this._flatMeasurements = null;
    this.itemSizeCache = /* @__PURE__ */ new Map();
    this.itemSizeCacheVersion = 0;
    this.laneAssignments = /* @__PURE__ */ new Map();
    this.pendingMin = null;
    this.prevLanes = void 0;
    this.lanesChangedFlag = false;
    this.lanesSettling = false;
    this.pendingScrollAnchor = null;
    this.scrollRect = null;
    this.scrollOffset = null;
    this.scrollDirection = null;
    this.scrollAdjustments = 0;
    this._iosDeferredAdjustment = 0;
    this._iosTouching = false;
    this._iosJustTouchEnded = false;
    this._iosTouchEndTimerId = null;
    this._intendedScrollOffset = null;
    this.elementsCache = /* @__PURE__ */ new Map();
    this.now = () => {
      var _a, _b, _c;
      return ((_c = (_b = (_a = this.targetWindow) == null ? void 0 : _a.performance) == null ? void 0 : _b.now) == null ? void 0 : _c.call(_b)) ?? Date.now();
    };
    this.observer = /* @__PURE__ */ (() => {
      let _ro = null;
      const get = () => {
        if (_ro) {
          return _ro;
        }
        if (!this.targetWindow || !this.targetWindow.ResizeObserver) {
          return null;
        }
        return _ro = new this.targetWindow.ResizeObserver((entries) => {
          entries.forEach((entry) => {
            const run = () => {
              const node = entry.target;
              const index = this.indexFromElement(node);
              if (!node.isConnected) {
                this.observer.unobserve(node);
                for (const [cacheKey, cachedNode] of this.elementsCache) {
                  if (cachedNode === node) {
                    this.elementsCache.delete(cacheKey);
                    break;
                  }
                }
                return;
              }
              if (this.shouldMeasureDuringScroll(index)) {
                this.resizeItem(
                  index,
                  this.options.measureElement(node, entry, this)
                );
              }
            };
            this.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(run) : run();
          });
        });
      };
      return {
        disconnect: () => {
          var _a;
          (_a = get()) == null ? void 0 : _a.disconnect();
          _ro = null;
        },
        observe: (target) => {
          var _a;
          return (_a = get()) == null ? void 0 : _a.observe(target, { box: "border-box" });
        },
        unobserve: (target) => {
          var _a;
          return (_a = get()) == null ? void 0 : _a.unobserve(target);
        }
      };
    })();
    this.range = null;
    this.setOptions = (opts2) => {
      var _a, _b;
      const merged = {
        debug: false,
        initialOffset: 0,
        overscan: 1,
        paddingStart: 0,
        paddingEnd: 0,
        scrollPaddingStart: 0,
        scrollPaddingEnd: 0,
        horizontal: false,
        getItemKey: defaultKeyExtractor,
        rangeExtractor: defaultRangeExtractor,
        onChange: () => {
        },
        measureElement,
        initialRect: { width: 0, height: 0 },
        scrollMargin: 0,
        gap: 0,
        indexAttribute: "data-index",
        initialMeasurementsCache: [],
        lanes: 1,
        anchorTo: "start",
        followOnAppend: false,
        scrollEndThreshold: 1,
        isScrollingResetDelay: 150,
        enabled: true,
        isRtl: false,
        useScrollendEvent: false,
        useAnimationFrameWithResizeObserver: false,
        laneAssignmentMode: "estimate",
        useCachedMeasurements: false
      };
      for (const key in opts2) {
        const v = opts2[key];
        if (v !== void 0) merged[key] = v;
      }
      const prevOptions = this.options;
      let anchor = null;
      let followOnAppend = null;
      let edgeKeysChanged = false;
      if (prevOptions !== void 0 && prevOptions.enabled && merged.enabled && merged.anchorTo === "end" && this.scrollElement !== null) {
        const prevCount = prevOptions.count;
        const nextCount = merged.count;
        const measurements = this.getMeasurements();
        const prevFirstKey = prevCount > 0 ? ((_a = measurements[0]) == null ? void 0 : _a.key) ?? prevOptions.getItemKey(0) : null;
        const prevLastKey = prevCount > 0 ? ((_b = measurements[prevCount - 1]) == null ? void 0 : _b.key) ?? prevOptions.getItemKey(prevCount - 1) : null;
        const didCountChange = nextCount !== prevCount;
        const didEdgeKeysChange = didCountChange || prevCount > 0 && nextCount > 0 && (merged.getItemKey(0) !== prevFirstKey || merged.getItemKey(nextCount - 1) !== prevLastKey);
        if (didEdgeKeysChange) {
          edgeKeysChanged = true;
          const item = prevCount > 0 ? this.getVirtualItemForOffset(this.getScrollOffset()) ?? measurements[0] : null;
          if (item) {
            anchor = [item.key, this.getScrollOffset() - item.start];
          }
          const behavior = merged.followOnAppend === true ? "auto" : merged.followOnAppend || null;
          if (behavior && nextCount > prevCount && this.isAtEnd(prevOptions.scrollEndThreshold) && (prevCount === 0 || merged.getItemKey(nextCount - 1) !== prevLastKey)) {
            followOnAppend = behavior;
          }
        }
      }
      this.options = merged;
      if (edgeKeysChanged) {
        this.pendingMin = 0;
        this.itemSizeCacheVersion++;
      }
      let anchorResolved = false;
      let anchorDelta = 0;
      if (anchor && this.scrollOffset !== null) {
        const [anchorKey, anchorOffset] = anchor;
        const newMeasurements = this.getMeasurements();
        const { count, getItemKey } = this.options;
        let idx = 0;
        while (idx < count && getItemKey(idx) !== anchorKey) {
          idx++;
        }
        if (idx < count) {
          const anchorItem = newMeasurements[idx];
          if (anchorItem) {
            const newOffset = Math.max(0, anchorItem.start + anchorOffset);
            if (newOffset !== this.scrollOffset) {
              anchorDelta = newOffset - this.scrollOffset;
              this.scrollOffset = newOffset;
              anchorResolved = true;
            }
          }
        }
      }
      if (anchorResolved || followOnAppend) {
        this.pendingScrollAnchor = [
          anchorResolved ? anchor[0] : null,
          anchorResolved ? anchor[1] : 0,
          followOnAppend,
          anchorDelta
        ];
      }
    };
    this.notify = (sync) => {
      var _a, _b;
      (_b = (_a = this.options).onChange) == null ? void 0 : _b.call(_a, this, sync);
    };
    this.maybeNotify = memo2(
      () => {
        this.calculateRange();
        return [
          this.isScrolling,
          this.range ? this.range.startIndex : null,
          this.range ? this.range.endIndex : null
        ];
      },
      (isScrolling) => {
        this.notify(isScrolling);
      },
      {
        key: "maybeNotify",
        debug: () => this.options.debug,
        initialDeps: [
          this.isScrolling,
          this.range ? this.range.startIndex : null,
          this.range ? this.range.endIndex : null
        ]
      }
    );
    this.cleanup = () => {
      this.unsubs.filter(Boolean).forEach((d) => d());
      this.unsubs = [];
      this.observer.disconnect();
      if (this.rafId != null && this.targetWindow) {
        this.targetWindow.cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.scrollState = null;
      this._iosDeferredAdjustment = 0;
      this._iosTouching = false;
      this._iosJustTouchEnded = false;
      this.scrollElement = null;
      this.targetWindow = null;
    };
    this._didMount = () => {
      return () => {
        this.cleanup();
      };
    };
    this._willUpdate = () => {
      var _a;
      const scrollElement = this.options.enabled ? this.options.getScrollElement() : null;
      if (this.scrollElement !== scrollElement) {
        this.cleanup();
        if (!scrollElement) {
          this.maybeNotify();
          return;
        }
        this.scrollElement = scrollElement;
        if (this.scrollElement && "ownerDocument" in this.scrollElement) {
          this.targetWindow = this.scrollElement.ownerDocument.defaultView;
        } else {
          this.targetWindow = ((_a = this.scrollElement) == null ? void 0 : _a.window) ?? null;
        }
        this.elementsCache.forEach((cached) => {
          this.observer.observe(cached);
        });
        this.unsubs.push(
          this.options.observeElementRect(this, (rect) => {
            this.scrollRect = rect;
            this.maybeNotify();
          })
        );
        this.unsubs.push(
          this.options.observeElementOffset(this, (offset, isScrolling) => {
            if (isScrolling && this._intendedScrollOffset === null && offset === this.scrollOffset) {
              return;
            }
            if (this._intendedScrollOffset !== null && Math.abs(offset - this._intendedScrollOffset) < 1.5) {
              offset = this._intendedScrollOffset;
            }
            this._intendedScrollOffset = null;
            this.scrollAdjustments = 0;
            const prevOffset = this.getScrollOffset();
            this.scrollDirection = isScrolling ? prevOffset === offset ? this.scrollDirection : prevOffset < offset ? "forward" : "backward" : null;
            this.scrollOffset = offset;
            this.isScrolling = isScrolling;
            this._flushIosDeferredIfReady();
            if (this.scrollState) {
              this.scheduleScrollReconcile();
            }
            this.maybeNotify();
          })
        );
        if ("addEventListener" in this.scrollElement) {
          const scrollEl = this.scrollElement;
          const onTouchStart = () => {
            this._iosTouching = true;
            this._iosJustTouchEnded = false;
            if (this._iosTouchEndTimerId !== null && this.targetWindow != null) {
              this.targetWindow.clearTimeout(this._iosTouchEndTimerId);
              this._iosTouchEndTimerId = null;
            }
          };
          const onTouchEnd = () => {
            this._iosTouching = false;
            if (!isIOSWebKit() || this.targetWindow == null) {
              return;
            }
            this._iosJustTouchEnded = true;
            this._iosTouchEndTimerId = this.targetWindow.setTimeout(() => {
              this._iosJustTouchEnded = false;
              this._iosTouchEndTimerId = null;
              this._flushIosDeferredIfReady();
            }, 150);
          };
          scrollEl.addEventListener(
            "touchstart",
            onTouchStart,
            addEventListenerOptions
          );
          scrollEl.addEventListener(
            "touchend",
            onTouchEnd,
            addEventListenerOptions
          );
          this.unsubs.push(() => {
            scrollEl.removeEventListener("touchstart", onTouchStart);
            scrollEl.removeEventListener("touchend", onTouchEnd);
            if (this._iosTouchEndTimerId !== null && this.targetWindow != null) {
              this.targetWindow.clearTimeout(this._iosTouchEndTimerId);
              this._iosTouchEndTimerId = null;
            }
          });
        }
        this._scrollToOffset(this.getScrollOffset(), {
          adjustments: void 0,
          behavior: void 0
        });
      }
      const anchor = this.pendingScrollAnchor;
      this.pendingScrollAnchor = null;
      if (anchor && this.scrollElement && this.options.enabled) {
        const [key, _offset, followOnAppend, anchorDelta] = anchor;
        if (key !== null && !followOnAppend) {
          if (isIOSWebKit() && (this.isScrolling || this._iosTouching || this._iosJustTouchEnded)) {
            if (anchorDelta !== 0) {
              this._iosDeferredAdjustment += anchorDelta;
            }
          } else {
            this._scrollToOffset(this.getScrollOffset(), {
              adjustments: void 0,
              behavior: void 0
            });
          }
        }
        if (followOnAppend) {
          this.scrollToEnd({ behavior: followOnAppend });
        }
      }
    };
    this._flushIosDeferredIfReady = () => {
      if (this._iosDeferredAdjustment === 0) return;
      if (this.isScrolling) return;
      if (this._iosTouching) return;
      if (this._iosJustTouchEnded) return;
      const cur = this.getScrollOffset();
      const max = this.getMaxScrollOffset();
      if (cur < 0 || cur > max) return;
      if (this._iosDeferredAdjustment < 0 && cur >= max - 1) {
        this._iosDeferredAdjustment = 0;
        return;
      }
      const delta = this._iosDeferredAdjustment;
      this._iosDeferredAdjustment = 0;
      this._scrollToOffset(cur, {
        adjustments: this.scrollAdjustments += delta,
        behavior: void 0
      });
    };
    this.rafId = null;
    this.getSize = () => {
      if (!this.options.enabled) {
        this.scrollRect = null;
        return 0;
      }
      this.scrollRect = this.scrollRect ?? this.options.initialRect;
      return this.scrollRect[this.options.horizontal ? "width" : "height"];
    };
    this.getScrollOffset = () => {
      if (!this.options.enabled) {
        this.scrollOffset = null;
        return 0;
      }
      this.scrollOffset = this.scrollOffset ?? (typeof this.options.initialOffset === "function" ? this.options.initialOffset() : this.options.initialOffset);
      return this.scrollOffset;
    };
    this.getMeasurementOptions = memo2(
      () => [
        this.options.count,
        this.options.paddingStart,
        this.options.scrollMargin,
        this.options.getItemKey,
        this.options.enabled,
        this.options.lanes,
        this.options.laneAssignmentMode,
        this.options.gap
      ],
      (count, paddingStart, scrollMargin, getItemKey, enabled, lanes, laneAssignmentMode, gap) => {
        const lanesChanged = this.prevLanes !== void 0 && this.prevLanes !== lanes;
        if (lanesChanged) {
          this.lanesChangedFlag = true;
        }
        this.prevLanes = lanes;
        this.pendingMin = null;
        return {
          count,
          paddingStart,
          scrollMargin,
          getItemKey,
          enabled,
          lanes,
          laneAssignmentMode,
          gap
        };
      },
      {
        key: false
      }
    );
    this.getMeasurements = memo2(
      () => [this.getMeasurementOptions(), this.itemSizeCacheVersion],
      ({
        count,
        paddingStart,
        scrollMargin,
        getItemKey,
        enabled,
        lanes,
        laneAssignmentMode,
        gap
      }, _itemSizeCacheVersion) => {
        const itemSizeCache = this.itemSizeCache;
        if (!enabled) {
          this.measurementsCache = [];
          this.itemSizeCache.clear();
          this.laneAssignments.clear();
          return [];
        }
        if (this.laneAssignments.size > count) {
          for (const index of this.laneAssignments.keys()) {
            if (index >= count) {
              this.laneAssignments.delete(index);
            }
          }
        }
        if (this.lanesChangedFlag) {
          this.lanesChangedFlag = false;
          this.lanesSettling = true;
          this.measurementsCache = [];
          this.itemSizeCache.clear();
          this.laneAssignments.clear();
          this.pendingMin = null;
        }
        if (this.measurementsCache.length === 0 && !this.lanesSettling) {
          this.measurementsCache = this.options.initialMeasurementsCache;
          this.measurementsCache.forEach((item) => {
            this.itemSizeCache.set(item.key, item.size);
          });
        }
        const min = this.lanesSettling ? 0 : this.pendingMin ?? 0;
        this.pendingMin = null;
        if (this.lanesSettling && this.measurementsCache.length === count) {
          this.lanesSettling = false;
        }
        if (lanes === 1) {
          const need = count * 2;
          let flat = this._flatMeasurements;
          if (!flat || flat.length < need) {
            const next = new Float64Array(need);
            if (flat && min > 0) next.set(flat.subarray(0, min * 2));
            flat = next;
            this._flatMeasurements = flat;
          }
          let runningStart;
          if (min === 0) {
            runningStart = paddingStart + scrollMargin;
          } else {
            const prevIdx = min - 1;
            runningStart = flat[prevIdx * 2] + flat[prevIdx * 2 + 1] + gap;
          }
          for (let i = min; i < count; i++) {
            const key = getItemKey(i);
            const measuredSize = itemSizeCache.get(key);
            const size = typeof measuredSize === "number" ? measuredSize : this.options.estimateSize(i);
            flat[i * 2] = runningStart;
            flat[i * 2 + 1] = size;
            runningStart += size + gap;
          }
          const view = createLazyMeasurementsView(count, flat, getItemKey);
          this.measurementsCache = view;
          return view;
        }
        const measurements = this.measurementsCache.slice(0, min);
        const laneLastIndex = new Array(lanes).fill(
          void 0
        );
        const laneEnds = new Float64Array(lanes);
        let filledLanes = 0;
        for (let m = 0; m < min; m++) {
          const item = measurements[m];
          if (item) {
            if (laneLastIndex[item.lane] === void 0) filledLanes++;
            laneLastIndex[item.lane] = m;
            laneEnds[item.lane] = item.end;
          }
        }
        for (let i = min; i < count; i++) {
          const key = getItemKey(i);
          const cachedLane = this.laneAssignments.get(i);
          let lane;
          let start;
          const shouldCacheLane = laneAssignmentMode === "estimate" || itemSizeCache.has(key);
          if (cachedLane !== void 0 && this.options.lanes > 1) {
            lane = cachedLane;
            const prevIndex = laneLastIndex[lane];
            const prevInLane = prevIndex !== void 0 ? measurements[prevIndex] : void 0;
            start = prevInLane ? prevInLane.end + gap : paddingStart + scrollMargin;
          } else if (filledLanes === lanes) {
            let bestLane = 0;
            let bestEnd = laneEnds[0];
            let bestIdx = laneLastIndex[0];
            for (let l = 1; l < lanes; l++) {
              const e = laneEnds[l];
              if (e < bestEnd || e === bestEnd && laneLastIndex[l] < bestIdx) {
                bestLane = l;
                bestEnd = e;
                bestIdx = laneLastIndex[l];
              }
            }
            lane = bestLane;
            start = bestEnd + gap;
            if (shouldCacheLane) {
              this.laneAssignments.set(i, lane);
            }
          } else {
            lane = i % this.options.lanes;
            start = paddingStart + scrollMargin;
            if (shouldCacheLane) {
              this.laneAssignments.set(i, lane);
            }
          }
          const measuredSize = itemSizeCache.get(key);
          const size = typeof measuredSize === "number" ? measuredSize : this.options.estimateSize(i);
          const end = start + size;
          measurements[i] = {
            index: i,
            start,
            size,
            end,
            key,
            lane
          };
          if (laneLastIndex[lane] === void 0) filledLanes++;
          laneLastIndex[lane] = i;
          laneEnds[lane] = end;
        }
        this.measurementsCache = measurements;
        return measurements;
      },
      {
        key: "getMeasurements",
        debug: () => this.options.debug
      }
    );
    this.calculateRange = memo2(
      () => [
        this.getMeasurements(),
        this.getSize(),
        this.getScrollOffset(),
        this.options.lanes
      ],
      (measurements, outerSize, scrollOffset, lanes) => {
        if (measurements.length === 0 || outerSize === 0) {
          this.range = null;
          return null;
        }
        this.range = calculateRangeImpl(
          measurements,
          outerSize,
          scrollOffset,
          lanes,
          // Pass the typed array so binary search + forward-walk can read
          // start/end directly from Float64Array, skipping the Proxy traps.
          lanes === 1 && this._flatMeasurements != null ? this._flatMeasurements : null
        );
        return this.range;
      },
      {
        key: "calculateRange",
        debug: () => this.options.debug
      }
    );
    this.getVirtualIndexes = memo2(
      () => {
        let startIndex = null;
        let endIndex = null;
        const range = this.calculateRange();
        if (range) {
          startIndex = range.startIndex;
          endIndex = range.endIndex;
        }
        this.maybeNotify.updateDeps([this.isScrolling, startIndex, endIndex]);
        return [
          this.options.rangeExtractor,
          this.options.overscan,
          this.options.count,
          startIndex,
          endIndex
        ];
      },
      (rangeExtractor, overscan, count, startIndex, endIndex) => {
        return startIndex === null || endIndex === null ? [] : rangeExtractor({
          startIndex,
          endIndex,
          overscan,
          count
        });
      },
      {
        key: "getVirtualIndexes",
        debug: () => this.options.debug
      }
    );
    this.indexFromElement = (node) => {
      const attributeName = this.options.indexAttribute;
      const indexStr = node.getAttribute(attributeName);
      if (!indexStr) {
        console.warn(
          `Missing attribute name '${attributeName}={index}' on measured element.`
        );
        return -1;
      }
      return parseInt(indexStr, 10);
    };
    this.shouldMeasureDuringScroll = (index) => {
      var _a;
      if (!this.scrollState || this.scrollState.behavior !== "smooth") {
        return true;
      }
      const scrollIndex = this.scrollState.index ?? ((_a = this.getVirtualItemForOffset(this.scrollState.lastTargetOffset)) == null ? void 0 : _a.index);
      if (scrollIndex !== void 0 && this.range) {
        const bufferSize = Math.max(
          this.options.overscan,
          Math.ceil((this.range.endIndex - this.range.startIndex) / 2)
        );
        const minIndex = Math.max(0, scrollIndex - bufferSize);
        const maxIndex = Math.min(
          this.options.count - 1,
          scrollIndex + bufferSize
        );
        return index >= minIndex && index <= maxIndex;
      }
      return true;
    };
    this.measureElement = (node) => {
      if (!node) {
        this.elementsCache.forEach((cached, key2) => {
          if (!cached.isConnected) {
            this.observer.unobserve(cached);
            this.elementsCache.delete(key2);
          }
        });
        return;
      }
      const index = this.indexFromElement(node);
      const key = this.options.getItemKey(index);
      const prevNode = this.elementsCache.get(key);
      if (prevNode !== node) {
        if (prevNode) {
          this.observer.unobserve(prevNode);
        }
        this.observer.observe(node);
        this.elementsCache.set(key, node);
      }
      if ((!this.isScrolling || this.scrollState) && this.shouldMeasureDuringScroll(index)) {
        this.resizeItem(index, this.options.measureElement(node, void 0, this));
      }
    };
    this.resizeItem = (index, size) => {
      var _a, _b;
      if (index < 0 || index >= this.options.count) return;
      let cachedSize;
      let itemStart;
      let key;
      const flat = this._flatMeasurements;
      if (this.options.lanes === 1 && flat !== null) {
        key = this.options.getItemKey(index);
        itemStart = flat[index * 2];
        cachedSize = flat[index * 2 + 1];
      } else {
        const item = this.measurementsCache[index];
        if (!item) return;
        key = item.key;
        itemStart = item.start;
        cachedSize = item.size;
      }
      const itemSize = this.itemSizeCache.get(key) ?? cachedSize;
      const delta = size - itemSize;
      if (delta !== 0) {
        const wasAtEnd = this.options.anchorTo === "end" && ((_a = this.scrollState) == null ? void 0 : _a.behavior) !== "smooth" && this.getVirtualDistanceFromEnd() <= this.options.scrollEndThreshold;
        const prevTotalSize = wasAtEnd ? this.getTotalSize() : 0;
        const scrollOffsetWithAdj = this.getScrollOffset() + this.scrollAdjustments;
        const isFirstMeasure = !this.itemSizeCache.has(key);
        const defaultShouldAdjust = isFirstMeasure ? (
          // First measurement: compensate any item whose top sits above the
          // fold — the estimate→actual delta must be corrected regardless of
          // scroll direction, since the whole estimated block was above it.
          itemStart < scrollOffsetWithAdj
        ) : (
          // Re-measurement: only compensate an item that is ENTIRELY above the
          // fold. An item that merely *spans* the fold (top above, bottom
          // below — e.g. a streaming chat message growing at its bottom)
          // changes size *below* the anchor point, so shifting scrollTop by the
          // delta would drag the viewport downward on every growth (#1218).
          // Also skip during backward scroll to avoid the "items jump while
          // scrolling up" cascade.
          itemStart + itemSize <= scrollOffsetWithAdj && this.scrollDirection !== "backward"
        );
        const shouldAdjustScroll = ((_b = this.scrollState) == null ? void 0 : _b.behavior) !== "smooth" && (this.shouldAdjustScrollPositionOnItemSizeChange !== void 0 ? this.shouldAdjustScrollPositionOnItemSizeChange(
          // The callback expects a VirtualItem; build one lazily only
          // when the consumer actually supplied a custom predicate.
          this.measurementsCache[index] ?? {
            index,
            key,
            start: itemStart,
            size: cachedSize,
            end: itemStart + cachedSize,
            lane: 0
          },
          delta,
          this
        ) : defaultShouldAdjust);
        if (this.pendingMin === null || index < this.pendingMin) {
          this.pendingMin = index;
        }
        this.itemSizeCache.set(key, size);
        this.itemSizeCacheVersion++;
        let adjustedSync = false;
        if (wasAtEnd) {
          adjustedSync = this.applyScrollAdjustment(
            this.getTotalSize() - prevTotalSize
          );
        } else if (shouldAdjustScroll) {
          adjustedSync = this.applyScrollAdjustment(delta);
        }
        this.notify(adjustedSync);
      }
    };
    this.getVirtualItems = memo2(
      () => [this.getVirtualIndexes(), this.getMeasurements()],
      (indexes, measurements) => {
        const virtualItems = [];
        for (let k = 0, len = indexes.length; k < len; k++) {
          const i = indexes[k];
          const measurement = measurements[i];
          virtualItems.push(measurement);
        }
        return virtualItems;
      },
      {
        key: "getVirtualItems",
        debug: () => this.options.debug
      }
    );
    this.getVirtualItemForOffset = (offset) => {
      const measurements = this.getMeasurements();
      if (measurements.length === 0) {
        return void 0;
      }
      const flat = this._flatMeasurements;
      const useFlat = this.options.lanes === 1 && flat != null;
      const idx = findNearestBinarySearch(
        0,
        measurements.length - 1,
        useFlat ? (i) => flat[i * 2] : (i) => notUndefined(measurements[i]).start,
        offset
      );
      return notUndefined(measurements[idx]);
    };
    this.getMaxScrollOffset = () => {
      if (!this.scrollElement) return 0;
      if ("scrollHeight" in this.scrollElement) {
        return this.options.horizontal ? this.scrollElement.scrollWidth - this.scrollElement.clientWidth : this.scrollElement.scrollHeight - this.scrollElement.clientHeight;
      } else {
        const doc = this.scrollElement.document.documentElement;
        return this.options.horizontal ? doc.scrollWidth - this.scrollElement.innerWidth : doc.scrollHeight - this.scrollElement.innerHeight;
      }
    };
    this.getVirtualDistanceFromEnd = () => {
      return Math.max(
        this.getTotalSize() - this.getSize() - this.getScrollOffset(),
        0
      );
    };
    this.getDistanceFromEnd = () => {
      return Math.max(this.getMaxScrollOffset() - this.getScrollOffset(), 0);
    };
    this.isAtEnd = (threshold = this.options.scrollEndThreshold) => {
      return this.getDistanceFromEnd() <= threshold;
    };
    this.getOffsetForAlignment = (toOffset, align, itemSize = 0) => {
      if (!this.scrollElement) return 0;
      const size = this.getSize();
      const scrollOffset = this.getScrollOffset();
      if (align === "auto") {
        align = toOffset >= scrollOffset + size ? "end" : "start";
      }
      if (align === "center") {
        toOffset += (itemSize - size) / 2;
      } else if (align === "end") {
        toOffset -= size;
      }
      const maxOffset = this.getMaxScrollOffset();
      return Math.max(Math.min(maxOffset, toOffset), 0);
    };
    this.getOffsetForIndex = (index, align = "auto") => {
      index = Math.max(0, Math.min(index, this.options.count - 1));
      const size = this.getSize();
      const scrollOffset = this.getScrollOffset();
      const item = this.measurementsCache[index];
      if (!item) return;
      if (align === "auto") {
        if (item.end >= scrollOffset + size - this.options.scrollPaddingEnd) {
          align = "end";
        } else if (item.start <= scrollOffset + this.options.scrollPaddingStart) {
          align = "start";
        } else {
          return [scrollOffset, align];
        }
      }
      if (align === "end" && index === this.options.count - 1) {
        return [this.getMaxScrollOffset(), align];
      }
      const toOffset = align === "end" ? item.end + this.options.scrollPaddingEnd : item.start - this.options.scrollPaddingStart;
      return [
        this.getOffsetForAlignment(toOffset, align, item.size),
        align
      ];
    };
    this.scrollToOffset = (toOffset, { align = "start", behavior = "auto" } = {}) => {
      this._iosDeferredAdjustment = 0;
      const offset = this.getOffsetForAlignment(toOffset, align);
      const now = this.now();
      this.scrollState = {
        index: null,
        align,
        behavior,
        startedAt: now,
        lastTargetOffset: offset,
        stableFrames: 0
      };
      this._scrollToOffset(offset, { adjustments: void 0, behavior });
      this.scheduleScrollReconcile();
    };
    this.scrollToIndex = (index, {
      align: initialAlign = "auto",
      behavior = "auto"
    } = {}) => {
      this._iosDeferredAdjustment = 0;
      index = Math.max(0, Math.min(index, this.options.count - 1));
      const offsetInfo = this.getOffsetForIndex(index, initialAlign);
      if (!offsetInfo) {
        return;
      }
      const [offset, align] = offsetInfo;
      const now = this.now();
      this.scrollState = {
        index,
        align,
        behavior,
        startedAt: now,
        lastTargetOffset: offset,
        stableFrames: 0
      };
      this._scrollToOffset(offset, { adjustments: void 0, behavior });
      this.scheduleScrollReconcile();
    };
    this.scrollBy = (delta, { behavior = "auto" } = {}) => {
      const offset = this.getScrollOffset() + delta;
      const now = this.now();
      this.scrollState = {
        index: null,
        align: "start",
        behavior,
        startedAt: now,
        lastTargetOffset: offset,
        stableFrames: 0
      };
      this._scrollToOffset(offset, { adjustments: void 0, behavior });
      this.scheduleScrollReconcile();
    };
    this.scrollToEnd = ({ behavior = "auto" } = {}) => {
      if (this.options.count > 0) {
        this.scrollToIndex(this.options.count - 1, {
          align: "end",
          behavior
        });
        return;
      }
      this.scrollToOffset(Math.max(this.getTotalSize() - this.getSize(), 0), {
        behavior
      });
    };
    this.getTotalSize = () => {
      var _a;
      const measurements = this.getMeasurements();
      let end;
      if (measurements.length === 0) {
        end = this.options.paddingStart;
      } else if (this.options.lanes === 1) {
        const lastIdx = measurements.length - 1;
        const flat = this._flatMeasurements;
        if (flat != null) {
          end = flat[lastIdx * 2] + flat[lastIdx * 2 + 1];
        } else {
          end = ((_a = measurements[lastIdx]) == null ? void 0 : _a.end) ?? 0;
        }
      } else {
        const endByLane = Array(this.options.lanes).fill(null);
        let endIndex = measurements.length - 1;
        while (endIndex >= 0 && endByLane.some((val) => val === null)) {
          const item = measurements[endIndex];
          if (endByLane[item.lane] === null) {
            endByLane[item.lane] = item.end;
          }
          endIndex--;
        }
        end = Math.max(...endByLane.filter((val) => val !== null));
      }
      return Math.max(
        end - this.options.scrollMargin + this.options.paddingEnd,
        0
      );
    };
    this.takeSnapshot = () => {
      const snapshot = [];
      if (this.itemSizeCache.size === 0) return snapshot;
      const m = this.getMeasurements();
      for (const item of m) {
        if (item && this.itemSizeCache.has(item.key)) {
          snapshot.push({
            index: item.index,
            key: item.key,
            start: item.start,
            size: item.size,
            end: item.end,
            lane: item.lane
          });
        }
      }
      return snapshot;
    };
    this._scrollToOffset = (offset, {
      adjustments,
      behavior
    }) => {
      this._intendedScrollOffset = offset + (adjustments ?? 0);
      this.options.scrollToFn(offset, { behavior, adjustments }, this);
    };
    this.measure = () => {
      this.pendingMin = null;
      this.itemSizeCache.clear();
      this.laneAssignments.clear();
      this.itemSizeCacheVersion++;
      this.notify(false);
    };
    this.setOptions(opts);
  }
  // Returns `true` when it performed a synchronous `scrollTop` write this
  // tick, `false` when the delta was zero or the write was deferred (iOS).
  // `resizeItem` uses that to decide whether the follow-up `notify` must be
  // synchronous so the grown transforms commit in the same paint (#1227).
  applyScrollAdjustment(delta, behavior) {
    if (delta === 0) return false;
    if (this.options.debug) {
      console.info("correction", delta);
    }
    if (isIOSWebKit() && (this.isScrolling || this._iosTouching || this._iosJustTouchEnded)) {
      this._iosDeferredAdjustment += delta;
      return false;
    } else {
      this._scrollToOffset(this.getScrollOffset(), {
        adjustments: this.scrollAdjustments += delta,
        behavior
      });
      if (this.scrollOffset !== null) {
        this.scrollOffset += this.scrollAdjustments;
        if (this.scrollOffset < 0) this.scrollOffset = 0;
        this.scrollAdjustments = 0;
      }
      return true;
    }
  }
  scheduleScrollReconcile() {
    if (!this.targetWindow) {
      this.scrollState = null;
      return;
    }
    if (this.rafId != null) return;
    this.rafId = this.targetWindow.requestAnimationFrame(() => {
      this.rafId = null;
      this.reconcileScroll();
    });
  }
  reconcileScroll() {
    if (!this.scrollState) return;
    const el = this.scrollElement;
    if (!el) return;
    const MAX_RECONCILE_MS = 5e3;
    if (this.now() - this.scrollState.startedAt > MAX_RECONCILE_MS) {
      this.scrollState = null;
      return;
    }
    const offsetInfo = this.scrollState.index != null ? this.getOffsetForIndex(this.scrollState.index, this.scrollState.align) : void 0;
    const targetOffset = offsetInfo ? offsetInfo[0] : this.scrollState.lastTargetOffset;
    const STABLE_FRAMES = 1;
    const targetChanged = targetOffset !== this.scrollState.lastTargetOffset;
    if (!targetChanged && approxEqual(targetOffset, this.getScrollOffset())) {
      this.scrollState.stableFrames++;
      if (this.scrollState.stableFrames >= STABLE_FRAMES) {
        if (this.getScrollOffset() !== targetOffset) {
          this._scrollToOffset(targetOffset, {
            adjustments: void 0,
            behavior: "auto"
          });
        }
        this.scrollState = null;
        return;
      }
    } else {
      this.scrollState.stableFrames = 0;
      if (targetChanged) {
        const viewport = this.getSize() || 600;
        const distance = Math.abs(targetOffset - this.getScrollOffset());
        const keepSmooth = this.scrollState.behavior === "smooth" && distance > viewport;
        this.scrollState.lastTargetOffset = targetOffset;
        if (!keepSmooth) {
          this.scrollState.behavior = "auto";
        }
        this._scrollToOffset(targetOffset, {
          adjustments: void 0,
          behavior: keepSmooth ? "smooth" : "auto"
        });
      }
    }
    this.scheduleScrollReconcile();
  }
};
var findNearestBinarySearch = (low, high, getCurrentValue, value) => {
  while (low <= high) {
    const middle = (low + high) / 2 | 0;
    const currentValue = getCurrentValue(middle);
    if (currentValue < value) {
      low = middle + 1;
    } else if (currentValue > value) {
      high = middle - 1;
    } else {
      return middle;
    }
  }
  if (low > 0) {
    return low - 1;
  } else {
    return 0;
  }
};
function findNearestBinarySearchFlat(flat, high, value) {
  let low = 0;
  while (low <= high) {
    const middle = (low + high) / 2 | 0;
    const currentValue = flat[middle * 2];
    if (currentValue < value) {
      low = middle + 1;
    } else if (currentValue > value) {
      high = middle - 1;
    } else {
      return middle;
    }
  }
  return low > 0 ? low - 1 : 0;
}
function calculateRangeImpl(measurements, outerSize, scrollOffset, lanes, flat) {
  const lastIndex = measurements.length - 1;
  if (measurements.length <= lanes) {
    return { startIndex: 0, endIndex: lastIndex };
  }
  if (lanes === 1 && flat !== null) {
    const startIndex2 = findNearestBinarySearchFlat(
      flat,
      lastIndex,
      scrollOffset
    );
    let endIndex2 = startIndex2;
    const limit = scrollOffset + outerSize;
    while (endIndex2 < lastIndex && flat[endIndex2 * 2] + flat[endIndex2 * 2 + 1] < limit) {
      endIndex2++;
    }
    return { startIndex: startIndex2, endIndex: endIndex2 };
  }
  const getStart = (index) => measurements[index].start;
  let startIndex = findNearestBinarySearch(0, lastIndex, getStart, scrollOffset);
  let endIndex = startIndex;
  if (lanes === 1) {
    while (endIndex < lastIndex && measurements[endIndex].end < scrollOffset + outerSize) {
      endIndex++;
    }
  } else if (lanes > 1) {
    const endPerLane = Array(lanes).fill(0);
    while (endIndex < lastIndex && endPerLane.some((pos) => pos < scrollOffset + outerSize)) {
      const item = measurements[endIndex];
      endPerLane[item.lane] = item.end;
      endIndex++;
    }
    const startPerLane = Array(lanes).fill(scrollOffset + outerSize);
    while (startIndex >= 0 && startPerLane.some((pos) => pos >= scrollOffset)) {
      const item = measurements[startIndex];
      startPerLane[item.lane] = item.start;
      startIndex--;
    }
    startIndex = Math.max(0, startIndex - startIndex % lanes);
    endIndex = Math.min(lastIndex, endIndex + (lanes - 1 - endIndex % lanes));
  }
  return { startIndex, endIndex };
}

// node_modules/@tanstack/react-virtual/dist/esm/index.js
var useIsomorphicLayoutEffect2 = typeof document !== "undefined" ? React6.useLayoutEffect : React6.useEffect;
function useVirtualizerBase({
  useFlushSync = true,
  directDomUpdates = false,
  directDomUpdatesMode = "transform",
  ...options
}) {
  const rerender = React6.useReducer((x) => x + 1, 0)[1];
  const directRef = React6.useRef({
    enabled: directDomUpdates,
    mode: directDomUpdatesMode,
    container: null,
    lastSize: null,
    // Keyed by the element itself so a remounted node (same key, new DOM
    // node — e.g. when `enabled` is toggled off then on) is treated as fresh
    // and gets its style written.
    lastPositions: /* @__PURE__ */ new WeakMap(),
    prevRange: null
  });
  directRef.current.enabled = directDomUpdates;
  directRef.current.mode = directDomUpdatesMode;
  const applyContainerSize = (instance2) => {
    const state = directRef.current;
    if (!state.enabled || !state.container) return;
    const totalSize = instance2.getTotalSize();
    if (totalSize !== state.lastSize) {
      state.lastSize = totalSize;
      const sizeAxis = instance2.options.horizontal ? "width" : "height";
      state.container.style[sizeAxis] = `${totalSize}px`;
    }
  };
  const applyDirectStyles = (instance2) => {
    const state = directRef.current;
    if (!state.enabled || !state.container) return;
    applyContainerSize(instance2);
    const horizontal = !!instance2.options.horizontal;
    const useTransform = state.mode === "transform";
    const posAxis = horizontal ? "left" : "top";
    const scrollMargin = instance2.options.scrollMargin;
    const items = instance2.getVirtualItems();
    for (const item of items) {
      const next = item.start - scrollMargin;
      const el = instance2.elementsCache.get(item.key);
      if (!el) continue;
      if (state.lastPositions.get(el) === next) continue;
      state.lastPositions.set(el, next);
      if (useTransform) {
        el.style.transform = horizontal ? `translate3d(${next}px, 0, 0)` : `translate3d(0, ${next}px, 0)`;
      } else {
        el.style[posAxis] = `${next}px`;
      }
    }
  };
  const resolvedOptions = {
    ...options,
    onChange: (instance2, sync) => {
      var _a;
      const state = directRef.current;
      let shouldRerender = true;
      if (state.enabled) {
        applyDirectStyles(instance2);
        const range = instance2.range;
        const prev = state.prevRange;
        shouldRerender = !prev || prev.isScrolling !== instance2.isScrolling || prev.startIndex !== (range == null ? void 0 : range.startIndex) || prev.endIndex !== (range == null ? void 0 : range.endIndex);
        if (shouldRerender) {
          state.prevRange = range ? {
            startIndex: range.startIndex,
            endIndex: range.endIndex,
            isScrolling: instance2.isScrolling
          } : null;
        }
      }
      if (shouldRerender) {
        if (useFlushSync && sync) {
          (0, import_react_dom.flushSync)(rerender);
        } else {
          rerender();
        }
      }
      (_a = options.onChange) == null ? void 0 : _a.call(options, instance2, sync);
    }
  };
  const [instance] = React6.useState(() => {
    const v = new Virtualizer(resolvedOptions);
    return Object.assign(v, {
      containerRef: (node) => {
        const state = directRef.current;
        state.container = node;
        state.lastSize = null;
        if (node && state.enabled) {
          const total = v.getTotalSize();
          state.lastSize = total;
          const axis = v.options.horizontal ? "width" : "height";
          node.style[axis] = `${total}px`;
        }
      }
    });
  });
  instance.setOptions(resolvedOptions);
  useIsomorphicLayoutEffect2(() => {
    return instance._didMount();
  }, []);
  useIsomorphicLayoutEffect2(() => {
    applyContainerSize(instance);
    return instance._willUpdate();
  });
  useIsomorphicLayoutEffect2(() => {
    applyDirectStyles(instance);
  });
  return instance;
}
function useVirtualizer(options) {
  return useVirtualizerBase({
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    ...options
  });
}

// packages/render/table/TableGridRow.tsx
var import_react13 = __toESM(require_react(), 1);

// packages/render/web/ui/TableCellEdit.tsx
var import_jsx_runtime8 = __toESM(require_jsx_runtime(), 1);
var TableCellEdit = (props) => {
  const { inputRef, className, style, ...restProps } = props;
  const mergedClassName = ["table-cell-edit", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    "textarea",
    {
      ref: inputRef,
      className: mergedClassName,
      style,
      ...restProps
    }
  );
};
var TableCellEdit_default = TableCellEdit;

// packages/render/table/cellPreview.ts
var MAX_CELL_PREVIEW_LENGTH = 180;
var createCellPreview = (value, maxLength = MAX_CELL_PREVIEW_LENGTH) => {
  const normalized = compactWhitespace(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}\u2026`;
};

// packages/render/table/TableGridRow.tsx
var import_jsx_runtime9 = __toESM(require_jsx_runtime(), 1);
var TableGridRowComponent = import_react13.default.forwardRef(function TableGridRowComponent2({
  row,
  rowIndex,
  columns,
  primaryColumnName,
  cellEdit,
  isDragging,
  dropPosition,
  spaceId,
  ActivityBadge,
  onStartEdit,
  onEditingValueChange,
  onFinishEdit,
  onKeyDown,
  onInsertRowBelow,
  onContextMenu,
  onOpenSelectEditor,
  onOpenLongText,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop
}, ref) {
  const handleDragStart = (0, import_react13.useCallback)(
    (e) => {
      onDragStart(row.dbKey, e);
    },
    [onDragStart, row.dbKey]
  );
  const handleDragOver = (0, import_react13.useCallback)(
    (e) => {
      onDragOver(row.dbKey, e);
    },
    [onDragOver, row.dbKey]
  );
  const handleDragLeave = (0, import_react13.useCallback)(() => {
    onDragLeave(row.dbKey);
  }, [onDragLeave, row.dbKey]);
  const handleDrop = (0, import_react13.useCallback)(
    (e) => {
      e.preventDefault();
      onDrop(row.dbKey);
    },
    [onDrop, row.dbKey]
  );
  const handleInsertBelow = (0, import_react13.useCallback)(
    (e) => {
      e.stopPropagation();
      onInsertRowBelow(row.dbKey);
    },
    [onInsertRowBelow, row.dbKey]
  );
  const handleContextMenu = (0, import_react13.useCallback)(
    (e) => {
      e.preventDefault();
      onContextMenu(row.dbKey, e.clientX, e.clientY);
    },
    [onContextMenu, row.dbKey]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
    BaseTableRow,
    {
      ref,
      "data-index": rowIndex,
      className: "table-page__row" + (isDragging ? " table-page__row--dragging" : "") + (dropPosition === "before" ? " table-page__row--drop-before" : "") + (dropPosition === "after" ? " table-page__row--drop-after" : ""),
      "data-row-dbkey": row.dbKey,
      draggable: true,
      onDragStart: handleDragStart,
      onDragEnd,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onContextMenu: handleContextMenu,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          BaseTableCell,
          {
            className: "table-page__drag-column",
            onClick: (e) => e.stopPropagation(),
            children: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "table-page__drag-stack", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Tooltip, { content: "\u5728\u4E0B\u65B9\u63D2\u5165\u4E00\u884C", placement: "right", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                "button",
                {
                  type: "button",
                  className: "table-page__gutter-insert-btn",
                  "aria-label": "\u5728\u4E0B\u65B9\u63D2\u5165\u4E00\u884C",
                  onClick: handleInsertBelow,
                  children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuPlus, { size: 14, "aria-hidden": "true" })
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Tooltip, { content: "\u62D6\u62FD\u4EE5\u91CD\u6392\u884C", placement: "right", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                "button",
                {
                  type: "button",
                  className: "table-page__row-drag-handle",
                  "aria-label": "\u62D6\u62FD\u4EE5\u91CD\u6392\u884C",
                  onPointerDown: (e) => e.stopPropagation(),
                  children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuGripVertical, { size: 14, "aria-hidden": "true" })
                }
              ) })
            ] })
          },
          "__drag"
        ),
        columns.map((col) => {
          const isSelectColumn = col.type === "select";
          const isEditing = !isSelectColumn && cellEdit?.columnName === col.name;
          const rawValue = row[col.name];
          const cellValue = rawValue === null || rawValue === void 0 ? "" : String(rawValue);
          const isLongText = !isSelectColumn && cellValue.length > MAX_CELL_PREVIEW_LENGTH;
          const previewText = isLongText ? createCellPreview(cellValue) : cellValue;
          const isPrimary = !!col.isPrimary;
          const cellPadding = isPrimary ? "4px 12px" : "var(--space-3) var(--space-4)";
          return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
            BaseTableCell,
            {
              className: isEditing ? `table-cell-editing${isPrimary ? " table-cell-editing--primary" : ""}` : void 0,
              onClick: (e) => {
                if (isEditing) return;
                if (isSelectColumn) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  onOpenSelectEditor(row.dbKey, col.name, {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                  });
                  return;
                }
                onStartEdit(row.dbKey, col.name, cellValue);
              },
              style: {
                cursor: isSelectColumn ? "pointer" : "text",
                padding: cellPadding
              },
              title: isLongText ? cellValue : void 0,
              children: isEditing && cellEdit ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                TableCellEdit_default,
                {
                  autoFocus: true,
                  value: cellEdit.value,
                  onChange: (e) => onEditingValueChange(e.target.value),
                  onBlur: () => onFinishEdit(true),
                  onKeyDown,
                  rows: 1
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "table-page__primary-cell-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "table-page__primary-content", children: [
                isSelectColumn ? cellValue === "" ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: { color: "var(--textLight)" }, children: "-" }) : (
                  // select 非空值：badge 展示，颜色按值 hash 确定性映射
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                    "span",
                    {
                      className: `table-page__select-badge table-page__select-badge--${selectBadgeColorIndex(cellValue)}`,
                      title: cellValue,
                      children: previewText
                    }
                  )
                ) : cellValue === "" ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: { color: "var(--textLight)" }, children: "-" }) : isLongText ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "table-page__cell-long-wrapper", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "table-page__cell-preview", children: previewText }),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "table-page__cell-view-btn",
                      title: "\u67E5\u770B\u5168\u6587",
                      "aria-label": "\u67E5\u770B\u5168\u6587",
                      onClick: (e) => {
                        e.stopPropagation();
                        const rowTitle = primaryColumnName && primaryColumnName in row && row[primaryColumnName] !== void 0 ? String(row[primaryColumnName] ?? "") : `\u884C ${rowIndex + 1}`;
                        onOpenLongText({
                          dbKey: row.dbKey,
                          columnName: col.name,
                          columnLabel: col.label || col.name,
                          rowTitle,
                          value: cellValue
                        });
                      },
                      children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuMaximize2, { size: 14, "aria-hidden": "true" })
                    }
                  )
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "table-page__cell-preview", children: previewText }),
                isPrimary && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ActivityBadge, { row, spaceId })
              ] }) })
            },
            col.id ?? col.name
          );
        })
      ]
    }
  );
});
function areTableGridRowPropsEqual(prev, next) {
  if (prev.row !== next.row) return false;
  if (prev.rowIndex !== next.rowIndex) return false;
  if (prev.columns !== next.columns) return false;
  if (prev.primaryColumnName !== next.primaryColumnName) return false;
  if (prev.isDragging !== next.isDragging) return false;
  if (prev.dropPosition !== next.dropPosition) return false;
  if (prev.spaceId !== next.spaceId) return false;
  if (prev.ActivityBadge !== next.ActivityBadge) return false;
  const prevEdit = prev.cellEdit;
  const nextEdit = next.cellEdit;
  if (prevEdit === null && nextEdit === null) {
  } else if (prevEdit === null || nextEdit === null) {
    return false;
  } else if (prevEdit.columnName !== nextEdit.columnName || prevEdit.value !== nextEdit.value) {
    return false;
  }
  if (prev.onStartEdit !== next.onStartEdit) return false;
  if (prev.onEditingValueChange !== next.onEditingValueChange) return false;
  if (prev.onFinishEdit !== next.onFinishEdit) return false;
  if (prev.onKeyDown !== next.onKeyDown) return false;
  if (prev.onInsertRowBelow !== next.onInsertRowBelow) return false;
  if (prev.onContextMenu !== next.onContextMenu) return false;
  if (prev.onOpenSelectEditor !== next.onOpenSelectEditor) return false;
  if (prev.onOpenLongText !== next.onOpenLongText) return false;
  if (prev.onDragStart !== next.onDragStart) return false;
  if (prev.onDragEnd !== next.onDragEnd) return false;
  if (prev.onDragOver !== next.onDragOver) return false;
  if (prev.onDragLeave !== next.onDragLeave) return false;
  if (prev.onDrop !== next.onDrop) return false;
  return true;
}
var TableGridRow = (0, import_react13.memo)(
  TableGridRowComponent,
  areTableGridRowPropsEqual
);

// packages/render/table/TableGridSection.tsx
var import_jsx_runtime10 = __toESM(require_jsx_runtime(), 1);
var MIN_COLUMN_WIDTH = 80;
var TableGridSection = ({
  gridScrollRef,
  columns,
  primaryColumnName,
  columnWidths,
  gridColSpan,
  sortRule,
  handleSortClick,
  editingColumnId,
  setEditingColumnId,
  editingColumnText,
  setEditingColumnText,
  editingColumnInputRef,
  handleRenameColumnConfirm,
  handleDeleteColumn,
  handleMoveColumn,
  sortedAndOrderedRows,
  filteredRows,
  editingRowIndex,
  editingCell,
  editingValue,
  draggingRowKey,
  dropTarget,
  currentSpaceId,
  TableActivityBadge: TableActivityBadge2,
  shouldWindowGridRows,
  handleAddRowBottom,
  handleStartEdit,
  handleEditingValueChange,
  finishEdit,
  handleKeyDown,
  handleInsertRowBelow,
  handleRowContextMenu,
  handleOpenSelectEditor,
  handleOpenLongText,
  handleRowDragStart,
  handleRowDragEnd,
  handleRowDragOver,
  handleRowDragLeave,
  handleRowDropOnKey,
  handleResizerPointerDown,
  resizingColumnId,
  resizingRef
}) => {
  const baseTableColumns = (0, import_react14.useMemo)(
    () => [
      { width: 40 },
      ...columns.map((col) => ({
        width: columnWidths[col.id]
      }))
    ],
    [columns, columnWidths]
  );
  const gridRangeExtractor = (0, import_react14.useMemo)(() => {
    return (range) => {
      const defaults = defaultRangeExtractor(range);
      if (editingRowIndex < 0) return defaults;
      const min = defaults[0] ?? 0;
      const max = defaults[defaults.length - 1] ?? 0;
      if (editingRowIndex >= min && editingRowIndex <= max) {
        return defaults;
      }
      if (editingRowIndex < min) {
        const prepend = [];
        for (let i = editingRowIndex; i < min; i++) {
          prepend.push(i);
        }
        return [...prepend, ...defaults];
      }
      const append = [];
      for (let i = max + 1; i <= editingRowIndex; i++) {
        append.push(i);
      }
      return [...defaults, ...append];
    };
  }, [editingRowIndex]);
  const rowVirtualizer = useVirtualizer({
    count: sortedAndOrderedRows.length,
    enabled: shouldWindowGridRows,
    getScrollElement: () => gridScrollRef.current,
    estimateSize: () => 48,
    overscan: 10,
    rangeExtractor: gridRangeExtractor
  });
  (0, import_react14.useEffect)(() => {
    if (editingRowIndex < 0) return;
    rowVirtualizer.scrollToIndex(editingRowIndex);
  }, [editingRowIndex, rowVirtualizer]);
  (0, import_react14.useEffect)(() => {
    if (shouldWindowGridRows || !editingCell) return;
    const container = gridScrollRef.current;
    if (!container) return;
    const rowEl = container.querySelector(
      `tr[data-row-dbkey="${editingCell.dbKey}"]`
    );
    rowEl?.scrollIntoView({ block: "nearest" });
  }, [editingCell, gridScrollRef, shouldWindowGridRows]);
  const gridVirtualItems = shouldWindowGridRows ? rowVirtualizer.getVirtualItems() : [];
  const mountedGridRowCount = shouldWindowGridRows ? gridVirtualItems.length : sortedAndOrderedRows.length;
  const gridTopSpacerPx = gridVirtualItems.length > 0 ? gridVirtualItems[0].start : 0;
  const gridBottomSpacerPx = gridVirtualItems.length > 0 ? Math.max(
    0,
    rowVirtualizer.getTotalSize() - gridVirtualItems[gridVirtualItems.length - 1].end
  ) : 0;
  const renderGridRow = (row, rowIndex, virtualRef) => {
    const isDragging = draggingRowKey === row.dbKey;
    const dropPos = dropTarget && dropTarget.rowDbKey === row.dbKey ? dropTarget.position : null;
    const cellEdit = editingCell && editingCell.dbKey === row.dbKey ? {
      columnName: editingCell.columnName,
      value: editingValue
    } : null;
    const rowProps = {
      row,
      rowIndex,
      columns,
      primaryColumnName,
      cellEdit,
      isDragging,
      dropPosition: dropPos,
      spaceId: currentSpaceId,
      ActivityBadge: TableActivityBadge2,
      onStartEdit: handleStartEdit,
      onEditingValueChange: handleEditingValueChange,
      onFinishEdit: finishEdit,
      onKeyDown: handleKeyDown,
      onInsertRowBelow: handleInsertRowBelow,
      onContextMenu: handleRowContextMenu,
      onOpenSelectEditor: handleOpenSelectEditor,
      onOpenLongText: handleOpenLongText,
      onDragStart: handleRowDragStart,
      onDragEnd: handleRowDragEnd,
      onDragOver: handleRowDragOver,
      onDragLeave: handleRowDragLeave,
      onDrop: handleRowDropOnKey
    };
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
      TableGridRow,
      {
        ref: virtualRef,
        ...rowProps,
        cellEdit,
        onStartEdit: handleStartEdit,
        onEditingValueChange: handleEditingValueChange
      },
      row.dbKey
    );
  };
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
    "div",
    {
      className: "table-page__grid-scroll",
      ref: gridScrollRef,
      "data-windowed": shouldWindowGridRows ? "true" : "false",
      "data-mounted-rows": String(mountedGridRowCount),
      "data-total-rows": String(sortedAndOrderedRows.length),
      children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(BaseTable, { className: "table-page__table", columns: baseTableColumns, children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(BaseTableRow, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
            BaseTableCell,
            {
              header: true,
              className: "table-page__drag-column",
              "aria-label": "\u62D6\u62FD"
            },
            "__drag"
          ),
          columns.map((col, colIndex) => {
            const isEditingColumn = editingColumnId === col.id;
            const isPrimaryColumn = !!col.isPrimary;
            const displayLabel = col.label || col.name;
            const headerTitle = col.description && col.description.trim() || "\u53CC\u51FB\u91CD\u547D\u540D\u5B57\u6BB5\u663E\u793A\u540D";
            return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(BaseTableCell, { header: true, children: [
              isEditingColumn ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                InlineEditInput_default,
                {
                  inputRef: editingColumnInputRef,
                  autoFocus: true,
                  value: editingColumnText,
                  onChange: (e) => setEditingColumnText(e.target.value),
                  onBlur: () => {
                    handleRenameColumnConfirm(col.id, editingColumnText);
                    setEditingColumnId(null);
                  },
                  onKeyDown: (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRenameColumnConfirm(
                        col.id,
                        editingColumnText
                      );
                      setEditingColumnId(null);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingColumnId(null);
                      setEditingColumnText(displayLabel);
                    }
                  },
                  style: { width: "100%" }
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "table-page__column-header", children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "table-page__column-name" + (isPrimaryColumn ? " table-page__column-name--primary" : "") + " table-page__column-name--sortable",
                    title: headerTitle,
                    onClick: () => handleSortClick(col.id),
                    onDoubleClick: (e) => {
                      e.preventDefault();
                      setEditingColumnId(col.id);
                      setEditingColumnText(displayLabel);
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "table-page__column-name-text", children: displayLabel }),
                      isPrimaryColumn && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                        "span",
                        {
                          className: "table-page__primary-icon",
                          "aria-label": "\u4E3B\u5B57\u6BB5",
                          title: "\u4E3B\u5B57\u6BB5\uFF08\u884C\u6807\u9898\uFF09",
                          children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuStar, { size: 12, "aria-hidden": "true" })
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                        "span",
                        {
                          className: "table-page__sort-indicator" + (sortRule && sortRule.columnId === col.id ? ` table-page__sort-indicator--active table-page__sort-indicator--${sortRule.direction}` : ""),
                          "aria-hidden": "true",
                          children: sortRule && sortRule.columnId === col.id ? sortRule.direction === "asc" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuArrowUp, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuArrowDown, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuArrowUpDown, { size: 12 })
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      flexShrink: 0
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Tooltip, { content: "\u5411\u5DE6\u79FB\u52A8", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                        Button_default,
                        {
                          variant: "ghost",
                          size: "small",
                          className: "table-page__column-action-btn",
                          disabled: colIndex === 0,
                          onClick: (e) => {
                            e.stopPropagation();
                            handleMoveColumn(colIndex, colIndex - 1);
                          },
                          title: "\u5411\u5DE6\u79FB\u52A8",
                          "aria-label": "\u5411\u5DE6\u79FB\u52A8",
                          style: { padding: 0, height: 24, width: 24 },
                          children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuChevronLeft, { size: 13, "aria-hidden": "true" })
                        }
                      ) }),
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Tooltip, { content: "\u5411\u53F3\u79FB\u52A8", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                        Button_default,
                        {
                          variant: "ghost",
                          size: "small",
                          className: "table-page__column-action-btn",
                          disabled: colIndex === columns.length - 1,
                          onClick: (e) => {
                            e.stopPropagation();
                            handleMoveColumn(colIndex, colIndex + 1);
                          },
                          title: "\u5411\u53F3\u79FB\u52A8",
                          "aria-label": "\u5411\u53F3\u79FB\u52A8",
                          style: { padding: 0, height: 24, width: 24 },
                          children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuChevronRight, { size: 13, "aria-hidden": "true" })
                        }
                      ) }),
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Tooltip, { content: "\u5220\u9664\u5B57\u6BB5", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                        Button_default,
                        {
                          variant: "ghost",
                          size: "small",
                          className: "table-page__column-action-btn",
                          onClick: (e) => {
                            e.stopPropagation();
                            handleDeleteColumn(col.name);
                          },
                          title: "\u5220\u9664\u5B57\u6BB5",
                          "aria-label": "\u5220\u9664\u5B57\u6BB5",
                          style: { padding: 0, height: 24, width: 24 },
                          children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuTrash2, { size: 13, "aria-hidden": "true" })
                        }
                      ) })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                "div",
                {
                  className: "table-page__column-resizer" + (resizingColumnId === col.id ? " is-resizing" : ""),
                  onPointerDown: (e) => {
                    const thElement = e.currentTarget.parentElement;
                    const domWidth = thElement?.getBoundingClientRect().width ?? 0;
                    const currentWidth = columnWidths[col.id] && columnWidths[col.id] > 0 ? columnWidths[col.id] : domWidth || MIN_COLUMN_WIDTH;
                    resizingRef.current = {
                      columnId: col.id,
                      startX: e.clientX,
                      startWidth: currentWidth
                    };
                    handleResizerPointerDown(e);
                  }
                }
              )
            ] }, col.id ?? col.name);
          })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("tbody", { children: [
          shouldWindowGridRows && gridTopSpacerPx > 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("tr", { style: { height: `${gridTopSpacerPx}px` }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("td", { colSpan: gridColSpan, style: { padding: 0, border: 0 } }) }),
          shouldWindowGridRows ? gridVirtualItems.map((virtualRow) => {
            const row = sortedAndOrderedRows[virtualRow.index];
            if (!row) return null;
            return renderGridRow(
              row,
              virtualRow.index,
              rowVirtualizer.measureElement
            );
          }) : sortedAndOrderedRows.map(
            (row, rowIndex) => renderGridRow(row, rowIndex)
          ),
          shouldWindowGridRows && gridBottomSpacerPx > 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("tr", { style: { height: `${gridBottomSpacerPx}px` }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("td", { colSpan: gridColSpan, style: { padding: 0, border: 0 } }) }),
          mountedGridRowCount === 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(BaseTableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(BaseTableCell, { colSpan: gridColSpan, className: "table-page__empty-cell", children: filteredRows.length === 0 ? "\u6682\u65E0\u7B26\u5408\u6761\u4EF6\u7684\u884C" : "\u6682\u65E0\u6570\u636E" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(BaseTableRow, { className: "table-page__add-row-row", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(BaseTableCell, { colSpan: gridColSpan, className: "table-page__add-row-cell", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
            Button_default,
            {
              variant: "ghost",
              size: "small",
              className: "table-page__add-row-btn",
              onClick: handleAddRowBottom,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuPlus, { size: 14, "aria-hidden": "true" }),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: "\u65B0\u589E\u4E00\u884C" })
              ]
            }
          ) }) })
        ] })
      ] })
    }
  );
};

// packages/render/table/TablePage.tsx
var import_jsx_runtime11 = __toESM(require_jsx_runtime(), 1);
var GRID_WINDOWING_ROW_THRESHOLD = 50;
var readTableSearchParam = (key) => {
  if (typeof window === "undefined") return "";
  const value = new URLSearchParams(window.location.search).get(key);
  return value ? value.trim() : "";
};
var readInitialViewChoice = () => {
  if (typeof window === "undefined") return "";
  const value = new URLSearchParams(window.location.search).get("view");
  return value === "grid" || value === "kanban" ? value : "";
};
function TableActivityBadge({
  row,
  spaceId
}) {
  const activity = (0, import_react15.useMemo)(
    () => getLatestTableActivityBadge(row),
    [row]
  );
  if (!activity || !spaceId) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    "span",
    {
      className: "table-page__activity-badge",
      title: activity.title,
      onClick: (e) => {
        e.stopPropagation();
        if (activity.dialogId) {
          window.location.href = buildDialogUrl(spaceId, activity.dialogId);
        }
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(LuStar, { size: 12, className: "table-page__activity-badge-icon", "aria-hidden": "true" }),
        activity.label
      ]
    }
  );
}
var TablePage = ({ tableKey }) => {
  const {
    tenantId,
    tableId,
    valid,
    tableMeta,
    isLoading,
    error,
    rows,
    dispatch
  } = useTable(tableKey);
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const [newColumnName, setNewColumnName] = (0, import_react15.useState)("");
  const [isRenamingTable, setIsRenamingTable] = (0, import_react15.useState)(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = (0, import_react15.useState)(false);
  const [tableTitleInput, setTableTitleInput] = (0, import_react15.useState)("");
  const tableTitleInputRef = (0, import_react15.useRef)(null);
  const [editingColumnId, setEditingColumnId] = (0, import_react15.useState)(null);
  const [editingColumnText, setEditingColumnText] = (0, import_react15.useState)("");
  const editingColumnInputRef = (0, import_react15.useRef)(null);
  const [selectEditor, setSelectEditor] = (0, import_react15.useState)(null);
  const [longTextPayload, setLongTextPayload] = (0, import_react15.useState)(null);
  const [selectedViewChoice, setSelectedViewChoice] = (0, import_react15.useState)(
    () => readInitialViewChoice()
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = (0, import_react15.useState)(
    () => readTableSearchParam("status")
  );
  const [selectedOwnerFilter, setSelectedOwnerFilter] = (0, import_react15.useState)(
    () => readTableSearchParam("owner")
  );
  const [columnWidths, setColumnWidths] = (0, import_react15.useState)({});
  const columnWidthsRef = (0, import_react15.useRef)({});
  const resizingRef = (0, import_react15.useRef)(null);
  const [resizingColumnId, setResizingColumnId] = (0, import_react15.useState)(null);
  const { handlePointerDown: handleResizerPointerDown } = useDragResize({
    onStart: () => {
      if (resizingRef.current) setResizingColumnId(resizingRef.current.columnId);
    },
    onMove: (clientX) => {
      const r = resizingRef.current;
      if (!r) return;
      const delta = clientX - r.startX;
      const baseWidth = r.startWidth ?? 150;
      const nextWidth = Math.max(80, baseWidth + delta);
      setColumnWidths((prev) => {
        if (prev[r.columnId] === nextWidth) return prev;
        return { ...prev, [r.columnId]: nextWidth };
      });
    },
    onStop: () => {
      const r = resizingRef.current;
      resizingRef.current = null;
      setResizingColumnId(null);
      if (!r || !tenantId || !tableId) return;
      const latestWidth = columnWidthsRef.current[r.columnId];
      if (latestWidth !== void 0) {
        void dispatch(
          updateColumnWidth({
            tenantId,
            tableId,
            columnId: r.columnId,
            width: latestWidth
          })
        );
      }
    }
  });
  const gridScrollRef = (0, import_react15.useRef)(null);
  const {
    manualOrder,
    setManualOrder,
    sortRule,
    setSortRule,
    persistPrefs,
    handleSortClick,
    handleRowDrop
  } = useTablePrefs(tableKey, rows);
  const columns = (0, import_react15.useMemo)(() => tableMeta?.columns ?? [], [tableMeta]);
  const {
    draggingRowKey,
    setDraggingRowKey,
    dropTarget,
    setDropTarget,
    handleRowDragStart,
    handleRowDragEnd,
    handleRowDragOver,
    handleRowDragLeave,
    handleRowDropOnKey
  } = useGridDragDrop(handleRowDrop);
  const primaryColumn = (0, import_react15.useMemo)(
    () => columns.find((c) => c.isPrimary) ?? columns[0],
    [columns]
  );
  const tableDisplayMode = (0, import_react15.useMemo)(
    () => tableMeta ? resolveTableDisplayMode(tableMeta) : GRID_DISPLAY_MODE,
    [tableMeta]
  );
  const statusFilterColumn = (0, import_react15.useMemo)(
    () => findColumnByNameOrLabel(columns, ["status", "\u72B6\u6001"]),
    [columns]
  );
  const statusFilterOptions = (0, import_react15.useMemo)(
    () => getColumnFilterOptions(statusFilterColumn, rows),
    [statusFilterColumn, rows]
  );
  const statusSelectOptions = (0, import_react15.useMemo)(
    () => selectedStatusFilter && !statusFilterOptions.includes(selectedStatusFilter) ? [selectedStatusFilter, ...statusFilterOptions] : statusFilterOptions,
    [statusFilterOptions, selectedStatusFilter]
  );
  const ownerFilterColumn = (0, import_react15.useMemo)(
    () => findColumnByNameOrLabel(columns, ["owner", "\u8D1F\u8D23\u4EBA"]),
    [columns]
  );
  const ownerFilterOptions = (0, import_react15.useMemo)(
    () => getColumnFilterOptions(ownerFilterColumn, rows),
    [ownerFilterColumn, rows]
  );
  const ownerSelectOptions = (0, import_react15.useMemo)(
    () => selectedOwnerFilter && !ownerFilterOptions.includes(selectedOwnerFilter) ? [selectedOwnerFilter, ...ownerFilterOptions] : ownerFilterOptions,
    [ownerFilterOptions, selectedOwnerFilter]
  );
  const columnDefs = (0, import_react15.useMemo)(() => buildTableColumnDefs(columns), [columns]);
  const sorting = (0, import_react15.useMemo)(() => sortRuleToSorting(sortRule), [sortRule]);
  const columnFilters = (0, import_react15.useMemo)(
    () => buildColumnFilters(
      statusFilterColumn,
      selectedStatusFilter,
      ownerFilterColumn,
      selectedOwnerFilter
    ),
    [ownerFilterColumn, selectedOwnerFilter, selectedStatusFilter, statusFilterColumn]
  );
  const handleSortingChange = (0, import_react15.useCallback)(
    (updater) => {
      setSortRule((prev) => {
        const base = sortRuleToSorting(prev);
        const next = typeof updater === "function" ? updater(base) : updater;
        const nextRule = sortingToSortRule(next);
        persistPrefs({ sort: nextRule });
        return nextRule;
      });
    },
    [persistPrefs, setSortRule]
  );
  const handleColumnFiltersChange = (0, import_react15.useCallback)(
    (updater) => {
      const base = buildColumnFilters(
        statusFilterColumn,
        selectedStatusFilter,
        ownerFilterColumn,
        selectedOwnerFilter
      );
      const next = typeof updater === "function" ? updater(base) : updater;
      const byId = new Map(
        next.map((filter) => [filter.id, String(filter.value ?? "")])
      );
      setSelectedStatusFilter(byId.get(statusFilterColumn?.id ?? "") ?? "");
      setSelectedOwnerFilter(byId.get(ownerFilterColumn?.id ?? "") ?? "");
    },
    [ownerFilterColumn, selectedOwnerFilter, selectedStatusFilter, statusFilterColumn]
  );
  const table = useTable2({
    features: tableFeatures,
    data: rows,
    columns: columnDefs,
    state: { sorting, columnFilters },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    getRowId: (row) => row.dbKey
  });
  const filteredRowModel = table.getFilteredRowModel();
  const filteredRows = (0, import_react15.useMemo)(
    () => filteredRowModel.rows.map((row) => row.original),
    [filteredRowModel]
  );
  const {
    editingCell,
    setEditingCell,
    editingValue,
    setEditingValue,
    saveCurrentEdit,
    finishEdit,
    switchCell,
    handleKeyDown,
    handleStartEdit,
    handleEditingValueChange
  } = useCellEditing(rows, filteredRows, columns, dispatch);
  const {
    kanbanDisplayMode,
    canUseKanbanView,
    activeViewChoice,
    activeDisplayMode,
    kanbanDetailColumns,
    kanbanGroups,
    kanbanDropTargetGroup,
    setKanbanDropTargetGroup,
    handleKanbanCardDragStart,
    handleKanbanCardDragEnd,
    handleKanbanColumnDragOver,
    handleKanbanColumnDragLeave,
    handleKanbanColumnDrop,
    handleKanbanCardDragOver,
    handleKanbanCardDragLeave,
    handleKanbanCardDrop
  } = useKanbanBoard({
    tableDisplayMode,
    statusFilterColumn,
    statusFilterOptions,
    columns,
    selectedViewChoice,
    filteredRows,
    rows,
    draggingRowKey,
    setDraggingRowKey,
    dropTarget,
    setDropTarget,
    handleRowDrop,
    dispatch
  });
  const sortedAndOrderedRows = (0, import_react15.useMemo)(() => {
    if (activeDisplayMode.type === "kanban") return filteredRows;
    if (sortRule) {
      const sortedModelRows = table.getSortedRowModel().rows.map((r) => r.original);
      return partitionEmptyLast(sortedModelRows, sortRule.columnId);
    }
    return applyManualOrder(filteredRows, manualOrder, (r) => r.dbKey);
  }, [activeDisplayMode, filteredRows, manualOrder, sortRule, table]);
  const editingRowIndex = (0, import_react15.useMemo)(() => {
    if (!editingCell) return -1;
    return sortedAndOrderedRows.findIndex((r) => r.dbKey === editingCell.dbKey);
  }, [editingCell, sortedAndOrderedRows]);
  const {
    insertRowAt,
    handleInsertRowBelow,
    handleInsertRowAbove,
    handleAddRowTop,
    handleAddRowBottom
  } = useRowInsertion({
    tenantId,
    tableId,
    rows,
    sortedAndOrderedRows,
    primaryColumn,
    sortRule,
    manualOrder,
    setManualOrder,
    persistPrefs,
    selectedStatusFilter,
    selectedOwnerFilter,
    setEditingCell,
    setEditingValue,
    dispatch
  });
  const columnsByName = (0, import_react15.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    columns.forEach((column) => {
      map.set(column.name, column);
    });
    return map;
  }, [columns]);
  const shouldWindowGridRows = activeViewChoice === "grid" && sortedAndOrderedRows.length >= GRID_WINDOWING_ROW_THRESHOLD;
  (0, import_react15.useEffect)(() => {
    if (isRenamingTable && tableTitleInputRef.current) {
      tableTitleInputRef.current.focus();
      tableTitleInputRef.current.select();
    }
  }, [isRenamingTable]);
  (0, import_react15.useEffect)(() => {
    if (editingColumnId && editingColumnInputRef.current) {
      editingColumnInputRef.current.focus();
      editingColumnInputRef.current.select();
    }
  }, [editingColumnId]);
  (0, import_react15.useEffect)(() => {
    if (tableMeta && tableMeta.columns) {
      const nextWidths = {};
      tableMeta.columns.forEach((col) => {
        if (typeof col.width === "number" && col.width > 0) {
          nextWidths[col.id] = col.width;
        }
      });
      setColumnWidths(nextWidths);
      columnWidthsRef.current = nextWidths;
    }
  }, [tableMeta]);
  (0, import_react15.useEffect)(() => {
    if (!tableMeta || !tenantId || !tableId) return;
    dispatch(
      setTableFocusContext({
        tableKey: `meta-${tenantId}-${tableId}`,
        tableId,
        tenantId,
        displayName: tableMeta.displayName ?? tableMeta.tableId,
        columns: columns.map((col) => ({
          id: col.id,
          name: col.name,
          label: col.label,
          type: col.type
        })),
        rowCount: rows.length,
        viewChoice: activeViewChoice,
        canUseKanbanView
      })
    );
    return () => {
      dispatch(setTableFocusContext(null));
    };
  }, [
    dispatch,
    tableMeta,
    tenantId,
    tableId,
    columns,
    rows.length,
    activeViewChoice,
    canUseKanbanView
  ]);
  (0, import_react15.useEffect)(() => {
    if (!editingCell) {
      dispatch(setTableFocusContext(null));
      return;
    }
    const rowIndex = filteredRows.findIndex((row2) => row2.dbKey === editingCell.dbKey);
    const colIndex = columns.findIndex((col) => col.name === editingCell.columnName);
    const row = rowIndex >= 0 ? filteredRows[rowIndex] : null;
    const column = colIndex >= 0 ? columns[colIndex] : null;
    const rowTitle = row && primaryColumn && primaryColumn.name in row ? String(row[primaryColumn.name] ?? "") : rowIndex >= 0 ? `\u884C ${rowIndex + 1}` : null;
    const cellPreview = row && column ? String(row[column.name] ?? "").slice(0, 200) : null;
    dispatch(
      setTableFocusContext({
        rowDbKey: editingCell.dbKey,
        columnName: editingCell.columnName,
        rowIndex: rowIndex >= 0 ? rowIndex : null,
        colIndex: colIndex >= 0 ? colIndex : null,
        rowTitle,
        cellPreview,
        isEditing: true
      })
    );
  }, [columns, dispatch, editingCell, filteredRows, primaryColumn]);
  (0, import_react15.useEffect)(() => {
    if (!tableMeta || !selectedStatusFilter) return;
    if (!statusFilterColumn) {
      setSelectedStatusFilter("");
    }
  }, [selectedStatusFilter, statusFilterColumn, tableMeta]);
  (0, import_react15.useEffect)(() => {
    if (!tableMeta || !selectedOwnerFilter) return;
    if (!ownerFilterColumn) {
      setSelectedOwnerFilter("");
    }
  }, [ownerFilterColumn, selectedOwnerFilter, tableMeta]);
  (0, import_react15.useEffect)(() => {
    if (!tableMeta) return;
    if (selectedViewChoice === "kanban" && !canUseKanbanView) {
      setSelectedViewChoice("grid");
    }
  }, [canUseKanbanView, selectedViewChoice, tableMeta]);
  (0, import_react15.useEffect)(() => {
    if (!tableMeta || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const setOrDelete = (name, value) => {
      if (value) {
        url.searchParams.set(name, value);
      } else {
        url.searchParams.delete(name);
      }
    };
    setOrDelete("status", selectedStatusFilter);
    setOrDelete("owner", selectedOwnerFilter);
    setOrDelete("view", activeViewChoice);
    window.history.replaceState(window.history.state, "", url);
  }, [activeViewChoice, selectedOwnerFilter, selectedStatusFilter, tableMeta]);
  const handleOpenSelectEditor = (0, import_react15.useCallback)(
    (dbKey, columnName, anchor) => {
      setSelectEditor({ dbKey, columnName, anchor });
    },
    []
  );
  const handleCloseSelectEditor = (0, import_react15.useCallback)(() => {
    setSelectEditor(null);
  }, []);
  const [rowContextMenu, setRowContextMenu] = (0, import_react15.useState)(null);
  const handleRowContextMenu = (0, import_react15.useCallback)(
    (dbKey, x, y) => {
      setRowContextMenu({ dbKey, x, y });
    },
    []
  );
  const closeRowContextMenu = (0, import_react15.useCallback)(() => {
    setRowContextMenu(null);
  }, []);
  const handleAddColumn = (0, import_react15.useCallback)(() => {
    if (!tenantId || !tableId) return;
    const name = newColumnName.trim();
    if (!name) return;
    void dispatch(addColumn({ tenantId, tableId, columnName: name }));
    setNewColumnName("");
  }, [dispatch, tenantId, tableId, newColumnName]);
  const handleDeleteRow = (0, import_react15.useCallback)(
    (dbKey) => {
      if (!dbKey) return;
      void dispatch(deleteRow(dbKey));
    },
    [dispatch]
  );
  const handleDeleteColumn = (0, import_react15.useCallback)(
    (columnName) => {
      if (!tenantId || !tableId) return;
      if (!window.confirm(
        `\u786E\u5B9A\u5220\u9664\u5B57\u6BB5 "${columnName}" \u5417\uFF1F\u8BE5\u5B57\u6BB5\u5728\u6240\u6709\u884C\u4E2D\u7684\u6570\u636E\u90FD\u4F1A\u88AB\u5220\u9664\u3002`
      )) {
        return;
      }
      void dispatch(deleteColumn({ tenantId, tableId, columnName }));
    },
    [dispatch, tenantId, tableId]
  );
  const handleMoveColumn = (0, import_react15.useCallback)(
    (fromIndex, toIndex) => {
      if (!tenantId || !tableId) return;
      void dispatch(reorderColumn({ tenantId, tableId, fromIndex, toIndex }));
    },
    [dispatch, tenantId, tableId]
  );
  const handleRenameColumnConfirm = (0, import_react15.useCallback)(
    (columnName, newLabel) => {
      if (!tenantId || !tableId) return;
      void dispatch(
        renameColumnLabel({
          tenantId,
          tableId,
          columnName,
          label: newLabel
        })
      );
      setEditingColumnId(null);
    },
    [dispatch, tenantId, tableId]
  );
  const handleUpdateTitle = (0, import_react15.useCallback)(
    (title) => {
      if (!tenantId || !tableId) return;
      const finalTitle = title.trim() || tableId;
      void dispatch(
        renameTable({
          tenantId,
          tableId,
          displayName: finalTitle
        })
      );
      setIsRenamingTable(false);
      if (currentSpaceId) {
        void dispatch(
          updateContentTitle({
            spaceId: currentSpaceId,
            contentKey: `meta-${tenantId}-${tableId}`,
            title: finalTitle
          })
        );
      }
    },
    [dispatch, tenantId, tableId, currentSpaceId]
  );
  const handleUpdateIcon = (0, import_react15.useCallback)(
    (nextIcon) => {
      if (!tenantId || !tableId) return;
      void dispatch(updateTableIcon({ tenantId, tableId, icon: nextIcon }));
    },
    [dispatch, tableId, tenantId]
  );
  const handleOpenLongText = (0, import_react15.useCallback)((payload) => {
    setLongTextPayload(payload);
  }, []);
  const selectEditorColumn = selectEditor ? columnsByName.get(selectEditor.columnName) ?? null : null;
  const selectEditorOptions = (0, import_react15.useMemo)(
    () => selectEditorColumn ? resolveSelectOptions(selectEditorColumn, rows) : [],
    [selectEditorColumn, rows]
  );
  const selectEditorRow = selectEditor ? rows.find((r) => r.dbKey === selectEditor.dbKey) : null;
  const selectEditorValue = selectEditor && selectEditorRow ? String(selectEditorRow[selectEditor.columnName] ?? "") : "";
  const gridColSpan = columns.length + 1;
  if (!valid) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(NoMatch_default, { message: `\u65E0\u6CD5\u8BC6\u522B\u7684\u8868 key: ${tableKey}` });
  }
  if (isLoading && !tableMeta && !error) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "table-page__center-state", style: { height: "50vh" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(LuLoaderCircle, { className: "spin", size: 24, color: "var(--primary)", "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: "\u6B63\u5728\u52A0\u8F7D\u6570\u636E\u8868..." })
    ] });
  }
  if (!tableMeta) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "table-page__center-state table-page__center-state--error", style: { height: "50vh" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(LuCircleAlert, { size: 24, color: "var(--error)", "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: error || `\u8868\u4E0D\u5B58\u5728\u6216\u52A0\u8F7D\u5931\u8D25: ${tableKey}` }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Button_default, { variant: "secondary", size: "small", onClick: () => window.location.reload(), children: "\u91CD\u8BD5" })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "table-page", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        TablePageHeader,
        {
          tableMeta,
          isRenamingTable,
          setIsRenamingTable,
          tableTitleInput,
          setTableTitleInput,
          tableTitleInputRef,
          isIconPickerOpen,
          setIsIconPickerOpen,
          newColumnName,
          setNewColumnName,
          handleAddRowTop,
          handleAddColumn,
          handleUpdateTitle,
          handleUpdateIcon
        }
      ),
      error && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "table-page__error", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(LuCircleAlert, { size: 16, "aria-hidden": "true" }),
        error
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        TableViewControls,
        {
          statusFilterColumn,
          selectedStatusFilter,
          setSelectedStatusFilter,
          statusSelectOptions,
          ownerFilterColumn,
          selectedOwnerFilter,
          setSelectedOwnerFilter,
          ownerSelectOptions,
          activeViewChoice,
          setSelectedViewChoice,
          canUseKanbanView,
          filteredCount: filteredRows.length,
          totalCount: rows.length
        }
      ),
      activeViewChoice === "grid" ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        TableGridSection,
        {
          gridScrollRef,
          columns,
          primaryColumnName: primaryColumn?.name,
          columnWidths,
          gridColSpan,
          sortRule,
          handleSortClick,
          editingColumnId,
          setEditingColumnId,
          editingColumnText,
          setEditingColumnText,
          editingColumnInputRef,
          handleRenameColumnConfirm,
          handleDeleteColumn,
          handleMoveColumn,
          sortedAndOrderedRows,
          filteredRows,
          editingRowIndex,
          editingCell,
          editingValue,
          draggingRowKey,
          dropTarget,
          currentSpaceId,
          TableActivityBadge,
          shouldWindowGridRows,
          handleAddRowBottom,
          handleStartEdit,
          handleEditingValueChange,
          finishEdit,
          handleKeyDown,
          handleInsertRowBelow,
          handleRowContextMenu,
          handleOpenSelectEditor,
          handleOpenLongText,
          handleRowDragStart,
          handleRowDragEnd,
          handleRowDragOver,
          handleRowDragLeave,
          handleRowDropOnKey,
          handleResizerPointerDown,
          resizingColumnId,
          resizingRef
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        KanbanBoard,
        {
          tableId: tableMeta?.tableId,
          kanbanGroups,
          kanbanDetailColumns,
          kanbanDropTargetGroup,
          draggingRowKey,
          dropTarget,
          handleKanbanColumnDragOver,
          handleKanbanColumnDragLeave,
          handleKanbanColumnDrop,
          handleKanbanCardDragStart,
          handleKanbanCardDragEnd,
          handleKanbanCardDragOver,
          handleKanbanCardDragLeave,
          handleKanbanCardDrop,
          handleDeleteRow,
          handleStartEdit,
          handleOpenLongText,
          currentSpaceId,
          TableActivityBadge,
          primaryColumn
        }
      )
    ] }),
    selectEditor && selectEditorColumn && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      SelectCellEditor_default,
      {
        anchor: selectEditor.anchor,
        options: selectEditorOptions,
        currentValue: selectEditorValue,
        onClose: handleCloseSelectEditor,
        onSelect: (value) => {
          const { dbKey, columnName } = selectEditor;
          if (value !== selectEditorValue) {
            void dispatch(updateCell({ dbKey, columnName, value }));
          }
          setSelectEditor(null);
        },
        onCreateOption: (value) => {
          const { dbKey, columnName } = selectEditor;
          if (tenantId && tableId) {
            void dispatch(
              addColumnOption({
                tenantId,
                tableId,
                columnId: selectEditorColumn.id,
                option: value
              })
            );
          }
          if (value !== selectEditorValue) {
            void dispatch(updateCell({ dbKey, columnName, value }));
          }
          setSelectEditor(null);
        }
      }
    ),
    rowContextMenu && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      RowContextMenu_default,
      {
        x: rowContextMenu.x,
        y: rowContextMenu.y,
        onInsertAbove: () => {
          closeRowContextMenu();
          handleInsertRowAbove(rowContextMenu.dbKey);
        },
        onInsertBelow: () => {
          closeRowContextMenu();
          handleInsertRowBelow(rowContextMenu.dbKey);
        },
        onDelete: () => {
          closeRowContextMenu();
          handleDeleteRow(rowContextMenu.dbKey);
        },
        onClose: closeRowContextMenu
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      LongTextDialog_default,
      {
        payload: longTextPayload,
        onClose: () => setLongTextPayload(null),
        onSave: ({ dbKey, columnName, value }) => {
          const row = rows.find((r) => r.dbKey === dbKey);
          const oldValue = row ? String(row[columnName] ?? "") : "";
          if (value === oldValue) {
            return;
          }
          void dispatch(
            updateCell({
              dbKey,
              columnName,
              value
            })
          );
        }
      }
    )
  ] });
};
var TablePage_default = TablePage;
export {
  TablePage_default as default
};
