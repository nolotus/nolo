/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is not neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./common/Routes.js":
/*!**************************!*\
  !*** ./common/Routes.js ***!
  \**************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _Home=_interopRequireDefault(__webpack_require__(/*! ../pages/Home */ \"./pages/Home.js\"));var _Create=_interopRequireDefault(__webpack_require__(/*! ../pages/Create */ \"./pages/Create.js\"));var _Life=_interopRequireDefault(__webpack_require__(/*! ../pages/Life */ \"./pages/Life.js\"));var _Find=_interopRequireDefault(__webpack_require__(/*! ../pages/Find */ \"./pages/Find.js\"));var _Self=_interopRequireDefault(__webpack_require__(/*! ../pages/Self */ \"./pages/Self/index.js\"));var _Setting=__webpack_require__(/*! ../pages/Setting */ \"./pages/Setting.js\");var _Page=__webpack_require__(/*! ../pages/Page */ \"./pages/Page.js\");var Routes=[{exact:true,path:\"/\",component:_Home[\"default\"]},{path:\"/create\",component:_Create[\"default\"]},{path:\"/life\",component:_Life[\"default\"]},{path:\"/find\",component:_Find[\"default\"]},{path:\"/self\",component:_Self[\"default\"]},{path:\"/setting\",component:_Setting.Setting},{path:\"/:id\",component:_Page.Page}];var _default=Routes;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./common/Routes.js?");

/***/ }),

/***/ "./common/api.js":
/*!***********************!*\
  !*** ./common/api.js ***!
  \***********************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbAll [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbGet [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbNew [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbUpdate [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.dbUpdate=exports.dbNew=exports.dbGet=exports.dbAll=void 0;var _defineProperty2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"@babel/runtime/helpers/defineProperty\"));var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\"));function ownKeys(object,enumerableOnly){var keys=Object.keys(object);if(Object.getOwnPropertySymbols){var symbols=Object.getOwnPropertySymbols(object);if(enumerableOnly)symbols=symbols.filter(function(sym){return Object.getOwnPropertyDescriptor(object,sym).enumerable;});keys.push.apply(keys,symbols);}return keys;}function _objectSpread(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]!=null?arguments[i]:{};if(i%2){ownKeys(Object(source),true).forEach(function(key){(0,_defineProperty2[\"default\"])(target,key,source[key]);});}else if(Object.getOwnPropertyDescriptors){Object.defineProperties(target,Object.getOwnPropertyDescriptors(source));}else{ownKeys(Object(source)).forEach(function(key){Object.defineProperty(target,key,Object.getOwnPropertyDescriptor(source,key));});}}return target;}var dbAll=function(){var _ref=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee(db){var result;return _regenerator[\"default\"].wrap(function _callee$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.prev=0;_context.next=3;return db.allDocs({include_docs:true});case 3:result=_context.sent;return _context.abrupt(\"return\",result);case 7:_context.prev=7;_context.t0=_context[\"catch\"](0);case 9:case\"end\":return _context.stop();}}},_callee,null,[[0,7]]);}));return function dbAll(_x){return _ref.apply(this,arguments);};}();exports.dbAll=dbAll;var dbGet=function(){var _ref2=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee2(db,_id,option){var doc;return _regenerator[\"default\"].wrap(function _callee2$(_context2){while(1){switch(_context2.prev=_context2.next){case 0:_context2.prev=0;_context2.next=3;return db.get(_id,option?option:{attachments:true});case 3:doc=_context2.sent;return _context2.abrupt(\"return\",doc);case 7:_context2.prev=7;_context2.t0=_context2[\"catch\"](0);case 9:case\"end\":return _context2.stop();}}},_callee2,null,[[0,7]]);}));return function dbGet(_x2,_x3,_x4){return _ref2.apply(this,arguments);};}();exports.dbGet=dbGet;var dbNew=function dbNew(db,params){try{var res=db.post(_objectSpread({},params));return res;}catch(error){}};exports.dbNew=dbNew;var dbUpdate=function(){var _ref3=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee3(db,params){var res,response;return _regenerator[\"default\"].wrap(function _callee3$(_context3){while(1){switch(_context3.prev=_context3.next){case 0:_context3.next=2;return dbGet(db,params._id);case 2:res=_context3.sent;_context3.prev=3;_context3.next=6;return db.put(_objectSpread(_objectSpread({},params),{},{_rev:res._rev,_attachments:res._attachments}));case 6:response=_context3.sent;return _context3.abrupt(\"return\",response);case 10:_context3.prev=10;_context3.t0=_context3[\"catch\"](3);case 12:case\"end\":return _context3.stop();}}},_callee3,null,[[3,10]]);}));return function dbUpdate(_x5,_x6){return _ref3.apply(this,arguments);};}();exports.dbUpdate=dbUpdate;\n\n//# sourceURL=webpack://nolo/./common/api.js?");

/***/ }),

/***/ "./common/db.js":
/*!**********************!*\
  !*** ./common/db.js ***!
  \**********************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export connectDb [provided] [no usage info] [missing usage info prevents renaming] */
/*! export hostDb [provided] [no usage info] [missing usage info prevents renaming] */
/*! export linkDb [provided] [no usage info] [missing usage info prevents renaming] */
/*! export localDb [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.linkDb=exports.localDb=exports.hostDb=exports.connectDb=void 0;var _pouchdb=_interopRequireDefault(__webpack_require__(/*! pouchdb */ \"pouchdb\"));var _pouchdbAuthentication=_interopRequireDefault(__webpack_require__(/*! pouchdb-authentication */ \"pouchdb-authentication\"));var _pouchdbFind=_interopRequireDefault(__webpack_require__(/*! pouchdb-find */ \"pouchdb-find\"));var _tools=__webpack_require__(/*! ../common/tools */ \"./common/tools.js\");var dbArray=[\"tw.db.nolotus.com\"];var hostDbName=\"admin\";_pouchdb[\"default\"].plugin(_pouchdbAuthentication[\"default\"]).plugin(_pouchdbFind[\"default\"]);var connectDb=function connectDb(dbName){var remoteDbName=\"userdb-\"+(0,_tools.toHex)(dbName);var remoteAdress=\"https://\"+dbArray[0]+\"/\"+remoteDbName+\"/\";var remote=new _pouchdb[\"default\"](remoteAdress);var local=new _pouchdb[\"default\"](dbName);local.sync(remote,{live:true,retry:true}).on('change',function(change){}).on('complete',function(info){}).on('paused',function(info){}).on('active',function(info){}).on('error',function(err){});return{remote:remote,local:local};};exports.connectDb=connectDb;var hostDb=connectDb(hostDbName);exports.hostDb=hostDb;var localDb=new _pouchdb[\"default\"](\"localDb\");exports.localDb=localDb;var linkDb=connectDb('_users');exports.linkDb=linkDb;\n\n//# sourceURL=webpack://nolo/./common/db.js?");

/***/ }),

/***/ "./common/reducer.js":
/*!***************************!*\
  !*** ./common/reducer.js ***!
  \***************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _defineProperty2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"@babel/runtime/helpers/defineProperty\"));function ownKeys(object,enumerableOnly){var keys=Object.keys(object);if(Object.getOwnPropertySymbols){var symbols=Object.getOwnPropertySymbols(object);if(enumerableOnly)symbols=symbols.filter(function(sym){return Object.getOwnPropertyDescriptor(object,sym).enumerable;});keys.push.apply(keys,symbols);}return keys;}function _objectSpread(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]!=null?arguments[i]:{};if(i%2){ownKeys(Object(source),true).forEach(function(key){(0,_defineProperty2[\"default\"])(target,key,source[key]);});}else if(Object.getOwnPropertyDescriptors){Object.defineProperties(target,Object.getOwnPropertyDescriptors(source));}else{ownKeys(Object(source)).forEach(function(key){Object.defineProperty(target,key,Object.getOwnPropertyDescriptor(source,key));});}}return target;}var initState={templateName:\"simple\",userInfo:{},menu:[],setting:{},authData:{isLogin:false},userDb:{}};var reducer=function reducer(){var state=arguments.length>0&&arguments[0]!==undefined?arguments[0]:initState;var action=arguments.length>1?arguments[1]:undefined;switch(action.type){case\"fetch\":return _objectSpread(_objectSpread({},state),{},{users:action.payload});case\"loginSuccess\":return _objectSpread(_objectSpread({},state),{},{authData:{isLogin:true},userInfo:action.payload.userInfo,userDb:action.payload.userDb});case\"logout\":return _objectSpread(_objectSpread({},state),{},{authData:{isLogin:false},userInfo:{}});case\"initSuccess\":return _objectSpread(_objectSpread({},state),{},{menu:action.payload.menu,setting:action.payload.setting});default:return state;}};var _default=reducer;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./common/reducer.js?");

/***/ }),

/***/ "./common/selector.js":
/*!****************************!*\
  !*** ./common/selector.js ***!
  \****************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export selectUserInfo [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.selectUserInfo=void 0;var selectUserInfo=function selectUserInfo(state){return state.userInfo;};exports.selectUserInfo=selectUserInfo;\n\n//# sourceURL=webpack://nolo/./common/selector.js?");

/***/ }),

/***/ "./common/store.js":
/*!*************************!*\
  !*** ./common/store.js ***!
  \*************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _redux=__webpack_require__(/*! redux */ \"redux\");var _reducer=_interopRequireDefault(__webpack_require__(/*! ./reducer */ \"./common/reducer.js\"));var _global=_interopRequireDefault(__webpack_require__(/*! global */ \"global\"));var store=(0,_redux.createStore)(_reducer[\"default\"],_global[\"default\"].__REDUX_DEVTOOLS_EXTENSION__&&_global[\"default\"].__REDUX_DEVTOOLS_EXTENSION__());var _default=store;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./common/store.js?");

/***/ }),

/***/ "./common/tools.js":
/*!*************************!*\
  !*** ./common/tools.js ***!
  \*************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export themeMap [provided] [no usage info] [missing usage info prevents renaming] */
/*! export toHex [provided] [no usage info] [missing usage info prevents renaming] */
/*! export useTheme [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.useTheme=useTheme;exports.toHex=exports.themeMap=void 0;var _react=__webpack_require__(/*! react */ \"react\");var themeMap=new Map([[\"dark\",{\"button-color\":\"#FFF\"}],[\"light\",{primaryColor:\"#03a9f4\",backgroundColor:\"#fff\",borderRadius:\" 6px\",neutralShade3:\"#d1d3d4\",neutralShade4:'#babdbf'}]]);exports.themeMap=themeMap;var toHex=function toHex(str){var result=\"\";for(var i=0;i<str.length;i++){result+=str.charCodeAt(i).toString(16);}return result;};exports.toHex=toHex;function useTheme(theme){(0,_react.useLayoutEffect)(function(){for(var key in theme){document.documentElement.style.setProperty(\"--\"+key,theme[key]);}},[theme]);}\n\n//# sourceURL=webpack://nolo/./common/tools.js?");

/***/ }),

