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

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _Home=_interopRequireDefault(__webpack_require__(/*! ../pages/Home */ \"./pages/Home.js\"));var _Create=_interopRequireDefault(__webpack_require__(/*! ../pages/Create */ \"./pages/Create.js\"));var _Life=_interopRequireDefault(__webpack_require__(/*! ../pages/Life */ \"./pages/Life.js\"));var _Find=_interopRequireDefault(__webpack_require__(/*! ../pages/Find */ \"./pages/Find.js\"));var _Self=_interopRequireDefault(__webpack_require__(/*! ../pages/Self */ \"./pages/Self/index.js\"));var _Setting=__webpack_require__(/*! ../pages/Setting */ \"./pages/Setting.js\");var _Page=__webpack_require__(/*! ../pages/Page */ \"./pages/Page.js\");var Routes=[{exact:true,path:'/',component:_Home.default},{path:'/create',component:_Create.default},{path:'/life',component:_Life.default},{path:'/find',component:_Find.default},{path:'/self',component:_Self.default},{path:'/setting',component:_Setting.Setting},{path:'/:id',component:_Page.Page}];var _default=Routes;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./common/Routes.js?");

/***/ }),

/***/ "./common/api.js":
/*!***********************!*\
  !*** ./common/api.js ***!
  \***********************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbAll [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbDelete [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbGet [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbNew [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbUpdate [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.dbUpdate=exports.dbDelete=exports.dbNew=exports.dbGet=exports.dbAll=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var dbAll=function dbAll(db){var result;return _regenerator.default.async(function dbAll$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.prev=0;_context.next=3;return _regenerator.default.awrap(db.allDocs({include_docs:true}));case 3:result=_context.sent;return _context.abrupt(\"return\",result);case 7:_context.prev=7;_context.t0=_context[\"catch\"](0);case 9:case\"end\":return _context.stop();}}},null,null,[[0,7]],Promise);};exports.dbAll=dbAll;var dbGet=function dbGet(db,_id,option){var doc;return _regenerator.default.async(function dbGet$(_context2){while(1){switch(_context2.prev=_context2.next){case 0:_context2.prev=0;_context2.next=3;return _regenerator.default.awrap(db.get(_id,option?option:{attachments:true}));case 3:doc=_context2.sent;return _context2.abrupt(\"return\",doc);case 7:_context2.prev=7;_context2.t0=_context2[\"catch\"](0);console.log('err',db,_context2.t0);case 10:case\"end\":return _context2.stop();}}},null,null,[[0,7]],Promise);};exports.dbGet=dbGet;var dbNew=function dbNew(db,params){try{var res=db.post((0,_extends2.default)({},params));return res;}catch(error){}};exports.dbNew=dbNew;var dbDelete=function dbDelete(db,id){var doc,result;return _regenerator.default.async(function dbDelete$(_context3){while(1){switch(_context3.prev=_context3.next){case 0:_context3.prev=0;_context3.next=3;return _regenerator.default.awrap(db.get(id));case 3:doc=_context3.sent;_context3.next=6;return _regenerator.default.awrap(db.remove(doc));case 6:result=_context3.sent;console.log('result',result);return _context3.abrupt(\"return\",result);case 11:_context3.prev=11;_context3.t0=_context3[\"catch\"](0);console.log('err',_context3.t0);case 14:case\"end\":return _context3.stop();}}},null,null,[[0,11]],Promise);};exports.dbDelete=dbDelete;var dbUpdate=function dbUpdate(db,params){var res,response;return _regenerator.default.async(function dbUpdate$(_context4){while(1){switch(_context4.prev=_context4.next){case 0:_context4.next=2;return _regenerator.default.awrap(dbGet(db,params._id));case 2:res=_context4.sent;_context4.prev=3;_context4.next=6;return _regenerator.default.awrap(db.put((0,_extends2.default)({},params,{_rev:res._rev,_attachments:res._attachments})));case 6:response=_context4.sent;return _context4.abrupt(\"return\",response);case 10:_context4.prev=10;_context4.t0=_context4[\"catch\"](3);case 12:case\"end\":return _context4.stop();}}},null,null,[[3,10]],Promise);};exports.dbUpdate=dbUpdate;\n\n//# sourceURL=webpack://nolo/./common/api.js?");

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

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.linkDb=exports.localDb=exports.hostDb=exports.connectDb=void 0;var _pouchdb=_interopRequireDefault(__webpack_require__(/*! pouchdb */ \"pouchdb\"));var _pouchdbAuthentication=_interopRequireDefault(__webpack_require__(/*! pouchdb-authentication */ \"pouchdb-authentication\"));var _pouchdbFind=_interopRequireDefault(__webpack_require__(/*! pouchdb-find */ \"pouchdb-find\"));var _tools=__webpack_require__(/*! ../common/tools */ \"./common/tools.js\");var dbArray=['tw.db.nolotus.com'];var hostDbName='admin';_pouchdb.default.plugin(_pouchdbAuthentication.default).plugin(_pouchdbFind.default);var connectDb=function connectDb(dbName){var remoteDbName='userdb-'+(0,_tools.toHex)(dbName);var remoteAdress=\"https://\"+dbArray[0]+\"/\"+remoteDbName+\"/\";var remote=new _pouchdb.default(remoteAdress);var local=new _pouchdb.default(dbName);local.sync(remote,{live:true,retry:true}).on('change',function(change){}).on('complete',function(info){}).on('paused',function(info){}).on('active',function(info){}).on('error',function(err){console.log('sync err',err);});return{remote:remote,local:local};};exports.connectDb=connectDb;var hostDb=connectDb(hostDbName);exports.hostDb=hostDb;var localDb=new _pouchdb.default('localDb');exports.localDb=localDb;var linkDb=connectDb('_users');exports.linkDb=linkDb;\n\n//# sourceURL=webpack://nolo/./common/db.js?");

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

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _menu=__webpack_require__(/*! ../config/menu */ \"./config/menu.js\");var _db=__webpack_require__(/*! ./db */ \"./common/db.js\");var initState={templateName:'simple',userInfo:null,navs:_menu.defaultNavConfig,setting:{},authData:{isLogin:false},userDb:null,modalInfo:{isVisible:false}};var reducer=function reducer(){var state=arguments.length>0&&arguments[0]!==undefined?arguments[0]:initState;var action=arguments.length>1?arguments[1]:undefined;var payload=action.payload;switch(action.type){case'fetch':return(0,_extends2.default)({},state,{users:action.payload});case'modal':return(0,_extends2.default)({},state,{modalInfo:(0,_extends2.default)({isVisible:true},payload.modalInfo)});case'closeModal':return(0,_extends2.default)({},state,{modalInfo:{isVisible:false}});case'loginSuccess':return(0,_extends2.default)({},state,{authData:{isLogin:true},userInfo:action.payload.userInfo,userDb:action.payload.userDb});case'logout':return(0,_extends2.default)({},state,{authData:{isLogin:false},userInfo:{}});case'initSuccess':return(0,_extends2.default)({},state,{nav:action.payload.nav,setting:action.payload.setting});default:return state;}};var _default=reducer;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./common/reducer.js?");

/***/ }),

/***/ "./common/selector.js":
/*!****************************!*\
  !*** ./common/selector.js ***!
  \****************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export selectCurrentDb [provided] [no usage info] [missing usage info prevents renaming] */
/*! export selectNavs [provided] [no usage info] [missing usage info prevents renaming] */
/*! export selectUserDb [provided] [no usage info] [missing usage info prevents renaming] */
/*! export selectUserInfo [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.selectCurrentDb=exports.selectNavs=exports.selectUserDb=exports.selectUserInfo=void 0;var _db=__webpack_require__(/*! ./db */ \"./common/db.js\");var selectUserInfo=function selectUserInfo(state){return state.userInfo;};exports.selectUserInfo=selectUserInfo;var selectUserDb=function selectUserDb(state){return state.userDb;};exports.selectUserDb=selectUserDb;var selectNavs=function selectNavs(state){return state.navs;};exports.selectNavs=selectNavs;var selectCurrentDb=function selectCurrentDb(state){return state.userInfo?state.userDb:_db.hostDb;};exports.selectCurrentDb=selectCurrentDb;\n\n//# sourceURL=webpack://nolo/./common/selector.js?");

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

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _redux=__webpack_require__(/*! redux */ \"redux\");var _reducer=_interopRequireDefault(__webpack_require__(/*! ./reducer */ \"./common/reducer.js\"));var _global=_interopRequireDefault(__webpack_require__(/*! global */ \"global\"));var store=(0,_redux.createStore)(_reducer.default,_global.default.__REDUX_DEVTOOLS_EXTENSION__&&_global.default.__REDUX_DEVTOOLS_EXTENSION__());var _default=store;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./common/store.js?");

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

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.useTheme=useTheme;exports.toHex=exports.themeMap=void 0;var _react=__webpack_require__(/*! react */ \"react\");var themeMap=new Map([['dark',{'button-color':'#FFF'}],['light',{primaryColor:'#03a9f4',backgroundColor:'#fff',borderRadius:' 6px',neutralShade3:'#d1d3d4',neutralShade4:'#babdbf'}]]);exports.themeMap=themeMap;var toHex=function toHex(str){var result='';for(var i=0;i<str.length;i++){result+=str.charCodeAt(i).toString(16);}return result;};exports.toHex=toHex;function useTheme(theme){(0,_react.useLayoutEffect)(function(){for(var key in theme){document.documentElement.style.setProperty(\"--\"+key,theme[key]);}},[theme]);}\n\n//# sourceURL=webpack://nolo/./common/tools.js?");

/***/ }),

/***/ "./components/Article/index.js":
/*!*************************************!*\
  !*** ./components/Article/index.js ***!
  \*************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:586-590 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Article=void 0;var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _Editor=__webpack_require__(/*! ../../components/Editor */ \"./components/Editor/index.js\");var _propTypes=_interopRequireDefault(__webpack_require__(/*! prop-types */ \"prop-types\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Article/index.js\";var StyledArticle=_styledComponents.default.div.withConfig({displayName:\"Article__StyledArticle\",componentId:\"sc-1d1r98v-0\"})([\"width:90%;max-width:1050px;margin:3em auto 0;\"]);var Article=function Article(props){var doc=props.doc,_props$readOnly=props.readOnly,readOnly=_props$readOnly===void 0?true:_props$readOnly;var _useState=(0,_react.useState)([]),_useState2=(0,_slicedToArray2.default)(_useState,2),content=_useState2[0],setcontent=_useState2[1];(0,_react.useEffect)(function(){console.log('doc',doc);switch(doc.version){case'0.0.2':setcontent(doc.content);break;default:setcontent(doc.content);}return function(){};},[doc]);return _react.default.createElement(StyledArticle,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:27,columnNumber:5}},_react.default.createElement(_Editor.CurrentEditor,{readOnly:readOnly,value:content,__self:_this,__source:{fileName:_jsxFileName,lineNumber:28,columnNumber:7}}));};exports.Article=Article;Article.propTypes={doc:_propTypes.default.object,readOnly:_propTypes.default.bool};\n\n//# sourceURL=webpack://nolo/./components/Article/index.js?");

/***/ }),

/***/ "./components/ArticleTitle/index.js":
/*!******************************************!*\
  !*** ./components/ArticleTitle/index.js ***!
  \******************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:300-304 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/ArticleTitle/index.js\";var Wrap=_styledComponents.default.div.withConfig({displayName:\"ArticleTitle__Wrap\",componentId:\"sc-17lfd5f-0\"})([\"display:flex;margin-top:5px;color:#1a1a1a;a{color:#1a1a1a;:hover{color:#6d6d6d;}}\"]);var index=function index(props){var children=props.children;return _react.default.createElement(Wrap,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:17,columnNumber:10}},children);};index.propTypes={};var _default=index;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/ArticleTitle/index.js?");

/***/ }),

/***/ "./components/Button/CloseButton.js":
/*!******************************************!*\
  !*** ./components/Button/CloseButton.js ***!
  \******************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:573-577 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _propTypes=_interopRequireDefault(__webpack_require__(/*! prop-types */ \"prop-types\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _reactFontawesome=__webpack_require__(/*! @fortawesome/react-fontawesome */ \"@fortawesome/react-fontawesome\");var _freeSolidSvgIcons=__webpack_require__(/*! @fortawesome/free-solid-svg-icons */ \"@fortawesome/free-solid-svg-icons\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Button/CloseButton.js\";var WrapCloseButton=_styledComponents.default.div.withConfig({displayName:\"CloseButton__WrapCloseButton\",componentId:\"sc-16gu7hv-0\"})([\"position:absolute;right:20px;top:20px;cursor:pointer;color:\",\";z-index:1;\"],function(props){return props.color?props.color:'rgba(191, 191, 191, 1)';});var CloseButton=function CloseButton(props){var children=props.children;return _react.default.createElement(WrapCloseButton,(0,_extends2.default)({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:18,columnNumber:5}}),_react.default.createElement(_reactFontawesome.FontAwesomeIcon,{icon:_freeSolidSvgIcons.faTimes,__self:_this,__source:{fileName:_jsxFileName,lineNumber:19,columnNumber:7}}),children);};CloseButton.propTypes={children:_propTypes.default.node};var _default=CloseButton;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Button/CloseButton.js?");

/***/ }),

/***/ "./components/Button/index.js":
/*!************************************!*\
  !*** ./components/Button/index.js ***!
  \************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:476-480 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _propTypes=_interopRequireDefault(__webpack_require__(/*! prop-types */ \"prop-types\"));var _Loading=__webpack_require__(/*! ../Loading */ \"./components/Loading/index.js\");var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Button/index.js\";var WrapButton=_styledComponents.default.div.withConfig({displayName:\"Button__WrapButton\",componentId:\"ackqjo-0\"})([\"outline:none;width:100%;text-align:center;display:inline-block;border:none;font:500 16px/1 \\\"Poppins\\\",sans-serif;padding:20px;cursor:pointer;border-radius:var(--borderRadius);background:var(--primaryColor);color:var(--backgroundColor);position:relative;top:0;transition:0.2s ease;:hover{top:-3px;box-shadow:0 2px 5px rgba(0,0,0,0.15);}\"]);var Button=function Button(props){var type=props.type,_props$loading=props.loading,loading=_props$loading===void 0?false:_props$loading,children=props.children,preIcon=props.preIcon;return _react.default.createElement(_react.default.Fragment,null,function(){switch(type){default:return _react.default.createElement(WrapButton,(0,_extends2.default)({type:\"button\"},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:34,columnNumber:15}}),preIcon?_react.default.createElement(_react.default.Fragment,null,loading?_react.default.createElement(_Loading.Loading,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:38,columnNumber:23}}):_react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:40,columnNumber:23}},\"icon placeholder\"),children):_react.default.createElement(_react.default.Fragment,null,loading?_react.default.createElement(_Loading.Loading,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:45,columnNumber:32}}):children));}}());};Button.propTypes={type:_propTypes.default.string,children:_propTypes.default.node,onClick:_propTypes.default.func,loading:_propTypes.default.bool,className:_propTypes.default.string,disable:_propTypes.default.bool,size:_propTypes.default.object,preIcon:_propTypes.default.string};var _default=Button;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Button/index.js?");

/***/ }),

/***/ "./components/Editor/blockEditor/index.js":
/*!************************************************!*\
  !*** ./components/Editor/blockEditor/index.js ***!
  \************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:229-233 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.BlockEditor=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Editor/blockEditor/index.js\";var BlockEditor=function BlockEditor(){return _react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:4,columnNumber:10}});};exports.BlockEditor=BlockEditor;\n\n//# sourceURL=webpack://nolo/./components/Editor/blockEditor/index.js?");

/***/ }),

/***/ "./components/Editor/currentEditor/constant.js":
/*!*****************************************************!*\
  !*** ./components/Editor/currentEditor/constant.js ***!
  \*****************************************************/
