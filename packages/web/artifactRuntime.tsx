import React from "react";
import { createRoot } from "react-dom/client";
import ArtifactRuntimePage from "render/web/elements/ArtifactRuntimePage";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(<ArtifactRuntimePage />);
}