/***/ "./components/ArticleTitle/index.js":
/*!******************************************!*\
  !*** ./components/ArticleTitle/index.js ***!
  \******************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:421-425 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\ArticleTitle\\\\index.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  display: flex;\\n  margin-top: 5px;\\n  color: #1a1a1a;\\n  a{\\n   color:#1a1a1a;\\n   :hover{\\n    color: #6d6d6d;\\n   }\\n  }\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var Wrap=_styledComponents[\"default\"].div(_templateObject());var index=function index(props){var children=props.children;return _react[\"default\"].createElement(Wrap,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:17,columnNumber:10}},children);};index.propTypes={};var _default=index;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/ArticleTitle/index.js?");

/***/ }),

/***/ "./components/Article/index.js":
/*!*************************************!*\
  !*** ./components/Article/index.js ***!
  \*************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:526-530 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Article=void 0;var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _Editor=__webpack_require__(/*! ../../components/Editor */ \"./components/Editor/index.js\");var _propTypes=_interopRequireDefault(__webpack_require__(/*! prop-types */ \"prop-types\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Article\\\\index.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  width: 90%;\\n  max-width: 1050px;\\n  margin: 3em auto 0;\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var StyledArticle=_styledComponents[\"default\"].div(_templateObject());var Article=function Article(props){var doc=props.doc,_props$readOnly=props.readOnly,readOnly=_props$readOnly===void 0?true:_props$readOnly;console.log('doc',doc);return _react[\"default\"].createElement(StyledArticle,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:14,columnNumber:5}},_react[\"default\"].createElement(_Editor.CurrentEditor,{readOnly:readOnly,value:doc.content,__self:_this,__source:{fileName:_jsxFileName,lineNumber:15,columnNumber:7}}));};exports.Article=Article;Article.propTypes={doc:_propTypes[\"default\"].object,readOnly:_propTypes[\"default\"].bool};\n\n//# sourceURL=webpack://nolo/./components/Article/index.js?");

/***/ }),

/***/ "./components/Button/index.js":
/*!************************************!*\
  !*** ./components/Button/index.js ***!
  \************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:597-601 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _propTypes=_interopRequireDefault(__webpack_require__(/*! prop-types */ \"prop-types\"));var _Loading=__webpack_require__(/*! ../Loading */ \"./components/Loading/index.js\");var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Button\\\\index.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\noutline: none;\\nwidth: 100%;\\ntext-align: center;\\ndisplay: inline-block;\\nborder: none;\\nfont: 500 16px/1 \\\"Poppins\\\", sans-serif;\\npadding: 20px;\\ncursor: pointer;\\nborder-radius: var(--borderRadius);\\nbackground: var(--primaryColor);\\ncolor: var(--backgroundColor);\\nposition: relative;\\ntop: 0;\\ntransition: 0.2s ease;\\n:hover{\\n  top: -3px;\\nbox-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);\\n}\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var WrapButton=_styledComponents[\"default\"].div(_templateObject());var Button=function Button(props){var type=props.type,_props$loading=props.loading,loading=_props$loading===void 0?false:_props$loading,children=props.children,preIcon=props.preIcon;return _react[\"default\"].createElement(_react[\"default\"].Fragment,null,function(){switch(type){default:return _react[\"default\"].createElement(WrapButton,(0,_extends2[\"default\"])({type:\"button\"},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:34,columnNumber:15}}),preIcon?_react[\"default\"].createElement(_react[\"default\"].Fragment,null,loading?_react[\"default\"].createElement(_Loading.Loading,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:38,columnNumber:23}}):_react[\"default\"].createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:40,columnNumber:23}},\"icon placeholder\"),children):_react[\"default\"].createElement(_react[\"default\"].Fragment,null,loading?_react[\"default\"].createElement(_Loading.Loading,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:45,columnNumber:32}}):children));}}());};Button.propTypes={type:_propTypes[\"default\"].string,children:_propTypes[\"default\"].node,onClick:_propTypes[\"default\"].func,loading:_propTypes[\"default\"].bool,className:_propTypes[\"default\"].string,disable:_propTypes[\"default\"].bool,size:_propTypes[\"default\"].object,preIcon:_propTypes[\"default\"].string};var _default=Button;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Button/index.js?");

/***/ }),

/***/ "./components/Editor/index.js":
/*!************************************!*\
  !*** ./components/Editor/index.js ***!
  \************************************/
/*! flagged exports */
/*! export CurrentEditor [provided] [no usage info] [missing usage info prevents renaming] */
/*! export NextEditor [provided] [no usage info] [missing usage info prevents renaming] */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));Object.defineProperty(exports, \"CurrentEditor\", ({enumerable:true,get:function get(){return _neweditor[\"default\"];}}));Object.defineProperty(exports, \"NextEditor\", ({enumerable:true,get:function get(){return _myeditor[\"default\"];}}));var _neweditor=_interopRequireDefault(__webpack_require__(/*! ./neweditor */ \"./components/Editor/neweditor/index.js\"));var _myeditor=_interopRequireDefault(__webpack_require__(/*! ./myeditor */ \"./components/Editor/myeditor/index.js\"));\n\n//# sourceURL=webpack://nolo/./components/Editor/index.js?");

/***/ }),

/***/ "./components/Editor/myeditor/index.js":
/*!*********************************************!*\
  !*** ./components/Editor/myeditor/index.js ***!
  \*********************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:524-528 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _reactDom=_interopRequireWildcard(__webpack_require__(/*! react-dom */ \"react-dom\"));var _log=__webpack_require__(/*! ./log */ \"./components/Editor/myeditor/log.js\");var _render=__webpack_require__(/*! ./render */ \"./components/Editor/myeditor/render.js\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Editor\\\\myeditor\\\\index.js\";var Editor=function Editor(props){var onChange=props.onChange;var editorEl=(0,_react.useRef)(null);var _useState=(0,_react.useState)(''),_useState2=(0,_slicedToArray2[\"default\"])(_useState,2),htmlString=_useState2[0],setHtmlString=_useState2[1];var _useState3=(0,_react.useState)([{type:'text',text:'test'}]),_useState4=(0,_slicedToArray2[\"default\"])(_useState3,2),state=_useState4[0],setstate=_useState4[1];var onBeforeInput=function onBeforeInput(e){e.preventDefault();reallyChange(e,'input');};var compositionUpdate=function compositionUpdate(e){e.preventDefault();if(_log.logOption.compositionUpdate){console.log('compositionUpdate',e);}};var compositionStart=function compositionStart(e){e.preventDefault();if(_log.logOption.compositionStart){console.log('compositionStart',e);}};var compositionEnd=function compositionEnd(e){e.preventDefault();if(_log.logOption.compositionEnd){console.log('compositionEnd',e);}reallyChange(e,'composition');};var reallyChange=function reallyChange(e,from){(0,_reactDom.unstable_batchedUpdates)(function(){setHtmlString(\"\\n        <div>\"+(0,_render.stateToHtmlString)(state)+\"</div>\\n        <div style=\\\"display:inline;background:yellow;\\\">\"+Math.random()+\"</div>\");});};var onBlur=function onBlur(e){};return _react[\"default\"].createElement(_react[\"default\"].Fragment,null,_react[\"default\"].createElement(\"div\",{contentEditable:true,onBlur:onBlur,onBeforeInput:onBeforeInput,ref:editorEl,onCompositionUpdate:compositionUpdate,onCompositionStart:compositionStart,onCompositionEnd:compositionEnd,dangerouslySetInnerHTML:{__html:htmlString},__self:_this,__source:{fileName:_jsxFileName,lineNumber:63,columnNumber:7}}));};var _default=Editor;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Editor/myeditor/index.js?");

/***/ }),

/***/ "./components/Editor/myeditor/log.js":
/*!*******************************************!*\
  !*** ./components/Editor/myeditor/log.js ***!
  \*******************************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export logOption [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.logOption=void 0;var _reactDom=__webpack_require__(/*! react-dom */ \"react-dom\");var logOption={compositionUpdate:false,compositionStart:false,compositionEnd:false};exports.logOption=logOption;\n\n//# sourceURL=webpack://nolo/./components/Editor/myeditor/log.js?");

/***/ }),

/***/ "./components/Editor/myeditor/render.js":
/*!**********************************************!*\
  !*** ./components/Editor/myeditor/render.js ***!
  \**********************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:320-324 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.stateToHtmlString=exports.stateToReact=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _server=_interopRequireDefault(__webpack_require__(/*! react-dom/server */ \"react-dom/server\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Editor\\\\myeditor\\\\render.js\";var stateToReact=function stateToReact(stateArray){return _react[\"default\"].createElement(_react[\"default\"].Fragment,null,stateArray.map(function(node,index){console.log('node',node);return _react[\"default\"].createElement(\"div\",{key:'node'+index,__self:_this,__source:{fileName:_jsxFileName,lineNumber:89,columnNumber:16}},node.text);}));};exports.stateToReact=stateToReact;var stateToHtmlString=function stateToHtmlString(stateArray){var nextHtmlString=_server[\"default\"].renderToStaticMarkup(stateToReact(stateArray));console.log('nextHtmlString',nextHtmlString);return nextHtmlString;};exports.stateToHtmlString=stateToHtmlString;\n\n//# sourceURL=webpack://nolo/./components/Editor/myeditor/render.js?");

/***/ }),

/***/ "./components/Editor/neweditor/Element.js":
/*!************************************************!*\
  !*** ./components/Editor/neweditor/Element.js ***!
  \************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:497-501 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _slateReact=__webpack_require__(/*! slate-react */ \"slate-react\");var _emotion=__webpack_require__(/*! emotion */ \"emotion\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Editor\\\\neweditor\\\\Element.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n          display: block;\\n          max-width: 100%;\\n          max-height: 20em;\\n          box-shadow: \",\";\\n        \"]);_templateObject=function _templateObject(){return data;};return data;}var ImageElement=function ImageElement(_ref){var attributes=_ref.attributes,children=_ref.children,element=_ref.element;var selected=(0,_slateReact.useSelected)();var focused=(0,_slateReact.useFocused)();return _react[\"default\"].createElement(\"div\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:9,columnNumber:5}}),children,_react[\"default\"].createElement(\"img\",{src:element.url,className:(0,_emotion.css)(_templateObject(),selected&&focused?\"0 0 0 2px blue;\":\"none\"),__self:_this,__source:{fileName:_jsxFileName,lineNumber:11,columnNumber:7}}));};var Element=function Element(props){var attributes=props.attributes,children=props.children,element=props.element;switch(element.type){default:return _react[\"default\"].createElement(\"p\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:28,columnNumber:14}}),children);case\"block-quote\":case\"quote\":return _react[\"default\"].createElement(\"blockquote\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:31,columnNumber:14}}),children);case\"code\":return _react[\"default\"].createElement(\"pre\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:34,columnNumber:9}},_react[\"default\"].createElement(\"code\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:35,columnNumber:11}}),children));case\"bulleted-list\":return _react[\"default\"].createElement(\"ul\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:39,columnNumber:14}}),children);case\"title\":return _react[\"default\"].createElement(\"h1\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:41,columnNumber:14}}),children);case\"heading-one\":return _react[\"default\"].createElement(\"h1\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:43,columnNumber:14}}),children);case\"heading-two\":return _react[\"default\"].createElement(\"h2\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:45,columnNumber:14}}),children);case\"heading-three\":return _react[\"default\"].createElement(\"h3\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:47,columnNumber:14}}),children);case\"heading-four\":return _react[\"default\"].createElement(\"h4\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:49,columnNumber:14}}),children);case\"heading-five\":return _react[\"default\"].createElement(\"h5\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:51,columnNumber:14}}),children);case\"heading-six\":return _react[\"default\"].createElement(\"h6\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:53,columnNumber:14}}),children);case\"list-item\":return _react[\"default\"].createElement(\"li\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:55,columnNumber:14}}),children);case\"numbered-list\":return _react[\"default\"].createElement(\"ol\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:57,columnNumber:14}}),children);case\"link\":return _react[\"default\"].createElement(\"a\",(0,_extends2[\"default\"])({href:element.url},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:60,columnNumber:9}}),children);case\"image\":return _react[\"default\"].createElement(ImageElement,(0,_extends2[\"default\"])({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:65,columnNumber:14}}));}};var _default=Element;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Editor/neweditor/Element.js?");

