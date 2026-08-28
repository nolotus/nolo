// packages/render/web/ui/Popover.tsx
//
// Thin wrapper around `react-aria-components/Popover` that adds our default
// offset and lets callers opt out of the arrow via a `hideArrow` prop.
//
// The arrow is rendered via RAC's `OverlayArrow` as the first child of the
// popover content. No extra wrapper <div> — children pass through directly so
// RAC's positioning and size measurement aren't affected.

import React from "react";
import {
  Popover as AriaPopover,
  OverlayArrow,
  type PopoverProps,
  type PopoverRenderProps,
} from "react-aria-components";
import "./popover.css";

export type AppPopoverProps = PopoverProps & {
  /** Hide the overlay arrow rendered by `OverlayArrow`. */
  hideArrow?: boolean;
  /** Override the main-axis offset (RAC default is 8). */
  offset?: number;
  /** Override the cross-axis offset. */
  crossOffset?: number;
};

function PopoverArrow() {
  return (
    <OverlayArrow>
      {/* Slightly wider than RAC's 12px default so the pointer reads at menu scale. */}
      <svg
        width={14}
        height={14}
        viewBox="0 0 14 14"
        className="react-aria-Popover__arrow"
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
  // Every popover carries the shell; callers add to it rather than replace it.
  const shellClassName: PopoverProps["className"] =
    typeof className === "function"
      ? (renderProps) => `app-popover ${className(renderProps) ?? ""}`.trim()
      : `app-popover ${className ?? ""}`.trim();
  return (
    <AriaPopover
      {...rest}
      className={shellClassName}
      offset={offset}
      crossOffset={crossOffset}
    >
      {(renderProps: PopoverRenderProps) => {
        const body =
          typeof children === "function"
            ? children({ ...renderProps, defaultChildren: undefined })
            : children;
        return (
          <>
            {hideArrow ? null : <PopoverArrow />}
            {body}
          </>
        );
      }}
    </AriaPopover>
  );
}