/**
 * Browser Consent DOM Collector
 *
 * Self-contained DOM collection function designed for injection via
 * `chrome.scripting.executeScript({ target: { tabId }, func: captureBrowserConsentState, args: [options] })`.
 *
 * ARCHITECTURAL CONTRACT:
 * 1. Self-Contained Execution:
 *    The `captureBrowserConsentState` function has zero closure dependencies on outer
 *    module scope. All helpers, constants, and logic reside strictly inside the function
 *    body so it can be serialized and executed directly in the browser's isolated world.
 *
 * 2. Identity Security & Mutability Boundary:
 *    - Document Identity: Held in the isolated world realm via a random UUID associated
 *      with the Document instance using a private WeakMap (never written to page-accessible DOM properties).
 *    - Element Identity: Held in a per-document WeakMap. Replaced elements (e.g. re-rendered by
 *      React/Vue or DOM mutation) cannot reuse previous identities, guaranteeing fail-closed freshness.
 *    - Security Boundary: Explicitly non-cryptographic proof of webpage truth. DOM elements, attributes,
 *      and inputs are mutable client state controlled by the webpage. This collector captures the exact,
 *      observable DOM state at invocation time for user consent confirmation and action binding; it does NOT
 *      prove that the host webpage itself is honest or authentic.
 *
 * 3. Complete Form Boundary & Fail-Closed Enforcement:
 *    - Supports standard form controls, external controls linked via `form="formId"`, disabled, hidden,
 *      password, checkbox, radio, select (single/multiple), contenteditable, and file inputs.
 *    - File inputs are hashed via standard WebCrypto (`crypto.subtle.digest("SHA-256")`).
 *    - Strict limits enforced fail-closed: max fields (200), max file size (10 MB), max total file bytes (25 MB),
 *      max string length (512 KB). Any overflow throws an explicit rejection error — NEVER truncates or omits.
 *    - Unsupported boundary cases (Shadow DOM, iframe/frame encapsulation, custom elements with non-standard
 *      behaviors) are explicitly rejected rather than returning incomplete or false guarantees.
 *
 * 4. Value Privacy & LLM Protection:
 *    - Raw input values (passwords, tokens, amounts) are collected strictly for trusted background hashing.
 *    - Error messages and internal diagnostics NEVER echo raw input values, passwords, or file contents.
 *    - Snapshot contains an explicit security notice prohibiting direct exposure to LLM context.
 *
 * 5. Atomicity & Concurrent Mutation Detection:
 *    - Pre- and post-read checkpoints detect concurrent DOM mutations during asynchronous file hashing.
 *    - If DOM mutations occur while reading files, capture fails closed (DOM_MUTATED_DURING_CAPTURE).
 *
 * 6. Fingerprint Module Handoff Notice:
 *    - The schema mapping between this in-DOM capture collector output (`form.fields`) and the
 *      `browserConsentFingerprint.js` canonical schema is designed for 1:1 field mapping:
 *      `fields: [{ elementId, name, type, value, checked, selected, selectedValues, files: [{ name, size, type, lastModified, contentDigest }] }]`
 *    - Documented as requiring subsequent integration; this module does NOT claim to be already integrated.
 */

/**
 * Capture browser consent state for a target element and its associated action/form.
 * Self-contained for execution in Chrome's isolated world.
 *
 * @param {object} [options]
 * @param {string} [options.selector] - CSS selector for target element
 * @param {boolean} [options.active] - Whether to capture document.activeElement
 * @param {Element} [options.target] - Direct element target (for direct JS execution/testing)
 * @param {Document} [options.document] - Document context override (for testing/JSDOM)
 * @param {Window} [options.window] - Window context override (for testing/JSDOM)
 * @param {boolean} [options.rejectAsResult] - If true, returns { ok: false, error: ... } instead of throwing
 * @returns {Promise<{
 *   ok: boolean;
 *   document: { documentId: string; url: string; title: string; pageRevision: string };
 *   target: {
 *     targetId: string;
 *     tag: string;
 *     name: string;
 *     type: string;
 *     href: string | null;
 *     rawHref: string | null;
 *     formAction: string | null;
 *     rawFormAction: string | null;
 *     formMethod: string | null;
 *     formTargetAttr: string | null;
 *     formEnctype: string | null;
 *     formNoValidate: boolean;
 *     action: string | null;
 *     rawAction: string | null;
 *     method: string | null;
 *     formTarget: string | null;
 *     formId: string | null;
 *   };
 *   form: {
 *     formId: string;
 *     action: string | null;
 *     rawAction: string | null;
 *     method: string;
 *     target: string | null;
 *     fieldCount: number;
 *     fields: Array<{
 *       elementId: string;
 *       name: string;
 *       type: string;
 *       value?: string;
 *       checked?: boolean;
 *       selected?: string[];
 *       selectedValues?: string[];
 *       files?: Array<{ name: string; size: number; type: string; lastModified: number; contentDigest: string }>;
 *       disabled: boolean;
 *       readOnly: boolean;
 *       sensitive: boolean;
 *     }>;
 *   } | null;
 *   securityBoundary: string;
 *   securityNotice: string;
 * }>}
 */