/***/ }),

/***/ "./components/Editor/neweditor/constant.js":
/*!*************************************************!*\
  !*** ./components/Editor/neweditor/constant.js ***!
  \*************************************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export initialValue [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.initialValue=void 0;var initialValue=[{type:\"paragraph\",children:[{text:\"In addition to nodes that contain editable text, you can also create other types of nodes, like images or videos.\"}]},{type:\"image\",url:\"https://source.unsplash.com/kFrdX5IeQzI\",children:[{text:\"\"}]},{type:\"paragraph\",children:[{text:\"This example shows images in action. It features two ways to add images. You can either add an image via the toolbar icon above, or if you want in on a little secret, copy an image URL to your keyboard and paste it anywhere in the editor!\"}]},{children:[{text:\"This example shows how you can make a hovering menu appear above your content, which you can use to make text \"},{text:\"bold\",bold:true},{text:\", \"},{text:\"italic\",italic:true},{text:\", or anything else you might want to do!\"}]},{children:[{text:\"Try it out yourself! Just \"},{text:\"select any piece of text and the menu will appear\",bold:true},{text:\".\"}]},{type:\"paragraph\",children:[{text:\"This is editable \"},{text:\"rich\",bold:true},{text:\" text, \"},{text:\"much\",italic:true},{text:\" better than a \"},{text:\"<textarea>\",code:true},{text:\"!\"}]},{type:\"paragraph\",children:[{text:\"Since it's rich text, you can do things like turn a selection of text \"},{text:\"bold\",bold:true},{text:\", or add a semantically rendered block quote in the middle of the page, like this:\"}]},{type:\"block-quote\",children:[{text:\"A wise quote.\"}]},{type:\"paragraph\",children:[{text:\"Try it out for yourself!\"}]}];exports.initialValue=initialValue;\n\n//# sourceURL=webpack://nolo/./components/Editor/neweditor/constant.js?");

/***/ }),

/***/ "./components/Editor/neweditor/index.js":
/*!**********************************************!*\
  !*** ./components/Editor/neweditor/index.js ***!
  \**********************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:761-765 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=exports.deserialize=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _slateHyperscript=__webpack_require__(/*! slate-hyperscript */ \"slate-hyperscript\");var _slate=__webpack_require__(/*! slate */ \"slate\");var _slateHistory=__webpack_require__(/*! slate-history */ \"slate-history\");var _slateReact=__webpack_require__(/*! slate-react */ \"slate-react\");var _constant=__webpack_require__(/*! ./constant */ \"./components/Editor/neweditor/constant.js\");var _Element=_interopRequireDefault(__webpack_require__(/*! ./Element */ \"./components/Editor/neweditor/Element.js\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Editor\\\\neweditor\\\\index.js\";var ELEMENT_TAGS={A:function A(el){return{type:'link',url:el.getAttribute('href')};},BLOCKQUOTE:function BLOCKQUOTE(){return{type:'quote'};},H1:function H1(){return{type:'heading-one'};},H2:function H2(){return{type:'heading-two'};},H3:function H3(){return{type:'heading-three'};},H4:function H4(){return{type:'heading-four'};},H5:function H5(){return{type:'heading-five'};},H6:function H6(){return{type:'heading-six'};},IMG:function IMG(el){return{type:'image',url:el.getAttribute('src')};},LI:function LI(){return{type:'list-item'};},OL:function OL(){return{type:'numbered-list'};},P:function P(){return{type:'paragraph'};},PRE:function PRE(){return{type:'code'};},UL:function UL(){return{type:'bulleted-list'};}};var TEXT_TAGS={CODE:function CODE(){return{code:true};},DEL:function DEL(){return{strikethrough:true};},EM:function EM(){return{italic:true};},I:function I(){return{italic:true};},S:function S(){return{strikethrough:true};},STRONG:function STRONG(){return{bold:true};},U:function U(){return{underline:true};}};var deserialize=function deserialize(el){if(el.nodeType===3){return el.textContent;}else if(el.nodeType!==1){return null;}else if(el.nodeName==='BR'){return'\\n';}var nodeName=el.nodeName;var parent=el;if(nodeName==='PRE'&&el.childNodes[0]&&el.childNodes[0].nodeName==='CODE'){parent=el.childNodes[0];}var children=Array.from(parent.childNodes).map(deserialize).flat();if(el.nodeName==='BODY'){return(0,_slateHyperscript.jsx)('fragment',{},children);}if(ELEMENT_TAGS[nodeName]){var attrs=ELEMENT_TAGS[nodeName](el);return(0,_slateHyperscript.jsx)('element',attrs,children);}if(TEXT_TAGS[nodeName]){var _attrs=TEXT_TAGS[nodeName](el);return children.map(function(child){return(0,_slateHyperscript.jsx)('text',_attrs,child);});}return children;};exports.deserialize=deserialize;var SHORTCUTS={'*':'list-item','-':'list-item','+':'list-item','>':'block-quote','#':'heading-one','##':'heading-two','###':'heading-three','####':'heading-four','#####':'heading-five','######':'heading-six'};var withShortcuts=function withShortcuts(editor){var deleteBackward=editor.deleteBackward,insertText=editor.insertText;editor.insertText=function(text){var selection=editor.selection;if(text===' '&&selection&&_slate.Range.isCollapsed(selection)){var anchor=selection.anchor;var block=_slate.Editor.above(editor,{match:function match(n){return _slate.Editor.isBlock(editor,n);}});var path=block?block[1]:[];var start=_slate.Editor.start(editor,path);var range={anchor:anchor,focus:start};var beforeText=_slate.Editor.string(editor,range);var type=SHORTCUTS[beforeText];if(type){_slate.Transforms.select(editor,range);_slate.Transforms[\"delete\"](editor);_slate.Transforms.setNodes(editor,{type:type},{match:function match(n){return _slate.Editor.isBlock(editor,n);}});if(type==='list-item'){var list={type:'bulleted-list',children:[]};_slate.Transforms.wrapNodes(editor,list,{match:function match(n){return n.type==='list-item';}});}return;}}insertText(text);};editor.deleteBackward=function(){var selection=editor.selection;if(selection&&_slate.Range.isCollapsed(selection)){var match=_slate.Editor.above(editor,{match:function match(n){return _slate.Editor.isBlock(editor,n);}});if(match){var _match=(0,_slicedToArray2[\"default\"])(match,2),block=_match[0],path=_match[1];var start=_slate.Editor.start(editor,path);if(block.type!=='paragraph'&&_slate.Point.equals(selection.anchor,start)){_slate.Transforms.setNodes(editor,{type:'paragraph'});if(block.type==='list-item'){_slate.Transforms.unwrapNodes(editor,{match:function match(n){return n.type==='bulleted-list';},split:true});}return;}}deleteBackward.apply(void 0,arguments);}};return editor;};var WrapEditor=function WrapEditor(props){var readOnly=props.readOnly;var onChange=function onChange(value){console.log('value',value);var headingOneArray=value.filter(function(item){return item.type==='heading-one';})||[];var title=headingOneArray[0]&&headingOneArray[0].children[0].text;var json={title:title,content:value};props.onChange(json);setValue(value);};var _useState=(0,_react.useState)(props.value||_constant.initialValue),_useState2=(0,_slicedToArray2[\"default\"])(_useState,2),value=_useState2[0],setValue=_useState2[1];var renderElement=(0,_react.useCallback)(function(props){return _react[\"default\"].createElement(_Element[\"default\"],(0,_extends2[\"default\"])({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:173,columnNumber:48}}));},[]);var renderLeaf=(0,_react.useCallback)(function(props){return _react[\"default\"].createElement(Leaf,(0,_extends2[\"default\"])({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:174,columnNumber:45}}));},[]);var editor=(0,_react.useMemo)(function(){return withHtml(withShortcuts((0,_slateReact.withReact)((0,_slateHistory.withHistory)((0,_slate.createEditor)()))));},[]);return _react[\"default\"].createElement(_slateReact.Slate,{editor:editor,value:value,onChange:onChange,__self:_this,__source:{fileName:_jsxFileName,lineNumber:180,columnNumber:5}},_react[\"default\"].createElement(_slateReact.Editable,{readOnly:readOnly,renderElement:renderElement,renderLeaf:renderLeaf,placeholder:\"Write some markdown...\",spellCheck:true,autoFocus:true,__self:_this,__source:{fileName:_jsxFileName,lineNumber:181,columnNumber:7}}));};var withHtml=function withHtml(editor){var insertData=editor.insertData,isInline=editor.isInline,isVoid=editor.isVoid;editor.isInline=function(element){return element.type==='link'?true:isInline(element);};editor.isVoid=function(element){return element.type==='image'?true:isVoid(element);};editor.insertData=function(data){var html=data.getData('text/html');if(html){var parsed=new DOMParser().parseFromString(html,'text/html');var fragment=deserialize(parsed.body);_slate.Transforms.insertFragment(editor,fragment);return;}insertData(data);};return editor;};var Leaf=function Leaf(_ref){var attributes=_ref.attributes,children=_ref.children,leaf=_ref.leaf;if(leaf.bold){children=_react[\"default\"].createElement(\"strong\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:222,columnNumber:16}},children);}if(leaf.code){children=_react[\"default\"].createElement(\"code\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:226,columnNumber:16}},children);}if(leaf.italic){children=_react[\"default\"].createElement(\"em\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:230,columnNumber:16}},children);}if(leaf.underline){children=_react[\"default\"].createElement(\"u\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:234,columnNumber:16}},children);}if(leaf.strikethrough){children=_react[\"default\"].createElement(\"del\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:238,columnNumber:16}},children);}return _react[\"default\"].createElement(\"span\",(0,_extends2[\"default\"])({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:241,columnNumber:10}}),children);};var _default=WrapEditor;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Editor/neweditor/index.js?");

/***/ }),

/***/ "./components/Error/index.js":
/*!***********************************!*\
  !*** ./components/Error/index.js ***!
  \***********************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:421-425 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Error\\\\index.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  color: red;\\n  margin: 0 auto;\\n  width: 15vw;\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var WrapError=_styledComponents[\"default\"].div(_templateObject());var index=function index(props){var children=props.children;return _react[\"default\"].createElement(WrapError,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:10,columnNumber:10}},children);};var _default=index;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Error/index.js?");

/***/ }),

