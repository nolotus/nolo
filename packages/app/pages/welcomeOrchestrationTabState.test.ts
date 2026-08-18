import { describe, expect, it } from "bun:test";
import {
  isOrchestrationDemoTab,
  readOrchestrationTabFromSearch,
} from "./welcomeOrchestrationTabState";

describe("welcomeOrchestrationTabState", () => {
  it("recognizes valid demo tabs", () => {
    expect(isOrchestrationDemoTab("coding")).toBe(true);
    expect(isOrchestrationDemoTab("video")).toBe(true);
    expect(isOrchestrationDemoTab("agent")).toBe(false);
    expect(isOrchestrationDemoTab(null)).toBe(false);
  });

  it("reads demo tab from search params", () => {
    expect(readOrchestrationTabFromSearch("?demo=consensus")).toBe("consensus");
    expect(readOrchestrationTabFromSearch("?demo=unknown")).toBeNull();
    expect(readOrchestrationTabFromSearch("")).toBeNull();
  });

});