/*! flagged exports */
/*! export CHARACTERS [provided] [no usage info] [missing usage info prevents renaming] */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export initialValue [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.CHARACTERS=exports.initialValue=void 0;var initialValue=[{type:'paragraph',children:[{text:'In addition to nodes that contain editable text, you can also create other types of nodes, like images or videos.'}]},{type:'image',url:'https://source.unsplash.com/kFrdX5IeQzI',children:[{text:''}]},{type:'paragraph',children:[{text:'This example shows images in action. It features two ways to add images. You can either add an image via the toolbar icon above, or if you want in on a little secret, copy an image URL to your keyboard and paste it anywhere in the editor!'}]},{children:[{text:'This example shows how you can make a hovering menu appear above your content, which you can use to make text '},{text:'bold',bold:true},{text:', '},{text:'italic',italic:true},{text:', or anything else you might want to do!'}]},{children:[{text:'Try it out yourself! Just '},{text:'select any piece of text and the menu will appear',bold:true},{text:'.'}]},{type:'paragraph',children:[{text:'This is editable '},{text:'rich',bold:true},{text:' text, '},{text:'much',italic:true},{text:' better than a '},{text:'<textarea>',code:true},{text:'!'}]},{type:'paragraph',children:[{text:\"Since it's rich text, you can do things like turn a selection of text \"},{text:'bold',bold:true},{text:', or add a semantically rendered block quote in the middle of the page, like this:'}]},{type:'block-quote',children:[{text:'A wise quote.'}]},{type:'paragraph',children:[{text:'Try it out for yourself!'}]}];exports.initialValue=initialValue;var CHARACTERS=['Aayla Secura','Adi Gallia','Admiral Dodd Rancit','Admiral Firmus Piett','Admiral Gial Ackbar','Admiral Ozzel','Admiral Raddus','Admiral Terrinald Screed','Admiral Trench','Admiral U.O. Statura','Agen Kolar','Agent Kallus','Aiolin and Morit Astarte','Aks Moe','Almec','Alton Kastle','Amee','AP-5','Armitage Hux','Artoo','Arvel Crynyd','Asajj Ventress','Aurra Sing','AZI-3','Bala-Tik','Barada','Bargwill Tomder','Baron Papanoida','Barriss Offee','Baze Malbus','Bazine Netal','BB-8','BB-9E','Ben Quadinaros','Berch Teller','Beru Lars','Bib Fortuna','Biggs Darklighter','Black Krrsantan','Bo-Katan Kryze','Boba Fett','Bobbajo','Bodhi Rook','Borvo the Hutt','Boss Nass','Bossk','Breha Antilles-Organa','Bren Derlin','Brendol Hux','BT-1','C-3PO','C1-10P','Cad Bane','Caluan Ematt','Captain Gregor','Captain Phasma','Captain Quarsh Panaka','Captain Rex','Carlist Rieekan','Casca Panzoro','Cassian Andor','Cassio Tagge','Cham Syndulla','Che Amanwe Papanoida','Chewbacca','Chi Eekway Papanoida','Chief Chirpa','Chirrut Îmwe','Ciena Ree','Cin Drallig','Clegg Holdfast','Cliegg Lars','Coleman Kcaj','Coleman Trebor','Colonel Kaplan','Commander Bly','Commander Cody (CC-2224)','Commander Fil (CC-3714)','Commander Fox','Commander Gree','Commander Jet','Commander Wolffe','Conan Antonio Motti','Conder Kyl','Constable Zuvio','Cordé','Cpatain Typho','Crix Madine','Cut Lawquane','Dak Ralter','Dapp','Darth Bane','Darth Maul','Darth Tyranus','Daultay Dofine','Del Meeko','Delian Mors','Dengar','Depa Billaba','Derek Klivian','Dexter Jettster','Dineé Ellberger','DJ','Doctor Aphra','Doctor Evazan','Dogma','Dormé','Dr. Cylo','Droidbait','Droopy McCool','Dryden Vos','Dud Bolt','Ebe E. Endocott','Echuu Shen-Jon','Eeth Koth','Eighth Brother','Eirtaé','Eli Vanto','Ellé','Ello Asty','Embo','Eneb Ray','Enfys Nest','EV-9D9','Evaan Verlaine','Even Piell','Ezra Bridger','Faro Argyus','Feral','Fifth Brother','Finis Valorum','Finn','Fives','FN-1824','FN-2003','Fodesinbeed Annodue','Fulcrum','FX-7','GA-97','Galen Erso','Gallius Rax','Garazeb \"Zeb\" Orrelios','Gardulla the Hutt','Garrick Versio','Garven Dreis','Gavyn Sykes','Gideon Hask','Gizor Dellso','Gonk droid','Grand Inquisitor','Greeata Jendowanian','Greedo','Greer Sonnel','Grievous','Grummgar','Gungi','Hammerhead','Han Solo','Harter Kalonia','Has Obbit','Hera Syndulla','Hevy','Hondo Ohnaka','Huyang','Iden Versio','IG-88','Ima-Gun Di','Inquisitors','Inspector Thanoth','Jabba','Jacen Syndulla','Jan Dodonna','Jango Fett','Janus Greejatus','Jar Jar Binks','Jas Emari','Jaxxon','Jek Tono Porkins','Jeremoch Colton','Jira','Jobal Naberrie','Jocasta Nu','Joclad Danva','Joh Yowza','Jom Barell','Joph Seastriker','Jova Tarkin','Jubnuk','Jyn Erso','K-2SO','Kanan Jarrus','Karbin','Karina the Great','Kes Dameron','Ketsu Onyo','Ki-Adi-Mundi','King Katuunko','Kit Fisto','Kitster Banai','Klaatu','Klik-Klak','Korr Sella','Kylo Ren','L3-37','Lama Su','Lando Calrissian','Lanever Villecham','Leia Organa','Letta Turmond','Lieutenant Kaydel Ko Connix','Lieutenant Thire','Lobot','Logray','Lok Durd','Longo Two-Guns','Lor San Tekka','Lorth Needa','Lott Dod','Luke Skywalker','Lumat','Luminara Unduli','Lux Bonteri','Lyn Me','Lyra Erso','Mace Windu','Malakili','Mama the Hutt','Mars Guo','Mas Amedda','Mawhonic','Max Rebo','Maximilian Veers','Maz Kanata','ME-8D9','Meena Tills','Mercurial Swift','Mina Bonteri','Miraj Scintel','Mister Bones','Mod Terrik','Moden Canady','Mon Mothma','Moradmin Bast','Moralo Eval','Morley','Mother Talzin','Nahdar Vebb','Nahdonnis Praji','Nien Nunb','Niima the Hutt','Nines','Norra Wexley','Nute Gunray','Nuvo Vindi','Obi-Wan Kenobi','Odd Ball','Ody Mandrell','Omi','Onaconda Farr','Oola','OOM-9','Oppo Rancisis','Orn Free Taa','Oro Dassyne','Orrimarko','Osi Sobeck','Owen Lars','Pablo-Jill','Padmé Amidala','Pagetti Rook','Paige Tico','Paploo','Petty Officer Thanisson','Pharl McQuarrie','Plo Koon','Po Nudo','Poe Dameron','Poggle the Lesser','Pong Krell','Pooja Naberrie','PZ-4CO','Quarrie','Quay Tolsite','Queen Apailana','Queen Jamillia','Queen Neeyutnee','Qui-Gon Jinn','Quiggold','Quinlan Vos','R2-D2','R2-KT','R3-S6','R4-P17','R5-D4','RA-7','Rabé','Rako Hardeen','Ransolm Casterfo','Rappertunie','Ratts Tyerell','Raymus Antilles','Ree-Yees','Reeve Panzoro','Rey','Ric Olié','Riff Tamson','Riley','Rinnriyin Di','Rio Durant','Rogue Squadron','Romba','Roos Tarpals','Rose Tico','Rotta the Hutt','Rukh','Rune Haako','Rush Clovis','Ruwee Naberrie','Ryoo Naberrie','Sabé','Sabine Wren','Saché','Saelt-Marae','Saesee Tiin','Salacious B. Crumb','San Hill','Sana Starros','Sarco Plank','Sarkli','Satine Kryze','Savage Opress','Sebulba','Senator Organa','Sergeant Kreel','Seventh Sister','Shaak Ti','Shara Bey','Shmi Skywalker','Shu Mai','Sidon Ithano','Sifo-Dyas','Sim Aloo','Siniir Rath Velus','Sio Bibble','Sixth Brother','Slowen Lo','Sly Moore','Snaggletooth','Snap Wexley','Snoke','Sola Naberrie','Sora Bulq','Strono Tuggs','Sy Snootles','Tallissan Lintra','Tarfful','Tasu Leech','Taun We','TC-14','Tee Watt Kaa','Teebo','Teedo','Teemto Pagalies','Temiri Blagg','Tessek','Tey How','Thane Kyrell','The Bendu','The Smuggler','Thrawn','Tiaan Jerjerrod','Tion Medon','Tobias Beckett','Tulon Voidgazer','Tup','U9-C4','Unkar Plutt','Val Beckett','Vanden Willard','Vice Admiral Amilyn Holdo','Vober Dand','WAC-47','Wag Too','Wald','Walrus Man','Warok','Wat Tambor','Watto','Wedge Antilles','Wes Janson','Wicket W. Warrick','Wilhuff Tarkin','Wollivan','Wuher','Wullf Yularen','Xamuel Lennox','Yaddle','Yarael Poof','Yoda','Zam Wesell','Zev Senesca','Ziro the Hutt','Zuckuss'];exports.CHARACTERS=CHARACTERS;\n\n//# sourceURL=webpack://nolo/./components/Editor/currentEditor/constant.js?");

/***/ }),

/***/ "./components/Editor/currentEditor/deserialize.js":
/*!********************************************************!*\
  !*** ./components/Editor/currentEditor/deserialize.js ***!
  \********************************************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export deserialize [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.deserialize=void 0;var _slateHyperscript=__webpack_require__(/*! slate-hyperscript */ \"slate-hyperscript\");var ELEMENT_TAGS={A:function A(el){return{type:'link',url:el.getAttribute('href')};},BLOCKQUOTE:function BLOCKQUOTE(){return{type:'quote'};},H1:function H1(){return{type:'heading-one'};},H2:function H2(){return{type:'heading-two'};},H3:function H3(){return{type:'heading-three'};},H4:function H4(){return{type:'heading-four'};},H5:function H5(){return{type:'heading-five'};},H6:function H6(){return{type:'heading-six'};},IMG:function IMG(el){return{type:'image',url:el.getAttribute('src')};},LI:function LI(){return{type:'list-item'};},OL:function OL(){return{type:'numbered-list'};},P:function P(){return{type:'paragraph'};},PRE:function PRE(){return{type:'code'};},UL:function UL(){return{type:'bulleted-list'};}};var TEXT_TAGS={CODE:function CODE(){return{code:true};},DEL:function DEL(){return{strikethrough:true};},EM:function EM(){return{italic:true};},I:function I(){return{italic:true};},S:function S(){return{strikethrough:true};},STRONG:function STRONG(){return{bold:true};},U:function U(){return{underline:true};}};var deserialize=function deserialize(el){if(el.nodeType===3){return el.textContent;}else if(el.nodeType!==1){return null;}else if(el.nodeName==='BR'){return'\\n';}var nodeName=el.nodeName;var parent=el;if(nodeName==='PRE'&&el.childNodes[0]&&el.childNodes[0].nodeName==='CODE'){parent=el.childNodes[0];}var children=Array.from(parent.childNodes).map(deserialize).flat();if(el.nodeName==='BODY'){return(0,_slateHyperscript.jsx)('fragment',{},children);}if(ELEMENT_TAGS[nodeName]){var attrs=ELEMENT_TAGS[nodeName](el);return(0,_slateHyperscript.jsx)('element',attrs,children);}if(TEXT_TAGS[nodeName]){var _attrs=TEXT_TAGS[nodeName](el);return children.map(function(child){return(0,_slateHyperscript.jsx)('text',_attrs,child);});}return children;};exports.deserialize=deserialize;\n\n//# sourceURL=webpack://nolo/./components/Editor/currentEditor/deserialize.js?");

/***/ }),

/***/ "./components/Editor/currentEditor/element.js":
/*!****************************************************!*\
  !*** ./components/Editor/currentEditor/element.js ***!
  \****************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:381-385 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Element=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _image=__webpack_require__(/*! ./image */ \"./components/Editor/currentEditor/image.js\");var _index=__webpack_require__(/*! ../slate-react/index.es */ \"./components/Editor/slate-react/index.es.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Editor/currentEditor/element.js\";var MentionElement=function MentionElement(_ref){var attributes=_ref.attributes,children=_ref.children,element=_ref.element;var selected=(0,_index.useSelected)();var focused=(0,_index.useFocused)();return _react.default.createElement(\"span\",(0,_extends2.default)({},attributes,{contentEditable:false,style:{padding:'3px 3px 2px',margin:'0 1px',verticalAlign:'baseline',display:'inline-block',borderRadius:'4px',backgroundColor:'#eee',fontSize:'0.9em',boxShadow:selected&&focused?'0 0 0 2px #B4D5FF':'none'},__self:_this,__source:{fileName:_jsxFileName,lineNumber:9,columnNumber:5}}),\"@\",element.character,children);};var Element=function Element(props){var attributes=props.attributes,children=props.children,element=props.element;switch(element.type){default:return _react.default.createElement(\"p\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:33,columnNumber:14}}),children);case'quote':return _react.default.createElement(\"blockquote\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:35,columnNumber:14}}),children);case'code':return _react.default.createElement(\"pre\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:38,columnNumber:9}},_react.default.createElement(\"code\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:39,columnNumber:11}}),children));case'bulleted-list':return _react.default.createElement(\"ul\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:43,columnNumber:14}}),children);case'heading-one':return _react.default.createElement(\"h1\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:45,columnNumber:14}}),children);case'heading-two':return _react.default.createElement(\"h2\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:47,columnNumber:14}}),children);case'heading-three':return _react.default.createElement(\"h3\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:49,columnNumber:14}}),children);case'heading-four':return _react.default.createElement(\"h4\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:51,columnNumber:14}}),children);case'heading-five':return _react.default.createElement(\"h5\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:53,columnNumber:14}}),children);case'heading-six':return _react.default.createElement(\"h6\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:55,columnNumber:14}}),children);case'list-item':return _react.default.createElement(\"li\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:57,columnNumber:14}}),children);case'numbered-list':return _react.default.createElement(\"ol\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:59,columnNumber:14}}),children);case'link':return _react.default.createElement(\"a\",(0,_extends2.default)({href:element.url},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:62,columnNumber:9}}),children);case'image':return _react.default.createElement(_image.ImageElement,(0,_extends2.default)({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:67,columnNumber:14}}));case'mention':return _react.default.createElement(MentionElement,(0,_extends2.default)({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:69,columnNumber:14}}));}};exports.Element=Element;\n\n//# sourceURL=webpack://nolo/./components/Editor/currentEditor/element.js?");

/***/ }),

/***/ "./components/Editor/currentEditor/image.js":
/*!**************************************************!*\
  !*** ./components/Editor/currentEditor/image.js ***!
  \**************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:699-703 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.isImageUrl=exports.insertImage=exports.ImageElement=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _slate=__webpack_require__(/*! slate */ \"slate\");var _isUrl=_interopRequireDefault(__webpack_require__(/*! is-url */ \"is-url\"));var _imageExtensions=_interopRequireDefault(__webpack_require__(/*! image-extensions */ \"image-extensions\"));var _index=__webpack_require__(/*! ../slate-react/index.es */ \"./components/Editor/slate-react/index.es.js\");var _emotion=__webpack_require__(/*! emotion */ \"emotion\");var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Editor/currentEditor/image.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2.default)([\"\\n          display: block;\\n          max-width: 100%;\\n          max-height: 20em;\\n          box-shadow: \",\";\\n        \"]);_templateObject=function _templateObject(){return data;};return data;}var ImageElement=function ImageElement(_ref){var attributes=_ref.attributes,children=_ref.children,element=_ref.element;var selected=(0,_index.useSelected)();var focused=(0,_index.useFocused)();return _react.default.createElement(\"div\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:12,columnNumber:5}}),children,_react.default.createElement(\"img\",{src:element.url,className:(0,_emotion.css)(_templateObject(),selected&&focused?'0 0 0 2px blue;':'none'),__self:_this,__source:{fileName:_jsxFileName,lineNumber:14,columnNumber:7}}));};exports.ImageElement=ImageElement;var insertImage=function insertImage(editor,url){var text={text:''};var image={type:'image',url:url,children:[text]};_slate.Transforms.insertNodes(editor,image);};exports.insertImage=insertImage;var isImageUrl=function isImageUrl(url){if(!url){return false;}if(!(0,_isUrl.default)(url)){return false;}var ext=new URL(url).pathname.split('.').pop();return _imageExtensions.default.includes(ext);};exports.isImageUrl=isImageUrl;\n\n//# sourceURL=webpack://nolo/./components/Editor/currentEditor/image.js?");

/***/ }),

/***/ "./components/Editor/currentEditor/index.js":
/*!**************************************************!*\
  !*** ./components/Editor/currentEditor/index.js ***!
  \**************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:872-876 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=exports.Portal=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _index=__webpack_require__(/*! ../slate-react/index.es */ \"./components/Editor/slate-react/index.es.js\");var _slate=__webpack_require__(/*! slate */ \"slate\");var _reactDom=_interopRequireDefault(__webpack_require__(/*! react-dom */ \"react-dom\"));var _slateHistory=__webpack_require__(/*! slate-history */ \"slate-history\");var _deserialize=__webpack_require__(/*! ./deserialize */ \"./components/Editor/currentEditor/deserialize.js\");var _element=__webpack_require__(/*! ./element */ \"./components/Editor/currentEditor/element.js\");var _leaf=__webpack_require__(/*! ./leaf */ \"./components/Editor/currentEditor/leaf.js\");var _image=__webpack_require__(/*! ./image */ \"./components/Editor/currentEditor/image.js\");var _constant=__webpack_require__(/*! ./constant */ \"./components/Editor/currentEditor/constant.js\");var _link=__webpack_require__(/*! ./link */ \"./components/Editor/currentEditor/link.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Editor/currentEditor/index.js\";function _createForOfIteratorHelperLoose(o,allowArrayLike){var it;if(typeof Symbol===\"undefined\"||o[Symbol.iterator]==null){if(Array.isArray(o)||(it=_unsupportedIterableToArray(o))||allowArrayLike&&o&&typeof o.length===\"number\"){if(it)o=it;var i=0;return function(){if(i>=o.length)return{done:true};return{done:false,value:o[i++]};};}throw new TypeError(\"Invalid attempt to iterate non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.\");}it=o[Symbol.iterator]();return it.next.bind(it);}function _unsupportedIterableToArray(o,minLen){if(!o)return;if(typeof o===\"string\")return _arrayLikeToArray(o,minLen);var n=Object.prototype.toString.call(o).slice(8,-1);if(n===\"Object\"&&o.constructor)n=o.constructor.name;if(n===\"Map\"||n===\"Set\")return Array.from(o);if(n===\"Arguments\"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return _arrayLikeToArray(o,minLen);}function _arrayLikeToArray(arr,len){if(len==null||len>arr.length)len=arr.length;for(var i=0,arr2=new Array(len);i<len;i++){arr2[i]=arr[i];}return arr2;}var Portal=function Portal(_ref){var children=_ref.children;return _reactDom.default.createPortal(children,document.body);};exports.Portal=Portal;var SHORTCUTS={'*':'list-item','-':'list-item','+':'list-item','>':'block-quote','#':'heading-one','##':'heading-two','###':'heading-three','####':'heading-four','#####':'heading-five','######':'heading-six'};var CurrentEditor=function CurrentEditor(props){var ref=(0,_react.useRef)();var _useState=(0,_react.useState)(props.value||initialValue),_useState2=(0,_slicedToArray2.default)(_useState,2),value=_useState2[0],setValue=_useState2[1];(0,_react.useEffect)(function(){props.value&&setValue(props.value);},[props.value]);var _useState3=(0,_react.useState)(),_useState4=(0,_slicedToArray2.default)(_useState3,2),target=_useState4[0],setTarget=_useState4[1];var _useState5=(0,_react.useState)(''),_useState6=(0,_slicedToArray2.default)(_useState5,2),search=_useState6[0],setSearch=_useState6[1];var _useState7=(0,_react.useState)(0),_useState8=(0,_slicedToArray2.default)(_useState7,2),index=_useState8[0],setIndex=_useState8[1];var renderElement=(0,_react.useCallback)(function(props){return _react.default.createElement(_element.Element,(0,_extends2.default)({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:46,columnNumber:48}}));},[]);var renderLeaf=(0,_react.useCallback)(function(props){return _react.default.createElement(_leaf.Leaf,(0,_extends2.default)({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:47,columnNumber:45}}));},[]);var chars=_constant.CHARACTERS.filter(function(c){return c.toLowerCase().startsWith(search.toLowerCase());}).slice(0,10);var insertMention=function insertMention(editor,character){var mention={type:'mention',character:character,children:[{text:''}]};_slate.Transforms.insertNodes(editor,mention);_slate.Transforms.move(editor);};var onKeyDown=(0,_react.useCallback)(function(event){if(target){switch(event.key){case'ArrowDown':event.preventDefault();var prevIndex=index>=chars.length-1?0:index+1;setIndex(prevIndex);break;case'ArrowUp':event.preventDefault();var nextIndex=index<=0?chars.length-1:index-1;setIndex(nextIndex);break;case'Tab':case'Enter':event.preventDefault();_slate.Transforms.select(editor,target);insertMention(editor,chars[index]);setTarget(null);break;case'Escape':event.preventDefault();setTarget(null);break;}}},[index,search,target]);var editor=(0,_react.useMemo)(function(){return(0,_link.withLinks)(withMentions(withNoloEditor((0,_index.withReact)((0,_slateHistory.withHistory)((0,_slate.createEditor)())))));},[]);(0,_react.useEffect)(function(){if(target&&chars.length>0){var el=ref.current;var domRange=_index.ReactEditor.toDOMRange(editor,target);var rect=domRange.getBoundingClientRect();el.style.top=rect.top+window.pageYOffset+24+\"px\";el.style.left=rect.left+window.pageXOffset+\"px\";}},[chars.length,editor,index,search,target]);return _react.default.createElement(_index.Slate,{editor:editor,value:value,onChange:function onChange(value){setValue(value);var selection=editor.selection;if(selection&&_slate.Range.isCollapsed(selection)){var _Range$edges=_slate.Range.edges(selection),_Range$edges2=(0,_slicedToArray2.default)(_Range$edges,1),start=_Range$edges2[0];var wordBefore=_slate.Editor.before(editor,start,{unit:'word'});var before=wordBefore&&_slate.Editor.before(editor,wordBefore);var beforeRange=before&&_slate.Editor.range(editor,before,start);var beforeText=beforeRange&&_slate.Editor.string(editor,beforeRange);var beforeMatch=beforeText&&beforeText.match(/^@(\\w+)$/);var after=_slate.Editor.after(editor,start);var afterRange=_slate.Editor.range(editor,start,after);var afterText=_slate.Editor.string(editor,afterRange);var afterMatch=afterText.match(/^(\\s|$)/);if(beforeMatch&&afterMatch){setTarget(beforeRange);setSearch(beforeMatch[1]);setIndex(0);return;}}setTarget(null);if(props.onChange){props.onChange(value);}},__self:_this,__source:{fileName:_jsxFileName,lineNumber:109,columnNumber:5}},_react.default.createElement(_index.Editable,{renderElement:renderElement,renderLeaf:renderLeaf,onKeyDown:onKeyDown,autoFocus:true,__self:_this,__source:{fileName:_jsxFileName,lineNumber:142,columnNumber:7}}),target&&chars.length>0&&_react.default.createElement(Portal,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:149,columnNumber:9}},_react.default.createElement(\"div\",{ref:ref,style:{top:'-9999px',left:'-9999px',position:'absolute',zIndex:1,padding:'3px',background:'white',borderRadius:'4px',boxShadow:'0 1px 5px rgba(0,0,0,.2)'},__self:_this,__source:{fileName:_jsxFileName,lineNumber:150,columnNumber:11}},chars.map(function(char,i){return _react.default.createElement(\"div\",{key:char,style:{padding:'1px 3px',borderRadius:'3px',background:i===index?'#B4D5FF':'transparent'},__self:_this,__source:{fileName:_jsxFileName,lineNumber:163,columnNumber:15}},char);}))));};var withMentions=function withMentions(editor){var isInline=editor.isInline,isVoid=editor.isVoid;editor.isInline=function(element){return element.type==='mention'?true:isInline(element);};editor.isVoid=function(element){return element.type==='mention'?true:isVoid(element);};return editor;};var withNoloEditor=function withNoloEditor(editor){var deleteBackward=editor.deleteBackward,insertText=editor.insertText,insertData=editor.insertData,isInline=editor.isInline,isVoid=editor.isVoid;editor.isInline=function(element){return element.type==='link'?true:isInline(element);};editor.isVoid=function(element){return element.type==='image'?true:isVoid(element);};editor.insertData=function(data){var html=data.getData('text/html');var text=data.getData('text/plain');var files=data.files;if(files&&files.length>0){var _loop=function _loop(file){var reader=new FileReader();var _file$type$split=file.type.split('/'),_file$type$split2=(0,_slicedToArray2.default)(_file$type$split,1),mime=_file$type$split2[0];if(mime==='image'){reader.addEventListener('load',function(){var url=reader.result;(0,_image.insertImage)(editor,url);});reader.readAsDataURL(file);}};for(var _iterator=_createForOfIteratorHelperLoose(files),_step;!(_step=_iterator()).done;){var file=_step.value;_loop(file);}}else if((0,_image.isImageUrl)(text)){(0,_image.insertImage)(editor,text);}if(html){var parsed=new DOMParser().parseFromString(html,'text/html');var fragment=(0,_deserialize.deserialize)(parsed.body);_slate.Transforms.insertFragment(editor,fragment);return;}insertData(data);};editor.insertText=function(text){var selection=editor.selection;if(text===' '&&selection&&_slate.Range.isCollapsed(selection)){var anchor=selection.anchor;var block=_slate.Editor.above(editor,{match:function match(n){return _slate.Editor.isBlock(editor,n);}});var path=block?block[1]:[];var start=_slate.Editor.start(editor,path);var range={anchor:anchor,focus:start};var beforeText=_slate.Editor.string(editor,range);var type=SHORTCUTS[beforeText];if(type){_slate.Transforms.select(editor,range);_slate.Transforms.delete(editor);var newProperties={type:type};_slate.Transforms.setNodes(editor,newProperties,{match:function match(n){return _slate.Editor.isBlock(editor,n);}});if(type==='list-item'){var list={type:'bulleted-list',children:[]};_slate.Transforms.wrapNodes(editor,list,{match:function match(n){return!_slate.Editor.isEditor(n)&&_slate.Element.isElement(n)&&n.type==='list-item';}});}return;}}insertText(text);};editor.deleteBackward=function(){var selection=editor.selection;if(selection&&_slate.Range.isCollapsed(selection)){var match=_slate.Editor.above(editor,{match:function match(n){return _slate.Editor.isBlock(editor,n);}});if(match){var _match=(0,_slicedToArray2.default)(match,2),block=_match[0],path=_match[1];var start=_slate.Editor.start(editor,path);if(!_slate.Editor.isEditor(block)&&_slate.Element.isElement(block)&&block.type!=='paragraph'&&_slate.Point.equals(selection.anchor,start)){var newProperties={type:'paragraph'};_slate.Transforms.setNodes(editor,newProperties);if(block.type==='list-item'){_slate.Transforms.unwrapNodes(editor,{match:function match(n){return!_slate.Editor.isEditor(n)&&_slate.Element.isElement(n)&&n.type==='bulleted-list';},split:true});}return;}}deleteBackward.apply(void 0,arguments);}};return editor;};var initialValue=[{type:'paragraph',children:[{text:'The editor gives you full control over the logic you can add. For example, it\\'s fairly common to want to add markdown-like shortcuts to editors. So that, when you start a line with \"> \" you get a blockquote that looks like this:'}]},{type:'block-quote',children:[{text:'A wise quote.'}]},{type:'paragraph',children:[{text:'Order when you start a line with \"## \" you get a level-two heading, like this:'}]},{type:'heading-two',children:[{text:'Try it out!'}]},{type:'paragraph',children:[{text:'Try it out for yourself! Try starting a new line with \">\", \"-\", or \"#\"s.'}]}];var _default=CurrentEditor;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Editor/currentEditor/index.js?");