/***/ "./components/Header/index.js":
/*!************************************!*\
  !*** ./components/Header/index.js ***!
  \************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:821-825 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _api=__webpack_require__(/*! ../../common/api */ \"./common/api.js\");var _db=__webpack_require__(/*! ../../common/db */ \"./common/db.js\");var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _selector=__webpack_require__(/*! ../../common/selector */ \"./common/selector.js\");var _styled=__webpack_require__(/*! ./styled */ \"./components/Header/styled.js\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Header\\\\index.js\";var Header=function Header(){var _useState=(0,_react.useState)([{title:\"加载中\",path:\"\"}]),_useState2=(0,_slicedToArray2[\"default\"])(_useState,2),menu=_useState2[0],setmenu=_useState2[1];var userInfo=(0,_reactRedux.useSelector)(_selector.selectUserInfo);(0,_react.useEffect)(function(){var fetchData=function(){var _ref=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee(){var menu;return _regenerator[\"default\"].wrap(function _callee$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.next=2;return(0,_api.dbGet)(_db.hostDb.remote,\"menu\");case 2:menu=_context.sent;menu&&menu.result&&setmenu(menu.result);case 4:case\"end\":return _context.stop();}}},_callee);}));return function fetchData(){return _ref.apply(this,arguments);};}();fetchData();return function(){};},[]);return _react[\"default\"].createElement(_styled.WrapHeader,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:23,columnNumber:5}},_react[\"default\"].createElement(_styled.Menu,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:24,columnNumber:7}},_react[\"default\"].createElement(_styled.Logo,{href:\"/\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:25,columnNumber:9}},\"Nolotus\"),_react[\"default\"].createElement(_styled.Nav,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:27,columnNumber:9}},menu.map(function(item,index){return _react[\"default\"].createElement(_reactRouterDom.Link,{key:index,to:\"/\"+item.path,__self:_this,__source:{fileName:_jsxFileName,lineNumber:30,columnNumber:15}},item.path===\"self\"&&userInfo.name?userInfo.name:item.title);}))));};var _default=Header;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Header/index.js?");

/***/ }),

/***/ "./components/Header/styled.js":
/*!*************************************!*\
  !*** ./components/Header/styled.js ***!
  \*************************************/
/*! flagged exports */
/*! export Logo [provided] [no usage info] [missing usage info prevents renaming] */
/*! export Menu [provided] [no usage info] [missing usage info prevents renaming] */
/*! export Nav [provided] [no usage info] [missing usage info prevents renaming] */
/*! export WrapHeader [provided] [no usage info] [missing usage info prevents renaming] */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Logo=exports.Nav=exports.Menu=exports.WrapHeader=void 0;var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));function _templateObject4(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  color: #ffffff;\\n  display: flex;\\n  align-items: center;\\n  margin-right: 10px;\\n  width: calc(100% / 6);\\n\"]);_templateObject4=function _templateObject4(){return data;};return data;}function _templateObject3(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  height: 100%;\\n  display: flex;\\n  a {\\n    display: flex;\\n    transition: color 0.2s ease-out;\\n    align-items: center;\\n    padding-left: 20px;\\n    padding-right: 20px;\\n    font-size: 18px;\\n    color: #ffffff;\\n    font-weight: 300;\\n    :hover {\\n      color: var(--primaryColor);\\n    }\\n  }\\n\"]);_templateObject3=function _templateObject3(){return data;};return data;}function _templateObject2(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  display: flex;\\n  height: 60px;\\n  width: 90%;\\n  max-width: 1260px;\\n  margin: auto;\\n\"]);_templateObject2=function _templateObject2(){return data;};return data;}function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  background-color: #20232a;\\n    display: flex;\\n    width: 100%;\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var WrapHeader=_styledComponents[\"default\"].header(_templateObject());exports.WrapHeader=WrapHeader;var Menu=_styledComponents[\"default\"].div(_templateObject2());exports.Menu=Menu;var Nav=_styledComponents[\"default\"].nav(_templateObject3());exports.Nav=Nav;var Logo=_styledComponents[\"default\"].a(_templateObject4());exports.Logo=Logo;\n\n//# sourceURL=webpack://nolo/./components/Header/styled.js?");

/***/ }),

/***/ "./components/Input/index.js":
/*!***********************************!*\
  !*** ./components/Input/index.js ***!
  \***********************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:501-505 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Input\\\\index.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  display: block;\\n  margin: 20px auto;\\n  position: relative;\\n  width: 100%;\\n  max-width: 280px;\\n  * {\\n    box-sizing: border-box;\\n  }\\n  .label {\\n    position: absolute;\\n    top: 1.1rem;\\n    left: 0;\\n    font-size: 1.1rem;\\n    color: var(--neutralShade4);\\n    opacity: 1;\\n    font-weight: 500;\\n    transform-origin: 0 0;\\n    transition: all 0.2s ease;\\n  }\\n  .border {\\n    position: absolute;\\n    bottom: 0;\\n    left: 0;\\n    height: 2px;\\n    width: 100%;\\n    background: var(--primaryColor);\\n    transform: scaleX(0);\\n    transform-origin: 0 0;\\n    transition: all 0.15s ease;\\n  }\\n  input {\\n    -webkit-appearance: none;\\n    width: 100%;\\n    border: 0;\\n    font-family: inherit;\\n    padding: 12px 0;\\n    height: 48px;\\n    font-size: 1.1rem;\\n    font-weight: 500;\\n    border-bottom: 2px solid var(--neutralShade3);\\n\\n    background: none;\\n    border-radius: 0;\\n    color: #223254;\\n    transition: all 0.15s ease;\\n  }\\n  input:hover {\\n    background: rgba(34, 50, 84, 0.03);\\n  }\\n  input:not(:placeholder-shown) + span {\\n    color: #5a667f;\\n    transform: translateY(-28px) scale(1);\\n  }\\n  input:focus {\\n    background: none;\\n    outline: none;\\n  }\\n  \",\"\\n  input:focus + span {\\n    color: var(--primaryColor);\\n    transform: translateY(-28px) scale(0.9);\\n  }\\n  input:focus + span + .border {\\n    transform: scaleX(1);\\n  }\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var WrapInput=_styledComponents[\"default\"].label(_templateObject(),\"\");var index=function index(props){var name=props.name;return _react[\"default\"].createElement(WrapInput,{htmlFor:name,__self:_this,__source:{fileName:_jsxFileName,lineNumber:73,columnNumber:5}},_react[\"default\"].createElement(\"input\",(0,_extends2[\"default\"])({type:\"text\"},props,{id:name,placeholder:\"\\xA0\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:74,columnNumber:7}})),_react[\"default\"].createElement(\"span\",{className:\"label\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:75,columnNumber:7}},props.label),_react[\"default\"].createElement(\"span\",{className:\"border\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:76,columnNumber:7}}));};var _default=index;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Input/index.js?");

/***/ }),

/***/ "./components/Loading/index.js":
/*!*************************************!*\
  !*** ./components/Loading/index.js ***!
  \*************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:521-525 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Loading=exports.LoadingBox=exports.LoadingPage=void 0;var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _reactFontawesome=__webpack_require__(/*! @fortawesome/react-fontawesome */ \"@fortawesome/react-fontawesome\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Loading\\\\index.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n\\n  body {\\n    margin: 0;\\n  }\\n\\n  h1 {\\n    font-family: \\\"Lato\\\", sans-serif;\\n    font-weight: 300;\\n    letter-spacing: 2px;\\n    font-size: 48px;\\n  }\\n  p {\\n    font-family: \\\"Lato\\\", sans-serif;\\n    letter-spacing: 1px;\\n    font-size: 14px;\\n    color: #333333;\\n  }\\n\\n  .header {\\n    position: relative;\\n    text-align: center;\\n    background: linear-gradient(\\n      60deg,\\n      rgba(84, 58, 183, 1) 0%,\\n      rgba(0, 172, 193, 1) 100%\\n    );\\n    color: white;\\n  }\\n  .logo {\\n    width: 50px;\\n    fill: white;\\n    padding-right: 15px;\\n    display: inline-block;\\n    vertical-align: middle;\\n  }\\n\\n  .inner-header {\\n    height: 65vh;\\n    width: 100%;\\n    margin: 0;\\n    padding: 0;\\n  }\\n\\n  .flex {\\n    /*Flexbox for containers*/\\n    display: flex;\\n    justify-content: center;\\n    align-items: center;\\n    text-align: center;\\n  }\\n\\n  .waves {\\n    position: relative;\\n    width: 100%;\\n    height: 15vh;\\n    margin-bottom: -7px; /*Fix for safari gap*/\\n    min-height: 100px;\\n    max-height: 150px;\\n  }\\n\\n  .content {\\n    position: relative;\\n    height: 20vh;\\n    text-align: center;\\n    background-color: white;\\n  }\\n\\n  /* Animation */\\n\\n  .parallax > use {\\n    animation: move-forever 25s cubic-bezier(0.55, 0.5, 0.45, 0.5) infinite;\\n  }\\n  .parallax > use:nth-child(1) {\\n    animation-delay: -2s;\\n    animation-duration: 7s;\\n  }\\n  .parallax > use:nth-child(2) {\\n    animation-delay: -3s;\\n    animation-duration: 10s;\\n  }\\n  .parallax > use:nth-child(3) {\\n    animation-delay: -4s;\\n    animation-duration: 13s;\\n  }\\n  .parallax > use:nth-child(4) {\\n    animation-delay: -5s;\\n    animation-duration: 20s;\\n  }\\n  @keyframes move-forever {\\n    0% {\\n      transform: translate3d(-90px, 0, 0);\\n    }\\n    100% {\\n      transform: translate3d(85px, 0, 0);\\n    }\\n  }\\n  /*Shrinking for mobile*/\\n  @media (max-width: 768px) {\\n    .waves {\\n      height: 40px;\\n      min-height: 40px;\\n    }\\n    .content {\\n      height: 30vh;\\n    }\\n    h1 {\\n      font-size: 24px;\\n    }\\n  }\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var StyledLoading=_styledComponents[\"default\"].div(_templateObject());var LoadingPage=function LoadingPage(){return _react[\"default\"].createElement(StyledLoading,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:118,columnNumber:5}},_react[\"default\"].createElement(\"div\",{className:\"header\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:119,columnNumber:7}},_react[\"default\"].createElement(\"div\",{className:\"inner-header flex\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:120,columnNumber:9}},_react[\"default\"].createElement(\"h1\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:122,columnNumber:11}},\"Loading\")),_react[\"default\"].createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:125,columnNumber:9}},_react[\"default\"].createElement(\"svg\",{className:\"waves\",xmlns:\"http://www.w3.org/2000/svg\",viewBox:\"0 24 150 28\",preserveAspectRatio:\"none\",shapeRendering:\"auto\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:126,columnNumber:11}},_react[\"default\"].createElement(\"defs\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:133,columnNumber:13}},_react[\"default\"].createElement(\"path\",{id:\"gentle-wave\",d:\"M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:134,columnNumber:15}})),_react[\"default\"].createElement(\"g\",{className:\"parallax\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:139,columnNumber:13}},_react[\"default\"].createElement(\"use\",{xlinkHref:\"#gentle-wave\",x:\"48\",y:\"0\",fill:\"rgba(255,255,255,0.7\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:140,columnNumber:15}}),_react[\"default\"].createElement(\"use\",{xlinkHref:\"#gentle-wave\",x:\"48\",y:\"3\",fill:\"rgba(255,255,255,0.5)\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:146,columnNumber:15}}),_react[\"default\"].createElement(\"use\",{xlinkHref:\"#gentle-wave\",x:\"48\",y:\"5\",fill:\"rgba(255,255,255,0.3)\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:152,columnNumber:15}}),_react[\"default\"].createElement(\"use\",{xlinkHref:\"#gentle-wave\",x:\"48\",y:\"7\",fill:\"#fff\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:158,columnNumber:15}}))))),_react[\"default\"].createElement(\"div\",{className:\"content flex\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:164,columnNumber:7}},_react[\"default\"].createElement(\"p\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:165,columnNumber:9}},\"powerd by | nolotus | Free to use\")));};exports.LoadingPage=LoadingPage;var LoadingBox=function LoadingBox(){return _react[\"default\"].createElement(\"div\",{className:\"loadding-box\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:172,columnNumber:13}},_react[\"default\"].createElement(_reactFontawesome.FontAwesomeIcon,{className:\"loading\",icon:['fas','spinner'],__self:_this,__source:{fileName:_jsxFileName,lineNumber:174,columnNumber:1}}));};exports.LoadingBox=LoadingBox;var Loading=function Loading(){_react[\"default\"].createElement(_reactFontawesome.FontAwesomeIcon,{className:\"loading\",icon:['fas','spinner'],__self:_this,__source:{fileName:_jsxFileName,lineNumber:180,columnNumber:3}});};exports.Loading=Loading;\n\n//# sourceURL=webpack://nolo/./components/Loading/index.js?");

