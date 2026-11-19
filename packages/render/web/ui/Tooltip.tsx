// render/web/ui/Tooltip.tsx
//
// Thin wrapper around react-aria-components Tooltip that preserves the legacy
// `content + children` API used by 11+ call sites.
//
// AriaTooltipTrigger injects hover/focus trigger props + a ref via
// FocusableContext. TriggerWrapper merges them onto an inner <span> so the
// original children (<span>/<button>/<Button>) don't need forwardRef.
import React, { useContext } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  OverlayArrow,
  Tooltip as AriaTooltip,
  type TooltipProps as AriaTooltipProps,
  TooltipTrigger as AriaTooltipTrigger,
} from "react-aria-components/Tooltip";
import { FocusableContext } from "react-aria/private/interactions/useFocusable";

import {
  tooltipStyles,
  type TooltipArrowStyle,
} from "./tooltip.styles";
import { resolvePlacementSide } from "./triggerOrigin";

type LegacyPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  delay?: number;
  /** Maps to react-aria's space-separated Placement. */
  placement?: LegacyPlacement;
  disabled?: boolean;
}

const PLACEMENT_MAP: Record<LegacyPlacement, string> = {
  top: "top",
  "top-left": "top left",
  "top-right": "top right",
  bottom: "bottom",
  "bottom-left": "bottom left",
  "bottom-right": "bottom right",
  left: "left",
  right: "right",
};

/**
 * Reads FocusableContext (injected by AriaTooltipTrigger), merges the context
 * ref with the forwarded ref, and spreads trigger events onto a <span>.
 */
const TriggerWrapper = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(function TriggerWrapper({ children, ...rest }, forwardedRef) {
  const focusableContext = useContext(FocusableContext);
  const ctxRef = focusableContext?.ref as
    | React.MutableRefObject<Element | null>
    | undefined;
  const { ref: _ctxRef, ...triggerEvents } = focusableContext ?? {};

  return (
    <span
      ref={(node: HTMLSpanElement | null) => {
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
        if (ctxRef) ctxRef.current = node;
      }}
      {...triggerEvents}
      {...rest}
    >
      {children}
    </span>
  );
});

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  delay,
  placement = "top",
  disabled = false,
}) => {
  if (!content || disabled) {
    return <>{children}</>;
  }

  const placementStyleBySide = {
    top: tooltipStyles.placementTop,
    bottom: tooltipStyles.placementBottom,
    left: tooltipStyles.placementLeft,
    right: tooltipStyles.placementRight,
  } as const;
  const arrowRotationBySide: Record<
    "top" | "bottom" | "left" | "right",
    TooltipArrowStyle | null
  > = {
    top: null,
    bottom: tooltipStyles.arrowRotateBottom,
    left: tooltipStyles.arrowRotateLeft,
    right: tooltipStyles.arrowRotateRight,
  };
  const fallbackSide = resolvePlacementSide(placement, "top");

  return (
    <AriaTooltipTrigger delay={delay}>
      <TriggerWrapper>{children}</TriggerWrapper>
      <AriaTooltip
        placement={PLACEMENT_MAP[placement] as AriaTooltipProps["placement"]}
        offset={6}
        className={(renderProps) => {
          const resolvedSide = resolvePlacementSide(
            renderProps.placement,
            fallbackSide,
          );
          return (
            stylex.props(
              tooltipStyles.tooltip,
              placementStyleBySide[resolvedSide],
            ).className ?? ""
          );
        }}
      >
        {(renderProps) => {
          const resolvedSide = resolvePlacementSide(
            renderProps.placement,
            fallbackSide,
          );
          return (
            <>
              <OverlayArrow>
                <svg
                  width={8}
                  height={8}
                  viewBox="0 0 8 8"
                  {...stylex.props(
                    tooltipStyles.arrow,
                    arrowRotationBySide[resolvedSide],
                  )}
                >
                  <path d="M0 0 L4 4 L8 0" />
                </svg>
              </OverlayArrow>
              {content}
            </>
          );
        }}
      </AriaTooltip>
    </AriaTooltipTrigger>
  );
};