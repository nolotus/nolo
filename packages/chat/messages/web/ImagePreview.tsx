import React, { memo, useCallback } from "react";

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
      <div className="msg-image-wrap">
        <img
          src={src}
          alt={alt || "消息图片"}
          className="msg-image"
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
