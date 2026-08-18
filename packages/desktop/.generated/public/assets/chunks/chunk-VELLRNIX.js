import {
  $03e8ab2d84d7657a$export$4338b53315abf666,
  $081cb5757e08788e$export$24490316f764c430,
  $1969ac565cfec8d0$export$de79e2c695e052f3,
  $1e74c67db218ce67$export$f8168d8dd8fd66e6,
  $23f2114a1b82827e$export$4282f70798064fe0,
  $23f2114a1b82827e$export$b4f377a2b6254582,
  $23f2114a1b82827e$export$cd4e5573fbe2b576,
  $23f2114a1b82827e$export$e58f029f0fbfdb29,
  $2add3ce32c6007eb$export$6446a186d09e379e,
  $2add3ce32c6007eb$export$78551043582a6a98,
  $2add3ce32c6007eb$export$9ac100e40613ea10,
  $2add3ce32c6007eb$export$a11b0059900ceec8,
  $2add3ce32c6007eb$export$e1865c3bedcd822b,
  $2add3ce32c6007eb$export$fedb369cb70207f1,
  $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7,
  $390e54f620492c70$export$f680877a34711e37,
  $3b8b240c1bf84ab9$export$4c063cf1350e6fed,
  $3b8b240c1bf84ab9$export$bebd5a1431fec25d,
  $3e6197669829fe11$export$40bfa8c7b0832715,
  $48a7d519b337145d$export$4eaf04e54aa8eed6,
  $6a20a7989e6c817a$export$98658e8c59125e6a,
  $7230ffa83bc0c2cf$export$2881499e37b75b9a,
  $7230ffa83bc0c2cf$export$29f1550f4b0d4415,
  $7230ffa83bc0c2cf$export$4d86445c2cf5e3,
  $7230ffa83bc0c2cf$export$df3a06d6289f983e,
  $7230ffa83bc0c2cf$export$fabf2dc03a41866e,
  $8296dad1a4c5e0dc$export$8f71654801c2f7cd,
  $8e9d2fae0ecb9001$export$457c3d6518dd4c6f,
  $8f5a2122b0992be3$export$630ff653c5ada6a9,
  $8f5a2122b0992be3$export$b9b3dfddab17db27,
  $8f5a2122b0992be3$export$ec71b4b83ac08ec3,
  $a4e76a5424781910$export$e08e3b67e392101e,
  $a92dc41f639950be$export$525bc4921d56d4a,
  $a92dc41f639950be$export$715c682d09d639cc,
  $a92dc41f639950be$export$c2b7abe5d61ec696,
  $a92dc41f639950be$export$cabe61c495ee3649,
  $b5c62b033c25b96d$export$29bf1b5f2c56cf63,
  $b5c62b033c25b96d$export$60278871457622de,
  $b7115c395c64f7b5$export$4debdb1a3f0fa79e,
  $bbaa08b3cd72f041$export$9d1611c77c2fe928,
  $c4867b2f328c2698$export$e5c5a5f917a5871c,
  $c7eafbbe1ea5834e$export$535bd6ca7f90a273,
  $caaf0dd3060ed57c$export$7e924b3091a3bd18,
  $caaf0dd3060ed57c$export$95185d699e05d4d7,
  $caaf0dd3060ed57c$export$9a302a45f65d0572,
  $d1116acdf220c2da$export$4c014de7c8940b4c,
  $d1116acdf220c2da$export$f9762fab77588ecb,
  $d447af545b77c9f1$export$b204af158042fbac,
  $d447af545b77c9f1$export$f21a1ffae260145a,
  $e969f22b6713ca4a$export$ae780daf29e6d456,
  $f192c2f16961cbe0$export$80f3e147d781571c,
  $fe16bffc7a557bf0$export$7f54fc3180508a52
} from "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __commonJS,
  __privateAdd,
  __privateGet,
  __privateSet,
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/react-aria/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js
var require_use_sync_external_store_shim_development = __commonJS({
  "node_modules/react-aria/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js"(exports) {
    "use strict";
    (function() {
      function is(x, y) {
        return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
      }
      function useSyncExternalStore$2(subscribe, getSnapshot) {
        didWarnOld18Alpha || void 0 === React.startTransition || (didWarnOld18Alpha = true, console.error(
          "You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release."
        ));
        var value = getSnapshot();
        if (!didWarnUncachedGetSnapshot) {
          var cachedValue = getSnapshot();
          objectIs(value, cachedValue) || (console.error(
            "The result of getSnapshot should be cached to avoid an infinite loop"
          ), didWarnUncachedGetSnapshot = true);
        }
        cachedValue = useState({
          inst: { value, getSnapshot }
        });
        var inst = cachedValue[0].inst, forceUpdate = cachedValue[1];
        useLayoutEffect(
          function() {
            inst.value = value;
            inst.getSnapshot = getSnapshot;
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          },
          [subscribe, value, getSnapshot]
        );
        useEffect(
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
      var React = require_react(), objectIs = "function" === typeof Object.is ? Object.is : is, useState = React.useState, useEffect = React.useEffect, useLayoutEffect = React.useLayoutEffect, useDebugValue = React.useDebugValue, didWarnOld18Alpha = false, didWarnUncachedGetSnapshot = false, shim = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
      exports.useSyncExternalStore = void 0 !== React.useSyncExternalStore ? React.useSyncExternalStore : shim;
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// node_modules/react-aria/node_modules/use-sync-external-store/shim/index.js
var require_shim = __commonJS({
  "node_modules/react-aria/node_modules/use-sync-external-store/shim/index.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_use_sync_external_store_shim_development();
    }
  }
});

// node_modules/react-aria/dist/private/collections/BaseCollection.mjs
var $6f0c29017aeec335$export$d68d59712b04d9d1 = class {
  constructor(key) {
    this.value = null;
    this.level = 0;
    this.hasChildNodes = false;
    this.rendered = null;
    this.textValue = "";
    this["aria-label"] = void 0;
    this.index = 0;
    this.parentKey = null;
    this.prevKey = null;
    this.nextKey = null;
    this.firstChildKey = null;
    this.lastChildKey = null;
    this.props = {};
    this.colSpan = null;
    this.colIndex = null;
    this.type = this.constructor.type;
    this.key = key;
  }
  get childNodes() {
    throw new Error("childNodes is not supported");
  }
  clone() {
    let node = new this.constructor(this.key);
    node.value = this.value;
    node.level = this.level;
    node.hasChildNodes = this.hasChildNodes;
    node.rendered = this.rendered;
    node.textValue = this.textValue;
    node["aria-label"] = this["aria-label"];
    node.index = this.index;
    node.parentKey = this.parentKey;
    node.prevKey = this.prevKey;
    node.nextKey = this.nextKey;
    node.firstChildKey = this.firstChildKey;
    node.lastChildKey = this.lastChildKey;
    node.props = this.props;
    node.render = this.render;
    node.colSpan = this.colSpan;
    node.colIndex = this.colIndex;
    return node;
  }
  filter(collection, newCollection, filterFn) {
    let clone = this.clone();
    newCollection.addDescendants(clone, collection);
    return clone;
  }
};
var $6f0c29017aeec335$export$b1918e978f1ee46f = class extends $6f0c29017aeec335$export$d68d59712b04d9d1 {
  filter(collection, newCollection, filterFn) {
    let [firstKey, lastKey] = $6f0c29017aeec335$var$filterChildren(collection, newCollection, this.firstChildKey, filterFn);
    let newNode = this.clone();
    newNode.firstChildKey = firstKey;
    newNode.lastChildKey = lastKey;
    return newNode;
  }
};
var _$6f0c29017aeec335$export$5ae2504e948afce5 = class _$6f0c29017aeec335$export$5ae2504e948afce5 extends $6f0c29017aeec335$export$d68d59712b04d9d1 {
};
_$6f0c29017aeec335$export$5ae2504e948afce5.type = "header";
var $6f0c29017aeec335$export$5ae2504e948afce5 = _$6f0c29017aeec335$export$5ae2504e948afce5;
var _$6f0c29017aeec335$export$8258a0665a675899 = class _$6f0c29017aeec335$export$8258a0665a675899 extends $6f0c29017aeec335$export$d68d59712b04d9d1 {
};
_$6f0c29017aeec335$export$8258a0665a675899.type = "loader";
var $6f0c29017aeec335$export$8258a0665a675899 = _$6f0c29017aeec335$export$8258a0665a675899;
var _$6f0c29017aeec335$export$fd11f34e1d07f134 = class _$6f0c29017aeec335$export$fd11f34e1d07f134 extends $6f0c29017aeec335$export$b1918e978f1ee46f {
  filter(collection, newCollection, filterFn) {
    if (filterFn(this.textValue, this)) {
      let clone = this.clone();
      newCollection.addDescendants(clone, collection);
      return clone;
    }
    return null;
  }
};
_$6f0c29017aeec335$export$fd11f34e1d07f134.type = "item";
var $6f0c29017aeec335$export$fd11f34e1d07f134 = _$6f0c29017aeec335$export$fd11f34e1d07f134;
var _$6f0c29017aeec335$export$437f11dc9b403b78 = class _$6f0c29017aeec335$export$437f11dc9b403b78 extends $6f0c29017aeec335$export$b1918e978f1ee46f {
  filter(collection, newCollection, filterFn) {
    let filteredSection = super.filter(collection, newCollection, filterFn);
    if (filteredSection) {
      if (filteredSection.lastChildKey !== null) {
        let lastChild = collection.getItem(filteredSection.lastChildKey);
        if (lastChild && lastChild.type !== "header") return filteredSection;
      }
    }
    return null;
  }
};
_$6f0c29017aeec335$export$437f11dc9b403b78.type = "section";
var $6f0c29017aeec335$export$437f11dc9b403b78 = _$6f0c29017aeec335$export$437f11dc9b403b78;
var $6f0c29017aeec335$export$408d25a4e12db025 = class {
  get size() {
    return this.itemCount;
  }
  getKeys() {
    return this.keyMap.keys();
  }
  *[Symbol.iterator]() {
    let node = this.firstKey != null ? this.keyMap.get(this.firstKey) : void 0;
    while (node) {
      yield node;
      node = node.nextKey != null ? this.keyMap.get(node.nextKey) : void 0;
    }
  }
  getChildren(key) {
    let keyMap = this.keyMap;
    return {
      *[Symbol.iterator]() {
        let parent = keyMap.get(key);
        let node = parent?.firstChildKey != null ? keyMap.get(parent.firstChildKey) : null;
        while (node) {
          yield node;
          node = node.nextKey != null ? keyMap.get(node.nextKey) : void 0;
        }
      }
    };
  }
  getKeyBefore(key) {
    let node = this.keyMap.get(key);
    if (!node) return null;
    if (node.prevKey != null) {
      node = this.keyMap.get(node.prevKey);
      while (node && node.type !== "item" && node.lastChildKey != null) node = this.keyMap.get(node.lastChildKey);
      return node?.key ?? null;
    }
    return node.parentKey;
  }
  getKeyAfter(key) {
    let node = this.keyMap.get(key);
    if (!node) return null;
    if (node.type !== "item" && node.firstChildKey != null) return node.firstChildKey;
    while (node) {
      if (node.nextKey != null) return node.nextKey;
      if (node.parentKey != null) node = this.keyMap.get(node.parentKey);
      else return null;
    }
    return null;
  }
  getFirstKey() {
    return this.firstKey;
  }
  getLastKey() {
    let node = this.lastKey != null ? this.keyMap.get(this.lastKey) : null;
    while (node?.lastChildKey != null) node = this.keyMap.get(node.lastChildKey);
    return node?.key ?? null;
  }
  getItem(key) {
    return this.keyMap.get(key) ?? null;
  }
  at() {
    throw new Error("Not implemented");
  }
  clone() {
    let Constructor = this.constructor;
    let collection = new Constructor();
    collection.keyMap = new Map(this.keyMap);
    collection.firstKey = this.firstKey;
    collection.lastKey = this.lastKey;
    collection.itemCount = this.itemCount;
    return collection;
  }
  addNode(node) {
    if (this.frozen) throw new Error("Cannot add a node to a frozen collection");
    if (node.type === "item" && this.keyMap.get(node.key) == null) this.itemCount++;
    this.keyMap.set(node.key, node);
  }
  // Deeply add a node and its children to the collection from another collection, primarily used when filtering a collection
  addDescendants(node, oldCollection) {
    this.addNode(node);
    let children = oldCollection.getChildren(node.key);
    for (let child of children) this.addDescendants(child, oldCollection);
  }
  removeNode(key) {
    if (this.frozen) throw new Error("Cannot remove a node to a frozen collection");
    let node = this.keyMap.get(key);
    if (node != null && node.type === "item") this.itemCount--;
    this.keyMap.delete(key);
  }
  commit(firstKey, lastKey, isSSR = false) {
    if (this.frozen) throw new Error("Cannot commit a frozen collection");
    this.firstKey = firstKey;
    this.lastKey = lastKey;
    this.frozen = !isSSR;
  }
  filter(filterFn) {
    let newCollection = new this.constructor();
    let [firstKey, lastKey] = $6f0c29017aeec335$var$filterChildren(this, newCollection, this.firstKey, filterFn);
    newCollection?.commit(firstKey, lastKey);
    return newCollection;
  }
  constructor() {
    this.keyMap = /* @__PURE__ */ new Map();
    this.firstKey = null;
    this.lastKey = null;
    this.frozen = false;
    this.itemCount = 0;
  }
};
function $6f0c29017aeec335$var$filterChildren(collection, newCollection, firstChildKey, filterFn) {
  if (firstChildKey == null) return [
    null,
    null
  ];
  let firstNode = null;
  let lastNode = null;
  let currentNode = collection.getItem(firstChildKey);
  while (currentNode != null) {
    let newNode = currentNode.filter(collection, newCollection, filterFn);
    if (newNode != null) {
      newNode.nextKey = null;
      if (lastNode) {
        newNode.prevKey = lastNode.key;
        lastNode.nextKey = newNode.key;
      }
      if (firstNode == null) firstNode = newNode;
      newCollection.addNode(newNode);
      lastNode = newNode;
    }
    currentNode = currentNode.nextKey != null ? collection.getItem(currentNode.nextKey) : null;
  }
  if (lastNode && lastNode.type === "separator") {
    let prevKey = lastNode.prevKey;
    newCollection.removeNode(lastNode.key);
    if (prevKey != null) {
      lastNode = newCollection.getItem(prevKey);
      lastNode.nextKey = null;
    } else lastNode = null;
  }
  return [
    firstNode?.key ?? null,
    lastNode?.key ?? null
  ];
}

// node_modules/react-aria/dist/private/collections/Hidden.mjs
var import_react = __toESM(require_react(), 1);
if (typeof HTMLTemplateElement !== "undefined") {
  Object.defineProperty(HTMLTemplateElement.prototype, "firstChild", {
    configurable: true,
    enumerable: true,
    get: function() {
      return this.content.firstChild;
    }
  });
  Object.defineProperty(HTMLTemplateElement.prototype, "appendChild", {
    configurable: true,
    enumerable: true,
    value: function(node) {
      return this.content.appendChild(node);
    }
  });
  Object.defineProperty(HTMLTemplateElement.prototype, "removeChild", {
    configurable: true,
    enumerable: true,
    value: function(node) {
      return this.content.removeChild(node);
    }
  });
  Object.defineProperty(HTMLTemplateElement.prototype, "insertBefore", {
    configurable: true,
    enumerable: true,
    value: function(node, child) {
      return this.content.insertBefore(node, child);
    }
  });
}
var $d7f64c32b702fe2c$export$94b6d0abf7d33e8c = /* @__PURE__ */ (0, import_react.createContext)(false);
function $d7f64c32b702fe2c$export$8dc98ba7eadeaa56(props) {
  let isHidden = (0, import_react.useContext)($d7f64c32b702fe2c$export$94b6d0abf7d33e8c);
  if (isHidden)
    return /* @__PURE__ */ (0, import_react.default).createElement((0, import_react.default).Fragment, null, props.children);
  let children = /* @__PURE__ */ (0, import_react.default).createElement($d7f64c32b702fe2c$export$94b6d0abf7d33e8c.Provider, {
    value: true
  }, props.children);
  return /* @__PURE__ */ (0, import_react.default).createElement("template", null, children);
}
function $d7f64c32b702fe2c$export$86427a43e3e48ebb(fn) {
  let Wrapper = (props, ref) => {
    let isHidden = (0, import_react.useContext)($d7f64c32b702fe2c$export$94b6d0abf7d33e8c);
    if (isHidden) return null;
    return fn(props, ref);
  };
  Wrapper.displayName = fn.displayName || fn.name;
  return (0, import_react.forwardRef)(Wrapper);
}
function $d7f64c32b702fe2c$export$b5d7cc18bb8d2b59() {
  return (0, import_react.useContext)($d7f64c32b702fe2c$export$94b6d0abf7d33e8c);
}

// node_modules/react-aria/dist/private/collections/Document.mjs
var $96ead35620b8fd36$export$410b0c854570d131 = class {
  constructor(ownerDocument) {
    this._firstChild = null;
    this._lastChild = null;
    this._previousSibling = null;
    this._nextSibling = null;
    this._parentNode = null;
    this._minInvalidChildIndex = null;
    this.ownerDocument = ownerDocument;
  }
  *[Symbol.iterator]() {
    let node = this.firstChild;
    while (node) {
      yield node;
      node = node.nextSibling;
    }
  }
  get firstChild() {
    return this._firstChild;
  }
  set firstChild(firstChild) {
    this._firstChild = firstChild;
    this.ownerDocument.markDirty(this);
  }
  get lastChild() {
    return this._lastChild;
  }
  set lastChild(lastChild) {
    this._lastChild = lastChild;
    this.ownerDocument.markDirty(this);
  }
  get previousSibling() {
    return this._previousSibling;
  }
  set previousSibling(previousSibling) {
    this._previousSibling = previousSibling;
    this.ownerDocument.markDirty(this);
  }
  get nextSibling() {
    return this._nextSibling;
  }
  set nextSibling(nextSibling) {
    this._nextSibling = nextSibling;
    this.ownerDocument.markDirty(this);
  }
  get parentNode() {
    return this._parentNode;
  }
  set parentNode(parentNode) {
    this._parentNode = parentNode;
    this.ownerDocument.markDirty(this);
  }
  get isConnected() {
    return this.parentNode?.isConnected || false;
  }
  invalidateChildIndices(child) {
    if (this._minInvalidChildIndex == null || !this._minInvalidChildIndex.isConnected || child.index < this._minInvalidChildIndex.index) {
      this._minInvalidChildIndex = child;
      this.ownerDocument.markDirty(this);
    }
  }
  updateChildIndices() {
    let node = this._minInvalidChildIndex;
    while (node) {
      node.index = node.previousSibling ? node.previousSibling.index + 1 : 0;
      node = node.nextSibling;
    }
    this._minInvalidChildIndex = null;
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    if (this.firstChild == null) this.firstChild = child;
    if (this.lastChild) {
      this.lastChild.nextSibling = child;
      child.index = this.lastChild.index + 1;
      child.previousSibling = this.lastChild;
    } else {
      child.previousSibling = null;
      child.index = 0;
    }
    child.parentNode = this;
    child.nextSibling = null;
    this.lastChild = child;
    this.ownerDocument.markDirty(this);
    if (this.isConnected) this.ownerDocument.queueUpdate();
  }
  insertBefore(newNode, referenceNode) {
    if (referenceNode == null) return this.appendChild(newNode);
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    newNode.nextSibling = referenceNode;
    newNode.previousSibling = referenceNode.previousSibling;
    newNode.index = referenceNode.index - 1;
    if (this.firstChild === referenceNode) this.firstChild = newNode;
    else if (referenceNode.previousSibling) referenceNode.previousSibling.nextSibling = newNode;
    referenceNode.previousSibling = newNode;
    newNode.parentNode = referenceNode.parentNode;
    this.invalidateChildIndices(newNode);
    if (this.isConnected) this.ownerDocument.queueUpdate();
  }
  removeChild(child) {
    if (child.parentNode !== this) return;
    if (this._minInvalidChildIndex === child) this._minInvalidChildIndex = null;
    if (child.nextSibling) {
      this.invalidateChildIndices(child.nextSibling);
      child.nextSibling.previousSibling = child.previousSibling;
    }
    if (child.previousSibling) child.previousSibling.nextSibling = child.nextSibling;
    if (this.firstChild === child) this.firstChild = child.nextSibling;
    if (this.lastChild === child) this.lastChild = child.previousSibling;
    child.parentNode = null;
    child.nextSibling = null;
    child.previousSibling = null;
    child.index = 0;
    this.ownerDocument.markDirty(child);
    if (this.isConnected) this.ownerDocument.queueUpdate();
  }
  addEventListener() {
  }
  removeEventListener() {
  }
  get previousVisibleSibling() {
    let node = this.previousSibling;
    while (node && node.isHidden) node = node.previousSibling;
    return node;
  }
  get nextVisibleSibling() {
    let node = this.nextSibling;
    while (node && node.isHidden) node = node.nextSibling;
    return node;
  }
  get firstVisibleChild() {
    let node = this.firstChild;
    while (node && node.isHidden) node = node.nextSibling;
    return node;
  }
  get lastVisibleChild() {
    let node = this.lastChild;
    while (node && node.isHidden) node = node.previousSibling;
    return node;
  }
};
var $96ead35620b8fd36$export$dc064fe9e59310fd = class _$96ead35620b8fd36$export$dc064fe9e59310fd extends $96ead35620b8fd36$export$410b0c854570d131 {
  constructor(type, ownerDocument) {
    super(ownerDocument), this.nodeType = 8, this.isMutated = true, this._index = 0, this.isHidden = false;
    this.node = null;
  }
  get index() {
    return this._index;
  }
  set index(index) {
    this._index = index;
    this.ownerDocument.markDirty(this);
  }
  get level() {
    if (this.parentNode instanceof _$96ead35620b8fd36$export$dc064fe9e59310fd) return this.parentNode.level + (this.parentNode.node?.type === "item" ? 1 : 0);
    return 0;
  }
  /**
  * Lazily gets a mutable instance of a Node. If the node has already
  * been cloned during this update cycle, it just returns the existing one.
  */
  getMutableNode() {
    if (this.node == null) return null;
    if (!this.isMutated) {
      this.node = this.node.clone();
      this.isMutated = true;
    }
    this.ownerDocument.markDirty(this);
    return this.node;
  }
  updateNode() {
    let nextSibling = this.nextVisibleSibling;
    let node = this.getMutableNode();
    if (node == null) return;
    node.index = this.index;
    node.level = this.level;
    node.parentKey = this.parentNode instanceof _$96ead35620b8fd36$export$dc064fe9e59310fd ? this.parentNode.node?.key ?? null : null;
    node.prevKey = this.previousVisibleSibling?.node?.key ?? null;
    node.nextKey = nextSibling?.node?.key ?? null;
    node.hasChildNodes = !!this.firstChild;
    node.firstChildKey = this.firstVisibleChild?.node?.key ?? null;
    node.lastChildKey = this.lastVisibleChild?.node?.key ?? null;
    if ((node.colSpan != null || node.colIndex != null) && nextSibling) {
      let nextColIndex = (node.colIndex ?? node.index) + (node.colSpan ?? 1);
      if (nextSibling.node != null && nextColIndex !== nextSibling.node.colIndex) {
        let siblingNode = nextSibling.getMutableNode();
        siblingNode.colIndex = nextColIndex;
      }
    }
  }
  setProps(obj, ref, CollectionNodeClass, rendered, render) {
    let node;
    let { value: value1, textValue, id, ...props } = obj;
    if (this.node == null) {
      node = new CollectionNodeClass(id ?? `react-aria-${++this.ownerDocument.nodeId}`);
      this.node = node;
    } else node = this.getMutableNode();
    props.ref = ref;
    node.props = props;
    node.rendered = rendered;
    node.render = render;
    node.value = value1;
    if (obj["aria-label"]) node["aria-label"] = obj["aria-label"];
    node.textValue = textValue || (typeof props.children === "string" ? props.children : "") || obj["aria-label"] || "";
    if (id != null && id !== node.key) throw new Error("Cannot change the id of an item");
    if (props.colSpan != null) node.colSpan = props.colSpan;
    if (this.isConnected) this.ownerDocument.queueUpdate();
  }
  get style() {
    let element = this;
    return {
      get display() {
        return element.isHidden ? "none" : "";
      },
      set display(value) {
        let isHidden = value === "none";
        if (element.isHidden !== isHidden) {
          if (element.parentNode?.firstVisibleChild === element || element.parentNode?.lastVisibleChild === element) element.ownerDocument.markDirty(element.parentNode);
          let prev = element.previousVisibleSibling;
          let next = element.nextVisibleSibling;
          if (prev) element.ownerDocument.markDirty(prev);
          if (next) element.ownerDocument.markDirty(next);
          element.isHidden = isHidden;
          element.ownerDocument.markDirty(element);
        }
      }
    };
  }
  hasAttribute() {
  }
  setAttribute() {
  }
  setAttributeNS() {
  }
  removeAttribute() {
  }
};
var $96ead35620b8fd36$export$b34a105447964f9f = class extends $96ead35620b8fd36$export$410b0c854570d131 {
  constructor(collection) {
    super(null), this.nodeType = 11, this.ownerDocument = this, this.dirtyNodes = /* @__PURE__ */ new Set(), this.isSSR = false, this.nodeId = 0, this.nodesByProps = /* @__PURE__ */ new WeakMap(), this.nextCollection = null, this.subscriptions = /* @__PURE__ */ new Set(), this.queuedRender = false, this.inSubscription = false;
    this.collection = collection;
    this.nextCollection = collection;
  }
  get isConnected() {
    return true;
  }
  createElement(type) {
    return new $96ead35620b8fd36$export$dc064fe9e59310fd(type, this);
  }
  getMutableCollection() {
    if (!this.nextCollection) this.nextCollection = this.collection.clone();
    return this.nextCollection;
  }
  markDirty(node) {
    this.dirtyNodes.add(node);
  }
  addNode(element) {
    if (element.isHidden || element.node == null) return;
    let collection = this.getMutableCollection();
    if (!collection.getItem(element.node.key)) for (let child of element) this.addNode(child);
    collection.addNode(element.node);
  }
  removeNode(node) {
    for (let child of node) this.removeNode(child);
    if (node.node) {
      let collection = this.getMutableCollection();
      collection.removeNode(node.node.key);
    }
  }
  /** Finalizes the collection update, updating all nodes and freezing the collection. */
  getCollection() {
    if (this.inSubscription) return this.collection;
    this.queuedRender = false;
    this.updateCollection();
    return this.collection;
  }
  updateCollection() {
    for (let element of this.dirtyNodes) if (element instanceof $96ead35620b8fd36$export$dc064fe9e59310fd && (!element.isConnected || element.isHidden)) this.removeNode(element);
    else element.updateChildIndices();
    for (let element of this.dirtyNodes) if (element instanceof $96ead35620b8fd36$export$dc064fe9e59310fd) {
      if (element.isConnected && !element.isHidden) {
        element.updateNode();
        this.addNode(element);
      }
      if (element.node) this.dirtyNodes.delete(element);
      element.isMutated = false;
    } else this.dirtyNodes.delete(element);
    if (this.nextCollection) {
      this.nextCollection.commit(this.firstVisibleChild?.node?.key ?? null, this.lastVisibleChild?.node?.key ?? null, this.isSSR);
      if (!this.isSSR) {
        this.collection = this.nextCollection;
        this.nextCollection = null;
      }
    }
  }
  queueUpdate() {
    if (this.dirtyNodes.size === 0 || this.queuedRender) return;
    this.queuedRender = true;
    this.inSubscription = true;
    if (!this.isSSR) this.collection = this.collection.clone();
    for (let fn of this.subscriptions) fn();
    this.inSubscription = false;
  }
  subscribe(fn) {
    this.subscriptions.add(fn);
    if (this.queuedRender) fn();
    return () => this.subscriptions.delete(fn);
  }
  resetAfterSSR() {
    if (this.isSSR) {
      this.isSSR = false;
      this.firstChild = null;
      this.lastChild = null;
      this.nodeId = 0;
    }
  }
};

// node_modules/react-aria/dist/private/collections/useCachedChildren.mjs
var import_react2 = __toESM(require_react(), 1);
function $a80bd3e9349588e7$export$727c8fc270210f13(props) {
  let { children, items, idScope, addIdAndValue, dependencies = [] } = props;
  let childrenString = (0, import_react2.useMemo)(() => typeof children === "function" ? children.toString() : void 0, [
    children
  ]);
  let cache = (0, import_react2.useMemo)(() => /* @__PURE__ */ new WeakMap(), [
    ...dependencies,
    childrenString
  ]);
  return (0, import_react2.useMemo)(() => {
    if (items && typeof children === "function") {
      let res = [];
      for (let item of items) {
        let cacheKey = $a80bd3e9349588e7$var$isWeakKey(item) ? item : null;
        let rendered = cacheKey ? cache.get(cacheKey) : null;
        if (!rendered) {
          rendered = children(item);
          let id = rendered.props.id ?? item?.key ?? item?.id;
          if (idScope != null && rendered.props.id == null && id != null) id = idScope + ":" + id;
          let key = id ?? res.length;
          rendered = (0, import_react2.cloneElement)(rendered, addIdAndValue ? {
            key,
            id,
            value: item
          } : {
            key
          });
          if (cacheKey) cache.set(cacheKey, rendered);
        }
        res.push(rendered);
      }
      return res;
    } else if (typeof children !== "function") return children;
  }, [
    children,
    items,
    cache,
    idScope,
    addIdAndValue
  ]);
}
function $a80bd3e9349588e7$var$isWeakKey(value) {
  switch (typeof value) {
    case "object":
      return value != null;
    case "function":
    case "symbol":
      return true;
    default:
      return false;
  }
}

// node_modules/react-aria/dist/private/collections/CollectionBuilder.mjs
var import_react_dom = __toESM(require_react_dom(), 1);
var import_react3 = __toESM(require_react(), 1);
var import_shim = __toESM(require_shim(), 1);
var $42ceafc619f9c3ba$var$ShallowRenderContext = /* @__PURE__ */ (0, import_react3.createContext)(false);
var $42ceafc619f9c3ba$var$CollectionDocumentContext = /* @__PURE__ */ (0, import_react3.createContext)(null);
function $42ceafc619f9c3ba$export$bf788dd355e3a401(props) {
  let doc = (0, import_react3.useContext)($42ceafc619f9c3ba$var$CollectionDocumentContext);
  if (doc)
    return props.content;
  let { collection, document: document2 } = $42ceafc619f9c3ba$var$useCollectionDocument(props.createCollection);
  return /* @__PURE__ */ (0, import_react3.default).createElement((0, import_react3.default).Fragment, null, /* @__PURE__ */ (0, import_react3.default).createElement((0, $d7f64c32b702fe2c$export$8dc98ba7eadeaa56), null, /* @__PURE__ */ (0, import_react3.default).createElement($42ceafc619f9c3ba$var$CollectionDocumentContext.Provider, {
    value: document2
  }, props.content)), /* @__PURE__ */ (0, import_react3.default).createElement($42ceafc619f9c3ba$var$CollectionInner, {
    render: props.children,
    collection
  }));
}
function $42ceafc619f9c3ba$var$CollectionInner({ collection, render }) {
  return render(collection);
}
function $42ceafc619f9c3ba$var$useSyncExternalStoreFallback(subscribe, getSnapshot, getServerSnapshot) {
  let isSSR = (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)();
  let isSSRRef = (0, import_react3.useRef)(isSSR);
  isSSRRef.current = isSSR;
  let getSnapshotWrapper = (0, import_react3.useCallback)(() => {
    return isSSRRef.current ? getServerSnapshot() : getSnapshot();
  }, [
    getSnapshot,
    getServerSnapshot
  ]);
  return (0, import_shim.useSyncExternalStore)(subscribe, getSnapshotWrapper);
}
var $42ceafc619f9c3ba$var$useSyncExternalStore = typeof (0, import_react3.default)["useSyncExternalStore"] === "function" ? (0, import_react3.default)["useSyncExternalStore"] : $42ceafc619f9c3ba$var$useSyncExternalStoreFallback;
function $42ceafc619f9c3ba$var$useCollectionDocument(createCollection) {
  let [document2] = (0, import_react3.useState)(() => new (0, $96ead35620b8fd36$export$b34a105447964f9f)(createCollection?.() || new (0, $6f0c29017aeec335$export$408d25a4e12db025)()));
  let subscribe = (0, import_react3.useCallback)((fn) => document2.subscribe(fn), [
    document2
  ]);
  let getSnapshot = (0, import_react3.useCallback)(() => {
    let collection2 = document2.getCollection();
    if (document2.isSSR)
      document2.resetAfterSSR();
    return collection2;
  }, [
    document2
  ]);
  let getServerSnapshot = (0, import_react3.useCallback)(() => {
    document2.isSSR = true;
    return document2.getCollection();
  }, [
    document2
  ]);
  let collection = $42ceafc619f9c3ba$var$useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    collection,
    document: document2
  };
}
var $42ceafc619f9c3ba$var$SSRContext = /* @__PURE__ */ (0, import_react3.createContext)(null);
function $42ceafc619f9c3ba$var$createCollectionNodeClass(type) {
  var _a;
  let NodeClass = (_a = class extends (0, $6f0c29017aeec335$export$d68d59712b04d9d1) {
  }, _a.type = type, _a);
  return NodeClass;
}
function $42ceafc619f9c3ba$var$useSSRCollectionNode(CollectionNodeClass, props, ref, rendered, children, render) {
  if (typeof CollectionNodeClass === "string")
    CollectionNodeClass = $42ceafc619f9c3ba$var$createCollectionNodeClass(CollectionNodeClass);
  let itemRef = (0, import_react3.useCallback)((element) => {
    element?.setProps(props, ref, CollectionNodeClass, rendered, render);
  }, [
    props,
    ref,
    rendered,
    render,
    CollectionNodeClass
  ]);
  let parentNode = (0, import_react3.useContext)($42ceafc619f9c3ba$var$SSRContext);
  if (parentNode) {
    let element = parentNode.ownerDocument.nodesByProps.get(props);
    if (!element) {
      element = parentNode.ownerDocument.createElement(CollectionNodeClass.type);
      element.setProps(props, ref, CollectionNodeClass, rendered, render);
      parentNode.appendChild(element);
      parentNode.ownerDocument.updateCollection();
      parentNode.ownerDocument.nodesByProps.set(props, element);
    }
    return children ? /* @__PURE__ */ (0, import_react3.default).createElement($42ceafc619f9c3ba$var$SSRContext.Provider, {
      value: element
    }, children) : null;
  }
  return /* @__PURE__ */ (0, import_react3.default).createElement(CollectionNodeClass.type, {
    ref: itemRef
  }, children);
}
function $42ceafc619f9c3ba$export$18af5c7a9e9b3664(CollectionNodeClass, render) {
  let Component = ({ node }) => render(node.props, node.props.ref, node);
  let Result = (0, import_react3.forwardRef)((props, ref) => {
    let focusableProps = (0, import_react3.useContext)((0, $d1116acdf220c2da$export$f9762fab77588ecb));
    let isShallow = (0, import_react3.useContext)($42ceafc619f9c3ba$var$ShallowRenderContext);
    if (!isShallow) {
      if (render.length >= 3) throw new Error(render.name + " cannot be rendered outside a collection.");
      return render(props, ref);
    }
    return $42ceafc619f9c3ba$var$useSSRCollectionNode(CollectionNodeClass, props, ref, "children" in props ? props.children : null, null, (node) => (
      // Forward FocusableContext to real DOM tree so tooltips work.
      /* @__PURE__ */ (0, import_react3.default).createElement((0, $d1116acdf220c2da$export$f9762fab77588ecb).Provider, {
        value: focusableProps
      }, /* @__PURE__ */ (0, import_react3.default).createElement(Component, {
        node
      }))
    ));
  });
  Result.displayName = render.name;
  return Result;
}
function $42ceafc619f9c3ba$export$e953bb1cd0f19726(CollectionNodeClass, render, useChildren = $42ceafc619f9c3ba$var$useCollectionChildren) {
  let Component = ({ node }) => render(node.props, node.props.ref, node);
  let Result = (0, import_react3.forwardRef)((props, ref) => {
    let children = useChildren(props);
    return $42ceafc619f9c3ba$var$useSSRCollectionNode(CollectionNodeClass, props, ref, null, children, (node) => /* @__PURE__ */ (0, import_react3.default).createElement(Component, {
      node
    })) ?? /* @__PURE__ */ (0, import_react3.default).createElement((0, import_react3.default).Fragment, null);
  });
  Result.displayName = render.name;
  return Result;
}
function $42ceafc619f9c3ba$var$useCollectionChildren(options) {
  return (0, $a80bd3e9349588e7$export$727c8fc270210f13)({
    ...options,
    addIdAndValue: true
  });
}
var $42ceafc619f9c3ba$var$CollectionContext = /* @__PURE__ */ (0, import_react3.createContext)(null);
function $42ceafc619f9c3ba$export$fb8073518f34e6ec(props) {
  let ctx = (0, import_react3.useContext)($42ceafc619f9c3ba$var$CollectionContext);
  let dependencies = (ctx?.dependencies || []).concat(props.dependencies);
  let idScope = props.idScope ?? ctx?.idScope;
  let children = $42ceafc619f9c3ba$var$useCollectionChildren({
    ...props,
    idScope,
    dependencies
  });
  let doc = (0, import_react3.useContext)($42ceafc619f9c3ba$var$CollectionDocumentContext);
  if (doc) children = /* @__PURE__ */ (0, import_react3.default).createElement($42ceafc619f9c3ba$var$CollectionRoot, null, children);
  ctx = (0, import_react3.useMemo)(
    () => ({
      dependencies: (
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        dependencies
      ),
      idScope
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // oxlint-disable-next-line react/react-compiler, react-hooks/exhaustive-deps
    [
      idScope,
      ...dependencies
    ]
  );
  return /* @__PURE__ */ (0, import_react3.default).createElement($42ceafc619f9c3ba$var$CollectionContext.Provider, {
    value: ctx
  }, children);
}
function $42ceafc619f9c3ba$var$CollectionRoot({ children }) {
  let doc = (0, import_react3.useContext)($42ceafc619f9c3ba$var$CollectionDocumentContext);
  let wrappedChildren = (0, import_react3.useMemo)(() => /* @__PURE__ */ (0, import_react3.default).createElement($42ceafc619f9c3ba$var$CollectionDocumentContext.Provider, {
    value: null
  }, /* @__PURE__ */ (0, import_react3.default).createElement($42ceafc619f9c3ba$var$ShallowRenderContext.Provider, {
    value: true
  }, children)), [
    children
  ]);
  return (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)() ? /* @__PURE__ */ (0, import_react3.default).createElement($42ceafc619f9c3ba$var$SSRContext.Provider, {
    value: doc
  }, wrappedChildren) : /* @__PURE__ */ (0, import_react_dom.createPortal)(wrappedChildren, doc);
}

// node_modules/react-aria-components/dist/private/Collection.mjs
var import_react4 = __toESM(require_react(), 1);
var $263ab7fc0f95ccdb$export$d40e14dec8b060a8 = /* @__PURE__ */ (0, import_react4.createContext)(null);
var $263ab7fc0f95ccdb$export$a164736487e3f0ae = {
  CollectionRoot({ collection, renderDropIndicator }) {
    return $263ab7fc0f95ccdb$var$useCollectionRender(collection, null, renderDropIndicator);
  },
  CollectionBranch({ collection, parent, renderDropIndicator }) {
    return $263ab7fc0f95ccdb$var$useCollectionRender(collection, parent, renderDropIndicator);
  }
};
function $263ab7fc0f95ccdb$var$useCollectionRender(collection, parent, renderDropIndicator) {
  return (0, $a80bd3e9349588e7$export$727c8fc270210f13)({
    items: parent ? collection.getChildren(parent.key) : collection,
    dependencies: [
      renderDropIndicator
    ],
    children(node) {
      if (node.type === "content") return /* @__PURE__ */ (0, import_react4.default).createElement((0, import_react4.default).Fragment, null);
      let rendered = node.render(node);
      if (!renderDropIndicator || node.type !== "item") return rendered;
      return /* @__PURE__ */ (0, import_react4.default).createElement((0, import_react4.default).Fragment, null, renderDropIndicator({
        type: "item",
        key: node.key,
        dropPosition: "before"
      }), rendered, $263ab7fc0f95ccdb$export$2dbbd341daed716d(collection, node, renderDropIndicator));
    }
  });
}
function $263ab7fc0f95ccdb$export$2dbbd341daed716d(collection, node, renderDropIndicator) {
  let key = node.key;
  let keyAfter = collection.getKeyAfter(key);
  let nextItemInFlattenedCollection = keyAfter != null ? collection.getItem(keyAfter) : null;
  while (nextItemInFlattenedCollection != null && nextItemInFlattenedCollection.type !== "item") {
    keyAfter = collection.getKeyAfter(nextItemInFlattenedCollection.key);
    nextItemInFlattenedCollection = keyAfter != null ? collection.getItem(keyAfter) : null;
  }
  let nextItemInSameLevel = node.nextKey != null ? collection.getItem(node.nextKey) : null;
  while (nextItemInSameLevel != null && nextItemInSameLevel.type !== "item") nextItemInSameLevel = nextItemInSameLevel.nextKey != null ? collection.getItem(nextItemInSameLevel.nextKey) : null;
  let afterIndicators = [];
  if (nextItemInSameLevel == null) {
    let current = node;
    while (current?.type === "item" && (!nextItemInFlattenedCollection || current.parentKey !== nextItemInFlattenedCollection.parentKey && nextItemInFlattenedCollection.level < current.level)) {
      let indicator = renderDropIndicator({
        type: "item",
        key: current.key,
        dropPosition: "after"
      });
      if (/* @__PURE__ */ (0, import_react4.isValidElement)(indicator)) afterIndicators.push(/* @__PURE__ */ (0, import_react4.cloneElement)(indicator, {
        key: `${current.key}-after`
      }));
      current = current.parentKey != null ? collection.getItem(current.parentKey) : null;
    }
  }
  return afterIndicators;
}
var $263ab7fc0f95ccdb$export$4feb769f8ddf26c5 = /* @__PURE__ */ (0, import_react4.createContext)($263ab7fc0f95ccdb$export$a164736487e3f0ae);
function $263ab7fc0f95ccdb$export$90e00781bc59d8f9(focusedKey) {
  return (0, import_react4.useMemo)(() => focusedKey != null ? /* @__PURE__ */ new Set([
    focusedKey
  ]) : null, [
    focusedKey
  ]);
}

// node_modules/react-aria-components/dist/private/SharedElementTransition.mjs
var import_react_dom2 = __toESM(require_react_dom(), 1);
var import_react5 = __toESM(require_react(), 1);
var $792f28e438b9ad5f$var$SharedElementContext = /* @__PURE__ */ (0, import_react5.createContext)(null);
function $792f28e438b9ad5f$export$758399f318e6385a(props) {
  let ref = (0, import_react5.useRef)({});
  return /* @__PURE__ */ (0, import_react5.default).createElement($792f28e438b9ad5f$var$SharedElementContext.Provider, {
    value: ref
  }, props.children);
}
var $792f28e438b9ad5f$export$c34620ff8881d89f = /* @__PURE__ */ (0, import_react5.forwardRef)(function SharedElement(props, ref) {
  let { name, isVisible = true, children, className, style, render, ...divProps } = props;
  let [state, setState] = (0, import_react5.useState)(isVisible ? "visible" : "hidden");
  let scopeRef = (0, import_react5.useContext)($792f28e438b9ad5f$var$SharedElementContext);
  if (!scopeRef) throw new Error("<SharedElement> must be rendered inside a <SharedElementTransition>");
  if (isVisible && state === "hidden") setState("visible");
  ref = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(ref);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let element = ref.current;
    let scope = scopeRef.current;
    let prevSnapshot = scope[name];
    let frame = null;
    if (element && isVisible && prevSnapshot) {
      setState("visible");
      let animations = element.getAnimations();
      let values = prevSnapshot.style.map(([property, prevValue]) => {
        let value = element.style[property];
        if (property === "translate") {
          let prevRect = prevSnapshot.rect;
          let currentItem = element.getBoundingClientRect();
          let deltaX = prevRect.left - currentItem?.left;
          let deltaY = prevRect.top - currentItem?.top;
          element.style.translate = `${deltaX}px ${deltaY}px`;
        } else element.style[property] = prevValue;
        return [
          property,
          value
        ];
      });
      for (let a of element.getAnimations()) if (!animations.includes(a)) a.cancel();
      frame = requestAnimationFrame(() => {
        frame = null;
        for (let [property, value] of values) element.style[property] = value;
      });
      delete scope[name];
    } else if (element && isVisible && !prevSnapshot) {
      queueMicrotask(() => (0, import_react_dom2.flushSync)(() => setState("entering")));
      frame = requestAnimationFrame(() => {
        frame = null;
        setState("visible");
      });
    } else if (element && !isVisible)
      queueMicrotask(() => {
        if (scope[name]) {
          delete scope[name];
          (0, import_react_dom2.flushSync)(() => setState("exiting"));
          Promise.all(element.getAnimations().map((a) => a.finished)).then(() => setState("hidden")).catch(() => {
          });
        } else
          setState("hidden");
      });
    return () => {
      if (frame != null) cancelAnimationFrame(frame);
      if (element && element.isConnected && !element.hasAttribute("data-exiting")) {
        let style2 = window.getComputedStyle(element);
        if (style2.transitionProperty !== "none") {
          let transitionProperty = style2.transitionProperty.split(/\s*,\s*/);
          scope[name] = {
            rect: element.getBoundingClientRect(),
            style: transitionProperty.map((p) => [
              p,
              style2[p]
            ])
          };
        }
      }
    };
  }, [
    ref,
    scopeRef,
    name,
    isVisible
  ]);
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    children,
    className,
    style,
    render,
    values: {
      isEntering: state === "entering",
      isExiting: state === "exiting"
    }
  });
  if (state === "hidden") return null;
  return /* @__PURE__ */ (0, import_react5.default).createElement((0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div, {
    ...divProps,
    ...renderProps,
    ref,
    "data-entering": state === "entering" || void 0,
    "data-exiting": state === "exiting" || void 0
  });
});

// node_modules/react-aria-components/dist/private/SelectionIndicator.mjs
var import_react6 = __toESM(require_react(), 1);
var $91fe5e721c7f36c1$export$c9549807523555e0 = /* @__PURE__ */ (0, import_react6.createContext)({
  isSelected: false
});
var $91fe5e721c7f36c1$export$17f80983afe4e444 = /* @__PURE__ */ (0, import_react6.forwardRef)(function SelectionIndicator(props, ref) {
  [props, ref] = (0, $7230ffa83bc0c2cf$export$29f1550f4b0d4415)(props, ref, $91fe5e721c7f36c1$export$c9549807523555e0);
  let { isSelected, ...otherProps } = props;
  return /* @__PURE__ */ (0, import_react6.default).createElement((0, $792f28e438b9ad5f$export$c34620ff8881d89f), {
    ...otherProps,
    ref,
    className: props.className || "react-aria-SelectionIndicator",
    name: "SelectionIndicator",
    isVisible: isSelected
  });
});

// node_modules/react-aria/dist/private/utils/shadowdom/ShadowTreeWalker.mjs
var $654b97e09f2a30c1$export$63eb3ababa9c55c4 = class {
  constructor(doc, root, whatToShow, filter) {
    this._walkerStack = [];
    this._currentSetFor = /* @__PURE__ */ new Set();
    this._acceptNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const shadowRoot2 = node.shadowRoot;
        if (shadowRoot2) {
          const walker = this._doc.createTreeWalker(shadowRoot2, this.whatToShow, {
            acceptNode: this._acceptNode
          });
          this._walkerStack.unshift(walker);
          return NodeFilter.FILTER_ACCEPT;
        } else {
          if (typeof this.filter === "function") return this.filter(node);
          else if (this.filter?.acceptNode) return this.filter.acceptNode(node);
          else if (this.filter === null) return NodeFilter.FILTER_ACCEPT;
        }
      }
      return NodeFilter.FILTER_SKIP;
    };
    this._doc = doc;
    this.root = root;
    this.filter = filter ?? null;
    this.whatToShow = whatToShow ?? NodeFilter.SHOW_ALL;
    this._currentNode = root;
    this._walkerStack.unshift(doc.createTreeWalker(root, whatToShow, this._acceptNode));
    const shadowRoot = root.shadowRoot;
    if (shadowRoot) {
      const walker = this._doc.createTreeWalker(shadowRoot, this.whatToShow, {
        acceptNode: this._acceptNode
      });
      this._walkerStack.unshift(walker);
    }
  }
  get currentNode() {
    return this._currentNode;
  }
  set currentNode(node) {
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(this.root, node)) throw new Error("Cannot set currentNode to a node that is not contained by the root node.");
    const walkers = [];
    let curNode = node;
    let currentWalkerCurrentNode = node;
    this._currentNode = node;
    while (curNode && curNode !== this.root) if (curNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const shadowRoot = curNode;
      const walker2 = this._doc.createTreeWalker(shadowRoot, this.whatToShow, {
        acceptNode: this._acceptNode
      });
      walkers.push(walker2);
      walker2.currentNode = currentWalkerCurrentNode;
      this._currentSetFor.add(walker2);
      curNode = currentWalkerCurrentNode = shadowRoot.host;
    } else curNode = curNode.parentNode;
    const walker = this._doc.createTreeWalker(this.root, this.whatToShow, {
      acceptNode: this._acceptNode
    });
    walkers.push(walker);
    walker.currentNode = currentWalkerCurrentNode;
    this._currentSetFor.add(walker);
    this._walkerStack = walkers;
  }
  get doc() {
    return this._doc;
  }
  firstChild() {
    let currentNode = this.currentNode;
    let newNode = this.nextNode();
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(currentNode, newNode)) {
      this.currentNode = currentNode;
      return null;
    }
    if (newNode) this.currentNode = newNode;
    return newNode;
  }
  lastChild() {
    let walker = this._walkerStack[0];
    let newNode = walker.lastChild();
    if (newNode) this.currentNode = newNode;
    return newNode;
  }
  nextNode() {
    const nextNode = this._walkerStack[0].nextNode();
    if (nextNode) {
      const shadowRoot = nextNode.shadowRoot;
      if (shadowRoot) {
        let nodeResult;
        if (typeof this.filter === "function") nodeResult = this.filter(nextNode);
        else if (this.filter?.acceptNode) nodeResult = this.filter.acceptNode(nextNode);
        if (nodeResult === NodeFilter.FILTER_ACCEPT) {
          this.currentNode = nextNode;
          return nextNode;
        }
        let newNode = this.nextNode();
        if (newNode) this.currentNode = newNode;
        return newNode;
      }
      if (nextNode) this.currentNode = nextNode;
      return nextNode;
    } else {
      if (this._walkerStack.length > 1) {
        this._walkerStack.shift();
        let newNode = this.nextNode();
        if (newNode) this.currentNode = newNode;
        return newNode;
      } else return null;
    }
  }
  previousNode() {
    const currentWalker = this._walkerStack[0];
    if (currentWalker.currentNode === currentWalker.root) {
      if (this._currentSetFor.has(currentWalker)) {
        this._currentSetFor.delete(currentWalker);
        if (this._walkerStack.length > 1) {
          this._walkerStack.shift();
          let newNode = this.previousNode();
          if (newNode) this.currentNode = newNode;
          return newNode;
        } else return null;
      }
      return null;
    }
    const previousNode = currentWalker.previousNode();
    if (previousNode) {
      const shadowRoot = previousNode.shadowRoot;
      if (shadowRoot) {
        let nodeResult;
        if (typeof this.filter === "function") nodeResult = this.filter(previousNode);
        else if (this.filter?.acceptNode) nodeResult = this.filter.acceptNode(previousNode);
        if (nodeResult === NodeFilter.FILTER_ACCEPT) {
          if (previousNode) this.currentNode = previousNode;
          return previousNode;
        }
        let newNode = this.lastChild();
        if (newNode) this.currentNode = newNode;
        return newNode;
      }
      if (previousNode) this.currentNode = previousNode;
      return previousNode;
    } else {
      if (this._walkerStack.length > 1) {
        this._walkerStack.shift();
        let newNode = this.previousNode();
        if (newNode) this.currentNode = newNode;
        return newNode;
      } else return null;
    }
  }
  /**
  * @deprecated
  */
  nextSibling() {
    return null;
  }
  /**
  * @deprecated
  */
  previousSibling() {
    return null;
  }
  /**
  * @deprecated
  */
  parentNode() {
    return null;
  }
};
function $654b97e09f2a30c1$export$4d0f8be8b12a7ef6(doc, root, whatToShow, filter) {
  if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) return new $654b97e09f2a30c1$export$63eb3ababa9c55c4(doc, root, whatToShow, filter);
  return doc.createTreeWalker(root, whatToShow, filter);
}

