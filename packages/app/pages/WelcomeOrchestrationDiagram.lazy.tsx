import React, { Suspense, lazy } from "react";
import type { WelcomeOrchestrationDiagramProps } from "./WelcomeOrchestrationDiagram";

const WelcomeOrchestrationDiagram = lazy(() =>
  import("./WelcomeOrchestrationDiagram").then((mod) => ({
    default: mod.WelcomeOrchestrationDiagram,
  })),
);

const WelcomeOrchestrationDiagramFallback = () => (
  <div className="wf-diagram-skeleton" aria-hidden="true">
    <div className="wf-diagram-skeleton__lines" />
    <div className="wf-diagram-skeleton__nodes">
      <span />
      <span />
      <span />
    </div>
  </div>
);

const WelcomeOrchestrationDiagramLazy = (props: WelcomeOrchestrationDiagramProps) => (
  <Suspense fallback={<WelcomeOrchestrationDiagramFallback />}>
    <WelcomeOrchestrationDiagram {...props} />
  </Suspense>
);

export default React.memo(WelcomeOrchestrationDiagramLazy);