import { describe, expect, it } from "bun:test";
import { isVoiceModel } from "./isVoiceModel";

describe("isVoiceModel", () => {
  it("returns true for google live-preview models", () => {
    expect(
      isVoiceModel("gemini-3.1-flash-live-preview", "google"),
    ).toBe(true);
  });

  it("returns true for live-001 models", () => {
    expect(
      isVoiceModel("gemini-2.0-flash-live-001", "google"),
    ).toBe(true);
  });

  it("returns true for native-audio models", () => {
    expect(
      isVoiceModel("gemini-2.5-flash-native-audio-preview-12-2025", "google"),
    ).toBe(true);
  });

  it("returns false for ordinary text models", () => {
    expect(isVoiceModel("gpt-5.6-sol", "openai")).toBe(false);
    expect(isVoiceModel("claude-sonnet-4.6", "anthropic")).toBe(false);
    expect(isVoiceModel("gemini-3-pro-preview", "google")).toBe(false);
  });

  it("is independent of defaultInteractionMode — only model/provider matter", () => {
    // This is the whole point: the form derives the mode FROM the model.
    expect(isVoiceModel("gemini-3.1-flash-live-preview", "google")).toBe(true);
    expect(isVoiceModel("gpt-4o", "openai")).toBe(false);
  });

  it("handles undefined/empty fields gracefully", () => {
    expect(isVoiceModel(undefined, undefined)).toBe(false);
    expect(isVoiceModel("", "")).toBe(false);
    expect(isVoiceModel(null, null)).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isVoiceModel("GEMINI-3.1-FLASH-LIVE-PREVIEW", "Google")).toBe(true);
  });
});