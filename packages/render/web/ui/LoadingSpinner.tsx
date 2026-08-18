// render/web/ui/LoadingSpinner.tsx
import "../ui.css";
import type React from "react";

interface LoadingSpinnerProps {
  size?: number; // 直径
  thickness?: number; // 线宽
  className?: string;
}


function LoadingSpinner({
  size = 16,
  thickness = 2,
  className = "",
}: LoadingSpinnerProps) {
  return (
    <>
      <span
        className={`loading-spinner ${className}`.trim()}
        style={{
          width: size,
          height: size,
          borderWidth: thickness,
        }}
        aria-hidden="true"
      />
    </>
  );
}

export default LoadingSpinner;
