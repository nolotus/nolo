"use client";
import {
  TITLE
} from "/public/assets/chunks/chunk-2IOG6M4K.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/@lobehub/icons/es/SenseNova/components/Mono.js
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}
var _excluded = ["size", "style"];
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == _typeof(i) ? i : String(i);
}
function _toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};
  var target = _objectWithoutPropertiesLoose(source, excluded);
  var key, i;
  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }
  return target;
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
var Icon = /* @__PURE__ */ (0, import_react.memo)(function(_ref) {
  var _ref$size = _ref.size, size = _ref$size === void 0 ? "1em" : _ref$size, style = _ref.style, rest = _objectWithoutProperties(_ref, _excluded);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", _objectSpread(_objectSpread({
    fill: "currentColor",
    fillRule: "evenodd",
    height: size,
    style: _objectSpread({
      flex: "none",
      lineHeight: 1
    }, style),
    viewBox: "0 0 24 24",
    width: size,
    xmlns: "http://www.w3.org/2000/svg"
  }, rest), {}, {
    children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", {
      children: TITLE
    }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
      d: "M23 8.333h-7.333v7.334H23V8.333z"
    }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
      d: "M1 1v14.667h7.333V8.333h7.334V1H1z",
      fillOpacity: ".33"
    }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
      d: "M14.038 4.333h.17l1.459 1.456v.17l-1.63-1.626zM13.224 4.333h.17l2.273 2.268v.17l-2.443-2.438zM12.41 4.333h.17l3.087 3.08v.17l-3.257-3.25zM11.596 4.333h.17l3.9 3.892v.108h-.06l-4.01-4zM10.782 4.333h.17l4.01 4h-.17l-4.01-4zM9.968 4.333h.17l4.009 4h-.17l-4.01-4zM9.154 4.333h.17l4.009 4h-.17l-4.01-4zM8.34 4.333h.17l4.01 4h-.17l-4.01-4zM7.521 4.333h.17l4.01 4h-.17l-4.01-4zM6.707 4.333h.17l4.01 4h-.17l-4.01-4zM5.892 4.333h.17l4.009 4h-.17l-4.01-4zM5.077 4.333h.17l4.01 4h-.17l-4.01-4zM4.333 4.403v-.07h.1l4.01 4h-.11v.06l-4-3.99zM4.333 5.215v-.17l4 3.991v.17l-4-3.99zM4.333 6.027v-.17l4 3.991v.17l-4-3.99zM4.333 6.84v-.17l4 3.99v.17l-4-3.99zM4.333 7.652v-.17l4 3.99v.17l-4-3.99zM4.333 8.464v-.17l4 3.99v.17l-4-3.99zM4.333 9.276v-.17l4 3.991v.17l-4-3.991zM4.333 10.088v-.17l4 3.991v.17l-4-3.991zM4.333 10.9v-.17l4 3.991v.17l-4-3.991zM4.333 11.712v-.17l4 3.991v.134h-.036l-3.964-3.955zM4.333 12.526v-.17l3.318 3.31h-.17l-3.148-3.14zM4.333 13.34v-.169l2.502 2.496h-.17L4.333 13.34zM4.333 14.152v-.169l1.688 1.684h-.17l-1.518-1.514zM4.333 14.965v-.17l.874.872h-.17l-.704-.702zM15.667 5.146l-.815-.813h.17l.645.644v.169z"
    }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
      d: "M23 15.667h-7.333V23H23v-7.333z",
      fillOpacity: ".33"
    }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
      d: "M15.667 15.667H8.333V23h7.334v-7.333z"
    })]
  }));
});
var Mono_default = Icon;
export {
  Mono_default as default
};
