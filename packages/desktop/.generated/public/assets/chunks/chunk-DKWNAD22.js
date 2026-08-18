import {
  nanoid
} from "/public/assets/chunks/chunk-T73R6CXN.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  abortAllMessages,
  buildMessageFileContentUrl,
  clearComposerImageDraft,
  compressImageFile,
  extractFilesFromDataTransfer,
  getComposerImageDraft,
  getRuntimeServerContext,
  handleSendMessage,
  isLocalFileContentUrl,
  selectRuntimeSnapshot,
  setComposerImageDraft,
  splitFiles,
  toast,
  upload,
  waitForFileReady
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  LuArrowUp,
  LuGlobe,
  LuLoader,
  LuMic,
  LuUpload
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  GLOBAL_DIALOG_RUNTIME_KEY,
  extractCustomId,
  useActiveControllers,
  useCurrentDialogKey
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/utils/fileReaders.ts
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read file as data URL"));
    };
    reader.onerror = () => reject(reader.error || new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

// packages/chat/messages/sendFirstMessage.ts
var logQuickChatPerfStage = (startedAt, stage, details = {}) => {
  if (!startedAt) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info("[QuickChatPerf]", {
    stage,
    elapsedMs: now - startedAt,
    ...typeof performance !== "undefined" ? { atMs: now } : {},
    ...details
  });
};
var IMAGE_PREP_CONCURRENCY = 2;
var MAX_INLINE_IMAGE_FALLBACK_BYTES = 5 * 1024 * 1024;
var mapWithConcurrency = async (items, concurrency, mapper) => {
  if (items.length === 0) return [];
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = nextIndex++;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
  return results;
};
var buildInlineImagePart = async (file) => ({
  type: "image_url",
  image_url: { url: await readFileAsDataURL(file) }
});
var buildFallbackImagePart = async (file) => {
  console.log("[QuickChatTrace] buildFallbackImagePart enter", {
    sizeBytes: file.size,
    limitBytes: MAX_INLINE_IMAGE_FALLBACK_BYTES
  });
  if (file.size <= MAX_INLINE_IMAGE_FALLBACK_BYTES) {
    const part = await buildInlineImagePart(file);
    console.log("[QuickChatTrace] buildFallbackImagePart \u2192 inline data URL", {
      sizeBytes: file.size,
      previewType: part.type
    });
    return part;
  }
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const limitMB = (MAX_INLINE_IMAGE_FALLBACK_BYTES / (1024 * 1024)).toFixed(0);
  console.warn("[QuickChatTrace] buildFallbackImagePart \u2192 too large, throwing", {
    sizeMB,
    limitMB
  });
  throw new Error(`\u56FE\u7247\u4E0A\u4F20\u5931\u8D25\uFF0C\u6587\u4EF6\u8FC7\u5927\uFF08${sizeMB}MB\uFF0C\u4E0A\u9650 ${limitMB}MB\uFF09\uFF0C\u8BF7\u538B\u7F29\u540E\u91CD\u8BD5\u3002`);
};
var sendFirstMessage = (params) => async (dispatch, getState) => {
  const state = getState();
  const { currentServer } = getRuntimeServerContext(state);
  const {
    text,
    imageFiles = [],
    docFiles = [],
    runtimeOptions,
    targetAgentKey,
    extraParts = [],
    quickChatPerfStartedAt
  } = params;
  const trimmed = text?.trim() ?? "";
  logQuickChatPerfStage(quickChatPerfStartedAt, "send-first-message-entered", {
    hasText: !!trimmed,
    imageCount: imageFiles.length,
    docFileCount: docFiles.length,
    extraPartCount: extraParts.length
  });
  console.group("[QuickChatTrace] sendFirstMessage thunk enter");
  console.log("[QuickChatTrace] sendFirstMessage context", {
    dialogKey: params.dialogKey,
    hasText: !!trimmed,
    textLength: trimmed.length,
    imageCount: imageFiles.length,
    docFileCount: docFiles.length,
    extraPartCount: extraParts.length,
    targetAgentKey,
    currentServer,
    imageFileSummaries: imageFiles.map((f) => ({
      name: f.name,
      type: f.type,
      sizeBytes: f.size
    }))
  });
  const parts = [];
  if (trimmed) {
    parts.push({ type: "text", text: trimmed });
  }
  console.log("[QuickChatTrace] sendFirstMessage start image upload pipeline", {
    imageCount: imageFiles.length,
    concurrency: IMAGE_PREP_CONCURRENCY
  });
  const uploadedImgs = await mapWithConcurrency(
    imageFiles,
    IMAGE_PREP_CONCURRENCY,
    async (file, idx) => {
      console.group(`[QuickChatTrace] image ${idx} start`);
      console.log("[QuickChatTrace] image original", {
        idx,
        name: file.name,
        type: file.type,
        sizeBytes: file.size
      });
      const uploadFile = await compressImageFile(file);
      console.log("[QuickChatTrace] image compressed", {
        idx,
        originalSizeBytes: file.size,
        compressedSizeBytes: uploadFile.size,
        compressedType: uploadFile.type
      });
      try {
        const customKey = `chat-image-${Date.now()}`;
        console.log("[QuickChatTrace] image upload dispatch", {
          idx,
          customKey,
          targetServer: currentServer,
          uploadSizeBytes: uploadFile.size
        });
        const metadata = await dispatch(
          upload({
            file: uploadFile,
            customKey
          })
        ).unwrap();
        const fileId = metadata?.id;
        console.log("[QuickChatTrace] image upload result", {
          idx,
          fileId,
          metadataKeys: metadata ? Object.keys(metadata) : null
        });
        if (!fileId || !currentServer) {
          console.warn("[QuickChatTrace] image fallback (no fileId/server)", {
            idx,
            fileId,
            currentServer
          });
          console.groupEnd();
          return buildFallbackImagePart(uploadFile);
        }
        const imageUrl = buildMessageFileContentUrl(currentServer, fileId);
        console.log("[QuickChatTrace] image url built", { idx, imageUrl });
        if (!imageUrl) {
          console.warn("[QuickChatTrace] image fallback (no url)", { idx });
          console.groupEnd();
          return buildFallbackImagePart(uploadFile);
        }
        if (isLocalFileContentUrl(imageUrl)) {
          console.warn("[QuickChatTrace] image fallback (local url)", {
            idx,
            imageUrl
          });
          console.groupEnd();
          return buildFallbackImagePart(uploadFile);
        }
        console.log("[QuickChatTrace] image waitForFileReady ...", {
          idx,
          imageUrl
        });
        const ready = await waitForFileReady(imageUrl);
        console.log("[QuickChatTrace] image waitForFileReady result", {
          idx,
          ready
        });
        if (!ready) {
          console.warn("[QuickChatTrace] image fallback (not ready)", { idx });
          console.groupEnd();
          return buildFallbackImagePart(uploadFile);
        }
        console.log("[QuickChatTrace] image upload ok", { idx, imageUrl });
        console.groupEnd();
        return {
          type: "image_url",
          image_url: { url: imageUrl }
        };
      } catch (error) {
        console.error("[QuickChatTrace] image upload threw", { idx, error });
        console.warn(
          "[sendFirstMessage] image upload failed, using configured fallback policy",
          error
        );
        console.groupEnd();
        return buildFallbackImagePart(uploadFile);
      }
    }
  );
  const finalParts = [
    ...parts,
    ...extraParts,
    ...uploadedImgs
  ];
  if (!finalParts.length) {
    console.warn("[QuickChatTrace] sendFirstMessage no parts, skip");
    console.groupEnd();
    return;
  }
  console.log("[QuickChatTrace] sendFirstMessage finalParts", {
    totalCount: finalParts.length,
    textCount: finalParts.filter((p) => p.type === "text").length,
    imageUrlCount: finalParts.filter((p) => p.type === "image_url").length,
    otherCount: finalParts.length - finalParts.filter((p) => p.type === "text" || p.type === "image_url").length,
    imageUrls: finalParts.filter((p) => p.type === "image_url").map((p) => p.image_url?.url)
  });
  logQuickChatPerfStage(quickChatPerfStartedAt, "send-first-message-parts-ready", {
    partCount: finalParts.length,
    uploadedImageCount: uploadedImgs.length
  });
  const payload = finalParts.length === 1 && finalParts[0].type === "text" ? finalParts[0].text : finalParts;
  console.log("[QuickChatTrace] handleSendMessage dispatch", {
    dialogKey: params.dialogKey,
    targetAgentKey,
    payloadKind: typeof payload === "string" ? "string" : "parts"
  });
  try {
    await dispatch(
      handleSendMessage({
        userInput: payload,
        dialogKey: params.dialogKey,
        runtimeOptions,
        targetAgentKey,
        quickChatPerfStartedAt
      })
    ).unwrap();
    console.log("[QuickChatTrace] handleSendMessage resolved");
  } catch (err) {
    console.error("[QuickChatTrace] handleSendMessage rejected", err);
    throw err;
  } finally {
    console.groupEnd();
  }
};

// packages/chat/hooks/useChatInput.ts
var import_react = __toESM(require_react());
var useChatInput = (options = {}) => {
  const {
    initialText = "",
    onTextChange,
    maxImages = Infinity,
    onImageLimitExceeded,
    draftKey = null
  } = options;
  const [text, setText] = (0, import_react.useState)(initialText);
  const [imageFiles, setImageFiles] = (0, import_react.useState)(() => {
    const draft = getComposerImageDraft(draftKey);
    return new Map(draft.map((item) => [item.id, item.file]));
  });
  const [imgPreviews, setImgPreviews] = (0, import_react.useState)(() => {
    const draft = getComposerImageDraft(draftKey);
    return draft.map((item) => ({ id: item.id, url: item.previewUrl }));
  });
  const objectUrlByIdRef = (0, import_react.useRef)(/* @__PURE__ */ new Map());
  const draftKeyRef = (0, import_react.useRef)(draftKey);
  const imageFilesRef = (0, import_react.useRef)(imageFiles);
  const imgPreviewsRef = (0, import_react.useRef)(imgPreviews);
  (0, import_react.useEffect)(() => {
    imageFilesRef.current = imageFiles;
  }, [imageFiles]);
  (0, import_react.useEffect)(() => {
    imgPreviewsRef.current = imgPreviews;
  }, [imgPreviews]);
  (0, import_react.useEffect)(() => {
    for (const preview of imgPreviews) {
      if (preview.url.startsWith("blob:") && !objectUrlByIdRef.current.has(preview.id)) {
        objectUrlByIdRef.current.set(preview.id, preview.url);
      }
    }
  }, [imgPreviews]);
  const revokePreviewUrl = (0, import_react.useCallback)((id) => {
    const url = objectUrlByIdRef.current.get(id);
    if (!url) return;
    if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(url);
    }
    objectUrlByIdRef.current.delete(id);
  }, []);
  const revokeAllPreviewUrls = (0, import_react.useCallback)(() => {
    for (const id of [...objectUrlByIdRef.current.keys()]) {
      revokePreviewUrl(id);
    }
  }, [revokePreviewUrl]);
  const persistDraft = (0, import_react.useCallback)((key) => {
    if (!key) return;
    const files = imageFilesRef.current;
    const previews = imgPreviewsRef.current;
    if (files.size === 0) {
      setComposerImageDraft(key, []);
      return;
    }
    setComposerImageDraft(
      key,
      previews.map((preview) => {
        const file = files.get(preview.id);
        if (!file) return null;
        return {
          id: preview.id,
          file,
          previewUrl: preview.url
        };
      }).filter((item) => item !== null)
    );
  }, []);
  const hydrateDraft = (0, import_react.useCallback)((key) => {
    const draft = getComposerImageDraft(key);
    objectUrlByIdRef.current = new Map(
      draft.filter((item) => item.previewUrl.startsWith("blob:")).map((item) => [item.id, item.previewUrl])
    );
    setImageFiles(new Map(draft.map((item) => [item.id, item.file])));
    setImgPreviews(draft.map((item) => ({ id: item.id, url: item.previewUrl })));
  }, []);
  (0, import_react.useEffect)(() => {
    const previousKey = draftKeyRef.current;
    if (previousKey && previousKey !== draftKey) {
      persistDraft(previousKey);
    }
    if (draftKey !== previousKey) {
      hydrateDraft(draftKey);
      draftKeyRef.current = draftKey;
    }
  }, [draftKey, hydrateDraft, persistDraft]);
  (0, import_react.useEffect)(() => {
    if (!draftKey) return;
    persistDraft(draftKey);
  }, [draftKey, imageFiles, imgPreviews, persistDraft]);
  (0, import_react.useEffect)(() => {
    return () => {
      const key = draftKeyRef.current;
      if (key) {
        persistDraft(key);
        objectUrlByIdRef.current = /* @__PURE__ */ new Map();
        return;
      }
      revokeAllPreviewUrls();
    };
  }, [persistDraft, revokeAllPreviewUrls]);
  const handleTextChange = (0, import_react.useCallback)(
    (newText) => {
      setText(newText);
      onTextChange?.(newText);
    },
    [onTextChange]
  );
  const processImages = (0, import_react.useCallback)(
    (files) => {
      console.group("[QuickChatTrace] useChatInput.processImages enter");
      console.log("[QuickChatTrace] processImages files", {
        count: files.length,
        files: files.map((f) => ({
          name: f.name,
          type: f.type,
          sizeBytes: f.size,
          sizeMB: (f.size / (1024 * 1024)).toFixed(3)
        })),
        currentPreviewCount: imgPreviews.length,
        maxImages
      });
      if (!files.length) {
        console.groupEnd();
        return;
      }
      const existingFiles = Array.from(imageFilesRef.current.values());
      const seenSignatures = /* @__PURE__ */ new Set();
      const dedupedIncoming = files.filter((file) => {
        const sig = `${file.name}-${file.size}-${file.type}-${file.lastModified ?? 0}`;
        if (seenSignatures.has(sig)) return false;
        seenSignatures.add(sig);
        const isAlreadyAdded = existingFiles.some(
          (existing) => existing.name === file.name && existing.size === file.size && existing.type === file.type && (existing.lastModified ?? 0) === (file.lastModified ?? 0)
        );
        return !isAlreadyAdded;
      });
      if (!dedupedIncoming.length) {
        console.warn("[QuickChatTrace] processImages skipped duplicate files");
        console.groupEnd();
        return;
      }
      const currentCount = imgPreviews.length;
      const remainingLimit = maxImages - currentCount;
      if (remainingLimit <= 0) {
        console.warn("[QuickChatTrace] processImages limit hit", {
          currentCount,
          maxImages
        });
        onImageLimitExceeded?.();
        console.groupEnd();
        return;
      }
      const allowedFiles = dedupedIncoming.slice(0, remainingLimit);
      if (dedupedIncoming.length > remainingLimit) {
        onImageLimitExceeded?.();
      }
      console.log("[QuickChatTrace] processImages allowed", {
        allowedCount: allowedFiles.length,
        rejectedCount: files.length - allowedFiles.length
      });
      allowedFiles.forEach((file, idx) => {
        const id = nanoid();
        if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
          const url = URL.createObjectURL(file);
          objectUrlByIdRef.current.set(id, url);
          setImgPreviews((prev) => [...prev, { id, url }]);
          console.log("[QuickChatTrace] processImages blobUrl created", {
            idx,
            id,
            url,
            sizeBytes: file.size,
            type: file.type
          });
        } else {
          console.log("[QuickChatTrace] processImages fallback to data URL", {
            idx,
            id,
            sizeBytes: file.size,
            type: file.type
          });
          readFileAsDataURL(file).then((url) => {
            setImgPreviews((prev) => [...prev, { id, url }]);
          }).catch((err) => {
            console.warn("[useChatInput] readFileAsDataURL failed:", err);
          });
        }
        setImageFiles((prev) => {
          const next = new Map(prev);
          next.set(id, file);
          console.log("[QuickChatTrace] processImages imageFiles updated", {
            id,
            newMapSize: next.size
          });
          return next;
        });
      });
      console.groupEnd();
    },
    [imgPreviews.length, maxImages, onImageLimitExceeded]
  );
  const removeImage = (0, import_react.useCallback)(
    (id) => {
      revokePreviewUrl(id);
      const nextPreviews = imgPreviewsRef.current.filter((img) => img.id !== id);
      const nextFiles = new Map(imageFilesRef.current);
      nextFiles.delete(id);
      setImgPreviews(nextPreviews);
      setImageFiles(nextFiles);
      imgPreviewsRef.current = nextPreviews;
      imageFilesRef.current = nextFiles;
      if (draftKeyRef.current) {
        persistDraft(draftKeyRef.current);
      }
    },
    [persistDraft, revokePreviewUrl]
  );
  const clear = (0, import_react.useCallback)(() => {
    if (draftKeyRef.current) {
      clearComposerImageDraft(draftKeyRef.current);
    } else {
      revokeAllPreviewUrls();
    }
    objectUrlByIdRef.current = /* @__PURE__ */ new Map();
    setText("");
    setImgPreviews([]);
    setImageFiles(/* @__PURE__ */ new Map());
  }, [revokeAllPreviewUrls]);
  return {
    text,
    setText: handleTextChange,
    imageFiles,
    imgPreviews,
    processImages,
    removeImage,
    clear
  };
};

