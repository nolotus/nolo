import { describe, expect, it } from "bun:test";

import {
  TITLE_UPDATE_INTERVAL_MINUTES,
  shouldUpdateTitle,
} from "./updateDialogTitlePolicy";

describe("updateDialogTitleAction timing", () => {
  const now = new Date("2026-03-20T06:00:00.000Z");

  it("allows frequent updates during the initial title update window", () => {
    expect(
      shouldUpdateTitle(
        "2026-03-20T05:40:00.000Z",
        "2026-03-20T05:55:00.000Z",
        now
      )
    ).toBe(true);
  });

  it("blocks updates before the longer interval elapses on older dialogs", () => {
    expect(
      shouldUpdateTitle(
        "2026-03-20T04:00:00.000Z",
        "2026-03-20T05:35:00.000Z",
        now
      )
    ).toBe(false);
  });

  it("allows updates once the longer interval has elapsed on older dialogs", () => {
    expect(
      shouldUpdateTitle(
        "2026-03-20T04:00:00.000Z",
        "2026-03-20T05:30:00.000Z",
        now
      )
    ).toBe(true);
    expect(TITLE_UPDATE_INTERVAL_MINUTES).toBe(30);
  });
});
