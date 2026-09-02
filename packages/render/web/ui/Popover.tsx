// packages/render/web/ui/Popover.tsx
//
// Thin wrapper around `react-aria-components/Popover` that adds our default
// offset and lets callers opt out of the arrow via a `hideArrow` prop.
//
// The arrow is rendered via RAC's `OverlayArrow` as the first child of the
// popover content. No extra wrapper <div> — children pass through directly so
// RAC's positioning and size measurement aren't affected.

import * as stylex from "@stylexjs/stylex";
import React from "react";
import {
  Popover as AriaPopover,
  OverlayArrow,
  type PopoverProps,
  type PopoverRenderProps,
} from "react-aria-components";

import { popoverStyles } from "./popover.styles";

export type AppPopoverProps = PopoverProps & {
  /** Hide the overlay arrow rendered by `OverlayArrow`. */
  hideArrow?: boolean;
  /** Override the main-axis offset (RAC default is 8). */
  offset?: number;
  /** Override the cross-axis offset. */
  crossOffset?: number;
};

type PopoverSide = "top" | "bottom" | "left" | "right";

function popoverSide(placement: string | null | undefined): PopoverSide {
  // RAC placement 形如 "bottom left"；原 CSS 用 ^= 前缀匹配，取首词等价。
  return ((placement ?? "top").split(" ")[0] as PopoverSide) ?? "top";
}

const placementStyles = {
  top: popoverStyles.placementTop,
  bottom: popoverStyles.placementBottom,
  right: popoverStyles.placementRight,
  left: popoverStyles.placementLeft,
} as const;

const arrowPlacementStyles = {
  top: popoverStyles.arrowTop,
  bottom: popoverStyles.arrowBottom,
  right: popoverStyles.arrowRight,
  left: popoverStyles.arrowLeft,
} as const;

function PopoverArrow({
  placementStyle,
}: {
  placementStyle:
    | (typeof popoverStyles)["arrowTop"]
    | (typeof popoverStyles)["arrowBottom"]
    | (typeof popoverStyles)["arrowRight"]
    | (typeof popoverStyles)["arrowLeft"];
}) {
  return (
    <OverlayArrow>
      {/* Slightly wider than RAC's 12px default so the pointer reads at menu scale. */}
      <svg
        width={14}
        height={14}
        viewBox="0 0 14 14"
        {...stylex.props(popoverStyles.arrow, placementStyle)}
      >
        <path d="M0 0 L7 7 L14 0" />
      </svg>
    </OverlayArrow>
  );
}

export function Popover(props: AppPopoverProps) {
  const {
    hideArrow = false,
    offset = 4,
    crossOffset = 0,
    className,
    children,
    ...rest
  } = props;

  return (
    <AriaPopover
      {...rest}
      className={(renderProps) => {
        const side = popoverSide(renderProps.placement);
        const external =
          typeof className === "function"
            ? className(renderProps)
            : className;
        return [
          stylex.props(popoverStyles.popover, placementStyles[side]).className,
          external ?? "",
        ]
          .filter(Boolean)
          .join(" ");
      }}
      offset={offset}
      crossOffset={crossOffset}
    >
      {(renderProps: PopoverRenderProps) => {
        const side = popoverSide(renderProps.placement);
        const body =
          typeof children === "function"
            ? children({ ...renderProps, defaultChildren: undefined })
            : children;
        return (
          <>
            {hideArrow ? null : (
              <PopoverArrow placementStyle={arrowPlacementStyles[side]} />
            )}
            {body}
          </>
        );
      }}
    </AriaPopover>
  );
}