/***/ }),

/***/ "./components/Editor/currentEditor/leaf.js":
/*!*************************************************!*\
  !*** ./components/Editor/currentEditor/leaf.js ***!
  \*************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:302-306 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Leaf=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Editor/currentEditor/leaf.js\";var Leaf=function Leaf(_ref){var attributes=_ref.attributes,children=_ref.children,leaf=_ref.leaf;if(leaf.bold){children=_react.default.createElement(\"strong\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:4,columnNumber:16}},children);}if(leaf.code){children=_react.default.createElement(\"code\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:8,columnNumber:16}},children);}if(leaf.italic){children=_react.default.createElement(\"em\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:12,columnNumber:16}},children);}if(leaf.underline){children=_react.default.createElement(\"u\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:16,columnNumber:16}},children);}if(leaf.strikethrough){children=_react.default.createElement(\"del\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:20,columnNumber:16}},children);}return _react.default.createElement(\"span\",(0,_extends2.default)({},attributes,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:23,columnNumber:10}}),children);};exports.Leaf=Leaf;\n\n//# sourceURL=webpack://nolo/./components/Editor/currentEditor/leaf.js?");

/***/ }),

/***/ "./components/Editor/currentEditor/link.js":
/*!*************************************************!*\
  !*** ./components/Editor/currentEditor/link.js ***!
  \*************************************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export withLinks [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.withLinks=void 0;var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _slate=__webpack_require__(/*! slate */ \"slate\");var _isUrl=_interopRequireDefault(__webpack_require__(/*! is-url */ \"is-url\"));var unwrapLink=function unwrapLink(editor){_slate.Transforms.unwrapNodes(editor,{match:function match(n){return!_slate.Editor.isEditor(n)&&_slate.Element.isElement(n)&&n.type==='link';}});};var isLinkActive=function isLinkActive(editor){var _Editor$nodes=_slate.Editor.nodes(editor,{match:function match(n){return!_slate.Editor.isEditor(n)&&_slate.Element.isElement(n)&&n.type==='link';}}),_Editor$nodes2=(0,_slicedToArray2.default)(_Editor$nodes,1),link=_Editor$nodes2[0];return!!link;};var wrapLink=function wrapLink(editor,url){if(isLinkActive(editor)){unwrapLink(editor);}var selection=editor.selection;var isCollapsed=selection&&_slate.Range.isCollapsed(selection);var link={type:'link',url:url,children:isCollapsed?[{text:url}]:[]};if(isCollapsed){_slate.Transforms.insertNodes(editor,link);}else{_slate.Transforms.wrapNodes(editor,link,{split:true});_slate.Transforms.collapse(editor,{edge:'end'});}};var withLinks=function withLinks(editor){var insertData=editor.insertData,insertText=editor.insertText,isInline=editor.isInline;editor.isInline=function(element){return element.type==='link'?true:isInline(element);};editor.insertText=function(text){if(text&&(0,_isUrl.default)(text)){wrapLink(editor,text);}else{insertText(text);}};editor.insertData=function(data){var text=data.getData('text/plain');if(text&&(0,_isUrl.default)(text)){wrapLink(editor,text);}else{insertData(data);}};return editor;};exports.withLinks=withLinks;\n\n//# sourceURL=webpack://nolo/./components/Editor/currentEditor/link.js?");

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

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));Object.defineProperty(exports, \"NextEditor\", ({enumerable:true,get:function get(){return _myeditor.default;}}));Object.defineProperty(exports, \"CurrentEditor\", ({enumerable:true,get:function get(){return _currentEditor.default;}}));var _myeditor=_interopRequireDefault(__webpack_require__(/*! ./myeditor */ \"./components/Editor/myeditor/index.js\"));var _currentEditor=_interopRequireDefault(__webpack_require__(/*! ./currentEditor */ \"./components/Editor/currentEditor/index.js\"));\n\n//# sourceURL=webpack://nolo/./components/Editor/index.js?");

/***/ }),

/***/ "./components/Editor/myeditor/index.js":
/*!*********************************************!*\
  !*** ./components/Editor/myeditor/index.js ***!
  \*********************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:521-525 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _reactDom=_interopRequireWildcard(__webpack_require__(/*! react-dom */ \"react-dom\"));var _log=__webpack_require__(/*! ./log */ \"./components/Editor/myeditor/log.js\");var _render=__webpack_require__(/*! ./render */ \"./components/Editor/myeditor/render.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Editor/myeditor/index.js\";var Editor=function Editor(props){var onChange=props.onChange;var editorEl=(0,_react.useRef)(null);var _useState=(0,_react.useState)(''),_useState2=(0,_slicedToArray2.default)(_useState,2),htmlString=_useState2[0],setHtmlString=_useState2[1];var _useState3=(0,_react.useState)([{type:'text',text:'test'}]),_useState4=(0,_slicedToArray2.default)(_useState3,2),state=_useState4[0],setstate=_useState4[1];var onBeforeInput=function onBeforeInput(e){e.preventDefault();reallyChange(e,'input');};var compositionUpdate=function compositionUpdate(e){e.preventDefault();if(_log.logOption.compositionUpdate){console.log('compositionUpdate',e);}};var compositionStart=function compositionStart(e){e.preventDefault();if(_log.logOption.compositionStart){console.log('compositionStart',e);}};var compositionEnd=function compositionEnd(e){e.preventDefault();if(_log.logOption.compositionEnd){console.log('compositionEnd',e);}reallyChange(e,'composition');};var reallyChange=function reallyChange(e,from){(0,_reactDom.unstable_batchedUpdates)(function(){setHtmlString(\"\\n        <div>\"+(0,_render.stateToHtmlString)(state)+\"</div>\\n        <div style=\\\"display:inline;background:yellow;\\\">\"+Math.random()+\"</div>\");});};var onBlur=function onBlur(e){};return _react.default.createElement(_react.default.Fragment,null,_react.default.createElement(\"div\",{contentEditable:true,onBlur:onBlur,onBeforeInput:onBeforeInput,ref:editorEl,onCompositionUpdate:compositionUpdate,onCompositionStart:compositionStart,onCompositionEnd:compositionEnd,dangerouslySetInnerHTML:{__html:htmlString},__self:_this,__source:{fileName:_jsxFileName,lineNumber:63,columnNumber:7}}));};var _default=Editor;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Editor/myeditor/index.js?");

/***/ }),

/***/ "./components/Editor/myeditor/log.js":
/*!*******************************************!*\
  !*** ./components/Editor/myeditor/log.js ***!
  \*******************************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export logFliter [provided] [no usage info] [missing usage info prevents renaming] */
/*! export logOption [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.logFliter=exports.logOption=void 0;var logOption={onBeforeInput:true,compositionUpdate:false,compositionStart:false,compositionEnd:true,onlyShowData:true};exports.logOption=logOption;var logFliter=function logFliter(e,from){logOption[from]?logOption.onlyShowData?console.log(from,e.data):console.log(from,e):null;};exports.logFliter=logFliter;\n\n//# sourceURL=webpack://nolo/./components/Editor/myeditor/log.js?");

/***/ }),

/***/ "./components/Editor/myeditor/render.js":
/*!**********************************************!*\
  !*** ./components/Editor/myeditor/render.js ***!
  \**********************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:320-324 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.stateToHtmlString=exports.stateToReact=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _server=_interopRequireDefault(__webpack_require__(/*! react-dom/server */ \"react-dom/server\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Editor/myeditor/render.js\";var stateToReact=function stateToReact(stateArray){return _react.default.createElement(_react.default.Fragment,null,stateArray.map(function(node,index){console.log('node',node);return _react.default.createElement(\"div\",{key:'node'+index,__self:_this,__source:{fileName:_jsxFileName,lineNumber:89,columnNumber:16}},node.text);}));};exports.stateToReact=stateToReact;var stateToHtmlString=function stateToHtmlString(stateArray){var nextHtmlString=_server.default.renderToStaticMarkup(stateToReact(stateArray));console.log('nextHtmlString',nextHtmlString);return nextHtmlString;};exports.stateToHtmlString=stateToHtmlString;\n\n//# sourceURL=webpack://nolo/./components/Editor/myeditor/render.js?");

/***/ }),

/***/ "./components/Editor/slate-react/index.es.js":
/*!***************************************************!*\
  !*** ./components/Editor/slate-react/index.es.js ***!
  \***************************************************/
