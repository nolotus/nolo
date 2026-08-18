import {
  clipboard_default
} from "/public/assets/chunks/chunk-AOBBTRZH.js";
import {
  useTheme
} from "/public/assets/chunks/chunk-LVVUA2RZ.js";
import {
  Tooltip
} from "/public/assets/chunks/chunk-WZN2TP6C.js";
import {
  preloadArtifactRuntimeResources
} from "/public/assets/chunks/chunk-7O25WKJ7.js";
import "/public/assets/chunks/chunk-VPAVB2J5.js";
import {
  BaseModal
} from "/public/assets/chunks/chunk-XTMQULJ5.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuCode,
  LuCopy,
  LuEye,
  LuMaximize2
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
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
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/elements/CodeBlock.tsx
var import_react4 = __toESM(require_react(), 1);

// packages/render/web/elements/JsonBlock.tsx
var import_react2 = __toESM(require_react(), 1);

// node_modules/react-json-view-lite/dist/index.modern.js
var import_react = __toESM(require_react());
var isBoolean = (data) => {
  return typeof data === "boolean" || data instanceof Boolean;
};
var isNumber = (data) => {
  return typeof data === "number" || data instanceof Number;
};
var isBigInt = (data) => {
  return typeof data === "bigint" || data instanceof BigInt;
};
var isDate = (data) => {
  return !!data && data instanceof Date;
};
var isString = (data) => {
  return typeof data === "string" || data instanceof String;
};
var isArray = (data) => {
  return Array.isArray(data);
};
var isObject = (data) => {
  return typeof data === "object" && data !== null;
};
var isFunction = (data) => {
  return !!data && data instanceof Object && typeof data === "function";
};
function quoteString(value, quoted) {
  if (quoted === void 0) {
    quoted = false;
  }
  return !value || quoted ? `"${value}"` : value;
}
function quoteStringValue(value, quoted, stringify) {
  if (stringify) {
    return JSON.stringify(value);
  }
  return quoted ? `"${value}"` : value;
}
function ExpandableObject(_ref) {
  let {
    field,
    value,
    data,
    lastElement,
    openBracket,
    closeBracket,
    level,
    style,
    shouldExpandNode,
    clickToExpandNode,
    outerRef,
    beforeExpandChange
  } = _ref;
  const shouldExpandNodeCalledRef = (0, import_react.useRef)(false);
  const [expanded, setExpanded] = (0, import_react.useState)(() => shouldExpandNode(level, value, field));
  const expanderButtonRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (!shouldExpandNodeCalledRef.current) {
      shouldExpandNodeCalledRef.current = true;
    } else {
      setExpanded(shouldExpandNode(level, value, field));
    }
  }, [shouldExpandNode]);
  const contentsId = (0, import_react.useId)();
  if (data.length === 0) {
    return EmptyObject({
      field,
      openBracket,
      closeBracket,
      lastElement,
      style
    });
  }
  const expanderIconStyle = expanded ? style.collapseIcon : style.expandIcon;
  const ariaLabel = expanded ? style.ariaLables.collapseJson : style.ariaLables.expandJson;
  const childLevel = level + 1;
  const lastIndex = data.length - 1;
  const setExpandWithCallback = (newExpandValue) => {
    if (expanded !== newExpandValue && (!beforeExpandChange || beforeExpandChange({
      level,
      value,
      field,
      newExpandValue
    }))) {
      setExpanded(newExpandValue);
    }
  };
  const onKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setExpandWithCallback(e.key === "ArrowRight");
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const direction = e.key === "ArrowUp" ? -1 : 1;
      if (!outerRef.current) return;
      const buttonElements = outerRef.current.querySelectorAll("[role=button]");
      let currentIndex = -1;
      for (let i = 0; i < buttonElements.length; i++) {
        if (buttonElements[i].tabIndex === 0) {
          currentIndex = i;
          break;
        }
      }
      if (currentIndex < 0) {
        return;
      }
      const nextIndex = (currentIndex + direction + buttonElements.length) % buttonElements.length;
      buttonElements[currentIndex].tabIndex = -1;
      buttonElements[nextIndex].tabIndex = 0;
      buttonElements[nextIndex].focus();
    }
  };
  const onClick = () => {
    var _outerRef$current;
    setExpandWithCallback(!expanded);
    const buttonElement = expanderButtonRef.current;
    if (!buttonElement) return;
    const prevButtonElement = (_outerRef$current = outerRef.current) === null || _outerRef$current === void 0 ? void 0 : _outerRef$current.querySelector('[role=button][tabindex="0"]');
    if (prevButtonElement) {
      prevButtonElement.tabIndex = -1;
    }
    buttonElement.tabIndex = 0;
    buttonElement.focus();
  };
  return /* @__PURE__ */ (0, import_react.createElement)("div", {
    className: style.basicChildStyle,
    role: "treeitem",
    "aria-expanded": expanded,
    "aria-selected": void 0
  }, /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: expanderIconStyle,
    onClick,
    onKeyDown,
    role: "button",
    "aria-label": ariaLabel,
    "aria-expanded": expanded,
    "aria-controls": expanded ? contentsId : void 0,
    ref: expanderButtonRef,
    tabIndex: level === 0 ? 0 : -1
  }), (field || field === "") && (clickToExpandNode ? /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.clickableLabel,
    onClick,
    onKeyDown
  }, quoteString(field, style.quotesForFieldNames), ":") : /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.label
  }, quoteString(field, style.quotesForFieldNames), ":")), /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.punctuation
  }, openBracket), expanded ? /* @__PURE__ */ (0, import_react.createElement)("ul", {
    id: contentsId,
    role: "group",
    className: style.childFieldsContainer
  }, data.map((dataElement, index) => /* @__PURE__ */ (0, import_react.createElement)(DataRender, {
    key: dataElement[0] || index,
    field: dataElement[0],
    value: dataElement[1],
    style,
    lastElement: index === lastIndex,
    level: childLevel,
    shouldExpandNode,
    clickToExpandNode,
    outerRef
  }))) : /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.collapsedContent,
    onClick,
    onKeyDown
  }), /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.punctuation
  }, closeBracket), !lastElement && /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.punctuation
  }, ","));
}
function EmptyObject(_ref2) {
  let {
    field,
    openBracket,
    closeBracket,
    lastElement,
    style
  } = _ref2;
  return /* @__PURE__ */ (0, import_react.createElement)("div", {
    className: style.basicChildStyle,
    role: "treeitem",
    "aria-selected": void 0
  }, (field || field === "") && /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.label
  }, quoteString(field, style.quotesForFieldNames), ":"), /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.punctuation
  }, openBracket), /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.punctuation
  }, closeBracket), !lastElement && /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.punctuation
  }, ","));
}
function JsonObject(_ref3) {
  let {
    field,
    value,
    style,
    lastElement,
    shouldExpandNode,
    clickToExpandNode,
    level,
    outerRef,
    beforeExpandChange
  } = _ref3;
  return ExpandableObject({
    field,
    value,
    lastElement: lastElement || false,
    level,
    openBracket: "{",
    closeBracket: "}",
    style,
    shouldExpandNode,
    clickToExpandNode,
    data: Object.keys(value).map((key) => [key, value[key]]),
    outerRef,
    beforeExpandChange
  });
}
function JsonArray(_ref4) {
  let {
    field,
    value,
    style,
    lastElement,
    level,
    shouldExpandNode,
    clickToExpandNode,
    outerRef,
    beforeExpandChange
  } = _ref4;
  return ExpandableObject({
    field,
    value,
    lastElement: lastElement || false,
    level,
    openBracket: "[",
    closeBracket: "]",
    style,
    shouldExpandNode,
    clickToExpandNode,
    data: value.map((element) => [void 0, element]),
    outerRef,
    beforeExpandChange
  });
}
function JsonPrimitiveValue(_ref5) {
  let {
    field,
    value,
    style,
    lastElement
  } = _ref5;
  let stringValue;
  let valueStyle = style.otherValue;
  if (value === null) {
    stringValue = "null";
    valueStyle = style.nullValue;
  } else if (value === void 0) {
    stringValue = "undefined";
    valueStyle = style.undefinedValue;
  } else if (isString(value)) {
    stringValue = quoteStringValue(value, !style.noQuotesForStringValues, style.stringifyStringValues);
    valueStyle = style.stringValue;
  } else if (isBoolean(value)) {
    stringValue = value ? "true" : "false";
    valueStyle = style.booleanValue;
  } else if (isNumber(value)) {
    stringValue = value.toString();
    valueStyle = style.numberValue;
  } else if (isBigInt(value)) {
    stringValue = `${value.toString()}n`;
    valueStyle = style.numberValue;
  } else if (isDate(value)) {
    stringValue = value.toISOString();
  } else if (isFunction(value)) {
    stringValue = "function() { }";
  } else {
    stringValue = value.toString();
  }
  return /* @__PURE__ */ (0, import_react.createElement)("div", {
    className: style.basicChildStyle,
    role: "treeitem",
    "aria-selected": void 0
  }, (field || field === "") && /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.label
  }, quoteString(field, style.quotesForFieldNames), ":"), /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: valueStyle
  }, stringValue), !lastElement && /* @__PURE__ */ (0, import_react.createElement)("span", {
    className: style.punctuation
  }, ","));
}
function DataRender(props) {
  const value = props.value;
  if (isArray(value)) {
    return /* @__PURE__ */ (0, import_react.createElement)(JsonArray, Object.assign({}, props));
  }
  if (isObject(value) && !isDate(value) && !isFunction(value)) {
    return /* @__PURE__ */ (0, import_react.createElement)(JsonObject, Object.assign({}, props));
  }
  return /* @__PURE__ */ (0, import_react.createElement)(JsonPrimitiveValue, Object.assign({}, props));
}
var styles = { "container-base": "_GzYRV", "punctuation-base": "_3eOF8", "pointer": "_1MFti", "expander-base": "_f10Tu _1MFti", "expand-icon": "_1UmXx", "collapse-icon": "_1LId0", "collapsed-content-base": "_1pNG9 _1MFti", "container-light": "_2IvMF _GzYRV", "basic-element-style": "_2bkNM", "child-fields-container": "_1BXBN", "label-light": "_1MGIk", "clickable-label-light": "_2YKJg _1MGIk _1MFti", "punctuation-light": "_3uHL6 _3eOF8", "value-null-light": "_2T6PJ", "value-undefined-light": "_1Gho6", "value-string-light": "_vGjyY", "value-number-light": "_1bQdo", "value-boolean-light": "_3zQKs", "value-other-light": "_1xvuR", "collapse-icon-light": "_oLqym _f10Tu _1MFti _1LId0", "expand-icon-light": "_2AXVT _f10Tu _1MFti _1UmXx", "collapsed-content-light": "_2KJWg _1pNG9 _1MFti", "container-dark": "_11RoI _GzYRV", "expand-icon-dark": "_17H2C _f10Tu _1MFti _1UmXx", "collapse-icon-dark": "_3QHg2 _f10Tu _1MFti _1LId0", "collapsed-content-dark": "_3fDAz _1pNG9 _1MFti", "label-dark": "_2bSDX", "clickable-label-dark": "_1RQEj _2bSDX _1MFti", "punctuation-dark": "_gsbQL _3eOF8", "value-null-dark": "_LaAZe", "value-undefined-dark": "_GTKgm", "value-string-dark": "_Chy1W", "value-number-dark": "_2bveF", "value-boolean-dark": "_2vRm-", "value-other-dark": "_1prJR" };
var defaultAriaLables = {
  collapseJson: "collapse JSON",
  expandJson: "expand JSON"
};
var defaultStyles = {
  container: styles["container-light"],
  basicChildStyle: styles["basic-element-style"],
  childFieldsContainer: styles["child-fields-container"],
  label: styles["label-light"],
  clickableLabel: styles["clickable-label-light"],
  nullValue: styles["value-null-light"],
  undefinedValue: styles["value-undefined-light"],
  stringValue: styles["value-string-light"],
  booleanValue: styles["value-boolean-light"],
  numberValue: styles["value-number-light"],
  otherValue: styles["value-other-light"],
  punctuation: styles["punctuation-light"],
  collapseIcon: styles["collapse-icon-light"],
  expandIcon: styles["expand-icon-light"],
  collapsedContent: styles["collapsed-content-light"],
  noQuotesForStringValues: false,
  quotesForFieldNames: false,
  ariaLables: defaultAriaLables,
  stringifyStringValues: false
};
var darkStyles = {
  container: styles["container-dark"],
  basicChildStyle: styles["basic-element-style"],
  childFieldsContainer: styles["child-fields-container"],
  label: styles["label-dark"],
  clickableLabel: styles["clickable-label-dark"],
  nullValue: styles["value-null-dark"],
  undefinedValue: styles["value-undefined-dark"],
  stringValue: styles["value-string-dark"],
  booleanValue: styles["value-boolean-dark"],
  numberValue: styles["value-number-dark"],
  otherValue: styles["value-other-dark"],
  punctuation: styles["punctuation-dark"],
  collapseIcon: styles["collapse-icon-dark"],
  expandIcon: styles["expand-icon-dark"],
  collapsedContent: styles["collapsed-content-dark"],
  noQuotesForStringValues: false,
  quotesForFieldNames: false,
  ariaLables: defaultAriaLables,
  stringifyStringValues: false
};
var allExpanded = () => true;
var JsonView = (_ref) => {
  let {
    data,
    style = defaultStyles,
    shouldExpandNode = allExpanded,
    clickToExpandNode = false,
    beforeExpandChange,
    ...ariaAttrs
  } = _ref;
  const outerRef = (0, import_react.useRef)(null);
  return /* @__PURE__ */ (0, import_react.createElement)("div", Object.assign({
    "aria-label": "JSON view"
  }, ariaAttrs, {
    className: style.container,
    ref: outerRef,
    role: "tree"
  }), /* @__PURE__ */ (0, import_react.createElement)(DataRender, {
    value: data,
    style: {
      ...defaultStyles,
      ...style
    },
    lastElement: true,
    level: 0,
    shouldExpandNode,
    clickToExpandNode,
    outerRef,
    beforeExpandChange
  }));
};

