import { describe, expect, it } from "bun:test";
import {
  getRouteStyleTransformOptions,
  shouldPrecompressWebAssets,
} from "./webBuildPolicy";

describe("web build policy", () => {
  it("skips precompression for ordinary local production builds", () => {
    expect(
      shouldPrecompressWebAssets({
        timestamp: "1778736801132",
        env: { NODE_ENV: "production" },
      })
    ).toBe(false);
  });

  it("enables precompression only for explicit release builds", () => {
    expect(
      shouldPrecompressWebAssets({
        timestamp: "1778736801132",
        env: { NODE_ENV: "production", NOLO_WEB_PRECOMPRESS: "1" },
      })
    ).toBe(true);
  });

  it("keeps tracked route style outputs unminified by default", () => {
    expect(getRouteStyleTransformOptions({ env: { NODE_ENV: "production" } })).toEqual({
      loader: "css",
      minify: false,
      legalComments: "none",
    });
  });
});