/*! flagged exports */
/*! export DefaultElement [provided] [no usage info] [missing usage info prevents renaming] */
/*! export DefaultLeaf [provided] [no usage info] [missing usage info prevents renaming] */
/*! export Editable [provided] [no usage info] [missing usage info prevents renaming] */
/*! export ReactEditor [provided] [no usage info] [missing usage info prevents renaming] */
/*! export Slate [provided] [no usage info] [missing usage info prevents renaming] */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export useEditor [provided] [no usage info] [missing usage info prevents renaming] */
/*! export useFocused [provided] [no usage info] [missing usage info prevents renaming] */
/*! export useReadOnly [provided] [no usage info] [missing usage info prevents renaming] */
/*! export useSelected [provided] [no usage info] [missing usage info prevents renaming] */
/*! export useSlate [provided] [no usage info] [missing usage info prevents renaming] */
/*! export useSlateStatic [provided] [no usage info] [missing usage info prevents renaming] */
/*! export withReact [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.withReact=exports.useSlateStatic=exports.useSlate=exports.useSelected=exports.useReadOnly=exports.useFocused=exports.useEditor=exports.Slate=exports.ReactEditor=exports.Editable=exports.DefaultLeaf=exports.DefaultElement=void 0;var _defineProperty3=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"@babel/runtime/helpers/defineProperty\"));var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _toConsumableArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/toConsumableArray */ \"@babel/runtime/helpers/toConsumableArray\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _classCallCheck2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ \"@babel/runtime/helpers/classCallCheck\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _slate=__webpack_require__(/*! slate */ \"slate\");var _isPlainObject=_interopRequireDefault(__webpack_require__(/*! is-plain-object */ \"is-plain-object\"));var _throttle=_interopRequireDefault(__webpack_require__(/*! lodash/throttle */ \"lodash/throttle\"));var _scrollIntoViewIfNeeded=_interopRequireDefault(__webpack_require__(/*! scroll-into-view-if-needed */ \"scroll-into-view-if-needed\"));var _direction=_interopRequireDefault(__webpack_require__(/*! direction */ \"direction\"));var _reactDom=_interopRequireDefault(__webpack_require__(/*! react-dom */ \"react-dom\"));var _isHotkey=__webpack_require__(/*! is-hotkey */ \"is-hotkey\");function _createForOfIteratorHelperLoose(o,allowArrayLike){var it;if(typeof Symbol===\"undefined\"||o[Symbol.iterator]==null){if(Array.isArray(o)||(it=_unsupportedIterableToArray(o))||allowArrayLike&&o&&typeof o.length===\"number\"){if(it)o=it;var i=0;return function(){if(i>=o.length)return{done:true};return{done:false,value:o[i++]};};}throw new TypeError(\"Invalid attempt to iterate non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.\");}it=o[Symbol.iterator]();return it.next.bind(it);}function _unsupportedIterableToArray(o,minLen){if(!o)return;if(typeof o===\"string\")return _arrayLikeToArray(o,minLen);var n=Object.prototype.toString.call(o).slice(8,-1);if(n===\"Object\"&&o.constructor)n=o.constructor.name;if(n===\"Map\"||n===\"Set\")return Array.from(o);if(n===\"Arguments\"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return _arrayLikeToArray(o,minLen);}function _arrayLikeToArray(arr,len){if(len==null||len>arr.length)len=arr.length;for(var i=0,arr2=new Array(len);i<len;i++){arr2[i]=arr[i];}return arr2;}function _defineProperty(obj,key,value){if(key in obj){Object.defineProperty(obj,key,{value:value,enumerable:true,configurable:true,writable:true});}else{obj[key]=value;}return obj;}function _objectWithoutPropertiesLoose(source,excluded){if(source==null)return{};var target={};var sourceKeys=Object.keys(source);var key,i;for(i=0;i<sourceKeys.length;i++){key=sourceKeys[i];if(excluded.indexOf(key)>=0)continue;target[key]=source[key];}return target;}function _objectWithoutProperties(source,excluded){if(source==null)return{};var target=_objectWithoutPropertiesLoose(source,excluded);var key,i;if(Object.getOwnPropertySymbols){var sourceSymbolKeys=Object.getOwnPropertySymbols(source);for(i=0;i<sourceSymbolKeys.length;i++){key=sourceSymbolKeys[i];if(excluded.indexOf(key)>=0)continue;if(!Object.prototype.propertyIsEnumerable.call(source,key))continue;target[key]=source[key];}}return target;}var History={isHistory:function isHistory(value){return(0,_isPlainObject.default)(value)&&Array.isArray(value.redos)&&Array.isArray(value.undos)&&(value.redos.length===0||_slate.Operation.isOperationList(value.redos[0]))&&(value.undos.length===0||_slate.Operation.isOperationList(value.undos[0]));}};var SAVING=new WeakMap();var MERGING=new WeakMap();var HistoryEditor={isHistoryEditor:function isHistoryEditor(value){return History.isHistory(value.history)&&_slate.Editor.isEditor(value);},isMerging:function isMerging(editor){return MERGING.get(editor);},isSaving:function isSaving(editor){return SAVING.get(editor);},redo:function redo(editor){editor.redo();},undo:function undo(editor){editor.undo();},withoutMerging:function withoutMerging(editor,fn){var prev=HistoryEditor.isMerging(editor);MERGING.set(editor,false);fn();MERGING.set(editor,prev);},withoutSaving:function withoutSaving(editor,fn){var prev=HistoryEditor.isSaving(editor);SAVING.set(editor,false);fn();SAVING.set(editor,prev);}};var n=0;var Key=function Key(){(0,_classCallCheck2.default)(this,Key);this.id=''.concat(n++);};var NODE_TO_INDEX=new WeakMap();var NODE_TO_PARENT=new WeakMap();var EDITOR_TO_ELEMENT=new WeakMap();var ELEMENT_TO_NODE=new WeakMap();var KEY_TO_ELEMENT=new WeakMap();var NODE_TO_ELEMENT=new WeakMap();var NODE_TO_KEY=new WeakMap();var IS_READ_ONLY=new WeakMap();var IS_FOCUSED=new WeakMap();var EDITOR_TO_ON_CHANGE=new WeakMap();var PLACEHOLDER_SYMBOL=Symbol('placeholder');var isDOMComment=function isDOMComment(value){return isDOMNode(value)&&value.nodeType===8;};var isDOMElement=function isDOMElement(value){return isDOMNode(value)&&value.nodeType===1;};var isDOMNode=function isDOMNode(value){return value instanceof Node;};var isDOMText=function isDOMText(value){return isDOMNode(value)&&value.nodeType===3;};var isPlainTextOnlyPaste=function isPlainTextOnlyPaste(event){return event.clipboardData&&event.clipboardData.getData('text/plain')!==''&&event.clipboardData.types.length===1;};var normalizeDOMPoint=function normalizeDOMPoint(domPoint){var _domPoint=(0,_slicedToArray2.default)(domPoint,2),node=_domPoint[0],offset=_domPoint[1];if(isDOMElement(node)&&node.childNodes.length){var isLast=offset===node.childNodes.length;var direction=isLast?'backward':'forward';var index=isLast?offset-1:offset;node=getEditableChild(node,index,direction);while(isDOMElement(node)&&node.childNodes.length){var i=isLast?node.childNodes.length-1:0;node=getEditableChild(node,i,direction);}offset=isLast&&node.textContent!=null?node.textContent.length:0;}return[node,offset];};var getEditableChild=function getEditableChild(parent,index,direction){var childNodes=parent.childNodes;var child=childNodes[index];var i=index;var triedForward=false;var triedBackward=false;while(isDOMComment(child)||isDOMElement(child)&&child.childNodes.length===0||isDOMElement(child)&&child.getAttribute('contenteditable')==='false'){if(triedForward&&triedBackward){break;}if(i>=childNodes.length){triedForward=true;i=index-1;direction='backward';continue;}if(i<0){triedBackward=true;i=index+1;direction='forward';continue;}child=childNodes[i];i+=direction==='forward'?1:-1;}return child;};var getPlainText=function getPlainText(domNode){var text='';if(isDOMText(domNode)&&domNode.nodeValue){return domNode.nodeValue;}if(isDOMElement(domNode)){for(var _i=0,_Array$from=Array.from(domNode.childNodes);_i<_Array$from.length;_i++){var childNode=_Array$from[_i];text+=getPlainText(childNode);}var display=getComputedStyle(domNode).getPropertyValue('display');if(display==='block'||display==='list'||domNode.tagName==='BR'){text+='\\n';}}return text;};var ReactEditor={findKey:function findKey(editor,node){var key=NODE_TO_KEY.get(node);if(!key){key=new Key();NODE_TO_KEY.set(node,key);}return key;},findPath:function findPath(editor,node){var path=[];var child=node;while(true){var parent=NODE_TO_PARENT.get(child);if(parent==null){if(_slate.Editor.isEditor(child)){return path;}else{break;}}var i=NODE_TO_INDEX.get(child);if(i==null){break;}path.unshift(i);child=parent;}throw new Error('Unable to find the path for Slate node: '.concat(JSON.stringify(node)));},isFocused:function isFocused(editor){return!!IS_FOCUSED.get(editor);},isReadOnly:function isReadOnly(editor){return!!IS_READ_ONLY.get(editor);},blur:function blur(editor){var el=ReactEditor.toDOMNode(editor,editor);IS_FOCUSED.set(editor,false);if(window.document.activeElement===el){el.blur();}},focus:function focus(editor){var el=ReactEditor.toDOMNode(editor,editor);IS_FOCUSED.set(editor,true);if(window.document.activeElement!==el){el.focus({preventScroll:true});}},deselect:function deselect(editor){var selection=editor.selection;var domSelection=window.getSelection();if(domSelection&&domSelection.rangeCount>0){domSelection.removeAllRanges();}if(selection){_slate.Transforms.deselect(editor);}},hasDOMNode:function hasDOMNode(editor,target){var options=arguments.length>2&&arguments[2]!==undefined?arguments[2]:{};var _options$editable=options.editable,editable=_options$editable===void 0?false:_options$editable;var editorEl=ReactEditor.toDOMNode(editor,editor);var targetEl;try{targetEl=isDOMElement(target)?target:target.parentElement;}catch(err){if(!err.message.includes('Permission denied to access property \"nodeType\"')){throw err;}}if(!targetEl){return false;}return targetEl.closest('[data-slate-editor]')===editorEl&&(!editable||targetEl.isContentEditable||!!targetEl.getAttribute('data-slate-zero-width'));},insertData:function insertData(editor,data){editor.insertData(data);},setFragmentData:function setFragmentData(editor,data){editor.setFragmentData(data);},toDOMNode:function toDOMNode(editor,node){var domNode=_slate.Editor.isEditor(node)?EDITOR_TO_ELEMENT.get(editor):KEY_TO_ELEMENT.get(ReactEditor.findKey(editor,node));if(!domNode){throw new Error('Cannot resolve a DOM node from Slate node: '.concat(JSON.stringify(node)));}return domNode;},toDOMPoint:function toDOMPoint(editor,point){var _Editor$node=_slate.Editor.node(editor,point.path),_Editor$node2=(0,_slicedToArray2.default)(_Editor$node,1),node=_Editor$node2[0];var el=ReactEditor.toDOMNode(editor,node);var domPoint;if(_slate.Editor.void(editor,{at:point})){point={path:point.path,offset:0};}var selector='[data-slate-string], [data-slate-zero-width]';var texts=Array.from(el.querySelectorAll(selector));var start=0;for(var _i2=0,_texts=texts;_i2<_texts.length;_i2++){var text=_texts[_i2];var domNode=text.childNodes[0];if(domNode==null||domNode.textContent==null){continue;}var length=domNode.textContent.length;var attr=text.getAttribute('data-slate-length');var trueLength=attr==null?length:parseInt(attr,10);var end=start+trueLength;if(point.offset<=end){var offset=Math.min(length,Math.max(0,point.offset-start));domPoint=[domNode,offset];break;}start=end;}if(!domPoint){throw new Error('Cannot resolve a DOM point from Slate point: '.concat(JSON.stringify(point)));}return domPoint;},toDOMRange:function toDOMRange(editor,range){var anchor=range.anchor,focus=range.focus;var isBackward=_slate.Range.isBackward(range);var domAnchor=ReactEditor.toDOMPoint(editor,anchor);var domFocus=_slate.Range.isCollapsed(range)?domAnchor:ReactEditor.toDOMPoint(editor,focus);var domRange=window.document.createRange();var _ref=isBackward?domFocus:domAnchor,_ref2=(0,_slicedToArray2.default)(_ref,2),startNode=_ref2[0],startOffset=_ref2[1];var _ref3=isBackward?domAnchor:domFocus,_ref4=(0,_slicedToArray2.default)(_ref3,2),endNode=_ref4[0],endOffset=_ref4[1];var startEl=isDOMElement(startNode)?startNode:startNode.parentElement;var isStartAtZeroWidth=!!startEl.getAttribute('data-slate-zero-width');var endEl=isDOMElement(endNode)?endNode:endNode.parentElement;var isEndAtZeroWidth=!!endEl.getAttribute('data-slate-zero-width');domRange.setStart(startNode,isStartAtZeroWidth?1:startOffset);domRange.setEnd(endNode,isEndAtZeroWidth?1:endOffset);return domRange;},toSlateNode:function toSlateNode(editor,domNode){var domEl=isDOMElement(domNode)?domNode:domNode.parentElement;if(domEl&&!domEl.hasAttribute('data-slate-node')){domEl=domEl.closest('[data-slate-node]');}var node=domEl?ELEMENT_TO_NODE.get(domEl):null;if(!node){throw new Error('Cannot resolve a Slate node from DOM node: '.concat(domEl));}return node;},findEventRange:function findEventRange(editor,event){if('nativeEvent'in event){event=event.nativeEvent;}var _event=event,x=_event.clientX,y=_event.clientY,target=_event.target;if(x==null||y==null){throw new Error('Cannot resolve a Slate range from a DOM event: '.concat(event));}var node=ReactEditor.toSlateNode(editor,event.target);var path=ReactEditor.findPath(editor,node);if(_slate.Editor.isVoid(editor,node)){var rect=target.getBoundingClientRect();var isPrev=editor.isInline(node)?x-rect.left<rect.left+rect.width-x:y-rect.top<rect.top+rect.height-y;var edge=_slate.Editor.point(editor,path,{edge:isPrev?'start':'end'});var point=isPrev?_slate.Editor.before(editor,edge):_slate.Editor.after(editor,edge);if(point){var _range=_slate.Editor.range(editor,point);return _range;}}var domRange;var _window=window,document=_window.document;if(document.caretRangeFromPoint){domRange=document.caretRangeFromPoint(x,y);}else{var position=document.caretPositionFromPoint(x,y);if(position){domRange=document.createRange();domRange.setStart(position.offsetNode,position.offset);domRange.setEnd(position.offsetNode,position.offset);}}if(!domRange){throw new Error('Cannot resolve a Slate range from a DOM event: '.concat(event));}var range=ReactEditor.toSlateRange(editor,domRange);return range;},toSlatePoint:function toSlatePoint(editor,domPoint){var _normalizeDOMPoint=normalizeDOMPoint(domPoint),_normalizeDOMPoint2=(0,_slicedToArray2.default)(_normalizeDOMPoint,2),nearestNode=_normalizeDOMPoint2[0],nearestOffset=_normalizeDOMPoint2[1];var parentNode=nearestNode.parentNode;var textNode=null;var offset=0;if(parentNode){var voidNode=parentNode.closest('[data-slate-void=\"true\"]');var leafNode=parentNode.closest('[data-slate-leaf]');var domNode=null;if(leafNode){textNode=leafNode.closest('[data-slate-node=\"text\"]');var range=window.document.createRange();range.setStart(textNode,0);range.setEnd(nearestNode,nearestOffset);var contents=range.cloneContents();var removals=[].concat((0,_toConsumableArray2.default)(contents.querySelectorAll('[data-slate-zero-width]')),(0,_toConsumableArray2.default)(contents.querySelectorAll('[contenteditable=false]')));removals.forEach(function(el){el.parentNode.removeChild(el);});offset=contents.textContent.length;domNode=textNode;}else if(voidNode){leafNode=voidNode.querySelector('[data-slate-leaf]');textNode=leafNode.closest('[data-slate-node=\"text\"]');domNode=leafNode;offset=domNode.textContent.length;}if(domNode&&offset===domNode.textContent.length&&parentNode.hasAttribute('data-slate-zero-width')){offset--;}}if(!textNode){throw new Error('Cannot resolve a Slate point from DOM point: '.concat(domPoint));}var slateNode=ReactEditor.toSlateNode(editor,textNode);var path=ReactEditor.findPath(editor,slateNode);return{path:path,offset:offset};},toSlateRange:function toSlateRange(editor,domRange){var el=domRange instanceof Selection?domRange.anchorNode:domRange.startContainer;var anchorNode;var anchorOffset;var focusNode;var focusOffset;var isCollapsed;if(el){if(domRange instanceof Selection){anchorNode=domRange.anchorNode;anchorOffset=domRange.anchorOffset;focusNode=domRange.focusNode;focusOffset=domRange.focusOffset;isCollapsed=domRange.isCollapsed;}else{anchorNode=domRange.startContainer;anchorOffset=domRange.startOffset;focusNode=domRange.endContainer;focusOffset=domRange.endOffset;isCollapsed=domRange.collapsed;}}if(anchorNode==null||focusNode==null||anchorOffset==null||focusOffset==null){throw new Error('Cannot resolve a Slate range from DOM range: '.concat(domRange));}var anchor=ReactEditor.toSlatePoint(editor,[anchorNode,anchorOffset]);var focus=isCollapsed?anchor:ReactEditor.toSlatePoint(editor,[focusNode,focusOffset]);return{anchor:anchor,focus:focus};}};exports.ReactEditor=ReactEditor;var FocusedContext=(0,_react.createContext)(false);var useFocused=function useFocused(){return(0,_react.useContext)(FocusedContext);};exports.useFocused=useFocused;var EditorContext=(0,_react.createContext)(null);var useSlateStatic=function useSlateStatic(){var editor=(0,_react.useContext)(EditorContext);if(!editor){throw new Error(\"The `useSlateStatic` hook must be used inside the <Slate> component's context.\");}return editor;};exports.useSlateStatic=useSlateStatic;var SlateContext=(0,_react.createContext)(null);var useSlate=function useSlate(){var context=(0,_react.useContext)(SlateContext);if(!context){throw new Error(\"The `useSlate` hook must be used inside the <SlateProvider> component's context.\");}var _context=(0,_slicedToArray2.default)(context,1),editor=_context[0];return editor;};exports.useSlate=useSlate;var Slate=function Slate(props){var editor=props.editor,children=props.children,onChange=props.onChange,value=props.value,rest=_objectWithoutProperties(props,['editor','children','onChange','value']);var _useState=(0,_react.useState)(0),_useState2=(0,_slicedToArray2.default)(_useState,2),key=_useState2[0],setKey=_useState2[1];var context=(0,_react.useMemo)(function(){editor.children=value;(0,_extends2.default)(editor,rest);return[editor];},[key,value].concat((0,_toConsumableArray2.default)(Object.values(rest))));var onContextChange=(0,_react.useCallback)(function(){onChange(editor.children);setKey(key+1);},[key,onChange]);EDITOR_TO_ON_CHANGE.set(editor,onContextChange);(0,_react.useEffect)(function(){return function(){EDITOR_TO_ON_CHANGE.set(editor,function(){});};},[]);return _react.default.createElement(SlateContext.Provider,{value:context},_react.default.createElement(EditorContext.Provider,{value:editor},_react.default.createElement(FocusedContext.Provider,{value:ReactEditor.isFocused(editor)},children)));};exports.Slate=Slate;var useEditor=function useEditor(){var editor=(0,_react.useContext)(EditorContext);if(!editor){throw new Error(\"The `useEditor` hook must be used inside the <Slate> component's context.\");}return editor;};exports.useEditor=useEditor;var ReadOnlyContext=(0,_react.createContext)(false);var useReadOnly=function useReadOnly(){return(0,_react.useContext)(ReadOnlyContext);};exports.useReadOnly=useReadOnly;var SelectedContext=(0,_react.createContext)(false);var useSelected=function useSelected(){return(0,_react.useContext)(SelectedContext);};exports.useSelected=useSelected;var withReact=function withReact(editor){var e=editor;var apply=e.apply,onChange=e.onChange;e.apply=function(op){var matches=[];switch(op.type){case'insert_text':case'remove_text':case'set_node':{for(var _iterator=_createForOfIteratorHelperLoose(_slate.Editor.levels(e,{at:op.path})),_step;!(_step=_iterator()).done;){var _ref5=_step.value;var _ref6=(0,_slicedToArray2.default)(_ref5,2);var node=_ref6[0];var path=_ref6[1];var key=ReactEditor.findKey(e,node);matches.push([path,key]);}break;}case'insert_node':case'remove_node':case'merge_node':case'split_node':{for(var _iterator2=_createForOfIteratorHelperLoose(_slate.Editor.levels(e,{at:_slate.Path.parent(op.path)})),_step2;!(_step2=_iterator2()).done;){var _ref7=_step2.value;var _ref8=(0,_slicedToArray2.default)(_ref7,2);var _node=_ref8[0];var _path=_ref8[1];var _key=ReactEditor.findKey(e,_node);matches.push([_path,_key]);}break;}}apply(op);for(var _i3=0,_matches=matches;_i3<_matches.length;_i3++){var _ref9=_matches[_i3];var _ref10=(0,_slicedToArray2.default)(_ref9,2);var _path2=_ref10[0];var _key2=_ref10[1];var _Editor$node3=_slate.Editor.node(e,_path2),_Editor$node4=(0,_slicedToArray2.default)(_Editor$node3,1),_node2=_Editor$node4[0];NODE_TO_KEY.set(_node2,_key2);}};e.setFragmentData=function(data){var selection=e.selection;if(!selection){return;}var _Range$edges=_slate.Range.edges(selection),_Range$edges2=(0,_slicedToArray2.default)(_Range$edges,2),start=_Range$edges2[0],end=_Range$edges2[1];var startVoid=_slate.Editor.void(e,{at:start.path});var endVoid=_slate.Editor.void(e,{at:end.path});if(_slate.Range.isCollapsed(selection)&&!startVoid){return;}var domRange=ReactEditor.toDOMRange(e,selection);var contents=domRange.cloneContents();var attach=contents.childNodes[0];contents.childNodes.forEach(function(node){if(node.textContent&&node.textContent.trim()!==''){attach=node;}});if(endVoid){var _endVoid=(0,_slicedToArray2.default)(endVoid,1),voidNode=_endVoid[0];var r=domRange.cloneRange();var domNode=ReactEditor.toDOMNode(e,voidNode);r.setEndAfter(domNode);contents=r.cloneContents();}if(startVoid){attach=contents.querySelector('[data-slate-spacer]');}Array.from(contents.querySelectorAll('[data-slate-zero-width]')).forEach(function(zw){var isNewline=zw.getAttribute('data-slate-zero-width')==='n';zw.textContent=isNewline?'\\n':'';});if(isDOMText(attach)){var span=document.createElement('span');span.style.whiteSpace='pre';span.appendChild(attach);contents.appendChild(span);attach=span;}var fragment=e.getFragment();var string=JSON.stringify(fragment);var encoded=window.btoa(encodeURIComponent(string));attach.setAttribute('data-slate-fragment',encoded);data.setData('application/x-slate-fragment',encoded);var div=document.createElement('div');div.appendChild(contents);div.setAttribute('hidden','true');document.body.appendChild(div);data.setData('text/html',div.innerHTML);data.setData('text/plain',getPlainText(div));document.body.removeChild(div);};e.insertData=function(data){var fragment=data.getData('application/x-slate-fragment');if(fragment){var decoded=decodeURIComponent(window.atob(fragment));var parsed=JSON.parse(decoded);e.insertFragment(parsed);return;}var text=data.getData('text/plain');if(text){var lines=text.split(/\\r\\n|\\r|\\n/);var split=false;for(var _iterator3=_createForOfIteratorHelperLoose(lines),_step3;!(_step3=_iterator3()).done;){var line=_step3.value;if(split){_slate.Transforms.splitNodes(e,{always:true});}e.insertText(line);split=true;}}};e.onChange=function(){_reactDom.default.unstable_batchedUpdates(function(){var onContextChange=EDITOR_TO_ON_CHANGE.get(e);if(onContextChange){onContextChange();}onChange();});};return e;};exports.withReact=withReact;var String=function String(props){var isLast=props.isLast,leaf=props.leaf,parent=props.parent,text=props.text;var editor=useSlateStatic();var path=ReactEditor.findPath(editor,text);var parentPath=_slate.Path.parent(path);if(editor.isVoid(parent)){return _react.default.createElement(ZeroWidthString,{length:_slate.Node.string(parent).length});}if(leaf.text===''&&parent.children[parent.children.length-1]===text&&!editor.isInline(parent)&&_slate.Editor.string(editor,parentPath)===''){return _react.default.createElement(ZeroWidthString,{isLineBreak:true});}if(leaf.text===''){return _react.default.createElement(ZeroWidthString,null);}if(isLast&&leaf.text.slice(-1)==='\\n'){return _react.default.createElement(TextString,{isTrailing:true,text:leaf.text});}return _react.default.createElement(TextString,{text:leaf.text});};var TextString=function TextString(props){var text=props.text,_props$isTrailing=props.isTrailing,isTrailing=_props$isTrailing===void 0?false:_props$isTrailing;return _react.default.createElement('span',{'data-slate-string':true},text,isTrailing?'\\n':null);};var ZeroWidthString=function ZeroWidthString(props){var _props$length=props.length,length=_props$length===void 0?0:_props$length,_props$isLineBreak=props.isLineBreak,isLineBreak=_props$isLineBreak===void 0?false:_props$isLineBreak;return _react.default.createElement('span',{'data-slate-zero-width':isLineBreak?'n':'z','data-slate-length':length},\"\\uFEFF\",isLineBreak?_react.default.createElement('br',null):null);};var Leaf=function Leaf(props){var leaf=props.leaf,isLast=props.isLast,text=props.text,parent=props.parent,_props$renderLeaf=props.renderLeaf,renderLeaf=_props$renderLeaf===void 0?function(props){return _react.default.createElement(DefaultLeaf,(0,_extends2.default)({},props));}:_props$renderLeaf;var children=_react.default.createElement(String,{isLast:isLast,leaf:leaf,parent:parent,text:text});if(leaf[PLACEHOLDER_SYMBOL]){children=_react.default.createElement(_react.default.Fragment,null,_react.default.createElement('span',{contentEditable:false,style:{pointerEvents:'none',display:'inline-block',width:'0',maxWidth:'100%',whiteSpace:'nowrap',opacity:'0.333',userSelect:'none',fontStyle:'normal',fontWeight:'normal',textDecoration:'none'}},leaf.placeholder),children);}var attributes={'data-slate-leaf':true};return renderLeaf({attributes:attributes,children:children,leaf:leaf,text:text});};var MemoizedLeaf=_react.default.memo(Leaf,function(prev,next){return next.parent===prev.parent&&next.isLast===prev.isLast&&next.renderLeaf===prev.renderLeaf&&next.text===prev.text&&_slate.Text.matches(next.leaf,prev.leaf);});var DefaultLeaf=function DefaultLeaf(props){var attributes=props.attributes,children=props.children;return _react.default.createElement('span',(0,_extends2.default)({},attributes),children);};exports.DefaultLeaf=DefaultLeaf;var useIsomorphicLayoutEffect=typeof window!=='undefined'?_react.useLayoutEffect:_react.useEffect;var Text=function Text(props){var decorations=props.decorations,isLast=props.isLast,parent=props.parent,renderLeaf=props.renderLeaf,text=props.text;var editor=useSlateStatic();var ref=(0,_react.useRef)(null);var leaves=_slate.Text.decorations(text,decorations);var key=ReactEditor.findKey(editor,text);var children=[];for(var i=0;i<leaves.length;i++){var leaf=leaves[i];children.push(_react.default.createElement(MemoizedLeaf,{isLast:isLast&&i===leaves.length-1,key:''.concat(key.id,'-').concat(i),leaf:leaf,text:text,parent:parent,renderLeaf:renderLeaf}));}useIsomorphicLayoutEffect(function(){if(ref.current){KEY_TO_ELEMENT.set(key,ref.current);NODE_TO_ELEMENT.set(text,ref.current);ELEMENT_TO_NODE.set(ref.current,text);}else{KEY_TO_ELEMENT.delete(key);NODE_TO_ELEMENT.delete(text);}});return _react.default.createElement('span',{'data-slate-node':'text',ref:ref},children);};var MemoizedText=_react.default.memo(Text,function(prev,next){return next.parent===prev.parent&&next.isLast===prev.isLast&&next.renderLeaf===prev.renderLeaf&&next.text===prev.text;});var Element=function Element(props){var decorate=props.decorate,decorations=props.decorations,element=props.element,_props$renderElement=props.renderElement,renderElement=_props$renderElement===void 0?function(p){return _react.default.createElement(DefaultElement,(0,_extends2.default)({},p));}:_props$renderElement,renderLeaf=props.renderLeaf,selection=props.selection;var ref=(0,_react.useRef)(null);var editor=useSlateStatic();var readOnly=useReadOnly();var isInline=editor.isInline(element);var key=ReactEditor.findKey(editor,element);var children=_react.default.createElement(Children,{decorate:decorate,decorations:decorations,node:element,renderElement:renderElement,renderLeaf:renderLeaf,selection:selection});var attributes={'data-slate-node':'element',ref:ref};if(isInline){attributes['data-slate-inline']=true;}if(!isInline&&_slate.Editor.hasInlines(editor,element)){var text=_slate.Node.string(element);var dir=(0,_direction.default)(text);if(dir==='rtl'){attributes.dir=dir;}}if(_slate.Editor.isVoid(editor,element)){attributes['data-slate-void']=true;if(!readOnly&&isInline){attributes.contentEditable=false;}var Tag=isInline?'span':'div';var _Node$1$texts=_slate.Node.texts(element),_Node$1$texts2=(0,_slicedToArray2.default)(_Node$1$texts,1),_Node$1$texts2$=(0,_slicedToArray2.default)(_Node$1$texts2[0],1),_text=_Node$1$texts2$[0];children=readOnly?null:_react.default.createElement(Tag,{'data-slate-spacer':true,style:{height:'0',color:'transparent',outline:'none',position:'absolute'}},_react.default.createElement(MemoizedText,{decorations:[],isLast:false,parent:element,text:_text}));NODE_TO_INDEX.set(_text,0);NODE_TO_PARENT.set(_text,element);}useIsomorphicLayoutEffect(function(){if(ref.current){KEY_TO_ELEMENT.set(key,ref.current);NODE_TO_ELEMENT.set(element,ref.current);ELEMENT_TO_NODE.set(ref.current,element);}else{KEY_TO_ELEMENT.delete(key);NODE_TO_ELEMENT.delete(element);}});return _react.default.createElement(SelectedContext.Provider,{value:!!selection},renderElement({attributes:attributes,children:children,element:element}));};var MemoizedElement=_react.default.memo(Element,function(prev,next){return prev.decorate===next.decorate&&prev.element===next.element&&prev.renderElement===next.renderElement&&prev.renderLeaf===next.renderLeaf&&isRangeListEqual(prev.decorations,next.decorations)&&(prev.selection===next.selection||!!prev.selection&&!!next.selection&&_slate.Range.equals(prev.selection,next.selection));});var DefaultElement=function DefaultElement(props){var attributes=props.attributes,children=props.children,element=props.element;var editor=useSlateStatic();var Tag=editor.isInline(element)?'span':'div';return _react.default.createElement(Tag,(0,_extends2.default)({},attributes,{style:{position:'relative'}}),children);};exports.DefaultElement=DefaultElement;var isRangeListEqual=function isRangeListEqual(list,another){if(list.length!==another.length){return false;}for(var i=0;i<list.length;i++){var range=list[i];var other=another[i];if(!_slate.Range.equals(range,other)){return false;}}return true;};var Children=function Children(props){var decorate=props.decorate,decorations=props.decorations,node=props.node,renderElement=props.renderElement,renderLeaf=props.renderLeaf,selection=props.selection;var editor=useSlateStatic();var path=ReactEditor.findPath(editor,node);var children=[];var isLeafBlock=_slate.Element.isElement(node)&&!editor.isInline(node)&&_slate.Editor.hasInlines(editor,node);for(var i=0;i<node.children.length;i++){var p=path.concat(i);var n=node.children[i];var key=ReactEditor.findKey(editor,n);var range=_slate.Editor.range(editor,p);var sel=selection&&_slate.Range.intersection(range,selection);var ds=decorate([n,p]);for(var _iterator4=_createForOfIteratorHelperLoose(decorations),_step4;!(_step4=_iterator4()).done;){var dec=_step4.value;var d=_slate.Range.intersection(dec,range);if(d){ds.push(d);}}if(_slate.Element.isElement(n)){children.push(_react.default.createElement(MemoizedElement,{decorate:decorate,decorations:ds,element:n,key:key.id,renderElement:renderElement,renderLeaf:renderLeaf,selection:sel}));}else{children.push(_react.default.createElement(MemoizedText,{decorations:ds,key:key.id,isLast:isLeafBlock&&i===node.children.length-1,parent:node,renderLeaf:renderLeaf,text:n}));}NODE_TO_INDEX.set(n,i);NODE_TO_PARENT.set(n,node);}return _react.default.createElement(_react.default.Fragment,null,children);};var IS_IOS=typeof navigator!=='undefined'&&typeof window!=='undefined'&&/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;var IS_APPLE=typeof navigator!=='undefined'&&/Mac OS X/.test(navigator.userAgent);var IS_FIREFOX=typeof navigator!=='undefined'&&/^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);var IS_SAFARI=typeof navigator!=='undefined'&&/Version\\/[\\d\\.]+.*Safari/.test(navigator.userAgent);var IS_EDGE_LEGACY=typeof navigator!=='undefined'&&/Edge?\\/(?:[0-6][0-9]|[0-7][0-8])/i.test(navigator.userAgent);var IS_CHROME_LEGACY=typeof navigator!=='undefined'&&/Chrome?\\/(?:[0-7][0-5]|[0-6][0-9])/i.test(navigator.userAgent);var HOTKEYS={bold:'mod+b',compose:['down','left','right','up','backspace','enter'],moveBackward:'left',moveForward:'right',moveWordBackward:'ctrl+left',moveWordForward:'ctrl+right',deleteBackward:'shift?+backspace',deleteForward:'shift?+delete',extendBackward:'shift+left',extendForward:'shift+right',italic:'mod+i',splitBlock:'shift?+enter',undo:'mod+z'};var APPLE_HOTKEYS={moveLineBackward:'opt+up',moveLineForward:'opt+down',moveWordBackward:'opt+left',moveWordForward:'opt+right',deleteBackward:['ctrl+backspace','ctrl+h'],deleteForward:['ctrl+delete','ctrl+d'],deleteLineBackward:'cmd+shift?+backspace',deleteLineForward:['cmd+shift?+delete','ctrl+k'],deleteWordBackward:'opt+shift?+backspace',deleteWordForward:'opt+shift?+delete',extendLineBackward:'opt+shift+up',extendLineForward:'opt+shift+down',redo:'cmd+shift+z',transposeCharacter:'ctrl+t'};var WINDOWS_HOTKEYS={deleteWordBackward:'ctrl+shift?+backspace',deleteWordForward:'ctrl+shift?+delete',redo:['ctrl+y','ctrl+shift+z']};var create=function create(key){var generic=HOTKEYS[key];var apple=APPLE_HOTKEYS[key];var windows=WINDOWS_HOTKEYS[key];var isGeneric=generic&&(0,_isHotkey.isKeyHotkey)(generic);var isApple=apple&&(0,_isHotkey.isKeyHotkey)(apple);var isWindows=windows&&(0,_isHotkey.isKeyHotkey)(windows);return function(event){if(isGeneric&&isGeneric(event))return true;if(IS_APPLE&&isApple&&isApple(event))return true;if(!IS_APPLE&&isWindows&&isWindows(event))return true;return false;};};var Hotkeys={isBold:create('bold'),isCompose:create('compose'),isMoveBackward:create('moveBackward'),isMoveForward:create('moveForward'),isDeleteBackward:create('deleteBackward'),isDeleteForward:create('deleteForward'),isDeleteLineBackward:create('deleteLineBackward'),isDeleteLineForward:create('deleteLineForward'),isDeleteWordBackward:create('deleteWordBackward'),isDeleteWordForward:create('deleteWordForward'),isExtendBackward:create('extendBackward'),isExtendForward:create('extendForward'),isExtendLineBackward:create('extendLineBackward'),isExtendLineForward:create('extendLineForward'),isItalic:create('italic'),isMoveLineBackward:create('moveLineBackward'),isMoveLineForward:create('moveLineForward'),isMoveWordBackward:create('moveWordBackward'),isMoveWordForward:create('moveWordForward'),isRedo:create('redo'),isSplitBlock:create('splitBlock'),isTransposeCharacter:create('transposeCharacter'),isUndo:create('undo')};function ownKeys(object,enumerableOnly){var keys=Object.keys(object);if(Object.getOwnPropertySymbols){var symbols=Object.getOwnPropertySymbols(object);if(enumerableOnly)symbols=symbols.filter(function(sym){return Object.getOwnPropertyDescriptor(object,sym).enumerable;});keys.push.apply(keys,symbols);}return keys;}function _objectSpread(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]!=null?arguments[i]:{};if(i%2){ownKeys(Object(source),true).forEach(function(key){_defineProperty(target,key,source[key]);});}else if(Object.getOwnPropertyDescriptors){Object.defineProperties(target,Object.getOwnPropertyDescriptors(source));}else{ownKeys(Object(source)).forEach(function(key){Object.defineProperty(target,key,Object.getOwnPropertyDescriptor(source,key));});}}return target;}var HAS_BEFORE_INPUT_SUPPORT=!(IS_FIREFOX||IS_EDGE_LEGACY||IS_CHROME_LEGACY);var Editable=function Editable(props){var autoFocus=props.autoFocus,_props$decorate=props.decorate,decorate=_props$decorate===void 0?defaultDecorate:_props$decorate,propsOnDOMBeforeInput=props.onDOMBeforeInput,placeholder=props.placeholder,_props$readOnly=props.readOnly,readOnly=_props$readOnly===void 0?false:_props$readOnly,renderElement=props.renderElement,renderLeaf=props.renderLeaf,_props$style=props.style,style=_props$style===void 0?{}:_props$style,_props$as=props.as,Component=_props$as===void 0?'div':_props$as,attributes=_objectWithoutProperties(props,['autoFocus','decorate','onDOMBeforeInput','placeholder','readOnly','renderElement','renderLeaf','style','as']);var editor=useSlate();var ref=(0,_react.useRef)(null);IS_READ_ONLY.set(editor,readOnly);var state=(0,_react.useMemo)(function(){return{isComposing:false,isUpdatingSelection:false,latestElement:null};},[]);useIsomorphicLayoutEffect(function(){if(ref.current){EDITOR_TO_ELEMENT.set(editor,ref.current);NODE_TO_ELEMENT.set(editor,ref.current);ELEMENT_TO_NODE.set(ref.current,editor);}else{NODE_TO_ELEMENT.delete(editor);}});useIsomorphicLayoutEffect(function(){var selection=editor.selection;var domSelection=window.getSelection();if(state.isComposing||!domSelection||!ReactEditor.isFocused(editor)){return;}var hasDomSelection=domSelection.type!=='None';if(!selection&&!hasDomSelection){return;}var editorElement=EDITOR_TO_ELEMENT.get(editor);var hasDomSelectionInEditor=false;if(editorElement.contains(domSelection.anchorNode)&&editorElement.contains(domSelection.focusNode)){hasDomSelectionInEditor=true;}if(hasDomSelection&&hasDomSelectionInEditor&&selection&&_slate.Range.equals(ReactEditor.toSlateRange(editor,domSelection),selection)){return;}var el=ReactEditor.toDOMNode(editor,editor);state.isUpdatingSelection=true;var newDomRange=selection&&ReactEditor.toDOMRange(editor,selection);if(newDomRange){if(_slate.Range.isBackward(selection)){domSelection.setBaseAndExtent(newDomRange.endContainer,newDomRange.endOffset,newDomRange.startContainer,newDomRange.startOffset);}else{domSelection.setBaseAndExtent(newDomRange.startContainer,newDomRange.startOffset,newDomRange.endContainer,newDomRange.endOffset);}var leafEl=newDomRange.startContainer.parentElement;(0,_scrollIntoViewIfNeeded.default)(leafEl,{scrollMode:'if-needed',boundary:el});}else{domSelection.removeAllRanges();}setTimeout(function(){if(newDomRange&&IS_FIREFOX){el.focus();}state.isUpdatingSelection=false;});});(0,_react.useEffect)(function(){if(ref.current&&autoFocus){ref.current.focus();}},[autoFocus]);var onDOMBeforeInput=(0,_react.useCallback)(function(event){if(!readOnly&&hasEditableTarget(editor,event.target)&&!isDOMEventHandled(event,propsOnDOMBeforeInput)){var selection=editor.selection;var type=event.inputType;var data=event.dataTransfer||event.data||undefined;if(type==='insertCompositionText'||type==='deleteCompositionText'){return;}event.preventDefault();if(!type.startsWith('delete')||type.startsWith('deleteBy')){var _event$getTargetRange=event.getTargetRanges(),_event$getTargetRange2=(0,_slicedToArray2.default)(_event$getTargetRange,1),targetRange=_event$getTargetRange2[0];if(targetRange){var range=ReactEditor.toSlateRange(editor,targetRange);if(!selection||!_slate.Range.equals(selection,range)){_slate.Transforms.select(editor,range);}}}if(selection&&_slate.Range.isExpanded(selection)&&type.startsWith('delete')){_slate.Editor.deleteFragment(editor);return;}switch(type){case'deleteByComposition':case'deleteByCut':case'deleteByDrag':{_slate.Editor.deleteFragment(editor);break;}case'deleteContent':case'deleteContentForward':{_slate.Editor.deleteForward(editor);break;}case'deleteContentBackward':{_slate.Editor.deleteBackward(editor);break;}case'deleteEntireSoftLine':{_slate.Editor.deleteBackward(editor,{unit:'line'});_slate.Editor.deleteForward(editor,{unit:'line'});break;}case'deleteHardLineBackward':{_slate.Editor.deleteBackward(editor,{unit:'block'});break;}case'deleteSoftLineBackward':{_slate.Editor.deleteBackward(editor,{unit:'line'});break;}case'deleteHardLineForward':{_slate.Editor.deleteForward(editor,{unit:'block'});break;}case'deleteSoftLineForward':{_slate.Editor.deleteForward(editor,{unit:'line'});break;}case'deleteWordBackward':{_slate.Editor.deleteBackward(editor,{unit:'word'});break;}case'deleteWordForward':{_slate.Editor.deleteForward(editor,{unit:'word'});break;}case'insertLineBreak':case'insertParagraph':{_slate.Editor.insertBreak(editor);break;}case'insertFromComposition':case'insertFromDrop':case'insertFromPaste':case'insertFromYank':case'insertReplacementText':case'insertText':{if(data instanceof DataTransfer){ReactEditor.insertData(editor,data);}else if(typeof data==='string'){_slate.Editor.insertText(editor,data);}break;}}}},[readOnly,propsOnDOMBeforeInput]);useIsomorphicLayoutEffect(function(){if(ref.current&&HAS_BEFORE_INPUT_SUPPORT){ref.current.addEventListener('beforeinput',onDOMBeforeInput);}return function(){if(ref.current&&HAS_BEFORE_INPUT_SUPPORT){ref.current.removeEventListener('beforeinput',onDOMBeforeInput);}};},[onDOMBeforeInput]);var onDOMSelectionChange=(0,_react.useCallback)((0,_throttle.default)(function(){if(!readOnly&&!state.isComposing&&!state.isUpdatingSelection){var activeElement=window.document.activeElement;var el=ReactEditor.toDOMNode(editor,editor);var domSelection=window.getSelection();if(activeElement===el){state.latestElement=activeElement;IS_FOCUSED.set(editor,true);}else{IS_FOCUSED.delete(editor);}if(!domSelection){return _slate.Transforms.deselect(editor);}var anchorNode=domSelection.anchorNode,focusNode=domSelection.focusNode;var anchorNodeSelectable=hasEditableTarget(editor,anchorNode)||isTargetInsideVoid(editor,anchorNode);var focusNodeSelectable=hasEditableTarget(editor,focusNode)||isTargetInsideVoid(editor,focusNode);if(anchorNodeSelectable&&focusNodeSelectable){var range=ReactEditor.toSlateRange(editor,domSelection);_slate.Transforms.select(editor,range);}else{_slate.Transforms.deselect(editor);}}},100),[readOnly]);useIsomorphicLayoutEffect(function(){window.document.addEventListener('selectionchange',onDOMSelectionChange);return function(){window.document.removeEventListener('selectionchange',onDOMSelectionChange);};},[onDOMSelectionChange]);var decorations=decorate([editor,[]]);if(placeholder&&editor.children.length===1&&Array.from(_slate.Node.texts(editor)).length===1&&_slate.Node.string(editor)===''){var _decorations$push;var start=_slate.Editor.start(editor,[]);decorations.push((_decorations$push={},(0,_defineProperty3.default)(_decorations$push,PLACEHOLDER_SYMBOL,true),(0,_defineProperty3.default)(_decorations$push,\"placeholder\",placeholder),(0,_defineProperty3.default)(_decorations$push,\"anchor\",start),(0,_defineProperty3.default)(_decorations$push,\"focus\",start),_decorations$push));}return _react.default.createElement(ReadOnlyContext.Provider,{value:readOnly},_react.default.createElement(Component,(0,_extends2.default)({'data-gramm':false,role:readOnly?undefined:'textbox'},attributes,{spellCheck:!HAS_BEFORE_INPUT_SUPPORT?undefined:attributes.spellCheck,autoCorrect:!HAS_BEFORE_INPUT_SUPPORT?undefined:attributes.autoCorrect,autoCapitalize:!HAS_BEFORE_INPUT_SUPPORT?undefined:attributes.autoCapitalize,'data-slate-editor':true,'data-slate-node':'value',contentEditable:readOnly?undefined:true,suppressContentEditableWarning:true,ref:ref,style:_objectSpread({outline:'none',whiteSpace:'pre-wrap',wordWrap:'break-word'},style),onBeforeInput:(0,_react.useCallback)(function(event){if(!HAS_BEFORE_INPUT_SUPPORT&&!readOnly&&!isEventHandled(event,attributes.onBeforeInput)&&hasEditableTarget(editor,event.target)){event.preventDefault();var text=event.data;_slate.Editor.insertText(editor,text);}},[readOnly]),onBlur:(0,_react.useCallback)(function(event){if(readOnly||state.isUpdatingSelection||!hasEditableTarget(editor,event.target)||isEventHandled(event,attributes.onBlur)){return;}if(state.latestElement===window.document.activeElement){return;}var relatedTarget=event.relatedTarget;var el=ReactEditor.toDOMNode(editor,editor);if(relatedTarget===el){return;}if(isDOMElement(relatedTarget)&&relatedTarget.hasAttribute('data-slate-spacer')){return;}if(relatedTarget!=null&&isDOMNode(relatedTarget)&&ReactEditor.hasDOMNode(editor,relatedTarget)){var node=ReactEditor.toSlateNode(editor,relatedTarget);if(_slate.Element.isElement(node)&&!editor.isVoid(node)){return;}}IS_FOCUSED.delete(editor);},[readOnly,attributes.onBlur]),onClick:(0,_react.useCallback)(function(event){if(!readOnly&&hasTarget(editor,event.target)&&!isEventHandled(event,attributes.onClick)&&isDOMNode(event.target)){var node=ReactEditor.toSlateNode(editor,event.target);var path=ReactEditor.findPath(editor,node);var _start=_slate.Editor.start(editor,path);var end=_slate.Editor.end(editor,path);var startVoid=_slate.Editor.void(editor,{at:_start});var endVoid=_slate.Editor.void(editor,{at:end});if(startVoid&&endVoid&&_slate.Path.equals(startVoid[1],endVoid[1])){var range=_slate.Editor.range(editor,_start);_slate.Transforms.select(editor,range);}}},[readOnly,attributes.onClick]),onCompositionEnd:(0,_react.useCallback)(function(event){if(hasEditableTarget(editor,event.target)&&!isEventHandled(event,attributes.onCompositionEnd)){state.isComposing=false;if(!IS_SAFARI&&!IS_FIREFOX&&event.data){_slate.Editor.insertText(editor,event.data);}}},[attributes.onCompositionEnd]),onCompositionUpdate:(0,_react.useCallback)(function(event){if(hasEditableTarget(editor,event.target)&&!isEventHandled(event,attributes.onCompositionUpdate)){state.isComposing=true;}},[attributes.onCompositionUpdate]),onCompositionStart:(0,_react.useCallback)(function(event){if(hasEditableTarget(editor,event.target)&&!isEventHandled(event,attributes.onCompositionStart)){var selection=editor.selection;if(selection&&_slate.Range.isExpanded(selection)){_slate.Editor.deleteFragment(editor);}}},[attributes.onCompositionStart]),onCopy:(0,_react.useCallback)(function(event){if(hasEditableTarget(editor,event.target)&&!isEventHandled(event,attributes.onCopy)){event.preventDefault();ReactEditor.setFragmentData(editor,event.clipboardData);}},[attributes.onCopy]),onCut:(0,_react.useCallback)(function(event){if(!readOnly&&hasEditableTarget(editor,event.target)&&!isEventHandled(event,attributes.onCut)){event.preventDefault();ReactEditor.setFragmentData(editor,event.clipboardData);var selection=editor.selection;if(selection&&_slate.Range.isExpanded(selection)){_slate.Editor.deleteFragment(editor);}}},[readOnly,attributes.onCut]),onDragOver:(0,_react.useCallback)(function(event){if(hasTarget(editor,event.target)&&!isEventHandled(event,attributes.onDragOver)){var node=ReactEditor.toSlateNode(editor,event.target);if(_slate.Editor.isVoid(editor,node)){event.preventDefault();}}},[attributes.onDragOver]),onDragStart:(0,_react.useCallback)(function(event){if(hasTarget(editor,event.target)&&!isEventHandled(event,attributes.onDragStart)){var node=ReactEditor.toSlateNode(editor,event.target);var path=ReactEditor.findPath(editor,node);var voidMatch=_slate.Editor.void(editor,{at:path});if(voidMatch){var range=_slate.Editor.range(editor,path);_slate.Transforms.select(editor,range);}ReactEditor.setFragmentData(editor,event.dataTransfer);}},[attributes.onDragStart]),onDrop:(0,_react.useCallback)(function(event){if(hasTarget(editor,event.target)&&!readOnly&&!isEventHandled(event,attributes.onDrop)){if(!HAS_BEFORE_INPUT_SUPPORT||!IS_SAFARI&&event.dataTransfer.files.length>0){event.preventDefault();var range=ReactEditor.findEventRange(editor,event);var data=event.dataTransfer;_slate.Transforms.select(editor,range);ReactEditor.insertData(editor,data);}}},[readOnly,attributes.onDrop]),onFocus:(0,_react.useCallback)(function(event){if(!readOnly&&!state.isUpdatingSelection&&hasEditableTarget(editor,event.target)&&!isEventHandled(event,attributes.onFocus)){var el=ReactEditor.toDOMNode(editor,editor);state.latestElement=window.document.activeElement;if(IS_FIREFOX&&event.target!==el){el.focus();return;}IS_FOCUSED.set(editor,true);}},[readOnly,attributes.onFocus]),onKeyDown:(0,_react.useCallback)(function(event){if(!readOnly&&hasEditableTarget(editor,event.target)&&!isEventHandled(event,attributes.onKeyDown)){var nativeEvent=event.nativeEvent;var selection=editor.selection;if(Hotkeys.isRedo(nativeEvent)){event.preventDefault();if(HistoryEditor.isHistoryEditor(editor)){editor.redo();}return;}if(Hotkeys.isUndo(nativeEvent)){event.preventDefault();if(HistoryEditor.isHistoryEditor(editor)){editor.undo();}return;}if(Hotkeys.isMoveLineBackward(nativeEvent)){event.preventDefault();_slate.Transforms.move(editor,{unit:'line',reverse:true});return;}if(Hotkeys.isMoveLineForward(nativeEvent)){event.preventDefault();_slate.Transforms.move(editor,{unit:'line'});return;}if(Hotkeys.isExtendLineBackward(nativeEvent)){event.preventDefault();_slate.Transforms.move(editor,{unit:'line',edge:'focus',reverse:true});return;}if(Hotkeys.isExtendLineForward(nativeEvent)){event.preventDefault();_slate.Transforms.move(editor,{unit:'line',edge:'focus'});return;}if(Hotkeys.isMoveBackward(nativeEvent)){event.preventDefault();if(selection&&_slate.Range.isCollapsed(selection)){_slate.Transforms.move(editor,{reverse:true});}else{_slate.Transforms.collapse(editor,{edge:'start'});}return;}if(Hotkeys.isMoveForward(nativeEvent)){event.preventDefault();if(selection&&_slate.Range.isCollapsed(selection)){_slate.Transforms.move(editor);}else{_slate.Transforms.collapse(editor,{edge:'end'});}return;}if(Hotkeys.isMoveWordBackward(nativeEvent)){event.preventDefault();_slate.Transforms.move(editor,{unit:'word',reverse:true});return;}if(Hotkeys.isMoveWordForward(nativeEvent)){event.preventDefault();_slate.Transforms.move(editor,{unit:'word'});return;}if(!HAS_BEFORE_INPUT_SUPPORT){if(Hotkeys.isBold(nativeEvent)||Hotkeys.isItalic(nativeEvent)||Hotkeys.isTransposeCharacter(nativeEvent)){event.preventDefault();return;}if(Hotkeys.isSplitBlock(nativeEvent)){event.preventDefault();_slate.Editor.insertBreak(editor);return;}if(Hotkeys.isDeleteBackward(nativeEvent)){event.preventDefault();if(selection&&_slate.Range.isExpanded(selection)){_slate.Editor.deleteFragment(editor);}else{_slate.Editor.deleteBackward(editor);}return;}if(Hotkeys.isDeleteForward(nativeEvent)){event.preventDefault();if(selection&&_slate.Range.isExpanded(selection)){_slate.Editor.deleteFragment(editor);}else{_slate.Editor.deleteForward(editor);}return;}if(Hotkeys.isDeleteLineBackward(nativeEvent)){event.preventDefault();if(selection&&_slate.Range.isExpanded(selection)){_slate.Editor.deleteFragment(editor);}else{_slate.Editor.deleteBackward(editor,{unit:'line'});}return;}if(Hotkeys.isDeleteLineForward(nativeEvent)){event.preventDefault();if(selection&&_slate.Range.isExpanded(selection)){_slate.Editor.deleteFragment(editor);}else{_slate.Editor.deleteForward(editor,{unit:'line'});}return;}if(Hotkeys.isDeleteWordBackward(nativeEvent)){event.preventDefault();if(selection&&_slate.Range.isExpanded(selection)){_slate.Editor.deleteFragment(editor);}else{_slate.Editor.deleteBackward(editor,{unit:'word'});}return;}if(Hotkeys.isDeleteWordForward(nativeEvent)){event.preventDefault();if(selection&&_slate.Range.isExpanded(selection)){_slate.Editor.deleteFragment(editor);}else{_slate.Editor.deleteForward(editor,{unit:'word'});}return;}}}},[readOnly,attributes.onKeyDown]),onPaste:(0,_react.useCallback)(function(event){if(hasEditableTarget(editor,event.target)&&!isEventHandled(event,attributes.onPaste)&&(!HAS_BEFORE_INPUT_SUPPORT||isPlainTextOnlyPaste(event.nativeEvent))&&!readOnly){event.preventDefault();ReactEditor.insertData(editor,event.clipboardData);}},[readOnly,attributes.onPaste])}),_react.default.createElement(Children,{decorate:decorate,decorations:decorations,node:editor,renderElement:renderElement,renderLeaf:renderLeaf,selection:editor.selection})));};exports.Editable=Editable;var defaultDecorate=function defaultDecorate(){return[];};var hasTarget=function hasTarget(editor,target){return isDOMNode(target)&&ReactEditor.hasDOMNode(editor,target);};var hasEditableTarget=function hasEditableTarget(editor,target){return isDOMNode(target)&&ReactEditor.hasDOMNode(editor,target,{editable:true});};var isTargetInsideVoid=function isTargetInsideVoid(editor,target){var slateNode=hasTarget(editor,target)&&ReactEditor.toSlateNode(editor,target);return _slate.Editor.isVoid(editor,slateNode);};var isEventHandled=function isEventHandled(event,handler){if(!handler){return false;}handler(event);return event.isDefaultPrevented()||event.isPropagationStopped();};var isDOMEventHandled=function isDOMEventHandled(event,handler){if(!handler){return false;}handler(event);return event.defaultPrevented;};\n\n//# sourceURL=webpack://nolo/./components/Editor/slate-react/index.es.js?");

