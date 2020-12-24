/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is not neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./common/Routes.js":
/*!**************************!*\
  !*** ./common/Routes.js ***!
  \**************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _pages_Home__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../pages/Home */ \"./pages/Home.js\");\n/* harmony import */ var _pages_Create__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../pages/Create */ \"./pages/Create.js\");\n/* harmony import */ var _pages_Life__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../pages/Life */ \"./pages/Life.js\");\n/* harmony import */ var _pages_Find__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../pages/Find */ \"./pages/Find.js\");\n/* harmony import */ var _pages_Self__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../pages/Self */ \"./pages/Self/index.js\");\n/* harmony import */ var _pages_Setting__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../pages/Setting */ \"./pages/Setting.js\");\n/* harmony import */ var _pages_Page__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../pages/Page */ \"./pages/Page.js\");\n\n\n\n\n\n\n\nvar Routes = [{\n  exact: true,\n  path: \"/\",\n  component: _pages_Home__WEBPACK_IMPORTED_MODULE_0__.default\n}, {\n  path: \"/create\",\n  component: _pages_Create__WEBPACK_IMPORTED_MODULE_1__.default\n}, {\n  path: \"/life\",\n  component: _pages_Life__WEBPACK_IMPORTED_MODULE_2__.default\n}, {\n  path: \"/find\",\n  component: _pages_Find__WEBPACK_IMPORTED_MODULE_3__.default\n}, {\n  path: \"/self\",\n  component: _pages_Self__WEBPACK_IMPORTED_MODULE_4__.default\n}, {\n  path: \"/setting\",\n  component: _pages_Setting__WEBPACK_IMPORTED_MODULE_5__.Setting\n}, {\n  path: \"/:id\",\n  component: _pages_Page__WEBPACK_IMPORTED_MODULE_6__.Page\n}];\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Routes);\n\n//# sourceURL=webpack://nolo-ssr/./common/Routes.js?");

/***/ }),

/***/ "./common/api.js":
/*!***********************!*\
  !*** ./common/api.js ***!
  \***********************/
/*! namespace exports */
/*! export dbAll [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbGet [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbNew [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbUpdate [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"dbAll\": () => /* binding */ dbAll,\n/* harmony export */   \"dbGet\": () => /* binding */ dbGet,\n/* harmony export */   \"dbNew\": () => /* binding */ dbNew,\n/* harmony export */   \"dbUpdate\": () => /* binding */ dbUpdate\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"@babel/runtime/helpers/defineProperty\");\n/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\");\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2__);\n\n\n\n\nfunction ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }\n\nfunction _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default()(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }\n\nvar dbAll = /*#__PURE__*/function () {\n  var _ref = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().mark(function _callee(db) {\n    var result;\n    return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().wrap(function _callee$(_context) {\n      while (1) {\n        switch (_context.prev = _context.next) {\n          case 0:\n            _context.prev = 0;\n            _context.next = 3;\n            return db.allDocs({\n              include_docs: true\n            });\n\n          case 3:\n            result = _context.sent;\n            return _context.abrupt(\"return\", result);\n\n          case 7:\n            _context.prev = 7;\n            _context.t0 = _context[\"catch\"](0);\n\n          case 9:\n          case \"end\":\n            return _context.stop();\n        }\n      }\n    }, _callee, null, [[0, 7]]);\n  }));\n\n  return function dbAll(_x) {\n    return _ref.apply(this, arguments);\n  };\n}();\nvar dbGet = /*#__PURE__*/function () {\n  var _ref2 = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().mark(function _callee2(db, _id, option) {\n    var doc;\n    return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().wrap(function _callee2$(_context2) {\n      while (1) {\n        switch (_context2.prev = _context2.next) {\n          case 0:\n            _context2.prev = 0;\n            _context2.next = 3;\n            return db.get(_id, option ? option : {\n              attachments: true\n            });\n\n          case 3:\n            doc = _context2.sent;\n            return _context2.abrupt(\"return\", doc);\n\n          case 7:\n            _context2.prev = 7;\n            _context2.t0 = _context2[\"catch\"](0);\n\n          case 9:\n          case \"end\":\n            return _context2.stop();\n        }\n      }\n    }, _callee2, null, [[0, 7]]);\n  }));\n\n  return function dbGet(_x2, _x3, _x4) {\n    return _ref2.apply(this, arguments);\n  };\n}();\nvar dbNew = function dbNew(db, params) {\n  try {\n    var res = db.post(_objectSpread({}, params)); // console.log(res);\n\n    return res;\n  } catch (error) {// console.log(error);\n  }\n};\nvar dbUpdate = /*#__PURE__*/function () {\n  var _ref3 = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().mark(function _callee3(db, params) {\n    var res, response;\n    return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().wrap(function _callee3$(_context3) {\n      while (1) {\n        switch (_context3.prev = _context3.next) {\n          case 0:\n            _context3.next = 2;\n            return dbGet(db, params._id);\n\n          case 2:\n            res = _context3.sent;\n            _context3.prev = 3;\n            _context3.next = 6;\n            return db.put(_objectSpread(_objectSpread({}, params), {}, {\n              _rev: res._rev,\n              _attachments: res._attachments\n            }));\n\n          case 6:\n            response = _context3.sent;\n            return _context3.abrupt(\"return\", response);\n\n          case 10:\n            _context3.prev = 10;\n            _context3.t0 = _context3[\"catch\"](3);\n\n          case 12:\n          case \"end\":\n            return _context3.stop();\n        }\n      }\n    }, _callee3, null, [[3, 10]]);\n  }));\n\n  return function dbUpdate(_x5, _x6) {\n    return _ref3.apply(this, arguments);\n  };\n}();\n\n//# sourceURL=webpack://nolo-ssr/./common/api.js?");

/***/ }),

/***/ "./common/db.js":
/*!**********************!*\
  !*** ./common/db.js ***!
  \**********************/
/*! namespace exports */
/*! export connectDb [provided] [no usage info] [missing usage info prevents renaming] */
/*! export hostDb [provided] [no usage info] [missing usage info prevents renaming] */
/*! export linkDb [provided] [no usage info] [missing usage info prevents renaming] */
/*! export localDb [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"connectDb\": () => /* binding */ connectDb,\n/* harmony export */   \"hostDb\": () => /* binding */ hostDb,\n/* harmony export */   \"localDb\": () => /* binding */ localDb,\n/* harmony export */   \"linkDb\": () => /* binding */ linkDb\n/* harmony export */ });\n/* harmony import */ var pouchdb__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! pouchdb */ \"pouchdb\");\n/* harmony import */ var pouchdb__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(pouchdb__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var pouchdb_authentication__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! pouchdb-authentication */ \"pouchdb-authentication\");\n/* harmony import */ var pouchdb_authentication__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(pouchdb_authentication__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var pouchdb_find__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! pouchdb-find */ \"pouchdb-find\");\n/* harmony import */ var pouchdb_find__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(pouchdb_find__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _common_tools__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../common/tools */ \"./common/tools.js\");\n\n\n\n\nvar dbArray = [\"tw.db.nolotus.com\"]; // if in electron host is undefined ,so need default\n// let hostname = window.location.hostname || defaultDBname;\n// let hostDbName;\n// if (hostname === \"nolotus.com\") {\n//   hostDbName = defaultDBname;\n// } else {\n//   hostDbName =\n//     window.location.hostname === \"localhost\"\n//       ? defaultDBname\n//       : `${hostArray[0]}-${hostArray[1]}`;\n// }\n\nvar hostDbName = \"admin\"; // export const remoteAdress = `https://${dbArray[0]}/${dbName}/`;\n\npouchdb__WEBPACK_IMPORTED_MODULE_0___default().plugin((pouchdb_authentication__WEBPACK_IMPORTED_MODULE_1___default())).plugin((pouchdb_find__WEBPACK_IMPORTED_MODULE_2___default())); //remote dbname is different local dbname\n\nvar connectDb = function connectDb(dbName) {\n  var remoteDbName = \"userdb-\" + (0,_common_tools__WEBPACK_IMPORTED_MODULE_3__.toHex)(dbName);\n  var remoteAdress = \"https://\".concat(dbArray[0], \"/\").concat(remoteDbName, \"/\");\n  var remote = new (pouchdb__WEBPACK_IMPORTED_MODULE_0___default())(remoteAdress);\n  var local = new (pouchdb__WEBPACK_IMPORTED_MODULE_0___default())(dbName);\n  local.sync(remote, {\n    live: true,\n    retry: true\n  }).on('change', function (change) {//  console.log('同步中',change)\n  }).on('complete', function (info) {// console.log('同步完成',info)\n  }).on('paused', function (info) {// console.log('同步暂停',info)\n  }).on('active', function (info) {// console.log('active',info)\n  }).on('error', function (err) {// console.log('sync err',err)\n  });\n  return {\n    remote: remote,\n    local: local\n  };\n}; // export const remoteDb = connectDb(dbName);\n\nvar hostDb = connectDb(hostDbName);\nvar localDb = new (pouchdb__WEBPACK_IMPORTED_MODULE_0___default())(\"localDb\");\nvar linkDb = connectDb('_users'); // PouchDB.sync(dbName, remoteAdress);\n\n//# sourceURL=webpack://nolo-ssr/./common/db.js?");

/***/ }),

/***/ "./common/reducer.js":
/*!***************************!*\
  !*** ./common/reducer.js ***!
  \***************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"@babel/runtime/helpers/defineProperty\");\n/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__);\n\n\nfunction ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }\n\nfunction _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default()(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }\n\nvar initState = {\n  templateName: \"simple\",\n  userInfo: {},\n  menu: [],\n  setting: {},\n  authData: {\n    isLogin: false\n  },\n  userDb: {}\n};\n\nvar reducer = function reducer() {\n  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initState;\n  var action = arguments.length > 1 ? arguments[1] : undefined;\n\n  switch (action.type) {\n    case \"fetch\":\n      return _objectSpread(_objectSpread({}, state), {}, {\n        users: action.payload\n      });\n\n    case \"loginSuccess\":\n      return _objectSpread(_objectSpread({}, state), {}, {\n        authData: {\n          isLogin: true\n        },\n        userInfo: action.payload.userInfo,\n        userDb: action.payload.userDb\n      });\n\n    case \"logout\":\n      return _objectSpread(_objectSpread({}, state), {}, {\n        authData: {\n          isLogin: false\n        },\n        userInfo: {}\n      });\n\n    case \"initSuccess\":\n      return _objectSpread(_objectSpread({}, state), {}, {\n        menu: action.payload.menu,\n        setting: action.payload.setting\n      });\n\n    default:\n      return state;\n  }\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (reducer);\n\n//# sourceURL=webpack://nolo-ssr/./common/reducer.js?");

/***/ }),

/***/ "./common/selector.js":
/*!****************************!*\
  !*** ./common/selector.js ***!
  \****************************/
/*! namespace exports */
/*! export selectUserInfo [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"selectUserInfo\": () => /* binding */ selectUserInfo\n/* harmony export */ });\nvar selectUserInfo = function selectUserInfo(state) {\n  return state.userInfo;\n};\n\n//# sourceURL=webpack://nolo-ssr/./common/selector.js?");

/***/ }),

/***/ "./common/store.js":
/*!*************************!*\
  !*** ./common/store.js ***!
  \*************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var redux__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! redux */ \"redux\");\n/* harmony import */ var redux__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(redux__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _reducer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./reducer */ \"./common/reducer.js\");\n/* harmony import */ var global__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! global */ \"global\");\n/* harmony import */ var global__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(global__WEBPACK_IMPORTED_MODULE_2__);\n\n\n\nvar store = (0,redux__WEBPACK_IMPORTED_MODULE_0__.createStore)(_reducer__WEBPACK_IMPORTED_MODULE_1__.default,\n/* preloadedState, */\n(global__WEBPACK_IMPORTED_MODULE_2___default().__REDUX_DEVTOOLS_EXTENSION__) && global__WEBPACK_IMPORTED_MODULE_2___default().__REDUX_DEVTOOLS_EXTENSION__());\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (store);\n\n//# sourceURL=webpack://nolo-ssr/./common/store.js?");

/***/ }),

/***/ "./common/tools.js":
/*!*************************!*\
  !*** ./common/tools.js ***!
  \*************************/
