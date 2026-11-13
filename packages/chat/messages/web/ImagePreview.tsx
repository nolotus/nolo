import React, { memo, useCallback } from "react";
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
    const handleClick = useCallback(() => onPreview(src), [src, onPreview]);

    return (
      <div {...withLiteralClass("msg-image-wrap", imagePreviewStyles.wrap)}>
        <img
          {...withLiteralClass("msg-image", imagePreviewStyles.image)}
          src={src}
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
        />
      </div>
    );
  }
);

export default ImagePreview;