// packages/app/hooks/useFileDropZone.ts
var import_react2 = __toESM(require_react());
function hasFileDrag(dataTransfer) {
  if (!dataTransfer) return false;
  return Array.from(dataTransfer.types ?? []).includes("Files");
}
function useFileDropZone(onFiles) {
  const [isDragOver, setIsDragOver] = (0, import_react2.useState)(false);
  const handleDragOver = (0, import_react2.useCallback)((event) => {
    if (!hasFileDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, []);
  const handleDragLeave = (0, import_react2.useCallback)((event) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setIsDragOver(false);
  }, []);
  const handleDrop = (0, import_react2.useCallback)(
    (event) => {
      if (!hasFileDrag(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      const droppedFiles = extractFilesFromDataTransfer(event.dataTransfer);
      if (!droppedFiles.length) return;
      onFiles(droppedFiles);
    },
    [onFiles]
  );
  return {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}

// packages/chat/web/BrowseContextIndicator.tsx
var import_react3 = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var isDesktopContext = () => {
  if (typeof window === "undefined" || typeof location === "undefined") return false;
  const host = location.hostname;
  return host === "127.0.0.1" || host === "localhost";
};
var useBrowseContext = () => {
  const [info, setInfo] = (0, import_react3.useState)(null);
  (0, import_react3.useEffect)(() => {
    if (!isDesktopContext()) return;
    let cancelled = false;
    const check = async () => {
      try {
        if (typeof fetch !== "function") return;
        const response = await fetch("/api/desktop/browse-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "" }),
          signal: AbortSignal.timeout(2e3)
        });
        if (!response.ok || cancelled) return;
        const payload = await response.json();
        if (cancelled) return;
        setInfo(payload.context);
      } catch {
      }
    };
    void check();
    const timer = setInterval(check, 3e3);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  return info;
};
var BrowseContextIndicator = (0, import_react3.memo)(function BrowseContextIndicator2() {
  const info = useBrowseContext();
  if (!info || !info.url) return null;
  let host = info.url;
  try {
    host = new URL(info.url).hostname;
  } catch {
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "browse-context-indicator",
      title: info.url,
      role: "status",
      "aria-label": `\u6B63\u5728\u6D4F\u89C8\uFF1A${info.title}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuGlobe, { size: 13, className: "browse-context-indicator__icon" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "browse-context-indicator__host", children: host }),
        info.title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "browse-context-indicator__title", children: info.title }) : null
      ]
    }
  );
});

// packages/chat/web/FileUploadButton.tsx
var import_react4 = __toESM(require_react());
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var ACCEPT_IMAGE = ["image/*"];
var ACCEPT_EXCEL = [".xlsx", ".xls", ".csv", ".ods", ".xlsm", ".xlsb"];
var ACCEPT_DOC = [".docx", ".pdf"];
var ACCEPT_PLAIN_TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".mdx",
  ".log",
  ".ini",
  ".cfg",
  ".yaml",
  ".yml",
  ".env",
  ".toml",
  ".xml",
  ".html",
  ".htm",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".less"
];
var ACCEPT_PLAIN_TEXT_MIME = [
  "text/plain",
  "text/markdown",
  "text/x-yaml",
  "application/x-yaml",
  "text/xml",
  "application/xml",
  "text/html",
  "application/javascript",
  "text/javascript",
  "text/css"
];
var ACCEPT_JSON = [
  ".json",
  "application/json",
  "application/ld+json",
  "application/jsonl"
];
var DEFAULT_ACCEPT = [
  ...ACCEPT_IMAGE,
  ...ACCEPT_EXCEL,
  ...ACCEPT_DOC,
  ...ACCEPT_PLAIN_TEXT_EXTENSIONS,
  ...ACCEPT_PLAIN_TEXT_MIME,
  ...ACCEPT_JSON
].join(",");
var FILE_UPLOAD_BUTTON_STYLES = `
  .upload-button {
    --button-size: 44px;
    width: var(--button-size);
    height: var(--button-size);
    border-radius: 50%; /* \u5706\u5F62\u6309\u94AE */
    border: 1px solid var(--borderMuted, var(--borderLight));
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surfaceInset, var(--surfaceRaised, var(--backgroundSecondary)));
    color: var(--textMuted, var(--textSecondary));
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
    flex-shrink: 0;
    box-shadow: 0 1px 2px var(--shadowLight);
  }

  .upload-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .upload-button:hover:not(:disabled) {
    background: var(--surfaceInteractiveHover, var(--backgroundHover));
    color: var(--primary);
    border-color: var(--borderSubtle);
    transform: translateY(-1px);
    box-shadow: 0 6px 14px -12px var(--shadowMedium);
  }

  .upload-button:active:not(:disabled) {
    transform: translateY(0);
    transition-duration: 0.1s;
    box-shadow: 
      0 1px 3px var(--shadowLight),
      inset 0 2px 4px rgba(0, 0, 0, 0.03);
  }

  .upload-button:focus-visible {
    outline: none;
    box-shadow: 
      0 0 0 2px var(--background),
      0 0 0 4px var(--primary),
      0 1px 3px var(--shadowLight);
  }

  .upload-button:focus:not(:focus-visible) {
    outline: none;
  }

  /* \u79FB\u52A8\u7AEF\u8C03\u6574 */
  @media (max-width: 768px) {
    .upload-button { --button-size: 40px; }
  }

  @media (max-width: 480px) {
    .upload-button { --button-size: 36px; }
  }

  @media (min-width: 769px) {
    .upload-button { --button-size: 48px; }
  }
`;
var FileUploadButton = ({
  onFilesSelected,
  disabled = false,
  accept = DEFAULT_ACCEPT,
  multiple = true
}) => {
  const { t } = useTranslation("chat");
  const inputRef = (0, import_react4.useRef)(null);
  const handleButtonClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };
  const handleInputChange = (e) => {
    onFilesSelected(e.target.files);
    e.target.value = "";
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { "data-name": "file-upload-button", precedence: "medium", children: FILE_UPLOAD_BUTTON_STYLES }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "button",
      {
        type: "button",
        className: "upload-button",
        onClick: handleButtonClick,
        title: t("uploadFile", "\u4E0A\u4F20\u6587\u4EF6"),
        "aria-label": t("uploadFile", "\u4E0A\u4F20\u6587\u4EF6"),
        disabled,
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuUpload, { size: 20, "aria-hidden": "true" })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "input",
      {
        ref: inputRef,
        type: "file",
        hidden: true,
        accept,
        multiple,
        disabled,
        onChange: handleInputChange
      }
    )
  ] });
};
var FileUploadButton_default = FileUploadButton;

// packages/chat/web/SendButton.tsx
var import_react5 = __toESM(require_react());
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var SendButton = ({
  onClick,
  disabled,
  loading = false,
  testId
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation("chat");
  const activeControllers = useActiveControllers();
  const canAbort = Object.keys(activeControllers).length > 0;
  const isLoading = !canAbort && loading;
  const [isAnimating, setIsAnimating] = (0, import_react5.useState)(false);
  const handleAbortAllMessages = (0, import_react5.useCallback)(() => {
    dispatch(abortAllMessages());
    toast.success(t("allMessagesAborted"), { duration: 3e3 });
  }, [dispatch, t]);
  const handleClick = (0, import_react5.useCallback)(() => {
    if (canAbort) {
      handleAbortAllMessages();
      return;
    }
    if (isLoading) return;
    onClick();
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  }, [canAbort, isLoading, handleAbortAllMessages, onClick]);
  const handleMouseDown = (0, import_react5.useCallback)((event) => {
    event.preventDefault();
  }, []);
  const variantClass = canAbort ? "stop-mode" : isLoading ? "loading" : "send-mode";
  const isEffectivelyDisabled = (disabled || isLoading) && !canAbort;
  const ariaLabel = canAbort ? t("stopAllGeneration") : isLoading ? t("sendLoading", "Sending\u2026") : t("send");
  const ariaTitle = canAbort ? t("stopAllGeneration") : isLoading ? t("sendLoading", "Sending\u2026") : t("send");
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "button",
    {
      type: "button",
      className: `send-button ${variantClass}`,
      "data-testid": testId,
      "data-loading": isLoading ? "true" : void 0,
      "aria-busy": isLoading || void 0,
      onMouseDown: handleMouseDown,
      onClick: handleClick,
      disabled: isEffectivelyDisabled,
      "aria-label": ariaLabel,
      title: ariaTitle,
      children: canAbort ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "stop-indicator", "aria-hidden": "true" }) : isLoading ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        LuLoader,
        {
          size: 20,
          strokeWidth: 1.8,
          className: "send-loading-icon",
          "aria-hidden": "true"
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        LuArrowUp,
        {
          size: 20,
          strokeWidth: 1.75,
          className: `send-icon ${isAnimating ? "animating" : ""}`,
          "aria-hidden": "true"
        }
      )
    }
  );
};
var SendButton_default = SendButton;

// packages/chat/web/VoiceInputButton.tsx
var import_react6 = __toESM(require_react());
var import_jsx_runtime4 = __toESM(require_jsx_runtime());
var VAD_SILENCE_THRESHOLD = 0.012;
var VAD_SILENCE_DURATION = 1500;
var VAD_MIN_RECORDING = 800;
var TRANSCRIPTION_ENDPOINTS = ["/api/cf-speech-to-text", "/api/whisper-turbo"];
var RETRYABLE_CF_TRANSCRIPTION_ERROR_CODES = /* @__PURE__ */ new Set([
  "CF_FREE_BUDGET_EXCEEDED",
  "CF_NOT_CONFIGURED",
  "CF_AI_ERROR",
  "CF_AI_FAILED"
]);
function shouldRetryTranscriptionEndpoint(endpoint, status, errorCode) {
  if (endpoint !== "/api/cf-speech-to-text") return false;
  if (typeof errorCode === "string" && RETRYABLE_CF_TRANSCRIPTION_ERROR_CODES.has(errorCode)) {
    return true;
  }
  return status >= 500;
}
var VoiceInputButton = ({
  onTranscribed,
  onSend,
  className = "",
  iconSize = 18,
  language = "zh"
}) => {
  const { currentServer, currentToken: token } = useAppSelector(selectRuntimeSnapshot);
  const currentDialogKey = useCurrentDialogKey();
  const [isRecording, setIsRecording] = (0, import_react6.useState)(false);
  const [isProcessing, setIsProcessing] = (0, import_react6.useState)(false);
  const mediaRecorderRef = (0, import_react6.useRef)(null);
  const chunksRef = (0, import_react6.useRef)([]);
  const audioCtxRef = (0, import_react6.useRef)(null);
  const analyserRef = (0, import_react6.useRef)(null);
  const vadRafRef = (0, import_react6.useRef)(0);
  const silenceStartRef = (0, import_react6.useRef)(null);
  const recordingStartRef = (0, import_react6.useRef)(0);
  const cleanupVad = (0, import_react6.useCallback)(() => {
    if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
    vadRafRef.current = 0;
    silenceStartRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {
    });
    audioCtxRef.current = null;
  }, []);
  const stopRecording = (0, import_react6.useCallback)(() => {
    cleanupVad();
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
  }, [cleanupVad]);
  const startRecording = (0, import_react6.useCallback)(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u9EA6\u514B\u98CE\u5F55\u97F3");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      toast.error("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u5B9E\u65F6\u5F55\u97F3");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recordingStartRef.current = Date.now();
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        const buf = new Float32Array(analyser.fftSize);
        const checkSilence = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getFloatTimeDomainData(buf);
          let rms = 0;
          for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
          rms = Math.sqrt(rms / buf.length);
          const elapsed = Date.now() - recordingStartRef.current;
          if (elapsed < VAD_MIN_RECORDING) {
            vadRafRef.current = requestAnimationFrame(checkSilence);
            return;
          }
          if (rms < VAD_SILENCE_THRESHOLD) {
            if (silenceStartRef.current === null) {
              silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current >= VAD_SILENCE_DURATION) {
              stopRecording();
              return;
            }
          } else {
            silenceStartRef.current = null;
          }
          vadRafRef.current = requestAnimationFrame(checkSilence);
        };
        vadRafRef.current = requestAnimationFrame(checkSilence);
      } catch {
      }
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        cleanupVad();
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        if (!chunksRef.current.length) {
          toast.error("\u672A\u5F55\u5230\u58F0\u97F3\uFF0C\u8BF7\u91CD\u8BD5");
          return;
        }
        const locationOrigin = globalThis?.location?.origin ? String(globalThis.location.origin) : "";
        const serverOrigin = (locationOrigin || currentServer || "").replace(/\/$/, "");
        const dialogId = currentDialogKey ? extractCustomId(currentDialogKey) : null;
        if (!serverOrigin) {
          toast.error("\u5F53\u524D\u670D\u52A1\u5668\u5730\u5740\u4E0D\u53EF\u7528");
          return;
        }
        setIsProcessing(true);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });
        const reader = new FileReader();
        reader.onloadend = async () => {
          if (typeof reader.result !== "string") {
            toast.error("\u8BED\u97F3\u7F16\u7801\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
            setIsProcessing(false);
            return;
          }
          try {
            let data = null;
            let lastError = null;
            for (const endpoint of TRANSCRIPTION_ENDPOINTS) {
              const res = await fetch(`${serverOrigin}${endpoint}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...token ? { Authorization: `Bearer ${token}` } : {}
                },
                body: JSON.stringify({
                  audioUrl: reader.result,
                  language,
                  ...dialogId ? { dialogId } : {}
                })
              });
              const contentType = res.headers.get("content-type") || "";
              const rawText = await res.text();
              let parsed = null;
              try {
                parsed = rawText ? JSON.parse(rawText) : null;
              } catch {
                parsed = null;
              }
              if (!contentType.includes("application/json")) {
                lastError = new Error("ASR \u63A5\u53E3\u8FD4\u56DE\u4E86\u975E JSON \u54CD\u5E94");
                continue;
              }
              if (res.ok) {
                data = parsed;
                break;
              }
              const errorCode = typeof parsed?.error?.code === "string" ? parsed.error.code : void 0;
              lastError = new Error(
                parsed?.error?.message || parsed?.error || rawText.slice(0, 120) || `HTTP ${res.status}`
              );
              if (!shouldRetryTranscriptionEndpoint(endpoint, res.status, errorCode)) {
                break;
              }
            }
            if (!data) throw lastError ?? new Error("\u8BED\u97F3\u8F6C\u6587\u5B57\u5931\u8D25");
            const transcript = asTrimmedString(data?.text);
            if (!transcript) {
              toast.error("\u672A\u8BC6\u522B\u5230\u8BED\u97F3\u5185\u5BB9");
              return;
            }
            onTranscribed(transcript);
            if (onSend) {
              setTimeout(() => onSend(transcript), 0);
            }
          } catch (err) {
            console.error("[VoiceInput] transcription failed:", err);
            toast.error("\u8BED\u97F3\u8F6C\u6587\u5B57\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("[VoiceInput] mic access denied:", err);
      toast.error("\u65E0\u6CD5\u8BBF\u95EE\u9EA6\u514B\u98CE\uFF0C\u8BF7\u68C0\u67E5\u6D4F\u89C8\u5668\u6743\u9650");
    }
  }, [currentDialogKey, currentServer, language, token, onTranscribed, onSend, stopRecording, cleanupVad]);
  (0, import_react6.useEffect)(() => () => {
    cleanupVad();
  }, [cleanupVad]);
  const handleClick = (0, import_react6.useCallback)(() => {
    if (isProcessing) return;
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, isProcessing, stopRecording, startRecording]);
  const stateClass = isRecording ? "voice-btn--recording" : isProcessing ? "voice-btn--processing" : "voice-btn--idle";
  const label = isRecording ? "\u505C\u6B62\u5F55\u97F3\uFF08\u6216\u7B49\u5F85\u9759\u97F3\u81EA\u52A8\u505C\u6B62\uFF09" : isProcessing ? "\u8F6C\u5F55\u4E2D\u2026" : "\u8BED\u97F3\u8F93\u5165";
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_jsx_runtime4.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "button",
    {
      type: "button",
      className: `voice-btn ${stateClass} ${className}`,
      onClick: handleClick,
      disabled: isProcessing,
      "aria-label": label,
      title: label,
      children: isProcessing ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "voice-dots", "aria-hidden": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", {}),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", {}),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", {})
      ] }) : isRecording ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "voice-bars", "aria-hidden": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", {}),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", {}),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", {}),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", {}),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", {})
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuMic, { size: iconSize, "aria-hidden": "true" })
    }
  ) });
};
var VoiceInputButton_default = VoiceInputButton;

