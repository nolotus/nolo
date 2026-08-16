import { useState, useCallback, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import { readFileAsDataURL } from "app/utils/fileReaders";
import {
  clearComposerImageDraft,
  getComposerImageDraft,
  setComposerImageDraft,
} from "chat/dialog/composerImageDraftStore";

export interface PendingImagePreview {
  id: string;
  url: string;
}

interface UseChatInputOptions {
  initialText?: string;
  onTextChange?: (text: string) => void;
  maxImages?: number;
  onImageLimitExceeded?: () => void;
  /** When set, image drafts persist across dialog leave/re-enter. */
  draftKey?: string | null;
}

export const useChatInput = (options: UseChatInputOptions = {}) => {
  const {
    initialText = "",
    onTextChange,
    maxImages = Infinity,
    onImageLimitExceeded,
    draftKey = null,
  } = options;

  const [text, setText] = useState(initialText);
  const [imageFiles, setImageFiles] = useState<Map<string, File>>(() => {
    const draft = getComposerImageDraft(draftKey);
    return new Map(draft.map((item) => [item.id, item.file]));
  });
  const [imgPreviews, setImgPreviews] = useState<PendingImagePreview[]>(() => {
    const draft = getComposerImageDraft(draftKey);
    return draft.map((item) => ({ id: item.id, url: item.previewUrl }));
  });
  const objectUrlByIdRef = useRef<Map<string, string>>(new Map());
  const draftKeyRef = useRef(draftKey);
  const imageFilesRef = useRef(imageFiles);
  const imgPreviewsRef = useRef(imgPreviews);

  useEffect(() => {
    imageFilesRef.current = imageFiles;
  }, [imageFiles]);
  useEffect(() => {
    imgPreviewsRef.current = imgPreviews;
  }, [imgPreviews]);

  // Track blob URLs created in this mount so we can revoke only those we own
  // when abandoning a non-persisted draft (no draftKey).
  useEffect(() => {
    for (const preview of imgPreviews) {
      if (
        preview.url.startsWith("blob:") &&
        !objectUrlByIdRef.current.has(preview.id)
      ) {
        objectUrlByIdRef.current.set(preview.id, preview.url);
      }
    }
  }, [imgPreviews]);

  const revokePreviewUrl = useCallback((id: string) => {
    const url = objectUrlByIdRef.current.get(id);
    if (!url) return;

    if (
      typeof URL !== "undefined" &&
      typeof URL.revokeObjectURL === "function"
    ) {
      URL.revokeObjectURL(url);
    }
    objectUrlByIdRef.current.delete(id);
  }, []);

  const revokeAllPreviewUrls = useCallback(() => {
    for (const id of [...objectUrlByIdRef.current.keys()]) {
      revokePreviewUrl(id);
    }
  }, [revokePreviewUrl]);

  const persistDraft = useCallback((key: string | null | undefined) => {
    if (!key) return;
    const files = imageFilesRef.current;
    const previews = imgPreviewsRef.current;
    if (files.size === 0) {
      setComposerImageDraft(key, []);
      return;
    }
    setComposerImageDraft(
      key,
      previews
        .map((preview) => {
          const file = files.get(preview.id);
          if (!file) return null;
          return {
            id: preview.id,
            file,
            previewUrl: preview.url,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    );
  }, []);

  const hydrateDraft = useCallback((key: string | null | undefined) => {
    const draft = getComposerImageDraft(key);
    objectUrlByIdRef.current = new Map(
      draft
        .filter((item) => item.previewUrl.startsWith("blob:"))
        .map((item) => [item.id, item.previewUrl])
    );
    setImageFiles(new Map(draft.map((item) => [item.id, item.file])));
    setImgPreviews(draft.map((item) => ({ id: item.id, url: item.previewUrl })));
  }, []);

  // Persist previous dialog draft and restore the next when draftKey changes.
  useEffect(() => {
    const previousKey = draftKeyRef.current;
    if (previousKey && previousKey !== draftKey) {
      persistDraft(previousKey);
    }
    if (draftKey !== previousKey) {
      hydrateDraft(draftKey);
      draftKeyRef.current = draftKey;
    }
  }, [draftKey, hydrateDraft, persistDraft]);

  // Keep the module draft mirror current while editing (covers fast dialog switches).
  useEffect(() => {
    if (!draftKey) return;
    persistDraft(draftKey);
  }, [draftKey, imageFiles, imgPreviews, persistDraft]);

  useEffect(() => {
    return () => {
      const key = draftKeyRef.current;
      if (key) {
        persistDraft(key);
        // Keep blob URLs alive in the draft store; do not revoke on unmount.
        objectUrlByIdRef.current = new Map();
        return;
      }
      revokeAllPreviewUrls();
    };
  }, [persistDraft, revokeAllPreviewUrls]);

  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText);
      onTextChange?.(newText);
    },
    [onTextChange]
  );

  const processImages = useCallback(
    (files: File[]) => {
      console.group("[QuickChatTrace] useChatInput.processImages enter");
      console.log("[QuickChatTrace] processImages files", {
        count: files.length,
        files: files.map((f) => ({
          name: f.name,
          type: f.type,
          sizeBytes: f.size,
          sizeMB: (f.size / (1024 * 1024)).toFixed(3),
        })),
        currentPreviewCount: imgPreviews.length,
        maxImages,
      });
      if (!files.length) {
        console.groupEnd();
        return;
      }

      const existingFiles = Array.from(imageFilesRef.current.values());
      const seenSignatures = new Set<string>();

      const dedupedIncoming = files.filter((file) => {
        const sig = `${file.name}-${file.size}-${file.type}-${file.lastModified ?? 0}`;
        if (seenSignatures.has(sig)) return false;
        seenSignatures.add(sig);

        const isAlreadyAdded = existingFiles.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.type === file.type &&
            (existing.lastModified ?? 0) === (file.lastModified ?? 0)
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
          maxImages,
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
        rejectedCount: files.length - allowedFiles.length,
      });

      allowedFiles.forEach((file, idx) => {
        const id = nanoid();

        if (
          typeof URL !== "undefined" &&
          typeof URL.createObjectURL === "function"
        ) {
          const url = URL.createObjectURL(file);
          objectUrlByIdRef.current.set(id, url);
          setImgPreviews((prev) => [...prev, { id, url }]);
          console.log("[QuickChatTrace] processImages blobUrl created", {
            idx,
            id,
            url,
            sizeBytes: file.size,
            type: file.type,
          });
        } else {
          console.log("[QuickChatTrace] processImages fallback to data URL", {
            idx,
            id,
            sizeBytes: file.size,
            type: file.type,
          });
          readFileAsDataURL(file)
            .then((url) => {
              setImgPreviews((prev) => [...prev, { id, url }]);
            })
            .catch((err) => {
              console.warn("[useChatInput] readFileAsDataURL failed:", err);
            });
        }

        setImageFiles((prev) => {
          const next = new Map(prev);
          next.set(id, file);
          console.log("[QuickChatTrace] processImages imageFiles updated", {
            id,
            newMapSize: next.size,
          });
          return next;
        });
      });
      console.groupEnd();
    },
    [imgPreviews.length, maxImages, onImageLimitExceeded]
  );

  const removeImage = useCallback(
    (id: string) => {
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

  const clear = useCallback(() => {
    if (draftKeyRef.current) {
      clearComposerImageDraft(draftKeyRef.current);
    } else {
      revokeAllPreviewUrls();
    }
    objectUrlByIdRef.current = new Map();
    setText("");
    setImgPreviews([]);
    setImageFiles(new Map());
  }, [revokeAllPreviewUrls]);

  return {
    text,
    setText: handleTextChange,
    imageFiles,
    imgPreviews,
    processImages,
    removeImage,
    clear,
  };
};