/***/ }),

/***/ "./components/Tabs/index.js":
/*!**********************************!*\
  !*** ./components/Tabs/index.js ***!
  \**********************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:540-544 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Tab=exports.Tabs=exports.WrapTab=exports.WrapTabs=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\Tabs\\\\index.js\";function _templateObject2(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  display: flex;\\n  justify-content: center;\\n  align-items: center;\\n  width: 10vw;\\n  padding: 10px ;\\n  border-bottom: \",\";\\n\"]);_templateObject2=function _templateObject2(){return data;};return data;}function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  display: flex;\\n  margin: 0 auto;\\n  width: 20vw;\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var WrapTabs=_styledComponents[\"default\"].div(_templateObject());exports.WrapTabs=WrapTabs;var WrapTab=_styledComponents[\"default\"].div(_templateObject2(),function(props){return props.active?\"2px solid var(--primaryColor)\":\"none\";});exports.WrapTab=WrapTab;var Tabs=function Tabs(props){var children=props.children;return _react[\"default\"].createElement(WrapTabs,(0,_extends2[\"default\"])({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:19,columnNumber:10}}),children);};exports.Tabs=Tabs;var Tab=function Tab(props){var children=props.children;return _react[\"default\"].createElement(WrapTab,(0,_extends2[\"default\"])({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:23,columnNumber:10}}),children);};exports.Tab=Tab;\n\n//# sourceURL=webpack://nolo/./components/Tabs/index.js?");

/***/ }),

/***/ "./components/UserCard/index.js":
/*!**************************************!*\
  !*** ./components/UserCard/index.js ***!
  \**************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:665-669 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _propTypes=_interopRequireDefault(__webpack_require__(/*! prop-types */ \"prop-types\"));var _api=__webpack_require__(/*! ../../common/api */ \"./common/api.js\");var _tools=__webpack_require__(/*! ../../common/tools */ \"./common/tools.js\");var _db=__webpack_require__(/*! ../../common/db */ \"./common/db.js\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\components\\\\UserCard\\\\index.js\";var UserCard=function UserCard(props){var name=props.name;(0,_react.useEffect)(function(){var getData=function(){var _ref=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee(){var result,userDb,list;return _regenerator[\"default\"].wrap(function _callee$(_context){while(1){switch(_context.prev=_context.next){case 0:console.log(\"getData\");_context.prev=1;_context.next=4;return(0,_api.dbGet)(_db.linkDb.remote,\"org.couchdb.user:\"+name);case 4:result=_context.sent;console.log(\"result\",result);userDb=(0,_db.connectDb)(\"userdb-\"+(0,_tools.toHex)(name));console.log(\"userDb\",userDb);_context.next=10;return userDb.remote.allDocs({include_docs:true});case 10:list=_context.sent;console.log(\"list\",list);console.log(\"result\",result);_context.next=18;break;case 15:_context.prev=15;_context.t0=_context[\"catch\"](1);console.log(_context.t0);case 18:case\"end\":return _context.stop();}}},_callee,null,[[1,15]]);}));return function getData(){return _ref.apply(this,arguments);};}();getData();return function(){};},[name]);return _react[\"default\"].createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:32,columnNumber:10}},name);};var _default=UserCard;exports.default=_default;UserCard.propTypes={name:_propTypes[\"default\"].string.isRequired};\n\n//# sourceURL=webpack://nolo/./components/UserCard/index.js?");

/***/ }),

/***/ "./pages/Create.js":
/*!*************************!*\
  !*** ./pages/Create.js ***!
  \*************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:1054-1058 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _template=_interopRequireDefault(__webpack_require__(/*! ../template */ \"./template/index.js\"));var _Editor=__webpack_require__(/*! ../components/Editor */ \"./components/Editor/index.js\");var _lodash=_interopRequireDefault(__webpack_require__(/*! lodash */ \"lodash\"));var _constant=__webpack_require__(/*! ../components/Editor/neweditor/constant */ \"./components/Editor/neweditor/constant.js\");var _api=__webpack_require__(/*! ../common/api */ \"./common/api.js\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _styled=_interopRequireDefault(__webpack_require__(/*! @emotion/styled */ \"@emotion/styled\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\pages\\\\Create.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  width: 80vw;\\n  margin: 100px auto;\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var CreateWrapper=_styled[\"default\"].div(_templateObject());var Create=function Create(){var _useState=(0,_react.useState)(),_useState2=(0,_slicedToArray2[\"default\"])(_useState,2),_id=_useState2[0],setId=_useState2[1];var _useState3=(0,_react.useState)(),_useState4=(0,_slicedToArray2[\"default\"])(_useState3,2),_rev=_useState4[0],setRev=_useState4[1];var onChange=function(){var _ref=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee(json){var title,content,isSame,type,data,res,_data,_res;return _regenerator[\"default\"].wrap(function _callee$(_context){while(1){switch(_context.prev=_context.next){case 0:title=json.title,content=json.content;isSame=_lodash[\"default\"].isEqual(content,_constant.initialValue);if(isSame){_context.next=20;break;}if(!_id){_context.next=14;break;}type='article';data={title:title,type:type,content:content,_id:_id};_context.next=8;return(0,_api.dbUpdate)(_db.localDb,data);case 8:res=_context.sent;console.log('update',res);res&&setRev(res.rev);console.log('result',res);_context.next=20;break;case 14:_data={title:title,type:'article',content:content,status:'draft'};_context.next=17;return(0,_api.dbNew)(_db.localDb,_data);case 17:_res=_context.sent;console.log('res',_res);setId(_res.id);case 20:case\"end\":return _context.stop();}}},_callee);}));return function onChange(_x){return _ref.apply(this,arguments);};}();return _react[\"default\"].createElement(_template[\"default\"],{__self:_this,__source:{fileName:_jsxFileName,lineNumber:44,columnNumber:5}},_react[\"default\"].createElement(CreateWrapper,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:45,columnNumber:7}},_rev,_react[\"default\"].createElement(_Editor.NextEditor,{onChange:onChange,__self:_this,__source:{fileName:_jsxFileName,lineNumber:47,columnNumber:9}})));};var _default=Create;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./pages/Create.js?");

/***/ }),

/***/ "./pages/Find.js":
/*!***********************!*\
  !*** ./pages/Find.js ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:782-786 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _template=_interopRequireDefault(__webpack_require__(/*! ../template */ \"./template/index.js\"));var _UserCard=_interopRequireDefault(__webpack_require__(/*! ../components/UserCard */ \"./components/UserCard/index.js\"));var _api=__webpack_require__(/*! ../common/api */ \"./common/api.js\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\pages\\\\Find.js\";var Find=function Find(){var _useState=(0,_react.useState)([]),_useState2=(0,_slicedToArray2[\"default\"])(_useState,2),friends=_useState2[0],setFriends=_useState2[1];(0,_react.useEffect)(function(){var getData=function(){var _ref=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee(){var result;return _regenerator[\"default\"].wrap(function _callee$(_context){while(1){switch(_context.prev=_context.next){case 0:console.log(\"getData\");_context.prev=1;_context.next=4;return(0,_api.dbGet)(_db.hostDb.remote,\"friends\");case 4:result=_context.sent;console.log(\"result\",result);result&&setFriends(result.list);_context.next=12;break;case 9:_context.prev=9;_context.t0=_context[\"catch\"](1);console.log(_context.t0);case 12:case\"end\":return _context.stop();}}},_callee,null,[[1,9]]);}));return function getData(){return _ref.apply(this,arguments);};}();getData();return function(){};},[]);return _react[\"default\"].createElement(_template[\"default\"],{__self:_this,__source:{fileName:_jsxFileName,lineNumber:24,columnNumber:5}},_react[\"default\"].createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:26,columnNumber:1}},\" \\u4F4F\\u5728\\u672C\\u7AD9\\u7684\\u7AD9\\u70B9\"),_react[\"default\"].createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:27,columnNumber:7}},friends.map(function(item){return _react[\"default\"].createElement(_UserCard[\"default\"],{name:item,key:item,__self:_this,__source:{fileName:_jsxFileName,lineNumber:29,columnNumber:18}});})),_react[\"default\"].createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:33,columnNumber:7}},\" \\u6DFB\\u52A0\\u4F60\\u7684\\u4E2A\\u4EBA\\u7F51\\u7AD9\\uFF0C\\u8BA9\\u66F4\\u591A\\u4EBA\\u770B\\u5230\\u4F60\\uFF08\\u6682\\u672A\\u5F00\\u653E\\uFF09\"),_react[\"default\"].createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:35,columnNumber:7}},\"\\u63A8\\u8350\\u7684\\u7F51\\u7AD9\"),_react[\"default\"].createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:37,columnNumber:7}},\"\\u63A8\\u8350\\u7684\\u5185\\u5BB9\"));};var _default=Find;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./pages/Find.js?");

/***/ }),

