// packages/render/web/ui/triggerOrigin.ts
//
// Pure geometry helpers that map trigger placements and anchor/popup rects to
// CSS `transform-origin` and directional enter travel so every trigger-based
// floating UI element scales from its trigger point rather than from center.

export type PlacementSide = "top" | "bottom" | "left" | "right";

export type RectLike = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const roundPx = (value: number): number => Math.round(value * 100) / 100;

/**
 * Extracts the primary side ("top" | "bottom" | "left" | "right") from either
 * React Aria space-separated placements ("bottom end", "right top") or
 * Floating UI / legacy hyphen-separated placements ("bottom-start", "top-left").
 */
export function resolvePlacementSide(
  placement: string | null | undefined,
  fallback: PlacementSide = "bottom",
): PlacementSide {
  if (!placement) return fallback;
  const primary = placement.trim().toLowerCase().split(/[\s-]+/)[0];
  switch (primary) {
    case "top":
    case "bottom":
    case "left":
    case "right":
      return primary;
    case "start":
      return "left";
    case "end":
      return "right";
    default:
      return fallback;
  }
}

/**
 * Maps a placement string (RAC or Floating UI) to a CSS `transform-origin`
 * anchored on the edge/corner facing the trigger.
 */
export function placementToTransformOrigin(
  placement: string | null | undefined,
  fallback: PlacementSide = "bottom",
): string {
  const parts = (placement ?? "").trim().toLowerCase().split(/[\s-]+/).filter(Boolean);
  const side = resolvePlacementSide(placement, fallback);
  const align = parts[1];

  if (side === "bottom") {
    if (align === "start" || align === "left") return "top left";
    if (align === "end" || align === "right") return "top right";
    return "top center";
  }

  if (side === "top") {
    if (align === "start" || align === "left") return "bottom left";
    if (align === "end" || align === "right") return "bottom right";
    return "bottom center";
  }

  if (side === "right") {
    if (align === "start" || align === "top") return "left top";
    if (align === "end" || align === "bottom") return "left bottom";
    return "left center";
  }

  // side === "left"
  if (align === "start" || align === "top") return "right top";
  if (align === "end" || align === "bottom") return "right bottom";
  return "right center";
}

/**
 * Returns the CSS enter-travel offset so the floating surface emerges away from
 * its trigger along the placement axis.
 */
export function placementEnterTravel(
  placement: string | null | undefined,
  fallback: PlacementSide = "bottom",
): { x: string; y: string } {
  const side = resolvePlacementSide(placement, fallback);
  switch (side) {
    case "top":
      return { x: "0px", y: "var(--popover-travel, 6px)" };
    case "bottom":
      return { x: "0px", y: "calc(var(--popover-travel, 6px) * -1)" };
    case "left":
      return { x: "var(--popover-travel, 6px)", y: "0px" };
    case "right":
      return { x: "calc(var(--popover-travel, 6px) * -1)", y: "0px" };
  }
}

/**
 * Computes pixel `transform-origin` inside a fixed popup's local coordinate
 * system from its anchor rect/point and resolved popup position.
 *
 * - `point` mode (context menus): origin tracks the cursor point even when the
 *   menu shifts left/up to stay inside the viewport.
 * - `below` mode (cell/button dropdowns): origin sits on the popup edge facing
 *   the trigger (top when below, bottom when flipped above) aligned to the
 *   anchor's horizontal center.
 */
export function computeRectTransformOrigin({
  anchor,
  popup,
  mode,
}: {
  anchor: RectLike;
  popup: RectLike;
  mode: "below" | "point";
}): { transformOrigin: string; flippedUp: boolean } {
  const safeWidth = Math.max(0, popup.width);
  const safeHeight = Math.max(0, popup.height);

  if (mode === "point") {
    const x = roundPx(clamp(anchor.left - popup.left, 0, safeWidth));
    const y = roundPx(clamp(anchor.top - popup.top, 0, safeHeight));
    return {
      transformOrigin: `${x}px ${y}px`,
      flippedUp: popup.top < anchor.top,
    };
  }

  const flippedUp = popup.top < anchor.top;
  const anchorCenterX = anchor.left + anchor.width / 2;
  const x = roundPx(clamp(anchorCenterX - popup.left, 0, safeWidth));
  const y = flippedUp ? roundPx(safeHeight) : 0;
  return {
    transformOrigin: `${x}px ${y}px`,
    flippedUp,
  };
}

/**
 * Computes trigger-anchored `transform-origin` and enter travel for portaled
 * sidebar dropdowns (SidebarUserSection account & notification popovers).
 */
export function computePortalDropdownOrigin({
  anchorRect,
  panelLeft,
  panelWidth,
  openDownward,
  compact,
}: {
  anchorRect: { left: number; right: number; width: number };
  panelLeft: number;
  panelWidth: number;
  openDownward: boolean;
  compact: boolean;
}): { transformOrigin: string; travelX: string; travelY: string } {
  if (compact && panelLeft >= anchorRect.right) {
    return {
      transformOrigin: openDownward ? "left top" : "left bottom",
      travelX: "calc(var(--popover-travel, 6px) * -1)",
      travelY: "0px",
    };
  }

  const safeWidth = Math.max(0, panelWidth);
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const x =
    safeWidth > 0
      ? `${roundPx(clamp(anchorCenterX - panelLeft, 0, safeWidth))}px`
      : "50%";
  const y = openDownward ? "0px" : "100%";

  return {
    transformOrigin: `${x} ${y}`,
    travelX: "0px",
    travelY: openDownward
      ? "calc(var(--popover-travel, 6px) * -1)"
      : "var(--popover-travel, 6px)",
  };
}