/***/ }),

/***/ "./components/Error/index.js":
/*!***********************************!*\
  !*** ./components/Error/index.js ***!
  \***********************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:300-304 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Error/index.js\";var WrapError=_styledComponents.default.div.withConfig({displayName:\"Error__WrapError\",componentId:\"sc-11meakx-0\"})([\"color:red;margin:0 auto;width:15vw;\"]);var index=function index(props){var children=props.children;return _react.default.createElement(WrapError,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:10,columnNumber:10}},children);};var _default=index;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Error/index.js?");

/***/ }),

/***/ "./components/Header/index.js":
/*!************************************!*\
  !*** ./components/Header/index.js ***!
  \************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:391-395 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _selector=__webpack_require__(/*! ../../common/selector */ \"./common/selector.js\");var _styled=__webpack_require__(/*! ./styled */ \"./components/Header/styled.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Header/index.js\";var Header=function Header(){var userInfo=(0,_reactRedux.useSelector)(_selector.selectUserInfo);var navs=(0,_reactRedux.useSelector)(_selector.selectNavs);return _react.default.createElement(_styled.WrapHeader,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:10,columnNumber:5}},_react.default.createElement(_styled.Menu,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:11,columnNumber:7}},_react.default.createElement(_styled.Logo,{href:\"/\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:12,columnNumber:9}},\"Nolotus\"),_react.default.createElement(_styled.Nav,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:13,columnNumber:9}},navs?navs.map(function(item,index){return _react.default.createElement(_reactRouterDom.Link,{key:index,to:\"/\"+item.path,__self:_this,__source:{fileName:_jsxFileName,lineNumber:17,columnNumber:19}},item.path==='self'&&userInfo!=null&&userInfo.name?userInfo.name:item.title);}):'加载中')));};var _default=Header;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Header/index.js?");

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

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Logo=exports.Nav=exports.Menu=exports.WrapHeader=void 0;var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var WrapHeader=_styledComponents.default.header.withConfig({displayName:\"styled__WrapHeader\",componentId:\"lvvqli-0\"})([\"background-color:#20232a;display:flex;width:100%;\"]);exports.WrapHeader=WrapHeader;var Menu=_styledComponents.default.div.withConfig({displayName:\"styled__Menu\",componentId:\"lvvqli-1\"})([\"display:flex;height:60px;width:90%;max-width:1260px;margin:auto;\"]);exports.Menu=Menu;var Nav=_styledComponents.default.nav.withConfig({displayName:\"styled__Nav\",componentId:\"lvvqli-2\"})([\"height:100%;display:flex;a{display:flex;transition:color 0.2s ease-out;align-items:center;padding-left:20px;padding-right:20px;font-size:18px;color:#ffffff;font-weight:300;:hover{color:var(--primaryColor);}}\"]);exports.Nav=Nav;var Logo=_styledComponents.default.a.withConfig({displayName:\"styled__Logo\",componentId:\"lvvqli-3\"})([\"color:#ffffff;display:flex;align-items:center;margin-right:10px;width:calc(100% / 6);\"]);exports.Logo=Logo;\n\n//# sourceURL=webpack://nolo/./components/Header/styled.js?");

/***/ }),