export async function captureBrowserConsentState(options = {}) {
  // --- Constants (Self-contained inside function) ---
  const MAX_FIELDS = 200;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
  const MAX_TOTAL_FILE_BYTES = 25 * 1024 * 1024; // 25 MB cumulative
  const MAX_STRING_VALUE_LENGTH = 512 * 1024; // 512 KB
  const STATE_KEY = "__nolo_browser_consent_isolated_state__";

  /**
   * Constructs an error with structured code and sanitised message.
   * NEVER echoes secret input values.
   */
  function createCaptureError(code, message) {
    const fullMessage = `${code}: ${message}`;
    const err = new Error(fullMessage);
    err.name = "ConsentCaptureError";
    err.code = code;
    return err;
  }

  try {
    // 1. Resolve Document Context Robustly
    let doc = null;
    if (options && options.document && options.document.nodeType === 9) {
      doc = options.document;
    } else if (options && options.target && options.target.ownerDocument && options.target.ownerDocument.nodeType === 9) {
      doc = options.target.ownerDocument;
    } else if (typeof document !== "undefined" && document && document.nodeType === 9) {
      doc = document;
    } else if (typeof window !== "undefined" && window && window.document && window.document.nodeType === 9) {
      doc = window.document;
    } else if (typeof globalThis !== "undefined" && globalThis && globalThis.document && globalThis.document.nodeType === 9) {
      doc = globalThis.document;
    }

    if (!doc) {
      throw createCaptureError("NO_DOCUMENT_CONTEXT", "No active Document context available");
    }

    const win = (options && options.window)
      || (doc && doc.defaultView)
      || (typeof window !== "undefined" ? window : null)
      || (typeof globalThis !== "undefined" ? globalThis : null);

    // 2. WebCrypto Object Resolution
    const cryptoObj = (win && win.crypto && win.crypto.subtle)
      ? win.crypto
      : (typeof crypto !== "undefined" && crypto && crypto.subtle)
      ? crypto
      : (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle)
      ? globalThis.crypto
      : (win && win.crypto) || (typeof crypto !== "undefined" ? crypto : null);

    // 3. Isolated World Identity State (WeakMaps)
    const storeRoot = win || (typeof globalThis !== "undefined" ? globalThis : {});
    let isolatedStore = storeRoot[STATE_KEY];
    if (!isolatedStore || typeof isolatedStore !== "object" || !(isolatedStore.documents instanceof WeakMap)) {
      isolatedStore = {
        documents: new WeakMap(),
      };
      try {
        storeRoot[STATE_KEY] = isolatedStore;
      } catch {
        // Fallback if sealed
      }
    }

    let docRecord = isolatedStore.documents.get(doc);
    if (!docRecord) {
      let docUuid = "";
      if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
        docUuid = cryptoObj.randomUUID();
      } else if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        docUuid = crypto.randomUUID();
      } else {
        docUuid = "doc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
      }
      docRecord = {
        documentId: docUuid,
        elements: new WeakMap(),
        elementSequence: 0,
        pageRevision: "1",
      };
      isolatedStore.documents.set(doc, docRecord);
    }

    /**
     * Resolves a stable, non-forgeable element ID using WeakMap.
     * Replaced DOM elements will NOT match existing keys and receive fresh IDs.
     */
    function getElementId(element) {
      if (!docRecord.elements.has(element)) {
        docRecord.elementSequence += 1;
        const elemId = `elem-${docRecord.documentId.slice(0, 8)}-${docRecord.elementSequence}`;
        docRecord.elements.set(element, elemId);
      }
      return docRecord.elements.get(element);
    }

    // 4. Locate Target Element
    let targetEl = null;
    if (options && options.target && typeof options.target === "object" && options.target.nodeType === 1) {
      targetEl = options.target;
    } else if (options && typeof options.selector === "string" && options.selector.trim()) {
      targetEl = doc.querySelector(options.selector.trim());
    } else if (options && options.active) {
      targetEl = doc.activeElement;
    } else {
      targetEl = doc.activeElement;
    }

    if (!targetEl || targetEl === doc.body || targetEl === doc.documentElement) {
      throw createCaptureError("TARGET_NOT_FOUND", "Target element could not be located in document");
    }

    // 5. Boundary & Integrity Checks (Shadow DOM, iframe, custom elements)
    function checkBoundarySafety(el, label) {
      // Check iframe encapsulation
      if (el.tagName.toLowerCase() === "iframe" || el.tagName.toLowerCase() === "frame" || el.ownerDocument !== doc) {
        throw createCaptureError(
          "UNSUPPORTED_IFRAME",
          `${label} is inside or represents an iframe/frame boundary which cannot be proven complete`
        );
      }

      // Check ShadowRoot encapsulation (open or closed)
      if (el.shadowRoot) {
        throw createCaptureError(
          "UNSUPPORTED_SHADOW_DOM",
          `${label} contains a ShadowRoot which cannot be proven complete`
        );
      }
      if (typeof el.getRootNode === "function") {
        const rootNode = el.getRootNode();
        if (rootNode && rootNode !== doc && rootNode.nodeType === 11 && rootNode.host) {
          throw createCaptureError(
            "UNSUPPORTED_SHADOW_DOM",
            `${label} resides inside a ShadowRoot encapsulation boundary`
          );
        }
      }

      // Check custom element encapsulation
      if (el.tagName.includes("-")) {
        throw createCaptureError(
          "UNSUPPORTED_CUSTOM_FORM",
          `${label} is a custom element with unverified form/encapsulation semantics`
        );
      }
    }

    checkBoundarySafety(targetEl, "Target element");

    // 6. Accessible Name Extraction (never echoing sensitive attributes)
    function extractAccessibleName(el) {
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim().slice(0, 200);

      const ariaLabelledBy = el.getAttribute("aria-labelledby");
      if (ariaLabelledBy && ariaLabelledBy.trim()) {
        const idList = ariaLabelledBy.trim().split(/\s+/);
        const textParts = [];
        for (let i = 0; i < idList.length; i++) {
          const refEl = doc.getElementById(idList[i]);
          if (refEl && refEl.textContent) textParts.push(refEl.textContent.trim());
        }
        if (textParts.length > 0) return textParts.join(" ").slice(0, 200);
      }

      const text = el.innerText !== undefined ? el.innerText : el.textContent;
      if (text && text.trim()) return text.trim().slice(0, 200);

      const val = el.getAttribute("value");
      if (val && val.trim()) return val.trim().slice(0, 200);

      const title = el.getAttribute("title");
      if (title && title.trim()) return title.trim().slice(0, 200);

      const nameAttr = el.getAttribute("name");
      if (nameAttr && nameAttr.trim()) return nameAttr.trim().slice(0, 200);

      const idAttr = el.getAttribute("id");
      if (idAttr && idAttr.trim()) return idAttr.trim().slice(0, 200);

      return "";
    }

    // Helper to resolve URL against document base
    function resolveUrl(relativeUrl) {
      if (!relativeUrl) return null;
      try {
        const base = doc.location && doc.location.href ? doc.location.href : "about:blank";
        return new URL(relativeUrl, base).href;
      } catch {
        return relativeUrl;
      }
    }

    // 7. Target Metadata Extraction
    const targetTag = targetEl.tagName.toLowerCase();
    const targetName = extractAccessibleName(targetEl);
    const targetType = targetEl.getAttribute("type") || targetEl.type || "";
    const rawHref = targetEl.getAttribute("href");
    const targetHref = typeof targetEl.href === "string" && targetEl.href ? targetEl.href : resolveUrl(rawHref);

    // Button / Input overrides for form submission
    const rawFormAction = targetEl.getAttribute("formaction");
    const formAction = typeof targetEl.formAction === "string" && targetEl.formAction ? targetEl.formAction : resolveUrl(rawFormAction);
    const formMethod = targetEl.formMethod ? targetEl.formMethod.toUpperCase() : (targetEl.getAttribute("formmethod") ? targetEl.getAttribute("formmethod").toUpperCase() : null);
    const formTargetAttr = targetEl.formTarget ? targetEl.formTarget : targetEl.getAttribute("formtarget");
    const formEnctype = targetEl.getAttribute("formenctype");
    const formNoValidate = targetEl.hasAttribute("formnovalidate");

    // 8. Resolve Form Association
    let formEl = null;
    if (targetTag === "form") {
      formEl = targetEl;
    } else if (targetEl.form && targetEl.form.nodeType === 1) {
      formEl = targetEl.form;
    } else if (targetEl.getAttribute("form")) {
      const formId = targetEl.getAttribute("form");
      formEl = doc.getElementById(formId);
    } else {
      formEl = targetEl.closest ? targetEl.closest("form") : null;
    }

    if (formEl) {
      checkBoundarySafety(formEl, "Associated form");
    }

    const rawAction = formEl ? formEl.getAttribute("action") : null;
    const formActionResolved = formEl ? (typeof formEl.action === "string" && formEl.action ? formEl.action : resolveUrl(rawAction)) : null;

    // 9. Target Metadata Object
    const targetMetadata = {
      targetId: getElementId(targetEl),
      tag: targetTag,
      name: targetName,
      type: String(targetType || "").toLowerCase(),
      href: targetHref,
      rawHref: rawHref || null,
      formAction: formAction || null,
      rawFormAction: rawFormAction || null,
      formMethod: formMethod || null,
      formTargetAttr: formTargetAttr || null,
      formEnctype: formEnctype || null,
      formNoValidate: Boolean(formNoValidate),
      action: formActionResolved,
      rawAction: rawAction || null,
      method: formEl ? (formEl.method ? String(formEl.method).toUpperCase() : "GET") : null,
      formTarget: formEl ? (formEl.target || null) : null,
      formId: formEl ? (formEl.id || getElementId(formEl)) : null,
    };

    // 10. Form Control Collection & WebCrypto Hashing
    let formSnapshot = null;

    if (formEl) {
      const collectedElements = new Set();

      // Collect standard controls in form
      if (formEl.elements && typeof formEl.elements.length === "number") {
        for (let i = 0; i < formEl.elements.length; i++) {
          const control = formEl.elements[i];
          if (control && control.nodeType === 1) {
            collectedElements.add(control);
          }
        }
      }

      // Collect external controls referencing form ID
      if (formEl.id && typeof formEl.id === "string") {
        const escapedId = formEl.id.replace(/(["\\])/g, "\\$1");
        try {
          const externals = doc.querySelectorAll(`[form="${escapedId}"]`);
          for (let i = 0; i < externals.length; i++) {
            if (externals[i].nodeType === 1) {
              collectedElements.add(externals[i]);
            }
          }
        } catch {
          const allFormAttrElements = doc.querySelectorAll("[form]");
          for (let i = 0; i < allFormAttrElements.length; i++) {
            if (allFormAttrElements[i].getAttribute("form") === formEl.id) {
              collectedElements.add(allFormAttrElements[i]);
            }
          }
        }
      }

      // Collect contenteditable elements inside form
      const editables = formEl.querySelectorAll('[contenteditable=""], [contenteditable="true"]');
      for (let i = 0; i < editables.length; i++) {
        if (editables[i].nodeType === 1) {
          collectedElements.add(editables[i]);
        }
      }

      // Filter and sanitize controls
      const candidateElements = Array.from(collectedElements);
      const dataFields = [];

      for (let i = 0; i < candidateElements.length; i++) {
        const el = candidateElements[i];
        const tag = el.tagName.toLowerCase();

        // Skip non-data groupings
        if (tag === "fieldset" || tag === "output") {
          continue;
        }

        // Skip buttons that are not the current target action
        if (tag === "button" && el !== targetEl) {
          continue;
        }

        // Verify boundary integrity for each form control
        checkBoundarySafety(el, `Form control <${tag}>`);

        dataFields.push(el);
      }

      // Fail-closed overflow enforcement on field count
      if (dataFields.length > MAX_FIELDS) {
        throw createCaptureError(
          "FIELD_COUNT_EXCEEDED",
          `Form field count (${dataFields.length}) exceeds maximum allowable limit of ${MAX_FIELDS}`
        );
      }

      // Checkpoint before async operations to guard against concurrent DOM mutations
      function createDomCheckpoint(fieldsList) {
        return fieldsList.map((el) => ({
          el,
          val: el.value,
          checked: el.checked,
          text: el.innerText !== undefined ? el.innerText : el.textContent,
        }));
      }
      const preReadCheckpoint = createDomCheckpoint(dataFields);

      async function hashFileContent(file) {
        if (!cryptoObj || !cryptoObj.subtle || typeof cryptoObj.subtle.digest !== "function") {
          throw createCaptureError("MISSING_WEBCRYPTO", "WebCrypto subtle.digest is required for file content hashing");
        }
        if (file.size === 0) {
          return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        }

        let arrayBuffer;
        if (typeof file.arrayBuffer === "function") {
          arrayBuffer = await file.arrayBuffer();
        } else {
          // Fallback via FileReader
          arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new (win.FileReader || FileReader)();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(createCaptureError("FILE_READ_FAILED", "Failed to read file content"));
            reader.readAsArrayBuffer(file);
          });
        }

        const digestBuffer = await cryptoObj.subtle.digest("SHA-256", arrayBuffer);
        const digestArray = Array.from(new Uint8Array(digestBuffer));
        return digestArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      }

      let totalFileBytes = 0;
      let hadAsyncFileRead = false;
      const processedFields = [];

      for (let i = 0; i < dataFields.length; i++) {
        const el = dataFields[i];
        const tag = el.tagName.toLowerCase();
        const elementId = getElementId(el);
        const nameAttr = el.getAttribute("name") || "";
        const rawType = el.getAttribute("type") || el.type || (tag === "textarea" ? "textarea" : tag === "select" ? "select" : "text");
        const type = String(rawType).toLowerCase();
        const disabled = Boolean(el.disabled || el.hasAttribute("disabled"));
        const readOnly = Boolean(el.readOnly || el.hasAttribute("readonly"));
        const sensitive = type === "password" || type === "hidden" || Boolean(el.hasAttribute("data-sensitive"));

        const isContentEditable = el.isContentEditable || el.getAttribute("contenteditable") === "true" || el.getAttribute("contenteditable") === "";

        const fieldItem = {
          elementId,
          name: nameAttr,
          type: isContentEditable ? "contenteditable" : type,
          disabled,
          readOnly,
          sensitive,
        };

        if (type === "file") {
          hadAsyncFileRead = true;
          const rawFiles = el.files ? Array.from(el.files) : [];
          const filesData = [];

          for (let fIdx = 0; fIdx < rawFiles.length; fIdx++) {
            const file = rawFiles[fIdx];
            const fileSize = Number(file.size || 0);

            if (fileSize > MAX_FILE_SIZE) {
              throw createCaptureError(
                "FILE_SIZE_EXCEEDED",
                `File at index ${fIdx} in '${elementId}' exceeds maximum file size limit of ${MAX_FILE_SIZE} bytes`
              );
            }

            totalFileBytes += fileSize;
            if (totalFileBytes > MAX_TOTAL_FILE_BYTES) {
              throw createCaptureError(
                "TOTAL_FILE_BYTES_EXCEEDED",
                `Cumulative form file size exceeds maximum limit of ${MAX_TOTAL_FILE_BYTES} bytes`
              );
            }

            const contentDigest = await hashFileContent(file);
            filesData.push({
              name: String(file.name || ""),
              size: fileSize,
              type: String(file.type || ""),
              lastModified: Number(file.lastModified || 0),
              contentDigest,
            });
          }

          filesData.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
          fieldItem.files = filesData;
        } else if (type === "checkbox" || type === "radio") {
          fieldItem.checked = Boolean(el.checked);
          const val = el.value !== undefined ? String(el.value) : "on";
          if (val.length > MAX_STRING_VALUE_LENGTH) {
            throw createCaptureError("VALUE_LENGTH_EXCEEDED", `Field value length exceeds ${MAX_STRING_VALUE_LENGTH}`);
          }
          fieldItem.value = val;
        } else if (tag === "select") {
          const selectedOpts = el.selectedOptions
            ? Array.from(el.selectedOptions)
            : Array.from(el.options || []).filter((opt) => opt.selected);
          const selectedVals = selectedOpts.map((opt) => String(opt.value));
          selectedVals.sort();

          fieldItem.selected = selectedVals;
          fieldItem.selectedValues = selectedVals;
          fieldItem.value = el.value !== undefined ? String(el.value) : "";
        } else if (isContentEditable) {
          const val = String(el.innerText !== undefined ? el.innerText : el.textContent || "");
          if (val.length > MAX_STRING_VALUE_LENGTH) {
            throw createCaptureError("VALUE_LENGTH_EXCEEDED", `Field value length exceeds ${MAX_STRING_VALUE_LENGTH}`);
          }
          fieldItem.value = val;
        } else {
          // Standard text, textarea, password, hidden, email, number, etc.
          const val = el.value !== undefined && el.value !== null ? String(el.value) : "";
          if (val.length > MAX_STRING_VALUE_LENGTH) {
            throw createCaptureError("VALUE_LENGTH_EXCEEDED", `Field value length exceeds ${MAX_STRING_VALUE_LENGTH}`);
          }
          fieldItem.value = val;
        }

        processedFields.push(fieldItem);
      }

      // Concurrent DOM Mutation Verification post-async reads
      if (hadAsyncFileRead) {
        if (targetEl.isConnected === false || (formEl && formEl.isConnected === false)) {
          throw createCaptureError(
            "DOM_MUTATED_DURING_CAPTURE",
            "Target or form was disconnected during asynchronous file capture; snapshot invalidated (fail-closed)"
          );
        }
        for (let i = 0; i < preReadCheckpoint.length; i++) {
          const cp = preReadCheckpoint[i];
          if (cp.el.isConnected === false) {
            throw createCaptureError(
              "DOM_MUTATED_DURING_CAPTURE",
              "A form field was disconnected during asynchronous file capture; snapshot invalidated (fail-closed)"
            );
          }
          const currentText = cp.el.innerText !== undefined ? cp.el.innerText : cp.el.textContent;
          if (cp.el.value !== cp.val || cp.el.checked !== cp.checked || currentText !== cp.text) {
            throw createCaptureError(
              "DOM_MUTATED_DURING_CAPTURE",
              "A form field value was mutated during asynchronous file capture; snapshot invalidated (fail-closed)"
            );
          }
        }
      }

      // Deterministic stable ordering by elementId
      processedFields.sort((a, b) => (a.elementId < b.elementId ? -1 : a.elementId > b.elementId ? 1 : 0));

      formSnapshot = {
        formId: formEl.id || getElementId(formEl),
        action: formActionResolved,
        rawAction: rawAction || null,
        method: formEl.method ? String(formEl.method).toUpperCase() : "GET",
        target: formEl.target || null,
        fieldCount: processedFields.length,
        fields: processedFields,
      };
    }

    // 11. Assemble Full Document & Target Snapshot
    const docUrl = doc.location && typeof doc.location.href === "string" ? doc.location.href : "";
    const docTitle = typeof doc.title === "string" ? doc.title : "";

    return {
      ok: true,
      document: {
        documentId: docRecord.documentId,
        url: docUrl,
        title: docTitle,
        pageRevision: String(docRecord.pageRevision || "1"),
      },
      target: targetMetadata,
      form: formSnapshot,
      securityBoundary:
        "NOTICE: DOM state and form field values are collected client-side from the browser isolated world. The WeakMap-held document and element identities prevent in-page tampering with identities, but all DOM elements, values, and attributes remain mutable page state. This snapshot captures observable client state for user confirmation and non-repudiation binding; it does not constitute an unforgeable proof of external ground truth or webpage authenticity against a malicious host page.",
      securityNotice:
        "CONFIDENTIAL_EXTENSION_ONLY: Contains raw client form values for local WebCrypto hash binding. Never pass this raw capture snapshot directly to LLM context; pass only the canonical fingerprint and summary from browserConsentFingerprint.",
    };
  } catch (err) {
    if (options && options.rejectAsResult) {
      return {
        ok: false,
        code: (err && err.code) || "CAPTURE_FAILED",
        message: (err && err.message) || String(err),
      };
    }
    throw err;
  }
}
