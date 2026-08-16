import React, { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "app/store";
import { readFileContent } from "database/dbSlice";
import ImagePreviewModal from "render/web/ui/modal/ImagePreviewModal";

interface ImagePreviewFetcherProps {
  contentKey: string;
  onClose: () => void;
  alt: string;
}

const ImagePreviewFetcher: React.FC<ImagePreviewFetcherProps> = ({
  contentKey,
  onClose,
  alt,
}) => {
  const dispatch = useAppDispatch();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      try {
        const result = await (dispatch as any)(
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

  return <ImagePreviewModal imageUrl={imageUrl} onClose={onClose} alt={alt} contentKey={contentKey} />;
};

export default ImagePreviewFetcher;
