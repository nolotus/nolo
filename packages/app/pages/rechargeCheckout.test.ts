import { describe, expect, test } from "bun:test";

import { openCheckoutUrl } from "./rechargeCheckout";

describe("openCheckoutUrl", () => {
  test("opens checkout in a new tab with opener isolation", () => {
    const calls: unknown[][] = [];
    const locationCalls: string[] = [];

    openCheckoutUrl("https://checkout.example.test/store/demo", {
      open: (...args: unknown[]) => {
        calls.push(args);
        return {};
      },
      assignLocation: (url) => {
        locationCalls.push(url);
      },
    });

    expect(calls).toEqual([
      ["https://checkout.example.test/store/demo", "_blank", "noopener,noreferrer"],
    ]);
    expect(locationCalls).toEqual([]);
  });

  test("falls back to current-page navigation when popup opening is blocked", () => {
    const locationCalls: string[] = [];

    openCheckoutUrl("https://checkout.example.test/store/demo", {
      open: () => null,
      assignLocation: (url) => {
        locationCalls.push(url);
      },
    });

    expect(locationCalls).toEqual(["https://checkout.example.test/store/demo"]);
  });
});