// packages/render/web/elements/JsonBlock.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var JsonBlock = ({
  rawCode,
  showPreview,
  codeBlockPadding,
  className = ""
}) => {
  const theme = useTheme();
  const { jsonData, parseError } = (0, import_react2.useMemo)(() => {
    if (!rawCode || rawCode.trim() === "") {
      return { jsonData: null, parseError: null };
    }
    try {
      const data = JSON.parse(rawCode);
      return { jsonData: data, parseError: null };
    } catch (error) {
      console.error("JSON parse error in JsonBlock:", error);
      return { jsonData: null, parseError: true };
    }
  }, [rawCode]);
  const shouldRenderPreview = showPreview && jsonData !== null && parseError === null;
  const jsonViewStyle = (0, import_react2.useMemo)(() => {
    const ds = defaultStyles;
    const baseTextColor = theme?.text ?? (ds.basicChildStyle?.color || "#000");
    const secondaryTextColor = theme?.textSecondary ?? "#888";
    return {
      ...ds,
      container: { padding: "0", margin: "0", fontFamily: "inherit" },
      basicChildStyle: {
        ...ds.basicChildStyle,
        color: baseTextColor,
        marginLeft: "15px"
      },
      label: {
        ...ds.label,
        color: theme?.colorProperty ?? "#881391",
        fontWeight: "bold"
      },
      valueText: {
        ...ds.valueText,
        color: theme?.colorString ?? "#067d17"
      },
      value: {
        ...ds.value,
        '&[data-type="number"]': { color: theme?.colorNumber ?? "#1750eb" },
        '&[data-type="boolean"]': { color: theme?.colorBoolean ?? "#1750eb" },
        '&[data-type="null"]': { color: theme?.colorNull ?? "#777" },
        '&[data-type="string"]': { color: theme?.colorString ?? "#067d17" },
        '&[data-type="undefined"]': { color: secondaryTextColor }
      }
    };
  }, [theme]);
  if (shouldRenderPreview) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `json-view-wrapper ${className}`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      JsonView,
      {
        data: jsonData,
        shouldExpandNode: allExpanded,
        style: jsonViewStyle
      }
    ) });
  } else {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: `code-content-fallback ${className}`, children: rawCode || "" });
  }
};
var JsonBlock_default = JsonBlock;