/***/ "./pages/Home.js":
/*!***********************!*\
  !*** ./pages/Home.js ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:762-766 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _Loading=__webpack_require__(/*! ../components/Loading */ \"./components/Loading/index.js\");var _Page=__webpack_require__(/*! ./Page */ \"./pages/Page.js\");var _api=__webpack_require__(/*! ../common/api */ \"./common/api.js\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\pages\\\\Home.js\";var Home=function Home(){var _useState=(0,_react.useState)(true),_useState2=(0,_slicedToArray2[\"default\"])(_useState,2),loading=_useState2[0],setLoading=_useState2[1];var dispatch=(0,_reactRedux.useDispatch)();var _useSelector=(0,_reactRedux.useSelector)(function(state){return state.setting;}),home=_useSelector.home;(0,_react.useEffect)(function(){var fetchData=function(){var _ref=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee(){var menu,setting;return _regenerator[\"default\"].wrap(function _callee$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.next=2;return(0,_api.dbGet)(_db.hostDb.remote,\"menu\").result;case 2:_context.t0=_context.sent;if(_context.t0){_context.next=5;break;}_context.t0=[];case 5:menu=_context.t0;_context.next=8;return(0,_api.dbGet)(_db.hostDb.remote,\"setting\");case 8:_context.t1=_context.sent;if(_context.t1){_context.next=11;break;}_context.t1={};case 11:setting=_context.t1;dispatch({type:\"initSuccess\",payload:{menu:menu,setting:setting}});setLoading(false);case 14:case\"end\":return _context.stop();}}},_callee);}));return function fetchData(){return _ref.apply(this,arguments);};}();fetchData();return function(){};},[dispatch]);return _react[\"default\"].createElement(_react[\"default\"].Fragment,null,loading?_react[\"default\"].createElement(_Loading.LoadingPage,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:25,columnNumber:23}}):_react[\"default\"].createElement(_Page.Page,{_id:home,__self:_this,__source:{fileName:_jsxFileName,lineNumber:25,columnNumber:41}}));};var _default=Home;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./pages/Home.js?");

/***/ }),

/***/ "./pages/Life.js":
/*!***********************!*\
  !*** ./pages/Life.js ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:1228-1232 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _defineProperty2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"@babel/runtime/helpers/defineProperty\"));var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _reactFontawesome=__webpack_require__(/*! @fortawesome/react-fontawesome */ \"@fortawesome/react-fontawesome\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _template=_interopRequireDefault(__webpack_require__(/*! ../template */ \"./template/index.js\"));var _api=__webpack_require__(/*! ../common/api */ \"./common/api.js\");var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _ArticleTitle=_interopRequireDefault(__webpack_require__(/*! ../components/ArticleTitle */ \"./components/ArticleTitle/index.js\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\pages\\\\Life.js\";function ownKeys(object,enumerableOnly){var keys=Object.keys(object);if(Object.getOwnPropertySymbols){var symbols=Object.getOwnPropertySymbols(object);if(enumerableOnly)symbols=symbols.filter(function(sym){return Object.getOwnPropertyDescriptor(object,sym).enumerable;});keys.push.apply(keys,symbols);}return keys;}function _objectSpread(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]!=null?arguments[i]:{};if(i%2){ownKeys(Object(source),true).forEach(function(key){(0,_defineProperty2[\"default\"])(target,key,source[key]);});}else if(Object.getOwnPropertyDescriptors){Object.defineProperties(target,Object.getOwnPropertyDescriptors(source));}else{ownKeys(Object(source)).forEach(function(key){Object.defineProperty(target,key,Object.getOwnPropertyDescriptor(source,key));});}}return target;}function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n  width: 90%;\\n  max-width: 1050px;\\n  margin: 3em auto 0;\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var StyledLife=_styledComponents[\"default\"].div(_templateObject());var Life=function Life(){var _useState=(0,_react.useState)([]),_useState2=(0,_slicedToArray2[\"default\"])(_useState,2),list=_useState2[0],setList=_useState2[1];var _useState3=(0,_react.useState)(_db.hostDb.remote),_useState4=(0,_slicedToArray2[\"default\"])(_useState3,2),currentDb=_useState4[0],setCurrentDb=_useState4[1];var dispatch=(0,_reactRedux.useDispatch)();var getData=function getData(){(0,_api.dbAll)(currentDb).then(function(result){if(result){console.log(\"result\",result);setList(result.rows);}});};var goDelete=function goDelete(id){currentDb.get(id).then(function(){var _ref=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee(doc){var result;return _regenerator[\"default\"].wrap(function _callee$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.next=2;return currentDb.remove(doc);case 2:result=_context.sent;console.log(\"handleDetele\",result);getData();closeModal();case 6:case\"end\":return _context.stop();}}},_callee);}));return function(_x){return _ref.apply(this,arguments);};}())[\"catch\"](function(err){console.log(err);});};var modal=function modal(modalInfo){dispatch({type:\"modal\",modalInfo:_objectSpread(_objectSpread({},modalInfo),{},{isVisible:true})});};var closeModal=function closeModal(){return dispatch({type:\"modal\",modalInfo:{isVisible:false}});};(0,_react.useEffect)(function(){(0,_api.dbAll)(currentDb).then(function(result){if(result){console.log(\"result\",result);setList(result.rows);}});return function(){};},[]);var handleDetele=function(){var _ref2=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee2(id){return _regenerator[\"default\"].wrap(function _callee2$(_context2){while(1){switch(_context2.prev=_context2.next){case 0:modal({modalType:\"warning\",title:\"\\u786E\\u8BA4\\u5220\\u9664\\uFF1F\",content:\"\\u5220\\u9664\\u5185\\u5BB9\\u4E0D\\u53EF\\u6062\\u590D\\uFF01\",buttons:[{text:\"取消\",className:\"button-warning-cancel\",onClick:closeModal},{text:\"确认\",className:\"button-warning-blue\",onClick:function onClick(){goDelete(id);}}]});case 1:case\"end\":return _context2.stop();}}},_callee2);}));return function handleDetele(_x2){return _ref2.apply(this,arguments);};}();return _react[\"default\"].createElement(_template[\"default\"],{__self:_this,__source:{fileName:_jsxFileName,lineNumber:79,columnNumber:5}},_react[\"default\"].createElement(StyledLife,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:80,columnNumber:7}},list.map(function(post){return _react[\"default\"].createElement(_ArticleTitle[\"default\"],{key:post.id,__self:_this,__source:{fileName:_jsxFileName,lineNumber:82,columnNumber:11}},_react[\"default\"].createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:83,columnNumber:13}},_react[\"default\"].createElement(_reactRouterDom.Link,{to:{pathname:post.doc._id},__self:_this,__source:{fileName:_jsxFileName,lineNumber:84,columnNumber:15}},post.doc.title||post.doc._id)),_react[\"default\"].createElement(\"div\",{className:\"delete-button\",onClick:function onClick(){return handleDetele(post.doc._id);},__self:_this,__source:{fileName:_jsxFileName,lineNumber:89,columnNumber:13}},_react[\"default\"].createElement(_reactFontawesome.FontAwesomeIcon,{icon:[\"fas\",\"times\"],__self:_this,__source:{fileName:_jsxFileName,lineNumber:93,columnNumber:15}})));})));};var _default=Life;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./pages/Life.js?");

/***/ }),

/***/ "./pages/Page.js":
/*!***********************!*\
  !*** ./pages/Page.js ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:844-848 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Page=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _api=__webpack_require__(/*! ../common/api */ \"./common/api.js\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _Article=__webpack_require__(/*! ../components/Article */ \"./components/Article/index.js\");var _template=_interopRequireDefault(__webpack_require__(/*! ../template */ \"./template/index.js\"));var _Loading=__webpack_require__(/*! ../components/Loading */ \"./components/Loading/index.js\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\pages\\\\Page.js\";var Page=function Page(props){var _id=(0,_reactRouterDom.useParams)().id||props._id;var _useState=(0,_react.useState)(),_useState2=(0,_slicedToArray2[\"default\"])(_useState,2),doc=_useState2[0],setDoc=_useState2[1];(0,_react.useEffect)(function(){var getdata=function(){var _ref=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee(){var doc;return _regenerator[\"default\"].wrap(function _callee$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.next=2;return(0,_api.dbGet)(_db.hostDb.remote,_id);case 2:doc=_context.sent;doc!==undefined&&setDoc(doc);case 4:case\"end\":return _context.stop();}}},_callee);}));return function getdata(){return _ref.apply(this,arguments);};}();getdata();return function(){};},[_id]);return _react[\"default\"].createElement(_template[\"default\"],{__self:_this,__source:{fileName:_jsxFileName,lineNumber:22,columnNumber:5}},doc?_react[\"default\"].createElement(_Article.Article,{doc:doc,__self:_this,__source:{fileName:_jsxFileName,lineNumber:23,columnNumber:12}}):_react[\"default\"].createElement(_Loading.LoadingBox,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:23,columnNumber:34}}));};exports.Page=Page;\n\n//# sourceURL=webpack://nolo/./pages/Page.js?");

/***/ }),

