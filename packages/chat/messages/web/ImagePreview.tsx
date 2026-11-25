import React, { memo, useCallback } from "react";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
import { useWebMediaSrc } from "render/web/ui/useWebMediaSrc";
import { imagePreviewStyles } from "./imagePreviewStyles";
import { withLiteralClass } from "./toolMessageShared";

export const ImagePreview = memo(
  ({
    src,
    alt,
    onPreview,
  }: {
    src: string;
    alt?: string;
    onPreview: (src: string) => void;
  }) => {
    const spaceId = useCurrentSpaceId();
    const mediaSrc = useWebMediaSrc(src, { spaceId });
    const handleClick = useCallback(() => onPreview(src), [src, onPreview]);

    return (
      <div {...withLiteralClass("msg-image-wrap", imagePreviewStyles.wrap)}>
        {mediaSrc ? <img
          {...withLiteralClass("msg-image", imagePreviewStyles.image)}
          src={mediaSrc}
          alt={alt || "消息图片"}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          loading="lazy"
          decoding="async"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
        /> : <span role="img" aria-label={alt || "消息图片不可用"}>—</span>}
      </div>
    );
  }
);

export default ImagePreview;
