import React, { useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import type { OrchestrationDiagramTab } from "./WelcomeOrchestrationDiagram";

export type WelcomeOrchestrationStepperProps = {
  tab: OrchestrationDiagramTab;
  mobileSteps: Array<{ title: string; desc: string }>;
  t: TFunction;
};

const WelcomeOrchestrationStepper = ({
  tab,
  mobileSteps,
  t,
}: WelcomeOrchestrationStepperProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visibleSteps, setVisibleSteps] = useState<boolean[]>(() =>
    Array(5).fill(false),
  );
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const roles = t("welcomeSection.showcase.stepper.roles", {
    returnObjects: true,
  }) as string[];
  const exampleText = t("welcomeSection.showcase.stepper.example");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisibleSteps(Array(5).fill(true));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        // Stagger the fade-in of each step
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            setVisibleSteps((prev) => {
              const next = [...prev];
              next[i] = true;
              return next;
            });
          }, i * 120);
        }
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [tab]);

  return (
    <div
      className="ws-orchestration-stepper"
      ref={containerRef}
      role="list"
      aria-label={t("welcomeSection.showcase.title")}
    >
      <div className="ws-stepper-track">
        {mobileSteps.slice(0, 5).map((step, i) => {
          const isActive = hoveredStep === i;
          return (
            <React.Fragment key={`${tab}-${step.title}`}>
              {i > 0 && (
                <div
                  className={`ws-stepper-connector ${visibleSteps[i] ? "is-visible" : ""}`}
                  aria-hidden="true"
                />
              )}
              <div
                className={`ws-stepper-card ${visibleSteps[i] ? "is-visible" : ""} ${isActive ? "is-active" : ""}`}
                role="listitem"
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
                onFocus={() => setHoveredStep(i)}
                onBlur={() => setHoveredStep(null)}
                tabIndex={0}
              >
                <span className="ws-stepper-number">{i + 1}</span>
                <h4 className="ws-stepper-title">{step.title}</h4>
                <p className="ws-stepper-role">
                  {roles[i] ?? mobileSteps[i]?.desc ?? ""}
                </p>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <p className="ws-stepper-example">{exampleText}</p>
    </div>
  );
};

export default React.memo(WelcomeOrchestrationStepper);