/***/ "./components/Input/index.js":
/*!***********************************!*\
  !*** ./components/Input/index.js ***!
  \***********************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:380-384 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Input/index.js\";var WrapInput=_styledComponents.default.label.withConfig({displayName:\"Input__WrapInput\",componentId:\"sc-52eo5g-0\"})([\"display:block;margin:20px auto;position:relative;width:100%;max-width:280px;*{box-sizing:border-box;}.label{position:absolute;top:1.1rem;left:0;font-size:1.1rem;color:var(--neutralShade4);opacity:1;font-weight:500;transform-origin:0 0;transition:all 0.2s ease;}.border{position:absolute;bottom:0;left:0;height:2px;width:100%;background:var(--primaryColor);transform:scaleX(0);transform-origin:0 0;transition:all 0.15s ease;}input{-webkit-appearance:none;width:100%;border:0;font-family:inherit;padding:12px 0;height:48px;font-size:1.1rem;font-weight:500;border-bottom:2px solid var(--neutralShade3);background:none;border-radius:0;color:#223254;transition:all 0.15s ease;}input:hover{background:rgba(34,50,84,0.03);}input:not(:placeholder-shown) + span{color:#5a667f;transform:translateY(-28px) scale(1);}input:focus{background:none;outline:none;}\",\" input:focus + span{color:var(--primaryColor);transform:translateY(-28px) scale(0.9);}input:focus + span + .border{transform:scaleX(1);}\"],\"\");var index=function index(props){var name=props.name;return _react.default.createElement(WrapInput,{htmlFor:name,__self:_this,__source:{fileName:_jsxFileName,lineNumber:73,columnNumber:5}},_react.default.createElement(\"input\",(0,_extends2.default)({type:\"text\"},props,{id:name,placeholder:\"\\xA0\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:74,columnNumber:7}})),_react.default.createElement(\"span\",{className:\"label\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:75,columnNumber:7}},props.label),_react.default.createElement(\"span\",{className:\"border\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:76,columnNumber:7}}));};var _default=index;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Input/index.js?");

/***/ }),

/***/ "./components/Loading/index.js":
/*!*************************************!*\
  !*** ./components/Loading/index.js ***!
  \*************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:471-475 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Loading=exports.LoadingBox=exports.LoadingPage=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _reactFontawesome=__webpack_require__(/*! @fortawesome/react-fontawesome */ \"@fortawesome/react-fontawesome\");var _freeSolidSvgIcons=__webpack_require__(/*! @fortawesome/free-solid-svg-icons */ \"@fortawesome/free-solid-svg-icons\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Loading/index.js\";var StyledLoading=_styledComponents.default.div.withConfig({displayName:\"Loading__StyledLoading\",componentId:\"sc-1thau5m-0\"})([\"body{margin:0;}h1{font-family:'Lato',sans-serif;font-weight:300;letter-spacing:2px;font-size:48px;}p{font-family:'Lato',sans-serif;letter-spacing:1px;font-size:14px;color:#333333;}.header{position:relative;text-align:center;background:linear-gradient( 60deg,rgba(84,58,183,1) 0%,rgba(0,172,193,1) 100% );color:white;}.logo{width:50px;fill:white;padding-right:15px;display:inline-block;vertical-align:middle;}.inner-header{height:65vh;width:100%;margin:0;padding:0;}.flex{display:flex;justify-content:center;align-items:center;text-align:center;}.waves{position:relative;width:100%;height:15vh;margin-bottom:-7px;min-height:100px;max-height:150px;}.content{position:relative;height:20vh;text-align:center;background-color:white;}.parallax > use{animation:move-forever 25s cubic-bezier(0.55,0.5,0.45,0.5) infinite;}.parallax > use:nth-child(1){animation-delay:-2s;animation-duration:7s;}.parallax > use:nth-child(2){animation-delay:-3s;animation-duration:10s;}.parallax > use:nth-child(3){animation-delay:-4s;animation-duration:13s;}.parallax > use:nth-child(4){animation-delay:-5s;animation-duration:20s;}@keyframes move-forever{0%{transform:translate3d(-90px,0,0);}100%{transform:translate3d(85px,0,0);}}@media (max-width:768px){.waves{height:40px;min-height:40px;}.content{height:30vh;}h1{font-size:24px;}}\"]);var LoadingPage=function LoadingPage(){return _react.default.createElement(StyledLoading,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:117,columnNumber:5}},_react.default.createElement(\"div\",{className:\"header\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:118,columnNumber:7}},_react.default.createElement(\"div\",{className:\"inner-header flex\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:119,columnNumber:9}},_react.default.createElement(\"h1\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:120,columnNumber:11}},\"Loading\")),_react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:123,columnNumber:9}},_react.default.createElement(\"svg\",{className:\"waves\",xmlns:\"http://www.w3.org/2000/svg\",viewBox:\"0 24 150 28\",preserveAspectRatio:\"none\",shapeRendering:\"auto\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:124,columnNumber:11}},_react.default.createElement(\"defs\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:130,columnNumber:13}},_react.default.createElement(\"path\",{id:\"gentle-wave\",d:\"M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:131,columnNumber:15}})),_react.default.createElement(\"g\",{className:\"parallax\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:136,columnNumber:13}},_react.default.createElement(\"use\",{xlinkHref:\"#gentle-wave\",x:\"48\",y:\"0\",fill:\"rgba(255,255,255,0.7\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:137,columnNumber:15}}),_react.default.createElement(\"use\",{xlinkHref:\"#gentle-wave\",x:\"48\",y:\"3\",fill:\"rgba(255,255,255,0.5)\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:143,columnNumber:15}}),_react.default.createElement(\"use\",{xlinkHref:\"#gentle-wave\",x:\"48\",y:\"5\",fill:\"rgba(255,255,255,0.3)\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:149,columnNumber:15}}),_react.default.createElement(\"use\",{xlinkHref:\"#gentle-wave\",x:\"48\",y:\"7\",fill:\"#fff\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:155,columnNumber:15}}))))),_react.default.createElement(\"div\",{className:\"content flex\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:161,columnNumber:7}},_react.default.createElement(\"p\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:162,columnNumber:9}},\"powerd by | nolotus | Free to use\")));};exports.LoadingPage=LoadingPage;var LoadingBox=function LoadingBox(){return _react.default.createElement(\"div\",{className:\"loadding-box\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:170,columnNumber:5}},_react.default.createElement(_reactFontawesome.FontAwesomeIcon,{className:\"loading\",icon:_freeSolidSvgIcons.faCoffee,__self:_this,__source:{fileName:_jsxFileName,lineNumber:171,columnNumber:7}}));};exports.LoadingBox=LoadingBox;var Loading=function Loading(){_react.default.createElement(_reactFontawesome.FontAwesomeIcon,{className:\"loading\",icon:_freeSolidSvgIcons.faCoffee,__self:_this,__source:{fileName:_jsxFileName,lineNumber:176,columnNumber:3}});};exports.Loading=Loading;\n\n//# sourceURL=webpack://nolo/./components/Loading/index.js?");

/***/ }),

/***/ "./components/Modal/Warning.js":
/*!*************************************!*\
  !*** ./components/Modal/Warning.js ***!
  \*************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:455-459 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _propTypes=_interopRequireDefault(__webpack_require__(/*! prop-types */ \"prop-types\"));var _Button=_interopRequireDefault(__webpack_require__(/*! ../Button */ \"./components/Button/index.js\"));var _styled=__webpack_require__(/*! ./styled */ \"./components/Modal/styled.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Modal/Warning.js\";var Warning=function Warning(props){var modalInfo=props.modalInfo;var title=modalInfo.title,content=modalInfo.content,buttons=modalInfo.buttons;return _react.default.createElement(_styled.WrapWarning,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:11,columnNumber:5}},_react.default.createElement(\"div\",{className:\"title\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:12,columnNumber:7}},title),_react.default.createElement(\"div\",{className:\"content\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:13,columnNumber:7}},content),buttons&&buttons.length===1?_react.default.createElement(_Button.default,(0,_extends2.default)({loading:buttons[0].loading},buttons[0],{onClick:function onClick(){buttons[0].onClick();},__self:_this,__source:{fileName:_jsxFileName,lineNumber:15,columnNumber:9}}),buttons[0].text):_react.default.createElement(\"div\",{className:\"button-area\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:24,columnNumber:9}},buttons&&buttons.map(function(buttonProps){return _react.default.createElement(_Button.default,(0,_extends2.default)({},buttonProps,{key:buttonProps.type+buttonProps.className+buttonProps.text,onClick:function onClick(){return buttonProps.onClick();},__self:_this,__source:{fileName:_jsxFileName,lineNumber:26,columnNumber:13}}),buttonProps.text);})));};Warning.propTypes={modalInfo:_propTypes.default.object};var _default=Warning;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Modal/Warning.js?");

/***/ }),

