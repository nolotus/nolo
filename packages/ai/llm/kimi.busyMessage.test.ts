import { describe, expect, it } from "bun:test";

import {
  PLATFORM_LLM_BUSY_USER_MESSAGE,
  shouldMapToPlatformBusyMessage,
} from "./kimi";

describe("shouldMapToPlatformBusyMessage", () => {
  it("maps only nolo capacity statuses and timeouts", () => {
    expect(
      shouldMapToPlatformBusyMessage({ provider: "nolo", status: 503 }),
    ).toBe(true);
    // Legacy agent records still carry "ollama-cloud"; the retired
    // "nolo-hosted" alias is not recognised any more.
    expect(
      shouldMapToPlatformBusyMessage({ provider: "ollama-cloud", status: 429 }),
    ).toBe(true);
    expect(
      shouldMapToPlatformBusyMessage({ provider: "nolo-hosted", status: 429 }),
    ).toBe(false);
    expect(
      shouldMapToPlatformBusyMessage({
        provider: "nolo",
        errorName: "AbortError",
      }),
    ).toBe(true);
    expect(
      shouldMapToPlatformBusyMessage({
        provider: "nolo",
        treatAsCapacity: true,
      }),
    ).toBe(true);
  });

  it("does not map 400 validation or non-nolo providers", () => {
    expect(
      shouldMapToPlatformBusyMessage({ provider: "nolo", status: 400 }),
    ).toBe(false);
    expect(
      shouldMapToPlatformBusyMessage({ provider: "nolo", status: 401 }),
    ).toBe(false);
    expect(
      shouldMapToPlatformBusyMessage({ provider: "openai", status: 503 }),
    ).toBe(false);
    expect(PLATFORM_LLM_BUSY_USER_MESSAGE).toBe("服务器紧张");
  });
});