/*! namespace exports */
/*! export themeMap [provided] [no usage info] [missing usage info prevents renaming] */
/*! export toHex [provided] [no usage info] [missing usage info prevents renaming] */
/*! export useTheme [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"themeMap\": () => /* binding */ themeMap,\n/* harmony export */   \"toHex\": () => /* binding */ toHex,\n/* harmony export */   \"useTheme\": () => /* binding */ useTheme\n/* harmony export */ });\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);\n\nvar themeMap = new Map([[\"dark\", {\n  \"button-color\": \"#FFF\"\n}], [\"light\", {\n  primaryColor: \"#03a9f4\",\n  backgroundColor: \"#fff\",\n  borderRadius: \" 6px\",\n  neutralShade3: \"#d1d3d4\",\n  neutralShade4: '#babdbf'\n}]]);\nvar toHex = function toHex(str) {\n  var result = \"\";\n\n  for (var i = 0; i < str.length; i++) {\n    result += str.charCodeAt(i).toString(16);\n  }\n\n  return result;\n}; // const THEMES = {\n//   dark: () => import(\"../style/dark.js\"),\n//   light: () => import(\"../style/light.js\"),\n// };\n// export const loadThemes = (theme) =>THEMES[theme]()\n\nfunction useTheme(theme) {\n  (0,react__WEBPACK_IMPORTED_MODULE_0__.useLayoutEffect)(function () {\n    // Iterate through each value in theme object\n    for (var key in theme) {\n      // Update css variables in document's root element\n      document.documentElement.style.setProperty(\"--\".concat(key), theme[key]);\n    }\n  }, [theme] // Only call again if theme object reference changes\n  );\n}\n\n//# sourceURL=webpack://nolo-ssr/./common/tools.js?");

/***/ }),

/***/ "./components/ArticleTitle/index.js":
/*!******************************************!*\
  !*** ./components/ArticleTitle/index.js ***!
  \******************************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_2__);\n\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n  display: flex;\\n  margin-top: 5px;\\n  color: #1a1a1a;\\n  a{\\n   color:#1a1a1a;\\n   :hover{\\n    color: #6d6d6d;\\n   }\\n  }\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n // import PropTypes from \"prop-types\";\n\n\nvar Wrap = styled_components__WEBPACK_IMPORTED_MODULE_2___default().div(_templateObject());\n\nvar index = function index(props) {\n  var children = props.children;\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(Wrap, null, children);\n};\n\nindex.propTypes = {};\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (index);\n\n//# sourceURL=webpack://nolo-ssr/./components/ArticleTitle/index.js?");

/***/ }),

/***/ "./components/Article/index.js":
/*!*************************************!*\
  !*** ./components/Article/index.js ***!
  \*************************************/
/*! namespace exports */
/*! export Article [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"Article\": () => /* binding */ Article\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _components_Editor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../components/Editor */ \"./components/Editor/index.js\");\n/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! prop-types */ \"prop-types\");\n/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(prop_types__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_4__);\n\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n  width: 90%;\\n  max-width: 1050px;\\n  margin: 3em auto 0;\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\n\n\n\nvar StyledArticle = styled_components__WEBPACK_IMPORTED_MODULE_4___default().div(_templateObject());\nvar Article = function Article(props) {\n  var doc = props.doc;\n  console.log(\"doc\", doc);\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(StyledArticle, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_components_Editor__WEBPACK_IMPORTED_MODULE_2__.CurrentEditor, {\n    value: doc.content\n  }));\n};\nArticle.propTypes = {\n  doc: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().object)\n};\n\n//# sourceURL=webpack://nolo-ssr/./components/Article/index.js?");

/***/ }),

/***/ "./components/Button/index.js":
/*!************************************!*\
  !*** ./components/Button/index.js ***!
  \************************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\");\n/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! prop-types */ \"prop-types\");\n/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(prop_types__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _Loading__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../Loading */ \"./components/Loading/index.js\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_5__);\n\n\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1___default()([\"\\noutline: none;\\nwidth: 100%;\\ntext-align: center;\\ndisplay: inline-block;\\nborder: none;\\nfont: 500 16px/1 \\\"Poppins\\\", sans-serif;\\npadding: 20px;\\ncursor: pointer;\\nborder-radius: var(--borderRadius);\\nbackground: var(--primaryColor);\\ncolor: var(--backgroundColor);\\nposition: relative;\\ntop: 0;\\ntransition: 0.2s ease;\\n:hover{\\n  top: -3px;\\nbox-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);\\n}\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\n\n\n\nvar WrapButton = styled_components__WEBPACK_IMPORTED_MODULE_5___default().div(_templateObject());\n\nvar Button = function Button(props) {\n  var type = props.type,\n      _props$loading = props.loading,\n      loading = _props$loading === void 0 ? false : _props$loading,\n      children = props.children,\n      preIcon = props.preIcon;\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement((react__WEBPACK_IMPORTED_MODULE_2___default().Fragment), null, function () {\n    switch (type) {\n      default:\n        return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(WrapButton, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({\n          type: \"button\"\n        }, props), preIcon ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement((react__WEBPACK_IMPORTED_MODULE_2___default().Fragment), null, loading ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(_Loading__WEBPACK_IMPORTED_MODULE_4__.Loading, null) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"div\", null, \"icon placeholder\"), children) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement((react__WEBPACK_IMPORTED_MODULE_2___default().Fragment), null, loading ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(_Loading__WEBPACK_IMPORTED_MODULE_4__.Loading, null) : children));\n    }\n  }());\n};\n\nButton.propTypes = {\n  type: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().string),\n  children: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().node),\n  onClick: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().func),\n  loading: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().bool),\n  className: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().string),\n  disable: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().bool),\n  size: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().object),\n  preIcon: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().string)\n};\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Button);\n\n//# sourceURL=webpack://nolo-ssr/./components/Button/index.js?");

/***/ }),

/***/ "./components/Editor/index.js":
/*!************************************!*\
  !*** ./components/Editor/index.js ***!
  \************************************/
/*! namespace exports */
/*! export CurrentEditor [provided] [no usage info] [missing usage info prevents renaming] -> ./components/Editor/neweditor/index.js .default */
/*! export NextEditor [provided] [no usage info] [missing usage info prevents renaming] -> ./components/Editor/myeditor/index.js .default */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"CurrentEditor\": () => /* reexport safe */ _neweditor__WEBPACK_IMPORTED_MODULE_0__.default,\n/* harmony export */   \"NextEditor\": () => /* reexport safe */ _myeditor__WEBPACK_IMPORTED_MODULE_1__.default\n/* harmony export */ });\n/* harmony import */ var _neweditor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./neweditor */ \"./components/Editor/neweditor/index.js\");\n/* harmony import */ var _myeditor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./myeditor */ \"./components/Editor/myeditor/index.js\");\n\n // import OldEditor  from \"./editor\"\n\n\n\n//# sourceURL=webpack://nolo-ssr/./components/Editor/index.js?");

/***/ }),

/***/ "./components/Editor/myeditor/index.js":
/*!*********************************************!*\
  !*** ./components/Editor/myeditor/index.js ***!
  \*********************************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\");\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react-dom */ \"react-dom\");\n/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_2__);\n\n\n // import escapeHtml from 'escape-html'\n\nvar deserialize = function deserialize(el) {\n  console.log(\"el\");\n};\n\nvar Editor = function Editor(props) {\n  var onChange = props.onChange;\n  var editorEl = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);\n\n  if (editorEl.current) {\n    console.log(\"editorEl\", editorEl.onCompositionStart);\n  }\n\n  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(\"\"),\n      _useState2 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_0___default()(_useState, 2),\n      state = _useState2[0],\n      setstate = _useState2[1]; // useEffect(() => {\n  //   effect\n  //   return () => {\n  //     cleanup\n  //   }\n  // }, [state])\n\n\n  var onBeforeInput = function onBeforeInput(e) {\n    e.preventDefault();\n    var html = e.target; // console.log('compositionStart',html)\n    // const deState = deserialize(html);\n    // onChange(\"deState\", deState);\n  };\n\n  var compositionupdate = function compositionupdate(e) {\n    e.preventDefault();\n    var html = e.target;\n    console.log(\"compositionupdate\", html); // const deState = deserialize(html);\n    // onChange(\"deState\", deState);\n  };\n\n  var compositionStart = function compositionStart(e) {\n    e.preventDefault();\n    var html = e.target;\n    console.log(\"compositionStart\", e.data);\n    reallyChange(e.data); // const deState = deserialize(html);\n    // onChange(\"deState\", deState);\n  };\n\n  var compositionEnd = function compositionEnd(e) {\n    e.preventDefault(); // const html = e.target;\n\n    console.log(\"compositionEnd\", e.data);\n    reallyChange(e.data); // const deState = deserialize(html);\n    // onChange(\"deState\", deState);\n  };\n\n  var reallyChange = function reallyChange(data) {\n    console.log(\"reallyChange\", data);\n    (0,react_dom__WEBPACK_IMPORTED_MODULE_2__.unstable_batchedUpdates)(function () {\n      setstate(\" +\".concat(Math.random(), \"\\n\").concat(Math.random()));\n    });\n  }; // const onInput = (e) => {\n  //   e.preventDefault();\n  //   setstate(\"123\");\n  //   const html = e.target;\n  //   const deState = deserialize(html);\n  //   onChange(\"deState\", deState);\n  // };\n\n\n  var onBlur = function onBlur(e) {};\n\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement((react__WEBPACK_IMPORTED_MODULE_1___default().Fragment), null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"div\", {\n    contentEditable: true,\n    onBlur: onBlur,\n    onBeforeInput: onBeforeInput,\n    ref: editorEl,\n    onCompositionUpdate: compositionupdate,\n    onCompositionStart: compositionStart,\n    onCompositionEnd: compositionEnd,\n    dangerouslySetInnerHTML: {\n      __html: state\n    }\n  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"button\", {\n    onClick: function onClick() {\n      setstate(\"\".concat(Math.random(), \"\\n\").concat(Math.random()));\n    }\n  }, \"Click me to change contnet\"));\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Editor);\n\n//# sourceURL=webpack://nolo-ssr/./components/Editor/myeditor/index.js?");

/***/ }),

/***/ "./components/Editor/neweditor/Element.js":
/*!************************************************!*\
  !*** ./components/Editor/neweditor/Element.js ***!
  \************************************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\");\n/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var slate_react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! slate-react */ \"slate-react\");\n/* harmony import */ var slate_react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(slate_react__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var emotion__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! emotion */ \"emotion\");\n/* harmony import */ var emotion__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(emotion__WEBPACK_IMPORTED_MODULE_4__);\n\n\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1___default()([\"\\n          display: block;\\n          max-width: 100%;\\n          max-height: 20em;\\n          box-shadow: \", \";\\n        \"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\n\n\n\nvar ImageElement = function ImageElement(_ref) {\n  var attributes = _ref.attributes,\n      children = _ref.children,\n      element = _ref.element;\n  var selected = (0,slate_react__WEBPACK_IMPORTED_MODULE_3__.useSelected)();\n  var focused = (0,slate_react__WEBPACK_IMPORTED_MODULE_3__.useFocused)();\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"div\", attributes, children, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"img\", {\n    src: element.url,\n    className: (0,emotion__WEBPACK_IMPORTED_MODULE_4__.css)(_templateObject(), selected && focused ? \"0 0 0 2px blue;\" : \"none\")\n  }));\n};\n\nvar Element = function Element(props) {\n  var attributes = props.attributes,\n      children = props.children,\n      element = props.element;\n\n  switch (element.type) {\n    default:\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"p\", attributes, children);\n\n    case \"block-quote\":\n    case \"quote\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"blockquote\", attributes, children);\n\n    case \"code\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"pre\", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"code\", attributes, children));\n\n    case \"bulleted-list\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"ul\", attributes, children);\n\n    case \"title\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"h1\", attributes, children);\n\n    case \"heading-one\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"h1\", attributes, children);\n\n    case \"heading-two\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"h2\", attributes, children);\n\n    case \"heading-three\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"h3\", attributes, children);\n\n    case \"heading-four\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"h4\", attributes, children);\n\n    case \"heading-five\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"h5\", attributes, children);\n\n    case \"heading-six\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"h6\", attributes, children);\n\n    case \"list-item\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"li\", attributes, children);\n\n    case \"numbered-list\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"ol\", attributes, children);\n\n    case \"link\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"a\", _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({\n        href: element.url\n      }, attributes), children);\n\n    case \"image\":\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(ImageElement, props);\n  }\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Element);\n\n//# sourceURL=webpack://nolo-ssr/./components/Editor/neweditor/Element.js?");

/***/ }),

/***/ "./components/Editor/neweditor/constant.js":
/*!*************************************************!*\
  !*** ./components/Editor/neweditor/constant.js ***!
  \*************************************************/
