import {
  CodeBlockType,
  CodeLineType,
  Editable,
  HeadingType,
  ParagraphType,
  ReactEditor,
  Slate,
  Table,
  TableCell,
  TableRow,
  deleteColumn,
  deleteRow,
  deleteTable,
  insertColumn,
  insertRow,
  isCustomElement,
  isSelectionInTable,
  moveToLeftCell,
  moveToLowerCell,
  moveToNextCell,
  moveToPreviousCell,
  moveToRightCell,
  moveToUpperCell,
  useFocused,
  useSelected,
  useSlate,
  useSlateStatic,
  withReact
} from "/public/assets/chunks/chunk-KLA2PJT7.js";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating
} from "/public/assets/chunks/chunk-J4DSDXNB.js";
import {
  isToolVisibleInUi
} from "/public/assets/chunks/chunk-PE2BCPTN.js";
import {
  ImagePreviewModal_default
} from "/public/assets/chunks/chunk-ZDGJ4DJD.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  toolDescriptions
} from "/public/assets/chunks/chunk-CJFHNPRU.js";
import {
  Editor,
  Element as Element2,
  Node,
  Operation,
  Path,
  Point,
  Range,
  Text,
  Transforms,
  createEditor,
  isPlainObject
} from "/public/assets/chunks/chunk-GIMH23VB.js";
import {
  setDocFocusContext
} from "/public/assets/chunks/chunk-VPSYWRNH.js";
import {
  NavLink
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  buildDatabaseFileContentUrl,
  filterImageFiles,
  isImageFile,
  read,
  readFileContent,
  selectAllMemberSpaces,
  selectCurrentSpace,
  selectCurrentSpaceId,
  selectEditorCodeTheme,
  selectEditorWordCountEnabled,
  selectRuntimeCurrentServer,
  selectTheme,
  toast,
  upload,
  uploadAndAddFileToSpace,
  useFavoriteAgentIds
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  LuAlignCenter,
  LuAlignJustify,
  LuAlignLeft,
  LuAlignRight,
  LuArrowDownFromLine,
  LuArrowLeftFromLine,
  LuArrowRightFromLine,
  LuArrowUpFromLine,
  LuBold,
  LuBot,
  LuCheck,
  LuCode,
  LuColumns3,
  LuFile,
  LuFileCode2,
  LuHeading1,
  LuHeading2,
  LuImagePlus,
  LuItalic,
  LuLayoutGrid,
  LuLink,
  LuLink2,
  LuList,
  LuListOrdered,
  LuQuote,
  LuRows3,
  LuSquareCheck,
  LuTable2,
  LuTrash2,
  LuType,
  LuUnderline,
  LuView,
  LuWrench
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __commonJS,
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/prismjs/prism.js
var require_prism = __commonJS({
  "node_modules/prismjs/prism.js"(exports, module) {
    var _self = typeof window !== "undefined" ? window : typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope ? self : {};
    var Prism3 = function(_self2) {
      var lang = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i;
      var uniqueId = 0;
      var plainTextGrammar = {};
      var _ = {
        /**
         * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
         * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
         * additional languages or plugins yourself.
         *
         * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
         *
         * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
         * empty Prism object into the global scope before loading the Prism script like this:
         *
         * ```js
         * window.Prism = window.Prism || {};
         * Prism.manual = true;
         * // add a new <script> to load Prism's script
         * ```
         *
         * @default false
         * @type {boolean}
         * @memberof Prism
         * @public
         */
        manual: _self2.Prism && _self2.Prism.manual,
        /**
         * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
         * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
         * own worker, you don't want it to do this.
         *
         * By setting this value to `true`, Prism will not add its own listeners to the worker.
         *
         * You obviously have to change this value before Prism executes. To do this, you can add an
         * empty Prism object into the global scope before loading the Prism script like this:
         *
         * ```js
         * window.Prism = window.Prism || {};
         * Prism.disableWorkerMessageHandler = true;
         * // Load Prism's script
         * ```
         *
         * @default false
         * @type {boolean}
         * @memberof Prism
         * @public
         */
        disableWorkerMessageHandler: _self2.Prism && _self2.Prism.disableWorkerMessageHandler,
        /**
         * A namespace for utility methods.
         *
         * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
         * change or disappear at any time.
         *
         * @namespace
         * @memberof Prism
         */
        util: {
          encode: function encode(tokens) {
            if (tokens instanceof Token) {
              return new Token(tokens.type, encode(tokens.content), tokens.alias);
            } else if (Array.isArray(tokens)) {
              return tokens.map(encode);
            } else {
              return tokens.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
            }
          },
          /**
           * Returns the name of the type of the given value.
           *
           * @param {any} o
           * @returns {string}
           * @example
           * type(null)      === 'Null'
           * type(undefined) === 'Undefined'
           * type(123)       === 'Number'
           * type('foo')     === 'String'
           * type(true)      === 'Boolean'
           * type([1, 2])    === 'Array'
           * type({})        === 'Object'
           * type(String)    === 'Function'
           * type(/abc+/)    === 'RegExp'
           */
          type: function(o) {
            return Object.prototype.toString.call(o).slice(8, -1);
          },
          /**
           * Returns a unique number for the given object. Later calls will still return the same number.
           *
           * @param {Object} obj
           * @returns {number}
           */
          objId: function(obj) {
            if (!obj["__id"]) {
              Object.defineProperty(obj, "__id", { value: ++uniqueId });
            }
            return obj["__id"];
          },
          /**
           * Creates a deep clone of the given object.
           *
           * The main intended use of this function is to clone language definitions.
           *
           * @param {T} o
           * @param {Record<number, any>} [visited]
           * @returns {T}
           * @template T
           */
          clone: function deepClone(o, visited) {
            visited = visited || {};
            var clone;
            var id;
            switch (_.util.type(o)) {
              case "Object":
                id = _.util.objId(o);
                if (visited[id]) {
                  return visited[id];
                }
                clone = /** @type {Record<string, any>} */
                {};
                visited[id] = clone;
                for (var key in o) {
                  if (o.hasOwnProperty(key)) {
                    clone[key] = deepClone(o[key], visited);
                  }
                }
                return (
                  /** @type {any} */
                  clone
                );
              case "Array":
                id = _.util.objId(o);
                if (visited[id]) {
                  return visited[id];
                }
                clone = [];
                visited[id] = clone;
                /** @type {Array} */
                /** @type {any} */
                o.forEach(function(v, i) {
                  clone[i] = deepClone(v, visited);
                });
                return (
                  /** @type {any} */
                  clone
                );
              default:
                return o;
            }
          },
          /**
           * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
           *
           * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
           *
           * @param {Element} element
           * @returns {string}
           */
          getLanguage: function(element) {
            while (element) {
              var m = lang.exec(element.className);
              if (m) {
                return m[1].toLowerCase();
              }
              element = element.parentElement;
            }
            return "none";
          },
          /**
           * Sets the Prism `language-xxxx` class of the given element.
           *
           * @param {Element} element
           * @param {string} language
           * @returns {void}
           */
          setLanguage: function(element, language) {
            element.className = element.className.replace(RegExp(lang, "gi"), "");
            element.classList.add("language-" + language);
          },
          /**
           * Returns the script element that is currently executing.
           *
           * This does __not__ work for line script element.
           *
           * @returns {HTMLScriptElement | null}
           */
          currentScript: function() {
            if (typeof document === "undefined") {
              return null;
            }
            if ("currentScript" in document && 1 < 2) {
              return (
                /** @type {any} */
                document.currentScript
              );
            }
            try {
              throw new Error();
            } catch (err) {
              var src = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(err.stack) || [])[1];
              if (src) {
                var scripts = document.getElementsByTagName("script");
                for (var i in scripts) {
                  if (scripts[i].src == src) {
                    return scripts[i];
                  }
                }
              }
              return null;
            }
          },
          /**
           * Returns whether a given class is active for `element`.
           *
           * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
           * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
           * given class is just the given class with a `no-` prefix.
           *
           * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
           * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
           * ancestors have the given class or the negated version of it, then the default activation will be returned.
           *
           * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
           * version of it, the class is considered active.
           *
           * @param {Element} element
           * @param {string} className
           * @param {boolean} [defaultActivation=false]
           * @returns {boolean}
           */
          isActive: function(element, className, defaultActivation) {
            var no = "no-" + className;
            while (element) {
              var classList = element.classList;
              if (classList.contains(className)) {
                return true;
              }
              if (classList.contains(no)) {
                return false;
              }
              element = element.parentElement;
            }
            return !!defaultActivation;
          }
        },
        /**
         * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
         *
         * @namespace
         * @memberof Prism
         * @public
         */
        languages: {
          /**
           * The grammar for plain, unformatted text.
           */
          plain: plainTextGrammar,
          plaintext: plainTextGrammar,
          text: plainTextGrammar,
          txt: plainTextGrammar,
          /**
           * Creates a deep copy of the language with the given id and appends the given tokens.
           *
           * If a token in `redef` also appears in the copied language, then the existing token in the copied language
           * will be overwritten at its original position.
           *
           * ## Best practices
           *
           * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
           * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
           * understand the language definition because, normally, the order of tokens matters in Prism grammars.
           *
           * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
           * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
           *
           * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
           * @param {Grammar} redef The new tokens to append.
           * @returns {Grammar} The new language created.
           * @public
           * @example
           * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
           *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
           *     // at its original position
           *     'comment': { ... },
           *     // CSS doesn't have a 'color' token, so this token will be appended
           *     'color': /\b(?:red|green|blue)\b/
           * });
           */
          extend: function(id, redef) {
            var lang2 = _.util.clone(_.languages[id]);
            for (var key in redef) {
              lang2[key] = redef[key];
            }
            return lang2;
          },
          /**
           * Inserts tokens _before_ another token in a language definition or any other grammar.
           *
           * ## Usage
           *
           * This helper method makes it easy to modify existing languages. For example, the CSS language definition
           * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
           * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
           * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
           * this:
           *
           * ```js
           * Prism.languages.markup.style = {
           *     // token
           * };
           * ```
           *
           * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
           * before existing tokens. For the CSS example above, you would use it like this:
           *
           * ```js
           * Prism.languages.insertBefore('markup', 'cdata', {
           *     'style': {
           *         // token
           *     }
           * });
           * ```
           *
           * ## Special cases
           *
           * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
           * will be ignored.
           *
           * This behavior can be used to insert tokens after `before`:
           *
           * ```js
           * Prism.languages.insertBefore('markup', 'comment', {
           *     'comment': Prism.languages.markup.comment,
           *     // tokens after 'comment'
           * });
           * ```
           *
           * ## Limitations
           *
           * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
           * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
           * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
           * deleting properties which is necessary to insert at arbitrary positions.
           *
           * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
           * Instead, it will create a new object and replace all references to the target object with the new one. This
           * can be done without temporarily deleting properties, so the iteration order is well-defined.
           *
           * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
           * you hold the target object in a variable, then the value of the variable will not change.
           *
           * ```js
           * var oldMarkup = Prism.languages.markup;
           * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
           *
           * assert(oldMarkup !== Prism.languages.markup);
           * assert(newMarkup === Prism.languages.markup);
           * ```
           *
           * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
           * object to be modified.
           * @param {string} before The key to insert before.
           * @param {Grammar} insert An object containing the key-value pairs to be inserted.
           * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
           * object to be modified.
           *
           * Defaults to `Prism.languages`.
           * @returns {Grammar} The new grammar object.
           * @public
           */
          insertBefore: function(inside, before, insert, root) {
            root = root || /** @type {any} */
            _.languages;
            var grammar = root[inside];
            var ret = {};
            for (var token in grammar) {
              if (grammar.hasOwnProperty(token)) {
                if (token == before) {
                  for (var newToken in insert) {
                    if (insert.hasOwnProperty(newToken)) {
                      ret[newToken] = insert[newToken];
                    }
                  }
                }
                if (!insert.hasOwnProperty(token)) {
                  ret[token] = grammar[token];
                }
              }
            }
            var old = root[inside];
            root[inside] = ret;
            _.languages.DFS(_.languages, function(key, value) {
              if (value === old && key != inside) {
                this[key] = ret;
              }
            });
            return ret;
          },
          // Traverse a language definition with Depth First Search
          DFS: function DFS(o, callback, type, visited) {
            visited = visited || {};
            var objId = _.util.objId;
            for (var i in o) {
              if (o.hasOwnProperty(i)) {
                callback.call(o, i, o[i], type || i);
                var property = o[i];
                var propertyType = _.util.type(property);
                if (propertyType === "Object" && !visited[objId(property)]) {
                  visited[objId(property)] = true;
                  DFS(property, callback, null, visited);
                } else if (propertyType === "Array" && !visited[objId(property)]) {
                  visited[objId(property)] = true;
                  DFS(property, callback, i, visited);
                }
              }
            }
          }
        },
        plugins: {},
        /**
         * This is the most high-level function in Prism’s API.
         * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
         * each one of them.
         *
         * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
         *
         * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
         * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
         * @memberof Prism
         * @public
         */
        highlightAll: function(async, callback) {
          _.highlightAllUnder(document, async, callback);
        },
        /**
         * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
         * {@link Prism.highlightElement} on each one of them.
         *
         * The following hooks will be run:
         * 1. `before-highlightall`
         * 2. `before-all-elements-highlight`
         * 3. All hooks of {@link Prism.highlightElement} for each element.
         *
         * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
         * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
         * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
         * @memberof Prism
         * @public
         */
        highlightAllUnder: function(container, async, callback) {
          var env = {
            callback,
            container,
            selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
          };
          _.hooks.run("before-highlightall", env);
          env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));
          _.hooks.run("before-all-elements-highlight", env);
          for (var i = 0, element; element = env.elements[i++]; ) {
            _.highlightElement(element, async === true, env.callback);
          }
        },
        /**
         * Highlights the code inside a single element.
         *
         * The following hooks will be run:
         * 1. `before-sanity-check`
         * 2. `before-highlight`
         * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
         * 4. `before-insert`
         * 5. `after-highlight`
         * 6. `complete`
         *
         * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
         * the element's language.
         *
         * @param {Element} element The element containing the code.
         * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
         * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
         * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
         * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
         *
         * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
         * asynchronous highlighting to work. You can build your own bundle on the
         * [Download page](https://prismjs.com/download.html).
         * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
         * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
         * @memberof Prism
         * @public
         */
        highlightElement: function(element, async, callback) {
          var language = _.util.getLanguage(element);
          var grammar = _.languages[language];
          _.util.setLanguage(element, language);
          var parent = element.parentElement;
          if (parent && parent.nodeName.toLowerCase() === "pre") {
            _.util.setLanguage(parent, language);
          }
          var code = element.textContent;
          var env = {
            element,
            language,
            grammar,
            code
          };
          function insertHighlightedCode(highlightedCode) {
            env.highlightedCode = highlightedCode;
            _.hooks.run("before-insert", env);
            env.element.innerHTML = env.highlightedCode;
            _.hooks.run("after-highlight", env);
            _.hooks.run("complete", env);
            callback && callback.call(env.element);
          }
          _.hooks.run("before-sanity-check", env);
          parent = env.element.parentElement;
          if (parent && parent.nodeName.toLowerCase() === "pre" && !parent.hasAttribute("tabindex")) {
            parent.setAttribute("tabindex", "0");
          }
          if (!env.code) {
            _.hooks.run("complete", env);
            callback && callback.call(env.element);
            return;
          }
          _.hooks.run("before-highlight", env);
          if (!env.grammar) {
            insertHighlightedCode(_.util.encode(env.code));
            return;
          }
          if (async && _self2.Worker) {
            var worker = new Worker(_.filename);
            worker.onmessage = function(evt) {
              insertHighlightedCode(evt.data);
            };
            worker.postMessage(JSON.stringify({
              language: env.language,
              code: env.code,
              immediateClose: true
            }));
          } else {
            insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
          }
        },
        /**
         * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
         * and the language definitions to use, and returns a string with the HTML produced.
         *
         * The following hooks will be run:
         * 1. `before-tokenize`
         * 2. `after-tokenize`
         * 3. `wrap`: On each {@link Token}.
         *
         * @param {string} text A string with the code to be highlighted.
         * @param {Grammar} grammar An object containing the tokens to use.
         *
         * Usually a language definition like `Prism.languages.markup`.
         * @param {string} language The name of the language definition passed to `grammar`.
         * @returns {string} The highlighted HTML.
         * @memberof Prism
         * @public
         * @example
         * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
         */
        highlight: function(text, grammar, language) {
          var env = {
            code: text,
            grammar,
            language
          };
          _.hooks.run("before-tokenize", env);
          if (!env.grammar) {
            throw new Error('The language "' + env.language + '" has no grammar.');
          }
          env.tokens = _.tokenize(env.code, env.grammar);
          _.hooks.run("after-tokenize", env);
          return Token.stringify(_.util.encode(env.tokens), env.language);
        },
        /**
         * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
         * and the language definitions to use, and returns an array with the tokenized code.
         *
         * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
         *
         * This method could be useful in other contexts as well, as a very crude parser.
         *
         * @param {string} text A string with the code to be highlighted.
         * @param {Grammar} grammar An object containing the tokens to use.
         *
         * Usually a language definition like `Prism.languages.markup`.
         * @returns {TokenStream} An array of strings and tokens, a token stream.
         * @memberof Prism
         * @public
         * @example
         * let code = `var foo = 0;`;
         * let tokens = Prism.tokenize(code, Prism.languages.javascript);
         * tokens.forEach(token => {
         *     if (token instanceof Prism.Token && token.type === 'number') {
         *         console.log(`Found numeric literal: ${token.content}`);
         *     }
         * });
         */
        tokenize: function(text, grammar) {
          var rest = grammar.rest;
          if (rest) {
            for (var token in rest) {
              grammar[token] = rest[token];
            }
            delete grammar.rest;
          }
          var tokenList = new LinkedList();
          addAfter(tokenList, tokenList.head, text);
          matchGrammar(text, tokenList, grammar, tokenList.head, 0);
          return toArray(tokenList);
        },
        /**
         * @namespace
         * @memberof Prism
         * @public
         */
        hooks: {
          all: {},
          /**
           * Adds the given callback to the list of callbacks for the given hook.
           *
           * The callback will be invoked when the hook it is registered for is run.
           * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
           *
           * One callback function can be registered to multiple hooks and the same hook multiple times.
           *
           * @param {string} name The name of the hook.
           * @param {HookCallback} callback The callback function which is given environment variables.
           * @public
           */
          add: function(name, callback) {
            var hooks = _.hooks.all;
            hooks[name] = hooks[name] || [];
            hooks[name].push(callback);
          },
          /**
           * Runs a hook invoking all registered callbacks with the given environment variables.
           *
           * Callbacks will be invoked synchronously and in the order in which they were registered.
           *
           * @param {string} name The name of the hook.
           * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
           * @public
           */
          run: function(name, env) {
            var callbacks = _.hooks.all[name];
            if (!callbacks || !callbacks.length) {
              return;
            }
            for (var i = 0, callback; callback = callbacks[i++]; ) {
              callback(env);
            }
          }
        },
        Token
      };
      _self2.Prism = _;
      function Token(type, content, alias, matchedStr) {
        this.type = type;
        this.content = content;
        this.alias = alias;
        this.length = (matchedStr || "").length | 0;
      }
      Token.stringify = function stringify(o, language) {
        if (typeof o == "string") {
          return o;
        }
        if (Array.isArray(o)) {
          var s = "";
          o.forEach(function(e) {
            s += stringify(e, language);
          });
          return s;
        }
        var env = {
          type: o.type,
          content: stringify(o.content, language),
          tag: "span",
          classes: ["token", o.type],
          attributes: {},
          language
        };
        var aliases = o.alias;
        if (aliases) {
          if (Array.isArray(aliases)) {
            Array.prototype.push.apply(env.classes, aliases);
          } else {
            env.classes.push(aliases);
          }
        }
        _.hooks.run("wrap", env);
        var attributes = "";
        for (var name in env.attributes) {
          attributes += " " + name + '="' + (env.attributes[name] || "").replace(/"/g, "&quot;") + '"';
        }
        return "<" + env.tag + ' class="' + env.classes.join(" ") + '"' + attributes + ">" + env.content + "</" + env.tag + ">";
      };
      function matchPattern(pattern, pos, text, lookbehind) {
        pattern.lastIndex = pos;
        var match = pattern.exec(text);
        if (match && lookbehind && match[1]) {
          var lookbehindLength = match[1].length;
          match.index += lookbehindLength;
          match[0] = match[0].slice(lookbehindLength);
        }
        return match;
      }
      function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
        for (var token in grammar) {
          if (!grammar.hasOwnProperty(token) || !grammar[token]) {
            continue;
          }
          var patterns = grammar[token];
          patterns = Array.isArray(patterns) ? patterns : [patterns];
          for (var j = 0; j < patterns.length; ++j) {
            if (rematch && rematch.cause == token + "," + j) {
              return;
            }
            var patternObj = patterns[j];
            var inside = patternObj.inside;
            var lookbehind = !!patternObj.lookbehind;
            var greedy = !!patternObj.greedy;
            var alias = patternObj.alias;
            if (greedy && !patternObj.pattern.global) {
              var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
              patternObj.pattern = RegExp(patternObj.pattern.source, flags + "g");
            }
            var pattern = patternObj.pattern || patternObj;
            for (var currentNode = startNode.next, pos = startPos; currentNode !== tokenList.tail; pos += currentNode.value.length, currentNode = currentNode.next) {
              if (rematch && pos >= rematch.reach) {
                break;
              }
              var str = currentNode.value;
              if (tokenList.length > text.length) {
                return;
              }
              if (str instanceof Token) {
                continue;
              }
              var removeCount = 1;
              var match;
              if (greedy) {
                match = matchPattern(pattern, pos, text, lookbehind);
                if (!match || match.index >= text.length) {
                  break;
                }
                var from = match.index;
                var to = match.index + match[0].length;
                var p = pos;
                p += currentNode.value.length;
                while (from >= p) {
                  currentNode = currentNode.next;
                  p += currentNode.value.length;
                }
                p -= currentNode.value.length;
                pos = p;
                if (currentNode.value instanceof Token) {
                  continue;
                }
                for (var k = currentNode; k !== tokenList.tail && (p < to || typeof k.value === "string"); k = k.next) {
                  removeCount++;
                  p += k.value.length;
                }
                removeCount--;
                str = text.slice(pos, p);
                match.index -= pos;
              } else {
                match = matchPattern(pattern, 0, str, lookbehind);
                if (!match) {
                  continue;
                }
              }
              var from = match.index;
              var matchStr = match[0];
              var before = str.slice(0, from);
              var after = str.slice(from + matchStr.length);
              var reach = pos + str.length;
              if (rematch && reach > rematch.reach) {
                rematch.reach = reach;
              }
              var removeFrom = currentNode.prev;
              if (before) {
                removeFrom = addAfter(tokenList, removeFrom, before);
                pos += before.length;
              }
              removeRange(tokenList, removeFrom, removeCount);
              var wrapped = new Token(token, inside ? _.tokenize(matchStr, inside) : matchStr, alias, matchStr);
              currentNode = addAfter(tokenList, removeFrom, wrapped);
              if (after) {
                addAfter(tokenList, currentNode, after);
              }
              if (removeCount > 1) {
                var nestedRematch = {
                  cause: token + "," + j,
                  reach
                };
                matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);
                if (rematch && nestedRematch.reach > rematch.reach) {
                  rematch.reach = nestedRematch.reach;
                }
              }
            }
          }
        }
      }
      function LinkedList() {
        var head = { value: null, prev: null, next: null };
        var tail = { value: null, prev: head, next: null };
        head.next = tail;
        this.head = head;
        this.tail = tail;
        this.length = 0;
      }
      function addAfter(list, node, value) {
        var next = node.next;
        var newNode = { value, prev: node, next };
        node.next = newNode;
        next.prev = newNode;
        list.length++;
        return newNode;
      }
      function removeRange(list, node, count) {
        var next = node.next;
        for (var i = 0; i < count && next !== list.tail; i++) {
          next = next.next;
        }
        node.next = next;
        next.prev = node;
        list.length -= i;
      }
      function toArray(list) {
        var array = [];
        var node = list.head.next;
        while (node !== list.tail) {
          array.push(node.value);
          node = node.next;
        }
        return array;
      }
      if (!_self2.document) {
        if (!_self2.addEventListener) {
          return _;
        }
        if (!_.disableWorkerMessageHandler) {
          _self2.addEventListener("message", function(evt) {
            var message = JSON.parse(evt.data);
            var lang2 = message.language;
            var code = message.code;
            var immediateClose = message.immediateClose;
            _self2.postMessage(_.highlight(code, _.languages[lang2], lang2));
            if (immediateClose) {
              _self2.close();
            }
          }, false);
        }
        return _;
      }
      var script = _.util.currentScript();
      if (script) {
        _.filename = script.src;
        if (script.hasAttribute("data-manual")) {
          _.manual = true;
        }
      }
      function highlightAutomaticallyCallback() {
        if (!_.manual) {
          _.highlightAll();
        }
      }
      if (!_.manual) {
        var readyState = document.readyState;
        if (readyState === "loading" || readyState === "interactive" && script && script.defer) {
          document.addEventListener("DOMContentLoaded", highlightAutomaticallyCallback);
        } else {
          if (window.requestAnimationFrame) {
            window.requestAnimationFrame(highlightAutomaticallyCallback);
          } else {
            window.setTimeout(highlightAutomaticallyCallback, 16);
          }
        }
      }
      return _;
    }(_self);
    if (typeof module !== "undefined" && module.exports) {
      module.exports = Prism3;
    }
    if (typeof global !== "undefined") {
      global.Prism = Prism3;
    }
    Prism3.languages.markup = {
      "comment": {
        pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
        greedy: true
      },
      "prolog": {
        pattern: /<\?[\s\S]+?\?>/,
        greedy: true
      },
      "doctype": {
        // https://www.w3.org/TR/xml/#NT-doctypedecl
        pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
        greedy: true,
        inside: {
          "internal-subset": {
            pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
            lookbehind: true,
            greedy: true,
            inside: null
            // see below
          },
          "string": {
            pattern: /"[^"]*"|'[^']*'/,
            greedy: true
          },
          "punctuation": /^<!|>$|[[\]]/,
          "doctype-tag": /^DOCTYPE/i,
          "name": /[^\s<>'"]+/
        }
      },
      "cdata": {
        pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
        greedy: true
      },
      "tag": {
        pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
        greedy: true,
        inside: {
          "tag": {
            pattern: /^<\/?[^\s>\/]+/,
            inside: {
              "punctuation": /^<\/?/,
              "namespace": /^[^\s>\/:]+:/
            }
          },
          "special-attr": [],
          "attr-value": {
            pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
            inside: {
              "punctuation": [
                {
                  pattern: /^=/,
                  alias: "attr-equals"
                },
                {
                  pattern: /^(\s*)["']|["']$/,
                  lookbehind: true
                }
              ]
            }
          },
          "punctuation": /\/?>/,
          "attr-name": {
            pattern: /[^\s>\/]+/,
            inside: {
              "namespace": /^[^\s>\/:]+:/
            }
          }
        }
      },
      "entity": [
        {
          pattern: /&[\da-z]{1,8};/i,
          alias: "named-entity"
        },
        /&#x?[\da-f]{1,8};/i
      ]
    };
    Prism3.languages.markup["tag"].inside["attr-value"].inside["entity"] = Prism3.languages.markup["entity"];
    Prism3.languages.markup["doctype"].inside["internal-subset"].inside = Prism3.languages.markup;
    Prism3.hooks.add("wrap", function(env) {
      if (env.type === "entity") {
        env.attributes["title"] = env.content.replace(/&amp;/, "&");
      }
    });
    Object.defineProperty(Prism3.languages.markup.tag, "addInlined", {
      /**
       * Adds an inlined language to markup.
       *
       * An example of an inlined language is CSS with `<style>` tags.
       *
       * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
       * case insensitive.
       * @param {string} lang The language key.
       * @example
       * addInlined('style', 'css');
       */
      value: function addInlined(tagName, lang) {
        var includedCdataInside = {};
        includedCdataInside["language-" + lang] = {
          pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
          lookbehind: true,
          inside: Prism3.languages[lang]
        };
        includedCdataInside["cdata"] = /^<!\[CDATA\[|\]\]>$/i;
        var inside = {
          "included-cdata": {
            pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
            inside: includedCdataInside
          }
        };
        inside["language-" + lang] = {
          pattern: /[\s\S]+/,
          inside: Prism3.languages[lang]
        };
        var def = {};
        def[tagName] = {
          pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function() {
            return tagName;
          }), "i"),
          lookbehind: true,
          greedy: true,
          inside
        };
        Prism3.languages.insertBefore("markup", "cdata", def);
      }
    });
    Object.defineProperty(Prism3.languages.markup.tag, "addAttribute", {
      /**
       * Adds an pattern to highlight languages embedded in HTML attributes.
       *
       * An example of an inlined language is CSS with `style` attributes.
       *
       * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
       * case insensitive.
       * @param {string} lang The language key.
       * @example
       * addAttribute('style', 'css');
       */
      value: function(attrName, lang) {
        Prism3.languages.markup.tag.inside["special-attr"].push({
          pattern: RegExp(
            /(^|["'\s])/.source + "(?:" + attrName + ")" + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
            "i"
          ),
          lookbehind: true,
          inside: {
            "attr-name": /^[^\s=]+/,
            "attr-value": {
              pattern: /=[\s\S]+/,
              inside: {
                "value": {
                  pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
                  lookbehind: true,
                  alias: [lang, "language-" + lang],
                  inside: Prism3.languages[lang]
                },
                "punctuation": [
                  {
                    pattern: /^=/,
                    alias: "attr-equals"
                  },
                  /"|'/
                ]
              }
            }
          }
        });
      }
    });
    Prism3.languages.html = Prism3.languages.markup;
    Prism3.languages.mathml = Prism3.languages.markup;
    Prism3.languages.svg = Prism3.languages.markup;
    Prism3.languages.xml = Prism3.languages.extend("markup", {});
    Prism3.languages.ssml = Prism3.languages.xml;
    Prism3.languages.atom = Prism3.languages.xml;
    Prism3.languages.rss = Prism3.languages.xml;
    (function(Prism4) {
      var string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
      Prism4.languages.css = {
        "comment": /\/\*[\s\S]*?\*\//,
        "atrule": {
          pattern: RegExp("@[\\w-](?:" + /[^;{\s"']|\s+(?!\s)/.source + "|" + string.source + ")*?" + /(?:;|(?=\s*\{))/.source),
          inside: {
            "rule": /^@[\w-]+/,
            "selector-function-argument": {
              pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
              lookbehind: true,
              alias: "selector"
            },
            "keyword": {
              pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
              lookbehind: true
            }
            // See rest below
          }
        },
        "url": {
          // https://drafts.csswg.org/css-values-3/#urls
          pattern: RegExp("\\burl\\((?:" + string.source + "|" + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ")\\)", "i"),
          greedy: true,
          inside: {
            "function": /^url/i,
            "punctuation": /^\(|\)$/,
            "string": {
              pattern: RegExp("^" + string.source + "$"),
              alias: "url"
            }
          }
        },
        "selector": {
          pattern: RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|` + string.source + ")*(?=\\s*\\{)"),
          lookbehind: true
        },
        "string": {
          pattern: string,
          greedy: true
        },
        "property": {
          pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
          lookbehind: true
        },
        "important": /!important\b/i,
        "function": {
          pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
          lookbehind: true
        },
        "punctuation": /[(){};:,]/
      };
      Prism4.languages.css["atrule"].inside.rest = Prism4.languages.css;
      var markup = Prism4.languages.markup;
      if (markup) {
        markup.tag.addInlined("style", "css");
        markup.tag.addAttribute("style", "css");
      }
    })(Prism3);
    Prism3.languages.clike = {
      "comment": [
        {
          pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
          lookbehind: true,
          greedy: true
        },
        {
          pattern: /(^|[^\\:])\/\/.*/,
          lookbehind: true,
          greedy: true
        }
      ],
      "string": {
        pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
        greedy: true
      },
      "class-name": {
        pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
        lookbehind: true,
        inside: {
          "punctuation": /[.\\]/
        }
      },
      "keyword": /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
      "boolean": /\b(?:false|true)\b/,
      "function": /\b\w+(?=\()/,
      "number": /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
      "operator": /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
      "punctuation": /[{}[\];(),.:]/
    };
    Prism3.languages.javascript = Prism3.languages.extend("clike", {
      "class-name": [
        Prism3.languages.clike["class-name"],
        {
          pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
          lookbehind: true
        }
      ],
      "keyword": [
        {
          pattern: /((?:^|\})\s*)catch\b/,
          lookbehind: true
        },
        {
          pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
          lookbehind: true
        }
      ],
      // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
      "function": /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
      "number": {
        pattern: RegExp(
          /(^|[^\w$])/.source + "(?:" + // constant
          (/NaN|Infinity/.source + "|" + // binary integer
          /0[bB][01]+(?:_[01]+)*n?/.source + "|" + // octal integer
          /0[oO][0-7]+(?:_[0-7]+)*n?/.source + "|" + // hexadecimal integer
          /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source + "|" + // decimal bigint
          /\d+(?:_\d+)*n/.source + "|" + // decimal number (integer or float) but no bigint
          /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source) + ")" + /(?![\w$])/.source
        ),
        lookbehind: true
      },
      "operator": /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
    });
    Prism3.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;
    Prism3.languages.insertBefore("javascript", "keyword", {
      "regex": {
        pattern: RegExp(
          // lookbehind
          // eslint-disable-next-line regexp/no-dupe-characters-character-class
          /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source + // Regex pattern:
          // There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
          // classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
          // with the only syntax, so we have to define 2 different regex patterns.
          /\//.source + "(?:" + /(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source + "|" + // `v` flag syntax. This supports 3 levels of nested character classes.
          /(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source + ")" + // lookahead
          /(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
        ),
        lookbehind: true,
        greedy: true,
        inside: {
          "regex-source": {
            pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
            lookbehind: true,
            alias: "language-regex",
            inside: Prism3.languages.regex
          },
          "regex-delimiter": /^\/|\/$/,
          "regex-flags": /^[a-z]+$/
        }
      },
      // This must be declared before keyword because we use "function" inside the look-forward
      "function-variable": {
        pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
        alias: "function"
      },
      "parameter": [
        {
          pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
          lookbehind: true,
          inside: Prism3.languages.javascript
        },
        {
          pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
          lookbehind: true,
          inside: Prism3.languages.javascript
        },
        {
          pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
          lookbehind: true,
          inside: Prism3.languages.javascript
        },
        {
          pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
          lookbehind: true,
          inside: Prism3.languages.javascript
        }
      ],
      "constant": /\b[A-Z](?:[A-Z_]|\dx?)*\b/
    });
    Prism3.languages.insertBefore("javascript", "string", {
      "hashbang": {
        pattern: /^#!.*/,
        greedy: true,
        alias: "comment"
      },
      "template-string": {
        pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
        greedy: true,
        inside: {
          "template-punctuation": {
            pattern: /^`|`$/,
            alias: "string"
          },
          "interpolation": {
            pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
            lookbehind: true,
            inside: {
              "interpolation-punctuation": {
                pattern: /^\$\{|\}$/,
                alias: "punctuation"
              },
              rest: Prism3.languages.javascript
            }
          },
          "string": /[\s\S]+/
        }
      },
      "string-property": {
        pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
        lookbehind: true,
        greedy: true,
        alias: "property"
      }
    });
    Prism3.languages.insertBefore("javascript", "operator", {
      "literal-property": {
        pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
        lookbehind: true,
        alias: "property"
      }
    });
    if (Prism3.languages.markup) {
      Prism3.languages.markup.tag.addInlined("script", "javascript");
      Prism3.languages.markup.tag.addAttribute(
        /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
        "javascript"
      );
    }
    Prism3.languages.js = Prism3.languages.javascript;
    (function() {
      if (typeof Prism3 === "undefined" || typeof document === "undefined") {
        return;
      }
      if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
      }
      var LOADING_MESSAGE = "Loading\u2026";
      var FAILURE_MESSAGE = function(status, message) {
        return "\u2716 Error " + status + " while fetching file: " + message;
      };
      var FAILURE_EMPTY_MESSAGE = "\u2716 Error: File does not exist or is empty";
      var EXTENSIONS = {
        "js": "javascript",
        "py": "python",
        "rb": "ruby",
        "ps1": "powershell",
        "psm1": "powershell",
        "sh": "bash",
        "bat": "batch",
        "h": "c",
        "tex": "latex"
      };
      var STATUS_ATTR = "data-src-status";
      var STATUS_LOADING = "loading";
      var STATUS_LOADED = "loaded";
      var STATUS_FAILED = "failed";
      var SELECTOR = "pre[data-src]:not([" + STATUS_ATTR + '="' + STATUS_LOADED + '"]):not([' + STATUS_ATTR + '="' + STATUS_LOADING + '"])';
      function loadFile(src, success, error) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", src, true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            if (xhr.status < 400 && xhr.responseText) {
              success(xhr.responseText);
            } else {
              if (xhr.status >= 400) {
                error(FAILURE_MESSAGE(xhr.status, xhr.statusText));
              } else {
                error(FAILURE_EMPTY_MESSAGE);
              }
            }
          }
        };
        xhr.send(null);
      }
      function parseRange(range) {
        var m = /^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(range || "");
        if (m) {
          var start = Number(m[1]);
          var comma = m[2];
          var end = m[3];
          if (!comma) {
            return [start, start];
          }
          if (!end) {
            return [start, void 0];
          }
          return [start, Number(end)];
        }
        return void 0;
      }
      Prism3.hooks.add("before-highlightall", function(env) {
        env.selector += ", " + SELECTOR;
      });
      Prism3.hooks.add("before-sanity-check", function(env) {
        var pre = (
          /** @type {HTMLPreElement} */
          env.element
        );
        if (pre.matches(SELECTOR)) {
          env.code = "";
          pre.setAttribute(STATUS_ATTR, STATUS_LOADING);
          var code = pre.appendChild(document.createElement("CODE"));
          code.textContent = LOADING_MESSAGE;
          var src = pre.getAttribute("data-src");
          var language = env.language;
          if (language === "none") {
            var extension = (/\.(\w+)$/.exec(src) || [, "none"])[1];
            language = EXTENSIONS[extension] || extension;
          }
          Prism3.util.setLanguage(code, language);
          Prism3.util.setLanguage(pre, language);
          var autoloader = Prism3.plugins.autoloader;
          if (autoloader) {
            autoloader.loadLanguages(language);
          }
          loadFile(
            src,
            function(text) {
              pre.setAttribute(STATUS_ATTR, STATUS_LOADED);
              var range = parseRange(pre.getAttribute("data-range"));
              if (range) {
                var lines = text.split(/\r\n?|\n/g);
                var start = range[0];
                var end = range[1] == null ? lines.length : range[1];
                if (start < 0) {
                  start += lines.length;
                }
                start = Math.max(0, Math.min(start - 1, lines.length));
                if (end < 0) {
                  end += lines.length;
                }
                end = Math.max(0, Math.min(end, lines.length));
                text = lines.slice(start, end).join("\n");
                if (!pre.hasAttribute("data-start")) {
                  pre.setAttribute("data-start", String(start + 1));
                }
              }
              code.textContent = text;
              Prism3.highlightElement(code);
            },
            function(error) {
              pre.setAttribute(STATUS_ATTR, STATUS_FAILED);
              code.textContent = error;
            }
          );
        }
      });
      Prism3.plugins.fileHighlight = {
        /**
         * Executes the File Highlight plugin for all matching `pre` elements under the given container.
         *
         * Note: Elements which are already loaded or currently loading will not be touched by this method.
         *
         * @param {ParentNode} [container=document]
         */
        highlight: function highlight(container) {
          var elements = (container || document).querySelectorAll(SELECTOR);
          for (var i = 0, element; element = elements[i++]; ) {
            Prism3.highlightElement(element);
          }
        }
      };
      var logged = false;
      Prism3.fileHighlight = function() {
        if (!logged) {
          console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead.");
          logged = true;
        }
        Prism3.plugins.fileHighlight.highlight.apply(this, arguments);
      };
    })();
  }
});

// packages/create/editor/Editor.tsx
var import_react18 = __toESM(require_react(), 1);

// node_modules/slate-history/dist/index.es.js
var History = {
  /**
   * Check if a value is a `History` object.
   */
  isHistory(value) {
    return isPlainObject(value) && Array.isArray(value.redos) && Array.isArray(value.undos) && (value.redos.length === 0 || Operation.isOperationList(value.redos[0].operations)) && (value.undos.length === 0 || Operation.isOperationList(value.undos[0].operations));
  }
};
var SAVING = /* @__PURE__ */ new WeakMap();
var MERGING = /* @__PURE__ */ new WeakMap();
var SPLITTING_ONCE = /* @__PURE__ */ new WeakMap();
var HistoryEditor = {
  /**
   * Check if a value is a `HistoryEditor` object.
   */
  isHistoryEditor(value) {
    return History.isHistory(value.history) && Editor.isEditor(value);
  },
  /**
   * Get the merge flag's current value.
   */
  isMerging(editor) {
    return MERGING.get(editor);
  },
  /**
   * Get the splitting once flag's current value.
   */
  isSplittingOnce(editor) {
    return SPLITTING_ONCE.get(editor);
  },
  setSplittingOnce(editor, value) {
    SPLITTING_ONCE.set(editor, value);
  },
  /**
   * Get the saving flag's current value.
   */
  isSaving(editor) {
    return SAVING.get(editor);
  },
  /**
   * Redo to the previous saved state.
   */
  redo(editor) {
    editor.redo();
  },
  /**
   * Undo to the previous saved state.
   */
  undo(editor) {
    editor.undo();
  },
  /**
   * Apply a series of changes inside a synchronous `fn`, These operations will
   * be merged into the previous history.
   */
  withMerging(editor, fn) {
    var prev = HistoryEditor.isMerging(editor);
    MERGING.set(editor, true);
    fn();
    MERGING.set(editor, prev);
  },
  /**
   * Apply a series of changes inside a synchronous `fn`, ensuring that the first
   * operation starts a new batch in the history. Subsequent operations will be
   * merged as usual.
   */
  withNewBatch(editor, fn) {
    var prev = HistoryEditor.isMerging(editor);
    MERGING.set(editor, true);
    SPLITTING_ONCE.set(editor, true);
    fn();
    MERGING.set(editor, prev);
    SPLITTING_ONCE.delete(editor);
  },
  /**
   * Apply a series of changes inside a synchronous `fn`, without merging any of
   * the new operations into previous save point in the history.
   */
  withoutMerging(editor, fn) {
    var prev = HistoryEditor.isMerging(editor);
    MERGING.set(editor, false);
    fn();
    MERGING.set(editor, prev);
  },
  /**
   * Apply a series of changes inside a synchronous `fn`, without saving any of
   * their operations into the history.
   */
  withoutSaving(editor, fn) {
    var prev = HistoryEditor.isSaving(editor);
    SAVING.set(editor, false);
    try {
      fn();
    } finally {
      SAVING.set(editor, prev);
    }
  }
};
var withHistory = (editor) => {
  var e = editor;
  var {
    apply
  } = e;
  e.history = {
    undos: [],
    redos: []
  };
  e.redo = () => {
    var {
      history
    } = e;
    var {
      redos
    } = history;
    if (redos.length > 0) {
      var batch = redos[redos.length - 1];
      if (batch.selectionBefore) {
        Transforms.setSelection(e, batch.selectionBefore);
      }
      HistoryEditor.withoutSaving(e, () => {
        Editor.withoutNormalizing(e, () => {
          for (var op of batch.operations) {
            e.apply(op);
          }
        });
      });
      history.redos.pop();
      e.writeHistory("undos", batch);
    }
  };
  e.undo = () => {
    var {
      history
    } = e;
    var {
      undos
    } = history;
    if (undos.length > 0) {
      var batch = undos[undos.length - 1];
      HistoryEditor.withoutSaving(e, () => {
        Editor.withoutNormalizing(e, () => {
          var inverseOps = batch.operations.map(Operation.inverse).reverse();
          for (var op of inverseOps) {
            e.apply(op);
          }
          if (batch.selectionBefore) {
            Transforms.setSelection(e, batch.selectionBefore);
          }
        });
      });
      e.writeHistory("redos", batch);
      history.undos.pop();
    }
  };
  e.apply = (op) => {
    var {
      operations,
      history
    } = e;
    var {
      undos
    } = history;
    var lastBatch = undos[undos.length - 1];
    var lastOp = lastBatch && lastBatch.operations[lastBatch.operations.length - 1];
    var save = HistoryEditor.isSaving(e);
    var merge = HistoryEditor.isMerging(e);
    if (save == null) {
      save = shouldSave(op);
    }
    if (save) {
      if (merge == null) {
        if (lastBatch == null) {
          merge = false;
        } else if (operations.length !== 0) {
          merge = true;
        } else {
          merge = shouldMerge(op, lastOp);
        }
      }
      if (HistoryEditor.isSplittingOnce(e)) {
        merge = false;
        HistoryEditor.setSplittingOnce(e, void 0);
      }
      if (lastBatch && merge) {
        lastBatch.operations.push(op);
      } else {
        var batch = {
          operations: [op],
          selectionBefore: e.selection
        };
        e.writeHistory("undos", batch);
      }
      while (undos.length > 100) {
        undos.shift();
      }
      history.redos = [];
    }
    apply(op);
  };
  e.writeHistory = (stack, batch) => {
    e.history[stack].push(batch);
  };
  return e;
};
var shouldMerge = (op, prev) => {
  if (prev && op.type === "insert_text" && prev.type === "insert_text" && op.offset === prev.offset + prev.text.length && Path.equals(op.path, prev.path)) {
    return true;
  }
  if (prev && op.type === "remove_text" && prev.type === "remove_text" && op.offset + op.text.length === prev.offset && Path.equals(op.path, prev.path)) {
    return true;
  }
  return false;
};
var shouldSave = (op, prev) => {
  if (op.type === "set_selection") {
    return false;
  }
  return true;
};

// packages/create/editor/plugins/withLayout.ts
var withLayout = (editor) => {
  const { normalizeNode } = editor;
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;
    if (Editor.isEditor(node) && path.length === 0) {
      const children = node.children;
      if (children.length === 0) {
        const paragraph = {
          type: "paragraph",
          children: [{ text: "" }]
        };
        Transforms.insertNodes(editor, paragraph, { at: [0] });
        return;
      }
    }
    return normalizeNode(entry);
  };
  return editor;
};

// packages/create/editor/blockCommands.ts
var LIST_TYPE = "list";
var isListItem = (node) => isCustomElement(node) && node.type === "list-item";
var isBlockActive = (editor, format, blockType = "type") => {
  const { selection } = editor;
  if (!selection) return false;
  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) => isCustomElement(n) && n[blockType] === format
    })
  );
  return !!match;
};
var getActiveListVariant = (editor) => {
  const { selection } = editor;
  if (!selection) return null;
  const [listItemEntry] = Editor.nodes(editor, {
    at: Editor.unhangRange(editor, selection),
    match: (n) => !Editor.isEditor(n) && isListItem(n)
  });
  if (!listItemEntry) return null;
  const [listItemNode, listItemPath] = listItemEntry;
  if (listItemNode.checked !== void 0) {
    return "task";
  }
  const parentNode = Node.get(editor, Path.parent(listItemPath));
  if (!isCustomElement(parentNode) || parentNode.type !== LIST_TYPE) {
    return null;
  }
  return parentNode.ordered ? "ordered" : "unordered";
};
var unwrapFromList = (editor) => {
  Transforms.unwrapNodes(editor, {
    match: (n) => isCustomElement(n) && n.type === LIST_TYPE,
    split: true
  });
};
var setBlockType = (editor, type) => {
  unwrapFromList(editor);
  Transforms.unsetNodes(editor, "checked", {
    match: (n) => isListItem(n)
  });
  Transforms.setNodes(editor, { type });
};
var applyListVariant = (editor, variant) => {
  const currentVariant = getActiveListVariant(editor);
  const isSameVariant = currentVariant === variant;
  unwrapFromList(editor);
  if (isSameVariant) {
    Transforms.unsetNodes(editor, "checked", {
      match: (n) => isListItem(n)
    });
    Transforms.setNodes(editor, { type: "paragraph" });
    return;
  }
  Transforms.setNodes(editor, { type: "list-item" });
  if (variant === "task") {
    Transforms.setNodes(editor, { checked: false }, {
      match: (n) => isListItem(n)
    });
  } else {
    Transforms.unsetNodes(editor, "checked", {
      match: (n) => isListItem(n)
    });
  }
  Transforms.wrapNodes(editor, {
    type: LIST_TYPE,
    ordered: variant === "ordered",
    children: []
  });
};
var toggleOrderedList = (editor) => applyListVariant(editor, "ordered");
var toggleBulletedList = (editor) => applyListVariant(editor, "unordered");
var toggleTaskList = (editor) => applyListVariant(editor, "task");

// packages/create/editor/mark.ts
var toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};
var isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

// packages/create/editor/plugins/withShortcuts.tsx
var SHORTCUTS = {
  // 列表
  "*": { type: "list-item", wrapper: "list", ordered: false },
  "-": { type: "list-item", wrapper: "list", ordered: false },
  "+": { type: "list-item", wrapper: "list", ordered: false },
  "1.": { type: "list-item", wrapper: "list", ordered: true },
  // 待办列表
  "[]": { type: "list-item", wrapper: "list", ordered: false, checked: false },
  "[x]": { type: "list-item", wrapper: "list", ordered: false, checked: true },
  // 标题 (已扩展至6级)
  "#": "heading-one",
  "##": "heading-two",
  "###": "heading-three",
  "####": "heading-four",
  "#####": "heading-five",
  "######": "heading-six",
  // 引用和代码
  ">": "block-quote",
  "```": "code-block",
  // 分割线
  "---": "divider"
};
var HOTKEYS = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+u": "underline",
  "mod+`": "code"
};
var isHotkey = (hotkey, event) => {
  try {
    const mod = hotkey.startsWith("mod+");
    const key = mod ? hotkey.slice(4) : hotkey;
    const hasModifier = event.ctrlKey || event.metaKey;
    if (mod && !hasModifier) return false;
    if (!mod && hasModifier) return false;
    return event.key.toLowerCase() === key.toLowerCase();
  } catch (error) {
    console.warn("Error checking hotkey:", error);
    return false;
  }
};
var withShortcuts = (editor) => {
  const { deleteBackward, insertText } = editor;
  const onKeyDown = editor.onKeyDown;
  editor.insertText = (text) => {
    const { selection } = editor;
    if (text.endsWith(" ") && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection;
      const block = Editor.above(editor, {
        match: (n) => isCustomElement(n) && Editor.isBlock(editor, n)
      });
      if (!block) {
        insertText(text);
        return;
      }
      const path = block[1];
      const start = Editor.start(editor, path);
      const range = { anchor, focus: start };
      const beforeText = Editor.string(editor, range) + text.slice(0, -1);
      const shortcut = SHORTCUTS[beforeText];
      if (shortcut) {
        Transforms.select(editor, range);
        Transforms.delete(editor);
        if (typeof shortcut === "string") {
          setBlockType(editor, shortcut);
        } else {
          const { ordered, checked } = shortcut;
          if (checked !== void 0) {
            toggleTaskList(editor);
            if (checked) {
              Transforms.setNodes(
                editor,
                { checked: true },
                {
                  match: (n) => isCustomElement(n) && n.type === "list-item"
                }
              );
            }
          } else if (ordered) {
            toggleOrderedList(editor);
          } else {
            toggleBulletedList(editor);
          }
        }
        return;
      }
    }
    insertText(text);
  };
  editor.deleteBackward = (...args) => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const match = Editor.above(editor, {
        match: (n) => isCustomElement(n) && Editor.isBlock(editor, n)
      });
      if (match) {
        const [block, path] = match;
        const start = Editor.start(editor, path);
        if (isCustomElement(block) && block.type !== "paragraph" && Point.equals(selection.anchor, start)) {
          setBlockType(editor, "paragraph");
          return;
        }
      }
    }
    deleteBackward(...args);
  };
  editor.onKeyDown = (event) => {
    for (const hotkey in HOTKEYS) {
      if (isHotkey(hotkey, event)) {
        event.preventDefault();
        const mark = HOTKEYS[hotkey];
        toggleMark(editor, mark);
        return;
      }
    }
    if (onKeyDown) {
      onKeyDown(event);
    }
  };
  return editor;
};

// packages/create/editor/plugins/withLinks.ts
var withLinks = (editor) => {
  const { isInline } = editor;
  editor.isInline = (element) => {
    return isCustomElement(element) && element.type === "link" ? true : isInline(element);
  };
  return editor;
};

// packages/create/editor/plugins/withTables.ts
var withTables = (editor) => {
  const { normalizeNode } = editor;
  editor.normalizeNode = ([node, path]) => {
    if (isCustomElement(node) && node.type === "table") {
      const element = node;
      let maxColumns = 0;
      let columnMismatch = false;
      if (!element.children || element.children.length === 0) {
        Transforms.removeNodes(editor, { at: path });
        return;
      }
      for (const child of element.children) {
        if (isCustomElement(child) && child.type === "table-row") {
          const row = child;
          maxColumns = Math.max(maxColumns, row.children?.length || 0);
        }
      }
      const columns = element.columns;
      if (!columns || columns.length !== maxColumns) {
        columnMismatch = true;
      }
      if (columnMismatch && maxColumns > 0) {
        const newColumns = Array.from({ length: maxColumns }, () => ({
          width: null,
          // 默认宽度
          align: "left"
        }));
        Transforms.setNodes(editor, { columns: newColumns }, { at: path });
        return;
      }
    }
    return normalizeNode([node, path]);
  };
  return editor;
};

// packages/create/editor/plugins/normalizeChineseTypography.ts
var normalizeChineseTypography = (input) => {
  let text = input;
  if (!text || !text.trim()) return text;
  text = text.replace(/[!！]{2,}/g, "\uFF01").replace(/[?？]{2,}/g, "\uFF1F").replace(/[,，]{2,}/g, "\uFF0C").replace(/[.。]{2,}/g, "\u3002");
  const CJK_RANGE = "\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF";
  const CJK = `[${CJK_RANGE}]`;
  const fullWidthPunctMap = {
    ",": "\uFF0C",
    ".": "\u3002",
    "!": "\uFF01",
    "?": "\uFF1F",
    ":": "\uFF1A",
    ";": "\uFF1B"
  };
  text = text.replace(
    new RegExp(`(${CJK})([,.!?:;])`, "g"),
    (_, cjk, p) => cjk + (fullWidthPunctMap[p] ?? p)
  );
  text = text.replace(
    new RegExp(`([,.!?:;])(${CJK})`, "g"),
    (_, p, cjk) => (fullWidthPunctMap[p] ?? p) + cjk
  );
  text = text.replace(/\s*([，。！？：；])\s*/g, "$1");
  const ALNUM = "[A-Za-z0-9]";
  text = text.replace(
    new RegExp(`(${CJK})(${ALNUM})`, "g"),
    "$1 $2"
  );
  text = text.replace(
    new RegExp(`(${ALNUM})(${CJK})`, "g"),
    "$1 $2"
  );
  text = text.replace(
    new RegExp(`(${CJK})([0-9])`, "g"),
    "$1 $2"
  );
  text = text.replace(
    new RegExp(`([0-9])(${CJK})`, "g"),
    "$1 $2"
  );
  text = text.replace(/(\d)([A-Za-z])/, "$1 $2");
  text = text.replace(/ {2,}/g, " ");
  return text;
};

// packages/create/editor/plugins/withChineseTypography.ts
var isTypographyDisabled = (editor, entry) => {
  const [, path] = entry;
  const block = Editor.above(editor, {
    at: path,
    match: (n) => Element2.isElement(n) && [
      "code-block",
      "code-line",
      "code-inline",
      // 这里原来是 "inline-code"，建议改成和实际类型一致
      "link"
    ].includes(n.type)
  });
  return Boolean(block);
};
var withChineseTypography = (editor) => {
  const { normalizeNode } = editor;
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;
    if (Text.isText(node)) {
      if (isTypographyDisabled(editor, entry)) {
        return normalizeNode(entry);
      }
      const original = node.text;
      const normalized = normalizeChineseTypography(original);
      if (normalized !== original) {
        Transforms.setNodes(
          editor,
          { text: normalized },
          { at: path }
        );
        return;
      }
    }
    normalizeNode(entry);
  };
  return editor;
};

// packages/create/editor/plugins/withMentions.ts
var withMentions = (editor) => {
  const { isInline, isVoid } = editor;
  editor.isInline = (element) => {
    return element.type === "mention" ? true : isInline(element);
  };
  editor.isVoid = (element) => {
    return element.type === "mention" ? true : isVoid(element);
  };
  return editor;
};

// packages/create/editor/plugins/withBlockStructure.ts
var HEADING_TYPES = /* @__PURE__ */ new Set([
  "heading-one",
  "heading-two",
  "heading-three",
  "heading-four",
  "heading-five",
  "heading-six",
  "quote",
  "thematic-break"
]);
var isList = (node) => isCustomElement(node) && node.type === "list";
var isListItem2 = (node) => isCustomElement(node) && node.type === "list-item";
var withBlockStructure = (editor) => {
  const { normalizeNode } = editor;
  editor.normalizeNode = ([node, path]) => {
    if (isList(node)) {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (!isListItem2(child)) {
          Transforms.wrapNodes(
            editor,
            { type: "list-item", children: [] },
            { at: childPath }
          );
          return;
        }
      }
    }
    if (isListItem2(node)) {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (isCustomElement(child) && HEADING_TYPES.has(child.type)) {
          Transforms.setNodes(editor, { type: "paragraph" }, { at: childPath });
          return;
        }
      }
    }
    normalizeNode([node, path]);
  };
  return editor;
};

// packages/create/editor/utils/editorFactory.ts
var createNoloEditor = () => {
  const reactEditor = withReact(createEditor());
  const historyEditor = withHistory(reactEditor);
  const linksEditor = withLinks(historyEditor);
  const layoutEditor = withLayout(linksEditor);
  const blockStructureEditor = withBlockStructure(layoutEditor);
  const shortcutsEditor = withShortcuts(blockStructureEditor);
  const typographyEditor = withChineseTypography(shortcutsEditor);
  const tablesEditor = withTables(typographyEditor);
  const mentionsEditor = withMentions(tablesEditor);
  const baseEditor = mentionsEditor;
  const { isInline } = baseEditor;
  baseEditor.isInline = (element) => element.type === "code-inline" ? true : isInline(element);
  return baseEditor;
};

// packages/create/editor/syntaxHighlighting.tsx
var import_react = __toESM(require_react(), 1);

// packages/create/editor/prismDomShim.ts
var globalWithDom = globalThis;
if (typeof globalWithDom.document !== "undefined" && typeof globalWithDom.Element === "undefined") {
  class PrismElementShim {
  }
  PrismElementShim.prototype.matches = () => false;
  globalWithDom.Element = PrismElementShim;
}
if (typeof globalWithDom.document !== "undefined" && typeof globalWithDom.HTMLElement === "undefined" && typeof globalWithDom.Element !== "undefined") {
  globalWithDom.HTMLElement = globalWithDom.Element;
}

// packages/create/editor/prismRuntime.ts
var import_prismjs = __toESM(require_prism(), 1);
var prismRuntime_default = import_prismjs.default;

// node_modules/prismjs/components/prism-javascript.js
Prism.languages.javascript = Prism.languages.extend("clike", {
  "class-name": [
    Prism.languages.clike["class-name"],
    {
      pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
      lookbehind: true
    }
  ],
  "keyword": [
    {
      pattern: /((?:^|\})\s*)catch\b/,
      lookbehind: true
    },
    {
      pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
      lookbehind: true
    }
  ],
  // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
  "function": /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
  "number": {
    pattern: RegExp(
      /(^|[^\w$])/.source + "(?:" + // constant
      (/NaN|Infinity/.source + "|" + // binary integer
      /0[bB][01]+(?:_[01]+)*n?/.source + "|" + // octal integer
      /0[oO][0-7]+(?:_[0-7]+)*n?/.source + "|" + // hexadecimal integer
      /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source + "|" + // decimal bigint
      /\d+(?:_\d+)*n/.source + "|" + // decimal number (integer or float) but no bigint
      /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source) + ")" + /(?![\w$])/.source
    ),
    lookbehind: true
  },
  "operator": /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
});
Prism.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;
Prism.languages.insertBefore("javascript", "keyword", {
  "regex": {
    pattern: RegExp(
      // lookbehind
      // eslint-disable-next-line regexp/no-dupe-characters-character-class
      /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source + // Regex pattern:
      // There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
      // classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
      // with the only syntax, so we have to define 2 different regex patterns.
      /\//.source + "(?:" + /(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source + "|" + // `v` flag syntax. This supports 3 levels of nested character classes.
      /(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source + ")" + // lookahead
      /(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
    ),
    lookbehind: true,
    greedy: true,
    inside: {
      "regex-source": {
        pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
        lookbehind: true,
        alias: "language-regex",
        inside: Prism.languages.regex
      },
      "regex-delimiter": /^\/|\/$/,
      "regex-flags": /^[a-z]+$/
    }
  },
  // This must be declared before keyword because we use "function" inside the look-forward
  "function-variable": {
    pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
    alias: "function"
  },
  "parameter": [
    {
      pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
      lookbehind: true,
      inside: Prism.languages.javascript
    },
    {
      pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
      lookbehind: true,
      inside: Prism.languages.javascript
    },
    {
      pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
      lookbehind: true,
      inside: Prism.languages.javascript
    },
    {
      pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
      lookbehind: true,
      inside: Prism.languages.javascript
    }
  ],
  "constant": /\b[A-Z](?:[A-Z_]|\dx?)*\b/
});
Prism.languages.insertBefore("javascript", "string", {
  "hashbang": {
    pattern: /^#!.*/,
    greedy: true,
    alias: "comment"
  },
  "template-string": {
    pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
    greedy: true,
    inside: {
      "template-punctuation": {
        pattern: /^`|`$/,
        alias: "string"
      },
      "interpolation": {
        pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
        lookbehind: true,
        inside: {
          "interpolation-punctuation": {
            pattern: /^\$\{|\}$/,
            alias: "punctuation"
          },
          rest: Prism.languages.javascript
        }
      },
      "string": /[\s\S]+/
    }
  },
  "string-property": {
    pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
    lookbehind: true,
    greedy: true,
    alias: "property"
  }
});
Prism.languages.insertBefore("javascript", "operator", {
  "literal-property": {
    pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
    lookbehind: true,
    alias: "property"
  }
});
if (Prism.languages.markup) {
  Prism.languages.markup.tag.addInlined("script", "javascript");
  Prism.languages.markup.tag.addAttribute(
    /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
    "javascript"
  );
}
Prism.languages.js = Prism.languages.javascript;

// node_modules/prismjs/components/prism-jsx.js
(function(Prism3) {
  var javascript = Prism3.util.clone(Prism3.languages.javascript);
  var space = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source;
  var braces = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source;
  var spread = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;
  function re(source, flags) {
    source = source.replace(/<S>/g, function() {
      return space;
    }).replace(/<BRACES>/g, function() {
      return braces;
    }).replace(/<SPREAD>/g, function() {
      return spread;
    });
    return RegExp(source, flags);
  }
  spread = re(spread).source;
  Prism3.languages.jsx = Prism3.languages.extend("markup", javascript);
  Prism3.languages.jsx.tag.pattern = re(
    /<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source
  );
  Prism3.languages.jsx.tag.inside["tag"].pattern = /^<\/?[^\s>\/]*/;
  Prism3.languages.jsx.tag.inside["attr-value"].pattern = /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/;
  Prism3.languages.jsx.tag.inside["tag"].inside["class-name"] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/;
  Prism3.languages.jsx.tag.inside["comment"] = javascript["comment"];
  Prism3.languages.insertBefore("inside", "attr-name", {
    "spread": {
      pattern: re(/<SPREAD>/.source),
      inside: Prism3.languages.jsx
    }
  }, Prism3.languages.jsx.tag);
  Prism3.languages.insertBefore("inside", "special-attr", {
    "script": {
      // Allow for two levels of nesting
      pattern: re(/=<BRACES>/.source),
      alias: "language-javascript",
      inside: {
        "script-punctuation": {
          pattern: /^=(?=\{)/,
          alias: "punctuation"
        },
        rest: Prism3.languages.jsx
      }
    }
  }, Prism3.languages.jsx.tag);
  var stringifyToken = function(token) {
    if (!token) {
      return "";
    }
    if (typeof token === "string") {
      return token;
    }
    if (typeof token.content === "string") {
      return token.content;
    }
    return token.content.map(stringifyToken).join("");
  };
  var walkTokens = function(tokens) {
    var openedTags = [];
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var notTagNorBrace = false;
      if (typeof token !== "string") {
        if (token.type === "tag" && token.content[0] && token.content[0].type === "tag") {
          if (token.content[0].content[0].content === "</") {
            if (openedTags.length > 0 && openedTags[openedTags.length - 1].tagName === stringifyToken(token.content[0].content[1])) {
              openedTags.pop();
            }
          } else {
            if (token.content[token.content.length - 1].content === "/>") {
            } else {
              openedTags.push({
                tagName: stringifyToken(token.content[0].content[1]),
                openedBraces: 0
              });
            }
          }
        } else if (openedTags.length > 0 && token.type === "punctuation" && token.content === "{") {
          openedTags[openedTags.length - 1].openedBraces++;
        } else if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces > 0 && token.type === "punctuation" && token.content === "}") {
          openedTags[openedTags.length - 1].openedBraces--;
        } else {
          notTagNorBrace = true;
        }
      }
      if (notTagNorBrace || typeof token === "string") {
        if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces === 0) {
          var plainText = stringifyToken(token);
          if (i < tokens.length - 1 && (typeof tokens[i + 1] === "string" || tokens[i + 1].type === "plain-text")) {
            plainText += stringifyToken(tokens[i + 1]);
            tokens.splice(i + 1, 1);
          }
          if (i > 0 && (typeof tokens[i - 1] === "string" || tokens[i - 1].type === "plain-text")) {
            plainText = stringifyToken(tokens[i - 1]) + plainText;
            tokens.splice(i - 1, 1);
            i--;
          }
          tokens[i] = new Prism3.Token("plain-text", plainText, null, plainText);
        }
      }
      if (token.content && typeof token.content !== "string") {
        walkTokens(token.content);
      }
    }
  };
  Prism3.hooks.add("after-tokenize", function(env) {
    if (env.language !== "jsx" && env.language !== "tsx") {
      return;
    }
    walkTokens(env.tokens);
  });
})(Prism);

