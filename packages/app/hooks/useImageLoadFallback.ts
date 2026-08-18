import { useCallback, useEffect, useState } from "react";

export function useImageLoadFallback(src?: string | null) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [src]);

  const handleImageError = useCallback(() => {
    setHasImageError(true);
  }, []);

  return {
    hasImageError,
    shouldRenderImage: Boolean(src) && !hasImageError,
    handleImageError,
  };
}