/*! namespace exports */
/*! export initialValue [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"initialValue\": () => /* binding */ initialValue\n/* harmony export */ });\nvar initialValue = [{\n  type: \"paragraph\",\n  children: [{\n    text: \"In addition to nodes that contain editable text, you can also create other types of nodes, like images or videos.\"\n  }]\n}, {\n  type: \"image\",\n  url: \"https://source.unsplash.com/kFrdX5IeQzI\",\n  children: [{\n    text: \"\"\n  }]\n}, {\n  type: \"paragraph\",\n  children: [{\n    text: \"This example shows images in action. It features two ways to add images. You can either add an image via the toolbar icon above, or if you want in on a little secret, copy an image URL to your keyboard and paste it anywhere in the editor!\"\n  }]\n}, {\n  children: [{\n    text: \"This example shows how you can make a hovering menu appear above your content, which you can use to make text \"\n  }, {\n    text: \"bold\",\n    bold: true\n  }, {\n    text: \", \"\n  }, {\n    text: \"italic\",\n    italic: true\n  }, {\n    text: \", or anything else you might want to do!\"\n  }]\n}, {\n  children: [{\n    text: \"Try it out yourself! Just \"\n  }, {\n    text: \"select any piece of text and the menu will appear\",\n    bold: true\n  }, {\n    text: \".\"\n  }]\n}, {\n  type: \"paragraph\",\n  children: [{\n    text: \"This is editable \"\n  }, {\n    text: \"rich\",\n    bold: true\n  }, {\n    text: \" text, \"\n  }, {\n    text: \"much\",\n    italic: true\n  }, {\n    text: \" better than a \"\n  }, {\n    text: \"<textarea>\",\n    code: true\n  }, {\n    text: \"!\"\n  }]\n}, {\n  type: \"paragraph\",\n  children: [{\n    text: \"Since it's rich text, you can do things like turn a selection of text \"\n  }, {\n    text: \"bold\",\n    bold: true\n  }, {\n    text: \", or add a semantically rendered block quote in the middle of the page, like this:\"\n  }]\n}, {\n  type: \"block-quote\",\n  children: [{\n    text: \"A wise quote.\"\n  }]\n}, {\n  type: \"paragraph\",\n  children: [{\n    text: \"Try it out for yourself!\"\n  }]\n}];\n\n//# sourceURL=webpack://nolo-ssr/./components/Editor/neweditor/constant.js?");

/***/ }),

/***/ "./components/Editor/neweditor/index.js":
/*!**********************************************!*\
  !*** ./components/Editor/neweditor/index.js ***!
  \**********************************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! export deserialize [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"deserialize\": () => /* binding */ deserialize,\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\");\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var slate_hyperscript__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! slate-hyperscript */ \"slate-hyperscript\");\n/* harmony import */ var slate_hyperscript__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(slate_hyperscript__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var slate__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! slate */ \"slate\");\n/* harmony import */ var slate__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(slate__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var slate_history__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! slate-history */ \"slate-history\");\n/* harmony import */ var slate_history__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(slate_history__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var slate_react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! slate-react */ \"slate-react\");\n/* harmony import */ var slate_react__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(slate_react__WEBPACK_IMPORTED_MODULE_5__);\n/* harmony import */ var _constant__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./constant */ \"./components/Editor/neweditor/constant.js\");\n/* harmony import */ var _Element__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./Element */ \"./components/Editor/neweditor/Element.js\");\n\n\n\n\n\n\n\n\nvar ELEMENT_TAGS = {\n  A: function A(el) {\n    return {\n      type: \"link\",\n      url: el.getAttribute(\"href\")\n    };\n  },\n  BLOCKQUOTE: function BLOCKQUOTE() {\n    return {\n      type: \"quote\"\n    };\n  },\n  H1: function H1() {\n    return {\n      type: \"heading-one\"\n    };\n  },\n  H2: function H2() {\n    return {\n      type: \"heading-two\"\n    };\n  },\n  H3: function H3() {\n    return {\n      type: \"heading-three\"\n    };\n  },\n  H4: function H4() {\n    return {\n      type: \"heading-four\"\n    };\n  },\n  H5: function H5() {\n    return {\n      type: \"heading-five\"\n    };\n  },\n  H6: function H6() {\n    return {\n      type: \"heading-six\"\n    };\n  },\n  IMG: function IMG(el) {\n    return {\n      type: \"image\",\n      url: el.getAttribute(\"src\")\n    };\n  },\n  LI: function LI() {\n    return {\n      type: \"list-item\"\n    };\n  },\n  OL: function OL() {\n    return {\n      type: \"numbered-list\"\n    };\n  },\n  P: function P() {\n    return {\n      type: \"paragraph\"\n    };\n  },\n  PRE: function PRE() {\n    return {\n      type: \"code\"\n    };\n  },\n  UL: function UL() {\n    return {\n      type: \"bulleted-list\"\n    };\n  }\n}; // COMPAT: `B` is omitted here because Google Docs uses `<b>` in weird ways.\n\nvar TEXT_TAGS = {\n  CODE: function CODE() {\n    return {\n      code: true\n    };\n  },\n  DEL: function DEL() {\n    return {\n      strikethrough: true\n    };\n  },\n  EM: function EM() {\n    return {\n      italic: true\n    };\n  },\n  I: function I() {\n    return {\n      italic: true\n    };\n  },\n  S: function S() {\n    return {\n      strikethrough: true\n    };\n  },\n  STRONG: function STRONG() {\n    return {\n      bold: true\n    };\n  },\n  U: function U() {\n    return {\n      underline: true\n    };\n  }\n};\nvar deserialize = function deserialize(el) {\n  if (el.nodeType === 3) {\n    return el.textContent;\n  } else if (el.nodeType !== 1) {\n    return null;\n  } else if (el.nodeName === \"BR\") {\n    return \"\\n\";\n  }\n\n  var nodeName = el.nodeName;\n  var parent = el;\n\n  if (nodeName === \"PRE\" && el.childNodes[0] && el.childNodes[0].nodeName === \"CODE\") {\n    parent = el.childNodes[0];\n  }\n\n  var children = Array.from(parent.childNodes).map(deserialize).flat();\n\n  if (el.nodeName === \"BODY\") {\n    return (0,slate_hyperscript__WEBPACK_IMPORTED_MODULE_2__.jsx)(\"fragment\", {}, children);\n  }\n\n  if (ELEMENT_TAGS[nodeName]) {\n    var attrs = ELEMENT_TAGS[nodeName](el);\n    return (0,slate_hyperscript__WEBPACK_IMPORTED_MODULE_2__.jsx)(\"element\", attrs, children);\n  }\n\n  if (TEXT_TAGS[nodeName]) {\n    var _attrs = TEXT_TAGS[nodeName](el);\n\n    return children.map(function (child) {\n      return (0,slate_hyperscript__WEBPACK_IMPORTED_MODULE_2__.jsx)(\"text\", _attrs, child);\n    });\n  }\n\n  return children;\n};\nvar SHORTCUTS = {\n  \"*\": \"list-item\",\n  \"-\": \"list-item\",\n  \"+\": \"list-item\",\n  \">\": \"block-quote\",\n  \"#\": \"heading-one\",\n  \"##\": \"heading-two\",\n  \"###\": \"heading-three\",\n  \"####\": \"heading-four\",\n  \"#####\": \"heading-five\",\n  \"######\": \"heading-six\"\n};\n\nvar withShortcuts = function withShortcuts(editor) {\n  var deleteBackward = editor.deleteBackward,\n      insertText = editor.insertText;\n\n  editor.insertText = function (text) {\n    var selection = editor.selection;\n\n    if (text === \" \" && selection && slate__WEBPACK_IMPORTED_MODULE_3__.Range.isCollapsed(selection)) {\n      var anchor = selection.anchor;\n      var block = slate__WEBPACK_IMPORTED_MODULE_3__.Editor.above(editor, {\n        match: function match(n) {\n          return slate__WEBPACK_IMPORTED_MODULE_3__.Editor.isBlock(editor, n);\n        }\n      });\n      var path = block ? block[1] : [];\n      var start = slate__WEBPACK_IMPORTED_MODULE_3__.Editor.start(editor, path);\n      var range = {\n        anchor: anchor,\n        focus: start\n      };\n      var beforeText = slate__WEBPACK_IMPORTED_MODULE_3__.Editor.string(editor, range);\n      var type = SHORTCUTS[beforeText];\n\n      if (type) {\n        slate__WEBPACK_IMPORTED_MODULE_3__.Transforms.select(editor, range);\n        slate__WEBPACK_IMPORTED_MODULE_3__.Transforms.delete(editor);\n        slate__WEBPACK_IMPORTED_MODULE_3__.Transforms.setNodes(editor, {\n          type: type\n        }, {\n          match: function match(n) {\n            return slate__WEBPACK_IMPORTED_MODULE_3__.Editor.isBlock(editor, n);\n          }\n        });\n\n        if (type === \"list-item\") {\n          var list = {\n            type: \"bulleted-list\",\n            children: []\n          };\n          slate__WEBPACK_IMPORTED_MODULE_3__.Transforms.wrapNodes(editor, list, {\n            match: function match(n) {\n              return n.type === \"list-item\";\n            }\n          });\n        }\n\n        return;\n      }\n    }\n\n    insertText(text);\n  };\n\n  editor.deleteBackward = function () {\n    var selection = editor.selection;\n\n    if (selection && slate__WEBPACK_IMPORTED_MODULE_3__.Range.isCollapsed(selection)) {\n      var match = slate__WEBPACK_IMPORTED_MODULE_3__.Editor.above(editor, {\n        match: function match(n) {\n          return slate__WEBPACK_IMPORTED_MODULE_3__.Editor.isBlock(editor, n);\n        }\n      });\n\n      if (match) {\n        var _match = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_0___default()(match, 2),\n            block = _match[0],\n            path = _match[1];\n\n        var start = slate__WEBPACK_IMPORTED_MODULE_3__.Editor.start(editor, path);\n\n        if (block.type !== \"paragraph\" && slate__WEBPACK_IMPORTED_MODULE_3__.Point.equals(selection.anchor, start)) {\n          slate__WEBPACK_IMPORTED_MODULE_3__.Transforms.setNodes(editor, {\n            type: \"paragraph\"\n          });\n\n          if (block.type === \"list-item\") {\n            slate__WEBPACK_IMPORTED_MODULE_3__.Transforms.unwrapNodes(editor, {\n              match: function match(n) {\n                return n.type === \"bulleted-list\";\n              },\n              split: true\n            });\n          }\n\n          return;\n        }\n      }\n\n      deleteBackward.apply(void 0, arguments);\n    }\n  };\n\n  return editor;\n};\n\nvar WrapEditor = function WrapEditor(props) {\n  var onChange = function onChange(value) {\n    console.log(\"value\", value);\n    var headingOneArray = value.filter(function (item) {\n      return item.type === \"heading-one\";\n    }) || [];\n    var title = headingOneArray[0] && headingOneArray[0].children[0].text;\n    var json = {\n      title: title,\n      content: value\n    };\n    props.onChange(json);\n    setValue(value);\n  };\n\n  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(props.value || _constant__WEBPACK_IMPORTED_MODULE_6__.initialValue),\n      _useState2 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_0___default()(_useState, 2),\n      value = _useState2[0],\n      setValue = _useState2[1];\n\n  var renderElement = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(function (props) {\n    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_Element__WEBPACK_IMPORTED_MODULE_7__.default, props);\n  }, []);\n  var renderLeaf = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(function (props) {\n    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(Leaf, props);\n  }, []);\n  var editor = (0,react__WEBPACK_IMPORTED_MODULE_1__.useMemo)(function () {\n    return withHtml(withShortcuts((0,slate_react__WEBPACK_IMPORTED_MODULE_5__.withReact)((0,slate_history__WEBPACK_IMPORTED_MODULE_4__.withHistory)((0,slate__WEBPACK_IMPORTED_MODULE_3__.createEditor)()))));\n  }, []);\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(slate_react__WEBPACK_IMPORTED_MODULE_5__.Slate, {\n    editor: editor,\n    value: value,\n    onChange: onChange\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(slate_react__WEBPACK_IMPORTED_MODULE_5__.Editable, {\n    renderElement: renderElement,\n    renderLeaf: renderLeaf,\n    placeholder: \"Write some markdown...\",\n    spellCheck: true,\n    autoFocus: true\n  }));\n};\n\nvar withHtml = function withHtml(editor) {\n  var insertData = editor.insertData,\n      isInline = editor.isInline,\n      isVoid = editor.isVoid;\n\n  editor.isInline = function (element) {\n    return element.type === \"link\" ? true : isInline(element);\n  };\n\n  editor.isVoid = function (element) {\n    return element.type === \"image\" ? true : isVoid(element);\n  };\n\n  editor.insertData = function (data) {\n    var html = data.getData(\"text/html\");\n\n    if (html) {\n      var parsed = new DOMParser().parseFromString(html, \"text/html\");\n      var fragment = deserialize(parsed.body);\n      slate__WEBPACK_IMPORTED_MODULE_3__.Transforms.insertFragment(editor, fragment);\n      return;\n    }\n\n    insertData(data);\n  };\n\n  return editor;\n};\n\nvar Leaf = function Leaf(_ref) {\n  var attributes = _ref.attributes,\n      children = _ref.children,\n      leaf = _ref.leaf;\n\n  if (leaf.bold) {\n    children = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"strong\", null, children);\n  }\n\n  if (leaf.code) {\n    children = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"code\", null, children);\n  }\n\n  if (leaf.italic) {\n    children = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"em\", null, children);\n  }\n\n  if (leaf.underline) {\n    children = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"u\", null, children);\n  }\n\n  if (leaf.strikethrough) {\n    children = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"del\", null, children);\n  }\n\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"span\", attributes, children);\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (WrapEditor);\n\n//# sourceURL=webpack://nolo-ssr/./components/Editor/neweditor/index.js?");

