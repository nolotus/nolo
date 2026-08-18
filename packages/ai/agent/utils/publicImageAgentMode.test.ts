import { describe, expect, it } from "bun:test";
import {
  getPublicImageAgentMode,
  getPublicImageAgentDefaultProfile,
} from "./publicImageAgentMode";

describe("public image agent mode", () => {
  it("classifies explicit generator, editor, and continuous agents", () => {
    expect(getPublicImageAgentMode({ imageWorkflow: "generate" })).toBe("generate");
    expect(getPublicImageAgentMode({ imageWorkflow: "edit" })).toBe("edit");
    expect(getPublicImageAgentMode({ imageWorkflow: "continuous" })).toBe("continuous");
  });

  it("returns null for missing or empty agent", () => {
    expect(getPublicImageAgentMode({})).toBeNull();
    expect(getPublicImageAgentMode(undefined as any)).toBeNull();
  });

  it("returns the agreed default output profile for each mode", () => {
    expect(getPublicImageAgentDefaultProfile("generate")).toEqual({
      quality: "medium",
      size: "1024x1024",
      outputFormat: "png",
    });
    expect(getPublicImageAgentDefaultProfile("edit")).toEqual({
      quality: "medium",
      size: "auto",
      outputFormat: "png",
    });
    expect(getPublicImageAgentDefaultProfile("continuous")).toEqual({
      quality: "low",
      size: "auto",
      outputFormat: "png",
    });
  });

  it("returns the correct default profile for edit mode", () => {
    expect(getPublicImageAgentDefaultProfile("edit")).toEqual({
      quality: "medium",
      size: "auto",
      outputFormat: "png",
    });
  });
});