// packages/render/web/elements/MermaidContent.tsx
var import_react3 = __toESM(require_react(), 1);

// packages/render/web/elements/mermaidPreview.ts
var parseWithMermaid = async (input) => {
  const { default: mermaid } = await import("/public/assets/chunks/mermaid.core-NEOK4YDD.js");
  return mermaid.parse(input);
};
async function canRenderMermaid(content, parseMermaid = parseWithMermaid) {
  const trimmed = content.trim();
  if (!trimmed) return false;
  try {
    await parseMermaid(trimmed);
    return true;
  } catch {
    return false;
  }
}

// packages/render/web/elements/MermaidContent.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var mermaidInstancePromise = null;
var getMermaid = async () => {
  if (!mermaidInstancePromise) {
    mermaidInstancePromise = import("/public/assets/chunks/mermaid.core-NEOK4YDD.js").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "default"
      });
      return mermaid;
    });
  }
  return mermaidInstancePromise;
};
var MermaidContent = ({
  elementId,
  content,
  showPreview,
  isCollapsed,
  children,
  // 用于显示原始代码
  theme,
  // 传递 theme 对象
  codeBlockPadding,
  // 传递内边距
  onPreviewUnavailable
}) => {
  const [renderError, setRenderError] = (0, import_react3.useState)(null);
  (0, import_react3.useEffect)(() => {
    if (showPreview && !isCollapsed) {
      const mermaidContainer = document.getElementById(`mermaid-${elementId}`);
      if (!mermaidContainer) return;
      let cancelled = false;
      async function renderDiagram() {
        const renderable = await canRenderMermaid(content);
        if (cancelled) return;
        if (!renderable) {
          setRenderError("Mermaid content is incomplete or invalid.");
          onPreviewUnavailable?.();
          return;
        }
        try {
          const mermaid = await getMermaid();
          if (cancelled) return;
          setRenderError(null);
          mermaidContainer.innerHTML = content;
          mermaidContainer.removeAttribute("data-processed");
          await mermaid.run({
            nodes: [mermaidContainer]
          });
        } catch (e) {
          if (cancelled) return;
          console.error("Error rendering Mermaid diagram:", e);
          setRenderError(toErrorMessage(e));
          onPreviewUnavailable?.();
        }
      }
      void renderDiagram();
      return () => {
        cancelled = true;
      };
    }
    setRenderError(null);
  }, [showPreview, isCollapsed, content, elementId, onPreviewUnavailable]);
  const mermaidStyles = `
    .mermaid-container-${elementId} { /* \u4F7F\u7528\u552F\u4E00\u7C7B\u540D\u6216 ID */
      /* \u6837\u5F0F\u5E94\u7528\u5728\u5916\u90E8\u5BB9\u5668\uFF0C\u5185\u90E8 mermaid div \u7531 useEffect \u63A7\u5236 */
    }

    .mermaid { /* \u8FD9\u662F mermaid.run \u751F\u6210\u7684 SVG \u7684\u9ED8\u8BA4\u7C7B\uFF0C\u6216\u8005\u6211\u4EEC\u5305\u88F9\u7684 div */
        display: ${isCollapsed ? "none" : "flex"};
        justify-content: center; /* Center the diagram */
        align-items: center;
        padding: ${codeBlockPadding}; /* Add some padding around the diagram */
        /* \u80CC\u666F\u8272\u5F88\u91CD\u8981\uFF0C\u56E0\u4E3A SVG \u53EF\u80FD\u662F\u900F\u660E\u7684 */
        background: ${theme?.mode === "dark" ? theme.background : "#FFFFFF"};
        border-radius: ${theme?.space?.[1] || "4px"};
        min-height: 100px; /* Ensure some space for rendering */
        line-height: 1; /* \u907F\u514D\u7EE7\u627F\u7236\u7EA7\u7684 line-height \u5BFC\u81F4\u591A\u4F59\u7A7A\u95F4 */
        overflow: auto; /* \u5982\u679C\u56FE\u8868\u8FC7\u5927\uFF0C\u5141\u8BB8\u6EDA\u52A8 */
    }

    .mermaid svg {
      max-width: 100%; /* Ensure diagram scales down */
      height: auto; /* Maintain aspect ratio */
      display: block; /* \u4FEE\u590D\u53EF\u80FD\u7684\u5E95\u90E8\u7A7A\u9699 */
    }

    /* Prism code view styles (when preview is off) */
    .code-content.language-mermaid {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'Fira Code', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: var(--fontSize-base);
      line-height: var(--leading-relaxed);
      color: ${theme?.text || "#1F2937"};
      overflow-x: auto;
      display: ${isCollapsed ? "none" : "block"};
    }
  `;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { children: mermaidStyles }),
    !isCollapsed && showPreview && !renderError ? (
      // Mermaid 图表容器
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "div",
        {
          id: `mermaid-${elementId}`,
          className: `mermaid mermaid-container-${elementId}`,
          "data-processed": "false",
          children: "Loading diagram..."
        }
      )
    ) : (
      // 原始 Mermaid 代码（使用 PrismJS 高亮）
      !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("pre", { className: `code-content language-mermaid`, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { children }) })
    )
  ] });
};
var MermaidContent_default = MermaidContent;