/***/ }),

/***/ "./components/Error/index.js":
/*!***********************************!*\
  !*** ./components/Error/index.js ***!
  \***********************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_2__);\n\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n  color: red;\\n  margin: 0 auto;\\n  width: 15vw;\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\n\nvar WrapError = styled_components__WEBPACK_IMPORTED_MODULE_2___default().div(_templateObject());\n\nvar index = function index(props) {\n  var children = props.children;\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(WrapError, null, children);\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (index);\n\n//# sourceURL=webpack://nolo-ssr/./components/Error/index.js?");

/***/ }),

/***/ "./components/Header/index.js":
/*!************************************!*\
  !*** ./components/Header/index.js ***!
  \************************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\");\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\");\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! react-router-dom */ \"react-router-dom\");\n/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react_router_dom__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var _common_api__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../common/api */ \"./common/api.js\");\n/* harmony import */ var _common_db__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../common/db */ \"./common/db.js\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react-redux */ \"react-redux\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react_redux__WEBPACK_IMPORTED_MODULE_7__);\n/* harmony import */ var _common_selector__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../common/selector */ \"./common/selector.js\");\n/* harmony import */ var _styled__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./styled */ \"./components/Header/styled.js\");\n\n\n\n\n\n\n\n\n\n\n\nvar Header = function Header() {\n  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)([{\n    title: \"加载中\",\n    path: \"\"\n  }]),\n      _useState2 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default()(_useState, 2),\n      menu = _useState2[0],\n      setmenu = _useState2[1];\n\n  var userInfo = (0,react_redux__WEBPACK_IMPORTED_MODULE_7__.useSelector)(_common_selector__WEBPACK_IMPORTED_MODULE_8__.selectUserInfo);\n  (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(function () {\n    //get menu and setting from hostDb\n    var fetchData = /*#__PURE__*/function () {\n      var _ref = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee() {\n        var menu;\n        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_context) {\n          while (1) {\n            switch (_context.prev = _context.next) {\n              case 0:\n                _context.next = 2;\n                return (0,_common_api__WEBPACK_IMPORTED_MODULE_5__.dbGet)(_common_db__WEBPACK_IMPORTED_MODULE_6__.hostDb.remote, \"menu\");\n\n              case 2:\n                menu = _context.sent;\n                // const setting = await dbGet(hostDb.remote, \"setting\");\n                menu && menu.result && setmenu(menu.result);\n\n              case 4:\n              case \"end\":\n                return _context.stop();\n            }\n          }\n        }, _callee);\n      }));\n\n      return function fetchData() {\n        return _ref.apply(this, arguments);\n      };\n    }();\n\n    fetchData();\n    return function () {};\n  }, []);\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_styled__WEBPACK_IMPORTED_MODULE_9__.WrapHeader, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_styled__WEBPACK_IMPORTED_MODULE_9__.Menu, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_styled__WEBPACK_IMPORTED_MODULE_9__.Logo, {\n    href: \"/\"\n  }, \"Nolotus\"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_styled__WEBPACK_IMPORTED_MODULE_9__.Nav, null, menu.map(function (item, index) {\n    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(react_router_dom__WEBPACK_IMPORTED_MODULE_4__.Link, {\n      key: index,\n      to: \"/\".concat(item.path)\n    }, item.path === \"self\" && userInfo.name ? userInfo.name : item.title);\n  }))));\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Header);\n\n//# sourceURL=webpack://nolo-ssr/./components/Header/index.js?");

/***/ }),

/***/ "./components/Header/styled.js":
/*!*************************************!*\
  !*** ./components/Header/styled.js ***!
  \*************************************/
/*! namespace exports */
/*! export Logo [provided] [no usage info] [missing usage info prevents renaming] */
/*! export Menu [provided] [no usage info] [missing usage info prevents renaming] */
/*! export Nav [provided] [no usage info] [missing usage info prevents renaming] */
/*! export WrapHeader [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"WrapHeader\": () => /* binding */ WrapHeader,\n/* harmony export */   \"Menu\": () => /* binding */ Menu,\n/* harmony export */   \"Nav\": () => /* binding */ Nav,\n/* harmony export */   \"Logo\": () => /* binding */ Logo\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_1__);\n\n\nfunction _templateObject4() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n  color: #ffffff;\\n  display: flex;\\n  align-items: center;\\n  margin-right: 10px;\\n  width: calc(100% / 6);\\n\"]);\n\n  _templateObject4 = function _templateObject4() {\n    return data;\n  };\n\n  return data;\n}\n\nfunction _templateObject3() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n  height: 100%;\\n  display: flex;\\n  a {\\n    display: flex;\\n    transition: color 0.2s ease-out;\\n    align-items: center;\\n    padding-left: 20px;\\n    padding-right: 20px;\\n    font-size: 18px;\\n    color: #ffffff;\\n    font-weight: 300;\\n    :hover {\\n      color: var(--primaryColor);\\n    }\\n  }\\n\"]);\n\n  _templateObject3 = function _templateObject3() {\n    return data;\n  };\n\n  return data;\n}\n\nfunction _templateObject2() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n  display: flex;\\n  height: 60px;\\n  width: 90%;\\n  max-width: 1260px;\\n  margin: auto;\\n\"]);\n\n  _templateObject2 = function _templateObject2() {\n    return data;\n  };\n\n  return data;\n}\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n  background-color: #20232a;\\n    display: flex;\\n    width: 100%;\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\nvar WrapHeader = styled_components__WEBPACK_IMPORTED_MODULE_1___default().header(_templateObject());\nvar Menu = styled_components__WEBPACK_IMPORTED_MODULE_1___default().div(_templateObject2());\nvar Nav = styled_components__WEBPACK_IMPORTED_MODULE_1___default().nav(_templateObject3());\nvar Logo = styled_components__WEBPACK_IMPORTED_MODULE_1___default().a(_templateObject4());\n\n//# sourceURL=webpack://nolo-ssr/./components/Header/styled.js?");

/***/ }),

/***/ "./components/Input/index.js":
/*!***********************************!*\
  !*** ./components/Input/index.js ***!
  \***********************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\");\n/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_1___default()([\"\\n  display: block;\\n  margin: 20px auto;\\n  position: relative;\\n  width: 100%;\\n  max-width: 280px;\\n  * {\\n    box-sizing: border-box;\\n  }\\n  .label {\\n    position: absolute;\\n    top: 1.1rem;\\n    left: 0;\\n    font-size: 1.1rem;\\n    color: var(--neutralShade4);\\n    opacity: 1;\\n    font-weight: 500;\\n    transform-origin: 0 0;\\n    transition: all 0.2s ease;\\n  }\\n  .border {\\n    position: absolute;\\n    bottom: 0;\\n    left: 0;\\n    height: 2px;\\n    width: 100%;\\n    background: var(--primaryColor);\\n    transform: scaleX(0);\\n    transform-origin: 0 0;\\n    transition: all 0.15s ease;\\n  }\\n  input {\\n    -webkit-appearance: none;\\n    width: 100%;\\n    border: 0;\\n    font-family: inherit;\\n    padding: 12px 0;\\n    height: 48px;\\n    font-size: 1.1rem;\\n    font-weight: 500;\\n    border-bottom: 2px solid var(--neutralShade3);\\n\\n    background: none;\\n    border-radius: 0;\\n    color: #223254;\\n    transition: all 0.15s ease;\\n  }\\n  input:hover {\\n    background: rgba(34, 50, 84, 0.03);\\n  }\\n  input:not(:placeholder-shown) + span {\\n    color: #5a667f;\\n    transform: translateY(-28px) scale(1);\\n  }\\n  input:focus {\\n    background: none;\\n    outline: none;\\n  }\\n  \", \"\\n  input:focus + span {\\n    color: var(--primaryColor);\\n    transform: translateY(-28px) scale(0.9);\\n  }\\n  input:focus + span + .border {\\n    transform: scaleX(1);\\n  }\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\n\nvar WrapInput = styled_components__WEBPACK_IMPORTED_MODULE_3___default().label(_templateObject(), \"\"\n/* label color */\n);\n\nvar index = function index(props) {\n  var name = props.name;\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(WrapInput, {\n    htmlFor: name\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"input\", _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({\n    type: \"text\"\n  }, props, {\n    id: name,\n    placeholder: \"\\xA0\"\n  })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"span\", {\n    className: \"label\"\n  }, props.label), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"span\", {\n    className: \"border\"\n  }));\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (index);\n\n//# sourceURL=webpack://nolo-ssr/./components/Input/index.js?");

/***/ }),

/***/ "./components/Loading/index.js":
/*!*************************************!*\
  !*** ./components/Loading/index.js ***!
  \*************************************/
/*! namespace exports */
/*! export Loading [provided] [no usage info] [missing usage info prevents renaming] */
/*! export LoadingBox [provided] [no usage info] [missing usage info prevents renaming] */
/*! export LoadingPage [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"LoadingPage\": () => /* binding */ LoadingPage,\n/* harmony export */   \"LoadingBox\": () => /* binding */ LoadingBox,\n/* harmony export */   \"Loading\": () => /* binding */ Loading\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _fortawesome_react_fontawesome__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @fortawesome/react-fontawesome */ \"@fortawesome/react-fontawesome\");\n/* harmony import */ var _fortawesome_react_fontawesome__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_fortawesome_react_fontawesome__WEBPACK_IMPORTED_MODULE_3__);\n\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n\\n  body {\\n    margin: 0;\\n  }\\n\\n  h1 {\\n    font-family: \\\"Lato\\\", sans-serif;\\n    font-weight: 300;\\n    letter-spacing: 2px;\\n    font-size: 48px;\\n  }\\n  p {\\n    font-family: \\\"Lato\\\", sans-serif;\\n    letter-spacing: 1px;\\n    font-size: 14px;\\n    color: #333333;\\n  }\\n\\n  .header {\\n    position: relative;\\n    text-align: center;\\n    background: linear-gradient(\\n      60deg,\\n      rgba(84, 58, 183, 1) 0%,\\n      rgba(0, 172, 193, 1) 100%\\n    );\\n    color: white;\\n  }\\n  .logo {\\n    width: 50px;\\n    fill: white;\\n    padding-right: 15px;\\n    display: inline-block;\\n    vertical-align: middle;\\n  }\\n\\n  .inner-header {\\n    height: 65vh;\\n    width: 100%;\\n    margin: 0;\\n    padding: 0;\\n  }\\n\\n  .flex {\\n    /*Flexbox for containers*/\\n    display: flex;\\n    justify-content: center;\\n    align-items: center;\\n    text-align: center;\\n  }\\n\\n  .waves {\\n    position: relative;\\n    width: 100%;\\n    height: 15vh;\\n    margin-bottom: -7px; /*Fix for safari gap*/\\n    min-height: 100px;\\n    max-height: 150px;\\n  }\\n\\n  .content {\\n    position: relative;\\n    height: 20vh;\\n    text-align: center;\\n    background-color: white;\\n  }\\n\\n  /* Animation */\\n\\n  .parallax > use {\\n    animation: move-forever 25s cubic-bezier(0.55, 0.5, 0.45, 0.5) infinite;\\n  }\\n  .parallax > use:nth-child(1) {\\n    animation-delay: -2s;\\n    animation-duration: 7s;\\n  }\\n  .parallax > use:nth-child(2) {\\n    animation-delay: -3s;\\n    animation-duration: 10s;\\n  }\\n  .parallax > use:nth-child(3) {\\n    animation-delay: -4s;\\n    animation-duration: 13s;\\n  }\\n  .parallax > use:nth-child(4) {\\n    animation-delay: -5s;\\n    animation-duration: 20s;\\n  }\\n  @keyframes move-forever {\\n    0% {\\n      transform: translate3d(-90px, 0, 0);\\n    }\\n    100% {\\n      transform: translate3d(85px, 0, 0);\\n    }\\n  }\\n  /*Shrinking for mobile*/\\n  @media (max-width: 768px) {\\n    .waves {\\n      height: 40px;\\n      min-height: 40px;\\n    }\\n    .content {\\n      height: 30vh;\\n    }\\n    h1 {\\n      font-size: 24px;\\n    }\\n  }\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\n\n\nvar StyledLoading = styled_components__WEBPACK_IMPORTED_MODULE_2___default().div(_templateObject());\nvar LoadingPage = function LoadingPage() {\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(StyledLoading, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"div\", {\n    className: \"header\"\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"div\", {\n    className: \"inner-header flex\"\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"h1\", null, \"Loading\")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"div\", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"svg\", {\n    className: \"waves\",\n    xmlns: \"http://www.w3.org/2000/svg\",\n    viewBox: \"0 24 150 28\",\n    preserveAspectRatio: \"none\",\n    shapeRendering: \"auto\"\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"defs\", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"path\", {\n    id: \"gentle-wave\",\n    d: \"M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z\"\n  })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"g\", {\n    className: \"parallax\"\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"use\", {\n    xlinkHref: \"#gentle-wave\",\n    x: \"48\",\n    y: \"0\",\n    fill: \"rgba(255,255,255,0.7\"\n  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"use\", {\n    xlinkHref: \"#gentle-wave\",\n    x: \"48\",\n    y: \"3\",\n    fill: \"rgba(255,255,255,0.5)\"\n  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"use\", {\n    xlinkHref: \"#gentle-wave\",\n    x: \"48\",\n    y: \"5\",\n    fill: \"rgba(255,255,255,0.3)\"\n  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"use\", {\n    xlinkHref: \"#gentle-wave\",\n    x: \"48\",\n    y: \"7\",\n    fill: \"#fff\"\n  }))))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"div\", {\n    className: \"content flex\"\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"p\", null, \"powerd by | nolotus | Free to use\")));\n};\nvar LoadingBox = function LoadingBox() {\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(\"div\", {\n    className: \"loadding-box\"\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_fortawesome_react_fontawesome__WEBPACK_IMPORTED_MODULE_3__.FontAwesomeIcon, {\n    className: \"loading\",\n    icon: ['fas', 'spinner']\n  }));\n};\nvar Loading = function Loading() {\n  /*#__PURE__*/\n  react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_fortawesome_react_fontawesome__WEBPACK_IMPORTED_MODULE_3__.FontAwesomeIcon, {\n    className: \"loading\",\n    icon: ['fas', 'spinner']\n  });\n};\n\n//# sourceURL=webpack://nolo-ssr/./components/Loading/index.js?");