// node_modules/prismjs/components/prism-typescript.js
(function(Prism3) {
  Prism3.languages.typescript = Prism3.languages.extend("javascript", {
    "class-name": {
      pattern: /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
      lookbehind: true,
      greedy: true,
      inside: null
      // see below
    },
    "builtin": /\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/
  });
  Prism3.languages.typescript.keyword.push(
    /\b(?:abstract|declare|is|keyof|readonly|require)\b/,
    // keywords that have to be followed by an identifier
    /\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,
    // This is for `import type *, {}`
    /\btype\b(?=\s*(?:[\{*]|$))/
  );
  delete Prism3.languages.typescript["parameter"];
  delete Prism3.languages.typescript["literal-property"];
  var typeInside = Prism3.languages.extend("typescript", {});
  delete typeInside["class-name"];
  Prism3.languages.typescript["class-name"].inside = typeInside;
  Prism3.languages.insertBefore("typescript", "function", {
    "decorator": {
      pattern: /@[$\w\xA0-\uFFFF]+/,
      inside: {
        "at": {
          pattern: /^@/,
          alias: "operator"
        },
        "function": /^[\s\S]+/
      }
    },
    "generic-function": {
      // e.g. foo<T extends "bar" | "baz">( ...
      pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,
      greedy: true,
      inside: {
        "function": /^#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,
        "generic": {
          pattern: /<[\s\S]+/,
          // everything after the first <
          alias: "class-name",
          inside: typeInside
        }
      }
    }
  });
  Prism3.languages.ts = Prism3.languages.typescript;
})(Prism);

// node_modules/prismjs/components/prism-tsx.js
(function(Prism3) {
  var typescript = Prism3.util.clone(Prism3.languages.typescript);
  Prism3.languages.tsx = Prism3.languages.extend("jsx", typescript);
  delete Prism3.languages.tsx["parameter"];
  delete Prism3.languages.tsx["literal-property"];
  var tag = Prism3.languages.tsx.tag;
  tag.pattern = RegExp(/(^|[^\w$]|(?=<\/))/.source + "(?:" + tag.pattern.source + ")", tag.pattern.flags);
  tag.lookbehind = true;
})(Prism);

// node_modules/prismjs/components/prism-json.js
Prism.languages.json = {
  "property": {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
    lookbehind: true,
    greedy: true
  },
  "string": {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    lookbehind: true,
    greedy: true
  },
  "comment": {
    pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
    greedy: true
  },
  "number": /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  "punctuation": /[{}[\],]/,
  "operator": /:/,
  "boolean": /\b(?:false|true)\b/,
  "null": {
    pattern: /\bnull\b/,
    alias: "keyword"
  }
};
Prism.languages.webmanifest = Prism.languages.json;

// node_modules/prismjs/components/prism-yaml.js
(function(Prism3) {
  var anchorOrAlias = /[*&][^\s[\]{},]+/;
  var tag = /!(?:<[\w\-%#;/?:@&=+$,.!~*'()[\]]+>|(?:[a-zA-Z\d-]*!)?[\w\-%#;/?:@&=+$.~*'()]+)?/;
  var properties = "(?:" + tag.source + "(?:[ 	]+" + anchorOrAlias.source + ")?|" + anchorOrAlias.source + "(?:[ 	]+" + tag.source + ")?)";
  var plainKey = /(?:[^\s\x00-\x08\x0e-\x1f!"#%&'*,\-:>?@[\]`{|}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]|[?:-]<PLAIN>)(?:[ \t]*(?:(?![#:])<PLAIN>|:<PLAIN>))*/.source.replace(/<PLAIN>/g, function() {
    return /[^\s\x00-\x08\x0e-\x1f,[\]{}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]/.source;
  });
  var string = /"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/.source;
  function createValuePattern(value, flags) {
    flags = (flags || "").replace(/m/g, "") + "m";
    var pattern = /([:\-,[{]\s*(?:\s<<prop>>[ \t]+)?)(?:<<value>>)(?=[ \t]*(?:$|,|\]|\}|(?:[\r\n]\s*)?#))/.source.replace(/<<prop>>/g, function() {
      return properties;
    }).replace(/<<value>>/g, function() {
      return value;
    });
    return RegExp(pattern, flags);
  }
  Prism3.languages.yaml = {
    "scalar": {
      pattern: RegExp(/([\-:]\s*(?:\s<<prop>>[ \t]+)?[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)\S[^\r\n]*(?:\2[^\r\n]+)*)/.source.replace(/<<prop>>/g, function() {
        return properties;
      })),
      lookbehind: true,
      alias: "string"
    },
    "comment": /#.*/,
    "key": {
      pattern: RegExp(/((?:^|[:\-,[{\r\n?])[ \t]*(?:<<prop>>[ \t]+)?)<<key>>(?=\s*:\s)/.source.replace(/<<prop>>/g, function() {
        return properties;
      }).replace(/<<key>>/g, function() {
        return "(?:" + plainKey + "|" + string + ")";
      })),
      lookbehind: true,
      greedy: true,
      alias: "atrule"
    },
    "directive": {
      pattern: /(^[ \t]*)%.+/m,
      lookbehind: true,
      alias: "important"
    },
    "datetime": {
      pattern: createValuePattern(/\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?(?:[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?))?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?/.source),
      lookbehind: true,
      alias: "number"
    },
    "boolean": {
      pattern: createValuePattern(/false|true/.source, "i"),
      lookbehind: true,
      alias: "important"
    },
    "null": {
      pattern: createValuePattern(/null|~/.source, "i"),
      lookbehind: true,
      alias: "important"
    },
    "string": {
      pattern: createValuePattern(string),
      lookbehind: true,
      greedy: true
    },
    "number": {
      pattern: createValuePattern(/[+-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|\.inf|\.nan)/.source, "i"),
      lookbehind: true
    },
    "tag": tag,
    "important": anchorOrAlias,
    "punctuation": /---|[:[\]{}\-,|>?]|\.\.\./
  };
  Prism3.languages.yml = Prism3.languages.yaml;
})(Prism);

// node_modules/prismjs/components/prism-python.js
Prism.languages.python = {
  "comment": {
    pattern: /(^|[^\\])#.*/,
    lookbehind: true,
    greedy: true
  },
  "string-interpolation": {
    pattern: /(?:f|fr|rf)(?:("""|''')[\s\S]*?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2)/i,
    greedy: true,
    inside: {
      "interpolation": {
        // "{" <expression> <optional "!s", "!r", or "!a"> <optional ":" format specifier> "}"
        pattern: /((?:^|[^{])(?:\{\{)*)\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}])+\})+\})+\}/,
        lookbehind: true,
        inside: {
          "format-spec": {
            pattern: /(:)[^:(){}]+(?=\}$)/,
            lookbehind: true
          },
          "conversion-option": {
            pattern: /![sra](?=[:}]$)/,
            alias: "punctuation"
          },
          rest: null
        }
      },
      "string": /[\s\S]+/
    }
  },
  "triple-quoted-string": {
    pattern: /(?:[rub]|br|rb)?("""|''')[\s\S]*?\1/i,
    greedy: true,
    alias: "string"
  },
  "string": {
    pattern: /(?:[rub]|br|rb)?("|')(?:\\.|(?!\1)[^\\\r\n])*\1/i,
    greedy: true
  },
  "function": {
    pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,
    lookbehind: true
  },
  "class-name": {
    pattern: /(\bclass\s+)\w+/i,
    lookbehind: true
  },
  "decorator": {
    pattern: /(^[\t ]*)@\w+(?:\.\w+)*/m,
    lookbehind: true,
    alias: ["annotation", "punctuation"],
    inside: {
      "punctuation": /\./
    }
  },
  "keyword": /\b(?:_(?=\s*:)|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/,
  "builtin": /\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,
  "boolean": /\b(?:False|None|True)\b/,
  "number": /\b0(?:b(?:_?[01])+|o(?:_?[0-7])+|x(?:_?[a-f0-9])+)\b|(?:\b\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\B\.\d+(?:_\d+)*)(?:e[+-]?\d+(?:_\d+)*)?j?(?!\w)/i,
  "operator": /[-+%=]=?|!=|:=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,
  "punctuation": /[{}[\];(),.:]/
};
Prism.languages.python["string-interpolation"].inside["interpolation"].inside.rest = Prism.languages.python;
Prism.languages.py = Prism.languages.python;

// node_modules/prismjs/components/prism-markup-templating.js
(function(Prism3) {
  function getPlaceholder(language, index) {
    return "___" + language.toUpperCase() + index + "___";
  }
  Object.defineProperties(Prism3.languages["markup-templating"] = {}, {
    buildPlaceholders: {
      /**
       * Tokenize all inline templating expressions matching `placeholderPattern`.
       *
       * If `replaceFilter` is provided, only matches of `placeholderPattern` for which `replaceFilter` returns
       * `true` will be replaced.
       *
       * @param {object} env The environment of the `before-tokenize` hook.
       * @param {string} language The language id.
       * @param {RegExp} placeholderPattern The matches of this pattern will be replaced by placeholders.
       * @param {(match: string) => boolean} [replaceFilter]
       */
      value: function(env, language, placeholderPattern, replaceFilter) {
        if (env.language !== language) {
          return;
        }
        var tokenStack = env.tokenStack = [];
        env.code = env.code.replace(placeholderPattern, function(match) {
          if (typeof replaceFilter === "function" && !replaceFilter(match)) {
            return match;
          }
          var i = tokenStack.length;
          var placeholder;
          while (env.code.indexOf(placeholder = getPlaceholder(language, i)) !== -1) {
            ++i;
          }
          tokenStack[i] = match;
          return placeholder;
        });
        env.grammar = Prism3.languages.markup;
      }
    },
    tokenizePlaceholders: {
      /**
       * Replace placeholders with proper tokens after tokenizing.
       *
       * @param {object} env The environment of the `after-tokenize` hook.
       * @param {string} language The language id.
       */
      value: function(env, language) {
        if (env.language !== language || !env.tokenStack) {
          return;
        }
        env.grammar = Prism3.languages[language];
        var j = 0;
        var keys = Object.keys(env.tokenStack);
        function walkTokens(tokens) {
          for (var i = 0; i < tokens.length; i++) {
            if (j >= keys.length) {
              break;
            }
            var token = tokens[i];
            if (typeof token === "string" || token.content && typeof token.content === "string") {
              var k = keys[j];
              var t = env.tokenStack[k];
              var s = typeof token === "string" ? token : token.content;
              var placeholder = getPlaceholder(language, k);
              var index = s.indexOf(placeholder);
              if (index > -1) {
                ++j;
                var before = s.substring(0, index);
                var middle = new Prism3.Token(language, Prism3.tokenize(t, env.grammar), "language-" + language, t);
                var after = s.substring(index + placeholder.length);
                var replacement = [];
                if (before) {
                  replacement.push.apply(replacement, walkTokens([before]));
                }
                replacement.push(middle);
                if (after) {
                  replacement.push.apply(replacement, walkTokens([after]));
                }
                if (typeof token === "string") {
                  tokens.splice.apply(tokens, [i, 1].concat(replacement));
                } else {
                  token.content = replacement;
                }
              }
            } else if (token.content) {
              walkTokens(token.content);
            }
          }
          return tokens;
        }
        walkTokens(env.tokens);
      }
    }
  });
})(Prism);

// node_modules/prismjs/components/prism-php.js
(function(Prism3) {
  var comment = /\/\*[\s\S]*?\*\/|\/\/.*|#(?!\[).*/;
  var constant = [
    {
      pattern: /\b(?:false|true)\b/i,
      alias: "boolean"
    },
    {
      pattern: /(::\s*)\b[a-z_]\w*\b(?!\s*\()/i,
      greedy: true,
      lookbehind: true
    },
    {
      pattern: /(\b(?:case|const)\s+)\b[a-z_]\w*(?=\s*[;=])/i,
      greedy: true,
      lookbehind: true
    },
    /\b(?:null)\b/i,
    /\b[A-Z_][A-Z0-9_]*\b(?!\s*\()/
  ];
  var number = /\b0b[01]+(?:_[01]+)*\b|\b0o[0-7]+(?:_[0-7]+)*\b|\b0x[\da-f]+(?:_[\da-f]+)*\b|(?:\b\d+(?:_\d+)*\.?(?:\d+(?:_\d+)*)?|\B\.\d+)(?:e[+-]?\d+)?/i;
  var operator = /<?=>|\?\?=?|\.{3}|\??->|[!=]=?=?|::|\*\*=?|--|\+\+|&&|\|\||<<|>>|[?~]|[/^|%*&<>.+-]=?/;
  var punctuation = /[{}\[\](),:;]/;
  Prism3.languages.php = {
    "delimiter": {
      pattern: /\?>$|^<\?(?:php(?=\s)|=)?/i,
      alias: "important"
    },
    "comment": comment,
    "variable": /\$+(?:\w+\b|(?=\{))/,
    "package": {
      pattern: /(namespace\s+|use\s+(?:function\s+)?)(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
      lookbehind: true,
      inside: {
        "punctuation": /\\/
      }
    },
    "class-name-definition": {
      pattern: /(\b(?:class|enum|interface|trait)\s+)\b[a-z_]\w*(?!\\)\b/i,
      lookbehind: true,
      alias: "class-name"
    },
    "function-definition": {
      pattern: /(\bfunction\s+)[a-z_]\w*(?=\s*\()/i,
      lookbehind: true,
      alias: "function"
    },
    "keyword": [
      {
        pattern: /(\(\s*)\b(?:array|bool|boolean|float|int|integer|object|string)\b(?=\s*\))/i,
        alias: "type-casting",
        greedy: true,
        lookbehind: true
      },
      {
        pattern: /([(,?]\s*)\b(?:array(?!\s*\()|bool|callable|(?:false|null)(?=\s*\|)|float|int|iterable|mixed|object|self|static|string)\b(?=\s*\$)/i,
        alias: "type-hint",
        greedy: true,
        lookbehind: true
      },
      {
        pattern: /(\)\s*:\s*(?:\?\s*)?)\b(?:array(?!\s*\()|bool|callable|(?:false|null)(?=\s*\|)|float|int|iterable|mixed|never|object|self|static|string|void)\b/i,
        alias: "return-type",
        greedy: true,
        lookbehind: true
      },
      {
        pattern: /\b(?:array(?!\s*\()|bool|float|int|iterable|mixed|object|string|void)\b/i,
        alias: "type-declaration",
        greedy: true
      },
      {
        pattern: /(\|\s*)(?:false|null)\b|\b(?:false|null)(?=\s*\|)/i,
        alias: "type-declaration",
        greedy: true,
        lookbehind: true
      },
      {
        pattern: /\b(?:parent|self|static)(?=\s*::)/i,
        alias: "static-context",
        greedy: true
      },
      {
        // yield from
        pattern: /(\byield\s+)from\b/i,
        lookbehind: true
      },
      // `class` is always a keyword unlike other keywords
      /\bclass\b/i,
      {
        // https://www.php.net/manual/en/reserved.keywords.php
        //
        // keywords cannot be preceded by "->"
        // the complex lookbehind means `(?<!(?:->|::)\s*)`
        pattern: /((?:^|[^\s>:]|(?:^|[^-])>|(?:^|[^:]):)\s*)\b(?:abstract|and|array|as|break|callable|case|catch|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|enum|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|never|new|or|parent|print|private|protected|public|readonly|require|require_once|return|self|static|switch|throw|trait|try|unset|use|var|while|xor|yield|__halt_compiler)\b/i,
        lookbehind: true
      }
    ],
    "argument-name": {
      pattern: /([(,]\s*)\b[a-z_]\w*(?=\s*:(?!:))/i,
      lookbehind: true
    },
    "class-name": [
      {
        pattern: /(\b(?:extends|implements|instanceof|new(?!\s+self|\s+static))\s+|\bcatch\s*\()\b[a-z_]\w*(?!\\)\b/i,
        greedy: true,
        lookbehind: true
      },
      {
        pattern: /(\|\s*)\b[a-z_]\w*(?!\\)\b/i,
        greedy: true,
        lookbehind: true
      },
      {
        pattern: /\b[a-z_]\w*(?!\\)\b(?=\s*\|)/i,
        greedy: true
      },
      {
        pattern: /(\|\s*)(?:\\?\b[a-z_]\w*)+\b/i,
        alias: "class-name-fully-qualified",
        greedy: true,
        lookbehind: true,
        inside: {
          "punctuation": /\\/
        }
      },
      {
        pattern: /(?:\\?\b[a-z_]\w*)+\b(?=\s*\|)/i,
        alias: "class-name-fully-qualified",
        greedy: true,
        inside: {
          "punctuation": /\\/
        }
      },
      {
        pattern: /(\b(?:extends|implements|instanceof|new(?!\s+self\b|\s+static\b))\s+|\bcatch\s*\()(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
        alias: "class-name-fully-qualified",
        greedy: true,
        lookbehind: true,
        inside: {
          "punctuation": /\\/
        }
      },
      {
        pattern: /\b[a-z_]\w*(?=\s*\$)/i,
        alias: "type-declaration",
        greedy: true
      },
      {
        pattern: /(?:\\?\b[a-z_]\w*)+(?=\s*\$)/i,
        alias: ["class-name-fully-qualified", "type-declaration"],
        greedy: true,
        inside: {
          "punctuation": /\\/
        }
      },
      {
        pattern: /\b[a-z_]\w*(?=\s*::)/i,
        alias: "static-context",
        greedy: true
      },
      {
        pattern: /(?:\\?\b[a-z_]\w*)+(?=\s*::)/i,
        alias: ["class-name-fully-qualified", "static-context"],
        greedy: true,
        inside: {
          "punctuation": /\\/
        }
      },
      {
        pattern: /([(,?]\s*)[a-z_]\w*(?=\s*\$)/i,
        alias: "type-hint",
        greedy: true,
        lookbehind: true
      },
      {
        pattern: /([(,?]\s*)(?:\\?\b[a-z_]\w*)+(?=\s*\$)/i,
        alias: ["class-name-fully-qualified", "type-hint"],
        greedy: true,
        lookbehind: true,
        inside: {
          "punctuation": /\\/
        }
      },
      {
        pattern: /(\)\s*:\s*(?:\?\s*)?)\b[a-z_]\w*(?!\\)\b/i,
        alias: "return-type",
        greedy: true,
        lookbehind: true
      },
      {
        pattern: /(\)\s*:\s*(?:\?\s*)?)(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
        alias: ["class-name-fully-qualified", "return-type"],
        greedy: true,
        lookbehind: true,
        inside: {
          "punctuation": /\\/
        }
      }
    ],
    "constant": constant,
    "function": {
      pattern: /(^|[^\\\w])\\?[a-z_](?:[\w\\]*\w)?(?=\s*\()/i,
      lookbehind: true,
      inside: {
        "punctuation": /\\/
      }
    },
    "property": {
      pattern: /(->\s*)\w+/,
      lookbehind: true
    },
    "number": number,
    "operator": operator,
    "punctuation": punctuation
  };
  var string_interpolation = {
    pattern: /\{\$(?:\{(?:\{[^{}]+\}|[^{}]+)\}|[^{}])+\}|(^|[^\\{])\$+(?:\w+(?:\[[^\r\n\[\]]+\]|->\w+)?)/,
    lookbehind: true,
    inside: Prism3.languages.php
  };
  var string = [
    {
      pattern: /<<<'([^']+)'[\r\n](?:.*[\r\n])*?\1;/,
      alias: "nowdoc-string",
      greedy: true,
      inside: {
        "delimiter": {
          pattern: /^<<<'[^']+'|[a-z_]\w*;$/i,
          alias: "symbol",
          inside: {
            "punctuation": /^<<<'?|[';]$/
          }
        }
      }
    },
    {
      pattern: /<<<(?:"([^"]+)"[\r\n](?:.*[\r\n])*?\1;|([a-z_]\w*)[\r\n](?:.*[\r\n])*?\2;)/i,
      alias: "heredoc-string",
      greedy: true,
      inside: {
        "delimiter": {
          pattern: /^<<<(?:"[^"]+"|[a-z_]\w*)|[a-z_]\w*;$/i,
          alias: "symbol",
          inside: {
            "punctuation": /^<<<"?|[";]$/
          }
        },
        "interpolation": string_interpolation
      }
    },
    {
      pattern: /`(?:\\[\s\S]|[^\\`])*`/,
      alias: "backtick-quoted-string",
      greedy: true
    },
    {
      pattern: /'(?:\\[\s\S]|[^\\'])*'/,
      alias: "single-quoted-string",
      greedy: true
    },
    {
      pattern: /"(?:\\[\s\S]|[^\\"])*"/,
      alias: "double-quoted-string",
      greedy: true,
      inside: {
        "interpolation": string_interpolation
      }
    }
  ];
  Prism3.languages.insertBefore("php", "variable", {
    "string": string,
    "attribute": {
      pattern: /#\[(?:[^"'\/#]|\/(?![*/])|\/\/.*$|#(?!\[).*$|\/\*(?:[^*]|\*(?!\/))*\*\/|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*')+\](?=\s*[a-z$#])/im,
      greedy: true,
      inside: {
        "attribute-content": {
          pattern: /^(#\[)[\s\S]+(?=\]$)/,
          lookbehind: true,
          // inside can appear subset of php
          inside: {
            "comment": comment,
            "string": string,
            "attribute-class-name": [
              {
                pattern: /([^:]|^)\b[a-z_]\w*(?!\\)\b/i,
                alias: "class-name",
                greedy: true,
                lookbehind: true
              },
              {
                pattern: /([^:]|^)(?:\\?\b[a-z_]\w*)+/i,
                alias: [
                  "class-name",
                  "class-name-fully-qualified"
                ],
                greedy: true,
                lookbehind: true,
                inside: {
                  "punctuation": /\\/
                }
              }
            ],
            "constant": constant,
            "number": number,
            "operator": operator,
            "punctuation": punctuation
          }
        },
        "delimiter": {
          pattern: /^#\[|\]$/,
          alias: "punctuation"
        }
      }
    }
  });
  Prism3.hooks.add("before-tokenize", function(env) {
    if (!/<\?/.test(env.code)) {
      return;
    }
    var phpPattern = /<\?(?:[^"'/#]|\/(?![*/])|("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|(?:\/\/|#(?!\[))(?:[^?\n\r]|\?(?!>))*(?=$|\?>|[\r\n])|#\[|\/\*(?:[^*]|\*(?!\/))*(?:\*\/|$))*?(?:\?>|$)/g;
    Prism3.languages["markup-templating"].buildPlaceholders(env, "php", phpPattern);
  });
  Prism3.hooks.add("after-tokenize", function(env) {
    Prism3.languages["markup-templating"].tokenizePlaceholders(env, "php");
  });
})(Prism);

// node_modules/prismjs/components/prism-sql.js
Prism.languages.sql = {
  "comment": {
    pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
    lookbehind: true
  },
  "variable": [
    {
      pattern: /@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
      greedy: true
    },
    /@[\w.$]+/
  ],
  "string": {
    pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,
    greedy: true,
    lookbehind: true
  },
  "identifier": {
    pattern: /(^|[^@\\])`(?:\\[\s\S]|[^`\\]|``)*`/,
    greedy: true,
    lookbehind: true,
    inside: {
      "punctuation": /^`|`$/
    }
  },
  "function": /\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i,
  // Should we highlight user defined functions too?
  "keyword": /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:COL|_INSERT)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:ING|S)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,
  "boolean": /\b(?:FALSE|NULL|TRUE)\b/i,
  "number": /\b0x[\da-f]+\b|\b\d+(?:\.\d*)?|\B\.\d+\b/i,
  "operator": /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
  "punctuation": /[;[\]()`,.]/
};

// node_modules/prismjs/components/prism-java.js
(function(Prism3) {
  var keywords = /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|module|native|new|non-sealed|null|open|opens|package|permits|private|protected|provides|public|record(?!\s*[(){}[\]<>=%~.:,;?+\-*/&|^])|requires|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|to|transient|transitive|try|uses|var|void|volatile|while|with|yield)\b/;
  var classNamePrefix = /(?:[a-z]\w*\s*\.\s*)*(?:[A-Z]\w*\s*\.\s*)*/.source;
  var className = {
    pattern: RegExp(/(^|[^\w.])/.source + classNamePrefix + /[A-Z](?:[\d_A-Z]*[a-z]\w*)?\b/.source),
    lookbehind: true,
    inside: {
      "namespace": {
        pattern: /^[a-z]\w*(?:\s*\.\s*[a-z]\w*)*(?:\s*\.)?/,
        inside: {
          "punctuation": /\./
        }
      },
      "punctuation": /\./
    }
  };
  Prism3.languages.java = Prism3.languages.extend("clike", {
    "string": {
      pattern: /(^|[^\\])"(?:\\.|[^"\\\r\n])*"/,
      lookbehind: true,
      greedy: true
    },
    "class-name": [
      className,
      {
        // variables, parameters, and constructor references
        // this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
        pattern: RegExp(/(^|[^\w.])/.source + classNamePrefix + /[A-Z]\w*(?=\s+\w+\s*[;,=()]|\s*(?:\[[\s,]*\]\s*)?::\s*new\b)/.source),
        lookbehind: true,
        inside: className.inside
      },
      {
        // class names based on keyword
        // this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
        pattern: RegExp(/(\b(?:class|enum|extends|implements|instanceof|interface|new|record|throws)\s+)/.source + classNamePrefix + /[A-Z]\w*\b/.source),
        lookbehind: true,
        inside: className.inside
      }
    ],
    "keyword": keywords,
    "function": [
      Prism3.languages.clike.function,
      {
        pattern: /(::\s*)[a-z_]\w*/,
        lookbehind: true
      }
    ],
    "number": /\b0b[01][01_]*L?\b|\b0x(?:\.[\da-f_p+-]+|[\da-f_]+(?:\.[\da-f_p+-]+)?)\b|(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i,
    "operator": {
      pattern: /(^|[^.])(?:<<=?|>>>?=?|->|--|\+\+|&&|\|\||::|[?:~]|[-+*/%&|^!=<>]=?)/m,
      lookbehind: true
    },
    "constant": /\b[A-Z][A-Z_\d]+\b/
  });
  Prism3.languages.insertBefore("java", "string", {
    "triple-quoted-string": {
      // http://openjdk.java.net/jeps/355#Description
      pattern: /"""[ \t]*[\r\n](?:(?:"|"")?(?:\\.|[^"\\]))*"""/,
      greedy: true,
      alias: "string"
    },
    "char": {
      pattern: /'(?:\\.|[^'\\\r\n]){1,6}'/,
      greedy: true
    }
  });
  Prism3.languages.insertBefore("java", "class-name", {
    "annotation": {
      pattern: /(^|[^.])@\w+(?:\s*\.\s*\w+)*/,
      lookbehind: true,
      alias: "punctuation"
    },
    "generics": {
      pattern: /<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&))*>)*>)*>)*>/,
      inside: {
        "class-name": className,
        "keyword": keywords,
        "punctuation": /[<>(),.:]/,
        "operator": /[?&|]/
      }
    },
    "import": [
      {
        pattern: RegExp(/(\bimport\s+)/.source + classNamePrefix + /(?:[A-Z]\w*|\*)(?=\s*;)/.source),
        lookbehind: true,
        inside: {
          "namespace": className.inside.namespace,
          "punctuation": /\./,
          "operator": /\*/,
          "class-name": /\w+/
        }
      },
      {
        pattern: RegExp(/(\bimport\s+static\s+)/.source + classNamePrefix + /(?:\w+|\*)(?=\s*;)/.source),
        lookbehind: true,
        alias: "static",
        inside: {
          "namespace": className.inside.namespace,
          "static": /\b\w+$/,
          "punctuation": /\./,
          "operator": /\*/,
          "class-name": /\w+/
        }
      }
    ],
    "namespace": {
      pattern: RegExp(
        /(\b(?:exports|import(?:\s+static)?|module|open|opens|package|provides|requires|to|transitive|uses|with)\s+)(?!<keyword>)[a-z]\w*(?:\.[a-z]\w*)*\.?/.source.replace(/<keyword>/g, function() {
          return keywords.source;
        })
      ),
      lookbehind: true,
      inside: {
        "punctuation": /\./
      }
    }
  });
})(Prism);

// node_modules/prismjs/components/prism-markdown.js
(function(Prism3) {
  var inner = /(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/.source;
  function createInline(pattern) {
    pattern = pattern.replace(/<inner>/g, function() {
      return inner;
    });
    return RegExp(/((?:^|[^\\])(?:\\{2})*)/.source + "(?:" + pattern + ")");
  }
  var tableCell = /(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source;
  var tableRow = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g, function() {
    return tableCell;
  });
  var tableLine = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;
  Prism3.languages.markdown = Prism3.languages.extend("markup", {});
  Prism3.languages.insertBefore("markdown", "prolog", {
    "front-matter-block": {
      pattern: /(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,
      lookbehind: true,
      greedy: true,
      inside: {
        "punctuation": /^---|---$/,
        "front-matter": {
          pattern: /\S+(?:\s+\S+)*/,
          alias: ["yaml", "language-yaml"],
          inside: Prism3.languages.yaml
        }
      }
    },
    "blockquote": {
      // > ...
      pattern: /^>(?:[\t ]*>)*/m,
      alias: "punctuation"
    },
    "table": {
      pattern: RegExp("^" + tableRow + tableLine + "(?:" + tableRow + ")*", "m"),
      inside: {
        "table-data-rows": {
          pattern: RegExp("^(" + tableRow + tableLine + ")(?:" + tableRow + ")*$"),
          lookbehind: true,
          inside: {
            "table-data": {
              pattern: RegExp(tableCell),
              inside: Prism3.languages.markdown
            },
            "punctuation": /\|/
          }
        },
        "table-line": {
          pattern: RegExp("^(" + tableRow + ")" + tableLine + "$"),
          lookbehind: true,
          inside: {
            "punctuation": /\||:?-{3,}:?/
          }
        },
        "table-header-row": {
          pattern: RegExp("^" + tableRow + "$"),
          inside: {
            "table-header": {
              pattern: RegExp(tableCell),
              alias: "important",
              inside: Prism3.languages.markdown
            },
            "punctuation": /\|/
          }
        }
      }
    },
    "code": [
      {
        // Prefixed by 4 spaces or 1 tab and preceded by an empty line
        pattern: /((?:^|\n)[ \t]*\n|(?:^|\r\n?)[ \t]*\r\n?)(?: {4}|\t).+(?:(?:\n|\r\n?)(?: {4}|\t).+)*/,
        lookbehind: true,
        alias: "keyword"
      },
      {
        // ```optional language
        // code block
        // ```
        pattern: /^```[\s\S]*?^```$/m,
        greedy: true,
        inside: {
          "code-block": {
            pattern: /^(```.*(?:\n|\r\n?))[\s\S]+?(?=(?:\n|\r\n?)^```$)/m,
            lookbehind: true
          },
          "code-language": {
            pattern: /^(```).+/,
            lookbehind: true
          },
          "punctuation": /```/
        }
      }
    ],
    "title": [
      {
        // title 1
        // =======
        // title 2
        // -------
        pattern: /\S.*(?:\n|\r\n?)(?:==+|--+)(?=[ \t]*$)/m,
        alias: "important",
        inside: {
          punctuation: /==+$|--+$/
        }
      },
      {
        // # title 1
        // ###### title 6
        pattern: /(^\s*)#.+/m,
        lookbehind: true,
        alias: "important",
        inside: {
          punctuation: /^#+|#+$/
        }
      }
    ],
    "hr": {
      // ***
      // ---
      // * * *
      // -----------
      pattern: /(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,
      lookbehind: true,
      alias: "punctuation"
    },
    "list": {
      // * item
      // + item
      // - item
      // 1. item
      pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
      lookbehind: true,
      alias: "punctuation"
    },
    "url-reference": {
      // [id]: http://example.com "Optional title"
      // [id]: http://example.com 'Optional title'
      // [id]: http://example.com (Optional title)
      // [id]: <http://example.com> "Optional title"
      pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
      inside: {
        "variable": {
          pattern: /^(!?\[)[^\]]+/,
          lookbehind: true
        },
        "string": /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
        "punctuation": /^[\[\]!:]|[<>]/
      },
      alias: "url"
    },
    "bold": {
      // **strong**
      // __strong__
      // allow one nested instance of italic text using the same delimiter
      pattern: createInline(/\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\b|\*\*(?:(?!\*)<inner>|\*(?:(?!\*)<inner>)+\*)+\*\*/.source),
      lookbehind: true,
      greedy: true,
      inside: {
        "content": {
          pattern: /(^..)[\s\S]+(?=..$)/,
          lookbehind: true,
          inside: {}
          // see below
        },
        "punctuation": /\*\*|__/
      }
    },
    "italic": {
      // *em*
      // _em_
      // allow one nested instance of bold text using the same delimiter
      pattern: createInline(/\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\b|\*(?:(?!\*)<inner>|\*\*(?:(?!\*)<inner>)+\*\*)+\*/.source),
      lookbehind: true,
      greedy: true,
      inside: {
        "content": {
          pattern: /(^.)[\s\S]+(?=.$)/,
          lookbehind: true,
          inside: {}
          // see below
        },
        "punctuation": /[*_]/
      }
    },
    "strike": {
      // ~~strike through~~
      // ~strike~
      // eslint-disable-next-line regexp/strict
      pattern: createInline(/(~~?)(?:(?!~)<inner>)+\2/.source),
      lookbehind: true,
      greedy: true,
      inside: {
        "content": {
          pattern: /(^~~?)[\s\S]+(?=\1$)/,
          lookbehind: true,
          inside: {}
          // see below
        },
        "punctuation": /~~?/
      }
    },
    "code-snippet": {
      // `code`
      // ``code``
      pattern: /(^|[^\\`])(?:``[^`\r\n]+(?:`[^`\r\n]+)*``(?!`)|`[^`\r\n]+`(?!`))/,
      lookbehind: true,
      greedy: true,
      alias: ["code", "keyword"]
    },
    "url": {
      // [example](http://example.com "Optional title")
      // [example][id]
      // [example] [id]
      pattern: createInline(/!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)|[ \t]?\[(?:(?!\])<inner>)+\])/.source),
      lookbehind: true,
      greedy: true,
      inside: {
        "operator": /^!/,
        "content": {
          pattern: /(^\[)[^\]]+(?=\])/,
          lookbehind: true,
          inside: {}
          // see below
        },
        "variable": {
          pattern: /(^\][ \t]?\[)[^\]]+(?=\]$)/,
          lookbehind: true
        },
        "url": {
          pattern: /(^\]\()[^\s)]+/,
          lookbehind: true
        },
        "string": {
          pattern: /(^[ \t]+)"(?:\\.|[^"\\])*"(?=\)$)/,
          lookbehind: true
        }
      }
    }
  });
  ["url", "bold", "italic", "strike"].forEach(function(token) {
    ["url", "bold", "italic", "strike", "code-snippet"].forEach(function(inside) {
      if (token !== inside) {
        Prism3.languages.markdown[token].inside.content.inside[inside] = Prism3.languages.markdown[inside];
      }
    });
  });
  Prism3.hooks.add("after-tokenize", function(env) {
    if (env.language !== "markdown" && env.language !== "md") {
      return;
    }
    function walkTokens(tokens) {
      if (!tokens || typeof tokens === "string") {
        return;
      }
      for (var i = 0, l = tokens.length; i < l; i++) {
        var token = tokens[i];
        if (token.type !== "code") {
          walkTokens(token.content);
          continue;
        }
        var codeLang = token.content[1];
        var codeBlock = token.content[3];
        if (codeLang && codeBlock && codeLang.type === "code-language" && codeBlock.type === "code-block" && typeof codeLang.content === "string") {
          var lang = codeLang.content.replace(/\b#/g, "sharp").replace(/\b\+\+/g, "pp");
          lang = (/[a-z][\w-]*/i.exec(lang) || [""])[0].toLowerCase();
          var alias = "language-" + lang;
          if (!codeBlock.alias) {
            codeBlock.alias = [alias];
          } else if (typeof codeBlock.alias === "string") {
            codeBlock.alias = [codeBlock.alias, alias];
          } else {
            codeBlock.alias.push(alias);
          }
        }
      }
    }
    walkTokens(env.tokens);
  });
  Prism3.hooks.add("wrap", function(env) {
    if (env.type !== "code-block") {
      return;
    }
    var codeLang = "";
    for (var i = 0, l = env.classes.length; i < l; i++) {
      var cls = env.classes[i];
      var match = /language-(.+)/.exec(cls);
      if (match) {
        codeLang = match[1];
        break;
      }
    }
    var grammar = Prism3.languages[codeLang];
    if (!grammar) {
      if (codeLang && codeLang !== "none" && Prism3.plugins.autoloader) {
        var id = "md-" + (/* @__PURE__ */ new Date()).valueOf() + "-" + Math.floor(Math.random() * 1e16);
        env.attributes["id"] = id;
        Prism3.plugins.autoloader.loadLanguages(codeLang, function() {
          var ele = document.getElementById(id);
          if (ele) {
            ele.innerHTML = Prism3.highlight(ele.textContent, Prism3.languages[codeLang], codeLang);
          }
        });
      }
    } else {
      env.content = Prism3.highlight(textContent(env.content), grammar, codeLang);
    }
  });
  var tagPattern = RegExp(Prism3.languages.markup.tag.pattern.source, "gi");
  var KNOWN_ENTITY_NAMES = {
    "amp": "&",
    "lt": "<",
    "gt": ">",
    "quot": '"'
  };
  var fromCodePoint = String.fromCodePoint || String.fromCharCode;
  function textContent(html) {
    var text = html.replace(tagPattern, "");
    text = text.replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi, function(m, code) {
      code = code.toLowerCase();
      if (code[0] === "#") {
        var value;
        if (code[1] === "x") {
          value = parseInt(code.slice(2), 16);
        } else {
          value = Number(code.slice(1));
        }
        return fromCodePoint(value);
      } else {
        var known = KNOWN_ENTITY_NAMES[code];
        if (known) {
          return known;
        }
        return m;
      }
    });
    return text;
  }
  Prism3.languages.md = Prism3.languages.markdown;
})(Prism);

// node_modules/prismjs/components/prism-diff.js
(function(Prism3) {
  Prism3.languages.diff = {
    "coord": [
      // Match all kinds of coord lines (prefixed by "+++", "---" or "***").
      /^(?:\*{3}|-{3}|\+{3}).*$/m,
      // Match "@@ ... @@" coord lines in unified diff.
      /^@@.*@@$/m,
      // Match coord lines in normal diff (starts with a number).
      /^\d.*$/m
    ]
    // deleted, inserted, unchanged, diff
  };
  var PREFIXES = {
    "deleted-sign": "-",
    "deleted-arrow": "<",
    "inserted-sign": "+",
    "inserted-arrow": ">",
    "unchanged": " ",
    "diff": "!"
  };
  Object.keys(PREFIXES).forEach(function(name) {
    var prefix = PREFIXES[name];
    var alias = [];
    if (!/^\w+$/.test(name)) {
      alias.push(/\w+/.exec(name)[0]);
    }
    if (name === "diff") {
      alias.push("bold");
    }
    Prism3.languages.diff[name] = {
      pattern: RegExp("^(?:[" + prefix + "].*(?:\r\n?|\n|(?![\\s\\S])))+", "m"),
      alias,
      inside: {
        "line": {
          pattern: /(.)(?=[\s\S]).*(?:\r\n?|\n)?/,
          lookbehind: true
        },
        "prefix": {
          pattern: /[\s\S]/,
          alias: /\w+/.exec(name)[0]
        }
      }
    };
  });
  Object.defineProperty(Prism3.languages.diff, "PREFIXES", {
    value: PREFIXES
  });
})(Prism);

// node_modules/prismjs/components/prism-mermaid.js
Prism.languages.mermaid = {
  "comment": {
    pattern: /%%.*/,
    greedy: true
  },
  "style": {
    pattern: /^([ \t]*(?:classDef|linkStyle|style)[ \t]+[\w$-]+[ \t]+)\w.*[^\s;]/m,
    lookbehind: true,
    inside: {
      "property": /\b\w[\w-]*(?=[ \t]*:)/,
      "operator": /:/,
      "punctuation": /,/
    }
  },
  "inter-arrow-label": {
    pattern: /([^<>ox.=-])(?:-[-.]|==)(?![<>ox.=-])[ \t]*(?:"[^"\r\n]*"|[^\s".=-](?:[^\r\n.=-]*[^\s.=-])?)[ \t]*(?:\.+->?|--+[->]|==+[=>])(?![<>ox.=-])/,
    lookbehind: true,
    greedy: true,
    inside: {
      "arrow": {
        pattern: /(?:\.+->?|--+[->]|==+[=>])$/,
        alias: "operator"
      },
      "label": {
        pattern: /^([\s\S]{2}[ \t]*)\S(?:[\s\S]*\S)?/,
        lookbehind: true,
        alias: "property"
      },
      "arrow-head": {
        pattern: /^\S+/,
        alias: ["arrow", "operator"]
      }
    }
  },
  "arrow": [
    // This might look complex but it really isn't.
    // There are many possible arrows (see tests) and it's impossible to fit all of them into one pattern. The
    // problem is that we only have one lookbehind per pattern. However, we cannot disallow too many arrow
    // characters in the one lookbehind because that would create too many false negatives. So we have to split the
    // arrows into different patterns.
    {
      // ER diagram
      pattern: /(^|[^{}|o.-])[|}][|o](?:--|\.\.)[|o][|{](?![{}|o.-])/,
      lookbehind: true,
      alias: "operator"
    },
    {
      // flow chart
      // (?:==+|--+|-\.*-)
      pattern: /(^|[^<>ox.=-])(?:[<ox](?:==+|--+|-\.*-)[>ox]?|(?:==+|--+|-\.*-)[>ox]|===+|---+|-\.+-)(?![<>ox.=-])/,
      lookbehind: true,
      alias: "operator"
    },
    {
      // sequence diagram
      pattern: /(^|[^<>()x-])(?:--?(?:>>|[x>)])(?![<>()x])|(?:<<|[x<(])--?(?!-))/,
      lookbehind: true,
      alias: "operator"
    },
    {
      // class diagram
      pattern: /(^|[^<>|*o.-])(?:[*o]--|--[*o]|<\|?(?:--|\.\.)|(?:--|\.\.)\|?>|--|\.\.)(?![<>|*o.-])/,
      lookbehind: true,
      alias: "operator"
    }
  ],
  "label": {
    pattern: /(^|[^|<])\|(?:[^\r\n"|]|"[^"\r\n]*")+\|/,
    lookbehind: true,
    greedy: true,
    alias: "property"
  },
  "text": {
    pattern: /(?:[(\[{]+|\b>)(?:[^\r\n"()\[\]{}]|"[^"\r\n]*")+(?:[)\]}]+|>)/,
    alias: "string"
  },
  "string": {
    pattern: /"[^"\r\n]*"/,
    greedy: true
  },
  "annotation": {
    pattern: /<<(?:abstract|choice|enumeration|fork|interface|join|service)>>|\[\[(?:choice|fork|join)\]\]/i,
    alias: "important"
  },
  "keyword": [
    // This language has both case-sensitive and case-insensitive keywords
    {
      pattern: /(^[ \t]*)(?:action|callback|class|classDef|classDiagram|click|direction|erDiagram|flowchart|gantt|gitGraph|graph|journey|link|linkStyle|pie|requirementDiagram|sequenceDiagram|stateDiagram|stateDiagram-v2|style|subgraph)(?![\w$-])/m,
      lookbehind: true,
      greedy: true
    },
    {
      pattern: /(^[ \t]*)(?:activate|alt|and|as|autonumber|deactivate|else|end(?:[ \t]+note)?|loop|opt|par|participant|rect|state|note[ \t]+(?:over|(?:left|right)[ \t]+of))(?![\w$-])/im,
      lookbehind: true,
      greedy: true
    }
  ],
  "entity": /#[a-z0-9]+;/,
  "operator": {
    pattern: /(\w[ \t]*)&(?=[ \t]*\w)|:::|:/,
    lookbehind: true
  },
  "punctuation": /[(){};]/
};

// packages/create/editor/utils/normalize-tokens.js
var newlineRe = /\r\n|\r|\n/;
var normalizeEmptyLines = (line) => {
  if (line.length === 0) {
    line.push({
      types: ["plain"],
      content: "\n",
      empty: true
    });
  } else if (line.length === 1 && line[0].content === "") {
    line[0].content = "\n";
    line[0].empty = true;
  }
};
var appendTypes = (types, add) => {
  const typesSize = types.length;
  if (typesSize > 0 && types[typesSize - 1] === add) {
    return types;
  }
  return types.concat(add);
};
var normalizeTokens = (tokens) => {
  const typeArrStack = [[]];
  const tokenArrStack = [tokens];
  const tokenArrIndexStack = [0];
  const tokenArrSizeStack = [tokens.length];
  let i = 0;
  let stackIndex = 0;
  let currentLine = [];
  const acc = [currentLine];
  while (stackIndex > -1) {
    while ((i = tokenArrIndexStack[stackIndex]++) < tokenArrSizeStack[stackIndex]) {
      let content;
      let types = typeArrStack[stackIndex];
      const tokenArr = tokenArrStack[stackIndex];
      const token = tokenArr[i];
      if (typeof token === "string") {
        types = stackIndex > 0 ? types : ["plain"];
        content = token;
      } else {
        types = appendTypes(types, token.type);
        if (token.alias) {
          types = appendTypes(types, token.alias);
        }
        content = token.content;
      }
      if (typeof content !== "string") {
        stackIndex++;
        typeArrStack.push(types);
        tokenArrStack.push(content);
        tokenArrIndexStack.push(0);
        tokenArrSizeStack.push(content.length);
        continue;
      }
      const splitByNewlines = content.split(newlineRe);
      const newlineCount = splitByNewlines.length;
      currentLine.push({ types, content: splitByNewlines[0] });
      for (let i2 = 1; i2 < newlineCount; i2++) {
        normalizeEmptyLines(currentLine);
        acc.push(currentLine = []);
        currentLine.push({ types, content: splitByNewlines[i2] });
      }
    }
    stackIndex--;
    typeArrStack.pop();
    tokenArrStack.pop();
    tokenArrIndexStack.pop();
    tokenArrSizeStack.pop();
  }
  normalizeEmptyLines(currentLine);
  return acc;
};

// packages/create/editor/syntaxHighlighting.tsx
var mergeMaps = (...maps) => {
  const merged = /* @__PURE__ */ new Map();
  for (const m of maps) {
    for (const [k, v] of m) {
      merged.set(k, v);
    }
  }
  return merged;
};
var getChildNodeToDecorations = ([block, blockPath], prismLib) => {
  const nodeToDecorations = /* @__PURE__ */ new Map();
  if (!isCustomElement(block) || block.type !== CodeBlockType || !Array.isArray(block.children) || block.preview === "true") {
    return nodeToDecorations;
  }
  const codeBlock = block;
  const codeLines = codeBlock.children.filter(
    (child) => isCustomElement(child) && child.type === CodeLineType
  );
  if (codeLines.length === 0) return nodeToDecorations;
  const language = (codeBlock.language || "plain").toLowerCase();
  const grammar = prismLib.languages[language] || prismLib.languages.plain || {};
  let text = "";
  try {
    text = codeLines.map((line) => Node.string(line)).join("\n");
  } catch (e) {
    console.error("\u4ECE\u4EE3\u7801\u884C\u63D0\u53D6\u6587\u672C\u65F6\u51FA\u9519:", e);
    return nodeToDecorations;
  }
  let tokens;
  try {
    tokens = prismLib.tokenize(text, grammar);
  } catch (e) {
    console.error(`Prism \u5728\u5904\u7406 ${language} \u65F6\u51FA\u9519:`, e);
    return nodeToDecorations;
  }
  const normalized = normalizeTokens(tokens);
  normalized.forEach((lineTokens, lineIndex) => {
    if (lineIndex >= codeLines.length) return;
    const element = codeLines[lineIndex];
    nodeToDecorations.set(element, []);
    let offset2 = 0;
    for (const token of lineTokens) {
      const content = typeof token.content === "string" ? token.content : "";
      const length = content.length;
      if (length === 0) continue;
      const start = offset2;
      const end = start + length;
      const path = [...blockPath, lineIndex, 0];
      const types = (token.types || []).filter((t) => t !== "text");
      const range = {
        anchor: { path, offset: start },
        focus: { path, offset: end },
        token: true,
        ...Object.fromEntries(types.map((t) => [t, true]))
      };
      nodeToDecorations.get(element).push(range);
      offset2 = end;
    }
  });
  return nodeToDecorations;
};
var useDecorate = (editor) => {
  return (0, import_react.useCallback)(
    ([node]) => {
      const decorations = editor.nodeToDecorations;
      if (isCustomElement(node) && node.type === CodeLineType && decorations?.has(node)) {
        return decorations.get(node);
      }
      return [];
    },
    [editor]
  );
};
var SetNodeToDecorations = ({
  highlightEnabled,
  docVersion
}) => {
  const editor = useSlate();
  const nodeToDecorations = (0, import_react.useMemo)(() => {
    if (!highlightEnabled) {
      return /* @__PURE__ */ new Map();
    }
    const codeBlockEntries = Array.from(
      Editor.nodes(editor, {
        at: [],
        match: (n) => isCustomElement(n) && n.type === CodeBlockType && n.preview !== "true"
      })
    );
    const decorationMaps = codeBlockEntries.map(
      (entry) => getChildNodeToDecorations(entry, prismRuntime_default)
    );
    return mergeMaps(...decorationMaps);
  }, [editor, docVersion, highlightEnabled]);
  editor.nodeToDecorations = nodeToDecorations;
  return null;
};

// packages/create/editor/useOnKeyDown.tsx
var import_react2 = __toESM(require_react(), 1);
var HOTKEYS2 = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+u": "underline"
};
var HEADING_TYPES2 = /* @__PURE__ */ new Set([
  "heading-one",
  "heading-two",
  "heading-three",
  "heading-four",
  "heading-five",
  "heading-six"
]);
var isHotkey2 = (hotkey, event) => {
  const hotkeyParts = hotkey.split("+");
  const key = hotkeyParts.pop();
  const isMod = hotkeyParts.includes("mod") && (event.metaKey || event.ctrlKey);
  const isShift = hotkeyParts.includes("shift") && event.shiftKey;
  return isMod && event.key.toLowerCase() === key;
};
var useOnKeyDown = (editor) => {
  return (0, import_react2.useCallback)(
    (e) => {
      const tableEditor = editor;
      if (e.key === "Tab" && !isSelectionInTable(tableEditor)) {
        const { selection } = editor;
        if (selection) {
          const listItemEntry = Editor.above(editor, {
            at: selection,
            match: (n) => isCustomElement(n) && n.type === "list-item"
          });
          let didHandle = false;
          if (listItemEntry) {
            const [listItemNode, listItemPath] = listItemEntry;
            const currentIndent = Math.max(0, Number(listItemNode.indent || 0));
            if (e.shiftKey) {
              const nextIndent = Math.max(0, currentIndent - 1);
              if (nextIndent !== currentIndent) {
                Transforms.setNodes(
                  editor,
                  { indent: nextIndent || void 0 },
                  { at: listItemPath }
                );
              }
              didHandle = true;
            } else {
              const index = listItemPath[listItemPath.length - 1];
              if (index > 0) {
                const previousSibling = Node.get(
                  editor,
                  Path.previous(listItemPath)
                );
                const previousIndent = Math.max(
                  0,
                  Number(previousSibling?.indent || 0)
                );
                const nextIndent = Math.min(currentIndent + 1, previousIndent + 1);
                if (nextIndent !== currentIndent) {
                  Transforms.setNodes(
                    editor,
                    { indent: nextIndent },
                    { at: listItemPath }
                  );
                }
                didHandle = true;
              }
            }
          }
          if (didHandle) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }
      if (e.key === "Enter") {
        const { selection } = editor;
        if (selection && Range.isCollapsed(selection)) {
          const blockEntry = Editor.above(editor, {
            at: selection,
            match: (n) => isCustomElement(n) && Editor.isBlock(editor, n)
          });
          if (blockEntry) {
            const [blockNode, blockPath] = blockEntry;
            if (isCustomElement(blockNode) && HEADING_TYPES2.has(blockNode.type) && Editor.isEnd(editor, selection.anchor, blockPath)) {
              e.preventDefault();
              const nextPath = Path.next(blockPath);
              Transforms.insertNodes(
                editor,
                { type: "paragraph", children: [{ text: "" }] },
                { at: nextPath }
              );
              Transforms.select(editor, Editor.start(editor, nextPath));
              return;
            }
          }
          const listItemEntry = Editor.above(editor, {
            at: selection,
            match: (n) => isCustomElement(n) && n.type === "list-item"
          });
          if (listItemEntry) {
            e.preventDefault();
            const [listItemNode, listItemPath] = listItemEntry;
            const isTaskItem = listItemNode.checked !== void 0;
            const isEmptyItem = Node.string(listItemNode).trim() === "";
            if (isEmptyItem) {
              Transforms.setNodes(
                editor,
                { type: "paragraph" },
                { at: listItemPath }
              );
              Transforms.unsetNodes(editor, "checked", { at: listItemPath });
              Transforms.unwrapNodes(editor, {
                at: listItemPath,
                match: (n) => isCustomElement(n) && n.type === "list",
                split: true
              });
              return;
            }
            const nextItem = {
              type: "list-item",
              ...isTaskItem ? { checked: false } : {},
              indent: listItemNode.indent,
              children: [{ text: "" }]
            };
            const insertPath = Path.next(listItemPath);
            Transforms.insertNodes(editor, nextItem, { at: insertPath });
            Transforms.select(editor, Editor.start(editor, insertPath));
            return;
          }
        }
      }
      if (isSelectionInTable(tableEditor)) {
        if (e.key === "Tab") {
          e.preventDefault();
          e.shiftKey ? moveToPreviousCell(tableEditor) : moveToNextCell(tableEditor);
          return;
        }
        const { selection } = editor;
        if (selection && Range.isCollapsed(selection)) {
          const cellEntry = Array.from(
            Editor.nodes(editor, {
              match: (n) => isCustomElement(n) && n.type === "table-cell",
              at: selection
            })
          )[0];
          if (cellEntry) {
            const [, cellPath] = cellEntry;
            const atStart = Editor.isStart(editor, selection.anchor, cellPath);
            const atEnd = Editor.isEnd(editor, selection.anchor, cellPath);
            switch (e.key) {
              case "ArrowUp":
                if (atStart) {
                  e.preventDefault();
                  moveToUpperCell(tableEditor);
                }
                return;
              case "ArrowDown":
                if (atEnd) {
                  e.preventDefault();
                  moveToLowerCell(tableEditor);
                }
                return;
              case "ArrowLeft":
                if (atStart) {
                  e.preventDefault();
                  moveToLeftCell(tableEditor);
                }
                return;
              case "ArrowRight":
                if (atEnd) {
                  e.preventDefault();
                  moveToRightCell(tableEditor);
                }
                return;
            }
          }
        }
      }
      for (const hotkey in HOTKEYS2) {
        if (isHotkey2(hotkey, e)) {
          e.preventDefault();
          toggleMark(editor, HOTKEYS2[hotkey]);
          return;
        }
      }
      if (e.key === "Tab" && !isSelectionInTable(tableEditor)) {
        e.preventDefault();
        const codeBlockEntry = Editor.above(editor, {
          match: (n) => isCustomElement(n) && n.type === "code-block"
        });
        if (codeBlockEntry) {
          Editor.insertText(editor, "  ");
        }
      }
    },
    [editor]
  );
};

// packages/create/editor/MentionList.tsx
var import_react3 = __toESM(require_react(), 1);
var import_react_dom = __toESM(require_react_dom(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var MentionList = ({
  target,
  options,
  selectedIndex,
  onSelect,
  category,
  onCategoryChange
}) => {
  const theme = useAppSelector(selectTheme);
  const editor = useSlate();
  const listRef = (0, import_react3.useRef)(null);
  const { x, y, strategy, refs, update } = useFloating({
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(5),
      flip(),
      shift({ padding: 5 }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(availableHeight, 300)}px`
          });
        }
      })
    ]
  });
  (0, import_react3.useEffect)(() => {
    if (target) {
      const domRange = ReactEditor.toDOMRange(editor, target);
      const rect = domRange.getBoundingClientRect();
      refs.setReference({
        getBoundingClientRect: () => rect
      });
      update();
    }
  }, [target, editor, refs, update]);
  (0, import_react3.useEffect)(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex];
      if (selectedEl && selectedEl.scrollIntoView) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);
  if (!target) {
    return null;
  }
  const renderIcon = (type) => {
    switch (type) {
      case "page":
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuFile, { size: 14, "aria-hidden": "true" });
      case "space":
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLayoutGrid, { size: 14, "aria-hidden": "true" });
      case "agent":
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 14, "aria-hidden": "true" });
      case "tool":
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuWrench, { size: 14, "aria-hidden": "true" });
      default:
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuFile, { size: 14, "aria-hidden": "true" });
    }
  };
  const categories = [
    { id: "all", label: "All" },
    { id: "space", label: "Spaces" },
    { id: "page", label: "Pages" },
    { id: "agent", label: "Agents" },
    { id: "tool", label: "Tools" }
  ];
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        ref: refs.setFloating,
        style: {
          position: strategy,
          top: y ?? 0,
          left: x ?? 0,
          zIndex: 1e4,
          backgroundColor: theme.backgroundSecondary,
          borderRadius: "var(--radius-md)",
          boxShadow: `0 4px 12px ${theme.shadowMedium}`,
          display: "flex",
          flexDirection: "column",
          width: "280px",
          border: `1px solid ${theme.border}`,
          overflow: "hidden"
        },
        "data-test-id": "mention-list",
        onMouseDown: (e) => e.preventDefault(),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
            display: "flex",
            borderBottom: `1px solid ${theme.border}`,
            backgroundColor: theme.backgroundTertiary,
            padding: "4px 4px 0 4px",
            gap: "4px"
          }, children: categories.map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                onCategoryChange && onCategoryChange(cat.id);
              },
              "aria-pressed": category === cat.id,
              style: {
                margin: 0,
                padding: "6px 12px",
                fontSize: "var(--fontSize-sm)",
                fontFamily: "inherit",
                cursor: "pointer",
                borderTopLeftRadius: "var(--radius-md)",
                borderTopRightRadius: "var(--radius-md)",
                backgroundColor: category === cat.id ? theme.backgroundSecondary : "transparent",
                color: category === cat.id ? theme.text : theme.textSecondary,
                fontWeight: category === cat.id ? 600 : 400,
                border: "none",
                borderBottom: category === cat.id ? `2px solid ${theme.primary}` : "2px solid transparent",
                transition: "all 0.1s ease",
                appearance: "none"
              },
              children: cat.label
            },
            cat.id
          )) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              ref: listRef,
              style: {
                overflowY: "auto",
                maxHeight: "260px",
                padding: "4px"
              },
              children: options.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "12px", color: theme.textTertiary, fontSize: "var(--fontSize-sm)", textAlign: "center" }, children: "No results found" }) : options.map((option, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "button",
                {
                  type: "button",
                  onClick: () => onSelect(option),
                  style: {
                    width: "100%",
                    margin: 0,
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    backgroundColor: index === selectedIndex ? theme.backgroundTertiary : "transparent",
                    color: index === selectedIndex ? theme.text : theme.textSecondary,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background-color 0.1s ease",
                    font: "inherit",
                    textAlign: "left",
                    appearance: "none"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { display: "flex", alignItems: "center", color: theme.textTertiary }, children: renderIcon(option.type) }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "var(--fontSize-base)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: option.label }),
                      option.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "var(--fontSize-sm)", color: theme.textTertiary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: option.description })
                    ] })
                  ]
                },
                `${option.type}-${option.id}`
              ))
            }
          )
        ]
      }
    ),
    document.body
  );
};

// packages/create/editor/theme/prism/default.ts
var defaultCss = `
/**
 * prism.js default theme for JavaScript, CSS and HTML
 * Based on dabblet (http://dabblet.com)
 * @author Lea Verou
 */

code[class*="language-"],
pre[class*="language-"] {
    color: black;
    background: none;
    text-shadow: 0 1px white;
    font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    font-size: 1em;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    word-wrap: normal;
    line-height: 1.5;

    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;

    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;
}

pre[class*="language-"]::-moz-selection, pre[class*="language-"] ::-moz-selection,
code[class*="language-"]::-moz-selection, code[class*="language-"] ::-moz-selection {
    text-shadow: none;
    background: #b3d4fc;
}

pre[class*="language-"]::selection, pre[class*="language-"] ::selection,
code[class*="language-"]::selection, code[class*="language-"] ::selection {
    text-shadow: none;
    background: #b3d4fc;
}

@media print {
    code[class*="language-"],
    pre[class*="language-"] {
        text-shadow: none;
    }
}

/* Code blocks */
pre[class*="language-"] {
    padding: 1em;
    margin: .5em 0;
    overflow: auto;
}

:not(pre) > code[class*="language-"],
pre[class*="language-"] {
    background: #f5f2f0;
}

/* Inline code */
:not(pre) > code[class*="language-"] {
    padding: .1em;
    border-radius: .3em;
    white-space: normal;
}

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
    color: slategray;
}

.token.punctuation {
    color: #999;
}

.token.namespace {
    opacity: .7;
}

.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted {
    color: #905;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
    color: #690;
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
    color: #9a6e3a;
    /* This background color was intended by the author of this theme. */
    background: hsla(0, 0%, 100%, .5);
}

.token.atrule,
.token.attr-value,
.token.keyword {
    color: #07a;
}

.token.function,
.token.class-name {
    color: #DD4A68;
}

.token.regex,
.token.important,
.token.variable {
    color: #e90;
}

.token.important,
.token.bold {
    font-weight: bold;
}
.token.italic {
    font-style: italic;
}

.token.entity {
    cursor: help;
}
`;

// packages/create/editor/theme/prism/okaidia.ts
var okaidia = `
/**
 * okaidia theme for JavaScript, CSS and HTML
 * Loosely based on Monokai textmate theme by http://www.monokai.nl/
 * @author ocodia
 */

code[class*="language-"],
pre[class*="language-"] {
	color: #f8f8f2;
	text-shadow: 0 1px rgba(0, 0, 0, 0.3);
	font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
	direction: ltr;
	text-align: left;
	white-space: pre;
	word-spacing: normal;
	word-break: normal;
	word-wrap: normal;
	line-height: 1.5;

	-moz-tab-size: 4;
	-o-tab-size: 4;
	tab-size: 4;

	-webkit-hyphens: none;
	-moz-hyphens: none;
	-ms-hyphens: none;
	hyphens: none;
}

/* Code blocks */
pre[class*="language-"] {
	padding: 1em;
	margin: .5em 0;
	overflow: auto;
	border-radius: 0.3em;
}

:not(pre) > code[class*="language-"],
pre[class*="language-"] {
	background: #272822;
}

/* Inline code */
:not(pre) > code[class*="language-"] {
	padding: .1em;
	border-radius: .3em;
	white-space: normal;
}

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
	color: slategray;
}

.token.punctuation {
	color: #f8f8f2;
}

.namespace {
	opacity: .7;
}

.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
	color: #f92672;
}

.token.boolean,
.token.number {
	color: #ae81ff;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
	color: #a6e22e;
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string,
.token.variable {
	color: #f8f8f2;
}

.token.atrule,
.token.attr-value,
.token.function {
	color: #e6db74;
}

.token.keyword {
	color: #66d9ef;
}

.token.regex,
.token.important {
	color: #fd971f;
}

.token.important,
.token.bold {
	font-weight: bold;
}
.token.italic {
	font-style: italic;
}

.token.entity {
	cursor: help;
}

pre.line-numbers {
	position: relative;
	padding-left: 3.8em;
	counter-reset: linenumber;
}

pre.line-numbers > code {
	position: relative;
}

.line-numbers .line-numbers-rows {
	position: absolute;
	pointer-events: none;
	top: 0;
	font-size: 100%;
	left: -3.8em;
	width: 3em; /* works for line-numbers below 1000 lines */
	letter-spacing: -1px;
	border-right: 1px solid #999;

	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;

}

.line-numbers-rows > span {
	pointer-events: none;
	display: block;
	counter-increment: linenumber;
}

.line-numbers-rows > span:before {
	content: counter(linenumber);
	color: #999;
	display: block;
	padding-right: 0.8em;
	text-align: right;
}

div.prism-show-language {
	position: relative;
}

div.prism-show-language > div.prism-show-language-label[data-language] {
	color: black;
	background-color: #CFCFCF;
	display: inline-block;
	position: absolute;
	bottom: auto;
	left: auto;
	top: 0;
	right: 0;
	width: auto;
	height: auto;
	font-size: 0.9em;
	border-radius: 0 0 0 5px;
	padding: 0 0.5em;
	text-shadow: none;
	z-index: 1;
	-webkit-box-shadow: none;
	-moz-box-shadow: none;
	box-shadow: none;
	-webkit-transform: none;
	-moz-transform: none;
	-ms-transform: none;
	-o-transform: none;
	transform: none;
}
`;

// packages/create/editor/theme/prism/githubLight.ts
var githubLight = `
/**
 * GitHub-like light theme for Prism.js
 * \u53C2\u8003 GitHub \u4EE3\u7801\u914D\u8272\uFF08\u6D45\u8272\uFF09
 */

code[class*="language-"],
pre[class*="language-"] {
  color: #24292e;
  background: none;
  text-shadow: none;
  font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 1em;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  line-height: 1.5;

  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;

  -webkit-hyphens: none;
  -moz-hyphens: none;
  -ms-hyphens: none;
  hyphens: none;
}

/* Code blocks */
pre[class*="language-"] {
  margin: .5em 0;
  padding: 1em;
  overflow: auto;
  border-radius: 6px;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
}

/* Inline code */
:not(pre) > code[class*="language-"] {
  padding: .2em .4em;
  border-radius: 4px;
  background-color: rgba(175, 184, 193, 0.2);
  color: #24292f;
  white-space: normal;
}

/* Selection */
pre[class*="language-"] ::selection,
code[class*="language-"] ::selection {
  background: rgba(180, 213, 255, 0.7);
}

pre[class*="language-"]::-moz-selection,
code[class*="language-"]::-moz-selection {
  background: rgba(180, 213, 255, 0.7);
}

/* Tokens */

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
 : #6a737d;
}

.token.punctuation {
  color: #24292e;
}

.namespace {
  opacity: .7;
}

.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: #d73a49; /* \u7EA2 */
}

.token.boolean,
.token.number {
  color: #005cc5; /* \u84DD */
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #032f62; /* \u6DF1\u84DD/\u5B57\u7B26\u4E32 */
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  color: #d73a49;
}

.token.atrule,
.token.attr-value,
.token.keyword {
  color: #d73a49;
}

.token.function,
.token.class-name {
  color: #6f42c1; /* \u7D2B\u8272\u51FD\u6570/\u7C7B\u540D */
}

.token.regex,
.token.important,
.token.variable {
  color: #e36209; /* \u6A59\u8272 */
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.entity {
  cursor: help;
}
`;

// packages/create/editor/theme/prism/githubDark.ts
var githubDark = `
/**
 * GitHub-like dark theme for Prism.js
 * \u53C2\u8003 GitHub Dark \u4EE3\u7801\u914D\u8272
 */

code[class*="language-"],
pre[class*="language-"] {
  color: #c9d1d9;
  background: none;
  text-shadow: none;
  font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 1em;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  line-height: 1.5;

  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;

  -webkit-hyphens: none;
  -moz-hyphens: none;
  -ms-hyphens: none;
  hyphens: none;
}

/* Code blocks */
pre[class*="language-"] {
  margin: .5em 0;
  padding: 1em;
  overflow: auto;
  border-radius: 6px;
  background: #0d1117;
  border: 1px solid #30363d;
}

/* Inline code */
:not(pre) > code[class*="language-"] {
  padding: .2em .4em;
  border-radius: 4px;
  background-color: rgba(110, 118, 129, 0.4);
  color: #e6edf3;
  white-space: normal;
}

/* Selection */
pre[class*="language-"] ::selection,
code[class*="language-"] ::selection {
  background: rgba(56, 139, 253, 0.4);
}

pre[class*="language-"]::-moz-selection,
code[class*="language-"]::-moz-selection {
  background: rgba(56, 139, 253, 0.4);
}

/* Tokens */

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #8b949e;
}

.token.punctuation {
  color: #c9d1d9;
}

.namespace {
  opacity: .7;
}

.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: #ff7b72; /* \u7EA2/\u6807\u7B7E\u7B49 */
}

.token.boolean,
.token.number {
  color: #f2cc60; /* \u9EC4/\u6570\u503C */
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #a5d6ff; /* \u6D45\u84DD/\u5B57\u7B26\u4E32 */
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  color: #f0883e;
}

.token.atrule,
.token.attr-value,
.token.keyword {
  color: #ff7b72; /* \u5173\u952E\u5B57\u7EA2\u6A59 */
}

.token.function,
.token.class-name {
  color: #d2a8ff; /* \u7D2B */
}

.token.regex,
.token.important,
.token.variable {
  color: #f2cc60; /* \u9EC4 */
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.entity {
  cursor: help;
}
`;

// packages/create/editor/theme/prism/index.ts
var PRISM_CODE_THEMES = {
  default: defaultCss,
  okaidia,
  "github-light": githubLight,
  "github-dark": githubDark
  // 如果之前老代码里已经使用 "github-dark" 映射到 okaidia，
  // 你也可以保留一条兼容映射：
  //
  // "legacy-github-dark": okaidia,
};
var getPrismThemeCss = (name) => PRISM_CODE_THEMES[name ?? "default"] ?? PRISM_CODE_THEMES["default"];

// packages/render/page/EditorPlaceHolder.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var PlaceHolder = () => {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u6B22\u8FCE\u8BB0\u5F55\u4F60\u7684\u7075\u611F\u4E0E\u60F3\u6CD5" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u{1F44B} \u5728\u8FD9\u91CC\u8BB0\u5F55\u4F60\u7684\u7075\u611F\u4E0E\u60F3\u6CD5\u5427\uFF01" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u2728 \u8BD5\u8BD5\u4EE5\u4E0B\u5FEB\u6377\u65B9\u5F0F\uFF0C\u9AD8\u6548\u7F16\u8F91\u4F60\u7684\u5185\u5BB9\uFF1A" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
      "\u8F93\u5165 ",
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { children: "#" }),
      " \u7136\u540E\u6309\u7A7A\u683C\u952E\uFF1A\u521B\u5EFA\u5927\u6807\u9898"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
      "\u8F93\u5165 ",
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { children: "##" }),
      " \u7136\u540E\u6309\u7A7A\u683C\u952E\uFF1A\u521B\u5EFA\u4E2D\u6807\u9898"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
      "\u8F93\u5165 ",
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { children: "*" }),
      " \u7136\u540E\u6309\u7A7A\u683C\u952E\uFF1A\u521B\u5EFA\u65E0\u5E8F\u5217\u8868"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
      "\u8F93\u5165 ",
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { children: "1." }),
      " \u7136\u540E\u6309\u7A7A\u683C\u952E\uFF1A\u521B\u5EFA\u6709\u5E8F\u5217\u8868"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u{1F4A1} \u66F4\u591A\u529F\u80FD\u7B49\u4F60\u63A2\u7D22\uFF0C\u5FEB\u5F00\u59CB\u5427\uFF01" })
  ] });
};

// packages/create/editor/renderLeaf.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
var LEAF_MARK_STYLES = {
  bold: {
    fontWeight: 600,
    color: "var(--text)"
  },
  italic: {
    fontStyle: "italic",
    color: "var(--textSecondary)"
  },
  underline: {
    textDecorationThickness: "0.1em",
    textUnderlineOffset: "0.2em",
    textDecorationColor: "var(--primary)",
    color: "var(--text)"
  },
  strikethrough: {
    textDecorationThickness: "0.1em",
    textDecorationColor: "var(--textTertiary)",
    opacity: 0.65,
    color: "var(--textTertiary)"
  },
  subscript: {
    fontSize: "0.75em",
    color: "var(--textSecondary)"
  },
  superscript: {
    fontSize: "0.75em",
    color: "var(--textSecondary)"
  },
  highlight: {
    backgroundColor: "var(--primaryLight)",
    color: "var(--text)",
    padding: "var(--space-0) var(--space-1)",
    borderRadius: "var(--space-1)",
    boxShadow: "0 0 0 1px var(--primary)"
  }
};
var INLINE_CODE_STYLE = {
  backgroundColor: "var(--backgroundSecondary)",
  color: "var(--primary)",
  padding: "var(--space-1) var(--space-2)",
  borderRadius: "var(--space-1)",
  fontFamily: 'var(--font-mono, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
  fontSize: "0.85em",
  border: "1px solid var(--border)",
  wordBreak: "break-word",
  lineHeight: "var(--leading-tight)",
  fontWeight: 500
};
var MARK_APPLY_ORDER = [
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "subscript",
  "superscript",
  "highlight"
];
var PRISM_META_KEYS = /* @__PURE__ */ new Set([
  "text",
  "token",
  "types",
  "type",
  "prismType",
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "subscript",
  "superscript",
  "highlight",
  "code"
]);
var wrapWithMark = (mark, node) => {
  const style = LEAF_MARK_STYLES[mark];
  switch (mark) {
    case "bold":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { style, children: node });
    case "italic":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("em", { style, children: node });
    case "underline":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("u", { style, children: node });
    case "strikethrough":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("del", { style, children: node });
    case "subscript":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("sub", { style, children: node });
    case "superscript":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("sup", { style, children: node });
    case "highlight":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("mark", { style, children: node });
    default:
      return node;
  }
};
var getPrismClassName = (leaf) => {
  if (!leaf.token) return void 0;
  const explicitTypesFromArray = Array.isArray(leaf.types) ? leaf.types : [];
  const explicitSingleType = typeof leaf.prismType === "string" ? [leaf.prismType] : typeof leaf.type === "string" ? [leaf.type] : [];
  const explicitTypes = [...explicitTypesFromArray, ...explicitSingleType].flatMap(
    (t) => t ? [String(t)] : []
  );
  const booleanTypes = Object.keys(leaf).filter(
    (key) => !PRISM_META_KEYS.has(key) && leaf[key] === true
    // 只要布尔 true 的标记
  );
  const allTypes = [
    ...explicitTypes,
    ...booleanTypes.filter((t) => !explicitTypes.includes(t))
  ];
  if (allTypes.length === 0) {
    return "token";
  }
  return ["token", ...allTypes].join(" ");
};
var TextLeaf = ({ attributes, children, leaf }) => {
  const { code, token, ...rest } = leaf;
  if (code && !token) {
    const baseClassName = attributes?.className;
    const mergedClassName = [baseClassName, "inline-code"].filter(Boolean).join(" ") || void 0;
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "code",
      {
        ...attributes,
        className: mergedClassName,
        style: INLINE_CODE_STYLE,
        children
      }
    );
  }
  const contentWithMarks = MARK_APPLY_ORDER.reduce(
    (node, mark) => rest[mark] ? wrapWithMark(mark, node) : node,
    children
  );
  const prismClassName = getPrismClassName(leaf);
  const baseSpanClassName = attributes?.className;
  const mergedSpanClassName = [baseSpanClassName, prismClassName].filter(Boolean).join(" ") || void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { ...attributes, className: mergedSpanClassName, children: contentWithMarks });
};
var renderLeaf = (props) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TextLeaf, { ...props });

// packages/create/editor/ElementWrapper.tsx
var import_react8 = __toESM(require_react(), 1);

// packages/render/web/elements/ImageElement.tsx
var import_react5 = __toESM(require_react(), 1);
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
var resolveImageSrcFromFileContent = (data) => {
  if (!data || !(data.blob instanceof Blob)) {
    return { src: null, objectUrl: null };
  }
  const objectUrl = URL.createObjectURL(data.blob);
  return { src: objectUrl, objectUrl };
};
var ImageElement = ({
  attributes,
  children,
  element,
  style,
  readOnly = false
}) => {
  const dispatch = useAppDispatch();
  const currentServer = useAppSelector(selectRuntimeCurrentServer);
  const editor = useSlateStatic();
  const selected = useSelected();
  const focused = useFocused();
  const [previewUrl, setPreviewUrl] = (0, import_react5.useState)(null);
  const baseUrl = currentServer || "";
  const httpFallbackSrc = element.url || buildDatabaseFileContentUrl(baseUrl, element.fileId) || "";
  const [fileContentSrc, setFileContentSrc] = (0, import_react5.useState)(
    httpFallbackSrc || null
  );
  (0, import_react5.useEffect)(() => {
    setFileContentSrc(httpFallbackSrc || null);
    if (element.url) return;
    if (!element.fileId) return;
    let cancelled = false;
    let objectUrl = null;
    const loadFileContent = async () => {
      try {
        const data = await dispatch(
          readFileContent({ fileId: element.fileId })
        ).unwrap();
        const { src, objectUrl: nextObjectUrl } = resolveImageSrcFromFileContent(data);
        if (!cancelled && src) {
          setFileContentSrc(src);
          objectUrl = nextObjectUrl;
        }
      } catch {
      }
    };
    loadFileContent();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [dispatch, element.fileId, element.url, httpFallbackSrc]);
  const imgSrc = fileContentSrc || "";
  const baseStyle = style || {};
  const { textAlign: _ignore, ...restStyle } = baseStyle;
  const alignmentStyle = element.align === "center" ? { marginLeft: "auto", marginRight: "auto", display: "block" } : element.align === "right" ? { marginLeft: "auto", display: "block" } : {};
  const mergedStyle = {
    display: element.align ? "block" : "inline-block",
    // 默认多图并排，卡片之间有间距
    ...element.align ? {} : { marginRight: "var(--space-3)" },
    marginBottom: "var(--space-3)",
    verticalAlign: "top",
    maxWidth: "100%",
    ...restStyle,
    ...alignmentStyle
  };
  const isActive = selected && focused;
  const handleRemove = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const path = ReactEditor.findPath(editor, element);
    Transforms.removeNodes(editor, { at: path });
  };
  const handleEditAlt = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextAlt = window.prompt("\u8BBE\u7F6E\u56FE\u7247\u66FF\u4EE3\u6587\u672C\uFF08alt\uFF09\uFF1A", element.alt || "");
    if (nextAlt === null) return;
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(
      editor,
      { alt: nextAlt || void 0 },
      { at: path }
    );
  };
  const openPreview = () => {
    if (!imgSrc) return;
    setPreviewUrl(imgSrc);
  };
  const handleImageMouseDown = (event) => {
    if (!readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    openPreview();
  };
  const handlePreviewButton = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openPreview();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { ...attributes, style: mergedStyle, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "div",
      {
        style: {
          display: "inline-block",
          maxWidth: "100%"
        },
        children: [
          imgSrc && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
            "div",
            {
              contentEditable: false,
              style: {
                position: "relative",
                display: "block",
                maxWidth: "100%"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  "img",
                  {
                    src: imgSrc,
                    alt: element.alt || "",
                    loading: "lazy",
                    onMouseDown: handleImageMouseDown,
                    style: {
                      display: "block",
                      maxWidth: "100%",
                      maxHeight: "20em",
                      borderRadius: "var(--radius-md)",
                      boxShadow: isActive ? "0 0 0 2px var(--primary)" : "0 0 0 1px rgba(0, 0, 0, 0.12)",
                      cursor: readOnly ? "zoom-in" : "default"
                    }
                  }
                ),
                isActive && !readOnly && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                  "div",
                  {
                    style: {
                      position: "absolute",
                      top: 8,
                      right: 8,
                      display: "flex",
                      gap: 6
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                        "button",
                        {
                          type: "button",
                          onMouseDown: handleEditAlt,
                          style: iconButtonStyle,
                          title: "\u7F16\u8F91 Alt \u6587\u672C",
                          "aria-label": "\u7F16\u8F91 Alt \u6587\u672C",
                          children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuType, { size: 14, "aria-hidden": "true" })
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                        "button",
                        {
                          type: "button",
                          onMouseDown: handlePreviewButton,
                          style: iconButtonStyle,
                          title: "\u9884\u89C8\u5927\u56FE",
                          "aria-label": "\u9884\u89C8\u5927\u56FE",
                          children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuView, { size: 14, "aria-hidden": "true" })
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                        "button",
                        {
                          type: "button",
                          onMouseDown: handleRemove,
                          style: iconButtonStyle,
                          title: "\u5220\u9664\u56FE\u7247",
                          "aria-label": "\u5220\u9664\u56FE\u7247",
                          children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuTrash2, { size: 14, "aria-hidden": "true" })
                        }
                      )
                    ]
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "div",
            {
              style: {
                marginTop: 6,
                minHeight: 18,
                fontSize: "var(--fontSize-sm)",
                color: "var(--textSecondary)",
                textAlign: "center",
                fontStyle: "italic"
              },
              children
            }
          )
        ]
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ImagePreviewModal_default,
      {
        imageUrl: previewUrl,
        alt: element.alt || "",
        onClose: () => setPreviewUrl(null),
        contentKey: element.fileId
      }
    )
  ] });
};
var iconButtonStyle = {
  width: 26,
  height: 26,
  borderRadius: 999,
  border: "none",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  color: "#fff",
  cursor: "pointer"
};

// packages/render/web/elements/List.tsx
var import_react6 = __toESM(require_react(), 1);
var import_jsx_runtime5 = __toESM(require_jsx_runtime(), 1);
var List = ({
  attributes,
  children,
  element
}) => {
  const Tag = element.ordered ? "ol" : "ul";
  const childArray = import_react6.default.Children.toArray(children);
  const items = childArray.map((child, index) => ({
    child,
    indent: Math.max(0, Number(element.children?.[index]?.indent || 0))
  }));
  const renderLevel = (startIndex, level) => {
    const nodes = [];
    let index = startIndex;
    while (index < items.length) {
      const item = items[index];
      if (item.indent < level) break;
      if (item.indent > level) {
        const lastNode = nodes[nodes.length - 1];
        if (import_react6.default.isValidElement(lastNode)) {
          const [nestedNodes, nextIndex] = renderLevel(index, item.indent);
          nodes[nodes.length - 1] = import_react6.default.cloneElement(
            lastNode,
            {},
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
              lastNode.props.children,
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { className: "custom-list custom-list--nested", children: nestedNodes })
            ] })
          );
          index = nextIndex;
          continue;
        }
      }
      nodes.push(item.child);
      index += 1;
    }
    return [nodes, index];
  };
  const [nestedChildren] = renderLevel(0, 0);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_jsx_runtime5.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { ...attributes, className: "custom-list", children: nestedChildren }) });
};
var ListItem = ({
  attributes,
  children,
  element,
  readOnly = false
}) => {
  const editor = useSlateStatic();
  const isTaskItem = element.checked !== void 0;
  const isCompleted = element.checked === true;
  const className = [
    "custom-list-item",
    isTaskItem && "task-list-item",
    isCompleted && "task-completed"
  ].filter(Boolean).join(" ");
  if (isTaskItem) {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("li", { ...attributes, className, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "input",
        {
          type: "checkbox",
          checked: element.checked,
          readOnly: true,
          className: "list-checkbox",
          contentEditable: false,
          "aria-label": isCompleted ? "Completed task" : "Incomplete task",
          onMouseDown: (event) => {
            if (readOnly) return;
            event.preventDefault();
            event.stopPropagation();
            const path = ReactEditor.findPath(editor, element);
            Editor.withoutNormalizing(editor, () => {
              Transforms.setNodes(
                editor,
                { checked: !element.checked },
                {
                  at: path,
                  match: (node) => Element2.isElement(node) && node === element
                }
              );
            });
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: `task-content${isCompleted ? " task-completed" : ""}`, children })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("li", { ...attributes, className, children });
};

// packages/render/web/elements/TextBlockRenderer.tsx
var import_react7 = __toESM(require_react(), 1);
var import_jsx_runtime6 = __toESM(require_jsx_runtime(), 1);
var getLinkInfo = (rawHref) => {
  if (!rawHref || typeof rawHref !== "string") {
    return { href: "about:blank", isExternal: true };
  }
  const href = rawHref.trim();
  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    return { href, isExternal: true };
  }
  if (href.startsWith("//")) {
    return { href, isExternal: true };
  }
  if (href.includes(".") && !href.includes(" ") && !href.startsWith("/")) {
    return { href: `//${href}`, isExternal: true };
  }
  return { href, isExternal: false };
};
var SafeLink = ({
  attributes,
  children,
  href,
  ...props
}) => {
  const { href: finalHref, isExternal } = (0, import_react7.useMemo)(
    () => getLinkInfo(href),
    [href]
  );
  if (isExternal) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "a",
      {
        href: finalHref,
        target: "_blank",
        rel: "noopener noreferrer",
        ...attributes,
        ...props,
        children
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(NavLink, { to: finalHref, ...attributes, ...props, children });
};
var TAG_MAP = {
  "heading-one": "h1",
  "heading-two": "h2",
  "heading-three": "h3",
  "heading-four": "h4",
  "heading-five": "h5",
  "heading-six": "h6",
  quote: "blockquote",
  "thematic-break": "hr",
  paragraph: "p"
};
var INLINE_CHILD_TYPES = /* @__PURE__ */ new Set(["link", "code-inline", "html-inline"]);
var paragraphNeedsBlockContainer = (element) => {
  if (element.type !== "paragraph" || !Array.isArray(element.children)) return false;
  return element.children.some((child) => {
    if (!child || typeof child !== "object" || !("type" in child)) return false;
    return typeof child.type === "string" && !INLINE_CHILD_TYPES.has(child.type);
  });
};
var TextBlockRenderer = ({
  attributes,
  children,
  element
}) => {
  const HtmlTag = paragraphNeedsBlockContainer(element) ? "div" : TAG_MAP[element.type];
  const classNames = ["text-block", `text-${element.type}`];
  if (element.align) {
    classNames.push(`align-${element.align}`);
  }
  if (element.type === "paragraph" && element.isNested) {
    classNames.push("nested");
  }
  const finalClassName = classNames.join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_jsx_runtime6.Fragment, { children: element.type === "thematic-break" ? import_react7.default.createElement(HtmlTag, { ...attributes, className: finalClassName }) : import_react7.default.createElement(
    HtmlTag,
    { ...attributes, className: finalClassName },
    children,
    element.type === "quote" && element.cite ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("cite", { children: [
      "\u2014 ",
      element.cite
    ] }, "cite") : null
  ) });
};

// packages/create/editor/ElementWrapper.tsx
var import_jsx_runtime7 = __toESM(require_jsx_runtime(), 1);
var TEXT_BLOCK_TYPES = [
  "paragraph",
  "heading-one",
  "heading-two",
  "heading-three",
  "heading-four",
  "heading-five",
  "heading-six",
  "quote",
  "thematic-break"
];
var LazyCodeBlock = (0, import_react8.lazy)(() => import("/public/assets/chunks/CodeBlock-UXFI5W4F.js"));
var ElementWrapper = (props) => {
  const { attributes, children, element, isStreaming = false, readOnly } = props;
  const editor = useSlateStatic();
  const handleLinkClick = (0, import_react8.useCallback)((event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
  }, []);
  const linkOnClick = readOnly ? void 0 : handleLinkClick;
  const getStyle = (style = {}) => ({
    ...element.align ? { textAlign: element.align } : {},
    ...style
  });
  if (TEXT_BLOCK_TYPES.includes(element.type)) {
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TextBlockRenderer, { attributes, element, children });
  }
  if (element.type === CodeBlockType) {
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react8.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("pre", { className: "code-loading", children: "\u4EE3\u7801\u5757\u52A0\u8F7D\u4E2D..." }), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      LazyCodeBlock,
      {
        attributes,
        element,
        isStreaming,
        children
      }
    ) });
  }
  if (element.type === CodeLineType) {
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { ...attributes, style: getStyle(), children });
  }
  switch (element.type) {
    case "code-inline":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        "code",
        {
          ...attributes,
          style: getStyle({
            background: "var(--backgroundSecondary)",
            color: "var(--primary)",
            padding: "var(--space-1) var(--space-2)",
            borderRadius: "var(--space-1)",
            fontFamily: 'var(--font-mono, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
            fontSize: "0.85em",
            border: "1px solid var(--border)",
            wordBreak: "break-word",
            lineHeight: "var(--leading-tight)",
            fontWeight: 500
          }),
          children
        }
      );
    case "link":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        SafeLink,
        {
          href: element.url,
          onClick: linkOnClick,
          ...attributes,
          style: getStyle({
            color: "var(--primary)",
            textDecoration: "underline",
            textDecorationColor: "var(--primary)",
            textUnderlineOffset: "1px"
          }),
          children
        }
      );
    case "image":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        ImageElement,
        {
          ...props,
          readOnly,
          style: getStyle({ margin: "var(--space-4) 0" })
        }
      );
    case "list":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(List, { attributes, element, children });
    case "list-item":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        ListItem,
        {
          attributes,
          element,
          readOnly,
          children
        }
      );
    case "table": {
      const tablePath = ReactEditor.findPath(editor, element);
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Table,
        {
          ...props,
          path: tablePath,
          style: getStyle({ margin: "var(--space-4) 0" }),
          children
        }
      );
    }
    case "table-row":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TableRow, { attributes, style: getStyle(), children });
    case "table-cell": {
      const cellPath = ReactEditor.findPath(editor, element);
      const isFirstRow = cellPath[cellPath.length - 2] === 0;
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        TableCell,
        {
          ...props,
          path: cellPath,
          isFirstRow,
          style: getStyle({
            padding: "var(--space-2) var(--space-3)",
            lineHeight: "var(--leading-normal)"
          }),
          children
        }
      );
    }
    case "html-inline":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        "span",
        {
          ...attributes,
          style: getStyle(),
          dangerouslySetInnerHTML: { __html: element.html }
        }
      );
    case "mention":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "span",
        {
          ...attributes,
          contentEditable: false,
          style: getStyle({
            padding: "0 4px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--backgroundTertiary)",
            color: "var(--primary)",
            fontWeight: 500,
            userSelect: "none",
            margin: "0 2px",
            border: "1px solid var(--border)",
            fontSize: "0.9em",
            verticalAlign: "baseline",
            display: "inline-flex",
            alignItems: "center"
          }),
          children: [
            "@",
            element.label,
            children
          ]
        }
      );
    case "html-block":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        "div",
        {
          ...attributes,
          style: getStyle({ margin: "var(--space-3) 0" }),
          dangerouslySetInnerHTML: { __html: element.html }
        }
      );
    default: {
      const Tag = editor.isInline(element) ? "span" : "div";
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Tag,
        {
          ...attributes,
          style: getStyle({
            ...editor.isInline(element) ? {} : { margin: "var(--space-2) 0" }
          }),
          children
        }
      );
    }
  }
};

// packages/create/editor/EditorToolbar.tsx
var import_react11 = __toESM(require_react(), 1);

// packages/create/editor/components.tsx
var import_react9 = __toESM(require_react(), 1);
var import_react_dom2 = __toESM(require_react_dom(), 1);
var import_jsx_runtime8 = __toESM(require_jsx_runtime(), 1);
var Button = ({
  className = "",
  active = false,
  reversed = false,
  children,
  style = {},
  ...props
}) => {
  const [isHovered, setIsHovered] = (0, import_react9.useState)(false);
  const color = reversed ? active ? "var(--background)" : "var(--textQuaternary)" : active ? "var(--primary)" : "var(--textSecondary)";
  const backgroundColor = isHovered ? reversed ? "var(--backgroundHover)" : "var(--focus)" : active ? reversed ? "var(--backgroundSelected)" : "var(--primaryHover)" : "transparent";
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    "span",
    {
      ...props,
      className,
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      style: {
        cursor: "pointer",
        color,
        padding: "var(--space-1) var(--space-2)",
        // 4px 8px
        borderRadius: "var(--space-1)",
        // 4px
        backgroundColor,
        transition: "color 0.2s, background-color 0.2s",
        // ✨ 只动画必要属性
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...style
      },
      children
    }
  );
};
var Menu = ({
  className = "",
  style = {},
  ref,
  ...props
}) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
  "div",
  {
    ...props,
    ref,
    "data-test-id": "menu",
    className,
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-2)",
      // 8px
      ...style
    }
  }
);
var Portal = ({ children }) => typeof document === "object" ? import_react_dom2.default.createPortal(children, document.body) : null;

// packages/create/editor/CodeBlockButton.tsx
var import_jsx_runtime9 = __toESM(require_jsx_runtime(), 1);
var isCodeBlockActive = (editor) => {
  const [match] = Editor.nodes(editor, {
    match: (n) => isCustomElement(n) && n.type === CodeBlockType
  });
  return !!match;
};
var toggleCodeBlock = (editor) => {
  const isActive = isCodeBlockActive(editor);
  const convertibleTypes = [...Object.values(HeadingType), ParagraphType];
  const matchCondition = (n) => isCustomElement(n) && convertibleTypes.includes(n.type);
  if (isActive) {
    Transforms.setNodes(
      editor,
      { type: ParagraphType },
      {
        match: (n) => isCustomElement(n) && n.type === CodeLineType
      }
    );
    Transforms.unwrapNodes(editor, {
      match: (n) => isCustomElement(n) && n.type === CodeBlockType,
      split: true
    });
  } else {
    Transforms.setNodes(
      editor,
      { type: CodeLineType },
      { match: matchCondition }
    );
    Transforms.wrapNodes(
      editor,
      { type: CodeBlockType, language: "tsx", children: [] },
      {
        match: (n) => isCustomElement(n) && n.type === CodeLineType,
        split: true
      }
    );
  }
};
var CodeBlockButton = () => {
  const editor = useSlate();
  const isActive = isCodeBlockActive(editor);
  const label = "\u4EE3\u7801\u5757";
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
    Button,
    {
      "data-test-id": "code-block-button",
      active: isActive,
      role: "button",
      tabIndex: 0,
      title: label,
      "aria-label": label,
      "aria-pressed": isActive,
      onMouseDown: (e) => {
        e.preventDefault();
        toggleCodeBlock(editor);
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuFileCode2, { size: 18, "aria-hidden": "true" })
    }
  );
};

// packages/create/editor/utils/linkCommands.ts
var isLinkActive = (editor) => {
  const [link] = Editor.nodes(editor, {
    match: (n) => isCustomElement(n) && n.type === "link"
  });
  return !!link;
};
var unwrapLink = (editor) => {
  Transforms.unwrapNodes(editor, {
    match: (n) => isCustomElement(n) && n.type === "link"
  });
};
var wrapLink = (editor, url) => {
  if (isLinkActive(editor)) {
    unwrapLink(editor);
  }
  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);
  const link = {
    type: "link",
    url,
    children: isCollapsed ? [{ text: url }] : []
  };
  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: "end" });
  }
};
var toggleLink = (editor, url) => {
  if (!url) {
    if (isLinkActive(editor)) {
      unwrapLink(editor);
    }
    return;
  }
  const { selection } = editor;
  if (!selection) return;
  wrapLink(editor, url);
};
var LinkCommands = {
  isLinkActive,
  toggleLink
};

// packages/render/web/ui/LinkModal.tsx
var import_react10 = __toESM(require_react(), 1);
var import_jsx_runtime10 = __toESM(require_jsx_runtime(), 1);
var LinkModal = ({
  isOpen,
  onClose,
  onConfirm,
  onRemove,
  initialUrl = ""
}) => {
  const { t } = useTranslation();
  const [url, setUrl] = (0, import_react10.useState)(initialUrl);
  (0, import_react10.useEffect)(() => {
    if (isOpen) {
      setUrl(initialUrl || "");
    }
  }, [initialUrl, isOpen]);
  const handleConfirm = (0, import_react10.useCallback)(() => {
    if (url.trim()) {
      onConfirm(url.trim());
      onClose();
    }
  }, [url, onConfirm, onClose]);
  const handleRemove = (0, import_react10.useCallback)(() => {
    onRemove();
    onClose();
  }, [onRemove, onClose]);
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };
  const isEditing = !!initialUrl;
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
    Dialog,
    {
      isOpen,
      onClose,
      title: isEditing ? t("linkModal.editTitle", "\u7F16\u8F91\u94FE\u63A5") : t("linkModal.addTitle", "\u6DFB\u52A0\u94FE\u63A5"),
      size: "small",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "link-modal-container", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "input-wrapper", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuLink, { size: 16, className: "input-icon", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
              "input",
              {
                type: "text",
                className: "link-input",
                value: url,
                onChange: (e) => setUrl(e.target.value),
                onKeyDown: handleKeyDown,
                placeholder: t("linkModal.placeholder", "https://example.com"),
                autoFocus: true
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "actions-wrapper", children: [
            isEditing && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
              Button_default,
              {
                onClick: handleRemove,
                variant: "danger",
                size: "small",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuTrash2, { size: 14, "aria-hidden": "true" }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { marginLeft: "4px" }, children: t("common.remove", "\u79FB\u9664") })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "spacer" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button_default, { onClick: onClose, variant: "secondary", size: "small", children: t("common.cancel", "\u53D6\u6D88") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button_default, { onClick: handleConfirm, size: "small", disabled: !url.trim(), children: isEditing ? t("common.save", "\u4FDD\u5B58") : t("common.add", "\u6DFB\u52A0") })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("style", { jsx: true, children: `
        .link-modal-container {
          display: flex;
          flex-direction: column;
          gap: 24px; /* \u95F4\u8DDD */
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: var(--theme-textTertiary); /* \u4F7F\u7528 CSS \u53D8\u91CF\u6216 theme \u5BF9\u8C61 */
        }

        /* \u8FD9\u662F\u4E00\u4E2A\u57FA\u7840\u7684 Input \u6837\u5F0F\uFF0C\u5982\u679C\u9879\u76EE\u4E2D\u6709\u6807\u51C6 Input \u7EC4\u4EF6\uFF0C\u8BF7\u66FF\u6362 */
        .link-input {
          width: 100%;
          height: var(--control-lg);
          padding: 0 12px 0 36px; /* \u5DE6\u4FA7\u7559\u51FA\u56FE\u6807\u7A7A\u95F4 */
          box-sizing: border-box;
          border-radius: var(--radius-md);
          border: 1px solid var(--theme-border, #e5e7eb);
          background-color: var(--theme-backgroundSecondary, #f9fafb);
          color: var(--theme-text, #111827);
          font-size: var(--fontSize-base);
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }

        .link-input:focus {
          outline: none;
          border-color: var(--theme-primary, #3b82f6);
          box-shadow: 0 0 0 2px
            var(--theme-primary-light, rgba(59, 130, 246, 0.2));
        }

        .actions-wrapper {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px; /* \u6309\u94AE\u95F4\u8DDD */
        }

        .spacer {
          flex-grow: 1;
        }
      ` })
      ]
    }
  );
};

// packages/create/editor/imageUpload.ts
var createCustomKey = (file) => `slate-image-${file.lastModified}-${file.size}-${Math.random().toString(36).slice(2)}`;
var insertImageFromFile = async (editor, dispatch, file, spaceId) => {
  const customKey = createCustomKey(file);
  const toastId = toast.loading(`\u6B63\u5728\u4E0A\u4F20\u56FE\u7247\u2026`);
  try {
    let metadata;
    if (spaceId) {
      metadata = await dispatch(
        uploadAndAddFileToSpace({ spaceId, file })
      ).unwrap();
    } else {
      metadata = await dispatch(
        upload({ file, customKey })
      ).unwrap();
    }
    const fileId = metadata?.fileId || metadata?.id || metadata?.dbKey;
    if (!fileId) {
      toast.error("\u4E0A\u4F20\u5931\u8D25\uFF1A\u672A\u8FD4\u56DE\u6587\u4EF6 ID", { id: toastId });
      return null;
    }
    const imageNode = {
      type: "image",
      fileId,
      alt: file.name,
      children: [{ text: "" }]
      // children = Caption
    };
    Transforms.insertNodes(editor, imageNode);
    toast.success("\u56FE\u7247\u4E0A\u4F20\u6210\u529F", { id: toastId });
    return fileId;
  } catch {
    toast.error("\u56FE\u7247\u4E0A\u4F20\u5931\u8D25", { id: toastId });
    return null;
  }
};

// packages/create/editor/EditorToolbar.tsx
var import_jsx_runtime11 = __toESM(require_jsx_runtime(), 1);
var TEXT_ALIGN_TYPES = ["left", "center", "right", "justify"];
var LIST_TYPE2 = "list";
var TASK_LIST_TYPE = "task-list";
var isTableActive = (editor) => {
  const [table] = Editor.nodes(editor, {
    match: (n) => isCustomElement(n) && n.type === "table"
  });
  return !!table;
};
var insertTable = (editor) => {
  if (isTableActive(editor)) return;
  const createTableCell = () => ({
    type: "table-cell",
    children: [{ type: "paragraph", children: [{ text: "" }] }]
  });
  const createTableRow = (cols) => ({
    type: "table-row",
    children: Array.from({ length: cols }, createTableCell)
  });
  const tableNode = {
    type: "table",
    columns: [
      { width: null, align: "left" },
      { width: null, align: "left" }
    ],
    children: [createTableRow(2), createTableRow(2)]
  };
  Transforms.insertNodes(editor, tableNode);
  const [tableEntry] = Editor.nodes(editor, {
    match: (n) => isCustomElement(n) && n.type === "table"
  });
  if (tableEntry) {
    Transforms.select(editor, Editor.start(editor, tableEntry[1]));
  }
};
var TableButton = () => {
  const editor = useSlate();
  const isDisabled = isTableActive(editor);
  const label = "\u63D2\u5165\u8868\u683C";
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    Button,
    {
      disabled: isDisabled,
      role: "button",
      tabIndex: isDisabled ? -1 : 0,
      "aria-disabled": isDisabled || void 0,
      title: label,
      "aria-label": label,
      onMouseDown: (e) => {
        e.preventDefault();
        if (isDisabled) return;
        insertTable(editor);
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(LuTable2, { size: 18, "aria-hidden": "true" })
    }
  );
};
var ImageButton = () => {
  const editor = useSlate();
  const dispatch = useAppDispatch();
  const inputRef = (0, import_react11.useRef)(null);
  const openFilePicker = (0, import_react11.useCallback)(() => {
    inputRef.current?.click();
  }, []);
  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (!isImageFile(file)) return;
    if (!ReactEditor.isFocused(editor)) {
      ReactEditor.focus(editor);
    }
    await insertImageFromFile(editor, dispatch, file);
  };
  const label = "\u63D2\u5165\u56FE\u7247";
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      Button,
      {
        role: "button",
        tabIndex: 0,
        title: label,
        "aria-label": label,
        onMouseDown: (e) => {
          e.preventDefault();
          openFilePicker();
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(LuImagePlus, { size: 18, "aria-hidden": "true" })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      "input",
      {
        ref: inputRef,
        type: "file",
        accept: "image/*",
        style: { display: "none" },
        onChange: handleChange
      }
    )
  ] });
};
var Toolbar = ({ className = "", style = {}, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
  Menu,
  {
    ...props,
    className: `editor-toolbar ${className}`,
    style: {
      position: "relative",
      padding: "var(--space-2) var(--space-3)",
      backgroundColor: "var(--backgroundSecondary)",
      borderRadius: "var(--space-1)",
      boxShadow: "0 1px 3px var(--shadowMedium)",
      marginBottom: "var(--space-4)",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "var(--space-2)",
      ...style
    }
  }
);
var toggleBlock = (editor, format, ordered) => {
  const isTaskList = format === TASK_LIST_TYPE;
  const isList2 = format === "list" || isTaskList;
  if (isTaskList) {
    toggleTaskList(editor);
    return;
  }
  if (format === "list") {
    if (ordered) {
      toggleOrderedList(editor);
    } else {
      toggleBulletedList(editor);
    }
    return;
  }
  if (TEXT_ALIGN_TYPES.includes(format)) {
    const active2 = isBlockActive(editor, format, "align");
    Transforms.setNodes(editor, {
      align: active2 ? void 0 : format
    });
    return;
  }
  const active = isBlockActive(editor, format, "type");
  setBlockType(editor, active ? "paragraph" : format);
};
var BLOCK_LABELS = {
  "heading-one": "\u4E00\u7EA7\u6807\u9898",
  "heading-two": "\u4E8C\u7EA7\u6807\u9898",
  quote: "\u5F15\u7528",
  list: "\u5217\u8868",
  "task-list": "\u4EFB\u52A1\u5217\u8868",
  left: "\u5DE6\u5BF9\u9F50",
  center: "\u5C45\u4E2D\u5BF9\u9F50",
  right: "\u53F3\u5BF9\u9F50",
  justify: "\u4E24\u7AEF\u5BF9\u9F50"
};
var MARK_LABELS = {
  bold: "\u7C97\u4F53",
  italic: "\u659C\u4F53",
  underline: "\u4E0B\u5212\u7EBF",
  code: "\u884C\u5185\u4EE3\u7801"
};
var BlockButton = ({ format, Icon, ordered, label }) => {
  const editor = useSlate();
  const active = format === TASK_LIST_TYPE ? getActiveListVariant(editor) === "task" : format === LIST_TYPE2 ? getActiveListVariant(editor) === (ordered ? "ordered" : "unordered") : isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? "align" : "type"
  );
  const accessibleName = label || (format === LIST_TYPE2 ? ordered ? "\u6709\u5E8F\u5217\u8868" : "\u65E0\u5E8F\u5217\u8868" : BLOCK_LABELS[format] || format);
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    Button,
    {
      active,
      role: "button",
      tabIndex: 0,
      title: accessibleName,
      "aria-label": accessibleName,
      "aria-pressed": active,
      onMouseDown: (e) => {
        e.preventDefault();
        toggleBlock(editor, format, ordered);
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Icon, { size: 18, "aria-hidden": "true" })
    }
  );
};
var MarkButton = ({
  format,
  Icon,
  label
}) => {
  const editor = useSlate();
  const active = isMarkActive(editor, format);
  const accessibleName = label || MARK_LABELS[format] || format;
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    Button,
    {
      active,
      role: "button",
      tabIndex: 0,
      title: accessibleName,
      "aria-label": accessibleName,
      "aria-pressed": active,
      onMouseDown: (e) => {
        e.preventDefault();
        toggleMark(editor, format);
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Icon, { size: 18, "aria-hidden": "true" })
    }
  );
};
var LinkButton = () => {
  const editor = useSlate();
  const [isModalOpen, setModalOpen] = (0, import_react11.useState)(false);
  const isActive = LinkCommands.isLinkActive(editor);
  const getActiveLinkUrl = (0, import_react11.useCallback)(() => {
    if (!isActive) return "";
    const [link] = Editor.nodes(editor, {
      match: (n) => isCustomElement(n) && n.type === "link"
    });
    return link ? link[0].url : "";
  }, [editor, isActive]);
  const handleConfirm = (url) => {
    LinkCommands.toggleLink(editor, url);
    setModalOpen(false);
  };
  const handleRemove = () => {
    LinkCommands.toggleLink(editor);
    setModalOpen(false);
  };
  const label = "\u94FE\u63A5";
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      Button,
      {
        active: isActive,
        role: "button",
        tabIndex: 0,
        title: label,
        "aria-label": label,
        "aria-pressed": isActive,
        onMouseDown: (e) => {
          e.preventDefault();
          if (!ReactEditor.isFocused(editor)) {
            ReactEditor.focus(editor);
          }
          setModalOpen(true);
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(LuLink, { size: 18, "aria-hidden": "true" })
      }
    ),
    isModalOpen && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      LinkModal,
      {
        isOpen: isModalOpen,
        onClose: () => setModalOpen(false),
        onConfirm: handleConfirm,
        onRemove: handleRemove,
        initialUrl: getActiveLinkUrl()
      }
    )
  ] });
};
var EditorToolbar = () => {
  const groupStyle = {
    display: "flex",
    gap: "var(--space-1)"
  };
  const divider = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    "div",
    {
      style: {
        borderLeft: "1px solid var(--border)",
        height: "var(--space-5)"
      }
    }
  );
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(Toolbar, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: groupStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MarkButton, { format: "bold", Icon: LuBold }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MarkButton, { format: "italic", Icon: LuItalic }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MarkButton, { format: "underline", Icon: LuUnderline }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MarkButton, { format: "code", Icon: LuCode }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(LinkButton, {})
    ] }),
    divider,
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: groupStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(BlockButton, { format: "heading-one", Icon: LuHeading1 }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(BlockButton, { format: "heading-two", Icon: LuHeading2 }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(BlockButton, { format: "quote", Icon: LuQuote })
    ] }),
    divider,
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: groupStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(BlockButton, { format: "list", ordered: true, Icon: LuListOrdered }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(BlockButton, { format: "list", ordered: false, Icon: LuList }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(BlockButton, { format: "task-list", Icon: LuSquareCheck })
    ] }),
    divider,
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: groupStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(BlockButton, { format: "left", Icon: LuAlignLeft }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(BlockButton, { format: "center", Icon: LuAlignCenter }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(BlockButton, { format: "right", Icon: LuAlignRight }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(BlockButton, { format: "justify", Icon: LuAlignJustify })
    ] }),
    divider,
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { style: groupStyle, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(CodeBlockButton, {}) }),
    divider,
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: groupStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(ImageButton, {}),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(TableButton, {})
    ] })
  ] });
};

// packages/create/editor/HoveringToolbar.tsx
var import_react14 = __toESM(require_react(), 1);

// packages/create/editor/LinkEditorPopover.tsx
var import_react12 = __toESM(require_react(), 1);
var import_react_dom3 = __toESM(require_react_dom(), 1);
var import_jsx_runtime12 = __toESM(require_jsx_runtime(), 1);
var LinkEditorPopover = ({
  isOpen,
  initialUrl,
  onConfirm,
  onRemove,
  onClose
}) => {
  const theme = useAppSelector(selectTheme);
  const inputRef = (0, import_react12.useRef)(null);
  const [url, setUrl] = (0, import_react12.useState)("");
  const isEditing = initialUrl !== "";
  const { x, y, strategy, refs } = useFloating({
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 8 })]
  });
  (0, import_react12.useEffect)(() => {
    if (!isOpen) return;
    const domSelection = window.getSelection();
    if (domSelection && domSelection.rangeCount > 0) {
      const domRange = domSelection.getRangeAt(0);
      refs.setReference({
        getBoundingClientRect: () => domRange.getBoundingClientRect()
      });
    }
    setUrl(initialUrl);
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, initialUrl, refs]);
  const handleConfirm = () => {
    onConfirm(url.trim());
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };
  if (!isOpen) {
    return null;
  }
  return (0, import_react_dom3.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
      Menu,
      {
        ref: refs.setFloating,
        style: {
          position: strategy,
          top: y ?? 0,
          left: x ?? 0,
          zIndex: 9999,
          backgroundColor: theme.backgroundSecondary,
          borderRadius: "var(--radius-md)",
          boxShadow: `0 3px 12px ${theme.shadowMedium}`,
          padding: "8px",
          display: "flex",
          gap: "8px",
          alignItems: "center"
        },
        onMouseDown: (e) => e.preventDefault(),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            "input",
            {
              ref: inputRef,
              type: "text",
              value: url,
              onChange: (e) => setUrl(e.target.value),
              onKeyDown: handleKeyDown,
              placeholder: "\u7C98\u8D34\u6216\u8F93\u5165\u94FE\u63A5...",
              style: {
                background: theme.backgroundTertiary,
                border: `1px solid ${theme.border}`,
                color: theme.text,
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                fontSize: "var(--fontSize-base)",
                width: "240px",
                outline: "none"
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            Button,
            {
              reversed: true,
              active: true,
              role: "button",
              tabIndex: 0,
              title: "\u786E\u8BA4\u94FE\u63A5",
              "aria-label": "\u786E\u8BA4\u94FE\u63A5",
              onClick: handleConfirm,
              children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(LuCheck, { size: 20, color: theme.textSecondary, "aria-hidden": "true" })
            }
          ),
          isEditing && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            Button,
            {
              reversed: true,
              active: true,
              role: "button",
              tabIndex: 0,
              title: "\u79FB\u9664\u94FE\u63A5",
              "aria-label": "\u79FB\u9664\u94FE\u63A5",
              onClick: onRemove,
              children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(LuTrash2, { size: 16, color: theme.textSecondary, "aria-hidden": "true" })
            }
          )
        ]
      }
    ),
    document.body
  );
};

// packages/create/editor/HoveringToolbar.tsx
var import_jsx_runtime13 = __toESM(require_jsx_runtime(), 1);
var FORMAT_LABELS = {
  bold: "\u7C97\u4F53",
  italic: "\u659C\u4F53",
  underline: "\u4E0B\u5212\u7EBF"
};
var FormatButton = ({
  format,
  icon: Icon
}) => {
  const editor = useSlate();
  const active = isMarkActive(editor, format);
  const label = FORMAT_LABELS[format] || format;
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
    Button,
    {
      reversed: true,
      active,
      role: "button",
      tabIndex: 0,
      title: label,
      "aria-label": label,
      "aria-pressed": active,
      onMouseDown: (e) => {
        e.preventDefault();
        toggleMark(editor, format);
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Icon, { size: 16, "aria-hidden": "true" })
    }
  );
};
var HoveringToolbar = () => {
  const editor = useSlate();
  const inFocus = useFocused();
  const { x, y, strategy, refs } = useFloating({
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 8 })]
  });
  const [isLinkEditorOpen, setLinkEditorOpen] = (0, import_react14.useState)(false);
  const [showToolbar, setShowToolbar] = (0, import_react14.useState)(false);
  const [savedSelection, setSavedSelection] = (0, import_react14.useState)(null);
  (0, import_react14.useEffect)(() => {
    const { selection } = editor;
    const shouldShow = !!(selection && inFocus && !isLinkEditorOpen && !Range.isCollapsed(selection) && Editor.string(editor, selection) !== "");
    setShowToolbar(shouldShow);
    if (shouldShow) {
      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        const domRange = domSelection.getRangeAt(0);
        refs.setReference({
          getBoundingClientRect: () => domRange.getBoundingClientRect()
        });
      }
    }
  }, [editor.selection, inFocus, isLinkEditorOpen, refs, editor]);
  const getActiveLinkUrl = (0, import_react14.useCallback)(() => {
    const [linkNode] = Editor.nodes(editor, {
      match: (n) => isCustomElement(n) && n.type === "link",
      at: editor.selection || void 0
    });
    return linkNode ? linkNode[0].url : "";
  }, [editor]);
  const handleOpenLinkEditor = (0, import_react14.useCallback)(() => {
    if (editor.selection) {
      setSavedSelection(editor.selection);
      setLinkEditorOpen(true);
    }
  }, [editor]);
  const handleCloseLinkEditor = (0, import_react14.useCallback)(() => {
    setLinkEditorOpen(false);
    if (savedSelection) {
      ReactEditor.focus(editor);
      Transforms.select(editor, savedSelection);
    }
    setSavedSelection(null);
  }, [editor, savedSelection]);
  const handleConfirmLink = (0, import_react14.useCallback)(
    (url) => {
      if (savedSelection) {
        Transforms.select(editor, savedSelection);
        LinkCommands.toggleLink(editor, url);
        handleCloseLinkEditor();
      }
    },
    [editor, savedSelection, handleCloseLinkEditor]
  );
  const handleRemoveLink = (0, import_react14.useCallback)(() => {
    if (savedSelection) {
      Transforms.select(editor, savedSelection);
      LinkCommands.toggleLink(editor);
      handleCloseLinkEditor();
    }
  }, [editor, savedSelection, handleCloseLinkEditor]);
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Portal, { children: showToolbar && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
      Menu,
      {
        ref: refs.setFloating,
        style: {
          position: strategy,
          top: y ?? 0,
          left: x ?? 0,
          padding: "6px 8px",
          zIndex: 9998,
          backgroundColor: "#222",
          borderRadius: "6px",
          transition: "opacity 0.2s",
          display: "flex",
          gap: "4px"
        },
        onMouseDown: (e) => e.preventDefault(),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(FormatButton, { format: "bold", icon: LuBold }),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(FormatButton, { format: "italic", icon: LuItalic }),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(FormatButton, { format: "underline", icon: LuUnderline }),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            Button,
            {
              reversed: true,
              active: LinkCommands.isLinkActive(editor),
              role: "button",
              tabIndex: 0,
              title: "\u94FE\u63A5",
              "aria-label": "\u94FE\u63A5",
              "aria-pressed": LinkCommands.isLinkActive(editor),
              onMouseDown: (e) => {
                e.preventDefault();
                handleOpenLinkEditor();
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(LuLink2, { size: 16, "aria-hidden": "true" })
            }
          )
        ]
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      LinkEditorPopover,
      {
        isOpen: isLinkEditorOpen,
        onConfirm: handleConfirmLink,
        onRemove: handleRemoveLink,
        onClose: handleCloseLinkEditor,
        initialUrl: getActiveLinkUrl()
      }
    )
  ] });
};

// packages/create/editor/TableContextMenu.tsx
var import_react16 = __toESM(require_react(), 1);
var import_react_dom4 = __toESM(require_react_dom(), 1);
var import_jsx_runtime14 = __toESM(require_jsx_runtime(), 1);
var TableContextMenu = () => {
  const editor = useSlate();
  const { x, y, refs, strategy, context } = useFloating({
    // 当元素挂载时，自动更新位置 (处理滚动、缩放等所有情况)
    whileElementsMounted: autoUpdate,
    // 初始首选位置
    placement: "right-start",
    // 中间件，按顺序执行
    middleware: [
      offset(12),
      // 偏移量，菜单离表格12px
      flip(),
      // 空间不足时，自动翻转到对侧 (e.g., right -> left)
      shift()
      // 确保菜单始终在视口内，不会被裁切
    ]
  });
  const [show, setShow] = (0, import_react16.useState)(false);
  (0, import_react16.useEffect)(() => {
    const { selection } = editor;
    const shouldShow = !!(selection && ReactEditor.isFocused(editor) && isSelectionInTable(editor));
    setShow(shouldShow);
    if (shouldShow) {
      const [table] = Editor.nodes(editor, {
        match: (n) => isCustomElement(n) && n.type === "table"
      });
      if (table) {
        const tableDomNode = ReactEditor.toDOMNode(editor, table[0]);
        refs.setReference(tableDomNode);
      }
    }
  }, [editor, editor.selection, refs]);
  const buttonGroupStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)"
  };
  const menu = show ? /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
    "div",
    {
      ref: refs.setFloating,
      onMouseDown: (e) => e.preventDefault(),
      style: {
        // 由 useFloating hook 提供的位置和策略
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
        // 其他样式
        zIndex: 20,
        backgroundColor: "var(--background)",
        borderRadius: "var(--space-2)",
        boxShadow: "0 4px 12px var(--shadowHeavy)",
        padding: "var(--space-2)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        transition: "opacity 0.15s ease-in-out"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: buttonGroupStyle, children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(Button, { onClick: () => insertRow(editor, "above"), children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              LuArrowUpFromLine,
              {
                size: 16,
                style: { marginRight: "var(--space-2)" },
                "aria-hidden": "true"
              }
            ),
            " ",
            "\u63D2\u5165\u4E0A\u65B9\u884C"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(Button, { onClick: () => insertRow(editor, "below"), children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              LuArrowDownFromLine,
              {
                size: 16,
                style: { marginRight: "var(--space-2)" },
                "aria-hidden": "true"
              }
            ),
            " ",
            "\u63D2\u5165\u4E0B\u65B9\u884C"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: buttonGroupStyle, children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(Button, { onClick: () => insertColumn(editor, "left"), children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              LuArrowLeftFromLine,
              {
                size: 16,
                style: { marginRight: "var(--space-2)" },
                "aria-hidden": "true"
              }
            ),
            " ",
            "\u63D2\u5165\u5DE6\u4FA7\u5217"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(Button, { onClick: () => insertColumn(editor, "right"), children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              LuArrowRightFromLine,
              {
                size: 16,
                style: { marginRight: "var(--space-2)" },
                "aria-hidden": "true"
              }
            ),
            " ",
            "\u63D2\u5165\u53F3\u4FA7\u5217"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          "div",
          {
            style: {
              borderTop: "1px solid var(--border)",
              margin: "var(--space-1) 0"
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: buttonGroupStyle, children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(Button, { onClick: () => deleteRow(editor), children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              LuRows3,
              {
                size: 16,
                style: { marginRight: "var(--space-2)" },
                "aria-hidden": "true"
              }
            ),
            " ",
            "\u5220\u9664\u884C"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(Button, { onClick: () => deleteColumn(editor), children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              LuColumns3,
              {
                size: 16,
                style: { marginRight: "var(--space-2)" },
                "aria-hidden": "true"
              }
            ),
            " ",
            "\u5220\u9664\u5217"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(Button, { onClick: () => deleteTable(editor), children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              LuTrash2,
              {
                size: 16,
                style: { marginRight: "var(--space-2)" },
                "aria-hidden": "true"
              }
            ),
            " ",
            "\u5220\u9664\u8868\u683C"
          ] })
        ] })
      ]
    }
  ) : null;
  if (typeof document === "undefined") return null;
  return (0, import_react_dom4.createPortal)(menu, document.body);
};

// packages/create/editor/utils/hasPlainCodeBlock.ts
function hasPlainCodeBlock(nodes) {
  return nodes.some((node) => {
    if (!isCustomElement(node)) return false;
    if (node.type === CodeBlockType) {
      return node.preview !== "true";
    }
    const children = node.children;
    return Array.isArray(children) && hasPlainCodeBlock(children);
  });
}

// packages/create/editor/toolMentionOptions.ts
var buildToolMentionOptions = () => {
  const options = [];
  Object.entries(toolDescriptions).forEach(([name, desc]) => {
    if (!isToolVisibleInUi(name)) return;
    options.push({
      id: name,
      label: name,
      type: "tool",
      description: desc.description
    });
  });
  return options;
};

// packages/create/editor/Editor.tsx
var import_jsx_runtime15 = __toESM(require_jsx_runtime(), 1);
var countWords = (nodes) => {
  const text = nodes.map((node) => Node.string(node)).join("\n");
  const matches = text.match(/[a-zA-Z0-9]+|[\u4e00-\u9fa5]/g);
  return matches ? matches.length : 0;
};
var buildDocFocusContext = (editor, isFocused) => {
  const { selection } = editor;
  if (!selection) {
    return {
      isFocused,
      isCollapsed: true,
      anchorPath: [],
      anchorOffset: 0,
      focusPath: [],
      focusOffset: 0,
      selectedText: null,
      blockType: null
    };
  }
  const blockEntry = Editor.above(editor, {
    at: selection.anchor,
    match: (n) => Editor.isBlock(editor, n)
  });
  return {
    isFocused,
    isCollapsed: Range.isCollapsed(selection),
    anchorPath: [...selection.anchor.path],
    anchorOffset: selection.anchor.offset,
    focusPath: [...selection.focus.path],
    focusOffset: selection.focus.offset,
    selectedText: Range.isCollapsed(selection) ? null : Editor.string(editor, selection).slice(0, 200),
    blockType: blockEntry && Element2.isElement(blockEntry[0]) ? blockEntry[0].type : null
  };
};
var NoloEditor = ({
  initialValue,
  readOnly = false,
  onChange,
  isStreaming = false,
  autoFocus = false,
  onBlur,
  onCompositionChange,
  onWordCountChange
}) => {
  const editor = (0, import_react18.useMemo)(() => createNoloEditor(), []);
  const dispatch = useAppDispatch();
  const isComposingRef = (0, import_react18.useRef)(false);
  (0, import_react18.useEffect)(() => {
    if (readOnly || !autoFocus) return;
    if (editor.children && editor.children.length > 0) {
      const endPoint = Editor.end(editor, []);
      Transforms.select(editor, endPoint);
    }
    ReactEditor.focus(editor);
  }, [editor, readOnly, autoFocus]);
  const wordCountEnabled = useAppSelector(selectEditorWordCountEnabled);
  const editorCodeTheme = useAppSelector(selectEditorCodeTheme);
  const [wordCount, setWordCount] = (0, import_react18.useState)(() => countWords(initialValue));
  (0, import_react18.useEffect)(() => {
    onWordCountChange?.(wordCount);
  }, [wordCount, onWordCountChange]);
  const [docVersion, setDocVersion] = (0, import_react18.useState)(0);
  const [hasPlainCode, setHasPlainCode] = (0, import_react18.useState)(
    () => hasPlainCodeBlock(initialValue)
  );
  const [isDraggingOver, setIsDraggingOver] = (0, import_react18.useState)(false);
  const [isEditorFocused, setIsEditorFocused] = (0, import_react18.useState)(false);
  const [mentionTarget, setMentionTarget] = (0, import_react18.useState)(null);
  const [mentionList, setMentionList] = (0, import_react18.useState)({ options: [], index: 0 });
  const mentionOptions = mentionList.options;
  const mentionIndex = mentionList.index;
  const [mentionSearch, setMentionSearch] = (0, import_react18.useState)("");
  const [mentionCategory, setMentionCategory] = (0, import_react18.useState)("all");
  const syncDocFocusContext = (0, import_react18.useCallback)(
    (isFocused) => {
      setDocFocusContext(buildDocFocusContext(editor, isFocused));
    },
    [editor]
  );
  const memberSpaces = useAppSelector(selectAllMemberSpaces);
  const currentSpace = useAppSelector(selectCurrentSpace);
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const favoriteAgentIds = useFavoriteAgentIds();
  const [favoriteAgents, setFavoriteAgents] = (0, import_react18.useState)([]);
  (0, import_react18.useEffect)(() => {
    if (!favoriteAgentIds || favoriteAgentIds.length === 0) {
      setFavoriteAgents([]);
      return;
    }
    let cancelled = false;
    const loadFavoriteAgents = async () => {
      const results = await Promise.all(
        favoriteAgentIds.map(async (agentKey) => {
          try {
            const agent = await dispatch(read({ dbKey: agentKey })).unwrap();
            if (!agent || cancelled) return null;
            const rawName = asTrimmedString(agent.name);
            const name = rawName || agentKey;
            return {
              agentKey,
              name,
              description: agent.description || agent.introduction || void 0
            };
          } catch {
            return { agentKey, name: agentKey };
          }
        })
      );
      if (!cancelled) {
        setFavoriteAgents(
          results.filter((item) => item !== null)
        );
      }
    };
    void loadFavoriteAgents();
    return () => {
      cancelled = true;
    };
  }, [favoriteAgentIds, dispatch]);
  const allOptions = (0, import_react18.useMemo)(() => {
    const options = [];
    options.push(...buildToolMentionOptions());
    if (currentSpace?.contents) {
      Object.entries(currentSpace.contents).forEach(([key, content]) => {
        if (content) {
          const item = content;
          options.push({
            id: item.contentKey || key,
            // prefer contentKey (dbKey)
            label: item.title || "Untitled",
            type: "page",
            // Using 'page' generically for content
            description: `File in ${currentSpace.name}`
          });
        }
      });
    }
    if (memberSpaces) {
      memberSpaces.forEach((space) => {
        const memberSpace = space;
        options.push({
          id: memberSpace.spaceId,
          label: memberSpace.spaceName,
          type: "space",
          // Using 'space' type
          description: `Space \u2022 ${memberSpace.role}`
        });
      });
    }
    favoriteAgents.forEach((agent) => {
      options.push({
        id: agent.agentKey,
        label: agent.name,
        type: "agent",
        description: agent.description
      });
    });
    return options;
  }, [memberSpaces, currentSpace, favoriteAgents]);
  (0, import_react18.useEffect)(() => {
    if (!mentionTarget) return;
    let lowerSearch = mentionSearch.toLowerCase();
    let currentCat = mentionCategory;
    let effectiveCategory = currentCat;
    if (lowerSearch.startsWith("page ")) {
      effectiveCategory = "page";
      lowerSearch = lowerSearch.slice(5);
    } else if (lowerSearch.startsWith("space ")) {
      effectiveCategory = "space";
      lowerSearch = lowerSearch.slice(6);
    } else if (lowerSearch.startsWith("agent ")) {
      effectiveCategory = "agent";
      lowerSearch = lowerSearch.slice(6);
    } else if (lowerSearch.startsWith("tool ")) {
      effectiveCategory = "tool";
      lowerSearch = lowerSearch.slice(5);
    }
    if (effectiveCategory !== mentionCategory) {
      setMentionCategory(effectiveCategory);
    }
    let filtered = allOptions.filter(
      (opt) => opt.label.toLowerCase().includes(lowerSearch) || opt.description?.toLowerCase().includes(lowerSearch)
    );
    if (effectiveCategory !== "all") {
      filtered = filtered.filter((opt) => opt.type === effectiveCategory);
    }
    if (effectiveCategory === "all") {
      filtered.sort((a, b) => {
        const priority = { agent: 4, space: 3, page: 2, tool: 1 };
        const pA = priority[a.type] || 0;
        const pB = priority[b.type] || 0;
        if (pA !== pB) return pB - pA;
        return 0;
      });
    }
    setMentionList({ options: filtered, index: 0 });
  }, [mentionSearch, allOptions, mentionCategory, mentionTarget]);
  const decorate = useDecorate(editor);
  const baseOnKeyDown = useOnKeyDown(editor);
  const highlightEnabled = (0, import_react18.useMemo)(
    () => !isStreaming && hasPlainCode,
    [isStreaming, hasPlainCode]
  );
  const renderElement = (0, import_react18.useCallback)(
    (elementProps) => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      ElementWrapper,
      {
        ...elementProps,
        isStreaming,
        highlightEnabled,
        readOnly
      }
    ),
    [isStreaming, highlightEnabled, readOnly]
  );
  const handleChange = (0, import_react18.useCallback)(
    (value) => {
      const isAstChange = editor.operations.some(
        (op) => op.type !== "set_selection"
      );
      console.log("[NoloEditor] handleChange called", {
        isAstChange,
        isComposing: isComposingRef.current,
        operations: editor.operations.map((op) => op.type),
        selection: editor.selection
      });
      syncDocFocusContext(true);
      if (!isAstChange) {
        console.log("[NoloEditor] handleChange -> not AST change, return");
        return;
      }
      setDocVersion((v) => v + 1);
      setHasPlainCode(hasPlainCodeBlock(value));
      setWordCount(countWords(value));
      if (isComposingRef.current) {
        console.log(
          "[NoloEditor] handleChange -> in composition, skip external onChange"
        );
        return;
      }
      console.log("[NoloEditor] handleChange -> call onChange", {
        selectionAfter: editor.selection
      });
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        const [start] = Range.edges(selection);
        const block = Editor.above(editor, {
          at: start,
          match: (n) => Editor.isBlock(editor, n)
        });
        if (block) {
          const [, blockPath] = block;
          const blockStart = Editor.start(editor, blockPath);
          const rangeBefore = { anchor: blockStart, focus: start };
          const textBefore = Editor.string(editor, rangeBefore);
          const lastAtIndex = textBefore.lastIndexOf("@");
          const potentialMention = lastAtIndex !== -1 ? textBefore.slice(lastAtIndex) : null;
          if (potentialMention && /^@[^\s]*$/.test(potentialMention)) {
            const charBeforeAt = lastAtIndex > 0 ? textBefore[lastAtIndex - 1] : null;
            const isWordStart = charBeforeAt === null || /\s/.test(charBeforeAt);
            if (isWordStart) {
              const mentionLength = potentialMention.length;
              const mentionStart = Editor.before(editor, start, {
                distance: mentionLength,
                unit: "character"
              });
              if (mentionStart) {
                setMentionTarget({ anchor: mentionStart, focus: start });
                setMentionSearch(potentialMention.slice(1));
                setMentionList(
                  (current) => current.index === 0 ? current : { ...current, index: 0 }
                );
              } else {
                setMentionTarget(null);
              }
            } else {
              setMentionTarget(null);
            }
          } else {
            setMentionTarget(null);
          }
        } else {
          setMentionTarget(null);
        }
      } else {
        setMentionTarget(null);
      }
      onChange?.(value);
    },
    [editor, onChange, syncDocFocusContext]
  );
  const handleDOMBeforeInput = (0, import_react18.useCallback)(
    (event) => {
      switch (event.inputType) {
        case "formatBold":
          event.preventDefault();
          toggleMark(editor, "bold");
          break;
        case "formatItalic":
          event.preventDefault();
          toggleMark(editor, "italic");
          break;
        case "formatUnderline":
          event.preventDefault();
          toggleMark(editor, "underline");
          break;
        default:
          break;
      }
    },
    [editor]
  );
  const handleKeyDown = (0, import_react18.useCallback)(
    (event) => {
      if (!readOnly && (event.key === "Backspace" || event.key === "Delete")) {
        const { selection } = editor;
        if (selection && Range.isCollapsed(selection)) {
          const [imageEntry] = Editor.nodes(editor, {
            at: selection,
            match: (n) => !Editor.isEditor(n) && Element2.isElement(n) && n.type === "image"
          });
          if (imageEntry) {
            event.preventDefault();
            const [, path] = imageEntry;
            Transforms.removeNodes(editor, { at: path });
            return;
          }
        }
      }
      baseOnKeyDown(event);
    },
    [editor, baseOnKeyDown, readOnly]
  );
  const onKeyDown = (0, import_react18.useCallback)(
    (event) => {
      if (mentionTarget && mentionOptions.length > 0) {
        switch (event.key) {
          case "ArrowDown":
            event.preventDefault();
            const prevIndex = mentionIndex >= mentionOptions.length - 1 ? 0 : mentionIndex + 1;
            setMentionList((current) => ({ ...current, index: prevIndex }));
            return;
          case "ArrowUp":
            event.preventDefault();
            const nextIndex = mentionIndex <= 0 ? mentionOptions.length - 1 : mentionIndex - 1;
            setMentionList((current) => ({ ...current, index: nextIndex }));
            return;
          case "Tab":
          case "Enter":
            event.preventDefault();
            if (mentionOptions[mentionIndex]) {
              insertOption(editor, mentionOptions[mentionIndex], mentionTarget);
              setMentionTarget(null);
            }
            return;
          case "Escape":
            event.preventDefault();
            setMentionTarget(null);
            return;
          case "ArrowRight":
          case "ArrowLeft":
            break;
        }
      }
      handleKeyDown(event);
    },
    [handleKeyDown, mentionTarget, mentionIndex, mentionOptions, editor]
  );
  const insertOption = (editor2, option, target) => {
    Transforms.select(editor2, target);
    const mention = {
      type: "mention",
      resourceType: option.type,
      resourceId: option.id,
      label: option.label,
      children: [{ text: "" }]
      // Void element must have empty text child
    };
    Transforms.insertNodes(editor2, mention);
    Transforms.move(editor2);
  };
  const handleDragOver = (0, import_react18.useCallback)(
    (event) => {
      if (readOnly) return;
      const { dataTransfer } = event;
      if (!dataTransfer) return;
      const types = Array.from(event.dataTransfer.types || []);
      const hasFiles = types.includes("Files");
      const isSlateFragment = types.includes("application/x-slate-fragment");
      if (!hasFiles || isSlateFragment) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingOver(true);
    },
    [readOnly]
  );
  const handleDragLeave = (0, import_react18.useCallback)(() => {
    if (isDraggingOver) {
      setIsDraggingOver(false);
    }
  }, [isDraggingOver]);
  const handleDrop = (0, import_react18.useCallback)(
    async (event) => {
      if (readOnly) return;
      const { dataTransfer } = event;
      if (!dataTransfer) return;
      const types = Array.from(event.dataTransfer.types || []);
      const hasFiles = types.includes("Files");
      const isSlateFragment = types.includes("application/x-slate-fragment");
      if (!hasFiles || isSlateFragment) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingOver(false);
      const imageFiles = filterImageFiles(
        Array.from(event.dataTransfer.files || [])
      );
      if (!imageFiles.length) return;
      const range = ReactEditor.findEventRange(editor, event);
      if (range) {
        Transforms.select(editor, range);
      }
      for (const file of imageFiles) {
        await insertImageFromFile(editor, dispatch, file, currentSpaceId || void 0);
      }
    },
    [dispatch, editor, readOnly, currentSpaceId]
  );
  const prismThemeCss = (0, import_react18.useMemo)(
    () => getPrismThemeCss(editorCodeTheme),
    [editorCodeTheme]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
    "div",
    {
      className: [
        "nolo-editor-container",
        !readOnly && isEditorFocused ? "nolo-editor-container--focused" : ""
      ].filter(Boolean).join(" "),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          Slate,
          {
            editor,
            initialValue,
            onChange: handleChange,
            children: [
              !readOnly && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "toolbar-container", children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(EditorToolbar, {}),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(HoveringToolbar, {}),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(TableContextMenu, {}),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  MentionList,
                  {
                    target: mentionTarget,
                    options: mentionOptions,
                    selectedIndex: mentionIndex,
                    category: mentionCategory,
                    onCategoryChange: setMentionCategory,
                    onSelect: (option) => {
                      if (mentionTarget) {
                        insertOption(editor, option, mentionTarget);
                        setMentionTarget(null);
                        setMentionCategory("all");
                      }
                    }
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                SetNodeToDecorations,
                {
                  highlightEnabled,
                  docVersion
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                Editable,
                {
                  renderPlaceholder: ({ attributes }) => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { ...attributes, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(PlaceHolder, {}) }),
                  readOnly,
                  decorate,
                  renderElement,
                  renderLeaf,
                  onKeyDown,
                  onDOMBeforeInput: handleDOMBeforeInput,
                  onDrop: handleDrop,
                  onDragOver: handleDragOver,
                  onDragLeave: handleDragLeave,
                  onBlur: () => {
                    setIsEditorFocused(false);
                    syncDocFocusContext(false);
                    onBlur?.();
                  },
                  onFocus: () => {
                    setIsEditorFocused(true);
                    syncDocFocusContext(true);
                  },
                  onCompositionStart: () => {
                    isComposingRef.current = true;
                    setIsEditorFocused(true);
                    syncDocFocusContext(true);
                    onCompositionChange?.(true);
                  },
                  onCompositionEnd: () => {
                    isComposingRef.current = false;
                    setIsEditorFocused(true);
                    syncDocFocusContext(true);
                    onCompositionChange?.(false);
                    onChange?.(editor.children);
                  },
                  style: isDraggingOver ? {
                    backgroundColor: "color-mix(in srgb, var(--primary) 6%, transparent)",
                    transition: "background-color 0.15s ease-out"
                  } : void 0
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("style", { children: prismThemeCss })
            ]
          }
        ),
        !readOnly && wordCountEnabled && !onWordCountChange && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "word-count-display", children: [
          wordCount,
          " \u5B57"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("style", { children: baseEditorStyles })
      ]
    }
  );
};
var Editor_default = NoloEditor;
var baseEditorStyles = `
  .nolo-editor-container {
    position: relative;
    padding: var(--space-1) 0;
    /* Full-bleed document canvas \u2014 no card/input chrome around the body. */
  }

  .toolbar-container {
    position: sticky;
    top: var(--space-2);
    margin-bottom: var(--space-2);
    padding: var(--space-1);
    z-index: 10;
  }

  .nolo-editor-container [data-slate-editor] {
    font-size: var(--fontSize-base);
    line-height: var(--leading-relaxed);
    color: var(--text);
    -webkit-text-size-adjust: 100%;
    outline: none;
    border: 0;
    border-radius: 0;
    background: transparent;
    padding: 0;
    /* Tall empty surface so empty pages feel like full-page writing, not a strip. */
    min-height: min(52vh, 28rem);
    /* Brighter caret for focus signal (no box ring). */
    caret-color: color-mix(in srgb, var(--primary) 72%, #0ea5e9 28%);
  }

  .nolo-editor-container [data-slate-editor]::selection,
  .nolo-editor-container [data-slate-editor] *::selection {
    background: color-mix(in srgb, var(--primary) 28%, transparent);
    color: inherit;
  }

  .nolo-editor-container a {
    color: var(--primary);
    text-decoration: none;
    cursor: pointer;
  }

  .nolo-editor-container a:hover {
    text-decoration: underline;
  }

  .inline-code {
    font-family:
      var(--font-mono, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace);
    background-color: var(--backgroundSecondary);
    color: var(--primary);
    padding: 0.1em 0.35em;
    border-radius: var(--radius-sm);
    font-size: 0.85em;
    border: 1px solid var(--border);
  }

  .word-count-display {
    position: absolute;
    right: var(--space-2, 8px);
    bottom: var(--space-1, 4px);
    font-size: 11px;
    font-weight: 400;
    color: var(--textQuaternary, var(--textTertiary, #a1a1aa));
    letter-spacing: 0.02em;
    user-select: none;
    opacity: 0.4;
    transition: opacity 0.2s ease;
    z-index: 2;
  }

  .word-count-display:hover {
    opacity: 0.85;
  }

  @media (max-width: 768px) {
    .nolo-editor-container {
      padding: 0;
    }

    .nolo-editor-container [data-slate-editor] {
      font-size: var(--fontSize-base);
      line-height: var(--leading-normal);
      min-height: min(48vh, 22rem);
    }

    .toolbar-container {
      padding: var(--space-1);
      margin-bottom: var(--space-1);
    }

    .inline-code {
      padding: 0.12em 0.35em;
      font-size: 0.9em;
    }

    .word-count-display {
      margin-top: var(--space-1);
    }
  }
`;

export {
  List,
  SafeLink,
  TextBlockRenderer,
  Editor_default
};
