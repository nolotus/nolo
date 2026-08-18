import { describe, expect, it } from "bun:test";
import { isLiveAudioOnlyAgent } from "./isLiveAudioOnlyAgent";

describe("isLiveAudioOnlyAgent", () => {
  it("returns true for live_audio agents with google live-preview model", () => {
    expect(
      isLiveAudioOnlyAgent({
        defaultInteractionMode: "live_audio",
        provider: "google",
        model: "gemini-3.1-flash-live-preview",
      }),
    ).toBe(true);
  });

  it("returns true for live_audio agents with live-001 model", () => {
    expect(
      isLiveAudioOnlyAgent({
        defaultInteractionMode: "live_audio",
        provider: "google",
        model: "gemini-2.0-flash-live-001",
      }),
    ).toBe(true);
  });

  it("returns true for live_audio agents with native audio model", () => {
    expect(
      isLiveAudioOnlyAgent({
        defaultInteractionMode: "live_audio",
        provider: "google",
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
      }),
    ).toBe(true);
  });

  it("returns false for text-mode agents even with live model", () => {
    expect(
      isLiveAudioOnlyAgent({
        defaultInteractionMode: "text",
        provider: "google",
        model: "gemini-3.1-flash-live-preview",
      }),
    ).toBe(false);
  });

  it("returns false for live_audio agents with non-live models", () => {
    expect(
      isLiveAudioOnlyAgent({
        defaultInteractionMode: "live_audio",
        provider: "openai",
        model: "gpt-4o",
      }),
    ).toBe(false);
  });

  it("returns false for agents without explicit mode", () => {
    expect(
      isLiveAudioOnlyAgent({
        provider: "google",
        model: "gemini-3.1-flash-live-preview",
      }),
    ).toBe(false);
  });

  it("handles undefined/empty fields gracefully", () => {
    expect(isLiveAudioOnlyAgent({})).toBe(false);
    expect(
      isLiveAudioOnlyAgent({
        defaultInteractionMode: undefined,
        provider: undefined,
        model: undefined,
      }),
    ).toBe(false);
  });
});