/***/ }),

/***/ "./components/Tabs/index.js":
/*!**********************************!*\
  !*** ./components/Tabs/index.js ***!
  \**********************************/
/*! namespace exports */
/*! export Tab [provided] [no usage info] [missing usage info prevents renaming] */
/*! export Tabs [provided] [no usage info] [missing usage info prevents renaming] */
/*! export WrapTab [provided] [no usage info] [missing usage info prevents renaming] */
/*! export WrapTabs [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"WrapTabs\": () => /* binding */ WrapTabs,\n/* harmony export */   \"WrapTab\": () => /* binding */ WrapTab,\n/* harmony export */   \"Tabs\": () => /* binding */ Tabs,\n/* harmony export */   \"Tab\": () => /* binding */ Tab\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_2__);\n\n\nfunction _templateObject2() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n  display: flex;\\n  justify-content: center;\\n  align-items: center;\\n  width: 10vw;\\n  padding: 10px ;\\n  border-bottom: \", \";\\n\"]);\n\n  _templateObject2 = function _templateObject2() {\n    return data;\n  };\n\n  return data;\n}\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n  display: flex;\\n  margin: 0 auto;\\n  width: 20vw;\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\n\nvar WrapTabs = styled_components__WEBPACK_IMPORTED_MODULE_2___default().div(_templateObject());\nvar WrapTab = styled_components__WEBPACK_IMPORTED_MODULE_2___default().div(_templateObject2(), function (props) {\n  return props.active ? \"2px solid var(--primaryColor)\" : \"none\";\n});\nvar Tabs = function Tabs(props) {\n  var children = props.children;\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(WrapTabs, props, children);\n};\nvar Tab = function Tab(props) {\n  var children = props.children;\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(WrapTab, props, children);\n};\n\n//# sourceURL=webpack://nolo-ssr/./components/Tabs/index.js?");

/***/ }),

/***/ "./components/UserCard/index.js":
/*!**************************************!*\
  !*** ./components/UserCard/index.js ***!
  \**************************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\");\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! prop-types */ \"prop-types\");\n/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(prop_types__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _common_api__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../common/api */ \"./common/api.js\");\n/* harmony import */ var _common_tools__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../common/tools */ \"./common/tools.js\");\n/* harmony import */ var _common_db__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../common/db */ \"./common/db.js\");\n\n\n\n\n\n\n\n\nvar UserCard = function UserCard(props) {\n  var name = props.name;\n  (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(function () {\n    var getData = /*#__PURE__*/function () {\n      var _ref = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee() {\n        var result, userDb, list;\n        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_context) {\n          while (1) {\n            switch (_context.prev = _context.next) {\n              case 0:\n                console.log(\"getData\");\n                _context.prev = 1;\n                _context.next = 4;\n                return (0,_common_api__WEBPACK_IMPORTED_MODULE_4__.dbGet)(_common_db__WEBPACK_IMPORTED_MODULE_6__.linkDb.remote, \"org.couchdb.user:\" + name);\n\n              case 4:\n                result = _context.sent;\n                console.log(\"result\", result);\n                userDb = (0,_common_db__WEBPACK_IMPORTED_MODULE_6__.connectDb)(\"userdb-\" + (0,_common_tools__WEBPACK_IMPORTED_MODULE_5__.toHex)(name));\n                console.log(\"userDb\", userDb);\n                _context.next = 10;\n                return userDb.remote.allDocs({\n                  include_docs: true\n                });\n\n              case 10:\n                list = _context.sent;\n                console.log(\"list\", list);\n                console.log(\"result\", result); // result && setList(result.rows);\n\n                _context.next = 18;\n                break;\n\n              case 15:\n                _context.prev = 15;\n                _context.t0 = _context[\"catch\"](1);\n                console.log(_context.t0);\n\n              case 18:\n              case \"end\":\n                return _context.stop();\n            }\n          }\n        }, _callee, null, [[1, 15]]);\n      }));\n\n      return function getData() {\n        return _ref.apply(this, arguments);\n      };\n    }();\n\n    getData();\n    return function () {};\n  }, [name]);\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(\"div\", null, name);\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (UserCard);\nUserCard.propTypes = {\n  name: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().string.isRequired)\n};\n\n//# sourceURL=webpack://nolo-ssr/./components/UserCard/index.js?");

/***/ }),

/***/ "./pages/Create.js":
/*!*************************!*\
  !*** ./pages/Create.js ***!
  \*************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\");\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\");\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _template__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../template */ \"./template/index.js\");\n/* harmony import */ var _components_Editor__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../components/Editor */ \"./components/Editor/index.js\");\n/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! lodash */ \"lodash\");\n/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_6__);\n/* harmony import */ var _components_Editor_neweditor_constant__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../components/Editor/neweditor/constant */ \"./components/Editor/neweditor/constant.js\");\n/* harmony import */ var _common_api__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../common/api */ \"./common/api.js\");\n/* harmony import */ var _common_db__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../common/db */ \"./common/db.js\");\n\n\n\n\n\n\n\n\n\n\n\nvar Create = function Create() {\n  // if user is save once\n  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)(),\n      _useState2 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default()(_useState, 2),\n      _id = _useState2[0],\n      setId = _useState2[1];\n\n  var _useState3 = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)(),\n      _useState4 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default()(_useState3, 2),\n      _rev = _useState4[0],\n      setRev = _useState4[1]; //handle  change\n\n\n  var onChange = /*#__PURE__*/function () {\n    var _ref = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee(json) {\n      var title, content, isSame, type, data, res, _data, _res;\n\n      return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_context) {\n        while (1) {\n          switch (_context.prev = _context.next) {\n            case 0:\n              title = json.title, content = json.content;\n              isSame = lodash__WEBPACK_IMPORTED_MODULE_6___default().isEqual(content, _components_Editor_neweditor_constant__WEBPACK_IMPORTED_MODULE_7__.initialValue);\n\n              if (isSame) {\n                _context.next = 20;\n                break;\n              }\n\n              if (!_id) {\n                _context.next = 14;\n                break;\n              }\n\n              type = \"article\";\n              data = {\n                title: title,\n                type: type,\n                content: content,\n                _id: _id\n              };\n              _context.next = 8;\n              return (0,_common_api__WEBPACK_IMPORTED_MODULE_8__.dbUpdate)(_common_db__WEBPACK_IMPORTED_MODULE_9__.localDb, data);\n\n            case 8:\n              res = _context.sent;\n              console.log(\"update\", res);\n              res && setRev(res.rev);\n              console.log(\"result\", res);\n              _context.next = 20;\n              break;\n\n            case 14:\n              _data = {\n                title: title,\n                type: \"article\",\n                content: content,\n                status: \"draft\"\n              };\n              _context.next = 17;\n              return (0,_common_api__WEBPACK_IMPORTED_MODULE_8__.dbNew)(_common_db__WEBPACK_IMPORTED_MODULE_9__.localDb, _data);\n\n            case 17:\n              _res = _context.sent;\n              console.log(\"res\", _res);\n              setId(_res.id);\n\n            case 20:\n            case \"end\":\n              return _context.stop();\n          }\n        }\n      }, _callee);\n    }));\n\n    return function onChange(_x) {\n      return _ref.apply(this, arguments);\n    };\n  }();\n\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_template__WEBPACK_IMPORTED_MODULE_4__.default, null, _rev, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_components_Editor__WEBPACK_IMPORTED_MODULE_5__.CurrentEditor, {\n    onChange: onChange\n  }));\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Create);\n\n//# sourceURL=webpack://nolo-ssr/./pages/Create.js?");

/***/ }),

/***/ "./pages/Find.js":
/*!***********************!*\
  !*** ./pages/Find.js ***!
  \***********************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\");\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\");\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _template__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../template */ \"./template/index.js\");\n/* harmony import */ var _components_UserCard__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../components/UserCard */ \"./components/UserCard/index.js\");\n/* harmony import */ var _common_api__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../common/api */ \"./common/api.js\");\n/* harmony import */ var _common_db__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../common/db */ \"./common/db.js\");\n\n\n\n\n\n\n\n\n\nvar Find = function Find() {\n  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)([]),\n      _useState2 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default()(_useState, 2),\n      friends = _useState2[0],\n      setFriends = _useState2[1];\n\n  (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(function () {\n    var getData = /*#__PURE__*/function () {\n      var _ref = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee() {\n        var result;\n        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_context) {\n          while (1) {\n            switch (_context.prev = _context.next) {\n              case 0:\n                console.log(\"getData\");\n                _context.prev = 1;\n                _context.next = 4;\n                return (0,_common_api__WEBPACK_IMPORTED_MODULE_6__.dbGet)(_common_db__WEBPACK_IMPORTED_MODULE_7__.hostDb.remote, \"friends\");\n\n              case 4:\n                result = _context.sent;\n                console.log(\"result\", result);\n                result && setFriends(result.list);\n                _context.next = 12;\n                break;\n\n              case 9:\n                _context.prev = 9;\n                _context.t0 = _context[\"catch\"](1);\n                console.log(_context.t0);\n\n              case 12:\n              case \"end\":\n                return _context.stop();\n            }\n          }\n        }, _callee, null, [[1, 9]]);\n      }));\n\n      return function getData() {\n        return _ref.apply(this, arguments);\n      };\n    }();\n\n    getData();\n    return function () {};\n  }, []);\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_template__WEBPACK_IMPORTED_MODULE_4__.default, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(\"div\", null, \" \\u4F4F\\u5728\\u672C\\u7AD9\\u7684\\u7AD9\\u70B9\"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(\"div\", null, friends.map(function (item) {\n    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_components_UserCard__WEBPACK_IMPORTED_MODULE_5__.default, {\n      name: item,\n      key: item\n    });\n  })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(\"div\", null, \" \\u6DFB\\u52A0\\u4F60\\u7684\\u4E2A\\u4EBA\\u7F51\\u7AD9\\uFF0C\\u8BA9\\u66F4\\u591A\\u4EBA\\u770B\\u5230\\u4F60\\uFF08\\u6682\\u672A\\u5F00\\u653E\\uFF09\"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(\"div\", null, \"\\u63A8\\u8350\\u7684\\u7F51\\u7AD9\"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(\"div\", null, \"\\u63A8\\u8350\\u7684\\u5185\\u5BB9\"));\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Find);\n\n//# sourceURL=webpack://nolo-ssr/./pages/Find.js?");

