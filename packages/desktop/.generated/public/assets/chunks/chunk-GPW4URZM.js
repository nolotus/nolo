import {
  ImagePreviewModal_default
} from "/public/assets/chunks/chunk-ZDGJ4DJD.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  buildDatabaseFileContentUrl,
  isImageResourceLike,
  readFileContent,
  selectRuntimeCurrentServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/create/space/components/spaceContentMedia.ts
var isSpaceContentImage = (item) => isImageResourceLike({
  kind: item.type,
  fileCategory: item.fileCategory,
  fileName: item.title
}) || item.contentKey.startsWith("image-");
var buildSpaceContentImageUrl = (currentServer, item) => {
  if (!isSpaceContentImage(item)) return null;
  return buildDatabaseFileContentUrl(
    currentServer,
    encodeURIComponent(item.contentKey)
  );
};
var getSpaceContentImageFallbackFileIds = (item) => {
  const fileIds = [item.contentKey];
  if (item.contentKey.startsWith("image-")) {
    fileIds.push(`file-${item.contentKey.slice("image-".length)}`);
  }
  return fileIds;
};

// packages/create/space/components/useContentImageSrc.ts
var import_react = __toESM(require_react(), 1);
var useContentImageSrc = (item) => {
  const dispatch = useAppDispatch();
  const runtimeServer = useAppSelector(selectRuntimeCurrentServer);
  const currentServer = item.serverOrigin || runtimeServer;
  const isImage = isSpaceContentImage(item);
  const fallbackUrlRef = (0, import_react.useRef)(null);
  const imageFallbackTriedRef = (0, import_react.useRef)(false);
  const remoteImageSrc = (0, import_react.useMemo)(() => {
    return buildSpaceContentImageUrl(currentServer, item);
  }, [currentServer, item]);
  const [imageSrc, setImageSrc] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!isImage) return;
    if (fallbackUrlRef.current) {
      URL.revokeObjectURL(fallbackUrlRef.current);
      fallbackUrlRef.current = null;
    }
    imageFallbackTriedRef.current = false;
    setImageSrc(remoteImageSrc);
  }, [isImage, remoteImageSrc]);
  (0, import_react.useEffect)(() => {
    return () => {
      if (fallbackUrlRef.current) {
        URL.revokeObjectURL(fallbackUrlRef.current);
        fallbackUrlRef.current = null;
      }
    };
  }, []);
  const loadImageFallback = (0, import_react.useCallback)(async () => {
    if (!isImage || imageFallbackTriedRef.current) return;
    imageFallbackTriedRef.current = true;
    let lastError = null;
    for (const fileId of getSpaceContentImageFallbackFileIds(item)) {
      try {
        const result = await dispatch(readFileContent({ fileId })).unwrap();
        if (fallbackUrlRef.current) {
          URL.revokeObjectURL(fallbackUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(result.blob);
        fallbackUrlRef.current = objectUrl;
        setImageSrc(objectUrl);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    console.warn("[useContentImageSrc] image fallback failed", {
      contentKey: item.contentKey,
      error: lastError
    });
  }, [dispatch, isImage, item]);
  return {
    imageSrc: imageSrc ?? remoteImageSrc,
    loadImageFallback
  };
};

// packages/create/space/components/ImagePreviewFetcher.tsx
var import_react2 = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var ImagePreviewFetcher = ({
  contentKey,
  onClose,
  alt
}) => {
  const dispatch = useAppDispatch();
  const [imageUrl, setImageUrl] = (0, import_react2.useState)(null);
  const currentUrlRef = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    let isMounted = true;
    const fetchImage = async () => {
      try {
        const result = await dispatch(
          readFileContent({ fileId: contentKey })
        ).unwrap();
        if (isMounted && result?.blob) {
          if (currentUrlRef.current) {
            URL.revokeObjectURL(currentUrlRef.current);
          }
          const url = URL.createObjectURL(result.blob);
          currentUrlRef.current = url;
          setImageUrl(url);
        }
      } catch (err) {
        console.error("Failed to fetch image:", err);
      }
    };
    fetchImage();
    return () => {
      isMounted = false;
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };
  }, [contentKey, dispatch]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePreviewModal_default, { imageUrl, onClose, alt, contentKey });
};
var ImagePreviewFetcher_default = ImagePreviewFetcher;

export {
  isSpaceContentImage,
  buildSpaceContentImageUrl,
  useContentImageSrc,
  ImagePreviewFetcher_default
};
