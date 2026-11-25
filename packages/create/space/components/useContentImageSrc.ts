import { useWebMediaSrc } from "render/web/ui/useWebMediaSrc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import { readFileContent } from "database/dbSlice";
import {
  buildSpaceContentImageUrl,
  loadSpaceContentImageBlob,
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
  const generation = useRef(0);

  const originalSrc = useMemo(() => {
    return buildSpaceContentImageUrl(item.serverOrigin || currentServer, item);
  }, [currentServer, item]);

  const remoteImageSrc = useWebMediaSrc(originalSrc, { spaceId: item.spaceId });

  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;

    if (fallbackUrlRef.current) {
      URL.revokeObjectURL(fallbackUrlRef.current);
      fallbackUrlRef.current = null;
    }
    generation.current++;
    imageFallbackTriedRef.current = false;
    setImageSrc(null);
  }, [isImage, originalSrc, item.contentKey]);

  useEffect(() => {
    return () => {
      generation.current++;
      if (fallbackUrlRef.current) {
        URL.revokeObjectURL(fallbackUrlRef.current);
        fallbackUrlRef.current = null;
      }
    };
  }, []);

  const loadImageFallback = useCallback(async () => {
    if (!isImage || imageFallbackTriedRef.current) return;
    imageFallbackTriedRef.current = true;
    
    const requestGeneration = generation.current;
    
    const blob = await loadSpaceContentImageBlob(item.contentKey,
      (fileId) => dispatch(readFileContent({ fileId, useServerFallback: false })).unwrap(),
      () => requestGeneration === generation.current,
    );
    if (!blob || requestGeneration !== generation.current) return;
    const objectUrl = URL.createObjectURL(blob);
    fallbackUrlRef.current = objectUrl;
    setImageSrc(objectUrl);
  }, [dispatch, isImage, item.contentKey]);

  useEffect(() => { if (isImage) void loadImageFallback(); }, [isImage, loadImageFallback, originalSrc]);

  return {
    imageSrc: imageSrc ?? remoteImageSrc,
    loadImageFallback,
  };
};