/***/ }),

/***/ "./pages/Home.js":
/*!***********************!*\
  !*** ./pages/Home.js ***!
  \***********************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\");\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\");\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _components_Loading__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../components/Loading */ \"./components/Loading/index.js\");\n/* harmony import */ var _Page__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./Page */ \"./pages/Page.js\");\n/* harmony import */ var _common_api__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../common/api */ \"./common/api.js\");\n/* harmony import */ var _common_db__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../common/db */ \"./common/db.js\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! react-redux */ \"react-redux\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(react_redux__WEBPACK_IMPORTED_MODULE_8__);\n\n\n\n\n\n\n\n\n // import Template from \"../template\"\n\nvar Home = function Home() {\n  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)(true),\n      _useState2 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default()(_useState, 2),\n      loading = _useState2[0],\n      setLoading = _useState2[1];\n\n  var dispatch = (0,react_redux__WEBPACK_IMPORTED_MODULE_8__.useDispatch)();\n\n  var _useSelector = (0,react_redux__WEBPACK_IMPORTED_MODULE_8__.useSelector)(function (state) {\n    return state.setting;\n  }),\n      home = _useSelector.home;\n\n  (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(function () {\n    //get menu and setting from hostDb\n    var fetchData = /*#__PURE__*/function () {\n      var _ref = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee() {\n        var menu, setting;\n        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_context) {\n          while (1) {\n            switch (_context.prev = _context.next) {\n              case 0:\n                _context.next = 2;\n                return (0,_common_api__WEBPACK_IMPORTED_MODULE_6__.dbGet)(_common_db__WEBPACK_IMPORTED_MODULE_7__.hostDb.remote, \"menu\").result;\n\n              case 2:\n                _context.t0 = _context.sent;\n\n                if (_context.t0) {\n                  _context.next = 5;\n                  break;\n                }\n\n                _context.t0 = [];\n\n              case 5:\n                menu = _context.t0;\n                _context.next = 8;\n                return (0,_common_api__WEBPACK_IMPORTED_MODULE_6__.dbGet)(_common_db__WEBPACK_IMPORTED_MODULE_7__.hostDb.remote, \"setting\");\n\n              case 8:\n                _context.t1 = _context.sent;\n\n                if (_context.t1) {\n                  _context.next = 11;\n                  break;\n                }\n\n                _context.t1 = {};\n\n              case 11:\n                setting = _context.t1;\n                dispatch({\n                  type: \"initSuccess\",\n                  payload: {\n                    menu: menu,\n                    setting: setting\n                  }\n                });\n                setLoading(false);\n\n              case 14:\n              case \"end\":\n                return _context.stop();\n            }\n          }\n        }, _callee);\n      }));\n\n      return function fetchData() {\n        return _ref.apply(this, arguments);\n      };\n    }();\n\n    fetchData();\n    return function () {};\n  }, [dispatch]);\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement((react__WEBPACK_IMPORTED_MODULE_3___default().Fragment), null, loading ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_components_Loading__WEBPACK_IMPORTED_MODULE_4__.LoadingPage, null) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_Page__WEBPACK_IMPORTED_MODULE_5__.Page, {\n    _id: home\n  }));\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Home);\n\n//# sourceURL=webpack://nolo-ssr/./pages/Home.js?");

/***/ }),

/***/ "./pages/Life.js":
/*!***********************!*\
  !*** ./pages/Life.js ***!
  \***********************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"@babel/runtime/helpers/defineProperty\");\n/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\");\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\");\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_5__);\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react-redux */ \"react-redux\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(react_redux__WEBPACK_IMPORTED_MODULE_6__);\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_7__);\n/* harmony import */ var _fortawesome_react_fontawesome__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @fortawesome/react-fontawesome */ \"@fortawesome/react-fontawesome\");\n/* harmony import */ var _fortawesome_react_fontawesome__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(_fortawesome_react_fontawesome__WEBPACK_IMPORTED_MODULE_8__);\n/* harmony import */ var _common_db__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../common/db */ \"./common/db.js\");\n/* harmony import */ var _template__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../template */ \"./template/index.js\");\n/* harmony import */ var _common_api__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../common/api */ \"./common/api.js\");\n/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! react-router-dom */ \"react-router-dom\");\n/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(react_router_dom__WEBPACK_IMPORTED_MODULE_12__);\n/* harmony import */ var _components_ArticleTitle__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../components/ArticleTitle */ \"./components/ArticleTitle/index.js\");\n\n\n\n\n\n\nfunction ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }\n\nfunction _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default()(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_4___default()([\"\\n  width: 90%;\\n  max-width: 1050px;\\n  margin: 3em auto 0;\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\n\n\n\n\n\n\n\n\nvar StyledLife = styled_components__WEBPACK_IMPORTED_MODULE_7___default().div(_templateObject());\n\nvar Life = function Life() {\n  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_5__.useState)([]),\n      _useState2 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3___default()(_useState, 2),\n      list = _useState2[0],\n      setList = _useState2[1];\n\n  var _useState3 = (0,react__WEBPACK_IMPORTED_MODULE_5__.useState)(_common_db__WEBPACK_IMPORTED_MODULE_9__.hostDb.remote),\n      _useState4 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3___default()(_useState3, 2),\n      currentDb = _useState4[0],\n      setCurrentDb = _useState4[1];\n\n  var dispatch = (0,react_redux__WEBPACK_IMPORTED_MODULE_6__.useDispatch)();\n\n  var getData = function getData() {\n    (0,_common_api__WEBPACK_IMPORTED_MODULE_11__.dbAll)(currentDb).then(function (result) {\n      if (result) {\n        console.log(\"result\", result);\n        setList(result.rows);\n      }\n    });\n  };\n\n  var goDelete = function goDelete(id) {\n    currentDb.get(id).then( /*#__PURE__*/function () {\n      var _ref = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().mark(function _callee(doc) {\n        var result;\n        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().wrap(function _callee$(_context) {\n          while (1) {\n            switch (_context.prev = _context.next) {\n              case 0:\n                _context.next = 2;\n                return currentDb.remove(doc);\n\n              case 2:\n                result = _context.sent;\n                console.log(\"handleDetele\", result);\n                getData();\n                closeModal();\n\n              case 6:\n              case \"end\":\n                return _context.stop();\n            }\n          }\n        }, _callee);\n      }));\n\n      return function (_x) {\n        return _ref.apply(this, arguments);\n      };\n    }())[\"catch\"](function (err) {\n      console.log(err);\n    });\n  };\n\n  var modal = function modal(modalInfo) {\n    dispatch({\n      type: \"modal\",\n      modalInfo: _objectSpread(_objectSpread({}, modalInfo), {}, {\n        isVisible: true\n      })\n    });\n  };\n\n  var closeModal = function closeModal() {\n    return dispatch({\n      type: \"modal\",\n      modalInfo: {\n        isVisible: false\n      }\n    });\n  };\n\n  (0,react__WEBPACK_IMPORTED_MODULE_5__.useEffect)(function () {\n    (0,_common_api__WEBPACK_IMPORTED_MODULE_11__.dbAll)(currentDb).then(function (result) {\n      if (result) {\n        console.log(\"result\", result);\n        setList(result.rows);\n      }\n    });\n    return function () {};\n  }, []);\n\n  var handleDetele = /*#__PURE__*/function () {\n    var _ref2 = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().mark(function _callee2(id) {\n      return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().wrap(function _callee2$(_context2) {\n        while (1) {\n          switch (_context2.prev = _context2.next) {\n            case 0:\n              modal({\n                modalType: \"warning\",\n                title: \"\\u786E\\u8BA4\\u5220\\u9664\\uFF1F\",\n                content: \"\\u5220\\u9664\\u5185\\u5BB9\\u4E0D\\u53EF\\u6062\\u590D\\uFF01\",\n                buttons: [{\n                  text: \"取消\",\n                  className: \"button-warning-cancel\",\n                  onClick: closeModal\n                }, {\n                  text: \"确认\",\n                  className: \"button-warning-blue\",\n                  onClick: function onClick() {\n                    goDelete(id);\n                  }\n                }]\n              });\n\n            case 1:\n            case \"end\":\n              return _context2.stop();\n          }\n        }\n      }, _callee2);\n    }));\n\n    return function handleDetele(_x2) {\n      return _ref2.apply(this, arguments);\n    };\n  }();\n\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_5___default().createElement(_template__WEBPACK_IMPORTED_MODULE_10__.default, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_5___default().createElement(StyledLife, null, list.map(function (post) {\n    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_5___default().createElement(_components_ArticleTitle__WEBPACK_IMPORTED_MODULE_13__.default, {\n      key: post.id\n    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_5___default().createElement(\"div\", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_5___default().createElement(react_router_dom__WEBPACK_IMPORTED_MODULE_12__.Link, {\n      to: {\n        pathname: post.doc._id\n      }\n    }, post.doc.title || post.doc._id)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_5___default().createElement(\"div\", {\n      className: \"delete-button\",\n      onClick: function onClick() {\n        return handleDetele(post.doc._id);\n      }\n    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_5___default().createElement(_fortawesome_react_fontawesome__WEBPACK_IMPORTED_MODULE_8__.FontAwesomeIcon, {\n      icon: [\"fas\", \"times\"]\n    })));\n  })));\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Life);\n\n//# sourceURL=webpack://nolo-ssr/./pages/Life.js?");

/***/ }),

/***/ "./pages/Page.js":
/*!***********************!*\
  !*** ./pages/Page.js ***!
  \***********************/
/*! namespace exports */
/*! export Page [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"Page\": () => /* binding */ Page\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\");\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\");\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _common_api__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../common/api */ \"./common/api.js\");\n/* harmony import */ var _common_db__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../common/db */ \"./common/db.js\");\n/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react-router-dom */ \"react-router-dom\");\n/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(react_router_dom__WEBPACK_IMPORTED_MODULE_6__);\n/* harmony import */ var _components_Article__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../components/Article */ \"./components/Article/index.js\");\n/* harmony import */ var _template__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../template */ \"./template/index.js\");\n/* harmony import */ var _components_Loading__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../components/Loading */ \"./components/Loading/index.js\");\n\n\n\n\n\n\n\n\n\n\nvar Page = function Page(props) {\n  var _id = (0,react_router_dom__WEBPACK_IMPORTED_MODULE_6__.useParams)().id || props._id;\n\n  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)(),\n      _useState2 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2___default()(_useState, 2),\n      doc = _useState2[0],\n      setDoc = _useState2[1];\n\n  (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(function () {\n    var getdata = /*#__PURE__*/function () {\n      var _ref = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee() {\n        var doc;\n        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_context) {\n          while (1) {\n            switch (_context.prev = _context.next) {\n              case 0:\n                _context.next = 2;\n                return (0,_common_api__WEBPACK_IMPORTED_MODULE_4__.dbGet)(_common_db__WEBPACK_IMPORTED_MODULE_5__.hostDb.remote, _id);\n\n              case 2:\n                doc = _context.sent;\n                doc !== undefined && setDoc(doc);\n\n              case 4:\n              case \"end\":\n                return _context.stop();\n            }\n          }\n        }, _callee);\n      }));\n\n      return function getdata() {\n        return _ref.apply(this, arguments);\n      };\n    }();\n\n    getdata();\n    return function () {};\n  }, [_id]);\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_template__WEBPACK_IMPORTED_MODULE_8__.default, null, doc ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_components_Article__WEBPACK_IMPORTED_MODULE_7__.Article, {\n    doc: doc\n  }) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3___default().createElement(_components_Loading__WEBPACK_IMPORTED_MODULE_9__.LoadingBox, null));\n};\n\n//# sourceURL=webpack://nolo-ssr/./pages/Page.js?");

/***/ }),