// packages/app/hooks/useAutoResizeTextarea.ts
var import_react7 = __toESM(require_react());
function useAutoResizeTextarea({
  maxHeight,
  onTextChange,
  value,
  ref
}) {
  const adjustHeight = (0, import_react7.useCallback)(
    (el) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    },
    [maxHeight]
  );
  (0, import_react7.useEffect)(() => {
    if (ref?.current) {
      adjustHeight(ref.current);
    }
  }, [adjustHeight, ref, value]);
  const handleChange = (0, import_react7.useCallback)(
    (event) => {
      const val = event.target.value;
      onTextChange(val);
      adjustHeight(event.target);
    },
    [adjustHeight, onTextChange]
  );
  return { handleChange, adjustHeight };
}

// packages/chat/web/useMessageInputFiles.ts
var import_react8 = __toESM(require_react());

// packages/app/utils/asyncMapStatus.ts
async function withMapItemProcessing(key, setMap, task) {
  setMap((prev) => {
    const next = new Map(prev);
    const prevStatus = next.get(key) || { processing: false };
    next.set(key, { ...prevStatus, processing: true, error: void 0 });
    return next;
  });
  try {
    await task();
  } finally {
    setMap((prev) => {
      const next = new Map(prev);
      const prevStatus = next.get(key) || { processing: false };
      next.set(key, { ...prevStatus, processing: false });
      return next;
    });
  }
}