/***/ "./pages/Self/index.js":
/*!*****************************!*\
  !*** ./pages/Self/index.js ***!
  \*****************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:1147-1151 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _defineProperty2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"@babel/runtime/helpers/defineProperty\"));var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _template=_interopRequireDefault(__webpack_require__(/*! ../../template */ \"./template/index.js\"));var _styled=__webpack_require__(/*! ./styled */ \"./pages/Self/styled.js\");var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _Button=_interopRequireDefault(__webpack_require__(/*! ../../components/Button */ \"./components/Button/index.js\"));var _Input=_interopRequireDefault(__webpack_require__(/*! ../../components/Input */ \"./components/Input/index.js\"));var _Error=_interopRequireDefault(__webpack_require__(/*! ../../components/Error */ \"./components/Error/index.js\"));var _Tabs=__webpack_require__(/*! ../../components/Tabs */ \"./components/Tabs/index.js\");var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _db=__webpack_require__(/*! ../../common/db */ \"./common/db.js\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\pages\\\\Self\\\\index.js\";function ownKeys(object,enumerableOnly){var keys=Object.keys(object);if(Object.getOwnPropertySymbols){var symbols=Object.getOwnPropertySymbols(object);if(enumerableOnly)symbols=symbols.filter(function(sym){return Object.getOwnPropertyDescriptor(object,sym).enumerable;});keys.push.apply(keys,symbols);}return keys;}function _objectSpread(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]!=null?arguments[i]:{};if(i%2){ownKeys(Object(source),true).forEach(function(key){(0,_defineProperty2[\"default\"])(target,key,source[key]);});}else if(Object.getOwnPropertyDescriptors){Object.defineProperties(target,Object.getOwnPropertyDescriptors(source));}else{ownKeys(Object(source)).forEach(function(key){Object.defineProperty(target,key,Object.getOwnPropertyDescriptor(source,key));});}}return target;}var Self=function Self(props){var history=(0,_reactRouterDom.useHistory)();var dispatch=(0,_reactRedux.useDispatch)();var _useState=(0,_react.useState)(\"signin\"),_useState2=(0,_slicedToArray2[\"default\"])(_useState,2),type=_useState2[0],setType=_useState2[1];var _useState3=(0,_react.useState)(),_useState4=(0,_slicedToArray2[\"default\"])(_useState3,2),error=_useState4[0],setError=_useState4[1];var _useSelector=(0,_reactRedux.useSelector)(function(state){return state.authData;}),isLogin=_useSelector.isLogin;var dbLogin=function(){var _ref=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee(username,password){var doc,userInfo,userDb;return _regenerator[\"default\"].wrap(function _callee$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.prev=0;console.log('hostDb',_db.hostDb);_context.next=4;return _db.hostDb.remote.login(username,password);case 4:doc=_context.sent;console.log(\"logininfo\",doc);if(doc.ok){userInfo={name:doc.name,roles:doc.roles};userDb=(0,_db.connectDb)(doc.name);dispatch({type:\"loginSuccess\",payload:{userInfo:userInfo,userDb:userDb}});history.push(\"/setting\");}return _context.abrupt(\"return\",doc);case 10:_context.prev=10;_context.t0=_context[\"catch\"](0);return _context.abrupt(\"return\",_context.t0);case 13:case\"end\":return _context.stop();}}},_callee,null,[[0,10]]);}));return function dbLogin(_x,_x2){return _ref.apply(this,arguments);};}();var dbSignUp=function(){var _ref2=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee2(username,password){var doc;return _regenerator[\"default\"].wrap(function _callee2$(_context2){while(1){switch(_context2.prev=_context2.next){case 0:_context2.prev=0;_context2.next=3;return _db.hostDb.remote.signUp(username,password);case 3:doc=_context2.sent;console.log(\"signUpinfo\",doc);if(doc.ok){alert(\"注册成功\");dbLogin(username,password);}return _context2.abrupt(\"return\",doc);case 9:_context2.prev=9;_context2.t0=_context2[\"catch\"](0);return _context2.abrupt(\"return\",_context2.t0);case 12:case\"end\":return _context2.stop();}}},_callee2,null,[[0,9]]);}));return function dbSignUp(_x3,_x4){return _ref2.apply(this,arguments);};}();isLogin&&history.push(\"/setting\");var _useState5=(0,_react.useState)({username:\"\",password:\"\"}),_useState6=(0,_slicedToArray2[\"default\"])(_useState5,2),state=_useState6[0],setstate=_useState6[1];var login=function(){var _ref3=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee3(){var result;return _regenerator[\"default\"].wrap(function _callee3$(_context3){while(1){switch(_context3.prev=_context3.next){case 0:_context3.next=2;return dbLogin(state.username,state.password);case 2:result=_context3.sent;console.log(\"loginresult\",result);if(result.error){setError(result.message);}case 5:case\"end\":return _context3.stop();}}},_callee3);}));return function login(){return _ref3.apply(this,arguments);};}();var signup=function(){var _ref4=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee4(){var result;return _regenerator[\"default\"].wrap(function _callee4$(_context4){while(1){switch(_context4.prev=_context4.next){case 0:_context4.next=2;return dbSignUp(state.username,state.password);case 2:result=_context4.sent;if(result.error===\"conflict\"){setError(\"此用户名已被注册\");}case 4:case\"end\":return _context4.stop();}}},_callee4);}));return function signup(){return _ref4.apply(this,arguments);};}();var submit=function submit(e){e.preventDefault();type===\"signin\"?login():signup();};var _onChange=function onChange(key,value){console.log(key,value);setstate(_objectSpread(_objectSpread({},state),{},(0,_defineProperty2[\"default\"])({},key,value)));};return _react[\"default\"].createElement(_template[\"default\"],{__self:_this,__source:{fileName:_jsxFileName,lineNumber:80,columnNumber:5}},_react[\"default\"].createElement(_styled.WrapSelf,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:81,columnNumber:7}},_react[\"default\"].createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:82,columnNumber:9}},_react[\"default\"].createElement(_Tabs.Tabs,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:83,columnNumber:11}},_react[\"default\"].createElement(_Tabs.Tab,{active:type===\"signin\",onClick:function onClick(){setType(\"signin\");},__self:_this,__source:{fileName:_jsxFileName,lineNumber:84,columnNumber:13}},\"\\u767B\\u5F55\"),_react[\"default\"].createElement(_Tabs.Tab,{active:type===\"signup\",onClick:function onClick(){setType(\"signup\");},__self:_this,__source:{fileName:_jsxFileName,lineNumber:92,columnNumber:13}},\"\\u6CE8\\u518C\")),_react[\"default\"].createElement(\"form\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:102,columnNumber:11}},_react[\"default\"].createElement(_Error[\"default\"],{__self:_this,__source:{fileName:_jsxFileName,lineNumber:103,columnNumber:13}},error),_react[\"default\"].createElement(_Input[\"default\"],{label:\"\\u540D\\u5B57\",onChange:function onChange(e){return _onChange(\"username\",e.target.value);},name:\"name\",type:\"text\",id:\"inp\",placeholder:\"\\xA0\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:104,columnNumber:13}}),_react[\"default\"].createElement(_Input[\"default\"],{label:\"\\u5BC6\\u7801\",onChange:function onChange(e){return _onChange(\"password\",e.target.value);},name:\"password\",type:\"password\",placeholder:\"\\xA0\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:113,columnNumber:13}}),_react[\"default\"].createElement(_Button[\"default\"],{onClick:submit,__self:_this,__source:{fileName:_jsxFileName,lineNumber:120,columnNumber:13}},\"\\u63D0\\u4EA4\")))));};var _default=Self;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./pages/Self/index.js?");

/***/ }),

/***/ "./pages/Self/styled.js":
/*!******************************!*\
  !*** ./pages/Self/styled.js ***!
  \******************************/
/*! flagged exports */
/*! export WrapSelf [provided] [no usage info] [missing usage info prevents renaming] */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.WrapSelf=void 0;var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\nform {\\n    width: 280px;\\n    margin:auto;\\n}\\n\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var WrapSelf=_styledComponents[\"default\"].div(_templateObject());exports.WrapSelf=WrapSelf;\n\n//# sourceURL=webpack://nolo/./pages/Self/styled.js?");

/***/ }),

/***/ "./pages/Setting.js":
/*!**************************!*\
  !*** ./pages/Setting.js ***!
  \**************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:357-361 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Setting=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _template=_interopRequireDefault(__webpack_require__(/*! ../template */ \"./template/index.js\"));var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\pages\\\\Setting.js\";var Setting=function Setting(){var dispatch=(0,_reactRedux.useDispatch)();var logout=function logout(){_db.hostDb.remote.logOut(function(err,response){dispatch({type:\"logout\"});if(err){}history.push(\"/\");});};return _react[\"default\"].createElement(_template[\"default\"],{__self:_this,__source:{fileName:_jsxFileName,lineNumber:18,columnNumber:5}},_react[\"default\"].createElement(\"div\",{onClick:logout,__self:_this,__source:{fileName:_jsxFileName,lineNumber:19,columnNumber:7}},\"\\u9000\\u51FA\\u767B\\u5F55\"));};exports.Setting=Setting;\n\n//# sourceURL=webpack://nolo/./pages/Setting.js?");

/***/ }),

/***/ "./server/config.js":
/*!**************************!*\
  !*** ./server/config.js ***!
  \**************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export env [provided] [no usage info] [missing usage info prevents renaming] */
/*! export isDevEnv [provided] [no usage info] [missing usage info prevents renaming] */
/*! export isProdEnv [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.isDevEnv=exports.isProdEnv=exports.env=void 0;var env=\"development\";exports.env=env;var isProdEnv=env==='production';exports.isProdEnv=isProdEnv;var isDevEnv=env==='development';exports.isDevEnv=isDevEnv;\n\n//# sourceURL=webpack://nolo/./server/config.js?");

/***/ }),

/***/ "./server/render.js":
/*!**************************!*\
  !*** ./server/render.js ***!
  \**************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:538-542 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _reactHelmet=_interopRequireDefault(__webpack_require__(/*! react-helmet */ \"react-helmet\"));var _server=__webpack_require__(/*! react-dom/server */ \"react-dom/server\");var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _reactRouterConfig=__webpack_require__(/*! react-router-config */ \"react-router-config\");var _Routes=_interopRequireDefault(__webpack_require__(/*! ../common/Routes */ \"./common/Routes.js\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\server\\\\render.js\";var render=function render(req,store){var content=(0,_server.renderToString)(_react[\"default\"].createElement(_reactRedux.Provider,{store:store,__self:_this,__source:{fileName:_jsxFileName,lineNumber:11,columnNumber:5}},_react[\"default\"].createElement(_reactRouterDom.StaticRouter,{location:req.path,__self:_this,__source:{fileName:_jsxFileName,lineNumber:12,columnNumber:7}},(0,_reactRouterConfig.renderRoutes)(_Routes[\"default\"]))));var helmet=_reactHelmet[\"default\"].renderStatic();var html=\"\\n    <html \"+helmet.htmlAttributes.toString()+\">\\n      <head>\\n    <link rel=\\\"stylesheet\\\" href=\\\"/common.css\\\" type=\\\"text/css\\\" />\\n\\n      \"+helmet.title.toString()+\"\\n      \"+helmet.meta.toString()+\"\\n      \"+helmet.link.toString()+\"\\n      </head>\\n      <body \"+helmet.bodyAttributes.toString()+\">\\n        <div id=\\\"root\\\">\"+content+\"</div>\\n        <script src=\\\"bundle.js\\\"></script>\\n      </body>\\n    </html>\\n  \";return html;};var _default=render;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./server/render.js?");

/***/ }),

/***/ "./template/Simple.js":
/*!****************************!*\
  !*** ./template/Simple.js ***!
  \****************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:465-469 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _Header=_interopRequireDefault(__webpack_require__(/*! ../components/Header */ \"./components/Header/index.js\"));var _styledComponents=__webpack_require__(/*! styled-components */ \"styled-components\");var _this=this,_jsxFileName=\"D:\\\\nolo\\\\template\\\\Simple.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2[\"default\"])([\"\\n body {\\n  margin: 0;\\n  padding: 0;\\n  font-family: -apple-system, BlinkMacSystemFont, \\\"Segoe UI\\\", \\\"Roboto\\\", \\\"Oxygen\\\",\\n    \\\"Ubuntu\\\", \\\"Cantarell\\\", \\\"Fira Sans\\\", \\\"Droid Sans\\\", \\\"Helvetica Neue\\\",\\n    sans-serif;\\n  -webkit-font-smoothing: antialiased;\\n  -moz-osx-font-smoothing: grayscale;\\n}\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var GlobalStyle=(0,_styledComponents.createGlobalStyle)(_templateObject());var simple=function simple(props){var children=props.children;return _react[\"default\"].createElement(_react[\"default\"].Fragment,null,_react[\"default\"].createElement(GlobalStyle,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:19,columnNumber:7}}),_react[\"default\"].createElement(_Header[\"default\"],{__self:_this,__source:{fileName:_jsxFileName,lineNumber:20,columnNumber:7}}),children);};var _default=simple;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./template/Simple.js?");

/***/ }),

/***/ "./template/index.js":
/*!***************************!*\
  !*** ./template/index.js ***!
  \***************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:698-702 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"@babel/runtime/helpers/asyncToGenerator\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _Simple=_interopRequireDefault(__webpack_require__(/*! ./Simple */ \"./template/Simple.js\"));var _this=this,_jsxFileName=\"D:\\\\nolo\\\\template\\\\index.js\";function getSession(){return _getSession.apply(this,arguments);}function _getSession(){_getSession=(0,_asyncToGenerator2[\"default\"])(_regenerator[\"default\"].mark(function _callee(){var doc;return _regenerator[\"default\"].wrap(function _callee$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.prev=0;_context.next=3;return _db.hostDb.remote.getSession();case 3:doc=_context.sent;return _context.abrupt(\"return\",doc);case 7:_context.prev=7;_context.t0=_context[\"catch\"](0);console.log('err',_context.t0);case 10:case\"end\":return _context.stop();}}},_callee,null,[[0,7]]);}));return _getSession.apply(this,arguments);}var Template=function Template(props){var templateName=(0,_reactRedux.useSelector)(function(state){return state.templateName;});var dispatch=(0,_reactRedux.useDispatch)();(0,_react.useEffect)(function(){getSession().then(function(doc){if(doc.userCtx.name!==null){var userDb=(0,_db.connectDb)(doc.userCtx.name);var userInfo=doc.userCtx;dispatch({type:'loginSuccess',payload:{userInfo:userInfo,userDb:userDb}});}});return function(){};},[]);switch(templateName){case'simple':return _react[\"default\"].createElement(_Simple[\"default\"],(0,_extends2[\"default\"])({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:30,columnNumber:14}}));default:return _react[\"default\"].createElement(_Simple[\"default\"],(0,_extends2[\"default\"])({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:33,columnNumber:14}}));}};var _default=Template;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./template/index.js?");