/***/ "./components/Modal/index.js":
/*!***********************************!*\
  !*** ./components/Modal/index.js ***!
  \***********************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:604-608 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _propTypes=_interopRequireDefault(__webpack_require__(/*! prop-types */ \"prop-types\"));var _reactUse=__webpack_require__(/*! react-use */ \"react-use\");var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _Warning=_interopRequireDefault(__webpack_require__(/*! ./Warning */ \"./components/Modal/Warning.js\"));var _CloseButton=_interopRequireDefault(__webpack_require__(/*! ../Button/CloseButton */ \"./components/Button/CloseButton.js\"));var _styled=__webpack_require__(/*! ./styled */ \"./components/Modal/styled.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Modal/index.js\";var Modal=function Modal(props){var modalInfo=props.modalInfo;var hasCloseButton=modalInfo.hasCloseButton,modalType=modalInfo.modalType;var dispatch=(0,_reactRedux.useDispatch)();var closeModal=function closeModal(){return dispatch({type:'closeModal'});};(0,_reactUse.useKey)('Escape',closeModal);var getModalComponent=function getModalComponent(){switch(modalType){case'warning':return _react.default.createElement(_Warning.default,(0,_extends2.default)({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:21,columnNumber:16}}));default:return _react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:24,columnNumber:16}},\"modal error,need modalType\");}};return _react.default.createElement(_styled.WrapModal,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:28,columnNumber:5}},_react.default.createElement(\"div\",{className:\"over-layer\",tabIndex:\"0\",role:\"button\",onKeyDown:closeModal,onClick:closeModal,__self:_this,__source:{fileName:_jsxFileName,lineNumber:29,columnNumber:7}}),_react.default.createElement(\"div\",{className:\"modal-content\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:36,columnNumber:7}},getModalComponent(),hasCloseButton&&_react.default.createElement(_CloseButton.default,{onClick:closeModal,__self:_this,__source:{fileName:_jsxFileName,lineNumber:38,columnNumber:28}})));};Modal.propTypes={closeModal:_propTypes.default.func,modalInfo:_propTypes.default.object};var _default=Modal;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./components/Modal/index.js?");

/***/ }),

/***/ "./components/Modal/styled.js":
/*!************************************!*\
  !*** ./components/Modal/styled.js ***!
  \************************************/
/*! flagged exports */
/*! export WrapModal [provided] [no usage info] [missing usage info prevents renaming] */
/*! export WrapWarning [provided] [no usage info] [missing usage info prevents renaming] */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.WrapWarning=exports.WrapModal=void 0;var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var WrapModal=_styledComponents.default.div.withConfig({displayName:\"styled__WrapModal\",componentId:\"sc-1q2rzzi-0\"})([\".over-layer{position:fixed;top:0;background-color:rgba(35,35,35,0.5);width:100%;height:100%;z-index:3;}.modal-content{display:flex;position:fixed;left:50%;transform:translateX(-50%);top:0;height:auto;z-index:4;margin:178px auto;p{font-size:16px;}}\"]);exports.WrapModal=WrapModal;var WrapWarning=_styledComponents.default.div.withConfig({displayName:\"styled__WrapWarning\",componentId:\"sc-1q2rzzi-1\"})([\"width:527px;padding:34px 43px;border-radius:10px;box-shadow:0 2px 11px 0 rgba(158,158,166,0.32);border:solid 1px #dadada;background-color:#ffffff;.title{text-align:center;margin-bottom:26px;height:35px;font-size:20px;font-weight:500;color:rgba(51,51,51,1);line-height:28px;}.content{color:#333;font-size:16px;text-align:center;}.button-area{display:flex;justify-content:space-between;width:85%;padding:30px 0 0;margin:0 auto;}\"]);exports.WrapWarning=WrapWarning;\n\n//# sourceURL=webpack://nolo/./components/Modal/styled.js?");

/***/ }),

/***/ "./components/Tabs/index.js":
/*!**********************************!*\
  !*** ./components/Tabs/index.js ***!
  \**********************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:422-426 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Tab=exports.Tabs=exports.WrapTab=exports.WrapTabs=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/Tabs/index.js\";var WrapTabs=_styledComponents.default.div.withConfig({displayName:\"Tabs__WrapTabs\",componentId:\"sc-5g4hvz-0\"})([\"display:flex;margin:0 auto;width:20vw;\"]);exports.WrapTabs=WrapTabs;var WrapTab=_styledComponents.default.div.withConfig({displayName:\"Tabs__WrapTab\",componentId:\"sc-5g4hvz-1\"})([\"display:flex;justify-content:center;align-items:center;width:10vw;padding:10px;border-bottom:\",\";\"],function(props){return props.active?\"2px solid var(--primaryColor)\":\"none\";});exports.WrapTab=WrapTab;var Tabs=function Tabs(props){var children=props.children;return _react.default.createElement(WrapTabs,(0,_extends2.default)({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:19,columnNumber:10}}),children);};exports.Tabs=Tabs;var Tab=function Tab(props){var children=props.children;return _react.default.createElement(WrapTab,(0,_extends2.default)({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:23,columnNumber:10}}),children);};exports.Tab=Tab;\n\n//# sourceURL=webpack://nolo/./components/Tabs/index.js?");

/***/ }),

/***/ "./components/UserCard/index.js":
/*!**************************************!*\
  !*** ./components/UserCard/index.js ***!
  \**************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:564-568 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _propTypes=_interopRequireDefault(__webpack_require__(/*! prop-types */ \"prop-types\"));var _api=__webpack_require__(/*! ../../common/api */ \"./common/api.js\");var _tools=__webpack_require__(/*! ../../common/tools */ \"./common/tools.js\");var _db=__webpack_require__(/*! ../../common/db */ \"./common/db.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/components/UserCard/index.js\";var UserCard=function UserCard(props){var name=props.name;(0,_react.useEffect)(function(){var getData=function getData(){var result,userDb,list;return _regenerator.default.async(function getData$(_context){while(1){switch(_context.prev=_context.next){case 0:console.log('getData');_context.prev=1;_context.next=4;return _regenerator.default.awrap((0,_api.dbGet)(_db.linkDb.remote,'org.couchdb.user:'+name));case 4:result=_context.sent;console.log('result',result);userDb=(0,_db.connectDb)('userdb-'+(0,_tools.toHex)(name));console.log('userDb',userDb);_context.next=10;return _regenerator.default.awrap(userDb.remote.allDocs({include_docs:true}));case 10:list=_context.sent;console.log('list',list);console.log('result',result);_context.next=18;break;case 15:_context.prev=15;_context.t0=_context[\"catch\"](1);console.log(_context.t0);case 18:case\"end\":return _context.stop();}}},null,null,[[1,15]],Promise);};getData();return function(){};},[name]);return _react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:32,columnNumber:10}},name);};var _default=UserCard;exports.default=_default;UserCard.propTypes={name:_propTypes.default.string.isRequired};\n\n//# sourceURL=webpack://nolo/./components/UserCard/index.js?");

/***/ }),

/***/ "./config/menu.js":
/*!************************!*\
  !*** ./config/menu.js ***!
  \************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export defaultNavConfig [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

eval("Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.defaultNavConfig=void 0;var defaultNavConfig=[{title:'记录',path:'create'},{title:'生活',path:'life'},{title:'发现',path:'find'},{title:'自己',path:'self'}];exports.defaultNavConfig=defaultNavConfig;\n\n//# sourceURL=webpack://nolo/./config/menu.js?");

/***/ }),

/***/ "./pages/Create.js":
/*!*************************!*\
  !*** ./pages/Create.js ***!
  \*************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:957-961 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _template=_interopRequireDefault(__webpack_require__(/*! ../template */ \"./template/index.js\"));var _Editor=__webpack_require__(/*! ../components/Editor */ \"./components/Editor/index.js\");var _lodash=_interopRequireDefault(__webpack_require__(/*! lodash */ \"lodash\"));var _constant=__webpack_require__(/*! ../components/Editor/currentEditor/constant */ \"./components/Editor/currentEditor/constant.js\");var _api=__webpack_require__(/*! ../common/api */ \"./common/api.js\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _styled=_interopRequireDefault(__webpack_require__(/*! @emotion/styled */ \"@emotion/styled\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/pages/Create.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2.default)([\"\\n  width: 80vw;\\n  margin: 100px auto;\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var CreateWrapper=_styled.default.div(_templateObject());var Create=function Create(){var _useState=(0,_react.useState)(),_useState2=(0,_slicedToArray2.default)(_useState,2),_id=_useState2[0],setId=_useState2[1];var _useState3=(0,_react.useState)(),_useState4=(0,_slicedToArray2.default)(_useState3,2),_rev=_useState4[0],setRev=_useState4[1];var onChange=function onChange(value){var isSame,type,children,data,_data;return _regenerator.default.async(function onChange$(_context){while(1){switch(_context.prev=_context.next){case 0:console.log('value',value);isSame=_lodash.default.isEqual(value,_constant.initialValue);if(!isSame){if(_id){type='article';children=[];value.map(function(doc){console.log('doc',doc);});data={type:type,children:children,_id:_id};res&&setRev(res.rev);}else{_data={type:'article',children:value,status:'draft',version:'0.0.2'};}}case 3:case\"end\":return _context.stop();}}},null,null,null,Promise);};return _react.default.createElement(_template.default,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:48,columnNumber:5}},_react.default.createElement(CreateWrapper,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:49,columnNumber:7}},_rev,_react.default.createElement(_Editor.CurrentEditor,{onChange:_lodash.default.debounce(onChange,2000),__self:_this,__source:{fileName:_jsxFileName,lineNumber:51,columnNumber:9}})));};var _default=Create;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./pages/Create.js?");

/***/ }),

/***/ "./pages/Find.js":
/*!***********************!*\
  !*** ./pages/Find.js ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:681-685 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _template=_interopRequireDefault(__webpack_require__(/*! ../template */ \"./template/index.js\"));var _UserCard=_interopRequireDefault(__webpack_require__(/*! ../components/UserCard */ \"./components/UserCard/index.js\"));var _api=__webpack_require__(/*! ../common/api */ \"./common/api.js\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/pages/Find.js\";var Find=function Find(){var _useState=(0,_react.useState)([]),_useState2=(0,_slicedToArray2.default)(_useState,2),friends=_useState2[0],setFriends=_useState2[1];(0,_react.useEffect)(function(){var getData=function getData(){var result;return _regenerator.default.async(function getData$(_context){while(1){switch(_context.prev=_context.next){case 0:console.log('getData');_context.prev=1;_context.next=4;return _regenerator.default.awrap((0,_api.dbGet)(_db.hostDb.remote,'friends'));case 4:result=_context.sent;console.log('result',result);result&&setFriends(result.list);_context.next=12;break;case 9:_context.prev=9;_context.t0=_context[\"catch\"](1);console.log(_context.t0);case 12:case\"end\":return _context.stop();}}},null,null,[[1,9]],Promise);};getData();return function(){};},[]);return _react.default.createElement(_template.default,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:24,columnNumber:5}},_react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:25,columnNumber:7}},\" \\u4F4F\\u5728\\u672C\\u7AD9\\u7684\\u7AD9\\u70B9\"),_react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:26,columnNumber:7}},friends.map(function(item){return _react.default.createElement(_UserCard.default,{name:item,key:item,__self:_this,__source:{fileName:_jsxFileName,lineNumber:28,columnNumber:18}});})),_react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:32,columnNumber:7}},\" \\u6DFB\\u52A0\\u4F60\\u7684\\u4E2A\\u4EBA\\u7F51\\u7AD9\\uFF0C\\u8BA9\\u66F4\\u591A\\u4EBA\\u770B\\u5230\\u4F60\\uFF08\\u6682\\u672A\\u5F00\\u653E\\uFF09\"),_react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:34,columnNumber:7}},\"\\u63A8\\u8350\\u7684\\u7F51\\u7AD9\"),_react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:36,columnNumber:7}},\"\\u63A8\\u8350\\u7684\\u5185\\u5BB9\"));};var _default=Find;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./pages/Find.js?");

/***/ }),

/***/ "./pages/Home.js":
/*!***********************!*\
  !*** ./pages/Home.js ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:661-665 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _Loading=__webpack_require__(/*! ../components/Loading */ \"./components/Loading/index.js\");var _Page=__webpack_require__(/*! ./Page */ \"./pages/Page.js\");var _api=__webpack_require__(/*! ../common/api */ \"./common/api.js\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/pages/Home.js\";var Home=function Home(){var _useState=(0,_react.useState)(true),_useState2=(0,_slicedToArray2.default)(_useState,2),loading=_useState2[0],setLoading=_useState2[1];var dispatch=(0,_reactRedux.useDispatch)();var _useSelector=(0,_reactRedux.useSelector)(function(state){return state.setting;}),home=_useSelector.home;(0,_react.useEffect)(function(){var fetchData=function fetchData(){var menu,setting;return _regenerator.default.async(function fetchData$(_context){while(1){switch(_context.prev=_context.next){case 0:console.log('hostDb.remote',_db.hostDb.remote);_context.next=3;return _regenerator.default.awrap((0,_api.dbGet)(_db.hostDb.remote,'menu'));case 3:menu=_context.sent;console.log('menu xxx',menu);_context.next=7;return _regenerator.default.awrap((0,_api.dbGet)(_db.hostDb.remote,'setting'));case 7:_context.t0=_context.sent;if(_context.t0){_context.next=10;break;}_context.t0={};case 10:setting=_context.t0;dispatch({type:'initSuccess',payload:{menu:menu,setting:setting}});setLoading(false);case 13:case\"end\":return _context.stop();}}},null,null,null,Promise);};fetchData();return function(){};},[dispatch]);return _react.default.createElement(_react.default.Fragment,null,loading?_react.default.createElement(_Loading.LoadingPage,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:26,columnNumber:23}}):_react.default.createElement(_Page.Page,{id:home,__self:_this,__source:{fileName:_jsxFileName,lineNumber:26,columnNumber:41}}));};var _default=Home;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./pages/Home.js?");

/***/ }),

/***/ "./pages/Life.js":
/*!***********************!*\
  !*** ./pages/Life.js ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:1147-1151 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var _reactFontawesome=__webpack_require__(/*! @fortawesome/react-fontawesome */ \"@fortawesome/react-fontawesome\");var _freeSolidSvgIcons=__webpack_require__(/*! @fortawesome/free-solid-svg-icons */ \"@fortawesome/free-solid-svg-icons\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _template=_interopRequireDefault(__webpack_require__(/*! ../template */ \"./template/index.js\"));var _api=__webpack_require__(/*! ../common/api */ \"./common/api.js\");var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _ArticleTitle=_interopRequireDefault(__webpack_require__(/*! ../components/ArticleTitle */ \"./components/ArticleTitle/index.js\"));var _Tabs=__webpack_require__(/*! ../components/Tabs */ \"./components/Tabs/index.js\");var _selector=__webpack_require__(/*! ../common/selector */ \"./common/selector.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/pages/Life.js\";var StyledLife=_styledComponents.default.div.withConfig({displayName:\"Life__StyledLife\",componentId:\"sc-1s247ea-0\"})([\"width:90%;max-width:1050px;margin:3em auto 0;\"]);var Life=function Life(){var _useState=(0,_react.useState)([]),_useState2=(0,_slicedToArray2.default)(_useState,2),remoteList=_useState2[0],setRemoteList=_useState2[1];var _useState3=(0,_react.useState)([]),_useState4=(0,_slicedToArray2.default)(_useState3,2),localList=_useState4[0],setLocalList=_useState4[1];var currentDb=(0,_reactRedux.useSelector)(_selector.selectCurrentDb);var userInfo=(0,_reactRedux.useSelector)(_selector.selectUserInfo);console.log('currentDb',currentDb);var _useState5=(0,_react.useState)('local'),_useState6=(0,_slicedToArray2.default)(_useState5,2),choose=_useState6[0],setchoose=_useState6[1];var dispatch=(0,_reactRedux.useDispatch)();var getData=function getData(){(0,_api.dbAll)(currentDb.remote).then(function(result){if(result){console.log('result',result);setRemoteList(result.rows);}});(0,_api.dbAll)(_db.localDb).then(function(result){if(result){setLocalList(result.rows);}});};var goDelete=function goDelete(id){var deleteResult;return _regenerator.default.async(function goDelete$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.prev=0;_context.next=3;return _regenerator.default.awrap((0,_api.dbDelete)(_db.localDb,id));case 3:deleteResult=_context.sent;console.log('deleteResult',deleteResult);if(deleteResult){getData();closeModal();}_context.next=12;break;case 8:_context.prev=8;_context.t0=_context[\"catch\"](0);modal({modalType:'warning',content:_context.t0.message,hasClose:true});console.log(_context.t0);case 12:case\"end\":return _context.stop();}}},null,null,[[0,8]],Promise);};var modal=function modal(modalInfo){dispatch({type:'modal',payload:{modalInfo:(0,_extends2.default)({},modalInfo)}});};var closeModal=function closeModal(){return dispatch({type:'closeModal'});};(0,_react.useEffect)(function(){getData();return function(){};},[userInfo]);var handleDetele=function handleDetele(id){return _regenerator.default.async(function handleDetele$(_context2){while(1){switch(_context2.prev=_context2.next){case 0:console.log('id',id);modal({modalType:'warning',title:'确认删除？',content:'删除内容不可恢复！',buttons:[{text:'取消',className:'button-warning-cancel',onClick:closeModal},{text:'确认',className:'button-warning-blue',onClick:function onClick(){goDelete(id);}}]});case 2:case\"end\":return _context2.stop();}}},null,null,null,Promise);};return _react.default.createElement(_template.default,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:94,columnNumber:5}},_react.default.createElement(_Tabs.Tabs,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:95,columnNumber:7}},_react.default.createElement(_Tabs.Tab,{active:choose==='remote',onClick:function onClick(){setchoose('remote');},__self:_this,__source:{fileName:_jsxFileName,lineNumber:96,columnNumber:9}},\"\\u8FDC\\u7A0B\"),_react.default.createElement(_Tabs.Tab,{active:choose==='local',onClick:function onClick(){setchoose('local');},__self:_this,__source:{fileName:_jsxFileName,lineNumber:103,columnNumber:9}},\"\\u672C\\u5730\")),choose==='local'?_react.default.createElement(StyledLife,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:112,columnNumber:9}},localList.map(function(post){return _react.default.createElement(_ArticleTitle.default,{key:post.id,__self:_this,__source:{fileName:_jsxFileName,lineNumber:114,columnNumber:13}},_react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:115,columnNumber:15}},_react.default.createElement(_reactRouterDom.Link,{to:{pathname:post.doc._id},__self:_this,__source:{fileName:_jsxFileName,lineNumber:116,columnNumber:17}},post.doc.title||post.doc._id)),_react.default.createElement(\"div\",{className:\"delete-button\",onClick:function onClick(){return handleDetele(post.doc._id);},__self:_this,__source:{fileName:_jsxFileName,lineNumber:121,columnNumber:15}},_react.default.createElement(_reactFontawesome.FontAwesomeIcon,{icon:_freeSolidSvgIcons.faTimes,__self:_this,__source:{fileName:_jsxFileName,lineNumber:124,columnNumber:17}})));})):_react.default.createElement(StyledLife,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:132,columnNumber:9}},remoteList.map(function(post){return _react.default.createElement(_ArticleTitle.default,{key:post.id,__self:_this,__source:{fileName:_jsxFileName,lineNumber:134,columnNumber:13}},_react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:135,columnNumber:15}},_react.default.createElement(_reactRouterDom.Link,{to:{pathname:post.doc._id},__self:_this,__source:{fileName:_jsxFileName,lineNumber:136,columnNumber:17}},post.doc.title||post.doc._id)),_react.default.createElement(\"div\",{className:\"delete-button\",onClick:function onClick(){return handleDetele(post.doc._id);},__self:_this,__source:{fileName:_jsxFileName,lineNumber:141,columnNumber:15}},_react.default.createElement(_reactFontawesome.FontAwesomeIcon,{icon:_freeSolidSvgIcons.faTimes,__self:_this,__source:{fileName:_jsxFileName,lineNumber:144,columnNumber:17}})));})));};var _default=Life;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./pages/Life.js?");

/***/ }),