// packages/chat/web/useMessageInputFiles.ts
var fileProcessorModulePromise = null;
var getProcessDocumentFile = async () => {
  if (!fileProcessorModulePromise) {
    fileProcessorModulePromise = import("/public/assets/chunks/fileProcessor-PEO6LBIB.js");
  }
  const { processDocumentFile } = await fileProcessorModulePromise;
  return processDocumentFile;
};
var useMessageInputFiles = (processImages, options) => {
  const {
    dispatch,
    t,
    ocrModel,
    currentServer,
    token,
    currentDialogKey,
    pendingFiles = []
  } = options;
  const [fileStatus, setFileStatus] = (0, import_react8.useState)(
    () => /* @__PURE__ */ new Map()
  );
  const clearFileStatus = (0, import_react8.useCallback)(() => {
    setFileStatus(/* @__PURE__ */ new Map());
  }, []);
  const processDocs = (0, import_react8.useCallback)(
    async (docs) => {
      if (!docs.length) return;
      const processDocumentFile = await getProcessDocumentFile();
      const effectiveDialogKey = currentDialogKey || GLOBAL_DIALOG_RUNTIME_KEY;
      await Promise.all(
        docs.map(async (file) => {
          const fileId = nanoid();
          await withMapItemProcessing(
            fileId,
            setFileStatus,
            async () => {
              try {
                await processDocumentFile({
                  file,
                  fileId,
                  dispatch,
                  t,
                  ocrModel: ocrModel ?? void 0,
                  ocrRequest: {
                    serverOrigin: currentServer,
                    accessToken: token ?? void 0,
                    dialogId: currentDialogKey ?? void 0
                  },
                  dialogKey: effectiveDialogKey
                });
              } catch (e) {
                const message = toErrorMessage(e);
                setFileStatus((prev) => {
                  const next = new Map(prev);
                  const prevStatus = next.get(fileId) || { processing: false };
                  next.set(fileId, { ...prevStatus, error: message });
                  return next;
                });
              }
            }
          );
        })
      );
    },
    [currentDialogKey, currentServer, dispatch, ocrModel, t, token]
  );
  const processFiles = (0, import_react8.useCallback)(
    async (input) => {
      if (!input) return;
      const filesArray = Array.isArray(input) ? input : Array.from(input);
      if (!filesArray.length) return;
      const [images, docs] = splitFiles(filesArray);
      if (images.length) {
        processImages(images);
      }
      if (docs.length) {
        await processDocs(docs);
      }
    },
    [processDocs, processImages]
  );
  const processingCount = (0, import_react8.useMemo)(
    () => Array.from(fileStatus.values()).filter((status) => status.processing).length,
    [fileStatus]
  );
  const processingFileIds = (0, import_react8.useMemo)(
    () => new Set(
      Array.from(fileStatus.entries()).flatMap(
        ([id, status]) => status.processing ? [id] : []
      )
    ),
    [fileStatus]
  );
  const pendingFilesWithStatus = (0, import_react8.useMemo)(
    () => pendingFiles.map((file) => {
      const status = fileStatus.get(file.trackingId ?? file.id);
      return { ...file, error: status?.error };
    }),
    [pendingFiles, fileStatus]
  );
  return {
    fileStatus,
    processingCount,
    processingFileIds,
    pendingFilesWithStatus,
    processFiles,
    clearFileStatus
  };
};

export {
  sendFirstMessage,
  useChatInput,
  useFileDropZone,
  BrowseContextIndicator,
  FileUploadButton_default,
  SendButton_default,
  VoiceInputButton_default,
  useAutoResizeTextarea,
  useMessageInputFiles
};
