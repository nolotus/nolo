import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import { readFileContent } from "database/dbSlice";
import {
  buildSpaceContentImageUrl,
  getSpaceContentImageFallbackFileIds,
  isSpaceContentImage,
  type MinimalContentMediaItem,
} from "./spaceContentMedia";

export const useContentImageSrc = (item: MinimalContentMediaItem) => {
  const dispatch = useAppDispatch();
  const runtimeServer = useAppSelector(selectRuntimeCurrentServer);
  const currentServer = item.serverOrigin || runtimeServer;

  const isImage = isSpaceContentImage(item);
  const fallbackUrlRef = useRef<string | null>(null);
  const imageFallbackTriedRef = useRef(false);

  const remoteImageSrc = useMemo(() => {
    return buildSpaceContentImageUrl(currentServer, item);
  }, [currentServer, item]);

  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;

    if (fallbackUrlRef.current) {
      URL.revokeObjectURL(fallbackUrlRef.current);
      fallbackUrlRef.current = null;
    }
    imageFallbackTriedRef.current = false;
    setImageSrc(remoteImageSrc);
  }, [isImage, remoteImageSrc]);

  useEffect(() => {
    return () => {
      if (fallbackUrlRef.current) {
        URL.revokeObjectURL(fallbackUrlRef.current);
        fallbackUrlRef.current = null;
      }
    };
  }, []);

  const loadImageFallback = useCallback(async () => {
    if (!isImage || imageFallbackTriedRef.current) return;
    imageFallbackTriedRef.current = true;
    
    let lastError: unknown = null;
    
    for (const fileId of getSpaceContentImageFallbackFileIds(item)) {
      try {
        const result = await (dispatch as any)(readFileContent({ fileId })).unwrap();
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
      error: lastError,
    });
  }, [dispatch, isImage, item]);

  return {
    imageSrc: imageSrc ?? remoteImageSrc,
    loadImageFallback,
  };
};