/***/ }),

/***/ "@babel/runtime/helpers/asyncToGenerator":
/*!**********************************************************!*\
  !*** external "@babel/runtime/helpers/asyncToGenerator" ***!
  \**********************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@babel/runtime/helpers/asyncToGenerator\");;\n\n//# sourceURL=webpack://nolo/external_%22@babel/runtime/helpers/asyncToGenerator%22?");

/***/ }),

/***/ "@babel/runtime/helpers/defineProperty":
/*!********************************************************!*\
  !*** external "@babel/runtime/helpers/defineProperty" ***!
  \********************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@babel/runtime/helpers/defineProperty\");;\n\n//# sourceURL=webpack://nolo/external_%22@babel/runtime/helpers/defineProperty%22?");

/***/ }),

/***/ "@babel/runtime/helpers/extends":
/*!*************************************************!*\
  !*** external "@babel/runtime/helpers/extends" ***!
  \*************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@babel/runtime/helpers/extends\");;\n\n//# sourceURL=webpack://nolo/external_%22@babel/runtime/helpers/extends%22?");

/***/ }),

/***/ "@babel/runtime/helpers/interopRequireDefault":
/*!***************************************************************!*\
  !*** external "@babel/runtime/helpers/interopRequireDefault" ***!
  \***************************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@babel/runtime/helpers/interopRequireDefault\");;\n\n//# sourceURL=webpack://nolo/external_%22@babel/runtime/helpers/interopRequireDefault%22?");

/***/ }),

/***/ "@babel/runtime/helpers/interopRequireWildcard":
/*!****************************************************************!*\
  !*** external "@babel/runtime/helpers/interopRequireWildcard" ***!
  \****************************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@babel/runtime/helpers/interopRequireWildcard\");;\n\n//# sourceURL=webpack://nolo/external_%22@babel/runtime/helpers/interopRequireWildcard%22?");

/***/ }),

/***/ "@babel/runtime/helpers/slicedToArray":
/*!*******************************************************!*\
  !*** external "@babel/runtime/helpers/slicedToArray" ***!
  \*******************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@babel/runtime/helpers/slicedToArray\");;\n\n//# sourceURL=webpack://nolo/external_%22@babel/runtime/helpers/slicedToArray%22?");

/***/ }),

/***/ "@babel/runtime/helpers/taggedTemplateLiteralLoose":
/*!********************************************************************!*\
  !*** external "@babel/runtime/helpers/taggedTemplateLiteralLoose" ***!
  \********************************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@babel/runtime/helpers/taggedTemplateLiteralLoose\");;\n\n//# sourceURL=webpack://nolo/external_%22@babel/runtime/helpers/taggedTemplateLiteralLoose%22?");

/***/ }),

/***/ "@babel/runtime/regenerator":
/*!*********************************************!*\
  !*** external "@babel/runtime/regenerator" ***!
  \*********************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@babel/runtime/regenerator\");;\n\n//# sourceURL=webpack://nolo/external_%22@babel/runtime/regenerator%22?");

/***/ }),

/***/ "@emotion/styled":
/*!**********************************!*\
  !*** external "@emotion/styled" ***!
  \**********************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@emotion/styled\");;\n\n//# sourceURL=webpack://nolo/external_%22@emotion/styled%22?");

/***/ }),

/***/ "@fortawesome/react-fontawesome":
/*!*************************************************!*\
  !*** external "@fortawesome/react-fontawesome" ***!
  \*************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@fortawesome/react-fontawesome\");;\n\n//# sourceURL=webpack://nolo/external_%22@fortawesome/react-fontawesome%22?");

/***/ }),

/***/ "emotion":
/*!**************************!*\
  !*** external "emotion" ***!
  \**************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"emotion\");;\n\n//# sourceURL=webpack://nolo/external_%22emotion%22?");

/***/ }),

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"express\");;\n\n//# sourceURL=webpack://nolo/external_%22express%22?");

/***/ }),

/***/ "global":
/*!*************************!*\
  !*** external "global" ***!
  \*************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"global\");;\n\n//# sourceURL=webpack://nolo/external_%22global%22?");

/***/ }),

/***/ "greenlock-express":
/*!************************************!*\
  !*** external "greenlock-express" ***!
  \************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"greenlock-express\");;\n\n//# sourceURL=webpack://nolo/external_%22greenlock-express%22?");

/***/ }),

/***/ "http-proxy-middleware":
/*!****************************************!*\
  !*** external "http-proxy-middleware" ***!
  \****************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"http-proxy-middleware\");;\n\n//# sourceURL=webpack://nolo/external_%22http-proxy-middleware%22?");

/***/ }),

/***/ "lodash":
/*!*************************!*\
  !*** external "lodash" ***!
  \*************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"lodash\");;\n\n//# sourceURL=webpack://nolo/external_%22lodash%22?");

/***/ }),

/***/ "pouchdb":
/*!**************************!*\
  !*** external "pouchdb" ***!
  \**************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"pouchdb\");;\n\n//# sourceURL=webpack://nolo/external_%22pouchdb%22?");

/***/ }),

/***/ "pouchdb-authentication":
/*!*****************************************!*\
  !*** external "pouchdb-authentication" ***!
  \*****************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"pouchdb-authentication\");;\n\n//# sourceURL=webpack://nolo/external_%22pouchdb-authentication%22?");

/***/ }),

/***/ "pouchdb-find":
/*!*******************************!*\
  !*** external "pouchdb-find" ***!
  \*******************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"pouchdb-find\");;\n\n//# sourceURL=webpack://nolo/external_%22pouchdb-find%22?");

/***/ }),

/***/ "prop-types":
/*!*****************************!*\
  !*** external "prop-types" ***!
  \*****************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"prop-types\");;\n\n//# sourceURL=webpack://nolo/external_%22prop-types%22?");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"react\");;\n\n//# sourceURL=webpack://nolo/external_%22react%22?");

/***/ }),

/***/ "react-dom":
/*!****************************!*\
  !*** external "react-dom" ***!
  \****************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"react-dom\");;\n\n//# sourceURL=webpack://nolo/external_%22react-dom%22?");

/***/ }),

/***/ "react-dom/server":
/*!***********************************!*\
  !*** external "react-dom/server" ***!
  \***********************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"react-dom/server\");;\n\n//# sourceURL=webpack://nolo/external_%22react-dom/server%22?");

/***/ }),

/***/ "react-helmet":
/*!*******************************!*\
  !*** external "react-helmet" ***!
  \*******************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"react-helmet\");;\n\n//# sourceURL=webpack://nolo/external_%22react-helmet%22?");

/***/ }),

/***/ "react-redux":
/*!******************************!*\
  !*** external "react-redux" ***!
  \******************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"react-redux\");;\n\n//# sourceURL=webpack://nolo/external_%22react-redux%22?");

/***/ }),

/***/ "react-router-config":
/*!**************************************!*\
  !*** external "react-router-config" ***!
  \**************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"react-router-config\");;\n\n//# sourceURL=webpack://nolo/external_%22react-router-config%22?");

/***/ }),

/***/ "react-router-dom":
/*!***********************************!*\
  !*** external "react-router-dom" ***!
  \***********************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"react-router-dom\");;\n\n//# sourceURL=webpack://nolo/external_%22react-router-dom%22?");

/***/ }),

/***/ "redux":
/*!************************!*\
  !*** external "redux" ***!
  \************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"redux\");;\n\n//# sourceURL=webpack://nolo/external_%22redux%22?");

/***/ }),

/***/ "slate":
/*!************************!*\
  !*** external "slate" ***!
  \************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"slate\");;\n\n//# sourceURL=webpack://nolo/external_%22slate%22?");

/***/ }),

/***/ "slate-history":
/*!********************************!*\
  !*** external "slate-history" ***!
  \********************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"slate-history\");;\n\n//# sourceURL=webpack://nolo/external_%22slate-history%22?");

/***/ }),

/***/ "slate-hyperscript":
/*!************************************!*\
  !*** external "slate-hyperscript" ***!
  \************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"slate-hyperscript\");;\n\n//# sourceURL=webpack://nolo/external_%22slate-hyperscript%22?");

/***/ }),

/***/ "slate-react":
/*!******************************!*\
  !*** external "slate-react" ***!
  \******************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"slate-react\");;\n\n//# sourceURL=webpack://nolo/external_%22slate-react%22?");

/***/ }),

/***/ "styled-components":
/*!************************************!*\
  !*** external "styled-components" ***!
  \************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"styled-components\");;\n\n//# sourceURL=webpack://nolo/external_%22styled-components%22?");

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
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
(() => {
/*!*************************!*\
  !*** ./server/index.js ***!
  \*************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__ */
eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _express=_interopRequireDefault(__webpack_require__(/*! express */ \"express\"));var _render=_interopRequireDefault(__webpack_require__(/*! ./render */ \"./server/render.js\"));var _reactRouterConfig=__webpack_require__(/*! react-router-config */ \"react-router-config\");var _Routes=_interopRequireDefault(__webpack_require__(/*! ../common/Routes */ \"./common/Routes.js\"));var _store=_interopRequireDefault(__webpack_require__(/*! ../common/store */ \"./common/store.js\"));var _config=__webpack_require__(/*! ./config */ \"./server/config.js\");var app=(0,_express[\"default\"])();var _require=__webpack_require__(/*! http-proxy-middleware */ \"http-proxy-middleware\"),createProxyMiddleware=_require.createProxyMiddleware;if(_config.isProdEnv){var filter=function filter(pathname,req){return req.hostname===\"tw.db.nolotus.com\";};var dbProxy=createProxyMiddleware(filter,{target:\"http://localhost:5984\",changeOrigin:true});app.use(\"/\",dbProxy);}app.use(_express[\"default\"][\"static\"](\"public\"));app.get(\"*\",function(req,res){var promises=(0,_reactRouterConfig.matchRoutes)(_Routes[\"default\"],req.path).map(function(_ref){var route=_ref.route;var component=route.component;return component.getInitialData?component.getInitialData(_store[\"default\"]):null;});Promise.all(promises).then(function(){var html=(0,_render[\"default\"])(req,_store[\"default\"]);res.send(html);});});console.log('env',_config.env);if(_config.isProdEnv){__webpack_require__(/*! greenlock-express */ \"greenlock-express\").init({packageRoot:process.cwd(),configDir:\"./greenlock.d\",maintainerEmail:\"s@nolotus.com\",cluster:false}).serve(app);}else{app.listen(80,function(){return console.log(\"localhost develop 80!\");});}\n\n//# sourceURL=webpack://nolo/./server/index.js?");
})();

/******/ })()
;