import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { readFileContent } from "database/dbSlice";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import { buildDatabaseFileContentUrl } from "database/fileUrl";
import { loadSpaceContentImageBlob, spaceImageFileKey } from "./spaceContentMedia";
import ImagePreviewModal from "render/web/ui/modal/ImagePreviewModal";

interface ImagePreviewFetcherProps {
  contentKey: string;
  spaceId?: string | null;
  serverOrigin?: string | null;
  onClose: () => void;
  alt: string;
}

const ImagePreviewFetcher: React.FC<ImagePreviewFetcherProps> = ({
  contentKey,
  spaceId,
  serverOrigin,
  onClose,
  alt,
}) => {
  const dispatch = useAppDispatch();
  const currentServer = useAppSelector(selectRuntimeCurrentServer);
  const originalSrc = buildDatabaseFileContentUrl(serverOrigin || currentServer, encodeURIComponent(spaceImageFileKey(contentKey)));
  const [localImage, setLocalImage] = useState<{ contentKey: string; url: string }>();

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void loadSpaceContentImageBlob(contentKey,
      (fileId) => dispatch(readFileContent({ fileId, useServerFallback: false })).unwrap(),
      () => active,
    ).then((blob) => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setLocalImage({ contentKey, url: objectUrl });
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contentKey, dispatch]);

  const imageUrl = localImage?.contentKey === contentKey ? localImage.url : originalSrc;
  return <ImagePreviewModal imageUrl={imageUrl} spaceId={spaceId} onClose={onClose} alt={alt} contentKey={contentKey} />;
};

export default ImagePreviewFetcher;