/***/ "./pages/Self/index.js":
/*!*****************************!*\
  !*** ./pages/Self/index.js ***!
  \*****************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"@babel/runtime/helpers/defineProperty\");\n/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\");\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\");\n/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var _template__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../template */ \"./template/index.js\");\n/* harmony import */ var _styled__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./styled */ \"./pages/Self/styled.js\");\n/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react-router-dom */ \"react-router-dom\");\n/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react_router_dom__WEBPACK_IMPORTED_MODULE_7__);\n/* harmony import */ var _components_Button__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../components/Button */ \"./components/Button/index.js\");\n/* harmony import */ var _components_Input__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../../components/Input */ \"./components/Input/index.js\");\n/* harmony import */ var _components_Error__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../../components/Error */ \"./components/Error/index.js\");\n/* harmony import */ var _components_Tabs__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../../components/Tabs */ \"./components/Tabs/index.js\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! react-redux */ \"react-redux\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(react_redux__WEBPACK_IMPORTED_MODULE_12__);\n/* harmony import */ var _common_db__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../../common/db */ \"./common/db.js\");\n\n\n\n\n\nfunction ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }\n\nfunction _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default()(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }\n\n\n\n\n\n\n\n\n\n\n\n\nvar Self = function Self(props) {\n  var history = (0,react_router_dom__WEBPACK_IMPORTED_MODULE_7__.useHistory)();\n  var dispatch = (0,react_redux__WEBPACK_IMPORTED_MODULE_12__.useDispatch)();\n\n  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)(\"signin\"),\n      _useState2 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3___default()(_useState, 2),\n      type = _useState2[0],\n      setType = _useState2[1];\n\n  var _useState3 = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)(),\n      _useState4 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3___default()(_useState3, 2),\n      error = _useState4[0],\n      setError = _useState4[1];\n\n  var _useSelector = (0,react_redux__WEBPACK_IMPORTED_MODULE_12__.useSelector)(function (state) {\n    return state.authData;\n  }),\n      isLogin = _useSelector.isLogin;\n\n  var dbLogin = /*#__PURE__*/function () {\n    var _ref = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().mark(function _callee(username, password) {\n      var doc, userInfo, userDb;\n      return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().wrap(function _callee$(_context) {\n        while (1) {\n          switch (_context.prev = _context.next) {\n            case 0:\n              _context.prev = 0;\n              console.log('hostDb', _common_db__WEBPACK_IMPORTED_MODULE_13__.hostDb);\n              _context.next = 4;\n              return _common_db__WEBPACK_IMPORTED_MODULE_13__.hostDb.remote.login(username, password);\n\n            case 4:\n              doc = _context.sent;\n              console.log(\"logininfo\", doc);\n\n              if (doc.ok) {\n                userInfo = {\n                  name: doc.name,\n                  roles: doc.roles\n                };\n                userDb = (0,_common_db__WEBPACK_IMPORTED_MODULE_13__.connectDb)(doc.name);\n                dispatch({\n                  type: \"loginSuccess\",\n                  payload: {\n                    userInfo: userInfo,\n                    userDb: userDb\n                  }\n                });\n                history.push(\"/setting\");\n              }\n\n              return _context.abrupt(\"return\", doc);\n\n            case 10:\n              _context.prev = 10;\n              _context.t0 = _context[\"catch\"](0);\n              return _context.abrupt(\"return\", _context.t0);\n\n            case 13:\n            case \"end\":\n              return _context.stop();\n          }\n        }\n      }, _callee, null, [[0, 10]]);\n    }));\n\n    return function dbLogin(_x, _x2) {\n      return _ref.apply(this, arguments);\n    };\n  }();\n\n  var dbSignUp = /*#__PURE__*/function () {\n    var _ref2 = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().mark(function _callee2(username, password) {\n      var doc;\n      return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().wrap(function _callee2$(_context2) {\n        while (1) {\n          switch (_context2.prev = _context2.next) {\n            case 0:\n              _context2.prev = 0;\n              _context2.next = 3;\n              return _common_db__WEBPACK_IMPORTED_MODULE_13__.hostDb.remote.signUp(username, password);\n\n            case 3:\n              doc = _context2.sent;\n              console.log(\"signUpinfo\", doc);\n\n              if (doc.ok) {\n                alert(\"注册成功\");\n                dbLogin(username, password);\n              }\n\n              return _context2.abrupt(\"return\", doc);\n\n            case 9:\n              _context2.prev = 9;\n              _context2.t0 = _context2[\"catch\"](0);\n              return _context2.abrupt(\"return\", _context2.t0);\n\n            case 12:\n            case \"end\":\n              return _context2.stop();\n          }\n        }\n      }, _callee2, null, [[0, 9]]);\n    }));\n\n    return function dbSignUp(_x3, _x4) {\n      return _ref2.apply(this, arguments);\n    };\n  }();\n\n  isLogin && history.push(\"/setting\");\n\n  var _useState5 = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)({\n    username: \"\",\n    password: \"\"\n  }),\n      _useState6 = _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_3___default()(_useState5, 2),\n      state = _useState6[0],\n      setstate = _useState6[1];\n\n  var login = /*#__PURE__*/function () {\n    var _ref3 = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().mark(function _callee3() {\n      var result;\n      return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().wrap(function _callee3$(_context3) {\n        while (1) {\n          switch (_context3.prev = _context3.next) {\n            case 0:\n              _context3.next = 2;\n              return dbLogin(state.username, state.password);\n\n            case 2:\n              result = _context3.sent;\n              console.log(\"loginresult\", result);\n\n              if (result.error) {\n                setError(result.message);\n              }\n\n            case 5:\n            case \"end\":\n              return _context3.stop();\n          }\n        }\n      }, _callee3);\n    }));\n\n    return function login() {\n      return _ref3.apply(this, arguments);\n    };\n  }();\n\n  var signup = /*#__PURE__*/function () {\n    var _ref4 = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().mark(function _callee4() {\n      var result;\n      return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_1___default().wrap(function _callee4$(_context4) {\n        while (1) {\n          switch (_context4.prev = _context4.next) {\n            case 0:\n              _context4.next = 2;\n              return dbSignUp(state.username, state.password);\n\n            case 2:\n              result = _context4.sent;\n\n              // console.log('result',result)\n              if (result.error === \"conflict\") {\n                setError(\"此用户名已被注册\");\n              }\n\n            case 4:\n            case \"end\":\n              return _context4.stop();\n          }\n        }\n      }, _callee4);\n    }));\n\n    return function signup() {\n      return _ref4.apply(this, arguments);\n    };\n  }();\n\n  var submit = function submit(e) {\n    e.preventDefault();\n    type === \"signin\" ? login() : signup();\n  };\n\n  var _onChange = function onChange(key, value) {\n    console.log(key, value);\n    setstate(_objectSpread(_objectSpread({}, state), {}, _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default()({}, key, value)));\n  };\n\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_template__WEBPACK_IMPORTED_MODULE_5__.default, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_styled__WEBPACK_IMPORTED_MODULE_6__.WrapSelf, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(\"div\", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_components_Tabs__WEBPACK_IMPORTED_MODULE_11__.Tabs, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_components_Tabs__WEBPACK_IMPORTED_MODULE_11__.Tab, {\n    active: type === \"signin\",\n    onClick: function onClick() {\n      setType(\"signin\");\n    }\n  }, \"\\u767B\\u5F55\"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_components_Tabs__WEBPACK_IMPORTED_MODULE_11__.Tab, {\n    active: type === \"signup\",\n    onClick: function onClick() {\n      setType(\"signup\");\n    }\n  }, \"\\u6CE8\\u518C\")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(\"form\", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_components_Error__WEBPACK_IMPORTED_MODULE_10__.default, null, error), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_components_Input__WEBPACK_IMPORTED_MODULE_9__.default, {\n    label: \"\\u540D\\u5B57\",\n    onChange: function onChange(e) {\n      return _onChange(\"username\", e.target.value);\n    },\n    name: \"name\",\n    type: \"text\",\n    id: \"inp\",\n    placeholder: \"\\xA0\"\n  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_components_Input__WEBPACK_IMPORTED_MODULE_9__.default, {\n    label: \"\\u5BC6\\u7801\",\n    onChange: function onChange(e) {\n      return _onChange(\"password\", e.target.value);\n    },\n    name: \"password\",\n    type: \"password\",\n    placeholder: \"\\xA0\"\n  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_components_Button__WEBPACK_IMPORTED_MODULE_8__.default, {\n    onClick: submit\n  }, \"\\u63D0\\u4EA4\")))));\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Self);\n\n//# sourceURL=webpack://nolo-ssr/./pages/Self/index.js?");

/***/ }),

/***/ "./pages/Self/styled.js":
/*!******************************!*\
  !*** ./pages/Self/styled.js ***!
  \******************************/
/*! namespace exports */
/*! export WrapSelf [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"WrapSelf\": () => /* binding */ WrapSelf\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_1__);\n\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\nform {\\n    width: 280px;\\n    margin:auto;\\n}\\n\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\nvar WrapSelf = styled_components__WEBPACK_IMPORTED_MODULE_1___default().div(_templateObject());\n\n//# sourceURL=webpack://nolo-ssr/./pages/Self/styled.js?");

/***/ }),

/***/ "./pages/Setting.js":
/*!**************************!*\
  !*** ./pages/Setting.js ***!
  \**************************/
/*! namespace exports */
/*! export Setting [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"Setting\": () => /* binding */ Setting\n/* harmony export */ });\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-redux */ \"react-redux\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_redux__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _template__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../template */ \"./template/index.js\");\n/* harmony import */ var _common_db__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../common/db */ \"./common/db.js\");\n\n\n\n\nvar Setting = function Setting() {\n  var dispatch = (0,react_redux__WEBPACK_IMPORTED_MODULE_1__.useDispatch)();\n\n  var logout = function logout() {\n    _common_db__WEBPACK_IMPORTED_MODULE_3__.hostDb.remote.logOut(function (err, response) {\n      dispatch({\n        type: \"logout\"\n      });\n\n      if (err) {// network error\n      }\n\n      history.push(\"/\");\n    });\n  };\n\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_template__WEBPACK_IMPORTED_MODULE_2__.default, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(\"div\", {\n    onClick: logout\n  }, \"\\u9000\\u51FA\\u767B\\u5F55\"));\n};\n\n//# sourceURL=webpack://nolo-ssr/./pages/Setting.js?");

/***/ }),

/***/ "./server/config.js":
/*!**************************!*\
  !*** ./server/config.js ***!
  \**************************/
/*! namespace exports */
/*! export isDevEnv [provided] [no usage info] [missing usage info prevents renaming] */
/*! export isProdEnv [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"isProdEnv\": () => /* binding */ isProdEnv,\n/* harmony export */   \"isDevEnv\": () => /* binding */ isDevEnv\n/* harmony export */ });\nvar env = \"development\";\nvar isProdEnv = env === 'production';\nvar isDevEnv = env === 'development';\n\n//# sourceURL=webpack://nolo-ssr/./server/config.js?");

/***/ }),

/***/ "./server/index.js":
/*!*************************!*\
  !*** ./server/index.js ***!
  \*************************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! express */ \"express\");\n/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(express__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _render__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./render */ \"./server/render.js\");\n/* harmony import */ var react_router_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react-router-config */ \"react-router-config\");\n/* harmony import */ var react_router_config__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_router_config__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _common_Routes__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../common/Routes */ \"./common/Routes.js\");\n/* harmony import */ var _common_store__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../common/store */ \"./common/store.js\");\n/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./config */ \"./server/config.js\");\n\n\n\n\n\n\nvar app = express__WEBPACK_IMPORTED_MODULE_0___default()();\n\nvar _require = __webpack_require__(/*! http-proxy-middleware */ \"http-proxy-middleware\"),\n    createProxyMiddleware = _require.createProxyMiddleware;\n\nif (_config__WEBPACK_IMPORTED_MODULE_5__.isProdEnv) {\n  var filter = function filter(pathname, req) {\n    return req.hostname === \"tw.db.nolotus.com\";\n  };\n\n  var dbProxy = createProxyMiddleware(filter, {\n    target: \"http://localhost:5984\",\n    changeOrigin: true\n  });\n  app.use(\"/\", dbProxy);\n}\n\napp.use(express__WEBPACK_IMPORTED_MODULE_0___default().static(\"public\")); // get request\n\napp.get(\"*\", function (req, res) {\n  var promises = (0,react_router_config__WEBPACK_IMPORTED_MODULE_2__.matchRoutes)(_common_Routes__WEBPACK_IMPORTED_MODULE_3__.default, req.path).map(function (_ref) {\n    var route = _ref.route;\n    var component = route.component;\n    return component.getInitialData ? component.getInitialData(_common_store__WEBPACK_IMPORTED_MODULE_4__.default) : null;\n  });\n  Promise.all(promises).then(function () {\n    var html = (0,_render__WEBPACK_IMPORTED_MODULE_1__.default)(req, _common_store__WEBPACK_IMPORTED_MODULE_4__.default);\n    res.send(html);\n  });\n});\n\nif (_config__WEBPACK_IMPORTED_MODULE_5__.isProdEnv) {\n  __webpack_require__(/*! greenlock-express */ \"greenlock-express\").init({\n    packageRoot: process.cwd(),\n    configDir: \"./greenlock.d\",\n    // contact for security and critical bug notices\n    maintainerEmail: \"s@nolotus.com\",\n    // whether or not to run at cloudscale\n    cluster: false\n  }) // Serves on 80 and 443\n  // Get's SSL certificates magically!\n  .serve(app);\n} else {\n  app.listen(80, function () {\n    return console.log(\"localhost develop 80!\");\n  });\n}\n\n//# sourceURL=webpack://nolo-ssr/./server/index.js?");