// node_modules/react-aria/dist/private/focus/FocusScope.mjs
var import_react7 = __toESM(require_react(), 1);
var $535772f9d2c1f38d$var$FocusContext = /* @__PURE__ */ (0, import_react7.default).createContext(null);
var $535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT = "react-aria-focus-scope-restore";
var $535772f9d2c1f38d$var$activeScope = null;
function $535772f9d2c1f38d$export$20e40289641fbbb6(props) {
  let { children, contain, restoreFocus, autoFocus } = props;
  let startRef = (0, import_react7.useRef)(null);
  let endRef = (0, import_react7.useRef)(null);
  let scopeRef = (0, import_react7.useRef)([]);
  let { parentNode } = (0, import_react7.useContext)($535772f9d2c1f38d$var$FocusContext) || {};
  let node = (0, import_react7.useMemo)(() => new $535772f9d2c1f38d$var$TreeNode({
    scopeRef
  }), [
    scopeRef
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let parent = parentNode || $535772f9d2c1f38d$export$d06fae2ee68b101e.root;
    if ($535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(parent.scopeRef) && $535772f9d2c1f38d$var$activeScope && !$535772f9d2c1f38d$var$isAncestorScope($535772f9d2c1f38d$var$activeScope, parent.scopeRef)) {
      let activeNode = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode($535772f9d2c1f38d$var$activeScope);
      if (activeNode) parent = activeNode;
    }
    parent.addChild(node);
    $535772f9d2c1f38d$export$d06fae2ee68b101e.addNode(node);
  }, [
    node,
    parentNode
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let node2 = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
    if (node2) node2.contain = !!contain;
  }, [
    contain
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let node2 = startRef.current?.nextSibling;
    let nodes = [];
    let stopPropagation = (e) => e.stopPropagation();
    while (node2 && node2 !== endRef.current) {
      nodes.push(node2);
      node2.addEventListener($535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT, stopPropagation);
      node2 = node2.nextSibling;
    }
    scopeRef.current = nodes;
    return () => {
      for (let node3 of nodes) node3.removeEventListener($535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT, stopPropagation);
    };
  }, [
    children
  ]);
  $535772f9d2c1f38d$var$useActiveScopeTracker(scopeRef, restoreFocus, contain);
  $535772f9d2c1f38d$var$useFocusContainment(scopeRef, contain);
  $535772f9d2c1f38d$var$useRestoreFocus(scopeRef, restoreFocus, contain);
  $535772f9d2c1f38d$var$useAutoFocus(scopeRef, autoFocus);
  (0, import_react7.useEffect)(() => {
    const activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0));
    let scope = null;
    if ($535772f9d2c1f38d$var$isElementInScope(activeElement, scopeRef.current)) {
      for (let node2 of $535772f9d2c1f38d$export$d06fae2ee68b101e.traverse()) if (node2.scopeRef && $535772f9d2c1f38d$var$isElementInScope(activeElement, node2.scopeRef.current)) scope = node2;
      if (scope === $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef)) $535772f9d2c1f38d$var$activeScope = scope.scopeRef;
    }
  }, [
    scopeRef
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    return () => {
      let parentScope = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef)?.parent?.scopeRef ?? null;
      if ((scopeRef === $535772f9d2c1f38d$var$activeScope || $535772f9d2c1f38d$var$isAncestorScope(scopeRef, $535772f9d2c1f38d$var$activeScope)) && (!parentScope || $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(parentScope))) $535772f9d2c1f38d$var$activeScope = parentScope;
      $535772f9d2c1f38d$export$d06fae2ee68b101e.removeTreeNode(scopeRef);
    };
  }, [
    scopeRef
  ]);
  let focusManager = (0, import_react7.useMemo)(() => $535772f9d2c1f38d$var$createFocusManagerForScope(scopeRef), []);
  let value = (0, import_react7.useMemo)(() => ({
    focusManager,
    parentNode: node
  }), [
    node,
    focusManager
  ]);
  return /* @__PURE__ */ (0, import_react7.default).createElement($535772f9d2c1f38d$var$FocusContext.Provider, {
    value
  }, /* @__PURE__ */ (0, import_react7.default).createElement("span", {
    "data-focus-scope-start": true,
    hidden: true,
    ref: startRef
  }), children, /* @__PURE__ */ (0, import_react7.default).createElement("span", {
    "data-focus-scope-end": true,
    hidden: true,
    ref: endRef
  }));
}
function $535772f9d2c1f38d$var$createFocusManagerForScope(scopeRef) {
  return {
    focusNext(opts = {}) {
      let scope = scopeRef.current;
      let { from, tabbable, wrap, accept } = opts;
      let node = from || (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(scope[0] ?? void 0));
      let sentinel = scope[0].previousElementSibling;
      let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = $535772f9d2c1f38d$var$isElementInScope(node, scope) ? node : sentinel;
      let nextNode = walker.nextNode();
      if (!nextNode && wrap) {
        walker.currentNode = sentinel;
        nextNode = walker.nextNode();
      }
      if (nextNode) $535772f9d2c1f38d$var$focusElement(nextNode, true);
      return nextNode;
    },
    focusPrevious(opts = {}) {
      let scope = scopeRef.current;
      let { from, tabbable, wrap, accept } = opts;
      let node = from || (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(scope[0] ?? void 0));
      let sentinel = scope[scope.length - 1].nextElementSibling;
      let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = $535772f9d2c1f38d$var$isElementInScope(node, scope) ? node : sentinel;
      let previousNode = walker.previousNode();
      if (!previousNode && wrap) {
        walker.currentNode = sentinel;
        previousNode = walker.previousNode();
      }
      if (previousNode) $535772f9d2c1f38d$var$focusElement(previousNode, true);
      return previousNode;
    },
    focusFirst(opts = {}) {
      let scope = scopeRef.current;
      let { tabbable, accept } = opts;
      let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = scope[0].previousElementSibling;
      let nextNode = walker.nextNode();
      if (nextNode) $535772f9d2c1f38d$var$focusElement(nextNode, true);
      return nextNode;
    },
    focusLast(opts = {}) {
      let scope = scopeRef.current;
      let { tabbable, accept } = opts;
      let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = scope[scope.length - 1].nextElementSibling;
      let previousNode = walker.previousNode();
      if (previousNode) $535772f9d2c1f38d$var$focusElement(previousNode, true);
      return previousNode;
    }
  };
}
function $535772f9d2c1f38d$var$getScopeRoot(scope) {
  return scope[0].parentElement;
}
function $535772f9d2c1f38d$var$shouldContainFocus(scopeRef) {
  let scope = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode($535772f9d2c1f38d$var$activeScope);
  while (scope && scope.scopeRef !== scopeRef) {
    if (scope.contain) return false;
    scope = scope.parent;
  }
  return true;
}
function $535772f9d2c1f38d$var$getRadiosInGroup(element) {
  if (!element.form)
    return Array.from((0, $d447af545b77c9f1$export$b204af158042fbac)(element).querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`)).filter((radio) => !radio.form);
  const radioList = element.form.elements.namedItem(element.name);
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
  if (radioList instanceof ownerWindow.RadioNodeList) return Array.from(radioList).filter((el) => el instanceof ownerWindow.HTMLInputElement);
  if (radioList instanceof ownerWindow.HTMLInputElement) return [
    radioList
  ];
  return [];
}
function $535772f9d2c1f38d$var$isTabbableRadio(element) {
  if (element.checked) return true;
  const radios = $535772f9d2c1f38d$var$getRadiosInGroup(element);
  return radios.length > 0 && !radios.some((radio) => radio.checked);
}
function $535772f9d2c1f38d$var$useFocusContainment(scopeRef, contain) {
  let focusedNode = (0, import_react7.useRef)(void 0);
  let raf = (0, import_react7.useRef)(void 0);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let scope = scopeRef.current;
    if (!contain) {
      if (raf.current) {
        cancelAnimationFrame(raf.current);
        raf.current = void 0;
      }
      return;
    }
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scope ? scope[0] : void 0);
    let onKeyDown = (e) => {
      if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey || !$535772f9d2c1f38d$var$shouldContainFocus(scopeRef) || e.isComposing) return;
      let focusedElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
      let scope2 = scopeRef.current;
      if (!scope2 || !$535772f9d2c1f38d$var$isElementInScope(focusedElement, scope2)) return;
      let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope2);
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable: true
      }, scope2);
      if (!focusedElement) return;
      walker.currentNode = focusedElement;
      let nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
      if (!nextElement) {
        walker.currentNode = e.shiftKey ? scope2[scope2.length - 1].nextElementSibling : scope2[0].previousElementSibling;
        nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
      }
      e.preventDefault();
      if (nextElement) {
        $535772f9d2c1f38d$var$focusElement(nextElement, true);
        if (nextElement instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(nextElement).HTMLInputElement) nextElement.select();
      }
    };
    let onFocus = (e) => {
      if ((!$535772f9d2c1f38d$var$activeScope || $535772f9d2c1f38d$var$isAncestorScope($535772f9d2c1f38d$var$activeScope, scopeRef)) && $535772f9d2c1f38d$var$isElementInScope((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e), scopeRef.current)) {
        $535772f9d2c1f38d$var$activeScope = scopeRef;
        focusedNode.current = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
      } else if ($535772f9d2c1f38d$var$shouldContainFocus(scopeRef) && !$535772f9d2c1f38d$var$isElementInChildScope((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e), scopeRef)) {
        if (focusedNode.current) $535772f9d2c1f38d$var$focusElement(focusedNode.current);
        else if ($535772f9d2c1f38d$var$activeScope && $535772f9d2c1f38d$var$activeScope.current) $535772f9d2c1f38d$var$focusFirstInScope($535772f9d2c1f38d$var$activeScope.current);
      } else if ($535772f9d2c1f38d$var$shouldContainFocus(scopeRef)) focusedNode.current = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    };
    let onBlur = (e) => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        let modality = (0, $8f5a2122b0992be3$export$630ff653c5ada6a9)();
        let shouldSkipFocusRestore = (modality === "virtual" || modality === null) && (0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && (0, $2add3ce32c6007eb$export$6446a186d09e379e)();
        let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
        if (!shouldSkipFocusRestore && activeElement && $535772f9d2c1f38d$var$shouldContainFocus(scopeRef) && !$535772f9d2c1f38d$var$isElementInChildScope(activeElement, scopeRef)) {
          $535772f9d2c1f38d$var$activeScope = scopeRef;
          let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
          if (target && target.isConnected) {
            focusedNode.current = target;
            $535772f9d2c1f38d$var$focusElement(focusedNode.current);
          } else if ($535772f9d2c1f38d$var$activeScope.current) $535772f9d2c1f38d$var$focusFirstInScope($535772f9d2c1f38d$var$activeScope.current);
        }
      });
    };
    ownerDocument.addEventListener("keydown", onKeyDown, false);
    ownerDocument.addEventListener("focusin", onFocus, false);
    scope?.forEach((element) => element.addEventListener("focusin", onFocus, false));
    scope?.forEach((element) => element.addEventListener("focusout", onBlur, false));
    return () => {
      ownerDocument.removeEventListener("keydown", onKeyDown, false);
      ownerDocument.removeEventListener("focusin", onFocus, false);
      scope?.forEach((element) => element.removeEventListener("focusin", onFocus, false));
      scope?.forEach((element) => element.removeEventListener("focusout", onBlur, false));
    };
  }, [
    scopeRef,
    contain
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [
    raf
  ]);
}
function $535772f9d2c1f38d$var$isElementInAnyScope(element) {
  return $535772f9d2c1f38d$var$isElementInChildScope(element);
}
function $535772f9d2c1f38d$var$isElementInScope(element, scope) {
  if (!element) return false;
  if (!scope) return false;
  return scope.some((node) => (0, $23f2114a1b82827e$export$4282f70798064fe0)(node, element));
}
function $535772f9d2c1f38d$var$isElementInChildScope(element, scope = null) {
  if (element instanceof Element && element.closest("[data-react-aria-top-layer]")) return true;
  for (let { scopeRef: s } of $535772f9d2c1f38d$export$d06fae2ee68b101e.traverse($535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scope))) {
    if (s && $535772f9d2c1f38d$var$isElementInScope(element, s.current)) return true;
  }
  return false;
}
function $535772f9d2c1f38d$export$1258395f99bf9cbf(element) {
  return $535772f9d2c1f38d$var$isElementInChildScope(element, $535772f9d2c1f38d$var$activeScope);
}
function $535772f9d2c1f38d$var$isAncestorScope(ancestor, scope) {
  let parent = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scope)?.parent;
  while (parent) {
    if (parent.scopeRef === ancestor) return true;
    parent = parent.parent;
  }
  return false;
}
function $535772f9d2c1f38d$var$focusElement(element, scroll = false) {
  if (element != null && !scroll) try {
    (0, $f192c2f16961cbe0$export$80f3e147d781571c)(element);
  } catch {
  }
  else if (element != null) try {
    element.focus();
  } catch {
  }
}
function $535772f9d2c1f38d$var$getFirstInScope(scope, tabbable = true) {
  let sentinel = scope[0].previousElementSibling;
  let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
  let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
    tabbable
  }, scope);
  walker.currentNode = sentinel;
  let nextNode = walker.nextNode();
  if (tabbable && !nextNode) {
    scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
    walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
      tabbable: false
    }, scope);
    walker.currentNode = sentinel;
    nextNode = walker.nextNode();
  }
  return nextNode;
}
function $535772f9d2c1f38d$var$focusFirstInScope(scope, tabbable = true) {
  $535772f9d2c1f38d$var$focusElement($535772f9d2c1f38d$var$getFirstInScope(scope, tabbable));
}
function $535772f9d2c1f38d$var$useAutoFocus(scopeRef, autoFocus) {
  const autoFocusRef = (0, import_react7.default).useRef(autoFocus);
  (0, import_react7.useEffect)(() => {
    if (autoFocusRef.current) {
      $535772f9d2c1f38d$var$activeScope = scopeRef;
      const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0);
      if (!$535772f9d2c1f38d$var$isElementInScope((0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument), $535772f9d2c1f38d$var$activeScope.current) && scopeRef.current) $535772f9d2c1f38d$var$focusFirstInScope(scopeRef.current);
    }
    autoFocusRef.current = false;
  }, [
    scopeRef
  ]);
}
function $535772f9d2c1f38d$var$useActiveScopeTracker(scopeRef, restore, contain) {
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (restore || contain) return;
    let scope = scopeRef.current;
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scope ? scope[0] : void 0);
    let onFocus = (e) => {
      let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
      if ($535772f9d2c1f38d$var$isElementInScope(target, scopeRef.current)) $535772f9d2c1f38d$var$activeScope = scopeRef;
      else if (!$535772f9d2c1f38d$var$isElementInAnyScope(target)) $535772f9d2c1f38d$var$activeScope = null;
    };
    ownerDocument.addEventListener("focusin", onFocus, false);
    scope?.forEach((element) => element.addEventListener("focusin", onFocus, false));
    return () => {
      ownerDocument.removeEventListener("focusin", onFocus, false);
      scope?.forEach((element) => element.removeEventListener("focusin", onFocus, false));
    };
  }, [
    scopeRef,
    restore,
    contain
  ]);
}
function $535772f9d2c1f38d$var$shouldRestoreFocus(scopeRef) {
  let scope = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode($535772f9d2c1f38d$var$activeScope);
  while (scope && scope.scopeRef !== scopeRef) {
    if (scope.nodeToRestore) return false;
    scope = scope.parent;
  }
  return scope?.scopeRef === scopeRef;
}
function $535772f9d2c1f38d$var$useRestoreFocus(scopeRef, restoreFocus, contain) {
  const nodeToRestoreRef = (0, import_react7.useRef)(typeof document !== "undefined" ? (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(
    // oxlint-disable-next-line react/react-compiler
    (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0)
  ) : null);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let scope = scopeRef.current;
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scope ? scope[0] : void 0);
    if (!restoreFocus || contain) return;
    let onFocus = () => {
      if ((!$535772f9d2c1f38d$var$activeScope || $535772f9d2c1f38d$var$isAncestorScope($535772f9d2c1f38d$var$activeScope, scopeRef)) && $535772f9d2c1f38d$var$isElementInScope((0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument), scopeRef.current)) $535772f9d2c1f38d$var$activeScope = scopeRef;
    };
    ownerDocument.addEventListener("focusin", onFocus, false);
    scope?.forEach((element) => element.addEventListener("focusin", onFocus, false));
    return () => {
      ownerDocument.removeEventListener("focusin", onFocus, false);
      scope?.forEach((element) => element.removeEventListener("focusin", onFocus, false));
    };
  }, [
    scopeRef,
    contain
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0);
    if (!restoreFocus) return;
    let onKeyDown = (e) => {
      if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey || !$535772f9d2c1f38d$var$shouldContainFocus(scopeRef) || e.isComposing) return;
      let focusedElement = ownerDocument.activeElement;
      if (!$535772f9d2c1f38d$var$isElementInChildScope(focusedElement, scopeRef) || !$535772f9d2c1f38d$var$shouldRestoreFocus(scopeRef)) return;
      let treeNode = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
      if (!treeNode) return;
      let nodeToRestore = treeNode.nodeToRestore;
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(ownerDocument.body, {
        tabbable: true
      });
      walker.currentNode = focusedElement;
      let nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
      if (!nodeToRestore || !nodeToRestore.isConnected || nodeToRestore === ownerDocument.body) {
        nodeToRestore = void 0;
        treeNode.nodeToRestore = void 0;
      }
      if ((!nextElement || !$535772f9d2c1f38d$var$isElementInChildScope(nextElement, scopeRef)) && nodeToRestore) {
        walker.currentNode = nodeToRestore;
        do
          nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
        while ($535772f9d2c1f38d$var$isElementInChildScope(nextElement, scopeRef));
        e.preventDefault();
        e.stopPropagation();
        if (nextElement) $535772f9d2c1f38d$var$focusElement(nextElement, true);
        else if (!$535772f9d2c1f38d$var$isElementInAnyScope(nodeToRestore)) focusedElement.blur();
        else $535772f9d2c1f38d$var$focusElement(nodeToRestore, true);
      }
    };
    if (!contain) ownerDocument.addEventListener("keydown", onKeyDown, true);
    return () => {
      if (!contain) ownerDocument.removeEventListener("keydown", onKeyDown, true);
    };
  }, [
    scopeRef,
    restoreFocus,
    contain
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0);
    if (!restoreFocus) return;
    let treeNode = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
    if (!treeNode) return;
    treeNode.nodeToRestore = nodeToRestoreRef.current ?? void 0;
    return () => {
      let treeNode2 = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
      if (!treeNode2) return;
      let nodeToRestore = treeNode2.nodeToRestore;
      let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
      if (restoreFocus && nodeToRestore && (activeElement && $535772f9d2c1f38d$var$isElementInChildScope(activeElement, scopeRef) || activeElement === ownerDocument.body && $535772f9d2c1f38d$var$shouldRestoreFocus(scopeRef))) {
        let clonedTree = $535772f9d2c1f38d$export$d06fae2ee68b101e.clone();
        requestAnimationFrame(() => {
          if (ownerDocument.activeElement === ownerDocument.body) {
            let treeNode3 = clonedTree.getTreeNode(scopeRef);
            while (treeNode3) {
              if (treeNode3.nodeToRestore && treeNode3.nodeToRestore.isConnected) {
                $535772f9d2c1f38d$var$restoreFocusToElement(treeNode3.nodeToRestore);
                return;
              }
              treeNode3 = treeNode3.parent;
            }
            treeNode3 = clonedTree.getTreeNode(scopeRef);
            while (treeNode3) {
              if (treeNode3.scopeRef && // TODO: this is probably a false positive based on naming, it's not a real ref, rename.
              // oxlint-disable-next-line react-hooks/exhaustive-deps
              treeNode3.scopeRef.current && $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(treeNode3.scopeRef)) {
                let node = $535772f9d2c1f38d$var$getFirstInScope(treeNode3.scopeRef.current, true);
                $535772f9d2c1f38d$var$restoreFocusToElement(node);
                return;
              }
              treeNode3 = treeNode3.parent;
            }
          }
        });
      }
    };
  }, [
    scopeRef,
    restoreFocus
  ]);
}
function $535772f9d2c1f38d$var$restoreFocusToElement(node) {
  if (node.dispatchEvent(new CustomEvent($535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT, {
    bubbles: true,
    cancelable: true
  }))) $535772f9d2c1f38d$var$focusElement(node);
}
function $535772f9d2c1f38d$export$2d6ec8fc375ceafa(root, opts, scope) {
  let filter = opts?.tabbable ? (0, $3b8b240c1bf84ab9$export$bebd5a1431fec25d) : (0, $3b8b240c1bf84ab9$export$4c063cf1350e6fed);
  let rootElement = root?.nodeType === Node.ELEMENT_NODE ? root : null;
  let doc = (0, $d447af545b77c9f1$export$b204af158042fbac)(rootElement);
  let walker = (0, $654b97e09f2a30c1$export$4d0f8be8b12a7ef6)(doc, root || doc, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if ((0, $23f2114a1b82827e$export$4282f70798064fe0)(opts?.from, node)) return NodeFilter.FILTER_REJECT;
      if (opts?.tabbable && node.tagName === "INPUT" && node.getAttribute("type") === "radio") {
        if (!$535772f9d2c1f38d$var$isTabbableRadio(node)) return NodeFilter.FILTER_REJECT;
        if (walker.currentNode.tagName === "INPUT" && walker.currentNode.type === "radio" && walker.currentNode.name === node.name) return NodeFilter.FILTER_REJECT;
      }
      if (filter(node) && (!scope || $535772f9d2c1f38d$var$isElementInScope(node, scope)) && (!opts?.accept || opts.accept(node))) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    }
  });
  if (opts?.from) walker.currentNode = opts.from;
  return walker;
}
var $535772f9d2c1f38d$var$Tree = class _$535772f9d2c1f38d$var$Tree {
  constructor() {
    this.fastMap = /* @__PURE__ */ new Map();
    this.root = new $535772f9d2c1f38d$var$TreeNode({
      scopeRef: null
    });
    this.fastMap.set(null, this.root);
  }
  get size() {
    return this.fastMap.size;
  }
  getTreeNode(data) {
    return this.fastMap.get(data);
  }
  addTreeNode(scopeRef, parent, nodeToRestore) {
    let parentNode = this.fastMap.get(parent ?? null);
    if (!parentNode) return;
    let node = new $535772f9d2c1f38d$var$TreeNode({
      scopeRef
    });
    parentNode.addChild(node);
    node.parent = parentNode;
    this.fastMap.set(scopeRef, node);
    if (nodeToRestore) node.nodeToRestore = nodeToRestore;
  }
  addNode(node) {
    this.fastMap.set(node.scopeRef, node);
  }
  removeTreeNode(scopeRef) {
    if (scopeRef === null) return;
    let node = this.fastMap.get(scopeRef);
    if (!node) return;
    let parentNode = node.parent;
    for (let current of this.traverse()) if (current !== node && node.nodeToRestore && current.nodeToRestore && node.scopeRef && node.scopeRef.current && $535772f9d2c1f38d$var$isElementInScope(current.nodeToRestore, node.scopeRef.current)) current.nodeToRestore = node.nodeToRestore;
    let children = node.children;
    if (parentNode) {
      parentNode.removeChild(node);
      if (children.size > 0) children.forEach((child) => parentNode && parentNode.addChild(child));
    }
    this.fastMap.delete(node.scopeRef);
  }
  // Pre Order Depth First
  *traverse(node = this.root) {
    if (node.scopeRef != null) yield node;
    if (node.children.size > 0) for (let child of node.children) yield* this.traverse(child);
  }
  clone() {
    let newTree = new _$535772f9d2c1f38d$var$Tree();
    for (let node of this.traverse()) newTree.addTreeNode(node.scopeRef, node.parent?.scopeRef ?? null, node.nodeToRestore);
    return newTree;
  }
};
var $535772f9d2c1f38d$var$TreeNode = class {
  constructor(props) {
    this.children = /* @__PURE__ */ new Set();
    this.contain = false;
    this.scopeRef = props.scopeRef;
  }
  addChild(node) {
    this.children.add(node);
    node.parent = this;
  }
  removeChild(node) {
    this.children.delete(node);
    node.parent = void 0;
  }
};
var $535772f9d2c1f38d$export$d06fae2ee68b101e = new $535772f9d2c1f38d$var$Tree();

// node_modules/react-aria/dist/private/utils/inertValue.mjs
var import_react8 = __toESM(require_react(), 1);
function $b24d1bc31a0f941d$export$a9d04c5684123369(value) {
  const pieces = (0, import_react8.version).split(".");
  const major = parseInt(pieces[0], 10);
  if (major >= 19) return value;
  return value ? "true" : void 0;
}

// node_modules/react-stately/dist/private/selection/Selection.mjs
var $8b2540e09867b15e$export$52baac22726c72bf = class _$8b2540e09867b15e$export$52baac22726c72bf extends Set {
  constructor(keys, anchorKey, currentKey) {
    super(keys);
    if (keys instanceof _$8b2540e09867b15e$export$52baac22726c72bf) {
      this.anchorKey = anchorKey ?? keys.anchorKey;
      this.currentKey = currentKey ?? keys.currentKey;
    } else {
      this.anchorKey = anchorKey ?? null;
      this.currentKey = currentKey ?? null;
    }
  }
};

// node_modules/react-stately/dist/private/selection/useMultipleSelectionState.mjs
var import_react9 = __toESM(require_react(), 1);
function $60f19cefd567a3e4$var$equalSets(setA, setB) {
  if (setA.size !== setB.size) return false;
  for (let item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}
function $60f19cefd567a3e4$export$253fe78d46329472(props) {
  let { selectionMode = "none", disallowEmptySelection = false, allowDuplicateSelectionEvents, selectionBehavior: selectionBehaviorProp = "toggle", disabledBehavior = "all" } = props;
  let isFocusedRef = (0, import_react9.useRef)(false);
  let [, setFocused] = (0, import_react9.useState)(false);
  let focusedKeyRef = (0, import_react9.useRef)(null);
  let childFocusStrategyRef = (0, import_react9.useRef)(null);
  let [, setFocusedKey] = (0, import_react9.useState)(null);
  let selectedKeysProp = (0, import_react9.useMemo)(() => $60f19cefd567a3e4$var$convertSelection(props.selectedKeys), [
    props.selectedKeys
  ]);
  let defaultSelectedKeys = (0, import_react9.useMemo)(() => $60f19cefd567a3e4$var$convertSelection(props.defaultSelectedKeys, new (0, $8b2540e09867b15e$export$52baac22726c72bf)()), [
    props.defaultSelectedKeys
  ]);
  let [selectedKeys, setSelectedKeys] = (0, $3e6197669829fe11$export$40bfa8c7b0832715)(selectedKeysProp, defaultSelectedKeys, props.onSelectionChange);
  let disabledKeysProp = (0, import_react9.useMemo)(() => props.disabledKeys ? new Set(props.disabledKeys) : /* @__PURE__ */ new Set(), [
    props.disabledKeys
  ]);
  let [selectionBehavior, setSelectionBehavior] = (0, import_react9.useState)(selectionBehaviorProp);
  if (selectionBehaviorProp === "replace" && selectionBehavior === "toggle" && typeof selectedKeys === "object" && selectedKeys.size === 0) setSelectionBehavior("replace");
  let lastSelectionBehavior = (0, import_react9.useRef)(selectionBehaviorProp);
  (0, import_react9.useEffect)(() => {
    if (selectionBehaviorProp !== lastSelectionBehavior.current) {
      setSelectionBehavior(selectionBehaviorProp);
      lastSelectionBehavior.current = selectionBehaviorProp;
    }
  }, [
    selectionBehaviorProp
  ]);
  return {
    selectionMode,
    disallowEmptySelection,
    selectionBehavior,
    setSelectionBehavior,
    get isFocused() {
      return isFocusedRef.current;
    },
    setFocused(f) {
      isFocusedRef.current = f;
      setFocused(f);
    },
    get focusedKey() {
      return focusedKeyRef.current;
    },
    get childFocusStrategy() {
      return childFocusStrategyRef.current;
    },
    setFocusedKey(k, childFocusStrategy = "first") {
      focusedKeyRef.current = k;
      childFocusStrategyRef.current = childFocusStrategy;
      setFocusedKey(k);
    },
    selectedKeys,
    setSelectedKeys(keys) {
      if (allowDuplicateSelectionEvents || !$60f19cefd567a3e4$var$equalSets(keys, selectedKeys)) setSelectedKeys(keys);
    },
    disabledKeys: disabledKeysProp,
    disabledBehavior
  };
}
function $60f19cefd567a3e4$var$convertSelection(selection, defaultValue) {
  if (!selection) return defaultValue;
  return selection === "all" ? "all" : new (0, $8b2540e09867b15e$export$52baac22726c72bf)(selection);
}

// node_modules/react-stately/dist/private/collections/getChildNodes.mjs
function $cd5ea4b915021f1d$export$1005530eda016c13(node, collection) {
  if (typeof collection.getChildren === "function") return collection.getChildren(node.key);
  return node.childNodes;
}
function $cd5ea4b915021f1d$export$fbdeaa6a76694f71(iterable) {
  return $cd5ea4b915021f1d$export$5f3398f8733f90e2(iterable, 0);
}
function $cd5ea4b915021f1d$export$5f3398f8733f90e2(iterable, index) {
  if (index < 0) return void 0;
  let i = 0;
  for (let item of iterable) {
    if (i === index) return item;
    i++;
  }
}
function $cd5ea4b915021f1d$export$8c434b3a7a4dad6(collection, a, b) {
  if (a.parentKey === b.parentKey) return a.index - b.index;
  let aAncestors = [
    ...$cd5ea4b915021f1d$var$getAncestors(collection, a),
    a
  ];
  let bAncestors = [
    ...$cd5ea4b915021f1d$var$getAncestors(collection, b),
    b
  ];
  let firstNonMatchingAncestor = aAncestors.slice(0, bAncestors.length).findIndex((a2, i) => a2 !== bAncestors[i]);
  if (firstNonMatchingAncestor !== -1) {
    a = aAncestors[firstNonMatchingAncestor];
    b = bAncestors[firstNonMatchingAncestor];
    return a.index - b.index;
  }
  if (aAncestors.findIndex((node) => node === b) >= 0) return 1;
  else if (bAncestors.findIndex((node) => node === a) >= 0) return -1;
  return -1;
}
function $cd5ea4b915021f1d$var$getAncestors(collection, node) {
  let parents = [];
  let currNode = node;
  while (currNode?.parentKey != null) {
    currNode = collection.getItem(currNode.parentKey);
    if (currNode) parents.unshift(currNode);
  }
  return parents;
}

// node_modules/react-stately/dist/private/selection/SelectionManager.mjs
var $4a07ac835f260f78$export$6c8a5aaad13c9852 = class _$4a07ac835f260f78$export$6c8a5aaad13c9852 {
  constructor(collection, state, options) {
    this.collection = collection;
    this.state = state;
    this.allowsCellSelection = options?.allowsCellSelection ?? false;
    this._isSelectAll = null;
    this.layoutDelegate = options?.layoutDelegate || null;
    this.fullCollection = options?.fullCollection || null;
  }
  /**
  * The type of selection that is allowed in the collection.
  */
  get selectionMode() {
    return this.state.selectionMode;
  }
  /**
  * Whether the collection allows empty selection.
  */
  get disallowEmptySelection() {
    return this.state.disallowEmptySelection;
  }
  /**
  * The selection behavior for the collection.
  */
  get selectionBehavior() {
    return this.state.selectionBehavior;
  }
  /**
  * Sets the selection behavior for the collection.
  */
  setSelectionBehavior(selectionBehavior) {
    this.state.setSelectionBehavior(selectionBehavior);
  }
  /**
  * Whether the collection is currently focused.
  */
  get isFocused() {
    return this.state.isFocused;
  }
  /**
  * Sets whether the collection is focused.
  */
  setFocused(isFocused) {
    this.state.setFocused(isFocused);
  }
  /**
  * The current focused key in the collection.
  */
  get focusedKey() {
    return this.state.focusedKey;
  }
  /** Whether the first or last child of the focused key should receive focus. */
  get childFocusStrategy() {
    return this.state.childFocusStrategy;
  }
  /**
  * Sets the focused key.
  */
  setFocusedKey(key, childFocusStrategy) {
    if (key == null || this.collection.getItem(key)) this.state.setFocusedKey(key, childFocusStrategy);
  }
  /**
  * The currently selected keys in the collection.
  */
  get selectedKeys() {
    return this.state.selectedKeys === "all" ? new Set(this.getSelectAllKeys()) : this.state.selectedKeys;
  }
  /**
  * The raw selection value for the collection.
  * Either 'all' for select all, or a set of keys.
  */
  get rawSelection() {
    return this.state.selectedKeys;
  }
  /**
  * Returns whether a key is selected.
  */
  isSelected(key) {
    if (this.state.selectionMode === "none") return false;
    let mappedKey = this.getKey(key);
    if (mappedKey == null) return false;
    return this.state.selectedKeys === "all" ? this.canSelectItem(mappedKey) : this.state.selectedKeys.has(mappedKey);
  }
  /**
  * Whether the selection is empty.
  */
  get isEmpty() {
    return this.state.selectedKeys !== "all" && this.state.selectedKeys.size === 0;
  }
  /**
  * Whether all items in the collection are selected.
  */
  get isSelectAll() {
    if (this.isEmpty) return false;
    if (this.state.selectedKeys === "all") return true;
    if (this._isSelectAll != null) return this._isSelectAll;
    let allKeys = this.getSelectAllKeys();
    let selectedKeys = this.state.selectedKeys;
    this._isSelectAll = allKeys.every((k) => selectedKeys.has(k));
    return this._isSelectAll;
  }
  get firstSelectedKey() {
    let first = null;
    for (let key of this.state.selectedKeys) {
      let item = this.collection.getItem(key);
      if (!first || item && (0, $cd5ea4b915021f1d$export$8c434b3a7a4dad6)(this.collection, item, first) < 0) first = item;
    }
    return first?.key ?? null;
  }
  get lastSelectedKey() {
    let last = null;
    for (let key of this.state.selectedKeys) {
      let item = this.collection.getItem(key);
      if (!last || item && (0, $cd5ea4b915021f1d$export$8c434b3a7a4dad6)(this.collection, item, last) > 0) last = item;
    }
    return last?.key ?? null;
  }
  get disabledKeys() {
    return this.state.disabledKeys;
  }
  get disabledBehavior() {
    return this.state.disabledBehavior;
  }
  /**
  * Extends the selection to the given key.
  */
  extendSelection(toKey) {
    if (this.selectionMode === "none") return;
    if (this.selectionMode === "single") {
      this.replaceSelection(toKey);
      return;
    }
    let mappedToKey = this.getKey(toKey);
    if (mappedToKey == null) return;
    let selection;
    if (this.state.selectedKeys === "all") selection = new (0, $8b2540e09867b15e$export$52baac22726c72bf)([
      mappedToKey
    ], mappedToKey, mappedToKey);
    else {
      let selectedKeys = this.state.selectedKeys;
      let anchorKey = selectedKeys.anchorKey ?? mappedToKey;
      selection = new (0, $8b2540e09867b15e$export$52baac22726c72bf)(selectedKeys, anchorKey, mappedToKey);
      for (let key of this.getKeyRange(anchorKey, selectedKeys.currentKey ?? mappedToKey)) selection.delete(key);
      for (let key of this.getKeyRange(mappedToKey, anchorKey)) if (this.canSelectItem(key)) selection.add(key);
    }
    this.state.setSelectedKeys(selection);
  }
  getKeyRange(from, to) {
    let fromItem = this.collection.getItem(from);
    let toItem = this.collection.getItem(to);
    if (fromItem && toItem) {
      if ((0, $cd5ea4b915021f1d$export$8c434b3a7a4dad6)(this.collection, fromItem, toItem) <= 0) return this.getKeyRangeInternal(from, to);
      return this.getKeyRangeInternal(to, from);
    }
    return [];
  }
  getKeyRangeInternal(from, to) {
    if (this.layoutDelegate?.getKeyRange) return this.layoutDelegate.getKeyRange(from, to);
    let keys = [];
    let key = from;
    while (key != null) {
      let item = this.collection.getItem(key);
      if (item && (item.type === "item" || item.type === "cell" && this.allowsCellSelection)) keys.push(key);
      if (key === to) return keys;
      key = this.collection.getKeyAfter(key);
    }
    return [];
  }
  getKey(key) {
    let item = this.collection.getItem(key);
    if (!item)
      return key;
    if (item.type === "cell" && this.allowsCellSelection) return key;
    while (item && item.type !== "item" && item.parentKey != null) item = this.collection.getItem(item.parentKey);
    if (!item || item.type !== "item") return null;
    return item.key;
  }
  /**
  * Toggles whether the given key is selected.
  */
  toggleSelection(key) {
    if (this.selectionMode === "none") return;
    if (this.selectionMode === "single" && !this.isSelected(key)) {
      this.replaceSelection(key);
      return;
    }
    let mappedKey = this.getKey(key);
    if (mappedKey == null) return;
    let keys = new (0, $8b2540e09867b15e$export$52baac22726c72bf)(this.state.selectedKeys === "all" ? this.getSelectAllKeys() : this.state.selectedKeys);
    if (keys.has(mappedKey)) keys.delete(mappedKey);
    else if (this.canSelectItem(mappedKey)) {
      keys.add(mappedKey);
      keys.anchorKey = mappedKey;
      keys.currentKey = mappedKey;
    }
    if (this.disallowEmptySelection && keys.size === 0) return;
    this.state.setSelectedKeys(keys);
  }
  /**
  * Replaces the selection with only the given key.
  */
  replaceSelection(key) {
    if (this.selectionMode === "none") return;
    let mappedKey = this.getKey(key);
    if (mappedKey == null) return;
    let selection = this.canSelectItem(mappedKey) ? new (0, $8b2540e09867b15e$export$52baac22726c72bf)([
      mappedKey
    ], mappedKey, mappedKey) : new (0, $8b2540e09867b15e$export$52baac22726c72bf)();
    this.state.setSelectedKeys(selection);
  }
  /**
  * Replaces the selection with the given keys.
  */
  setSelectedKeys(keys) {
    if (this.selectionMode === "none") return;
    let selection = new (0, $8b2540e09867b15e$export$52baac22726c72bf)();
    for (let key of keys) {
      let mappedKey = this.getKey(key);
      if (mappedKey != null) {
        selection.add(mappedKey);
        if (this.selectionMode === "single") break;
      }
    }
    this.state.setSelectedKeys(selection);
  }
  getSelectAllKeys() {
    let collection = this.fullCollection ?? this.collection;
    let keys = [];
    let addKeys = (key) => {
      while (key != null) {
        if (this.canSelectItemIn(key, collection)) {
          let item = collection.getItem(key);
          if (item?.type === "item") keys.push(key);
          if (item?.hasChildNodes && (this.allowsCellSelection || item.type !== "item")) addKeys((0, $cd5ea4b915021f1d$export$fbdeaa6a76694f71)((0, $cd5ea4b915021f1d$export$1005530eda016c13)(item, collection))?.key ?? null);
        }
        key = collection.getKeyAfter(key);
      }
    };
    addKeys(collection.getFirstKey());
    return keys;
  }
  /**
  * Selects all items in the collection.
  */
  selectAll() {
    if (!this.isSelectAll && this.selectionMode === "multiple") this.state.setSelectedKeys("all");
  }
  /**
  * Removes all keys from the selection.
  */
  clearSelection() {
    if (!this.disallowEmptySelection && (this.state.selectedKeys === "all" || this.state.selectedKeys.size > 0)) this.state.setSelectedKeys(new (0, $8b2540e09867b15e$export$52baac22726c72bf)());
  }
  /**
  * Toggles between select all and an empty selection.
  */
  toggleSelectAll() {
    if (this.isSelectAll) this.clearSelection();
    else this.selectAll();
  }
  select(key, e) {
    if (this.selectionMode === "none") return;
    if (this.selectionMode === "single") {
      if (this.isSelected(key) && !this.disallowEmptySelection) this.toggleSelection(key);
      else this.replaceSelection(key);
    } else if (this.selectionBehavior === "toggle" || e && (e.pointerType === "touch" || e.pointerType === "virtual"))
      this.toggleSelection(key);
    else this.replaceSelection(key);
  }
  /**
  * Returns whether the current selection is equal to the given selection.
  */
  isSelectionEqual(selection) {
    if (selection === this.state.selectedKeys) return true;
    let selectedKeys = this.selectedKeys;
    if (selection.size !== selectedKeys.size) return false;
    for (let key of selection) {
      if (!selectedKeys.has(key)) return false;
    }
    for (let key of selectedKeys) {
      if (!selection.has(key)) return false;
    }
    return true;
  }
  canSelectItem(key) {
    return this.canSelectItemIn(key, this.collection);
  }
  canSelectItemIn(key, collection) {
    if (this.state.selectionMode === "none" || this.state.disabledKeys.has(key)) return false;
    let item = collection.getItem(key);
    if (!item || item?.props?.isDisabled || item.type === "cell" && !this.allowsCellSelection) return false;
    return true;
  }
  isDisabled(key) {
    let item = this.collection.getItem(key);
    return this.state.disabledBehavior === "all" && (this.state.disabledKeys.has(key) || !!item?.props?.isDisabled) && item?.props?.disabledBehavior !== "selection";
  }
  isLink(key) {
    return !!this.collection.getItem(key)?.props?.href;
  }
  getItemProps(key) {
    return this.collection.getItem(key)?.props;
  }
  withCollection(collection) {
    return new _$4a07ac835f260f78$export$6c8a5aaad13c9852(collection, this.state, {
      allowsCellSelection: this.allowsCellSelection,
      layoutDelegate: this.layoutDelegate || void 0,
      fullCollection: this.fullCollection ?? this.collection
    });
  }
};

// node_modules/react-stately/dist/private/list/ListCollection.mjs
var $f664a81d022446b5$export$d085fb9e920b5ca7 = class {
  constructor(nodes) {
    this.keyMap = /* @__PURE__ */ new Map();
    this.firstKey = null;
    this.lastKey = null;
    this.iterable = nodes;
    let visit = (node) => {
      this.keyMap.set(node.key, node);
      if (node.childNodes && node.type === "section") for (let child of node.childNodes) visit(child);
    };
    for (let node of nodes) visit(node);
    let last = null;
    let index = 0;
    let size = 0;
    for (let [key, node] of this.keyMap) {
      if (last) {
        last.nextKey = key;
        node.prevKey = last.key;
      } else {
        this.firstKey = key;
        node.prevKey = void 0;
      }
      if (node.type === "item") node.index = index++;
      if (node.type === "section" || node.type === "item") size++;
      last = node;
      last.nextKey = void 0;
    }
    this._size = size;
    this.lastKey = last?.key ?? null;
  }
  *[Symbol.iterator]() {
    yield* this.iterable;
  }
  get size() {
    return this._size;
  }
  getKeys() {
    return this.keyMap.keys();
  }
  getKeyBefore(key) {
    let node = this.keyMap.get(key);
    return node ? node.prevKey ?? null : null;
  }
  getKeyAfter(key) {
    let node = this.keyMap.get(key);
    return node ? node.nextKey ?? null : null;
  }
  getFirstKey() {
    return this.firstKey;
  }
  getLastKey() {
    return this.lastKey;
  }
  getItem(key) {
    return this.keyMap.get(key) ?? null;
  }
  at(idx) {
    const keys = [
      ...this.getKeys()
    ];
    return this.getItem(keys[idx]);
  }
  getChildren(key) {
    let node = this.keyMap.get(key);
    return node?.childNodes || [];
  }
};

// node_modules/react-stately/dist/private/collections/CollectionBuilder.mjs
var import_react10 = __toESM(require_react(), 1);
var $bda7a7e55e1ff206$export$bf788dd355e3a401 = class {
  build(props, context) {
    this.context = context;
    return $bda7a7e55e1ff206$var$iterable(() => this.iterateCollection(props));
  }
  *iterateCollection(props) {
    let { children, items } = props;
    if ((0, import_react10.default).isValidElement(children) && children.type === (0, import_react10.default).Fragment) yield* this.iterateCollection({
      children: children.props.children,
      items
    });
    else if (typeof children === "function") {
      if (!items) throw new Error("props.children was a function but props.items is missing");
      let index = 0;
      for (let item of items) {
        yield* this.getFullNode({
          value: item,
          index
        }, {
          renderer: children
        });
        index++;
      }
    } else {
      let items2 = [];
      (0, import_react10.default).Children.forEach(children, (child) => {
        if (child) items2.push(child);
      });
      let index = 0;
      for (let item of items2) {
        let nodes = this.getFullNode({
          element: item,
          index
        }, {});
        for (let node of nodes) {
          index++;
          yield node;
        }
      }
    }
  }
  getKey(item, partialNode, state, parentKey) {
    if (item.key != null) return item.key;
    if (partialNode.type === "cell" && partialNode.key != null) return `${parentKey}${partialNode.key}`;
    let v = partialNode.value;
    if (v != null) {
      let key = v.key ?? v.id;
      if (key == null) throw new Error("No key found for item");
      return key;
    }
    return parentKey ? `${parentKey}.${partialNode.index}` : `$.${partialNode.index}`;
  }
  getChildState(state, partialNode) {
    return {
      renderer: partialNode.renderer || state.renderer
    };
  }
  *getFullNode(partialNode, state, parentKey, parentNode) {
    if ((0, import_react10.default).isValidElement(partialNode.element) && partialNode.element.type === (0, import_react10.default).Fragment) {
      let children = [];
      (0, import_react10.default).Children.forEach(partialNode.element.props.children, (child) => {
        children.push(child);
      });
      let index = partialNode.index ?? 0;
      for (const child of children) yield* this.getFullNode({
        element: child,
        index: index++
      }, state, parentKey, parentNode);
      return;
    }
    let element = partialNode.element;
    if (!element && partialNode.value && state && state.renderer) {
      let cached = this.cache.get(partialNode.value);
      if (cached && (!cached.shouldInvalidate || !cached.shouldInvalidate(this.context))) {
        cached.index = partialNode.index;
        cached.parentKey = parentNode ? parentNode.key : null;
        yield cached;
        return;
      }
      element = state.renderer(partialNode.value);
    }
    if ((0, import_react10.default).isValidElement(element)) {
      let type = element.type;
      if (typeof type !== "function" && typeof type.getCollectionNode !== "function") {
        let name = element.type;
        throw new Error(`Unknown element <${name}> in collection.`);
      }
      let childNodes = type.getCollectionNode(element.props, this.context);
      let index = partialNode.index ?? 0;
      let result = childNodes.next();
      while (!result.done && result.value) {
        let childNode = result.value;
        partialNode.index = index;
        let nodeKey = childNode.key ?? null;
        if (nodeKey == null) nodeKey = childNode.element ? null : this.getKey(element, partialNode, state, parentKey);
        let nodes = this.getFullNode({
          ...childNode,
          key: nodeKey,
          index,
          wrapper: $bda7a7e55e1ff206$var$compose(partialNode.wrapper, childNode.wrapper)
        }, this.getChildState(state, childNode), parentKey ? `${parentKey}${element.key}` : element.key, parentNode);
        let children = [
          ...nodes
        ];
        for (let node2 of children) {
          node2.value = childNode.value ?? partialNode.value ?? null;
          if (node2.value) this.cache.set(node2.value, node2);
          if (partialNode.type && node2.type !== partialNode.type) throw new Error(`Unsupported type <${$bda7a7e55e1ff206$var$capitalize(node2.type)}> in <${$bda7a7e55e1ff206$var$capitalize(parentNode?.type ?? "unknown parent type")}>. Only <${$bda7a7e55e1ff206$var$capitalize(partialNode.type)}> is supported.`);
          index++;
          yield node2;
        }
        result = childNodes.next(children);
      }
      return;
    }
    if (partialNode.key == null || partialNode.type == null) return;
    let builder = this;
    let node = {
      type: partialNode.type,
      props: partialNode.props,
      key: partialNode.key,
      parentKey: parentNode ? parentNode.key : null,
      value: partialNode.value ?? null,
      level: (parentNode?.level ?? 0) + (parentNode?.type === "item" ? 1 : 0),
      index: partialNode.index,
      rendered: partialNode.rendered,
      textValue: partialNode.textValue ?? "",
      "aria-label": partialNode["aria-label"],
      wrapper: partialNode.wrapper,
      shouldInvalidate: partialNode.shouldInvalidate,
      hasChildNodes: partialNode.hasChildNodes || false,
      childNodes: $bda7a7e55e1ff206$var$iterable(function* () {
        if (!partialNode.hasChildNodes || !partialNode.childNodes) return;
        let index = 0;
        for (let child of partialNode.childNodes()) {
          if (child.key != null)
            child.key = `${node.key}${child.key}`;
          let nodes = builder.getFullNode({
            ...child,
            index
          }, builder.getChildState(state, child), node.key, node);
          for (let node2 of nodes) {
            index++;
            yield node2;
          }
        }
      })
    };
    yield node;
  }
  constructor() {
    this.cache = /* @__PURE__ */ new WeakMap();
  }
};
function $bda7a7e55e1ff206$var$iterable(iterator) {
  let cache = [];
  let iterable = null;
  return {
    *[Symbol.iterator]() {
      for (let item of cache) yield item;
      if (!iterable) iterable = iterator();
      for (let item of iterable) {
        cache.push(item);
        yield item;
      }
    }
  };
}
function $bda7a7e55e1ff206$var$compose(outer, inner) {
  if (outer && inner) return (element) => outer(inner(element));
  if (outer) return outer;
  if (inner) return inner;
}
function $bda7a7e55e1ff206$var$capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

// node_modules/react-stately/dist/private/collections/useCollection.mjs
var import_react11 = __toESM(require_react(), 1);
function $d03379b88399b8c5$export$6cd28814d92fa9c9(props, factory, context) {
  let builder = (0, import_react11.useMemo)(() => new (0, $bda7a7e55e1ff206$export$bf788dd355e3a401)(), []);
  let { children, items, collection } = props;
  let result = (0, import_react11.useMemo)(() => {
    if (collection) return collection;
    let nodes = builder.build({
      children,
      items
    }, context);
    return factory(nodes);
  }, [
    builder,
    children,
    items,
    collection,
    context,
    factory
  ]);
  return result;
}

// node_modules/react-stately/dist/private/list/useListState.mjs
var import_react12 = __toESM(require_react(), 1);
function $b14b6f590b50af39$export$2f645645f7bca764(props) {
  let { filter, layoutDelegate } = props;
  let selectionState = (0, $60f19cefd567a3e4$export$253fe78d46329472)(props);
  let disabledKeys = (0, import_react12.useMemo)(() => props.disabledKeys ? new Set(props.disabledKeys) : /* @__PURE__ */ new Set(), [
    props.disabledKeys
  ]);
  let factory = (0, import_react12.useCallback)((nodes) => filter ? new (0, $f664a81d022446b5$export$d085fb9e920b5ca7)(filter(nodes)) : new (0, $f664a81d022446b5$export$d085fb9e920b5ca7)(nodes), [
    filter
  ]);
  let context = (0, import_react12.useMemo)(() => ({
    suppressTextValueWarning: props.suppressTextValueWarning
  }), [
    props.suppressTextValueWarning
  ]);
  let collection = (0, $d03379b88399b8c5$export$6cd28814d92fa9c9)(props, factory, context);
  let selectionManager = (0, import_react12.useMemo)(() => new (0, $4a07ac835f260f78$export$6c8a5aaad13c9852)(collection, selectionState, {
    layoutDelegate
  }), [
    collection,
    selectionState,
    layoutDelegate
  ]);
  $b14b6f590b50af39$var$useFocusedKeyReset(collection, selectionManager);
  return {
    collection,
    disabledKeys,
    selectionManager
  };
}
function $b14b6f590b50af39$export$ba9d38c0f1bf2b36(state, filterFn) {
  let collection = (0, import_react12.useMemo)(() => filterFn ? state.collection.filter(filterFn) : state.collection, [
    state.collection,
    filterFn
  ]);
  let selectionManager = state.selectionManager.withCollection(collection);
  $b14b6f590b50af39$var$useFocusedKeyReset(collection, selectionManager);
  return {
    collection,
    selectionManager,
    disabledKeys: state.disabledKeys
  };
}
function $b14b6f590b50af39$var$useFocusedKeyReset(collection, selectionManager) {
  const cachedCollection = (0, import_react12.useRef)(null);
  (0, import_react12.useEffect)(() => {
    if (selectionManager.focusedKey != null && !collection.getItem(selectionManager.focusedKey) && cachedCollection.current) {
      let key = cachedCollection.current.getKeyAfter(selectionManager.focusedKey);
      let nextFocusedKey = null;
      while (key != null) {
        let node = collection.getItem(key);
        if (node && node.type === "item" && !selectionManager.isDisabled(key)) {
          nextFocusedKey = key;
          break;
        }
        key = cachedCollection.current.getKeyAfter(key);
      }
      if (nextFocusedKey == null) {
        key = cachedCollection.current.getKeyBefore(selectionManager.focusedKey);
        while (key != null) {
          let node = collection.getItem(key);
          if (node && node.type === "item" && !selectionManager.isDisabled(key)) {
            nextFocusedKey = key;
            break;
          }
          key = cachedCollection.current.getKeyBefore(key);
        }
      }
      selectionManager.setFocusedKey(nextFocusedKey);
    }
    cachedCollection.current = collection;
  }, [
    collection,
    selectionManager
  ]);
}

// node_modules/react-aria/dist/private/interactions/useFocusWithin.mjs
var import_react13 = __toESM(require_react(), 1);
function $2c9edc598a03d523$export$420e68273165f4ec(props) {
  let { isDisabled, onBlurWithin, onFocusWithin, onFocusWithinChange } = props;
  let state = (0, import_react13.useRef)({
    isFocusWithin: false
  });
  let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
  let onBlur = (0, import_react13.useCallback)((e) => {
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
    if (state.current.isFocusWithin && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, e.relatedTarget)) {
      state.current.isFocusWithin = false;
      removeAllGlobalListeners();
      if (onBlurWithin) onBlurWithin(e);
      if (onFocusWithinChange) onFocusWithinChange(false);
    }
  }, [
    onBlurWithin,
    onFocusWithinChange,
    state,
    removeAllGlobalListeners
  ]);
  let onSyntheticFocus = (0, $a92dc41f639950be$export$715c682d09d639cc)(onBlur);
  let onFocus = (0, import_react13.useCallback)((e) => {
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
    let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(eventTarget);
    const activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
    if (!state.current.isFocusWithin && activeElement === eventTarget) {
      if (onFocusWithin) onFocusWithin(e);
      if (onFocusWithinChange) onFocusWithinChange(true);
      state.current.isFocusWithin = true;
      onSyntheticFocus(e);
      let currentTarget = e.currentTarget;
      addGlobalListener(ownerDocument, "focus", (e2) => {
        let eventTarget2 = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e2);
        if (state.current.isFocusWithin && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(currentTarget, eventTarget2)) {
          let nativeEvent = new ownerDocument.defaultView.FocusEvent("blur", {
            relatedTarget: eventTarget2
          });
          (0, $a92dc41f639950be$export$c2b7abe5d61ec696)(nativeEvent, currentTarget);
          let event = (0, $a92dc41f639950be$export$525bc4921d56d4a)(nativeEvent);
          onBlur(event);
        }
      }, {
        capture: true
      });
    }
  }, [
    onFocusWithin,
    onFocusWithinChange,
    onSyntheticFocus,
    addGlobalListener,
    onBlur
  ]);
  if (isDisabled) return {
    focusWithinProps: {
      // These cannot be null, that would conflict in mergeProps
      onFocus: void 0,
      onBlur: void 0
    }
  };
  return {
    focusWithinProps: {
      onFocus,
      onBlur
    }
  };
}

// node_modules/react-aria/dist/private/focus/useFocusRing.mjs
var import_react14 = __toESM(require_react(), 1);
function $0c4a58759813079a$export$4e328f61c538687f(props = {}) {
  let { autoFocus = false, isTextInput, within } = props;
  let state = (0, import_react14.useRef)({
    isFocused: false,
    isFocusVisible: autoFocus || (0, $8f5a2122b0992be3$export$b9b3dfddab17db27)()
  });
  let [isFocused, setFocused] = (0, import_react14.useState)(false);
  let [isFocusVisibleState, setFocusVisible] = (0, import_react14.useState)(
    // oxlint-disable-next-line react/react-compiler
    () => state.current.isFocused && state.current.isFocusVisible
  );
  let updateState = (0, import_react14.useCallback)(() => setFocusVisible(state.current.isFocused && state.current.isFocusVisible), []);
  let onFocusChange = (0, import_react14.useCallback)((isFocused2) => {
    state.current.isFocused = isFocused2;
    state.current.isFocusVisible = (0, $8f5a2122b0992be3$export$b9b3dfddab17db27)();
    setFocused(isFocused2);
    updateState();
  }, [
    updateState
  ]);
  (0, $8f5a2122b0992be3$export$ec71b4b83ac08ec3)((isFocusVisible) => {
    state.current.isFocusVisible = isFocusVisible;
    updateState();
  }, [
    isTextInput,
    isFocused
  ], {
    enabled: isFocused,
    isTextInput
  });
  let { focusProps } = (0, $1e74c67db218ce67$export$f8168d8dd8fd66e6)({
    isDisabled: within,
    onFocusChange
  });
  let { focusWithinProps } = (0, $2c9edc598a03d523$export$420e68273165f4ec)({
    isDisabled: !within,
    onFocusWithinChange: onFocusChange
  });
  return {
    isFocused,
    isFocusVisible: isFocusVisibleState,
    focusProps: within ? focusWithinProps : focusProps
  };
}

// node_modules/react-aria/dist/private/tabs/utils.mjs
var $a251981b23baaa12$export$c5f62239608282b6 = /* @__PURE__ */ new WeakMap();
function $a251981b23baaa12$export$567fc7097e064344(state, key, role) {
  if (!state)
    return "";
  if (typeof key === "string") key = key.replace(/\s+/g, "");
  let baseId = $a251981b23baaa12$export$c5f62239608282b6.get(state);
  if (!baseId) console.error("There is no tab id, please check if you have rendered the tab panel before the tab list.");
  return `${baseId}-${role}-${key}`;
}

// node_modules/react-aria/dist/private/selection/utils.mjs
function $22bbea12c2567021$export$d3e3bd3e26688c04(e) {
  return (0, $2add3ce32c6007eb$export$e1865c3bedcd822b)() ? e.altKey : e.ctrlKey;
}
function $22bbea12c2567021$export$c3d8340acf92597f(collectionRef, key) {
  let selector = `[data-key="${CSS.escape(String(key))}"]`;
  let collection = collectionRef.current?.dataset.collection;
  if (collection) selector = `[data-collection="${CSS.escape(collection)}"]${selector}`;
  return collectionRef.current?.querySelector(selector);
}
var $22bbea12c2567021$var$collectionMap = /* @__PURE__ */ new WeakMap();
function $22bbea12c2567021$export$881eb0d9f3605d9d(collection) {
  let id = (0, $390e54f620492c70$export$f680877a34711e37)();
  $22bbea12c2567021$var$collectionMap.set(collection, id);
  return id;
}
function $22bbea12c2567021$export$6aeb1680a0ae8741(collection) {
  return $22bbea12c2567021$var$collectionMap.get(collection);
}

// node_modules/react-aria/dist/private/utils/keyboard.mjs
function $bb39c0fc1c19b34c$export$16792effe837dba3(e) {
  if ((0, $2add3ce32c6007eb$export$9ac100e40613ea10)()) return e.metaKey;
  return e.ctrlKey;
}
var $bb39c0fc1c19b34c$var$nonTextInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
function $bb39c0fc1c19b34c$export$c57958e35f31ed73(target) {
  return target instanceof HTMLInputElement && !$bb39c0fc1c19b34c$var$nonTextInputTypes.has(target.type) || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable;
}

// node_modules/react-aria/dist/private/focus/virtualFocus.mjs
function $b72f3f7b3b5f42c6$export$76e4e37e5339496d(to) {
  let from = $b72f3f7b3b5f42c6$export$759df0d867455a91((0, $d447af545b77c9f1$export$b204af158042fbac)(to));
  if (from !== to) {
    if (from) $b72f3f7b3b5f42c6$export$6c5dc7e81d2cc29a(from, to);
    if (to) $b72f3f7b3b5f42c6$export$2b35b76d2e30e129(to, from);
  }
}
function $b72f3f7b3b5f42c6$export$6c5dc7e81d2cc29a(from, to) {
  from.dispatchEvent(new FocusEvent("blur", {
    relatedTarget: to
  }));
  from.dispatchEvent(new FocusEvent("focusout", {
    bubbles: true,
    relatedTarget: to
  }));
}
function $b72f3f7b3b5f42c6$export$2b35b76d2e30e129(to, from) {
  to.dispatchEvent(new FocusEvent("focus", {
    relatedTarget: from
  }));
  to.dispatchEvent(new FocusEvent("focusin", {
    bubbles: true,
    relatedTarget: from
  }));
}
function $b72f3f7b3b5f42c6$export$759df0d867455a91(document2) {
  let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(document2);
  let activeDescendant = activeElement?.getAttribute("aria-activedescendant");
  if (activeDescendant) return document2.getElementById(activeDescendant) || activeElement;
  return activeElement;
}

// node_modules/react-aria/dist/private/interactions/textSelection.mjs
var $cbf007e418543821$var$state = "default";
var $cbf007e418543821$var$savedUserSelect = "";
var $cbf007e418543821$var$modifiedElementMap = /* @__PURE__ */ new WeakMap();
function $cbf007e418543821$export$16a4697467175487(target) {
  if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)()) {
    if ($cbf007e418543821$var$state === "default") {
      const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(target);
      $cbf007e418543821$var$savedUserSelect = documentObject.documentElement.style.webkitUserSelect;
      documentObject.documentElement.style.webkitUserSelect = "none";
    }
    $cbf007e418543821$var$state = "disabled";
  } else if (target instanceof HTMLElement || target instanceof SVGElement) {
    let property = "userSelect" in target.style ? "userSelect" : "webkitUserSelect";
    $cbf007e418543821$var$modifiedElementMap.set(target, target.style[property]);
    target.style[property] = "none";
  }
}
function $cbf007e418543821$export$b0d6fa1ab32e3295(target) {
  if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)()) {
    if ($cbf007e418543821$var$state !== "disabled") return;
    $cbf007e418543821$var$state = "restoring";
    setTimeout(() => {
      (0, $081cb5757e08788e$export$24490316f764c430)(() => {
        if ($cbf007e418543821$var$state === "restoring") {
          const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(target);
          if (documentObject.documentElement.style.webkitUserSelect === "none") documentObject.documentElement.style.webkitUserSelect = $cbf007e418543821$var$savedUserSelect || "";
          $cbf007e418543821$var$savedUserSelect = "";
          $cbf007e418543821$var$state = "default";
        }
      });
    }, 300);
  } else if (target instanceof HTMLElement || target instanceof SVGElement) {
    if (target && $cbf007e418543821$var$modifiedElementMap.has(target)) {
      let targetOldUserSelect = $cbf007e418543821$var$modifiedElementMap.get(target);
      let property = "userSelect" in target.style ? "userSelect" : "webkitUserSelect";
      if (target.style[property] === "none") target.style[property] = targetOldUserSelect;
      if (target.getAttribute("style") === "") target.removeAttribute("style");
      $cbf007e418543821$var$modifiedElementMap.delete(target);
    }
  }
}

// node_modules/react-aria/dist/private/utils/getNonce.mjs
function $2b2d34ff061957fb$var$getWebpackNonce(doc) {
  let ownerWindow = doc?.defaultView;
  return ownerWindow?.__webpack_nonce__ || globalThis["__webpack_nonce__"] || void 0;
}
var $2b2d34ff061957fb$var$nonceCache = /* @__PURE__ */ new WeakMap();
function $2b2d34ff061957fb$export$2b85b721e524d74b(doc) {
  let d = doc ?? (typeof document !== "undefined" ? document : void 0);
  if (!d) return $2b2d34ff061957fb$var$getWebpackNonce(d);
  if ($2b2d34ff061957fb$var$nonceCache.has(d)) return $2b2d34ff061957fb$var$nonceCache.get(d);
  let meta = d.querySelector('meta[property="csp-nonce"]');
  let nonce = meta && meta instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(meta).HTMLMetaElement && (meta.nonce || meta.content) || $2b2d34ff061957fb$var$getWebpackNonce(d) || void 0;
  if (nonce !== void 0) $2b2d34ff061957fb$var$nonceCache.set(d, nonce);
  return nonce;
}

// node_modules/react-aria/dist/private/interactions/context.mjs
var import_react15 = __toESM(require_react(), 1);
var $24f9a20f226ad820$export$5165eccb35aaadb5 = (0, import_react15.default).createContext({
  register: () => {
  }
});
$24f9a20f226ad820$export$5165eccb35aaadb5.displayName = "PressResponderContext";

// node_modules/react-aria/dist/private/interactions/usePress.mjs
var import_react_dom3 = __toESM(require_react_dom(), 1);
var import_react16 = __toESM(require_react(), 1);
function $d27d541f9569d26d$var$usePressResponderContext(props) {
  let context = (0, import_react16.useContext)((0, $24f9a20f226ad820$export$5165eccb35aaadb5));
  if (context) {
    let { register, ref, ...contextProps } = context;
    props = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(contextProps, props);
    register();
  }
  (0, $b7115c395c64f7b5$export$4debdb1a3f0fa79e)(context, props.ref);
  return props;
}
var _shouldStopPropagation;
var $d27d541f9569d26d$var$PressEvent = class {
  constructor(type, pointerType, originalEvent, state) {
    __privateAdd(this, _shouldStopPropagation);
    __privateSet(this, _shouldStopPropagation, true);
    let currentTarget = state?.target ?? originalEvent.currentTarget;
    const rect = currentTarget?.getBoundingClientRect();
    let x, y = 0;
    let clientX, clientY = null;
    if (originalEvent.clientX != null && originalEvent.clientY != null) {
      clientX = originalEvent.clientX;
      clientY = originalEvent.clientY;
    }
    if (rect) {
      if (clientX != null && clientY != null) {
        x = clientX - rect.left;
        y = clientY - rect.top;
      } else {
        x = rect.width / 2;
        y = rect.height / 2;
      }
    }
    this.type = type;
    this.pointerType = pointerType;
    this.target = originalEvent.currentTarget;
    this.shiftKey = originalEvent.shiftKey;
    this.metaKey = originalEvent.metaKey;
    this.ctrlKey = originalEvent.ctrlKey;
    this.altKey = originalEvent.altKey;
    this.x = x;
    this.y = y;
    this.key = originalEvent.key;
  }
  continuePropagation() {
    __privateSet(this, _shouldStopPropagation, false);
  }
  get shouldStopPropagation() {
    return __privateGet(this, _shouldStopPropagation);
  }
};
_shouldStopPropagation = new WeakMap();
var $d27d541f9569d26d$var$LINK_CLICKED = Symbol("linkClicked");
var $d27d541f9569d26d$var$STYLE_ID = "react-aria-pressable-style";
var $d27d541f9569d26d$var$PRESSABLE_ATTRIBUTE = "data-react-aria-pressable";
function $d27d541f9569d26d$export$45712eceda6fad21(props) {
  let { onPress, onPressChange, onPressStart, onPressEnd, onPressUp, onClick, isDisabled, isPressed: isPressedProp, preventFocusOnPress, shouldCancelOnPointerExit, allowTextSelectionOnPress, ref: domRef, ...domProps } = $d27d541f9569d26d$var$usePressResponderContext(props);
  let [isPressed, setPressed] = (0, import_react16.useState)(false);
  let ref = (0, import_react16.useRef)({
    isPressed: false,
    ignoreEmulatedMouseEvents: false,
    didFirePressStart: false,
    isTriggeringEvent: false,
    activePointerId: null,
    target: null,
    isOverTarget: false,
    pointerType: null,
    disposables: []
  });
  let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
  let triggerPressStart = (0, import_react16.useCallback)((originalEvent, pointerType) => {
    let state = ref.current;
    if (isDisabled || state.didFirePressStart) return false;
    let shouldStopPropagation = true;
    state.isTriggeringEvent = true;
    if (onPressStart) {
      let event = new $d27d541f9569d26d$var$PressEvent("pressstart", pointerType, originalEvent);
      onPressStart(event);
      shouldStopPropagation = event.shouldStopPropagation;
    }
    if (onPressChange) onPressChange(true);
    state.isTriggeringEvent = false;
    state.didFirePressStart = true;
    setPressed(true);
    return shouldStopPropagation;
  }, [
    isDisabled,
    onPressStart,
    onPressChange
  ]);
  let triggerPressEnd = (0, import_react16.useCallback)((originalEvent, pointerType, wasPressed = true) => {
    let state = ref.current;
    if (!state.didFirePressStart) return false;
    state.didFirePressStart = false;
    state.isTriggeringEvent = true;
    let shouldStopPropagation = true;
    if (onPressEnd) {
      let event = new $d27d541f9569d26d$var$PressEvent("pressend", pointerType, originalEvent);
      onPressEnd(event);
      shouldStopPropagation = event.shouldStopPropagation;
    }
    if (onPressChange) onPressChange(false);
    setPressed(false);
    if (onPress && wasPressed && !isDisabled) {
      let event = new $d27d541f9569d26d$var$PressEvent("press", pointerType, originalEvent);
      onPress(event);
      shouldStopPropagation && (shouldStopPropagation = event.shouldStopPropagation);
    }
    state.isTriggeringEvent = false;
    return shouldStopPropagation;
  }, [
    isDisabled,
    onPressEnd,
    onPressChange,
    onPress
  ]);
  let triggerPressEndEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(triggerPressEnd);
  let triggerPressUp = (0, import_react16.useCallback)((originalEvent, pointerType) => {
    let state = ref.current;
    if (isDisabled) return false;
    if (onPressUp) {
      state.isTriggeringEvent = true;
      let event = new $d27d541f9569d26d$var$PressEvent("pressup", pointerType, originalEvent);
      onPressUp(event);
      state.isTriggeringEvent = false;
      return event.shouldStopPropagation;
    }
    return true;
  }, [
    isDisabled,
    onPressUp
  ]);
  let triggerPressUpEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(triggerPressUp);
  let cancel = (0, import_react16.useCallback)((e) => {
    let state = ref.current;
    if (state.isPressed && state.target) {
      if (state.didFirePressStart && state.pointerType != null) triggerPressEnd($d27d541f9569d26d$var$createEvent(state.target, e), state.pointerType, false);
      state.isPressed = false;
      state.isOverTarget = false;
      state.activePointerId = null;
      state.pointerType = null;
      removeAllGlobalListeners();
      if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$b0d6fa1ab32e3295)(state.target);
      for (let dispose of state.disposables) dispose();
      state.disposables = [];
    }
  }, [
    allowTextSelectionOnPress,
    removeAllGlobalListeners,
    triggerPressEnd
  ]);
  let cancelEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(cancel);
  (0, import_react16.useEffect)(() => {
    if (isDisabled && ref.current.isPressed) cancelEvent({
      currentTarget: ref.current.target,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false
    });
  }, [
    isDisabled
  ]);
  let cancelOnPointerExit = (0, import_react16.useCallback)((e) => {
    if (shouldCancelOnPointerExit) cancel(e);
  }, [
    shouldCancelOnPointerExit,
    cancel
  ]);
  let triggerClick = (0, import_react16.useCallback)((e) => {
    if (isDisabled) return;
    onClick?.(e);
  }, [
    isDisabled,
    onClick
  ]);
  let triggerSyntheticClick = (0, import_react16.useCallback)((e, target) => {
    if (isDisabled) return;
    if (onClick) {
      let event = new MouseEvent("click", e);
      (0, $a92dc41f639950be$export$c2b7abe5d61ec696)(event, target);
      onClick((0, $a92dc41f639950be$export$525bc4921d56d4a)(event));
    }
  }, [
    isDisabled,
    onClick
  ]);
  let pressProps = (0, import_react16.useMemo)(() => {
    let state = ref.current;
    let pressProps2 = {
      onKeyDown(e) {
        if ($d27d541f9569d26d$var$isValidKeyboardEvent(e.nativeEvent, e.currentTarget) && (0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) {
          if ($d27d541f9569d26d$var$shouldPreventDefaultKeyboard((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e), e.key)) e.preventDefault();
          let shouldStopPropagation = true;
          if (!state.isPressed && !e.repeat) {
            state.target = e.currentTarget;
            state.isPressed = true;
            state.pointerType = "keyboard";
            shouldStopPropagation = triggerPressStart(e, "keyboard");
          }
          let originalTarget = e.currentTarget;
          let pressUp = (e2) => {
            if ($d27d541f9569d26d$var$isValidKeyboardEvent(e2, originalTarget) && !e2.repeat && (0, $23f2114a1b82827e$export$4282f70798064fe0)(originalTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e2)) && state.target) triggerPressUpEvent($d27d541f9569d26d$var$createEvent(state.target, e2), "keyboard");
          };
          addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e.currentTarget), "keyup", (0, $a4e76a5424781910$export$e08e3b67e392101e)(pressUp, onKeyUp), true);
          if (shouldStopPropagation) e.stopPropagation();
          if (e.metaKey && (0, $2add3ce32c6007eb$export$9ac100e40613ea10)()) state.metaKeyEvents?.set(e.key, e.nativeEvent);
        } else if (e.key === "Meta") state.metaKeyEvents = /* @__PURE__ */ new Map();
      },
      onClick(e) {
        if (e && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (e && e.button === 0 && !state.isTriggeringEvent && !(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening) {
          let shouldStopPropagation = true;
          if (isDisabled) e.preventDefault();
          if (!state.ignoreEmulatedMouseEvents && !state.isPressed && (state.pointerType === "virtual" || (0, $b5c62b033c25b96d$export$60278871457622de)(e.nativeEvent))) {
            let stopPressStart = triggerPressStart(e, "virtual");
            let stopPressUp = triggerPressUpEvent(e, "virtual");
            let stopPressEnd = triggerPressEndEvent(e, "virtual");
            triggerClick(e);
            shouldStopPropagation = stopPressStart && stopPressUp && stopPressEnd;
          } else if (state.isPressed && state.pointerType !== "keyboard") {
            let pointerType = state.pointerType || e.nativeEvent.pointerType || "virtual";
            let stopPressUp = triggerPressUpEvent($d27d541f9569d26d$var$createEvent(e.currentTarget, e), pointerType);
            let stopPressEnd = triggerPressEndEvent($d27d541f9569d26d$var$createEvent(e.currentTarget, e), pointerType, true);
            shouldStopPropagation = stopPressUp && stopPressEnd;
            state.isOverTarget = false;
            triggerClick(e);
            cancelEvent(e);
          }
          state.ignoreEmulatedMouseEvents = false;
          if (shouldStopPropagation) e.stopPropagation();
        }
      }
    };
    let onKeyUp = (e) => {
      if (state.isPressed && state.target && $d27d541f9569d26d$var$isValidKeyboardEvent(e, state.target)) {
        if ($d27d541f9569d26d$var$shouldPreventDefaultKeyboard((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e), e.key)) e.preventDefault();
        let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
        let wasPressed = (0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, target);
        triggerPressEndEvent($d27d541f9569d26d$var$createEvent(state.target, e), "keyboard", wasPressed);
        if (wasPressed) triggerSyntheticClick(e, state.target);
        removeAllGlobalListeners();
        if (e.key !== "Enter" && $d27d541f9569d26d$var$isHTMLAnchorLink(state.target) && (0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, target) && !e[$d27d541f9569d26d$var$LINK_CLICKED]) {
          e[$d27d541f9569d26d$var$LINK_CLICKED] = true;
          (0, $caaf0dd3060ed57c$export$95185d699e05d4d7)(state.target, e, false);
        }
        state.isPressed = false;
        state.metaKeyEvents?.delete(e.key);
      } else if (e.key === "Meta" && state.metaKeyEvents?.size) {
        let events = state.metaKeyEvents;
        state.metaKeyEvents = void 0;
        for (let event of events.values()) state.target?.dispatchEvent(new KeyboardEvent("keyup", event));
      }
    };
    if (typeof PointerEvent !== "undefined") {
      pressProps2.onPointerDown = (e) => {
        if (e.button !== 0 || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if ((0, $b5c62b033c25b96d$export$29bf1b5f2c56cf63)(e.nativeEvent)) {
          state.pointerType = "virtual";
          return;
        }
        state.pointerType = e.pointerType;
        let shouldStopPropagation = true;
        if (!state.isPressed) {
          state.isPressed = true;
          state.isOverTarget = true;
          state.activePointerId = e.pointerId;
          state.target = e.currentTarget;
          if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$16a4697467175487)(state.target);
          shouldStopPropagation = triggerPressStart(e, state.pointerType);
          let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
          if ("releasePointerCapture" in target) {
            if ("hasPointerCapture" in target) {
              if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
            } else target.releasePointerCapture(e.pointerId);
          }
          addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e.currentTarget), "pointerup", onPointerUp, false);
          addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e.currentTarget), "pointercancel", onPointerCancel, false);
        }
        if (shouldStopPropagation) e.stopPropagation();
      };
      pressProps2.onMouseDown = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (e.button === 0) {
          if (preventFocusOnPress) {
            let dispose = (0, $a92dc41f639950be$export$cabe61c495ee3649)(e.target);
            if (dispose) state.disposables.push(dispose);
          }
          e.stopPropagation();
        }
      };
      pressProps2.onPointerUp = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) || state.pointerType === "virtual") return;
        if (e.button === 0 && !state.isPressed) triggerPressUpEvent(e, state.pointerType || e.pointerType);
      };
      pressProps2.onPointerEnter = (e) => {
        if (e.pointerId === state.activePointerId && state.target && !state.isOverTarget && state.pointerType != null) {
          state.isOverTarget = true;
          triggerPressStart($d27d541f9569d26d$var$createEvent(state.target, e), state.pointerType);
        }
      };
      pressProps2.onPointerLeave = (e) => {
        if (e.pointerId === state.activePointerId && state.target && state.isOverTarget && state.pointerType != null) {
          state.isOverTarget = false;
          triggerPressEndEvent($d27d541f9569d26d$var$createEvent(state.target, e), state.pointerType, false);
          cancelOnPointerExit(e);
        }
      };
      let onPointerUp = (e) => {
        if (e.pointerId === state.activePointerId && state.isPressed && e.button === 0 && state.target) {
          if ((0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) && state.pointerType != null) {
            let clicked = false;
            let timeout = setTimeout(() => {
              if (state.isPressed && state.target instanceof HTMLElement) {
                if (clicked) cancelEvent(e);
                else {
                  (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(state.target);
                  state.target.click();
                }
              }
            }, 80);
            addGlobalListener(e.currentTarget, "click", () => clicked = true, true);
            state.disposables.push(() => clearTimeout(timeout));
          } else cancelEvent(e);
          state.isOverTarget = false;
        }
      };
      let onPointerCancel = (e) => {
        cancelEvent(e);
      };
      pressProps2.onDragStart = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        cancelEvent(e);
      };
    } else if (false) {
      pressProps2.onMouseDown = (e) => {
        if (e.button !== 0 || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (state.ignoreEmulatedMouseEvents) {
          e.stopPropagation();
          return;
        }
        state.isPressed = true;
        state.isOverTarget = true;
        state.target = e.currentTarget;
        state.pointerType = (0, $b5c62b033c25b96d$export$60278871457622de)(e.nativeEvent) ? "virtual" : "mouse";
        let shouldStopPropagation = (0, import_react_dom3.flushSync)(() => triggerPressStart(e, state.pointerType));
        if (shouldStopPropagation) e.stopPropagation();
        if (preventFocusOnPress) {
          let dispose = (0, $a92dc41f639950be$export$cabe61c495ee3649)(e.target);
          if (dispose) state.disposables.push(dispose);
        }
        addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e.currentTarget), "mouseup", onMouseUp, false);
      };
      pressProps2.onMouseEnter = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        let shouldStopPropagation = true;
        if (state.isPressed && !state.ignoreEmulatedMouseEvents && state.pointerType != null) {
          state.isOverTarget = true;
          shouldStopPropagation = triggerPressStart(e, state.pointerType);
        }
        if (shouldStopPropagation) e.stopPropagation();
      };
      pressProps2.onMouseLeave = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        let shouldStopPropagation = true;
        if (state.isPressed && !state.ignoreEmulatedMouseEvents && state.pointerType != null) {
          state.isOverTarget = false;
          shouldStopPropagation = triggerPressEndEvent(e, state.pointerType, false);
          cancelOnPointerExit(e);
        }
        if (shouldStopPropagation) e.stopPropagation();
      };
      pressProps2.onMouseUp = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (!state.ignoreEmulatedMouseEvents && e.button === 0 && !state.isPressed) triggerPressUpEvent(e, state.pointerType || "mouse");
      };
      let onMouseUp = (e) => {
        if (e.button !== 0) return;
        if (state.ignoreEmulatedMouseEvents) {
          state.ignoreEmulatedMouseEvents = false;
          return;
        }
        if (state.target && (0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) && state.pointerType != null) ;
        else cancelEvent(e);
        state.isOverTarget = false;
      };
      pressProps2.onTouchStart = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        let touch = $d27d541f9569d26d$var$getTouchFromEvent(e.nativeEvent);
        if (!touch) return;
        state.activePointerId = touch.identifier;
        state.ignoreEmulatedMouseEvents = true;
        state.isOverTarget = true;
        state.isPressed = true;
        state.target = e.currentTarget;
        state.pointerType = "touch";
        if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$16a4697467175487)(state.target);
        let shouldStopPropagation = triggerPressStart($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType);
        if (shouldStopPropagation) e.stopPropagation();
        addGlobalListener((0, $d447af545b77c9f1$export$f21a1ffae260145a)(e.currentTarget), "scroll", onScroll, true);
      };
      pressProps2.onTouchMove = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (!state.isPressed) {
          e.stopPropagation();
          return;
        }
        let touch = $d27d541f9569d26d$var$getTouchById(e.nativeEvent, state.activePointerId);
        let shouldStopPropagation = true;
        if (touch && $d27d541f9569d26d$var$isOverTarget(touch, e.currentTarget)) {
          if (!state.isOverTarget && state.pointerType != null) {
            state.isOverTarget = true;
            shouldStopPropagation = triggerPressStart($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType);
          }
        } else if (state.isOverTarget && state.pointerType != null) {
          state.isOverTarget = false;
          shouldStopPropagation = triggerPressEndEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType, false);
          cancelOnPointerExit($d27d541f9569d26d$var$createTouchEvent(state.target, e));
        }
        if (shouldStopPropagation) e.stopPropagation();
      };
      pressProps2.onTouchEnd = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (!state.isPressed) {
          e.stopPropagation();
          return;
        }
        let touch = $d27d541f9569d26d$var$getTouchById(e.nativeEvent, state.activePointerId);
        let shouldStopPropagation = true;
        if (touch && $d27d541f9569d26d$var$isOverTarget(touch, e.currentTarget) && state.pointerType != null) {
          triggerPressUpEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType);
          shouldStopPropagation = triggerPressEndEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType);
          triggerSyntheticClick(e.nativeEvent, state.target);
        } else if (state.isOverTarget && state.pointerType != null) shouldStopPropagation = triggerPressEndEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType, false);
        if (shouldStopPropagation) e.stopPropagation();
        state.isPressed = false;
        state.activePointerId = null;
        state.isOverTarget = false;
        state.ignoreEmulatedMouseEvents = true;
        if (state.target && !allowTextSelectionOnPress) (0, $cbf007e418543821$export$b0d6fa1ab32e3295)(state.target);
        removeAllGlobalListeners();
      };
      pressProps2.onTouchCancel = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        e.stopPropagation();
        if (state.isPressed) cancelEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e));
      };
      let onScroll = (e) => {
        if (state.isPressed && (0, $23f2114a1b82827e$export$4282f70798064fe0)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e), state.target)) cancelEvent({
          currentTarget: state.target,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
          altKey: false
        });
      };
      pressProps2.onDragStart = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        cancelEvent(e);
      };
    }
    return pressProps2;
  }, [
    addGlobalListener,
    isDisabled,
    preventFocusOnPress,
    removeAllGlobalListeners,
    allowTextSelectionOnPress,
    cancelOnPointerExit,
    triggerPressStart,
    triggerClick,
    triggerSyntheticClick
  ]);
  (0, import_react16.useEffect)(() => {
    if (!domRef || false) return;
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(domRef.current);
    if (!ownerDocument || !ownerDocument.head || ownerDocument.getElementById($d27d541f9569d26d$var$STYLE_ID)) return;
    const style = ownerDocument.createElement("style");
    style.id = $d27d541f9569d26d$var$STYLE_ID;
    let nonce = (0, $2b2d34ff061957fb$export$2b85b721e524d74b)(ownerDocument);
    if (nonce) style.nonce = nonce;
    style.textContent = `
@layer {
  [${$d27d541f9569d26d$var$PRESSABLE_ATTRIBUTE}] {
    touch-action: pan-x pan-y pinch-zoom;
  }
}
    `.trim();
    ownerDocument.head.prepend(style);
  }, [
    domRef
  ]);
  (0, import_react16.useEffect)(() => {
    let state = ref.current;
    return () => {
      if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$b0d6fa1ab32e3295)(state.target ?? void 0);
      for (let dispose of state.disposables) dispose();
      state.disposables = [];
    };
  }, [
    allowTextSelectionOnPress
  ]);
  return {
    isPressed: isPressedProp || isPressed,
    // oxlint-disable-next-line react/react-compiler
    pressProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(domProps, pressProps, {
      [$d27d541f9569d26d$var$PRESSABLE_ATTRIBUTE]: true
    })
  };
}
function $d27d541f9569d26d$var$isHTMLAnchorLink(target) {
  return target.tagName === "A" && target.hasAttribute("href");
}
function $d27d541f9569d26d$var$isValidKeyboardEvent(event, currentTarget) {
  const { key, code } = event;
  const element = currentTarget;
  const role = element.getAttribute("role");
  return (key === "Enter" || key === " " || key === "Spacebar" || code === "Space") && !(element instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element).HTMLInputElement && !$d27d541f9569d26d$var$isValidInputKey(element, key) || element instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element).HTMLTextAreaElement || element.isContentEditable) && // Links should only trigger with Enter key
  !((role === "link" || !role && $d27d541f9569d26d$var$isHTMLAnchorLink(element)) && key !== "Enter");
}
function $d27d541f9569d26d$var$createEvent(target, e) {
  let clientX = e.clientX;
  let clientY = e.clientY;
  return {
    currentTarget: target,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    clientX,
    clientY,
    key: e.key
  };
}
function $d27d541f9569d26d$var$shouldPreventDefaultUp(target) {
  if (target instanceof HTMLInputElement) return false;
  if (target instanceof HTMLButtonElement) return target.type !== "submit" && target.type !== "reset";
  if ($d27d541f9569d26d$var$isHTMLAnchorLink(target)) return false;
  return true;
}
function $d27d541f9569d26d$var$shouldPreventDefaultKeyboard(target, key) {
  if ((0, $2add3ce32c6007eb$export$9ac100e40613ea10)() && key === "Enter") return false;
  if (target instanceof HTMLInputElement) {
    if (key === "Enter" && (target.type === "checkbox" || target.type === "radio"))
      return false;
    return !$d27d541f9569d26d$var$isValidInputKey(target, key);
  }
  return $d27d541f9569d26d$var$shouldPreventDefaultUp(target);
}
var $d27d541f9569d26d$var$nonTextInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
function $d27d541f9569d26d$var$isValidInputKey(target, key) {
  return target.type === "checkbox" || target.type === "radio" ? key === " " : $d27d541f9569d26d$var$nonTextInputTypes.has(target.type);
}

// node_modules/react-aria/dist/private/utils/useDescription.mjs
var import_react17 = __toESM(require_react(), 1);
var $121970af65029459$var$descriptionId = 0;
var $121970af65029459$var$descriptionNodes = /* @__PURE__ */ new Map();
function $121970af65029459$export$f8aeda7b10753fa1(description) {
  let [id, setId] = (0, import_react17.useState)();
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (!description) return;
    let desc = $121970af65029459$var$descriptionNodes.get(description);
    if (!desc) {
      let id2 = `react-aria-description-${$121970af65029459$var$descriptionId++}`;
      setId(id2);
      let node = document.createElement("div");
      node.id = id2;
      node.style.display = "none";
      node.textContent = description;
      document.body.appendChild(node);
      desc = {
        refCount: 0,
        element: node
      };
      $121970af65029459$var$descriptionNodes.set(description, desc);
    } else setId(desc.element.id);
    desc.refCount++;
    return () => {
      if (desc && --desc.refCount === 0) {
        desc.element.remove();
        $121970af65029459$var$descriptionNodes.delete(description);
      }
    };
  }, [
    description
  ]);
  return {
    "aria-describedby": description ? id : void 0
  };
}

// node_modules/react-aria/dist/private/interactions/useLongPress.mjs
var import_react18 = __toESM(require_react(), 1);
var $7b01448eaad0fe7c$var$DEFAULT_THRESHOLD = 500;
function $7b01448eaad0fe7c$export$c24ed0104d07eab9(props) {
  let { isDisabled, pointerType, onLongPressStart, onLongPressEnd, onLongPress, threshold = $7b01448eaad0fe7c$var$DEFAULT_THRESHOLD, accessibilityDescription } = props;
  const timeRef = (0, import_react18.useRef)(void 0);
  let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
  let isAcceptedPointerType = (e) => pointerType ? e.pointerType === pointerType : e.pointerType === "mouse" || e.pointerType === "touch";
  let { pressProps } = (0, $d27d541f9569d26d$export$45712eceda6fad21)({
    isDisabled,
    onPressStart(e) {
      e.continuePropagation();
      if (isAcceptedPointerType(e)) {
        if (onLongPressStart) onLongPressStart({
          ...e,
          type: "longpressstart"
        });
        timeRef.current = setTimeout(() => {
          e.target.dispatchEvent(new PointerEvent("pointercancel", {
            bubbles: true
          }));
          addGlobalListener(e.target, "click", (e2) => e2.preventDefault(), {
            once: true
          });
          if ((0, $d447af545b77c9f1$export$b204af158042fbac)(e.target).activeElement !== e.target) (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(e.target);
          if (onLongPress) onLongPress({
            ...e,
            type: "longpress"
          });
          timeRef.current = void 0;
        }, threshold);
        if (e.pointerType === "touch") addGlobalListener(e.target, "contextmenu", (e2) => e2.preventDefault(), {
          once: true
        });
        let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(e.target);
        addGlobalListener(ownerWindow, "pointerup", () => {
          setTimeout(() => {
            removeAllGlobalListeners();
          }, 100);
        }, {
          once: true
        });
      }
    },
    onPressEnd(e) {
      if (timeRef.current) clearTimeout(timeRef.current);
      if (onLongPressEnd && isAcceptedPointerType(e)) onLongPressEnd({
        ...e,
        type: "longpressend"
      });
    }
  });
  let descriptionProps = (0, $121970af65029459$export$f8aeda7b10753fa1)(onLongPress && !isDisabled ? accessibilityDescription : void 0);
  return {
    longPressProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(pressProps, descriptionProps)
  };
}

// node_modules/react-aria/dist/private/selection/useSelectableItem.mjs
var import_react19 = __toESM(require_react(), 1);
function $f6ba6936bfd098a0$export$ecf600387e221c37(options) {
  let { id, selectionManager: manager, key, ref, shouldSelectOnPressUp, shouldUseVirtualFocus, focus, isDisabled, onAction, allowsDifferentPressOrigin, linkBehavior = "action" } = options;
  let router = (0, $caaf0dd3060ed57c$export$9a302a45f65d0572)();
  id = (0, $390e54f620492c70$export$f680877a34711e37)(id);
  let onSelect = (e) => {
    if (e.pointerType === "keyboard" && (0, $22bbea12c2567021$export$d3e3bd3e26688c04)(e)) manager.toggleSelection(key);
    else {
      if (manager.selectionMode === "none") return;
      if (manager.isLink(key)) {
        if (linkBehavior === "selection" && ref.current) {
          let itemProps2 = manager.getItemProps(key);
          router.open(ref.current, e, itemProps2.href, itemProps2.routerOptions);
          manager.setSelectedKeys(manager.selectedKeys);
          return;
        } else if (linkBehavior === "override" || linkBehavior === "none") return;
      }
      if (manager.selectionMode === "single") {
        if (manager.isSelected(key) && !manager.disallowEmptySelection) manager.toggleSelection(key);
        else manager.replaceSelection(key);
      } else if (e && e.shiftKey) manager.extendSelection(key);
      else if (manager.selectionBehavior === "toggle" || e && ((0, $bb39c0fc1c19b34c$export$16792effe837dba3)(e) || e.pointerType === "touch" || e.pointerType === "virtual"))
        manager.toggleSelection(key);
      else manager.replaceSelection(key);
    }
  };
  (0, import_react19.useEffect)(() => {
    let isFocused = key === manager.focusedKey;
    if (isFocused && manager.isFocused) {
      if (!shouldUseVirtualFocus) {
        if (focus) focus();
        else if ((0, $23f2114a1b82827e$export$cd4e5573fbe2b576)() !== ref.current && ref.current) (0, $f192c2f16961cbe0$export$80f3e147d781571c)(ref.current);
      } else (0, $b72f3f7b3b5f42c6$export$76e4e37e5339496d)(ref.current);
    }
  }, [
    ref,
    key,
    manager.focusedKey,
    manager.childFocusStrategy,
    manager.isFocused,
    shouldUseVirtualFocus
  ]);
  isDisabled = isDisabled || manager.isDisabled(key);
  let itemProps = {};
  if (!shouldUseVirtualFocus && !isDisabled) itemProps = {
    tabIndex: key === manager.focusedKey ? 0 : -1,
    onFocus(e) {
      if ((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) === ref.current) manager.setFocusedKey(key);
    }
  };
  else if (isDisabled) itemProps.onMouseDown = (e) => {
    e.preventDefault();
  };
  (0, import_react19.useEffect)(() => {
    if (isDisabled && manager.focusedKey === key) manager.setFocusedKey(null);
  }, [
    manager,
    isDisabled,
    key
  ]);
  let isLinkOverride = manager.isLink(key) && linkBehavior === "override";
  let isActionOverride = onAction && options["UNSTABLE_itemBehavior"] === "action";
  let hasLinkAction = manager.isLink(key) && linkBehavior !== "selection" && linkBehavior !== "none";
  let allowsSelection = !isDisabled && manager.canSelectItem(key) && !isLinkOverride && !isActionOverride;
  let allowsActions = (onAction || hasLinkAction) && !isDisabled;
  let hasPrimaryAction = allowsActions && (manager.selectionBehavior === "replace" ? !allowsSelection : !allowsSelection || manager.isEmpty);
  let hasSecondaryAction = allowsActions && allowsSelection && manager.selectionBehavior === "replace";
  let hasAction = hasPrimaryAction || hasSecondaryAction;
  let modality = (0, import_react19.useRef)(null);
  let longPressEnabled = hasAction && allowsSelection;
  let longPressEnabledOnPressStart = (0, import_react19.useRef)(false);
  let hadPrimaryActionOnPressStart = (0, import_react19.useRef)(false);
  let collectionItemProps = manager.getItemProps(key);
  let performAction = (e) => {
    if (onAction) {
      onAction();
      ref.current?.dispatchEvent(new CustomEvent("react-aria-item-action", {
        bubbles: true
      }));
    }
    if (hasLinkAction && ref.current) router.open(ref.current, e, collectionItemProps.href, collectionItemProps.routerOptions);
  };
  let itemPressProps = {
    ref
  };
  if (shouldSelectOnPressUp) {
    itemPressProps.onPressStart = (e) => {
      modality.current = e.pointerType;
      longPressEnabledOnPressStart.current = longPressEnabled;
      if (e.pointerType === "keyboard" && (!hasAction || $f6ba6936bfd098a0$var$isSelectionKey(e.key))) onSelect(e);
    };
    if (!allowsDifferentPressOrigin)
      itemPressProps.onPress = (e) => {
        if (hasPrimaryAction || hasSecondaryAction && e.pointerType !== "mouse") {
          if (e.pointerType === "keyboard" && !$f6ba6936bfd098a0$var$isActionKey(e.key)) return;
          performAction(e);
        } else if (e.pointerType !== "keyboard" && allowsSelection) onSelect(e);
      };
    else {
      itemPressProps.onPressUp = hasPrimaryAction ? void 0 : (e) => {
        if (e.pointerType === "mouse" && allowsSelection) onSelect(e);
      };
      itemPressProps.onPress = hasPrimaryAction ? performAction : (e) => {
        if (e.pointerType !== "keyboard" && e.pointerType !== "mouse" && allowsSelection) onSelect(e);
      };
    }
  } else {
    itemPressProps.onPressStart = (e) => {
      modality.current = e.pointerType;
      longPressEnabledOnPressStart.current = longPressEnabled;
      hadPrimaryActionOnPressStart.current = hasPrimaryAction;
      if (allowsSelection && (e.pointerType === "mouse" && !hasPrimaryAction || e.pointerType === "keyboard" && (!allowsActions || $f6ba6936bfd098a0$var$isSelectionKey(e.key)))) onSelect(e);
    };
    itemPressProps.onPress = (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen" || e.pointerType === "virtual" || e.pointerType === "keyboard" && hasAction && $f6ba6936bfd098a0$var$isActionKey(e.key) || e.pointerType === "mouse" && hadPrimaryActionOnPressStart.current) {
        if (hasAction) performAction(e);
        else if (allowsSelection) onSelect(e);
      }
    };
  }
  let collectionId = (0, $22bbea12c2567021$export$6aeb1680a0ae8741)(manager.collection);
  itemProps["data-collection"] = collectionId;
  itemProps["data-key"] = key;
  itemPressProps.preventFocusOnPress = shouldUseVirtualFocus;
  if (shouldUseVirtualFocus)
    itemPressProps = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(itemPressProps, {
      onPressStart(e) {
        if (e.pointerType !== "touch") {
          manager.setFocused(true);
          manager.setFocusedKey(key);
        }
      },
      onPress(e) {
        if (e.pointerType === "touch") {
          manager.setFocused(true);
          manager.setFocusedKey(key);
        }
      }
    });
  if (collectionItemProps) {
    for (let key2 of [
      "onPressStart",
      "onPressEnd",
      "onPressChange",
      "onPress",
      "onPressUp",
      "onClick"
    ]) if (collectionItemProps[key2])
      itemPressProps[key2] = (0, $a4e76a5424781910$export$e08e3b67e392101e)(itemPressProps[key2], collectionItemProps[key2]);
  }
  let { pressProps, isPressed } = (0, $d27d541f9569d26d$export$45712eceda6fad21)(itemPressProps);
  let onDoubleClick = hasSecondaryAction ? (e) => {
    if (modality.current === "mouse") {
      e.stopPropagation();
      e.preventDefault();
      performAction(e);
    }
  } : void 0;
  let { longPressProps } = (0, $7b01448eaad0fe7c$export$c24ed0104d07eab9)({
    isDisabled: !longPressEnabled,
    onLongPress(e) {
      if (e.pointerType === "touch") {
        onSelect(e);
        manager.setSelectionBehavior("toggle");
      }
    }
  });
  let onDragStartCapture = (e) => {
    if (modality.current === "touch" && longPressEnabledOnPressStart.current) e.preventDefault();
  };
  let onClick = linkBehavior !== "none" && manager.isLink(key) ? (e) => {
    if (!(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening) e.preventDefault();
  } : void 0;
  let mergedItemProps = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(
    // oxlint-disable-next-line react/react-compiler
    itemProps,
    allowsSelection || hasPrimaryAction || shouldUseVirtualFocus && !isDisabled ? pressProps : {},
    longPressEnabled ? longPressProps : {},
    // oxlint-disable-next-line react/react-compiler
    {
      onDoubleClick,
      onDragStartCapture,
      onClick,
      id
    },
    // Prevent DOM focus from moving on mouse down when using virtual focus
    shouldUseVirtualFocus ? {
      onMouseDown: (e) => e.preventDefault()
    } : void 0
  );
  let isChildInteraction = (target) => {
    let el = target;
    while (el && el !== ref.current) {
      let elCollection = el.getAttribute("data-collection");
      if (elCollection != null) return elCollection !== collectionId;
      el = el.parentElement;
    }
    return (0, $3b8b240c1bf84ab9$export$bebd5a1431fec25d)(target);
  };
  let baseOnPointerDown = mergedItemProps.onPointerDown;
  mergedItemProps.onPointerDown = (e) => {
    let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    if (target && target !== ref.current && isChildInteraction(target)) {
      e.stopPropagation();
      return;
    }
    baseOnPointerDown?.(e);
  };
  let baseOnMouseDown = mergedItemProps.onMouseDown;
  mergedItemProps.onMouseDown = (e) => {
    let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    if (target && target !== ref.current && isChildInteraction(target)) {
      e.stopPropagation();
      return;
    }
    baseOnMouseDown?.(e);
  };
  return {
    itemProps: mergedItemProps,
    isPressed,
    isSelected: manager.isSelected(key),
    isFocused: manager.isFocused && manager.focusedKey === key,
    isDisabled,
    allowsSelection,
    hasAction
  };
}
function $f6ba6936bfd098a0$var$isActionKey(key) {
  return key === "Enter";
}
function $f6ba6936bfd098a0$var$isSelectionKey(key) {
  return key === " ";
}

// node_modules/react-aria/dist/private/tabs/useTab.mjs
function $1b6fa05bad3d7740$export$fdf4756d5b8ef90a(props, state, ref) {
  let { key, isDisabled: propsDisabled, shouldSelectOnPressUp } = props;
  let { selectionManager: manager, selectedKey } = state;
  let isSelected = key === selectedKey;
  let isDisabled = propsDisabled || state.isDisabled || state.selectionManager.isDisabled(key);
  let item = state.collection.getItem(key);
  let { itemProps, isPressed } = (0, $f6ba6936bfd098a0$export$ecf600387e221c37)({
    selectionManager: manager,
    key,
    ref,
    isDisabled,
    // Link tabs should behave like native anchors (navigate on press up)
    // This avoids reopening beforeunload dialogs when browsers replay
    // queued pointer enter/leave events after cancellation.
    shouldSelectOnPressUp: shouldSelectOnPressUp ?? item?.props.href != null,
    linkBehavior: "selection"
  });
  let tabId = (0, $a251981b23baaa12$export$567fc7097e064344)(state, key, "tab");
  let tabPanelId = (0, $a251981b23baaa12$export$567fc7097e064344)(state, key, "tabpanel");
  let { tabIndex } = itemProps;
  let domProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(item?.props, {
    labelable: true
  });
  delete domProps.id;
  let linkProps = (0, $caaf0dd3060ed57c$export$7e924b3091a3bd18)(item?.props);
  let { focusableProps } = (0, $d1116acdf220c2da$export$4c014de7c8940b4c)({
    ...item?.props,
    isDisabled
  }, ref);
  return {
    tabProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(domProps, focusableProps, linkProps, itemProps, {
      id: tabId,
      "aria-selected": isSelected,
      "aria-disabled": isDisabled || void 0,
      "aria-controls": isSelected ? tabPanelId : void 0,
      tabIndex: isDisabled ? void 0 : tabIndex,
      role: "tab"
    }),
    isSelected,
    isDisabled,
    isPressed
  };
}

// node_modules/react-aria/dist/private/utils/useLabels.mjs
function $e8ac3c3f5d4bae7f$export$d6875122194c7b44(props, defaultLabel) {
  let { id, "aria-label": label, "aria-labelledby": labelledBy } = props;
  id = (0, $390e54f620492c70$export$f680877a34711e37)(id);
  if (labelledBy && label) {
    let ids = /* @__PURE__ */ new Set([
      id,
      ...labelledBy.trim().split(/\s+/)
    ]);
    labelledBy = [
      ...ids
    ].join(" ");
  } else if (labelledBy) labelledBy = labelledBy.trim().split(/\s+/).join(" ");
  if (!label && !labelledBy && defaultLabel) label = defaultLabel;
  return {
    id,
    "aria-label": label,
    "aria-labelledby": labelledBy
  };
}

// node_modules/react-aria/dist/private/tabs/TabsKeyboardDelegate.mjs
var $a226bee26c88efd7$export$15010ca3c1abe90b = class {
  constructor(collection, direction, orientation, disabledKeys = /* @__PURE__ */ new Set()) {
    this.collection = collection;
    this.flipDirection = direction === "rtl" && orientation === "horizontal";
    this.disabledKeys = disabledKeys;
    this.tabDirection = orientation === "horizontal";
  }
  getKeyLeftOf(key) {
    if (this.flipDirection) return this.getNextKey(key);
    return this.getPreviousKey(key);
  }
  getKeyRightOf(key) {
    if (this.flipDirection) return this.getPreviousKey(key);
    return this.getNextKey(key);
  }
  isDisabled(key) {
    return this.disabledKeys.has(key) || !!this.collection.getItem(key)?.props?.isDisabled;
  }
  getFirstKey() {
    let key = this.collection.getFirstKey();
    if (key != null && this.isDisabled(key)) key = this.getNextKey(key);
    return key;
  }
  getLastKey() {
    let key = this.collection.getLastKey();
    if (key != null && this.isDisabled(key)) key = this.getPreviousKey(key);
    return key;
  }
  getKeyAbove(key) {
    if (this.tabDirection) return null;
    return this.getPreviousKey(key);
  }
  getKeyBelow(key) {
    if (this.tabDirection) return null;
    return this.getNextKey(key);
  }
  getNextKey(startKey) {
    let key = startKey;
    do {
      key = this.collection.getKeyAfter(key);
      if (key == null) key = this.collection.getFirstKey();
    } while (key != null && this.isDisabled(key) && key !== startKey);
    return key;
  }
  getPreviousKey(startKey) {
    let key = startKey;
    do {
      key = this.collection.getKeyBefore(key);
      if (key == null) key = this.collection.getLastKey();
    } while (key != null && this.isDisabled(key) && key !== startKey);
    return key;
  }
};

// node_modules/react-aria/dist/private/utils/constants.mjs
var $8b2399d051d06d4c$export$447a38995de2c711 = "react-aria-clear-focus";
var $8b2399d051d06d4c$export$831c820ad60f9d12 = "react-aria-focus";

// node_modules/react-aria/dist/private/utils/isScrollable.mjs
function $901761b40e390936$export$2bb74740c4e19def(node, checkForOverflow) {
  if (!node) return false;
  let style = window.getComputedStyle(node);
  let root = document.scrollingElement || document.documentElement;
  let isScrollable = /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
  if (node === root && style.overflow !== "hidden") isScrollable = true;
  if (isScrollable && checkForOverflow) isScrollable = node.scrollHeight !== node.clientHeight || node.scrollWidth !== node.clientWidth;
  return isScrollable;
}

// node_modules/react-aria/dist/private/utils/getScrollParents.mjs
function $76d97191f0f90600$export$94ed1c92c7beeb22(node, checkForOverflow) {
  let parentElements = [];
  let root = document.scrollingElement || document.documentElement;
  while (node) {
    if ((0, $901761b40e390936$export$2bb74740c4e19def)(node, checkForOverflow)) parentElements.push(node);
    if (node === root) break;
    node = node.parentElement;
  }
  return parentElements;
}

// node_modules/react-aria/dist/private/utils/scrollIntoView.mjs
function $51a3e22a5186a962$export$53a0910f038337bd(scrollView, element, opts = {}) {
  let { block = "nearest", inline = "nearest" } = opts;
  if (scrollView === element) return;
  let y = scrollView.scrollTop;
  let x = scrollView.scrollLeft;
  let target = element.getBoundingClientRect();
  let view = scrollView.getBoundingClientRect();
  let itemStyle = window.getComputedStyle(element);
  let viewStyle = window.getComputedStyle(scrollView);
  let root = document.scrollingElement || document.documentElement;
  let isRoot = scrollView === root;
  let viewTop = scrollView === root ? 0 : view.top;
  let viewBottom = scrollView === root ? scrollView.clientHeight : view.bottom;
  let viewLeft = scrollView === root ? 0 : view.left;
  let viewRight = scrollView === root ? scrollView.clientWidth : view.right;
  let scrollMarginTop = parseFloat(itemStyle.scrollMarginTop) || 0;
  let scrollMarginBottom = parseFloat(itemStyle.scrollMarginBottom) || 0;
  let scrollMarginLeft = parseFloat(itemStyle.scrollMarginLeft) || 0;
  let scrollMarginRight = parseFloat(itemStyle.scrollMarginRight) || 0;
  let scrollPaddingTop = parseFloat(viewStyle.scrollPaddingTop) || 0;
  let scrollPaddingBottom = parseFloat(viewStyle.scrollPaddingBottom) || 0;
  let scrollPaddingLeft = parseFloat(viewStyle.scrollPaddingLeft) || 0;
  let scrollPaddingRight = parseFloat(viewStyle.scrollPaddingRight) || 0;
  let borderTopWidth = parseFloat(viewStyle.borderTopWidth) || 0;
  let borderBottomWidth = parseFloat(viewStyle.borderBottomWidth) || 0;
  let borderLeftWidth = parseFloat(viewStyle.borderLeftWidth) || 0;
  let borderRightWidth = parseFloat(viewStyle.borderRightWidth) || 0;
  let scrollAreaTop = target.top - scrollMarginTop;
  let scrollAreaBottom = target.bottom + scrollMarginBottom;
  let scrollAreaLeft = target.left - scrollMarginLeft;
  let scrollAreaRight = target.right + scrollMarginRight;
  let scrollBarOffsetX = scrollView === root ? 0 : borderLeftWidth + borderRightWidth;
  let scrollBarOffsetY = scrollView === root ? 0 : borderTopWidth + borderBottomWidth;
  let scrollBarWidth = scrollView === root ? 0 : scrollView.offsetWidth - scrollView.clientWidth - scrollBarOffsetX;
  let scrollBarHeight = scrollView === root ? 0 : scrollView.offsetHeight - scrollView.clientHeight - scrollBarOffsetY;
  let scrollPortTop = viewTop + (isRoot ? 0 : borderTopWidth) + scrollPaddingTop;
  let scrollPortBottom = viewBottom - (isRoot ? 0 : borderBottomWidth) - scrollPaddingBottom - scrollBarHeight;
  let scrollPortLeft = viewLeft + (isRoot ? 0 : borderLeftWidth) + scrollPaddingLeft;
  let scrollPortRight = viewRight - (isRoot ? 0 : borderRightWidth) - scrollPaddingRight;
  if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)() || viewStyle.direction === "ltr") scrollPortRight -= scrollBarWidth;
  else if (viewStyle.direction === "rtl") scrollPortLeft += scrollBarWidth;
  let shouldScrollBlock = scrollAreaTop < scrollPortTop || scrollAreaBottom > scrollPortBottom;
  let shouldScrollInline = scrollAreaLeft < scrollPortLeft || scrollAreaRight > scrollPortRight;
  if (shouldScrollBlock && block === "start") y += scrollAreaTop - scrollPortTop;
  else if (shouldScrollBlock && block === "center") y += (scrollAreaTop + scrollAreaBottom) / 2 - (scrollPortTop + scrollPortBottom) / 2;
  else if (shouldScrollBlock && block === "end") y += scrollAreaBottom - scrollPortBottom;
  else if (shouldScrollBlock && block === "nearest") {
    let start = scrollAreaTop - scrollPortTop;
    let end = scrollAreaBottom - scrollPortBottom;
    y += Math.abs(start) <= Math.abs(end) ? start : end;
  }
  if (shouldScrollInline && inline === "start") x += scrollAreaLeft - scrollPortLeft;
  else if (shouldScrollInline && inline === "center") x += (scrollAreaLeft + scrollAreaRight) / 2 - (scrollPortLeft + scrollPortRight) / 2;
  else if (shouldScrollInline && inline === "end") x += scrollAreaRight - scrollPortRight;
  else if (shouldScrollInline && inline === "nearest") {
    let start = scrollAreaLeft - scrollPortLeft;
    let end = scrollAreaRight - scrollPortRight;
    x += Math.abs(start) <= Math.abs(end) ? start : end;
  }
  if (false) {
    scrollView.scrollLeft = x;
    scrollView.scrollTop = y;
    return;
  }
  scrollView.scrollTo({
    left: x,
    top: y
  });
}
function $51a3e22a5186a962$export$c826860796309d1b(targetElement, opts = {}) {
  let { containingElement } = opts;
  if (targetElement && targetElement.isConnected) {
    let root = document.scrollingElement || document.documentElement;
    let isScrollPrevented = window.getComputedStyle(root).overflow === "hidden";
    if (!isScrollPrevented) {
      let { left: originalLeft, top: originalTop } = targetElement.getBoundingClientRect();
      targetElement?.scrollIntoView?.({
        block: "nearest"
      });
      let { left: newLeft, top: newTop } = targetElement.getBoundingClientRect();
      if (Math.abs(originalLeft - newLeft) > 1 || Math.abs(originalTop - newTop) > 1) {
        containingElement?.scrollIntoView?.({
          block: "center",
          inline: "center"
        });
        targetElement.scrollIntoView?.({
          block: "nearest"
        });
      }
    } else {
      let { left: originalLeft, top: originalTop } = targetElement.getBoundingClientRect();
      let scrollParents = (0, $76d97191f0f90600$export$94ed1c92c7beeb22)(targetElement, true);
      for (let scrollParent of scrollParents) $51a3e22a5186a962$export$53a0910f038337bd(scrollParent, targetElement);
      let { left: newLeft, top: newTop } = targetElement.getBoundingClientRect();
      if (Math.abs(originalLeft - newLeft) > 1 || Math.abs(originalTop - newTop) > 1) {
        scrollParents = containingElement ? (0, $76d97191f0f90600$export$94ed1c92c7beeb22)(containingElement, true) : [];
        for (let scrollParent of scrollParents) $51a3e22a5186a962$export$53a0910f038337bd(scrollParent, containingElement, {
          block: "center",
          inline: "center"
        });
        for (let scrollParent of (0, $76d97191f0f90600$export$94ed1c92c7beeb22)(targetElement, true)) $51a3e22a5186a962$export$53a0910f038337bd(scrollParent, targetElement);
      }
    }
  }
}

// node_modules/react-aria/dist/private/utils/useEvent.mjs
var import_react20 = __toESM(require_react(), 1);
function $600b3cf69ae46262$export$90fc3a17d93f704c(ref, event, handler, options) {
  let handleEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(handler);
  let isDisabled = handler == null;
  (0, import_react20.useEffect)(() => {
    if (isDisabled || !ref.current) return;
    let element = ref.current;
    element.addEventListener(event, handleEvent, options);
    return () => {
      element.removeEventListener(event, handleEvent, options);
    };
  }, [
    ref,
    event,
    options,
    isDisabled
  ]);
}

// node_modules/react-aria/dist/private/selection/useTypeSelect.mjs
var import_react21 = __toESM(require_react(), 1);
var $f5a4a9a3486154da$var$TYPEAHEAD_DEBOUNCE_WAIT_MS = 1e3;
function $f5a4a9a3486154da$export$e32c88dfddc6e1d8(options) {
  let { keyboardDelegate, selectionManager, onTypeSelect } = options;
  let state = (0, import_react21.useRef)({
    search: "",
    timeout: void 0
  });
  let onKeyDownCapture = (e) => {
    if (state.current.search.length > 0 && e.key === " ") {
      e.preventDefault();
      if (!("continuePropagation" in e) || "continuePropagation" in e && !e.isPropagationStopped()) e.stopPropagation();
      state.current.search += " ";
      if (keyboardDelegate.getKeyForSearch != null) {
        let key = keyboardDelegate.getKeyForSearch(state.current.search, selectionManager.focusedKey);
        if (key == null) key = keyboardDelegate.getKeyForSearch(state.current.search);
        if (key != null) {
          selectionManager.setFocusedKey(key);
          if (onTypeSelect) onTypeSelect(key);
        }
      }
      clearTimeout(state.current.timeout);
      state.current.timeout = setTimeout(() => {
        state.current.search = "";
      }, $f5a4a9a3486154da$var$TYPEAHEAD_DEBOUNCE_WAIT_MS);
    }
  };
  let onKeyDown = (e) => {
    let character = $f5a4a9a3486154da$var$getStringForKey(e.key);
    if (!character || e.ctrlKey || e.metaKey || e.altKey || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) || state.current.search.length === 0 && character === " ") return;
    state.current.search += character;
    if (keyboardDelegate.getKeyForSearch != null) {
      let key = keyboardDelegate.getKeyForSearch(state.current.search, selectionManager.focusedKey);
      if (key == null) key = keyboardDelegate.getKeyForSearch(state.current.search);
      if (key != null) {
        selectionManager.setFocusedKey(key);
        if (onTypeSelect) onTypeSelect(key);
        e.preventDefault();
        if (!("continuePropagation" in e)) e.stopPropagation();
      } else {
        state.current.search = "";
        clearTimeout(state.current.timeout);
        state.current.timeout = void 0;
        return;
      }
    }
    clearTimeout(state.current.timeout);
    state.current.timeout = setTimeout(() => {
      state.current.search = "";
    }, $f5a4a9a3486154da$var$TYPEAHEAD_DEBOUNCE_WAIT_MS);
  };
  (0, import_react21.useEffect)(() => {
    let timeout = state.current.timeout;
    return () => {
      clearTimeout(timeout);
    };
  }, [
    state
  ]);
  return {
    typeSelectProps: {
      // Using a capturing listener to catch the keydown event before
      // other hooks in order to handle the Spacebar event.
      onKeyDownCapture: keyboardDelegate.getKeyForSearch ? onKeyDownCapture : void 0,
      onKeyDown: keyboardDelegate.getKeyForSearch ? onKeyDown : void 0
    }
  };
}
function $f5a4a9a3486154da$var$getStringForKey(key) {
  if (key.length === 1 || !/^[A-Z]/i.test(key)) return key;
  return "";
}

// node_modules/react-aria/dist/private/utils/useUpdateLayoutEffect.mjs
var import_react22 = __toESM(require_react(), 1);
function $a475cdc2445827b5$export$72ef708ab07251f1(effect, dependencies) {
  const isInitialMount = (0, import_react22.useRef)(true);
  const lastDeps = (0, import_react22.useRef)(null);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    isInitialMount.current = true;
    return () => {
      isInitialMount.current = false;
    };
  }, []);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (isInitialMount.current) isInitialMount.current = false;
    else if (!lastDeps.current || dependencies.some((dep, i) => !Object.is(dep, lastDeps[i]))) effect();
    lastDeps.current = dependencies;
  }, dependencies);
}

// node_modules/react-aria/dist/private/selection/useSelectableCollection.mjs
var import_react_dom4 = __toESM(require_react_dom(), 1);
var import_react23 = __toESM(require_react(), 1);
function $d667c2af82d35a98$export$d6daf82dcd84e87c(options) {
  let { selectionManager: manager, keyboardDelegate: delegate, ref, autoFocus = false, shouldFocusWrap = false, disallowEmptySelection = false, disallowSelectAll = false, escapeKeyBehavior = "clearSelection", selectOnFocus = manager.selectionBehavior === "replace", disallowTypeAhead = false, shouldUseVirtualFocus, allowsTabNavigation = false, scrollRef = ref, linkBehavior = "action", UNSTABLE_focusOnEntry } = options;
  let { direction } = (0, $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7)();
  let router = (0, $caaf0dd3060ed57c$export$9a302a45f65d0572)();
  const navigateToKey = (e, key, childFocus) => {
    if (key != null) {
      if (manager.isLink(key) && linkBehavior === "selection" && selectOnFocus && !(0, $22bbea12c2567021$export$d3e3bd3e26688c04)(e)) {
        (0, import_react_dom4.flushSync)(() => {
          manager.setFocusedKey(key, childFocus);
        });
        let item = (0, $22bbea12c2567021$export$c3d8340acf92597f)(ref, key);
        let itemProps = manager.getItemProps(key);
        if (item) {
          router.open(item, e, itemProps.href, itemProps.routerOptions);
          return;
        }
        return false;
      }
      manager.setFocusedKey(key, childFocus);
      if (manager.isLink(key) && linkBehavior === "override") return false;
      if (e.shiftKey && manager.selectionMode === "multiple") {
        manager.extendSelection(key);
        return;
      } else if (selectOnFocus && !(0, $22bbea12c2567021$export$d3e3bd3e26688c04)(e)) {
        manager.replaceSelection(key);
        return;
      }
    }
    return false;
  };
  let arrowDown = (e) => {
    if (delegate.getKeyBelow) {
      let nextKey = manager.focusedKey != null ? delegate.getKeyBelow?.(manager.focusedKey) : delegate.getFirstKey?.();
      if (nextKey == null && shouldFocusWrap) nextKey = delegate.getFirstKey?.(manager.focusedKey);
      if (nextKey != null) {
        navigateToKey(e, nextKey);
        return;
      }
    }
    return false;
  };
  let arrowUp = (e) => {
    if (delegate.getKeyAbove) {
      let nextKey = manager.focusedKey != null ? delegate.getKeyAbove?.(manager.focusedKey) : delegate.getLastKey?.();
      if (nextKey == null && shouldFocusWrap) nextKey = delegate.getLastKey?.(manager.focusedKey);
      if (nextKey != null) {
        navigateToKey(e, nextKey);
        return;
      }
    }
    return false;
  };
  let home = (e) => {
    if (delegate.getFirstKey) {
      if (manager.focusedKey === null && e.shiftKey) return false;
      let firstKey2 = delegate.getFirstKey(manager.focusedKey, (0, $bb39c0fc1c19b34c$export$16792effe837dba3)(e));
      manager.setFocusedKey(firstKey2);
      if (firstKey2 != null) {
        if ((0, $bb39c0fc1c19b34c$export$16792effe837dba3)(e) && e.shiftKey && manager.selectionMode === "multiple") {
          manager.extendSelection(firstKey2);
          return;
        } else if (selectOnFocus) {
          manager.replaceSelection(firstKey2);
          return;
        }
      }
    }
    return false;
  };
  let arrowLeft = (e) => {
    if (delegate.getKeyLeftOf) {
      let nextKey = manager.focusedKey != null ? delegate.getKeyLeftOf?.(manager.focusedKey) : delegate.getFirstKey?.();
      if (nextKey == null && shouldFocusWrap) nextKey = direction === "rtl" ? delegate.getFirstKey?.(manager.focusedKey) : delegate.getLastKey?.(manager.focusedKey);
      if (nextKey != null) {
        navigateToKey(e, nextKey, direction === "rtl" ? "first" : "last");
        return;
      }
    }
    return false;
  };
  let arrowRight = (e) => {
    if (delegate.getKeyRightOf) {
      let nextKey = manager.focusedKey != null ? delegate.getKeyRightOf?.(manager.focusedKey) : delegate.getFirstKey?.();
      if (nextKey == null && shouldFocusWrap) nextKey = direction === "rtl" ? delegate.getLastKey?.(manager.focusedKey) : delegate.getFirstKey?.(manager.focusedKey);
      if (nextKey != null) {
        navigateToKey(e, nextKey, direction === "rtl" ? "last" : "first");
        return;
      }
    }
    return false;
  };
  let end = (e) => {
    if (delegate.getLastKey) {
      if (manager.focusedKey === null && e.shiftKey) return false;
      let lastKey = delegate.getLastKey(manager.focusedKey, (0, $bb39c0fc1c19b34c$export$16792effe837dba3)(e));
      manager.setFocusedKey(lastKey);
      if (lastKey != null) {
        if ((0, $bb39c0fc1c19b34c$export$16792effe837dba3)(e) && e.shiftKey && manager.selectionMode === "multiple") {
          manager.extendSelection(lastKey);
          return;
        } else if (selectOnFocus) {
          manager.replaceSelection(lastKey);
          return;
        }
      }
    }
    return false;
  };
  let pageDown = (e) => {
    if (delegate.getKeyPageBelow && manager.focusedKey != null) {
      let nextKey = delegate.getKeyPageBelow(manager.focusedKey);
      if (nextKey != null) return navigateToKey(e, nextKey);
    }
    return false;
  };
  let pageUp = (e) => {
    if (delegate.getKeyPageAbove && manager.focusedKey != null) {
      let nextKey = delegate.getKeyPageAbove(manager.focusedKey);
      if (nextKey != null) return navigateToKey(e, nextKey);
    }
    return false;
  };
  let aHandler = () => {
    if (manager.selectionMode === "multiple" && disallowSelectAll !== true) {
      manager.selectAll();
      return;
    }
    return false;
  };
  let escape = () => {
    if (escapeKeyBehavior === "clearSelection" && !disallowEmptySelection && manager.selectedKeys.size !== 0) {
      manager.clearSelection();
      return;
    }
    return false;
  };
  let tab = () => {
    if (!allowsTabNavigation && ref.current) {
      let walker = (0, $535772f9d2c1f38d$export$2d6ec8fc375ceafa)(ref.current, {
        tabbable: true
      });
      let next = void 0;
      let last;
      do {
        last = walker.lastChild();
        if (last) next = last;
      } while (last);
      let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
      if (next && (!(0, $23f2114a1b82827e$export$b4f377a2b6254582)(next) || activeElement && !(0, $3b8b240c1bf84ab9$export$bebd5a1431fec25d)(activeElement))) (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(next);
    }
    return {
      shouldContinuePropagation: true,
      shouldPreventDefault: false
    };
  };
  let shiftTab = () => {
    if (!allowsTabNavigation && ref.current) ref.current.focus();
    return {
      shouldContinuePropagation: true,
      shouldPreventDefault: false
    };
  };
  let withShiftSel = (key, callback) => {
    return {
      [(0, $2add3ce32c6007eb$export$9ac100e40613ea10)() ? key + "+Shift+Alt" : key + "+Shift+Control"]: callback,
      [key + "+Shift"]: callback,
      [(0, $2add3ce32c6007eb$export$9ac100e40613ea10)() ? key + "+Alt" : key + "+Control"]: callback,
      [key]: callback
    };
  };
  let { keyboardProps: repeatKeyboardProps } = (0, $8296dad1a4c5e0dc$export$8f71654801c2f7cd)({
    shortcuts: {
      ...withShiftSel("ArrowDown", arrowDown),
      ...withShiftSel("ArrowUp", arrowUp),
      ...withShiftSel("ArrowLeft", arrowLeft),
      ...withShiftSel("ArrowRight", arrowRight),
      ...withShiftSel("PageDown", pageDown),
      ...withShiftSel("PageUp", pageUp)
    },
    allowRepeats: true
  });
  let { keyboardProps } = (0, $8296dad1a4c5e0dc$export$8f71654801c2f7cd)({
    shortcuts: {
      ...withShiftSel("Home", home),
      ...withShiftSel("End", end),
      "Mod+A": aHandler,
      Escape: escape,
      Tab: tab,
      "Tab+Shift": shiftTab
    }
  });
  let scrollPos = (0, import_react23.useRef)({
    top: 0,
    left: 0
  });
  (0, $600b3cf69ae46262$export$90fc3a17d93f704c)(scrollRef, "scroll", () => {
    scrollPos.current = {
      top: scrollRef.current?.scrollTop ?? 0,
      left: scrollRef.current?.scrollLeft ?? 0
    };
  });
  let onFocus = (e) => {
    if (manager.isFocused) {
      if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) manager.setFocused(false);
      return;
    }
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
    let modality = (0, $8f5a2122b0992be3$export$630ff653c5ada6a9)();
    manager.setFocused(true);
    let navigateToKey2 = (key) => {
      if (key != null) {
        manager.setFocusedKey(key);
        if (selectOnFocus && !manager.isSelected(key)) manager.replaceSelection(key);
      }
    };
    if (UNSTABLE_focusOnEntry && (modality === "keyboard" || modality === "virtual"))
      navigateToKey2(UNSTABLE_focusOnEntry === "first" ? delegate.getFirstKey?.() : delegate.getLastKey?.());
    else if (manager.focusedKey == null) {
      let relatedTarget = e.relatedTarget;
      if (relatedTarget && e.currentTarget.compareDocumentPosition(relatedTarget) & Node.DOCUMENT_POSITION_FOLLOWING) navigateToKey2(manager.lastSelectedKey ?? delegate.getLastKey?.());
      else navigateToKey2(manager.firstSelectedKey ?? delegate.getFirstKey?.());
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPos.current.top;
      scrollRef.current.scrollLeft = scrollPos.current.left;
    }
    if (manager.focusedKey != null && scrollRef.current) {
      let element = (0, $22bbea12c2567021$export$c3d8340acf92597f)(ref, manager.focusedKey);
      if (element instanceof HTMLElement) {
        if (!(0, $23f2114a1b82827e$export$b4f377a2b6254582)(element) && !shouldUseVirtualFocus) (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(element);
        if (modality === "keyboard" || UNSTABLE_focusOnEntry && modality === "virtual") (0, $51a3e22a5186a962$export$c826860796309d1b)(element, {
          containingElement: ref.current
        });
      }
    }
  };
  let onBlur = (e) => {
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, e.relatedTarget)) manager.setFocused(false);
  };
  let shouldVirtualFocusFirst = (0, import_react23.useRef)(false);
  (0, $600b3cf69ae46262$export$90fc3a17d93f704c)(ref, (0, $8b2399d051d06d4c$export$831c820ad60f9d12), !shouldUseVirtualFocus ? void 0 : (e) => {
    let { detail } = e;
    e.stopPropagation();
    manager.setFocused(true);
    if (detail?.focusStrategy === "first") shouldVirtualFocusFirst.current = true;
  });
  let firstKey = delegate.getFirstKey?.() ?? null;
  (0, $a475cdc2445827b5$export$72ef708ab07251f1)(() => {
    if (shouldVirtualFocusFirst.current) {
      if (firstKey == null) {
        let previousActiveElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
        (0, $b72f3f7b3b5f42c6$export$76e4e37e5339496d)(ref.current);
        (0, $b72f3f7b3b5f42c6$export$2b35b76d2e30e129)(previousActiveElement, null);
        if (manager.collection.size > 0) shouldVirtualFocusFirst.current = false;
      } else {
        manager.setFocusedKey(firstKey);
        shouldVirtualFocusFirst.current = false;
      }
    }
  }, [
    firstKey,
    manager.collection.size
  ]);
  (0, $a475cdc2445827b5$export$72ef708ab07251f1)(() => {
    if (manager.collection.size > 0) shouldVirtualFocusFirst.current = false;
  }, [
    manager.focusedKey
  ]);
  (0, $600b3cf69ae46262$export$90fc3a17d93f704c)(ref, (0, $8b2399d051d06d4c$export$447a38995de2c711), !shouldUseVirtualFocus ? void 0 : (e) => {
    e.stopPropagation();
    manager.setFocused(false);
    if (e.detail?.clearFocusKey) manager.setFocusedKey(null);
  });
  const autoFocusRef = (0, import_react23.useRef)(autoFocus);
  const didAutoFocusRef = (0, import_react23.useRef)(false);
  (0, import_react23.useEffect)(() => {
    if (autoFocusRef.current) {
      let focusedKey = null;
      if (autoFocus === "first") focusedKey = delegate.getFirstKey?.() ?? null;
      if (autoFocus === "last") focusedKey = delegate.getLastKey?.() ?? null;
      let selectedKeys = manager.selectedKeys;
      if (selectedKeys.size) {
        for (let key of selectedKeys) if (manager.canSelectItem(key)) {
          focusedKey = key;
          break;
        }
      }
      manager.setFocused(true);
      manager.setFocusedKey(focusedKey);
      if (focusedKey == null && !shouldUseVirtualFocus && ref.current) (0, $f192c2f16961cbe0$export$80f3e147d781571c)(ref.current);
      if (manager.collection.size > 0) {
        autoFocusRef.current = false;
        didAutoFocusRef.current = true;
      }
    }
  });
  let lastFocusedKey = (0, import_react23.useRef)(manager.focusedKey);
  let raf = (0, import_react23.useRef)(null);
  (0, import_react23.useEffect)(() => {
    if (manager.isFocused && manager.focusedKey != null && (manager.focusedKey !== lastFocusedKey.current || didAutoFocusRef.current) && scrollRef.current && ref.current) {
      let modality = (0, $8f5a2122b0992be3$export$630ff653c5ada6a9)();
      let element = (0, $22bbea12c2567021$export$c3d8340acf92597f)(ref, manager.focusedKey);
      if (!(element instanceof HTMLElement))
        return;
      if (modality === "keyboard" || didAutoFocusRef.current) {
        if (raf.current) cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => {
          if (scrollRef.current) {
            (0, $51a3e22a5186a962$export$53a0910f038337bd)(scrollRef.current, element);
            if (modality !== "virtual") (0, $51a3e22a5186a962$export$c826860796309d1b)(element, {
              containingElement: ref.current
            });
          }
        });
      }
    }
    if (!shouldUseVirtualFocus && manager.isFocused && manager.focusedKey == null && lastFocusedKey.current != null && ref.current) (0, $f192c2f16961cbe0$export$80f3e147d781571c)(ref.current);
    lastFocusedKey.current = manager.focusedKey;
    didAutoFocusRef.current = false;
  });
  (0, import_react23.useEffect)(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);
  (0, $600b3cf69ae46262$export$90fc3a17d93f704c)(ref, "react-aria-focus-scope-restore", (e) => {
    e.preventDefault();
    manager.setFocused(true);
  });
  let handlers = {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(keyboardProps, repeatKeyboardProps),
    onFocus,
    onBlur,
    onMouseDown(e) {
      if (scrollRef.current === (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))
        e.preventDefault();
    }
  };
  let { typeSelectProps } = (0, $f5a4a9a3486154da$export$e32c88dfddc6e1d8)({
    keyboardDelegate: delegate,
    selectionManager: manager
  });
  if (!disallowTypeAhead)
    handlers = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(typeSelectProps, handlers);
  let tabIndex = void 0;
  if (!shouldUseVirtualFocus) tabIndex = manager.focusedKey == null ? 0 : -1;
  let collectionId = (0, $22bbea12c2567021$export$881eb0d9f3605d9d)(manager.collection);
  return {
    // oxlint-disable-next-line react/react-compiler
    collectionProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(handlers, {
      tabIndex,
      "data-collection": collectionId
    })
  };
}

// node_modules/react-aria/dist/private/tabs/useTabList.mjs
var import_react24 = __toESM(require_react(), 1);
function $83428e53deb13caf$export$773e389e644c5874(props, state, ref) {
  let { orientation = "horizontal", keyboardActivation = "automatic" } = props;
  let { collection, selectionManager: manager, disabledKeys } = state;
  let { direction } = (0, $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7)();
  let delegate = (0, import_react24.useMemo)(() => new (0, $a226bee26c88efd7$export$15010ca3c1abe90b)(collection, direction, orientation, disabledKeys), [
    collection,
    disabledKeys,
    orientation,
    direction
  ]);
  let { collectionProps } = (0, $d667c2af82d35a98$export$d6daf82dcd84e87c)({
    ref,
    selectionManager: manager,
    keyboardDelegate: delegate,
    selectOnFocus: keyboardActivation === "automatic",
    disallowEmptySelection: true,
    scrollRef: ref,
    linkBehavior: "selection"
  });
  let tabsId = (0, $390e54f620492c70$export$f680877a34711e37)();
  (0, $a251981b23baaa12$export$c5f62239608282b6).set(state, tabsId);
  let tabListLabelProps = (0, $e8ac3c3f5d4bae7f$export$d6875122194c7b44)({
    ...props,
    id: tabsId
  });
  return {
    tabListProps: {
      ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(collectionProps, tabListLabelProps),
      role: "tablist",
      "aria-orientation": orientation,
      tabIndex: void 0
    }
  };
}

// node_modules/react-aria-components/dist/private/Tabs.mjs
var import_react27 = __toESM(require_react(), 1);

// node_modules/react-stately/dist/private/list/useSingleSelectListState.mjs
var import_react25 = __toESM(require_react(), 1);
function $0fdb127d377ffd84$export$e7f05e985daf4b5f(props) {
  let [selectedKey, setSelectedKey] = (0, $3e6197669829fe11$export$40bfa8c7b0832715)(props.selectedKey, props.defaultSelectedKey ?? null, props.onSelectionChange);
  let selectedKeys = (0, import_react25.useMemo)(() => selectedKey != null ? [
    selectedKey
  ] : [], [
    selectedKey
  ]);
  let { collection, disabledKeys, selectionManager } = (0, $b14b6f590b50af39$export$2f645645f7bca764)({
    ...props,
    selectionMode: "single",
    disallowEmptySelection: true,
    allowDuplicateSelectionEvents: true,
    selectedKeys,
    onSelectionChange: (keys) => {
      if (keys === "all") return;
      let key = keys.values().next().value ?? null;
      if (key === selectedKey && props.onSelectionChange) props.onSelectionChange(key);
      setSelectedKey(key);
    }
  });
  let selectedItem = selectedKey != null ? collection.getItem(selectedKey) : null;
  return {
    collection,
    disabledKeys,
    selectionManager,
    selectedKey,
    setSelectedKey,
    selectedItem
  };
}

// node_modules/react-stately/dist/private/tabs/useTabListState.mjs
var import_react26 = __toESM(require_react(), 1);
function $caeb030f09a278a1$export$4ba071daf4e486(props) {
  let state = (0, $0fdb127d377ffd84$export$e7f05e985daf4b5f)({
    ...props,
    onSelectionChange: props.onSelectionChange ? (key) => {
      if (key != null) props.onSelectionChange?.(key);
    } : void 0,
    suppressTextValueWarning: true,
    defaultSelectedKey: props.defaultSelectedKey ?? $caeb030f09a278a1$var$findDefaultSelectedKey(props.collection, props.disabledKeys ? new Set(props.disabledKeys) : /* @__PURE__ */ new Set()) ?? void 0
  });
  let { selectionManager, collection, selectedKey: currentSelectedKey } = state;
  let lastSelectedKey = (0, import_react26.useRef)(currentSelectedKey);
  (0, import_react26.useEffect)(() => {
    let selectedKey = currentSelectedKey;
    if (props.selectedKey == null && (selectionManager.isEmpty || selectedKey == null || !collection.getItem(selectedKey))) {
      selectedKey = $caeb030f09a278a1$var$findDefaultSelectedKey(collection, state.disabledKeys);
      if (selectedKey != null)
        selectionManager.setSelectedKeys([
          selectedKey
        ]);
    }
    if (selectedKey != null && selectionManager.focusedKey == null || !selectionManager.isFocused && selectedKey !== lastSelectedKey.current) selectionManager.setFocusedKey(selectedKey);
    lastSelectedKey.current = selectedKey;
  });
  return {
    ...state,
    isDisabled: props.isDisabled || false
  };
}
function $caeb030f09a278a1$var$findDefaultSelectedKey(collection, disabledKeys) {
  let selectedKey = null;
  if (collection) {
    selectedKey = collection.getFirstKey();
    while (selectedKey != null && (disabledKeys.has(selectedKey) || collection.getItem(selectedKey)?.props?.isDisabled) && selectedKey !== collection.getLastKey()) selectedKey = collection.getKeyAfter(selectedKey);
    if (selectedKey != null && (disabledKeys.has(selectedKey) || collection.getItem(selectedKey)?.props?.isDisabled) && selectedKey === collection.getLastKey()) selectedKey = collection.getFirstKey();
  }
  return selectedKey;
}

// node_modules/react-aria-components/dist/private/Tabs.mjs
var $b4f18e3395fe64d7$export$cfa7aa87c26e7d1f = /* @__PURE__ */ (0, import_react27.createContext)(null);
var $b4f18e3395fe64d7$export$364712098d2aa57c = /* @__PURE__ */ (0, import_react27.createContext)(null);
var $b4f18e3395fe64d7$export$b2539bed5023c21c = /* @__PURE__ */ (0, import_react27.forwardRef)(function Tabs(props, ref) {
  [props, ref] = (0, $7230ffa83bc0c2cf$export$29f1550f4b0d4415)(props, ref, $b4f18e3395fe64d7$export$cfa7aa87c26e7d1f);
  let { children, orientation = "horizontal" } = props;
  children = (0, import_react27.useMemo)(() => typeof children === "function" ? children({
    orientation,
    defaultChildren: null
  }) : children, [
    children,
    orientation
  ]);
  return /* @__PURE__ */ (0, import_react27.default).createElement((0, $42ceafc619f9c3ba$export$bf788dd355e3a401), {
    content: children
  }, (collection) => /* @__PURE__ */ (0, import_react27.default).createElement($b4f18e3395fe64d7$var$TabsInner, {
    props,
    collection,
    tabsRef: ref
  }));
});
function $b4f18e3395fe64d7$var$TabsInner({ props, tabsRef: ref, collection }) {
  let { orientation = "horizontal" } = props;
  let state = (0, $caeb030f09a278a1$export$4ba071daf4e486)({
    ...props,
    collection,
    children: void 0
  });
  let { focusProps, isFocused, isFocusVisible } = (0, $0c4a58759813079a$export$4e328f61c538687f)({
    within: true
  });
  let values = (0, import_react27.useMemo)(() => ({
    orientation,
    isFocusWithin: isFocused,
    isFocusVisible
  }), [
    orientation,
    isFocused,
    isFocusVisible
  ]);
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    ...props,
    defaultClassName: "react-aria-Tabs",
    values
  });
  let DOMProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
    global: true
  });
  return /* @__PURE__ */ (0, import_react27.default).createElement((0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div, {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(DOMProps, renderProps, focusProps),
    ref,
    slot: props.slot || void 0,
    "data-focused": isFocused || void 0,
    "data-orientation": orientation,
    "data-focus-visible": isFocusVisible || void 0,
    "data-disabled": state.isDisabled || void 0
  }, /* @__PURE__ */ (0, import_react27.default).createElement((0, $7230ffa83bc0c2cf$export$2881499e37b75b9a), {
    values: [
      [
        $b4f18e3395fe64d7$export$cfa7aa87c26e7d1f,
        props
      ],
      [
        $b4f18e3395fe64d7$export$364712098d2aa57c,
        state
      ]
    ]
  }, renderProps.children));
}
var $b4f18e3395fe64d7$export$e51a686c67fdaa2d = /* @__PURE__ */ (0, import_react27.forwardRef)(function TabList(props, ref) {
  let state = (0, import_react27.useContext)($b4f18e3395fe64d7$export$364712098d2aa57c);
  return state ? /* @__PURE__ */ (0, import_react27.default).createElement($b4f18e3395fe64d7$var$TabListInner, {
    props,
    forwardedRef: ref
  }) : /* @__PURE__ */ (0, import_react27.default).createElement((0, $42ceafc619f9c3ba$export$fb8073518f34e6ec), props);
});
function $b4f18e3395fe64d7$var$TabListInner({ props, forwardedRef: ref }) {
  let state = (0, import_react27.useContext)($b4f18e3395fe64d7$export$364712098d2aa57c);
  let { CollectionRoot } = (0, import_react27.useContext)((0, $263ab7fc0f95ccdb$export$4feb769f8ddf26c5));
  let { orientation = "horizontal", keyboardActivation = "automatic" } = (0, $7230ffa83bc0c2cf$export$fabf2dc03a41866e)($b4f18e3395fe64d7$export$cfa7aa87c26e7d1f);
  let objectRef = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(ref);
  let { tabListProps } = (0, $83428e53deb13caf$export$773e389e644c5874)({
    ...props,
    orientation,
    keyboardActivation
  }, state, objectRef);
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    ...props,
    children: null,
    defaultClassName: "react-aria-TabList",
    values: {
      orientation,
      state
    }
  });
  let DOMProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
    global: true
  });
  delete DOMProps.id;
  return /* @__PURE__ */ (0, import_react27.default).createElement((0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div, {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(DOMProps, renderProps, tabListProps),
    ref: objectRef,
    "data-orientation": orientation || void 0
  }, /* @__PURE__ */ (0, import_react27.default).createElement((0, $792f28e438b9ad5f$export$758399f318e6385a), null, /* @__PURE__ */ (0, import_react27.default).createElement(CollectionRoot, {
    collection: state.collection,
    persistedKeys: (0, $263ab7fc0f95ccdb$export$90e00781bc59d8f9)(state.selectionManager.focusedKey)
  })));
}
var _$b4f18e3395fe64d7$var$TabItemNode = class _$b4f18e3395fe64d7$var$TabItemNode extends (0, $6f0c29017aeec335$export$d68d59712b04d9d1) {
};
_$b4f18e3395fe64d7$var$TabItemNode.type = "item";
var $b4f18e3395fe64d7$var$TabItemNode = _$b4f18e3395fe64d7$var$TabItemNode;
var $b4f18e3395fe64d7$export$3e41faf802a29e71 = /* @__PURE__ */ (0, $42ceafc619f9c3ba$export$18af5c7a9e9b3664)($b4f18e3395fe64d7$var$TabItemNode, (props, forwardedRef, item) => {
  let state = (0, import_react27.useContext)($b4f18e3395fe64d7$export$364712098d2aa57c);
  let ref = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(forwardedRef);
  let { tabProps, isSelected, isDisabled, isPressed } = (0, $1b6fa05bad3d7740$export$fdf4756d5b8ef90a)({
    key: item.key,
    ...props
  }, state, ref);
  let { focusProps, isFocused, isFocusVisible } = (0, $0c4a58759813079a$export$4e328f61c538687f)();
  let { hoverProps, isHovered } = (0, $e969f22b6713ca4a$export$ae780daf29e6d456)({
    isDisabled,
    onHoverStart: props.onHoverStart,
    onHoverEnd: props.onHoverEnd,
    onHoverChange: props.onHoverChange
  });
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    ...props,
    id: void 0,
    children: item.rendered,
    defaultClassName: "react-aria-Tab",
    values: {
      isSelected,
      isDisabled,
      isFocused,
      isFocusVisible,
      isPressed,
      isHovered
    }
  });
  let ElementType = item.props.href ? (0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).a : (0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div;
  let DOMProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
    global: true
  });
  delete DOMProps.id;
  delete DOMProps.onClick;
  return /* @__PURE__ */ (0, import_react27.default).createElement(ElementType, {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(DOMProps, renderProps, tabProps, focusProps, hoverProps),
    ref,
    "data-selected": isSelected || void 0,
    "data-disabled": isDisabled || void 0,
    "data-focused": isFocused || void 0,
    "data-focus-visible": isFocusVisible || void 0,
    "data-pressed": isPressed || void 0,
    "data-hovered": isHovered || void 0
  }, /* @__PURE__ */ (0, import_react27.default).createElement((0, $91fe5e721c7f36c1$export$c9549807523555e0).Provider, {
    value: {
      isSelected
    }
  }, renderProps.children));
});

export {
  $6f0c29017aeec335$export$d68d59712b04d9d1,
  $6f0c29017aeec335$export$5ae2504e948afce5,
  $6f0c29017aeec335$export$8258a0665a675899,
  $6f0c29017aeec335$export$fd11f34e1d07f134,
  $6f0c29017aeec335$export$437f11dc9b403b78,
  $d7f64c32b702fe2c$export$86427a43e3e48ebb,
  $d7f64c32b702fe2c$export$b5d7cc18bb8d2b59,
  $42ceafc619f9c3ba$export$bf788dd355e3a401,
  $42ceafc619f9c3ba$export$18af5c7a9e9b3664,
  $42ceafc619f9c3ba$export$e953bb1cd0f19726,
  $42ceafc619f9c3ba$export$fb8073518f34e6ec,
  $263ab7fc0f95ccdb$export$d40e14dec8b060a8,
  $263ab7fc0f95ccdb$export$a164736487e3f0ae,
  $263ab7fc0f95ccdb$export$2dbbd341daed716d,
  $263ab7fc0f95ccdb$export$4feb769f8ddf26c5,
  $263ab7fc0f95ccdb$export$90e00781bc59d8f9,
  $792f28e438b9ad5f$export$758399f318e6385a,
  $91fe5e721c7f36c1$export$c9549807523555e0,
  $91fe5e721c7f36c1$export$17f80983afe4e444,
  $22bbea12c2567021$export$c3d8340acf92597f,
  $bb39c0fc1c19b34c$export$16792effe837dba3,
  $bb39c0fc1c19b34c$export$c57958e35f31ed73,
  $b72f3f7b3b5f42c6$export$76e4e37e5339496d,
  $b72f3f7b3b5f42c6$export$6c5dc7e81d2cc29a,
  $b72f3f7b3b5f42c6$export$2b35b76d2e30e129,
  $b72f3f7b3b5f42c6$export$759df0d867455a91,
  $2b2d34ff061957fb$export$2b85b721e524d74b,
  $24f9a20f226ad820$export$5165eccb35aaadb5,
  $d27d541f9569d26d$export$45712eceda6fad21,
  $121970af65029459$export$f8aeda7b10753fa1,
  $7b01448eaad0fe7c$export$c24ed0104d07eab9,
  $f6ba6936bfd098a0$export$ecf600387e221c37,
  $654b97e09f2a30c1$export$4d0f8be8b12a7ef6,
  $535772f9d2c1f38d$export$20e40289641fbbb6,
  $535772f9d2c1f38d$export$1258395f99bf9cbf,
  $535772f9d2c1f38d$export$2d6ec8fc375ceafa,
  $e8ac3c3f5d4bae7f$export$d6875122194c7b44,
  $8b2399d051d06d4c$export$447a38995de2c711,
  $8b2399d051d06d4c$export$831c820ad60f9d12,
  $901761b40e390936$export$2bb74740c4e19def,
  $51a3e22a5186a962$export$c826860796309d1b,
  $600b3cf69ae46262$export$90fc3a17d93f704c,
  $f5a4a9a3486154da$export$e32c88dfddc6e1d8,
  $d667c2af82d35a98$export$d6daf82dcd84e87c,
  $b24d1bc31a0f941d$export$a9d04c5684123369,
  $f664a81d022446b5$export$d085fb9e920b5ca7,
  $60f19cefd567a3e4$export$253fe78d46329472,
  $cd5ea4b915021f1d$export$1005530eda016c13,
  $4a07ac835f260f78$export$6c8a5aaad13c9852,
  $d03379b88399b8c5$export$6cd28814d92fa9c9,
  $b14b6f590b50af39$export$2f645645f7bca764,
  $b14b6f590b50af39$export$ba9d38c0f1bf2b36,
  $2c9edc598a03d523$export$420e68273165f4ec,
  $0c4a58759813079a$export$4e328f61c538687f,
  $b4f18e3395fe64d7$export$b2539bed5023c21c,
  $b4f18e3395fe64d7$export$e51a686c67fdaa2d,
  $b4f18e3395fe64d7$export$3e41faf802a29e71
};
