"use client";
import {
  TITLE
} from "/public/assets/chunks/chunk-FUFOBJKC.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/@lobehub/icons/es/ZeroOne/components/Mono.js
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
      d: "M5.246 12c0 .837-.086 1.554-.257 2.151-.172.598-.45 1.055-.837 1.373-.386.317-.898.476-1.534.476-.901 0-1.563-.353-1.985-1.059C.211 14.235 0 13.255 0 12c0-.837.086-1.554.257-2.151.172-.598.45-1.055.832-1.373C1.472 8.16 1.981 8 2.618 8c.894 0 1.555.351 1.985 1.053.429.702.643 1.685.643 2.947zm-3.883 0c0 .956.09 1.668.273 2.134.183.467.51.7.982.7.465 0 .792-.23.981-.694.19-.463.285-1.176.285-2.14 0-.956-.095-1.668-.285-2.134-.19-.467-.516-.7-.981-.7-.472 0-.8.233-.982.7-.182.466-.273 1.178-.273 2.134zm8.52 3.771H8.517l.011-6.295-1.823.324V8.571l2.04-.457h1.136v7.657zm2.497-1.6h.543c.3 0 .543.256.543.572v.571a.558.558 0 01-.543.572h-.543a.558.558 0 01-.543-.572v-.571c0-.316.243-.572.543-.572zm10.317-6.057H24v7.772h-1.303V8.114zm-3.692 0l2.606 7.772h-1.303l-.69-2.058h-3.073l-.69 2.058h-1.303l2.606-7.772h1.847zm.191 4.457l-1.115-3.323-1.114 3.323h2.23z"
    })]
  }));
});
var Mono_default = Icon;
export {
  Mono_default as default
};