// packages/render/web/elements/CodeBlockToolbar.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
function CodeBlockToolbar({
  language,
  filename,
  showPreview,
  setShowPreview,
  isStreaming,
  isCopied,
  handleCopy,
  isCollapsed,
  setIsCollapsed,
  onFullscreen
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "code-block-actions", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "code-block-meta", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "language-tag", children: language || "text" }),
      filename && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Tooltip, { content: filename, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "filename-tag", children: filename }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "action-buttons", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        Tooltip,
        {
          content: isStreaming ? "\u751F\u6210\u4E2D\uFF0C\u9884\u89C8\u7A0D\u540E\u53EF\u7528" : showPreview ? "\u663E\u793A\u4EE3\u7801" : "\u663E\u793A\u9884\u89C8",
          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              onClick: () => !isStreaming && setShowPreview(!showPreview),
              className: `action-button ${showPreview ? "active" : ""}`,
              disabled: isStreaming,
              "aria-label": isStreaming ? "\u751F\u6210\u4E2D\uFF0C\u9884\u89C8\u7A0D\u540E\u53EF\u7528" : showPreview ? "\u663E\u793A\u4EE3\u7801" : "\u663E\u793A\u9884\u89C8",
              children: showPreview ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuCode, { size: 18, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuEye, { size: 18, "aria-hidden": "true" })
            }
          )
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Tooltip, { content: isCopied ? "\u5DF2\u590D\u5236!" : "\u590D\u5236\u4EE3\u7801", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          onClick: handleCopy,
          className: "action-button",
          "aria-label": isCopied ? "\u5DF2\u590D\u5236!" : "\u590D\u5236\u4EE3\u7801",
          children: isCopied ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuCheck, { size: 18, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuCopy, { size: 18, "aria-hidden": "true" })
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Tooltip, { content: isCollapsed ? "\u5C55\u5F00\u4EE3\u7801" : "\u6298\u53E0\u4EE3\u7801", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          onClick: () => setIsCollapsed(!isCollapsed),
          className: `action-button ${isCollapsed ? "active" : ""}`,
          "aria-label": isCollapsed ? "\u5C55\u5F00\u4EE3\u7801" : "\u6298\u53E0\u4EE3\u7801",
          children: isCollapsed ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuChevronUp, { size: 18, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuChevronDown, { size: 18, "aria-hidden": "true" })
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Tooltip, { content: "\u5168\u5C4F\u9884\u89C8", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          onClick: onFullscreen,
          className: "action-button",
          disabled: isStreaming,
          "aria-label": "\u5168\u5C4F\u9884\u89C8",
          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuMaximize2, { size: 18, "aria-hidden": "true" })
        }
      ) })
    ] })
  ] });
}