/***/ "./pages/Page.js":
/*!***********************!*\
  !*** ./pages/Page.js ***!
  \***********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:829-833 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Page=void 0;var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _api=__webpack_require__(/*! ../common/api */ \"./common/api.js\");var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _Article=__webpack_require__(/*! ../components/Article */ \"./components/Article/index.js\");var _template=_interopRequireDefault(__webpack_require__(/*! ../template */ \"./template/index.js\"));var _Loading=__webpack_require__(/*! ../components/Loading */ \"./components/Loading/index.js\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _selector=__webpack_require__(/*! ../common/selector */ \"./common/selector.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/pages/Page.js\";var Page=function Page(props){var id=(0,_reactRouterDom.useParams)().id||props.id;var _useState=(0,_react.useState)(),_useState2=(0,_slicedToArray2.default)(_useState,2),doc=_useState2[0],setDoc=_useState2[1];var currentDb=(0,_reactRedux.useSelector)(_selector.selectCurrentDb);console.log('currentDb',currentDb);(0,_react.useEffect)(function(){var getdata=function getdata(){var localDoc,hostDoc;return _regenerator.default.async(function getdata$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.next=2;return _regenerator.default.awrap((0,_api.dbGet)(_db.localDb,id));case 2:localDoc=_context.sent;if(!localDoc){_context.next=8;break;}setDoc(localDoc);return _context.abrupt(\"return\");case 8:_context.next=10;return _regenerator.default.awrap((0,_api.dbGet)(currentDb.remote,id));case 10:hostDoc=_context.sent;if(hostDoc){hostDoc!==undefined&&setDoc(hostDoc);}case 12:case\"end\":return _context.stop();}}},null,null,null,Promise);};getdata();return function(){};},[id]);return _react.default.createElement(_template.default,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:39,columnNumber:10}},doc?_react.default.createElement(_Article.Article,{doc:doc,__self:_this,__source:{fileName:_jsxFileName,lineNumber:39,columnNumber:27}}):_react.default.createElement(_Loading.LoadingBox,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:39,columnNumber:51}}));};exports.Page=Page;\n\n//# sourceURL=webpack://nolo/./pages/Page.js?");

/***/ }),

/***/ "./pages/Self/index.js":
/*!*****************************!*\
  !*** ./pages/Self/index.js ***!
  \*****************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:1126-1130 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _defineProperty2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"@babel/runtime/helpers/defineProperty\"));var _extends3=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ \"@babel/runtime/helpers/slicedToArray\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _template=_interopRequireDefault(__webpack_require__(/*! ../../template */ \"./template/index.js\"));var _styled=__webpack_require__(/*! ./styled */ \"./pages/Self/styled.js\");var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _Button=_interopRequireDefault(__webpack_require__(/*! ../../components/Button */ \"./components/Button/index.js\"));var _Input=_interopRequireDefault(__webpack_require__(/*! ../../components/Input */ \"./components/Input/index.js\"));var _Error=_interopRequireDefault(__webpack_require__(/*! ../../components/Error */ \"./components/Error/index.js\"));var _Tabs=__webpack_require__(/*! ../../components/Tabs */ \"./components/Tabs/index.js\");var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _db=__webpack_require__(/*! ../../common/db */ \"./common/db.js\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/pages/Self/index.js\";var Self=function Self(props){var history=(0,_reactRouterDom.useHistory)();var dispatch=(0,_reactRedux.useDispatch)();var _useState=(0,_react.useState)('signin'),_useState2=(0,_slicedToArray2.default)(_useState,2),type=_useState2[0],setType=_useState2[1];var _useState3=(0,_react.useState)(),_useState4=(0,_slicedToArray2.default)(_useState3,2),error=_useState4[0],setError=_useState4[1];var _useSelector=(0,_reactRedux.useSelector)(function(state){return state.authData;}),isLogin=_useSelector.isLogin;var dbLogin=function dbLogin(username,password){var doc,userInfo,userDb;return _regenerator.default.async(function dbLogin$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.prev=0;console.log('hostDb',_db.hostDb);_context.next=4;return _regenerator.default.awrap(_db.hostDb.remote.login(username,password));case 4:doc=_context.sent;console.log('logininfo',doc);if(doc.ok){userInfo={name:doc.name,roles:doc.roles};userDb=(0,_db.connectDb)(doc.name);dispatch({type:'loginSuccess',payload:{userInfo:userInfo,userDb:userDb}});history.push('/setting');}return _context.abrupt(\"return\",doc);case 10:_context.prev=10;_context.t0=_context[\"catch\"](0);return _context.abrupt(\"return\",_context.t0);case 13:case\"end\":return _context.stop();}}},null,null,[[0,10]],Promise);};var dbSignUp=function dbSignUp(username,password){var doc;return _regenerator.default.async(function dbSignUp$(_context2){while(1){switch(_context2.prev=_context2.next){case 0:_context2.prev=0;_context2.next=3;return _regenerator.default.awrap(_db.hostDb.remote.signUp(username,password));case 3:doc=_context2.sent;console.log('signUpinfo',doc);if(doc.ok){alert('注册成功');dbLogin(username,password);}return _context2.abrupt(\"return\",doc);case 9:_context2.prev=9;_context2.t0=_context2[\"catch\"](0);return _context2.abrupt(\"return\",_context2.t0);case 12:case\"end\":return _context2.stop();}}},null,null,[[0,9]],Promise);};isLogin&&history.push('/setting');var _useState5=(0,_react.useState)({username:'',password:''}),_useState6=(0,_slicedToArray2.default)(_useState5,2),state=_useState6[0],setstate=_useState6[1];var login=function login(){var result;return _regenerator.default.async(function login$(_context3){while(1){switch(_context3.prev=_context3.next){case 0:_context3.next=2;return _regenerator.default.awrap(dbLogin(state.username,state.password));case 2:result=_context3.sent;console.log('loginresult',result);if(result.error){setError(result.message);}case 5:case\"end\":return _context3.stop();}}},null,null,null,Promise);};var signup=function signup(){var result;return _regenerator.default.async(function signup$(_context4){while(1){switch(_context4.prev=_context4.next){case 0:_context4.next=2;return _regenerator.default.awrap(dbSignUp(state.username,state.password));case 2:result=_context4.sent;if(result.error==='conflict'){setError('此用户名已被注册');}case 4:case\"end\":return _context4.stop();}}},null,null,null,Promise);};var submit=function submit(e){e.preventDefault();type==='signin'?login():signup();};var _onChange=function onChange(key,value){console.log(key,value);setstate((0,_extends3.default)({},state,(0,_defineProperty2.default)({},key,value)));};return _react.default.createElement(_template.default,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:80,columnNumber:5}},_react.default.createElement(_styled.WrapSelf,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:81,columnNumber:7}},_react.default.createElement(\"div\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:82,columnNumber:9}},_react.default.createElement(_Tabs.Tabs,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:83,columnNumber:11}},_react.default.createElement(_Tabs.Tab,{active:type==='signin',onClick:function onClick(){setType('signin');},__self:_this,__source:{fileName:_jsxFileName,lineNumber:84,columnNumber:13}},\"\\u767B\\u5F55\"),_react.default.createElement(_Tabs.Tab,{active:type==='signup',onClick:function onClick(){setType('signup');},__self:_this,__source:{fileName:_jsxFileName,lineNumber:91,columnNumber:13}},\"\\u6CE8\\u518C\")),_react.default.createElement(\"form\",{__self:_this,__source:{fileName:_jsxFileName,lineNumber:100,columnNumber:11}},_react.default.createElement(_Error.default,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:101,columnNumber:13}},error),_react.default.createElement(_Input.default,{label:\"\\u540D\\u5B57\",onChange:function onChange(e){return _onChange('username',e.target.value);},name:\"name\",type:\"text\",id:\"inp\",placeholder:\"\\xA0\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:102,columnNumber:13}}),_react.default.createElement(_Input.default,{label:\"\\u5BC6\\u7801\",onChange:function onChange(e){return _onChange('password',e.target.value);},name:\"password\",type:\"password\",placeholder:\"\\xA0\",__self:_this,__source:{fileName:_jsxFileName,lineNumber:110,columnNumber:13}}),_react.default.createElement(_Button.default,{onClick:submit,__self:_this,__source:{fileName:_jsxFileName,lineNumber:116,columnNumber:13}},\"\\u63D0\\u4EA4\")))));};var _default=Self;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./pages/Self/index.js?");

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

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.WrapSelf=void 0;var _styledComponents=_interopRequireDefault(__webpack_require__(/*! styled-components */ \"styled-components\"));var WrapSelf=_styledComponents.default.div.withConfig({displayName:\"styled__WrapSelf\",componentId:\"sc-1sdc0cx-0\"})([\"form{width:280px;margin:auto;}\"]);exports.WrapSelf=WrapSelf;\n\n//# sourceURL=webpack://nolo/./pages/Self/styled.js?");

/***/ }),

/***/ "./pages/Setting.js":
/*!**************************!*\
  !*** ./pages/Setting.js ***!
  \**************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:466-470 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.Setting=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _template=_interopRequireDefault(__webpack_require__(/*! ../template */ \"./template/index.js\"));var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _blockEditor=__webpack_require__(/*! ../components/Editor/blockEditor */ \"./components/Editor/blockEditor/index.js\");var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/pages/Setting.js\";var Setting=function Setting(){var history=(0,_reactRouterDom.useHistory)();var dispatch=(0,_reactRedux.useDispatch)();var logout=function logout(){_db.hostDb.remote.logOut(function(err,response){dispatch({type:'logout'});if(err){}history.push('/');});};return _react.default.createElement(_template.default,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:21,columnNumber:5}},_react.default.createElement(_blockEditor.BlockEditor,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:22,columnNumber:7}}),_react.default.createElement(\"div\",{onClick:logout,__self:_this,__source:{fileName:_jsxFileName,lineNumber:23,columnNumber:7}},\"\\u9000\\u51FA\\u767B\\u5F55\"));};exports.Setting=Setting;\n\n//# sourceURL=webpack://nolo/./pages/Setting.js?");

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
/*! CommonJS bailout: this is used directly at 1:586-590 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _reactHelmet=_interopRequireDefault(__webpack_require__(/*! react-helmet */ \"react-helmet\"));var _server=__webpack_require__(/*! react-dom/server */ \"react-dom/server\");var _reactRouterDom=__webpack_require__(/*! react-router-dom */ \"react-router-dom\");var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _reactRouterConfig=__webpack_require__(/*! react-router-config */ \"react-router-config\");var _styledComponents=__webpack_require__(/*! styled-components */ \"styled-components\");var _Routes=_interopRequireDefault(__webpack_require__(/*! ../common/Routes */ \"./common/Routes.js\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/server/render.js\";var render=function render(req,store){var sheet=new _styledComponents.ServerStyleSheet();try{var content=(0,_server.renderToString)(sheet.collectStyles(_react.default.createElement(_reactRedux.Provider,{store:store,__self:_this,__source:{fileName:_jsxFileName,lineNumber:16,columnNumber:9}},_react.default.createElement(_reactRouterDom.StaticRouter,{location:req.path,__self:_this,__source:{fileName:_jsxFileName,lineNumber:17,columnNumber:11}},(0,_reactRouterConfig.renderRoutes)(_Routes.default)))));var styleTags=sheet.getStyleTags();var helmet=_reactHelmet.default.renderStatic();var html=\"\\n      <html \"+helmet.htmlAttributes.toString()+\">\\n        <head>\\n      <link rel=\\\"stylesheet\\\" href=\\\"/common.css\\\" type=\\\"text/css\\\" />\\n        \"+styleTags+\"\\n        \"+helmet.title.toString()+\"\\n        \"+helmet.meta.toString()+\"\\n        \"+helmet.link.toString()+\"\\n        </head>\\n        <body \"+helmet.bodyAttributes.toString()+\">\\n          <div id=\\\"root\\\">\"+content+\"</div>\\n          <script src=\\\"bundle.js\\\"></script>\\n        </body>\\n      </html>\\n    \";return html;}catch(error){console.error(error);}finally{sheet.seal();}};var _default=render;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./server/render.js?");

/***/ }),

/***/ "./template/Simple.js":
/*!****************************!*\
  !*** ./template/Simple.js ***!
  \****************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:462-466 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _taggedTemplateLiteralLoose2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/taggedTemplateLiteralLoose */ \"@babel/runtime/helpers/taggedTemplateLiteralLoose\"));var _react=_interopRequireDefault(__webpack_require__(/*! react */ \"react\"));var _Header=_interopRequireDefault(__webpack_require__(/*! ../components/Header */ \"./components/Header/index.js\"));var _styledComponents=__webpack_require__(/*! styled-components */ \"styled-components\");var _this=this,_jsxFileName=\"/home/nolotus/nolo/template/Simple.js\";function _templateObject(){var data=(0,_taggedTemplateLiteralLoose2.default)([\"\\n body {\\n  margin: 0;\\n  padding: 0;\\n  font-family: -apple-system, BlinkMacSystemFont, \\\"Segoe UI\\\", \\\"Roboto\\\", \\\"Oxygen\\\",\\n    \\\"Ubuntu\\\", \\\"Cantarell\\\", \\\"Fira Sans\\\", \\\"Droid Sans\\\", \\\"Helvetica Neue\\\",\\n    sans-serif;\\n  -webkit-font-smoothing: antialiased;\\n  -moz-osx-font-smoothing: grayscale;\\n}\\n\"]);_templateObject=function _templateObject(){return data;};return data;}var GlobalStyle=(0,_styledComponents.createGlobalStyle)(_templateObject());var simple=function simple(props){var children=props.children;return _react.default.createElement(_react.default.Fragment,null,_react.default.createElement(GlobalStyle,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:19,columnNumber:7}}),_react.default.createElement(_Header.default,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:20,columnNumber:7}}),children);};var _default=simple;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./template/Simple.js?");

/***/ }),

/***/ "./template/index.js":
/*!***************************!*\
  !*** ./template/index.js ***!
  \***************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_exports__, top-level-this-exports, __webpack_require__ */
/*! CommonJS bailout: this is used directly at 1:663-667 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _interopRequireWildcard=__webpack_require__(/*! @babel/runtime/helpers/interopRequireWildcard */ \"@babel/runtime/helpers/interopRequireWildcard\");Object.defineProperty(exports, \"__esModule\", ({value:true}));exports.default=void 0;var _extends2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/extends */ \"@babel/runtime/helpers/extends\"));var _regenerator=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ \"@babel/runtime/regenerator\"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ \"react\"));var _reactRedux=__webpack_require__(/*! react-redux */ \"react-redux\");var _db=__webpack_require__(/*! ../common/db */ \"./common/db.js\");var _Modal=_interopRequireDefault(__webpack_require__(/*! ../components/Modal */ \"./components/Modal/index.js\"));var _Simple=_interopRequireDefault(__webpack_require__(/*! ./Simple */ \"./template/Simple.js\"));var _this=this,_jsxFileName=\"/home/nolotus/nolo/template/index.js\";function getSession(){var doc;return _regenerator.default.async(function getSession$(_context){while(1){switch(_context.prev=_context.next){case 0:_context.prev=0;_context.next=3;return _regenerator.default.awrap(_db.hostDb.remote.getSession());case 3:doc=_context.sent;return _context.abrupt(\"return\",doc);case 7:_context.prev=7;_context.t0=_context[\"catch\"](0);console.log('err',_context.t0);case 10:case\"end\":return _context.stop();}}},null,null,[[0,7]],Promise);}var Template=function Template(props){var templateName=(0,_reactRedux.useSelector)(function(state){return state.templateName;});var modalInfo=(0,_reactRedux.useSelector)(function(state){return state.modalInfo;});var dispatch=(0,_reactRedux.useDispatch)();(0,_react.useEffect)(function(){getSession().then(function(doc){if(doc.userCtx.name!==null){var userDb=(0,_db.connectDb)(doc.userCtx.name);var userInfo=doc.userCtx;dispatch({type:'loginSuccess',payload:{userInfo:userInfo,userDb:userDb}});}});return function(){};},[]);return _react.default.createElement(_react.default.Fragment,null,_react.default.createElement(_Simple.default,(0,_extends2.default)({},props,{__self:_this,__source:{fileName:_jsxFileName,lineNumber:32,columnNumber:7}})),modalInfo.isVisible&&_react.default.createElement(_Modal.default,{modalInfo:modalInfo,__self:_this,__source:{fileName:_jsxFileName,lineNumber:33,columnNumber:31}}));};var _default=Template;exports.default=_default;\n\n//# sourceURL=webpack://nolo/./template/index.js?");

/***/ }),

/***/ "@babel/runtime/helpers/classCallCheck":
/*!********************************************************!*\
  !*** external "@babel/runtime/helpers/classCallCheck" ***!
  \********************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@babel/runtime/helpers/classCallCheck\");;\n\n//# sourceURL=webpack://nolo/external_%22@babel/runtime/helpers/classCallCheck%22?");

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

/***/ "@babel/runtime/helpers/toConsumableArray":
/*!***********************************************************!*\
  !*** external "@babel/runtime/helpers/toConsumableArray" ***!
  \***********************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@babel/runtime/helpers/toConsumableArray\");;\n\n//# sourceURL=webpack://nolo/external_%22@babel/runtime/helpers/toConsumableArray%22?");

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

/***/ "@fortawesome/free-solid-svg-icons":
/*!****************************************************!*\
  !*** external "@fortawesome/free-solid-svg-icons" ***!
  \****************************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"@fortawesome/free-solid-svg-icons\");;\n\n//# sourceURL=webpack://nolo/external_%22@fortawesome/free-solid-svg-icons%22?");

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

/***/ "direction":
/*!****************************!*\
  !*** external "direction" ***!
  \****************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"direction\");;\n\n//# sourceURL=webpack://nolo/external_%22direction%22?");

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

/***/ "image-extensions":
/*!***********************************!*\
  !*** external "image-extensions" ***!
  \***********************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"image-extensions\");;\n\n//# sourceURL=webpack://nolo/external_%22image-extensions%22?");

/***/ }),

/***/ "is-hotkey":
/*!****************************!*\
  !*** external "is-hotkey" ***!
  \****************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"is-hotkey\");;\n\n//# sourceURL=webpack://nolo/external_%22is-hotkey%22?");

/***/ }),

/***/ "is-plain-object":
/*!**********************************!*\
  !*** external "is-plain-object" ***!
  \**********************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"is-plain-object\");;\n\n//# sourceURL=webpack://nolo/external_%22is-plain-object%22?");

/***/ }),

/***/ "is-url":
/*!*************************!*\
  !*** external "is-url" ***!
  \*************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"is-url\");;\n\n//# sourceURL=webpack://nolo/external_%22is-url%22?");

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

/***/ "lodash/throttle":
/*!**********************************!*\
  !*** external "lodash/throttle" ***!
  \**********************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"lodash/throttle\");;\n\n//# sourceURL=webpack://nolo/external_%22lodash/throttle%22?");

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

/***/ "react-use":
/*!****************************!*\
  !*** external "react-use" ***!
  \****************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"react-use\");;\n\n//# sourceURL=webpack://nolo/external_%22react-use%22?");

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

/***/ "scroll-into-view-if-needed":
/*!*********************************************!*\
  !*** external "scroll-into-view-if-needed" ***!
  \*********************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
eval("module.exports = require(\"scroll-into-view-if-needed\");;\n\n//# sourceURL=webpack://nolo/external_%22scroll-into-view-if-needed%22?");

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
eval("var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ \"@babel/runtime/helpers/interopRequireDefault\");var _express=_interopRequireDefault(__webpack_require__(/*! express */ \"express\"));var _render=_interopRequireDefault(__webpack_require__(/*! ./render */ \"./server/render.js\"));var _reactRouterConfig=__webpack_require__(/*! react-router-config */ \"react-router-config\");var _Routes=_interopRequireDefault(__webpack_require__(/*! ../common/Routes */ \"./common/Routes.js\"));var _store=_interopRequireDefault(__webpack_require__(/*! ../common/store */ \"./common/store.js\"));var _config=__webpack_require__(/*! ./config */ \"./server/config.js\");var app=(0,_express.default)();var _require=__webpack_require__(/*! http-proxy-middleware */ \"http-proxy-middleware\"),createProxyMiddleware=_require.createProxyMiddleware;if(_config.isProdEnv){var filter=function filter(pathname,req){return req.hostname==='tw.db.nolotus.com';};var dbProxy=createProxyMiddleware(filter,{target:'http://localhost:5984',changeOrigin:true});app.use('/',dbProxy);}app.use(_express.default.static('public'));app.get('*',function(req,res){var promises=(0,_reactRouterConfig.matchRoutes)(_Routes.default,req.path).map(function(_ref){var route=_ref.route;var component=route.component;return component.getInitialData?component.getInitialData(_store.default):null;});Promise.all(promises).then(function(){var html=(0,_render.default)(req,_store.default);res.send(html);});});console.log('env',_config.env);if(_config.isProdEnv){__webpack_require__(/*! greenlock-express */ \"greenlock-express\").init({packageRoot:process.cwd(),configDir:'./greenlock.d',maintainerEmail:'s@nolotus.com',cluster:false}).serve(app);}else{app.listen(3000,function(){return console.log('localhost develop 80!');});}\n\n//# sourceURL=webpack://nolo/./server/index.js?");
})();

/******/ })()
;