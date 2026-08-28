// render/web/ui/StreamingIndicator.tsx
import "../ui.css";
import React, { memo } from "react";

const StreamingIndicator = memo(() => {
  return (
    <div className="streaming-indicator" aria-hidden="true">
      <span className="streaming-indicator__dot" />
      <span className="streaming-indicator__dot" />
      <span className="streaming-indicator__dot" />
    </div>
  );
});

export default StreamingIndicator;
