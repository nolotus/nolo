import React from "react";

export const ClientDownloadsWave: React.FC<{
  className?: string;
  src: string;
  srcSet?: string;
  sizes?: string;
  pos?: string;
}> = ({ className, src, srcSet, sizes, pos }) => {
  return (
    <img
      className={className}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={pos ? { objectPosition: pos } : undefined}
    />
  );
};