// packages/render/web/elements/codeBlockAutoPreview.ts
function canPreviewJson(rawCode) {
  if (!rawCode.trim()) return false;
  try {
    JSON.parse(rawCode);
    return true;
  } catch {
    return false;
  }
}

// packages/render/web/elements/CodeBlock.tsx
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
var IframeArtifactBlock = (0, import_react4.lazy)(() => import("/public/assets/chunks/IframeArtifactBlock-2AVRCMAT.js"));
var CodeBlock = ({
  attributes,
  children,
  element,
  isStreaming = false
}) => {
  const theme = useTheme();
  const [language, filename] = (0, import_react4.useMemo)(() => {
    const lang = element.language || "";
    const idx = lang.indexOf(":");
    return idx > -1 ? [lang.slice(0, idx), lang.slice(idx + 1)] : [lang, null];
  }, [element.language]);
  const content = (0, import_react4.useMemo)(() => {
    const walk = (nodes) => Array.isArray(nodes) ? nodes.map((node) => {
      if (!node) return "";
      if (typeof node.text === "string") return node.text;
      if (node.type === "code-line") return walk(node.children) + "\n";
      if (Array.isArray(node.children)) return walk(node.children);
      return "";
    }).join("") : "";
    try {
      return walk(element.children).replace(/\n$/, "");
    } catch (err) {
      console.error("Extract code error:", err, element.children);
      return "";
    }
  }, [element.children]);
  const isPreviewEnabled = element.preview === "true";
  const isMermaid = language === "mermaid";
  const isReactPreviewArtifact = (language === "jsx" || language === "tsx") && isPreviewEnabled && /function\s+Example\s*\(/.test(content);
  const autoPreviewJson = (0, import_react4.useMemo)(
    () => language === "json" && canPreviewJson(content),
    [language, content]
  );
  const syncAutoPreviewEnabled = isReactPreviewArtifact || isPreviewEnabled || autoPreviewJson;
  (0, import_react4.useInsertionEffect)(() => {
    if (isReactPreviewArtifact) preloadArtifactRuntimeResources();
  }, [isReactPreviewArtifact]);
  const [isCopied, setIsCopied] = (0, import_react4.useState)(false);
  const [showPreview, setShowPreview] = (0, import_react4.useState)(
    isReactPreviewArtifact || !isStreaming && syncAutoPreviewEnabled
  );
  const [isCollapsed, setIsCollapsed] = (0, import_react4.useState)(
    isReactPreviewArtifact ? false : element.collapsed === "true"
  );
  const [isFullscreenOpen, setIsFullscreenOpen] = (0, import_react4.useState)(false);
  (0, import_react4.useEffect)(() => {
    if (isReactPreviewArtifact) {
      setShowPreview(true);
      setIsCollapsed(false);
      return;
    }
    if (!isStreaming && syncAutoPreviewEnabled) {
      setShowPreview(true);
    }
  }, [isStreaming, isReactPreviewArtifact, syncAutoPreviewEnabled]);
  (0, import_react4.useEffect)(() => {
    if (isStreaming || isPreviewEnabled || !isMermaid) return;
    let cancelled = false;
    async function syncMermaidPreview() {
      const renderable = await canRenderMermaid(content);
      if (cancelled) return;
      if (renderable) {
        setShowPreview(true);
      } else {
        setShowPreview(false);
      }
    }
    void syncMermaidPreview();
    return () => {
      cancelled = true;
    };
  }, [isStreaming, isPreviewEnabled, isMermaid, content]);
  const elementId = (0, import_react4.useMemo)(
    () => element.id || `code-${Math.random().toString(36).slice(2, 11)}`,
    [element.id]
  );
  const handleCopy = () => {
    clipboard_default(content, {
      onSuccess: () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2e3);
      },
      onError: (err) => console.error("Failed to copy:", err)
    });
  };
  const handleMermaidPreviewUnavailable = (0, import_react4.useCallback)(() => {
    setShowPreview(false);
  }, []);
  const renderPlaceholder = () => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "preview-content preview-placeholder", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuEye, { size: 18, "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\u7A0B\u5E8F\u751F\u6210\u4E2D\uFF0C\u8BF7\u7A0D\u5019\u2026" })
  ] });
  const renderContent = ({
    previewMode = showPreview,
    collapsed = isCollapsed,
    fullscreen = false
  } = {}) => {
    const wrapperClass = `preview-content${fullscreen ? " preview-content-fullscreen" : ""}`;
    if (previewMode && isStreaming && !isReactPreviewArtifact) {
      return renderPlaceholder();
    }
    if (isMermaid) {
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: wrapperClass, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        MermaidContent_default,
        {
          elementId,
          content,
          showPreview: previewMode,
          isCollapsed: collapsed,
          children,
          theme,
          codeBlockPadding: "var(--space-4)",
          onPreviewUnavailable: handleMermaidPreviewUnavailable
        }
      ) });
    }
    if (language === "json" && previewMode && content && !collapsed) {
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: wrapperClass, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        JsonBlock_default,
        {
          rawCode: content,
          showPreview: previewMode,
          codeBlockPadding: "var(--space-4)"
        }
      ) });
    }
    if (isReactPreviewArtifact && previewMode && !collapsed) {
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: wrapperClass, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react4.Suspense, { fallback: renderPlaceholder(), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        IframeArtifactBlock,
        {
          rawCode: content,
          className: fullscreen ? "fullscreen-live" : void 0,
          fullscreen
        }
      ) }) });
    }
    if (language === "diff" && !collapsed) {
      const diffLines = content.split("\n");
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("pre", { className: "code-content language-diff", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("code", { className: "language-diff", children: diffLines.map((line, i) => {
        let className = "diff-line diff-line-context";
        if (line.startsWith("@@")) className = "diff-line diff-line-hunk";
        else if (line.startsWith("+") && !line.startsWith("+++")) className = "diff-line diff-line-added";
        else if (line.startsWith("-") && !line.startsWith("---")) className = "diff-line diff-line-deleted";
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "diff-line-content", children: line || " " }) }, i);
      }) }) });
    }
    if (!collapsed && !isReactPreviewArtifact) {
      const languageClass = `language-${language || "plaintext"}`;
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("pre", { className: `code-content ${languageClass}`, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("code", { className: languageClass, children }) });
    }
    return null;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { ...attributes, className: "code-block-wrapper", children: isReactPreviewArtifact ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "inline-react-artifact-frame", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "button",
          className: "inline-react-artifact-fullscreen",
          onClick: () => setIsFullscreenOpen(true),
          "aria-label": "\u5168\u5C4F\u67E5\u770B",
          title: "\u5168\u5C4F\u67E5\u770B",
          children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuMaximize2, { size: 16, "aria-hidden": "true" })
        }
      ),
      renderContent({ previewMode: true, collapsed: false })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        CodeBlockToolbar,
        {
          language,
          filename,
          showPreview,
          setShowPreview,
          isStreaming,
          isCopied,
          handleCopy,
          isCollapsed,
          setIsCollapsed,
          onFullscreen: () => setIsFullscreenOpen(true)
        }
      ),
      renderContent()
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      BaseModal,
      {
        isOpen: isFullscreenOpen,
        onClose: () => setIsFullscreenOpen(false),
        className: "code-block-fullscreen-modal",
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "fullscreen-preview-shell", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "fullscreen-preview-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "fullscreen-preview-title", children: language || "Preview" }),
              filename && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "fullscreen-preview-filename", children: filename })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "button",
              {
                type: "button",
                className: "fullscreen-close-button",
                onClick: () => setIsFullscreenOpen(false),
                children: "\u9000\u51FA\u5168\u5C4F"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "fullscreen-preview-body", children: renderContent({ previewMode: true, collapsed: false, fullscreen: true }) })
        ] })
      }
    )
  ] });
};
var CodeBlock_default = CodeBlock;
export {
  CodeBlock_default as default
};