/***/ }),

/***/ "./server/render.js":
/*!**************************!*\
  !*** ./server/render.js ***!
  \**************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react_helmet__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-helmet */ \"react-helmet\");\n/* harmony import */ var react_helmet__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_helmet__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react_dom_server__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react-dom/server */ \"react-dom/server\");\n/* harmony import */ var react_dom_server__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_dom_server__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react-router-dom */ \"react-router-dom\");\n/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react_router_dom__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! react-redux */ \"react-redux\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react_redux__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var react_router_config__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react-router-config */ \"react-router-config\");\n/* harmony import */ var react_router_config__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react_router_config__WEBPACK_IMPORTED_MODULE_5__);\n/* harmony import */ var _common_Routes__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../common/Routes */ \"./common/Routes.js\");\n\n\n\n\n\n\n\n\nvar render = function render(req, store) {\n  var content = (0,react_dom_server__WEBPACK_IMPORTED_MODULE_2__.renderToString)( /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(react_redux__WEBPACK_IMPORTED_MODULE_4__.Provider, {\n    store: store\n  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(react_router_dom__WEBPACK_IMPORTED_MODULE_3__.StaticRouter, {\n    location: req.path\n  }, (0,react_router_config__WEBPACK_IMPORTED_MODULE_5__.renderRoutes)(_common_Routes__WEBPACK_IMPORTED_MODULE_6__.default))));\n  var helmet = react_helmet__WEBPACK_IMPORTED_MODULE_1___default().renderStatic();\n  var html = \"\\n    <html \".concat(helmet.htmlAttributes.toString(), \">\\n      <head>\\n    <link rel=\\\"stylesheet\\\" href=\\\"/common.css\\\" type=\\\"text/css\\\" />\\n\\n      \").concat(helmet.title.toString(), \"\\n      \").concat(helmet.meta.toString(), \"\\n      \").concat(helmet.link.toString(), \"\\n      </head>\\n      <body \").concat(helmet.bodyAttributes.toString(), \">\\n        <div id=\\\"root\\\">\").concat(content, \"</div>\\n        <script src=\\\"bundle.js\\\"></script>\\n      </body>\\n    </html>\\n  \");\n  return html;\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (render);\n\n//# sourceURL=webpack://nolo-ssr/./server/render.js?");

/***/ }),

/***/ "./template/Simple.js":
/*!****************************!*\
  !*** ./template/Simple.js ***!
  \****************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteral */ \"@babel/runtime/helpers/taggedTemplateLiteral\");\n/* harmony import */ var _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _components_Header__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../components/Header */ \"./components/Header/index.js\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! styled-components */ \"styled-components\");\n/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(styled_components__WEBPACK_IMPORTED_MODULE_3__);\n\n\nfunction _templateObject() {\n  var data = _babel_runtime_helpers_taggedTemplateLiteral__WEBPACK_IMPORTED_MODULE_0___default()([\"\\n body {\\n  margin: 0;\\n  padding: 0;\\n  font-family: -apple-system, BlinkMacSystemFont, \\\"Segoe UI\\\", \\\"Roboto\\\", \\\"Oxygen\\\",\\n    \\\"Ubuntu\\\", \\\"Cantarell\\\", \\\"Fira Sans\\\", \\\"Droid Sans\\\", \\\"Helvetica Neue\\\",\\n    sans-serif;\\n  -webkit-font-smoothing: antialiased;\\n  -moz-osx-font-smoothing: grayscale;\\n}\\n\"]);\n\n  _templateObject = function _templateObject() {\n    return data;\n  };\n\n  return data;\n}\n\n\n\n\nvar GlobalStyle = (0,styled_components__WEBPACK_IMPORTED_MODULE_3__.createGlobalStyle)(_templateObject());\n\nvar simple = function simple(props) {\n  var children = props.children;\n  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement((react__WEBPACK_IMPORTED_MODULE_1___default().Fragment), null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(GlobalStyle, null), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_components_Header__WEBPACK_IMPORTED_MODULE_2__.default, null), children);\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (simple);\n\n//# sourceURL=webpack://nolo-ssr/./template/Simple.js?");

/***/ }),

/***/ "./template/index.js":
/*!***************************!*\
  !*** ./template/index.js ***!
  \***************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\");\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react-redux */ \"react-redux\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react_redux__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _common_db__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../common/db */ \"./common/db.js\");\n/* harmony import */ var _Simple__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./Simple */ \"./template/Simple.js\");\n\n\n\n\n\n\nfunction getSession() {\n  return _getSession.apply(this, arguments);\n}\n\nfunction _getSession() {\n  _getSession = _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_1___default()( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee() {\n    var doc;\n    return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_context) {\n      while (1) {\n        switch (_context.prev = _context.next) {\n          case 0:\n            _context.prev = 0;\n            _context.next = 3;\n            return _common_db__WEBPACK_IMPORTED_MODULE_4__.hostDb.remote.getSession();\n\n          case 3:\n            doc = _context.sent;\n            return _context.abrupt(\"return\", doc);\n\n          case 7:\n            _context.prev = 7;\n            _context.t0 = _context[\"catch\"](0);\n            console.log(\"err\", _context.t0);\n\n          case 10:\n          case \"end\":\n            return _context.stop();\n        }\n      }\n    }, _callee, null, [[0, 7]]);\n  }));\n  return _getSession.apply(this, arguments);\n}\n\n\n\nvar Template = function Template(props) {\n  var templateName = (0,react_redux__WEBPACK_IMPORTED_MODULE_3__.useSelector)(function (state) {\n    return state.templateName;\n  });\n  var dispatch = (0,react_redux__WEBPACK_IMPORTED_MODULE_3__.useDispatch)();\n  (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(function () {\n    getSession().then(function (doc) {\n      if (doc.userCtx.name !== null) {\n        var userDb = (0,_common_db__WEBPACK_IMPORTED_MODULE_4__.connectDb)(doc.userCtx.name);\n        var userInfo = doc.userCtx;\n        dispatch({\n          type: \"loginSuccess\",\n          payload: {\n            userInfo: userInfo,\n            userDb: userDb\n          }\n        });\n      }\n    });\n    return function () {};\n  }, []);\n\n  switch (templateName) {\n    case 'simple':\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(_Simple__WEBPACK_IMPORTED_MODULE_5__.default, props);\n\n    default:\n      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement(_Simple__WEBPACK_IMPORTED_MODULE_5__.default, props);\n  }\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Template);\n\n//# sourceURL=webpack://nolo-ssr/./template/index.js?");

/***/ }),

/***/ "@babel/runtime/helpers/asyncToGenerator":
/*!**********************************************************!*\
  !*** external "@babel/runtime/helpers/asyncToGenerator" ***!
  \**********************************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"@babel/runtime/helpers/asyncToGenerator\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22@babel/runtime/helpers/asyncToGenerator%22?");

/***/ }),

/***/ "@babel/runtime/helpers/defineProperty":
/*!********************************************************!*\
  !*** external "@babel/runtime/helpers/defineProperty" ***!
  \********************************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"@babel/runtime/helpers/defineProperty\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22@babel/runtime/helpers/defineProperty%22?");

/***/ }),

/***/ "@babel/runtime/helpers/extends":
/*!*************************************************!*\
  !*** external "@babel/runtime/helpers/extends" ***!
  \*************************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"@babel/runtime/helpers/extends\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22@babel/runtime/helpers/extends%22?");

/***/ }),

/***/ "@babel/runtime/helpers/slicedToArray":
/*!*******************************************************!*\
  !*** external "@babel/runtime/helpers/slicedToArray" ***!
  \*******************************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"@babel/runtime/helpers/slicedToArray\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22@babel/runtime/helpers/slicedToArray%22?");

/***/ }),

/***/ "@babel/runtime/helpers/taggedTemplateLiteral":
/*!***************************************************************!*\
  !*** external "@babel/runtime/helpers/taggedTemplateLiteral" ***!
  \***************************************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"@babel/runtime/helpers/taggedTemplateLiteral\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22@babel/runtime/helpers/taggedTemplateLiteral%22?");

/***/ }),

/***/ "@babel/runtime/regenerator":
/*!*********************************************!*\
  !*** external "@babel/runtime/regenerator" ***!
  \*********************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"@babel/runtime/regenerator\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22@babel/runtime/regenerator%22?");

/***/ }),

/***/ "@fortawesome/react-fontawesome":
/*!*************************************************!*\
  !*** external "@fortawesome/react-fontawesome" ***!
  \*************************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"@fortawesome/react-fontawesome\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22@fortawesome/react-fontawesome%22?");

/***/ }),

/***/ "emotion":
/*!**************************!*\
  !*** external "emotion" ***!
  \**************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"emotion\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22emotion%22?");

/***/ }),

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"express\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22express%22?");

/***/ }),

/***/ "global":
/*!*************************!*\
  !*** external "global" ***!
  \*************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"global\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22global%22?");

/***/ }),

/***/ "greenlock-express":
/*!************************************!*\
  !*** external "greenlock-express" ***!
  \************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"greenlock-express\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22greenlock-express%22?");

/***/ }),

/***/ "http-proxy-middleware":
/*!****************************************!*\
  !*** external "http-proxy-middleware" ***!
  \****************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"http-proxy-middleware\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22http-proxy-middleware%22?");

/***/ }),

/***/ "lodash":
/*!*************************!*\
  !*** external "lodash" ***!
  \*************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"lodash\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22lodash%22?");

/***/ }),

/***/ "pouchdb":
/*!**************************!*\
  !*** external "pouchdb" ***!
  \**************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"pouchdb\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22pouchdb%22?");

/***/ }),

/***/ "pouchdb-authentication":
/*!*****************************************!*\
  !*** external "pouchdb-authentication" ***!
  \*****************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"pouchdb-authentication\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22pouchdb-authentication%22?");

/***/ }),

/***/ "pouchdb-find":
/*!*******************************!*\
  !*** external "pouchdb-find" ***!
  \*******************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"pouchdb-find\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22pouchdb-find%22?");

/***/ }),

/***/ "prop-types":
/*!*****************************!*\
  !*** external "prop-types" ***!
  \*****************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"prop-types\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22prop-types%22?");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"react\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22react%22?");

/***/ }),

/***/ "react-dom":
/*!****************************!*\
  !*** external "react-dom" ***!
  \****************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"react-dom\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22react-dom%22?");

/***/ }),

/***/ "react-dom/server":
/*!***********************************!*\
  !*** external "react-dom/server" ***!
  \***********************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"react-dom/server\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22react-dom/server%22?");

/***/ }),

/***/ "react-helmet":
/*!*******************************!*\
  !*** external "react-helmet" ***!
  \*******************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"react-helmet\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22react-helmet%22?");

/***/ }),

/***/ "react-redux":
/*!******************************!*\
  !*** external "react-redux" ***!
  \******************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"react-redux\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22react-redux%22?");

/***/ }),

/***/ "react-router-config":
/*!**************************************!*\
  !*** external "react-router-config" ***!
  \**************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"react-router-config\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22react-router-config%22?");

/***/ }),

/***/ "react-router-dom":
/*!***********************************!*\
  !*** external "react-router-dom" ***!
  \***********************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"react-router-dom\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22react-router-dom%22?");

/***/ }),

/***/ "redux":
/*!************************!*\
  !*** external "redux" ***!
  \************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"redux\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22redux%22?");

/***/ }),

/***/ "slate":
/*!************************!*\
  !*** external "slate" ***!
  \************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"slate\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22slate%22?");

/***/ }),

/***/ "slate-history":
/*!********************************!*\
  !*** external "slate-history" ***!
  \********************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"slate-history\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22slate-history%22?");

/***/ }),

/***/ "slate-hyperscript":
/*!************************************!*\
  !*** external "slate-hyperscript" ***!
  \************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"slate-hyperscript\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22slate-hyperscript%22?");

/***/ }),

/***/ "slate-react":
/*!******************************!*\
  !*** external "slate-react" ***!
  \******************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"slate-react\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22slate-react%22?");

/***/ }),

/***/ "styled-components":
/*!************************************!*\
  !*** external "styled-components" ***!
  \************************************/
/*! dynamic exports */
/*! export __esModule [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

eval("module.exports = require(\"styled-components\");;\n\n//# sourceURL=webpack://nolo-ssr/external_%22styled-components%22?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__("./server/index.js");
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;