import { describe, expect, test } from "bun:test";

import {
  computePopupPosition,
  POPUP_ANCHOR_GAP,
  VIEWPORT_MARGIN,
} from "./popupUtils";

const viewport = { width: 1024, height: 768 };

describe("computePopupPosition below mode (select cell editor)", () => {
  const anchor = { top: 100, left: 200, width: 120, height: 28 };

  test("places the popup below the anchor with the gap by default", () => {
    expect(
      computePopupPosition({
        anchor,
        popup: { width: 160, height: 200 },
        viewport,
        mode: "below",
      })
    ).toEqual({ top: 100 + 28 + POPUP_ANCHOR_GAP, left: 200 });
  });

  test("flips above the anchor when the popup does not fit below", () => {
    expect(
      computePopupPosition({
        anchor: { ...anchor, top: 600 },
        popup: { width: 160, height: 200 },
        viewport,
        mode: "below",
      })
    ).toEqual({ top: 600 - POPUP_ANCHOR_GAP - 200, left: 200 });
  });

  test("sticks to the top margin when neither side fits", () => {
    expect(
      computePopupPosition({
        anchor,
        popup: { width: 160, height: 700 },
        viewport,
        mode: "below",
      })
    ).toEqual({ top: VIEWPORT_MARGIN, left: 200 });
  });

  test("clamps the left edge to the viewport margin", () => {
    expect(
      computePopupPosition({
        anchor: { ...anchor, left: 2 },
        popup: { width: 160, height: 200 },
        viewport,
        mode: "below",
      })
    ).toEqual({ top: 100 + 28 + POPUP_ANCHOR_GAP, left: VIEWPORT_MARGIN });
  });

  test("clamps the right edge so the popup stays inside the viewport", () => {
    expect(
      computePopupPosition({
        anchor: { ...anchor, left: 1000 },
        popup: { width: 160, height: 200 },
        viewport,
        mode: "below",
      })
    ).toEqual({
      top: 100 + 28 + POPUP_ANCHOR_GAP,
      left: 1024 - 160 - VIEWPORT_MARGIN,
    });
  });

  test("sticks to the left margin when the popup is wider than the viewport", () => {
    expect(
      computePopupPosition({
        anchor,
        popup: { width: 2000, height: 200 },
        viewport,
        mode: "below",
      })
    ).toEqual({ top: 100 + 28 + POPUP_ANCHOR_GAP, left: VIEWPORT_MARGIN });
  });
});

describe("computePopupPosition point mode (row context menu)", () => {
  const popup = { width: 180, height: 101 };

  test("uses the point anchor (width/height 0) as the popup corner", () => {
    expect(
      computePopupPosition({
        anchor: { top: 100, left: 100, width: 0, height: 0 },
        popup,
        viewport,
        mode: "point",
      })
    ).toEqual({ top: 100, left: 100 });
  });

  test("pulls left when the popup overflows the right edge", () => {
    expect(
      computePopupPosition({
        anchor: { top: 100, left: 900, width: 0, height: 0 },
        popup,
        viewport,
        mode: "point",
      })
    ).toEqual({ top: 100, left: 1024 - 180 - VIEWPORT_MARGIN });
  });

  test("pulls up when the popup overflows the bottom edge", () => {
    expect(
      computePopupPosition({
        anchor: { top: 700, left: 100, width: 0, height: 0 },
        popup,
        viewport,
        mode: "point",
      })
    ).toEqual({ top: 768 - 101 - VIEWPORT_MARGIN, left: 100 });
  });

  test("clamps to the top-left margins at the viewport origin", () => {
    expect(
      computePopupPosition({
        anchor: { top: 0, left: -20, width: 0, height: 0 },
        popup,
        viewport,
        mode: "point",
      })
    ).toEqual({ top: VIEWPORT_MARGIN, left: VIEWPORT_MARGIN });
  });
});
