// render/web/ui/LoadingSpinner.tsx
import * as stylex from "@stylexjs/stylex";

import { spinnerStyles } from "./loadingSpinner.styles";

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
  const { className: sxClass } = stylex.props(spinnerStyles.spinner);
  return (
    <span
      className={[sxClass, className].filter(Boolean).join(" ")}
      style={{
        width: size,
        height: size,
        borderWidth: thickness,
      }}
      aria-hidden="true"
    />
  );
}

export default LoadingSpinner;
